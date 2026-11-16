# Every measurement of the CURRENT system again, on the repository's code exactly as it is now (variant "cur"): typed texts (nine fonts, eighteen fonts), the lettering pictures, 73 real pictures and the 7 real pictures of the lettering bench.
$sp = '<SESSION>\scratchpad'
$py = "$sp\venv\Scripts\python.exe"
Set-Location "$sp\text"
$env:NODE_OPTIONS = '--no-warnings'; $env:PYTHONIOENCODING = 'utf-8'
Remove-Item Env:DL_LIB -ErrorAction SilentlyContinue
"##### code: " + (Get-Item '<REPO>\app\lib\embroidery\stitch\engine.js').LastWriteTime
"##### typed + typed2"
& powershell -NoProfile -File "$sp\text\dl_run.ps1" cur '{}' '{}' both 2>&1 | Out-String -Width 200
"##### lettering pictures"
node run_pics.mjs --out "$sp\text\out\cur" --jobs 6 --set lpics 2>&1 | Select-Object -Last 1
$dir = "$sp\text\out\cur"
Remove-Item "$dir\ocr_lpics_p*.json" -ErrorAction SilentlyContinue
$procs = 0..3 | ForEach-Object { Start-Process -FilePath $py -ArgumentList @('-I', 'ocr_lpics.py', "`"$dir`"", '--part', "$_/4") -NoNewWindow -PassThru -RedirectStandardOutput "$sp\dade_text\ocr_lp_cur_$_.log" -RedirectStandardError "$sp\dade_text\ocr_lp_cur_$_.err" }
$procs | Wait-Process
& $py -I ocr_lpics.py --summary "$sp\text\out\now" "$sp\text\out\dade" "$sp\text\out\cur" 2>&1 | Out-String -Width 200
"##### real pictures"
$items = @(); foreach ($s in @('reg18', 'new55')) { Get-ChildItem "$sp\faces\cache\$s" -Directory | ForEach-Object { $items += "$s/$($_.Name)" } }
node run_pics.mjs --out "$sp\text\out\r73cur" --jobs 4 --items ($items -join ',') 2>&1 | Select-Object -Last 1
node run_pics.mjs --out "$sp\text\out\realG" --jobs 4 --real 2>&1 | Select-Object -Last 1
$changed = @()
foreach ($d in Get-ChildItem "$sp\text\out\r73old\pics" -Directory) {
  $a = Get-Content "$($d.FullName)\stats.json" -Raw | ConvertFrom-Json; $b = Get-Content "$sp\text\out\r73cur\pics\$($d.Name)\stats.json" -Raw | ConvertFrom-Json
  if ($a.stitches -ne $b.stitches -or $a.trims -ne $b.trims) { $changed += ("{0,-48} stitches {1,6} -> {2,6}  trims {3,4} -> {4,4}" -f $d.Name, $a.stitches, $b.stitches, $a.trims, $b.trims) }
}
"73 real pictures, the older rules against the current system: $($changed.Count) changed"
$changed
"the 7 real pictures of the lettering bench (older rules -> current):"
foreach ($d in Get-ChildItem "$sp\text\out\realB\pics" -Directory) { $a = Get-Content "$($d.FullName)\stats.json" -Raw | ConvertFrom-Json; $b = Get-Content "$sp\text\out\realG\pics\$($d.Name)\stats.json" -Raw | ConvertFrom-Json; "{0,-45} stitches {1,6} -> {2,6}" -f $d.Name, $a.stitches, $b.stitches }
"##### done"
