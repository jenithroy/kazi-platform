# Digitizer help videos

The "?" button on `/digitizer` opens the help (`components/Digitizer/Help.jsx`): every feature with a short looping video. The
clips are **recordings of the real digitizer being used**, so they go out of date when the page's look or labels change. This
folder re-makes them. The words next to each clip are in `components/Digitizer/helpContent.js`.

Files it writes, one set per feature (the page serves them from `/videos/digitizer/`):

- `public/videos/digitizer/<id>.mp4` (H.264) and `<id>.webm` (VP9): 960 x 534, 20 fps, no sound, 3 to 16 seconds, 50 to 260 KB each
- `public/videos/digitizer/<id>.jpg`: the first frame, shown while the video loads (and kept under "reduced motion"); it is the clip's
  very first frame, so the picture does not change when the video starts

`<id>` is the `id` of the item in `helpContent.js`. There are 13: `add-picture`, `three-steps`, `colours-detail`, `my-threads`,
`background-cloth`, `crop-size`, `move-resize`, `text`, `shapes-trace`, `objects-list`, `stitches-play`, `save-files`, `view-keys`.

## Re-making them

```bash
# from app/, with the site being served: `npm run dev` (http://localhost:3000)
npm i --no-save playwright-core        # not a project dependency
#   and a Chromium: set CHROME_PATH to a chrome / chromium binary, or run `npx playwright-core install chromium`
#   and ffmpeg on the PATH, built with libx264 and libvpx-vp9 (the usual system one is)
node scripts/digitizer-help/scenarios.mjs                       # all 13 (about 5 minutes)
ONLY=my-threads node scripts/digitizer-help/scenarios.mjs       # one
```

Settings (environment variables): `BASE_URL` (default `http://localhost:3000`), `CHROME_PATH`, `OUT_DIR` (default
`public/videos/digitizer`), `WORK_DIR` (frames, the demo logo, and a screenshot named `<id>-FAILED.png` when a scenario breaks;
default a temp folder), `CRF_MP4` / `CRF_WEBM` (picture quality, lower is better and bigger; 30 and 36).

Do not run anything heavy while it records: a picture is really converted on screen (about 5 seconds for the demo logo), and a busy
computer makes that wait, and the clip, longer.

## How it works, and the traps

1. `lib.mjs` opens `/digitizer` in a 1100 x 700 window, does the set-up of a scenario (not recorded), then records what the scenario
   shows. The recording is Chrome DevTools `Page.startScreencast`: one JPEG per repaint with its time, which ffmpeg turns into a
   20 fps video (crop off the site's 88 px nav, scale to 960 wide). It is NOT Playwright's `recordVideo`: that wants a VP9 ffmpeg
   build the Playwright cache does not have (it starts, then writes no file), and pads and encodes poorly. Same reasoning as
   `scripts/digitizer-promo`.
2. A cursor you can see (a ring that shrinks and turns orange when pressed) is drawn into the page by an init script, and the Next dev
   badge is hidden, so a clip never shows either. The tour's "seen" flag is set, so it does not start over the page.
3. The example is a four-colour badge drawn on a canvas (`makeDemoLogo` in `lib.mjs`: navy, orange, white star, red dot, KAZI), not the
   Kazi logo, so that colours, threads and the background have something to show. The Kazi logo is used only where the clip is
   about trying a picture (`add-picture`).
4. Scenarios find things the way the page labels them (`getByRole("button", { name: "Crop" })`, `getByLabel("The words")` ...), so
   renaming a button or an `aria-label` breaks the scenario that uses it. The error names the locator, and
   `<WORK_DIR>/<id>-FAILED.png` shows where it stopped.
5. A handle on the canvas (resize, crop) has no element, so `findCursor` moves the pointer along a line and reads the cursor the stage
   sets (`ew-resize`, `nwse-resize` ...) to find it. If the picture's size changes, the line may need moving.
6. The player (`stitches-play`) must still be playing when "Pause" is pressed: the badge is about 9,600 stitches, 12 seconds at the
   Slow speed. At Normal it finishes in 3 seconds and the Pause button is gone.
7. **A clip has to be doing something from its first moment.** A visitor clicks a feature's name in the help and the clip starts from
   its first frame: a still picture for a second or two there reads as a video that is still loading (it was reported as exactly
   that, and the clips did open with 0.9 to 3 s of nothing, and held the converter's wait and the pointer's search for a handle).
   So: a scenario starts with a beat of about 200 ms and then its first action; the pauses between steps are the time it takes to see
   what changed (about a second, never more than 1.5 s); and anything a viewer should not sit through goes inside `h.skip(...)`:
   `await h.skip(() => h.settle())` for a picture being converted (a moment of "Working" stays, then the clip shows the result),
   `await h.skip(() => h.findCursor(...))` for the scan that finds a handle, `await h.skip(() => page.waitForSelector(...))` for any
   other wait on the engine. `skip` drops the frames painted inside it except the last, and `lib.mjs` closes the gap (`CUT_HOLD`, 0.45 s,
   is how long the picture before a cut stays). No picture is held longer than `MAX_HOLD` (1.8 s) either. Check a new clip with
   `ffmpeg -i x.mp4 -vf freezedetect=n=0.0008:d=0.9 -an -f null -`: it lists the stretches where the picture does not change; the first
   one should be short (the pointer travelling is fine, nothing at all is not).
8. Changing the pictures, the order of the controls or the label of a step means looking at the clip afterwards. A quick way: make a
   contact sheet, `ffmpeg -i x.mp4 -vf "fps=1/1.5,scale=480:-1,tile=3x4" -frames:v 1 sheet.png`.

## How the page loads them

`components/Digitizer/Help.jsx` starts a clip when it is chosen. Once a clip is playing it also fetches the next two (and the first one
when the pointer is on the "?" button) into memory, so choosing those starts at once with no network, even on a slow connection; a clip
that has not been fetched streams as usual, and one that is on its way is waited for rather than downloaded twice. Nothing is fetched
where the visitor has asked to save data. All of this is in `Help.jsx` (`warmClip`); a new clip needs no change to it.

## Adding a feature

Add an item to `helpContent.js` (an `id`, a title, the words), add a `rec("<id>", { setup, show })` in `scenarios.mjs`, run
`ONLY=<id> node scripts/digitizer-help/scenarios.mjs`, look at the clip, and commit the three files it wrote.
