import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Link } from 'react-router-dom'
import { StatTile } from './StatTile'
import styles from './ImpactStats.module.css'

const MotionLink = motion.create(Link)

const STATS = [
  { value: 12, suffix: '+', label: 'Years of manufacturing experience' },
  { value: 80, suffix: '+', label: 'Artisans in our Kathmandu atelier' },
  { value: 250000, suffix: '+', label: 'Units produced per year' },
  { value: 30, suffix: '+', label: 'UK brands currently in production' },
  { value: 90, suffix: '%', label: 'Supply chain GOTS / OEKO-TEX certified' },
]

const CERTIFICATIONS = ['GOTS', 'OEKO-TEX', 'WRAP']

export function ImpactStats() {
  const sectionRef = useRef(null)
  const inView = useInView(sectionRef, { once: true, margin: '-80px' })

  return (
    <section id="impact" className={styles.section} ref={sectionRef}>
      <div className={styles.inner}>
        <div className={styles.grid}>
          {STATS.map((stat, index) => (
            <StatTile key={stat.label} {...stat} inView={inView} index={index} />
          ))}
        </div>

        <div className={styles.certRow} aria-label="Certifications">
          {CERTIFICATIONS.map((cert) => (
            <span key={cert} className={styles.certMark}>
              {cert}
            </span>
          ))}
        </div>

        <MotionLink
          to="/quote"
          className={styles.ctaLink}
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          Get a Quote →
        </MotionLink>
      </div>
    </section>
  )
}
