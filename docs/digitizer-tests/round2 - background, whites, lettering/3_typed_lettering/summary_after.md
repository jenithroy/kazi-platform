# Summary (final1)

## Scorecard (the same numbers for every variant: compare them with `tools_text.py compare`)

| test | value |
|---|---:|
| typed cells stitched | 168 of 168 |
| mean tIoU, all cells | 0.861 |
| mean tIoU, caps 3-6 mm | 0.851 |
| mean tIoU, caps 8-15 mm | 0.874 |
| mean tIoU, serif+times 3-6 mm | 0.805 |
| mean recall, serif+times 3-6 mm | 0.898 |
| mean precision, all cells | 0.903 |
| mean ink ratio (thread ink / glyph ink), all cells | 1.145 |
| cells with tIoU < 0.80 | 23 |
| cells with recall < 0.90 (strokes missing) | 24 |
| cells with precision < 0.85 (heavy, thread past the edge) | 30 |
| cells that lose a hole >= 0.5 mm wide | 47 |
| cells that lose any hole | 63 |
| cells that are mostly line stitches (> 50%) | 53 |
| cells that mix two stitch types (each >= 15%) | 22 |
| cells whose letters break into more pieces (+2) | 0 |
| cells whose letters fuse (-2 pieces) | 50 |
| cells whose TRACED outlines already miss (trace tIoU < 0.95) | 0 |
| mean stitches per cell | 978.018 |
| chart: mean tIoU, Arial bold rows (6-2 mm) | 0.851 |
| chart: mean tIoU, Times rows (6-2 mm) | 0.745 |
| chart: Times rows 3-2 mm | 0.652 |
| crest lettering (2 crops) | 0.839 |
| sign photos: gold on dark (4 crops) | 0.743 |
| sign photo: white on green | 0.948 |
| seal + logos (5 crops) | 0.915 |

168 of 168 cells stitched.

## By cap height (mean over every font and string)

| cap mm | tIoU | recall | precision | holes kept | holes >=0.5mm kept | trace tIoU | stitches |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 3 | 0.87 | 0.92 | 0.94 | 109/131 | 79/85 | 0.99 | 349 |
| 4 | 0.86 | 0.92 | 0.94 | 116/140 | 105/114 | 1.00 | 469 |
| 5 | 0.83 | 0.95 | 0.89 | 90/141 | 89/122 | 1.00 | 606 |
| 6 | 0.84 | 0.97 | 0.88 | 100/140 | 100/125 | 1.00 | 764 |
| 8 | 0.85 | 0.98 | 0.88 | 120/140 | 118/125 | 1.00 | 1072 |
| 10 | 0.87 | 0.99 | 0.88 | 125/140 | 123/128 | 1.00 | 1354 |
| 15 | 0.91 | 0.99 | 0.91 | 135/140 | 135/139 | 1.00 | 2233 |

## By font (bold on; mean over sizes and strings)

| font | tIoU | recall | precision | holes kept | tIoU at 3-5 mm | tIoU at 8-15 mm |
|---|---:|---:|---:|---:|---:|---:|
| sans | 0.87 | 0.97 | 0.90 | 68/77 | 0.85 | 0.89 |
| sans (regular) | 0.89 | 0.97 | 0.92 | 77/77 | 0.94 | 0.86 |
| black | 0.89 | 0.97 | 0.92 | 62/77 | 0.86 | 0.92 |
| condensed | 0.94 | 0.99 | 0.96 | 22/105 | 0.94 | 0.95 |
| humanist | 0.87 | 0.97 | 0.90 | 72/77 | 0.88 | 0.88 |
| serif | 0.82 | 0.93 | 0.88 | 74/84 | 0.76 | 0.88 |
| serif (regular) | 0.85 | 0.94 | 0.91 | 82/84 | 0.85 | 0.84 |
| times | 0.79 | 0.92 | 0.87 | 73/84 | 0.76 | 0.83 |
| times (regular) | 0.82 | 0.93 | 0.89 | 78/82 | 0.83 | 0.80 |
| mono | 0.87 | 0.97 | 0.90 | 67/77 | 0.86 | 0.88 |
| script | 0.87 | 0.98 | 0.90 | 61/71 | 0.88 | 0.87 |
| round | 0.86 | 0.98 | 0.89 | 59/77 | 0.83 | 0.89 |

## Stitch type by cap height (share of stitches, mean over cells; underlay = the mat under a tatami fill)

| cap mm | satin | fill | underlay | line |
|---:|---:|---:|---:|---:|
| 3 | 7% | 5% | 1% | 88% |
| 4 | 22% | 6% | 2% | 71% |
| 5 | 61% | 4% | 2% | 33% |
| 6 | 75% | 3% | 1% | 21% |
| 8 | 87% | 3% | 2% | 8% |
| 10 | 92% | 5% | 3% | 0% |
| 15 | 69% | 21% | 10% | 0% |

## The 25 worst cells by tIoU

| cell | tIoU | recall | precision | holes | trace tIoU | stitches/trims/jumps | types |
|---|---:|---:|---:|---:|---:|---|---|
| times_b_5mm_ave | 0.70 | 0.74 | 0.94 | 4/4 | 1.00 | 471/11/23 | line 100% |
| times_b_5mm_ham | 0.71 | 0.76 | 0.95 | 8/8 | 0.99 | 671/6/27 | line 100% |
| serif_b_4mm_ham | 0.72 | 0.76 | 0.96 | 8/8 | 1.00 | 632/8/21 | line 100% |
| times_b_6mm_ave | 0.73 | 0.99 | 0.76 | 1/4 | 1.00 | 563/9/22 | satin 100% |
| serif_b_5mm_ave | 0.74 | 0.99 | 0.76 | 1/4 | 1.00 | 560/11/19 | satin 100% |
| black_b_3mm_ham | 0.75 | 0.78 | 1.00 | 7/7 | 0.99 | 429/3/22 | line 100% |
| times_b_4mm_ave | 0.76 | 0.82 | 0.90 | 4/4 | 0.99 | 347/3/15 | line 100% |
| serif_b_5mm_ham | 0.76 | 0.99 | 0.78 | 4/8 | 1.00 | 901/13/34 | satin 100% |
| times_r_8mm_ave | 0.77 | 0.81 | 0.96 | 4/4 | 1.00 | 770/18/34 | line 100% |
| serif_b_4mm_ave | 0.77 | 0.81 | 0.95 | 4/4 | 1.00 | 421/5/16 | line 100% |
| times_b_3mm_ave | 0.77 | 0.88 | 0.86 | 2/4 | 0.98 | 291/1/16 | line 100% |
| times_r_8mm_ham | 0.77 | 0.81 | 0.97 | 8/8 | 1.00 | 1100/22/37 | line 100% |
| times_b_4mm_ham | 0.78 | 0.83 | 0.94 | 8/8 | 0.99 | 550/5/21 | line 100% |
| times_b_6mm_ham | 0.78 | 0.99 | 0.80 | 6/8 | 1.00 | 864/11/31 | satin 100% |
| sans_r_6mm_ave | 0.78 | 0.96 | 0.82 | 4/4 | 1.00 | 486/9/15 | satin 100% |
| serif_b_3mm_ave | 0.79 | 0.84 | 0.93 | 3/4 | 1.00 | 296/2/12 | line 100% |
| times_r_10mm_ham | 0.79 | 1.00 | 0.80 | 8/8 | 1.00 | 1562/27/48 | satin 100% |
| serif_b_6mm_ave | 0.79 | 0.98 | 0.81 | 4/4 | 1.00 | 685/12/21 | satin 100% |
| serif_r_8mm_ham | 0.79 | 0.99 | 0.81 | 8/8 | 1.00 | 1260/19/41 | satin 100% |
| times_r_3mm_ham | 0.80 | 0.94 | 0.85 | 4/6 | 0.98 | 429/0/22 | line 100% |
| script_b_5mm_ave | 0.80 | 0.97 | 0.83 | 2/4 | 1.00 | 410/7/16 | satin 100% |
| times_b_8mm_ave | 0.80 | 0.99 | 0.82 | 4/4 | 1.00 | 836/15/28 | satin 100% |
| times_r_10mm_ave | 0.80 | 1.00 | 0.81 | 4/4 | 1.00 | 974/17/33 | satin 100% |
| times_r_3mm_ave | 0.80 | 0.96 | 0.84 | 3/4 | 0.99 | 311/1/18 | line 100% |
| script_b_5mm_ham | 0.80 | 1.00 | 0.82 | 3/6 | 1.00 | 791/9/22 | satin 100% |