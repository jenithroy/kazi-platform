import { products } from '@/data/products';
import ProductDetailClient from './ProductDetailClient';

export function generateStaticParams() {
  return products.map((product) => ({
    slug: product.slug,
  }));
}

export default function Page({ params }: { params: { slug: string } }) {
  return <ProductDetailClient slug={params.slug} />;
}
