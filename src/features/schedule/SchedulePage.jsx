import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, LayoutGroup, motion as Motion } from 'framer-motion'
import {
  Barbell,
  Check,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  X,
} from '@phosphor-icons/react'
import { getExerciseDetail, pickExerciseNameFromDetail, searchExercises } from '../../api/wger'
import { db } from '../../db/db'
import DaySelector from '../../components/DaySelector'
import {
  getWorkoutForDate,
  isSameDay,
  isSunday,
  toISODateLocal,
} from './workoutSchedule'
import { useAppStore } from '../../state/useAppStore'
import {
  WORKOUT_PROGRAM_UPDATED,
  addTemplateExercise,
  getTemplateWithMeta,
  removeTemplateRow,
  updateTemplateSetsReps,
} from './workoutProgram'

async function ensureDexieRowFromWgerSuggestion(suggestion) {
  const wgerId = suggestion.data.id
  const existing = await db.exercises.where('wgerId').equals(wgerId).first()
  if (existing) {
    return existing
  }

  let detail = null
  try {
    detail = await getExerciseDetail(wgerId)
  } catch {
    // Stale search ids or network issues: persist minimal row from search payload
  }

  const name = detail
    ? pickExerciseNameFromDetail(detail, suggestion.data.name)
    : suggestion.data.name
  const category =
    detail?.category?.name != null ? String(detail.category.name) : String(suggestion.data.category ?? '')

  const now = Date.now()
  const dexieId = await db.exercises.add({
    wgerId,
    name,
    category,
    updatedAt: now,
  })

  return {
    id: dexieId,
    wgerId,
    name,
    category,
    updatedAt: now,
  }
}

function SchedulePage() {
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false)
  const [exerciseItems, setExerciseItems] = useState([])
  const [templateLoading, setTemplateLoading] = useState(false)
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchStatus, setSearchStatus] = useState('idle')
  const [searchError, setSearchError] = useState('')
  const [customExerciseName, setCustomExerciseName] = useState('')
  const [setsRepsDrafts, setSetsRepsDrafts] = useState({})

  const missedWorkoutDates = useAppStore((s) => s.missedWorkoutDates)
  const addMissedWorkoutDate = useAppStore((s) => s.addMissedWorkoutDate)
  const removeMissedWorkoutDate = useAppStore((s) => s.removeMissedWorkoutDate)
  const clearMissedWorkoutDates = useAppStore((s) => s.clearMissedWorkoutDates)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const planned = getWorkoutForDate(selectedDay, missedWorkoutDates)
  const isTodaySelected = isSameDay(selectedDay, today)
  const showWorkoutCheck = isTodaySelected && !isSunday(selectedDay)

  const handleYes = () => {
    removeMissedWorkoutDate(toISODateLocal(today))
  }

  const handleNo = () => {
    addMissedWorkoutDate(toISODateLocal(today))
  }

  const todayIsMissed = missedWorkoutDates.includes(toISODateLocal(today))
  const workoutTitle = planned.kind === 'missed' ? 'Missed' : planned.label
  const workoutType = planned.kind === 'workout' ? planned.id : null

  const reloadTemplate = useCallback(async () => {
    if (!workoutType) {
      setExerciseItems([])
      return
    }
    setTemplateLoading(true)
    try {
      const items = await getTemplateWithMeta(workoutType)
      setExerciseItems(items)
    } finally {
      setTemplateLoading(false)
    }
  }, [workoutType])

  useEffect(() => {
    reloadTemplate()
  }, [reloadTemplate])

  useEffect(() => {
    const onUpdate = () => {
      reloadTemplate()
    }
    window.addEventListener(WORKOUT_PROGRAM_UPDATED, onUpdate)
    return () => window.removeEventListener(WORKOUT_PROGRAM_UPDATED, onUpdate)
  }, [reloadTemplate])

  useEffect(() => {
    const t = setTimeout(() => {
      const next = exerciseSearchQuery
      setDebouncedSearch(next)
      if (next.trim().length < 2) {
        setSearchResults([])
        setSearchStatus('idle')
        setSearchError('')
      }
    }, 300)
    return () => clearTimeout(t)
  }, [exerciseSearchQuery])

  useEffect(() => {
    if (!isEditPanelOpen) {
      return
    }

    const q = debouncedSearch.trim()
    if (q.length < 2) {
      return
    }

    let cancelled = false

    async function run() {
      setSearchStatus('loading')
      setSearchError('')
      try {
        const qLower = q.toLowerCase()
        const localRows = await db.exercises.toArray()
        const localMatches = localRows.filter((row) => row.name.toLowerCase().includes(qLower))

        const suggestions = await searchExercises(q)
        if (cancelled) return

        const seen = new Set()
        const merged = []

        for (const row of localMatches) {
          if (row.wgerId != null) seen.add(row.wgerId)
          merged.push({ kind: 'local', wgerId: row.wgerId, name: row.name, dexieRow: row })
        }

        for (const s of suggestions) {
          const wgerId = s.data?.id
          if (wgerId == null || seen.has(wgerId)) continue
          seen.add(wgerId)
          merged.push({ kind: 'wger', wgerId, suggestion: s })
        }

        setSearchResults(merged)
        setSearchStatus('success')
      } catch (error) {
        if (cancelled) return
        setSearchStatus('error')
        setSearchError(error instanceof Error ? error.message : 'Search failed')
        setSearchResults([])
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [debouncedSearch, isEditPanelOpen])

  useEffect(() => {
    if (!isEditPanelOpen) {
      return undefined
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isEditPanelOpen])

  const closeEditPanel = () => {
    setExerciseSearchQuery('')
    setDebouncedSearch('')
    setSearchResults([])
    setSearchStatus('idle')
    setSearchError('')
    setCustomExerciseName('')
    setSetsRepsDrafts({})
    setIsEditPanelOpen(false)
  }

  const parseSetsReps = (value) => {
    const match = String(value ?? '').trim().match(/^(\d+)\s*x\s*(\d+)$/i)
    if (!match) return { sets: '3', reps: '10' }
    return { sets: match[1], reps: match[2] }
  }

  const normalizeCount = (value, fallback) => {
    const n = Number.parseInt(String(value ?? '').trim(), 10)
    if (!Number.isFinite(n) || n <= 0) return String(fallback)
    return String(n)
  }

  useEffect(() => {
    if (!isEditPanelOpen) return
    setSetsRepsDrafts(
      Object.fromEntries(
        exerciseItems.map((exercise) => [exercise.templateId, parseSetsReps(exercise.setsReps)])
      )
    )
  }, [exerciseItems, isEditPanelOpen])

  const sessionHasExercise = (wgerId, dexieId) =>
    exerciseItems.some((item) => {
      if (dexieId != null && item.exerciseId === dexieId) return true
      if (wgerId != null && item.wgerId != null && item.wgerId === wgerId) return true
      return false
    })

  const addExerciseToSession = async (row) => {
    if (!workoutType) return
    try {
      await addTemplateExercise(workoutType, row.id)
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Could not add exercise')
    }
  }

  const handleAddCustomExercise = async () => {
    if (!workoutType) return
    const name = customExerciseName.trim()
    if (!name) {
      setSearchError('Enter a custom exercise name.')
      return
    }
    try {
      const existing = await db.exercises.where('name').equalsIgnoreCase(name).first()
      if (existing) {
        await addExerciseToSession(existing)
        setCustomExerciseName('')
        setSearchError('')
        return
      }
      const now = Date.now()
      const id = await db.exercises.add({
        wgerId: null,
        name,
        category: 'Custom',
        updatedAt: now,
      })
      await addExerciseToSession({
        id,
        wgerId: null,
        name,
        category: 'Custom',
        updatedAt: now,
      })
      setCustomExerciseName('')
      setSearchError('')
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Could not add custom exercise')
    }
  }

  const handlePickSearchResult = async (entry) => {
    try {
      if (entry.kind === 'local') {
        addExerciseToSession(entry.dexieRow)
        return
      }

      const existing = await db.exercises.where('wgerId').equals(entry.wgerId).first()
      if (existing) {
        addExerciseToSession(existing)
        return
      }

      const row = await ensureDexieRowFromWgerSuggestion(entry.suggestion)
      addExerciseToSession(row)
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Could not add exercise')
    }
  }

  const removeExercise = async (templateId) => {
    try {
      await removeTemplateRow(templateId)
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Could not remove exercise')
    }
  }

  return (
    <section className="flex flex-1 flex-col pt-4">
      <DaySelector value={selectedDay} onChange={setSelectedDay} missedWorkoutDates={missedWorkoutDates} />

      {showWorkoutCheck ? (
        <Motion.div
          className="mt-3 flex items-center justify-center gap-2"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <span className="text-[13px] font-medium text-zinc-500">Trained today?</span>
          <div className="inline-flex rounded-lg bg-white/[0.06] p-0.5">
            <Motion.button
              type="button"
              onClick={handleYes}
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 520, damping: 32 }}
              className={`min-h-[36px] rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors duration-150 ${
                !todayIsMissed
                  ? 'bg-zinc-600/80 text-[var(--color-primary)]'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Yes
            </Motion.button>
            <Motion.button
              type="button"
              onClick={handleNo}
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 520, damping: 32 }}
              className={`min-h-[36px] rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors duration-150 ${
                todayIsMissed
                  ? 'bg-zinc-600/80 text-[var(--color-primary)]'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              No
            </Motion.button>
          </div>
        </Motion.div>
      ) : null}

      <div className="mt-5 flex items-center justify-between gap-3">
        <Motion.h2
          key={workoutTitle}
          className="text-left text-lg font-semibold tracking-tight text-zinc-100"
          initial={{ opacity: 0.65 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {workoutTitle}
        </Motion.h2>
        <Motion.button
          type="button"
          disabled={!workoutType}
          onClick={() => workoutType && setIsEditPanelOpen(true)}
          aria-label="Edit exercises"
          whileTap={workoutType ? { scale: 0.9 } : undefined}
          whileHover={workoutType ? { scale: 1.04 } : undefined}
          transition={{ type: 'spring', stiffness: 480, damping: 28 }}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-300 ${
            workoutType
              ? 'bg-white/[0.08] hover:bg-white/[0.14]'
              : 'cursor-not-allowed bg-white/[0.04] opacity-40'
          }`}
        >
          <PencilSimple size={18} weight="bold" className="text-zinc-400" />
        </Motion.button>
      </div>

      {templateLoading && workoutType ? (
        <p className="mt-4 text-[14px] font-medium text-zinc-500">Loading exercises…</p>
      ) : null}

      {!workoutType ? (
        <p className="mt-4 text-[14px] font-medium text-zinc-500">
          Pick a training day to see that session&apos;s template. Rest and missed days have no exercise list here.
        </p>
      ) : null}

      {workoutType && !templateLoading && exerciseItems.length === 0 ? (
        <p className="mt-4 text-[14px] font-medium text-zinc-500">
          No exercises in this template yet. Open edit to add movements from the library.
        </p>
      ) : null}

      <LayoutGroup>
        <ul className="mt-4 space-y-2">
          {exerciseItems.map((exercise) => (
            <Motion.li
              key={exercise.templateId}
              layout
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="rounded-xl bg-zinc-900/80 px-3 py-2"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-semibold text-zinc-100">{exercise.name}</p>
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-medium text-zinc-400">PR {exercise.prDisplay}</p>
                </div>
              </div>
              <p className="mt-1 text-[14px] font-medium text-zinc-500">{exercise.setsReps}</p>
            </Motion.li>
          ))}
        </ul>
      </LayoutGroup>

      <p className="mt-4 text-center">
        <Motion.button
          type="button"
          onClick={() => {
            if (window.confirm('Clear all missed days? Your schedule will go back to the default template.')) {
              clearMissedWorkoutDates()
            }
          }}
          whileTap={{ scale: 0.97 }}
          className="text-[13px] font-medium text-zinc-600 underline decoration-zinc-700 underline-offset-2 transition-colors duration-150 hover:text-zinc-400"
        >
          Reset schedule shifts
        </Motion.button>
      </p>

      {createPortal(
        <AnimatePresence>
          {isEditPanelOpen ? (
            <Motion.div
              key="exercise-edit-overlay"
              className="fixed inset-0 z-50 flex flex-col justify-end"
              role="dialog"
              aria-modal="true"
              aria-labelledby="exercise-edit-panel-title"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <Motion.button
                type="button"
                className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-[2px]"
                aria-label="Close edit panel"
                onClick={closeEditPanel}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
              <Motion.div
                className="relative z-10 flex h-full w-full flex-col bg-zinc-950"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
              >
                <div className="flex shrink-0 items-center justify-between gap-3 bg-white/[0.03] px-4 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)]">
                  <h2 id="exercise-edit-panel-title" className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                    <Barbell size={18} weight="duotone" className="text-[var(--color-primary)]" />
                    Edit exercises
                  </h2>
                  <Motion.button
                    type="button"
                    onClick={closeEditPanel}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    className="inline-flex min-h-[40px] items-center gap-1 rounded-lg bg-white/10 px-3 py-2 text-[13px] font-semibold text-zinc-200 transition-colors duration-150 hover:bg-white/15"
                  >
                    <Check size={14} weight="bold" className="text-[var(--color-primary)]" />
                    Done
                  </Motion.button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-3">
                  <p className="text-[13px] font-medium text-zinc-500">Search (WGER)</p>
                  <div className="mt-2 space-y-2">
                    <div className="relative">
                      <MagnifyingGlass
                        size={16}
                        weight="bold"
                        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"
                        aria-hidden
                      />
                      <input
                        type="search"
                        value={exerciseSearchQuery}
                        onChange={(event) => setExerciseSearchQuery(event.target.value)}
                        placeholder="Type at least 2 characters…"
                        autoComplete="off"
                        className="w-full rounded-lg bg-zinc-900/90 py-2.5 pl-9 pr-3 text-base text-zinc-200 placeholder:text-zinc-600 focus:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/45"
                      />
                    </div>
                    {searchStatus === 'loading' ? (
                      <p className="text-[14px] text-zinc-500">Searching…</p>
                    ) : null}
                    {searchStatus === 'error' ? <p className="text-[14px] text-red-400">{searchError}</p> : null}
                    {searchStatus === 'success' ? (
                      <ul
                        className="max-h-40 space-y-1 overflow-y-auto rounded-lg bg-zinc-900/85 p-1"
                        aria-label="Exercise search results"
                      >
                        {searchResults.length === 0 ? (
                          <li className="px-2 py-2 text-center text-[13px] text-zinc-500">No matches</li>
                        ) : (
                          searchResults.map((entry) => {
                            const wgerId = entry.kind === 'local' ? entry.dexieRow.wgerId : entry.wgerId
                            const dexieId = entry.kind === 'local' ? entry.dexieRow.id : null
                            const already = sessionHasExercise(wgerId, dexieId)
                            const label = entry.kind === 'local' ? entry.name : entry.suggestion.data.name
                            return (
                              <li key={`${entry.kind}-${wgerId}`}>
                                <Motion.button
                                  type="button"
                                  disabled={already}
                                  onClick={() => handlePickSearchResult(entry)}
                                  whileTap={already ? undefined : { scale: 0.98 }}
                                  className={`flex min-h-[40px] w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[14px] font-medium transition-colors duration-150 ${
                                    already
                                      ? 'cursor-not-allowed text-zinc-600'
                                      : 'text-zinc-200 hover:bg-white/10'
                                  }`}
                                >
                                  <span className="min-w-0 truncate">
                                    {label}
                                    {entry.kind === 'local' ? (
                                      <span className="ml-1 text-[12px] font-normal text-zinc-600"> Saved </span>
                                    ) : null}
                                  </span>
                                  {already ? (
                                    <Check size={14} weight="bold" className="shrink-0 text-zinc-600" />
                                  ) : (
                                    <Plus size={14} weight="bold" className="shrink-0 text-[var(--color-primary)]" />
                                  )}
                                </Motion.button>
                              </li>
                            )
                          })
                        )}
                      </ul>
                    ) : null}
                    {searchStatus === 'idle' &&
                    exerciseSearchQuery.trim().length > 0 &&
                    exerciseSearchQuery.trim().length < 2 ? (
                      <p className="text-[13px] text-zinc-600">Enter at least 2 characters to search.</p>
                    ) : null}
                  </div>

                  <p className="mt-4 text-[13px] font-medium text-zinc-500">Add custom exercise</p>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={customExerciseName}
                      onChange={(event) => setCustomExerciseName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          handleAddCustomExercise()
                        }
                      }}
                      placeholder="e.g. Ring Push-Up"
                      className="min-h-[44px] min-w-0 flex-1 rounded-lg bg-zinc-900/90 px-3 py-2 text-base text-zinc-200 placeholder:text-zinc-600 focus:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/45"
                    />
                    <Motion.button
                      type="button"
                      onClick={handleAddCustomExercise}
                      whileTap={{ scale: 0.96 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-lg bg-white/10 px-3.5 py-2 text-[14px] font-semibold text-zinc-200 transition-colors duration-150 hover:bg-white/15"
                    >
                      <Plus size={14} weight="bold" className="text-[var(--color-primary)]" />
                      Add
                    </Motion.button>
                  </div>

                  <p className="mt-5 text-[13px] font-medium text-zinc-500">Current session</p>
                  <ul className="mt-2 space-y-2">
                    {exerciseItems.map((exercise) => (
                      <Motion.li
                        key={exercise.templateId}
                        layout
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl bg-zinc-900/80 px-3 py-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="min-w-0 truncate text-sm font-semibold text-zinc-100">{exercise.name}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-[13px] font-medium text-zinc-400">PR {exercise.prDisplay}</p>
                            <Motion.button
                              type="button"
                              onClick={() => removeExercise(exercise.templateId)}
                              whileTap={{ scale: 0.9 }}
                              className="rounded-md p-1 text-zinc-500 transition-colors duration-150 hover:bg-red-500/15 hover:text-red-300"
                              aria-label={`Remove ${exercise.name}`}
                            >
                              <X size={16} weight="bold" />
                            </Motion.button>
                          </div>
                        </div>
                        <label className="mt-2 block">
                          <span className="sr-only">Sets and reps</span>
                          <div className="grid grid-cols-2 gap-2">
                            <label className="block">
                              <span className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-zinc-500">
                                Sets
                              </span>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={
                                  setsRepsDrafts[exercise.templateId]?.sets ??
                                  parseSetsReps(exercise.setsReps).sets
                                }
                                onChange={(event) => {
                                  const next = event.target.value
                                  setSetsRepsDrafts((prev) => ({
                                    ...prev,
                                    [exercise.templateId]: {
                                      ...(prev[exercise.templateId] ?? parseSetsReps(exercise.setsReps)),
                                      sets: next,
                                    },
                                  }))
                                }}
                                onBlur={() => {
                                  const draft = setsRepsDrafts[exercise.templateId] ?? parseSetsReps(exercise.setsReps)
                                  const sets = normalizeCount(draft.sets, 3)
                                  const reps = normalizeCount(draft.reps, 10)
                                  const normalized = `${sets} x ${reps}`
                                  setSetsRepsDrafts((prev) => ({
                                    ...prev,
                                    [exercise.templateId]: { sets, reps },
                                  }))
                                  if (normalized !== exercise.setsReps) {
                                    updateTemplateSetsReps(exercise.templateId, normalized)
                                  }
                                }}
                                className="w-full rounded-lg bg-zinc-950/80 px-2.5 py-2 text-base font-medium text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/45"
                                placeholder="3"
                              />
                            </label>
                            <label className="block">
                              <span className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-zinc-500">
                                Reps
                              </span>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={
                                  setsRepsDrafts[exercise.templateId]?.reps ??
                                  parseSetsReps(exercise.setsReps).reps
                                }
                                onChange={(event) => {
                                  const next = event.target.value
                                  setSetsRepsDrafts((prev) => ({
                                    ...prev,
                                    [exercise.templateId]: {
                                      ...(prev[exercise.templateId] ?? parseSetsReps(exercise.setsReps)),
                                      reps: next,
                                    },
                                  }))
                                }}
                                onBlur={() => {
                                  const draft = setsRepsDrafts[exercise.templateId] ?? parseSetsReps(exercise.setsReps)
                                  const sets = normalizeCount(draft.sets, 3)
                                  const reps = normalizeCount(draft.reps, 10)
                                  const normalized = `${sets} x ${reps}`
                                  setSetsRepsDrafts((prev) => ({
                                    ...prev,
                                    [exercise.templateId]: { sets, reps },
                                  }))
                                  if (normalized !== exercise.setsReps) {
                                    updateTemplateSetsReps(exercise.templateId, normalized)
                                  }
                                }}
                                className="w-full rounded-lg bg-zinc-950/80 px-2.5 py-2 text-base font-medium text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/45"
                                placeholder="10"
                              />
                            </label>
                          </div>
                        </label>
                      </Motion.li>
                    ))}
                  </ul>
                </div>
              </Motion.div>
            </Motion.div>
          ) : null}
        </AnimatePresence>,
        document.body
      )}
    </section>
  )
}

export default SchedulePage
