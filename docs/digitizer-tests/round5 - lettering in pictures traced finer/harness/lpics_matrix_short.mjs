// Short words, the way a logo has them ("KAZI", "Open", "BMW", "SALE"): 3 and 4 letters, in the nine fonts of the page, dark on white, 10 px to the millimetre.
const NAVY = "#16285e", WHITE = "#ffffff";
export const FONT_IDS = ["sans", "black", "condensed", "humanist", "serif", "times", "mono", "script", "round"];
export const SIZES = [3, 4, 6];
export const STRINGS = { kazi: "KAZI", open: "Open", bmw: "BMW", sale: "SALE" };
export function pictures() {
  const out = [];
  for (const font of FONT_IDS) for (const size of SIZES) for (const [sk, value] of Object.entries(STRINGS)) {
    out.push({ id: `sw_${font}_${size}mm_${sk}`, kind: "line", font, size, str: sk, value, w: 1000, h: 240, bg: WHITE, texts: [{ value, font, capMm: size, bold: true, ink: NAVY, x: 500, y: 120 }] });
  }
  return out;
}
