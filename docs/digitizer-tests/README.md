# The Kazi digitizer's tests (rounds 1 to 5, 2026-11-12 to 2026-11-16)

Everything that was run to judge the embroidery digitizer (the `/digitizer` page; the engine is in `app/lib/embroidery/`): the pictures it was tested on, what it made, what a rival (DADE, png2dst.com) made on the same pictures, the numbers, the real production page driven in a browser, and the scripts. **None of it was sewn on cloth**: the pictures are stitch files drawn by our own routine and the numbers are measurements on those drawings (colour distance, the errors of a text reader, stitch counts). How the digitizer works is in `docs/digitizer.md` (section 11 says how it compared with other tools, section 12 lists the changes round by round).

| Round | Where | What it asked | Read first |
|---|---|---|---|
| 1 (2026-11-14) | this folder: `sheets/`, `metrics/`, `stitch_files/`, `real_page_tests/`, `harness/` | faces: do eyes, lips and skin tones come out? 73 pictures (55 new + 18 earlier), before / after / DADE | `SUMMARY.md` and the rest of this file |
| 2 (2026-11-14) | `round2 - background, whites, lettering/` | the background switch must leave out nothing; eye whites and teeth; serif and small lettering | its `README.md` |
| 3 (2026-11-15) | `round3 - lettering/` | lettering judged by a text reader: serif and heavy small fonts, lettering found inside pictures, the advice, 18 more fonts | its `README.md` |
| 4 (2026-11-15) | `round4 - how DADE does fonts/` | how DADE sews lettering, copying it (the dense fill), then keeping the drawn weight | its `README.md` (`CURRENT_SYSTEM/` is the result; `older_runs_not_current/` are superseded runs kept as evidence) |
| 5 (2026-11-16) | `round5 - lettering in pictures traced finer/` | rough lettering in pictures: a second, finer tracing; short words; 18 other fonts; mixed backgrounds | its `README.md` |

`inputs/` holds the pictures that were tested, with their credits.

**Licences and credits.** The test pictures come from Wikimedia Commons (public domain, CC0, CC BY and CC BY-SA only); the author, licence and link of each are in `inputs/new55/SOURCES.txt` and `inputs/earlier18/SOURCES.txt`. Our stitched drawings of them (the sheets, boards and DST files) are adaptations: they keep the credit of the picture they were made from, and for CC BY-SA pictures they are offered under the same licence. They are test inputs only, not marketing material (check each licence before using one as such). The logos in the set (Nike, Adidas, Harley-Davidson, Mercedes, the Olympic rings) belong to their owners and appear only as test pictures. The portraits are pictures already published on Commons under those licences.

**The scripts** (the `harness` folders) are what produced the numbers. They were written for one machine: its paths are written here as `<SESSION>` (the scratch folder of the session that ran the benches), `<RESULTS>` (the folder these results were first made in) and `<REPO>` (the website checkout); set them to your own layout before running one. They use Node with `sharp` (it is in `app/node_modules`), Python with Pillow, numpy and `rapidocr_onnxruntime` for the text reader, and a headless Chromium (Playwright) for the page tests. The large caches the benches read (glyph rasters, the reader's models, the face model's outputs) are not stored here.

Added to the repository on 2026-11-16 (about 240 MB, 907 files). The rest of this file is the original README of round 1.

**Newest:** round 5 (see the table above).

Start with **SUMMARY.md** (what changed in round 1, what was tested, the numbers, what is still weak).

| Folder | What is in it |
|---|---|
| `sheets/faces/` | **The face tests.** One sheet per picture that has a face (22): the picture, ours BEFORE the change, ours AFTER, DADE, and a zoom on the face with the numbers. |
| `sheets/by_category/` | One overview per kind of picture (15: colour / black and white / angled / small / painted faces, sculpture, cartoons, animals, nature, scenes, objects, text, emblems, line art, icons). Where this work changed nothing, one column "ours (unchanged by this work)" is shown. |
| `sheets/earlier18/` | The 18 pictures of the earlier test, redrawn on the cloth the tool chose (the first comparison drew every one on cream). |
| `real_page_tests/` | The real production page in headless Chromium (14 runs like a visitor: pictures of the Picture and Stitches steps, the DST each saved, `e2e_report.json`), a phone / undo / accessibility check, Firefox 160, and the memory check. |
| `stitch_files/` | The DST files the new code makes for all 73 pictures. Raw engine output; the page's own "Download DST" centres a design on the hoop. |
| `metrics/` | The numbers: `before_vs_after_*.txt`, `ours_vs_DADE_*.txt`, and every picture's metrics as JSON. |
| `inputs/` | The pictures that were tested (55 new from Wikimedia Commons, 18 earlier), `SOURCES.txt` with author, licence and link for each, `manifest.json`, `contact_sheet.png`. |
| `harness/` | The scripts that produced all of this, with their own README (they assume the session's scratch folder layout). |

How to read a sheet: left to right are the source picture, what the tool made BEFORE this work, what it makes NOW, and what DADE (png2dst.com) makes at the same physical size. DADE's file has no thread
colours, so each of its colour blocks is drawn in the picture's colour under its stitches. Everything is drawn on the cloth OUR tool chose for that picture (a dark backdrop makes it choose a dark
cloth). The numbers under each picture: stitches, thread cuts, threads; for faces, how well the face region matches the source (dE colour distance, corrL luminance correlation, tones, eye contrast).

Remember: **none of this was sewn.** It is how the stitch files look drawn, not how they sew.

Pictures are from Wikimedia Commons under free licences (public domain, CC0, CC BY, CC BY-SA); they are test inputs only, kept here with their credits, and are not for publishing as marketing without checking each licence.


**Round 3 (2026-11-15), lettering:** `round3 - lettering\` (README first): serif and heavy small fonts, lettering found in pictures, the advice, the look-alike fonts, 18 more fonts as a check. Round 2 is in `round2 - background, whites, lettering\`.

**Round 4 (2026-11-15), how DADE does fonts, and our lettering after copying it:** `round4 - how DADE does fonts\` (README first). `CURRENT_SYSTEM\` inside it is the state of typed lettering and of the fill as of round 4 (lettering inside pictures moved on again in round 5), weight-matched (nine fonts, caps 3 to 6 mm: 0.098 characters wrong before, 0.018 now, DADE 0.068; the stitched ink weighs 1.22 times the drawing, DADE 1.69); `INVESTIGATION_old_system_vs_DADE\` is how DADE sews lettering and the old system against it; `older_runs_not_current\` holds superseded intermediate runs, among them the first dense version that came out too heavy (1.55 times).

**Round 5 (2026-11-16), lettering inside pictures, and how DADE handles fonts (it has no font logic: it sews the pixels as they are, never cleaning them first):** `round5 - lettering in pictures traced finer` (README first). The edges of lettering in pictures were rough because of the tracer's own cleaning (gaps of 0.3 mm between 3 mm letters filled in, serifs widened, thin strokes lost), not the stitch engine; lettering found in a picture is now traced a second time with the cleaning relaxed for its own colour, short words (3 to 4 letters) in a plain logo now count as lettering, and a finer look finds lettering the first tracing had swallowed (the letters are kept as drawn, nothing is re-typed: why not is in the README). Characters wrong on 134 drawn pictures 0.110 before, **0.064** now, DADE 0.179 (serif faces 0.183 to 0.016, outlined letters 0.177 to 0.052); 18 other fonts as pictures 0.109 to 0.061 (DADE 0.069); short words 0.276 to 0.121; gradient, shadow and texture backgrounds 0.077 to 0.025; the same pictures as messy JPEGs 0.115 to 0.088; real pictures: 5 of 73 change, small real lettering (SDL tagline 2.8 mm) is still bold and ragged because of the thread. Not solved: brush-script and high-contrast serif fonts at 3 mm (Pacifico, Playfair), heavy condensed short words, and nothing was sewn on cloth.
