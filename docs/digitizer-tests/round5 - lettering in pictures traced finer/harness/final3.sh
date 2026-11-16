#!/bin/bash
# The whole final measurement on the code exactly as it is now (variants r8, x4, s4, m_on2, q2_*): sew, read, summarise.
SP="<SESSION>/scratchpad"
cd "$SP/text"
export PYTHONIOENCODING=utf-8 NODE_OPTIONS=--no-warnings
PY="$SP/venv/Scripts/python.exe"
echo "##### code: $(date -r '<REPO>/app/lib/embroidery/trace/index.js' 2>/dev/null) trace/index.js, $(date -r '<REPO>/app/lib/embroidery/stitch/engine.js' 2>/dev/null) engine.js"
rm -rf out/r8 out/x4 out/s4 out/m_on2 out/q2_jpg50_on out/q2_low_on
node run_pics.mjs --out out/r8 --jobs 4 --set lpics 2>&1 | tail -1
node run_pics.mjs --out out/x4 --jobs 4 --set lpicsx 2>&1 | tail -1
node run_pics.mjs --out out/s4 --jobs 4 --set lpicss 2>&1 | tail -1
node run_pics.mjs --out out/m_on2 --jobs 4 --set lpicsm 2>&1 | tail -1
CACHE_DIR="$SP/rough/deg_jpg50" node run_pics.mjs --out out/q2_jpg50_on --jobs 4 --set lpics 2>&1 | tail -1
CACHE_DIR="$SP/rough/deg_low" node run_pics.mjs --out out/q2_low_on --jobs 4 --set lpics 2>&1 | tail -1
ocr() { rm -f out/$2/ocr_$1_p*.json; for i in 0 1 2 3; do "$PY" -I ocr_set.py $1 "$SP/text/out/$2" --part $i/4 > "$SP/rough/f3_$2_$i.log" 2>&1 & done; wait; }
ocr_l() { v=$1; rm -f out/$v/ocr_lpics_p*.json; for i in 0 1 2 3; do "$PY" -I ocr_lpics.py "$SP/text/out/$v" --part $i/4 > "$SP/rough/f3_${v}_$i.log" 2>&1 & done; wait; }
ocr_l r8
ocr lpicsx x4
ocr lpicss s4
ocr lpicsm m_on2
ocr_l q2_jpg50_on
ocr_l q2_low_on
echo "##### lettering pictures (143): picture | old | DADE | before | now"
"$PY" -I ocr_lpics.py --summary "$SP/text/out/now" "$SP/text/out/dade" "$SP/text/out/fin" "$SP/text/out/r8" 2>&1
echo "##### 18 fonts as pictures: picture | before | now | DADE (typed2)"
"$PY" -I ocr_set.py lpicsx --summary "$SP/text/out/x_off" "$SP/text/out/x4" --dade-typed2 2>&1
echo "##### short words (108): picture | before | now"
"$PY" -I ocr_set.py lpicss --summary "$SP/text/out/s_off" "$SP/text/out/s4" 2>&1
echo "##### short words on the 48 DADE read: before | now | DADE"
"$PY" -I cmp_subset.py lpicss "ours_before=out/s_off" "ours_now=out/s4" "DADE=out/dade" 2>&1
echo "##### mixed backgrounds (108): picture | before | now"
"$PY" -I ocr_set.py lpicsm --summary "$SP/text/out/m_off" "$SP/text/out/m_on2" 2>&1
echo "##### messy copies of the lettering pictures: picture | JPEG50 before | JPEG50 now | half size before | half size now"
"$PY" -I ocr_lpics.py --summary "$SP/text/out/q_jpg50_off" "$SP/text/out/q2_jpg50_on" "$SP/text/out/q_low_off" "$SP/text/out/q2_low_on" 2>&1
echo "##### badge and outline pictures, three margins"
for k in outline badge; do "$PY" -I "$SP/dade_text/ocr_lpics_pad.py" $k "$SP/text/out/now" "$SP/text/out/fin" "$SP/text/out/r8" 2>&1 | head -12; done
echo "##### weights, pictures: old, before, now"
"$PY" -I "$SP/dade_text/weight_probe_pics.py" "$SP/text/out/now" "$SP/text/out/fin" "$SP/text/out/r8" 2>&1 | head -30
echo "##### done"
