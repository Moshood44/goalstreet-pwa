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

  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [tradeSide, setTradeSide] = useState<'BUY' | 'SELL'>('BUY');
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const [hasRealHistory, setHasRealHistory] = useState(false);

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
            setHasRealHistory(true);
          } else {
            // Real flat current price line (never fake seeded curve)
            setPriceHistory([player.current_price, player.current_price]);
            setHasRealHistory(false);
          }
        });
    }
  }, [player?.id, player?.current_price]);

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

  // Projected price delta if live provisional rating settles
  const projectedRating = player.last_match_rating || 6.5;
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
                  <h1 className="font-headline-lg text-lg text-on-surface font-extrabold leading-tight">
                    {player.name}
                  </h1>
                  {isLocked && (
                    <span className="bg-error/15 text-error text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping" />
                      LIVE
                    </span>
                  )}
                </div>
                <span className="text-xs text-on-surface-variant font-medium mt-0.5">
                  {player.club} • #{player.jersey_number || '–'} • {player.position}
                </span>
              </div>
            </div>

            <PricePill price={player.current_price} size="lg" />
          </div>

          {/* Valuations Row */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-surface-container">
            <div className="flex flex-col">
              <span className="text-on-surface-variant text-[11px]">Base Value:</span>
              <span className="font-label-ticker text-sm text-on-surface font-bold">
                🧢 {formatPrice(player.base_price)}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-on-surface-variant text-[11px]">Crowd Premium:</span>
              <span className="font-label-data-sm text-sm text-primary font-bold">
                {formatPercent(player.crowd_premium * 100)}
              </span>
            </div>
          </div>
        </div>

        {/* Real Chart or Flat Line */}
        <div className="w-full bg-surface-container-lowest rounded-2xl p-4 shadow-[0_2px_0_0_#E9E8E4] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-headline-sm text-xs text-on-surface font-bold">Price Trajectory</span>
            <span className="text-[10px] text-on-surface-variant font-medium">
              {hasRealHistory ? 'Real Trade & Settlement Logs' : 'Market Flat (Quiet)'}
            </span>
          </div>

          <div className="h-20 w-full flex items-center justify-center">
            {hasRealHistory ? (
              <div className="w-full h-full flex items-end gap-1">
                {priceHistory.map((val, i) => {
                  const min = Math.min(...priceHistory);
                  const max = Math.max(...priceHistory);
                  const range = max - min || 1;
                  const hPct = Math.max(10, Math.min(100, ((val - min) / range) * 100));
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-primary/40 rounded-t hover:bg-primary transition-all"
                      style={{ height: `${hPct}%` }}
                      title={`🧢 ${val.toFixed(4)}`}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center text-xs text-on-surface-variant">
                <span className="h-0.5 w-full bg-outline-variant/60 my-2" />
                <span>No trades executed yet • Price remains flat at 🧢 {formatPrice(player.current_price)}</span>
              </div>
            )}
          </div>
        </div>

        {/* User Holdings Bento */}
        {sharesOwned > 0 && (
          <div className="w-full bg-surface-container-lowest rounded-2xl p-4 shadow-[0_2px_0_0_#E9E8E4] flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-on-surface-variant text-xs">Your Position:</span>
              <span className="font-headline-sm text-sm text-on-surface font-bold mt-0.5">
                {sharesOwned.toLocaleString()} Shares
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-on-surface-variant text-xs">Position Value:</span>
              <span className="font-label-ticker text-sm text-primary font-bold mt-0.5">
                🧢 {formatCaps(sharesOwned * player.current_price)}
              </span>
            </div>
          </div>
        )}

        {/* Real Match Rating Tracker */}
        <div className="w-full bg-surface-container-lowest rounded-2xl p-4 shadow-[0_2px_0_0_#E9E8E4] flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-sm text-xs text-on-surface font-bold flex items-center gap-1.5">
              <span>🎯</span> Match Performance Rating
            </h3>
            <span className="text-[10px] text-secondary font-bold">
              Base Price Driver
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-surface-container-low p-2.5 rounded-xl flex flex-col">
              <span className="text-on-surface-variant text-[11px]">Match Rating:</span>
              <span className="font-headline-sm text-base text-secondary font-black mt-0.5">
                ★ {player.last_match_rating ? player.last_match_rating.toFixed(1) : 'n/a'}
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
            Ratings are deterministically computed from real match statistics (minutes, BPS distance from fixture median, xG, and xA).
          </p>
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
