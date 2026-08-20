import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";

export function DesignSection() {
  return (
    <section data-nav-theme="dark" className="flex min-h-dvh items-center bg-pine px-6 py-20 md:py-28">
      <div className="mx-auto grid w-full max-w-[1440px] items-center gap-12 md:grid-cols-[1.6fr_1fr] md:gap-16">
        <Reveal className="overflow-hidden rounded-sm shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <Image
            src="/images/screenshot.png"
            alt="Designing a custom garment in the Kazi design studio"
            width={1851}
            height={997}
            className="h-auto w-full"
          />
        </Reveal>

        <Reveal delay={100} className="flex flex-col items-end gap-6 text-right md:justify-self-end">
          <h2 className="m-0 max-w-md text-balance font-display text-3xl leading-[1.2] text-bone md:text-4xl lg:text-[2.75rem]">
            Design your collection with us
          </h2>
          <Link
            href="/atelier"
            className="mt-2 inline-flex h-12 items-center whitespace-nowrap rounded-sm bg-bone px-7 font-body text-sm font-semibold text-pine shadow-[0_4px_20px_rgba(0,0,0,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white"
          >
            Explore the Atelier
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
