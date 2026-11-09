import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { AutoVideo } from "@/components/home/AutoVideo";
import { existingOr, resolveVideo } from "@/lib/public-assets";

// The big rounded video panel straight under the hero (layout reference: the Antigravity
// homepage). It shows a screen recording of designing a garment in the Atelier. The clip is
// public/videos/atelier-demo.mp4 (+ optional .webm); until it exists the panel simply shows
// the still below, so the page never advertises a video it can't play.
export function VideoPanel() {
  const video = resolveVideo("/videos/atelier-demo");
  const poster = existingOr("/images/home/atelier-poster.webp", "/images/screenshot.png");

  return (
    // pt-5 below md puts a clear gap between the hero and the panel on phones; from md up the
    // panel sits close under the hero, Antigravity-style.
    <section aria-labelledby="atelier-title" className="bg-paper px-1.5 pt-5 md:px-3 md:pt-3">
      <div className="relative isolate overflow-hidden rounded-[1.75rem] bg-pine md:rounded-[2rem]">
        {/* 16:10 on phones, 16:9 from md up, and never taller than the screen. */}
        <div className="relative aspect-[16/10] md:aspect-video md:max-h-[calc(100dvh-1.5rem)]">
          <Image src={poster} alt="" fill sizes="100vw" className="object-cover" />
          {video && <AutoVideo mp4={video.mp4} webm={video.webm} poster={poster} />}
        </div>

        {/* Under the video until there's room, then a card over its empty right-hand side (the
            Atelier keeps its own panels on the left and the garment in the middle, so nothing
            the recording shows is covered). */}
        <div className="relative bg-bone p-6 text-pine md:p-8 xl:absolute xl:right-8 xl:top-1/2 xl:w-[25rem] xl:-translate-y-1/2 xl:rounded-[1.5rem] xl:bg-bone/95 xl:p-7 xl:shadow-[0_24px_60px_-20px_rgba(4,20,12,0.55)] xl:backdrop-blur-md">
          <p className="m-0 font-body text-xs font-semibold uppercase tracking-[0.18em] text-moss-deep">
            The Atelier
          </p>
          <h2
            id="atelier-title"
            className="m-0 mt-2 text-balance font-display text-[2rem] font-normal leading-[1.05] tracking-[-0.015em] md:text-[2.25rem]"
          >
            Design it before we sew it.
          </h2>
          <p className="m-0 mt-3 max-w-[32rem] font-body text-[1.0625rem] leading-snug text-pine-soft">
            Pick a blank, drop in your logo and preview it in 3D &mdash; free, with no sign-up.
          </p>
          <Link
            href="/atelier"
            className="btn-gradient mt-5 inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-md px-6 font-body text-base font-semibold text-bone hover:-translate-y-0.5 active:translate-y-0"
          >
            Open the Atelier
            <ArrowRight size={18} weight="bold" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
