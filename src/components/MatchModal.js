'use client'
import Link from 'next/link'

export default function MatchModal({ match, onClose }) {
  if (!match) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Card */}
      <div
        className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        {/* Gradient header */}
        <div className="bg-gradient-to-br from-rose-500 to-orange-400 pt-10 pb-6 px-6 text-center">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="currentColor">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </div>
          <h2 className="text-3xl font-black text-white">It's a Match!</h2>
          <p className="text-white/80 text-sm mt-1">You both liked each other</p>

          {/* Avatar pair */}
          <div className="flex justify-center items-center gap-3 mt-5">
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg">
              <img
                src={match.myAvatar || `https://ui-avatars.com/api/?name=You&background=fff&color=f43f5e`}
                alt="You"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="w-8 h-8 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-white drop-shadow" fill="currentColor">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </div>
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg">
              <img
                src={match.profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(match.profile.name)}&background=fff&color=f43f5e`}
                alt={match.profile.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-5 space-y-3">
          <p className="text-center text-gray-500 text-sm">
            Start chatting with <span className="font-bold text-gray-800">{match.profile.name}</span>
          </p>
          <Link
            href={`/chat/${match.id}`}
            className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-rose-500 to-orange-400 text-white font-bold py-3.5 rounded-2xl hover:opacity-90 transition-opacity text-sm"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Send a message
          </Link>
          <button
            onClick={onClose}
            className="w-full border-2 border-gray-100 text-gray-500 font-semibold py-3 rounded-2xl hover:bg-gray-50 transition-colors text-sm"
          >
            Keep swiping
          </button>
        </div>

        <style>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(60px) scale(0.95); }
            to   { opacity: 1; transform: translateY(0)    scale(1); }
          }
        `}</style>
      </div>
    </div>
  )
}
