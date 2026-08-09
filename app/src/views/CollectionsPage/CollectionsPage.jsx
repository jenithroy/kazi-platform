'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Nav } from '../../components/Nav/Nav'
import { Footer } from '../../components/Footer/Footer'
import { ProductCard } from '../../components/ProductCard/ProductCard'
import { CATEGORIES, products } from '../../data/products'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

const viewport = { once: true, margin: '-80px' }

const filledButton =
  'inline-flex items-center justify-center h-11 px-6 bg-moss text-pine font-body text-sm font-semibold tracking-wide hover:bg-moss-deep transition-colors duration-150'
const outlineButton =
  'inline-flex items-center justify-center h-11 px-6 border border-pine text-pine font-body text-sm font-semibold tracking-wide hover:bg-pine hover:text-bone transition-colors duration-150'

const FILTERS = ['All', ...CATEGORIES]

function CollectionsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const requestedCategory = searchParams.get('category')
  const activeCategory = FILTERS.includes(requestedCategory) ? requestedCategory : 'All'

  const filtered = useMemo(
    () => (activeCategory === 'All' ? products : products.filter((p) => p.category === activeCategory)),
    [activeCategory],
  )

  function selectCategory(category) {
    const params = new URLSearchParams(searchParams)
    if (category === 'All') {
      params.delete('category')
    } else {
      params.set('category', category)
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <>
      <Nav isScrolled />

      <main className="bg-paper">
        <div className="sticky top-[var(--nav-height)] mt-[var(--nav-height)] z-10 bg-paper/95 backdrop-blur border-y border-pine/15">
          <div className="max-w-[1440px] mx-auto px-8 py-4 flex gap-3 overflow-x-auto">
            {FILTERS.map((category) => {
              const active = category === activeCategory
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => selectCategory(category)}
                  className={`shrink-0 inline-flex items-center h-9 px-4 font-body text-xs font-semibold tracking-wide transition-colors duration-150 ${
                    active ? 'bg-moss text-pine' : 'border border-pine text-pine hover:bg-bone'
                  }`}
                >
                  {category}
                </button>
              )
            })}
          </div>
        </div>

        <section className="px-8 py-16 md:py-20">
          <motion.div
            layout
            className="max-w-[1440px] mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10"
          >
            {filtered.map((product) => (
              <motion.div
                key={product.slug}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </motion.div>
        </section>

        <section className="border-t border-pine/15 py-20">
          <motion.div
            className="max-w-[1440px] mx-auto px-8 text-center"
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={fadeUp}
          >
            <h2 className="font-display text-3xl md:text-4xl text-pine mb-3">
              Want something that isn&rsquo;t here yet?
            </h2>
            <p className="font-body text-pine-soft mb-8">
              These are starting points, not the limit — build a garment from scratch in the
              Atelier, or send us the brief directly.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/atelier" className={outlineButton}>
                Enter the Atelier
              </Link>
              <Link href="/quote" className={filledButton}>
                Get a Quote
              </Link>
            </div>
          </motion.div>
        </section>
      </main>

      <Footer />
    </>
  )
}

export default CollectionsPage
