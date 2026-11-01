"""Final assembly of a Blender-rendered film: per frame, the shot's graded frame, or — inside a transition — the two shots'
linear EXRs mixed with the film's own transition maths (engine.js transM: crash zoom, whip pan, smoke, dissolve) and then
finished (grade.py); then the film's fx2d overlay and caption canvases (export_overlays.mjs) on top; frames → mp4 + audio.

usage: python3 tools/blender/composite.py <filmDir> <rendersDir> <overlaysDir> <outDir> [--from F --to F] [--mp4 out.mp4]
  rendersDir/<SHOT>/fNNNN.jpg (graded) and/or fNNNN.exr (linear; always kept for transition frames)
pack:  python3 tools/blender/composite.py --pack <filmDir> <shotRenderDir> <SHOT>   grade EXR → JPG, keep EXRs only where a
       transition needs them (run on each render shard so only small files travel)
"""
import sys, os, json, math, argparse, subprocess
import numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grade import read_exr, finish

KIND = {'crash': 'crash', 'whip': 'whip', 'cut': None, 'dolly-blur': 'crash', 'dissolve': 'dissolve', 'push-cut': 'crash', 'match-dissolve': 'dissolve', 'flare': 'dissolve',
        'smoke': 'smoke', 'fast-orbit': 'whip', 'pan-dissolve': 'dissolve', 'dissolve-descend': 'dissolve'}   # film.js KIND
FPS = 30

def load_map(film): return json.load(open(os.path.join(film, 'FRAMEMAP.json')))
def trans_frames(FM, sid):
    """frames of shot sid that a transition renders from EXR"""
    S, T = FM['shots'], FM['transitions']; k = next(i for i, s in enumerate(S) if s['id'] == sid); out = set()
    for i in (k - 1, k):
        if 0 <= i < len(T) and KIND.get(T[i]['kind']): out |= set(range(T[i]['f0'], T[i]['f1'] + 1))
    return out

def pack(film, d, sid):
    FM = load_map(film); keep = trans_frames(FM, sid)
    for fn in sorted(os.listdir(d)):
        if not fn.endswith('.exr'): continue
        f = int(fn[1:5]); p = os.path.join(d, fn); lin = read_exr(p)
        cv2.imwrite(p[:-4] + '.jpg', (finish(lin)[..., ::-1] * 255 + 0.5).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 96])
        if f not in keep: os.remove(p)
        print('packed', sid, f, flush=True)

# ---------- transitions (engine.js transM), uv y-up like the shader ----------
def sample(img, u, v):
    H, W = img.shape[:2]
    return cv2.remap(img, (u * W - 0.5).astype(np.float32), ((1 - v) * H - 0.5).astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
def uvgrid(H, W):
    u = (np.arange(W, dtype=np.float32) + 0.5) / W; v = 1 - (np.arange(H, dtype=np.float32) + 0.5) / H
    return np.meshgrid(u, v)
def ss(a, b, x): t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
def h21(x, y): z = np.sin(x * 127.1 + y * 311.7) * 43758.5453; return z - np.floor(z)
def vn(x, y):
    ix, iy = np.floor(x), np.floor(y); fx, fy = x - ix, y - iy; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy)
    a, b, c, d = h21(ix, iy), h21(ix + 1, iy), h21(ix, iy + 1), h21(ix + 1, iy + 1)
    return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fy
def fbm(x, y):
    s, a = 0.0, 0.5
    for _ in range(5): s = s + a * vn(x, y); x, y = x * 2.03, y * 2.03; a *= 0.5
    return s
def transition(kind, A, B, p, c=(0.5, 0.5), zoom=0.4, fog=(1.0, 0.86, 0.7)):
    H, W = A.shape[:2]; asp = W / H; u, v = uvgrid(H, W); e = math.sin(math.pi * p)
    if kind == 'dissolve': return A * (1 - p) + B * p
    if kind == 'whip':
        dx = (1 / asp) * 0.22 * e; shx = (1 / asp) * 0.35; s_ = float(ss(0, 1, p))
        def db(img, uu):
            acc = np.zeros_like(img)
            for i in range(16): acc += sample(img, uu + dx * (i / 15 - 0.5), v)
            return acc / 16
        a = db(A, u + shx * s_); b = db(B, u - shx * (1 - s_)); m = float(ss(0.4, 0.6, p)); return a * (1 - m) + b * m
    if kind == 'crash':
        cx, cy = c
        def zb(img, uu, vv, amt):
            acc = np.zeros_like(img)
            for i in range(16): k = i / 15; acc += sample(img, cx + (uu - cx) * (1 - amt * k), cy + (vv - cy) * (1 - amt * k))
            return acc / 16
        sa = 1 + zoom * 4 * p * p; sb = 1 + zoom * 2 * (1 - p)
        a = zb(A, cx + (u - cx) / sa, cy + (v - cy) / sa, 0.25 * e); b = zb(B, cx + (u - cx) * sb, cy + (v - cy) * sb, 0.25 * e)
        m = float(ss(0.45, 0.7, p)); return a * (1 - m) + b * m
    if kind == 'smoke':
        n = fbm(u * asp * 3.0, v * 3.0 - p * 0.8); m = ss(n - 0.12, n + 0.12, p * 1.3 - 0.15)[..., None]; o = A * (1 - m) + B * m
        fg = float(ss(0, 0.5, e)) * (0.55 + 0.45 * fbm(u * 5 + p, v * 5 + p)); return o * (1 - fg[..., None] * 0.9) + np.array(fog, np.float32) * (fg[..., None] * 0.9)
    return B if p > 0.5 else A

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('film'); ap.add_argument('renders'); ap.add_argument('overlays'); ap.add_argument('out')
    ap.add_argument('--from', dest='f0', type=int, default=0); ap.add_argument('--to', dest='f1', type=int, default=None); ap.add_argument('--mp4')
    A = ap.parse_args(); FM = load_map(A.film); S, T = FM['shots'], FM['transitions']; NF = FM.get('frames', 1945); os.makedirs(A.out, exist_ok=True)
    OVJ = json.load(open(os.path.join(A.overlays, 'overlays.json'))); CUES = OVJ['cues']; OVF = set(OVJ['overlays'])
    HAVE = {}
    def near(sid, f, ext):   # sparse renders (--every N): hold the nearest rendered frame
        if (sid, ext) not in HAVE:
            d = os.path.join(A.renders, sid); HAVE[(sid, ext)] = sorted(int(x[1:5]) for x in os.listdir(d) if x.endswith(ext)) if os.path.isdir(d) else []
        fs = HAVE[(sid, ext)]
        return os.path.join(A.renders, sid, f'f{min(fs, key=lambda x: abs(x - f)):04d}{ext}') if fs else None
    def lin(sid, f):
        p = near(sid, f, '.exr')
        if p: return read_exr(p)
        g = near(sid, f, '.jpg'); c = cv2.imread(g)[..., ::-1].astype(np.float32) / 255   # no EXR: undo the display curve roughly
        return c ** 2.2
    def graded(sid, f):
        p = os.path.join(A.renders, sid, f'f{f:04d}.jpg')
        if not os.path.exists(p) and not os.path.exists(p[:-4] + '.exr'): p = near(sid, f, '.jpg') or p
        if os.path.exists(p): return cv2.imread(p)[..., ::-1].astype(np.float32) / 255
        return finish(lin(sid, f))
    def over(c, png):
        o = cv2.imread(png, cv2.IMREAD_UNCHANGED)
        if o is None: return c
        if o.shape[:2] != c.shape[:2]: o = cv2.resize(o, (c.shape[1], c.shape[0]), interpolation=cv2.INTER_AREA)
        a = o[..., 3:4].astype(np.float32) / 255; return c * (1 - a) + o[..., 2::-1].astype(np.float32) / 255 * a
    f1 = A.f1 if A.f1 is not None else NF - 1
    for f in range(A.f0, f1 + 1):
        k = next(i for i, s in enumerate(S) if s['f0'] <= f < s['f1']); tr = next((t for t in T if t['f0'] <= f <= t['f1']), None)
        if tr and KIND.get(tr['kind']):
            i = T.index(tr); p = (f - tr['f0'] + 0.5) / (tr['f1'] - tr['f0'] + 1)
            c = finish(transition(KIND[tr['kind']], lin(S[i]['id'], f), lin(S[i + 1]['id'], f), p))
        else: c = graded(S[k]['id'], f)
        if f in OVF: c = over(c, os.path.join(A.overlays, 'ov', f'f{f:04d}.png'))
        t = (f + 0.5) / FPS; q = next((j for j, cu in enumerate(CUES) if cu['t0'] <= t < cu['t1']), None)
        if q is not None: c = over(c, os.path.join(A.overlays, 'cap', f'c{q:03d}.png'))
        cv2.imwrite(os.path.join(A.out, f'c{f:04d}.jpg'), (np.clip(c, 0, 1)[..., ::-1] * 255 + 0.5).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 95]); print('comp', f, flush=True)
    if A.mp4:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(FPS), '-start_number', str(A.f0), '-i', os.path.join(A.out, 'c%04d.jpg'), '-ss', f'{A.f0 / FPS}', '-i', os.path.join(A.film, 'audio.flac'),
                        '-shortest', '-c:v', 'libx264', '-crf', '14', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', A.mp4], check=True)

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--pack': pack(*sys.argv[2:5])
    else: main()
