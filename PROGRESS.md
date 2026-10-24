# Goalstreet PWA - Project Progress

## Done
- **Stage 0: Audit Completed**
  - Full codebase inspection of 13 pages, 9 UI components, context providers, and design assets from Stitch.
  - Supabase database audit: identified existing tables, triggers, and routines.
  - Cloudflare Pages project `goalstreet` connected and configured with production & preview environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
  - Git remote verified on `Moshood44/goalstreet-pwa`.
  - Stitch screens and UI specifications confirmed and mapped to local components.
- **Stage 1: Backend Core Completed**
  - Database schema completed: `players` updated with `fpl_id`, `full_name`, `shirt_number`, `chance_of_playing`, `news`, `is_delisted`.
  - Created missing tables: `fpl_cache`, `api_usage`, `player_map`, `rating_calibration`.
  - Updated `match_ratings` with `fixture_id` and unique index `(fixture_id, player_id)`.
  - Created atomic server-side Postgres functions `buy_shares` and `sell_shares` (SECURITY DEFINER) enforcing auth check, balance check, holding check, locked player check, 0.5% fee, and 25% single-player portfolio cap.
  - Hardened RLS policies across all tables: clients have read-only access to balances, holdings, orders, players, prices, snapshots.
  - Created portfolio snapshot scheduled function `snapshot_user_portfolios`.
  - Created, tested, and deployed cached Edge Function `price-snapshot` (`https://mjpxtnbnlbvedurolcyh.supabase.co/functions/v1/price-snapshot`).
  - Updated `MarketContext` to poll `price-snapshot` every 5 seconds with automatic RPC fallback.
- **Stage 2: Auth End-to-End Completed**
  - Synthetic email `username@goalstreet.internal` + 6-digit PIN + `generateRecoveryCode`/`hashString` + `RecoveryCodeModal` + `verify_and_reset_pin` RPC.
- **Stage 3: Wire Frontend Completed**
  - All 13 pages wired to Supabase RPCs/tables; `PricePill` flash, `on track for +X%`, `TradeBottomSheet` 0.5%/25%/locked guards.
- **Stage 4: Real Data Integration Completed**
  - `fpl.ts` cached client + `price-engine` (match window/drift/decay) + `daily-sync` + `vaastav-calibration` + `isDataDelayed`.
- **Stage 5: PWA and Polish Completed**
  - `generate_icons.py` icons, `VitePWA` generateSW/workbox `sw.js`/`manifest.webmanifest`, `index.html` apple-touch-icon, `PwaInstallBanner` + Profile iOS guide; build verified 615 KiB precache.
- **Stage 6: Final Deploy Completed**
  - Supabase Edge Functions deployed and ACTIVE: `price-snapshot`, `daily-sync`, `price-engine`, `vaastav-calibration`.
  - All 4 `pg_cron` schedules active in database (`price-engine` 1m, `daily-sync` 04:00 UTC, weekly & monthly snapshots).
  - Live data sync executed: 667 Premier League players and 380 fixtures synced from FPL; vaastav calibration applied.
  - Production bundle `dist/` built and verified with Vite PWA precache (615 KiB, 151 modules).
  - GitHub repo pushed and up to date on `Moshood44/goalstreet-pwa` `main`.
  - Cloudflare Pages live production deployment complete at: **https://goalstreet.pages.dev**

- **Phase A: Save & Ship Completed**
  - Secrets audit passed (no literal API-Football keys, hex tokens, or eyJ fallbacks in repository).
  - Built production bundle with Vite PWA precache.
  - Deployed to Cloudflare Pages live at **https://goalstreet.pages.dev**.

## In progress
- **Phase B1**: Wire remaining mock-data pages to Supabase (Player Compare, Watchlist alerts, Order History realized PnL, Challenges, Trader XP, Notifications, Leaderboard, Matchday Ticker).

## Remaining
- **Phase B2**: Dynamic gameweek copy, disabled European leagues ("Coming soon"), cleanup obsolete links.
- **Phase B3**: Responsive 3-tier layout validation (mobile bottom tabs, tablet rail, desktop wide market + right persistent panel).
- **Phase B4**: Verify pg_cron jobs and real System Status data.

