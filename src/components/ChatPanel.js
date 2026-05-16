'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'

const STICKER_CATS = ['trending', 'love', 'funny', 'cute', 'sad']

function checkBlocked(text) {
  // Phone number: 10+ digits in a compact span
  const phoneMatch = text.match(/\+?[\d][\d\s\-().]{7,18}[\d]/)
  if (phoneMatch && phoneMatch[0].replace(/\D/g, '').length >= 10)
    return 'Phone numbers cannot be shared for your safety.'
  // Social platform names
  if (/\b(instagram|snapchat|whatsapp|telegram|discord|facebook|twitter|tiktok|linkedin)\b/i.test(text))
    return 'Social media IDs cannot be shared for your safety.'
  // Short-form handle sharing: "ig:", "sc:", "wa:", etc.
  if (/\b(ig|sc|wa|tg|fb|snap)\s*[:=@]\s*\S+/i.test(text))
    return 'Social media IDs cannot be shared for your safety.'
  // Social / messaging URLs
  if (/\b(t\.me|wa\.me|instagram\.com|snapchat\.com|discord\.gg|fb\.com|x\.com)\b/i.test(text))
    return 'External links cannot be shared for your safety.'
  return null
}

export default function ChatPanel({ matchId, matchDate, currentUserId, otherProfile, onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [sending, setSending]   = useState(false)
  const [gifOpen, setGifOpen]   = useState(false)
  const [gifQuery, setGifQuery] = useState('')
  const [gifs, setGifs]         = useState([])
  const [gifLoading, setGifLoading] = useState(false)
  const [stickerOpen, setStickerOpen]       = useState(false)
  const [stickerTab, setStickerTab]         = useState('trending')
  const [stickers, setStickers]             = useState([])
  const [stickerLoading, setStickerLoading] = useState(false)

  const [blockMsg, setBlockMsg] = useState('')

  const bottomRef    = useRef(null)
  const inputRef     = useRef(null)
  const channelRef   = useRef(null)
  const gifTimer     = useRef(null)
  const blockTimer   = useRef(null)

  // Load messages + subscribe whenever matchId changes
  useEffect(() => {
    if (!matchId) return
    const supabase = createClient()
    setMessages([])

    supabase.from('messages').select('*').eq('match_id', matchId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages(data ?? []))

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    channelRef.current = supabase
      .channel(`cp-${matchId}-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.new.match_id !== matchId) return
          setMessages(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new])
        })
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [matchId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => { if (gifOpen) fetchGifs('') }, [gifOpen])       // fetchGifs is stable (no captured state)
  useEffect(() => { if (stickerOpen) fetchStickers('') }, [stickerOpen]) // same

  async function fetchGifs(query) {
    setGifLoading(true)
    const key = process.env.NEXT_PUBLIC_GIPHY_KEY
    const url = query
      ? `https://api.giphy.com/v1/gifs/search?api_key=${key}&q=${encodeURIComponent(query)}&limit=18&rating=pg-13`
      : `https://api.giphy.com/v1/gifs/trending?api_key=${key}&limit=18&rating=pg-13`
    try {
      const { data } = await (await fetch(url)).json()
      setGifs(data ?? [])
    } catch { setGifs([]) }
    setGifLoading(false)
  }

  function onGifSearch(q) {
    setGifQuery(q)
    clearTimeout(gifTimer.current)
    gifTimer.current = setTimeout(() => fetchGifs(q), 400)
  }

  async function fetchStickers(query) {
    setStickerLoading(true)
    const key = process.env.NEXT_PUBLIC_GIPHY_KEY
    const url = (!query || query === 'trending')
      ? `https://api.giphy.com/v1/stickers/trending?api_key=${key}&limit=24&rating=pg-13`
      : `https://api.giphy.com/v1/stickers/search?api_key=${key}&q=${encodeURIComponent(query)}&limit=24&rating=pg-13`
    try {
      const { data } = await (await fetch(url)).json()
      setStickers(data ?? [])
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
    const { data: msg } = await supabase.from('messages')
      .insert({ match_id: matchId, sender_id: currentUserId, content: `__sticker__${url}` })
      .select().single()
    if (msg) setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
  }

  async function sendGif(gif) {
    const url = gif.images.fixed_height.url
    setGifOpen(false); setGifQuery('')
    const supabase = createClient()
    const { data: msg } = await supabase.from('messages')
      .insert({ match_id: matchId, sender_id: currentUserId, content: `__gif__${url}` })
      .select().single()
    if (msg) setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
  }

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
    const { data: msg } = await supabase.from('messages')
      .insert({ match_id: matchId, sender_id: currentUserId, content: text })
      .select().single()
    if (msg) setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
    setSending(false)
    inputRef.current?.focus()
  }

  const otherSrc = otherProfile?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(otherProfile?.name ?? '?')}&background=f43f5e&color=fff`
  const dateStr = matchDate
    ? new Date(matchDate).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
    : ''

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-black">

      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10 flex-shrink-0">
        <img src={otherSrc} className="w-10 h-10 rounded-full object-cover border border-white/20 flex-shrink-0" alt="" />
        <p className="flex-1 text-gray-500 text-sm truncate min-w-0">
          You matched with <span className="text-white font-semibold">{otherProfile?.name}</span> on {dateStr}
        </p>
        <button className="text-gray-600 hover:text-white transition-colors px-1">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
            <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
          </svg>
        </button>
        <button onClick={onClose}
          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-colors flex-shrink-0">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 text-center">
            <div className="w-12 h-12 bg-white/5 border border-white/8 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <p className="text-sm">Say something to {otherProfile?.name}!</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe     = msg.sender_id === currentUserId
          const prev     = messages[i - 1]
          const showAvatar = !isMe && (!prev || prev.sender_id !== msg.sender_id)
          const isGif     = msg.content.startsWith('__gif__')
          const isSticker = msg.content.startsWith('__sticker__')
          const isMedia   = isGif || isSticker
          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className="w-7 flex-shrink-0">
                {!isMe && showAvatar && (
                  <img src={otherSrc} className="w-7 h-7 rounded-full object-cover" alt="" />
                )}
              </div>
              <div className="flex flex-col max-w-[280px]">
                <div className={`rounded-2xl text-sm leading-relaxed break-words overflow-hidden ${
                  isMedia ? '' : isMe
                    ? 'bg-blue-500 text-white rounded-br-sm px-4 py-2.5'
                    : 'bg-[#222] text-white rounded-bl-sm px-4 py-2.5'
                }`}>
                  {isGif
                    ? <img src={msg.content.slice(7)} alt="GIF" className="rounded-2xl max-w-full" />
                    : isSticker
                      ? <img src={msg.content.slice(11)} alt="Sticker" className="max-w-[160px] rounded-xl" style={{ background: 'transparent' }} />
                      : msg.content}
                </div>
                {isMe && <p className="text-[10px] text-gray-600 mt-1 text-right">Sent</p>}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </main>

      {/* GIF Picker */}
      {gifOpen && (
        <div className="border-t border-white/10 bg-[#0d0d0d] flex-shrink-0" style={{ height: 300 }}>
          <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input type="text" value={gifQuery} onChange={e => onGifSearch(e.target.value)}
              placeholder="Search GIFs…" autoFocus
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none" />
            <button type="button" onClick={() => setGifOpen(false)} className="text-gray-500 hover:text-white">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div className="overflow-y-auto grid grid-cols-3 gap-1 p-2" style={{ height: 248 }}>
            {gifLoading
              ? <div className="col-span-3 flex items-center justify-center text-gray-600 text-sm">Loading…</div>
              : gifs.length === 0
                ? <div className="col-span-3 flex items-center justify-center text-gray-600 text-sm">No GIFs found</div>
                : gifs.map(gif => (
                  <button key={gif.id} type="button" onClick={() => sendGif(gif)}
                    className="rounded-lg overflow-hidden hover:opacity-80 transition-opacity bg-gray-900 flex-shrink-0"
                    style={{ height: 120 }}>
                    <img src={gif.images.fixed_height_small.url} alt={gif.title} className="w-full h-full object-cover" />
                  </button>
                ))
            }
          </div>
        </div>
      )}

      {/* Sticker Picker */}
      {stickerOpen && (
        <div className="border-t border-white/10 bg-[#0d0d0d] flex-shrink-0" style={{ height: 320 }}>
          {/* Category tabs */}
          <div className="flex items-center gap-0 border-b border-white/10 overflow-x-auto">
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
          {/* Grid */}
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
        className="flex items-center gap-2 px-4 py-3 border-t border-white/10 flex-shrink-0">
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
        <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
          placeholder="Type a message" autoComplete="off"
          className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none min-w-0" />
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
  )
}
