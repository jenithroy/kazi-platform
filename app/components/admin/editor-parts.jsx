"use client";

import { useDeferredValue, useId, useRef, useState } from "react";
import { Bold, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered, Plus, Quote, Trash2, Upload } from "lucide-react";
import { Markdown } from "@/components/blog/Markdown";
import { SEO_ROUTES } from "@/lib/seo-routes";
import { uploadImage } from "@/lib/image-upload";
import { Button, inputClass } from "@/components/admin/ui";

// ----------------------------------------------------------------------------------------
// Google result preview
// ----------------------------------------------------------------------------------------

export function SerpPreview({ title, description, path }) {
  const crumbs = ["kazimanufacturing.com", ...path.split("/").filter(Boolean)].join(" › ");
  return (
    <figure className="m-0 rounded-sm border border-pine/10 bg-white p-4" style={{ fontFamily: "Arial, sans-serif" }}>
      <figcaption className="sr-only">Preview of how this page could appear in Google</figcaption>
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full border border-[#dadce0] bg-[#f1f3f4] text-[11px] font-bold text-pine">
          K
        </span>
        <div className="min-w-0">
          <p className="m-0 truncate text-[14px] leading-tight text-[#202124]">Kazi Manufacturing</p>
          <p className="m-0 truncate text-[12px] leading-tight text-[#4d5156]">{crumbs}</p>
        </div>
      </div>
      <p className="m-0 mt-2 max-w-[600px] truncate text-[20px] leading-[1.3] text-[#1a0dab]">{title}</p>
      <p className="m-0 mt-1 line-clamp-2 max-w-[600px] text-[14px] leading-[1.58] text-[#4d5156]">
        {description || <span className="italic">No description — Google will pick a snippet from the page.</span>}
      </p>
    </figure>
  );
}

// ----------------------------------------------------------------------------------------
// Image upload (cover, social images)
// ----------------------------------------------------------------------------------------

export function ImageField({ label, value, onChange, hint, maxWidth = 1600, disabled = false }) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function onFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await uploadImage(file, { maxWidth }));
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="m-0 mb-1.5 font-body text-xs font-semibold tracking-wide text-pine">{label}</p>
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element -- preview of an uploaded/remote image
        <img src={value} alt="" className="mb-3 aspect-[16/9] w-full rounded-sm border border-pine/10 object-cover" />
      ) : (
        <div className="mb-3 flex aspect-[16/9] w-full items-center justify-center rounded-sm border border-dashed border-pine/25 bg-paper font-body text-xs text-pine-soft">
          No image
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <label
          htmlFor={inputId}
          className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-sm border border-pine/25 bg-bone px-3 font-body text-xs font-semibold text-pine transition-colors hover:bg-paper-raised ${
            disabled || busy ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <Upload size={14} aria-hidden="true" />
          {busy ? "Uploading…" : value ? "Replace" : "Upload"}
        </label>
        <input id={inputId} type="file" accept="image/*" className="sr-only" onChange={onFile} disabled={disabled || busy} />
        {value && (
          <Button variant="ghost" size="sm" onClick={() => onChange("")} disabled={disabled}>
            Remove
          </Button>
        )}
      </div>
      <input
        type="url"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="…or paste an image URL"
        aria-label={`${label} URL`}
        className={`${inputClass} mt-2 text-xs`}
        disabled={disabled}
      />
      {error ? (
        <p role="alert" className="m-0 mt-1 font-body text-xs text-red-700">
          {error}
        </p>
      ) : (
        hint && <p className="m-0 mt-1 font-body text-xs leading-relaxed text-pine-soft">{hint}</p>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------------------
// Markdown body editor
// ----------------------------------------------------------------------------------------

const LINE_PREFIX = /^(#{1,6}\s+|[-*+]\s+|\d+\.\s+|>\s?)/;

function wrap(before, after, placeholder) {
  return (value, start, end) => {
    const selected = value.slice(start, end) || placeholder;
    return {
      text: value.slice(0, start) + before + selected + after + value.slice(end),
      selectStart: start + before.length,
      selectEnd: start + before.length + selected.length,
    };
  };
}

function prefixLines(prefix) {
  return (value, start, end) => {
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const nextBreak = value.indexOf("\n", end);
    const lineEnd = nextBreak === -1 ? value.length : nextBreak;
    const replaced = value
      .slice(lineStart, lineEnd)
      .split("\n")
      .map((line, index) => (prefix === "1. " ? `${index + 1}. ` : prefix) + line.replace(LINE_PREFIX, ""))
      .join("\n");
    return {
      text: value.slice(0, lineStart) + replaced + value.slice(lineEnd),
      selectStart: lineStart,
      selectEnd: lineStart + replaced.length,
    };
  };
}

function insertAt(snippet, selectFrom, selectTo) {
  return (value, start, end) => ({
    text: value.slice(0, start) + snippet + value.slice(end),
    selectStart: start + selectFrom,
    selectEnd: start + selectTo,
  });
}

const LINKABLE_PAGES = SEO_ROUTES.filter((route) => route.group === "Main pages" && route.path !== "/");

export function MarkdownField({ id, value, onChange, disabled = false }) {
  const textareaRef = useRef(null);
  const [mode, setMode] = useState("write");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const preview = useDeferredValue(value);

  function apply(transform) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { text, selectStart, selectEnd } = transform(value, textarea.selectionStart, textarea.selectionEnd);
    onChange(text);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(selectStart, selectEnd);
    });
  }

  function linkToPage(event) {
    const route = LINKABLE_PAGES.find((page) => page.path === event.target.value);
    event.target.value = "";
    if (!route) return;
    const textarea = textareaRef.current;
    const selected = value.slice(textarea.selectionStart, textarea.selectionEnd) || route.label.toLowerCase();
    apply((current, start, end) => {
      const snippet = `[${selected}](${route.path})`;
      return { text: current.slice(0, start) + snippet + current.slice(end), selectStart: start + 1, selectEnd: start + 1 + selected.length };
    });
  }

  async function onImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadImage(file, { maxWidth: 1400 });
      const alt = "describe the image";
      apply(insertAt(`\n![${alt}](${url})\n`, 3, 3 + alt.length));
    } catch (error) {
      setUploadError(error.message);
    } finally {
      setUploading(false);
    }
  }

  const tools = [
    { label: "Bold", icon: Bold, run: wrap("**", "**", "bold text") },
    { label: "Italic", icon: Italic, run: wrap("_", "_", "italic text") },
    { label: "Section heading", icon: Heading2, run: prefixLines("## ") },
    { label: "Sub-heading", icon: Heading3, run: prefixLines("### ") },
    { label: "Link", icon: Link2, run: (current, start, end) => {
        const selected = current.slice(start, end) || "link text";
        const snippet = `[${selected}](https://)`;
        const urlStart = start + selected.length + 3;
        return { text: current.slice(0, start) + snippet + current.slice(end), selectStart: urlStart, selectEnd: urlStart + 8 };
      } },
    { label: "Bulleted list", icon: List, run: prefixLines("- ") },
    { label: "Numbered list", icon: ListOrdered, run: prefixLines("1. ") },
    { label: "Quote", icon: Quote, run: prefixLines("> ") },
  ];

  return (
    <div className="rounded-sm border border-pine/20 bg-bone">
      <div className="flex flex-wrap items-center gap-1 border-b border-pine/10 px-2 py-1.5">
        <div role="tablist" aria-label="Editor mode" className="mr-2 flex rounded-sm bg-paper-raised p-0.5">
          {["write", "preview"].map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={mode === tab}
              onClick={() => setMode(tab)}
              className={`rounded-sm px-3 py-1 font-body text-xs font-semibold capitalize transition-colors ${
                mode === tab ? "bg-bone text-pine shadow-sm" : "text-pine-soft hover:text-pine"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        {mode === "write" && (
          <>
            {tools.map((tool) => (
              <button
                key={tool.label}
                type="button"
                title={tool.label}
                aria-label={tool.label}
                disabled={disabled}
                onClick={() => apply(tool.run)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-pine-soft transition-colors hover:bg-paper-raised hover:text-pine disabled:opacity-40"
              >
                <tool.icon size={16} aria-hidden="true" />
              </button>
            ))}
            <label
              title="Upload an image"
              className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-sm text-pine-soft transition-colors hover:bg-paper-raised hover:text-pine ${
                uploading || disabled ? "pointer-events-none opacity-40" : ""
              }`}
            >
              <ImagePlus size={16} aria-hidden="true" />
              <span className="sr-only">Upload an image</span>
              <input type="file" accept="image/*" className="sr-only" onChange={onImage} disabled={uploading || disabled} />
            </label>
            <select
              aria-label="Link to a page on the site"
              defaultValue=""
              onChange={linkToPage}
              disabled={disabled}
              className="ml-auto h-8 rounded-sm border border-pine/20 bg-bone px-2 font-body text-xs text-pine"
            >
              <option value="">Link to a page…</option>
              {LINKABLE_PAGES.map((page) => (
                <option key={page.path} value={page.path}>
                  {page.label}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {mode === "write" ? (
        <textarea
          id={id}
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          spellCheck
          placeholder={"Start with the question your reader is asking.\n\n## Use section headings like this\n\nLink to [your services](/heritage) and end with a call to action — [request a quote](/quote)."}
          className="block min-h-[28rem] w-full resize-y border-0 bg-transparent px-4 py-3 font-mono text-[0.8125rem] leading-relaxed text-pine placeholder:text-pine-soft/50 focus:outline-none"
        />
      ) : (
        <div className="min-h-[28rem] px-5 py-2">
          {preview.trim() ? <Markdown>{preview}</Markdown> : <p className="font-body text-sm text-pine-soft">Nothing to preview yet.</p>}
        </div>
      )}

      {(uploading || uploadError) && (
        <p role={uploadError ? "alert" : "status"} className={`m-0 border-t border-pine/10 px-4 py-2 font-body text-xs ${uploadError ? "text-red-700" : "text-pine-soft"}`}>
          {uploadError ?? "Uploading image…"}
        </p>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------------------
// FAQ list
// ----------------------------------------------------------------------------------------

export function FaqField({ value, onChange, disabled = false }) {
  const update = (index, key, text) => onChange(value.map((faq, i) => (i === index ? { ...faq, [key]: text } : faq)));
  return (
    <div className="space-y-4">
      {value.map((faq, index) => (
        <div key={index} className="rounded-sm border border-pine/15 bg-paper p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-body text-xs font-semibold text-pine-soft">Question {index + 1}</span>
            <Button variant="ghost" size="sm" onClick={() => onChange(value.filter((_, i) => i !== index))} disabled={disabled} aria-label={`Remove question ${index + 1}`}>
              <Trash2 size={14} aria-hidden="true" />
            </Button>
          </div>
          <input
            value={faq.question}
            onChange={(event) => update(index, "question", event.target.value)}
            placeholder="e.g. What's your minimum order?"
            aria-label={`Question ${index + 1}`}
            className={inputClass}
            disabled={disabled}
          />
          <textarea
            value={faq.answer}
            onChange={(event) => update(index, "answer", event.target.value)}
            placeholder="A direct, complete answer in two or three sentences."
            aria-label={`Answer ${index + 1}`}
            rows={3}
            className={`${inputClass} mt-2`}
            disabled={disabled}
          />
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...value, { question: "", answer: "" }])} disabled={disabled}>
        <Plus size={14} aria-hidden="true" /> Add a question
      </Button>
    </div>
  );
}
