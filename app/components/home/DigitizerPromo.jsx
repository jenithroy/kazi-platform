import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/Reveal";
import { AutoVideo } from "@/components/home/AutoVideo";
import { resolveVideo } from "@/lib/public-assets";
import { FORMAT_CHOICES } from "@/lib/digitizer/formatsInfo";

// Promotes /digitizer. It sits under the product range and is built to look unlike the Atelier panel
// near the top of the page (a pale page, one big rounded video with a card over it): this is a solid
// pine band, one block of text on the left, centred beside the clip in a browser-window frame, because
// the clip IS the tool.
//
// The clip (public/videos/digitizer-demo.mp4 / .webm, poster public/images/home/digitizer-poster.webp) is a
// screen recording of the real page being used: the Kazi logo is dropped in and converted, its tiny
// "manufacturing" lettering is boxed and deleted, the stitches are played back and a DST file is saved, then
// it fades back to the start so it loops without a jump. It is 16:9 so the whole editor is legible.
// scripts/digitizer-promo/ (README.md there) records it again, which you want to do whenever the
// digitizer's look changes.
const POSTER = "/images/home/digitizer-poster.webp";

export function DigitizerPromo() {
  const video = resolveVideo("/videos/digitizer-demo");

  return (
    // data-nav-theme="dark": the fixed nav flips to its dark look while it is over this band (Nav.jsx).
    <section aria-labelledby="digitizer-title" data-nav-theme="dark" className="bg-pine text-bone">
      <div className="mx-auto grid max-w-[1440px] items-center gap-12 px-5 py-24 md:px-8 md:py-32 lg:grid-cols-12 lg:gap-12 lg:py-36">
        {/* The heading, copy, button and file types are one block, centred beside the window. The heading is the
            same size as the other section headings and stays on one line: from lg up it may run a little past
            the column into the gap (lg:whitespace-nowrap), never as far as the window. */}
        <Reveal className="lg:col-span-5">
          <h2
            id="digitizer-title"
            className="m-0 font-display text-[clamp(2.125rem,4vw,3.5rem)] font-normal leading-[1.05] tracking-[-0.02em] lg:whitespace-nowrap"
          >
            Turn your image into stitches.
          </h2>
          {/* whitespace-nowrap on "sign-up" keeps it from splitting at its hyphen across two lines. */}
          <p className="m-0 mt-6 max-w-[28rem] text-pretty font-body text-[1.1875rem] leading-snug text-bone/80 md:text-[1.3125rem]">
            Drop in an image, tidy it up, watch it being sewn, and save the file for your embroidery machine. Free,
            with no <span className="whitespace-nowrap">sign-up</span>, and your artwork never leaves your device.
          </p>
          <Link
            href="/digitizer"
            className="btn-gradient mt-8 inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-full px-6 font-body text-base font-semibold text-bone ring-1 ring-bone/30 hover:-translate-y-0.5 active:translate-y-0"
          >
            Try the embroidery digitizer
            <ArrowRight size={18} weight="bold" aria-hidden="true" />
          </Link>
          <ul aria-label="File types it saves" className="m-0 mt-9 flex list-none flex-wrap gap-2 p-0">
            {FORMAT_CHOICES.map((format) => (
              <li
                key={format.id}
                className="rounded-full border border-bone/25 px-3.5 py-1.5 font-body text-sm font-semibold tracking-[0.08em] text-bone/85"
              >
                {format.label}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={100} className="lg:col-span-7">
          {/* A browser window around the recording. The pause button lives in its title bar (placement="above")
              so it never covers the tool's own buttons in the clip. overflow-hidden is on the window, not on
              the clip box, or the button above the clip would be cut off. */}
          <div className="overflow-hidden rounded-2xl border border-bone/20 bg-paper shadow-[0_40px_90px_-40px_rgba(0,0,0,0.7)] md:rounded-3xl">
            <div className="flex h-11 items-center gap-3 border-b border-pine/10 bg-paper-raised px-4" aria-hidden="true">
              <span className="flex gap-1.5">
                <span className="size-2.5 rounded-full bg-pine/20" />
                <span className="size-2.5 rounded-full bg-pine/20" />
                <span className="size-2.5 rounded-full bg-pine/20" />
              </span>
              <span className="mx-auto max-w-[15rem] flex-1 truncate rounded-full bg-paper px-4 py-1 text-center font-body text-[0.8125rem] text-pine-soft">
                kazimanufacturing.com/digitizer
              </span>
              {/* as wide as the three dots, so the address stays centred (the pause button floats over this) */}
              <span className="w-[42px]" />
            </div>
            <div className="relative aspect-video bg-paper">
              <Image
                src={POSTER}
                alt="The embroidery digitizer after converting the Kazi logo: the stitched flower and lettering on cream cloth, and a button to download the DST file."
                fill
                sizes="(min-width: 1440px) 783px, (min-width: 1024px) 56vw, 92vw"
                className="object-cover"
              />
              {video && <AutoVideo mp4={video.mp4} webm={video.webm} poster={POSTER} placement="above" />}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
