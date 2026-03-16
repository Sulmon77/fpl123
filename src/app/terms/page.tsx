// src/app/terms/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export const revalidate = 300

const DEFAULT_TERMS = `1. FPL123 is a performance recognition platform, not a gambling, gaming, or betting service.

2. Entry fees are paid for the purpose of platform recognition — being identified and celebrated among millions of FPL managers.

3. Any monetary rewards distributed are at the sole discretion of the platform administrator.

4. FPL123 is not affiliated with, endorsed by, or connected to the Premier League or Fantasy Premier League.

5. Entry fees are non-refundable except at the administrator's discretion.

6. The platform does not guarantee any specific prize or recognition.

7. By paying the entry fee, you confirm you are the rightful owner of the FPL Team ID entered.

8. The platform may disqualify any manager found to be acting in bad faith.

9. All disputes are subject to the administrator's final decision.

10. Your M-Pesa number or PayPal email may be used to return funds in the event of a refund.`

export default async function TermsPage() {
  const supabase = createServerSupabaseClient()
  const { data: settings } = await supabase
    .from('settings')
    .select('terms_text, platform_name, hall_of_fame_enabled, history_visible, registration_open')
    .single()

  const termsText = settings?.terms_text || DEFAULT_TERMS

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
          <div className="mb-8">
            <h1 className="font-display font-bold text-3xl text-text-primary mb-2">
              Terms &amp; Conditions
            </h1>
            <p className="text-text-secondary text-sm">
              Please read these terms carefully before entering any gameweek.
            </p>
          </div>

          <div className="card p-6 sm:p-8">
            <div className="prose prose-sm max-w-none text-text-primary">
              {termsText.split('\n').map((line: string, i: number) => {
                const trimmed = line.trim()
                if (!trimmed) return <div key={i} className="h-3" />
                return (
                  <p key={i} className="mb-3 leading-relaxed text-text-primary">
                    {trimmed}
                  </p>
                )
              })}
            </div>
          </div>

          <p className="text-xs text-text-secondary mt-6 text-center">
            {settings?.platform_name ?? 'FPL123'} is not affiliated with Fantasy Premier League or the Premier League.
          </p>
        </div>
      </main>

      <Footer platformName={settings?.platform_name} />
    </div>
  )
}