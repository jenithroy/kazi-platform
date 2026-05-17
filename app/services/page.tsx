import Navbar from '@/components/Navbar';
import Image from 'next/image';
import { Check } from 'lucide-react';

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-kazi-cream text-kazi-charcoal">
      <Navbar />

      {/* Page header — sits below fixed navbar (h-32) */}
      <div className="pt-32 bg-kazi-charcoal text-white py-20 px-6 md:px-12 lg:px-20">
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-white/50 mb-4">What we do</p>
          <h1 className="font-sans text-4xl md:text-5xl font-normal mb-4">Our Services</h1>
          <p className="font-sans text-lg text-white/70">Full-service garment manufacturing from Kathmandu, Nepal</p>
        </div>
      </div>

      <section className="py-20 px-6 md:px-12 lg:px-20">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {[
              {
                title: 'T-Shirts & Basics',
                desc: 'We manufacture high-quality t-shirts in various weights (140gsm to 220gsm) and fabric blends including 100% cotton, cotton-polyester mixes, and organic options.',
                items: ['Custom cuts and fits', 'Multiple fabric options', 'Tags and labels', 'Custom packaging'],
              },
              {
                title: 'Hoodies & Outerwear',
                desc: 'Premium hoodies, crewnecks, and zip-ups in various weights. Fully customisable with kangaroo pockets, drawstrings, ribbed cuffs and more.',
                items: ['Pullover and zip styles', 'Fleece-lined options', 'Custom drawstrings', 'Embroidery ready'],
              },
              {
                title: 'Embroidery',
                desc: 'Professional embroidery for logos, badges, and decorative elements. We can embroider on almost any garment including caps, beanies, and outerwear.',
                items: ['3D puff embroidery', 'Flat embroidery', 'Appliqué', 'Small and large designs'],
              },
              {
                title: 'Screen & DTG Printing',
                desc: 'Both screen printing (best for bulk orders) and Direct-to-Garment printing (best for complex designs and smaller runs).',
                items: ['Up to 6 colour screen print', 'Full colour DTG', 'Discharge printing', 'Water-based inks'],
              },
            ].map((service) => (
              <div key={service.title} className="border border-kazi-sand bg-white p-8 rounded-sm">
                <h2 className="font-sans text-xl font-semibold mb-4">{service.title}</h2>
                <p className="text-kazi-slate text-sm leading-relaxed mb-6">{service.desc}</p>
                <ul className="space-y-2">
                  {service.items.map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-kazi-slate">
                      <Check className="w-4 h-4 text-kazi-green flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Private Label */}
          <div className="mt-8 border border-kazi-sand bg-white p-10 rounded-sm">
            <h2 className="font-sans text-xl font-semibold mb-3">Private Label Service</h2>
            <p className="text-kazi-slate text-sm leading-relaxed mb-8">
              We offer complete private label solutions. Your brand, our manufacturing expertise.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {[
                { title: 'Custom Tags', desc: 'Woven labels, printed tags, size labels' },
                { title: 'Packaging', desc: 'Poly bags, boxes, tissue paper, stickers' },
                { title: 'Hang Tags', desc: 'Custom designed and printed hang tags' },
              ].map((item) => (
                <div key={item.title}>
                  <div className="w-8 h-px bg-kazi-green mb-4" />
                  <h3 className="font-sans font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-kazi-slate">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="py-10 px-6 border-t border-kazi-sand">
        <div className="max-w-[1200px] mx-auto text-center text-kazi-slate text-sm">
          <p>&copy; 2026 Kazi Manufacturing. Kathmandu, Nepal.</p>
        </div>
      </footer>
    </main>
  );
}
