import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarket } from '../context/MarketContext';
import { JerseyAvatar } from '../components/ui/JerseyAvatar';
import { PricePill } from '../components/ui/PricePill';
import { formatPercent } from '../lib/utils';
import { TradeBottomSheet } from '../components/ui/TradeBottomSheet';
import { Player } from '../lib/types';

export const WatchlistPage: React.FC = () => {
  const navigate = useNavigate();
  const { watchlist, players, toggleWatchlist } = useMarket();
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const watchedPlayers = watchlist
    .map((w) => players.find((p) => p.id === w.player_id))
    .filter((p): p is Player => p !== undefined);

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
            Watchlist & In-App Alerts
          </h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4 flex flex-col gap-4">
        <div className="w-full bg-surface-container-lowest rounded-2xl p-4 shadow-[0_2px_0_0_#E9E8E4] flex items-center gap-3 text-xs">
          <span className="text-xl">🔔</span>
          <p className="text-on-surface-variant">
            Set price alert bookmarks here. When market sentiment shifts or match ratings settle, in-app alerts notify you instantly.
          </p>
        </div>

        {watchedPlayers.length === 0 ? (
          <div className="w-full bg-surface-container-lowest rounded-3xl p-8 shadow-[0_2px_0_0_#E9E8E4] flex flex-col items-center text-center gap-3 my-4">
            <span className="text-3xl">⭐</span>
            <h3 className="font-headline-md text-sm text-on-surface font-bold">
              No Watchlisted Players
            </h3>
            <p className="text-xs text-on-surface-variant max-w-xs">
              Star your favorite football athletes on the Market screen to monitor their valuations and live ratings here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {watchedPlayers.map((player) => (
              <div
                key={player.id}
                className="w-full bg-surface-container-lowest rounded-2xl p-3.5 shadow-[0_2px_0_0_#E9E8E4] flex items-center justify-between gap-3"
              >
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
                      {player.club} • Rating: ★ {player.last_match_rating.toFixed(1)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-end">
                    <PricePill price={player.current_price} size="sm" />
                    <span
                      className={`text-[10px] font-bold mt-0.5 ${
                        player.change_24h_pct >= 0 ? 'text-tertiary-container' : 'text-error'
                      }`}
                    >
                      {formatPercent(player.change_24h_pct)}
                    </span>
                  </div>

                  <button
                    onClick={() => toggleWatchlist(player.id)}
                    className="p-1.5 text-secondary-fixed-dim"
                  >
                    <span className="material-symbols-outlined text-[20px]">star</span>
                  </button>

                  <button
                    onClick={() => setSelectedPlayer(player)}
                    disabled={player.status === 'locked'}
                    className="px-2.5 py-1 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm"
                  >
                    Trade
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {selectedPlayer && (
        <TradeBottomSheet
          player={selectedPlayer}
          isOpen={true}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
};
