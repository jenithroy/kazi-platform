"use client";

import { useState } from "react";
import { Link2, RefreshCw, Trash2 } from "lucide-react";
import { useAsync } from "@/lib/erp/use-async";
import { useErpSession } from "@/lib/erp/session";
import {
  connectRedirectUri,
  disconnectMeta,
  fetchSyncRuns,
  refreshAdAccounts,
  setDefaultAccount,
  startOAuth,
  syncNow,
} from "@/lib/meta-ads/api";
import { dateTime, humanEnum, relativeTime } from "@/lib/meta-ads/format";
import { ErpPageHeader } from "../ErpShell";
import { Alert, Badge, Button, Card, Field, Select, Spinner, Table, Td, Th, Tr } from "../Ui";
import { MetaAdsTabs } from "./ModuleChrome";
import { useMetaAds } from "./MetaAdsProvider";

// Survives the round trip to Meta and back so the callback can prove the response belongs to
// the request this browser started.
const STATE_KEY = "kazi-meta-oauth-state";

const SYNC_WINDOWS = [7, 30, 60, 90];

function statusTone(status) {
  if (status === "success") return "active";
  if (status === "running") return "warning";
  if (status === "failed") return "error";
  return "neutral";
}

export function MetaAdsSettingsPage() {
  const { accounts, account, accountsLoading, refreshData, dataVersion } = useMetaAds();
  const { isAdmin } = useErpSession();
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [syncDays, setSyncDays] = useState(30);

  const runs = useAsync(() => fetchSyncRuns(null, 10), [dataVersion]);

  async function run(key, work, successMessage) {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      const result = await work();
      if (successMessage) setNotice(typeof successMessage === "function" ? successMessage(result) : successMessage);
      refreshData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function connect() {
    setBusy("connect");
    setError(null);
    try {
      // A random state is generated here, kept in sessionStorage, and compared on return —
      // the standard CSRF guard for an OAuth flow that finishes in the browser.
      const state = crypto.randomUUID();
      sessionStorage.setItem(STATE_KEY, state);
      const { url } = await startOAuth({ redirectUri: connectRedirectUri(), state });
      window.location.assign(url);
    } catch (err) {
      setError(err.message);
      setBusy(null);
    }
  }

  return (
    <>
      <ErpPageHeader
        title="Meta Ads settings"
        description="Connection, ad account selection, and sync history."
        tabs={<MetaAdsTabs />}
      />

      {error && (
        <div className="mb-4">
          <Alert tone="error" title="That didn't work" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        </div>
      )}
      {notice && (
        <div className="mb-4">
          <Alert tone="success" onDismiss={() => setNotice(null)}>
            {notice}
          </Alert>
        </div>
      )}
      {!isAdmin && (
        <div className="mb-4">
          <Alert tone="info">
            Connecting, disconnecting and changing the default ad account are admin-only. You can still run a sync.
          </Alert>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Connection" subtitle="One Meta login serves the whole ERP">
          {accountsLoading ? (
            <Spinner label="Checking connection" />
          ) : accounts.length === 0 ? (
            <>
              <p className="mb-4 font-body text-sm text-pine-soft">
                No ad account is connected. An admin signs in with a Meta user that has access to the business&rsquo;s
                ad accounts; the ERP stores an encrypted token and never exposes it to the browser.
              </p>
              <Button variant="primary" onClick={connect} busy={busy === "connect"} disabled={!isAdmin}>
                <Link2 size={13} aria-hidden />
                Connect Meta account
              </Button>
            </>
          ) : (
            <>
              <ul className="mb-4 space-y-2">
                {accounts.map((a) => (
                  <li
                    key={a.account_id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-pine/12 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-body text-sm text-pine">{a.name}</p>
                      <p className="font-body text-[11px] text-pine-soft">
                        {a.account_id} · {a.currency}
                        {a.business_name ? ` · ${a.business_name}` : ""} · synced {relativeTime(a.last_synced_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {a.account_status === 1 ? (
                        <Badge tone="active">Active</Badge>
                      ) : (
                        <Badge tone="warning">Status {a.account_status ?? "?"}</Badge>
                      )}
                      {a.is_default ? (
                        <Badge tone="active">Default</Badge>
                      ) : (
                        <Button
                          onClick={() =>
                            run("default", () => setDefaultAccount(a.account_id), `${a.name} is now the default.`)
                          }
                          busy={busy === "default"}
                          disabled={!isAdmin}
                        >
                          Make default
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => run("refresh", refreshAdAccounts, "Ad account list refreshed.")}
                  busy={busy === "refresh"}
                  disabled={!isAdmin}
                >
                  <RefreshCw size={13} aria-hidden />
                  Refresh account list
                </Button>
                <Button variant="secondary" onClick={connect} busy={busy === "connect"} disabled={!isAdmin}>
                  <Link2 size={13} aria-hidden />
                  Reconnect
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    // Reporting history is kept deliberately, so the only thing at risk here is
                    // the token — still worth a confirm, since every sync stops until someone
                    // reconnects.
                    if (!window.confirm("Disconnect Meta? Synced history is kept, but syncing stops until an admin reconnects.")) return;
                    run("disconnect", disconnectMeta, "Meta connection removed.");
                  }}
                  busy={busy === "disconnect"}
                  disabled={!isAdmin}
                >
                  <Trash2 size={13} aria-hidden />
                  Disconnect
                </Button>
              </div>
            </>
          )}
        </Card>

        <Card title="Sync" subtitle="Pull campaigns and daily performance from Meta">
          <p className="mb-4 font-body text-sm text-pine-soft">
            A sync re-pulls the whole window, not just new days: Meta keeps revising recent spend and conversion
            figures, so the last few days change after the fact.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Window" htmlFor="sync-days">
              <Select
                id="sync-days"
                value={syncDays}
                onChange={(e) => setSyncDays(Number(e.target.value))}
                className="h-9 w-auto py-0"
              >
                {SYNC_WINDOWS.map((days) => (
                  <option key={days} value={days}>
                    Last {days} days
                  </option>
                ))}
              </Select>
            </Field>
            <Button
              variant="primary"
              onClick={() =>
                run(
                  "sync",
                  () => syncNow({ accountId: account?.account_id, days: syncDays }),
                  (result) =>
                    `Synced ${result?.counts?.campaigns ?? 0} campaigns and ${
                      result?.counts?.insights_campaign ?? 0
                    } campaign-days.`,
                )
              }
              busy={busy === "sync"}
              disabled={accounts.length === 0}
            >
              <RefreshCw size={13} aria-hidden />
              Sync now
            </Button>
          </div>
          <p className="mt-4 font-body text-xs text-pine-soft">
            A nightly sync is set up separately as a scheduled call to the <code className="font-mono">meta-sync</code>{" "}
            function — see <code className="font-mono">docs/meta-ads.md</code>.
          </p>
        </Card>

        <Card
          title="Ad URL tracking"
          subtitle="Add these to an ad's destination URL so quotes can be tied to the campaign that paid for them"
          className="lg:col-span-2"
        >
          <p className="mb-3 font-body text-sm text-pine-soft">
            Meta substitutes the values at click time. Without them, attribution falls back to matching{" "}
            <code className="font-mono text-xs">utm_campaign</code> against the campaign name, which breaks as soon as
            a campaign is renamed.
          </p>
          <pre className="overflow-x-auto rounded-sm border border-pine/12 bg-paper-raised px-3 py-2.5 font-mono text-xs text-pine">
{`?utm_source=facebook&utm_medium=paid_social
  &utm_campaign={{campaign.name}}
  &utm_content={{ad.name}}
  &kz_campaign={{campaign.id}}
  &kz_ad={{ad.id}}`}
          </pre>
        </Card>

        <Card title="Recent syncs" bodyClassName="px-0 py-0" className="lg:col-span-2">
          {runs.loading && !runs.data ? (
            <Spinner label="Loading sync history" />
          ) : (runs.data ?? []).length === 0 ? (
            <p className="px-5 py-8 text-center font-body text-sm text-pine-soft">Nothing has been synced yet.</p>
          ) : (
            <Table
              caption="Recent sync runs"
              head={
                <>
                  <Th>Started</Th>
                  <Th>Trigger</Th>
                  <Th>Range</Th>
                  <Th>Status</Th>
                  <Th>Result</Th>
                </>
              }
            >
              {(runs.data ?? []).map((runRow) => (
                <Tr key={runRow.id}>
                  <Td>{dateTime(runRow.started_at)}</Td>
                  <Td>{humanEnum(runRow.trigger)}</Td>
                  <Td>
                    <span className="font-body text-xs text-pine-soft">
                      {runRow.date_from} → {runRow.date_to}
                    </span>
                  </Td>
                  <Td>
                    <Badge tone={statusTone(runRow.status)}>{humanEnum(runRow.status)}</Badge>
                  </Td>
                  <Td>
                    {runRow.error ? (
                      <span className="font-body text-xs text-red-700">{runRow.error}</span>
                    ) : (
                      <span className="font-body text-xs text-pine-soft">
                        {Object.entries(runRow.counts ?? {})
                          .map(([key, value]) => `${value} ${key.replace("insights_", "")}`)
                          .join(" · ") || "—"}
                      </span>
                    )}
                  </Td>
                </Tr>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
