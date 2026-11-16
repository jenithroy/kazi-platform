"""Ours (after) against DADE, from the metrics files.   usage: python -I vs_dade.py <set> [ours variant=after] [dade variant=dade]
Face pictures: the face region (landmark outline), eyes, lips; every picture: the whole frame. Both drawn on the cloth the tool chose, blurred 0.3 mm, same physical size."""
import sys, os, json
import numpy as np

FACES = os.path.dirname(os.path.abspath(__file__))
SET = sys.argv[1]
OURS = sys.argv[2] if len(sys.argv) > 2 else "after"
DADE = sys.argv[3] if len(sys.argv) > 3 else "dade"
mo = json.load(open(os.path.join(FACES, "out", OURS, SET, "_metrics.json"), encoding="utf-8"))
md = json.load(open(os.path.join(FACES, "out", DADE, SET, "_metrics.json"), encoding="utf-8"))
man = {}
mp = os.path.join(os.path.dirname(FACES), "inputs4", "manifest.json")
if SET == "new55" and os.path.exists(mp):
    for e in json.load(open(mp, encoding="utf-8")):
        man[e["file"].rsplit(".", 1)[0]] = e


def cat(n):
    return man[n]["category"] if n in man else (n.split("_")[0] if "_" in n else n)


def g(d, *ks):
    for k in ks:
        if not d:
            return None
        d = d.get(k)
    return d


names = sorted(n for n in mo if n in md)
rows = []
print(f"{'picture':44s} {'ours st/tr/th':>16s} {'DADE st/tr/th':>16s} | {'whole corrL ours/DADE':>22s} {'dE':>12s} | face corrL ours/DADE   eyes contrast ours/DADE   lips c")
agg = {}
for n in names:
    a, d = mo[n], md[n]
    line = f"{n[:44]:44s} {a['stitches']:6d}/{a['trims']:4d}/{a['threads']:2d} {d['stitches']:6d}/{d['trims']:4d}/{d['threads']:2d} |"
    line += f" {a['all']['corrL']:8.3f}/{d['all']['corrL']:6.3f} {a['all']['dE']:6.1f}/{d['all']['dE']:5.1f} |"
    fa, fd = a.get("face"), d.get("face")
    if fa and fd:
        line += f" {fa['corrL']:6.3f}/{fd['corrL']:6.3f}  {g(a,'eyes','contrast')}/{g(d,'eyes','contrast')}  {g(a,'lips','contrast')}/{g(d,'lips','contrast')}"
        agg.setdefault("face", []).append((fa["corrL"], fd["corrL"], fa["dE"], fd["dE"], g(a, "eyes", "corrL"), g(d, "eyes", "corrL")))
    rows.append(line)
    c = cat(n)
    agg.setdefault(("cat", c), []).append((a["all"]["corrL"], d["all"]["corrL"], a["all"]["dE"], d["all"]["dE"], a["stitches"], d["stitches"], a["trims"], d["trims"]))
print("\n".join(rows))
if "face" in agg:
    f = np.array(agg["face"], dtype=float)
    print(f"\nFACES ({len(f)} with a face region): face-region correlation ours {f[:,0].mean():.3f} vs DADE {f[:,1].mean():.3f}; ours higher on {(f[:,0] > f[:,1]).sum()} of {len(f)}; "
          f"face dE ours {f[:,2].mean():.2f} vs DADE {f[:,3].mean():.2f} (lower is better; ours lower on {(f[:,2] < f[:,3]).sum()}); eye-region correlation ours {np.nanmean(f[:,4]):.3f} vs DADE {np.nanmean(f[:,5]):.3f}")
print("\nBY CATEGORY (whole frame; ours | DADE):")
for k, v in agg.items():
    if isinstance(k, tuple):
        a = np.array(v, dtype=float)
        print(f"  {k[1]:14s} n={len(a):2d}  corrL {a[:,0].mean():.3f} | {a[:,1].mean():.3f}   dE {a[:,2].mean():5.2f} | {a[:,3].mean():5.2f}   stitches {a[:,4].mean():7.0f} | {a[:,5].mean():7.0f}   trims {a[:,6].mean():5.0f} | {a[:,7].mean():5.0f}")
allv = np.array([x for k, v in agg.items() if isinstance(k, tuple) for x in v], dtype=float)
print(f"\nALL {len(allv)}: corrL ours {allv[:,0].mean():.3f} vs DADE {allv[:,1].mean():.3f} (ours higher on {(allv[:,0] > allv[:,1]).sum()}); dE ours {allv[:,2].mean():.2f} vs {allv[:,3].mean():.2f} (ours lower on {(allv[:,2] < allv[:,3]).sum()}); "
      f"stitches ours {allv[:,4].sum():.0f} vs DADE {allv[:,5].sum():.0f}; trims median ours {np.median(allv[:,6]):.0f} vs DADE {np.median(allv[:,7]):.0f}")
