"""A machine reader as a legibility measure: OCR the stitched renders of the typed cells (and the ideal glyphs) and count the characters it gets wrong.
usage: python -I ocr_text.py <variant> [--cells id,id] [--ref]      writes out/<variant>/ocr.json ({cell: {text, cer, conf}}) and prints a summary
--ref  also reads the ideal glyph picture (cache/typed/<cell>/alpha.u8): what the reader makes of the drawing itself (the ceiling for that cell)
"""
import sys, os, json, re
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
args = [a for a in sys.argv[1:] if not a.startswith("--")]
variant = args[0]
only = None
for i, a in enumerate(sys.argv):
    if a == "--cells":
        only = set(sys.argv[i + 1].split(","))
want_ref = "--ref" in sys.argv
part = None
for i, a in enumerate(sys.argv):
    if a == "--part":
        part = tuple(int(x) for x in sys.argv[i + 1].split("/"))

from rapidocr_onnxruntime import RapidOCR
engine = RapidOCR()
SET = os.environ.get("TYPED_SET", "typed")
manifest = json.load(open(os.path.join(HERE, "cache", SET, "manifest.json"), encoding="utf-8"))
if only:
    manifest = [c for c in manifest if c["id"] in only]
maxsize = None
for i, a in enumerate(sys.argv):
    if a == "--maxsize":
        maxsize = float(sys.argv[i + 1])
if maxsize:
    manifest = [c for c in manifest if c["size"] <= maxsize]
if part:
    manifest = [c for k, c in enumerate(manifest) if k % part[1] == part[0]]


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
    """img: PIL RGB. Returns (text, mean confidence)."""
    w, h = img.size
    scale = max(0.3, min(6.0, 110.0 / max(1, h)))  # the text is read at about the same size whatever it is stitched at
    img = img.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
    # a margin: detectors dislike text that touches the edge
    pad = 30
    big = Image.new("RGB", (img.width + 2 * pad, img.height + 2 * pad), img.getpixel((0, 0)))
    big.paste(img, (pad, pad))
    res, _ = engine(np.asarray(big)[:, :, ::-1])
    if not res:
        return "", 0.0
    # read boxes left to right, top to bottom
    res = sorted(res, key=lambda r: (round(r[0][0][1] / (h * scale * 0.5 + 1)), r[0][0][0]))
    return " ".join(r[1] for r in res), float(np.mean([float(r[2]) for r in res]))


out = {}
path = os.path.join(HERE, "out", variant, f"ocr{"" if SET == "typed" else "_" + SET}_p{part[0]}.json" if part else "ocr.json")
for n, c in enumerate(manifest):
    truth = norm(c["value"])
    entry = {}
    rp = os.path.join(HERE, "out", variant, SET, c["id"], "render.png")
    if not os.path.exists(rp):
        continue
    img = Image.open(rp).convert("RGB")
    t, conf = read(img)
    entry.update(text=t, conf=round(conf, 3), cer=round(min(1.0, lev(norm(t), truth) / max(1, len(truth))), 3))
    if want_ref:
        meta = json.load(open(os.path.join(HERE, "cache", SET, c["id"], "meta.json"), encoding="utf-8"))
        a = np.fromfile(os.path.join(HERE, "cache", SET, c["id"], "alpha.u8"), dtype=np.uint8).reshape(meta["height"], meta["width"])
        ref = Image.fromarray(255 - a).convert("RGB")
        rt, rconf = read(ref)
        entry.update(ref_text=rt, ref_cer=round(min(1.0, lev(norm(rt), truth) / max(1, len(truth))), 3))
    out[c["id"]] = entry
    if (n + 1) % 20 == 0:
        print(f"  {n + 1}/{len(manifest)}", flush=True)
json.dump(out, open(path, "w", encoding="utf-8"), indent=1)

# summary by size and font
def mean(xs):
    return sum(xs) / len(xs) if xs else float("nan")

sizes = sorted({c["size"] for c in manifest})
print(f"\n{variant}: {len(out)} cells read; mean character error {mean([e['cer'] for e in out.values()]):.3f}")
print("by cap height (mm): " + "  ".join(f"{s}:{mean([out[c['id']]['cer'] for c in manifest if c['size'] == s and c['id'] in out]):.2f}" for s in sizes))
fonts = sorted({(c["font"], c["bold"]) for c in manifest})
print("by font: " + "  ".join(f"{f}{'' if b else '(r)'}:{mean([out[c['id']]['cer'] for c in manifest if c['font'] == f and c['bold'] == b and c['id'] in out]):.2f}" for f, b in fonts))
if want_ref:
    print(f"ideal glyphs: mean character error {mean([e['ref_cer'] for e in out.values()]):.3f}")
    print("ideal by cap height: " + "  ".join(f"{s}:{mean([out[c['id']]['ref_cer'] for c in manifest if c['size'] == s and c['id'] in out]):.2f}" for s in sizes))




