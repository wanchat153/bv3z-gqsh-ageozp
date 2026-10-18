#!/usr/bin/env python3
"""light.py — Python (numpy + scipy + Pillow) light pass of "The paper bird".
Per frame: out/lit (room + chars + bird, flat), out/bird (bird alone, black on white), out/real (real chars mask), out/info (bird position/height/scale).
1) paper shading on the bird only (edge darkening from the mask, soft top-light gradient, fibre grain),
2) a soft cast shadow of the bird on the floor (mask shifted to its ground point, squashed, blurred ~ height, fading with height; never over the characters),
3) warm daylight grade (top-left window light), vignette, grain.   usage: python3 light.py START END [src dst]"""
import sys, os, json, math
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
W, H = 1080, 1920
YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
def load_mask(p):
    a = np.asarray(Image.open(p).convert('RGB')).astype(np.float32) / 255
    return np.clip((1.0 - a.min(axis=2)) * 4.0, 0, 1)
_noise = np.random.default_rng(7).standard_normal((H, W)).astype(np.float32)
FIB = ndi.gaussian_filter(_noise, 0.8) * 0.7 + ndi.gaussian_filter(_noise, 3.0) * 1.6      # paper fibre
def frame(i, src='out', dst='out/frames'):
    I = json.load(open(f'{src}/info/f{i:04d}.json')); t = I['t']; B = I['bird']
    lit = np.asarray(Image.open(f'{src}/lit/f{i:04d}.png').convert('RGB')).astype(np.float32) / 255
    mb, mr = load_mask(f'{src}/bird/f{i:04d}.png'), load_mask(f'{src}/real/f{i:04d}.png')
    # ---- 1) paper shading on the bird
    if mb.max() > 0.01:
        inner = ndi.gaussian_filter(mb, 3.0); edge = np.clip(1 - inner * 1.0, 0, 1) * mb         # ~0 inside, up to 0.5 near the rim
        grad = 1.0 + 0.10 * np.clip((B['y'] - YY) / max(B['size'], 1), -1, 1)                   # lighter towards the top
        k = (1.0 - 0.38 * edge) * grad + 0.022 * FIB
        lit = lit * (1 - mb[..., None]) + np.clip(lit * k[..., None], 0, 1) * mb[..., None]
    # ---- 2) the bird's cast shadow on the floor
    hp = max(B['hpx'], 0.0); unit = I['unit']; hcm = hp / max(unit, 1)
    held = t < 4.3
    if mb.max() > 0.01 and not held:
        dx = 0.22 * hp                                                                           # light from the upper left: the shadow falls to the right of the ground point
        ys, xs = np.nonzero(mb > 0.3); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        crop = Image.fromarray((mb[y0:y1, x0:x1] * 255).astype(np.uint8)); sw, sh_ = crop.size
        nh = max(2, int(sh_ * 0.38)); crop = np.asarray(crop.resize((sw, nh), Image.BILINEAR)).astype(np.float32) / 255
        M = np.zeros((H, W), np.float32); cx = int(round((x0 + x1) / 2 + dx)); cy = int(round(B['groundY']))
        ya, xa = cy - nh // 2, cx - sw // 2
        yy0, yy1, xx0, xx1 = max(ya, 0), min(ya + nh, H), max(xa, 0), min(xa + sw, W)
        if yy1 > yy0 and xx1 > xx0: M[yy0:yy1, xx0:xx1] = crop[yy0 - ya:yy1 - ya, xx0 - xa:xx1 - xa]
        blur = 3.0 + 0.07 * hp
        sh = ndi.gaussian_filter(M, blur)
        amp = 0.55 / (1.0 + hcm / 25.0) + 0.08
        sh = sh * amp * (1 - ndi.gaussian_filter(mr, 1.2)) * (YY > I['wallY'] + 4)
        lit = lit * (1 - sh[..., None] * np.array([0.55, 0.62, 0.75], np.float32))
    # ---- 3) daylight grade + vignette + grain
    sunk = 1.0 + 0.06 * (1 - XX / W) * (1 - YY / H) - 0.0
    vg = 1 - 0.20 * (((XX - W / 2) / (W * 0.75)) ** 2 + ((YY - H * 0.45) / (H * 0.8)) ** 2)
    warm = np.array([1.03, 1.0, 0.94], np.float32)
    img = lit * (sunk * vg)[..., None] * warm
    img = img + np.random.default_rng(i).normal(0, 0.005, (H, W, 1)).astype(np.float32)
    os.makedirs(dst, exist_ok=True)
    Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)).save(f'{dst}/f{i:04d}.png')
if __name__ == '__main__':
    a, b = int(sys.argv[1]), int(sys.argv[2]); src = sys.argv[3] if len(sys.argv) > 3 else 'out'; dst = sys.argv[4] if len(sys.argv) > 4 else 'out/frames'
    for i in range(a, b): frame(i, src, dst)
