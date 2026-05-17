'use client';

import Navbar from '@/components/Navbar';
import Link from 'next/link';
import Image from 'next/image';

const services = [
  { title: 'T-Shirts & Basics', description: 'High-quality cotton and blended tees, from classic fits to modern cuts.', image: '/images/tshirts.jpg' },
  { title: 'Hoodies & Outerwear', description: 'Premium hoodies, sweatshirts, and jackets with custom branding.', image: '/images/factory-1.jpg' },
  { title: 'Embroidery & Print', description: 'Embroidery, screen printing, and DTG printing services.', image: '/images/embroidery.jpg' },
  { title: 'Private Label', description: 'Full private label service including custom tags and packaging.', image: '/images/factory-3.jpg' },
];

const steps = [
  { num: '01', title: 'Share your vision', text: 'Tell us about your brand, designs, and requirements. We\'ll discuss fabrics, techniques, and pricing to find the perfect fit.' },
  { num: '02', title: 'Sample & approve', text: 'We create samples for your review. Refine until they\'re perfect, then approve for production.' },
  { num: '03', title: 'Production & delivery', text: 'Manufactured with care, quality-checked at every stage, and shipped directly to your door.' },
];

const methods = [
  { title: 'DTG Printing', desc: 'Perfect for detailed designs and small runs', href: '/services/dtg' },
  { title: 'Embroidery', desc: 'Premium stitched designs that last', href: '/services/embroidery' },
  { title: 'Screen Printing', desc: 'Ideal for bulk orders and bold graphics', href: '/services/screen-printing' },
  { title: 'DTF Transfers', desc: 'Vibrant colors on any fabric type', href: '/services/dtf' },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-kazi-cream text-kazi-charcoal overflow-x-hidden">
      <Navbar />

      {/* ═══ HERO ═══ */}
      <section className="relative w-full h-screen min-h-[700px] bg-kazi-charcoal flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image src="/images/hero-bg.jpg" alt="Kazi Manufacturing" fill className="object-cover object-center" priority quality={100} />
        </div>
        <div className="relative z-10 text-center text-white px-6 w-full max-w-5xl mx-auto">
          <h1 className="font-sans text-4xl md:text-5xl lg:text-6xl font-normal leading-[1.1] animate-fade-in-up" style={{ animationFillMode: 'both' }}>
            Factory that <em style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400 }}>thinks</em> like a brand.
          </h1>
        </div>
      </section>

      {/* ═══ OUR MISSION ═══ */}
      <section className="bg-kazi-charcoal px-6 md:px-12 lg:px-20 py-20">
        <div className="max-w-[1200px] mx-auto flex flex-col lg:flex-row gap-16 lg:gap-32 items-start">
          <div className="lg:w-1/3 flex-shrink-0">
            <div className="w-10 h-px bg-white/30 mb-8" />
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.25em] text-white/40 mb-4">Our Mission</p>
            <h2 className="font-serif text-3xl md:text-4xl text-white leading-[1.2]">
              Crafted with purpose,<br />built for brands.
            </h2>
          </div>
          <div className="lg:w-2/3 space-y-8 pt-2">
            <p className="font-sans text-lg text-white/70 leading-relaxed">
              At Kazi Manufacturing, our mission is to bridge the gap between world-class garment production and the brands that need it most. We believe great clothing starts with an honest partnership — one built on transparency, craftsmanship, and a genuine understanding of what your brand stands for.
            </p>
            <p className="font-sans text-base text-white/50 leading-relaxed">
              Based in Kathmandu, Nepal, we combine generations of textile expertise with modern production standards to deliver custom apparel that meets the expectations of today's most discerning brands. From 50-unit runs to large-scale orders, every piece leaves our factory with the same attention to detail.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-4 border-t border-white/10">
              {[
                { value: 'Ethical', label: 'Fair wages & safe working conditions' },
                { value: 'Transparent', label: 'Clear pricing, no hidden costs' },
                { value: 'Precise', label: 'Quality-checked at every stage' },
              ].map(({ value, label }) => (
                <div key={value}>
                  <div className="font-sans text-lg font-semibold text-white mb-1">{value}</div>
                  <div className="font-sans text-xs text-white/50 leading-relaxed">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SHOP BY CATEGORY ═══ */}
      <section className="py-section-mobile md:py-section px-6 md:px-12 lg:px-20 bg-kazi-cream">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16">
            <p className="section-label">Shop Blanks</p>
            <h2 className="font-sans text-3xl md:text-4xl lg:text-[42px] font-normal leading-[1.2]">Browse by Category</h2>
            <p className="font-sans text-kazi-slate text-lg mt-4 max-w-xl mx-auto">
              Premium blank garments, ready for your brand. Minimum 50 units per style.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* T-Shirts */}
            <Link href="/shop/tshirts" className="group relative aspect-[4/3] overflow-hidden rounded-sm block">
              <Image src="/images/tshirts.jpg" alt="T-Shirts" fill className="object-cover transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.04]" />
              <div className="absolute inset-0 bg-gradient-to-t from-kazi-charcoal/80 via-kazi-charcoal/20 to-transparent" />
              <div className="absolute bottom-0 left-0 p-8">
                <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-white/60 mb-2">3 styles</p>
                <h3 className="font-sans text-3xl font-semibold text-white mb-2">T-Shirts</h3>
                <p className="font-sans text-sm text-white/70 mb-4">From classic crew to oversized drop — built for your brand.</p>
                <span className="inline-flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-[0.15em] text-white group-hover:gap-4 transition-all duration-500">
                  Shop T-Shirts →
                </span>
              </div>
            </Link>

            {/* Hoodies */}
            <Link href="/shop/hoodies" className="group relative aspect-[4/3] overflow-hidden rounded-sm block">
              <Image src="/images/factory-1.jpg" alt="Hoodies" fill className="object-cover transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.04]" />
              <div className="absolute inset-0 bg-gradient-to-t from-kazi-charcoal/80 via-kazi-charcoal/20 to-transparent" />
              <div className="absolute bottom-0 left-0 p-8">
                <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-white/60 mb-2">3 styles</p>
                <h3 className="font-sans text-3xl font-semibold text-white mb-2">Hoodies</h3>
                <p className="font-sans text-sm text-white/70 mb-4">Pullover, zip-up, and oversized — for every season and aesthetic.</p>
                <span className="inline-flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-[0.15em] text-white group-hover:gap-4 transition-all duration-500">
                  Shop Hoodies →
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ INTRO / NARRATIVE ═══ */}
      <section className="py-section-mobile md:py-section px-6 md:px-12 lg:px-20 bg-kazi-cream">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <div>
            <p className="section-label">Who we are</p>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-[42px] leading-[1.2] text-kazi-charcoal mb-8">
              Quality garments tell your brand&apos;s story
            </h2>
            <p className="text-kazi-slate text-lg leading-relaxed mb-8">
              From concept to delivery, we partner with brands worldwide to produce custom apparel that reflects their vision. Our Kathmandu factory combines traditional craftsmanship with modern technology.
            </p>
            <Link href="/services" className="group inline-flex items-center gap-3 font-sans text-xs font-semibold uppercase tracking-[0.15em] text-kazi-green hover:text-kazi-green-dark transition-colors duration-500">
              Discover our services
              <span className="inline-block transition-transform duration-500 ease-luxury group-hover:translate-x-2">→</span>
            </Link>
          </div>
          <div className="image-zoom relative aspect-[4/5] overflow-hidden rounded-sm">
            <Image src="/images/factory-1.jpg" alt="Kazi factory" fill className="object-cover" />
          </div>
        </div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      <section className="py-16 px-6 md:px-12 lg:px-20 bg-kazi-charcoal">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '50+', label: 'Brands Served' },
            { value: '10K+', label: 'Units Produced' },
            { value: '0%', label: 'UK Import Duty' },
            { value: '50', label: 'Min Order Qty' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="font-sans text-4xl md:text-5xl font-semibold text-white mb-3">{stat.value}</div>
              <div className="font-sans text-xs uppercase tracking-[0.15em] text-white/60">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ SERVICES GRID ═══ */}
      <section className="py-section-mobile md:py-section px-6 md:px-12 lg:px-20 bg-kazi-cream-dark">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-20">
            <p className="section-label">What we offer</p>
            <h2 className="font-sans text-3xl md:text-4xl lg:text-[42px] font-normal leading-[1.2]">Our Services</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {services.map((s) => (
              <div key={s.title} className="group cursor-pointer">
                <div className="image-zoom relative aspect-[16/10] mb-6 rounded-sm">
                  <Image src={s.image} alt={s.title} fill className="object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-700 ease-luxury" />
                </div>
                <h3 className="font-sans text-xl font-semibold mb-2 group-hover:text-kazi-green transition-colors duration-500">{s.title}</h3>
                <p className="text-kazi-slate text-sm leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="py-section-mobile md:py-section px-6 md:px-12 lg:px-20 bg-kazi-cream">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-16 lg:gap-24">
            <div className="lg:sticky lg:top-32 lg:self-start">
              <p className="section-label">Process</p>
              <h2 className="font-sans text-3xl md:text-4xl lg:text-[42px] font-normal leading-[1.2] mb-8">How it works</h2>
              <p className="text-kazi-slate text-lg leading-relaxed">A simple three-step process from idea to finished product.</p>
            </div>
            <div className="space-y-16">
              {steps.map((step) => (
                <div key={step.num} className="border-t border-kazi-sand pt-10">
                  <span className="font-sans text-6xl font-semibold text-kazi-charcoal/15 block mb-4">{step.num}</span>
                  <h3 className="font-sans text-2xl md:text-3xl font-semibold mb-4">{step.title}</h3>
                  <p className="text-kazi-slate text-lg leading-relaxed max-w-lg">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PRINT METHODS ═══ */}
      <section className="py-section-mobile md:py-section px-6 md:px-12 lg:px-20 bg-kazi-cream-dark">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-20">
            <p className="section-label">Techniques</p>
            <h2 className="font-sans text-3xl md:text-4xl lg:text-[42px] font-normal leading-[1.2]">Print Methods</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-kazi-sand border border-kazi-sand rounded-sm overflow-hidden">
            {methods.map((m) => (
              <Link key={m.title} href={m.href} className="group block bg-kazi-cream p-8 md:p-10 h-full hover:bg-white transition-colors duration-500">
                <h3 className="font-sans text-lg font-semibold mb-3 group-hover:text-kazi-green transition-colors duration-500">{m.title}</h3>
                <p className="text-kazi-slate text-sm leading-relaxed mb-6">{m.desc}</p>
                <span className="inline-block font-sans text-xs uppercase tracking-[0.15em] text-kazi-green opacity-0 group-hover:opacity-100 transition-all duration-500 ease-luxury translate-x-0 group-hover:translate-x-2">
                  Learn more →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FULL-WIDTH IMAGE BREAK ═══ */}
      <section className="relative h-[60vh] min-h-[400px] overflow-hidden">
        <Image src="/images/embroidery.jpg" alt="Embroidery detail" fill className="object-cover" />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 flex items-center justify-center">
          <blockquote className="text-center px-6 max-w-3xl">
            <p className="font-serif text-2xl md:text-3xl lg:text-4xl text-white leading-relaxed italic">
              &ldquo;Craftsmanship meets innovation in every stitch.&rdquo;
            </p>
          </blockquote>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-section-mobile md:py-section px-6 md:px-12 lg:px-20 bg-kazi-cream">
        <div className="max-w-[900px] mx-auto text-center">
          <p className="section-label">Let&apos;s begin</p>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-[48px] leading-[1.15] mb-6 text-kazi-charcoal">
            Ready to start your<br />production?
          </h2>
          <p className="text-kazi-slate text-lg mb-12">
            Get a quote within 24 hours. No commitment required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/pricing" className="btn-primary">Get a Quote</Link>
            <Link href="/quote" className="btn-outline">Contact Us</Link>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="bg-transparent text-kazi-charcoal pt-20 pb-10">
        <div className="px-6 md:px-12 lg:px-20 max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-1">
              <span className="font-sans text-xl font-semibold block mb-6 text-kazi-charcoal">Kazi Manufacturing</span>
              <p className="text-kazi-slate text-sm leading-relaxed mb-8">Ethical garment manufacturing in Kathmandu, Nepal.</p>
              <Link href="/quote" className="inline-block px-6 py-3 bg-kazi-green text-white font-sans text-xs uppercase tracking-[0.15em] hover:bg-kazi-green-dark transition-colors duration-500">
                Get a Quote
              </Link>
            </div>
            <div>
              <h4 className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-kazi-charcoal/50 mb-6">Navigate</h4>
              <ul className="space-y-4">
                {['Home:/', 'Services:/services', 'Pricing:/pricing', 'Shop T-Shirts:/shop/tshirts', 'Shop Hoodies:/shop/hoodies', 'Contact:/quote'].map((l) => {
                  const [label, href] = l.split(':');
                  return (
                    <li key={href}><Link href={href} className="text-kazi-slate text-sm hover:text-kazi-charcoal transition-colors duration-500">{label}</Link></li>
                  );
                })}
              </ul>
            </div>
            <div>
              <h4 className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-kazi-charcoal/50 mb-6">Services</h4>
              <ul className="space-y-4">
                {methods.map((m) => (
                  <li key={m.href}><Link href={m.href} className="text-kazi-slate text-sm hover:text-kazi-charcoal transition-colors duration-500">{m.title}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-kazi-charcoal/50 mb-6">Connect</h4>
              <ul className="space-y-4">
                <li><a href="https://instagram.com/kazimanufacturing" target="_blank" rel="noopener noreferrer" className="text-kazi-slate text-sm hover:text-kazi-charcoal transition-colors duration-500">Instagram</a></li>
                <li><a href="mailto:hello@kazimanufacturing.com" className="text-kazi-slate text-sm hover:text-kazi-charcoal transition-colors duration-500">hello@kazimanufacturing.com</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-10 border-t border-kazi-charcoal/10 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-kazi-charcoal/50 text-xs">&copy; 2026 Kazi Manufacturing. Kathmandu, Nepal.</p>
            <div className="flex gap-6">
              <Link href="/privacy-policy" className="text-kazi-charcoal/50 text-xs hover:text-kazi-charcoal transition-colors">Privacy</Link>
              <Link href="/terms-of-use" className="text-kazi-charcoal/50 text-xs hover:text-kazi-charcoal transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
