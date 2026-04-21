import { useEffect, useMemo, useState } from 'react'
import { motion as Motion } from 'framer-motion'
import { Check, Fire } from '@phosphor-icons/react'
import { useAppStore } from '../../state/useAppStore'
import { db } from '../../db/db'
import { WORKOUT_PROGRAM_UPDATED } from '../schedule/workoutProgram'

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const FILTERS = [
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
]
const COMPOUND_KEYWORDS = [
  'bench',
  'squat',
  'deadlift',
  'overhead press',
  'shoulder press',
  'row',
  'pull up',
  'chin up',
  'lunge',
  'hip thrust',
]

function parsePRWeight(valueStr) {
  const match = String(valueStr ?? '')
    .trim()
    .match(/(\d+(?:\.\d+)?)/)
  if (!match) return null
  const value = Number.parseFloat(match[1])
  return Number.isFinite(value) ? value : null
}

function startOfLocalDay(dateLike) {
  const d = new Date(dateLike)
  d.setHours(0, 0, 0, 0)
  return d
}

function getRangeBounds(filter) {
  const now = new Date()
  const currentEnd = now
  const currentStart = startOfLocalDay(now)

  if (filter === 'week') {
    const day = currentStart.getDay() // 0=Sun
    const mondayOffset = day === 0 ? -6 : 1 - day
    currentStart.setDate(currentStart.getDate() + mondayOffset)
    const previousStart = new Date(currentStart)
    previousStart.setDate(previousStart.getDate() - 7)
    const previousEnd = new Date(currentStart)
    previousEnd.setMilliseconds(-1)
    return { currentStart, currentEnd, previousStart, previousEnd }
  }

  currentStart.setDate(1)
  const previousStart = new Date(currentStart)
  previousStart.setMonth(previousStart.getMonth() - 1)
  const previousEnd = new Date(currentStart)
  previousEnd.setMilliseconds(-1)
  return { currentStart, currentEnd, previousStart, previousEnd }
}

function ProgressPage() {
  const streak = useAppStore((s) => s.streak)
  const [filter, setFilter] = useState('week')
  const [liftMetrics, setLiftMetrics] = useState({
    avg: null,
    deltaPct: null,
    sampleCount: 0,
  })
  const jsDay = new Date().getDay() // 0=Sun ... 6=Sat
  const todayIndex = jsDay === 0 ? 6 : jsDay - 1 // Mon=0 ... Sun=6
  const completedBeforeToday = Math.min(Math.max(streak.current, 0), todayIndex)

  const compoundRegex = useMemo(
    () => new RegExp(COMPOUND_KEYWORDS.map((k) => k.replace(/\s+/g, '\\s+')).join('|'), 'i'),
    []
  )

  useEffect(() => {
    let cancelled = false

    async function computeLiftMetrics() {
      const { currentStart, currentEnd, previousStart, previousEnd } = getRangeBounds(filter)
      const [allExercises, allPRs] = await Promise.all([db.exercises.toArray(), db.exercisePRs.toArray()])

      const compoundExerciseIds = new Set(
        allExercises.filter((e) => compoundRegex.test(e.name ?? '')).map((e) => e.id)
      )

      const usable = allPRs
        .filter((row) => compoundExerciseIds.has(row.exerciseId))
        .map((row) => ({
          ...row,
          weight: parsePRWeight(row.valueStr),
        }))
        .filter((row) => row.weight != null)

      const currentRows = usable.filter((row) => {
        const ts = row.updatedAt ?? 0
        return ts >= currentStart.getTime() && ts <= currentEnd.getTime()
      })
      const previousRows = usable.filter((row) => {
        const ts = row.updatedAt ?? 0
        return ts >= previousStart.getTime() && ts <= previousEnd.getTime()
      })

      const avg = (rows) =>
        rows.length ? rows.reduce((sum, row) => sum + row.weight, 0) / rows.length : null

      const currentAvg = avg(currentRows)
      const previousAvg = avg(previousRows)
      const deltaPct =
        currentAvg != null && previousAvg != null && previousAvg > 0
          ? ((currentAvg - previousAvg) / previousAvg) * 100
          : null

      if (!cancelled) {
        setLiftMetrics({
          avg: currentAvg,
          deltaPct,
          sampleCount: currentRows.length,
        })
      }
    }

    computeLiftMetrics()
    const onUpdate = () => computeLiftMetrics()
    window.addEventListener(WORKOUT_PROGRAM_UPDATED, onUpdate)
    return () => {
      cancelled = true
      window.removeEventListener(WORKOUT_PROGRAM_UPDATED, onUpdate)
    }
  }, [compoundRegex, filter])

  return (
    <section className="flex w-full max-w-full flex-1 flex-col overflow-hidden pt-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Progress</h1>
      </header>

      <Motion.div
        className="mt-4 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-[var(--color-primary)]">
            <Fire size={16} weight="fill" />
          </span>
          <p className="text-[15px] font-semibold text-zinc-100">Current streak</p>
        </div>

        <p className="mt-3 text-4xl font-semibold tabular-nums text-zinc-100">{streak.current}</p>
        <p className="mt-1 text-[13px] text-zinc-500">days in a row</p>
      </Motion.div>

      <Motion.div
        className="mt-4 w-full max-w-full rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="grid grid-cols-7 gap-2">
          {WEEK_DAYS.map((day, index) => {
            const isCompleted = index < completedBeforeToday
            const isToday = index === todayIndex

            return (
              <div key={day} className="flex min-w-0 flex-col items-center gap-2">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    isCompleted
                      ? 'bg-[var(--color-primary)] text-zinc-950'
                      : isToday
                        ? 'border-2 border-[var(--color-primary)] bg-zinc-900 text-[var(--color-primary)]'
                        : 'bg-zinc-800/90 text-zinc-600'
                  }`}
                >
                  {isCompleted ? <Check size={18} weight="bold" /> : null}
                </div>
                <span className="text-[13px] font-medium text-zinc-400">{day}</span>
              </div>
            )
          })}
        </div>
      </Motion.div>

      <Motion.div
        className="mt-4 w-full max-w-full rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-[15px] font-semibold text-zinc-100">Average lift</p>
          <label className="sr-only" htmlFor="progress-lift-filter">
            Filter timeframe
          </label>
          <select
            id="progress-lift-filter"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="min-h-[36px] rounded-lg bg-zinc-900 px-2.5 text-[13px] text-zinc-300 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/45"
          >
            {FILTERS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3">
          <p className="text-[13px] text-zinc-500">Compound PR average</p>
        </div>

        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <p className="text-[28px] font-semibold tabular-nums text-zinc-100">
              {liftMetrics.avg != null ? `${liftMetrics.avg.toFixed(1)} kg` : '—'}
            </p>
          </div>
          <p
            className={`text-[16px] font-semibold tabular-nums ${
              liftMetrics.deltaPct == null
                ? 'text-zinc-500'
                : liftMetrics.deltaPct >= 0
                  ? 'text-emerald-400'
                  : 'text-red-400'
            }`}
          >
            {liftMetrics.deltaPct == null
              ? '—'
              : `${liftMetrics.deltaPct >= 0 ? '+' : ''}${liftMetrics.deltaPct.toFixed(1)}%`}
          </p>
        </div>
        <p className="mt-1 text-[12px] text-zinc-500">{liftMetrics.sampleCount} samples</p>
      </Motion.div>
    </section>
  )
}

export default ProgressPage
