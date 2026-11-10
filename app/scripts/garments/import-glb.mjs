// Brings third-party garment models into the Design page: node scripts/garments/import-glb.mjs [id ...]
//
// The models listed in sources.json are Creative Commons (CC BY) garments published on Sketchfab.
// For each one this script downloads the .glb (from Objaverse's public mirror of Sketchfab's
// downloadable CC models), then, in headless Chrome with the site's own three.js:
//
//   - merges its pieces (these come out of CLO / Marvelous Designer as one mesh per panel) into one
//   - welds the seams between pieces and smooths the shading across them
//   - drops the baked-in colours and textures (customers choose the colour)
//   - stands it up the way the viewer expects (front toward +z, hem on the same floor as the tee,
//     sized like the others)
//   - optionally reduces a very dense mesh to a size worth downloading (`simplify`, see below)
//
// and writes public/models/<id>.glb with the author's credit stored in the file, plus
// lib/garment-models.json (the credits the Atelier shows, and per-model viewer settings).
// Chrome or Chromium must be installed.
//
// Per-source options in sources.json (besides the credit fields):
//   fit        { height, maxWidth }  size in the viewer's units
//   exclude    regex on mesh names   pieces to leave out: duplicate layers, a mannequin, a logo, or the
//                                    sleeves of a jacket that is being made into a vest
//   adapted    text                  what was changed, added to the credit stored in the .glb
//   simplify   { triangles, error }  reduce to about this many triangles (meshoptimizer's quadric edge
//                                    collapse; borders such as hems and armholes stay where they are)
//   rotateY, creaseDegrees, dimInside  see below / the viewer

import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { launchChrome, serve } from "./browser.mjs";
import { finishMesh } from "./mesher.mjs";
import { writeGlb } from "./glb.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const appDir = join(here, "..", "..");
const sources = JSON.parse(readFileSync(join(here, "sources.json"), "utf8"));
const cacheDir = join(tmpdir(), "kazi-garment-sources");
mkdirSync(cacheDir, { recursive: true });
const workDir = mkdtempSync(join(tmpdir(), "kazi-import-"));

const FLOOR = -0.356; // where the original tee model's hem sits; every garment stands on it

const PAGE = `<!doctype html><meta charset="utf-8">
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Loads a model and returns it as one welded, smooth-shaded, upright triangle mesh.
window.processModel = async (url, opts) => {
  const gltf = await new GLTFLoader().loadAsync(url);
  gltf.scene.updateMatrixWorld(true);

  // 1. Gather every triangle in world space, with the author's own normals.
  const P = [];
  const N = [];
  const T = [];
  const pieces = []; // [first triangle index, end] for each source mesh
  const exclude = opts.exclude ? new RegExp(opts.exclude, "i") : null;
  const v = new THREE.Vector3();
  const rotation = new THREE.Matrix4().makeRotationY(opts.rotateY ?? 0);
  gltf.scene.traverse((mesh) => {
    if (!mesh.isMesh || (exclude && exclude.test(mesh.name))) return;
    const geometry = mesh.geometry;
    const position = geometry.getAttribute("position");
    const normal = geometry.getAttribute("normal");
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
    const base = P.length / 3;
    for (let i = 0; i < position.count; i++) {
      v.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).applyMatrix4(rotation);
      P.push(v.x, v.y, v.z);
      if (normal) v.fromBufferAttribute(normal, i).applyMatrix3(normalMatrix).transformDirection(rotation).normalize();
      else v.set(0, 0, 0);
      N.push(v.x, v.y, v.z);
    }
    const index = geometry.index;
    const count = index ? index.count : position.count;
    const first = T.length;
    for (let i = 0; i < count; i++) T.push(base + (index ? index.getX(i) : i));
    pieces.push([first, T.length]);
  });

  // Which way is "outwards"? Each source piece votes: do its triangles wind the way the author's
  // own normals point? If most do not, the whole piece is flipped. (Deciding per triangle instead
  // goes wrong at tight folds, where a vertex normal says little about the face.)
  const flipPiece = pieces.map(([from, to]) => {
    let agree = 0;
    for (let t = from; t < to; t += 3) {
      const a = T[t], b = T[t + 1], c = T[t + 2];
      const ux = P[b * 3] - P[a * 3], uy = P[b * 3 + 1] - P[a * 3 + 1], uz = P[b * 3 + 2] - P[a * 3 + 2];
      const wx = P[c * 3] - P[a * 3], wy = P[c * 3 + 1] - P[a * 3 + 1], wz = P[c * 3 + 2] - P[a * 3 + 2];
      const dot = (uy * wz - uz * wy) * (N[a * 3] + N[b * 3] + N[c * 3]) + (uz * wx - ux * wz) * (N[a * 3 + 1] + N[b * 3 + 1] + N[c * 3 + 1]) + (ux * wy - uy * wx) * (N[a * 3 + 2] + N[b * 3 + 2] + N[c * 3 + 2]);
      agree += dot >= 0 ? 1 : -1;
    }
    return agree < 0;
  });

  // 2. Weld vertices that sit in the same place (the seams between panels), averaging their
  //    normals when they agree and keeping them apart where there is a real crease.
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < P.length; i += 3) for (let c = 0; c < 3; c++) { min[c] = Math.min(min[c], P[i + c]); max[c] = Math.max(max[c], P[i + c]); }
  const diagonal = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
  const cell = diagonal * 2e-5;
  const buckets = new Map();
  const outP = [];
  const outN = [];
  const remap = new Int32Array(P.length / 3);
  const CREASE = Math.cos((opts.creaseDegrees ?? 55) * Math.PI / 180);
  for (let i = 0; i < P.length / 3; i++) {
    const key = Math.round(P[i * 3] / cell) + "," + Math.round(P[i * 3 + 1] / cell) + "," + Math.round(P[i * 3 + 2] / cell);
    let list = buckets.get(key);
    if (!list) buckets.set(key, (list = []));
    const nx = N[i * 3], ny = N[i * 3 + 1], nz = N[i * 3 + 2];
    let hit = list.find((id) => outN[id * 3] * nx + outN[id * 3 + 1] * ny + outN[id * 3 + 2] * nz > CREASE * Math.hypot(outN[id * 3], outN[id * 3 + 1], outN[id * 3 + 2]));
    if (hit === undefined) {
      hit = outP.length / 3;
      outP.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
      outN.push(0, 0, 0);
      list.push(hit);
    }
    outN[hit * 3] += nx; outN[hit * 3 + 1] += ny; outN[hit * 3 + 2] += nz;
    remap[i] = hit;
  }
  for (let i = 0; i < outN.length; i += 3) {
    const l = Math.hypot(outN[i], outN[i + 1], outN[i + 2]) || 1;
    outN[i] /= l; outN[i + 1] /= l; outN[i + 2] /= l;
  }

  // 3. Triangles: drop degenerate ones, and wind each piece the way it was voted to face.
  const tris = [];
  pieces.forEach(([from, to], piece) => {
    for (let t = from; t < to; t += 3) {
      const a = remap[T[t]], b = remap[T[t + 1]], c = remap[T[t + 2]];
      if (a === b || b === c || a === c) continue;
      if (flipPiece[piece]) tris.push(a, c, b); else tris.push(a, b, c);
    }
  });

  // 4. Size it, centre it sideways and front-to-back, and stand it on the floor.
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < outP.length; i += 3) for (let c = 0; c < 3; c++) { lo[c] = Math.min(lo[c], outP[i + c]); hi[c] = Math.max(hi[c], outP[i + c]); }
  const width = hi[0] - lo[0], height = hi[1] - lo[1];
  const scale = Math.min(opts.fit.height / height, opts.fit.maxWidth / width);
  const cx = (lo[0] + hi[0]) / 2, cz = (lo[2] + hi[2]) / 2;

  // Do the normals point out of the garment, where it gets printed? Some cloth exports contain two
  // copies of every panel, an outer one and an inner lining facing the other way. Keep only the inner
  // one and the model still looks right (cloth is drawn two-sided) but the viewer's artwork filter
  // rejects every face, so nothing can be printed. Artwork goes on the front and the back, so check
  // exactly that: the front-most surface should face +z and the back-most -z. About +0.8 for a sound
  // garment, negative for an inner lining.
  let frontZ = 0, backZ = 0, nFront = 0, nBack = 0;
  const zRange = hi[2] - lo[2];
  for (let i = 0; i < outP.length; i += 3) {
    if (outP[i + 2] >= lo[2] + 0.85 * zRange) { frontZ += outN[i + 2]; nFront++; }
    else if (outP[i + 2] <= lo[2] + 0.15 * zRange) { backZ -= outN[i + 2]; nBack++; }
  }
  const outward = (frontZ / Math.max(nFront, 1) + backZ / Math.max(nBack, 1)) / 2;
  for (let i = 0; i < outP.length; i += 3) {
    outP[i] = (outP[i] - cx) * scale;
    outP[i + 1] = (outP[i + 1] - lo[1]) * scale + opts.floor;
    outP[i + 2] = (outP[i + 2] - cz) * scale;
  }
  const round = (n) => Math.round(n * 1e5) / 1e5;
  return {
    positions: outP.map(round), normals: outN.map(round), indices: tris,
    stats: { inputTriangles: T.length / 3, outputTriangles: tris.length / 3, vertices: outP.length / 3, scale, pieces: pieces.length, flippedPieces: flipPiece.filter(Boolean).length, outward },
  };
};
window.ready = true;
</script>`;

/**
 * Reduces a welded triangle mesh to about `triangles` triangles. Cloth-simulation exports are far
 * denser than a web page needs (hundreds of thousands of triangles), and most of that is flat cloth.
 * Normals travel with the vertices so the shading of the quilting, folds and seams survives; the
 * vertices on open borders (hems, armholes, collars) are locked so the silhouette does not shrink.
 */
async function simplify(mesh, { triangles, error = 0.02, normalWeight = 1 }) {
  let MeshoptSimplifier;
  try {
    ({ MeshoptSimplifier } = await import("meshoptimizer"));
  } catch {
    throw new Error('"simplify" needs the meshoptimizer package (it comes with three.js\'s tooling; otherwise `npm i -D meshoptimizer`)');
  }
  await MeshoptSimplifier.ready;
  const positions = Float32Array.from(mesh.positions);
  const normals = Float32Array.from(mesh.normals);
  const indices = Uint32Array.from(mesh.indices);
  const weights = [normalWeight, normalWeight, normalWeight];
  const [count, achieved] = MeshoptSimplifier.simplifyWithUpdate(
    indices, positions, 3, normals, 3, weights, null, Math.min(indices.length, triangles * 3), error, ["LockBorder", "Prune"],
  );
  for (let i = 0; i < normals.length; i += 3) {
    const l = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
    normals[i] /= l; normals[i + 1] /= l; normals[i + 2] /= l;
  }
  return { positions, normals, indices: indices.slice(0, count), error: achieved };
}

/** Downloads a model once and returns its cached file name (the model's own id, so swapping a garment's source never reuses an old download). */
async function download(url) {
  const name = new URL(url).pathname.split("/").pop();
  const file = join(cacheDir, name);
  if (existsSync(file)) return name;
  console.log(`  downloading ${url}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed (${response.status}) for ${url}`);
  writeFileSync(file, Buffer.from(await response.arrayBuffer()));
  return name;
}

const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(sources);
const server = await serve({ html: PAGE, mounts: { "/three/": join(appDir, "node_modules", "three"), "/work/": cacheDir } });
const browser = await launchChrome(join(workDir, "profile"));
const modelsFile = join(appDir, "lib", "garment-models.json");
const models = existsSync(modelsFile) ? JSON.parse(readFileSync(modelsFile, "utf8")) : {};
try {
  await browser.open(`http://127.0.0.1:${server.address().port}/`);
  for (const id of wanted) {
    const source = sources[id];
    if (!source) throw new Error(`"${id}" is not in sources.json`);
    console.log(`${id}: ${source.title} by ${source.author}`);
    const file = await download(source.download);

    const options = JSON.stringify({ ...source, floor: FLOOR });
    const result = await browser.evaluate(`window.processModel("/work/${file}", ${options})`);
    if (result.stats.outward < -0.05) {
      throw new Error(`${id}: the normals point into the garment (${result.stats.outward.toFixed(2)}): this is the inner lining of the panels. Use "exclude" to keep the outer copy instead.`);
    }
    if (result.stats.outward < 0.3) {
      console.warn(`  warning: the front and back surfaces do not clearly face outwards (${result.stats.outward.toFixed(2)}): check which copy of the panels is kept (see "exclude"), or printing may fail.`);
    }
    let merged = {
      positions: Float32Array.from(result.positions),
      normals: Float32Array.from(result.normals),
      indices: Uint32Array.from(result.indices),
    };
    let reduced = "";
    if (source.simplify) {
      const before = merged.indices.length / 3;
      merged = await simplify(merged, source.simplify);
      reduced = `, simplified from ${before} to ${merged.indices.length / 3} triangles (error ${merged.error.toFixed(4)})`;
    }
    const mesh = finishMesh(merged);

    const credit = `"${source.title}" by ${source.author} (${source.sourceUrl}), ${source.license} (${source.licenseUrl}). ` +
      `Adapted: ${source.adapted ? source.adapted + "; " : ""}pieces merged, textures removed, resized and repositioned.`;
    const glb = writeGlb(mesh, { name: id, copyright: credit });
    writeFileSync(join(appDir, "public", "models", `${id}.glb`), glb);
    models[id] = {
      credit: {
        title: source.title, author: source.author, authorUrl: source.authorUrl, sourceUrl: source.sourceUrl,
        license: source.license, licenseShort: source.licenseShort, licenseUrl: source.licenseUrl,
      },
      // Shade the inside of the garment darker where it shows (neck, armholes, mouth). Only on for
      // meshes that stay clean with it: some simulated cloth has layers that speckle (see the viewer).
      dimInside: !!source.dimInside,
    };
    const size = mesh.max.map((m, c) => (m - mesh.min[c]).toFixed(3)).join(" x ");
    const s = result.stats;
    console.log(`  ${s.inputTriangles} -> ${s.outputTriangles} triangles${reduced}, ${mesh.positions.length / 3} vertices, ${(glb.length / 1024).toFixed(0)} KB, ${size} (w x h x d); ${s.flippedPieces}/${s.pieces} pieces re-wound; normals outward ${s.outward.toFixed(2)}`);
  }
} finally {
  browser.close();
  server.close();
}
writeFileSync(modelsFile, JSON.stringify(models, null, 2) + "\n");
console.log(`wrote ${modelsFile}`);
