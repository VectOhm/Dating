import nodemailer from 'nodemailer'
import { NextResponse } from 'next/server'

const RATE_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT = 3
const contactAttempts = new Map()

function isRateLimited(ip) {
  const now = Date.now()
  const entry = contactAttempts.get(ip)
  if (!entry || now > entry.resetAt) {
    contactAttempts.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return false
  }
  if (entry.count >= RATE_LIMIT) return true
  entry.count++
  return false
}

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { name, email, type, message } = body

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Name, email, and message are required.' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
  }
  if (message.trim().length < 10) {
    return NextResponse.json({ error: 'Message must be at least 10 characters.' }, { status: 400 })
  }
  if (message.trim().length > 2000) {
    return NextResponse.json({ error: 'Message must be under 2000 characters.' }, { status: 400 })
  }

  const gmailUser = process.env.GMAIL_USER
  const gmailPass = process.env.GMAIL_APP_PASSWORD

  if (!gmailUser || !gmailPass) {
    console.error('GMAIL_USER or GMAIL_APP_PASSWORD not set')
    return NextResponse.json({ error: 'Email service not configured.' }, { status: 500 })
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailPass },
  })

  const typeLabel = {
    bug: 'Bug Report',
    complaint: 'Complaint',
    suggestion: 'Suggestion',
    other: 'Other',
  }[type] || type || 'General'

  try {
    await transporter.sendMail({
      from: `"Contact Form" <${gmailUser}>`,
      to: 'vectohmsolutions@gmail.com',
      replyTo: email,
      subject: `[${typeLabel}] from ${name.trim()}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9f9f9;border-radius:8px;">
          <h2 style="color:#e11d48;margin:0 0 20px">New Contact Form Submission</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#666;font-size:13px;width:100px">Name</td><td style="padding:8px 0;font-weight:600">${escapeHtml(name.trim())}</td></tr>
            <tr><td style="padding:8px 0;color:#666;font-size:13px">Email</td><td style="padding:8px 0;font-weight:600">${escapeHtml(email.trim())}</td></tr>
            <tr><td style="padding:8px 0;color:#666;font-size:13px">Type</td><td style="padding:8px 0;font-weight:600">${typeLabel}</td></tr>
          </table>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
          <p style="color:#666;font-size:13px;margin:0 0 8px">Message:</p>
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:16px;font-size:14px;white-space:pre-wrap;">${escapeHtml(message.trim())}</div>
        </div>
      `,
    })
  } catch (err) {
    console.error('Mail send error:', err)
    return NextResponse.json({ error: 'Failed to send message. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}
