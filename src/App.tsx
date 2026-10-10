import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MarketProvider } from './context/MarketContext';
import { BottomTabBar } from './components/ui/BottomTabBar';

import { WelcomePage } from './pages/WelcomePage';
import { MarketHomePage } from './pages/MarketHomePage';
import { PlayerPage } from './pages/PlayerPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { LiveTickerPage } from './pages/LiveTickerPage';
import { ProfilePage } from './pages/ProfilePage';
import { WatchlistPage } from './pages/WatchlistPage';
import { OrderHistoryPage } from './pages/OrderHistoryPage';
import { PlayerComparePage } from './pages/PlayerComparePage';
import { SquadBattlesPage } from './pages/SquadBattlesPage';
import { TraderXpPage } from './pages/TraderXpPage';
import { NotificationsPage } from './pages/NotificationsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      refetchOnWindowFocus: true,
    },
  },
});

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-surface flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-3xl bg-primary flex items-center justify-center text-3xl shadow-[0_4px_0_0_#4500D8] animate-bounce mb-3">
          🧢
        </div>
        <span className="font-headline-sm text-sm text-on-surface font-extrabold tracking-tight">
          Connecting to Goalstreet...
        </span>
      </div>
    );
  }

  if (!user) {
    return <WelcomePage />;
  }

  // Hide bottom tab bar on full-screen sub-routes
  const hideTabs =
    location.pathname.startsWith('/player/') ||
    location.pathname === '/compare' ||
    location.pathname === '/orders' ||
    location.pathname === '/watchlist' ||
    location.pathname === '/xp' ||
    location.pathname === '/notifications' ||
    location.pathname === '/battles';

  return (
    <div className="min-h-screen w-full bg-surface flex flex-col">
      <Routes>
        <Route path="/" element={<MarketHomePage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/live" element={<LiveTickerPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/me" element={<ProfilePage />} />
        <Route path="/player/:id" element={<PlayerPage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/orders" element={<OrderHistoryPage />} />
        <Route path="/compare" element={<PlayerComparePage />} />
        <Route path="/battles" element={<SquadBattlesPage />} />
        <Route path="/xp" element={<TraderXpPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="*" element={<MarketHomePage />} />
      </Routes>

      {!hideTabs && <BottomTabBar />}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MarketProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </MarketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};
export default App;
