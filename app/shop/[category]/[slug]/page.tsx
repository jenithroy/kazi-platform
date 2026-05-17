import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import ProductCard from '@/components/ProductCard';
import ProductDetail from './ProductDetail';
import { getProductBySlug, getProductsByCategory, PRODUCTS } from '@/lib/products';

interface Props {
  params: { category: string; slug: string };
}

export async function generateStaticParams() {
  return PRODUCTS.map((p) => ({ category: p.category, slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = getProductBySlug(params.slug);
  if (!product) return {};
  return {
    title: `${product.name} | Kazi Manufacturing`,
    description: product.description,
  };
}

export default function ProductPage({ params }: Props) {
  const product = getProductBySlug(params.slug);
  if (!product || product.category !== params.category) notFound();

  const related = getProductsByCategory(product.category as 'tshirts' | 'hoodies')
    .filter((p) => p.id !== product.id)
    .slice(0, 3);

  return (
    <main className="min-h-screen bg-kazi-cream text-kazi-charcoal">
      <Navbar />

      <div className="pt-32">
        <ProductDetail product={product} />

        {/* Related Products */}
        {related.length > 0 && (
          <section className="border-t border-kazi-sand py-20 px-6 md:px-12 lg:px-20 bg-kazi-cream-dark">
            <div className="max-w-[1200px] mx-auto">
              <p className="section-label mb-10">You may also like</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
                {related.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      <footer className="py-10 px-6 border-t border-kazi-sand">
        <div className="max-w-[1200px] mx-auto text-center font-sans text-sm text-kazi-slate">
          <p>&copy; 2026 Kazi Manufacturing. Kathmandu, Nepal.</p>
        </div>
      </footer>
    </main>
  );
}
