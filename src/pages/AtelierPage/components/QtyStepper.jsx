import { useEffect, useState } from 'react'
import { Minus, Plus } from 'lucide-react'

/**
 * Minus/plus buttons for quick nudges, plus a free-typing field for an exact number — commits
 * on blur/Enter rather than on every keystroke, so clearing the field to type a fresh value
 * doesn't fight a live clamp (a controlled number input that reclamps on every keystroke can't
 * ever go empty, which makes typing "250" over an existing "10" nearly impossible).
 */
export default function QtyStepper({ value, onChange, min = 10, max = 5000, step = 10, className = '', disabled = false }) {
  const [draft, setDraft] = useState(String(value))

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  function clamp(n) {
    return Math.min(max, Math.max(min, n))
  }

  function commit() {
    const n = parseInt(draft, 10)
    const next = Number.isFinite(n) ? clamp(n) : value
    setDraft(String(next))
    if (next !== value) onChange(next)
  }

  return (
    <div className={`flex items-center gap-1.5 ${disabled ? 'opacity-50' : ''} ${className}`}>
      <button type="button" disabled={disabled} onClick={() => onChange(clamp(value - step))} aria-label="Decrease quantity"
        className="w-5 h-5 border border-pine/15 flex items-center justify-center hover:border-pine transition-colors shrink-0 disabled:pointer-events-none">
        <Minus size={9} strokeWidth={1.5} />
      </button>
      <input
        type="text" inputMode="numeric" aria-label="Quantity"
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ''))}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); e.target.blur() } }}
        className="w-12 text-center font-body text-[11px] text-pine tabular-nums border border-pine/15 focus:outline-none focus:border-pine bg-bone py-0.5 disabled:pointer-events-none"
      />
      <button type="button" disabled={disabled} onClick={() => onChange(clamp(value + step))} aria-label="Increase quantity"
        className="w-5 h-5 border border-pine/15 flex items-center justify-center hover:border-pine transition-colors shrink-0 disabled:pointer-events-none">
        <Plus size={9} strokeWidth={1.5} />
      </button>
    </div>
  )
}
