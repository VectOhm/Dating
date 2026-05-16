import Razorpay from 'razorpay'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const order = await razorpay.orders.create({
      amount:   10000, // ₹100 in paise
      currency: 'INR',
      receipt:  `receipt_${user.id}_${Date.now()}`,
      notes:    { userId: user.id },
    })
    return NextResponse.json({ orderId: order.id, amount: order.amount, currency: order.currency })
  } catch (err) {
    console.error('Razorpay order error:', err)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
