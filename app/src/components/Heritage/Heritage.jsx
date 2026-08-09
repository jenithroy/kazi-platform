'use client'

import { motion } from 'framer-motion'
import styles from './Heritage.module.css'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

const viewport = { once: true, margin: '-80px' }

export function Heritage() {
  return (
    <section id="heritage" className={styles.heritage}>
      <div className={styles.inner}>
        <motion.div
          className={styles.split}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          <motion.div className={styles.imageCol} variants={fadeUp}>
            <img
              className={styles.image}
              src="/landing%20page%20images/heritage.jpg"
              alt="Artisan tailor standing in a golden terraced field near Kathmandu, with a pagoda roof and the Himalayan foothills behind her"
              loading="lazy"
            />
          </motion.div>

          <motion.div className={styles.textCol} variants={fadeUp}>
            <span className={styles.eyebrow}>Our Heritage</span>
            <h2 className={styles.heading}>
              Crafted by hands that have done this for decades.
            </h2>
            <p className={styles.paragraph}>
              Kazi began with a handful of tailors in Kathmandu who&rsquo;d spent
              their whole working lives perfecting a handful of techniques —
              pattern-cutting, hand-finishing, embroidery passed down rather than
              taught in a classroom. That same expertise runs our atelier today,
              just at a scale that can supply a growing UK brand instead of a
              single market stall.
            </p>
            <p className={styles.leadIn}>
              Our supply chain is GOTS-certified end to end, every dye lot
              OEKO-TEX tested, and everything happens inside a single Kathmandu
              atelier we can walk you through, virtually or in person. No
              subcontracted factories, no black-box sourcing — you always know
              exactly who made your garments and how.
            </p>
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        className={styles.quoteBlock}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
        variants={fadeUp}
      >
        <p className={styles.quote}>
          Not just a factory. A creative partner who treats your brand&rsquo;s
          vision as carefully as we treat the fabric it&rsquo;s made from.
        </p>
      </motion.div>
    </section>
  )
}
