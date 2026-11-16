# The test harness (how the results in this folder were made)

These scripts are NOT in the website repository. They were written for this session and live next to each other; the paths at the top of each file assume the
session's scratch folder layout (`faces/` beside `inputs3/`, `inputs4_dade/`, `out3/`, `out4/`, `venv/`, `node_modules/`), so change those constants to use them
somewhere else. Nothing here uploads a picture anywhere except `render_dade`'s inputs, which are DADE's own downloads.

The idea: the browser-only parts (the person model, the face landmarker) are captured ONCE per picture in a real browser; everything else (tracing, converting,
stitching) is replayed in plain node in about 1-5 seconds a picture, so a change to the engine can be measured on dozens of pictures in under a minute.

| Step | File | What it does |
|---|---|---|
| capture | `server.mjs`, `harness.html`, `capture.mjs` | Headless Chromium runs the site's REAL modules (`lib/digitizer/image.js`, `segment.js`) on each picture and saves what the tracer's inputs are: the exact pixels the page would hand the tracer (`image.rgba`), the person model's six 256x256 maps (`probs.f32`), the face landmarks (`landmarks.json`) and a hair mask (`hair.f32`, tried, not used). |
| replay | `replay.mjs`, `batch.mjs` | Repeats `useDigitizer.runConvert` in node: first trace; if the picture is a photo, the person model's maps are refined (`segment.js` `refineFromProbs`) and the picture is traced again with the region map (and, with `--faces on`, the eyes and lips painted in); then `objectsFromTrace` and `generate`. Writes the DST, a picture of the thread (the site's own `rasterizePattern`) and `stats.json` (which cloth the tool chose, stitches, trims, threads, per-region colours). `--lib` points at another copy of `app/lib` (the "before" runs use a copy of `git archive HEAD`), `--trace '{"regionAreaPower":0.7}'` tries tracer options. |
| metrics | `tools.py metrics` | Puts the render back on the picture's frame exactly (the replay knows where it sits), blurs both 0.3 mm, and measures colour distance (dE), luminance correlation, and, for pictures with a face, the same inside the face outline, the eyes, the brows and the lips (outlines from the landmarks). |
| sheets | `tools.py sheet` | Picture \| before \| after \| DADE, with the numbers, and a zoom on the face. Everything is drawn on the cloth the tool CHOSE for that picture. |
| compare | `compare.py`, `vs_dade.py` | Before against after; ours against DADE. |
| DADE | `render_dade.py` | DADE's DST files carry no thread colours, so each block is drawn in the median colour of the picture under its stitches; the placement is found by matching (colour blocks sit on flat colour under the right offset). Drawn on the same cloth as ours. |
| sizes | `sweep_sheet.py` | One picture sewn at several sizes, cropped in real scale. |
| real page | `build_site.ps1`, `serve_out.mjs`, `e2e_faces.mjs`, `e2e_extra.mjs`, `ff_smoke.mjs` | Builds an isolated copy of the site (HEAD + only the changed digitizer files), serves its `out/` folder, and drives the production page like a visitor in Chromium (Playwright) and Firefox (puppeteer-core, WebDriver BiDi). |
| probe | `faces_probe.mjs` | Draws the eyes, brows, irises and lips that `faces.js` computes over the faces, to check them by eye. |

Traps worth remembering:
- Draw a result on the cloth the tool chose (`stats.cloth`), not on cream: a dark backdrop makes the tool pick a dark cloth, and a black-haired person on it then has "missing" hair on cream.
- Whole-frame scores mean nothing for a picture with a person cut out (the background is left out on purpose): use the person or face region.
- PowerShell 5.1 strips the inner quotes of a JSON argument to a native command: write `{\"a\":1}`.
- `git archive | tar` through a PowerShell pipe corrupts the archive: write it to a file first.
