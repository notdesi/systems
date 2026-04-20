# Systems App

Mobile-first workout planner with local-first schedule/pr tracking and Supabase magic-link auth.

## Setup

1. Install dependencies:
   - `npm install`
2. Create your local env file:
   - `cp .env.example .env.local`
3. Fill Supabase keys in `.env.local`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Start dev server:
   - `npm run dev`

## Supabase Auth configuration

In Supabase dashboard:

1. Go to `Authentication -> URL Configuration`
2. Set site URL (dev): `http://localhost:5173`
3. Add redirect URL:
   - `http://localhost:5173`
4. Go to `Authentication -> Providers -> Email`
5. Enable email provider and magic links (OTP sign-in)

The app sends a magic-link email via `signInWithOtp`. Users stay signed in unless they log out, clear site data, or token/session expires.
