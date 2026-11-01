"""PNG (RGBA) renders in blender/_v2/ -> WebP with alpha in assets/renders/v2/ (quality 85).

    python tools/encode_v2.py
"""
import os

import numpy as np
from PIL import Image

EDGE = 0.09      # outer 9% of each side: the soft floor shadow fades to nothing, so no image edge shows
FLOOR = 3        # alpha at or below this (out of 255) is treated as empty floor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "blender", "_v2")
DST = os.path.join(ROOT, "assets", "renders", "v2")
os.makedirs(DST, exist_ok=True)
for name in ("keycap", "laptop", "phone_keyboard"):
    png = os.path.join(SRC, name + ".png")
    if not os.path.exists(png):
        print("missing", os.path.relpath(png, ROOT))
        continue
    im = Image.open(png).convert("RGBA")
    a = np.asarray(im).astype(np.float32)
    h, w = a.shape[:2]
    def ramp(n):
        x = np.minimum(np.arange(n), np.arange(n)[::-1]) / (EDGE * n)
        x = np.clip(x, 0, 1)
        return x * x * (3 - 2 * x)
    mask = np.outer(ramp(h), ramp(w))
    alpha = a[..., 3]
    alpha = np.where(alpha <= FLOOR, 0, alpha) * mask
    a[..., 3] = alpha
    a[..., :3] = np.where(alpha[..., None] == 0, 0, a[..., :3])
    im = Image.fromarray(a.round().astype(np.uint8), "RGBA")
    out = os.path.join(DST, name + ".webp")
    im.save(out, "WEBP", quality=85, method=6)
    print("wrote", os.path.relpath(out, ROOT), im.size, os.path.getsize(out) // 1024, "KB")
