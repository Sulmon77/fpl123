'use client'
// src/app/[adminPath]/dashboard/settings/page.tsx

import { useState, useEffect } from 'react'
import { Save, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'

export default function PlatformSettingsPage() {
  const [platformName, setPlatformName] = useState('FPL123')
  const [leagueId, setLeagueId] = useState('')
  const [leagueJoinUrl, setLeagueJoinUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newPassword, setNewPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(d => {
      if (d.success) {
        setPlatformName(d.data.platform_name ?? 'FPL123')
      }
    }).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform_name: platformName }),
      })
      if ((await res.json()).success) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-brand-purple" /></div>

  return (
    <div className="p-6 sm:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-text-primary">Platform Settings</h1>
        <p className="text-text-secondary mt-1">General platform configuration</p>
      </div>

      <div className="space-y-6">
        {/* Platform name */}
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-text-primary">Platform Identity</h2>
          <div>
            <label className="block text-sm font-semibold text-text-secondary mb-1.5">Platform Name</label>
            <input
              type="text"
              value={platformName}
              onChange={e => setPlatformName(e.target.value)}
              className="form-input"
              placeholder="FPL123"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-text-secondary mb-1.5">FPL League ID</label>
            <input
              type="text"
              value={leagueId}
              onChange={e => setLeagueId(e.target.value)}
              className="form-input"
              placeholder="From env: FPL_LEAGUE_ID"
            />
            <p className="text-xs text-text-secondary mt-1">Override the FPL_LEAGUE_ID env variable here</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-text-secondary mb-1.5">League Join URL</label>
            <input
              type="text"
              value={leagueJoinUrl}
              onChange={e => setLeagueJoinUrl(e.target.value)}
              className="form-input"
              placeholder="https://fantasy.premierleague.com/leagues/auto-join/..."
            />
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> :
             saved ? <><CheckCircle className="w-4 h-4" />Saved!</> :
             <><Save className="w-4 h-4" />Save Settings</>}
          </button>
        </div>

        {/* Contact info note */}
        <div className="card p-6">
          <h2 className="font-bold text-text-primary mb-3">Contact Information</h2>
          <p className="text-sm text-text-secondary">
            Contact information (WhatsApp, Instagram, TikTok, Email, Facebook, X) is configured
            via environment variables in your Vercel dashboard:
          </p>
          <div className="mt-3 space-y-1 font-mono text-xs bg-gray-50 rounded-lg p-3">
            {['CONTACT_WHATSAPP', 'CONTACT_INSTAGRAM', 'CONTACT_TIKTOK', 'CONTACT_EMAIL', 'CONTACT_FACEBOOK', 'CONTACT_X'].map(v => (
              <div key={v} className="text-text-secondary">{v}=</div>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div className="card p-6 border-error/30">
          <h2 className="font-bold text-error mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Danger Zone
          </h2>
          <p className="text-sm text-text-secondary mb-4">
            These actions are irreversible. Use with extreme caution.
          </p>
          <button
            onClick={() => {
              const c1 = confirm('Are you sure you want to reset all current GW data?')
              const c2 = c1 && confirm('This will delete ALL entries, groups, and payments for the current GW. This CANNOT be undone.')
              const c3 = c2 && confirm('Final confirmation: Delete all current GW data?')
              if (c3) {
                fetch('/api/admin/reset-gw', { method: 'POST' }).then(() => window.location.reload())
              }
            }}
            className="px-4 py-2.5 border-2 border-error text-error text-sm font-semibold rounded-lg hover:bg-error hover:text-white transition-all"
          >
            Reset Current GW Data
          </button>
        </div>
      </div>
    </div>
  )
}
