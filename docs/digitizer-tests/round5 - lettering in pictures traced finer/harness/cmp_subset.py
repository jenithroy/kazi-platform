"""Compare variants on the pictures ALL of them have read (e.g. ours before / ours now / DADE on the subset DADE was run on).
usage: python -I cmp_subset.py <set> name=<dir> [name=<dir> ...]     <dir>: out/<variant> (holds ocr_<set>_p*.json)
"""
import sys, os, json, glob
HERE = os.path.dirname(os.path.abspath(__file__))
SET = sys.argv[1]
man = {m["id"]: m for m in json.load(open(os.path.join(HERE, "cache", SET, "manifest.json"), encoding="utf-8"))}
cols = []
for a in sys.argv[2:]:
    n, d = a.split("=", 1)
    dd = {}
    for p in glob.glob(os.path.join(d, f"ocr_{SET}_p*.json")):
        dd.update(json.load(open(p, encoding="utf-8")))
    cols.append((n, dd))
common = [i for i in man if all(i in d for _, d in cols)]
mean = lambda xs: sum(xs) / len(xs) if xs else float("nan")
print(f"{SET}: {len(common)} pictures read by all of: " + ", ".join(n for n, _ in cols))
def row(label, sel):
    ids = [i for i in common if sel(man[i])]
    if not ids: return
    print(f"{label:28s}" + "".join(f"{mean([d[i] for i in ids]):11.3f}" for _, d in cols) + f"   n={len(ids)}")
print(f"{'':28s}" + "".join(f"{n[:10]:>11s}" for n, _ in cols))
row("all", lambda m: True)
for s in sorted({m["size"] for m in man.values()}): row(f"caps {s} mm", lambda m, s=s: m["size"] == s)
for w in sorted({m["str"] for m in man.values()}): row(f"word '{w}'", lambda m, w=w: m["str"] == w)
print()
for f in sorted({m["font"] for m in man.values()}): row(f"font {f}", lambda m, f=f: m["font"] == f)
