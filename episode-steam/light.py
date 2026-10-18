#!/usr/bin/env python3
"""light.py — Python (numpy+scipy+Pillow) pass of "กาน้ำเดือดไอน้ำหรรษา": deterministic particle steam (rebuilt from the 240 Hz table for every frame),
the CAT-SHAPED cloud (Mochi's silhouette from out/catmask.png, domain-warped by noise), coal glow, dawn light (warm sun from the right, cool sky fill, rim light, long soft ground shadows), vignette, filmic knee.
usage: python3 light.py START END [src] [dst]"""
import sys, os, json, math
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
W, H = 1080, 1920
YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
TAB = None; CAT = None
def tab():
    global TAB
    if TAB is None:
        TAB = json.load(open('out/tab.json')); rng = np.random.default_rng(11); n = len(TAB['sp'])
        TAB['R'] = rng.random((n, 8)).astype(np.float32)
        for k in ('sp', 'vt'): TAB[k] = np.array(TAB[k], np.float32)
        for k in ('em', 'vn', 'wh'): TAB[k] = np.array(TAB[k], np.float32)
    return TAB
def sstep(x): x = np.clip(x, 0, 1); return x * x * (3 - 2 * x)
SWATS = [2.63, 7.05]
def particles(t, src):
    """positions (x,y), radius, weight of every steam particle alive at time t."""
    T = tab(); hz = T['hz']; k1 = int(t * hz); k0 = max(0, int((t - 4.5) * hz)); ks = np.arange(k0, k1 + 1); out = []
    for kind in ('sp', 'vt'):
        R = T['R'][ks]; tb = ks / hz; tau = (t - tb).astype(np.float32)
        wgt = (T['em'][ks] if kind == 'sp' else T['vn'][ks] * 0.8).astype(np.float32)
        base = T[kind][ks].copy()
        if kind == 'sp':
            ang = -0.85 + 0.35 * (R[:, 0] - 0.5); v0 = (40 + 110 * np.sqrt(wgt)) * (0.8 + 0.4 * R[:, 1]); td = 0.28
            dist = v0 * td * (1 - np.exp(-tau / td)); x = base[:, 0] + np.cos(ang) * dist; y = base[:, 1] + np.sin(ang) * dist
            r0, lam = 5.0, 1.0 * (0.8 + 0.4 * R[:, 2])
        else:
            ang = -1.57 + 0.6 * (R[:, 0] - 0.5); v0 = (30 + 90 * wgt) * (0.7 + 0.6 * R[:, 1]); td = 0.35
            dist = v0 * td * (1 - np.exp(-tau / td)); x = base[:, 0] + np.cos(ang) * dist; y = base[:, 1] + np.sin(ang) * dist
            r0, lam = 9.0, 1.3
        sw_a = 5 + 16 * tau * (0.5 + R[:, 3]); ph = 6.283 * R[:, 4]; fr = 0.55 + 0.7 * R[:, 5]
        x = x + sw_a * np.sin(6.283 * fr * tau + ph) + 16 * tau + 6 * tau * tau
        y = y - 40 * tau - 9 * tau * tau + 0.35 * sw_a * np.sin(6.283 * fr * 1.3 * tau + ph * 1.7)
        # a paw swat bends everything that is in the air near the kettle: a push left + a curl, decaying
        for ts in SWATS:
            if t > ts:
                age_s = ts - tb; alive = (age_s > 0.05) & (age_s < 3.0)
                e = (1 - np.exp(-(t - ts) / 0.3)) * np.exp(-(t - ts) / 1.2) * alive * np.exp(-((age_s - 0.7) / 1.0) ** 2)
                x = x - 70 * e; y = y - 14 * e + 18 * e * np.sin(6.283 * (t - ts) * 1.4 + ph)
        life = sstep(tau / 0.10) * np.exp(-tau / lam) * sstep((4.4 - tau) / 0.8)
        r = r0 + 9 * np.power(np.maximum(tau, 0), 0.8) * (0.7 + 0.6 * R[:, 6])
        out.append((x, y, r, wgt * life))
    return [np.concatenate(z) for z in zip(*out)]
SIG = [2.5, 5.0, 8.5, 13.0, 19.0, 28.0]
def steam_density(t, src):
    x, y, r, w = particles(t, src); keep = w > 1e-3; x, y, r, w = x[keep], y[keep], r[keep] / 2, w[keep]
    Hh, Wh = H // 2, W // 2; D = np.zeros((Hh, Wh), np.float32); xi, yi = np.round(x / 2).astype(int), np.round(y / 2).astype(int)
    ok = (xi >= -40) & (xi < Wh + 40) & (yi >= -40) & (yi < Hh + 40); xi, yi, r, w = xi[ok], yi[ok], r[ok], w[ok]
    b = np.clip(np.searchsorted(SIG, r), 0, len(SIG) - 1)
    pad = 40
    for bi, s in enumerate(SIG):
        m = b == bi
        if not m.any(): continue
        G = np.zeros((Hh + 2 * pad, Wh + 2 * pad), np.float32); np.add.at(G, (yi[m] + pad, xi[m] + pad), w[m])
        D += ndi.gaussian_filter(G, s)[pad:-pad, pad:-pad] * (2 * math.pi * s * s) * 0.062
    return np.asarray(Image.fromarray(D).resize((W, H), Image.BICUBIC), np.float32)
def fbm(shape, seed, scale):
    rng = np.random.default_rng(seed); out = np.zeros(shape, np.float32); amp = 1.0; tot = 0
    for o in range(4):
        n = rng.normal(0, 1, (int(shape[0] / scale * 2 ** o) + 3, int(shape[1] / scale * 2 ** o) + 3)).astype(np.float32)
        out += amp * ndi.zoom(n, (shape[0] / (n.shape[0] - 3), shape[1] / (n.shape[1] - 3)), order=3)[:shape[0], :shape[1]]; tot += amp; amp *= 0.5
    return out / tot
TEX = None
def texture(t):
    global TEX
    if TEX is None: TEX = fbm((H * 2, W + 200), 21, 26)
    oy = int(t * 38) % H; ox = int(60 + 10 * math.sin(t * 0.7))
    return 0.72 + 0.7 * np.clip(TEX[oy:oy + H, ox:ox + W] * 1.6 + 0.35, 0, 1.2)
def cat_mask():
    global CAT
    if CAT is None:
        a = np.asarray(Image.open('out/catmask.png').convert('RGB')).astype(np.float32) / 255
        m = np.clip((1.0 - a.min(axis=2)) * 4.0, 0, 1); m = np.maximum(m, ndi.binary_fill_holes(m > 0.5).astype(np.float32))
        ys, xs = np.where(m > 0.5); m = m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        CAT = (m, ndi.gaussian_filter(m, 3))
    return CAT
NOISE = None
def cloud_alpha(C, t):
    """the steam cloud shaped like Mochi: silhouette scaled to C['s'] px wide at (x,y), edges eaten by noise (dissolve d), shape wobbling by low-frequency warp."""
    global NOISE
    if C['a'] < 0.01: return np.zeros((H, W), np.float32)
    if NOISE is None: NOISE = (fbm((H, W), 5, 90), fbm((H, W), 6, 90), fbm((H, W), 7, 24))
    m, _ = cat_mask(); sc = C['s'] / m.shape[1]; hh, ww = m.shape[0] * sc, m.shape[1] * sc
    # warp: sample the silhouette at (x + wx, y + wy)
    amp = (10 + 55 * C['d']) * (C['s'] / 300.0)
    wx, wy = NOISE[0] * amp + 6 * math.sin(t * 5.1), NOISE[1] * amp + 6 * math.cos(t * 4.3)
    x0, y0 = C['x'] - ww / 2, C['y'] - hh / 2
    sx = (XX + wx - x0) / sc; sy = (YY + wy - y0) / sc
    box = (XX > x0 - 160) & (XX < x0 + ww + 160) & (YY > y0 - 160) & (YY < y0 + hh + 160)
    v = ndi.map_coordinates(m, [np.clip(sy, 0, m.shape[0] - 1), np.clip(sx, 0, m.shape[1] - 1)], order=1, mode='constant') * ((sx >= 0) & (sx < m.shape[1]) & (sy >= 0) & (sy < m.shape[0]))
    v = ndi.gaussian_filter(v * box, 5 + 0.02 * C['s'])
    n = NOISE[2] * 0.8 + NOISE[0] * 0.4
    dens = np.clip(v * (0.95 + 0.25 * n) - C["d"] * (0.30 + 0.45 * (n * 0.5 + 0.5)), 0, 1.3)
    return np.clip(dens * 1.5, 0, 1) * C['a']
def frame(i, src='out', dst='out/frames'):
    I = json.load(open(f'{src}/info/f{i:04d}.json')); t = I['t']
    lit = np.asarray(Image.open(f'{src}/lit/f{i:04d}.png').convert('RGB')).astype(np.float32) / 255
    real = np.asarray(Image.open(f'{src}/real/f{i:04d}.png').convert('RGB')).astype(np.float32) / 255
    mr = np.clip((1.0 - real.min(axis=2)) * 4.0, 0, 1); mr = np.maximum(mr, ndi.binary_fill_holes(mr > 0.5).astype(np.float32))   # characters (the 'real' layer is on white)
    wallY = I['wallY']; ground = (YY > wallY).astype(np.float32)
    # ---- light: warm low sun from the right (behind), cool sky fill. Floor kept mid-tone so the stone texture survives.
    warm = np.array([1.0, 0.80, 0.62], np.float32); cool = np.array([0.74, 0.78, 0.98], np.float32)
    side = np.clip((XX - 200) / 900.0, 0, 1)[..., None]
    L = (cool * (1 - side) + warm * side) * (0.86 + 0.12 * np.clip((YY - 900) / 900, 0, 1))[..., None] * 0.97
    L = L * (1 - ground[..., None] * 0.1 * np.clip((YY - wallY) / 520, 0, 1)[..., None])
    ys_, xs_ = I['knob'][1], I['knob'][0]
    kbox = ((XX > xs_ - 150) & (XX < xs_ + 190) & (YY > ys_ - 60)).astype(np.float32)
    lw = np.clip(np.maximum.reduce([ground, ndi.gaussian_filter(mr, 2.0)]), 0, 1)[..., None]
    img = lit * (L * lw + (1 - lw) * np.array([0.97, 0.97, 1.0], np.float32))
    # long soft ground shadows (sun behind-right, low): sheared + flipped silhouette, crisp at the feet and soft far away
    sh = np.zeros((H, W), np.float32)
    for foot, xa, xb in ((I['footS'], 0, 570), (I['footC'], 570, W)):
        d = YY - foot; ok = (d > 0) & (XX >= xa - 200) & (XX < xb + 220)
        ys = np.clip(foot - d * 1.15, 0, H - 1); xs = np.clip(XX + d * 0.62, 0, W - 1)
        v = ndi.map_coordinates(mr * ((np.arange(W)[None, :] >= xa) & (np.arange(W)[None, :] < xb)), [ys, xs], order=1) * ok
        sh = np.maximum(sh, v * np.clip(1 - d / 520, 0, 1))
    sharp, soft = ndi.gaussian_filter(sh, 2.5), ndi.gaussian_filter(sh, 16)
    wm = np.clip((YY - (I['footC'] + 8)) / 260, 0, 1); sh = (1 - wm) * sharp + wm * soft
    sh = sh * (1 - ndi.gaussian_filter(mr, 1.2))
    img = img * (1 - 0.28 * sh * ground)[..., None] * np.array([1, 1, 1.03], np.float32)
    # rim light on the REAL characters from the sun (right): warm edge on the right, cooler darker left
    mb = ndi.gaussian_filter(mr, 12.0); gx, gy = ndi.sobel(mb, axis=1) / 8.0, ndi.sobel(mb, axis=0) / 8.0
    gl = np.sqrt(gx * gx + gy * gy) + 1e-6; nx, ny = -gx / gl, -gy / gl; ndl = np.clip(nx * 0.93 + ny * (-0.35), -1, 1)
    inside = np.clip((ndi.gaussian_filter(mr, 3.0) - 0.45) * 4, 0, 1); edge = np.clip(gl * 14.0, 0, 1)
    rim, far = np.clip(ndl, 0, 1) * edge * inside, np.clip(-ndl, 0, 1) * edge * inside
    img = img + 0.42 * rim[..., None] * np.array([1.0, 0.66, 0.46], np.float32)
    img = img * (1 - 0.14 * far)[..., None]
    # ---- coal glow in the brazier mouth + faint warm light on what is near it
    cx, cy = I['coal']; fl = 1 + 0.12 * math.sin(t * 23) + 0.08 * math.sin(t * 37 + 1)
    glow = np.exp(-(((XX - cx) / 48.0) ** 2 + ((YY - cy) / 22.0) ** 2)) * (0.30 + 0.12 * I["emit"]) * fl
    img = img + (glow * (1 - 0.5 * ndi.gaussian_filter(mr, 2)))[..., None] * np.array([1.0, 0.45, 0.14], np.float32)
    img = img + 0.10 * ndi.gaussian_filter(glow, 40)[..., None] * np.array([1.0, 0.5, 0.2], np.float32)
    # ---- steam (behind the characters) + cat cloud
    D = steam_density(t, src) * texture(t); A = 1 - np.exp(-D * 1.9)
    ca = cloud_alpha(I['cloud'], t); A = 1 - (1 - np.clip(A, 0, 0.9)) * (1 - ca)
    top = ndi.shift(D + ca, (10, 0), order=1, mode='nearest') - ndi.shift(D + ca, (-10, 0), order=1, mode='nearest')
    lightk = np.clip(0.84 + top * 1.1, 0.62, 1.0); sunk = np.clip(0.3 + 0.7 * np.clip((XX - 300) / 700, 0, 1), 0, 1)
    scol = np.array([0.80, 0.77, 0.92], np.float32) * (1 - lightk[..., None]) + np.array([1.0, 0.95, 0.93], np.float32) * lightk[..., None]
    scol = scol + 0.12 * (sunk * lightk)[..., None] * np.array([0.5, 0.2, 0.0], np.float32)
    A = A * (1 - np.clip(ndi.gaussian_filter(mr, 1.0), 0, 1))
    img = img * (1 - A[..., None]) + scol * A[..., None]
    # ---- vignette + filmic knee + grain
    vg = 1 - 0.30 * np.clip(((XX - 540) / 760.0) ** 2 + ((YY - 900) / 1250.0) ** 2, 0, 1); img = img * vg[..., None]
    img = np.where(img < 0.74, img, 0.74 + 0.26 * (1 - np.exp(-(img - 0.74) / 0.26)))
    img = img + np.random.default_rng(i).normal(0, 0.006, (H, W, 1)).astype(np.float32)
    os.makedirs(dst, exist_ok=True)
    Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)).save(f'{dst}/f{i:04d}.png')
if __name__ == '__main__':
    a, b = int(sys.argv[1]), int(sys.argv[2]); src = sys.argv[3] if len(sys.argv) > 3 else 'out'; dst = sys.argv[4] if len(sys.argv) > 4 else 'out/frames'
    for i in range(a, b): frame(i, src, dst)
