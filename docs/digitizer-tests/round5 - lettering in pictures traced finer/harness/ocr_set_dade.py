"""Read DADE's crops of a lettering-picture set (text/out/dade/<set>/<id>/render.png, cut by render_dade_sheets.mjs) with the same reader and measure as ocr_set.py.
usage: python -I ocr_set_dade.py <set> [--part i/n]      writes text/out/dade/ocr_<set>_p<i>.json  ({id: error})
"""
import sys, os, json, re
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SET = sys.argv[1]
CACHE = os.path.join(HERE, "cache", SET)
manifest = json.load(open(os.path.join(CACHE, "manifest.json"), encoding="utf-8"))
part = None
for i, a in enumerate(sys.argv):
    if a == "--part":
        part = tuple(int(x) for x in sys.argv[i + 1].split("/"))


def norm(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


def lev(a, b):
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


from rapidocr_onnxruntime import RapidOCR
engine = RapidOCR()


def read(img):
    w, h = img.size
    scale = max(0.3, min(6.0, 110.0 / max(1, h)))
    img = img.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
    pad = 30
    big = Image.new("RGB", (img.width + 2 * pad, img.height + 2 * pad), img.getpixel((0, 0)))
    big.paste(img, (pad, pad))
    res, _ = engine(np.asarray(big)[:, :, ::-1])
    if not res:
        return ""
    res = sorted(res, key=lambda r: (round(r[0][0][1] / (h * scale * 0.5 + 1)), r[0][0][0]))
    return " ".join(r[1] for r in res)


out = {}
for k, m in enumerate(manifest):
    if part and k % part[1] != part[0]:
        continue
    p = os.path.join(HERE, "out", "dade", SET, m["id"], "render.png")
    if not os.path.exists(p):
        continue
    t = norm(m["value"])
    out[m["id"]] = round(min(1.0, lev(norm(read(Image.open(p).convert("RGB"))), t) / len(t)), 3)
path = os.path.join(HERE, "out", "dade", f"ocr_{SET}_p{part[0] if part else 0}.json")
json.dump(out, open(path, "w", encoding="utf-8"))
print(f"{SET}: {len(out)} DADE crops read; mean character error {sum(out.values()) / max(1, len(out)):.3f}")
