import Link from "next/link";

export function Footer() {
  return (
    <footer data-nav-theme="dark" className="bg-pine py-14 pb-8 md:py-20">
      <div className="mx-auto max-w-[1440px] px-6 md:px-8">
        <div className="grid grid-cols-1 gap-10 border-b border-bone/10 pb-10 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:gap-10 md:pb-14">
          <div className="flex flex-col gap-5">
            <Link
              href="#top"
              aria-label="Kazi Manufacturing home"
              className="h-12 w-17 bg-bone"
              style={{
                maskImage: "url(/images/logo/kazi-logo-trimmed.png)",
                WebkitMaskImage: "url(/images/logo/kazi-logo-trimmed.png)",
                maskPosition: "left",
                WebkitMaskPosition: "left",
                maskSize: "contain",
                WebkitMaskSize: "contain",
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
              }}
            />
            <p className="m-0 max-w-[26ch] font-body text-[0.9rem] leading-[1.5] text-bone/60">
              Custom apparel manufacturing for UK brands, crafted in Kathmandu.
            </p>
          </div>

          <nav aria-label="Footer" className="flex flex-col gap-3.5">
            <span className="mb-0.5 font-body text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-bone/50">
              Explore
            </span>
            <Link href="#atelier" className="w-fit font-body text-[0.95rem] text-bone transition-opacity hover:opacity-70">
              Atelier
            </Link>
            <Link href="#heritage" className="w-fit font-body text-[0.95rem] text-bone transition-opacity hover:opacity-70">
              Our Heritage
            </Link>
            <Link href="/pricing" className="w-fit font-body text-[0.95rem] text-bone transition-opacity hover:opacity-70">
              Pricing
            </Link>
            <Link href="/stories" className="w-fit font-body text-[0.95rem] text-bone transition-opacity hover:opacity-70">
              Stories
            </Link>
            <Link href="/lookbook" className="w-fit font-body text-[0.95rem] text-bone transition-opacity hover:opacity-70">
              Lookbook
            </Link>
          </nav>

          <div className="flex flex-col gap-3.5">
            <span className="mb-0.5 font-body text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-bone/50">
              Contact
            </span>
            <a
              href="mailto:hello@kazimanufacturing.com"
              className="w-fit font-body text-[0.95rem] text-bone transition-opacity hover:opacity-70"
            >
              hello@kazimanufacturing.com
            </a>
          </div>

          <div className="flex flex-col gap-3.5">
            <span className="mb-0.5 font-body text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-bone/50">
              Location
            </span>
            <address className="font-body text-[0.95rem] not-italic leading-[1.5] text-bone/60">
              Kathmandu, Nepal
            </address>
          </div>
        </div>

        <div className="flex flex-col items-start gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between md:pt-7">
          <span className="font-body text-[0.82rem] text-bone/45">© 2026 Kazi Manufacturing. All rights reserved.</span>
          <Link
            href="/quote"
            className="border-b border-transparent font-body text-[0.9rem] font-semibold text-moss transition-colors hover:border-moss"
          >
            Get a Quote →
          </Link>
        </div>
      </div>
    </footer>
  );
}
