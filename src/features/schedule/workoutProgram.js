import { db } from '../../db/db'
import { toISODateLocal } from './workoutSchedule'

export const WORKOUT_PROGRAM_UPDATED = 'workout-program-updated'

export function dispatchWorkoutProgramUpdated() {
  window.dispatchEvent(new CustomEvent(WORKOUT_PROGRAM_UPDATED))
}

export function completionKey(date, exerciseId) {
  return `${toISODateLocal(date)}_${exerciseId}`
}

/**
 * @param {string} workoutType
 * @returns {Promise<Array<{ templateId: number, exerciseId: number, wgerId: number | null, name: string, setsReps: string, prDisplay: string }>>}
 */
export async function getTemplateWithMeta(workoutType) {
  const rows = await db.workoutTemplateItems.where('workoutType').equals(workoutType).sortBy('sortOrder')
  const items = await Promise.all(
    rows.map(async (r) => {
      const ex = await db.exercises.get(r.exerciseId)
      const prRow = await db.exercisePRs.get(r.exerciseId)
      return {
        templateId: r.id,
        exerciseId: r.exerciseId,
        wgerId: ex?.wgerId ?? null,
        name: ex?.name ?? 'Unknown exercise',
        setsReps: r.setsReps ?? '3 x 10',
        prDisplay: prRow?.valueStr?.trim() ? prRow.valueStr : '—',
      }
    })
  )
  return items
}

/**
 * @param {string} workoutType
 * @param {number} exerciseDexieId
 */
export async function addTemplateExercise(workoutType, exerciseDexieId) {
  const existingRows = await db.workoutTemplateItems.where('workoutType').equals(workoutType).toArray()
  if (existingRows.some((r) => r.exerciseId === exerciseDexieId)) {
    return null
  }

  const existing = existingRows
  const sortOrder = existing.length === 0 ? 0 : Math.max(...existing.map((r) => r.sortOrder)) + 1

  const id = await db.workoutTemplateItems.add({
    workoutType,
    exerciseId: exerciseDexieId,
    setsReps: '3 x 10',
    sortOrder,
    updatedAt: Date.now(),
  })
  dispatchWorkoutProgramUpdated()
  return id
}

export async function removeTemplateRow(templateId) {
  await db.workoutTemplateItems.delete(templateId)
  dispatchWorkoutProgramUpdated()
}

export async function updateTemplateSetsReps(templateId, setsReps) {
  await db.workoutTemplateItems.update(templateId, { setsReps, updatedAt: Date.now() })
  dispatchWorkoutProgramUpdated()
}

/**
 * @param {Date} date
 * @param {number} exerciseId
 */
export async function getExerciseDoneForDate(date, exerciseId) {
  const key = completionKey(date, exerciseId)
  const row = await db.exerciseCompletions.where('completionKey').equals(key).first()
  return Boolean(row?.done)
}

/**
 * @param {Date} date
 * @param {number} exerciseId
 * @param {boolean} done
 */
export async function setExerciseDoneForDate(date, exerciseId, done) {
  const key = completionKey(date, exerciseId)
  const iso = toISODateLocal(date)
  const existing = await db.exerciseCompletions.where('completionKey').equals(key).first()
  if (existing) {
    await db.exerciseCompletions.update(existing.id, { done, updatedAt: Date.now() })
  } else {
    await db.exerciseCompletions.add({
      completionKey: key,
      date: iso,
      exerciseId,
      done,
      updatedAt: Date.now(),
    })
  }
  dispatchWorkoutProgramUpdated()
}

/**
 * @param {number} exerciseId
 * @param {string} valueStr
 */
export async function setExercisePR(exerciseId, valueStr) {
  const trimmed = valueStr.trim()
  await db.exercisePRs.put({
    exerciseId,
    valueStr: trimmed || '—',
    updatedAt: Date.now(),
  })
  dispatchWorkoutProgramUpdated()
}
