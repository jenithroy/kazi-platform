"""Pack the typed-lettering cells of the bench (the glyph pictures the site's text.js draws at 14 px/mm) into PNG sheets for png2dst.com / DADE.
DADE sews 1 px = 0.1 mm, so every cell is resampled to 10 px/mm: a 3 mm capital is 30 px tall, the same physical size as in our own bench.
Black on white, anti-aliased like any logo PNG; each sheet at most 1000 x 1000 px (DADE takes PNG only, <= 1024 px).
usage: python -I build_sheets.py <set: typed|typed2> <max size mm> <out dir>
writes <out>/<set>_NN.png and <out>/<set>_NN.json  ({sheet, w, h, cells: [{id, x, y, w, h}]}, pixels of the sheet)
"""
import sys, os, json
import numpy as np
from PIL import Image

HERE = r"<SESSION>\scratchpad\text"
SET, MAXSIZE, OUT = sys.argv[1], float(sys.argv[2]), sys.argv[3]
os.makedirs(OUT, exist_ok=True)
manifest = json.load(open(os.path.join(HERE, "cache", SET, "manifest.json"), encoding="utf-8"))
manifest = [c for c in manifest if c["size"] <= MAXSIZE]

PX_MM = 10.0
SHEET_W, SHEET_H, GAP, MARGIN = 1000, 1000, 36, 24


def cell_image(c):
    d = os.path.join(HERE, "cache", SET, c["id"])
    meta = json.load(open(os.path.join(d, "meta.json"), encoding="utf-8"))
    a = np.fromfile(os.path.join(d, "alpha.u8"), dtype=np.uint8).reshape(meta["height"], meta["width"])
    im = Image.fromarray(a, "L")
    k = PX_MM / meta["pxPerMm"]
    w, h = max(1, round(meta["width"] * k)), max(1, round(meta["height"] * k))
    im = im.resize((w, h), Image.LANCZOS)
    # crop to the ink box plus a 2 mm margin, so the sheets are not mostly empty
    arr = np.asarray(im)
    ys, xs = np.where(arr > 8)
    if len(xs) == 0:
        return None
    pad = 20
    x0, x1 = max(0, xs.min() - pad), min(w, xs.max() + 1 + pad)
    y0, y1 = max(0, ys.min() - pad), min(h, ys.max() + 1 + pad)
    return im.crop((x0, y0, x1, y1))


sheets, cur, shelf_y, shelf_x, shelf_h = [], None, MARGIN, MARGIN, 0


def new_sheet():
    return {"img": Image.new("L", (SHEET_W, SHEET_H), 255), "cells": []}


cur = new_sheet()
for c in manifest:
    im = cell_image(c)
    if im is None:
        continue
    w, h = im.size
    if w > SHEET_W - 2 * MARGIN:
        print("too wide, skipped:", c["id"], w)
        continue
    if shelf_x + w > SHEET_W - MARGIN:           # next shelf
        shelf_y += shelf_h + GAP
        shelf_x, shelf_h = MARGIN, 0
    if shelf_y + h > SHEET_H - MARGIN:           # next sheet
        sheets.append(cur)
        cur = new_sheet()
        shelf_y, shelf_x, shelf_h = MARGIN, MARGIN, 0
    ink = Image.new("L", im.size, 0)             # black ink where the alpha is
    cur["img"].paste(ink, (shelf_x, shelf_y), im)
    cur["cells"].append({"id": c["id"], "x": shelf_x, "y": shelf_y, "w": w, "h": h})
    shelf_x += w + GAP
    shelf_h = max(shelf_h, h)
sheets.append(cur)

for n, s in enumerate(sheets, 1):
    base = os.path.join(OUT, f"{SET}_{n:02d}")
    s["img"].convert("RGB").save(base + ".png", optimize=True)
    json.dump({"sheet": f"{SET}_{n:02d}", "w": SHEET_W, "h": SHEET_H, "pxPerMm": PX_MM, "cells": s["cells"]}, open(base + ".json", "w"), indent=1)
    print(f"{SET}_{n:02d}: {len(s['cells'])} cells, {os.path.getsize(base + '.png') // 1024} KB")
print("cells", sum(len(s["cells"]) for s in sheets), "of", len(manifest))
