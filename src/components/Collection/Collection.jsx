import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import styles from './Collection.module.css'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

const viewport = { once: true, margin: '-80px' }

const CATEGORIES = [
  {
    name: 'Knitwear',
    description: 'Jersey, rib and cable-knit, cut and finished to spec.',
    area: 'knitwear',
    image: 'collection-knitwear.jpg',
  },
  {
    name: 'Outerwear',
    description: 'Shells, quilted jackets and technical layers.',
    area: 'outerwear',
    image: 'collection-outerwear.jpg',
  },
  {
    name: 'Denim',
    description: 'Washed, raw and garment-dyed, made to hold shape.',
    area: 'denim',
    image: 'collection-denim.jpg',
  },
  {
    name: 'Accessories',
    description: 'Bags, caps and small leather goods.',
    area: 'accessories',
    image: 'collection-accessories.jpg',
  },
  {
    name: 'Footwear',
    description: 'Canvas and leather uppers, hand-lasted.',
    area: 'footwear',
    image: 'collection-footwear.jpg',
  },
]

export function Collection() {
  return (
    <section id="collection" className={styles.collection}>
      <div className={styles.inner}>
        <motion.div
          className={styles.header}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={fadeUp}
        >
          <span className={styles.eyebrow}>The Collection</span>
          <h2 className={styles.heading}>
            Manufacturing categories we run every season.
          </h2>
        </motion.div>

        <motion.div className={styles.grid} initial="hidden" whileInView="visible" viewport={viewport}>
          {CATEGORIES.map((category) => (
            <motion.figure
              key={category.name}
              className={styles.tile}
              style={{ gridArea: category.area }}
              variants={fadeUp}
            >
              <Link
                to={`/collections?category=${encodeURIComponent(category.name)}`}
                className={styles.tileLink}
              >
                <img
                  className={styles.image}
                  src={`/landing%20page%20images/${category.image}`}
                  alt={`${category.name} product shot`}
                  loading="lazy"
                />
                <figcaption className={styles.caption}>
                  <span className={styles.captionName}>{category.name}</span>
                  <span className={styles.captionDescription}>{category.description}</span>
                </figcaption>
              </Link>
            </motion.figure>
          ))}
        </motion.div>

        <motion.div
          className={styles.ctaRow}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={fadeUp}
        >
          <Link to="/lookbook" className={styles.ctaOutline}>
            View the Lookbook
          </Link>
          <Link to="/quote" className={styles.ctaFilled}>
            Get a Quote
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
