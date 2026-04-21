import { useEffect, useState } from 'react'
import { motion as Motion } from 'framer-motion'
import { Check, Fire } from '@phosphor-icons/react'
import { useAppStore } from '../../state/useAppStore'
import { db } from '../../db/db'
import { WORKOUT_PROGRAM_UPDATED } from '../schedule/workoutProgram'

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function parsePRWeight(valueStr) {
  const match = String(valueStr ?? '')
    .trim()
    .match(/(\d+(?:\.\d+)?)/)
  if (!match) return null
  const n = Number.parseFloat(match[1])
  return Number.isFinite(n) ? n : null
}

function parseSetsReps(value) {
  const match = String(value ?? '')
    .trim()
    .match(/^(\d+)\s*x\s*(\d+)$/i)
  if (!match) return null
  const sets = Number.parseInt(match[1], 10)
  const reps = Number.parseInt(match[2], 10)
  if (!Number.isFinite(sets) || !Number.isFinite(reps) || sets <= 0 || reps <= 0) return null
  return { sets, reps }
}

function ProgressPage() {
  const streak = useAppStore((s) => s.streak)
  const [strengthFilter, setStrengthFilter] = useState('week')
  const [strengthDeltaPct, setStrengthDeltaPct] = useState(null)
  const jsDay = new Date().getDay() // 0=Sun ... 6=Sat
  const todayIndex = jsDay === 0 ? 6 : jsDay - 1 // Mon=0 ... Sun=6
  const completedBeforeToday = Math.min(Math.max(streak.current, 0), todayIndex)

  useEffect(() => {
    let cancelled = false

    async function computeStrengthProgress() {
      const now = new Date()
      const todayStart = new Date(now)
      todayStart.setHours(0, 0, 0, 0)

      let currentStart
      let previousStart
      let previousEnd

      if (strengthFilter === 'month') {
        currentStart = new Date(todayStart)
        currentStart.setDate(1)
        previousStart = new Date(currentStart)
        previousStart.setMonth(previousStart.getMonth() - 1)
        previousEnd = new Date(currentStart)
        previousEnd.setMilliseconds(-1)
      } else {
        const day = todayStart.getDay() // 0=Sun
        const mondayOffset = day === 0 ? -6 : 1 - day
        currentStart = new Date(todayStart)
        currentStart.setDate(currentStart.getDate() + mondayOffset)
        previousStart = new Date(currentStart)
        previousStart.setDate(previousStart.getDate() - 7)
        previousEnd = new Date(currentStart)
        previousEnd.setMilliseconds(-1)
      }

      const [completions, prs, templateRows] = await Promise.all([
        db.exerciseCompletions.toArray(),
        db.exercisePRs.toArray(),
        db.workoutTemplateItems.toArray(),
      ])

      const prByExercise = new Map()
      for (const row of prs) {
        prByExercise.set(row.exerciseId, parsePRWeight(row.valueStr))
      }

      const setsRepsByExercise = new Map()
      for (const row of templateRows) {
        const parsed = parseSetsReps(row.setsReps)
        if (!parsed) continue
        const existing = setsRepsByExercise.get(row.exerciseId)
        if (!existing || (row.updatedAt ?? 0) > existing.updatedAt) {
          setsRepsByExercise.set(row.exerciseId, { ...parsed, updatedAt: row.updatedAt ?? 0 })
        }
      }

      const scoreForRange = (startMs, endMs) =>
        completions
          .filter((row) => {
            if (!row.done || !row.date) return false
            const doneAt = new Date(`${row.date}T00:00:00`)
            const ts = doneAt.getTime()
            return ts >= startMs && ts <= endMs
          })
          .reduce((sum, row) => {
            const pr = prByExercise.get(row.exerciseId)
            const sr = setsRepsByExercise.get(row.exerciseId)
            if (!pr || !sr) return sum
            return sum + sr.sets * sr.reps * pr
          }, 0)

      const currentScore = scoreForRange(currentStart.getTime(), now.getTime())
      const previousScore = scoreForRange(previousStart.getTime(), previousEnd.getTime())
      const pct =
        previousScore > 0 ? ((currentScore - previousScore) / previousScore) * 100 : null

      if (!cancelled) {
        setStrengthDeltaPct(pct)
      }
    }

    computeStrengthProgress()
    const onUpdate = () => computeStrengthProgress()
    window.addEventListener(WORKOUT_PROGRAM_UPDATED, onUpdate)
    return () => {
      cancelled = true
      window.removeEventListener(WORKOUT_PROGRAM_UPDATED, onUpdate)
    }
  }, [strengthFilter])

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
          <div>
            <p className="text-[15px] font-semibold text-zinc-100">Strength progress</p>
            <p className="mt-1 text-[13px] text-zinc-500">
              {strengthFilter === 'month' ? 'This month vs last month' : 'This week vs last week'}
            </p>
          </div>
          <select
            value={strengthFilter}
            onChange={(event) => setStrengthFilter(event.target.value)}
            className="min-h-[34px] rounded-lg bg-zinc-900 px-2.5 text-[12px] text-zinc-300 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/45"
            aria-label="Strength progress timeframe"
          >
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <p
            className={`text-[32px] font-semibold tabular-nums ${
              strengthDeltaPct == null
                ? 'text-zinc-300'
                : strengthDeltaPct >= 0
                  ? 'text-emerald-400'
                  : 'text-red-400'
            }`}
          >
            {strengthDeltaPct == null
              ? '—'
              : `${strengthDeltaPct >= 0 ? '+' : ''}${strengthDeltaPct.toFixed(1)}%`}
          </p>
        </div>
      </Motion.div>

    </section>
  )
}

export default ProgressPage
