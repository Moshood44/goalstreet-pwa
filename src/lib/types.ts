export interface Player {
  id: string;
  name: string;
  position: 'FWD' | 'MID' | 'DEF' | 'GK';
  club: string;
  jersey_number: number;
  base_price: number;
  crowd_premium: number;
  current_price: number;
  status: 'active' | 'locked';
  last_match_rating: number;
  last_rating_change: number;
  change_24h_pct: number;
  net_buying_caps?: number;
  shares_total?: number;
}

export interface Profile {
  id: string;
  username: string;
  email: string;
  balance: number;
  xp: number;
  tier: string;
  recovery_code_hash?: string;
  failed_pin_attempts?: number;
  locked_until?: string | null;
  created_at?: string;
}

export interface Holding {
  id: string;
  user_id: string;
  player_id: string;
  shares: number;
  avg_buy_price: number;
  player?: Player;
  current_value?: number;
  unrealized_pl?: number;
  unrealized_pl_pct?: number;
}

export interface Order {
  id: string;
  user_id: string;
  player_id: string;
  side: 'BUY' | 'SELL';
  shares: number;
  price: number;
  gross_amount: number;
  fee: number;
  net_amount: number;
  created_at: string;
  player?: Player;
}

export interface Match {
  id: string;
  home_club: string;
  away_club: string;
  match_date: string;
  status: 'scheduled' | 'live' | 'finished';
  current_minute: number;
  home_score: number;
  away_score: number;
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  player_id: string;
  target_high: number | null;
  target_low: number | null;
  player?: Player;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  trophy_badge: string;
  start_time: string;
  end_time: string;
  status: string;
}

export interface LeaderboardEntry {
  rank_num: number;
  user_id: string;
  username: string;
  portfolio_value: number;
  starting_value: number;
  return_pct: number;
  tier: string;
}
