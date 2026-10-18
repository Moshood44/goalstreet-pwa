import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface SystemStatusData {
  last_fpl_fetch: string | null;
  last_settled_fixture: {
    match_id?: string;
    fixture_id?: string;
    rating?: number;
    settled_at?: string;
    player_name?: string;
  } | null;
  matchday_window_active: boolean;
  api_football_calls_today: number;
  cron_health: Array<{
    jobname: string;
    status: string;
    return_message: string;
    start_time: string;
    end_time: string;
  }>;
  timestamp: string;
}

export const SystemStatusPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SystemStatusData | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    async function loadStatus() {
      setLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();

        if (!profile?.is_admin) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        setIsAdmin(true);

        const { data, error: rpcError } = await supabase.rpc('get_system_status');
        if (rpcError) throw rpcError;
        setStatus(data as SystemStatusData);
      } catch (err: any) {
        setError(err.message || 'Failed to load system status');
      } finally {
        setLoading(false);
      }
    }

    loadStatus();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 w-full bg-surface flex items-center justify-center p-6">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="flex-1 w-full bg-surface p-6 flex flex-col items-center justify-center text-center gap-3">
        <span className="text-4xl">🔒</span>
        <h2 className="font-headline-md text-base text-on-surface font-bold">Admin Privileges Required</h2>
        <p className="text-xs text-on-surface-variant max-w-xs">
          Set <code className="bg-surface-container px-1 py-0.5 rounded text-primary">profiles.is_admin = true</code> in SQL for your user profile to access this dashboard.
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-2 px-4 py-2 rounded-xl bg-primary-container text-on-primary text-xs font-bold"
        >
          Return to Market
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-surface pb-28">
      <header className="sticky top-0 w-full z-30 pt-safe bg-surface/90 backdrop-blur-xl border-b border-surface-container-high/60">
        <div className="max-w-2xl mx-auto h-16 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/profile')} className="text-on-surface text-sm font-bold">
              ←
            </button>
            <h1 className="font-headline-lg text-lg text-on-surface font-extrabold tracking-tight">
              System Status
            </h1>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-tertiary-container/15 text-tertiary text-xs font-bold">
            Owner Only
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 flex flex-col gap-4">
        {error && (
          <div className="p-3 rounded-2xl bg-error/10 border border-error/20 text-error text-xs font-medium">
            {error}
          </div>
        )}

        {/* Overview Bento Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-[0_2px_0_0_#E9E8E4] flex flex-col gap-1">
            <span className="text-xs text-on-surface-variant font-medium">Matchday Window</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2.5 h-2.5 rounded-full ${status?.matchday_window_active ? 'bg-error animate-ping' : 'bg-outline'}`} />
              <span className="font-headline-sm text-sm text-on-surface font-bold">
                {status?.matchday_window_active ? 'Active (Locked)' : 'Inactive (Normal)'}
              </span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-[0_2px_0_0_#E9E8E4] flex flex-col gap-1">
            <span className="text-xs text-on-surface-variant font-medium">API-Football (Today)</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="font-display-lg text-xl text-on-surface font-extrabold">
                {status?.api_football_calls_today ?? 0}
              </span>
              <span className="text-xs text-on-surface-variant">/ 90 calls</span>
            </div>
          </div>
        </div>

        {/* Last FPL Fetch */}
        <section className="bg-surface-container-lowest rounded-2xl p-4 shadow-[0_2px_0_0_#E9E8E4] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-headline-sm text-xs text-on-surface font-bold">Last FPL Sync</span>
            <span className="text-[11px] text-tertiary font-bold">Auto-synced</span>
          </div>
          <span className="text-xs font-mono text-on-surface-variant">
            {status?.last_fpl_fetch ? new Date(status.last_fpl_fetch).toLocaleString() : 'Never'}
          </span>
        </section>

        {/* Last Settled Fixture */}
        <section className="bg-surface-container-lowest rounded-2xl p-4 shadow-[0_2px_0_0_#E9E8E4] flex flex-col gap-2">
          <span className="font-headline-sm text-xs text-on-surface font-bold">Last Settled Fixture</span>
          {status?.last_settled_fixture ? (
            <div className="flex flex-col gap-1 text-xs">
              <span className="text-on-surface font-bold">
                {status.last_settled_fixture.player_name || 'Player'} • ★ {status.last_settled_fixture.rating}
              </span>
              <span className="text-on-surface-variant text-[11px] font-mono">
                Settled: {status.last_settled_fixture.settled_at ? new Date(status.last_settled_fixture.settled_at).toLocaleString() : 'N/A'}
              </span>
            </div>
          ) : (
            <span className="text-xs text-on-surface-variant italic">No settled fixtures yet this season</span>
          )}
        </section>

        {/* Cron Job Health */}
        <section className="bg-surface-container-lowest rounded-2xl p-4 shadow-[0_2px_0_0_#E9E8E4] flex flex-col gap-3">
          <span className="font-headline-sm text-xs text-on-surface font-bold">Recent pg_cron Job Runs</span>
          <div className="flex flex-col gap-2">
            {(status?.cron_health || []).map((run, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-surface-container-low text-xs">
                <div className="flex flex-col">
                  <span className="font-bold text-on-surface">{run.jobname}</span>
                  <span className="text-[10px] text-on-surface-variant font-mono">
                    {new Date(run.start_time).toLocaleTimeString()}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                  run.status === 'succeeded' ? 'bg-tertiary-container/20 text-tertiary' : 'bg-error/20 text-error'
                }`}>
                  {run.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};
