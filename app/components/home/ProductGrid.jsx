import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { products } from "@/lib/products";
import { priceLine } from "@/components/home/catalogue";

function Tile({ product, index }) {
  return (
    <Reveal
      as="li"
      delay={(index % 3) * 60}
      className="group relative flex flex-col gap-3 has-[a:focus-visible]:ring-4 has-[a:focus-visible]:ring-pine has-[a:focus-visible]:ring-offset-4"
    >
      <div className="relative aspect-square overflow-hidden bg-paper-raised">
        <Image
          src={product.image}
          alt=""
          fill
          sizes="(min-width: 768px) 32vw, 100vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="m-0 font-body text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-pine">
          <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0 after:content-['']">
            {product.name}
          </Link>
        </h2>
        <p className="m-0 whitespace-nowrap font-body text-[0.75rem] tabular-nums text-pine-soft">{priceLine([product])}</p>
      </div>
      <ul className="m-0 flex list-none gap-2 p-0" aria-label={`${product.name} colours`}>
        {product.colors.map((color) => (
          <li
            key={color.hex}
            title={color.name}
            className="h-4 w-4 border border-pine/20"
            style={{ backgroundColor: color.hex }}
          >
            <span className="sr-only">{color.name}</span>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

export function ProductGrid() {
  return (
    <section aria-label="Blanks" className="bg-white px-5 py-10 md:px-12 md:py-14">
      <ul className="m-0 mx-auto grid max-w-[1440px] list-none grid-cols-1 gap-x-8 gap-y-10 p-0 md:grid-cols-3">
        {products.map((product, index) => (
          <Tile key={product.slug} product={product} index={index} />
        ))}
      </ul>
    </section>
  );
}
