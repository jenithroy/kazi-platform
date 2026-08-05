import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Nav } from '../../components/Nav/Nav'
import { Footer } from '../../components/Footer/Footer'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

const viewport = { once: true, margin: '-80px' }

const filledButton =
  'inline-flex items-center justify-center h-11 px-6 bg-moss text-pine font-body text-sm font-semibold tracking-wide hover:bg-moss-deep transition-colors duration-150'
const outlineButton =
  'inline-flex items-center justify-center h-11 px-6 border border-pine text-pine font-body text-sm font-semibold tracking-wide hover:bg-pine hover:text-bone transition-colors duration-150'

// Only one photo per category exists today (public/landing page images/), the same set the
// homepage Collection teaser uses. A real lookbook needs 15-25 across categories to read as
// a gallery rather than this teaser repeated with padding (see LOOKBOOK_DESIGN_PLAN.md §4 and
// §7) — structure here supports more entries per category, just add objects once photography
// exists.
const GALLERY = [
  {
    category: 'Knitwear',
    image: 'collection-knitwear.jpg',
    caption: 'Jersey, rib and cable-knit, cut and finished to spec.',
    tall: true,
  },
  {
    category: 'Outerwear',
    image: 'collection-outerwear.jpg',
    caption: 'Shells, quilted jackets and technical layers.',
  },
  {
    category: 'Denim',
    image: 'collection-denim.jpg',
    caption: 'Washed, raw and garment-dyed, made to hold shape.',
    tall: true,
  },
  {
    category: 'Accessories',
    image: 'collection-accessories.jpg',
    caption: 'Bags, caps and small leather goods.',
  },
  {
    category: 'Footwear',
    image: 'collection-footwear.jpg',
    caption: 'Canvas and leather uppers, hand-lasted.',
    tall: true,
  },
]

const CATEGORIES = ['All', 'Knitwear', 'Outerwear', 'Denim', 'Accessories', 'Footwear']

function LookbookPage() {
  const [activeCategory, setActiveCategory] = useState('All')
  const filtered =
    activeCategory === 'All' ? GALLERY : GALLERY.filter((item) => item.category === activeCategory)

  return (
    <>
      <Nav isScrolled />

      <main className="bg-paper">
        {/* Hero */}
        <section className="px-8 pt-48 pb-16">
          <motion.div
            className="max-w-[1440px] mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={fadeUp}
          >
            <span className="block font-body text-xs tracking-[0.18em] uppercase text-moss mb-4">
              Lookbook
            </span>
            <h1 className="font-display text-4xl md:text-5xl text-pine max-w-2xl">
              The Lookbook
            </h1>
            <p className="font-body text-pine-soft mt-4 max-w-xl">
              A closer look at what leaves our floor — by category, by finish, by fabric.
            </p>
          </motion.div>
        </section>

        {/* Category filter */}
        <div className="sticky top-[var(--nav-height)] z-10 bg-paper/95 backdrop-blur border-y border-pine/15">
          <div className="max-w-[1440px] mx-auto px-8 py-4 flex gap-3 overflow-x-auto">
            {CATEGORIES.map((category) => {
              const active = category === activeCategory
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`shrink-0 inline-flex items-center h-9 px-4 font-body text-xs font-semibold tracking-wide transition-colors duration-150 ${
                    active
                      ? 'bg-moss text-pine'
                      : 'border border-pine text-pine hover:bg-bone'
                  }`}
                >
                  {category}
                </button>
              )
            })}
          </div>
        </div>

        {/* Gallery */}
        <section className="px-8 py-16 md:py-20">
          <motion.div
            layout
            className="max-w-[1440px] mx-auto columns-1 sm:columns-2 lg:columns-3 gap-6"
          >
            <AnimatePresence>
              {filtered.map((item) => (
                <motion.figure
                  key={item.image + item.category}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="relative mb-6 break-inside-avoid overflow-hidden group"
                >
                  <img
                    src={`/landing%20page%20images/${item.image}`}
                    alt={`${item.category} product shot`}
                    loading="lazy"
                    className={`w-full object-cover ${item.tall ? 'aspect-[3/4]' : 'aspect-[4/3]'}`}
                  />
                  <figcaption className="absolute inset-0 flex flex-col justify-end p-5 bg-gradient-to-t from-pine/85 via-pine/0 to-pine/0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className="font-display text-lg text-bone">{item.category}</span>
                    <span className="font-body text-sm text-bone/85">{item.caption}</span>
                  </figcaption>
                </motion.figure>
              ))}
            </AnimatePresence>
          </motion.div>
        </section>

        {/* Closing CTA */}
        <section className="border-t border-pine/15 py-20">
          <motion.div
            className="max-w-[1440px] mx-auto px-8 text-center"
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={fadeUp}
          >
            <h2 className="font-display text-3xl md:text-4xl text-pine mb-3">
              Seen something close to what you&rsquo;re picturing?
            </h2>
            <p className="font-body text-pine-soft mb-8">
              Bring it into the Atelier to customize it, or send us the details directly.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to="/atelier" className={outlineButton}>
                Enter the Atelier
              </Link>
              <Link to="/quote" className={filledButton}>
                Get a Quote
              </Link>
            </div>
            <p className="font-body text-sm text-pine-soft mt-8">
              Ready to start an order? Browse priced, shoppable styles in the{' '}
              <Link to="/collections" className="text-pine underline hover:text-moss transition-colors">
                Collection
              </Link>
              .
            </p>
          </motion.div>
        </section>
      </main>

      <Footer />
    </>
  )
}

export default LookbookPage
