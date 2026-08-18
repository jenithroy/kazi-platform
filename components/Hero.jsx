import Link from "next/link";
import { Reveal } from "@/components/Reveal";

export function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-[100dvh] items-start justify-center overflow-hidden bg-cover bg-[position:50%_70%] px-6 pt-[calc(var(--nav-height)+64px)] pb-24 md:pb-24"
      style={{ backgroundImage: "url(/hero/hero.jpeg)" }}
    >
      <div className="relative z-[1] flex max-w-[46rem] flex-col items-center gap-6 text-center">
        <Reveal as="h1" className="m-0 font-display text-[clamp(2.25rem,4vw+1.25rem,3.75rem)] font-normal leading-[1.15] text-bone [text-shadow:0_2px_28px_rgba(12,18,32,0.35)]">
          Built for Your Brand.
          <br />
          Crafted in <em className="italic">Nepal</em>.
        </Reveal>
        <Reveal delay={160}>
          <Link
            href="/quote"
            className="mt-2 inline-flex h-13 items-center whitespace-nowrap rounded-sm border border-white/40 bg-bone px-8 font-body text-base font-semibold text-pine shadow-[0_4px_20px_rgba(0,0,0,0.22),0_2px_6px_rgba(0,0,0,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_8px_28px_rgba(0,0,0,0.3),0_3px_8px_rgba(0,0,0,0.18)]"
          >
            Get a Quote
          </Link>
        </Reveal>
      </div>

      <a
        href="#trust"
        aria-label="Scroll to content"
        className="absolute bottom-5 left-1/2 z-[1] inline-flex -translate-x-1/2 flex-col items-center gap-1.5 text-bone opacity-85 drop-shadow-[0_1px_8px_rgba(10,16,14,0.5)] transition-opacity hover:opacity-100 md:bottom-7"
      >
        <span className="font-body text-[0.6875rem] font-medium uppercase tracking-[0.18em]">Explore</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="currentColor"
          viewBox="0 0 256 256"
          aria-hidden="true"
          className="animate-bounce"
        >
          <path d="M212.24,100.24l-80,80a6,6,0,0,1-8.48,0l-80-80a6,6,0,0,1,8.48-8.48L128,167.51l75.76-75.75a6,6,0,0,1,8.48,8.48Z"></path>
        </svg>
      </a>
    </section>
  );
}
