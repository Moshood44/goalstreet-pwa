import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useMarket } from '../../context/MarketContext';

export const BottomTabBar: React.FC = () => {
  const { players } = useMarket();
  const liveCount = players.filter((p) => p.status === 'locked').length;

  const tabs = [
    { to: '/', label: 'Market', icon: 'storefront' },
    { to: '/portfolio', label: 'Portfolio', icon: 'account_balance_wallet' },
    { to: '/live', label: 'Matchday', icon: 'bolt', hasLiveBadge: liveCount > 0 },
    { to: '/leaderboard', label: 'Ranks', icon: 'leaderboard' },
    { to: '/me', label: 'Me', icon: 'person' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-xl border-t border-surface-container-high pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.03)]">
      <div className="max-w-md mx-auto flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => (
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
  );
};
