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
    sh = 0.5 * ndi.gaussian_filter(sh, 5.0) + 0.5 * ndi.gaussian_filter(sh, 15.0)         # penumbra: the lamp is a flame with a size
    real_soft = ndi.gaussian_filter(mr, 1.2)
    sh = sh * (1 - real_soft)                                                              # the wall shadow never darkens the real characters
    d = np.sqrt((XX - lx) ** 2 + (YY - ly) ** 2)
    lamp_term = (1.0 * fl / (1.0 + (d / 760.0) ** 2))[..., None] * WARM * (1 - 0.88 * sh)[..., None]
    L = AMB * 0.62 + lamp_term
    img = lit * L
    # lantern: glowing paper (emissive) + bloom
    ln = I['lant']; bx = (np.abs(XX - ln['x']) < ln['hw']) & (np.abs(YY - ln['y']) < ln['h'] * 0.42)
    glow = np.exp(-(((XX - ln['x']) / (ln['hw'] * 1.3)) ** 2 + ((YY - ln['y']) / (ln['h'] * 0.62)) ** 2)) * fl
    img = img + (0.0 + 0.5 * bx * fl)[..., None] * np.array([1.0, 0.80, 0.45], np.float32) + 0.22 * ndi.gaussian_filter(glow, 30)[..., None] * WARM
    img = np.where(img < 0.8, img, 0.8 + 0.2 * (1 - np.exp(-(img - 0.8) / 0.2)))
    img = img + np.random.default_rng(i).normal(0, 0.006, (H, W, 1)).astype(np.float32)
    os.makedirs(dst, exist_ok=True)
    Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)).save(f'{dst}/f{i:04d}.png')
if __name__ == '__main__':
    a, b = int(sys.argv[1]), int(sys.argv[2]); src = sys.argv[3] if len(sys.argv) > 3 else 'out'; dst = sys.argv[4] if len(sys.argv) > 4 else 'out/frames'
    for i in range(a, b): frame(i, src, dst)
