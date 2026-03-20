'use client'
// src/app/enter/page.tsx
// Flow: 1 Tier → 2 Verify ID → 3 Confirm → 4 Payment → 5 Done

import { useState, useEffect, useRef } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { StepIndicator } from '@/components/entry/StepIndicator'
import { ManagerCard } from '@/components/entry/ManagerCard'
import {
  Search, AlertCircle, Loader2, Phone, ChevronRight,
  CheckCircle, XCircle, RotateCcw, ExternalLink, Zap,
  Info, X, Shield, Users, Trophy, MessageCircle, Smartphone,
} from 'lucide-react'
import { cn, formatKES } from '@/lib/utils'
import type { ResolvedManager, EntryTier, TierSettings } from '@/types'

const STEPS = ['Tier', 'Verify ID', 'Confirm', 'Payment', 'Done']

interface Settings {
  gameweek_number: number
  entry_deadline: string | null
  registration_open: boolean
  terms_text: string
  platform_name: string
  hall_of_fame_enabled: boolean
  history_visible: boolean
  casual_settings: TierSettings
  elite_settings: TierSettings
  contact_whatsapp?: string
}

// ── WhatsApp support button ────────────────────────────────────────
function WhatsAppButton({ phone, label = 'Contact Support on WhatsApp', small = false }: {
  phone?: string; label?: string; small?: boolean
}) {
  if (!phone) return null
  return (
    <a
      href={`https://wa.me/${phone}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-2 rounded-xl font-semibold transition-all',
        'bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 hover:bg-[#25D366]/20',
        small ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'
      )}
    >
      <svg className={small ? 'w-3.5 h-3.5' : 'w-4 h-4'} viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
      {label}
    </a>
  )
}

// ── STK Push progress bar ──────────────────────────────────────────
function StkProgressBar({ status }: { status: 'pending' | 'confirmed' | 'failed' }) {
  const [pct, setPct] = useState(0)
  useEffect(() => {
    if (status !== 'pending') return
    const start = Date.now(); const duration = 90_000
    const timer = setInterval(() => {
      setPct(Math.min(82, ((Date.now() - start) / duration) * 82))
      if (Date.now() - start >= duration) clearInterval(timer)
    }, 400)
    return () => clearInterval(timer)
  }, [status])
  useEffect(() => {
    if (status === 'confirmed') setPct(100)
    if (status === 'failed') setPct(0)
  }, [status])
  if (status === 'failed') return null
  return (
    <div className="w-full">
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', status === 'confirmed' ? 'bg-brand-green' : 'bg-brand-green/60')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── Tier context pill ──────────────────────────────────────────────
function TierPill({ tier, fee }: { tier: EntryTier; fee: number }) {
  return (
    <div className="flex items-center justify-center mb-4">
      <div className="inline-flex items-center gap-2 bg-brand-purple text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-sm">
        {tier === 'elite' ? <Trophy className="w-3.5 h-3.5 text-brand-green" /> : <Users className="w-3.5 h-3.5 text-brand-green" />}
        <span className="capitalize">{tier} Entry</span>
        <span className="text-white/40">·</span>
        <span className="text-brand-green">{formatKES(fee)}</span>
      </div>
    </div>
  )
}

export default function EnterPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1)

  // Step 1
  const [selectedTier, setSelectedTier] = useState<EntryTier | null>(null)

  // Step 2
  const [fplId, setFplId] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [verifyErrorCode, setVerifyErrorCode] = useState<string | null>(null)
  const [joinUrl, setJoinUrl] = useState<string | null>(null)
  const [showIdHelp, setShowIdHelp] = useState(false)
  const [alreadyConfirmed, setAlreadyConfirmed] = useState(false)
  const [alreadyConfirmedTier, setAlreadyConfirmedTier] = useState<EntryTier | null>(null)

  // Step 3
  const [manager, setManager] = useState<ResolvedManager | null>(null)

  // Step 4
  const [entryId, setEntryId] = useState<string | null>(null)
  const [phone, setPhone] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [paymentInitiated, setPaymentInitiated] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'confirmed' | 'failed'>('idle')
  const [paymentMessage, setPaymentMessage] = useState('')

  // Step 5
  const [pin, setPin] = useState<string | null>(null)
  const [confirmedManager, setConfirmedManager] = useState<{ name: string; team: string; gw: number } | null>(null)

  const pollRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => { if (d.success) setSettings(d.data) }).catch(console.error)
  }, [])
  useEffect(() => { return () => { if (pollRef.current) clearInterval(pollRef.current) } }, [])

  const handleVerify = async () => {
    if (!fplId || !settings) return
    setVerifying(true); setVerifyError(null); setVerifyErrorCode(null); setAlreadyConfirmed(false)
    try {
      const res = await fetch('/api/fpl/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fplTeamId: parseInt(fplId), gameweekNumber: settings.gameweek_number }),
      })
      const data = await res.json()
      if (data.success) { setManager(data.data.manager); setStep(3) }
      else if (data.errorCode === 'ALREADY_ENTERED') {
        setAlreadyConfirmed(true); setAlreadyConfirmedTier(data.data?.entryTier ?? null)
      } else {
        setVerifyError(data.error); setVerifyErrorCode(data.errorCode ?? null)
        if (data.joinUrl) setJoinUrl(data.joinUrl)
      }
    } catch { setVerifyError('Network error. Please check your connection and try again.') }
    finally { setVerifying(false) }
  }

  const handleRegister = async (): Promise<string | null> => {
    if (!manager || !settings || !selectedTier) return null
    setRegistering(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fplTeamId: manager.fpl_team_id, fplTeamName: manager.fpl_team_name,
          managerName: manager.manager_name, gameweekNumber: settings.gameweek_number,
          entryTier: selectedTier, paymentMethod: 'mpesa', paymentPhone: phone,
        }),
      })
      const data = await res.json()
      if (data.success) { setEntryId(data.data.entryId); return data.data.entryId }
      if (data.errorCode === 'ALREADY_CONFIRMED') {
        setAlreadyConfirmed(true); setAlreadyConfirmedTier(data.data?.entryTier ?? selectedTier); return null
      }
      setVerifyError(data.error); return null
    } catch { setVerifyError('Failed to create entry. Please try again.'); return null }
    finally { setRegistering(false) }
  }

  const handleMpesaPay = async () => {
    const eid = entryId ?? (await handleRegister())
    if (!eid || !settings) return
    setRegistering(true); setPaymentMessage('')
    try {
      const res = await fetch('/api/mpesa/initiate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: eid, phone, gameweekNumber: settings.gameweek_number }),
      })
      const data = await res.json()
      if (data.success) { setPaymentInitiated(true); setPaymentStatus('pending'); startPolling(eid) }
      else setVerifyError(data.error)
    } catch { setVerifyError('Failed to initiate payment. Please try again.') }
    finally { setRegistering(false) }
  }

  const startPolling = (eid: string) => {
    let attempts = 0; const MAX = 24
    pollRef.current = setInterval(async () => {
      attempts++
      try {
        const res = await fetch(`/api/mpesa/status?entryId=${eid}`)
        const data = await res.json()
        if (data.success) {
          const { status, message, pin: entryPin, managerName, fplTeamName, gameweekNumber } = data.data
          if (status === 'confirmed') {
            clearInterval(pollRef.current!); setPaymentStatus('confirmed')
            setPin(entryPin); setConfirmedManager({ name: managerName, team: fplTeamName, gw: gameweekNumber })
            setTimeout(() => setStep(5), 900)
          } else if (status === 'failed') {
            clearInterval(pollRef.current!); setPaymentStatus('failed')
            setPaymentMessage(message || 'Payment was not completed.')
          } else if (attempts >= MAX) {
            clearInterval(pollRef.current!); setPaymentStatus('failed')
            setPaymentMessage('Payment timed out. Please try again.')
          }
        }
      } catch { /* keep polling */ }
    }, 5000)
  }

  const resetPayment = () => {
    setPaymentInitiated(false); setPaymentStatus('idle'); setEntryId(null)
    if (pollRef.current) clearInterval(pollRef.current)
  }

  if (!settings) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-7 h-7 animate-spin text-brand-purple opacity-40" />
    </div>
  )

  const casualTier = settings.casual_settings
  const eliteTier = settings.elite_settings
  const activeTierSettings = selectedTier === 'elite' ? eliteTier : casualTier
  const entryFee = activeTierSettings?.entry_fee ?? 200
  const whatsapp = settings.contact_whatsapp

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header
        platformName={settings.platform_name}
        hallOfFameEnabled={settings.hall_of_fame_enabled}
        historyVisible={settings.history_visible}
        registrationOpen={settings.registration_open}
      />

      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-8 sm:py-12">
        <div className="mb-10">
          <StepIndicator steps={STEPS} currentStep={step} />
        </div>

        {/* ═══════════════════════════════════
            STEP 1 — Choose Tier
        ══════════════════════════════════ */}
        {step === 1 && (
          <div className="animate-slide-up">
            <div className="text-center mb-8">
              <h1 className="font-display font-bold text-2xl text-text-primary">Choose your entry</h1>
              <p className="text-text-secondary mt-2 text-sm">
                Select the tier you want to compete in for GW{settings.gameweek_number}
              </p>
            </div>

            <div className="space-y-4">

              {/* CASUAL */}
              {casualTier?.enabled && (
                <button
                  onClick={() => setSelectedTier('casual')}
                  className={cn(
                    'group w-full rounded-2xl text-left transition-all duration-200 overflow-hidden',
                    selectedTier === 'casual'
                      ? 'ring-2 ring-brand-purple shadow-lg scale-[1.01]'
                      : 'ring-1 ring-border hover:ring-brand-purple/50 hover:shadow-md'
                  )}
                >
                  {/* Dark header band */}
                  <div className={cn(
                    'px-6 pt-5 pb-5 transition-colors duration-200',
                    selectedTier === 'casual' ? 'bg-brand-purple' : 'bg-[#1a0a2e] group-hover:bg-brand-purple/90'
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
                          <Users className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-display font-bold text-white text-xl leading-tight">Casual</p>
                          <p className="text-white/50 text-xs mt-0.5">Entry level managers</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-display font-bold text-3xl text-brand-green leading-none">
                          {formatKES(casualTier.entry_fee)}
                        </p>
                        <p className="text-white/40 text-xs mt-0.5">per gameweek</p>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className={cn(
                    'px-6 py-4 grid grid-cols-3 divide-x transition-colors duration-200',
                    selectedTier === 'casual'
                      ? 'bg-brand-purple/[0.06] divide-brand-purple/20 border-t border-brand-purple/20'
                      : 'bg-white divide-border border-t border-border group-hover:bg-brand-purple/[0.02]'
                  )}>
                    {[
                      { label: 'Group size', value: `≤ ${casualTier.max_group_size}` },
                      { label: 'Winners', value: `Top ${casualTier.winners_per_group}` },
                      { label: 'Prizes', value: 'Post-deadline' },
                    ].map(({ label, value }) => (
                      <div key={label} className="text-center px-3">
                        <p className={cn('font-bold text-sm', selectedTier === 'casual' ? 'text-brand-purple' : 'text-text-primary')}>{value}</p>
                        <p className="text-[10px] text-text-secondary mt-0.5 uppercase tracking-wider">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Selected bar */}
                  {selectedTier === 'casual' && (
                    <div className="flex items-center justify-center gap-2 py-2.5 bg-brand-purple/10 border-t border-brand-purple/20">
                      <CheckCircle className="w-3.5 h-3.5 text-brand-purple" />
                      <span className="text-xs font-bold text-brand-purple uppercase tracking-widest">Selected</span>
                    </div>
                  )}
                </button>
              )}

              {/* ELITE */}
              {eliteTier?.enabled && (
                <button
                  onClick={() => setSelectedTier('elite')}
                  className={cn(
                    'group w-full rounded-2xl text-left transition-all duration-200 overflow-hidden relative',
                    selectedTier === 'elite'
                      ? 'ring-2 ring-brand-purple shadow-lg scale-[1.01]'
                      : 'ring-1 ring-border hover:ring-brand-purple/50 hover:shadow-md'
                  )}
                >
                  {/* Elite badge — top right corner */}
                  <div className="absolute top-0 right-0 z-10">
                    <div className="bg-brand-green text-brand-purple text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl uppercase tracking-widest">
                      Elite
                    </div>
                  </div>

                  {/* Dark header with richer gradient */}
                  <div className={cn(
                    'px-6 pt-5 pb-5 transition-all duration-200',
                    selectedTier === 'elite'
                      ? 'bg-gradient-to-br from-[#2a0060] via-brand-purple to-[#1a0a2e]'
                      : 'bg-gradient-to-br from-[#0d0020] via-[#1a0a2e] to-[#0a0015] group-hover:from-[#2a0060] group-hover:via-brand-purple group-hover:to-[#1a0a2e]'
                  )}>
                    <div className="flex items-center justify-between pr-14">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-green/20 flex items-center justify-center flex-shrink-0">
                          <Trophy className="w-6 h-6 text-brand-green" />
                        </div>
                        <div>
                          <p className="font-display font-bold text-white text-xl leading-tight">Elite</p>
                          <p className="text-white/50 text-xs mt-0.5">Experience Managers</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-display font-bold text-3xl text-brand-green leading-none">
                          {formatKES(eliteTier.entry_fee)}
                        </p>
                        <p className="text-white/40 text-xs mt-0.5">per gameweek</p>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className={cn(
                    'px-6 py-4 grid grid-cols-3 divide-x transition-colors duration-200',
                    selectedTier === 'elite'
                      ? 'bg-brand-purple/[0.06] divide-brand-purple/20 border-t border-brand-purple/20'
                      : 'bg-white divide-border border-t border-border group-hover:bg-brand-purple/[0.02]'
                  )}>
                    {[
                      { label: 'Group size', value: `≤ ${eliteTier.max_group_size}` },
                      { label: 'Winners', value: `Top ${eliteTier.winners_per_group}` },
                      { label: 'Prizes', value: 'Post-deadline' },
                    ].map(({ label, value }) => (
                      <div key={label} className="text-center px-3">
                        <p className={cn('font-bold text-sm', selectedTier === 'elite' ? 'text-brand-purple' : 'text-text-primary')}>{value}</p>
                        <p className="text-[10px] text-text-secondary mt-0.5 uppercase tracking-wider">{label}</p>
                      </div>
                    ))}
                  </div>

                  {selectedTier === 'elite' && (
                    <div className="flex items-center justify-center gap-2 py-2.5 bg-brand-purple/10 border-t border-brand-purple/20">
                      <CheckCircle className="w-3.5 h-3.5 text-brand-purple" />
                      <span className="text-xs font-bold text-brand-purple uppercase tracking-widest">Selected</span>
                    </div>
                  )}
                </button>
              )}
            </div>

            {/* CTA */}
            <div className="mt-6 space-y-2">
              <button
                onClick={() => setStep(2)}
                disabled={!selectedTier}
                className={cn(
                  'w-full flex items-center justify-center gap-2.5 font-bold text-[1.05rem] py-4 rounded-xl transition-all duration-200',
                  selectedTier
                    ? 'bg-brand-purple text-white hover:bg-opacity-90 hover:shadow-lg active:scale-[0.98]'
                    : 'bg-gray-100 text-text-secondary/40 cursor-not-allowed'
                )}
              >
                {selectedTier
                  ? <><span className="capitalize">{selectedTier}</span> entry — Continue <ChevronRight className="w-4 h-4" /></>
                  : 'Select a tier to continue'
                }
              </button>
              <p className="text-center text-xs text-text-secondary/40">
                Prize amounts are revealed after the registration deadline
              </p>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════
            STEP 2 — Verify FPL ID
        ══════════════════════════════════ */}
        {step === 2 && !alreadyConfirmed && (
          <div className="animate-slide-up space-y-4">
            {selectedTier && <TierPill tier={selectedTier} fee={entryFee} />}

            <div className="card p-6 sm:p-7 space-y-5">
              <div>
                <h2 className="font-bold text-[1.15rem] text-text-primary">Enter your FPL Team ID</h2>
                <button
                  onClick={() => setShowIdHelp(true)}
                  className="flex items-center gap-1.5 text-sm text-brand-purple hover:underline mt-2 font-medium"
                  type="button"
                >
                  <Info className="w-4 h-4" />
                  Don&apos;t know your FPL ID?
                </button>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-text-secondary/60 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="number"
                    value={fplId}
                    onChange={e => { setFplId(e.target.value); setVerifyError(null) }}
                    onKeyDown={e => e.key === 'Enter' && handleVerify()}
                    placeholder="e.g. 1234567"
                    className="form-input pl-10"
                    disabled={verifying}
                    autoFocus
                  />
                </div>

                {verifyError && (
                  <div className="flex items-start gap-2.5 bg-error/[0.06] border border-error/20 rounded-xl p-3.5">
                    <AlertCircle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-error">
                      <p>{verifyError}</p>
                      {verifyErrorCode === 'NOT_IN_LEAGUE' && joinUrl && (
                        <a href={joinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 mt-2 font-bold underline underline-offset-2">
                          Join the FPL league <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                <button onClick={handleVerify} disabled={!fplId || verifying} className="btn-primary w-full">
                  {verifying ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : <><Search className="w-4 h-4" /> Verify ID</>}
                </button>
              </div>
            </div>

            <button
              onClick={() => { setStep(1); setVerifyError(null); setFplId('') }}
              className="w-full text-center text-sm text-text-secondary font-medium hover:text-text-primary transition-colors py-2"
            >
              ← Change tier
            </button>
          </div>
        )}

        {/* Already confirmed */}
        {step === 2 && alreadyConfirmed && (
          <div className="animate-slide-up">
            <div className="card p-8 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <div>
                <h3 className="font-bold text-text-primary text-xl">You&apos;re already entered!</h3>
                <p className="text-sm text-text-secondary mt-2 leading-relaxed">
                  FPL ID {fplId} has already entered GW{settings.gameweek_number}
                  {alreadyConfirmedTier ? <> as a <strong className="capitalize text-brand-purple">{alreadyConfirmedTier}</strong> manager</> : ''}.
                </p>
              </div>
              <a href="/standings" className="btn-primary flex items-center justify-center gap-2 w-full">
                <Trophy className="w-4 h-4" /> View My Standings
              </a>
              <button
                onClick={() => { setAlreadyConfirmed(false); setFplId(''); setVerifyError(null) }}
                className="w-full text-center text-sm text-text-secondary hover:text-text-primary font-medium py-1"
              >
                Try a different FPL ID
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════
            STEP 3 — Confirm Manager
        ══════════════════════════════════ */}
        {step === 3 && manager && (
          <div className="animate-slide-up space-y-4">
            {selectedTier && <TierPill tier={selectedTier} fee={entryFee} />}
            <ManagerCard manager={manager} fplTeamId={manager.fpl_team_id} />
            <div className="space-y-3">
              <button onClick={() => setStep(4)} className="btn-primary w-full">
                That&apos;s me — Continue <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setStep(2); setManager(null); setFplId(''); setVerifyError(null) }}
                className="w-full text-center text-sm text-text-secondary font-medium hover:text-text-primary transition-colors py-2"
              >
                Not me? Try a different ID
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════
            STEP 4 — Payment
        ══════════════════════════════════ */}
        {step === 4 && manager && selectedTier && !alreadyConfirmed && (
          <div className="animate-slide-up space-y-4">
            <div className={cn(
              'rounded-2xl overflow-hidden shadow-xl',
              paymentStatus === 'failed' ? 'bg-white ring-1 ring-border' : 'bg-brand-purple'
            )}>

              {/* ── Idle form ── */}
              {!paymentInitiated && paymentStatus !== 'failed' && (
                <>
                  {/* Header */}
                  <div className="px-6 pt-7 pb-5">
                    <div className="inline-flex items-center gap-2 bg-white/[0.08] rounded-full px-3 py-1.5 mb-5">
                      {selectedTier === 'elite'
                        ? <Trophy className="w-3.5 h-3.5 text-brand-green" />
                        : <Users className="w-3.5 h-3.5 text-brand-green" />}
                      <span className="text-xs font-bold text-white/60 capitalize">{selectedTier} Entry · GW{settings.gameweek_number}</span>
                    </div>

                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-display font-bold text-5xl text-white leading-none">{formatKES(entryFee)}</span>
                    </div>
                    <p className="text-white/40 text-sm">via M-Pesa</p>

                    {/* Manager strip */}
                    <div className="mt-5 flex items-center gap-3 bg-white/[0.06] rounded-xl px-4 py-3">
                      <div className="w-8 h-8 rounded-full bg-brand-green/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-brand-green font-bold text-sm">{manager.manager_name.charAt(0)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-semibold text-sm truncate">{manager.manager_name}</p>
                        <p className="text-white/35 text-xs truncate">{manager.fpl_team_name}</p>
                      </div>
                      <Shield className="w-4 h-4 text-brand-green/50 flex-shrink-0" />
                    </div>
                  </div>

                  {/* Form */}
                  <div className="px-6 pb-7 space-y-5">
                    <div className="h-px bg-white/[0.08]" />

                    {/* Phone input */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-white/40 mb-2.5">
                        M-Pesa Number
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-white/30 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && phone && termsAccepted && handleMpesaPay()}
                          placeholder="0712 345 678"
                          className="w-full bg-white/[0.08] border border-white/15 rounded-xl px-4 py-3.5 pl-11 text-white placeholder:text-white/20 text-[0.95rem] font-medium outline-none focus:border-brand-green/50 focus:bg-white/[0.12] transition-all"
                          disabled={registering}
                          autoFocus
                        />
                      </div>
                      <p className="text-[11px] text-white/25 mt-1.5">Safaricom only · 07XX or 01XX</p>
                    </div>

                    {/* T&C */}
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative flex-shrink-0">
                        <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} className="sr-only" />
                        <div className={cn(
                          'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all',
                          termsAccepted ? 'bg-brand-green border-brand-green' : 'border-white/25 group-hover:border-white/45'
                        )}>
                          {termsAccepted && (
                            <svg className="w-3 h-3 text-brand-purple" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <span className="text-sm text-white/45 leading-relaxed">
                        I agree to the{' '}
                        <a href="/terms" target="_blank" className="text-white/75 underline underline-offset-2 hover:text-white font-semibold transition-colors">
                          Terms &amp; Conditions
                        </a>
                      </span>
                    </label>

                    {/* Pay button */}
                    <button
                      onClick={handleMpesaPay}
                      disabled={!phone || !termsAccepted || registering}
                      className={cn(
                        'w-full flex items-center justify-center gap-2.5 font-bold text-[1.05rem] py-4 rounded-xl transition-all duration-200',
                        (!phone || !termsAccepted || registering)
                          ? 'bg-white/[0.06] text-white/20 cursor-not-allowed'
                          : 'bg-brand-green text-brand-purple hover:brightness-105 hover:shadow-[0_0_35px_rgba(0,255,135,0.4)] active:scale-[0.98]'
                      )}
                    >
                      {registering
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                        : <><Zap className="w-4 h-4 fill-current" /> Pay {formatKES(entryFee)} via M-Pesa</>}
                    </button>
                  </div>
                </>
              )}

              {/* ── Pending ── */}
              {paymentInitiated && paymentStatus === 'pending' && (
                <div className="px-6 py-12 flex flex-col items-center text-center space-y-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center">
                      <Smartphone className="w-11 h-11 text-white/60" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-brand-green flex items-center justify-center shadow-lg shadow-brand-green/30">
                      <Loader2 className="w-4 h-4 text-brand-purple animate-spin" />
                    </div>
                  </div>
                  <div>
                    <p className="font-display font-bold text-2xl text-white mb-2">Check your phone</p>
                    <p className="text-white/45 text-sm leading-relaxed max-w-xs mx-auto">
                      M-Pesa prompt sent to <span className="text-white font-semibold">{phone}</span>. Enter your PIN when prompted.
                    </p>
                  </div>
                  <StkProgressBar status="pending" />
                  <div className="inline-flex items-center gap-2.5 bg-white/[0.05] border border-white/[0.08] rounded-2xl px-5 py-3 text-sm text-white/35">
                    <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse flex-shrink-0" />
                    Waiting for confirmation…
                  </div>
                  <p className="text-xs text-white/20">
                    {formatKES(entryFee)} · <span className="capitalize">{selectedTier}</span> · GW{settings.gameweek_number}
                  </p>
                </div>
              )}

              {/* ── Confirmed ── */}
              {paymentInitiated && paymentStatus === 'confirmed' && (
                <div className="px-6 py-12 flex flex-col items-center text-center space-y-5">
                  <div className="w-24 h-24 rounded-full bg-brand-green/20 border-2 border-brand-green/50 flex items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-brand-green" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-2xl text-white">Payment confirmed!</p>
                    <p className="text-white/45 text-sm mt-1">Setting up your entry…</p>
                  </div>
                  <StkProgressBar status="confirmed" />
                </div>
              )}

              {/* ── Failed ── */}
              {paymentStatus === 'failed' && (
                <div className="px-6 py-8 flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center">
                    <XCircle className="w-8 h-8 text-error" />
                  </div>
                  <div>
                    <p className="font-bold text-text-primary text-xl">Payment not completed</p>
                    <p className="text-sm text-text-secondary mt-2 leading-relaxed max-w-xs mx-auto">{paymentMessage}</p>
                  </div>
                  <div className="flex flex-col items-center gap-3 w-full pt-1">
                    <button
                      onClick={resetPayment}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-purple text-white text-sm font-bold rounded-xl hover:bg-opacity-90 transition-all w-full"
                    >
                      <RotateCcw className="w-4 h-4" /> Try again
                    </button>
                    <WhatsAppButton phone={whatsapp} label="Need help? Chat with us" />
                  </div>
                </div>
              )}
            </div>

            {!paymentInitiated && (
              <button
                onClick={() => { setStep(3); setEntryId(null); setVerifyError(null) }}
                className="w-full text-center text-sm text-text-secondary font-medium hover:text-text-primary transition-colors py-2"
              >
                ← Back
              </button>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════
            STEP 5 — Done
        ══════════════════════════════════ */}
        {step === 5 && pin && confirmedManager && (
          <ConfirmationScreen
            pin={pin}
            managerName={confirmedManager.name}
            fplTeamName={confirmedManager.team}
            gameweekNumber={confirmedManager.gw}
            tier={selectedTier!}
            whatsappNumber={whatsapp}
          />
        )}

        {/* How to find FPL ID modal */}
        {showIdHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-background card p-6 sm:p-8 w-full max-w-md relative shadow-2xl animate-slide-up">
              <button onClick={() => setShowIdHelp(false)} className="absolute top-4 right-4 p-2 text-text-secondary hover:text-text-primary bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-display font-bold text-xl text-text-primary mb-6 pr-8">How to find your FPL ID</h3>
              <div className="space-y-5 text-sm text-text-secondary">
                {[
                  { n: 1, content: <>Log in at <a href="https://fantasy.premierleague.com" target="_blank" rel="noopener noreferrer" className="text-brand-purple font-semibold hover:underline inline-flex items-center gap-1">fantasy.premierleague.com <ExternalLink className="w-3 h-3" /></a>.</> },
                  { n: 2, content: <>Click the <strong className="text-text-primary">Points</strong> tab in the main menu.</> },
                  { n: 3, content: <>Your ID is the number after <strong className="text-text-primary">/entry/</strong> in the URL.</> },
                ].map(({ n, content }) => (
                  <div key={n} className="flex gap-4 items-start">
                    <div className="w-7 h-7 rounded-full bg-brand-purple/10 text-brand-purple flex items-center justify-center font-bold shrink-0 mt-0.5">{n}</div>
                    <p className="leading-relaxed">{content}</p>
                  </div>
                ))}
                <div className="bg-gray-50 p-3 rounded-lg text-[13px] font-mono border border-border break-all">
                  fantasy.premierleague.com/entry/<span className="bg-brand-purple text-white px-1.5 py-0.5 rounded font-bold">1234567</span>/event/...
                </div>
              </div>
              <button onClick={() => setShowIdHelp(false)} className="btn-primary w-full mt-8">Got it, thanks!</button>
            </div>
          </div>
        )}
      </main>

      <Footer platformName={settings.platform_name} />
    </div>
  )
}

// ── Confirmation screen ────────────────────────────────────────────
function ConfirmationScreen({
  pin, managerName, fplTeamName, gameweekNumber, tier, whatsappNumber,
}: {
  pin: string; managerName: string; fplTeamName: string
  gameweekNumber: number; tier: EntryTier; whatsappNumber?: string
}) {
  const [copied, setCopied] = useState(false)
  const copyPin = () => {
    navigator.clipboard.writeText(pin).catch(() => null)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="animate-slide-up space-y-4">
      <div className="bg-brand-purple rounded-2xl p-7 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-brand-green/20 border-2 border-brand-green/40 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-brand-green" />
        </div>
        <div>
          <p className="font-display font-bold text-2xl text-white">You&apos;re in!</p>
          <p className="text-white/50 text-sm mt-1">
            GW{gameweekNumber} · <span className="capitalize text-brand-green font-semibold">{tier}</span>
          </p>
        </div>
        <div className="bg-white/[0.08] rounded-xl px-4 py-3">
          <p className="font-semibold text-white text-sm">{managerName}</p>
          <p className="text-white/40 text-xs mt-0.5">{fplTeamName}</p>
        </div>
      </div>

      <div className="card p-6 space-y-5">
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 font-medium leading-snug">
            Your PIN is important — save it now. You&apos;ll need it every time you check your standings.
          </p>
        </div>

        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-secondary/50 mb-4">Your Access PIN</p>
          <div className="flex items-center justify-center gap-3">
            {pin.split('').map((digit, i) => (
              <div key={i} className="w-14 h-16 rounded-xl bg-brand-purple text-white font-display font-bold text-3xl flex items-center justify-center shadow-md">
                {digit}
              </div>
            ))}
          </div>
          <button
            onClick={copyPin}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2 text-sm text-brand-purple font-semibold hover:bg-brand-purple/5 rounded-lg transition-colors border border-brand-purple/20"
          >
            {copied ? <CheckCircle className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy PIN'}
          </button>
        </div>

        <div className="space-y-2.5 pt-1 border-t border-border">
          <a href="/standings" className="btn-primary w-full flex items-center justify-center gap-2">
            <Trophy className="w-4 h-4" /> View My Standings
          </a>
          {whatsappNumber && (
            <div className="flex justify-center">
              <WhatsAppButton phone={whatsappNumber} label="Contact Us" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}