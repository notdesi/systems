import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { sortMissedDates } from '../features/schedule/workoutSchedule'

export const useAppStore = create(
  persist(
    (set) => ({
      selectedDomain: 'fitness',
      selectedNavTab: 'today',
      activeSessionId: null,
      /** ISO local YYYY-MM-DD for days you tapped “No” (did not train). Drives schedule shift. */
      missedWorkoutDates: [],
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
      setTimerState: (timerState) =>
        set((state) => ({
          timer: { ...state.timer, ...timerState },
        })),
      setStreakState: (streakState) =>
        set((state) => ({
          streak: { ...state.streak, ...streakState },
        })),
    }),
    {
      name: 'systemsapp-storage',
      partialize: (state) => ({
        missedWorkoutDates: state.missedWorkoutDates,
      }),
    }
  )
)
