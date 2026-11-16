# Builds an ISOLATED copy of the site: HEAD of the repo + only the digitizer files I changed (not the other session's unfinished work), in the scratchpad.
# Nothing in the user's working tree, .next or out folder is touched.
$ErrorActionPreference = 'Stop'
$scratch = '<SESSION>\scratchpad'
$repo = '<REPO>'
$site = "$scratch\site"
$log = "$scratch\faces\build_site.log"
function Log($m) { $line = ('[{0:HH:mm:ss}] {1}' -f (Get-Date), $m); Add-Content -Path $log -Value $line; Write-Output $line }
Set-Content -Path $log -Value ''
if (Test-Path $site) { Log 'removing the old copy'; Remove-Item -Recurse -Force $site }
New-Item -ItemType Directory -Force -Path $site | Out-Null
Set-Location $repo
Log 'git archive HEAD app'
git archive --format=tar -o "$scratch\faces\site_head.tar" HEAD app
tar -xf "$scratch\faces\site_head.tar" -C $site
Log ('extracted: {0} files' -f (Get-ChildItem -Recurse -File "$site\app" | Measure-Object).Count)
$mine = @(
  'app\components\Digitizer\PicturePanel.jsx', 'app\components\Digitizer\useDigitizer.js',
  'app\lib\digitizer\convert.js', 'app\lib\digitizer\segment.js', 'app\lib\digitizer\segment.worker.js', 'app\lib\digitizer\segmentClient.js',
  'app\lib\digitizer\faces.js', 'app\lib\digitizer\faceFinder.js',
  'app\lib\embroidery\trace\index.js', 'app\lib\embroidery\trace\regionPalette.js', 'app\lib\embroidery\trace\regions.js',
  'app\public\mediapipe\NOTICE.txt', 'app\public\mediapipe\face_landmarker.task'
)
foreach ($f in $mine) { Copy-Item -Force -LiteralPath "$repo\$f" -Destination "$site\$f"; }
Log ('overlaid {0} files' -f $mine.Count)
Log 'copying node_modules (robocopy)'
robocopy "$repo\app\node_modules" "$site\app\node_modules" /MIR /MT:16 /NFL /NDL /NJH /NJS /NP | Out-Null
Log ('node_modules copied: {0}' -f (Test-Path "$site\app\node_modules\next\package.json"))
Set-Location "$site\app"
Log 'npm run build'
$env:NEXT_TELEMETRY_DISABLED = '1'
npm run build *>> $log
Log ('build exit code: {0}' -f $LASTEXITCODE)
Log ('out exists: {0}; digitizer page: {1}; model: {2}' -f (Test-Path "$site\app\out"), (Test-Path "$site\app\out\digitizer\index.html"), (Test-Path "$site\app\out\mediapipe\face_landmarker.task"))
Log 'DONE'
