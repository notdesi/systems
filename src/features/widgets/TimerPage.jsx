import { useEffect, useMemo, useRef, useState } from 'react'
import { motion as Motion } from 'framer-motion'
import { ArrowLeft } from '@phosphor-icons/react'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function breakdown(totalSeconds) {
  const safe = Math.max(0, totalSeconds)
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  return { hours, minutes, seconds }
}

function UnitPicker({ label, value, onChange, min, max, disabled }) {
  const ITEM_HEIGHT = 44
  const VISIBLE_ROWS = 3
  const scrollRef = useRef(null)
  const snapTimeoutRef = useRef(null)
  const rafRef = useRef(null)
  const values = useMemo(() => {
    const result = []
    for (let current = min; current <= max; current += 1) {
      result.push(current)
    }
    return result
  }, [min, max])

  const viewportHeight = ITEM_HEIGHT * VISIBLE_ROWS

  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller) return
    const targetTop = (value - min) * ITEM_HEIGHT
    if (Math.abs(scroller.scrollTop - targetTop) < 1) return
    scroller.scrollTo({ top: targetTop, behavior: 'auto' })
  }, [ITEM_HEIGHT, min, value])

  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller) return
    scroller.scrollTop = (value - min) * ITEM_HEIGHT
  }, [ITEM_HEIGHT, min])

  const snapToClosest = () => {
    const scroller = scrollRef.current
    if (!scroller) return
    const nearestIndex = clamp(Math.round(scroller.scrollTop / ITEM_HEIGHT), 0, values.length - 1)
    const nearestValue = values[nearestIndex]
    scroller.scrollTo({ top: nearestIndex * ITEM_HEIGHT, behavior: 'auto' })
    if (nearestValue !== value) {
      onChange(nearestValue)
    }
  }

  const handleScroll = () => {
    if (disabled) return
    if (!rafRef.current) {
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null
        const scroller = scrollRef.current
        if (!scroller) return
        const liveIndex = clamp(Math.round(scroller.scrollTop / ITEM_HEIGHT), 0, values.length - 1)
        const liveValue = values[liveIndex]
        if (liveValue !== value) {
          onChange(liveValue)
        }
      })
    }
    if (snapTimeoutRef.current) {
      window.clearTimeout(snapTimeoutRef.current)
    }
    snapTimeoutRef.current = window.setTimeout(() => {
      snapToClosest()
    }, 55)
  }

  const handleSelect = (option) => {
    const scroller = scrollRef.current
    if (scroller) {
      scroller.scrollTo({ top: (option - min) * ITEM_HEIGHT, behavior: 'smooth' })
    }
    onChange(option)
  }

  useEffect(() => {
    return () => {
      if (snapTimeoutRef.current) window.clearTimeout(snapTimeoutRef.current)
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div className="flex flex-1 flex-col items-center gap-2 rounded-2xl bg-white/[0.04] px-3 py-3 ring-1 ring-white/8">
      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <div
        className="relative w-full overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-white/10"
        style={{ height: `${viewportHeight}px` }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 z-10 rounded-xl bg-[var(--color-primary)]/12"
          style={{ top: `${ITEM_HEIGHT}px`, height: `${ITEM_HEIGHT}px` }}
        />
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className={`h-full overflow-y-auto snap-y snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
            disabled ? 'pointer-events-none opacity-70' : ''
          }`}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div style={{ height: `${ITEM_HEIGHT}px` }} />
          {values.map((option) => {
            const isSelected = option === value
            return (
              <button
                key={option}
                type="button"
                disabled={disabled}
                onClick={() => handleSelect(option)}
                className={`w-full text-center text-2xl font-semibold tabular-nums transition-colors ${
                  isSelected ? 'text-zinc-100' : 'text-zinc-500'
                } ${disabled ? 'cursor-not-allowed' : ''} snap-center`}
                style={{ height: `${ITEM_HEIGHT}px`, touchAction: 'pan-y' }}
              >
                {pad(option)}
              </button>
            )
          })}
          <div style={{ height: `${ITEM_HEIGHT}px` }} />
        </div>
      </div>
    </div>
  )
}

function TimerPage({ onBack }) {
  const [hours, setHours] = useState(0)
  const [minutes, setMinutes] = useState(10)
  const [seconds, setSeconds] = useState(0)
  const [remainingSeconds, setRemainingSeconds] = useState(null)
  const [isRunning, setIsRunning] = useState(false)

  const selectedTotal = useMemo(() => hours * 3600 + minutes * 60 + seconds, [hours, minutes, seconds])
  const activeTotal = remainingSeconds ?? selectedTotal
  const display = breakdown(activeTotal)
  const initialDuration = Math.max(selectedTotal, 1)
  const progress = remainingSeconds === null ? 1 : clamp(remainingSeconds / initialDuration, 0, 1)

  useEffect(() => {
    if (!isRunning) return undefined
    const interval = window.setInterval(() => {
      setRemainingSeconds((current) => {
        const next = Math.max((current ?? selectedTotal) - 1, 0)
        if (next === 0) {
          window.clearInterval(interval)
          setIsRunning(false)
        }
        return next
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [isRunning, selectedTotal])

  const handleStartPause = () => {
    if (!isRunning && remainingSeconds === null && selectedTotal === 0) return
    if (!isRunning && remainingSeconds === null) {
      setRemainingSeconds(selectedTotal)
    }
    setIsRunning((current) => !current)
  }

  const handleReset = () => {
    setIsRunning(false)
    setRemainingSeconds(null)
  }

  return (
    <section className="flex flex-1 flex-col pt-3">
      <header className="flex items-center gap-3">
        <Motion.button
          type="button"
          onClick={onBack}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-full bg-zinc-900 ring-1 ring-white/10"
          aria-label="Back to widgets"
        >
          <ArrowLeft size={18} weight="bold" className="text-zinc-100" />
        </Motion.button>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Timer</h1>
      </header>

      <div className="mt-5 rounded-3xl bg-white/[0.04] px-4 py-5 ring-1 ring-white/8">
        <div className="flex items-end justify-center gap-1 text-zinc-100">
          <span className="text-5xl font-semibold tabular-nums">{pad(display.hours)}</span>
          <span className="pb-1 text-lg font-medium text-zinc-400">:</span>
          <span className="text-5xl font-semibold tabular-nums">{pad(display.minutes)}</span>
          <span className="pb-1 text-lg font-medium text-zinc-400">:</span>
          <span className="text-5xl font-semibold tabular-nums">{pad(display.seconds)}</span>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
          <Motion.div
            className="h-full rounded-full bg-[var(--color-primary)]"
            animate={{ width: `${Math.round(progress * 100)}%` }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          />
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <UnitPicker label="Hours" value={hours} onChange={setHours} min={0} max={23} disabled={isRunning} />
        <UnitPicker
          label="Minutes"
          value={minutes}
          onChange={setMinutes}
          min={0}
          max={59}
          disabled={isRunning}
        />
        <UnitPicker
          label="Seconds"
          value={seconds}
          onChange={setSeconds}
          min={0}
          max={59}
          disabled={isRunning}
        />
      </div>

      <div className="mt-auto mb-2 grid grid-cols-2 gap-3">
        <Motion.button
          type="button"
          onClick={handleReset}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className="min-h-[52px] rounded-2xl bg-zinc-900 text-sm font-semibold text-zinc-200 ring-1 ring-white/10"
        >
          Reset
        </Motion.button>
        <Motion.button
          type="button"
          onClick={handleStartPause}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          disabled={!isRunning && remainingSeconds === null && selectedTotal === 0}
          className={`min-h-[52px] rounded-2xl text-sm font-semibold ring-1 transition-colors ${
            !isRunning && remainingSeconds === null && selectedTotal === 0
              ? 'cursor-not-allowed bg-zinc-900 text-zinc-500 ring-white/10'
              : 'bg-[var(--color-primary)] text-zinc-950 ring-[var(--color-primary)]/40'
          }`}
        >
          {isRunning ? 'Pause' : 'Start'}
        </Motion.button>
      </div>
    </section>
  )
}

export default TimerPage
