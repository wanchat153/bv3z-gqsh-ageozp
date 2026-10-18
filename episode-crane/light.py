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
        sh = np.maximum(sh, ndi.gaussian_filter(M, 1.5) * amp * 0.9 * (hcm < 6) * (1 - ndi.gaussian_filter(mr, 1.2)))   # crisp near contact
        lit = lit * (1 - sh[..., None] * np.array([0.55, 0.62, 0.75], np.float32))
    # ---- 3) scene light: moderate floor exposure, soft window-light patch with lattice, wall paper fibre, directional shading on the characters, contact shade, tone map
    z = I['zoom']; cx, cy = I['cam'][0], I['cam'][1]; wy = I['wallY']
    WX = (XX - 540) / z + cx; WYw = (YY - 960) / z + cy
    floor = (YY > wy + 3).astype(np.float32); wall = 1 - floor
    nonchar = 1 - ndi.gaussian_filter(mr, 1.5)
    depth = np.clip((YY - wy) / (H - wy), 0, 1)
    fl_gain = 0.88 + 0.07 * (1 - depth) - 0.05 * depth                                         # not blown out: darker, a gentle gradient (a bit lighter near the wall)
    # window-light patch on the floor: a soft parallelogram of sunlight cast through the shoji lattice (world coords)
    sx = WX + 0.55 * (WYw - 1380); sy = WYw
    patch = np.clip(1 - np.maximum(np.abs(sx - 300) / 330, np.abs(sy - 1560) / 330), 0, 1); patch = np.clip(patch * 3.0, 0, 1)
    lat = (np.abs(((sx - 300) % 165) - 82) > 76) | (np.abs(((sy - 1560) % 140) - 70) > 66)         # lattice bars throw thin shadows
    patch = ndi.gaussian_filter(patch * np.where(lat, 0.45, 1.0).astype(np.float32), 5)
    light_floor = fl_gain * (1 + 0.16 * patch) * (1 - 0.10 * np.clip((XX - W * 0.7) / (W * 0.3), 0, 1))
    wall_gain = 0.97 + 0.04 * np.clip(1 - XX / W, 0, 1) - 0.03 * np.clip((YY) / max(wy, 1), 0, 1)
    gain = np.where(floor > 0, light_floor, wall_gain).astype(np.float32)
    gain = 1 + (gain - 1) * np.where(floor > 0, nonchar, 1.0).astype(np.float32)               # the characters keep their own colour (they get their own shading below)
    lit = lit * gain[..., None]
    # wall paper fibre + faint vertical light streaks
    lit = lit * (1 + wall[..., None] * (0.018 * FIB[..., None] + 0.012 * np.sin((WX * 0.045)[..., None])))
    # characters: gentle directional light (rim on the upper-left edge, slightly darker lower-right), crisp contact shade at the feet
    if mr.max() > 0.01:
        g = ndi.gaussian_filter(mr, 5 * z / 1.85); sh = int(round(7 * z / 1.85))
        d = g - ndi.shift(g, [-sh, -sh], order=1, mode='nearest')                           # > 0 where the surface faces up-left
        k = 1 + 0.32 * np.clip(d * 2.2, -1, 1)
        rim = np.clip(mr - ndi.shift(mr, [sh, sh], order=1), 0, 1); rim = ndi.gaussian_filter(rim, 1.2)
        body = lit * k[..., None] + 0.10 * rim[..., None] * np.array([1.0, 0.92, 0.78], np.float32)
        lit = lit * (1 - mr[..., None]) + body * mr[..., None]
        ys = np.nonzero(mr.max(axis=1) > 0.3)[0]; foot = ys.max()
        band = ((YY > foot - 34 * z / 1.85) & (YY <= foot + 20 * z / 1.85)).astype(np.float32)
        cs = ndi.gaussian_filter(ndi.shift(mr, [6 * z / 1.85, 3 * z / 1.85], order=1), 3.0) * band * nonchar * floor
        lit = lit * (1 - 0.30 * cs[..., None] * np.array([0.7, 0.75, 0.85], np.float32))
    vg = 1 - 0.18 * (((XX - W / 2) / (W * 0.75)) ** 2 + ((YY - H * 0.45) / (H * 0.8)) ** 2)
    img = lit * vg[..., None] * np.array([1.02, 1.0, 0.95], np.float32)
    img = np.where(img < 0.82, img, 0.82 + 0.18 * np.tanh((img - 0.82) / 0.18))                 # soft shoulder: no clipped highlights
    img = img + np.random.default_rng(i).normal(0, 0.005, (H, W, 1)).astype(np.float32)
    os.makedirs(dst, exist_ok=True)
    Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)).save(f'{dst}/f{i:04d}.png')
if __name__ == '__main__':
    a, b = int(sys.argv[1]), int(sys.argv[2]); src = sys.argv[3] if len(sys.argv) > 3 else 'out'; dst = sys.argv[4] if len(sys.argv) > 4 else 'out/frames'
    for i in range(a, b): frame(i, src, dst)
