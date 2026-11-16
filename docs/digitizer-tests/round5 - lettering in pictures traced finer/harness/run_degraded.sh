#!/bin/bash
SP="<SESSION>/scratchpad"
cd "$SP/text"
export NODE_OPTIONS=--no-warnings PYTHONIOENCODING=utf-8
for mode in jpg50 low; do
  for onoff in off on; do
    v="q_${mode}_${onoff}"
    if [ "$onoff" = "off" ]; then T='{"refineLettering":false}'; else T='{}'; fi
    CACHE_DIR="$SP/rough/deg_$mode" TRACE_OPTS="$T" node run_pics.mjs --out out/$v --jobs 6 --set lpics 2>&1 | tail -1
    rm -f out/$v/ocr_lpics_p*.json
    for i in 0 1 2 3; do "$SP/venv/Scripts/python.exe" -I ocr_lpics.py "$SP/text/out/$v" --part $i/4 > "$SP/rough/ocr_${v}_$i.log" 2> "$SP/rough/ocr_${v}_$i.err" & done
    wait
  done
done
"$SP/venv/Scripts/python.exe" -I ocr_lpics.py --summary "$SP/text/out/q_jpg50_off" "$SP/text/out/q_jpg50_on" "$SP/text/out/q_low_off" "$SP/text/out/q_low_on" 2>&1 | head -30
echo "##### done"
