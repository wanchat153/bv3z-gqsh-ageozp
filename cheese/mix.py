"""The Bank That Keeps Cheese: wordless score + foley, all synthesised, keyed to the shot list (events.json).
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


def mandolin(f, s=0.35, trem=0.0):
    x = pluck(f, s, 1.0) * 0.6; y = pluck(f * 1.003, s, 1.0) * 0.4; x[: len(y)] += y[: len(x)]
    if trem: u = tt(s); x = x * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * trem * u)))[: len(x)]
    return x
def accordion(fs, s, att=0.05, rel=0.12):
    u = tt(s); x = sum(sum((2 * ((f * d * u + i * 0.1) % 1) - 1) for d in (0.997, 1.003)) for i, f in enumerate(fs)) / (2 * len(fs))
    return bp(x, 200, 3500) * np.minimum(1, u / att) * np.minimum(1, np.maximum(0, s - u) / rel) * (0.85 + 0.15 * np.sin(2 * np.pi * 5.5 * u))
def choir(fs, s, att=0.8, rel=1.0):
    u = tt(s); x = sum(np.sin(2 * np.pi * f * u * (1 + 0.004 * np.sin(2 * np.pi * (4.7 + i) * u))) + 0.4 * np.sin(4 * np.pi * f * u) for i, f in enumerate(fs)) / len(fs)
    return lp(x, 2600) * np.minimum(1, u / att) * np.minimum(1, np.maximum(0, s - u) / rel)
def moo(): s = 1.0; u = tt(s); f = 140 * (1 + 0.25 * np.sin(np.pi * u / s)); ph = 2 * np.pi * np.cumsum(f) / SR; x = np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.3 * np.sin(3 * ph); return lp(x, 900) * np.sin(np.pi * u / s) ** 0.7
def roll(s, rpm=3): u = tt(s); return lp(noise(s), 300) * (0.7 + 0.3 * np.sin(2 * np.pi * rpm * u)) + bp(noise(s), 800, 2500) * 0.15 * (rng.random(len(u)) > 0.97)
def ting(f=2300): return tone(f, 0.5, 0.15, ((1, 1), (2.7, 0.4), (5.1, 0.2)), 0.001)
def stampsnd(): u = tt(0.2); return lp(noise(0.2), 600) * np.exp(-u / 0.02) * 2 + tone(110, 0.2, 0.05)
def clunk(): u = tt(0.9); return lp(noise(0.9), 150) * np.exp(-u / 0.12) * 2.5 + tone(55, 0.9, 0.3) + bp(noise(0.9), 1500, 5000) * np.exp(-u / 0.03) * 0.5
def siren(s): u = tt(s); f = 700 + 250 * np.sign(np.sin(2 * np.pi * 1.6 * u)); return np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.5
def whir(s): u = tt(s); return (np.sin(2 * np.pi * 180 * u) * 0.3 + bp(noise(s), 2000, 6000) * 0.25) * (0.7 + 0.3 * np.sin(2 * np.pi * 2.0 * u))
def brushsnd(s): u = tt(s); return bp(noise(s), 2500, 7000) * (0.5 + 0.5 * np.sin(2 * np.pi * 7 * u)) * 0.6
def steps(a, b, rate=4.5, g=0.08, pan=0):
    at = a
    while at < b: add(lp(noise(0.05), 1600) * np.exp(-tt(0.05) / 0.01), at, g, pan); at += 1 / rate
SH_ = SH
# ---------------- ambience ----------------
for k in ['dairy', 'problem', 'cows1', 'cows2']:
    a, b = SH_[k]; s = b - a; add(lp(noise(s), 300) * 0.05 + bp(noise(s), 300, 900) * 0.02, a, 1.0)
a, b = SH_['street']; s = b - a; add(crowdbed(s, 0.4) * 0.5 + lp(noise(s), 500) * 0.05, a, 0.6)
for k in ['lobby', 'door']: a, b = SH_[k]; s = b - a; add(lp(noise(s), 400) * 0.03, a, 1.0)
for k in ['cathedral', 'money', 'aging', 'later', 'rise']: a, b = SH_[k]; s = b - a; add(lp(noise(s), 250) * 0.06 + bp(noise(s), 120, 300) * 0.03, a, 1.0)
for k in ['sneak', 'loading']: a, b = SH_[k]; s = b - a; add(lp(noise(s), 160) * 0.07, a, 1.0)
a, b = SH_['caught']; s = b - a; add(lp(noise(s), 400) * 0.06, a, 1.0)
# ---------------- score: tarantella in A minor / C major ----------------
bpm = 132; beat = 60 / bpm
prog = [(57, [69, 72, 76]), (62, [69, 74, 77]), (64, [68, 71, 76]), (57, [69, 72, 76]), (60, [67, 72, 76]), (65, [69, 72, 77]), (67, [71, 74, 79]), (60, [67, 72, 76])]
mel = [76, 77, 76, 74, 72, 74, 76, None, 77, 79, 77, 76, 74, 72, 71, None]
def tarantella(t0, t1, g=1.0, drums=True, tempo=1.0, major=False):
    at = t0; k = 0; b = beat / tempo
    while at < t1 - 0.05:
        root, ch = prog[((k // 4) % 4) + (4 if major else 0)]
        add(pluck(NOTE(root - 24), 0.4), at, 0.24 * g, -0.1)
        if k % 2: [add(mandolin(NOTE(c), 0.25), at + 0.012 * i, 0.06 * g, 0.25) for i, c in enumerate(ch)]
        m = mel[k % 16]
        if m: add(mandolin(NOTE(m + (0 if major else 0)), 0.3, 18), at, 0.11 * g, 0.2)
        if drums: add(bp(noise(0.06), 3000, 9000) * np.exp(-tt(0.06) / 0.01), at, (0.05 if k % 2 else 0.1) * g, -0.3)
        at += b; k += 1
tarantella(0.3, SH_['problem'][0] + 0.2, 0.9, major=True)
add(accordion([NOTE(57), NOTE(60), NOTE(64)], 3.4, 0.4, 1.0), SH_['problem'][0], 0.09)             # the sigh
for k in range(8): add(tone(1600, 0.06, 0.02) + bp(noise(0.06), 2000, 6000) * np.exp(-tt(0.06) / 0.01), T['flip0'] + k * 0.32, 0.09, 0.3)   # pages
add(moo(), T['moo1'], 0.2, 0.3)
tarantella(SH_['street'][0], SH_['lobby'][0], 1.0); add(roll(SH_['street'][1] - SH_['street'][0]), SH_['street'][0], 0.35); steps(SH_['street'][0], SH_['street'][1], 5, 0.08)
add(whoosh(0.35, 400, 2400), SH_['street'][1] - 0.35, 0.25)
for k in ['tap1', 'tap2']: add(ting(), T[k], 0.22, -0.1)
add(bp(noise(0.5), 1500, 5000) * np.sin(np.pi * tt(0.5) / 0.5) * 0.3, T['sniff'], 0.12); add(stampsnd(), T['stamp'], 0.45)
add(pluck(NOTE(52), 0.5), T['tap1'] - 0.1, 0.25); add(pluck(NOTE(55), 0.5), T['sniff'], 0.25); add(mandolin(NOTE(76), 0.6, 18), T['stamp'] + 0.05, 0.15)
for k in range(6): add(lp(noise(0.08), 900) * np.exp(-tt(0.08) / 0.02) + tone(400, 0.08, 0.02), T['spin'] + k * 0.12, 0.2)
add(clunk(), T['open'], 0.55); add(lp(noise(1.2), 4000) * np.exp(-tt(1.2) / 0.4) * 0.4, T['open'] + 0.1, 0.25)
add(choir([NOTE(57), NOTE(64), NOTE(69), NOTE(72), NOTE(76)], 5.4, 0.6, 1.6), T['open'] + 0.6, 0.18)
add(tone(NOTE(93), 2.5, 0.8, ((1, 1), (2.76, 0.3))), T['reveal'], 0.12)
tarantella(SH_['money'][0], SH_['aging'][0] + 0.2, 1.0, major=True); add(bp(noise(0.3), 300, 2000) * np.exp(-tt(0.3) / 0.06), T['bag'], 0.3)
add(moo(), T['munch'], 0.2, 0.3); [add(lp(noise(0.1), 2000) * np.exp(-tt(0.1) / 0.03), T['munch'] + 0.2 + k * 0.22, 0.1, 0.3) for k in range(4)]
a, b = SH_['aging']; s = b - a; add(whir(s - 0.8), a, 0.2); add(brushsnd(s - 0.8), a, 0.12)
for k in range(10): add(ting(1900), a + 0.3 + k * 0.33, 0.08, -0.2)
at = a; k = 0
while at < b - 0.8: add(mandolin(NOTE([76, 79, 81, 84, 81, 79][k % 6]), 0.25, 24), at, 0.08, 0.2); at += beat / 2; k += 1     # time-lapse
for i in range(4): add(lp(noise(0.12), 500) * np.exp(-tt(0.12) / 0.02) * 1.2 + tone(70, 0.12, 0.03), T['lightsout'] + i * 0.12, 0.3)
a, b = SH_['sneak']; at = a + 0.2; k = 0
while at < SH_['loading'][0] + 2.0: add(pluck(NOTE([45, 48, 45, 50, 45, 48, 52, 51][k % 8]), 0.25), at, 0.3, -0.1); at += beat; k += 1
add(lp(noise(0.5), 900) * np.sin(np.pi * tt(0.5) / 0.5) * 0.5, T['door2'], 0.2)
steps(a + 0.3, b, 3, 0.05)
a, b = SH_['loading']; add(bp(noise(1.8), 1500, 3500) * (0.5 + 0.5 * np.sin(2 * np.pi * 6 * tt(1.8))) * 0.3, a, 0.15)   # cart squeak
for k in range(8): add(lp(noise(0.12), 400) * np.exp(-tt(0.12) / 0.03), a + 0.2 + k * 0.2, 0.2)
s = b - T['slip']; add(roll(s, 6) * np.linspace(0.4, 1.4, int(s * SR)), T['slip'], 0.5); add(glide(1200, 300, 0.5) * np.sin(np.pi * tt(0.5) / 0.5), T['slip'], 0.12)
steps(T['slip'], b, 8, 0.1)
a, b = SH_['caught']; s = b - a; add(siren(s), a + 0.1, 0.08, 0.3); add(lp(noise(1.6), 200) * 0.6 + bp(noise(1.6), 3000, 8000) * (rng.random(int(1.6 * SR)) > 0.95) * 0.6, a, 0.25)
add(brass([NOTE(45)], 0.9, 0.03, 0.4, 900) * (1 + 0.25 * np.sin(2 * np.pi * 6 * tt(0.9))), a + 1.6, 0.18)
add(bp(noise(0.3), 2000, 9000) * np.exp(-tt(0.3) / 0.05), b - 0.1, 0.2)
a, b = SH_['later']; s = b - a + SH_['rise'][1] - SH_['rise'][0]
add(accordion([NOTE(60), NOTE(64), NOTE(67)], 2.2, 0.3, 0.8), a + 0.1, 0.09); add(accordion([NOTE(65), NOTE(69), NOTE(72)], 2.2, 0.3, 0.8), a + 2.2, 0.09)
add(bp(noise(0.25), 2000, 6000) * np.exp(-tt(0.25) / 0.05), T['cut'], 0.2); add(lp(noise(0.15), 1500) * np.exp(-tt(0.15) / 0.03), T['bite'], 0.25)
add(choir([NOTE(60), NOTE(64), NOTE(67), NOTE(72)], SH_['rise'][1] - SH_['rise'][0] + 0.5, 1.0, 1.4), SH_['rise'][0], 0.16)
for k, m in enumerate([72, 76, 79, 84]): add(mandolin(NOTE(m), 1.2, 16), SH_['rise'][0] + 0.4 + k * 0.5, 0.08, 0.2)
fade = env([(0, 0), (0.25, 1), (DUR - 1.0, 1), (DUR, 0)]); L *= fade; R *= fade
out = np.stack([L, R], 1); out /= np.max(np.abs(out)) / 0.89
OUTD = os.environ.get('OUT') or os.path.join(HERE, 'out'); os.makedirs(OUTD, exist_ok=True); sf.write(os.path.join(OUTD, 'mix.wav'), out, SR, subtype='PCM_24'); print('mix.wav', out.shape[0] / SR, 's')
