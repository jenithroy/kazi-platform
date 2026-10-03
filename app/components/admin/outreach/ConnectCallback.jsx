"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { completeConnection } from "@/lib/outreach-api";
import { Notice, PageHeader, Spinner, buttonClass } from "@/components/admin/ui";

// Google sends people back here after they approve (or decline) access. Each code works
// once, so remember the ones already handled — React runs effects twice in development.
const handled = new Map();

export function ConnectCallback() {
  const params = useSearchParams();
  const router = useRouter();
  const code = params.get("code");
  const state = params.get("state");
  const denied = params.get("error");
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (denied || !code || !state) return;
    if (!handled.has(code)) handled.set(code, completeConnection(code, state));
    let active = true;
    handled.get(code).then(
      (data) => {
        if (!active) return;
        setResult({ ok: true, email: data.email });
        setTimeout(() => router.replace("/admin/outreach/mailboxes"), 2500);
      },
      (error) => active && setResult({ ok: false, message: error.message }),
    );
    return () => {
      active = false;
    };
  }, [code, state, denied, router]);

  const failure = denied
    ? denied === "access_denied"
      ? "Access wasn't granted, so nothing was connected."
      : `Google returned an error: ${denied}`
    : !code || !state
      ? "This page is opened by Google after you sign in. Start from Mailboxes."
      : result && !result.ok
        ? result.message
        : null;

  return (
    <>
      <PageHeader title="Connecting a mailbox" />
      {failure ? (
        <>
          <Notice tone="error">{failure}</Notice>
          <Link href="/admin/outreach/mailboxes" className={`${buttonClass("outline")} mt-6`}>
            Back to Mailboxes
          </Link>
        </>
      ) : result?.ok ? (
        <Notice tone="success" title={`Connected ${result.email}`}>
          <p>Taking you back to Mailboxes to check the sender name and signature…</p>
        </Notice>
      ) : (
        <Spinner label="Finishing the connection with Google" />
      )}
    </>
  );
}
