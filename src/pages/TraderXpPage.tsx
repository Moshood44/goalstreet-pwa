import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export const TraderXpPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [xpHistory, setXpHistory] = useState<{event_type:string;xp_amount:number;description:string;created_at:string}[]>([]);

  const xp = profile?.xp || 0;
  const streak = profile?.streak_days || 0;

  useEffect(() => {
    if (profile?.id) {
      supabase.from('xp_events').select('event_type,xp_amount,description,created_at').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(10).then(({ data }) => { if (data) setXpHistory(data); });
    }
  }, [profile?.id]);

  const tiers = [
    { name: 'Rookie', minXp: 0, maxXp: 250, badge: '🌱', perk: 'Standard 10,000 Caps Bankroll' },
    { name: 'Pro Trader', minXp: 250, maxXp: 1000, badge: '⚡', perk: 'Priority Matchday Rating Updates' },
    { name: 'Elite Scout', minXp: 1000, maxXp: 5000, badge: '🛡️', perk: 'Exclusive Squad Battle Leagues' },
    { name: 'Legend', minXp: 5000, maxXp: 10000, badge: '👑', perk: 'Permanent Hall of Fame Trophy' },
  ];

  const currentTierIndex = tiers.findIndex((t) => xp >= t.minXp && xp < t.maxXp);
  const activeTier = tiers[currentTierIndex >= 0 ? currentTierIndex : 0];
  const nextTier = tiers[currentTierIndex + 1] || tiers[tiers.length - 1];

  const progressPct = Math.min(100, ((xp - activeTier.minXp) / (activeTier.maxXp - activeTier.minXp)) * 100);

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
            Trader XP & Tier Rewards
          </h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4 flex flex-col gap-4">
        {/* Tier Hero Bento */}
        <section className="w-full bg-surface-container-lowest rounded-3xl p-6 shadow-[0_4px_16px_rgba(30,27,46,0.06),0_3px_0_0_#E9E8E4] flex flex-col items-center text-center gap-3">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-4xl shadow-inner">
            {activeTier.badge}
          </div>

          <div>
            <span className="font-label-ui text-xs text-primary font-extrabold uppercase tracking-widest">
              Active Ranking Tier
            </span>
            <h2 className="font-headline-lg text-2xl text-on-surface font-black mt-1">
              {activeTier.name}
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Earn +25 XP with every market order placed & active matchday check-ins
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full flex flex-col gap-1.5 pt-2">
            <div className="flex justify-between text-xs font-bold text-on-surface">
              <span>{xp} XP</span>
              <span className="text-on-surface-variant">{activeTier.maxXp} XP ({nextTier.name})</span>
            </div>
            <div className="w-full h-3 bg-surface-container-high rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </section>

        {/* Tier Hierarchy */}
        <section className="flex flex-col gap-2.5">
          <h3 className="font-headline-sm text-xs text-on-surface-variant font-bold uppercase tracking-wider">
            Tier Progression & Perks
          </h3>

          <div className="flex flex-col gap-2.5">
            {tiers.map((t, idx) => {
              const isCurrent = t.name === activeTier.name;
              const isUnlocked = xp >= t.minXp;

              return (
                <div
                  key={t.name}
                  className={`w-full rounded-2xl p-4 shadow-[0_2px_0_0_#E9E8E4] flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-primary-fixed/30 border-2 border-primary/50'
                      : isUnlocked
                      ? 'bg-surface-container-lowest'
                      : 'bg-surface-container-low opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className="text-2xl">{t.badge}</span>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-headline-sm text-sm text-on-surface font-bold">
                          {t.name}
                        </span>
                        {isCurrent && (
                          <span className="bg-primary text-on-primary text-[9px] font-bold px-2 py-0.5 rounded-full">
                            CURRENT
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-on-surface-variant mt-0.5">
                        {t.perk}
                      </span>
                    </div>
                  </div>

                  <span className="font-label-data-sm text-xs text-on-surface font-bold shrink-0">
                    {t.minXp}+ XP
                  </span>
                </div>
              );
            })}
          </div>
        </section>
        {/* Streak Card */}
        <section className="w-full bg-surface-container-lowest rounded-3xl p-4 shadow-[0_2px_0_0_#E9E8E4] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔥</span>
            <div>
              <span className="font-headline-sm text-sm text-on-surface font-bold">{streak} Day Streak</span>
              <p className="text-xs text-on-surface-variant">Trade daily to keep your streak alive</p>
            </div>
          </div>
          <span className="font-label-data-sm text-xs text-tertiary-container font-bold">{streak > 0 ? '+' + (streak * 5) + ' XP bonus' : 'No streak'}</span>
        </section>

        {/* Recent XP Events */}
        {xpHistory.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="font-headline-sm text-xs text-on-surface-variant font-bold uppercase tracking-wider">Recent XP Events</h3>
            {xpHistory.map((ev, i) => (
              <div key={i} className="flex items-center justify-between text-xs bg-surface-container-lowest rounded-xl px-3 py-2 shadow-sm">
                <span className="text-on-surface-variant truncate">{ev.description || ev.event_type}</span>
                <span className="font-bold text-primary ml-2">+{ev.xp_amount} XP</span>
              </div>
            ))}
          </section>
        )}

      </main>
    </div>
  );
};
