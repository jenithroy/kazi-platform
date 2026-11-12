"use client";

import { CaretDown } from "@phosphor-icons/react";

/**
 * The dropdown the digitizer's panels use: the browser's own <select>, so the keyboard, screen readers and phones all work
 * as they should, drawn in the site's style (see digitizer.css, `.ksel`).
 *
 *   <Select value={id} onChange={setId} label="Font" options={[{ value, label, hint?, disabled? }]} />
 *
 * `variant="field"` is a form control in a panel; `variant="pill"` is a small one beside the player. `label` is the control's
 * name for a screen reader (the visible label, where there is one, is the caller's). A `hint` follows the label in the list.
 * `onChange` receives the option's value as text (a native <select> only knows text), so a caller that wants a number converts it.
 */
export default function Select({ value, onChange, options, label, variant = "field", disabled = false, id, className = "" }) {
  return (
    <span className={`ksel ksel--${variant}${disabled ? " is-disabled" : ""} ${className}`.trim()}>
      <select id={id} aria-label={label} value={value} disabled={disabled} onChange={(e) => onChange?.(e.target.value)}>
        {options.map((o) => (
          <option key={String(o.value)} value={o.value} disabled={o.disabled}>
            {o.hint ? `${o.label} (${o.hint})` : o.label}
          </option>
        ))}
      </select>
      <CaretDown className="ksel-chev" size={12} weight="bold" aria-hidden="true" />
    </span>
  );
}
