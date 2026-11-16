$ErrorActionPreference = 'Stop'
$sp = '<SESSION>\scratchpad'
$py = "$sp\venv\Scripts\python.exe"
$d = "$sp\dade_text"
$R = '<RESULTS>\round5 - lettering in pictures traced finer'
foreach ($s in @('numbers', 'pictures', 'harness')) { New-Item -ItemType Directory -Force "$R\$s" | Out-Null }
Get-ChildItem "$R\pictures" -File | Remove-Item -Force
Set-Location "$sp\text"
$env:NODE_OPTIONS = '--no-warnings'
$env:PYTHONIOENCODING = 'utf-8'
$O = "$sp\text\out"

# ---- the 143 drawn pictures of lettering: the picture | the page before round 5 | now | DADE
$sets = [ordered]@{
  '1_serif_and_Times_3_to_4mm'            = 'line_serif_3mm_ham line_times_4mm_ave line_times_3mm_ham line_serif_4mm_ham'
  '2_sans_script_mono_humanist_round'     = 'line_sans_3mm_ave line_script_3mm_ham line_mono_4mm_ham line_humanist_3mm_ham line_round_3mm_ave line_black_3mm_ham'
  '3_white_on_badge_and_outlined_letters' = 'badge_serif_4mm_ham badge_sans_4mm_ave badge_humanist_4mm_ham outline_sans_5mm_ham outline_serif_5mm_ham'
}
foreach ($k in $sets.Keys) {
  & $py -I "$d\board_lpics.py" "$R\pictures\$($k)_picture_before_now_DADE.png" 2 ($sets[$k] -split ' ') --a fin --c r8 --b dade | Select-Object -Last 1
}
# ---- the same pictures spoiled the way a web logo is: the picture as handed in | before | now
$messy = 'line_serif_3mm_ham line_times_4mm_ave line_sans_3mm_ave line_script_3mm_ham line_mono_4mm_ham'
& $py -I "$d\board_lpics.py" "$R\pictures\4_messy_JPEG_quality_50_picture_before_now.png" 2 ($messy -split ' ') --src "$sp\rough\deg_jpg50" --a q_jpg50_off --c q2_jpg50_on --nodade | Select-Object -Last 1
& $py -I "$d\board_lpics.py" "$R\pictures\5_messy_half_size_enlarged_picture_before_now.png" 2 ($messy -split ' ') --src "$sp\rough\deg_low" --a q_low_off --c q2_low_on --nodade | Select-Object -Last 1

# ---- real pictures: the picture | old rules | the page before round 5 | now
$dirs = "$O\realB,$O\realH,$O\realN"
node pic_compare.mjs "$R\pictures\6_real_SDL_tagline_zoomed_picture_old_before_now.png" new55/emblems_logo_sdl 250,332,540,382 $dirs 3.2 1 | Select-Object -Last 1
node pic_compare.mjs "$R\pictures\7_real_SDL_tagline_picture_old_before_now.png" new55/emblems_logo_sdl 100,270,800,440 $dirs 1.4 1 | Select-Object -Last 1
node pic_compare.mjs "$R\pictures\8_real_flag_lettering_picture_old_before_now.png" new55/emblems_flag_washington_island 150,520,850,700 $dirs 1.4 1 | Select-Object -Last 1
node pic_compare.mjs "$R\pictures\9_real_crest_GRATIA_PLENA_picture_old_before_now.png" reg18/crest_manzanares 560,340,700,860 $dirs 1.6 0 | Select-Object -Last 1
node pic_compare.mjs "$R\pictures\10_real_crest_whole_picture_old_before_now.png" reg18/crest_manzanares 0,0,762,1000 $dirs 0.8 0 | Select-Object -Last 1
node pic_compare.mjs "$R\pictures\11_real_seal_picture_old_before_now.png" new55/emblems_seal_torrance_bw 0,0,999,1000 $dirs 0.6 0 | Select-Object -Last 1
node pic_compare.mjs "$R\pictures\12_real_chart_picture_old_before_now.png" chart2/chart 0,0,1000,1000 $dirs 0.6 0 | Select-Object -Last 1

# ---- the second half of the round: the 18 other fonts as pictures, short words, mixed backgrounds (the picture | before | now | DADE where DADE was run)
$env:LP_SET = 'lpicsx'
& $py -I "$d\board_set.py" "$R\pictures\13_other_18_fonts_the_weak_ones_picture_before_now_DADE.png" 2 xf_merri_b_4mm_ham xf_baskerville_b_3mm_ham xf_playfair_b_3mm_ham xf_pacifico_b_5mm_ave xf_dancing_b_4mm_ham xf_caveat_b_3mm_ham --a x_off --c x4 --b dade | Select-Object -Last 1
& $py -I "$d\board_set.py" "$R\pictures\14_other_18_fonts_that_improved_picture_before_now_DADE.png" 2 xf_cinzel_b_3mm_ave xf_oswald_b_4mm_ham xf_bebas_b_3mm_ham xf_anton_b_4mm_ave xf_abril_b_4mm_ham xf_courierprime_b_3mm_ham --a x_off --c x4 --b dade | Select-Object -Last 1
$env:LP_SET = 'lpicss'
& $py -I "$d\board_set.py" "$R\pictures\15_short_words_picture_before_now_DADE.png" 2 sw_sans_3mm_kazi sw_black_3mm_kazi sw_serif_4mm_kazi sw_times_3mm_bmw sw_serif_3mm_open sw_mono_3mm_sale sw_script_3mm_open sw_times_4mm_sale --a s_off --c s4 --b dade | Select-Object -Last 1
& $py -I "$d\board_set.py" "$R\pictures\16_short_words_still_not_found_picture_before_now.png" 2 sw_condensed_3mm_kazi sw_condensed_3mm_sale sw_mono_3mm_bmw sw_script_4mm_open --a s_off --c s4 --nodade | Select-Object -Last 1
$env:LP_SET = 'lpicsm'
& $py -I "$d\board_set.py" "$R\pictures\17_mixed_backgrounds_gradient_shadow_texture_picture_before_now.png" 2 mx_gradient_serif_4mm_ham mx_shadow_sans_3mm_ave mx_texture_script_4mm_ham mx_shadow_times_3mm_ham mx_texture_serif_3mm_ave mx_gradient_mono_4mm_ham --a m_off --c m_on2 --nodade | Select-Object -Last 1
Remove-Item Env:LP_SET
(Get-ChildItem "$R\pictures" | Measure-Object).Count
