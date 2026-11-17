# All digitizer tests, once each, in the order they were first run

**Newest = the highest number (17, round 6, 2026-11-16 17:21).** Each folder holds only the newest version of that test, and its name starts with the number and the date it was first run (and the time, where one was recorded). If the newest version is from a later day or time, the folder name ends with `__newest-<date>`.

## Timeline

| Day | What was run (test numbers) | Time of day |
|---|---|---|
| 2026-11-14 | round 1: tests 1, 2, 3, 4 (faces, other kinds of pictures, the earlier 18, the real page). round 2: tests 5, 6, 7 (background switch, eye whites and teeth, typed text) | not recorded |
| 2026-11-15 | round 3: tests 8, 9, 11, 12 (typed text in 18 more fonts, where lettering is found, drawn lettering pictures, lettering in real pictures). round 4: test 10 (how DADE sews lettering; also redid test 7) | not recorded |
| 2026-11-16 | round 5: tests 13, 14, 15, 16 (messy copies, 18 fonts as pictures, short words, mixed backgrounds); it also redid 4, 11 and 12 | not recorded |
| 2026-11-16 | round 6: test 17, run at 16:12 (before any fix), 17:01 (after the fixes) and 17:21 (the extra ink split by stroke width) | **16:12, 17:01 and 17:21** |

Why most times are missing: the earlier rounds recorded the day (in each round's README) but not the time of day, and their files were all saved to git together (the five engine changes at 14:33 and the test files at 14:42 on 2026-11-16), which is when they were saved, not when they were run. Round 6 was run with the dates and times in the file names, so its times are real. Every new test from now on is named that way.

Nothing was sewn on cloth: every picture is a stitch file drawn by our own routine. From round 6 on there is no comparison with DADE.

How to read the panels: **LATEST** = newest version of the engine in that round, **BEFORE** = the version at the start of that round, **OLD** = the rules before round 4, **INPUT** = the picture fed in, **DADE** = another company's tool (old reference only). Round 5 boards (tests 11 to 16) have these words printed on them.

## The tests

| # | First run | Newest version | Folder | What it tested | Images | Raw numbers, scripts and older versions (the old round folders, untouched) |
|---|---|---|---|---|---:|---|
| 1 | 2026-11-14 (round 1) | **2026-11-14** (round 1) | `01_2026-11-14_faces/` | Do eyes, lips and skin tones come out? One sheet per picture with a face (before / after). | 22 | sheets/faces, metrics/, SUMMARY.md |
| 2 | 2026-11-14 (round 1) | **2026-11-14** (round 1) | `02_2026-11-14_other-kinds-of-pictures/` | One overview per kind of picture: colour, black and white, angled, small and painted faces, sculpture, cartoons, animals, nature, scenes, objects, text, emblems, line art, icons. | 15 | sheets/by_category, metrics/ |
| 3 | 2026-11-14 (round 1) | **2026-11-14** (round 1) | `03_2026-11-14_earlier-18-pictures/` | The 18 pictures of the earlier test, redrawn on the cloth the tool chose. | 18 | sheets/earlier18, metrics/ |
| 4 | 2026-11-14 (round 1) | **2026-11-16** (round 5) | `04_2026-11-14_real-production-page-picture-by-picture__newest-2026-11-16/` | The real /digitizer page driven in a browser like a visitor: what each picture sews to. Each picture appears once, from the newest round that ran it (the round is in the file name). | 24 | real_page_tests/, round2.../4_real_page_tests, round3.../5_real_page_tests, round4.../CURRENT_SYSTEM/real_page_tests, round5.../real_page_tests<br>_older versions, not copied:_ the same pictures in the older rounds |
| 5 | 2026-11-14 (round 2) | **2026-11-14** (round 2) | `05_2026-11-14_background-switch/` | Switching the background off must leave out nothing. | 4 | round2.../1_background_off |
| 6 | 2026-11-14 (round 2) | **2026-11-14** (round 2) | `06_2026-11-14_eye-whites-and-teeth/` | Eye whites and teeth, before and after the fix (three sets). | 3 | round2.../2_eye_whites_and_teeth<br>_older versions, not copied:_ 0_before_the_fix_A/B |
| 7 | 2026-11-14 (round 2) | **2026-11-15** (round 4) | `07_2026-11-14_typed-text-nine-fonts__newest-2026-11-15/` | Text typed into the page, nine fonts, caps 3 to 6 mm: the drawn letters against what is sewn (round 4 sheets still carry a DADE column). | 5 | round4.../CURRENT_SYSTEM<br>_older versions, not copied:_ round2.../3_typed_lettering, round3.../1_typed_text_before_after, round4.../older_runs_not_current |
| 8 | 2026-11-15 (round 3) | **2026-11-15** (round 3) | `08_2026-11-15_typed-text-18-other-fonts/` | Typed text in 18 more fonts that nothing was tuned on (heavy and condensed; serif, script, typewriter). | 2 | round3.../2_eighteen_other_fonts, round3.../4_numbers |
| 9 | 2026-11-15 (round 3) | **2026-11-15** (round 3) | `09_2026-11-15_where-lettering-is-found-in-pictures/` | Which parts of a real picture the finder takes for lettering (overlays on the chart, flag, SDL logo, seal and crest). | 5 | round3.../3_lettering_in_pictures/found_overlays |
| 10 | 2026-11-15 (round 4) | **2026-11-15** (round 4) | `10_2026-11-15_how-DADE-sews-lettering/` | Reference only (no DADE comparison from now on): how the other tool sews lettering, against our old system. | 7 | round4.../INVESTIGATION_old_system_vs_DADE |
| 11 | 2026-11-15 (round 3) | **2026-11-16** (round 5) | `11_2026-11-15_drawn-lettering-pictures__newest-2026-11-16/` | Pictures of lettering drawn with the page's fonts (serif and Times, sans, script, mono, round; white on a badge; outlined letters): input, before, latest. | 3 | round5.../pictures, numbers/<br>_older versions, not copied:_ round3 and round4 versions of the same pictures (round4.../CURRENT_SYSTEM/pictures/drawn_outline_*) |
| 12 | 2026-11-15 (round 3) | **2026-11-16** (round 5) | `12_2026-11-15_lettering-in-real-pictures__newest-2026-11-16/` | Lettering inside real pictures: SDL tagline, flag, crest, seal, chart. Input, old, before, latest. | 7 | round5.../pictures<br>_older versions, not copied:_ round3.../3_lettering_in_pictures, round4.../CURRENT_SYSTEM/pictures/real_* |
| 13 | 2026-11-16 (round 5) | **2026-11-16** (round 5) | `13_2026-11-16_messy-copies/` | The same pictures spoiled the way a web logo is: JPEG quality 50, and half size enlarged back. | 2 | round5.../pictures, numbers/ |
| 14 | 2026-11-16 (round 5) | **2026-11-16** (round 5) | `14_2026-11-16_18-other-fonts-as-pictures/` | 18 more fonts drawn as pictures: the weak ones, and the ones that improved. | 2 | round5.../pictures, numbers/ |
| 15 | 2026-11-16 (round 5) | **2026-11-16** (round 5) | `15_2026-11-16_short-words/` | Short words (BMW, KAZI, OPEN, SALE): found and sewn well, and still not found. | 2 | round5.../pictures, numbers/ |
| 16 | 2026-11-16 (round 5) | **2026-11-16** (round 5) | `16_2026-11-16_mixed-backgrounds/` | Lettering over a gradient, a drop shadow, a paper texture. | 1 | round5.../pictures, numbers/ |
| 17 | 2026-11-16 16:12 (round 6) | **2026-11-16 17:21** (round 6) | `17_2026-11-16_1612_missing-and-extra-ink-bench__newest-2026-11-16_1721/` | NEWEST. 54 drawn pictures measured for parts of letters not sewn (red) and stitches where there should be none (blue), before and after the round 6 engine fixes (the stem of an I that was not sewn, notches at junctions, cursive words). Summaries of the four runs (the last, 17:21, splits the extra ink by stroke width and also draws the thread at 0.40 mm as a what-if), and BEFORE / AFTER pictures of four of them; all 54 are in the folder named in the next column. | 12 | 2026-11-16_round6_small-defects/runs/ (README.md there says what was changed) |

The old round folders (`round2 ...` to `round5 ...`, `sheets/`, `real_page_tests/`, `metrics/`, `stitch_files/`, `harness/`, `inputs/`, `2026-11-16_round6_small-defects/`) are kept because the numbers, DST files and scripts live there and docs/digitizer.md points at them. The pictures in this folder are hard links to those same files, so nothing is stored twice. You can ignore the old folders when you only want to look at results.

The source pictures that were tested are in `inputs/` (with author and licence in each `SOURCES.txt`).
