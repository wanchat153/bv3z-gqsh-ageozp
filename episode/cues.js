// cues.js — ONE timeline for picture (anim.js/scene.js), the Python light pass (light.py reads info/mask files made in grab.mjs) and sound (sfx.py reads cues.json from `node dump_cues.js`).
// "The shadow that won't sit still" (เงาที่ไม่ยอมอยู่นิ่ง): 10 s, fixed camera, no slow motion (video time t == world time w).
// Story: a paper lantern on the floor in front throws BIG shadows of the samurai and Mochi on the shoji wall. The samurai's shadow slips away from its owner, walks to Mochi's shadow and pokes her cheek.
// Real Mochi feels it, the real ones look up, the shadow is back in perfect mimic. Visit 2: the shadows cuddle; the real ones catch them, the shadow dashes home and finally waves alone.
// World cm: u right, h up, q toward camera. Shadows are drawn by the same character code into mask passes in "pass space" (same px as the real ones); light.py projects them onto the wall (point light).
const CUE = (function () {
  const T = 10, FPS = 60;
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
  const SQ = 14, MQ = 15.4, WALL_Y = 1380;                                      // chars stand 16 cm in front of the wall
  const SAM_U = -9, MOC_U = 9;                                                    // the real ones: they face each other, 18 cm apart
  const LANT = { u: 0, q: 60, h: 7 };                                              // the paper lantern on the floor in front of them (its flame = the only light)
  const QW = (WALL_Y - Y0) / (DQ * S), K_WALL = (LANT.q - QW) / (LANT.q - SQ);      // point-light projection factor onto the wall plane (lamp q=60)
  // ---- the shadow samurai's path in pass space (cm); 'home' = -7 (mimic of the real one)
  const SHU = [[0, -9], [1.3, -9], [2.15, -4.0], [3.05, -4.0], [3.5, -9], [5.5, -9], [6.5, -3.0], [7.9, -3.0], [8.4, -9], [10, -9]];
  const shu = (w) => KS(SHU, w);
  const shuV = (w) => (shu(w + 0.01) - shu(w - 0.01)) / 0.02;
  // walk phase: inside a moving segment the phase runs 0 -> n*PI with the real progress (no foot sliding), outside it is null (standing). ~1 step per 1.36 cm.
  const shuWalk = (w) => { for (let k = 0; k < SHU.length - 1; k++) { const a = SHU[k], b = SHU[k + 1]; if (a[1] !== b[1] && w > a[0] && w < b[0]) { const len = Math.abs(b[1] - a[1]), n = Math.max(1, Math.round(2.3 * len / Math.PI)), pr = (shu(w) - a[1]) / (b[1] - a[1]); return { ph: Math.PI * n * pr, sp: clamp(Math.abs(shuV(w)) / 1.0) }; } } return null; };
  // ---- the shadow arm/pose phases (0..1 weights)
  const POKE = [[0, 0], [2.6, 0], [2.86, 1], [2.93, 1], [3.1, 0], [10, 0]];                 // arm 0 reaches the cat shadow's cheek: a hop (crouch 2.62, flight 2.81-2.99) taps it at the apex 2.9
  const PAT = [[0, 0], [6.5, 0], [6.8, 1], [7.0, 1], [7.2, 0], [10, 0]];                   // a pat on her head while he sits down next to her
  const WAVE = [[0, 0], [9.2, 0], [9.4, 1], [9.9, 1], [10, 1]];                            // the final lone wave
  const CUDDLE = [[0, 0], [6.6, 0], [7.0, 1], [7.85, 1], [7.95, 0], [10, 0]];             // both shadows lean together (cat's head nuzzles, samurai leans)
  const RECOIL = [[0, 0], [2.9, 0], [2.97, 1], [3.3, 0.35], [3.5, 0], [10, 0]];            // cat shadow flinches when poked
  // ---- the REAL ones: how much they look up at the wall, surprise, tilt, sweat
  const LUC = [[0, 0], [2.9, 0], [3.1, 1], [4.8, 1], [5.1, 0], [6.9, 0], [7.1, 1], [8.9, 1], [9.2, 0], [9.62, 0], [9.72, 1], [10, 1]];     // Mochi looks up at her shadow
  const LUS = [[0, 0], [3.5, 0], [3.7, 1], [4.8, 1], [5.1, 0], [7.1, 0], [7.3, 1], [8.9, 1], [9.2, 0], [9.65, 0], [9.75, 1], [10, 1]];     // the samurai looks up
  const SURP_C = [[0, 0], [2.92, 0], [3.0, 1], [3.5, 0.5], [4.0, 0], [7.08, 0], [7.15, 1], [8.0, 0.6], [8.4, 0], [9.7, 0], [9.78, 1], [10, 1]];
  const SURP_S = [[0, 0], [3.65, 0], [3.75, 1], [4.3, 0.4], [4.8, 0], [7.25, 0], [7.35, 1], [8.0, 0.7], [8.6, 0], [9.72, 0], [9.8, 1], [10, 1]];
  const events = [];
  const add = (w, type, u = 0, a = 1, o = {}) => events.push(Object.assign({ w, type, u, a }, o));
  // shadow footsteps: one soft pat per half stride while he moves (distance based, 1 step per 1.35 cm)
  (function () { let acc = 0, prev = shu(0); for (let k = 1; k <= T * 200; k++) { const w = k / 200, cur = shu(w); acc += Math.abs(cur - prev); prev = cur; if (acc >= 1.35) { acc -= 1.35; add(w, 'step', cur, 0.5 + 0.2 * hash(k)); } } })();
  add(0.55, 'breath', -9, 0.25); add(0.55, 'breath', 9, 0.25);
  add(2.9, 'poke', 3, 1.0); add(2.95, 'earflick', 9, 0.9); add(3.02, 'mew', 9, 0.7);
  add(3.08, 'dash', -4, 0.9, { dur: 0.45 });
  add(3.72, 'gasp', -9, 0.6); add(4.85, 'sigh', 0, 0.5); add(5.52, 'blink', 9, 0.3);
  add(6.75, 'pat', 3, 0.5); add(6.95, 'purr', 4, 0.7, { dur: 0.95 });
  add(7.1, 'gasp', 9, 0.7); add(7.35, 'gulp', -9, 0.7); add(7.55, 'bloop', -9, 0.5);
  add(7.92, 'dash', -4, 1.0, { dur: 0.45 }); add(7.95, 'mew', 9, 0.8);
  add(8.55, 'rustle', 0, 0.5); add(9.42, 'wave', -3, 0.6); add(9.62, 'wave', -3, 0.6); add(9.82, 'wave', -3, 0.6);
  add(9.8, 'gulp', -9, 0.8);
  const evs = () => events.filter((e) => e.w < W_END).map((e) => Object.assign({}, e, { t: e.w, slow: 0 })).sort((a, b) => a.t - b.t);
  return { T, FPS, S, OX, Y0, DQ, P, clamp, sstep, lerp, hash, KS, wOf, tOf, W_END, SQ, MQ, WALL_Y, QW, SAM_U, MOC_U, LANT, K_WALL, shu, shuV, shuWalk, POKE, PAT, WAVE, CUDDLE, RECOIL, LUC, LUS, SURP_C, SURP_S, events: evs };
})();
if (typeof module !== 'undefined') module.exports = CUE;
