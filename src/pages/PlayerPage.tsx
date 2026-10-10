import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMarket } from '../context/MarketContext';
import { formatCaps, formatPrice, formatPercent } from '../lib/utils';
import { JerseyAvatar } from '../components/ui/JerseyAvatar';
import { PricePill } from '../components/ui/PricePill';
import { TactileButton } from '../components/ui/TactileButton';
import { TradeBottomSheet } from '../components/ui/TradeBottomSheet';
import { supabase } from '../lib/supabase';

export const PlayerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { players, isWatchlisted, toggleWatchlist, holdings } = useMarket();

  const [timeframe, setTimeframe] = useState<'1D' | '7D' | '1M' | 'ALL'>('1D');
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [tradeSide, setTradeSide] = useState<'BUY' | 'SELL'>('BUY');
  const [priceHistory, setPriceHistory] = useState<number[]>([]);

  const player = players.find((p) => p.id === id) || players[0];

  useEffect(() => {
    if (player?.id) {
      supabase
        .from('price_history')
        .select('price')
        .eq('player_id', player.id)
        .order('timestamp', { ascending: true })
        .limit(20)
        .then(({ data }) => {
          if (data && data.length > 0) {
            setPriceHistory(data.map((d: any) => parseFloat(d.price)));
          } else {
            // Seeded curve for visual fidelity
            const base = player.current_price;
            setPriceHistory([
              base * 0.96,
              base * 0.98,
              base * 0.97,
              base * 1.01,
              base * 0.99,
              base * 1.02,
              base,
            ]);
          }
        });
    }
  }, [player?.id]);

  if (!player) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <span className="text-sm text-on-surface-variant">Player not found.</span>
      </div>
    );
  }

  const userHolding = holdings.find((h) => h.player_id === player.id);
  const sharesOwned = userHolding?.shares || 0;
  const isFav = isWatchlisted(player.id);
  const isLocked = player.status === 'locked';

  // Projected price delta if live rating settles
  const projectedRating = player.last_match_rating || 8.0;
  const projectedNewBase = (player.base_price + projectedRating / 10.0) / 2.0;
  const projectedPct = ((projectedNewBase - player.base_price) / player.base_price) * 100;

  return (
    <div className="min-h-screen w-full bg-surface pb-32 flex flex-col">
      {/* Top App Bar */}
      <header className="sticky top-0 w-full z-30 pt-safe bg-surface/90 backdrop-blur-xl border-b border-surface-container-high/60">
        <div className="max-w-md mx-auto h-14 px-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>

          <span className="font-headline-sm text-sm text-on-surface font-bold truncate max-w-[200px]">
            {player.name}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleWatchlist(player.id)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                isFav
                  ? 'bg-secondary/15 text-secondary-fixed-dim'
                  : 'bg-surface-container text-outline hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {isFav ? 'star' : 'star_border'}
              </span>
            </button>
            <button
              onClick={() => navigate(`/compare?playerA=${player.id}`)}
              className="w-9 h-9 rounded-xl bg-surface-container text-on-surface-variant flex items-center justify-center"
              title="Compare Player"
            >
              <span className="material-symbols-outlined text-[20px]">compare_arrows</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4 flex flex-col gap-4 flex-1">
        {/* Player Profile Header Card */}
        <div className="w-full bg-surface-container-lowest rounded-3xl p-5 shadow-[0_4px_16px_rgba(30,27,46,0.06),0_3px_0_0_#E9E8E4] flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <JerseyAvatar
                jerseyNumber={player.jersey_number}
                position={player.position}
                size="lg"
              />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="font-display-lg text-xl text-on-surface font-extrabold tracking-tight">
                    {player.name}
                  </h1>
                </div>
                <span className="font-body-md text-xs text-on-surface-variant">
                  {player.club} • {player.position}
                </span>
              </div>
            </div>

            {isLocked ? (
              <span className="bg-error/15 text-error text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-error animate-ping" />
                MATCH LOCKED
              </span>
            ) : (
              <span className="bg-tertiary-container/15 text-tertiary-container text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container" />
                Open Market
              </span>
            )}
          </div>

          {/* Big Live Price Display */}
          <div className="flex items-baseline justify-between pt-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl">🧢</span>
              <span className="font-display-lg text-3xl text-on-surface font-black tracking-tight">
                {formatPrice(player.current_price)}
              </span>
              <span className="font-label-ticker text-xs text-on-surface-variant font-bold">
                Caps
              </span>
            </div>

            <div className="flex items-center gap-1">
              <span
                className={`px-2.5 py-1 rounded-full font-label-data-sm text-xs font-bold ${
                  player.change_24h_pct >= 0
                    ? 'bg-tertiary-container/15 text-tertiary-container'
                    : 'bg-error/15 text-error'
                }`}
              >
                {formatPercent(player.change_24h_pct)} 24h
              </span>
            </div>
          </div>

          {/* Live Lock / In-Game Status Alert */}
          {isLocked && (
            <div className="bg-error/10 border border-error/20 rounded-2xl p-3 flex flex-col gap-1 text-xs">
              <div className="flex items-center justify-between font-bold text-error">
                <span className="flex items-center gap-1">
                  <span>🔴</span> LIVE MATCH IN PROGRESS
                </span>
                <span>Minute 68'</span>
              </div>
              <p className="text-on-surface-variant text-[11px]">
                Live performance rating: <strong className="text-on-surface">★ {projectedRating}</strong>. 
                On track for <strong className="text-tertiary-container">+{projectedPct.toFixed(2)}%</strong> price change upon final whistle settlement!
              </p>
            </div>
          )}

          {/* Chart SVG Visualization */}
          <div className="w-full h-36 bg-surface-container-low rounded-2xl p-3 flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between items-center text-[10px] text-on-surface-variant z-10">
              <span>High: 🧢 {formatPrice(player.current_price * 1.03)}</span>
              <span>Low: 🧢 {formatPrice(player.current_price * 0.97)}</span>
            </div>

            {/* Sparkline Expanded */}
            <div className="w-full flex-1 flex items-center justify-center">
              <svg className="w-full h-24 overflow-visible">
                {priceHistory.length > 1 && (
                  <polyline
                    fill="none"
                    stroke={player.change_24h_pct >= 0 ? '#007f37' : '#ba1a1a'}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={priceHistory
                      .map((val, idx) => {
                        const min = Math.min(...priceHistory);
                        const max = Math.max(...priceHistory);
                        const range = max - min || 1;
                        const x = (idx / (priceHistory.length - 1)) * 340 + 10;
                        const y = 80 - ((val - min) / range) * 60;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                  />
                )}
              </svg>
            </div>

            {/* Timeframe Chips */}
            <div className="flex items-center justify-around z-10 border-t border-outline-variant/30 pt-1">
              {(['1D', '7D', '1M', 'ALL'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                    timeframe === tf
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* User Holding Status if owned */}
        {sharesOwned > 0 && (
          <div className="w-full bg-surface-container-lowest rounded-2xl p-4 shadow-[0_2px_0_0_#E9E8E4] flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-label-ui text-xs text-on-surface-variant">
                Your Position in {player.name}
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-headline-sm text-sm text-on-surface font-bold">
                  {sharesOwned.toLocaleString()} Shares
                </span>
                <span className="font-label-data-sm text-xs text-primary font-bold">
                  (🧢 {formatCaps(sharesOwned * player.current_price)})
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-on-surface-variant">Avg Buy Price</span>
              <span className="font-label-ticker text-xs text-on-surface font-bold">
                🧢 {formatPrice(userHolding?.avg_buy_price)}
              </span>
            </div>
          </div>
        )}

        {/* Match Rating Tracker (Replacing dividend tracker) */}
        <div className="w-full bg-surface-container-lowest rounded-2xl p-4 shadow-[0_2px_0_0_#E9E8E4] flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-sm text-xs text-on-surface font-bold flex items-center gap-1.5">
              <span>🎯</span> Match Rating Tracker
            </h3>
            <span className="text-[10px] text-secondary font-bold">
              Base Price Driver
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-surface-container-low p-2.5 rounded-xl flex flex-col">
              <span className="text-on-surface-variant text-[11px]">Last Match Rating:</span>
              <span className="font-headline-sm text-base text-secondary font-black mt-0.5">
                ★ {player.last_match_rating.toFixed(1)} / 10
              </span>
            </div>
            <div className="bg-surface-container-low p-2.5 rounded-xl flex flex-col">
              <span className="text-on-surface-variant text-[11px]">Formula Delta:</span>
              <span
                className={`font-label-data-sm text-sm font-bold mt-0.5 ${
                  player.last_rating_change >= 0 ? 'text-tertiary-container' : 'text-error'
                }`}
              >
                {player.last_rating_change >= 0 ? '+' : ''}
                {player.last_rating_change.toFixed(4)} 🧢
              </span>
            </div>
          </div>

          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            Every matchweek, performance ratings directly adjust the player's intrinsic base price. 60+ minutes played carries full weight.
          </p>
        </div>

        {/* Key Market Metrics */}
        <div className="w-full bg-surface-container-lowest rounded-2xl p-4 shadow-[0_2px_0_0_#E9E8E4] flex flex-col gap-2.5">
          <h3 className="font-headline-sm text-xs text-on-surface font-bold">
            Exchange Fundamentals
          </h3>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between py-1 border-b border-surface-container">
              <span className="text-on-surface-variant">Total Shares:</span>
              <span className="font-label-data-sm font-bold text-on-surface">1,000,000,000</span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-container">
              <span className="text-on-surface-variant">House Fee:</span>
              <span className="font-label-data-sm font-bold text-on-surface">0.5% Flat</span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-container">
              <span className="text-on-surface-variant">Crowd Premium:</span>
              <span className="font-label-data-sm font-bold text-primary">
                {formatPercent(player.crowd_premium * 100)}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-container">
              <span className="text-on-surface-variant">Portfolio Cap:</span>
              <span className="font-label-data-sm font-bold text-on-surface">25% Max</span>
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Bottom Trade Action Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-xl border-t border-surface-container-high p-4 pb-safe shadow-lg">
        <div className="max-w-md mx-auto flex items-center gap-3">
          {sharesOwned > 0 && (
            <TactileButton
              variant="secondary"
              size="lg"
              className="flex-1"
              disabled={isLocked}
              onClick={() => {
                setTradeSide('SELL');
                setTradeModalOpen(true);
              }}
            >
              Sell Shares
            </TactileButton>
          )}

          <TactileButton
            variant="primary"
            size="lg"
            className="flex-1"
            disabled={isLocked}
            onClick={() => {
              setTradeSide('BUY');
              setTradeModalOpen(true);
            }}
          >
            {isLocked ? 'Match Live • Locked' : 'Buy Shares'}
          </TactileButton>
        </div>
      </footer>

      {/* Trade Modal */}
      <TradeBottomSheet
        player={player}
        isOpen={tradeModalOpen}
        onClose={() => setTradeModalOpen(false)}
        defaultSide={tradeSide}
      />
    </div>
  );
};
