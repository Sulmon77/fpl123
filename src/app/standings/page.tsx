'use client'
// src/app/standings/page.tsx
// PIN-gated standings page

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import {
  Lock, Loader2, AlertCircle, RotateCcw,
  ExternalLink, ArrowUpDown, Clock
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
  const [authStep, setAuthStep] = useState<'input' | 'loading' | 'done' | 'error'>('input')

  // Auth form
  const [fplId, setFplId] = useState('')
  const [pinInput, setPinInput] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)

  // Group data
  const [groupId, setGroupId] = useState<string | null>(null)
  const [groupNumber, setGroupNumber] = useState<number | null>(null)
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
      if (data.success) {
        setStandingsData(data.data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingStandings(false)
    }
  }, [])

  // Auto-refresh standings
  useEffect(() => {
    if (!groupId || !standingsData) return
    const interval = setInterval(() => {
      loadStandings(groupId)
    }, (standingsData.refreshInterval ?? 120) * 60 * 1000)
    return () => clearInterval(interval)
  }, [groupId, standingsData, loadStandings])

  const handleAuth = async () => {
    if (!fplId || !pinInput || !settings) return

    setAuthStep('loading')
    setAuthError(null)

    try {
      const res = await fetch(`/api/manager/${fplId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: pinInput,
          gameweekNumber: settings.gameweek_number,
        }),
      })
      const data = await res.json()

      if (data.success) {
        setGroupId(data.data.groupId)
        setGroupNumber(data.data.groupNumber)
        setMyFplId(parseInt(fplId))
        setAuthStep('done')
        await loadStandings(data.data.groupId)
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

          {/* Auth form */}
          {authStep !== 'done' && (
            <div className="max-w-sm mx-auto">
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-full bg-brand-purple/10 flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-7 h-7 text-brand-purple" />
                </div>
                <h1 className="font-display font-bold text-2xl text-text-primary">
                  View Your Standings
                </h1>
                <p className="text-text-secondary mt-1 text-sm">
                  Enter your FPL ID and PIN to access your group
                </p>
              </div>

              <div className="card p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1.5">
                    FPL Team ID
                  </label>
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
                  <label className="block text-sm font-semibold text-text-secondary mb-1.5">
                    Your 4-Digit PIN
                  </label>
                  <input
                    type="text"
                    value={pinInput}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                      setPinInput(val)
                      setAuthError(null)
                    }}
                    onKeyDown={e => e.key === 'Enter' && handleAuth()}
                    placeholder="XXXX"
                    className="form-input font-mono text-center text-2xl tracking-widest"
                    maxLength={4}
                    disabled={authStep === 'loading'}
                  />
                  <p className="text-xs text-text-secondary mt-1">
                    The PIN was shown after your payment was confirmed
                  </p>
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
                  {authStep === 'loading' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading your group...
                    </>
                  ) : (
                    'View My Standings'
                  )}
                </button>

                {authStep === 'error' && (
                  <button
                    onClick={() => { setAuthStep('input'); setAuthError(null) }}
                    className="flex items-center gap-1.5 text-sm text-text-secondary mx-auto hover:text-text-primary"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Try again
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Standings view */}
          {authStep === 'done' && (
            <div className="space-y-4 animate-slide-up">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="font-display font-bold text-2xl text-text-primary">
                    Gameweek {settings.gameweek_number} — Group {groupNumber}
                  </h1>
                  {standingsData?.lastRefreshed && (
                    <p className="text-text-secondary text-sm flex items-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                      Last updated: {timeAgo(standingsData.lastRefreshed)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => groupId && loadStandings(groupId)}
                  disabled={loadingStandings}
                  className="flex items-center gap-1.5 text-sm text-brand-purple font-semibold hover:underline"
                >
                  <RotateCcw className={cn('w-4 h-4', loadingStandings && 'animate-spin')} />
                  Refresh
                </button>
              </div>

              {/* Prize banner */}
              {standingsData && standingsData.distributablePot > 0 && (
                <div className="bg-brand-purple text-white rounded-xl p-4">
                  <p className="text-sm text-white/70 mb-2">
                    🏆 Top {standingsData.winnersPerGroup} in your group win
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(standingsData.prizesByPosition).map(([pos, amount]) => (
                      <div key={pos} className="bg-white/10 rounded-lg px-3 py-1.5 text-sm font-semibold">
                        {pos === '1' ? '🥇' : pos === '2' ? '🥈' : pos === '3' ? '🥉' : `#${pos}`}{' '}
                        {formatKES(amount)}
                      </div>
                    ))}
                  </div>
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
                              <td key={j}>
                                <div className="skeleton h-4 rounded w-16" />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        standingsData?.standings.map((row) => {
                          const isMe = row.fpl_team_id === myFplId
                          const pos = row.standing_position ?? 999
                          const isWinner = pos <= (standingsData.winnersPerGroup ?? 2)

                          return (
                            <tr
                              key={row.fpl_team_id}
                              className={cn(
                                'transition-colors',
                                isMe && 'bg-brand-green/5 font-semibold',
                                isWinner && !isMe && 'bg-yellow-50/50'
                              )}
                            >
                              {/* Position */}
                              <td className="text-center">
                                <span className={cn(
                                  'font-bold text-sm',
                                  pos === 1 && 'text-yellow-500',
                                  pos === 2 && 'text-gray-400',
                                  pos === 3 && 'text-amber-700'
                                )}>
                                  {positionEmoji(pos)}
                                </span>
                              </td>

                              {/* Manager name + team */}
                              <td>
                                <div>
                                  <a
                                    href={`https://fantasy.premierleague.com/entry/${row.fpl_team_id}/event/${settings.gameweek_number}/`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-semibold text-text-primary hover:text-brand-purple transition-colors flex items-center gap-1 group"
                                  >
                                    {row.manager_name}
                                    {isMe && (
                                      <span className="text-xs bg-brand-green text-brand-purple font-bold px-1.5 py-0.5 rounded">
                                        YOU
                                      </span>
                                    )}
                                    <ExternalLink className="w-3 h-3 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </a>
                                  <a
                                    href={`https://fantasy.premierleague.com/entry/${row.fpl_team_id}/event/${settings.gameweek_number}/`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-text-secondary hover:text-brand-purple transition-colors"
                                  >
                                    {row.fpl_team_name}
                                  </a>
                                </div>
                              </td>

                              {/* Points */}
                              <td className="text-center">
                                <span className="font-bold text-text-primary">{row.gw_points}</span>
                              </td>

                              {/* Hits */}
                              <td className="text-center">
                                {row.transfer_hits > 0 ? (
                                  <span className="text-xs font-bold text-error bg-error/10 px-2 py-0.5 rounded">
                                    -{row.transfer_hits}
                                  </span>
                                ) : (
                                  <span className="text-text-secondary text-xs">—</span>
                                )}
                              </td>

                              {/* Chip */}
                              <td className="text-center">
                                {row.chip_used ? (
                                  <span className={cn('chip-badge', `chip-${row.chip_used}`)}>
                                    {CHIP_LABELS[row.chip_used] ?? row.chip_used}
                                  </span>
                                ) : (
                                  <span className="text-text-secondary text-xs">—</span>
                                )}
                              </td>

                              {/* Clean */}
                              <td className="text-center">
                                {row.is_clean ? (
                                  <span className="text-success text-base">✓</span>
                                ) : (
                                  <span className="text-text-secondary text-xs">✗</span>
                                )}
                              </td>

                              {/* Prize */}
                              <td className="text-right">
                                {isWinner && row.prize_amount > 0 ? (
                                  <span className="font-bold text-success text-sm">
                                    {formatKES(row.prize_amount)}
                                  </span>
                                ) : isWinner ? (
                                  <span className="text-xs text-success font-semibold">Winner</span>
                                ) : (
                                  <span className="text-text-secondary text-xs">—</span>
                                )}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tiebreaker note */}
              <p className="text-xs text-text-secondary text-center">
                <ArrowUpDown className="w-3 h-3 inline mr-1" />
                Managers with no transfer hits and no chips used are ranked higher on equal points
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer platformName={settings.platform_name} />
    </div>
  )
}