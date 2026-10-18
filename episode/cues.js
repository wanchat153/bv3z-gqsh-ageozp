// cues.js — ONE timeline for picture (anim.js/scene.js), the Python light pass (light.py reads info.json made from anim.js `info(t)`) and sound (sfx.py reads cues.json from `node dump_cues.js`).
// "Blow-out" (ดับเทียน): 6.4 s, fixed camera, no slow motion (video time t == world time w).
// Story: the samurai tries to blow the candle out 3 times (it only flutters + pops back), Mochi's sneeze joins the 3rd blow -> flame OUT, only eyes glow in the dark,
// Mochi leans over the glowing wick and puffs -> ember -> smoke relights the flame -> both faces right next to the candle. World cm: u right, h up, q toward camera.
const CUE = (function () {
  const T = 6.4, FPS = 60;
  const S = 13.5, OX = 540, Y0 = 1400, DQ = 0.6;
  const P = (u, h, q = 0) => [OX + u * S, Y0 + q * DQ * S - h * S];
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const sstep = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const hash = (...a) => { let x = Math.sin(a.reduce((s, v, i) => s + (i + 1) * 12.9898 * v, 78.233)) * 43758.5453; return x - Math.floor(x); };
  // Hermite spline through keys [t, v] (zero tangent where a neighbour repeats the value = a real rest)
  function KS(keys, t) {
    const n = keys.length; if (t <= keys[0][0]) return keys[0][1]; if (t >= keys[n - 1][0]) return keys[n - 1][1];
    let i = 1; while (i < n - 1 && t > keys[i][0]) i++;
    const a = keys[i - 1], b = keys[i], dt = b[0] - a[0], u = (t - a[0]) / dt, u2 = u * u, u3 = u2 * u;
    const tan = (k) => { const p = keys[k], q = keys[k - 1], r = keys[k + 1]; if (!q || !r) return 0; if (p[1] === q[1] || p[1] === r[1]) return 0; return (r[1] - q[1]) / (r[0] - q[0]); };
    return (2 * u3 - 3 * u2 + 1) * a[1] + (u3 - 2 * u2 + u) * dt * tan(i - 1) + (-2 * u3 + 3 * u2) * b[1] + (u3 - u2) * dt * tan(i);
  }
  const wOf = (t) => t, tOf = (w) => w, W_END = T;
  // ---- places (cm)
  const SQ = 18, MQ = 19.4, CQ = 18.7;
  const CANDLE = { u: 0, q: CQ, wickH: 13.4 };                        // wick tip height above the floor
  const SAM_U = [[0, -12.8], [4.65, -12.8], [5.3, -10.4], [6.4, -10.4]];
  const MOC_U = [[0, 12.6], [4.65, 12.6], [5.25, 10.3], [6.4, 10.3]];
  const samU = (w) => KS(SAM_U, w), mocU = (w) => KS(MOC_U, w);
  // ---- the flame (physical story). len 0..1.2 (1 = steady), lean -1..1 (+ = pushed toward the cat), ember 0..1 (glowing wick), smoke 0..1
  const FLEN = [[0, 1], [0.86, 1], [0.98, 0.38], [1.08, 0.30], [1.30, 1.18], [1.45, 0.96], [1.58, 1], [1.95, 1], [2.06, 0.85], [2.18, 0.12], [2.32, 0.10], [2.52, 1.22], [2.68, 0.95], [2.84, 1], [3.50, 1], [3.56, 0.72], [3.62, 0], [5.46, 0], [5.58, 0.22], [5.72, 0.72], [5.90, 1.16], [6.06, 1], [6.4, 1]];
  const FLEAN = [[0, 0], [0.86, 0], [1.0, 1.0], [1.12, 0.85], [1.3, -0.3], [1.45, 0.08], [1.58, 0], [2.0, 0], [2.1, 1.25], [2.3, 1.15], [2.5, -0.35], [2.68, 0.1], [2.84, 0], [3.5, 0], [3.56, 1.1], [3.60, -0.9], [3.64, 0], [5.46, 0], [5.6, 0.2], [5.8, -0.1], [6.0, 0], [6.4, 0]];
  const EMBER = [[0, 0], [3.6, 0], [3.66, 1.0], [3.9, 0.82], [4.4, 0.55], [5.1, 0.45], [5.2, 0.52], [5.27, 1.0], [5.36, 0.62], [5.43, 1.12], [5.52, 0.9], [5.62, 0.35], [5.75, 0], [6.4, 0]];
  const SMOKE = [[0, 0], [3.6, 0], [3.7, 1.0], [4.4, 0.62], [5.1, 0.42], [5.3, 0.55], [5.6, 0.3], [5.9, 0], [6.4, 0]];
  const flameAt = (w) => { const len = Math.max(0, KS(FLEN, w)); return { len, lean: KS(FLEAN, w), ember: clamp(KS(EMBER, w), 0, 1.2), smoke: clamp(KS(SMOKE, w), 0, 1), lit: len > 0.03 ? 1 : 0 }; };
  // ---- events (picture + sound)
  const ev = [];
  const add = (w, type, u = 0, a = 1, o = {}) => ev.push(Object.assign({ w, type, u, a }, o));
  add(0.35, 'inhale', -12, 0.6, { dur: 0.45 }); add(1.55, 'inhale', -12, 0.8, { dur: 0.45 }); add(2.85, 'inhale', -12, 1.0, { dur: 0.65 });
  add(0.80, 'blow', -10, 0.6, { dur: 0.3 }); add(2.0, 'blow', -10, 0.9, { dur: 0.4 }); add(3.5, 'blow', -10, 1.0, { dur: 0.3 });
  add(0.97, 'flutter', 0, 0.7); add(2.15, 'flutter', 0, 1.0); add(1.28, 'pop', 0, 0.7); add(2.52, 'pop', 0, 1.0);
  add(1.15, 'sniff', 9, 0.5); add(2.2, 'sniff', 9, 0.7); add(2.42, 'sniff', 9, 0.8); add(2.64, 'sniff', 9, 0.9);
  add(3.15, 'catinhale', 9, 1.0, { dur: 0.4 });
  add(3.58, 'sneeze', 9, 1.0);
  add(3.62, 'out', 0, 1.0); add(3.68, 'smoke', 0, 1.0, { dur: 1.3 });
  add(3.95, 'blink', -12, 0.5); add(4.38, 'gulp', -12, 0.6); add(4.62, 'mew', 9, 0.5);
  add(4.78, 'rustle', -12, 0.6); add(4.98, 'rustle', 9, 0.6);
  add(5.2, 'puff', 6, 0.55); add(5.38, 'puff', 6, 0.95);
  add(5.52, 'ignite', 0, 1.0); add(5.74, 'bloom', 0, 0.8);
  add(6.02, 'sigh', -10, 0.5); add(6.12, 'mew', 8, 0.6);
  const events = () => ev.filter((e) => e.w < W_END).map((e) => Object.assign({}, e, { t: e.w, slow: 0 })).sort((a, b) => a.t - b.t);
  return { T, FPS, S, OX, Y0, DQ, P, clamp, sstep, lerp, hash, KS, wOf, tOf, W_END, SQ, MQ, CQ, CANDLE, samU, mocU, flameAt, ev, events };
})();
if (typeof module !== 'undefined') module.exports = CUE;
