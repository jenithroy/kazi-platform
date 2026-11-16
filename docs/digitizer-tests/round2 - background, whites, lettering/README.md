# Round 2 (2026-11-14): background switch, eye whites and teeth, serif and small lettering

You said: unticking "Leave out the background" must leave out NOTHING; the eyeballs and white things like teeth are not detected well, "it treats it as background and cuts it out"; and what about the serif fonts. Nothing here has been sewn on a real machine: everything is judged on screen against the source pictures. Nothing is committed or pushed.

## 1. Background switch (folder `1_background_off`)

**What was wrong.** Unticking the box only stopped the *tracer* from calling the page "background". The converter still left out every colour that looked like the cloth (white on the default cream), so a logo's white page, the white inside letters and pale parts of a picture were still missing: leaving the background out by another door.

**Fix.** With the box unticked the whole picture is stitched, white included, for every kind of picture (logo, artwork, photo); a frame round the picture is kept; the person finder is not asked.

**Result (same pictures, old code on the left of each row, new on the right):** the Nike swoosh was 1 thread / 1,183 stitches and is now 2 threads / 4,410 (the swoosh and its white page); the Torrance seal 1 thread / 13,669 stitches is now 3 threads / 35,013; the Manzanares crest 5 to 7 threads; the senator portrait 4 to 5. Sheets: `bgnone_reg18.png`, `bgnone_new55.png` (old, new). Real page: `nike_background_left_out_stitches.png` against `nike_background_off_stitches.png` (1,041 stitches against 3,818 in the browser).
Note: white thread on the default cream cloth is hard to see on screen. That is the cloth, not a bug; set the garment colour to see it.

## 2. Eye whites and teeth (folder `2_eye_whites_and_teeth`)

**What was wrong, found by measuring (not what I first guessed).** The person model does not call the teeth or the whites of the eyes "background" on photographs: on every real portrait of the test set it says face skin. The real fault: the colours of a face are found from flat patches, and an eye white or a row of teeth is never a flat patch (a few blurred pixels between lid and lip), so **no white thread was ever made**: the NASA portrait's smile had no teeth at all, the teeth came out the colour of the lips and the eye whites a dark disc in skin. In the render the bright part of the teeth sat at lightness 37 where the source had 49, the eye whites at 34 where the source had 55.

**Fix.** The face finder's landmarks say where the eyes and the open mouth are; the white is measured there on the picture itself (eye white: outside the iris, inside the eye outline; teeth: inside an open mouth) and kept as a thread of its own, exactly as measured, only inside those two zones (so a shine on a lip or a brow is not turned white). If the mouth is shut, the teeth are yellow/brown, or the eye white is no different from the skin, nothing is added. A safeguard also takes back from the background anything the finder calls background inside an eye or an open mouth.

**What to look at:** `final_before_after_A.png` first (boy of Madagascar, NASA smile, the man with the gap teeth, the woman with glasses), then B and C (C is paintings and a sculpture: they should NOT change, and they do not). Left column is the source, middle the code before this round, right the code now. `0_before_the_fix_*` are the earlier close-ups that showed the problem.
**Numbers (26 faces):** 10 faces change (the ones with a measurable white); face colour error 8.33 to 8.34; face luminance correlation 0.943 to 0.943; eye contrast 0.904 to 0.904; eye structure correlation 0.704 to 0.691 (three faces: the elder, the woman behind glasses and the girl with shaded eyes; their eyes are closed or behind glass, so that metric is noise there). `metrics_*` hold the per-picture lines; `whites_measured_per_picture.csv` says what was measured for each picture.
**Limits you should know:** a face only 17 mm wide on the cloth (the NASA portrait at its default size) has eyes 3 mm wide, so the whites are slivers; "Crop to the face" helps. A mouth open by a millimetre shows a strip of white a millimetre high: that is all the landmarks say there is. Black-and-white portraits are read as artwork (the senator), so they are still not sent through the face finder.

## 3. Typed lettering, serif first (folder `3_typed_lettering`)

**Bench.** 168 typed texts: nine fonts (this machine's Arial, Georgia, Times New Roman, Comic Sans, Segoe Script ...), caps 3, 4, 5, 6, 8, 10, 15 mm, two strings, through the page's own text path, a render at 8 px/mm with a 0.45 mm thread, overlap with the glyph measured with a 0.125 mm tolerance. Plus 26 crops of lettering in real pictures (not changed by this round).

**What was wrong (all three seen on `base_before/times_small.png`).** (1) Serif hairlines and feet (0.15 to 0.3 mm at 4 mm caps) are thinner than the engine's 0.4 mm satin limit, so they were dropped: Times bold at 4 to 6 mm came out as "AYE MAKIA" and "\\ E MARIA". (2) The line-or-satin choice was made letter by letter, so one word changed weight inside itself: AVE as thin lines, MARIA as fat zigzag satin, because one letter's strokes are 0.57 mm and the next's 0.6. (3) Small heavy letters fatten under satin and close their counters.

**Fix.** Per text, by how wide its strokes are typically: up to 0.7 mm all lines from end to end (every letter up to 0.9 mm is one line), heavier all satin with the hairlines and serifs widened to 0.4 mm so they are sewn. The stored letters are never changed.

**Result (`scorecard_before_vs_after.md`):** texts that mix lines and satin 40 to 22; letters that break into pieces 15 to 0; texts that lose a counter of 0.5 mm or more 49 to 47; thread ink over the letter's own ink 1.19 to 1.15; precision 0.896 to 0.903; mean overlap with the glyph 0.863 to 0.861 (the serif and Times faces at 3 to 6 mm: 0.82 to 0.805, because the widened hairlines are heavier than the drawing; they are all there now). Sheets: `base_before/*.png` against `after/*.png` (top row of every sheet is the glyph, below it the stitches). Real page: `real_page_*.png`.
**What did not work and was dropped:** widening every strip under 0.5 mm in every text (the regular faces turned to fat satin: overlap 0.863 to 0.809); a 0.8 mm line limit (Arial Black at 3 mm turned to thin lines).
**Still weak:** 3 mm serif capitals are unreadable whatever the stitch; heavy faces at 5 to 6 mm are fat satin zigzag in the render; lettering inside a picture (the crest, the school sign: 0.74) goes through the picture path and was not touched in this round. The bench's fonts are this Windows machine's; a Mac customer gets other glyphs and another script font.

## 4. Real page (folder `4_real_page_tests`)

The production build of the site (HEAD plus only my digitizer files, in an isolated copy; your working tree and `out` folder were not touched) in headless Chromium, `report.json`: 12 of 14 checks pass and the other 2 are MediaPipe's "Created TensorFlow Lite XNNPACK delegate" info line counted as an error by my check (not an error). The logo switch, two portraits through the real worker (the palettes include the measured whites: "Ivory" and "Light grey" for the NASA portrait, "Silver" for the boy), four typed texts, and DST files written.

## Tests and code
Self-tests: trace 176 checks, digitizer 112, stitch all, formats 1000; eslint clean on every file I changed. The harness (replay, metrics, close-ups, the real-page script, the lettering bench) is in `5_harness` (scripts only; it needs the cached pictures and model outputs that stay in the session's temp folder, so it is a record of the method, not a one-click rerun). Docs updated: `docs/digitizer.md` (5.3, 5.8, 7.2, 9, 10, 12) and `app/lib/embroidery/README.md`.
Files changed by me: `lib/digitizer/{faces,faceFinder,convert,segment,segment.worker,segmentClient,selftest}`, `lib/embroidery/{geometry/thin,stitch/engine,trace/fine,trace/index,trace/regionPalette,trace/regions,trace/selftest}`, `components/Digitizer/{PicturePanel,InspectorPanel,useDigitizer}`, `public/mediapipe/{NOTICE.txt,face_landmarker.task}`, docs. The files of the orders/Create work in the same tree were not touched.

## Open
- Commit and push (a push to main publishes it to kazimanufacturing.com): not done; say whether, and whether to put it on a branch first.
- The face model's licence text could not be read (NOTICE.txt says so).
- The cookies page does not list the digitizer's browser-storage keys (carried over).
