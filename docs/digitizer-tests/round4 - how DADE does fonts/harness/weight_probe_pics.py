"""How much heavier is the stitched lettering of a picture than the lettering IN the picture? Dark text on white ('line' pictures): the area of the stitched ink in the text's box against the area of the dark pixels of the picture in the same box (W),
and the typical stroke width (2 x area / outline length) ratio (S). 1.00 = as drawn.
usage: python -I weight_probe_pics.py <variantDir> [<variantDir> ...]   (out dirs of replay_pic.mjs / run_pics.mjs: <dir>/pics/lpics__<id>/render.png + stats.json)
"""
import sys, os, json
import numpy as np
import cv2
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")
HERE = r"<SESSION>\scratchpad\text"
CACHE = os.path.join(HERE, "cache", "lpics")
manifest = [m for m in json.load(open(os.path.join(CACHE, "manifest.json"), encoding="utf-8")) if m["kind"] == "line"]
dirs = sys.argv[1:]


def stats_of(mask, px):
    area = float(mask.sum()) / (px * px)
    cnts, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    per = sum(cv2.arcLength(c, True) for c in cnts) / px
    return area, (2 * area / per) if per > 0 else 0.0


rows = []
for m in manifest:
    meta = json.load(open(os.path.join(CACHE, m["id"], "meta.json"), encoding="utf-8"))
    b = meta["boxes"][0]
    box = [max(0, int(b["x0"] - 20)), max(0, int(b["y0"] - 12)), min(meta["width"], int(b["x1"] + 20)), min(meta["height"], int(b["y1"] + 12))]
    raw = np.fromfile(os.path.join(CACHE, m["id"], "image.rgba"), dtype=np.uint8).reshape(meta["height"], meta["width"], 4)
    gray = (0.299 * raw[:, :, 0] + 0.587 * raw[:, :, 1] + 0.114 * raw[:, :, 2])[box[1]:box[3], box[0]:box[2]]
    src = gray < 128
    a_s, w_s = stats_of(src, 10.0)
    if a_s <= 0:
        continue
    row = {"id": m["id"], "font": m["font"], "size": m["size"]}
    ok = True
    for d in dirs:
        name = os.path.basename(d.rstrip("\\/"))
        pd = os.path.join(d, "pics", f"lpics__{m['id']}")
        if not os.path.exists(os.path.join(pd, "render.png")):
            ok = False
            break
        st = json.load(open(os.path.join(pd, "stats.json"), encoding="utf-8"))
        mm, r, so = st["mmPerPx"], st["render"], st["source"]
        x0 = round((box[0] * mm + so["originX"] - r["originX"]) * r["pxPerMm"])
        y0 = round((box[1] * mm + so["originY"] - r["originY"]) * r["pxPerMm"])
        x1 = round((box[2] * mm + so["originX"] - r["originX"]) * r["pxPerMm"])
        y1 = round((box[3] * mm + so["originY"] - r["originY"]) * r["pxPerMm"])
        g = np.asarray(Image.open(os.path.join(pd, "render.png")).convert("L"))[max(0, y0):y1, max(0, x0):x1]
        ink = g < 128
        a_r, w_r = stats_of(ink, r["pxPerMm"])
        row[name + "_W"] = a_r / a_s
        row[name + "_S"] = w_r / w_s if w_s > 0 else 0
    if ok:
        rows.append(row)
names = [os.path.basename(d.rstrip("\\/")) for d in dirs]


def mean(xs):
    return sum(xs) / len(xs) if xs else float("nan")


print(f"{len(rows)} line pictures. W = stitched ink area / the picture's text area, S = stroke width ratio (1.00 = as drawn)")
print(f"{'':22s}" + "".join(f"{n:>16}" for n in names))
print(f"{'':22s}" + "".join(f"{'W      S':>16}" for _ in names))


def line(label, sel):
    rs = [r for r in rows if sel(r)]
    if rs:
        print(f"{label:22s}" + "".join(f"{mean([r[n + '_W'] for r in rs]):9.2f}{mean([r[n + '_S'] for r in rs]):7.2f}" for n in names) + f"   n={len(rs)}")


line("all line pictures", lambda r: True)
for s in (3, 4, 5, 6, 8, 12):
    line(f"caps {s} mm", lambda r, s=s: r["size"] == s)
for f in sorted({r["font"] for r in rows}):
    line(f"font {f} (3-6 mm)", lambda r, f=f: r["font"] == f and r["size"] <= 6)
