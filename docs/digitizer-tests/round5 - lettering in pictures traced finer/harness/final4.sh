#!/bin/bash
SP="<SESSION>/scratchpad"
cd "$SP/text"
export PYTHONIOENCODING=utf-8 NODE_OPTIONS=--no-warnings
echo "##### mixed backgrounds by kind of mess (picture | before | now)"
node -e "
const fs=require('fs');
const OUT='$SP/text/out/';
const load=(v)=>{const d={};for(const f of fs.readdirSync(OUT+v)) if(/^ocr_lpicsm_p\d\.json$/.test(f)) Object.assign(d,JSON.parse(fs.readFileSync(OUT+v+'/'+f,'utf8')));return d;};
const src=JSON.parse(fs.readFileSync(OUT+'_source_lpicsm.json','utf8'));
const off=load('m_off'), on=load('m_on2');
for (const v of ['gradient','shadow','texture']) { const ids=Object.keys(off).filter(i=>i.startsWith('mx_'+v+'_')); const m=(d)=>(ids.reduce((s,i)=>s+d[i],0)/ids.length).toFixed(3); console.log(v.padEnd(9),'n',ids.length,'picture',m(src),'before',m(off),'now',m(on)); }
"
echo "##### real pictures"
rm -rf out/r73v out/realN
items=""; for s in reg18 new55; do for d in "$SP/faces/cache/$s"/*/; do items="$items,$s/$(basename "$d")"; done; done; items="${items#,}"
node run_pics.mjs --out out/r73v --jobs 3 --items "$items" 2>&1 | tail -1
node run_pics.mjs --out out/realN --jobs 3 --real 2>&1 | tail -1
cd "$SP/rough"
echo "##### timing on the quiet machine (first tracing alone | first + the rest)"
node timing.mjs reg18/crest_manzanares new55/emblems_seal_torrance_bw new55/emblems_logo_sdl new55/emblems_flag_washington_island chart2/chart reg18/logo_harley lpics/line_serif_3mm_ham lpicss/sw_sans_3mm_kazi 2>&1 | cut -c1-230
echo "##### how often the second tracing is used (clean, JPEG 50, half size)"
node refine_census.mjs "$SP/text/cache" 2>&1 | cut -c1-400
node refine_census.mjs "$SP/rough/deg_jpg50" 2>&1 | cut -c1-400
node refine_census.mjs "$SP/rough/deg_low" 2>&1 | cut -c1-400
echo "##### where lettering is found: first tracing against the final, per set"
for s in lpicss lpicsx lpicsm; do node blocks_set.mjs $s 3 2>&1 | head -1 | cut -c1-300; done
echo "##### shape accuracy by stage, before and now"
IDS="all:sans all:serif all:times all:mono all:script all:humanist all:round all:black all:condensed"
echo "### before (the first tracing alone, no short words)"
TRACE_OPTS='{"refineLettering":false,"letterShortLetters":99}' node diag_trace.mjs fin $IDS 2>&1 | sed -n '/means by cap/,$p' | sed -E 's/ \| objects [^|]*\|/ |/'
echo "### now"
node diag_trace.mjs r8 $IDS 2>&1 | sed -n '/means by cap/,$p' | sed -E 's/ \| objects [^|]*\|/ |/'
echo "##### done"
