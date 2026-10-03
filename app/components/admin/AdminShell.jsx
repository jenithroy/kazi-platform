"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, LogOut, Rocket } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { getPublishState, loadProfile, requestPublish } from "@/lib/admin-api";
import { Button, Notice, Spinner, buttonClass } from "@/components/admin/ui";

const AdminContext = createContext(null);

export function useAdmin() {
  return useContext(AdminContext);
}

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/blog", label: "Blog" },
  { href: "/admin/pages", label: "Pages" },
  { href: "/admin/redirects", label: "Redirects" },
  { href: "/admin/settings", label: "Settings" },
];

const STAFF_ROLES = new Set(["admin", "employee"]);

function Logo() {
  return (
    <span
      aria-hidden="true"
      className="block h-9 w-16 bg-pine"
      style={{
        maskImage: "url(/images/logo/kazi-logo-trimmed.png)",
        WebkitMaskImage: "url(/images/logo/kazi-logo-trimmed.png)",
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
  );
}

function GateScreen({ children }) {
  return (
    <main id="main-content" className="flex min-h-dvh items-center justify-center bg-paper px-6">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}

function NavLinks({ pathname, className }) {
  const current = pathname.replace(/\/$/, "") || "/";
  return (
    <nav aria-label="Admin" className={className}>
      {NAV.map((item) => {
        const active = item.href === "/admin" ? current === "/admin" : current.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-sm px-3 py-1.5 font-body text-sm transition-colors ${
              active ? "bg-paper-raised font-semibold text-pine" : "text-pine-soft hover:bg-paper-raised hover:text-pine"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function PublishControl({ publishState, onPublish, publishing }) {
  const pending = publishState && !publishState.error && (publishState.hasChanges || publishState.dueStories.length > 0);
  return (
    <div className="flex items-center gap-3">
      {publishState && !publishState.error && (
        <span className="hidden items-center gap-2 font-body text-xs text-pine-soft lg:inline-flex">
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${pending ? "bg-amber-500" : "bg-moss"}`} />
          {pending ? "Unpublished changes" : "Live site up to date"}
        </span>
      )}
      <Button variant={pending ? "accent" : "outline"} size="sm" busy={publishing} onClick={onPublish}>
        {!publishing && <Rocket size={14} aria-hidden="true" />}
        Publish site
      </Button>
    </div>
  );
}

export function AdminShell({ children }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/admin";
  const [auth, setAuth] = useState({ status: isSupabaseConfigured ? "loading" : "unconfigured" });
  const [publishState, setPublishState] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast] = useState(null);
  const [now, setNow] = useState(0);
  const toastId = useRef(0);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;

    async function resolve(session) {
      if (!session) {
        if (active) setAuth({ status: "signed-out" });
        return;
      }
      try {
        const profile = await loadProfile(session.user.id);
        if (!active) return;
        setAuth(STAFF_ROLES.has(profile.role) ? { status: "ready", profile } : { status: "forbidden", profile });
      } catch (error) {
        if (active) setAuth({ status: "error", message: error.message });
      }
    }

    supabase.auth.getSession().then(({ data }) => resolve(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && active) setAuth({ status: "signed-out" });
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (auth.status !== "signed-out") return;
    const next = `${window.location.pathname}${window.location.search}`;
    router.replace(`/account/login/?redirect=${encodeURIComponent(next)}`);
  }, [auth.status, router]);

  // A clock for "updated 3 hours ago" labels, kept out of render so renders stay pure.
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const interval = setInterval(tick, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, []);

  // Also advances the clock, so anything just saved is judged against the current time.
  const refreshPublishState = useCallback(() => {
    return getPublishState().then(
      (state) => {
        setNow(Date.now());
        setPublishState(state);
      },
      (error) => setPublishState({ error: error.message }),
    );
  }, []);

  useEffect(() => {
    if (auth.status !== "ready") return;
    refreshPublishState();
  }, [auth.status, refreshPublishState]);

  const notify = useCallback((message, tone = "success") => {
    toastId.current += 1;
    setToast({ id: toastId.current, message, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timeout);
  }, [toast]);

  const publish = useCallback(async () => {
    setPublishing(true);
    try {
      await requestPublish();
      notify("Publishing started — the live site updates in about 2–3 minutes.");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setPublishing(false);
      refreshPublishState();
    }
  }, [notify, refreshPublishState]);

  const context = useMemo(
    () =>
      auth.status === "ready"
        ? {
            profile: auth.profile,
            isAdmin: auth.profile.role === "admin",
            now,
            publishState,
            refreshPublishState,
            publish,
            publishing,
            notify,
          }
        : null,
    [auth, now, publishState, refreshPublishState, publish, publishing, notify],
  );

  if (auth.status === "unconfigured") {
    return (
      <GateScreen>
        <Notice tone="warn" title="Supabase isn't connected to this build">
          <p>
            The admin needs <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> set in the
            Cloudflare Pages environment variables, then a redeploy. See <code>docs/seo-admin.md</code> in the repository.
          </p>
        </Notice>
      </GateScreen>
    );
  }

  if (auth.status === "loading" || auth.status === "signed-out") {
    return (
      <GateScreen>
        <div className="flex justify-center">
          <Spinner label={auth.status === "signed-out" ? "Taking you to sign in" : "Checking your account"} />
        </div>
      </GateScreen>
    );
  }

  if (auth.status === "forbidden" || auth.status === "error") {
    return (
      <GateScreen>
        <Notice tone={auth.status === "error" ? "error" : "warn"} title={auth.status === "error" ? "Couldn't open the admin" : "No access"}>
          <p>
            {auth.status === "error"
              ? auth.message
              : `${auth.profile.email} isn't a staff account. An admin can change its role to “employee” or “admin”.`}
          </p>
        </Notice>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={() => supabase.auth.signOut()}>
            Sign out
          </Button>
          <Link href="/" className={buttonClass("ghost")}>
            Back to the site
          </Link>
        </div>
      </GateScreen>
    );
  }

  return (
    <AdminContext.Provider value={context}>
      <div className="min-h-dvh bg-paper">
        <header className="sticky top-0 z-40 border-b border-pine/10 bg-bone/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-4 px-4 md:px-6">
            <Link href="/admin" className="flex items-center gap-3" aria-label="SEO admin home">
              <Logo />
              <span className="hidden font-body text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-pine-soft sm:inline">
                SEO admin
              </span>
            </Link>
            <NavLinks pathname={pathname} className="ml-4 hidden items-center gap-1 md:flex" />
            <div className="ml-auto flex items-center gap-2">
              <PublishControl publishState={publishState} onPublish={publish} publishing={publishing} />
              <a href="/" target="_blank" rel="noopener" className={buttonClass("ghost", "sm")} title="Open the live site in a new tab">
                <ArrowUpRight size={14} aria-hidden="true" />
                <span className="hidden sm:inline">View site</span>
              </a>
              <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()} title={`Signed in as ${auth.profile.email}`}>
                <LogOut size={14} aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">Sign out</span>
              </Button>
            </div>
          </div>
          <NavLinks pathname={pathname} className="flex gap-1 overflow-x-auto border-t border-pine/10 px-4 py-2 md:hidden" />
        </header>

        <main id="main-content" className="mx-auto max-w-[1280px] px-4 py-8 md:px-6 md:py-10">
          {children}
        </main>

        <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-end sm:inset-x-auto sm:right-6">
          {toast && (
            <div
              key={toast.id}
              className={`pointer-events-auto max-w-sm rounded-sm px-4 py-3 font-body text-sm shadow-[0_8px_30px_rgba(10,16,14,0.18)] ${
                toast.tone === "error" ? "bg-red-800 text-white" : "bg-pine text-bone"
              }`}
            >
              {toast.message}
            </div>
          )}
        </div>
      </div>
    </AdminContext.Provider>
  );
}
