"""OCR a set of lettering pictures (text/cache/<set>/manifest.json + <id>/{image.rgba,meta.json}) as stitched by a variant (out dir of replay_pic.mjs: <dir>/pics/<set>__<id>/render.png),
characters wrong / characters there, same reader and measure as ocr_lpics.py.
usage: python -I ocr_set.py <set> <variantDir> [--part i/n]       -> <dir>/ocr_<set>_p<i>.json  ({id: error})
       python -I ocr_set.py <set> --source [--part i/n]            reads the pictures themselves (the ceiling) -> text/out/_source_<set>.json
       python -I ocr_set.py <set> --summary <variantDir> [...] [--dade-typed2]   merged tables by size and by font (--dade-typed2: DADE's results on the typed2 cells of the same glyphs, as a column)
"""
import sys, os, json, re, glob
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SET = sys.argv[1]
CACHE = os.path.join(HERE, "cache", SET)
manifest = json.load(open(os.path.join(CACHE, "manifest.json"), encoding="utf-8"))


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
    data = {"picture": json.load(open(os.path.join(HERE, "out", f"_source_{SET}.json"), encoding="utf-8"))}
    for d, n in zip(dirs, names[1:]):
        dd = {}
        for p in glob.glob(os.path.join(d, f"ocr_{SET}_p*.json")):
            dd.update(json.load(open(p, encoding="utf-8")))
        data[n] = dd
    if "--dade-typed2" in sys.argv:
        dd = {}
        for p in glob.glob(os.path.join(HERE, "out", "dade", "ocr_typed2_p*.json")):
            raw = json.load(open(p, encoding="utf-8"))
            for k, v in raw.items():
                dd["xf_" + k] = v["cer"] if isinstance(v, dict) else v
        names.append("dade(typed2)")
        data["dade(typed2)"] = dd

    def row(label, sel):
        cells = [m for m in manifest if sel(m)]
        print(f"{label:30s}" + "".join((f"{mean([data[n][m['id']] for m in cells if m['id'] in data[n]]):13.3f}" if any(m['id'] in data[n] for m in cells) else "            -") for n in names) + f"   n={len(cells)}")

    print(f"{'character error (lower is better)':30s}" + "".join(f"{n[:12]:>13s}" for n in names))
    row("all", lambda m: True)
    for s in sorted({m["size"] for m in manifest}):
        row(f"caps {s} mm", lambda m, s=s: m["size"] == s)
    for st in sorted({m["str"] for m in manifest}):
        row(f"text '{st}'", lambda m, st=st: m["str"] == st)
    print()
    for f in sorted({m["font"] for m in manifest}):
        sty = next((m.get("style", "") for m in manifest if m["font"] == f), "")
        row(f"{f} ({sty})"[:30], lambda m, f=f: m["font"] == f)
    print(f"{'pictures read':30s}" + "".join(f"{len(data[n]):13d}" for n in names))


if "--summary" in sys.argv:
    summary([a for a in sys.argv[3:] if not a.startswith("--")])
    sys.exit(0)

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


def boxof(m):
    meta = json.load(open(os.path.join(CACHE, m["id"], "meta.json"), encoding="utf-8"))
    b = meta["boxes"][0]
    return meta, [max(0, int(b["x0"] - 30)), max(0, int(b["y0"] - 20)), min(meta["width"], int(b["x1"] + 30)), min(meta["height"], int(b["y1"] + 20))]


args = [a for a in sys.argv[2:] if not a.startswith("--")]
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
    p = os.path.join(HERE, "out", f"_source_{SET}.json" if not part else f"_source_{SET}_p{part[0]}.json")
    json.dump(out, open(p, "w", encoding="utf-8"))
    print("source read:", len(out), "mean error", round(mean(list(out.values())), 3))
    sys.exit(0)

vdir = args[0]
for m in cells:
    meta, box = boxof(m)
    d = os.path.join(vdir, "pics", f"{SET}__{m['id']}")
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
p = os.path.join(vdir, f"ocr_{SET}_p{part[0]}.json" if part else f"ocr_{SET}_p0.json")
json.dump(out, open(p, "w", encoding="utf-8"))
print(f"{vdir}: {len(out)} pictures read; mean character error {mean(list(out.values())):.3f}")
