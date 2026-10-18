#!/usr/bin/env python3
"""light.py — the Python (numpy + Pillow) ball pass of "Super ball".
Chrome draws the room + both characters (no ball). Per frame this draws the BALL from out/info/fNNNN.json (screen px): a shaded rubber sphere with a spinning stripe, squash on contact (compressed along the
contact normal), stretch along the velocity in flight, a motion ghost trail (the ball's earlier positions, older = fainter, only when fast), a contact-shadow darkening and a tiny highlight.  usage: python3 light.py START END -> out/frames/fNNNN.png"""
import sys, os, json, math
import numpy as np
from PIL import Image
W, H = 1080, 1920
SS = 3                                                                   # supersample for the sphere
BASE = np.array([0.18, 0.62, 0.90], np.float32); DARK = np.array([0.07, 0.25, 0.55], np.float32); STRIPE = np.array([1.0, 0.96, 0.85], np.float32); OUT = np.array([0.24, 0.19, 0.26], np.float32)
def sphere_rgba(b, scale=1.0, alpha=1.0):
    """returns (rgba float image, x0, y0) of the ball b = {x,y,r,sq,ang,st,vang,spin}"""
    r = b['r'] * scale; sq = b['sq']; st = b['st']
    if sq > 0.01 and abs(b['ang'] - math.pi / 2) < 0.01: b = dict(b); b['y'] = b['y'] + r * sq          # flattened on the floor: the bottom stays on the floor, the centre sinks
    # ellipse axes: compress along 'ang' (contact normal), keep volume ~; stretch along velocity direction in flight
    ax_n = 1 - sq * 1.0; ax_t = 1 + sq * 0.55                              # contact: flat along normal, wider across
    pad = int(r * 1.9) + 6; x0 = int(round(b['x'])) - pad; y0 = int(round(b['y'])) - pad; n = 2 * pad
    yy, xx = np.mgrid[0:n * SS, 0:n * SS].astype(np.float32); xx = xx / SS - pad; yy = yy / SS - pad
    if sq > 0.01: th = b['ang']; sa, sb = ax_n, ax_t                         # sa along the normal direction (th), sb across
    else: th = b['vang']; sa = 1 + st; sb = 1 / math.sqrt(1 + st)             # stretch along travel
    if sq > 0.01: u = xx * math.cos(th) + yy * math.sin(th); v = -xx * math.sin(th) + yy * math.cos(th); a_, b_ = sa, sb
    else: u = xx * math.cos(th) + yy * math.sin(th); v = -xx * math.sin(th) + yy * math.cos(th); a_, b_ = sa, sb
    # u,v are in the (normal / across) frame; for the stretched case u is along the travel direction
    rr = np.sqrt((u / (r * a_)) ** 2 + (v / (r * b_)) ** 2)
    inside = np.clip((1.0 - rr) * r * 0.9, 0, 1)                             # antialiased edge (in px)
    # sphere normal in the ball's own (squashed) frame, then in screen frame for lighting
    nz = np.sqrt(np.clip(1 - rr ** 2, 0, 1)); nxs = (u / (r * a_)); nys = (v / (r * b_))
    nx = nxs * math.cos(th) - nys * math.sin(th); ny = nxs * math.sin(th) + nys * math.cos(th)
    L = np.array([-0.45, -0.65, 0.62], np.float32); L = L / np.linalg.norm(L)
    lam = np.clip(nx * L[0] + ny * L[1] + nz * L[2], 0, 1)
    # spin: the stripe is a great circle whose axis rotates in the image plane with 'spin'
    cs, sn = math.cos(b['spin']), math.sin(b['spin'])
    ax, ay, az = cs * 0.0 + sn * 0.9, -cs * 0.9 * 0 + 0.0, 0.0
    px_ = nx * cs + ny * sn; py_ = -nx * sn + ny * cs                       # rotate the point on the sphere
    band = np.clip(1 - np.abs(py_ * 0.9 + 0.25 * nz * math.sin(b['spin'] * 0.7)) / 0.20, 0, 1) ** 0.7
    col = BASE[None, None, :] * (0.40 + 0.75 * lam[..., None]) + DARK[None, None, :] * (1 - lam[..., None]) * 0.3
    col = col * (1 - band[..., None]) + STRIPE[None, None, :] * (0.55 + 0.5 * lam[..., None]) * band[..., None]
    hl = np.clip((lam - 0.9) / 0.1, 0, 1) ** 2; col = col + 0.55 * hl[..., None]                                 # specular
    rim = np.clip((rr - 0.88) / 0.12, 0, 1); col = col * (1 - 0.55 * rim[..., None]) + OUT[None, None, :] * 0.55 * rim[..., None]   # ink-ish outline
    a = inside * alpha
    # downsample
    col = col.reshape(n, SS, n, SS, 3).mean(axis=(1, 3)); a = a.reshape(n, SS, n, SS).mean(axis=(1, 3))
    return col, a, x0, y0
def paste(img, col, a, x0, y0):
    n = a.shape[0]; xs, ys = max(x0, 0), max(y0, 0); xe, ye = min(x0 + n, W), min(y0 + n, H)
    if xs >= xe or ys >= ye: return
    c = col[ys - y0:ye - y0, xs - x0:xe - x0]; al = a[ys - y0:ye - y0, xs - x0:xe - x0][..., None]
    img[ys:ye, xs:xe] = img[ys:ye, xs:xe] * (1 - al) + np.clip(c, 0, 1) * al
def frame(i, src='out', dst='out/frames'):
    I = json.load(open(f'{src}/info/f{i:04d}.json')); img = np.asarray(Image.open(f'{src}/lit/f{i:04d}.png').convert('RGB')).astype(np.float32) / 255
    b = I['ball']
    # ghost trail: only when the ball is fast; older ghosts are fainter and a little smaller
    if b['speed'] > 160:
        for k, g in reversed(list(enumerate(I['trail']))):
            f = (1 - (k + 1) / (len(I['trail']) + 1)); al = 0.34 * f * f * min(1.0, (b['speed'] - 160) / 300)
            if al < 0.01: continue
            gg = dict(g); gg['sq'] = 0.0; gg['st'] = min(g['st'], 0.12)
            col, a, x0, y0 = sphere_rgba(gg, 0.92 + 0.06 * f, al); col = col * 0.0 + (BASE * 0.9 + 0.1)[None, None, :]; paste(img, col, a, x0, y0)
    col, a, x0, y0 = sphere_rgba(b); paste(img, col, a, x0, y0)
    os.makedirs(dst, exist_ok=True); Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)).save(f'{dst}/f{i:04d}.png')
if __name__ == '__main__':
    a, c = int(sys.argv[1]), int(sys.argv[2]); src = sys.argv[3] if len(sys.argv) > 3 else 'out'; dst = sys.argv[4] if len(sys.argv) > 4 else 'out/frames'
    for i in range(a, c): frame(i, src, dst)
