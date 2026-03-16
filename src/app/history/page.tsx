// src/app/history/page.tsx

import { createServerSupabaseClient } from '@/lib/supabase'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { History } from 'lucide-react'
import { redirect } from 'next/navigation'
import { formatKES } from '@/lib/utils'

export const revalidate = 300

export default async function HistoryPage() {
  const supabase = createServerSupabaseClient()

  const { data: settings } = await supabase
    .from('settings')
    .select('platform_name, hall_of_fame_enabled, history_visible, registration_open')
    .single()

  if (!settings?.history_visible) redirect('/')

  const { data: giveaways } = await supabase
    .from('giveaway_history')
    .select('*')
    .eq('visible_to_public', true)
    .order('gameweek_number', { ascending: false })

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header
        hallOfFameEnabled={settings?.hall_of_fame_enabled}
        registrationOpen={settings?.registration_open ?? false}
        historyVisible={settings?.history_visible}
        platformName={settings?.platform_name}
        groupsAllocated={true}
      />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10 sm:py-14">

        {/* Page header */}
        <div className="flex items-center gap-4 mb-10">
          <div className="w-11 h-11 rounded-2xl bg-brand-purple/[0.06] border border-brand-purple/10 flex items-center justify-center flex-shrink-0">
            <History className="w-5 h-5 text-brand-purple" />
          </div>
          <div>
            <h1 className="font-display font-bold text-[1.7rem] text-text-primary leading-tight">GW History</h1>
            <p className="text-text-secondary text-sm mt-0.5">Past results and winners</p>
          </div>
        </div>

        {(!giveaways || giveaways.length === 0) ? (
          <div className="card p-16 text-center">
            <History className="w-10 h-10 text-gray-200 mx-auto mb-4" />
            <h3 className="font-bold text-text-primary mb-1.5">No history yet</h3>
            <p className="text-text-secondary text-sm">Past gameweek results will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {giveaways.map((gw) => (
              <div key={gw.id} className="card overflow-hidden">

                {/* GW header */}
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-display font-bold text-[1.15rem] text-text-primary">
                      Gameweek {gw.gameweek_number}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary/40 bg-gray-100 px-2 py-0.5 rounded-md">
                      {gw.type}
                    </span>
                  </div>
                  {gw.total_entries > 0 && (
                    <span className="text-[12px] text-text-secondary/50">
                      {gw.total_entries} entries
                    </span>
                  )}
                </div>

                {/* Winners */}
                {gw.winners && Array.isArray(gw.winners) && gw.winners.length > 0 ? (
                  <div className="divide-y divide-border/60">
                    {gw.winners.map((winner: {
                      position: number
                      manager_name: string
                      fpl_team_name: string
                      group_number: number
                      gw_points: number
                      prize_amount?: number
                      prize_description?: string
                    }, i: number) => (
                      <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                        <span className="text-xl w-8 flex-shrink-0 text-center">
                          {medals[winner.position - 1] ?? `#${winner.position}`}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-text-primary text-[0.9rem] truncate">{winner.manager_name}</p>
                          <p className="text-[12px] text-text-secondary/60 truncate">
                            {winner.fpl_team_name} · Group {winner.group_number} · {winner.gw_points} pts
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          {winner.prize_amount ? (
                            <span className="font-bold text-success text-sm">{formatKES(winner.prize_amount)}</span>
                          ) : winner.prize_description ? (
                            <span className="text-sm text-text-secondary">{winner.prize_description}</span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-4">
                    <p className="text-sm text-text-secondary/50">{gw.description || 'No winners recorded.'}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer platformName={settings?.platform_name} />
    </div>
  )
}