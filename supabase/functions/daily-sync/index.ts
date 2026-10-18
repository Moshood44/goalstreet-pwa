import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  getCachedFplData,
  mapPositionType,
  FplBootstrap,
  FplFixture,
} from "../_shared/fpl.ts";
import { verifyAdminRequest } from "../_shared/adminAuth.ts";
import { ApiFootballClient } from "../_shared/apiFootball.ts";

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
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid or missing admin secret" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch Bootstrap-Static (cache for 10 minutes)
    const { data: bootstrap, isDelayed } = await getCachedFplData<FplBootstrap>(
      supabase,
      "fpl_bootstrap",
      "https://fantasy.premierleague.com/api/bootstrap-static/",
      10 * 60 * 1000
    );

    if (!bootstrap || !bootstrap.elements) {
      return new Response(JSON.stringify({ error: "Failed to fetch FPL bootstrap data", isDelayed }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const teamMap = new Map<number, { name: string; shortName: string }>();
    for (const t of bootstrap.teams) {
      teamMap.set(t.id, { name: t.name, shortName: t.short_name });
    }

    // 2. Fetch rating calibration from database
    const { data: calRows } = await supabase.from("rating_calibration").select("*");
    const calMap: Record<string, { mean: number; std: number }> = {};
    if (calRows) {
      for (const row of calRows) {
        calMap[row.position] = { mean: parseFloat(row.mean), std: parseFloat(row.std) };
      }
    }

    // 3. Process players
    let playersUpserted = 0;
    let playersDelisted = 0;
    const activeFplIds = new Set<number>();

    for (const el of bootstrap.elements) {
      activeFplIds.add(el.id);
      const pos = mapPositionType(el.element_type);
      const teamInfo = teamMap.get(el.team) || { name: "Premier League", shortName: "PL" };
      const minutesThisSeason = el.minutes || 0;

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

    // 4. Mark delisted players who left Premier League
    const { data: existingPlayers } = await supabase
      .from("players")
      .select("id, fpl_id, is_delisted")
      .not("fpl_id", "is", null);

    if (existingPlayers) {
      for (const p of existingPlayers) {
        if (p.fpl_id && !activeFplIds.has(p.fpl_id) && !p.is_delisted) {
          await supabase.from("players").update({
            is_delisted: true,
            status: "active",
            updated_at: new Date().toISOString(),
          }).eq("id", p.id);
          playersDelisted++;
        }
      }
    }

    // 5. Fetch Fixtures and sync Matches table
    const { data: fixtures } = await getCachedFplData<FplFixture[]>(
      supabase,
      "fpl_fixtures",
      "https://fantasy.premierleague.com/api/fixtures/",
      2 * 60 * 1000
    );

    let fixturesSynced = 0;
    if (fixtures && Array.isArray(fixtures)) {
      for (const f of fixtures) {
        const homeTeam = teamMap.get(f.team_h)?.name || `Team ${f.team_h}`;
        const awayTeam = teamMap.get(f.team_a)?.name || `Team ${f.team_a}`;
        let status = "scheduled";
        if (f.finished || f.finished_provisional) {
          status = "finished";
        } else if (f.started) {
          status = "live";
        }

        const matchRecord = {
          home_club: homeTeam,
          away_club: awayTeam,
          match_date: f.kickoff_time,
          status,
          current_minute: f.minutes || 0,
          home_score: f.team_h_score ?? 0,
          away_score: f.team_a_score ?? 0,
        };

        const { data: existingMatch } = await supabase
          .from("matches")
          .select("id")
          .eq("home_club", homeTeam)
          .eq("away_club", awayTeam)
          .maybeSingle();

        if (existingMatch) {
          await supabase.from("matches").update(matchRecord).eq("id", existingMatch.id);
        } else {
          await supabase.from("matches").insert(matchRecord);
        }
        fixturesSynced++;
      }
    }

    // 6. Optional: API-Football enhancement for shirt numbers & player map
    const apiFootball = new ApiFootballClient(supabase);
    const apiFootballKey = await apiFootball.getKey();
    let apiFootballSquadsSynced = 0;

    if (apiFootballKey && (await apiFootball.canMakeRequest())) {
      // Find up to 2 clubs missing shirt numbers to enhance within daily budget
      const { data: playersMissingNumber } = await supabase
        .from("players")
        .select("club")
        .or("shirt_number.is.null,shirt_number.eq.0")
        .limit(20);

      const targetClubs = Array.from(new Set(playersMissingNumber?.map((p) => p.club) || [])).slice(0, 2);

      for (const clubName of targetClubs) {
        if (!(await apiFootball.canMakeRequest())) break;
        // Search team ID
        const searchRes = await apiFootball.fetchEndpoint<any>("teams", {
          name: clubName,
          league: "39",
          season: "2024",
        });

        const teamId = searchRes?.response?.[0]?.team?.id;
        if (teamId) {
          const squadRes = await apiFootball.fetchEndpoint<any>("players/squads", {
            team: String(teamId),
          });

          const squad = squadRes?.response?.[0]?.players || [];
          for (const sp of squad) {
            if (sp.number && sp.name) {
              const norm = apiFootball.normalizeName(sp.name);
              // Update player_map and players table
              const { data: matchPlayer } = await supabase
                .from("players")
                .select("id, fpl_id")
                .eq("club", clubName)
                .ilike("full_name", `%${sp.name.split(" ").pop()}%`)
                .maybeSingle();

              if (matchPlayer) {
                await supabase
                  .from("players")
                  .update({ shirt_number: sp.number, jersey_number: sp.number })
                  .eq("id", matchPlayer.id);

                await supabase.from("player_map").upsert(
                  {
                    fpl_id: matchPlayer.fpl_id,
                    api_football_id: sp.id,
                    team_name: clubName,
                    normalized_name: norm,
                    shirt_number: sp.number,
                    updated_at: new Date().toISOString(),
                  },
                  { onConflict: "fpl_id" }
                );
              }
            }
          }
          apiFootballSquadsSynced++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        playersUpserted,
        playersDelisted,
        fixturesSynced,
        apiFootballSquadsSynced,
        dataDelayed: isDelayed,
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
