#!/usr/bin/env python3
"""light.py — the Python (numpy + Pillow) light pass of "Blow-out".
Input per frame: out/lit/fNNNN.png (the room fully lit, no flame) + out/info/fNNNN.json (flame state, eyes, window, all in screen px).
It builds a light map (candle flame + glowing wick + moonlight), multiplies the lit frame by it (warm near the flame, blue-black far away), draws the flame (Pillow, 3x supersampled),
bloom, ember, smoke, and makes the eyes glow where it is dark. usage: python3 light.py START END   -> out/frames/fNNNN.png"""
import sys, os, json, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
W, H = 1080, 1920
YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
WARM = np.array([1.0, 0.80, 0.50], np.float32); MOON = np.array([0.55, 0.68, 1.0], np.float32); EMB = np.array([1.0, 0.36, 0.14], np.float32)
def smooth(a, b, x): k = np.clip((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k)
def flicker(t, k=1.0):
    return 1 + k * (0.045 * math.sin(2 * math.pi * 11.3 * t) + 0.03 * math.sin(2 * math.pi * 17.1 * t + 1.3) + 0.02 * math.sin(2 * math.pi * 5.7 * t + 0.4))
def light_map(inf, t):
    f = inf['flame']; wx, wy = f['x'], f['y'] - 55 * max(f['len'], 0)          # light centre ~ middle of the flame
    I = (min(f['len'], 1.25) ** 0.85) * flicker(t, 1.0 if f['len'] > 0.4 else 0.4)
    d2 = (XX - wx) ** 2 + (YY - wy) ** 2; d = np.sqrt(d2)
    core = 1.0 / (1.0 + d2 / (190.0 ** 2)); wide = 0.40 * np.exp(-d / 720.0)
    L = (I * (1.25 * core + wide))[..., None] * WARM
    e = f['ember']; ex, ey = f['x'], f['y']
    if e > 0.01: d2e = (XX - ex) ** 2 + (YY - ey) ** 2; L += (0.16 * e / (1.0 + d2e / (110.0 ** 2)))[..., None] * EMB
    w = inf['win']; dw = np.sqrt((XX - w['x']) ** 2 + (YY - w['y']) ** 2)
    moon = (0.13 + 0.10 * np.exp(-dw / 520.0) * (YY < 800))[..., None] * MOON
    L = L + moon
    return L.astype(np.float32), I
def tone(x):
    hi = 0.8; y = np.where(x < hi, x, hi + 0.2 * (1 - np.exp(-(x - hi) / 0.2))); return y
def flame_poly(x0, y0, Hh, Wd, lean, t, k=1.0, n=40):
    L, R = [], []
    for i in range(n + 1):
        u = i / n; cy = y0 - u * Hh
        cx = x0 + lean * 46 * (u ** 1.5) + 3.0 * k * u * math.sin(2 * math.pi * 9 * t + 3 * u)
        half = (Wd / 2) * min(1.0, math.sqrt(u / 0.13 + 1e-6)) * (1 - u) ** 0.85
        L.append((cx - half, cy)); R.append((cx + half, cy))
    return L + R[::-1]
def draw_flame(img_rgb, inf, t):
    f = inf['flame']; ln = f['len']
    if ln < 0.03: return img_rgb
    fl = flicker(t, 1.0); Hh = 150 * ln * (1 + 0.5 * (fl - 1)); Wd = 60 * (0.6 + 0.4 * min(ln, 1.2)); lean = f['lean'] * (0.55 + 0.45 * min(ln, 1))
    pad = 200; x0, y0 = f['x'], f['y'] + 8; bx, by = int(x0 - pad), int(y0 - pad * 1.6); pw, ph = pad * 2, int(pad * 1.9); SS = 3
    def layer(scale_h, scale_w, col, a, lean_k=1.0):
        im = Image.new('RGBA', (pw * SS, ph * SS), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        pts = flame_poly((x0 - bx) * SS, (y0 - by) * SS, Hh * scale_h * SS, Wd * scale_w * SS, lean * lean_k, t, 1.0); pts = [(px, py) for px, py in pts]
        d.polygon(pts, fill=col + (int(255 * a),)); return im.resize((pw, ph), Image.LANCZOS)
    outer = layer(1.0, 1.0, (255, 150, 40), 0.92); mid = layer(0.78, 0.7, (255, 205, 80), 0.95); core = layer(0.46, 0.42, (255, 247, 205), 1.0, 0.6)
    blue = Image.new('RGBA', (pw, ph), (0, 0, 0, 0)); ImageDraw.Draw(blue).ellipse((x0 - bx - 11, y0 - by - 12, x0 - bx + 11, y0 - by + 8), fill=(110, 150, 255, int(170 * min(ln, 1))))
    comp = Image.new('RGBA', (pw, ph), (0, 0, 0, 0))
    for L_ in (outer, mid, core): comp = Image.alpha_composite(comp, L_)
    bloom = comp.filter(ImageFilter.GaussianBlur(22)); halo = comp.filter(ImageFilter.GaussianBlur(60))
    base = Image.fromarray((np.clip(img_rgb, 0, 1) * 255).astype(np.uint8)); base = base.convert('RGBA')
    patch = base.crop((bx, by, bx + pw, by + ph)); arr = np.asarray(patch).astype(np.float32) / 255
    def add(layer_img, g):
        a = np.asarray(layer_img).astype(np.float32) / 255; arr[..., :3] = 1 - (1 - arr[..., :3]) * (1 - a[..., :3] * a[..., 3:4] * g)
    add(halo, 0.55 * min(ln, 1.2)); add(bloom, 0.8)
    pa = np.asarray(Image.alpha_composite(blue, Image.new('RGBA', (pw, ph), (0, 0, 0, 0)))).astype(np.float32) / 255
    ca = np.asarray(comp).astype(np.float32) / 255; arr[..., :3] = arr[..., :3] * (1 - ca[..., 3:4]) + ca[..., :3] * ca[..., 3:4]
    arr[..., :3] = arr[..., :3] * (1 - pa[..., 3:4] * 0.8) + pa[..., :3] * pa[..., 3:4] * 0.8
    out = np.array(img_rgb, np.float32); y1, x1 = max(by, 0), max(bx, 0); y2, x2 = min(by + ph, H), min(bx + pw, W)
    out[y1:y2, x1:x2] = arr[y1 - by:y2 - by, x1 - bx:x2 - bx, :3]; return out
def draw_ember_smoke(img, inf, t):
    f = inf['flame']; e, sm = f['ember'], f['smoke']; wx, wy = f['x'], f['y']
    if e < 0.01 and sm < 0.01: return img
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    if sm > 0.01:                                                              # smoke: a wobbling ribbon of soft discs, tinted red near the glowing wick
        Hs = 330 * (0.45 + 0.55 * sm); N = 70
        for i in range(N):
            u = i / (N - 1); y = wy - 6 - u * Hs; x = wx + 18 * math.sin(2 * math.pi * (u * 1.5 - 0.55 * t)) * (u ** 0.7) + 28 * (u ** 1.6) * math.sin(2 * math.pi * 0.7 * t + 1)
            r = 3 + 15 * u; a = sm * 0.75 * (1 - u) ** 1.3 * min(1, u * 8 + 0.35)
            hot = min(1.0, e) * (1 - u) ** 2; col = (int(176 + 79 * hot), int(184 - 34 * hot), int(206 - 116 * hot))
            d.ellipse((x - r, y - r, x + r, y + r), fill=col + (int(255 * a),))
        lay = lay.filter(ImageFilter.GaussianBlur(5))
    if e > 0.01:                                                              # glowing wick
        em = Image.new('RGBA', (W, H), (0, 0, 0, 0)); de = ImageDraw.Draw(em); r = 7 + 5 * e
        de.ellipse((wx - r * 3, wy - r * 2.2, wx + r * 3, wy + r * 3.2), fill=(255, 90, 30, int(110 * min(e, 1))))
        em = em.filter(ImageFilter.GaussianBlur(16)); de2 = ImageDraw.Draw(em); de2.ellipse((wx - r, wy - r * 0.8, wx + r, wy + r * 1.1), fill=(255, 150, 60, int(255 * min(e, 1))))
        de2.ellipse((wx - r * 0.5, wy - r * 0.4, wx + r * 0.5, wy + r * 0.5), fill=(255, 235, 170, int(255 * min(e, 1))))
        lay = Image.alpha_composite(lay, em)
    a = np.asarray(lay).astype(np.float32) / 255; out = np.array(img, np.float32); al = a[..., 3:4]
    out = out * (1 - al) + a[..., :3] * al; out = 1 - (1 - out) * (1 - a[..., :3] * al * 0.25 * (e > 0.01)); return out
def eye_glow(img, inf, Lmap, t):
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay); any_ = False
    for e in inf['eyes']:
        x, y = e['x'], e['y']; ix, iy = int(np.clip(x, 0, W - 1)), int(np.clip(y, 0, H - 1)); lum = float(Lmap[iy, ix].mean()); D = float(np.clip(1.0 - lum / 0.75, 0, 1))
        if D < 0.03: continue
        any_ = True; rx, ry = e['rx'], e['ry']; a = int(235 * D)
        if e['kind'] == 's':
            if e['open'] > 0.5: d.ellipse((x - rx, y - ry, x + rx, y + ry), fill=(255, 244, 214, a)); lx, ly = e['look'][0] * rx * 0.35, e['look'][1] * ry * 0.3; d.ellipse((x + lx - rx * 0.42, y + ly - ry * 0.42, x + lx + rx * 0.42, y + ly + ry * 0.42), fill=(24, 18, 22, a))
            else: d.arc((x - rx, y - ry * 0.7, x + rx, y + ry * 0.9), 200, 340, fill=(255, 244, 214, a), width=max(3, int(rx * 0.3)))
        else:
            if e['open'] > 0.12 and not e.get('shut'):
                oy = ry * max(0.2, e['open']); d.ellipse((x - rx * 1.05, y - oy, x + rx * 1.05, y + oy), fill=(255, 226, 140, a)); dil = e.get('dil', 0.5); pw_ = rx * (0.2 + 0.3 * dil)
                lx = e['look'][0] * rx * 0.12; d.ellipse((x + lx - pw_, y - oy * 0.92, x + lx + pw_, y + oy * 0.92), fill=(20, 12, 8, a))
                d.ellipse((x + lx - pw_ * 0.45 - rx * 0.25, y - oy * 0.45, x + lx - pw_ * 0.45 - rx * 0.05, y - oy * 0.2), fill=(255, 255, 255, a))
            else: d.arc((x - rx, y - ry * 0.6, x + rx, y + ry * 0.9), 200, 340, fill=(255, 226, 140, a), width=max(3, int(rx * 0.28)))
    if not any_: return img
    glow = lay.filter(ImageFilter.GaussianBlur(14)); lay = lay.filter(ImageFilter.GaussianBlur(0.8))
    g = np.asarray(glow).astype(np.float32) / 255; c = np.asarray(lay).astype(np.float32) / 255; out = np.array(img, np.float32)
    out = 1 - (1 - out) * (1 - g[..., :3] * g[..., 3:4] * 0.55); out = out * (1 - c[..., 3:4]) + c[..., :3] * c[..., 3:4]; return out
def frame(i, src, dst):
    inf = json.load(open(f'{src}/info/f{i:04d}.json')); t = inf['t']
    lit = np.asarray(Image.open(f'{src}/lit/f{i:04d}.png').convert('RGB')).astype(np.float32) / 255
    L, I = light_map(inf, t); out = tone(lit * L)
    w = inf['win']; dw = np.sqrt((XX - w['x']) ** 2 + (YY - w['y']) ** 2); wm = (1 - smooth(w['r'] * 0.93, w['r'] * 1.02, dw))[..., None]          # the round window stays a pale blue moon
    out = np.maximum(out, lit * MOON * 0.42 * wm)
    out = draw_flame(out, inf, t); out = draw_ember_smoke(out, inf, t); out = eye_glow(out, inf, L, t)
    rng = np.random.default_rng(i); out = out + rng.normal(0, 0.006, out.shape).astype(np.float32)
    Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)).save(f'{dst}/f{i:04d}.png')
if __name__ == '__main__':
    a, b = int(sys.argv[1]), int(sys.argv[2]); src = sys.argv[3] if len(sys.argv) > 3 else 'out'; dst = sys.argv[4] if len(sys.argv) > 4 else 'out/frames'; os.makedirs(dst, exist_ok=True)
    for i in range(a, b): frame(i, src, dst)
