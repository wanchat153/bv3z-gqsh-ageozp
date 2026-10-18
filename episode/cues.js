// cues.js — ONE timeline for picture (anim.js/scene.js) and sound (sfx.py reads cues.json from `node dump_cues.js`).
// "The Last Egg" (ไข่ใบสุดท้าย): 33 s, locked front-elevation iso camera. WORLD time w drives all motion; VIDEO time t maps to w through the slow-mo window (warp).
// World cm: u right, h up, q toward camera. g = 981 cm/s^2 for everything that flies.
const CUE = (function () {
  const T = 33, FPS = 60, G = 981;
  const S = 13.5, OX = 540, Y0 = 1400, DQ = 0.6;
  const P = (u, h, q = 0) => [OX + u * S, Y0 + q * DQ * S - h * S];
  const mod = (a, n) => ((a % n) + n) % n, clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
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
  // ---- slow motion: world 24.00..24.60 is shown over video 24.00..27.00 (x0.2); before/after the clock runs 1:1
  const W0 = 24.0, W1 = 24.6, V1 = 27.0, K = (W1 - W0) / (V1 - W0);
  const wOf = (t) => t <= W0 ? t : t >= V1 ? W1 + (t - V1) : W0 + (t - W0) * K;
  const tOf = (w) => w <= W0 ? w : w >= W1 ? V1 + (w - W1) : W0 + (w - W0) / K;
  const W_END = wOf(T);
  // ---- lanes and props (cm)
  const SQ = 18, MQ = 20, EQ = 18.2;
  const PLAT = { u0: -46, u1: -28, h: 4, q0: 14, q1: 22 };
  const TAB = { u0: -1, u1: 22, h: 6.5, q0: 6, q1: 16, egg: 8.0, eggQ: 13 };
  const STOOL = { u: -13.5, h: 5, q: 11.5, hw: 3.4 };
  const POT = { u: 31, hw: 6.4, h: 8.2, q: 13, qw: 5.5 };
  // ---- the samurai's path (feet, cm). Repeated values = rests.
  const SU = [[0, -50], [1.7, -39.5], [3.4, -29.0], [3.72, -26.4], [4.9, -25.6], [6.0, -21.5], [7.2, -17.5], [8.6, -17.5], [10.0, -17.0], [11.4, -16.2], [12.4, -15.7], [13.0, -15.7],
    [14.6, -9.0], [15.6, -3.5], [16.5, -1.5], [17.5, -1.5], [18.3, -4.5], [18.6, -4.7], [19.25, -4.7], [20.3, -14.0], [21.3, -23.0], [23.7, -23.0], [24.0, -22.9], [24.2, -15.0], [24.31, -12.0], [24.6, -10.6], [25.6, -10.6], [26.6, -3.0], [27.9, 7.5], [34, 7.5]];
  const samU = (w) => KS(SU, w);
  const samWalkOn = (w) => !((w > 3.36 && w < 4.95) || (w > 12.4 && w < 13.0) || (w > 16.5 && w < 17.5) || (w > 21.3 && w < 25.6) || (w > 28.0));
  // ---- Mochi: floor path, table path, leaps. pos(w) -> {u,h,q,mode}
  const CU = [[0, 2.2], [7.7, 2.2], [8.0, 0.6], [13.0, 0.6], [13.3, 0.6], [14.5, 6], [15.6, 14], [16.6, 21], [16.8, 21]];
  const CT = [[17.02, 17.8], [17.9, 16.9], [19.6, 16.9], [20.1, 15.0], [21.9, 15.0], [22.4, 13.0], [22.8, 13.0], [23.0, 12.4], [24.6, 12.4]];
  const CF = [[24.85, 6.0], [25.7, 3.0], [26.1, 3.0], [26.7, 15.0], [27.9, 24.5], [28.28, 24.5]];
  const ball = (w, w0, T, a, b) => { const k = (w - w0) / T, vh = (b[1] - a[1] + 0.5 * G * T * T) / T, t = w - w0; return [a[0] + (b[0] - a[0]) * k, a[1] + vh * t - 0.5 * G * t * t, a[2] + (b[2] - a[2]) * k]; };
  function mocPos(w) {
    const hop = (w0, T) => (w > w0 && w < w0 + T) ? 0.5 * G * (w - w0) * (w0 + T - w) : 0;
    if (w < 16.80) return { u: KS(CU, w), h: hop(7.78, 0.18), q: MQ, mode: 'floor' };
    if (w < 17.02) { const p = ball(w, 16.80, 0.22, [21, 0, MQ], [17.8, TAB.h, 11.5]); return { u: p[0], h: p[1], q: p[2], mode: 'air' }; }
    if (w < 24.55) return { u: KS(CT, w), h: TAB.h, q: 11.5, mode: 'table' };
    if (w < 24.85) { const p = ball(w, 24.55, 0.30, [12.4, TAB.h, 11.5], [6.0, 0, MQ]); return { u: p[0], h: p[1], q: p[2], mode: 'air' }; }
    if (w < 28.28) return { u: KS(CF, w), h: 0, q: MQ, mode: 'floor' };
    if (w < 28.52) { const p = ball(w, 28.28, 0.24, [24.5, 0, MQ], [31.6, POT.h - 1.9, POT.q]); return { u: p[0], h: p[1], q: p[2], mode: 'air' }; }
    return { u: 31.6, h: POT.h - 1.9, q: POT.q, mode: 'pot' };
  }
  const catWalkOn = (w) => (w > 13.2 && w < 16.65) || (w > 24.85 && w < 25.62) || (w > 26.2 && w < 28.1);
  const catCrawlOn = (w) => (w > 17.02 && w < 17.95) || (w > 19.6 && w < 20.2) || (w > 21.9 && w < 22.5);
  // ---- walk phases: integrate distance while walking (stride 7 cm samurai, 7.6 cm cat), table at 1/240 s
  const DT = 1 / 240, NS = Math.ceil((W_END + 1) / DT);
  const samPh = new Float32Array(NS + 1), catPh = new Float32Array(NS + 1);
  { let a = 0, c = 0, ua = samU(0), uc = mocPos(0).u;
    for (let i = 1; i <= NS; i++) { const w = i * DT, u = samU(w), m = mocPos(w); if (samWalkOn(w)) a += Math.abs(u - ua) / 7.0 * 2 * Math.PI; if (catWalkOn(w) || catCrawlOn(w)) c += Math.abs(m.u - uc) / (catCrawlOn(w) ? 5.0 : 7.6) * 2 * Math.PI; ua = u; uc = m.u; samPh[i] = a; catPh[i] = c; } }
  const phAt = (tab, w) => { const x = clamp(w / DT, 0, NS - 1), i = Math.floor(x); return tab[i] + (tab[i + 1] - tab[i]) * (x - i); };
  // ---- event table (world time w) — type, u (for pan), optional a (strength)
  const ev = [];
  const add = (w, type, u = 0, a = 1, x = {}) => ev.push(Object.assign({ w, type, u, a }, x));
  add(3.38, 'hopup', -28.5, 0.8); add(3.45, 'eggpop', -27.5, 0.9); add(3.72, 'land', -26.4, 1); add(3.80, 'eggtap', -26.4, 0.9); add(4.12, 'eggtap', -26, 0.8); add(4.50, 'eggcatch', -25.8, 1); add(4.72, 'phew', -25.6, 0.8);
  add(7.2, 'crouch', 2, 0.6); add(7.42, 'wiggle', 2, 0.5); add(7.58, 'wiggle', 2, 0.55); add(7.72, 'wiggle', 2, 0.6); add(7.78, 'pounce', 1.5, 1); add(7.87, 'pawhit', -9.5, 1); add(7.96, 'catland', 0.6, 1); add(8.28, 'bonk', -4.5, 1);
  add(9.6, 'wobble', -4.5, 0.6); add(10.6, 'wobble', -4.5, 0.8); add(11.0, 'earflick', -4, 0.6); add(11.7, 'wobble', -4.5, 1.0);
  add(12.45, 'takeegg', -10, 1); add(12.9, 'huff', 0.6, 0.8); add(13.1, 'flip', 0.6, 0.6);
  add(16.8, 'catjump', 21, 0.8); add(16.95, 'place', 6, 1); add(17.02, 'catland2', 17.8, 1);
  add(17.5, 'flip', -1.5, 0.6); add(18.58, 'flip', -5, 0.6); add(19.25, 'flip', -5, 0.6); add(21.3, 'flip', -23, 0.6);
  add(18.25, 'pat', 8.5, 0.8); add(20.6, 'pat', 6, 0.9); add(22.8, 'pat', 3.5, 1.0);
  add(18.3, 'roll', 5.5, 0.5, { dur: 1.1 }); add(20.65, 'roll', 3.5, 0.6, { dur: 1.1 }); add(22.85, 'roll', 1.5, 0.9, { dur: 1.35 });
  //add(21.5, 'bowlup', -15.5, 0.8);
  for (let w = 22.0; w < 23.7; w += 0.42) add(w, 'polish', -20, 0.5);
  add(23.7, 'gasp', -24, 1); add(23.9, 'bowlfly', -14, 1); add(24.0, 'dive', -22, 1); add(24.31, 'bowlland', -5, 1); add(24.42, 'bowlwobble', -5, 0.7); add(24.5, 'bowlwobble', -5, 0.5);
  add(24.2, 'fall', -1.2, 1); add(24.31, 'catch', -2, 1); add(24.32, 'slide', -15, 1, { dur: 0.14 }); add(24.58, 'catjump2', 8, 0.9); add(24.85, 'catland3', 6, 0.9);
  add(24.9, 'sigh', -15, 1); add(25.3, 'rise', -15, 0.8); add(25.75, 'sniff', -16, 0.6);
  add(27.88, 'toss', 10, 0.8); add(28.22, 'plop', 28.6, 1); add(28.28, 'catleap', 24.5, 0.9); add(28.52, 'splash', 31.6, 1); add(29.2, 'purr', 31.6, 0.8, { dur: 1.4 });
  const bub = []; for (let w = 0.5; w < W_END; w += 0.9 + 0.8 * hash(w, 5)) bub.push(w);
  bub.forEach((w, i) => add(w, 'bubble', 31, 0.3 + 0.3 * hash(i, 2)));
  // footsteps from the walk phases: a foot touches at phase = pi/2 + n*pi
  const steps = [];
  { let ns = Math.floor((phAt(samPh, 0) - Math.PI / 2) / Math.PI), nc = ns; ns = Math.floor((0 - Math.PI / 2) / Math.PI); nc = ns;
    for (let i = 1; i <= NS; i++) { const w = i * DT;
      const a = Math.floor((samPh[i] - Math.PI / 2) / Math.PI); if (a > ns) { ns = a; steps.push({ w, type: 'step', who: 's', u: samU(w), a: 0.8 }); }
      const c = Math.floor((catPh[i] - Math.PI / 2) / Math.PI); if (c > nc) { nc = c; steps.push({ w, type: 'step', who: 'c', u: mocPos(w).u, a: 0.5 }); } } }
  const events = () => ev.concat(steps).filter((e) => e.w < W_END).map((e) => Object.assign({}, e, { t: tOf(e.w), slow: e.w > W0 && e.w < W1 ? 1 : 0 })).sort((a, b) => a.t - b.t);
  return { T, FPS, G, S, OX, Y0, DQ, P, mod, clamp, sstep, lerp, hash, KS, W0, W1, V1, K, wOf, tOf, W_END, SQ, MQ, EQ, PLAT, TAB, POT, STOOL, SU, CU, CT, CF, samU, samWalkOn, mocPos, catWalkOn, catCrawlOn, samPh, catPh, phAt, ball, ev, steps, events, sOf: wOf };
})();
if (typeof module !== 'undefined') module.exports = CUE;
