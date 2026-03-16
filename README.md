# FPL123

**Your FPL Performance, Finally Recognised.**

FPL123 is a Fantasy Premier League gameweek performance recognition and giveaway platform. Managers pay a per-gameweek entry fee, get randomly sorted into groups of up to 32, and compete for recognition and prizes based on their FPL gameweek points.

---

## Setup Guide

### 1. Clone & Install

```bash
git clone https://github.com/yourname/fpl123.git
cd fpl123
npm install
```

### 2. Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the full migration:
   ```
   supabase/migrations/001_initial_schema.sql
   ```
3. Copy your project URL and keys from **Settings → API**

### 3. Configure Environment Variables

Copy `.env.local.example` to `.env.local` and fill in all values:

```bash
cp .env.local.example .env.local
```

**Required variables:**

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `ADMIN_SECRET_PATH` | Secret URL segment for admin e.g. `x9k2m7` |
| `ADMIN_PASSWORD` | Admin dashboard password |
| `MPESA_CONSUMER_KEY` | Daraja API consumer key |
| `MPESA_CONSUMER_SECRET` | Daraja API consumer secret |
| `MPESA_SHORTCODE` | Your M-Pesa business shortcode |
| `MPESA_PASSKEY` | STK Push passkey |
| `MPESA_B2C_INITIATOR` | B2C initiator name |
| `MPESA_B2C_SECURITY_CREDENTIAL` | B2C security credential |
| `MPESA_CALLBACK_URL` | Your domain + `/api/mpesa/callback` |
| `MPESA_B2C_RESULT_URL` | Your domain + `/api/mpesa/b2c-result` |
| `MPESA_ENVIRONMENT` | `sandbox` or `production` |
| `PAYPAL_CLIENT_ID` | PayPal app client ID |
| `PAYPAL_CLIENT_SECRET` | PayPal app client secret |
| `PAYPAL_ENVIRONMENT` | `sandbox` or `live` |
| `FPL_LEAGUE_ID` | Your private FPL league ID |
| `CONTACT_WHATSAPP` | WhatsApp number e.g. `254712345678` |
| `CONTACT_INSTAGRAM` | Instagram handle (no @) |
| `CONTACT_TIKTOK` | TikTok handle (no @) |
| `CONTACT_EMAIL` | Contact email |
| `CONTACT_FACEBOOK` | Facebook page URL or handle |
| `CONTACT_X` | X/Twitter handle (no @) |

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Admin panel: `http://localhost:3000/{ADMIN_SECRET_PATH}`

### 5. Deploy to Vercel

```bash
npx vercel
```

Set all environment variables in your Vercel project dashboard under **Settings → Environment Variables**.

For cron jobs, add `CRON_SECRET` to your env vars (Vercel sets this automatically for cron jobs).

---

## How It Works

### User Flow

1. **Homepage** — Manager sees current GW, entry fee, countdown timer
2. **Enter** (`/enter`) — 4-step flow:
   - Enter FPL Team ID
   - Confirm manager details (fetched from FPL API)
   - Pay via M-Pesa or PayPal
   - Receive 4-digit PIN
3. **Standings** (`/standings`) — Enter FPL ID + PIN to view group
4. **Hall of Fame** (`/hall-of-fame`) — All-time leaderboard (optional, admin-gated)

### Admin Flow

Access admin at `/{ADMIN_SECRET_PATH}`:

1. **GW Controls** — Set entry fee, open/close registration, configure payouts
2. **Entries** — View all payments, manually confirm, refund, disqualify
3. **Groups** — Trigger group allocation (or wait for auto-allocation after deadline)
4. **Standings** — Refresh FPL points for all managers
5. **Payouts** — Preview and trigger prize distribution

### Automation (Cron Jobs)

| Job | Schedule | Action |
|-----|----------|--------|
| `/api/cron/auto-deadline` | Every hour | Fetches GW deadline from FPL API |
| `/api/cron/auto-groups` | Every 5 min | Allocates groups after deadline |
| `/api/cron/refresh-standings` | Every 30 min | Updates GW points from FPL API |

---

## Architecture

### Tech Stack
- **Frontend:** Next.js 14 (App Router) + TypeScript
- **Database:** Supabase (PostgreSQL + RLS)
- **Styling:** Tailwind CSS
- **Payments:** M-Pesa Daraja API + PayPal REST API
- **FPL Data:** FPL Public API (no auth needed)
- **Deployment:** Vercel

### Key Design Decisions

- **No user accounts** — managers identify with FPL Team ID + 4-digit PIN only
- **PIN shown once** — after payment, stored in DB, cannot be recovered (admin can reset)
- **Service role key** — all DB writes go through API routes using the service role key, never exposed to client
- **Blacklist checked before payment** — never after
- **League verification loops all pages** — with 150ms delay and 429 retry logic
- **Admin route never linked** — the secret path is only in your env var

---

## FPL API Endpoints Used

```
GET https://fantasy.premierleague.com/api/bootstrap-static/
GET https://fantasy.premierleague.com/api/entry/{TID}/
GET https://fantasy.premierleague.com/api/entry/{TID}/history/
GET https://fantasy.premierleague.com/api/entry/{TID}/event/{GW}/picks/
GET https://fantasy.premierleague.com/api/leagues-classic/{LID}/standings/?page_standings={P}
```

---

## Logging

All modules log with structured prefixes for easy debugging:

- `[FPL API]` — FPL data fetching
- `[MPESA]` — M-Pesa payments
- `[PAYPAL]` — PayPal payments
- `[DB]` — Database operations
- `[CRON]` — Scheduled jobs
- `[AUTH]` — Authentication
- `[GROUPS]` — Group allocation
- `[STANDINGS]` — Points refresh
- `[PAYOUTS]` — Prize distribution

Every error includes: file name, function name, input data, and error message.

---

## Security Notes

- Admin route is never linked in public nav, sitemap, or source code comments
- Service role key is server-only (never in `NEXT_PUBLIC_*`)
- Admin session uses httpOnly cookie
- All admin API routes require valid session cookie
- Blacklist is checked before payment initiation, not after
