import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Captions, Film, Layers, Palette, ShoppingBag, Sparkles } from "lucide-react";
import { Reveal } from "@/components/Reveal";

const filledButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-moss px-6 font-body text-sm font-semibold tracking-wide text-pine transition-colors hover:bg-moss-deep";
const outlineButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-sm border border-pine px-6 font-body text-sm font-semibold tracking-wide text-pine transition-colors hover:bg-pine hover:text-bone";

// Placeholder service copy for the editing studio — structurally what Kazi offers alongside
// manufacturing, but the turnaround windows and inclusions below are stand-ins until Kazi
// confirms the studio's real capacity.
const SERVICES = [
  {
    icon: ShoppingBag,
    title: "Product & PDP video",
    body: "Clean, on-white and on-model cuts built for your product pages — every angle, drape and stitch detail edited to the same grade as your stills.",
  },
  {
    icon: Sparkles,
    title: "Social cut-downs",
    body: "One shoot, many edits. Vertical 9:16 for Reels and TikTok, 1:1 for feed, 16:9 for YouTube — reframed and paced for each platform, not just cropped.",
  },
  {
    icon: Film,
    title: "Brand & campaign films",
    body: "Longer-form storytelling for a drop, a collection or a season — narrative assembly, music, sound design and a final grade that holds up on a big screen.",
  },
  {
    icon: Layers,
    title: "Motion graphics & titles",
    body: "Typography, lower-thirds, size charts, fabric callouts and animated logo stings, all built in your own type and colour system.",
  },
  {
    icon: Palette,
    title: "Colour grading & clean-up",
    body: "Colour-accurate garments across every shot, plus retouching — stray threads, creases, background fixes — so the fabric on screen matches the fabric in the box.",
  },
  {
    icon: Captions,
    title: "Captions & versioning",
    body: "Burnt-in and SRT subtitles, sound-off-first edits, and regional versions with swapped pricing, language or end cards for each market you sell into.",
  },
];

const REEL = [
  { video: "studio-reel.mp4", label: "Campaign film", caption: "AW collection launch" },
  { video: "newtonian-trap.mp4", label: "Behind the seams", caption: "Sampling room, Kathmandu" },
  { video: "marketing-story.mp4", label: "Product reel", caption: "Knitwear PDP set" },
];

const FORMATS = [
  { ratio: "16:9", use: "YouTube & site hero", className: "aspect-video" },
  { ratio: "4:5", use: "Instagram feed", className: "aspect-[4/5]" },
  { ratio: "9:16", use: "Reels, TikTok, Shorts", className: "aspect-[9/16]" },
];

const PROCESS = [
  {
    step: "01",
    title: "Brief",
    body: "You send footage and references — a shoot, phone clips, or our own factory-floor coverage. We agree deliverables, formats and tone before a single cut.",
  },
  {
    step: "02",
    title: "First cut",
    body: "You get a watermarked review link with timestamped comments. No file wrangling, no version confusion — one link, one thread.",
  },
  {
    step: "03",
    title: "Revisions",
    body: "Two rounds are included on every project. We work through your notes in order and re-post to the same link, so the history stays in one place.",
  },
  {
    step: "04",
    title: "Delivery",
    body: "Final masters plus every platform export you need, delivered with the source project files so nothing about your footage stays locked to us.",
  },
];

const DELIVERABLES = [
  ["Ratios", "16:9, 9:16, 4:5, 1:1"],
  ["Resolution", "Up to 4K, 25 / 30 / 60 fps"],
  ["Formats", "ProRes master + H.264 web"],
  ["Captions", "Burnt-in and .SRT"],
  ["Revisions", "2 rounds included"],
  ["Turnaround", "3–7 working days"],
];

const FAQS = [
  {
    q: "Do I have to manufacture with Kazi to use the editing studio?",
    a: "No — the studio takes on standalone editing work for clothing brands. That said, most of our clients are brands already producing with us: the team knows the garments, so the edit gets the fabric and the fit right first time.",
  },
  {
    q: "What if I don't have footage yet?",
    a: "We can film it. Our team covers the production floor in Kathmandu — cutting, stitching, hand-finishing, QC — which gives you genuine behind-the-scenes material about your own order rather than stock library clips.",
  },
  {
    q: "How do I send you large files?",
    a: "Any of the usual routes: a shared drive link, WeTransfer, Frame.io, or a direct upload we set up for you. Raw camera files are welcome — we would far rather grade from the original than from a compressed export.",
  },
  {
    q: "Can you match our existing brand guidelines?",
    a: "Yes. Send your type, colour and logo assets with the brief and we build the motion system against them, so new edits sit alongside your existing content instead of looking borrowed.",
  },
  {
    q: "How is editing priced?",
    a: "Per project — based on runtime, the number of deliverables and how much source footage there is. Tell us the scope on the quote form and you get a fixed figure back. No hourly meter.",
  },
];

function imageSrc(file) {
  return `/landing-page-images/${file}`;
}

function videoSrc(file) {
  return `/videos/${file}`;
}

export function VideoEditingPage() {
  return (
    <div className="bg-paper">
      <section className="px-6 pb-16 pt-16 md:px-8 md:pb-20 md:pt-20">
        <div className="mx-auto grid max-w-[1440px] items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <span className="mb-4 block font-body text-xs uppercase tracking-[0.18em] text-moss">
              Also from Kazi
            </span>
            <h1 className="m-0 font-display text-4xl leading-tight text-pine md:text-5xl">
              We edit video, too.
            </h1>
            <p className="m-0 mt-6 max-w-xl font-body text-lg leading-relaxed text-pine-soft">
              Alongside the factory floor, Kazi runs a small in-house editing studio for the
              brands we manufacture for. Product videos, campaign films and social cut-downs —
              made by people who already know how your garments are built.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/quote" className={filledButton}>
                Get an editing quote <ArrowRight size={14} strokeWidth={1.5} />
              </Link>
              <a href="#showreel" className={outlineButton}>
                See the work
              </a>
            </div>
          </Reveal>

          <Reveal delay={100} className="relative overflow-hidden rounded-sm">
            <video
              src={videoSrc("studio-hero.mov")}
              autoPlay
              muted
              loop
              playsInline
              className="aspect-[4/3] w-full object-cover lg:aspect-[5/4]"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-pine/55 via-pine/5 to-transparent" />
          </Reveal>
        </div>
      </section>

      <section id="showreel" className="border-t border-pine/15 bg-bone px-6 py-20 md:px-8 md:py-24">
        <div className="mx-auto max-w-[1440px]">
          <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <h2 className="m-0 max-w-xl font-display text-2xl text-pine md:text-3xl">
              A few things we&rsquo;ve cut
            </h2>
            <span className="font-body text-xs uppercase tracking-[0.12em] text-pine-soft">
              Selected work
            </span>
          </Reveal>

          <div className="grid gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
            {REEL.map((item, index) => (
              <Reveal key={item.video} delay={index * 80} as="figure" className="group m-0">
                <div className="relative overflow-hidden rounded-sm">
                  <video
                    src={videoSrc(item.video)}
                    autoPlay
                    muted
                    loop
                    playsInline
                    aria-label={`${item.label} — ${item.caption}`}
                    className="aspect-[9/16] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-pine/25 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                </div>
                <figcaption className="mt-3 font-body text-sm text-pine-soft">
                  <span className="font-medium text-pine">{item.label}</span> — {item.caption}
                </figcaption>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:px-8 md:py-24">
        <div className="mx-auto max-w-[1440px]">
          <Reveal as="h2" className="m-0 mb-10 max-w-xl font-display text-2xl text-pine md:text-3xl">
            What the studio takes on
          </Reveal>

          <div className="grid gap-px border border-pine/15 bg-pine/15 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map(({ icon: Icon, title, body }, index) => (
              <Reveal key={title} delay={index * 60} as="article" className="bg-bone p-8">
                <Icon size={22} strokeWidth={1.5} className="mb-5 text-moss" />
                <h3 className="m-0 mb-3 font-display text-xl leading-snug text-pine">{title}</h3>
                <p className="m-0 font-body text-sm leading-relaxed text-pine-soft">{body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-pine/15 bg-bone px-6 py-20 md:px-8 md:py-24">
        <div className="mx-auto max-w-[1440px]">
          <Reveal className="mb-10 max-w-xl">
            <h2 className="m-0 mb-4 font-display text-2xl text-pine md:text-3xl">
              One shoot, cut for every place it runs.
            </h2>
            <p className="m-0 font-body leading-relaxed text-pine-soft">
              Each platform gets its own edit — reframed around the garment, re-paced for how
              people actually watch there. Not one master squeezed into three boxes.
            </p>
          </Reveal>

          <div className="grid max-w-4xl items-end gap-6 sm:grid-cols-3 md:gap-8">
            {FORMATS.map((format, index) => (
              <Reveal key={format.ratio} delay={index * 80} as="figure" className="m-0">
                <div className={`relative overflow-hidden rounded-sm ${format.className}`}>
                  <Image
                    src={imageSrc("collection-denim.jpg")}
                    alt={`${format.ratio} crop for ${format.use}`}
                    fill
                    sizes="(min-width: 640px) 33vw, 100vw"
                    className="object-cover"
                  />
                  <span className="absolute left-3 top-3 rounded-sm bg-bone/90 px-2 py-1 font-body text-xs font-medium tabular-nums text-pine">
                    {format.ratio}
                  </span>
                </div>
                <figcaption className="mt-3 font-body text-sm text-pine-soft">{format.use}</figcaption>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:px-8 md:py-24">
        <div className="mx-auto grid max-w-[1440px] items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal as="figure" className="relative order-2 m-0 aspect-[4/3] overflow-hidden rounded-sm lg:order-1">
            <Image
              src={imageSrc("heritage.jpg")}
              alt="Hand-finishing on the Kazi production floor"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </Reveal>

          <Reveal delay={100} className="order-1 lg:order-2">
            <span className="mb-4 block font-body text-xs uppercase tracking-[0.18em] text-moss">
              No footage yet?
            </span>
            <h2 className="m-0 mb-4 font-display text-2xl text-pine md:text-3xl">
              We can film it on the floor your order is made on.
            </h2>
            <p className="m-0 mb-6 max-w-md font-body leading-relaxed text-pine-soft">
              Cutting, stitching, hand-finishing, QC, packing — filmed in Kathmandu while your run
              is in production. It gives you real provenance content about your own garments, not
              a stock library clip of somebody else&rsquo;s factory.
            </p>
            <Link href="/quote" className={outlineButton}>
              Book floor coverage <ArrowRight size={14} strokeWidth={1.5} />
            </Link>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-pine/15 bg-bone px-6 py-20 md:px-8 md:py-24">
        <div className="mx-auto max-w-[1440px]">
          <Reveal as="h2" className="m-0 mb-10 max-w-xl font-display text-2xl text-pine md:text-3xl">
            How an edit runs
          </Reveal>

          <div className="grid gap-8 sm:grid-cols-2 md:gap-10 lg:grid-cols-4">
            {PROCESS.map(({ step, title, body }, index) => (
              <Reveal key={step} delay={index * 80} className="border-t border-pine/15 pt-5">
                <span className="mb-3 block font-body text-sm font-medium tabular-nums tracking-[0.12em] text-moss">
                  {step}
                </span>
                <h3 className="m-0 mb-3 font-display text-xl text-pine">{title}</h3>
                <p className="m-0 font-body text-sm leading-relaxed text-pine-soft">{body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:px-8 md:py-24">
        <div className="mx-auto grid max-w-[1440px] items-start gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <h2 className="m-0 mb-4 font-display text-2xl text-pine md:text-3xl">
              Everything you need, in every format you sell in.
            </h2>
            <p className="m-0 max-w-md font-body leading-relaxed text-pine-soft">
              One project, one delivery — masters, platform exports, captions and the source
              files. You keep the lot, project files included, so another editor can pick up where
              we left off if you ever want them to.
            </p>
          </Reveal>

          <Reveal delay={100} as="dl" className="m-0 grid gap-px border border-pine/15 bg-pine/15 sm:grid-cols-2">
            {DELIVERABLES.map(([label, value]) => (
              <div key={label} className="bg-bone p-6">
                <dt className="mb-2 font-body text-xs uppercase tracking-[0.12em] text-pine-soft">{label}</dt>
                <dd className="m-0 font-body text-sm font-medium tabular-nums text-pine">{value}</dd>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="border-t border-pine/15 bg-bone px-6 py-20 md:px-8 md:py-24">
        <div className="mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-20">
          <Reveal as="h2" className="m-0 font-display text-2xl text-pine md:text-3xl">
            Questions brands ask us
          </Reveal>

          <Reveal delay={100} className="divide-y divide-pine/15 border-t border-pine/15">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group py-5">
                <summary className="flex list-none items-start justify-between gap-6 font-body text-base font-medium text-pine [&::-webkit-details-marker]:hidden">
                  {q}
                  <span
                    aria-hidden="true"
                    className="shrink-0 font-body text-moss transition-transform duration-150 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="m-0 mt-3 max-w-2xl font-body text-sm leading-relaxed text-pine-soft">{a}</p>
              </details>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="relative isolate overflow-hidden px-6 py-20 md:px-8 md:py-24">
        <Image
          src={imageSrc("process-bulk-production.jpg")}
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-pine/90" />
        <Reveal className="mx-auto flex max-w-[1440px] flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="m-0 mb-2 font-display text-2xl text-bone md:text-3xl">
              Got footage sitting in a folder?
            </h2>
            <p className="m-0 max-w-md font-body leading-relaxed text-bone/75">
              Tell us what you shot and where it needs to run. We&rsquo;ll come back with a scope,
              a fixed price and a delivery date.
            </p>
          </div>
          <Link
            href="/quote"
            className="inline-flex h-12 items-center justify-center gap-2 self-start rounded-sm bg-moss px-7 font-body text-sm font-semibold tracking-wide text-pine transition-colors hover:bg-moss-deep md:self-auto"
          >
            Start a project <ArrowRight size={14} strokeWidth={1.5} />
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
