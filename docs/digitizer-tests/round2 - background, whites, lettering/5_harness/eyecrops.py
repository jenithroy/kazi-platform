"""Close crops of the eyes and the mouth: the source (enlarged) next to the render of each variant, at the render's own scale.
usage: python -I eyecrops.py <set> <out.png> <variant,variant,...> <name> [name ...]
One row per face: source | variant 1 | variant 2 ... ; the crop is the box over both eyes and the mouth (landmarks), a little loose."""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import tools as T

SET, OUT, VARIANTS = sys.argv[1], sys.argv[2], sys.argv[3].split(",")
NAMES = sys.argv[4:]
consts = T.load_constants()
CROP_W = int(os.environ.get("CROP_W", "520"))
rows = []
for n in NAMES:
    lmf = os.path.join(T.CACHE, SET, n, "landmarks.json")
    if not os.path.exists(lmf):
        print("no landmarks", n)
        continue
    lms = json.load(open(lmf))
    if not lms:
        print("no face", n)
        continue
    best = max(lms, key=lambda f: (max(p[0] for p in f) - min(p[0] for p in f)) * (max(p[1] for p in f) - min(p[1] for p in f)))
    cells = []
    box = None
    for vi, v in enumerate(["src"] + VARIANTS):
        base = os.path.join(T.OUT, VARIANTS[0], SET, n, "stats.json")
        if not os.path.exists(base):
            break
        st = json.load(open(base))
        cloth = T.hex2rgb(st["cloth"])
        src, (W, H) = T.load_source(SET, n, cloth)
        if v == "src":
            ren_canvas = T.load_render(SET, VARIANTS[0], n, st)
            cw, ch = ren_canvas.size
            img = Image.fromarray(np.clip(src, 0, 255).astype(np.uint8)).resize((cw, ch), Image.LANCZOS)
        else:
            stv = json.load(open(os.path.join(T.OUT, v, SET, n, "stats.json")))
            img = T.load_render(SET, v, n, stv)
            cw, ch = img.size
        polys = T.face_polys(best, cw, ch, consts, ["FACE_LANDMARKS_LEFT_EYE", "FACE_LANDMARKS_RIGHT_EYE", "FACE_LANDMARKS_LEFT_EYEBROW", "FACE_LANDMARKS_RIGHT_EYEBROW", "FACE_LANDMARKS_LIPS"])
        if box is None:
            box = T.bbox_of(polys, cw, ch, 0.18)
        x0, y0, x1, y1 = box
        crop = img.crop((x0, y0, x1, y1))
        sc = CROP_W / crop.width
        crop = crop.resize((CROP_W, max(1, int(crop.height * sc))), Image.LANCZOS if v == "src" else Image.NEAREST)
        cells.append((v, crop))
    if cells:
        rows.append((n, cells))
if not rows:
    sys.exit("nothing to draw")
try:
    font = ImageFont.truetype("arial.ttf", 15)
except Exception:
    font = ImageFont.load_default()
gap = 8
colw = CROP_W
H = sum(max(c.height for _, c in cells) + 22 + gap for _, cells in rows)
Wd = (colw + gap) * (1 + len(VARIANTS))
sheet = Image.new("RGB", (Wd, H), (255, 255, 255))
d = ImageDraw.Draw(sheet)
y = 0
for n, cells in rows:
    h = max(c.height for _, c in cells)
    x = 0
    for v, c in cells:
        d.text((x, y), (n[:34] + " " if v == "src" else "") + v, fill=(0, 0, 0), font=font)
        sheet.paste(c, (x, y + 20))
        x += colw + gap
    y += h + 22 + gap
sheet.save(OUT)
print("wrote", OUT, sheet.size)
