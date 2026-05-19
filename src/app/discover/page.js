'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import SwipeCard from '@/components/SwipeCard'
import MatchModal from '@/components/MatchModal'
import ChatPanel from '@/components/ChatPanel'
import ProfileModal from '@/components/ProfileModal'
import Navbar from '@/components/Navbar'

function previewMsg(content) {
  if (!content) return null
  if (content.startsWith('__gif__')) return 'GIF'
  if (content.startsWith('__sticker__')) return 'Sticker'
  return content
}

const FREE_SWIPE_LIMIT = 20

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

export default function DiscoverPage() {
  const router = useRouter()
  const [profiles, setProfiles]       = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [match, setMatch]             = useState(null)
  const [loading, setLoading]         = useState(true)
  const [isSwiping, setIsSwiping]     = useState(false)
  const [likeToast, setLikeToast]     = useState(null)
  const [sidebarTab, setSidebarTab]   = useState('messages')
  const [sidebarData, setSidebarData] = useState([])   // { matchId, profile, lastMsg, isFromMe }
  const [pendingLikes, setPendingLikes] = useState(0)
  const [activeChat, setActiveChat]         = useState(null)
  const [viewingProfile, setViewingProfile] = useState(null)
  const [userLocation, setUserLocation]     = useState(null)
  const [locationBanner, setLocationBanner] = useState(false)  // show if denied
  const [locationPrompt, setLocationPrompt] = useState(false)  // show in-app prompt before browser asks
  const [dailySwipesUsed, setDailySwipesUsed] = useState(0)
  const [showUpgrade, setShowUpgrade]         = useState(false)
  const [payLoading, setPayLoading]           = useState(false)
  const toastTimerRef = useRef(null)
  const channelRef    = useRef(null)
  const supabaseRef   = useRef(null)
  const topCardRef    = useRef(null)

  function requestLocation(supabase, userId) {
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        setUserLocation({ lat, lon })
        setLocationPrompt(false)
        setLocationBanner(false)
        await supabase.from('profiles').update({ latitude: lat, longitude: lon }).eq('id', userId)
      },
      () => { setLocationPrompt(false); setLocationBanner(true) },
      { timeout: 10000, maximumAge: 5 * 60 * 1000 }
    )
  }

  async function enableLocation() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setLocationPrompt(false)
    requestLocation(supabase, user.id)
  }

  useEffect(() => {
    loadAll()
    return () => {
      if (channelRef.current && supabaseRef.current) {
        supabaseRef.current.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [])

  async function loadAll() {
    const supabase = createClient()
    supabaseRef.current = supabase
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: myProfile } = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    if (!myProfile) { router.replace('/setup'); return }
    setCurrentUser(myProfile)

    // Count today's swipes for free-tier limit
    if (!myProfile.is_premium) {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
      const { count } = await supabase
        .from('swipes').select('id', { count: 'exact', head: true })
        .eq('swiper_id', user.id)
        .gte('created_at', todayStart.toISOString())
      setDailySwipesUsed(count ?? 0)
    }

    // Location — check permission status first so we can show an in-app prompt before the browser asks
    if (!navigator.geolocation) {
      setLocationBanner(true)
    } else if (navigator.permissions) {
      const perm = await navigator.permissions.query({ name: 'geolocation' })
      if (perm.state === 'granted') {
        requestLocation(supabase, user.id)
      } else if (perm.state === 'denied') {
        setLocationBanner(true)
      } else {
        // 'prompt' — show our in-app explanation first
        setLocationPrompt(true)
      }
    } else {
      // Browser can't query permissions — just try silently
      requestLocation(supabase, user.id)
    }

    // Matches + last message for sidebar
    const { data: matchRows } = await supabase
      .from('matches')
      .select('id, user1_id, user2_id, created_at')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (matchRows?.length) {
      const items = await Promise.all(
        matchRows.map(async m => {
          const otherId = m.user1_id === user.id ? m.user2_id : m.user1_id
          const [{ data: prof }, { data: msg }] = await Promise.all([
            supabase.from('profiles').select('id,name,avatar_url').eq('id', otherId).single(),
            supabase.from('messages').select('content,sender_id')
              .eq('match_id', m.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          ])
          return {
            matchId: m.id,
            matchDate: m.created_at,
            profile: prof,
            lastMsg: msg?.content ?? null,
            isFromMe: msg?.sender_id === user.id,
          }
        })
      )
      setSidebarData(items.filter(i => i.profile))
    }

    // Pending likes badge
    const { data: incoming } = await supabase
      .from('swipes').select('swiper_id').eq('swiped_id', user.id).eq('direction', 'like')
    const { data: mySwipes } = await supabase
      .from('swipes').select('swiped_id').eq('swiper_id', user.id)
    const responded = new Set(mySwipes?.map(s => s.swiped_id) ?? [])
    setPendingLikes(incoming?.filter(l => !responded.has(l.swiper_id)).length ?? 0)

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    channelRef.current = supabase
      .channel(`incoming-likes-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'swipes',
        filter: `swiped_id=eq.${user.id}`,
      }, async (payload) => {
        if (payload.new.direction !== 'like') return
        const { data: liker } = await supabase
          .from('profiles').select('name,avatar_url').eq('id', payload.new.swiper_id).single()
        if (!liker) return
        setLikeToast(liker)
        setPendingLikes(n => n + 1)
        clearTimeout(toastTimerRef.current)
        toastTimerRef.current = setTimeout(() => setLikeToast(null), 4000)
      })
      .subscribe()

    // Discovery profiles
    const { data: swiped } = await supabase
      .from('swipes').select('swiped_id').eq('swiper_id', user.id)
    const excludedIds = [user.id, ...(swiped?.map(s => s.swiped_id) ?? [])]
    let query = supabase.from('profiles').select('*')
      .not('id', 'in', `(${excludedIds.join(',')})`)
    if (myProfile.interested_in === 'women') query = query.eq('gender', 'woman')
    else if (myProfile.interested_in === 'men') query = query.eq('gender', 'man')
    const { data } = await query.limit(20)
    setProfiles(data ?? [])
    setLoading(false)
  }

  const handleSwipe = useCallback(async (direction) => {
    setIsSwiping(false)
    if (!currentUser) return
    if (!currentUser.is_premium && dailySwipesUsed >= FREE_SWIPE_LIMIT) {
      setShowUpgrade(true)
      return
    }
    if (!currentUser.is_premium) setDailySwipesUsed(n => n + 1)
    setProfiles(prev => {
      if (prev.length === 0) return prev
      const target = prev[0]
      ;(async () => {
        const supabase = createClient()
        await supabase.from('swipes').insert({
          swiper_id: currentUser.id, swiped_id: target.id, direction,
        })
        if (direction !== 'like') return
        const { data: theirLike } = await supabase
          .from('swipes').select('id')
          .eq('swiper_id', target.id).eq('swiped_id', currentUser.id).eq('direction', 'like')
          .maybeSingle()
        if (!theirLike) return
        const [u1, u2] = [currentUser.id, target.id].sort()
        const { data: newMatch } = await supabase
          .from('matches').insert({ user1_id: u1, user2_id: u2 }).select().maybeSingle()
        if (newMatch) {
          setMatch({ ...newMatch, profile: target, myAvatar: currentUser.avatar_url })
          setSidebarData(prev => [{
            matchId: newMatch.id,
            profile: { id: target.id, name: target.name, avatar_url: target.avatar_url },
            lastMsg: null, isFromMe: false,
          }, ...prev])
        }
      })()
      return prev.slice(1)
    })
  }, [currentUser, dailySwipesUsed])

  async function handleUpgrade() {
    setPayLoading(true)
    try {
      const res = await fetch('/api/create-order', { method: 'POST' })
      const { orderId, amount, currency, error } = await res.json()
      if (error) { setPayLoading(false); return }

      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      document.body.appendChild(script)
      script.onload = () => {
        const options = {
          key:         process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount,
          currency,
          name:        'Premium Membership',
          description: '1 Week Premium Access',
          order_id:    orderId,
          prefill:     { email: currentUser?.email },
          theme:       { color: '#f43f5e' },
          handler: async (response) => {
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
              }),
            })
            const result = await verifyRes.json()
            if (result.ok) {
              setCurrentUser(u => ({ ...u, is_premium: true }))
              setShowUpgrade(false)
            }
            setPayLoading(false)
          },
          modal: { ondismiss: () => setPayLoading(false) },
        }
        const rzp = new window.Razorpay(options)
        rzp.open()
      }
    } catch {
      setPayLoading(false)
    }
  }

  function pressSwipe(dir) {
    if (isSwiping || !profiles.length) return
    if (!currentUser?.is_premium && dailySwipesUsed >= FREE_SWIPE_LIMIT) {
      setShowUpgrade(true)
      return
    }
    setIsSwiping(true)
    topCardRef.current?.swipe(dir)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-rose-500/20 border-t-rose-500 animate-spin" />
          <p className="text-gray-500 text-sm">Finding people near you…</p>
        </div>
      </div>
    )
  }

  const myAvatar = currentUser?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name ?? 'Me')}&background=f43f5e&color=fff`

  // Sort by real distance when location is available
  const sortedProfiles = userLocation
    ? [...profiles].sort((a, b) => {
        const da = a.latitude ? haversine(userLocation.lat, userLocation.lon, a.latitude, a.longitude) : 9999
        const db = b.latitude ? haversine(userLocation.lat, userLocation.lon, b.latitude, b.longitude) : 9999
        return da - db
      })
    : profiles

  function getDistance(profile) {
    if (!userLocation || !profile.latitude) return null
    return haversine(userLocation.lat, userLocation.lon, profile.latitude, profile.longitude)
  }

  const listItems = sidebarTab === 'messages'
    ? sidebarData.filter(s => s.lastMsg !== null)
    : sidebarData

  return (
    <div className="flex bg-black text-white overflow-hidden" style={{ height: '100dvh' }}>

      {/* ── LEFT SIDEBAR ── */}
      <aside className="hidden md:flex w-[310px] flex-shrink-0 flex-col bg-black border-r border-white/10">

        {/* Desktop sidebar header */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#f43f5e,#fb923c)' }}>
          <Link href="/profile" className="flex items-center gap-2.5 min-w-0">
            <img src={myAvatar}
              className="w-10 h-10 rounded-full object-cover border-2 border-white/60 hover:opacity-90 transition-opacity flex-shrink-0"
              alt="me" />
            <div className="min-w-0">
              <p className="text-white font-bold text-sm leading-none truncate">{currentUser?.name}</p>
              <p className="text-white/60 text-xs mt-0.5">{currentUser?.is_premium ? 'Premium' : 'Free plan'}</p>
            </div>
          </Link>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <GoldBtn title="Boost">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </GoldBtn>
            <GoldBtn title="Discover">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </GoldBtn>
            <GoldBtn title="Matches">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </GoldBtn>
            <GoldBtn title="Safety">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </GoldBtn>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 flex-shrink-0">
          {['matches', 'messages'].map(t => (
            <button key={t} onClick={() => setSidebarTab(t)}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors
                ${sidebarTab === t
                  ? 'text-white border-b-2 border-rose-500'
                  : 'text-gray-500 hover:text-gray-300'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Get Likes promo row */}
          {currentUser?.is_premium ? (
            <Link href="/matches">
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5 hover:bg-white/5 transition-colors">
                <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#f43f5e,#fb923c)' }}>
                  <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-white">Get Likes</p>
                  <p className="text-xs text-gray-500">
                    {pendingLikes > 0 ? `${pendingLikes} people liked you` : 'See who likes you'}
                  </p>
                </div>
              </div>
            </Link>
          ) : (
            <button onClick={() => setShowUpgrade(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-white/5 hover:bg-white/5 transition-colors">
              <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center relative"
                style={{ background: 'linear-gradient(135deg,#374151,#1f2937)' }}>
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-gray-600" fill="currentColor">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-3 h-3 text-black" fill="currentColor">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-bold text-sm text-gray-500">See who liked you</p>
                <p className="text-xs text-yellow-500 font-semibold">DM admin on Instagram to unlock</p>
              </div>
            </button>
          )}

          {/* Conversation / match list */}
          {listItems.length === 0 && (
            <p className="text-gray-600 text-xs text-center pt-8 px-6 leading-relaxed">
              {sidebarTab === 'messages'
                ? 'No messages yet.\nStart chatting with your matches!'
                : 'No matches yet — keep swiping!'}
            </p>
          )}

          {listItems.map(item => (
            <div key={item.matchId}
              onClick={() => setActiveChat({ matchId: item.matchId, profile: item.profile, matchDate: item.matchDate })}
              className={`flex items-center gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer
                ${activeChat?.matchId === item.matchId ? 'bg-white/10 border-l-4 border-l-rose-500' : ''}`}>
              <div className="relative flex-shrink-0">
                <img
                  src={item.profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.profile.name)}&background=f43f5e&color=fff`}
                  className="w-12 h-12 rounded-full object-cover"
                  alt={item.profile.name}
                />
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 rounded-full border-2 border-black flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-white" fill="none"
                    stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-white truncate">{item.profile.name}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {item.lastMsg
                    ? `${item.isFromMe ? '↩' : '←'} ${previewMsg(item.lastMsg)}`
                    : 'New match! Say hello'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      {activeChat && currentUser && (
        <ChatPanel
          matchId={activeChat.matchId}
          matchDate={activeChat.matchDate}
          currentUserId={currentUser.id}
          otherProfile={activeChat.profile}
          onClose={() => setActiveChat(null)}
        />
      )}

      <main className={`flex-1 flex-col bg-black overflow-hidden ${activeChat ? 'hidden' : 'flex'}`}>

        {/* ── MOBILE TOP HEADER ── */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 flex-shrink-0 border-b border-white/8"
          style={{ background: 'linear-gradient(135deg,#1a0a0a,#0d0008)' }}>
          {/* Logo */}
          <img src="/logo1.png" alt="Logo" className="h-8 w-auto object-contain" />

          {/* User info + avatar */}
          <Link href="/profile" className="flex items-center gap-2.5">
            <div className="text-right">
              <p className="text-white font-bold text-sm leading-none">{currentUser?.name}</p>
              <p className="text-gray-500 text-[11px] mt-0.5">
                {currentUser?.is_premium
                  ? <span className="text-yellow-400 font-semibold">Premium</span>
                  : 'Free plan'}
              </p>
            </div>
            <div className="relative">
              <img src={myAvatar}
                className="w-9 h-9 rounded-full object-cover border-2 border-rose-500/50"
                alt={currentUser?.name} />
              {currentUser?.is_premium && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-black" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
              )}
            </div>
          </Link>
        </header>

        {/* Centered card content */}
        <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">

        {/* In-app location prompt (before browser popup fires) */}
        {locationPrompt && (
          <div className="absolute top-3 left-3 right-3 z-30 flex items-center gap-3 bg-gray-900 border border-white/10 rounded-2xl px-4 py-3 shadow-2xl">
            <div className="w-9 h-9 bg-rose-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-rose-400" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-bold">See how close people are</p>
              <p className="text-gray-500 text-[11px] mt-0.5">Enable location to show distance on cards</p>
            </div>
            <button onClick={enableLocation}
              className="flex-shrink-0 bg-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-rose-400 transition-colors whitespace-nowrap">
              Enable
            </button>
            <button onClick={() => setLocationPrompt(false)} className="flex-shrink-0 text-gray-600 hover:text-gray-400">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        )}

        {/* Location denied banner */}
        {locationBanner && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-gray-900 border border-white/10 rounded-full px-4 py-2 shadow-xl text-xs text-gray-300 whitespace-nowrap">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <span>Enable location to see distance</span>
            <button onClick={() => setLocationBanner(false)} className="ml-1 text-gray-600 hover:text-gray-300">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        )}

        {profiles.length === 0 ? (
          <div className="text-center px-8">
            <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center mx-auto mb-5">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 15s1.5 2 4 2 4-2 4-2"/>
                <line x1="9" y1="9" x2="9.01" y2="9"/>
                <line x1="15" y1="9" x2="15.01" y2="9"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white">You've seen everyone!</h2>
            <p className="text-gray-500 mt-2 text-sm">New people join every day — check back soon</p>
          </div>
        ) : (
          <>
            {/* Card stack */}
            <div className="relative flex-shrink-0"
              style={{
                width:  'min(350px, calc(100vw - 32px))',
                height: 'min(560px, calc(100dvh - 210px))',
              }}>
              {sortedProfiles.slice(0, 3).map((profile, i) => (
                <SwipeCard
                  key={profile.id}
                  ref={i === 0 ? topCardRef : null}
                  profile={profile}
                  onSwipe={handleSwipe}
                  onViewProfile={setViewingProfile}
                  isTop={i === 0}
                  stackIndex={i}
                  distance={getDistance(profile)}
                />
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-3 mt-5 flex-shrink-0">
              {/* Boost — Premium only */}
              <TinderBtn size="sm" onClick={() => !currentUser?.is_premium && setShowUpgrade(true)} disabled={isSwiping} title={currentUser?.is_premium ? 'Boost' : 'Boost · Premium'}>
                <div className="relative">
                  <svg viewBox="0 0 24 24" className={`w-5 h-5 ${currentUser?.is_premium ? 'text-yellow-400' : 'text-gray-600'}`} fill="currentColor">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                  {!currentUser?.is_premium && (
                    <svg viewBox="0 0 24 24" className="w-3 h-3 text-yellow-500 absolute -top-1 -right-1" fill="currentColor">
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                    </svg>
                  )}
                </div>
              </TinderBtn>

              <TinderBtn size="lg" onClick={() => pressSwipe('dislike')} disabled={isSwiping} title="Nope">
                <svg viewBox="0 0 24 24" className="w-8 h-8 text-rose-400" fill="none"
                  stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </TinderBtn>

              {/* Super Like — Premium only */}
              <TinderBtn size="sm" onClick={() => currentUser?.is_premium ? pressSwipe('like') : setShowUpgrade(true)} disabled={isSwiping} title={currentUser?.is_premium ? 'Super Like' : 'Super Like · Premium'}>
                <div className="relative">
                  <svg viewBox="0 0 24 24" className={`w-5 h-5 ${currentUser?.is_premium ? 'text-blue-400' : 'text-gray-600'}`} fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  {!currentUser?.is_premium && (
                    <svg viewBox="0 0 24 24" className="w-3 h-3 text-yellow-500 absolute -top-1 -right-1" fill="currentColor">
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                    </svg>
                  )}
                </div>
              </TinderBtn>

              <TinderBtn size="lg" onClick={() => pressSwipe('like')} disabled={isSwiping} title="Like">
                <svg viewBox="0 0 24 24" className="w-8 h-8 text-green-400" fill="currentColor">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </TinderBtn>

              <TinderBtn size="sm" onClick={() => {}} disabled={isSwiping} title="Message">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-sky-400" fill="currentColor">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
              </TinderBtn>
            </div>

            {/* Free swipe counter */}
            {!currentUser?.is_premium && (
              <p className="text-gray-700 text-[11px] mt-2 text-center">
                {Math.max(0, FREE_SWIPE_LIMIT - dailySwipesUsed)} free swipes left today
              </p>
            )}

            {/* Keyboard shortcut bar */}
            <div className="hidden md:flex items-center gap-2 mt-4 text-gray-600 text-[11px] select-none flex-wrap justify-center px-4">
              {[
                { label: 'Hide' },
                { key: '←', label: 'Nope' },
                { key: '↑', label: 'Like' },
                { label: 'Open Profile' },
                { label: 'Close Profile' },
                { key: '→', label: 'Super Like' },
                { label: 'Next Photo' },
              ].map((h, i) => (
                <span key={i} className="flex items-center gap-1">
                  {h.key && (
                    <kbd className="bg-white/5 border border-white/10 text-gray-500 px-1.5 py-0.5 rounded text-[11px] font-mono">{h.key}</kbd>
                  )}
                  <span className={`${h.key ? '' : 'bg-white/5 border border-white/10 px-2 py-0.5 rounded'} text-gray-500`}>{h.label}</span>
                  {i < 6 && <span className="text-gray-700 mx-0.5">|</span>}
                </span>
              ))}
            </div>
          </>
        )}
        </div>{/* end centered content */}
      </main>

      {/* Mobile bottom nav */}
      <div className="md:hidden">
        <Navbar />
      </div>

      {/* Incoming like toast */}
      {likeToast && (
        <div
          className="fixed top-4 inset-x-4 md:left-auto md:right-6 md:w-80 z-50 flex items-center gap-3 bg-gray-900 rounded-2xl shadow-2xl px-4 py-3 border border-white/10"
          style={{ animation: 'slideDown 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}
        >
          <img
            src={likeToast.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(likeToast.name)}&background=f43f5e&color=fff`}
            className="w-11 h-11 rounded-full object-cover flex-shrink-0 border-2 border-rose-500"
            alt={likeToast.name}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{likeToast.name} liked you!</p>
            <p className="text-xs text-gray-400">Tap to see who likes you</p>
          </div>
          <Link href="/matches" onClick={() => setLikeToast(null)}
            className="flex-shrink-0 bg-gradient-to-r from-rose-500 to-orange-400 text-white text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap">
            View
          </Link>
          <button onClick={() => setLikeToast(null)} className="flex-shrink-0 text-gray-600 hover:text-gray-300 ml-1">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      )}

      {match && <MatchModal match={match} onClose={() => setMatch(null)} />}

      {/* Upgrade modal */}
      {showUpgrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={() => setShowUpgrade(false)}>
          <div className="bg-[#0d0008] border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#f43f5e,#e11d48)' }}>
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Go Premium</h2>
            <p className="text-white/50 text-sm mb-6 leading-relaxed">
              Unlock unlimited swipes, see who liked you, super likes, boosts and more.
            </p>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
              <p className="text-3xl font-black text-white">₹100<span className="text-base font-normal text-white/50"> / week</span></p>
              <ul className="mt-3 space-y-1.5 text-left">
                {['Unlimited swipes','See who liked you','5 super likes / day','1 boost / week','Advanced filters','Priority ranking'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-white/70 text-xs">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 text-left">
              <p className="text-white/70 text-xs leading-relaxed">
                Payments are not live yet. To unlock Premium, contact the admin on Instagram and they will activate it for you manually.
              </p>
            </div>
            <a
              href="https://www.instagram.com/vectohm_sol?igsh=dnh4YzNxdGJiNHNq"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold py-3.5 rounded-2xl hover:opacity-90 transition-opacity text-sm mb-3">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
              </svg>
              Contact Admin on Instagram
            </a>
            <button onClick={() => setShowUpgrade(false)}
              className="text-gray-600 text-sm hover:text-gray-400 transition-colors">
              Maybe later
            </button>
          </div>
        </div>
      )}

      {viewingProfile && (
        <ProfileModal
          profile={viewingProfile}
          onClose={() => setViewingProfile(null)}
          onLike={() => { pressSwipe('like'); setViewingProfile(null) }}
          onPass={() => { pressSwipe('dislike'); setViewingProfile(null) }}
        />
      )}
    </div>
  )
}

function GoldBtn({ children, title }) {
  return (
    <button title={title}
      className="w-9 h-9 rounded-full bg-black/25 hover:bg-black/40 flex items-center justify-center text-white transition-colors">
      {children}
    </button>
  )
}

function TinderBtn({ size, onClick, disabled, children, title }) {
  return (
    <button title={title} onClick={onClick} disabled={disabled}
      className={`${size === 'lg' ? 'w-16 h-16' : 'w-12 h-12'}
        rounded-full bg-[#111] border border-white/10 flex items-center justify-center
        hover:scale-110 hover:border-white/25 hover:bg-[#1c1c1c] transition-all active:scale-90
        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-xl`}>
      {children}
    </button>
  )
}
