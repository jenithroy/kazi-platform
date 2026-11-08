import Image from "next/image";
import Link from "next/link";

// The photo is public/images/home/hero.webp, a 1920px WebP (~375 KB) made from a 2752x1536 JPG
// that is not kept in the repo. To change the picture, convert the new photo the same way:
//   ffmpeg -i new-photo.jpg -vf scale=1920:-2 -c:v libwebp -quality 72 public/images/home/hero.webp
export function HomeHero() {
  return (
    <section aria-label="Shop all blanks" className="relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden bg-[#0c4691] px-5">
      {/* The page's LCP image, so it's an <img> in the document and fetched with high priority. */}
      <Image
        src="/images/home/hero.webp"
        alt=""
        fill
        sizes="100vw"
        loading="eager"
        fetchPriority="high"
        className="-z-10 object-cover object-[52%_30%]"
      />
      <h1 className="sr-only">Kazi Manufacturing blanks</h1>
      <Link
        href="/collections"
        className="inline-flex h-11 items-center whitespace-nowrap border border-pine bg-white px-6 font-body text-[0.8125rem] font-semibold uppercase tracking-[0.18em] text-pine transition-colors duration-200 hover:bg-pine hover:text-bone"
      >
        Shop all
      </Link>
    </section>
  );
}
