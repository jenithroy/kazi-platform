import { REGION, DEFAULT_REGION_WEIGHTS } from "file:///D:/Web%20Projects/kazi%20website/app/lib/embroidery/trace/regions.js";
import { buildRegionalPalette, classifyByRegion } from "file:///D:/Web%20Projects/kazi%20website/app/lib/embroidery/trace/regionPalette.js";
const W2 = 200, H2 = 200;
const rgb2 = new Uint8ClampedArray(W2 * H2 * 3), cls2 = new Uint8Array(W2 * H2);
const set = (x, y, c, v) => { const i = y * W2 + x; cls2[i] = c; rgb2[i * 3] = v[0]; rgb2[i * 3 + 1] = v[1]; rgb2[i * 3 + 2] = v[2]; };
const WHITE_EYE = [236, 233, 229], TEETH = [240, 236, 230], SHINE = [246, 242, 238];
for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
  if (y >= 130) { set(x, y, REGION.CLOTHES, [[40, 50, 90], [60, 75, 130]][x < 100 ? 0 : 1]); continue; }
  if ((x - 100) ** 2 + (y - 70) ** 2 > 50 * 50) continue;
  set(x, y, REGION.FACE_SKIN, [[225, 170, 150], [205, 150, 130], [235, 190, 170]][Math.floor((x - 50) / 33) % 3]);
  for (const ex of [78, 122]) {
    const d = Math.hypot(x - ex, y - 58);
    if (d <= 5) set(x, y, REGION.FEATURES, [50, 32, 22]);
    else if (d <= 10) set(x, y, REGION.EYE_WHITE, ((x + y) % 2 ? WHITE_EYE : WHITE_EYE.map((v) => v - 22)));
    else if (d <= 12) set(x, y, REGION.FEATURES, [95, 65, 50]);
  }
  const m = ((x - 100) / 22) ** 2 + ((y - 98) / 11) ** 2, o = ((x - 100) / 12) ** 2 + ((y - 98) / 5) ** 2;
  if (m <= 1) { if (o <= 1) set(x, y, REGION.MOUTH, y < 98 ? ((x + y) % 2 ? TEETH : TEETH.map((v) => v - 22)) : [60, 25, 30]); else set(x, y, REGION.LIPS, [190, 60, 72]); }
  if (Math.abs(x - 82) <= 1 && Math.abs(y - 98) <= 1) set(x, y, REGION.LIPS, SHINE);
}
const base = { maxColors: 10, seed: 1, mergeDE: 6, crumbs: "strict", noiseTol: 6, weights: DEFAULT_REGION_WEIGHTS };
const white = { rgb: [250, 246, 240], classes: [REGION.EYE_WHITE] };
const one = buildRegionalPalette(rgb2, W2, H2, cls2, { ...base, anchors: [white] });
console.log("n", one.n, "live", one.live, "alloc", JSON.stringify(one.alloc));
for (let k = 0; k < one.n; k++) console.log(k, Array.from(one.rgb.slice(k*3,k*3+3)).map(Math.round).join(","), "mask", one.classMask[k].toString(2), "anchor", one.anchor[k]);
const labels = classifyByRegion(rgb2, W2 * H2, W2, H2, one.lab, one.n, cls2, one, 2);
const ka = [...Array(one.n).keys()].find((k) => one.anchor[k]);
const leaks = [];
for (let i = 0; i < W2 * H2; i++) if (labels[i] === ka && cls2[i] !== REGION.EYE_WHITE) leaks.push([i % W2, (i / W2) | 0, cls2[i]]);
console.log("pixels of the anchor outside the zone:", leaks.length, JSON.stringify(leaks.slice(0, 12)));
