# usage: powershell -File quick_cells.ps1 <name> <engineOpts> <fillOpts> <set typed|typed2> <font id> [<font id> ...]
#   a fast check of one or a few fonts: sews their cells (caps <= 6 mm) with replay_text_fill.mjs (DL_LIB for a scratch library), reads those cells only, prints the mean character error by size
param([string]$Name, [string]$EngineOpts = '', [string]$FillOpts = '', [string]$Set = 'typed', [Parameter(ValueFromRemainingArguments = $true)][string[]]$Fonts)
$sp = '<SESSION>\scratchpad'
$py = "$sp\venv\Scripts\python.exe"
function ToJson([string]$s) {
  if (-not $s -or $s.Trim() -in @('', '{}')) { return '{}' }
  $h = [ordered]@{}
  foreach ($kv in $s.Trim().Trim('{', '}').Split(',')) {
    if ($kv -match '^\s*"?([^:="]+)"?\s*[:=]\s*"?([^"]*?)"?\s*$') { $k = $Matches[1].Trim(); $v = $Matches[2].Trim(); if ($v -match '^-?[0-9.]+$') { $v = [double]$v }; $h[$k] = $v }
  }
  return ($h | ConvertTo-Json -Compress)
}
Set-Location "$sp\text"
$env:NODE_OPTIONS = '--no-warnings'; $env:PYTHONIOENCODING = 'utf-8'
$lib = if ($env:DL_LIB) { $env:DL_LIB } else { '<REPO>\app\lib' }
$env:ENGINE_OPTS = ToJson $EngineOpts; $env:FILL_OPTS = ToJson $FillOpts; $env:TYPED_SET = $Set
$out = "$sp\text\out\$Name"; New-Item -ItemType Directory -Force $out | Out-Null
$man = Get-Content "$sp\text\cache\$Set\manifest.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$ids = @($man | Where-Object { $Fonts -contains $_.font -and $_.size -le 6 } | ForEach-Object { $_.id })
$wants = ($ids -join ',')
node replay_text_fill.mjs --lib $lib --out $out --dst 0 --cells $wants 2>&1 | Select-Object -Last 1
& $py -I ocr_text.py $Name --cells $wants 2>&1 | Select-Object -Skip 1 -First 3
Remove-Item Env:TYPED_SET, Env:FILL_OPTS, Env:ENGINE_OPTS
