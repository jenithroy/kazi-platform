"""Metrics, tables and contact sheets of the lettering bench.   Run with:  python -I tools_text.py <command> <variant> [...]

  metrics <variant>        out/<variant>/metrics_typed.json, metrics_pics.json
  table <variant>          out/<variant>/table.csv, table.md (per font x size), summary.md (by size / by font / worst cells)
  sheets <variant>         out/<variant>/sheets/<font>.png, <font>_small.png, <font>_regular.png  (rows = sizes, columns = strings; ideal above render, 8 px/mm, magnified)
  picsheets <v1[,v2,..]>   out/<v1>/sheets/pics_<group>.png  (source crop | render of each variant, the lettering only)
  compare <base> <other>   out/compare_<base>_vs_<other>.md
  all <variant>            metrics + table + sheets + picsheets

How a render is judged (all on the render's own 8 px/mm grid, which is the page's own rasterizePattern, thread 0.45 mm):
  ideal A   the font's glyphs, drawn by Chromium at 14 px/mm (typed text), or the source's lettering thresholded at Otsu (pictures)
  ink B     where the thread covers a pixel by half or more (typed), or the render's luminance on the same side of the same threshold (pictures)
  tolerance 1 pixel = 0.125 mm ("0.1 mm"): a pixel that lies within 1 px of the other mask counts as matched
  recall    share of A within tolerance of B          precision  share of B within tolerance of A
  tIoU      I / (|A| + |B| - I)  with  I = (|A & dil(B)| + |B & dil(A)|) / 2   (1.0 = the same shape up to the tolerance)
  counters  the holes of A (the loops of A, R, e, a, 2, 6, 0 ...): kept when half of the hole's core is still bare cloth in B; "stitchable" = at least 0.5 mm wide
  rough     perimeter(B) / perimeter(A)  (1 = as smooth as the glyphs; more = ragged edges)
  shift     distance between the two centres of mass, mm
  trace_*   the same metrics for the TRACER's outlines (what the engine is given) against A: they tell the trace stage from the engine stage
"""
import sys, os, json, math, csv
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
SCRATCH = os.path.dirname(HERE)
OUT = os.path.join(HERE, "out")
TYPED = os.path.join(HERE, "cache", "typed")
PPM = 8.0
TOL = 1  # pixels (0.125 mm at 8 px/mm)
STR_LABEL = {"ave": "AVE MARIA", "ham": "Hamburgefonts 2026"}
SIZES = [3, 4, 5, 6, 8, 10, 15]
FONT_PATHS = ["C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/consola.ttf"]


def font(size):
    for p in FONT_PATHS:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


# ------------------------------------------------------------------ morphology, components (numpy only)
def pad1(m, v=False):
    return np.pad(m, 1, constant_values=v)


def dil1(m):
    p = pad1(m)
    return m | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]


def ero1(m):
    p = pad1(m)
    return m & p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:]


def perimeter(m):
    p = pad1(m)
    return int(np.count_nonzero(p[:, 1:] != p[:, :-1]) + np.count_nonzero(p[1:, :] != p[:-1, :]))


def label4(mask):
    """4-connected components of a boolean mask by run-length union-find. Returns (labels int32 (0 = none), count)."""
    H, W = mask.shape
    padded = np.zeros((H, W + 2), dtype=np.int8)
    padded[:, 1:-1] = mask
    d = np.diff(padded, axis=1)
    parent = [0]

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    prev, rows, nid = [], [], 0
    for y in range(H):
        starts = np.flatnonzero(d[y] == 1)
        ends = np.flatnonzero(d[y] == -1)
        cur = []
        j = 0
        for s, e in zip(starts.tolist(), ends.tolist()):
            nid += 1
            parent.append(nid)
            cur.append((s, e, nid))
            while j < len(prev) and prev[j][1] <= s:
                j += 1
            k = j
            while k < len(prev) and prev[k][0] < e:
                a, b = find(nid), find(prev[k][2])
                if a != b:
                    parent[max(a, b)] = min(a, b)
                k += 1
        rows.append(cur)
        prev = cur
    remap, labels = {}, np.zeros((H, W), dtype=np.int32)
    for y, cur in enumerate(rows):
        for s, e, i in cur:
            r = find(i)
            if r not in remap:
                remap[r] = len(remap) + 1
            labels[y, s:e] = remap[r]
    return labels, len(remap)


def centroid(m):
    ys, xs = np.nonzero(m)
    if len(xs) == 0:
        return None
    return float(xs.mean()), float(ys.mean())


def counters_of(A):
    """The holes of the ink mask A: [{area, mask}] (areas in pixels), ground regions that do not reach the outside."""
    g = pad1(~A, True)
    lab, n = label4(g)
    out = lab[0, 0]
    res = []
    for i in range(1, n + 1):
        if i == out:
            continue
        m = (lab == i)[1:-1, 1:-1]
        a = int(m.sum())
        if a >= 4:
            res.append({"area": a, "mask": m})
    return res


def compare(A, B, counters=None):
    """Tolerant comparison of two ink masks on one grid. `counters` may be passed to reuse A's holes."""
    nA, nB = int(A.sum()), int(B.sum())
    dA, dB = dil1(A) if TOL >= 1 else A, dil1(B) if TOL >= 1 else B
    a_in_b = int((A & dB).sum())
    b_in_a = int((B & dA).sum())
    I = (a_in_b + b_in_a) / 2.0
    out = {
        "area_ideal_mm2": round(nA / PPM / PPM, 2), "ink_ratio": round(nB / max(1, nA), 3),
        "recall": round(a_in_b / max(1, nA), 3), "precision": round(b_in_a / max(1, nB), 3),
        "tiou": round(I / max(1.0, nA + nB - I), 3),
        "rough": round(perimeter(B) / max(1, perimeter(A)), 3),
    }
    ca, cb = centroid(A), centroid(B)
    out["shift_mm"] = round(math.hypot(ca[0] - cb[0], ca[1] - cb[1]) / PPM, 3) if ca and cb else None
    cs = counters if counters is not None else counters_of(A)
    kept = stitch = stitch_kept = 0
    for c in cs:
        core = ero1(c["mask"])
        if not core.any():
            core = c["mask"]
        open_frac = float((core & ~B).sum()) / max(1, int(core.sum()))
        k = open_frac >= 0.5
        s = bool(ero1(ero1(c["mask"])).any())
        kept += k
        stitch += s
        stitch_kept += (k and s)
    out["counters"] = len(cs)
    out["counters_kept"] = int(kept)
    out["counters_stitchable"] = int(stitch)
    out["counters_stitchable_kept"] = int(stitch_kept)
    la, na = label4(A)
    lb, nb = label4(B)
    out["pieces_ideal"], out["pieces_ink"] = na, nb
    return out


# ------------------------------------------------------------------ typed cells
def load_manifest():
    return json.load(open(os.path.join(TYPED, "manifest.json"), encoding="utf8"))


def cell_geometry(cell_id):
    """The cached canvas of a typed cell: alpha plane, mm per pixel and the bbox of its ink in canvas px."""
    meta = json.load(open(os.path.join(TYPED, cell_id, "meta.json"), encoding="utf8"))
    a = np.fromfile(os.path.join(TYPED, cell_id, "alpha.u8"), dtype=np.uint8).reshape(meta["height"], meta["width"])
    ys, xs = np.nonzero(a >= 128)
    return meta, a, (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)


def padded_grid(st, a, meta, ibox):
    """The metric grid: the render's grid grown by whole pixels so that it also holds the whole ideal (a lost letter must count as lost).
    Returns (origin_x_mm, origin_y_mm, W, H, padL, padT) in design millimetres."""
    r = st["render"]
    ppm = r["pxPerMm"]
    cpm = meta["pxPerMm"]
    cx, cy = st["ideal"]["cx"], st["ideal"]["cy"]
    ix0, iy0 = ibox[0] / cpm - cx, ibox[1] / cpm - cy
    ix1, iy1 = ibox[2] / cpm - cx, ibox[3] / cpm - cy
    padL = max(0, math.ceil((r["originX"] - (ix0 - 1.0)) * ppm))
    padT = max(0, math.ceil((r["originY"] - (iy0 - 1.0)) * ppm))
    right = r["originX"] + r["width"] / ppm
    bottom = r["originY"] + r["height"] / ppm
    padR = max(0, math.ceil(((ix1 + 1.0) - right) * ppm))
    padB = max(0, math.ceil(((iy1 + 1.0) - bottom) * ppm))
    return r["originX"] - padL / ppm, r["originY"] - padT / ppm, r["width"] + padL + padR, r["height"] + padT + padB, padL, padT


def ideal_on_grid(a, meta, st, gx0, gy0, W, H):
    cpm = meta["pxPerMm"]
    cx, cy = st["ideal"]["cx"], st["ideal"]["cy"]
    pad = int(math.ceil(max(W, H) / PPM * cpm)) + 8
    P = np.pad(a, pad)
    left = (gx0 + cx) * cpm + pad
    top = (gy0 + cy) * cpm + pad
    right = left + W / PPM * cpm
    bottom = top + H / PPM * cpm
    # (the box may lie partly outside the canvas on a short string: the padding is empty paper)
    im = Image.fromarray(P).resize((W, H), Image.BOX, box=(left, top, right, bottom))
    return np.asarray(im) >= 128


def rings_mask(rings, gx0, gy0, W, H):
    m = np.zeros((H, W), dtype=bool)
    for ring in rings:
        im = Image.new("L", (W, H), 0)
        ImageDraw.Draw(im).polygon([((x - gx0) * PPM, (y - gy0) * PPM) for x, y in ring], fill=255)
        m ^= np.asarray(im) >= 128
    return m


def typed_grids(vdir, c):
    d = os.path.join(vdir, "typed", c["id"])
    st = json.load(open(os.path.join(d, "stats.json"), encoding="utf8"))
    meta, a, ibox = cell_geometry(c["id"])
    if st.get("nothing"):
        return st, None
    gx0, gy0, W, H, padL, padT = padded_grid(st, a, meta, ibox)
    r = st["render"]
    cov = np.fromfile(os.path.join(d, "cover.u8"), dtype=np.uint8).reshape(r["height"], r["width"])
    Bfull = np.zeros((H, W), dtype=bool)
    Bfull[padT:padT + r["height"], padL:padL + r["width"]] = cov >= 128
    A = ideal_on_grid(a, meta, st, gx0, gy0, W, H)
    rings = json.load(open(os.path.join(d, "rings.json"), encoding="utf8"))
    T = rings_mask(rings, gx0, gy0, W, H)
    return st, dict(A=A, B=Bfull, T=T, gx0=gx0, gy0=gy0, W=W, H=H, padL=padL, padT=padT)


def typed_metrics(vdir):
    res = {}
    for c in load_manifest():
        st, g = typed_grids(vdir, c)
        row = {"id": c["id"], "font": c["font"], "bold": c["bold"], "size": c["size"], "str": c["str"]}
        if g is None:
            row["nothing"] = True
            res[c["id"]] = row
            continue
        cs = counters_of(g["A"])
        m = compare(g["A"], g["B"], cs)
        t = compare(g["A"], g["T"], cs)
        row.update(m)
        row.update({"trace_" + k: v for k, v in t.items() if k in ("tiou", "recall", "precision", "ink_ratio", "counters_kept", "counters_stitchable_kept")})
        kinds = st.get("kinds")
        total = sum(v["stitches"] for v in kinds.values()) if kinds else 0
        row.update({
            "stitches": st["stitches"], "trims": st["trims"], "jumps": st["jumps"], "thread_mm": st["threadMm"], "runs": st.get("runs"),
            "kinds": kinds, "islands": st.get("islands"),
        })
        if kinds and total:
            for k in ("satin", "fill", "underlay", "line", "outline"):
                row["share_" + k] = round(kinds.get(k, {}).get("stitches", 0) / total, 3)
        isl = st.get("islands") or {}
        tot_area = sum(v["area"] for v in isl.values()) or 1
        for k in ("satin", "tatami", "line"):
            row["area_" + k] = round(isl.get(k, {}).get("area", 0) / tot_area, 3)
        row["n_islands"] = {k: v["islands"] for k, v in isl.items()}
        row["why"] = st.get("why", [])
        row["warnings"] = st.get("warnings", [])
        res[c["id"]] = row
    return res


# ------------------------------------------------------------------ picture crops
# (source px box x0,y0,x1,y1; ink = "dark" letters on lighter ground, or "light")
CHART_ROWS = [(6, 122), (5, 198), (4, 264), (3.5, 325), (3, 381), (2.5, 432), (2, 478)]


def pic_crops():
    out = []
    for mm, base in CHART_ROWS:
        cap = mm * 10
        out.append(dict(id=f"chart2_sans_{mm:g}mm", group="chart2", set="chart2", name="chart", box=(60, int(base - cap - 8), 485, base + 8), ink="dark", note=f"Arial bold {mm:g} mm caps"))
    for mm, base in CHART_ROWS:
        cap = mm * 10
        out.append(dict(id=f"chart2_serif_{mm:g}mm", group="chart2", set="chart2", name="chart", box=(530, int(base - cap - 8), 895, base + 8), ink="dark", note=f"Times {mm:g} mm caps"))
    out += [
        dict(id="crest_ave_maria", group="crest", set="reg18", name="crest_manzanares", box=(100, 425, 170, 810), ink="dark", note="AVE MARIA, serif, rotated"),
        dict(id="crest_gratia_plena", group="crest", set="reg18", name="crest_manzanares", box=(598, 372, 658, 838), ink="dark", note="GRATIA PLENA, serif, rotated"),
        # (the sign is seen at an angle: the words are cut one by one so that each box lies inside the dark plate)
        dict(id="stxavier_st", group="signs", set="new55", name="text_serif_sign_st_xavier", box=(118, 402, 238, 500), ink="light", note="ST. gold on a dark sign (photo)"),
        dict(id="stxavier_xavier", group="signs", set="new55", name="text_serif_sign_st_xavier", box=(272, 426, 520, 522), ink="light", note="XAVIER gold on a dark sign (photo)"),
        dict(id="stxavier_high", group="signs", set="new55", name="text_serif_sign_st_xavier", box=(540, 452, 656, 528), ink="light", note="HIGH gold on a dark sign (photo)"),
        dict(id="stxavier_school", group="signs", set="new55", name="text_serif_sign_st_xavier", box=(664, 468, 792, 538), ink="light", note="SCHOOL gold on a dark sign (photo)"),
        dict(id="medstead_sign", group="signs", set="new55", name="text_sans_sign_medstead", box=(170, 168, 808, 312), ink="light", note="white sans on green (photo)"),
        dict(id="torrance_incorporated", group="seal", set="new55", name="emblems_seal_torrance_bw", box=(283, 702, 722, 832), ink="dark", note="INCORPORATED 1921, small bold caps on an arc"),
        dict(id="torrance_california", group="seal", set="new55", name="emblems_seal_torrance_bw", box=(190, 755, 830, 965), ink="dark", note="CALIFORNIA, big serif on an arc (rope border inside the crop)"),
        dict(id="sdl_tagline", group="logos", set="new55", name="emblems_logo_sdl", box=(250, 333, 757, 382), ink="dark", note="Simple Directmedia Layer, small bold sans"),
        dict(id="sdl_big", group="logos", set="new55", name="emblems_logo_sdl", box=(0, 25, 752, 322), ink="dark", note="SDL, big heavy sans"),
        dict(id="washington_island", group="logos", set="new55", name="emblems_flag_washington_island", box=(328, 520, 662, 605), ink="dark", note="Washington Island, Wi., rounded display face"),
    ]
    return out


def find_src(set_, name):
    for base in (os.path.join(HERE, "cache"), os.path.join(SCRATCH, "faces", "cache")):
        d = os.path.join(base, set_, name)
        if os.path.exists(os.path.join(d, "image.rgba")):
            return d
    raise FileNotFoundError(f"{set_}/{name}")


_src_cache = {}


def source_rgb(set_, name):
    k = (set_, name)
    if k not in _src_cache:
        d = find_src(set_, name)
        m = json.load(open(os.path.join(d, "meta.json"), encoding="utf8"))
        a = np.fromfile(os.path.join(d, "image.rgba"), dtype=np.uint8).reshape(m["height"], m["width"], 4).astype(np.float32)
        # a transparent picture (the chart is an SVG with no paper) holds black under its clear pixels: lay it on white, as the eye sees it
        al = a[..., 3:4] / 255.0
        _src_cache[k] = a[..., :3] * al + 255.0 * (1.0 - al)
    return _src_cache[k]


def lum(rgb):
    return 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]


def otsu(L):
    h, _ = np.histogram(np.clip(L, 0, 255), bins=256, range=(0, 256))
    h = h.astype(np.float64)
    tot = h.sum()
    if tot == 0:
        return 128.0
    cum = np.cumsum(h)
    cmean = np.cumsum(h * np.arange(256))
    gm = cmean[-1]
    w0 = cum / tot
    w1 = 1 - w0
    mu0 = cmean / np.maximum(cum, 1e-9)
    mu1 = (gm - cmean) / np.maximum(tot - cum, 1e-9)
    var = w0 * w1 * (mu0 - mu1) ** 2
    return float(np.argmax(var))


def pic_grids(vdir, crop):
    """Source lettering and render lettering of one crop on the render's pixel grid. Returns None when the picture was not converted."""
    d = os.path.join(vdir, "pics", f"{crop['set']}__{crop['name']}")
    sp = os.path.join(d, "stats.json")
    if not os.path.exists(sp):
        return None
    st = json.load(open(sp, encoding="utf8"))
    r = st["render"]
    ppm = r["pxPerMm"]
    x0, y0, x1, y1 = crop["box"]
    mpp = st["mmPerPx"]
    sx, sy = st["source"]["originX"], st["source"]["originY"]
    # the crop's box in render pixels, grown to whole pixels
    u0 = math.floor((sx + x0 * mpp - r["originX"]) * ppm)
    v0 = math.floor((sy + y0 * mpp - r["originY"]) * ppm)
    u1 = math.ceil((sx + x1 * mpp - r["originX"]) * ppm)
    v1 = math.ceil((sy + y1 * mpp - r["originY"]) * ppm)
    W, H = u1 - u0, v1 - v0
    rgb = source_rgb(crop["set"], crop["name"])
    # the same region in source pixels (fractional): BOX-averaged straight onto the render grid
    bx0 = ((u0 / ppm + r["originX"]) - sx) / mpp
    by0 = ((v0 / ppm + r["originY"]) - sy) / mpp
    bx1 = ((u1 / ppm + r["originX"]) - sx) / mpp
    by1 = ((v1 / ppm + r["originY"]) - sy) / mpp
    pad = 4
    P = np.pad(rgb, ((pad, pad), (pad, pad), (0, 0)), mode="edge")
    src_img = Image.fromarray(np.clip(P, 0, 255).astype(np.uint8)).resize((W, H), Image.BOX, box=(bx0 + pad, by0 + pad, bx1 + pad, by1 + pad))
    src_rgb = np.asarray(src_img)
    ren = Image.open(os.path.join(d, "render.png")).convert("RGB")
    cloth = tuple(int(st["cloth"][i:i + 2], 16) for i in (1, 3, 5))
    canvas = Image.new("RGB", (W, H), cloth)
    canvas.paste(ren, (-u0, -v0))
    ren_rgb = np.asarray(canvas)
    Ls, Lr = lum(src_rgb.astype(np.float32)), lum(ren_rgb.astype(np.float32))
    T = otsu(Ls)
    if crop["ink"] == "dark":
        A, B = Ls < T, Lr < T
    else:
        A, B = Ls > T, Lr > T
    return dict(st=st, A=A, B=B, src=src_rgb, ren=ren_rgb, T=T, W=W, H=H)


def pic_metrics(vdir):
    res = {}
    for crop in pic_crops():
        g = pic_grids(vdir, crop)
        if g is None:
            continue
        m = compare(g["A"], g["B"])
        m.update({"id": crop["id"], "group": crop["group"], "note": crop["note"], "threshold": round(g["T"], 1), "stitches_picture": g["st"]["stitches"], "kinds_picture": g["st"].get("kinds")})
        res[crop["id"]] = m
    return res


# ------------------------------------------------------------------ writing the numbers
def write_metrics(variant):
    vdir = os.path.join(OUT, variant)
    typed = typed_metrics(vdir)
    json.dump(typed, open(os.path.join(vdir, "metrics_typed.json"), "w", encoding="utf8"), indent=0)
    pics = pic_metrics(vdir)
    json.dump(pics, open(os.path.join(vdir, "metrics_pics.json"), "w", encoding="utf8"), indent=0)
    print(f"metrics: {len(typed)} typed cells, {len(pics)} picture crops -> {vdir}")


def fmt(x, nd=2):
    return "-" if x is None else (f"{x:.{nd}f}" if isinstance(x, float) else str(x))


def cell_label(m):
    if m.get("nothing"):
        return "NOTHING TO STITCH"
    ck = f"{m['counters_kept']}/{m['counters']}"
    sk = f"{m['counters_stitchable_kept']}/{m['counters_stitchable']}"
    dom = ""
    if "share_satin" in m:
        parts = [(k, m.get("share_" + k, 0)) for k in ("satin", "fill", "underlay", "line", "outline")]
        parts = [f"{k} {int(round(v * 100))}%" for k, v in parts if v >= 0.05]
        dom = " ".join(parts)
    return f"tIoU {m['tiou']:.2f}  rec {m['recall']:.2f}  prec {m['precision']:.2f}  holes {ck} (>=0.5mm {sk})  {m['stitches']} st {m['trims']} tr {m['jumps']} jmp  {dom}"



def scorecard(rows, pics=None):
    """The headline numbers of a variant, comparable between variants (counts of cells that fail each test; means)."""
    ok = [r for r in rows if not r.get("nothing")]

    def n(f):
        return sum(1 for r in ok if f(r))

    def mean(xs):
        xs = [x for x in xs if x is not None]
        return round(sum(xs) / len(xs), 3) if xs else None

    sc = {
        "typed cells stitched": f"{len(ok)} of {len(rows)}",
        "mean tIoU, all cells": mean([r["tiou"] for r in ok]),
        "mean tIoU, caps 3-6 mm": mean([r["tiou"] for r in ok if r["size"] <= 6]),
        "mean tIoU, caps 8-15 mm": mean([r["tiou"] for r in ok if r["size"] >= 8]),
        "mean tIoU, serif+times 3-6 mm": mean([r["tiou"] for r in ok if r["font"] in ("serif", "times") and r["size"] <= 6]),
        "mean recall, serif+times 3-6 mm": mean([r["recall"] for r in ok if r["font"] in ("serif", "times") and r["size"] <= 6]),
        "mean precision, all cells": mean([r["precision"] for r in ok]),
        "mean ink ratio (thread ink / glyph ink), all cells": mean([r["ink_ratio"] for r in ok]),
        "cells with tIoU < 0.80": n(lambda r: r["tiou"] < 0.80),
        "cells with recall < 0.90 (strokes missing)": n(lambda r: r["recall"] < 0.90),
        "cells with precision < 0.85 (heavy, thread past the edge)": n(lambda r: r["precision"] < 0.85),
        "cells that lose a hole >= 0.5 mm wide": n(lambda r: r["counters_stitchable_kept"] < r["counters_stitchable"]),
        "cells that lose any hole": n(lambda r: r["counters_kept"] < r["counters"]),
        "cells that are mostly line stitches (> 50%)": n(lambda r: r.get("share_line", 0) > 0.5),
        "cells that mix two stitch types (each >= 15%)": n(lambda r: sum(1 for k in ("satin", "fill", "line") if r.get("share_" + k, 0) >= 0.15) >= 2),
        "cells whose letters break into more pieces (+2)": n(lambda r: r["pieces_ink"] > r["pieces_ideal"] + 1),
        "cells whose letters fuse (-2 pieces)": n(lambda r: r["pieces_ink"] < r["pieces_ideal"] - 1),
        "cells whose TRACED outlines already miss (trace tIoU < 0.95)": n(lambda r: r["trace_tiou"] < 0.95),
        "mean stitches per cell": mean([r["stitches"] for r in ok]),
    }
    if pics:
        def pm(prefix):
            return mean([v["tiou"] for k, v in pics.items() if k.startswith(prefix)])
        sc.update({
            "chart: mean tIoU, Arial bold rows (6-2 mm)": pm("chart2_sans"),
            "chart: mean tIoU, Times rows (6-2 mm)": pm("chart2_serif"),
            "chart: Times rows 3-2 mm": mean([v["tiou"] for k, v in pics.items() if k in ("chart2_serif_3mm", "chart2_serif_2.5mm", "chart2_serif_2mm")]),
            "crest lettering (2 crops)": pm("crest"),
            "sign photos: gold on dark (4 crops)": pm("stxavier"),
            "sign photo: white on green": pm("medstead"),
            "seal + logos (5 crops)": mean([v["tiou"] for k, v in pics.items() if k.startswith(("torrance", "sdl", "washington"))]),
        })
    return sc


def score_lines(sc):
    return [f"| {k} | {v} |" for k, v in sc.items()]


def write_table(variant):
    vdir = os.path.join(OUT, variant)
    typed = json.load(open(os.path.join(vdir, "metrics_typed.json"), encoding="utf8"))
    rows = list(typed.values())
    cols = ["id", "font", "bold", "size", "str", "tiou", "recall", "precision", "ink_ratio", "counters", "counters_kept", "counters_stitchable", "counters_stitchable_kept",
            "pieces_ideal", "pieces_ink", "rough", "shift_mm", "trace_tiou", "trace_recall", "trace_precision", "trace_counters_kept", "trace_counters_stitchable_kept",
            "stitches", "trims", "jumps", "thread_mm", "share_satin", "share_fill", "share_underlay", "share_line", "share_outline", "area_satin", "area_tatami", "area_line"]
    with open(os.path.join(vdir, "table.csv"), "w", newline="", encoding="utf8") as f:
        w = csv.writer(f)
        w.writerow(cols)
        for r in rows:
            w.writerow([r.get(c, "") for c in cols])
    # the per font x size markdown tables
    order = ["sans", "black", "condensed", "humanist", "serif", "times", "mono", "script", "round"]
    lines = [f"# Lettering bench: per font x size ({variant})", "",
             "Each cell: **tIoU** (tolerant IoU against the font's own glyphs, 1.0 = same shape within 0.125 mm), holes kept as kept/total, stitches. AVE = `AVE MARIA`, HAM = `Hamburgefonts 2026`. Bold on unless the font says regular.", ""]
    for font_id in order:
        for bold in (True, False):
            sub = [r for r in rows if r["font"] == font_id and r["bold"] == bold]
            if not sub:
                continue
            lines += [f"## {font_id} {'bold' if bold else 'regular'}", "", "| cap mm | AVE tIoU | AVE rec/prec | AVE holes | AVE st/tr | HAM tIoU | HAM rec/prec | HAM holes | HAM st/tr | stitch types (HAM) |", "|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|"]
            for size in SIZES:
                cells = {r["str"]: r for r in sub if r["size"] == size}
                a, h = cells.get("ave"), cells.get("ham")

                def part(r):
                    if r is None or r.get("nothing"):
                        return ["-", "-", "-", "-"]
                    return [f"{r['tiou']:.2f}", f"{r['recall']:.2f}/{r['precision']:.2f}", f"{r['counters_kept']}/{r['counters']}", f"{r['stitches']}/{r['trims']}"]

                kinds = ""
                if h and not h.get("nothing") and "share_satin" in h:
                    kinds = " ".join(f"{k} {int(round(h.get('share_' + k, 0) * 100))}%" for k in ("satin", "fill", "underlay", "line") if h.get("share_" + k, 0) >= 0.05)
                lines.append("| " + " | ".join([f"{size}"] + part(a) + part(h) + [kinds]) + " |")
            lines.append("")
    open(os.path.join(vdir, "table.md"), "w", encoding="utf8").write("\n".join(lines))

    # a summary: by size, by font, the worst cells
    ok = [r for r in rows if not r.get("nothing")]

    def mean(xs):
        xs = [x for x in xs if x is not None]
        return sum(xs) / len(xs) if xs else float("nan")

    pics_path = os.path.join(vdir, "metrics_pics.json")
    pics = json.load(open(pics_path, encoding="utf8")) if os.path.exists(pics_path) else None
    sc = scorecard(rows, pics)
    s = [f"# Summary ({variant})", "", "## Scorecard (the same numbers for every variant: compare them with `tools_text.py compare`)", "", "| test | value |", "|---|---:|"] + score_lines(sc) + ["", f"{len(ok)} of {len(rows)} cells stitched.", "", "## By cap height (mean over every font and string)", "", "| cap mm | tIoU | recall | precision | holes kept | holes >=0.5mm kept | trace tIoU | stitches |", "|---:|---:|---:|---:|---:|---:|---:|---:|"]
    for size in SIZES:
        sub = [r for r in ok if r["size"] == size]
        hk = sum(r["counters_kept"] for r in sub), sum(r["counters"] for r in sub)
        sk = sum(r["counters_stitchable_kept"] for r in sub), sum(r["counters_stitchable"] for r in sub)
        s.append(f"| {size} | {mean([r['tiou'] for r in sub]):.2f} | {mean([r['recall'] for r in sub]):.2f} | {mean([r['precision'] for r in sub]):.2f} | {hk[0]}/{hk[1]} | {sk[0]}/{sk[1]} | {mean([r['trace_tiou'] for r in sub]):.2f} | {mean([r['stitches'] for r in sub]):.0f} |")
    s += ["", "## By font (bold on; mean over sizes and strings)", "", "| font | tIoU | recall | precision | holes kept | tIoU at 3-5 mm | tIoU at 8-15 mm |", "|---|---:|---:|---:|---:|---:|---:|"]
    for font_id in order:
        for bold in (True, False):
            sub = [r for r in ok if r["font"] == font_id and r["bold"] == bold]
            if not sub:
                continue
            hk = sum(r["counters_kept"] for r in sub), sum(r["counters"] for r in sub)
            small = [r["tiou"] for r in sub if r["size"] <= 5]
            big = [r["tiou"] for r in sub if r["size"] >= 8]
            s.append(f"| {font_id}{'' if bold else ' (regular)'} | {mean([r['tiou'] for r in sub]):.2f} | {mean([r['recall'] for r in sub]):.2f} | {mean([r['precision'] for r in sub]):.2f} | {hk[0]}/{hk[1]} | {mean(small):.2f} | {mean(big):.2f} |")
    s += ["", "## Stitch type by cap height (share of stitches, mean over cells; underlay = the mat under a tatami fill)", "", "| cap mm | satin | fill | underlay | line |", "|---:|---:|---:|---:|---:|"]
    for size in SIZES:
        sub = [r for r in ok if r["size"] == size and "share_satin" in r]
        if sub:
            s.append(f"| {size} | " + " | ".join(f"{mean([r.get('share_' + k, 0) for r in sub]) * 100:.0f}%" for k in ("satin", "fill", "underlay", "line")) + " |")
    bad = sorted(ok, key=lambda r: r["tiou"])[:25]
    s += ["", "## The 25 worst cells by tIoU", "", "| cell | tIoU | recall | precision | holes | trace tIoU | stitches/trims/jumps | types |", "|---|---:|---:|---:|---:|---:|---|---|"]
    for r in bad:
        kinds = " ".join(f"{k} {int(round(r.get('share_' + k, 0) * 100))}%" for k in ("satin", "fill", "underlay", "line") if r.get("share_" + k, 0) >= 0.05)
        s.append(f"| {r['id']} | {r['tiou']:.2f} | {r['recall']:.2f} | {r['precision']:.2f} | {r['counters_kept']}/{r['counters']} | {r['trace_tiou']:.2f} | {r['stitches']}/{r['trims']}/{r['jumps']} | {kinds} |")
    open(os.path.join(vdir, "summary.md"), "w", encoding="utf8").write("\n".join(s))
    print(f"table: {os.path.join(vdir, 'table.md')}, {os.path.join(vdir, 'summary.md')}, {os.path.join(vdir, 'table.csv')}")


# ------------------------------------------------------------------ contact sheets
MAG = {3: 3.0, 4: 3.0, 5: 2.0, 6: 2.0, 8: 1.5, 10: 1.0, 15: 0.7}


def typed_panels(vdir, c, mag):
    """(ideal image, render image) of one cell, cropped alike to the ink with a margin and magnified."""
    st, g = typed_grids(vdir, c)
    if g is None:
        return None
    A, B = g["A"], g["B"]
    both = A | B
    ys, xs = np.nonzero(both)
    m = 8
    x0, x1 = max(0, xs.min() - m), min(g["W"], xs.max() + 1 + m)
    y0, y1 = max(0, ys.min() - m), min(g["H"], ys.max() + 1 + m)
    cloth = tuple(int(st["cloth"][i:i + 2], 16) for i in (1, 3, 5))
    ideal = np.zeros((g["H"], g["W"], 3), dtype=np.uint8)
    ideal[:] = cloth
    ideal[A] = (0, 0, 0)
    ren = Image.open(os.path.join(vdir, "typed", c["id"], "render.png")).convert("RGB")
    canvas = Image.new("RGB", (g["W"], g["H"]), cloth)
    canvas.paste(ren, (g["padL"], g["padT"]))
    box = (x0, y0, x1, y1)
    a = Image.fromarray(ideal).crop(box)
    b = canvas.crop(box)
    if mag != 1:
        size = (max(1, int(round(a.width * mag))), max(1, int(round(a.height * mag))))
        a, b = a.resize(size, Image.LANCZOS), b.resize(size, Image.LANCZOS)
    return a, b


def make_sheet(vdir, metrics, font_id, bold, sizes, out_path, title):
    manifest = [c for c in load_manifest() if c["font"] == font_id and c["bold"] == bold]
    if not manifest:
        return False
    f13, f11, f16 = font(13), font(11), font(16)
    cells = {}
    for c in manifest:
        if c["size"] in sizes:
            p = typed_panels(vdir, c, MAG[c["size"]])
            cells[(c["size"], c["str"])] = (c, p)
    cols = ["ave", "ham"]
    colw = {k: max([p[1][0].width for (s, kk), p in cells.items() if kk == k and p[1]] + [200]) for k in cols}
    label_w, gap, head = 70, 10, 34
    rowh = {}
    for s in sizes:
        hs = [p[1][0].height * 2 + 6 for (ss, kk), p in cells.items() if ss == s and p[1]]
        rowh[s] = (max(hs) if hs else 40) + 22 + gap
    W = label_w + sum(colw[k] + gap for k in cols) + gap
    H = head + 22 + sum(rowh[s] for s in sizes) + gap
    sheet = Image.new("RGB", (W, H), (255, 255, 255))
    d = ImageDraw.Draw(sheet)
    d.text((gap, 8), title, fill=(0, 0, 0), font=f16)
    x = label_w
    for k in cols:
        d.text((x, head), STR_LABEL[k], fill=(60, 60, 60), font=f13)
        x += colw[k] + gap
    y = head + 22
    for s in sizes:
        d.text((gap, y + 16), f"{s} mm", fill=(0, 0, 0), font=f13)
        d.text((gap, y + 34), f"x{MAG[s]:g}", fill=(120, 120, 120), font=f11)
        x = label_w
        for k in cols:
            c, p = cells.get((s, k), (None, None))
            if p:
                m = metrics[c["id"]]
                d.text((x, y), cell_label(m), fill=(150, 20, 20) if m["tiou"] < 0.7 else (20, 90, 20), font=f11)
                sheet.paste(p[0], (x, y + 16))
                sheet.paste(p[1], (x, y + 16 + p[0].height + 6))
            x += colw[k] + gap
        y += rowh[s]
    sheet.save(out_path)
    return True


def write_sheets(variant):
    vdir = os.path.join(OUT, variant)
    metrics = json.load(open(os.path.join(vdir, "metrics_typed.json"), encoding="utf8"))
    sd = os.path.join(vdir, "sheets")
    os.makedirs(sd, exist_ok=True)
    fonts = ["sans", "black", "condensed", "humanist", "serif", "times", "mono", "script", "round"]
    n = 0
    for fid in fonts:
        for bold in (True, False):
            suffix = "" if bold else "_regular"
            ok = make_sheet(vdir, metrics, fid, bold, SIZES, os.path.join(sd, f"{fid}{suffix}.png"), f"{fid} {'bold' if bold else 'regular'}  -  {variant}  -  top: the font's glyphs, below: the stitched render (8 px/mm, magnified x as marked)")
            if ok:
                n += 1
                make_sheet(vdir, metrics, fid, bold, [3, 4, 5, 6], os.path.join(sd, f"{fid}{suffix}_small.png"), f"{fid} {'bold' if bold else 'regular'} 3-6 mm  -  {variant}")
                make_sheet(vdir, metrics, fid, bold, [8, 10, 15], os.path.join(sd, f"{fid}{suffix}_large.png"), f"{fid} {'bold' if bold else 'regular'} 8-15 mm  -  {variant}")
    print(f"sheets: {n} fonts -> {sd}")


# ------------------------------------------------------------------ picture crop sheets (one or more variants side by side)
def write_picsheets(variants):
    vs = variants.split(",")
    base = os.path.join(OUT, vs[0], "sheets")
    os.makedirs(base, exist_ok=True)
    f12, f11, f16 = font(12), font(11), font(16)
    groups = {}
    for crop in pic_crops():
        groups.setdefault(crop["group"], []).append(crop)
    metrics = {v: json.load(open(os.path.join(OUT, v, "metrics_pics.json"), encoding="utf8")) for v in vs}
    for gname, crops in groups.items():
        rows = []
        for crop in crops:
            gs = [(v, pic_grids(os.path.join(OUT, v), crop)) for v in vs]
            if any(g is None for _, g in gs):
                continue
            w8 = gs[0][1]["W"]
            zoom = min(2.0, 700.0 / max(1, w8))
            def z(arr):
                im = Image.fromarray(arr)
                return im.resize((max(1, int(round(im.width * zoom))), max(1, int(round(im.height * zoom)))), Image.LANCZOS)
            panels = [("source", z(gs[0][1]["src"]), None)] + [(v, z(g["ren"]), metrics[v].get(crop["id"])) for v, g in gs]
            rows.append((crop, zoom, panels))
        if not rows:
            continue
        gap = 10
        colw = [max([r[2][i][1].width for r in rows] + [470]) for i in range(len(rows[0][2]))]  # (wide enough for the metrics line above each panel)
        W = 150 + sum(colw) + gap * (len(colw) + 1)
        H = 36 + sum(max(p[1].height for p in r[2]) + 34 + gap for r in rows)
        sheet = Image.new("RGB", (W, H), (255, 255, 255))
        d = ImageDraw.Draw(sheet)
        d.text((gap, 8), f"lettering crops, {gname}: source | " + " | ".join(vs) + "  (8 px/mm, magnified as marked)", fill=(0, 0, 0), font=f16)
        y = 36
        for crop, zoom, panels in rows:
            d.text((gap, y + 14), crop["id"], fill=(0, 0, 0), font=f11)
            d.text((gap, y + 30), crop["note"][:26], fill=(110, 110, 110), font=f11)
            d.text((gap, y + 46), f"x{zoom:.1f}", fill=(110, 110, 110), font=f11)
            x = 150
            for (name, im, m), cw in zip(panels, colw):
                lab = name if m is None else f"{name}: tIoU {m['tiou']:.2f} rec {m['recall']:.2f} prec {m['precision']:.2f} holes {m['counters_kept']}/{m['counters']}"
                d.text((x, y), lab, fill=(40, 40, 40), font=f11)
                sheet.paste(im, (x, y + 16))
                x += cw + gap
            y += max(p[1].height for p in panels) + 34 + gap
        path = os.path.join(base, f"pics_{gname}.png")
        sheet.save(path)
        print("picsheet:", path)


# ------------------------------------------------------------------ comparing two variants
def write_compare(a, b):
    ma = json.load(open(os.path.join(OUT, a, "metrics_typed.json"), encoding="utf8"))
    mb = json.load(open(os.path.join(OUT, b, "metrics_typed.json"), encoding="utf8"))
    pa = json.load(open(os.path.join(OUT, a, "metrics_pics.json"), encoding="utf8"))
    pb = json.load(open(os.path.join(OUT, b, "metrics_pics.json"), encoding="utf8"))
    lines = [f"# {a} vs {b}", "", "## Scorecard", "", f"| test | {a} | {b} |", "|---|---:|---:|"]
    sa, sb = scorecard(list(ma.values()), pa), scorecard(list(mb.values()), pb)
    lines += [f"| {k} | {sa[k]} | {sb[k]} |" for k in sa]
    lines.append("")
    diffs = []
    for k, r in ma.items():
        s = mb.get(k)
        if not s or r.get("nothing") or s.get("nothing"):
            continue
        diffs.append((s["tiou"] - r["tiou"], k, r, s))
    same = sum(1 for d in diffs if abs(d[0]) < 0.005 and diffs and diffs[0][2]["stitches"] is not None)
    identical = sum(1 for _, k, r, s in diffs if r["stitches"] == s["stitches"] and r["trims"] == s["trims"] and r["jumps"] == s["jumps"] and abs(r["tiou"] - s["tiou"]) < 1e-9)
    lines += [f"Typed cells compared: {len(diffs)}; identical stitch counts and tIoU: {identical}; changed by more than 0.005 tIoU: {sum(1 for d in diffs if abs(d[0]) >= 0.005)}.", ""]
    moved = sorted([d for d in diffs if abs(d[0]) >= 0.005], key=lambda d: d[0])
    if moved:
        lines += ["| cell | tIoU " + a + " | tIoU " + b + " | delta | stitches |", "|---|---:|---:|---:|---|"]
        for dlt, k, r, s in moved[:40]:
            lines.append(f"| {k} | {r['tiou']:.2f} | {s['tiou']:.2f} | {dlt:+.3f} | {r['stitches']} -> {s['stitches']} |")
        lines.append("")
    lines += ["## Picture crops", "", f"| crop | tIoU {a} | tIoU {b} | holes {a} | holes {b} |", "|---|---:|---:|---:|---:|"]
    for k, r in pa.items():
        s = pb.get(k)
        if s:
            lines.append(f"| {k} | {r['tiou']:.2f} | {s['tiou']:.2f} | {r['counters_kept']}/{r['counters']} | {s['counters_kept']}/{s['counters']} |")
    p = os.path.join(OUT, f"compare_{a}_vs_{b}.md")
    open(p, "w", encoding="utf8").write("\n".join(lines))
    print("compare:", p)


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    cmd, arg = sys.argv[1], sys.argv[2]
    if cmd == "metrics":
        write_metrics(arg)
    elif cmd == "table":
        write_table(arg)
    elif cmd == "sheets":
        write_sheets(arg)
    elif cmd == "picsheets":
        write_picsheets(arg)
    elif cmd == "compare":
        write_compare(arg, sys.argv[3])
    elif cmd == "all":
        write_metrics(arg)
        write_table(arg)
        write_sheets(arg)
        write_picsheets(arg)
    else:
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
