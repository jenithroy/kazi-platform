# Round 3: lettering (2026-11-15)

You asked for four things to be fixed (3 mm serif capitals unreadable, heavy fonts at 5 to 6 mm fat satin, lettering inside pictures untouched, the bench using only this Windows machine's fonts) and for the tool to detect fonts and treat them differently. This folder is the evidence. **Nothing here was sewn on cloth**: every picture is the stitch file drawn the way the editor draws it, and the numbers come from a text reader (OCR) reading those drawings back.

## Start here

1. `1_typed_text_before_after\heavy_fonts.png`: Impact and Arial Black at 4 to 6 mm. In each block the rows are: the drawn letters, the old letter-by-letter rule, the rule at the end of last round (what you looked at), and now. This is the "fat satin": it went from fur to solid, readable letters.
2. `1_typed_text_before_after\serif_small.png`: Times and Georgia at 3 to 5 mm. They are better than before and still hard at 3 mm: that is a limit of thread, and the text tool now says so.
3. `3_lettering_in_pictures\`: what the new finder sees in a picture (`found_overlays\`, a box round every letter, one colour per line of text) and the before/after crops (crest, sign, flag, chart).
4. `5_real_page_tests\`: the real production build in Chromium, 23 checks, with screenshots of the two new notes.

## What changed, in plain words

* **Typed text is sewn by its weight and its height.** Thin strokes: single lines from end to end. Strokes with hairlines and serifs (Times, Georgia): satin with the hairlines made thick enough for a needle. Heavy plain strokes under 8 mm tall (Impact, Arial Black, Anton): a plain fill, with the letters made a hair lighter so the holes of a, e, o stay open. The old rule picked satin or line letter by letter, and satin round a heavy small letter fanned out into fur.
* **The tool finds lettering in a picture.** It looks for rows of letter-shaped pieces (same colour, same height, evenly set, all different from each other) in logos and artwork, with no model and nothing downloaded. A row of stars, bars or rope strands is left alone. The Picture panel says what it found ("Lettering found: 19 letters in 1 line, the smallest about 2.5 mm tall") and how much bigger the design would have to be. Thin lettering (strokes under 0.55 mm) is sewn as single lines from end to end; heavier lettering is sewn as before (see the limits).
* **The page tells you whether the lettering can be read at its size, by kind of face**: plain sans from 4 mm, a face with hairlines from 6 mm, a heavy face from 5 mm, with a "Use Sans" button in the text tool.
* **Fonts**: the nine fonts of the page come from the device, so a phone or Linux computer drew four of them as the same plain sans. Four small look-alikes now travel with the page (Archivo Black, Anton, Pacifico, Nunito: 62 KB, open licence), used only where the device lacks the first font. And the rules were checked on **18 other open-licence fonts that were not used to choose anything**, so they are not tuned to this machine.

## The numbers (share of characters the reader got wrong; lower is better; caps 3 to 6 mm)

| | letter by letter (before 2026-11-14) | last round | now |
|---|---:|---:|---:|
| the nine fonts of the page (96 texts) | 0.230 | 0.169 | **0.098** |
| eighteen other fonts (144 texts) | 0.338 | 0.224 | **0.125** |
| texts with more than 30 % wrong, nine fonts | 21 | 11 | **2** |
| texts with more than 30 % wrong, eighteen fonts | 50 | 27 | **10** |

By face, letter by letter to now: Archivo Black 0.64 to 0.04, Anton 0.62 to 0.10, Oswald 0.42 to 0.03, Bebas 0.39 to 0.05, Courier Prime 0.70 to 0.13, Arial Black 0.31 to 0.04, Impact 0.73 to 0.27. In a picture: the crest's "AVE MARIA" 0.75 to 0.12; 33 of 34 real pictures give exactly the same stitches as before (only the crest, which has thin lettering, changes).

The reader (RapidOCR) is not a person and a drawing is not a sew-out. The numbers rank the rules; they do not promise how a letter looks on cloth. All the tables are in `4_numbers\` (`line_and_fill_limits_all_variants.txt` has every setting that was tried).

## What did not work or is still weak (be honest about these)

* **3 mm serif capitals are still not readable.** A needle cannot follow a hairline thinner than the thread. Times bold at 3 to 5 mm is still 0.2 wrong, Playfair 0.40. The text tool says so and offers Sans; it does not hide it.
* **Heavy condensed faces under 5 mm** (Impact 3 to 4 mm, 0.27 wrong): the letters are 1.4 mm thick and 0.3 mm apart.
* **Lettering inside pictures is found and measured, but only the thin part is re-stitched.** I tried the typed rules (satin, fill) on picture lettering and they made 134 drawn pictures worse (0.167 to 0.207, 0.197 with a fill), so they are not applied. The chart's small rows, the school sign, the flag's heavy letters and the SDL line are as poor as before. The real cause is that the picture's lettering is traced coarser than typed text is (14 pixels to the millimetre from a font, against what the picture has); the next step would be to trace the lettering found in a picture again, finer, and sew that. Not built.
* A few faces got a little worse than last round (Libre Baskerville 0.105 to 0.189, Lora 0.084 to 0.145: low-contrast serifs).
* Tried and thrown away, each measured: making thin faces heavier, widening hairlines in single lines, cutting the short serif stubs from the lines, lightening only the heavy parts, picture lettering by the typed rules.

## Folders

| | |
|---|---|
| `1_typed_text_before_after\` | Sheets of the nine page fonts: old rule, last round, now. |
| `2_eighteen_other_fonts\` | The same for fonts that were not used to choose anything (Anton, Archivo Black, Oswald, Bebas, Playfair, Cinzel, Pacifico, Courier Prime, Dancing Script). |
| `3_lettering_in_pictures\` | The finder's boxes on the crest, seal, chart, SDL logo, flag; before/after crops. |
| `4_numbers\` | Every table: reader results by font and height, the line and fill limits, the advice thresholds, the finder's results, the picture experiments. |
| `5_real_page_tests\` | The production build driven in Chromium: the pictures converted, the DST files, the notes, the fonts loading. |
| `6_harness\` | The scripts (bench, reader, finder probe, page test). They assume the session's scratch folder layout; `fonts_and_tools.txt` lists the fonts, their licences and the reader. |

Code and docs are in the repository (not committed or pushed): `docs/digitizer.md` sections 5.9, 6, 7.2 and 7.5; `app/lib/embroidery/README.md`, last paragraph.
