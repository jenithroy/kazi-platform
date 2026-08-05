import { useEffect, useState } from 'react'

/**
 * True once the given section has scrolled past the fixed nav height.
 * Uses IntersectionObserver rather than a scroll listener so it stays
 * passive/cheap on long pages.
 */
export function useHeroScrolled(sectionRef, navHeight = 72) {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const node = sectionRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsScrolled(!entry.isIntersecting && entry.boundingClientRect.top < 0)
      },
      { rootMargin: `-${navHeight}px 0px 0px 0px`, threshold: 0 },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [sectionRef, navHeight])

  return isScrolled
}
