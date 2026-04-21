import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion as Motion, useReducedMotion } from 'framer-motion'
import { ArrowCounterClockwise, Check, Fire, Pause, Play, Timer } from '@phosphor-icons/react'
import { getWorkoutForDate, toISODateLocal } from '../schedule/workoutSchedule'
import { useAppStore } from '../../state/useAppStore'
import {
  WORKOUT_PROGRAM_UPDATED,
  getExerciseDoneForDate,
  getTemplateWithMeta,
  setExerciseDoneForDate,
  setExercisePR,
} from '../schedule/workoutProgram'

function TodayPage() {
  const reduceMotion = useReducedMotion()
  const transition = reduceMotion
    ? { duration: 0.01 }
    : { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }

  const now = new Date()

  const dayLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
  }).format(now)

  const dateLabel = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(now)

  const selectedDomain = useAppStore((s) => s.selectedDomain)
  const missedWorkoutDates = useAppStore((s) => s.missedWorkoutDates)
  const weeklyPlan = useAppStore((s) => s.weeklyPlan)
  const streak = useAppStore((s) => s.streak)
  const quickTimerDefaultSeconds = useAppStore((s) => s.profile.quickTimerSeconds || 150)
  const setStreakState = useAppStore((s) => s.setStreakState)
  const setSelectedNavTab = useAppStore((s) => s.setSelectedNavTab)

  const todayStart = useMemo(() => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return t
  }, [])
  const dayPlan = getWorkoutForDate(todayStart, missedWorkoutDates, weeklyPlan)
  const workoutId = dayPlan.kind === 'workout' ? dayPlan.id : null

  const [rows, setRows] = useState([])
  const [todayLoading, setTodayLoading] = useState(false)
  const [prDrafts, setPrDrafts] = useState({})
  const [prSavingByExercise, setPrSavingByExercise] = useState({})
  const [showMiniTimer, setShowMiniTimer] = useState(false)
  const [miniTimerRunning, setMiniTimerRunning] = useState(false)
  const [miniTimerSeconds, setMiniTimerSeconds] = useState(quickTimerDefaultSeconds)

  const loadTodayWorkout = useCallback(async () => {
    if (!workoutId) {
      setRows([])
      setPrDrafts({})
      return
    }
    setTodayLoading(true)
    try {
      const items = await getTemplateWithMeta(workoutId)
      const dones = await Promise.all(
        items.map((item) => getExerciseDoneForDate(todayStart, item.exerciseId))
      )
      setRows(
        items.map((item, i) => ({
          ...item,
          done: dones[i],
        }))
      )
      setPrDrafts(
        Object.fromEntries(
          items.map((item) => [
            item.exerciseId,
            item.prDisplay === '—' ? '' : item.prDisplay,
          ])
        )
      )
    } finally {
      setTodayLoading(false)
    }
  }, [workoutId, todayStart])

  useEffect(() => {
    loadTodayWorkout()
  }, [loadTodayWorkout])

  useEffect(() => {
    const onUpdate = () => loadTodayWorkout()
    window.addEventListener(WORKOUT_PROGRAM_UPDATED, onUpdate)
    return () => window.removeEventListener(WORKOUT_PROGRAM_UPDATED, onUpdate)
  }, [loadTodayWorkout])

  const handleToggleDone = async (exerciseId, next) => {
    const isoToday = toISODateLocal(todayStart)
    const prevRows = rows
    const nextRows = prevRows.map((r) => (r.exerciseId === exerciseId ? { ...r, done: next } : r))

    setRows(nextRows)
    try {
      await setExerciseDoneForDate(todayStart, exerciseId, next)

      const allDoneNow = nextRows.length > 0 && nextRows.every((r) => r.done)
      if (allDoneNow && streak.lastCompletedDate !== isoToday) {
        const nextCurrent = streak.current + 1
        setStreakState({
          current: nextCurrent,
          longest: Math.max(streak.longest, nextCurrent),
          lastCompletedDate: isoToday,
        })
      }
    } catch {
      setRows(prevRows)
    }
  }

  const handleSavePr = async (exerciseId) => {
    const raw = (prDrafts[exerciseId] ?? '').trim()
    setPrSavingByExercise((prev) => ({ ...prev, [exerciseId]: true }))
    try {
      await setExercisePR(exerciseId, raw)
      setRows((prev) =>
        prev.map((r) =>
          r.exerciseId === exerciseId ? { ...r, prDisplay: raw || '—' } : r
        )
      )
    } finally {
      setPrSavingByExercise((prev) => ({ ...prev, [exerciseId]: false }))
    }
  }

  useEffect(() => {
    if (!miniTimerRunning || !showMiniTimer) return undefined
    const interval = window.setInterval(() => {
      setMiniTimerSeconds((current) => {
        const next = Math.max(current - 1, 0)
        if (next === 0) {
          setMiniTimerRunning(false)
        }
        return next
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [miniTimerRunning, showMiniTimer])

  useEffect(() => {
    if (!miniTimerRunning) {
      setMiniTimerSeconds(quickTimerDefaultSeconds)
    }
  }, [quickTimerDefaultSeconds, miniTimerRunning])

  const miniMinutes = Math.floor(miniTimerSeconds / 60)
  const miniSeconds = miniTimerSeconds % 60

  return (
    <section className="pt-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-[-0.02em] text-zinc-100">{dayLabel}</h1>
        <Motion.button
          type="button"
          onClick={() => setShowMiniTimer((current) => !current)}
          whileTap={reduceMotion ? undefined : { scale: 0.93 }}
          transition={{ type: 'spring', stiffness: 480, damping: 34 }}
          className={`inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full ring-1 transition-colors ${
            showMiniTimer
              ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] ring-[var(--color-primary)]/45'
              : 'bg-zinc-900 text-zinc-300 ring-white/10'
          }`}
          aria-label="Toggle mini timer"
        >
          <Timer size={18} weight="bold" />
        </Motion.button>
      </div>
      <p className="mt-0.5 text-[14px] font-semibold text-zinc-500">{dateLabel}</p>
      <Motion.div
        className="mt-3 rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/8"
        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0.01 } : { duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800/90 text-[var(--color-primary)]">
            <Fire size={16} weight="fill" />
          </span>
          <p className="text-[15px] font-semibold text-zinc-100">Streaks</p>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 rounded-xl bg-zinc-900/80 px-3 py-2">
            <p className="text-[12px] font-medium uppercase tracking-wide text-zinc-500">Current</p>
            <p className="mt-1 text-[20px] font-semibold tabular-nums text-zinc-100">{streak.current}</p>
          </div>
          <div className="flex-1 rounded-xl bg-zinc-900/80 px-3 py-2">
            <p className="text-[12px] font-medium uppercase tracking-wide text-zinc-500">Longest</p>
            <p className="mt-1 text-[20px] font-semibold tabular-nums text-zinc-100">{streak.longest}</p>
          </div>
        </div>
      </Motion.div>
      {showMiniTimer ? (
        <Motion.div
          initial={reduceMotion ? false : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
          transition={reduceMotion ? { duration: 0.01 } : { duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-3 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/8"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Quick Timer</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-100">
                {String(miniMinutes).padStart(2, '0')}:{String(miniSeconds).padStart(2, '0')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Motion.button
                type="button"
                onClick={() => setMiniTimerSeconds(quickTimerDefaultSeconds)}
                whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                aria-label="Reset mini timer"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-zinc-900 text-zinc-200 ring-1 ring-white/10"
              >
                <ArrowCounterClockwise size={16} weight="bold" />
              </Motion.button>
              <Motion.button
                type="button"
                onClick={() => {
                  if (!miniTimerRunning && miniTimerSeconds === 0) {
                    setMiniTimerSeconds(quickTimerDefaultSeconds)
                  }
                  setMiniTimerRunning((current) => !current)
                }}
                whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                aria-label={miniTimerRunning ? 'Pause mini timer' : 'Start mini timer'}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-[var(--color-primary)]/90 text-zinc-950 ring-1 ring-[var(--color-primary)]/45"
              >
                {miniTimerRunning ? <Pause size={16} weight="bold" /> : <Play size={16} weight="fill" />}
              </Motion.button>
            </div>
          </div>
        </Motion.div>
      ) : null}

      {selectedDomain === 'fitness' ? (
        <Motion.div
          className="mt-6"
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transition}
        >
          {dayPlan.kind === 'rest' ? (
            <p className="mt-2 text-lg font-semibold text-zinc-200">{dayPlan.label}</p>
          ) : dayPlan.kind === 'missed' ? (
            <>
              <p className="mt-2 text-lg font-semibold text-zinc-200">Missed</p>
              <p className="mt-1 text-[14px] font-medium text-zinc-500">
                Session moved — check Schedule for your updated week.
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 text-lg font-semibold text-zinc-100">{dayPlan.label}</p>

              {todayLoading ? (
                <p className="mt-4 text-[14px] font-medium text-zinc-500">Loading workout…</p>
              ) : rows.length === 0 ? (
                <p className="mt-4 text-[14px] font-medium text-zinc-500">
                  No exercises in this template yet — add them in Schedule.
                </p>
              ) : (
                <ul className="mt-4 space-y-3" aria-label="Today exercises">
                  {rows.map((row) => (
                    <li key={row.templateId} className="rounded-xl bg-zinc-900/80 px-3 py-3">
                      <div className="flex items-start gap-3">
                        <label className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center">
                          <span className="sr-only">Done {row.name}</span>
                          <input
                            type="checkbox"
                            checked={row.done}
                            onChange={(e) => handleToggleDone(row.exerciseId, e.target.checked)}
                            className="peer sr-only"
                          />
                          <Motion.span
                            whileTap={reduceMotion ? undefined : { scale: 0.9 }}
                            animate={
                              reduceMotion
                                ? undefined
                                : { scale: row.done ? [1, 1.12, 1] : [1, 0.96, 1] }
                            }
                            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                            className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-500 bg-zinc-900 transition-colors duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-primary)]/45 peer-checked:border-[var(--color-primary)] peer-checked:bg-[var(--color-primary)]"
                          >
                            <Motion.span
                              animate={
                                reduceMotion
                                  ? undefined
                                  : { opacity: row.done ? 1 : 0, scale: row.done ? 1 : 0.75 }
                              }
                              transition={{ duration: 0.16, ease: 'easeOut' }}
                            >
                              <Check
                              size={12}
                              weight="bold"
                              className="text-zinc-950"
                              />
                            </Motion.span>
                          </Motion.span>
                        </label>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-zinc-100">{row.name}</p>
                          <p className="mt-0.5 text-[14px] font-medium text-zinc-500">{row.setsReps}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-[12px] font-semibold uppercase tracking-wide text-zinc-500">
                              PR
                            </span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={prDrafts[row.exerciseId] ?? ''}
                              disabled={!row.done}
                              onChange={(e) =>
                                setPrDrafts((d) => ({
                                  ...d,
                                  [row.exerciseId]: e.target.value,
                                }))
                              }
                              placeholder="e.g. 32.5 kg"
                              className={`min-h-[44px] min-w-0 flex-1 rounded-lg px-3 py-2 text-base font-medium placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/45 ${
                                row.done
                                  ? 'bg-zinc-900/90 text-zinc-200'
                                  : 'cursor-not-allowed bg-zinc-900/40 text-zinc-500'
                              }`}
                            />
                            <Motion.button
                              type="button"
                              disabled={
                                !row.done ||
                                prSavingByExercise[row.exerciseId] ||
                                (prDrafts[row.exerciseId] ?? '').trim() ===
                                  (row.prDisplay === '—' ? '' : row.prDisplay)
                              }
                              onClick={() => handleSavePr(row.exerciseId)}
                              whileTap={
                                !row.done || prSavingByExercise[row.exerciseId]
                                  ? undefined
                                  : { scale: 0.97 }
                              }
                              className={`min-h-[44px] rounded-lg px-3.5 text-[14px] font-semibold transition-colors duration-150 ${
                                !row.done ||
                                prSavingByExercise[row.exerciseId] ||
                                (prDrafts[row.exerciseId] ?? '').trim() ===
                                  (row.prDisplay === '—' ? '' : row.prDisplay)
                                  ? 'cursor-not-allowed bg-white/5 text-zinc-500'
                                  : 'bg-[var(--color-primary)]/90 text-zinc-950 hover:bg-[var(--color-primary)]'
                              }`}
                            >
                              {prSavingByExercise[row.exerciseId] ? 'Saving...' : 'Save'}
                            </Motion.button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          <Motion.button
            type="button"
            onClick={() => setSelectedNavTab('schedule')}
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            className="mt-4 w-full rounded-xl bg-white/5 py-3 text-[15px] font-semibold text-zinc-200 transition-colors duration-150 hover:bg-white/10"
          >
            Open schedule
          </Motion.button>
        </Motion.div>
      ) : null}
    </section>
  )
}

export default TodayPage
