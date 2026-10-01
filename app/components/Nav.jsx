"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLenis } from "lenis/react";
import { ArrowRight } from "@phosphor-icons/react";
import { useCart } from "@/lib/cart-context";
import { SITE_PHONE, SITE_PHONE_DIGITS } from "@/lib/site";

const LINKS = [
  { label: "Design", href: "/atelier" },
  { label: "Services", href: "/heritage" },
];

// Shown only in the mobile hamburger menu, not the desktop nav.
const MOBILE_ONLY_LINKS = [{ label: "Video Editing", href: "/video-editing" }];
const MOBILE_LINKS = [...LINKS, ...MOBILE_ONLY_LINKS];

const FOCUSABLE_SELECTOR = "a[href], button:not([disabled])";

function BagIcon({ size }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
      <path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200ZM176,88a48,48,0,0,1-96,0,8,8,0,0,1,16,0,32,32,0,0,0,64,0,8,8,0,0,1,16,0Z"></path>
    </svg>
  );
}

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
  // Close the menu on any navigation, including browser back/forward, which the links' own
  // onClick handlers never see.
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }
  const { totalItems, openCart } = useCart();
  const lenis = useLenis();
  const headerRef = useRef(null);
  const menuButtonRef = useRef(null);
  const firstMenuLinkRef = useRef(null);

  // The open menu covers the whole screen below the bar, so while it's open: the page behind
  // stops scrolling (Lenis needs its own stop(), see CartDrawer), Tab stays within the header,
  // Escape closes it and returns focus to the toggle button, and opening moves focus to the
  // first link so keyboard users land somewhere useful.
  useEffect(() => {
    if (!menuOpen) return;
    lenis?.stop();
    document.body.style.overflow = "hidden";
    firstMenuLinkRef.current?.focus();

    function onKeyDown(e) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (e.key !== "Tab" || !headerRef.current) return;
      // Only what's rendered: the desktop links and bag button are display:none at this size.
      const focusable = [...headerRef.current.querySelectorAll(FOCUSABLE_SELECTOR)].filter(
        (el) => el.getClientRects().length > 0,
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    // The menu is md:hidden, so close it if the viewport widens past that (e.g. a rotated
    // tablet) instead of leaving the page scroll-locked behind a panel nobody can see.
    const desktop = window.matchMedia("(min-width: 768px)");
    function onDesktop(e) {
      if (e.matches) setMenuOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onDesktop);
    return () => {
      lenis?.start();
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onDesktop);
    };
  }, [menuOpen, lenis]);

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
  // bone (over everything else, and always while the menu is open so the bar and the menu
  // read as one sheet) — the latter two share the hero's light text treatment.
  const solid = scrolled || menuOpen;
  const isLight = menuOpen || (scrolled && !dark);
  const linkColor = isLight ? "text-pine" : "text-white [text-shadow:0_1px_10px_rgba(10,16,14,0.35)]";
  const iconColor = isLight ? "text-pine" : "text-bone drop-shadow-[0_1px_6px_rgba(10,16,14,0.45)]";
  const accountIconColor = isLight ? "text-pine" : "text-white drop-shadow-[0_1px_6px_rgba(10,16,14,0.45)]";
  // The open menu has to cover the cookie banner (z-[60]) but stay under the bag (z-[70]),
  // which can be opened from inside the menu.
  const layer = menuOpen ? "z-[65]" : "z-50";

  return (
    <header
      ref={headerRef}
      className={`fixed inset-x-0 top-0 ${layer} h-[var(--nav-height)] transition-[background-color,box-shadow] duration-300 ${
        isLight
          ? "bg-bone shadow-[0_1px_0_rgba(28,43,74,0.08)]"
          : solid
            ? "bg-pine shadow-[0_1px_0_rgba(0,0,0,0.15)]"
            : ""
      }`}
    >
      {!solid && (
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
              className={`font-display text-base tracking-wide transition-colors duration-300 hover:opacity-75 ${linkColor}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/"
          aria-label="Kazi Manufacturing home"
          onClick={() => setMenuOpen(false)}
          className={`col-start-1 h-20 w-32 justify-self-start transition-colors duration-300 md:col-start-2 md:justify-self-center ${
            isLight ? "bg-pine" : "bg-bone drop-shadow-[0_1px_10px_rgba(10,16,14,0.55)]"
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
          {scrolled && !menuOpen && (
            <Link
              href="/quote"
              className={`inline-flex h-10 items-center whitespace-nowrap rounded-sm border px-5 font-body text-[0.9rem] font-semibold transition-all duration-200 hover:-translate-y-px ${
                isLight
                  ? "border-transparent bg-pine text-bone shadow-[0_2px_12px_rgba(0,0,0,0.18)] hover:bg-pine-soft"
                  : "border-white/30 bg-transparent text-white hover:bg-white hover:text-pine"
              }`}
            >
              Get a Quote
            </Link>
          )}

          <Link
            href="/account/login"
            aria-label="Account"
            onClick={() => setMenuOpen(false)}
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
            <BagIcon size={20} />
            {totalItems > 0 && (
              <span className="absolute top-0.5 right-0.5 inline-flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-moss px-[3px] font-body text-[0.625rem] font-semibold leading-none text-pine">
                {totalItems}
              </span>
            )}
          </button>

          <button
            ref={menuButtonRef}
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
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
        <div
          id="mobile-menu"
          className="fixed inset-x-0 top-[var(--nav-height)] bottom-0 flex flex-col overflow-y-auto overscroll-contain bg-bone px-6 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] motion-safe:animate-menu-in md:hidden"
        >
          <nav aria-label="Menu">
            <ul className="m-0 list-none p-0">
              {MOBILE_LINKS.map((link, index) => {
                const current = pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <li
                    key={link.label}
                    className="border-b border-pine/10 motion-safe:animate-menu-item-in"
                    style={{ animationDelay: `${60 + index * 60}ms` }}
                  >
                    <Link
                      ref={index === 0 ? firstMenuLinkRef : undefined}
                      href={link.href}
                      aria-current={current ? "page" : undefined}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-start gap-4 py-5 text-pine"
                    >
                      <span aria-hidden="true" className="w-5 shrink-0 pt-1 font-body text-xs tabular-nums text-moss">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className={`font-display text-[2.5rem] leading-none ${current ? "italic" : ""}`}>
                        {link.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div
            className="mt-auto flex flex-col gap-7 pt-10 motion-safe:animate-menu-item-in"
            style={{ animationDelay: `${60 + MOBILE_LINKS.length * 60}ms` }}
          >
            <Link
              href="/quote"
              onClick={() => setMenuOpen(false)}
              className="inline-flex h-13 items-center justify-center gap-2 rounded-sm bg-pine px-6 font-body text-base font-semibold text-bone transition-colors hover:bg-pine-soft"
            >
              Get a Quote
              <ArrowRight size={18} weight="bold" aria-hidden="true" />
            </Link>

            <div className="flex items-end justify-between gap-6">
              <div className="flex flex-col gap-1.5">
                <span className="mb-1 flex items-center gap-2 font-body text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-pine-soft">
                  <span aria-hidden="true" className="h-1 w-1 rounded-full bg-moss" />
                  Get in touch
                </span>
                <a href="mailto:hello@kazimanufacturing.com" className="w-fit font-body text-[0.95rem] text-pine">
                  hello@kazimanufacturing.com
                </a>
                <a href={`tel:+${SITE_PHONE_DIGITS}`} className="w-fit font-body text-[0.95rem] text-pine">
                  {SITE_PHONE}
                </a>
              </div>

              {/* The bar's bag button is desktop-only, so this is the way back to the bag on phones. */}
              <button
                type="button"
                onClick={() => {
                  // This button unmounts with the menu; hand focus to the toggle first so the
                  // bag restores focus there when it closes.
                  menuButtonRef.current?.focus();
                  setMenuOpen(false);
                  openCart();
                }}
                className="inline-flex shrink-0 items-center gap-2 font-body text-[0.95rem] text-pine"
              >
                <BagIcon size={18} />
                Bag{totalItems > 0 ? ` (${totalItems})` : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
