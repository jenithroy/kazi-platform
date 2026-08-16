'use client'

import { motion } from 'framer-motion'
import { Leaf, Globe, Stack, Certificate } from '@phosphor-icons/react'
import styles from './TrustBar.module.css'

const POINTS = [
  { label: 'Low MOQs from 50 units', Icon: Stack },
  { label: 'Sustainable sourcing', Icon: Leaf },
  { label: 'GOTS & OEKO-TEX certified', Icon: Certificate },
  { label: 'Worldwide shipping', Icon: Globe },
]

export function TrustBar() {
  return (
    <section id="trust" className={styles.bar} aria-label="Why brands choose Kazi">
      <motion.ul
        className={styles.inner}
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {POINTS.map(({ label, Icon }) => (
          <li key={label} className={styles.point}>
            <Icon size={17} weight="light" aria-hidden="true" className={styles.icon} />
            {label}
          </li>
        ))}
      </motion.ul>
    </section>
  )
}
