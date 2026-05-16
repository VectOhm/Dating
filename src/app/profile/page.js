'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile]   = useState(null)
  const [email, setEmail]       = useState('')
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState(false)
  const [form, setForm]         = useState({})
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  // 4-photo state
  const [photoFiles, setPhotoFiles]     = useState([null, null, null, null])
  const [photoPreviews, setPhotoPreviews] = useState([null, null, null, null])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth/login'); return }
      setEmail(user.email)
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!data) { router.replace('/setup'); return }
      setProfile(data)
      setForm({
        name: data.name,
        age: String(data.age),
        bio: data.bio ?? '',
        gender: data.gender ?? '',
        interested_in: data.interested_in ?? '',
      })
      // Seed photo previews from stored photos array
      const stored = Array.isArray(data.photos) ? data.photos : (data.avatar_url ? [data.avatar_url] : [])
      setPhotoPreviews([
        stored[0] ?? null,
        stored[1] ?? null,
        stored[2] ?? null,
        stored[3] ?? null,
      ])
      setLoading(false)
    }
    load()
  }, [router])

  function handlePhotoFile(index, e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Each image must be under 5 MB.'); return }
    setError('')
    setPhotoFiles(prev => { const n = [...prev]; n[index] = file; return n })
    setPhotoPreviews(prev => { const n = [...prev]; n[index] = URL.createObjectURL(file); return n })
  }

  function removePhoto(index) {
    setPhotoFiles(prev => { const n = [...prev]; n[index] = null; return n })
    setPhotoPreviews(prev => { const n = [...prev]; n[index] = null; return n })
  }

  async function saveProfile() {
    setError('')
    const age = parseInt(form.age)
    const nameVal = form.name.trim()
    if (!nameVal) { setError('Name is required.'); return }
    if (nameVal.length < 2) { setError('Name must be at least 2 characters.'); return }
    if (nameVal.length > 30) { setError('Name must be under 30 characters.'); return }
    if (/\d/.test(nameVal)) { setError('Name cannot contain numbers.'); return }
    if (/[^a-zA-Z\s'\-]/.test(nameVal)) { setError('Name can only contain letters, spaces, hyphens or apostrophes.'); return }
    if (isNaN(age) || age < 18) { setError('Age must be 18+.'); return }
    setSaving(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Upload any new photo files
    const existingPhotos = Array.isArray(profile.photos) ? profile.photos : (profile.avatar_url ? [profile.avatar_url] : [])
    const uploadedUrls = []

    for (let i = 0; i < 4; i++) {
      if (photoFiles[i]) {
        // New file to upload
        const ext  = photoFiles[i].name.split('.').pop()
        const path = `${user.id}/photo_${i}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('avatars').upload(path, photoFiles[i], { upsert: true })
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
          uploadedUrls.push(publicUrl)
        } else {
          // Keep existing if upload fails
          if (existingPhotos[i]) uploadedUrls.push(existingPhotos[i])
        }
      } else if (photoPreviews[i]) {
        // Slot still has an existing URL
        uploadedUrls.push(photoPreviews[i])
      }
      // null slot = removed, skip
    }

    const avatar_url = uploadedUrls[0] ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(form.name.trim())}&background=f43f5e&color=fff&size=400`

    const { error: dbErr } = await supabase.from('profiles').update({
      name: form.name.trim(), age,
      bio: form.bio.trim() || null,
      gender: form.gender || null,
      interested_in: form.interested_in || null,
      avatar_url,
      photos: uploadedUrls,
    }).eq('id', user.id)

    if (dbErr) { setError(dbErr.message); setSaving(false); return }

    setProfile(p => ({ ...p, ...form, age, avatar_url, photos: uploadedUrls }))
    setPhotoPreviews([
      uploadedUrls[0] ?? null,
      uploadedUrls[1] ?? null,
      uploadedUrls[2] ?? null,
      uploadedUrls[3] ?? null,
    ])
    setPhotoFiles([null, null, null, null])
    setEditing(false)
    setSaving(false)
  }

  function cancelEdit() {
    const stored = Array.isArray(profile.photos) ? profile.photos : (profile.avatar_url ? [profile.avatar_url] : [])
    setPhotoPreviews([stored[0] ?? null, stored[1] ?? null, stored[2] ?? null, stored[3] ?? null])
    setPhotoFiles([null, null, null, null])
    setForm({
      name: profile.name, age: String(profile.age),
      bio: profile.bio ?? '', gender: profile.gender ?? '',
      interested_in: profile.interested_in ?? '',
    })
    setError('')
    setEditing(false)
  }

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-10 h-10 rounded-full border-2 border-rose-500/20 border-t-rose-500 animate-spin" />
      </div>
    )
  }

  const avatarSrc = photoPreviews[0] || profile.avatar_url
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=f43f5e&color=fff&size=400`

  const inputCls  = "w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:border-rose-500 focus:outline-none text-sm text-white placeholder-gray-600"
  const selectCls = "w-full px-3 py-2.5 bg-[#111] border border-white/10 rounded-xl focus:border-rose-500 focus:outline-none text-sm text-white"

  return (
    <div className="min-h-screen bg-black flex flex-col text-white">

      {/* Header */}
      <header className="bg-black border-b border-white/10 px-5 pt-6 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">My Profile</h1>
        {!editing ? (
          <button onClick={() => setEditing(true)}
            className="text-rose-400 font-bold text-sm hover:text-rose-300 transition-colors">
            Edit
          </button>
        ) : (
          <button onClick={cancelEdit}
            className="text-gray-500 font-semibold text-sm hover:text-gray-300">
            Cancel
          </button>
        )}
      </header>

      <main className="flex-1 pb-28 overflow-y-auto">

        {/* Profile card */}
        <div className="bg-[#111] mx-4 mt-4 rounded-3xl overflow-hidden border border-white/5">
          {/* Cover */}
          <div className="h-36 bg-gradient-to-br from-rose-600 to-orange-500 relative">
            <div className="absolute -bottom-12 left-6">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-black shadow-xl bg-gray-800">
                <img src={avatarSrc} alt={profile.name} className="w-full h-full object-cover" />
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="pt-16 px-6 pb-6">
            {!editing ? (
              <div>
                <h2 className="text-2xl font-black text-white">{profile.name}, {profile.age}</h2>
                <p className="text-gray-500 text-sm mt-0.5">{email}</p>
                {profile.bio && <p className="text-gray-400 text-sm mt-3 leading-relaxed">{profile.bio}</p>}
                <div className="flex flex-wrap gap-2 mt-4">
                  {profile.gender && (
                    <span className="bg-rose-500/20 text-rose-400 text-xs font-semibold px-3 py-1.5 rounded-full capitalize border border-rose-500/30">
                      {profile.gender}
                    </span>
                  )}
                  {profile.interested_in && (
                    <span className="bg-orange-500/20 text-orange-400 text-xs font-semibold px-3 py-1.5 rounded-full capitalize border border-orange-500/30">
                      Likes {profile.interested_in}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Name</label>
                  <input type="text" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Age</label>
                  <input type="number" min="18" max="99" value={form.age}
                    onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Bio</label>
                  <textarea value={form.bio} rows={3}
                    onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                    className={`${inputCls} resize-none`} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">I am</label>
                    <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                      className={selectCls}>
                      <option value="">Select</option>
                      <option value="man">Man</option>
                      <option value="woman">Woman</option>
                      <option value="nonbinary">Non-binary</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Looking for</label>
                    <select value={form.interested_in} onChange={e => setForm(f => ({ ...f, interested_in: e.target.value }))}
                      className={selectCls}>
                      <option value="">Select</option>
                      <option value="men">Men</option>
                      <option value="women">Women</option>
                      <option value="everyone">Everyone</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── PHOTOS SECTION ── */}
        <div className="mx-4 mt-4 bg-[#111] rounded-3xl border border-white/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-bold text-sm text-white">My Photos</p>
              <p className="text-xs text-gray-600 mt-0.5">First photo is your main profile picture</p>
            </div>
            {!editing && (
              <span className="text-xs text-gray-600">
                {photoPreviews.filter(Boolean).length} / 4
              </span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="relative aspect-square">
                {photoPreviews[i] ? (
                  <>
                    <img
                      src={photoPreviews[i]}
                      alt={`Photo ${i + 1}`}
                      className="w-full h-full object-cover rounded-2xl border-2 border-white/10"
                    />
                    {editing && (
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-500 transition-colors shadow">
                        ×
                      </button>
                    )}
                    {i === 0 && (
                      <div className="absolute bottom-1 left-1 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                        MAIN
                      </div>
                    )}
                  </>
                ) : editing ? (
                  <label className="w-full h-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/15 bg-white/3 cursor-pointer hover:border-rose-500/50 hover:bg-rose-500/5 transition-colors">
                    <svg viewBox="0 0 24 24" className="w-6 h-6 text-gray-600 mb-0.5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                      <path d="M12 5v14M5 12h14"/>
                    </svg>
                    {i === 0 && <span className="text-[9px] text-gray-600 font-bold">MAIN</span>}
                    <input type="file" accept="image/*" className="hidden" onChange={e => handlePhotoFile(i, e)} />
                  </label>
                ) : (
                  <div className="w-full h-full rounded-2xl border-2 border-dashed border-white/8 bg-white/2 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                      <path d="M12 5v14M5 12h14"/>
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          {editing && (
            <>
              {error && (
                <div className="mt-3 bg-red-900/30 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>
              )}
              <button onClick={saveProfile} disabled={saving}
                className="w-full mt-4 bg-gradient-to-r from-rose-500 to-orange-400 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 text-sm">
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </>
          )}
        </div>

        {/* Stats */}
        <div className="mx-4 mt-3 grid grid-cols-3 gap-3">
          {[
            {
              label: 'Likes sent',
              svg: <svg viewBox="0 0 24 24" className="w-5 h-5 text-rose-400" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
            },
            {
              label: 'Matches',
              svg: <svg viewBox="0 0 24 24" className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
            },
            {
              label: 'Chats',
              svg: <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
            },
          ].map(s => (
            <div key={s.label} className="bg-[#111] rounded-2xl p-4 text-center border border-white/5">
              <div className="flex justify-center mb-1.5">{s.svg}</div>
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Logout */}
        <div className="mx-4 mt-4">
          <button onClick={logout}
            className="w-full bg-[#111] border border-white/10 text-gray-400 font-semibold py-3.5 rounded-2xl hover:bg-white/5 hover:text-red-400 transition-all text-sm flex items-center justify-center gap-2">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            Log out
          </button>
        </div>
      </main>

      <Navbar />
    </div>
  )
}
