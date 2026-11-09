import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/Reveal";
import { MediaTile } from "@/components/home/MediaTile";

// Layout reference: the Antigravity "feature explorer" — copy on the left, a big rounded media
// tile on the right, one row per step, copy vertically centred against its tile. Each row has an
// optional video slot: record a clip with the team, export it as public/videos/home/<name>.mp4
// (and/or .webm), and it plays over the photo at the next build. Nothing else to change.
//
// The copy is the site's existing process text (it's repeated on /heritage), and the photos are
// the existing workshop photos, resized to WebP under public/images/home/.
const STEPS = [
  {
    title: "Brief & quote",
    body: "Share your tech pack, fabric specs and quantities. We reply with a clear, itemised quote — no hidden costs.",
    image: "/images/home/step-brief.webp",
    alt: "A handwritten brief and quote notebook on the workshop table",
    video: "/videos/home/step-1-brief",
  },
  {
    title: "Sampling & approval",
    body: "Pattern, fabric and stitch samples refined until every detail matches your vision — signed off by you before we cut a single yard.",
    image: "/images/home/step-sampling.webp",
    alt: "Hands inspecting a blue patterned fabric sample",
    video: "/videos/home/step-2-sampling",
  },
  {
    title: "Production",
    body: "Small-batch cutting and sewing, hand-finished by our core tailoring team in Kathmandu — the same hands, start to finish.",
    image: "/images/home/step-production.webp",
    alt: "A tailor's hands guiding denim through an industrial sewing machine",
    video: "/videos/home/step-3-production",
  },
  {
    title: "Quality control",
    body: "Every unit checked against your approved tech pack before it’s cleared for packing.",
    image: "/images/home/step-quality.webp",
    alt: "A member of the Kazi team inspecting a finished garment",
    video: "/videos/home/step-4-quality",
  },
  {
    title: "Finishing & delivery",
    body: "Pressed, tagged, packed and shipped on schedule — ready to land on your shelves.",
    image: "/images/home/step-delivery.webp",
    alt: "Hands folding and bagging finished garments for packing",
    video: "/videos/home/step-5-delivery",
    cta: { href: "/quote", label: "Start your order" },
  },
];

export function ProcessRows() {
  return (
    <section aria-labelledby="process-title" className="bg-paper pb-24 md:pb-40">
      <div className="mx-auto max-w-[1440px] px-5 md:px-8">
        {/* No visible heading on purpose; this keeps the steps under an h2 in the page outline. */}
        <h2 id="process-title" className="sr-only">
          Our process
        </h2>

        <ol className="m-0 flex list-none flex-col gap-14 p-0 md:gap-8">
          {STEPS.map((step) => (
            <li key={step.title} className="grid items-center gap-6 md:grid-cols-12 md:gap-8">
              <Reveal className="md:col-span-4 md:pr-6">
                <h3 className="m-0 font-display text-[clamp(2rem,3.2vw,3rem)] font-normal leading-[1.04] tracking-[-0.02em] text-pine">
                  {step.title}
                </h3>
                <p className="m-0 mt-4 max-w-[27rem] font-body text-[1.1875rem] leading-snug text-pine-soft md:text-[1.3125rem]">
                  {step.body}
                </p>
                {step.cta && (
                  <Link
                    href={step.cta.href}
                    className="btn-gradient mt-7 inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-full px-6 font-body text-base font-semibold text-bone hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {step.cta.label}
                    <ArrowRight size={18} weight="bold" aria-hidden="true" />
                  </Link>
                )}
              </Reveal>

              <Reveal delay={100} className="md:col-span-5 md:col-start-8">
                <MediaTile
                  image={step.image}
                  alt={step.alt}
                  videoBase={step.video}
                  sizes="(min-width: 768px) 38vw, 92vw"
                />
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
