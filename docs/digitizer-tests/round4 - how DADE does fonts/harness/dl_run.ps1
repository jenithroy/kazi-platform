# usage: powershell -File dl_run.ps1 <name> <engineOpts> <fillOpts> [typed|typed2|both]
#   opts are written as k=v,k=v (or {k:v,k:v}; PowerShell 5.1 strips the quotes of JSON passed to a native program, so they are rebuilt here)
#   sews the typed cells with replay_text_fill.mjs (the site's library, a fill override on the text object) into out/<name>, then reads them (OCR) and compares with dade and fin2
param([string]$Name, [string]$EngineOpts = '', [string]$FillOpts = '', [string]$Sets = 'typed')
$sp = '<SESSION>\scratchpad'
$py = "$sp\venv\Scripts\python.exe"
function ToJson([string]$s) {
  if (-not $s -or $s.Trim() -in @('', '{}')) { return '{}' }
  $h = [ordered]@{}
  foreach ($kv in $s.Trim().Trim('{', '}').Split(',')) {
    if ($kv -match '^\s*"?([^:="]+)"?\s*[:=]\s*"?([^"]*?)"?\s*$') {
      $k = $Matches[1].Trim(); $v = $Matches[2].Trim()
      if ($v -match '^-?[0-9.]+$') { $v = [double]$v }
      $h[$k] = $v
    }
  }
  return ($h | ConvertTo-Json -Compress)
}
Set-Location "$sp\text"
$env:NODE_OPTIONS = '--no-warnings'; $env:PYTHONIOENCODING = 'utf-8'
$lib = if ($env:DL_LIB) { $env:DL_LIB } else { '<REPO>\app\lib' }
$env:ENGINE_OPTS = ToJson $EngineOpts; $env:FILL_OPTS = ToJson $FillOpts
$out = "$sp\text\out\$Name"
New-Item -ItemType Directory -Force $out | Out-Null
$setList = if ($Sets -eq 'both') { @('typed', 'typed2') } else { @($Sets) }
foreach ($s in $setList) {
  $env:TYPED_SET = $s
  $t0 = Get-Date
  node replay_text_fill.mjs --lib $lib --out $out --dst 0 2>&1 | Select-Object -Last 1
  & powershell -NoProfile -File "$sp\text\ocr_variant.ps1" $Name 2>&1 | Select-Object -First 1
  & $py -I "$sp\dade_text\cmp_dade.py" $s $Name dade 2>&1 | Select-Object -First 5
  & $py -I "$sp\dade_text\cmp_dade.py" $s $Name fin2 2>&1 | Select-Object -First 5
  "== $Name / $s done in $([int]((Get-Date) - $t0).TotalSeconds) s  (engine $env:ENGINE_OPTS, fill $env:FILL_OPTS)"
}
Remove-Item Env:TYPED_SET -ErrorAction SilentlyContinue
Remove-Item Env:FILL_OPTS -ErrorAction SilentlyContinue
Remove-Item Env:ENGINE_OPTS -ErrorAction SilentlyContinue
