// cues.js — ONE timeline for picture (anim.js/scene.js), the Python steam/light pass (light.py reads info/cues made by grab.mjs/dump_cues.js) and sound (sfx.py reads cues.json).
// "Steam kettle" (กาน้ำเดือดไอน้ำหรรษา): 10 s, fixed camera, no slow motion (video time t == world time w).
// Story: an iron kettle simmers on a charcoal brazier, thin steam wisps; Mochi follows them with her head and swats at them (paw goes through). The kettle starts to whistle (3.4).
// The samurai steps up and presses the lid down (4.3-5.65): the pressure builds, the kettle shakes, the lid POPS (5.65) and the burst of steam becomes a small CAT-SHAPED cloud that floats around:
// Mochi stares and swats it (it parts and re-forms), the samurai pokes it (it puffs), it thins out and drifts back to the spout; the kettle calms; they look at each other.
// World cm: u right, h up, q toward camera. Python simulates the steam (particles) and the cat cloud (Mochi's own silhouette, warped by noise).
const CUE = (function () {
  const T = 10, FPS = 60;
  const S = 13.5, OX = 540, Y0 = 1400, DQ = 0.6;
  const P = (u, h, q = 0) => [OX + u * S, Y0 + q * DQ * S - h * S];
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const sstep = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const hash = (...a) => { let x = Math.sin(a.reduce((s, v, i) => s + (i + 1) * 12.9898 * v, 78.233)) * 43758.5453; return x - Math.floor(x); };
  function KS(keys, t) {
    const n = keys.length; if (t <= keys[0][0]) return keys[0][1]; if (t >= keys[n - 1][0]) return keys[n - 1][1];
    let i = 1; while (i < n - 1 && t > keys[i][0]) i++;
    const a = keys[i - 1], b = keys[i], dt = b[0] - a[0], u = (t - a[0]) / dt, u2 = u * u, u3 = u2 * u;
    const tan = (k) => { const p = keys[k], q = keys[k - 1], r = keys[k + 1]; if (!q || !r) return 0; if (p[1] === q[1] || p[1] === r[1]) return 0; return (r[1] - q[1]) / (r[0] - q[0]); };
    return (2 * u3 - 3 * u2 + 1) * a[1] + (u3 - 2 * u2 + u) * dt * tan(i - 1) + (-2 * u3 + 3 * u2) * b[1] + (u3 - u2) * dt * tan(i);
  }
  const W_END = T;
  // ---- places (cm)
  const KQ = 12, SQ = 14.5, MQ = 15.9, WALL_Y = 1380;
  const KET = { u: -1, q: KQ };                                           // the kettle stands 2.5-4 cm behind the characters
  const SAM_U = [[0, -11.3], [3.7, -11.3], [4.3, -6.9], [5.9, -6.9], [6.4, -9.8], [7.4, -9.8], [7.85, -6.8], [8.4, -6.8], [8.9, -11.3], [10, -11.3]];
  const MOC_U = 14.3;
  const samU = (w) => KS(SAM_U, w);
  const samSeg = (w) => { for (let k = 0; k < SAM_U.length - 1; k++) { const a = SAM_U[k], b = SAM_U[k + 1]; if (a[1] !== b[1] && w > a[0] && w < b[0]) { const len = Math.abs(b[1] - a[1]), n = Math.max(1, Math.round(2.3 * len / Math.PI)), pr = (samU(w) - a[1]) / (b[1] - a[1]); return { ph: Math.PI * n * pr, sp: clamp(Math.abs((samU(w + 0.01) - samU(w - 0.01)) / 0.02) / 1.0) }; } } return null; };
  // ---- kettle behaviour
  const LIDR = [[0, 0], [1.7, 0], [2.0, 0.35], [3.3, 0.6], [3.5, 0.9], [4.25, 0.9], [4.3, 0], [5.0, 0], [5.45, 0.5], [5.62, 1.0], [5.65, 0], [10, 0]];   // lid rattle amplitude (tick-tick)
  const SHAKE = [[0, 0], [3.4, 0.1], [3.5, 0.4], [4.3, 0.4], [5.0, 0.6], [5.55, 1.0], [5.66, 0.2], [6.0, 0.05], [6.6, 0], [10, 0]];                               // whole kettle vibrates
  const LIDUP = [[0, 0], [5.6, 0], [5.66, 1], [5.82, 0.62], [5.95, 0], [10, 0]];                                                                                // the lid pops up (1 = 2.2 cm) and clinks back
  const PRESS = [[0, 0], [4.0, 0], [4.35, 1], [5.58, 1], [5.66, 0], [10, 0]];                                                                                   // samurai's hand on the lid knob
  const BOUNCE = [[0, 0], [5.62, 0], [5.70, 1], [5.95, 0.55], [6.3, 0], [10, 0]];                                                                               // his hand knocked up
  const POKE = [[0, 0], [7.62, 0], [7.88, 1], [7.98, 1], [8.18, 0], [10, 0]];                                                                                   // samurai pokes the cloud
  const SWAT = [[0, 0], [2.35, 0], [2.58, 1], [2.68, 1], [2.9, 0], [6.8, 0], [7.0, 1], [7.12, 1], [7.35, 0], [10, 0]];                                            // Mochi's paw swats (twice: wisp, then the cloud)
  // ---- steam source strength (1 = normal simmer-boil), the jet through the spout, vent steam from the lid
  const EMIT = [[0, 0.28], [1.6, 0.32], [2.0, 0.7], [3.3, 0.95], [3.45, 1.5], [4.3, 1.0], [4.4, 1.9], [5.55, 2.4], [5.66, 0.4], [5.75, 3.0], [6.0, 0.6], [6.4, 0.4], [8.2, 0.25], [9.0, 0.3], [10, 0.3]];
  const VENT = [[0, 0.3], [4.2, 0.4], [4.35, 0.0], [5.62, 0.0], [5.7, 1.0], [6.1, 0.5], [6.5, 0.3], [10, 0.3]];                                                    // 0 while the lid is pressed down
  const WHISTLE = [[0, 0], [3.4, 0], [3.5, 0.8], [4.3, 0.8], [4.45, 1.0], [5.55, 1.0], [5.66, 0.9], [5.9, 0.3], [6.15, 0], [10, 0]];
  // ---- the cat-shaped cloud: path (u,h) in cm, scale (cm wide), alpha, dissolve amount
  const CPATH = [[5.7, -1.1, 11.5], [6.4, 1.5, 14.2], [6.9, 6.6, 9.4], [7.1, 6.6, 9.2], [7.35, 5.0, 14.0], [7.7, 0.5, 13.0], [7.95, -0.5, 10.5], [8.2, -0.3, 11.5], [8.6, 1.5, 13.5], [9.3, 2.0, 16.5], [10, 3.0, 18]];
  const cloudPos = (w) => [KS(CPATH.map((k) => [k[0], k[1]]), w), KS(CPATH.map((k) => [k[0], k[2]]), w)];
  const CSCALE = [[5.7, 3.0], [6.0, 8.5], [6.4, 10.5], [8.0, 11.0], [9.3, 6.0], [10, 4.5]];
  const CALPHA = [[0, 0], [5.72, 0], [6.05, 0.92], [8.15, 0.92], [8.9, 0.55], [9.4, 0], [10, 0]];
  const CDISS = [[0, 0], [7.0, 0], [7.1, 0.5], [7.4, 0], [7.95, 0], [8.05, 0.8], [8.3, 0.2], [8.7, 0.5], [9.4, 1.0], [10, 1.0]];
  const cloud = (w) => { const p = cloudPos(w); return { u: p[0], h: p[1], s: KS(CSCALE, w), a: clamp(KS(CALPHA, w)), d: clamp(KS(CDISS, w)) }; };
  // ---- the events (picture + sound)
  const ev = [];
  const add = (w, type, u = 0, a = 1, o = {}) => ev.push(Object.assign({ w, type, u, a }, o));
  add(0.3, 'simmer', 0, 1.0, { dur: 9.4 });
  for (let k = 0; k < 6; k++) add(1.9 + k * 0.28 + 0.05 * hash(k), 'tick', 0, 0.3 + 0.25 * hash(k, 2));                 // lid starts to rattle
  for (let k = 0; k < 6; k++) add(3.5 + k * 0.14 + 0.03 * hash(k, 5), 'tick', 0, 0.5 + 0.3 * hash(k, 3));
  add(0.9, 'sniff', 11, 0.4); add(1.55, 'earflick', 11, 0.5);
  add(2.58, 'swish', 8, 0.7); add(2.9, 'huh', 11, 0.5);
  add(3.42, 'whistle', 0, 1.0, { dur: 2.75 }); add(3.5, 'gasp', -11, 0.7); add(3.55, 'earflick', 11, 0.8); add(3.6, 'mew', 11, 0.6);
  add(4.3, 'press', -9, 0.8); add(4.5, 'step', -10, 0.5);
  add(4.95, 'gulp', -9, 0.7); add(5.15, 'bloop', -9, 0.6);
  add(5.65, 'pop', 0, 1.0); add(5.66, 'burst', 0, 1.0, { dur: 0.7 }); add(5.9, 'clink', 0, 0.8); add(5.7, 'oof', -9, 0.8);
  add(6.0, 'gasp', 11, 0.6); add(6.25, 'whoosh', 3, 0.5);
  add(7.0, 'swish', 8, 0.8); add(7.1, 'puff', 6, 0.6); add(7.2, 'mew', 11, 0.7);
  add(7.9, 'poke', -4, 0.8); add(7.95, 'puff', -3, 0.7);
  add(8.6, 'sigh', -9, 0.6); add(9.0, 'blink', 11, 0.3); add(9.4, 'tick', 0, 0.35); add(9.65, 'sigh', 11, 0.5); add(9.8, 'gulp', -11, 0.5);
  // samurai steps (soft pats) while he walks
  (function () { let acc = 0, prev = samU(0); for (let k = 1; k <= T * 200; k++) { const w = k / 200, cur = samU(w); acc += Math.abs(cur - prev); prev = cur; if (acc >= 1.35) { acc -= 1.35; add(w, 'step', cur, 0.4 + 0.2 * hash(k)); } } })();
  const events = () => ev.filter((e) => e.w < W_END).map((e) => Object.assign({}, e, { t: e.w, slow: 0 })).sort((a, b) => a.t - b.t);
  return { T, FPS, S, OX, Y0, DQ, P, clamp, sstep, lerp, hash, KS, W_END, KQ, SQ, MQ, WALL_Y, KET, SAM_U, MOC_U, samU, samSeg, LIDR, SHAKE, LIDUP, PRESS, BOUNCE, POKE, SWAT, EMIT, VENT, WHISTLE, cloud, events };
})();
if (typeof module !== 'undefined') module.exports = CUE;
