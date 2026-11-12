import { Check, X } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/Reveal";
import { KAZI_POINTS, POD_POINTS } from "./content";
import { CONTAINER, H2, TILE } from "./styles";

// Print-on-demand next to Kazi, as two plain cards.
export function PodVsKazi() {
  return (
    <section aria-labelledby="pod-title" className="bg-white py-24 md:py-32">
      <div className={CONTAINER}>
        <Reveal className="mb-10 md:mb-16">
          <h2 id="pod-title" className={`${H2} max-w-[16ch]`}>
            Merch your fans actually keep.
          </h2>
        </Reveal>

        <div className="grid gap-4 md:grid-cols-2 md:gap-6">
          <Reveal className={`bg-paper p-6 md:p-10 ${TILE}`}>
            <h3 className="m-0 font-display text-[1.75rem] font-normal leading-[1.1] text-pine-soft md:text-[2rem]">
              Print-on-demand
            </h3>
            <ul className="m-0 mt-6 list-none p-0">
              {POD_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-3 border-t border-pine/10 py-4 font-body text-[1.1875rem] leading-snug text-pine-soft">
                  <X size={20} weight="bold" aria-hidden="true" className="mt-0.5 shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={100} className={`bg-pine p-6 text-bone md:p-10 ${TILE}`}>
            <h3 className="m-0 font-display text-[1.75rem] font-normal leading-[1.1] md:text-[2rem]">Kazi Merch</h3>
            <ul className="m-0 mt-6 list-none p-0">
              {KAZI_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-3 border-t border-bone/15 py-4 font-body text-[1.1875rem] leading-snug">
                  <Check size={20} weight="bold" aria-hidden="true" className="mt-0.5 shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
