'use client'
import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'

const THRESHOLD = 80

const SwipeCard = forwardRef(function SwipeCard({ profile, onSwipe, onViewProfile, isTop, stackIndex, distance }, ref) {
  const [pos, setPos]         = useState({ x: 0, y: 0, rotate: 0 })
  const [leaving, setLeaving] = useState(false)
  const leavingRef  = useRef(false)
  const dragging    = useRef(false)
  const startX      = useRef(0)
  const startY      = useRef(0)
  const onSwipeRef  = useRef(onSwipe)
  const isTopRef    = useRef(isTop)
  const cardRef     = useRef(null)
  const timerRef    = useRef(null)

  onSwipeRef.current = onSwipe
  isTopRef.current   = isTop

  useEffect(() => {
    return () => { clearTimeout(timerRef.current) }
  }, [])

  useImperativeHandle(ref, () => ({
    swipe(direction) {
      if (leavingRef.current) return
      leavingRef.current = true
      setLeaving(true)
      const right = direction === 'like'
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setPos({ x: right ? 1100 : -1100, y: 60, rotate: right ? 45 : -45 })
      }))
      timerRef.current = setTimeout(() => onSwipeRef.current(direction), 450)
    },
  }))

  // Native non-passive touch listeners — React's synthetic touch events are passive
  // in newer versions, so preventDefault() silently fails and the browser captures
  // the gesture before our handlers can respond on the second card.
  useEffect(() => {
    const el = cardRef.current
    if (!el) return

    function onTouchStart(e) {
      if (!isTopRef.current || leavingRef.current) return
      dragging.current = true
      startX.current   = e.touches[0].clientX
      startY.current   = e.touches[0].clientY
    }

    function onTouchMove(e) {
      if (!dragging.current) return
      e.preventDefault()
      const dx = e.touches[0].clientX - startX.current
      const dy = e.touches[0].clientY - startY.current
      setPos({ x: dx, y: dy * 0.2, rotate: dx * 0.07 })
    }

    function onTouchEnd() {
      if (!dragging.current) return
      dragging.current = false
      setPos(prev => {
        if (Math.abs(prev.x) > THRESHOLD) {
          if (leavingRef.current) return prev
          leavingRef.current = true
          setLeaving(true)
          const dir = prev.x > 0 ? 'like' : 'dislike'
          timerRef.current = setTimeout(() => onSwipeRef.current(dir), 400)
          return { x: prev.x > 0 ? 1100 : -1100, y: 60, rotate: prev.x > 0 ? 45 : -45 }
        }
        return { x: 0, y: 0, rotate: 0 }
      })
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove',  onTouchMove,  { passive: false })
    el.addEventListener('touchend',   onTouchEnd,   { passive: true })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove',  onTouchMove)
      el.removeEventListener('touchend',   onTouchEnd)
    }
  }, []) // empty — all values accessed via refs

  // Mouse drag (desktop)
  function getXY(e) {
    return { x: e.clientX, y: e.clientY }
  }

  function onMouseDown(e) {
    if (!isTop || leavingRef.current) return
    const { x, y } = getXY(e)
    dragging.current = true
    startX.current   = x
    startY.current   = y
  }

  function onMouseMove(e) {
    if (!dragging.current) return
    const { x, y } = getXY(e)
    setPos({ x: x - startX.current, y: (y - startY.current) * 0.2, rotate: (x - startX.current) * 0.07 })
  }

  function onMouseUp() {
    if (!dragging.current) return
    dragging.current = false
    setPos(prev => {
      if (Math.abs(prev.x) > THRESHOLD) {
        if (leavingRef.current) return prev
        leavingRef.current = true
        setLeaving(true)
        const dir = prev.x > 0 ? 'like' : 'dislike'
        timerRef.current = setTimeout(() => onSwipeRef.current(dir), 400)
        return { x: prev.x > 0 ? 1100 : -1100, y: 60, rotate: prev.x > 0 ? 45 : -45 }
      }
      return { x: 0, y: 0, rotate: 0 }
    })
  }

  const likeOpacity = Math.min(1, Math.max(0, pos.x / 80))
  const nopeOpacity = Math.min(1, Math.max(0, -pos.x / 80))
  const scale = isTop ? 1 : Math.max(0.88, 1 - stackIndex * 0.05)
  const bgY   = isTop ? 0 : stackIndex * 10

  return (
    <div
      ref={cardRef}
      className="absolute inset-0"
      style={{
        transform: isTop
          ? `translateX(${pos.x}px) translateY(${pos.y}px) rotate(${pos.rotate}deg)`
          : `scale(${scale}) translateY(${bgY}px)`,
        transition: isTop && !dragging.current
          ? 'transform 0.4s cubic-bezier(0.25,1,0.5,1)'
          : 'none',
        zIndex:          isTop ? 20 : 20 - stackIndex,
        cursor:          isTop ? (dragging.current ? 'grabbing' : 'grab') : 'default',
        transformOrigin: 'center center',
        willChange:      'transform',
        userSelect:      'none',
        touchAction:     'none',
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <div className="w-full h-full rounded-[20px] overflow-hidden shadow-2xl relative bg-gray-900 select-none">
        <img
          src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&size=800&background=f43f5e&color=fff`}
          alt={profile.name}
          className="w-full h-full object-cover pointer-events-none"
          draggable={false}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent pointer-events-none" />

        {/* LIKE stamp */}
        <div className="absolute top-10 left-6 border-4 border-emerald-400 px-3 py-1.5 rounded-xl pointer-events-none"
          style={{ opacity: likeOpacity, transform: 'rotate(-25deg)' }}>
          <span className="text-emerald-400 font-black text-2xl tracking-widest">LIKE</span>
        </div>

        {/* NOPE stamp */}
        <div className="absolute top-10 right-6 border-4 border-rose-500 px-3 py-1.5 rounded-xl pointer-events-none"
          style={{ opacity: nopeOpacity, transform: 'rotate(25deg)' }}>
          <span className="text-rose-500 font-black text-2xl tracking-widest">NOPE</span>
        </div>

        {/* Card info */}
        <div className="absolute bottom-0 inset-x-0 p-5 pb-6 pointer-events-none">
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <h2 className="text-white text-3xl font-black leading-none">{profile.name}</h2>
                <span className="text-white text-2xl font-light">{profile.age}</span>
              </div>
              {distance != null && (
                <p className="text-white/70 text-sm mt-1 flex items-center gap-1">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  {distance < 1 ? 'Less than 1 km away' : `${distance} km away`}
                </p>
              )}
              {profile.bio && (
                <p className="text-white/70 text-sm leading-snug line-clamp-2 mt-1.5 max-w-[240px]">{profile.bio}</p>
              )}
            </div>
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onViewProfile?.(profile) }}
              className="pointer-events-auto w-10 h-10 rounded-full border-2 border-white/80 flex items-center justify-center flex-shrink-0 mb-1 hover:bg-white/20 transition-colors active:scale-95">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
                <circle cx="12" cy="7" r="1.5"/>
                <rect x="11" y="11" width="2" height="8" rx="1"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

export default SwipeCard
