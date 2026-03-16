'use client'
// src/app/[adminPath]/dashboard/standings/page.tsx

import { useState, useEffect } from 'react'
import { BarChart2, RefreshCw, Loader2, ExternalLink, Clock } from 'lucide-react'
import { cn, positionEmoji, CHIP_LABELS, timeAgo } from '@/lib/utils'

interface GroupMember {
  fpl_team_id: number
  fpl_team_name: string
  manager_name: string
  gw_points: number
  transfer_hits: number
  chip_used: string | null
  standing_position: number | null
  prize_amount: number
  last_refreshed_at: string | null
}

interface Group {
  id: string
  group_number: number
  gameweek_number: number
  group_members: GroupMember[]
}

export default function AdminStandingsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshResult, setRefreshResult] = useState<string | null>(null)
  const [gwNumber, setGwNumber] = useState<number>(1)

  const fetchGroups = async () => {
    try {
      const [groupsRes, settingsRes] = await Promise.all([
        fetch('/api/admin/groups'),
        fetch('/api/admin/settings'),
      ])
      const groupsData = await groupsRes.json()
      const settingsData = await settingsRes.json()

      if (groupsData.success) setGroups(groupsData.data)
      if (settingsData.success) setGwNumber(settingsData.data.gameweek_number)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchGroups() }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    setRefreshResult(null)
    try {
      const res = await fetch('/api/admin/refresh-points', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setRefreshResult(`✅ Refreshed ${data.data.refreshed} managers. ${data.data.failed} failed.`)
        await fetchGroups()
      }
    } finally {
      setRefreshing(false)
    }
  }

  const lastRefreshed = groups
    .flatMap(g => g.group_members)
    .map(m => m.last_refreshed_at)
    .filter(Boolean)
    .sort()
    .pop()

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-brand-purple" /></div>
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display font-bold text-2xl text-text-primary">Standings &amp; Points</h1>
          <p className="text-text-secondary mt-1 flex items-center gap-1.5">
            {lastRefreshed ? (
              <>
                <Clock className="w-3.5 h-3.5" />
                Last refresh: {timeAgo(lastRefreshed)}
              </>
            ) : (
              'No refreshes yet'
            )}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-primary flex items-center gap-2"
        >
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          {refreshing ? 'Refreshing...' : 'Refresh Points Now'}
        </button>
      </div>

      {refreshResult && (
        <div className="bg-success/5 border border-success/20 text-success text-sm font-semibold p-4 rounded-lg mb-6">
          {refreshResult}
        </div>
      )}

      {groups.length === 0 ? (
        <div className="card p-12 text-center">
          <BarChart2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-text-secondary">No groups allocated yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(group => (
            <div key={group.id} className="card overflow-hidden">
              <div className="px-4 py-3 bg-brand-purple/5 border-b border-border flex items-center justify-between">
                <h3 className="font-bold text-text-primary">Group {group.group_number}</h3>
                <span className="text-xs text-text-secondary">{group.group_members.length} managers</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-4 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wide">#</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wide">Manager</th>
                      <th className="text-center px-4 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wide">Points</th>
                      <th className="text-center px-4 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wide">Hits</th>
                      <th className="text-center px-4 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wide">Chip</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wide">Prize</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[...group.group_members]
                      .sort((a, b) => (a.standing_position ?? 999) - (b.standing_position ?? 999))
                      .map(member => (
                        <tr key={member.fpl_team_id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm font-bold">
                            {positionEmoji(member.standing_position ?? 999)}
                          </td>
                          <td className="px-4 py-2">
                            <a
                              href={`https://fantasy.premierleague.com/entry/${member.fpl_team_id}/event/${gwNumber}/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-purple hover:underline flex items-center gap-1 group text-sm"
                            >
                              {member.manager_name}
                              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                            </a>
                            <div className="text-xs text-text-secondary">{member.fpl_team_name}</div>
                          </td>
                          <td className="px-4 py-2 text-center font-bold">{member.gw_points}</td>
                          <td className="px-4 py-2 text-center">
                            {member.transfer_hits > 0 ? (
                              <span className="text-xs text-error font-bold">-{member.transfer_hits}</span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {member.chip_used ? (
                              <span className={`chip-badge chip-${member.chip_used}`}>
                                {CHIP_LABELS[member.chip_used]}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-2 text-right font-semibold text-success text-sm">
                            {member.prize_amount > 0 ? `KES ${member.prize_amount}` : '—'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
