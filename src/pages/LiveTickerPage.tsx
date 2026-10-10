import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Match, Player } from '../lib/types';
import { useMarket } from '../context/MarketContext';
import { JerseyAvatar } from '../components/ui/JerseyAvatar';
import { PricePill } from '../components/ui/PricePill';
import { formatCaps, formatPrice } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export const LiveTickerPage: React.FC = () => {
  const navigate = useNavigate();
  const { players } = useMarket();
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    supabase
      .from('matches')
      .select('*')
      .order('match_date', { ascending: false })
      .then(({ data }) => {
        if (data) setMatches(data);
      });
  }, []);

  const liveMatches = matches.filter((m) => m.status === 'live');
  const scheduledMatches = matches.filter((m) => m.status === 'scheduled');
  const finishedMatches = matches.filter((m) => m.status === 'finished');

  return (
    <div className="flex-1 w-full bg-surface pb-28">
      {/* Header */}
      <header className="sticky top-0 w-full z-30 pt-safe bg-surface/90 backdrop-blur-xl border-b border-surface-container-high/60">
        <div className="max-w-md mx-auto h-16 px-4 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="font-headline-lg text-lg text-on-surface font-extrabold tracking-tight">
              Live Matchday Ticker
            </h1>
            <span className="font-label-ui text-xs text-on-surface-variant">
              In-Play Price Lock & Rating Settlement
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-error/15 text-error text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-error animate-ping" />
            <span>LIVE</span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-3 flex flex-col gap-4">
        {/* Notice Bento */}
        <section className="w-full bg-surface-container-lowest rounded-2xl p-3.5 shadow-[0_2px_0_0_#E9E8E4] flex items-center gap-3 text-xs">
          <span className="text-xl">🔒</span>
          <p className="text-on-surface-variant leading-relaxed">
            Players are <strong>locked</strong> from trading during live fixtures. Live ratings update on-pitch performance and settle base prices post-match.
          </p>
        </section>

        {/* Live Matches Fixture List */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-sm text-sm text-on-surface font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-error" /> In-Play Fixtures ({liveMatches.length})
            </h2>
            <span className="text-[11px] text-error font-bold">Auto-Settling</span>
          </div>

          {liveMatches.map((match) => {
            const homePlayers = players.filter((p) => p.club === match.home_club);
            const awayPlayers = players.filter((p) => p.club === match.away_club);

            return (
              <div
                key={match.id}
                className="w-full bg-surface-container-lowest rounded-3xl p-4 shadow-[0_4px_16px_rgba(30,27,46,0.06),0_3px_0_0_#E9E8E4] flex flex-col gap-3.5"
              >
                {/* Scoreboard */}
                <div className="bg-surface-container-low rounded-2xl p-3 flex items-center justify-between">
                  <div className="flex flex-col items-center flex-1">
                    <span className="font-headline-sm text-xs text-on-surface font-bold text-center">
                      {match.home_club}
                    </span>
                    <span className="text-[10px] text-on-surface-variant">Home</span>
                  </div>

                  <div className="flex flex-col items-center px-4">
                    <div className="flex items-center gap-2 font-display-lg text-xl text-on-surface font-black">
                      <span>{match.home_score}</span>
                      <span className="text-outline">:</span>
                      <span>{match.away_score}</span>
                    </div>
                    <span className="text-[11px] text-error font-bold flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping" />
                      {match.current_minute}'
                    </span>
                  </div>

                  <div className="flex flex-col items-center flex-1">
                    <span className="font-headline-sm text-xs text-on-surface font-bold text-center">
                      {match.away_club}
                    </span>
                    <span className="text-[10px] text-on-surface-variant">Away</span>
                  </div>
                </div>

                {/* Locked Key Players in this match */}
                <div className="flex flex-col gap-2">
                  <span className="font-label-ui text-xs text-on-surface-variant font-bold">
                    Locked Stars & Live Ratings:
                  </span>

                  {[...homePlayers.slice(0, 3), ...awayPlayers.slice(0, 3)].map((p) => {
                    const rating = p.last_match_rating || 7.5;
                    const delta = ((p.base_price + rating / 10) / 2 - p.base_price) / p.base_price * 100;

                    return (
                      <div
                        key={p.id}
                        onClick={() => navigate(`/player/${p.id}`)}
                        className="bg-surface-container rounded-2xl p-2.5 flex items-center justify-between cursor-pointer hover:bg-surface-container-high transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <JerseyAvatar jerseyNumber={p.jersey_number} position={p.position} size="sm" />
                          <div className="flex flex-col">
                            <span className="font-headline-sm text-xs text-on-surface font-bold">
                              {p.name}
                            </span>
                            <span className="text-[10px] text-on-surface-variant">
                              {p.club} • Rating: <strong className="text-secondary">★ {rating.toFixed(1)}</strong>
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end">
                          <PricePill price={p.current_price} size="sm" />
                          <span
                            className={`text-[10px] font-bold mt-0.5 ${
                              delta >= 0 ? 'text-tertiary-container' : 'text-error'
                            }`}
                          >
                            on track for {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>

        {/* Upcoming Scheduled Fixtures */}
        <section className="flex flex-col gap-2 pt-2">
          <h3 className="font-headline-sm text-sm text-on-surface font-bold">
            Upcoming Matchdays
          </h3>

          <div className="flex flex-col gap-2">
            {scheduledMatches.map((m) => (
              <div
                key={m.id}
                className="w-full bg-surface-container-lowest rounded-2xl p-3 flex items-center justify-between shadow-[0_2px_0_0_#E9E8E4] text-xs"
              >
                <div className="flex items-center gap-2 font-medium">
                  <span className="font-bold text-on-surface">{m.home_club}</span>
                  <span className="text-on-surface-variant">vs</span>
                  <span className="font-bold text-on-surface">{m.away_club}</span>
                </div>
                <span className="font-label-ui text-[11px] text-primary font-bold bg-primary/10 px-2.5 py-1 rounded-full">
                  Locks at Kickoff
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};
