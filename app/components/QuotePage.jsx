"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Upload, X, ArrowLeft, ArrowRight, Check } from "lucide-react";
import QtyStepper from "@/components/Atelier/QtyStepper";
import { GarmentMockup2D } from "@/components/Atelier/GarmentMockup2D";
import { readQuoteDesigns, clearQuoteDesigns, describeQuoteDesigns } from "@/lib/quote-handoff";
import { supabase } from "@/lib/supabase";
import { getAttribution } from "@/lib/attribution";

// Slugs match the deep links Heritage's per-service CTAs use (`/quote?service=dtg`, etc).
const SERVICES = [
  { slug: "custom-manufacturing", label: "Custom Manufacturing" },
  { slug: "dtg", label: "Direct-to-Garment (DTG)" },
  { slug: "screen-printing", label: "Screen Printing" },
  { slug: "embroidery", label: "Embroidery" },
  { slug: "dtf", label: "Direct-to-Film (DTF)" },
  { slug: "not-sure", label: "Not sure yet" },
];

const GARMENT_CATEGORIES = ["Knitwear", "Outerwear", "Denim", "Accessories", "Footwear", "Other"];

const QUANTITY_RANGES = ["Under 500 units", "500–2,000 units", "2,000–10,000 units", "10,000+ units", "Custom"];

// quotes.quantity is an integer — approximate ranges resolve to their lower bound.
const QUANTITY_RANGE_FLOOR = {
  "Under 500 units": 250,
  "500–2,000 units": 500,
  "2,000–10,000 units": 2000,
  "10,000+ units": 10000,
};

function resolveQuantity({
  isHandoff,
  includedDesigns,
  quantityRange,
  quantityCustom,
}) {
  if (isHandoff) return includedDesigns.reduce((sum, d) => sum + d.qty, 0);
  if (quantityRange === "Custom") return parseInt(quantityCustom.replace(/[^\d]/g, ""), 10) || 0;
  return QUANTITY_RANGE_FLOOR[quantityRange] ?? 0;
}

const FILE_ACCEPT = ".png,.jpg,.jpeg,.pdf,.ai,.psd";
const ADDITIONAL_FILE_ACCEPT = ".png,.jpg,.jpeg,.pdf,.ai,.psd,.zip,.doc,.docx,.xls,.xlsx,.csv,.txt";

const inputClass =
  "w-full rounded-sm border border-pine/15 bg-paper px-3.5 py-2.5 font-body text-sm text-pine transition-colors focus:border-pine focus:outline-none";
const labelClass = "mb-1.5 block font-body text-xs tracking-[0.12em] text-pine-soft uppercase";
const errorClass = "mt-1 font-body text-xs text-red-600";
const filledButton =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-moss px-6 font-body text-sm font-semibold tracking-wide text-pine transition-colors hover:bg-moss-deep disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto";
const outlineButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-sm border border-pine px-6 font-body text-sm font-semibold tracking-wide text-pine transition-colors hover:bg-pine hover:text-bone";
const pillButton = (active) =>
  `rounded-sm border px-3.5 py-2.5 text-left font-body text-sm transition-colors ${
    active ? "border-pine bg-pine text-bone" : "border-pine/15 text-pine hover:border-pine/40"
  }`;

function validate(form, isHandoff) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Enter your name";
  if (!form.company.trim()) errors.company = "Enter your company name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Enter a valid email";
  if (!isHandoff && !form.service) errors.service = "Choose a service";
  if (!isHandoff && !form.garmentCategory) errors.garmentCategory = "Choose a category";
  if (!isHandoff && form.garmentCategory === "Other" && !form.garmentCategoryOther.trim()) {
    errors.garmentCategoryOther = "Tell us your garment category";
  }
  if (!isHandoff && !form.quantityRange) errors.quantityRange = "Choose an approximate quantity";
  if (!isHandoff && form.quantityRange === "Custom" && !form.quantityCustom.trim()) {
    errors.quantityCustom = "Tell us your approximate quantity";
  }
  if (!form.details.trim()) errors.details = "Tell us a little about the project";
  if (!form.agreedToTerms) errors.agreedToTerms = "Please accept the terms and conditions to continue";
  return errors;
}

export function QuotePage({ hideHeading = false, hideArtwork = false } = {}) {
  const searchParams = useSearchParams();
  const [designs, setDesigns] = useState(() => readQuoteDesigns());
  const [excludedDesignIds, setExcludedDesignIds] = useState(new Set());
  const [file, setFile] = useState(null);
  const [additionalFiles, setAdditionalFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [submitError, setSubmitError] = useState(null);

  const isHandoff = designs !== null;

  const initialService = useMemo(() => {
    const requested = searchParams.get("service");
    return SERVICES.find((s) => s.slug === requested)?.slug ?? "";
  }, [searchParams]);

  // Prefills from any `/quote?details=` deep link — the same one-directional query-param
  // pattern Heritage's per-service quote links and a product page's "Request Sample" use.
  const initialDetails = useMemo(() => searchParams.get("details") ?? "", [searchParams]);

  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    service: initialService,
    garmentCategory: "",
    garmentCategoryOther: "",
    quantityRange: "",
    quantityCustom: "",
    deadline: "",
    details: initialDetails,
    agreedToTerms: false,
  });
  const [errors, setErrors] = useState({});

  function field(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateDesignQty(id, nextQty) {
    setDesigns((prev) => (prev ? prev.map((d) => (d.id === id ? { ...d, qty: nextQty } : d)) : prev));
  }

  function toggleDesignIncluded(id) {
    setExcludedDesignIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleFiles(fileList) {
    const picked = fileList?.[0];
    if (picked) setFile(picked);
  }

  function addAdditionalFiles(fileList) {
    const picked = Array.from(fileList ?? []);
    if (picked.length) setAdditionalFiles((prev) => [...prev, ...picked]);
  }

  function removeAdditionalFile(index) {
    setAdditionalFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadQuoteFile(quoteId, f, prefix = "") {
    const filePath = `${quoteId}/${prefix}${f.name}`;
    const { error: uploadError } = await supabase.storage.from("design-files").upload(filePath, f);
    if (uploadError) return;
    await supabase.from("quote_files").insert({
      quote_id: quoteId,
      file_name: f.name,
      file_path: filePath,
      file_size: f.size,
      file_type: f.type,
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    const nextErrors = validate(form, isHandoff);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);

    const includedDesigns = isHandoff && designs ? designs.filter((d) => !excludedDesignIds.has(d.id)) : [];

    const productType = isHandoff
      ? [...new Set(includedDesigns.map((d) => d.garmentLabel))].join(", ") || "Atelier design"
      : (SERVICES.find((s) => s.slug === form.service)?.label ?? form.service);

    const quantity = resolveQuantity({
      isHandoff,
      includedDesigns,
      quantityRange: form.quantityRange,
      quantityCustom: form.quantityCustom,
    });

    const detailsParts = isHandoff
      ? [describeQuoteDesigns(includedDesigns), form.details]
      : [
          `Garment category: ${form.garmentCategory === "Other" ? form.garmentCategoryOther : form.garmentCategory}`,
          `Approx. quantity: ${form.quantityRange === "Custom" ? form.quantityCustom : form.quantityRange}`,
          form.details,
        ];

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: quote, error } = await supabase
      .from("quotes")
      .insert({
        // Campaign attribution captured when the visitor landed (lib/attribution.js), so
        // the ERP's Meta Ads module can credit this request to the ad that paid for it.
        ...getAttribution(),
        customer_id: user?.id ?? null,
        contact_name: form.name,
        contact_email: form.email,
        contact_phone: form.phone || null,
        company_name: form.company,
        product_type: productType,
        quantity,
        deadline: form.deadline || null,
        details: detailsParts.filter(Boolean).join("\n\n"),
      })
      .select()
      .single();

    if (error) {
      setSubmitError(error.message);
      setSubmitting(false);
      return;
    }

    if (file) await uploadQuoteFile(quote.id, file);
    for (let i = 0; i < additionalFiles.length; i++) {
      await uploadQuoteFile(quote.id, additionalFiles[i], `additional-${i}-`);
    }

    setSubmitting(false);
    setFirstName(form.name.trim().split(" ")[0] ?? "");
    if (isHandoff) clearQuoteDesigns();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-paper px-6 py-24 md:px-8">
        <div className="max-w-md text-center">
          <span className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-moss/15 text-moss">
            <Check size={22} strokeWidth={2} />
          </span>
          <h1 className="mb-3 font-display text-3xl text-pine md:text-4xl">Request received</h1>
          <p className="mb-10 font-body text-pine-soft">
            Thank you, {firstName}. Our team will review your enquiry and respond within 24 hours.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link href="/" className="inline-flex items-center gap-2 font-body text-sm text-pine transition-colors hover:text-moss">
              <ArrowLeft size={14} strokeWidth={1.5} /> Return home
            </Link>
            <Link href="/atelier" className="inline-flex items-center gap-2 font-body text-sm text-pine transition-colors hover:text-moss">
              Explore the Atelier <ArrowRight size={14} strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-paper">
      <section className="px-6 pt-16 pb-12 md:px-8 md:pt-20">
        <div className="mx-auto max-w-[1440px]">
          {!hideHeading && (
            <>
              <span className="mb-4 block font-body text-xs tracking-[0.18em] text-moss uppercase">
                Request a Quote
              </span>
              <h1 className="mb-4 font-display text-4xl text-pine md:text-5xl">Tell us what you&rsquo;re making.</h1>
            </>
          )}
          {isHandoff && (
            <Link href="/atelier" className="mt-6 inline-flex items-center gap-2 font-body text-sm text-pine-soft transition-colors hover:text-moss">
              <ArrowLeft size={14} strokeWidth={1.5} /> Back to Atelier
            </Link>
          )}
        </div>
      </section>

      <section className="px-6 pb-20 md:px-8">
        <form onSubmit={onSubmit} noValidate className="mx-auto max-w-[1440px] rounded-sm border border-pine/15">
          <div className="grid lg:grid-cols-2">
            {/* Your Details */}
            <div className="p-6 md:p-12">
              <h2 className="mb-6 font-display text-xl text-pine">Your Details</h2>
              <div className="space-y-5">
                <div>
                  <label className={labelClass} htmlFor="name">Name</label>
                  <input id="name" className={inputClass} type="text" autoComplete="name" value={form.name} onChange={(e) => field("name", e.target.value)} aria-describedby={errors.name ? "name-error" : undefined} aria-invalid={errors.name ? "true" : undefined} />
                  {errors.name && <p id="name-error" role="alert" className={errorClass}>{errors.name}</p>}
                </div>

                <div>
                  <label className={labelClass} htmlFor="email">Email</label>
                  <input id="email" className={inputClass} type="email" autoComplete="email" value={form.email} onChange={(e) => field("email", e.target.value)} aria-describedby={errors.email ? "email-error" : undefined} aria-invalid={errors.email ? "true" : undefined} />
                  {errors.email && <p id="email-error" role="alert" className={errorClass}>{errors.email}</p>}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} htmlFor="company">Company</label>
                    <input id="company" className={inputClass} type="text" autoComplete="organization" value={form.company} onChange={(e) => field("company", e.target.value)} aria-describedby={errors.company ? "company-error" : undefined} aria-invalid={errors.company ? "true" : undefined} />
                    {errors.company && <p id="company-error" role="alert" className={errorClass}>{errors.company}</p>}
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="phone">
                      Phone <span className="text-pine-soft normal-case">(optional)</span>
                    </label>
                    <input id="phone" className={inputClass} type="tel" autoComplete="tel" value={form.phone} onChange={(e) => field("phone", e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Your Project */}
            <div className="border-t border-pine/15 bg-bone p-6 md:p-12 lg:border-t-0 lg:border-l">
              <h2 className="mb-6 font-display text-xl text-pine">Your Project</h2>

              <div className="space-y-6">
                {isHandoff && designs ? (
                  <div>
                    <span className={labelClass}>Designs from the Atelier</span>
                    <div className="space-y-3">
                      {designs.map((d) => {
                        const included = !excludedDesignIds.has(d.id);
                        return (
                          <div
                            key={d.id}
                            className={`flex items-center gap-3 rounded-sm border border-pine/15 bg-paper p-3 transition-opacity ${included ? "" : "opacity-50"}`}
                          >
                            <button
                              type="button"
                              onClick={() => toggleDesignIncluded(d.id)}
                              aria-pressed={included}
                              aria-label={included ? `Exclude ${d.garmentLabel} from quote` : `Include ${d.garmentLabel} in quote`}
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-xs border transition-colors ${
                                included ? "border-pine bg-pine" : "border-pine/25"
                              }`}
                            >
                              {included && <Check size={11} strokeWidth={2.5} className="text-bone" />}
                            </button>
                            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-sm border border-pine/10 bg-bone">
                              <GarmentMockup2D
                                garment={d.garment}
                                side="front"
                                colour={d.colourHex}
                                pattern={d.patternThumb}
                                patternOpacity={d.patternOpacity}
                              />
                              {d.assetThumb && (
                                // eslint-disable-next-line @next/next/no-img-element -- transient blob: URL from the Atelier session, next/image can't optimize it
                                <img src={d.assetThumb} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-contain p-2.5" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-body text-sm text-pine">
                                {d.garmentLabel} · {d.fabricLabel} · {d.colourLabel}
                              </p>
                              <p className="font-body text-xs text-pine-soft">
                                {d.hasPattern ? "Custom pattern · " : ""}
                                {d.layerCount > 0 ? `${d.layerCount} artwork element${d.layerCount > 1 ? "s" : ""}` : "No artwork yet"}
                              </p>
                            </div>
                            <QtyStepper value={d.qty} onChange={(v) => updateDesignQty(d.id, v)} min={10} max={5000} step={10} disabled={!included} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <span className={labelClass}>Service</span>
                      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Service" aria-describedby={errors.service ? "service-error" : undefined}>
                        {SERVICES.map((s) => (
                          <button key={s.slug} type="button" onClick={() => field("service", s.slug)} className={pillButton(form.service === s.slug)}>
                            {s.label}
                          </button>
                        ))}
                      </div>
                      {errors.service && <p id="service-error" role="alert" className={errorClass}>{errors.service}</p>}
                    </div>

                    <div>
                      <span className={labelClass}>Garment Category</span>
                      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Garment category" aria-describedby={errors.garmentCategory ? "garmentCategory-error" : undefined}>
                        {GARMENT_CATEGORIES.map((category) => (
                          <button key={category} type="button" onClick={() => field("garmentCategory", category)} className={pillButton(form.garmentCategory === category)}>
                            {category}
                          </button>
                        ))}
                      </div>
                      {errors.garmentCategory && <p id="garmentCategory-error" role="alert" className={errorClass}>{errors.garmentCategory}</p>}
                      {form.garmentCategory === "Other" && (
                        <>
                          <input
                            className={`${inputClass} mt-2`}
                            type="text"
                            placeholder="Tell us the category"
                            aria-label="Garment category (other)"
                            value={form.garmentCategoryOther}
                            onChange={(e) => field("garmentCategoryOther", e.target.value)}
                            aria-describedby={errors.garmentCategoryOther ? "garmentCategoryOther-error" : undefined}
                            aria-invalid={errors.garmentCategoryOther ? "true" : undefined}
                          />
                          {errors.garmentCategoryOther && <p id="garmentCategoryOther-error" role="alert" className={errorClass}>{errors.garmentCategoryOther}</p>}
                        </>
                      )}
                    </div>

                    <div>
                      <span className={labelClass}>Approximate Quantity</span>
                      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Approximate quantity" aria-describedby={errors.quantityRange ? "quantityRange-error" : undefined}>
                        {QUANTITY_RANGES.map((range) => (
                          <button key={range} type="button" onClick={() => field("quantityRange", range)} className={pillButton(form.quantityRange === range)}>
                            {range}
                          </button>
                        ))}
                      </div>
                      {errors.quantityRange && <p id="quantityRange-error" role="alert" className={errorClass}>{errors.quantityRange}</p>}
                      {form.quantityRange === "Custom" && (
                        <>
                          <input
                            className={`${inputClass} mt-2`}
                            type="text"
                            inputMode="numeric"
                            placeholder="Approximate number of units"
                            aria-label="Approximate quantity (custom)"
                            value={form.quantityCustom}
                            onChange={(e) => field("quantityCustom", e.target.value)}
                            aria-describedby={errors.quantityCustom ? "quantityCustom-error" : undefined}
                            aria-invalid={errors.quantityCustom ? "true" : undefined}
                          />
                          {errors.quantityCustom && <p id="quantityCustom-error" role="alert" className={errorClass}>{errors.quantityCustom}</p>}
                        </>
                      )}
                    </div>
                  </>
                )}

                <div>
                  <label className={labelClass} htmlFor="deadline">
                    Deadline <span className="text-pine-soft normal-case">(optional)</span>
                  </label>
                  <input id="deadline" className={inputClass} type="date" value={form.deadline} onChange={(e) => field("deadline", e.target.value)} />
                </div>

                <div>
                  <label className={labelClass} htmlFor="details">Project Details</label>
                  <textarea id="details" rows={4} className={inputClass} value={form.details} onChange={(e) => field("details", e.target.value)} aria-describedby={errors.details ? "details-error" : undefined} aria-invalid={errors.details ? "true" : undefined} />
                  {errors.details && <p id="details-error" role="alert" className={errorClass}>{errors.details}</p>}
                </div>

                {!hideArtwork && (
                  <>
                  <div>
                    <span className={labelClass}>
                      Artwork file <span className="text-pine-soft normal-case">(optional)</span>
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
                      className={`relative rounded-sm border-2 border-dashed p-5 text-center transition-colors ${dragActive ? "border-moss bg-moss/5" : "border-pine/15"}`}
                    >
                      <input type="file" accept={FILE_ACCEPT} onChange={(e) => handleFiles(e.target.files)} aria-label="Upload artwork file" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                      {file ? (
                        <div className="pointer-events-none relative flex items-center justify-center gap-2">
                          <span className="max-w-[220px] truncate font-body text-sm text-pine">{file.name}</span>
                          <button type="button" onClick={() => setFile(null)} aria-label="Remove file" className="pointer-events-auto text-pine-soft transition-colors hover:text-red-600">
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
                    <span className={labelClass}>
                      Additional files <span className="text-pine-soft/70 normal-case">(optional)</span>
                    </span>
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-sm border-2 border-dashed border-pine/15 p-4 text-center transition-colors hover:border-pine/40">
                      <input
                        type="file"
                        multiple
                        accept={ADDITIONAL_FILE_ACCEPT}
                        onChange={(e) => {
                          addAdditionalFiles(e.target.files);
                          e.target.value = "";
                        }}
                        aria-label="Upload additional files"
                        className="sr-only"
                      />
                      <Upload size={18} strokeWidth={1.5} className="text-pine-soft" />
                      <span className="font-body text-sm text-pine">Add your own files</span>
                    </label>
                    {additionalFiles.length > 0 && (
                      <ul className="mt-2 space-y-1.5">
                        {additionalFiles.map((f, i) => (
                          <li
                            key={`${f.name}-${i}`}
                            className="flex items-center justify-between gap-2 rounded-sm border border-pine/15 bg-paper px-3 py-2"
                          >
                            <span className="min-w-0 truncate font-body text-sm text-pine">{f.name}</span>
                            <button
                              type="button"
                              onClick={() => removeAdditionalFile(i)}
                              aria-label={`Remove ${f.name}`}
                              className="shrink-0 text-pine-soft transition-colors hover:text-red-600"
                            >
                              <X size={14} strokeWidth={1.5} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-pine/15 p-6 md:p-12">
            <label className="flex max-w-sm items-start gap-2.5">
              <input
                type="checkbox"
                checked={form.agreedToTerms}
                onChange={(e) => field("agreedToTerms", e.target.checked)}
                aria-label="I agree to the terms and conditions"
                className="mt-0.5 h-4 w-4 shrink-0 accent-moss"
              />
              <span className="font-body text-xs text-pine-soft">
                I agree to Kazi&rsquo;s terms and conditions.
              </span>
            </label>
            <button type="submit" disabled={submitting} className={filledButton}>
              {submitting ? "Sending…" : "Get a Quote"}
            </button>
            {errors.agreedToTerms && <p className={`${errorClass} w-full`}>{errors.agreedToTerms}</p>}
            <span className="w-full font-body text-xs text-pine-soft">
              By submitting, you agree to our{" "}
              <Link href="/privacy-policy" className="text-pine underline underline-offset-2 hover:text-moss">
                Privacy Policy
              </Link>
              .
            </span>
            {submitError && <p className={`${errorClass} w-full`}>{submitError}</p>}
          </div>
        </form>
      </section>

      <section className="px-6 pb-20 md:px-8">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 border-t border-pine/15 pt-8">
          <p className="font-body text-sm text-pine-soft">
            Need precise pricing? Use our interactive calculator to see per-unit costs instantly.
          </p>
          <Link href="/pricing" className={outlineButton}>
            See Pricing <ArrowRight size={14} strokeWidth={1.5} />
          </Link>
        </div>
      </section>
    </main>
  );
}
