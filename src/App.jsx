import { useEffect, useState } from 'react'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import DomainSelector from './components/DomainSelector'
import BottomNavigation from './components/BottomNavigation'
import SchedulePage from './features/schedule/SchedulePage'
import TodayPage from './features/today/TodayPage'
import WidgetsPage from './features/widgets/WidgetsPage'
import ProgressPage from './features/progress/ProgressPage'
import { useAppStore } from './state/useAppStore'
import AuthPage from './features/auth/AuthPage'
import { hasSupabaseEnv, supabase } from './lib/supabase'

function App() {
  const selectedDomain = useAppStore((state) => state.selectedDomain)
  const selectedNavTab = useAppStore((state) => state.selectedNavTab)
  const setSelectedDomain = useAppStore((state) => state.setSelectedDomain)
  const setSelectedNavTab = useAppStore((state) => state.setSelectedNavTab)
  const [session, setSession] = useState(null)
  const [isAppLoading, setIsAppLoading] = useState(true)
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setIsAppLoading(false)
      return undefined
    }

    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session ?? null)
      setIsAppLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null)
      setIsAppLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const primaryByDomain = {
      fitness: '#ff006e',
      finance: '#dfff00',
    }

    root.style.setProperty('--color-primary', primaryByDomain[selectedDomain] ?? primaryByDomain.fitness)
  }, [selectedDomain])

  if (isAppLoading) {
    return (
      <main className="min-h-svh w-full bg-black">
        <section className="mx-auto flex min-h-svh w-full max-w-md items-center justify-center px-5">
          <p className="text-sm font-medium text-zinc-500">Loading...</p>
        </section>
      </main>
    )
  }

  const handleAuthenticate = async ({ mode, email, password }) => {
    if (!supabase) {
      throw new Error('Missing Supabase configuration.')
    }
    setIsAuthSubmitting(true)
    try {
      const { error } =
        mode === 'sign-up'
          ? await supabase.auth.signUp({ email, password })
          : await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } finally {
      setIsAuthSubmitting(false)
    }
  }

  const handleLogout = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  if (!session) {
    return (
      <AuthPage
        hasSupabaseEnv={hasSupabaseEnv}
        isSubmitting={isAuthSubmitting}
        onAuthenticate={handleAuthenticate}
      />
    )
  }

  return (
    <Motion.main
      id="app-root"
      className="min-h-svh w-full bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className="mx-auto flex min-h-svh w-full max-w-md flex-col px-5 pb-32 pt-[max(env(safe-area-inset-top),1rem)]">
        <header className="flex items-center justify-start">
          <DomainSelector selectedDomain={selectedDomain} onSelect={setSelectedDomain} />
          <AuthPage.SignedInBadge email={session?.user?.email ?? 'Logged in'} onLogout={handleLogout} />
        </header>

        <AnimatePresence mode="wait">
          {selectedNavTab === 'today' ? (
            <Motion.div
              key="tab-today"
              className="flex flex-1 flex-col"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <TodayPage />
            </Motion.div>
          ) : selectedNavTab === 'schedule' ? (
            <Motion.div
              key="tab-schedule"
              className="flex flex-1 flex-col"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <SchedulePage />
            </Motion.div>
          ) : selectedNavTab === 'widgets' ? (
            <Motion.div
              key="tab-widgets"
              className="flex flex-1 flex-col"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <WidgetsPage />
            </Motion.div>
          ) : selectedNavTab === 'progress' ? (
            <Motion.div
              key="tab-progress"
              className="flex flex-1 flex-col"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <ProgressPage />
            </Motion.div>
          ) : (
            <Motion.section
              key="tab-other"
              className="flex flex-1 items-center justify-center"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div className="rounded-3xl bg-white/[0.06] px-6 py-7 text-center">
                <p className="text-[13px] uppercase tracking-[0.18em] text-zinc-500">Current Domain</p>
                <h1 className="mt-3 text-2xl font-semibold text-zinc-100">
                  {selectedDomain.charAt(0).toUpperCase() + selectedDomain.slice(1)}
                </h1>
                <p className="mt-2 text-[14px] text-zinc-400">App content will be based on this selection.</p>
              </div>
            </Motion.section>
          )}
        </AnimatePresence>
      </div>
      <BottomNavigation selectedTab={selectedNavTab} onSelect={setSelectedNavTab} />
    </Motion.main>
  )
}

export default App
