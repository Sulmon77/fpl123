'use client'
// src/app/[adminPath]/dashboard/rules/page.tsx

import { useState, useEffect } from 'react'
import { Plus, Trash2, GripVertical, Save, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'

interface Rule {
  id?: string
  title: string
  body: string
}

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/rules')
      .then(r => r.json())
      .then(d => { if (d.success) setRules(d.data.map((r: Rule) => ({ id: r.id, title: r.title, body: r.body }))) })
      .finally(() => setLoading(false))
  }, [])

  const addRule = () => setRules(prev => [...prev, { title: '', body: '' }])

  const updateRule = (index: number, field: 'title' | 'body', value: string) => {
    setRules(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  const removeRule = (index: number) => setRules(prev => prev.filter((_, i) => i !== index))

  const moveRule = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= rules.length) return
    setRules(prev => {
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const handleSave = async () => {
    const invalid = rules.some(r => !r.title.trim() || !r.body.trim())
    if (invalid) { setError('Each rule must have a title and description.'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/admin/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'replace_all', rules }),
      })
      const data = await res.json()
      if (data.success) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
        // Reload to get IDs
        const fresh = await fetch('/api/admin/rules').then(r => r.json())
        if (fresh.success) setRules(fresh.data.map((r: Rule) => ({ id: r.id, title: r.title, body: r.body })))
      } else {
        setError(data.error)
      }
    } catch { setError('Failed to save rules.') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-brand-purple" /></div>

  return (
    <div className="p-6 sm:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-text-primary">Platform Rules</h1>
        <p className="text-text-secondary mt-1">
          Write the rules shown to managers on the public Rules page. Each rule has a title and a description.
          The order here is the order displayed to users.
        </p>
      </div>

      <div className="space-y-4 mb-6">
        {rules.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-text-secondary text-sm">No rules yet. Click &ldquo;Add Rule&rdquo; to create your first rule.</p>
          </div>
        )}

        {rules.map((rule, index) => (
          <div key={index} className="card p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveRule(index, 'up')}
                    disabled={index === 0}
                    className="p-0.5 text-text-secondary/40 hover:text-text-secondary disabled:opacity-20 transition-colors"
                    title="Move up"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M18 15l-6-6-6 6" />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveRule(index, 'down')}
                    disabled={index === rules.length - 1}
                    className="p-0.5 text-text-secondary/40 hover:text-text-secondary disabled:opacity-20 transition-colors"
                    title="Move down"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                </div>
                <span className="w-6 h-6 rounded-full bg-brand-purple/10 text-brand-purple text-xs font-bold flex items-center justify-center">
                  {index + 1}
                </span>
              </div>
              <button onClick={() => removeRule(index)} className="p-1.5 text-text-secondary/40 hover:text-error transition-colors rounded-lg hover:bg-error/5" title="Remove rule">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-text-secondary/60 mb-1.5">Rule Title</label>
              <input
                type="text"
                value={rule.title}
                onChange={e => updateRule(index, 'title', e.target.value)}
                placeholder="e.g. Entry Rules"
                className="form-input"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-text-secondary/60 mb-1.5">Description</label>
              <textarea
                value={rule.body}
                onChange={e => updateRule(index, 'body', e.target.value)}
                placeholder="Explain this rule clearly..."
                rows={3}
                className="form-input resize-none"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={addRule}
          className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-brand-purple/30 text-brand-purple text-sm font-semibold rounded-xl hover:border-brand-purple/60 hover:bg-brand-purple/5 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Rule
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Rules</>}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-error/5 border border-error/20 rounded-lg p-3 mt-4">
          <AlertTriangle className="w-4 h-4 text-error" />
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {rules.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-border">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Preview</p>
          <div className="space-y-3">
            {rules.map((rule, i) => (
              <div key={i} className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-brand-purple text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                <div>
                  <p className="font-semibold text-text-primary text-sm">{rule.title || 'Untitled rule'}</p>
                  <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{rule.body || 'No description.'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}