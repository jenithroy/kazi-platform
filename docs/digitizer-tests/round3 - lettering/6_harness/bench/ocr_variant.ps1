# usage: powershell -File ocr_variant.ps1 <variant> [<variant> ...]   -> out/<variant>/ocr_p0..3.json (4 reader processes at once per variant), then the summary of all of them
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Variants)
$sp = '<SESSION>\scratchpad'
$py = "$sp\venv\Scripts\python.exe"
$env:PYTHONIOENCODING = 'utf-8'
Set-Location "$sp\text"
New-Item -ItemType Directory -Force "$sp\text2\ocrlogs" | Out-Null
foreach ($v in $Variants) {
  $t0 = Get-Date
  $procs = 0..3 | ForEach-Object {
    Start-Process -FilePath $py -ArgumentList @('-I', 'ocr_text.py', $v, '--part', "$_/4", '--maxsize', '6') -NoNewWindow -PassThru -RedirectStandardOutput "$sp\text2\ocrlogs\${v}_$_.log" -RedirectStandardError "$sp\text2\ocrlogs\${v}_$_.err"
  }
  $procs | Wait-Process
  "== $v read in $([int]((Get-Date) - $t0).TotalSeconds) s"
}
& $py -I ocr_summary.py @Variants


