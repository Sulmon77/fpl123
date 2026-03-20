'use client'
// src/app/[adminPath]/dashboard/groups/page.tsx

import { useState, useEffect } from 'react'
import { Layers, AlertTriangle, CheckCircle, Loader2, Users, Shuffle, Trash2 } from 'lucide-react'
import type { EntryTier } from '@/types'

interface Group {
  id: string
  group_number: number
  gameweek_number: number
  entry_tier: EntryTier
  allocated_at: string
  group_members: Array<{
    id: string
    fpl_team_id: number
    fpl_team_name: string
    manager_name: string
    gw_points: number
    entry_tier: EntryTier
  }>
}

type ModalType =
  | 'allocate_all' | 'allocate_casual' | 'allocate_elite'
  | 'undo_all' | 'undo_casual' | 'undo_elite'
  | 'shuffle_all' | 'shuffle_casual' | 'shuffle_elite'
  | null

type TierFilter = 'all' | 'casual' | 'elite'

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmedCount, setConfirmedCount] = useState(0)
  const [casualCount, setCasualCount] = useState(0)
  const [eliteCount, setEliteCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [tierFilter, setTierFilter] = useState<TierFilter>('all')

  const fetchGroups = async () => {
    try {
      const [groupsRes, statsRes] = await Promise.all([
        fetch('/api/admin/groups'),
        fetch('/api/admin/stats'),
      ])
      const groupsData = await groupsRes.json()
      const statsData = await statsRes.json()
      if (groupsData.success) setGroups(groupsData.data)
      if (statsData.success) {
        setConfirmedCount(statsData.data.confirmedEntries)
        setCasualCount(statsData.data.casualEntries ?? 0)
        setEliteCount(statsData.data.eliteEntries ?? 0)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchGroups() }, [])

  const filtered = groups.filter(g => tierFilter === 'all' || g.entry_tier === tierFilter)
  const hasGroups = groups.length > 0
  const hasCasualGroups = groups.some(g => g.entry_tier === 'casual')
  const hasEliteGroups = groups.some(g => g.entry_tier === 'elite')

  const parseTierFromModal = (modal: ModalType): EntryTier | undefined => {
    if (!modal) return undefined
    if (modal.endsWith('_casual')) return 'casual'
    if (modal.endsWith('_elite')) return 'elite'
    return undefined
  }

  const handleAllocate = async (modal: ModalType) => {
    const tier = parseTierFromModal(modal)
    setActiveModal(null)
    setActionLoading(true); setError(null); setSuccess(null)
    try {
      const res = await fetch('/api/admin/assign-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tier ? { tier } : {}),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(`✅ Allocated ${data.data.memberCount} managers into ${data.data.groupCount} groups${tier ? ` (${tier})` : ''}.`)
        await fetchGroups()
      } else setError(data.error)
    } catch { setError('Failed to allocate groups.') }
    finally { setActionLoading(false) }
  }

  const handleUndo = async (modal: ModalType) => {
    const tier = parseTierFromModal(modal)
    setActiveModal(null)
    setActionLoading(true); setError(null); setSuccess(null)
    try {
      const res = await fetch('/api/admin/groups/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tier ? { tier } : {}),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(`✅ Group allocation undone${tier ? ` for ${tier}` : ''}.`)
        await fetchGroups()
      } else setError(data.error)
    } catch { setError('Failed to undo allocation.') }
    finally { setActionLoading(false) }
  }

  const handleShuffle = async (modal: ModalType) => {
    const tier = parseTierFromModal(modal)
    setActiveModal(null)
    setActionLoading(true); setError(null); setSuccess(null)
    try {
      const res = await fetch('/api/admin/groups/shuffle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tier ? { tier } : {}),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(`✅ Groups reshuffled. ${data.data.memberCount} managers in ${data.data.groupCount} groups${tier ? ` (${tier})` : ''}.`)
        await fetchGroups()
      } else setError(data.error)
    } catch { setError('Failed to shuffle groups.') }
    finally { setActionLoading(false) }
  }

  const dispatchModal = (modal: ModalType) => {
    if (!modal) return
    if (modal.startsWith('allocate')) handleAllocate(modal)
    else if (modal.startsWith('undo')) handleUndo(modal)
    else if (modal.startsWith('shuffle')) handleShuffle(modal)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-brand-purple" /></div>
  }

  // Tier pills
  const tierBadge = (t: EntryTier) => (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${t === 'elite' ? 'bg-brand-purple text-white' : 'bg-brand-purple/10 text-brand-purple'}`}>
      {t}
    </span>
  )

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display font-bold text-2xl text-text-primary">Group Management</h1>
          <p className="text-text-secondary mt-1">
            {hasGroups
              ? `${groups.length} groups allocated`
              : `${confirmedCount} confirmed entries ready`}
          </p>
          {confirmedCount > 0 && (
            <p className="text-xs text-text-secondary mt-0.5">
              Casual: {casualCount} · Elite: {eliteCount}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Allocate buttons */}
          {!hasGroups && (
            <>
              <button
                onClick={() => setActiveModal('allocate_all')}
                disabled={actionLoading || confirmedCount === 0}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <Layers className="w-4 h-4" /> Allocate All
              </button>
              {casualCount > 0 && (
                <button
                  onClick={() => setActiveModal('allocate_casual')}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-3 py-2 bg-brand-purple/10 text-brand-purple text-sm font-semibold rounded-lg hover:bg-brand-purple/20 disabled:opacity-50"
                >
                  <Layers className="w-4 h-4" /> Casual Only
                </button>
              )}
              {eliteCount > 0 && (
                <button
                  onClick={() => setActiveModal('allocate_elite')}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-3 py-2 bg-brand-purple/10 text-brand-purple text-sm font-semibold rounded-lg hover:bg-brand-purple/20 disabled:opacity-50"
                >
                  <Layers className="w-4 h-4" /> Elite Only
                </button>
              )}
            </>
          )}

          {hasGroups && (
            <>
              <button onClick={() => setActiveModal('shuffle_all')} disabled={actionLoading}
                className="flex items-center gap-2 px-3 py-2 bg-brand-purple text-white text-sm font-semibold rounded-lg hover:bg-opacity-90 disabled:opacity-50">
                <Shuffle className="w-4 h-4" /> Shuffle All
              </button>
              {hasCasualGroups && (
                <button onClick={() => setActiveModal('shuffle_casual')} disabled={actionLoading}
                  className="flex items-center gap-2 px-3 py-2 border border-brand-purple/30 text-brand-purple text-sm font-semibold rounded-lg hover:bg-brand-purple/5 disabled:opacity-50">
                  <Shuffle className="w-4 h-4" /> Casual
                </button>
              )}
              {hasEliteGroups && (
                <button onClick={() => setActiveModal('shuffle_elite')} disabled={actionLoading}
                  className="flex items-center gap-2 px-3 py-2 border border-brand-purple/30 text-brand-purple text-sm font-semibold rounded-lg hover:bg-brand-purple/5 disabled:opacity-50">
                  <Shuffle className="w-4 h-4" /> Elite
                </button>
              )}
              <button onClick={() => setActiveModal('undo_all')} disabled={actionLoading}
                className="flex items-center gap-2 px-3 py-2 bg-error/10 text-error border border-error/20 text-sm font-semibold rounded-lg hover:bg-error/20 disabled:opacity-50">
                <Trash2 className="w-4 h-4" /> Undo All
              </button>
              {hasCasualGroups && (
                <button onClick={() => setActiveModal('undo_casual')} disabled={actionLoading}
                  className="flex items-center gap-2 px-3 py-2 bg-error/5 text-error border border-error/10 text-sm font-semibold rounded-lg hover:bg-error/10 disabled:opacity-50">
                  <Trash2 className="w-4 h-4" /> Undo Casual
                </button>
              )}
              {hasEliteGroups && (
                <button onClick={() => setActiveModal('undo_elite')} disabled={actionLoading}
                  className="flex items-center gap-2 px-3 py-2 bg-error/5 text-error border border-error/10 text-sm font-semibold rounded-lg hover:bg-error/10 disabled:opacity-50">
                  <Trash2 className="w-4 h-4" /> Undo Elite
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-error/5 border border-error/20 rounded-lg p-4 mb-6">
          <AlertTriangle className="w-4 h-4 text-error" />
          <p className="text-sm text-error">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-success/5 border border-success/20 rounded-lg p-4 mb-6">
          <CheckCircle className="w-4 h-4 text-success" />
          <p className="text-sm text-success">{success}</p>
        </div>
      )}

      {/* Tier filter tabs */}
      {hasGroups && (
        <div className="flex gap-2 mb-5">
          {(['all', 'casual', 'elite'] as TierFilter[]).map(t => (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${tierFilter === t ? 'bg-brand-purple text-white' : 'bg-gray-100 text-text-secondary hover:bg-gray-200'}`}
            >
              {t === 'all' ? 'All Groups' : `${t} (${groups.filter(g => g.entry_tier === t).length})`}
            </button>
          ))}
        </div>
      )}

      {!hasGroups ? (
        <div className="card p-12 text-center">
          <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-bold text-text-primary mb-2">No groups allocated yet</h3>
          <p className="text-text-secondary text-sm max-w-sm mx-auto">
            {confirmedCount > 0
              ? `${confirmedCount} confirmed managers are waiting. Use the buttons above to allocate groups.`
              : 'Wait for managers to register and confirm payments first.'}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(group => (
            <div key={group.id} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-purple/10 flex items-center justify-center">
                    <span className="font-bold text-brand-purple text-sm">{group.group_number}</span>
                  </div>
                  <span className="font-bold text-text-primary text-sm">Group {group.group_number}</span>
                  {tierBadge(group.entry_tier)}
                </div>
                <div className="flex items-center gap-1 text-xs text-text-secondary">
                  <Users className="w-3.5 h-3.5" />
                  {group.group_members?.length ?? 0}
                </div>
              </div>
              <div className="space-y-1.5">
                {(group.group_members ?? []).slice(0, 5).map(m => (
                  <div key={m.id} className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary truncate max-w-[150px]">{m.manager_name}</span>
                    <span className="font-mono font-semibold text-text-primary">{m.gw_points} pts</span>
                  </div>
                ))}
                {(group.group_members?.length ?? 0) > 5 && (
                  <p className="text-xs text-text-secondary pt-1">+{group.group_members.length - 5} more</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation modals */}
      {activeModal && (
        <ConfirmModal
          modal={activeModal}
          groups={groups}
          casualCount={casualCount}
          eliteCount={eliteCount}
          onConfirm={() => dispatchModal(activeModal)}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  )
}

function ConfirmModal({
  modal, groups, casualCount, eliteCount, onConfirm, onClose,
}: {
  modal: ModalType
  groups: Group[]
  casualCount: number
  eliteCount: number
  onConfirm: () => void
  onClose: () => void
}) {
  if (!modal) return null

  const isAllocate = modal.startsWith('allocate')
  const isUndo = modal.startsWith('undo')
  const isShuffle = modal.startsWith('shuffle')
  const tierLabel = modal.endsWith('_casual') ? 'Casual' : modal.endsWith('_elite') ? 'Elite' : 'All'
  const count = tierLabel === 'Casual' ? casualCount : tierLabel === 'Elite' ? eliteCount : casualCount + eliteCount
  const groupCount = tierLabel === 'All' ? groups.length : groups.filter(g => g.entry_tier === tierLabel.toLowerCase()).length

  const title = isAllocate
    ? `Allocate ${tierLabel} Groups`
    : isShuffle
    ? `Shuffle ${tierLabel} Groups`
    : `Undo ${tierLabel} Allocation`

  const color = isUndo ? 'bg-error/10 border-error/20 text-error' : 'bg-warning/10 border-warning/20 text-warning'
  const icon = <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isUndo ? 'text-error' : 'text-warning'}`} />

  const message = isAllocate
    ? `This will randomly allocate ${count} confirmed ${tierLabel.toLowerCase() === 'all' ? '' : tierLabel + ' '}managers into groups.`
    : isShuffle
    ? `This will delete the current ${groupCount} ${tierLabel !== 'All' ? tierLabel + ' ' : ''}groups and randomly create new ones from all confirmed entries.`
    : `This will permanently delete all ${groupCount} ${tierLabel !== 'All' ? tierLabel + ' ' : ''}groups. Entries and payments are not affected.`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-slide-up">
        <h3 className="font-bold text-lg text-text-primary mb-3">{title}</h3>
        <div className={`flex items-start gap-3 rounded-lg border p-4 mb-5 ${color}`}>
          {icon}
          <p className="text-sm font-medium">{message}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-lg text-sm font-semibold text-text-secondary hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 text-white rounded-lg text-sm font-semibold hover:bg-opacity-90 ${isUndo ? 'bg-error' : 'bg-brand-purple'}`}
          >
            {isAllocate ? 'Allocate Now' : isShuffle ? 'Shuffle Now' : 'Yes, Undo'}
          </button>
        </div>
      </div>
    </div>
  )
}