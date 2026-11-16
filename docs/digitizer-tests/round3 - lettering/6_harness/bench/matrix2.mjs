// The wider font set of the lettering bench: eighteen open-licence fonts (SIL OFL / Apache) that are NOT on this Windows machine's list, so a rule tuned on Arial and Times
// is checked against faces it has never seen. The files are in scratchpad/fonts_dl (downloaded from the Google Fonts repository); they are used by the bench only.
export const SIZES = [3, 4, 5, 6, 8];
export const STRINGS = { ave: "AVE MARIA", ham: "Hamburgefonts 2026" };
// id, family, file, weight axis (variable) or false (one weight), what kind of face it is
export const FONTS2 = [
  { id: "playfair", family: "Playfair Display", file: "PlayfairDisplay.ttf", variable: true, style: "high-contrast serif" },
  { id: "merri", family: "Merriweather", file: "Merriweather.ttf", variable: true, style: "sturdy serif" },
  { id: "baskerville", family: "Libre Baskerville", file: "LibreBaskerville.ttf", variable: true, style: "transitional serif" },
  { id: "robotoslab", family: "Roboto Slab", file: "RobotoSlab.ttf", variable: true, style: "slab serif" },
  { id: "lora", family: "Lora", file: "Lora.ttf", variable: true, style: "serif" },
  { id: "montserrat", family: "Montserrat", file: "Montserrat.ttf", variable: true, style: "geometric sans" },
  { id: "opensans", family: "Open Sans", file: "OpenSans.ttf", variable: true, style: "humanist sans" },
  { id: "oswald", family: "Oswald", file: "Oswald.ttf", variable: true, style: "condensed sans" },
  { id: "bebas", family: "Bebas Neue", file: "BebasNeue.ttf", variable: false, style: "condensed caps" },
  { id: "anton", family: "Anton", file: "Anton.ttf", variable: false, style: "heavy condensed" },
  { id: "archivoblack", family: "Archivo Black", file: "ArchivoBlack.ttf", variable: false, style: "heavy sans" },
  { id: "pacifico", family: "Pacifico", file: "Pacifico.ttf", variable: false, style: "brush script" },
  { id: "dancing", family: "Dancing Script", file: "DancingScript.ttf", variable: true, style: "script" },
  { id: "cinzel", family: "Cinzel", file: "Cinzel.ttf", variable: true, style: "roman caps" },
  { id: "nunito", family: "Nunito", file: "Nunito.ttf", variable: true, style: "rounded sans" },
  { id: "courierprime", family: "Courier Prime", file: "CourierPrime.ttf", variable: false, style: "typewriter" },
  { id: "abril", family: "Abril Fatface", file: "AbrilFatface.ttf", variable: false, style: "fat face" },
  { id: "caveat", family: "Caveat", file: "Caveat.ttf", variable: true, style: "handwriting" },
];

export function cells() {
  const out = [];
  for (const f of FONTS2) for (const size of SIZES) for (const [sk, value] of Object.entries(STRINGS)) {
    out.push({ id: `${f.id}_b_${size}mm_${sk}`, font: f.id, bold: f.variable, size, str: sk, value, style: f.style });
  }
  return out;
}
