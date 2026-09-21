"use client";

// The ERP frame: sidebar, header, and the access gate around both.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Gauge, LogOut, Megaphone, Menu, X } from "lucide-react";
import { ERP_SECTIONS, isActive } from "@/lib/erp/nav";
import { useErpSession } from "@/lib/erp/session";
import { supabase } from "@/lib/supabase";
import { Alert, Button } from "./Ui";

const ICONS = { gauge: Gauge, megaphone: Megaphone };

function SidebarContent({ pathname, onNavigate }) {
  return (
    <nav aria-label="ERP sections" className="flex flex-col gap-1 p-3">
      {ERP_SECTIONS.map((section) => {
        const Icon = ICONS[section.icon] ?? Gauge;
        const active = isActive(pathname, section.href);
        return (
          <div key={section.href}>
            <Link
              href={section.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-sm px-3 py-2 font-body text-sm transition-colors ${
                active ? "bg-pine text-bone" : "text-pine-soft hover:bg-pine/6 hover:text-pine"
              }`}
            >
              <Icon size={15} strokeWidth={1.75} aria-hidden />
              {section.label}
            </Link>
            {section.children && active && (
              <div className="mt-1 ml-4 flex flex-col gap-0.5 border-l border-pine/12 pl-3">
                {section.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    onClick={onNavigate}
                    aria-current={isActive(pathname, child.href) ? "page" : undefined}
                    className={`rounded-sm px-2 py-1.5 font-body text-[13px] transition-colors ${
                      isActive(pathname, child.href)
                        ? "font-semibold text-pine"
                        : "text-pine-soft hover:text-pine"
                    }`}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function AccessGate({ status, pathname }) {
  if (status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-paper">
        <p className="font-body text-sm text-pine-soft">Checking your access…</p>
      </div>
    );
  }

  // The sign-in page is on the public site and takes a redirect, so the operator lands back
  // on the screen they asked for instead of the homepage.
  const loginHref = `/account/login?redirect=${encodeURIComponent(pathname ?? "/erp")}`;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper px-6">
      <div className="w-full max-w-md rounded-sm border border-pine/15 bg-bone p-8">
        <h1 className="mb-2 font-display text-2xl text-pine">
          {status === "signed-out" ? "Staff sign-in required" : "No access to the ERP"}
        </h1>
        <p className="mb-6 font-body text-sm text-pine-soft">
          {status === "signed-out"
            ? "This is the internal operations area. Sign in with your Kazi staff account to continue."
            : "Your account is signed in but isn't a staff account. Ask an administrator to grant you employee or admin access."}
        </p>
        {status === "signed-out" ? (
          <Link
            href={loginHref}
            className="inline-flex h-10 items-center rounded-sm bg-moss px-5 font-body text-sm font-semibold text-pine transition-colors hover:bg-moss-deep hover:text-bone"
          >
            Sign in
          </Link>
        ) : (
          <Button variant="secondary" onClick={() => supabase.auth.signOut()}>
            Sign out
          </Button>
        )}
      </div>
    </div>
  );
}

export function ErpShell({ children }) {
  const pathname = usePathname();
  const { status, profile, isStaff } = useErpSession();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!isStaff) return <AccessGate status={status} pathname={pathname} />;

  return (
    <div className="min-h-dvh bg-paper">
      <div className="mx-auto flex max-w-[1600px]">
        {/* Desktop sidebar. Sticky rather than fixed so it scrolls with a long sidebar on
            short viewports instead of trapping items off-screen. */}
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-pine/12 bg-bone lg:block">
          <div className="border-b border-pine/12 px-5 py-4">
            <Link href="/erp" className="font-display text-lg text-pine">
              Kazi <span className="text-pine-soft">ERP</span>
            </Link>
          </div>
          <SidebarContent pathname={pathname} />
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-pine/12 bg-bone px-4 py-3 md:px-6">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-controls="erp-mobile-nav"
                className="rounded-sm p-1.5 text-pine-soft hover:bg-pine/6 hover:text-pine lg:hidden"
              >
                {menuOpen ? <X size={18} /> : <Menu size={18} />}
                <span className="sr-only">{menuOpen ? "Close" : "Open"} navigation</span>
              </button>
              <Link href="/erp" className="font-display text-base text-pine lg:hidden">
                Kazi ERP
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-body text-xs font-semibold text-pine">{profile.full_name ?? profile.email}</p>
                <p className="font-body text-[11px] text-pine-soft capitalize">{profile.role}</p>
              </div>
              <Button variant="ghost" onClick={() => supabase.auth.signOut()} title="Sign out">
                <LogOut size={14} aria-hidden />
                <span className="sr-only">Sign out</span>
              </Button>
            </div>
          </header>

          {menuOpen && (
            <div id="erp-mobile-nav" className="border-b border-pine/12 bg-bone lg:hidden">
              <SidebarContent pathname={pathname} onNavigate={() => setMenuOpen(false)} />
            </div>
          )}

          <div className="px-4 py-6 md:px-6 md:py-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Page header used by every ERP screen, so titles and tab rows line up across modules. */
export function ErpPageHeader({ title, description, children, tabs }) {
  return (
    <header className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-pine md:text-3xl">{title}</h1>
          {description && <p className="mt-1 max-w-2xl font-body text-sm text-pine-soft">{description}</p>}
        </div>
        {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
      </div>
      {tabs && <div className="mt-5 flex flex-wrap gap-1 border-b border-pine/12">{tabs}</div>}
    </header>
  );
}

export function ErpError({ children }) {
  return (
    <Alert tone="error" title="Something went wrong">
      {children}
    </Alert>
  );
}
