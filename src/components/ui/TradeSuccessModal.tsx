import React from 'react';
import { Player } from '../../lib/types';
import { formatCaps, formatPrice } from '../../lib/utils';
import { TactileButton } from './TactileButton';
import { JerseyAvatar } from './JerseyAvatar';

interface TradeSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  side: 'BUY' | 'SELL';
  shares: number;
  price: number;
  grossAmount: number;
  fee: number;
  netAmount: number;
  newBalance: number;
}

export const TradeSuccessModal: React.FC<TradeSuccessModalProps> = ({
  isOpen,
  onClose,
  player,
  side,
  shares,
  price,
  grossAmount,
  fee,
  netAmount,
  newBalance,
}) => {
  if (!isOpen) return null;

  const isBuy = side === 'BUY';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-surface-container-lowest rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-4 relative animate-scale-up">
        {/* Confetti / Icon badge */}
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-inner ${
            isBuy ? 'bg-tertiary-container/15 text-tertiary-container' : 'bg-primary-container/15 text-primary-container'
          }`}
        >
          {isBuy ? '🎉' : '💰'}
        </div>

        <div>
          <span
            className={`font-label-ui text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
              isBuy ? 'bg-tertiary-container/10 text-tertiary-container' : 'bg-primary/10 text-primary'
            }`}
          >
            {isBuy ? 'Order Filled • Long Opened' : 'Order Settled • Profits Realized'}
          </span>
          <h2 className="font-headline-lg text-2xl text-on-surface mt-2 tracking-tight">
            {isBuy ? 'Shares Acquired!' : 'Shares Sold!'}
          </h2>
          <p className="font-body-sm text-on-surface-variant text-xs mt-1">
            {isBuy
              ? `You now own ${shares.toLocaleString()} shares of ${player.name}`
              : `Successfully liquidated ${shares.toLocaleString()} shares of ${player.name}`}
          </p>
        </div>

        {/* Player mini card */}
        <div className="w-full bg-surface-container-low rounded-2xl p-3 flex items-center gap-3">
          <JerseyAvatar jerseyNumber={player.jersey_number} position={player.position} size="md" />
          <div className="flex flex-col text-left flex-1 min-w-0">
            <span className="font-headline-sm text-sm text-on-surface font-bold truncate">
              {player.name}
            </span>
            <span className="font-body-sm text-xs text-on-surface-variant truncate">
              {player.club} • {player.position}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-label-ticker text-xs text-on-surface font-bold">
              🧢 {formatPrice(price)}
            </span>
            <span className="text-[10px] text-tertiary-container font-semibold">
              Fill Price
            </span>
          </div>
        </div>

        {/* Financial Breakdown Bento */}
        <div className="w-full bg-surface-container rounded-2xl p-3.5 flex flex-col gap-2 text-xs">
          <div className="flex justify-between text-on-surface-variant">
            <span>Executed Shares:</span>
            <span className="font-label-data-sm text-on-surface font-bold">
              {shares.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-on-surface-variant">
            <span>Gross Value:</span>
            <span className="font-label-data-sm text-on-surface">
              🧢 {formatCaps(grossAmount)}
            </span>
          </div>
          <div className="flex justify-between text-on-surface-variant">
            <span>House Trading Fee (0.5%):</span>
            <span className="font-label-data-sm text-on-surface">
              🧢 {formatCaps(fee)}
            </span>
          </div>
          <div className="h-px bg-outline-variant/50 my-0.5" />
          <div className="flex justify-between text-on-surface font-bold text-sm">
            <span>{isBuy ? 'Total Paid:' : 'Net Proceeds:'}</span>
            <span className="font-label-data-sm text-primary">
              🧢 {formatCaps(netAmount)}
            </span>
          </div>
          <div className="flex justify-between text-on-surface-variant text-[11px] pt-1">
            <span>New Caps Liquidity:</span>
            <span className="font-label-data-sm text-on-surface font-bold">
              🧢 {formatCaps(newBalance)}
            </span>
          </div>
        </div>

        {/* Done Button */}
        <TactileButton fullWidth size="lg" variant={isBuy ? 'primary' : 'secondary'} onClick={onClose}>
          Done • Return to Market
        </TactileButton>
      </div>
    </div>
  );
};
