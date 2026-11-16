# usage: powershell -File ocr_picbench.ps1 <variant> [<variant> ...]  -> reads the lettering pictures sewn into out/<variant> (4 reader processes at once), then the table against the picture itself and the real-picture crops
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Variants)
$sp = '<SESSION>\scratchpad'
$py = "$sp\venv\Scripts\python.exe"
$env:PYTHONIOENCODING = 'utf-8'
Set-Location "$sp\text"
New-Item -ItemType Directory -Force "$sp\text2\ocrlogs" | Out-Null
if (-not (Test-Path "$sp\text\out\_source_lpics.json")) { & $py -I ocr_lpics.py --source 2>&1 | Select-Object -Last 1 }
foreach ($name in $Variants) {
  $t0 = Get-Date
  $dir = "$sp\text\out\$name"
  $procs = 0..3 | ForEach-Object { Start-Process -FilePath $py -ArgumentList @('-I', 'ocr_lpics.py', "`"$dir`"", '--part', "$_/4") -NoNewWindow -PassThru -RedirectStandardOutput "$sp\text2\ocrlogs\lp_${name}_$_.log" -RedirectStandardError "$sp\text2\ocrlogs\lp_${name}_$_.err" }
  $procs | Wait-Process
  "== $name read in $([int]((Get-Date) - $t0).TotalSeconds) s"
}
$dirs = $Variants | ForEach-Object { "$sp\text\out\$_" }
& $py -I ocr_lpics.py --summary @dirs
& $py -I ocr_pics.py @dirs
