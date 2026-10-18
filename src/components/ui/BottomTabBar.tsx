import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn, formatCaps } from '../../lib/utils';
import { useMarket } from '../../context/MarketContext';
import { useAuth } from '../../context/AuthContext';

export const BottomTabBar: React.FC = () => {
  const { players, availableLiquidity } = useMarket();
  const { profile } = useAuth();
  const liveCount = players.filter((p) => p.status === 'locked').length;

  const mainTabs = [
    { to: '/', label: 'Market', icon: 'storefront' },
    { to: '/portfolio', label: 'Portfolio', icon: 'account_balance_wallet' },
    { to: '/live', label: 'Matchday', icon: 'bolt', hasLiveBadge: liveCount > 0 },
    { to: '/leaderboard', label: 'Ranks', icon: 'leaderboard' },
    { to: '/me', label: 'Me', icon: 'person' },
  ];

  const extendedLinks = [
    { to: '/watchlist', label: 'Watchlist', icon: 'star' },
    { to: '/orders', label: 'Order History', icon: 'receipt_long' },
    { to: '/battles', label: 'Challenges', icon: 'swords' },
    { to: '/xp', label: 'Trader XP', icon: 'military_tech' },
    { to: '/notifications', label: 'Alerts', icon: 'notifications' },
  ];

  return (
    <>
      {/* 1. Mobile Bottom Bar (< 768px) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-xl border-t border-surface-container-high pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.03)]">
        <div className="max-w-md mx-auto flex items-center justify-around h-16 px-2">
          {mainTabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center flex-1 py-1 transition-all relative select-none rounded-xl active:scale-95',
                  isActive
                    ? 'text-primary font-bold'
                    : 'text-on-surface-variant hover:text-on-surface font-medium'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative flex items-center justify-center">
                    <span
                      className={cn(
                        'material-symbols-outlined text-[24px] transition-transform',
                        isActive && 'scale-110 font-bold'
                      )}
                    >
                      {tab.icon}
                    </span>
                    {tab.hasLiveBadge && (
                      <span className="absolute -top-1 -right-2 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-error"></span>
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] tracking-tight mt-0.5">{tab.label}</span>
                  {isActive && (
                    <span className="absolute bottom-1 w-5 h-1 bg-primary rounded-full" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* 2. Tablet Navigation Rail (768px - 1199px) */}
      <aside className="hidden md:flex xl:hidden fixed top-0 left-0 bottom-0 w-20 z-40 bg-surface/95 backdrop-blur-xl border-r border-surface-container-high flex-col items-center py-5 justify-between select-none">
        <div className="flex flex-col items-center gap-6 w-full">
          {/* Logo Icon */}
          <NavLink to="/" className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-2xl shadow-[0_3px_0_0_#4500D8] active:scale-95 transition-transform">
            🧢
          </NavLink>

          {/* Nav Items */}
          <div className="flex flex-col items-center gap-2 w-full px-2">
            {[...mainTabs, ...extendedLinks.slice(0, 2)].map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  cn(
                    'w-14 h-12 rounded-2xl flex flex-col items-center justify-center relative transition-all',
                    isActive
                      ? 'bg-primary-container text-on-primary font-bold shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="material-symbols-outlined text-[22px]">
                      {tab.icon}
                    </span>
                    <span className="text-[9px] font-bold tracking-tight">
                      {tab.label}
                    </span>
                    {'hasLiveBadge' in tab && tab.hasLiveBadge && (
                      <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-error animate-ping" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>

        {/* User / Admin pill */}
        <div className="flex flex-col items-center gap-2">
          {profile?.is_admin && (
            <NavLink
              to="/admin/system-status"
              className="w-10 h-10 rounded-xl bg-tertiary-container/20 text-tertiary flex items-center justify-center text-sm"
              title="System Status"
            >
              ⚙️
            </NavLink>
          )}
          <NavLink to="/me" className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-xs font-bold text-on-surface">
            {profile?.username?.charAt(0).toUpperCase() || 'U'}
          </NavLink>
        </div>
      </aside>

      {/* 3. Desktop Left Sidebar Navigation (1200px+) */}
      <aside className="hidden xl:flex fixed top-0 left-0 bottom-0 w-64 z-40 bg-surface/95 backdrop-blur-xl border-r border-surface-container-high flex-col py-6 px-4 justify-between select-none">
        <div className="flex flex-col gap-6">
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-xl shadow-[0_3px_0_0_#4500D8]">
              🧢
            </div>
            <div className="flex flex-col">
              <span className="font-display-lg text-lg text-on-surface font-black tracking-tight leading-none">
                Goalstreet
              </span>
              <span className="font-label-ui text-[10px] text-on-surface-variant font-bold uppercase tracking-wider mt-1">
                Football Stock Market
              </span>
            </div>
          </div>

          {/* Quick Balance Bento */}
          <div className="bg-surface-container-lowest rounded-2xl p-3.5 shadow-[0_2px_0_0_#E9E8E4] flex flex-col gap-1">
            <span className="font-label-ui text-[11px] text-on-surface-variant font-bold">
              Available Cash
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm">🧢</span>
              <span className="font-display-lg text-lg text-on-surface font-extrabold">
                {formatCaps(availableLiquidity)}
              </span>
              <span className="text-[10px] text-on-surface-variant font-medium">Caps</span>
            </div>
          </div>

          {/* Primary Navigation Links */}
          <nav className="flex flex-col gap-1">
            <span className="font-label-ui text-[10px] text-on-surface-variant font-bold px-3 py-1 uppercase tracking-wider">
              Menu
            </span>
            {mainTabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  cn(
                    'h-11 px-3.5 rounded-2xl flex items-center justify-between font-headline-sm text-xs font-bold transition-all',
                    isActive
                      ? 'bg-primary-container text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[20px]">
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                </div>
                {tab.hasLiveBadge && (
                  <span className="px-2 py-0.5 rounded-full bg-error text-on-error text-[10px] font-bold animate-pulse">
                    LIVE
                  </span>
                )}
              </NavLink>
            ))}

            <span className="font-label-ui text-[10px] text-on-surface-variant font-bold px-3 pt-3 py-1 uppercase tracking-wider">
              More Features
            </span>
            {extendedLinks.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  cn(
                    'h-10 px-3.5 rounded-2xl flex items-center gap-3 font-headline-sm text-xs font-semibold transition-all',
                    isActive
                      ? 'bg-primary-container text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  )
                }
              >
                <span className="material-symbols-outlined text-[19px]">
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </NavLink>
            ))}

            {profile?.is_admin && (
              <NavLink
                to="/admin/system-status"
                className={({ isActive }) =>
                  cn(
                    'h-10 px-3.5 rounded-2xl flex items-center gap-3 font-headline-sm text-xs font-semibold transition-all mt-2',
                    isActive
                      ? 'bg-tertiary-container text-on-tertiary shadow-sm'
                      : 'text-tertiary hover:bg-tertiary-container/10'
                  )
                }
              >
                <span className="material-symbols-outlined text-[19px]">
                  settings
                </span>
                <span>System Status</span>
              </NavLink>
            )}
          </nav>
        </div>

        {/* User Footer Profile */}
        <div className="bg-surface-container-low rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
              {profile?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-xs text-on-surface font-bold truncate max-w-[110px]">
                {profile?.username || 'Trader'}
              </span>
              <span className="text-[10px] text-on-surface-variant font-medium">
                {profile?.tier || 'Rookie'} Trader
              </span>
            </div>
          </div>
          <NavLink to="/me" className="text-on-surface-variant hover:text-on-surface text-xs font-bold">
            Edit
          </NavLink>
        </div>
      </aside>
    </>
  );
};
