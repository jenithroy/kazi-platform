'use client'

import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import styles from './Hero.module.css'

const MotionLink = motion.create(Link)

const container = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

export const Hero = forwardRef(function Hero(_props, ref) {
  return (
    <section id="top" className={styles.hero} ref={ref}>
      <motion.div
        className={styles.content}
        variants={container}
        initial="hidden"
        animate="visible"
      >
        <motion.h1 className={styles.headline} variants={item}>
          Built for Your Brand.
          <br />
          Crafted in <em>Nepal</em>.
        </motion.h1>
        <MotionLink href="/quote" className={styles.cta} variants={item}>
          Get a Quote
        </MotionLink>
      </motion.div>
    </section>
  )
})
