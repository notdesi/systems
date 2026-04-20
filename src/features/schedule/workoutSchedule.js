/** Monday reference for stable working-day ordinals (UTC-safe local dates). */
export const ORDINAL_EPOCH_MONDAY = new Date(2000, 0, 3)

/** Mon–Sat repeating template (Sunday is always rest, not in this list). */
export const WORKOUT_CYCLE = ['push', 'pull', 'cardio', 'legs', 'push', 'pullLegs']

export const WORKOUT_LABELS = {
  push: 'Push',
  pull: 'Pull',
  cardio: 'Cardio',
  legs: 'Legs',
  pullLegs: 'Pull + Legs',
  rest: 'Rest',
}

/** Compact line under weekday chips */
export const WORKOUT_COMPACT = {
  push: 'Push',
  pull: 'Pull',
  cardio: 'Cardio',
  legs: 'Legs',
  pullLegs: 'P+L',
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

export function isSunday(date) {
  return new Date(date).getDay() === 0
}

/** Working days Mon–Sat only; Sunday is not a training ordinal. */
export function workingDayOrdinal(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  if (d.getDay() === 0) return null

  let before = 0
  const cursor = new Date(ORDINAL_EPOCH_MONDAY)
  cursor.setHours(0, 0, 0, 0)

  while (cursor < d) {
    if (cursor.getDay() !== 0) before += 1
    cursor.setDate(cursor.getDate() + 1)
  }
  return before
}

/**
 * @param {Date} date
 * @param {string[]} missedDatesSorted ISO local YYYY-MM-DD, unique, sorted
 * @returns {{ kind: 'rest' } | { kind: 'missed' } | { kind: 'workout', id: string, label: string }}
 */
export function getWorkoutForDate(date, missedDatesSorted) {
  const iso = toISODateLocal(date)

  if (isSunday(date)) {
    return { kind: 'rest', label: WORKOUT_LABELS.rest }
  }

  if (missedDatesSorted.includes(iso)) {
    return { kind: 'missed' }
  }

  const ord = workingDayOrdinal(date)
  if (ord === null) {
    return { kind: 'rest', label: WORKOUT_LABELS.rest }
  }

  const priorMisses = missedDatesSorted.filter((m) => m < iso).length
  const idx = ord - priorMisses
  const id = WORKOUT_CYCLE[((idx % WORKOUT_CYCLE.length) + WORKOUT_CYCLE.length) % WORKOUT_CYCLE.length]

  return {
    kind: 'workout',
    id,
    label: WORKOUT_LABELS[id] ?? id,
  }
}

export function sortMissedDates(dates) {
  return [...new Set(dates)].sort()
}
