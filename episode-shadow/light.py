#!/usr/bin/env python3
"""light.py — the Python (numpy + scipy + Pillow) light pass of "The shadow that won't sit still".
Per frame it reads out/lit (room + real chars, no light), out/sam + out/cat (the SHADOW characters, black on white), out/real (real chars mask), out/info (lamp, wall, scale).
Geometry: ONE point light (the paper lantern flame on the floor in front). Every output pixel of the wall (plane q=wallQ) or of the floor behind the characters is traced back
through the lamp to the character plane -> the shadow of an (independently animated) silhouette, exactly projected (scale K on the wall, stretched along the floor).
Then: warm lamp falloff + moon-blue ambient, soft penumbra (two blurs), lantern glow, tone curve, grain.   usage: python3 light.py START END -> out/frames/fNNNN.png"""
import sys, os, json, math
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
W, H = 1080, 1920
YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
WARM = np.array([1.0, 0.78, 0.46], np.float32); AMB = np.array([0.30, 0.36, 0.55], np.float32)
def flicker(t):
    return 1 + 0.045 * math.sin(2 * math.pi * 9.7 * t) + 0.03 * math.sin(2 * math.pi * 15.3 * t + 1.3) + 0.02 * math.sin(2 * math.pi * 4.1 * t + 0.4)
def load_mask(p, fill=True):
    a = np.asarray(Image.open(p).convert('RGB')).astype(np.float32) / 255
    m = np.clip((1.0 - a.min(axis=2)) * 4.0, 0, 1)
    if fill: m = np.maximum(m, ndi.binary_fill_holes(m > 0.5).astype(np.float32))
    return m
_grid = {}
def project(mask, foot, I, lampx):
    """shadow coverage (0..1) at every output pixel, rows 0..foot."""
    K, qw, ql, qc, zq, unit, wallY, y0 = I['K'], I['qw'], I['ql'], I['qs'] if foot == I['footS'] else I['qc'], I['zq'], I['unit'], I['wallY'], I['y0']
    key = (round(foot), round(lampx))
    if key not in _grid:
        rows = np.arange(0, int(foot) + 1, dtype=np.float32)[:, None] * np.ones((1, W), np.float32); cols = XX[:rows.shape[0]]
        sx = np.zeros_like(rows); sy = np.zeros_like(rows); ok = np.zeros(rows.shape, bool)
        # wall rows
        hp_ = I['lamp_h'] + ((wallY - rows) / unit - I['lamp_h']) / K
        wl = rows <= wallY
        sx = np.where(wl, lampx + (cols - lampx) / K, sx); sy = np.where(wl, foot - hp_ * unit, sy); ok = wl.copy()
        # floor rows between the wall and the characters: q from the screen row
        q = (rows - y0) / zq
        s = (ql - q) / (ql - qc)
        fl = (~wl) & (s >= 1.0) & (q <= qc)
        hpf = I['lamp_h'] * (1 - 1.0 / np.maximum(s, 1e-3))
        sx = np.where(fl, lampx + (cols - lampx) / np.maximum(s, 1e-3), sx); sy = np.where(fl, foot - hpf * unit, sy); ok = ok | fl
        _grid[key] = (sx, sy, ok)
    sx, sy, ok = _grid[key]
    out = ndi.map_coordinates(mask, [sy, sx], order=1, mode='constant', cval=0.0) * ok
    full = np.zeros((H, W), np.float32); full[:out.shape[0]] = out
    return full
def frame(i, src='out', dst='out/frames'):
    I = json.load(open(f'{src}/info/f{i:04d}.json')); t = I['t']; I['lamp_h'] = 7.0
    lit = np.asarray(Image.open(f'{src}/lit/f{i:04d}.png').convert('RGB')).astype(np.float32) / 255
    lamp = I['lamp']; fl = flicker(t); lx, ly = lamp['x'] + 2.0 * math.sin(t * 17.0), lamp['y'] + 1.5 * math.sin(t * 13.0)
    ms, mc, mr = load_mask(f'{src}/sam/f{i:04d}.png'), load_mask(f'{src}/cat/f{i:04d}.png'), load_mask(f'{src}/real/f{i:04d}.png')
    sh = np.maximum(project(ms, I['footS'], I, lx), project(mc, I['footC'], I, lx))
    # penumbra grows with the distance from the contact: crisp near the feet, soft high on the wall / far along the floor
    sharp, soft = ndi.gaussian_filter(sh, 2.2), ndi.gaussian_filter(sh, 20.0)
    wmap = np.clip((I['footC'] + 20 - YY) / 560.0, 0.08, 1.0)
    sh = (1 - wmap) * sharp + wmap * soft
    real_soft = ndi.gaussian_filter(mr, 1.2)
    sh = sh * (1 - real_soft)                                                              # the wall shadow never darkens the real characters
    dark = 0.93 - 0.14 * wmap                                                              # core darkness: deep near contact, lighter far away
    d = np.sqrt((XX - lx) ** 2 + (YY - ly) ** 2)
    on_floor = (YY > I['wallY']).astype(np.float32)
    fall = fl / (1.0 + (d / 700.0) ** 2)
    fall = np.where(on_floor > 0, np.minimum(fall, 0.72) * 0.92 + 0.0, fall * 1.05)       # the floor must not blow out: keep the wood grain
    lamp_term = (0.95 * fall)[..., None] * WARM * (1 - dark * sh)[..., None]
    L = AMB * (0.62 + 0.18 * np.clip(1 - d / 1600.0, 0, 1))[..., None] + lamp_term
    img = lit * L
    # soft wide bounce light from the lamp on the lower wall + faint paper unevenness
    paper = ndi.gaussian_filter(np.random.default_rng(3).normal(0, 1, (H // 8, W // 8)).astype(np.float32), 3.0)
    paper = np.kron(paper, np.ones((8, 8), np.float32))[:H, :W]
    img = img * (1 + 0.035 * paper[..., None] * (1 - on_floor)[..., None])
    # directional shading on the REAL characters: warm rim on the side that faces the lamp, a cooler darker far side
    mb = ndi.gaussian_filter(mr, 14.0); gx, gy = ndi.sobel(mb, axis=1) / 8.0, ndi.sobel(mb, axis=0) / 8.0
    gl = np.sqrt(gx * gx + gy * gy) + 1e-6; nx, ny = -gx / gl, -gy / gl                     # outward normal
    lxv, lyv = (lx - XX), (ly - YY); ll = np.sqrt(lxv ** 2 + lyv ** 2) + 1e-6; lxv, lyv = lxv / ll, lyv / ll
    ndl = np.clip(nx * lxv + ny * lyv, -1, 1)
    inside = np.clip((ndi.gaussian_filter(mr, 3.0) - 0.45) * 4, 0, 1); edge = np.clip(gl * 14.0, 0, 1)
    rim = np.clip(ndl, 0, 1) * edge * inside; far = np.clip(-ndl, 0, 1) * edge * inside
    img = img + 0.38 * (rim * fl)[..., None] * np.array([1.0, 0.72, 0.38], np.float32)
    img = img * (1 - 0.16 * far)[..., None] * np.array([1.0, 1.0, 1.04], np.float32)[None, None, :]
    # lantern: glowing paper with a soft falloff to the wooden frame, lattice kept, leak of light along the frame, warm bloom
    ln = I['lant']; ax = np.abs(XX - ln['x']) / ln['hw']; ay = np.abs(YY - ln['y']) / (ln['h'] * 0.42)
    bx = ((ax < 1) & (ay < 1)).astype(np.float32)
    pan = (0.62 + 0.38 * np.cos(np.clip(ax, 0, 1) * 1.2)) * (0.85 + 0.15 * np.cos(np.clip(ay, 0, 1) * 1.4))
    glow = np.exp(-(((XX - ln['x']) / (ln['hw'] * 1.25)) ** 2 + ((YY - ln['y']) / (ln['h'] * 0.6)) ** 2)) * fl
    leak = np.exp(-np.clip(np.maximum(ax, ay) - 1.0, 0, 5) * 5.0) * (np.maximum(ax, ay) >= 1.0) * 0.28
    img = img + (0.38 * pan * bx * fl)[..., None] * np.array([1.0, 0.78, 0.42], np.float32) + (0.55 * leak * fl)[..., None] * WARM \
        + 0.12 * ndi.gaussian_filter(glow, 38)[..., None] * WARM
    # vignette + a filmic knee so nothing clips flat
    vg = 1 - 0.28 * np.clip(((XX - 540) / 760.0) ** 2 + ((YY - 900) / 1250.0) ** 2, 0, 1)
    img = img * vg[..., None]
    img = np.where(img < 0.72, img, 0.72 + 0.28 * (1 - np.exp(-(img - 0.72) / 0.28)))
    img = img + np.random.default_rng(i).normal(0, 0.006, (H, W, 1)).astype(np.float32)
    os.makedirs(dst, exist_ok=True)
    Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)).save(f'{dst}/f{i:04d}.png')
if __name__ == '__main__':
    a, b = int(sys.argv[1]), int(sys.argv[2]); src = sys.argv[3] if len(sys.argv) > 3 else 'out'; dst = sys.argv[4] if len(sys.argv) > 4 else 'out/frames'
    for i in range(a, b): frame(i, src, dst)
