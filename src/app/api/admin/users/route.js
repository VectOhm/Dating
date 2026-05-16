import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET(request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const page   = parseInt(searchParams.get('page') || '1')
  const search = searchParams.get('search') || ''
  const limit  = 20
  const from   = (page - 1) * limit

  let query = admin.from('profiles')
    .select('id, name, avatar_url, age, gender, is_premium, is_banned, is_admin, created_at, premium_until', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (search) query = query.ilike('name', `%${search}%`)

  const { data: users, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get emails from auth
  const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = {}
  authUsers?.forEach(u => { emailMap[u.id] = u.email })

  const enriched = users.map(u => ({ ...u, email: emailMap[u.id] || '' }))

  return NextResponse.json({ users: enriched, total: count, page, pages: Math.ceil(count / limit) })
}

export async function PATCH(request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, is_banned } = await request.json()
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const { error } = await admin.from('profiles').update({ is_banned }).eq('id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
