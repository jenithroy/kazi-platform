import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/stories";

// Story images are resized and re-encoded in the browser before upload — a phone photo
// arrives at 3–8 MB, the site's existing photography already weighs ~20 MB on the homepage,
// and a 1600px WebP of the same shot is typically 150–300 KB.

const BUCKET = "blog-media";
const MAX_INPUT_BYTES = 30 * 1024 * 1024;

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function compressImage(file, { maxWidth = 1600, quality = 0.82 } = {}) {
  if (!file.type.startsWith("image/")) throw new Error("That file isn't an image.");
  if (file.size > MAX_INPUT_BYTES) throw new Error("That image is over 30 MB — export a smaller copy first.");
  // Re-encoding would drop a GIF's animation; upload it as-is (the bucket caps it at 5 MB).
  if (file.type === "image/gif") return { blob: file, type: "image/gif", extension: "gif" };

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const webp = await canvasToBlob(canvas, "image/webp", quality);
  if (webp?.type === "image/webp") return { blob: webp, type: "image/webp", extension: "webp" };
  // Browsers without WebP encoding (older Safari) hand back PNG; JPEG is far smaller.
  const jpeg = await canvasToBlob(canvas, "image/jpeg", quality);
  return { blob: jpeg, type: "image/jpeg", extension: "jpg" };
}

/** Compresses and uploads an image, returning its public URL. */
export async function uploadImage(file, options) {
  const { blob, type, extension } = await compressImage(file, options);
  const now = new Date();
  const name = slugify(file.name.replace(/\.[^.]+$/, ""), 40) || "image";
  const path = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${crypto
    .randomUUID()
    .slice(0, 8)}-${name}.${extension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(error.message || "Upload failed");
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
