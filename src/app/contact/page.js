'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', type: 'bug', message: '' })
  const [status, setStatus] = useState(null) // null | 'loading' | 'success' | 'error'
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setStatus('loading')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
        setStatus('error')
        return
      }
      setStatus('success')
    } catch {
      setError('Network error. Please check your connection and try again.')
      setStatus('error')
    }
  }

  const inputCls = "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-rose-500 focus:outline-none transition-colors text-white placeholder-gray-600 text-sm"
  const selectCls = "w-full px-4 py-3 bg-[#120009] border border-white/10 rounded-xl focus:border-rose-500 focus:outline-none transition-colors text-white text-sm appearance-none"

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-[#0d0008] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white mb-3">Message sent!</h1>
          <p className="text-white/50 text-sm leading-relaxed mb-8">
            Thanks for reaching out. We'll get back to you as soon as possible.
          </p>
          <Link href="/"
            className="inline-block bg-rose-500 hover:bg-rose-400 text-white font-bold px-6 py-3 rounded-full text-sm transition-colors">
            Back to home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d0008] text-white px-4 py-12">

      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, #be185d 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 max-w-lg mx-auto">

        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-8 transition-colors">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back
        </Link>

        <div className="text-center mb-10">
          <img src="/logo1.png" alt="Logo" className="h-12 w-auto object-contain mx-auto mb-6" />
          <h1 className="text-3xl font-black mb-2">Contact us</h1>
          <p className="text-white/40 text-sm">Got a bug, complaint, or idea? We're listening.</p>
        </div>

        <div className="bg-white/3 border border-white/8 rounded-3xl p-7">
          <form onSubmit={handleSubmit} className="space-y-5">

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Your name</label>
                <input type="text" required maxLength={60} value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className={inputCls} placeholder="Full name" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Your email</label>
                <input type="email" required value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className={inputCls} placeholder="you@example.com" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Type</label>
              <div className="relative">
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={selectCls}>
                  <option value="bug">Bug Report</option>
                  <option value="complaint">Complaint</option>
                  <option value="suggestion">Suggestion</option>
                  <option value="other">Other</option>
                </select>
                <svg viewBox="0 0 24 24" className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Message</label>
              <textarea required rows={5} maxLength={2000} value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                className={`${inputCls} resize-none`}
                placeholder="Describe your issue or idea in detail…" />
              <p className="text-white/20 text-xs mt-1 text-right">{form.message.length}/2000</p>
            </div>

            {status === 'error' && error && (
              <div className="bg-red-900/30 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>
            )}

            <button type="submit" disabled={status === 'loading'}
              className="w-full bg-gradient-to-r from-rose-500 to-orange-400 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 text-sm">
              {status === 'loading' ? 'Sending…' : 'Send message'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          We typically respond within 24–48 hours.
        </p>
      </div>
    </div>
  )
}
