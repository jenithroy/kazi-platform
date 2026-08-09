'use client'

import { motion } from 'framer-motion'
import styles from './Testimonials.module.css'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

const viewport = { once: true, margin: '-80px' }

// Placeholder copy — replace with real UK brand-founder quotes before launch.
const TESTIMONIALS = [
  {
    quote:
      'Kazi caught pattern issues our old factory never flagged, and fixed them before bulk, not after.',
    name: '[Founder Name]',
    role: '[Founder / Role]',
    brand: '[Brand Name]',
  },
  {
    quote:
      'We know exactly where our garments are made and by whom. That transparency was worth the switch alone.',
    name: '[Founder Name]',
    role: '[Founder / Role]',
    brand: '[Brand Name]',
  },
  {
    quote:
      'Sampling turnaround let us hit a launch date we’d already told retailers about.',
    name: '[Founder Name]',
    role: '[Founder / Role]',
    brand: '[Brand Name]',
  },
]

export function Testimonials() {
  return (
    <section id="testimonials" className={styles.testimonials}>
      <div className={styles.inner}>
        <motion.div
          className={styles.header}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={fadeUp}
        >
          <span className={styles.eyebrow}>What Brands Say</span>
          <h2 className={styles.heading}>Trusted by UK brands in production now.</h2>
          <span className={styles.placeholderNotice}>
            Placeholder quotes — swap in real client testimonials before launch.
          </span>
        </motion.div>

        <motion.div
          className={styles.grid}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          {TESTIMONIALS.map((testimonial, index) => (
            <motion.figure key={index} className={styles.card} variants={fadeUp}>
              <span className={styles.mark} aria-hidden="true">
                &ldquo;
              </span>
              <blockquote className={styles.quote}>{testimonial.quote}</blockquote>
              <figcaption className={styles.attribution}>
                <span className={styles.name}>{testimonial.name}</span>
                <span className={styles.role}>
                  {testimonial.role}, {testimonial.brand}
                </span>
              </figcaption>
            </motion.figure>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
