import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { useMarket } from '../context/MarketContext';
import { formatPrice, formatPercent } from '../lib/utils';
import { JerseyAvatar } from '../components/ui/JerseyAvatar';
import { PricePill } from '../components/ui/PricePill';
import { TactileButton } from '../components/ui/TactileButton';
import { TradeBottomSheet } from '../components/ui/TradeBottomSheet';
import { Player } from '../lib/types';

interface PlayerDetailedStats {
  minutes: number;
  expected_goals_per_90: number | null;
  expected_assists_per_90: number | null;
  form: string;
  recent_match_ratings: number[];
}

export const PlayerComparePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { players } = useMarket();

  const initialA = searchParams.get('playerA') || players[0]?.id;
  const initialB = searchParams.get('playerB') || players[1]?.id;

  const [playerAId, setPlayerAId] = useState<string>(initialA);
  const [playerBId, setPlayerBId] = useState<string>(initialB);
  const [tradePlayer, setTradePlayer] = useState<Player | null>(null);

  const [statsA, setStatsA] = useState<PlayerDetailedStats | null>(null);
  const [statsB, setStatsB] = useState<PlayerDetailedStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const playerA = players.find((p) => p.id === playerAId) || players[0];
  const playerB = players.find((p) => p.id === playerBId) || players[1] || players[0];

  useEffect(() => {
    async function loadRealPlayerStats(p: Player, setStats: (s: PlayerDetailedStats) => void) {
      if (!p?.fpl_id) {
        setStats({
          minutes: 0,
          expected_goals_per_90: null,
          expected_assists_per_90: null,
          form: 'n/a',
          recent_match_ratings: [],
        });
        return;
      }

      try {
        const res = await fetch(`https://fantasy.premierleague.com/api/element-summary/${p.fpl_id}/`);
        if (!res.ok) throw new Error('Failed to fetch element summary');
        const json = await res.json();
        const history: any[] = json?.history || [];

        const totalMins = history.reduce((acc, h) => acc + (h.minutes || 0), 0);
        const totalXg = history.reduce((acc, h) => acc + parseFloat(h.expected_goals || '0'), 0);
        const totalXa = history.reduce((acc, h) => acc + parseFloat(h.expected_assists || '0'), 0);

        const xG90 = totalMins > 0 ? (totalXg * 90) / totalMins : null;
        const xA90 = totalMins > 0 ? (totalXa * 90) / totalMins : null;

        // Recent match ratings computed from actual recent match history
        const recentRatings = history.slice(-5).map((h) => {
          const bps = h.bps || 0;
          const mins = h.minutes || 0;
          if (mins <= 0) return 6.0;
          return Math.max(3.0, Math.min(10.0, 6.0 + (bps - 15) * 0.12));
        });

        setStats({
          minutes: totalMins,
          expected_goals_per_90: xG90 !== null ? Math.round(xG90 * 100) / 100 : null,
          expected_assists_per_90: xA90 !== null ? Math.round(xA90 * 100) / 100 : null,
          form: history.length > 0 ? (history.slice(-3).reduce((a, b) => a + b.total_points, 0) / 3).toFixed(1) : 'n/a',
          recent_match_ratings: recentRatings,
        });
      } catch (_e) {
        // Fallback: Honest empty/null representation (never fabricate)
        setStats({
          minutes: 0,
          expected_goals_per_90: null,
          expected_assists_per_90: null,
          form: 'n/a',
          recent_match_ratings: [],
        });
      }
    }

    if (playerA && playerB) {
      setLoadingStats(true);
      Promise.all([
        loadRealPlayerStats(playerA, setStatsA),
        loadRealPlayerStats(playerB, setStatsB),
      ]).finally(() => setLoadingStats(false));
    }
  }, [playerA?.id, playerB?.id]);

  if (!playerA || !playerB) return null;

  return (
    <div className="min-h-screen w-full bg-surface pb-28">
      {/* Header */}
      <header className="sticky top-0 w-full z-30 pt-safe bg-surface/90 backdrop-blur-xl border-b border-surface-container-high/60">
        <div className="max-w-md mx-auto h-14 px-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-on-surface"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <h1 className="font-headline-sm text-sm text-on-surface font-bold">
            Head-to-Head Scout Tool
          </h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4 flex flex-col gap-4">
        {/* Selector Header Bar */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5 bg-surface-container-lowest p-3 rounded-2xl shadow-[0_2px_0_0_#E9E8E4]">
            <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
              Asset A
            </span>
            <select
              value={playerAId}
              onChange={(e) => setPlayerAId(e.target.value)}
              className="w-full bg-surface-container text-xs font-bold text-on-surface p-2 rounded-xl focus:outline-none truncate"
            >
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.club})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 bg-surface-container-lowest p-3 rounded-2xl shadow-[0_2px_0_0_#E9E8E4]">
            <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
              Asset B
            </span>
            <select
              value={playerBId}
              onChange={(e) => setPlayerBId(e.target.value)}
              className="w-full bg-surface-container text-xs font-bold text-on-surface p-2 rounded-xl focus:outline-none truncate"
            >
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.club})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Side-by-Side Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Card A */}
          <div className="bg-surface-container-lowest rounded-3xl p-4 shadow-[0_4px_16px_rgba(30,27,46,0.06),0_3px_0_0_#E9E8E4] flex flex-col items-center text-center gap-2">
            <JerseyAvatar jerseyNumber={playerA.jersey_number} position={playerA.position} size="lg" />
            <h3 className="font-headline-sm text-xs font-bold text-on-surface truncate w-full">
              {playerA.name}
            </h3>
            <span className="text-[10px] text-on-surface-variant">
              {playerA.club}
            </span>
            <PricePill price={playerA.current_price} size="sm" />
            <TactileButton
              variant="primary"
              size="sm"
              fullWidth
              disabled={playerA.status === 'locked'}
              onClick={() => setTradePlayer(playerA)}
            >
              {playerA.status === 'locked' ? 'Locked' : 'Trade A'}
            </TactileButton>
          </div>

          {/* Card B */}
          <div className="bg-surface-container-lowest rounded-3xl p-4 shadow-[0_4px_16px_rgba(30,27,46,0.06),0_3px_0_0_#E9E8E4] flex flex-col items-center text-center gap-2">
            <JerseyAvatar jerseyNumber={playerB.jersey_number} position={playerB.position} size="lg" />
            <h3 className="font-headline-sm text-xs font-bold text-on-surface truncate w-full">
              {playerB.name}
            </h3>
            <span className="text-[10px] text-on-surface-variant">
              {playerB.club}
            </span>
            <PricePill price={playerB.current_price} size="sm" />
            <TactileButton
              variant="secondary"
              size="sm"
              fullWidth
              disabled={playerB.status === 'locked'}
              onClick={() => setTradePlayer(playerB)}
            >
              {playerB.status === 'locked' ? 'Locked' : 'Trade B'}
            </TactileButton>
          </div>
        </div>

        {/* Real Per-90 & Scouting Metrics Table */}
        <section className="w-full bg-surface-container-lowest rounded-3xl p-4 shadow-[0_2px_0_0_#E9E8E4] flex flex-col gap-2.5 text-xs">
          <div className="flex items-center justify-between">
            <h4 className="font-headline-sm text-xs text-on-surface font-bold uppercase tracking-wider">
              Real Performance Metrics
            </h4>
            <span className="text-[10px] text-primary font-bold">FPL Season Data</span>
          </div>

          {/* Metric Rows */}
          <div className="flex items-center justify-between py-2 border-b border-surface-container">
            <span className="font-bold text-primary w-24 text-left">
              ★ {playerA.last_match_rating.toFixed(1)}
            </span>
            <span className="text-on-surface-variant text-[11px] font-medium text-center flex-1">
              Match Rating
            </span>
            <span className="font-bold text-primary w-24 text-right">
              ★ {playerB.last_match_rating.toFixed(1)}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-surface-container">
            <span className="font-label-ticker text-on-surface w-24 text-left">
              🧢 {formatPrice(playerA.base_price)}
            </span>
            <span className="text-on-surface-variant text-[11px] font-medium text-center flex-1">
              Base Valuation
            </span>
            <span className="font-label-ticker text-on-surface w-24 text-right">
              🧢 {formatPrice(playerB.base_price)}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-surface-container">
            <span className="font-bold text-tertiary-container w-24 text-left">
              {formatPercent(playerA.change_24h_pct)}
            </span>
            <span className="text-on-surface-variant text-[11px] font-medium text-center flex-1">
              24h Volatility
            </span>
            <span className="font-bold text-tertiary-container w-24 text-right">
              {formatPercent(playerB.change_24h_pct)}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-surface-container">
            <span className="font-mono text-on-surface w-24 text-left">
              {statsA ? (statsA.expected_goals_per_90 !== null ? statsA.expected_goals_per_90.toFixed(2) : 'n/a') : '...'}
            </span>
            <span className="text-on-surface-variant text-[11px] font-medium text-center flex-1">
              xG / 90 min
            </span>
            <span className="font-mono text-on-surface w-24 text-right">
              {statsB ? (statsB.expected_goals_per_90 !== null ? statsB.expected_goals_per_90.toFixed(2) : 'n/a') : '...'}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-surface-container">
            <span className="font-mono text-on-surface w-24 text-left">
              {statsA ? (statsA.expected_assists_per_90 !== null ? statsA.expected_assists_per_90.toFixed(2) : 'n/a') : '...'}
            </span>
            <span className="text-on-surface-variant text-[11px] font-medium text-center flex-1">
              xA / 90 min
            </span>
            <span className="font-mono text-on-surface w-24 text-right">
              {statsB ? (statsB.expected_assists_per_90 !== null ? statsB.expected_assists_per_90.toFixed(2) : 'n/a') : '...'}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-surface-container">
            <span className="font-bold text-on-surface w-24 text-left">
              {statsA?.minutes ? `${statsA.minutes}m` : 'n/a'}
            </span>
            <span className="text-on-surface-variant text-[11px] font-medium text-center flex-1">
              Actual Minutes Played
            </span>
            <span className="font-bold text-on-surface w-24 text-right">
              {statsB?.minutes ? `${statsB.minutes}m` : 'n/a'}
            </span>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="font-label-data-sm text-secondary w-24 text-left">
              {playerA.position}
            </span>
            <span className="text-on-surface-variant text-[11px] font-medium text-center flex-1">
              Pitch Role
            </span>
            <span className="font-label-data-sm text-secondary w-24 text-right">
              {playerB.position}
            </span>
          </div>
        </section>
      </main>

      {tradePlayer && (
        <TradeBottomSheet
          player={tradePlayer}
          isOpen={true}
          onClose={() => setTradePlayer(null)}
        />
      )}
    </div>
  );
};
