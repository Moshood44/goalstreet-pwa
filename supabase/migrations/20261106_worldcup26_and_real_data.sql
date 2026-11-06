-- ====================================================================
-- Goalstreet Migration: Worldcup26 Provider, Club ID Map, Fixture Link,
-- Real Data Tables, Settlement Ledgers, and Real Trader XP Streaks
-- ====================================================================

-- 1. Provider errors table for unhandled shapes and failure logs
CREATE TABLE IF NOT EXISTS public.provider_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  endpoint text NOT NULL,
  error_message text NOT NULL,
  raw_payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- 2. Unmapped clubs table for tracking unmatched clubs
CREATE TABLE IF NOT EXISTS public.unmapped_clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_club_id text,
  provider_club_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. Club ID Map: Maps worldcup26 clubs (and external APIs) to app/FPL club names
CREATE TABLE IF NOT EXISTS public.club_id_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_club_id text,
  provider_club_name text NOT NULL,
  normalized_name text NOT NULL,
  fpl_club_name text NOT NULL,
  fpl_team_id integer,
  created_at timestamptz DEFAULT now(),
  UNIQUE(provider, provider_club_id)
);

-- Seed English Premier League clubs map
INSERT INTO public.club_id_map (provider, provider_club_id, provider_club_name, normalized_name, fpl_club_name, fpl_team_id)
VALUES
  ('worldcup26', '359', 'Arsenal', 'arsenal', 'Arsenal', 1),
  ('worldcup26', '362', 'Aston Villa', 'astonvilla', 'Aston Villa', 2),
  ('worldcup26', '337', 'Brentford', 'brentford', 'Brentford', 3),
  ('worldcup26', '331', 'Brighton & Hove Albion', 'brighton', 'Brighton', 4),
  ('worldcup26', '363', 'Chelsea', 'chelsea', 'Chelsea', 5),
  ('worldcup26', '384', 'Crystal Palace', 'crystalpalace', 'Crystal Palace', 6),
  ('worldcup26', '368', 'Everton', 'everton', 'Everton', 7),
  ('worldcup26', '370', 'Fulham', 'fulham', 'Fulham', 8),
  ('worldcup26', '364', 'Liverpool', 'liverpool', 'Liverpool', 9),
  ('worldcup26', '382', 'Manchester City', 'manchestercity', 'Man City', 10),
  ('worldcup26', '360', 'Manchester United', 'manchesterunited', 'Man Utd', 11),
  ('worldcup26', '361', 'Newcastle United', 'newcastleunited', 'Newcastle', 12),
  ('worldcup26', '393', 'Nottingham Forest', 'nottinghamforest', 'Nott''m Forest', 13),
  ('worldcup26', '367', 'Tottenham Hotspur', 'tottenhamhotspur', 'Spurs', 14),
  ('worldcup26', '371', 'West Ham United', 'westhamunited', 'West Ham', 15),
  ('worldcup26', '380', 'Wolverhampton Wanderers', 'wolverhamptonwanderers', 'Wolves', 16),
  ('worldcup26', '338', 'Bournemouth', 'bournemouth', 'Bournemouth', 17),
  ('worldcup26', '376', 'Ipswich Town', 'ipswichtown', 'Ipswich', 18),
  ('worldcup26', '375', 'Leicester City', 'leicestercity', 'Leicester', 19),
  ('worldcup26', '379', 'Southampton', 'southampton', 'Southampton', 20),
  ('worldcup26', '306', 'Hull City', 'hullcity', 'Hull City', null),
  ('worldcup26', '388', 'Coventry City', 'coventrycity', 'Coventry City', null),
  ('worldcup26', '366', 'Sunderland', 'sunderland', 'Sunderland', null)
ON CONFLICT (provider, provider_club_id) DO UPDATE SET
  fpl_club_name = EXCLUDED.fpl_club_name,
  normalized_name = EXCLUDED.normalized_name;

-- 4. Fixture Link table connecting worldcup26 events to FPL fixtures
CREATE TABLE IF NOT EXISTS public.fixture_link (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worldcup26_event_id text NOT NULL UNIQUE,
  fpl_fixture_id integer,
  gameweek integer,
  home_club text NOT NULL,
  away_club text NOT NULL,
  kickoff_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'live', 'finished'
  state text NOT NULL DEFAULT 'pre', -- 'pre', 'in', 'post'
  display_clock text DEFAULT '0''',
  home_score integer DEFAULT 0,
  away_score integer DEFAULT 0,
  key_events jsonb DEFAULT '[]'::jsonb,
  last_synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Add index on status and kickoff_time
CREATE INDEX IF NOT EXISTS idx_fixture_link_status_kickoff ON public.fixture_link(status, kickoff_time);

-- 5. Player match ratings history table for real provisional and final ratings
CREATE TABLE IF NOT EXISTS public.player_match_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_id text NOT NULL,
  player_id uuid REFERENCES public.players(id) ON DELETE CASCADE,
  fpl_id integer NOT NULL,
  player_name text,
  club text,
  minutes integer DEFAULT 0,
  bps integer DEFAULT 0,
  bonus integer DEFAULT 0,
  total_points integer DEFAULT 0,
  expected_goals numeric DEFAULT 0,
  expected_assists numeric DEFAULT 0,
  ict_index numeric DEFAULT 0,
  rating numeric(4,2) NOT NULL,
  rating_status text NOT NULL DEFAULT 'Provisional', -- 'Provisional', 'Final'
  settled boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(fixture_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_pmr_fixture ON public.player_match_ratings(fixture_id);
CREATE INDEX IF NOT EXISTS idx_pmr_player ON public.player_match_ratings(player_id);

-- 6. Settlement payouts ledger table for Squad Battles & Challenges
CREATE TABLE IF NOT EXISTS public.settlement_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid REFERENCES public.challenges(id) ON DELETE SET NULL,
  gameweek integer NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  rank_num integer NOT NULL,
  return_pct numeric NOT NULL,
  reward_trophy text,
  reward_caps numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(challenge_id, user_id, gameweek)
);

-- 7. Add columns to matches table if not already present
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS worldcup26_event_id text;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS display_clock text DEFAULT '0''';
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS state text DEFAULT 'pre';
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS key_events jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS last_synced_at timestamptz DEFAULT now();

-- 8. Add realized_pnl to orders table if not already present
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS realized_pnl numeric DEFAULT 0;

-- 9. Real Trader XP & Streak logging RPC (Atomic & Idempotent per UTC day)
CREATE OR REPLACE FUNCTION public.record_daily_login(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_last_login_date date;
  v_current_streak integer := 0;
  v_new_xp integer := 0;
  v_bonus_xp integer := 0;
  v_existing_event_id uuid;
BEGIN
  -- Check if already logged in today
  SELECT id INTO v_existing_event_id
  FROM public.xp_events
  WHERE user_id = p_user_id
    AND event_type = 'daily_login'
    AND (created_at AT TIME ZONE 'UTC')::date = v_today;

  IF v_existing_event_id IS NOT NULL THEN
    -- Already logged in today, return current profile
    SELECT streak_days, xp INTO v_current_streak, v_new_xp
    FROM public.profiles
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
      'success', true,
      'already_logged_today', true,
      'streak', COALESCE(v_current_streak, 0),
      'xp', COALESCE(v_new_xp, 0)
    );
  END IF;

  -- Get previous streak and last trade/login date
  SELECT COALESCE(streak_days, 0), (last_trade_date AT TIME ZONE 'UTC')::date, xp
  INTO v_current_streak, v_last_login_date, v_new_xp
  FROM public.profiles
  WHERE id = p_user_id;

  -- Calculate streak
  IF v_last_login_date = (v_today - 1) THEN
    v_current_streak := v_current_streak + 1;
  ELSIF v_last_login_date = v_today THEN
    -- Same day, streak unchanged
    NULL;
  ELSE
    -- Missed one or more days, streak resets to 1
    v_current_streak := 1;
  END IF;

  v_bonus_xp := 20 + (v_current_streak * 5);

  -- Insert login xp_event
  INSERT INTO public.xp_events (user_id, event_type, xp_amount, description, created_at)
  VALUES (
    p_user_id,
    'daily_login',
    v_bonus_xp,
    format('Daily login streak: Day %s (+%s XP)', v_current_streak, v_bonus_xp),
    now()
  );

  -- Update profiles with streak and new XP
  UPDATE public.profiles
  SET
    streak_days = v_current_streak,
    last_trade_date = now(),
    xp = COALESCE(xp, 0) + v_bonus_xp,
    tier = CASE
      WHEN COALESCE(xp, 0) + v_bonus_xp >= 5000 THEN 'Legend'
      WHEN COALESCE(xp, 0) + v_bonus_xp >= 1000 THEN 'Elite Scout'
      WHEN COALESCE(xp, 0) + v_bonus_xp >= 250 THEN 'Pro Trader'
      ELSE 'Rookie'
    END
  WHERE id = p_user_id
  RETURNING xp INTO v_new_xp;

  RETURN jsonb_build_object(
    'success', true,
    'already_logged_today', false,
    'streak', v_current_streak,
    'xp_awarded', v_bonus_xp,
    'xp_total', v_new_xp
  );
END;
$$;

-- 10. Grant public permissions on relevant tables
GRANT SELECT, INSERT ON public.provider_errors TO authenticated, anon;
GRANT SELECT ON public.club_id_map TO authenticated, anon;
GRANT SELECT ON public.fixture_link TO authenticated, anon;
GRANT SELECT ON public.player_match_ratings TO authenticated, anon;
GRANT SELECT ON public.settlement_ledger TO authenticated, anon;

