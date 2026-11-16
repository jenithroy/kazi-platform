# Round 5: lettering inside pictures (2026-11-16)

Two things you asked, one after the other:

1. "Copy what DADE does with fonts, the edges look REALLY rough in ours; would detecting the font and typing it in the way the site types text work?"
2. "Find out how DADE handles all the fonts and copy the technique."

This folder is what I found and what I built. **Nothing here was sewn on cloth.** The pictures are stitch files drawn by our own routine (a thread drawn 0.45 mm wide); the numbers come from a text reader (lower = fewer wrong characters) and from measuring the shapes against letters I drew myself, so the true ink is known. A reader is a proxy for a person looking at a sew-out, and it is unreliable on a few groups (said where it matters).

## 1. How DADE handles fonts

It does not handle them. I took its output apart in round 4 (`..\round4 - how DADE does fonts\`) and again here:

* There is **no font logic**: it does not look for lettering and does not know what a font is. Every colour island of the picture is sewn as a plain tatami fill: rows 0.20 mm apart, stitch length 3.0 mm, no underlay, no pull compensation, no minimum piece size, one pixel = 0.1 mm of cloth.
* It also **never cleans the picture first**. That is the whole secret: the gap between two 3 mm letters (0.2 to 0.4 mm) and a serif hairline are still there in the pixels, and a fill laid to the edge of what the pixels say keeps them.
* What that costs: its stitches weigh about 1.7 times the drawn ink, and it jumps instead of trimming.

What was already copied in round 4: the dense fill (rows 0.20 mm) for typed text and for lettering found in a picture up to 8 mm tall, with the weight kept to the drawing so it is not 1.7 times heavy.

What was **not** copied, and was the real gap: (a) our tracer cleaned the picture for a needle before any stitching (slivers thinner than 0.55 mm given away or widened, pieces under 0.78 mm^2 dropped), and (b) our engine had to **find** lettering to treat it as lettering (DADE needs no finding), and the finder asked for a run of 5 letters on the cleaned picture.

## 2. What about detecting the font and typing it again?

I did **not** do that, on purpose:

* **A wrong letter is sewn as confidently as a right one.** The reader (OCR) does misread (it read "MARIA AVE" for "AVE MARIA" in one of my own tests), and nobody sees the mistake until the cloth.
* **A logo's font is not one of our nine.** A customer's logo is supposed to look like their logo.
* **The tests would flatter it.** My test pictures are drawn in the site's own fonts, so "detect and retype" would look perfect on them and say nothing about real logos. You were right to worry about mixed backgrounds and mixed fonts.

What I built keeps the original letters and does what DADE does (it uses the pixels). If you still want the retyped version later, the safe form is a button, "Replace with typed text", where the person types the words the picture says (size, place and colour are taken from the lettering found): ask me.

## 3. What was built

When the finder (`trace\lettering.js`) finds lettering (at most 8 mm tall), the picture is traced a **second time with the cleaning relaxed for the lettering's own colour inside its box** (nothing thinner than 0.12 mm is cleaned away, no piece under 0.03 mm^2 is dropped, nothing is widened). `trace\refine.js` does it; it resumes from the first tracing, so it costs 0.04 to 0.2 s. Everything outside those boxes is cleaned as before. A box keeps the second tracing only if the finder finds its letters again and its colour has not turned into a crowd of pieces.

Round 5, second half (your second question): to copy "DADE never needs to find lettering" as far as is safe,

* **Short words.** BMW, KAZI, OPEN, SALE (3 and 4 letters) were not lettering to us. For a plain logo (a picture read as flat colours with at most 24 letter-shaped pieces and 60 shapes) a run of 3 letters now counts. A photograph taken for a logo is guarded by those limits (a zip on a flight suit had been taken for a 5-letter word in a test).
* **A finer look to find the lettering.** For a simple logo (first tracing of 100 shapes or fewer) the picture is also traced finer only to look for lettering, because the cleaning had already swallowed the thin letters the finder needs. Complex emblems (the crest 167 shapes, the seal 381, the chart 111) keep the first tracing's finding: used finer, their crown outlines were taken for lettering.
* **A block the second tracing has confirmed** (`refined`) needs only 3 letters to be sewn dense; an unconfirmed block still needs 5, as before.

Switch: `refineLettering: false`. Photographs and lettering over 8 mm are never touched. 68 of 73 real pictures are stitch for stitch what they were.

Things I got wrong first and fixed on the way: relaxing every colour gave the crest 288 extra black specks (the edge of a blue letter on gold is green or black for a pixel), so only the lettering's colour is relaxed; giving freed pixels to "the colour round them" could not reopen the counter of an e or an o, so they go to the ground colour of the box; finer detection broke the crest's crown (thin outlines taken for lettering), so it is limited to simple pictures; the first short-word version sewed a zip as a word, hence the shape and piece limits.

## 4. The numbers

### 4.1 Where the roughness was (108 pictures of one line, shapes against the drawing, 3 mm caps)

| | before (the page as it was) | **now** |
|---|---:|---:|
| how far the edge is out by on average | 0.079 mm | **0.012 mm** |
| ink pieces found (the drawing has 11.2) | 9.8 | **11.4** |
| ink against the drawing's (1.00 = exact) | 1.17 | **1.01** |
| share of the true ink covered / of the covered that is true | 0.90 / 0.79 | **0.97 / 0.97** |
| after stitching: edge out by / ink | 0.114 mm / 1.33 | 0.089 mm / 1.33 |

After stitching the edge cannot be better than about 0.07 mm (the thread is 0.45 mm wide, plus the row ends). The stitched weight is unchanged by this round: 1.15 times the drawing for all line pictures, 1.35 at 3 mm; the second tracing makes the *shape* right, it does not change how heavy the thread sews it.

### 4.2 The 134 drawn pictures with the page's own fonts (characters the reader gets wrong, lower is better)

| | the picture itself (ceiling) | old rules | DADE | **before** | **now** |
|---|---:|---:|---:|---:|---:|
| all 134 | 0.101 | 0.167 | 0.179 | 0.110 | **0.064** |
| one line of text (108) | 0.087 | 0.176 | 0.121 | 0.109 | **0.068** |
| white letters on a dark badge (18) | 0.170 | 0.114 | 0.178 | 0.084 | **0.049** |
| outlined letters (8) | 0.140 | 0.162 | 0.963 * | 0.177 | **0.052** |
| caps 3 mm | 0.000 | 0.385 | 0.168 | 0.237 | **0.075** |
| caps 4 mm | 0.072 | 0.225 | 0.105 | 0.132 | **0.013** |
| caps 5 mm | 0.010 | 0.124 | 0.057 | 0.024 | **0.013** |
| caps 6 mm | 0.065 | 0.054 | 0.040 | 0.017 | **0.007** |
| caps 8 mm | 0.114 | 0.069 | 0.128 | 0.049 | 0.101 ** |
| caps 12 mm (not touched) | 0.258 | 0.197 | 0.229 | 0.197 | 0.197 |
| serif faces, 3 to 6 mm | 0.250 | 0.390 | 0.046 | 0.183 | **0.016** |
| Times | 0.007 | 0.218 | 0.082 | 0.136 | **0.030** |
| script | 0.007 | 0.126 | 0.051 | 0.074 | **0.007** |
| sans / mono | 0.000 / 0.016 | 0.075 / 0.198 | 0.015 / 0.046 | 0.038 / 0.029 | **0.015 / 0.030** |
| condensed (heavy) | 0.000 | 0.444 | 0.565 | 0.400 | **0.146** |
| black / humanist / rounded | 0.007 / 0.022 / 0.022 | 0.114 / 0.090 / 0.120 | 0.015 / 0.015 / 0.000 | 0.007 / 0.016 / 0.038 | **0.000 / 0.000 / 0.000** |

\* The reader gives DADE 0.963 on the outlined pictures and the crop of DADE's file for those looks wrong on the board (`pictures\3_*`), so do not take that row as a fair DADE number.
\*\* One reader failure on a clean picture (`line_serif_8mm_ham`): the board shows the letters are fine, the before and DADE pictures read 0.118 and 1.0 on the same crop. Another picture reads one character worse (`line_mono_5mm_ave`, 0.0 to 0.125; nothing visible changed).

Better than DADE or level on every row. The two small groups are not judged well by this reader: averaged over three margins round the text, the badge pictures read 0.165 / 0.103 / **0.061** (old, before, now) and the outlined ones 0.160 / 0.162 / **0.118**; look at the pictures (`pictures\3_*`): the fat black outline is gone and the counters are open.

### 4.3 The 18 other fonts, as pictures (not the 9 the engine was tuned on; 144 pictures, DADE read on 140)

| | picture | before | **now** | DADE |
|---|---:|---:|---:|---:|
| all | 0.014 | 0.109 | **0.061** | 0.069 |
| caps 3 mm | 0.009 | 0.275 | **0.133** | 0.150 |
| caps 4 mm | 0.003 | 0.055 | **0.037** | 0.050 |
| caps 5 mm | 0.008 | 0.061 | **0.046** | 0.030 |
| caps 6 mm | 0.036 | 0.043 | **0.029** | 0.042 |

Biggest gains: Cinzel 0.108 to 0.015, Bebas 0.150 to 0.039, Courier Prime 0.060 to 0.007, Abril 0.266 to 0.090, Anton 0.145 to 0.074. **Not better** (said plainly): Pacifico (brush script) 0.311 to 0.333 against DADE's 0.150, Playfair (high-contrast serif) 0.183 to 0.199 against 0.115, Baskerville 0.054 against DADE 0.000, Merriweather 0.045 against 0.031: hairlines at 3 mm that a 0.45 mm thread cannot draw (`pictures\13_*`, `14_*`).

### 4.4 Short words (BMW, KAZI, OPEN, SALE; 9 fonts, 3/4/6 mm; 108 pictures)

| | before | **now** |
|---|---:|---:|
| all | 0.276 | **0.121** |
| caps 3 mm | 0.451 | **0.220** |
| caps 4 mm | 0.266 | **0.102** |
| serif / Times / mono | 0.410 / 0.424 / 0.465 | **0.028 / 0.069 / 0.215** |
| sans / black / rounded | 0.090 / 0.069 / 0.125 | **0.000 / 0.000 / 0.000** |

On the 48 of them the reader could also read on DADE's stitches (3 and 4 mm): before **0.345**, now **0.104**, DADE **0.174**. Not as good as DADE on these: the script font (0.281 against DADE's 0.156 on the 8 pictures both could be read) and the word "Open" (0.146 against 0.083). **Not found at all** (before = now; `pictures\16_*`): the heavy condensed font's short words (0.667 to 0.549), 3-letter "BMW" in mono at 3 mm, thin script "Open" at 4 mm (sewn as a single line).

### 4.5 Mixed backgrounds and messy copies (what you worried about)

The 36 line pictures with the ground spoiled the way a real logo's is (108 pictures): a colour gradient, a drop shadow, a paper texture (noise, a little blur, JPEG).

| characters wrong | before | **now** |
|---|---:|---:|
| all 108 (the picture itself 0.036) | 0.077 | **0.025** |
| gradient / shadow / texture | 0.053 / 0.083 / 0.095 | **0.017 / 0.022 / 0.036** |
| caps 3 mm | 0.185 | **0.068** |

The same 143 drawn pictures spoiled the way a web logo is: JPEG at quality 50, and half size + JPEG 65 enlarged back:

| characters wrong | JPEG 50 before | JPEG 50 **now** | half size before | half size **now** |
|---|---:|---:|---:|---:|
| all 134 | 0.115 | **0.088** | 0.109 | **0.091** |
| one line of text | 0.126 | **0.098** | 0.120 | **0.103** |
| caps 3 mm | 0.258 | **0.222** | 0.241 | **0.145** |
| caps 4 mm | 0.137 | **0.040** | 0.074 | 0.088 |
| serif faces | 0.214 | **0.142** | 0.145 | **0.037** |
| Times | 0.224 | **0.091** | 0.121 | 0.121 |
| script | 0.090 | **0.030** | 0.045 | **0.037** |

The second tracing is used on 103 of the 134 pictures, in JPEG 50 as on clean ones, and refused on 3 at half size (the letters were not found again, so the first tracing is kept). The gain is smaller than on clean pictures, and a **3 mm serif line in badly compressed JPEG is unreadable whatever is done**. A picture where lettering sits on a photograph or a busy pattern is not touched (nothing found) and comes out as before.

### 4.6 Real pictures (honest)

Of 73 real pictures 68 are exactly as before; five with lettering change: the flag of Washington Island 8,962 to 8,955 stitches, the SDL logo 3,495 to 3,836, the city seal 14,852 to 14,760, the crest 14,126 to 13,634, Harley 4,043 to 4,075 (the chart of the lettering bench 9,616 to 9,719). What the pictures show (`pictures\6_*` to `12_*`: the picture, the old rules, before, now): the crest's "GRATIA PLENA" and "AVE MARIA" are thinner and closer to the drawing (the serifs show); the SDL tagline has the letters it had lost back (the e, l and i), **but at 2.8 mm with 0.3 mm gaps it is still bold and ragged**: that is the width of the thread, not the tracing; the flag's hand-lettered font (2.3 mm) is as rough as the drawing itself.

### 4.7 Time

The second tracing costs 40 to 215 ms on a quiet machine (the crest 758 to 972 ms, the seal 1107 to 1212, a 3 mm line 116 to 180, a short word 68 to 105).

## 5. What is not solved

* Lettering of 3 mm and less in a real logo stays bold and ragged (the thread is 0.45 mm; typed 3 mm text is also 1.3 to 1.4 times as heavy as drawn).
* Heavy condensed short words, a 3-letter word in mono at 3 mm and thin script words are not found as lettering. Complex emblems (crest, seal, chart) keep the first tracing's finding, so small lettering inside them is only helped where the first tracing already found it.
* Fonts with hairlines at 3 mm (Pacifico, Playfair): no better, and not as good as DADE.
* The reader is a proxy: it is unreliable on badge and outlined groups and failed on one clean 8 mm picture. **Nothing has been sewn.** The dense fill is twice the usual density (rows 0.2 mm apart): `denseSpacing` 0.25 is the dial if a sew-out feels stiff.
* Nothing is committed or pushed, and nothing is ported to kazi-app: waiting for your go-ahead.

Tests on the final code: the tracer 217 checks, the digitizer 152, the stitch engine and the file formats all pass; the real production page, driven in headless Chromium, passes 23 of 23 (`real_page_tests\`, run on a fresh production build of the final code; the four real pictures stitched there are byte for byte the same files as in the page test run earlier in this round).

## Files

| | |
|---|---|
| `pictures\1_*` to `3_*` | Drawn pictures: the picture, the page as it was, the new tracing, DADE, with what the reader made of each (1: serif and Times, 2: sans, script, mono, humanist, rounded, black, 3: white on a badge and outlined letters). |
| `pictures\4_*`, `5_*` | The same pictures spoiled (JPEG 50; half size enlarged): the picture as handed in, before, now. |
| `pictures\6_*` to `12_*` | Real pictures (SDL tagline zoomed and whole, the flag, the crest's mottos and whole, the seal, the chart): the picture, old rules, before, now. |
| `pictures\13_*`, `14_*` | The 18 other fonts: the weak ones, and the ones that improved (picture, before, now, DADE). |
| `pictures\15_*`, `16_*` | Short words found and now sewn dense (picture, before, now, DADE), and short words still not found (before = now). |
| `pictures\17_*` | Mixed backgrounds (gradient, shadow, texture): picture, before, now. |
| `numbers\1_*`, `1b_*` | The reader's tables, and every one of the 134 pictures (old, DADE, before, now) as a CSV. |
| `numbers\2_*` to `8_*` | Shape accuracy by stage; stitched weight; three-margin read; messy pictures; the real pictures; how often the second tracing is used (and where lettering is found); what it costs in time. |
| `numbers\9_*` to `11_*` | The 18 other fonts; short words; mixed backgrounds. |
| `numbers\raw_bench_logs\` | The two bench logs the tables were cut from (`final3.log`, `final4.log`). |
| `real_page_tests\` | The real production page driven in headless Chromium (23 of 23), with the DST files and stitch pictures. |
| `harness\` | The scripts that made all of it (they assume the session's scratch folder layout; `final3.sh` and `final4.sh` are the whole measurement). |

The earlier rounds (typed lettering, the dense fill, the weight, how DADE sews) are in `..\round4 - how DADE does fonts\`.
