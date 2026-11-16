> **SUPERSEDED (2026-11-15, afternoon). Not the current system.** This is the FIRST dense-fill version, measured before the weight fix. Its stitched letters weigh **1.55 times** the drawn ones (3 mm caps 1.85 times; DADE 1.69), which is why it looked thick. The weight-matched system (1.22 times) is in `..\..\CURRENT_SYSTEM\README.md`. Kept for the record only.

# (Superseded) The first dense version: results measured on the code as it was at midday on 2026-11-15

Everything in this folder was produced AFTER the last change to the engine of that time, on the repository exactly as it is now (not committed, not pushed):
`app/lib/embroidery/stitch/engine.js` with `denseLetters` 1, `denseSpacing` 0.2, `denseInPictures` 1 (blocks of at least 5 letters, strokes at least 0.35 mm, at most 8 mm tall). The engine file was last changed at 12:31; the measurements, pictures and the page test below were all made after that.

* **old** = the same code with the new rule switched off (`denseLetters: 0`): the system as it was before today's change.
* **current** = the code as it is now.
* **DADE** = png2dst.com on the same test sheets (it is not our system; it is here as the yardstick).

Nothing was sewn on cloth. Every picture is a stitch file drawn by our own drawing routine; the numbers are the share of characters a text reader (OCR) gets wrong when it reads those drawings: lower is better. The reader is a proxy, not a person.

## The numbers

| characters wrong, caps 3 to 6 mm | old | **current** | DADE |
|---|---:|---:|---:|
| nine fonts of the page (96 texts) | 0.098 | **0.030** | 0.068 |
| by height 3 / 4 / 5 / 6 mm | 0.188 / 0.108 / 0.068 / 0.030 | **0.067 / 0.010 / 0.010 / 0.031** | 0.131 / 0.066 / 0.035 / 0.036 |
| eighteen other fonts (144 texts), not used to choose anything | 0.125 | **0.035** | 0.069 |
| by height 3 / 4 / 5 / 6 mm | 0.257 / 0.116 / 0.064 / 0.062 | **0.083 / 0.025 / 0.010 / 0.020** | 0.150 / 0.050 / 0.030 / 0.042 |
| Times bold / Impact | 0.175 / 0.269 | **0.016 / 0.151** | 0.051 / 0.565 |

Lettering inside drawn pictures (108 pictures of one line of text, 3 to 12 mm):

| | old | **current** | DADE |
|---|---:|---:|---:|
| all sizes | 0.176 | **0.120** | 0.121 |
| 3 / 4 / 5 / 6 / 8 mm | 0.385 / 0.225 / 0.124 / 0.054 / 0.069 | **0.266 / 0.173 / 0.020 / 0.010 / 0.052** | 0.168 / 0.105 / 0.057 / 0.040 / 0.128 |
| 12 mm | 0.197 | 0.197 | 0.229 |

Real pictures: of 73, **4 change** (in their lettering only): the flag of Washington Island 8,820 to 9,067 stitches, the SDL logo 3,323 to 3,647, the city seal 13,669 to 15,114, the crest 13,683 to 14,330. The other 69 are stitch for stitch what they were, and so are the two sign photographs. The chart picture of the lettering bench goes 8,321 to 10,235 stitches. The crest's crown is unchanged (the finder wrongly takes a few thin black outlines for letters; the fill is not applied to them).

The real page: the production build was rebuilt on this code and driven in headless Chromium: **23 of 23 checks passed** (`real_page_tests\`). Self-tests: digitizer 144, stitch engine all, trace 195, file formats 1000, eslint clean (these print in the terminal and are not saved as files).

## What the numbers do not show, said plainly

* **Where current is not better than DADE:** lettering inside a picture at 3 and 4 mm (0.266 and 0.173 against 0.168 and 0.105) and a serif face in a picture (0.308 against 0.046: the tracer loses the serifs before the engine sees them). Typed 6 mm is level (0.031 against 0.036).
* **Weak, and the reader cannot judge them well:** white letters on a dark badge (18 pictures) read 0.114 to 0.133 at one margin round the text and 0.165 to 0.124 averaged over three margins; outlined letters (8 pictures) read 0.162 to 0.162 and 0.160 to 0.203, yet the two outlined pictures it reads worse are visibly bolder and cleaner now (`pictures\drawn_outline_*`). Treat these two groups as unproven by the numbers.
* **Still hard:** 3 mm high-contrast serifs and scripts (Playfair 0.155, Dancing Script 0.119), Impact under 5 mm (0.151).
* **Nothing has been sewn.** The fill is twice the usual density (rows 0.2 mm apart, like DADE's). If a real sew-out shows stiff letters, `denseSpacing` 0.25 is the next step (0.034 on the nine fonts, 0.044 on the eighteen).

## Files

| | |
|---|---|
| `numbers\1_*`, `1b_*` | Nine fonts: old against current, with the sizes and every font; then DADE against current. `typed_nine_fonts_cell_by_cell_old_vs_current.csv` has every text. |
| `numbers\2_*`, `2b_*` | The same for the eighteen other fonts. |
| `numbers\3_*` | The drawn pictures: columns picture (the picture itself read, the ceiling), old, DADE, current. `3b_*` is the steadier three-margin reading of the badge and outline groups. |
| `numbers\4_*` | The 73 real pictures and the 7 of the lettering bench, old rules against current. |
| `pictures\letters_*` | Four sheets of letters: drawn, old, current, DADE, with what the reader made of each. |
| `pictures\real_*` | Real pictures: the picture, old, current (SDL tagline, the flag's "Island, Wi.", the crest, the seal, the chart, the crest's crown). |
| `pictures\drawn_outline_*` | The two outlined pictures the reader scores worse, old against current. |
| `real_page_tests\` | The real page in Chromium: `report.json` (23 checks), the stitch pictures and DST files of four pictures. |

The older versions of these results (made at intermediate settings, for example 0.25 mm spacing) are in `..\older_runs_not_current\`; the investigation of DADE (old system against DADE, scratch experiments, DADE's own screens, the sheets sent to it) is in `..\INVESTIGATION_old_system_vs_DADE\`; the scripts are in `..\harness\`.
