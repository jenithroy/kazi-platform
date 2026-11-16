"""Edge error of the stitched typed texts: |ink xor glyph| / perimeter(glyph), in mm (how far the stitched edge is out by on average), and the weight, by height. The floor of what the engine does with PERFECT outlines.
usage: python -I edge_probe_typed.py <set typed|typed2> <variant> [<variant> ...] [--maxsize 6.0]
"""
import sys, os, json
import numpy as np
import cv2

sys.stdout.reconfigure(encoding="utf-8")
HERE = r"<SESSION>\scratchpad\text"
args = sys.argv[1:]
SET = args[0]
maxsize = 6.0
for i, a in enumerate(args):
    if a == "--maxsize":
        maxsize = float(args[i + 1])
variants = [a for i, a in enumerate(args[1:], 1) if not a.startswith("--") and (i < 2 or args[i - 1] != "--maxsize")]
manifest = [c for c in json.load(open(os.path.join(HERE, "cache", SET, "manifest.json"), encoding="utf-8")) if c["size"] <= maxsize]
PX = 8.0


def glyph_mask(c):
    d = os.path.join(HERE, "cache", SET, c["id"])
    meta = json.load(open(os.path.join(d, "meta.json"), encoding="utf-8"))
    a = np.fromfile(os.path.join(d, "alpha.u8"), dtype=np.uint8).reshape(meta["height"], meta["width"])
    k = PX / meta["pxPerMm"]
    small = cv2.resize(a, (max(1, round(meta["width"] * k)), max(1, round(meta["height"] * k))), interpolation=cv2.INTER_AREA)
    return small > 127


def ink_mask(variant, c):
    d = os.path.join(HERE, "out", variant, SET, c["id"])
    cov = os.path.join(d, "cover.u8")
    if not os.path.exists(cov):
        rp = os.path.join(d, "render.png")  # DADE: its drawn crop, ink = dark
        if os.path.exists(rp):
            from PIL import Image
            return np.asarray(Image.open(rp).convert("L")) < 128
        return None
    st = json.load(open(os.path.join(d, "stats.json"), encoding="utf-8"))
    r = st.get("render")
    if not r:
        return None
    return np.fromfile(cov, dtype=np.uint8).reshape(r["height"], r["width"]) > 127


def perim_mm(mask):
    cnts, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    return sum(cv2.arcLength(c, True) for c in cnts) / PX


rows = []
for c in manifest:
    g = glyph_mask(c)
    if g.sum() == 0:
        continue
    row = {"size": c["size"], "font": c["font"]}
    ok = True
    for v in variants:
        m = ink_mask(v, c)
        if m is None or m.sum() == 0:
            ok = False
            break
        # the two masks have different sizes (the render has a margin): compare on the glyph's own box, aligned by their centroids of ink
        gy, gx = np.nonzero(g)
        my, mx = np.nonzero(m)
        dy, dx = int(round(my.mean() - gy.mean())), int(round(mx.mean() - gx.mean()))
        H, W = g.shape
        canvas = np.zeros((H + 2 * 40, W + 2 * 40), bool)
        canvas[40:40 + H, 40:40 + W] = g
        sh = np.zeros_like(canvas)
        y0, x0 = 40 + 0 - dy, 40 + 0 - dx
        ys, xs = max(0, y0), max(0, x0)
        ye, xe = min(canvas.shape[0], y0 + m.shape[0]), min(canvas.shape[1], x0 + m.shape[1])
        sh[ys:ye, xs:xe] = m[ys - y0:ye - y0, xs - x0:xe - x0]
        xor = np.logical_xor(canvas, sh).sum() / (PX * PX)
        row[v] = (xor / perim_mm(canvas), sh.sum() / canvas.sum())
    if ok:
        rows.append(row)

print(f"set {SET}: {len(rows)} texts, caps <= {maxsize} mm.  edge error mm (lower is better) / weight (1.00 = as drawn)")
print("".ljust(14) + "".join(f"{v:>18}" for v in variants))
for s in sorted({r['size'] for r in rows}):
    rs = [r for r in rows if r['size'] == s]
    print(f"caps {s:>4} mm  " + "".join(f"{np.mean([r[v][0] for r in rs]):>10.3f} /{np.mean([r[v][1] for r in rs]):>5.2f}" for v in variants) + f"   n={len(rs)}")
rs = rows
print("all".ljust(14) + "".join(f"{np.mean([r[v][0] for r in rs]):>10.3f} /{np.mean([r[v][1] for r in rs]):>5.2f}" for v in variants) + f"   n={len(rs)}")
