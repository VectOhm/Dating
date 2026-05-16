'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function VerifyEmailPage() {
  const [resent, setResent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function resend() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email) {
      await supabase.auth.resend({ type: 'signup', email: user.email })
    }
    setResent(true)
    setLoading(false)
  }

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-white/8 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-rose-400" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>

        <h1 className="text-2xl font-black text-white mb-2">Verify your email</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          We sent a confirmation link to your email address. Click it to unlock your account — this keeps fakes out.
        </p>

        {resent ? (
          <div className="bg-emerald-900/30 border border-emerald-500/30 text-emerald-400 text-sm rounded-xl px-4 py-3 mb-6">
            Email resent! Check your inbox and spam folder.
          </div>
        ) : (
          <button onClick={resend} disabled={loading}
            className="w-full bg-gradient-to-r from-rose-500 to-orange-400 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 text-sm mb-3">
            {loading ? 'Sending…' : 'Resend verification email'}
          </button>
        )}

        <button onClick={logout}
          className="text-gray-600 text-sm hover:text-gray-400 transition-colors">
          Sign out and use a different account
        </button>
      </div>
    </div>
  )
}
