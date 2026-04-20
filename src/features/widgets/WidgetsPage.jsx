import { useState } from 'react'
import { motion as Motion } from 'framer-motion'
import { CaretRight, Timer } from '@phosphor-icons/react'
import TimerPage from './TimerPage'

const WIDGETS = [
  {
    id: 'timer',
    name: 'Timer',
    icon: Timer,
  },
]

function WidgetsPage() {
  const [activeWidget, setActiveWidget] = useState(null)

  if (activeWidget === 'timer') {
    return <TimerPage onBack={() => setActiveWidget(null)} />
  }

  return (
    <section className="flex flex-1 flex-col pt-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Widget Library</h1>
      </header>

      <div className="mt-5 flex flex-col gap-3">
        {WIDGETS.map((widget) => {
          const Icon = widget.icon
          return (
            <Motion.button
              key={widget.id}
              type="button"
              onClick={() => setActiveWidget(widget.id)}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 520, damping: 34 }}
              className="w-full rounded-2xl bg-white/[0.06] px-4 py-3 text-left ring-1 ring-white/8"
            >
              <div className="flex items-center gap-3">
                <div className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl bg-zinc-800 text-[var(--color-primary)]">
                  <Icon size={18} weight="bold" />
                </div>
                <p className="text-sm font-semibold text-zinc-100">{widget.name}</p>
                <span className="ml-auto inline-flex min-h-[30px] min-w-[30px] items-center justify-center rounded-full bg-zinc-800/90 text-zinc-300">
                  <CaretRight size={14} weight="bold" />
                </span>
              </div>
            </Motion.button>
          )
        })}
      </div>
    </section>
  )
}

export default WidgetsPage
