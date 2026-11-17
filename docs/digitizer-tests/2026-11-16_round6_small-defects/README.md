# Round 6 (2026-11-16, from about 16:10): small defects in lettering

Goal: parts of letters that are not sewn, and stitches where there should be none. No comparison with DADE in this round.
The list of every round, in the order they were run, is `../00_ALL_TESTS_START_HERE/INDEX.md`.

## Folders

| Folder | What it is |
|---|---|
| `bench/draw.mjs` | Draws the 54 test pictures (9 fonts x caps 3, 4, 6 mm x "AVE MARIA" and "Hamburgefonts 2026") with headless Chromium into `bench/inputs/`. |
| `bench/run.mjs` | Sews every picture with the current engine and measures it against the picture. `node --no-warnings run.mjs --label <what> [--engine '{"denseTrim":0.25}'] [--only regex]` |
| `bench/real.mjs` | Sews the 73 real pictures of `../inputs/` with any copy of the engine (`--lib <app/lib>`), writing stitch counts and a fingerprint of each stitch file, to compare two versions of the engine. |
| `runs/<date>_<time>_<what>/` | One folder per run. **The newest date and time is the newest result.** `summary.txt` first, then `compare/<picture>.png`. |

## How to read a `compare/` picture (top to bottom)

1. the picture that was fed in
2. what the engine sewed
3. the difference. **Red** = ink of the picture that the engine had a shape for but did not sew (within 0.125 mm). **Orange** = ink the tracer lost before the engine saw it. **Blue** = stitches with no ink of the picture within 0.125 mm (the thread's overhang is a thin blue rim and cannot be avoided: a thread is 0.45 mm wide). **Cyan** = the same, where the tracer's shape was already fatter than the picture. Grey = right.

`MISSING` and `EXTRA` in the summaries are those as a share of the picture's ink and of the stitched ink.

## Runs, in order

| Run | Result |
|---|---|
| `2026-11-16_1639_baseline-before-any-fix` | The engine as it was after round 5: **missing 0.37 %, extra 2.78 %** (3 mm 4.74 %, 4 mm 2.62 %, 6 mm 1.0 %). 0.36 of the 0.37 was the engine not sewing a shape it was given (the tracer lost almost nothing). All of the extra was a thin rim along the edges (no fat blobs: no filled counters, bridges or stray stitches), 2.16 of the 2.78 from the engine, the rest from the tracer's shape. Worst: serif fonts (extra 7.7 %, 13 % for "AVE MARIA" at 3 mm: hairline serifs are thinner than the thread), typewriter at 3 mm (missing 1.75 %: **the stem of the I was not sewn at all**), a cursive word at 6 mm (missing 1.4 %). |
| `2026-11-16_1616_settings-tried-none-better` | Four settings tried (`denseTrim` 0.25 and 0.3, with `denseCore` 0.15, `denseSpacing` 0.25): taking the strokes in further lowers extra ink a little and raises missing ink two to three times. Nothing was changed on that account. |
| `2026-11-16_1701_after-fix-stem-and-notches` | After the three changes below: **missing 0.25 %, extra 2.93 %** (3 mm 0.26 / 5.03, 4 mm 0.29 / 2.70, 6 mm 0.21 / 1.06). |

## What was changed in the engine (all for lettering sewn with the dense fill, and the rescue also for lettering found in pictures)

1. **The stem of an I, l, T, i... was not sewn** (`stitch/fill.js` `rowPhases`, `engine.js` `densePhases`). The rows of a fill sit in the middle of equal strips, so for a symmetric letter they fall symmetrically, and the stem of the I (taken in to 0.2 mm, the row spacing) lay exactly between two rows at 7.3975 and 7.6025 mm: no row crossed it. Now, when at least 0.5 mm of stroke is missed by the rows in the middle (counted at the lines half way between two rows), the row grid is tried shifted and the shift that misses least is taken if it misses at most half as much. Effect on the bench: one picture changed (typewriter "AVE MARIA" at 3 mm: missing 1.75 % to 0), the other 53 are stitch for stitch what they were.
2. **Notches at junctions and necks** (`stitch/rescue.js`, `engine.js` `denseRescue*`). After the rows are laid, any part of the drawn letter (0.08 mm in from its edge) that is further than 0.2 mm from every stitch, in a piece of 0.06 mm2 or more, gets the drawn shape put back round it (grown by 0.06 mm) and the rows are laid again; the new rows are kept only when they leave less of the letter bare (counted with a stricter reach of 0.125 mm, rim and hairlines included), at most twice. The same rows, so no extra thread, tie stitch or jump. Examples: plain "Hamburgefonts 2026" at 3 mm 0.81 % to 0, round 0.81 to 0.30, serif 3 mm 1.07 to 0.62.
3. **The same for a connected script** (`denseRescueLetters`): a cursive word is one piece, never has five letters to its block, so it is not sewn dense; its thin necks were dropped by the plain fill's 0.3 mm shortest row piece. Cursive at 6 mm: missing 1.4 % to 0.71 %.

Also seen, not changed: the extra ink is the thread (a 0.45 mm thread on a 0.2 mm serif hairline always overhangs), so it cannot be made smaller by any setting without losing strokes, and the rescue adds a little of it where it brings a thin stroke back (extra 2.78 % to 2.93 %, mostly the serif fonts).

## Where the extra ink comes from (2026-11-16 17:21; `bench/run.mjs` now splits it and takes `--thread`)

* **It is not the edge detection.** The tracer lost 0.01 % of the ink, and its shapes are already fatter than the picture by only 0.63 of the 2.93 points of extra ink (about a fifth). Round 5 measured the traced edge as 0.012 mm out on average; after stitching it is about 0.09 mm out. The loss is in the stitching: a thread is 0.4 mm wide and a row ends where it ends.
* **The thread width is not the problem.** The old docs assumed real thread is about 0.40 mm and that the preview (0.45 mm) looks about 18 % fatter. The owner has confirmed (2026-11-16) that the embroidery from the machine looks exactly like the site's preview, so 0.45 mm is the right width to measure with and the figures above are the real ones. For the record, the same stitches drawn 0.40 mm wide would measure extra 2.18 %, missing 0.37 % (`runs/2026-11-16_1721_what-if-thread-0.40mm-extra-ink-by-stroke-width`): a what-if, not what the machine makes.
* **By the width of the stroke it lies next to** (thread drawn 0.45 mm): hairlines under 0.25 mm 23 % of the extra ink (unavoidable: ink cannot be thinner than a thread); strokes 0.25 to 0.45 mm 27 % (partly avoidable: two rows where one would do); 0.45 to 0.7 mm 28 % and 0.7 mm and more 22 % (avoidable in principle: a rim at the edge or the row ends).
* **What this bench cannot see: thread bridges.** The jumps the planner leaves uncut (up to `trimOver` 3 mm) are not in the picture of the stitches (the page hides them unless "Show jumps" is on). "Hamburgefonts 2026" has 36 of them at 3 mm sans (55 mm of thread in all, longest 2.5 mm), 25 at 4 mm and 11 at 6 mm (where it trims more); serif 3 mm 39, 4 mm 47. On cloth these are threads lying between the letters until they are cut.

## Check on the 73 real pictures (`bench/real.mjs`, `bench/compare_real.mjs`, 2026-11-16 17:xx)

Sewn with the engine as it was in git (`HEAD`) and with the changed one, each picture fitted into 1000 x 1000 px, people off: **67 of 73 are stitch for stitch the same.** Six changed, all with lettering in them, by 4 to 90 stitches (at most 0.8 %), trims by at most 2: Mexican coat of arms +33, Washington Island flag +17, SDL logo +4, Torrance seal +20, woodcut frog print +90, Nepal emblem +32. None failed. The engine's own checks pass: the stitch checks, the digitizer's 152, the file formats' 1000.

## Limits of this bench

* This computer has no Windows fonts, so Georgia, Times New Roman and Segoe Script are replaced by look-alikes (serif and Times come out identical, sans and humanist too). The faults are the same kinds, but not the same letters as on the Windows screenshots.
* There is no text reader (OCR) installed here, so legibility is not measured the way rounds 3 to 5 did. Missing and extra ink are a different yardstick, and a 1 pixel (0.125 mm) rim along a long edge counts as missing or extra, so changes under about 0.1 point are noise.
* Nothing has been sewn on cloth.
