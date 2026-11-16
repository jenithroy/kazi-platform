"""What do the stitches do with the WHITE parts of a face: the teeth (inside the inner lips) and the eye whites (inside the eye outline, outside the iris)?
For each face picture: the source's median lightness there against the render's, the share of the render that is the cloth showing (unsewn), the share that is lighter than L 80.
usage: python -I probe_whites.py <set> <variant> [names...]"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw
import tools as T

SET, VARIANT = sys.argv[1], sys.argv[2]
NAMES = sys.argv[3:]
consts = T.load_constants()
base = os.path.join(T.OUT, VARIANT, SET)
names = NAMES or sorted(n for n in os.listdir(base) if os.path.exists(os.path.join(base, n, "stats.json")))
rows = []
for n in names:
    lmf = os.path.join(T.CACHE, SET, n, "landmarks.json")
    if not os.path.exists(lmf):
        continue
    lms = json.load(open(lmf))
    if not lms:
        continue
    st, src, ren, (W, H) = T.aligned(SET, VARIANT, n)
    if not st.get("personFound"):
        continue
    best = max(lms, key=lambda f: (max(p[0] for p in f) - min(p[0] for p in f)) * (max(p[1] for p in f) - min(p[1] for p in f)))
    loops = T.cycles(consts["FACE_LANDMARKS_LIPS"])
    pts = [(x * W, y * H) for x, y, _ in best]
    inner = min(loops, key=lambda lp: len(lp)) if len(loops) > 1 else loops[0]
    # the inner loop is the one with the smaller area
    def area(lp):
        p = [pts[i] for i in lp]
        return abs(sum(p[i][0] * p[(i + 1) % len(p)][1] - p[(i + 1) % len(p)][0] * p[i][1] for i in range(len(p)))) / 2
    inner = min(loops, key=area)
    mouth = T.mask_from([[pts[i] for i in inner]], W, H)
    eyes = T.mask_from(T.face_polys(best, W, H, consts, ["FACE_LANDMARKS_LEFT_EYE", "FACE_LANDMARKS_RIGHT_EYE"]), W, H)
    iris = T.mask_from(T.face_polys(best, W, H, consts, ["FACE_LANDMARKS_LEFT_IRIS", "FACE_LANDMARKS_RIGHT_IRIS"]), W, H, 2)
    sclera = eyes & ~iris
    cloth = np.array(T.hex2rgb(st["cloth"]), dtype=np.float32)
    ls, lr = T.srgb2lab(src)[..., 0], T.srgb2lab(ren)[..., 0]
    out = {"name": n}
    for label, m in (("teeth", mouth), ("sclera", sclera)):
        if m.sum() < 15:
            continue
        # the BRIGHT part of the source in that region (teeth, sclera): the top third by lightness
        thr = np.percentile(ls[m], 66)
        b = m & (ls >= thr)
        de_cloth = np.sqrt(((ren - cloth) ** 2).sum(-1))
        out[label] = {"px": int(m.sum()), "src_L_bright": round(float(np.median(ls[b])), 0), "render_L_there": round(float(np.median(lr[b])), 0),
                      "render_is_cloth_%": round(float(100 * (de_cloth[b] < 6).mean()), 0), "render_lighter_than_80_%": round(float(100 * (lr[b] > 80).mean()), 0)}
    rows.append(out)
    print(json.dumps(out))
