# usage: powershell -File sweep.ps1 <variant> '<engine options json>'   -> replays the 168 typed cells with those engine options, then metrics + table (no sheets)
param([string]$Variant, [string]$Opts = '{}')
$sp = '<SESSION>\scratchpad'
$py = "$sp\venv\Scripts\python.exe"
Set-Location "$sp\text"
$env:NODE_OPTIONS = '--no-warnings'; $env:PYTHONIOENCODING = 'utf-8'
$env:ENGINE_OPTS = $Opts
$out = "$sp\text\out\$Variant"
New-Item -ItemType Directory -Force $out | Out-Null
node replay_text.mjs --lib '<REPO>\app\lib' --out $out --dst 0 2>&1 | Select-Object -Last 1
# pictures are not touched by typed-text options: reuse the baseline's picture results so the scorecard is complete
if (-not (Test-Path "$out\pics")) { Copy-Item "$sp\text\out\base\pics" "$out\pics" -Recurse -ErrorAction SilentlyContinue }
if (-not (Test-Path "$out\metrics_pics.json")) { Copy-Item "$sp\text\out\base\metrics_pics.json" "$out\metrics_pics.json" -ErrorAction SilentlyContinue }
Set-Content -Path "$out\run.json" -Value ('{"variant":"' + $Variant + '","opts":' + ($Opts -replace '\\','\\') + '}') -Encoding utf8
& $py -I tools_text.py metrics $Variant 2>&1 | Select-Object -Last 1
& $py -I tools_text.py table $Variant 2>&1 | Select-Object -Last 1
& $py -I tools_text.py compare base $Variant 2>&1 | Select-Object -Last 1
