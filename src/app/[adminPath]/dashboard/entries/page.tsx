'use client'
// src/app/[adminPath]/dashboard/entries/page.tsx

import { useState, useEffect, useCallback } from 'react'
import {
  Search, Download, CheckCircle, XCircle, Ban, RotateCcw,
  AlertCircle, Loader2, Eye, EyeOff, UserX, ChevronDown,
} from 'lucide-react'
import { formatKES, timeAgo } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { EntryTier } from '@/types'

interface Entry {
  id: string
  fpl_team_id: number
  fpl_team_name: string
  manager_name: string
  gameweek_number: number
  entry_tier: EntryTier
  payment_method: 'mpesa' | 'paypal' | 'manual'
  payment_phone: string | null
  payment_email: string | null
  payment_status: 'pending' | 'confirmed' | 'refunded'
  pin: string
  pin_active: boolean
  confirmed_at: string | null
  disqualified: boolean
  disqualified_reason: string | null
  notes: string | null
  created_at: string
}

type FilterStatus = 'all' | 'confirmed' | 'refunded' | 'disqualified'
type TierFilter = 'all' | 'casual' | 'elite'

interface Settings {
  gameweek_number: number
  entry_fee: number
  casual_settings?: { entry_fee: number }
  elite_settings?: { entry_fee: number }
}

export default function EntriesPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterMethod, setFilterMethod] = useState<'all' | 'mpesa' | 'paypal' | 'manual'>('all')
  const [filterGw, setFilterGw] = useState<'current' | 'all'>('current')
  const [filterTier, setFilterTier] = useState<TierFilter>('all')
  const [showPins, setShowPins] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [refundModal, setRefundModal] = useState<Entry | null>(null)
  const [disqualifyModal, setDisqualifyModal] = useState<Entry | null>(null)
  const [disqualifyReason, setDisqualifyReason] = useState('')
  const [refundAmount, setRefundAmount] = useState(0)
  const [refundResult, setRefundResult] = useState<{ success: boolean; message: string } | null>(null)
  const [bulkResult, setBulkResult] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [entriesRes, settingsRes] = await Promise.all([
        fetch('/api/admin/entries'),   // pending filtered server-side
        fetch('/api/admin/settings'),
      ])
      const entriesData = await entriesRes.json()
      const settingsData = await settingsRes.json()
      if (entriesData.success) setEntries(entriesData.data)
      if (settingsData.success) setSettings(settingsData.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { setSelectedIds(new Set()) }, [filterStatus, filterMethod, filterGw, filterTier, searchQuery])

  const filtered = entries.filter(e => {
    const matchGw = filterGw === 'all' || e.gameweek_number === (settings?.gameweek_number ?? 0)
    const matchSearch = !searchQuery ||
      e.manager_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.fpl_team_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.fpl_team_id.toString().includes(searchQuery)
    const matchStatus = filterStatus === 'all' ||
      (filterStatus === 'disqualified' ? e.disqualified : e.payment_status === filterStatus)
    const matchMethod = filterMethod === 'all' || e.payment_method === filterMethod
    const matchTier = filterTier === 'all' || e.entry_tier === filterTier
    return matchGw && matchSearch && matchStatus && matchMethod && matchTier
  })

  const allSelected = filtered.length > 0 && filtered.every(e => selectedIds.has(e.id))
  const someSelected = selectedIds.size > 0
  const toggleAll = () => { allSelected ? setSelectedIds(new Set()) : setSelectedIds(new Set(filtered.map(e => e.id))) }
  const toggleOne = (id: string) => { const n = new Set(selectedIds); n.has(id) ? n.delete(id) : n.add(id); setSelectedIds(n) }

  const handleConfirmPayment = async (entryId: string) => {
    setActionLoading(entryId)
    try {
      const res = await fetch('/api/admin/entries/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entryId }) })
      if ((await res.json()).success) await fetchData()
    } finally { setActionLoading(null) }
  }

  const handleRevokePin = async (entryId: string) => {
    setActionLoading(entryId)
    try {
      const res = await fetch('/api/admin/pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entryId, action: 'revoke' }) })
      if ((await res.json()).success) await fetchData()
    } finally { setActionLoading(null) }
  }

  const handleDisqualify = async () => {
    if (!disqualifyModal) return
    setActionLoading(disqualifyModal.id)
    try {
      const res = await fetch('/api/admin/disqualify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entryId: disqualifyModal.id, reason: disqualifyReason }) })
      if ((await res.json()).success) { await fetchData(); setDisqualifyModal(null); setDisqualifyReason('') }
    } finally { setActionLoading(null) }
  }

  const handleRefund = async () => {
    if (!refundModal) return
    setActionLoading(refundModal.id); setRefundResult(null)
    try {
      const res = await fetch('/api/admin/refund', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entryId: refundModal.id, amount: refundAmount }) })
      const data = await res.json()
      if (data.success) { setRefundResult({ success: true, message: data.data.message }); await fetchData(); setRefundModal(null) }
      else setRefundResult({ success: false, message: data.error })
    } finally { setActionLoading(null) }
  }

  const handleBulkDecline = async () => {
    const ids = Array.from(selectedIds)
    if (!ids.length || !window.confirm(`Decline ${ids.length} selected entries?`)) return
    setBulkResult(null); setActionLoading('bulk')
    try {
      const res = await fetch('/api/admin/entries/decline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entryIds: ids }) })
      const data = await res.json()
      if (data.success) { setBulkResult(`✓ Declined ${data.data.declined} entries.`); setSelectedIds(new Set()); await fetchData() }
      else setBulkResult(`✗ ${data.error}`)
    } finally { setActionLoading(null) }
  }

  const handleBulkUnconfirm = async () => {
    const ids = Array.from(selectedIds)
    if (!ids.length || !window.confirm(`Unconfirm ${ids.length} selected entries?`)) return
    setBulkResult(null); setActionLoading('bulk')
    try {
      const res = await fetch('/api/admin/entries/unconfirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entryIds: ids }) })
      const data = await res.json()
      if (data.success) { setBulkResult(`✓ Unconfirmed ${data.data.unconfirmed} entries.`); setSelectedIds(new Set()); await fetchData() }
      else setBulkResult(`✗ ${data.error}`)
    } finally { setActionLoading(null) }
  }

  const getFeeForEntry = (entry: Entry): number => {
    if (entry.entry_tier === 'elite') return settings?.elite_settings?.entry_fee ?? settings?.entry_fee ?? 1000
    return settings?.casual_settings?.entry_fee ?? settings?.entry_fee ?? 200
  }

  const exportCSV = () => {
    const headers = ['GW', 'Tier', 'FPL ID', 'Manager', 'Team', 'Method', 'Phone/Email', 'Status', 'Confirmed At', 'PIN', 'Notes']
    const rows = filtered.map(e => [e.gameweek_number, e.entry_tier, e.fpl_team_id, e.manager_name, e.fpl_team_name, e.payment_method, e.payment_phone || e.payment_email || '', e.payment_status, e.confirmed_at ?? '', e.pin, e.notes ?? ''])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `fpl123-entries-gw${settings?.gameweek_number ?? ''}.csv`; a.click()
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-brand-purple" /></div>

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-text-primary">Entries &amp; Payments</h1>
          <p className="text-text-secondary mt-1">{filtered.length} entries shown (pending hidden)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPins(!showPins)} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-lg hover:bg-gray-50 text-text-secondary">
            {showPins ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPins ? 'Hide PINs' : 'Show PINs'}
          </button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-brand-purple text-white rounded-lg hover:bg-opacity-90">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {refundResult && (
        <div className={cn('flex items-start gap-2 p-4 rounded-lg border mb-4 text-sm font-medium', refundResult.success ? 'bg-success/5 border-success/20 text-success' : 'bg-error/5 border-error/20 text-error')}>
          {refundResult.success ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
          <p>{refundResult.message}</p>
          <button onClick={() => setRefundResult(null)} className="ml-auto text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {bulkResult && (
        <div className={cn('flex items-center gap-2 p-4 rounded-lg border mb-4 text-sm font-medium', bulkResult.startsWith('✓') ? 'bg-success/5 border-success/20 text-success' : 'bg-error/5 border-error/20 text-error')}>
          <p>{bulkResult}</p>
          <button onClick={() => setBulkResult(null)} className="ml-auto text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="Search name, team, FPL ID..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="form-input pl-9 w-64" />
        </div>
        <select value={filterGw} onChange={e => setFilterGw(e.target.value as 'current' | 'all')} className="form-input w-44">
          <option value="current">GW{settings?.gameweek_number} (Current)</option>
          <option value="all">All Gameweeks</option>
        </select>
        {/* Tier filter */}
        <select value={filterTier} onChange={e => setFilterTier(e.target.value as TierFilter)} className="form-input w-32">
          <option value="all">All Tiers</option>
          <option value="casual">Casual</option>
          <option value="elite">Elite</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as FilterStatus)} className="form-input w-36">
          <option value="all">All Status</option>
          <option value="confirmed">Confirmed</option>
          <option value="refunded">Refunded</option>
          <option value="disqualified">Disqualified</option>
        </select>
        <select value={filterMethod} onChange={e => setFilterMethod(e.target.value as 'all' | 'mpesa' | 'paypal' | 'manual')} className="form-input w-36">
          <option value="all">All Methods</option>
          <option value="mpesa">M-Pesa</option>
          <option value="paypal">PayPal</option>
          <option value="manual">Manual</option>
        </select>
      </div>

      {someSelected && (
        <div className="flex items-center gap-3 bg-brand-purple/5 border border-brand-purple/20 rounded-lg px-4 py-2.5 mb-4">
          <span className="text-sm font-semibold text-brand-purple">{selectedIds.size} selected</span>
          <div className="flex gap-2 ml-2">
            <button onClick={handleBulkDecline} disabled={actionLoading === 'bulk'} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-error/10 text-error rounded-lg hover:bg-error/20 disabled:opacity-50">
              {actionLoading === 'bulk' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserX className="w-3.5 h-3.5" />} Decline Selected
            </button>
            <button onClick={handleBulkUnconfirm} disabled={actionLoading === 'bulk'} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-warning/10 text-warning rounded-lg hover:bg-warning/20 disabled:opacity-50">
              {actionLoading === 'bulk' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />} Unconfirm Selected
            </button>
          </div>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-text-secondary hover:text-text-primary">Clear</button>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-border">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 accent-brand-purple cursor-pointer" />
                </th>
                {['Manager', 'Tier', 'FPL ID', 'GW', 'Method', 'Contact', 'Status', ...(showPins ? ['PIN'] : []), 'When', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(entry => (
                <tr key={entry.id} className={cn('hover:bg-gray-50', entry.disqualified && 'opacity-60', selectedIds.has(entry.id) && 'bg-brand-purple/5')}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selectedIds.has(entry.id)} onChange={() => toggleOne(entry.id)} className="w-4 h-4 accent-brand-purple cursor-pointer" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-text-primary">{entry.manager_name}</div>
                    <div className="text-xs text-text-secondary">{entry.fpl_team_name}</div>
                    {entry.notes && <div className="text-xs text-orange-500 mt-0.5">{entry.notes}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full', entry.entry_tier === 'elite' ? 'bg-brand-purple text-white' : 'bg-brand-purple/10 text-brand-purple')}>
                      {entry.entry_tier}
                    </span>
                    <div className="text-xs text-text-secondary mt-0.5">{formatKES(getFeeForEntry(entry))}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-text-secondary">{entry.fpl_team_id}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary font-medium">GW{entry.gameweek_number}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium">
                      {entry.payment_method === 'mpesa' ? '📱 M-Pesa' : entry.payment_method === 'paypal' ? '💳 PayPal' : '🤝 Manual'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">{entry.payment_phone || entry.payment_email || '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={entry.disqualified ? 'disqualified' : entry.payment_status} pinActive={entry.pin_active} />
                  </td>
                  {showPins && <td className="px-4 py-3 font-mono font-bold text-brand-purple">{entry.pin}</td>}
                  <td className="px-4 py-3 text-xs text-text-secondary">{timeAgo(entry.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {entry.payment_status === 'confirmed' && !entry.disqualified && (
                        <>
                          <ActionButton onClick={() => handleRevokePin(entry.id)} loading={actionLoading === entry.id}
                            icon={<XCircle className="w-3.5 h-3.5" />} label={entry.pin_active ? 'Revoke PIN' : 'Restore PIN'} color="text-warning" />
                          <ActionButton onClick={() => { setRefundModal(entry); setRefundAmount(getFeeForEntry(entry)) }} loading={actionLoading === entry.id}
                            icon={<RotateCcw className="w-3.5 h-3.5" />} label="Refund" color="text-blue-600" />
                          <ActionButton onClick={() => setDisqualifyModal(entry)} loading={actionLoading === entry.id}
                            icon={<Ban className="w-3.5 h-3.5" />} label="DQ" color="text-error" />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="py-12 text-center text-text-secondary">No entries match your filters</div>}
        </div>
      </div>

      {/* Disqualify modal */}
      {disqualifyModal && (
        <Modal title="Disqualify Entry" onClose={() => setDisqualifyModal(null)}>
          <p className="text-sm text-text-secondary mb-4">Disqualifying <strong>{disqualifyModal.manager_name}</strong> removes them from standings.</p>
          <textarea value={disqualifyReason} onChange={e => setDisqualifyReason(e.target.value)} placeholder="Reason..." rows={3} className="form-input resize-none mb-4" />
          <div className="flex gap-3">
            <button onClick={() => setDisqualifyModal(null)} className="flex-1 py-2.5 border border-border rounded-lg text-sm font-semibold text-text-secondary hover:bg-gray-50">Cancel</button>
            <button onClick={handleDisqualify} disabled={!disqualifyReason || actionLoading === disqualifyModal.id} className="flex-1 py-2.5 bg-error text-white rounded-lg text-sm font-semibold disabled:opacity-50">
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
              <div className="flex justify-between"><span className="text-text-secondary">Manager</span><span className="font-semibold">{refundModal.manager_name}</span></div>
              <div className="flex justify-between"><span className="text-text-secondary">Tier</span><span className="capitalize font-semibold">{refundModal.entry_tier}</span></div>
              <div className="flex justify-between"><span className="text-text-secondary">Payment</span><span>{refundModal.payment_method === 'mpesa' ? '📱 M-Pesa' : refundModal.payment_method === 'paypal' ? '💳 PayPal' : '🤝 Manual'}</span></div>
              <div className="flex justify-between"><span className="text-text-secondary">Send To</span><span className="font-mono text-xs">{refundModal.payment_phone || refundModal.payment_email || 'N/A'}</span></div>
            </div>
            {refundModal.payment_method === 'manual' && (
              <div className="bg-warning/5 border border-warning/20 rounded-lg p-3 text-xs text-warning font-medium">
                Manual entry — no automatic refund will be sent.
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-text-secondary mb-1.5">Refund Amount (KES)</label>
              <input type="number" value={refundAmount} onChange={e => setRefundAmount(parseInt(e.target.value))} className="form-input" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setRefundModal(null)} className="flex-1 py-2.5 border border-border rounded-lg text-sm font-semibold text-text-secondary hover:bg-gray-50">Cancel</button>
              <button onClick={handleRefund} disabled={!refundAmount || actionLoading === refundModal.id} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                {actionLoading === refundModal.id ? 'Processing...' : `Refund ${formatKES(refundAmount)}`}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function StatusBadge({ status, pinActive }: { status: string; pinActive?: boolean }) {
  const styles: Record<string, string> = {
    confirmed: 'bg-success/10 text-success',
    pending: 'bg-warning/10 text-warning',
    refunded: 'bg-blue-100 text-blue-700',
    disqualified: 'bg-error/10 text-error',
  }
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${styles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
      {status === 'confirmed' && !pinActive && <span className="text-warning">(PIN revoked)</span>}
    </span>
  )
}

function ActionButton({ onClick, loading, icon, label, color }: { onClick: () => void; loading: boolean; icon: React.ReactNode; label: string; color: string }) {
  return (
    <button onClick={onClick} disabled={loading} className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded hover:bg-gray-100 transition-colors disabled:opacity-50 ${color}`} title={label}>
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
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