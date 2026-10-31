"""Compare a film against reference videos (the benchmark is always the references, never our own earlier films).
usage: python refcompare.py ours.mp4 ref1.mp4 [ref2.mp4 ...] [--sheet out.jpg]
Prints: duration, shot changes (hard cuts and soft/in-camera transitions) and their interval, camera/subject motion,
average luma and saturation, each against the references' range; and writes a side-by-side contact sheet (references
left, ours right, matched by relative position in the film)."""
import sys, subprocess, numpy as np, os, tempfile
args = [a for a in sys.argv[1:] if not a.startswith('--')]; sheet = sys.argv[sys.argv.index('--sheet') + 1] if '--sheet' in sys.argv else None
if sheet in args: args.remove(sheet)
ours, refs = args[0], args[1:]
W, H = 90, 160
def frames(f, fps=10):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-vf', f'fps={fps},scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3).astype(np.float32)
def metrics(f):
    a = frames(f); dur = len(a) / 10
    hist = [np.histogramdd(x.reshape(-1, 3) // 64, bins=(4, 4, 4), range=((0, 4),) * 3)[0].ravel() / (W * H) for x in a]
    hd = np.array([np.abs(hist[k + 1] - hist[k]).sum() for k in range(len(hist) - 1)])
    hard = []
    for k in np.where(hd > 0.5)[0]:
        if not hard or k - hard[-1] > 5: hard.append(k)
    w = np.convolve(hd, np.ones(5), 'valid'); anyc = []
    for k in np.where(w > 0.9)[0]:
        if not anyc or k - anyc[-1] > 8: anyc.append(k)
    soft = [k for k in anyc if all(abs(k + 2 - j) > 4 for j in hard)]
    motion = np.abs(a[1:] - a[:-1]).mean()
    mx, mn = a.max(axis=3), a.min(axis=3); sat = np.where(mx > 0, (mx - mn), 0).mean() / 255 * 100
    luma = (a @ np.array([0.299, 0.587, 0.114])).mean()
    return dict(dur=dur, hard=len(hard), soft=len(soft), change_every=dur / max(1, len(hard) + len(soft)), motion=float(motion), luma=float(luma), sat=float(sat))
R = [metrics(r) for r in refs]; O = metrics(ours)
print(f"{'metric':<22}{'references (range)':<26}{'ours':<10}verdict")
for k, lab, tol in [('change_every', 'shot change every (s)', 0.25), ('hard', 'hard cuts', None), ('soft', 'in-camera transitions', None), ('motion', 'motion', 0.15), ('luma', 'luma (0-255)', 0.12), ('sat', 'saturation (%)', 0.12)]:
    lo, hi = min(r[k] for r in R), max(r[k] for r in R); v = O[k]
    if k in ('hard', 'soft'):
        rate = [r[k] / r['dur'] * 60 for r in R]; vr = v / O['dur'] * 60; ok = min(rate) * 0.75 <= vr <= max(rate) * 1.25
        print(f"{lab + ' /min':<22}{f'{min(rate):.1f}-{max(rate):.1f}':<26}{vr:<10.1f}{'ok' if ok else 'OFF'}")
    else:
        ok = lo * (1 - tol) <= v <= hi * (1 + tol); print(f"{lab:<22}{f'{lo:.1f}-{hi:.1f}':<26}{v:<10.1f}{'ok' if ok else ('LOW' if v < lo else 'HIGH')}")
if sheet:
    td = tempfile.mkdtemp(); n = 8; cols = []
    for i, f in enumerate(refs + [ours]):
        d = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout)
        for j in range(n):
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{d * (j + 0.5) / n:.2f}', '-i', f, '-frames:v', '1', '-vf', 'scale=180:320', f'{td}/c{i}_{j}.jpg'])
        subprocess.run(['ffmpeg', '-v', 'error', '-y', *sum([['-i', f'{td}/c{i}_{j}.jpg'] for j in range(n)], []), '-filter_complex', f'vstack={n}', f'{td}/col{i}.jpg']); cols.append(f'{td}/col{i}.jpg')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *sum([['-i', c] for c in cols], []), '-filter_complex', f'hstack={len(cols)}', sheet]); print('sheet', sheet)
