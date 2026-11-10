// Renders the flat 2D mockups the Atelier recolours: node scripts/garments/render-mockups.mjs [id ...]
//
// For every garment that has a 3D model here (the imported ones in sources.json and the generated
// ones in models.mjs) it photographs the model from the front and the back under soft studio
// light, onto a transparent background. The result is a white garment whose shading the editor
// multiplies by the chosen colour. Also writes lib/garment-mockups.json (image size and the
// garment's bounds inside it) and a small thumbnail per garment for the garment picker.
//
// Needs a Chromium/Chrome (set CHROME_PATH if it isn't on the PATH) — it is used only to run the
// same three.js the site uses, headless, with software GL.

import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { launchChrome, serve } from "./browser.mjs";
import { GARMENT_BUILDERS, buildGarment } from "./models.mjs";
import { writeGlb } from "./glb.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const appDir = join(here, "..", "..");
const mockupDir = join(appDir, "public", "mockups");
const thumbDir = join(mockupDir, "thumbs");
const workDir = mkdtempSync(join(tmpdir(), "kazi-mockups-"));
mkdirSync(thumbDir, { recursive: true });
const sources = JSON.parse(readFileSync(join(here, "sources.json"), "utf8"));

const LONG_SIDE = 1280; // px, the long side of each finished mockup
const RENDER = 2560; // px, the square render that is trimmed and scaled down (antialiasing)
const MARGIN = 0.035; // blank border around the garment, as a fraction of its long side

const PAGE = `<!doctype html><meta charset="utf-8">
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

window.renderGarment = (url, size, dim) => new Promise((resolve, reject) => {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(size, size);
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();

  // Soft key from the upper left, a gentle fill from the right and a pale ground bounce.
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc8c8c8, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 1.0);
  key.position.set(-1.6, 2.4, 3);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.35);
  fill.position.set(2.2, 0.4, 2);
  scene.add(fill);

  new GLTFLoader().load(url, (gltf) => {
    const group = new THREE.Group();
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff, roughness: 0.95, metalness: 0,
        // Generated garments carry baked occlusion as vertex colour; imported ones do not.
        vertexColors: !!o.geometry.getAttribute("color"),
        side: THREE.DoubleSide,
      });
      // Seen from inside (through the neck, armholes, mouth) the cloth is in shadow. "Inside" means
      // wound away from the viewer AND facing away by its smoothed normal, so wrinkle flanks that
      // wind away at a fold are not dimmed (that speckles real cloth meshes).
      if (dim) material.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <dithering_fragment>",
          "if (!gl_FrontFacing && dot(normalize(vNormal), normalize(vViewPosition)) < -0.05) gl_FragColor.rgb *= 0.55;\\n#include <dithering_fragment>",
        );
      };
      o.material = material;
    });
    group.add(gltf.scene);
    scene.add(group);

    const box = new THREE.Box3().setFromObject(group);
    const centre = box.getCenter(new THREE.Vector3());
    const half = (Math.max(box.max.x - box.min.x, box.max.y - box.min.y) / 2) * 1.06;
    const camera = new THREE.OrthographicCamera(-half, half, half, -half, 0.1, 20);
    camera.position.set(centre.x, centre.y, 5);
    camera.lookAt(centre.x, centre.y, 0);

    const shot = (rotation) => {
      group.rotation.y = rotation;
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL("image/png");
    };
    resolve({ front: shot(0), back: shot(Math.PI) });
  }, undefined, reject);
});
window.ready = true;
</script>`;

/**
 * How much to brighten a render so the lit parts of the cloth come out almost white. The editor
 * multiplies this shading by the chosen colour, so white shading means the swatch colour shows
 * exactly, with only creases and edges darker.
 */
async function shadingGain(dataUrl) {
  const png = Buffer.from(dataUrl.split(",")[1], "base64");
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const histogram = new Uint32Array(256);
  let count = 0;
  for (let i = 0; i < info.width * info.height; i++) {
    if (data[i * 4 + 3] < 250) continue;
    histogram[Math.round(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2])]++;
    count++;
  }
  let seen = 0;
  let level = 255;
  for (let v = 0; v < 256; v++) {
    seen += histogram[v];
    if (seen >= count * 0.88) {
      level = v;
      break;
    }
  }
  return Math.min(1.7, (0.99 * 255) / Math.max(level, 1));
}

/** Trims a render to the garment, scales it, and returns the file plus the garment's bounds inside it. */
async function finish(dataUrl, outFile, gain) {
  const png = Buffer.from(dataUrl.split(",")[1], "base64");
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, minY = info.height, maxX = 0, maxY = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 8) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    }
  }
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const pad = Math.round(Math.max(w, h) * MARGIN);
  const scale = LONG_SIDE / (Math.max(w, h) + pad * 2);
  const outW = Math.round((w + pad * 2) * scale);
  const outH = Math.round((h + pad * 2) * scale);

  // sharp runs its operations in a fixed internal order, so do this in separate passes.
  const trimmed = await sharp(png)
    .extract({ left: minX, top: minY, width: w, height: h })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .resize(outW, outH, { kernel: "lanczos3" })
    .toBuffer();
  const brightened = await sharp(trimmed).ensureAlpha().linear([gain, gain, gain, 1], [0, 0, 0, 0]).toBuffer();
  await sharp(brightened).greyscale().png({ compressionLevel: 9 }).toFile(outFile);

  const bw = Math.round(w * scale);
  const bh = Math.round(h * scale);
  const bx = Math.round(pad * scale);
  const by = Math.round(pad * scale);
  return {
    width: outW,
    height: outH,
    area: {
      x: +(bx / outW).toFixed(4),
      y: +(by / outH).toFixed(4),
      width: +(bw / outW).toFixed(4),
      height: +(bh / outH).toFixed(4),
    },
  };
}

const ids = process.argv.slice(2).length ? process.argv.slice(2) : [...Object.keys(sources), ...Object.keys(GARMENT_BUILDERS)];
const manifestFile = join(appDir, "lib", "garment-mockups.json");
const manifest = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, "utf8")) : {};

const server = await serve({ html: PAGE, mounts: { "/three/": join(appDir, "node_modules", "three"), "/work/": workDir } });
const browser = await launchChrome(join(workDir, "profile"));
try {
  await browser.open(`http://127.0.0.1:${server.address().port}/`);
  for (const id of ids) {
    const started = Date.now();
    if (sources[id]) {
      // An imported model: photograph the very file the viewer will load.
      copyFileSync(join(appDir, "public", "models", `${id}.glb`), join(workDir, `${id}.glb`));
    } else {
      // A generated model: the render copy also carries occlusion as vertex colour.
      const { mesh, colors } = buildGarment(id, { ao: true });
      writeFileSync(join(workDir, `${id}.glb`), writeGlb(mesh, { name: id, colors }));
    }

    const dim = !!sources[id]?.dimInside;
    const shots = await browser.evaluate(`window.renderGarment("/work/${id}.glb", ${RENDER}, ${dim})`);
    manifest[id] = {};
    const gain = await shadingGain(shots.front);
    for (const side of ["front", "back"]) {
      const file = join(mockupDir, `${id}-${side}.png`);
      const meta = await finish(shots[side], file, gain);
      manifest[id][side] = { src: `/mockups/${id}-${side}.png`, ...meta };
    }

    // A small picture for the garment picker (front view).
    await sharp(join(mockupDir, `${id}-front.png`))
      .resize({ width: 160, height: 160, fit: "inside" })
      .webp({ quality: 82, alphaQuality: 90 })
      .toFile(join(thumbDir, `${id}.webp`));

    const { front } = manifest[id];
    console.log(`${id}: ${front.width}x${front.height}, area ${JSON.stringify(front.area)} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  }
} finally {
  browser.close();
  server.close();
}

// The tee and hoodie keep their photographed mockups; they only need a picker thumbnail.
for (const [id, file] of [["t-shirt", "tshirt-front.png"], ["hoodie", "hoodie-front.png"]]) {
  await sharp(join(mockupDir, file))
    .trim()
    .resize({ width: 160, height: 160, fit: "inside" })
    .webp({ quality: 82, alphaQuality: 90 })
    .toFile(join(thumbDir, `${id}.webp`));
}

writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
console.log(`wrote ${manifestFile}`);
