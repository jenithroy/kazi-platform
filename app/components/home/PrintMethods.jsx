import Link from "next/link";
import { Reveal } from "@/components/Reveal";

const METHODS = [
  { title: "Screen print", body: "Sharp spot colour for bulk runs. The per-piece price drops as the quantity climbs." },
  { title: "Embroidery", body: "Stitched logos and wordmarks for a finish that reads as premium in the hand. Digitising included." },
  { title: "DTG", body: "Full-colour, photo-quality prints straight onto the garment, soft to the touch." },
  { title: "DTF", body: "Heat-pressed transfers for dark garments and fabrics other methods struggle with." },
];

export function PrintMethods() {
  return (
    <section aria-labelledby="print-methods-title" className="bg-paper px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1440px]">
        <Reveal className="mb-10 flex flex-col gap-6 md:mb-14 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="m-0 mb-3 font-body text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-pine-soft">
              Decoration
            </p>
            <h2
              id="print-methods-title"
              className="m-0 max-w-[22ch] text-balance font-display text-[clamp(2rem,3.5vw,3.25rem)] font-normal leading-[1.06] tracking-[-0.02em] text-pine"
            >
              Four ways to put your design on it.
            </h2>
          </div>
          <Link
            href="/heritage"
            className="w-fit font-body text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-pine underline decoration-pine/30 underline-offset-4 transition-colors hover:decoration-pine"
          >
            See all services
          </Link>
        </Reveal>

        <ul className="m-0 grid list-none grid-cols-1 gap-px overflow-hidden border border-pine/15 bg-pine/15 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {METHODS.map((method, index) => (
            <Reveal as="li" key={method.title} delay={index * 80} className="flex flex-col gap-3 bg-bone p-6 md:p-8">
              <h3 className="m-0 font-display text-2xl font-normal leading-tight text-pine">{method.title}</h3>
              <p className="m-0 font-body text-[0.95rem] leading-relaxed text-pine-soft">{method.body}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
