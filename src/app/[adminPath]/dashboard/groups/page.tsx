'use client'
// src/app/[adminPath]/dashboard/groups/page.tsx

import { useState, useEffect } from 'react'
import { Layers, AlertTriangle, CheckCircle, Loader2, Users, Shuffle, Trash2 } from 'lucide-react'

interface Group {
  id: string
  group_number: number
  gameweek_number: number
  allocated_at: string
  group_members: Array<{
    id: string
    fpl_team_id: number
    fpl_team_name: string
    manager_name: string
    gw_points: number
  }>
}

type ModalType = 'allocate' | 'undo' | 'shuffle' | null

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmedCount, setConfirmedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeModal, setActiveModal] = useState<ModalType>(null)

  const fetchGroups = async () => {
    try {
      const [groupsRes, statsRes] = await Promise.all([
        fetch('/api/admin/groups'),
        fetch('/api/admin/stats'),
      ])
      const groupsData = await groupsRes.json()
      const statsData = await statsRes.json()

      if (groupsData.success) setGroups(groupsData.data)
      if (statsData.success) setConfirmedCount(statsData.data.confirmedEntries)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchGroups() }, [])

  const handleAllocate = async () => {
    setActiveModal(null)
    setActionLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/admin/assign-groups', { method: 'POST' })
      const data = await res.json()

      if (data.success) {
        setSuccess(`✅ Allocated ${data.data.memberCount} managers into ${data.data.groupCount} groups.`)
        await fetchGroups()
      } else {
        setError(data.error)
      }
    } catch {
      setError('Failed to allocate groups. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUndo = async () => {
    setActiveModal(null)
    setActionLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/admin/groups/undo', { method: 'POST' })
      const data = await res.json()

      if (data.success) {
        setSuccess('✅ Group allocation undone. All groups have been cleared.')
        setGroups([])
      } else {
        setError(data.error)
      }
    } catch {
      setError('Failed to undo allocation. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleShuffle = async () => {
    setActiveModal(null)
    setActionLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/admin/groups/shuffle', { method: 'POST' })
      const data = await res.json()

      if (data.success) {
        setSuccess(`✅ Groups reshuffled. ${data.data.memberCount} managers in ${data.data.groupCount} new groups.`)
        await fetchGroups()
      } else {
        setError(data.error)
      }
    } catch {
      setError('Failed to shuffle groups. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-purple" />
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display font-bold text-2xl text-text-primary">Group Management</h1>
          <p className="text-text-secondary mt-1">
            {groups.length > 0
              ? `${groups.length} groups allocated`
              : `${confirmedCount} confirmed entries ready for allocation`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Show Allocate button only when no groups exist */}
          {groups.length === 0 && (
            <button
              onClick={() => setActiveModal('allocate')}
              disabled={actionLoading || confirmedCount === 0}
              className="btn-primary flex items-center gap-2"
            >
              {actionLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Working...</>
              ) : (
                <><Layers className="w-4 h-4" /> Trigger Group Allocation</>
              )}
            </button>
          )}

          {/* Show Shuffle and Undo only when groups exist */}
          {groups.length > 0 && (
            <>
              <button
                onClick={() => setActiveModal('shuffle')}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-brand-purple text-white rounded-lg text-sm font-semibold hover:bg-opacity-90 disabled:opacity-50"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Shuffle className="w-4 h-4" />
                )}
                Shuffle Groups
              </button>

              <button
                onClick={() => setActiveModal('undo')}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-error/10 text-error border border-error/20 rounded-lg text-sm font-semibold hover:bg-error/20 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Undo Allocation
              </button>
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

      {groups.length === 0 ? (
        <div className="card p-12 text-center">
          <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-bold text-text-primary mb-2">No groups allocated yet</h3>
          <p className="text-text-secondary text-sm max-w-sm mx-auto">
            {confirmedCount > 0
              ? `${confirmedCount} confirmed managers are waiting to be allocated. Click "Trigger Group Allocation" to group them randomly.`
              : 'Wait for managers to register and confirm their payments before allocating groups.'}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <div key={group.id} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-purple/10 flex items-center justify-center">
                    <span className="font-bold text-brand-purple text-sm">{group.group_number}</span>
                  </div>
                  <span className="font-bold text-text-primary">Group {group.group_number}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-text-secondary">
                  <Users className="w-3.5 h-3.5" />
                  {group.group_members?.length ?? 0}
                </div>
              </div>

              <div className="space-y-1.5">
                {(group.group_members ?? []).slice(0, 5).map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary truncate max-w-[150px]">{m.manager_name}</span>
                    <span className="font-mono font-semibold text-text-primary">{m.gw_points} pts</span>
                  </div>
                ))}
                {(group.group_members?.length ?? 0) > 5 && (
                  <p className="text-xs text-text-secondary pt-1">
                    +{group.group_members.length - 5} more managers
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Allocate confirmation modal */}
      {activeModal === 'allocate' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setActiveModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-slide-up">
            <h3 className="font-bold text-lg text-text-primary mb-3">Confirm Group Allocation</h3>
            <div className="flex items-start gap-3 bg-warning/10 border border-warning/20 rounded-lg p-4 mb-5">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <p className="text-sm text-warning font-medium">
                This will randomly allocate {confirmedCount} confirmed managers into groups of up to 32.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 border border-border rounded-lg text-sm font-semibold text-text-secondary hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAllocate}
                className="flex-1 py-2.5 bg-brand-purple text-white rounded-lg text-sm font-semibold hover:bg-opacity-90"
              >
                Allocate Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shuffle confirmation modal */}
      {activeModal === 'shuffle' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setActiveModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-slide-up">
            <h3 className="font-bold text-lg text-text-primary mb-3">Shuffle Groups</h3>
            <div className="flex items-start gap-3 bg-warning/10 border border-warning/20 rounded-lg p-4 mb-5">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <p className="text-sm text-warning font-medium">
                This will delete the current {groups.length} groups and randomly create brand new ones from all confirmed entries. Managers will be reassigned to different groups.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 border border-border rounded-lg text-sm font-semibold text-text-secondary hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleShuffle}
                className="flex-1 py-2.5 bg-brand-purple text-white rounded-lg text-sm font-semibold hover:bg-opacity-90"
              >
                Shuffle Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Undo confirmation modal */}
      {activeModal === 'undo' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setActiveModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-slide-up">
            <h3 className="font-bold text-lg text-text-primary mb-3">Undo Group Allocation</h3>
            <div className="flex items-start gap-3 bg-error/10 border border-error/20 rounded-lg p-4 mb-5">
              <AlertTriangle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
              <p className="text-sm text-error font-medium">
                This will permanently delete all {groups.length} groups and remove every manager from their group. Entries and payments are not affected. You can re-allocate afterwards.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 border border-border rounded-lg text-sm font-semibold text-text-secondary hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUndo}
                className="flex-1 py-2.5 bg-error text-white rounded-lg text-sm font-semibold hover:bg-opacity-90"
              >
                Yes, Undo Allocation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}