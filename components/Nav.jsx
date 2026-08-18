"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart-context";

const LINKS = [
  { label: "Atelier", href: "/atelier" },
  { label: "Our Heritage", href: "/heritage" },
];

export function Nav() {
  // Only the homepage opens on a dark, full-bleed hero image — every other route starts on
  // plain page content, so the transparent/white-text treatment below has nothing dark to
  // read against. Everywhere else the nav should look "scrolled" (solid, dark-on-light) from
  // the very first paint.
  const pathname = usePathname();
  const isHome = pathname === "/";

  const [scrolled, setScrolled] = useState(!isHome);
  // Sections with a solid #1B3A2B background (marked `data-nav-theme="dark"`) read as
  // near-invisible seams when the nav is the usual bone bar — so we sample whatever's
  // sitting right under the nav and flip it to match instead of leaving a hard edge.
  const [dark, setDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { totalItems, openCart } = useCart();

  useEffect(() => {
    function onScroll() {
      const scrollY = window.scrollY;
      const pastHero = isHome ? scrollY > 24 : true;
      setScrolled(pastHero);

      if (!pastHero || typeof document.elementFromPoint !== "function") {
        setDark(false);
        return;
      }

      const navHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-height")) || 88;
      // Probe just below the nav's own bottom edge so we hit the page content sitting
      // behind it, not the nav bar itself.
      const el = document.elementFromPoint(window.innerWidth / 2, navHeight + 4);
      setDark(el?.closest('[data-nav-theme="dark"]') != null);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [isHome]);

  // Three looks: transparent hero (top of page), solid pine (over a dark section), solid
  // bone (over everything else) — the latter two share the hero's light text treatment.
  const isLight = scrolled && !dark;
  const linkColor = isLight ? "text-pine" : "text-white [text-shadow:0_1px_10px_rgba(10,16,14,0.35)]";
  const iconColor = isLight ? "text-pine" : "text-bone drop-shadow-[0_1px_6px_rgba(10,16,14,0.45)]";
  const accountIconColor = isLight ? "text-pine" : "text-white drop-shadow-[0_1px_6px_rgba(10,16,14,0.45)]";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 h-[var(--nav-height)] transition-[background-color,box-shadow] duration-300 ${
        isLight
          ? "bg-bone shadow-[0_1px_0_rgba(28,43,74,0.08)]"
          : scrolled
            ? "bg-pine shadow-[0_1px_0_rgba(0,0,0,0.15)]"
            : ""
      }`}
    >
      {!scrolled && (
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            height: "calc(var(--nav-height) + 56px)",
            background:
              "linear-gradient(rgba(10,16,14,0.32) 0%, rgba(10,16,14,0.14) 55%, rgba(10,16,14,0) 100%)",
          }}
        />
      )}

      <div className="mx-auto grid h-full max-w-[1440px] grid-cols-[auto_1fr] items-center px-6 md:grid-cols-[1fr_auto_1fr] md:px-8">
        <nav aria-label="Primary" className="col-start-1 hidden gap-7 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`font-body text-[0.9rem] font-medium tracking-wide transition-colors duration-300 hover:opacity-75 ${linkColor}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/"
          aria-label="Kazi Manufacturing home"
          className={`col-start-1 h-16 w-28 justify-self-start transition-colors duration-300 md:col-start-2 md:justify-self-center ${
            isLight ? "bg-pine" : "bg-bone drop-shadow-[0_1px_6px_rgba(10,16,14,0.4)]"
          }`}
          style={{
            maskImage: "url(/images/logo/kazi-logo-trimmed.png)",
            WebkitMaskImage: "url(/images/logo/kazi-logo-trimmed.png)",
            maskPosition: "center",
            WebkitMaskPosition: "center",
            maskSize: "contain",
            WebkitMaskSize: "contain",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
          }}
        />

        <div className="col-start-2 flex items-center justify-self-end gap-4 md:col-start-3">
          {scrolled && (
            <Link
              href="/quote"
              className={`inline-flex h-10 items-center whitespace-nowrap rounded-sm border px-5 font-body text-[0.9rem] font-semibold shadow-[0_2px_12px_rgba(0,0,0,0.18)] transition-all duration-200 hover:-translate-y-px ${
                isLight
                  ? "border-transparent bg-pine text-bone hover:bg-pine-soft"
                  : "border-white/30 bg-bone text-pine hover:bg-white"
              }`}
            >
              Get a Quote
            </Link>
          )}

          <Link
            href="/account/login"
            aria-label="Account"
            className={`inline-flex h-9 w-9 items-center justify-center transition-colors duration-300 hover:opacity-75 ${accountIconColor}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
              <path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z"></path>
            </svg>
          </Link>

          <button
            type="button"
            aria-label={`Bag${totalItems > 0 ? ` (${totalItems} items)` : ""}`}
            onClick={openCart}
            className={`relative hidden h-9 w-9 items-center justify-center transition-colors duration-300 hover:opacity-75 md:inline-flex ${iconColor}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
              <path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200ZM176,88a48,48,0,0,1-96,0,8,8,0,0,1,16,0,32,32,0,0,0,64,0,8,8,0,0,1,16,0Z"></path>
            </svg>
            {totalItems > 0 && (
              <span className="absolute top-0.5 right-0.5 inline-flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-moss px-[3px] font-body text-[0.625rem] font-semibold leading-none text-pine">
                {totalItems}
              </span>
            )}
          </button>

          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className={`inline-flex h-9 w-9 items-center justify-center transition-colors duration-300 md:hidden ${iconColor}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 256 256">
              {menuOpen ? (
                <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z" />
              ) : (
                <path d="M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM40,72H216a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16ZM216,184H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Z"></path>
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="flex flex-col gap-1 bg-bone px-6 pb-5 shadow-[0_1px_0_rgba(28,43,74,0.08)] md:hidden">
          {LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="border-b border-paper-raised py-2.5 font-body text-base font-medium text-pine"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/quote"
            onClick={() => setMenuOpen(false)}
            className="mt-3 inline-flex h-10 items-center justify-center rounded-sm bg-pine px-5 font-body text-sm font-semibold text-bone"
          >
            Get a Quote
          </Link>
        </div>
      )}
    </header>
  );
}
