# The final measurements of the dense lettering rule with the repository's own defaults (variant f2): typed 3-6 mm (nine fonts, eighteen fonts), the lettering pictures, all 73 real pictures against the old rules.
$sp = '<SESSION>\scratchpad'
$py = "$sp\venv\Scripts\python.exe"
Set-Location "$sp\text"
$env:NODE_OPTIONS = '--no-warnings'; $env:PYTHONIOENCODING = 'utf-8'
Remove-Item Env:DL_LIB -ErrorAction SilentlyContinue
"##### typed + typed2, caps 3-6 mm (f2 = the repository defaults)"
& powershell -NoProfile -File "$sp\text\dl_run.ps1" f2 '{}' '{}' both 2>&1 | Out-String -Width 200
"##### lettering pictures"
node run_pics.mjs --out "$sp\text\out\f2" --jobs 6 --set lpics 2>&1 | Select-Object -Last 1
$dir = "$sp\text\out\f2"
Remove-Item "$dir\ocr_lpics_p*.json" -ErrorAction SilentlyContinue
$procs = 0..3 | ForEach-Object { Start-Process -FilePath $py -ArgumentList @('-I', 'ocr_lpics.py', "`"$dir`"", '--part', "$_/4") -NoNewWindow -PassThru -RedirectStandardOutput "$sp\dade_text\ocr_lp_f2_$_.log" -RedirectStandardError "$sp\dade_text\ocr_lp_f2_$_.err" }
$procs | Wait-Process
& $py -I ocr_lpics.py --summary "$sp\text\out\now" "$sp\text\out\dade" "$sp\text\out\f2" 2>&1 | Out-String -Width 200
"##### 73 real pictures: old rules against new"
$items = @(); foreach ($s in @('reg18', 'new55')) { Get-ChildItem "$sp\faces\cache\$s" -Directory | ForEach-Object { $items += "$s/$($_.Name)" } }
$list = $items -join ','
node run_pics.mjs --out "$sp\text\out\r73f2" --jobs 4 --items $list 2>&1 | Select-Object -Last 1
$changed = @()
foreach ($d in Get-ChildItem "$sp\text\out\r73old\pics" -Directory) {
  $a = Get-Content "$($d.FullName)\stats.json" -Raw | ConvertFrom-Json; $b = Get-Content "$sp\text\out\r73f2\pics\$($d.Name)\stats.json" -Raw | ConvertFrom-Json
  if ($a.stitches -ne $b.stitches -or $a.trims -ne $b.trims) { $changed += ("{0,-48} stitches {1,6} -> {2,6}  trims {3,4} -> {4,4}" -f $d.Name, $a.stitches, $b.stitches, $a.trims, $b.trims) }
}
"pictures: $((Get-ChildItem "$sp\text\out\r73old\pics" -Directory | Measure-Object).Count); changed: $($changed.Count)"
$changed
"##### done"
