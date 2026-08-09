'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import styles from './Atelier.module.css'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

const viewport = { once: true, margin: '-80px' }

export function Atelier() {
  return (
    <section id="atelier" className={styles.atelier}>
      <img
        className={styles.image}
        src="/landing%20page%20images/atelier.jpg"
        alt="Designer and pattern-cutter working together at a lit worktable in the Kazi atelier in Kathmandu"
        loading="lazy"
      />
      <div className={styles.scrim} />

      <motion.div
        className={styles.content}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
        variants={fadeUp}
      >
        <h2 className={styles.heading}>Design something only yours.</h2>
        <Link href="/atelier" className={styles.cta}>
          Enter the Atelier
        </Link>
      </motion.div>
    </section>
  )
}
