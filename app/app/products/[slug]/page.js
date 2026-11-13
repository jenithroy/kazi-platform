import { ProductPage } from "@/components/ProductPage";
import { JsonLd } from "@/components/JsonLd";
import { products } from "@/lib/products";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbJsonLd, productJsonLd } from "@/lib/structured-data";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = products.find((p) => p.slug === slug);
  if (!product) return {};

  return pageMetadata(`/products/${product.slug}`);
}

export default async function ProductRoute({ params }) {
  const { slug } = await params;
  const product = products.find((p) => p.slug === slug);

  return (
    <>
      {product && (
        <>
          <JsonLd data={productJsonLd(product)} />
          <JsonLd
            data={breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "The Collection", path: "/collections/" },
              { name: product.name, path: `/products/${product.slug}/` },
            ])}
          />
        </>
      )}
      <ProductPage key={slug} slug={slug} />
    </>
  );
}
