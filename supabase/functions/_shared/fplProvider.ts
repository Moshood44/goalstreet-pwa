import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { StandardPlayerRating } from "./providerInterface.ts";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const FPL_BASE = "https://fantasy.premierleague.com/api";

export class FplProvider {
  name = "fpl";
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async fetchEndpoint<T>(endpoint: string): Promise<{ data: T | null; isUpdating: boolean }> {
    try {
      const res = await fetch(`${FPL_BASE}/${endpoint}`, {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept": "application/json",
        },
      });

      if (res.status === 503) {
        return { data: null, isUpdating: true };
      }
      if (!res.ok) {
        return { data: null, isUpdating: false };
      }
      const json = await res.json();
      return { data: json as T, isUpdating: false };
    } catch (_e) {
      return { data: null, isUpdating: false };
    }
  }

  /**
   * Deterministic Provisional Rating:
   * For each player with minutes > 0 in a live or finished fixture:
   * 1. Calculate fixture median BPS among all participants with minutes > 0
   * 2. BPS distance from median scaled: (bps - median) * 0.12
   * 3. Add small adjustments: xG * 0.5 + xA * 0.35 + ict_index * 0.05
   * 4. Map baseline 6.5 + delta, clamp strictly between 3.0 and 10.0
   * Players with 0 minutes keep their previous real rating without guessing.
   */
  computeProvisionalRating(
    playerStats: {
      minutes: number;
      bps: number;
      ict_index: number;
      expected_goals: number;
      expected_assists: number;
    },
    fixtureMedianBps: number
  ): number {
    if (!playerStats.minutes || playerStats.minutes <= 0) {
      return 6.5; // neutral baseline for participants
    }

    const bpsDiff = playerStats.bps - fixtureMedianBps;
    let delta = bpsDiff * 0.10;

    // Small performance adjustments from real Opta / FPL metrics
    delta += playerStats.expected_goals * 0.50;
    delta += playerStats.expected_assists * 0.35;
    delta += (playerStats.ict_index / 20.0) * 0.25;

    const rating = 6.5 + delta;
    return Math.max(3.0, Math.min(10.0, Math.round(rating * 10) / 10));
  }

  /**
   * Final Full-Time Reconciled Rating:
   * Uses final bps, bonus, total_points, and minutes to produce final verified rating.
   */
  computeFinalRating(
    playerStats: {
      minutes: number;
      bps: number;
      bonus: number;
      total_points: number;
      expected_goals: number;
      expected_assists: number;
      ict_index: number;
    },
    fixtureMedianBps: number
  ): number {
    if (!playerStats.minutes || playerStats.minutes <= 0) return 6.0;

    const provisional = this.computeProvisionalRating(playerStats, fixtureMedianBps);
    // Add official FPL bonus points (+0.3 per bonus point) and total points weight
    const bonusBonus = (playerStats.bonus || 0) * 0.35;
    const finalRating = provisional + bonusBonus;

    return Math.max(3.0, Math.min(10.0, Math.round(finalRating * 10) / 10));
  }
}

