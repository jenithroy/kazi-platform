import Link from "next/link";
import { FacebookLogo, InstagramLogo } from "@phosphor-icons/react/dist/ssr";
import { SITE_FACEBOOK_URL, SITE_INSTAGRAM_URL } from "@/lib/site";

const LINKS = [
  { href: "/collections", label: "Blanks" },
  { href: "/atelier", label: "Design" },
  { href: "/heritage", label: "Services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/quote", label: "Quote" },
];

const LEGAL_LINKS = [
  { href: "/privacy-policy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/cookies", label: "Cookies" },
  { href: "/accessibility", label: "Accessibility" },
];

const SOCIAL_LINKS = [
  { href: SITE_INSTAGRAM_URL, label: "Instagram", Icon: InstagramLogo },
  { href: SITE_FACEBOOK_URL, label: "Facebook", Icon: FacebookLogo },
];

const linkClass =
  "font-body text-[0.8125rem] uppercase tracking-[0.12em] text-bone/70 transition-colors duration-200 hover:text-bone";

export function Footer() {
  return (
    <footer data-nav-theme="dark" className="bg-pine py-12 md:py-16">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-6 md:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <nav aria-label="Footer" className="flex flex-col gap-3">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} className={linkClass}>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-3 md:items-end">
            <a href="mailto:hello@kazimanufacturing.com" className={linkClass}>
              hello@kazimanufacturing.com
            </a>
            <div className="flex items-center gap-4">
              {SOCIAL_LINKS.map(({ href, label, Icon }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="text-bone/70 transition-colors duration-200 hover:text-bone"
                >
                  <Icon size={20} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-bone/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-body text-[0.75rem] text-bone/50">© 2026 Kazi Manufacturing</span>
          <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="font-body text-[0.75rem] text-bone/50 transition-colors hover:text-bone">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
