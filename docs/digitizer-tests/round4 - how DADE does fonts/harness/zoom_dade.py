"""Draw DADE's stitches for one cell of a lettering sheet, zoomed, as a stitch path (thin lines, needle points as dots) over the source letters' outline.
usage: python -I zoom_dade.py <sheet name e.g. typed_01> <cell id> <out.png> [zoom px/mm, default 60]
"""
import sys, os, json
import numpy as np
from PIL import Image, ImageDraw
import cv2

SP = r"<SESSION>\scratchpad\dade_text"
sheet, cell, out = sys.argv[1], sys.argv[2], sys.argv[3]
Z = float(sys.argv[4]) if len(sys.argv) > 4 else 60.0
meta = json.load(open(os.path.join(SP, "inputs", sheet + ".json")))
c = next(x for x in meta["cells"] if x["id"] == cell)
png = np.asarray(Image.open(os.path.join(SP, "inputs", sheet + ".png")).convert("L"))
ys, xs = np.where(png < 128)
ix0, iy0 = xs.min() / 10.0, ys.min() / 10.0
dump = json.load(open(os.path.join(SP, "out", "dump", sheet + ".json")))
st = dump["stitches"]
# design -> sheet mm: the stitches' bbox corner sits on the ink bbox corner
pts = [(x, y) for x, y, k in st if k == 0]
sx0, sy0 = min(p[0] for p in pts), min(p[1] for p in pts)
to_sheet = lambda x, y: (x - sx0 + ix0, y - sy0 + iy0)
# window = the cell box
wx0, wy0, wx1, wy1 = c["x"] / 10.0, c["y"] / 10.0, (c["x"] + c["w"]) / 10.0, (c["y"] + c["h"]) / 10.0
W, H = int((wx1 - wx0) * Z), int((wy1 - wy0) * Z)
img = Image.new("RGB", (W, H), (255, 255, 255))
d = ImageDraw.Draw(img)
# the source letters (filled light grey) from the sheet
crop = png[c["y"]:c["y"] + c["h"], c["x"]:c["x"] + c["w"]]
big = cv2.resize(crop, (W, H), interpolation=cv2.INTER_LINEAR)
mask = big < 128
arr = np.asarray(img).copy()
arr[mask] = (225, 225, 235)
img = Image.fromarray(arr)
d = ImageDraw.Draw(img)
px = None
n = 0
for x, y, k in st:
    X, Y = to_sheet(x, y)
    X, Y = (X - wx0) * Z, (Y - wy0) * Z
    if k == 0:
        if px is not None and -50 < X < W + 50 and -50 < Y < H + 50:
            d.line([px, (X, Y)], fill=(20, 40, 160), width=1)
        if 0 <= X < W and 0 <= Y < H:
            d.ellipse([X - 1.6, Y - 1.6, X + 1.6, Y + 1.6], fill=(200, 30, 30))
            n += 1
        px = (X, Y)
    else:
        px = None
img.save(out)
print(cell, "needle points in the window:", n, "size", W, "x", H)
