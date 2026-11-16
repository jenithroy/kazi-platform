# usage: powershell -File sweep_weight_ocr.ps1 name=k=v;k=v [...]  : sew (typed, repository lib), then read every variant with the text reader (cells <= 6 mm) and print the character error next to the weight ratio
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Specs)
$sp = '<SESSION>\scratchpad'
$py = "$sp\venv\Scripts\python.exe"
Set-Location "$sp\text"
$env:NODE_OPTIONS = '--no-warnings'; $env:PYTHONIOENCODING = 'utf-8'
Remove-Item Env:DL_LIB, Env:TYPED_SET -ErrorAction SilentlyContinue
$names = @()
foreach ($spec in $Specs) {
  $i = $spec.IndexOf('=')
  $name = $spec.Substring(0, $i); $opts = $spec.Substring($i + 1)
  $h = [ordered]@{}
  foreach ($kv in $opts.Split(';')) { if ($kv -match '^\s*([^=]+)=(.*)$') { $key = $Matches[1].Trim(); $v = $Matches[2].Trim(); if ($v -match '^-?[0-9.]+$') { $v = [double]$v }; $h[$key] = $v } }
  $env:ENGINE_OPTS = if ($h.Count) { ($h | ConvertTo-Json -Compress) } else { '{}' }
  $env:FILL_OPTS = '{}'; $env:TYPED_SET = 'typed'
  $out = "$sp\text\out\$name"; New-Item -ItemType Directory -Force $out | Out-Null
  node replay_text_fill.mjs --lib '<REPO>\app\lib' --out $out --dst 0 2>&1 | Select-Object -Last 1 | ForEach-Object { "$name sewn   $($env:ENGINE_OPTS)" }
  Remove-Item Env:ENGINE_OPTS, Env:FILL_OPTS, Env:TYPED_SET -ErrorAction SilentlyContinue
  $names += $name
}
foreach ($name in $names) {
  Remove-Item "$sp\text\out\$name\ocr_p*.json" -ErrorAction SilentlyContinue
  & powershell -NoProfile -File "$sp\text\ocr_variant.ps1" $name 2>&1 | Select-Object -First 1 | Out-Null
  "== $name read"
}
"##### weight (stitched ink / drawn ink; 1.00 = as drawn)"
& $py -I "$sp\dade_text\weight_probe.py" typed fin2 cur @names 2>&1 | Out-String -Width 250
"##### characters wrong (OCR)"
foreach ($name in (@('fin2', 'cur') + $names)) { "--- $name"; & $py -I "$sp\dade_text\cmp_dade.py" typed $name $name 2>&1 | Select-Object -Skip 1 -First 5 | ForEach-Object { ($_ -replace '\s{2,}', '  ').Substring(0, [Math]::Min(70, $_.Length)) } }
"##### done"
