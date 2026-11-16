# usage: powershell -File sweep_weight.ps1 name=k=v;k=v [name=k=v;k=v ...]   (engine options separated by ; inside one spec)
# sews the typed cells (replay_text_fill.mjs, the repository's lib) with each setting into out/<name>, then prints how heavy the stitched letters are against the drawn ones (weight_probe.py) next to fin2 (old), cur (current) and dade
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Specs)
$sp = '<SESSION>\scratchpad'
$py = "$sp\venv\Scripts\python.exe"
Set-Location "$sp\text"
$env:NODE_OPTIONS = '--no-warnings'; $env:PYTHONIOENCODING = 'utf-8'; $env:TYPED_SET = 'typed'
Remove-Item Env:DL_LIB -ErrorAction SilentlyContinue
$names = @()
foreach ($spec in $Specs) {
  $i = $spec.IndexOf('=')
  $name = $spec.Substring(0, $i); $opts = $spec.Substring($i + 1)
  $h = [ordered]@{}
  foreach ($kv in $opts.Split(';')) { if ($kv -match '^\s*([^=]+)=(.*)$') { $key = $Matches[1].Trim(); $v = $Matches[2].Trim(); if ($v -match '^-?[0-9.]+$') { $v = [double]$v }; $h[$key] = $v } }
  $env:ENGINE_OPTS = ($h | ConvertTo-Json -Compress); if ($h.Count -eq 0) { $env:ENGINE_OPTS = '{}' }
  $env:FILL_OPTS = '{}'
  $out = "$sp\text\out\$name"; New-Item -ItemType Directory -Force $out | Out-Null
  node replay_text_fill.mjs --lib '<REPO>\app\lib' --out $out --dst 0 2>&1 | Select-Object -Last 1 | ForEach-Object { "$name : $($_.Substring(0, [Math]::Min(60, $_.Length)))   $($env:ENGINE_OPTS)" }
  $names += $name
}
Remove-Item Env:ENGINE_OPTS, Env:FILL_OPTS, Env:TYPED_SET -ErrorAction SilentlyContinue
& $py -I "$sp\dade_text\weight_probe.py" typed fin2 cur @names dade 2>&1 | Out-String -Width 250
