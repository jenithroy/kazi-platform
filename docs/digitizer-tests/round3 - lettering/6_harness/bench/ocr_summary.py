"""Merge the OCR parts of one or more variants and compare them.  usage: python -I ocr_summary.py <variant> [<variant> ...]"""
import sys, os, json, glob
HERE = os.path.dirname(os.path.abspath(__file__))
manifest = json.load(open(os.path.join(HERE, "cache", "typed", "manifest.json"), encoding="utf-8"))
def load(v):
    d = {}
    for p in glob.glob(os.path.join(HERE, "out", v, "ocr_p*.json")) + glob.glob(os.path.join(HERE, "out", v, "ocr.json")):
        d.update(json.load(open(p, encoding="utf-8")))
    return d
def mean(xs):
    return sum(xs) / len(xs) if xs else float("nan")
variants = sys.argv[1:]
data = {v: load(v) for v in variants}
sizes = sorted({c["size"] for c in manifest})
fonts = sorted({(c["font"], c["bold"]) for c in manifest})
def row(label, sel):
    cells = [c for c in manifest if sel(c)]
    out = []
    for v in variants:
        xs = [data[v][c["id"]]["cer"] for c in cells if c["id"] in data[v]]
        out.append(f"{mean(xs):9.3f}" if xs else "        -")
    print(f"{label:34s}" + " ".join(out))
print(f"{'character error (lower is better)':34s}" + " ".join(f"{v:>9}" for v in variants))
row("all cells", lambda c: True)
for s in sizes:
    row(f"caps {s} mm", lambda c, s=s: c["size"] == s)
row("caps 3-4 mm", lambda c: c["size"] in (3, 4))
row("caps 5-6 mm", lambda c: c["size"] in (5, 6))
row("caps 8-15 mm", lambda c: c["size"] >= 8)
for f, b in fonts:
    row(f"{f}{'' if b else ' (regular)'}", lambda c, f=f, b=b: c["font"] == f and c["bold"] == b)
row("serif+times, 3-6 mm", lambda c: c["font"] in ("serif", "times") and c["size"] <= 6)
row("black+condensed, 3-6 mm", lambda c: c["font"] in ("black", "condensed") and c["size"] <= 6)
bad = lambda v: sum(1 for c in manifest if c["id"] in data[v] and data[v][c["id"]]["cer"] >= 0.3)
print(f"{'cells with error >= 0.3':34s}" + " ".join(f"{bad(v):9d}" for v in variants))
print(f"{'cells read':34s}" + " ".join(f"{len(data[v]):9d}" for v in variants))
