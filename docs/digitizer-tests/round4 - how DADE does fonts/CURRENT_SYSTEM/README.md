# The CURRENT system: results measured on the code as it is now (2026-11-15, weight-matched version)

Everything in this folder was produced on the repository exactly as it is now (not committed, not pushed): `app/lib/embroidery/stitch/engine.js` with `denseLetters` 1, `denseSpacing` 0.2, `denseInPictures` 1 and, new in this round, `denseWeight` 1 (`lightenThick` in `app/lib/embroidery/geometry/thin.js`).

Four versions of the same code appear in the tables and the pictures, always in this order:

* **old** = the same code with the new lettering rule switched off (`denseLetters` 0): the system as it was before the comparison with DADE.
* **previous** = the first version of the dense fill (rows right up to the edge of every letter), the one that came out **too heavy**. Replaced; kept here so the difference can be seen.
* **current** = the code as it is now.
* **DADE** = png2dst.com on the same test sheets. It is not our system; it is the yardstick.

Nothing was sewn on cloth. Every picture is a stitch file drawn by our own drawing routine (a thread drawn 0.45 mm wide, real thread is about 0.4); the reader numbers are the share of characters a text reader (OCR) gets wrong on those drawings, so lower is better. The reader is a proxy, not a person.

## 1. "It makes all the fonts really thick and heavy compared with the original": yes, measured, and fixed

I measured how heavy the stitched letters are against the letters that were drawn: the area of the stitched ink divided by the area of the glyph (**1.00 = exactly as drawn**, 1.5 = half as heavy again). The text reader cannot see this, because a heavy letter is still easy to read, which is why the first round missed it.

| stitched ink against the drawing (1.00 = as drawn) | old | previous (too heavy) | **current** | DADE |
|---|---:|---:|---:|---:|
| nine fonts, caps 3 to 6 mm (94 texts) | 0.95 | 1.55 | **1.22** | 1.69 |
| 3 / 4 / 5 / 6 mm | 1.02 / 0.85 / 0.90 / 1.02 | 1.85 / 1.59 / 1.43 / 1.30 | **1.42 / 1.21 / 1.12 / 1.10** | 1.89 / 1.73 / 1.60 / 1.52 |
| eighteen other fonts (140 texts) | 0.90 | 1.48 | **1.16** | 1.64 |
| letters inside drawn pictures (108 pictures) | 1.11 | 1.43 | **1.15** | |
| typed 8 mm (taller than that nothing was changed) | 1.09 | 1.22 | **1.14** | |

Why it happened: a thread is about 0.45 mm wide, so rows that run right up to the edge of a stroke put half a thread past the edge on each side. DADE does the same, which is why it is even heavier (1.69).

What was done: the rows of a letter are now laid in the letter **taken in a little where it is thick**, by up to 0.2 mm on each side and never to less than about 0.3 mm wide, so a 1.2 mm stem becomes 0.8 mm, a 0.6 mm stroke 0.3 mm; thin strokes and serifs are not touched. The stored letter and the drawing are not changed, only where the rows go. `denseWeight` 0 gives the previous (heavy) behaviour back.

What cannot be fixed by the rule: **at 3 mm a stroke is about as wide as the thread**, so 3 mm lettering stays about 1.4 times as heavy whatever the fill does (Times 1.48, Georgia 1.38, Dancing Script 1.63; the plain heavy faces like Archivo Black, Anton and Oswald come out at 1.01). From 4 mm up it is within about 10 to 20 % of the drawing.

**Look at `pictures\letters_0_weight_plain_sans_...png`** first: for each text it shows the drawn letters, old, previous, current and DADE, with what the reader made of each. The previous version and DADE are visibly bold next to the drawn letters; the current one is close to them (4 and 5 mm almost the same; 3 mm still a little bolder).

## 2. Can it still be read? (text reader, characters wrong, caps 3 to 6 mm, lower is better)

| | old | previous | **current** | DADE |
|---|---:|---:|---:|---:|
| nine fonts of the page (96 texts) | 0.098 | 0.030 | **0.018** | 0.068 |
| by height 3 / 4 / 5 / 6 mm | 0.188 / 0.108 / 0.068 / 0.030 | 0.067 / 0.010 / 0.010 / 0.031 | **0.056 / 0.010 / 0.005 / 0.000** | 0.131 / 0.066 / 0.035 / 0.036 |
| eighteen other fonts (144 texts), not used to choose anything | 0.125 | 0.035 | **0.043** | 0.069 |
| by height 3 / 4 / 5 / 6 mm | 0.257 / 0.116 / 0.064 / 0.062 | 0.083 / 0.025 / 0.010 / 0.020 | **0.091 / 0.042 / 0.007 / 0.031** | 0.150 / 0.050 / 0.030 / 0.042 |
| Times bold / Impact (nine fonts) | 0.175 / 0.269 | | **0.000 / 0.137** | 0.051 / 0.565 |

Matching the weight cost the reader a little on the eighteen other fonts (0.035 to 0.043) and helped on the nine (0.030 to 0.018); against the old rules and DADE both are still clearly better. Taller typed text (8 mm: 0.124 to 0.087; 10 mm: unchanged, 0.041 and 0.039) follows the older rules above 8 mm.

## 3. Lettering inside drawn pictures (134 pictures; the first column is the picture itself read: the ceiling)

| characters wrong | picture | old | DADE | previous | **current** |
|---|---:|---:|---:|---:|---:|
| all 134 | 0.101 | 0.167 | 0.179 | 0.124 | **0.110** |
| one line of text (108) | 0.087 | 0.176 | 0.121 | 0.120 | **0.109** |
| caps 3 / 4 / 5 / 6 / 8 mm | 0.000 / 0.072 / 0.010 / 0.065 / 0.114 | 0.385 / 0.225 / 0.124 / 0.054 / 0.069 | 0.168 / 0.105 / 0.057 / 0.040 / 0.128 | 0.266 / 0.173 / 0.020 / 0.010 / 0.052 | **0.237 / 0.132 / 0.024 / 0.017 / 0.049** |
| serif face, 3 to 6 mm | 0.250 | 0.390 | 0.046 | 0.308 | **0.183** |
| sans / script / mono, 3 to 6 mm | | 0.075 / 0.126 / 0.198 | 0.015 / 0.051 / 0.046 | 0.016 / 0.015 / 0.061 | **0.038 / 0.074 / 0.029** |

`numbers\3_*` has every row. White letters on a dark badge (18 pictures) read 0.114 to 0.084 at one margin and 0.165 to 0.103 averaged over three margins; outlined letters (8 pictures) 0.162 to 0.177 and 0.160 to 0.162. The reader is not reliable on those two small groups (it misreads the outline and the badge itself), so treat them as "no clear change"; `pictures\drawn_outline_*` shows the two outlined pictures, where the current letters are lighter and closer to the drawn ones than the previous version's.

## 4. Real pictures (73 Wikimedia and other real pictures, plus the chart of the lettering bench)

**69 of the 73 are stitch for stitch what the old rules gave, the two sign photographs (no lettering is found in them) included.** The four with lettering change: the flag of Washington Island 8,820 to **8,962** stitches, the SDL logo 3,323 to **3,495**, the city seal 13,669 to **14,852**, the crest 13,683 to **14,126**. The chart (not one of the 73) goes 8,321 to 9,616. The crest's crown is unchanged. `pictures\real_*` show the picture, old, previous and current side by side (SDL tagline, the flag's "Island, Wi.", the crest, the seal, the chart, the crown).

## 5. The real page

The production build was rebuilt on this code and driven in headless Chromium: **23 of 23 checks passed** (`real_page_tests\`: `report.json`, stitch pictures and DST files of four pictures). Self-tests: digitizer 149 (new checks for the weight rule: a 1.2 mm stem ends 0.8 mm wide, a 0.6 mm stroke 0.3 mm, a hairline is untouched, a serif foot stays), stitch engine all passed, trace 195, file formats 1000, eslint clean (these print in the terminal and are not saved as files).

## 6. What the numbers do not show, said plainly

* **3 mm stays heavy and a little ragged.** 1.4 times the drawing is the thread, not the rule. In `pictures\letters_4_3mm_cells_...png` the 3 mm script and Times now read perfectly and are much closer to the drawn weight than the previous version; the E of the 3 mm typewriter "AVE" is misread as a T ("AVT MA.RIA", 0.125, where the previous version read it right).
* **Where DADE is still better than current:** Open Sans (0.016 against 0.101, where 0.75 of one cell is the reader returning the two words in the other order), Playfair (0.115 against 0.148), a character or two on Baskerville, Lora and Roboto Slab; and lettering inside a picture at 3 and 4 mm (0.168 and 0.105 against 0.237 and 0.132), and for sans, script, Times, rounded and serif faces inside a picture (serif 0.046 against 0.183: the tracer loses the serifs before the engine sees the letters).
* **Real small lettering is still ragged.** The SDL tagline ("Simple Directmedia Layer") is less clogged than the previous version and its letters are separate again, but it is not clean; the picture is in `pictures\real_SDL_...png`.
* **Hardest cases:** 3 mm high-contrast serifs and scripts (Playfair 0.148, Dancing Script 0.166), Impact (0.137).
* **Nothing has been sewn.** The fill is twice the usual density (rows 0.2 mm apart, like DADE's). If a sew-out shows stiff letters, `denseSpacing` 0.25 is the next step (measured before the weight rule: 0.034 on the nine fonts, 0.044 on the eighteen). Generation takes a little longer for dense text (0.25 to 0.4 s for 18 letters, against 0.1 s before).

## 7. About "the middle image"

In the comparison pictures the **left (top) one is the source picture**, the **middle one is the OLD system** (this same code with the new lettering rule switched off: `denseLetters` 0), and the **right (last) one is the current code**. It is not fine details on and off, and nothing in it is a different setting of the page. In this round `pictures\real_*` and `pictures\drawn_outline_*` have a fourth image, the **previous** (too heavy) version, between old and current; the `letters_*` sheets are rows: drawn, old, previous, current, DADE.

## Files

| | |
|---|---|
| `numbers\0_*` | The raw log of the full re-measure (`final_fin.log`). |
| `numbers\1_*`, `1b_*`, `1c_*` | Nine fonts: old against current, DADE against current, previous against current. `typed_nine_fonts_cell_by_cell_old_vs_current.csv` has every text. |
| `numbers\2_*`, `2b_*`, `2c_*` | The same for the eighteen other fonts. |
| `numbers\3_*` | The drawn pictures, columns picture, old, DADE, previous, current. `3b_*` is the steadier three-margin reading of the badge and outline groups. |
| `numbers\4_*` | The 73 real pictures and the 7 of the lettering bench, old rules against current. |
| `numbers\5_*`, `5b_*`, `6_*`, `7_*` | **How heavy the stitched letters are** (1.00 = as drawn): nine fonts, typed 3 to 15 mm, eighteen fonts, letters in pictures. `weight_typed_cell_by_cell.csv` has every text. |
| `pictures\letters_*` | Five sheets of letters: drawn, old, previous, current, DADE, with what the reader made of each (`letters_0_*` is the weight sheet). |
| `pictures\real_*` | Real pictures: the picture, old, previous, current. |
| `pictures\drawn_outline_*` | The two outlined pictures the reader scores worse, old, previous, current. |
| `real_page_tests\` | The real page in Chromium: `report.json` (23 checks), the stitch pictures and DST files of four pictures. |

The earlier versions of these results (made before the weight rule, or at 0.25 mm spacing) are in `..\older_runs_not_current\`; the investigation of DADE (old system against DADE, scratch experiments, DADE's own screens, the sheets sent to it) is in `..\INVESTIGATION_old_system_vs_DADE\`; the scripts are in `..\harness\`.
