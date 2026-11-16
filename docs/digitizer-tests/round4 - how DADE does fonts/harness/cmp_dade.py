"""Compare the reader's character error of two variants (ours = fin2, DADE = dade) on the cells BOTH have, by size and by font, and list the biggest differences.
usage: python -I cmp_dade.py <set typed|typed2> <variantA> <variantB> [--maxsize 6] [--csv out.csv]
"""
import sys, os, json, glob
sys.stdout.reconfigure(encoding="utf-8")
HERE =r"<SESSION>\scratchpad\text"
SET, A, B = sys.argv[1], sys.argv[2], sys.argv[3]
maxsize = 6.0
for i, a in enumerate(sys.argv):
    if a == "--maxsize":
        maxsize = float(sys.argv[i + 1])
csv = None
for i, a in enumerate(sys.argv):
    if a == "--csv":
        csv = sys.argv[i + 1]
manifest = [c for c in json.load(open(os.path.join(HERE, "cache", SET, "manifest.json"), encoding="utf-8")) if c["size"] <= maxsize]


def load(v):
    pat = "ocr_p*.json" if SET == "typed" else f"ocr_{SET}_p*.json"
    d = {}
    for p in glob.glob(os.path.join(HERE, "out", v, pat)):
        d.update(json.load(open(p, encoding="utf-8")))
    return d


da, db = load(A), load(B)
common = [c for c in manifest if c["id"] in da and c["id"] in db]
print(f"set {SET}: {len(common)} cells read by both ({A}: {len(da)}, {B}: {len(db)}); caps <= {maxsize} mm")


def mean(xs):
    return sum(xs) / len(xs) if xs else float("nan")


def row(label, sel):
    cs = [c for c in common if sel(c)]
    if not cs:
        return
    a, b = mean([da[c["id"]]["cer"] for c in cs]), mean([db[c["id"]]["cer"] for c in cs])
    wa = sum(1 for c in cs if da[c["id"]]["cer"] + 0.1 < db[c["id"]]["cer"])   # A clearly better
    wb = sum(1 for c in cs if db[c["id"]]["cer"] + 0.1 < da[c["id"]]["cer"])   # B clearly better
    print(f"{label:30s} n={len(cs):3d}  {A} {a:6.3f}  {B} {b:6.3f}   {A} clearly better {wa:3d}, {B} clearly better {wb:3d}")


row("all cells", lambda c: True)
for s in sorted({c["size"] for c in common}):
    row(f"caps {s} mm", lambda c, s=s: c["size"] == s)
for st in sorted({c["str"] for c in common}):
    row(f"text '{st}'", lambda c, st=st: c["str"] == st)
print()
if SET == "typed":
    for f, b in sorted({(c["font"], c["bold"]) for c in common}):
        row(f"{f}{'' if b else ' (regular)'}", lambda c, f=f, b=b: c["font"] == f and c["bold"] == b)
else:
    for f in sorted({c["font"] for c in common}):
        style = next(c.get("style", "") for c in common if c["font"] == f)
        row(f"{f} ({style})", lambda c, f=f: c["font"] == f)
print()
big = sorted(common, key=lambda c: da[c["id"]]["cer"] - db[c["id"]]["cer"])
print(f"{A} much worse than {B} (top 8):")
for c in big[-8:][::-1]:
    print(f"  {c['id']:28s} {A} {da[c['id']]['cer']:.2f} '{da[c['id']]['text'][:26]}'   {B} {db[c['id']]['cer']:.2f} '{db[c['id']]['text'][:26]}'")
print(f"{B} much worse than {A} (top 8):")
for c in big[:8]:
    print(f"  {c['id']:28s} {A} {da[c['id']]['cer']:.2f} '{da[c['id']]['text'][:26]}'   {B} {db[c['id']]['cer']:.2f} '{db[c['id']]['text'][:26]}'")
over = lambda d: sum(1 for c in common if d[c["id"]]["cer"] >= 0.3)
print(f"\ncells with error >= 0.3:  {A} {over(da)}   {B} {over(db)}  (of {len(common)})")
if csv:
    with open(csv, "w", encoding="utf-8") as fh:
        fh.write(f"cell,font,size,str,{A}_cer,{B}_cer,{A}_text,{B}_text\n")
        for c in common:
            fh.write(f"{c['id']},{c['font']},{c['size']},{c['str']},{da[c['id']]['cer']},{db[c['id']]['cer']},\"{da[c['id']]['text']}\",\"{db[c['id']]['text']}\"\n")
