"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { SITE_EMAIL } from "@/lib/site";
import { FOLLOWER_RANGES, PLATFORMS, PRODUCT_INTERESTS } from "./content";
import { BUTTON_PRIMARY, H3 } from "./styles";

// Field styles follow the site's quote forms (components/QuoteRequestSection.jsx). text-base
// (16px) below `sm`: iOS Safari zooms the whole page in when a smaller field is focused.
const inputClass =
  "w-full rounded-sm border border-pine/15 bg-bone px-3.5 py-3 font-body text-base text-pine transition-colors focus:border-pine focus:outline-none sm:text-sm";
const selectClass = `${inputClass} appearance-none bg-[image:linear-gradient(45deg,transparent_50%,var(--color-pine-soft)_50%),linear-gradient(135deg,var(--color-pine-soft)_50%,transparent_50%)] bg-[position:calc(100%-20px)_center,calc(100%-14px)_center] bg-[size:6px_6px] bg-no-repeat`;
const labelClass = "font-body text-xs font-semibold tracking-[0.04em] text-pine-soft uppercase";
const optionalClass = "font-normal tracking-normal text-pine-soft normal-case";
const errorClass = "font-body text-xs text-red-700";
const linkClass = "text-pine underline underline-offset-2 hover:text-moss-deep";

const INITIAL = {
  name: "",
  handle: "",
  platform: "",
  followers: "",
  products: [],
  launch: "",
  email: "",
  message: "",
};

// Field key -> element id, in on-screen order: a failed submit moves focus to the first field
// that needs fixing, and each error is tied to its field with aria-describedby.
const FIELD_IDS = {
  name: "drop-name",
  email: "drop-email",
  handle: "drop-handle",
  platform: "drop-platform",
  followers: "drop-followers",
  products: "drop-products",
};

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Enter your name";
  if (!form.handle.trim()) errors.handle = "Enter your handle or channel name";
  if (!form.platform) errors.platform = "Choose your main platform";
  if (!form.followers) errors.followers = "Choose a follower range";
  if (form.products.length === 0) errors.products = "Pick at least one product";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Enter a valid email";
  return errors;
}

// The enquiry form. It uses the same route as the site's quote forms: a row in the Supabase
// `quotes` table (see components/QuotePage.jsx), so merch enquiries arrive where every other
// quote does. That table has no creator-specific columns, so:
//   company_name  <- handle and platform
//   product_type  <- "Kazi Merch: <products>"
//   deadline      <- target launch date
//   details       <- a "KAZI MERCH ENQUIRY" block with followers, products and the message
//   quantity      <- 100. The column is required and this form doesn't ask for a quantity, so it
//                    stores the minimum order. TODO: add a quantity field if Kazi wants a real figure.
export function DropForm() {
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);

  function field(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleProduct(product) {
    setForm((current) => ({
      ...current,
      products: current.products.includes(product)
        ? current.products.filter((item) => item !== product)
        : [...current.products, product],
    }));
  }

  function a11y(key) {
    return errors[key] ? { "aria-invalid": "true", "aria-describedby": `${FIELD_IDS[key]}-error` } : {};
  }

  function fieldError(key) {
    if (!errors[key]) return null;
    return (
      <span id={`${FIELD_IDS[key]}-error`} className={errorClass}>
        {errors[key]}
      </span>
    );
  }

  async function onSubmit(e) {
    e.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    const firstInvalid = Object.keys(FIELD_IDS).find((key) => nextErrors[key]);
    if (firstInvalid) {
      const target = document.getElementById(FIELD_IDS[firstInvalid]);
      // The product group is a fieldset: focus its first checkbox.
      (target?.matches("fieldset") ? target.querySelector("input") : target)?.focus();
      return;
    }

    setSubmitFailed(false);
    if (!isSupabaseConfigured) {
      setSubmitFailed(true);
      return;
    }
    setSubmitting(true);

    const who = `${form.handle.trim()} (${form.platform})`;
    const details = [
      "KAZI MERCH ENQUIRY",
      `Handle: ${who}`,
      `Followers: ${form.followers}`,
      `Products: ${form.products.join(", ")}`,
      form.launch ? `Target launch: ${form.launch}` : null,
      form.message.trim() ? `\n${form.message.trim()}` : null,
    ]
      .filter((line) => line !== null)
      .join("\n");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("quotes").insert({
        customer_id: user?.id ?? null,
        contact_name: form.name.trim(),
        contact_email: form.email.trim(),
        company_name: who,
        product_type: `Kazi Merch: ${form.products.join(", ")}`,
        quantity: 100,
        deadline: form.launch || null,
        details,
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      // Raw Supabase/network messages aren't meant for visitors — keep them in the console.
      console.error("Kazi Merch enquiry failed", err);
      setSubmitFailed(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div role="status" className="py-6">
        <h3 className={H3}>Thank you, {form.name.trim().split(" ")[0]}. Brief received.</h3>
        <p className="m-0 mt-3 font-body text-base leading-relaxed text-pine-soft">
          We&rsquo;ll reply to {form.email.trim()} within 24 hours. In the meantime you can{" "}
          <Link href="/atelier" className={linkClass}>
            mock your drop up in 3D
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="drop-name" className={labelClass}>
            Name
          </label>
          <input id="drop-name" type="text" autoComplete="name" className={inputClass} value={form.name} onChange={(e) => field("name", e.target.value)} {...a11y("name")} />
          {fieldError("name")}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="drop-email" className={labelClass}>
            Email
          </label>
          <input id="drop-email" type="email" autoComplete="email" className={inputClass} value={form.email} onChange={(e) => field("email", e.target.value)} {...a11y("email")} />
          {fieldError("email")}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="drop-handle" className={labelClass}>
            Handle
          </label>
          <input id="drop-handle" type="text" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="@yourname" className={inputClass} value={form.handle} onChange={(e) => field("handle", e.target.value)} {...a11y("handle")} />
          {fieldError("handle")}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="drop-platform" className={labelClass}>
            Platform
          </label>
          <select id="drop-platform" className={selectClass} value={form.platform} onChange={(e) => field("platform", e.target.value)} {...a11y("platform")}>
            <option value="" disabled>
              Select a platform
            </option>
            {PLATFORMS.map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>
          {fieldError("platform")}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="drop-followers" className={labelClass}>
            Followers
          </label>
          <select id="drop-followers" className={selectClass} value={form.followers} onChange={(e) => field("followers", e.target.value)} {...a11y("followers")}>
            <option value="" disabled>
              Select a range
            </option>
            {FOLLOWER_RANGES.map((range) => (
              <option key={range} value={range}>
                {range}
              </option>
            ))}
          </select>
          {fieldError("followers")}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="drop-launch" className={labelClass}>
            Target launch date <span className={optionalClass}>(optional)</span>
          </label>
          <input id="drop-launch" type="date" className={inputClass} value={form.launch} onChange={(e) => field("launch", e.target.value)} />
        </div>
      </div>

      {/* aria-invalid is not valid on a group, so the fieldset only points at its error message. */}
      <fieldset
        id="drop-products"
        className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0"
        aria-describedby={errors.products ? "drop-products-error" : undefined}
      >
        <legend className={`${labelClass} mb-2 p-0`}>Products</legend>
        <div className="flex flex-wrap gap-2">
          {PRODUCT_INTERESTS.map((product) => (
            // A checkbox drawn as a pill: the real input stays in the page for keyboards and screen readers.
            <label key={product} className="relative inline-flex cursor-pointer">
              <input
                type="checkbox"
                checked={form.products.includes(product)}
                onChange={() => toggleProduct(product)}
                className="peer absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0"
              />
              <span
                className={`inline-flex h-11 items-center rounded-full border px-4 font-body text-base transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-pine sm:text-sm ${
                  form.products.includes(product) ? "border-pine bg-pine text-bone" : "border-pine/15 bg-bone text-pine"
                }`}
              >
                {product}
              </span>
            </label>
          ))}
        </div>
        {fieldError("products")}
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="drop-message" className={labelClass}>
          Message <span className={optionalClass}>(optional)</span>
        </label>
        <textarea id="drop-message" rows={4} className={`${inputClass} min-h-24 resize-y`} value={form.message} onChange={(e) => field("message", e.target.value)} />
      </div>

      <div className="mt-2 flex flex-col items-start gap-3.5">
        <button type="submit" disabled={submitting} className={`${BUTTON_PRIMARY} disabled:cursor-not-allowed disabled:opacity-70`}>
          {submitting ? "Sending…" : "Plan your drop"}
        </button>
        <span className="font-body text-sm text-pine-soft">
          No obligation. We reply within 24 hours. See our{" "}
          <Link href="/privacy-policy" className={linkClass}>
            privacy policy
          </Link>
          .
        </span>
        {submitFailed && (
          <p role="alert" className={`${errorClass} m-0`}>
            We couldn&rsquo;t send that just now. Please try again, or email{" "}
            <a href={`mailto:${SITE_EMAIL}`} className={linkClass}>
              {SITE_EMAIL}
            </a>
            .
          </p>
        )}
      </div>
    </form>
  );
}
