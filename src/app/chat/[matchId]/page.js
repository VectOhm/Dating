'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const STICKER_CATS = ['trending', 'love', 'funny', 'cute', 'sad']

function checkBlocked(text) {
  const phoneMatch = text.match(/\+?[\d][\d\s\-().]{7,18}[\d]/)
  if (phoneMatch && phoneMatch[0].replace(/\D/g, '').length >= 10)
    return 'Phone numbers cannot be shared for your safety.'
  if (/\b(instagram|snapchat|whatsapp|telegram|discord|facebook|twitter|tiktok|linkedin)\b/i.test(text))
    return 'Social media IDs cannot be shared for your safety.'
  if (/\b(ig|sc|wa|tg|fb|snap)\s*[:=@]\s*\S+/i.test(text))
    return 'Social media IDs cannot be shared for your safety.'
  if (/\b(t\.me|wa\.me|instagram\.com|snapchat\.com|discord\.gg|fb\.com|x\.com)\b/i.test(text))
    return 'External links cannot be shared for your safety.'
  return null
}

function previewMsg(content) {
  if (!content) return null
  if (content.startsWith('__gif__')) return 'GIF'
  if (content.startsWith('__sticker__')) return 'Sticker'
  return content
}

export default function ChatPage() {
  const { matchId } = useParams()
  const router = useRouter()

  const [messages, setMessages]       = useState([])
  const [input, setInput]             = useState('')
  const [sending, setSending]         = useState(false)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [myProfile, setMyProfile]     = useState(null)
  const [otherProfile, setOtherProfile] = useState(null)
  const [matchDate, setMatchDate]     = useState(null)
  const [sidebarMatches, setSidebarMatches] = useState([])
  const [sidebarTab, setSidebarTab]   = useState('messages')
  const [gifOpen, setGifOpen]         = useState(false)
  const [gifQuery, setGifQuery]       = useState('')
  const [gifs, setGifs]               = useState([])
  const [gifLoading, setGifLoading]   = useState(false)
  const [blockMsg, setBlockMsg]       = useState('')
  const [stickerOpen, setStickerOpen]       = useState(false)
  const [stickerTab, setStickerTab]         = useState('trending')
  const [stickers, setStickers]             = useState([])
  const [stickerLoading, setStickerLoading] = useState(false)


  const bottomRef    = useRef(null)
  const inputRef     = useRef(null)
  const channelRef   = useRef(null)
  const gifTimerRef  = useRef(null)
  const blockTimer   = useRef(null)


  useEffect(() => { if (gifOpen) fetchGifs('') }, [gifOpen])   // fetchGifs is stable (no captured state)
  useEffect(() => { if (stickerOpen) fetchStickers('') }, [stickerOpen]) // same

  async function fetchGifs(query) {
    setGifLoading(true)
    const key = process.env.NEXT_PUBLIC_GIPHY_KEY
    const url = query
      ? `https://api.giphy.com/v1/gifs/search?api_key=${key}&q=${encodeURIComponent(query)}&limit=18&rating=pg-13`
      : `https://api.giphy.com/v1/gifs/trending?api_key=${key}&limit=18&rating=pg-13`
    try {
      const res  = await fetch(url)
      const json = await res.json()
      setGifs(json.data ?? [])
    } catch { setGifs([]) }
    setGifLoading(false)
  }

  function onGifSearch(q) {
    setGifQuery(q)
    clearTimeout(gifTimerRef.current)
    gifTimerRef.current = setTimeout(() => fetchGifs(q), 400)
  }

  async function fetchStickers(query) {
    setStickerLoading(true)
    const key = process.env.NEXT_PUBLIC_GIPHY_KEY
    const url = (!query || query === 'trending')
      ? `https://api.giphy.com/v1/stickers/trending?api_key=${key}&limit=24&rating=pg-13`
      : `https://api.giphy.com/v1/stickers/search?api_key=${key}&q=${encodeURIComponent(query)}&limit=24&rating=pg-13`
    try {
      const res = await fetch(url)
      const json = await res.json()
      setStickers(json.data ?? [])
    } catch { setStickers([]) }
    setStickerLoading(false)
  }

  function onStickerTab(tab) {
    setStickerTab(tab)
    fetchStickers(tab === 'trending' ? '' : tab)
  }

  async function sendSticker(sticker) {
    const url = sticker.images.fixed_height.url
    setStickerOpen(false); setStickerTab('trending')
    const supabase = createClient()
    const { data: newMsg } = await supabase.from('messages')
      .insert({ match_id: matchId, sender_id: currentUserId, content: `__sticker__${url}` })
      .select().single()
    if (newMsg) setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg])
  }

  async function sendGif(gif) {
    const url = gif.images.fixed_height.url
    setGifOpen(false)
    setGifQuery('')
    const supabase = createClient()
    const { data: newMsg } = await supabase.from('messages')
      .insert({ match_id: matchId, sender_id: currentUserId, content: `__gif__${url}` })
      .select().single()
    if (newMsg) {
      setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg])
    }
  }

  useEffect(() => {
    const supabase = createClient()

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setCurrentUserId(user.id)

      // Fetch current user's profile (for sidebar header avatar)
      const { data: me } = await supabase
        .from('profiles').select('name,avatar_url').eq('id', user.id).single()
      setMyProfile(me)

      // This match
      const { data: matchData } = await supabase
        .from('matches')
        .select(`
          id, user1_id, user2_id, created_at,
          user1:profiles!matches_user1_id_fkey(id, name, age, avatar_url, bio, gender, interested_in),
          user2:profiles!matches_user2_id_fkey(id, name, age, avatar_url, bio, gender, interested_in)
        `)
        .eq('id', matchId).maybeSingle()

      if (!matchData || (matchData.user1_id !== user.id && matchData.user2_id !== user.id)) {
        router.push('/matches'); return
      }

      const other = matchData.user1_id === user.id ? matchData.user2 : matchData.user1
      setOtherProfile(other)
      setMatchDate(matchData.created_at)

      // Messages for this chat
      const { data: msgs } = await supabase
        .from('messages').select('*').eq('match_id', matchId)
        .order('created_at', { ascending: true })
      setMessages(msgs ?? [])

      // All matches for sidebar list
      const { data: allMatches } = await supabase
        .from('matches')
        .select('id, user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (allMatches?.length) {
        const items = await Promise.all(
          allMatches.map(async m => {
            const otherId = m.user1_id === user.id ? m.user2_id : m.user1_id
            const [{ data: prof }, { data: msg }] = await Promise.all([
              supabase.from('profiles').select('id,name,avatar_url').eq('id', otherId).single(),
              supabase.from('messages').select('content,sender_id')
                .eq('match_id', m.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
            ])
            return { matchId: m.id, profile: prof, lastMsg: msg?.content ?? null, isFromMe: msg?.sender_id === user.id }
          })
        )
        setSidebarMatches(items.filter(i => i.profile))
      }

      // Realtime subscription — clean up any previous channel first
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      // No server-side filter — match_id is not primary key so Supabase
      // drops filtered events unless REPLICA IDENTITY FULL is set.
      // We filter client-side instead; RLS still restricts which rows arrive.
      channelRef.current = supabase
        .channel(`messages-${matchId}-${Date.now()}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'messages',
        }, (payload) => {
          if (payload.new.match_id !== matchId) return
          setMessages(prev =>
            prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new]
          )
        })
        .subscribe()
    }

    init()
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [matchId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function showBlock(reason) {
    setBlockMsg(reason)
    clearTimeout(blockTimer.current)
    blockTimer.current = setTimeout(() => setBlockMsg(''), 4000)
  }

  async function sendMessage(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || sending) return
    const blocked = checkBlocked(text)
    if (blocked) { showBlock(blocked); return }
    setInput('')
    setSending(true)
    const supabase = createClient()
    const { data: newMsg } = await supabase
      .from('messages')
      .insert({ match_id: matchId, sender_id: currentUserId, content: text })
      .select().single()
    // Add the real message immediately (realtime event will also fire — dedup handles it)
    if (newMsg) {
      setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg])
    }
    setSending(false)
    inputRef.current?.focus()
  }

  const matchDateStr = matchDate
    ? new Date(matchDate).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
    : ''

  const myAvatarSrc = myProfile?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(myProfile?.name ?? 'Me')}&background=f43f5e&color=fff`
  const otherAvatarSrc = otherProfile?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(otherProfile?.name ?? '?')}&background=f43f5e&color=fff`

  const listItems = sidebarTab === 'messages'
    ? sidebarMatches.filter(s => s.lastMsg !== null)
    : sidebarMatches

  return (
    <div className="flex bg-black text-white overflow-hidden" style={{ height: '100dvh' }}>

      {/* ══ LEFT SIDEBAR ══ */}
      <aside className="hidden md:flex w-[300px] flex-shrink-0 flex-col border-r border-white/10">

        {/* Golden gradient header */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316,#dc2626)' }}>
          <Link href="/discover">
            <img src={myAvatarSrc}
              className="w-10 h-10 rounded-full object-cover border-2 border-white/60 hover:opacity-90 transition-opacity"
              alt="me" />
          </Link>
          <div className="flex items-center gap-1.5">
            {[
              { title: 'Boost', path: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z', fill: true },
              { title: 'Discover', path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z', fill: true },
              { title: 'Matches', path: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', fill: false },
              { title: 'Safety', path: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', fill: false },
            ].map(btn => (
              <button key={btn.title} title={btn.title}
                className="w-9 h-9 rounded-full bg-black/25 hover:bg-black/40 flex items-center justify-center text-white transition-colors">
                <svg viewBox="0 0 24 24" className="w-4 h-4"
                  fill={btn.fill ? 'currentColor' : 'none'}
                  stroke={btn.fill ? 'none' : 'currentColor'} strokeWidth={2}>
                  <path d={btn.path}/>
                </svg>
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 flex-shrink-0">
          {['matches', 'messages'].map(t => (
            <button key={t} onClick={() => setSidebarTab(t)}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors
                ${sidebarTab === t ? 'text-white border-b-2 border-rose-500' : 'text-gray-500 hover:text-gray-300'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {listItems.length === 0 && (
            <p className="text-gray-600 text-xs text-center pt-8 px-4">
              {sidebarTab === 'messages' ? 'No messages yet.' : 'No matches yet.'}
            </p>
          )}
          {listItems.map(item => {
            const isActive = item.matchId === matchId
            return (
              <Link key={item.matchId} href={`/chat/${item.matchId}`}>
                <div className={`flex items-center gap-3 px-4 py-3 border-b border-white/5 transition-colors
                  ${isActive ? 'bg-white/10 border-l-4 border-l-rose-500' : 'hover:bg-white/5'}`}>
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
              </Link>
            )
          })}
        </div>
      </aside>

      {/* ══ MIDDLE: CHAT ══ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Chat header */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10 flex-shrink-0 bg-black">
          <Link href="/discover"
            className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors flex-shrink-0 group">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            <span className="text-xs font-semibold hidden sm:inline">Discover</span>
          </Link>
          <img src={otherAvatarSrc}
            className="w-10 h-10 rounded-full object-cover border border-white/20 flex-shrink-0"
            alt={otherProfile?.name} />
          <p className="flex-1 text-gray-400 text-sm min-w-0 truncate">
            You matched with <span className="text-white font-semibold">{otherProfile?.name}</span> on {matchDateStr}
          </p>
          <button className="text-gray-500 hover:text-white transition-colors px-1">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
            </svg>
          </button>
        </header>

        {/* Messages area */}
        <main className="flex-1 overflow-y-auto px-6 py-6 space-y-1">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-600">
              <div className="w-12 h-12 bg-white/5 border border-white/8 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <p className="text-sm">Say something to {otherProfile?.name}!</p>
            </div>
          )}
          {messages.map((msg, i) => {
            const isMe = msg.sender_id === currentUserId
            const prev = messages[i - 1]
            const showAvatar = !isMe && (!prev || prev.sender_id !== msg.sender_id)
            return (
              <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                {/* Other user avatar */}
                {!isMe && (
                  <div className="w-7 h-7 flex-shrink-0">
                    {showAvatar && (
                      <img src={otherAvatarSrc} className="w-7 h-7 rounded-full object-cover" alt="" />
                    )}
                  </div>
                )}
                <div className="flex flex-col">
                  <div className={`rounded-2xl text-sm leading-relaxed max-w-[280px] break-words overflow-hidden ${
                    (msg.content.startsWith('__gif__') || msg.content.startsWith('__sticker__'))
                      ? ''
                      : isMe
                        ? 'bg-blue-500 text-white rounded-br-sm px-4 py-2.5'
                        : 'bg-[#222] text-white rounded-bl-sm px-4 py-2.5'
                  }`}>
                    {msg.content.startsWith('__gif__')
                      ? <img src={msg.content.slice(7)} alt="GIF" className="rounded-2xl max-w-full" />
                      : msg.content.startsWith('__sticker__')
                        ? <img src={msg.content.slice(11)} alt="Sticker" className="max-w-[160px] rounded-xl" style={{ background: 'transparent' }} />
                        : msg.content}
                  </div>
                  {isMe && (
                    <p className="text-[10px] text-gray-600 mt-1 text-right">Sent</p>
                  )}
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </main>

        {/* GIF Picker */}
        {gifOpen && (
          <div className="border-t border-white/10 bg-[#0d0d0d] flex-shrink-0" style={{ height: 300 }}>
            {/* Search bar */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                type="text"
                value={gifQuery}
                onChange={e => onGifSearch(e.target.value)}
                placeholder="Search GIFs…"
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
                autoFocus
              />
              <button type="button" onClick={() => setGifOpen(false)} className="text-gray-500 hover:text-white">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            {/* GIF grid */}
            <div className="overflow-y-auto grid grid-cols-3 gap-1 p-2" style={{ height: 248 }}>
              {gifLoading && (
                <div className="col-span-3 flex items-center justify-center h-full text-gray-600 text-sm">
                  Loading…
                </div>
              )}
              {!gifLoading && gifs.map(gif => (
                <button key={gif.id} type="button" onClick={() => sendGif(gif)}
                  className="rounded-lg overflow-hidden hover:opacity-80 transition-opacity bg-gray-900 flex-shrink-0"
                  style={{ height: 120 }}>
                  <img
                    src={gif.images.fixed_height_small.url}
                    alt={gif.title}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
              {!gifLoading && gifs.length === 0 && (
                <div className="col-span-3 flex items-center justify-center h-full text-gray-600 text-sm">
                  No GIFs found
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sticker Picker */}
        {stickerOpen && (
          <div className="border-t border-white/10 bg-[#0d0d0d] flex-shrink-0" style={{ height: 320 }}>
            <div className="flex items-center border-b border-white/10 overflow-x-auto">
              {STICKER_CATS.map(cat => (
                <button key={cat} type="button" onClick={() => onStickerTab(cat)}
                  className={`px-3 py-2 text-xs font-bold capitalize whitespace-nowrap transition-colors flex-shrink-0
                    ${stickerTab === cat ? 'text-white border-b-2 border-rose-500' : 'text-gray-500 hover:text-gray-300'}`}>
                  {cat}
                </button>
              ))}
              <div className="flex-1" />
              <button type="button" onClick={() => setStickerOpen(false)} className="text-gray-500 hover:text-white px-3">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto grid grid-cols-4 gap-1 p-2" style={{ height: 278 }}>
              {stickerLoading
                ? <div className="col-span-4 flex items-center justify-center text-gray-600 text-sm">Loading…</div>
                : stickers.length === 0
                  ? <div className="col-span-4 flex items-center justify-center text-gray-600 text-sm">No stickers found</div>
                  : stickers.map(s => (
                    <button key={s.id} type="button" onClick={() => sendSticker(s)}
                      className="rounded-xl overflow-hidden hover:opacity-80 transition-opacity flex-shrink-0"
                      style={{ height: 90, background: 'transparent' }}>
                      <img src={s.images.fixed_height_small.url} alt={s.title} className="w-full h-full object-contain" />
                    </button>
                  ))
              }
            </div>
          </div>
        )}

        {/* Block warning */}
        {blockMsg && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-rose-950/80 border-t border-rose-500/30 flex-shrink-0">
            <span className="text-rose-300 text-xs leading-snug">{blockMsg}</span>
          </div>
        )}

        {/* Input bar */}
        <form onSubmit={sendMessage} autoComplete="off"
          className="flex items-center gap-2 px-4 py-3 border-t border-white/10 bg-black flex-shrink-0">
          <button type="button" onClick={() => { setGifOpen(o => !o); setStickerOpen(false) }}
            className={`text-xs font-black tracking-wider border rounded px-1.5 py-0.5 transition-colors flex-shrink-0
              ${gifOpen ? 'border-rose-500 text-rose-400' : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'}`}>
            GIF
          </button>
          <button type="button" onClick={() => { setStickerOpen(o => !o); setGifOpen(false) }}
            title="Stickers"
            className={`transition-colors flex-shrink-0 ${stickerOpen ? 'text-rose-400' : 'text-gray-600 hover:text-gray-400'}`}>
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.74 0 3-.44 4.26-1.18L21 21l-.82-5.26C20.56 14.56 22 13.3 22 12c0-5.52-4.48-10-10-10z"/>
              <circle cx="8.5" cy="10.5" r="1" fill="currentColor" stroke="none"/>
              <circle cx="15.5" cy="10.5" r="1" fill="currentColor" stroke="none"/>
              <path d="M8.5 14.5s1 2 3.5 2 3.5-2 3.5-2"/>
            </svg>
          </button>
          <button type="button" className="text-gray-600 hover:text-gray-400 transition-colors flex-shrink-0" title="Voice message">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </button>

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a message"
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none min-w-0"
            autoComplete="off"
          />

          <button type="button" className="text-gray-600 hover:text-gray-400 transition-colors flex-shrink-0" title="Emoji">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L12 15.45 7.77 18l1.12-4.81-3.73-3.23 4.92-.42L12 5l1.92 4.53 4.92.42-3.73 3.23L16.23 18z"/>
            </svg>
          </button>
          <button type="submit" disabled={!input.trim() || sending}
            className="text-rose-400 font-black text-sm tracking-wider hover:text-rose-300 transition-colors disabled:opacity-30 flex-shrink-0">
            SEND
          </button>
        </form>
      </div>

      {/* ══ RIGHT: PROFILE PANEL ══ */}
      <aside className="hidden lg:flex w-[360px] flex-shrink-0 flex-col border-l border-white/10 overflow-y-auto bg-black">

        {/* Name header */}
        <div className="px-5 py-4 flex-shrink-0 border-b border-white/10">
          <h2 className="text-2xl font-black text-white">
            {otherProfile?.name}
            {otherProfile?.age && <span className="font-light ml-2 text-white/70">{otherProfile.age}</span>}
          </h2>
        </div>

        {/* Photo */}
        <div className="relative flex-shrink-0" style={{ height: 460 }}>
          <img src={otherAvatarSrc}
            className="w-full h-full object-cover"
            alt={otherProfile?.name} />
          {/* Photo strip at top */}
          <div className="absolute top-0 inset-x-0 h-1 flex gap-0.5 px-2 pt-2">
            <div className="flex-1 h-0.5 bg-white rounded-full opacity-80" />
          </div>
          {/* Nav arrows */}
          <button className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <button className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

        {/* Profile details */}
        <div className="px-5 py-5 space-y-5">

          {/* Looking for */}
          {otherProfile?.interested_in && (
            <div>
              <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wider font-bold mb-2">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                Looking for
              </div>
              <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                <span className="text-xl">💕</span>
                <span className="text-white font-semibold capitalize text-sm">{otherProfile.interested_in}</span>
              </div>
            </div>
          )}

          {/* Gender */}
          {otherProfile?.gender && (
            <div>
              <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wider font-bold mb-2">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                </svg>
                Identity
              </div>
              <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                <span className="text-xl">🧬</span>
                <span className="text-white font-semibold capitalize text-sm">{otherProfile.gender}</span>
              </div>
            </div>
          )}

          {/* About me / Bio */}
          {otherProfile?.bio && (
            <div>
              <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wider font-bold mb-2">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                  <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>
                </svg>
                About me
              </div>
              <p className="text-white/80 text-sm leading-relaxed bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                {otherProfile.bio}
              </p>
            </div>
          )}

          {!otherProfile?.bio && !otherProfile?.interested_in && !otherProfile?.gender && (
            <p className="text-gray-600 text-sm text-center py-4">No profile details yet.</p>
          )}
        </div>
      </aside>
    </div>
  )
}
