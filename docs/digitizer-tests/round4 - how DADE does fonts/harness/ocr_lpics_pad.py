"""A steadier reading of the small picture groups (badge 18 pictures, outline 8): the same reader and error measure as ocr_lpics.py, but each picture is read with three different margins round the text's box and the three errors are averaged, so one picture the reader happens to miss does not swing a group.
usage: python -I ocr_lpics_pad.py <kind badge|outline|line> <variantDir> [<variantDir> ...]   prints the mean error per variant (three margins averaged) and the per-picture values that differ most
"""
import sys, os, json, re
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")
HERE = r"<SESSION>\scratchpad\text"
CACHE = os.path.join(HERE, "cache", "lpics")
kind = sys.argv[1]
dirs = sys.argv[2:]
manifest = [m for m in json.load(open(os.path.join(CACHE, "manifest.json"), encoding="utf-8")) if m["kind"] == kind]
PADS = [(15, 8), (30, 20), (45, 30)]


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


results = {}
for vdir in dirs:
    name = os.path.basename(vdir.rstrip("\\/"))
    per = {}
    for m in manifest:
        meta = json.load(open(os.path.join(CACHE, m["id"], "meta.json"), encoding="utf-8"))
        b = meta["boxes"][0]
        d = os.path.join(vdir, "pics", f"lpics__{m['id']}")
        if not os.path.exists(os.path.join(d, "render.png")):
            continue
        st = json.load(open(os.path.join(d, "stats.json"), encoding="utf-8"))
        mm, r, so = st["mmPerPx"], st["render"], st["source"]
        im = Image.open(os.path.join(d, "render.png")).convert("RGB")
        t = norm(m["value"])
        errs = []
        for mx, my in PADS:
            box = [max(0, int(b["x0"] - mx)), max(0, int(b["y0"] - my)), min(meta["width"], int(b["x1"] + mx)), min(meta["height"], int(b["y1"] + my))]
            x0 = round((box[0] * mm + so["originX"] - r["originX"]) * r["pxPerMm"])
            y0 = round((box[1] * mm + so["originY"] - r["originY"]) * r["pxPerMm"])
            x1 = round((box[2] * mm + so["originX"] - r["originX"]) * r["pxPerMm"])
            y1 = round((box[3] * mm + so["originY"] - r["originY"]) * r["pxPerMm"])
            errs.append(min(1.0, lev(norm(read(im.crop((x0, y0, x1, y1)))), t) / len(t)))
        per[m["id"]] = sum(errs) / len(errs)
    results[name] = per
    print(f"{name:10s} {kind}: {len(per)} pictures, mean error (three margins) {sum(per.values()) / max(1, len(per)):.3f}")
if len(dirs) == 2:
    a, b = [os.path.basename(x.rstrip("\\/")) for x in dirs]
    diffs = sorted(results[a], key=lambda k: results[b][k] - results[a][k])
    print(f"\n{b} much worse than {a}:", [(k, round(results[a][k], 2), round(results[b][k], 2)) for k in diffs[-4:][::-1] if results[b][k] - results[a][k] > 0.1])
    print(f"{b} much better than {a}:", [(k, round(results[a][k], 2), round(results[b][k], 2)) for k in diffs[:4] if results[a][k] - results[b][k] > 0.1])
