# The goat's skin, reworked at its throat (17 October 2026). The throat was re-sculpted rounded,
# out to where the profile paintings draw it (build-goat-worker.mjs): its front stands 0.046 to
# 0.056 ahead of the neck's centre, where the painted fur stopped at 0.040 (and the paint's
# validity mask trims 2 px off any edge). In both profile paintings this carries the throat's fur
# forward over the background to 0.062: each row takes the painting's shadowed throat band from
# just behind the old outline (the painter darkened the throat toward it, in the jaw's shadow),
# replacing the old outline's last 2 px too, and the fill is smoothed down the rows.
#   python tools/goat-throat-fur.py <in.png> <out.png>
# (run on the sheet as generated: dist/assets/characters/lowpoly-proof/goat-worker-model-paint-v1.png
# before 17 October 2026, git show b5a47d6:<that path>; needs numpy and Pillow)
import sys
import numpy as np
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
pil = Image.open(src); mode = pil.mode
a = np.array(pil.convert("RGB")); H, W = a.shape[:2]
bg = a[5, 5].astype(np.int32)
dist = np.abs(a.astype(np.int32) - bg).sum(axis=2)          # 0 on the grey background
# the sheet's four registered views, as horse-model-paint.js projects them (frame 0.925 x 1.85, centre 0.825)
def u(view, across): return (view + across / .925 + .5) / 4 * W
def v(y): return (1 - ((y - .825) / 1.85 + .5)) * H
def yof(row): return .825 + ((1 - (row + .5) / H) - .5) * 1.85
def smooth(e0, e1, t):
    t = min(1., max(0., (t - e0) / (e1 - e0))); return t * t * (3 - 2 * t)
# the new outline: 0.062 down the throat, back to the old line at the scarf and under the jaw
def xnew(y): return .040 + .022 * smooth(1.276, 1.288, y) * (1 - smooth(1.334, 1.340, y))
mask = np.zeros((H, W), np.uint8)
for view, sgn in ((1, 1), (3, -1)):                       # left profile: across = x; right: -x
    for row in range(int(v(1.341)), int(v(1.274)) + 1):
        xn = xnew(yof(row))
        if xn <= .0405: continue
        x0 = int(round(u(view, 0.0))); xe = int(round(u(view, sgn * xn)))
        xo = None                                         # the old outline: the first background
        for x in range(x0, xe + sgn, sgn):
            if dist[row, x] < 60: xo = x; break
        if xo is None: continue
        for x in range(xo - 2 * sgn, xe + sgn, sgn):      # (with the old outline's last 2 px)
            if dist[row, x] < 60 or (x - xo) * sgn < 0: mask[row, x] = 1
# closed: a 3x3 dilation then erosion, so no row is left unfilled between its neighbours
def dilate(m): p = np.pad(m, 1); return np.max([p[i:i + H, j:j + W] for i in range(3) for j in range(3)], axis=0)
def erode(m): p = np.pad(m, 1, constant_values=1); return np.min([p[i:i + H, j:j + W] for i in range(3) for j in range(3)], axis=0)
mask = erode(dilate(mask))
img = a.astype(np.float32); base = img.copy()
ys, xs = np.nonzero(mask); rows = {}
for yy, xx in zip(ys, xs): rows.setdefault(yy, []).append(xx)
for yy, xs_ in rows.items():
    for sgn, part in ((1, [x for x in xs_ if x < W / 2]), (-1, [x for x in xs_ if x >= W / 2])):
        if not part: continue
        xo = min(part) if sgn == 1 else max(part)         # the first masked pixel in the row
        band = [xo - sgn * k for k in range(1, 5) if 0 <= xo - sgn * k < W]
        mean = img[yy, band].mean(axis=0)                 # the shadowed band's tone, with its own
        for xx in part:                                   # variation at half strength
            k = (xx - xo) * sgn
            base[yy, xx] = mean + .5 * (img[yy, band[k % len(band)]] - mean)
out = base.copy()
for yy, xx in zip(ys, xs):                                # smoothed down the rows
    acc = base[yy, xx] * 2; w = 2
    for dy in (-1, 1):
        if mask[yy + dy, xx]: acc = acc + base[yy + dy, xx]; w += 1
    out[yy, xx] = acc / w
res = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGB")
if mode == "RGBA": res.putalpha(pil.getchannel("A"))
res.save(dst)
print("filled", int(mask.sum()), "px:", dst)
