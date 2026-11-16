// The test matrix of the lettering bench (shared by capture, replay and the python tools through cache/typed/manifest.json).
export const SIZES = [3, 4, 5, 6, 8, 10, 15]; // capital height in mm: what the page's "Size" field means (text.js CAP_HEIGHT)
export const FONT_IDS = ["sans", "black", "condensed", "humanist", "serif", "times", "mono", "script", "round"];
export const REGULAR_TOO = ["sans", "serif", "times"]; // also bold OFF
export const STRINGS = { ave: "AVE MARIA", ham: "Hamburgefonts 2026" };

export function cells() {
  const out = [];
  for (const font of FONT_IDS) {
    for (const bold of REGULAR_TOO.includes(font) ? [true, false] : [true]) {
      for (const size of SIZES) {
        for (const [sk, value] of Object.entries(STRINGS)) {
          out.push({ id: `${font}_${bold ? "b" : "r"}_${size}mm_${sk}`, font, bold, size, str: sk, value });
        }
      }
    }
  }
  return out;
}
