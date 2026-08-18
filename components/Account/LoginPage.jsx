"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AccountShell } from "./AccountShell";
import { supabase } from "@/lib/supabase";

const inputClass =
  "w-full rounded-sm border border-pine/15 bg-paper px-3.5 py-2.5 font-body text-sm text-pine transition-colors focus:border-pine focus:outline-none";
const labelClass = "mb-1.5 block font-body text-xs tracking-[0.12em] text-pine-soft uppercase";
const errorClass = "mt-1 font-body text-xs text-red-600";
const filledButton =
  "inline-flex h-11 w-full items-center justify-center rounded-sm bg-moss px-6 font-body text-sm font-semibold tracking-wide text-pine transition-colors hover:bg-moss-deep disabled:cursor-not-allowed disabled:opacity-60";

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const redirectQuery = redirect ? `?redirect=${encodeURIComponent(redirect)}` : "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    const nextErrors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = "Enter a valid email";
    if (!password) nextErrors.password = "Enter your password";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSigningIn(true);
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
      setSigningIn(false);
      return;
    }
    router.push(redirect || "/");
  }

  return (
    <AccountShell>
      <h1 className="mb-1 font-display text-2xl text-pine">Welcome back</h1>
      <p className="mb-8 font-body text-sm text-pine-soft">Sign in to your account</p>

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <div>
          <label className={labelClass} htmlFor="email">Email</label>
          <input id="email" className={inputClass} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          {errors.email && <p className={errorClass}>{errors.email}</p>}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="font-body text-xs tracking-[0.12em] text-pine-soft uppercase" htmlFor="password">Password</label>
            <Link href={`/account/forgot-password${redirectQuery}`} className="font-body text-xs text-moss transition-colors hover:text-moss-deep">
              Forgot password?
            </Link>
          </div>
          <input id="password" className={inputClass} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {errors.password && <p className={errorClass}>{errors.password}</p>}
        </div>

        {authError && <p className={errorClass}>{authError}</p>}

        <button type="submit" disabled={signingIn} className={filledButton}>
          {signingIn ? "Signing In…" : "Sign In"}
        </button>
      </form>

      <p className="mt-6 text-center font-body text-sm text-pine-soft">
        Don&rsquo;t have an account?{" "}
        <Link href={`/account/register${redirectQuery}`} className="text-moss transition-colors hover:text-moss-deep">
          Create account &rarr;
        </Link>
      </p>

      <Link href="/" className="mt-8 inline-flex items-center gap-2 font-body text-sm text-pine-soft transition-colors hover:text-moss">
        <ArrowLeft size={14} strokeWidth={1.5} /> Return home
      </Link>
    </AccountShell>
  );
}
