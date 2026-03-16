'use client'
// src/app/[adminPath]/dashboard/hall-of-fame/page.tsx

import { useState, useEffect } from 'react'
import { Trophy, Save, Loader2, CheckCircle } from 'lucide-react'

export default function HallOfFameAdminPage() {
  const [enabled, setEnabled] = useState(false)
  const [price, setPrice] = useState(50)
  const [audience, setAudience] = useState<'all' | 'registered'>('registered')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(d => {
      if (d.success) {
        setEnabled(d.data.hall_of_fame_enabled ?? false)
        setPrice(d.data.hall_of_fame_price ?? 50)
        setAudience(d.data.hall_of_fame_audience ?? 'registered')
      }
    }).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hall_of_fame_enabled: enabled,
          hall_of_fame_price: price,
          hall_of_fame_audience: audience,
        }),
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
        <h1 className="font-display font-bold text-2xl text-text-primary">Hall of Fame</h1>
        <p className="text-text-secondary mt-1">Control visibility and access pricing</p>
      </div>

      <div className="card p-6 space-y-5">
        <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
          <div>
            <p className="font-semibold text-sm">Show in Navigation</p>
            <p className="text-xs text-text-secondary mt-0.5">{enabled ? 'Visible to users' : 'Hidden'}</p>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-success' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-1.5">Access Price (KES)</label>
          <input type="number" value={price} onChange={e => setPrice(parseInt(e.target.value))} min={0} className="form-input w-32" />
          <p className="text-xs text-text-secondary mt-1">Set to 0 for free access</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-2">Who Can View</label>
          <div className="grid grid-cols-2 gap-2">
            {(['all', 'registered'] as const).map(a => (
              <button
                key={a}
                onClick={() => setAudience(a)}
                className={`py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all ${audience === a ? 'border-brand-purple bg-brand-purple/5 text-brand-purple' : 'border-border text-text-secondary'}`}
              >
                {a === 'all' ? '🌍 Everyone' : '🔐 Registered Only'}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> :
           saved ? <><CheckCircle className="w-4 h-4" />Saved!</> :
           <><Save className="w-4 h-4" />Save Settings</>}
        </button>
      </div>
    </div>
  )
}
