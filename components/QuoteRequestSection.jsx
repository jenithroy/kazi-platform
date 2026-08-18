"use client";

import { useEffect, useState } from "react";
import { readQuoteDesigns, clearQuoteDesigns, describeQuoteDesigns } from "@/lib/quote-handoff";
import { supabase } from "@/lib/supabase";
import { Reveal } from "@/components/Reveal";

const GARMENT_CATEGORIES = ["Knitwear", "Outerwear", "Denim", "Accessories", "Footwear", "Other"];

const ORDER_VOLUMES = ["Under 500 units", "500–2,000 units", "2,000–10,000 units", "10,000+ units", "Other"];

// quotes.quantity is an integer — approximate ranges resolve to their lower bound, same
// convention QuotePage.jsx uses for its own quantity ranges.
const ORDER_VOLUME_FLOOR = {
  "Under 500 units": 250,
  "500–2,000 units": 500,
  "2,000–10,000 units": 2000,
  "10,000+ units": 10000,
};

const inputClass =
  "rounded-sm border border-pine/15 bg-bone px-3.5 py-3 font-body text-sm text-pine transition-colors focus:border-pine focus:outline-none";
const labelClass = "font-body text-xs font-semibold tracking-[0.04em] text-pine-soft uppercase";
const errorClass = "font-body text-xs text-red-700";

const INITIAL_FORM = {
  name: "",
  company: "",
  email: "",
  phone: "",
  garmentCategory: "",
  garmentCategoryOther: "",
  orderVolume: "",
  orderVolumeOther: "",
  message: "",
};

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Enter your name";
  if (!form.company.trim()) errors.company = "Enter your company name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Enter a valid email";
  if (!form.garmentCategory) errors.garmentCategory = "Choose a category";
  if (form.garmentCategory === "Other" && !form.garmentCategoryOther.trim()) {
    errors.garmentCategoryOther = "Tell us your garment category";
  }
  if (!form.orderVolume) errors.orderVolume = "Choose an approximate volume";
  if (form.orderVolume === "Other" && !form.orderVolumeOther.trim()) {
    errors.orderVolumeOther = "Tell us your approximate order volume";
  }
  if (!form.message.trim()) errors.message = "Tell us a little about the project";
  return errors;
}

function resolveQuantity(form) {
  if (form.orderVolume === "Other") return parseInt(form.orderVolumeOther.replace(/[^\d]/g, ""), 10) || 0;
  return ORDER_VOLUME_FLOOR[form.orderVolume] ?? 0;
}

export function QuoteRequestSection() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // A visitor who designed something in the Atelier and clicked "Get a Quote" there lands
  // here — carry their saved design(s) into the message field instead of making them
  // describe from scratch what they just built.
  useEffect(() => {
    const designs = readQuoteDesigns();
    if (!designs) return;
    const intro = designs.length === 1 ? "Design from the Atelier:" : "Designs from the Atelier:";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((f) => ({ ...f, message: `${intro}\n${describeQuoteDesigns(designs)}\n\n` }));
  }, []);

  function field(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("quotes").insert({
      customer_id: user?.id ?? null,
      contact_name: form.name,
      contact_email: form.email,
      contact_phone: form.phone || null,
      company_name: form.company,
      product_type: form.garmentCategory === "Other" ? form.garmentCategoryOther : form.garmentCategory,
      quantity: resolveQuantity(form),
      details: form.message,
    });

    if (error) {
      setSubmitError(error.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    clearQuoteDesigns();
    setSubmitted(true);
  }

  return (
    <section id="quote" className="bg-paper py-20 lg:py-28">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-6 md:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start lg:gap-16">
        <Reveal
          className="max-w-md lg:sticky"
          style={{ top: "calc(var(--stripe-height) + var(--nav-height) + 2rem)" }}
        >
          <h2 className="m-0 font-display text-3xl leading-[1.2] font-normal text-pine lg:text-[2.75rem]">
            Tell us what you&rsquo;re making.
          </h2>
        </Reveal>

        <Reveal delay={100} className="rounded-sm border border-pine/8 bg-paper-raised p-6 sm:p-10">
          {submitted ? (
            <div role="status" className="py-6">
              <h3 className="m-0 font-display text-2xl text-pine">Thank you — quote request sent.</h3>
              <p className="mt-3 font-body text-base leading-relaxed text-pine-soft">
                We&rsquo;ve got your details. Expect a reply at the email you gave us within 24 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className={labelClass} htmlFor="qr-name">Name</label>
                  <input id="qr-name" className={inputClass} type="text" autoComplete="name" value={form.name} onChange={(e) => field("name", e.target.value)} />
                  {errors.name && <span className={errorClass}>{errors.name}</span>}
                </div>
                <div className="flex flex-col gap-2">
                  <label className={labelClass} htmlFor="qr-company">Company Name</label>
                  <input id="qr-company" className={inputClass} type="text" autoComplete="organization" value={form.company} onChange={(e) => field("company", e.target.value)} />
                  {errors.company && <span className={errorClass}>{errors.company}</span>}
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className={labelClass} htmlFor="qr-email">Email</label>
                  <input id="qr-email" className={inputClass} type="email" autoComplete="email" value={form.email} onChange={(e) => field("email", e.target.value)} />
                  {errors.email && <span className={errorClass}>{errors.email}</span>}
                </div>
                <div className="flex flex-col gap-2">
                  <label className={labelClass} htmlFor="qr-phone">
                    Phone <span className="font-normal tracking-normal text-pine-soft/70 normal-case">(optional)</span>
                  </label>
                  <input id="qr-phone" className={inputClass} type="tel" autoComplete="tel" value={form.phone} onChange={(e) => field("phone", e.target.value)} />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className={labelClass} htmlFor="qr-garment-category">Garment Category</label>
                  <select
                    id="qr-garment-category"
                    className={`${inputClass} appearance-none bg-[image:linear-gradient(45deg,transparent_50%,var(--color-pine-soft)_50%),linear-gradient(135deg,var(--color-pine-soft)_50%,transparent_50%)] bg-[position:calc(100%-20px)_center,calc(100%-14px)_center] bg-[size:6px_6px] bg-no-repeat`}
                    value={form.garmentCategory}
                    onChange={(e) => field("garmentCategory", e.target.value)}
                  >
                    <option value="" disabled>Select a category</option>
                    {GARMENT_CATEGORIES.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  {errors.garmentCategory && <span className={errorClass}>{errors.garmentCategory}</span>}
                  {form.garmentCategory === "Other" && (
                    <>
                      <input
                        className={inputClass}
                        type="text"
                        placeholder="Tell us the category"
                        aria-label="Garment category (other)"
                        value={form.garmentCategoryOther}
                        onChange={(e) => field("garmentCategoryOther", e.target.value)}
                      />
                      {errors.garmentCategoryOther && <span className={errorClass}>{errors.garmentCategoryOther}</span>}
                    </>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label className={labelClass} htmlFor="qr-order-volume">Approximate Order Volume</label>
                  <select
                    id="qr-order-volume"
                    className={`${inputClass} appearance-none bg-[image:linear-gradient(45deg,transparent_50%,var(--color-pine-soft)_50%),linear-gradient(135deg,var(--color-pine-soft)_50%,transparent_50%)] bg-[position:calc(100%-20px)_center,calc(100%-14px)_center] bg-[size:6px_6px] bg-no-repeat`}
                    value={form.orderVolume}
                    onChange={(e) => field("orderVolume", e.target.value)}
                  >
                    <option value="" disabled>Select a range</option>
                    {ORDER_VOLUMES.map((volume) => (
                      <option key={volume} value={volume}>{volume}</option>
                    ))}
                  </select>
                  {errors.orderVolume && <span className={errorClass}>{errors.orderVolume}</span>}
                  {form.orderVolume === "Other" && (
                    <>
                      <input
                        className={inputClass}
                        type="text"
                        inputMode="numeric"
                        placeholder="Approximate number of units"
                        aria-label="Approximate order volume (other)"
                        value={form.orderVolumeOther}
                        onChange={(e) => field("orderVolumeOther", e.target.value)}
                      />
                      {errors.orderVolumeOther && <span className={errorClass}>{errors.orderVolumeOther}</span>}
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className={labelClass} htmlFor="qr-message">Project Details</label>
                <textarea
                  id="qr-message"
                  rows={4}
                  className={`${inputClass} min-h-24 resize-y`}
                  value={form.message}
                  onChange={(e) => field("message", e.target.value)}
                />
                {errors.message && <span className={errorClass}>{errors.message}</span>}
              </div>

              <div className="mt-2 flex flex-col items-start gap-3.5">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-12 items-center rounded-sm bg-moss px-7 font-body text-sm font-semibold text-pine transition-colors hover:bg-moss-deep disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? "Sending…" : "Get a Quote"}
                </button>
                <span className="font-body text-sm text-pine-soft/80">No obligation. We reply within 24 hours.</span>
                {submitError && <p className={errorClass}>{submitError}</p>}
              </div>
            </form>
          )}
        </Reveal>
      </div>
    </section>
  );
}
