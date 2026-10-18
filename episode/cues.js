// cues.js — ONE timeline for picture (anim.js/scene.js) and sound (sfx.py reads cues.json from `node dump_cues.js`).
// Tofu Shop: 6.4 s seamless loop, locked front-elevation iso camera. STORY TIME s wraps 0..6.4 (state(6.4) == state(0)); VIDEO TIME t = s - OFF, frame 0 = Mochi's first poke at full press.
// World cm: u right, h up, q toward camera. g = 981 cm/s^2 for everything that flies.
const CUE = (function () {
  const T = 6.4, FPS = 60, OFF = 0.62, G = 981;
  const S = 13.5, OX = 540, Y0 = 1400, DQ = 0.6;
  const P = (u, h, q = 0) => [OX + u * S, Y0 + q * DQ * S - h * S];
  const mod = (a, n) => ((a % n) + n) % n, clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const sstep = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const sOf = (t) => mod(t + OFF, T);
  const hash = (...a) => { let x = Math.sin(a.reduce((s, v, i) => s + (i + 1) * 12.9898 * v, 78.233)) * 43758.5453; return x - Math.floor(x); };
  // ------------------------------------------------------------- tray + tofu cubes (7 x 5.6 x 4 cm, standing in 1.3 cm of water)
  const TR = { u0: -22, u1: 24, h: 2.4, wl: 1.5, q0: 5, q1: 15.5 };
  const CUBES = [-12.5, 0, 12.5].map((u, i) => ({ i, u, w: 11, hb: 0.6, ht: 8.6, qf: 14.6, qb: 10.6 }));
  const SIT_U = 24.5, MQ = 18.5, SQ = 18, SAM_U = -26.5;
  // ------------------------------------------------------------- pokes: Mochi (far arm from the right), samurai (hand from the left). press window = paw/hand on the cube
  const POKES = [
    { s: 0.62, by: 'paw', c: 2, a: 1.0 }, { s: 1.08, by: 'paw', c: 2, a: 0.8 },
    { s: 2.00, by: 'hand', c: 0, a: 1.0 }, { s: 2.46, by: 'hand', c: 0, a: 0.8 },
  ];
  const WV = 26, FALL = [1, 0.55, 0.34, 0.2];                                // water wave speed cm/s, amplitude falloff per cube
  // ------------------------------------------------------------- shishi-odoshi (bamboo tipper): fills from a dripping pipe, tips at TIP, pours POUR0..POUR1, snaps back and CLACKs at CLACK
  const SH = { pu: -8.5, ph: 19, q: 8, L1: 9, L2: 7, th0: 0.42, th1: -0.62, TIP: 3.30, POUR0: 3.60, POUR1: 4.35, BACK: 4.35, CLACK: 4.62, spout0: -19 };
  SH.fill = (s) => { if (s >= SH.CLACK) return clamp((s - SH.CLACK) / (SH.TIP + T - SH.CLACK)); if (s < SH.TIP) return clamp((s + T - SH.CLACK) / (SH.TIP + T - SH.CLACK)); if (s < SH.POUR1) return 1 - sstep((s - SH.POUR0) / (SH.POUR1 - SH.POUR0)); return 0; };
  SH.th = (s) => {                                                         // tube angle, damped bounce on the stop
    if (s < SH.TIP) return SH.th0 + 0.012 * Math.sin(s * 9) * 0;
    if (s < SH.BACK) { const x = clamp((s - SH.TIP) / 0.30); const e = x * x; let th = SH.th0 + (SH.th1 - SH.th0) * e; if (s > SH.TIP + 0.30) th = SH.th1 + 0.035 * Math.exp(-(s - SH.TIP - 0.3) / 0.07) * Math.cos(2 * Math.PI * (s - SH.TIP - 0.3) / 0.12); return th; }
    if (s < SH.CLACK) { const x = clamp((s - SH.BACK) / (SH.CLACK - SH.BACK)); return SH.th1 + (SH.th0 - SH.th1) * x * x; }
    const t = s - SH.CLACK; return SH.th0 - 0.07 * Math.exp(-t / 0.06) * Math.abs(Math.cos(2 * Math.PI * t / 0.13));
  };
  const DRIPS = []; for (let k = 0; k < 9; k++) DRIPS.push(mod(SH.CLACK + 0.25 + 0.52 * k, T));            // pipe end drips into the tube while it fills (each arrives ~0.11 s after it leaves)
  // ------------------------------------------------------------- cube wobble = sum of damped impulse responses (jelly: 4.6 Hz shear, 8.5 Hz squash), drive = pokes + water waves
  const IMPS = CUBES.map(() => []);
  POKES.forEach((p) => { const sg = p.by === 'paw' ? -1 : 1; CUBES.forEach((c, j) => { const d = Math.abs(j - p.c); IMPS[j].push({ s: p.s + 0.07 + Math.abs(c.u - CUBES[p.c].u) / WV * (d ? 1 : 0), a: p.a * FALL[d] * sg, kind: d ? 'wave' : 'poke', src: 'poke' }); }); });
  CUBES.forEach((c, j) => IMPS[j].push({ s: SH.POUR0 + 0.05 + (c.u - SH.spout0) / WV, a: 0.9 * (1 - 0.08 * j), kind: 'wave', src: 'pour' }));
  const W1 = 2 * Math.PI * 4.6, Z1 = 0.10, W2 = 2 * Math.PI * 8.5, Z2 = 0.16;
  function wob(j, s) {                                                     // returns {sh (cm of top shear), sq (vertical scale)}
    let sh = 0, sv = 0; for (const m of IMPS[j]) { const tau = s - m.s; if (tau < 0) continue; const w1 = W1 * Math.sqrt(1 - Z1 * Z1), w2 = W2 * Math.sqrt(1 - Z2 * Z2);
      sh += m.a * Math.exp(-Z1 * W1 * tau) * Math.sin(w1 * tau) * 1.9; sv += Math.abs(m.a) * Math.exp(-Z2 * W2 * tau) * Math.sin(w2 * tau) * (m.kind === 'poke' ? 0.12 : 0.07); }
    return { sh, sq: 1 + sv };
  }
  function press(j, s) { let k = 0; for (const p of POKES) if (p.c === j) { const t = s - p.s; if (t > -0.16 && t < 0.2) k = Math.max(k, t < 0 ? sstep(1 + t / 0.16) : 1 - sstep(t / 0.2)); } return k; }
  // ------------------------------------------------------------- the leap drop: the last wave kicks one drop off the water toward Mochi's nose (ballistic), it sticks, she sneezes
  const DROP = { s0: 4.80, sHit: 5.10, sSneeze: 5.28, p0: [19.8, 1.5, 12.5], nose: [21.5, 12.8, 18.5], r: 0.5 };
  DROP.T = DROP.sHit - DROP.s0; DROP.v = [(DROP.nose[0] - DROP.p0[0]) / DROP.T, (DROP.nose[1] - DROP.p0[1] + 0.5 * G * DROP.T * DROP.T) / DROP.T, (DROP.nose[2] - DROP.p0[2]) / DROP.T];
  DROP.pos = (s) => { const t = clamp(s - DROP.s0, 0, DROP.T); return [DROP.p0[0] + DROP.v[0] * t, DROP.p0[1] + DROP.v[1] * t - 0.5 * G * t * t, DROP.p0[2] + DROP.v[2] * t]; };
  // pour stream: leaves the spout, ballistic, lands in the water behind the cubes
  const HOPS = [{ t0: 4.68, T: 0.2 }];
  // ------------------------------------------------------------- sound events (video time t = mod(s - OFF, T))
  function events() {
    const E = []; const ad = (s, type, o = {}) => E.push(Object.assign({ s, type, t: mod(s - OFF, T) }, o));
    POKES.forEach((p) => ad(p.s, 'poke', { by: p.by, u: CUBES[p.c].u, a: p.a }));
    IMPS.forEach((l, j) => l.forEach((m) => { if (m.kind === 'wave') ad(m.s, 'jiggle', { u: CUBES[j].u, a: Math.abs(m.a), src: m.src }); }));
    ad(SH.TIP, 'creak'); ad(SH.POUR0, 'pour0'); ad(SH.POUR1, 'pour1'); ad(SH.CLACK, 'clack');
    for (let k = 0; k < 6; k++) ad(SH.POUR0 + 0.08 + 0.12 * k, 'splat', { u: SH.spout0, a: 1 - 0.1 * k });
    DRIPS.forEach((s) => ad(mod(s + 0.11, T), 'drip', { u: -16.7 }));
    ad(DROP.s0, 'leap', { u: DROP.p0[0] }); ad(DROP.sHit, 'nose', { u: DROP.nose[0] }); ad(DROP.sSneeze, 'sneeze', { u: DROP.nose[0] });
    HOPS.forEach((h) => { ad(h.t0, 'hop', { u: SAM_U }); ad(h.t0 + h.T, 'hopland', { u: SAM_U }); });
    [0.3, 1.9, 3.1, 5.6].forEach((s, k) => ad(s, 'simmer', { u: 32, a: 0.6 + 0.4 * (k % 2) }));
    return E.sort((a, b) => a.t - b.t);
  }
  return { IMPS_: IMPS, T, FPS, OFF, G, S, OX, Y0, DQ, P, mod, clamp, sstep, sOf, hash, TR, CUBES, SIT_U, MQ, SQ, SAM_U, POKES, SH, DRIPS, wob, press, DROP, HOPS, events };
})();
if (typeof module !== 'undefined') module.exports = CUE;
