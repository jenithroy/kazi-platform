# Kazi digitizer: face work and tests, 2026-11-14

Nothing here was sewn. Every judgement is from pictures of the stitch files, drawn by the site's own renderer (`lib/embroidery/stitch/raster.js`), and from numbers measured against the source picture.
The code changes are in the website's working tree and are **not committed or pushed**.

## What changed

1. **Colours are shared out face first** (`regionPalette.js`). A person's picture used to give its colours to whichever region had the most error in pixels, so a small face lost to a big
   white suit: the astronaut's suit and helmet got 9 colours and his face ONE (a flat patch, no eyes). Now a region's gain counts by its size to the power 0.7, and the face gets 3 colours
   (its eyes 2) before the rest are shared. Chosen on a tuning half of the new pictures and checked on a held-out half (it was the best balance of face gain against colour lost from the clothes).
2. **The eyes, brows and lips are found with MediaPipe's face landmarker** (3.76 MB model, `lib/digitizer/faces.js` and `faceFinder.js`, run in the person finder's worker and only after the person
   model has found a person) and become two more regions, so the tracer finds the iris, the white round it and the red of the lips from the picture's own pixels.
3. **The page tells the person how big the face will be** ("The face is about 14 mm wide, so each eye is about 2.5 mm"), warns when an eye is under 2 mm, and has a **"Crop to the face"** button
   (head and shoulders, then fills the hoop). The 2 mm figure comes from sewing one face at eight sizes (`sweep` pictures in `sheets/`).

Not done: lettering and serif fonts, the tonal (dithered) rendering of photos (patent question, needs a sew-out), the hair segmenter, black-and-white portraits.

## What was tested

| Test | Result |
|---|---|
| 55 new free-licence Wikimedia pictures in 15 kinds (faces: colour 8, black and white 3, angled 3, small in a scene 4, painted 4, sculpture 2; cartoons 3; animals 6; nature 3; scenes 3; objects 3; text 4 incl. Devanagari; emblems 4; line art 3; icons 2), split into a tuning half (28) and a held-out half (27) | 40 of the 55 came out **byte for byte the same** as before (they are not people); 15 changed |
| The 18 earlier pictures (3 faces, painting, dog, cat, eagle, landscape, rose, engravings, logos, emblem, crest) | 16 the same, 2 changed (the astronaut and the painting) |
| Every picture run against **DADE** (png2dst.com) at the same physical size and default settings | DADE converted 52 of the 55 new ones (it failed on 3 painted portraits) |
| The real production build of the page in headless **Chromium**, 14 runs like a visitor (upload, convert, read the panel, Stitches step, download the DST, crop to the face) | all as expected, no console errors |
| The same pipeline in **Firefox 160** | identical result (11,821 stitches, same face note, crop works) |
| A phone width (390 px), accessibility scan (axe), undo after the crop, the landmarker file missing, "Find the person" switched off | no overflow, 0 axe violations, the note follows the picture through undo, clean fallback, no models loaded |
| Self-tests under node | tracer 163, digitizer 82 (incl. 20 new face and landmark checks), stitch engine, file formats 1000: all pass; eslint clean; production build passes |

## Results: before and after (the faces)

Face region = the outline MediaPipe finds; "correlation" = luminance correlation between the stitched picture and the source, both blurred 0.3 mm; dE = colour distance.

| | Face correlation before | after | Whole person dE | Stitches |
|---|---|---|---|---|
| Astronaut (face 13 mm wide) | 0.49 | **0.89** | +0.4 | -8 % (11,142 to 10,259) |
| His eyes: contrast against the source | 0.08 (gone) | **0.80** | | |
| New set, tuning half (8 faces that changed) | | +0.010 | +0.09 | -2.3 % |
| New set, held-out half (6 faces that changed) | | -0.003 | +0.11 | 0.0 % |

So: **small faces improve a lot; larger faces (20 to 50 mm) change little on the numbers** (they already had enough tones) and look a little cleaner (more tones, pink lips). The cost is
that a portrait's clothes give a colour or two to its face: the rose portrait's shirt went from a vivid cyan to a lighter flat blue. Pictures that are not people are untouched.

### How small can a face be? (the astronaut sewn at eight sizes, real scale)

| Face width | Eye width | What you see |
|---|---|---|
| 4.9 mm | 0.8 mm | a smudge |
| 6.5 mm | 1.1 mm | no eyes, a mouth line |
| 8.2 mm | 1.4 mm | faint dark marks |
| 9.8 mm | 1.7 mm | two dark marks, reads as a face |
| 13 mm | 2.3 mm | a lid line and an iris |
| 16 mm | 2.8 mm | eyes with their white |
| 21 to 26 mm | 3.7 to 4.5 mm | proper eyes with iris and lids |

## Results: against DADE

Faces (the fair comparison: the face outline, both drawn on the cloth our tool chose, DADE's colours taken from the picture under each of its blocks because a DST file has none):

| | Faces | Face correlation ours / DADE | Ours higher on | Face dE ours / DADE (lower is better) | Eye-region correlation ours / DADE |
|---|---|---|---|---|---|
| New 55 | 19 | **0.943 / 0.723** | 18 of 19 | 8.5 / 12.5 (lower on 16) | 0.69 / 0.54 |
| Earlier 18 | 5 | **0.953 / 0.527** | 5 of 5 | 8.0 / 15.4 (lower on 4) | 0.82 / 0.20 |

Pictures that are not people (whole frame, ours / DADE): animals 0.978 / 0.773, cartoons 0.971 / 0.923, emblems 0.972 / 0.778, icons 0.986 / 0.544, line art 0.922 / 0.873, objects 0.977 / 0.713,
scenes 0.942 / 0.811, text 0.940 / 0.544, nature 0.956 / 0.959 (a tie). Over all 52 DADE converted, ours used 792,519 stitches against DADE's 1,330,382 (40 % fewer).
**Caveats:** this number rewards using more colours (ours up to 12, DADE 5) and says nothing about how it sews. Ours has **more thread cuts** (median 258 against DADE's 230), the same weakness as before.
Whole-frame numbers are meaningless for a person picture, because ours leaves the background out on purpose, so they are not used for faces.

DADE failed on three painted portraits: the pencil portrait (it would be about 116,000 stitches, over DADE's free limit of 100,000) and the Rembrandt and Renoir ("this job ran much longer than expected and was stopped").

## What did not get better, or got worse

- **Black-and-white portraits are read as artwork** (a good fit of 16 greys), so neither the person finder nor the face finder is asked for them. The senator comes out as four threads and looks stencilled. Not fixed.
- Faces in a crowd, a group or a full-length picture are too small for the landmarker to find (none of the 4 tested), and too small to sew anyway.
- The clothes cost described above; the held-out half shows no gain on larger faces on the average.
- Lettering and serif fonts: not touched; the earlier limits stand.
- **Memory:** adding the face landmarker made no measurable difference to the browser's memory (about 1.09 GB for the whole headless browser with and without it, 0.62 GB after a logo). The person model, which was already there, accounts for about 0.5 GB. Low-end phones were not tested.
- The face model's licence: third-party catalogues and the MediaPipe project say Apache-2.0, but the text of Google's own model cards could not be read automatically. `public/mediapipe/NOTICE.txt` says so. Worth a two-minute check.

## Corrections to earlier results (mine)

- My earlier comparison pictures drew our result on cream cloth even where the tool had chosen a dark cloth (the woman's photo: `#0e0e0e`; the eagle: `#3f2f20`). The woman's "missing hair" was that drawing: her black hair is meant to be the cloth.
  **`Kazi digitizer comparison\ALL_COMPARISONS` has this flaw for those two pictures.** Everything in this folder is drawn on the cloth the tool chose.
- I first put the two portraits we lost to DADE down to the background removal; only the astronaut's was the engine's (the colour shares above).

## Files

- `sheets/faces/`: one sheet for every picture with a face (new set), picture | ours before | ours after | DADE, with a zoom on the face.
- `sheets/by_category/`: one overview for each of the 15 kinds of picture. `sheets/earlier18/`: the 18 earlier pictures, redrawn on the right cloth.
- `real_page_tests/`: pictures of the real page for each of the 14 runs, the DST each one saved, the report (`e2e_report.json`), the phone, undo and accessibility check, Firefox, memory.
- `stitch_files/`: the DST files the new code makes for all 73 pictures (raw engine output; the page's own export centres them on the hoop).
- `metrics/`: the numbers behind everything above. `inputs/`: the pictures, with `SOURCES.txt` (author, licence, link for each). `harness/`: the scripts, with a README.
- The code: `docs/digitizer.md` (sections 5.6 and 5.8) and `app/lib/embroidery/README.md` ("Faces first") in the website repo.
