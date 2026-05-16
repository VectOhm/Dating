# Spark — Dating App

Tinder-style dating app built with Next.js 14 + Supabase.

## Features
- Email/password auth
- Profile setup with photo upload
- Swipe cards (drag or tap buttons)
- Mutual match detection
- Real-time secure chat (only after matching)

## Setup

### 1. Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a free project.
2. In the **SQL Editor**, paste and run the contents of `supabase/schema.sql`.
3. In **Storage**, create a bucket named `avatars` and set it to **public**.
4. Add these Storage policies (Settings → Storage → Policies):
   - `SELECT`: public (anyone can view)
   - `INSERT`: `auth.role() = 'authenticated'`
   - `UPDATE`: `auth.uid()::text = (storage.foldername(name))[1]`

### 2. Environment Variables
```bash
cp .env.local.example .env.local
```
Fill in your Supabase **Project URL** and **anon public key** (found in Project Settings → API).

### 3. Install & Run
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## App Flow
1. `/` — Landing page
2. `/auth/register` — Create account
3. `/setup` — Complete profile (name, age, bio, photo)
4. `/discover` — Swipe cards (drag or use ❤️/✕ buttons)
5. `/matches` — See all mutual matches
6. `/chat/[matchId]` — Real-time chat with a match

## Tech Stack
- **Next.js 14** (App Router, client components)
- **Supabase** (Auth, PostgreSQL, Realtime, Storage)
- **Tailwind CSS**
