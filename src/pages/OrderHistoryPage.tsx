import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Order } from '../lib/types';
import { formatCaps, formatPrice } from '../lib/utils';
import { JerseyAvatar } from '../components/ui/JerseyAvatar';

export const OrderHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      supabase
        .from('orders')
        .select('*, player:players(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (data) setOrders(data);
          setLoading(false);
        });
    }
  }, [user?.id]);

  const totalVolume = orders.reduce((acc, o) => acc + parseFloat(o.gross_amount as any || 0), 0);
  const totalFees = orders.reduce((acc, o) => acc + parseFloat(o.fee as any || 0), 0);

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
            Order History & P&L Ledger
          </h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4 flex flex-col gap-4">
        {/* Ledger Summary Bento */}
        <section className="w-full bg-surface-container-lowest rounded-3xl p-4 shadow-[0_4px_16px_rgba(30,27,46,0.06),0_3px_0_0_#E9E8E4] grid grid-cols-3 gap-2 text-center text-xs">
          <div className="flex flex-col items-center">
            <span className="text-on-surface-variant text-[11px]">Total Filled:</span>
            <span className="font-display-lg text-sm text-on-surface font-bold mt-0.5">
              {orders.length} Orders
            </span>
          </div>
          <div className="flex flex-col items-center border-x border-surface-container px-1">
            <span className="text-on-surface-variant text-[11px]">Gross Volume:</span>
            <span className="font-display-lg text-sm text-primary font-bold mt-0.5 truncate w-full">
              🧢 {formatCaps(totalVolume, 0)}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-on-surface-variant text-[11px]">Fees (0.5%):</span>
            <span className="font-display-lg text-sm text-secondary font-bold mt-0.5 truncate w-full">
              🧢 {formatCaps(totalFees, 1)}
            </span>
          </div>
        </section>

        {/* Orders List */}
        <section className="flex flex-col gap-2.5">
          <h2 className="font-headline-sm text-xs text-on-surface-variant font-bold uppercase tracking-wider">
            Execution Log
          </h2>

          {orders.length === 0 ? (
            <div className="w-full bg-surface-container-lowest rounded-3xl p-8 shadow-[0_2px_0_0_#E9E8E4] text-center my-4">
              <span className="text-3xl">📜</span>
              <p className="text-xs text-on-surface-variant mt-2">
                No orders executed yet. Buy or sell shares to log trades on the atomic ledger.
              </p>
            </div>
          ) : (
            orders.map((order) => {
              const isBuy = order.side === 'BUY';
              const player = order.player;

              return (
                <div
                  key={order.id}
                  className="w-full bg-surface-container-lowest rounded-2xl p-3.5 shadow-[0_2px_0_0_#E9E8E4] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {player && (
                      <JerseyAvatar
                        jerseyNumber={player.jersey_number}
                        position={player.position}
                        size="md"
                      />
                    )}
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                            isBuy
                              ? 'bg-tertiary-container/15 text-tertiary-container'
                              : 'bg-secondary-container/30 text-on-secondary-fixed'
                          }`}
                        >
                          {order.side}
                        </span>
                        <span className="font-headline-sm text-xs text-on-surface font-bold truncate">
                          {player?.name || 'Player'}
                        </span>
                      </div>
                      <span className="text-[11px] text-on-surface-variant mt-0.5">
                        {order.shares.toLocaleString()} shares @ 🧢 {formatPrice(order.price)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="font-label-ticker text-xs text-on-surface font-bold">
                      🧢 {formatCaps(order.net_amount)}
                    </span>
                    <span className="text-[10px] text-outline">
                      Fee: 🧢 {formatCaps(order.fee, 2)}
                    </span>
                    <span className="text-[9px] text-on-surface-variant mt-0.5">
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
};
