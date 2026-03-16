'use client'
// src/app/[adminPath]/dashboard/payouts/page.tsx

import { useState, useEffect } from 'react'
import {
  DollarSign, Eye, Zap, Loader2, CheckCircle, XCircle,
  AlertTriangle, Lock, Trophy, Megaphone, ListPlus,
} from 'lucide-react'
import { formatKES, positionEmoji, CHIP_LABELS } from '@/lib/utils'

interface Payout {
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

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [preview, setPreview] = useState<PayoutPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [triggering, setTriggering] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewConfirmed, setPreviewConfirmed] = useState(false)
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null)
  const [gwEnded, setGwEnded] = useState(false)
  const [gwNumber, setGwNumber] = useState<number | null>(null)

  // Feature 2 — Generate payout records
  const [generating, setGenerating] = useState(false)
  const [generateResult, setGenerateResult] = useState<{ created: number; skipped: number } | null>(null)

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
    try {
      const res = await fetch('/api/admin/trigger-payouts', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setResult({ sent: data.data.sent, failed: data.data.failed })
        await fetchPayouts()
      }
    } finally {
      setTriggering(false)
    }
  }

  // Feature 2 — Generate payout records
  const handleGenerate = async () => {
    setGenerating(true)
    setGenerateResult(null)
    try {
      const res = await fetch('/api/admin/payouts/generate', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setGenerateResult(data.data)
        await fetchPayouts()
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
        setAnnounceError(data.error)
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

  // Locked state — GW not ended yet
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
            You need to end the gameweek before you can preview or trigger payouts.
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display font-bold text-2xl text-text-primary">Payouts</h1>
          <p className="text-text-secondary mt-1">
            {pendingPayouts.length} pending • {sentPayouts.length} sent • {failedPayouts.length} failed
          </p>
        </div>

        {/* Main payout action buttons */}
        <div className="flex flex-wrap gap-2">

          {/* Step 1: Generate payout records */}
          <button
            onClick={handleGenerate}
            disabled={generating || hasGeneratedRecords}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-text-primary text-sm font-semibold rounded-lg hover:bg-gray-200 disabled:opacity-50"
            title={hasGeneratedRecords ? 'Records already generated' : 'Generate payout records from standings'}
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListPlus className="w-4 h-4" />}
            Generate Records
          </button>

          {/* Step 2: Preview payouts */}
          <button
            onClick={handlePreview}
            disabled={loadingPreview}
            className="flex items-center gap-2 px-4 py-2.5 border border-brand-purple text-brand-purple text-sm font-semibold rounded-lg hover:bg-brand-purple/5"
          >
            {loadingPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            Preview Payouts
          </button>

          {/* Step 3: Trigger all payouts */}
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

      {/* Generate result banner */}
      {generateResult && (
        <div className="flex items-center gap-2 bg-success/5 border border-success/20 rounded-lg p-4 mb-4">
          <CheckCircle className="w-4 h-4 text-success" />
          <p className="text-sm font-semibold text-success">
            Created {generateResult.created} payout records. Skipped {generateResult.skipped} (already existed).
          </p>
        </div>
      )}

      {/* Trigger result banner */}
      {result && (
        <div className={`flex items-center gap-2 p-4 rounded-lg border mb-4 ${
          result.failed > 0
            ? 'bg-warning/5 border-warning/20 text-warning'
            : 'bg-success/5 border-success/20 text-success'
        }`}>
          {result.failed > 0 ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          <p className="text-sm font-semibold">
            {result.sent} payouts sent successfully.{result.failed > 0 && ` ${result.failed} failed — check logs.`}
          </p>
        </div>
      )}

      {/* Post-payout actions — only show after payouts are sent */}
      {sentPayouts.length > 0 && (
        <div className="card p-4 mb-6">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
            After Payouts — Final Steps
          </p>
          <div className="flex flex-wrap gap-3">

            {/* Hall of Fame update */}
            <button
              onClick={handleUpdateHof}
              disabled={updatingHof}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-purple/10 text-brand-purple text-sm font-semibold rounded-lg hover:bg-brand-purple/20 disabled:opacity-50"
            >
              {updatingHof ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
              Update Hall of Fame
            </button>

            {/* Announce results */}
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

          {/* Hall of Fame result */}
          {hofResult && (
            <p className={`text-sm mt-3 font-medium ${hofResult.startsWith('Error') ? 'text-error' : 'text-success'}`}>
              {hofResult}
            </p>
          )}

          {/* Announce error */}
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
                  {['Manager', 'Position', 'Amount', 'Method', 'Payment Detail', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payouts.map(payout => (
                  <tr key={payout.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-text-primary">{payout.manager_name}</td>
                    <td className="px-4 py-3">{positionEmoji(payout.position)}</td>
                    <td className="px-4 py-3 font-bold text-success">{formatKES(payout.amount)}</td>
                    <td className="px-4 py-3 text-xs">{payout.payment_method === 'mpesa' ? '📱 M-Pesa' : '💳 PayPal'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-text-secondary">{payout.payment_detail}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        payout.status === 'sent' ? 'bg-success/10 text-success' :
                        payout.status === 'failed' ? 'bg-error/10 text-error' :
                        'bg-warning/10 text-warning'
                      }`}>
                        {payout.status === 'sent' ? <CheckCircle className="w-3 h-3" /> :
                         payout.status === 'failed' ? <XCircle className="w-3 h-3" /> : null}
                        {payout.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {payout.status === 'pending' && (
                        <button
                          onClick={async () => {
                            await fetch('/api/admin/trigger-payouts', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ payoutIds: [payout.id] }),
                            })
                            await fetchPayouts()
                          }}
                          className="text-xs text-brand-purple font-semibold hover:underline"
                        >
                          Send
                        </button>
                      )}
                      {payout.status === 'failed' && (
                        <button
                          onClick={async () => {
                            await fetch('/api/admin/trigger-payouts', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ payoutIds: [payout.id] }),
                            })
                            await fetchPayouts()
                          }}
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
              {preview.winners.map((winner, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                  <div>
                    <div className="font-semibold text-sm text-text-primary">
                      {positionEmoji(winner.position)} {winner.managerName}
                    </div>
                    <div className="text-xs text-text-secondary">
                      Group {winner.groupNumber} • {winner.gwPoints} pts
                      {winner.chipUsed && ` • ${CHIP_LABELS[winner.chipUsed] ?? winner.chipUsed}`}
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