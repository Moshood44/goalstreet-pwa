import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=3, s-maxage=3",
};

let cachedData: any = null;
let lastCacheTime = 0;
let isDataDelayed = false;
const CACHE_TTL_MS = 3000;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const now = Date.now();
    if (!cachedData || now - lastCacheTime > CACHE_TTL_MS) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data, error } = await supabase.rpc("get_market_snapshot");
      if (error) {
        throw error;
      }
      cachedData = data;
      lastCacheTime = now;

      // Show delayed banner ONLY when:
      // 1. A real fixture is inside its match window (live or kickoff +/- 3 hours)
      // AND 2. Last good FPL fetch is more than 15 minutes old
      try {
        const { data: cacheRow } = await supabase
          .from("fpl_cache")
          .select("fetched_at, updated_at")
          .eq("key", "fpl_fixtures")
          .maybeSingle();

        const lastFetch = cacheRow?.fetched_at || cacheRow?.updated_at;
        const isFetchOld = !lastFetch || (now - new Date(lastFetch).getTime() > 15 * 60 * 1000);

        if (isFetchOld) {
          const { count } = await supabase
            .from("matches")
            .select("id", { count: "exact", head: true })
            .or("status.eq.live,status.eq.scheduled")
            .gte("match_date", new Date(now - 3 * 3600 * 1000).toISOString())
            .lte("match_date", new Date(now + 15 * 60 * 1000).toISOString());

          isDataDelayed = (count ?? 0) > 0;
        } else {
          isDataDelayed = false;
        }
      } catch (_e) {
        isDataDelayed = false;
      }
    }

    return new Response(JSON.stringify({ players: cachedData, isDataDelayed, timestamp: Date.now() }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
