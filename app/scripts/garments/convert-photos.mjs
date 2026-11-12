// Converts the garments' photographs into the shading maps the Atelier recolours:
//   node scripts/garments/convert-photos.mjs [--out <dir>]
//
// The photographs (scripts/garments/photos: <name>-front.png and <name>-back.png) are flat-lay shots of white
// garments on a transparent background. The tee and hoodie are studio photographs; the others are cut out of the
// collection page's product photographs by cutout.mjs. They are far too flat and too grey to multiply by a colour
// directly (the fabric is only ~91-95% bright, with a blue cast, so every colour came out washed out, and the
// cut-out's soft edge left a white fringe), so each one is turned into a clean shading map with shade.mjs: exposure
// normalised, edge tightened, thin bright lines removed, a faint rim added. The result replaces
// public/mockups/<name>-{front,back}.png and is listed in lib/garment-mockups.json with the garment's bounds.
// Also writes the garment-picker thumbnails. With --out nothing in the site is touched (for trying settings).

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { areaOf, buildShade, loadRgba, writeLightPng, writeShadePng } from "./shade.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const appDir = join(here, "..", "..");
const photosDir = join(here, "photos");
const outFlag = process.argv.indexOf("--out");
const outDir = outFlag > 0 ? process.argv[outFlag + 1] : join(appDir, "public", "mockups");
const writingSite = outFlag < 0;
mkdirSync(outDir, { recursive: true });

// How a photograph is read (see shade.mjs for what each option does).
export const PHOTO_OPTIONS = {
  tighten: [0.3, 0.9],
  baseP: 0.6,
  gain: 3.6,
  flat: { sigma: 70, amount: 0.85 },
  knee: { at: 0.86, keep: 0.6 },
  // Highlights only where the cloth is clearly lit above its flat tone (`bias`), and capped low: the first
  // setting (no bias, gain 6, max 0.7) lit about a fifth of a hoodie, and on a dark colour that read as satin.
  light: { gain: 4, bias: 0.05, blur: 2, max: 0.4 },
  open: 1,
  blur: 1.1,
  rim: { strength: 0.1, width: 1.8 },
};

const GARMENTS = {
  "t-shirt": "tshirt",
  hoodie: "hoodie",
  "long-sleeve": "long-sleeve",
  vest: "vest",
  sweatpants: "sweatpants",
  tote: "tote",
  apron: "apron",
};

// Per-garment changes to PHOTO_OPTIONS. The tee and hoodie are even studio shots; the garments cut out of the collection
// photographs (cutout.mjs) were lit from above on a concrete floor and are full of soft shadows, which the studio
// settings would turn into blotches: a lower gain, a dead zone (tiny departures from the flat fabric are not shading),
// a tighter flat-field correction and a higher bar for highlights.
const FLOOR_PHOTO = { gain: 1.9, dead: 0.05, flat: { sigma: 40, amount: 0.9 }, light: { gain: 4, bias: 0.08, blur: 2, max: 0.3 } };
const OVERRIDES = {
  "long-sleeve": FLOOR_PHOTO,
  sweatpants: FLOOR_PHOTO,
  tote: FLOOR_PHOTO,
  apron: FLOOR_PHOTO,
  // the open weave: threads are a pixel or two wide, so keep the shading sharp
  vest: { ...FLOOR_PHOTO, blur: 0.6, open: 0 },
};
const manifestFile = join(appDir, "lib", "garment-mockups.json");
const manifest = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, "utf8")) : {};

for (const [id, name] of Object.entries(GARMENTS)) {
  manifest[id] = {};
  for (const side of ["front", "back"]) {
    const rgba = await loadRgba(join(photosDir, `${name}-${side}.png`));
    const shade = buildShade(rgba, { ...PHOTO_OPTIONS, ...OVERRIDES[id] });
    await writeShadePng(join(outDir, `${name}-${side}.png`), shade);
    await writeLightPng(join(outDir, `${name}-${side}-light.png`), shade);
    manifest[id][side] = {
      src: `/mockups/${name}-${side}.png`,
      light: `/mockups/${name}-${side}-light.png`,
      width: shade.width,
      height: shade.height,
      area: areaOf(shade),
    };
    console.log(`${name}-${side}: fabric tone ${(shade.base * 255).toFixed(0)}/255, area ${JSON.stringify(manifest[id][side].area)}`);
  }
  if (writingSite) {
    mkdirSync(join(outDir, "thumbs"), { recursive: true });
    await sharp(join(outDir, `${name}-front.png`))
      .trim()
      .resize({ width: 160, height: 160, fit: "inside" })
      .webp({ quality: 82, alphaQuality: 90 })
      .toFile(join(outDir, "thumbs", `${id}.webp`));
  }
}

if (writingSite) {
  writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`wrote ${manifestFile}`);
}
