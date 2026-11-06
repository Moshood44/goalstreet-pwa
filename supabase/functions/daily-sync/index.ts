import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Worldcup26Provider } from "../_shared/worldcup26.ts";
import { FplProvider } from "../_shared/fplProvider.ts";
import { mapPositionType, FplBootstrap } from "../_shared/fpl.ts";
import { verifyAdminRequest } from "../_shared/adminAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-secret",
};

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

    const fpl = new FplProvider(supabase);
    const worldcup26 = new Worldcup26Provider(supabase);

    // 1. Sync FPL Bootstrap Data (real players & squads)
    const { data: bootstrap, isUpdating } = await fpl.fetchEndpoint<FplBootstrap>("bootstrap-static/");
    if (isUpdating || !bootstrap?.elements) {
      return new Response(JSON.stringify({ message: "Ratings/FPL updating, sync deferred", isUpdating }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const teamMap = new Map<number, { name: string; shortName: string }>();
    for (const t of bootstrap.teams) {
      teamMap.set(t.id, { name: t.name, shortName: t.short_name });
    }

    let playersUpserted = 0;
    for (const el of bootstrap.elements) {
      const pos = mapPositionType(el.element_type);
      const teamInfo = teamMap.get(el.team) || { name: "Premier League", shortName: "PL" };
      const minutesThisSeason = el.minutes || 0;

      // Base listing price computed from actual FPL total points and minutes
      const n = Math.min(38, minutesThisSeason / 90.0);
      let listingPrice = 0.6000;
      if (n > 0) {
        const estRating = Math.min(10.0, Math.max(1.0, 6.0 + (el.total_points / Math.max(1, el.minutes / 90.0)) * 0.2));
        listingPrice = (n * estRating + 10 * 6.3) / (n + 10) / 10;
      }
      listingPrice = Math.max(0.0100, Math.min(1.0000, Math.round(listingPrice * 10000) / 10000));

      const chanceOfPlaying = el.chance_of_playing_this_round ?? el.chance_of_playing_next_round ?? (el.status === "a" ? 100 : 0);
      const shirtNumber = el.squad_number || 0;
      const fullName = `${el.first_name} ${el.second_name}`.trim();

      const { error: upsertErr } = await supabase.from("players").upsert(
        {
          fpl_id: el.id,
          name: el.web_name,
          full_name: fullName,
          position: pos,
          club: teamInfo.name,
          jersey_number: shirtNumber,
          shirt_number: shirtNumber,
          base_price: listingPrice,
          chance_of_playing: chanceOfPlaying,
          news: el.news || "",
          status: "active",
          is_delisted: el.status === "u",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "fpl_id" }
      );

      if (!upsertErr) playersUpserted++;
    }

    // 2. Sync Real Worldcup26 Matches & Scoreboard
    const matches = await worldcup26.getMatches("eng.1");
    let matchesSynced = 0;
    for (const m of matches) {
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
      matchesSynced++;
    }

    // 3. Automated Squad Battles / Challenge Settlement when a Gameweek Finishes
    const previousFinishedGw = bootstrap.events.find((e: any) => e.finished && e.is_previous);
    if (previousFinishedGw) {
      const gwNum = previousFinishedGw.id;
      // Settle active challenges where end_time has passed
      const { data: activeChallenges } = await supabase
        .from("challenges")
        .select("*")
        .eq("status", "active")
        .lte("end_time", new Date().toISOString());

      if (activeChallenges && activeChallenges.length > 0) {
        for (const c of activeChallenges) {
          const { data: entries } = await supabase.rpc("get_challenge_leaderboard", { p_challenge_id: c.id });
          if (entries && Array.isArray(entries)) {
            for (const entry of entries) {
              await supabase.from("settlement_ledger").upsert({
                challenge_id: c.id,
                gameweek: gwNum,
                user_id: entry.user_id,
                rank_num: entry.rank_num,
                return_pct: entry.return_pct,
                reward_trophy: entry.rank_num === 1 ? c.trophy_badge : (entry.rank_num <= 3 ? "🥈 Top 3 Finisher" : null),
                reward_caps: entry.rank_num === 1 ? 500 : 0,
              }, { onConflict: "challenge_id,user_id,gameweek" });
            }
          }
          await supabase.from("challenges").update({ status: "completed" }).eq("id", c.id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        playersUpserted,
        matchesSynced,
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
