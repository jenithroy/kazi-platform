"""Compare two metric dumps (tools.py metrics output) line by line: the face dE / corrL / threads / eyes numbers, and which pictures changed at all.
usage: python -I cmp_metrics.py <base.txt> <new.txt> [more base/new pairs...]"""
import re, sys, statistics as st

def parse(path):
    rows = {}
    for line in open(path, encoding="utf-8"):
        m = re.match(r"^(\S+)\s+dE\s+([\d.]+)\s+corrL\s+(-?[\d.]+)(?:\s+FACE\s+([\d.]+) mm dE\s+([\d.]+)\s+corrL\s+(-?[\d.]+)\s+thr\s+(\d+)\s+eyes c\s+([\d.]+)\s+r\s+(-?[\d.]+))?", line)
        if not m:
            continue
        n = m.group(1)
        rows[n] = dict(dE=float(m.group(2)), corr=float(m.group(3)),
                       face_mm=float(m.group(4)) if m.group(4) else None, face_dE=float(m.group(5)) if m.group(5) else None,
                       face_corr=float(m.group(6)) if m.group(6) else None, face_thr=int(m.group(7)) if m.group(7) else None,
                       eye_c=float(m.group(8)) if m.group(8) else None, eye_r=float(m.group(9)) if m.group(9) else None)
    return rows

args = sys.argv[1:]
base, new = {}, {}
for i in range(0, len(args), 2):
    base.update(parse(args[i])); new.update(parse(args[i + 1]))
common = [n for n in base if n in new]
changed = [n for n in common if any(base[n][k] != new[n][k] for k in base[n])]
print(f"{len(common)} pictures, {len(changed)} changed")
faces = [n for n in common if base[n]["face_dE"] is not None and new[n]["face_dE"] is not None]
def med(rows, key, names):
    v = [rows[n][key] for n in names if rows[n][key] is not None]
    return round(st.mean(v), 3) if v else None
print(f"{len(faces)} pictures with a face measured")
for key in ("face_dE", "face_corr", "face_thr", "eye_c", "eye_r"):
    print(f"  mean {key:10s} base {med(base, key, faces)}  new {med(new, key, faces)}")
print()
for n in changed:
    b, w = base[n], new[n]
    if b["face_dE"] is None:
        print(f"{n[:44]:44s} (no face)  dE {b['dE']} -> {w['dE']}  corrL {b['corr']} -> {w['corr']}")
    else:
        print(f"{n[:44]:44s} face dE {b['face_dE']:5.2f} -> {w['face_dE']:5.2f}  corr {b['face_corr']:.3f} -> {w['face_corr']:.3f}  thr {b['face_thr']} -> {w['face_thr']}  eyes c {b['eye_c']:.2f} -> {w['eye_c']:.2f} r {b['eye_r']:.2f} -> {w['eye_r']:.2f}")
