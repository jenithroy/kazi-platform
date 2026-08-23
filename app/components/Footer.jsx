import Link from "next/link";
import { CaretUp } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/Reveal";
import { SITE_PHONE, SITE_PHONE_DIGITS } from "@/lib/site";

const EXPLORE_LINKS = [
  { href: "/atelier", label: "Design" },
  { href: "/heritage", label: "Services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/video-editing", label: "Video Editing" },
  { href: "/stories", label: "Stories" },
  { href: "/lookbook", label: "Lookbook" },
];

const LEGAL_LINKS = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms" },
  { href: "/cookies", label: "Cookies" },
  { href: "/accessibility", label: "Accessibility" },
];

const linkClass =
  "w-fit border-b border-transparent font-body text-[0.95rem] text-bone/80 transition-all duration-200 hover:border-bone/50 hover:text-bone";

function ColumnHeading({ children }) {
  return (
    <span className="mb-1 flex items-center gap-2 font-body text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-bone/50">
      <span aria-hidden="true" className="h-1 w-1 rounded-full bg-moss" />
      {children}
    </span>
  );
}

export function Footer() {
  return (
    <footer data-nav-theme="dark" className="bg-pine py-14 pb-8 md:py-20">
      <div className="mx-auto max-w-[1440px] px-6 md:px-8">
        <Reveal className="flex flex-col gap-7 border-b border-bone/10 pb-10 sm:flex-row sm:items-end sm:justify-between md:pb-14">
          <h2 className="m-0 max-w-md text-balance font-display text-[1.9rem] leading-[1.2] text-bone md:text-4xl">
            Let&rsquo;s build your next collection.
          </h2>
          <Link
            href="/quote"
            className="inline-flex h-12 w-fit shrink-0 items-center whitespace-nowrap rounded-sm bg-bone px-7 font-body text-sm font-semibold text-pine shadow-[0_4px_20px_rgba(0,0,0,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white"
          >
            Get a Quote
          </Link>
        </Reveal>

        <div className="grid grid-cols-1 gap-10 border-b border-bone/10 py-10 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:gap-10 md:py-14">
          <div className="flex flex-col gap-5">
            <Link
              href="#top"
              aria-label="Kazi Manufacturing home"
              className="h-14 w-20 bg-bone"
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
            <ColumnHeading>Explore</ColumnHeading>
            {EXPLORE_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className={linkClass}>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-3.5">
            <ColumnHeading>Contact</ColumnHeading>
            <a href="mailto:hello@kazimanufacturing.com" className={linkClass}>
              hello@kazimanufacturing.com
            </a>
            <a href={`tel:+${SITE_PHONE_DIGITS}`} className={linkClass}>
              {SITE_PHONE}
            </a>
          </div>

          <div className="flex flex-col gap-3.5">
            <ColumnHeading>Location</ColumnHeading>
            <address className="font-body text-[0.95rem] not-italic leading-[1.5] text-bone/60">
              Kathmandu, Nepal
            </address>
          </div>
        </div>

        <div className="flex flex-col items-start gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between md:pt-7">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
            <span className="font-body text-[0.82rem] text-bone/60">© 2026 Kazi Manufacturing. All rights reserved.</span>
            <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {LEGAL_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="font-body text-[0.82rem] text-bone/60 underline-offset-2 transition-colors hover:text-bone hover:underline"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <a
            href="#top"
            className="group inline-flex items-center gap-1 font-body text-[0.82rem] text-bone/60 transition-colors hover:text-bone"
          >
            Back to top
            <CaretUp size={12} weight="bold" className="transition-transform duration-200 group-hover:-translate-y-0.5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
