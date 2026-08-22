import { ProductPage } from "@/components/ProductPage";
import { categoryImage, products } from "@/lib/products";
import { SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = products.find((p) => p.slug === slug);
  if (!product) return {};

  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      url: `/products/${product.slug}`,
      images: [{ url: categoryImage(product.category), width: 1200, height: 1200, alt: product.name }],
    },
    twitter: { images: [categoryImage(product.category)] },
  };
}

function productJsonLd(product) {
  const price = product.price.match(/[\d.]+/)?.[0];
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    category: product.category,
    image: `${SITE_URL}${categoryImage(product.category)}`,
    offers: {
      "@type": "Offer",
      priceCurrency: "GBP",
      price,
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/products/${product.slug}`,
      eligibleQuantity: { "@type": "QuantitativeValue", minValue: product.moq },
    },
  };
}

export default async function ProductRoute({ params }) {
  const { slug } = await params;
  const product = products.find((p) => p.slug === slug);

  return (
    <>
      {product && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product)) }}
        />
      )}
      <ProductPage key={slug} slug={slug} />
    </>
  );
}
