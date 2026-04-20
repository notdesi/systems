import { motion as Motion } from 'framer-motion'
import { CalendarDots, ChartLineUp, PersonSimpleRun, SquaresFour } from '@phosphor-icons/react'

const NAV_ITEMS = [
  { id: 'today', label: 'Today', icon: PersonSimpleRun },
  { id: 'schedule', label: 'Schedule', icon: CalendarDots },
  { id: 'progress', label: 'Progress', icon: ChartLineUp },
  { id: 'widgets', label: 'Widgets', icon: SquaresFour },
]

function BottomNavigation({ selectedTab, onSelect }) {
  return (
    <nav className="fixed inset-x-0 bottom-4 z-30 mx-auto w-full max-w-md px-5">
      <div className="grid grid-cols-4 rounded-[999px] bg-zinc-900/95 p-2 shadow-[0_8px_36px_rgba(0,0,0,0.55)] backdrop-blur">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = item.id === selectedTab

          return (
            <Motion.button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 520, damping: 32 }}
              className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-[999px] py-2.5 transition-colors duration-150 ${
                isActive
                  ? 'bg-zinc-700/45 text-[var(--color-primary)]'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
              }`}
            >
              <Icon size={18} weight={isActive ? 'fill' : 'regular'} />
              <span className="text-[11px] font-medium">{item.label}</span>
            </Motion.button>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNavigation
