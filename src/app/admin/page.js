'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function AdminLogin() {
  const router = useRouter()
  const [form, setForm]     = useState({ email: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function check() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
        if (data?.is_admin) { router.replace('/admin/dashboard'); return }
      }
      setChecking(false)
    }
    check()
  }, [router])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error: authErr } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
    if (authErr) { setError('Invalid credentials.'); setLoading(false); return }

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) {
      await supabase.auth.signOut()
      setError('You do not have admin access.')
      setLoading(false)
      return
    }
    router.replace('/admin/dashboard')
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#080010] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-rose-500/30 border-t-rose-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080010] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <img src="/logo1.png" alt="Logo" className="h-10 w-auto object-contain mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white">Admin Panel</h1>
          <p className="text-white/30 text-sm mt-1">Restricted access only</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" required placeholder="Admin email" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-rose-500 focus:outline-none text-white placeholder-white/30 text-sm transition-colors" />
          <input type="password" required placeholder="Password" value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-rose-500 focus:outline-none text-white placeholder-white/30 text-sm transition-colors" />

          {error && (
            <div className="bg-red-900/30 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-rose-500 to-orange-400 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 text-sm mt-2">
            {loading ? 'Signing in…' : 'Sign in to Admin'}
          </button>
        </form>
      </div>
    </div>
  )
}
