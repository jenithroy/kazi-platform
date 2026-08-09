'use client'

import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { Nav } from '../../components/Nav/Nav'
import { Footer } from '../../components/Footer/Footer'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

const viewport = { once: true, margin: '-80px' }

const outlineButtonSmall =
  'inline-flex items-center gap-2 justify-center h-9 px-4 border border-moss text-pine font-body text-xs font-semibold tracking-wide hover:bg-moss hover:text-pine transition-colors duration-150'

// Placeholder editorial content — the old site's posts referenced a different supply chain
// (Dhaka, not Kathmandu) and aren't usable as-is. These six headlines (one per category) are
// written fresh to fit Kazi's own context but are still stand-ins for real posts — this section
// plans the page shell only (see PAGES_DESIGN_PLAN.md §4.2 and §7.7).
const FEATURED_POST = {
  category: 'Sustainability',
  title: 'Inside our zero-waste cutting room',
  excerpt:
    "How a marker-planning discipline most factories skip keeps offcuts out of Kathmandu's landfills — and what it costs us to hold that line at scale.",
  date: '3 Feb 2026',
  readTime: '6 min read',
}

const POSTS = [
  {
    category: 'Artisans',
    title: 'Meet the hand-finishers behind every seam',
    excerpt:
      'The finishing team spends longer on a single garment than most factories spend on ten. Three of them on what that patience actually looks like, day to day.',
    date: '14 Jan 2026',
    readTime: '5 min read',
  },
  {
    category: 'Process',
    title: 'From tech pack to bulk: how a garment moves through Kazi',
    excerpt:
      'A single hoodie order, traced start to finish — sampling, pattern grading, cutting, sewing, QC — through the same floor every order actually travels.',
    date: '22 Dec 2025',
    readTime: '8 min read',
  },
  {
    category: 'Design',
    title: 'Why we still pattern-cut by hand',
    excerpt:
      "Automated cutters are faster. Here's the case our senior pattern-maker makes for why the slower, human version still wins on fit for small-batch runs.",
    date: '9 Dec 2025',
    readTime: '4 min read',
  },
  {
    category: 'Impact',
    title: 'What fair wage actually means on our factory floor',
    excerpt:
      'Fair wage guarantees are easy to print on a certification badge. Harder to explain is how the number gets set, and who checks it every quarter.',
    date: '18 Nov 2025',
    readTime: '7 min read',
  },
  {
    category: 'Community',
    title: "Kathmandu's next generation of tailors",
    excerpt:
      'Inside the apprenticeship program that trains new hand-finishers alongside the tailors who taught themselves the trade a generation earlier.',
    date: '2 Nov 2025',
    readTime: '5 min read',
  },
]

const newsletterSchema = z.object({
  email: z.email('Enter a valid email'),
})

function NewsletterStrip() {
  const [subscribed, setSubscribed] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(newsletterSchema) })

  const onSubmit = async () => {
    await new Promise((resolve) => setTimeout(resolve, 400))
    setSubscribed(true)
  }

  return (
    <section className="border-t border-pine/15 bg-bone">
      <motion.div
        className="max-w-[1440px] mx-auto px-8 py-16 md:py-20 flex flex-col md:flex-row md:items-center md:justify-between gap-6"
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
        variants={fadeUp}
      >
        <div>
          <h2 className="font-display text-2xl md:text-3xl text-pine mb-1">
            Stories, straight to your inbox.
          </h2>
          <p className="font-body text-pine-soft">
            One email a month. No noise, no sales pitch.
          </p>
        </div>

        {subscribed ? (
          <div className="flex items-center gap-2.5 font-body text-sm text-pine">
            <Check size={16} strokeWidth={2} className="text-moss shrink-0" />
            You&rsquo;re subscribed.
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="w-full md:w-auto"
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="sm:w-72">
                <input
                  type="email"
                  placeholder="you@brand.com"
                  aria-label="Email address"
                  autoComplete="email"
                  className="w-full border border-pine/15 bg-paper px-3.5 py-2.5 font-body text-sm text-pine focus:outline-none focus:border-pine transition-colors"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="font-body text-xs text-red-600 mt-1">{errors.email.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center h-11 px-6 bg-moss text-pine font-body text-sm font-semibold tracking-wide hover:bg-moss-deep transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
              >
                {isSubmitting ? 'Subscribing…' : 'Subscribe'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </section>
  )
}

function StoriesPage() {
  return (
    <>
      <Nav isScrolled />

      <main className="bg-paper">
        {/* Header */}
        <section className="px-8 pt-48 pb-12">
          <motion.div
            className="max-w-[1440px] mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={fadeUp}
          >
            <span className="block font-body text-xs tracking-[0.18em] uppercase text-moss mb-4">
              Stories
            </span>
            <h1 className="font-display text-4xl md:text-5xl text-pine max-w-2xl">
              Behind every garment is a process, a person, and a choice.
            </h1>
          </motion.div>
        </section>

        {/* Featured post */}
        <section className="px-8 pb-16 md:pb-20">
          <motion.article
            className="max-w-[1440px] mx-auto grid md:grid-cols-2 border border-pine/15"
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={fadeUp}
          >
            <div className="relative bg-pine min-h-[280px] md:min-h-[420px] flex items-end p-8">
              <span className="font-body text-xs tracking-[0.18em] uppercase text-bone/70">
                {FEATURED_POST.category}
              </span>
            </div>
            <div className="p-8 md:p-12 flex flex-col justify-center bg-bone">
              <span className="font-body text-xs tracking-[0.12em] uppercase text-moss mb-4">
                Featured
              </span>
              <h2 className="font-display text-2xl md:text-3xl text-pine mb-4 leading-tight">
                {FEATURED_POST.title}
              </h2>
              <p className="font-body text-pine-soft leading-relaxed mb-6 max-w-md">
                {FEATURED_POST.excerpt}
              </p>
              <p className="font-mono text-xs text-pine-soft tracking-wide mb-6">
                {FEATURED_POST.date} · {FEATURED_POST.readTime}
              </p>
              <button type="button" className={`${outlineButtonSmall} self-start`}>
                Read Story <ArrowRight size={14} strokeWidth={1.5} />
              </button>
            </div>
          </motion.article>
        </section>

        {/* Grid */}
        <section className="px-8 pb-20 md:pb-24">
          <motion.div
            className="max-w-[1440px] mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10"
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
          >
            {POSTS.map((post) => (
              <motion.article key={post.title} variants={fadeUp}>
                <span className="block font-body text-xs tracking-[0.12em] uppercase text-moss mb-3">
                  {post.category}
                </span>
                <h3 className="font-display text-xl text-pine mb-3 leading-snug">
                  {post.title}
                </h3>
                <p className="font-body text-sm text-pine-soft leading-relaxed line-clamp-3 mb-4">
                  {post.excerpt}
                </p>
                <p className="font-mono text-xs text-pine-soft tracking-wide">
                  {post.date} · {post.readTime}
                </p>
              </motion.article>
            ))}
          </motion.div>
        </section>

        <NewsletterStrip />
      </main>

      <Footer />
    </>
  )
}

export default StoriesPage
