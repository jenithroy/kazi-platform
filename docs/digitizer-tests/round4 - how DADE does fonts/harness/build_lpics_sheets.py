"""Pack the lettering-picture bench (text/cache/lpics: logo-style pictures of lettering, 1000 x 240 px = 100 x 24 mm at DADE's 1 px = 0.1 mm) into DADE sheets, three pictures
under each other with a white gap, one kind per sheet (line: dark text on white; badge: white text on a dark badge; outline: outlined letters on yellow), so DADE's colour reduction sees the same colours as it would for one picture.
Each sheet cell is the box the reader looks at (the text's own box +-30 x 20 px), exactly as ocr_lpics.py cuts it from the pictures.
usage: python -I build_lpics_sheets.py <out dir>      writes <out>/lp_<kind>_NN.png/.json
"""
import sys, os, json
import numpy as np
from PIL import Image

HERE = r"<SESSION>\scratchpad\text"
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
CACHE = os.path.join(HERE, "cache", "lpics")
manifest = [m for m in json.load(open(os.path.join(CACHE, "manifest.json"), encoding="utf-8")) if m["kind"] in ("line", "badge", "outline")]
PER, GAP, W = 3, 40, 1000
for kind in ("line", "badge", "outline"):
    items = [m for m in manifest if m["kind"] == kind]
    for n0 in range(0, len(items), PER):
        group = items[n0:n0 + PER]
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
        name = f"lp_{kind}_{n0 // PER + 1:02d}"
        sheet.save(os.path.join(OUT, name + ".png"), optimize=True)
        json.dump({"sheet": name, "w": W, "h": H, "pxPerMm": 10.0, "cells": cells}, open(os.path.join(OUT, name + ".json"), "w"), indent=1)
        print(name, len(cells), "pictures,", W, "x", H)
