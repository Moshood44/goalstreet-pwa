import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Worldcup26Provider } from "../_shared/worldcup26.ts";
import { FplProvider } from "../_shared/fplProvider.ts";
import { verifyAdminRequest } from "../_shared/adminAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-secret",
};

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const isAdmin = await verifyAdminRequest(req, supabase);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid admin secret" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const worldcup26 = new Worldcup26Provider(supabase);
    const fpl = new FplProvider(supabase);

    // 1. Fetch real scores & live match status from Primary Provider (worldcup26)
    const matches = await worldcup26.getMatches("eng.1");
    let matchesUpdated = 0;
    let liveMatchCount = 0;

    for (const m of matches) {
      if (m.status === "live") liveMatchCount++;

      // Upsert into fixture_link
      await supabase.from("fixture_link").upsert({
        worldcup26_event_id: m.worldcup26_event_id,
        home_club: m.home_club,
        away_club: m.away_club,
        kickoff_time: m.kickoff_time,
        status: m.status,
        state: m.state,
        display_clock: m.display_clock,
        home_score: m.home_score,
        away_score: m.away_score,
        last_synced_at: m.last_synced_at,
      }, { onConflict: "worldcup26_event_id" });

      // Keep matches table aligned for frontend compatibility
      const { data: existingMatch } = await supabase
        .from("matches")
        .select("id")
        .eq("home_club", m.home_club)
        .eq("away_club", m.away_club)
        .maybeSingle();

      const matchData = {
        home_club: m.home_club,
        away_club: m.away_club,
        match_date: m.kickoff_time,
        status: m.status,
        state: m.state,
        display_clock: m.display_clock,
        current_minute: parseInt(m.display_clock.replace("'", "")) || 0,
        home_score: m.home_score,
        away_score: m.away_score,
        last_synced_at: m.last_synced_at,
        worldcup26_event_id: m.worldcup26_event_id,
      };

      if (existingMatch) {
        await supabase.from("matches").update(matchData).eq("id", existingMatch.id);
      } else {
        await supabase.from("matches").insert(matchData);
      }
      matchesUpdated++;
    }

    // 2. Lock players for any LIVE matches
    const liveMatches = matches.filter((m) => m.status === "live");
    if (liveMatches.length > 0) {
      for (const lm of liveMatches) {
        await supabase
          .from("players")
          .update({ status: "locked", updated_at: new Date().toISOString() })
          .in("club", [lm.home_club, lm.away_club]);
      }
    }

    // 3. Unlock players if their match is finished (state === 'post' or status === 'finished')
    const finishedMatches = matches.filter((m) => m.status === "finished");
    if (finishedMatches.length > 0) {
      for (const fm of finishedMatches) {
        await supabase
          .from("players")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .in("club", [fm.home_club, fm.away_club])
          .eq("status", "locked");
      }
    }

    // 4. Real FPL Ratings computation:
    // Determine current gameweek from FPL bootstrap-static
    let ratingsProcessed = 0;
    const { data: bootstrap } = await fpl.fetchEndpoint<any>("bootstrap-static/");
    const currentEvent = bootstrap?.events?.find((e: any) => e.is_current) || bootstrap?.events?.find((e: any) => e.is_next);
    const currentGw = currentEvent?.id;

    if (currentGw) {
      const { data: liveData } = await fpl.fetchEndpoint<any>(`event/${currentGw}/live/`);
      if (liveData?.elements && Array.isArray(liveData.elements)) {
        // Group players by fixture to compute median BPS per fixture
        const fixtureBpsMap: Record<number, number[]> = {};

        for (const el of liveData.elements) {
          const stats = el.stats;
          if (stats && stats.minutes > 0) {
            const fId = el.explain?.[0]?.fixture || 0;
            if (!fixtureBpsMap[fId]) fixtureBpsMap[fId] = [];
            fixtureBpsMap[fId].push(stats.bps || 0);
          }
        }

        // Calculate medians
        const fixtureMedians: Record<number, number> = {};
        for (const [fId, bpsList] of Object.entries(fixtureBpsMap)) {
          fixtureMedians[Number(fId)] = computeMedian(bpsList);
        }

        // Process ratings for players who played minutes
        for (const el of liveData.elements) {
          const stats = el.stats;
          if (stats && stats.minutes > 0) {
            const fId = el.explain?.[0]?.fixture || 0;
            const medianBps = fixtureMedians[fId] || 15;

            const provisionalRating = fpl.computeProvisionalRating({
              minutes: stats.minutes,
              bps: stats.bps,
              ict_index: parseFloat(stats.ict_index || "0"),
              expected_goals: parseFloat(stats.expected_goals || "0"),
              expected_assists: parseFloat(stats.expected_assists || "0"),
            }, medianBps);

            // Update player's last_match_rating with provisional rating
            const { data: existingPlayer } = await supabase
              .from("players")
              .select("id, base_price, crowd_premium")
              .eq("fpl_id", el.id)
              .maybeSingle();

            if (existingPlayer) {
              await supabase
                .from("players")
                .update({
                  last_match_rating: provisionalRating,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existingPlayer.id);

              ratingsProcessed++;
            }
          }
        }
      }
    }

    // Note: Random micro-drift and synthetic noise completely deleted.
    // Price movement only occurs on real trade execution and full-time settlement.

    return new Response(
      JSON.stringify({
        success: true,
        matchesUpdated,
        liveMatchCount,
        ratingsProcessed,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
