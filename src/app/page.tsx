// src/app/page.tsx

import { createServerSupabaseClient } from '@/lib/supabase'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { AnnouncementBanner } from '@/components/shared/AnnouncementBanner'
import { CountdownTimer } from '@/components/shared/CountdownTimer'
import { formatKES, formatDeadline, isDeadlinePassed } from '@/lib/utils'
import Link from 'next/link'
import { Zap, Users, Trophy, ChevronRight, ArrowRight, Shield } from 'lucide-react'

export const revalidate = 30

export default async function HomePage() {
  const supabase = createServerSupabaseClient()
  const { data: settings } = await supabase.from('settings').select('*').single()

  const { data: groups } = await supabase
    .from('groups')
    .select('id')
    .eq('gameweek_number', settings?.gameweek_number ?? 1)
    .limit(1)

  const groupsAllocated = (groups?.length ?? 0) > 0
  const deadlinePassed = isDeadlinePassed(settings?.entry_deadline ?? null)
  const registrationOpen = !!settings?.registration_open

  type GwStatus = 'upcoming' | 'ongoing' | 'ended' | 'edit'
  const gwStatus: GwStatus = (settings?.gameweek_status as GwStatus) ?? 'upcoming'

  const statusConfig: Record<GwStatus, {
    badge: string; dot: string; badgeBg: string;
    showCountdown: boolean; canEnter: boolean; showEditNotice: boolean;
    buttonLabel: string;
  }> = {
    upcoming: {
      badge: `GW${settings?.gameweek_number} · Open`,
      dot: 'bg-brand-green animate-pulse',
      badgeBg: 'bg-brand-green/10 border-brand-green/20 text-brand-green',
      showCountdown: !!(settings?.entry_deadline && !deadlinePassed),
      canEnter: registrationOpen,
      showEditNotice: false,
      buttonLabel: `Join GW${settings?.gameweek_number}`,
    },
    ongoing: {
      badge: `GW${settings?.gameweek_number} · In Progress`,
      dot: 'bg-blue-400 animate-pulse',
      badgeBg: 'bg-blue-400/10 border-blue-400/20 text-blue-300',
      showCountdown: false,
      canEnter: false,
      showEditNotice: false,
      buttonLabel: 'In Progress',
    },
    ended: {
      badge: `GW${settings?.gameweek_number} · Ended`,
      dot: 'bg-white/30',
      badgeBg: 'bg-white/5 border-white/10 text-white/40',
      showCountdown: false,
      canEnter: false,
      showEditNotice: false,
      buttonLabel: 'GW Ended',
    },
    edit: {
      badge: `GW${settings?.gameweek_number} · Updating`,
      dot: 'bg-yellow-400 animate-pulse',
      badgeBg: 'bg-yellow-400/10 border-yellow-400/20 text-yellow-300',
      showCountdown: false,
      canEnter: false,
      showEditNotice: true,
      buttonLabel: 'Coming Soon',
    },
  }

  const sc = statusConfig[gwStatus]

  const fplLeagueUrl = process.env.FPL_LEAGUE_JOIN_URL ?? 'https://fantasy.premierleague.com/leagues/auto-join/oly4ih'

  const contactInfo = {
    whatsapp: process.env.CONTACT_WHATSAPP,
    instagram: process.env.CONTACT_INSTAGRAM,
    tiktok: process.env.CONTACT_TIKTOK,
    email: process.env.CONTACT_EMAIL,
    facebook: process.env.CONTACT_FACEBOOK,
    x: process.env.CONTACT_X,
  }

  // Prize data
  const payoutPcts = settings?.payout_percentages ?? {}
  const entryFee = settings?.entry_fee ?? 200
  const platformCut = payoutPcts.platform ?? 10
  const pot32 = entryFee * 32
  const distributable = Math.floor(pot32 * (1 - platformCut / 100))

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {settings?.announcement_visible && settings?.announcement_text && (
        <AnnouncementBanner text={settings.announcement_text} />
      )}

      <Header
        hallOfFameEnabled={settings?.hall_of_fame_enabled}
        historyVisible={settings?.history_visible}
        groupsAllocated={groupsAllocated}
        registrationOpen={registrationOpen}
        platformName={settings?.platform_name}
      />

      <main className="flex-1">

        {/* ─── HERO ──────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-brand-purple text-white min-h-[88svh] flex items-center">

          {/* Background layers */}
          <div className="absolute inset-0 pointer-events-none select-none">
            {/* Dot grid */}
            <div className="absolute inset-0 opacity-[0.06]" style={{
              backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)`,
              backgroundSize: '28px 28px',
            }} />
            {/* Glow orbs */}
            <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-brand-green/[0.06] blur-[120px]" />
            <div className="absolute bottom-0 -left-32 w-[500px] h-[500px] rounded-full bg-brand-cyan/[0.04] blur-[100px]" />
            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />
          </div>

          <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-28 sm:pt-20 sm:pb-36">
            <div className="flex flex-col items-center text-center max-w-3xl mx-auto">

              {/* Status badge */}
              <div className={`inline-flex items-center gap-2 border rounded-full px-4 py-1.5 mb-8 animate-fade-in ${sc.badgeBg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                <span className="text-[13px] font-bold tracking-wide">{sc.badge}</span>
              </div>

              {/* Headline */}
              <h1 className="font-display font-bold text-[2.6rem] sm:text-[3.5rem] lg:text-[4.2rem] leading-[1.05] mb-5 animate-slide-up">
                Prove Your FPL{' '}
                <span className="text-brand-green">Edge</span>
                <br className="hidden sm:block" />
                Among Peers
              </h1>

              <p className="text-white/50 text-[1.05rem] sm:text-lg mb-10 max-w-md leading-relaxed animate-slide-up delay-75">
                A small private circle of serious FPL managers. The best get recognised and paid — straight to M-Pesa or PayPal.
              </p>

              {/* Countdown */}
              {sc.showCountdown && settings?.entry_deadline && (
                <div className="mb-10 flex flex-col items-center gap-3 animate-slide-up delay-150">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/30">
                    Closes {formatDeadline(settings.entry_deadline)}
                  </p>
                  <CountdownTimer deadline={settings.entry_deadline} />
                </div>
              )}

              {/* Edit mode notice */}
              {sc.showEditNotice && (
                <div className="mb-10 flex items-center gap-3 bg-yellow-400/10 border border-yellow-400/15 rounded-2xl px-5 py-3.5 animate-slide-up delay-150">
                  <span className="text-lg">✏️</span>
                  <p className="text-yellow-200/80 text-sm font-medium">This gameweek is being updated. Check back soon.</p>
                </div>
              )}

              {/* CTA row */}
              <div className="flex flex-col sm:flex-row items-center gap-3 animate-slide-up delay-150">
                {/* Fee pill */}
                <div className="flex items-center gap-2 bg-white/[0.07] border border-white/10 rounded-xl px-5 py-3">
                  <span className="font-display font-bold text-white text-xl">{formatKES(entryFee)}</span>
                  <span className="text-white/35 text-sm font-medium">entry</span>
                </div>

                {/* Enter button */}
                <Link
                  href={sc.canEnter ? '/enter' : '#'}
                  className={`inline-flex items-center gap-2.5 font-bold text-[1.05rem] px-8 py-3.5 rounded-xl transition-all duration-150 group ${
                    sc.canEnter
                      ? 'bg-brand-green text-brand-purple shadow-glow-green hover:shadow-[0_0_40px_rgba(0,255,135,0.5)] active:scale-[0.97]'
                      : 'bg-white/[0.07] text-white/25 cursor-not-allowed pointer-events-none'
                  }`}
                >
                  <Zap className="w-5 h-5 fill-current" />
                  {sc.buttonLabel}
                  {sc.canEnter && <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
                </Link>
              </div>

              {/* Standings link */}
              {groupsAllocated && (gwStatus === 'ongoing' || gwStatus === 'ended') && (
                <Link
                  href="/standings"
                  className="mt-6 inline-flex items-center gap-1.5 text-brand-green/60 hover:text-brand-green text-sm font-semibold transition-colors group animate-fade-in"
                >
                  View GW{settings?.gameweek_number} Standings
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              )}

            </div>
          </div>
        </section>

        {/* ─── STATS BAR ─────────────────────────────────────────── */}
        <section className="bg-white border-b border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-3 divide-x divide-border">
              {[
                { label: 'Group size', value: 'Up to 32' },
                { label: 'Weekly fee', value: formatKES(entryFee) },
                { label: 'Paid via', value: 'M-Pesa & PayPal' },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col items-center py-5 px-4 text-center">
                  <span className="font-display font-bold text-brand-purple text-[1.15rem] sm:text-xl">{value}</span>
                  <span className="text-[11px] text-text-secondary font-medium uppercase tracking-wide mt-0.5">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── HOW IT WORKS ──────────────────────────────────────── */}
        <section className="py-20 sm:py-28 bg-background">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">

            <div className="text-center mb-14">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-brand-purple/50 mb-3">How it works</p>
              <h2 className="font-display font-bold text-[2rem] sm:text-[2.6rem] text-text-primary">
                Three steps to get started
              </h2>
            </div>

            <div className="grid sm:grid-cols-3 gap-5">

              {/* Step 01 */}
              <div className="relative card p-7 hover:shadow-card-hover transition-shadow duration-200">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-brand-purple/5 mb-5">
                  <span className="font-display font-bold text-sm text-brand-purple">01</span>
                </div>
                <h3 className="font-bold text-[1.05rem] mb-2">
                  <a
                    href={fplLeagueUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-purple underline underline-offset-2 hover:text-brand-purple/70 transition-colors"
                  >
                    Join our FPL league
                  </a>
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed">You must be a member of our private FPL league before registering here.</p>
              </div>

              {/* Step 02 */}
              <div className="relative card p-7 hover:shadow-card-hover transition-shadow duration-200">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-brand-green/5 mb-5">
                  <span className="font-display font-bold text-sm text-brand-green">02</span>
                </div>
                <h3 className="font-bold text-text-primary text-[1.05rem] mb-2">Link your FPL ID & pay</h3>
                <p className="text-text-secondary text-sm leading-relaxed">Enter your FPL team ID, pay the weekly fee via M-Pesa or PayPal, and get your private PIN instantly.</p>
              </div>

              {/* Step 03 */}
              <div className="relative card p-7 hover:shadow-card-hover transition-shadow duration-200">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-brand-cyan/5 mb-5">
                  <span className="font-display font-bold text-sm text-brand-cyan">03</span>
                </div>
                <h3 className="font-bold text-text-primary text-[1.05rem] mb-2">Top 3 in your circle, get recognised</h3>
                <p className="text-text-secondary text-sm leading-relaxed">Highest scorers receive their share directly — M-Pesa or PayPal.</p>
              </div>

            </div>
          </div>
        </section>

        {/* ─── PRIZE SECTION ─────────────────────────────────────── */}
        {settings?.giveaway_type === 'money' && (
          <section className="py-20 sm:py-28 bg-brand-purple text-white relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: `repeating-linear-gradient(-45deg, #04F5FF 0, #04F5FF 1px, transparent 0, transparent 50%)`,
                backgroundSize: '30px 30px',
              }} />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-brand-green/60 mb-3">Rewards</p>
              <h2 className="font-display font-bold text-[2rem] sm:text-[2.6rem] mb-3">
                Top {settings?.winners_per_group ?? 2} in each group{' '}
                <span className="text-brand-green">get paid</span>
              </h2>
              <p className="text-white/40 text-[0.95rem] mb-14 max-w-md mx-auto">
                Transferred directly to your M-Pesa or PayPal. Automatic, every gameweek.
              </p>

              {/* Prize cards */}
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                {Object.entries(payoutPcts)
                  .filter(([k]) => k !== 'platform')
                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                  .map(([pos, pct]) => {
                    const pctNum = Number(pct)
                    const amount = Math.floor(distributable * (pctNum / 100))
                    const isFirst = pos === '1'
                    return (
                      <div
                        key={pos}
                        className={`relative rounded-2xl px-7 py-6 border text-center transition-transform hover:-translate-y-1 ${
                          isFirst
                            ? 'bg-brand-green/[0.08] border-brand-green/25 scale-105'
                            : 'bg-white/[0.04] border-white/[0.08]'
                        }`}
                      >
                        {isFirst && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-green text-brand-purple text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wide">
                            Top Prize
                          </div>
                        )}
                        <div className="text-2xl mb-3">
                          {pos === '1' ? '🥇' : pos === '2' ? '🥈' : pos === '3' ? '🥉' : `#${pos}`}
                        </div>
                        <div className="font-display font-bold text-2xl text-brand-green mb-0.5">
                          {pctNum}%
                        </div>
                        <div className="text-white/30 text-xs">up to {formatKES(amount)}</div>
                      </div>
                    )
                  })}
              </div>
              <p className="text-white/20 text-[11px]">*Based on full group of 32. Actual amounts vary.</p>
            </div>
          </section>
        )}

        {/* ─── TRUST ─────────────────────────────────────────────── */}
        <section className="py-16 sm:py-20 bg-surface-alt border-t border-border">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="grid sm:grid-cols-3 gap-6">
              {[
                { icon: Shield, title: 'Verified Payments', body: 'M-Pesa STK Push and PayPal. Trusted payment rails.' },
                { icon: Users, title: 'Small, Focused Groups', body: 'You are placed in one dedicated small peer group each week ' },
                { icon: Trophy, title: 'Direct Transfers', body: 'The best receive funds straight to their account.' },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-purple/8 border border-brand-purple/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-5 h-5 text-brand-purple" />
                  </div>
                  <div>
                    <h3 className="font-bold text-text-primary mb-1 text-[0.95rem]">{title}</h3>
                    <p className="text-text-secondary text-sm leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── BOTTOM CTA ────────────────────────────────────────── */}
        {gwStatus === 'upcoming' && sc.canEnter && (
          <section className="py-16 bg-brand-green">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
              <h2 className="font-display font-bold text-[2rem] text-brand-purple mb-2">
                GW{settings?.gameweek_number} is open
              </h2>
              {sc.showCountdown && settings?.entry_deadline && (
                <p className="text-brand-purple/60 mb-8 text-[0.95rem]">
                  Closes {formatDeadline(settings.entry_deadline)}
                </p>
              )}
              <Link
                href="/enter"
                className="inline-flex items-center gap-2.5 bg-brand-purple text-white font-bold text-[1.05rem] px-8 py-3.5 rounded-xl hover:bg-opacity-90 active:scale-[0.97] transition-all shadow-deep group"
              >
                <Zap className="w-5 h-5 fill-current" />
                Join — {formatKES(entryFee)}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </section>
        )}

      </main>

      <Footer {...contactInfo} platformName={settings?.platform_name} />
    </div>
  )
}