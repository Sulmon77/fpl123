'use client'
// src/app/[adminPath]/dashboard/announcements/page.tsx

import { useState, useEffect } from 'react'
import { Save, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import { AnnouncementBanner } from '@/components/shared/AnnouncementBanner'

export default function AnnouncementsPage() {
  const [text, setText] = useState('')
  const [visible, setVisible] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setText(d.data.announcement_text ?? '')
          setVisible(d.data.announcement_visible ?? false)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          announcement_text: text || null,
          announcement_visible: visible,
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

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-brand-purple" /></div>
  }

  return (
    <div className="p-6 sm:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-text-primary">Announcements</h1>
        <p className="text-text-secondary mt-1">Show a banner message at the top of the platform</p>
      </div>

      <div className="card p-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-1.5">
            Announcement Text
          </label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            placeholder="e.g. GW22 results are in! Check your standings now 🏆"
            className="form-input resize-none"
          />
        </div>

        <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
          <div>
            <p className="font-semibold text-text-primary text-sm">Show on Platform</p>
            <p className="text-xs text-text-secondary mt-0.5">
              {visible ? 'Banner is currently visible to all users' : 'Banner is hidden'}
            </p>
          </div>
          <button
            onClick={() => setVisible(!visible)}
            className={`relative inline-flex w-12 h-6 rounded-full transition-colors duration-200 ${
              visible ? 'bg-success' : 'bg-gray-300'
            }`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
              visible ? 'translate-x-7' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* Preview */}
        {text && (
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Preview</p>
            <div className="border border-border rounded-xl overflow-hidden">
              <AnnouncementBanner text={text} />
              <div className="p-4 bg-gray-50 text-xs text-text-secondary text-center">
                Homepage content would appear here
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
          ) : saved ? (
            <><CheckCircle className="w-4 h-4" /> Saved!</>
          ) : (
            <><Save className="w-4 h-4" /> Save Announcement</>
          )}
        </button>
      </div>
    </div>
  )
}
