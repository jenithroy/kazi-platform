"""Renders DADE's stitch files (DST: no thread colours) on the source's frame, like a careful thread pick would look: each colour block is drawn in the median colour of
the source under its stitches. DADE centres its stitching on the origin and leaves near-white background out, so the placement is found by matching the stitch coverage to
the source's non-white area (the scale is fixed: 1 source px = 0.1 mm). Writes out/dade/<set>/<name>/{render.png, stats.json} in the form tools.py reads.

usage: python -I render_dade.py <set> <dst dir> <source dir> [<name> ...]"""
import sys, os, json
import numpy as np
from PIL import Image, ImageDraw
import pyembroidery as pe

FACES = os.path.dirname(os.path.abspath(__file__))
SET, DST_DIR, SRC_DIR = sys.argv[1], sys.argv[2], sys.argv[3]
NAMES = sys.argv[4:]
S, K = 8.0, 3
CLOTH = (244, 241, 234)


def blocks_of(p):
    blocks, cur, poly = [], [], []
    for x, y, c in p.stitches:
        cmd = c & 0xFF
        if cmd == pe.STITCH:
            poly.append((x / 10.0, y / 10.0))
        elif cmd in (pe.JUMP, pe.TRIM):
            if poly: cur.append(poly); poly = []
        elif cmd in (pe.COLOR_CHANGE, pe.STOP):
            if poly: cur.append(poly); poly = []
            if cur: blocks.append(cur); cur = []
        elif cmd == pe.END:
            break
    if poly: cur.append(poly)
    if cur: blocks.append(cur)
    return blocks


def find_offset(blocks, src, Wmm, Hmm, xmin, ymin, wst, hst):
    """top-left of the stitched box in the source frame (mm), by IoU of coverage with the non-white area at 2 px/mm"""
    res = 2.0
    sw, sh = int(Wmm * res), int(Hmm * res)
    small = np.array(src.resize((sw, sh), Image.BOX)).astype(np.int16)
    ink = small.min(axis=2) < 232
    cov = np.zeros((int(hst * res) + 3, int(wst * res) + 3), bool)
    for b in blocks:
        for pl in b:
            for (x, y) in pl:
                cov[int((y - ymin) * res), int((x - xmin) * res)] = True
    # thicken the stitch points a little so rows of needle holes make a solid area
    from itertools import product
    thick = np.zeros_like(cov)
    for dx, dy in product((-1, 0, 1), repeat=2):
        thick |= np.roll(np.roll(cov, dy, 0), dx, 1)
    ch, cw = thick.shape
    best, bo = -1.0, (0, 0)
    for oy in range(0, max(1, sh - ch + 6)):
        for ox in range(0, max(1, sw - cw + 6)):
            win = ink[oy:oy + ch, ox:ox + cw]
            t = thick[:win.shape[0], :win.shape[1]]
            inter = (win & t).sum()
            union = (win | t).sum() + (t.sum() - t[:win.shape[0], :win.shape[1]].sum())
            iou = inter / max(1, union)
            if iou > best:
                best, bo = iou, (ox, oy)
    return bo[0] / res, bo[1] / res, best


def lab(rgb):
    c = rgb / 255.0
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ M.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], axis=-1)


def find_offset_var(blocks, src, Wmm, Hmm, xmin, ymin, wst, hst):
    """The offset at which every colour block lies on the most uniform colour of the source (DADE sews each block in ONE colour, so under the true offset the
    picture under a block is nearly flat; under a wrong one it is not). Works when DADE left a dark or coloured background out, where 'non-white' fails."""
    sa = np.asarray(src.convert("RGB"), dtype=np.float32)
    L = lab(sa)
    H, W = L.shape[:2]
    rng = np.random.default_rng(5)
    samples = []
    for b in blocks:
        pts = np.array([(x - xmin, y - ymin) for pl in b for x, y in pl], dtype=np.float64)
        if len(pts) == 0:
            continue
        sel = rng.choice(len(pts), size=min(1200, len(pts)), replace=False)
        samples.append(pts[sel] * 10.0)  # source pixels from the stitched box's corner
    maxx, maxy = max(0.0, (Wmm - wst) * 10.0), max(0.0, (Hmm - hst) * 10.0)

    def cost(ox, oy):
        tot = 0.0
        for s in samples:
            x = np.clip((s[:, 0] + ox).astype(int), 0, W - 1)
            y = np.clip((s[:, 1] + oy).astype(int), 0, H - 1)
            v = L[y, x]
            tot += v.var(axis=0).sum() * len(s)
        return tot

    best = (1e30, 0.0, 0.0)
    step = 10.0
    oy = -20.0
    while oy <= maxy + 20.0:
        ox = -20.0
        while ox <= maxx + 20.0:
            c = cost(ox, oy)
            if c < best[0]: best = (c, ox, oy)
            ox += step
        oy += step
    for step in (4.0, 1.0):
        c0, bx, by = best
        for oy in np.arange(by - 12, by + 12.01, step):
            for ox in np.arange(bx - 12, bx + 12.01, step):
                c = cost(ox, oy)
                if c < best[0]: best = (c, ox, oy)
    return best[1] / 10.0, best[2] / 10.0, best[0]


for name in NAMES:
    dst = os.path.join(DST_DIR, name + ".dst")
    srcp = os.path.join(SRC_DIR, name + ".png")
    if not (os.path.exists(dst) and os.path.exists(srcp)):
        print("missing", name); continue
    p = pe.read_dst(dst)
    blocks = blocks_of(p)
    src = Image.open(srcp).convert("RGB")
    W, H = src.size
    Wmm, Hmm = W / 10.0, H / 10.0
    xs = [x for b in blocks for pl in b for x, y in pl]; ys = [y for b in blocks for pl in b for x, y in pl]
    xmin, ymin, xmax, ymax = min(xs), min(ys), max(xs), max(ys)
    wst, hst = xmax - xmin, ymax - ymin
    # the cloth: DADE's file says nothing about the garment, and where it left a dark backdrop out the garment IS that colour, so it is drawn on the cloth OUR tool chose for the picture
    CLOTH = (244, 241, 234)
    ours = os.path.join(FACES, "out", "after", SET, name, "stats.json")
    if os.path.exists(ours):
        h = json.load(open(ours))["cloth"].lstrip("#")
        CLOTH = tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
    prev = os.path.join(FACES, "out", "dade", SET, name, "stats.json")
    pl = json.load(open(prev)).get("placement") if os.path.exists(prev) and not os.environ.get("FORCE_PLACE") else None
    if pl:
        ox, oy, iou = pl["x"], pl["y"], pl["iou"]  # found on an earlier run
    elif wst >= Wmm * 0.985 and hst >= Hmm * 0.985:
        ox, oy, iou = (Wmm - wst) / 2, (Hmm - hst) / 2, 1.0  # the whole frame is stitched: no search
    elif os.environ.get("PLACE", "var") == "var":
        ox, oy, iou = find_offset_var(blocks, src, Wmm, Hmm, xmin, ymin, wst, hst)
    else:
        ox, oy, iou = find_offset(blocks, src, Wmm, Hmm, xmin, ymin, wst, hst)
    cw, ch = int(round(Wmm * S)), int(round(Hmm * S))
    sa = np.array(src)
    lw = max(1, int(round(0.45 * S * K)))
    im = Image.new("RGB", (cw * K, ch * K), CLOTH)
    d = ImageDraw.Draw(im)
    lw_mm = 0.45
    for b in blocks:
        # colour: the median of the source under this block's stitch points
        pts = [((x - xmin + ox) * 10.0, (y - ymin + oy) * 10.0) for pl in b for x, y in pl]
        px = np.array([(min(W - 1, max(0, int(x))), min(H - 1, max(0, int(y)))) for x, y in pts])
        col = tuple(int(v) for v in np.median(sa[px[:, 1], px[:, 0]], axis=0)) if len(px) else (128, 128, 128)
        for pl in b:
            if len(pl) > 1:
                d.line([((x - xmin + ox) * S * K, (y - ymin + oy) * S * K) for x, y in pl], fill=col, width=lw)
    im = im.resize((cw, ch), Image.LANCZOS)
    od = os.path.join(FACES, "out", "dade", SET, name)
    os.makedirs(od, exist_ok=True)
    im.save(os.path.join(od, "render.png"))
    sc = [0, 0, 0, 0]
    for x, y, c in p.stitches:
        k = c & 0xFF
        if k == pe.STITCH: sc[0] += 1
        elif k == pe.TRIM: sc[1] += 1
        elif k == pe.JUMP: sc[2] += 1
        elif k == pe.COLOR_CHANGE: sc[3] += 1
    # the threads: the median colour of each block (for the "tones in the face" count)
    threads = []
    for b in blocks:
        pts = [((x - xmin + ox) * 10.0, (y - ymin + oy) * 10.0) for pl in b for x, y in pl]
        px = np.array([(min(W - 1, max(0, int(x))), min(H - 1, max(0, int(y)))) for x, y in pts])
        threads.append([int(v) for v in (np.median(sa[px[:, 1], px[:, 0]], axis=0) if len(px) else (128, 128, 128))])
    stats = {"name": name, "set": SET, "tool": "DADE", "widthMm": Wmm, "heightMm": Hmm, "mmPerPx": 0.1, "imageW": W, "imageH": H, "kind": None, "personFound": False,
             "stitches": sc[0], "trims": sc[1] + (sc[2] // 3), "jumps": sc[2], "colourChanges": sc[3], "threads": threads, "cloth": "#%02x%02x%02x" % CLOTH,
             "render": {"width": cw, "height": ch, "originX": -Wmm / 2, "originY": -Hmm / 2, "pxPerMm": S}, "placement": {"x": round(ox, 2), "y": round(oy, 2), "iou": round(float(iou), 3)}}
    json.dump(stats, open(os.path.join(od, "stats.json"), "w"))
    print(f"{name}: {sc[0]} st, {len(blocks)} blocks, placement ({ox:.1f}, {oy:.1f}) iou {iou:.2f}")
