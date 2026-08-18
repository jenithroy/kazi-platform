import Link from "next/link";
import Image from "next/image";
import { categoryImage } from "@/lib/products";

/** Shared card for /collections' grid, the homepage collection section, and a product page's "related" row. */
export function ProductCard({ product }) {
  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-paper-raised">
        <Image
          src={categoryImage(product.category)}
          alt={`${product.name} product shot`}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-pine/40 via-pine/0 to-pine/0 pb-5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <span className="font-body text-xs tracking-[0.14em] text-bone uppercase">
            View Details
          </span>
        </div>
      </div>
      <div className="mt-3">
        <p className="font-body text-xs tracking-[0.1em] text-pine uppercase">{product.name}</p>
        <div className="mt-1 flex items-center justify-between">
          <span className="font-body text-xs font-medium tabular-nums text-pine-soft">
            {product.price}
          </span>
          {product.moq && (
            <span className="font-body text-[10px] tracking-[0.06em] tabular-nums text-pine-soft/70">
              MOQ {product.moq}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
