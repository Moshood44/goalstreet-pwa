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

      // Check if FPL data is older than 15 minutes
      try {
        const { data: cacheRow } = await supabase
          .from("fpl_cache")
          .select("updated_at")
          .eq("key", "fpl_bootstrap")
          .single();

        if (cacheRow && now - new Date(cacheRow.updated_at).getTime() > 15 * 60 * 1000) {
          isDataDelayed = true;
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
