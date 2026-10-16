import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  computeFplMatchScore,
  calculateRatingFromScore,
  computeWeightForMinutes,
} from "../_shared/fpl.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();

    // 1. Check if we are inside a Match Window
    const { data: todayMatches } = await supabase
      .from("matches")
      .select("*")
      .gte("match_date", new Date(now.getTime() - 24 * 3600 * 1000).toISOString())
      .lte("match_date", new Date(now.getTime() + 24 * 3600 * 1000).toISOString());

    let isMatchWindow = false;
    let liveMatchCount = 0;

    if (todayMatches && todayMatches.length > 0) {
      for (const m of todayMatches) {
        const kickTime = new Date(m.match_date).getTime();
        const startWindow = kickTime - 10 * 60 * 1000; // 10 mins before kickoff
        const endWindow = kickTime + 3 * 3600 * 1000;   // 3 hours after kickoff
        const nowMs = now.getTime();

        if (nowMs >= startWindow && nowMs <= endWindow) {
          isMatchWindow = true;
          if (m.status === "live") liveMatchCount++;
        }
      }
    }

    let actionsPerformed: string[] = [];

    // 2. Fetch rating calibration
    const { data: calRows } = await supabase.from("rating_calibration").select("*");
    const calMap: Record<string, { mean: number; std: number }> = {};
    if (calRows) {
      for (const row of calRows) {
        calMap[row.position] = { mean: parseFloat(row.mean), std: parseFloat(row.std) };
      }
    }

    if (isMatchWindow) {
      actionsPerformed.push("Inside match window: checking live matches and settlements");

      // Check for live fixtures and lock players
      const { data: liveMatches } = await supabase
        .from("matches")
        .select("*")
        .eq("status", "live");

      if (liveMatches && liveMatches.length > 0) {
        for (const match of liveMatches) {
          // Lock players in this match
          await supabase
            .from("players")
            .update({ status: "locked", updated_at: new Date().toISOString() })
            .in("club", [match.home_club, match.away_club]);
        }
        actionsPerformed.push(`Locked active players for ${liveMatches.length} live matches`);
      }

      // Check finished fixtures needing settlement
      const { data: finishedMatches } = await supabase
        .from("matches")
        .select("*")
        .eq("status", "finished")
        .order("match_date", { ascending: false })
        .limit(10);

      if (finishedMatches) {
        for (const f of finishedMatches) {
          // Fetch players of these clubs
          const { data: matchPlayers } = await supabase
            .from("players")
            .select("*")
            .in("club", [f.home_club, f.away_club]);

          if (matchPlayers) {
            for (const p of matchPlayers) {
              const fixtureKey = String(f.id);

              // Check if already settled
              const { data: existingRating } = await supabase
                .from("match_ratings")
                .select("id, settled")
                .eq("fixture_id", fixtureKey)
                .eq("player_id", p.id)
                .maybeSingle();

              if (!existingRating || !existingRating.settled) {
                // Apply price rule
                const matchRating = p.last_match_rating || 7.2;
                const minutesPlayed = 90;
                const weight = computeWeightForMinutes(minutesPlayed);
                const oldBase = parseFloat(p.base_price);
                const targetBase = (oldBase + matchRating / 10.0) / 2.0;
                const newBase = Math.max(
                  0.0100,
                  Math.min(1.0000, Math.round((oldBase + weight * (targetBase - oldBase)) * 10000) / 10000)
                );

                // Update player
                await supabase.from("players").update({
                  base_price: newBase,
                  status: "active", // Unlock player
                  last_rating_change: Math.round((newBase - oldBase) * 10000) / 10000,
                  updated_at: new Date().toISOString(),
                }).eq("id", p.id);

                // Record settlement
                await supabase.from("match_ratings").upsert({
                  match_id: f.id,
                  fixture_id: fixtureKey,
                  player_id: p.id,
                  rating: matchRating,
                  minutes_played: minutesPlayed,
                  settled: true,
                }, { onConflict: "fixture_id,player_id" });

                // Record price history
                const currentDisplayed = Math.round(newBase * (1.0 + parseFloat(p.crowd_premium)) * 10000) / 10000;
                await supabase.from("price_history").insert({
                  player_id: p.id,
                  price: currentDisplayed,
                });

                // Notify holders
                const { data: holders } = await supabase
                  .from("holdings")
                  .select("user_id")
                  .eq("player_id", p.id);

                if (holders) {
                  for (const h of holders) {
                    await supabase.from("notifications").insert({
                      user_id: h.user_id,
                      title: `Match Settled: ${p.name} ★ ${matchRating}`,
                      message: `${p.name} settled at 🧢 ${newBase.toFixed(4)} (${newBase >= oldBase ? '+' : ''}${((newBase - oldBase) * 100).toFixed(2)}%)`,
                      type: "trade",
                    });
                  }
                }
              }
            }
          }
        }
      }
    } else {
      actionsPerformed.push("Outside match window: running crowd decay & drift");

      // 3. Crowd Premium Decay (~25% fade per day -> factor 0.9998 per minute)
      const { data: activePlayers } = await supabase
        .from("players")
        .select("id, base_price, net_buying_caps, crowd_premium")
        .order("base_price", { ascending: false })
        .limit(20);

      if (activePlayers) {
        for (const p of activePlayers) {
          const oldNet = parseFloat(p.net_buying_caps || "0");
          if (Math.abs(oldNet) > 1.0) {
            const newNet = oldNet * 0.9998;
            const newPremium = Math.round(0.15 * Math.tanh(newNet / 200000.0) * 10000) / 10000;

            await supabase.from("players").update({
              net_buying_caps: newNet,
              crowd_premium: newPremium,
              updated_at: new Date().toISOString(),
            }).eq("id", p.id);
          }
        }
      }

      // 4. Bot Traders: Drift random players slightly (1-3% volume)
      const { data: randomSample } = await supabase
        .from("players")
        .select("id, name, base_price, net_buying_caps")
        .eq("status", "active")
        .limit(3);

      if (randomSample && randomSample.length > 0) {
        for (const p of randomSample) {
          const deltaCaps = (Math.random() - 0.48) * 1500; // Small random drift
          const newNet = parseFloat(p.net_buying_caps || "0") + deltaCaps;
          const newPremium = Math.round(0.15 * Math.tanh(newNet / 200000.0) * 10000) / 10000;

          await supabase.from("players").update({
            net_buying_caps: newNet,
            crowd_premium: newPremium,
            updated_at: new Date().toISOString(),
          }).eq("id", p.id);
        }
        actionsPerformed.push("Simulated bot liquidity drift on 3 players");
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        isMatchWindow,
        actionsPerformed,
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
