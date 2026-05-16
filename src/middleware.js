import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// In-memory rate limiter (per Edge isolate — resets on cold start, good enough for abuse deterrence)
const authAttempts = new Map() // ip -> { count, resetAt }

function isRateLimited(ip) {
  const now = Date.now()
  const windowMs = 15 * 60 * 1000  // 15-minute window
  const limit = 10                  // max 10 auth attempts per window

  const entry = authAttempts.get(ip)
  if (!entry || now > entry.resetAt) {
    authAttempts.set(ip, { count: 1, resetAt: now + windowMs })
    return false
  }
  if (entry.count >= limit) return true
  entry.count++
  return false
}

export async function middleware(request) {
  let response = NextResponse.next({ request })

  // Rate-limit signup and login POST requests
  const path = request.nextUrl.pathname
  const isAuthPost = request.method === 'POST' &&
    (path.startsWith('/auth/login') || path.startsWith('/auth/register'))

  if (isAuthPost) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'
    if (isRateLimited(ip)) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many attempts. Please try again in 15 minutes.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const authPaths   = ['/auth/login', '/auth/register']
  const publicPaths = ['/', ...authPaths]

  // Not logged in — redirect to login
  if (!user && !publicPaths.some(p => path.startsWith(p))) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (user) {
    // Logged-in user trying to access public/auth pages → send to app
    if (path === '/' || authPaths.some(p => path.startsWith(p))) {
      return NextResponse.redirect(new URL('/discover', request.url))
    }

    // Email not confirmed → force to verify page (except the verify page itself)
    const emailConfirmed = !!user.email_confirmed_at
    if (!emailConfirmed && path !== '/verify-email' && !path.startsWith('/auth')) {
      return NextResponse.redirect(new URL('/verify-email', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
