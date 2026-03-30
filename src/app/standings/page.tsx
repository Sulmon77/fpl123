'use client'
// src/app/standings/page.tsx

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import {
  Lock, Loader2, AlertCircle, RotateCcw,
  ExternalLink, ArrowUpDown, Clock, Users, Trophy, Hourglass,
} from 'lucide-react'
import { cn, formatKES, CHIP_LABELS, positionEmoji, timeAgo } from '@/lib/utils'

interface StandingsRow {
  fpl_team_id: number
  fpl_team_name: string
  manager_name: string
  gw_points: number
  transfer_hits: number
  chip_used: string | null
  standing_position: number | null
  prize_amount: number
  is_clean: boolean
  last_refreshed_at: string | null
}

interface StandingsData {
  groupId: string
  groupNumber: number
  gameweekNumber: number
  standings: StandingsRow[]
  prizesByPosition: Record<string, number>
  winnersPerGroup: number
  totalPot: number
  distributablePot: number
  lastRefreshed: string | null
  refreshInterval: number
  entryTier?: string
}

interface Settings {
  gameweek_number: number
  hall_of_fame_enabled: boolean
  history_visible: boolean
  platform_name: string
  entry_deadline: string | null
  registration_open: boolean
}

export default function StandingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [authStep, setAuthStep] = useState<'input' | 'loading' | 'done' | 'error' | 'not_allocated'>('input')
  const [fplId, setFplId] = useState('')
  const [pinInput, setPinInput] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [notAllocatedTier, setNotAllocatedTier] = useState<string | null>(null)
  const [groupId, setGroupId] = useState<string | null>(null)
  const [standingsData, setStandingsData] = useState<StandingsData | null>(null)
  const [loadingStandings, setLoadingStandings] = useState(false)
  const [myFplId, setMyFplId] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d.success) setSettings(d.data)
    })
  }, [])

  const loadStandings = useCallback(async (gid: string) => {
    setLoadingStandings(true)
    try {
      const res = await fetch(`/api/standings/${gid}`)
      const data = await res.json()
      if (data.success) setStandingsData(data.data)
    } catch (e) { console.error(e) }
    finally { setLoadingStandings(false) }
  }, [])

  // Active refresh — calls the FPL API to get fresh data, then updates DB and returns result
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const handleUserRefresh = useCallback(async (gid: string) => {
    setLoadingStandings(true)
    setRefreshError(null)
    try {
      const res = await fetch(`/api/standings/${gid}/refresh`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setStandingsData(data.data)
      } else if (data.rateLimited) {
        setRefreshError(data.error)
        // Still load fresh DB data even if rate limited
        await loadStandings(gid)
      } else {
        // Fall back to passive load on error
        await loadStandings(gid)
      }
    } catch {
      await loadStandings(gid)
    } finally {
      setLoadingStandings(false)
    }
  }, [loadStandings])

  useEffect(() => {
    if (!groupId || !standingsData) return
    const interval = setInterval(
      () => loadStandings(groupId),
      (standingsData.refreshInterval ?? 120) * 60 * 1000
    )
    return () => clearInterval(interval)
  }, [groupId, standingsData, loadStandings])

  const handleAuth = async () => {
    if (!fplId || !pinInput || !settings) return
    setAuthStep('loading'); setAuthError(null)
    try {
      const res = await fetch(`/api/manager/${fplId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput, gameweekNumber: settings.gameweek_number }),
      })
      const data = await res.json()

      if (data.success) {
        setGroupId(data.data.groupId)
        setMyFplId(parseInt(fplId))
        setAuthStep('done')
        await loadStandings(data.data.groupId)
      } else if (data.errorCode === 'GROUP_NOT_ALLOCATED') {
        setNotAllocatedTier(data.data?.entryTier ?? null)
        setAuthStep('not_allocated')
      } else {
        setAuthError(data.error)
        setAuthStep('error')
      }
    } catch {
      setAuthError('Network error. Please try again.')
      setAuthStep('error')
    }
  }

  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-purple" />
      </div>
    )
  }

  const tier = standingsData?.entryTier
  const tierLabel = tier === 'elite' ? 'Elite' : 'Casual'

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header
        hallOfFameEnabled={settings.hall_of_fame_enabled}
        historyVisible={settings.history_visible}
        groupsAllocated={true}
        registrationOpen={settings.registration_open ?? false}
        platformName={settings.platform_name}
      />

      <main className="flex-1 py-8 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">

          {/* ── Auth form ──────────────────────────────────────── */}
          {(authStep === 'input' || authStep === 'loading' || authStep === 'error') && (
            <div className="max-w-sm mx-auto">
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-full bg-brand-purple/10 flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-7 h-7 text-brand-purple" />
                </div>
                <h1 className="font-display font-bold text-2xl text-text-primary">View Your Standings</h1>
                <p className="text-text-secondary mt-1 text-sm">Enter your FPL ID and PIN to access your group</p>
              </div>

              <div className="card p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1.5">FPL Team ID</label>
                  <input
                    type="number"
                    value={fplId}
                    onChange={e => { setFplId(e.target.value); setAuthError(null) }}
                    placeholder="e.g. 1234567"
                    className="form-input"
                    disabled={authStep === 'loading'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1.5">Your 4-Digit PIN</label>
                  <input
                    type="text"
                    value={pinInput}
                    onChange={e => {
                      setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))
                      setAuthError(null)
                    }}
                    onKeyDown={e => e.key === 'Enter' && handleAuth()}
                    placeholder="XXXX"
                    className="form-input font-mono text-center text-2xl tracking-widest"
                    maxLength={4}
                    disabled={authStep === 'loading'}
                  />
                  <p className="text-xs text-text-secondary mt-1">The PIN was shown after your payment was confirmed</p>
                </div>

                {authError && (
                  <div className="flex items-start gap-2 bg-error/5 border border-error/20 rounded-lg p-3">
                    <AlertCircle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-error">{authError}</p>
                  </div>
                )}

                <button
                  onClick={handleAuth}
                  disabled={!fplId || pinInput.length !== 4 || authStep === 'loading'}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {authStep === 'loading'
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading your group…</>
                    : 'View My Standings'}
                </button>

                {authStep === 'error' && (
                  <button
                    onClick={() => { setAuthStep('input'); setAuthError(null) }}
                    className="flex items-center gap-1.5 text-sm text-text-secondary mx-auto hover:text-text-primary"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Try again
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Groups not yet allocated ───────────────────────── */}
          {authStep === 'not_allocated' && (
            <div className="max-w-sm mx-auto text-center space-y-6">
              <div className="card p-8 space-y-5">
                <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto">
                  <Hourglass className="w-8 h-8 text-warning" />
                </div>

                <div>
                  <h2 className="font-display font-bold text-xl text-text-primary mb-2">
                    Groups not yet allocated
                  </h2>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    Your PIN is correct and your{' '}
                    {notAllocatedTier
                      ? <strong className={cn('capitalize', notAllocatedTier === 'elite' ? 'text-brand-purple' : 'text-brand-purple')}>
                        {notAllocatedTier}
                      </strong>
                      : 'group'
                    }{' '}
                    entry is confirmed for GW{settings.gameweek_number}.
                    Groups are created after the registration deadline — check back soon.
                  </p>
                </div>

                {notAllocatedTier && (
                  <div className={cn(
                    'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold',
                    notAllocatedTier === 'elite'
                      ? 'bg-brand-purple/10 text-brand-purple'
                      : 'bg-brand-purple/10 text-brand-purple'
                  )}>
                    {notAllocatedTier === 'elite' ? <Trophy className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                    <span className="capitalize">{notAllocatedTier} Manager</span>
                    <span className="text-brand-purple/50">· GW{settings.gameweek_number}</span>
                  </div>
                )}

                <button
                  onClick={() => { setAuthStep('input'); setAuthError(null); setNotAllocatedTier(null) }}
                  className="btn-primary w-full"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {/* ── Standings view ─────────────────────────────────── */}
          {authStep === 'done' && (
            <div className="space-y-5 animate-slide-up">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      'text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full',
                      tier === 'elite' ? 'bg-brand-purple text-white' : 'bg-brand-purple/10 text-brand-purple'
                    )}>
                      {tierLabel}
                    </span>
                    <span className="text-xs text-text-secondary">GW{settings.gameweek_number}</span>
                  </div>
                  <h1 className="font-display font-bold text-2xl text-text-primary">Your Group</h1>
                  {standingsData?.lastRefreshed && (
                    <p className="text-text-secondary text-sm flex items-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                      Last updated: {timeAgo(standingsData.lastRefreshed)}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <button
                    onClick={() => groupId && handleUserRefresh(groupId)}
                    disabled={loadingStandings}
                    className="flex items-center gap-1.5 text-sm text-brand-purple font-semibold hover:underline self-start sm:self-auto"
                  >
                    <RotateCcw className={cn('w-4 h-4', loadingStandings && 'animate-spin')} />
                    {loadingStandings ? 'Refreshing…' : 'Refresh'}
                  </button>
                  {refreshError && (
                    <p className="text-xs text-warning">{refreshError}</p>
                  )}
                </div>
              </div>

              {/* Group info card */}
              <div className="card p-4 flex items-center gap-4">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', tier === 'elite' ? 'bg-brand-purple/10' : 'bg-brand-purple/5')}>
                  {tier === 'elite'
                    ? <Trophy className="w-5 h-5 text-brand-purple" />
                    : <Users className="w-5 h-5 text-brand-purple" />}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-text-primary text-sm">Group Information</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {standingsData?.standings.length ?? 0} managers competing ·{' '}
                    Top {standingsData?.winnersPerGroup ?? 1} will be selected
                  </p>
                </div>
                {standingsData && standingsData.distributablePot > 0 && (
                  <div className="text-right">
                    <p className="font-display font-bold text-brand-purple">{formatKES(standingsData.distributablePot)}</p>
                    <p className="text-xs text-text-secondary">Total take home amount</p>
                  </div>
                )}
              </div>

              {/* Prize breakdown — amounts only, no percentages shown to users */}
              {standingsData && standingsData.distributablePot > 0 && Object.keys(standingsData.prizesByPosition).length > 0 && (
                <div className="bg-brand-purple text-white rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold text-white/80">
                      🏆 Top {standingsData.winnersPerGroup} in your group awarded
                    </p>
                    <span className="text-xs text-white/30">{standingsData.standings.length} managers</span>
                  </div>
                  <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Object.keys(standingsData.prizesByPosition).length}, 1fr)` }}>
                    {Object.entries(standingsData.prizesByPosition)
                      .sort(([a], [b]) => parseInt(a) - parseInt(b))
                      .map(([pos, amount]) => (
                        <div key={pos} className={cn(
                          'rounded-xl py-3 px-2 text-center',
                          pos === '1' ? 'bg-brand-green/20 border border-brand-green/30' : 'bg-white/10'
                        )}>
                          <p className="text-xl mb-1">
                            {pos === '1' ? '🥇' : pos === '2' ? '🥈' : pos === '3' ? '🥉' : `#${pos}`}
                          </p>
                          <p className={cn('font-display font-bold text-lg leading-none', pos === '1' ? 'text-brand-green' : 'text-white')}>
                            {formatKES(amount)}
                          </p>
                        </div>
                      ))}
                  </div>
                  <p className="text-xs text-white/30 mt-3">More managers = Higher amount</p>
                </div>
              )}

              {/* Standings table */}
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="standings-table w-full">
                    <thead>
                      <tr>
                        <th className="w-12">#</th>
                        <th>Manager</th>
                        <th className="text-center">Points</th>
                        <th className="text-center">Hits</th>
                        <th className="text-center">Chip</th>
                        <th className="text-center">Clean?</th>
                        <th className="text-right">Prize</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingStandings && !standingsData ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i}>
                            {Array.from({ length: 7 }).map((_, j) => (
                              <td key={j}><div className="skeleton h-4 rounded w-16" /></td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        standingsData?.standings.map(row => {
                          const isMe = row.fpl_team_id === myFplId
                          const pos = row.standing_position ?? 999
                          const isWinner = pos <= (standingsData.winnersPerGroup ?? 1)

                          return (
                            <tr
                              key={row.fpl_team_id}
                              className={cn(
                                'transition-colors',
                                isMe && 'bg-brand-green/5 font-semibold',
                                isWinner && !isMe && 'bg-yellow-50/50'
                              )}
                            >
                              <td className="text-center">
                                <span className={cn('font-bold text-sm', pos === 1 && 'text-yellow-500', pos === 2 && 'text-gray-400', pos === 3 && 'text-amber-700')}>
                                  {positionEmoji(pos)}
                                </span>
                              </td>
                              <td>
                                <div>
                                  <a href={`https://fantasy.premierleague.com/entry/${row.fpl_team_id}/event/${settings.gameweek_number}/`} target="_blank" rel="noopener noreferrer" className="font-semibold text-text-primary hover:text-brand-purple transition-colors flex items-center gap-1 group">
                                    {row.manager_name}
                                    {isMe && <span className="text-xs bg-brand-green text-brand-purple font-bold px-1.5 py-0.5 rounded">YOU</span>}
                                    <ExternalLink className="w-3 h-3 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </a>
                                  <a href={`https://fantasy.premierleague.com/entry/${row.fpl_team_id}/event/${settings.gameweek_number}/`} target="_blank" rel="noopener noreferrer" className="text-xs text-text-secondary hover:text-brand-purple transition-colors">
                                    {row.fpl_team_name}
                                  </a>
                                </div>
                              </td>
                              <td className="text-center"><span className="font-bold text-text-primary">{row.gw_points}</span></td>
                              <td className="text-center">
                                {row.transfer_hits > 0
                                  ? <span className="text-xs font-bold text-error bg-error/10 px-2 py-0.5 rounded">-{row.transfer_hits}</span>
                                  : <span className="text-text-secondary text-xs">—</span>}
                              </td>
                              <td className="text-center">
                                {row.chip_used
                                  ? <span className={cn('chip-badge', `chip-${row.chip_used}`)}>{CHIP_LABELS[row.chip_used] ?? row.chip_used}</span>
                                  : <span className="text-text-secondary text-xs">—</span>}
                              </td>
                              <td className="text-center">
                                {row.is_clean
                                  ? <span className="text-success text-base">✓</span>
                                  : <span className="text-text-secondary text-xs">✗</span>}
                              </td>
                              <td className="text-right">
                                {isWinner
                                  ? (
                                    <div className="text-right">
                                      <span className="font-bold text-success text-sm block">
                                        {row.prize_amount > 0 ? formatKES(row.prize_amount) : '—'}
                                      </span>
                                      <span className="text-[10px] text-success/60 uppercase tracking-wide">Amount</span>
                                    </div>
                                  )
                                  : <span className="text-text-secondary text-xs">—</span>}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tiebreaker rule */}
              <p className="text-xs text-text-secondary text-center">
                <ArrowUpDown className="w-3 h-3 inline mr-1" />
                Managers with no transfer hits and no chips used are ranked higher on equal points(if there is a)
              </p>

              {/* Disclaimer */}
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-xs text-amber-700 leading-relaxed">
                  <strong>Final standings at the close of the gameweek</strong> determine the winners and payouts — not live standings. Points are updated automatically but may lag behind FPL&apos;s official scores during the gameweek.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer platformName={settings.platform_name} />
    </div>
  )
}