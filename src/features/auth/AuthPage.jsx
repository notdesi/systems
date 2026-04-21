import { useEffect, useRef, useState } from 'react'
import { motion as Motion } from 'framer-motion'
import { Camera, EnvelopeSimple, Gear, LockSimple, SignIn, SignOut, UserPlus, X } from '@phosphor-icons/react'
import { useAppStore } from '../../state/useAppStore'

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
              className={`min-h-[44px] rounded-lg px-3.5 text-[14px] font-semibold transition-colors ${
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
              className={`min-h-[44px] rounded-lg px-3.5 text-[14px] font-semibold transition-colors ${
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
              <p className="text-[14px] font-semibold text-amber-200">Supabase keys missing</p>
              <p className="mt-1 text-[13px] text-amber-100/80">
                Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`.
              </p>
            </div>
          ) : null}

          <div className="mt-5">
            <label className="text-[13px] font-medium text-zinc-500" htmlFor="auth-email">
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
                className="min-h-[44px] w-full bg-transparent text-base text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="text-[13px] font-medium text-zinc-500" htmlFor="auth-password">
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
                className="min-h-[44px] w-full bg-transparent text-base text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
              />
            </div>
          </div>

          {status.kind !== 'idle' ? (
            <p
              className={`mt-3 text-[14px] ${
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
            className={`mt-4 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-3.5 text-[15px] font-semibold transition-colors duration-150 ${
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
          <p className="text-[13px] text-zinc-500">
            Use one email/password across devices. You stay signed in unless you log out, clear site data, or the session expires.
          </p>
        </div>
      </section>
    </main>
  )
}

function SignedInBadge({ email, onLogout }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const containerRef = useRef(null)
  const initial = email?.trim()?.charAt(0)?.toUpperCase() || 'U'
  const profile = useAppStore((s) => s.profile)
  const setProfileState = useAppStore((s) => s.setProfileState)
  const [draft, setDraft] = useState(profile)

  useEffect(() => {
    if (!isSettingsOpen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isSettingsOpen])

  useEffect(() => {
    if (isSettingsOpen) {
      setDraft(profile)
    }
  }, [isSettingsOpen, profile])

  useEffect(() => {
    if (!isOpen) return undefined
    const handleOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('pointerdown', handleOutside)
    return () => document.removeEventListener('pointerdown', handleOutside)
  }, [isOpen])

  return (
    <div ref={containerRef} className="relative ml-auto">
      <Motion.button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Open account menu"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        whileTap={{ scale: 0.94 }}
        transition={{ type: 'spring', stiffness: 480, damping: 30 }}
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-zinc-800 text-zinc-100 transition-colors duration-150 hover:bg-zinc-700"
      >
        <span className="sr-only">Account menu</span>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-[14px] font-medium">
          {initial}
        </span>
      </Motion.button>

      {isOpen ? (
        <Motion.div
          role="menu"
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-56 rounded-2xl bg-zinc-900 p-2 ring-1 ring-white/10"
        >
          <div className="rounded-xl px-2.5 py-2">
            <p className="truncate text-[13px] text-zinc-400">{email}</p>
          </div>
          <Motion.button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false)
              setIsSettingsOpen(true)
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 520, damping: 34 }}
            className="inline-flex min-h-[44px] w-full items-center gap-2 rounded-xl px-2.5 text-left text-[14px] font-medium text-zinc-100 transition-colors duration-150 hover:bg-white/8"
          >
            <Gear size={16} weight="regular" className="text-zinc-300" />
            Settings
          </Motion.button>
          <Motion.button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false)
              onLogout()
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 520, damping: 34 }}
            className="mt-1 inline-flex min-h-[44px] w-full items-center gap-2 rounded-xl px-2.5 text-left text-[14px] font-medium text-zinc-100 transition-colors duration-150 hover:bg-white/8"
          >
            <SignOut size={16} weight="regular" className="text-zinc-300" />
            Log out
          </Motion.button>
        </Motion.div>
      ) : null}

      {isSettingsOpen ? (
        <Motion.section
          className="fixed inset-0 z-50 bg-black"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          aria-label="Settings panel"
        >
          <div className="mx-auto flex min-h-svh w-full max-w-md flex-col px-5 pb-[max(env(safe-area-inset-bottom),1rem)] pt-[max(env(safe-area-inset-top),1rem)]">
            <div className="flex shrink-0 items-center justify-between">
              <h2 className="text-xl font-semibold text-zinc-100">Settings</h2>
              <Motion.button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                whileTap={{ scale: 0.95 }}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-zinc-900 text-zinc-200"
                aria-label="Close settings"
              >
                <X size={18} weight="bold" />
              </Motion.button>
            </div>

            <div className="mt-5 min-h-0 flex-1 overflow-y-auto pb-4">
              <div className="rounded-2xl bg-zinc-900/90 p-4">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Personal Information
              </p>
              <div className="flex items-center gap-3">
                <div className="relative">
                  {draft.photoDataUrl ? (
                    <img
                      src={draft.photoDataUrl}
                      alt="Profile"
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800 text-lg font-medium text-zinc-200">
                      {(draft.name?.trim()?.charAt(0) || initial).toUpperCase()}
                    </div>
                  )}
                  <label className="absolute -bottom-1 -right-1 inline-flex min-h-[30px] min-w-[30px] cursor-pointer items-center justify-center rounded-full bg-zinc-700 text-zinc-100">
                    <Camera size={14} weight="bold" />
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (!file) return
                        const reader = new FileReader()
                        reader.onload = () => {
                          const result = typeof reader.result === 'string' ? reader.result : ''
                          setDraft((prev) => ({ ...prev, photoDataUrl: result }))
                        }
                        reader.readAsDataURL(file)
                      }}
                    />
                  </label>
                </div>
                <p className="text-[13px] text-zinc-400">Add profile photo</p>
              </div>

              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="text-[13px] font-medium text-zinc-500">User name</span>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Your name"
                    className="mt-1.5 min-h-[44px] w-full rounded-xl bg-zinc-950 px-3 text-base text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/45"
                  />
                </label>

                <label className="block">
                  <span className="text-[13px] font-medium text-zinc-500">Height (cm)</span>
                  <input
                    type="number"
                    min="0"
                    value={draft.heightCm}
                    onChange={(event) => setDraft((prev) => ({ ...prev, heightCm: event.target.value }))}
                    placeholder="e.g. 175"
                    className="mt-1.5 min-h-[44px] w-full rounded-xl bg-zinc-950 px-3 text-base text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/45"
                  />
                </label>

                <label className="block">
                  <span className="text-[13px] font-medium text-zinc-500">Weight (kg)</span>
                  <input
                    type="number"
                    min="0"
                    value={draft.weightKg}
                    onChange={(event) => setDraft((prev) => ({ ...prev, weightKg: event.target.value }))}
                    placeholder="e.g. 72"
                    className="mt-1.5 min-h-[44px] w-full rounded-xl bg-zinc-950 px-3 text-base text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/45"
                  />
                </label>

                <label className="block">
                  <span className="text-[13px] font-medium text-zinc-500">Gender</span>
                  <select
                    value={draft.gender}
                    onChange={(event) => setDraft((prev) => ({ ...prev, gender: event.target.value }))}
                    className="mt-1.5 min-h-[44px] w-full rounded-xl bg-zinc-950 px-3 text-base text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/45"
                  >
                    <option value="">Select</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                </label>
              </div>
              </div>

              <div className="mt-3 rounded-2xl bg-zinc-900/90 p-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Timer Duration
                </p>
                <label className="mt-3 block">
                  <span className="text-[13px] font-medium text-zinc-500">Quick timer (seconds)</span>
                  <input
                    type="number"
                    min="10"
                    step="5"
                    value={draft.quickTimerSeconds ?? 150}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, quickTimerSeconds: event.target.value }))
                    }
                    placeholder="e.g. 150"
                    className="mt-1.5 min-h-[44px] w-full rounded-xl bg-zinc-950 px-3 text-base text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/45"
                  />
                </label>
              </div>
            </div>

            <div className="mt-auto grid shrink-0 grid-cols-2 gap-3 pt-2">
              <Motion.button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                whileTap={{ scale: 0.97 }}
                className="min-h-[44px] rounded-xl bg-zinc-900 text-[14px] font-medium text-zinc-200"
              >
                Cancel
              </Motion.button>
              <Motion.button
                type="button"
                onClick={() => {
                  const quickTimerSecondsNum = Number.parseInt(
                    String(draft.quickTimerSeconds ?? 150),
                    10
                  )
                  setProfileState({
                    ...draft,
                    quickTimerSeconds:
                      Number.isFinite(quickTimerSecondsNum) && quickTimerSecondsNum > 0
                        ? quickTimerSecondsNum
                        : 150,
                  })
                  setIsSettingsOpen(false)
                }}
                whileTap={{ scale: 0.97 }}
                className="min-h-[44px] rounded-xl bg-[var(--color-primary)] text-[14px] font-semibold text-zinc-950"
              >
                Save
              </Motion.button>
            </div>
          </div>
        </Motion.section>
      ) : null}
    </div>
  )
}

AuthPage.SignedInBadge = SignedInBadge

export default AuthPage
