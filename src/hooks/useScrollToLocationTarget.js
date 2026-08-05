import { useEffect } from 'react'

/**
 * Scrolls to an in-page section after a cross-route navigation lands here — for links that
 * navigate to `/` with `state: { scrollTo: <id> }` rather than an `<a href="#id">` click
 * (SmoothScroll only intercepts the latter). Runs once per navigation, then clears the state
 * so a later reload/back-nav doesn't re-fire.
 */
export function useScrollToLocationTarget(location) {
  useEffect(() => {
    const targetId = location.state?.scrollTo
    if (!targetId) return

    const target = document.getElementById(targetId)
    if (target) {
      // Let the page finish its initial layout before measuring scroll position.
      requestAnimationFrame(() => target.scrollIntoView({ behavior: 'smooth' }))
    }

    window.history.replaceState({}, '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])
}
