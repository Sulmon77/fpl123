'use client'
// src/app/[adminPath]/dashboard/entries/page.tsx

import { useState, useEffect } from 'react'
import {
  Search, Download, CheckCircle, XCircle, Ban, RotateCcw,
  AlertCircle, Loader2, ChevronDown, Eye, EyeOff
} from 'lucide-react'
import { formatKES, timeAgo, shortId } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Entry {
  id: string
  fpl_team_id: number
  fpl_team_name: string
  manager_name: string
  gameweek_number: number
  payment_method: 'mpesa' | 'paypal'
  payment_phone: string | null
  payment_email: string | null
  payment_status: 'pending' | 'confirmed' | 'refunded'
  pin: string
  pin_active: boolean
  confirmed_at: string | null
  disqualified: boolean
  disqualified_reason: string | null
  created_at: string
}

type FilterStatus = 'all' | 'confirmed' | 'pending' | 'refunded' | 'disqualified'

export default function EntriesPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterMethod, setFilterMethod] = useState<'all' | 'mpesa' | 'paypal'>('all')
  const [showPins, setShowPins] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Modals
  const [refundModal, setRefundModal] = useState<Entry | null>(null)
  const [disqualifyModal, setDisqualifyModal] = useState<Entry | null>(null)
  const [disqualifyReason, setDisqualifyReason] = useState('')
  const [refundAmount, setRefundAmount] = useState(0)

  const fetchEntries = async () => {
    try {
      const res = await fetch('/api/admin/entries')
      const data = await res.json()
      if (data.success) setEntries(data.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEntries() }, [])

  const filtered = entries.filter(e => {
    const matchSearch =
      !searchQuery ||
      e.manager_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.fpl_team_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.fpl_team_id.toString().includes(searchQuery)

    const matchStatus =
      filterStatus === 'all' ||
      (filterStatus === 'disqualified' ? e.disqualified : e.payment_status === filterStatus)

    const matchMethod = filterMethod === 'all' || e.payment_method === filterMethod

    return matchSearch && matchStatus && matchMethod
  })

  const handleConfirmPayment = async (entryId: string) => {
    setActionLoading(entryId)
    try {
      const res = await fetch('/api/admin/entries/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId }),
      })
      if ((await res.json()).success) await fetchEntries()
    } finally {
      setActionLoading(null)
    }
  }

  const handleRevokePin = async (entryId: string) => {
    setActionLoading(entryId)
    try {
      const res = await fetch('/api/admin/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId, action: 'revoke' }),
      })
      if ((await res.json()).success) await fetchEntries()
    } finally {
      setActionLoading(null)
    }
  }

  const handleDisqualify = async () => {
    if (!disqualifyModal) return
    setActionLoading(disqualifyModal.id)
    try {
      const res = await fetch('/api/admin/disqualify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: disqualifyModal.id, reason: disqualifyReason }),
      })
      if ((await res.json()).success) {
        await fetchEntries()
        setDisqualifyModal(null)
        setDisqualifyReason('')
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleRefund = async () => {
    if (!refundModal) return
    setActionLoading(refundModal.id)
    try {
      const res = await fetch('/api/admin/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: refundModal.id,
          amount: refundAmount,
        }),
      })
      if ((await res.json()).success) {
        await fetchEntries()
        setRefundModal(null)
      }
    } finally {
      setActionLoading(null)
    }
  }

  const exportCSV = () => {
    const headers = ['FPL ID', 'Manager', 'Team', 'Method', 'Phone/Email', 'Status', 'Confirmed At', 'PIN']
    const rows = filtered.map(e => [
      e.fpl_team_id,
      e.manager_name,
      e.fpl_team_name,
      e.payment_method,
      e.payment_phone || e.payment_email || '',
      e.payment_status,
      e.confirmed_at ?? '',
      e.pin,
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fpl123-entries-gw.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-purple" />
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-text-primary">Entries & Payments</h1>
          <p className="text-text-secondary mt-1">{filtered.length} entries shown</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPins(!showPins)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-lg hover:bg-gray-50 text-text-secondary"
          >
            {showPins ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPins ? 'Hide PINs' : 'Show PINs'}
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-brand-purple text-white rounded-lg hover:bg-opacity-90"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, team, or FPL ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="form-input pl-9 w-64"
          />
        </div>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as FilterStatus)}
          className="form-input w-36"
        >
          <option value="all">All Status</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="refunded">Refunded</option>
          <option value="disqualified">Disqualified</option>
        </select>

        <select
          value={filterMethod}
          onChange={e => setFilterMethod(e.target.value as 'all' | 'mpesa' | 'paypal')}
          className="form-input w-36"
        >
          <option value="all">All Methods</option>
          <option value="mpesa">M-Pesa</option>
          <option value="paypal">PayPal</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-border">
                <th className="text-left px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wide">Manager</th>
                <th className="text-left px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wide">FPL ID</th>
                <th className="text-left px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wide">Method</th>
                <th className="text-left px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wide">Contact</th>
                <th className="text-left px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wide">Status</th>
                {showPins && <th className="text-left px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wide">PIN</th>}
                <th className="text-left px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wide">When</th>
                <th className="text-right px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(entry => (
                <tr key={entry.id} className={cn('hover:bg-gray-50', entry.disqualified && 'opacity-60')}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-text-primary">{entry.manager_name}</div>
                    <div className="text-xs text-text-secondary">{entry.fpl_team_name}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-text-secondary">
                    {entry.fpl_team_id}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium">
                      {entry.payment_method === 'mpesa' ? '📱 M-Pesa' : '💳 PayPal'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">
                    {entry.payment_phone || entry.payment_email || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={entry.disqualified ? 'disqualified' : entry.payment_status}
                      pinActive={entry.pin_active}
                    />
                  </td>
                  {showPins && (
                    <td className="px-4 py-3 font-mono font-bold text-brand-purple">
                      {entry.pin}
                    </td>
                  )}
                  <td className="px-4 py-3 text-xs text-text-secondary">
                    {timeAgo(entry.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {entry.payment_status === 'pending' && (
                        <ActionButton
                          onClick={() => handleConfirmPayment(entry.id)}
                          loading={actionLoading === entry.id}
                          icon={<CheckCircle className="w-3.5 h-3.5" />}
                          label="Confirm"
                          color="text-success"
                        />
                      )}
                      {entry.payment_status === 'confirmed' && !entry.disqualified && (
                        <>
                          <ActionButton
                            onClick={() => handleRevokePin(entry.id)}
                            loading={actionLoading === entry.id}
                            icon={<XCircle className="w-3.5 h-3.5" />}
                            label={entry.pin_active ? 'Revoke PIN' : 'Restore PIN'}
                            color="text-warning"
                          />
                          <ActionButton
                            onClick={() => {
                              setRefundModal(entry)
                              setRefundAmount(200) // TODO: get from settings
                            }}
                            loading={actionLoading === entry.id}
                            icon={<RotateCcw className="w-3.5 h-3.5" />}
                            label="Refund"
                            color="text-blue-600"
                          />
                          <ActionButton
                            onClick={() => setDisqualifyModal(entry)}
                            loading={actionLoading === entry.id}
                            icon={<Ban className="w-3.5 h-3.5" />}
                            label="DQ"
                            color="text-error"
                          />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-12 text-center text-text-secondary">
              No entries match your filters
            </div>
          )}
        </div>
      </div>

      {/* Disqualify modal */}
      {disqualifyModal && (
        <Modal title="Disqualify Entry" onClose={() => setDisqualifyModal(null)}>
          <p className="text-sm text-text-secondary mb-4">
            Disqualifying <strong>{disqualifyModal.manager_name}</strong> will remove them from
            standings. This action cannot be undone automatically.
          </p>
          <textarea
            value={disqualifyReason}
            onChange={e => setDisqualifyReason(e.target.value)}
            placeholder="Reason for disqualification..."
            rows={3}
            className="form-input resize-none mb-4"
          />
          <div className="flex gap-3">
            <button
              onClick={() => setDisqualifyModal(null)}
              className="flex-1 py-2.5 border border-border rounded-lg text-sm font-semibold text-text-secondary hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDisqualify}
              disabled={!disqualifyReason || actionLoading === disqualifyModal.id}
              className="flex-1 py-2.5 bg-error text-white rounded-lg text-sm font-semibold hover:bg-opacity-90 disabled:opacity-50"
            >
              {actionLoading === disqualifyModal.id ? 'Processing...' : 'Disqualify'}
            </button>
          </div>
        </Modal>
      )}

      {/* Refund modal */}
      {refundModal && (
        <Modal title="Process Refund" onClose={() => setRefundModal(null)}>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-text-secondary">Manager</span>
                <span className="font-semibold">{refundModal.manager_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">FPL ID</span>
                <span className="font-mono">{refundModal.fpl_team_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Payment Method</span>
                <span>{refundModal.payment_method === 'mpesa' ? '📱 M-Pesa' : '💳 PayPal'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Send To</span>
                <span className="font-mono text-xs">{refundModal.payment_phone || refundModal.payment_email}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-secondary mb-1.5">
                Refund Amount (KES)
              </label>
              <input
                type="number"
                value={refundAmount}
                onChange={e => setRefundAmount(parseInt(e.target.value))}
                className="form-input"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setRefundModal(null)}
                className="flex-1 py-2.5 border border-border rounded-lg text-sm font-semibold text-text-secondary hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRefund}
                disabled={!refundAmount || actionLoading === refundModal.id}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-opacity-90 disabled:opacity-50"
              >
                {actionLoading === refundModal.id ? 'Processing...' : `Refund ${formatKES(refundAmount)}`}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function StatusBadge({
  status,
  pinActive,
}: {
  status: string
  pinActive?: boolean
}) {
  const styles: Record<string, string> = {
    confirmed: 'bg-success/10 text-success',
    pending: 'bg-warning/10 text-warning',
    refunded: 'bg-blue-100 text-blue-700',
    disqualified: 'bg-error/10 text-error',
  }

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${styles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
      {status === 'confirmed' && !pinActive && (
        <span className="text-warning">(PIN revoked)</span>
      )}
    </span>
  )
}

function ActionButton({
  onClick,
  loading,
  icon,
  label,
  color,
}: {
  onClick: () => void
  loading: boolean
  icon: React.ReactNode
  label: string
  color: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded hover:bg-gray-100 transition-colors disabled:opacity-50 ${color}`}
      title={label}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-slide-up">
        <h3 className="font-bold text-lg text-text-primary mb-4">{title}</h3>
        {children}
      </div>
    </div>
  )
}
