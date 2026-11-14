/**
 * Thin strips of a shape widened to a width a needle can follow. Lettering at small sizes is made of strokes that are thicker and thinner than anything a needle sews:
 * the hairlines and serifs of a Times or Georgia at 4 mm caps are 0.15 to 0.3 mm wide (a thread is 0.4), so they were dropped (a letter in two bars and a slash) or
 * came out as a ragged smear. A needle can follow a line about half a millimetre wide (a bean line), so every strip of the shape thinner than that is made as wide
 * as that and the rest of the shape is left exactly as it is: the stems keep their weight, the hairlines get one, and a serif face reads as a serif face.
 *
 * How the strips are found: the shape opened by the width (shrunk by half of it, grown again) loses what is thinner than the width; what the opening took off is
 * the thin part. Each piece of it that is long and narrow (not a crumb off a sharp corner, which the opening also takes) is grown by what it lacks and put back.
 */
import { offsetRings, differenceRings, unionRings } from "./clip.js";
import { islandsOf, ringArea, ringPerimeter } from "./poly.js";

/** The width (mm) a strip is widened to, unless the caller says otherwise: the stitch engine leaves out of a satin layout what is thinner than 0.4 (ENGINE_DEFAULTS.satinMinStroke). */
export const THIN_MIN_WIDTH = 0.4;

/** The area (mm2) of a shape: its outer rings less its holes. */
function shapeArea(rings) {
  let a = 0;
  for (const is of islandsOf(rings)) a += ringArea(is.outer) - is.holes.reduce((s, h) => s + ringArea(h), 0);
  return a;
}

/**
 * How wide the strokes of a shape are, typically (mm): the width of every island (twice its area over its outline's length) averaged by area, so the stems of a
 * letter count for more than its hairlines. 0 for a shape with nothing in it. Islands smaller than `minArea` mm2 (the dot of an i at 3 mm) are not counted.
 */
export function meanStrokeWidth(rings, minArea = 0.3) {
  let a = 0, w = 0;
  for (const is of islandsOf(rings)) {
    const shape = [is.outer, ...is.holes];
    const area = ringArea(is.outer) - is.holes.reduce((s, h) => s + ringArea(h), 0);
    const per = shape.reduce((s, r) => s + ringPerimeter(r), 0);
    if (!(area >= minArea) || !(per > 0)) continue;
    a += area;
    w += area * ((2 * area) / per);
  }
  return a > 0 ? w / a : 0;
}

/**
 * @param {number[][][]} rings  one shape (outer rings and holes, read even-odd, as islandsOf reads them), in millimetres
 * @param {number} minW  strips narrower than this are widened to it (mm); 0 or less changes nothing
 * @param {{ minRatio?: number, minArea?: number, minThick?: number }} o  a strip must be at least `minRatio` times longer than wide (a crumb off a corner is not a strip) and
 *   `minArea` mm2 big; and at least `minThick` of the shape's area must be wider than `minW` (a face whose every stroke is as thin as the hairlines has no hairlines: it is
 *   sewn as lines, one thread wide whatever the drawing's width, and widening all of it only made it heavy)
 * @returns {{ rings: number[][][], widened: number, strips: number }}  the shape with its thin strips widened; `rings` is the very array handed in when there was nothing to widen
 */
export function widenThin(rings, minW = THIN_MIN_WIDTH, { minRatio = 3, minArea = 0.04, minThick = 0.2 } = {}) {
  const none = { rings, widened: 0, strips: 0 };
  if (!(minW > 0) || !Array.isArray(rings) || !rings.length) return none;
  let opened;
  try {
    opened = offsetRings(offsetRings(rings, -minW / 2, { join: "round" }), minW / 2, { join: "round" });
    if (!(shapeArea(opened) >= minThick * shapeArea(rings))) return none;
  } catch (e) { return none; }
  let thin;
  try { thin = differenceRings(rings, opened); } catch (e) { return none; }
  if (!thin.length) return none;
  const grown = [];
  let strips = 0;
  for (const is of islandsOf(thin)) {
    const shape = [is.outer, ...is.holes];
    const area = ringArea(is.outer) - is.holes.reduce((s, h) => s + ringArea(h), 0);
    const per = shape.reduce((s, r) => s + ringPerimeter(r), 0);
    if (!(area >= minArea) || !(per > 0)) continue;
    const w = (2 * area) / per; // the mean width of a strip: twice its area over its outline
    if (!(w < minW * 0.95)) continue;
    const len = per / 2 - w; // a strip's outline is two long sides and two short ends
    if (!(len >= minRatio * w)) continue;
    const d = (minW - w) / 2;
    const out = offsetRings(shape, d, { join: "round" });
    if (out.length) { grown.push(...out); strips++; }
  }
  if (!grown.length) return none;
  return { rings: unionRings(rings, grown), widened: grown.length, strips };
}
