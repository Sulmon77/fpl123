'use client'
// src/app/[adminPath]/dashboard/user-management/page.tsx

import { useState, useEffect, useCallback } from 'react'
import {
  UserPlus, UserMinus, Users, Loader2, CheckCircle,
  AlertCircle, Search, ChevronDown, X,
} from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Entry {
  id: string
  fpl_team_id: number
  fpl_team_name: string
  manager_name: string
  gameweek_number: number
  payment_method: 'mpesa' | 'paypal' | 'manual'
  payment_phone: string | null
  payment_email: string | null
  payment_status: 'pending' | 'confirmed' | 'refunded'
  pin: string
  pin_active: boolean
  confirmed_at: string | null
  notes: string | null
  created_at: string
}

interface Group {
  id: string
  group_number: number
  member_count: number
}

interface Settings {
  gameweek_number: number
  entry_fee: number
}

type ActionResult = { success: boolean; message: string } | null

export default function UserManagementPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [result, setResult] = useState<ActionResult>(null)

  // Add user modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({
    fplTeamId: '',
    fplTeamName: '',
    managerName: '',
    paymentMethod: 'manual' as 'mpesa' | 'paypal' | 'manual',
    paymentPhone: '',
    paymentEmail: '',
    notes: '',
  })
  const [addResult, setAddResult] = useState<ActionResult>(null)
  const [addLoading, setAddLoading] = useState(false)

  // Add to group modal
  const [addToGroupEntry, setAddToGroupEntry] = useState<Entry | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<string>('random')
  const [addGroupLoading, setAddGroupLoading] = useState(false)
  const [addGroupResult, setAddGroupResult] = useState<ActionResult>(null)

  const fetchData = useCallback(async () => {
    try {
      const [entriesRes, settingsRes] = await Promise.all([
        fetch('/api/admin/entries'),
        fetch('/api/admin/settings'),
      ])
      const entriesData = await entriesRes.json()
      const settingsData = await settingsRes.json()

      if (entriesData.success) setEntries(entriesData.data)
      if (settingsData.success) setSettings(settingsData.data)

      // Fetch groups for current GW if settings loaded
      if (settingsData.success) {
        const groupsRes = await fetch('/api/admin/groups')
        const groupsData = await groupsRes.json()
        if (groupsData.success) {
          setGroups(groupsData.data ?? [])
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const currentGwEntries = entries.filter(
    e => e.gameweek_number === (settings?.gameweek_number ?? 0)
  )

  const filtered = currentGwEntries.filter(e => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      e.manager_name.toLowerCase().includes(q) ||
      e.fpl_team_name.toLowerCase().includes(q) ||
      e.fpl_team_id.toString().includes(q)
    )
  })

  // Checkbox helpers
  const allSelected = filtered.length > 0 && filtered.every(e => selectedIds.has(e.id))
  const someSelected = selectedIds.size > 0

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(filtered.map(e => e.id)))
  }
  const toggleOne = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  // ── Unconfirm ────────────────────────────────────────────────────────────
  const handleUnconfirm = async (ids?: string[]) => {
    const entryIds = ids ?? Array.from(selectedIds)
    if (!entryIds.length) return
    if (!window.confirm(`Unconfirm ${entryIds.length} user(s)? They will reappear as pending in Entries & Payments. PINs stay active.`)) return

    setActionLoading('unconfirm')
    setResult(null)
    try {
      const res = await fetch('/api/admin/entries/unconfirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryIds }),
      })
      const data = await res.json()
      if (data.success) {
        setResult({
          success: true,
          message: `Unconfirmed ${data.data.unconfirmed} user(s).${data.data.skipped > 0 ? ` ${data.data.skipped} skipped (not confirmed).` : ''}`,
        })
        setSelectedIds(new Set())
        await fetchData()
      } else {
        setResult({ success: false, message: data.error })
      }
    } finally {
      setActionLoading(null)
    }
  }

  // ── Add user ─────────────────────────────────────────────────────────────
  const handleAddUser = async () => {
    setAddLoading(true)
    setAddResult(null)
    try {
      const res = await fetch('/api/admin/entries/add-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fplTeamId: parseInt(addForm.fplTeamId),
          fplTeamName: addForm.fplTeamName,
          managerName: addForm.managerName,
          paymentMethod: addForm.paymentMethod,
          paymentPhone: addForm.paymentPhone || undefined,
          paymentEmail: addForm.paymentEmail || undefined,
          notes: addForm.notes || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setAddResult({
          success: true,
          message: `${data.data.message} PIN: ${data.data.pin}`,
        })
        setAddForm({
          fplTeamId: '',
          fplTeamName: '',
          managerName: '',
          paymentMethod: 'manual',
          paymentPhone: '',
          paymentEmail: '',
          notes: '',
        })
        await fetchData()
      } else {
        setAddResult({ success: false, message: data.error })
      }
    } finally {
      setAddLoading(false)
    }
  }

  // ── Add to group ─────────────────────────────────────────────────────────
  const handleAddToGroup = async () => {
    if (!addToGroupEntry) return
    setAddGroupLoading(true)
    setAddGroupResult(null)
    try {
      const res = await fetch('/api/admin/entries/add-to-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: addToGroupEntry.id,
          groupId: selectedGroupId === 'random' ? undefined : selectedGroupId,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setAddGroupResult({ success: true, message: data.data.message })
        await fetchData()
      } else {
        setAddGroupResult({ success: false, message: data.error })
      }
    } finally {
      setAddGroupLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-purple" />
      </div>
    )
  }

  const confirmedEntries = currentGwEntries.filter(e => e.payment_status === 'confirmed')
  const hasGroups = groups.length > 0

  return (
    <div className="p-6 sm:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-text-primary">User Management</h1>
          <p className="text-text-secondary mt-1">
            GW{settings?.gameweek_number} • {confirmedEntries.length} confirmed users
          </p>
        </div>
        <button
          onClick={() => { setShowAddModal(true); setAddResult(null) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-purple text-white text-sm font-semibold rounded-lg hover:bg-opacity-90"
        >
          <UserPlus className="w-4 h-4" />
          Add User Manually
        </button>
      </div>

      {/* Action result banner */}
      {result && (
        <div className={cn(
          'flex items-start gap-2 p-4 rounded-lg border mb-4 text-sm font-medium',
          result.success
            ? 'bg-success/5 border-success/20 text-success'
            : 'bg-error/5 border-error/20 text-error'
        )}>
          {result.success
            ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
          <p>{result.message}</p>
          <button onClick={() => setResult(null)} className="ml-auto text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Info card explaining features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <InfoCard
          icon={<UserMinus className="w-5 h-5 text-warning" />}
          title="Unconfirm Users"
          desc="Move confirmed users back to pending. They reappear in Entries & Payments for re-review."
          color="border-warning/20 bg-warning/5"
        />
        <InfoCard
          icon={<UserPlus className="w-5 h-5 text-brand-purple" />}
          title="Add User Manually"
          desc="Add someone who paid outside the system. They are created as confirmed with a PIN."
          color="border-brand-purple/20 bg-brand-purple/5"
        />
        <InfoCard
          icon={<Users className="w-5 h-5 text-blue-600" />}
          title="Add to Group"
          desc="Assign a confirmed user to a specific group or let the system pick randomly. Groups must be allocated first."
          color="border-blue-200 bg-blue-50"
        />
      </div>

      {/* Search */}
      <div className="flex flex-wrap gap-3 mb-4">
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
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex items-center gap-3 bg-brand-purple/5 border border-brand-purple/20 rounded-lg px-4 py-2.5 mb-4">
          <span className="text-sm font-semibold text-brand-purple">
            {selectedIds.size} selected
          </span>
          <button
            onClick={() => handleUnconfirm()}
            disabled={actionLoading === 'unconfirm'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-warning/10 text-warning rounded-lg hover:bg-warning/20 disabled:opacity-50"
          >
            {actionLoading === 'unconfirm'
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <UserMinus className="w-3.5 h-3.5" />}
            Unconfirm Selected
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-text-secondary hover:text-text-primary"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Users table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-border">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 accent-brand-purple cursor-pointer"
                  />
                </th>
                {['Manager', 'FPL ID', 'Method', 'Status', 'Added', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(entry => (
                <tr
                  key={entry.id}
                  className={cn(
                    'hover:bg-gray-50',
                    selectedIds.has(entry.id) && 'bg-brand-purple/5'
                  )}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(entry.id)}
                      onChange={() => toggleOne(entry.id)}
                      className="w-4 h-4 accent-brand-purple cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-text-primary">{entry.manager_name}</div>
                    <div className="text-xs text-text-secondary">{entry.fpl_team_name}</div>
                    {entry.notes && (
                      <div className="text-xs text-orange-500 mt-0.5 italic">{entry.notes}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-text-secondary">
                    {entry.fpl_team_id}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium">
                      {entry.payment_method === 'mpesa'
                        ? '📱 M-Pesa'
                        : entry.payment_method === 'paypal'
                        ? '💳 PayPal'
                        : '🤝 Manual'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${
                      entry.payment_status === 'confirmed'
                        ? 'bg-success/10 text-success'
                        : 'bg-warning/10 text-warning'
                    }`}>
                      {entry.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">
                    {timeAgo(entry.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {/* Unconfirm single */}
                      {entry.payment_status === 'confirmed' && (
                        <button
                          onClick={() => handleUnconfirm([entry.id])}
                          disabled={actionLoading === 'unconfirm'}
                          className="text-xs text-warning font-semibold hover:underline disabled:opacity-50"
                        >
                          Unconfirm
                        </button>
                      )}
                      {/* Add to group */}
                      {entry.payment_status === 'confirmed' && hasGroups && (
                        <button
                          onClick={() => {
                            setAddToGroupEntry(entry)
                            setSelectedGroupId('random')
                            setAddGroupResult(null)
                          }}
                          className="text-xs text-blue-600 font-semibold hover:underline"
                        >
                          Add to Group
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-12 text-center text-text-secondary">
              No users found
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <Modal
          title="Add User Manually"
          onClose={() => setShowAddModal(false)}
        >
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Use this for users who paid outside the system. They will be created as <strong>confirmed</strong> with a generated PIN.
            </p>

            {addResult && (
              <div className={cn(
                'flex items-start gap-2 p-3 rounded-lg text-sm font-medium',
                addResult.success
                  ? 'bg-success/10 text-success'
                  : 'bg-error/10 text-error'
              )}>
                {addResult.success
                  ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                <p>{addResult.message}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  FPL Team ID <span className="text-error">*</span>
                </label>
                <input
                  type="number"
                  value={addForm.fplTeamId}
                  onChange={e => setAddForm(f => ({ ...f, fplTeamId: e.target.value }))}
                  placeholder="e.g. 1234567"
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Manager Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={addForm.managerName}
                  onChange={e => setAddForm(f => ({ ...f, managerName: e.target.value }))}
                  placeholder="e.g. John Doe"
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  FPL Team Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={addForm.fplTeamName}
                  onChange={e => setAddForm(f => ({ ...f, fplTeamName: e.target.value }))}
                  placeholder="e.g. Red Devils FC"
                  className="form-input"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Payment Method <span className="text-error">*</span>
                </label>
                <select
                  value={addForm.paymentMethod}
                  onChange={e => setAddForm(f => ({ ...f, paymentMethod: e.target.value as 'mpesa' | 'paypal' | 'manual' }))}
                  className="form-input"
                >
                  <option value="manual">Manual / Cash / Other</option>
                  <option value="mpesa">M-Pesa (paid externally)</option>
                  <option value="paypal">PayPal (paid externally)</option>
                </select>
              </div>
              {(addForm.paymentMethod === 'mpesa' || addForm.paymentMethod === 'manual') && (
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Phone Number (optional)
                  </label>
                  <input
                    type="text"
                    value={addForm.paymentPhone}
                    onChange={e => setAddForm(f => ({ ...f, paymentPhone: e.target.value }))}
                    placeholder="e.g. 254712345678"
                    className="form-input"
                  />
                </div>
              )}
              {addForm.paymentMethod === 'paypal' && (
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    PayPal Email (optional)
                  </label>
                  <input
                    type="email"
                    value={addForm.paymentEmail}
                    onChange={e => setAddForm(f => ({ ...f, paymentEmail: e.target.value }))}
                    placeholder="e.g. john@example.com"
                    className="form-input"
                  />
                </div>
              )}
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={addForm.notes}
                  onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="e.g. Paid via bank transfer on 12 Jan"
                  className="form-input"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 border border-border rounded-lg text-sm font-semibold text-text-secondary hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={handleAddUser}
                disabled={addLoading || !addForm.fplTeamId || !addForm.managerName || !addForm.fplTeamName}
                className="flex-1 py-2.5 bg-brand-purple text-white rounded-lg text-sm font-semibold hover:bg-opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Add User
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add to Group Modal */}
      {addToGroupEntry && (
        <Modal
          title={`Add to Group — ${addToGroupEntry.manager_name}`}
          onClose={() => { setAddToGroupEntry(null); setAddGroupResult(null) }}
        >
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Assign <strong>{addToGroupEntry.manager_name}</strong> to a group.
              Only groups with fewer than 32 members are available.
            </p>

            {addGroupResult && (
              <div className={cn(
                'flex items-start gap-2 p-3 rounded-lg text-sm font-medium',
                addGroupResult.success
                  ? 'bg-success/10 text-success'
                  : 'bg-error/10 text-error'
              )}>
                {addGroupResult.success
                  ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                <p>{addGroupResult.message}</p>
              </div>
            )}

            {!groups.length ? (
              <div className="bg-warning/5 border border-warning/20 rounded-lg p-3 text-sm text-warning font-medium">
                No groups found for GW{settings?.gameweek_number}. Run group allocation first from the Groups page.
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                    Select Group
                  </label>
                  <select
                    value={selectedGroupId}
                    onChange={e => setSelectedGroupId(e.target.value)}
                    className="form-input"
                  >
                    <option value="random">Assign Randomly (any group with space)</option>
                    {groups.map(g => (
                      <option
                        key={g.id}
                        value={g.id}
                        disabled={g.member_count >= 32}
                      >
                        Group {g.group_number} ({g.member_count}/32 members)
                        {g.member_count >= 32 ? ' — FULL' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setAddToGroupEntry(null); setAddGroupResult(null) }}
                    className="flex-1 py-2.5 border border-border rounded-lg text-sm font-semibold text-text-secondary hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddToGroup}
                    disabled={addGroupLoading}
                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {addGroupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                    Add to Group
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

function InfoCard({ icon, title, desc, color }: {
  icon: React.ReactNode
  title: string
  desc: string
  color: string
}) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <span className="font-bold text-sm text-text-primary">{title}</span>
      </div>
      <p className="text-xs text-text-secondary leading-relaxed">{desc}</p>
    </div>
  )
}

function Modal({ title, children, onClose }: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-text-primary">{title}</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
