"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAsync } from "@/lib/erp/use-async";
import { listAdAccounts } from "@/lib/meta-ads/api";
import { relativeTime } from "@/lib/meta-ads/format";
import { ErpPageHeader } from "./ErpShell";
import { Badge, Card } from "./Ui";

// Channel index. New channels become entries here plus their own folder under
// app/erp/marketing/, which keeps the sidebar from growing a row per vendor.
const PLANNED_CHANNELS = [
  { name: "Google Ads", note: "Not connected" },
  { name: "Email campaigns", note: "Not connected" },
];

export function MarketingHubPage() {
  const { data: accounts, loading } = useAsync(() => listAdAccounts(), []);
  const connected = accounts?.length ?? 0;
  const lastSync = accounts?.map((a) => a.last_synced_at).filter(Boolean).sort().at(-1);

  return (
    <>
      <ErpPageHeader
        title="Marketing"
        description="Acquisition channels, their spend, and the demand they generate."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="sm:col-span-2">
          <Link href="/erp/marketing/meta-ads" className="group flex flex-wrap items-start justify-between gap-4">
            <span className="min-w-0">
              <span className="flex items-center gap-2 font-body text-sm font-semibold text-pine">
                Meta Ads
                <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
              <span className="mt-1 block max-w-xl font-body text-sm text-pine-soft">
                Facebook and Instagram campaigns: performance over any date range, pause and budget
                controls, and quote/order attribution.
              </span>
            </span>
            <span className="flex flex-col items-end gap-1.5">
              {loading ? (
                <Badge>Checking…</Badge>
              ) : connected ? (
                <Badge tone="active">
                  {connected} ad account{connected === 1 ? "" : "s"}
                </Badge>
              ) : (
                <Badge tone="warning">Not connected</Badge>
              )}
              {connected > 0 && (
                <span className="font-body text-[11px] text-pine-soft">Synced {relativeTime(lastSync)}</span>
              )}
            </span>
          </Link>
        </Card>

        {PLANNED_CHANNELS.map((channel) => (
          <Card key={channel.name}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-body text-sm font-semibold text-pine-soft">{channel.name}</p>
              <Badge>{channel.note}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
