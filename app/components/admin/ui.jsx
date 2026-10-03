"use client";

import { Check, TriangleAlert, X, LoaderCircle } from "lucide-react";

// Small building blocks shared by the /admin screens, in the site's own palette.

export const inputClass =
  "w-full rounded-sm border border-pine/20 bg-paper px-3 py-2 font-body text-sm text-pine placeholder:text-pine-soft/60 transition-colors focus:border-pine focus:outline-none focus-visible:ring-2 focus-visible:ring-moss/30 disabled:cursor-not-allowed disabled:opacity-60";

const BUTTON_VARIANTS = {
  primary: "bg-pine text-bone hover:bg-pine-soft",
  accent: "bg-moss text-pine hover:bg-moss-deep",
  outline: "border border-pine/25 bg-bone text-pine hover:bg-paper-raised",
  ghost: "text-pine-soft hover:bg-paper-raised hover:text-pine",
  danger: "border border-red-700/30 bg-bone text-red-700 hover:bg-red-50",
};

const BUTTON_SIZES = {
  sm: "h-8 gap-1.5 px-3 text-xs",
  md: "h-10 gap-2 px-4 text-sm",
};

export function buttonClass(variant = "outline", size = "md") {
  return `inline-flex shrink-0 items-center justify-center rounded-sm font-body font-semibold tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-moss/40 disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]}`;
}

export function Button({
  variant = "outline",
  size = "md",
  busy = false,
  disabled = false,
  type = "button",
  className = "",
  children,
  ...props
}) {
  return (
    <button
      {...props}
      type={type}
      className={`${buttonClass(variant, size)} ${className}`}
      disabled={busy || disabled}
      aria-busy={busy || undefined}
    >
      {busy && <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function Spinner({ label = "Loading" }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 font-body text-sm text-pine-soft">
      <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
      {label}…
    </span>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="m-0 font-display text-3xl text-pine">{title}</h1>
        {description && <p className="m-0 mt-2 max-w-2xl font-body text-sm leading-relaxed text-pine-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, description, actions, children, className = "" }) {
  return (
    <section className={`rounded-sm border border-pine/15 bg-bone ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 border-b border-pine/10 px-5 py-4">
          <div>
            {title && <h2 className="m-0 font-body text-sm font-semibold text-pine">{title}</h2>}
            {description && <p className="m-0 mt-1 font-body text-xs leading-relaxed text-pine-soft">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

const BADGE_TONES = {
  neutral: "bg-paper-raised text-pine-soft",
  green: "bg-moss/15 text-moss-deep",
  amber: "bg-amber-100 text-amber-900",
  red: "bg-red-100 text-red-800",
  blue: "bg-sky-100 text-sky-900",
};

export function Badge({ tone = "neutral", children }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 font-body text-[0.7rem] font-semibold tracking-wide ${BADGE_TONES[tone]}`}>
      {children}
    </span>
  );
}

export const STORY_STATE_BADGE = {
  draft: { tone: "neutral", label: "Draft" },
  scheduled: { tone: "blue", label: "Scheduled" },
  published: { tone: "green", label: "Published" },
};

const SCORE_TONES = { good: "bg-moss/15 text-moss-deep", ok: "bg-amber-100 text-amber-900", poor: "bg-red-100 text-red-800" };

export function ScorePill({ score, tone }) {
  return (
    <span
      className={`inline-flex h-7 min-w-[2.75rem] items-center justify-center rounded-full px-2 font-body text-xs font-semibold tabular-nums ${SCORE_TONES[tone]}`}
      title="SEO score"
    >
      {score}
    </span>
  );
}

const NOTICE_TONES = {
  info: "border-sky-800/20 bg-sky-50 text-sky-950",
  warn: "border-amber-700/25 bg-amber-50 text-amber-950",
  error: "border-red-700/25 bg-red-50 text-red-900",
  success: "border-moss/30 bg-moss/10 text-pine",
};

export function Notice({ tone = "info", title, children, className = "" }) {
  return (
    <div role={tone === "error" ? "alert" : undefined} className={`rounded-sm border px-4 py-3 font-body text-sm leading-relaxed ${NOTICE_TONES[tone]} ${className}`}>
      {title && <p className="m-0 mb-1 font-semibold">{title}</p>}
      <div className="[&_p]:m-0">{children}</div>
    </div>
  );
}

export function Field({ id, label, hint, error, counter, children }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-body text-xs font-semibold tracking-wide text-pine">
          {label}
        </label>
        {counter}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="m-0 mt-1 font-body text-xs text-red-700">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="m-0 mt-1 font-body text-xs leading-relaxed text-pine-soft">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** "52 / 30–60" style counter that turns amber outside the recommended range. */
export function CharCount({ length, min, max }) {
  const ok = length >= min && length <= max;
  return (
    <span className={`font-body text-[0.7rem] tabular-nums ${length === 0 ? "text-pine-soft" : ok ? "text-moss-deep" : "text-amber-800"}`}>
      {length} / {min}–{max}
    </span>
  );
}

const CHECK_ICONS = {
  pass: <Check size={14} className="text-moss" aria-hidden="true" />,
  warn: <TriangleAlert size={14} className="text-amber-700" aria-hidden="true" />,
  fail: <X size={14} className="text-red-700" aria-hidden="true" />,
};
const CHECK_LABELS = { pass: "Passed", warn: "Needs attention", fail: "Problem" };

export function CheckList({ checks }) {
  return (
    <ul className="m-0 list-none space-y-2.5 p-0">
      {checks.map((check) => (
        <li key={check.id} className="flex gap-2.5">
          <span className="mt-0.5 shrink-0">
            {CHECK_ICONS[check.status]}
            <span className="sr-only">{CHECK_LABELS[check.status]}: </span>
          </span>
          <span className="font-body text-xs leading-relaxed">
            <span className="block font-semibold text-pine">{check.label}</span>
            {check.status !== "pass" && <span className="block text-pine-soft">{check.hint}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="rounded-sm border border-dashed border-pine/25 bg-bone px-6 py-12 text-center">
      <p className="m-0 font-display text-xl text-pine">{title}</p>
      {children && <p className="m-0 mx-auto mt-2 max-w-md font-body text-sm text-pine-soft">{children}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

const RELATIVE = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });
const STEPS = [
  [60, "second"],
  [60, "minute"],
  [24, "hour"],
  [7, "day"],
  [4.35, "week"],
  [12, "month"],
  [Infinity, "year"],
];

/** "3 hours ago" / "in 2 days". `now` is passed in so renders stay pure. */
export function relativeTime(iso, now) {
  if (!iso) return "";
  let value = (new Date(iso).getTime() - now) / 1000;
  for (const [size, unit] of STEPS) {
    if (Math.abs(value) < size) return RELATIVE.format(Math.round(value), unit);
    value /= size;
  }
  return "";
}
