import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0d0008] text-white overflow-hidden relative">

      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, #be185d 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }} />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5">
        <div className="flex items-center">
          <img src="/logo1.png" alt="Logo" className="h-9 w-auto object-contain" />
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm text-white/60 font-medium">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="#how" className="hover:text-white transition-colors">How it works</a>
          <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
        </div>

        <Link href="/auth/login"
          className="bg-rose-500 hover:bg-rose-400 text-white font-bold text-sm px-5 py-2.5 rounded-full transition-colors shadow-lg shadow-rose-500/30">
          Sign in
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col lg:flex-row items-center justify-between px-6 md:px-12 pt-10 pb-20 gap-12 max-w-7xl mx-auto">

        {/* Left */}
        <div className="flex-1 max-w-xl">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-white/70 text-xs font-semibold px-4 py-2 rounded-full mb-7">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-rose-400" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            Real people. Real connections.
          </div>

          <h1 className="text-5xl md:text-6xl font-black leading-[1.08] tracking-tight mb-6">
            Find your{' '}
            <span className="text-rose-400">perfect</span>
            {' '}match.
          </h1>

          <p className="text-white/50 text-lg leading-relaxed mb-9">
            No bots, no fake profiles — just genuine singles ready to connect.
            Swipe, match, and chat securely when it's mutual.
          </p>

          <div className="flex flex-wrap items-center gap-3 mb-10">
            <Link href="/auth/register"
              className="bg-rose-500 hover:bg-rose-400 text-white font-bold px-7 py-3.5 rounded-full text-sm transition-all shadow-xl shadow-rose-500/30 hover:shadow-rose-500/50 hover:scale-[1.03] active:scale-95">
              Create free account
            </Link>
            <a href="#how"
              className="bg-white/8 border border-white/10 hover:bg-white/12 text-white font-semibold px-7 py-3.5 rounded-full text-sm transition-all">
              How it works
            </a>
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {['Priya','Arjun','Sneha','Rahul','Anjali'].map((n, i) => (
                <div key={n} className="w-8 h-8 rounded-full border-2 border-[#0d0008] overflow-hidden"
                  style={{ zIndex: 5 - i }}>
                  <img src={`https://ui-avatars.com/api/?name=${n}&background=${['f43f5e','e11d48','be185d','9f1239','881337'][i]}&color=fff&size=64`}
                    alt={n} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <p className="text-white/50 text-sm">
              <span className="text-white font-bold">2,400+</span> people already matched
            </p>
          </div>
        </div>

        {/* Right — card mockup */}
        <div className="flex-shrink-0 relative" style={{ width: 320 }}>
          {/* Glow behind card */}
          <div className="absolute inset-0 rounded-3xl blur-2xl opacity-30"
            style={{ background: 'linear-gradient(135deg,#f43f5e,#7c3aed)', transform: 'scale(0.9) translateY(20px)' }} />

          {/* Card */}
          <div className="relative rounded-3xl overflow-hidden shadow-2xl" style={{ height: 480 }}>
            <img
              src="https://images.unsplash.com/photo-1743090834072-4f70339bc917?w=640&q=80"
              alt="Profile"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />

            {/* Match badge */}
            <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-full">
              <svg viewBox="0 0 24 24" className="w-3 h-3 text-rose-400" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              <span className="text-white text-xs font-bold">98% match</span>
            </div>

            {/* Info */}
            <div className="absolute bottom-0 inset-x-0 p-5">
              <h3 className="text-white text-2xl font-black leading-none">Priya, 24</h3>
              <p className="text-white/60 text-sm mt-1">Designer · 3 km away · Soro</p>

              {/* Action buttons */}
              <div className="flex items-center justify-center gap-3 mt-4">
                <button className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-rose-500/20 transition-colors">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
                <button className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-blue-500/20 transition-colors">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-400" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </button>
                <button className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl shadow-rose-500/40 hover:scale-110 transition-all"
                  style={{ background: 'linear-gradient(135deg,#f43f5e,#e11d48)' }}>
                  <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Floating match notification */}
          <div className="absolute -bottom-5 -left-8 flex items-center gap-3 bg-[#1a0a14] border border-white/10 rounded-2xl px-4 py-3 shadow-2xl">
            <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border border-rose-500/40">
              <img src="https://ui-avatars.com/api/?name=Arjun&background=f43f5e&color=fff&size=64" alt="" className="w-full h-full object-cover"/>
            </div>
            <div>
              <p className="text-white text-xs font-bold">It's a match!</p>
              <p className="text-white/40 text-[11px]">You and Arjun liked each other</p>
            </div>
          </div>
        </div>
      </section>

      {/* Launching first banner */}
      <section className="relative z-10 px-6 md:px-12 py-10 max-w-4xl mx-auto">
        <div className="border border-white/10 bg-white/3 rounded-2xl px-8 py-10 text-center">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-rose-400 mx-auto mb-4" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
          <h2 className="text-2xl md:text-3xl font-black mb-3">
            Launching first in <span className="text-rose-400">Soro</span>
          </h2>
          <p className="text-white/50 text-base max-w-xl mx-auto leading-relaxed">
            We're starting right here in Soro. Your matches are people you can actually
            meet tonight — not a swipe in another timezone.
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 px-6 md:px-12 py-20 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-black mb-3">Why us?</h2>
          <p className="text-white/50 text-lg">Built different. Designed for real connections.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: <svg viewBox="0 0 24 24" className="w-6 h-6 text-rose-400" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
              title: 'Chat only on match',
              desc: 'Messages unlock only when both people swipe right. No unwanted messages ever.',
            },
            {
              icon: <svg viewBox="0 0 24 24" className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
              title: 'Verified profiles',
              desc: 'Every profile is reviewed. No catfishing, no bots — just real people.',
            },
            {
              icon: <svg viewBox="0 0 24 24" className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
              title: 'Safety first',
              desc: 'Phone numbers and social IDs are blocked in chat. Your privacy is protected.',
            },
          ].map(f => (
            <div key={f.title} className="bg-white/4 border border-white/8 rounded-3xl p-7 hover:bg-white/6 transition-colors">
              <div className="w-11 h-11 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-5">{f.icon}</div>
              <h3 className="text-white font-black text-lg mb-2">{f.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10 px-6 md:px-12 py-20 max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-4xl md:text-5xl font-black mb-3">Simple, honest pricing.</h2>
          <p className="text-white/50 text-lg">Free forever. Upgrade for the full experience.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">

          {/* Free */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col">
            <div className="mb-6">
              <p className="text-white font-bold text-lg mb-1">Free</p>
              <p className="text-5xl font-black text-white">₹0</p>
            </div>
            <ul className="space-y-3 flex-1 mb-8">
              {['Daily swipes','City-only matches','Chat with matches','Verified profiles'].map(f => (
                <li key={f} className="flex items-center gap-2.5 text-white/70 text-sm">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-rose-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/auth/register"
              className="block text-center bg-white/10 border border-white/15 text-white font-bold py-3.5 rounded-2xl hover:bg-white/15 transition-colors text-sm">
              Start free
            </Link>
          </div>

          {/* Premium */}
          <div className="relative rounded-3xl p-8 flex flex-col" style={{ background: 'linear-gradient(135deg,#f43f5e,#e11d48,#be185d)' }}>
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs font-black px-4 py-1.5 rounded-full tracking-wider">Most popular</div>
            <div className="mb-6">
              <p className="text-white/80 font-bold text-lg mb-1">Premium</p>
              <div className="flex items-baseline gap-1">
                <p className="text-5xl font-black text-white">₹100</p>
                <span className="text-white/70 text-sm">/ week</span>
              </div>
            </div>
            <ul className="space-y-3 flex-1 mb-8">
              {['Unlimited swipes','See who liked you','5 super likes / day','1 boost / week','Advanced filters','Priority ranking'].map(f => (
                <li key={f} className="flex items-center gap-2.5 text-white/90 text-sm">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-white flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {f}
                </li>
              ))}
            </ul>
            <a href="https://www.instagram.com/vectohm_sol?igsh=dnh4YzNxdGJiNHNq" target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold py-3.5 rounded-2xl hover:opacity-90 transition-opacity text-sm">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
              </svg>
              Contact Admin on Instagram
            </a>
          </div>

        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 md:px-12 py-20 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black mb-5 leading-tight">
            Ready to find<br/>your <span className="text-rose-400">match</span>?
          </h2>
          <p className="text-white/50 mb-8">Join thousands already making real connections.</p>
          <Link href="/auth/register"
            className="inline-flex items-center gap-2 bg-rose-500 hover:bg-rose-400 text-white font-bold px-8 py-4 rounded-full text-base transition-all shadow-xl shadow-rose-500/30 hover:scale-[1.03] active:scale-95">
            Get started — it's free
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-6 md:px-12 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo1.png" alt="Logo" className="h-6 w-auto object-contain opacity-50" />
            <span className="text-white/40 text-xs">© 2025 All rights reserved.</span>
          </div>
          <div className="flex gap-6 text-white/30 text-xs">
            <a href="#" className="hover:text-white/60 transition-colors">Privacy</a>
            <a href="#" className="hover:text-white/60 transition-colors">Terms</a>
            <Link href="/contact" className="hover:text-white/60 transition-colors">Contact</Link>
          </div>
        </div>
        <p className="text-center text-white/20 text-xs mt-4">
          Designed and developed by{' '}
          <span className="text-white/40 font-semibold">Vectohm Solutions</span>
        </p>
      </footer>
    </div>
  )
}
