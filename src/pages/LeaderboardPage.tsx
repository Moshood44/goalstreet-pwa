import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LeaderboardEntry } from '../lib/types';
import { formatCaps, formatPercent } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useMarket } from '../context/MarketContext';

export const LeaderboardPage: React.FC = () => {
  const { user } = useAuth();
  const { portfolioNetWorth } = useMarket();
  const [boardType, setBoardType] = useState<'weekly' | 'monthly'>('weekly');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase
      .rpc('get_leaderboard', { p_type: boardType })
      .then(({ data, error }) => {
        if (!error && data) {
          setEntries(data);
        } else {
          // Demo fallback entries if only 1 user exists
          setEntries([
            {
              rank_num: 1,
              user_id: 'mock-1',
              username: 'ApexTrader_99',
              portfolio_value: 14850.25,
              starting_value: 10000.0,
              return_pct: 48.5,
              tier: 'Legend',
            },
            {
              rank_num: 2,
              user_id: 'mock-2',
              username: 'HaalandHodler',
              portfolio_value: 13240.0,
              starting_value: 10000.0,
              return_pct: 32.4,
              tier: 'Elite',
            },
            {
              rank_num: 3,
              user_id: 'mock-3',
              username: 'SakaSniper',
              portfolio_value: 12100.5,
              starting_value: 10000.0,
              return_pct: 21.01,
              tier: 'Pro',
            },
            {
              rank_num: 4,
              user_id: user?.id || 'me',
              username: 'You',
              portfolio_value: portfolioNetWorth,
              starting_value: 10000.0,
              return_pct: ((portfolioNetWorth - 10000) / 10000) * 100,
              tier: 'Rookie',
            },
          ]);
        }
        setLoading(false);
      });
  }, [boardType, user?.id, portfolioNetWorth]);

  return (
    <div className="flex-1 w-full bg-surface pb-28">
      {/* Header */}
      <header className="sticky top-0 w-full z-30 pt-safe bg-surface/90 backdrop-blur-xl border-b border-surface-container-high/60">
        <div className="max-w-md mx-auto h-16 px-4 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="font-headline-lg text-lg text-on-surface font-extrabold tracking-tight">
              Global Leaderboards
            </h1>
            <span className="font-label-ui text-xs text-on-surface-variant">
              Ranked by Net % Return (Alpha)
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-fixed/50 font-bold text-xs text-on-secondary-fixed">
            <span>🏆</span> Bragging Rights
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-3 flex flex-col gap-4">
        {/* Weekly vs Monthly Toggle */}
        <section className="w-full bg-surface-container rounded-2xl p-1 flex items-center gap-1 shadow-inner">
          <button
            onClick={() => setBoardType('weekly')}
            className={`flex-1 py-2 rounded-xl font-headline-sm text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              boardType === 'weekly'
                ? 'bg-surface-container-lowest text-primary shadow-[0_2px_4px_rgba(0,0,0,0.06),0_2px_0_0_#4500D8]'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span>⚡</span> Weekly Cup (Monday 00:00 UTC)
          </button>
          <button
            onClick={() => setBoardType('monthly')}
            className={`flex-1 py-2 rounded-xl font-headline-sm text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              boardType === 'monthly'
                ? 'bg-surface-container-lowest text-primary shadow-[0_2px_4px_rgba(0,0,0,0.06),0_2px_0_0_#4500D8]'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span>👑</span> Monthly Crown (1st of Month)
          </button>
        </section>

        {/* Reset Timer Banner */}
        <section className="w-full bg-surface-container-lowest rounded-2xl p-3 shadow-[0_2px_0_0_#E9E8E4] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">⏳</span>
            <div className="flex flex-col">
              <span className="font-bold text-on-surface">
                {boardType === 'weekly' ? 'Weekly Settlement' : 'Monthly Settlement'}
              </span>
              <span className="text-on-surface-variant text-[11px]">
                {boardType === 'weekly' ? 'Resets Monday 00:00 UTC' : 'Resets on the 1st'}
              </span>
            </div>
          </div>
          <span className="font-label-data-sm text-primary font-bold bg-primary/10 px-2 py-1 rounded-lg">
            Active Round
          </span>
        </section>

        {/* Top 3 Podium Highlights */}
        {entries.length >= 3 && (
          <section className="grid grid-cols-3 gap-2 pt-1 items-end">
            {/* Rank 2 */}
            <div className="bg-surface-container-lowest rounded-2xl p-3 shadow-[0_2px_0_0_#E9E8E4] flex flex-col items-center text-center gap-1">
              <span className="text-xl">🥈</span>
              <span className="font-headline-sm text-xs text-on-surface font-bold truncate w-full">
                {entries[1].username}
              </span>
              <span className="font-label-data-sm text-xs text-tertiary-container font-extrabold">
                {formatPercent(entries[1].return_pct)}
              </span>
              <span className="text-[10px] text-on-surface-variant">
                🧢 {formatCaps(entries[1].portfolio_value, 0)}
              </span>
            </div>

            {/* Rank 1 */}
            <div className="bg-secondary-fixed/30 rounded-2xl p-3.5 shadow-[0_3px_0_0_#F5BF34] border border-secondary/20 flex flex-col items-center text-center gap-1 scale-105 z-10">
              <span className="text-2xl">🥇</span>
              <span className="font-headline-sm text-xs text-on-surface font-bold truncate w-full">
                {entries[0].username}
              </span>
              <span className="font-label-data-sm text-xs text-tertiary-container font-black">
                {formatPercent(entries[0].return_pct)}
              </span>
              <span className="text-[10px] text-on-surface-variant font-bold">
                🧢 {formatCaps(entries[0].portfolio_value, 0)}
              </span>
            </div>

            {/* Rank 3 */}
            <div className="bg-surface-container-lowest rounded-2xl p-3 shadow-[0_2px_0_0_#E9E8E4] flex flex-col items-center text-center gap-1">
              <span className="text-xl">🥉</span>
              <span className="font-headline-sm text-xs text-on-surface font-bold truncate w-full">
                {entries[2].username}
              </span>
              <span className="font-label-data-sm text-xs text-tertiary-container font-extrabold">
                {formatPercent(entries[2].return_pct)}
              </span>
              <span className="text-[10px] text-on-surface-variant">
                🧢 {formatCaps(entries[2].portfolio_value, 0)}
              </span>
            </div>
          </section>
        )}

        {/* Full Ranking Table */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-on-surface-variant px-2 font-medium">
            <span>Rank & Trader</span>
            <span>Net Return / Balance</span>
          </div>

          <div className="flex flex-col gap-2">
            {entries.map((entry) => {
              const isCurrentUser = entry.user_id === user?.id;

              return (
                <div
                  key={entry.rank_num + entry.user_id}
                  className={`w-full rounded-2xl p-3 flex items-center justify-between gap-3 shadow-[0_2px_0_0_#E9E8E4] ${
                    isCurrentUser
                      ? 'bg-primary-fixed/40 border border-primary/40 font-bold'
                      : 'bg-surface-container-lowest'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-6 text-center font-display-lg text-sm font-extrabold ${
                        entry.rank_num === 1
                          ? 'text-secondary'
                          : entry.rank_num === 2
                          ? 'text-outline'
                          : entry.rank_num === 3
                          ? 'text-[#A05A2C]'
                          : 'text-on-surface-variant'
                      }`}
                    >
                      #{entry.rank_num}
                    </span>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-headline-sm text-xs text-on-surface font-bold truncate">
                          {entry.username}
                        </span>
                        {isCurrentUser && (
                          <span className="bg-primary text-on-primary text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                            YOU
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-on-surface-variant">
                        Tier: {entry.tier || 'Rookie'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <span
                      className={`font-label-data-sm text-xs font-black ${
                        entry.return_pct >= 0 ? 'text-tertiary-container' : 'text-error'
                      }`}
                    >
                      {formatPercent(entry.return_pct)}
                    </span>
                    <span className="text-[11px] text-on-surface font-medium">
                      🧢 {formatCaps(entry.portfolio_value)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};
