"""The film's finishing pass (engine.js finalM) in numpy, for linear Blender renders: unsharp, bloom, grade (tint, soft
shoulder 1.22c/(1+0.32c), gamma 2.2, contrast, gentle S-curve, saturation), vignette. Defaults = the jar film's E.frame call.
usage as a script: python3 tools/blender/grade.py a.exr [b.exr …]   → a.png next to each
"""
import sys, os
import numpy as np

def read_exr(p):
    import OpenEXR
    with OpenEXR.File(p) as f:
        ch = f.channels()
        if 'RGB' in ch: a = ch['RGB'].pixels
        elif 'RGBA' in ch: a = ch['RGBA'].pixels[..., :3]
        else: a = np.stack([ch[k].pixels for k in ('R', 'G', 'B')], -1)
    return np.ascontiguousarray(a, np.float32)

import cv2
def _blur(a, r): return cv2.GaussianBlur(a, (0, 0), r)
def _resize(a, w, h): return cv2.resize(a, (w, h), interpolation=cv2.INTER_AREA if w < a.shape[1] else cv2.INTER_LINEAR)

def bloom(lin, th=1.0):
    H, W = lin.shape[:2]; l = lin @ np.array([0.3, 0.55, 0.15], np.float32); t = np.clip((l - th) / 0.5, 0, 1); src = lin * (t * t * (3 - 2 * t))[..., None]
    acc = np.zeros_like(lin); cur = src
    for k, wgt in ((4, 0.5), (8, 0.8), (16, 1.1)):
        small = _resize(src if k == 4 else cur, W // k, H // k); small = _blur(small, 1.5 * 1.6); cur = small
        acc += _resize(small, W, H) * wgt
    return acc

def finish(lin, bloom_amt=0.3, bloom_th=1.0, vig=0.3, sat=1.16, contrast=1.1, tint=(1, 1, 1), sharpen=0.45, fade=1.0):
    c = lin.astype(np.float32)
    if sharpen:
        n = _blur(c, 1.0); c = np.maximum(c + (c - n) * sharpen * 2.0, 0)
    if bloom_amt > 0: c = c + bloom(lin, bloom_th) * bloom_amt * np.array([1, 0.85, 0.65], np.float32)
    c = c * np.array(tint, np.float32); c = 1.22 * c / (1 + 0.32 * c); c = np.clip(c, 0, 1) ** (1 / 2.2)
    c = (c - 0.5) * contrast + 0.5; c = c * c * (3 - 2 * c) * 0.35 + c * 0.65
    l = c @ np.array([0.3, 0.55, 0.15], np.float32); c = l[..., None] + (c - l[..., None]) * sat
    H, W = c.shape[:2]; yy, xx = np.mgrid[0:H, 0:W]; v = np.hypot(xx / W - 0.5, (1 - yy / H - 0.5) * 1.1) * 1.25
    t = np.clip((v - 0.45) / 0.5, 0, 1); c = c * (1 - vig * t * t * (3 - 2 * t))[..., None] * fade
    return np.clip(c, 0, 1)

def save(c, p): import cv2; cv2.imwrite(p, (np.clip(c, 0, 1)[..., ::-1] * 255 + 0.5).astype(np.uint8))

if __name__ == '__main__':
    for p in sys.argv[1:]:
        save(finish(read_exr(p)), os.path.splitext(p)[0] + '.png'); print('graded', p)
