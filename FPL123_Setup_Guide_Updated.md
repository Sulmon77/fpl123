# FPL123 — Complete Setup & Deployment Guide

> **Reading time:** ~15 minutes
> **Setup time:** 2–3 hours (including account creation)
> **You do not need to be a developer.** Every step is written in plain English.

---

## What You're Building

FPL123 is a web platform where FPL managers pay a small entry fee each gameweek, get randomly grouped with up to 32 other managers, and the top performers win prizes — paid out manually via M-Pesa or automatically when a Paybill number is configured.

This guide takes you from **downloading the zip file** all the way to a **live, working website**.

---

## What's Already Built — Everything is Complete

### ✅ Fully Built (works out of the box)
- Complete homepage with countdown timer, prize info, and how-it-works section
- Full 4-step entry flow: FPL ID → verify → M-Pesa payment → PIN reveal
- PayPal entry option shown as "Coming Soon" (can be activated later)
- Group standings page (PIN-gated, auto-refreshing)
- Hall of Fame page (shows all-time winners)
- History page (past GW results)
- Terms & Conditions page
- Complete admin panel with 13 sections
- All M-Pesa payment flows (STK Push, webhook callback)
- FPL API integration (manager lookup, league verification, points sync)
- Group allocation logic (random shuffle, groups of up to 32)
- Group management: allocate, shuffle, and undo allocation from admin
- Gameweek lifecycle: End Gameweek control that locks payouts until finalised
- Generate payout records from standings with one click
- Manual payout marking — mark winners as paid after sending money yourself
- Hall of Fame auto-update after each GW payout
- GW results announcer — pushes results to History page
- 3 automated background jobs (deadline sync, group auto-allocation, standings refresh)
- Blacklist, disqualification, refunds, PIN management
- User Management: add users manually, unconfirm users, add users to groups
- Dashboard with accurate GW-scoped revenue and entry stats
- Database schema with all tables, security rules, and indexes

### ⚠️ M-Pesa Payouts — Important Note
The system supports two payout modes:

**Manual mode (default, works immediately):** You pay winners yourself via M-Pesa on your phone, then click "Mark as Sent" in the admin panel. The system records the payment. No Safaricom approval needed.

**Automatic mode (requires Paybill):** The system sends M-Pesa payments automatically using the B2C API. This requires a Safaricom Paybill number — it does NOT work with a Till number. Apply at [developer.safaricom.co.ke](https://developer.safaricom.co.ke) when ready.

---

## Tools You Need (All Free)

| Tool | What It Does | Get It From |
|------|-------------|-------------|
| Node.js (LTS) | Runs the app | [nodejs.org](https://nodejs.org) |
| VS Code | Code editor | [code.visualstudio.com](https://code.visualstudio.com) |
| Git | Version control | [git-scm.com](https://git-scm.com) |
| GitHub account | Stores your code | [github.com](https://github.com) |
| Supabase account | Your database | [supabase.com](https://supabase.com) |
| Vercel account | Hosts your website | [vercel.com](https://vercel.com) |
| Safaricom Daraja | M-Pesa payments (receiving) | [developer.safaricom.co.ke](https://developer.safaricom.co.ke) |

---

## PART 1 — Unzip and Open the Project

### Step 1.1 — Extract the ZIP

1. Locate the `fpl123.zip` file you downloaded
2. Right-click it → **Extract All** (Windows) or double-click (Mac)
3. Choose a permanent location — your Documents folder works well
4. You should now have a folder called `fpl123` containing many files and subfolders

### Step 1.2 — Open in VS Code

1. Open VS Code
2. Go to **File → Open Folder**
3. Navigate to and select the `fpl123` folder
4. Click **Select Folder** (or Open on Mac)
5. You'll see the full project file tree on the left side panel

### Step 1.3 — Open the Integrated Terminal

Press `` Ctrl+` `` on Windows/Linux, or `` Cmd+` `` on Mac. A terminal panel opens at the bottom.

All commands in this guide are typed here and confirmed with Enter.

### Step 1.4 — Install Dependencies

Type this command and press Enter:

```
npm install
```

You'll see a lot of text scroll. This downloads all the code libraries the app needs. It takes 1–3 minutes. When it finishes and shows you a prompt again, you're ready.

---

## PART 2 — Set Up Supabase (Your Database)

Supabase is a free database service. It stores all your entries, payments, groups, standings, and settings.

### Step 2.1 — Create a Supabase Account

1. Go to [supabase.com](https://supabase.com) → click **Start your project**
2. Sign up with GitHub or email
3. On the dashboard, click **New project**
4. Fill in:
   - **Name:** `fpl123`
   - **Database Password:** choose something strong — write it down somewhere safe
   - **Region:** pick the region closest to your users (West EU is fine for Kenya)
5. Click **Create new project**
6. Wait about 2 minutes for it to finish setting up

### Step 2.2 — Create Your Database Tables

This step creates all the tables your app needs.

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **New query** (the `+` button)
3. Go back to VS Code
4. Navigate to: `supabase` → `migrations` → `001_initial_schema.sql`
5. Press **Ctrl+A** then **Ctrl+C** to copy everything
6. Click back on the Supabase SQL Editor tab
7. Click inside the query box and press **Ctrl+V** to paste
8. Click **Run** (or press Ctrl+Enter)
9. You should see: `Success. No rows returned`

### Step 2.3 — Run All Additional Migrations

Run each block below as a separate query in the SQL Editor (New query → paste → Run).

**Migration 1** — gameweek lifecycle columns:
```sql
ALTER TABLE settings ADD COLUMN IF NOT EXISTS gameweek_ended boolean DEFAULT false;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS gameweek_status text
  DEFAULT 'upcoming'
  CHECK (gameweek_status IN ('upcoming', 'ongoing', 'ended', 'edit'));
```

**Migration 2** — payout detail columns:
```sql
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS fpl_team_name text;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS group_number integer;
```

**Migration 3** — history summary columns:
```sql
ALTER TABLE giveaway_history ADD COLUMN IF NOT EXISTS total_entries integer DEFAULT 0;
ALTER TABLE giveaway_history ADD COLUMN IF NOT EXISTS total_amount integer DEFAULT 0;
```

**Migration 4** — manual payment support and admin notes:
```sql
ALTER TABLE entries DROP CONSTRAINT IF EXISTS entries_payment_method_check;
ALTER TABLE entries ADD CONSTRAINT entries_payment_method_check
  CHECK (payment_method IN ('mpesa', 'paypal', 'manual'));
ALTER TABLE entries ADD COLUMN IF NOT EXISTS notes text;
```

### Step 2.4 — Copy Your Supabase Keys

1. In Supabase, click the **Settings** icon (gear) in the left sidebar
2. Click **API**
3. Copy these three values — you will need them in Part 3:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon / public key** — a long string starting with `eyJ`
   - **service_role key** — another long string starting with `eyJ`

⚠️ **The service_role key is a master key. Never share it or post it publicly.**

---

## PART 3 — Configure Your Environment Variables

Environment variables are your app's private settings. They live in a file that is never uploaded to GitHub.

### Step 3.1 — Create .env.local

1. In VS Code, find the file called `.env.local.example`
2. Right-click it → **Copy**
3. Right-click in the file panel → **Paste**
4. Rename the new file to exactly `.env.local` (remove `.example`)
5. Click on `.env.local` to open it

### Step 3.2 — Fill In Every Value

---

**SUPABASE (from Step 2.4)**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your anon key...
SUPABASE_SERVICE_ROLE_KEY=eyJ...your service role key...
```

---

**ADMIN PANEL**
```
ADMIN_SECRET_PATH=choose-a-random-string-like-gx7k2m9p
ADMIN_PASSWORD=choose-a-strong-password
```

`ADMIN_SECRET_PATH` is the secret URL where your admin panel lives. If you set it to `gx7k2m9p`, your admin panel will be at `yourdomain.com/gx7k2m9p`.

Rules for a good secret path:
- At least 8 characters
- Mix of letters and numbers
- NOT words like `admin`, `dashboard`, or `manage`
- Example: `j4k9r2xw` or `fpl-admin-k72m`

Write both values down somewhere safe.

---

**M-PESA (fill in Part 4 before doing this)**
```
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=
MPESA_TILL_NUMBER=
MPESA_PASSKEY=
MPESA_B2C_INITIATOR=
MPESA_B2C_SECURITY_CREDENTIAL=
MPESA_CALLBACK_URL=https://YOURDOMAIN.vercel.app/api/mpesa/callback
MPESA_B2C_RESULT_URL=https://YOURDOMAIN.vercel.app/api/mpesa/b2c-result
MPESA_ENVIRONMENT=production
```

`MPESA_SHORTCODE` is your Store Number (used for password generation).
`MPESA_TILL_NUMBER` is your actual Till Number (where customers send money).
Leave the callback URLs as placeholders for now — you will update them after deployment in Part 9.

> **Payout note:** B2C automatic payouts require a Paybill number, not a Till. If you only have a Till, use the **Mark as Sent** feature in the admin panel after paying winners manually. See Part 12 for details.

---

**PAYPAL**
```
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
NEXT_PUBLIC_PAYPAL_CLIENT_ID=
PAYPAL_ENVIRONMENT=sandbox
```

PayPal entry is currently shown as "Coming Soon" to users. These variables are needed for when you activate it in future. Leave them blank for now if you are not activating PayPal yet.

---

**FPL LEAGUE**
```
FPL_LEAGUE_ID=123456
FPL_LEAGUE_JOIN_URL=https://fantasy.premierleague.com/leagues/auto-join/yourcode
```

See Part 6 for how to find these values.

---

**CONTACT INFO (shown in the footer)**
```
CONTACT_WHATSAPP=254712345678
CONTACT_INSTAGRAM=yourhandle
CONTACT_TIKTOK=yourhandle
CONTACT_EMAIL=hello@yourdomain.com
CONTACT_FACEBOOK=yourpage
CONTACT_X=yourhandle
```

Any you leave blank simply won't show in the footer.

---

**CRON SECRET**
```
CRON_SECRET=makesomethingrandomlikeabc123xyz789
```

Just type any random string of 20+ characters. This protects your automated background jobs.

---

## PART 4 — Set Up M-Pesa (Safaricom Daraja)

This lets managers pay their entry fee via M-Pesa STK Push (the "Enter PIN to pay" prompt on their phone).

### Step 4.1 — Create a Daraja Developer Account

1. Go to [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
2. Click **Sign Up** and create an account
3. Verify your email and log in

### Step 4.2 — Create an App

1. Click **My Apps** in the top menu
2. Click **+ Add a new App**
3. Name: `FPL123`
4. Tick **Lipa na M-Pesa** (for STK Push)
5. Click **Create App**

### Step 4.3 — Get Your Keys

1. Click your app name to open it
2. Copy the **Consumer Key** and **Consumer Secret**

### Step 4.4 — Get Your STK Push Credentials

For production (live), use your real credentials:
- **MPESA_SHORTCODE** — your Store Number (found in your Daraja portal under Go Live)
- **MPESA_TILL_NUMBER** — your Buy Goods Till Number
- **MPESA_PASSKEY** — your production passkey (from Daraja portal after going live)

For testing first (sandbox), use these shared test credentials:
- **MPESA_SHORTCODE:** `174379`
- **MPESA_TILL_NUMBER:** `174379`
- **MPESA_PASSKEY:** `bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919`
- **MPESA_ENVIRONMENT:** `sandbox`

### Step 4.5 — Fill in .env.local

```
MPESA_CONSUMER_KEY=your-consumer-key
MPESA_CONSUMER_SECRET=your-consumer-secret
MPESA_SHORTCODE=your-store-number
MPESA_TILL_NUMBER=your-till-number
MPESA_PASSKEY=your-passkey
MPESA_B2C_INITIATOR=testapi
MPESA_B2C_SECURITY_CREDENTIAL=Safaricom999!
MPESA_ENVIRONMENT=production
```

---

## PART 5 — Set Up Your FPL League

FPL123 verifies that entering managers are in your private FPL league. This prevents random people from entering.

### Step 5.1 — Create a Private FPL League (if you haven't already)

1. Go to [fantasy.premierleague.com](https://fantasy.premierleague.com)
2. Log in → click **Leagues** → **Create league**
3. Name it (e.g. "FPL123 Official") and set it to **Private**
4. Click **Create league**

### Step 5.2 — Find Your League ID

1. Go to your league's standings page
2. Look at the URL — it looks like:
   `https://fantasy.premierleague.com/leagues/123456/standings/c`
3. The number (`123456`) is your League ID

### Step 5.3 — Get Your Join Link

1. On your league page, click **Invite & Join**
2. Copy the **auto-join link** — it looks like:
   `https://fantasy.premierleague.com/leagues/auto-join/abc123xyz`

### Step 5.4 — Fill in .env.local

```
FPL_LEAGUE_ID=123456
FPL_LEAGUE_JOIN_URL=https://fantasy.premierleague.com/leagues/auto-join/abc123xyz
```

Share the join URL with your managers — they must join before they can enter FPL123.

---

## PART 6 — Test Locally

Before going live, confirm everything works on your computer.

### Step 6.1 — Start the Development Server

```
npm run dev
```

You'll see:
```
▲ Next.js 15.x.x
- Local:   http://localhost:3000
✓ Ready in 2.5s
```

### Step 6.2 — Open the Homepage

Go to `http://localhost:3000` — you should see the FPL123 homepage.

If you see an error, read it carefully — it usually names the missing `.env.local` variable.

### Step 6.3 — Access the Admin Panel

Go to `http://localhost:3000/YOUR-ADMIN-SECRET-PATH` and enter your admin password.

### Step 6.4 — Configure the First Gameweek

1. Click **GW Controls** in the sidebar
2. Set the **Gameweek Number** (check the current GW at fantasy.premierleague.com)
3. Click **Fetch** next to the deadline field — auto-pulls the deadline from FPL
4. Set your **Entry Fee** in KES (e.g. `200`)
5. Under **Giveaway Type**, choose **Money**
6. Configure payout percentages — they must add up to exactly 100%
   Example: 1st Place: 60%, 2nd Place: 30%, Platform: 10%
7. Click **Save GW Settings**
8. Toggle **Registration Status** to OPEN → Save again

### Step 6.5 — Add an Announcement (Optional)

1. Click **Announcements** in the sidebar
2. Type a message like: `GW22 is open! Entry fee: KES 200. Deadline: Friday 11:30am 🏆`
3. Toggle visibility ON → Save

---

## PART 7 — Push to GitHub

### Step 7.1 — Create a GitHub Account

Go to [github.com](https://github.com) and sign up if you don't have an account.

### Step 7.2 — Create a New Repository

1. Click **+** → **New repository**
2. Name: `fpl123`
3. Set to **Private** — keeps your admin path private
4. Do NOT tick "Add a README file"
5. Click **Create repository**

### Step 7.3 — Push Your Code

```
git init
git add .
git commit -m "Initial FPL123 build"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/fpl123.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your GitHub username.

---

## PART 8 — Deploy to Vercel

### Step 8.1 — Create a Vercel Account

Go to [vercel.com](https://vercel.com) → Sign Up with your GitHub account.

### Step 8.2 — Import Your Project

1. Click **Add New → Project**
2. Find `fpl123` and click **Import**
3. Vercel detects it as Next.js automatically — no changes needed

### Step 8.3 — Add Environment Variables

**Before clicking Deploy**, scroll down to **Environment Variables** and add every variable from your `.env.local` file.

| Variable Name | Where to Get It |
|--------------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `ADMIN_SECRET_PATH` | The secret string you chose |
| `ADMIN_PASSWORD` | The admin password you chose |
| `MPESA_CONSUMER_KEY` | Daraja portal |
| `MPESA_CONSUMER_SECRET` | Daraja portal |
| `MPESA_SHORTCODE` | Your Store Number |
| `MPESA_TILL_NUMBER` | Your Till Number |
| `MPESA_PASSKEY` | Your passkey |
| `MPESA_B2C_INITIATOR` | `testapi` (until you have a Paybill) |
| `MPESA_B2C_SECURITY_CREDENTIAL` | `Safaricom999!` (until you have a Paybill) |
| `MPESA_ENVIRONMENT` | `production` |
| `PAYPAL_CLIENT_ID` | PayPal Developer portal (or leave blank) |
| `PAYPAL_CLIENT_SECRET` | PayPal Developer portal (or leave blank) |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Same as `PAYPAL_CLIENT_ID` (or leave blank) |
| `PAYPAL_ENVIRONMENT` | `sandbox` |
| `FPL_LEAGUE_ID` | Your league number |
| `FPL_LEAGUE_JOIN_URL` | Your league auto-join URL |
| `CONTACT_WHATSAPP` | Your WhatsApp number |
| `CONTACT_INSTAGRAM` | Your Instagram handle |
| `CONTACT_TIKTOK` | Your TikTok handle |
| `CONTACT_EMAIL` | Your email |
| `CONTACT_FACEBOOK` | Your Facebook page |
| `CONTACT_X` | Your X/Twitter handle |
| `CRON_SECRET` | The random string you made |

To add each one: click **Name**, type the variable name, tab to **Value**, paste the value, click **Add**.

### Step 8.4 — Deploy

Click **Deploy**. This takes 2–4 minutes. When done you'll see a green success screen with your live URL — something like `https://fpl123-abc123.vercel.app`.

**Click that URL. Your site is live.**

### Step 8.5 — Update M-Pesa Callback URLs

Now that you have a real URL:

1. In Vercel → your project → **Settings → Environment Variables**
2. Update `MPESA_CALLBACK_URL` to:
   `https://your-actual-url.vercel.app/api/mpesa/callback`
3. Update `MPESA_B2C_RESULT_URL` to:
   `https://your-actual-url.vercel.app/api/mpesa/b2c-result`
4. Go to **Deployments** → click the three dots on your latest deployment → **Redeploy**

---

## PART 9 — Set Up a Custom Domain (Strongly Recommended)

A custom domain like `fpl123.co.ke` makes your platform look professional and trustworthy.

### Step 9.1 — Buy a Domain

- [Namecheap](https://namecheap.com) — affordable, good for `.co.ke` and `.com`
- [KENIC](https://kenic.or.ke) — for `.ke` domains

### Step 9.2 — Connect to Vercel

1. Vercel → your project → **Settings → Domains**
2. Type your domain name and click **Add**
3. Vercel shows DNS records to add — usually an A record and a CNAME
4. Log into your domain registrar's DNS settings and add those records
5. Wait 10–30 minutes for DNS to propagate

Vercel provides free HTTPS automatically.

### Step 9.3 — Update M-Pesa URLs Again

After connecting your custom domain, update the callbacks one final time:
```
MPESA_CALLBACK_URL=https://fpl123.co.ke/api/mpesa/callback
MPESA_B2C_RESULT_URL=https://fpl123.co.ke/api/mpesa/b2c-result
```
Then redeploy.

---

## PART 10 — Weekly Gameweek Operations

Use this checklist every gameweek.

### Opening a New GW (before the FPL deadline)

- [ ] Share the FPL league join URL so managers can join
- [ ] **GW Controls** → update the Gameweek Number
- [ ] **GW Controls** → click **Fetch** to auto-pull the deadline
- [ ] **GW Controls** → confirm the Entry Fee is correct
- [ ] **GW Controls** → toggle Registration to **OPEN** → Save
- [ ] **Announcements** → write a message → toggle visible → Save
- [ ] Share your website URL with managers

### After the GW Deadline

The system auto-allocates groups after the deadline. Verify:

- [ ] **Group Management** → groups should appear (auto-created by cron)
- [ ] If not auto-created → click **Trigger Group Allocation** manually
- [ ] If groups look wrong → use **Shuffle Groups** to reallocate
- [ ] **GW Controls** → toggle Registration to **CLOSED** → Save

### During the Gameweek

- [ ] Points auto-refresh every 30 minutes via cron job
- [ ] For a manual refresh: **Standings & Points** → **Refresh Points Now**
- [ ] Share the standings URL with managers (they need FPL ID + PIN)

### After the GW Finalises (Monday/Tuesday)

1. [ ] **Standings & Points** → **Refresh Points Now** (final sync)
2. [ ] **GW Controls** → click **End Gameweek** → confirm
3. [ ] **Payouts** → **Generate Records** (creates payout row for each winner)
4. [ ] **Payouts** → **Preview Payouts** → check every winner and amount
5. [ ] **Pay winners manually** — send each winner their prize via M-Pesa on your phone
6. [ ] **Payouts** → click **Mark as Sent** next to each winner (or **Mark All as Sent**)
7. [ ] Confirm all payouts show **sent** status
8. [ ] **Update Hall of Fame**
9. [ ] **Announce Results** (saves GW to History as hidden)
10. [ ] Optionally: **History** → toggle the GW visible to public
11. [ ] **Announcements** → update banner with results e.g. "GW22 Results: 🥇 John Doe (87 pts) wins KES 4,800!"

Repeat from the top for the next gameweek.

---

## PART 11 — User Management

The **User Management** section in the admin sidebar gives you three tools for managing users directly.

### Unconfirm Users

Moves confirmed users back to pending status. They reappear in Entries & Payments where you can re-review them. Their PIN stays active. Use this if you confirmed someone by mistake.

You can unconfirm one user at a time or select multiple and use **Unconfirm Selected**.

### Add User Manually

For users who paid outside the system (cash, bank transfer, etc.). Fill in:
- FPL Team ID, Manager Name, FPL Team Name
- Payment Method: Manual / M-Pesa / PayPal
- Phone or email (optional but useful for payout records)
- Notes (e.g. "Paid via bank transfer 12 Jan")

The user is created as **confirmed** with a generated PIN. Tell them their PIN so they can access standings.

### Add User to Group

Assigns a confirmed user to a group after group allocation has already run. Choose a specific group from the dropdown, or select "Assign Randomly" to let the system pick any group with fewer than 32 members.

This is useful when a user registered late or was added manually after groups were allocated.

---

## PART 12 — Payouts Reference

### How payouts work

1. After the gameweek ends, click **Generate Records** — this creates a payout row for each winner based on standings.
2. Click **Preview Payouts** to review every winner and their prize amount before any money moves.
3. Pay winners yourself on your phone via M-Pesa (person-to-person or from your business account).
4. Click **Mark as Sent** next to each winner you've paid, or **Mark All as Sent** to mark all at once.
5. After all payouts are marked sent, click **Update Hall of Fame** then **Announce Results**.

### Payout amount calculation

Each group's pot = number of members × entry fee.
Platform cut is deducted first (configured in GW Controls — e.g. 10%).
The remaining pot is split by position percentages (e.g. 60% to 1st, 30% to 2nd).

Example with 10 members, KES 200 entry fee, 10% platform cut:
- Group pot: KES 2,000
- Platform cut: KES 200
- Distributable: KES 1,800
- 1st place (60%): KES 1,080
- 2nd place (30%): KES 540

### Upgrading to automatic payouts (future)

When you have a Safaricom Paybill number:
1. Update `MPESA_SHORTCODE` to your Paybill number
2. Update `MPESA_B2C_INITIATOR` and `MPESA_B2C_SECURITY_CREDENTIAL` with your production B2C credentials
3. Redeploy
4. The **Trigger All Payouts** button will then send money automatically via M-Pesa B2C

---

## PART 13 — Troubleshooting

### "Registration is currently closed" on homepage
Admin → GW Controls → toggle Registration to OPEN → Save.

### Manager can't enter — "not in our FPL league"
They haven't joined your FPL league. Send them the join URL from `.env.local`.

### M-Pesa payment shows "pending" and never confirms
Possible causes:
- Your `MPESA_CALLBACK_URL` points to `localhost` or wrong domain — update in Vercel
- The phone number format is wrong — must be `254XXXXXXXXX` (no +, no leading 0)
- Safaricom is slow — wait a few minutes

**Quick fix:** Admin → Entries & Payments → find the entry → click **Confirm** manually.

### M-Pesa STK Push not triggering at all
Check that `MPESA_TILL_NUMBER` is set in Vercel environment variables. It is separate from `MPESA_SHORTCODE`. Both must be filled in.

### Payout shows "B2C payment failed"
This means automatic B2C payout failed. Most likely cause: you are using a Till number, not a Paybill. Use **Mark as Sent** after paying winners manually instead. See Part 12.

### Groups didn't auto-allocate after deadline
Admin → Group Management → click **Trigger Group Allocation** manually.

### Need to redo group allocation
Admin → Group Management → **Shuffle Groups** to reshuffle everyone randomly, or **Undo Allocation** to wipe all groups and start fresh. Entries and payments are never affected.

### Payouts section shows a lock screen
You need to end the gameweek first. Admin → GW Controls → click **End Gameweek**.

### Points not updating on standings page
Admin → Standings & Points → **Refresh Points Now**. Then wait 30 seconds and hard-refresh (Ctrl+Shift+R).

### I forgot my ADMIN_SECRET_PATH or ADMIN_PASSWORD
Vercel → your project → **Settings → Environment Variables** → look up the values there.

### App works locally but fails after deployment
Most common cause: a missing environment variable in Vercel. Compare your `.env.local` against Vercel → Settings → Environment Variables.

### Build fails on Vercel
Vercel → your project → **Deployments** → click the failed deployment → scroll to the bottom of the build logs. The error is always near the bottom in red.

### User was added manually but has no group
Go to **User Management** → find the user → click **Add to Group**. Select a specific group or assign randomly.

---

## PART 14 — Admin Panel Reference

| Section | What It Does |
|---------|-------------|
| **Dashboard** | Overview of current GW — confirmed entries, revenue, groups, pending payments |
| **GW Controls** | Set gameweek number, deadline, entry fee, payout splits, open/close registration, end GW |
| **Entries & Payments** | View, filter, confirm, decline, refund, disqualify entries. Filter by GW, status, payment method. Bulk actions available. |
| **User Management** | Add users manually, unconfirm users, assign users to groups after allocation |
| **Group Management** | Trigger, shuffle, or undo group allocation |
| **Standings & Points** | Refresh FPL points, view all group standings |
| **Payouts** | Generate records, preview, mark as sent, update Hall of Fame, announce results |
| **Announcements** | Homepage banner — set message text and toggle visibility |
| **Hall of Fame** | Toggle HOF page visibility |
| **History** | Toggle individual GW result pages as visible to public |
| **Blacklist** | Block FPL IDs, phone numbers, or emails from entering |
| **Terms & Conditions** | Edit the T&C text shown to users |
| **Platform Settings** | Change platform name, danger zone (reset data) |

---

## PART 15 — File Reference

```
fpl123/
├── SETUP_GUIDE.md
├── .env.local.example          ← Copy this to .env.local and fill it in
├── vercel.json                 ← Cron job schedule (3 background jobs)
├── package.json
├── tailwind.config.ts          ← Brand colours and fonts
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql        ← Run first (Step 2.2)
│       └── 002_manual_payment_and_fixes.sql  ← Run second (Step 2.3)
└── src/
    ├── app/
    │   ├── page.tsx                    ← Homepage
    │   ├── enter/page.tsx              ← Entry flow (M-Pesa · PayPal coming soon)
    │   ├── standings/page.tsx          ← PIN-gated group standings
    │   ├── hall-of-fame/page.tsx       ← All-time leaderboard
    │   ├── history/page.tsx            ← Past GW results
    │   ├── terms/page.tsx              ← Terms & Conditions
    │   └── [adminPath]/
    │       ├── page.tsx                ← Admin login screen
    │       └── dashboard/
    │           ├── page.tsx            ← Dashboard home
    │           ├── gw-controls/        ← GW settings and lifecycle
    │           ├── entries/            ← Entries & Payments
    │           ├── user-management/    ← Add users, unconfirm, add to group
    │           ├── groups/             ← Group allocation
    │           ├── standings/          ← Points refresh and viewing
    │           ├── payouts/            ← Payouts with mark-as-sent
    │           ├── announcements/      ← Homepage banner
    │           ├── hall-of-fame/       ← HOF settings
    │           ├── history/            ← History visibility
    │           ├── blacklist/          ← Blocked users
    │           ├── terms/              ← T&C editor
    │           └── settings/           ← Platform settings
    ├── app/api/
    │   ├── settings/                   ← Public settings endpoint
    │   ├── fpl/verify/                 ← FPL ID and league check
    │   ├── register/                   ← Create entry before payment
    │   ├── mpesa/
    │   │   ├── initiate/               ← STK Push trigger
    │   │   ├── status/                 ← Poll payment status
    │   │   ├── callback/               ← Safaricom webhook
    │   │   └── b2c-result/             ← B2C payout webhook
    │   ├── paypal/
    │   │   ├── create-order/
    │   │   └── capture-order/
    │   ├── manager/[fplId]/            ← PIN auth for standings
    │   ├── standings/[groupId]/        ← Group standings data
    │   └── admin/
    │       ├── settings/               ← Read/write admin settings
    │       ├── entries/                ← List entries (GW filter supported)
    │       │   ├── confirm/            ← Confirm a payment manually
    │       │   ├── decline/            ← Delete pending entries
    │       │   ├── unconfirm/          ← Move back to pending
    │       │   ├── add-user/           ← Create confirmed entry manually
    │       │   └── add-to-group/       ← Assign entry to a group
    │       ├── groups/                 ← Groups with member counts
    │       │   ├── undo/               ← Delete all groups for current GW
    │       │   └── shuffle/            ← Reallocate groups randomly
    │       ├── assign-groups/          ← Trigger group allocation
    │       ├── end-gameweek/           ← Mark GW ended, unlock payouts
    │       ├── payouts/
    │       │   ├── route.ts            ← Fetch payout records
    │       │   ├── preview/            ← Preview winners before paying
    │       │   ├── generate/           ← Create payout records from standings
    │       │   └── mark-sent/          ← Mark payouts as paid manually
    │       ├── trigger-payouts/        ← Automatic B2C/PayPal payout (Paybill required)
    │       ├── refund/                 ← Refund and delete an entry
    │       ├── disqualify/             ← Disqualify an entry
    │       ├── pin/                    ← Revoke or restore a PIN
    │       ├── hall-of-fame/update/    ← Update HOF after payouts
    │       ├── history/announce/       ← Write GW to history table
    │       ├── fetch-deadline/         ← Pull deadline from FPL API
    │       ├── announcements/          ← Banner CRUD
    │       ├── blacklist/              ← Manage blocked users
    │       └── cron/                   ← Background job endpoints
    ├── components/
    │   ├── layout/Header.tsx
    │   ├── layout/Footer.tsx
    │   ├── layout/AdminSidebar.tsx     ← 13-item nav including User Management
    │   ├── entry/StepIndicator.tsx
    │   ├── entry/ManagerCard.tsx
    │   ├── entry/ConfirmationScreen.tsx
    │   ├── shared/CountdownTimer.tsx
    │   ├── shared/PinDisplay.tsx
    │   └── shared/AnnouncementBanner.tsx
    ├── lib/
    │   ├── fpl.ts
    │   ├── mpesa.ts                    ← STK Push (Till) + B2C (Paybill)
    │   ├── paypal.ts
    │   ├── supabase.ts
    │   ├── groups.ts
    │   ├── pin.ts
    │   ├── logger.ts
    │   ├── admin-auth.ts
    │   └── utils.ts
    └── types/index.ts
```

---

## Quick Reference: Important URLs

| URL | What It Is |
|-----|-----------|
| `yourdomain.com` | Public homepage |
| `yourdomain.com/enter` | Manager entry flow |
| `yourdomain.com/standings` | Group standings (PIN required) |
| `yourdomain.com/hall-of-fame` | All-time leaderboard |
| `yourdomain.com/history` | Past GW results |
| `yourdomain.com/terms` | Terms & Conditions |
| `yourdomain.com/YOUR-SECRET-PATH` | **Admin panel** |

---

## Quick Reference: Push to GitHub / Deploy

After making any changes to your code:

```bash
git add .
git commit -m "describe what you changed"
git push
```

Vercel automatically redeploys whenever you push to GitHub. Deployment takes 2–4 minutes. Monitor it at vercel.com → your project → Deployments.

---

*Built with Next.js 15, Supabase, Tailwind CSS, M-Pesa Daraja API, and PayPal REST API.*
*Deployed on Vercel with automated background jobs via Vercel Cron.*
