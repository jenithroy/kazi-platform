import Link from "next/link";

export const metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: true },
};

const LINKS = [
  { href: "/atelier", label: "Design in the Atelier" },
  { href: "/heritage", label: "Our services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/collections", label: "The collection" },
];

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center bg-paper px-6 py-24 md:px-8">
      <div className="mx-auto w-full max-w-[1440px]">
        <span className="mb-4 block font-body text-xs uppercase tracking-[0.18em] text-moss-deep">404</span>
        <h1 className="m-0 max-w-2xl font-display text-4xl leading-[1.15] text-pine md:text-5xl">
          We couldn&rsquo;t find that page.
        </h1>
        <p className="mt-5 max-w-xl font-body leading-relaxed text-pine-soft">
          It may have moved, or the link may be out of date. Try one of these instead, or tell us
          what you&rsquo;re making and we&rsquo;ll take it from there.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-sm bg-moss-deep px-6 font-body text-sm font-semibold tracking-wide text-bone transition-colors hover:bg-pine"
          >
            Back to home
          </Link>
          <Link
            href="/quote"
            className="inline-flex h-11 items-center justify-center rounded-sm border border-pine px-6 font-body text-sm font-semibold tracking-wide text-pine transition-colors hover:bg-bone"
          >
            Get a Quote
          </Link>
        </div>

        <nav aria-label="Suggested pages" className="mt-12">
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="font-body text-pine underline underline-offset-4 transition-colors hover:text-moss-deep"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
