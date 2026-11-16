"""Before/after table from the metrics files.   usage: python -I compare.py <set> <before> <after> [split: tune|holdout|all]"""
import sys, os, json
import numpy as np

FACES = os.path.dirname(os.path.abspath(__file__))
SET, B, A = sys.argv[1], sys.argv[2], sys.argv[3]
SPLIT = sys.argv[4] if len(sys.argv) > 4 else "all"
mb = json.load(open(os.path.join(FACES, "out", B, SET, "_metrics.json")))
ma = json.load(open(os.path.join(FACES, "out", A, SET, "_metrics.json")))
manifest = {}
mp = os.path.join(os.path.dirname(FACES), "inputs4", "manifest.json")
if os.path.exists(mp):
    for e in json.load(open(mp, encoding="utf-8")):
        manifest[e["file"].rsplit(".", 1)[0]] = e


def g(d, *ks):
    for k in ks:
        if d is None:
            return None
        d = d.get(k)
    return d


rows, same, changed = [], 0, 0
fd = {"corrL": [], "dE": [], "eyes_c": [], "eyes_r": [], "tones": [], "lips_c": [], "brows_c": []}
for n in sorted(ma):
    e = manifest.get(n)
    if SPLIT != "all" and e and e["split"] != SPLIT:
        continue
    b, a = mb.get(n), ma[n]
    if not b:
        continue
    ident = b["stitches"] == a["stitches"] and b["trims"] == a["trims"] and b["threads"] == a["threads"]
    same += ident
    changed += (not ident)
    fb, fa = b.get("face"), a.get("face")
    row = f"{n[:42]:42s} {'P' if a.get('person') else '-'} {b['stitches']:6d}->{a['stitches']:6d} tr {b['trims']:4d}->{a['trims']:4d} th {b['threads']:2d}->{a['threads']:2d}"
    pb, pa_ = b.get("person_area"), a.get("person_area")
    if pb and pa_ and not ident:
        row += f" | PERSON dE {pb['dE']:5.1f}->{pa_['dE']:5.1f} corrL {pb['corrL']:.3f}->{pa_['corrL']:.3f}"
        fd.setdefault("pa_dE", []).append(pa_["dE"] - pb["dE"]); fd.setdefault("pa_corr", []).append(pa_["corrL"] - pb["corrL"])
        fd.setdefault("stitches", []).append(a["stitches"] / b["stitches"] - 1); fd.setdefault("trims", []).append(a["trims"] / max(1, b["trims"]) - 1)
    if fb and fa:
        row += f" | face {a['face_mm']:5.1f}mm eye {a['eye_mm']:3.1f}: corrL {fb['corrL']:.3f}->{fa['corrL']:.3f} dE {fb['dE']:5.1f}->{fa['dE']:5.1f} eyes c {g(b,'eyes','contrast')}->{g(a,'eyes','contrast')} tones {b.get('face_threads')}->{a.get('face_threads')}"
        if not ident:
            fd["corrL"].append(fa["corrL"] - fb["corrL"]); fd["dE"].append(fa["dE"] - fb["dE"])
            for k, key in (("eyes_c", "eyes"), ("lips_c", "lips"), ("brows_c", "brows")):
                if g(b, key) and g(a, key):
                    fd[k].append(g(a, key, "contrast") - g(b, key, "contrast"))
            fd["eyes_r"].append((g(a, "eyes", "corrL") or 0) - (g(b, "eyes", "corrL") or 0))
            fd["tones"].append((a.get("face_threads") or 0) - (b.get("face_threads") or 0))
    rows.append(row)
print("\n".join(rows))
print(f"\n{len(rows)} pictures: {same} identical to the baseline (stitches, trims, threads), {changed} changed")
if fd.get("pa_dE"):
    print(f"whole person ({len(fd['pa_dE'])} changed pictures): mean change in dE {np.mean(fd['pa_dE']):+.2f}, corrL {np.mean(fd['pa_corr']):+.3f}, stitches {np.mean(fd['stitches']) * 100:+.1f} %, trims {np.mean(fd['trims']) * 100:+.1f} %")
if fd["corrL"]:
    k = len(fd["corrL"])
    print(f"faces that changed ({k}): mean change in face corrL {np.mean(fd['corrL']):+.3f}, face dE {np.mean(fd['dE']):+.2f}, eye contrast {np.mean(fd['eyes_c']):+.2f}, eye corrL {np.mean(fd['eyes_r']):+.3f}, brow contrast {np.mean(fd['brows_c']):+.2f}, lips contrast {np.mean(fd['lips_c']):+.2f}, tones in face {np.mean(fd['tones']):+.1f}")
