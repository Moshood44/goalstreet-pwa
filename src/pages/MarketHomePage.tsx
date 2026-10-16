import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMarket } from '../context/MarketContext';
import { Player } from '../lib/types';
import { formatCaps, formatPrice, formatPercent } from '../lib/utils';
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

  // New listings row (players added or newly listed)
  const newListings = useMemo(() => {
    return players.slice(10, 16);
  }, [players]);

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
              onClick={() => navigate('/me')}
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
            <span className="text-[10px] bg-secondary-fixed/50 text-on-secondary-fixed px-2 py-0.5 rounded-full font-bold">Data delayed</span>
          </div>
        )}

        {/* Greeting & Bento Balance Card */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h2 className="font-headline-md text-lg text-on-surface tracking-tight font-bold">
                Hey {username} 👋
              </h2>
              <p className="font-body-sm text-xs text-on-surface-variant">
                Transfer window is open & pumping
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high">
              <span className="inline-block w-2 h-2 rounded-full bg-tertiary-container animate-pulse" />
              <span className="font-label-ui text-[11px] text-on-surface font-bold">
                Market Live
              </span>
            </div>
          </div>

          {/* Tactile Bento Net Worth Card */}
          <div className="w-full bg-surface-container-lowest rounded-3xl p-4 shadow-[0_4px_16px_rgba(30,27,46,0.06),0_3px_0_0_#E9E8E4] flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="font-label-ui text-xs text-on-surface-variant">
                  Total Portfolio Net Worth
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl">🧢</span>
                  <span className="font-display-lg text-2xl text-on-surface font-extrabold tracking-tight">
                    {formatCaps(portfolioNetWorth)}
                  </span>
                  <span className="font-label-ticker text-xs text-on-surface-variant">
                    Caps
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container text-tertiary-container font-label-data-sm text-xs font-bold shadow-sm">
                <span>▲</span>
                <span>+0.00%</span>
                <span className="text-[10px] text-on-surface-variant font-normal">7d</span>
              </div>
            </div>

            <div className="flex items-center justify-between bg-surface-container-low px-3 py-2 rounded-2xl">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">⚡</span>
                <span className="font-label-ui text-xs text-on-surface-variant font-medium">
                  Available Cash:
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs">🧢</span>
                <span className="font-label-data-sm text-xs text-on-surface font-bold">
                  {formatCaps(availableLiquidity)}
                </span>
                <span className="font-label-ui text-[10px] text-tertiary-container font-bold uppercase tracking-wider ml-1">
                  Ready
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Search Bar */}
        <section className="relative w-full h-12 bg-surface-container-lowest rounded-2xl flex items-center px-3.5 shadow-[0_2px_0_0_#E9E8E4]">
          <span className="material-symbols-outlined text-outline text-[20px] shrink-0">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search players, clubs or positions..."
            className="w-full bg-transparent px-2.5 text-xs text-on-surface placeholder:text-outline focus:outline-none font-medium"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-outline text-xs p-1">
              ✕
            </button>
          )}
        </section>

        {/* League Selector Bar */}
        <section className="w-full bg-surface-container rounded-2xl p-1 flex items-center gap-1 shadow-inner">
          <button className="flex-1 py-1.5 px-2 rounded-xl bg-surface-container-lowest font-headline-sm text-xs text-primary shadow-sm flex items-center justify-center gap-1.5 font-bold">
            <span>🏴󠁧󠁢󠁥󠁮󠁧󠁿</span> Premier League
          </button>
          <button className="flex-1 py-1.5 px-2 rounded-xl font-label-ui text-xs text-on-surface-variant flex items-center justify-center gap-1.5">
            <span>🇪🇸</span> La Liga
          </button>
          <button className="flex-1 py-1.5 px-2 rounded-xl font-label-ui text-xs text-on-surface-variant flex items-center justify-center gap-1.5">
            <span>⭐</span> UCL
          </button>
        </section>

        {/* Position & Special Filter Chips */}
        <section className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {['ALL', 'FWD', 'MID', 'DEF', 'GK'].map((pos) => (
            <button
              key={pos}
              onClick={() => setSelectedPosition(pos)}
              className={`shrink-0 h-7 px-3 rounded-full text-xs font-bold transition-all ${
                selectedPosition === pos
                  ? 'bg-primary-container text-on-primary shadow-[0_2px_0_0_#4500D8] translate-y-0.5'
                  : 'bg-surface-container-lowest text-on-surface-variant shadow-[0_2px_0_0_#E9E8E4]'
              }`}
            >
              {pos}
            </button>
          ))}

          <button
            onClick={() => setSelectedFilter(selectedFilter === 'RISING' ? 'ALL' : 'RISING')}
            className={`shrink-0 h-7 px-3 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
              selectedFilter === 'RISING'
                ? 'bg-tertiary-container text-on-tertiary shadow-[0_2px_0_0_#005321]'
                : 'bg-surface-container-lowest text-on-surface-variant shadow-[0_2px_0_0_#E9E8E4]'
            }`}
          >
            <span>🚀</span> Rising
          </button>

          <button
            onClick={() => setSelectedFilter(selectedFilter === 'FALLING' ? 'ALL' : 'FALLING')}
            className={`shrink-0 h-7 px-3 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
              selectedFilter === 'FALLING'
                ? 'bg-error text-on-error shadow-[0_2px_0_0_#93000A]'
                : 'bg-surface-container-lowest text-on-surface-variant shadow-[0_2px_0_0_#E9E8E4]'
            }`}
          >
            <span>📉</span> Falling
          </button>

          <button
            onClick={() => setSelectedFilter(selectedFilter === 'LIVE' ? 'ALL' : 'LIVE')}
            className={`shrink-0 h-7 px-3 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedFilter === 'LIVE'
                ? 'bg-error text-on-error shadow-[0_2px_0_0_#93000A]'
                : 'bg-surface-container-lowest text-error shadow-[0_2px_0_0_#E9E8E4]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping" />
            Live Matches
          </button>
        </section>

        {/* New Listings Row (Replaced wonderkid IPOs as requested) */}
        <section className="flex flex-col gap-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="font-headline-sm text-sm text-on-surface font-bold flex items-center gap-1.5">
              <span>🔥</span> New Listings
            </span>
            <span className="text-[11px] text-primary font-bold">Live Order Books</span>
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {newListings.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/player/${p.id}`)}
                className="shrink-0 w-36 bg-surface-container-lowest rounded-2xl p-3 shadow-[0_3px_0_0_#E9E8E4] flex flex-col gap-2 cursor-pointer active:scale-95 transition-transform"
              >
                <div className="flex items-center justify-between">
                  <JerseyAvatar jerseyNumber={p.jersey_number} position={p.position} size="sm" />
                  <span className="text-[10px] font-bold text-on-surface-variant">
                    {p.position}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-headline-sm text-xs text-on-surface font-bold truncate">
                    {p.name}
                  </span>
                  <span className="text-[10px] text-on-surface-variant truncate">
                    {p.club}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-surface-container">
                  <PricePill price={p.current_price} size="sm" />
                  <span
                    className={`text-[10px] font-bold ${
                      p.change_24h_pct >= 0 ? 'text-tertiary-container' : 'text-error'
                    }`}
                  >
                    {formatPercent(p.change_24h_pct)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Players Marketplace List */}
        <section className="flex flex-col gap-2 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-sm text-sm text-on-surface font-bold">
              Market Movers ({filteredPlayers.length})
            </h3>
            <span className="text-[11px] text-on-surface-variant">
              House Fill • 0.5% Fee
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {filteredPlayers.map((player) => {
              const isLocked = player.status === 'locked';
              const direction = priceDirections[player.id] || 'same';
              const isFav = isWatchlisted(player.id);

              return (
                <div
                  key={player.id}
                  className="w-full bg-surface-container-lowest rounded-2xl p-3.5 shadow-[0_2px_0_0_#E9E8E4] flex items-center justify-between gap-3 transition-transform active:scale-[0.99]"
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

                      {/* Last Match Rating Tracker (Replacing dividend tracker) */}
                      <div className="flex items-center gap-1.5 mt-1 text-[11px]">
                        <span className="text-secondary font-bold">
                          ★ {player.last_match_rating.toFixed(1)}
                        </span>
                        <span className="text-on-surface-variant">Match Rating</span>
                        <span
                          className={`font-semibold ${
                            player.last_rating_change >= 0
                              ? 'text-tertiary-container'
                              : 'text-error'
                          }`}
                        >
                          ({player.last_rating_change >= 0 ? '+' : ''}
                          {player.last_rating_change.toFixed(4)} 🧢)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Sparkline, Price, Trade Action */}
                  <div className="flex items-center gap-3 shrink-0">
                    <Sparkline
                      isPositive={player.change_24h_pct >= 0}
                      width={48}
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
