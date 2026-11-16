# Summary (base)

## Scorecard (the same numbers for every variant: compare them with `tools_text.py compare`)

| test | value |
|---|---:|
| typed cells stitched | 168 of 168 |
| mean tIoU, all cells | 0.863 |
| mean tIoU, caps 3-6 mm | 0.851 |
| mean tIoU, caps 8-15 mm | 0.879 |
| mean tIoU, serif+times 3-6 mm | 0.82 |
| mean recall, serif+times 3-6 mm | 0.9 |
| mean precision, all cells | 0.896 |
| mean ink ratio (thread ink / glyph ink), all cells | 1.187 |
| cells with tIoU < 0.80 | 15 |
| cells with recall < 0.90 (strokes missing) | 14 |
| cells with precision < 0.85 (heavy, thread past the edge) | 25 |
| cells that lose a hole >= 0.5 mm wide | 49 |
| cells that lose any hole | 65 |
| cells that are mostly line stitches (> 50%) | 40 |
| cells that mix two stitch types (each >= 15%) | 40 |
| cells whose letters break into more pieces (+2) | 15 |
| cells whose letters fuse (-2 pieces) | 41 |
| cells whose TRACED outlines already miss (trace tIoU < 0.95) | 0 |
| mean stitches per cell | 955.524 |
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
| 3 | 0.88 | 0.94 | 0.93 | 105/131 | 76/85 | 0.99 | 343 |
| 4 | 0.85 | 0.95 | 0.90 | 100/139 | 91/114 | 1.00 | 457 |
| 5 | 0.84 | 0.95 | 0.88 | 97/141 | 96/122 | 1.00 | 578 |
| 6 | 0.84 | 0.96 | 0.88 | 106/140 | 106/125 | 1.00 | 728 |
| 8 | 0.86 | 0.98 | 0.88 | 121/140 | 119/125 | 1.00 | 1038 |
| 10 | 0.87 | 0.99 | 0.89 | 125/140 | 123/128 | 1.00 | 1330 |
| 15 | 0.91 | 0.99 | 0.92 | 135/140 | 135/139 | 1.00 | 2216 |

## By font (bold on; mean over sizes and strings)

| font | tIoU | recall | precision | holes kept | tIoU at 3-5 mm | tIoU at 8-15 mm |
|---|---:|---:|---:|---:|---:|---:|
| sans | 0.87 | 0.98 | 0.89 | 66/77 | 0.86 | 0.89 |
| sans (regular) | 0.87 | 0.98 | 0.89 | 77/77 | 0.91 | 0.86 |
| black | 0.89 | 0.99 | 0.91 | 59/77 | 0.88 | 0.92 |
| condensed | 0.94 | 0.99 | 0.96 | 22/105 | 0.94 | 0.95 |
| humanist | 0.86 | 0.99 | 0.88 | 66/77 | 0.85 | 0.88 |
| serif | 0.84 | 0.93 | 0.91 | 82/84 | 0.80 | 0.88 |
| serif (regular) | 0.84 | 0.94 | 0.90 | 82/84 | 0.85 | 0.85 |
| times | 0.82 | 0.92 | 0.89 | 78/84 | 0.79 | 0.86 |
| times (regular) | 0.83 | 0.95 | 0.88 | 78/82 | 0.83 | 0.83 |
| mono | 0.86 | 0.97 | 0.89 | 66/77 | 0.86 | 0.88 |
| script | 0.85 | 0.99 | 0.87 | 55/70 | 0.85 | 0.87 |
| round | 0.86 | 0.99 | 0.88 | 58/77 | 0.84 | 0.89 |

## Stitch type by cap height (share of stitches, mean over cells; underlay = the mat under a tatami fill)

| cap mm | satin | fill | underlay | line |
|---:|---:|---:|---:|---:|
| 3 | 11% | 9% | 1% | 79% |
| 4 | 45% | 8% | 2% | 45% |
| 5 | 64% | 8% | 4% | 24% |
| 6 | 77% | 8% | 3% | 12% |
| 8 | 93% | 5% | 2% | 0% |
| 10 | 91% | 6% | 3% | 0% |
| 15 | 69% | 21% | 10% | 0% |

## The 25 worst cells by tIoU

| cell | tIoU | recall | precision | holes | trace tIoU | stitches/trims/jumps | types |
|---|---:|---:|---:|---:|---:|---|---|
| serif_b_5mm_ave | 0.77 | 0.77 | 0.98 | 4/4 | 1.00 | 289/14/26 | fill 66% underlay 34% |
| times_b_5mm_ave | 0.77 | 0.82 | 0.91 | 4/4 | 1.00 | 426/13/23 | satin 17% fill 8% line 72% |
| times_b_4mm_ave | 0.77 | 0.86 | 0.88 | 4/4 | 0.99 | 332/4/14 | satin 15% line 85% |
| times_b_3mm_ave | 0.77 | 0.88 | 0.86 | 2/4 | 0.98 | 291/1/16 | line 100% |
| serif_r_6mm_ave | 0.78 | 0.79 | 0.99 | 4/4 | 1.00 | 385/13/23 | fill 44% line 56% |
| sans_r_6mm_ave | 0.78 | 0.96 | 0.82 | 4/4 | 1.00 | 486/9/15 | satin 100% |
| serif_b_4mm_ave | 0.78 | 0.81 | 0.96 | 4/4 | 1.00 | 271/5/14 | fill 35% line 65% |
| serif_b_3mm_ave | 0.79 | 0.84 | 0.93 | 3/4 | 1.00 | 296/2/12 | line 100% |
| times_b_6mm_ave | 0.79 | 0.85 | 0.91 | 4/4 | 1.00 | 306/8/17 | satin 44% fill 34% underlay 22% |
| times_b_4mm_ham | 0.79 | 0.86 | 0.91 | 7/8 | 0.99 | 517/4/19 | satin 10% line 90% |
| script_b_4mm_ave | 0.79 | 0.99 | 0.82 | 1/4 | 1.00 | 337/7/14 | satin 92% line 8% |
| sans_r_6mm_ham | 0.80 | 1.00 | 0.81 | 7/7 | 1.00 | 851/12/26 | satin 100% |
| humanist_b_4mm_ham | 0.80 | 0.98 | 0.82 | 4/7 | 1.00 | 548/4/24 | satin 92% line 8% |
| times_r_3mm_ham | 0.80 | 0.94 | 0.85 | 4/6 | 0.98 | 429/0/22 | line 100% |
| script_b_5mm_ave | 0.80 | 0.97 | 0.83 | 2/4 | 1.00 | 410/7/16 | satin 100% |
| times_r_3mm_ave | 0.80 | 0.96 | 0.84 | 3/4 | 0.99 | 311/1/18 | line 100% |
| humanist_b_4mm_ave | 0.81 | 1.00 | 0.82 | 1/4 | 1.00 | 292/3/12 | satin 100% |
| script_b_5mm_ham | 0.81 | 1.00 | 0.82 | 3/6 | 1.00 | 790/9/22 | satin 100% |
| serif_b_3mm_ham | 0.81 | 0.85 | 0.94 | 7/8 | 0.99 | 483/2/23 | line 100% |
| round_b_4mm_ham | 0.81 | 0.99 | 0.82 | 6/7 | 1.00 | 581/7/26 | satin 92% fill 8% |
| humanist_b_5mm_ham | 0.81 | 0.99 | 0.83 | 5/7 | 1.00 | 718/10/21 | satin 100% |
| serif_b_4mm_ham | 0.81 | 0.92 | 0.87 | 8/8 | 0.99 | 478/4/21 | satin 50% fill 12% line 38% |
| times_r_8mm_ave | 0.81 | 0.94 | 0.86 | 4/4 | 1.00 | 580/13/20 | satin 89% fill 8% |
| serif_r_8mm_ave | 0.81 | 0.99 | 0.83 | 4/4 | 1.00 | 796/14/25 | satin 100% |
| mono_b_5mm_ham | 0.81 | 0.99 | 0.83 | 5/7 | 1.00 | 737/11/29 | satin 94% fill 6% |