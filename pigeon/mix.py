"""Pigeon vs Ice Cream: wordless score + foley, all synthesised. Times come from events.json (export_events.mjs).
Writes out/mix.wav (48 kHz stereo, DUR s)."""
import numpy as np, soundfile as sf, os, json
from scipy.signal import butter, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
E = json.load(open(os.path.join(HERE, 'events.json')))
T, EV, DUR, SL = E['T'], E['EV'], E['DUR'], E['SLOW']
SR = 48000; N = int(SR * DUR)
rng = np.random.default_rng(23)
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
    e = np.minimum(1, s / att) * np.minimum(1, np.maximum(0, sec - s) / rel); return lp(x, bright) * e
def glide(f0, f1, sec, wav='sin'):
    s = tt(sec); f = f0 * (f1 / f0) ** (s / sec); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) if wav == 'sin' else (2 * ((ph / (2 * np.pi)) % 1) - 1)
NOTE = lambda m: 440.0 * 2 ** ((m - 69) / 12)
ev = lambda typ: [e for e in EV if e['type'] == typ]

S1 = (SL['a1'], SL['b1'] + 0.4); S2 = (SL['a2'], SL['b2'] + 0.3)
inslow = lambda x: S1[0] < x < S1[1] or S2[0] < x < S2[1]
room = env([(0, 1), (S1[0], 1), (S1[0] + 0.3, 0.15), (S1[1] - 0.4, 0.15), (S1[1], 1), (S2[0], 1), (S2[0] + 0.25, 0.3), (S2[1] - 0.3, 0.3), (S2[1], 1), (DUR, 1)])

# ---------- park ambience: breeze, birds, leaves ----------
breeze = lp(noise(DUR), 500) * 0.05 * (0.7 + 0.3 * np.sin(2 * np.pi * 0.11 * t))
L += breeze * room; R += lp(noise(DUR), 500) * 0.05 * (0.7 + 0.3 * np.sin(2 * np.pi * 0.13 * t + 1)) * room
for k in range(40):
    at = rng.uniform(0.3, T['flockIn'])
    if inslow(at): continue
    f0 = rng.uniform(2800, 4500); pan = rng.uniform(-0.8, 0.8)
    for j in range(rng.integers(2, 5)):
        s = tt(0.07); x = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 0.25 * np.sin(2 * np.pi * 25 * s)) * (1 + 0.3 * s / 0.07)) / SR) * np.sin(np.pi * s / 0.07)
        add(x, at + j * 0.1, 0.014, pan)

# ---------- pigeon voice + wings ----------
def coo(g=1.0, pitch=1.0):
    sec = 0.55; s = tt(sec); f = pitch * (330 + 60 * np.sin(np.pi * s / sec)) * (1 - 0.15 * s / sec)
    ph = 2 * np.pi * np.cumsum(f) / SR; x = np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.1 * np.sin(3 * ph)
    am = (0.6 + 0.4 * np.sin(2 * np.pi * 16 * s)) * np.sin(np.pi * s / sec) ** 0.8
    return lp(x * am, 1400) * g
def flaps(sec, rate=9.0, g=1.0):
    out = np.zeros(int(sec * SR)); at = 0.0
    while at < sec - 0.06:
        i = int(at * SR); s = tt(0.07); x = bp(noise(0.07), 300, 2400) * np.exp(-s / 0.018) + lp(noise(0.07), 300) * np.exp(-s / 0.012) * 0.8
        out[i:i + len(x)] += x[: len(out) - i]; at += 1 / rate * rng.uniform(0.9, 1.1)
    return out * g
def whoosh(sec, f0=300, f1=1800):
    s = tt(sec); u = s / sec; out = np.zeros_like(s)
    for i in range(12):
        a, b = int(i * len(s) / 12), int((i + 1) * len(s) / 12); fc = f0 * (f1 / f0) ** u[a]; out[a:b] = bp(noise(sec), fc * 0.7, fc * 1.4)[a:b]
    return out * np.sin(np.pi * u)
def pop(): s = tt(0.12); return glide(900, 350, 0.12) * np.exp(-s / 0.03) + bp(noise(0.12), 1500, 6000) * np.exp(-s / 0.01) * 0.6
def gulp(): s = tt(0.35); return glide(380, 110, 0.35) * np.exp(-s / 0.1) * 0.9 + lp(noise(0.35), 300) * np.exp(-s / 0.05) * 0.5
def tap(f=900): s = tt(0.09); return bp(noise(0.09), f * 0.6, f * 2.2) * np.exp(-s / 0.012) + tone(f * 0.35, 0.09, 0.02) * 0.6
def lick(): s = tt(0.3); return bp(noise(0.3), 700, 3200) * np.sin(np.pi * s / 0.3) * (0.5 + 0.5 * np.sin(2 * np.pi * 12 * s)) * 0.6
def hum(sec, f=180, happy=True):
    s = tt(sec); fm = f * (1 + (0.06 if happy else -0.04) * np.sin(2 * np.pi * 1.2 * s)); ph = 2 * np.pi * np.cumsum(fm) / SR
    x = np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.3 * np.sin(3 * ph) + 0.15 * np.sin(4 * ph)
    return lp(x, 900) * np.minimum(1, s / 0.08) * np.minimum(1, (sec - s) / 0.15) * (0.7 + 0.3 * np.sin(2 * np.pi * 5 * s))

launch = {e['i']: e['t'] for e in ev('launch')}; grab = {e['i']: e['t'] for e in ev('grab')}; perch = {e['i']: e['t'] for e in ev('perch')}
for i in (1, 2):
    add(flaps(perch[i] - launch[i], 9, 1), launch[i], 0.22, 0.4)
    add(whoosh(0.4, 400, 2200), grab[i] - 0.3, 0.3, 0.0); add(pop(), grab[i], 0.35, -0.05); add(tap(1300), perch[i], 0.25, 0.45)
# third: normal flaps for a beat, then the slowed version (low, stretched) through the slow window
add(flaps(0.2, 9, 1), launch[3], 0.2, 0.4)
at = launch[3] + 0.2
while at < perch[3] - 0.1:
    s = tt(0.5); x = lp(noise(0.5), 260) * np.exp(-s / 0.14) * 1.5 + bp(noise(0.5), 120, 700) * np.exp(-s / 0.2)
    add(x, at, 0.22, 0.3); at += 0.62
add(whoosh(grab[3] - launch[3] - 0.4, 90, 420), launch[3] + 0.4, 0.22, 0.1)
add(glide(300, 120, 1.0) * np.exp(-tt(1.0) / 0.35) + lp(noise(1.0), 400) * np.exp(-tt(1.0) / 0.2), grab[3], 0.3)
add(tap(1300), perch[3], 0.25, 0.45)
for e in ev('gulp'): add(gulp(), e['t'] + 0.05, 0.35, 0.45); add(coo(1, 1.1), e['t'] + 0.55, 0.16, 0.45)
for at in [0.8, 4.9, 10.0, 19.4]: add(coo(), at, 0.12, 0.5)
for e in ev('lick'): add(lick(), e['t'] + 0.1, 0.35, -0.05); add(lick(), e['t'] + 0.42, 0.3, -0.05)
add(hum(0.7, 170), T['lick1'] + 0.05, 0.12, -0.05)

# man: surprised "huh?", grumble, gasps
def huh(): s = tt(0.3); return hum(0.3, 220) * np.linspace(1, 1.5, len(s)) ** 2 * 0.6
for at in [T['stare1'], T['grab2'] + 0.1, T['wake3']]: add(huh(), at, 0.16, -0.05)
s = tt(1.4); g = hum(1.4, 120, False) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 4 * s)))
add(lp(g + 0.3 * np.sign(np.sin(2 * np.pi * 60 * s)) * 0.3, 700), T['fist'], 0.16, -0.05)
# cooler: lid creak + rummage + ice crunch
for e in ev('cooler'):
    add(bp(noise(0.25), 800, 3000) * np.sin(np.pi * tt(0.25) / 0.25) * (0.5 + 0.5 * np.sin(2 * np.pi * 30 * tt(0.25))), e['t'] - 0.5, 0.12, 0.35)
    for k in range(4): add(bp(noise(0.05), 2000, 8000) * np.exp(-tt(0.05) / 0.01), e['t'] - 0.3 + k * 0.07, 0.12, 0.35)
    add(tap(500), e['t'] + 0.25, 0.25, 0.35)

# ---------- score: playful bed until the third steal ----------
bpm = 116; beat = 60 / bpm
prog = [(48, [60, 64, 67]), (53, [65, 69, 72]), (43, [59, 62, 67]), (48, [60, 64, 67])]
mel = [72, 76, 79, 76, 77, 76, 74, None, 74, 77, 76, 74, 72, None, 67, None]
at = 0.35; k = 0
while at < S1[0] - 0.2:
    root, ch = prog[(k // 4) % 4]
    duck = 0.35 if any(g - 0.2 < at < g + 1.2 for g in (grab[1], grab[2])) else 1.0
    add(pluck(NOTE(root - 12 if k % 2 else root), 0.5), at, 0.22 * duck, -0.15)
    if k % 2 == 1: [add(marimba(NOTE(c), 0.3), at + 0.008 * i, 0.055 * duck, 0.2) for i, c in enumerate(ch)]
    m = mel[k % 16]
    if m and k >= 4: add(marimba(NOTE(m), 0.4), at, 0.09 * duck, 0.25)
    at += beat; k += 1
# stings
add(brass([NOTE(58), NOTE(61), NOTE(64)], 0.45, 0.01, 0.2, 3000), grab[1] + 0.15, 0.13)
for k, m in enumerate([55, 54, 53]): add(brass([NOTE(m)], 0.3, 0.03, 0.1, 1800), grab[2] + 0.35 + k * 0.3, 0.16)
s = tt(1.0); add(brass([NOTE(52)], 1.0, 0.03, 0.4, 1600) * (1 + 0.3 * np.sin(2 * np.pi * 5.5 * s)) * np.exp(-s / 0.8), grab[2] + 1.25, 0.16)
add(pluck(NOTE(45), 0.5), T['glare'], 0.4); add(pluck(NOTE(44), 0.6), T['glare'] + 0.55, 0.4)

# ---------- slow motion 1: swell, heartbeat ----------
a, b = S1; sec = b - a; s = tt(sec)
pad = sum(np.sin(2 * np.pi * NOTE(m) * s + i) for i, m in enumerate([38, 45, 50, 53])) / 4
pad = lp(pad + 0.25 * np.sign(np.sin(2 * np.pi * NOTE(38) * s)), 700) * np.minimum(1, s / 1.0) * np.minimum(1, (sec - s) / 0.5) * (0.6 + 0.4 * s / sec)
add(pad, a, 0.09)
hb = a + 0.5
while hb < grab[3] - 0.2:
    for d, g in [(0, 1), (0.22, 0.6)]: add(lp(noise(0.2), 90) * np.exp(-tt(0.2) / 0.05) * 2 + tone(48, 0.2, 0.06) * 0.8, hb + d, 0.22 * g)
    hb += 1.1 - 0.35 * (hb - a) / sec
add(brass([NOTE(46), NOTE(49), NOTE(52)], 1.3, 0.3, 0.6, 1200), grab[3] + 0.05, 0.12)

# ---------- the tests and the idea ----------
for k, at in enumerate([T['test1'], T['test1o'], T['test2'], T['test2o']]):
    add(pluck(NOTE([57, 60, 57, 60][k]), 0.35), at, 0.25, 0.2)
add(glide(1200, 1700, 0.25) * np.sin(np.pi * tt(0.25) / 0.25) * 0.4, T['test1o'] + 0.05, 0.07, 0.45)   # innocent whistle
add(glide(1300, 1800, 0.25) * np.sin(np.pi * tt(0.25) / 0.25) * 0.4, T['test2o'] + 0.05, 0.07, 0.45)
add(tone(NOTE(96), 2.0, 0.6, ((1, 1), (2.76, 0.4), (5.4, 0.15))), T['eureka'], 0.2)
add(tone(NOTE(91), 1.6, 0.5, ((1, 1), (2.76, 0.3))), T['eureka'] + 0.06, 0.11)
add(glide(500, 1500, 0.35) * np.sin(np.pi * tt(0.35) / 0.35) * 0.4, T['eureka'] - 0.1, 0.1)

# ---------- the scheme: sneaky low pizzicato ----------
at = T['eureka'] + 1.0; k = 0; sneak = [45, None, 48, None, 50, 51, 52, None, 45, None, 48, None, 52, 51, 50, None]
while at < T['bait'] - 0.1:
    m = sneak[k % 16]
    if m: add(pluck(NOTE(m), 0.3), at, 0.3, -0.1)
    if k % 4 == 2: add(tone(1100, 0.05, 0.012) + bp(noise(0.05), 2000, 6000) * np.exp(-tt(0.05) / 0.006), at, 0.05, 0.3)
    at += beat / 2 * 1.4; k += 1
add(tap(700), T['stone1'], 0.25, -0.3)
s = tt(0.5); add(bp(noise(0.5), 300, 1800) * np.exp(-s / 0.12) * (0.5 + 0.5 * np.sin(2 * np.pi * 18 * s)) + glide(300, 150, 0.5) * np.exp(-s / 0.1) * 0.5, T['dip0'] + 0.3, 0.3, 0.35)  # squelch
add(tap(600), T['plop'], 0.3)
add(glide(700, 1100, 0.3) * np.exp(-tt(0.3) / 0.2) * 0.4, T['bait'], 0.08)
# ---------- the decoy grab, the drop, the bonk ----------
add(flaps(grab[4] - launch[4], 9, 1), launch[4], 0.22, 0.3); add(whoosh(0.35, 400, 2000), grab[4] - 0.3, 0.28); add(pop(), grab[4], 0.3)
add(brass([NOTE(48)], 0.8, 0.02, 0.3, 900) * (1 + 0.2 * np.sin(2 * np.pi * 7 * tt(0.8))), grab[4] + 0.05, 0.2)   # "uh-oh" tuba
at = grab[4] + 0.2
while at < T['bonk'] - 0.1:
    add(lp(noise(0.12), 500) * np.exp(-tt(0.12) / 0.03) * 1.2 + bp(noise(0.12), 400, 2000) * np.exp(-tt(0.12) / 0.02), at, 0.2, 0.35); at += 0.16
sec = T['bonk'] - T['top4']; add(glide(1600, 260, sec) * np.minimum(1, tt(sec) / 0.05) * 0.5, T['top4'], 0.12, 0.3)   # slide whistle down
s = tt(0.6); add(lp(noise(0.6), 200) * np.exp(-s / 0.05) * 2.4 + tone(70, 0.6, 0.12) * 1.2, T['bonk'], 0.55, 0.3)
add(glide(200, 520, 0.5) * np.exp(-tt(0.5) / 0.25) * (1 + 0.5 * np.sin(2 * np.pi * 18 * tt(0.5))), T['bonk'] + 0.05, 0.16, 0.3)   # boing
for k in range(10): add(tone(rng.uniform(2600, 3400), 0.08, 0.03), T['bonk'] + 0.3 + k * 0.13, 0.05, 0.35)   # tweety stars
# triumph
add(brass([NOTE(60), NOTE(64), NOTE(67)], 0.2, 0.01, 0.06, 4000), T['grin'], 0.18)
s = tt(1.6); add(brass([NOTE(65), NOTE(69), NOTE(72)], 1.6, 0.02, 0.7, 4000) * (1 + 0.06 * np.sin(2 * np.pi * 5.5 * s)), T['grin'] + 0.22, 0.18)
add(hum(T['bliss1'] - T['bliss0'], 200), T['bliss0'], 0.13, -0.05)
for k in range(3): add(lick(), T['bliss0'] + 0.15 + k * 0.5, 0.3, -0.05)
for m, d in [(72, 0), (76, 0.3), (79, 0.6), (84, 0.9), (79, 1.2)]: add(marimba(NOTE(m), 0.5), T['bliss0'] + d, 0.07, 0.2)
# whistle from the dizzy pigeon: two-tone call
for k, (f0, f1) in enumerate([(1500, 2400), (2400, 1300)]): add(glide(f0, f1, 0.18) * np.sin(np.pi * tt(0.18) / 0.18), T['whistle'] + k * 0.22, 0.13, 0.35)
# ---------- the flock ----------
sec = T['flockLand'] - T['flockIn'] + 0.3; s = tt(sec)
fl = sum(flaps(sec, rng.uniform(8, 11), 1) for _ in range(5)) / 2.5
add(fl * np.minimum(1, s / (sec * 0.6)), T['flockIn'], 0.3, 0.5)
add(lp(noise(1.0), 300) * np.sin(np.pi * tt(1.0) / 1.0) * 0.8, T['shade0'], 0.2)
a = T['eyesOpen']; sec = T['dive'] - a; s = tt(sec)
add(brass([NOTE(36), NOTE(43)], sec, 0.6, 0.2, 700) * (0.3 + 0.7 * s / sec), a, 0.2)
for k in range(9): add(coo(1, rng.uniform(0.85, 1.2)), T['crane0'] + 0.1 + k * 0.12, 0.07, rng.uniform(-0.6, 0.6))
add(brass([NOTE(49), NOTE(52), NOTE(55), NOTE(58)], 0.35, 0.005, 0.15, 3500), T['snap'], 0.22)
add(gulp(), T['sweat'] + 0.1, 0.25)
sec = T['hit'] - T['dive']; s = tt(sec)
add(sum(flaps(sec + 0.6, rng.uniform(9, 13), 1) for _ in range(8)) / 3 * np.concatenate([np.linspace(0.3, 1, len(s)), np.linspace(1, 0, int(0.6 * SR))])[: int((sec + 0.6) * SR)], T['dive'], 0.35)
add(whoosh(sec, 200, 1500), T['dive'], 0.3)
s = tt(1.2); add(bp(noise(1.2), 300, 5000) * np.exp(-s / 0.25) + lp(noise(1.2), 150) * np.exp(-s / 0.08) * 2, T['hit'], 0.45)   # poof
# ---------- tableau: silence, coos, a gulp, a lone pluck ----------
for k in range(6): add(coo(1, rng.uniform(0.85, 1.15)), T['tableau'] + 0.4 + k * 0.7 + rng.uniform(0, 0.3), 0.09, rng.uniform(-0.7, 0.7))
add(gulp(), T['gulpEnd'] - 0.1, 0.35)
for k in range(3): add(tone(4200, 0.05, 0.02) * np.sin(2 * np.pi * 30 * tt(0.05)), T['deadpan1'] + 0.6 + k * 0.09, 0.04, -0.5)
add(pluck(NOTE(40), 1.5), T['deadpan2'] - 0.2, 0.35); add(marimba(NOTE(79), 0.8), T['deadpan2'] + 0.35, 0.07)

fade = env([(0, 0), (0.3, 1), (T['fade'], 1), (DUR, 0)]); L *= fade; R *= fade
out = np.stack([L, R], 1); out /= np.max(np.abs(out)) / 0.89
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), out, SR, subtype='PCM_24')
print('mix.wav', out.shape[0] / SR, 's')
