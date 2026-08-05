import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { readQuoteDesigns, clearQuoteDesigns, describeQuoteDesigns } from '../../lib/quote-handoff'
import styles from './QuoteForm.module.css'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

const viewport = { once: true, margin: '-80px' }

const GARMENT_CATEGORIES = ['Knitwear', 'Outerwear', 'Denim', 'Accessories', 'Footwear', 'Other']

const ORDER_VOLUMES = [
  'Under 500 units',
  '500–2,000 units',
  '2,000–10,000 units',
  '10,000+ units',
  'Other',
]

const quoteSchema = z
  .object({
    name: z.string().trim().min(1, 'Enter your name'),
    company: z.string().trim().min(1, 'Enter your company name'),
    email: z.email('Enter a valid email'),
    phone: z.string().trim().optional(),
    garmentCategory: z.string().min(1, 'Choose a category'),
    garmentCategoryOther: z.string().trim().optional(),
    orderVolume: z.string().min(1, 'Choose an approximate volume'),
    orderVolumeOther: z.string().trim().optional(),
    message: z.string().trim().min(1, 'Tell us a little about the project'),
  })
  .check((ctx) => {
    const data = ctx.value
    if (data.garmentCategory === 'Other' && !data.garmentCategoryOther?.trim()) {
      ctx.issues.push({
        code: 'custom',
        message: 'Tell us your garment category',
        path: ['garmentCategoryOther'],
        input: data.garmentCategoryOther,
      })
    }
    if (data.orderVolume === 'Other' && !data.orderVolumeOther?.trim()) {
      ctx.issues.push({
        code: 'custom',
        message: 'Tell us your approximate order volume',
        path: ['orderVolumeOther'],
        input: data.orderVolumeOther,
      })
    }
  })

export function QuoteForm() {
  const [submitted, setSubmitted] = useState(false)
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(quoteSchema),
  })

  const garmentCategory = watch('garmentCategory')
  const orderVolume = watch('orderVolume')

  // A visitor who designed something in the Atelier and clicked "Get a Quote" there lands
  // here — carry their saved design(s) into the message field instead of making them
  // describe from scratch what they just built.
  useEffect(() => {
    const designs = readQuoteDesigns()
    if (!designs) return
    const intro = designs.length === 1 ? 'Design from the Atelier:' : 'Designs from the Atelier:'
    setValue('message', `${intro}\n${describeQuoteDesigns(designs)}\n\n`)
  }, [setValue])

  const onSubmit = async () => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    clearQuoteDesigns()
    setSubmitted(true)
  }

  return (
    <section id="quote" className={styles.quote}>
      <div className={styles.inner}>
        <motion.div
          className={styles.intro}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={fadeUp}
        >
          <span className={styles.eyebrow}>Request a Quote</span>
          <h2 className={styles.heading}>Tell us what you&rsquo;re making.</h2>
          <p className={styles.paragraph}>
            Share a few details about your brand and the run you have in mind. A
            member of our Kathmandu team will reply directly, no account or sales
            call required to get a first answer.
          </p>
        </motion.div>

        <motion.div
          className={styles.formCard}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={fadeUp}
        >
          {submitted ? (
            <div className={styles.success} role="status">
              <h3 className={styles.successHeading}>Thank you — quote request sent.</h3>
              <p className={styles.successBody}>
                We&rsquo;ve got your details. Expect a reply at the email you gave us
                within 24 hours.
              </p>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="name">
                    Name
                  </label>
                  <input
                    id="name"
                    className={styles.input}
                    type="text"
                    autoComplete="name"
                    {...register('name')}
                  />
                  {errors.name && <span className={styles.error}>{errors.name.message}</span>}
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="company">
                    Company Name
                  </label>
                  <input
                    id="company"
                    className={styles.input}
                    type="text"
                    autoComplete="organization"
                    {...register('company')}
                  />
                  {errors.company && (
                    <span className={styles.error}>{errors.company.message}</span>
                  )}
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    className={styles.input}
                    type="email"
                    autoComplete="email"
                    {...register('email')}
                  />
                  {errors.email && <span className={styles.error}>{errors.email.message}</span>}
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="phone">
                    Phone <span className={styles.optional}>(optional)</span>
                  </label>
                  <input
                    id="phone"
                    className={styles.input}
                    type="tel"
                    autoComplete="tel"
                    {...register('phone')}
                  />
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="garmentCategory">
                    Garment Category
                  </label>
                  <select
                    id="garmentCategory"
                    className={styles.select}
                    defaultValue=""
                    {...register('garmentCategory')}
                  >
                    <option value="" disabled>
                      Select a category
                    </option>
                    {GARMENT_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  {errors.garmentCategory && (
                    <span className={styles.error}>{errors.garmentCategory.message}</span>
                  )}
                  {garmentCategory === 'Other' && (
                    <>
                      <input
                        id="garmentCategoryOther"
                        className={styles.input}
                        type="text"
                        placeholder="Tell us the category"
                        aria-label="Garment category (other)"
                        {...register('garmentCategoryOther')}
                      />
                      {errors.garmentCategoryOther && (
                        <span className={styles.error}>
                          {errors.garmentCategoryOther.message}
                        </span>
                      )}
                    </>
                  )}
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="orderVolume">
                    Approximate Order Volume
                  </label>
                  <select
                    id="orderVolume"
                    className={styles.select}
                    defaultValue=""
                    {...register('orderVolume')}
                  >
                    <option value="" disabled>
                      Select a range
                    </option>
                    {ORDER_VOLUMES.map((volume) => (
                      <option key={volume} value={volume}>
                        {volume}
                      </option>
                    ))}
                  </select>
                  {errors.orderVolume && (
                    <span className={styles.error}>{errors.orderVolume.message}</span>
                  )}
                  {orderVolume === 'Other' && (
                    <>
                      <input
                        id="orderVolumeOther"
                        className={styles.input}
                        type="text"
                        inputMode="numeric"
                        placeholder="Approximate number of units"
                        aria-label="Approximate order volume (other)"
                        {...register('orderVolumeOther')}
                      />
                      {errors.orderVolumeOther && (
                        <span className={styles.error}>{errors.orderVolumeOther.message}</span>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="message">
                  Project Details
                </label>
                <textarea
                  id="message"
                  className={styles.textarea}
                  rows={4}
                  {...register('message')}
                />
                {errors.message && <span className={styles.error}>{errors.message.message}</span>}
              </div>

              <div className={styles.submitBlock}>
                <button type="submit" className={styles.submit} disabled={isSubmitting}>
                  {isSubmitting ? 'Sending…' : 'Get a Quote'}
                </button>
                <span className={styles.microcopy}>
                  No obligation. We reply within 24 hours.
                </span>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  )
}
