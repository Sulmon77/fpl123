'use client'
// src/app/[adminPath]/dashboard/blacklist/page.tsx

import { useState, useEffect } from 'react'
import { Ban, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { timeAgo } from '@/lib/utils'

interface BlacklistEntry {
  id: string
  type: 'fpl_id' | 'phone' | 'paypal_email'
  value: string
  reason: string | null
  added_at: string
  added_by: string
}

export default function BlacklistPage() {
  const [entries, setEntries] = useState<BlacklistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [addType, setAddType] = useState<'fpl_id' | 'phone' | 'paypal_email'>('fpl_id')
  const [addValue, setAddValue] = useState('')
  const [addReason, setAddReason] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchBlacklist = async () => {
    try {
      const res = await fetch('/api/admin/blacklist')
      const data = await res.json()
      if (data.success) setEntries(data.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchBlacklist() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addValue.trim()) return

    setAdding(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: addType, value: addValue.trim(), reason: addReason.trim() || null }),
      })
      const data = await res.json()

      if (data.success) {
        setAddValue('')
        setAddReason('')
        await fetchBlacklist()
      } else {
        setError(data.error)
      }
    } catch {
      setError('Failed to add to blacklist.')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (id: string) => {
    try {
      const res = await fetch('/api/admin/blacklist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if ((await res.json()).success) await fetchBlacklist()
    } catch (e) {
      console.error(e)
    }
  }

  const filtered = entries.filter(e =>
    !searchQuery ||
    e.value.includes(searchQuery) ||
    e.reason?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-purple" />
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-text-primary">Blacklist</h1>
        <p className="text-text-secondary mt-1">Block FPL IDs, phone numbers, or PayPal emails from registering</p>
      </div>

      {/* Add form */}
      <div className="card p-6 mb-6">
        <h2 className="font-bold text-text-primary mb-4">Add to Blacklist</h2>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            {(['fpl_id', 'phone', 'paypal_email'] as const).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setAddType(type)}
                className={`py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  addType === type
                    ? 'border-brand-purple bg-brand-purple/5 text-brand-purple'
                    : 'border-border text-text-secondary hover:border-gray-300'
                }`}
              >
                {type === 'fpl_id' ? 'FPL ID' : type === 'phone' ? 'Phone' : 'PayPal Email'}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={addValue}
            onChange={e => setAddValue(e.target.value)}
            placeholder={addType === 'fpl_id' ? 'e.g. 1234567' : addType === 'phone' ? 'e.g. 254712345678' : 'email@example.com'}
            className="form-input"
            required
          />

          <input
            type="text"
            value={addReason}
            onChange={e => setAddReason(e.target.value)}
            placeholder="Reason (optional)"
            className="form-input"
          />

          {error && (
            <div className="flex items-center gap-2 bg-error/5 border border-error/20 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-error" />
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!addValue.trim() || adding}
            className="btn-primary flex items-center gap-2"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add to Blacklist
          </button>
        </form>
      </div>

      {/* Blacklist table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-border">
          <input
            type="text"
            placeholder="Search blacklist..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="form-input"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <Ban className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-text-secondary">No blacklist entries</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(entry => (
              <div key={entry.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                      {entry.type.replace('_', ' ')}
                    </span>
                    <span className="font-mono text-sm font-semibold text-text-primary">{entry.value}</span>
                  </div>
                  {entry.reason && (
                    <p className="text-xs text-text-secondary mt-0.5">{entry.reason}</p>
                  )}
                  <p className="text-xs text-text-secondary mt-0.5">{timeAgo(entry.added_at)}</p>
                </div>
                <button
                  onClick={() => handleRemove(entry.id)}
                  className="p-1.5 rounded hover:bg-error/10 text-text-secondary hover:text-error transition-colors"
                  title="Remove from blacklist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
