// src/app/hall-of-fame/page.tsx

import { createServerSupabaseClient } from '@/lib/supabase'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Trophy } from 'lucide-react'
import { formatKES } from '@/lib/utils'

export const revalidate = 300

export default async function HallOfFamePage() {
  const supabase = createServerSupabaseClient()
  const { data: settings } = await supabase
    .from('settings')
    .select('platform_name, hall_of_fame_enabled, history_visible, hall_of_fame_audience, hall_of_fame_price, registration_open')
    .single()

  const { data: entries } = await supabase
    .from('hall_of_fame')
    .select('*')
    .order('total_wins', { ascending: false })
    .limit(50)

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header
        hallOfFameEnabled={settings?.hall_of_fame_enabled}
        registrationOpen={settings?.registration_open ?? false}
        historyVisible={settings?.history_visible}
        platformName={settings?.platform_name}
      />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10 sm:py-14">

        {/* Page header */}
        <div className="flex items-center gap-4 mb-10">
          <div className="w-11 h-11 rounded-2xl bg-yellow-50 border border-yellow-100 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <h1 className="font-display font-bold text-[1.7rem] text-text-primary leading-tight">Hall of Fame</h1>
            <p className="text-text-secondary text-sm mt-0.5">All-time greatest FPL managers</p>
          </div>
        </div>

        {(!entries || entries.length === 0) ? (
          <div className="card p-16 text-center">
            <Trophy className="w-10 h-10 text-gray-200 mx-auto mb-4" />
            <h3 className="font-bold text-text-primary mb-1.5">No entries yet</h3>
            <p className="text-text-secondary text-sm">The Hall of Fame populates after the first gameweek concludes.</p>
          </div>
        ) : (
          <div className="space-y-5">

            {/* Top 3 podium */}
            {entries.length >= 1 && (
              <div className="grid sm:grid-cols-3 gap-3 mb-2">
                {entries.slice(0, 3).map((entry, i) => (
                  <div
                    key={entry.id}
                    className={`card p-5 text-center transition-shadow hover:shadow-card-hover ${
                      i === 0 ? 'ring-1 ring-yellow-200 bg-gradient-to-b from-yellow-50/60 to-white' : ''
                    }`}
                  >
                    <div className="text-3xl mb-2">{medals[i]}</div>
                    <p className="font-bold text-text-primary text-[0.95rem] leading-snug">{entry.manager_name}</p>
                    <p className="text-[12px] text-text-secondary/60 mt-0.5 mb-3">{entry.fpl_team_name}</p>
                    <div className="flex items-center justify-center gap-3 text-sm">
                      <div className="text-center">
                        <p className="font-display font-bold text-[1.3rem] text-brand-purple">{entry.total_wins}</p>
                        <p className="text-[10px] text-text-secondary/50 uppercase tracking-wide">Wins</p>
                      </div>
                      {entry.total_amount_won > 0 && (
                        <>
                          <div className="w-px h-8 bg-border" />
                          <div className="text-center">
                            <p className="font-display font-bold text-[1.1rem] text-success">{formatKES(entry.total_amount_won)}</p>
                            <p className="text-[10px] text-text-secondary/50 uppercase tracking-wide">Won</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Full leaderboard */}
            {entries.length > 3 && (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="standings-table">
                    <thead>
                      <tr>
                        <th className="w-12">Rank</th>
                        <th>Manager</th>
                        <th className="text-right">Wins</th>
                        <th className="text-right hidden sm:table-cell">Points</th>
                        <th className="text-right hidden md:table-cell">Best GW</th>
                        <th className="text-right">Won</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.slice(3).map((entry, i) => (
                        <tr key={entry.id}>
                          <td>
                            <span className="text-sm font-bold text-text-secondary/50">#{i + 4}</span>
                          </td>
                          <td>
                            <p className="font-semibold text-text-primary text-[0.9rem]">{entry.manager_name}</p>
                            <p className="text-[12px] text-text-secondary/60">{entry.fpl_team_name}</p>
                          </td>
                          <td className="text-right">
                            <span className="font-bold text-brand-purple">{entry.total_wins}</span>
                          </td>
                          <td className="text-right hidden sm:table-cell">
                            <span className="font-mono text-sm text-text-primary">{entry.total_points}</span>
                          </td>
                          <td className="text-right hidden md:table-cell">
                            <span className="text-sm text-text-primary">{entry.highest_gw_points}
                              {entry.highest_gw_number && (
                                <span className="text-text-secondary/50 text-[11px] ml-1">GW{entry.highest_gw_number}</span>
                              )}
                            </span>
                          </td>
                          <td className="text-right">
                            <span className="text-sm font-semibold text-success">
                              {entry.total_amount_won > 0 ? formatKES(entry.total_amount_won) : '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer platformName={settings?.platform_name} />
    </div>
  )
}