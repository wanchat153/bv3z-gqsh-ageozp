"""The Exploding Whale: score + foley, all synthesised, keyed to the shot list (events.json) and to the physics bake
(src/sim.json: landing instants of every blubber piece, the car hit). Sound travels at 343 m/s: the blast is heard
when it reaches the camera. No voice. Writes out/mix.wav (48 kHz stereo, DUR s)."""
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

SIM = json.load(open(os.path.join(HERE, 'src', 'sim.json')))
SH_ = SH; C = 343.0
def ocean(s): u = tt(s); sw = 0.55 + 0.45 * np.sin(2 * np.pi * u / 6.5) ** 2; return (lp(noise(s), 700) * 0.8 + bp(noise(s), 1500, 5000) * 0.25 * sw) * sw
def wind(s): u = tt(s); return bp(noise(s), 150, 900) * (0.6 + 0.4 * np.sin(2 * np.pi * u / 4.3))
def boom(s=6.0):
    u = tt(s); low = lp(noise(s), 120, 4) * np.exp(-u / 1.6) * 3.0 + tone(38, s, 1.8) * 1.2 + tone(55, s, 0.9) * 0.8
    crack = bp(noise(0.5), 600, 6000) * np.exp(-tt(0.5) / 0.05); low[: len(crack)] += crack * 1.2; return low
def rumble(s): u = tt(s); return lp(noise(s), 200, 3) * np.exp(-u / (s * 0.5))
def sandrain(s): u = tt(s); x = bp(noise(s), 1500, 7000) * (rng.random(len(u)) > 0.92) * 1.5 + bp(noise(s), 300, 2000) * 0.3; return x * np.sin(np.pi * u / s)
def splat(m):
    s = 0.35; u = tt(s); k = min(1.0, m / 30); return (lp(noise(s), 900) * np.exp(-u / 0.05) * (0.8 + k) + bp(noise(s), 200, 1500) * np.exp(-u / 0.12) * 0.6 + tone(70 + 40 * (1 - k), s, 0.08) * 0.6)
def crunch(slow=1.0):
    s = 1.6 / slow; u = tt(s); x = lp(noise(s), 2500 * slow) * np.exp(-u / (0.25 / slow)) * 1.5 + tone(90 * slow, s, 0.4 / slow) * 0.8
    for k in range(10): at = int(rng.uniform(0, 0.4 / slow) * SR); b = bp(noise(0.06), 1500 * slow, 6000 * slow) * np.exp(-tt(0.06) / 0.015); x[at:at + len(b)] += b[: len(x) - at]
    return x
def glass(slow=1.0):
    s = 2.2 / slow; out = np.zeros(int(s * SR))
    for k in range(40): at = int(rng.uniform(0, 1.2 / slow) * SR); f = rng.uniform(2500, 7000) * slow; b = tone(f, 0.25 / slow, 0.05 / slow, ((1, 1), (2.7, 0.4))); c = bp(noise(0.08), 3000 * slow, min(12000, 12000 * slow)) * np.exp(-tt(0.08) / 0.01) * 0.5; b[: len(c)] += c[: len(b)]; out[at:at + len(b)] += b[: len(out) - at]
    return out
def diesel(s): u = tt(s); f = 28 + 3 * np.sin(2 * np.pi * 0.4 * u); ph = 2 * np.pi * np.cumsum(f) / SR; x = np.sign(np.sin(ph)) * 0.6 + lp(noise(s), 300) * 0.5; return lp(x, 700) * np.minimum(1, u / 0.4)
def engine(s, f0, f1): u = tt(s); f = f0 + (f1 - f0) * u / s; ph = 2 * np.pi * np.cumsum(f) / SR; return lp(np.sign(np.sin(ph)) * 0.5 + lp(noise(s), 400) * 0.4, 900)
def brakes(s): u = tt(s); return bp(noise(s), 2500, 5000) * 0.4 * np.sin(np.pi * u / s) + lp(noise(s), 500) * 0.5 * np.sin(np.pi * u / s)
def door(): return lp(noise(0.25), 1200) * np.exp(-tt(0.25) / 0.04) * 1.2 + tone(130, 0.25, 0.05) * 0.5
def wah(f, s): u = tt(s); x = brass([f], s, 0.05, 0.2, 1200) * (0.6 + 0.4 * np.sin(2 * np.pi * 5 * u)); return x
def steps(a, b, rate, g, pan=0.0):
    at = a
    while at < b: add(lp(noise(0.06), 1400) * np.exp(-tt(0.06) / 0.012), at, g, pan); at += 1 / rate
def scream(s):
    u = tt(s); x = crowdbed(s, 1.3) + sum(glide(rng.uniform(500, 900), rng.uniform(900, 1500), s, 'saw') * 0.04 * np.sin(np.pi * u / s) for _ in range(5)); return bp(x, 300, 4000)

# ---------- ambience: sea and wind under everything; gulls while they are around ----------
add(ocean(DUR), 0, 0.22); add(wind(DUR), 0, 0.12)
for at in [0.3, 1.2, 2.4, 4.0, 5.9, 17.4, 18.3, 19.4]: add(gull(), at, 0.1, rng.uniform(-0.6, 0.6))
# ---------- score: a sly pizzicato walk (bass + plucks), building to the plunger ----------
beat = 60 / 112
def walkline(a, b, notes, g=0.26, oct_=0):
    at = a; k = 0
    while at < b - 0.05: add(pluck(NOTE(notes[k % len(notes)] + oct_), 0.32), at, g, -0.15); at += beat; k += 1
walkline(0.1, SH_['crates'][0], [43, 50, 47, 50, 45, 52, 48, 52])
walkline(SH_['crates'][0], SH_['plunger'][0], [43, 47, 50, 55, 45, 48, 52, 57], 0.3)
at = SH_['crates'][0]; k = 0
while at < SH_['plunger'][0] - 0.1: add(harpsi(NOTE([67, 71, 74, 71, 69, 72, 76, 72][k % 8])), at + beat / 2, 0.08, 0.25); at += beat; k += 1
add(strings([NOTE(55), NOTE(62)], SH_['plunger'][1] - SH_['plunger'][0] - 0.3, 0.6, 0.1), SH_['plunger'][0], 0.12)
for k in range(5): add(tone(NOTE(79 + k), 0.12, 0.05), SH_['plunger'][0] + 1.0 + k * 0.28, 0.06)    # tension ticks
# ---------- foley before the blast ----------
a, b = SH_['stink']; [add(bp(noise(0.4), 4000, 9000) * np.sin(np.pi * tt(0.4) / 0.4) * 0.3, a + k * 0.4, 0.06, 0.3) for k in range(7)]   # flies
a, b = SH_['truck']; add(engine(3.0, 32, 14), a, 0.18); add(brakes(1.6), a + 0.6, 0.12); add(door(), a + 3.05, 0.25); add(thump(), a + 3.4, 0.25)
steps(SH_['boulder'][0] + 0.1, SH_['boulder'][0] + 1.6, 2.4, 0.06)
a, b = SH_['crates']; steps(a + 0.1, a + 2.5, 2.2, 0.06, -0.2); steps(a + 0.5, b, 2.2, 0.05, 0.3); add(thump(), a + 3.35, 0.3)
add(thump(), SH_['crates'][1] - 0.4, 0.2)
a, b = SH_['retreat']; add(crowdbed(b - a), a, 0.12); steps(a, b, 6, 0.03)
a, b = SH_['plunger']; add(crowdbed(2.0, 0.6), a, 0.08); add(lp(noise(0.12), 2200) * np.exp(-tt(0.12) / 0.02) * 1.5, T['blast'] - 0.08, 0.35)   # the handle hits bottom
# ---------- the blast: heard when it reaches the camera (112 m away: +0.33 s) ----------
tb = T['blast']; dist = float(np.hypot(111, 15)); add(boom(), tb + dist / C, 0.95); add(rumble(5.0), tb + dist / C + 0.3, 0.4)
add(sandrain(4.5), tb + 2.2, 0.18)
# crowd: cheer when the sound reaches them (400 m), then the gasp, then screams in the rain
a, b = SH_['lookup']; add(cheer(1.5), a, 0.22); add(glide(900, 500, 0.6, 'saw') * 0.1, a + 1.35, 0.25); add(crowdbed(1.8, 0.7), a + 1.4, 0.12)
add(strings([NOTE(62), NOTE(65), NOTE(68)], 2.0, 1.2, 0.2, 2400), a + 1.3, 0.1)
for k in range(6): add(glide(NOTE(84 - k * 2), NOTE(70 - k * 2), 0.5) * np.sin(np.pi * tt(0.5) / 0.5), a + 1.6 + k * 0.25, 0.05)    # falling whistle
a, b = SH_['rain']; add(scream(b - a), a + 0.2, 0.2); steps(a + 0.4, b, 9, 0.04)
# every piece that lands where the camera can hear it (the crowd shots): a splat, louder for heavier pieces
for i, bd in enumerate(SIM['bodies']):
    n = len(bd['p']) // 3; land = None
    for f in range(1, n):
        if bd['p'][f * 3 + 1] <= bd['r'] + (1.5 if i == 0 else 0.04): land = SIM['t0'] + f / SIM['fps']; break
    if land is None or i == 0: continue
    if SH_['rain'][0] <= land < SH_['rain'][1]: add(splat(bd['m']), land, 0.25 + 0.01 * bd['m'], rng.uniform(-0.5, 0.5))
# ---------- the car, in slow motion (pitched down; the physics keeps its own clock) ----------
a, b = SH_['car']; hit_l = 1.6 + (SIM['hitT'] - 37.94) / 0.06; th = a + hit_l
add(glide(220, 110, hit_l, 'saw') * 0.0 + lp(noise(hit_l), 300) * np.linspace(0, 1, int(hit_l * SR)) * 0.4, a, 0.25)    # the piece falling, a slowed rush
add(crunch(0.45), th, 0.9); add(glass(0.45), th + 0.02, 0.35); add(rumble(2.0), th, 0.4)
# ---------- deadpan, then the sad horn ----------
a, b = SH_['owner']; add(wah(NOTE(55), 0.45), a + 0.9, 0.16); add(wah(NOTE(54), 0.45), a + 1.4, 0.16); add(wah(NOTE(53), 1.0), a + 1.9, 0.18)
# ---------- aftermath: the remains, no gulls; the bulldozer; the tune comes back gently ----------
a, b = SH_['after']; steps(a + 0.1, a + 2.6, 2.4, 0.05); add(brass([NOTE(43)], 0.5, 0.02, 0.2, 900), a + 2.8, 0.15); add(brass([NOTE(42)], 0.9, 0.02, 0.5, 900), a + 3.2, 0.15)
a, b = SH_['bury']; add(diesel(b - a + 0.4), a, 0.25); [add(lp(noise(0.2), 900) * np.exp(-tt(0.2) / 0.05), a + 0.5 + k * 0.7, 0.12) for k in range(5)]
walkline(a + 0.2, DUR, [43, 50, 47, 50, 45, 52, 48, 55], 0.22)
for k, m in enumerate([67, 71, 74, 79]): add(harpsi(NOTE(m), 0.9), a + 0.4 + k * 0.6, 0.09, 0.2)
fade = env([(0, 0), (0.25, 1), (DUR - 1.0, 1), (DUR, 0)]); L *= fade; R *= fade
out = np.stack([L, R], 1); out /= np.max(np.abs(out)) / 0.89
OUTD = os.environ.get('OUT') or os.path.join(HERE, 'out'); os.makedirs(OUTD, exist_ok=True); sf.write(os.path.join(OUTD, 'mix.wav'), out, SR, subtype='PCM_24'); print('mix.wav', out.shape[0] / SR, 's')
