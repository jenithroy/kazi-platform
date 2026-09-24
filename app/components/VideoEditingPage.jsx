import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Captions, Check, Film, Layers, Palette, ShoppingBag, Sparkles } from "lucide-react";
import { Reveal } from "@/components/Reveal";

const filledButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-moss-deep px-6 font-body text-sm font-semibold tracking-wide text-bone transition-colors hover:bg-pine";
const outlineButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-sm border border-pine px-6 font-body text-sm font-semibold tracking-wide text-pine transition-colors hover:bg-pine hover:text-bone";

const eyebrow = "mb-4 block font-body text-xs uppercase tracking-[0.18em] text-moss-deep";
const sectionHeading = "m-0 font-display text-2xl text-pine md:text-3xl";

// Copy here is plain on purpose — ordinary sentences, no em-dashes, no "not X, just Y"
// constructions. Turnaround windows, package scopes and the revision count below are
// placeholders until Kazi confirms what the studio actually commits to.
const FACTS = [
  ["Small in-house team", "The people who edit are the people you speak to."],
  ["Overlap with UK hours", "Reviews land in your morning, not overnight."],
  ["Two revision rounds", "Included in the price on every project."],
  ["You keep the files", "Masters, exports and project files on delivery."],
];

const SERVICES = [
  {
    icon: ShoppingBag,
    title: "Product video",
    body: "Short cuts for product pages, on-white or on-model. We grade them against your photography so the video and the stills look like they came from one shoot.",
  },
  {
    icon: Sparkles,
    title: "Social versions",
    body: "Vertical for Reels and TikTok, square for feed, widescreen for YouTube. Each one is reframed and re-timed for where it runs, so the garment stays in shot.",
  },
  {
    icon: Film,
    title: "Campaign films",
    body: "Longer pieces for a launch or a season, usually between 60 and 120 seconds. Assembly, music, sound design and a final grade.",
  },
  {
    icon: Layers,
    title: "Motion graphics",
    body: "Titles, lower thirds, size charts, fabric callouts and logo animations, built with the type and colours you already use elsewhere.",
  },
  {
    icon: Palette,
    title: "Grading and clean-up",
    body: "Consistent colour from shot to shot, so a garment looks the same throughout. We also clear up stray threads, creases and background clutter.",
  },
  {
    icon: Captions,
    title: "Captions and versions",
    body: "Subtitles burnt in or supplied as SRT files, edits that still work with the sound off, and regional versions carrying different prices, language or end cards.",
  },
];

const REEL = [
  { video: "studio-reel.mp4", label: "Campaign film", caption: "AW collection launch" },
  { video: "newtonian-trap.mp4", label: "Behind the seams", caption: "Sampling room, Kathmandu" },
  { video: "marketing-story.mp4", label: "Product reel", caption: "Knitwear PDP set" },
];

const FORMATS = [
  { ratio: "16:9", use: "YouTube and site headers", className: "aspect-video" },
  { ratio: "4:5", use: "Instagram feed", className: "aspect-[4/5]" },
  { ratio: "9:16", use: "Reels, TikTok, Shorts", className: "aspect-[9/16]" },
];

const PACKAGES = [
  {
    name: "Product set",
    summary: "For a drop that needs its product pages filled.",
    points: [
      "Up to 10 product videos",
      "One master ratio and two social crops",
      "Colour matched to your stills",
      "About five working days",
    ],
  },
  {
    name: "Campaign",
    summary: "For a season launch built around one film.",
    points: [
      "A hero film up to two minutes",
      "Four platform versions",
      "Motion titles in your brand style",
      "Music licensing handled for you",
    ],
    featured: true,
  },
  {
    name: "Retainer",
    summary: "For brands posting something every week.",
    points: [
      "A monthly block of edits",
      "A standing turnaround window",
      "Shared footage and asset library",
      "First place in the queue",
    ],
  },
];

const PROCESS = [
  {
    step: "01",
    title: "Brief",
    body: "You send footage and a few references. We agree what the deliverables are, what shapes they need to be in and roughly what the thing should feel like.",
  },
  {
    step: "02",
    title: "First cut",
    body: "You get a watermarked review link. Comments attach to the timecode they refer to, so nobody has to describe where in the video they mean.",
  },
  {
    step: "03",
    title: "Revisions",
    body: "Two rounds come with every project. We work through your notes and repost to the same link, so earlier versions stay where you left them.",
  },
  {
    step: "04",
    title: "Delivery",
    body: "Final masters and every export you asked for, sent with the project files. If you move to another editor later, they can pick the work up from there.",
  },
];

const INTAKE = [
  "Footage. Raw camera files are ideal, but phone clips are fine too",
  "Your logo, type and colour references",
  "Two or three edits you like, and one you do not",
  "Where each version will run, and how long it can be",
  "Any music direction, or leave the licensing with us",
  "The date it needs to be live",
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
    a: "No, we take on editing work on its own. Most of the brands we edit for do produce with us, and it helps: the team has seen the garment in production, so the fabric and the fit tend to come out right on the first pass.",
  },
  {
    q: "What if I don't have footage yet?",
    a: "We can film it for you. The team covers the production floor in Kathmandu while your order is being made, which gives you footage of your own garments instead of stock clips from somebody else's factory.",
  },
  {
    q: "How do I send you large files?",
    a: "A shared drive link, WeTransfer or Frame.io all work, and we can set up a direct upload if that is easier. Send the original camera files where you can, since a compressed export gives us much less to grade from.",
  },
  {
    q: "Can you match our existing brand guidelines?",
    a: "Yes. Send the type, colour and logo assets along with the brief and we build the titles and graphics against them, so the new work sits alongside what you already have.",
  },
  {
    q: "Who owns the finished work?",
    a: "You do, from the moment we deliver: the masters, the exports and the project files. We only use a piece in our own showreel if you tell us we can.",
  },
  {
    q: "How is editing priced?",
    a: "Per project, based on how long the finished pieces are, how many versions you need and how much footage there is to work through. Describe the scope on the quote form and we come back with a fixed figure.",
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
            <span className={eyebrow}>Also from Kazi</span>
            <h1 className="m-0 font-display text-4xl leading-tight text-pine md:text-5xl">
              We edit video, too.
            </h1>
            <p className="m-0 mt-6 max-w-xl font-body text-lg leading-relaxed text-pine-soft">
              Kazi runs a small editing team alongside the factory, mostly for brands who already
              manufacture with us. They cut product videos, campaign films and social posts.
              Because the same people watch the garments come off the floor, the edits usually get
              fabric and fit right without much going back and forth.
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

      <section className="border-y border-pine/15 bg-bone px-6 py-12 md:px-8">
        <div className="mx-auto grid max-w-[1440px] gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map(([value, label], index) => (
            <Reveal key={value} delay={index * 60} as="div">
              <dl className="m-0">
                <dt className="mb-1.5 font-display text-lg text-pine md:text-xl">{value}</dt>
                <dd className="m-0 font-body text-sm leading-relaxed text-pine-soft">{label}</dd>
              </dl>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="showreel" className="px-6 py-20 md:px-8 md:py-24">
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

      <section id="services" className="border-t border-pine/15 bg-bone px-6 py-20 md:px-8 md:py-24">
        <div className="mx-auto max-w-[1440px]">
          <Reveal as="h2" className={`${sectionHeading} mb-10 max-w-xl`}>
            What the studio takes on
          </Reveal>

          <div className="grid gap-px border border-pine/15 bg-pine/15 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map(({ icon: Icon, title, body }, index) => (
              <Reveal key={title} delay={index * 60} as="article" className="bg-bone p-8">
                <Icon size={22} strokeWidth={1.5} className="mb-5 text-moss-deep" />
                <h3 className="m-0 mb-3 font-display text-xl leading-snug text-pine">{title}</h3>
                <p className="m-0 font-body text-sm leading-relaxed text-pine-soft">{body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:px-8 md:py-24">
        <div className="mx-auto max-w-[1440px]">
          <Reveal className="mb-10 max-w-xl">
            <h2 className="m-0 mb-4 font-display text-2xl text-pine md:text-3xl">
              The same footage, cut three or four ways
            </h2>
            <p className="m-0 font-body leading-relaxed text-pine-soft">
              A campaign usually has to run on a product page, in a feed and in a vertical video
              app on the same week. We cut each version separately so the garment stays in frame
              and the pacing suits where people are watching.
            </p>
          </Reveal>

          <div className="grid max-w-4xl items-end gap-6 sm:grid-cols-3 md:gap-8">
            {FORMATS.map((format, index) => (
              <Reveal key={format.ratio} delay={index * 80} as="figure" className="m-0">
                <div className={`relative overflow-hidden rounded-sm ${format.className}`}>
                  <Image
                    src={imageSrc("collection-denim.jpg")}
                    alt={`The same shot cropped to ${format.ratio} for ${format.use}`}
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
          <p className="m-0 mt-6 max-w-4xl font-body text-sm text-pine-soft">One shot, three crops.</p>
        </div>
      </section>

      <section className="border-t border-pine/15 bg-bone px-6 py-20 md:px-8 md:py-24">
        <div className="mx-auto max-w-[1440px]">
          <Reveal className="mb-10 max-w-xl">
            <span className={eyebrow}>Ways brands work with us</span>
            <h2 className="m-0 mb-4 font-display text-2xl text-pine md:text-3xl">
              Three common shapes
            </h2>
            <p className="m-0 font-body leading-relaxed text-pine-soft">
              These are starting points rather than fixed products. Most projects end up somewhere
              between two of them, and we price whatever yours turns out to be.
            </p>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-3 md:gap-8">
            {PACKAGES.map((pkg, index) => (
              <Reveal
                key={pkg.name}
                delay={index * 80}
                as="article"
                className={`flex flex-col rounded-sm border p-8 ${
                  pkg.featured ? "border-pine bg-paper" : "border-pine/15"
                }`}
              >
                <h3 className="m-0 mb-2 font-display text-xl text-pine">{pkg.name}</h3>
                <p className="m-0 mb-6 font-body text-sm leading-relaxed text-pine-soft">
                  {pkg.summary}
                </p>
                <ul className="m-0 mb-8 list-none space-y-2.5 p-0">
                  {pkg.points.map((point) => (
                    <li key={point} className="flex items-start gap-2.5">
                      <Check size={14} strokeWidth={2} className="mt-1 shrink-0 text-moss-deep" />
                      <span className="font-body text-sm leading-relaxed text-pine">{point}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/quote"
                  className={`mt-auto ${pkg.featured ? filledButton : outlineButton}`}
                >
                  Scope this <ArrowRight size={14} strokeWidth={1.5} />
                </Link>
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
            <span className={eyebrow}>If you have no footage</span>
            <h2 className="m-0 mb-4 font-display text-2xl text-pine md:text-3xl">
              We can film your order being made
            </h2>
            <p className="m-0 mb-6 max-w-md font-body leading-relaxed text-pine-soft">
              Cutting, stitching, hand-finishing, checking and packing, filmed in Kathmandu while
              your run is on the floor. It takes a bit of planning around the production schedule,
              so tell us early if you want it.
            </p>
            <Link href="/quote" className={outlineButton}>
              Ask about filming <ArrowRight size={14} strokeWidth={1.5} />
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
                <span className="mb-3 block font-body text-sm font-medium tabular-nums tracking-[0.12em] text-moss-deep">
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
            <span className={eyebrow}>What helps us start</span>
            <h2 className="m-0 mb-6 font-display text-2xl text-pine md:text-3xl">
              Send these and we can quote properly
            </h2>
            <ul className="m-0 list-none space-y-3 p-0">
              {INTAKE.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check size={15} strokeWidth={2} className="mt-1 shrink-0 text-moss-deep" />
                  <span className="font-body leading-relaxed text-pine-soft">{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={100}>
            <span className={eyebrow}>What comes back</span>
            <h2 className="m-0 mb-6 font-display text-2xl text-pine md:text-3xl">
              Specifications we deliver to
            </h2>
            <dl className="m-0 grid gap-px border border-pine/15 bg-pine/15 sm:grid-cols-2">
              {DELIVERABLES.map(([label, value]) => (
                <div key={label} className="bg-bone p-6">
                  <dt className="mb-2 font-body text-xs uppercase tracking-[0.12em] text-pine-soft">{label}</dt>
                  <dd className="m-0 font-body text-sm font-medium tabular-nums text-pine">{value}</dd>
                </div>
              ))}
            </dl>
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
                    className="shrink-0 font-body text-moss-deep transition-transform duration-150 group-open:rotate-45"
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
              Footage sitting in a folder?
            </h2>
            <p className="m-0 max-w-md font-body leading-relaxed text-bone/75">
              Tell us what you shot and where it needs to run, and we will reply with a scope, a
              price and a delivery date.
            </p>
          </div>
          <Link
            href="/quote"
            className="inline-flex h-12 items-center justify-center gap-2 self-start rounded-sm bg-moss-deep px-7 font-body text-sm font-semibold tracking-wide text-bone transition-colors hover:bg-pine md:self-auto"
          >
            Start a project <ArrowRight size={14} strokeWidth={1.5} />
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
