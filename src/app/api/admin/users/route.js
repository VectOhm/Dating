import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    console.error('Admin API Auth Error:', authError)
    return NextResponse.json({ error: 'Unauthorized', details: authError }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  
  if (profileError || !profile?.is_admin) {
    console.error('Admin API Forbidden:', profileError)
    return NextResponse.json({ error: 'Forbidden', details: profileError }, { status: 403 })
  }

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

  // Get emails from auth (safely)
  let emailMap = {}
  try {
    const { data: authData, error: authListError } = await admin.auth.admin.listUsers({ perPage: 1000 })
    if (authListError) {
      console.error('Auth list error:', authListError)
    } else if (authData?.users) {
      authData.users.forEach(u => { emailMap[u.id] = u.email })
    }
  } catch (err) {
    console.error('Failed to list auth users:', err)
  }

  const enriched = users.map(u => ({ ...u, email: emailMap[u.id] || '' }))

  return NextResponse.json({ users: enriched, total: count, page, pages: Math.ceil(count / limit) })
}

export async function PATCH(request) {
  const supabase = await createClient()
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
