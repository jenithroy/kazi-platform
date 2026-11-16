"""Board for the lettering pictures: the picture's text box, what the page's engine sews (variant A, default `now`), and what DADE sews (variant B, default `dade`), same scale, with the reader's output.
usage: python -I board_lpics.py <out.png> <scale> <picture id> [<picture id> ...] [--a now] [--b dade]
"""
import sys, os, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.stdout.reconfigure(encoding="utf-8")
HERE = r"<SESSION>\scratchpad\text"
CACHE = os.path.join(HERE, "cache", "lpics")
args = sys.argv[1:]
A, B, C, SRC = "now", "dade", None, None
for i, a in enumerate(args):
    if a == "--a":
        A = args[i + 1]
    if a == "--b":
        B = args[i + 1]
    if a == "--c":
        C = args[i + 1]  # a second variant of OURS, shown between A and B
    if a == "--src":
        SRC = args[i + 1]  # a cache dir that holds lpics/<id>/image.rgba: the picture as it was handed in (a degraded copy)
    if a == "--nodade":
        B = None
pos = [a for i, a in enumerate(args) if not a.startswith("--") and (i == 0 or args[i - 1] not in ("--a", "--b", "--c", "--src"))]
out, scale, ids = pos[0], float(pos[1]), pos[2:]
font = ImageFont.truetype(r"C:\Windows\Fonts\arial.ttf", 15)


def cer_of(v, pid):
    import glob
    d = {}
    for p in glob.glob(os.path.join(HERE, "out", v, "ocr_lpics_p*.json")):
        d.update(json.load(open(p, encoding="utf-8")))
    return d.get(pid)


def source_crop(pid):
    meta = json.load(open(os.path.join(CACHE, pid, "meta.json"), encoding="utf-8"))
    b = meta["boxes"][0]
    box = [max(0, int(b["x0"] - 30)), max(0, int(b["y0"] - 20)), min(meta["width"], int(b["x1"] + 30)), min(meta["height"], int(b["y1"] + 20))]
    folder = os.path.join(SRC, "lpics", pid) if SRC else os.path.join(CACHE, pid)
    raw = np.fromfile(os.path.join(folder, "image.rgba"), dtype=np.uint8).reshape(meta["height"], meta["width"], 4)
    im = Image.fromarray(raw[:, :, :3]).crop(tuple(box))
    # source is 10 px/mm; the renders are 8 px/mm
    return im.resize((round(im.width * 0.8), round(im.height * 0.8)), Image.LANCZOS), meta, box


def ours_crop(v, pid, meta, box):
    d = os.path.join(HERE, "out", v, "pics", f"lpics__{pid}")
    st = json.load(open(os.path.join(d, "stats.json"), encoding="utf-8"))
    mm, r, so = st["mmPerPx"], st["render"], st["source"]
    x0 = round((box[0] * mm + so["originX"] - r["originX"]) * r["pxPerMm"])
    y0 = round((box[1] * mm + so["originY"] - r["originY"]) * r["pxPerMm"])
    x1 = round((box[2] * mm + so["originX"] - r["originX"]) * r["pxPerMm"])
    y1 = round((box[3] * mm + so["originY"] - r["originY"]) * r["pxPerMm"])
    return Image.open(os.path.join(d, "render.png")).convert("RGB").crop((x0, y0, x1, y1))


rows = []
for pid in ids:
    src, meta, box = source_crop(pid)
    ims = [("picture", src, "")]
    ims.append((A, ours_crop(A, pid, meta, box), f"cer {cer_of(A, pid)}"))
    if C:
        ims.append((C, ours_crop(C, pid, meta, box), f"cer {cer_of(C, pid)}"))
    if B:
        p = os.path.join(HERE, "out", B, "lpics", pid, "render.png")
        ims.append((B, Image.open(p).convert("RGB"), f"cer {cer_of(B, pid)}"))
    rows.append((pid, ims))
W = int(max(im.width for _, ims in rows for _, im, _ in ims) * scale) + 20
H = sum(int(sum(im.height * scale + 22 for _, im, _ in ims) + 30) for _, ims in rows)
board = Image.new("RGB", (W, H), (255, 255, 255))
d = ImageDraw.Draw(board)
y = 0
for pid, ims in rows:
    d.text((6, y + 4), pid, fill=(0, 0, 0), font=font)
    y += 26
    for label, im, note in ims:
        big = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
        d.text((6, y), f"{label}  {note}", fill=(90, 90, 90), font=font)
        y += 20
        board.paste(big, (10, y))
        y += big.height + 2
board.crop((0, 0, W, y + 4)).save(out)
print("saved", out, board.size)
