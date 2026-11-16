import json, sys, statistics as st
rows = []
for f in sys.argv[1:]:
    for line in open(f, encoding="utf-8"):
        line = line.strip()
        if line.startswith("{"):
            rows.append(json.loads(line))
for label in ("teeth", "sclera"):
    r = [x[label] for x in rows if label in x]
    if not r:
        continue
    print(label, "n=", len(r),
          "src L median", st.median(v["src_L_bright"] for v in r),
          "render L median", st.median(v["render_L_there"] for v in r),
          "render is cloth % mean", round(st.mean(v["render_is_cloth_%"] for v in r), 1),
          "render lighter than 80 % mean", round(st.mean(v["render_lighter_than_80_%"] for v in r), 1))
    worst = sorted(((v["src_L_bright"] - v["render_L_there"], x["name"]) for x in rows if label in x for v in [x[label]]), reverse=True)[:6]
    print("   biggest darkening:", [(round(d), n[:28]) for d, n in worst])
