'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats]       = useState(null)
  const [users, setUsers]       = useState([])
  const [total, setTotal]       = useState(0)
  const [pages, setPages]       = useState(1)
  const [page, setPage]         = useState(1)
  const [search, setSearch]     = useState('')
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [adminUser, setAdminUser] = useState(null)
  const [tab, setTab]           = useState('overview')

  useEffect(() => {
    async function checkAdmin() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/admin'); return }
      const { data: profile } = await supabase.from('profiles').select('name, avatar_url, is_admin').eq('id', user.id).single()
      if (!profile?.is_admin) { router.replace('/admin'); return }
      setAdminUser({ ...user, ...profile })
    }
    checkAdmin()
  }, [router])

  useEffect(() => {
    if (!adminUser) return
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(d => { setStats(d); setLoadingStats(false) })
  }, [adminUser])

  const fetchUsers = useCallback(() => {
    if (!adminUser) return
    setLoadingUsers(true)
    fetch(`/api/admin/users?page=${page}&search=${encodeURIComponent(search)}`)
      .then(r => r.json())
      .then(d => {
        setUsers(d.users || [])
        setTotal(d.total || 0)
        setPages(d.pages || 1)
        setLoadingUsers(false)
      })
  }, [adminUser, page, search])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function toggleBan(userId, currentBanned) {
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, is_banned: !currentBanned }),
    })
    fetchUsers()
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/admin')
  }

  if (!adminUser) {
    return (
      <div className="min-h-screen bg-[#080010] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-rose-500/30 border-t-rose-500 animate-spin" />
      </div>
    )
  }

  const statCards = stats ? [
    { label: 'Total Users',      value: stats.totalUsers,        icon: 'users',   color: 'rose' },
    { label: 'New Today',        value: stats.newToday,          icon: 'plus',    color: 'emerald' },
    { label: 'New This Week',    value: stats.newWeek,           icon: 'trend',   color: 'blue' },
    { label: 'New This Month',   value: stats.newMonth,          icon: 'calendar',color: 'purple' },
    { label: 'Premium Users',    value: stats.premiumUsers,      icon: 'star',    color: 'yellow' },
    { label: 'Conversion Rate',  value: `${stats.conversionRate}%`, icon: 'percent', color: 'orange' },
    { label: 'Total Matches',    value: stats.totalMatches,      icon: 'heart',   color: 'pink' },
    { label: 'Swipes Today',     value: stats.swipesToday,       icon: 'swipe',   color: 'cyan' },
    { label: 'Total Swipes',     value: stats.totalSwipes,       icon: 'swipe2',  color: 'indigo' },
    { label: 'Est. Revenue',     value: `₹${stats.estimatedRevenue}`, icon: 'rupee', color: 'green' },
  ] : []

  const colorMap = {
    rose: 'text-rose-400 bg-rose-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
    yellow: 'text-yellow-400 bg-yellow-500/10',
    orange: 'text-orange-400 bg-orange-500/10',
    pink: 'text-pink-400 bg-pink-500/10',
    cyan: 'text-cyan-400 bg-cyan-500/10',
    indigo: 'text-indigo-400 bg-indigo-500/10',
    green: 'text-green-400 bg-green-500/10',
  }

  return (
    <div className="min-h-screen bg-[#080010] text-white">

      {/* Top bar */}
      <header className="border-b border-white/8 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo1.png" alt="Logo" className="h-7 w-auto object-contain" />
          <span className="text-white/40 text-sm">Admin Panel</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white/60 text-sm hidden md:block">{adminUser.email}</span>
          <button onClick={signOut}
            className="text-xs text-white/40 hover:text-white/70 border border-white/10 px-3 py-1.5 rounded-lg transition-colors">
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {['overview', 'users'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors capitalize ${
                tab === t
                  ? 'bg-rose-500 text-white'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
              }`}>
              {t}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <>
            <h1 className="text-2xl font-black mb-6">Overview</h1>
            {loadingStats ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Array(10).fill(0).map((_, i) => (
                  <div key={i} className="h-24 bg-white/4 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {statCards.map(card => (
                  <div key={card.label} className="bg-white/4 border border-white/8 rounded-2xl p-5 hover:bg-white/6 transition-colors">
                    <p className="text-white/40 text-xs mb-2">{card.label}</p>
                    <p className={`text-2xl font-black ${colorMap[card.color].split(' ')[0]}`}>{card.value ?? '—'}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Quick summary */}
            {stats && (
              <div className="mt-8 bg-white/4 border border-white/8 rounded-2xl p-6">
                <h2 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-4">Revenue Snapshot</h2>
                <div className="flex flex-wrap gap-8">
                  <div>
                    <p className="text-white/40 text-xs">Weekly revenue (current)</p>
                    <p className="text-3xl font-black text-green-400">₹{stats.estimatedRevenue}</p>
                  </div>
                  <div>
                    <p className="text-white/40 text-xs">Monthly estimate</p>
                    <p className="text-3xl font-black text-green-400">₹{stats.estimatedRevenue * 4}</p>
                  </div>
                  <div>
                    <p className="text-white/40 text-xs">Premium conversion</p>
                    <p className="text-3xl font-black text-yellow-400">{stats.conversionRate}%</p>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Joiners footer */}
            {stats?.recentJoiners?.length > 0 && (
              <div className="mt-8 bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white/50 uppercase tracking-wider">Recent Joiners</h2>
                  <span className="text-white/30 text-xs">Last {stats.recentJoiners.length} signups</span>
                </div>
                {(() => {
                  // Group by date label
                  const groups = {}
                  stats.recentJoiners.forEach(u => {
                    const d = new Date(u.created_at)
                    const now = new Date()
                    const diffDays = Math.floor((now - d) / 86400000)
                    const label = diffDays === 0 ? 'Today'
                      : diffDays === 1 ? 'Yesterday'
                      : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    if (!groups[label]) groups[label] = []
                    groups[label].push(u)
                  })
                  return Object.entries(groups).map(([day, users]) => (
                    <div key={day} className="border-b border-white/5 last:border-0">
                      <div className="px-6 py-2 bg-white/2">
                        <span className="text-white/30 text-[11px] font-bold uppercase tracking-widest">{day}</span>
                        <span className="ml-2 bg-white/8 text-white/40 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{users.length}</span>
                      </div>
                      <div className="divide-y divide-white/5">
                        {users.map(u => (
                          <div key={u.id} className="flex items-center gap-3 px-6 py-2.5">
                            <img
                              src={u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || '?')}&background=f43f5e&color=fff&size=64`}
                              className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-white/10"
                              alt=""
                            />
                            <span className="text-white text-sm font-semibold flex-1">{u.name || 'Unnamed'}</span>
                            <span className="text-white/30 text-xs capitalize">{u.gender || '—'}</span>
                            <span className="text-white/20 text-xs ml-4">
                              {new Date(u.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                })()}
              </div>
            )}
          </>
        )}

        {/* USERS TAB */}
        {tab === 'users' && (
          <>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
              <h1 className="text-2xl font-black">Users <span className="text-white/30 font-normal text-lg">({total})</span></h1>
              <input
                type="text" placeholder="Search by name…" value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-rose-500 w-full md:w-64 transition-colors"
              />
            </div>

            <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
              {loadingUsers ? (
                <div className="p-8 flex justify-center">
                  <div className="w-6 h-6 rounded-full border-2 border-rose-500/30 border-t-rose-500 animate-spin" />
                </div>
              ) : users.length === 0 ? (
                <p className="text-white/30 text-center py-12 text-sm">No users found</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8">
                      <th className="text-left px-4 py-3 text-white/40 font-semibold text-xs uppercase tracking-wider">User</th>
                      <th className="text-left px-4 py-3 text-white/40 font-semibold text-xs uppercase tracking-wider hidden md:table-cell">Email</th>
                      <th className="text-left px-4 py-3 text-white/40 font-semibold text-xs uppercase tracking-wider hidden md:table-cell">Joined</th>
                      <th className="text-left px-4 py-3 text-white/40 font-semibold text-xs uppercase tracking-wider">Plan</th>
                      <th className="text-left px-4 py-3 text-white/40 font-semibold text-xs uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <tr key={u.id} className={`border-b border-white/5 hover:bg-white/3 transition-colors ${u.is_banned ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || '?')}&background=f43f5e&color=fff&size=64`}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="" />
                            <div>
                              <div className="flex items-center gap-1.5 leading-none">
                                <p className="font-semibold text-white">{u.name || 'Unnamed'}</p>
                                {u.email?.endsWith('@noreply.local') && (
                                  <span className="bg-violet-500/20 text-violet-400 text-[10px] font-black px-1.5 py-0.5 rounded-full border border-violet-500/30">FAKE</span>
                                )}
                              </div>
                              <p className="text-white/30 text-xs mt-0.5">{u.age ? `${u.age}y` : ''} {u.gender || ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-white/50 hidden md:table-cell">{u.email}</td>
                        <td className="px-4 py-3 text-white/40 hidden md:table-cell">
                          {new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3">
                          {u.is_premium
                            ? <span className="bg-yellow-500/20 text-yellow-400 text-xs font-bold px-2 py-0.5 rounded-full">Premium</span>
                            : <span className="bg-white/8 text-white/40 text-xs font-bold px-2 py-0.5 rounded-full">Free</span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          {u.is_admin
                            ? <span className="bg-rose-500/20 text-rose-400 text-xs font-bold px-2 py-0.5 rounded-full">Admin</span>
                            : u.is_banned
                              ? <span className="bg-red-900/40 text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">Banned</span>
                              : <span className="bg-emerald-500/15 text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full">Active</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!u.is_admin && (
                            <button onClick={() => toggleBan(u.id, u.is_banned)}
                              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                                u.is_banned
                                  ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                                  : 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                              }`}>
                              {u.is_banned ? 'Unban' : 'Ban'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="px-4 py-2 rounded-lg bg-white/5 text-white/50 text-sm hover:bg-white/10 disabled:opacity-30 transition-colors">
                  Previous
                </button>
                <span className="text-white/40 text-sm">Page {page} of {pages}</span>
                <button disabled={page === pages} onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 rounded-lg bg-white/5 text-white/50 text-sm hover:bg-white/10 disabled:opacity-30 transition-colors">
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
