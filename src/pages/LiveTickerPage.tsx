import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Match, Player } from '../lib/types';
import { useMarket } from '../context/MarketContext';
import { JerseyAvatar } from '../components/ui/JerseyAvatar';
import { PricePill } from '../components/ui/PricePill';
import { formatPrice } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

interface FixtureLinkItem {
  id: string;
  worldcup26_event_id: string;
  home_club: string;
  away_club: string;
  kickoff_time: string;
  status: 'scheduled' | 'live' | 'finished';
  state: 'pre' | 'in' | 'post';
  display_clock: string;
  home_score: number;
  away_score: number;
  last_synced_at: string;
}

export const LiveTickerPage: React.FC = () => {
  const navigate = useNavigate();
  const { players } = useMarket();
  const [fixtures, setFixtures] = useState<FixtureLinkItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFixtures = async () => {
    // Read directly from real fixture_link / matches table populated by worldcup26 provider
    const { data: linkData } = await supabase
      .from('fixture_link')
      .select('*')
      .order('kickoff_time', { ascending: true });

    if (linkData && linkData.length > 0) {
      setFixtures(linkData as FixtureLinkItem[]);
    } else {
      // Fallback to matches table
      const { data: matchData } = await supabase
        .from('matches')
        .select('*')
        .order('match_date', { ascending: true });

      if (matchData) {
        setFixtures(
          matchData.map((m: any) => ({
            id: m.id,
            worldcup26_event_id: m.worldcup26_event_id || m.id,
            home_club: m.home_club,
            away_club: m.away_club,
            kickoff_time: m.match_date,
            status: m.status,
            state: m.status === 'live' ? 'in' : m.status === 'finished' ? 'post' : 'pre',
            display_clock: m.display_clock || (m.current_minute ? `${m.current_minute}'` : "0'"),
            home_score: m.home_score || 0,
            away_score: m.away_score || 0,
            last_synced_at: m.last_synced_at || new Date().toISOString(),
          }))
        );
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFixtures();
    const interval = setInterval(fetchFixtures, 10000);
    return () => clearInterval(interval);
  }, []);

  // Strict order: Live matches first, then upcoming scheduled today/next, then finished results
  const liveMatches = fixtures.filter((f) => f.state === 'in' || f.status === 'live');
  const upcomingMatches = fixtures.filter((f) => f.state === 'pre' && f.status === 'scheduled');
  const finishedMatches = fixtures.filter((f) => f.state === 'post' || f.status === 'finished');

  const isDelayed = (syncedAt: string) => {
    if (!syncedAt) return false;
    const diffMs = Date.now() - new Date(syncedAt).getTime();
    return diffMs > 5 * 60 * 1000;
  };

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
              worldcup26.ir Live Scores & Opta/FPL Ratings
            </span>
          </div>

          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
            liveMatches.length > 0 ? 'bg-error/15 text-error' : 'bg-surface-container text-on-surface-variant'
          }`}>
            {liveMatches.length > 0 && <span className="w-2 h-2 rounded-full bg-error animate-ping" />}
            <span>{liveMatches.length > 0 ? `${liveMatches.length} LIVE` : 'FULL-TIME'}</span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-3 flex flex-col gap-4">
        {/* Notice Bento */}
        <section className="w-full bg-surface-container-lowest rounded-2xl p-3.5 shadow-[0_2px_0_0_#E9E8E4] flex items-center gap-3 text-xs">
          <span className="text-xl">🔒</span>
          <p className="text-on-surface-variant leading-relaxed">
            Players in live fixtures are <strong>locked</strong>. Real provisional ratings reflect in-game performance and reconcile to final ratings post-match.
          </p>
        </section>

        {/* 1. Live Matches First */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-sm text-sm text-on-surface font-bold flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${liveMatches.length > 0 ? 'bg-error animate-ping' : 'bg-outline'}`} />
              In-Play Fixtures ({liveMatches.length})
            </h2>
            <span className="text-[11px] text-on-surface-variant font-medium">Real-Time Clock</span>
          </div>

          {liveMatches.length === 0 ? (
            <div className="w-full bg-surface-container-lowest rounded-2xl p-6 text-center text-xs text-on-surface-variant shadow-[0_2px_0_0_#E9E8E4]">
              No live matches right now. Premier League action resumes on the scheduled kickoff dates below.
            </div>
          ) : (
            liveMatches.map((match) => {
              const homePlayers = players.filter((p) => p.club === match.home_club);
              const awayPlayers = players.filter((p) => p.club === match.away_club);
              const delayed = isDelayed(match.last_synced_at);

              return (
                <div
                  key={match.id}
                  className="w-full bg-surface-container-lowest rounded-3xl p-4 shadow-[0_4px_16px_rgba(30,27,46,0.06),0_3px_0_0_#E9E8E4] flex flex-col gap-3.5 border-l-4 border-error"
                >
                  {/* Delayed Banner if > 5m */}
                  {delayed && (
                    <span className="text-[10px] text-secondary font-bold bg-secondary/10 px-2 py-0.5 rounded-md self-start">
                      Delayed, last updated {new Date(match.last_synced_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}

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
                        {match.display_clock || "Live"}
                      </span>
                    </div>

                    <div className="flex flex-col items-center flex-1">
                      <span className="font-headline-sm text-xs text-on-surface font-bold text-center">
                        {match.away_club}
                      </span>
                      <span className="text-[10px] text-on-surface-variant">Away</span>
                    </div>
                  </div>

                  {/* Real Provisional Ratings */}
                  <div className="flex flex-col gap-2">
                    <span className="font-label-ui text-xs text-on-surface-variant font-bold flex items-center justify-between">
                      <span>Locked Athletes (Provisional Ratings):</span>
                      <span className="text-[10px] text-primary font-semibold">Live Opta/FPL</span>
                    </span>

                    {[...homePlayers.slice(0, 3), ...awayPlayers.slice(0, 3)].map((p) => {
                      const rating = p.last_match_rating || 6.5;
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
                                {p.club} • <strong className="text-secondary font-bold">★ {rating.toFixed(1)} Provisional</strong>
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
            })
          )}
        </section>

        {/* 2. Upcoming Scheduled Fixtures */}
        <section className="flex flex-col gap-2 pt-2">
          <h3 className="font-headline-sm text-sm text-on-surface font-bold">
            Upcoming Matchdays (Scheduled)
          </h3>

          <div className="flex flex-col gap-2">
            {upcomingMatches.length === 0 ? (
              <span className="text-xs text-on-surface-variant italic">No upcoming matches scheduled this week.</span>
            ) : (
              upcomingMatches.slice(0, 8).map((m) => (
                <div
                  key={m.id}
                  className="w-full bg-surface-container-lowest rounded-2xl p-3 flex items-center justify-between shadow-[0_2px_0_0_#E9E8E4] text-xs"
                >
                  <div className="flex items-center gap-2 font-medium">
                    <span className="font-bold text-on-surface">{m.home_club}</span>
                    <span className="text-on-surface-variant">vs</span>
                    <span className="font-bold text-on-surface">{m.away_club}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-on-surface-variant font-mono">
                      {new Date(m.kickoff_time).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="font-label-ui text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full">
                      Locks at Kickoff
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 3. Latest Finished Results */}
        {finishedMatches.length > 0 && (
          <section className="flex flex-col gap-2 pt-2">
            <h3 className="font-headline-sm text-sm text-on-surface font-bold">
              Latest Match Results (Final)
            </h3>

            <div className="flex flex-col gap-2">
              {finishedMatches.slice(0, 6).map((m) => (
                <div
                  key={m.id}
                  className="w-full bg-surface-container-lowest rounded-2xl p-3 flex items-center justify-between shadow-[0_2px_0_0_#E9E8E4] text-xs"
                >
                  <div className="flex items-center gap-2 font-medium">
                    <span className="font-bold text-on-surface">{m.home_club}</span>
                    <span className="font-bold text-on-surface px-1 bg-surface-container rounded">{m.home_score} - {m.away_score}</span>
                    <span className="font-bold text-on-surface">{m.away_club}</span>
                  </div>
                  <span className="text-[10px] font-bold text-tertiary-container bg-tertiary-container/10 px-2 py-0.5 rounded-full">
                    Final Settled
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
