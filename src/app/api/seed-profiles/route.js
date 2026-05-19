import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

const FAKE_PROFILES = [
  { name: 'Priya',   age: 21, bio: 'Coffee addict ☕ | Engineering student | Big Bollywood fan', gender: 'woman', interested_in: 'men' },
  { name: 'Anjali',  age: 22, bio: 'Dancer by passion, coder by profession. Love rain and chai.', gender: 'woman', interested_in: 'men' },
  { name: 'Sneha',   age: 20, bio: 'Foodie | Solo traveller | Looking for my person 🌸', gender: 'woman', interested_in: 'men' },
  { name: 'Riya',    age: 19, bio: 'Art student | Cat mom 🐱 | Into indie music and poetry', gender: 'woman', interested_in: 'men' },
  { name: 'Nisha',   age: 23, bio: 'Yoga every morning. Books over parties. Simple life, big dreams.', gender: 'woman', interested_in: 'men' },
  { name: 'Kavya',   age: 21, bio: 'South Indian girl 🌺 | Film buff | Dog lover | Foodie at heart', gender: 'woman', interested_in: 'men' },
  { name: 'Pooja',   age: 22, bio: 'Aspiring chef 🍳 | Cricket fan | Born and raised in Balasore', gender: 'woman', interested_in: 'men' },
  { name: 'Simran',  age: 20, bio: 'Punjabi girl 💛 | Gym addict | Love road trips and adventure', gender: 'woman', interested_in: 'men' },
  { name: 'Ananya',  age: 19, bio: 'Kerala girl | Classical dancer | Future doctor 🩺 | Loves cooking', gender: 'woman', interested_in: 'men' },
  { name: 'Divya',   age: 21, bio: 'Mountains > beaches 🏔️ | Photography enthusiast | Chai not coffee', gender: 'woman', interested_in: 'men' },
  { name: 'Meera',   age: 22, bio: 'Bookworm 📚 | Chess player | Introvert who can also be a lot of fun', gender: 'woman', interested_in: 'men' },
  { name: 'Tanvi',   age: 20, bio: 'Fashion lover 👗 | Balasore born and proud | Makeup is my art form', gender: 'woman', interested_in: 'men' },
  { name: 'Ritika',  age: 23, bio: 'Bong girl 🎵 | Music is life | Aspiring journalist | Love adda', gender: 'woman', interested_in: 'men' },
  { name: 'Sanya',   age: 19, bio: 'Shopping queen 🛍️ | Total foodie | Potterhead forever ⚡', gender: 'woman', interested_in: 'men' },
  { name: 'Ishita',  age: 21, bio: 'Night owl 🌙 | Netflix binger | Looking for real connection, not games', gender: 'woman', interested_in: 'men' },
]

export async function POST(req) {
  const secret = req.headers.get('x-seed-secret')
  if (secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const results = []

  for (const p of FAKE_PROFILES) {
    const email = `${p.name.toLowerCase()}_spark_fake@noreply.local`

    // Create auth user (ignore if already exists)
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password: 'Spark@fake2025',
      email_confirm: true,
    })

    if (authErr && !authErr.message.includes('already been registered')) {
      results.push({ name: p.name, error: authErr.message })
      continue
    }

    const userId = authData?.user?.id
    if (!userId) {
      // User already exists — look them up and reset password
      const { data: existing } = await supabase.auth.admin.listUsers()
      const found = existing?.users?.find(u => u.email === email)
      if (!found) { results.push({ name: p.name, error: 'Could not resolve user id' }); continue }
      // Reset to known password
      await supabase.auth.admin.updateUserById(found.id, { password: 'Spark@fake2025' })
      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=f43f5e&color=fff&size=400&bold=true`
      await supabase.from('profiles').upsert({
        id: found.id, name: p.name, age: p.age, bio: p.bio,
        gender: p.gender, interested_in: p.interested_in,
        avatar_url: avatarUrl, photos: [],
        latitude: 21.1876 + (Math.random() - 0.5) * 0.05,
        longitude: 86.6833 + (Math.random() - 0.5) * 0.05,
      })
      results.push({ name: p.name, status: 'upserted + password reset' })
      continue
    }

    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=f43f5e&color=fff&size=400&bold=true`
    const { error: dbErr } = await supabase.from('profiles').upsert({
      id: userId, name: p.name, age: p.age, bio: p.bio,
      gender: p.gender, interested_in: p.interested_in,
      avatar_url: avatarUrl, photos: [],
      latitude: 21.1876 + (Math.random() - 0.5) * 0.05,
      longitude: 86.6833 + (Math.random() - 0.5) * 0.05,
    })

    results.push({ name: p.name, status: dbErr ? `db error: ${dbErr.message}` : 'created' })
  }

  return NextResponse.json({ results })
}
