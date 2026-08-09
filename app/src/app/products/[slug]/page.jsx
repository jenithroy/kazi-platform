import ProductPage from '../../../views/ProductPage/ProductPage'
import { products } from '../../../data/products'

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }))
}

export default async function ProductRoute({ params }) {
  const { slug } = await params
  return <ProductPage slug={slug} />
}
