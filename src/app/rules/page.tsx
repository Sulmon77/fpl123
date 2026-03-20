// src/app/rules/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export const revalidate = 300

interface Rule {
  id: string
  title: string
  body: string
  sort_order: number
}

export default async function RulesPage() {
  const supabase = createServerSupabaseClient()

  const [{ data: settings }, { data: rulesData }] = await Promise.all([
    supabase.from('settings').select('platform_name, hall_of_fame_enabled, history_visible, registration_open').single(),
    supabase.from('rules').select('*').order('sort_order', { ascending: true }),
  ])

  const rules: Rule[] = rulesData ?? []

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header
        hallOfFameEnabled={settings?.hall_of_fame_enabled}
        registrationOpen={settings?.registration_open ?? false}
        historyVisible={settings?.history_visible}
        platformName={settings?.platform_name}
      />

      <main className="flex-1 py-12 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-brand-purple/50 mb-3">
              {settings?.platform_name ?? 'FPL123'}
            </p>
            <h1 className="font-display font-bold text-3xl sm:text-4xl text-text-primary mb-3">
              Platform Rules
            </h1>
            <p className="text-text-secondary">
              Read these rules carefully before entering any gameweek.
            </p>
          </div>

          {rules.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-text-secondary">No rules have been published yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule, index) => (
                <div key={rule.id} className="card p-6 flex gap-5">
                  {/* Number badge */}
                  <div className="w-9 h-9 rounded-xl bg-brand-purple text-white font-display font-bold text-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  {/* Content */}
                  <div>
                    <h2 className="font-bold text-text-primary text-[1.05rem] mb-1.5">
                      {rule.title}
                    </h2>
                    <p className="text-text-secondary text-sm leading-relaxed">
                      {rule.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-text-secondary mt-8 text-center">
            {settings?.platform_name ?? 'FPL123'} is not affiliated with Fantasy Premier League or the Premier League.
          </p>
        </div>
      </main>

      <Footer platformName={settings?.platform_name} />
    </div>
  )
}