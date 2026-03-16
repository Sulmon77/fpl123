// src/components/entry/ConfirmationScreen.tsx

import { CheckCircle, AlertTriangle, Calendar, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { PinDisplay } from '@/components/shared/PinDisplay'
import { formatDeadline } from '@/lib/utils'

interface ConfirmationScreenProps {
  pin: string
  managerName: string
  fplTeamName: string
  gameweekNumber: number
  deadline: string | null
  groupsAllocated: boolean
}

export function ConfirmationScreen({
  pin,
  managerName,
  fplTeamName,
  gameweekNumber,
  deadline,
  groupsAllocated,
}: ConfirmationScreenProps) {
  return (
    <div className="max-w-md mx-auto text-center space-y-6 animate-slide-up">
      {/* Success header */}
      <div className="space-y-2">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle className="w-9 h-9 text-success" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-text-primary">
          You&apos;re in for Gameweek {gameweekNumber}!
        </h2>
        <p className="text-text-secondary">
          <span className="font-semibold text-text-primary">{managerName}</span> —{' '}
          {fplTeamName}
        </p>
      </div>

      {/* PIN section */}
      <div className="bg-white rounded-xl border-2 border-brand-green/30 p-6 space-y-4">
        <div>
          <p className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
            Your Secret PIN
          </p>
          <PinDisplay pin={pin} />
        </div>

        {/* Critical warning */}
        <div className="flex items-start gap-2 bg-warning/10 border border-warning/20 rounded-lg p-3 text-left">
          <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-xs text-warning font-medium">
            Save this PIN. You will need it to view your group standings. It cannot be recovered.
          </p>
        </div>
      </div>

      {/* When groups allocate */}
      <div className="flex items-start gap-3 bg-brand-purple/5 rounded-xl p-4 text-left">
        <Calendar className="w-5 h-5 text-brand-purple flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-text-primary">Groups allocated at GW deadline</p>
          {deadline ? (
            <p className="text-xs text-text-secondary mt-0.5">{formatDeadline(deadline)}</p>
          ) : (
            <p className="text-xs text-text-secondary mt-0.5">Check back after the gameweek deadline</p>
          )}
        </div>
      </div>

      {/* CTA */}
      {groupsAllocated ? (
        <Link
          href="/standings"
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          Check Standings
          <ArrowRight className="w-4 h-4" />
        </Link>
      ) : (
        <button
          disabled
          className="btn-primary w-full opacity-60 cursor-not-allowed"
          title={deadline ? `Groups open at: ${formatDeadline(deadline)}` : 'Groups not yet allocated'}
        >
          Standings not yet available
        </button>
      )}

      <p className="text-xs text-text-secondary">
        Good luck, {managerName.split(' ')[0]}! 🏆
      </p>
    </div>
  )
}
