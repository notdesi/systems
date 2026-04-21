import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_WEEKLY_PLAN, normalizeWeeklyPlan, sortMissedDates } from '../features/schedule/workoutSchedule'

export const useAppStore = create(
  persist(
    (set) => ({
      selectedDomain: 'fitness',
      selectedNavTab: 'today',
      activeSessionId: null,
      /** ISO local YYYY-MM-DD for days you tapped “No” (did not train). Drives schedule shift. */
      missedWorkoutDates: [],
      weeklyPlan: normalizeWeeklyPlan(DEFAULT_WEEKLY_PLAN),
      timer: {
        isRunning: false,
        startedAtPerf: null,
        elapsedMs: 0,
      },
      streak: {
        current: 0,
        longest: 0,
        lastCompletedDate: null,
      },
      profile: {
        name: '',
        heightCm: '',
        weightKg: '',
        gender: '',
        photoDataUrl: '',
        quickTimerSeconds: 150,
      },
      setSelectedDomain: (domain) => set({ selectedDomain: domain }),
      setSelectedNavTab: (tab) => set({ selectedNavTab: tab }),
      setActiveSessionId: (sessionId) => set({ activeSessionId: sessionId }),
      addMissedWorkoutDate: (isoDate) =>
        set((state) => ({
          missedWorkoutDates: sortMissedDates([...state.missedWorkoutDates, isoDate]),
        })),
      removeMissedWorkoutDate: (isoDate) =>
        set((state) => ({
          missedWorkoutDates: state.missedWorkoutDates.filter((d) => d !== isoDate),
        })),
      clearMissedWorkoutDates: () => set({ missedWorkoutDates: [] }),
      setWeeklyPlanDayOptions: (weekday, options) =>
        set((state) => ({
          weeklyPlan: {
            ...state.weeklyPlan,
            [weekday]: normalizeWeeklyPlan({ ...state.weeklyPlan, [weekday]: options })[weekday],
          },
        })),
      setTimerState: (timerState) =>
        set((state) => ({
          timer: { ...state.timer, ...timerState },
        })),
      setStreakState: (streakState) =>
        set((state) => ({
          streak: { ...state.streak, ...streakState },
        })),
      setProfileState: (profileState) =>
        set((state) => ({
          profile: { ...state.profile, ...profileState },
        })),
    }),
    {
      name: 'systemsapp-storage',
      partialize: (state) => ({
        missedWorkoutDates: state.missedWorkoutDates,
        weeklyPlan: state.weeklyPlan,
        streak: state.streak,
        profile: state.profile,
      }),
    }
  )
)
