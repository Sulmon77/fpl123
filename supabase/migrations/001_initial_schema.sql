-- FPL123 Initial Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLE: settings
-- =============================================
CREATE TABLE IF NOT EXISTS settings (
  id                          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  gameweek_number             integer NOT NULL DEFAULT 1,
  entry_fee                   integer NOT NULL DEFAULT 200,
  entry_deadline              timestamptz,
  registration_open           boolean DEFAULT false,
  giveaway_type               text DEFAULT 'money' CHECK (giveaway_type IN ('money', 'shoutout', 'other')),
  giveaway_description        text,
  winners_per_group           integer DEFAULT 2,
  payout_percentages          jsonb DEFAULT '{"1": 60, "2": 30, "platform": 10}'::jsonb,
  hall_of_fame_enabled        boolean DEFAULT false,
  hall_of_fame_price          integer DEFAULT 50,
  hall_of_fame_audience       text DEFAULT 'registered' CHECK (hall_of_fame_audience IN ('all', 'registered')),
  standings_refresh_interval  integer DEFAULT 120,
  announcement_text           text,
  announcement_visible        boolean DEFAULT false,
  terms_text                  text DEFAULT 'FPL123 is a performance recognition platform. By entering, you agree to the terms and conditions set by the platform administrator.',
  platform_name               text DEFAULT 'FPL123',
  history_visible             boolean DEFAULT false,
  updated_at                  timestamptz DEFAULT now()
);

-- Insert default settings row (only one row ever exists)
INSERT INTO settings (id) VALUES (uuid_generate_v4())
ON CONFLICT DO NOTHING;

-- =============================================
-- TABLE: entries
-- =============================================
CREATE TABLE IF NOT EXISTS entries (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  fpl_team_id         integer NOT NULL,
  fpl_team_name       text NOT NULL,
  manager_name        text NOT NULL,
  gameweek_number     integer NOT NULL,
  payment_method      text NOT NULL CHECK (payment_method IN ('mpesa', 'paypal')),
  payment_phone       text,
  payment_email       text,
  payment_reference   text,
  payment_status      text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'confirmed', 'refunded')),
  pin                 text NOT NULL,
  pin_active          boolean DEFAULT true,
  confirmed_at        timestamptz,
  hall_of_fame_access boolean DEFAULT false,
  hall_of_fame_paid_at timestamptz,
  disqualified        boolean DEFAULT false,
  disqualified_reason text,
  created_at          timestamptz DEFAULT now(),
  UNIQUE(fpl_team_id, gameweek_number)
);

-- =============================================
-- TABLE: groups
-- =============================================
CREATE TABLE IF NOT EXISTS groups (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  gameweek_number  integer NOT NULL,
  group_number     integer NOT NULL,
  allocated_at     timestamptz DEFAULT now(),
  UNIQUE(gameweek_number, group_number)
);

-- =============================================
-- TABLE: group_members
-- =============================================
CREATE TABLE IF NOT EXISTS group_members (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id          uuid REFERENCES groups(id) ON DELETE CASCADE,
  fpl_team_id       integer NOT NULL,
  fpl_team_name     text NOT NULL,
  manager_name      text NOT NULL,
  gameweek_number   integer NOT NULL,
  gw_points         integer DEFAULT 0,
  transfer_hits     integer DEFAULT 0,
  chip_used         text CHECK (chip_used IN (NULL, 'wildcard', 'freehit', 'bboost', '3xc')),
  standing_position integer,
  prize_amount      integer DEFAULT 0,
  last_refreshed_at timestamptz,
  UNIQUE(fpl_team_id, gameweek_number)
);

-- =============================================
-- TABLE: payouts
-- =============================================
CREATE TABLE IF NOT EXISTS payouts (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  gameweek_number       integer NOT NULL,
  fpl_team_id           integer NOT NULL,
  manager_name          text NOT NULL,
  position              integer NOT NULL,
  amount                integer NOT NULL,
  payment_method        text NOT NULL CHECK (payment_method IN ('mpesa', 'paypal')),
  payment_detail        text NOT NULL,
  status                text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  triggered_at          timestamptz,
  completed_at          timestamptz,
  mpesa_transaction_id  text,
  notes                 text
);

-- =============================================
-- TABLE: giveaway_history
-- =============================================
CREATE TABLE IF NOT EXISTS giveaway_history (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  gameweek_number   integer NOT NULL,
  type              text NOT NULL,
  description       text,
  winners           jsonb,
  announced_at      timestamptz DEFAULT now(),
  visible_to_public boolean DEFAULT false
);

-- =============================================
-- TABLE: hall_of_fame
-- =============================================
CREATE TABLE IF NOT EXISTS hall_of_fame (
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  fpl_team_id             integer NOT NULL UNIQUE,
  fpl_team_name           text NOT NULL,
  manager_name            text NOT NULL,
  total_points            integer DEFAULT 0,
  highest_gw_points       integer DEFAULT 0,
  highest_gw_number       integer,
  total_amount_won        integer DEFAULT 0,
  total_wins              integer DEFAULT 0,
  gameweeks_participated  integer DEFAULT 0,
  updated_at              timestamptz DEFAULT now()
);

-- =============================================
-- TABLE: blacklist
-- =============================================
CREATE TABLE IF NOT EXISTS blacklist (
  id        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  type      text NOT NULL CHECK (type IN ('fpl_id', 'phone', 'paypal_email')),
  value     text NOT NULL UNIQUE,
  reason    text,
  added_at  timestamptz DEFAULT now(),
  added_by  text DEFAULT 'admin'
);

-- =============================================
-- TABLE: hall_of_fame_payments
-- =============================================
CREATE TABLE IF NOT EXISTS hall_of_fame_payments (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  fpl_team_id       integer NOT NULL,
  gameweek_number   integer NOT NULL,
  payment_reference text,
  paid_at           timestamptz DEFAULT now(),
  access_expires_at timestamptz,
  UNIQUE(fpl_team_id, gameweek_number)
);

-- =============================================
-- TABLE: terms_history (for version tracking)
-- =============================================
CREATE TABLE IF NOT EXISTS terms_history (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  terms_text  text NOT NULL,
  saved_at    timestamptz DEFAULT now()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE giveaway_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE hall_of_fame ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE hall_of_fame_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms_history ENABLE ROW LEVEL SECURITY;

-- Service role bypass (used by our API routes with service key)
-- All access is via service role key in API routes — anon key has read-only access to public data

-- Public read: settings (non-sensitive fields only via API)
CREATE POLICY "Public can read settings" ON settings
  FOR SELECT USING (true);

-- Public read: groups (for standings)
CREATE POLICY "Public can read groups" ON groups
  FOR SELECT USING (true);

-- Public read: group_members (for standings)
CREATE POLICY "Public can read group_members" ON group_members
  FOR SELECT USING (true);

-- Public read: giveaway_history (only visible ones)
CREATE POLICY "Public can read visible giveaway history" ON giveaway_history
  FOR SELECT USING (visible_to_public = true);

-- Public read: hall_of_fame
CREATE POLICY "Public can read hall_of_fame" ON hall_of_fame
  FOR SELECT USING (true);

-- All write operations go through service role (API routes)
-- No direct anon write access to any table

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_entries_fpl_team_gw ON entries(fpl_team_id, gameweek_number);
CREATE INDEX IF NOT EXISTS idx_entries_payment_status ON entries(payment_status);
CREATE INDEX IF NOT EXISTS idx_entries_payment_reference ON entries(payment_reference);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_fpl_team_gw ON group_members(fpl_team_id, gameweek_number);
CREATE INDEX IF NOT EXISTS idx_groups_gameweek ON groups(gameweek_number);
CREATE INDEX IF NOT EXISTS idx_blacklist_value ON blacklist(value);
CREATE INDEX IF NOT EXISTS idx_payouts_gameweek ON payouts(gameweek_number);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Auto-update updated_at on settings
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER hall_of_fame_updated_at
  BEFORE UPDATE ON hall_of_fame
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
