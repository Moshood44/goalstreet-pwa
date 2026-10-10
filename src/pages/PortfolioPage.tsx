import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarket } from '../context/MarketContext';
import { formatCaps, formatPrice, formatPercent } from '../lib/utils';
import { JerseyAvatar } from '../components/ui/JerseyAvatar';
import { PricePill } from '../components/ui/PricePill';
import { TactileButton } from '../components/ui/TactileButton';
import { TradeBottomSheet } from '../components/ui/TradeBottomSheet';
import { Player } from '../lib/types';

export const PortfolioPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    holdings,
    portfolioNetWorth,
    availableLiquidity,
    totalHoldingsValue,
  } = useMarket();

  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [tradeSide, setTradeSide] = useState<'BUY' | 'SELL'>('SELL');

  const totalCost = holdings.reduce((acc, h) => acc + (h.shares * h.avg_buy_price), 0);
  const totalUnrealizedPL = totalHoldingsValue - totalCost;
  const totalUnrealizedPLPct = totalCost > 0 ? (totalUnrealizedPL / totalCost) * 100 : 0;

  return (
    <div className="flex-1 w-full bg-surface pb-28">
      {/* Header */}
      <header className="sticky top-0 w-full z-30 pt-safe bg-surface/90 backdrop-blur-xl border-b border-surface-container-high/60">
        <div className="max-w-md mx-auto h-16 px-4 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="font-headline-lg text-lg text-on-surface font-extrabold tracking-tight">
              Portfolio & Locker
            </h1>
            <span className="font-label-ui text-xs text-on-surface-variant">
              Active Long Positions
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/orders')}
              className="px-3 py-1.5 rounded-full bg-surface-container-high text-xs font-bold text-on-surface flex items-center gap-1.5 shadow-sm active:translate-y-0.5"
            >
              <span className="material-symbols-outlined text-[16px]">receipt_long</span>
              History
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-3 flex flex-col gap-4">
        {/* Total Net Worth Bento */}
        <section className="w-full bg-surface-container-lowest rounded-3xl p-5 shadow-[0_4px_16px_rgba(30,27,46,0.06),0_3px_0_0_#E9E8E4] flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-ui text-xs text-on-surface-variant font-medium">
                Total Portfolio Net Worth
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl">🧢</span>
                <span className="font-display-lg text-3xl text-on-surface font-black tracking-tight">
                  {formatCaps(portfolioNetWorth)}
                </span>
                <span className="font-label-ticker text-xs text-on-surface-variant">
                  Caps
                </span>
              </div>
            </div>

            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-label-data-sm text-xs font-bold ${
                totalUnrealizedPL >= 0
                  ? 'bg-tertiary-container/15 text-tertiary-container'
                  : 'bg-error/15 text-error'
              }`}
            >
              <span>{totalUnrealizedPL >= 0 ? '▲' : '▼'}</span>
              <span>{formatPercent(totalUnrealizedPLPct)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
            <div className="bg-surface-container-low px-3 py-2.5 rounded-2xl flex flex-col">
              <span className="text-on-surface-variant text-[11px]">Free Liquidity:</span>
              <span className="font-label-data-sm text-sm text-on-surface font-bold mt-0.5">
                🧢 {formatCaps(availableLiquidity)}
              </span>
            </div>
            <div className="bg-surface-container-low px-3 py-2.5 rounded-2xl flex flex-col">
              <span className="text-on-surface-variant text-[11px]">Holdings Value:</span>
              <span className="font-label-data-sm text-sm text-primary font-bold mt-0.5">
                🧢 {formatCaps(totalHoldingsValue)}
              </span>
            </div>
          </div>
        </section>

        {/* Positions Section */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-sm text-sm text-on-surface font-bold">
              Holdings Breakdown ({holdings.length})
            </h2>
            <span className="text-[11px] text-on-surface-variant">
              25% Max Cap Rule Enforced
            </span>
          </div>

          {holdings.length === 0 ? (
            /* Empty State matching screen 2ae6307caa22416a9f5f4646b83b4e9a */
            <div className="w-full bg-surface-container-lowest rounded-3xl p-8 shadow-[0_2px_0_0_#E9E8E4] flex flex-col items-center text-center gap-3 my-2">
              <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center text-3xl">
                ⚽
              </div>
              <div>
                <h3 className="font-headline-md text-base text-on-surface font-bold">
                  Your Locker is Empty
                </h3>
                <p className="font-body-sm text-xs text-on-surface-variant max-w-xs mt-1">
                  You have <strong className="text-on-surface">10,000 Caps</strong> of free starting liquidity waiting to be deployed into Premier League talent.
                </p>
              </div>
              <TactileButton
                variant="primary"
                size="md"
                className="mt-2"
                onClick={() => navigate('/')}
              >
                Scout the Market
              </TactileButton>
            </div>
          ) : (
            /* Holdings List */
            <div className="flex flex-col gap-2.5">
              {holdings.map((h) => {
                const player = h.player;
                if (!player) return null;

                const currentValue = h.current_value || 0;
                const pl = h.unrealized_pl || 0;
                const plPct = h.unrealized_pl_pct || 0;
                const positionPctOfPortfolio = portfolioNetWorth > 0 ? (currentValue / portfolioNetWorth) * 100 : 0;

                return (
                  <div
                    key={h.id}
                    className="w-full bg-surface-container-lowest rounded-2xl p-4 shadow-[0_2px_0_0_#E9E8E4] flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between">
                      <div
                        onClick={() => navigate(`/player/${player.id}`)}
                        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                      >
                        <JerseyAvatar
                          jerseyNumber={player.jersey_number}
                          position={player.position}
                          size="md"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="font-headline-sm text-sm text-on-surface font-bold truncate">
                            {player.name}
                          </span>
                          <span className="text-xs text-on-surface-variant truncate">
                            {h.shares.toLocaleString()} shares • Avg 🧢 {formatPrice(h.avg_buy_price)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end">
                        <span className="font-label-ticker text-sm text-on-surface font-bold">
                          🧢 {formatCaps(currentValue)}
                        </span>
                        <span
                          className={`text-xs font-bold ${
                            pl >= 0 ? 'text-tertiary-container' : 'text-error'
                          }`}
                        >
                          {pl >= 0 ? '+' : ''}{formatCaps(pl)} ({formatPercent(plPct)})
                        </span>
                      </div>
                    </div>

                    {/* Single Player Portfolio Concentration Bar */}
                    <div className="flex flex-col gap-1 text-[11px] bg-surface-container-low p-2 rounded-xl">
                      <div className="flex justify-between text-on-surface-variant">
                        <span>Portfolio Weight:</span>
                        <span className="font-bold text-on-surface">
                          {positionPctOfPortfolio.toFixed(1)}% / 25.0% Max
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.min(100, (positionPctOfPortfolio / 25) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-1 border-t border-surface-container">
                      <button
                        onClick={() => {
                          setSelectedPlayer(player);
                          setTradeSide('BUY');
                        }}
                        className="flex-1 py-1.5 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold hover:bg-surface-container-highest transition-colors"
                      >
                        Buy More
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPlayer(player);
                          setTradeSide('SELL');
                        }}
                        className="flex-1 py-1.5 rounded-xl bg-secondary-container text-on-secondary-fixed text-xs font-bold shadow-[0_2px_0_0_#F5BF34] active:translate-y-0.5 transition-all"
                      >
                        Sell Shares
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Trade Modal */}
      {selectedPlayer && (
        <TradeBottomSheet
          player={selectedPlayer}
          isOpen={true}
          onClose={() => setSelectedPlayer(null)}
          defaultSide={tradeSide}
        />
      )}
    </div>
  );
};
