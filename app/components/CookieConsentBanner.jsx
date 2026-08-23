"use client";

import Link from "next/link";
import { useCookieConsent } from "@/lib/cookie-consent";

export function CookieConsentBanner() {
  const { bannerVisible, accept, reject } = useCookieConsent();

  if (!bannerVisible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-paper-raised bg-bone px-6 py-5 shadow-[0_-4px_24px_rgba(0,0,0,0.12)] sm:px-8"
    >
      <div className="mx-auto flex max-w-[1440px] flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="m-0 max-w-2xl font-body text-sm leading-relaxed text-pine-soft">
          This site currently only sets strictly necessary cookies (sign-in, shopping bag, Atelier
          handoff). If we add analytics or marketing cookies in future, your choice here decides
          whether those run.{" "}
          <Link href="/cookies" className="text-pine underline underline-offset-2 hover:text-moss-deep">
            Cookie Policy
          </Link>
          .
        </p>

        <div className="flex w-full shrink-0 items-center gap-3 sm:w-auto">
          <button
            type="button"
            onClick={reject}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-sm border border-pine/25 px-5 font-body text-sm font-semibold text-pine transition-colors hover:bg-paper-raised sm:flex-none"
          >
            Necessary Only
          </button>
          <button
            type="button"
            onClick={accept}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-sm bg-moss px-5 font-body text-sm font-semibold text-pine transition-colors hover:bg-moss-deep sm:flex-none"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
