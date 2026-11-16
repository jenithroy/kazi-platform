"""How much heavier (or lighter) is the stitched lettering than the drawn letters? For each typed text: the area of the stitched ink against the area of the glyph (W), and the typical stroke width
(twice the area over the outline length) of the stitched ink against the glyph's (S). 1.00 = as drawn; 1.5 = half as heavy again.
Ours: the thread coverage plane cover.u8 (8 px/mm, ink = covered at least half); DADE: its drawn crop (render.png, ink = dark).  The glyph is resampled to the same 8 px/mm.
usage: python -I weight_probe.py <set typed|typed2> <variant> [<variant> ...] [--maxsize 6] [--csv out.csv]
"""
import sys, os, json
import numpy as np
import cv2
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")
HERE = r"<SESSION>\scratchpad\text"
args = sys.argv[1:]
SET = args[0]
variants = [a for a in args[1:] if not a.startswith("--") and not a.endswith(".csv")]
maxsize = 6.0
csv = None
for i, a in enumerate(args):
    if a == "--maxsize":
        maxsize = float(args[i + 1])
    if a == "--csv":
        csv = args[i + 1]
variants = [v for v in variants if v not in (str(maxsize), "6")]
manifest = [c for c in json.load(open(os.path.join(HERE, "cache", SET, "manifest.json"), encoding="utf-8")) if c["size"] <= maxsize]
PX = 8.0


def stats_of(mask, px):
    area = float(mask.sum()) / (px * px)
    cnts, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    per = sum(cv2.arcLength(c, True) for c in cnts) / px
    return area, (2 * area / per) if per > 0 else 0.0


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
    if os.path.exists(cov):
        st = json.load(open(os.path.join(d, "stats.json"), encoding="utf-8"))
        r = st.get("render")
        if not r:
            return None
        a = np.fromfile(cov, dtype=np.uint8).reshape(r["height"], r["width"])
        return a > 127
    rp = os.path.join(d, "render.png")
    if os.path.exists(rp):
        g = np.asarray(Image.open(rp).convert("L"))
        return g < 128
    return None


rows = []
for c in manifest:
    g = glyph_mask(c)
    ag, wg = stats_of(g, PX)
    if ag <= 0:
        continue
    row = {"id": c["id"], "font": c["font"], "size": c["size"], "str": c["str"], "glyph_mm2": ag, "glyph_w": wg}
    ok = True
    for v in variants:
        m = ink_mask(v, c)
        if m is None or m.sum() == 0:
            ok = False
            break
        ar, wr = stats_of(m, PX)
        row[v + "_W"] = ar / ag
        row[v + "_S"] = wr / wg if wg > 0 else 0
    if ok:
        rows.append(row)


def mean(xs):
    return sum(xs) / len(xs) if xs else float("nan")


print(f"set {SET}: {len(rows)} texts, caps <= {maxsize} mm. W = stitched ink area / glyph area, S = stitched stroke width / glyph stroke width (1.00 = as drawn)")
head = "".join(f"{v:>16}" for v in variants)
print(f"{'':28s}{head}")
sub = "".join(f"{'W      S':>16}" for _ in variants)
print(f"{'':28s}{sub}")


def line(label, sel):
    rs = [r for r in rows if sel(r)]
    if not rs:
        return
    cells = "".join(f"{mean([r[v + '_W'] for r in rs]):9.2f}{mean([r[v + '_S'] for r in rs]):7.2f}" for v in variants)
    print(f"{label:28s}{cells}   n={len(rs)}")


line("all texts", lambda r: True)
for s in sorted({r["size"] for r in rows}):
    line(f"caps {s} mm", lambda r, s=s: r["size"] == s)
print()
for f in sorted({r["font"] for r in rows}):
    line(f"font {f}", lambda r, f=f: r["font"] == f)
if csv:
    with open(csv, "w", encoding="utf-8") as fh:
        fh.write("id,font,size,str,glyph_mm2,glyph_w," + ",".join(f"{v}_W,{v}_S" for v in variants) + "\n")
        for r in rows:
            fh.write(f"{r['id']},{r['font']},{r['size']},{r['str']},{r['glyph_mm2']:.3f},{r['glyph_w']:.3f}," + ",".join(f"{r[v + '_W']:.3f},{r[v + '_S']:.3f}" for v in variants) + "\n")
