'use client'

import { useState } from 'react'
import Link from 'next/link'
import { List, ShoppingBag, User, X } from '@phosphor-icons/react'
import { CartDrawer } from '../CartDrawer/CartDrawer'
import { useCart } from '../../lib/cart-context'
import styles from './Nav.module.css'

const LINKS = [
  { label: 'Atelier', to: '/atelier' },
  { label: 'Our Heritage', to: '/heritage' },
]

export function Nav({ isScrolled }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const { totalItems } = useCart()

  return (
    <header className={`${styles.nav} ${isScrolled ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        <nav className={styles.links} aria-label="Primary">
          {LINKS.map((link) => (
            <Link key={link.label} href={link.to} className={styles.link}>
              {link.label}
            </Link>
          ))}
        </nav>

        <Link href="/" className={styles.logo} aria-label="Kazi Manufacturing home" />

        <div className={styles.actions}>
          <Link href="/quote" className={styles.cta}>
            Get a Quote
          </Link>
          <Link href="/account/login" className={styles.iconButton} aria-label="Account">
            <User size={20} weight="regular" />
          </Link>
          <button
            type="button"
            className={styles.iconButton}
            aria-label={totalItems > 0 ? `Bag, ${totalItems} items` : 'Bag'}
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag size={20} weight="regular" />
            {totalItems > 0 && <span className={styles.badge}>{totalItems}</span>}
          </button>
          <button
            type="button"
            className={`${styles.iconButton} ${styles.menuButton}`}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={22} weight="regular" /> : <List size={22} weight="regular" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className={styles.mobileMenu}>
          {LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.to}
              className={styles.mobileLink}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className={styles.mobileIconRow}>
            <Link
              href="/account/login"
              className={styles.iconButton}
              aria-label="Account"
              onClick={() => setMenuOpen(false)}
            >
              <User size={20} weight="regular" />
            </Link>
            <button
              type="button"
              className={styles.iconButton}
              aria-label={totalItems > 0 ? `Bag, ${totalItems} items` : 'Bag'}
              onClick={() => {
                setMenuOpen(false)
                setCartOpen(true)
              }}
            >
              <ShoppingBag size={20} weight="regular" />
              {totalItems > 0 && <span className={styles.badge}>{totalItems}</span>}
            </button>
          </div>
        </div>
      )}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </header>
  )
}
