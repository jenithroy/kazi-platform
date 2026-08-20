'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Captions,
  Film,
  Layers,
  Palette,
  ShoppingBag,
  Sparkles,
} from 'lucide-react'
import { Nav } from '../../components/Nav/Nav'
import { Footer } from '../../components/Footer/Footer'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

const viewport = { once: true, margin: '-80px' }

const filledButton =
  'inline-flex items-center gap-2 justify-center h-11 px-6 bg-pine text-bone font-body text-sm font-semibold tracking-wide hover:bg-pine-soft transition-colors duration-150'
const outlineButton =
  'inline-flex items-center gap-2 justify-center h-11 px-6 border border-pine text-pine font-body text-sm font-semibold tracking-wide hover:bg-pine hover:text-bone transition-colors duration-150'

// Placeholder service copy for the editing studio — structurally what Kazi offers alongside
// manufacturing, but the turnaround windows and inclusions below are stand-ins until Kazi
// confirms the studio's real capacity.
//
// Every photo on this page is borrowed from the existing landing-page set (production floor
// and product shots) — they stand in for real showreel frames until the studio has its own
// stills. Same reason the "showreel" tiles are static images with a play affordance rather
// than embedded players: there's no footage to link to yet.
const SERVICES = [
  {
    icon: ShoppingBag,
    title: 'Product & PDP video',
    body: 'Clean, on-white and on-model cuts built for your product pages — every angle, drape and stitch detail edited to the same grade as your stills.',
  },
  {
    icon: Sparkles,
    title: 'Social cut-downs',
    body: 'One shoot, many edits. Vertical 9:16 for Reels and TikTok, 1:1 for feed, 16:9 for YouTube — reframed and paced for each platform, not just cropped.',
  },
  {
    icon: Film,
    title: 'Brand & campaign films',
    body: 'Longer-form storytelling for a drop, a collection or a season — narrative assembly, music, sound design and a final grade that holds up on a big screen.',
  },
  {
    icon: Layers,
    title: 'Motion graphics & titles',
    body: 'Typography, lower-thirds, size charts, fabric callouts and animated logo stings, all built in your own type and colour system.',
  },
  {
    icon: Palette,
    title: 'Colour grading & clean-up',
    body: 'Colour-accurate garments across every shot, plus retouching — stray threads, creases, background fixes — so the fabric on screen matches the fabric in the box.',
  },
  {
    icon: Captions,
    title: 'Captions & versioning',
    body: 'Burnt-in and SRT subtitles, sound-off-first edits, and regional versions with swapped pricing, language or end cards for each market you sell into.',
  },
]

const REEL = [
  {
    video: 'studio-reel.mp4',
    label: 'Campaign film',
    caption: 'AW collection launch',
  },
  {
    video: 'newtonian-trap.mp4',
    label: 'Behind the seams',
    caption: 'Sampling room, Kathmandu',
  },
  {
    video: 'marketing-story.mp4',
    label: 'Product reel',
    caption: 'Knitwear PDP set',
  },
]

const FORMATS = [
  { ratio: '16:9', use: 'YouTube & site hero', className: 'aspect-video' },
  { ratio: '4:5', use: 'Instagram feed', className: 'aspect-[4/5]' },
  { ratio: '9:16', use: 'Reels, TikTok, Shorts', className: 'aspect-[9/16]' },
]

const PROCESS = [
  {
    step: '01',
    title: 'Brief',
    body: 'You send footage and references — a shoot, phone clips, or our own factory-floor coverage. We agree deliverables, formats and tone before a single cut.',
  },
  {
    step: '02',
    title: 'First cut',
    body: 'You get a watermarked review link with timestamped comments. No file wrangling, no version confusion — one link, one thread.',
  },
  {
    step: '03',
    title: 'Revisions',
    body: 'Two rounds are included on every project. We work through your notes in order and re-post to the same link, so the history stays in one place.',
  },
  {
    step: '04',
    title: 'Delivery',
    body: 'Final masters plus every platform export you need, delivered with the source project files so nothing about your footage stays locked to us.',
  },
]

const DELIVERABLES = [
  ['Ratios', '16:9, 9:16, 4:5, 1:1'],
  ['Resolution', 'Up to 4K, 25 / 30 / 60 fps'],
  ['Formats', 'ProRes master + H.264 web'],
  ['Captions', 'Burnt-in and .SRT'],
  ['Revisions', '2 rounds included'],
  ['Turnaround', '3–7 working days'],
]

const FAQS = [
  {
    q: 'Do I have to manufacture with Kazi to use the editing studio?',
    a: 'No — the studio takes on standalone editing work for clothing brands. That said, most of our clients are brands already producing with us: the team knows the garments, so the edit gets the fabric and the fit right first time.',
  },
  {
    q: "What if I don't have footage yet?",
    a: 'We can film it. Our team covers the production floor in Kathmandu — cutting, stitching, hand-finishing, QC — which gives you genuine behind-the-scenes material about your own order rather than stock library clips.',
  },
  {
    q: 'How do I send you large files?',
    a: 'Any of the usual routes: a shared drive link, WeTransfer, Frame.io, or a direct upload we set up for you. Raw camera files are welcome — we would far rather grade from the original than from a compressed export.',
  },
  {
    q: 'Can you match our existing brand guidelines?',
    a: 'Yes. Send your type, colour and logo assets with the brief and we build the motion system against them, so new edits sit alongside your existing content instead of looking borrowed.',
  },
  {
    q: 'How is editing priced?',
    a: 'Per project — based on runtime, the number of deliverables and how much source footage there is. Tell us the scope on the quote form and you get a fixed figure back. No hourly meter.',
  },
]

function imageSrc(file) {
  return `/landing%20page%20images/${file}`
}

function videoSrc(file) {
  return `/videos/${file}`
}

function VideoEditingPage() {
  return (
    <>
      <Nav isScrolled />

      <main className="bg-paper">
        {/* Header */}
        <section className="px-8 pt-40 md:pt-48 pb-16 md:pb-20">
          <motion.div
            className="max-w-[1440px] mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-center"
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
          >
            <motion.div variants={fadeUp}>
              <span className="block font-body text-xs tracking-[0.18em] uppercase text-moss mb-4">
                Also from Kazi
              </span>
              <h1 className="font-display text-4xl md:text-5xl text-pine leading-tight">
                We edit video, too.
              </h1>
              <p className="font-body text-lg text-pine-soft leading-relaxed max-w-xl mt-6">
                Alongside the factory floor, Kazi runs a small in-house editing studio for the
                brands we manufacture for. Product videos, campaign films and social cut-downs —
                made by people who already know how your garments are built.
              </p>
              <div className="flex flex-wrap gap-3 mt-8">
                <Link href="/quote" className={filledButton}>
                  Get an editing quote <ArrowRight size={14} strokeWidth={1.5} />
                </Link>
                <a href="#showreel" className={outlineButton}>
                  See the work
                </a>
              </div>
            </motion.div>

            <motion.figure className="relative group" variants={fadeUp}>
              <video
                src={videoSrc('studio-hero.mov')}
                autoPlay
                muted
                loop
                playsInline
                className="w-full aspect-[4/3] lg:aspect-[5/4] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-pine/55 via-pine/5 to-transparent" />
              <figcaption className="absolute left-0 bottom-0 p-6 font-body text-sm text-bone/90">
                Studio reel — 2026
              </figcaption>
            </motion.figure>
          </motion.div>
        </section>

        {/* Showreel */}
        <section id="showreel" className="border-t border-pine/15 bg-bone px-8 py-20 md:py-24">
          <motion.div
            className="max-w-[1440px] mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
          >
            <motion.div
              className="flex flex-wrap items-end justify-between gap-4 mb-10"
              variants={fadeUp}
            >
              <h2 className="font-display text-2xl md:text-3xl text-pine max-w-xl">
                A few things we&rsquo;ve cut
              </h2>
              <span className="font-body text-xs tracking-[0.12em] uppercase text-pine-soft">
                Selected work
              </span>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {REEL.map((item) => (
                <motion.figure key={item.video} className="group" variants={fadeUp}>
                  <div className="relative overflow-hidden">
                    <video
                      src={videoSrc(item.video)}
                      autoPlay
                      muted
                      loop
                      playsInline
                      aria-label={`${item.label} — ${item.caption}`}
                      className="w-full aspect-[9/16] object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-pine/25 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </div>
                </motion.figure>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Services */}
        <section className="px-8 py-20 md:py-24">
          <motion.div
            className="max-w-[1440px] mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
          >
            <motion.h2
              className="font-display text-2xl md:text-3xl text-pine mb-10 max-w-xl"
              variants={fadeUp}
            >
              What the studio takes on
            </motion.h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-pine/15 border border-pine/15">
              {SERVICES.map(({ icon: Icon, title, body }) => (
                <motion.article key={title} className="bg-bone p-8" variants={fadeUp}>
                  <Icon size={22} strokeWidth={1.5} className="text-moss mb-5" />
                  <h3 className="font-display text-xl text-pine mb-3 leading-snug">{title}</h3>
                  <p className="font-body text-sm text-pine-soft leading-relaxed">{body}</p>
                </motion.article>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Formats */}
        <section className="border-t border-pine/15 bg-bone px-8 py-20 md:py-24">
          <motion.div
            className="max-w-[1440px] mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
          >
            <motion.div className="max-w-xl mb-10" variants={fadeUp}>
              <h2 className="font-display text-2xl md:text-3xl text-pine mb-4">
                One shoot, cut for every place it runs.
              </h2>
              <p className="font-body text-pine-soft leading-relaxed">
                Each platform gets its own edit — reframed around the garment, re-paced for how
                people actually watch there. Not one master squeezed into three boxes.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-3 gap-6 md:gap-8 items-end max-w-4xl">
              {FORMATS.map((format) => (
                <motion.figure key={format.ratio} variants={fadeUp}>
                  <div className="relative">
                    <img
                      src={imageSrc('collection-denim.jpg')}
                      alt={`${format.ratio} crop for ${format.use}`}
                      loading="lazy"
                      className={`w-full ${format.className} object-cover`}
                    />
                    <span className="absolute left-3 top-3 px-2 py-1 bg-bone/90 font-body text-xs font-medium tabular-nums text-pine">
                      {format.ratio}
                    </span>
                  </div>
                  <figcaption className="mt-3 font-body text-sm text-pine-soft">
                    {format.use}
                  </figcaption>
                </motion.figure>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Filming */}
        <section className="px-8 py-20 md:py-24">
          <motion.div
            className="max-w-[1440px] mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-center"
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
          >
            <motion.figure className="order-2 lg:order-1" variants={fadeUp}>
              <img
                src={imageSrc('heritage.jpg')}
                alt="Hand-finishing on the Kazi production floor"
                loading="lazy"
                className="w-full aspect-[4/3] object-cover"
              />
            </motion.figure>

            <motion.div className="order-1 lg:order-2" variants={fadeUp}>
              <span className="block font-body text-xs tracking-[0.18em] uppercase text-moss mb-4">
                No footage yet?
              </span>
              <h2 className="font-display text-2xl md:text-3xl text-pine mb-4">
                We can film it on the floor your order is made on.
              </h2>
              <p className="font-body text-pine-soft leading-relaxed max-w-md mb-6">
                Cutting, stitching, hand-finishing, QC, packing — filmed in Kathmandu while your
                run is in production. It gives you real provenance content about your own
                garments, not a stock library clip of somebody else&rsquo;s factory.
              </p>
              <Link href="/quote" className={outlineButton}>
                Book floor coverage <ArrowRight size={14} strokeWidth={1.5} />
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* Process */}
        <section className="border-t border-pine/15 bg-bone px-8 py-20 md:py-24">
          <motion.div
            className="max-w-[1440px] mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
          >
            <motion.h2
              className="font-display text-2xl md:text-3xl text-pine mb-10 max-w-xl"
              variants={fadeUp}
            >
              How an edit runs
            </motion.h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
              {PROCESS.map(({ step, title, body }) => (
                <motion.div key={step} className="border-t border-pine/15 pt-5" variants={fadeUp}>
                  <span className="block font-body text-sm font-medium tabular-nums tracking-[0.12em] text-moss mb-3">
                    {step}
                  </span>
                  <h3 className="font-display text-xl text-pine mb-3">{title}</h3>
                  <p className="font-body text-sm text-pine-soft leading-relaxed">{body}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Deliverables */}
        <section className="px-8 py-20 md:py-24">
          <motion.div
            className="max-w-[1440px] mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-start"
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
          >
            <motion.div variants={fadeUp}>
              <h2 className="font-display text-2xl md:text-3xl text-pine mb-4">
                Everything you need, in every format you sell in.
              </h2>
              <p className="font-body text-pine-soft leading-relaxed max-w-md">
                One project, one delivery — masters, platform exports, captions and the source
                files. You keep the lot, project files included, so another editor can pick up
                where we left off if you ever want them to.
              </p>
            </motion.div>

            <motion.dl
              className="grid sm:grid-cols-2 gap-px bg-pine/15 border border-pine/15"
              variants={fadeUp}
            >
              {DELIVERABLES.map(([label, value]) => (
                <div key={label} className="bg-bone p-6">
                  <dt className="font-body text-xs tracking-[0.12em] uppercase text-pine-soft mb-2">
                    {label}
                  </dt>
                  <dd className="font-body text-sm font-medium tabular-nums text-pine">{value}</dd>
                </div>
              ))}
            </motion.dl>
          </motion.div>
        </section>

        {/* FAQ */}
        <section className="border-t border-pine/15 bg-bone px-8 py-20 md:py-24">
          <motion.div
            className="max-w-[1440px] mx-auto grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-12 lg:gap-20"
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
          >
            <motion.h2 className="font-display text-2xl md:text-3xl text-pine" variants={fadeUp}>
              Questions brands ask us
            </motion.h2>

            <motion.div
              className="divide-y divide-pine/15 border-t border-pine/15"
              variants={fadeUp}
            >
              {FAQS.map(({ q, a }) => (
                <details key={q} className="group py-5">
                  <summary className="font-body text-base font-medium text-pine cursor-pointer list-none flex items-start justify-between gap-6">
                    {q}
                    <span
                      aria-hidden="true"
                      className="font-body text-moss shrink-0 transition-transform duration-150 group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="font-body text-sm text-pine-soft leading-relaxed mt-3 max-w-2xl">
                    {a}
                  </p>
                </details>
              ))}
            </motion.div>
          </motion.div>
        </section>

        {/* CTA */}
        <section className="relative isolate overflow-hidden px-8 py-20 md:py-24">
          <img
            src={imageSrc('process-bulk-production.jpg')}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="absolute inset-0 -z-10 w-full h-full object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-pine/90" />
          <motion.div
            className="max-w-[1440px] mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={fadeUp}
          >
            <div>
              <h2 className="font-display text-2xl md:text-3xl text-bone mb-2">
                Got footage sitting in a folder?
              </h2>
              <p className="font-body text-bone/75 max-w-md leading-relaxed">
                Tell us what you shot and where it needs to run. We&rsquo;ll come back with a
                scope, a fixed price and a delivery date.
              </p>
            </div>
            <Link
              href="/quote"
              className="inline-flex items-center gap-2 justify-center h-12 px-7 bg-moss text-pine font-body text-sm font-semibold tracking-wide hover:bg-moss-deep transition-colors duration-150 self-start md:self-auto"
            >
              Start a project <ArrowRight size={14} strokeWidth={1.5} />
            </Link>
          </motion.div>
        </section>
      </main>

      <Footer />
    </>
  )
}

export default VideoEditingPage
