#!/bin/bash
SP="<SESSION>/scratchpad"
cd "$SP/text"
export NODE_OPTIONS=--no-warnings PYTHONIOENCODING=utf-8
v=r5
rm -f out/$v/ocr_lpics_p*.json
for i in 0 1 2 3; do "$SP/venv/Scripts/python.exe" -I ocr_lpics.py "$SP/text/out/$v" --part $i/4 > "$SP/rough/ocr_${v}_$i.log" 2> "$SP/rough/ocr_${v}_$i.err" & done
wait
echo "##### lettering pictures: picture, old, DADE, current system (fin), previous refined (r4), final (r5)"
"$SP/venv/Scripts/python.exe" -I ocr_lpics.py --summary "$SP/text/out/now" "$SP/text/out/dade" "$SP/text/out/fin" "$SP/text/out/r5" 2>&1 | head -30
echo "##### weights, pictures: old, current, final"
"$SP/venv/Scripts/python.exe" -I "$SP/dade_text/weight_probe_pics.py" "$SP/text/out/now" "$SP/text/out/fin" "$SP/text/out/r5" 2>&1 | head -30
echo "##### badge and outline pictures, three margins"
for k in outline badge; do "$SP/venv/Scripts/python.exe" -I "$SP/dade_text/ocr_lpics_pad.py" $k "$SP/text/out/now" "$SP/text/out/fin" "$SP/text/out/r5" 2>&1 | head -12; done
echo "##### done"
