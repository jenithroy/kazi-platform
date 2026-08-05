import { Link } from 'react-router-dom'
import { categoryImage } from '../../data/products'

/** Shared card for /collections' grid and a product page's "related" row. */
export function ProductCard({ product }) {
  return (
    <Link to={`/products/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-paper-raised">
        <img
          src={categoryImage(product.category)}
          alt={`${product.name} product shot`}
          loading="lazy"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 flex items-end justify-center pb-5 bg-gradient-to-t from-pine/40 via-pine/0 to-pine/0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span className="font-body text-xs tracking-[0.14em] uppercase text-bone">
            View Details
          </span>
        </div>
      </div>
      <div className="mt-3">
        <p className="font-body text-xs tracking-[0.1em] uppercase text-pine">{product.name}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="font-mono text-xs text-pine-soft">{product.price}</span>
          {product.moq && (
            <span className="font-mono text-[10px] text-pine-soft/70">MOQ {product.moq}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
