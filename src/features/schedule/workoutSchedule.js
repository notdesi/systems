/** Monday reference for stable working-day ordinals (UTC-safe local dates). */
export const ORDINAL_EPOCH_MONDAY = new Date(2000, 0, 3)

export const WORKOUT_OPTIONS = ['push', 'pull', 'leg', 'cardio']

export const DEFAULT_WEEKLY_PLAN = {
  1: ['push'],
  2: ['pull'],
  3: ['leg'],
  4: ['cardio'],
  5: ['push'],
  6: ['pull'],
  0: ['leg'],
}

export const WORKOUT_LABELS = {
  push: 'Push',
  pull: 'Pull',
  cardio: 'Cardio',
  leg: 'Leg',
  rest: 'Rest',
}

/** Compact line under weekday chips */
export const WORKOUT_COMPACT = {
  push: 'Push',
  pull: 'Pull',
  cardio: 'Cardio',
  leg: 'Leg',
}

/** Strip shows only where training falls after shifts (no “miss” label). */
export function getWorkoutStripLabel(plan) {
  if (plan.kind === 'rest') return 'Rest'
  if (plan.kind === 'missed') return null
  return WORKOUT_COMPACT[plan.id] ?? plan.label
}

export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function toISODateLocal(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function normalizeWeeklyPlan(plan) {
  const next = {}
  for (const weekday of [0, 1, 2, 3, 4, 5, 6]) {
    const raw = Array.isArray(plan?.[weekday]) ? plan[weekday] : DEFAULT_WEEKLY_PLAN[weekday]
    const cleaned = [...new Set(raw)].filter((opt) => WORKOUT_OPTIONS.includes(opt))
    next[weekday] = cleaned.length > 0 ? cleaned : [DEFAULT_WEEKLY_PLAN[weekday][0]]
  }
  return next
}

/**
 * @param {Date} date
 * @param {string[]} missedDatesSorted ISO local YYYY-MM-DD, unique, sorted
 * @param {{ [weekday: number]: string[] }} weeklyPlan
 * @returns {{ kind: 'rest', label: string } | { kind: 'missed' } | { kind: 'workout', id: string, label: string, options: string[] }}
 */
export function getWorkoutForDate(date, missedDatesSorted, weeklyPlan = DEFAULT_WEEKLY_PLAN) {
  const iso = toISODateLocal(date)
  const day = new Date(date).getDay()
  const normalizedPlan = normalizeWeeklyPlan(weeklyPlan)

  if (missedDatesSorted.includes(iso)) {
    return { kind: 'missed' }
  }

  const options = normalizedPlan[day] ?? []
  if (options.length === 0) {
    return { kind: 'rest', label: WORKOUT_LABELS.rest }
  }

  const id = options[0]

  return {
    kind: 'workout',
    id,
    label: WORKOUT_LABELS[id] ?? id,
    options,
  }
}

export function sortMissedDates(dates) {
  return [...new Set(dates)].sort()
}
