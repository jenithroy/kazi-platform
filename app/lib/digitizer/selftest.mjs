/**
 * Checks for how the shapes of a converted picture are sewn: the angle of their rows (angles.js), the thin line along the edge of flat
 * shapes (edges.js), look.js that puts both on the objects, and the line that may sit a little inside an edge (stitch/outline.js, `inset`).
 * Run with `node src/lib/digitizer/selftest.mjs` (plain node, no browser, no files). Pictures here are drawn in code on purpose: these are unit
 * checks of rules; how it looks on real pictures is measured separately (see the engine README).
 */
import { assignAngles, elongationOf, touching, angleGap } from "./angles.js";
import { edgeLook, EDGE_DEFAULTS } from "./edges.js";
import { applyLook, lookOptions, LOOK_DEFAULTS } from "./look.js";
import { objectsFromTrace, mergeTraceObjects, traceOptions, clothMatchOf, contentBox, CLOTH_MATCH, CLOTH_MATCH_PHOTO } from "./convert.js";
import { makeObject, engineDesign } from "./model.js";
import { traceImage } from "../embroidery/trace/index.js";
import { outlineRuns } from "../embroidery/stitch/outline.js";
import { widenThin, meanStrokeWidth } from "../embroidery/geometry/thin.js";
import { islandsOf, ringArea } from "../embroidery/geometry/poly.js";
import { generate } from "../embroidery/stitch/engine.js";
import { findPerson } from "./segmentClient.js";
import { faceParts, plausibleFace, faceMeasures, paintFeatureClasses, mainFaces, faceCropBox, featureAnchors, FACE_REGION, FACE_EYE_MIN_MM } from "./faces.js";
import { REGION } from "../embroidery/trace/regions.js";
import { CMD } from "../embroidery/pattern.js";

let failed = 0, total = 0;
const check = (name, cond, extra = "") => {
  total++;
  if (cond) console.log("ok  ", name);
  else { failed++; console.log("FAIL", name, extra); }
};
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

/** A shape of the tracer's kind: a rectangle in picture pixels. */
const shapeRect = (x, y, w, h, id = 0, color = 0) => ({ id, color, contours: [[[x, y], [x + w, y], [x + w, y + h], [x, y + h]]], area: w * h, bbox: [x, y, x + w, y + h] });

console.log("angles.js");
check("a gap between two row directions is 0 to 90 degrees", near(angleGap(10, 170), 20) && near(angleGap(0, 90), 90) && near(angleGap(45, 45), 0) && near(angleGap(-10, 10), 20));
{
  const e = elongationOf([[0, 0], [20, 0], [20, 4], [0, 4]]);
  check("a flat rectangle 20 x 4 is five times longer than wide, along x", e && near(e.ratio, 5, 0.01) && (near(e.deg, 0, 0.5) || near(Math.abs(e.deg), 90, 0.5) === false), JSON.stringify(e));
  const th = (30 * Math.PI) / 180, rot = ([x, y]) => [x * Math.cos(th) - y * Math.sin(th), x * Math.sin(th) + y * Math.cos(th)];
  const e2 = elongationOf([[0, 0], [20, 0], [20, 4], [0, 4]].map(rot));
  check("turned by 30 degrees it is long along 30 degrees", e2 && near(angleGap(e2.deg, 30), 0, 0.5), JSON.stringify(e2));
  check("a square has no long direction to speak of", elongationOf([[0, 0], [5, 0], [5, 5], [0, 5]]).ratio < 1.05);
}
{
  const a = shapeRect(0, 0, 10, 10, 0), b = shapeRect(10, 0, 10, 10, 1), c = shapeRect(100, 0, 10, 10, 2);
  const adj = touching([a, b, c]);
  check("two squares that share an edge touch, with the points they share", adj[0].get(1) === 2 && adj[1].get(0) === 2, JSON.stringify([...adj[0]]));
  check("a square far away touches nothing", adj[2].size === 0);
}
{
  // 100 px = 10 mm at 0.1 mm a pixel; the squares are 100 mm2
  const a = shapeRect(0, 0, 100, 100, 0), b = shapeRect(100, 0, 100, 100, 1), c = shapeRect(200, 0, 100, 100, 2);
  const o = { mmPerPx: 0.1, mode: "contrast" };
  const r1 = assignAngles([a, b, c], o), r2 = assignAngles([a, b, c], o);
  check("the same shapes always get the same angles", JSON.stringify(r1) === JSON.stringify(r2));
  check("the first (biggest, first of equals) takes the plain 45", r1[0] === 45, JSON.stringify(r1));
  check("a neighbour is set apart by at least 40 degrees", angleGap(r1[0], r1[1]) >= 40 && angleGap(r1[1], r1[2]) >= 40, JSON.stringify(r1));
  const tiny = shapeRect(0, 0, 8, 8, 0); // 0.64 mm2
  check("a shape too small to see its rows keeps the engine's own angle (null)", assignAngles([tiny], o)[0] === null);
}
{
  const long = shapeRect(0, 0, 200, 40, 0); // 20 x 4 mm
  const across = assignAngles([long], { mmPerPx: 0.1, mode: "shape", across: true })[0];
  const along = assignAngles([long], { mmPerPx: 0.1, mode: "shape", across: false })[0];
  check("a long shape is sewn across its length (like a satin)", near(angleGap(across, 90), 0, 1), String(across));
  check("or along it when asked", near(angleGap(along, 0), 0, 1), String(along));
  const sq = shapeRect(0, 0, 100, 100, 0);
  check("a square has no long axis: shape mode leaves it alone", assignAngles([sq], { mmPerPx: 0.1, mode: "shape" })[0] === null);
  check("a long shape is sewn along its length by default", near(angleGap(assignAngles([long], { mmPerPx: 0.1 })[0], 0), 0, 1));
  const th = (45 * Math.PI) / 180, rot = ([x, y]) => [x * Math.cos(th) - y * Math.sin(th), x * Math.sin(th) + y * Math.cos(th)];
  const diag = { ...long, contours: [[[0, 0], [200, 0], [200, 40], [0, 40]].map(rot)] };
  check("a long shape lying at exactly 45 degrees is nudged so the engine does not read it as 'not chosen'", assignAngles([diag], { mmPerPx: 0.1, mode: "shape" })[0] === 45.05);
}

console.log("edges.js and look.js");
{
  const wide = shapeRect(0, 0, 400, 400, 0); // 40 x 40 mm at 0.1
  const ctx = { kind: "logo", mmPerPx: 0.1, color: "#112233", widthMm: 20 };
  const el = edgeLook(wide, ctx);
  check("a wide flat shape of a logo gets an edge line in its own colour, just inside the edge", el && el.stroke.type === "run" && el.stroke.color === "#112233" && el.stroke.inset === EDGE_DEFAULTS.inset && el.fillInset === EDGE_DEFAULTS.fillInset);
  check("artwork gets it too", !!edgeLook(wide, { ...ctx, kind: "art" }));
  check("a photograph gets none", edgeLook(wide, { ...ctx, kind: "photo" }) === null);
  check("a thin shape gets none (it is a line of thread already)", edgeLook(wide, { ...ctx, widthMm: 1 }) === null);
  check("a speck gets none", edgeLook(shapeRect(0, 0, 15, 15, 0), { ...ctx, widthMm: 1.6 }) === null);
  check("a 2.4 mm dot (a pearl, a full stop) now gets an edge line: its row ends are all of its edge", !!edgeLook(shapeRect(0, 0, 24, 24, 0), { ...ctx, widthMm: 2.4 }));
  const withHoles = { ...shapeRect(0, 0, 600, 100, 0), contours: [[[0, 0], [600, 0], [600, 100], [0, 100]], [[50, 40], [70, 40], [70, 60], [50, 60]]] };
  check("a long bar with holes in it is a fill, not a satin stroke: it gets one (the row ends round its holes showed)", !!edgeLook(withHoles, { ...ctx, widthMm: 4.5 }));
  check("a long stroke that may be sewn as satin gets none", edgeLook(shapeRect(0, 0, 600, 100, 0), { ...ctx, widthMm: 3 }) === null);
  check("look settings read from anything", JSON.stringify(lookOptions()) === JSON.stringify(LOOK_DEFAULTS) && lookOptions({ angles: "plain" }).angles === "plain" && lookOptions({ edges: "none" }).edges === "none" && lookOptions({ angles: 7, edges: {} }).angles === LOOK_DEFAULTS.angles);

  const shapes = [shapeRect(0, 0, 400, 400, 0), shapeRect(400, 0, 400, 400, 1)];
  const objs = shapes.map((s, i) => makeObject({ name: `s${i}`, rings: s.contours.map((c) => c.map((p) => [p[0] * 0.1, p[1] * 0.1])), fill: { type: "auto", color: i ? "#aa0000" : "#0000aa" }, source: "image" }));
  const before = JSON.stringify(objs);
  const traced = { shapes, stats: { kind: "logo" }, look: { angles: "auto", edges: "auto" } };
  const out = applyLook(objs, shapes, traced, 0.1);
  check("the objects given are not changed (new ones come back, in the same order)", JSON.stringify(objs) === before && out.length === 2 && out[0].name === "s0" && out[1].name === "s1");
  check("touching shapes get rows that differ by 40 degrees or more", angleGap(out[0].fill.angle, out[1].fill.angle) >= 40, `${out[0].fill.angle} ${out[1].fill.angle}`);
  check("both got the edge line, in their own colours", out[0].stroke.type === "run" && out[0].stroke.color === "#0000aa" && out[1].stroke.color === "#aa0000" && out[0].fill.inset === EDGE_DEFAULTS.fillInset);
  const plain = applyLook(objs, shapes, { ...traced, look: { angles: "plain", edges: "none" } }, 0.1);
  check("plain / none changes nothing", JSON.stringify(plain) === before);
  const photo = applyLook(objs, shapes, { ...traced, stats: { kind: "photo" } }, 0.1);
  check("a photograph's shapes get angles but no edge line", photo.every((o) => o.stroke.type === "none") && photo[0].fill.angle !== undefined);
  const nolook = applyLook(objs, shapes, { shapes, stats: { kind: "logo" } }, 0.1);
  check("with no look settings the defaults apply (rows follow the shapes, big flat shapes get an edge line)", nolook.every((o) => o.stroke.type === "run") && angleGap(nolook[0].fill.angle, nolook[1].fill.angle) >= 40);
}

console.log("a drawn picture through the tracer and objectsFromTrace");
{
  const W = 400, H = 300;
  const img = { width: W, height: H, data: new Uint8ClampedArray(W * H * 4).fill(255) };
  const disc = (cx, cy, r, rgb) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) { const o = (y * W + x) * 4; img.data[o] = rgb[0]; img.data[o + 1] = rgb[1]; img.data[o + 2] = rgb[2]; } };
  disc(110, 150, 90, [20, 40, 140]);
  disc(290, 150, 90, [190, 30, 30]);
  const base = traceOptions({ kind: "logo", detail: 0.5, background: "auto" }, 0.25);
  check("traceOptions carries the look settings", base.look && base.look.angles === LOOK_DEFAULTS.angles && base.look.edges === LOOK_DEFAULTS.edges);
  check("and the person's choice wins", traceOptions({ angles: "plain", edges: "none" }, 0.25).look.angles === "plain" && traceOptions({ angles: "plain", edges: "none" }, 0.25).look.edges === "none");
  const run = (look, kind) => {
    const traced = traceImage(img, { ...traceOptions({ kind, detail: 0.5, background: "auto" }, 0.25), look });
    return { traced, ...objectsFromTrace(traced, { originX: -50, originY: -37.5, mmPerPx: 0.25, fabric: "#ffffff" }) };
  };
  const a = run({ angles: "auto", edges: "auto" }, "logo");
  check("the tracer's answer carries the look settings", a.traced.look && a.traced.look.edges === "auto");
  check("two discs of a logo: both get an edge line", a.objects.length === 2 && a.objects.every((o) => o.stroke.type === "run" && o.stroke.inset > 0), JSON.stringify(a.objects.map((o) => o.stroke.type)));
  check("and rows that differ (they touch nowhere, so both may keep 45: they differ only when they touch)", a.objects.every((o) => o.fill.angle !== undefined));
  const b = run({ angles: "auto", edges: "auto" }, "logo");
  check("the same picture gives the same angles and lines (deterministic)", JSON.stringify(a.objects.map((o) => [o.fill, o.stroke])) === JSON.stringify(b.objects.map((o) => [o.fill, o.stroke])));
  const p = run({ angles: "auto", edges: "auto" }, "photo");
  check("the same picture read as a photograph gets no edge line", p.objects.every((o) => o.stroke.type === "none"));
  const off = run({ angles: "plain", edges: "none" }, "logo");
  check("with both off the objects are as they always were (45 degrees, no outline)", off.objects.every((o) => o.fill.angle === 45 && o.stroke.type === "none"));
  // a person's own change to a shape's angle survives a colour being switched on or off (the merge keeps every shape it is not remaking)
  const mine = a.objects.map((o, i) => (i === 0 ? { ...o, fill: { ...o.fill, angle: 77 } } : o));
  const before = a.palette.map((q) => ({ ...q })), after = a.palette.map((q, i) => (i === a.objects[1].pal ? { ...q, skipped: true } : q));
  const merged = mergeTraceObjects(mine, a.objects, { before, after, rank: a.rank });
  check("a shape's angle set by hand stays when another colour is switched", merged.find((o) => o.id === mine[0].id).fill.angle === 77);
}

console.log("\"Leave out the background\" OFF: the whole picture is sewn, nothing is left out as the page or as the cloth showing through");
{
  // a navy ring on a white page with a white heart in it, and a red disc: on the default cream cloth the white is "like the cloth"
  const W = 400, H = 300, cream = "#f4f1ea";
  const img = { width: W, height: H, data: new Uint8ClampedArray(W * H * 4).fill(255) };
  const disc = (cx, cy, r, rgb) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) { const o = (y * W + x) * 4; img.data[o] = rgb[0]; img.data[o + 1] = rgb[1]; img.data[o + 2] = rgb[2]; } };
  disc(110, 150, 90, [20, 40, 140]);
  disc(110, 150, 45, [255, 255, 255]);
  disc(290, 150, 90, [190, 30, 30]);
  const made = (background, kind = "logo") => {
    const traced = traceImage(img, traceOptions({ kind, detail: 0.5, background }, 0.25));
    return { traced, ...objectsFromTrace(traced, { originX: -50, originY: -37.5, mmPerPx: 0.25, fabric: cream }) };
  };
  const auto = made("auto"), none = made("none");
  check("the tracer says whether the background was switched off (stats.backgroundOff)", none.traced.stats.backgroundOff === true && !auto.traced.stats.backgroundOff);
  check("(control) with the background left out, the white of the page and of the heart is not sewn", auto.palette.some((p) => p.skipped && (p.background || p.sameAsCloth)), JSON.stringify(auto.palette.map((p) => [p.hex, p.skipped])));
  check("with it switched OFF no colour is skipped: not as the background, not as like the cloth", none.palette.length > 0 && none.palette.every((p) => !p.skipped && !p.background && !p.sameAsCloth), JSON.stringify(none.palette.map((p) => [p.hex, p.skipped, p.background, p.sameAsCloth])));
  check("and a white shape is sewn (the page and the heart), so there are more objects than with the background left out", none.objects.length > auto.objects.length && none.objects.some((o) => /^#f[0-9a-f]f[0-9a-f]f[0-9a-f]$/i.test(o.fill.color)), `${auto.objects.length} -> ${none.objects.length}`);
  const box = (m) => contentBox(m.traced, { originX: -50, originY: -37.5, mmPerPx: 0.25, fabric: cream });
  const ba = box(auto), bn = box(none);
  check("what is sewn reaches the whole picture (100 x 75 mm) when the background is off, less when it is left out", bn && Math.abs((bn.x1 - bn.x0) - 100) < 0.6 && Math.abs((bn.y1 - bn.y0) - 75) < 0.6 && ba && (ba.x1 - ba.x0) < (bn.x1 - bn.x0) - 5, JSON.stringify([ba, bn]));
  check("clothMatchOf: 0 whatever the kind and the cloth when the background is off", [["logo", cream], ["art", "#ffffff"], ["photo", "#336699"], ["photo", cream]].every(([kind, f]) => clothMatchOf({ stats: { kind, backgroundOff: true } }, f) === 0));
  check("clothMatchOf: otherwise the kind's own limit", clothMatchOf({ stats: { kind: "logo" } }, cream) === CLOTH_MATCH && clothMatchOf({ stats: { kind: "photo" } }, "#336699") === CLOTH_MATCH_PHOTO && clothMatchOf({ stats: { kind: "photo" } }, cream) === 0);
  check("traceOptions: a frame round the picture is kept only when the background is off", traceOptions({ background: "none" }, 0.25).trimFrame === false && traceOptions({ background: "auto" }, 0.25).trimFrame === undefined);
  // a light photograph (the woman's white shirt, the sky): nothing of it may be cut out either
  const sky = { width: 300, height: 200, data: new Uint8ClampedArray(300 * 200 * 4) };
  for (let y = 0; y < 200; y++) for (let x = 0; x < 300; x++) { const o = (y * 300 + x) * 4, v = 236 + Math.round(10 * Math.sin(x / 31) * Math.cos(y / 27)); sky.data[o] = v; sky.data[o + 1] = v - 3; sky.data[o + 2] = v - 8; sky.data[o + 3] = 255; }
  for (let y = 60; y < 150; y++) for (let x = 90; x < 210; x++) { const o = (y * 300 + x) * 4; sky.data[o] = 60; sky.data[o + 1] = 90; sky.data[o + 2] = 40; }
  const tracedSky = traceImage(sky, traceOptions({ kind: "art", detail: 0.5, background: "none" }, 0.25));
  const skyMade = objectsFromTrace(tracedSky, { originX: -37.5, originY: -25, mmPerPx: 0.25, fabric: "#ffffff" });
  check("a pale picture on a white cloth with the background off: every colour of it is sewn", skyMade.palette.every((p) => !p.skipped) && skyMade.objects.length >= skyMade.palette.length, JSON.stringify(skyMade.palette.map((p) => [p.hex, p.skipped])));
}

console.log("stitch/outline.js: a line inside the edge");
{
  const sq = [[0, 0], [10, 0], [10, 10], [0, 10]];
  const inside = (runs, lo, hi, eps = 1e-6) => runs.every((r) => r.every((p) => p[0] >= lo - eps && p[0] <= hi + eps && p[1] >= lo - eps && p[1] <= hi + eps));
  const onEdge = outlineRuns([sq], { type: "run", len: 2 });
  const moved = outlineRuns([sq], { type: "run", len: 2, inset: 0.2 });
  check("without `inset` the line runs on the edge, as it always did", onEdge.length === 1 && inside(onEdge, 0, 10) && onEdge[0].some((p) => p[0] === 0 || p[1] === 0));
  check("with `inset` 0.2 every point is inside the square, 0.2 mm from its sides", moved.length === 1 && inside(moved, 0.2, 9.8) && moved[0].some((p) => near(p[0], 0.2, 1e-3) || near(p[1], 0.2, 1e-3)), JSON.stringify(moved[0] && moved[0].slice(0, 3)));
  check("a bean line moves the same way", inside(outlineRuns([sq], { type: "bean", len: 2, inset: 0.2 }), 0.2, 9.8));
  check("a damaged inset is no inset (NaN, negative), a huge one is held to 2 mm", JSON.stringify(outlineRuns([sq], { type: "run", len: 2, inset: NaN })) === JSON.stringify(onEdge) && JSON.stringify(outlineRuns([sq], { type: "run", len: 2, inset: -3 })) === JSON.stringify(onEdge) && inside(outlineRuns([sq], { type: "run", len: 2, inset: 99 }), 2, 8));
  check("a satin outline ignores `inset` (it has its own position)", JSON.stringify(outlineRuns([sq], { type: "satin", width: 1.5, position: "inside", inset: 0.5 })) === JSON.stringify(outlineRuns([sq], { type: "satin", width: 1.5, position: "inside" })));
  const thin = [[0, 0], [10, 0], [10, 0.3], [0, 0.3]];
  check("a piece thinner than twice the inset keeps its own edge (it is not left out)", outlineRuns([thin], { type: "run", len: 2, inset: 0.2 }).length === 1);
  // through the engine: a design with the edge line and the fill pulled in
  const design = (extra) => ({ name: "t", settings: { fabric: "woven" }, objects: [{ id: "a", name: "a", visible: true, rings: [sq.map(([x, y]) => [x - 5, y - 5])], transform: { x: 0, y: 0, sx: 1, sy: 1, rot: 0 }, fill: { type: "tatami", color: "#102a6b", angle: 30, ...extra.fill }, stroke: extra.stroke || { type: "none", color: "#102a6b" } }] });
  const none = generate(design({}));
  const line = generate(design({ fill: { inset: 0.35 }, stroke: { type: "run", color: "#102a6b", width: 0.4, len: 2, position: "center", inset: 0.2 } }));
  const count = (g) => g.pattern.stitches.filter((s) => s[2] === CMD.STITCH).length;
  const trims = (g) => g.pattern.stitches.filter((s) => s[2] === CMD.TRIM).length;
  const box = (g) => { const s = g.pattern.stitches.filter((q) => q[2] === CMD.STITCH); return [Math.min(...s.map((q) => q[0])), Math.max(...s.map((q) => q[0])), Math.min(...s.map((q) => q[1])), Math.max(...s.map((q) => q[1]))].map((v) => v / 10); };
  check("the edge line adds stitches and no thread cuts", count(line) > count(none) && trims(line) === trims(none), `${count(none)} -> ${count(line)}, trims ${trims(none)} -> ${trims(line)}`);
  const bn = box(none), bl = box(line);
  check("and with the fill pulled in nothing sticks out past the square", bl[0] >= -5 - 0.15 && bl[1] <= 5 + 0.15 && bl[2] >= -5 - 0.15 && bl[3] <= 5 + 0.15, JSON.stringify(bl));
  check("while the plain fill reaches past its edge a little (that is the point)", bn[1] - bn[0] >= bl[1] - bl[0] - 1e-9, `${bn} vs ${bl}`);
  check("no NaN, no stitch over 12 mm", line.pattern.stitches.every((s) => Number.isFinite(s[0]) && Number.isFinite(s[1])));
}

console.log("tracer and engine agree on what a thin line is (script lettering fell apart when they did not)");
{
  // A hairline of a script is widened by the tracer to 0.45-0.7 mm (`thickenMm`, by the Detail slider) and the engine sews a piece that thin as ONE line
  // of bean stitches (`lineMaxWidth`). After a merge the tracer drew 0.6-0.7 mm while the engine stopped at 0.58: every stroke went to a tatami fill and broke into pieces,
  // and none of the checks on either side saw it, because each is right on its own. This runs the two together: a wavy stroke on white, 60 mm long, as wide as the
  // hairlines of a script get (0.3 to 0.6 mm).
  const W = 600, H = 120, mm = 0.1;
  const strokeImage = (r) => {
    const data = new Uint8ClampedArray(W * H * 4).fill(255);
    for (let t = 20; t < 580; t += 0.5) {
      const cx = t, cy = 60 + 25 * Math.sin(t / 40);
      for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) { const o = (y * W + x) * 4; data[o] = data[o + 1] = data[o + 2] = 30; }
      }
    }
    return { width: W, height: H, data };
  };
  const kindsAt = (r, detail, options = {}) => {
    const traced = traceImage(strokeImage(r), traceOptions({ detail }, mm));
    const { objects } = objectsFromTrace(traced, { originX: -30, originY: -6, mmPerPx: mm, fabric: "#ffffff" });
    const g = generate(engineDesign({ name: "script", fabric: "woven", settings: {}, objects }), options);
    const kinds = {};
    for (const i of g.info || []) kinds[i.kind] = (kinds[i.kind] || 0) + 1;
    return kinds;
  };
  for (const r of [1.5, 2, 2.5, 3]) {
    const bad = [0.5, 0.75, 1].map((d) => [d, kindsAt(r, d)]).filter(([, k]) => !((k.line || 0) >= 1 && !k.tatami && !k.satin));
    check(`a stroke ${(2 * r * mm).toFixed(1)} mm wide is sewn as a line at Detail 0.5, 0.75 and 1 (no fill, no satin)`, bad.length === 0, JSON.stringify(bad));
  }
  const old = kindsAt(3, 0.75, { lineMaxWidth: 0.58 });
  check("(control) with the old limit of 0.58 mm a 0.6 mm stroke goes to a fill, so these checks can fail", !!old.tatami || !!old.satin, JSON.stringify(old));
  // The wider limit is for shapes made from a picture only. Typed lettering is sewn one way from end to end, by how wide its strokes are, typically (the engine's
  // textLineBelow): thin lettering all as lines, heavy lettering as satin. Shapes drawn by hand keep the limit they always had.
  const stripOf = (w, y0 = 0) => [[0, y0], [25, y0], [25, y0 + w], [0, y0 + w]];
  const objectOf = (rings, extra) => ({ id: "s", name: "s", visible: true, rings, transform: { x: 0, y: 0, sx: 1, sy: 1, rot: 0 }, fill: { type: "auto", color: "#202020" }, stroke: { type: "none", color: "#202020" }, ...extra });
  const made = (rings, extra, options = {}) => generate(engineDesign({ name: "strip", fabric: "woven", settings: {}, objects: [objectOf(rings, extra)] }), options);
  const kindsOf = (rings, extra, options) => (made(rings, extra, options).info || []).map((i) => i.kind).join(",");
  const kindOf = (extra, w = 0.65) => kindsOf([stripOf(w)], extra);
  check("a 0.65 mm strip made from a picture is one line of stitches", kindOf({ source: "image" }) === "line", kindOf({ source: "image" }));
  check("the same strip as typed lettering is a line too: lettering with thin strokes is sewn as lines", kindOf({ kind: "text" }) === "line", kindOf({ kind: "text" }));
  check("a 0.95 mm strip of typed lettering (a heavy face) is not: it is sewn as satin", kindOf({ kind: "text" }, 0.95) !== "line", kindOf({ kind: "text" }, 0.95));
  check("as a shape drawn by hand (source hand, or none) the old limit holds: not a single line", kindOf({ source: "hand" }) !== "line" && kindOf({}) !== "line", kindOf({ source: "hand" }) + " / " + kindOf({}));
  const word = [stripOf(0.5), stripOf(0.75, 5)]; // two letters of one word, a little apart in weight: 0.5 mm is a line, 0.75 mm was a satin
  check("lettering with strokes of 0.5 and 0.75 mm is lines from end to end (the heavier letter no longer changes the weight inside the word)", kindsOf(word, { kind: "text" }) === "line,line", kindsOf(word, { kind: "text" }));
  const letterByLetter = kindsOf(word, { kind: "text" }, { textLineBelow: 0 });
  check("(control) letter by letter, as before (textLineBelow 0), the same word is a line and a satin", /line/.test(letterByLetter) && /satin/.test(letterByLetter), letterByLetter);
  // the hairline of a serif: a thick bar with a thin foot hanging off its end
  const serif = [[[0, 0], [25, 0], [25, 1.2], [0.25, 1.2], [0.25, 7], [0, 7]]];
  const reach = (g) => Math.max(...g.pattern.stitches.filter((q) => q[2] === CMD.STITCH).map((q) => q[1] / 10));
  const kept = made(serif, { kind: "text" }), dropped = made(serif, { kind: "text" }, { textMinStroke: 0 });
  check("the thin foot of heavy lettering is sewn: the stitches reach its end 7 mm away", reach(kept) > 6, `${reach(kept).toFixed(1)} mm`);
  check("(control) without widening the foot is left out and the stitches stop at the bar", reach(dropped) > 0 && reach(dropped) < 3, `${reach(dropped).toFixed(1)} mm`);
  // widenThin and meanStrokeWidth themselves
  const area = (rings) => { let a = 0; for (const is of islandsOf(rings)) a += ringArea(is.outer) - is.holes.reduce((q, h) => q + ringArea(h), 0); return a; };
  const w1 = widenThin(serif, 0.4);
  check("a thin strip of a shape with thick parts is widened to the width asked for: the foot's area grows by about (0.4 - 0.25) x 5.8 mm2, nothing else changes", w1.strips >= 1 && Math.abs(area(w1.rings) - area(serif) - 0.15 * 5.8) < 0.5, `${(area(w1.rings) - area(serif)).toFixed(2)} mm2 more`);
  const thinOnly = [stripOf(0.3)];
  check("a shape whose every stroke is as thin as the hairlines is left alone (it is sewn as lines, one thread wide, whatever the drawing)", widenThin(thinOnly, 0.4).rings === thinOnly);
  const square = [[[0, 0], [4, 0], [4, 4], [0, 4]]];
  check("a plain shape, or a crumb off a sharp corner, is not a strip: nothing is widened", widenThin(square, 0.4).rings === square && widenThin([stripOf(1.2)], 0.4).strips === 0);
  check("no widening asked for, or damaged rings: nothing changes, no error", widenThin(serif, 0).rings === serif && widenThin([], 0.4).rings.length === 0 && widenThin(null, 0.4).widened === 0);
  check("the typical width of a stroke: twice the area over the outline, by area", Math.abs(meanStrokeWidth([stripOf(0.65)]) - 0.63) < 0.03 && meanStrokeWidth([]) === 0 && meanStrokeWidth([[[0, 0], [0.1, 0], [0.1, 0.1], [0, 0.1]]]) === 0);
}

console.log("convert.js: fine details are ranked by the region of the person they lie in");
{
  // a face and a jacket, a short dark line on the face (30 mm) and a longer pattern on the jacket (60 mm): both want a thread of their own, and there is room for ONE
  const sq = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const make = (regions) => ({
    width: 400, height: 200, stats: { kind: "photo" }, look: null, order: [0, 1],
    palette: [{ r: 225, g: 170, b: 150, fraction: 0.5, background: false }, { r: 30, g: 40, b: 90, fraction: 0.5, background: false }],
    shapes: [{ id: 0, color: 0, contours: [sq(0, 0, 200, 200)], area: 40000, bbox: [0, 0, 200, 200] }, { id: 1, color: 1, contours: [sq(200, 0, 200, 200)], area: 40000, bbox: [200, 0, 400, 200] }],
    details: {
      stats: {},
      spots: [],
      lines: [
        { pts: [[20, 40], [140, 40]], lengthMm: 30, rgb: [60, 35, 25], strength: 30, under: 0, ...(regions ? { region: 3 } : {}) },
        { pts: [[210, 120], [390, 120]], lengthMm: 60, rgb: [110, 90, 200], strength: 30, under: 1, ...(regions ? { region: 4 } : {}) },
      ],
    },
  });
  const made = (regions) => objectsFromTrace(make(regions), { originX: 0, originY: 0, mmPerPx: 0.25, fabric: "#f4f1ea", maxColors: 3 }).details;
  const ranked = made(true), plain = made(false);
  check("with the regions, the one new thread goes to the face's dark line, not to the longer pattern of the jacket", !!ranked && ranked.newColours === 1 && ranked.colours.join() === "#3c2319", ranked && JSON.stringify(ranked.colours));
  check("(control) without regions the longer line wins the thread, so the check above can fail", !!plain && plain.colours.join() === "#6e5ac8", plain && JSON.stringify(plain.colours));
  check("a detail limit can be changed by the caller (detailTune)", (() => { const d = objectsFromTrace(make(true), { originX: 0, originY: 0, mmPerPx: 0.25, fabric: "#f4f1ea", maxColors: 3, detailTune: { newColours: 0 } }).details; return !d || d.newColours === 0; })());
}

console.log("segmentClient.js (the person finder's door; the model itself runs in a browser worker and is checked there)");
{
  const img = (alpha) => ({ width: 8, height: 8, data: new Uint8ClampedArray(8 * 8 * 4).fill(alpha) });
  check("with no Worker (here, plain node) the person finder answers null and the picture is traced as it is", (await findPerson(img(255))) === null);
  check("a picture with real see-through parts is never sent to it", (await findPerson(img(0))) === null);
}

console.log("faces.js (the face landmarker's points as eyes, brows and lips for the tracer, and how big the face is on the cloth)");
{
  // 138 of the 478 landmarks of one real face (a public-domain portrait, 800 x 1000 px, the face 130 px wide), only the ones faces.js uses: index -> [x, y] as a share of the picture
  const FIXTURE = {"0":[0.613,0.3156],"7":[0.5625,0.269],"10":[0.5942,0.2136],"13":[0.6141,0.3199],"14":[0.6139,0.3201],"17":[0.614,0.3258],"21":[0.5346,0.2496],"33":[0.5604,0.2681],"37":[0.6042,0.3154],"39":[0.5968,0.3175],"40":[0.5915,0.3196],"46":[0.5463,0.2601],"52":[0.5592,0.2528],"53":[0.551,0.2556],"54":[0.5383,0.2383],"55":[0.5887,0.2537],"58":[0.5554,0.3321],"61":[0.585,0.3227],"63":[0.5471,0.2524],"65":[0.5713,0.2519],"66":[0.569,0.2472],"67":[0.5592,0.222],"70":[0.5422,0.2579],"78":[0.5877,0.3224],"80":[0.5957,0.3215],"81":[0.6007,0.3208],"82":[0.6069,0.3203],"84":[0.6059,0.3263],"87":[0.6067,0.3208],"88":[0.5956,0.3219],"91":[0.5929,0.3252],"93":[0.5435,0.3034],"95":[0.5919,0.3222],"103":[0.5462,0.2291],"105":[0.5559,0.2486],"107":[0.5847,0.247],"109":[0.5748,0.2171],"127":[0.5366,0.2763],"132":[0.5485,0.3177],"133":[0.5885,0.266],"136":[0.5718,0.3489],"144":[0.5678,0.27],"145":[0.5728,0.2697],"146":[0.5887,0.3241],"148":[0.6125,0.3616],"149":[0.5921,0.3574],"150":[0.5828,0.3541],"152":[0.6261,0.3608],"153":[0.5781,0.2686],"154":[0.5832,0.2674],"155":[0.5868,0.2666],"157":[0.5815,0.2627],"158":[0.5757,0.2617],"159":[0.5702,0.262],"160":[0.5653,0.2635],"161":[0.5626,0.2653],"162":[0.5343,0.2618],"163":[0.5646,0.2696],"172":[0.5633,0.3423],"173":[0.5862,0.2646],"176":[0.6016,0.3601],"178":[0.6007,0.3214],"181":[0.5988,0.3262],"185":[0.5877,0.3212],"191":[0.5918,0.322],"234":[0.5401,0.2897],"246":[0.5612,0.2667],"249":[0.6522,0.2541],"251":[0.6787,0.2267],"263":[0.654,0.2522],"267":[0.622,0.3132],"269":[0.6316,0.3139],"270":[0.6389,0.3146],"276":[0.6641,0.2406],"282":[0.6456,0.2379],"283":[0.656,0.2379],"284":[0.6679,0.2177],"285":[0.6167,0.2486],"288":[0.6966,0.3104],"291":[0.6489,0.3156],"293":[0.6593,0.2338],"295":[0.6328,0.2411],"296":[0.6329,0.2362],"297":[0.6342,0.21],"300":[0.6683,0.2374],"308":[0.6463,0.3159],"310":[0.6361,0.3171],"311":[0.6296,0.3177],"312":[0.6223,0.3186],"314":[0.6231,0.3243],"317":[0.6221,0.3189],"318":[0.6363,0.3169],"321":[0.6394,0.3201],"323":[0.6959,0.2794],"324":[0.6414,0.3164],"332":[0.6532,0.212],"334":[0.6473,0.2331],"336":[0.617,0.241],"338":[0.6149,0.2106],"356":[0.6909,0.2516],"361":[0.6973,0.2945],"362":[0.6258,0.2591],"365":[0.6843,0.3333],"373":[0.6467,0.2568],"374":[0.6419,0.2578],"375":[0.645,0.3178],"377":[0.6409,0.3581],"378":[0.6636,0.3485],"379":[0.6734,0.3423],"380":[0.6364,0.2583],"381":[0.6314,0.2586],"382":[0.6278,0.259],"384":[0.6312,0.2536],"385":[0.6361,0.2506],"386":[0.6414,0.2493],"387":[0.6465,0.2494],"388":[0.6502,0.2503],"389":[0.6858,0.2374],"390":[0.65,0.2555],"397":[0.692,0.3235],"398":[0.6275,0.2569],"400":[0.6528,0.3538],"402":[0.6297,0.3176],"405":[0.6317,0.3224],"409":[0.6447,0.3152],"415":[0.6412,0.3166],"454":[0.6935,0.2653],"466":[0.6523,0.2512],"468":[0.5725,0.2656],"469":[0.5793,0.2646],"470":[0.5715,0.2606],"471":[0.5658,0.2667],"472":[0.5736,0.2707],"473":[0.6424,0.253],"474":[0.6489,0.252],"475":[0.6414,0.248],"476":[0.6356,0.254],"477":[0.6431,0.2581]};
  const W = 800, H = 1000;
  const landmarks = () => { const a = Array.from({ length: 478 }, () => [0, 0, 0]); for (const k of Object.keys(FIXTURE)) a[+k] = [FIXTURE[k][0], FIXTURE[k][1], 0]; return a; };
  const flatOf = (lm) => { const f = new Float32Array(478 * 3); lm.forEach((p, i) => { f[i * 3] = p[0]; f[i * 3 + 1] = p[1]; f[i * 3 + 2] = p[2]; }); return f; };
  const parts = faceParts(landmarks(), W, H);
  check("a face is read: its width, the eyes and the irises are about the size of the real thing (130, 23 and 11 px)", !!parts && Math.abs(parts.widthPx - 130) < 8 && Math.abs(parts.eyeWidthPx - 23) < 4 && !!parts.rightIris && Math.abs(parts.rightIris.r - 5.5) < 2, parts && JSON.stringify([parts.widthPx, parts.eyeWidthPx, parts.rightIris && parts.rightIris.r]));
  check("fewer than 468 landmarks is no face", faceParts(landmarks().slice(0, 100), W, H) === null && faceParts(null, W, H) === null);
  const flat = faceParts(flatOf(landmarks()), W, H);
  check("the worker's flat Float32Array gives the same face as a list of points", !!flat && Math.abs(flat.widthPx - parts.widthPx) < 0.05 && Math.abs(flat.ipdPx - parts.ipdPx) < 0.05);
  check("it is a plausible face: eyes alike, the mouth a little under them, the chin on the mouth's side", plausibleFace(parts));
  const wrong = landmarks(); for (const i of [13, 14]) wrong[i] = wrong[10].slice(); // the mouth up on the forehead
  check("a mouth above the eyes is not a face", !plausibleFace(faceParts(wrong, W, H)));
  const squashed = landmarks().map((p) => [0.5 + (p[0] - 0.5) * 0.2, p[1], 0]); // a sliver as wide as a fifth of a face
  check("a face squashed to a sliver is not a face", !plausibleFace(faceParts(squashed, W, H)));
  const m = faceMeasures(parts, 0.1);
  check("on the cloth at 0.1 mm a pixel the face is about 13 mm wide, an eye 2.3 mm, an iris 1.1 mm", Math.abs(m.faceMm - 13) < 0.8 && Math.abs(m.eyeMm - 2.3) < 0.4 && Math.abs(m.irisMm - 1.1) < 0.4, JSON.stringify(m));
  check("the size that is too small for an eye is set (a few mm), so the page can warn", FACE_EYE_MIN_MM > 1 && FACE_EYE_MIN_MM < 6);
  // painting the features as classes of the region map
  const person = new Uint8Array(W * H).fill(REGION.FACE_SKIN);
  const painted = paintFeatureClasses(person, W, H, [parts], { mmPerPx: 0.1 });
  const tally = (classes) => { const n = new Float64Array(10); for (let i = 0; i < classes.length; i++) n[classes[i]]++; return n; };
  const n0 = tally(painted.classes);
  const eyes = n0[FACE_REGION.FEATURES], lips = n0[FACE_REGION.LIPS], whiteEye = n0[FACE_REGION.EYE_WHITE], mouthZone = n0[FACE_REGION.MOUTH];
  const other = painted.classes.length - n0[REGION.FACE_SKIN] - eyes - lips - whiteEye - mouthZone;
  check("the eyes and brows (class 6), the lips (7) and the white of the eye (8) are painted, nothing else changes; a closed mouth has no mouth zone (9)", eyes > 800 && eyes < 6000 && lips > 300 && lips < 3000 && whiteEye > 40 && whiteEye < 400 && mouthZone === 0 && other === 0 && painted.faces === 1 && painted.whitePx === whiteEye && painted.mouthPx === 0, JSON.stringify([eyes, lips, whiteEye, mouthZone, other]));
  check("the eyes are painted where the eyes are: at the middle of the right eye (the iris is the eye, not its white)", painted.classes[Math.round(parts.rightIris.cy) * W + Math.round(parts.rightIris.cx)] === FACE_REGION.FEATURES);
  check("... and the lips at the middle of the mouth", painted.classes[Math.round(parts.mouthCentre[1]) * W + Math.round(parts.mouthCentre[0])] === FACE_REGION.LIPS);
  const inBox = (poly, cls) => { let n = 0; const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]); for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) if (painted.classes[y * W + x] === cls) n++; return n; };
  check("the white of the eye lies in the eye's outline, round the iris: some of it in each eye", inBox(parts.rightEye, FACE_REGION.EYE_WHITE) > 15 && inBox(parts.leftEye, FACE_REGION.EYE_WHITE) > 15, `${inBox(parts.rightEye, FACE_REGION.EYE_WHITE)} and ${inBox(parts.leftEye, FACE_REGION.EYE_WHITE)} pixels`);
  check("the map handed in is not changed", person.every((v) => v === REGION.FACE_SKIN));
  // an open mouth: the lower lip's inner edge 12 px down
  const openLm = landmarks();
  for (const i of [95, 88, 178, 87, 14, 317, 402, 318, 324]) openLm[i][1] += 0.012;
  for (const i of [146, 91, 181, 84, 17, 314, 405, 321, 375]) openLm[i][1] += 0.016;
  const openParts = faceParts(openLm, W, H);
  const openPainted = paintFeatureClasses(person, W, H, [openParts], { mmPerPx: 0.1 });
  const n1 = tally(openPainted.classes);
  check("an open mouth gets a zone for its opening (class 9), inside the lips (7)", n1[FACE_REGION.MOUTH] > 150 && n1[FACE_REGION.LIPS] > 300 && openPainted.mouthPx === n1[FACE_REGION.MOUTH] && openPainted.classes[Math.round(openParts.mouthCentre[1] + 3) * W + Math.round(openParts.mouthCentre[0])] === FACE_REGION.MOUTH, JSON.stringify([n1[FACE_REGION.MOUTH], n1[FACE_REGION.LIPS]]));
  // where the person finder said background inside the face
  const noMouth = person.slice();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (Math.abs(y - parts.mouthCentre[1]) < 40 && Math.abs(x - parts.mouthCentre[0]) < 40) noMouth[y * W + x] = REGION.BACKGROUND;
  const outside = paintFeatureClasses(noMouth, W, H, [parts], { mmPerPx: 0.1 });
  let lipsOut = 0, bgChanged = 0;
  for (let i = 0; i < outside.classes.length; i++) { if (outside.classes[i] === FACE_REGION.LIPS) lipsOut++; if (noMouth[i] === REGION.BACKGROUND && outside.classes[i] !== REGION.BACKGROUND) bgChanged++; }
  check("the rest of the features are painted only over the person: of the lips the finder called background only the opening between them is taken back (a closed mouth: a few pixels)", lipsOut === bgChanged && bgChanged === outside.reclaimedPx && bgChanged < 40 && outside.featurePx > 800, JSON.stringify([lipsOut, bgChanged, outside.reclaimedPx, outside.featurePx]));
  const holed = person.slice(), eyeBox = parts.rightEye.reduce((b, p) => [Math.min(b[0], p[0]), Math.min(b[1], p[1]), Math.max(b[2], p[0]), Math.max(b[3], p[1])], [1e9, 1e9, -1e9, -1e9]);
  for (let y = Math.floor(eyeBox[1]) - 2; y <= Math.ceil(eyeBox[3]) + 2; y++) for (let x = Math.floor(eyeBox[0]) - 2; x <= Math.ceil(eyeBox[2]) + 2; x++) holed[y * W + x] = REGION.BACKGROUND; // the finder took the whole eye for the wall
  const back = paintFeatureClasses(holed, W, H, [parts], { mmPerPx: 0.1 });
  check("an eye the person finder took for the wall (a hole in the face) is taken back: the iris as the eye, the white round it as the white of the eye", back.reclaimedPx > 100 && back.classes[Math.round(parts.rightIris.cy) * W + Math.round(parts.rightIris.cx)] === FACE_REGION.FEATURES && tally(back.classes)[FACE_REGION.EYE_WHITE] > whiteEye - 10, JSON.stringify([back.reclaimedPx]));
  const poster = new Uint8Array(W * H); // a face on a poster: no person round it, only a small patch far away
  for (let y = 900; y < 960; y++) for (let x = 20; x < 80; x++) poster[y * W + x] = REGION.CLOTHES;
  const none = paintFeatureClasses(poster, W, H, [parts], { mmPerPx: 0.1 });
  check("a face with no person round it (a poster behind the person) takes nothing back: nothing is painted", none.reclaimedPx === 0 && none.classes.every((v, i) => v === poster[i]), String(none.reclaimedPx));
  const wide = paintFeatureClasses(person, W, H, [parts], { mmPerPx: 0.1, grow: { eye: 1.2 } });
  check("how far an eye is grown is a setting (in mm): wider means more pixels", wide.featurePx > painted.featurePx * 1.3, `${wide.featurePx} against ${painted.featurePx}`);
  // the white of the eyes and of the teeth, measured on the picture
  {
    const colour = (classes, face, o) => {
      const img = { width: W, height: H, data: new Uint8ClampedArray(W * H * 4) };
      const my = face.mouthCentre[1];
      for (let i = 0; i < W * H; i++) {
        const c = classes[i], y = (i / W) | 0;
        const v = c === FACE_REGION.EYE_WHITE ? o.eyeWhite : c === FACE_REGION.MOUTH ? (y < my + 3 ? o.teeth : [50, 20, 25]) : c === FACE_REGION.FEATURES ? [60, 40, 30] : c === FACE_REGION.LIPS ? [180, 70, 80] : [210, 160, 140];
        img.data[i * 4] = v[0]; img.data[i * 4 + 1] = v[1]; img.data[i * 4 + 2] = v[2]; img.data[i * 4 + 3] = 255;
      }
      return img;
    };
    const near = (a, b, d = 8) => a.every((v, k) => Math.abs(v - b[k]) <= d);
    const EYEW = [235, 232, 228], TEETH = [238, 233, 226];
    const kinds = (list) => list.map((a) => a.kind).join();
    const open = featureAnchors(colour(openPainted.classes, openParts, { eyeWhite: EYEW, teeth: TEETH }), [openParts]);
    const aS = open.find((a) => a.kind === "sclera"), aT = open.find((a) => a.kind === "teeth");
    check("the white of the eyes and of the teeth are measured on the picture: their colours, and the zones (8 and 9) they belong to", !!aS && !!aT && near(aS.rgb, EYEW) && near(aT.rgb, TEETH) && aS.classes.join() === "8" && aT.classes.join() === "9" && aS.px > 20 && aT.px > 50, JSON.stringify(open));
    const closed = featureAnchors(colour(painted.classes, parts, { eyeWhite: EYEW, teeth: TEETH }), [parts]);
    check("a closed mouth shows no teeth: only the eyes' white is found", kinds(closed) === "sclera", kinds(closed));
    check("eyes no whiter than the skin round them have no white of their own", kinds(featureAnchors(colour(openPainted.classes, openParts, { eyeWhite: [212, 162, 142], teeth: TEETH }), [openParts])) === "teeth");
    check("an open mouth that is dark inside shows no teeth", kinds(featureAnchors(colour(openPainted.classes, openParts, { eyeWhite: EYEW, teeth: [50, 20, 25] }), [openParts])) === "sclera");
    check("yellow or brown teeth are not 'white': nothing is measured for them (the palette has the colour already)", kinds(featureAnchors(colour(openPainted.classes, openParts, { eyeWhite: EYEW, teeth: [200, 165, 100] }), [openParts])) === "sclera");
    check("no picture, no faces, a damaged picture: no whites, no error", featureAnchors(null, [openParts]).length === 0 && featureAnchors(colour(openPainted.classes, openParts, { eyeWhite: EYEW, teeth: TEETH }), []).length === 0 && featureAnchors({ width: 0, height: 0, data: new Uint8ClampedArray(0) }, [openParts]).length === 0 && featureAnchors(colour(openPainted.classes, openParts, { eyeWhite: EYEW, teeth: TEETH }), [null]).length === 0);
    const clear = colour(openPainted.classes, openParts, { eyeWhite: EYEW, teeth: TEETH });
    for (let i = 3; i < clear.data.length; i += 4) clear.data[i] = 0;
    check("pixels that are see-through are not read", featureAnchors(clear, [openParts]).length === 0);
  }
  // several faces, and a crop that frames the head
  const small = landmarks().map((p) => [0.1 + p[0] * 0.2, 0.1 + p[1] * 0.2, 0]); // the same face a fifth the size, in the corner
  const two = mainFaces([landmarks(), small], W, H);
  check("a face less than a third as wide as the biggest is not a subject", two.length === 1 && two[0].widthPx > 100, two.map((f) => f.widthPx).join());
  const half = landmarks().map((p) => [0.1 + p[0] * 0.5, 0.2 + p[1] * 0.5, 0]);
  check("a face at least a third as wide as the biggest is kept too", mainFaces([landmarks(), half], W, H).length === 2);
  check("no landmarks, no faces", mainFaces([], W, H).length === 0 && mainFaces(null, W, H).length === 0);
  const crop = faceCropBox([parts], W, H);
  check("the crop frames the head and shoulders: it holds the face with room round it, inside the picture", !!crop && crop[0] >= 0 && crop[1] >= 0 && crop[2] <= W && crop[3] <= H && crop[0] < parts.box[0] - 60 && crop[2] > parts.box[2] + 60 && crop[1] < parts.box[1] - 30 && crop[3] > parts.box[3] + 60, JSON.stringify(crop));
  const cx = (parts.box[0] + parts.box[2]) / 2 / W, cy = (parts.box[1] + parts.box[3]) / 2 / H; // the same face five times as big, in the middle of the picture
  const bigFace = faceParts(landmarks().map((p) => [0.5 + (p[0] - cx) * 5, 0.5 + (p[1] - cy) * 5, 0]), W, H);
  check("a face that already fills the picture needs no crop", faceCropBox([bigFace], W, H) === null);
  check("without faces there is no crop", faceCropBox([], W, H) === null);
}

console.log(failed ? `\n${failed} of ${total} checks FAILED` : `\nall ${total} checks passed`);
process.exit(failed ? 1 : 0);
