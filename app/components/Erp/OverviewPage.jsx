"use client";

import Link from "next/link";
import { ArrowRight, Megaphone } from "lucide-react";
import { ErpPageHeader } from "./ErpShell";
import { Card } from "./Ui";

// Deliberately thin. The ERP's operational modules (quotes, production, messaging) already
// have their data model in place from earlier migrations but no internal UI yet, so this
// page lists what is actually usable today rather than inventing dashboard tiles that
// aren't wired to anything.
export function ErpOverviewPage() {
  return (
    <>
      <ErpPageHeader
        title="Operations"
        description="Internal tools for the Kazi team. Marketing is live; the remaining modules are still on the public-site data model only."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <Link href="/erp/marketing" className="group flex items-start gap-3">
            <span className="mt-0.5 rounded-sm bg-moss/15 p-2 text-moss-deep">
              <Megaphone size={16} strokeWidth={1.75} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 font-body text-sm font-semibold text-pine">
                Marketing
                <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
              <span className="mt-1 block font-body text-sm text-pine-soft">
                Meta Ads performance, campaign controls, and how ad spend maps onto quote requests and
                orders.
              </span>
            </span>
          </Link>
        </Card>

        <Card>
          <p className="font-body text-sm font-semibold text-pine">Quotes, production, messaging</p>
          <p className="mt-1 font-body text-sm text-pine-soft">
            These run on the public site and Supabase today. They have no internal screens yet — the
            tables and roles exist, the ERP views don&rsquo;t.
          </p>
        </Card>
      </div>
    </>
  );
}
