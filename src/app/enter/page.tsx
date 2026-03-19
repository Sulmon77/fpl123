'use client'
// src/app/enter/page.tsx
// Multi-step entry flow: FPL ID → Confirm Manager → Payment → Confirmation

import { useState, useEffect, useRef } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { StepIndicator } from '@/components/entry/StepIndicator'
import { ManagerCard } from '@/components/entry/ManagerCard'
import { ConfirmationScreen } from '@/components/entry/ConfirmationScreen'
import {
  Search, AlertCircle, Loader2, Phone, ChevronRight,
  CheckCircle, XCircle, RotateCcw, ExternalLink, Zap
} from 'lucide-react'
import { cn, formatKES } from '@/lib/utils'
import type { ResolvedManager } from '@/types'

const STEPS = ['Verify ID', 'Confirm', 'Payment', 'Done']

interface Settings {
  gameweek_number: number
  entry_fee: number
  entry_deadline: string | null
  registration_open: boolean
  terms_text: string
  platform_name: string
  hall_of_fame_enabled: boolean
  history_visible: boolean
  paypal_client_id?: string
}

export default function EnterPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

  const [fplId, setFplId] = useState('')
  const [verifying, setVerifying] = useState(false)
  const[verifyError, setVerifyError] = useState<string | null>(null)
  const [verifyErrorCode, setVerifyErrorCode] = useState<string | null>(null)
  const [joinUrl, setJoinUrl] = useState<string | null>(null)

  const [manager, setManager] = useState<ResolvedManager | null>(null)

  const [entryId, setEntryId] = useState<string | null>(null)
  const[paymentMethod, setPaymentMethod] = useState<'mpesa' | 'paypal'>('mpesa')
  const[phone, setPhone] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [registering, setRegistering] = useState(false)
  const[paymentInitiated, setPaymentInitiated] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'confirmed' | 'failed'>('idle')
  const[paymentMessage, setPaymentMessage] = useState('')
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null)
  const [paypalError, setPaypalError] = useState<string | null>(null)

  const [pin, setPin] = useState<string | null>(null)
  const[confirmedManager, setConfirmedManager] = useState<{ name: string; team: string; gw: number } | null>(null)

  const pollRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => { if (d.success) setSettings(d.data) }).catch(console.error)
  },[])

  useEffect(() => { return () => { if (pollRef.current) clearInterval(pollRef.current) } },[])

  const handleVerify = async () => {
    if (!fplId || !settings) return
    setVerifying(true); setVerifyError(null); setVerifyErrorCode(null)
    try {
      const res = await fetch('/api/fpl/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fplTeamId: parseInt(fplId), gameweekNumber: settings.gameweek_number }),
      })
      const data = await res.json()
      if (data.success) { setManager(data.data.manager); setStep(2) }
      else { setVerifyError(data.error); setVerifyErrorCode(data.errorCode ?? null); if (data.joinUrl) setJoinUrl(data.joinUrl) }
    } catch { setVerifyError('Network error. Please check your connection and try again.') }
    finally { setVerifying(false) }
  }

  const handleRegister = async () => {
    if (!manager || !settings) return null
    setRegistering(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fplTeamId: manager.fpl_team_id, fplTeamName: manager.fpl_team_name,
          managerName: manager.manager_name, gameweekNumber: settings.gameweek_number,
          paymentMethod, paymentPhone: paymentMethod === 'mpesa' ? phone : undefined,
        }),
      })
      const data = await res.json()
      if (data.success) { setEntryId(data.data.entryId); return data.data.entryId }
      else { setVerifyError(data.error); return null }
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
      if (data.success) {
        setCheckoutRequestId(data.data.checkoutRequestId); setPaymentInitiated(true)
        setPaymentStatus('pending'); setPaymentMessage(data.data.message); startPolling(eid)
      } else { setVerifyError(data.error) }
    } catch { setVerifyError('Failed to initiate payment. Please try again.') }
    finally { setRegistering(false) }
  }

  const startPolling = (eid: string) => {
    let attempts = 0
    const MAX_ATTEMPTS = 24
    pollRef.current = setInterval(async () => {
      attempts++
      try {
        const res = await fetch(`/api/mpesa/status?entryId=${eid}`)
        const data = await res.json()
        if (data.success) {
          const { status, message, pin: entryPin, managerName, fplTeamName, gameweekNumber } = data.data
          if (status === 'confirmed') {
            clearInterval(pollRef.current!)
            setPaymentStatus('confirmed'); setPin(entryPin)
            setConfirmedManager({ name: managerName, team: fplTeamName, gw: gameweekNumber })
            setTimeout(() => setStep(4), 800)
          } else if (status === 'failed') {
            clearInterval(pollRef.current!); setPaymentStatus('failed'); setPaymentMessage(message || 'Payment was not completed.')
          } else if (attempts >= MAX_ATTEMPTS) {
            clearInterval(pollRef.current!); setPaymentStatus('failed'); setPaymentMessage('Payment timed out. Please try again.')
          }
        }
      } catch { /* keep polling */ }
    }, 5000)
  }

  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-7 h-7 animate-spin text-brand-purple opacity-40" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header platformName={settings.platform_name} hallOfFameEnabled={settings.hall_of_fame_enabled} historyVisible={settings.history_visible} />

      <main className="flex-1 w-full max-w-md mx-auto px-4 py-8 sm:py-12">

        {/* Step indicator */}
        <div className="mb-8">
          <StepIndicator steps={STEPS} currentStep={step} />
        </div>

        {/* ── STEP 1: Verify FPL ID ── */}
        {step === 1 && (
          <div className="animate-slide-up space-y-4">
            <div className="card p-6 sm:p-7 space-y-5">
              <div>
                <h2 className="font-bold text-[1.15rem] text-text-primary">Enter your FPL Team ID</h2>
                <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                  Find it in the FPL app: Points → tap your team name → look at the URL
                </p>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-text-secondary/60 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="number"
                    value={fplId}
                    onChange={e => setFplId(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleVerify()}
                    placeholder="e.g. 1234567"
                    className="form-input pl-10"
                    disabled={verifying}
                  />
                </div>

                {verifyError && (
                  <div className="flex items-start gap-2.5 bg-error/[0.06] border border-error/20 rounded-xl p-3.5">
                    <AlertCircle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-error">
                      <p>{verifyError}</p>
                      {verifyErrorCode === 'NOT_IN_LEAGUE' && joinUrl && (
                        <a href={joinUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 mt-2 font-bold underline underline-offset-2">
                          Join the FPL league <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleVerify}
                  disabled={!fplId || verifying}
                  className="btn-primary w-full"
                >
                  {verifying ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : <><Search className="w-4 h-4" /> Verify ID</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Confirm Manager ── */}
        {step === 2 && manager && (
          <div className="animate-slide-up space-y-4">
            <ManagerCard manager={manager} fplTeamId={manager.fpl_team_id} />
            <div className="space-y-3">
              <button onClick={() => setStep(3)} className="btn-primary w-full">
                That&apos;s me — Continue <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setStep(1); setManager(null); setFplId(''); setVerifyError(null) }}
                className="w-full text-center text-sm text-text-secondary font-medium hover:text-text-primary transition-colors py-2"
              >
                Not me? Try a different ID
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Payment ── */}
        {step === 3 && manager && (
          <div className="animate-slide-up space-y-4">
            <div className="card p-6 sm:p-7 space-y-6">

              {/* Amount header */}
              <div className="flex items-baseline gap-2.5">
                <span className="font-display font-bold text-[2rem] text-brand-purple">{formatKES(settings.entry_fee)}</span>
                <span className="text-text-secondary text-sm">entry fee · GW{settings.gameweek_number}</span>
              </div>

              {/* Payment method */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-secondary/60 mb-2.5">Pay via</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['mpesa', 'paypal'] as const).map(method => (
                    <button
                      key={method}
                      onClick={() => { setPaymentMethod(method); setPaypalError(null) }}
                      className={cn(
                        'py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-all',
                        paymentMethod === method
                          ? 'border-brand-purple bg-brand-purple/[0.04] text-brand-purple'
                          : 'border-border text-text-secondary hover:border-gray-300 hover:bg-gray-50/50'
                      )}
                    >
                      {method === 'mpesa' ? (
                        '📱 M-Pesa'
                      ) : (
                        <>
                          💳 PayPal
                          <span className="ml-1.5 text-xs bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full font-normal">
                            Coming soon
                          </span>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* M-Pesa phone */}
              {paymentMethod === 'mpesa' && !paymentInitiated && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-text-secondary/60 mb-2">
                    M-Pesa Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-text-secondary/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="0712 345 678"
                      className="form-input pl-10"
                      disabled={registering}
                    />
                  </div>
                  <p className="text-[11px] text-text-secondary/50 mt-1.5">Safaricom only (07XX or 01XX)</p>
                </div>
              )}

              {/* M-Pesa status */}
              {paymentMethod === 'mpesa' && paymentInitiated && (
                <div className="flex flex-col items-center text-center py-4 space-y-3">
                  {paymentStatus === 'pending' && (
                    <>
                      <div className="w-12 h-12 rounded-full bg-brand-purple/5 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-brand-purple" />
                      </div>
                      <div>
                        <p className="font-bold text-text-primary">Check your phone</p>
                        <p className="text-sm text-text-secondary mt-0.5">Enter your M-Pesa PIN to complete</p>
                      </div>
                    </>
                  )}
                  {paymentStatus === 'confirmed' && (
                    <>
                      <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-success" />
                      </div>
                      <p className="font-bold text-success">Payment confirmed!</p>
                    </>
                  )}
                  {paymentStatus === 'failed' && (
                    <>
                      <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center">
                        <XCircle className="w-6 h-6 text-error" />
                      </div>
                      <div>
                        <p className="font-bold text-error">Payment failed</p>
                        <p className="text-sm text-text-secondary mt-0.5">{paymentMessage}</p>
                      </div>
                      <button
                        onClick={() => { setPaymentInitiated(false); setPaymentStatus('idle'); setCheckoutRequestId(null) }}
                        className="flex items-center gap-1.5 text-sm text-brand-purple font-bold hover:underline"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Try again
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* PayPal */}
              {paymentMethod === 'paypal' && (
                <div className="rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">💳</span>
                  </div>
                  <h3 className="font-bold text-text-primary mb-1">PayPal Coming Soon</h3>
                  <p className="text-sm text-text-secondary max-w-xs mx-auto mb-4">
                    PayPal payments are not available yet. Please use M-Pesa to enter this gameweek.
                  </p>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mpesa')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand-purple text-white text-sm font-semibold rounded-lg hover:bg-opacity-90"
                  >
                    Switch to M-Pesa
                  </button>
                </div>
              )}

              {/* Terms */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="h-28 overflow-y-auto p-3.5 text-[12px] text-text-secondary bg-gray-50/60 leading-relaxed no-scrollbar">
                  {settings.terms_text || 'By proceeding, you agree to the FPL123 Terms & Conditions. Entry fees are paid for platform recognition. Any monetary rewards are at the sole discretion of the platform administrator.'}
                </div>
                <label className="flex items-center gap-3 px-3.5 py-3 cursor-pointer hover:bg-gray-50/50 border-t border-border transition-colors">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={e => setTermsAccepted(e.target.checked)}
                    className="w-4 h-4 accent-brand-purple rounded"
                  />
                  <span className="text-sm font-semibold text-text-primary">I agree to the Terms &amp; Conditions</span>
                </label>
              </div>

              {/* M-Pesa pay button */}
              {!paymentInitiated && paymentMethod === 'mpesa' && (
                <button
                  onClick={handleMpesaPay}
                  disabled={!phone || !termsAccepted || registering}
                  className="btn-accent w-full text-[1rem]"
                >
                  {registering
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                    : <><Zap className="w-4 h-4 fill-current" /> Pay {formatKES(settings.entry_fee)} via M-Pesa</>
                  }
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 4: Confirmation ── */}
        {step === 4 && pin && confirmedManager && (
          <ConfirmationScreen
            pin={pin}
            managerName={confirmedManager.name}
            fplTeamName={confirmedManager.team}
            gameweekNumber={confirmedManager.gw}
            deadline={settings.entry_deadline}
            groupsAllocated={false}
          />
        )}

      </main>

      <Footer platformName={settings.platform_name} />
    </div>
  )
}