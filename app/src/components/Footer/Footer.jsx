'use client'

import Link from 'next/link'
import styles from './Footer.module.css'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.topRow}>
          <div className={styles.brandCol}>
            <a href="#top" className={styles.logo} aria-label="Kazi Manufacturing home" />
            <p className={styles.tagline}>
              Custom apparel manufacturing for UK brands, crafted in Kathmandu.
            </p>
          </div>

          <nav className={styles.linkCol} aria-label="Footer">
            <span className={styles.colHeading}>Explore</span>
            <a href="#atelier" className={styles.link}>
              Atelier
            </a>
            <a href="#heritage" className={styles.link}>
              Our Heritage
            </a>
            <Link href="/pricing" className={styles.link}>
              Pricing
            </Link>
            <Link href="/stories" className={styles.link}>
              Stories
            </Link>
            <Link href="/lookbook" className={styles.link}>
              Lookbook
            </Link>
          </nav>

          <div className={styles.contactCol}>
            <span className={styles.colHeading}>Contact</span>
            <a href="mailto:hello@kazimanufacturing.com" className={styles.link}>
              hello@kazimanufacturing.com
            </a>
          </div>

          <div className={styles.locationCol}>
            <span className={styles.colHeading}>Location</span>
            <address className={styles.address}>Kathmandu, Nepal</address>
          </div>
        </div>

        <div className={styles.bottomRow}>
          <span className={styles.copyright}>
            &copy; {year} Kazi Manufacturing. All rights reserved.
          </span>
          <Link href="/quote" className={styles.ctaLink}>
            Get a Quote &rarr;
          </Link>
        </div>
      </div>
    </footer>
  )
}
