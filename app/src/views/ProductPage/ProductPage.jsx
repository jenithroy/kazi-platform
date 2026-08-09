'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Box, Check, ChevronDown, ChevronUp, Image as ImageIcon, ShoppingBag } from 'lucide-react'
import { Nav } from '../../components/Nav/Nav'
import { Footer } from '../../components/Footer/Footer'
import { ProductCard } from '../../components/ProductCard/ProductCard'
import QtyStepper from '../AtelierPage/components/QtyStepper'
import { getProductBySlug, getRelatedProducts, categoryImage } from '../../data/products'
import { useCart } from '../../lib/cart-context'

const GarmentViewer = dynamic(() => import('../AtelierPage/components/GarmentViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center font-body text-xs text-pine-soft">
      Loading preview…
    </div>
  ),
})

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

const viewport = { once: true, margin: '-80px' }

const filledButton =
  'inline-flex items-center justify-center gap-2 h-12 px-6 bg-moss text-pine font-body text-sm font-semibold tracking-wide hover:bg-moss-deep transition-colors duration-150 w-full sm:w-auto'
const outlineButton =
  'inline-flex items-center justify-center gap-2 h-11 px-6 border border-pine text-pine font-body text-sm font-semibold tracking-wide hover:bg-pine hover:text-bone transition-colors duration-150'

function ProductPage({ slug }) {
  const product = getProductBySlug(slug)
  const { addItem } = useCart()

  const [colorIndex, setColorIndex] = useState(0)
  const [size, setSize] = useState(product?.sizes?.[0] ?? null)
  const [qty, setQty] = useState(product?.moq ?? 50)
  const [viewMode, setViewMode] = useState('image')
  const [justAdded, setJustAdded] = useState(false)
  const [openAccordion, setOpenAccordion] = useState('specs')

  useEffect(() => {
    setColorIndex(0)
    setSize(product?.sizes?.[0] ?? null)
    setQty(product?.moq ?? 50)
    setViewMode('image')
    setJustAdded(false)
  }, [slug, product])

  if (!product) {
    return (
      <>
        <Nav isScrolled />
        <main className="bg-paper min-h-[70vh] flex items-center justify-center px-8 pt-32 pb-24">
          <div className="text-center max-w-md">
            <h1 className="font-display text-3xl text-pine mb-3">Product not found</h1>
            <p className="font-body text-pine-soft mb-8">
              That style may have moved or isn&rsquo;t part of the catalogue anymore.
            </p>
            <Link href="/collections" className={outlineButton}>
              <ArrowLeft size={14} strokeWidth={1.5} /> Back to Collections
            </Link>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  const hasColors = product.colors && product.colors.length > 0
  const activeColor = hasColors ? product.colors[colorIndex] : null
  const relatedProducts = getRelatedProducts(product)

  function handleAddToBag() {
    addItem(
      {
        id: `${product.slug}-${activeColor?.name ?? 'default'}-${size ?? ''}`,
        slug: product.slug,
        name: product.name,
        image: categoryImage(product.category),
        price: product.price,
        color: activeColor?.name,
        size: size ?? undefined,
      },
      qty,
    )
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 2000)
  }

  const quoteHref = `/quote?details=${encodeURIComponent(
    `Inquiry for ${product.name}${activeColor ? ` (Colour: ${activeColor.name})` : ''}${size ? `, Size ${size}` : ''}`,
  )}`
  const atelierHref = product.garmentModel
    ? `/atelier?garment=${product.garmentModel}${activeColor ? `&colour=${encodeURIComponent(activeColor.hex)}` : ''}`
    : null

  return (
    <>
      <Nav isScrolled />

      <main className="bg-paper">
        <section className="px-8 pt-40 pb-4">
          <div className="max-w-[1200px] mx-auto flex items-center gap-2 font-body text-[11px] tracking-[0.1em] uppercase text-pine-soft">
            <Link href="/" className="hover:text-pine transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link
              href={`/collections?category=${encodeURIComponent(product.category)}`}
              className="hover:text-pine transition-colors"
            >
              {product.category}
            </Link>
            <span>/</span>
            <span className="text-pine">{product.name}</span>
          </div>
        </section>

        <section className="px-8 pb-20">
          <motion.div
            className="max-w-[1200px] mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16"
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={fadeUp}
          >
            {/* Media */}
            <div className="relative aspect-[4/5] bg-paper-raised overflow-hidden">
              {product.garmentModel && (
                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === 'image' ? '3d' : 'image')}
                  aria-label={viewMode === 'image' ? 'Switch to 3D preview' : 'Switch to product image'}
                  className="absolute top-3 right-3 z-10 w-10 h-10 flex items-center justify-center bg-pine text-bone hover:bg-moss-deep transition-colors duration-150"
                >
                  {viewMode === 'image' ? (
                    <Box size={16} strokeWidth={1.5} />
                  ) : (
                    <ImageIcon size={16} strokeWidth={1.5} />
                  )}
                </button>
              )}

              {viewMode === 'image' || !product.garmentModel ? (
                <img
                  src={categoryImage(product.category)}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <GarmentViewer garment={product.garmentModel} colour={activeColor?.hex ?? '#E8E0D0'} />
              )}
            </div>

            {/* Info */}
            <div className="flex flex-col">
              <span className="font-body text-xs tracking-[0.18em] uppercase text-moss mb-2">
                {product.category}
              </span>
              <h1 className="font-display text-3xl md:text-4xl text-pine mb-2">{product.name}</h1>
              <p className="font-mono text-base text-pine-soft mb-4">{product.price}</p>
              <p className="font-body text-sm text-pine-soft leading-relaxed mb-6 max-w-md">
                {product.description}
              </p>

              {hasColors && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-body text-xs tracking-[0.12em] uppercase text-pine-soft">
                      Colour
                    </span>
                    <span className="font-body text-xs text-pine">{activeColor.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {product.colors.map((color, index) => (
                      <button
                        key={color.name}
                        type="button"
                        onClick={() => setColorIndex(index)}
                        title={color.name}
                        aria-label={color.name}
                        aria-pressed={colorIndex === index}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-transform duration-150 ${
                          colorIndex === index ? 'border-moss scale-110' : 'border-pine/15 hover:border-pine/40'
                        }`}
                        style={{ backgroundColor: color.hex }}
                      >
                        {colorIndex === index && (
                          <Check
                            size={12}
                            strokeWidth={2.5}
                            className={
                              ['#FFFFFF', '#E8E0D0', '#F5F3EE'].includes(color.hex) ? 'text-pine' : 'text-bone'
                            }
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {product.sizes && (
                <div className="mb-5">
                  <span className="font-body text-xs tracking-[0.12em] uppercase text-pine-soft block mb-2">
                    Size
                  </span>
                  <div className="flex gap-2">
                    {product.sizes.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSize(s)}
                        aria-pressed={size === s}
                        className={`w-11 h-11 border font-body text-sm transition-colors duration-150 ${
                          size === s
                            ? 'border-pine bg-pine text-bone'
                            : 'border-pine/15 text-pine hover:border-pine/40'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <span className="font-body text-xs tracking-[0.12em] uppercase text-pine-soft block mb-2">
                  Quantity <span className="normal-case text-pine-soft/70">(MOQ {product.moq})</span>
                </span>
                <QtyStepper value={qty} onChange={setQty} min={product.moq} max={10000} step={10} />
              </div>

              <button type="button" onClick={handleAddToBag} className={`${filledButton} mb-3`}>
                {justAdded ? (
                  <>
                    <Check size={15} strokeWidth={2} /> Added to Bag
                  </>
                ) : (
                  <>
                    <ShoppingBag size={15} strokeWidth={1.5} /> Add to Bag
                  </>
                )}
              </button>

              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                {atelierHref && (
                  <Link href={atelierHref} className={outlineButton}>
                    Customize in the Atelier <ArrowRight size={14} strokeWidth={1.5} />
                  </Link>
                )}
                <Link href={quoteHref} className={outlineButton}>
                  Request Sample / Quote
                </Link>
              </div>

              <div className="border-t border-pine/15">
                <div className="border-b border-pine/15">
                  <button
                    type="button"
                    onClick={() => setOpenAccordion(openAccordion === 'specs' ? null : 'specs')}
                    className="w-full py-4 flex items-center justify-between text-left font-body text-xs tracking-[0.12em] uppercase text-pine"
                  >
                    <span>Specification &amp; Fit</span>
                    {openAccordion === 'specs' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {openAccordion === 'specs' && (
                    <ul className="pb-4 space-y-1.5">
                      {product.specs.map((spec) => (
                        <li key={spec} className="flex items-start gap-2 font-body text-sm text-pine-soft">
                          <span className="text-moss mt-1">•</span>
                          <span>{spec}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="border-b border-pine/15">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenAccordion(openAccordion === 'sustainability' ? null : 'sustainability')
                    }
                    className="w-full py-4 flex items-center justify-between text-left font-body text-xs tracking-[0.12em] uppercase text-pine"
                  >
                    <span>Sustainability</span>
                    {openAccordion === 'sustainability' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {openAccordion === 'sustainability' && (
                    <ul className="pb-4 space-y-1.5">
                      {product.sustainability.map((item) => (
                        <li key={item} className="flex items-start gap-2 font-body text-sm text-pine-soft">
                          <span className="text-moss mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {relatedProducts.length > 0 && (
          <section className="px-8 pb-20 border-t border-pine/15 pt-16">
            <motion.div
              className="max-w-[1200px] mx-auto"
              initial="hidden"
              whileInView="visible"
              viewport={viewport}
              variants={fadeUp}
            >
              <h2 className="font-display text-2xl text-pine mb-6">You might also like</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {relatedProducts.map((related) => (
                  <ProductCard key={related.slug} product={related} />
                ))}
              </div>
            </motion.div>
          </section>
        )}
      </main>

      <Footer />
    </>
  )
}

export default ProductPage
