import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { StandardMatch, FootballProvider } from "./providerInterface.ts";

const BASE_URL = "https://worldcup26.ir";

export class Worldcup26Provider implements FootballProvider {
  name = "worldcup26";
  private supabase: SupabaseClient;
  private clubNameMap: Map<string, string> = new Map();

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  private async logError(endpoint: string, err: any, payload?: any) {
    console.error(`[Worldcup26Provider] Error on ${endpoint}:`, err);
    try {
      await this.supabase.from("provider_errors").insert({
        provider: "worldcup26",
        endpoint,
        error_message: String(err?.message || err),
        raw_payload: payload ? JSON.parse(JSON.stringify(payload)) : null,
      });
    } catch (_e) {
      // Ignore fallback error
    }
  }

  private async loadClubMap(): Promise<void> {
    if (this.clubNameMap.size > 0) return;
    try {
      const { data } = await this.supabase
        .from("club_id_map")
        .select("provider_club_name, fpl_club_name, provider_club_id");
      if (data) {
        for (const row of data) {
          this.clubNameMap.set(row.provider_club_name.toLowerCase(), row.fpl_club_name);
          if (row.provider_club_id) {
            this.clubNameMap.set(`id:${row.provider_club_id}`, row.fpl_club_name);
          }
        }
      }
    } catch (e) {
      console.warn("Could not load club_id_map:", e);
    }
  }

  private mapClub(clubName: string, clubId?: string): string {
    const byId = clubId ? this.clubNameMap.get(`id:${clubId}`) : null;
    if (byId) return byId;
    const byName = this.clubNameMap.get(clubName.toLowerCase().trim());
    if (byName) return byName;
    return clubName;
  }

  async getMatches(leagueSlug = "eng.1"): Promise<StandardMatch[]> {
    await this.loadClubMap();
    const endpoint = `/get/soccer/${leagueSlug}/scoreboard`;
    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        headers: { "Accept": "application/json" },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      const events = json?.events || [];
      const matches: StandardMatch[] = [];

      for (const ev of events) {
        const comp = ev.competitions?.[0];
        if (!comp) continue;

        const homeComp = comp.competitors?.find((c: any) => c.homeAway === "home");
        const awayComp = comp.competitors?.find((c: any) => c.homeAway === "away");

        const rawHomeName = homeComp?.team?.name || homeComp?.team?.displayName || "Home Team";
        const rawAwayName = awayComp?.team?.name || awayComp?.team?.displayName || "Away Team";
        const homeClub = this.mapClub(rawHomeName, homeComp?.team?.id);
        const awayClub = this.mapClub(rawAwayName, awayComp?.team?.id);

        const statusType = comp.status?.type || {};
        const state: "pre" | "in" | "post" = statusType.state || "pre";

        let status: "scheduled" | "live" | "finished" = "scheduled";
        let displayClock = comp.status?.displayClock || "0'";
        let homeScore = 0;
        let awayScore = 0;

        if (state === "pre") {
          // Rule: NEVER show a score for a "pre" match, treat as 0-0 not started
          status = "scheduled";
          displayClock = "0'";
          homeScore = 0;
          awayScore = 0;
        } else if (state === "in") {
          status = "live";
          homeScore = parseInt(homeComp?.score || "0", 10);
          awayScore = parseInt(awayComp?.score || "0", 10);
        } else if (state === "post") {
          status = "finished";
          homeScore = parseInt(homeComp?.score || "0", 10);
          awayScore = parseInt(awayComp?.score || "0", 10);
        }

        matches.push({
          id: String(ev.id),
          worldcup26_event_id: String(ev.id),
          home_club: homeClub,
          away_club: awayClub,
          kickoff_time: ev.date || comp.date || comp.startDate,
          status,
          state,
          display_clock: displayClock,
          home_score: homeScore,
          away_score: awayScore,
          key_events: [],
          last_synced_at: new Date().toISOString(),
        });
      }

      return matches;
    } catch (err: any) {
      await this.logError(endpoint, err);
      return [];
    }
  }

  async getMatchEvents(eventId: string, leagueSlug = "eng.1"): Promise<any[]> {
    const endpoint = `/get/soccer/${leagueSlug}/events/${eventId}/plays?important=true`;
    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        headers: { "Accept": "application/json" },
      });
      if (!res.ok) return [];
      const json = await res.json();
      const items = json?.items || [];
      return items.map((it: any) => ({
        type: it.type?.text || "Event",
        clock: it.clock?.displayValue || it.period?.displayValue || "",
        team: it.team?.displayName || "",
        text: it.text || "",
        player: it.participants?.[0]?.athlete?.displayName || "",
      }));
    } catch (err: any) {
      await this.logError(endpoint, err);
      return [];
    }
  }

  async getStandings(leagueSlug = "eng.1"): Promise<any> {
    const endpoint = `/get/soccer/${leagueSlug}/standings`;
    try {
      const res = await fetch(`${BASE_URL}${endpoint}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (err: any) {
      await this.logError(endpoint, err);
      return null;
    }
  }
}

