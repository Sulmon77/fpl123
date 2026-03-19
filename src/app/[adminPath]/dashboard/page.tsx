// src/app/[adminPath]/dashboard/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase'
import { formatKES, formatDeadline, timeAgo } from '@/lib/utils'
import { Users, DollarSign, Layers, Clock, CheckCircle, AlertCircle, Zap } from 'lucide-react'
import Link from 'next/link'

export const revalidate = 30

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ adminPath: string }>
}) {
  const resolvedParams = await params
  const supabase = createServerSupabaseClient()

  // Load settings first so we know the current GW
  const { data: settings } = await supabase.from('settings').select('*').single()
  const currentGw = settings?.gameweek_number ?? 1

  // Load entries for current GW only
  const { data: gwEntries } = await supabase
    .from('entries')
    .select('id, payment_status, payment_method, manager_name, fpl_team_name, created_at, gameweek_number')
    .eq('gameweek_number', currentGw)
    .order('created_at', { ascending: false })

  const allEntries = gwEntries ?? []

  // Stats — only confirmed entries count toward revenue
  // Includes manual entries added by admin
  const confirmed = allEntries.filter(e => e.payment_status === 'confirmed')
  const pending = allEntries.filter(e => e.payment_status === 'pending')

  // Revenue = confirmed count × entry fee (manual entries are included — admin vouches for them)
  const totalRevenue = confirmed.length * (settings?.entry_fee ?? 200)

  // Groups for current GW
  const { data: gwGroups } = await supabase
    .from('groups')
    .select('id')
    .eq('gameweek_number', currentGw)

  // Recent activity — last 10 entries across all GWs for the activity feed
  const { data: recentAll } = await supabase
    .from('entries')
    .select('id, payment_status, payment_method, manager_name, fpl_team_name, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  const recentActivity = recentAll ?? []

  const quickActions = [
    {
      label: settings?.registration_open ? 'Close Registration' : 'Open Registration',
      action: settings?.registration_open ? 'close' : 'open',
      color: settings?.registration_open
        ? 'bg-error/10 text-error border-error/20'
        : 'bg-success/10 text-success border-success/20',
      href: `/${resolvedParams.adminPath}/dashboard/gw-controls`,
    },
    {
      label: 'Refresh Points Now',
      action: 'refresh',
      color: 'bg-brand-purple/10 text-brand-purple border-brand-purple/20',
      href: `/${resolvedParams.adminPath}/dashboard/standings`,
    },
    {
      label: 'Allocate Groups',
      action: 'allocate',
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      href: `/${resolvedParams.adminPath}/dashboard/groups`,
    },
    {
      label: 'User Management',
      action: 'users',
      color: 'bg-orange-50 text-orange-700 border-orange-200',
      href: `/${resolvedParams.adminPath}/dashboard/user-management`,
    },
  ]

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-text-primary">Dashboard</h1>
        <p className="text-text-secondary mt-1">
          GW{currentGw} •{' '}
          {settings?.registration_open ? (
            <span className="text-success font-medium">Registration Open</span>
          ) : (
            <span className="text-error font-medium">Registration Closed</span>
          )}
          {settings?.entry_deadline && (
            <> • Deadline: {formatDeadline(settings.entry_deadline)}</>
          )}
        </p>
      </div>

      {/* Stats grid — all scoped to current GW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Users className="w-5 h-5 text-brand-purple" />}
          label="Total Entries"
          value={confirmed.length.toString()}
          sub={`${pending.length} pending confirmation`}
        />
        <StatCard
          icon={<DollarSign className="w-5 h-5 text-success" />}
          label="Total Revenue"
          value={formatKES(totalRevenue)}
          sub={`${confirmed.length} confirmed × ${formatKES(settings?.entry_fee ?? 200)}`}
        />
        <StatCard
          icon={<Layers className="w-5 h-5 text-blue-600" />}
          label="Groups"
          value={(gwGroups?.length ?? 0).toString()}
          sub={(gwGroups?.length ?? 0) > 0 ? 'Allocated' : 'Not yet allocated'}
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-warning" />}
          label="Pending Payments"
          value={pending.length.toString()}
          sub="Awaiting confirmation"
        />
      </div>

      {/* Quick actions */}
      <div className="mb-8">
        <h2 className="font-bold text-text-primary mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {quickActions.map(action => (
            <Link
              key={action.action}
              href={action.href}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all hover:opacity-80 ${action.color}`}
            >
              <Zap className="w-4 h-4" />
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="font-bold text-text-primary mb-3">Recent Activity</h2>
        <div className="card overflow-hidden">
          {recentActivity.length === 0 ? (
            <div className="p-8 text-center text-text-secondary">No entries yet</div>
          ) : (
            <div className="divide-y divide-border">
              {recentActivity.map(entry => (
                <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    {entry.payment_status === 'confirmed' ? (
                      <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-medium text-sm text-text-primary">
                        {entry.manager_name}
                        <span className="text-text-secondary ml-1 font-normal">
                          — {entry.fpl_team_name}
                        </span>
                      </p>
                      <p className="text-xs text-text-secondary">
                        {entry.payment_method === 'mpesa'
                          ? '📱 M-Pesa'
                          : entry.payment_method === 'paypal'
                          ? '💳 PayPal'
                          : '🤝 Manual'}{' '}
                        • {entry.payment_status}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-text-secondary">{timeAgo(entry.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="font-display font-bold text-2xl text-text-primary">{value}</div>
      <div className="text-xs text-text-secondary mt-0.5">{sub}</div>
    </div>
  )
}
