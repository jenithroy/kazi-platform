import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Upload, X } from 'lucide-react'
import { Nav } from '../../components/Nav/Nav'
import { Footer } from '../../components/Footer/Footer'
import QtyStepper from '../AtelierPage/components/QtyStepper'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

const viewport = { once: true, margin: '-80px' }

const PRODUCT_TYPES = [
  { id: 't-shirt', label: 'T-Shirts' },
  { id: 'hoodie', label: 'Hoodies' },
]

const QTY_MIN = 50
const QTY_MAX = 2000

// Every figure on this page — tiers, add-on deltas, reference grid — is the old site's
// placeholder cost sheet, not verified Kazi pricing. Structurally correct, numerically
// fictional until Kazi provides real figures (PAGES_DESIGN_PLAN.md §2.2, §7.4). The
// calculator and the static reference table below intentionally share this same data so
// the two can never contradict each other.
const PRICING_TIERS = [
  { min: 50, max: 99, label: '50–99', 't-shirt': 8.5, hoodie: 18.0 },
  { min: 100, max: 249, label: '100–249', 't-shirt': 6.5, hoodie: 14.5 },
  { min: 250, max: 499, label: '250–499', 't-shirt': 5.0, hoodie: 12.0 },
  { min: 500, max: 999, label: '500–999', 't-shirt': 4.0, hoodie: 10.0 },
  { min: 1000, max: Infinity, label: '1000+', 't-shirt': 3.2, hoodie: 8.5 },
]

const EMBROIDERY_PRICE = { small: 2.5, large: 4.0 }
const SCREEN_PRINT_PER_COLOUR = 1.2
const DTG_PRICE = 3.0

const ADDON_REFERENCE = [
  { label: 'Embroidery — Small', price: EMBROIDERY_PRICE.small },
  { label: 'Embroidery — Large', price: EMBROIDERY_PRICE.large },
  { label: 'Screen Print — per colour', price: SCREEN_PRINT_PER_COLOUR },
  { label: 'DTG', price: DTG_PRICE },
]

const GARMENT_COLOURS = [
  { hex: '#FFFFFF', label: 'White' },
  { hex: '#1A1A1A', label: 'Black' },
  { hex: '#1B3A2B', label: 'Pine' },
  { hex: '#3F8F5C', label: 'Moss' },
  { hex: '#6B6560', label: 'Stone' },
  { hex: '#3D2B1F', label: 'Espresso' },
  { hex: '#C4956A', label: 'Camel' },
  { hex: '#8B4513', label: 'Rust' },
]

const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']
const FILE_ACCEPT = '.png,.jpg,.jpeg,.pdf,.ai,.psd'

function tierForQty(qty) {
  return PRICING_TIERS.find((tier) => qty >= tier.min && qty <= tier.max) ?? PRICING_TIERS[0]
}

function formatGBP(amount) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

const inputClass =
  'w-full border border-pine/15 bg-paper px-3.5 py-2.5 font-body text-sm text-pine focus:outline-none focus:border-pine transition-colors'
const labelClass = 'block font-body text-xs tracking-[0.12em] uppercase text-pine-soft mb-1.5'
const filledButton =
  'inline-flex items-center justify-center h-12 px-6 bg-moss text-pine font-body text-sm font-semibold tracking-wide hover:bg-moss-deep transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed w-full sm:w-auto'

const pricingSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name'),
  company: z.string().trim().min(1, 'Enter your company name'),
  email: z.email('Enter a valid email'),
  phone: z.string().trim().optional(),
  details: z.string().trim().min(1, 'Tell us a little about the project'),
})

function PricingPage() {
  const [productType, setProductType] = useState('t-shirt')
  const [qty, setQty] = useState(100)
  const [embroidery, setEmbroidery] = useState(false)
  const [embroiderySize, setEmbroiderySize] = useState('small')
  const [screenPrint, setScreenPrint] = useState(false)
  const [screenPrintColours, setScreenPrintColours] = useState(1)
  const [dtg, setDtg] = useState(false)

  const [sizes, setSizes] = useState(() => Object.fromEntries(SIZES.map((s) => [s, 0])))
  const [colours, setColours] = useState([])
  const [file, setFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(pricingSchema) })

  const tier = tierForQty(qty)
  const basePrice = tier[productType]
  const addonsTotal =
    (embroidery ? EMBROIDERY_PRICE[embroiderySize] : 0) +
    (screenPrint ? SCREEN_PRINT_PER_COLOUR * screenPrintColours : 0) +
    (dtg ? DTG_PRICE : 0)
  const perUnit = basePrice + addonsTotal
  const total = perUnit * qty

  // Skip the first tier (50) — it's the slider's own minimum, not a threshold the slider
  // ever "crosses", so marking it just collided with the 100 mark right next to it.
  const tierMarks = useMemo(
    () =>
      PRICING_TIERS.slice(1).map((t) => ({
        qty: t.min,
        pct: ((t.min - QTY_MIN) / (QTY_MAX - QTY_MIN)) * 100,
      })),
    [],
  )

  function toggleColour(hex) {
    setColours((prev) => (prev.includes(hex) ? prev.filter((c) => c !== hex) : [...prev, hex]))
  }

  function updateSize(size, value) {
    setSizes((prev) => ({ ...prev, [size]: Math.max(0, value) }))
  }

  function handleFiles(fileList) {
    const picked = fileList?.[0]
    if (picked) setFile(picked)
  }

  const onSubmit = async () => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    setSubmitted(true)
  }

  return (
    <>
      <Nav isScrolled />

      <main className="bg-paper">
        {/* Intro */}
        <section className="px-8 pt-48 pb-16">
          <motion.div
            className="max-w-[1440px] mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={fadeUp}
          >
            <span className="block font-body text-xs tracking-[0.18em] uppercase text-moss mb-4">
              Pricing
            </span>
            <h1 className="font-display text-4xl md:text-5xl text-pine mb-4">
              Know your number before you ask.
            </h1>
          </motion.div>
        </section>

        {/* Calculator + Quote form */}
        <section className="px-8 pb-20">
          <motion.div
            className="max-w-[1440px] mx-auto border border-pine/15"
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={fadeUp}
          >
            <div className="grid lg:grid-cols-2">
              {/* Calculator */}
              <div className="p-8 md:p-12">
                <h2 className="font-display text-xl text-pine mb-6">Estimate your price</h2>

                <span className={labelClass}>Product</span>
                <div className="flex gap-2 mb-8" role="group" aria-label="Product type">
                  {PRODUCT_TYPES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setProductType(p.id)}
                      aria-pressed={productType === p.id}
                      className={`flex-1 border px-4 py-2.5 font-body text-sm transition-colors ${
                        productType === p.id
                          ? 'border-pine bg-pine text-bone'
                          : 'border-pine/15 text-pine hover:border-pine/40'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between mb-2">
                  <span className={labelClass}>Quantity</span>
                  <span className="font-mono text-sm text-pine tabular-nums">{qty} units</span>
                </div>
                <input
                  type="range"
                  min={QTY_MIN}
                  max={QTY_MAX}
                  step={10}
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  className="w-full h-0.5 bg-pine/15 appearance-none cursor-pointer"
                  style={{ accentColor: '#3F8F5C' }}
                  aria-label="Quantity"
                />
                <div className="relative h-4 mb-8">
                  {tierMarks.map((mark) => (
                    <span
                      key={mark.qty}
                      className={`absolute -translate-x-1/2 font-mono text-[10px] tabular-nums ${
                        qty >= mark.qty ? 'text-moss' : 'text-pine-soft/50'
                      }`}
                      style={{ left: `${mark.pct}%` }}
                    >
                      {mark.qty}
                    </span>
                  ))}
                </div>

                <span className={labelClass}>Decoration add-ons</span>
                <div className="space-y-3 mb-8">
                  <div className="border border-pine/15 p-3.5">
                    <label className="flex items-center justify-between gap-3 cursor-pointer">
                      <span className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={embroidery}
                          onChange={(e) => setEmbroidery(e.target.checked)}
                          className="w-4 h-4 accent-moss"
                        />
                        <span className="font-body text-sm text-pine">Embroidery</span>
                      </span>
                      <span className="font-mono text-xs text-pine-soft tabular-nums">
                        +{formatGBP(EMBROIDERY_PRICE[embroiderySize])}/unit
                      </span>
                    </label>
                    {embroidery && (
                      <div className="flex gap-2 mt-3 pl-6.5">
                        {['small', 'large'].map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => setEmbroiderySize(size)}
                            aria-pressed={embroiderySize === size}
                            className={`px-3 py-1 border font-body text-xs capitalize transition-colors ${
                              embroiderySize === size
                                ? 'border-pine bg-pine text-bone'
                                : 'border-pine/15 text-pine-soft hover:border-pine/40'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border border-pine/15 p-3.5">
                    <label className="flex items-center justify-between gap-3 cursor-pointer">
                      <span className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={screenPrint}
                          onChange={(e) => setScreenPrint(e.target.checked)}
                          className="w-4 h-4 accent-moss"
                        />
                        <span className="font-body text-sm text-pine">Screen Print</span>
                      </span>
                      <span className="font-mono text-xs text-pine-soft tabular-nums">
                        +{formatGBP(SCREEN_PRINT_PER_COLOUR)}/unit per colour
                      </span>
                    </label>
                    {screenPrint && (
                      <div className="flex items-center gap-2.5 mt-3 pl-6.5">
                        <span className="font-body text-xs text-pine-soft">Colours</span>
                        <QtyStepper
                          value={screenPrintColours}
                          onChange={setScreenPrintColours}
                          min={1}
                          max={6}
                          step={1}
                        />
                      </div>
                    )}
                  </div>

                  <div className="border border-pine/15 p-3.5">
                    <label className="flex items-center justify-between gap-3 cursor-pointer">
                      <span className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={dtg}
                          onChange={(e) => setDtg(e.target.checked)}
                          className="w-4 h-4 accent-moss"
                        />
                        <span className="font-body text-sm text-pine">DTG</span>
                      </span>
                      <span className="font-mono text-xs text-pine-soft tabular-nums">
                        +{formatGBP(DTG_PRICE)}/unit
                      </span>
                    </label>
                  </div>
                </div>

                <div className="pt-6 border-t border-pine/15">
                  <div className="flex items-baseline justify-between">
                    <span className={labelClass}>Per unit</span>
                    <span className="font-mono text-2xl text-moss tabular-nums">
                      {formatGBP(perUnit)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className={labelClass}>Estimated total ({qty} units)</span>
                    <span className="font-mono text-lg text-pine tabular-nums">
                      {formatGBP(total)}
                    </span>
                  </div>
                  <p className="font-body text-xs text-pine-soft mt-4">
                    Excl. shipping, customs and packaging.
                  </p>
                </div>
              </div>

              {/* Quote form */}
              <div className="p-8 md:p-12 bg-bone border-t lg:border-t-0 lg:border-l border-pine/15">
                {submitted ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12">
                    <h3 className="font-display text-2xl text-pine mb-2">
                      Thank you — quote request sent.
                    </h3>
                    <p className="font-body text-pine-soft max-w-sm">
                      We&rsquo;ve got your details and your estimate. Expect a reply at the
                      email you gave us within 24 hours.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
                    <h2 className="font-display text-xl text-pine mb-1">Request this quote</h2>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass} htmlFor="name">Name</label>
                        <input id="name" className={inputClass} type="text" autoComplete="name" {...register('name')} />
                        {errors.name && <p className="font-body text-xs text-red-600 mt-1">{errors.name.message}</p>}
                      </div>
                      <div>
                        <label className={labelClass} htmlFor="company">Company</label>
                        <input id="company" className={inputClass} type="text" autoComplete="organization" {...register('company')} />
                        {errors.company && <p className="font-body text-xs text-red-600 mt-1">{errors.company.message}</p>}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass} htmlFor="email">Email</label>
                        <input id="email" className={inputClass} type="email" autoComplete="email" {...register('email')} />
                        {errors.email && <p className="font-body text-xs text-red-600 mt-1">{errors.email.message}</p>}
                      </div>
                      <div>
                        <label className={labelClass} htmlFor="phone">
                          Phone <span className="normal-case text-pine-soft/70">(optional)</span>
                        </label>
                        <input id="phone" className={inputClass} type="tel" autoComplete="tel" {...register('phone')} />
                      </div>
                    </div>

                    <div>
                      <span className={labelClass}>Size breakdown</span>
                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                        {SIZES.map((size) => (
                          <div key={size}>
                            <label htmlFor={`size-${size}`} className="block font-body text-[10px] tracking-[0.1em] uppercase text-pine-soft mb-1 text-center">
                              {size}
                            </label>
                            <input
                              id={`size-${size}`}
                              type="number"
                              min="0"
                              inputMode="numeric"
                              value={sizes[size] || ''}
                              onChange={(e) => updateSize(size, Number(e.target.value) || 0)}
                              placeholder="0"
                              className="w-full border border-pine/15 bg-paper text-center px-1 py-2 font-mono text-sm text-pine tabular-nums focus:outline-none focus:border-pine"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className={labelClass}>Garment colour</span>
                      <div className="flex flex-wrap gap-2">
                        {GARMENT_COLOURS.map((c) => (
                          <button
                            key={c.hex}
                            type="button"
                            onClick={() => toggleColour(c.hex)}
                            title={c.label}
                            aria-pressed={colours.includes(c.hex)}
                            aria-label={c.label}
                            className={`w-8 h-8 border-2 transition-all duration-150 ${
                              colours.includes(c.hex) ? 'border-pine scale-110 shadow-sm' : 'border-pine/15 hover:border-pine/40'
                            }`}
                            style={{ backgroundColor: c.hex }}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className={labelClass}>Artwork file</span>
                      <div
                        onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files) }}
                        className={`relative border-2 border-dashed p-5 text-center transition-colors ${
                          dragActive ? 'border-moss bg-moss/5' : 'border-pine/15'
                        }`}
                      >
                        <input
                          type="file"
                          accept={FILE_ACCEPT}
                          onChange={(e) => handleFiles(e.target.files)}
                          aria-label="Upload artwork file"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        {file ? (
                          <div className="relative flex items-center justify-center gap-2 pointer-events-none">
                            <span className="font-body text-sm text-pine truncate max-w-[220px]">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => setFile(null)}
                              aria-label="Remove file"
                              className="pointer-events-auto text-pine-soft hover:text-red-600 transition-colors"
                            >
                              <X size={14} strokeWidth={1.5} />
                            </button>
                          </div>
                        ) : (
                          <div className="pointer-events-none">
                            <Upload className="mx-auto mb-2 text-pine-soft" size={20} strokeWidth={1.5} />
                            <p className="font-body text-sm text-pine">Drop a file or click to upload</p>
                            <p className="font-body text-xs text-pine-soft mt-1">PNG, JPG, PDF, AI or PSD</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className={labelClass} htmlFor="details">Additional details</label>
                      <textarea id="details" rows={3} className={inputClass} {...register('details')} />
                      {errors.details && <p className="font-body text-xs text-red-600 mt-1">{errors.details.message}</p>}
                    </div>

                    <div className="pt-2">
                      <button type="submit" disabled={isSubmitting} className={filledButton}>
                        {isSubmitting ? 'Sending…' : `Submit Quote — ${formatGBP(total)} estimate`}
                      </button>
                      <p className="font-body text-xs text-pine-soft mt-3">
                        No obligation. We reply within 24 hours.
                      </p>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        </section>

        {/* Volume Pricing Reference */}
        <section className="border-t border-pine/15 px-8 py-16 md:py-20">
          <motion.div
            className="max-w-[1440px] mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={fadeUp}
          >
            <span className="block font-body text-xs tracking-[0.18em] uppercase text-moss mb-4">
              Reference
            </span>
            <h2 className="font-display text-3xl md:text-4xl text-pine mb-10 max-w-2xl">
              Volume pricing, at a glance.
            </h2>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {PRODUCT_TYPES.map((p) => (
                <div key={p.id} className="border border-pine/15 bg-bone overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-pine">
                        <th className="text-left font-body text-xs tracking-[0.1em] uppercase text-bone px-4 py-3">
                          Qty Range
                        </th>
                        <th className="text-right font-body text-xs tracking-[0.1em] uppercase text-bone px-4 py-3">
                          {p.label.replace(/s$/, '')} /unit
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {PRICING_TIERS.map((tier) => (
                        <tr key={tier.label} className="border-t border-pine/10">
                          <td className="font-body text-sm text-pine px-4 py-2.5">{tier.label}</td>
                          <td className="font-mono text-sm text-pine tabular-nums text-right px-4 py-2.5">
                            {formatGBP(tier[p.id])}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {ADDON_REFERENCE.map((addon) => (
                <div key={addon.label} className="border border-pine/15 bg-bone p-4">
                  <p className="font-body text-xs text-pine-soft uppercase tracking-[0.12em] mb-2">
                    {addon.label}
                  </p>
                  <p className="font-mono text-lg text-moss tabular-nums">
                    {formatGBP(addon.price)}
                    <span className="text-xs text-pine-soft">/unit</span>
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </section>
      </main>

      <Footer />
    </>
  )
}

export default PricingPage
