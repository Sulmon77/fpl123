## Project: FPL123
Stack: Next.js 15 App Router, Supabase, Tailwind, TypeScript
Deployed: Vercel

## File structure (src/)
app/
  page.tsx                          ← homepage (server component)
  enter/page.tsx                    ← entry flow (client)
  standings/page.tsx                ← PIN-gated (client)
  hall-of-fame/page.tsx             ← server
  history/page.tsx                  ← server
  terms/page.tsx                    ← server
  [adminPath]/dashboard/...         ← all admin pages (client)
  api/admin/settings/route.ts       ← read/write all settings
  api/admin/end-gameweek/route.ts
  api/settings/route.ts             ← public settings
  api/fpl/verify/route.ts
  api/register/route.ts
  api/mpesa/...
  api/paypal/...
  api/manager/[fplId]/route.ts
  api/standings/[groupId]/route.ts
  api/admin/...

components/
  layout/Header.tsx
  layout/Footer.tsx
  shared/CountdownTimer.tsx
  shared/AnnouncementBanner.tsx
  shared/PinDisplay.tsx
  entry/StepIndicator.tsx
  entry/ManagerCard.tsx
  entry/ConfirmationScreen.tsx

lib/
  supabase.ts, fpl.ts, mpesa.ts, paypal.ts
  groups.ts, pin.ts, admin-auth.ts, utils.ts, logger.ts

types/index.ts

## Settings table columns (all in one row)
gameweek_number, entry_fee, entry_deadline, registration_open,
gameweek_status (upcoming|ongoing|ended|edit), gameweek_ended,
giveaway_type, giveaway_description, winners_per_group,
payout_percentages (jsonb), standings_refresh_interval,
announcement_text, announcement_visible, terms_text,
platform_name, history_visible, hall_of_fame_enabled,
hall_of_fame_price, hall_of_fame_audience

## Key conventions
- Server components fetch directly via createServerSupabaseClient()
- Client components fetch via /api/settings or /api/admin/settings
- Admin auth via requireAdminAuth(request) in all /api/admin/ routes
- All admin routes use ADMIN_SECRET_PATH env var for the URL
- Tailwind theme: brand-purple #37003C, brand-green #00FF87, brand-cyan #04F5FF
- Card class: "card" = rounded-2xl border border-border shadow-sm bg-surface
- Buttons: btn-primary, btn-accent, btn-ghost
- Forms: form-input class on all inputs