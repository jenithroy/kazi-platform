import { Reveal } from "@/components/Reveal";

const PLACEHOLDERS = [1, 2, 3];

export function CraftedBySection() {
  return (
    <section data-nav-theme="dark" className="bg-pine">
      <div className="mx-auto grid max-w-[1320px] gap-10 px-6 py-20 md:grid-cols-2 md:gap-16 md:px-8 md:py-0">
        <div className="flex items-center md:sticky md:top-0 md:h-dvh">
          <Reveal
            as="h2"
            className="m-0 font-display text-3xl leading-[1.2] text-bone md:text-4xl lg:text-[2.75rem]"
          >
            Crafted By Hands that have done this for decades
          </Reveal>
        </div>

        <div className="flex flex-col gap-6 md:gap-8">
          {PLACEHOLDERS.map((n, index) => (
            <Reveal
              key={n}
              delay={index * 80}
              className="aspect-[4/5] w-full shrink-0 border border-bone/10 bg-bone/5 md:aspect-auto md:h-[58dvh]"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
