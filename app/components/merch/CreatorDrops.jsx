import Image from "next/image";
import { Reveal } from "@/components/Reveal";
import { existingOr } from "@/lib/public-assets";
import { CREATOR_DROPS, CREATOR_DROPS_ARE_PLACEHOLDERS, CREATOR_QUOTES } from "./content";
import { QuoteCarousel } from "./QuoteCarousel";
import { CONTAINER, H2, H3, TILE } from "./styles";

// Case-study cards and a quote carousel.
//
// TODO: everything shown here is placeholder data from components/merch/content.js. While
// CREATOR_DROPS_ARE_PLACEHOLDERS is true each card carries a visible "Sample data" label, so a
// placeholder can't be mistaken for a real result. Swap in real drops, then set it to false.
export function CreatorDrops() {
  return (
    <section aria-labelledby="drops-title" className="bg-white py-24 md:py-32">
      <div className={CONTAINER}>
        <Reveal className="mb-10 md:mb-16">
          <h2 id="drops-title" className={H2}>
            Creator drops.
          </h2>
        </Reveal>

        <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-3 md:gap-6">
          {CREATOR_DROPS.map((drop, index) => (
            <Reveal as="li" key={drop.drop} delay={index * 90} className={`flex flex-col overflow-hidden bg-paper ${TILE}`}>
              <div className="relative aspect-[4/5] bg-paper-raised">
                <Image
                  src={existingOr(drop.image, drop.fallback)}
                  alt={CREATOR_DROPS_ARE_PLACEHOLDERS ? "" : `${drop.creator} wearing ${drop.drop}`}
                  fill
                  sizes="(min-width: 768px) 31vw, 92vw"
                  className="object-cover"
                />
                {CREATOR_DROPS_ARE_PLACEHOLDERS && (
                  <span className="absolute left-4 top-4 rounded-full bg-bone px-3 py-1 font-body text-[0.875rem] font-semibold text-pine">
                    Sample data
                  </span>
                )}
              </div>

              <div className="p-6 md:p-7">
                <h3 className={H3}>{drop.drop}</h3>
                <p className="m-0 mt-1 font-body text-[1.0625rem] text-pine-soft">{drop.creator}</p>
                <dl className="m-0 mt-5 grid grid-cols-2 gap-4 border-t border-pine/10 pt-4">
                  <div className="flex flex-col-reverse">
                    <dt className="font-body text-[0.9375rem] text-pine-soft">Units</dt>
                    <dd className="m-0 font-display text-[1.5rem] leading-tight text-pine">{drop.units}</dd>
                  </div>
                  <div className="flex flex-col-reverse">
                    <dt className="font-body text-[0.9375rem] text-pine-soft">Sold out in</dt>
                    <dd className="m-0 font-display text-[1.5rem] leading-tight text-pine">{drop.soldOut}</dd>
                  </div>
                </dl>
              </div>
            </Reveal>
          ))}
        </ul>

        <QuoteCarousel quotes={CREATOR_QUOTES} />
      </div>
    </section>
  );
}
