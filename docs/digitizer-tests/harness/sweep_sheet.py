"""Real-scale face crops of the same picture sewn at several sizes: a window of WIN mm round the face, at 8 px/mm, so a small face LOOKS small.
usage: python -I sweep_sheet.py <name> <out.png> <width mm> [<width mm> ...]     (reads out/sw_<width>/reg18/<name>)"""
import sys, os, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont

FACES = os.path.dirname(os.path.abspath(__file__))
name, out = sys.argv[1], sys.argv[2]
widths = sys.argv[3:]
WIN = 34.0  # mm


def font(sz):
    for f in ("arial.ttf", "segoeui.ttf"):
        try:
            return ImageFont.truetype(f, sz)
        except Exception:
            pass
    return ImageFont.load_default()


lm = json.load(open(os.path.join(FACES, "cache", "reg18", name, "landmarks.json")))[0]
meta = json.load(open(os.path.join(FACES, "cache", "reg18", name, "meta.json")))
W, H = meta["width"], meta["height"]
ov = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]
cx = sum(lm[i][0] for i in ov) / len(ov) * W
cy = sum(lm[i][1] for i in ov) / len(ov) * H
cells = []
for w in widths:
    d = os.path.join(FACES, "out", f"sw_{w}", "reg18", name)
    if not os.path.exists(os.path.join(d, "stats.json")):
        continue
    st = json.load(open(os.path.join(d, "stats.json")))
    r = st["render"]
    im = Image.open(os.path.join(d, "render.png")).convert("RGB")
    mm = st["mmPerPx"]
    fx = -st["widthMm"] / 2 + cx * mm
    fy = -st["heightMm"] / 2 + cy * mm
    px, py = (fx - r["originX"]) * r["pxPerMm"], (fy - r["originY"]) * r["pxPerMm"]
    half = WIN / 2 * r["pxPerMm"]
    box = (int(px - half), int(py - half), int(px + half), int(py + half))
    cell = Image.new("RGB", (int(WIN * r["pxPerMm"]),) * 2, (244, 241, 234))
    cell.paste(im.crop(box), (0, 0))
    ox = [lm[33][0], lm[133][0]]
    eye_mm = abs(lm[33][0] - lm[133][0]) * W * mm
    face_mm = (max(lm[i][0] for i in ov) - min(lm[i][0] for i in ov)) * W * mm
    d2 = ImageDraw.Draw(cell)
    d2.rectangle((0, 0, 190, 34), fill=(255, 255, 255))
    d2.text((4, 2), f"face {face_mm:.1f} mm, eye {np.hypot((lm[33][0]-lm[133][0])*W, (lm[33][1]-lm[133][1])*H)*mm:.1f} mm", fill=(0, 0, 0), font=font(13))
    d2.text((4, 18), f"design {w} mm wide", fill=(80, 80, 80), font=font(12))
    cells.append(cell)
cw = cells[0].width
cols = 4
rows = (len(cells) + cols - 1) // cols
sheet = Image.new("RGB", (cols * cw + 6 * (cols + 1), rows * cw + 6 * (rows + 1)), (255, 255, 255))
for i, c in enumerate(cells):
    sheet.paste(c, (6 + (i % cols) * (cw + 6), 6 + (i // cols) * (cw + 6)))
sheet.save(out)
print("wrote", out, sheet.size, len(cells), "cells")
