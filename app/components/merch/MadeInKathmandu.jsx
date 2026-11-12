import Image from "next/image";
import { Reveal } from "@/components/Reveal";
import { existingOr } from "@/lib/public-assets";
import { STATS, WORKSHOP_PHOTOS } from "./content";
import { BODY, CONTAINER, H2, TILE } from "./styles";

// Workshop photos, a short craft story and the three numbers.
export function MadeInKathmandu() {
  return (
    <section aria-labelledby="kathmandu-title" className="bg-paper py-24 md:py-32">
      <div className={`${CONTAINER} grid gap-10 md:grid-cols-2 md:items-center md:gap-16`}>
        <Reveal className="grid aspect-square grid-cols-2 grid-rows-2 gap-3 md:aspect-[5/4] md:gap-4">
          {WORKSHOP_PHOTOS.map((photo, index) => (
            <div key={photo.src} className={`relative overflow-hidden bg-paper-raised ${TILE} ${index === 0 ? "row-span-2" : ""}`}>
              <Image src={existingOr(photo.src, photo.fallback)} alt={photo.alt} fill sizes="(min-width: 768px) 25vw, 46vw" className="object-cover" />
            </div>
          ))}
        </Reveal>

        <div>
          <Reveal>
            <h2 id="kathmandu-title" className={H2}>
              Made in Kathmandu.
            </h2>
          </Reveal>

          <p className={`${BODY} m-0 mt-6 max-w-[34rem]`}>
            Kazi is a hand-made clothing workshop in Kathmandu, Nepal. Your merch is cut, sewn and finished by one team
            of tailors, and the people who make your sample are the people who make your drop.
          </p>

          <dl className="m-0 mt-10 grid grid-cols-3 gap-4 md:gap-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col-reverse border-t border-pine/15 pt-4">
                <dt className="mt-1 font-body text-[1rem] leading-snug text-pine-soft">{stat.label}</dt>
                <dd className="m-0 font-display text-[clamp(2.25rem,5vw,3.5rem)] leading-none text-pine">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
