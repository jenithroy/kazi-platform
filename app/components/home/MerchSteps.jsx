import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";

// Photos are 1200px WebPs in public/images/home/, made from the full-size originals in
// public/images/process/ with: cwebp -q 72 -resize 1200 0 <src>.jpeg -o <name>.webp
const STEPS = [
  {
    title: "Design it",
    body: "Pick a blank, colour and fabric in the Atelier, then drop your artwork or text where you want it. Already have files? Send them with your quote instead.",
    image: "/images/home/brief-quote.webp",
    link: { href: "/atelier", label: "Open the Atelier" },
  },
  {
    title: "Approve a sample",
    body: "We sew and print one piece, photograph it and ship it to you. Nothing goes to bulk until you have signed it off.",
    image: "/images/home/sampling-approval.webp",
  },
  {
    title: "We make the run",
    body: "Cut, sewn, printed or embroidered in our Kathmandu atelier, checked piece by piece and delivered to your door.",
    image: "/images/home/production.webp",
  },
];

export function MerchSteps() {
  return (
    <section aria-labelledby="merch-steps-title" className="bg-paper px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1440px]">
        <Reveal className="mb-10 md:mb-16">
          <p className="m-0 mb-3 font-body text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-pine-soft">
            How it works
          </p>
          <h2
            id="merch-steps-title"
            className="m-0 max-w-[22ch] text-balance font-display text-[clamp(2rem,3.5vw,3.25rem)] font-normal leading-[1.06] tracking-[-0.02em] text-pine"
          >
            From idea to boxed merch in three steps.
          </h2>
        </Reveal>

        <ol className="m-0 grid list-none gap-10 p-0 md:grid-cols-3 md:gap-6">
          {STEPS.map((step, index) => (
            <Reveal as="li" key={step.title} delay={index * 100} className="flex flex-col gap-4">
              <div className="relative aspect-[4/5] overflow-hidden bg-paper-raised">
                <Image src={step.image} alt="" fill sizes="(min-width: 768px) 32vw, 90vw" className="object-cover" />
                <span className="absolute left-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-bone font-body text-sm font-semibold text-pine">
                  {index + 1}
                </span>
              </div>
              <h3 className="m-0 font-display text-2xl font-normal leading-tight text-pine">{step.title}</h3>
              <p className="m-0 max-w-[40ch] font-body text-[0.95rem] leading-relaxed text-pine-soft">{step.body}</p>
              {step.link && (
                <Link
                  href={step.link.href}
                  className="w-fit font-body text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-pine underline decoration-pine/30 underline-offset-4 transition-colors hover:decoration-pine"
                >
                  {step.link.label}
                </Link>
              )}
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
