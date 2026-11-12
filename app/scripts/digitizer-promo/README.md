# Digitizer promo clip

The dark band on the homepage ("Turn your image into stitches", `components/home/DigitizerPromo.jsx`) plays a 25 second
loop that is a **recording of the real digitizer being used**: a logo file is dragged onto the canvas and converted, the
Design step is opened, the sun is picked and given a new thread colour from the colour chart, the Stitches step is opened,
the stitching is played back, and the DST file is saved. `build.mjs` drives `/digitizer` in headless Chromium with a visible
pointer, click ripples and a "file being dragged" chip, records every repaint, and encodes the result.

Files it writes (the page picks them up at the next build, `lib/public-assets.js`):

- `public/videos/digitizer-demo.mp4` and `.webm` (1600 x 900, 30 fps, no sound, about 0.9 and 1.2 MB)
- `public/images/home/digitizer-poster.webp` (the finished piece with the Download button; the poster, and the picture under
  reduced motion)

## Re-making it

Do this when the digitizer's look changes or you want another logo.

```bash
# from app/, with the site being served: `npm run dev` (http://localhost:3000), or build and serve out/ yourself
npm i --no-save playwright-core        # not a project dependency
#   and a Chromium: set CHROME_PATH to a chrome.exe, or run `npx playwright-core install chromium`
#   and ffmpeg + ffprobe on the PATH
node scripts/digitizer-promo/build.mjs
npm run build                           # then look at the homepage band
```

Settings (environment variables): `BASE_URL`, `CHROME_PATH`, `WORK_DIR` (frames go here, default a temp folder),
`OUT_VIDEOS` / `OUT_IMAGES` (where the files are written), `CRF_MP4` / `CRF_WEBM` (picture quality, lower is better and
bigger). The dev server works but its first load compiles the page; a production build is steadier.

## How it works, and the traps

1. The editor is made to fill a 1200 x 675 window (a style override on `.dz-page`), so the clip is 16:9 with the whole tool
   in view.
2. The recording is Chrome DevTools `Page.startScreencast`: one JPEG per repaint with its timestamp. It is NOT Playwright's
   `recordVideo` (that wants its own ffmpeg build, pads the frame and encodes poorly). The screencast delivers frames at the
   size of the viewport in CSS pixels (1200 x 675, whatever the device scale factor), then ffmpeg scales them up to 1600 x 900,
   so thin lines are slightly soft; raise `VW`/`VH` (a bigger window means smaller text in the clip) if that matters.
3. Every mouse move is time-based (`glide`), so "a 0.8 s move" takes 0.8 s however busy the machine is. Waits are for the tool
   being idle (`idle`, `shapes`, `stitchesReady`), not fixed sleeps, so the clip does not depend on how fast the engine is.
4. The editor override uses `z-index: 1000`. The site's nav, banner and WhatsApp button are below that, but the tool's own
   pop-ups (the colour chart, 1400+) are portalled to `<body>` and must stay above it: a larger value hides the chart.
5. ffmpeg holds each frame until the next arrives, converts to a constant 30 fps (`fps=30` goes first: the concat demuxer
   leaves a timebase that `xfade` refuses to mix), and cross-fades the last 0.7 s into the first frame so the loop has no jump.
6. The poster is the frame after the stitching finishes, taken with the pointer hidden.

The script depends on the digitizer's labels and class names (`.dz-stage`, `.dz-seg--step`, `.dz-orow`, `Play the stitching`,
`Download DST`, ...). If a step times out after a UI change, those are the first thing to look at. Look at the result with the
contact sheet command the script prints before you commit the files.
