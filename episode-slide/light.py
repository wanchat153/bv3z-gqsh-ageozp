#!/usr/bin/env python3
"""light.py — Python (numpy+scipy+Pillow) light pass of "สไลเดอร์": warm afternoon sun from the upper right, long soft ground shadows of both characters (sheared silhouette flipped about the sand line;
crisp at the feet, soft far away), rim light on the sun side, cool shade on the other, sand dust puffs at every landing/bump (rebuilt from out/tab.json), vignette, filmic knee, grain.
usage: python3 light.py START END [src] [dst]"""
import sys, os, json, math
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
W, H = 1080, 1920
YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
TAB = None
def tab():
    global TAB
    if TAB is None: TAB = json.load(open('out/tab.json'))
    return TAB
def mask(p):
    a = np.asarray(Image.open(p).convert('RGB')).astype(np.float32) / 255
    m = np.clip((1.0 - a.min(axis=2)) * 4.0, 0, 1); return np.maximum(m, ndi.binary_fill_holes(m > 0.5).astype(np.float32))
def shadow(m, foot, shear=0.5, e=0.55, maxlen=1.0):
    d = YY - foot; ok = (d > 0)
    hgt = d / e; ys = np.clip(foot - hgt, 0, H - 1); xs = np.clip(XX + hgt * shear, 0, W - 1)
    v = ndi.map_coordinates(m, [ys, xs], order=1) * ok
    return v * np.clip(1 - hgt / 900.0, 0, 1)
def dust(t):
    out = np.zeros((H, W), np.float32); T = tab(); u = T['unit']
    for k, (t0, x, y, s) in enumerate(T['puffs']):
        age = t - t0
        if age < 0 or age > 1.0: continue
        for j in range(14):
            r0 = np.random.default_rng(k * 31 + j).random(4); sgn = -1 if j % 2 else 1
            vx = sgn * (30 + 110 * r0[0]) * math.sqrt(s) * (1 - math.exp(-age * 6)) / 6; bx = x + sgn * (10 + 70 * r0[0] * math.sqrt(s)) * (1 - math.exp(-age * 4.5)) + 14 * (r0[1] - 0.5)
            by = y - 6 - (10 + 40 * r0[2]) * age * math.sqrt(s) - 6 * r0[3]
            r = (14 + 62 * age ** 0.55) * (0.6 + 0.9 * s) * (0.7 + 0.6 * r0[1]); a = 0.62 * s ** 0.6 * math.exp(-age * 3.0) * (1 - math.exp(-age * 28))
            R = int(r * 3); x0, x1, y0, y1 = max(0, int(bx) - R), min(W, int(bx) + R), max(0, int(by) - R), min(H, int(by) + R)
            if x1 <= x0 or y1 <= y0: continue
            g = np.exp(-(((XX[y0:y1, x0:x1] - bx) ** 2 + ((YY[y0:y1, x0:x1] - by) / 0.8) ** 2) / (2 * (r * 0.55) ** 2)))
            out[y0:y1, x0:x1] = 1 - (1 - out[y0:y1, x0:x1]) * (1 - a * g)
    return out
def frame(i, src='out', dst='out/frames'):
    I = json.load(open(f'{src}/info/f{i:04d}.json')); t = I['t']
    lit = np.asarray(Image.open(f'{src}/lit/f{i:04d}.png').convert('RGB')).astype(np.float32) / 255
    mS, mM, mR = mask(f'{src}/realS/f{i:04d}.png'), mask(f'{src}/realM/f{i:04d}.png'), mask(f'{src}/real/f{i:04d}.png')
    hz = I['horizon']; ground = np.clip((YY - hz) / 40.0, 0, 1)
    side = np.clip((XX - 150) / 800.0, 0, 1)[..., None]
    warm = np.array([1.04, 0.97, 0.86], np.float32); cool = np.array([0.90, 0.94, 1.04], np.float32)
    L = cool * (1 - side) + warm * side
    lw = np.clip(np.maximum(ground, ndi.gaussian_filter(mR, 2.0)), 0, 1)[..., None]
    img = lit * (1 + (L - 1) * 0.65 * lw)
    # ground shadows (sun upper right -> shadow falls left and toward the camera)
    sh = np.maximum(shadow(mS, I['samG']), shadow(mM, I['mocG']))
    sharp, soft = ndi.gaussian_filter(sh, 2.5), ndi.gaussian_filter(sh, 15)
    wm = np.clip((YY - (min(I['samG'], I['mocG']) + 6)) / 300.0, 0, 1); sh = (1 - wm) * sharp + wm * soft
    sh = sh * (1 - ndi.gaussian_filter(mR, 1.2))
    img = img * (1 - 0.30 * sh * ground)[..., None] * np.array([0.97, 0.98, 1.04], np.float32)
    # rim light (sun side = right/top) + cooler far side on the characters
    mb = ndi.gaussian_filter(mR, 11.0); gx, gy = ndi.sobel(mb, axis=1) / 8.0, ndi.sobel(mb, axis=0) / 8.0
    gl = np.sqrt(gx * gx + gy * gy) + 1e-6; nx, ny = -gx / gl, -gy / gl; ndl = np.clip(nx * 0.85 + ny * (-0.5), -1, 1)
    inside = np.clip((ndi.gaussian_filter(mR, 3.0) - 0.45) * 4, 0, 1); edge = np.clip(gl * 14.0, 0, 1)
    rim, far = np.clip(ndl, 0, 1) * edge * inside, np.clip(-ndl, 0, 1) * edge * inside
    img = img + 0.40 * rim[..., None] * np.array([1.0, 0.82, 0.55], np.float32); img = img * (1 - 0.13 * far)[..., None]
    # dust puffs (in front of the slide, behind nothing: sand colour, soft)
    D = dust(t); img = img * (1 - 0.8 * D[..., None]) + 0.8 * D[..., None] * np.array([0.98, 0.93, 0.82], np.float32)
    vg = 1 - 0.22 * np.clip(((XX - 540) / 780.0) ** 2 + ((YY - 960) / 1300.0) ** 2, 0, 1); img = img * vg[..., None]
    img = np.where(img < 0.80, img, 0.80 + 0.20 * (1 - np.exp(-(img - 0.80) / 0.20)))
    img = img + np.random.default_rng(i).normal(0, 0.005, (H, W, 1)).astype(np.float32)
    os.makedirs(dst, exist_ok=True); Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)).save(f'{dst}/f{i:04d}.png')
if __name__ == '__main__':
    a, b = int(sys.argv[1]), int(sys.argv[2]); src = sys.argv[3] if len(sys.argv) > 3 else 'out'; dst = sys.argv[4] if len(sys.argv) > 4 else 'out/frames'
    for i in range(a, b): frame(i, src, dst)
