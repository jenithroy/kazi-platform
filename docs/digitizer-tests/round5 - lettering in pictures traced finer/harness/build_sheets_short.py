"""Pack a subset of the short-word pictures (text/cache/lpicss) into DADE sheets, three under each other with a white gap, exactly as build_lpics_sheets.py does for lpics.
usage: python -I build_sheets_short.py <out dir> [--fonts sans,serif,...] [--sizes 3,4]      writes <out>/lps_line_NN.png/.json
"""
import sys, os, json
import numpy as np
from PIL import Image

HERE = r"<SESSION>\scratchpad\text"
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
fonts = "sans,serif,times,black,mono,script".split(",")
sizes = [3, 4]
for i, a in enumerate(sys.argv):
    if a == "--fonts":
        fonts = sys.argv[i + 1].split(",")
    if a == "--sizes":
        sizes = [int(x) for x in sys.argv[i + 1].split(",")]
CACHE = os.path.join(HERE, "cache", "lpicss")
manifest = [m for m in json.load(open(os.path.join(CACHE, "manifest.json"), encoding="utf-8")) if m["font"] in fonts and m["size"] in sizes]
PER, GAP, W = 3, 40, 1000
for n0 in range(0, len(manifest), PER):
    group = manifest[n0:n0 + PER]
    H = len(group) * 240 + (len(group) - 1) * GAP
    sheet = Image.new("RGB", (W, H), (255, 255, 255))
    cells = []
    for k, m in enumerate(group):
        meta = json.load(open(os.path.join(CACHE, m["id"], "meta.json"), encoding="utf-8"))
        raw = np.fromfile(os.path.join(CACHE, m["id"], "image.rgba"), dtype=np.uint8).reshape(meta["height"], meta["width"], 4)
        a = raw[:, :, 3:4].astype(np.float32) / 255.0
        rgb = (raw[:, :, :3].astype(np.float32) * a + 255.0 * (1 - a)).astype(np.uint8)
        y0 = k * (240 + GAP)
        sheet.paste(Image.fromarray(rgb), (0, y0))
        b = meta["boxes"][0]
        cx0, cy0 = max(0, int(b["x0"] - 30)), max(0, int(b["y0"] - 20))
        cx1, cy1 = min(meta["width"], int(b["x1"] + 30)), min(meta["height"], int(b["y1"] + 20))
        cells.append({"id": m["id"], "x": cx0, "y": y0 + cy0, "w": cx1 - cx0, "h": cy1 - cy0, "value": m["value"]})
    name = f"lps_line_{n0 // PER + 1:02d}"
    sheet.save(os.path.join(OUT, name + ".png"), optimize=True)
    json.dump({"sheet": name, "w": W, "h": H, "pxPerMm": 10.0, "cells": cells}, open(os.path.join(OUT, name + ".json"), "w"), indent=1)
    print(name, len(cells), "pictures,", W, "x", H)
