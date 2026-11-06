import { SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface StandardMatch {
  id: string; // worldcup26 eventId or local match id
  worldcup26_event_id: string;
  fpl_fixture_id?: number | null;
  home_club: string;
  away_club: string;
  kickoff_time: string;
  status: "scheduled" | "live" | "finished";
  state: "pre" | "in" | "post";
  display_clock: string;
  home_score: number;
  away_score: number;
  key_events: Array<{
    type: string;
    clock: string;
    team: string;
    text: string;
    player?: string;
  }>;
  last_synced_at: string;
}

export interface StandardPlayerRating {
  fpl_id: number;
  fixture_id: string;
  player_id?: string;
  name: string;
  club: string;
  minutes: number;
  bps: number;
  bonus: number;
  total_points: number;
  expected_goals: number;
  expected_assists: number;
  ict_index: number;
  rating: number; // 3.0 to 10.0 scale
  rating_status: "Provisional" | "Final";
}

export interface FootballProvider {
  name: string;
  getMatches(leagueSlug?: string): Promise<StandardMatch[]>;
  getMatchEvents?(eventId: string): Promise<any[]>;
  getStandings?(leagueSlug?: string): Promise<any>;
}

