// The garments the Atelier generates itself: today that is the utility vest (vest.mjs).
//
// The other garments are real models. The tee and hoodie are hand-made, the long-sleeve tee is the tee with its
// sleeves extended (derive-long-sleeve.mjs), and the sweatpants, work apron and tote are Creative Commons models by
// other artists (see sources.json and import-glb.mjs). No suitably licensed mesh utility vest could be found, so the
// vest is built from a shape description instead: a signed-distance function (sdf.mjs) turned into a mesh by marching
// cubes (mesher.mjs). The apron and the sweatpants were generated this way too until real models replaced them
// (Nov 2026); sweatpants.mjs is kept, unregistered, in case that is ever wanted again.
//
// Units are roughly metres, front is +z, up is +y. Run `node scripts/garments/build.mjs` to regenerate
// public/models/vest.glb after changing anything.

import { bakeOcclusion, clipByField, finishMesh, polygonise } from "./mesher.mjs";
import { vest } from "./vest.mjs";

// --- registry -----------------------------------------------------------------------------------

// A builder returns { id, field, clips, scale, bounds, simplify? } (see vest.mjs): `simplify`
// ({ triangles, error }) reduces the dense marching-cubes mesh when build.mjs writes the .glb.
export const GARMENT_BUILDERS = { vest };

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
