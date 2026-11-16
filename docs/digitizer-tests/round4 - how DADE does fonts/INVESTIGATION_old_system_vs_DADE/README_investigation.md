# Round 4: how DADE (png2dst.com) does fonts (2026-11-15)

You said DADE does fonts perfectly and asked me to look at how, and then to make ours like DADE's. **Nothing here was sewn on cloth.** Every picture is a stitch file drawn by the same code (our own drawing routine, 0.45 mm threads), and the numbers come from a text reader (OCR) reading those drawings back: the share of letters it gets wrong, lower is better.

> **This folder is the INVESTIGATION: the OLD system against DADE, and scratch experiments. It is NOT the current system.** The current system (our lettering after the change, 2026-11-15) is measured in the folder CURRENT_SYSTEM, one level up (..\CURRENT_SYSTEM\); earlier versions of those results, from runs at intermediate settings, are kept in ..\older_runs_not_current\.
>
> The change itself, in one line: small lettering is now a plain fill with rows 0.2 mm apart run right up to the edge of each letter (our small-piece rule used to stop them 0.07 to 0.15 mm inside it, which erased thin strokes). Before it, ours read 0.098 characters wrong on nine fonts against DADE's 0.068; now 0.030.

## Start here (the investigation)

1. `boards\1_serif_faces_small_ours_vs_DADE.png`: Times and Georgia at 3 to 4 mm. Each block: the drawn letters, ours, DADE. Ours looks like handwriting; DADE looks like a bold copy of the font.
2. `boards\4_lettering_in_pictures_ours_vs_DADE.png`: the same in logo-style pictures (your SDL and Washington Island example is the same effect).
3. `boards\3_heavy_condensed_faces_ours_vs_DADE.png` and `boards\5_badges_and_heavy_in_pictures_ours_vs_DADE.png`: where DADE is worse than ours.
4. `dade_inspector\`: DADE's own screens: what it chose for a letter, its settings, and its stitch path drawn over the letters.

## What DADE does (read from its editor and from its DST files)

DADE does **not** detect fonts or letters. It finds "islands" (connected areas of one colour) and gives every island the same treatment, a plain fill ("Tatami Fill"):

| | DADE (defaults) | ours |
|---|---|---|
| row spacing | 0.20 mm | 0.40 mm |
| stitch length | 3.0 mm | 3.5 mm |
| underlay | none | automatic |
| pull compensation | none | 0.2 mm |
| angle | one per island (18, 83 and 175 degrees on three letters) | 45 degrees |
| shortest piece it keeps | no limit | row pieces under 0.3 mm dropped, stitches under 0.9 mm at a row end dropped |
| thin strokes | filled like everything else | single lines (small light text) or satin |
| trims | none by default (118 jumps on a sheet of text) | planned |

Other settings: 1 pixel is 0.1 mm, PNG only up to 1024 px, 4 to 5 colours on the free plan, smoothing 75 %, islands under 50 px (0.5 mm²) are dropped (a setting; nothing in my test texts was that small). The result is dense and crisp: every part of every stroke is covered, edges are exact, and hairlines and serifs survive as strings of tiny stitches. **In its 3 mm text 67 % of the stitches are shorter than 0.4 mm** (57 % at 4 mm, 50 % at 5 mm, 45 % at 6 mm). Its flaws: long travel stitches across the gaps of M, E and R; heavy faces fill in (counters close).

## The numbers (same letters, same drawing, same reader; share of characters wrong)

Typed text, caps 3 to 6 mm, 94 of 96 texts (two were wider than DADE's 1024 px limit):

| | ours | DADE |
|---|---:|---:|
| nine fonts of the page, all | 0.098 | **0.068** |
| 3 mm / 4 mm / 5 mm / 6 mm | 0.188 / 0.108 / 0.068 / **0.022** | **0.131 / 0.066 / 0.035** / 0.036 |
| Times | 0.175 | 0.051 |
| Georgia | 0.090 | 0.038 |
| script, mono, sans, round | 0.084, 0.091, 0.037, 0.038 | 0.017, 0.023, 0.000, 0.015 |
| Impact (heavy condensed) | **0.269** | 0.565 |
| eighteen other fonts (140 of 144 texts) | 0.126 | **0.069** |
| Playfair, Baskerville, Lora | 0.398, 0.183, 0.145 | 0.115, 0.000, 0.000 |
| Anton, Archivo Black, Bebas | **0.097, 0.042, 0.045** | 0.214, 0.107, 0.107 |

Lettering in pictures (100 x 24 mm logo-style pictures, 126 of line and badge kinds; the picture itself reads 0.087 / 0.170):

| | ours | DADE |
|---|---:|---:|
| one line of text, all sizes | 0.176 | **0.121** |
| caps 3 / 4 / 5 / 6 / 8 / 12 mm | 0.385 / 0.225 / 0.124 / 0.054 / **0.069 / 0.197** | **0.168 / 0.105 / 0.057 / 0.040** / 0.128 / 0.229 |
| serif, sans, round (3 to 6 mm) | 0.390, 0.075, 0.120 | 0.046, 0.015, 0.000 |
| heavy condensed (3 to 6 mm) | **0.444** | 0.565 |
| white letters on a dark badge | **0.114** | 0.178 |

Outline-style pictures (letters with a thin outline on a coloured background) could not be compared: DADE leaves the background colour out and my alignment of its file to the picture fails there.

So you are right for light, regular and serif faces up to about 5 mm, in typed text and in pictures. You are not right for heavy condensed faces, for big letters, or for white-on-dark.

## Why ours is worse at small sizes (tested, not guessed)

1. Small light text is sewn as single lines, which keeps the skeleton of the letters and loses their weight and serifs ("AYE MARLA" for AVE MARIA).
2. Our fill throws away short pieces. I put DADE's settings (dense rows, no underlay, no pull compensation) into our fill and changed nothing else: **0.319, much worse than now** (the letters nearly vanish; board 6). With the short-piece limits removed in a scratch copy: 0.110, and on sans, humanist, round, script, mono and black faces it matches DADE to within 0.02 (Impact 0.136 against DADE's 0.565; the serif faces stay poor: Times 0.19 to 0.46, Georgia 0.12 to 0.29). Adding our own thin-stroke widening and using the fill for all small text: 0.094 overall and **better than DADE at 4, 5 and 6 mm (0.050, 0.015, 0.011 against 0.066, 0.035, 0.036)**, but at 3 mm 0.291 against 0.131: the letters break into dots (board 7). Widening more (0.6, 0.8 mm) was worse (0.137, 0.222). In pictures, the same "everything dense fill" in a scratch copy: badges 0.114 to 0.059, outline pictures 0.162 to 0.052, lines 0.176 to 0.134, but 3 mm lines stay at 0.359 against DADE's 0.168.
3. **(Corrected later the same day, see the update at the top: those experiments still had our small-piece inset, which was the real cause. With the rows let run to the edge, a floor of 0.3 mm on the stitch length scores 0.042, as good as without one. The text below is what I believed at the time.)** **The whole gain depends on stitches shorter than 0.3 mm.** The same experiment with a floor of 0.3 mm on the piece length (row pieces 0.15 mm) scores **0.274, three times worse than what we have**. DADE's perfect small lettering is a drawing of two-thirds micro-stitches at twice the usual density; whether a machine sews that cleanly (thread breaks, puckering, needle damage) nobody has shown. The one stitched-out sample of this tool on Reddit was called "just auto-punch... everything is fill stitch".

## What this suggested at the time (all of it built later the same day: see the update at the top)

* (Wrong, as it turned out the same day: the micro-stitches were not needed; the cause was our own edge inset. See ..\CURRENT_SYSTEM\.) Do not copy DADE's recipe as it is: it relies on micro-stitches and fails on heavy faces, where ours is better.
* A middle path worth building if you want it: fill (not lines) for light text from 4 to 6 mm, with a minimum stitch length kept sewable, and measured again; and for lettering found inside pictures, trace it again finer and send it through the typed-text rules (the step I said was "not built" in round 3). Each would be tested against this same bench, and I would only call it better if it beats both ours and DADE at a sewable stitch length.
* Say plainly on the page what a text of 3 mm can be (already done in round 3).

## Folders

| | |
|---|---|
| `boards\` | The seven comparison pictures of the investigation (before the change). |
| `dade_inspector\` | DADE's screens: inspector for a letter, detection settings, trim settings, a zoomed stitch path. |
| `numbers\` | All tables: nine fonts and eighteen fonts cell by cell (CSV), the lettering pictures, and every experiment (`experiments_fill_in_our_engine_vs_dade.txt`). |
| `test_pictures_and_dade_files\` | The 45 + 27 sheets that were sent to DADE (typed text at 0.1 mm per pixel; logo-style pictures) and the 72 DST files it returned. |
| `harness\` | The scripts (they assume the session's scratch folder layout). |

Method notes: the sheets hold the same typed texts as our bench (drawn by the site's own text code at 14 pixels per mm, resampled to DADE's 10), black on white, anti-aliased like any logo PNG; DADE was driven at its defaults with Playwright (upload, Generate Preview, Download .dst) and was not given anything but these generic test sheets. Each DST is drawn with the colour of the picture under its stitches. The reader is RapidOCR; it ranks drawings, it is not a person and not a sew-out.
