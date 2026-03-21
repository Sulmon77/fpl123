// src/lib/prizes.ts
// Single source of truth for prize calculation.
// Used by the standings route (for display) and the refresh-points route (for writing to DB).

import type { TierSettings } from '@/types'

export interface PrizeCalcResult {
  totalPot: number
  distributablePot: number
  prizesByPosition: Record<string, number>
  winnersPerGroup: number
  entryFee: number
  payoutPercentages: Record<string, number>
}

/**
 * Calculate prize amounts for a group.
 *
 * The admin sets percentages that sum to 100% of the total pot, e.g.:
 *   { "1": 80, "platform": 20 }
 *
 * Prize for position N = totalPot × (pct / 100)
 * No double-deduction — the platform cut is just its own slice of totalPot.
 */
export function calculateGroupPrizes(
  memberCount: number,
  tierSettings: TierSettings
): PrizeCalcResult {
  const entryFee = tierSettings?.entry_fee ?? 200
  const winnersPerGroup = tierSettings?.winners_per_group ?? 1
  const payoutPercentages: Record<string, number> =
    tierSettings?.payout_percentages ?? { '1': 90, platform: 10 }

  const totalPot = memberCount * entryFee
  const platformCutPct = payoutPercentages['platform'] ?? 0
  const distributablePot = Math.floor(totalPot * (1 - platformCutPct / 100))

  const prizesByPosition: Record<string, number> = {}
  for (let pos = 1; pos <= winnersPerGroup; pos++) {
    const posKey = pos.toString()
    const pct = payoutPercentages[posKey]
    if (pct && pct > 0) {
      prizesByPosition[posKey] = Math.floor(totalPot * (pct / 100))
    }
  }

  return {
    totalPot,
    distributablePot,
    prizesByPosition,
    winnersPerGroup,
    entryFee,
    payoutPercentages,
  }
}

/**
 * Given a position and prize calc result, return the prize amount for that position.
 */
export function prizeForPosition(
  position: number,
  result: PrizeCalcResult
): number {
  if (position > result.winnersPerGroup) return 0
  return result.prizesByPosition[position.toString()] ?? 0
}