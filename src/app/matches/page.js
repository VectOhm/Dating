'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import ProfileModal from '@/components/ProfileModal'

export default function MatchesPage() {
  const router = useRouter()
  const [tab, setTab] = useState('chats')
  const [matches, setMatches] = useState([])
  const [likedYou, setLikedYou] = useState([])
  const [youLiked, setYouLiked] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewingProfile, setViewingProfile] = useState(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [matchRes, likedYouRes, youLikedRes, mySwipesRes] = await Promise.all([
      supabase.from('matches')
        .select(`id, created_at, user1_id, user2_id,
          user1:profiles!matches_user1_id_fkey(id, name, age, avatar_url),
          user2:profiles!matches_user2_id_fkey(id, name, age, avatar_url)`)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false }),
      supabase.from('swipes')
        .select('swiper_id, profiles!swipes_swiper_id_fkey(id, name, age, bio, avatar_url)')
        .eq('swiped_id', user.id).eq('direction', 'like'),
      supabase.from('swipes')
        .select('swiped_id, profiles!swipes_swiped_id_fkey(id, name, age, bio, avatar_url)')
        .eq('swiper_id', user.id).eq('direction', 'like'),
      supabase.from('swipes').select('swiped_id').eq('swiper_id', user.id),
    ])

    const matchData   = matchRes.data ?? []
    const matchedIds  = new Set(matchData.map(m => m.user1_id === user.id ? m.user2_id : m.user1_id))
    const mySwipedIds = new Set((mySwipesRes.data ?? []).map(s => s.swiped_id))

    setMatches(matchData.map(m => ({ ...m, other: m.user1_id === user.id ? m.user2 : m.user1 })))
    setLikedYou((likedYouRes.data ?? [])
      .filter(s => !matchedIds.has(s.swiper_id) && !mySwipedIds.has(s.swiper_id))
      .map(s => s.profiles).filter(Boolean))
    setYouLiked((youLikedRes.data ?? [])
      .filter(s => !matchedIds.has(s.swiped_id))
      .map(s => s.profiles).filter(Boolean))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function likeBack(profile) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('swipes').insert({ swiper_id: user.id, swiped_id: profile.id, direction: 'like' })
    const [u1, u2] = [user.id, profile.id].sort()
    const { data: newMatch } = await supabase
      .from('matches').insert({ user1_id: u1, user2_id: u2 }).select().maybeSingle()
    if (newMatch) { await load(); setTab('chats'); router.push(`/chat/${newMatch.id}`) }
  }

  async function passUser(profile) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('swipes').insert({ swiper_id: user.id, swiped_id: profile.id, direction: 'dislike' })
    setLikedYou(prev => prev.filter(p => p.id !== profile.id))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-10 h-10 rounded-full border-2 border-rose-500/20 border-t-rose-500 animate-spin" />
      </div>
    )
  }

  const likesCount = likedYou.length + youLiked.length

  return (
    <div className="min-h-screen bg-black flex flex-col text-white">

      {/* Header */}
      <header className="px-5 pt-6 pb-0 flex-shrink-0 border-b border-white/10">
        <h1 className="text-2xl font-black text-white mb-4">Matches</h1>
        <div className="flex gap-8">
          {[
            { key: 'chats', label: 'Chats', count: matches.length },
            { key: 'likes', label: 'Likes', count: likesCount },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                tab === t.key ? 'border-rose-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}>
              {t.label}
              {t.count > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">

        {/* ── CHATS ── */}
        {tab === 'chats' && (
          matches.length === 0
            ? <Empty icon="matches" title="No matches yet" sub="Keep swiping!" href="/discover" cta="Start swiping" />
            : (
              <div className="divide-y divide-white/5 max-w-lg mx-auto">
                {matches.map(m => (
                  <Link key={m.id} href={`/chat/${m.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors">
                    <div className="relative flex-shrink-0">
                      <div className="w-14 h-14 rounded-full overflow-hidden border border-white/10">
                        <img
                          src={m.other?.avatar_url || avatarFallback(m.other?.name)}
                          alt={m.other?.name} className="w-full h-full object-cover" />
                      </div>
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 border-2 border-black rounded-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white truncate">
                        {m.other?.name}{m.other?.age ? `, ${m.other.age}` : ''}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">Tap to start chatting</p>
                    </div>
                    <span className="text-gray-600 text-xl flex-shrink-0">›</span>
                  </Link>
                ))}
              </div>
            )
        )}

        {/* ── LIKES ── */}
        {tab === 'likes' && (
          <div className="max-w-2xl mx-auto">

            {/* ── LIKED YOU ── */}
            {likedYou.length > 0 && (
              <section className="pt-5 px-4">
                {/* Section header */}
                <div className="flex items-center gap-3 mb-4 p-3 rounded-2xl"
                  style={{ background: 'linear-gradient(135deg,rgba(244,63,94,0.15),rgba(251,113,133,0.05))' }}>
                  <div className="w-8 h-8 rounded-xl bg-rose-500 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-black text-sm">Liked You</p>
                    <p className="text-rose-400 text-xs">{likedYou.length} {likedYou.length === 1 ? 'person wants' : 'people want'} to match with you</p>
                  </div>
                  <span className="bg-rose-500 text-white text-xs font-black px-2.5 py-1 rounded-full">{likedYou.length}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {likedYou.map(p => (
                    <LikeCard key={p.id} profile={p} type="liked-you"
                      onView={() => setViewingProfile(p)}
                      onLike={() => likeBack(p)} onPass={() => passUser(p)} />
                  ))}
                </div>
              </section>
            )}

            {/* ── YOU LIKED ── */}
            {youLiked.length > 0 && (
              <section className="pt-6 px-4 pb-4">
                {/* Section header */}
                <div className="flex items-center gap-3 mb-4 p-3 rounded-2xl bg-white/4 border border-white/8">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-black text-sm">You Liked</p>
                    <p className="text-gray-500 text-xs">Waiting for {youLiked.length} {youLiked.length === 1 ? 'person' : 'people'} to respond</p>
                  </div>
                  <span className="bg-white/10 text-gray-400 text-xs font-black px-2.5 py-1 rounded-full border border-white/10">{youLiked.length}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {youLiked.map(p => (
                    <LikeCard key={p.id} profile={p} type="you-liked" />
                  ))}
                </div>
              </section>
            )}

            {likesCount === 0 && (
              <div className="px-4">
                <Empty icon="likes" title="No likes yet" sub="Swipe right on people you like!" href="/discover" cta="Discover people" />
              </div>
            )}
          </div>
        )}
      </main>

      <Navbar />

      {/* Profile viewer modal */}
      {viewingProfile && (
        <ProfileModal
          profile={viewingProfile}
          onClose={() => setViewingProfile(null)}
          onLike={() => { likeBack(viewingProfile); setViewingProfile(null) }}
          onPass={() => { passUser(viewingProfile); setViewingProfile(null) }}
        />
      )}
    </div>
  )
}

/* ── helpers ── */

function avatarFallback(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name ?? '?')}&background=f43f5e&color=fff`
}

function LikeCard({ profile, type, onView, onLike, onPass }) {
  const src = profile?.avatar_url || avatarFallback(profile?.name)
  const isLikedYou = type === 'liked-you'

  return (
    <div
      className={`relative rounded-2xl overflow-hidden shadow-lg ${isLikedYou ? 'ring-2 ring-rose-500/40' : 'ring-1 ring-white/8'}`}
      style={{ height: 230 }}>

      {/* Photo */}
      <div className={`w-full h-full ${isLikedYou ? 'cursor-pointer' : ''}`}
        onClick={isLikedYou ? onView : undefined}>
        <img src={src} alt={profile.name}
          className={`w-full h-full object-cover ${!isLikedYou ? 'brightness-50 saturate-50' : ''}`}
          draggable={false} />
      </div>

      {/* Gradient */}
      <div className={`absolute inset-0 pointer-events-none bg-gradient-to-t ${
        isLikedYou
          ? 'from-black/90 via-black/20 to-transparent'
          : 'from-black/95 via-black/50 to-black/10'
      }`} />

      {/* Top badges */}
      {isLikedYou ? (
        <>
          {/* Rose heart badge */}
          <div className="absolute top-2.5 right-2.5 w-7 h-7 bg-rose-500 rounded-full flex items-center justify-center shadow-lg shadow-rose-500/50 pointer-events-none">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="currentColor">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </div>
          {/* View button */}
          <button onClick={onView}
            className="absolute top-2.5 left-2.5 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 hover:bg-black/70 transition-colors">
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            View
          </button>
        </>
      ) : (
        /* Blue clock badge for pending */
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-blue-500/20 border border-blue-500/30 backdrop-blur-sm px-2 py-1 rounded-full pointer-events-none">
          <svg viewBox="0 0 24 24" className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span className="text-blue-300 text-[10px] font-bold">Pending</span>
        </div>
      )}

      {/* Bottom info */}
      <div className="absolute bottom-0 inset-x-0 p-3">
        <p className="text-white font-bold text-sm leading-tight truncate">
          {profile.name}{profile.age ? `, ${profile.age}` : ''}
        </p>
        {profile.bio && (
          <p className="text-white/50 text-[11px] mt-0.5 line-clamp-1">{profile.bio}</p>
        )}

        {isLikedYou ? (
          <div className="flex gap-1.5 mt-2">
            <button onClick={e => { e.stopPropagation(); onPass() }}
              className="flex-1 bg-white/15 text-white text-xs font-bold py-1.5 rounded-lg hover:bg-white/25 active:scale-95 transition-all">
              Pass
            </button>
            <button onClick={e => { e.stopPropagation(); onLike() }}
              className="flex-1 bg-rose-500 text-white text-xs font-bold py-1.5 rounded-lg hover:bg-rose-600 active:scale-95 transition-all flex items-center justify-center gap-1">
              <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              Like back
            </button>
          </div>
        ) : (
          <p className="text-blue-400/70 text-[10px] mt-1 flex items-center gap-1">
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            Waiting for response…
          </p>
        )}
      </div>
    </div>
  )
}

const EMPTY_ICONS = {
  matches: (
    <svg viewBox="0 0 24 24" className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  likes: (
    <svg viewBox="0 0 24 24" className="w-8 h-8 text-gray-600" fill="currentColor">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
}

function Empty({ icon, title, sub, href, cta }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[280px] text-center px-8">
      <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center mx-auto mb-5">
        {EMPTY_ICONS[icon]}
      </div>
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <p className="text-gray-500 text-sm mt-2">{sub}</p>
      <Link href={href}
        className="mt-5 bg-gradient-to-r from-rose-500 to-orange-400 text-white font-bold px-7 py-3 rounded-2xl hover:opacity-90 transition-opacity text-sm">
        {cta}
      </Link>
    </div>
  )
}
