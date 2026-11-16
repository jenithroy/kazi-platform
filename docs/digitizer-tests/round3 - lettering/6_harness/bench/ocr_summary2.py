"""Merge the OCR parts of the wider font set (typed2) and compare variants.  usage: python -I ocr_summary2.py <variant> [<variant> ...]"""
import sys, os, json, glob
HERE = os.path.dirname(os.path.abspath(__file__))
manifest = json.load(open(os.path.join(HERE, "cache", "typed2", "manifest.json"), encoding="utf-8"))
def load(v):
    d = {}
    for p in glob.glob(os.path.join(HERE, "out", v, "ocr_typed2_p*.json")):
        d.update(json.load(open(p, encoding="utf-8")))
    return d
def mean(xs):
    return sum(xs) / len(xs) if xs else float("nan")
variants = sys.argv[1:]
data = {v: load(v) for v in variants}
print(f"{'character error (lower is better)':36s}" + " ".join(f"{v:>9}" for v in variants))
def row(label, sel):
    cells = [c for c in manifest if sel(c)]
    print(f"{label:36s}" + " ".join((f"{mean([data[v][c['id']]['cer'] for c in cells if c['id'] in data[v]]):9.3f}" if any(c['id'] in data[v] for c in cells) else "        -") for v in variants))
row("all cells", lambda c: True)
for s in sorted({c["size"] for c in manifest}):
    row(f"caps {s} mm", lambda c, s=s: c["size"] == s)
styles = []
for c in manifest:
    if c["style"] not in styles:
        styles.append(c["style"])
for st in styles:
    row(st + " (" + ", ".join(sorted({c["font"] for c in manifest if c["style"] == st})) + ")", lambda c, st=st: c["style"] == st)
bad = lambda v: sum(1 for c in manifest if c["id"] in data[v] and data[v][c["id"]]["cer"] >= 0.3)
print(f"{'cells with error >= 0.3':36s}" + " ".join(f"{bad(v):9d}" for v in variants))
print(f"{'cells read':36s}" + " ".join(f"{len(data[v]):9d}" for v in variants))
