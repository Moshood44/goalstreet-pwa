import React, { useState, useEffect } from 'react';
import { Player } from '../../lib/types';
import { formatCaps, formatPrice } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useMarket } from '../../context/MarketContext';
import { supabase } from '../../lib/supabase';
import { TactileButton } from './TactileButton';
import { JerseyAvatar } from './JerseyAvatar';
import { TradeSuccessModal } from './TradeSuccessModal';

interface TradeBottomSheetProps {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
  defaultSide?: 'BUY' | 'SELL';
}

export const TradeBottomSheet: React.FC<TradeBottomSheetProps> = ({
  player,
  isOpen,
  onClose,
  defaultSide = 'BUY',
}) => {
  const { user, profile } = useAuth();
  const { holdings, portfolioNetWorth, availableLiquidity, refreshMarket } = useMarket();

  const [side, setSide] = useState<'BUY' | 'SELL'>(defaultSide);
  const [sharesInput, setSharesInput] = useState<string>('5000');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Swipe slider state
  const [sliderPos, setSliderPos] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Success modal state
  const [successData, setSuccessData] = useState<any | null>(null);

  useEffect(() => {
    setSide(defaultSide);
    setErrorMessage(null);
    setSliderPos(0);
  }, [defaultSide, isOpen, player?.id]);

  if (!isOpen || !player) return null;

  const userHolding = holdings.find((h) => h.player_id === player.id);
  const currentSharesOwned = userHolding?.shares || 0;
  const currentSharesHoldingVal = currentSharesOwned * player.current_price;

  const sharesNum = Math.max(0, parseInt(sharesInput || '0', 10));
  const currentPrice = player.current_price;
  const grossAmount = sharesNum * currentPrice;
  const fee = grossAmount * 0.005;
  const netAmount = side === 'BUY' ? grossAmount + fee : Math.max(0, grossAmount - fee);

  // 25% Portfolio Cap calculation
  const maxPositionAllowed = portfolioNetWorth * 0.25;
  const remainingCapAllowance = Math.max(0, maxPositionAllowed - currentSharesHoldingVal);
  const maxBuySharesAllowed = Math.floor(remainingCapAllowance / currentPrice);
  const maxAffordableShares = Math.floor(availableLiquidity / (currentPrice * 1.005));
  const absoluteMaxBuyShares = Math.min(maxBuySharesAllowed, maxAffordableShares);

  const isBuyExceedingCap = side === 'BUY' && (currentSharesHoldingVal + grossAmount) > (portfolioNetWorth * 0.2505);
  const isLocked = player.status === 'locked';

  const handleExecuteTrade = async () => {
    if (!user) {
      setErrorMessage('Please sign in to place trades.');
      return;
    }
    if (isLocked) {
      setErrorMessage('Player is locked during live match. Trading disabled.');
      return;
    }
    if (sharesNum <= 0) {
      setErrorMessage('Please enter a share amount greater than 0.');
      return;
    }
    if (side === 'BUY' && netAmount > availableLiquidity) {
      setErrorMessage(`Insufficient Caps balance. You need 🧢 ${formatCaps(netAmount)}.`);
      return;
    }
    if (side === 'BUY' && isBuyExceedingCap) {
      setErrorMessage(`Exceeds 25% single-player portfolio cap (Max position: 🧢 ${formatCaps(maxPositionAllowed)}).`);
      return;
    }
    if (side === 'SELL' && sharesNum > currentSharesOwned) {
      setErrorMessage(`You only own ${currentSharesOwned.toLocaleString()} shares.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const rpcName = side === 'BUY' ? 'buy_shares' : 'sell_shares';
      const { data, error } = await supabase.rpc(rpcName, {
        p_user_id: user.id,
        p_player_id: player.id,
        p_shares: sharesNum,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      await refreshMarket();

      setSuccessData({
        player,
        side,
        shares: sharesNum,
        price: currentPrice,
        grossAmount,
        fee,
        netAmount,
        newBalance: data?.new_balance ?? (availableLiquidity + (side === 'BUY' ? -netAmount : netAmount)),
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Execution error');
    } finally {
      setIsSubmitting(false);
      setSliderPos(0);
    }
  };

  const handleQuickPercent = (pct: number) => {
    if (side === 'BUY') {
      const targetShares = Math.floor(absoluteMaxBuyShares * pct);
      setSharesInput(String(Math.max(100, targetShares)));
    } else {
      const targetShares = Math.floor(currentSharesOwned * pct);
      setSharesInput(String(Math.max(1, targetShares)));
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
        {/* Backdrop click */}
        <div className="flex-1" onClick={onClose} />

        {/* Sheet Content */}
        <div className="w-full max-w-md mx-auto bg-surface-container-lowest rounded-t-[32px] p-5 shadow-2xl flex flex-col gap-4 animate-slide-up pb-safe max-h-[90vh] overflow-y-auto">
          {/* Grab handle */}
          <div className="w-12 h-1.5 bg-surface-container-highest rounded-full mx-auto" />

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <JerseyAvatar jerseyNumber={player.jersey_number} position={player.position} size="md" />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h3 className="font-headline-sm text-base text-on-surface font-bold">
                    {player.name}
                  </h3>
                  {isLocked && (
                    <span className="bg-error/15 text-error text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping" />
                      LOCKED
                    </span>
                  )}
                </div>
                <span className="font-body-sm text-xs text-on-surface-variant">
                  {player.club} • {player.position}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <span className="font-label-ticker text-sm text-on-surface font-bold">
                🧢 {formatPrice(player.current_price)}
              </span>
              <span className="text-[11px] text-tertiary-container font-semibold">
                House Ask / Bid
              </span>
            </div>
          </div>

          {/* Buy / Sell Tabs */}
          <div className="w-full bg-surface-container rounded-xl p-1 flex items-center gap-1 shadow-inner">
            <button
              onClick={() => { setSide('BUY'); setErrorMessage(null); }}
              className={`flex-1 py-2 rounded-lg font-headline-sm text-xs transition-all ${
                side === 'BUY'
                  ? 'bg-primary-container text-on-primary shadow-[0_2px_4px_rgba(0,0,0,0.1),0_2px_0_0_#4500D8]'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Buy Long
            </button>
            <button
              onClick={() => { setSide('SELL'); setErrorMessage(null); }}
              className={`flex-1 py-2 rounded-lg font-headline-sm text-xs transition-all ${
                side === 'SELL'
                  ? 'bg-secondary-container text-on-secondary-fixed shadow-[0_2px_4px_rgba(0,0,0,0.1),0_2px_0_0_#F5BF34]'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Sell Shares ({currentSharesOwned.toLocaleString()})
            </button>
          </div>

          {/* Shares Input */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-ui text-xs text-on-surface-variant flex justify-between">
              <span>Quantity (Shares):</span>
              <span className="font-bold text-on-surface">
                {side === 'BUY'
                  ? `Max Cap Allowance: ${maxBuySharesAllowed.toLocaleString()} shares`
                  : `Owned: ${currentSharesOwned.toLocaleString()} shares`}
              </span>
            </label>

            <div className="relative flex items-center bg-surface-container rounded-2xl p-2 px-4 shadow-[0_2px_0_0_#E9E8E4]">
              <input
                type="number"
                min="1"
                value={sharesInput}
                onChange={(e) => setSharesInput(e.target.value)}
                placeholder="Number of shares"
                className="w-full bg-transparent font-display-lg text-2xl text-on-surface font-bold focus:outline-none"
              />
              <span className="font-label-ui text-xs text-on-surface-variant shrink-0 font-bold">
                SHARES
              </span>
            </div>

            {/* Quick Percentage Chips */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleQuickPercent(0.25)}
                className="flex-1 py-1 rounded-lg bg-surface-container-high text-on-surface text-xs font-semibold hover:bg-surface-container-highest transition-colors"
              >
                25%
              </button>
              <button
                type="button"
                onClick={() => handleQuickPercent(0.5)}
                className="flex-1 py-1 rounded-lg bg-surface-container-high text-on-surface text-xs font-semibold hover:bg-surface-container-highest transition-colors"
              >
                50%
              </button>
              <button
                type="button"
                onClick={() => handleQuickPercent(1.0)}
                className="flex-1 py-1 rounded-lg bg-surface-container-high text-on-surface text-xs font-semibold hover:bg-surface-container-highest transition-colors"
              >
                {side === 'BUY' ? 'Max 25% Cap' : '100% All'}
              </button>
            </div>
          </div>

          {/* 25% Portfolio Cap Progress Indicator */}
          {side === 'BUY' && (
            <div className="bg-surface-container-low rounded-2xl p-3 flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">25% Single-Player Cap:</span>
                <span className={`font-bold ${isBuyExceedingCap ? 'text-error' : 'text-on-surface'}`}>
                  🧢 {formatCaps(currentSharesHoldingVal + grossAmount)} / {formatCaps(maxPositionAllowed)}
                </span>
              </div>
              <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all rounded-full ${
                    isBuyExceedingCap ? 'bg-error' : 'bg-primary'
                  }`}
                  style={{
                    width: `${Math.min(100, ((currentSharesHoldingVal + grossAmount) / (maxPositionAllowed || 1)) * 100)}%`,
                  }}
                />
              </div>
              {isBuyExceedingCap && (
                <span className="text-[11px] text-error font-medium">
                  ⚠️ This order exceeds the 25% single-player concentration limit.
                </span>
              )}
            </div>
          )}

          {/* Trade Financial Summary Bento */}
          <div className="bg-surface-container rounded-2xl p-3.5 flex flex-col gap-2 text-xs">
            <div className="flex justify-between text-on-surface-variant">
              <span>Gross Price:</span>
              <span className="font-label-ticker text-on-surface">
                {sharesNum.toLocaleString()} × 🧢 {formatPrice(currentPrice)}
              </span>
            </div>
            <div className="flex justify-between text-on-surface-variant">
              <span>Gross Amount:</span>
              <span className="font-label-data-sm text-on-surface font-semibold">
                🧢 {formatCaps(grossAmount)}
              </span>
            </div>
            <div className="flex justify-between text-on-surface-variant">
              <span>Trading Fee (0.5%):</span>
              <span className="font-label-data-sm text-on-surface">
                🧢 {formatCaps(fee)}
              </span>
            </div>
            <div className="h-px bg-outline-variant/40 my-0.5" />
            <div className="flex justify-between text-on-surface font-bold text-sm">
              <span>{side === 'BUY' ? 'Total Cost (Caps):' : 'Estimated Return (Caps):'}</span>
              <span className="font-label-data-sm text-primary text-base">
                🧢 {formatCaps(netAmount)}
              </span>
            </div>
            <div className="flex justify-between text-on-surface-variant text-[11px]">
              <span>Your Cash Liquidity:</span>
              <span className="font-label-data-sm text-on-surface font-bold">
                🧢 {formatCaps(availableLiquidity)}
              </span>
            </div>
          </div>

          {errorMessage && (
            <div className="bg-error/15 text-error text-xs rounded-xl p-2.5 font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Plain Confirm Button + Swipe Slider fallback */}
          <div className="flex flex-col gap-2">
            <TactileButton
              fullWidth
              size="lg"
              variant={side === 'BUY' ? 'primary' : 'secondary'}
              disabled={isSubmitting || isLocked || (side === 'BUY' && isBuyExceedingCap)}
              onClick={handleExecuteTrade}
            >
              {isSubmitting
                ? 'Processing Order on Server...'
                : isLocked
                ? 'Match Live • Trading Locked'
                : side === 'BUY'
                ? `Confirm Buy • 🧢 ${formatCaps(netAmount)}`
                : `Confirm Sell • 🧢 ${formatCaps(netAmount)}`}
            </TactileButton>

            <button
              type="button"
              onClick={onClose}
              className="text-xs text-on-surface-variant hover:text-on-surface text-center py-1 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {successData && (
        <TradeSuccessModal
          isOpen={true}
          onClose={() => {
            setSuccessData(null);
            onClose();
          }}
          {...successData}
        />
      )}
    </>
  );
};
