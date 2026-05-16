'use client'
import { useEffect } from 'react'

export default function ProfileModal({ profile, onLike, onPass, onClose }) {
  // Close on Escape key
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!profile) return null

  const src = profile.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=f43f5e&color=fff&size=800`

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet / Modal */}
      <div className="relative w-full md:w-[420px] bg-[#111] rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl border border-white/10 z-10"
        style={{ maxHeight: '92dvh' }}>

        {/* Photo */}
        <div className="relative w-full" style={{ height: 380 }}>
          <img src={src} alt={profile.name} className="w-full h-full object-cover" />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent" />

          {/* Close button */}
          <button onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>

          {/* Recently Active badge */}
          <div className="absolute bottom-4 left-5 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-400 flex-shrink-0" />
            <span className="text-white/80 text-xs font-medium">Recently Active</span>
          </div>
        </div>

        {/* Info */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-black text-white leading-tight">
                {profile.name}
                {profile.age ? <span className="font-light ml-2 text-white/80">{profile.age}</span> : ''}
              </h2>
            </div>
            {/* Heart badge — they liked you */}
            <div className="w-10 h-10 bg-rose-500/20 border border-rose-500/40 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-rose-400" fill="currentColor">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-3">
            {profile.gender && (
              <span className="bg-white/10 text-white/80 text-xs font-semibold px-3 py-1.5 rounded-full capitalize border border-white/10">
                {profile.gender}
              </span>
            )}
            {profile.interested_in && (
              <span className="bg-white/10 text-white/80 text-xs font-semibold px-3 py-1.5 rounded-full capitalize border border-white/10">
                Likes {profile.interested_in}
              </span>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">About</p>
              <p className="text-white/80 text-sm leading-relaxed">{profile.bio}</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 px-5 pt-4 pb-6">
          <button onClick={onPass}
            className="flex-1 flex items-center justify-center gap-2 bg-white/10 border border-white/15 text-white font-bold py-3.5 rounded-2xl hover:bg-white/15 active:scale-95 transition-all text-sm">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
            Pass
          </button>
          <button onClick={onLike}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-orange-400 text-white font-bold py-3.5 rounded-2xl hover:opacity-90 active:scale-95 transition-all text-sm shadow-lg">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            Like Back
          </button>
        </div>
      </div>
    </div>
  )
}
