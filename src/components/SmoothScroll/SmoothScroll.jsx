import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { ReactLenis } from 'lenis/react'

const LENIS_OPTIONS = {
  lerp: 0.1,
  duration: 1.2,
  smoothWheel: true,
}

export function SmoothScroll({ children }) {
  const lenisRef = useRef(null)
  const location = useLocation()
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Cross-route navigation (e.g. Nav's "Our Heritage" link) should land at the top of the
  // new page, not wherever the previous page happened to be scrolled to. Skipped when a
  // `scrollTo` target is carried in location.state — useScrollToLocationTarget owns that case.
  useEffect(() => {
    if (location.state?.scrollTo) return
    lenisRef.current?.lenis?.scrollTo(0, { immediate: true })
    window.scrollTo(0, 0)
  }, [location.pathname, location.state])

  useEffect(() => {
    if (prefersReducedMotion) return

    // Lenis's own `anchors` option doesn't call preventDefault, so the
    // browser's instant native jump fires first and Lenis's animation
    // visibly corrects it a frame later. Handling the click ourselves
    // avoids that double-motion.
    const handleClick = (event) => {
      const anchor = event.target.closest('a[href^="#"]')
      if (!anchor) return

      const hash = anchor.getAttribute('href')
      if (!hash || hash.length < 2) return

      const target = document.querySelector(hash)
      if (!target) return

      event.preventDefault()
      lenisRef.current?.lenis?.scrollTo(target)
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [prefersReducedMotion])

  if (prefersReducedMotion) {
    return children
  }

  return (
    <ReactLenis root ref={lenisRef} options={LENIS_OPTIONS}>
      {children}
    </ReactLenis>
  )
}
