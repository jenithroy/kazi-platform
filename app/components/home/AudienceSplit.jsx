import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/Reveal";

// Layout reference: the Antigravity "for developers / for organizations" split — two large
// cards, each with a headline, a line of copy and one button. Here: new brands vs. established
// brands. Claims in the copy mirror the site's FAQ (100-unit minimum, private label, the same
// tailoring team throughout, a firm date in every quote).
const AUDIENCES = [
  {
    title: "Launch your first collection.",
    body: "Start from 100 pieces per style. Pick a blank, design it in the Atelier, and we guide you from sample to shelf.",
    image: "/images/home/audience-new.webp",
    alt: "A tailor's hands feeding denim through a sewing machine",
    cta: { href: "/atelier", label: "Start designing", primary: true },
  },
  {
    title: "Scale up with a steady partner.",
    body: "Private label, custom trims and the same tailoring team on every repeat order — with a firm date in every quote.",
    image: "/images/home/audience-established.webp",
    alt: "The Kazi workshop floor with rows of sewing stations",
    cta: { href: "/quote", label: "Request a quote", primary: false },
  },
];

export function AudienceSplit() {
  return (
    <section aria-labelledby="audience-title" className="bg-paper py-24 md:py-36">
      <div className="mx-auto max-w-[1440px] px-5 md:px-8">
        <Reveal className="mb-10 md:mb-16">
          <h2
            id="audience-title"
            className="m-0 text-balance font-display text-[clamp(2.125rem,4vw,3.5rem)] font-normal leading-[1.05] tracking-[-0.02em] text-pine"
          >
            Whatever stage you&rsquo;re at.
          </h2>
        </Reveal>

        <div className="grid gap-4 md:grid-cols-2 md:gap-6">
          {AUDIENCES.map((card, index) => (
            <Reveal
              key={card.title}
              delay={index * 100}
              className="flex flex-col overflow-hidden rounded-[1.75rem] bg-white md:rounded-[2rem]"
            >
              <div className="relative aspect-[5/4] overflow-hidden">
                <Image
                  src={card.image}
                  alt={card.alt}
                  fill
                  sizes="(min-width: 768px) 46vw, 92vw"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col items-start p-6 md:p-10">
                <h3 className="m-0 text-balance font-display text-[clamp(2rem,3vw,2.75rem)] font-normal leading-[1.05] tracking-[-0.02em] text-pine">
                  {card.title}
                </h3>
                <p className="m-0 mt-4 max-w-[30rem] font-body text-[1.1875rem] leading-snug text-pine-soft md:text-[1.3125rem]">
                  {card.body}
                </p>
                <Link
                  href={card.cta.href}
                  className={`mt-8 inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-full px-6 font-body text-base font-semibold transition-colors duration-200 ${
                    card.cta.primary
                      ? "btn-gradient text-bone hover:-translate-y-0.5 active:translate-y-0"
                      : "bg-pine/[0.06] text-pine hover:bg-pine/10"
                  }`}
                >
                  {card.cta.label}
                  <ArrowRight size={18} weight="bold" aria-hidden="true" />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
