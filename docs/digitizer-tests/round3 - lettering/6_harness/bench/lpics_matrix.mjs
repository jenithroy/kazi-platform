// The matrix of the lettering-picture bench: pictures of lettering the way a logo has it (on white, on a dark badge, outlined, round a circle, among patterns).
// Every picture is 10 pixels to the millimetre; `texts[].capMm` is the capital's height on the 100 mm design.
const NAVY = "#16285e", WHITE = "#ffffff", CREAM = "#f4ecd8", YELLOW = "#e8bd05", BLUE = "#0a5fa8", BLACK = "#111111", RED = "#c8202c";
export const FONT_IDS = ["sans", "black", "condensed", "humanist", "serif", "times", "mono", "script", "round"];
export const SIZES = [3, 4, 5, 6, 8, 12];
export const STRINGS = { ave: "AVE MARIA", ham: "Hamburgefonts 2026" };

export function pictures() {
  const out = [];
  // 1. one line, dark on white (the common case), every font x size x string
  for (const font of FONT_IDS) for (const size of SIZES) for (const [sk, value] of Object.entries(STRINGS)) {
    out.push({ id: `line_${font}_${size}mm_${sk}`, kind: "line", font, size, str: sk, value, w: 1000, h: 240, bg: WHITE, texts: [{ value, font, capMm: size, bold: true, ink: NAVY, x: 500, y: 120 }] });
  }
  // 2. white letters on a dark badge (the page colour is the lettering's colour), sans and serif
  for (const font of ["sans", "serif", "humanist"]) for (const size of [4, 6, 10]) for (const [sk, value] of Object.entries(STRINGS)) {
    out.push({ id: `badge_${font}_${size}mm_${sk}`, kind: "badge", font, size, str: sk, value, w: 1000, h: 240, bg: WHITE, badge: { color: NAVY, x: 20, y: 20, w: 960, h: 200 }, texts: [{ value, font, capMm: size, bold: true, ink: WHITE, x: 500, y: 120 }] });
  }
  // 3. outlined letters (a body colour and a thin dark outline, as on the crest)
  for (const font of ["sans", "serif"]) for (const size of [5, 8]) for (const [sk, value] of Object.entries(STRINGS)) {
    out.push({ id: `outline_${font}_${size}mm_${sk}`, kind: "outline", font, size, str: sk, value, w: 1000, h: 240, bg: YELLOW, texts: [{ value, font, capMm: size, bold: true, ink: BLUE, outline: { color: BLACK, mm: 0.18 }, x: 500, y: 120 }] });
  }
  // 4. text round a circle (a seal)
  for (const font of ["sans", "serif"]) for (const size of [5, 8]) {
    out.push({ id: `arc_${font}_${size}mm_ave`, kind: "arc", font, size, str: "ave", value: "AVE MARIA GRATIA PLENA", w: 1000, h: 560, bg: WHITE, texts: [{ value: "AVE MARIA GRATIA PLENA", font, capMm: size, bold: true, ink: BLACK, x: 500, y: 300, arcRadiusMm: 22 }] });
  }
  // 5. patterns that are NOT text (the finder must leave them alone): rows of stars, bars, dots, a rope ring
  out.push({ id: "pat_stars", kind: "pattern", w: 1000, h: 240, bg: WHITE, texts: [], extras: [{ kind: "stars", n: 9, x: 100, y: 120, step: 100, r: 30 }] });
  out.push({ id: "pat_bars", kind: "pattern", w: 1000, h: 240, bg: WHITE, texts: [], extras: [{ kind: "bars", n: 12, x: 60, y: 60, step: 75, w: 30, h: 120 }] });
  out.push({ id: "pat_dots", kind: "pattern", w: 1000, h: 240, bg: WHITE, texts: [], extras: [{ kind: "dots", n: 14, x: 60, y: 120, step: 68, r: 22 }] });
  out.push({ id: "pat_rope", kind: "pattern", w: 700, h: 700, bg: WHITE, texts: [], extras: [{ kind: "rope", n: 64, x: 350, y: 350, R: 290, ra: 26, rb: 11 }] });
  // 6. lettering among a pattern (a seal's rope round its words)
  out.push({ id: "mix_rope_text", kind: "mix", font: "serif", size: 6, str: "ave", value: "AVE MARIA", w: 700, h: 700, bg: WHITE, texts: [{ value: "AVE MARIA", font: "serif", capMm: 6, bold: true, ink: BLACK, x: 350, y: 350 }], extras: [{ kind: "rope", n: 64, x: 350, y: 350, R: 290, ra: 26, rb: 11 }, { kind: "stars", n: 5, x: 250, y: 470, step: 50, r: 14 }] });
  return out;
}
