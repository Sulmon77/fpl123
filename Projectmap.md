# FPL123 — Project Map
# Every file, what it does, and what to touch when you want to change something.
# Keep this file updated as you add features.

---

## PROJECT OVERVIEW

Name:     FPL123
Stack:    Next.js 15 App Router + TypeScript + Supabase + TailwindCSS
Payments: M-Pesa (Daraja) + PayPal
Host:     Vercel
Database: Supabase (PostgreSQL)
Admin URL: /{ADMIN_SECRET_PATH} (Configured via env variables, keep this secret)

---

## ROOT FILES

package.json
  What: Lists all libraries the project uses and the commands to run it.
  Touch when: Adding a new library (npm install xxx), or changing npm scripts.

next.config.js
  What: Configuration for Next.js (image domains, server settings).
  Touch when: Adding new image domains, changing server limits or headers.

tailwind.config.ts
  What: Design system configuration — colors, fonts, spacing.
  Touch when: Adding new colors, changing the brand color, adding fonts.
  Key: The brand colors (brand-purple #37003C, brand-green #00FF87) live here. Change them here.

tsconfig.json
  What: TypeScript configuration. Tells the compiler how to check your code.
  Touch when: Almost never. Leave this alone.

middleware.ts
  What: Next.js middleware.
  Touch when: Adding route protections or redirect logic before a request completes.

.env.local.example
  What: Template showing all environment variables needed.
  Touch when: You add a new third-party service that needs a key.
  WARNING: Never commit .env.local to git.

.env.local (you create this from .env.local.example)
  What: Your actual secret keys and configuration.
  Touch when: Changing API keys, setting admin path, updating MPESA/PayPal credentials.

README.md & SETUP_GUIDE.md & FPL123_Setup_Guide_Updated.md
  What: Step-by-step deployment instructions, requirements, and project information.

Projectmap.md (this file)
  What: Reference document for understanding and changing the codebase.

---

## DATABASE

supabase/migrations/001_initial_schema.sql
  What: The ENTIRE database structure.
        Run this once in Supabase SQL Editor to create all tables.
  Contains:
    - settings table: admin-controlled platform settings (tier configs, gameweek status, etc.)
      * Key logic columns: gameweek_ended, gameweek_status ('upcoming', 'ongoing', 'ended', 'edit'), casual_settings, elite_settings
    - entries table: user payments/entries for a gameweek
      * Supports methods: 'mpesa', 'paypal', 'manual' (with notes)
      * Includes entry_tier flag
    - groups & group_members tables: randomly allocated managers (includes entry_tier)
    - payouts table: prize distribution info (includes fpl_team_name, group_number, entry_tier, marked_sent_at, marked_sent_by)
    - giveaway_history table: past records (includes total_entries, total_amount)
    - managers table: fpl managers data and points
    - rules table: stores platform rules with sort ordering
    - Row Level Security (RLS) policies
  Touch when: Adding a new table, adding a new column, changing a policy.
  WARNING: After editing, run only the new/changed parts — not the whole file again.

---

## SOURCE CODE: src/

### src/types/index.ts
  What: TypeScript type definitions for every object in the system.
        Think of this as a dictionary of "what shape is a Gameweek? an Entry? a Group?"
  Touch when: Adding new fields to the database, adding new features.

### src/lib/ — Core utilities (used by many parts of the app)

  src/lib/supabase.ts
    What: Creates database connections for client and server.
          Provides createServerSupabaseClient() and admin clients.
    Touch when: Changing database client initializations.

  src/lib/admin-auth.ts
    What: Authentication logic for the admin dashboard.
          requireAdminAuth() — ensures the user has access.
    Touch when: Changing admin login/session behavior.

  src/lib/fpl.ts
    What: All interactions with the external Fantasy Premier League (FPL) API.
          Fetches manager details, gameweek points, deadlines, etc.
    Touch when: FPL API endpoints change or you want to fetch new FPL data.

  src/lib/mpesa.ts
    What: MPESA payment integration (Safaricom Daraja API).
          Sends STK push (popup on user's phone).
    Touch when: Changing MPESA API logic (different transaction type, etc.).

  src/lib/paypal.ts
    What: PayPal integration for international users.
    Touch when: Modifying PayPal capture or webhook logic.

  src/lib/groups.ts
    What: Logic for randomly allocating paid managers into groups of up to 32.
    Touch when: Changing max group size or the sorting/grouping algorithm.

  src/lib/prizes.ts & src/lib/pin.ts
    What: Utility functions for calculating payout distributions and generating 4-digit PINs.

  src/lib/logger.ts
    What: Standardized logging utility with prefixes like [FPL API], [MPESA], etc.
    Touch when: Adding new log types or changing log formats.

  src/lib/utils.ts
    What: General helper functions (date formatting, class names merging).

---

### src/app/ — Pages and API routes

## API Routes: src/app/api/

  src/app/api/admin/settings/route.ts
    What: GET = read all platform settings
          PATCH = update settings (admin only)
    Touch when: Adding new platform settings.

  src/app/api/admin/end-gameweek/route.ts
    What: Trigger to officially close out a gameweek.
    Touch when: Gameweek ending logic changes.

  src/app/api/cron/... (auto-deadline, auto-groups, refresh-standings)
    What: Automated jobs triggered by Vercel cron.
          auto-deadline: Fetches GW deadline from FPL API
          auto-groups: Allocates groups after deadline
          refresh-standings: Updates GW points from FPL API
    Touch when: Changing automation intervals or logic.

  src/app/api/mpesa/... & src/app/api/paypal/...
    What: Initiates payments and processes callbacks/webhooks.
    Touch when: Modifying payment flows or testing with sandboxes.

  src/app/api/register/route.ts
    What: Registration flow API (creating entries before payment).

  src/app/api/settings/route.ts
    What: Public getter for platform settings (gameweek, fees).

  src/app/api/standings/[groupId]/route.ts & api/manager/[fplId]/route.ts
    What: Fetching standings and manager info safely.

## Pages: src/app/

  src/app/layout.tsx
    What: Root layout — wraps every page. Includes Header and Footer.
    Touch when: Adding global tracking codes or top-level providers.

  src/app/globals.css
    What: Global CSS styles and Tailwind utilities. Custom card/button classes.
    Touch when: Changing brand colors or adding core CSS classes.

  src/app/page.tsx
    What: The public landing page (/).
          Shows current GW details, countdown timer, entry fee.
    Touch when: Changing the landing page copy or layout.

  src/app/enter/page.tsx
    What: Entry flow page (client-side).
          A 4-step wizard (Enter ID -> Confirm Details -> Pay -> Get PIN).
    Touch when: Modifying the entry UI or steps.

  src/app/standings/page.tsx
    What: Standings page (PIN-gated).
          Enter FPL ID + PIN to view the group leaderboard.
    Touch when: Updating the leaderboard UI.

  src/app/hall-of-fame/page.tsx & src/app/history/page.tsx
    What: All-time leaderboards and manager history.
    Touch when: Updating historical data views.

  src/app/terms/page.tsx & src/app/rules/page.tsx
    What: Static informational pages.
    Touch when: Changing platform rules or T&Cs.

  src/app/[adminPath]/dashboard/page.tsx
    What: Main admin dashboard. Shows all entries, groups, settings, and payouts.
    Touch when: Extending admin tools or changing the layout.

---

## Components: src/components/

  src/components/layout/Header.tsx & Footer.tsx
    What: Main navigation elements.
    Touch when: Adding new page links.

  src/components/shared/CountdownTimer.tsx
    What: Displays time remaining before the entry deadline.
    Touch when: You want to change how the countdown looks.

  src/components/shared/AnnouncementBanner.tsx
    What: Displays an admin-controlled text banner at the top of the site.
    Touch when: Updating the visual style of announcements.

  src/components/entry/ManagerCard.tsx & StepIndicator.tsx & ConfirmationScreen.tsx
    What: Sub-components for the /enter flow.
    Touch when: Tweaking the UI for entering the game.

  src/components/admin/...
    What: Admin dashboard sections (Settings, Entries, Payouts).
    Touch when: Changing admin UI tools.

---

## HOW TO MAKE COMMON CHANGES

### Change a setting (e.g. entry fee, open registration):
  1. Log in to the admin panel at `/{ADMIN_SECRET_PATH}`
  2. Navigate to the Settings tab
  3. Modify the Entry Fee, Gameweek number, or toggle "Registration Open"
  4. Click Save
  5. Done — The frontend pulls settings dynamically via `/api/settings`

### Manually refresh FPL points:
  1. This is done via cron (`/api/cron/refresh-standings`) every 30 mins
  2. But you can do it manually in the admin dashboard by clicking "Refresh Standings"

### Add a new setting column:
  1. Add the new column to `supabase/migrations/001_initial_schema.sql` (settings table)
  2. Add the column locally in your Supabase UI / SQL Editor
  3. Update `src/types/index.ts` to include the new setting in the `PlatformSettings` type
  4. Edit `src/app/api/admin/settings/route.ts` to allow writing this setting
  5. Add a UI toggle/input in `src/app/[adminPath]/dashboard/SettingsPanel.tsx` (or equivalent component)

### Change the frontend styling (Colors):
  1. Open `tailwind.config.ts`
  2. Locate the `colors` object (`brand-purple`, `brand-green`)
  3. Change the hex code
  4. Commit and push

---

## AUTOMATION (Cron Jobs)
Automations run on Vercel Cron.
Configured in `vercel.json` and executed via API routes in `src/app/api/cron/`

1. **auto-deadline** (Every hour) — Checks FPL API to sync the official gameweek deadline to the database settings.
2. **auto-groups** (Every 5 mins) — Checks if the deadline has passed. If it has, allocates all paid entries into groups.
3. **refresh-standings** (Every 30 mins) — Fetches up-to-date points from FPL API for all managers in groups.

---

## ADMIN SETTINGS REFERENCE
Most logic is driven by the single `settings` row in the database.
Key customizable fields:
- `gameweek_number`: Current GW
- `gameweek_status`: Tracks GW lifecycle ('upcoming', 'ongoing', 'ended', 'edit')
- `gameweek_ended`: Boolean defining if GW has fully finalized
- `casual_settings` / `elite_settings`: JSON objects controlling tiered parameters (entry fee, group max, winner counts, payout percentages)
- `registration_open`: Boolean to accept new payments
- `standings_refresh_interval`: Minutes between auto-refreshes

---

## SECURITY NOTES

- **Admin URL Security:** The admin route is defined by the `ADMIN_SECRET_PATH` environment variable. It is NEVER linked in the codebase or public navbar. A bad actor would need to know the secret string *and* the admin password.
- **Service Role Key:** All admin Database inserts/updates MUST use the `SUPABASE_SERVICE_ROLE_KEY` in server contexts. Never expose it to the browser.
- **Client-side DB Access:** Uses the Anon key. Ensure RLS policies in Supabase prevent public writes to sensitive tables.
- **PIN Recovery:** Users are shown their PIN only once. It cannot be recovered by the user for security; an admin must handle disputes.

---

Last updated: Post-initial Tier & DB Migrations
