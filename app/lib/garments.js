// Everything the Atelier (the /atelier design page) needs to know about the garments it can customise. One entry per
// product in lib/products.js: add a garment here (plus a 3D model and a 2D mockup) and it appears
// in the garment picker, the deep links and the quote hand-off.
//
// The tee and hoodie are hand-made Blender models (public/models). The long-sleeve tee is the tee's model with its
// sleeves extended (derive-long-sleeve.mjs), the vest is generated from a shape description
// (scripts/garments/models.mjs), and the sweatpants, apron and tote are Creative Commons (CC BY) models by other
// artists, imported by import-glb.mjs — their credits are in lib/garment-models.json and are shown in the
// garment picker.
// Every 2D mockup is made from a photograph of the garment, never a render of its 3D model: the tee and hoodie from
// studio flat-lays, the rest cut out of the collection page's product photographs (scripts/garments/cutout.mjs). Each
// is a greyscale shading map with an alpha silhouette (public/mockups, prepared by convert-photos.mjs and shade.mjs)
// that the Atelier colours in the browser; `npm run garments` rebuilds all of it and writes
// lib/garment-mockups.json, the mockups' sizes and bounds, which is read below.

import mockups from "./garment-mockups.json";
import models from "./garment-models.json";

export const FABRICS = [
  { id: "cotton-180", label: "Cotton Jersey", spec: "180 gsm", code: "FAB-01", detail: "GOTS certified · breathable · year-round" },
  { id: "fleece-380", label: "Heavyweight Fleece", spec: "380 gsm", code: "FAB-02", detail: "Recycled polyester · insulating · winter weight" },
  { id: "terry-280", label: "French Terry", spec: "280 gsm", code: "FAB-03", detail: "Loop-back · mid-weight · soft hand-feel" },
  { id: "canvas-12oz", label: "Cotton Canvas", spec: "12 oz", code: "FAB-04", detail: "Heavyweight · structured · hard-wearing" },
  { id: "twill-240", label: "Cotton Twill", spec: "240 gsm", code: "FAB-05", detail: "Tight weave · hard-wearing · workwear" },
];

export const COLOURS = [
  { hex: "#FFFFFF", label: "White" },
  { hex: "#F5F3EE", label: "Cream" },
  { hex: "#E8E0D0", label: "Oat" },
  { hex: "#D4C5A9", label: "Linen" },
  { hex: "#B8A898", label: "Sand" },
  { hex: "#6B6560", label: "Stone" },
  { hex: "#3D2B1F", label: "Espresso" },
  { hex: "#1A1A1A", label: "Black" },
  { hex: "#1B3A2B", label: "Pine" },
  { hex: "#3F8F5C", label: "Moss" },
  { hex: "#8B4513", label: "Rust" },
  { hex: "#C4956A", label: "Camel" },
];

// What a garment starts as. It has to stand out from the pale canvas the garment sits on (the
// old default, Oat, was almost the same colour as the page).
export const DEFAULT_COLOUR = "#1B3A2B";

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// --- the page behind the garment -----------------------------------------------------------------

const STAGE_PALE = [241, 243, 236]; // the Atelier's own page colour
const STAGE_DEEP = [212, 216, 205]; // a soft sage grey, where a pale garment needs something to stand against

/**
 * The colour of the stage behind a garment of this colour. A white, cream or oat garment disappears into the
 * pale page, so the stage deepens smoothly as the garment gets lighter; a mid or dark garment keeps the page.
 */
export function stageBackground(hex, pale = STAGE_PALE) {
  const t = Math.min(1, Math.max(0, (luminance(hex) - 0.3) / 0.55));
  const eased = t * t * (3 - 2 * t);
  return `rgb(${pale.map((p, i) => Math.round(p + (STAGE_DEEP[i] - p) * eased)).join(", ")})`;
}

// --- the Kazi logo preset ---------------------------------------------------------------------

const LOGO_ASPECT = 1200 / 875;
const LOGO_LIGHT = "/images/logo/kazi-logo-light.png"; // for dark garments
const LOGO_DARK = "/images/logo/kazi-logo-dark.png"; // for light garments

/**
 * A new garment opens with the Kazi logo already on it, so the page never starts as a blank
 * silhouette. The logo is a placeholder for the customer's own artwork (it is flagged `isPreset`,
 * and is left out of the quote and the price estimate), in whichever of two colourways reads
 * against the garment's colour.
 */
export function createPresetLayers(garmentId, colourHex) {
  const garment = getGarment(garmentId);
  const spot = garment?.logo;
  if (!spot) return [];
  const { x, y, width } = spot;
  const { areaAspect } = garment;
  return [
    {
      id: "preset-logo",
      type: "image",
      side: "front",
      isPreset: true,
      x,
      y,
      width,
      height: (width * areaAspect) / LOGO_ASPECT,
      opacity: 1,
      url: luminance(colourHex) < 0.36 ? LOGO_LIGHT : LOGO_DARK,
      fileName: "Kazi logo (placeholder)",
    },
  ];
}

/** True while the artwork is still exactly the untouched preset, so it should follow the garment. */
export function isUntouchedPreset(layers, garmentId, colourHex) {
  if (layers.length !== 1 || !layers[0].isPreset) return false;
  const fresh = createPresetLayers(garmentId, colourHex)[0];
  if (!fresh) return false;
  return ["side", "x", "y", "width", "height", "opacity", "url"].every((key) => layers[0][key] === fresh[key]);
}

// --- garments ---------------------------------------------------------------------------------

// `logo` places the preset logo on the front: x, y are its centre and width its size, all as
// fractions of the garment's printable area (the whole garment's bounding box).
//
// `decalReach` is how far past the garment's middle (as a fraction of half its depth) the 3D
// viewer lets artwork reach into the garment when printing onto a side. Hollow garments stop short
// of the middle so artwork can't bleed onto the opposite wall; thin cloth that curves round the
// body (the apron) or a flat bag needs all the way, or the middle of the cloth is missed.
const GARMENT_LIST = [
  {
    id: "t-shirt",
    label: "T-Shirt",
    code: "GAR-001",
    desc: "Classic crew neck",
    product: "organic-crew-tee",
    model: "/models/tshirt.glb",
    areaAspect3d: 0.887,
    fabrics: ["cotton-180", "terry-280", "fleece-380"],
    logo: { x: 0.5, y: 0.34, width: 0.28 },
  },
  {
    id: "long-sleeve",
    label: "Long-Sleeve Tee",
    code: "GAR-002",
    desc: "Relaxed crew neck, plain cuffs and hem",
    product: "long-sleeve-tee",
    model: "/models/long-sleeve.glb",
    fabrics: ["cotton-180", "terry-280"],
    // The picture includes the long sleeves, so it is wider than the body: new artwork and the logo are sized
    // against the chest, as on the tee.
    layerScale: 0.8,
    logo: { x: 0.5, y: 0.34, width: 0.24 },
  },
  {
    id: "hoodie",
    label: "Hoodie",
    code: "GAR-003",
    desc: "Pullover with hood",
    product: "essential-hoodie",
    model: "/models/hoodie.glb",
    areaAspect3d: 0.934,
    fabrics: ["cotton-180", "terry-280", "fleece-380"],
    logo: { x: 0.5, y: 0.45, width: 0.2 },
  },
  {
    id: "vest",
    label: "Utility Vest",
    code: "GAR-004",
    desc: "Mesh utility vest, V-neck, four flap pockets",
    product: "utility-vest",
    model: "/models/vest.glb",
    fabrics: ["canvas-12oz", "twill-240", "cotton-180"],
    layerScale: 0.7,
    // As in the collection photograph: on the lower-left pocket, below its flap.
    logo: { x: 0.25, y: 0.86, width: 0.18 },
  },
  {
    id: "sweatpants",
    label: "Sweatpants",
    code: "GAR-005",
    desc: "Wide straight leg, elastic waist",
    product: "sweatpants",
    model: "/models/sweatpants.glb",
    fabrics: ["terry-280", "fleece-380"],
    layerScale: 0.55,
    // On the upper thigh, at the hip, as in the collection photograph. The spot is picked to sit well inside the leg
    // in both views: the photographed pair is wide and lies a little askew, the model's legs are slimmer, and the
    // seam of its side pocket is close to the outer edge, so the logo is small and not far from the middle of the leg.
    logo: { x: 0.665, y: 0.3, width: 0.2 },
    // New artwork starts on the same thigh, below the logo (the centre of a pair of trousers is the gap
    // between the legs, where there is no fabric to print on); the back mirrors it.
    layerAt: { x: 0.72, y: 0.55 },
  },
  {
    id: "tote",
    label: "Canvas Tote",
    code: "GAR-006",
    desc: "Heavyweight canvas, long handles",
    product: "canvas-tote",
    model: "/models/tote.glb",
    fabrics: ["canvas-12oz"],
    decalReach: 1,
    // Centred on the bag, in the lower half of the panel: the 3D model's straps are sewn down its front to about
    // 60% of the way down, and a logo that starts above that would sit on them.
    logo: { x: 0.5, y: 0.735, width: 0.42 },
    // New artwork starts where the logo is.
    layerAt: { x: 0.5, y: 0.735 },
  },
  {
    id: "apron",
    label: "Work Apron",
    code: "GAR-007",
    desc: "Bib apron with waist ties",
    product: "work-apron",
    model: "/models/apron.glb",
    fabrics: ["twill-240", "canvas-12oz"],
    layerScale: 0.55,
    decalReach: 1,
    // As in the collection photograph: on the patch pocket, small enough to sit inside it (the pocket is about
    // 36% x 20% of the apron's area, in the photograph and in the model).
    logo: { x: 0.51, y: 0.58, width: 0.25 },
    // New artwork starts there too (mirrored on the back, which has no pocket).
    layerAt: { x: 0.51, y: 0.58 },
  },
];

/** Width-to-height ratio of a mockup's printable area, as it appears on the screen. */
function areaAspectOf(mockup) {
  return (mockup.area.width * mockup.width) / (mockup.area.height * mockup.height);
}

export const GARMENTS = GARMENT_LIST.map((garment) => {
  // { front, back }, each { src, width, height, area }: `area` is the garment's own bounding box inside
  // the picture, as fractions of its width and height.
  const pictures = mockups[garment.id];
  const flat = areaAspectOf(pictures.front);
  return {
    ...garment,
    mockups: pictures,
    // The tee and hoodie are a photograph in 2D and a differently proportioned model in 3D, so no
    // single ratio is right for both; the logo preset takes the middle (new artwork there keeps its
    // old sizing). For every other garment the 2D picture is the garment's photograph and the 3D
    // viewer gives its design area the picture's proportions (GarmentViewer, `areaAspect`), so the
    // two agree and `exactAspect` lets new artwork keep its proportions.
    areaAspect: garment.areaAspect3d ? Math.sqrt(flat * garment.areaAspect3d) : flat,
    exactAspect: !garment.areaAspect3d,
    thumb: `/mockups/thumbs/${garment.id}.webp`,
    // Set for the garments whose model is someone else's work (see lib/garment-models.json).
    credit: models[garment.id]?.credit ?? null,
    // Whether the viewer shades the inside of this garment darker (see dimInsideFaces in GarmentViewer).
    dimInside: models[garment.id]?.dimInside ?? false,
    defaultFabric: garment.fabrics[0],
  };
});

export function getGarment(id) {
  return GARMENTS.find((g) => g.id === id);
}

/** The garment's fabric options, as full records. */
export function fabricsFor(garmentId) {
  const garment = getGarment(garmentId);
  return FABRICS.filter((f) => garment?.fabrics.includes(f.id));
}

/** The credits to show for the 3D models that are other artists' work (CC BY needs attribution). */
export const MODEL_CREDITS = GARMENTS.filter((g) => g.credit).map((g) => ({ garment: g.label, ...g.credit }));
