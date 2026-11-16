# usage: powershell -File sweep_many.ps1 name=optsjson [name=optsjson ...]   (each run = sweep.ps1; the compare is against final1)
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Specs)
$sp = '<SESSION>\scratchpad'
$py = "$sp\venv\Scripts\python.exe"
Set-Location "$sp\text"
$env:NODE_OPTIONS = '--no-warnings'; $env:PYTHONIOENCODING = 'utf-8'
foreach ($spec in $Specs) {
  $i = $spec.IndexOf('=')
  $name = $spec.Substring(0, $i)
  $opts = $spec.Substring($i + 1)
  $env:ENGINE_OPTS = $opts
  $out = "$sp\text\out\$name"
  New-Item -ItemType Directory -Force $out | Out-Null
  $t0 = Get-Date
  node replay_text.mjs --lib '<REPO>\app\lib' --out $out --dst 0 2>&1 | Select-Object -Last 1
  if (-not (Test-Path "$out\pics")) { Copy-Item "$sp\text\out\final1\pics" "$out\pics" -Recurse -ErrorAction SilentlyContinue }
  if (-not (Test-Path "$out\metrics_pics.json")) { Copy-Item "$sp\text\out\final1\metrics_pics.json" "$out\metrics_pics.json" -ErrorAction SilentlyContinue }
  Set-Content -Path "$out\run.json" -Value ('{"variant":"' + $name + '"}') -Encoding utf8
  & $py -I tools_text.py metrics $name 2>&1 | Select-Object -Last 1
  & $py -I tools_text.py table $name 2>&1 | Select-Object -Last 1
  "== $name ($opts) done in $([int]((Get-Date) - $t0).TotalSeconds) s"
}
