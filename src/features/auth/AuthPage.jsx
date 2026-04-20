import { useState } from 'react'
import { motion as Motion } from 'framer-motion'
import { EnvelopeSimple, LockSimple, SignIn, SignOut, UserPlus } from '@phosphor-icons/react'

function AuthPage({ hasSupabaseEnv, isSubmitting, onAuthenticate }) {
  const [mode, setMode] = useState('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState({ kind: 'idle', message: '' })

  const handleSubmit = async () => {
    const normalized = email.trim().toLowerCase()
    if (!normalized) {
      setStatus({ kind: 'error', message: 'Enter your email to continue.' })
      return
    }
    if (password.trim().length < 6) {
      setStatus({ kind: 'error', message: 'Password must be at least 6 characters.' })
      return
    }

    try {
      setStatus({ kind: 'idle', message: '' })
      await onAuthenticate({ mode, email: normalized, password })
      setStatus({
        kind: 'success',
        message:
          mode === 'sign-up'
            ? 'Account created. You can now sign in on any device.'
            : 'Signed in successfully.',
      })
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Could not authenticate.',
      })
    }
  }

  return (
    <main className="min-h-svh w-full bg-black">
      <section className="mx-auto flex min-h-svh w-full max-w-md flex-col px-5 pb-8 pt-12">
        <div className="rounded-2xl bg-white/[0.06] p-5">
          <img
            src="/applogo.svg"
            alt="Systems app logo"
            className="h-14 w-14 object-contain"
          />
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">
            {mode === 'sign-in' ? 'Sign in' : 'Create account'}
          </h1>

          <div className="mt-4 inline-flex rounded-xl bg-zinc-900/90 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('sign-in')
                setStatus({ kind: 'idle', message: '' })
              }}
              className={`min-h-[36px] rounded-lg px-3 text-xs font-semibold transition-colors ${
                mode === 'sign-in'
                  ? 'bg-[var(--color-primary)] text-zinc-950'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('sign-up')
                setStatus({ kind: 'idle', message: '' })
              }}
              className={`min-h-[36px] rounded-lg px-3 text-xs font-semibold transition-colors ${
                mode === 'sign-up'
                  ? 'bg-[var(--color-primary)] text-zinc-950'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Create account
            </button>
          </div>

          {!hasSupabaseEnv ? (
            <div className="mt-4 rounded-xl border border-amber-300/30 bg-amber-100/8 p-3">
              <p className="text-xs font-semibold text-amber-200">Supabase keys missing</p>
              <p className="mt-1 text-[11px] text-amber-100/80">
                Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`.
              </p>
            </div>
          ) : null}

          <div className="mt-5">
            <label className="text-[11px] font-medium text-zinc-500" htmlFor="auth-email">
              Email
            </label>
            <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-zinc-900/90 px-3 py-2">
              <EnvelopeSimple size={16} weight="bold" className="text-zinc-500" />
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="min-h-[40px] w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="text-[11px] font-medium text-zinc-500" htmlFor="auth-password">
              Password
            </label>
            <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-zinc-900/90 px-3 py-2">
              <LockSimple size={16} weight="bold" className="text-zinc-500" />
              <input
                id="auth-password"
                type="password"
                autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleSubmit()
                  }
                }}
                placeholder="At least 6 characters"
                className="min-h-[40px] w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
              />
            </div>
          </div>

          {status.kind !== 'idle' ? (
            <p
              className={`mt-3 text-xs ${
                status.kind === 'error' ? 'text-red-300' : 'text-emerald-300'
              }`}
            >
              {status.message}
            </p>
          ) : null}

          <Motion.button
            type="button"
            disabled={!hasSupabaseEnv || isSubmitting}
            onClick={handleSubmit}
            whileTap={!hasSupabaseEnv || isSubmitting ? undefined : { scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 520, damping: 34 }}
            className={`mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold transition-colors duration-150 ${
              !hasSupabaseEnv || isSubmitting
                ? 'cursor-not-allowed bg-white/[0.06] text-zinc-500'
                : 'bg-[var(--color-primary)] text-zinc-950 hover:bg-[var(--color-primary)]/90'
            }`}
          >
            {mode === 'sign-in' ? <SignIn size={14} weight="bold" /> : <UserPlus size={14} weight="bold" />}
            {isSubmitting
              ? mode === 'sign-in'
                ? 'Signing in...'
                : 'Creating account...'
              : mode === 'sign-in'
                ? 'Sign in'
                : 'Create account'}
          </Motion.button>
        </div>

        <div className="mt-auto rounded-xl bg-zinc-900/60 px-4 py-3">
          <p className="text-[11px] text-zinc-500">
            Use one email/password across devices. You stay signed in unless you log out, clear site data, or the session expires.
          </p>
        </div>
      </section>
    </main>
  )
}

function SignedInBadge({ email, onLogout }) {
  return (
    <div className="ml-auto flex items-center gap-2">
      <p className="max-w-[130px] truncate text-[11px] font-medium text-zinc-400">{email}</p>
      <Motion.button
        type="button"
        onClick={onLogout}
        aria-label="Log out"
        whileTap={{ scale: 0.94 }}
        transition={{ type: 'spring', stiffness: 480, damping: 30 }}
        className="inline-flex min-h-[34px] min-w-[34px] items-center justify-center rounded-full bg-zinc-800/90 ring-1 ring-[var(--color-primary)]/35"
      >
        <SignOut size={16} weight="bold" className="text-zinc-200" />
      </Motion.button>
    </div>
  )
}

AuthPage.SignedInBadge = SignedInBadge

export default AuthPage
