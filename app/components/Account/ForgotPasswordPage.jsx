"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { AccountShell } from "./AccountShell";
import { supabase } from "@/lib/supabase";

const inputClass =
  "w-full rounded-sm border border-pine/15 bg-paper px-3.5 py-2.5 font-body text-sm text-pine transition-colors focus:border-pine focus:outline-none";
const labelClass = "mb-1.5 block font-body text-xs tracking-[0.12em] text-pine-soft uppercase";
const errorClass = "mt-1 font-body text-xs text-red-600";
const filledButton =
  "inline-flex h-11 w-full items-center justify-center rounded-sm bg-moss px-6 font-body text-sm font-semibold tracking-wide text-pine transition-colors hover:bg-moss-deep disabled:cursor-not-allowed disabled:opacity-60";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email");
      return;
    }
    setError(null);
    setSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/account/login`,
    });
    setSubmitting(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSubmittedEmail(email);
  }

  if (submittedEmail) {
    return (
      <AccountShell>
        <div className="text-center">
          <span className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-moss/15 text-moss">
            <Mail size={22} strokeWidth={2} />
          </span>
          <h1 className="mb-3 font-display text-2xl text-pine">Check your email</h1>
          <p className="mb-8 font-body text-sm text-pine-soft">
            We&rsquo;ve sent a password reset link to {submittedEmail}.
          </p>
          <Link href="/account/login" className="font-body text-sm text-moss transition-colors hover:text-moss-deep">
            Back to login &rarr;
          </Link>
        </div>
      </AccountShell>
    );
  }

  return (
    <AccountShell>
      <h1 className="mb-1 font-display text-2xl text-pine">Forgot your password?</h1>
      <p className="mb-8 font-body text-sm text-pine-soft">Enter your email and we&rsquo;ll send you a reset link.</p>

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <div>
          <label className={labelClass} htmlFor="email">Email</label>
          <input id="email" className={inputClass} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          {error && <p className={errorClass}>{error}</p>}
        </div>

        <button type="submit" disabled={submitting} className={filledButton}>
          {submitting ? "Sending…" : "Send Reset Link"}
        </button>
      </form>

      <Link href="/account/login" className="mt-6 inline-flex items-center gap-2 font-body text-sm text-pine-soft transition-colors hover:text-moss">
        <ArrowLeft size={14} strokeWidth={1.5} /> Back to login
      </Link>
    </AccountShell>
  );
}
