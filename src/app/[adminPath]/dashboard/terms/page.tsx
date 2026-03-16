'use client'
// src/app/[adminPath]/dashboard/terms/page.tsx

import { useState, useEffect } from 'react'
import { Save, Loader2, CheckCircle } from 'lucide-react'

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

export default function TermsAdminPage() {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => {
        if (d.success) setText(d.data.terms_text || DEFAULT_TERMS)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terms_text: text }),
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
    <div className="p-6 sm:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-text-primary">Terms &amp; Conditions</h1>
        <p className="text-text-secondary mt-1">Edit the T&amp;C text shown to users during registration</p>
      </div>

      <div className="card p-6 space-y-4">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={20}
          className="form-input resize-none font-mono text-sm"
          placeholder="Enter terms and conditions..."
        />

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> :
             saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> :
             <><Save className="w-4 h-4" /> Save Terms</>}
          </button>

          <button
            onClick={() => setText(DEFAULT_TERMS)}
            className="text-sm text-text-secondary hover:text-text-primary font-medium"
          >
            Reset to defaults
          </button>
        </div>
      </div>
    </div>
  )
}
