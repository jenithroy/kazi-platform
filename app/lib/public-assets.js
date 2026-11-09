import fs from "node:fs";
import path from "node:path";

// Server-only helpers (they use `fs`, so import them from Server Components). With the static
// export they run once at build time, which lets a page offer an *optional* asset: drop a file
// into public/ and the slot that expects it switches on at the next build, with no code change.

function exists(rel) {
  return fs.existsSync(path.join(process.cwd(), "public", rel.replace(/^\//, "")));
}

/**
 * Resolves an optional video slot. Pass the path without an extension, e.g.
 * "/videos/home/step-1-brief"; returns whichever of `.mp4` / `.webm` exist in public/,
 * or null when neither does (the caller then just shows its poster image).
 */
export function resolveVideo(base) {
  const mp4 = exists(`${base}.mp4`) ? `${base}.mp4` : null;
  const webm = exists(`${base}.webm`) ? `${base}.webm` : null;
  return mp4 || webm ? { mp4, webm } : null;
}

/** Returns `rel` when public/<rel> exists, otherwise `fallback`. */
export function existingOr(rel, fallback) {
  return exists(rel) ? rel : fallback;
}
