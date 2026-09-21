"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { completeOAuth, connectRedirectUri } from "@/lib/meta-ads/api";
import { ErpPageHeader } from "../ErpShell";
import { Alert, Card, Spinner } from "../Ui";

const STATE_KEY = "kazi-meta-oauth-state";

/**
 * Where Meta returns the operator after they approve access.
 *
 * The page's only job is to hand the authorization code to the edge function — the code is
 * useless without the app secret, which lives only there. It is also the last point where the
 * `state` round trip can be checked, so a code arriving from a flow this browser never started
 * is rejected before it is exchanged.
 */
export function MetaAdsConnectCallbackPage() {
  const params = useSearchParams();
  const [result, setResult] = useState(null);
  // Exchange once even though React's development double-invoke would otherwise fire twice:
  // an authorization code is single-use, and a second attempt fails in a way that looks like
  // a bug in the connection rather than a repeated call.
  const started = useRef(false);

  const code = params.get("code");
  const returnedState = params.get("state");
  // Meta reports a refused or cancelled authorisation in the query string rather than by
  // withholding the redirect, so this is a legitimate outcome, not a crash.
  const metaError = params.get("error_description") ?? params.get("error");

  useEffect(() => {
    if (started.current || metaError || !code) return;
    started.current = true;

    // The whole flow runs inside the promise chain so every state update happens from a
    // settled promise — including the state-mismatch rejection.
    Promise.resolve()
      .then(() => {
        let expected = null;
        try {
          expected = sessionStorage.getItem(STATE_KEY);
          sessionStorage.removeItem(STATE_KEY);
        } catch {
          // storage blocked — falls into the mismatch branch below
        }
        if (!expected || expected !== returnedState) {
          throw new Error(
            "This connection response doesn't match a request from this browser. Start the connection again from settings.",
          );
        }
        return completeOAuth({ code, redirectUri: connectRedirectUri() });
      })
      .then((data) =>
        setResult({
          phase: "done",
          message: `Connected as ${data.connected_as}. ${data.accounts?.length ?? 0} ad account${
            data.accounts?.length === 1 ? "" : "s"
          } available.`,
        }),
      )
      .catch((error) => setResult({ phase: "error", message: error.message }));
  }, [code, returnedState, metaError]);

  // Derived rather than stored: these two outcomes are visible in the URL itself.
  const state = metaError
    ? { phase: "error", message: metaError }
    : !code
      ? { phase: "error", message: "Meta didn't return an authorization code." }
      : (result ?? { phase: "working", message: null });

  return (
    <>
      <ErpPageHeader title="Connecting Meta" />
      <Card className="max-w-xl">
        {state.phase === "working" && <Spinner label="Finishing the connection" />}
        {state.phase === "done" && (
          <>
            <Alert tone="success" title="Meta connected">
              {state.message}
            </Alert>
            <p className="mt-4 font-body text-sm text-pine-soft">
              Next: run a sync to pull campaigns and daily performance into the ERP.
            </p>
          </>
        )}
        {state.phase === "error" && (
          <Alert tone="error" title="Connection failed">
            {state.message}
          </Alert>
        )}
        <p className="mt-5">
          <Link href="/erp/marketing/meta-ads/settings" className="font-body text-sm text-moss-deep hover:underline">
            Back to Meta Ads settings
          </Link>
        </p>
      </Card>
    </>
  );
}
