import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMarket } from '../context/MarketContext';
import { Player } from '../lib/types';
import { formatCaps, formatPercent } from '../lib/utils';
import { PricePill } from '../components/ui/PricePill';
import { JerseyAvatar } from '../components/ui/JerseyAvatar';
import { Sparkline } from '../components/ui/Sparkline';
import { TradeBottomSheet } from '../components/ui/TradeBottomSheet';
import { PwaInstallBanner } from '../components/ui/PwaInstallBanner';

export const MarketHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const {
    players,
    priceDirections,
    portfolioNetWorth,
    availableLiquidity,
    isWatchlisted,
    toggleWatchlist,
    isDataDelayed,
  } = useMarket();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<string>('ALL');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'RISING' | 'FALLING' | 'LIVE'>('ALL');
  const [selectedPlayerForTrade, setSelectedPlayerForTrade] = useState<Player | null>(null);

  // Filtered players
  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      // Search
      const matchesSearch =
        player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.club.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.position.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // Position
      if (selectedPosition !== 'ALL' && player.position !== selectedPosition) {
        return false;
      }

      // Filter
      if (selectedFilter === 'LIVE' && player.status !== 'locked') return false;
      if (selectedFilter === 'RISING' && player.change_24h_pct <= 0) return false;
      if (selectedFilter === 'FALLING' && player.change_24h_pct >= 0) return false;

      return true;
    });
  }, [players, searchQuery, selectedPosition, selectedFilter]);

  const username = profile?.username || 'Striker';

  return (
    <div className="flex-1 w-full bg-surface pb-28">
      {/* Top Header */}
      <header className="sticky top-0 w-full z-30 pt-safe bg-surface/90 backdrop-blur-xl border-b border-surface-container-high/60 shadow-sm">
        <div className="max-w-md mx-auto h-16 px-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-lg shadow-[0_2px_0_0_#4500D8]">
              🧢
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-sm text-on-surface font-extrabold leading-tight">
                Goalstreet
              </span>
              <span className="font-label-ui text-[11px] text-on-surface-variant leading-none">
                Exchange
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary-fixed/50 shadow-[0_2px_0_0_#F5BF34]">
              <span className="text-xs">🧢</span>
              <span className="font-label-data-sm text-xs text-on-secondary-fixed font-bold">
                {formatCaps(availableLiquidity, 0)}
              </span>
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-[0_2px_0_0_#4500D8] active:translate-y-0.5"
            >
              <span className="material-symbols-outlined text-[18px]">person</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-3 flex flex-col gap-4">
        {/* PWA Install Banner */}
        <PwaInstallBanner />

        {/* Data Delayed Notice */}
        {isDataDelayed && (
          <div className="w-full bg-secondary-container/20 border border-secondary-container/40 rounded-2xl px-3.5 py-2 flex items-center justify-between text-xs text-on-surface">
            <div className="flex items-center gap-2">
              <span className="text-secondary font-bold">⚠️</span>
              <span className="font-medium text-[11px] text-on-surface-variant">FPL sync delayed (&gt;15m). Serving last verified prices.</span>
            </div>
            <span className="text-[10px] bg-secondary-container text-on-secondary-container font-bold px-2 py-0.5 rounded-full">
              Safe Mode
            </span>
          </div>
        )}

        {/* Portfolio Net Worth Hero Bento */}
        <section className="w-full bg-surface-container-lowest rounded-3xl p-5 shadow-[0_4px_16px_rgba(30,27,46,0.06),0_3px_0_0_#E9E8E4] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-label-ui text-xs text-on-surface-variant font-bold uppercase tracking-wider">
              Portfolio Net Worth
            </span>
            <span className="font-label-ui text-[11px] text-tertiary-container font-bold bg-tertiary-container/10 px-2 py-0.5 rounded-full">
              Gameweek 11 Live
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="font-display-lg text-3xl text-on-surface font-black tracking-tight">
              🧢 {formatCaps(portfolioNetWorth)}
            </span>
            <span className="font-label-data-sm text-xs font-bold text-tertiary-container">
              +0.0%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-container">
            <div className="flex flex-col">
              <span className="text-[11px] text-on-surface-variant">Cash Liquidity:</span>
              <span className="font-label-data-sm text-xs font-bold text-on-surface">
                🧢 {formatCaps(availableLiquidity, 0)}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[11px] text-on-surface-variant">Holdings:</span>
              <span className="font-label-data-sm text-xs font-bold text-on-surface">
                🧢 {formatCaps(portfolioNetWorth - availableLiquidity, 0)}
              </span>
            </div>
          </div>
        </section>

        {/* Competitions / Leagues Filter Tabs */}
        <section className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-primary text-on-primary shrink-0 shadow-sm">
            Premier League
          </button>
          <button disabled className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-surface-container text-outline opacity-60 shrink-0 cursor-not-allowed">
            La Liga (Coming soon)
          </button>
          <button disabled className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-surface-container text-outline opacity-60 shrink-0 cursor-not-allowed">
            UEFA Champions League (Coming soon)
          </button>
        </section>

        {/* Search & Position Filters */}
        <section className="flex flex-col gap-2.5">
          {/* Search Input */}
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search athlete, club or position..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-surface-container-lowest rounded-2xl text-xs font-medium text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-[0_2px_0_0_#E9E8E4]"
            />
          </div>

          {/* Position Selector Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(['ALL', 'FWD', 'MID', 'DEF', 'GK'] as const).map((pos) => (
              <button
                key={pos}
                onClick={() => setSelectedPosition(pos)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedPosition === pos
                    ? 'bg-surface-container-lowest text-primary shadow-[0_2px_0_0_#4500D8]'
                    : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        </section>

        {/* Player Market Listing */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium px-1">
            <span>Market Assets ({filteredPlayers.length})</span>
            <span>24h Change / Price</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {filteredPlayers.slice(0, 50).map((player) => {
              const direction = priceDirections[player.id] || 'same';
              const isFav = isWatchlisted(player.id);
              const isLocked = player.status === 'locked';

              return (
                <div
                  key={player.id}
                  className="w-full bg-surface-container-lowest rounded-2xl p-3 shadow-[0_2px_0_0_#E9E8E4] flex items-center justify-between gap-3 hover:bg-surface-container-low transition-colors"
                >
                  {/* Left: Avatar & Info */}
                  <div
                    onClick={() => navigate(`/player/${player.id}`)}
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                  >
                    <JerseyAvatar
                      jerseyNumber={player.jersey_number}
                      position={player.position}
                      size="md"
                    />

                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-headline-sm text-sm text-on-surface font-bold truncate">
                          {player.name}
                        </span>
                        {isLocked && (
                          <span className="bg-error/15 text-error text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                            LIVE
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-on-surface-variant mt-0.5">
                        <span className="truncate">{player.club}</span>
                        <span>•</span>
                        <span className="font-semibold">{player.position}</span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-1 text-[11px]">
                        <span className="text-secondary font-bold">
                          ★ {player.last_match_rating ? player.last_match_rating.toFixed(1) : 'n/a'}
                        </span>
                        <span className="text-on-surface-variant">Rating</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Sparkline, Price, Trade Action */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <Sparkline
                      isPositive={player.change_24h_pct >= 0}
                      width={44}
                      height={20}
                    />

                    <div
                      onClick={() => navigate(`/player/${player.id}`)}
                      className="flex flex-col items-end cursor-pointer"
                    >
                      <PricePill price={player.current_price} direction={direction} size="md" />
                      <span
                        className={`text-[10px] font-bold mt-0.5 ${
                          player.change_24h_pct >= 0
                            ? 'text-tertiary-container'
                            : 'text-error'
                        }`}
                      >
                        {formatPercent(player.change_24h_pct)}
                      </span>
                    </div>

                    {/* Trade / Star actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleWatchlist(player.id)}
                        className={`p-1.5 rounded-xl transition-colors ${
                          isFav
                            ? 'text-secondary-fixed-dim bg-secondary/10'
                            : 'text-outline hover:text-on-surface'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {isFav ? 'star' : 'star_border'}
                        </span>
                      </button>

                      <button
                        onClick={() => setSelectedPlayerForTrade(player)}
                        disabled={isLocked}
                        className={`px-3 py-1.5 rounded-xl font-headline-sm text-xs font-bold transition-all shadow-[0_2px_0_0_#4500D8] active:translate-y-0.5 ${
                          isLocked
                            ? 'bg-surface-container text-outline opacity-60 cursor-not-allowed shadow-none'
                            : 'bg-primary text-on-primary hover:bg-primary-container'
                        }`}
                      >
                        {isLocked ? 'Locked' : 'Trade'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Trade Bottom Sheet Modal */}
      {selectedPlayerForTrade && (
        <TradeBottomSheet
          player={selectedPlayerForTrade}
          isOpen={true}
          onClose={() => setSelectedPlayerForTrade(null)}
          defaultSide="BUY"
        />
      )}
    </div>
  );
};
