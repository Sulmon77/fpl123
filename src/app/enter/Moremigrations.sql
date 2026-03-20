--These are migrationa that were run since the initial migration.

-- Run this in your Supabase SQL Editor
ALTER TABLE settings ADD COLUMN IF NOT EXISTS gameweek_ended boolean DEFAULT false;

-- Run this in your Supabase SQL Editor
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS fpl_team_name text;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS group_number integer;

-- Migration : Add gameweek_status column to settings
-- Run this in your Supabase SQL Editor

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS gameweek_status text
  DEFAULT 'upcoming'
  CHECK (gameweek_status IN ('upcoming', 'ongoing', 'ended', 'edit'));

  -- Migration Manual payment method + fixes
-- Run this in your Supabase SQL Editor

-- Allow 'manual' as a payment method for admin-added entries
ALTER TABLE entries DROP CONSTRAINT IF EXISTS entries_payment_method_check;
ALTER TABLE entries ADD CONSTRAINT entries_payment_method_check
  CHECK (payment_method IN ('mpesa', 'paypal', 'manual'));

-- Add notes column to entries for admin-added entries
ALTER TABLE entries ADD COLUMN IF NOT EXISTS notes text;

-- Ensure payouts has fpl_team_name and group_number (from migration 3 in setup guide)
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS fpl_team_name text;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS group_number integer;

-- Ensure settings has gameweek_ended and gameweek_status (from setup guide migrations)
ALTER TABLE settings ADD COLUMN IF NOT EXISTS gameweek_ended boolean DEFAULT false;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS gameweek_status text
  DEFAULT 'upcoming'
  CHECK (gameweek_status IN ('upcoming', 'ongoing', 'ended', 'edit'));

-- Ensure giveaway_history has total_entries and total_amount
ALTER TABLE giveaway_history ADD COLUMN IF NOT EXISTS total_entries integer DEFAULT 0;
ALTER TABLE giveaway_history ADD COLUMN IF NOT EXISTS total_amount integer DEFAULT 0;
