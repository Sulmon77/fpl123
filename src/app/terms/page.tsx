// src/app/terms/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { FileText } from 'lucide-react'

export const revalidate = 300

const DEFAULT_TERMS = `1. FPL123 is a performance recognition platform, not a gambling, gaming, or betting service.

2. Entry fees are paid for the purpose of platform recognition — being identified and celebrated among FPL managers.

3. Any monetary rewards distributed are at the sole discretion of the platform administrator.

4. FPL123 is not affiliated with, endorsed by, or connected to the Premier League or Fantasy Premier League.

5. Entry fees are non-refundable except at the administrator's discretion.

6. The platform does not guarantee any specific prize or recognition.

7. By paying the entry fee, you confirm you are the rightful owner of the FPL Team ID entered.

8. The platform may disqualify any manager found to be acting in bad faith.

9. All disputes are subject to the administrator's final decision.

10. Your M-Pesa number may be used to return funds in the event of a refund.`

export default async function TermsPage() {
  const supabase = createServerSupabaseClient()
  const { data: settings } = await supabase
    .from('settings')
    .select('terms_text, platform_name, hall_of_fame_enabled, history_visible, registration_open')
    .single()

  const termsText = settings?.terms_text || DEFAULT_TERMS
  const platformName = settings?.platform_name ?? 'FPL123'

  // Split into numbered clauses intelligently
  const lines = termsText.split('\n').map((l: string) => l.trim()).filter(Boolean)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header
        hallOfFameEnabled={settings?.hall_of_fame_enabled}
        registrationOpen={settings?.registration_open ?? false}
        historyVisible={settings?.history_visible}
        platformName={platformName}
      />

      <main className="flex-1 py-12 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">

          {/* Page header */}
          <div className="flex items-start gap-4 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-brand-purple/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-brand-purple" />
            </div>
            <div>
              <h1 className="font-display font-bold text-3xl text-text-primary mb-1">
                Terms &amp; Conditions
              </h1>
              <p className="text-text-secondary text-sm">
                Please read these terms carefully before entering any gameweek.
              </p>
            </div>
          </div>

          {/* Terms content */}
          <div className="card p-6 sm:p-8">
            <div className="space-y-4">
              {lines.map((line: string, i: number) => {
                // Detect numbered clauses like "1." or "10."
                const match = line.match(/^(\d+)\.\s+(.+)$/)
                if (match) {
                  return (
                    <div key={i} className="flex gap-4">
                      <span className="w-7 h-7 rounded-full bg-brand-purple/10 text-brand-purple text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {match[1]}
                      </span>
                      <p className="text-text-primary text-sm leading-relaxed pt-0.5">
                        {match[2]}
                      </p>
                    </div>
                  )
                }
                return (
                  <p key={i} className="text-text-primary text-sm leading-relaxed">
                    {line}
                  </p>
                )
              })}
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-2">
            <p className="text-xs text-text-secondary text-center">
              Last updated by {platformName} administrators.
            </p>
            <p className="text-xs text-text-secondary text-center">
              {platformName} is not affiliated with Fantasy Premier League or the Premier League.
            </p>
          </div>
        </div>
      </main>

      <Footer platformName={platformName} />
    </div>
  )
}