"use client";

// Shared primitives for the ERP surface. Deliberately plain HTML + Tailwind on the brand
// tokens rather than a component library: the public site ships no UI framework, and adding
// one for the admin area would double the bundle for a handful of tables.

import { AlertTriangle, Check, Info, Loader2, X } from "lucide-react";

export function Card({ title, subtitle, actions, children, className = "", bodyClassName = "" }) {
  return (
    <section className={`rounded-sm border border-pine/12 bg-bone ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-pine/10 px-5 py-4">
          <div>
            {title && <h2 className="font-body text-sm font-semibold text-pine">{title}</h2>}
            {subtitle && <p className="mt-0.5 font-body text-xs text-pine-soft">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={`px-5 py-4 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

const BUTTON_VARIANTS = {
  primary:
    "bg-moss text-pine hover:bg-moss-deep hover:text-bone disabled:hover:bg-moss disabled:hover:text-pine",
  secondary: "border border-pine/20 bg-bone text-pine hover:border-pine/40",
  ghost: "text-pine-soft hover:bg-pine/5 hover:text-pine",
  danger: "border border-red-300 bg-bone text-red-700 hover:bg-red-50",
};

export function Button({ variant = "secondary", busy, children, className = "", ...props }) {
  return (
    <button
      {...props}
      disabled={props.disabled || busy}
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-sm px-3 font-body text-xs font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${BUTTON_VARIANTS[variant]} ${className}`}
    >
      {busy && <Loader2 size={13} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

// Status is never carried by colour alone — each state ships its own word, and the
// pause/review states also carry a dot shape the eye can pick up in a dense table.
const BADGE_TONES = {
  active: "bg-moss/15 text-moss-deep",
  paused: "bg-pine/8 text-pine-soft",
  warning: "bg-amber-100 text-amber-900",
  error: "bg-red-100 text-red-800",
  neutral: "bg-pine/8 text-pine-soft",
};

export function Badge({ tone = "neutral", children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 font-body text-[11px] font-semibold tracking-wide whitespace-nowrap ${BADGE_TONES[tone] ?? BADGE_TONES.neutral}`}
    >
      {children}
    </span>
  );
}

export function Field({ label, hint, htmlFor, children, className = "" }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block font-body text-[11px] tracking-[0.12em] text-pine-soft uppercase">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 font-body text-xs text-pine-soft">{hint}</p>}
    </div>
  );
}

export const inputClass =
  "w-full rounded-sm border border-pine/20 bg-bone px-3 py-2 font-body text-sm text-pine transition-colors focus:border-pine focus:outline-none";

export function Select({ className = "", children, ...props }) {
  return (
    <select {...props} className={`${inputClass} ${className}`}>
      {children}
    </select>
  );
}

const ALERT_TONES = {
  info: { cls: "border-pine/15 bg-paper-raised text-pine", Icon: Info },
  success: { cls: "border-moss/30 bg-moss/10 text-moss-deep", Icon: Check },
  warning: { cls: "border-amber-300 bg-amber-50 text-amber-900", Icon: AlertTriangle },
  error: { cls: "border-red-300 bg-red-50 text-red-800", Icon: AlertTriangle },
};

export function Alert({ tone = "info", title, children, onDismiss }) {
  const { cls, Icon } = ALERT_TONES[tone] ?? ALERT_TONES.info;
  return (
    <div
      className={`flex items-start gap-3 rounded-sm border px-4 py-3 font-body text-sm ${cls}`}
      // Errors and confirmations appear in response to an action the operator just took, so
      // they need to reach a screen reader without stealing focus.
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon size={16} className="mt-0.5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-0.5" : ""}>{children}</div>}
      </div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="shrink-0 opacity-60 hover:opacity-100">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <p className="font-body text-sm font-semibold text-pine">{title}</p>
      {children && <p className="max-w-md font-body text-sm text-pine-soft">{children}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Spinner({ label = "Loading" }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 font-body text-sm text-pine-soft">
      <Loader2 size={15} className="animate-spin" aria-hidden />
      <span>{label}…</span>
    </div>
  );
}

/**
 * Table shell. Numeric cells get `tabular-nums` so columns of figures line up, which is
 * exactly where tabular figures belong (and why the big stat-tile numbers below don't use
 * them — at display size every digit padded to a zero's width reads loose).
 */
export function Table({ head, children, caption }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left font-body text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-pine/12">{head}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Th({ children, align = "left", sortable, sorted, onClick, className = "" }) {
  const content = sortable ? (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 font-semibold text-pine-soft uppercase transition-colors hover:text-pine"
    >
      {children}
      <span aria-hidden className="text-[9px]">{sorted === "asc" ? "▲" : sorted === "desc" ? "▼" : "↕"}</span>
    </button>
  ) : (
    children
  );
  return (
    <th
      scope="col"
      // aria-sort is a property of the column header, not of the button that toggles it.
      aria-sort={sortable ? (sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none") : undefined}
      className={`px-3 py-2.5 font-body text-[10px] font-semibold tracking-[0.1em] text-pine-soft uppercase ${align === "right" ? "text-right" : "text-left"} ${className}`}
    >
      {content}
    </th>
  );
}

export function Td({ children, align = "left", numeric, className = "" }) {
  return (
    <td
      className={`px-3 py-2.5 text-pine ${align === "right" || numeric ? "text-right" : ""} ${numeric ? "[font-variant-numeric:tabular-nums]" : ""} ${className}`}
    >
      {children}
    </td>
  );
}

export function Tr({ children, className = "" }) {
  return <tr className={`border-b border-pine/8 last:border-0 hover:bg-paper-raised/60 ${className}`}>{children}</tr>;
}
