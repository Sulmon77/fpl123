'use client'
// src/app/[adminPath]/dashboard/payouts/page.tsx

import { useState, useEffect } from 'react'
import {
  DollarSign, Eye, Zap, Loader2, CheckCircle, XCircle,
  AlertTriangle, Lock, Trophy, Megaphone, ListPlus, Filter,
  CheckSquare,
} from 'lucide-react'
import { formatKES, positionEmoji, CHIP_LABELS } from '@/lib/utils'
import type { EntryTier } from '@/types'

interface Payout {
  id: string
  gameweek_number: number
  fpl_team_id: number
  fpl_team_name: string | null
  manager_name: string
  group_number: number | null
  entry_tier: EntryTier
  position: number
  amount: number
  payment_method: 'mpesa' | 'paypal'
  payment_detail: string
  status: 'pending' | 'sent' | 'failed'
  marked_sent_at: string | null
  notes: string | null
}

interface PayoutPreview {
  totalPot: number
  platformCut: number
  totalToDistribute: number
  winners: Array<{
    groupNumber: number
    entry_tier: EntryTier
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
type TierFilter = 'all' | 'casual' | 'elite'

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [preview, setPreview] = useState<PayoutPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [triggering, setTriggering] = useState(false)
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewConfirmed, setPreviewConfirmed] = useState(false)
  const [result, setResult] = useState<{ sent: number; failed: number; errors?: string[] } | null>(null)
  const [gwEnded, setGwEnded] = useState(false)
  const [gwNumber, setGwNumber] = useState<number | null>(null)

  const [sortBy, setSortBy] = useState<SortBy>('default')
  const [filterMethod, setFilterMethod] = useState<'all' | 'mpesa' | 'paypal'>('all')
  const [filterGroup, setFilterGroup] = useState<'all' | string>('all')
  const [filterTier, setFilterTier] = useState<TierFilter>('all')

  const [generating, setGenerating] = useState(false)
  const [generateResult, setGenerateResult] = useState<{ created: number; skipped: number } | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const [updatingHof, setUpdatingHof] = useState(false)
  const [hofResult, setHofResult] = useState<string | null>(null)
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
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchPayouts() }, [])

  const uniqueGroups = Array.from(new Set(payouts.map(p => p.group_number).filter(Boolean))).sort((a, b) => (a ?? 0) - (b ?? 0))

  const visiblePayouts = payouts
    .filter(p => {
      if (filterMethod !== 'all' && p.payment_method !== filterMethod) return false
      if (filterGroup !== 'all' && String(p.group_number) !== filterGroup) return false
      if (filterTier !== 'all' && p.entry_tier !== filterTier) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'method') return a.payment_method.localeCompare(b.payment_method)
      if (sortBy === 'group') return (a.group_number ?? 0) - (b.group_number ?? 0)
      if (sortBy === 'status') return a.status.localeCompare(b.status)
      if (sortBy === 'amount') return b.amount - a.amount
      if ((a.group_number ?? 0) !== (b.group_number ?? 0)) return (a.group_number ?? 0) - (b.group_number ?? 0)
      return a.position - b.position
    })

  const handlePreview = async () => {
    setLoadingPreview(true)
    try {
      const res = await fetch('/api/admin/payouts/preview')
      const data = await res.json()
      if (data.success) { setPreview(data.data); setShowPreviewModal(true); setPreviewConfirmed(false) }
    } finally { setLoadingPreview(false) }
  }

  const handleTriggerAll = async () => {
    if (!previewConfirmed) return
    setTriggering(true); setShowPreviewModal(false); setResult(null)
    try {
      const res = await fetch('/api/admin/trigger-payouts', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        const errors = data.data.results?.filter((r: { status: string }) => r.status === 'failed').map((r: { id: string; error?: string }) => `ID ${r.id.slice(0, 8)}: ${r.error ?? 'Unknown error'}`)
        setResult({ sent: data.data.sent, failed: data.data.failed, errors })
        await fetchPayouts()
      } else {
        setResult({ sent: 0, failed: 0, errors: [data.error ?? 'Unknown error'] })
      }
    } finally { setTriggering(false) }
  }

  const handleMarkSent = async (payoutId: string) => {
    setMarkingId(payoutId)
    try {
      const res = await fetch('/api/admin/payouts/mark-sent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutId }),
      })
      const data = await res.json()
      if (data.success) await fetchPayouts()
    } finally { setMarkingId(null) }
  }

  const handleMarkAllSent = async () => {
    if (!window.confirm('Mark ALL pending payouts as sent? Only do this after you have paid all winners manually.')) return
    setMarkingAll(true)
    try {
      const res = await fetch('/api/admin/payouts/mark-sent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      })
      const data = await res.json()
      if (data.success) {
        await fetchPayouts()
        setResult({ sent: data.data.marked, failed: 0 })
      }
    } finally { setMarkingAll(false) }
  }

  const handleGenerate = async () => {
    setGenerating(true); setGenerateResult(null); setGenerateError(null)
    try {
      const res = await fetch('/api/admin/payouts/generate', { method: 'POST' })
      const data = await res.json()
      if (data.success) { setGenerateResult(data.data); await fetchPayouts() }
      else setGenerateError(data.error ?? 'Failed.')
    } finally { setGenerating(false) }
  }

  const handleUpdateHof = async () => {
    setUpdatingHof(true); setHofResult(null)
    try {
      const res = await fetch('/api/admin/hall-of-fame/update', { method: 'POST' })
      const data = await res.json()
      if (data.success) setHofResult(`Hall of Fame updated: ${data.data.winnersUpdated + data.data.participantsUpdated} entries.`)
      else setHofResult(`Error: ${data.error}`)
    } finally { setUpdatingHof(false) }
  }

  const handleAnnounce = async () => {
    if (!window.confirm(`Publish GW${gwNumber} results to History (hidden)?`)) return
    setAnnouncing(true); setAnnounceError(null)
    try {
      const res = await fetch('/api/admin/history/announce', { method: 'POST' })
      const data = await res.json()
      if (data.success) setAnnounced(true)
      else setAnnounceError(data.error ?? 'Failed.')
    } finally { setAnnouncing(false) }
  }

  const pendingPayouts = payouts.filter(p => p.status === 'pending')
  const sentPayouts = payouts.filter(p => p.status === 'sent')
  const failedPayouts = payouts.filter(p => p.status === 'failed')

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-brand-purple" /></div>

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
          <p className="text-text-secondary text-sm max-w-sm mx-auto mb-6">End the gameweek first before previewing or triggering payouts.</p>
          <a href="../gw-controls" className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-purple text-white rounded-lg text-sm font-bold hover:bg-opacity-90">
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
            <span className="text-warning font-medium">{pendingPayouts.length} pending</span>{' • '}
            <span className="text-success font-medium">{sentPayouts.length} sent</span>
            {failedPayouts.length > 0 && <> • <span className="text-error font-medium">{failedPayouts.length} failed</span></>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleGenerate} disabled={generating || payouts.length > 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-text-primary text-sm font-semibold rounded-lg hover:bg-gray-200 disabled:opacity-50">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListPlus className="w-4 h-4" />}
            Generate Records
          </button>
          <button onClick={handlePreview} disabled={loadingPreview}
            className="flex items-center gap-2 px-4 py-2.5 border border-brand-purple text-brand-purple text-sm font-semibold rounded-lg hover:bg-brand-purple/5">
            {loadingPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            Preview Payouts
          </button>
          <button onClick={handleTriggerAll} disabled={triggering || pendingPayouts.length === 0}
            className="btn-primary flex items-center gap-2">
            {triggering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Trigger All (Auto)
          </button>
        </div>
      </div>

      {/* Mark as sent section */}
      {pendingPayouts.length > 0 && (
        <div className="card p-4 mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-semibold text-text-primary text-sm">Manual Payouts</p>
              <p className="text-xs text-text-secondary mt-0.5">
                After paying winners directly on your phone, mark them as sent here.
              </p>
            </div>
            <button
              onClick={handleMarkAllSent}
              disabled={markingAll}
              className="flex items-center gap-2 px-4 py-2.5 bg-success/10 text-success border border-success/20 text-sm font-semibold rounded-lg hover:bg-success/20 disabled:opacity-50"
            >
              {markingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
              Mark All as Sent
            </button>
          </div>
        </div>
      )}

      {/* Generate result */}
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
          <p className="text-sm font-semibold text-error">{generateError}</p>
        </div>
      )}
      {result && (
        <div className={`p-4 rounded-lg border mb-4 ${result.failed > 0 ? 'bg-warning/5 border-warning/20' : 'bg-success/5 border-success/20'}`}>
          <div className="flex items-center gap-2">
            {result.failed > 0 ? <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" /> : <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />}
            <p className={`text-sm font-semibold ${result.failed > 0 ? 'text-warning' : 'text-success'}`}>
              {result.sent} payout{result.sent !== 1 ? 's' : ''} sent.
              {result.failed > 0 && ` ${result.failed} failed.`}
            </p>
          </div>
          {result.errors?.map((err, i) => (
            <p key={i} className="text-xs text-error bg-error/5 rounded px-3 py-1.5 font-mono mt-2">✗ {err}</p>
          ))}
        </div>
      )}

      {/* Post-payout actions */}
      {sentPayouts.length > 0 && (
        <div className="card p-4 mb-6">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">After Payouts — Final Steps</p>
          <div className="flex flex-wrap gap-3">
            <button onClick={handleUpdateHof} disabled={updatingHof}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-purple/10 text-brand-purple text-sm font-semibold rounded-lg hover:bg-brand-purple/20 disabled:opacity-50">
              {updatingHof ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
              Update Hall of Fame
            </button>
            <button onClick={handleAnnounce} disabled={announcing || announced}
              className="flex items-center gap-2 px-4 py-2.5 bg-success/10 text-success text-sm font-semibold rounded-lg hover:bg-success/20 disabled:opacity-50">
              {announcing ? <Loader2 className="w-4 h-4 animate-spin" /> : announced ? <CheckCircle className="w-4 h-4" /> : <Megaphone className="w-4 h-4" />}
              {announced ? 'Announced ✓' : 'Announce Results'}
            </button>
          </div>
          {hofResult && <p className={`text-sm mt-3 font-medium ${hofResult.startsWith('Error') ? 'text-error' : 'text-success'}`}>{hofResult}</p>}
          {announceError && <p className="text-sm mt-3 text-error font-medium">{announceError}</p>}
        </div>
      )}

      {/* Filter/sort bar */}
      {payouts.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <Filter className="w-4 h-4 text-text-secondary" />
          <select value={sortBy} onChange={e => setSortBy(e.target.value as SortBy)} className="form-input w-40 text-sm">
            <option value="default">Sort: Group/Position</option>
            <option value="method">Sort: Payment Method</option>
            <option value="group">Sort: Group Number</option>
            <option value="status">Sort: Status</option>
            <option value="amount">Sort: Amount</option>
          </select>
          <select value={filterTier} onChange={e => setFilterTier(e.target.value as TierFilter)} className="form-input w-32 text-sm">
            <option value="all">All Tiers</option>
            <option value="casual">Casual</option>
            <option value="elite">Elite</option>
          </select>
          <select value={filterMethod} onChange={e => setFilterMethod(e.target.value as 'all' | 'mpesa' | 'paypal')} className="form-input w-36 text-sm">
            <option value="all">All Methods</option>
            <option value="mpesa">M-Pesa only</option>
            <option value="paypal">PayPal only</option>
          </select>
          {uniqueGroups.length > 1 && (
            <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} className="form-input w-36 text-sm">
              <option value="all">All Groups</option>
              {uniqueGroups.map(g => <option key={g} value={String(g)}>Group {g}</option>)}
            </select>
          )}
          <span className="text-xs text-text-secondary ml-auto">Showing {visiblePayouts.length} of {payouts.length}</span>
        </div>
      )}

      {/* Payouts table */}
      <div className="card overflow-hidden">
        {payouts.length === 0 ? (
          <div className="py-12 text-center">
            <DollarSign className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-text-secondary text-sm">No payout records yet.</p>
            <p className="text-text-secondary text-xs mt-1">Click <strong>Generate Records</strong> first.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  {['Group', 'Tier', 'Manager', 'Position', 'Amount', 'Method', 'Payment Detail', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wide">{h}</th>
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
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${payout.entry_tier === 'elite' ? 'bg-brand-purple text-white' : 'bg-brand-purple/10 text-brand-purple'}`}>
                        {payout.entry_tier}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-text-primary">{payout.manager_name}</div>
                      {payout.fpl_team_name && <div className="text-xs text-text-secondary">{payout.fpl_team_name}</div>}
                    </td>
                    <td className="px-4 py-3">{positionEmoji(payout.position)}</td>
                    <td className="px-4 py-3 font-bold text-success">{formatKES(payout.amount)}</td>
                    <td className="px-4 py-3 text-xs">{payout.payment_method === 'mpesa' ? '📱 M-Pesa' : '💳 PayPal'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-text-secondary">{payout.payment_detail}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${payout.status === 'sent' ? 'bg-success/10 text-success' : payout.status === 'failed' ? 'bg-error/10 text-error' : 'bg-warning/10 text-warning'}`}>
                        {payout.status === 'sent' ? <CheckCircle className="w-3 h-3" /> : payout.status === 'failed' ? <XCircle className="w-3 h-3" /> : null}
                        {payout.status}
                        {payout.marked_sent_at && <span className="text-[9px] opacity-60 ml-1">(manual)</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {payout.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleMarkSent(payout.id)}
                              disabled={markingId === payout.id}
                              className="flex items-center gap-1 text-xs text-success font-semibold hover:underline disabled:opacity-50"
                            >
                              {markingId === payout.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                              Mark Sent
                            </button>
                          </>
                        )}
                        {payout.status === 'failed' && (
                          <button onClick={() => fetch('/api/admin/trigger-payouts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payoutIds: [payout.id] }) }).then(() => fetchPayouts())}
                            className="text-xs text-error font-semibold hover:underline">
                            Retry
                          </button>
                        )}
                      </div>
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
              {preview.winners.sort((a, b) => a.groupNumber - b.groupNumber || a.position - b.position).map((winner, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                  <div>
                    <div className="font-semibold text-sm text-text-primary flex items-center gap-2">
                      {positionEmoji(winner.position)} {winner.managerName}
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${winner.entry_tier === 'elite' ? 'bg-brand-purple text-white' : 'bg-brand-purple/10 text-brand-purple'}`}>
                        {winner.entry_tier}
                      </span>
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
                <input type="checkbox" checked={previewConfirmed} onChange={e => setPreviewConfirmed(e.target.checked)} className="w-4 h-4 accent-brand-purple" />
                <span className="text-sm font-semibold text-text-primary">
                  I have reviewed all {preview.winners.length} payouts and confirm they are correct
                </span>
              </label>
              <div className="flex gap-3">
                <button onClick={() => setShowPreviewModal(false)} className="flex-1 py-2.5 border border-border rounded-lg text-sm font-semibold text-text-secondary hover:bg-gray-50">Cancel</button>
                <button onClick={handleTriggerAll} disabled={!previewConfirmed || triggering} className="flex-1 py-2.5 bg-brand-green text-brand-purple font-bold rounded-lg text-sm hover:bg-opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
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