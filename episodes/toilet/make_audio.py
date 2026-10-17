import json, re, sys, numpy as np
from scipy.signal import lfilter, butter, sosfilt
SR = 44100
src = open('events.js', encoding='utf-8').read()
EV = json.loads(re.search(r'=\s*(\{.*\})\s*;', src, re.S).group(1))
N = int((EV['dur'] + 0.5) * SR)
rng = np.random.default_rng(7)
def T(sec): return int(sec * SR)
def add(buf, t0, x, gain=1.0):
    i = T(t0); j = min(len(buf), i + len(x))
    if i < 0 or i >= len(buf): return
    buf[i:j] += x[:j - i] * gain
def noise(n): return rng.standard_normal(n)
def lp(x, fc, o=2): return sosfilt(butter(o, fc, 'low', fs=SR, output='sos'), x)
def hp(x, fc, o=2): return sosfilt(butter(o, fc, 'high', fs=SR, output='sos'), x)
def bp(x, f0, f1, o=2): return sosfilt(butter(o, [f0, f1], 'band', fs=SR, output='sos'), x)
def tt(d): return np.arange(int(d * SR)) / SR
def expenv(d, tau): return np.exp(-tt(d) / tau)

sfx = np.zeros(N); mus = np.zeros(N); amb = np.zeros(N)
# ambience: engine hum
n = N; br = lp(noise(n), 400, 2); br /= np.abs(br).max()
amb += br * 0.10 + 0.018 * np.sin(2 * np.pi * 96 * np.arange(n) / SR) + 0.010 * np.sin(2 * np.pi * 192.5 * np.arange(n) / SR)
amb += hp(lp(noise(n), 3500), 1200) * 0.012

def step(t0, g=1.0, f=100):
    d = 0.16; t = tt(d)
    th = np.sin(2 * np.pi * (f * 0.9 * t + 0) * (1 - t * 2.2)) * np.exp(-t / 0.035)
    sc = lp(noise(len(t)), 1800) * np.exp(-t / 0.018) * 0.5
    add(sfx, t0, (th * 0.9 + sc) * g * 0.7)
def ding(t0, g=1.0):
    d = 1.3; t = tt(d)
    def bell(f, st, amp): x = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.76 * t) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t)) * np.exp(-t / 0.45) * amp; x[:int(st * SR)] = 0; return x
    x = bell(880, 0, 1.0); y = np.zeros_like(t); y[int(0.28 * SR):] = bell(660, 0, 1.0)[:len(t) - int(0.28 * SR)]
    add(sfx, t0, (x + y) * 0.22 * g)
def gurgle(t0, d, g=1.0):
    t = tt(d); fm = 120 + 80 * np.sin(2 * np.pi * 3.1 * t) + 60 * np.sin(2 * np.pi * 7.3 * t + 1)
    ph = 2 * np.pi * np.cumsum(fm) / SR; x = np.sin(ph) * 0.5 + lp(noise(len(t)), 500) * 0.8
    am = (0.5 + 0.5 * np.sin(2 * np.pi * (6 + 3 * np.sin(t * 2)) * t)) ** 1.5; e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.7
    add(sfx, t0, lp(x * am * e, 700, 2) * 0.75 * g)
def click(t0, g=1.0):
    t = tt(0.08); x = hp(noise(len(t)), 2500) * np.exp(-t / 0.004) + np.sin(2 * np.pi * 1700 * t) * np.exp(-t / 0.012) * 0.6
    add(sfx, t0, x * 0.5 * g); t2 = tt(0.06); add(sfx, t0 + 0.07, (hp(noise(len(t2)), 1800) * np.exp(-t2 / 0.006)) * 0.3 * g)
def whoosh(t0, d, g=1.0, f0=300, f1=3000):
    t = tt(d); x = noise(len(t)); out = np.zeros_like(t); k = 8; seg = len(t) // k
    for i in range(k):
        a, b = i * seg, (i + 1) * seg if i < k - 1 else len(t)
        fc = f0 * (f1 / f0) ** (i / (k - 1)); out[a:b] = bp(x[a:b], fc * 0.7, min(fc * 1.4, SR / 2 - 100), 2)
    add(sfx, t0, out * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.4 * 0.9 * g)
def tap(t0, g=1.0):
    t = tt(0.1); add(sfx, t0, (np.sin(2 * np.pi * 150 * t * (1 - t)) * np.exp(-t / 0.03) + lp(noise(len(t)), 900) * np.exp(-t / 0.015) * 0.4) * 0.8 * g)
def flush(t0, g=1.0):
    d = 3.0; t = tt(d); x = noise(len(t)); out = np.zeros_like(t); k = 24; seg = len(t) // k
    for i in range(k):
        a, b = i * seg, (i + 1) * seg if i < k - 1 else len(t); fc = 3200 * (0.35) ** (i / (k - 1)); out[a:b] = bp(x[a:b], fc * 0.6, fc * 1.6, 2)
    e = np.minimum(t / 0.2, 1) * np.exp(-np.clip(t - 1.3, 0, None) / 0.8)
    gur = lp(noise(len(t)), 300) * (0.5 + 0.5 * np.sin(2 * np.pi * 4 * t)) * np.exp(-np.clip(t - 1.6, 0, None) / 0.6)
    add(sfx, t0, (out * e * 0.7 + gur * 0.5) * 0.8 * g)
def slide(t0, d, g=1.0):
    t = tt(d); x = lp(noise(len(t)), 1200) * np.sin(np.pi * np.clip(t / d, 0, 1)) * 0.5 + np.sin(2 * np.pi * (180 + 60 * t / d) * t) * 0.05 * np.sin(np.pi * t / d)
    add(sfx, t0, x * g * 0.8); click(t0 + d, 0.5 * g)
def rattle(t0, d, g=1.0):
    t = tt(d); x = lp(noise(len(t)), 1500) * 0.5; clk = (np.sin(2 * np.pi * 15 * t) > 0.8).astype(float); clk = lp(clk, 400) * hp(noise(len(t)), 1000) * 4
    env = np.minimum(t / 0.8, 1) * np.minimum((d - t) / 0.8, 1); add(sfx, t0, (x * 0.4 + clk * 0.25) * env * g * (0.6 + 0.4 * np.sin(np.pi * t / d)))
def sigh(t0, g=1.0):
    d = 1.6; t = tt(d); x = bp(noise(len(t)), 700, 1800, 2) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.8; add(sfx, t0, x * 0.35 * g)
def boing(t0, g=1.0):  # sleeper snore blip
    d = 0.9; t = tt(d); x = np.sin(2 * np.pi * (110 + 25 * np.sin(2 * np.pi * 2 * t)) * t) * np.sin(np.pi * t / d); add(sfx, t0, lp(x, 400) * 0.25 * g)

# --- events
for d in EV['dings']: ding(d)
for s0, d in EV['gurgles']: gurgle(s0, d, 1.0 if s0 < 70 else 0.8)
for c in EV['clicks']: click(c)
for a, b in EV['whips']: whoosh(a, b - a, 0.7)
for a in EV['taps']: tap(a)
for f in EV['flushes']: flush(f)
for a, b in EV['doors']: slide(a, b - a)
rattle(EV['cart'][0] - 0.2, EV["cart"][1] - EV["cart"][0] + 0.6, 0.3)
sigh(EV['sigh'])
for tt0 in (14.0, 15.1, 16.2): boing(tt0, 0.8)
# footsteps B: from distance
WS, WE, SPD = EV['walkStart'], EV['walkEnd'], EV['speed']; TW = WE - WS
def walkS(t):
    u = min(max(t - WS, 0), TW); r = 1.0
    if u < r: return 0.5 * u * u
    if u < TW - r: return u - 0.5
    d = u - (TW - r); return (TW - r - 0.5) + d - 0.5 * d * d / r
ts = np.arange(WS, WE, 0.002); ds = np.array([SPD * walkS(x) for x in ts]); k = 1
while True:
    idx = np.searchsorted(ds, k * EV['stride'])
    if idx >= len(ts): break
    step(ts[idx], 0.9 if k % 2 else 1.0, 95 + 15 * (k % 2)); k += 1
for a, b, n_ in [(49.8, 51.3, 3), (53.2, 54.8, 3), (54.4, 56.2, 2), (63.2, 64.7, 3), (EV['eStep'][0], EV['eStep'][1] - 0.4, 4)]:
    for i in range(n_): step(a + (b - a) * (i + 0.5) / n_, 0.8)

# music: pizzicato bed (Karplus-Strong), 100 bpm
def pluck(t0, f, d=0.7, g=1.0):
    n_ = int(d * SR); L = int(SR / f); buf = rng.uniform(-1, 1, L); out = np.zeros(n_)
    for i in range(n_):
        out[i] = buf[i % L]; buf[i % L] = 0.5 * (buf[i % L] + buf[(i + 1) % L]) * 0.996
    out *= np.exp(-tt(d) / 0.5); add(mus, t0, out * 0.5 * g)
pent = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25]; bass = [130.81, 98.0, 110.0, 87.31]
beat = 0.6; tm = 1.0; bar = 0
mrng = np.random.default_rng(11)
while tm < EV['dur'] - 0.5:
    pluck(tm, bass[bar % 4], 0.9, 0.9); pluck(tm + beat * 2, bass[bar % 4] * 1.5, 0.7, 0.6)
    for e in range(8):
        if mrng.random() < 0.55: pluck(tm + e * beat / 2, pent[int(mrng.integers(0, len(pent)))], 0.5, 0.55)
    tm += beat * 4; bar += 1
mask = np.ones(N)
for a, b in EV['hush']:
    i, j = T(a), T(b); f = T(0.25); mask[i:j] = 0
    mask[max(0, i - f):i] = np.linspace(1, 0, i - max(0, i - f)); mask[j:j + f] = np.linspace(0, 1, len(mask[j:j + f]))
mus *= mask * 0.55
# fades + mix
mix = sfx * 1.0 + mus + amb
fi = T(0.8); mix[:fi] *= np.linspace(0, 1, fi); fo = T(2.0); mix[-fo:] *= np.linspace(1, 0, fo)
mix /= np.abs(mix).max() / 0.89
from scipy.io import wavfile
st = np.stack([mix, np.roll(mix, 40) * 0.98], 1)
wavfile.write('/tmp/toilet_audio.wav', SR, (st*32767).astype(np.int16))
print('audio ok', len(mix) / SR, 's')
