#!/usr/bin/env python3
"""Side-by-side for one Simulator case: TRUE screenshot | CAPTURE | DIFFERENCE.

    python3 -I compare.py <true.png> <capture.jpg> <out-side.png> [label]

The capture covers only the web page (the visual viewport); the Simulator screenshot is the whole
screen at 3x. The capture is scaled to the screen's width and slid vertically to the best-matching
offset (the page sits below Safari's status bar, or fills the screen in the home-screen app). The
printed numbers are over the overlapping area only: mean absolute difference per channel (0-255) and
the share of pixels differing by more than 40.  Requires Pillow.
"""
import json
import sys

from PIL import Image, ImageChops, ImageDraw, ImageOps

true_p, cap_p, out_p = sys.argv[1:4]
label = sys.argv[4] if len(sys.argv) > 4 else ""
T = Image.open(true_p).convert("RGB")
C = Image.open(cap_p).convert("RGB")
scale = T.width / C.width
C = C.resize((T.width, round(C.height * scale)), Image.LANCZOS)

# Find the vertical offset on small greyscale copies.
k = 6
ts = ImageOps.grayscale(T).resize((T.width // k, T.height // k))
cs = ImageOps.grayscale(C).resize((C.width // k, C.height // k))
best = (1e18, 0)
for y in range(0, max(1, ts.height - cs.height + 1)):
    region = ts.crop((0, y, cs.width, y + cs.height))
    d = ImageChops.difference(region, cs)
    s = sum(i * n for i, n in enumerate(d.histogram()))
    if s < best[0]:
        best = (s, y)
off = best[1] * k

tc = T.crop((0, off, T.width, off + C.height))
diff = ImageChops.difference(tc, C)
g = ImageOps.grayscale(diff)
hist = g.histogram()
n = tc.width * tc.height
mean = sum(i * c for i, c in enumerate(hist)) / n
big = sum(hist[41:]) / n * 100

# Visual difference: white = same, red = differs by >40.
mask = g.point(lambda v: 255 if v > 40 else 0)
vis = Image.new("RGB", tc.size, (255, 255, 255))
soft = ImageOps.invert(g.point(lambda v: min(255, v * 3))).convert("RGB")
vis = Image.composite(Image.new("RGB", tc.size, (230, 0, 0)), soft, mask)

pad, top = 30, 70
W = T.width * 3 + pad * 4
H = T.height + top + pad
side = Image.new("RGB", (W, H), (34, 34, 34))
d = ImageDraw.Draw(side)
side.paste(T, (pad, top))
capcol = Image.new("RGB", T.size, (90, 90, 90))
capcol.paste(C, (0, off))
side.paste(capcol, (pad * 2 + T.width, top))
diffcol = Image.new("RGB", T.size, (90, 90, 90))
diffcol.paste(vis, (0, off))
side.paste(diffcol, (pad * 3 + T.width * 2, top))
for i, t in enumerate(["TRUE (Simulator screenshot)", "CAPTURE (in-page render)", f"DIFF mean {mean:.1f}/255, {big:.1f}% px >40"]):
    d.text((pad + i * (T.width + pad), 20), f"{label}  {t}", fill=(255, 255, 255), font_size=36)
side.thumbnail((2400, 2400))
side.save(out_p)
print(json.dumps({"offsetPx": off, "meanDiff": round(mean, 2), "pctPixelsOff": round(big, 2), "out": out_p}))
