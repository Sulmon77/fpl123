'use client'
// src/app/[adminPath]/page.tsx
// Admin login — only accessible via secret URL segment

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, AlertCircle } from 'lucide-react'

export default function AdminLoginPage({
  params,
}: {
  params: Promise<{ adminPath: string }>
}) {
  const resolvedParams = use(params)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await res.json()

      if (data.success) {
        router.push(`/${resolvedParams.adminPath}/dashboard`)
      } else {
        setError('Incorrect password.')
      }
    } catch {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-purple flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-brand-green" />
          </div>
          <h1 className="font-display font-bold text-2xl text-white">Admin Access</h1>
          <p className="text-white/40 text-sm mt-1">Enter your admin password</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null) }}
            placeholder="Admin password"
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green/50"
            autoFocus
            disabled={loading}
          />

          {error && (
            <div className="flex items-center gap-2 bg-error/10 border border-error/20 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!password || loading}
            className="w-full bg-brand-green text-brand-purple font-bold py-3 rounded-xl hover:bg-opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Logging in...
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}