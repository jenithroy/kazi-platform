"""Metrics and comparison sheets for the replay outputs.

  python -I tools.py metrics <set> <variant> [<name> ...]     -> out/<variant>/<set>/<name>/metrics.json and out/<variant>/<set>/_metrics.json
  python -I tools.py sheet   <set> <v1,v2,...> <out.png> [<name> ...]   (source | v1 | v2 ... ; then face crops when landmarks exist)

The render (8 px/mm, from lib/embroidery/stitch/raster.js) is put back on the source's frame exactly: the replay knows where the picture sits
(design space, centred), so nothing is guessed. Both are blurred 0.3 mm before they are compared ("nobody judges a design by single threads").
"""
import sys, os, json, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont

FACES = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(FACES, "cache")
OUT = os.path.join(FACES, "out")
BLUR_MM = 0.3


# ------------------------------------------------------------------ colour and filters
def srgb2lab(rgb):
    c = np.asarray(rgb, dtype=np.float32) / 255.0
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    m = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]], dtype=np.float32)
    xyz = c @ m.T / np.array([0.95047, 1.0, 1.08883], dtype=np.float32)
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], axis=-1)


def box1d(a, r, axis):
    n = a.shape[axis]
    r = int(max(1, min(r, (n - 1) // 2 if n > 2 else 1)))
    pad = [(0, 0)] * a.ndim
    pad[axis] = (r + 1, r)
    p = np.pad(a, pad, mode="edge")
    c = np.cumsum(p, axis=axis, dtype=np.float64)
    hi = np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis)
    lo = np.take(c, np.arange(0, n), axis=axis)
    return ((hi - lo) / (2 * r + 1)).astype(np.float32)


def gblur(a, sigma):
    """Three box passes per axis: a close match of a Gaussian of this sigma (pixels)."""
    if sigma < 0.5:
        return a
    r = max(1, int(round(math.sqrt(12 * sigma * sigma / 3 + 1) / 2 - 0.5)))
    out = a.astype(np.float32)
    for _ in range(3):
        out = box1d(out, r, 0)
        out = box1d(out, r, 1)
    return out


def sobel_mag(L):
    p = np.pad(L, 1, mode="edge")
    gx = (p[:-2, 2:] + 2 * p[1:-1, 2:] + p[2:, 2:]) - (p[:-2, :-2] + 2 * p[1:-1, :-2] + p[2:, :-2])
    gy = (p[2:, :-2] + 2 * p[2:, 1:-1] + p[2:, 2:]) - (p[:-2, :-2] + 2 * p[:-2, 1:-1] + p[:-2, 2:])
    return np.hypot(gx, gy)


def corr(a, b):
    a = a.astype(np.float64).ravel(); b = b.astype(np.float64).ravel()
    if a.size < 8 or a.std() < 1e-6 or b.std() < 1e-6:
        return 0.0
    return float(np.corrcoef(a, b)[0, 1])


# ------------------------------------------------------------------ landmarks -> polygons
def cycles(pairs):
    adj = {}
    for a, b in pairs:
        adj.setdefault(a, []).append(b)
        adj.setdefault(b, []).append(a)
    seen, out = set(), []
    for s in adj:
        if s in seen:
            continue
        loop, cur, prev = [s], s, None
        seen.add(s)
        while True:
            nxt = [v for v in adj[cur] if v != prev and v not in seen]
            if not nxt:
                break
            prev, cur = cur, nxt[0]
            seen.add(cur)
            loop.append(cur)
        if len(loop) >= 3:
            out.append(loop)
    return out


def load_constants():
    p = os.path.join(CACHE, "constants.json")
    return json.load(open(p)) if os.path.exists(p) else None


def face_polys(landmarks, W, H, consts, which):
    """polygons (pixel coords) of one face for the named parts."""
    pts = [(x * W, y * H) for x, y, _ in landmarks]
    polys = []
    for key in which:
        for loop in cycles(consts[key]):
            polys.append([pts[i] for i in loop])
    return polys


def mask_from(polys, W, H, grow_px=0):
    im = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(im)
    for p in polys:
        d.polygon(p, fill=255)
        if grow_px > 0:
            d.line(p + [p[0]], fill=255, width=int(2 * grow_px) + 1)
    return np.array(im) > 0


def bbox_of(polys, W, H, margin=0.12):
    xs = [x for p in polys for x, _ in p]; ys = [y for p in polys for _, y in p]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    mx, my = (x1 - x0) * margin, (y1 - y0) * margin
    return (max(0, int(x0 - mx)), max(0, int(y0 - my)), min(W, int(x1 + mx) + 1), min(H, int(y1 + my) + 1))


# ------------------------------------------------------------------ loading
def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def load_source(set_, name, cloth):
    d = os.path.join(CACHE, set_, name)
    meta = json.load(open(os.path.join(d, "meta.json")))
    W, H = meta["width"], meta["height"]
    a = np.fromfile(os.path.join(d, "image.rgba"), dtype=np.uint8).reshape(H, W, 4).astype(np.float32)
    al = a[..., 3:4] / 255.0
    bg = np.array(cloth, dtype=np.float32)
    return a[..., :3] * al + bg * (1 - al), (W, H)


def load_render(set_, variant, name, st):
    """The render laid on a canvas the size of the source's frame, cloth colour where nothing is sewn."""
    d = os.path.join(OUT, variant, set_, name)
    r = st["render"]
    cloth = hex2rgb(st["cloth"])
    ppm = r["pxPerMm"]
    cw, ch = int(round(st["widthMm"] * ppm)), int(round(st["heightMm"] * ppm))
    canvas = Image.new("RGB", (cw, ch), cloth)
    im = Image.open(os.path.join(d, "render.png")).convert("RGB")
    ox = int(round((r["originX"] + st["widthMm"] / 2) * ppm))
    oy = int(round((r["originY"] + st["heightMm"] / 2) * ppm))
    canvas.paste(im, (ox, oy))
    return canvas


def aligned(set_, variant, name):
    d = os.path.join(OUT, variant, set_, name)
    st = json.load(open(os.path.join(d, "stats.json")))
    cloth = hex2rgb(st["cloth"])
    src, (W, H) = load_source(set_, name, cloth)
    ren = load_render(set_, variant, name, st).resize((W, H), Image.BOX)
    return st, src, np.asarray(ren, dtype=np.float32), (W, H)


# ------------------------------------------------------------------ metrics
def region_metrics(src, ren, mask, sigma_px, lab_s, lab_r):
    if mask is None or mask.sum() < 30:
        return None
    de = np.sqrt(((lab_s - lab_r) ** 2).sum(-1))[mask]
    Ls, Lr = lab_s[..., 0], lab_r[..., 0]
    gs, gr = sobel_mag(Ls), sobel_mag(Lr)
    ys, xs = np.where(mask)
    sl = (slice(ys.min(), ys.max() + 1), slice(xs.min(), xs.max() + 1))
    m = mask[sl]
    ratio = float(Lr[sl][m].std() / (Ls[sl][m].std() + 1e-6))
    return {"dE": round(float(de.mean()), 2), "corrL": round(corr(Ls[sl][m], Lr[sl][m]), 3), "corrGrad": round(corr(gs[sl][m], gr[sl][m]), 3), "contrast": round(ratio, 2), "px": int(mask.sum())}


def threads_in(ren, mask, st):
    """how many of the design's threads cover at least 2 % of the region (nearest thread colour per pixel)"""
    if mask is None or mask.sum() < 30:
        return None
    th = np.array(st["threads"], dtype=np.float32)
    if len(th) == 0:
        return 0
    px = ren[mask]
    d = ((px[:, None, :] - th[None, :, :]) ** 2).sum(-1)
    idx = d.argmin(1)
    share = np.bincount(idx, minlength=len(th)) / len(px)
    return int((share >= 0.02).sum())


def compute(set_, variant, name):
    st, src, ren, (W, H) = aligned(set_, variant, name)
    sigma = BLUR_MM / st["mmPerPx"]
    bs, br = gblur(src, sigma), gblur(ren, sigma)
    lab_s, lab_r = srgb2lab(bs), srgb2lab(br)
    d = os.path.join(CACHE, set_, name)
    res = {"name": name, "stitches": st["stitches"], "trims": st["trims"], "threads": len(st["threads"]), "kind": st.get("kind"), "person": st.get("personFound")}
    full = np.ones((H, W), bool)
    res["all"] = region_metrics(src, ren, full, sigma, lab_s, lab_r)
    cls_path = os.path.join(OUT, variant, set_, name, "classes.u8")
    if st.get("personFound") and os.path.exists(cls_path):
        cl = np.fromfile(cls_path, dtype=np.uint8)
        if cl.size == W * H:
            res["person_area"] = region_metrics(src, ren, (cl.reshape(H, W) != 0), sigma, lab_s, lab_r)
    lm_path = os.path.join(d, "landmarks.json")
    consts = load_constants()
    if os.path.exists(lm_path) and consts:
        lms = json.load(open(lm_path))
        if lms:
            # the biggest face
            best = max(lms, key=lambda f: (max(p[0] for p in f) - min(p[0] for p in f)) * (max(p[1] for p in f) - min(p[1] for p in f)))
            oval = face_polys(best, W, H, consts, ["FACE_LANDMARKS_FACE_OVAL"])
            x0, y0, x1, y1 = bbox_of(oval, W, H, 0.0)
            fw_mm = (x1 - x0) * st["mmPerPx"]
            res["face_mm"] = round(fw_mm, 1)
            face_mask = mask_from(oval, W, H)
            res["face"] = region_metrics(src, ren, face_mask, sigma, lab_s, lab_r)
            res["face_threads"] = threads_in(ren, face_mask, st)
            grow = 0.4 / st["mmPerPx"]
            eyes = mask_from(face_polys(best, W, H, consts, ["FACE_LANDMARKS_LEFT_EYE", "FACE_LANDMARKS_RIGHT_EYE", "FACE_LANDMARKS_LEFT_IRIS", "FACE_LANDMARKS_RIGHT_IRIS"]), W, H, grow)
            brows = mask_from(face_polys(best, W, H, consts, ["FACE_LANDMARKS_LEFT_EYEBROW", "FACE_LANDMARKS_RIGHT_EYEBROW"]), W, H, grow)
            lips = mask_from(face_polys(best, W, H, consts, ["FACE_LANDMARKS_LIPS"]), W, H, grow)
            # features are judged with a smaller blur (0.15 mm): the eye is a few millimetres wide
            s2 = 0.15 / st["mmPerPx"]
            b2s, b2r = gblur(src, s2), gblur(ren, s2)
            l2s, l2r = srgb2lab(b2s), srgb2lab(b2r)
            res["eyes"] = region_metrics(src, ren, eyes, s2, l2s, l2r)
            res["brows"] = region_metrics(src, ren, brows, s2, l2s, l2r)
            res["lips"] = region_metrics(src, ren, lips, s2, l2s, l2r)
            res["eye_mm"] = round(float(np.hypot(*(np.array(best[33][:2]) - np.array(best[133][:2]))) * W * st["mmPerPx"]), 1)  # corner to corner of one eye
    return res


def cmd_metrics(set_, variant, names):
    base = os.path.join(OUT, variant, set_)
    names = names or sorted(n for n in os.listdir(base) if os.path.exists(os.path.join(base, n, "stats.json")))
    allres = {}
    for n in names:
        try:
            r = compute(set_, variant, n)
            allres[n] = r
            json.dump(r, open(os.path.join(base, n, "metrics.json"), "w"))
            f = r.get("face") or {}
            print(f"{n:26s} dE {r['all']['dE']:5.1f} corrL {r['all']['corrL']:.3f}" + (f"   FACE {r['face_mm']:5.1f} mm dE {f['dE']:5.1f} corrL {f['corrL']:.3f} thr {r.get('face_threads')}   eyes " + (f"c {r['eyes']['contrast']:.2f} r {r['eyes']['corrL']:.2f}" if r.get('eyes') else "-") if f else ""))
        except Exception as e:
            print(f"{n}: FAILED {e!r}")
    json.dump(allres, open(os.path.join(base, "_metrics.json"), "w"))


# ------------------------------------------------------------------ sheets
def font(sz):
    for f in ("arial.ttf", "segoeui.ttf"):
        try:
            return ImageFont.truetype(f, sz)
        except Exception:
            pass
    return ImageFont.load_default()


def fit(im, h):
    w = max(1, int(round(im.width * h / im.height)))
    return im.resize((w, h), Image.LANCZOS)


def cmd_sheet(set_, variants, out, names):
    variants = variants.split(",")
    base = os.path.join(OUT, variants[0], set_)
    names = names or sorted(n for n in os.listdir(base) if os.path.exists(os.path.join(base, n, "stats.json")))
    consts = load_constants()
    CH = int(os.environ.get("SHEET_CH", "520"))
    rows = []
    for n in names:
        cells = []
        st0 = json.load(open(os.path.join(OUT, variants[0], set_, n, "stats.json")))
        src, (W, H) = load_source(set_, n, hex2rgb(st0["cloth"]))
        srcim = Image.fromarray(src.astype(np.uint8))
        cells.append((srcim, [n, f"{st0['widthMm']:.0f} x {st0['heightMm']:.0f} mm"]))
        vs = list(variants)
        unchanged = False
        # a picture the work did not change: one column for "ours", not two identical ones
        if vs[:2] == ["before", "after"]:
            try:
                sb = json.load(open(os.path.join(OUT, "before", set_, n, "stats.json")))
                sa = json.load(open(os.path.join(OUT, "after", set_, n, "stats.json")))
                if (sb["stitches"], sb["trims"], len(sb["threads"])) == (sa["stitches"], sa["trims"], len(sa["threads"])):
                    vs = vs[1:]; unchanged = True
            except Exception:
                pass
        for v in vs:
            try:
                st = json.load(open(os.path.join(OUT, v, set_, n, "stats.json")))
                ren = load_render(set_, v, n, st).resize((W, H), Image.LANCZOS)
                mj = os.path.join(OUT, v, set_, n, "metrics.json")
                m = json.load(open(mj)) if os.path.exists(mj) else {}
                label = {"before": "ours BEFORE", "after": "ours AFTER", "dade": "DADE"}.get(v, v)
                if v == "after" and unchanged:
                    label = "ours (unchanged by this work)"
                cap = [f"{label}: {st['stitches']} st, {st['trims']} trims, {len(st['threads'])} threads"]
                if m.get("face"):
                    cap.append(f"face {m['face_mm']} mm: dE {m['face']['dE']}  corrL {m['face']['corrL']}  tones {m.get('face_threads')}")
                    if m.get("eyes"):
                        cap.append(f"eyes contrast {m['eyes']['contrast']}  corr {m['eyes']['corrL']}")
                elif m.get("all"):
                    cap.append(f"dE {m['all']['dE']}  corrL {m['all']['corrL']}")
                cells.append((ren, cap))
            except Exception as e:
                msg = "DADE could not convert this picture" if v == "dade" else f"{v}: missing ({e.__class__.__name__})"
                cells.append((Image.new("RGB", (W, H), (240, 220, 220)), [msg]))
        lmf = os.path.join(CACHE, set_, n, "landmarks.json")
        crops = None
        if consts and os.path.exists(lmf):
            lms = json.load(open(lmf))
            if lms:
                best = max(lms, key=lambda f: (max(p[0] for p in f) - min(p[0] for p in f)) * (max(p[1] for p in f) - min(p[1] for p in f)))
                x0, y0, x1, y1 = bbox_of(face_polys(best, W, H, consts, ["FACE_LANDMARKS_FACE_OVAL"]), W, H, 0.25)
                crops = [im.crop((x0, y0, x1, y1)) for im, _ in cells]
        row = [fit(im, CH) for im, _ in cells]
        capH = 62
        rw = sum(r.width for r in row) + 8 * (len(row) + 1)
        sheet = Image.new("RGB", (rw, CH + capH + (CH // 2 + 12 if crops else 0) + 8), (255, 255, 255))
        d = ImageDraw.Draw(sheet)
        x = 8
        for r, (_, cap) in zip(row, cells):
            sheet.paste(r, (x, capH))
            for i, line in enumerate(cap):
                d.text((x, 4 + i * 15), line, fill=(20, 20, 20), font=font(13))
            x += r.width + 8
        if crops:
            ch2 = CH // 2 + 8
            x = 8
            for c in crops:
                c2 = fit(c, ch2)
                sheet.paste(c2, (x, capH + CH + 8))
                x += row[crops.index(c)].width + 8 if False else c2.width + 8
        rows.append(sheet)
    wmax = max(r.width for r in rows)
    total = Image.new("RGB", (wmax, sum(r.height for r in rows)), (255, 255, 255))
    y = 0
    for r in rows:
        total.paste(r, (0, y)); y += r.height
    total.save(out)
    print("wrote", out, total.size)


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "metrics":
        cmd_metrics(sys.argv[2], sys.argv[3], sys.argv[4:])
    elif cmd == "sheet":
        cmd_sheet(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5:])
    else:
        raise SystemExit(__doc__)
