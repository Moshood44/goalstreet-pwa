import { createClient } from "npm:@supabase/supabase-js@2";

export interface FplElement {
  id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  element_type: number; // 1: GK, 2: DEF, 3: MID, 4: FWD
  team: number;
  squad_number: number | null;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  own_goals: number;
  penalties_saved: number;
  penalties_missed: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  bps: number;
  defensive_contribution?: number;
  expected_goals: string;
  expected_assists: string;
  chance_of_playing_this_round: number | null;
  chance_of_playing_next_round: number | null;
  news: string;
  status: string;
}

export interface FplTeam {
  id: number;
  name: string;
  short_name: string;
}

export interface FplEvent {
  id: number;
  name: string;
  finished: boolean;
  is_current: boolean;
  is_next: boolean;
}

export interface FplBootstrap {
  elements: FplElement[];
  teams: FplTeam[];
  events: FplEvent[];
}

export interface FplFixture {
  id: number;
  code: number;
  event: number;
  finished: boolean;
  finished_provisional: boolean;
  started: boolean;
  minutes: number;
  team_h: number;
  team_a: number;
  team_h_score: number | null;
  team_a_score: number | null;
  kickoff_time: string;
  stats: Array<{
    identifier: string;
    a: Array<{ value: number; element: number }>;
    h: Array<{ value: number; element: number }>;
  }>;
}

export interface FplEventStatus {
  status: Array<{
    bonus_added: boolean;
    date: string;
    event: number;
    points: string;
  }>;
  leagues: string;
}

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const FPL_BASE = "https://fantasy.premierleague.com/api";

export async function fetchWithBackoff<T>(url: string, retries = 3, delayMs = 1000): Promise<{ data: T | null; isDelayed: boolean }> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept": "application/json",
        },
      });

      if (res.status === 503) {
        // Game is being updated
        return { data: null, isDelayed: true };
      }

      if (!res.ok) {
        throw new Error(`FPL API HTTP ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      return { data: json as T, isDelayed: false };
    } catch (err) {
      if (attempt === retries - 1) {
        return { data: null, isDelayed: true };
      }
      await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, attempt)));
    }
  }
  return { data: null, isDelayed: true };
}

export async function getCachedFplData<T>(
  supabase: any,
  cacheKey: string,
  url: string,
  ttlMs: number
): Promise<{ data: T | null; isDelayed: boolean }> {
  try {
    const { data: cacheRow } = await supabase
      .from("fpl_cache")
      .select("data, updated_at")
      .eq("key", cacheKey)
      .single();

    const now = Date.now();
    const isFresh = cacheRow && now - new Date(cacheRow.updated_at).getTime() < ttlMs;

    if (isFresh && cacheRow?.data) {
      return { data: cacheRow.data as T, isDelayed: false };
    }

    const { data: freshData, isDelayed } = await fetchWithBackoff<T>(url);
    if (freshData) {
      await supabase.from("fpl_cache").upsert({
        key: cacheKey,
        data: freshData,
        updated_at: new Date().toISOString(),
        fetched_at: new Date().toISOString(),
      });
      return { data: freshData, isDelayed: false };
    }

    // If fetch failed or 503, fallback to cached data if available
    if (cacheRow?.data) {
      return { data: cacheRow.data as T, isDelayed: true };
    }

    return { data: null, isDelayed };
  } catch (err) {
    return { data: null, isDelayed: true };
  }
}

export function mapPositionType(element_type: number): "GK" | "DEF" | "MID" | "FWD" {
  switch (element_type) {
    case 1: return "GK";
    case 2: return "DEF";
    case 3: return "MID";
    case 4: return "FWD";
    default: return "MID";
  }
}

export function computeFplMatchScore(
  pos: "FWD" | "MID" | "DEF" | "GK",
  stats: {
    minutes: number;
    goals_scored?: number;
    expected_goals?: number;
    assists?: number;
    expected_assists?: number;
    clean_sheets?: number;
    goals_conceded?: number;
    saves?: number;
    defensive_contribution?: number;
    bonus?: number;
    penalties_missed?: number;
    penalties_saved?: number;
    own_goals?: number;
    yellow_cards?: number;
    red_cards?: number;
    team_result?: number; // 1 for win, 0 for draw, -1 for loss
  }
): number {
  const mins = stats.minutes || 0;
  if (mins < 15) return 6.3; // Default baseline under 15 minutes

  const goals = stats.goals_scored || 0;
  const xG = stats.expected_goals || 0;
  const effectiveGoals = 0.5 * goals + 0.5 * xG;

  const assists = stats.assists || 0;
  const xA = stats.expected_assists || 0;
  const effectiveAssists = 0.5 * assists + 0.5 * xA;

  const weights = {
    FWD: { goal: 6, assist: 3.5, cs: 0, gc: 0, dc: 0.10, penMiss: -3, og: -1.5, red: -4 },
    MID: { goal: 4.5, assist: 3.5, cs: 0.8, gc: -0.3, dc: 0.15, penMiss: -2.5, og: -2.5, red: -4.5 },
    DEF: { goal: 2, assist: 2, cs: 2.0, gc: -0.8, dc: 0.20, penMiss: -2, og: -3.5, red: -5 },
    GK: { goal: 2, assist: 1.5, cs: 2.5, gc: -1.0, dc: 0, penMiss: 0, og: -3.5, red: -5 },
  }[pos];

  let score = 0;
  score += effectiveGoals * weights.goal;
  score += effectiveAssists * weights.assist;

  if (mins >= 60 && (stats.clean_sheets || 0) > 0) {
    score += weights.cs;
  }

  const gc = Math.min(3, stats.goals_conceded || 0);
  score += gc * weights.gc;

  if (pos === "GK") {
    score += (stats.saves || 0) * 0.6;
    score += (stats.penalties_saved || 0) * 3;
  }

  score += (stats.defensive_contribution || 0) * weights.dc;
  score += (stats.bonus || 0) * 1.0;
  score += (stats.penalties_missed || 0) * weights.penMiss;
  score += (stats.own_goals || 0) * weights.og;
  score += (stats.yellow_cards || 0) * -1.0;
  score += (stats.red_cards || 0) * weights.red;

  const teamRes = stats.team_result ?? 0;
  score += teamRes * (mins / 90.0);

  // Cap total score between -8 and +20
  score = Math.max(-8, Math.min(20, score));
  return score;
}

export function calculateRatingFromScore(
  pos: "FWD" | "MID" | "DEF" | "GK",
  score: number,
  minutes: number,
  calibration: Record<string, { mean: number; std: number }>
): number {
  if (minutes < 15) return 6.3;

  const per90 = (score * 90.0) / minutes;
  const cal = calibration[pos] || { mean: 3.8, std: 2.8 };
  const z = (per90 - cal.mean) / (cal.std || 1);
  const rating = 6.3 + 0.9 * z;

  // Clamp between 1.0 and 10.0
  return Math.max(1.0, Math.min(10.0, Math.round(rating * 100) / 100));
}

export function computeWeightForMinutes(minutes: number): number {
  if (minutes < 15) return 0;
  if (minutes >= 60) return 1.0;
  // At 30 minutes, weight is 0.5; linear between 15 and 60
  return Math.round(((minutes - 15) / 45) * 100) / 100;
}
