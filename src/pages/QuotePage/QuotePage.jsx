import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Upload, X, ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { Nav } from '../../components/Nav/Nav'
import { Footer } from '../../components/Footer/Footer'
import QtyStepper from '../AtelierPage/components/QtyStepper'
import { GarmentMockup2D } from '../AtelierPage/components/GarmentMockup2D'
import { readQuoteDesigns, clearQuoteDesigns } from '../../lib/quote-handoff'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

const viewport = { once: true, margin: '-80px' }

// Slugs match the deep links Heritage's per-service CTAs use (`/quote?service=dtg`, etc.)
// — PAGES_DESIGN_PLAN.md §1.2.
const SERVICES = [
  { slug: 'custom-manufacturing', label: 'Custom Manufacturing' },
  { slug: 'dtg', label: 'Direct-to-Garment (DTG)' },
  { slug: 'screen-printing', label: 'Screen Printing' },
  { slug: 'embroidery', label: 'Embroidery' },
  { slug: 'dtf', label: 'Direct-to-Film (DTF)' },
  { slug: 'not-sure', label: 'Not sure yet' },
]

const GARMENT_CATEGORIES = ['Knitwear', 'Outerwear', 'Denim', 'Accessories', 'Footwear', 'Other']

const QUANTITY_RANGES = [
  'Under 500 units',
  '500–2,000 units',
  '2,000–10,000 units',
  '10,000+ units',
  'Custom',
]

const FILE_ACCEPT = '.png,.jpg,.jpeg,.pdf,.ai,.psd'

const inputClass =
  'w-full border border-pine/15 bg-paper px-3.5 py-2.5 font-body text-sm text-pine focus:outline-none focus:border-pine transition-colors'
const labelClass = 'block font-body text-xs tracking-[0.12em] uppercase text-pine-soft mb-1.5'
const errorClass = 'font-body text-xs text-red-600 mt-1'
const filledButton =
  'inline-flex items-center justify-center h-12 px-6 bg-moss text-pine font-body text-sm font-semibold tracking-wide hover:bg-moss-deep transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed w-full sm:w-auto'
const outlineButton =
  'inline-flex items-center gap-2 justify-center h-11 px-6 border border-pine text-pine font-body text-sm font-semibold tracking-wide hover:bg-pine hover:text-bone transition-colors duration-150'
const pillButton = (active) =>
  `border px-3.5 py-2.5 font-body text-sm text-left transition-colors ${
    active ? 'border-pine bg-pine text-bone' : 'border-pine/15 text-pine hover:border-pine/40'
  }`

function buildQuoteSchema(isHandoff) {
  return z
    .object({
      name: z.string().trim().min(1, 'Enter your name'),
      company: z.string().trim().min(1, 'Enter your company name'),
      email: z.email('Enter a valid email'),
      phone: z.string().trim().optional(),
      service: isHandoff ? z.string().optional() : z.string().min(1, 'Choose a service'),
      garmentCategory: isHandoff ? z.string().optional() : z.string().min(1, 'Choose a category'),
      garmentCategoryOther: z.string().trim().optional(),
      quantityRange: isHandoff
        ? z.string().optional()
        : z.string().min(1, 'Choose an approximate quantity'),
      quantityCustom: z.string().trim().optional(),
      deadline: z.string().trim().optional(),
      details: z.string().trim().min(1, 'Tell us a little about the project'),
    })
    .check((ctx) => {
      const data = ctx.value
      if (!isHandoff && data.garmentCategory === 'Other' && !data.garmentCategoryOther?.trim()) {
        ctx.issues.push({
          code: 'custom',
          message: 'Tell us your garment category',
          path: ['garmentCategoryOther'],
          input: data.garmentCategoryOther,
        })
      }
      if (!isHandoff && data.quantityRange === 'Custom' && !data.quantityCustom?.trim()) {
        ctx.issues.push({
          code: 'custom',
          message: 'Tell us your approximate quantity',
          path: ['quantityCustom'],
          input: data.quantityCustom,
        })
      }
    })
}

function QuotePage() {
  const [searchParams] = useSearchParams()
  const [designs, setDesigns] = useState(() => readQuoteDesigns())
  const [excludedDesignIds, setExcludedDesignIds] = useState(() => new Set())
  const [file, setFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [firstName, setFirstName] = useState('')

  const isHandoff = designs !== null

  const initialService = useMemo(() => {
    const requested = searchParams.get('service')
    return SERVICES.find((s) => s.slug === requested)?.slug ?? ''
  }, [searchParams])

  // Prefills from a cart handoff (CartDrawer's "Request Bulk Quote" link, see
  // COLLECTIONS_DESIGN_PLAN.md §6) or any other `/quote?details=` deep link — same
  // one-directional query-param pattern as the Heritage per-service quote links.
  const initialDetails = useMemo(() => searchParams.get('details') ?? '', [searchParams])

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(buildQuoteSchema(isHandoff)),
    defaultValues: { service: initialService, details: initialDetails },
  })

  const service = watch('service')
  const garmentCategory = watch('garmentCategory')
  const quantityRange = watch('quantityRange')

  function updateDesignQty(id, nextQty) {
    setDesigns((prev) => prev.map((d) => (d.id === id ? { ...d, qty: nextQty } : d)))
  }

  function toggleDesignIncluded(id) {
    setExcludedDesignIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleFiles(fileList) {
    const picked = fileList?.[0]
    if (picked) setFile(picked)
  }

  const onSubmit = async (data) => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    setFirstName(data.name.trim().split(' ')[0])
    if (isHandoff) clearQuoteDesigns()
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <>
        <Nav isScrolled />
        <main className="bg-paper min-h-[70vh] flex items-center justify-center px-8 pt-32 pb-24">
          <motion.div
            className="max-w-md text-center"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
          >
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-moss/15 text-moss mb-6">
              <Check size={22} strokeWidth={2} />
            </span>
            <h1 className="font-display text-3xl md:text-4xl text-pine mb-3">Request received</h1>
            <p className="font-body text-pine-soft mb-10">
              Thank you, {firstName}. Our team will review your enquiry and respond within 24
              hours.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6">
              <Link
                to="/"
                className="inline-flex items-center gap-2 font-body text-sm text-pine hover:text-moss transition-colors"
              >
                <ArrowLeft size={14} strokeWidth={1.5} /> Return home
              </Link>
              <Link
                to="/atelier"
                className="inline-flex items-center gap-2 font-body text-sm text-pine hover:text-moss transition-colors"
              >
                Explore the Atelier <ArrowRight size={14} strokeWidth={1.5} />
              </Link>
            </div>
          </motion.div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Nav isScrolled />

      <main className="bg-paper">
        <section className="px-8 pt-48 pb-12">
          <motion.div
            className="max-w-[1440px] mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={fadeUp}
          >
            <span className="block font-body text-xs tracking-[0.18em] uppercase text-moss mb-4">
              Request a Quote
            </span>
            <h1 className="font-display text-4xl md:text-5xl text-pine mb-4">
              Tell us what you&rsquo;re making.
            </h1>
            {isHandoff && (
              <Link
                to="/atelier"
                className="inline-flex items-center gap-2 font-body text-sm text-pine-soft hover:text-moss transition-colors mt-6"
              >
                <ArrowLeft size={14} strokeWidth={1.5} /> Back to Atelier
              </Link>
            )}
          </motion.div>
        </section>

        <section className="px-8 pb-20">
          <motion.form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="max-w-[1440px] mx-auto border border-pine/15"
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={fadeUp}
          >
            <div className="grid lg:grid-cols-2">
              {/* Your Details */}
              <div className="p-8 md:p-12">
                <h2 className="font-display text-xl text-pine mb-6">Your Details</h2>

                <div className="space-y-5">
                  <div>
                    <label className={labelClass} htmlFor="name">
                      Name
                    </label>
                    <input
                      id="name"
                      className={inputClass}
                      type="text"
                      autoComplete="name"
                      {...register('name')}
                    />
                    {errors.name && <p className={errorClass}>{errors.name.message}</p>}
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="email">
                      Email
                    </label>
                    <input
                      id="email"
                      className={inputClass}
                      type="email"
                      autoComplete="email"
                      {...register('email')}
                    />
                    {errors.email && <p className={errorClass}>{errors.email.message}</p>}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass} htmlFor="company">
                        Company
                      </label>
                      <input
                        id="company"
                        className={inputClass}
                        type="text"
                        autoComplete="organization"
                        {...register('company')}
                      />
                      {errors.company && <p className={errorClass}>{errors.company.message}</p>}
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="phone">
                        Phone <span className="normal-case text-pine-soft/70">(optional)</span>
                      </label>
                      <input
                        id="phone"
                        className={inputClass}
                        type="tel"
                        autoComplete="tel"
                        {...register('phone')}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Your Project */}
              <div className="p-8 md:p-12 bg-bone border-t lg:border-t-0 lg:border-l border-pine/15">
                <h2 className="font-display text-xl text-pine mb-6">Your Project</h2>

                <div className="space-y-6">
                  {isHandoff ? (
                    <div>
                      <span className={labelClass}>Designs from the Atelier</span>
                      <div className="space-y-3">
                        {designs.map((d) => {
                          const included = !excludedDesignIds.has(d.id)
                          return (
                            <div
                              key={d.id}
                              className={`flex items-center gap-3 border border-pine/15 bg-paper p-3 transition-opacity ${
                                included ? '' : 'opacity-50'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => toggleDesignIncluded(d.id)}
                                aria-pressed={included}
                                aria-label={
                                  included
                                    ? `Exclude ${d.garmentLabel} from quote`
                                    : `Include ${d.garmentLabel} in quote`
                                }
                                className={`w-4 h-4 shrink-0 border flex items-center justify-center transition-colors ${
                                  included ? 'bg-pine border-pine' : 'border-pine/25'
                                }`}
                              >
                                {included && <Check size={11} strokeWidth={2.5} className="text-bone" />}
                              </button>
                              <div className="w-14 h-14 shrink-0 border border-pine/10 overflow-hidden bg-bone relative">
                                <GarmentMockup2D
                                  garment={d.garment}
                                  side="front"
                                  colour={d.colourHex}
                                  pattern={d.patternThumb}
                                  patternOpacity={d.patternOpacity}
                                />
                                {d.assetThumb && (
                                  <img
                                    src={d.assetThumb}
                                    alt=""
                                    className="absolute inset-0 w-full h-full object-contain p-2.5 pointer-events-none"
                                  />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-body text-sm text-pine truncate">
                                  {d.garmentLabel} · {d.fabricLabel} · {d.colourLabel}
                                </p>
                                <p className="font-body text-xs text-pine-soft">
                                  {d.hasPattern ? 'Custom pattern · ' : ''}
                                  {d.layerCount > 0
                                    ? `${d.layerCount} artwork element${d.layerCount > 1 ? 's' : ''}`
                                    : 'No artwork yet'}
                                </p>
                              </div>
                              <QtyStepper
                                value={d.qty}
                                onChange={(v) => updateDesignQty(d.id, v)}
                                min={10}
                                max={5000}
                                step={10}
                                disabled={!included}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span className={labelClass}>Service</span>
                        <div
                          className="grid grid-cols-2 gap-2"
                          role="group"
                          aria-label="Service"
                        >
                          {SERVICES.map((s) => (
                            <label key={s.slug} className={pillButton(service === s.slug)}>
                              <input
                                type="radio"
                                value={s.slug}
                                className="sr-only"
                                {...register('service')}
                              />
                              {s.label}
                            </label>
                          ))}
                        </div>
                        {errors.service && <p className={errorClass}>{errors.service.message}</p>}
                      </div>

                      <div>
                        <span className={labelClass}>Garment Category</span>
                        <div
                          className="grid grid-cols-2 gap-2"
                          role="group"
                          aria-label="Garment category"
                        >
                          {GARMENT_CATEGORIES.map((category) => (
                            <label
                              key={category}
                              className={pillButton(garmentCategory === category)}
                            >
                              <input
                                type="radio"
                                value={category}
                                className="sr-only"
                                {...register('garmentCategory')}
                              />
                              {category}
                            </label>
                          ))}
                        </div>
                        {errors.garmentCategory && (
                          <p className={errorClass}>{errors.garmentCategory.message}</p>
                        )}
                        {garmentCategory === 'Other' && (
                          <>
                            <input
                              className={`${inputClass} mt-2`}
                              type="text"
                              placeholder="Tell us the category"
                              aria-label="Garment category (other)"
                              {...register('garmentCategoryOther')}
                            />
                            {errors.garmentCategoryOther && (
                              <p className={errorClass}>{errors.garmentCategoryOther.message}</p>
                            )}
                          </>
                        )}
                      </div>

                      <div>
                        <span className={labelClass}>Approximate Quantity</span>
                        <div
                          className="grid grid-cols-2 gap-2"
                          role="group"
                          aria-label="Approximate quantity"
                        >
                          {QUANTITY_RANGES.map((range) => (
                            <label key={range} className={pillButton(quantityRange === range)}>
                              <input
                                type="radio"
                                value={range}
                                className="sr-only"
                                {...register('quantityRange')}
                              />
                              {range}
                            </label>
                          ))}
                        </div>
                        {errors.quantityRange && (
                          <p className={errorClass}>{errors.quantityRange.message}</p>
                        )}
                        {quantityRange === 'Custom' && (
                          <>
                            <input
                              className={`${inputClass} mt-2`}
                              type="text"
                              inputMode="numeric"
                              placeholder="Approximate number of units"
                              aria-label="Approximate quantity (custom)"
                              {...register('quantityCustom')}
                            />
                            {errors.quantityCustom && (
                              <p className={errorClass}>{errors.quantityCustom.message}</p>
                            )}
                          </>
                        )}
                      </div>
                    </>
                  )}

                  <div>
                    <label className={labelClass} htmlFor="deadline">
                      Deadline <span className="normal-case text-pine-soft/70">(optional)</span>
                    </label>
                    <input
                      id="deadline"
                      className={inputClass}
                      type="date"
                      {...register('deadline')}
                    />
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="details">
                      Project Details
                    </label>
                    <textarea
                      id="details"
                      rows={4}
                      className={inputClass}
                      {...register('details')}
                    />
                    {errors.details && <p className={errorClass}>{errors.details.message}</p>}
                  </div>

                  <div>
                    <span className={labelClass}>
                      Artwork file <span className="normal-case text-pine-soft/70">(optional)</span>
                    </span>
                    <div
                      onDragOver={(e) => {
                        e.preventDefault()
                        setDragActive(true)
                      }}
                      onDragLeave={() => setDragActive(false)}
                      onDrop={(e) => {
                        e.preventDefault()
                        setDragActive(false)
                        handleFiles(e.dataTransfer.files)
                      }}
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
                          <span className="font-body text-sm text-pine truncate max-w-[220px]">
                            {file.name}
                          </span>
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
                          <p className="font-body text-xs text-pine-soft mt-1">
                            PNG, JPG, PDF, AI or PSD
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 md:p-12 border-t border-pine/15 flex flex-wrap items-center gap-4">
              <button type="submit" disabled={isSubmitting} className={filledButton}>
                {isSubmitting ? 'Sending…' : 'Get a Quote'}
              </button>
              <span className="font-body text-xs text-pine-soft">
                No obligation. We reply within 24 hours.
              </span>
            </div>
          </motion.form>
        </section>

        <section className="px-8 pb-20">
          <motion.div
            className="max-w-[1440px] mx-auto border-t border-pine/15 pt-8 flex flex-wrap items-center justify-between gap-4"
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={fadeUp}
          >
            <p className="font-body text-sm text-pine-soft">
              Need precise pricing? Use our interactive calculator to see per-unit costs
              instantly.
            </p>
            <Link to="/pricing" className={outlineButton}>
              See Pricing <ArrowRight size={14} strokeWidth={1.5} />
            </Link>
          </motion.div>
        </section>
      </main>

      <Footer />
    </>
  )
}

export default QuotePage
