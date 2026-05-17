import Navbar from '@/components/Navbar';
import ProductCard from '@/components/ProductCard';
import Link from 'next/link';
import { getProductsByCategory } from '@/lib/products';

export const metadata = {
  title: 'T-Shirts | Kazi Manufacturing',
  description: 'Premium blank t-shirts for your brand. Classic crew, heavyweight, and oversized styles. MOQ 50 units.',
};

export default function TshirtsPage() {
  const products = getProductsByCategory('tshirts');

  return (
    <main className="min-h-screen bg-kazi-cream text-kazi-charcoal">
      <Navbar />

      {/* Header */}
      <div className="pt-32 bg-kazi-charcoal text-white py-16 px-6 md:px-12 lg:px-20">
        <div className="max-w-[1200px] mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 font-sans text-xs text-white/40 mb-8 uppercase tracking-[0.12em]">
            <Link href="/" className="hover:text-white/70 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/shop/tshirts" className="hover:text-white/70 transition-colors">Shop</Link>
            <span>/</span>
            <span className="text-white/70">T-Shirts</span>
          </nav>
          <div className="w-10 h-px bg-white/30 mb-6" />
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-white/40 mb-3">Blanks</p>
          <h1 className="font-sans text-4xl md:text-5xl font-normal mb-4">T-Shirts</h1>
          <p className="font-sans text-lg text-white/60 max-w-xl">
            Three cuts, built for every brand. All styles from MOQ 50 units with tiered pricing up to 1,000+.
          </p>
        </div>
      </div>

      {/* Products Grid */}
      <section className="py-20 px-6 md:px-12 lg:px-20">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center justify-between mb-10">
            <p className="font-sans text-xs text-kazi-slate uppercase tracking-[0.12em]">{products.length} styles</p>
            <Link href="/shop/hoodies" className="font-sans text-xs font-semibold uppercase tracking-[0.12em] text-kazi-green hover:text-kazi-green-dark transition-colors">
              View Hoodies →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Info Banner */}
      <div className="bg-kazi-charcoal/5 border-t border-kazi-sand py-10 px-6 md:px-12 lg:px-20">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { label: 'Minimum Order', value: '50 units' },
            { label: 'Lead Time', value: '3–5 weeks' },
            { label: 'Print Options', value: 'DTG, Screen, Embroidery' },
            { label: 'Duty to UK', value: '0%' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="font-sans text-xs font-semibold uppercase tracking-[0.15em] text-kazi-slate mb-1">{label}</p>
              <p className="font-sans text-sm text-kazi-charcoal">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="py-10 px-6 border-t border-kazi-sand">
        <div className="max-w-[1200px] mx-auto text-center font-sans text-sm text-kazi-slate">
          <p>&copy; 2026 Kazi Manufacturing. Kathmandu, Nepal.</p>
        </div>
      </footer>
    </main>
  );
}
