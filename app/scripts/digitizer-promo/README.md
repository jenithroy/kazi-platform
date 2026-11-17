# Digitizer promo clip

The dark band on the homepage ("Turn your image into stitches", `components/home/DigitizerPromo.jsx`) plays a 31 second
loop that is a **recording of the real digitizer being used**, with the site's own Kazi logo (`public/images/logo/kazi-logo-dark.png`)
as the example: the logo file is dragged onto the canvas and converted, the Design step is opened, a drag-box is drawn round the
logo's tiny "manufacturing" lettering (too small to stitch well) and the 10 shapes are deleted, the Stitches step is opened,
the stitching is played back slowly, and the DST file is saved. `build.mjs` drives `/digitizer` in headless Chromium with a
visible pointer, click ripples and a "file being dragged" chip, records every repaint, and encodes the result.

Files it writes (the page picks them up at the next build, `lib/public-assets.js`):

- `public/videos/digitizer-demo.mp4` and `.webm` (1600 x 900, 30 fps, no sound, about 0.9 and 1.1 MB)
- `public/images/home/digitizer-poster.webp` (the finished piece with the Download button; the poster, and the picture under
  reduced motion)

## Re-making it

Do this when the digitizer's look changes or you want another logo (`LOGO_FILE=path/to/logo.png`; the drag-box and the
hoop are tuned to the Kazi logo, so another picture means re-doing the "box the small lettering" step in `record()`).

```bash
# from app/, with the site being served: `npm run dev` (http://localhost:3000), or build and serve out/ yourself
npm i --no-save playwright-core        # not a project dependency
#   and a Chromium: set CHROME_PATH to a chrome.exe, or run `npx playwright-core install chromium`
#   and ffmpeg + ffprobe on the PATH
node scripts/digitizer-promo/build.mjs
npm run build                           # then look at the homepage band
```

Settings (environment variables): `BASE_URL`, `CHROME_PATH`, `LOGO_FILE`, `WORK_DIR` (frames go here, default a temp folder),
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
5. The hoop ("Medium", 200 x 200 mm) and the playback speed ("Slow", 800 stitches a second) are native `<select>`s: their pop-ups
   are not painted in a recording, so the script sets them directly (the hoop before the recording starts). At the default 100 mm
   hoop the logo's small lettering stitches raggedly and the Stitches panel lists more warnings; at "Normal" speed the sewing is over
   in about a second and a half.
6. The cloth colour is only how the design is shown (`CLOTH_SKIPS` is off in `lib/digitizer/convert.js`): picture colours like it
   are stitched, and changing it does not convert the picture again. (Before that, setting the cloth to the logo's own pine made the
   whole design vanish, which is why the demo keeps the default cream cloth: it still does, for its look.)
7. ffmpeg holds each frame until the next arrives, converts to a constant 30 fps (`fps=30` goes first: the concat demuxer
   leaves a timebase that `xfade` refuses to mix), and cross-fades the last 0.7 s into the first frame so the loop has no jump.
   The frames are full-range JPEGs (BT.601): they are converted to limited-range BT.709 and tagged, because left as they were
   Chrome's hardware VP9 decoder refused the WebM ("video decode error" on the first frame) on some GPUs.
8. The poster is the frame after the stitching finishes, taken with the pointer hidden.

9. The page is set up before it loads (`initPage`): the first-visit tour is switched off (`kazi.digitizer.tour`), the Objects list
   is open (`kazi.digitizer.settings`: its rows fill as the shapes are made and go when they are deleted, and the Delete button is in
   it), and the Next dev badge (`nextjs-portal`) is hidden, so a clip made against `npm run dev` does not show it.
10. **The drag-box is measured on this layout.** Its two corners (`onCanvas(...)` in `record()`) are fractions of the window with the
    Objects list open and the Medium hoop. Dragging left to right picks only the shapes the box holds whole (right to left, any it
    touches), so it starts on bare cloth below and to the left of the lettering, goes up and over it, and stays clear of the "A"
    above. If the panels move, stop after the Design step (a screenshot with a percentage grid over it is the quickest way to read
    the new numbers) and re-measure.

The script depends on the digitizer's labels and class names (`.dz-page` and `.dz-canvas-wrap` (the drop target and the canvas),
`.dz-canvas`, `.dz-seg--step`, `.dz-rail-badge` (the number of shapes), `.dz-obar` (the Delete button under the Objects list),
`.dz-card-ft` (Download DST), `Hoop size`, `Playback speed`, `Play the stitching`, ...). If a step times out after a UI change,
those are the first thing to look at; the drag-box step stops with an error if it did not pick up the lettering. Look at the result with the contact sheet command the script prints before you commit the files.
