"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Mail } from "lucide-react";
import { AccountShell } from "./AccountShell";
import { supabase } from "@/lib/supabase";

const inputClass =
  "w-full rounded-sm border border-pine/15 bg-paper px-3.5 py-2.5 font-body text-sm text-pine transition-colors focus:border-pine focus:outline-none";
const labelClass = "mb-1.5 block font-body text-xs tracking-[0.12em] text-pine-soft uppercase";
const errorClass = "mt-1 font-body text-xs text-red-600";
const filledButton =
  "inline-flex h-11 w-full items-center justify-center rounded-sm bg-moss px-6 font-body text-sm font-semibold tracking-wide text-pine transition-colors hover:bg-moss-deep disabled:cursor-not-allowed disabled:opacity-60";

function validate(form) {
  const errors = {};
  if (!form.fullName.trim()) errors.fullName = "Enter your full name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Enter a valid email";
  if (form.password.length < 6) errors.password = "At least 6 characters";
  return errors;
}

export function RegisterPage() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const redirectQuery = redirect ? `?redirect=${encodeURIComponent(redirect)}` : "";

  const [form, setForm] = useState({ fullName: "", company: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState(null);
  const [authError, setAuthError] = useState(null);

  function field(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setAuthError(null);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
          company_name: form.company || null,
        },
      },
    });
    setSubmitting(false);
    if (error) {
      setAuthError(error.message);
      return;
    }
    setSubmittedEmail(form.email);
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
            We&rsquo;ve sent a confirmation link to {submittedEmail}. Click it to activate your account.
          </p>
          <Link href={`/account/login${redirectQuery}`} className="font-body text-sm text-moss transition-colors hover:text-moss-deep">
            Go to login &rarr;
          </Link>
        </div>
      </AccountShell>
    );
  }

  return (
    <AccountShell>
      <h1 className="mb-1 font-display text-2xl text-pine">Create your account</h1>
      <p className="mb-8 font-body text-sm text-pine-soft">Save Atelier designs and track your quote requests.</p>

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <div>
          <label className={labelClass} htmlFor="fullName">Full Name</label>
          <input id="fullName" className={inputClass} type="text" autoComplete="name" value={form.fullName} onChange={(e) => field("fullName", e.target.value)} />
          {errors.fullName && <p className={errorClass}>{errors.fullName}</p>}
        </div>

        <div>
          <label className={labelClass} htmlFor="company">
            Company <span className="text-pine-soft/70 normal-case">(optional)</span>
          </label>
          <input id="company" className={inputClass} type="text" autoComplete="organization" value={form.company} onChange={(e) => field("company", e.target.value)} />
        </div>

        <div>
          <label className={labelClass} htmlFor="email">Email</label>
          <input id="email" className={inputClass} type="email" autoComplete="email" value={form.email} onChange={(e) => field("email", e.target.value)} />
          {errors.email && <p className={errorClass}>{errors.email}</p>}
        </div>

        <div>
          <label className={labelClass} htmlFor="password">Password</label>
          <input id="password" className={inputClass} type="password" autoComplete="new-password" value={form.password} onChange={(e) => field("password", e.target.value)} />
          {errors.password ? <p className={errorClass}>{errors.password}</p> : <p className="mt-1 font-body text-xs text-pine-soft/70">Minimum 6 characters</p>}
        </div>

        {authError && <p className={errorClass}>{authError}</p>}

        <button type="submit" disabled={submitting} className={filledButton}>
          {submitting ? "Creating Account…" : "Create Account"}
        </button>
      </form>

      <p className="mt-6 text-center font-body text-sm text-pine-soft">
        Already have an account?{" "}
        <Link href={`/account/login${redirectQuery}`} className="text-moss transition-colors hover:text-moss-deep">
          Sign in &rarr;
        </Link>
      </p>

      <Link href="/" className="mt-8 inline-flex items-center gap-2 font-body text-sm text-pine-soft transition-colors hover:text-moss">
        <ArrowLeft size={14} strokeWidth={1.5} /> Return home
      </Link>
    </AccountShell>
  );
}
