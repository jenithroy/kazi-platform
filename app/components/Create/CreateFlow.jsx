"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Upload, X } from "lucide-react";
import QtyStepper from "@/components/Atelier/QtyStepper";
import { COLOURS, DEFAULT_COLOUR } from "@/lib/garments";
import { SITE_EMAIL, SITE_PHONE, SITE_PHONE_DIGITS } from "@/lib/site";
import { LogoError, dashboardEnabled, fetchLogo, mailtoUrl, newOrderKey, parseBrandInput, retryOutbox, submitOrder, whatsappUrl } from "@/lib/dashboard-orders";
import { CREATE_GARMENTS, DEFAULT_GARMENT, createGarment } from "./config";
import { GarmentPreview, GarmentThumb } from "./GarmentPreview";
import { buildDesignPayload, colourForLogo, colourLabel, slugify } from "./order";

// Create by design: a garment, a logo found from the person's website or Instagram name (the Worker takes the website's logo, or the public profile
// picture of the Instagram name, which is only 150 px: the digitizer then says the picture is small) or uploaded, the logo digitized and shown on
// the garment, and the order, on one screen that grows. Two clicks: "Make my preview", then "Place order". The contract with the dashboard is
// docs/dashboard-link.md; every call to it goes through lib/dashboard-orders.js.
//
// The stitch engine (lib/digitizer/oneClick.js: workers, the same engine as /digitizer) is fetched on the first click, never on page load.

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const UPLOAD_OK = /^image\/(png|jpeg|webp|svg\+xml)$/;
const UPLOAD_EXT = /\.(png|jpe?g|webp|svg)$/i;
const CONTACT_EMAIL = SITE_EMAIL;
const WHATSAPP_URL = `https://wa.me/${SITE_PHONE_DIGITS}?text=${encodeURIComponent("Hi Kazi Manufacturing, I'd like to create a design with my logo.")}`;

// text-base (16px) below `sm`: iOS Safari zooms the whole page in when a smaller field is focused (the same rule as the quote form).
const inputClass =
  "w-full rounded-sm border border-pine/15 bg-paper px-3.5 py-2.5 font-body text-base text-pine transition-colors focus:border-pine focus:outline-none sm:text-sm";
const labelClass = "mb-1.5 block font-body text-xs tracking-[0.12em] text-pine-soft uppercase";
const errorClass = "mt-1 font-body text-xs text-red-700";
const primaryButton =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-sm btn-solid px-6 font-body text-sm font-semibold tracking-wide text-bone disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto";
const textButton = "font-body text-sm text-pine underline underline-offset-2 transition-colors hover:text-moss-deep disabled:cursor-not-allowed disabled:opacity-60";
const linkClass = "text-pine underline underline-offset-2 hover:text-moss-deep";

let enginePromise = null;
/** The stitch engine, fetched once (and only in the browser, on a click). A failed fetch is not remembered: the next call tries again. */
const loadEngine = () => {
  enginePromise ||= import("@/lib/digitizer/oneClick");
  enginePromise.catch(() => { enginePromise = null; });
  return enginePromise;
};
/** Start fetching the engine before it is needed (on focus or hover); nothing to wait for, nothing to report. */
const warmEngine = () => { loadEngine().catch(() => {}); };

const STEP_FIND = 0, STEP_READ = 1, STEP_DIGITIZE = 2, STEP_PLACE = 3;

function revoke(url) {
  if (url) URL.revokeObjectURL(url);
}

/**
 * What went wrong with the lookup, in words for the person (never a code). A 404 is an ordinary outcome (a mistyped Instagram name, Instagram
 * not answering the Worker): the words the Worker sent for it are shown as they are.
 */
function lookupMessage(err, parsed) {
  const what = parsed?.handle ? `@${parsed.handle}` : parsed?.site ? parsed.site.replace(/^https?:\/\//, "") : "that";
  if (err.code === "not_found") {
    if (err.fromServer) return err.message;
    return parsed?.handle
      ? `We couldn’t find a logo for ${what}. Check the spelling, type your website instead, or upload your logo.`
      : `We couldn’t find a logo on ${what}. Upload your logo below and we’ll carry on from there.`;
  }
  if (err.code === "rate_limited") return "A lot of logos have been looked up just now. Upload your logo below, or try again in a minute.";
  if (err.code === "invalid") return "That doesn’t look like a website or an Instagram name. Try yourbrand.com, or upload your logo below.";
  return "The logo finder isn’t answering right now. Upload your logo below and carry on, or try again in a minute.";
}

function ContactFallback() {
  return (
    <>
      email{" "}
      <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>{CONTACT_EMAIL}</a> or message us on{" "}
      <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>WhatsApp ({SITE_PHONE})</a>.
    </>
  );
}

function Unavailable() {
  return (
    <div role="status" className="rounded-sm border border-pine/15 bg-bone p-6 font-body text-sm text-pine md:p-8">
      <p className="font-display text-xl text-pine">Create by design is not available just now.</p>
      <p className="mt-3 max-w-xl text-pine-soft">
        Please <ContactFallback /> You can still turn a logo into a machine embroidery file with the{" "}
        <Link href="/digitizer" className={linkClass}>free digitizer</Link>, or <Link href="/quote" className={linkClass}>request a quote</Link>.
      </p>
    </div>
  );
}

function Spinner() {
  return <span aria-hidden="true" className="inline-block h-3.5 w-3.5 rounded-full border-2 border-pine/25 border-t-pine motion-safe:animate-spin" />;
}

export default function CreateFlow() {
  const uid = useId();
  const [garmentId, setGarmentId] = useState(DEFAULT_GARMENT);
  const [colour, setColour] = useState(DEFAULT_COLOUR);
  const colourPicked = useRef(false);
  const [brandText, setBrandText] = useState("");
  const [inputError, setInputError] = useState("");
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const [phase, setPhase] = useState("idle"); // idle | working | result | done
  const [step, setStep] = useState(STEP_FIND);
  const [lookupError, setLookupError] = useState(null); // { code, message }
  const [problem, setProblem] = useState("");
  const [logo, setLogo] = useState(null); // { blob, url, from: "instagram" | "website" | "upload", host, name, parsed }
  const [result, setResult] = useState(null); // { out, overlay: { url, aspect, widthMm } | null, forGarment, forColour }
  const [updating, setUpdating] = useState(false);

  const [qty, setQty] = useState(50);
  const [contact, setContact] = useState({ name: "", email: "", company: "", phone: "" });
  const [message, setMessage] = useState("");
  const [rights, setRights] = useState(false);
  const [hp, setHp] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [sendNote, setSendNote] = useState("");
  const [orderError, setOrderError] = useState("");
  const [fallback, setFallback] = useState(null); // the order (without files), for the WhatsApp / e-mail links when it could not be sent
  const [done, setDone] = useState(null); // { ref }

  const abortRef = useRef(null);
  const redoRef = useRef(null);
  const submitLock = useRef(false);
  const keyRef = useRef(null);
  const brandInputRef = useRef(null);
  const resultRef = useRef(null);
  const doneRef = useRef(null);
  const urls = useRef({ logo: null, overlay: null });

  const garment = createGarment(garmentId);
  const working = phase === "working";

  // Orders an earlier visit could not deliver are sent again, once, quietly.
  useEffect(() => {
    retryOutbox();
    const bag = urls.current; // the same object for the life of the page: its properties are what change
    return () => {
      abortRef.current?.abort();
      redoRef.current?.abort();
      revoke(bag.logo);
      revoke(bag.overlay);
    };
  }, []);

  function replaceLogo(next) {
    revoke(urls.current.logo);
    urls.current.logo = next?.url || null;
    setLogo(next);
  }
  function replaceResult(next) {
    revoke(urls.current.overlay);
    urls.current.overlay = next?.overlay?.url || null;
    setResult(next);
  }

  /** Digitize a logo for a garment and colour; resolves to the result object the page keeps. */
  async function digitize(blob, g, col, { signal, name, onStep }) {
    let eng;
    try {
      eng = await loadEngine();
    } catch {
      eng = await loadEngine(); // one more try (a flaky connection when the first request for the code failed)
    }
    const gm = createGarment(g);
    const out = await eng.digitizeLogo(blob, { widthMm: gm.stitchWidthMm, fabric: gm.fabric, cloth: col, name, signal, onStep });
    let overlay = null;
    if (out.overlayCanvas) {
      const c = out.overlayCanvas;
      const png = await new Promise((resolve) => c.toBlob(resolve, "image/png"));
      overlay = { url: URL.createObjectURL(png), aspect: c.width / c.height, widthMm: c.width / eng.THREAD_PX_PER_MM };
    }
    out.overlayCanvas = null; // the page keeps the picture's URL, not the canvas
    return { out, overlay, forGarment: g, forColour: col };
  }

  async function makePreview(upload = file) {
    if (working) return;
    const parsed = parseBrandInput(brandText);
    if (!upload && !parsed) {
      setInputError(brandText.trim() ? "That doesn’t look like a website or an Instagram name. Try yourbrand.com, or upload your logo." : "Type your website, or upload your logo.");
      brandInputRef.current?.focus();
      return;
    }
    abortRef.current?.abort();
    redoRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    setInputError("");
    setLookupError(null);
    setProblem("");
    setOrderError("");
    setFallback(null);
    replaceResult(null);
    setPhase("working");
    setStep(upload ? STEP_READ : STEP_FIND);

    try {
      let blob, from = "upload", host = null, name;
      if (upload) {
        blob = upload;
        name = upload.name.replace(/\.[^.]+$/, "");
      } else {
        const found = await fetchLogo({ ...parsed, signal: ctl.signal });
        blob = found.blob;
        from = found.source === "instagram" ? "instagram" : found.source === "website" ? "website" : parsed.handle ? "instagram" : "website";
        host = found.from;
        name = parsed.handle || parsed.site;
      }
      if (ctl.signal.aborted) return;
      replaceLogo({ blob, url: URL.createObjectURL(blob), from, host, name: slugify(name), parsed });
      let col = colour;
      if (!colourPicked.current) {
        const suggested = await colourForLogo(blob);
        if (suggested) { col = suggested; setColour(suggested); }
      }
      if (ctl.signal.aborted) return;
      setStep(STEP_READ);
      const next = await digitize(blob, garmentId, col, {
        signal: ctl.signal,
        name: slugify(name),
        onStep: (s) => setStep(s === "reading" ? STEP_READ : s === "digitizing" ? STEP_DIGITIZE : STEP_PLACE),
      });
      if (ctl.signal.aborted) { revoke(next.overlay?.url); return; }
      replaceResult(next);
      setPhase("result");
      requestAnimationFrame(() => {
        resultRef.current?.focus({ preventScroll: true });
        resultRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      });
    } catch (err) {
      if (err?.name === "AbortError" || ctl.signal.aborted) return;
      if (err instanceof LogoError) {
        setLookupError({ code: err.code, message: lookupMessage(err, parsed) });
      } else if (err?.name === "DigitizeError") {
        setProblem(`${err.message} Try another picture, or upload your logo as a PNG.`);
        replaceLogo(null);
        setFile(null); // a picture that could not be used is not left standing in the upload box: the box asks for another
      } else {
        console.error("Create by design: preview failed", err);
        setProblem("Something went wrong while making your preview. Please try again, or upload your logo.");
        replaceLogo(null);
        setFile(null);
      }
      setPhase("idle");
    }
  }

  function cancel() {
    abortRef.current?.abort();
    setPhase("idle");
  }

  /** A file chosen or dropped: if it is a picture we can use, the preview starts at once (choosing the file is the whole of the person's intent: no second button to press). */
  function pickFile(f) {
    if (!f || working) return;
    if (!(UPLOAD_OK.test(f.type) || UPLOAD_EXT.test(f.name))) {
      setFileError("That file isn’t a PNG, JPG, WebP or SVG picture.");
      return;
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      setFileError("That picture is over 5 MB. Please send a smaller copy.");
      return;
    }
    setFileError("");
    setFile(f);
    setInputError("");
    makePreview(f);
  }

  /** Forget the logo and what was made from it (the person pressed ×, or "Not my logo?"). */
  function clearLogo() {
    abortRef.current?.abort();
    redoRef.current?.abort();
    replaceResult(null);
    replaceLogo(null);
    setFile(null);
    setPhase("idle");
    setProblem("");
  }

  // The garment or the colour was changed after a preview: the stitches are made again for it (the logo is not looked up again).
  useEffect(() => {
    if (phase !== "result" || !logo || !result) return undefined;
    if (result.forGarment === garmentId && result.forColour === colour) return undefined;
    const t = setTimeout(async () => {
      redoRef.current?.abort();
      const ctl = new AbortController();
      redoRef.current = ctl;
      setUpdating(true);
      try {
        const next = await digitize(logo.blob, garmentId, colour, { signal: ctl.signal, name: logo.name });
        if (ctl.signal.aborted) { revoke(next.overlay?.url); return; }
        replaceResult(next);
      } catch (err) {
        if (err?.name !== "AbortError" && !ctl.signal.aborted) setProblem(err?.message || "The stitches could not be made again.");
      } finally {
        if (redoRef.current === ctl) setUpdating(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [garmentId, colour, phase, logo, result]);

  function chooseLogoAgain() {
    clearLogo();
    setLookupError({ code: "again", message: "Type another website, or upload a different logo." });
    brandInputRef.current?.focus();
  }

  function validate() {
    const next = {};
    if (!contact.name.trim()) next.name = "Enter your name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) next.email = "Enter a valid email";
    if (!rights) next.rights = "Please confirm the logo is yours, or that you may use it";
    return next;
  }

  async function placeOrder(e) {
    e.preventDefault();
    if (submitLock.current) return; // a double click is one order
    const next = validate();
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) {
      document.getElementById(`${uid}-${first}`)?.focus();
      return;
    }
    if (!result || result.out.empty || updating) return;
    submitLock.current = true;
    setSubmitting(true);
    setOrderError("");
    setFallback(null);
    setSendNote("");
    try {
      keyRef.current ||= newOrderKey(); // one key for this order, however many times the button is pressed
      const payload = await buildDesignPayload({
        key: keyRef.current, garmentId, colour, qty, contact, message, parsed: logo.parsed, logo, result: result.out,
      });
      payload.hp = hp;
      const r = await submitOrder(payload, {
        onProgress: (p) => setSendNote(p.state === "waiting" ? `Trying again (${p.attempt + 1} of ${p.of})…` : p.attempt > 1 ? `Trying again (${p.attempt} of ${p.of})…` : ""),
      });
      if (r.ok) {
        setDone({ ref: r.ref });
        setPhase("done");
        keyRef.current = null;
        requestAnimationFrame(() => doneRef.current?.focus());
      } else if (r.error === "invalid" || r.error === "too_large") {
        setOrderError(r.message);
        if (r.field === "contact.email") document.getElementById(`${uid}-email`)?.focus();
      } else {
        setFallback({ ...payload, files: undefined });
      }
    } catch (err) {
      // a design too big to send, or a logo that cannot be made small enough: words for the person (order.js OrderFilesError), anything else is ours
      if (err?.name === "OrderFilesError") {
        setOrderError(err.message);
      } else {
        console.error("Create by design: order failed", err);
        setOrderError("Something went wrong while preparing your order. Please try again.");
      }
    } finally {
      submitLock.current = false;
      setSubmitting(false);
      setSendNote("");
    }
  }

  function startAnother() {
    abortRef.current?.abort();
    redoRef.current?.abort();
    replaceResult(null);
    replaceLogo(null);
    keyRef.current = null;
    colourPicked.current = false;
    setPhase("idle");
    setDone(null);
    setFile(null);
    setBrandText("");
    setRights(false);
    setMessage("");
    setErrors({});
    setOrderError("");
    setFallback(null);
    setLookupError(null);
    setProblem("");
    window.scrollTo({ top: 0 });
  }

  if (!dashboardEnabled) return <Unavailable />;

  const stageLabel = `${garment.label} in ${colourLabel(colour)}${result?.overlay ? ", with your logo stitched on" : ". Your logo will go in the dashed box."}`;
  const uploadAttention = Boolean(lookupError && lookupError.code !== "again") || Boolean(problem);
  const steps = [
    file && !brandText.trim() ? "Opening your logo" : "Finding your logo",
    "Reading it",
    "Digitizing",
    `Placing it on the ${garment.label.toLowerCase()}`,
  ];
  const out = result?.out;
  const empty = Boolean(out?.empty);
  const canOrder = phase === "result" && out && !empty; // (while the stitches are made again for a new choice the form stays, its button waits)

  if (phase === "done") {
    return (
      <div className="mx-auto grid max-w-3xl gap-8 rounded-sm border border-pine/15 bg-bone p-6 md:grid-cols-[minmax(0,260px)_1fr] md:p-10">
        <div className="[--stage-h:240px]">
          <GarmentPreview garmentId={garmentId} colour={colour} overlay={result?.overlay} label={stageLabel} />
        </div>
        <div>
          <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-moss/15 text-moss-deep"><Check size={22} strokeWidth={2} aria-hidden="true" /></span>
          <h2 ref={doneRef} tabIndex={-1} className="font-display text-3xl text-pine focus:outline-none md:text-4xl">Order received</h2>
          <p className="mt-3 font-body text-pine">Your reference is <b className="font-semibold">{done?.ref || "on its way"}</b>.</p>
          <ul className="mt-4 space-y-2 font-body text-[0.95rem] leading-relaxed text-pine-soft">
            <li>Kazi checks your logo and your design. Nothing is made until you have agreed the price.</li>
            <li>We reply to <b className="font-semibold text-pine">{contact.email}</b> within one working day with the price and the timing.</li>
            <li>No payment has been taken.</li>
          </ul>
          <button type="button" onClick={startAnother} className={`mt-6 ${primaryButton}`}>
            Start another design <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-x-14 lg:gap-y-6">
        {/* the garment, with the logo on it once there is one */}
        <div className="[--stage-h:300px] lg:col-start-2 lg:row-start-1 lg:[--stage-h:520px]">
          <GarmentPreview garmentId={garmentId} colour={colour} overlay={result?.overlay} working={working || updating} label={stageLabel} />
        </div>

        {/* choices and the logo */}
        <div className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <section aria-labelledby={`${uid}-garment-h`}>
            <h2 id={`${uid}-garment-h`} className="font-display text-xl text-pine md:text-2xl">Choose a garment</h2>
            <fieldset className="mt-4">
              <legend className="sr-only">Garment</legend>
              <div className="grid grid-cols-3 gap-3">
                {CREATE_GARMENTS.map((g) => (
                  <label key={g.id} className="block cursor-pointer">
                    <input type="radio" name={`${uid}-garment`} value={g.id} checked={garmentId === g.id} onChange={() => setGarmentId(g.id)} className="peer sr-only" />
                    <span className="flex h-full flex-col items-center justify-between gap-2 rounded-sm border border-pine/15 bg-bone p-2.5 text-center transition-colors hover:border-pine/40 peer-checked:border-pine peer-checked:ring-1 peer-checked:ring-pine peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-pine">
                      <span className="flex h-[76px] w-full items-center justify-center"><GarmentThumb garmentId={g.id} colour={colour} /></span>
                      <span className="font-body text-sm font-semibold text-pine">{g.label}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="mt-5">
              <legend className="font-body text-sm text-pine">
                Colour: <span className="font-semibold">{colourLabel(colour)}</span>
              </legend>
              <div className="mt-2.5 flex flex-wrap gap-2.5">
                {COLOURS.map((c) => (
                  <label key={c.hex} className="block cursor-pointer" title={c.label}>
                    <input
                      type="radio" name={`${uid}-colour`} value={c.hex} checked={colour.toLowerCase() === c.hex.toLowerCase()}
                      onChange={() => { colourPicked.current = true; setColour(c.hex); }} className="peer sr-only" aria-label={c.label}
                    />
                    <span
                      aria-hidden="true"
                      className="block h-9 w-9 rounded-full border border-pine/20 transition-shadow peer-checked:ring-2 peer-checked:ring-pine peer-checked:ring-offset-2 peer-checked:ring-offset-paper peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-pine"
                      style={{ background: c.hex }}
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          </section>

          <section aria-labelledby={`${uid}-logo-h`} className="mt-9">
            <h2 id={`${uid}-logo-h`} className="font-display text-xl text-pine md:text-2xl">Add your logo</h2>
            <form
              className="mt-4"
              noValidate
              onSubmit={(e) => { e.preventDefault(); makePreview(); }}
            >
              <label htmlFor={`${uid}-brand`} className={labelClass}>Your website (or Instagram name)</label>
              <input
                ref={brandInputRef}
                id={`${uid}-brand`}
                type="text"
                inputMode="text"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="off"
                enterKeyHint="go"
                placeholder="yourbrand.com or @yourbrand"
                value={brandText}
                disabled={working}
                onFocus={warmEngine}
                onChange={(e) => { setBrandText(e.target.value); if (inputError) setInputError(""); }}
                aria-describedby={`${uid}-brand-help${inputError ? ` ${uid}-brand-err` : ""}`}
                aria-invalid={inputError ? "true" : undefined}
                className={inputClass}
              />
              <p id={`${uid}-brand-help`} className="mt-1.5 font-body text-xs text-pine-soft">We look for your logo there. From an Instagram name we can only take the small profile picture (150 px), so a website logo or an upload will sew more cleanly.</p>
              {inputError && <p id={`${uid}-brand-err`} role="alert" className={errorClass}>{inputError}</p>}

              {lookupError && (
                <div role="alert" className="mt-4 rounded-sm border border-pine/25 bg-bone p-4 font-body text-sm text-pine">{lookupError.message}</div>
              )}
              {problem && (
                <div role="alert" className="mt-4 rounded-sm border border-red-700/30 bg-red-700/5 p-4 font-body text-sm text-pine">{problem}</div>
              )}

              {/* the upload is always on offer, and is the way on whenever the lookup does not work */}
              <div className="mt-5">
                <span className={labelClass}>Or upload your logo</span>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => { e.preventDefault(); setDragActive(false); pickFile(e.dataTransfer.files?.[0]); }} /* (a file dropped while a preview is being made is ignored) */
                  className={`relative rounded-sm border-2 border-dashed p-4 text-center transition-colors focus-within:border-pine ${dragActive || uploadAttention ? "border-moss bg-moss/5" : "border-pine/15"}`}
                >
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                    disabled={working}
                    onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }}
                    aria-label="Upload your logo"
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                  />
                  {file ? (
                    <div className="pointer-events-none relative flex items-center justify-center gap-2">
                      <span className="max-w-[240px] truncate font-body text-sm text-pine">{file.name}</span>
                      <button type="button" onClick={() => { if (logo?.from === "upload") clearLogo(); else setFile(null); }} aria-label="Remove the uploaded logo" className="pointer-events-auto relative z-10 text-pine-soft transition-colors hover:text-red-700">
                        <X size={14} strokeWidth={1.5} />
                      </button>
                    </div>
                  ) : (
                    <div className="pointer-events-none">
                      <Upload className="mx-auto mb-1.5 text-pine-soft" size={20} strokeWidth={1.5} aria-hidden="true" />
                      <p className="font-body text-sm text-pine">{uploadAttention ? "Upload your logo here" : "Drop a file or click to upload"}</p>
                      <p className="mt-0.5 font-body text-xs text-pine-soft">PNG, JPG, WebP or SVG, up to 5 MB. A larger original sews best.</p>
                    </div>
                  )}
                </div>
                {fileError && <p role="alert" className={errorClass}>{fileError}</p>}
              </div>

              <div className="mt-6">
                <button type="submit" disabled={working} onPointerEnter={warmEngine} className={primaryButton}>
                  {working ? "Making your preview…" : phase === "result" ? "Make it again" : "Make my preview"}
                  {!working && <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />}
                </button>
              </div>
            </form>

            {working && (
              <div className="mt-5">
                <ol className="space-y-2 font-body text-sm text-pine" aria-label="Progress">
                  {steps.map((text, i) => {
                    const state = i < step ? "done" : i === step ? "active" : "todo";
                    return (
                      <li key={text} aria-current={state === "active" ? "step" : undefined} className={`flex items-center gap-2.5 ${state === "todo" ? "text-pine-soft/80" : ""}`}>
                        <span className="flex h-5 w-5 items-center justify-center">
                          {state === "done" ? <Check size={14} strokeWidth={2.2} className="text-moss-deep" aria-hidden="true" /> : state === "active" ? <Spinner /> : <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-pine/25" />}
                        </span>
                        <span>{text}{state === "active" ? "…" : ""}{state === "done" ? <span className="sr-only"> (done)</span> : null}</span>
                      </li>
                    );
                  })}
                </ol>
                <button type="button" onClick={cancel} className={`mt-3 ${textButton}`}>Cancel</button>
              </div>
            )}
            <p role="status" aria-live="polite" className="sr-only">{working ? `${steps[step]}…` : phase === "result" ? (empty ? "Nothing could be stitched on this colour." : "Your preview is ready.") : ""}</p>
          </section>
        </div>

        {/* what came out */}
        <div className="min-w-0 lg:col-start-2 lg:row-start-2">
          {phase === "result" && out && (
            <section aria-labelledby={`${uid}-facts-h`} className="rounded-sm border border-pine/15 bg-bone p-5 md:p-6">
              <h2 id={`${uid}-facts-h`} ref={resultRef} tabIndex={-1} className="font-display text-xl text-pine focus:outline-none md:text-2xl">
                Your {garment.label.toLowerCase()}, with your logo
              </h2>

              {empty ? (
                <p role="status" className="mt-3 font-body text-sm leading-relaxed text-pine">{out.notes[0]}</p>
              ) : (
                <>
                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 font-body text-sm text-pine">
                    <div><dt className="text-xs text-pine-soft">Stitches</dt><dd className="font-display text-lg tabular-nums">{out.summary.stitches.toLocaleString("en-GB")}</dd></div>
                    <div><dt className="text-xs text-pine-soft">Size</dt><dd className="font-display text-lg tabular-nums">{out.widthMm} × {out.heightMm} mm</dd></div>
                    <div className="col-span-2"><dt className="text-xs text-pine-soft">Colours</dt><dd className="font-display text-lg">{out.summary.colours} <span className="font-body text-sm text-pine-soft">({out.colours.map((c) => c.name).join(", ")})</span></dd></div>
                    <div className="col-span-2"><dt className="text-xs text-pine-soft">Placement</dt><dd>{garment.placement}, shown to scale</dd></div>
                  </dl>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <figure className="m-0">
                      <div className="flex h-28 items-center justify-center rounded-sm border border-pine/15 bg-white p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element -- a blob: URL for the logo that was found */}
                        <img src={logo?.url} alt="The logo we found" className="max-h-full max-w-full object-contain" />
                      </div>
                      <figcaption className="mt-1.5 font-body text-xs leading-snug text-pine-soft">
                        {logo?.from === "upload" ? "The logo you uploaded" : logo?.from === "instagram" ? `Found on Instagram${logo.parsed?.handle ? ` (@${logo.parsed.handle})` : ""}` : `Found on ${logo?.host || "your website"}`}
                      </figcaption>
                    </figure>
                    <figure className="m-0">
                      <div className="flex h-28 items-center justify-center rounded-sm border border-pine/15 p-2" style={{ background: colour }}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- a blob: URL made in this page */}
                        {result.overlay && <img src={result.overlay.url} alt="Close-up of your logo as stitches" className="max-h-full max-w-full object-contain" />}
                      </div>
                      <figcaption className="mt-1.5 font-body text-xs leading-snug text-pine-soft">As stitches, close up</figcaption>
                    </figure>
                  </div>

                  {out.notes.length > 0 && (
                    <div className="mt-4 rounded-sm border border-pine/25 bg-paper p-3.5" role="note">
                      {out.notes.map((n) => <p key={n} className="font-body text-sm leading-relaxed text-pine">{n}</p>)}
                      <label className="mt-2.5 inline-flex cursor-pointer items-center gap-2 font-body text-sm text-pine underline underline-offset-2 hover:text-moss-deep">
                        <Upload size={14} strokeWidth={1.5} aria-hidden="true" />
                        Upload a better one
                        <input type="file" accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; pickFile(f); }} />
                      </label>
                    </div>
                  )}
                  <p className="mt-4 font-body text-xs leading-relaxed text-pine-soft">
                    Estimated by our software: nothing has been sewn yet. Kazi checks every design before it is stitched.
                  </p>
                </>
              )}
              {updating && <p role="status" className="mt-3 flex items-center gap-2 font-body text-sm text-pine-soft"><Spinner /> Updating for the new {empty ? "colour" : "choice"}…</p>}
              <p className="mt-4">
                <button type="button" onClick={chooseLogoAgain} className={textButton}>Not my logo? Use another</button>
              </p>
            </section>
          )}
        </div>
      </div>

      {canOrder && (
        <section aria-labelledby={`${uid}-order-h`} className="mt-10 rounded-sm border border-pine/15">
          <form onSubmit={placeOrder} noValidate className="grid gap-x-12 gap-y-8 p-6 md:p-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div>
              <h2 id={`${uid}-order-h`} className="font-display text-xl text-pine md:text-2xl">Place your order</h2>
              <p className="mt-3 font-body text-sm leading-relaxed text-pine-soft">
                No payment now. Kazi checks your logo and confirms the price and timing by e-mail.
              </p>
              <div className="mt-6">
                <span className={labelClass}>Quantity</span>
                <QtyStepper value={qty} onChange={setQty} min={10} max={5000} step={10} />
                <p className="mt-1.5 font-body text-xs text-pine-soft">{qty} × {garment.label.toLowerCase()}, {colourLabel(colour).toLowerCase()}, with your logo.</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor={`${uid}-name`}>Name</label>
                  <input id={`${uid}-name`} className={inputClass} type="text" autoComplete="name" value={contact.name} onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))} aria-invalid={errors.name ? "true" : undefined} aria-describedby={errors.name ? `${uid}-name-err` : undefined} />
                  {errors.name && <p id={`${uid}-name-err`} role="alert" className={errorClass}>{errors.name}</p>}
                </div>
                <div>
                  <label className={labelClass} htmlFor={`${uid}-email`}>Email</label>
                  <input id={`${uid}-email`} className={inputClass} type="email" autoComplete="email" value={contact.email} onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))} aria-invalid={errors.email ? "true" : undefined} aria-describedby={errors.email ? `${uid}-email-err` : undefined} />
                  {errors.email && <p id={`${uid}-email-err`} role="alert" className={errorClass}>{errors.email}</p>}
                </div>
                <div>
                  <label className={labelClass} htmlFor={`${uid}-company`}>Company <span className="text-pine-soft normal-case">(optional)</span></label>
                  <input id={`${uid}-company`} className={inputClass} type="text" autoComplete="organization" value={contact.company} onChange={(e) => setContact((c) => ({ ...c, company: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass} htmlFor={`${uid}-phone`}>Phone <span className="text-pine-soft normal-case">(optional)</span></label>
                  <input id={`${uid}-phone`} className={inputClass} type="tel" autoComplete="tel" value={contact.phone} onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className={labelClass} htmlFor={`${uid}-message`}>Anything else? <span className="text-pine-soft normal-case">(optional)</span></label>
                <textarea id={`${uid}-message`} rows={3} maxLength={2000} className={inputClass} value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>

              {/* a trap for programs that fill every field: people never see it, and it must stay empty */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label>Leave this empty<input type="text" name="hp_field" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} /></label>
              </div>

              <div>
                <label className="flex items-start gap-2.5">
                  <input id={`${uid}-rights`} type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} aria-invalid={errors.rights ? "true" : undefined} aria-describedby={errors.rights ? `${uid}-rights-err` : undefined} className="mt-0.5 h-4 w-4 shrink-0 accent-moss" />
                  <span className="font-body text-sm text-pine">This logo is mine, or I may use it on clothing.</span>
                </label>
                {errors.rights && <p id={`${uid}-rights-err`} role="alert" className={errorClass}>{errors.rights}</p>}
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                <button type="submit" disabled={submitting || updating} aria-disabled={submitting || updating} className={primaryButton}>
                  {submitting ? "Sending…" : fallback ? "Try again" : "Place order"}
                </button>
                {sendNote && <span role="status" className="font-body text-sm text-pine-soft">{sendNote}</span>}
              </div>
              <p className="font-body text-xs text-pine-soft">
                By placing the order you agree to our <Link href="/terms" className={linkClass}>Terms</Link> and <Link href="/privacy-policy" className={linkClass}>Privacy Policy</Link>.
              </p>

              {orderError && <p role="alert" className="font-body text-sm text-red-700">{orderError}</p>}
              {fallback && (
                <div role="alert" className="rounded-sm border border-pine/25 bg-bone p-4 font-body text-sm text-pine">
                  <p><b className="font-semibold">We couldn’t send your order just now.</b> It’s saved on this device and we’ll send it again by itself the next time you open this page. To be sure, send it to us now:</p>
                  <p className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                    <a href={whatsappUrl(fallback)} target="_blank" rel="noopener noreferrer" className={linkClass}>WhatsApp</a>
                    <a href={mailtoUrl(fallback)} className={linkClass}>E-mail</a>
                  </p>
                </div>
              )}
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
