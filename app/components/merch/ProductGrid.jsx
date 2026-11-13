import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/Reveal";
import { CUSTOM_PRODUCTS, FORM_HREF, PRODUCTS } from "./content";
import { BUTTON_SECONDARY, CONTAINER, H2, TILE } from "./styles";

// The same tile grid as the home page's range (components/home/RangeGrid.jsx): a photo, the
// product name, one line of detail and an arrow. Each tile opens that garment in the Atelier; the
// last one is for anything not on the list.
const ringOnFocus =
  "has-[a:focus-visible]:ring-4 has-[a:focus-visible]:ring-pine has-[a:focus-visible]:ring-offset-4";

export function ProductGrid() {
  return (
    <section id="products" aria-labelledby="products-title" className="bg-paper py-24 md:py-32">
      <div className={CONTAINER}>
        <Reveal className="mb-10 flex flex-col gap-6 md:mb-16 md:flex-row md:items-end md:justify-between">
          <h2 id="products-title" className={H2}>
            Pick your pieces.
          </h2>
          <Link href="/atelier" className={`${BUTTON_SECONDARY} w-fit`}>
            Design it in 3D
            <ArrowRight size={18} weight="bold" aria-hidden="true" />
          </Link>
        </Reveal>

        <ul className="m-0 grid list-none grid-cols-2 gap-x-3 gap-y-8 p-0 md:grid-cols-4 md:gap-x-6 md:gap-y-12">
          {PRODUCTS.map((product, index) => (
            <Reveal as="li" key={product.garment} delay={(index % 4) * 80} className={`group relative flex flex-col gap-3 ${TILE} ${ringOnFocus}`}>
              <div className={`relative aspect-[3/4] overflow-hidden bg-paper-raised ${TILE}`}>
                <Image
                  src={product.image}
                  alt={`${product.name} — custom cut-and-sew creator merch blank`}
                  fill
                  sizes="(min-width: 768px) 24vw, 46vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
              </div>
              <div className="flex items-start justify-between gap-3 px-1">
                <div className="min-w-0">
                  <h3 className="m-0 font-display text-[1.5rem] leading-none tracking-[-0.01em] text-pine md:text-[1.875rem]">
                    <Link href={`/atelier?garment=${product.garment}`} className="after:absolute after:inset-0 after:content-['']">
                      {product.name}
                      <span className="sr-only">: customise in 3D</span>
                    </Link>
                  </h3>
                  <p className="m-0 mt-1.5 font-body text-[0.875rem] text-pine-soft md:text-[0.9375rem]">From 100 pieces</p>
                </div>
                <span
                  aria-hidden="true"
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-pine text-bone transition-colors duration-200 group-hover:bg-moss-deep md:size-11"
                >
                  <ArrowUpRight size={18} weight="bold" />
                </span>
              </div>
            </Reveal>
          ))}

          <Reveal
            as="li"
            delay={(PRODUCTS.length % 4) * 80}
            className={`btn-gradient group relative flex min-h-[18rem] flex-col justify-between overflow-hidden p-5 text-bone md:p-7 ${TILE} ${ringOnFocus}`}
          >
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center self-end rounded-full bg-bone text-moss-deep transition-transform duration-200 group-hover:translate-x-0.5 md:size-11"
            >
              <ArrowRight size={18} weight="bold" />
            </span>
            <div>
              <h3 className="m-0 font-display text-[1.875rem] leading-[1.02] md:text-[2.5rem]">
                <a href={FORM_HREF} className="after:absolute after:inset-0 after:content-['']">
                  Something custom?
                </a>
              </h3>
              <p className="m-0 mt-2 font-body text-[0.9375rem] leading-snug text-bone">{CUSTOM_PRODUCTS}</p>
            </div>
          </Reveal>
        </ul>
      </div>
    </section>
  );
}
