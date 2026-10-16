import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { computeFplMatchScore } from "../_shared/fpl.ts";

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

    // Fetch latest completed season merged_gw.csv from vaastav repository
    const csvUrl = "https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data/2024-25/gws/merged_gw.csv";
    const res = await fetch(csvUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch vaastav CSV: HTTP ${res.status}`);
    }

    const text = await res.text();
    const lines = text.split("\n");
    if (lines.length < 2) {
      throw new Error("Invalid CSV format");
    }

    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const colIdx = {
      position: headers.indexOf("position"),
      minutes: headers.indexOf("minutes"),
      goals_scored: headers.indexOf("goals_scored"),
      xG: headers.indexOf("expected_goals"),
      assists: headers.indexOf("assists"),
      xA: headers.indexOf("expected_assists"),
      clean_sheets: headers.indexOf("clean_sheets"),
      goals_conceded: headers.indexOf("goals_conceded"),
      saves: headers.indexOf("saves"),
      yellow_cards: headers.indexOf("yellow_cards"),
      red_cards: headers.indexOf("red_cards"),
      bonus: headers.indexOf("bonus"),
    };

    const scoresByPosition: Record<string, number[]> = {
      FWD: [],
      MID: [],
      DEF: [],
      GK: [],
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(",");
      const pos = parts[colIdx.position]?.replace(/^"|"$/g, "");
      const mins = parseInt(parts[colIdx.minutes] || "0", 10);

      // Only evaluate appearances with at least 15 minutes
      if (!pos || mins < 15 || !scoresByPosition[pos]) continue;

      const score = computeFplMatchScore(pos as any, {
        minutes: mins,
        goals_scored: parseInt(parts[colIdx.goals_scored] || "0", 10),
        expected_goals: parseFloat(parts[colIdx.xG] || "0"),
        assists: parseInt(parts[colIdx.assists] || "0", 10),
        expected_assists: parseFloat(parts[colIdx.xA] || "0"),
        clean_sheets: parseInt(parts[colIdx.clean_sheets] || "0", 10),
        goals_conceded: parseInt(parts[colIdx.goals_conceded] || "0", 10),
        saves: parseInt(parts[colIdx.saves] || "0", 10),
        yellow_cards: parseInt(parts[colIdx.yellow_cards] || "0", 10),
        red_cards: parseInt(parts[colIdx.red_cards] || "0", 10),
        bonus: parseInt(parts[colIdx.bonus] || "0", 10),
      });

      const per90 = (score * 90.0) / mins;
      scoresByPosition[pos].push(per90);
    }

    const calibrationResults: any[] = [];
    for (const [pos, values] of Object.entries(scoresByPosition)) {
      if (values.length === 0) continue;
      const n = values.length;
      const mean = values.reduce((a, b) => a + b, 0) / n;
      const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
      const std = Math.sqrt(variance);

      const record = {
        position: pos,
        mean: Math.round(mean * 10000) / 10000,
        std: Math.round(std * 10000) / 10000,
        sample_size: n,
        updated_at: new Date().toISOString(),
      };

      await supabase.from("rating_calibration").upsert(record, { onConflict: "position" });
      calibrationResults.push(record);
    }

    return new Response(JSON.stringify({ success: true, calibrationResults }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
