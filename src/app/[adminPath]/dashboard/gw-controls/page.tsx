'use client'
// src/app/[adminPath]/dashboard/gw-controls/page.tsx

import { useState, useEffect } from 'react'
import { Save, RefreshCw, Loader2, CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import { formatKES, formatDeadline } from '@/lib/utils'

type GwStatus = 'upcoming' | 'ongoing' | 'ended' | 'edit'

interface Settings {
  gameweek_number: number
  entry_fee: number
  entry_deadline: string | null
  registration_open: boolean
  gameweek_ended: boolean
  gameweek_status: GwStatus
  giveaway_type: 'money' | 'shoutout' | 'other'
  giveaway_description: string | null
  winners_per_group: number
  payout_percentages: Record<string, number>
  standings_refresh_interval: number
}

export default function GwControlsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Local editable state
  const [gwNumber, setGwNumber] = useState(1)
  const [entryFee, setEntryFee] = useState(200)
  const [regOpen, setRegOpen] = useState(false)
  const [gwEnded, setGwEnded] = useState(false)
  const [gwStatus, setGwStatus] = useState<GwStatus>('upcoming')
  const [giveawayType, setGiveawayType] = useState<'money' | 'shoutout' | 'other'>('money')
  const [giveawayDesc, setGiveawayDesc] = useState('')
  const [winnersPerGroup, setWinnersPerGroup] = useState(2)
  const [payoutPcts, setPayoutPcts] = useState<Record<string, number>>({ '1': 60, '2': 30, platform: 10 })
  const [refreshInterval, setRefreshInterval] = useState(120)
  const [fetchingDeadline, setFetchingDeadline] = useState(false)
  const [manualDeadline, setManualDeadline] = useState('')
  const [savingDeadline, setSavingDeadline] = useState(false)
  const [deadlineSaved, setDeadlineSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const s = d.data
          setSettings(s)
          setGwNumber(s.gameweek_number)
          setEntryFee(s.entry_fee)
          setRegOpen(s.registration_open)
          setGwEnded(s.gameweek_ended ?? false)
          setGwStatus((s.gameweek_status as GwStatus) ?? 'upcoming')
          setGiveawayType(s.giveaway_type)
          setGiveawayDesc(s.giveaway_description ?? '')
          setWinnersPerGroup(s.winners_per_group)
          setPayoutPcts(s.payout_percentages ?? { '1': 60, '2': 30, platform: 10 })
          setRefreshInterval(s.standings_refresh_interval)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const totalPct = Object.values(payoutPcts).reduce((sum, v) => sum + v, 0)
  const pctValid = totalPct === 100

  const handleSave = async () => {
    if (!pctValid && giveawayType === 'money') {
      setError('Payout percentages must sum to exactly 100%')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameweek_number: gwNumber,
          entry_fee: entryFee,
          registration_open: regOpen,
          giveaway_type: giveawayType,
          giveaway_description: giveawayDesc || null,
          winners_per_group: winnersPerGroup,
          payout_percentages: payoutPcts,
          standings_refresh_interval: refreshInterval,
          gameweek_status: gwStatus,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        setError(data.error)
      }
    } catch {
      setError('Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  const handleSetStatus = async (newStatus: GwStatus) => {
    setError(null)
    const isEnded = newStatus === 'ended'
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameweek_status: newStatus,
          gameweek_ended: isEnded,
          ...(isEnded ? { registration_open: false } : {}),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setGwStatus(newStatus)
        setGwEnded(isEnded)
        if (isEnded) setRegOpen(false)
        setSettings(prev => prev ? { ...prev, gameweek_status: newStatus, gameweek_ended: isEnded } : prev)
      } else {
        setError(data.error)
      }
    } catch {
      setError('Failed to update gameweek status.')
    }
  }

  const fetchFplDeadline = async () => {
    setFetchingDeadline(true)
    try {
      const res = await fetch('/api/admin/fetch-deadline')
      const data = await res.json()
      if (data.success) {
        setSettings(prev => prev ? { ...prev, entry_deadline: data.data.deadline } : prev)
      }
    } catch {
      // ignore
    } finally {
      setFetchingDeadline(false)
    }
  }

  const saveManualDeadline = async () => {
    if (!manualDeadline) return
    setSavingDeadline(true)
    try {
      const isoDeadline = new Date(manualDeadline).toISOString()
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_deadline: isoDeadline }),
      })
      if ((await res.json()).success) {
        setSettings(prev => prev ? { ...prev, entry_deadline: isoDeadline } : prev)
        setDeadlineSaved(true)
        setManualDeadline('')
        setTimeout(() => setDeadlineSaved(false), 3000)
      }
    } finally {
      setSavingDeadline(false)
    }
  }

  const updatePayoutPct = (key: string, value: number) => {
    setPayoutPcts(prev => ({ ...prev, [key]: value }))
  }

  const addPayoutPosition = () => {
    const existing = Object.keys(payoutPcts).filter(k => k !== 'platform').map(Number).filter(Boolean)
    const next = (Math.max(0, ...existing) + 1).toString()
    setPayoutPcts(prev => ({ ...prev, [next]: 0 }))
  }

  const removePayoutPosition = (key: string) => {
    setPayoutPcts(prev => {
      const updated = { ...prev }
      delete updated[key]
      return updated
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-purple" />
      </div>
    )
  }

  const examplePot = entryFee * 32
  const platformCut = payoutPcts.platform ?? 0
  const distributable = Math.floor(examplePot * (1 - platformCut / 100))

  return (
    <div className="p-6 sm:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-text-primary">GW Controls</h1>
        <p className="text-text-secondary mt-1">Manage the current gameweek settings</p>
      </div>

      <div className="space-y-6">

        {/* ── Gameweek Status Card ── */}
        {(() => {
          const statuses: { value: GwStatus; label: string; emoji: string; desc: string; activeClass: string }[] = [
            {
              value: 'upcoming',
              label: 'Upcoming',
              emoji: '📅',
              desc: 'Registration open. No entries yet.',
              activeClass: 'border-brand-purple bg-brand-purple/5 text-brand-purple',
            },
            {
              value: 'ongoing',
              label: 'Ongoing',
              emoji: '⚽',
              desc: 'Deadline passed. Points are tracking.',
              activeClass: 'border-blue-500 bg-blue-50 text-blue-600',
            },
            {
              value: 'ended',
              label: 'Ended',
              emoji: '🏁',
              desc: 'GW finalised. Payouts section unlocked.',
              activeClass: 'border-success bg-success/5 text-success',
            },
            {
              value: 'edit',
              label: 'Edit Mode',
              emoji: '✏️',
              desc: 'Admin can freely edit GW settings.',
              activeClass: 'border-warning bg-warning/5 text-warning',
            },
          ]

          const hintMap: Record<GwStatus, { color: string; text: string }> = {
            upcoming: { color: 'bg-brand-purple/5 border-brand-purple/20 text-brand-purple', text: 'Registration is open. Managers can enter.' },
            ongoing: { color: 'bg-blue-50 border-blue-200 text-blue-700', text: 'Deadline has passed. Points are being tracked automatically.' },
            ended: { color: 'bg-success/5 border-success/20 text-success', text: 'Gameweek is finalised. Go to Payouts in the sidebar to preview and trigger prize payouts.' },
            edit: { color: 'bg-warning/5 border-warning/20 text-warning', text: 'Edit mode is on. You can freely change GW settings without affecting managers.' },
          }

          const hint = hintMap[gwStatus]

          return (
            <div className="card p-6 space-y-4">
              <div>
                <h2 className="font-bold text-text-primary">Gameweek Status</h2>
                <p className="text-sm text-text-secondary mt-1">Set the current phase of this gameweek.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {statuses.map(s => (
                  <button
                    key={s.value}
                    onClick={() => handleSetStatus(s.value)}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                      gwStatus === s.value
                        ? s.activeClass
                        : 'border-border text-text-secondary hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xl">{s.emoji}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>

              <div className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 ${hint.color}`}>
                <p className="text-sm font-medium">{hint.text}</p>
              </div>
            </div>
          )
        })()}

        {/* GW Info */}
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-text-primary">Gameweek Info</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-text-secondary mb-1.5">
                Gameweek Number
              </label>
              <input
                type="number"
                value={gwNumber}
                onChange={e => setGwNumber(parseInt(e.target.value))}
                min={1}
                max={38}
                className="form-input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-secondary mb-1.5">
                Entry Fee (KES)
              </label>
              <input
                type="number"
                value={entryFee}
                onChange={e => setEntryFee(parseInt(e.target.value))}
                min={1}
                className="form-input"
              />
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm font-semibold text-text-secondary mb-1.5">
              GW Deadline
            </label>

            {/* Current value display */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-border flex-1">
                <Clock className="w-4 h-4 text-text-secondary" />
                <span className="text-sm text-text-primary">
                  {settings?.entry_deadline
                    ? formatDeadline(settings.entry_deadline)
                    : 'No deadline set'}
                </span>
              </div>
              <button
                onClick={fetchFplDeadline}
                disabled={fetchingDeadline}
                className="flex items-center gap-1.5 px-3 py-2.5 bg-brand-purple/10 text-brand-purple text-sm font-semibold rounded-lg hover:bg-brand-purple/20 transition-all disabled:opacity-50 whitespace-nowrap"
              >
                {fetchingDeadline ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Fetch
              </button>
            </div>

            {/* Manual deadline override */}
            <div>
              <p className="text-xs text-text-secondary mb-1.5">Or set manually:</p>
              <div className="flex gap-2">
                <input
                  type="datetime-local"
                  value={manualDeadline}
                  onChange={e => setManualDeadline(e.target.value)}
                  className="form-input flex-1"
                />
                <button
                  onClick={saveManualDeadline}
                  disabled={!manualDeadline || savingDeadline}
                  className="flex items-center gap-1.5 px-3 py-2.5 bg-brand-purple/10 text-brand-purple text-sm font-semibold rounded-lg hover:bg-brand-purple/20 transition-all disabled:opacity-50 whitespace-nowrap"
                >
                  {savingDeadline ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {deadlineSaved ? 'Saved!' : 'Set'}
                </button>
              </div>
              <p className="text-xs text-text-secondary mt-1.5">Time is in your local timezone</p>
            </div>
          </div>

          {/* Registration toggle */}
          <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
            <div>
              <p className="font-semibold text-text-primary text-sm">Registration Status</p>
              <p className="text-xs text-text-secondary mt-0.5">
                {regOpen ? 'Managers can currently enter' : 'Entry is closed'}
              </p>
            </div>
            <button
              onClick={() => setRegOpen(!regOpen)}
              className={`relative inline-flex w-12 h-6 rounded-full transition-colors duration-200 ${
                regOpen ? 'bg-success' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                  regOpen ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-secondary mb-1.5">
              Standings Auto-Refresh Interval (minutes)
            </label>
            <input
              type="number"
              value={refreshInterval}
              onChange={e => setRefreshInterval(parseInt(e.target.value))}
              min={5}
              max={1440}
              className="form-input w-32"
            />
          </div>
        </div>

        {/* Giveaway */}
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-text-primary">Giveaway Type</h2>

          <div className="grid grid-cols-3 gap-2">
            {(['money', 'shoutout', 'other'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setGiveawayType(type)}
                className={`py-2.5 px-3 rounded-lg border-2 text-sm font-semibold capitalize transition-all ${
                  giveawayType === type
                    ? 'border-brand-purple bg-brand-purple/5 text-brand-purple'
                    : 'border-border text-text-secondary hover:border-gray-300'
                }`}
              >
                {type === 'money' ? '💰 Money' : type === 'shoutout' ? '📣 Shoutout' : '🎁 Other'}
              </button>
            ))}
          </div>

          {giveawayType !== 'money' && (
            <div>
              <label className="block text-sm font-semibold text-text-secondary mb-1.5">
                Giveaway Description
              </label>
              <textarea
                value={giveawayDesc}
                onChange={e => setGiveawayDesc(e.target.value)}
                rows={3}
                placeholder="Describe what winners receive..."
                className="form-input resize-none"
              />
            </div>
          )}
        </div>

        {/* Payout percentages (money giveaways only) */}
        {giveawayType === 'money' && (
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-text-primary">Payout Percentages</h2>
              <div className={`text-sm font-bold px-2.5 py-1 rounded-full ${
                pctValid ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
              }`}>
                Total: {totalPct}%
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-secondary mb-1.5">
                Winners Per Group
              </label>
              <input
                type="number"
                value={winnersPerGroup}
                onChange={e => setWinnersPerGroup(Math.max(1, Math.min(10, parseInt(e.target.value))))}
                min={1}
                max={10}
                className="form-input w-24"
              />
            </div>

            {!pctValid && (
              <div className="flex items-center gap-2 bg-error/5 border border-error/20 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 text-error" />
                <p className="text-sm text-error">Percentages must sum to exactly 100%</p>
              </div>
            )}

            <div className="space-y-2">
              {Object.entries(payoutPcts)
                .filter(([k]) => k !== 'platform')
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([pos, pct]) => {
                  const amount = Math.floor(distributable * (pct / 100))
                  return (
                    <div key={pos} className="flex items-center gap-3">
                      <div className="w-12 text-center font-bold text-sm text-text-secondary">
                        {pos === '1' ? '🥇' : pos === '2' ? '🥈' : pos === '3' ? '🥉' : `#${pos}`}
                      </div>
                      <div className="relative flex-1">
                        <input
                          type="number"
                          value={pct}
                          onChange={e => updatePayoutPct(pos, Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                          className="form-input pr-8"
                          min={0}
                          max={100}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">%</span>
                      </div>
                      <div className="w-28 text-sm text-text-secondary text-right">
                        ≈ {formatKES(amount)}
                      </div>
                      <button
                        onClick={() => removePayoutPosition(pos)}
                        className="text-text-secondary hover:text-error text-lg font-bold transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  )
                })}

              {/* Platform cut */}
              <div className="flex items-center gap-3 pt-2 border-t border-border">
                <div className="w-12 text-center text-sm font-bold text-text-secondary">🏢</div>
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={payoutPcts.platform ?? 0}
                    onChange={e => updatePayoutPct('platform', Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                    className="form-input pr-8"
                    min={0}
                    max={100}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">%</span>
                </div>
                <div className="w-28 text-sm text-text-secondary text-right">
                  Platform cut
                </div>
                <div className="w-6" />
              </div>
            </div>

            <button
              onClick={addPayoutPosition}
              className="text-sm text-brand-purple font-semibold hover:underline"
            >
              + Add position
            </button>

            <p className="text-xs text-text-secondary">
              * Example based on full group of 32. Actual amounts scale with group size.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-error/5 border border-error/20 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 text-error" />
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving || (!pctValid && giveawayType === 'money')}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
          ) : saved ? (
            <><CheckCircle className="w-4 h-4" /> Saved!</>
          ) : (
            <><Save className="w-4 h-4" /> Save GW Settings</>
          )}
        </button>
      </div>

    </div>
  )
}