import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Challenge } from '../lib/types';
import { TactileButton } from '../components/ui/TactileButton';

export const SquadBattlesPage: React.FC = () => {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [joined, setJoined] = useState<Record<string, boolean>>({});

  useEffect(() => {
    supabase
      .from('challenges')
      .select('*')
      .order('start_time', { ascending: true })
      .then(({ data }) => {
        if (data) setChallenges(data);
      });
  }, []);

  const handleJoin = (id: string) => {
    setJoined((prev) => ({ ...prev, [id]: true }));
  };

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
            Squad Battles & Leagues
          </h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4 flex flex-col gap-4">
        {/* Info Banner */}
        <section className="w-full bg-surface-container-lowest rounded-2xl p-4 shadow-[0_2px_0_0_#E9E8E4] flex items-center gap-3 text-xs">
          <span className="text-2xl">🛡️</span>
          <div>
            <h2 className="font-bold text-on-surface">No-Stake Challenges</h2>
            <p className="text-on-surface-variant text-[11px] mt-0.5">
              Zero entry fees. Compete purely for tactical bragging rights, seasonal trophies, and trader tier badges.
            </p>
          </div>
        </section>

        {/* Challenges List */}
        <section className="flex flex-col gap-3">
          <h2 className="font-headline-sm text-xs text-on-surface-variant font-bold uppercase tracking-wider">
            Active Challenges ({challenges.length})
          </h2>

          <div className="flex flex-col gap-3">
            {challenges.map((c) => {
              const isJoined = joined[c.id];

              return (
                <div
                  key={c.id}
                  className="w-full bg-surface-container-lowest rounded-3xl p-5 shadow-[0_4px_16px_rgba(30,27,46,0.06),0_3px_0_0_#E9E8E4] flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🏆</span>
                        <h3 className="font-headline-sm text-sm text-on-surface font-bold">
                          {c.title}
                        </h3>
                      </div>
                      <p className="font-body-sm text-xs text-on-surface-variant mt-1">
                        {c.description}
                      </p>
                    </div>

                    <span className="font-label-ui text-[10px] text-tertiary-container font-bold bg-tertiary-container/10 px-2.5 py-1 rounded-full shrink-0">
                      Live Cup
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-surface-container-low px-3 py-2 rounded-xl text-xs">
                    <span className="text-on-surface-variant">Prize Trophy:</span>
                    <span className="font-bold text-primary">{c.trophy_badge}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-on-surface-variant">
                      Entry: <strong>Free (0 🧢)</strong>
                    </span>

                    <TactileButton
                      size="sm"
                      variant={isJoined ? 'surface' : 'primary'}
                      onClick={() => handleJoin(c.id)}
                    >
                      {isJoined ? '✓ Enrolled in League' : 'Join Challenge'}
                    </TactileButton>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};
