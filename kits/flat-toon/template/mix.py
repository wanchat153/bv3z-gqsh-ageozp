"""Wordless score + foley for Butter Side Down, all synthesised. Times come from events.json (exported from src/timeline.js).
Writes out/mix.wav (48 kHz stereo, DUR s)."""
import numpy as np, soundfile as sf, os, json
from scipy.signal import butter, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
E = json.load(open(os.path.join(HERE, 'events.json')))
T, F, DUR, LAY = E['T'], E['F'], E['DUR'], E['layers']
TAU = np.array(E['tau'])
SR = 48000; N = int(SR * DUR)
rng = np.random.default_rng(11)
t = np.arange(N) / SR
L = np.zeros(N); R = np.zeros(N)
def lp(x, f, o=2): return sosfilt(butter(o, min(f, SR / 2 - 100), 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, a, b, o=2): return sosfilt(butter(o, [a, min(b, SR / 2 - 100)], 'band', fs=SR, output='sos'), x)
def env(points): xs, ys = zip(*points); return np.interp(t, xs, ys)
def add(x, at, g=1.0, pan=0.0):
    i = int(at * SR)
    if i < 0: x = x[-i:]; i = 0
    x = x[: max(0, N - i)]
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    L[i:i + len(x)] += x * g * l * 1.414; R[i:i + len(x)] += x * g * r * 1.414
def noise(sec): return rng.standard_normal(int(sec * SR))
def tt(sec): return np.arange(int(sec * SR)) / SR
def tone(f, sec, dec=0.3, harm=((1, 1.0),), att=0.004):
    s = tt(sec); x = sum(a * np.sin(2 * np.pi * f * k * s) for k, a in harm); return x * np.minimum(1, s / att) * np.exp(-s / dec)
def pluck(f, sec=0.6, bright=0.5):
    n = int(sec * SR); p = max(2, int(SR / f)); buf = rng.uniform(-1, 1, p); out = np.zeros(n)
    for i in range(0, n, p):
        k = min(p, n - i); out[i:i + k] = buf[:k]; buf = (buf + np.roll(buf, 1)) * 0.5 * (0.994 + 0.004 * bright)
    return out * np.minimum(1, tt(sec) / 0.002)
def marimba(f, sec=0.5): return tone(f, sec, 0.18, ((1, 1), (4, 0.25), (10, 0.05)), 0.002)
def brass(fs, sec, att=0.03, rel=0.25, bright=2500):
    s = tt(sec); x = sum(2 * ((f * s + 0.13 * i) % 1) - 1 for i, f in enumerate(fs)) / len(fs)
    e = np.minimum(1, s / att) * np.minimum(1, (sec - s) / rel); return lp(x, bright) * e
def glide(f0, f1, sec, wav='sin'):
    s = tt(sec); f = f0 * (f1 / f0) ** (s / sec); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) if wav == 'sin' else (2 * ((ph / (2 * np.pi)) % 1) - 1)
NOTE = lambda m: 440.0 * 2 ** ((m - 69) / 12)
def film_of(w): return float(np.interp(w, TAU, np.arange(len(TAU)) / 10))
slow = lambda a, b: (a, b)

# ---------- slow-motion mask: room sound sinks and muffles while time stretches ----------
S1 = (F['C']['rel'] + 0.2, T['slow1'] + 0.4); S2 = (F['F']['rel'] + 0.2, T['slow2'] + 0.3)
room = env([(0, 1), (S1[0] - 0.2, 1), (S1[0] + 0.2, 0.12), (S1[1] - 0.3, 0.12), (S1[1] + 0.2, 1), (S2[0] - 0.2, 1), (S2[0] + 0.2, 0.12), (S2[1] - 0.3, 0.12), (S2[1] + 0.2, 1), (DUR, 1)])

# kitchen room tone: fridge hum + faint birds through the window
hum = (np.sin(2 * np.pi * 60 * t) * 0.3 + np.sin(2 * np.pi * 120 * t) * 0.15) * 0.05 + lp(noise(DUR), 250) * 0.04
L += hum * room; R += hum * room
for k in range(26):
    at = rng.uniform(0.5, DUR - 2)
    if S1[0] < at < S1[1] or S2[0] < at < S2[1]: continue
    for j in range(rng.integers(2, 4)):
        s = tt(0.08); f0 = rng.uniform(3000, 4300); x = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 0.2 * np.sin(2 * np.pi * 20 * s))) / SR) * np.sin(np.pi * s / 0.08)
        add(x, at + j * 0.11, 0.018, -0.6)
# wall clock: ticks once a second of WORLD time (so it crawls in slow motion, pitched down)
w = 0.0
while w < TAU[-1]:
    ft = film_of(w)
    if ft < DUR - 0.2:
        sl = S1[0] < ft < S1[1] or S2[0] < ft < S2[1]
        f = 900 if sl else 2400; d = 0.05 if sl else 0.015
        add(tone(f, 0.12, d, ((1, 1), (2.3, 0.4))) + bp(noise(0.12), 1500, 6000) * np.exp(-tt(0.12) / d) * 0.5, ft, 0.05 if not sl else 0.08, 0.35)
    w += 1.0

# ---------- foley ----------
def scrape(sec): s = tt(sec); return bp(noise(sec), 1800, 6500) * np.sin(np.pi * s / sec) ** 0.7 * (0.6 + 0.4 * np.sin(2 * np.pi * 40 * s))
def butter_strokes(b0, b1, freq):
    at = b0
    while at < b1 - 0.05:
        add(scrape(1 / freq * 0.9), at, 0.22, 0.15); at += 1 / freq
butter_strokes(T['aButter0'], T['aButter1'], 4.5); butter_strokes(T['bButter0'], T['bButter1'], 7); butter_strokes(T['cButter0'], T['cButter1'], 7); butter_strokes(T['fButter0'], T['fButter1'], 7)
def tap(g=0.3, f=900): s = tt(0.09); return (bp(noise(0.09), f * 0.6, f * 2.2) * np.exp(-s / 0.012) + tone(f * 0.35, 0.09, 0.02) * 0.6)
for k, at in [('A', T['aPlace']), ('B', T['bPlace']), ('C', T['cPlace']), ('F', T['fPlace'])]: add(tap(), at, 0.35, 0.2)
for k in ['B', 'C', 'F']: add(tap(f=700), T[k.lower() + 'Pick'], 0.2, -0.2)
def slidesnd(sec): s = tt(sec); return bp(noise(sec), 500, 2600) * np.minimum(1, s / 0.05) * (1 - s / sec) * 0.6
add(slidesnd(0.4), T['aPlace'] + 0.05, 0.25, 0.3); add(slidesnd(0.35), T['bSneeze'] + 0.05, 0.35, 0.3)
add(slidesnd(0.35), T['cPush'], 0.25, 0.3); add(slidesnd(0.3), T['fPush'], 0.25, 0.3)
def whoosh(sec, f0=300, f1=1800):
    s = tt(sec); u = s / sec; out = np.zeros_like(s)
    for i in range(12):
        a, b = int(i * len(s) / 12), int((i + 1) * len(s) / 12); fc = f0 * (f1 / f0) ** u[a]; out[a:b] = bp(noise(sec), fc * 0.7, fc * 1.4)[a:b]
    return out * np.sin(np.pi * u)
def splat(scale=1.0):
    sec = 0.5 * scale; s = tt(sec)
    thud = lp(noise(sec), 260 / scale) * np.exp(-s / (0.035 * scale)) * 2.2
    squish = bp(noise(sec), 400 / scale, 2600 / scale) * np.exp(-s / (0.07 * scale)) * (0.5 + 0.5 * np.sin(2 * np.pi * 26 / scale * s))
    blorp = glide(420 / scale, 140 / scale, sec) * np.exp(-s / (0.09 * scale)) * 0.5
    return thud + squish * 0.8 + blorp
add(whoosh(0.35, 500, 1500), F['A']['land'] - 0.35, 0.12, 0.3); add(splat(), F['A']['land'], 0.6, 0.3)
add(whoosh(0.35, 500, 1500), F['B']['land'] - 0.35, 0.12, 0.3); add(splat(), F['B']['land'], 0.6, 0.35)
# sneeze: "ah… ah…" rising breaths then the burst
for k, at in enumerate([T['bPlace'] + 0.12, T['bPlace'] + 0.27]): add(lp(noise(0.14), 1500 + 500 * k) * np.sin(np.pi * tt(0.14) / 0.14) * 0.5 + tone(260 + 70 * k, 0.14, 0.1) * 0.25, at, 0.4)
s = tt(0.4); add(bp(noise(0.4), 500, 5000) * np.exp(-s / 0.07) * np.minimum(1, s / 0.008) + tone(480, 0.4, 0.06, ((1, 1), (2, 0.4))) * 0.4, T['bSneeze'], 0.75)
add(lp(noise(0.25), 220) * np.exp(-tt(0.25) / 0.05) * 1.2, T['bSneeze'] + 0.02, 0.4)   # the table jolts
# horror stings (brass stab), sad trombone after the second splat
add(brass([NOTE(58), NOTE(61), NOTE(64)], 0.45, 0.01, 0.2, 3000), F['A']['land'] + 0.08, 0.16)
for k, m in enumerate([55, 54, 53]): add(brass([NOTE(m)], 0.32, 0.03, 0.1, 1800) * (1 + 0.15 * np.sin(2 * np.pi * 6 * tt(0.32))), F['B']['land'] + 0.3 + k * 0.34, 0.2)
s = tt(1.2); add(brass([NOTE(52)], 1.2, 0.03, 0.4, 1600) * (1 + 0.3 * np.sin(2 * np.pi * 5.5 * s)) * np.exp(-s / 0.9), F['B']['land'] + 1.32, 0.2)
# suspicious push: two plucked "dun dun"
add(pluck(NOTE(45), 0.5), T['cPlace'] + 0.05, 0.4); add(pluck(NOTE(44), 0.6), T['cPush'] - 0.05, 0.4)

# ---------- playful opening bed (marimba + pizz), stops dead at the push into slow motion ----------
bpm = 112; beat = 60 / bpm
prog = [(48, [60, 64, 67]), (53, [65, 69, 72]), (43, [59, 62, 67]), (48, [60, 64, 67])]
mel = [76, 79, 81, 79, 76, 74, 72, None, 74, 76, 74, 72, 71, None, 67, None]
at = 0.3; k = 0
while at < F['C']['rel'] - 0.3:
    root, ch = prog[(k // 4) % 4]
    duck = 0.45 if (F['A']['land'] - 0.2 < at < F['A']['land'] + 1.1) or (F['B']['land'] - 0.2 < at < T['cPick']) else 1.0
    add(pluck(NOTE(root - 12 if k % 2 else root), 0.5), at, 0.22 * duck, -0.15)
    if k % 2 == 1: [add(marimba(NOTE(c), 0.3), at + 0.008 * i, 0.06 * duck, 0.2) for i, c in enumerate(ch)]
    m = mel[k % 16]
    if m and k >= 4: add(marimba(NOTE(m), 0.4), at, 0.1 * duck, 0.25)
    at += beat; k += 1

# ---------- slow motion C: low swell, slow heartbeat, a long stretched whoosh, giant slow splat ----------
a, b = S1; sec = b - a; s = tt(sec)
pad = sum(np.sin(2 * np.pi * NOTE(m) * s + i) for i, m in enumerate([38, 45, 50, 53])) / 4
pad = lp(pad + 0.25 * np.sign(np.sin(2 * np.pi * NOTE(38) * s)), 700) * np.minimum(1, s / 1.2) * np.minimum(1, (sec - s) / 0.6) * (0.6 + 0.4 * s / sec)
add(pad, a, 0.09)
hb = a + 0.6
while hb < F['C']['land'] - 0.3:
    for d, g in [(0, 1), (0.22, 0.6)]: add(lp(noise(0.2), 90) * np.exp(-tt(0.2) / 0.05) * 2 + tone(48, 0.2, 0.06) * 0.8, hb + d, 0.22 * g)
    hb += 1.15 - 0.4 * (hb - a) / sec
add(whoosh(F['C']['land'] - a - 0.3, 150, 700), a + 0.3, 0.13, 0.1)
add(splat(3.2), F['C']['land'], 0.55, 0.2)
add(brass([NOTE(46), NOTE(49), NOTE(52)], 1.4, 0.4, 0.6, 1200), F['C']['land'] + 0.1, 0.12)

# ---------- thinking, the idea ----------
for k in range(6): add(marimba(NOTE([67, 69, 67, 64, 65, 67][k]), 0.35), T['think'] + 0.1 + k * 0.2, 0.05, -0.2)
add(tone(NOTE(96), 2.0, 0.6, ((1, 1), (2.76, 0.4), (5.4, 0.15))), T['eureka'], 0.22)
add(tone(NOTE(91), 1.6, 0.5, ((1, 1), (2.76, 0.3))), T['eureka'] + 0.06, 0.12)
s = tt(0.9); add(np.sign(np.sin(2 * np.pi * 120 * s)) * 0.15 * np.exp(-s / 0.4) * np.minimum(1, s / 0.05), T['eureka'] + 0.05, 0.08)   # the bulb's buzz
add(glide(500, 1500, 0.35) * np.sin(np.pi * tt(0.35) / 0.35) * 0.4, T['eureka'] - 0.1, 0.12)

# ---------- time-lapse: a fast bouncy tune, a crate thunk per layer, a slide-whistle hop ----------
bpm2 = 150; b2 = 60 / bpm2; at = T['crates'] - 0.6; k = 0
mel2 = [72, 74, 76, 77, 79, None, 79, None, 81, 79, 77, 76, 74, None, 72, None]
while at < T['onTop'] + 0.2:
    root, ch = prog[(k // 4) % 4]
    add(pluck(NOTE(root), 0.35), at, 0.22, -0.15)
    add(tone(1300, 0.05, 0.012) + bp(noise(0.05), 1800, 5000) * np.exp(-tt(0.05) / 0.006), at + b2 / 2, 0.06, 0.4)
    m = mel2[k % 16]
    if m: add(marimba(NOTE(m), 0.25), at, 0.1, 0.25)
    at += b2; k += 1
for i, lt in enumerate(LAY):
    add(lp(noise(0.3), 400) * np.exp(-tt(0.3) / 0.05) * 1.6 + tone(90 + 6 * i, 0.3, 0.07) * 0.7, lt + 0.05, 0.45, -0.05)
    add(bp(noise(0.15), 700, 2500) * np.exp(-tt(0.15) / 0.03) * 0.6, lt + 0.07, 0.25, 0.05)       # wood creak
add(tap(f=500), T['ladder'] + 0.05, 0.4, -0.2)
add(glide(400, 1600, 0.4) * np.minimum(1, tt(0.4) / 0.02) * 0.5, T['climb'], 0.18, -0.1)
add(tap(f=600), T['onTop'], 0.4, -0.1)

# ---------- up top: nervous strings, a snare roll through the long fall, landing butter-up, ta-da ----------
s = tt(0.9); add(glide(NOTE(64), NOTE(65), 0.9, 'saw') * 0.2 * np.minimum(1, s / 0.1) * np.minimum(1, (0.9 - s) / 0.2), T['fLook'], 0.12, -0.3)
add(pluck(NOTE(45), 0.5), T['fPlace'] + 0.1, 0.35); add(pluck(NOTE(44), 0.6), T['fPush'] - 0.05, 0.35)
a, b = F['F']['rel'] + 0.25, F['F']['land']; sec = b - a; s = tt(sec)
roll = bp(noise(sec), 1500, 7000) * (0.55 + 0.45 * np.sin(2 * np.pi * 15 * s) ** 2) * (0.15 + 0.85 * (s / sec) ** 1.6)
add(roll, a, 0.22, 0.1)
pad2 = sum(np.sin(2 * np.pi * NOTE(m) * s * (1 + 0.04 * s / sec) + i) for i, m in enumerate([43, 50, 55, 59])) / 4
add(lp(pad2, 900) * np.minimum(1, s / 0.8) * (0.4 + 0.6 * s / sec), a, 0.08)
add(tap(f=1100) * 0.8 + lp(noise(0.09), 500) * np.exp(-tt(0.09) / 0.02) * 0.6, F['F']['land'], 0.45, 0.3)
for d in [0.09, 0.15]: add(tap(f=1400) * 0.5, F['F']['land'] + d, 0.2, 0.3)
add(lp(noise(0.25), 120) * np.exp(-tt(0.25) / 0.05) * 2, F['F']['land'] + 0.02, 0.5)   # bass drum under the ta-da
add(brass([NOTE(60), NOTE(64), NOTE(67)], 0.22, 0.01, 0.06, 4000), F['F']['land'] + 0.1, 0.2)
s = tt(2.0); add(brass([NOTE(65), NOTE(69), NOTE(72)], 2.0, 0.02, 0.8, 4000) * (1 + 0.06 * np.sin(2 * np.pi * 5.5 * s)), F['F']['land'] + 0.34, 0.2)
for m in [72, 76, 79, 84]: add(marimba(NOTE(m), 0.6), F['F']['land'] + 0.34 + (m - 72) * 0.025, 0.1)
# a happy little march under the cheering, cut dead by the gulp
at = F['F']['land'] + 2.3; k = 0
while at < T['gulp'] - 0.05:
    root, ch = prog[k // 4 % 4]
    add(pluck(NOTE(root), 0.4), at, 0.2, -0.1); add(marimba(NOTE(ch[k % 3] + 12), 0.3), at + beat / 2, 0.06, 0.2)
    at += beat; k += 1

# ---------- the pup: paws, sniffs, chomps, gulp, lick ----------
def paws(t0, t1, step=0.14):
    at = t0
    while at < t1: add(lp(noise(0.04), 1800) * np.exp(-tt(0.04) / 0.008), at, 0.08, 0.4); at += step
paws(7.45, 8.5); paws(22.7, 23.25); paws(24.0, 24.4); paws(26.25, 27.8); paws(T['dogBack'], T['gulp'] - 0.1)
for k in range(5): add(bp(noise(0.07), 1200, 5000) * np.sin(np.pi * tt(0.07) / 0.07) ** 2, 8.7 + k * 0.22, 0.12, 0.4)
def chomp(): s = tt(0.12); return bp(noise(0.12), 1500, 6000) * np.exp(-s / 0.02) * (rng.random(len(s)) > 0.7) * 2 + lp(noise(0.12), 400) * np.exp(-s / 0.02)
for t0 in [22.0, 23.3, 24.4]:
    for k in range(3): add(chomp(), t0 + 0.08 + k * 0.17, 0.3, 0.35)
for k in range(2): add(chomp(), T['gulp'] + 0.05 + k * 0.12, 0.35, 0.35)
s = tt(0.35); add(glide(320, 90, 0.35) * np.exp(-s / 0.12) * 0.8, T['gulp'] + 0.4, 0.4, 0.3)   # gulp
def lick(): s = tt(0.25); return bp(noise(0.25), 800, 3500) * np.sin(np.pi * s / 0.25) * (0.5 + 0.5 * np.sin(2 * np.pi * 14 * s)) * 0.5
add(lick(), 25.15, 0.3, 0.3); add(lick(), T['gulp'] + 0.85, 0.35, 0.3); add(lick(), T['gulp'] + 1.2, 0.3, 0.3)
# deadpan: silence, one cricket, a lone low pluck to close
for k in range(3): add(tone(4200, 0.05, 0.02) * np.sin(2 * np.pi * 30 * tt(0.05)), T['deadpan'] + 0.8 + k * 0.09, 0.05, -0.5)
add(pluck(NOTE(40), 1.5), 45.2, 0.35); add(marimba(NOTE(79), 0.8), 45.75, 0.08)

fade = env([(0, 0), (0.4, 1), (T['fade'], 1), (DUR, 0)]); L *= fade; R *= fade
out = np.stack([L, R], 1); out /= np.max(np.abs(out)) / 0.89
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), out, SR, subtype='PCM_24')
print('mix.wav', out.shape[0] / SR, 's')
