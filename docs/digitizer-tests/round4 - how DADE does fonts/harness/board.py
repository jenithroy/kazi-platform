"""Comparison board: for each cell, three rows: the drawn letters (ideal), ours (variant A), DADE (variant B), at the same scale, with the reader's output.
usage: python -I board.py <out.png> <scale> <set>:<cell> [<set>:<cell> ...] [--a fin2] [--b dade]
"""
import sys, os, json, glob
import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.stdout.reconfigure(encoding="utf-8")
HERE = r"<SESSION>\scratchpad\text"
args = [a for a in sys.argv[1:]]
A, B, C, D = "fin2", "dade", None, None
for i, a in enumerate(args):
    if a == "--a":
        A = args[i + 1]
    if a == "--b":
        B = args[i + 1]
    if a == "--c":
        C = args[i + 1]
    if a == "--d":
        D = args[i + 1]
pos = [a for i, a in enumerate(args) if not a.startswith("--") and (i == 0 or args[i - 1] not in ("--a", "--b", "--c", "--d"))]
out, scale, cells = pos[0], float(pos[1]), pos[2:]
PXMM = 8.0


def load_ocr(v, st):
    pat = "ocr_p*.json" if st == "typed" else f"ocr_{st}_p*.json"
    d = {}
    for p in glob.glob(os.path.join(HERE, "out", v, pat)):
        d.update(json.load(open(p, encoding="utf-8")))
    return d


font = ImageFont.truetype(r"C:\Windows\Fonts\arial.ttf", 15)
rows = []
for spec in cells:
    st, cid = spec.split(":")
    meta = json.load(open(os.path.join(HERE, "cache", st, cid, "meta.json"), encoding="utf-8"))
    a = np.fromfile(os.path.join(HERE, "cache", st, cid, "alpha.u8"), dtype=np.uint8).reshape(meta["height"], meta["width"])
    ideal = Image.fromarray(255 - a).convert("RGB")
    k = PXMM / meta["pxPerMm"]
    ideal = ideal.resize((max(1, round(ideal.width * k)), max(1, round(ideal.height * k))), Image.LANCZOS)
    ims = [("drawn", ideal, "")]
    for v in [x for x in (A, B, C, D) if x]:
        p = os.path.join(HERE, "out", v, st, cid, "render.png")
        o = load_ocr(v, st).get(cid, {})
        ims.append((v, Image.open(p).convert("RGB") if os.path.exists(p) else Image.new("RGB", (50, 20), (200, 200, 200)), f"cer {o.get('cer', '-')}  read: {o.get('text', '')[:32]}"))
    rows.append((cid, ims))

W = int(max(im.width for _, ims in rows for _, im, _ in ims) * scale) + 20
H = sum(int(sum(im.height * scale + 22 for _, im, _ in ims) + 30) for _, ims in rows)
board = Image.new("RGB", (W, H), (255, 255, 255))
d = ImageDraw.Draw(board)
y = 0
for cid, ims in rows:
    d.text((6, y + 4), cid, fill=(0, 0, 0), font=font)
    y += 26
    for label, im, note in ims:
        big = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
        d.text((6, y), f"{label}  {note}", fill=(90, 90, 90), font=font)
        y += 20
        board.paste(big, (10, y))
        y += big.height + 2
board.crop((0, 0, W, y + 4)).save(out)
print("saved", out, board.size)
