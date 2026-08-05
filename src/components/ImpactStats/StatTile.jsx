import { useEffect, useRef, useState } from 'react'
import { animate, motion } from 'framer-motion'
import styles from './ImpactStats.module.css'

function formatNumber(value) {
  return Math.round(value).toLocaleString('en-GB')
}

export function StatTile({ value, suffix, label, inView, index }) {
  const [display, setDisplay] = useState(0)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (!inView || hasAnimated.current) return
    hasAnimated.current = true

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value)
      return
    }

    const controls = animate(0, value, {
      duration: 1.4,
      delay: index * 0.1,
      ease: 'easeOut',
      onUpdate: setDisplay,
    })

    return () => controls.stop()
  }, [inView, value, index])

  return (
    <motion.div
      className={styles.tile}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.08 }}
    >
      <div className={styles.number}>
        {formatNumber(display)}
        {suffix}
      </div>
      <p className={styles.label}>{label}</p>
    </motion.div>
  )
}
