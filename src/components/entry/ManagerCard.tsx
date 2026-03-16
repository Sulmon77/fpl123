// src/components/entry/ManagerCard.tsx

import { User, Trophy, TrendingUp, AlertTriangle, Zap } from 'lucide-react'
import { formatRank, CHIP_NAMES } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { ResolvedManager } from '@/types'

interface ManagerCardProps {
  manager: ResolvedManager
  fplTeamId: number
}

export function ManagerCard({ manager, fplTeamId }: ManagerCardProps) {
  return (
    <div className="border-2 border-brand-green/30 bg-gradient-to-br from-brand-green/5 to-transparent rounded-xl p-5 space-y-4 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-brand-purple flex items-center justify-center">
              <User className="w-4 h-4 text-brand-green" />
            </div>
            <span className="font-bold text-text-primary text-lg">{manager.manager_name}</span>
          </div>
          <p className="text-text-secondary text-sm pl-10">{manager.fpl_team_name}</p>
        </div>
        <div className="text-right text-xs text-text-secondary">
          <div className="font-mono text-brand-purple font-semibold">#{fplTeamId}</div>
          <div>FPL ID</div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatItem
          icon={<Trophy className="w-3.5 h-3.5 text-gold" />}
          label="Overall Rank"
          value={formatRank(manager.overall_rank)}
        />
        <StatItem
          icon={<TrendingUp className="w-3.5 h-3.5 text-brand-green" />}
          label="Last GW Points"
          value={`${manager.last_gw_points} pts`}
          highlight
        />
      </div>

      {/* Warnings */}
      {manager.transfer_hits > 0 && (
        <div className="flex items-center gap-2 bg-warning/10 border border-warning/20 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
          <p className="text-sm text-warning font-medium">
            -{manager.transfer_hits} point hit active this gameweek
          </p>
        </div>
      )}

      {manager.chip_used && (
        <div className="flex items-center gap-2 bg-brand-purple/5 border border-brand-purple/20 rounded-lg px-3 py-2">
          <Zap className="w-4 h-4 text-brand-purple flex-shrink-0" />
          <p className="text-sm text-brand-purple font-medium">
            {CHIP_NAMES[manager.chip_used] || manager.chip_used} chip active
          </p>
        </div>
      )}
    </div>
  )
}

function StatItem({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="bg-white rounded-lg border border-border px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs text-text-secondary uppercase tracking-wide">{label}</span>
      </div>
      <div
        className={cn(
          'font-bold text-base',
          highlight ? 'text-brand-purple' : 'text-text-primary'
        )}
      >
        {value}
      </div>
    </div>
  )
}
