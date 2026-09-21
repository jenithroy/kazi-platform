"use client";

import { useEffect, useState } from "react";

/**
 * Runs an async read and tracks its state.
 *
 * Structured so that state is only ever set from a settled promise, never synchronously in
 * the effect body, and so `loading` is derived rather than stored — which keeps it compatible
 * with the React Compiler's rules and removes the classic double-render on every fetch.
 *
 * The last successful result stays on screen while the next one loads, which is what makes
 * changing the date range feel like a filter rather than a page reload: charts dim instead of
 * collapsing into skeletons and jumping the layout.
 */
export function useAsync(run, deps = []) {
  const [reloadToken, setReloadToken] = useState(0);
  // A string key rather than the array itself, so the effect re-runs on value changes and not
  // on every render. It also tags the settled result: a response whose key no longer matches
  // is from a superseded run — clicking through three date presets quickly would otherwise let
  // a slow first response land last and overwrite the range being looked at.
  const key = `${JSON.stringify(deps)}|${reloadToken}`;
  const [settled, setSettled] = useState({ key: null, data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(run)
      .then((data) => {
        if (!cancelled) setSettled({ key, data, error: null });
      })
      .catch((error) => {
        if (!cancelled) setSettled({ key, data: null, error: error?.message ?? String(error) });
      });
    return () => {
      cancelled = true;
    };
    // `run` is a fresh closure every render; `key` is what actually decides when to refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const loading = settled.key !== key;

  return {
    // Previous data is deliberately kept visible while the next request is in flight.
    data: settled.data,
    error: loading ? null : settled.error,
    loading,
    reload: () => setReloadToken((token) => token + 1),
  };
}
