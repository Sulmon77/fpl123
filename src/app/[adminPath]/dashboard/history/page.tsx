'use client'
// src/app/[adminPath]/dashboard/history/page.tsx

import { useState, useEffect } from 'react'
import { Save, Loader2, CheckCircle, History } from 'lucide-react'

export default function HistoryAdminPage() {
  const [visible, setVisible] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(d => {
      if (d.success) setVisible(d.data.history_visible ?? false)
    }).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history_visible: visible }),
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
        <h1 className="font-display font-bold text-2xl text-text-primary">History</h1>
        <p className="text-text-secondary mt-1">Control visibility of the GW history page</p>
      </div>

      <div className="card p-6 space-y-5">
        <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
          <div>
            <p className="font-semibold text-sm">Show History in Navigation</p>
            <p className="text-xs text-text-secondary mt-0.5">{visible ? 'Users can see past GW results' : 'History page is hidden'}</p>
          </div>
          <button
            onClick={() => setVisible(!visible)}
            className={`relative inline-flex w-12 h-6 rounded-full transition-colors ${visible ? 'bg-success' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${visible ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> :
           saved ? <><CheckCircle className="w-4 h-4" />Saved!</> :
           <><Save className="w-4 h-4" />Save</>}
        </button>
      </div>
    </div>
  )
}
