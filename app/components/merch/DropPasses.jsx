import { Check } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/Reveal";
import { FORM_HREF, PASSES } from "./content";
import { BUTTON_PRIMARY, CONTAINER, H2, TILE } from "./styles";

const LIGHT_BUTTON =
  "inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-bone px-6 font-body text-base font-semibold text-pine transition-colors duration-200 hover:bg-paper-raised";

// Three ways to order, as three plain cards; the middle one is filled pine to stand out.
//
// TODO: prices. PASSES[].price in content.js is "__" until Kazi sets real "from" prices.
function Pass({ pass }) {
  const dark = Boolean(pass.featured);
  const soft = dark ? "text-bone/80" : "text-pine-soft";

  return (
    <article className={`flex h-full flex-col p-6 md:p-9 ${TILE} ${dark ? "bg-pine text-bone" : "bg-white text-pine"}`}>
      <h3 className="m-0 font-display text-[2rem] font-normal leading-[1.05] tracking-[-0.01em] md:text-[2.25rem]">{pass.name}</h3>
      <p className={`m-0 mt-2 font-body text-[1.1875rem] leading-snug ${soft}`}>{pass.summary}</p>

      <p className="m-0 mt-7 flex items-baseline gap-2">
        <span className={`font-body text-[1.0625rem] ${soft}`}>From</span>
        <span className="font-display text-[3rem] leading-none">£{pass.price}</span>
        <span className={`font-body text-[1.0625rem] ${soft}`}>/ unit</span>
      </p>

      <ul className={`m-0 mb-8 mt-7 list-none border-t p-0 pt-5 ${dark ? "border-bone/20" : "border-pine/10"}`}>
        {pass.includes.map((item) => (
          <li key={item} className="flex items-start gap-3 py-1.5 font-body text-[1.0625rem] leading-snug">
            <Check size={18} weight="bold" aria-hidden="true" className="mt-0.5 shrink-0" />
            {item}
          </li>
        ))}
      </ul>

      <a href={FORM_HREF} className={`mt-auto w-full ${dark ? LIGHT_BUTTON : BUTTON_PRIMARY}`}>
        Plan your drop
        <span className="sr-only">: {pass.name}</span>
      </a>
    </article>
  );
}

export function DropPasses() {
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="bg-paper py-24 md:py-32">
      <div className={CONTAINER}>
        <Reveal className="mb-10 md:mb-16">
          <h2 id="pricing-title" className={H2}>
            Three ways to drop.
          </h2>
        </Reveal>

        <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-3 md:gap-6">
          {PASSES.map((pass, index) => (
            <Reveal as="li" key={pass.name} delay={index * 90}>
              <Pass pass={pass} />
            </Reveal>
          ))}
        </ul>

        <p className="m-0 mt-8 font-body text-[1.0625rem] text-pine-soft">Shipping and customs are quoted separately.</p>
      </div>
    </section>
  );
}
