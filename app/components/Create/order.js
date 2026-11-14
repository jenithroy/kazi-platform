// The files and the payload of a Create by design order (docs/dashboard-link.md, "POST /api/website-orders"). Browser only: canvas, FileReader.
import { LIMITS, clip, clampQty } from "@/lib/dashboard-orders";
import { COLOURS, colourFor, createGarment, inkLuminance } from "./config";

// What the Worker accepts in an order (checked by the file's first bytes there): a logo is PNG, JPEG, WebP or GIF. SVG is NOT accepted (it can
// carry scripts), and neither is an icon file: both are drawn onto a canvas here and sent as a picture.
const SENDABLE = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };
const PREVIEW_EXT = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const SOFT_BYTES = 600 * 1024; // a logo at or below this goes as it is (when it is a type above)
const MAX_LOGO_BYTES = 1024 * 1024; // above it, it is re-encoded to fit this
const FILES_BUDGET = LIMITS.filesBytes - 100 * 1024; // all the files of an order once decoded, with a little to spare under the Worker's limit
const MAX_SIDE = [1600, 1200, 900, 600, 400, 256];

/** Thrown for a problem the person can understand and act on (a design too big to send); its message is for them. */
export class OrderFilesError extends Error {
  constructor(message) {
    super(message);
    this.name = "OrderFilesError";
  }
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ""));
    reader.onerror = () => reject(reader.error || new Error("The file could not be read."));
    reader.readAsDataURL(blob);
  });
}

/** Letters, digits and hyphens only, so it is safe in a file name: "Acme Co." -> "acme-co". */
export function slugify(text, max = 24) {
  const s = String(text || "").toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\.[a-z]{2,24}(\/.*)?$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s.slice(0, max).replace(/-+$/, "") || "logo";
}

function loadImage(blob) {
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("That picture could not be read.")); };
    img.src = url;
  });
}

const toBlob = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality));

/**
 * The logo as it is sent. The file itself when it is a PNG, JPEG, WebP or GIF small enough; anything else (an SVG, an icon file) or anything too
 * big is drawn onto a canvas (at most 1600 px on its long side, smaller until it fits `maxBytes`) and written as PNG, or WebP where that is
 * smaller (always keeping any transparency).
 * @returns {Promise<{ blob: Blob, type: string, ext: string }>}
 */
export async function prepareLogoFile(blob, { maxBytes = MAX_LOGO_BYTES } = {}) {
  const ext = SENDABLE[blob.type];
  if (ext && blob.size <= Math.min(SOFT_BYTES, maxBytes)) return { blob, type: blob.type, ext };
  const img = await loadImage(blob);
  // A vector picture can come back with no size of its own (an SVG with only a viewBox): draw it large, squarely, so its curves are smooth.
  const w0 = img.naturalWidth || 1200, h0 = img.naturalHeight || 1200;
  const vector = blob.type === "image/svg+xml";
  const flat = !ext || blob.type === "image/png"; // vector, icons and PNGs are flat colour: PNG is the compact choice; a photograph is smaller as WebP
  const kinds = flat ? [["image/png"], ["image/webp", 0.85]] : [["image/webp", 0.85], ["image/png"]];
  for (const side of MAX_SIDE) {
    // a picture is never made bigger than it is; a vector has no size of its own to respect, so it is drawn at the size asked for
    const scale = vector ? side / Math.max(w0, h0) : Math.min(1, side / Math.max(w0, h0));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w0 * scale));
    canvas.height = Math.max(1, Math.round(h0 * scale));
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const [type, quality] of kinds) {
      const out = await toBlob(canvas, type, quality);
      if (out && out.type === type && out.size <= maxBytes) return { blob: out, type, ext: SENDABLE[type] };
    }
  }
  throw new OrderFilesError("That logo could not be made small enough to send. Please try a smaller picture.");
}

/** The garment colour (a hex from the Atelier's list) that reads against this logo, or null when its brightness cannot be told. */
export async function colourForLogo(blob, { prefer } = {}) {
  try {
    const img = await loadImage(blob);
    const w0 = img.naturalWidth || 128, h0 = img.naturalHeight || 128;
    const k = (img.naturalWidth ? Math.min(1, 128 / Math.max(w0, h0)) : 128 / Math.max(w0, h0));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w0 * k));
    canvas.height = Math.max(1, Math.round(h0 * k));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return colourFor(inkLuminance({ data: data.data, width: data.width, height: data.height }), { prefer });
  } catch {
    return null;
  }
}

export const colourLabel = (hex) => COLOURS.find((c) => c.hex.toLowerCase() === String(hex).toLowerCase())?.label || String(hex);

/**
 * The order the page sends. `parsed` is what the person typed ({ handle } | { site } | null), `logo` the picture we have ({ blob, from }),
 * `result` the digitizer's answer (lib/digitizer/oneClick.js), all as the page holds them.
 * The files stay inside the Worker's limits (one of each kind, all together at most 3 MB decoded, the stitch file at most 2 MB): the stitch file
 * and the preview are what they are, and the logo is made smaller to fit what is left.
 */
export async function buildDesignPayload({ key, garmentId, colour, qty, contact, message, parsed, logo, result, page = "/create/" }) {
  const garment = createGarment(garmentId);
  const slug = slugify(parsed?.handle || parsed?.site || logo.name || "logo");
  if (result.dst.length > LIMITS.dstBytes - 4096) {
    throw new OrderFilesError("This design has too many stitches to send online. Try a simpler logo, or a picture with fewer colours.");
  }
  // the preview is a nicety: a freak one is left out rather than crowding the logo and the stitch file out of the budget
  const preview = result.preview && result.preview.size <= 400 * 1024 && PREVIEW_EXT[result.preview.type] ? result.preview : null;
  const room = FILES_BUDGET - result.dst.length - (preview?.size || 0);
  const logoFile = await prepareLogoFile(logo.blob, { maxBytes: Math.max(64 * 1024, Math.min(MAX_LOGO_BYTES, room)) });
  const files = [
    { kind: "logo", name: `logo.${logoFile.ext}`, type: logoFile.type, data: await blobToBase64(logoFile.blob) },
    { kind: "design", name: `${slug}.dst`, type: "application/octet-stream", data: await blobToBase64(new Blob([result.dst])) },
  ];
  if (preview) files.push({ kind: "preview", name: `preview.${PREVIEW_EXT[preview.type]}`, type: preview.type, data: await blobToBase64(preview) });
  const fromUpload = logo.from === "upload";
  return {
    v: 1,
    key,
    kind: "design",
    contact: {
      name: clip(contact.name, LIMITS.name),
      email: String(contact.email).trim(),
      ...(contact.phone?.trim() ? { phone: clip(contact.phone, 40) } : {}),
      ...(contact.company?.trim() ? { company: clip(contact.company, LIMITS.company) } : {}),
    },
    items: [{ garment: garment.id, label: garment.label, colour: { hex: colour.toUpperCase(), label: colourLabel(colour) }, qty: clampQty(qty) }],
    brand: {
      handle: parsed?.handle || null,
      website: parsed?.site || null,
      logoFrom: fromUpload ? "upload" : logo.from === "instagram" ? "instagram" : "website",
      rightsConfirmed: true,
    },
    service: "embroidery",
    ...(message?.trim() ? { message: clip(message, LIMITS.message) } : {}),
    design: {
      stitches: result.summary.stitches,
      colours: result.summary.colours,
      widthMm: result.widthMm,
      heightMm: result.heightMm,
      placement: garment.placement,
    },
    files,
    source: { page },
    hp: "",
  };
}
