"""OCR the lettering of the picture bench: the same crops of the source picture and of what each variant sewed, and the characters the reader gets wrong.
usage: python -I ocr_pics.py <variantDir> [<variantDir> ...]     (each an out dir of replay_pic.mjs: <dir>/pics/<set>__<name>/{render.png,stats.json})
"""
import sys, os, json, re
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
from rapidocr_onnxruntime import RapidOCR
engine = RapidOCR()

# (picture, [x0, y0, x1, y1] in the source's pixels, what it says, rotate: degrees to turn the crop clockwise to stand it upright, label)
CHART_ROWS = [(60, 125), (143, 203), (220, 272), (285, 332), (348, 388), (403, 438), (453, 483)]
CROPS = []
for k, (y0, y1) in enumerate(CHART_ROWS):
    CROPS.append(("chart2/chart", [60, y0 - 6, 500, y1 + 6], "RAVEN 24", 0, f"chart sans row {k + 1}"))
for k, (y0, y1) in enumerate(CHART_ROWS):
    CROPS.append(("chart2/chart", [530, y0 - 6, 900, y1 + 6], "Raven 24", 0, f"chart serif row {k + 1}"))
CROPS += [
    ("reg18/crest_manzanares", [100, 415, 170, 820], "AVE MARIA", 90, "crest AVE MARIA"),
    ("reg18/crest_manzanares", [595, 365, 662, 840], "GRATIA PLENA", -90, "crest GRATIA PLENA"),
    ("new55/emblems_logo_sdl", [245, 330, 765, 388], "Simple Directmedia Layer", 0, "SDL small line"),
    ("new55/emblems_flag_washington_island", [322, 518, 668, 610], "Washington Island,Wi.", 0, "flag two lines"),
]


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


def read(img):
    w, h = img.size
    scale = max(0.3, min(6.0, 110.0 / max(1, h)))  # the text is read at about the same size whatever it is stitched at
    img = img.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
    pad = 30
    big = Image.new("RGB", (img.width + 2 * pad, img.height + 2 * pad), img.getpixel((0, 0)))
    big.paste(img, (pad, pad))
    res, _ = engine(np.asarray(big)[:, :, ::-1])
    if not res:
        return ""
    res = sorted(res, key=lambda r: (round(r[0][0][1] / (h * scale * 0.5 + 1)), r[0][0][0]))
    return " ".join(r[1] for r in res)


def source_crop(item, box):
    sset, name = item.split("/")
    for d in (os.path.join(HERE, "cache", sset, name), os.path.join(HERE, "..", "faces", "cache", sset, name)):
        if os.path.exists(os.path.join(d, "image.rgba")):
            meta = json.load(open(os.path.join(d, "meta.json"), encoding="utf-8"))
            raw = np.fromfile(os.path.join(d, "image.rgba"), dtype=np.uint8).reshape(meta["height"], meta["width"], 4)
            im = Image.fromarray(raw, "RGBA")
            bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
            bg.alpha_composite(im)
            return bg.convert("RGB").crop(tuple(box))
    raise FileNotFoundError(item)


def variant_crop(vdir, item, box):
    sset, name = item.split("/")
    d = os.path.join(vdir, "pics", f"{sset}__{name}")
    st = json.load(open(os.path.join(d, "stats.json"), encoding="utf-8"))
    mm, r, so = st["mmPerPx"], st["render"], st["source"]
    x0 = round((box[0] * mm + so["originX"] - r["originX"]) * r["pxPerMm"])
    y0 = round((box[1] * mm + so["originY"] - r["originY"]) * r["pxPerMm"])
    x1 = round((box[2] * mm + so["originX"] - r["originX"]) * r["pxPerMm"])
    y1 = round((box[3] * mm + so["originY"] - r["originY"]) * r["pxPerMm"])
    return Image.open(os.path.join(d, "render.png")).convert("RGB").crop((x0, y0, x1, y1))


vdirs = [a for a in sys.argv[1:] if not a.startswith("--")]
names = ["source"] + [os.path.basename(v.rstrip("\\/")) for v in vdirs]
rows = []
for item, box, truth, rot, label in CROPS:
    t = norm(truth)
    entry = {"label": label, "truth": truth}
    cr = source_crop(item, box)
    if rot:
        cr = cr.rotate(-rot, expand=True)
    txt = read(cr)
    entry["source"] = (txt, min(1.0, lev(norm(txt), t) / len(t)))
    for v, nm in zip(vdirs, names[1:]):
        try:
            cr = variant_crop(v, item, box)
            if rot:
                cr = cr.rotate(-rot, expand=True)
            txt = read(cr)
            entry[nm] = (txt, min(1.0, lev(norm(txt), t) / len(t)))
        except Exception as e:
            entry[nm] = (f"(error {e})", 1.0)
    rows.append(entry)

print(f"{'crop':22s}" + "".join(f"{n:>12s}" for n in names))
for e in rows:
    print(f"{e['label']:22s}" + "".join(f"{e[n][1]:12.2f}" for n in names))
    if "-v" in sys.argv:
        for n in names:
            print(f"    {n}: '{e[n][0]}'")
print(f"{'mean':22s}" + "".join(f"{sum(e[n][1] for e in rows) / len(rows):12.3f}" for n in names))
json.dump(rows, open(os.path.join(HERE, "..", "text2", "ocr_pics_last.json"), "w", encoding="utf-8"), indent=1)

