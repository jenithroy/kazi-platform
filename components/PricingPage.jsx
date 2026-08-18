"use client";

import { useMemo, useState } from "react";
import { Upload, X } from "lucide-react";
import QtyStepper from "@/components/Atelier/QtyStepper";

const PRODUCT_TYPES = [
  { id: "t-shirt", label: "T-Shirts" },
  { id: "hoodie", label: "Hoodies" },
];

const QTY_MIN = 50;
const QTY_MAX = 2000;

// Every figure on this page — tiers, add-on deltas, reference grid — is a placeholder cost
// sheet, not verified Kazi pricing. Structurally correct, numerically fictional until real
// figures are supplied. The calculator and the static reference table below intentionally
// share this same data so the two can never contradict each other.
const PRICING_TIERS = [
  { min: 50, max: 99, label: "50–99", "t-shirt": 8.5, hoodie: 18.0 },
  { min: 100, max: 249, label: "100–249", "t-shirt": 6.5, hoodie: 14.5 },
  { min: 250, max: 499, label: "250–499", "t-shirt": 5.0, hoodie: 12.0 },
  { min: 500, max: 999, label: "500–999", "t-shirt": 4.0, hoodie: 10.0 },
  { min: 1000, max: Infinity, label: "1000+", "t-shirt": 3.2, hoodie: 8.5 },
];

const EMBROIDERY_PRICE = { small: 2.5, large: 4.0 };
const SCREEN_PRINT_PER_COLOUR = 1.2;
const DTG_PRICE = 3.0;

const ADDON_REFERENCE = [
  { label: "Embroidery — Small", price: EMBROIDERY_PRICE.small },
  { label: "Embroidery — Large", price: EMBROIDERY_PRICE.large },
  { label: "Screen Print — per colour", price: SCREEN_PRINT_PER_COLOUR },
  { label: "DTG", price: DTG_PRICE },
];

const GARMENT_COLOURS = [
  { hex: "#FFFFFF", label: "White" },
  { hex: "#1A1A1A", label: "Black" },
  { hex: "#1B3A2B", label: "Pine" },
  { hex: "#3F8F5C", label: "Moss" },
  { hex: "#6B6560", label: "Stone" },
  { hex: "#3D2B1F", label: "Espresso" },
  { hex: "#C4956A", label: "Camel" },
  { hex: "#8B4513", label: "Rust" },
];

const FILE_ACCEPT = ".png,.jpg,.jpeg,.pdf,.ai,.psd";

function tierForQty(qty) {
  return PRICING_TIERS.find((tier) => qty >= tier.min && qty <= tier.max) ?? PRICING_TIERS[0];
}

function formatGBP(amount) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);
}

const inputClass =
  "w-full rounded-sm border border-pine/15 bg-paper px-3.5 py-2.5 font-body text-sm text-pine transition-colors focus:border-pine focus:outline-none";
const labelClass = "mb-1.5 block font-body text-xs tracking-[0.12em] text-pine-soft uppercase";
const errorClass = "mt-1 font-body text-xs text-red-600";
const filledButton =
  "inline-flex h-12 w-full items-center justify-center rounded-sm bg-moss px-6 font-body text-sm font-semibold tracking-wide text-pine transition-colors hover:bg-moss-deep disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto";

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Enter your name";
  if (!form.company.trim()) errors.company = "Enter your company name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Enter a valid email";
  if (!form.details.trim()) errors.details = "Tell us a little about the project";
  return errors;
}

export function PricingPage() {
  const [productType, setProductType] = useState("t-shirt");
  const [qty, setQty] = useState(100);
  const [embroidery, setEmbroidery] = useState(false);
  const [embroiderySize, setEmbroiderySize] = useState("small");
  const [screenPrint, setScreenPrint] = useState(false);
  const [screenPrintColours, setScreenPrintColours] = useState(1);
  const [dtg, setDtg] = useState(false);

  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", details: "" });
  const [errors, setErrors] = useState({});

  const tier = tierForQty(qty);
  const basePrice = tier[productType];
  const addonsTotal =
    (embroidery ? EMBROIDERY_PRICE[embroiderySize] : 0) +
    (screenPrint ? SCREEN_PRINT_PER_COLOUR * screenPrintColours : 0) +
    (dtg ? DTG_PRICE : 0);
  const perUnit = basePrice + addonsTotal;
  const total = perUnit * qty;

  // Skip the first tier (50) — it's the slider's own minimum, not a threshold it ever
  // "crosses", so marking it collided with the 100 mark right next to it.
  const tierMarks = useMemo(
    () =>
      PRICING_TIERS.slice(1).map((t) => ({
        qty: t.min,
        pct: ((t.min - QTY_MIN) / (QTY_MAX - QTY_MIN)) * 100,
      })),
    [],
  );

  function handleFiles(fileList) {
    const picked = fileList?.[0];
    if (picked) setFile(picked);
  }

  async function onSubmit(e) {
    e.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSubmitting(false);
    setSubmitted(true);
  }

  return (
    <main className="bg-paper">
      <section className="px-6 pt-16 pb-20 md:px-8 md:pt-20">
        <div className="mx-auto max-w-[1440px] rounded-sm border border-pine/15">
          <div className="grid lg:grid-cols-2">
            {/* Calculator */}
            <div className="p-6 md:p-12">
              <h2 className="mb-6 font-display text-xl text-pine">Estimate your price</h2>

              <span className={labelClass}>Product</span>
              <div className="mb-8 flex gap-2" role="group" aria-label="Product type">
                {PRODUCT_TYPES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProductType(p.id)}
                    aria-pressed={productType === p.id}
                    className={`flex-1 rounded-sm border px-4 py-2.5 font-body text-sm transition-colors ${
                      productType === p.id ? "border-pine bg-pine text-bone" : "border-pine/15 text-pine hover:border-pine/40"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="mb-2 flex items-center justify-between">
                <span className={labelClass}>Quantity</span>
                <span className="font-body text-sm font-medium tabular-nums text-pine">{qty} units</span>
              </div>
              <input
                type="range"
                min={QTY_MIN}
                max={QTY_MAX}
                step={10}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                className="h-0.5 w-full cursor-pointer appearance-none bg-pine/15"
                style={{ accentColor: "#3F8F5C" }}
                aria-label="Quantity"
              />
              <div className="relative mb-8 h-4">
                {tierMarks.map((mark) => (
                  <span
                    key={mark.qty}
                    className={`absolute -translate-x-1/2 font-body text-[10px] tabular-nums ${
                      qty >= mark.qty ? "text-moss" : "text-pine-soft/50"
                    }`}
                    style={{ left: `${mark.pct}%` }}
                  >
                    {mark.qty}
                  </span>
                ))}
              </div>

              <span className={labelClass}>Decoration add-ons</span>
              <div className="mb-8 space-y-3">
                <div className="rounded-sm border border-pine/15 p-3.5">
                  <label className="flex cursor-pointer items-center justify-between gap-3">
                    <span className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={embroidery}
                        onChange={(e) => setEmbroidery(e.target.checked)}
                        className="h-4 w-4 accent-moss"
                      />
                      <span className="font-body text-sm text-pine">Embroidery</span>
                    </span>
                    <span className="font-body text-xs font-medium tabular-nums text-pine-soft">
                      +{formatGBP(EMBROIDERY_PRICE[embroiderySize])}/unit
                    </span>
                  </label>
                  {embroidery && (
                    <div className="mt-3 flex gap-2 pl-6.5">
                      {["small", "large"].map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setEmbroiderySize(size)}
                          aria-pressed={embroiderySize === size}
                          className={`rounded-sm border px-3 py-1 font-body text-xs capitalize transition-colors ${
                            embroiderySize === size
                              ? "border-pine bg-pine text-bone"
                              : "border-pine/15 text-pine-soft hover:border-pine/40"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-sm border border-pine/15 p-3.5">
                  <label className="flex cursor-pointer items-center justify-between gap-3">
                    <span className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={screenPrint}
                        onChange={(e) => setScreenPrint(e.target.checked)}
                        className="h-4 w-4 accent-moss"
                      />
                      <span className="font-body text-sm text-pine">Screen Print</span>
                    </span>
                    <span className="font-body text-xs font-medium tabular-nums text-pine-soft">
                      +{formatGBP(SCREEN_PRINT_PER_COLOUR)}/unit per colour
                    </span>
                  </label>
                  {screenPrint && (
                    <div className="mt-3 flex items-center gap-2.5 pl-6.5">
                      <span className="font-body text-xs text-pine-soft">Colours</span>
                      <QtyStepper value={screenPrintColours} onChange={setScreenPrintColours} min={1} max={6} step={1} />
                    </div>
                  )}
                </div>

                <div className="rounded-sm border border-pine/15 p-3.5">
                  <label className="flex cursor-pointer items-center justify-between gap-3">
                    <span className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={dtg}
                        onChange={(e) => setDtg(e.target.checked)}
                        className="h-4 w-4 accent-moss"
                      />
                      <span className="font-body text-sm text-pine">DTG</span>
                    </span>
                    <span className="font-body text-xs font-medium tabular-nums text-pine-soft">
                      +{formatGBP(DTG_PRICE)}/unit
                    </span>
                  </label>
                </div>
              </div>

              <div className="border-t border-pine/15 pt-6">
                <div className="flex items-baseline justify-between">
                  <span className={labelClass}>Per unit</span>
                  <span className="font-display text-3xl tabular-nums text-moss">{formatGBP(perUnit)}</span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className={labelClass}>Estimated total ({qty} units)</span>
                  <span className="font-display text-xl tabular-nums text-pine">{formatGBP(total)}</span>
                </div>
                <p className="mt-4 font-body text-xs text-pine-soft">Excl. shipping, customs and packaging.</p>
              </div>
            </div>

            {/* Quote form */}
            <div className="border-t border-pine/15 bg-bone p-6 md:p-12 lg:border-t-0 lg:border-l">
              {submitted ? (
                <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                  <h3 className="mb-2 font-display text-2xl text-pine">Thank you — quote request sent.</h3>
                  <p className="max-w-sm font-body text-pine-soft">
                    We&rsquo;ve got your details and your estimate. Expect a reply at the email you
                    gave us within 24 hours.
                  </p>
                </div>
              ) : (
                <form onSubmit={onSubmit} noValidate className="space-y-5">
                  <h2 className="mb-1 font-display text-xl text-pine">Request this quote</h2>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass} htmlFor="name">Name</label>
                      <input
                        id="name"
                        className={inputClass}
                        type="text"
                        autoComplete="name"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      />
                      {errors.name && <p className={errorClass}>{errors.name}</p>}
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="company">Company</label>
                      <input
                        id="company"
                        className={inputClass}
                        type="text"
                        autoComplete="organization"
                        value={form.company}
                        onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                      />
                      {errors.company && <p className={errorClass}>{errors.company}</p>}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass} htmlFor="email">Email</label>
                      <input
                        id="email"
                        className={inputClass}
                        type="email"
                        autoComplete="email"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      />
                      {errors.email && <p className={errorClass}>{errors.email}</p>}
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="phone">
                        Phone <span className="text-pine-soft/70 normal-case">(optional)</span>
                      </label>
                      <input
                        id="phone"
                        className={inputClass}
                        type="tel"
                        autoComplete="tel"
                        value={form.phone}
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <span className={labelClass}>Garment colour</span>
                    <div className="flex flex-wrap gap-2">
                      {GARMENT_COLOURS.map((c) => (
                        <span
                          key={c.hex}
                          title={c.label}
                          aria-label={c.label}
                          className="h-8 w-8 rounded-full border-2 border-pine/15"
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className={labelClass}>
                      Artwork file <span className="text-pine-soft/70 normal-case">(optional)</span>
                    </span>
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragActive(true);
                      }}
                      onDragLeave={() => setDragActive(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragActive(false);
                        handleFiles(e.dataTransfer.files);
                      }}
                      className={`relative rounded-sm border-2 border-dashed p-5 text-center transition-colors ${
                        dragActive ? "border-moss bg-moss/5" : "border-pine/15"
                      }`}
                    >
                      <input
                        type="file"
                        accept={FILE_ACCEPT}
                        onChange={(e) => handleFiles(e.target.files)}
                        aria-label="Upload artwork file"
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                      {file ? (
                        <div className="pointer-events-none relative flex items-center justify-center gap-2">
                          <span className="max-w-[220px] truncate font-body text-sm text-pine">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => setFile(null)}
                            aria-label="Remove file"
                            className="pointer-events-auto text-pine-soft transition-colors hover:text-red-600"
                          >
                            <X size={14} strokeWidth={1.5} />
                          </button>
                        </div>
                      ) : (
                        <div className="pointer-events-none">
                          <Upload className="mx-auto mb-2 text-pine-soft" size={20} strokeWidth={1.5} />
                          <p className="font-body text-sm text-pine">Drop a file or click to upload</p>
                          <p className="mt-1 font-body text-xs text-pine-soft">PNG, JPG, PDF, AI or PSD</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="details">Additional details</label>
                    <textarea
                      id="details"
                      rows={3}
                      className={inputClass}
                      value={form.details}
                      onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
                    />
                    {errors.details && <p className={errorClass}>{errors.details}</p>}
                  </div>

                  <div className="pt-2">
                    <button type="submit" disabled={submitting} className={filledButton}>
                      {submitting ? "Sending…" : `Submit Quote — ${formatGBP(total)} estimate`}
                    </button>
                    <p className="mt-3 font-body text-xs text-pine-soft">No obligation. We reply within 24 hours.</p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-pine/15 px-6 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-[1440px]">
          <span className="mb-4 block font-body text-xs tracking-[0.18em] text-moss uppercase">
            Reference
          </span>
          <h2 className="mb-10 max-w-2xl font-display text-3xl text-pine md:text-4xl">
            Volume pricing, at a glance.
          </h2>

          <div className="mb-8 grid gap-8 md:grid-cols-2">
            {PRODUCT_TYPES.map((p) => (
              <div key={p.id} className="overflow-hidden rounded-sm border border-pine/15 bg-bone">
                <table className="w-full">
                  <thead>
                    <tr className="bg-pine">
                      <th className="px-4 py-3 text-left font-body text-xs tracking-[0.1em] text-bone uppercase">
                        Qty Range
                      </th>
                      <th className="px-4 py-3 text-right font-body text-xs tracking-[0.1em] text-bone uppercase">
                        {p.label.replace(/s$/, "")} /unit
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {PRICING_TIERS.map((t) => (
                      <tr key={t.label} className="border-t border-pine/10">
                        <td className="px-4 py-2.5 font-body text-sm text-pine">{t.label}</td>
                        <td className="px-4 py-2.5 text-right font-body text-sm font-medium tabular-nums text-pine">
                          {formatGBP(t[p.id])}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {ADDON_REFERENCE.map((addon) => (
              <div key={addon.label} className="rounded-sm border border-pine/15 bg-bone p-4">
                <p className="mb-2 font-body text-xs tracking-[0.12em] text-pine-soft uppercase">{addon.label}</p>
                <p className="font-display text-xl tabular-nums text-moss">
                  {formatGBP(addon.price)}
                  <span className="text-xs text-pine-soft">/unit</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
