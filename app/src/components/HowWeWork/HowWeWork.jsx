'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import styles from './HowWeWork.module.css'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

const viewport = { once: true, margin: '-80px' }

const STEPS = [
  {
    label: 'Design Intake',
    description: 'You send tech packs or sketches, we scope fabric, trims and timeline.',
    image: 'process-design-intake.jpg',
  },
  {
    label: 'Sampling',
    description: 'Physical samples cut and sent for your approval before bulk starts.',
    image: 'process-sampling.jpg',
  },
  {
    label: 'Bulk Production',
    description: 'Full run cut, sewn and finished inside our Kathmandu atelier.',
    image: 'process-bulk-production.jpg',
  },
  {
    label: 'Quality Control',
    description: 'Every unit checked against spec before it leaves the floor.',
    image: 'process-quality-control.jpg',
  },
  {
    label: 'Shipping to the UK',
    description: 'Freight or air, tracked door to door, landed and ready to sell.',
    image: 'process-shipping.jpg',
  },
]

export function HowWeWork() {
  return (
    <section id="how-we-work" className={styles.howWeWork}>
      <div className={styles.inner}>
        <motion.div
          className={styles.header}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={fadeUp}
        >
          <span className={styles.eyebrow}>How We Work</span>
          <h2 className={styles.heading}>
            One atelier, five steps, zero surprises.
          </h2>
        </motion.div>

        <motion.ol
          className={styles.steps}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          {STEPS.map((step, index) => (
            <motion.li key={step.label} className={styles.step} variants={fadeUp}>
              <img
                className={styles.image}
                src={`/landing%20page%20images/${step.image}`}
                alt={step.label}
                loading="lazy"
              />
              <span className={styles.stepNumber}>{String(index + 1).padStart(2, '0')}</span>
              <h3 className={styles.stepLabel}>{step.label}</h3>
              <p className={styles.stepDescription}>{step.description}</p>
            </motion.li>
          ))}
        </motion.ol>

        <motion.div
          className={styles.ctaBlock}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={fadeUp}
        >
          <Link href="/quote" className={styles.cta}>
            Get a Quote
          </Link>
          <span className={styles.microcopy}>
            No obligation. We reply within 24 hours.
          </span>
        </motion.div>
      </div>
    </section>
  )
}
