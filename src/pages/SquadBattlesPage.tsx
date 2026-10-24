import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Challenge } from '../lib/types';
import { TactileButton } from '../components/ui/TactileButton';
import { formatPercent } from '../lib/utils';

interface ChallengeEntry {
  rank_num: number;
  user_id: string;
  username: string;
  return_pct: number;
  current_value: number;
}

export const SquadBattlesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [leaderboards, setLeaderboards] = useState<Record<string, ChallengeEntry[]>>({});
  const [codeInput, setCodeInput] = useState('');
  const [joinMsg, setJoinMsg] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    supabase
      .from('challenges')
      .select('*')
      .order('start_time', { ascending: true })
      .then(({ data }) => { if (data) setChallenges(data); });

    // load which challenges the user has already joined
    if (user?.id) {
      supabase
        .from('challenge_entries')
        .select('challenge_id')
        .eq('user_id', user.id)
        .then(({ data }) => {
          if (data) setJoinedIds(new Set(data.map((e) => e.challenge_id)));
        });
    }
  }, [user?.id]);

  const loadLeaderboard = async (challengeId: string) => {
    if (leaderboards[challengeId]) return;
    const { data } = await supabase.rpc('get_challenge_leaderboard', { p_challenge_id: challengeId });
    if (data) setLeaderboards((prev) => ({ ...prev, [challengeId]: data }));
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      loadLeaderboard(id);
    }
  };

  const handleJoinByCode = async () => {
    if (!codeInput.trim() || !user) return;
    setJoining(true);
    setJoinMsg('');
    const { data, error } = await supabase.rpc('join_challenge', { p_code: codeInput.trim() });
    if (error || data?.error) {
      setJoinMsg(`❌ ${data?.error || error?.message}`);
    } else {
      setJoinedIds((prev) => new Set([...prev, data.challenge_id]));
      setJoinMsg(`✅ Joined: ${data.title}`);
      setCodeInput('');
      // Refresh challenges list to include newly joined
      const { data: fresh } = await supabase.from('challenges').select('*').order('start_time');
      if (fresh) setChallenges(fresh);
    }
    setJoining(false);
  };

  const handleJoinOpen = async (challengeId: string) => {
    if (!user) return;
    const { data } = await supabase.rpc('join_challenge', { p_code: challenges.find(c => c.id === challengeId)?.code || '' });
    // For open challenges, insert directly
    await supabase.from('challenge_entries').upsert({ challenge_id: challengeId, user_id: user.id }, { onConflict: 'challenge_id,user_id' });
    setJoinedIds((prev) => new Set([...prev, challengeId]));
  };

  return (
    <div className="min-h-screen w-full bg-surface pb-28">
      <header className="sticky top-0 w-full z-30 pt-safe bg-surface/90 backdrop-blur-xl border-b border-surface-container-high/60">
        <div className="max-w-2xl mx-auto h-14 px-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-on-surface">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <h1 className="font-headline-sm text-sm text-on-surface font-bold">Challenges & Private Leagues</h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 flex flex-col gap-4">
        {/* Info Banner */}
        <section className="w-full bg-surface-container-lowest rounded-2xl p-4 shadow-[0_2px_0_0_#E9E8E4] flex items-center gap-3 text-xs">
          <span className="text-2xl">🛡️</span>
          <div>
            <h2 className="font-bold text-on-surface">No-Stake Challenges</h2>
            <p className="text-on-surface-variant text-[11px] mt-0.5">
              Zero entry fees. Compete for trophies and tier badges. Ranked by % return from when you joined.
            </p>
          </div>
        </section>

        {/* Join by Code */}
        <section className="w-full bg-surface-container-lowest rounded-2xl p-4 shadow-[0_2px_0_0_#E9E8E4] flex flex-col gap-2">
          <span className="font-headline-sm text-xs text-on-surface font-bold uppercase tracking-wider">Join Private League by Code</span>
          <div className="flex gap-2">
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="e.g. A1B2C3"
              maxLength={6}
              className="flex-1 bg-surface-container rounded-xl px-3 py-2 text-sm font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 uppercase tracking-widest"
            />
            <TactileButton size="sm" variant="primary" onClick={handleJoinByCode} disabled={joining || codeInput.length < 4}>
              {joining ? '...' : 'Join'}
            </TactileButton>
          </div>
          {joinMsg && <span className="text-xs font-medium text-on-surface-variant">{joinMsg}</span>}
        </section>

        {/* Challenges List */}
        <section className="flex flex-col gap-3">
          <h2 className="font-headline-sm text-xs text-on-surface-variant font-bold uppercase tracking-wider">
            Active Challenges ({challenges.length})
          </h2>

          {challenges.length === 0 && (
            <div className="w-full bg-surface-container-lowest rounded-3xl p-8 shadow-[0_2px_0_0_#E9E8E4] text-center">
              <span className="text-3xl">🏆</span>
              <p className="text-xs text-on-surface-variant mt-2">No active challenges yet. Check back after gameweek starts.</p>
            </div>
          )}

          {challenges.map((c) => {
            const isJoined = joinedIds.has(c.id);
            const isExpanded = expandedId === c.id;
            const lb = leaderboards[c.id] || [];
            const myEntry = lb.find((e) => e.user_id === user?.id);

            return (
              <div key={c.id} className="w-full bg-surface-container-lowest rounded-3xl p-5 shadow-[0_4px_16px_rgba(30,27,46,0.06),0_3px_0_0_#E9E8E4] flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🏆</span>
                      <h3 className="font-headline-sm text-sm text-on-surface font-bold">{c.title}</h3>
                    </div>
                    <p className="font-body-sm text-xs text-on-surface-variant mt-1">{c.description}</p>
                    {c.code && (
                      <span className="mt-1 font-mono text-[10px] text-on-surface-variant">Code: <strong className="text-primary">{c.code}</strong></span>
                    )}
                  </div>
                  <span className="font-label-ui text-[10px] text-tertiary-container font-bold bg-tertiary-container/10 px-2.5 py-1 rounded-full shrink-0">
                    {c.status === 'active' ? 'Live Cup' : c.status}
                  </span>
                </div>

                <div className="flex items-center justify-between bg-surface-container-low px-3 py-2 rounded-xl text-xs">
                  <span className="text-on-surface-variant">Trophy:</span>
                  <span className="font-bold text-primary">{c.trophy_badge}</span>
                </div>

                {isJoined && myEntry && (
                  <div className="flex items-center justify-between text-xs bg-primary/10 px-3 py-2 rounded-xl">
                    <span className="text-on-surface font-medium">Your return:</span>
                    <span className={`font-black ${myEntry.return_pct >= 0 ? 'text-tertiary-container' : 'text-error'}`}>
                      {formatPercent(myEntry.return_pct)} (#{myEntry.rank_num})
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-on-surface-variant">
                    Entry: <strong>Free (0 🧢)</strong>
                  </span>
                  <div className="flex gap-2">
                    {isJoined && (
                      <TactileButton size="sm" variant="surface" onClick={() => toggleExpand(c.id)}>
                        {isExpanded ? 'Hide Board' : 'Rankings'}
                      </TactileButton>
                    )}
                    <TactileButton
                      size="sm"
                      variant={isJoined ? 'surface' : 'primary'}
                      onClick={() => isJoined ? toggleExpand(c.id) : handleJoinOpen(c.id)}
                    >
                      {isJoined ? '✓ Enrolled' : 'Join Challenge'}
                    </TactileButton>
                  </div>
                </div>

                {/* Inline Leaderboard */}
                {isExpanded && (
                  <div className="flex flex-col gap-1.5 pt-1 border-t border-surface-container">
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">League Table</span>
                    {lb.length === 0 && <p className="text-xs text-on-surface-variant">No entries yet.</p>}
                    {lb.map((entry) => (
                      <div key={entry.user_id} className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs ${entry.user_id === user?.id ? 'bg-primary/10 font-bold' : 'bg-surface-container-low'}`}>
                        <span className="text-on-surface-variant w-6">#{entry.rank_num}</span>
                        <span className="flex-1 font-medium text-on-surface truncate">{entry.username}{entry.user_id === user?.id ? ' (You)' : ''}</span>
                        <span className={`font-bold ${entry.return_pct >= 0 ? 'text-tertiary-container' : 'text-error'}`}>
                          {formatPercent(entry.return_pct)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
};
