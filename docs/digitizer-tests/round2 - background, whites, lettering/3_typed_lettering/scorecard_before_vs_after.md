# base vs final1

## Scorecard

| test | base | final1 |
|---|---:|---:|
| typed cells stitched | 168 of 168 | 168 of 168 |
| mean tIoU, all cells | 0.863 | 0.861 |
| mean tIoU, caps 3-6 mm | 0.851 | 0.851 |
| mean tIoU, caps 8-15 mm | 0.879 | 0.874 |
| mean tIoU, serif+times 3-6 mm | 0.82 | 0.805 |
| mean recall, serif+times 3-6 mm | 0.9 | 0.898 |
| mean precision, all cells | 0.896 | 0.903 |
| mean ink ratio (thread ink / glyph ink), all cells | 1.187 | 1.145 |
| cells with tIoU < 0.80 | 15 | 23 |
| cells with recall < 0.90 (strokes missing) | 14 | 24 |
| cells with precision < 0.85 (heavy, thread past the edge) | 25 | 30 |
| cells that lose a hole >= 0.5 mm wide | 49 | 47 |
| cells that lose any hole | 65 | 63 |
| cells that are mostly line stitches (> 50%) | 40 | 53 |
| cells that mix two stitch types (each >= 15%) | 40 | 22 |
| cells whose letters break into more pieces (+2) | 15 | 0 |
| cells whose letters fuse (-2 pieces) | 41 | 50 |
| cells whose TRACED outlines already miss (trace tIoU < 0.95) | 0 | 0 |
| mean stitches per cell | 955.524 | 978.018 |
| chart: mean tIoU, Arial bold rows (6-2 mm) | 0.851 | 0.851 |
| chart: mean tIoU, Times rows (6-2 mm) | 0.745 | 0.745 |
| chart: Times rows 3-2 mm | 0.652 | 0.652 |
| crest lettering (2 crops) | 0.839 | 0.839 |
| sign photos: gold on dark (4 crops) | 0.743 | 0.743 |
| sign photo: white on green | 0.948 | 0.948 |
| seal + logos (5 crops) | 0.915 | 0.915 |

Typed cells compared: 168; identical stitch counts and tIoU: 120; changed by more than 0.005 tIoU: 41.

| cell | tIoU base | tIoU final1 | delta | stitches |
|---|---:|---:|---:|---|
| times_b_5mm_ham | 0.82 | 0.71 | -0.109 | 556 -> 671 |
| black_b_3mm_ham | 0.86 | 0.75 | -0.107 | 362 -> 429 |
| serif_b_4mm_ham | 0.81 | 0.72 | -0.091 | 478 -> 632 |
| serif_b_5mm_ham | 0.83 | 0.76 | -0.068 | 622 -> 901 |
| times_b_5mm_ave | 0.77 | 0.70 | -0.064 | 426 -> 471 |
| times_b_6mm_ham | 0.84 | 0.78 | -0.058 | 673 -> 864 |
| times_b_6mm_ave | 0.79 | 0.73 | -0.054 | 306 -> 563 |
| sans_b_3mm_ave | 0.90 | 0.84 | -0.051 | 200 -> 236 |
| round_b_3mm_ave | 0.87 | 0.82 | -0.046 | 222 -> 229 |
| times_b_8mm_ham | 0.85 | 0.81 | -0.045 | 1117 -> 1282 |
| times_b_8mm_ave | 0.84 | 0.80 | -0.044 | 649 -> 836 |
| times_r_8mm_ham | 0.81 | 0.77 | -0.042 | 903 -> 1100 |
| times_r_8mm_ave | 0.81 | 0.77 | -0.040 | 580 -> 770 |
| serif_b_6mm_ham | 0.85 | 0.81 | -0.039 | 957 -> 1077 |
| serif_b_6mm_ave | 0.82 | 0.79 | -0.036 | 591 -> 685 |
| times_b_10mm_ham | 0.86 | 0.83 | -0.031 | 1506 -> 1606 |
| times_r_10mm_ham | 0.82 | 0.79 | -0.029 | 1399 -> 1562 |
| times_r_10mm_ave | 0.83 | 0.80 | -0.028 | 839 -> 974 |
| serif_b_5mm_ave | 0.77 | 0.74 | -0.025 | 289 -> 560 |
| times_b_10mm_ave | 0.83 | 0.81 | -0.022 | 869 -> 1054 |
| serif_r_8mm_ham | 0.81 | 0.79 | -0.022 | 1213 -> 1260 |
| humanist_b_5mm_ave | 0.83 | 0.81 | -0.016 | 360 -> 376 |
| times_b_4mm_ave | 0.77 | 0.76 | -0.012 | 332 -> 347 |
| serif_b_4mm_ave | 0.78 | 0.77 | -0.011 | 271 -> 421 |
| times_b_4mm_ham | 0.79 | 0.78 | -0.011 | 517 -> 550 |
| times_b_15mm_ave | 0.87 | 0.86 | -0.010 | 1498 -> 1729 |
| sans_r_15mm_ave | 0.90 | 0.89 | -0.009 | 1386 -> 1384 |
| sans_b_4mm_ham | 0.82 | 0.81 | -0.009 | 571 -> 506 |
| times_r_15mm_ave | 0.86 | 0.85 | -0.008 | 1452 -> 1505 |
| times_r_15mm_ham | 0.85 | 0.84 | -0.006 | 2302 -> 2395 |
| times_r_6mm_ave | 0.83 | 0.84 | +0.011 | 512 -> 554 |
| times_r_6mm_ham | 0.85 | 0.86 | +0.016 | 838 -> 841 |
| mono_b_4mm_ave | 0.83 | 0.86 | +0.030 | 335 -> 386 |
| sans_r_6mm_ham | 0.80 | 0.85 | +0.052 | 851 -> 711 |
| serif_r_6mm_ave | 0.78 | 0.85 | +0.075 | 385 -> 586 |
| humanist_b_4mm_ham | 0.80 | 0.88 | +0.080 | 548 -> 495 |
| sans_r_5mm_ham | 0.84 | 0.93 | +0.084 | 671 -> 660 |
| script_b_4mm_ham | 0.81 | 0.91 | +0.093 | 633 -> 627 |
| humanist_b_4mm_ave | 0.81 | 0.91 | +0.103 | 292 -> 323 |
| sans_r_5mm_ave | 0.82 | 0.93 | +0.105 | 365 -> 318 |

## Picture crops

| crop | tIoU base | tIoU final1 | holes base | holes final1 |
|---|---:|---:|---:|---:|
| chart2_sans_6mm | 0.90 | 0.90 | 3/3 | 3/3 |
| chart2_sans_5mm | 0.89 | 0.89 | 2/3 | 2/3 |
| chart2_sans_4mm | 0.86 | 0.86 | 3/3 | 3/3 |
| chart2_sans_3.5mm | 0.85 | 0.85 | 3/3 | 3/3 |
| chart2_sans_3mm | 0.92 | 0.92 | 2/3 | 2/3 |
| chart2_sans_2.5mm | 0.85 | 0.85 | 3/3 | 3/3 |
| chart2_sans_2mm | 0.69 | 0.69 | 0/3 | 0/3 |
| chart2_serif_6mm | 0.86 | 0.86 | 4/4 | 4/4 |
| chart2_serif_5mm | 0.85 | 0.85 | 4/4 | 4/4 |
| chart2_serif_4mm | 0.79 | 0.79 | 3/4 | 3/4 |
| chart2_serif_3.5mm | 0.76 | 0.76 | 3/4 | 3/4 |
| chart2_serif_3mm | 0.71 | 0.71 | 1/4 | 1/4 |
| chart2_serif_2.5mm | 0.65 | 0.65 | 1/4 | 1/4 |
| chart2_serif_2mm | 0.60 | 0.60 | 1/4 | 1/4 |
| crest_ave_maria | 0.85 | 0.85 | 4/4 | 4/4 |
| crest_gratia_plena | 0.82 | 0.82 | 5/5 | 5/5 |
| stxavier_st | 0.82 | 0.82 | 0/0 | 0/0 |
| stxavier_xavier | 0.83 | 0.83 | 1/2 | 1/2 |
| stxavier_high | 0.76 | 0.76 | 0/0 | 0/0 |
| stxavier_school | 0.55 | 0.55 | 2/2 | 2/2 |
| medstead_sign | 0.95 | 0.95 | 9/9 | 9/9 |
| torrance_incorporated | 0.91 | 0.91 | 17/17 | 17/17 |
| torrance_california | 0.94 | 0.94 | 50/50 | 50/50 |
| sdl_tagline | 0.83 | 0.83 | 6/12 | 6/12 |
| sdl_big | 1.00 | 1.00 | 1/1 | 1/1 |
| washington_island | 0.89 | 0.89 | 3/6 | 3/6 |