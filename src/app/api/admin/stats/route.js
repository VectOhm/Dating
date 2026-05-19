import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import Razorpay from 'razorpay'

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

export async function GET() {
  // Verify caller is an admin
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    console.error('Stats API Auth Error:', authError)
    return NextResponse.json({ error: 'Unauthorized', details: authError }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  
  if (profileError || !profile?.is_admin) {
    console.error('Stats API Forbidden:', profileError)
    return NextResponse.json({ error: 'Forbidden', details: profileError }, { status: 403 })
  }

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
  
  // Fetch actual revenue from Razorpay
  let estimatedRevenue = 0
  try {
    const payments = await razorpay.payments.all({
      from: Math.floor(monthStart.getTime() / 1000), // Last 30 days
      count: 100
    })
    // Sum up captured payments
    estimatedRevenue = (payments.items || [])
      .filter(p => p.status === 'captured')
      .reduce((sum, p) => sum + (p.amount / 100), 0)
  } catch (err) {
    console.error('Razorpay fetch error:', err)
    // Fallback to estimation if Razorpay fails
    estimatedRevenue = (premiumUsers || 0) * 100
  }

  // Recent joiners — last 30, newest first
  const { data: recentJoiners } = await admin
    .from('profiles')
    .select('id, name, avatar_url, gender, created_at')
    .order('created_at', { ascending: false })
    .limit(30)

  return NextResponse.json({
    totalUsers, newToday, newWeek, newMonth,
    premiumUsers, totalMatches, swipesToday, totalSwipes,
    conversionRate, estimatedRevenue,
    recentJoiners: recentJoiners ?? [],
  })
}
