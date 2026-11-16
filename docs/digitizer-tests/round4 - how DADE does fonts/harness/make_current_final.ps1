$ErrorActionPreference = 'Stop'
$sp = '<SESSION>\scratchpad'
$py = "$sp\venv\Scripts\python.exe"
$d = "$sp\dade_text"
$C = '<RESULTS>\round4 - how DADE does fonts\CURRENT_SYSTEM'
foreach ($s in @('numbers', 'pictures')) { New-Item -ItemType Directory -Force "$C\$s" | Out-Null }
Set-Location "$sp\text"
$env:NODE_OPTIONS = '--no-warnings'
$env:PYTHONIOENCODING = 'utf-8'

function Save($path, $lines) { $lines | Set-Content -LiteralPath $path -Encoding UTF8 }

# ---------- numbers: the reader, nine fonts and eighteen fonts
Save "$C\numbers\1_typed_nine_fonts_old_vs_current.txt" (& $py -I "$d\cmp_dade.py" typed fin2 fin --csv "$C\numbers\typed_nine_fonts_cell_by_cell_old_vs_current.csv")
Save "$C\numbers\1b_typed_nine_fonts_DADE_vs_current.txt" ((& $py -I "$d\cmp_dade.py" typed dade fin) | Select-Object -First 7)
Save "$C\numbers\1c_typed_nine_fonts_previous_too_heavy_vs_current.txt" ((& $py -I "$d\cmp_dade.py" typed cur fin) | Select-Object -First 7)
Save "$C\numbers\2_typed_eighteen_fonts_old_vs_current.txt" (& $py -I "$d\cmp_dade.py" typed2 fin2 fin --csv "$C\numbers\typed_eighteen_fonts_cell_by_cell_old_vs_current.csv")
Save "$C\numbers\2b_typed_eighteen_fonts_DADE_vs_current.txt" ((& $py -I "$d\cmp_dade.py" typed2 dade fin) | Select-Object -First 7)
Save "$C\numbers\2c_typed_eighteen_fonts_previous_too_heavy_vs_current.txt" ((& $py -I "$d\cmp_dade.py" typed2 cur fin) | Select-Object -First 7)

# ---------- numbers: from the full re-measure log (final_fin.log, run on this code)
$log = Get-Content -LiteralPath "$d\final_fin.log"
function Sect($prefix) {
  $s = -1
  for ($i = 0; $i -lt $log.Count; $i++) { if ($log[$i].StartsWith($prefix)) { $s = $i; break } }
  if ($s -lt 0) { throw "no section $prefix" }
  $e = $log.Count
  for ($j = $s + 1; $j -lt $log.Count; $j++) { if ($log[$j].StartsWith('##### ')) { $e = $j; break } }
  return $log[$s..($e - 1)]
}
Save "$C\numbers\3_lettering_pictures_columns_picture_old_DADE_previous_current.txt" (Sect '##### lettering pictures')
Save "$C\numbers\3b_badge_and_outline_pictures_three_margins_old_vs_current.txt" (Sect '##### badge and outline pictures')
Save "$C\numbers\4_real_pictures_old_rules_vs_current.txt" (Sect '##### real pictures')

# ---------- numbers: how heavy the stitched letters are (1.00 = as drawn)
Save "$C\numbers\5_weight_typed_nine_fonts_old_previous_current_DADE.txt" (Sect '##### weights, typed')
Save "$C\numbers\6_weight_typed_eighteen_fonts_old_previous_current_DADE.txt" (Sect '##### weights, eighteen')
Save "$C\numbers\7_weight_letters_in_drawn_pictures_old_previous_current.txt" (Sect '##### weights, pictures')
Save "$C\numbers\5b_weight_typed_all_heights_3_to_15mm.txt" (& $py -I "$d\weight_probe.py" typed fin2 cur fin --maxsize 15.0 --csv "$C\numbers\weight_typed_cell_by_cell.csv")

# ---------- pictures: letters (drawn | old | previous too heavy | current | DADE)
$cells = [ordered]@{
  '0_weight_plain_sans'         = 'typed:sans_b_3mm_ave typed:sans_b_4mm_ham typed2:montserrat_b_5mm_ham typed2:nunito_b_3mm_ham'
  '1_serif_faces'               = 'typed:times_b_4mm_ave typed:times_b_3mm_ham typed:serif_r_3mm_ham'
  '2_high_contrast_serifs'      = 'typed2:playfair_b_4mm_ave typed2:baskerville_b_6mm_ave typed2:cinzel_b_3mm_ave'
  '3_heavy_faces'               = 'typed:condensed_b_5mm_ave typed:condensed_b_4mm_ham typed2:archivoblack_b_6mm_ave'
  '4_3mm_cells'                 = 'typed:script_b_3mm_ham typed:mono_b_3mm_ave typed:times_b_3mm_ave'
}
foreach ($k in $cells.Keys) {
  & $py -I "$d\board.py" "$C\pictures\letters_$($k)_drawn_old_previous_current_DADE.png" 2 ($cells[$k] -split ' ') --a fin2 --b cur --c fin --d dade | Select-Object -Last 1
}

# ---------- pictures: real pictures (picture | old | previous too heavy | current)
$dirs = "$sp\text\out\realB,$sp\text\out\realG,$sp\text\out\realH"
node pic_compare.mjs "$C\pictures\real_SDL_tagline_picture_old_previous_current.png" new55/emblems_logo_sdl 100,270,800,440 $dirs 1.4 1 | Select-Object -Last 1
node pic_compare.mjs "$C\pictures\real_flag_lettering_picture_old_previous_current.png" new55/emblems_flag_washington_island 150,520,850,700 $dirs 1.4 1 | Select-Object -Last 1
node pic_compare.mjs "$C\pictures\real_crest_picture_old_previous_current.png" reg18/crest_manzanares 0,0,762,1000 $dirs 0.8 0 | Select-Object -Last 1
node pic_compare.mjs "$C\pictures\real_crest_crown_picture_old_previous_current_unchanged.png" reg18/crest_manzanares 0,0,762,320 $dirs 1.2 1 | Select-Object -Last 1
node pic_compare.mjs "$C\pictures\real_seal_picture_old_previous_current.png" new55/emblems_seal_torrance_bw 0,0,999,1000 $dirs 0.6 0 | Select-Object -Last 1
node pic_compare.mjs "$C\pictures\real_chart_picture_old_previous_current.png" chart2/chart 0,0,1000,1000 $dirs 0.6 0 | Select-Object -Last 1

# ---------- pictures: drawn pictures of lettering (picture | old | previous | current)
$ld = "$sp\text\out\now,$sp\text\out\cur,$sp\text\out\fin"
node pic_compare.mjs "$C\pictures\drawn_outline_5mm_picture_old_previous_current.png" lpics/outline_sans_5mm_ham 100,60,900,190 $ld 1.2 1 | Select-Object -Last 1
node pic_compare.mjs "$C\pictures\drawn_outline_8mm_picture_old_previous_current.png" lpics/outline_sans_8mm_ave 100,40,900,200 $ld 1.2 1 | Select-Object -Last 1
(Get-ChildItem "$C\numbers" | Measure-Object).Count
(Get-ChildItem "$C\pictures" | Measure-Object).Count
