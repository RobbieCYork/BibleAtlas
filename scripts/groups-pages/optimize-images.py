#!/usr/bin/env python3
"""Optimises the Capstone Plus for Groups illustrations into public/groups/img/.

    python3 scripts/groups-pages/optimize-images.py [sourceDir]

sourceDir defaults to the project's approved originals
(automation/manager/groups-promo/images, one level above this repo). The 1.4-1.7 MB PNG originals
are NOT committed; only the generated AVIF and WebP renditions are, so a normal build needs no
image toolchain. Re-run this only when an illustration changes.

Heroes (1672x941): 480 / 800 / 1600 wide.  Features (1254x1254): 480 / 960 wide.
og-groups: scaled to 1200 wide, centre-right crop to 1200x630, JPEG (crawlers handle JPEG
everywhere; WebP/AVIF in og:image is patchy).
school-feature-3 has a thin dark strip along the bottom edge (image-brief.md): 2% is cropped.
"""
import os, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
DEFAULT_SRC = os.path.abspath(os.path.join(REPO, "..", "automation", "manager", "groups-promo", "images"))
SRC = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC
OUT = os.path.join(REPO, "public", "groups", "img")
os.makedirs(OUT, exist_ok=True)

HERO = [480, 800, 1600]
FEATURE = [480, 960]
CROP_BOTTOM = {"school-feature-3-essay-feedback": 0.02}

total = 0
for fn in sorted(os.listdir(SRC)):
    if not fn.endswith(".png"):
        continue
    name = fn[:-4]
    im = Image.open(os.path.join(SRC, fn)).convert("RGB")
    if name == "og-groups":
        w, h = im.size
        nh = round(h * 1200 / w)  # 675
        im = im.resize((1200, nh), Image.LANCZOS)
        top = (nh - 630) // 2
        im.crop((0, top, 1200, top + 630)).save(os.path.join(OUT, "og-groups.jpg"), "JPEG", quality=84, optimize=True, progressive=True)
        continue
    if name in CROP_BOTTOM:
        w, h = im.size
        im = im.crop((0, 0, w, round(h * (1 - CROP_BOTTOM[name]))))
    widths = HERO if "hero" in name else FEATURE
    for w in widths:
        h = round(im.height * w / im.width)
        r = im.resize((w, h), Image.LANCZOS)
        r.save(os.path.join(OUT, f"{name}-{w}.webp"), "WEBP", quality=80, method=6)
        r.save(os.path.join(OUT, f"{name}-{w}.avif"), "AVIF", quality=55, speed=4)
        # record intrinsic sizes for the renderer
    print(name, im.size)
for f in sorted(os.listdir(OUT)):
    total += os.path.getsize(os.path.join(OUT, f))
print(f"{len(os.listdir(OUT))} files, {total/1024:.0f} KB")
