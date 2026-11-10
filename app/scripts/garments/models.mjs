// The one garment the Atelier generates itself: the work apron.
//
// The other garments are real models — the tee and hoodie are hand-made, and the long-sleeve tee,
// vest, sweatpants and tote are Creative Commons models by other artists (see sources.json and
// import-glb.mjs). No suitably licensed bib apron could be found, so this one is built from a
// shape description instead: a signed-distance function (sdf.mjs) turned into a mesh by marching
// cubes (mesher.mjs). It is a placeholder for a proper model: when one is available, add it to
// sources.json and delete this file's apron.
//
// Units are roughly metres, front is +z, up is +y. Run `node scripts/garments/build.mjs` to
// regenerate public/models/apron.glb after changing anything.

import { noise3, sdPolygon, sdRoundRect, sdSegment2, smin, smoothstep } from "./sdf.mjs";
import { bakeOcclusion, clipByField, finishMesh, polygonise } from "./mesher.mjs";

// --- work apron ---------------------------------------------------------------------------------

function apron() {
  // The skirt is an inset trapezoid grown back out by its corner radius, so its corners are round.
  const skirtInset = [[-0.243, -0.405], [0.243, -0.405], [0.19, 0.01], [-0.19, 0.01]];
  const straps = [
    [[-0.125, 0.285], [-0.064, 0.44]],
    [[-0.064, 0.44], [-0.03, 0.488]],
    [[-0.03, 0.488], [0.03, 0.488]],
    [[0.03, 0.488], [0.064, 0.44]],
    [[0.064, 0.44], [0.125, 0.285]],
  ];
  const tie = (s) => [[s * 0.205, -0.03], [s * 0.262, -0.05], [s * 0.305, -0.1], [s * 0.325, -0.17], [s * 0.328, -0.26], [s * 0.319, -0.36]];
  const tieSegs = [1, -1].flatMap((s) => {
    const p = tie(s);
    return p.slice(0, -1).map((a, i) => [a, p[i + 1]]);
  });

  // The flat outline of the apron (2D signed distance in x, y).
  function outline(x, y) {
    const sk = sdPolygon(x, y, skirtInset) - 0.025;
    const bib = sdRoundRect(x, y - 0.15, 0.148, 0.15, 0.02);
    const body = smin(sk, bib, 0.05);
    let band = Infinity;
    for (const [a, b] of straps) band = Math.min(band, sdSegment2(x, y, a[0], a[1], b[0], b[1]) - 0.0145);
    for (const [a, b] of tieSegs) band = Math.min(band, sdSegment2(x, y, a[0], a[1], b[0], b[1]) - 0.0135);
    return smin(body, band, 0.025);
  }

  const half = 0.0035; // half thickness before the edge rounding below
  function field(x, y, z) {
    const flat = outline(x, y);
    // The cloth wraps round the body, so its sides curve back; the pocket is a raised patch on the front.
    const bend = -0.55 * x * x;
    const pocket = 0.0075 * smoothstep(0.008, -0.004, sdRoundRect(x, y + 0.185, 0.118, 0.078, 0.022));
    const thick = half + pocket / 2;
    const w1 = flat;
    const w2 = Math.abs(z - (bend + pocket / 2)) - thick;
    const d = Math.min(Math.max(w1, w2), 0) + Math.hypot(Math.max(w1, 0), Math.max(w2, 0)) - 0.0035;
    return d + 0.0012 * noise3(x * 14, y * 14, z * 14);
  }

  return {
    id: "apron",
    field,
    clips: [],
    scale: 0.86,
    bounds: { min: [-0.4, -0.46, -0.09], max: [0.4, 0.53, 0.07], step: 0.0058 },
  };
}

// --- registry -----------------------------------------------------------------------------------

export const GARMENT_BUILDERS = { apron };

/** Builds a garment's mesh: polygonise, open it up, size and place it, add UVs. `ao` adds vertex occlusion. */
export function buildGarment(id, { ao = false } = {}) {
  const spec = GARMENT_BUILDERS[id]();
  let mesh = polygonise(spec.field, spec.bounds);
  for (const clip of spec.clips) mesh = clipByField(mesh, clip);
  mesh = finishMesh(mesh);

  // Size it, centre it sideways and front-to-back, and stand every garment on the same floor as
  // the original tee model (its hem is at y = -0.356), so the viewer's ground shadow suits all of them.
  const scale = spec.scale ?? 1;
  const bounds = (c) => [mesh.min[c] * scale, mesh.max[c] * scale];
  const offset = [0, 1, 2].map((c) => (c === 1 ? bounds(1)[0] + 0.356 : (bounds(c)[0] + bounds(c)[1]) / 2));
  const original = mesh.positions;
  mesh.positions = original.map((p, i) => p * scale - offset[i % 3]);
  mesh.min = [0, 1, 2].map((c) => bounds(c)[0] - offset[c]);
  mesh.max = [0, 1, 2].map((c) => bounds(c)[1] - offset[c]);

  let colors;
  if (ao) {
    // Occlusion is measured against the solid in its own (unscaled, uncentred) coordinates.
    const values = bakeOcclusion({ positions: original, normals: mesh.normals }, spec.field);
    colors = new Float32Array(values.length * 3);
    values.forEach((o, v) => colors.fill(o, v * 3, v * 3 + 3));
  }
  return { mesh, colors, spec };
}
