# usage: powershell -File sweep2_many.ps1 name=optsjson [name=optsjson ...]   replays the wider font set (typed2, 180 cells) with those engine options into out/<name>/typed2
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Specs)
$sp = '<SESSION>\scratchpad'
Set-Location "$sp\text"
$env:NODE_OPTIONS = '--no-warnings'; $env:PYTHONIOENCODING = 'utf-8'; $env:TYPED_SET = 'typed2'
foreach ($spec in $Specs) {
  $i = $spec.IndexOf('=')
  $name = $spec.Substring(0, $i)
  $opts = $spec.Substring($i + 1)
  $env:ENGINE_OPTS = $opts
  $out = "$sp\text\out\$name"
  New-Item -ItemType Directory -Force $out | Out-Null
  $t0 = Get-Date
  node replay_text.mjs --lib '<REPO>\app\lib' --out $out --dst 0 2>&1 | Select-Object -Last 1
  "== $name ($opts) done in $([int]((Get-Date) - $t0).TotalSeconds) s"
}
Remove-Item Env:TYPED_SET
