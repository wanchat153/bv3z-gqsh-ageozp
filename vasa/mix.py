"""The Ship That Sank: wordless score + foley, all synthesised, keyed to the shot list (events.json).
Writes out/mix.wav (48 kHz stereo, DUR s)."""
import numpy as np, soundfile as sf, os, json
from scipy.signal import butter, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
E = json.load(open(os.path.join(HERE, 'events.json')))
DUR, T = E['DUR'], E['T']; SH = {s['stage']: (s['t0'], s['t1']) for s in E['shots']}
SR = 48000; N = int(SR * DUR); rng = np.random.default_rng(5)
t = np.arange(N) / SR; L = np.zeros(N); R = np.zeros(N)
def lp(x, f, o=2): return sosfilt(butter(o, min(f, SR / 2 - 100), 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, a, b, o=2): return sosfilt(butter(o, [a, min(b, SR / 2 - 100)], 'band', fs=SR, output='sos'), x)
def env(pts): xs, ys = zip(*pts); return np.interp(t, xs, ys)
def add(x, at, g=1.0, pan=0.0):
    i = int(at * SR)
    if i < 0: x = x[-i:]; i = 0
    x = x[: max(0, N - i)]; l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    L[i:i + len(x)] += x * g * l * 1.414; R[i:i + len(x)] += x * g * r * 1.414
def noise(s): return rng.standard_normal(int(s * SR))
def tt(s): return np.arange(int(s * SR)) / SR
def tone(f, s, dec=0.3, harm=((1, 1.0),), att=0.004): u = tt(s); return sum(a * np.sin(2 * np.pi * f * k * u) for k, a in harm) * np.minimum(1, u / att) * np.exp(-u / dec)
def pluck(f, s=0.6, bright=0.5):
    n = int(s * SR); p = max(2, int(SR / f)); buf = rng.uniform(-1, 1, p); out = np.zeros(n)
    for i in range(0, n, p): k = min(p, n - i); out[i:i + k] = buf[:k]; buf = (buf + np.roll(buf, 1)) * 0.5 * (0.994 + 0.004 * bright)
    return out * np.minimum(1, tt(s) / 0.002)
def harpsi(f, s=0.5): a = pluck(f, s, 1.0) * 0.7; b = pluck(f * 2, s * 0.6, 1.0) * 0.3; a[: len(b)] += b; return a
def brass(fs, s, att=0.03, rel=0.25, bright=2500):
    u = tt(s); x = sum(2 * ((f * u + 0.13 * i) % 1) - 1 for i, f in enumerate(fs)) / len(fs); return lp(x, bright) * np.minimum(1, u / att) * np.minimum(1, np.maximum(0, s - u) / rel)
def strings(fs, s, att=0.4, rel=0.6, bright=1800):
    u = tt(s); x = sum((2 * ((f * (1 + 0.003 * np.sin(2 * np.pi * (5 + i) * u)) * u + 0.3 * i) % 1) - 1) for i, f in enumerate(fs) for _ in [0]) / len(fs)
    return lp(x, bright) * np.minimum(1, u / att) * np.minimum(1, np.maximum(0, s - u) / rel)
def glide(f0, f1, s, wav='sin'): u = tt(s); f = f0 * (f1 / f0) ** (u / s); ph = 2 * np.pi * np.cumsum(f) / SR; return np.sin(ph) if wav == 'sin' else (2 * ((ph / (2 * np.pi)) % 1) - 1)
def whoosh(s, f0=300, f1=1800):
    u = tt(s); v = u / s; out = np.zeros_like(u)
    for i in range(12): a, b = int(i * len(u) / 12), int((i + 1) * len(u) / 12); fc = f0 * (f1 / f0) ** v[a]; out[a:b] = bp(noise(s), fc * 0.7, fc * 1.4)[a:b]
    return out * np.sin(np.pi * v)
NOTE = lambda m: 440.0 * 2 ** ((m - 69) / 12)
def creak(s, f=180): u = tt(s); fm = f * (1 + 0.3 * np.sin(2 * np.pi * 1.3 * u)); ph = 2 * np.pi * np.cumsum(fm) / SR; x = np.sign(np.sin(ph)) * (rng.random(len(u)) > 0.6); return bp(x, 300, 2500) * np.sin(np.pi * u / s) * 0.5
def thump(): u = tt(0.12); return lp(noise(0.12), 400) * np.exp(-u / 0.02) * 1.5 + tone(80, 0.12, 0.03)
def crowdbed(s, excite=1.0):
    u = tt(s); x = sum(bp(noise(s), 250 + 60 * k, 900 + 200 * k) * (0.6 + 0.4 * np.sin(2 * np.pi * (0.7 + 0.31 * k) * u + k)) for k in range(5)) / 3
    return x * np.minimum(1, u / 0.3) * np.minimum(1, (s - u) / 0.3) * excite
def cheer(s): u = tt(s); x = crowdbed(s, 1) + sum(glide(rng.uniform(400, 900), rng.uniform(600, 1200), s) * 0.05 * np.sin(np.pi * u / s) for _ in range(6)); return x
def gull(): s = 0.5; u = tt(s); f = 1500 * (1 + 0.3 * np.sin(np.pi * u / s)); return bp(np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 14 * u))), 900, 4000) * np.sin(np.pi * u / s)
def splash(s=1.0): u = tt(s); return bp(noise(s), 400, 6000) * np.exp(-u / (s * 0.3)) + lp(noise(s), 300) * np.exp(-u / 0.1)
def bubbles(s, rate=12):
    out = np.zeros(int(s * SR)); at = 0.0
    while at < s - 0.1: i = int(at * SR); b = glide(rng.uniform(300, 900), rng.uniform(900, 1800), 0.06) * np.exp(-tt(0.06) / 0.02); out[i:i + len(b)] += b[: len(out) - i]; at += rng.exponential(1 / rate)
    return out

# ---------------- ambience per location ----------------
outdoor = [('harbour',), ('stern',), ('test',), ('admiral',), ('depart',), ('gust1',), ('gust2',), ('ports',), ('sink',), ('shock',), ('salvage',)]
for (k,) in outdoor:
    a, b = SH[k]; s = b - a; u = tt(s)
    w = lp(noise(s), 500) * 0.06 + bp(noise(s), 200, 900) * 0.025 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.3 * u))   # wind + lapping water
    lap = lp(noise(s), 180) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.6 * u)) ** 2 * 0.12
    add((w + lap) * np.minimum(1, u / 0.05) * np.minimum(1, (s - u) / 0.05), a, 1.0)
for at in [0.6, 2.4, 5.0, 19.0, 20.6, 23.6, SH['shock'][0] + 0.8]: add(gull(), at, 0.06, rng.uniform(-0.6, 0.6))
a, b = SH['gundeck']; s = b - a; add(lp(noise(s), 160) * 0.12 + creak(s, 120) * 0.25, a, 1.0)
a, b = SH['inquiry']; s = b - a; add(lp(noise(s), 300) * 0.03, a, 1.0)
a, b = SH['seabed']; s = b - a; u = tt(s); add(lp(noise(s), 220) * 0.35 * np.minimum(1, u / 0.2) + bubbles(s, 5) * 0.08, a, 1.0)
a, b = SH['museum']; s = b - a; u = tt(s); add(lp(noise(s), 400) * 0.03 + bp(noise(s), 500, 1500) * 0.012 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.4 * u)), a, 1.0)

# ---------------- score ----------------
bpm = 100; beat = 60 / bpm
D = [(50, [62, 66, 69]), (55, [62, 67, 71]), (57, [61, 64, 69]), (50, [62, 66, 69])]
mel = [74, 76, 78, 76, 74, 73, 71, 73, 74, None, 69, None, 71, 73, 74, None]
add(brass([NOTE(62), NOTE(66), NOTE(69)], 0.5, 0.01, 0.15, 3500), 0.25, 0.16); add(brass([NOTE(62), NOTE(66), NOTE(69), NOTE(74)], 1.4, 0.02, 0.6, 3500), 0.8, 0.16)
def march(t0, t1, gain=1.0, mel_on=True, drums=False):
    at = t0; k = 0
    while at < t1 - 0.05:
        root, ch = D[(k // 4) % 4]
        add(pluck(NOTE(root - 12), 0.5), at, 0.2 * gain, -0.1)
        if k % 2 == 1: [add(harpsi(NOTE(c), 0.35), at + 0.01 * i, 0.05 * gain, 0.25) for i, c in enumerate(ch)]
        m = mel[k % 16]
        if mel_on and m: add(harpsi(NOTE(m), 0.4), at, 0.09 * gain, 0.2)
        if drums: add(thump() * 0.6, at, 0.18 * gain, 0); add(bp(noise(0.08), 1500, 6000) * np.exp(-tt(0.08) / 0.015) * (0.3 if k % 2 else 0.8), at, 0.18 * gain, 0)
        at += beat; k += 1
march(2.0, SH['gundeck'][1], 1.0)
# stern: the gold sparkles
for k in range(6): add(tone(NOTE(86 + [0, 4, 7, 12, 7, 12][k]), 0.8, 0.3, ((1, 1), (2.76, 0.3))), SH['stern'][0] + 1.6 + k * 0.08, 0.06, 0.3)
# gun deck: cannon rolls
for k in range(3): add(lp(noise(0.9), 200) * np.sin(np.pi * tt(0.9) / 0.9) * 1.2 + creak(0.9, 90) * 0.4, SH['gundeck'][0] + 0.2 + k * 0.9, 0.35, -0.2 + 0.2 * k)
# the test: thundering feet, nervous pizzicato that speeds up, growing groans
a, b = SH['test']
at = a + 0.2; k = 0
while at < b - 0.2:
    add(pluck(NOTE([50, 53, 50, 56][k % 4]), 0.25), at, 0.3, -0.2); at += max(0.14, 0.32 - 0.03 * k); k += 1
at = a + 0.2
while at < b - 0.3:
    for j in range(5): add(thump(), at + j * 0.07 + rng.uniform(0, 0.03), 0.18, rng.uniform(-0.5, 0.5))
    at += 0.7
for k, at in enumerate([a + 0.9, a + 2.3, a + 3.7]): add(creak(1.1, 140 - 20 * k), at, 0.45 + 0.15 * k, 0)
# admiral: whistle stop, gulp, the shrug
a, b = SH['admiral']
add(glide(2400, 2600, 0.5) * 0.4 * np.minimum(1, tt(0.5) / 0.02), a + 0.1, 0.18)
add(lp(noise(0.3), 1200) * np.exp(-tt(0.3) / 0.05) * 0.6, a + 1.0, 0.15)   # paper
s = tt(0.35); add(glide(380, 110, 0.35) * np.exp(-s / 0.1), a + 1.8, 0.3)   # gulp
add(pluck(NOTE(43), 0.6), a + 2.4, 0.4); add(pluck(NOTE(50), 0.6), a + 2.65, 0.4)
# departure: bells, cheering, the march with drums
a, b = SH['depart']
for k in range(10): add(tone(NOTE([62, 66, 69, 74][k % 4]), 2.0, 0.8, ((1, 1), (2.4, 0.5), (5.9, 0.2))), a + 0.2 + k * 0.42, 0.06, 0.4)
add(cheer(b - a + 1.2), a, 0.22); march(a + 0.3, SH['gust1'][0] + 0.4, 1.0, True, True)
# gusts: wind, groan, crowd "ooh" then relief; second gust: music gone
for g, big in [(T['gust1'], 0), (T['gust2'], 1)]:
    add(whoosh(1.6 + big, 200, 1500) * 1.2, g - 0.2, 0.3 + 0.1 * big); add(creak(1.6 + big, 110 - 30 * big), g + 0.3, 0.6)
add(bp(noise(1.0), 400, 1200) * np.sin(np.pi * tt(1.0)) * 0.5, T['gust1'] + 0.4, 0.15)
add(cheer(1.3), T['gust1'] + 2.0, 0.2)
add(strings([NOTE(50), NOTE(53), NOTE(56)], 2.6, 0.6, 0.3, 1200), T['gust2'], 0.12)
# the sea pours in
a = SH['ports'][0]; add(splash(1.6) * 1.2 + lp(noise(1.6), 800) * 0.8 * np.minimum(1, tt(1.6) / 0.3), a + 0.1, 0.4)
a, b = SH['flood']; s = b - a; add(lp(noise(s), 1200) * 0.9 * np.minimum(1, tt(s) / 0.2) + bubbles(s, 30) * 0.3, a, 0.4)
# going down: deep rumble, groan, descending strings, bubbles; cut to silence
a, b = SH['sink']; s = b - a; u = tt(s)
add(lp(noise(s), 120) * 1.4 * np.sin(np.pi * u / s) ** 0.5, a, 0.4); add(creak(2.5, 70), a + 0.4, 0.8); add(bubbles(s, 20) * np.minimum(1, u / 2) * 0.4, a, 0.5)
add(lp(noise(0.4), 600) * np.exp(-tt(0.4) / 0.08) * 1.5, a + 1.6, 0.4)   # a mast cracks
for k, m in enumerate([62, 60, 58, 57, 55]): add(strings([NOTE(m), NOTE(m - 7)], 1.2, 0.3, 0.5, 1400), a + 0.3 + k * 0.85, 0.11)
# shock: near silence, a gasp, the flag drops
a = SH['shock'][0]; add(bp(noise(0.35), 600, 3000) * np.sin(np.pi * tt(0.35) / 0.35) * 0.6, a + 0.15, 0.2); add(lp(noise(0.08), 900) * np.exp(-tt(0.08) / 0.015), a + 1.1, 0.2)
# inquiry: "dun-dun" points, both point up, gavel
a = SH['inquiry'][0]
for k in range(4): add(pluck(NOTE([45, 44, 45, 44][k]), 0.4), a + 0.2 + k * 0.45, 0.35)
add(pluck(NOTE(57), 0.5), a + 1.05, 0.3); add(pluck(NOTE(60), 0.6), a + 1.15, 0.3)
for d in [0, 0.18]: add(lp(noise(0.25), 900) * np.exp(-tt(0.25) / 0.03) * 2.2 + tone(120, 0.25, 0.04), T['gavel'] + d, 0.45)
add(brass([NOTE(46)], 0.7, 0.03, 0.3, 900) * (1 + 0.25 * np.sin(2 * np.pi * 6 * tt(0.7))), T['gavel'] + 0.45, 0.15)
# seabed: a music box, the worm's shiver, a time-lapse whoosh
a, b = SH['seabed']
for k, m in enumerate([74, 78, 81, 78, 76, 74, 73, 74]): add(tone(NOTE(m), 1.0, 0.5, ((1, 1), (3.0, 0.2))), a + 0.3 + k * 0.45, 0.07, 0.2)
s = tt(0.9); add(np.sin(2 * np.pi * 260 * s) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 28 * s))) * 0.3 * np.sin(np.pi * s / 0.9), T['worm'], 0.12, 0.1)
add(glide(900, 500, 0.4) * np.exp(-tt(0.4) / 0.15), T['worm'] + 1.1, 0.1)   # "nope"
add(whoosh(1.2, 100, 900), b - 1.0, 0.25)
# salvage 1961: rising strings, murmur, water streaming, flashbulbs
a, b = SH['salvage']; s = b - a
add(crowdbed(s, 0.6), a, 0.12); add(lp(noise(s), 2500) * np.minimum(1, tt(s) / 1.5) * 0.4, a, 0.25)
for k, ch in enumerate([[50, 57, 62, 66], [55, 59, 62, 67], [57, 61, 64, 69], [62, 66, 69, 74]]): add(strings([NOTE(c) for c in ch], 1.4, 0.4, 0.5, 2200), a + k * 1.1, 0.07)
for f in E['flashes']: add(bp(noise(0.12), 2000, 9000) * np.exp(-tt(0.12) / 0.01) + glide(3000, 1200, 0.12) * np.exp(-tt(0.12) / 0.03) * 0.3, f, 0.15, rng.uniform(-0.4, 0.4))
# museum: hushed wonder, a last warm chord, a phone shutter
a, b = SH['museum']; s = b - a
add(strings([NOTE(50), NOTE(57), NOTE(62), NOTE(66), NOTE(69)], s, 1.0, 1.5, 1600), a, 0.08)
for k, m in enumerate([74, 78, 81, 86]): add(tone(NOTE(m), 2.0, 0.9, ((1, 1), (2.0, 0.2))), a + 0.6 + k * 0.5, 0.05, 0.2)
add(bp(noise(0.06), 1500, 7000) * np.exp(-tt(0.06) / 0.01), a + 2.2, 0.08, 0.3)

fade = env([(0, 0), (0.25, 1), (DUR - 1.2, 1), (DUR, 0)]); L *= fade; R *= fade
out = np.stack([L, R], 1); out /= np.max(np.abs(out)) / 0.89
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True); sf.write(os.path.join(HERE, 'out', 'mix.wav'), out, SR, subtype='PCM_24'); print('mix.wav', out.shape[0] / SR, 's')
