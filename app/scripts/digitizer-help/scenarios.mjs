// The help videos, one scenario per feature (see README.md). Run them all, or one:   ONLY=my-threads node scripts/digitizer-help/scenarios.mjs
// The ids are the file names in public/videos/digitizer and the ids in components/Digitizer/helpContent.js.
//
// Pacing: a clip must show something happening from its first moment (it starts when a visitor clicks its name in the help, and a still
// picture there looks like a video that is still loading), so a scenario starts on its first action after a beat of 200 ms or so, and the
// pauses between steps are the time it takes to see what changed (about a second), not longer. What a viewer should not sit through (a
// picture being converted, the stitches being made, a scan for a handle) goes inside h.skip(...), which leaves it out of the clip.
import { rec, sleep, browser } from "./lib.mjs";

const at = (x, y) => ({ x, y, width: 0, height: 0 }); // a point as a "box", for the cursor helpers
// A change that makes the picture again: a moment of "Working", then the converter's wait is cut and the clip shows the result.
const reconvert = async (page, h) => { await sleep(400); await h.skip(() => h.settle()); await sleep(500); };

/* 1. add a picture: the empty page, then the Kazi logo is tried */
await rec("add-picture", {
  async show(page, h) {
    await sleep(200);
    await h.click(page.getByRole("button", { name: "Try the Kazi logo" }), { after: 250 });
    await h.skip(() => page.waitForSelector(".dz-stats b", { timeout: 90000 }));
    await sleep(1700);
  },
});

/* 2. the three steps */
await rec("three-steps", {
  async setup(page, h) { await h.loadPicture(); await h.ready(); },
  async show(page, h) {
    await sleep(200);
    await h.click(h.step("Design"));
    await sleep(1100);
    await h.click(h.step("Stitches"));
    await sleep(1500);
    await h.click(h.step("Picture"));
    await sleep(800);
  },
});

/* 3. colours and detail */
await rec("colours-detail", {
  async setup(page, h) { await h.loadPicture(); },
  async show(page, h) {
    await sleep(200);
    // fade the picture so the shapes show
    const show = page.getByLabel("How strongly the picture shows");
    const sb = await show.boundingBox();
    await h.click(at(sb.x + sb.width * 0.22, sb.y + sb.height / 2));
    await sleep(450);
    await h.wheelPanel(330);
    const colours = page.getByRole("radiogroup", { name: "Number of colours" });
    await h.click(colours.getByRole("radio", { name: "2", exact: true }));
    await reconvert(page, h);
    await h.click(h.step("Design"));      // what two colours make
    await sleep(1200);
    await h.click(h.step("Picture"));
    await h.click(colours.getByRole("radio", { name: "Auto", exact: true }));
    await reconvert(page, h);
    const detail = page.getByLabel("Level of detail");
    const db = await detail.boundingBox();
    await h.click(at(db.x + 4, db.y + db.height / 2));
    await reconvert(page, h);
    await h.click(at(db.x + db.width - 3, db.y + db.height / 2));
    await reconvert(page, h);
  },
});

/* 4. my threads */
await rec("my-threads", {
  async setup(page, h) { await h.loadPicture(); await h.wheelPanel(215, 4); },
  async show(page, h) {
    await sleep(200);
    await h.click(page.getByRole("button", { name: "Add a thread I have" }));
    const dlg = page.getByRole("dialog", { name: "Add the threads I have" });
    await sleep(350);
    for (const n of ["Red", "Navy", "Gold", "White"]) await h.click(dlg.getByRole("button", { name: n, exact: true }), { after: 400 });
    await h.click(dlg.getByRole("button", { name: "Done" }));
    await reconvert(page, h);
    await h.click(h.step("Design"));
    await sleep(1500);
  },
});

/* 5. background and cloth */
await rec("background-cloth", {
  async setup(page, h) { await h.loadPicture(); await h.click(h.step("Design"), { pause: 100 }); },
  async show(page, h) {
    await sleep(200);
    await h.click(page.getByRole("button", { name: /^Cloth colour/ }));
    const chart = page.getByRole("dialog", { name: "Thread colours" });
    await sleep(300);
    await h.click(chart.getByRole("button", { name: "Dark navy", exact: true }), { after: 700 });
    await sleep(900);
    await h.click(h.step("Picture"));
    await h.wheelPanel(560);
    await h.click(page.locator("label.dz-toggle", { hasText: "Leave out the background" }), { dx: -90 });
    await reconvert(page, h);
    await h.click(h.step("Design"));
    await sleep(1500);
  },
});

/* 6. crop and size */
await rec("crop-size", {
  async setup(page, h) { await h.loadPicture(); },
  async show(page, h) {
    await sleep(200);
    await h.click(page.getByRole("button", { name: "Crop", exact: true }));
    await sleep(600); // (the picture is laid out again: the hoop is read after this)
    const hp = await h.hoop();
    const scan = []; for (let x = hp.l + 80; x < hp.r + 40; x += 4) scan.push([x, hp.y]);
    const hits = await h.skip(() => h.findCursor("ew-resize", scan)); // the pointer's search for the handle is not the demonstration
    const handle = hits.length ? hits[hits.length - 1] : [hp.r - 30, hp.y];
    await h.dragBy({ x: handle[0], y: handle[1] }, -110, 0);
    await sleep(350);
    const top = [];
    for (let y = hp.t + 30; y < hp.y; y += 4) top.push([hp.x, y]);
    const th = await h.skip(() => h.findCursor("ns-resize", top));
    if (th.length) await h.dragBy({ x: th[0][0], y: th[0][1] }, 0, 70);
    await sleep(350);
    await h.click(page.getByRole("button", { name: "Done cropping" }));
    await sleep(350);
    const w = page.getByLabel("Picture width in millimetres");
    await h.click(w);
    await page.keyboard.type("70", { delay: 120 });
    await page.keyboard.press("Enter");
    await sleep(1300);
  },
});

/* 7. move, resize and turn */
await rec("move-resize", {
  async setup(page, h) { await h.loadPicture(); await h.click(h.step("Design"), { pause: 100 }); },
  async show(page, h) {
    const hp = await h.hoop();
    await sleep(200);
    await h.click(at(hp.x - 120, hp.y + 40), { after: 600 }); // the big navy disc
    // its bottom-right corner handle, found along the diagonal from the middle (the search is left out of the clip)
    const diag = []; for (let d = 80; d < 340; d += 4) diag.push([hp.x + d, hp.y + d * 0.9]);
    const corner = await h.skip(() => h.findCursor("nwse-resize", diag));
    if (corner.length) await h.dragBy({ x: corner[0][0], y: corner[0][1] }, -70, -62);
    await sleep(350);
    await h.dragBy({ x: hp.x - 70, y: hp.y + 10 }, 80, 36);
    await sleep(450);
    const x = page.getByLabel("X position in millimetres");
    await h.click(x);
    await page.keyboard.type("-6", { delay: 130 });
    await page.keyboard.press("Enter");
    await sleep(1100);
  },
});

/* 8. text */
await rec("text", {
  async show(page, h) {
    await sleep(200);
    await h.click(h.tool("Text"));
    await sleep(500);
    const hp = await h.hoop();
    await h.click(at(hp.x - 70, hp.y - 10), { after: 700 });
    const words = page.getByLabel("The words");
    await h.click(words);
    await page.keyboard.press("Control+A");
    await page.keyboard.type("KAZI", { delay: 160 });
    await sleep(650);
    const font = page.locator('select[aria-label="Font"]');
    await h.moveTo(font);
    await font.selectOption({ index: 3 });
    await sleep(900);
    const size = page.getByLabel("Letter height in millimetres");
    await h.click(size);
    await page.keyboard.type("16", { delay: 120 });
    await page.keyboard.press("Enter");
    await sleep(650);
    await h.click(page.getByRole("button", { name: /^Fill colour/ }));
    await sleep(300);
    await h.click(page.getByRole("dialog", { name: "Thread colours" }).getByRole("button", { name: "Royal blue", exact: true }), { after: 700 });
    await sleep(900);
  },
});

/* 9. shapes and trace by hand */
await rec("shapes-trace", {
  async show(page, h) {
    const hp = await h.hoop();
    await sleep(200);
    await h.click(h.tool("Rectangle"));
    await h.dragBy({ x: hp.x - 170, y: hp.y - 120 }, 120, 80);
    await sleep(300);
    await h.click(h.tool("Ellipse"));
    await h.dragBy({ x: hp.x + 20, y: hp.y - 120 }, 130, 80);
    await sleep(300);
    await h.click(h.tool("Trace by hand"));
    await sleep(300);
    const pts = [[-150, 30], [-60, 20], [10, 70], [-20, 130], [-120, 125]];
    for (const [dx, dy] of pts) await h.click(at(hp.x + dx, hp.y + dy), { steps: 14, after: 380 });
    await h.click(at(hp.x - 150, hp.y + 30), { steps: 14, after: 300 }); // back to the first point closes it
    await sleep(1100);
  },
});

/* 10. the Objects list */
await rec("objects-list", {
  async setup(page, h) { await h.loadPicture(); await h.click(h.step("Design"), { pause: 100 }); },
  async show(page, h) {
    await sleep(200);
    await h.click(page.getByRole("button", { name: /^Objects \(/ }));
    await sleep(500);
    const rows = page.locator(".dz-orow");
    await h.click(rows.nth(1).locator(".dz-oname"));
    await sleep(650);
    await h.click(rows.nth(2).getByRole("button", { name: /^Hide/ }));
    await sleep(750);
    await h.click(rows.nth(2).getByRole("button", { name: /^Show/ }));
    await h.click(rows.nth(3).getByRole("button", { name: /^Lock/ }));
    await sleep(500);
    await rows.nth(4).locator(".dz-oname").hover();
    await rows.nth(4).dragTo(rows.nth(1));
    await sleep(1000);
  },
});

/* 11. watch it being sewn */
await rec("stitches-play", {
  async setup(page, h) { await h.loadPicture(); await h.ready(); await h.click(h.step("Stitches"), { pause: 100 }); await h.ready(); await sleep(800); },
  async show(page, h) {
    await sleep(150);
    const speed = page.locator('select[aria-label="Playback speed"]');
    await h.moveTo(speed);
    await speed.selectOption({ label: "Slow" });
    await sleep(300);
    await h.click(page.getByRole("button", { name: "Play the stitching" }));
    await sleep(4400);
    await h.click(page.getByRole("button", { name: "Pause" }));
    const slider = page.getByLabel("How far through the stitching");
    const sb = await slider.boundingBox();
    await h.click(at(sb.x + sb.width * 0.25, sb.y + sb.height / 2), { after: 900 });
    await h.click(at(sb.x + sb.width * 0.7, sb.y + sb.height / 2), { after: 900 });
    await h.click(page.getByRole("button", { name: "Show all stitches" }));
    await sleep(700);
  },
});

/* 12. save the stitch file */
await rec("save-files", {
  async setup(page, h) { await h.loadPicture(); await h.ready(); await h.click(h.step("Stitches"), { pause: 100 }); await h.ready(); await sleep(600); },
  async show(page, h) {
    await sleep(200);
    await h.wheelPanel(640);
    const tiles = page.locator(".dz-format");
    const n = await tiles.count();
    for (let i = 0; i < Math.min(n, 4); i++) { await h.moveTo(tiles.nth(i), { pause: 450 }); }
    await h.click(page.locator('.dz-card-ft button:has-text("Download DST")'), { after: 800 });
    await h.click(page.getByRole("button", { name: "Save design" }), { after: 700 });
    await sleep(300);
  },
});

/* 13. zoom, move and keys */
await rec("view-keys", {
  async setup(page, h) { await h.loadPicture(); await h.click(h.step("Design"), { pause: 100 }); },
  async show(page, h) {
    const hp = await h.hoop();
    await sleep(150);
    await h.moveTo(at(hp.x + 40, hp.y - 20));
    for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, -200); await sleep(120); }
    await sleep(550);
    await page.keyboard.down("Space");
    await h.dragBy({ x: hp.x + 40, y: hp.y - 20 }, -150, 80, { steps: 26 });
    await page.keyboard.up("Space");
    await sleep(450);
    await page.keyboard.press("f");
    await sleep(850);
    await h.click(page.getByRole("button", { name: "Rulers" }), { after: 800 });
    await h.click(page.getByRole("button", { name: "Rulers" }), { after: 350 });
    await h.moveTo(at(hp.x + 60, hp.y + 90));
    await page.keyboard.press("r"); await sleep(650);
    await page.keyboard.press("o"); await sleep(650);
    await page.keyboard.press("v"); await sleep(650);
  },
});

await browser.close();
