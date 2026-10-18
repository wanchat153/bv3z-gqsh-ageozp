// cues.js — ONE timeline for picture (anim.js/scene.js), the Python light/dust pass (light.py reads out/info + out/tab.json) and sound (sfx.py reads cues.json from `node dump_cues.js`).
// "Playground slide" (สไลเดอร์): 10 s, fixed camera, no slow motion (video time t == world time w).
// Story: Mochi sits at the bottom of a slide. The samurai hops up the three steps (he cannot climb with short arms), crouches, slides down and BUMPS into her (squash, dust).
// Her turn: she trots to the steps, hops up, sits, slides down and bumps into HIS back (he is standing on the end of the slide). They look at each other. Cause->effect: slide down -> bump.
// World cm: u right, h up, q toward camera. The slide structure stands at q = QS; both stand on it / on the sand at q = QS (Mochi trots in front at q = QT).
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
  const W_END = T, WALL_Y = 1395;
  const QS = 10.5, QT = 13.6;
  // ---- the slide (cm): steps 5 cm high, platform 15, ramp straight (slope 1.05) then curved out to a flat lip at 5 cm
  const ST = [{ u0: -18, u1: -14, h: 5 }, { u0: -14, u1: -10, h: 10 }, { u0: -10, u1: -5, h: 15 }];
  const RAMP = { u0: -5, h0: 15, k: 1.05, uc: 1.5, ue: 7.5, lipEnd: 11.5 };
  RAMP.hc = RAMP.h0 - RAMP.k * (RAMP.uc - RAMP.u0); RAMP.he = RAMP.hc - 0.5 * RAMP.k * (RAMP.ue - RAMP.uc);
  const rampH = (u) => u <= RAMP.u0 ? RAMP.h0 : u <= RAMP.uc ? RAMP.h0 - RAMP.k * (u - RAMP.u0) : u <= RAMP.ue ? RAMP.hc - RAMP.k * ((u - RAMP.uc) - (u - RAMP.uc) ** 2 / (2 * (RAMP.ue - RAMP.uc))) : RAMP.he;
  const rampSlope = (u) => (rampH(u + 0.05) - rampH(u - 0.05)) / 0.1;                    // dh/du (negative = going down to the right)
  // ---- generic hop: crouch [c0,f0], flight [f0,f1] on a parabola with apex extra `ap`, landing squash after f1
  const hop = (w, c0, f0, f1, a, b, ap) => { if (w < f0) return { ph: w < c0 ? 'idle' : 'crouch', k: clamp((w - c0) / (f0 - c0)), u: a[0], h: a[1], q: a[2] }; if (w >= f1) return { ph: 'land', k: clamp((w - f1) / 0.12), u: b[0], h: b[1], q: b[2] };
    const s = (w - f0) / (f1 - f0); return { ph: 'fly', k: s, u: lerp(a[0], b[0], s), h: lerp(a[1], b[1], s) + 4 * ap * s * (1 - s), q: lerp(a[2], b[2], s) }; };
  // =============================================================== the SAMURAI (face right only)
  const SH = [[0.5, 0.7, 1.05, [-18.5, 0, QS], [-14.5, 5, QS], 2.6], [1.15, 1.3, 1.65, [-14.5, 5, QS], [-10.5, 10, QS], 2.6], [1.75, 1.9, 2.25, [-10.5, 10, QS], [-6.5, 15, QS], 2.6]];
  const T_SL0 = 2.95, T_SL1 = 3.7, SL_U0 = -4.0, SL_U1 = 6.6;                            // slide: start at the platform edge, contact with Mochi at u = 8
  const slideU = (w) => { const e = clamp((w - T_SL0) / (T_SL1 - T_SL0)); return lerp(SL_U0, SL_U1, e * e); };
  const T_WK0 = 4.95, T_WK1 = 5.75, T_DN0 = 5.8, T_DN1 = 6.1, U_END = 16.0, U_LIP = 11.4;   // after the bump he walks right along the lip, hops down to the sand and waits there
  const T_MSL0 = 8.55, T_MSL1 = 9.25, T2 = T_MSL1, MSL_U0 = -6.2, MSL_U1 = 3.9;
  const lipU = 7.4;
  const sam = (w) => {
    let o = { u: -18.5, h: 0, q: QS, mode: 'stand', ph: 'idle', k: 0, walk: null, slope: 0 };
    const set = (p) => Object.assign(o, p);
    if (w < 2.47) {
      for (const [c0, f0, f1, a, b, ap] of SH) { if (w >= c0 && w < f1 + 0.12) { const hp = hop(w, c0, f0, f1, a, b, ap); return set({ u: hp.u, h: hp.h, q: hp.q, mode: 'hop', ph: hp.ph, k: hp.k }); } if (w >= f1 + 0.12) set({ u: b[0], h: b[1] }); }
      return o;
    }
    if (w < T_SL1) {                                                                          // platform: shuffle to the edge, crouch, slide
      const u = w < T_SL0 ? lerp(-6.5, SL_U0, sstep((w - 2.55) / 0.35)) : slideU(w);
      set({ u, h: rampH(u), slope: Math.atan(-rampSlope(u)) });
      if (w >= 2.6 && w < T_SL0) set({ ph: 'crouch', k: clamp((w - 2.6) / 0.3) });
      if (w >= T_SL0) set({ mode: 'slide', ph: 'slide', k: (w - T_SL0) / (T_SL1 - T_SL0) });
      return o;
    }
    const d = w - T_SL1;                                                                       // bump with Mochi at the lip
    if (w < T_WK0) return set({ u: SL_U1 - 0.6 * (1 - Math.exp(-d * 12)), h: rampH(SL_U1), ph: d < 0.5 ? 'bump' : 'stand', k: clamp(d / 0.5) });
    const u0 = SL_U1 - 0.6;
    if (w < T_WK1) { const e = sstep((w - T_WK0) / (T_WK1 - T_WK0)); return set({ u: lerp(u0, U_LIP, e), h: 5.025, walk: 1, wk: e }); }
    if (w < T_DN0) return set({ u: U_LIP, h: 5.025 });
    if (w < T_DN1) { const hp = hop(w, T_DN0 - 0.001, T_DN0 + 0.0, T_DN1, [U_LIP, 5.025, QS], [U_END, 0, QS], 1.2); return set({ u: hp.u, h: hp.h, mode: 'hop', ph: 'fly', k: hp.k }); }
    let u = U_END; if (w >= T2) { const e = w - T2; u = U_END + 1.6 * (1 - Math.exp(-e * 9)) - 0.5 * (1 - Math.exp(-Math.max(0, e - 0.3) * 6)); set({ ph: e < 0.5 ? 'bump' : 'stand', k: clamp(e / 0.5) }); }
    return set({ u, h: 0 });
  };
  // =============================================================== MOCHI
  const MU0 = 17.8, T_TROT0 = 4.65, T_TROT1 = 5.95, MU_STEP0 = -19.5;                       // trot from the bottom (u 16) to the foot of the steps
  const MH = [[6.15, 6.3, 6.65, [-19.5, 0, QS], [-16, 5, QS], 3.0], [6.8, 6.95, 7.3, [-16, 5, QS], [-12, 10, QS], 3.0], [7.45, 7.6, 7.95, [-12, 10, QS], [-7.5, 15, QS], 3.0]];
  const mSlideU = (w) => { const e = clamp((w - T_MSL0) / (T_MSL1 - T_MSL0)); return lerp(MSL_U0, MSL_U1, e * e); };
  const moc = (w) => {
    let o = { u: MU0, h: 0, q: QS, mode: 'sit', ph: 'idle', k: 0, slope: 0, face: -1 };
    const set = (p) => Object.assign(o, p), d = w - T_SL1, push = d > 0 ? 1.3 * (1 - Math.exp(-d * 18)) * Math.exp(-d * 2.2) : 0;
    if (w < T_TROT0) return set({ u: MU0 + push, ph: d > 0 ? 'bumped' : 'idle', k: clamp(d / 0.5) });
    if (w < T_TROT1) { const e = (w - T_TROT0) / (T_TROT1 - T_TROT0), x0 = MU0 + push, lane = sstep((w - T_TROT0) / 0.35) * (1 - sstep((w - (T_TROT1 - 0.4)) / 0.4)); return set({ u: lerp(x0, MU_STEP0, e * (2 - e)), q: lerp(QS, QT, lane), mode: 'trot', ph: 'trot', k: e }); }
    if (w < 6.15) return set({ u: MU_STEP0, mode: 'turn', ph: 'turn', k: (w - T_TROT1) / 0.2, face: (w - T_TROT1) / 0.2 > 0.5 ? 1 : -1 });
    set({ face: 1 });
    if (w < 8.17) { set({ u: MU_STEP0, mode: 'stand' }); for (const [c0, f0, f1, a, b, ap] of MH) { if (w >= c0 && w < f1 + 0.12) { const hp = hop(w, c0, f0, f1, a, b, ap); return set({ u: hp.u, h: hp.h, q: hp.q, mode: 'hop', ph: hp.ph, k: hp.k }); } if (w >= f1 + 0.12) set({ u: b[0], h: b[1] }); } return o; }
    if (w < T_MSL0) { const u = w < 8.15 ? -7.5 : lerp(-7.5, MSL_U0, sstep((w - 8.17) / 0.35)); return set({ u, h: 15, mode: 'sit', ph: w < 8.5 ? 'idle' : 'ready', k: clamp((w - 8.17) / 0.38) }); }
    if (w < T_MSL1) { const u = mSlideU(w); return set({ u, h: rampH(u), mode: 'slide', ph: 'slide', k: clamp((w - T_MSL0) / (T_MSL1 - T_MSL0)), slope: Math.atan(-rampSlope(u)) }); }
    const e = w - T_MSL1, u = MSL_U1 - 0.9 * (1 - Math.exp(-e * 9)) * 0 - 0.6 * (1 - Math.exp(-e * 8)); return set({ u, h: rampH(u), mode: 'sit', ph: 'bumped', k: clamp(e / 0.5), slope: Math.atan(-rampSlope(u)) });
  };
  // ---- looks (who looks at what), blink times, extras
  const GAZE_S = [[0, 1], [3.7, 1], [4.4, -1], [5.9, -1], [7.0, 1], [8.7, 1], [9.4, -1], [10, -1]];   // samurai eyes: 1 = toward the right/Mochi, -1 = looks back left
  const BLINK = [0.4, 4.9, 6.9, 9.8], BLINKC = [1.3, 4.5, 7.3, 9.6];
  // ---- dust puffs [t, u, h, q, strength]
  const PUFFS = [[0.5 + 0.2, -18.5, 0, QS, 0.3], [1.05, -14.5, 5, QS, 0.3], [1.65, -10.5, 10, QS, 0.3], [2.25, -6.5, 15, QS, 0.3], [T_SL1, 9.0, 5, QS, 1.0], [T_TROT0, 16, 0, QS, 0.4], [5.1, 8, 0, QT, 0.2], [5.4, -2, 0, QT, 0.2], [5.7, -12, 0, QT, 0.2],
    [6.65, -16, 5, QS, 0.3], [7.3, -12, 10, QS, 0.3], [7.95, -7.5, 15, QS, 0.3], [T_MSL1, 9.0, 5.4, QS, 1.0]];
  // ---- the events (picture + sound)
  const ev = [];
  const add = (w, type, u = 0, a = 1, o = {}) => ev.push(Object.assign({ w, type, u, a }, o));
  add(0.2, 'amb', 0, 1, { dur: 9.8 });
  add(0.55, 'crouch', -18.5, 0.5); add(1.05, 'land', -14.5, 0.7); add(1.65, 'land', -10.5, 0.7); add(2.25, 'land', -6.5, 0.8);
  add(0.7, 'hop', -18, 0.7); add(1.3, 'hop', -14, 0.7); add(1.9, 'hop', -10, 0.7);
  add(1.4, 'sniff', 16, 0.3); add(2.2, 'earflick', 16, 0.5); add(2.9, 'gasp', 16, 0.6);
  add(T_SL0, 'slideStart', -4, 1.0, { dur: T_SL1 - T_SL0 }); add(T_SL1, 'bump', 9, 1.0); add(T_SL1 + 0.02, 'oof', 8, 0.8); add(T_SL1 + 0.06, 'mew', 16, 0.8);
  add(4.1, 'blink', 8, 0.3); add(4.35, 'sigh', 16, 0.5); add(4.9, 'grumble', 16, 0.6);
  add(5.12, 'step', 9, 0.4); add(5.32, 'step', 10, 0.4); add(5.58, 'step', 11, 0.4); add(6.1, 'land', 16, 0.8); add(6.12, 'bumpdust', 16, 0.3);
  add(T_TROT0, 'trotStart', 16, 1.0, { dur: T_TROT1 - T_TROT0 });
  add(6.15, 'hop', -20, 0.7); add(6.65, 'land', -16, 0.7); add(6.8, 'hop', -16, 0.7); add(7.3, 'land', -12, 0.7); add(7.45, 'hop', -12, 0.7); add(7.95, 'land', -7.5, 0.8);
  add(8.2, 'gasp', 8, 0.5); add(8.4, 'mew', -6, 0.5);
  add(T_MSL0, 'slideStart', -5, 1.0, { dur: T_MSL1 - T_MSL0 }); add(T_MSL1, 'bump', 8, 1.0); add(T_MSL1 + 0.02, 'oof', 8, 0.8); add(T_MSL1 + 0.1, 'mew', 6, 0.8);
  add(9.55, 'giggle', 8, 0.5); add(9.75, 'purr', 6, 0.5, { dur: 0.25 });
  const events = () => ev.filter((e) => e.w < W_END).map((e) => Object.assign({}, e, { t: e.w, slow: 0 })).sort((a, b) => a.t - b.t);
  return { T, FPS, S, OX, Y0, DQ, P, clamp, sstep, lerp, hash, KS, W_END, WALL_Y, QS, QT, ST, RAMP, rampH, rampSlope, SH, MH, T_SL0, T_SL1, T_MSL0, T_MSL1, T_TROT0, T_TROT1, T_WK0, T_WK1, T_DN0, T_DN1, U_END, sam, moc, GAZE_S, BLINK, BLINKC, PUFFS, MU0, MU_STEP0, events };
})();
if (typeof module !== 'undefined') module.exports = CUE;
