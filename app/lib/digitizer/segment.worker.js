/**
 * The person finder's Web Worker (segment.js, segmentClient.js). The model and the edge refinement take about three seconds of CPU, which must not
 * freeze the page. One message in ({ id, image }), one out ({ id, result, classes } or { id, error }); the class map goes back as a transferred buffer.
 *
 * The wasm and the model are static files of the site (public/mediapipe, see NOTICE.txt there), not part of the bundle: the browser downloads them
 * (about 35 MB with the face landmarker, faceFinder.js) only when a photograph needs the person finder, and then keeps them.
 *
 * WHICH wasm loader: Next's bundler (Turbopack) runs this file as a CLASSIC worker whatever `type` the Worker constructor is given, and a classic
 * worker loads MediaPipe's loader with importScripts(), which needs the classic flavour (vision_wasm_internal.*). The module flavour
 * (vision_wasm_module_internal.*, what the Vite app this came from used) fails here with "Cannot use 'import.meta' outside a module". If the
 * bundler ever makes this a real module worker, ship the module flavour as well and let segment.js choose with isModuleWorker().
 */
import { segmentPicture, ready } from "./segment.js";
import { findFaceLandmarks } from "./faceFinder.js";
import { mainFaces, featureAnchors } from "./faces.js";

const FILES = {
  wasmLoaderUrl: "/mediapipe/wasm/vision_wasm_internal.js",
  wasmBinaryUrl: "/mediapipe/wasm/vision_wasm_internal.wasm",
  modelUrl: "/mediapipe/selfie_multiclass_256x256.tflite",
};

let loading = null;

self.addEventListener("message", async (ev) => {
  const { id, image } = ev.data;
  try {
    loading = loading || ready(FILES);
    await loading;
    const { classes, ...result } = await segmentPicture(image, {});
    // Where the eyes, brows and lips are (a 4 MB model, loaded the first time): only for a picture that has a person in it. [] when there is none or the finder fails.
    const faces = result.person ? await findFaceLandmarks(image) : [];
    // The white of the eyes and of the teeth, measured here where the picture's pixels are (the page does not keep them): the palette of a face never finds them by itself.
    let anchors = [];
    try { anchors = faces.length ? featureAnchors(image, mainFaces(faces, image.width, image.height)) : []; } catch (err) { console.warn("[digitizer] the whites of the face could not be measured:", err); }
    self.postMessage({ id, result, classes, faces, anchors }, [classes.buffer, ...faces.map((f) => f.buffer)]);
  } catch (err) {
    loading = null; // a failed load is tried again with the next picture
    // The page carries on without the person finder (the picture is converted as it is), so say why in the console.
    console.warn("[digitizer] the person finder could not run:", err);
    self.postMessage({ id, error: String((err && err.message) || err) });
  }
});
