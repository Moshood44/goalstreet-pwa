import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMarket } from '../context/MarketContext';
import { formatCaps } from '../lib/utils';
import { TactileButton } from '../components/ui/TactileButton';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { portfolioNetWorth, availableLiquidity } = useMarket();

  const [copiedRecovery, setCopiedRecovery] = useState(false);

  const username = profile?.username || user?.email?.split('@')[0] || 'Striker';
  const tier = profile?.tier || 'Rookie';
  const xp = profile?.xp || 100;

  const menuItems = [
    { label: 'Watchlist & Price Alerts', icon: 'star', to: '/watchlist', badge: 'Active' },
    { label: 'Order History & Realized P&L', icon: 'receipt_long', to: '/orders' },
    { label: 'Head-to-Head Player Scout', icon: 'compare_arrows', to: '/compare' },
    { label: 'Squad Battles & Challenges', icon: 'military_tech', to: '/battles' },
    { label: 'Trader XP & Tier Rewards', icon: 'workspace_premium', to: '/xp', badge: `${xp} XP` },
    { label: 'Notifications & Activity', icon: 'notifications', to: '/notifications' },
  ];

  return (
    <div className="flex-1 w-full bg-surface pb-28">
      {/* Header */}
      <header className="sticky top-0 w-full z-30 pt-safe bg-surface/90 backdrop-blur-xl border-b border-surface-container-high/60">
        <div className="max-w-md mx-auto h-16 px-4 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="font-headline-lg text-lg text-on-surface font-extrabold tracking-tight">
              Trader Terminal & Me
            </h1>
            <span className="font-label-ui text-xs text-on-surface-variant">
              Account, Tiers & Credentials
            </span>
          </div>

          <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs">
            {tier} Tier
          </span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-3 flex flex-col gap-4">
        {/* Profile Card */}
        <section className="w-full bg-surface-container-lowest rounded-3xl p-5 shadow-[0_4px_16px_rgba(30,27,46,0.06),0_3px_0_0_#E9E8E4] flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-on-primary text-2xl font-black shadow-[0_3px_0_0_#4500D8]">
              {username[0].toUpperCase()}
            </div>

            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-headline-md text-base text-on-surface font-extrabold truncate">
                  {username}
                </h2>
                <span className="bg-secondary-fixed/50 text-on-secondary-fixed text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Verified Trader
                </span>
              </div>
              <span className="text-xs text-on-surface-variant">
                {profile?.email || 'unverified-email'}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-primary font-bold">{xp} XP Earned</span>
                <span className="text-xs text-outline">•</span>
                <span className="text-xs text-on-surface-variant">Next: Pro Tier</span>
              </div>
            </div>
          </div>

          {/* Quick Balance Grid */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-container text-xs">
            <div className="bg-surface-container-low p-3 rounded-2xl flex flex-col">
              <span className="text-on-surface-variant text-[11px]">Free Caps Balance:</span>
              <span className="font-label-data-sm text-sm text-on-surface font-bold mt-0.5">
                🧢 {formatCaps(availableLiquidity)}
              </span>
            </div>
            <div className="bg-surface-container-low p-3 rounded-2xl flex flex-col">
              <span className="text-on-surface-variant text-[11px]">Net Worth:</span>
              <span className="font-label-data-sm text-sm text-primary font-bold mt-0.5">
                🧢 {formatCaps(portfolioNetWorth)}
              </span>
            </div>
          </div>
        </section>

        {/* iPhone PWA Installation Guide Card as requested */}
        <section className="w-full bg-surface-container-lowest rounded-2xl p-4 shadow-[0_2px_0_0_#E9E8E4] flex flex-col gap-2">
          <div className="flex items-center gap-2 text-primary font-bold text-xs">
            <span className="text-base">📲</span>
            <span>Install Goalstreet on iPhone / Android</span>
          </div>
          <div className="bg-surface-container-low p-3 rounded-xl text-xs text-on-surface-variant leading-relaxed">
            <p className="font-medium text-on-surface">
              For iPhone: Tap the <strong className="text-primary">Share button 📤</strong> at the bottom of Safari, scroll down, and select <strong className="text-primary">"Add to Home Screen" ➕</strong>.
            </p>
            <p className="mt-1 text-[11px]">
              For Android: Tap the three dots menu ⋮ and choose "Install App" for full standalone matchday features.
            </p>
          </div>
        </section>

        {/* Menu Navigation Links */}
        <section className="w-full bg-surface-container-lowest rounded-3xl p-2 shadow-[0_2px_0_0_#E9E8E4] flex flex-col divide-y divide-surface-container">
          {menuItems.map((item) => (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className="flex items-center justify-between p-3.5 hover:bg-surface-container-low rounded-2xl transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-outline text-[22px]">
                  {item.icon}
                </span>
                <span className="font-headline-sm text-xs text-on-surface font-bold">
                  {item.label}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {item.badge && (
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                    {item.badge}
                  </span>
                )}
                <span className="material-symbols-outlined text-outline text-[18px]">
                  chevron_right
                </span>
              </div>
            </button>
          ))}
        </section>

        {/* Security & Sign Out */}
        <section className="flex flex-col gap-2 pt-2">
          <TactileButton
            fullWidth
            variant="surface"
            size="md"
            onClick={signOut}
          >
            <span className="material-symbols-outlined text-[18px] mr-1">logout</span>
            Sign Out of Terminal
          </TactileButton>

          <p className="text-[11px] text-center text-on-surface-variant">
            Goalstreet v1.0.0 • No real money wagering • Free fantasy exchange
          </p>
        </section>
      </main>
    </div>
  );
};
