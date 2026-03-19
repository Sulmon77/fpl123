'use client'
// src/app/[adminPath]/dashboard/payouts/page.tsx

import { useState, useEffect } from 'react'
import {
  DollarSign, Eye, Zap, Loader2, CheckCircle, XCircle,
  AlertTriangle, Lock, Trophy, Megaphone, ListPlus, Filter,
} from 'lucide-react'
import { formatKES, positionEmoji, CHIP_LABELS } from '@/lib/utils'

interface Payout {
  id: string
  gameweek_number: number
  fpl_team_id: number
  fpl_team_name: string | null
  manager_name: string
  group_number: number | null
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

interface PayoutPreview {
  totalPot: number
  platformCut: number
  totalToDistribute: number
  winners: Array<{
    groupNumber: number
    position: number
    fplTeamId: number
    managerName: string
    fplTeamName: string
    gwPoints: number
    chipUsed: string | null
    prizeAmount: number
    paymentMethod: string
    paymentDetail: string
  }>
}

type SortBy = 'default' | 'method' | 'group' | 'status' | 'amount'

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [preview, setPreview] = useState<PayoutPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [triggering, setTriggering] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewConfirmed, setPreviewConfirmed] = useState(false)
  const [result, setResult] = useState<{ sent: number; failed: number; errors?: string[] } | null>(null)
  const [gwEnded, setGwEnded] = useState(false)
  const [gwNumber, setGwNumber] = useState<number | null>(null)

  // Sorting / filtering
  const [sortBy, setSortBy] = useState<SortBy>('default')
  const [filterMethod, setFilterMethod] = useState<'all' | 'mpesa' | 'paypal'>('all')
  const [filterGroup, setFilterGroup] = useState<'all' | string>('all')

  // Feature 2 — Generate payout records
  const [generating, setGenerating] = useState(false)
  const [generateResult, setGenerateResult] = useState<{ created: number; skipped: number } | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)

  // Feature 3 — Hall of Fame
  const [updatingHof, setUpdatingHof] = useState(false)
  const [hofResult, setHofResult] = useState<string | null>(null)

  // Feature 4 — Announce results
  const [announcing, setAnnouncing] = useState(false)
  const [announced, setAnnounced] = useState(false)
  const [announceError, setAnnounceError] = useState<string | null>(null)

  const fetchPayouts = async () => {
    try {
      const [payoutsRes, settingsRes] = await Promise.all([
        fetch('/api/admin/payouts'),
        fetch('/api/admin/settings'),
      ])
      const payoutsData = await payoutsRes.json()
      const settingsData = await settingsRes.json()

      if (payoutsData.success) setPayouts(payoutsData.data)
      if (settingsData.success) {
        setGwEnded(settingsData.data.gameweek_ended ?? false)
        setGwNumber(settingsData.data.gameweek_number)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPayouts() }, [])

  // Unique groups for filter dropdown
  const uniqueGroups = Array.from(
    new Set(payouts.map(p => p.group_number).filter(Boolean))
  ).sort((a, b) => (a ?? 0) - (b ?? 0))

  // Apply filter + sort
  const visiblePayouts = payouts
    .filter(p => {
      if (filterMethod !== 'all' && p.payment_method !== filterMethod) return false
      if (filterGroup !== 'all' && String(p.group_number) !== filterGroup) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'method') return a.payment_method.localeCompare(b.payment_method)
      if (sortBy === 'group') return (a.group_number ?? 0) - (b.group_number ?? 0)
      if (sortBy === 'status') return a.status.localeCompare(b.status)
      if (sortBy === 'amount') return b.amount - a.amount
      // default: group then position
      if ((a.group_number ?? 0) !== (b.group_number ?? 0))
        return (a.group_number ?? 0) - (b.group_number ?? 0)
      return a.position - b.position
    })

  const handlePreview = async () => {
    setLoadingPreview(true)
    try {
      const res = await fetch('/api/admin/payouts/preview')
      const data = await res.json()
      if (data.success) {
        setPreview(data.data)
        setShowPreviewModal(true)
        setPreviewConfirmed(false)
      }
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleTriggerAll = async () => {
    if (!previewConfirmed) return
    setTriggering(true)
    setShowPreviewModal(false)
    setResult(null)
    try {
      const res = await fetch('/api/admin/trigger-payouts', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        // Collect error details from failed payouts
        const errors = data.data.results
          ?.filter((r: { status: string; error?: string }) => r.status === 'failed')
          .map((r: { id: string; error?: string }) => `ID ${r.id.slice(0, 8)}: ${r.error ?? 'Unknown error'}`)

        setResult({ sent: data.data.sent, failed: data.data.failed, errors })
        await fetchPayouts()
      } else {
        setResult({ sent: 0, failed: 0, errors: [data.error ?? 'Unknown error'] })
      }
    } finally {
      setTriggering(false)
    }
  }

  // Single payout retry
  const handleSinglePayout = async (payoutId: string) => {
    try {
      const res = await fetch('/api/admin/trigger-payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutIds: [payoutId] }),
      })
      const data = await res.json()
      if (data.success) {
        await fetchPayouts()
        if (data.data.failed > 0) {
          const err = data.data.results?.[0]?.error
          setResult({ sent: 0, failed: 1, errors: [err ?? 'Payout failed. Check your M-Pesa/PayPal credentials.'] })
        }
      }
    } catch (err) {
      setResult({ sent: 0, failed: 1, errors: [String(err)] })
    }
  }

  // Feature 2 — Generate payout records
  const handleGenerate = async () => {
    setGenerating(true)
    setGenerateResult(null)
    setGenerateError(null)
    try {
      const res = await fetch('/api/admin/payouts/generate', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setGenerateResult(data.data)
        await fetchPayouts()
      } else {
        setGenerateError(data.error ?? 'Failed to generate payout records.')
      }
    } finally {
      setGenerating(false)
    }
  }

  // Feature 3 — Update Hall of Fame
  const handleUpdateHof = async () => {
    setUpdatingHof(true)
    setHofResult(null)
    try {
      const res = await fetch('/api/admin/hall-of-fame/update', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setHofResult(`Hall of Fame updated: ${data.data.winnersUpdated + data.data.participantsUpdated} entries.`)
      } else {
        setHofResult(`Error: ${data.error}`)
      }
    } finally {
      setUpdatingHof(false)
    }
  }

  // Feature 4 — Announce results
  const handleAnnounce = async () => {
    const confirmed = window.confirm(
      `This will publish GW${gwNumber} results to the History page (as hidden). Are you sure?`
    )
    if (!confirmed) return

    setAnnouncing(true)
    setAnnounceError(null)
    try {
      const res = await fetch('/api/admin/history/announce', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setAnnounced(true)
      } else {
        setAnnounceError(data.error ?? 'Failed to announce results.')
      }
    } finally {
      setAnnouncing(false)
    }
  }

  const pendingPayouts = payouts.filter(p => p.status === 'pending')
  const sentPayouts = payouts.filter(p => p.status === 'sent')
  const failedPayouts = payouts.filter(p => p.status === 'failed')
  const hasPendingPayouts = pendingPayouts.length > 0
  const hasGeneratedRecords = payouts.length > 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-purple" />
      </div>
    )
  }

  // Locked state
  if (!gwEnded) {
    return (
      <div className="p-6 sm:p-8 max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display font-bold text-2xl text-text-primary">Payouts</h1>
          <p className="text-text-secondary mt-1">GW{gwNumber} prize distribution</p>
        </div>
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-bold text-text-primary text-lg mb-2">Payouts Locked</h3>
          <p className="text-text-secondary text-sm max-w-sm mx-auto mb-6">
            End the gameweek first before previewing or triggering payouts.
          </p>
          <a
            href="../gw-controls"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-purple text-white rounded-lg text-sm font-bold hover:bg-opacity-90"
          >
            Go to GW Controls →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-text-primary">Payouts</h1>
          <p className="text-text-secondary mt-1">
            GW{gwNumber} •{' '}
            <span className="text-warning font-medium">{pendingPayouts.length} pending</span>
            {' • '}
            <span className="text-success font-medium">{sentPayouts.length} sent</span>
            {failedPayouts.length > 0 && (
              <> • <span className="text-error font-medium">{failedPayouts.length} failed</span></>
            )}
          </p>
        </div>

        {/* Main action buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleGenerate}
            disabled={generating || hasGeneratedRecords}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-text-primary text-sm font-semibold rounded-lg hover:bg-gray-200 disabled:opacity-50"
            title={hasGeneratedRecords ? 'Records already generated' : 'Generate payout records from standings'}
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListPlus className="w-4 h-4" />}
            Generate Records
          </button>

          <button
            onClick={handlePreview}
            disabled={loadingPreview}
            className="flex items-center gap-2 px-4 py-2.5 border border-brand-purple text-brand-purple text-sm font-semibold rounded-lg hover:bg-brand-purple/5"
          >
            {loadingPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            Preview Payouts
          </button>

          <button
            onClick={handleTriggerAll}
            disabled={triggering || !hasPendingPayouts}
            className="btn-primary flex items-center gap-2"
          >
            {triggering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Trigger All Payouts
          </button>
        </div>
      </div>

      {/* Generate result / error */}
      {generateResult && (
        <div className="flex items-center gap-2 bg-success/5 border border-success/20 rounded-lg p-4 mb-4">
          <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
          <p className="text-sm font-semibold text-success">
            Created {generateResult.created} payout records.{' '}
            {generateResult.skipped > 0 && `Skipped ${generateResult.skipped} (already existed).`}
          </p>
        </div>
      )}
      {generateError && (
        <div className="flex items-start gap-2 bg-error/5 border border-error/20 rounded-lg p-4 mb-4">
          <AlertTriangle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-error">Failed to generate payout records</p>
            <p className="text-xs text-error/80 mt-1">{generateError}</p>
          </div>
        </div>
      )}

      {/* Trigger result — shows full error details */}
      {result && (
        <div className={`p-4 rounded-lg border mb-4 ${
          result.failed > 0 ? 'bg-warning/5 border-warning/20' : 'bg-success/5 border-success/20'
        }`}>
          <div className="flex items-center gap-2">
            {result.failed > 0
              ? <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
              : <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />}
            <p className={`text-sm font-semibold ${result.failed > 0 ? 'text-warning' : 'text-success'}`}>
              {result.sent} payout{result.sent !== 1 ? 's' : ''} sent.
              {result.failed > 0 && ` ${result.failed} failed — see details below.`}
            </p>
          </div>
          {result.errors && result.errors.length > 0 && (
            <div className="mt-3 space-y-1">
              {result.errors.map((err, i) => (
                <p key={i} className="text-xs text-error bg-error/5 rounded px-3 py-1.5 font-mono">
                  ✗ {err}
                </p>
              ))}
              <p className="text-xs text-text-secondary mt-2">
                Common causes: wrong M-Pesa credentials, phone format issues, or PayPal account not verified.
                Check your environment variables and retry failed payouts individually.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Post-payout actions */}
      {sentPayouts.length > 0 && (
        <div className="card p-4 mb-6">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
            After Payouts — Final Steps
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleUpdateHof}
              disabled={updatingHof}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-purple/10 text-brand-purple text-sm font-semibold rounded-lg hover:bg-brand-purple/20 disabled:opacity-50"
            >
              {updatingHof ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
              Update Hall of Fame
            </button>

            <button
              onClick={handleAnnounce}
              disabled={announcing || announced}
              className="flex items-center gap-2 px-4 py-2.5 bg-success/10 text-success text-sm font-semibold rounded-lg hover:bg-success/20 disabled:opacity-50"
            >
              {announcing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : announced ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Megaphone className="w-4 h-4" />
              )}
              {announced ? 'Announced ✓' : 'Announce Results'}
            </button>
          </div>

          {hofResult && (
            <p className={`text-sm mt-3 font-medium ${hofResult.startsWith('Error') ? 'text-error' : 'text-success'}`}>
              {hofResult}
            </p>
          )}
          {announceError && (
            <p className="text-sm mt-3 text-error font-medium">{announceError}</p>
          )}
          {announced && (
            <p className="text-xs mt-2 text-text-secondary">
              Results saved to History (hidden). Go to <strong>History</strong> in the sidebar to make them public.
            </p>
          )}
        </div>
      )}

      {/* Filter/sort bar for table */}
      {payouts.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <Filter className="w-4 h-4 text-text-secondary" />

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortBy)}
            className="form-input w-40 text-sm"
          >
            <option value="default">Sort: Group/Position</option>
            <option value="method">Sort: Payment Method</option>
            <option value="group">Sort: Group Number</option>
            <option value="status">Sort: Status</option>
            <option value="amount">Sort: Amount (High→Low)</option>
          </select>

          <select
            value={filterMethod}
            onChange={e => setFilterMethod(e.target.value as 'all' | 'mpesa' | 'paypal')}
            className="form-input w-36 text-sm"
          >
            <option value="all">All Methods</option>
            <option value="mpesa">M-Pesa only</option>
            <option value="paypal">PayPal only</option>
          </select>

          {uniqueGroups.length > 1 && (
            <select
              value={filterGroup}
              onChange={e => setFilterGroup(e.target.value)}
              className="form-input w-36 text-sm"
            >
              <option value="all">All Groups</option>
              {uniqueGroups.map(g => (
                <option key={g} value={String(g)}>Group {g}</option>
              ))}
            </select>
          )}

          <span className="text-xs text-text-secondary ml-auto">
            Showing {visiblePayouts.length} of {payouts.length}
          </span>
        </div>
      )}

      {/* Payouts table */}
      <div className="card overflow-hidden">
        {payouts.length === 0 ? (
          <div className="py-12 text-center">
            <DollarSign className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-text-secondary text-sm">No payout records yet.</p>
            <p className="text-text-secondary text-xs mt-1">
              Click <strong>Generate Records</strong> first, then <strong>Preview Payouts</strong>, then <strong>Trigger All Payouts</strong>.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  {['Group', 'Manager', 'Position', 'Amount', 'Method', 'Payment Detail', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visiblePayouts.map(payout => (
                  <tr key={payout.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-text-secondary font-medium">
                      {payout.group_number != null ? `G${payout.group_number}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-text-primary">{payout.manager_name}</div>
                      {payout.fpl_team_name && (
                        <div className="text-xs text-text-secondary">{payout.fpl_team_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">{positionEmoji(payout.position)}</td>
                    <td className="px-4 py-3 font-bold text-success">{formatKES(payout.amount)}</td>
                    <td className="px-4 py-3 text-xs">
                      {payout.payment_method === 'mpesa' ? '📱 M-Pesa' : '💳 PayPal'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                      {payout.payment_detail}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          payout.status === 'sent'
                            ? 'bg-success/10 text-success'
                            : payout.status === 'failed'
                            ? 'bg-error/10 text-error'
                            : 'bg-warning/10 text-warning'
                        }`}>
                          {payout.status === 'sent'
                            ? <CheckCircle className="w-3 h-3" />
                            : payout.status === 'failed'
                            ? <XCircle className="w-3 h-3" />
                            : null}
                          {payout.status}
                        </span>
                        {/* Show error detail inline for failed payouts */}
                        {payout.status === 'failed' && payout.notes && (
                          <p className="text-xs text-error/70 mt-1 max-w-[180px] truncate" title={payout.notes}>
                            {payout.notes}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {payout.status === 'pending' && (
                        <button
                          onClick={() => handleSinglePayout(payout.id)}
                          className="text-xs text-brand-purple font-semibold hover:underline"
                        >
                          Send
                        </button>
                      )}
                      {payout.status === 'failed' && (
                        <button
                          onClick={() => handleSinglePayout(payout.id)}
                          className="text-xs text-error font-semibold hover:underline"
                        >
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreviewModal && preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowPreviewModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-border">
              <h3 className="font-bold text-xl text-text-primary">Payout Preview</h3>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center">
                  <div className="font-bold text-lg text-text-primary">{formatKES(preview.totalPot)}</div>
                  <div className="text-xs text-text-secondary">Total Pot</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-error">{formatKES(preview.platformCut)}</div>
                  <div className="text-xs text-text-secondary">Platform Cut</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-success">{formatKES(preview.totalToDistribute)}</div>
                  <div className="text-xs text-text-secondary">To Distribute</div>
                </div>
              </div>
            </div>

            <div className="overflow-y-auto max-h-80 p-4 space-y-2">
              {preview.winners
                .sort((a, b) => a.groupNumber - b.groupNumber || a.position - b.position)
                .map((winner, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                    <div>
                      <div className="font-semibold text-sm text-text-primary">
                        {positionEmoji(winner.position)} {winner.managerName}
                      </div>
                      <div className="text-xs text-text-secondary">
                        Group {winner.groupNumber} • {winner.gwPoints} pts
                        {winner.chipUsed && ` • ${CHIP_LABELS[winner.chipUsed as keyof typeof CHIP_LABELS] ?? winner.chipUsed}`}
                      </div>
                      <div className="text-xs font-mono text-text-secondary mt-0.5">{winner.paymentDetail}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-success">{formatKES(winner.prizeAmount)}</div>
                      <div className="text-xs text-text-secondary">{winner.paymentMethod}</div>
                    </div>
                  </div>
                ))}
            </div>

            <div className="p-6 border-t border-border space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={previewConfirmed}
                  onChange={e => setPreviewConfirmed(e.target.checked)}
                  className="w-4 h-4 accent-brand-purple"
                />
                <span className="text-sm font-semibold text-text-primary">
                  I have reviewed all {preview.winners.length} payouts and confirm they are correct
                </span>
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="flex-1 py-2.5 border border-border rounded-lg text-sm font-semibold text-text-secondary hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTriggerAll}
                  disabled={!previewConfirmed || triggering}
                  className="flex-1 py-2.5 bg-brand-green text-brand-purple font-bold rounded-lg text-sm hover:bg-opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {triggering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Trigger All Payouts
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
