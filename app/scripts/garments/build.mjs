// Generates the garment models: node scripts/garments/build.mjs [id ...]
// Writes public/models/<id>.glb for each garment (all of them when none are named).

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GARMENT_BUILDERS, buildGarment } from "./models.mjs";
import { finishMesh } from "./mesher.mjs";
import { simplify } from "./simplify.mjs";
import { writeGlb } from "./glb.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "..", "public", "models");
mkdirSync(outDir, { recursive: true });

const ids = process.argv.slice(2);
for (const id of ids.length ? ids : Object.keys(GARMENT_BUILDERS)) {
  const started = Date.now();
  let { mesh, spec } = buildGarment(id);
  let reduced = "";
  if (spec.simplify) {
    const before = mesh.indices.length / 3;
    const smaller = await simplify(mesh, spec.simplify);
    mesh = finishMesh(smaller);
    reduced = ` (simplified from ${before}, error ${smaller.error.toFixed(4)})`;
  }
  const file = join(outDir, `${id}.glb`);
  const glb = writeGlb(mesh, { name: id });
  writeFileSync(file, glb);
  const size = mesh.max.map((m, c) => (m - mesh.min[c]).toFixed(3)).join(" x ");
  console.log(
    `${id}: ${mesh.indices.length / 3} triangles${reduced}, ${mesh.positions.length / 3} vertices, ` +
      `${(glb.length / 1024).toFixed(0)} KB, ${size} (w x h x d), ${((Date.now() - started) / 1000).toFixed(1)}s`,
  );
}
