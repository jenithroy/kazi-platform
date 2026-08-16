'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Check } from 'lucide-react'
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
const outlineButtonSmall =
  'inline-flex items-center justify-center h-9 px-4 border border-moss text-pine font-body text-xs font-semibold tracking-wide hover:bg-moss hover:text-pine transition-colors duration-150'

// Content is the old site's placeholder service catalogue, not verified Kazi capability —
// confirm which of these Kazi actually offers, and get real specs/pricing before ship
// (see PAGES_DESIGN_PLAN.md §1.2 and §7.1).
const SERVICES = [
  {
    code: 'SVC-01',
    title: 'Custom Manufacturing',
    slug: 'custom-manufacturing',
    ctaLabel: 'Get a Custom Manufacturing quote',
    tagline: 'Full garment production from your designs',
    description:
      'From tech pack to finished collection — pattern-making, sampling and bulk production handled inside a single Kathmandu atelier.',
    specs: [
      'Min. 50 units',
      'All fabric weights',
      'GOTS-certified cotton available',
      'Lead time 6–10 weeks',
    ],
  },
  {
    code: 'SVC-02',
    title: 'Direct-to-Garment (DTG)',
    slug: 'dtg',
    ctaLabel: 'Get a DTG quote',
    tagline: 'Full-colour photo-quality prints',
    description:
      'Digital printing straight onto the finished garment — no minimums, no colour limits, soft to the touch.',
    specs: [
      'No minimum per design',
      'Full CMYK + spot colours',
      'Soft hand-feel finish',
      'Wash-tested 40+ cycles',
    ],
  },
  {
    code: 'SVC-03',
    title: 'Screen Printing',
    slug: 'screen-printing',
    ctaLabel: 'Get a Screen Printing quote',
    tagline: 'High-volume precision brand graphics',
    description:
      'The workhorse for bulk runs — sharp spot-colour graphics at a per-unit cost that keeps dropping as volume climbs.',
    specs: [
      'From 50 units/design',
      'Up to 6 spot colours',
      'Eco water-based inks only',
      'Price breaks at 250/500/1000',
    ],
  },
  {
    code: 'SVC-04',
    title: 'Embroidery',
    slug: 'embroidery',
    ctaLabel: 'Get an Embroidery quote',
    tagline: 'Textural branding for premium pieces',
    description:
      'Stitched logos and wordmarks for a finish that reads as premium the moment someone touches the garment.',
    specs: [
      'Small from £2.50/unit',
      'Large from £4.00/unit',
      'Digitising included',
      'Metallic threads available',
    ],
  },
  {
    code: 'SVC-05',
    title: 'Direct-to-Film (DTF)',
    slug: 'dtf',
    ctaLabel: 'Get a DTF quote',
    tagline: 'Transfer prints on any fabric',
    description:
      'Printed to film, then heat-pressed on — works on fabrics and colours other print methods struggle with.',
    specs: [
      'Works on any fabric',
      'No minimum order',
      'Ideal for dark garments',
      'Edge-to-edge possible',
    ],
  },
]

// Labels only in the old mega-menu — descriptions below are placeholder, written to match
// the page's tone, and need replacing with Kazi's actual process once confirmed (§1.3, §7.2).
const SUPPLY_CHAIN_STEPS = [
  {
    label: 'Raw Material Sourcing',
    description: 'GOTS-certified cotton and recycled fibres sourced directly from vetted Nepali suppliers.',
  },
  {
    label: 'Fabric Production',
    description: 'Yarn spun, knitted or woven, then dyed in small batches to your exact spec.',
  },
  {
    label: 'Cutting & Sewing',
    description: 'Patterns cut for minimal waste, garments sewn and hand-finished by our core tailoring team.',
  },
  {
    label: 'Quality Control',
    description: "Every unit checked against your tech pack before it's cleared for packing.",
  },
  {
    label: 'Finishing & Packing',
    description: 'Pressed, tagged and packed ready for freight or air to the UK.',
  },
]

const SUSTAINABILITY_CLAIMS = [
  'GOTS Certification',
  'Organic & Recycled Fabrics',
  'Water-Based Inks',
  'Zero-Waste Cutting',
  'Fair Wage Guarantee',
]

function HeritagePage() {
  return (
    <>
      <Nav isScrolled />

      <main className="bg-paper">
        {/* What We Do — Services */}
        <section>
          <div className="max-w-[1440px] mx-auto px-8 pt-48">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={viewport}
              variants={fadeUp}
            >
              <span className="block font-body text-xs tracking-[0.18em] uppercase text-moss mb-4">
                What We Do
              </span>
              <h2 className="font-display text-3xl md:text-4xl text-pine max-w-2xl">
                Five ways we bring your designs to life.
              </h2>
            </motion.div>
          </div>

          <div className="max-w-[1440px] mx-auto px-8">
            {SERVICES.map((service, index) => (
              <motion.div
                key={service.code}
                className={`grid md:grid-cols-2 gap-8 md:gap-16 py-12 md:py-16 ${
                  index > 0 ? 'border-t border-pine/15' : ''
                }`}
                initial="hidden"
                whileInView="visible"
                viewport={viewport}
                variants={fadeUp}
              >
                <div>
                  <span className="font-body font-medium text-xs text-moss tracking-[0.1em]">
                    {service.code}
                  </span>
                  <h3 className="font-display text-2xl md:text-3xl text-pine mt-2 mb-2">
                    {service.title}
                  </h3>
                  <p className="font-body text-pine-soft mb-4">{service.tagline}</p>
                  <p className="font-body text-pine-soft leading-relaxed mb-6 max-w-md">
                    {service.description}
                  </p>
                  <Link href={`/quote?service=${service.slug}`} className={outlineButtonSmall}>
                    {service.ctaLabel}
                  </Link>
                </div>

                <div className="bg-bone border border-pine/10 p-6 md:p-8 self-start">
                  <ul className="space-y-3">
                    {service.specs.map((spec) => (
                      <li key={spec} className="flex items-start gap-2.5 font-body text-sm text-pine">
                        <Check size={16} strokeWidth={2} className="text-moss shrink-0 mt-0.5" />
                        {spec}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How a Garment Moves — Supply Chain */}
        <section className="border-t border-pine/15 py-16 md:py-20">
          <div className="max-w-[1440px] mx-auto px-8">
            <motion.div
              className="mb-12"
              initial="hidden"
              whileInView="visible"
              viewport={viewport}
              variants={fadeUp}
            >
              <span className="block font-body text-xs tracking-[0.18em] uppercase text-moss mb-4">
                How a Garment Moves
              </span>
              <h2 className="font-display text-3xl md:text-4xl text-pine max-w-2xl">
                From raw fibre to finished, packed collection.
              </h2>
            </motion.div>

            <motion.ol
              className="grid gap-8 md:grid-cols-5 md:gap-6"
              initial="hidden"
              whileInView="visible"
              viewport={viewport}
            >
              {SUPPLY_CHAIN_STEPS.map((step, index) => (
                <motion.li key={step.label} variants={fadeUp}>
                  <span className="block font-body font-medium text-sm text-moss tracking-[0.06em] tabular-nums mb-3">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="font-display text-lg text-pine mb-2">{step.label}</h3>
                  <p className="font-body text-sm text-pine-soft leading-relaxed">
                    {step.description}
                  </p>
                </motion.li>
              ))}
            </motion.ol>
          </div>
        </section>

        {/* Certified & Accountable — Sustainability */}
        <section className="border-t border-pine/15 py-16 bg-bone">
          <motion.div
            className="max-w-[1440px] mx-auto px-8 text-center"
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={fadeUp}
          >
            <span className="block font-body text-xs tracking-[0.18em] uppercase text-moss mb-4">
              Certified & Accountable
            </span>
            <p className="font-body text-sm md:text-base text-pine-soft tracking-wide">
              {SUSTAINABILITY_CLAIMS.join('  ·  ')}
            </p>
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
              Not sure which service fits your project?
            </h2>
            <p className="font-body text-pine-soft mb-8">
              Describe it and we&rsquo;ll recommend the right combination for your brief.
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

export default HeritagePage
