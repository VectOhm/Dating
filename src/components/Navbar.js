'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function Navbar() {
  const pathname = usePathname()
  const [likesBadge, setLikesBadge] = useState(0)

  useEffect(() => {
    fetchBadge()
  }, [pathname])

  async function fetchBadge() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Incoming likes
    const { data: incoming } = await supabase
      .from('swipes').select('swiper_id')
      .eq('swiped_id', user.id).eq('direction', 'like')
    if (!incoming?.length) { setLikesBadge(0); return }

    // Already responded to
    const { data: mySwipes } = await supabase
      .from('swipes').select('swiped_id').eq('swiper_id', user.id)
    const responded = new Set(mySwipes?.map(s => s.swiped_id) ?? [])

    const pending = incoming.filter(l => !responded.has(l.swiper_id)).length
    setLikesBadge(pending)
  }

  const tabs = [
    {
      href: '/discover',
      label: 'Discover',
      icon: (active) => (
        <svg viewBox="0 0 24 24" className={`w-6 h-6 ${active ? 'text-rose-500' : 'text-gray-300'}`} fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      ),
    },
    {
      href: '/matches',
      label: 'Matches',
      badge: likesBadge,
      icon: (active) => (
        <svg viewBox="0 0 24 24" className={`w-6 h-6 ${active ? 'text-rose-500' : 'text-gray-300'}`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      ),
    },
    {
      href: '/profile',
      label: 'Profile',
      icon: (active) => (
        <svg viewBox="0 0 24 24" className={`w-6 h-6 ${active ? 'text-rose-500' : 'text-gray-300'}`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      ),
    },
  ]

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-black border-t border-white/10 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center justify-around max-w-lg mx-auto h-16">
        {tabs.map(t => {
          const active = pathname === t.href
          return (
            <Link key={t.href} href={t.href}
              className="flex flex-col items-center gap-0.5 px-6 py-2 min-w-[72px] relative">
              {t.icon(active)}
              {/* Badge */}
              {t.badge > 0 && (
                <span className="absolute top-1 right-3 bg-rose-500 text-white text-[10px] font-black min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 shadow">
                  {t.badge > 9 ? '9+' : t.badge}
                </span>
              )}
              <span className={`text-[10px] font-bold ${active ? 'text-rose-500' : 'text-gray-600'}`}>
                {t.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
