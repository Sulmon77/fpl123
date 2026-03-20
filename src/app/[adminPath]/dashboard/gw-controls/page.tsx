'use client'
// src/app/[adminPath]/dashboard/gw-controls/page.tsx

import { useState, useEffect } from 'react'
import { Save, RefreshCw, Loader2, CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import { formatKES, formatDeadline } from '@/lib/utils'
import type { TierSettings } from '@/types'

type GwStatus = 'upcoming' | 'ongoing' | 'ended' | 'edit'

interface Settings {
  gameweek_number: number
  entry_deadline: string | null
  registration_open: boolean
  gameweek_ended: boolean
  gameweek_status: GwStatus
  giveaway_type: 'money' | 'shoutout' | 'other'
  giveaway_description: string | null
  standings_refresh_interval: number
  casual_settings: TierSettings
  elite_settings: TierSettings
}

const DEFAULT_CASUAL: TierSettings = {
  entry_fee: 200,
  max_group_size: 16,
  winners_per_group: 1,
  payout_percentages: { '1': 90, platform: 10 },
  enabled: true,
}

const DEFAULT_ELITE: TierSettings = {
  entry_fee: 1000,
  max_group_size: 8,
  winners_per_group: 2,
  payout_percentages: { '1': 60, '2': 30, platform: 10 },
  enabled: true,
}

function TierPanel({
  label,
  emoji,
  settings,
  onChange,
}: {
  label: string
  emoji: string
  settings: TierSettings
  onChange: (s: TierSettings) => void
}) {
  const totalPct = Object.values(settings.payout_percentages).reduce((a, b) => a + b, 0)
  const pctValid = totalPct === 100
  const platformCut = settings.payout_percentages['platform'] ?? 0
  const examplePot = settings.entry_fee * settings.max_group_size
  const distributable = Math.floor(examplePot * (1 - platformCut / 100))

  const updatePct = (key: string, val: number) => {
    onChange({ ...settings, payout_percentages: { ...settings.payout_percentages, [key]: val } })
  }
  const addPosition = () => {
    const existing = Object.keys(settings.payout_percentages).filter(k => k !== 'platform').map(Number).filter(Boolean)
    const next = (Math.max(0, ...existing) + 1).toString()
    onChange({ ...settings, payout_percentages: { ...settings.payout_percentages, [next]: 0 } })
  }
  const removePosition = (key: string) => {
    const updated = { ...settings.payout_percentages }
    delete updated[key]
    onChange({ ...settings, payout_percentages: updated })
  }

  return (
    <div className="card p-6 space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          <h2 className="font-bold text-text-primary">{label}</h2>
        </div>
        {/* Enable/disable toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary font-medium">
            {settings.enabled ? 'Enabled' : 'Disabled'}
          </span>
          <button
            onClick={() => onChange({ ...settings, enabled: !settings.enabled })}
            className={`relative inline-flex w-10 h-5 rounded-full transition-colors ${settings.enabled ? 'bg-success' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>

      {!settings.enabled && (
        <div className="flex items-center gap-2 bg-warning/5 border border-warning/20 rounded-lg p-3">
          <AlertTriangle className="w-4 h-4 text-warning" />
          <p className="text-sm text-warning">This tier is disabled — managers cannot enter.</p>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-1.5">Entry Fee (KES)</label>
          <input
            type="number"
            value={settings.entry_fee}
            onChange={e => onChange({ ...settings, entry_fee: parseInt(e.target.value) || 0 })}
            min={1}
            className="form-input"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-1.5">Max Group Size</label>
          <input
            type="number"
            value={settings.max_group_size}
            onChange={e => onChange({ ...settings, max_group_size: parseInt(e.target.value) || 1 })}
            min={2}
            max={64}
            className="form-input"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-1.5">Winners Per Group</label>
          <input
            type="number"
            value={settings.winners_per_group}
            onChange={e => onChange({ ...settings, winners_per_group: Math.max(1, parseInt(e.target.value) || 1) })}
            min={1}
            max={10}
            className="form-input"
          />
        </div>
      </div>

      {/* Payout percentages */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-text-secondary">Payout Percentages</p>
          <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${pctValid ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
            Total: {totalPct}%
          </div>
        </div>

        {!pctValid && (
          <div className="flex items-center gap-2 bg-error/5 border border-error/20 rounded-lg p-2.5">
            <AlertTriangle className="w-3.5 h-3.5 text-error" />
            <p className="text-xs text-error">Must sum to exactly 100%</p>
          </div>
        )}

        <div className="space-y-2">
          {Object.entries(settings.payout_percentages)
            .filter(([k]) => k !== 'platform')
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([pos, pct]) => {
              const amount = Math.floor(distributable * (Number(pct) / 100))
              return (
                <div key={pos} className="flex items-center gap-2">
                  <div className="w-8 text-center text-sm font-bold text-text-secondary">
                    {pos === '1' ? '🥇' : pos === '2' ? '🥈' : pos === '3' ? '🥉' : `#${pos}`}
                  </div>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      value={pct}
                      onChange={e => updatePct(pos, Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                      className="form-input pr-7 text-sm"
                      min={0} max={100}
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary text-xs">%</span>
                  </div>
                  <div className="w-24 text-xs text-text-secondary text-right">≈ {formatKES(amount)}</div>
                  <button onClick={() => removePosition(pos)} className="text-text-secondary hover:text-error text-base font-bold transition-colors">×</button>
                </div>
              )
            })}

          {/* Platform cut */}
          <div className="flex items-center gap-2 pt-1.5 border-t border-border">
            <div className="w-8 text-center text-sm">🏢</div>
            <div className="relative flex-1">
              <input
                type="number"
                value={settings.payout_percentages['platform'] ?? 0}
                onChange={e => updatePct('platform', Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                className="form-input pr-7 text-sm"
                min={0} max={100}
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary text-xs">%</span>
            </div>
            <div className="w-24 text-xs text-text-secondary text-right">Platform cut</div>
            <div className="w-4" />
          </div>
        </div>

        <button onClick={addPosition} className="text-xs text-brand-purple font-semibold hover:underline">
          + Add position
        </button>
        <p className="text-xs text-text-secondary">
          * Example based on full group of {settings.max_group_size}. Actual amounts scale with group size.
        </p>
      </div>
    </div>
  )
}

export default function GwControlsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [gwNumber, setGwNumber] = useState(1)
  const [regOpen, setRegOpen] = useState(false)
  const [gwStatus, setGwStatus] = useState<GwStatus>('upcoming')
  const [giveawayType, setGiveawayType] = useState<'money' | 'shoutout' | 'other'>('money')
  const [giveawayDesc, setGiveawayDesc] = useState('')
  const [refreshInterval, setRefreshInterval] = useState(120)
  const [fetchingDeadline, setFetchingDeadline] = useState(false)
  const [manualDeadline, setManualDeadline] = useState('')
  const [savingDeadline, setSavingDeadline] = useState(false)
  const [deadlineSaved, setDeadlineSaved] = useState(false)

  const [casualSettings, setCasualSettings] = useState<TierSettings>(DEFAULT_CASUAL)
  const [eliteSettings, setEliteSettings] = useState<TierSettings>(DEFAULT_ELITE)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const s = d.data
          setSettings(s)
          setGwNumber(s.gameweek_number)
          setRegOpen(s.registration_open)
          setGwStatus(s.gameweek_status ?? 'upcoming')
          setGiveawayType(s.giveaway_type)
          setGiveawayDesc(s.giveaway_description ?? '')
          setRefreshInterval(s.standings_refresh_interval)
          setCasualSettings(s.casual_settings ?? DEFAULT_CASUAL)
          setEliteSettings(s.elite_settings ?? DEFAULT_ELITE)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const casualPctValid = Object.values(casualSettings.payout_percentages).reduce((a, b) => a + b, 0) === 100
  const elitePctValid = Object.values(eliteSettings.payout_percentages).reduce((a, b) => a + b, 0) === 100

  const handleSave = async () => {
    if (!casualPctValid || !elitePctValid) {
      setError('Payout percentages for both tiers must sum to exactly 100%')
      return
    }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameweek_number: gwNumber,
          registration_open: regOpen,
          giveaway_type: giveawayType,
          giveaway_description: giveawayDesc || null,
          standings_refresh_interval: refreshInterval,
          gameweek_status: gwStatus,
          casual_settings: casualSettings,
          elite_settings: eliteSettings,
        }),
      })
      const data = await res.json()
      if (data.success) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
      else setError(data.error)
    } catch { setError('Failed to save settings.') }
    finally { setSaving(false) }
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
        if (isEnded) setRegOpen(false)
      } else setError(data.error)
    } catch { setError('Failed to update status.') }
  }

  const fetchFplDeadline = async () => {
    setFetchingDeadline(true)
    try {
      const res = await fetch('/api/admin/fetch-deadline')
      const data = await res.json()
      if (data.success) setSettings(prev => prev ? { ...prev, entry_deadline: data.data.deadline } : prev)
    } finally { setFetchingDeadline(false) }
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
        setDeadlineSaved(true); setManualDeadline('')
        setTimeout(() => setDeadlineSaved(false), 3000)
      }
    } finally { setSavingDeadline(false) }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-brand-purple" /></div>
  }

  const statuses: { value: GwStatus; label: string; emoji: string; activeClass: string }[] = [
    { value: 'upcoming', label: 'Upcoming', emoji: '📅', activeClass: 'border-brand-purple bg-brand-purple/5 text-brand-purple' },
    { value: 'ongoing', label: 'Ongoing', emoji: '⚽', activeClass: 'border-blue-500 bg-blue-50 text-blue-600' },
    { value: 'ended', label: 'Ended', emoji: '🏁', activeClass: 'border-success bg-success/5 text-success' },
    { value: 'edit', label: 'Edit Mode', emoji: '✏️', activeClass: 'border-warning bg-warning/5 text-warning' },
  ]

  const hintMap: Record<GwStatus, { color: string; text: string }> = {
    upcoming: { color: 'bg-brand-purple/5 border-brand-purple/20 text-brand-purple', text: 'Registration is open. Managers can enter.' },
    ongoing: { color: 'bg-blue-50 border-blue-200 text-blue-700', text: 'Deadline has passed. Points are being tracked automatically.' },
    ended: { color: 'bg-success/5 border-success/20 text-success', text: 'Gameweek is finalised. Go to Payouts to preview and trigger prize payouts.' },
    edit: { color: 'bg-warning/5 border-warning/20 text-warning', text: 'Edit mode is on. You can freely change GW settings.' },
  }

  return (
    <div className="p-6 sm:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-text-primary">GW Controls</h1>
        <p className="text-text-secondary mt-1">Manage the current gameweek settings</p>
      </div>

      <div className="space-y-6">

        {/* Gameweek Status */}
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
                className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-sm font-semibold transition-all ${gwStatus === s.value ? s.activeClass : 'border-border text-text-secondary hover:border-gray-300 hover:bg-gray-50'}`}
              >
                <span className="text-xl">{s.emoji}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
          <div className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 ${hintMap[gwStatus].color}`}>
            <p className="text-sm font-medium">{hintMap[gwStatus].text}</p>
          </div>
        </div>

        {/* GW Info */}
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-text-primary">Gameweek Info</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-text-secondary mb-1.5">Gameweek Number</label>
              <input type="number" value={gwNumber} onChange={e => setGwNumber(parseInt(e.target.value))} min={1} max={38} className="form-input" />
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm font-semibold text-text-secondary mb-1.5">GW Deadline</label>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-border flex-1">
                <Clock className="w-4 h-4 text-text-secondary" />
                <span className="text-sm text-text-primary">
                  {settings?.entry_deadline ? formatDeadline(settings.entry_deadline) : 'No deadline set'}
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
            <div>
              <p className="text-xs text-text-secondary mb-1.5">Or set manually:</p>
              <div className="flex gap-2">
                <input type="datetime-local" value={manualDeadline} onChange={e => setManualDeadline(e.target.value)} className="form-input flex-1" />
                <button
                  onClick={saveManualDeadline}
                  disabled={!manualDeadline || savingDeadline}
                  className="flex items-center gap-1.5 px-3 py-2.5 bg-brand-purple/10 text-brand-purple text-sm font-semibold rounded-lg hover:bg-brand-purple/20 disabled:opacity-50 whitespace-nowrap"
                >
                  {savingDeadline ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {deadlineSaved ? 'Saved!' : 'Set'}
                </button>
              </div>
            </div>
          </div>

          {/* Registration toggle */}
          <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
            <div>
              <p className="font-semibold text-text-primary text-sm">Registration Status</p>
              <p className="text-xs text-text-secondary mt-0.5">{regOpen ? 'Open — managers can enter' : 'Closed'}</p>
            </div>
            <button
              onClick={() => setRegOpen(!regOpen)}
              className={`relative inline-flex w-12 h-6 rounded-full transition-colors duration-200 ${regOpen ? 'bg-success' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${regOpen ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-secondary mb-1.5">Standings Auto-Refresh (minutes)</label>
            <input type="number" value={refreshInterval} onChange={e => setRefreshInterval(parseInt(e.target.value))} min={5} max={1440} className="form-input w-32" />
          </div>
        </div>

        {/* Giveaway Type */}
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-text-primary">Giveaway Type</h2>
          <div className="grid grid-cols-3 gap-2">
            {(['money', 'shoutout', 'other'] as const).map(type => (
              <button
                key={type}
                onClick={() => setGiveawayType(type)}
                className={`py-2.5 px-3 rounded-lg border-2 text-sm font-semibold capitalize transition-all ${giveawayType === type ? 'border-brand-purple bg-brand-purple/5 text-brand-purple' : 'border-border text-text-secondary hover:border-gray-300'}`}
              >
                {type === 'money' ? '💰 Money' : type === 'shoutout' ? '📣 Shoutout' : '🎁 Other'}
              </button>
            ))}
          </div>
          {giveawayType !== 'money' && (
            <div>
              <label className="block text-sm font-semibold text-text-secondary mb-1.5">Giveaway Description</label>
              <textarea value={giveawayDesc} onChange={e => setGiveawayDesc(e.target.value)} rows={3} placeholder="Describe what winners receive..." className="form-input resize-none" />
            </div>
          )}
        </div>

        {/* Casual Tier */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary/50">Tier Settings</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <TierPanel
            label="Casual Managers"
            emoji="👥"
            settings={casualSettings}
            onChange={setCasualSettings}
          />
        </div>

        {/* Elite Tier */}
        <TierPanel
          label="Elite Managers"
          emoji="🏆"
          settings={eliteSettings}
          onChange={setEliteSettings}
        />

        {error && (
          <div className="flex items-center gap-2 bg-error/5 border border-error/20 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 text-error" />
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !casualPctValid || !elitePctValid}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save GW Settings</>}
        </button>
      </div>
    </div>
  )
}