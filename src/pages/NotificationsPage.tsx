import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { NotificationItem } from '../lib/types';

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (data && data.length > 0) {
            setNotifications(data);
          } else {
            // Seed sample in-app activity
            setNotifications([
              {
                id: '1',
                user_id: user.id,
                title: 'Welcome Gift Credited 🧢',
                message: '10,000 Caps free starting liquidity added to your trader wallet.',
                type: 'system',
                read: false,
                created_at: new Date().toISOString(),
              },
              {
                id: '2',
                user_id: user.id,
                title: 'Matchday Lock Alert 🔒',
                message: 'Manchester City vs Arsenal has kicked off. City & Arsenal stars are locked from trading.',
                type: 'alert',
                read: true,
                created_at: new Date(Date.now() - 3600000).toISOString(),
              },
              {
                id: '3',
                user_id: user.id,
                title: 'Haaland Rating Update ★ 8.9',
                message: 'Erling Haaland scored. Base valuation adjusted +0.0525 Caps.',
                type: 'trade',
                read: true,
                created_at: new Date(Date.now() - 7200000).toISOString(),
              },
            ]);
          }
          setLoading(false);
        });
    }
  }, [user?.id]);

  const markAllRead = async () => {
    if (user?.id) {
      await supabase.from('notifications').update({ read: true }).eq('user_id', user.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
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
            Notifications & Activity
          </h1>
          <button
            onClick={markAllRead}
            className="text-[11px] font-bold text-primary hover:underline"
          >
            Read All
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4 flex flex-col gap-3">
        {notifications.length === 0 ? (
          <div className="w-full bg-surface-container-lowest rounded-3xl p-8 shadow-[0_2px_0_0_#E9E8E4] text-center my-4">
            <span className="text-3xl">📭</span>
            <p className="text-xs text-on-surface-variant mt-2">
              No new alerts. Price alerts and trade confirmations will appear here.
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`w-full rounded-2xl p-4 shadow-[0_2px_0_0_#E9E8E4] flex items-start gap-3 transition-colors ${
                n.read ? 'bg-surface-container-lowest' : 'bg-primary-fixed/20 border border-primary/20'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-lg shrink-0">
                {n.type === 'trade' ? '⚡' : n.type === 'alert' ? '🔔' : '🧢'}
              </div>

              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-headline-sm text-xs text-on-surface font-bold truncate">
                    {n.title}
                  </h4>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0 ml-2" />
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                  {n.message}
                </p>
                <span className="text-[10px] text-outline mt-1.5">
                  {new Date(n.created_at).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
};
