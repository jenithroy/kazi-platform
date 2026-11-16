# Builds an ISOLATED copy of the site for the lettering round: HEAD of the repo + only the files changed in this round, in the scratchpad.
# Nothing in the user's working tree, .next or out folder is touched.
$scratch = '<SESSION>\scratchpad'
$repo = '<REPO>'
$site = "$scratch\site"
$log = "$scratch\faces\build_site3.log"
function Log($m) { $line = ('[{0:HH:mm:ss}] {1}' -f (Get-Date), $m); Add-Content -Path $log -Value $line; Write-Output $line }
Set-Content -Path $log -Value ''
if (Test-Path $site) { Log 'removing the old copy'; cmd /c "rmdir /s /q `"$site`"" }
New-Item -ItemType Directory -Force -Path $site | Out-Null
Set-Location $repo
Log 'git archive HEAD app'
git archive --format=tar -o "$scratch\faces\site_head3.tar" HEAD app
tar -xf "$scratch\faces\site_head3.tar" -C $site
Log ('extracted: {0} files' -f (Get-ChildItem -Recurse -File "$site\app" | Measure-Object).Count)
$mine = @(
  'app\components\Digitizer\InspectorPanel.jsx', 'app\components\Digitizer\PicturePanel.jsx', 'app\components\Digitizer\useDigitizer.js', 'app\components\Digitizer\digitizer.css',
  'app\lib\digitizer\convert.js', 'app\lib\digitizer\model.js', 'app\lib\digitizer\legible.js', 'app\lib\digitizer\text.js',
  'app\lib\embroidery\trace\index.js', 'app\lib\embroidery\trace\lettering.js',
  'app\lib\embroidery\geometry\thin.js', 'app\lib\embroidery\stitch\engine.js'
)
foreach ($f in $mine) { New-Item -ItemType Directory -Force -Path (Split-Path "$site\$f") | Out-Null; Copy-Item -Force -LiteralPath "$repo\$f" -Destination "$site\$f" }
New-Item -ItemType Directory -Force -Path "$site\app\public\fonts\digitizer" | Out-Null
Copy-Item -Force "$repo\app\public\fonts\digitizer\*" "$site\app\public\fonts\digitizer\"
Log ('overlaid {0} files and the fonts' -f $mine.Count)
Log 'copying node_modules (robocopy)'
robocopy "$repo\app\node_modules" "$site\app\node_modules" /MIR /MT:16 /NFL /NDL /NJH /NJS /NP | Out-Null
Log ('node_modules copied: {0}' -f (Test-Path "$site\app\node_modules\next\package.json"))
Set-Location "$site\app"
Log 'npm run build'
$env:NEXT_TELEMETRY_DISABLED = '1'
cmd /c "npm run build >> `"$log`" 2>&1"
Log ('build exit code: {0}' -f $LASTEXITCODE)
Log ('out exists: {0}; digitizer page: {1}; font: {2}' -f (Test-Path "$site\app\out"), (Test-Path "$site\app\out\digitizer\index.html"), (Test-Path "$site\app\out\fonts\digitizer\kazi-heavy.woff2"))
Log 'DONE'
