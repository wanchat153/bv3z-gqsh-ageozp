// cues.js — ONE timeline for picture (anim.js/scene.js), the Python light/dust pass (light.py reads out/info + out/tab.json) and sound (sfx.py reads cues.json from `node dump_cues.js`).
// "Ball through the fence" (ลูกบอลลอดรั้ว): 10 s, fixed camera, video time t == world time w.
// Story: Mochi bats a ball; it rolls through the gap of a picket fence (cause -> effect). The samurai is too round for the gap: he bonks the boards, puffs up, squeezes flat, slides through and pops round on the far side.
// Mochi then simply hops onto the fence top (she could always jump). They look at each other across the gap.
// World units: u right, h up, q toward camera. The fence plane is q = QF; Mochi + ball lane QM; the samurai starts on lane QL (nearer the camera); the garden behind the fence is q < QF.
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
  const QF = 6, QM = 11, QL = 15.5, QB = 3.4, FH = 9, GU0 = -1.2, GU1 = 6.6, GC = (GU0 + GU1) / 2, BR = 2.2, BW = 3.8, BP = 4.4;
  // ---- the ball: Mochi's swat at TS sends it from B0 through the gap to B1
  const TS = 1.25, TB1 = 3.0, B0 = [-1.6, QM - 0.6], B1 = [2.4, 2.0];
  const ballPos = (w) => { const s = clamp((w - TS) / (TB1 - TS)), e = 1 - (1 - s) * (1 - s), u = lerp(B0[0], B1[0], e), q = lerp(B0[1], B1[1], e); return { u, q, h: BR, roll: Math.hypot(u - B0[0], (q - B0[1])) / BR, v: s >= 1 || s <= 0 ? 0 : 2 * (1 - s) * Math.hypot(B1[0] - B0[0], B1[1] - B0[1]) / (TB1 - TS) }; };
  // ---- the SAMURAI (face right only). wd = cumulative walking distance (footsteps)
  const WA0 = 2.5, WA1 = 4.1, WB1 = 4.8, T_BONK = 4.95, T_RB = 5.45, T_INH = 6.1, T_CMP = 6.35, T_SQ0 = 6.55, T_POP = 7.25, WC0 = 7.6, WC1 = 8.3, U_FIN = 8.8;
  const sam = (w) => {
    let o = { u: -15.5, h: 0, q: QL, mode: 'stand', ph: 'idle', k: 0, wph: null, wd: 0, sq: 0 };
    const set = (p) => Object.assign(o, p), wph = (d) => Math.PI * d / 1.75;
    if (w < WA0) return o;
    if (w < WA1) { const e = sstep((w - WA0) / (WA1 - WA0)), d = e * 17.1; return set({ u: lerp(-15.5, 1.6, e), wph: wph(d), wd: d, ph: 'walk' }); }
    if (w < WB1) { const e = sstep((w - WA1) / (WB1 - WA1)), d = 17.1 + e * 6.8; return set({ u: lerp(1.6, GC, e), q: lerp(QL, 8.8, e), wph: wph(d), wd: d, ph: 'walk' }); }
    if (w < T_RB) { const d = w - T_BONK; let q = 8.8, k = 0; if (d < 0) { const e = sstep((w - WB1) / (T_BONK - WB1)) ; q = lerp(8.8, 7.7, e * 0.0 + 0); } else { q = 7.7 + 1.7 * (1 - Math.exp(-d * 7)); k = d; }
      return set({ u: GC, q: w < T_BONK ? lerp(8.8, 7.7, sstep((w - WB1) / (T_BONK - WB1))) : q, ph: w < T_BONK ? 'push' : 'bonk', k: w < T_BONK ? clamp((w - WB1) / (T_BONK - WB1)) : d, wd: 24.9 }); }
    if (w < T_INH) return set({ u: GC, q: 9.4, ph: 'think', k: (w - T_RB) / (T_INH - T_RB), wd: 24.9 });
    if (w < T_CMP) return set({ u: GC, q: 9.4, ph: 'inhale', k: (w - T_INH) / (T_CMP - T_INH), wd: 24.9 });
    if (w < T_SQ0) return set({ u: GC, q: 9.4, ph: 'compress', k: (w - T_CMP) / (T_SQ0 - T_CMP), wd: 24.9 });
    if (w < T_POP) { const e = sstep((w - T_SQ0) / (T_POP - T_SQ0)); return set({ u: GC, q: lerp(9.4, QB, e), ph: 'squeeze', k: e, wd: 24.9 }); }
    if (w < WC0) return set({ u: GC, q: QB, ph: 'pop', k: (w - T_POP) / 0.5, wd: 24.9 });
    if (w < WC1) { const e = sstep((w - WC0) / (WC1 - WC0)), d = e * (U_FIN - GC); return set({ u: lerp(GC, U_FIN, e), q: QB, ph: 'walk', wph: wph(d), wd: 24.9 + d }); }
    return set({ u: U_FIN, q: QB, ph: 'idle', wd: 24.9 + (U_FIN - GC) });
  };
  // ---- MOCHI (sits the whole time; face right). swat lunge at TS; hop onto the board top at HP
  const MU0 = -5.5, T_WIND = 0.95, T_LUN = 1.2, HC = 7.2, HF0 = 7.45, HF1 = 8.05, HU = -3.1 - 0.15;
  const moc = (w) => {
    let o = { u: MU0, h: 0, q: QM, mode: 'sit', ph: 'idle', k: 0, face: 1, lun: 0 };
    const set = (p) => Object.assign(o, p);
    if (w >= T_WIND && w < TS + 0.5) { const a = sstep((w - T_WIND) / (T_LUN - T_WIND)) * (1 - sstep((w - TS) / 0.12)); const b = sstep((w - (TS - 0.0)) / 0.12) * (1 - sstep((w - (TS + 0.12)) / 0.38)); return set({ ph: w < TS ? 'wind' : 'lunge', k: a, lun: b, wind: a }); }
    if (w < HC) return o;
    if (w < HF0) return set({ ph: 'crouch', k: clamp((w - HC) / (HF0 - HC)), mode: 'hop' });
    if (w < HF1) { const s = (w - HF0) / (HF1 - HF0); return set({ mode: 'hop', ph: 'fly', k: s, u: lerp(MU0, HU, s), h: lerp(0, FH, s) + 4 * 5 * s * (1 - s), q: lerp(QM, QF, s) }); }
    return set({ u: HU, h: FH, q: QF, ph: 'land', k: clamp((w - HF1) / 0.14) });
  };
  const BLINK = [0.4, 4.0, 7.9, 9.7], BLINKC = [1.7, 3.6, 8.8, 9.4];
  // ---- dust puffs [t, u, h, q, strength]
  const PUFFS = [[T_BONK, GC, 0, 7.7, 0.45], [T_POP, GC, 0, QB, 0.9], [HF1, HU, FH, QF, 0.4], [TS + 0.03, -3.2, 0, QM - 0.5, 0.25]];
  // ---- the events (picture + sound)
  const ev = [];
  const add = (w, type, u = 0, a = 1, o = {}) => ev.push(Object.assign({ w, type, u, a }, o));
  add(0.2, 'amb', 0, 1, { dur: 9.8 });
  add(T_WIND, 'sniff', -7, 0.3); add(1.75, 'earflick', -7, 0.5);
  add(TS, 'swat', -4, 1.0); add(TS + 0.05, 'roll', -2, 0.9, { dur: TB1 - TS });
  add(2.55, 'gasp', -15.5, 0.6); add(3.25, 'blink', -7, 0.3);
  add(WA0, 'hop', -15.5, 0.4);
  for (let w = 0; w < 8.4; w += 0.004) { const a = sam(w).wd, b = sam(w + 0.004).wd; if (Math.floor(a / 1.75) !== Math.floor(b / 1.75) && b > a) add(+(w + 0.002).toFixed(3), 'step', sam(w).u, 0.45); }
  add(T_BONK, 'bonk', 2.5, 1.0); add(T_BONK + 0.03, 'oof', 2.5, 0.8); add(5.1, 'mew', -7, 0.5);
  add(5.8, 'grumble', 2.5, 0.5); add(T_INH, 'inhale', 2.5, 0.6, { dur: 0.25 });
  add(T_CMP, 'squeeze', 2.5, 1.0, { dur: T_POP - T_CMP }); add(T_POP, 'pop', 2.5, 1.0); add(T_POP + 0.1, 'rustle', 2.5, 0.5);
  add(HC + 0.05, 'crouch', -7, 0.5); add(HF0, 'hop', -6, 0.8); add(HF1, 'land', -3, 0.9); add(HF1 + 0.5, 'mew', -3, 0.6);
  add(8.7, 'sigh', 10, 0.6); add(9.3, 'giggle', -3, 0.4); add(9.6, 'purr', -3, 0.4, { dur: 0.3 });
  const events = () => ev.filter((e) => e.w < W_END).map((e) => Object.assign({}, e, { t: e.w, slow: 0 })).sort((a, b) => a.t - b.t);
  return { T, FPS, S, OX, Y0, DQ, P, clamp, sstep, lerp, hash, KS, W_END, WALL_Y, QF, QM, QL, QB, FH, GU0, GU1, GC, BR, BW, BP, TS, TB1, ballPos, T_BONK, T_RB, T_INH, T_CMP, T_SQ0, T_POP, WA0, WC0, WC1, U_FIN, HC, HF0, HF1, HU, sam, moc, BLINK, BLINKC, PUFFS, MU0, events };
})();
if (typeof module !== 'undefined') module.exports = CUE;
