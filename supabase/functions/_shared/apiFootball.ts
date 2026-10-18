import { SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface ApiFootballPlayerStat {
  player: {
    id: number;
    name: string;
    number?: number;
    pos?: string;
  };
  statistics: Array<{
    games: {
      minutes?: number;
      rating?: string;
    };
  }>;
}

export class ApiFootballClient {
  private key: string | null = null;
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async getKey(): Promise<string | null> {
    if (this.key) return this.key;
    const envKey = Deno.env.get("API_FOOTBALL_KEY");
    if (envKey && envKey.trim().length > 0) {
      this.key = envKey.trim().slice(0, 32);
      return this.key;
    }

    try {
      const { data } = await this.supabase.rpc("get_api_football_key");
      if (data && typeof data === "string" && data.trim().length > 0) {
        this.key = data.trim().slice(0, 32);
        return this.key;
      }
    } catch (_e) {
      // Fallback if not configured
    }
    return null;
  }

  async canMakeRequest(): Promise<boolean> {
    const { data: usageCount } = await this.supabase.rpc("get_api_football_usage_today");
    const count = typeof usageCount === "number" ? usageCount : 0;
    return count < 90;
  }

  async fetchEndpoint<T>(endpoint: string, params: Record<string, string>): Promise<T | null> {
    const key = await this.getKey();
    if (!key) return null;

    const allowed = await this.canMakeRequest();
    if (!allowed) {
      console.warn("API-Football daily budget (90 requests) reached. Falling back to FPL.");
      return null;
    }

    const url = new URL(`https://v3.football.api-sports.io/${endpoint}`);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }

    try {
      const res = await fetch(url.toString(), {
        headers: {
          "x-apisports-key": key,
        },
      });

      // Record usage
      await this.supabase.rpc("record_api_football_call");

      if (!res.ok) {
        console.error(`API-Football error: HTTP ${res.status}`);
        return null;
      }

      const json = await res.json();
      return json as T;
    } catch (err) {
      console.error("API-Football fetch failed:", err);
      return null;
    }
  }

  normalizeName(name: string): string {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "")
      .trim();
  }
}
