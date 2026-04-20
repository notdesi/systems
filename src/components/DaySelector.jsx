import { motion as Motion } from 'framer-motion'
import { getWorkoutForDate, getWorkoutStripLabel, isSameDay } from '../features/schedule/workoutSchedule'

function startOfWeekMonday(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

/**
 * Horizontal week strip (Mon–Sun). Controlled by `value` / `onChange`.
 * Pass `missedWorkoutDates` to show the shifted plan under each weekday.
 */
function DaySelector({ value, onChange, missedWorkoutDates = null }) {
  const weekStart = startOfWeekMonday(value)
  const weekdayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short' })

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })

  return (
    <div
      className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="Week days"
    >
      {days.map((day) => {
        const selected = isSameDay(day, value)
        const plan =
          missedWorkoutDates != null ? getWorkoutForDate(day, missedWorkoutDates) : null
        const strip = plan != null ? getWorkoutStripLabel(plan) : null

        return (
          <Motion.button
            key={day.toISOString()}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(new Date(day))}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 480, damping: 30 }}
            className={`flex min-h-[2.75rem] min-w-[2.85rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-2 text-center transition-colors duration-150 ${
              selected
                ? 'bg-zinc-700/50 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/35'
                : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
            }`}
          >
            <span className="text-[10px] font-medium uppercase tracking-wide opacity-90">
              {weekdayFmt.format(day)}
            </span>
            {strip != null ? (
              <span
                className={`max-w-[3.25rem] truncate text-[9px] font-medium leading-tight ${
                  selected ? 'text-zinc-200' : 'text-zinc-500'
                }`}
              >
                {strip}
              </span>
            ) : null}
          </Motion.button>
        )
      })}
    </div>
  )
}

export default DaySelector
