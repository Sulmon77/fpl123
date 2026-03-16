// src/lib/fpl.ts
// All FPL Public API calls
// No authentication required — all public endpoints

import { logger } from './logger'
import type {
  FplBootstrap,
  FplEntry,
  FplEntryHistory,
  FplEventPicks,
  ResolvedManager,
  FplGwHistory,
} from '@/types'

const FPL_BASE = 'https://fantasy.premierleague.com/api'
const LEAGUE_ID = process.env.FPL_LEAGUE_ID

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// =============================================
// Bootstrap — current GW + deadline
// =============================================
export async function fetchBootstrap(): Promise<FplBootstrap> {
  logger.fpl.info('Fetching bootstrap-static', { file: 'src/lib/fpl.ts', function: 'fetchBootstrap' })

  const res = await fetch(`${FPL_BASE}/bootstrap-static/`, {
    next: { revalidate: 300 }, // cache 5 minutes
  })

  if (!res.ok) {
    logger.fpl.error(`Failed to fetch bootstrap: HTTP ${res.status}`, {
      file: 'src/lib/fpl.ts',
      function: 'fetchBootstrap',
    })
    throw new Error(`FPL bootstrap fetch failed: ${res.status}`)
  }

  const data = await res.json()
  logger.fpl.success('Bootstrap fetched successfully', { file: 'src/lib/fpl.ts' })
  return data
}

export async function getCurrentGwDeadline(): Promise<{ gwNumber: number; deadline: string } | null> {
  try {
    const bootstrap = await fetchBootstrap()
    const currentEvent = bootstrap.events.find((e) => e.is_current)
    const nextEvent = bootstrap.events.find((e) => e.is_next)

    const activeEvent = currentEvent || nextEvent
    if (!activeEvent) return null

    return {
      gwNumber: activeEvent.id,
      deadline: activeEvent.deadline_time,
    }
  } catch (err) {
    logger.fpl.error('Failed to get current GW deadline', {
      file: 'src/lib/fpl.ts',
      function: 'getCurrentGwDeadline',
      error: String(err),
    })
    return null
  }
}

// =============================================
// Manager entry — name, team name, overall rank
// =============================================
export async function fetchFplEntry(teamId: number): Promise<FplEntry> {
  logger.fpl.info(`Fetching FPL entry for team ID: ${teamId}`, {
    file: 'src/lib/fpl.ts',
    function: 'fetchFplEntry',
    input: { teamId },
  })

  const res = await fetch(`${FPL_BASE}/entry/${teamId}/`, {
    next: { revalidate: 60 },
  })

  if (res.status === 404) {
    logger.fpl.warn(`FPL team ID ${teamId} not found`, { file: 'src/lib/fpl.ts' })
    throw new Error('FPL_NOT_FOUND')
  }

  if (!res.ok) {
    logger.fpl.error(`Failed to fetch entry ${teamId}: HTTP ${res.status}`, {
      file: 'src/lib/fpl.ts',
      function: 'fetchFplEntry',
    })
    throw new Error(`FPL entry fetch failed: ${res.status}`)
  }

  return res.json()
}

// =============================================
// Entry history — GW points, transfer hits
// =============================================
export async function fetchEntryHistory(teamId: number): Promise<FplEntryHistory> {
  logger.fpl.info(`Fetching history for team ID: ${teamId}`, {
    file: 'src/lib/fpl.ts',
    function: 'fetchEntryHistory',
    input: { teamId },
  })

  const res = await fetch(`${FPL_BASE}/entry/${teamId}/history/`, {
    cache: 'no-store',
  })

  if (!res.ok) {
    logger.fpl.error(`Failed to fetch history for ${teamId}: HTTP ${res.status}`, {
      file: 'src/lib/fpl.ts',
      function: 'fetchEntryHistory',
    })
    throw new Error(`FPL history fetch failed: ${res.status}`)
  }

  return res.json()
}

// =============================================
// Event picks — active chip
// =============================================
export async function fetchEventPicks(teamId: number, gameweek: number): Promise<FplEventPicks | null> {
  logger.fpl.info(`Fetching event picks for team ${teamId} GW${gameweek}`, {
    file: 'src/lib/fpl.ts',
    function: 'fetchEventPicks',
    input: { teamId, gameweek },
  })

  const res = await fetch(`${FPL_BASE}/entry/${teamId}/event/${gameweek}/picks/`, {
    cache: 'no-store',
  })

  if (res.status === 404) {
    // GW hasn't started yet — no picks
    return null
  }

  if (!res.ok) {
    logger.fpl.error(`Failed to fetch picks for ${teamId} GW${gameweek}: HTTP ${res.status}`, {
      file: 'src/lib/fpl.ts',
      function: 'fetchEventPicks',
    })
    return null
  }

  return res.json()
}

// =============================================
// League membership check — CRITICAL
// Loops ALL pages until has_next = false
// =============================================
export async function isManagerInLeague(fplTeamId: number): Promise<boolean> {
  const leagueId = LEAGUE_ID
  if (!leagueId) {
    logger.fpl.warn('FPL_LEAGUE_ID not set — skipping league check', {
      file: 'src/lib/fpl.ts',
      function: 'isManagerInLeague',
    })
    return true // skip check if not configured
  }

  let page = 1
  let hasNext = true

  logger.fpl.info(`Starting league verification for FPL ID: ${fplTeamId}`, {
    file: 'src/lib/fpl.ts',
    function: 'isManagerInLeague',
    input: { fplTeamId, leagueId },
  })

  while (hasNext) {
    try {
      const res = await fetch(
        `${FPL_BASE}/leagues-classic/${leagueId}/standings/?page_standings=${page}`,
        { cache: 'no-store' }
      )

      if (res.status === 429) {
        logger.fpl.warn(`Rate limited on page ${page}. Waiting 2s...`, {
          file: 'src/lib/fpl.ts',
          function: 'isManagerInLeague',
        })
        await sleep(2000)
        continue // retry same page
      }

      if (!res.ok) {
        logger.fpl.error(`Error fetching league page ${page}: HTTP ${res.status}`, {
          file: 'src/lib/fpl.ts',
          function: 'isManagerInLeague',
        })
        throw new Error(`FPL API returned ${res.status} on page ${page}`)
      }

      const data = await res.json()
      const results = data?.standings?.results ?? []

      logger.fpl.info(
        `[FPL LEAGUE CHECK] Page ${page}: found ${results.length} entries. has_next: ${data.standings.has_next}`,
        { file: 'src/lib/fpl.ts', function: 'isManagerInLeague' }
      )

      const found = results.some((r: { entry: number }) => r.entry === fplTeamId)
      if (found) {
        logger.fpl.success(`FPL ID ${fplTeamId} found on page ${page}`, {
          file: 'src/lib/fpl.ts',
          function: 'isManagerInLeague',
        })
        return true
      }

      hasNext = data.standings.has_next
      page++
      await sleep(150) // prevent rate limiting
    } catch (err) {
      logger.fpl.error(`Failed on league check page ${page}: ${String(err)}`, {
        file: 'src/lib/fpl.ts',
        function: 'isManagerInLeague',
        input: { fplTeamId, page },
      })
      throw err
    }
  }

  logger.fpl.info(`FPL ID ${fplTeamId} not found in league after checking ${page - 1} pages`, {
    file: 'src/lib/fpl.ts',
    function: 'isManagerInLeague',
  })
  return false
}

// =============================================
// Resolve full manager details for registration
// =============================================
export async function resolveManager(
  teamId: number,
  gameweekNumber: number
): Promise<ResolvedManager> {
  logger.fpl.info(`Resolving manager details for team ${teamId} GW${gameweekNumber}`, {
    file: 'src/lib/fpl.ts',
    function: 'resolveManager',
  })

  const [entry, history, picks] = await Promise.all([
    fetchFplEntry(teamId),
    fetchEntryHistory(teamId),
    fetchEventPicks(teamId, gameweekNumber),
  ])

  // Find current GW history
  const gwHistory: FplGwHistory | undefined = history.current.find(
    (gw) => gw.event === gameweekNumber
  )

  // Find last completed GW for points display
  const lastGw = history.current.slice(-1)[0]

  // Determine chip used this GW
  let chipUsed: ResolvedManager['chip_used'] = null
  if (picks?.active_chip) {
    const chip = picks.active_chip.toLowerCase()
    if (chip === 'wildcard') chipUsed = 'wildcard'
    else if (chip === 'freehit') chipUsed = 'freehit'
    else if (chip === 'bboost') chipUsed = 'bboost'
    else if (chip === '3xc') chipUsed = '3xc'
  } else {
    // Check chips array in history
    const chipEntry = history.chips?.find((c) => c.event === gameweekNumber)
    if (chipEntry) {
      const chip = chipEntry.name.toLowerCase()
      if (chip === 'wildcard') chipUsed = 'wildcard'
      else if (chip === 'freehit') chipUsed = 'freehit'
      else if (chip === 'bboost') chipUsed = 'bboost'
      else if (chip === '3xc') chipUsed = '3xc'
    }
  }

  const transferHits = gwHistory?.event_transfers_cost ?? lastGw?.event_transfers_cost ?? 0

  const manager: ResolvedManager = {
    fpl_team_id: teamId,
    manager_name: `${entry.player_first_name} ${entry.player_last_name}`,
    fpl_team_name: entry.name,
    overall_rank: entry.summary_overall_rank ?? 0,
    overall_points: entry.summary_overall_points ?? 0,
    last_gw_points: lastGw?.points ?? 0,
    transfer_hits: transferHits,
    chip_used: chipUsed,
  }

  logger.fpl.success(`Resolved manager: ${manager.manager_name} (${manager.fpl_team_name})`, {
    file: 'src/lib/fpl.ts',
    function: 'resolveManager',
  })

  return manager
}

// =============================================
// Refresh GW points for a manager (for standings)
// =============================================
export async function refreshManagerGwPoints(
  teamId: number,
  gameweekNumber: number
): Promise<{
  gwPoints: number
  transferHits: number
  chipUsed: ResolvedManager['chip_used']
}> {
  logger.fpl.info(`Refreshing GW${gameweekNumber} points for team ${teamId}`, {
    file: 'src/lib/fpl.ts',
    function: 'refreshManagerGwPoints',
  })

  try {
    const [history, picks] = await Promise.all([
      fetchEntryHistory(teamId),
      fetchEventPicks(teamId, gameweekNumber),
    ])

    const gwHistory = history.current.find((gw) => gw.event === gameweekNumber)
    const gwPoints = gwHistory?.points ?? 0
    const transferHits = gwHistory?.event_transfers_cost ?? 0

    let chipUsed: ResolvedManager['chip_used'] = null
    if (picks?.active_chip) {
      const chip = picks.active_chip.toLowerCase()
      if (['wildcard', 'freehit', 'bboost', '3xc'].includes(chip)) {
        chipUsed = chip as ResolvedManager['chip_used']
      }
    }

    return { gwPoints, transferHits, chipUsed }
  } catch (err) {
    logger.fpl.error(`Failed to refresh points for team ${teamId}: ${String(err)}`, {
      file: 'src/lib/fpl.ts',
      function: 'refreshManagerGwPoints',
      input: { teamId, gameweekNumber },
    })
    throw err
  }
}
