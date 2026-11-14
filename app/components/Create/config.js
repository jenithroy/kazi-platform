// What /create knows about the three garments it offers, on top of lib/garments.js (which stays the source for labels, mockups and colours).
//
//   stitchWidthMm  how wide the stitched logo is made (lib/digitizer/oneClick.js): the left-chest size on a tee or hoodie, smaller on a thigh
//   fabric         the stitch engine's cloth preset (lib/embroidery/stitch/presets.js): knit for a jersey tee, "towel" (pile) for fleece and terry
//   spot           where the logo sits on the mockup, as fractions of the garment's design area (the same convention as lib/garments.js `logo`).
//                  The hoodie's own preset spot (0.5, 0.45) lies on its drawstrings, which is fine for a print and wrong for thread, so the tee and
//                  the hoodie get a left-chest spot measured on their mockups; the sweatpants keep the preset's (the spot the Atelier picked to sit
//                  well inside the leg).
//   mmPerPx        how many millimetres one pixel of the mockup picture stands for, measured from the garment's body (a tee about 540 mm across at the
//                  chest, a hoodie about 580, the sweatpants' waist about 450), so the logo is drawn at its real size on the garment
//   placement      what the order says
import { getGarment } from "@/lib/garments";

export const CREATE_GARMENTS = [
  { id: "t-shirt", label: "T-Shirt", stitchWidthMm: 90, fabric: "knit", spot: { x: 0.63, y: 0.365 }, mmPerPx: 1.35, placement: "Left chest" },
  { id: "hoodie", label: "Hoodie", stitchWidthMm: 90, fabric: "towel", spot: { x: 0.59, y: 0.43 }, mmPerPx: 1.6, placement: "Left chest" },
  { id: "sweatpants", label: "Sweatpants", stitchWidthMm: 70, fabric: "towel", spot: { x: 0.665, y: 0.3 }, mmPerPx: 1.55, placement: "Upper thigh" },
];

export const DEFAULT_GARMENT = "hoodie";

export function createGarment(id) {
  return CREATE_GARMENTS.find((g) => g.id === id) || CREATE_GARMENTS.find((g) => g.id === DEFAULT_GARMENT);
}

/** The mockup of a garment (lib/garments.js): { src, light, width, height, area }. */
export function mockupOf(id) {
  return getGarment(id).mockups.front;
}

/**
 * Where the stitched logo goes on the mockup, in the picture's own fractions (left, top, width), given the thread picture's
 * width-to-height ratio and its real width in millimetres.
 *   area    the garment's design area inside the mockup picture
 *   logo    { left, top, width } as fractions of the whole mockup picture; (left, top) is the logo's centre
 */
export function logoBox(id, widthMm) {
  const g = createGarment(id);
  const m = mockupOf(id);
  const { area } = m;
  const px = widthMm / g.mmPerPx; // the logo's width in mockup pixels
  return {
    left: area.x + g.spot.x * area.width,
    top: area.y + g.spot.y * area.height,
    width: px / m.width,
    aspectOfImage: m.width / m.height,
  };
}

/** The preset colours the Atelier offers (lib/garments.js COLOURS), re-exported so the page needs one import. */
export { COLOURS } from "@/lib/garments";

// ── which colour of garment reads against this logo (components/Create/ink.js) ───────────────────
export { colourFor, inkLuminance } from "./ink";
