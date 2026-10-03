"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { SITE_EMAIL } from "@/lib/site";

// Where the unsubscribe link in outreach emails lands. The edge function checks the signed
// token; this page only confirms what it's about to do.

async function call(token, method) {
  const { data, error } = await supabase.functions.invoke(`outreach-unsubscribe?t=${encodeURIComponent(token)}`, {
    method,
    ...(method === "POST" ? { body: { t: token } } : {}),
  });
  if (error) {
    let message = "This unsubscribe link didn't work.";
    try {
      const details = await error.context?.json?.();
      if (details?.error) message = details.error;
    } catch {
      // keep the generic message
    }
    throw new Error(message);
  }
  return data;
}

export function UnsubscribePage() {
  const token = useSearchParams().get("t") ?? "";
  const [state, setState] = useState({ status: "loading" });

  useEffect(() => {
    if (!token || !isSupabaseConfigured) return;
    let active = true;
    call(token, "GET").then(
      (data) => active && setState(data.unsubscribed ? { status: "done", email: data.email } : { status: "confirm", email: data.email }),
      (error) => active && setState({ status: "error", message: error.message }),
    );
    return () => {
      active = false;
    };
  }, [token]);

  async function confirm() {
    setState((current) => ({ ...current, status: "working" }));
    try {
      const data = await call(token, "POST");
      setState({ status: "done", email: data.email });
    } catch (error) {
      setState({ status: "error", message: error.message });
    }
  }

  const view = !token
    ? { status: "error", message: "This page needs the link from the email." }
    : !isSupabaseConfigured
      ? { status: "error", message: "Unsubscribing isn't available right now." }
      : state;

  return (
    // The site layout already provides <main> (components/PageMain.jsx).
    <section className="flex min-h-[70dvh] items-center justify-center bg-paper px-6 py-20">
      <div className="w-full max-w-md rounded-sm border border-pine/15 bg-bone p-8 text-center">
        <h1 className="m-0 font-display text-3xl text-pine">Unsubscribe</h1>
        {view.status === "loading" && <p className="m-0 mt-4 font-body text-sm text-pine-soft">Checking your link…</p>}
        {(view.status === "confirm" || view.status === "working") && (
          <>
            <p className="m-0 mt-4 font-body text-sm leading-relaxed text-pine-soft">
              Stop emails from Kazi Manufacturing to <strong className="text-pine">{view.email ?? "this address"}</strong>?
            </p>
            <button
              type="button"
              onClick={confirm}
              disabled={view.status === "working"}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-sm bg-pine px-6 font-body text-sm font-semibold text-bone transition-colors hover:bg-pine-soft disabled:opacity-60"
            >
              {view.status === "working" ? "Unsubscribing…" : "Unsubscribe"}
            </button>
          </>
        )}
        {view.status === "done" && (
          <p role="status" className="m-0 mt-4 font-body text-sm leading-relaxed text-pine">
            Done — we won&rsquo;t email {view.email ?? "you"} again. Sorry for the interruption.
          </p>
        )}
        {view.status === "error" && (
          <p role="alert" className="m-0 mt-4 font-body text-sm leading-relaxed text-pine-soft">
            {view.message} You can also reply to the email with &ldquo;unsubscribe&rdquo;, or write to{" "}
            <a href={`mailto:${SITE_EMAIL}?subject=Unsubscribe`} className="text-pine underline underline-offset-2">
              {SITE_EMAIL}
            </a>
            , and we&rsquo;ll remove you.
          </p>
        )}
      </div>
    </section>
  );
}
