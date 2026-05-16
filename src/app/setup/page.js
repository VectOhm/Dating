'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function SetupPage() {
  const router = useRouter()
  const [userId, setUserId]     = useState(null)
  const [form, setForm]         = useState({ name: '', age: '', bio: '', gender: '', interested_in: '' })
  const [photos, setPhotos]     = useState([null, null, null, null]) // File objects
  const [previews, setPreviews] = useState([null, null, null, null]) // object URLs
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function check() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth/login'); return }
      setUserId(user.id)
      const { data: existing } = await supabase.from('profiles').select('id').eq('id', user.id).single()
      if (existing) { router.replace('/discover'); return }
      setChecking(false)
    }
    check()
  }, [router])

  function handleFile(index, e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Each image must be under 5 MB.'); return }
    setError('')
    setPhotos(prev => { const n = [...prev]; n[index] = file; return n })
    const url = URL.createObjectURL(file)
    setPreviews(prev => { const n = [...prev]; n[index] = url; return n })
  }

  function removePhoto(index) {
    setPhotos(prev => { const n = [...prev]; n[index] = null; return n })
    setPreviews(prev => { const n = [...prev]; n[index] = null; return n })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const age = parseInt(form.age)
    const nameVal = form.name.trim()
    if (!nameVal) { setError('Name is required.'); return }
    if (nameVal.length < 2) { setError('Name must be at least 2 characters.'); return }
    if (nameVal.length > 30) { setError('Name must be under 30 characters.'); return }
    if (/\d/.test(nameVal)) { setError('Name cannot contain numbers.'); return }
    if (/[^a-zA-Z\s'\-]/.test(nameVal)) { setError('Name can only contain letters, spaces, hyphens or apostrophes.'); return }
    if (/^(.)\1{3,}$/.test(nameVal.replace(/\s/g, ''))) { setError('Please enter your real name.'); return }
    if (isNaN(age) || age < 18) { setError('You must be at least 18.'); return }
    if (!photos[0]) { setError('Please add at least one photo.'); return }
    setLoading(true)

    const supabase = createClient()
    const uploadedUrls = []

    for (let i = 0; i < 4; i++) {
      if (!photos[i]) continue
      const ext  = photos[i].name.split('.').pop()
      const path = `${userId}/photo_${i}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('avatars').upload(path, photos[i], { upsert: true })
      if (upErr) {
        console.warn(`Photo ${i} upload error:`, upErr.message)
        continue
      }
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      uploadedUrls.push(publicUrl)
    }

    const avatar_url = uploadedUrls[0] ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(form.name.trim())}&background=f43f5e&color=fff&size=400&bold=true`

    const { error: dbErr } = await supabase.from('profiles').upsert({
      id: userId,
      name: form.name.trim(),
      age,
      bio: form.bio.trim() || null,
      gender: form.gender || null,
      interested_in: form.interested_in || null,
      avatar_url,
      photos: uploadedUrls,
    })

    if (dbErr) { setError(dbErr.message); setLoading(false); return }

    // Store location non-blocking
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async pos => {
          await supabase.from('profiles').update({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }).eq('id', userId)
        },
        () => {},
        { timeout: 8000 }
      )
    }

    router.replace('/discover')
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-500 to-orange-400">
        <div className="w-10 h-10 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      </div>
    )
  }

  const inputCls = "w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:outline-none transition-colors text-sm"
  const selectCls = "w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:outline-none bg-white transition-colors text-sm"

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-3xl shadow-2xl p-7 w-full max-w-md">
        <div className="text-center mb-7">
          <img src="/logo1.png" alt="Logo" className="h-14 w-auto object-contain mx-auto mb-4" />
          <h1 className="text-3xl font-black text-gray-900">Set up your profile</h1>
          <p className="text-gray-400 mt-1 text-sm">Let people know who you are</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Photo grid — 4 slots */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Your photos <span className="text-rose-500">*</span>
              <span className="text-gray-400 font-normal ml-1">(up to 4 · first is your main photo)</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="relative aspect-square">
                  {previews[i] ? (
                    <>
                      <img src={previews[i]} alt={`Photo ${i + 1}`}
                        className="w-full h-full object-cover rounded-2xl border-2 border-rose-200" />
                      <button type="button" onClick={() => removePhoto(i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-500 transition-colors">
                        ×
                      </button>
                      {i === 0 && (
                        <div className="absolute bottom-1 left-1 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">MAIN</div>
                      )}
                    </>
                  ) : (
                    <label className="w-full h-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed cursor-pointer transition-colors
                      hover:border-rose-400 hover:bg-rose-50
                      border-gray-200 bg-gray-50">
                      <svg viewBox="0 0 24 24" className="w-6 h-6 text-gray-300 mb-1" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                        <path d="M12 5v14M5 12h14"/>
                      </svg>
                      {i === 0 && <span className="text-[9px] text-gray-400 font-semibold">MAIN</span>}
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleFile(i, e)} />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">First name <span className="text-rose-500">*</span></label>
            <input type="text" required value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className={inputCls} placeholder="Your first name" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Age <span className="text-rose-500">*</span></label>
            <input type="number" required min="18" max="99" value={form.age}
              onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
              className={inputCls} placeholder="18+" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Bio</label>
            <textarea value={form.bio} rows={3}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              className={`${inputCls} resize-none`}
              placeholder="Tell people a bit about yourself…" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">I am</label>
              <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} className={selectCls}>
                <option value="">Select</option>
                <option value="man">Man</option>
                <option value="woman">Woman</option>
                <option value="nonbinary">Non-binary</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Looking for</label>
              <select value={form.interested_in} onChange={e => setForm(f => ({ ...f, interested_in: e.target.value }))} className={selectCls}>
                <option value="">Select</option>
                <option value="men">Men</option>
                <option value="women">Women</option>
                <option value="everyone">Everyone</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-rose-500 to-orange-400 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 text-base">
            {loading ? 'Saving…' : 'Start Matching'}
          </button>
        </form>
      </div>
    </div>
  )
}
