import { ProductPage } from "@/components/ProductPage";
import { categoryImage, products } from "@/lib/products";
import { SITE_URL } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = products.find((p) => p.slug === slug);
  if (!product) return {};

  return pageMetadata(`/products/${product.slug}`);
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
