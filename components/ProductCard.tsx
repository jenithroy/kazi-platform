import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/lib/products';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const startingPrice = product.priceTiers[0].price;

  return (
    <Link href={`/shop/${product.category}/${product.slug}`} className="group block">
      {/* Image */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-kazi-cream-dark mb-5">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.04]"
        />
        {product.badge && (
          <span className="absolute top-4 left-4 px-3 py-1 bg-kazi-charcoal text-white font-sans text-[10px] font-semibold uppercase tracking-[0.12em] rounded-sm">
            {product.badge}
          </span>
        )}
      </div>

      {/* Info */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-sans text-base font-semibold text-kazi-charcoal group-hover:text-kazi-green transition-colors duration-500">
            {product.name}
          </h3>
          <span className="font-sans text-sm text-kazi-slate whitespace-nowrap flex-shrink-0">
            From £{startingPrice.toFixed(2)}
          </span>
        </div>
        <p className="font-sans text-xs text-kazi-slate mb-3">{product.tagline}</p>

        {/* Color swatches */}
        <div className="flex items-center gap-1.5">
          {product.colors.slice(0, 6).map((color) => (
            <span
              key={color.name}
              title={color.name}
              className="w-4 h-4 rounded-full border border-black/10 flex-shrink-0"
              style={{ backgroundColor: color.hex }}
            />
          ))}
          {product.colors.length > 6 && (
            <span className="font-sans text-[10px] text-kazi-slate/60 ml-1">+{product.colors.length - 6}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
