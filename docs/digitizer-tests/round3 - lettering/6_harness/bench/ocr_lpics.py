"""OCR the lettering pictures: the text's own box in the picture and in what a variant sewed, characters wrong / characters there.
usage: python -I ocr_lpics.py <variantDir> [--part i/n] [--source]      <variantDir>: an out dir of replay_pic.mjs (<dir>/pics/lpics__<id>/{render.png,stats.json}) -> <dir>/ocr_lpics_p<i>.json
       python -I ocr_lpics.py --summary <variantDir> [<variantDir> ...]  merged table (the picture itself first: the ceiling)
--source  read the pictures themselves (once; text/out/_source_lpics.json)
"""
import sys, os, json, re, glob
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
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


def mean(xs):
    return sum(xs) / len(xs) if xs else float("nan")


def summary(dirs):
    names = ["picture"] + [os.path.basename(d.rstrip("\\/")) for d in dirs]
    data = {}
    data["picture"] = json.load(open(os.path.join(HERE, "out", "_source_lpics.json"), encoding="utf-8"))
    for d, n in zip(dirs, names[1:]):
        dd = {}
        for p in glob.glob(os.path.join(d, "ocr_lpics_p*.json")):
            dd.update(json.load(open(p, encoding="utf-8")))
        data[n] = dd

    def row(label, sel):
        cells = [m for m in manifest if sel(m)]
        print(f"{label:32s}" + "".join((f"{mean([data[n][m['id']] for m in cells if m['id'] in data[n]]):10.3f}" if any(m['id'] in data[n] for m in cells) else "         -") for n in names))

    print(f"{'character error (lower is better)':32s}" + "".join(f"{n:>10s}" for n in names))
    row("all", lambda m: True)
    for k in ("line", "badge", "outline"):
        row(f"{k} (all sizes)", lambda m, k=k: m["kind"] == k)
    for s in (3, 4, 5, 6, 8, 12):
        row(f"line, caps {s} mm", lambda m, s=s: m["kind"] == "line" and m["size"] == s)
    for f in ("sans", "black", "condensed", "humanist", "serif", "times", "mono", "script", "round"):
        row(f"line {f}, 3-6 mm", lambda m, f=f: m["kind"] == "line" and m["font"] == f and m["size"] <= 6)
    row("badge, 4-6 mm", lambda m: m["kind"] == "badge" and m["size"] <= 6)
    row("outline", lambda m: m["kind"] == "outline")
    print(f"{'pictures read':32s}" + "".join(f"{len(data[n]):10d}" for n in names))


if "--summary" in sys.argv:
    summary([a for a in sys.argv[1:] if not a.startswith("--")])
    sys.exit(0)

from rapidocr_onnxruntime import RapidOCR
engine = RapidOCR()


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


def boxof(m):
    meta = json.load(open(os.path.join(CACHE, m["id"], "meta.json"), encoding="utf-8"))
    b = meta["boxes"][0]
    return meta, [max(0, int(b["x0"] - 30)), max(0, int(b["y0"] - 20)), min(meta["width"], int(b["x1"] + 30)), min(meta["height"], int(b["y1"] + 20))]


args = [a for a in sys.argv[1:] if not a.startswith("--")]
part = None
for i, a in enumerate(sys.argv):
    if a == "--part":
        part = tuple(int(x) for x in sys.argv[i + 1].split("/"))
cells = [m for k, m in enumerate(manifest) if not part or k % part[1] == part[0]]
out = {}
if "--source" in sys.argv:
    for m in cells:
        meta, box = boxof(m)
        raw = np.fromfile(os.path.join(CACHE, m["id"], "image.rgba"), dtype=np.uint8).reshape(meta["height"], meta["width"], 4)
        im = Image.fromarray(raw[:, :, :3]).crop(tuple(box))
        t = norm(m["value"])
        out[m["id"]] = round(min(1.0, lev(norm(read(im)), t) / len(t)), 3)
    p = os.path.join(HERE, "out", "_source_lpics.json" if not part else f"_source_lpics_p{part[0]}.json")
    json.dump(out, open(p, "w", encoding="utf-8"))
    print("source read:", len(out), "mean error", round(mean(list(out.values())), 3))
    sys.exit(0)

vdir = args[0]
for m in cells:
    meta, box = boxof(m)
    d = os.path.join(vdir, "pics", f"lpics__{m['id']}")
    if not os.path.exists(os.path.join(d, "render.png")):
        continue
    st = json.load(open(os.path.join(d, "stats.json"), encoding="utf-8"))
    mm, r, so = st["mmPerPx"], st["render"], st["source"]
    x0 = round((box[0] * mm + so["originX"] - r["originX"]) * r["pxPerMm"])
    y0 = round((box[1] * mm + so["originY"] - r["originY"]) * r["pxPerMm"])
    x1 = round((box[2] * mm + so["originX"] - r["originX"]) * r["pxPerMm"])
    y1 = round((box[3] * mm + so["originY"] - r["originY"]) * r["pxPerMm"])
    im = Image.open(os.path.join(d, "render.png")).convert("RGB").crop((x0, y0, x1, y1))
    t = norm(m["value"])
    out[m["id"]] = round(min(1.0, lev(norm(read(im)), t) / len(t)), 3)
p = os.path.join(vdir, f"ocr_lpics_p{part[0]}.json" if part else "ocr_lpics_p0.json")
json.dump(out, open(p, "w", encoding="utf-8"))
print(f"{vdir}: {len(out)} pictures read; mean character error {mean(list(out.values())):.3f}")

