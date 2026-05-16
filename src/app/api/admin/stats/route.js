import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET() {
  // Verify caller is an admin
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const now = new Date()
  const todayStart  = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const weekStart   = new Date(now); weekStart.setDate(now.getDate() - 7)
  const monthStart  = new Date(now); monthStart.setDate(now.getDate() - 30)

  const [
    { count: totalUsers },
    { count: newToday },
    { count: newWeek },
    { count: newMonth },
    { count: premiumUsers },
    { count: totalMatches },
    { count: swipesToday },
    { count: totalSwipes },
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
    admin.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekStart.toISOString()),
    admin.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', monthStart.toISOString()),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('is_premium', true),
    admin.from('matches').select('*', { count: 'exact', head: true }),
    admin.from('swipes').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
    admin.from('swipes').select('*', { count: 'exact', head: true }),
  ])

  const conversionRate = totalUsers > 0 ? ((premiumUsers / totalUsers) * 100).toFixed(1) : 0
  const estimatedRevenue = (premiumUsers || 0) * 100

  return NextResponse.json({
    totalUsers, newToday, newWeek, newMonth,
    premiumUsers, totalMatches, swipesToday, totalSwipes,
    conversionRate, estimatedRevenue,
  })
}
