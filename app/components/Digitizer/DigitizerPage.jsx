import Link from "next/link";
import DigitizerClient from "@/components/Digitizer/DigitizerClient";
import { FORMAT_CHOICES } from "@/lib/digitizer/formatsInfo";

const filledButton =
  "inline-flex h-11 items-center justify-center rounded-sm btn-gradient px-6 font-body text-sm font-semibold tracking-wide text-bone";

const STEPS = [
  {
    title: "Add a picture",
    text: "Drop in a logo, paste a screenshot or type some lettering. It is read on your own device and turned into one shape for each colour.",
  },
  {
    title: "Tidy the design",
    text: "Move, resize and recolour the shapes, add text, and choose how each one is stitched. The hoop shows what fits.",
  },
  {
    title: "Save the stitch file",
    text: "Watch the design being sewn, then save the file your machine reads. You can also open a stitch file to look at it or save it as another type.",
  },
];

const WORKS_WELL = [
  "Logos and badges in flat colours",
  "Bold lettering, about 4 mm tall or more",
  "Simple shapes and line art",
];

const TAKES_CARE = [
  "Very small lettering and hairlines: a thread is about 0.4 mm wide, so a line cannot be thinner than that",
  "Photographs: the tones change in steps, so expect something closer to a poster than a picture",
  "Big, dense designs: check the stitch count and the preview before you commit",
];

export function DigitizerPage() {
  return (
    <div className="bg-paper">
      <section className="px-6 pb-8 pt-16 md:px-8 md:pb-10 md:pt-20">
        <div className="mx-auto max-w-[1440px]">
          <h1 className="max-w-3xl font-display text-3xl text-pine md:text-4xl">
            Turn a logo into a machine embroidery file.
          </h1>
        </div>
      </section>

      <section aria-label="Embroidery digitizer" className="px-6 pb-6 md:px-8">
        <div className="mx-auto max-w-[1440px]">
          <DigitizerClient />
          <noscript>
            <p className="mt-4 rounded-sm border border-pine/15 bg-bone p-4 font-body text-sm text-pine-soft">
              The digitizer runs in your browser, so it needs JavaScript switched on.
            </p>
          </noscript>
          <p className="mt-4 font-body text-sm text-pine-soft">
            Everything runs in your browser: your pictures and designs are never uploaded. The last design is remembered
            on this device only.
          </p>
        </div>
      </section>

      <section className="px-6 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-[1440px]">
          <h2 className="font-display text-2xl text-pine md:text-3xl">How it works</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.title} className="rounded-sm border border-pine/15 bg-bone p-6">
                <h3 className="font-display text-xl text-pine md:text-2xl">{step.title}</h3>
                <p className="mt-2 font-body text-[0.95rem] leading-relaxed text-pine-soft">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-pine/10 px-6 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-[1440px]">
          <h2 className="font-display text-2xl text-pine md:text-3xl">Files for your machine</h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FORMAT_CHOICES.map((format) => (
              <li key={format.id} className="rounded-sm border border-pine/15 bg-bone p-5">
                <span className="font-display text-2xl text-pine">{format.label}</span>
                <p className="mt-1 font-body text-[0.95rem] text-pine-soft">{format.who}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-pine/10 px-6 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-[1440px]">
          <h2 className="font-display text-2xl text-pine md:text-3xl">What to expect</h2>
          <div className="mt-8 grid gap-8 md:grid-cols-2 md:gap-12">
            <div>
              <h3 className="font-display text-xl text-pine md:text-2xl">Works well</h3>
              <ul className="mt-4 flex flex-col gap-2 font-body text-[0.95rem] text-pine">
                {WORKS_WELL.map((item) => (
                  <li key={item} className="border-b border-pine/10 pb-2">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-display text-xl text-pine md:text-2xl">Needs care</h3>
              <ul className="mt-4 flex flex-col gap-2 font-body text-[0.95rem] text-pine">
                {TAKES_CARE.map((item) => (
                  <li key={item} className="border-b border-pine/10 pb-2">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-8 max-w-3xl font-body text-[0.95rem] leading-relaxed text-pine-soft">
            A stitch file made from a picture is a starting point. Sew a test on the fabric you will use before a
            production run, and adjust the density, pull and underlay to suit it.
          </p>
        </div>
      </section>

      <section className="px-6 pb-20 md:px-8 md:pb-24">
        <div className="mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-6 rounded-sm border border-pine/15 bg-bone p-8 md:flex-row md:items-center md:p-10">
          <h2 className="max-w-xl font-display text-2xl text-pine md:text-3xl">
            Want it sewn onto your garments?
          </h2>
          <Link href="/quote" className={filledButton}>
            Get a quote
          </Link>
        </div>
      </section>
    </div>
  );
}
