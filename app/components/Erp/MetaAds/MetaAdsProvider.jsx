"use client";

// Module-wide state: which ad account is selected and over what date range.
//
// It lives in the module's layout so it survives navigation between the module's tabs, and
// it is mirrored into the URL so a dashboard someone is looking at can be pasted into a
// message and open on the same numbers.

import { createContext, useCallback, useContext, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAsync } from "@/lib/erp/use-async";
import { listAdAccounts } from "@/lib/meta-ads/api";
import { DEFAULT_PRESET, previousRange, resolveRange } from "@/lib/meta-ads/ranges";

const MetaAdsContext = createContext(null);

export function MetaAdsProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // Bumped after a sync or a write so every screen in the module refetches. Cheaper and
  // far more predictable than each page subscribing to the tables it happens to read.
  const [dataVersion, setDataVersion] = useState(0);

  const accountsState = useAsync(() => listAdAccounts(), [dataVersion]);
  const accounts = accountsState.data ?? [];

  const requestedAccount = params.get("account");
  const account =
    accounts.find((a) => a.account_id === requestedAccount) ??
    accounts.find((a) => a.is_default) ??
    accounts[0] ??
    null;

  const preset = params.get("preset") ?? DEFAULT_PRESET;
  const range = resolveRange(preset, { since: params.get("since"), until: params.get("until") });
  const comparison = previousRange(range);

  // `replace`, not `push`: flipping between presets is refining one view, and filling the
  // back button with every intermediate range makes leaving the page take six presses.
  const updateParams = useCallback(
    (changes) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === undefined || value === "") next.delete(key);
        else next.set(key, value);
      }
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  const value = {
    accounts,
    dataVersion,
    refreshData: () => setDataVersion((v) => v + 1),
    accountsLoading: accountsState.loading,
    accountsError: accountsState.error,
    reloadAccounts: accountsState.reload,
    account,
    currency: account?.currency ?? "USD",
    selectAccount: (accountId) => updateParams({ account: accountId }),
    preset,
    range,
    comparison,
    selectPreset: (id) => updateParams({ preset: id, since: null, until: null }),
    selectCustomRange: (since, until) => updateParams({ preset: "custom", since, until }),
    updateParams,
    params,
  };

  return <MetaAdsContext.Provider value={value}>{children}</MetaAdsContext.Provider>;
}

export function useMetaAds() {
  const ctx = useContext(MetaAdsContext);
  if (!ctx) throw new Error("useMetaAds must be used inside MetaAdsProvider");
  return ctx;
}
