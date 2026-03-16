// src/types/index.ts
// All TypeScript interfaces for FPL123

// =============================================
// DATABASE TYPES
// =============================================

export interface Settings {
  id: string
  gameweek_number: number
  entry_fee: number
  entry_deadline: string | null
  registration_open: boolean
  giveaway_type: 'money' | 'shoutout' | 'other'
  giveaway_description: string | null
  winners_per_group: number
  payout_percentages: PayoutPercentages
  hall_of_fame_enabled: boolean
  hall_of_fame_price: number
  hall_of_fame_audience: 'all' | 'registered'
  standings_refresh_interval: number
  announcement_text: string | null
  announcement_visible: boolean
  terms_text: string
  platform_name: string
  history_visible: boolean
  updated_at: string
}

export interface PayoutPercentages {
  [position: string]: number // e.g. {"1": 60, "2": 30, "platform": 10}
}

export interface Entry {
  id: string
  fpl_team_id: number
  fpl_team_name: string
  manager_name: string
  gameweek_number: number
  payment_method: 'mpesa' | 'paypal'
  payment_phone: string | null
  payment_email: string | null
  payment_reference: string | null
  payment_status: 'pending' | 'confirmed' | 'refunded'
  pin: string
  pin_active: boolean
  confirmed_at: string | null
  hall_of_fame_access: boolean
  hall_of_fame_paid_at: string | null
  disqualified: boolean
  disqualified_reason: string | null
  created_at: string
}

export interface Group {
  id: string
  gameweek_number: number
  group_number: number
  allocated_at: string
}

export interface GroupMember {
  id: string
  group_id: string
  fpl_team_id: number
  fpl_team_name: string
  manager_name: string
  gameweek_number: number
  gw_points: number
  transfer_hits: number
  chip_used: 'wildcard' | 'freehit' | 'bboost' | '3xc' | null
  standing_position: number | null
  prize_amount: number
  last_refreshed_at: string | null
}

export interface GroupWithMembers extends Group {
  group_members: GroupMember[]
}

export interface Payout {
  id: string
  gameweek_number: number
  fpl_team_id: number
  manager_name: string
  position: number
  amount: number
  payment_method: 'mpesa' | 'paypal'
  payment_detail: string
  status: 'pending' | 'sent' | 'failed'
  triggered_at: string | null
  completed_at: string | null
  mpesa_transaction_id: string | null
  notes: string | null
}

export interface GiveawayHistory {
  id: string
  gameweek_number: number
  type: string
  description: string | null
  winners: GiveawayWinner[] | null
  announced_at: string
  visible_to_public: boolean
}

export interface GiveawayWinner {
  fpl_team_id: number
  manager_name: string
  fpl_team_name: string
  group_number: number
  position: number
  gw_points: number
  prize_amount?: number
  prize_description?: string
}

export interface HallOfFameEntry {
  id: string
  fpl_team_id: number
  fpl_team_name: string
  manager_name: string
  total_points: number
  highest_gw_points: number
  highest_gw_number: number | null
  total_amount_won: number
  total_wins: number
  gameweeks_participated: number
  updated_at: string
}

export interface BlacklistEntry {
  id: string
  type: 'fpl_id' | 'phone' | 'paypal_email'
  value: string
  reason: string | null
  added_at: string
  added_by: string
}

export interface HallOfFamePayment {
  id: string
  fpl_team_id: number
  gameweek_number: number
  payment_reference: string | null
  paid_at: string
  access_expires_at: string | null
}

// =============================================
// FPL API TYPES
// =============================================

export interface FplBootstrap {
  events: FplEvent[]
  teams: FplTeam[]
  elements: FplPlayer[]
}

export interface FplEvent {
  id: number
  name: string
  deadline_time: string
  is_current: boolean
  is_next: boolean
  is_previous: boolean
  finished: boolean
}

export interface FplTeam {
  id: number
  name: string
  short_name: string
}

export interface FplPlayer {
  id: number
  web_name: string
  team: number
}

export interface FplEntry {
  id: number
  player_first_name: string
  player_last_name: string
  player_region_name: string
  name: string // team name
  summary_overall_points: number
  summary_overall_rank: number
  summary_event_points: number
  summary_event_rank: number
}

export interface FplEntryHistory {
  current: FplGwHistory[]
  past: FplSeasonHistory[]
  chips: FplChip[]
}

export interface FplGwHistory {
  event: number
  points: number
  total_points: number
  rank: number
  rank_sort: number
  overall_rank: number
  bank: number
  value: number
  event_transfers: number
  event_transfers_cost: number
  points_on_bench: number
}

export interface FplSeasonHistory {
  season_name: string
  total_points: number
  rank: number
}

export interface FplChip {
  name: string
  time: string
  event: number
}

export interface FplEventPicks {
  active_chip: string | null
  automatic_subs: unknown[]
  entry_history: FplGwHistory
  picks: FplPick[]
}

export interface FplPick {
  element: number
  position: number
  multiplier: number
  is_captain: boolean
  is_vice_captain: boolean
}

export interface FplLeagueStandings {
  league: {
    id: number
    name: string
  }
  standings: {
    has_next: boolean
    page: number
    results: FplLeagueEntry[]
  }
}

export interface FplLeagueEntry {
  id: number
  event_total: number
  player_name: string
  rank: number
  last_rank: number
  rank_sort: number
  total: number
  entry: number
  entry_name: string
}

// Resolved manager details (combined from FPL API calls)
export interface ResolvedManager {
  fpl_team_id: number
  manager_name: string
  fpl_team_name: string
  overall_rank: number
  overall_points: number
  last_gw_points: number
  transfer_hits: number // cost in points (e.g. 4, 8)
  chip_used: 'wildcard' | 'freehit' | 'bboost' | '3xc' | null
}

// =============================================
// API REQUEST/RESPONSE TYPES
// =============================================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface VerifyFplIdRequest {
  fplTeamId: number
  gameweekNumber: number
}

export interface VerifyFplIdResponse {
  manager: ResolvedManager
}

export interface RegisterEntryRequest {
  fplTeamId: number
  fplTeamName: string
  managerName: string
  gameweekNumber: number
  paymentMethod: 'mpesa' | 'paypal'
  paymentPhone?: string
  paymentEmail?: string
}

export interface RegisterEntryResponse {
  entryId: string
  pin: string
}

export interface MpesaInitiateRequest {
  entryId: string
  phone: string
  amount: number
  gameweekNumber: number
}

export interface MpesaInitiateResponse {
  checkoutRequestId: string
  merchantRequestId: string
  message: string
}

export interface MpesaStatusResponse {
  status: 'pending' | 'confirmed' | 'failed' | 'cancelled'
  message?: string
}

export interface MpesaCallback {
  Body: {
    stkCallback: {
      MerchantRequestID: string
      CheckoutRequestID: string
      ResultCode: number
      ResultDesc: string
      CallbackMetadata?: {
        Item: Array<{ Name: string; Value?: string | number }>
      }
    }
  }
}

export interface StandingsAuthRequest {
  fplTeamId: number
  pin: string
  gameweekNumber: number
}

export interface StandingsAuthResponse {
  groupId: string
  groupNumber: number
}

export interface PayoutPreview {
  totalPot: number
  platformCut: number
  totalToDistribute: number
  winners: PayoutWinner[]
}

export interface PayoutWinner {
  groupNumber: number
  position: number
  fplTeamId: number
  managerName: string
  fplTeamName: string
  gwPoints: number
  transferHits: number
  chipUsed: string | null
  prizeAmount: number
  paymentMethod: 'mpesa' | 'paypal'
  paymentDetail: string
}

// =============================================
// UI STATE TYPES
// =============================================

export type EntryStep = 1 | 2 | 3 | 4

export interface EntryFlowState {
  step: EntryStep
  fplTeamId: number | null
  manager: ResolvedManager | null
  entryId: string | null
  pin: string | null
  paymentMethod: 'mpesa' | 'paypal'
  paymentStatus: 'idle' | 'pending' | 'confirmed' | 'failed'
  checkoutRequestId: string | null
}

export type ChipLabel = {
  wildcard: 'WC'
  freehit: 'FH'
  bboost: 'BB'
  '3xc': '3C'
}

export interface StandingsTableRow extends GroupMember {
  isCurrentUser?: boolean
}

export interface AdminStats {
  totalEntries: number
  confirmedEntries: number
  pendingEntries: number
  totalRevenuKes: number
  groupsAllocated: number
  currentGw: number
  registrationOpen: boolean
  deadline: string | null
}
