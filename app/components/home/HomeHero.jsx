import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { BlankRail } from "@/components/home/BlankRail";

// Full-bleed mountain photo with the headline and primary call to action on the sky, the summit
// just below them, and the white-label blanks along the bottom, so a visitor can choose a product
// without leaving the first screen. Layout reference: the Vero site — one centred message, one
// button.
//
// The photo is public/images/home/hero.webp, a 1920px WebP (~375 KB) made from a 2752x1536 JPG
// that is not kept in the repo. To change the picture, convert the new photo the same way:
//   ffmpeg -i new-photo.jpg -vf scale=1920:-2 -c:v libwebp -quality 72 public/images/home/hero.webp
// The sky colour behind the photo (bg-[#0c4691]) is the average of the photo's top edge, and the
// summit position used below (the tip is 33.6% of the way down the photo) was measured from it;
// if the new photo is composed differently, re-measure both.
export function HomeHero() {
  return (
    <section
      aria-labelledby="home-hero-title"
      className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-[#0c4691]"
    >
      {/* Headline + call to action. */}
      <div className="relative z-10 mx-auto w-full max-w-[1440px] px-5 pt-[calc(var(--nav-height)+clamp(1rem,4.5vh,3.5rem))] md:px-8">
        <div className="mx-auto flex max-w-[48rem] flex-col items-center text-center">
          <h1
            id="home-hero-title"
            className="m-0 text-balance font-display text-[2.375rem] font-normal leading-[1.06] tracking-[-0.015em] text-white [text-shadow:0_2px_30px_rgba(2,18,50,0.4)] md:text-[clamp(2.25rem,3vw+1rem,4rem)]"
          >
            {/* On phones the break is forced after the comma (two lines); from md up the browser
                balances the lines itself. The size is chosen so the second line fits on a 360px phone. */}
            Your clothing label,{" "}
            <br className="md:hidden" />
            made by hand in <em className="italic">Nepal</em>.
          </h1>
          {/* The longer copy and the second button are left out on phones to keep the block narrow. */}
          <p className="m-0 mt-5 hidden max-w-[34rem] text-pretty font-body text-[1.375rem] leading-snug text-white [text-shadow:0_1px_14px_rgba(2,18,50,0.5)] md:block">
            Choose a white-label blank, add your branding, and we&rsquo;ll cut, sew and ship it &mdash; from just 100
            pieces.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/quote"
              className="btn-solid inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-md border border-white/25 px-6 font-body text-base font-semibold text-bone shadow-[0_10px_28px_-8px_rgba(2,18,50,0.75)] hover:-translate-y-0.5 active:translate-y-0"
            >
              Get a quote
              <ArrowRight size={18} weight="bold" aria-hidden="true" />
            </Link>
            <Link
              href="/atelier"
              className="hidden h-12 items-center whitespace-nowrap rounded-md border border-white/45 bg-white/10 px-6 font-body text-base font-semibold text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/20 md:inline-flex"
            >
              Design it yourself
            </Link>
          </div>
        </div>
      </div>

      {/* The stage fills what is left under the text and holds the photo and the picker. */}
      <div className="relative flex flex-1 flex-col justify-end">
        {/* The photo's box is anchored to the hero's bottom edge and its top edge is placed so the
            summit lands a fixed gap (1.75rem on phones, 2.25rem from md up) below the text. The box
            reaches up behind the text, which is fine: that part of the photo is plain sky, and the
            top of the box fades into the matching sky colour so no edge shows.
            `top` is the more negative of two cases, which is exactly the right one for any screen
            (s = 0.336 is the summit's depth in the photo, whose height is 55.81vw when it spans
            the screen's width):
              - photo as wide as the screen (desktop):   gap - s x 55.81vw          = gap - 18.75vw
              - photo as tall as the box (phone/tablet): (gap - s x stage) / (1 - s) = 1.506 gap - 50.6%
            The second case uses a percentage, which `top` resolves against the stage's height. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 -z-10 top-[min(calc(1.75rem_-_18.75vw),calc(2.6rem_-_50.6%))] [mask-image:linear-gradient(to_bottom,transparent,#000_18%)] md:top-[min(calc(2.25rem_-_18.75vw),calc(3.4rem_-_50.6%))]"
        >
          {/* This is the page's LCP image, so it's an <img> in the document (not a CSS background)
              and is fetched with high priority. */}
          <Image
            src="/images/home/hero.webp"
            alt=""
            fill
            sizes="100vw"
            loading="eager"
            fetchPriority="high"
            className="object-cover object-[52%_0%]"
          />
        </div>

        {/* The generous bottom padding on desktop leaves room for the cookie bar a first-time
            visitor sees, so it doesn't cover the picker. */}
        <div className="relative z-10 mx-auto w-full max-w-[1440px] px-5 pb-6 pt-10 md:px-8 md:pb-24 md:pt-12">
          <BlankRail />
        </div>
      </div>
    </section>
  );
}
