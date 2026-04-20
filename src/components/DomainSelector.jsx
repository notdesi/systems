import { useEffect, useRef, useState } from 'react'
import { animate, motion as Motion } from 'framer-motion'
import { Barbell, CaretDown, CheckCircle } from '@phosphor-icons/react'

const DOMAIN_OPTIONS = [{ id: 'fitness', label: 'Fitness', icon: Barbell }]

function DomainSelector({ selectedDomain, onSelect }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handleOutsideClick)
    return () => document.removeEventListener('pointerdown', handleOutsideClick)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const controls = animate(
      '#domain-menu',
      { opacity: [0, 1], y: [-6, 0], scale: [0.98, 1] },
      { duration: 0.16, ease: 'easeOut' }
    )

    return () => controls.stop()
  }, [isOpen])

  const selectedOption =
    DOMAIN_OPTIONS.find((option) => option.id === selectedDomain) ?? DOMAIN_OPTIONS[0]

  return (
    <div ref={containerRef} className="relative">
      <Motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 520, damping: 34 }}
        className="flex items-center gap-1.5 rounded-full bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-zinc-100 backdrop-blur transition-colors duration-150 hover:bg-white/[0.12]"
        onClick={() => setIsOpen((open) => !open)}
      >
        <selectedOption.icon size={14} weight="duotone" className="text-[var(--color-primary)]" />
        <span>{selectedOption.label}</span>
        <CaretDown
          size={12}
          weight="bold"
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </Motion.button>

      {isOpen && (
        <div
          id="domain-menu"
          className="absolute left-0 z-20 mt-2 w-52 overflow-hidden rounded-2xl bg-zinc-900/95 p-2 shadow-2xl"
          style={{ opacity: 0 }}
        >
            {DOMAIN_OPTIONS.map((option) => {
              const Icon = option.icon
              const isActive = option.id === selectedDomain

              return (
                <button
                  key={option.id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-zinc-100 transition-colors hover:bg-white/8"
                  onClick={() => {
                    onSelect(option.id)
                    setIsOpen(false)
                  }}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon size={16} weight="duotone" className="text-zinc-300" />
                    {option.label}
                  </span>
                  {isActive ? <CheckCircle size={16} weight="fill" className="text-[var(--color-primary)]" /> : null}
                </button>
              )
            })}
        </div>
      )}
    </div>
  )
}

export default DomainSelector
