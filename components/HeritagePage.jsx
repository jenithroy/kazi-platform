import Link from "next/link";
import { Check } from "lucide-react";

const filledButton =
  "inline-flex h-11 items-center justify-center rounded-sm bg-moss px-6 font-body text-sm font-semibold tracking-wide text-pine transition-colors hover:bg-moss-deep";
const outlineButton =
  "inline-flex h-11 items-center justify-center rounded-sm border border-pine px-6 font-body text-sm font-semibold tracking-wide text-pine transition-colors hover:bg-pine hover:text-bone";
const filledButtonSmall =
  "inline-flex h-9 items-center justify-center rounded-sm bg-moss px-4 font-body text-xs font-semibold tracking-wide text-pine transition-colors hover:bg-moss-deep";

// Service catalogue and process steps below are this project's own placeholder set, written to
// match the site's voice — not a confirmed list of what Kazi actually offers or its real specs.
// Confirm each service, spec and lead time against reality before this ships.
const SERVICES = [
  {
    code: "SVC-01",
    title: "Custom Manufacturing",
    slug: "custom-manufacturing",
    ctaLabel: "Get a Custom Manufacturing quote",
    tagline: "Full garment production from your designs",
    description:
      "From tech pack to finished collection — pattern-cutting, sampling and bulk production, all inside one Kathmandu atelier.",
    specs: ["Min. 50 units", "All fabric weights", "Organic cotton available on request", "Lead time 6–10 weeks"],
  },
  {
    code: "SVC-02",
    title: "Direct-to-Garment (DTG)",
    slug: "dtg",
    ctaLabel: "Get a DTG quote",
    tagline: "Full-colour, photo-quality prints",
    description:
      "Digital printing straight onto the finished garment — no minimums, no colour limits, soft to the touch.",
    specs: ["No minimum per design", "Full colour + spot colours", "Soft hand-feel finish", "Wash-tested"],
  },
  {
    code: "SVC-03",
    title: "Screen Printing",
    slug: "screen-printing",
    ctaLabel: "Get a Screen Printing quote",
    tagline: "High-volume, precise brand graphics",
    description:
      "The workhorse for bulk runs — sharp spot-colour graphics at a per-unit cost that drops as volume climbs.",
    specs: ["From 50 units/design", "Up to 6 spot colours", "Water-based inks", "Price breaks at volume"],
  },
  {
    code: "SVC-04",
    title: "Embroidery",
    slug: "embroidery",
    ctaLabel: "Get an Embroidery quote",
    tagline: "Textural branding for premium pieces",
    description:
      "Stitched logos and wordmarks for a finish that reads as premium the moment someone touches the garment.",
    specs: ["Small and large formats", "Digitising included", "Metallic threads available", "Priced per unit"],
  },
  {
    code: "SVC-05",
    title: "Direct-to-Film (DTF)",
    slug: "dtf",
    ctaLabel: "Get a DTF quote",
    tagline: "Transfer prints on any fabric",
    description:
      "Printed to film, then heat-pressed on — works on fabrics and colours other print methods struggle with.",
    specs: ["Works on any fabric", "No minimum order", "Ideal for dark garments", "Edge-to-edge possible"],
  },
];

const SUPPLY_CHAIN_STEPS = [
  {
    label: "Raw Material Sourcing",
    description: "Cotton and other fibres sourced from vetted Nepali suppliers against the spec you approve.",
  },
  {
    label: "Fabric Production",
    description: "Yarn spun, knitted or woven, then dyed in small batches to your exact spec.",
  },
  {
    label: "Cutting & Sewing",
    description: "Patterns cut for minimal waste, garments sewn and hand-finished by our core tailoring team.",
  },
  {
    label: "Quality Control",
    description: "Every unit checked against your tech pack before it's cleared for packing.",
  },
  {
    label: "Finishing & Packing",
    description: "Pressed, tagged and packed ready for freight or air to the UK.",
  },
];

const OPERATING_PRINCIPLES = [
  "Low-impact, non-toxic dyes",
  "Zero-waste pattern cutting",
  "Fair-wage workshop production",
  "One Kathmandu atelier, start to finish",
];

export function HeritagePage() {
  return (
    <main className="bg-paper">
      <section>
        <div className="mx-auto max-w-[1440px] px-6 pt-16 md:px-8 md:pt-20">
          {SERVICES.map((service, index) => (
            <div
              key={service.code}
              className={`grid gap-8 py-12 md:grid-cols-2 md:gap-16 md:py-16 ${
                index > 0 ? "border-t border-pine/15" : ""
              }`}
            >
              <div>
                <span className="font-body text-xs font-medium tracking-[0.1em] text-moss">
                  {service.code}
                </span>
                <h2 className="mt-2 mb-2 font-display text-2xl text-pine md:text-3xl">
                  {service.title}
                </h2>
                <p className="mb-4 font-body text-pine-soft">{service.tagline}</p>
                <p className="mb-6 max-w-md font-body leading-relaxed text-pine-soft">
                  {service.description}
                </p>
                <Link href={`/quote?service=${service.slug}`} className={filledButtonSmall}>
                  {service.ctaLabel}
                </Link>
              </div>

              <div className="self-start border border-pine/10 bg-bone p-6 md:p-8">
                <ul className="space-y-3">
                  {service.specs.map((spec) => (
                    <li key={spec} className="flex items-start gap-2.5 font-body text-sm text-pine">
                      <Check size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-moss" />
                      {spec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-pine/15 py-16 md:py-20">
        <div className="mx-auto max-w-[1440px] px-6 md:px-8">
          <div className="mb-12">
            <span className="mb-4 block font-body text-xs tracking-[0.18em] text-moss uppercase">
              How a Garment Moves
            </span>
            <h2 className="max-w-2xl font-display text-3xl text-pine md:text-4xl">
              From raw fibre to finished, packed collection.
            </h2>
          </div>

          <ol className="grid gap-8 md:grid-cols-5 md:gap-6">
            {SUPPLY_CHAIN_STEPS.map((step, index) => (
              <li key={step.label}>
                <span className="mb-3 block font-body text-sm font-medium tracking-[0.06em] tabular-nums text-moss">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mb-2 font-display text-lg text-pine">{step.label}</h3>
                <p className="font-body text-sm leading-relaxed text-pine-soft">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-pine/15 bg-bone py-16">
        <div className="mx-auto max-w-[1440px] px-6 text-center md:px-8">
          <span className="mb-4 block font-body text-xs tracking-[0.18em] text-moss uppercase">
            How We Operate
          </span>
          <p className="font-body text-sm tracking-wide text-pine-soft md:text-base">
            {OPERATING_PRINCIPLES.join("  ·  ")}
          </p>
        </div>
      </section>

      <section className="border-t border-pine/15 py-20">
        <div className="mx-auto max-w-[1440px] px-6 text-center md:px-8">
          <h2 className="mb-3 font-display text-3xl text-pine md:text-4xl">
            Not sure which service fits your project?
          </h2>
          <p className="mb-8 font-body text-pine-soft">
            Describe it and we&rsquo;ll recommend the right combination for your brief.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/atelier" className={outlineButton}>
              Enter the Atelier
            </Link>
            <Link href="/quote" className={filledButton}>
              Get a Quote
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
