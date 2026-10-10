import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Player, Holding, WatchlistItem } from '../lib/types';
import { useAuth } from './AuthContext';

interface MarketContextType {
  players: Player[];
  priceDirections: Record<string, 'up' | 'down' | 'same'>;
  holdings: Holding[];
  watchlist: WatchlistItem[];
  loading: boolean;
  portfolioNetWorth: number;
  availableLiquidity: number;
  totalHoldingsValue: number;
  refreshMarket: () => Promise<void>;
  toggleWatchlist: (playerId: string) => Promise<boolean>;
  isWatchlisted: (playerId: string) => boolean;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

export const MarketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, refreshProfile } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [priceDirections, setPriceDirections] = useState<Record<string, 'up' | 'down' | 'same'>>({});
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const prevPricesRef = useRef<Record<string, number>>({});

  const fetchMarketData = async () => {
    try {
      // 1. Fetch Market Snapshot
      const { data: snapshotData, error: snapErr } = await supabase.rpc('get_market_snapshot');
      if (!snapErr && snapshotData) {
        const newDirections: Record<string, 'up' | 'down' | 'same'> = {};

        const formattedPlayers: Player[] = snapshotData.map((p: any) => {
          const currentPrice = parseFloat(p.current_price);
          const prevPrice = prevPricesRef.current[p.id];

          if (prevPrice !== undefined) {
            if (currentPrice > prevPrice) newDirections[p.id] = 'up';
            else if (currentPrice < prevPrice) newDirections[p.id] = 'down';
            else newDirections[p.id] = 'same';
          } else {
            newDirections[p.id] = 'same';
          }

          prevPricesRef.current[p.id] = currentPrice;

          return {
            id: p.id,
            name: p.name,
            position: p.position,
            club: p.club,
            jersey_number: p.jersey_number,
            base_price: parseFloat(p.base_price),
            crowd_premium: parseFloat(p.crowd_premium),
            current_price: currentPrice,
            status: p.status,
            last_match_rating: parseFloat(p.last_match_rating || '7.2'),
            last_rating_change: parseFloat(p.last_rating_change || '0'),
            change_24h_pct: parseFloat(p.change_24h_pct || '0'),
          };
        });

        setPlayers(formattedPlayers);
        setPriceDirections(newDirections);
      }

      // 2. Fetch User Holdings & Watchlist if signed in
      if (user?.id) {
        const { data: hData } = await supabase
          .from('holdings')
          .select('*, player:players(*)')
          .eq('user_id', user.id);

        if (hData) {
          const mappedHoldings: Holding[] = hData.map((h: any) => {
            const currentPrice = parseFloat(h.player?.base_price || '0.65') * (1 + parseFloat(h.player?.crowd_premium || '0'));
            const shares = parseInt(h.shares, 10);
            const avgPrice = parseFloat(h.avg_buy_price);
            const val = shares * currentPrice;
            const cost = shares * avgPrice;
            const pl = val - cost;
            const plPct = cost > 0 ? (pl / cost) * 100 : 0;

            return {
              id: h.id,
              user_id: h.user_id,
              player_id: h.player_id,
              shares,
              avg_buy_price: avgPrice,
              player: h.player,
              current_value: val,
              unrealized_pl: pl,
              unrealized_pl_pct: plPct,
            };
          });
          setHoldings(mappedHoldings);
        }

        const { data: wData } = await supabase
          .from('watchlist')
          .select('*, player:players(*)')
          .eq('user_id', user.id);

        if (wData) {
          setWatchlist(wData);
        }
      }
    } catch (err) {
      console.error('Error fetching market data:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshMarket = async () => {
    await fetchMarketData();
    await refreshProfile();
  };

  useEffect(() => {
    fetchMarketData();

    // 5-second polling interval while screen is visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchMarketData();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [user?.id]);

  const toggleWatchlist = async (playerId: string): Promise<boolean> => {
    if (!user?.id) return false;
    const existing = watchlist.find((w) => w.player_id === playerId);
    if (existing) {
      await supabase.from('watchlist').delete().eq('id', existing.id);
      setWatchlist((prev) => prev.filter((w) => w.player_id !== playerId));
      return false;
    } else {
      const { data } = await supabase
        .from('watchlist')
        .insert({ user_id: user.id, player_id: playerId })
        .select()
        .single();
      if (data) {
        setWatchlist((prev) => [...prev, data]);
      }
      return true;
    }
  };

  const isWatchlisted = (playerId: string) => {
    return watchlist.some((w) => w.player_id === playerId);
  };

  const availableLiquidity = profile?.balance ?? 10000;
  const totalHoldingsValue = holdings.reduce((acc, h) => acc + (h.current_value || 0), 0);
  const portfolioNetWorth = availableLiquidity + totalHoldingsValue;

  return (
    <MarketContext.Provider
      value={{
        players,
        priceDirections,
        holdings,
        watchlist,
        loading,
        portfolioNetWorth,
        availableLiquidity,
        totalHoldingsValue,
        refreshMarket,
        toggleWatchlist,
        isWatchlisted,
      }}
    >
      {children}
    </MarketContext.Provider>
  );
};

export const useMarket = () => {
  const context = useContext(MarketContext);
  if (!context) {
    throw new Error('useMarket must be used within a MarketProvider');
  }
  return context;
};
