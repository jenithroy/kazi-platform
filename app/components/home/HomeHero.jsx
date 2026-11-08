import Image from "next/image";
import Link from "next/link";

// The photo is public/images/home/hero.webp, a 1920px WebP (~375 KB) made from a 2752x1536 JPG
// that is not kept in the repo. To change the picture, convert the new photo the same way:
//   ffmpeg -i new-photo.jpg -vf scale=1920:-2 -c:v libwebp -quality 72 public/images/home/hero.webp
export function HomeHero() {
  return (
    <section
      aria-labelledby="home-hero-title"
      className="relative isolate flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-[#0c4691] px-5 text-center"
    >
      {/* The page's LCP image, so it's an <img> in the document and fetched with high priority. */}
      <Image
        src="/images/home/hero.webp"
        alt=""
        fill
        sizes="100vw"
        loading="eager"
        fetchPriority="high"
        className="-z-20 object-cover object-[52%_30%]"
      />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-black/10 via-black/25 to-black/50" />
      <h1
        id="home-hero-title"
        className="m-0 text-balance font-display text-[2.5rem] font-normal leading-[1.04] tracking-[-0.015em] text-white [text-shadow:0_2px_30px_rgba(2,18,50,0.5)] md:text-[clamp(2.5rem,4vw+1rem,5rem)]"
      >
        Design your <em className="italic">merch</em>.
      </h1>
      <Link
        href="/collections"
        className="mt-8 inline-flex h-11 items-center whitespace-nowrap border border-pine bg-white px-6 font-body text-[0.8125rem] font-semibold uppercase tracking-[0.18em] text-pine transition-colors duration-200 hover:bg-pine hover:text-bone"
      >
        Shop all
      </Link>
    </section>
  );
}
