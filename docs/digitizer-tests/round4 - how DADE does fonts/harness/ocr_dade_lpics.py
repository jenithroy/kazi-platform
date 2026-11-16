"""Read DADE's lettering-picture crops (text/out/dade/lpics/<id>/render.png, cut by render_dade_sheets.mjs) with the same reader and the same error measure as ocr_lpics.py.
usage: python -I ocr_dade_lpics.py <variant dir, e.g. ...\text\out\dade> [--part i/n]     writes <dir>/ocr_lpics_p<i>.json  ({id: character error}), the format ocr_lpics.py --summary merges
"""
import sys, os, json, re, glob
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")
HERE = r"<SESSION>\scratchpad\text"
VDIR = sys.argv[1]
part = None
for i, a in enumerate(sys.argv):
    if a == "--part":
        part = tuple(int(x) for x in sys.argv[i + 1].split("/"))
CACHE = os.path.join(HERE, "cache", "lpics")
manifest = [m for m in json.load(open(os.path.join(CACHE, "manifest.json"), encoding="utf-8")) if m["kind"] in ("line", "badge", "outline")]


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


cells = [m for k, m in enumerate(manifest) if not part or k % part[1] == part[0]]
out, texts = {}, {}
for m in cells:
    p = os.path.join(VDIR, "lpics", m["id"], "render.png")
    if not os.path.exists(p):
        continue
    t = norm(m["value"])
    txt = read(Image.open(p).convert("RGB"))
    out[m["id"]] = round(min(1.0, lev(norm(txt), t) / len(t)), 3)
    texts[m["id"]] = txt
json.dump(out, open(os.path.join(VDIR, f"ocr_lpics_p{part[0]}.json" if part else "ocr_lpics_p0.json"), "w", encoding="utf-8"))
json.dump(texts, open(os.path.join(VDIR, f"ocr_lpics_text_p{part[0]}.json" if part else "ocr_lpics_text_p0.json"), "w", encoding="utf-8"))
print(f"{VDIR}: {len(out)} pictures read; mean character error {sum(out.values()) / max(1, len(out)):.3f}")
