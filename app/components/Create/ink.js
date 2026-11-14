// Which colour of garment reads against a logo: pure functions of pixels, with no imports so that node can test them.
const lin = (v) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

/**
 * From a picture's pixels (RGBA, any size): the average brightness (0 to 1) of what is drawn, ignoring the plain background the picture sits on
 * (the opaque colour its border mostly has). Each pixel counts by how opaque it is, so a fine line drawn on a transparent background, which
 * shrinks to faint half-transparent pixels in a small copy, still counts. Null when nothing is drawn.
 */
export function inkLuminance({ data, width, height }) {
  const at = (x, y) => {
    const i = (y * width + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };
  // the background: what the opaque border pixels mostly are (a transparent border means there is no colour behind the logo to ignore)
  const votes = new Map();
  let borderPixels = 0;
  const vote = (x, y) => {
    const [r, g, b, a] = at(x, y);
    borderPixels += 1;
    if (a < 200) return;
    const key = `${r >> 4},${g >> 4},${b >> 4}`;
    const v = votes.get(key) || { n: 0, r, g, b };
    v.n += 1;
    votes.set(key, v);
  };
  for (let x = 0; x < width; x++) { vote(x, 0); vote(x, height - 1); }
  for (let y = 1; y < height - 1; y++) { vote(0, y); vote(width - 1, y); }
  let bg = null;
  for (const v of votes.values()) if (!bg || v.n > bg.n) bg = v;
  if (bg && bg.n < borderPixels * 0.5) bg = null; // no one colour owns the border
  let sum = 0, weight = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = at(x, y);
      if (a < 16) continue;
      if (bg && a >= 200 && Math.hypot(r - bg.r, g - bg.g, b - bg.b) < 40) continue;
      const w = a / 255;
      sum += w * luminance(r, g, b);
      weight += w;
    }
  }
  return weight >= 4 ? sum / weight : null;
}

/** The garment colour (a hex of lib/garments.js COLOURS) that reads best against a logo of this brightness: black under light ink, white under dark. */
export function colourFor(lum, { prefer = "#1A1A1A" } = {}) {
  if (lum == null) return null;
  const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const black = contrast(lum, luminance(26, 26, 26));
  const white = contrast(lum, 1);
  if (Math.abs(black - white) < 0.35) return prefer; // a mid tone reads about the same on either
  return black > white ? "#1A1A1A" : "#FFFFFF";
}
