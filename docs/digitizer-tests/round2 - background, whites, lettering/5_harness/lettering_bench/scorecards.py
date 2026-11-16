"""Side by side: the scorecard of several variants (the table at the top of out/<variant>/summary.md).
usage: python -I scorecards.py base x2 x3 ...   [--only typed]"""
import sys, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
names = [a for a in sys.argv[1:] if not a.startswith("--")]
only_typed = "--only" in sys.argv
rows = {}
order = []
for v in names:
    path = os.path.join(HERE, "out", v, "summary.md")
    if not os.path.exists(path):
        print("missing", path)
        continue
    seen_table = False
    for line in open(path, encoding="utf-8"):
        if seen_table and not line.strip():
            break  # the scorecard is the first table: stop at its end
        if line.startswith("| test |"):
            seen_table = True
        if not seen_table:
            continue
        m = re.match(r"^\| (.+?) \| (.+?) \|$", line.strip())
        if not m or m.group(1) in ("test", "---") or m.group(1).startswith("---") or m.group(1).startswith("cap mm") or m.group(1).startswith(":--"):
            continue
        k, val = m.group(1), m.group(2)
        if k == "cell" or k == "font":
            break
        if only_typed and (k.startswith("chart") or k.startswith("crest") or k.startswith("sign") or k.startswith("seal")):
            continue
        if k not in rows:
            rows[k] = {}
            order.append(k)
        rows[k][v] = val
w = max(len(k) for k in order)
print(f"{'':{w}} " + " ".join(f"{v:>9}" for v in names))
for k in order:
    print(f"{k:{w}} " + " ".join(f"{rows[k].get(v, ''):>9}" for v in names))
