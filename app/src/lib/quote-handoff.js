// Bridges the Atelier configurator to the homepage's quote form across a client-side
// navigation. The configurator's designs live in component state (blob URLs valid for the
// tab's lifetime, not something a URL query string can carry) — sessionStorage carries a
// lightweight, already-resolved summary instead (labels, not raw ids), which QuoteForm reads
// to prefill its project-details field.

const STORAGE_KEY = 'kazi-atelier-quote-designs'

export function saveQuoteDesigns(designs) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(designs))
  } catch {
    // sessionStorage unavailable (private browsing, quota, etc.) — the quote form just
    // falls back to its normal, empty state.
  }
}

export function readQuoteDesigns() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null
  } catch {
    return null
  }
}

export function clearQuoteDesigns() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

/** Turns a list of saved Atelier designs into readable prose for the quote form's message field. */
export function describeQuoteDesigns(designs) {
  return designs
    .map((d) => {
      const bits = [d.garmentLabel, d.fabricLabel, d.colourLabel]
      if (d.hasPattern) bits.push('custom pattern')
      if (d.layerCount > 0) bits.push(`${d.layerCount} artwork element${d.layerCount > 1 ? 's' : ''}`)
      return `- ${bits.join(', ')} — qty ${d.qty}`
    })
    .join('\n')
}
