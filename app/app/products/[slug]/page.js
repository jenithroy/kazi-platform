import { ProductPage } from "@/components/ProductPage";
import { products } from "@/lib/products";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export default async function ProductRoute({ params }) {
  const { slug } = await params;
  return <ProductPage key={slug} slug={slug} />;
}
