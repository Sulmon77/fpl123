# FPL123 — Complete Setup & Deployment Guide

> **Reading time:** ~15 minutes  
> **Setup time:** 2–3 hours (including account creation)  
> **You do not need to be a developer.** Every step is written in plain English.

---

## What You're Building

FPL123 is a web platform where FPL managers pay a small entry fee each gameweek, get randomly grouped with up to 32 other managers, and the top performers win prizes — distributed automatically via M-Pesa or PayPal.

This guide takes you from **downloading the zip file** all the way to a **live, working website**.

---

## What's Already Done vs What You'll Complete

### ✅ Fully Built (works out of the box)
- Complete homepage with countdown timer, prize info, and how-it-works section
- Full 4-step entry flow: FPL ID → verify → M-Pesa/PayPal payment → PIN reveal
- Group standings page (PIN-gated, auto-refreshing)
- Hall of Fame page (shows all-time winners)
- History page (past GW results)
- Terms & Conditions page
- Complete admin panel with 12 sections
- All M-Pesa payment flows (STK Push, webhook callback, B2C payouts)
- PayPal order creation and capture (API routes done)
- FPL API integration (manager lookup, league verification, points sync)
- Group allocation logic (random shuffle, groups of up to 32)
- 3 automated background jobs (deadline sync, group auto-allocation, standings refresh)
- Blacklist, disqualification, refunds, PIN management
- Database schema with all tables, security rules, and indexes

### 🔧 You'll Complete in Cursor (4 short prompts — ~1 hour total)
1. **PayPal button** — wire up the PayPal JS SDK button in the entry flow
2. **Generate payout records** — create DB records for winners before paying out
3. **Update Hall of Fame** — populate the all-time leaderboard after each GW
4. **Announce results** — write GW winners to the public history table

All 4 have **ready-to-paste prompts** in Part 11 of this guide.

---

## Tools You Need (All Free)

| Tool | What It Does | Get It From |
|------|-------------|-------------|
| Node.js (LTS) | Runs the app | [nodejs.org](https://nodejs.org) |
| VS Code | Code editor | [code.visualstudio.com](https://code.visualstudio.com) |
| Git | Version control | [git-scm.com](https://git-scm.com) |
| Cursor | AI coding assistant | [cursor.sh](https://cursor.sh) |
| GitHub account | Stores your code | [github.com](https://github.com) |
| Supabase account | Your database | [supabase.com](https://supabase.com) |
| Vercel account | Hosts your website | [vercel.com](https://vercel.com) |
| Safaricom Daraja | M-Pesa payments | [developer.safaricom.co.ke](https://developer.safaricom.co.ke) |
| PayPal Developer | PayPal payments | [developer.paypal.com](https://developer.paypal.com) |

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
   - **Region:** pick the region closest to your users (e.g. West EU for Kenya is fine)
5. Click **Create new project**
6. Wait about 2 minutes for it to finish setting up

### Step 2.2 — Create Your Database Tables

This step creates all the tables your app needs (entries, groups, payouts, settings, etc.).

1. In your Supabase project, look at the left sidebar and click **SQL Editor**
2. Click **New query** (the `+` button)
3. Go back to VS Code
4. In the left file panel, navigate to: `supabase` → `migrations` → `001_initial_schema.sql`
5. Click that file to open it
6. Press **Ctrl+A** (or Cmd+A) to select all text, then **Ctrl+C** to copy
7. Click back on the Supabase SQL Editor tab in your browser
8. Click inside the query box and press **Ctrl+V** to paste
9. Click **Run** (the green button, or press Ctrl+Enter)
10. You should see: `Success. No rows returned`

If you see a red error, make sure you copied the entire file including everything at the top.

### Step 2.3 — Copy Your Supabase Keys

You need three pieces of information from Supabase. Keep this browser tab open.

1. In Supabase, click the **Settings** icon (gear) in the left sidebar
2. Click **API**
3. Find and copy these three values — you'll paste them in the next part:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon / public key** — a very long string starting with `eyJ`
   - **service_role key** — another long string starting with `eyJ`

⚠️ **The service_role key is a master key. Never share it or post it publicly.**

---

## PART 3 — Configure Your Environment Variables

Environment variables are your app's private settings — API keys, passwords, URLs. They live in a file that never gets shared or uploaded to GitHub.

### Step 3.1 — Create .env.local

1. In VS Code's file panel, find the file called `.env.local.example`
2. Right-click it → **Copy**
3. Right-click anywhere in the file panel → **Paste**
4. A new file appears — rename it to exactly `.env.local` (delete the `.example` part)
5. Click on `.env.local` to open it

### Step 3.2 — Fill In Every Value

Go through the file and fill in each variable. Here's what each one means:

---

**SUPABASE (from Step 2.3)**
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

`ADMIN_SECRET_PATH` is the secret URL where your admin panel lives. For example, if you set it to `gx7k2m9p`, your admin panel will be at `yourdomain.com/gx7k2m9p`. 

Rules for a good secret path:
- At least 8 characters
- Mix of letters and numbers
- NOT words like `admin`, `dashboard`, or `manage`
- Example: `j4k9r2xw` or `fpl-admin-k72m`

Write your secret path and admin password down somewhere safe. If you forget them, you'll need to check Vercel's environment variable settings later.

---

**M-PESA (fill in Part 4 of this guide before doing this)**
```
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=
MPESA_PASSKEY=
MPESA_B2C_INITIATOR=
MPESA_B2C_SECURITY_CREDENTIAL=
MPESA_CALLBACK_URL=https://YOURDOMAIN.vercel.app/api/mpesa/callback
MPESA_B2C_RESULT_URL=https://YOURDOMAIN.vercel.app/api/mpesa/b2c-result
MPESA_ENVIRONMENT=sandbox
```

Leave the callback URLs as placeholders for now — you'll update them after deployment in Part 8.

---

**PAYPAL (fill in Part 5 of this guide before doing this)**
```
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_ENVIRONMENT=sandbox
```

---

**FPL LEAGUE**
```
FPL_LEAGUE_ID=123456
FPL_LEAGUE_JOIN_URL=https://fantasy.premierleague.com/leagues/auto-join/yourcode
```

How to find these — see Part 6 of this guide.

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

Fill in your real contact details. Any you leave blank simply won't show in the footer.

---

**CRON SECRET (auto-generated)**
```
CRON_SECRET=makesomethingrandomlikeabc123xyz789
```

This protects your automated background jobs. Just type any random string of 20+ characters.

---

## PART 4 — Set Up M-Pesa (Safaricom Daraja)

This lets managers pay via M-Pesa STK Push (the "Enter PIN to pay" prompt on their phone).

### Step 4.1 — Create a Daraja Developer Account

1. Go to [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
2. Click **Sign Up** and create an account
3. Verify your email
4. Log in

### Step 4.2 — Create an App

1. Click **My Apps** in the top menu
2. Click **+ Add a new App**
3. Name: `FPL123`
4. Tick both **Lipa na M-Pesa Sandbox** (for STK Push) and **M-Pesa for Business Sandbox** (for B2C payouts)
5. Click **Create App**

### Step 4.3 — Get Your Sandbox Keys

1. Click your app name to open it
2. You'll see:
   - **Consumer Key** — copy this
   - **Consumer Secret** — copy this

### Step 4.4 — Get Sandbox STK Push Credentials

For testing (sandbox), Safaricom provides shared test credentials:

- **Shortcode:** `174379`
- **Passkey:** `bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919`

Use these in `.env.local` for now. When you go live, you'll replace them with your real Paybill/Till credentials.

### Step 4.5 — B2C Credentials (for sending payouts)

For sandbox, B2C initiator credentials are also shared test values:
- **B2C Initiator:** `testapi`
- **Security Credential:** Get this from your Daraja portal under **B2C** section, or use `Safaricom999!` for sandbox testing

### Step 4.6 — Fill in .env.local

```
MPESA_CONSUMER_KEY=your-consumer-key-from-step-4-3
MPESA_CONSUMER_SECRET=your-consumer-secret-from-step-4-3
MPESA_SHORTCODE=174379
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
MPESA_B2C_INITIATOR=testapi
MPESA_B2C_SECURITY_CREDENTIAL=Safaricom999!
MPESA_ENVIRONMENT=sandbox
```

---

## PART 5 — Set Up PayPal

This lets managers outside Kenya pay via PayPal.

### Step 5.1 — Access PayPal Developer Portal

1. Go to [developer.paypal.com](https://developer.paypal.com)
2. Log in with your regular PayPal account (or create one at [paypal.com](https://paypal.com))
3. Once logged in, click **Apps & Credentials**

### Step 5.2 — Create a Sandbox App

1. Make sure you're on the **Sandbox** tab
2. Click **Create App**
3. Name: `FPL123`
4. App type: **Merchant**
5. Click **Create App**

### Step 5.3 — Copy Your Credentials

From the app page:
- Copy the **Client ID** (visible immediately)
- Click **Show** under the Client Secret, then copy it

### Step 5.4 — Fill in .env.local

```
PAYPAL_CLIENT_ID=your-client-id
PAYPAL_CLIENT_SECRET=your-client-secret
PAYPAL_ENVIRONMENT=sandbox
```

---

## PART 6 — Set Up Your FPL League

FPL123 verifies that entering managers are in your private FPL league. This prevents random people from entering.

### Step 6.1 — Create a Private FPL League (if you haven't already)

1. Go to [fantasy.premierleague.com](https://fantasy.premierleague.com)
2. Log in
3. Click **Leagues** → **Create league**
4. Name it (e.g. "FPL123 Official") and set it to **Private**
5. Click **Create league**

### Step 6.2 — Find Your League ID

1. In FPL, go to your league's standings page
2. Look at the URL in your browser — it looks like:  
   `https://fantasy.premierleague.com/leagues/123456/standings/c`
3. The number (`123456`) is your League ID

### Step 6.3 — Get Your Join Link

1. On your league page, click **Invite & Join**
2. Copy the **auto-join link** — it looks like:  
   `https://fantasy.premierleague.com/leagues/auto-join/abc123xyz`

### Step 6.4 — Fill in .env.local

```
FPL_LEAGUE_ID=123456
FPL_LEAGUE_JOIN_URL=https://fantasy.premierleague.com/leagues/auto-join/abc123xyz
```

Share the join URL with your managers — they must join your FPL league before they can enter FPL123.

---

## PART 7 — Test Locally

Before going live, confirm everything works on your computer.

### Step 7.1 — Start the Development Server

In the VS Code terminal:

```
npm run dev
```

You'll see something like:
```
▲ Next.js 14.x.x
- Local:   http://localhost:3000
✓ Ready in 2.5s
```

### Step 7.2 — Open the Homepage

1. Open your browser
2. Go to `http://localhost:3000`
3. You should see the FPL123 homepage with a countdown timer and entry button

If you see an error, the most likely cause is a missing or incorrectly formatted `.env.local` value. Read the error message carefully — it usually tells you which variable is missing.

### Step 7.3 — Access the Admin Panel

1. Go to `http://localhost:3000/YOUR-ADMIN-SECRET-PATH`  
   (replace `YOUR-ADMIN-SECRET-PATH` with the value you set in `.env.local`)
2. Enter your admin password
3. You should see the admin dashboard

### Step 7.4 — Configure the First Gameweek

Once inside the admin panel:

1. Click **GW Controls** in the left sidebar
2. Set the **Gameweek Number** (check the current GW at fantasy.premierleague.com)
3. Click **Fetch** next to the deadline field — this automatically pulls the GW deadline from the FPL API
4. Set your **Entry Fee** in KES (e.g. `200`)
5. Under **Giveaway Type**, choose **Money** (for cash prizes) or **Shoutout** (for social recognition)
6. If Money: configure your payout percentages. They must add up to exactly 100%.  
   Example: 1st Place: 60%, 2nd Place: 30%, Platform: 10%
7. Click **Save GW Settings**
8. Flip the **Registration Status** toggle to OPEN
9. Click **Save GW Settings** again

### Step 7.5 — Add an Announcement (Optional)

1. Click **Announcements** in the sidebar
2. Type a welcome message like: `GW22 is open! Entry fee: KES 200. Deadline: Friday 11:30am 🏆`
3. Toggle visibility ON
4. Click **Save Announcement**

The banner will appear at the top of your homepage.

---

## PART 8 — Push to GitHub

GitHub stores your code and connects to Vercel for deployment.

### Step 8.1 — Create a GitHub Account

Go to [github.com](https://github.com) and sign up if you don't have an account.

### Step 8.2 — Create a New Repository

1. Click the **+** icon in the top right → **New repository**
2. Name: `fpl123`
3. Set to **Private** — important, this keeps your admin path structure private
4. Do NOT tick "Add a README file"
5. Click **Create repository**

### Step 8.3 — Push Your Code

GitHub will show you a page with commands. Use these in your VS Code terminal:

```
git init
git add .
git commit -m "Initial FPL123 build"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/fpl123.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your actual GitHub username.

When prompted, enter your GitHub username and password (or a Personal Access Token if you have 2FA enabled — GitHub will guide you).

---

## PART 9 — Deploy to Vercel

Vercel hosts your app on the internet for free.

### Step 9.1 — Create a Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Click **Sign Up** and use your GitHub account — this connects them automatically

### Step 9.2 — Import Your Project

1. On the Vercel dashboard, click **Add New → Project**
2. You'll see a list of your GitHub repositories
3. Find `fpl123` and click **Import**
4. Vercel detects it as a Next.js project automatically — no changes needed

### Step 9.3 — Add Environment Variables

**Before clicking Deploy**, scroll down to find **Environment Variables**.

Add each variable from your `.env.local` file. Here's the complete list:

| Variable Name | Where to Get It |
|--------------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `ADMIN_SECRET_PATH` | The secret string you chose |
| `ADMIN_PASSWORD` | The admin password you chose |
| `MPESA_CONSUMER_KEY` | Daraja portal |
| `MPESA_CONSUMER_SECRET` | Daraja portal |
| `MPESA_SHORTCODE` | `174379` for sandbox |
| `MPESA_PASSKEY` | The long passkey string |
| `MPESA_B2C_INITIATOR` | `testapi` for sandbox |
| `MPESA_B2C_SECURITY_CREDENTIAL` | `Safaricom999!` for sandbox |
| `MPESA_ENVIRONMENT` | `sandbox` (change to `production` when going live) |
| `PAYPAL_CLIENT_ID` | PayPal Developer portal |
| `PAYPAL_CLIENT_SECRET` | PayPal Developer portal |
| `PAYPAL_ENVIRONMENT` | `sandbox` (change to `live` when going live) |
| `FPL_LEAGUE_ID` | Your league number |
| `FPL_LEAGUE_JOIN_URL` | Your league auto-join URL |
| `CONTACT_WHATSAPP` | Your WhatsApp number |
| `CONTACT_INSTAGRAM` | Your Instagram handle |
| `CONTACT_TIKTOK` | Your TikTok handle |
| `CONTACT_EMAIL` | Your email |
| `CONTACT_FACEBOOK` | Your Facebook page |
| `CONTACT_X` | Your X/Twitter handle |
| `CRON_SECRET` | The random string you made |

To add each one: click the **Name** field, type the variable name, tab to **Value**, paste the value, click **Add**.

### Step 9.4 — Deploy

Click **Deploy**.

Vercel builds your app. This takes 2–4 minutes. When it finishes, you'll see a green "Congratulations" screen with your live URL — something like `https://fpl123-abc123.vercel.app`.

**Click that URL. Your site is live.**

### Step 9.5 — Update M-Pesa Callback URLs

Now that you have a real URL, update the M-Pesa callback variables:

1. In Vercel → your project → **Settings → Environment Variables**
2. Find `MPESA_CALLBACK_URL` and update it to:  
   `https://your-actual-url.vercel.app/api/mpesa/callback`
3. Find `MPESA_B2C_RESULT_URL` and update it to:  
   `https://your-actual-url.vercel.app/api/mpesa/b2c-result`
4. Go to **Deployments**, click the three dots on your latest deployment → **Redeploy**

---

## PART 10 — Set Up a Custom Domain (Strongly Recommended)

A custom domain like `fpl123.co.ke` makes your platform look professional and trustworthy.

### Step 10.1 — Buy a Domain

Buy from any registrar:
- [Namecheap](https://namecheap.com) — affordable, good for `.co.ke` and `.com`
- [Kenya Network Information Centre (KENIC)](https://kenic.or.ke) — for `.ke` domains

### Step 10.2 — Connect to Vercel

1. In Vercel → your project → **Settings → Domains**
2. Type your domain name (e.g. `fpl123.co.ke`) and click **Add**
3. Vercel shows you DNS records to configure — usually two records:
   - An **A record** pointing to Vercel's IP
   - A **CNAME record** for `www`
4. Log into your domain registrar's DNS settings
5. Add those exact records
6. Wait 10–30 minutes for DNS to propagate

Once connected, your site is live at your custom domain. Vercel also provides free HTTPS automatically.

### Step 10.3 — Update M-Pesa URLs Again

If you added a custom domain, update the callback URLs one more time in Vercel's environment variables to use your real domain:
```
MPESA_CALLBACK_URL=https://fpl123.co.ke/api/mpesa/callback
MPESA_B2C_RESULT_URL=https://fpl123.co.ke/api/mpesa/b2c-result
```
Then redeploy.

---

## PART 11 — Complete the Remaining Features in Cursor

Four features need a few lines of code to be wired together. Cursor (the AI coding assistant) will handle all of it — you just paste the prompts below.

### How to Use Cursor

1. Download and install [Cursor](https://cursor.sh) (free)
2. Open Cursor → **File → Open Folder** → select your `fpl123` folder
3. Press **Ctrl+L** (or **Cmd+L** on Mac) to open the AI Chat panel on the right
4. Copy each prompt below and paste it into the chat
5. Press Enter and wait for Cursor to write the code
6. When it's done, press **Accept All** (or review changes file by file)
7. After each feature, run `npm run dev` locally to confirm it works

---

### 🔧 Feature 1: PayPal Button in Entry Flow

The PayPal payment section in the entry flow currently shows a placeholder. This prompt connects it to the real PayPal JavaScript SDK.

**Paste this into Cursor:**

```
In the file src/app/enter/page.tsx, I need to replace the PayPal placeholder 
button with a real PayPal payment button using @paypal/react-paypal-js.

Here is exactly what I need:

1. Import PayPalScriptProvider and PayPalButtons from @paypal/react-paypal-js 
   at the top of the file.

2. Find the section where payment_method === 'paypal' is rendered in Step 3 
   (the payment step). Replace the placeholder PayPal button with a 
   PayPalScriptProvider wrapping a PayPalButtons component.

3. The PayPalScriptProvider should have:
   - clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID or read from a 
     /api/settings endpoint — whichever is simpler
   - currency: "USD"

4. The PayPalButtons should have:
   - createOrder: async function that calls POST /api/paypal/create-order 
     with body { entryId: currentEntryId } and returns the orderId from the 
     response data
   - onApprove: async function that calls POST /api/paypal/capture-order 
     with body { orderId, entryId: currentEntryId }. On success the response 
     will have { success: true, data: { pin, managerName, fplTeamName, 
     gameweekNumber } }. After a successful capture, set the confirmedManager 
     state and the pin state from the response data, then advance to step 4 
     by calling setStep(4)
   - onError: show an error message in the UI saying 
     "PayPal payment failed. Please try again or use M-Pesa."
   - style: {{ layout: 'vertical', color: 'blue', shape: 'rect' }}

5. Disable (or hide) the PayPal button if termsAccepted is false — show a 
   message "Please accept the Terms & Conditions to continue" instead.

6. Wrap the whole PayPal section in a try/catch and show a friendly error 
   if the PayPal script fails to load.

Also add NEXT_PUBLIC_PAYPAL_CLIENT_ID to .env.local.example with a comment 
explaining it's the same value as PAYPAL_CLIENT_ID but exposed to the browser.
```

---

### 🔧 Feature 2: Generate Payout Records

Before you can pay winners, you need to create payout records in the database. This feature adds a button in the admin payouts page that generates those records from the current standings.

**Paste this into Cursor:**

```
I need two things:

FIRST — create a new API route at:
src/app/api/admin/payouts/generate/route.ts

This route:
1. Uses requireAdminAuth from @/lib/admin-auth (POST method)
2. Fetches current settings: gameweek_number, winners_per_group, 
   payout_percentages, entry_fee
3. Fetches all groups for the current GW from the groups table, with their 
   group_members (include: fpl_team_id, manager_name, fpl_team_name, 
   gw_points, standing_position, prize_amount from the group_members table)
4. For each group, take the top N members by standing_position where N = 
   winners_per_group
5. For each winner:
   a. Look up their entry from the entries table using fpl_team_id and 
      gameweek_number to get payment_method, payment_phone, payment_email
   b. Calculate prize_amount:
      - group_pot = group.group_members.length × entry_fee
      - platform_cut_pct = payout_percentages.platform ?? 10
      - distributable = group_pot × (1 - platform_cut_pct / 100)
      - winner_pct = payout_percentages[position.toString()] ?? 0
      - amount = Math.floor(distributable × (winner_pct / 100))
   c. Check if a payout record already exists for this fpl_team_id + 
      gameweek_number — if so, skip it
   d. Insert into payouts table: gameweek_number, fpl_team_id, manager_name,
      fpl_team_name, group_number, position, amount, payment_method, 
      payment_detail (phone for mpesa, email for paypal), status = 'pending'
6. Return { success: true, data: { created: number, skipped: number } }

SECOND — in src/app/[adminPath]/dashboard/payouts/page.tsx:
Add a "Generate Payout Records" button above the existing "Preview Payouts" 
button. When clicked it calls POST /api/admin/payouts/generate, shows a 
loading state, then displays the result like "Created 24 payout records. 
Skipped 0." Disable the button if there are already pending payouts in the 
list. After generating, refetch the payouts list.
```

---

### 🔧 Feature 3: Update Hall of Fame After Payouts

After each gameweek's winners are paid, the Hall of Fame (all-time leaderboard) should be updated.

**Paste this into Cursor:**

```
I need two things:

FIRST — create a new API route at:
src/app/api/admin/hall-of-fame/update/route.ts

This route:
1. Uses requireAdminAuth (POST method)
2. Gets current gameweek_number from settings
3. Fetches all payouts with status = 'sent' for the current GW from the 
   payouts table
4. For each paid-out winner, upserts into the hall_of_fame table. The table 
   has these columns: fpl_team_id, manager_name, fpl_team_name, total_wins, 
   total_points, highest_gw_points, highest_gw_number, total_amount_won, 
   gameweeks_participated. 
   - If a record exists for this fpl_team_id, UPDATE it:
     total_wins += 1
     total_points += (their gw_points from group_members)
     highest_gw_points = MAX(existing, current gw_points)  
     highest_gw_number = the GW where highest occurred
     total_amount_won += payout.amount
     gameweeks_participated += 1
   - If no record exists, INSERT with total_wins=1, etc.
5. Also update gameweeks_participated for ALL confirmed entries this GW 
   (not just winners) — increment their count by 1 (or insert with 0 wins 
   if they don't have a hall_of_fame row yet)
6. Return { success: true, data: { winnersUpdated, participantsUpdated } }

SECOND — in src/app/[adminPath]/dashboard/payouts/page.tsx:
After the "Trigger All Payouts" button area, add an "Update Hall of Fame" 
button that only appears when sentPayouts.length > 0. When clicked it calls 
POST /api/admin/hall-of-fame/update and shows the result. Show a loading 
state while it runs. Display success as "Hall of Fame updated: 24 entries."
```

---

### 🔧 Feature 4: Announce GW Results to History

After paying out, push the GW results to the public history table so they appear on the History page.

**Paste this into Cursor:**

```
I need two things:

FIRST — create a new API route at:
src/app/api/admin/history/announce/route.ts

This route:
1. Uses requireAdminAuth (POST method)
2. Gets current gameweek_number and giveaway_type from settings
3. Gets all sent payouts for the current GW, with their group_number and 
   gw_points (join with group_members on fpl_team_id + gameweek_number)
4. Checks if a giveaway_history record already exists for this gameweek — 
   if yes, update it; if no, insert it
5. The giveaway_history row:
   - gameweek_number: current GW
   - type: settings.giveaway_type ('money', 'shoutout', 'other')
   - description: e.g. "GW22 — 24 winners across 8 groups. Total paid out: 
     KES 38,400."  
   - winners: JSON array of { position, manager_name, fpl_team_name, 
     group_number, gw_points, prize_amount, payment_method }
   - visible_to_public: false (admin can toggle this manually in History admin)
   - total_entries: count of confirmed entries for this GW
   - total_amount: sum of all payout amounts
6. Return { success: true, data: { gameweekNumber, winnersCount } }

SECOND — in src/app/[adminPath]/dashboard/payouts/page.tsx:
Add an "Announce Results" button next to the "Update Hall of Fame" button. 
It only shows when sentPayouts.length > 0. Before calling the API, show a 
browser confirm() dialog: "This will publish GW results to the History page 
(as hidden). Are you sure?" On confirm, call POST /api/admin/history/announce 
and show the result. Disable the button after it's been clicked successfully 
(show "Announced ✓").
```

---

### After Each Feature: Push to GitHub and Redeploy

After completing each Cursor prompt and confirming it works locally:

```
git add .
git commit -m "Add [feature name]"
git push
```

Vercel automatically redeploys when you push to GitHub.

---

## PART 12 — Going Live with Real Payments

Once you've tested with sandbox credentials and everything works:

### Switch M-Pesa to Production

1. Log into your Daraja portal
2. Your app will have a **Go Live** process — Safaricom will ask for your Paybill or Buy Goods Till number and business documents
3. Once approved (can take a few days), you'll get production credentials
4. In Vercel → your project → Settings → Environment Variables, update:
   ```
   MPESA_SHORTCODE = your real Paybill/Till number
   MPESA_PASSKEY = your real passkey (from the Daraja production portal)
   MPESA_B2C_INITIATOR = your real initiator name
   MPESA_B2C_SECURITY_CREDENTIAL = your real encrypted credential
   MPESA_ENVIRONMENT = production
   ```
5. Redeploy (push a small commit or click Redeploy in Vercel)

### Switch PayPal to Production

1. In the PayPal Developer portal, switch to the **Live** tab
2. Create a Live app (same steps as sandbox)
3. Copy your Live Client ID and Secret
4. In Vercel, update:
   ```
   PAYPAL_CLIENT_ID = your live client ID
   PAYPAL_CLIENT_SECRET = your live secret
   PAYPAL_ENVIRONMENT = live
   ```
5. Redeploy

---

## PART 13 — Weekly Gameweek Operations

Use this checklist every gameweek.

### Opening a New GW (before the FPL deadline)

- [ ] Share the FPL league join URL with your managers so they can join
- [ ] Log into your admin panel
- [ ] **GW Controls** → update the Gameweek Number
- [ ] **GW Controls** → click **Fetch** to auto-pull the deadline
- [ ] **GW Controls** → confirm the Entry Fee is correct
- [ ] **GW Controls** → toggle Registration to **OPEN** → Save
- [ ] **Announcements** → write a message like "GW22 is live! KES 200 entry. Deadline: Friday 11:30am" → toggle visible → Save
- [ ] Share your website URL with managers

### After the GW Deadline (groups locked in)

The system auto-allocates groups after the deadline passes. Verify:

- [ ] **Group Management** → groups should appear here (auto-created by cron job)
- [ ] If not auto-created, click **Trigger Group Allocation** manually
- [ ] **GW Controls** → toggle Registration to **CLOSED** → Save

### During the Gameweek (tracking points)

- [ ] The system auto-refreshes points every 30 minutes via cron job
- [ ] For a manual refresh: **Standings & Points** → **Refresh Points Now**
- [ ] Share the standings URL with managers (they need their FPL ID + PIN)

### After the GW Finalises (Monday/Tuesday)

1. [ ] **Standings & Points** → **Refresh Points Now** (do a final sync)
2. [ ] **Payouts** → **Generate Payout Records** (creates records for each winner)
3. [ ] **Payouts** → **Preview Payouts** → read through every winner and amount carefully
4. [ ] Tick the confirmation checkbox: "I have reviewed all payouts"
5. [ ] **Trigger All Payouts** → wait 1–2 minutes
6. [ ] Confirm all payouts show **sent** status
7. [ ] **Update Hall of Fame** (button appears after payouts are sent)
8. [ ] **Announce Results** (publishes GW to history as hidden)
9. [ ] Optionally: **History** admin page → toggle the GW visible to public
10. [ ] **Announcements** → update the banner with results e.g. "GW22 Results: 🥇 John Doe (87 pts) wins KES 4,800!"

Repeat from the top for the next gameweek.

---

## PART 14 — Troubleshooting

### "Registration is currently closed" on homepage
Admin → GW Controls → toggle Registration to OPEN → Save.

### Manager can't enter — "not in our FPL league"
They haven't joined your FPL league. Send them the join URL from `.env.local`.

### M-Pesa payment shows "pending" and never confirms
Possible causes:
- Your `MPESA_CALLBACK_URL` points to `localhost` or the wrong domain — update in Vercel
- The Safaricom sandbox is slow — try again after a few minutes
- The phone number format is wrong — must be `254XXXXXXXXX` (no +, no 0)

**Quick fix:** Admin → Entries & Payments → find the entry → click **Confirm** manually.

### Groups didn't auto-allocate after deadline
The cron job may have had a delay. Admin → Group Management → click **Trigger Group Allocation** manually.

### Points not updating on standings page
Admin → Standings & Points → **Refresh Points Now**. If the page still shows old points, wait 30 seconds and hard-refresh (Ctrl+Shift+R).

### I forgot my ADMIN_SECRET_PATH or ADMIN_PASSWORD
Go to Vercel → your project → **Settings → Environment Variables** → look up `ADMIN_SECRET_PATH` and `ADMIN_PASSWORD`.

### App works locally but fails after deployment
The most common cause is a missing environment variable in Vercel. Check: Vercel → your project → Settings → Environment Variables and compare with your local `.env.local`.

### Build fails on Vercel
Go to Vercel → your project → **Deployments** → click the failed deployment → scroll down to see the build logs. The error is usually near the bottom in red text.

---

## PART 15 — File Reference

```
fpl123/
├── SETUP_GUIDE.md              ← You are here
├── README.md                   ← Technical reference docs
├── .env.local.example          ← Copy this to .env.local and fill it in
├── vercel.json                 ← Cron job schedule (runs 3 background jobs)
├── package.json                ← App dependencies
├── tailwind.config.ts          ← Brand colours and fonts
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  ← Run this in Supabase SQL Editor (Step 2.2)
└── src/
    ├── app/
    │   ├── page.tsx            ← Homepage
    │   ├── enter/page.tsx      ← Entry flow (FPL ID → verify → pay → PIN)
    │   ├── standings/page.tsx  ← PIN-gated group standings
    │   ├── hall-of-fame/       ← All-time leaderboard
    │   ├── history/            ← Past GW results
    │   ├── terms/              ← Terms & Conditions
    │   └── [adminPath]/        ← Your admin panel (lives at your secret URL)
    │       ├── page.tsx        ← Admin login screen
    │       └── dashboard/      ← All 12 admin sections
    │           ├── page.tsx    ← Dashboard home with stats
    │           ├── gw-controls/    ← Open/close GW, set fee, configure payouts
    │           ├── entries/        ← All payments, confirm/refund/disqualify
    │           ├── groups/         ← Trigger and view group allocation
    │           ├── standings/      ← Refresh points, view all groups
    │           ├── payouts/        ← Preview and trigger prize distribution
    │           ├── announcements/  ← Homepage banner messages
    │           ├── hall-of-fame/   ← HOF visibility settings
    │           ├── history/        ← Toggle history page visibility
    │           ├── blacklist/      ← Block FPL IDs, phones, emails
    │           ├── terms/          ← Edit T&C text
    │           └── settings/       ← Platform name, danger zone
    ├── components/
    │   ├── layout/Header.tsx       ← Top navigation bar
    │   ├── layout/Footer.tsx       ← Footer with social links
    │   ├── layout/AdminSidebar.tsx ← Admin nav sidebar
    │   ├── entry/StepIndicator.tsx ← 4-step progress bar
    │   ├── entry/ManagerCard.tsx   ← Manager preview card
    │   ├── entry/ConfirmationScreen.tsx ← PIN reveal screen
    │   ├── shared/CountdownTimer.tsx    ← Deadline countdown
    │   ├── shared/PinDisplay.tsx        ← Large PIN display
    │   └── shared/AnnouncementBanner.tsx ← Homepage banner
    ├── lib/
    │   ├── fpl.ts          ← All FPL API calls (verify, points, league check)
    │   ├── mpesa.ts        ← M-Pesa STK Push and B2C payout
    │   ├── paypal.ts       ← PayPal order and payout
    │   ├── supabase.ts     ← Database client (server + browser)
    │   ├── groups.ts       ← Group allocation and standings calculation
    │   ├── pin.ts          ← 4-digit PIN generation and validation
    │   ├── logger.ts       ← Structured logging for all modules
    │   ├── admin-auth.ts   ← Admin session check for API routes
    │   └── utils.ts        ← Formatting helpers (KES, dates, rankings)
    └── types/index.ts      ← All TypeScript type definitions
```

---

## Quick Reference: Important URLs

Once deployed, bookmark these:

| URL | What It Is |
|-----|-----------|
| `yourdomain.com` | Your public homepage |
| `yourdomain.com/enter` | Manager entry flow |
| `yourdomain.com/standings` | Group standings (PIN required) |
| `yourdomain.com/hall-of-fame` | All-time leaderboard |
| `yourdomain.com/history` | Past GW results |
| `yourdomain.com/terms` | Terms & Conditions |
| `yourdomain.com/YOUR-SECRET-PATH` | **Admin panel** |

---

*Built with Next.js 14, Supabase, Tailwind CSS, M-Pesa Daraja API, and PayPal REST API.*
*Deployed on Vercel with automated background jobs via Vercel Cron.*
