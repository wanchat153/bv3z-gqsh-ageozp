// cues.js — ONE timeline shared by the picture (anim.js/scene.js) and the sound (music.py reads cues.json made by `node dump_cues.js`).
// Pebble Garden: a marble run on a locked iso camera. 32 s loop, 120 BPM (beat 0.5 s, bar 2 s), 8 marbles, one released every bar.
// World units: cm. u = screen-right, h = height, q = depth toward camera (shifts down the screen). Marble plane is q = 0.
const CUE = (function () {
  const T = 32, FPS = 30, BPM = 120, BEAT = 0.5, BAR = 2.0, G = 981, RM = 2.2, NM = 8, CYC = 16;
  const S = 11.5, OX = 547, Y0 = 1560, DQ = 0.6;                 // px per cm, screen x of u=0, floor line (q=0,h=0), depth factor
  const P = (u, h, q = 0) => [OX + u * S, Y0 + q * DQ * S - h * S];
  const mod = (a, n) => ((a % n) + n) % n, clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const sstep = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  // rotate an (u,h) offset by a screen-clockwise angle th (h is up, so flip)
  const rotUH = (du, dh, th) => { const x = du, y = -dh, c = Math.cos(th), s = Math.sin(th); return [x * c - y * s, -(x * s + y * c)]; };

  // ---------------------------------------------------------------- elevator (right edge): chain loop with 8 cups
  const EL = { H: 96, hb: 13, ht: 109, uc: 35.4 }; EL.rs = 384 / (20 * Math.PI); EL.uUp = EL.uc - EL.rs; EL.uDn = EL.uc + EL.rs;
  EL.L = 2 * EL.H + 2 * Math.PI * EL.rs; EL.V = EL.L / CYC; EL.SP = EL.L / NM;            // cup spacing = 2 s of travel
  const CUPO = [-3.6, -2.6], MRO = [0, 1.15];                                             // cup centre and marble rest relative to the pin
  function pin(s) {
    s = mod(s, EL.L); const { H, hb, ht, uc, rs, uUp, uDn } = EL;
    if (s < H) return [uUp, hb + s]; s -= H;
    if (s < Math.PI * rs) { const th = Math.PI - s / rs; return [uc + rs * Math.cos(th), ht + rs * Math.sin(th)]; } s -= Math.PI * rs;
    if (s < H) return [uDn, ht - s]; s -= H;
    const th = -s / rs; return [uc + rs * Math.cos(th), hb + rs * Math.sin(th)];
  }
  function cupTilt(s) { s = mod(s, EL.L); const a = EL.H + 0.2, b = EL.H + 6.2; if (s < a || s > b) return 0; return -0.95 * Math.pow(Math.sin(Math.PI * (s - a) / (b - a)), 2); }
  function cupAt(s) { const p = pin(s), th = cupTilt(s), c = rotUH(CUPO[0], CUPO[1], th), m = rotUH(CUPO[0] + MRO[0], CUPO[1] + MRO[1], th); return { pin: p, tilt: th, c: [p[0] + c[0], p[1] + c[1]], m: [p[0] + m[0], p[1] + m[1]] }; }
  const S_REL = EL.H + 1.4, RIDE = S_REL / EL.V, DESC = CYC - RIDE;                      // marble leaves the cup at S_REL; descent lasts the rest of the 16 s cycle
  const TB = 0.0 - 0.0;                                                                     // (set below) block hit time inside the descent
  const XEND = 7.67, TBLOCK = DESC - XEND;                                                  // x = time since the block hit; the lob lands at x = XEND
  // block hit falls on a downbeat at t = 0 (mod 2): cup phase tb chosen so that
  const TBP = -mod(RIDE + TBLOCK, BAR);                                                     // cup 0 passes the load point at t = TBP (mod 2)

  // ---------------------------------------------------------------- stations (cm)
  const CH = { a: [24.9, 107.7], b: [-36.4, 98.4] };                                         // chute 1 marble centres
  const BARS = []; for (let i = 0; i < 8; i++) BARS.push({ u: -34.7 + 7.0 * i, h: 84 - 3.4 * i, w: 6.0, d: 10 - 0.6 * i });
  const CATCH = [18.8, 52.4], LIP3 = [-7.0, 46.0], SHI = { pv: [-11.0, 33.5], cupL: -10.5, tailL: 8.0, stone: [-2.8, 28.6] };
  const GUT = { a: [-24.8, 7.0], b: [-11.5, 3.0] };                                          // low gutter (Mochi pats the marble onto it)
  const PLK = { pv: [-1.0, 4.0], half: 10.0, rest: 0.20, hit: -0.30 };                       // plank (screen-clockwise positive: + = left end up? see plankAng)
  const FOOT = cupAt(0).m;                                                                   // where the lob lands (cup at the load point)
  const STOOL = { u: 12.5, h: 13.0 };

  function plankAng(x) {                    // radians, screen-clockwise positive; rest: left end DOWN (negative): we use ang so that left end y = pv + half*sin(ang)
    // x = time since the block hit. impact at x = 7.0: right end slams down (left end up)
    const rest = -0.20, up = 0.30;
    if (x < 7.0) return rest + (x > 6.9 ? 0 : 0);
    const k = x - 7.0;
    if (k < 0.10) return rest + (up - rest) * sstep(k / 0.10);
    const kk = k - 0.10; const settle = up + (rest - up) * (1 - Math.exp(-kk * 3.2)) + 0.10 * Math.exp(-kk * 4.5) * Math.sin(kk * 14);
    return settle;
  }
  function plankEnds(x) { const a = plankAng(x), c = Math.cos(a), s = Math.sin(a); return { a, L: [PLK.pv[0] - PLK.half * c, PLK.pv[1] - PLK.half * s], R: [PLK.pv[0] + PLK.half * c, PLK.pv[1] + PLK.half * s] }; }
  // plank angle convention: positive a => right end higher? here R.h = pv.h + half*sin(a): a>0 raises the RIGHT end. Rest keeps the right end up? we want left end low at rest:
  // rest a = +0.20 => right end up, left end down (matches), impact a = -0.30 => right end down, left end up.
  function plankAng2(x) { const rest = 0.20, hit = -0.30; if (x < 7.0) return rest; const k = x - 7.0; if (k < 0.10) return rest + (hit - rest) * sstep(k / 0.10); const kk = k - 0.10; return rest + (hit - rest) * Math.exp(-kk * 3.4) * Math.cos(kk * 9); }
  function plank(x) { const a = plankAng2(x), c = Math.cos(a), s = Math.sin(a); return { a, L: [PLK.pv[0] - PLK.half * c, PLK.pv[1] - PLK.half * s], R: [PLK.pv[0] + PLK.half * c, PLK.pv[1] + PLK.half * s],
      mL: [PLK.pv[0] - (PLK.half - 2.6) * c - RM * s * -1 * -1, PLK.pv[1] - (PLK.half - 2.6) * s + RM * c] }; }
  // marble rest point on the plank's left end (centre): along the plank, 2.6 from the end, RM above the surface (normal = (-sin a, cos a))
  function plankMarble(x) { const a = plankAng2(x), c = Math.cos(a), s = Math.sin(a), d = PLK.half - 2.6; return [PLK.pv[0] - d * c - RM * s, PLK.pv[1] - d * s + RM * c]; }
  function plankEndR(x) { const a = plankAng2(x), c = Math.cos(a), s = Math.sin(a); return [PLK.pv[0] + (PLK.half - 1.5) * c, PLK.pv[1] + (PLK.half - 1.5) * s + 0.9]; }

  // shishi-odoshi tube angle (screen-clockwise positive: + = left (cup) end up). x = time since the block hit.
  function shiAng(x) {
    const rest = 0.44, down = -0.62;
    if (x < 3.5) return rest;
    if (x < 3.75) return rest - 0.10 * Math.sin(Math.PI * (x - 3.5) / 0.25) * 1.0;      // marble lands: small dip
    if (x < 4.00) return rest + (down - rest) * sstep((x - 3.75) / 0.25);                // tips, pours
    if (x < 4.50) return down + (rest - down) * Math.pow(sstep((x - 4.00) / 0.50), 2.2);  // swings back, hits the stone
    const k = x - 4.5; return rest + 0.12 * Math.exp(-k * 7) * Math.sin(k * 26);        // bounce-settle
  }
  function shiCupPoint(x) { const a = shiAng(x), r = rotUH(-9.0, 2.5, a); return [SHI.pv[0] + r[0], SHI.pv[1] + r[1]]; }
  function shiMarble(x) { const a = shiAng(x), r = rotUH(-8.6, 2.2 + RM * 0.2, a); return [SHI.pv[0] + r[0], SHI.pv[1] + r[1]]; }

  // ---------------------------------------------------------------- descent program (time tau since the marble left the cup)
  const seg = [], ev = [];
  const A0 = (() => { const c = cupAt(S_REL); return c.m; })();
  const roll = (t0, t1, a, b, v0 = 0) => seg.push({ k: 'roll', t0, t1, a, b, v0 });
  const fly = (t0, t1, a, b) => seg.push({ k: 'fly', t0, t1, a, b });
  const hold = (t0, t1, a) => seg.push({ k: 'hold', t0, t1, a });
  const dyn = (t0, t1, f) => seg.push({ k: 'dyn', t0, t1, f });      // f(tau) -> [u,h]
  const X = (x) => TBLOCK + x;
  const E = (x, type, extra) => ev.push(Object.assign({ tau: X(x), x, type }, extra || {}));
  fly(0, 0.12, A0, [CH.a[0], CH.a[1]]);
  roll(0.12, X(0), CH.a, CH.b, 18);
  E(0, 'block', { u: CH.b[0] - 2.2, h: CH.b[1] });
  // marimba
  { let prev = CH.b, tp = X(0);
    for (let i = 0; i < 8; i++) { const b = BARS[i], lp = [b.u, b.h + RM], tl = X(0.25 * (i + 1)); fly(tp, tl, prev, lp); E(0.25 * (i + 1), 'bar', { i, u: b.u, h: b.h }); prev = lp; tp = tl; }
    fly(tp, X(2.25), prev, CATCH); E(2.25, 'catch', { u: CATCH[0], h: CATCH[1] });
    roll(X(2.25), X(3.25), CATCH, LIP3, 0); fly(X(3.25), X(3.5), LIP3, shiMarble(3.5)); E(3.5, 'cupland', { u: shiMarble(3.5)[0], h: shiMarble(3.5)[1] });
    dyn(X(3.5), X(3.9), (tau) => shiMarble(tau - TBLOCK));
    const out = shiMarble(3.9); const r3b = [out[0] - 4.2, 30.4];
    roll(X(3.9), X(4.25), out, r3b, 12);
    const land = [GUT.a[0] + 1.5, GUT.a[1] + RM];
    fly(X(4.25), X(4.5), r3b, land); E(4.5, 'floor', { u: land[0], h: land[1], g: 1 });
    // bounces on the low gutter (e = 0.5): apex 4.0, 1.0, 0.25 cm
    const bo = (x0, x1, apex) => { const L = [land[0] + 0.15 * (x0 - 4.5) * 10, land[1]]; return L; };
    let bu = land[0]; const bt = [[4.5, 4.68, 4.0], [4.68, 4.77, 1.0], [4.77, 4.815, 0.25]];
    for (let j = 0; j < bt.length; j++) { const [x0, x1, ap] = bt[j], d = x1 - x0, vy = 0.5 * G * d; // symmetric arc, apex = vy^2/2g
      seg.push({ k: 'arc', t0: X(x0), t1: X(x1), a: [bu, land[1]], b: [bu + 0.3, land[1]], apex: ap }); bu += 0.3; if (j < 2) E(x1, 'floor', { u: bu, h: land[1], g: 0.5 / (j + 1) }); }
    const gm = [bu, land[1]];
    // Mochi pats the marble at x = 5.0; it rolls down the low gutter to the plank's left end
    hold(X(4.815), X(5.0), gm);
    E(5.0, 'pat', { u: gm[0], h: gm[1] });
    const pl = plankMarble(6.5);
    roll(X(5.0), X(6.5), gm, pl, 15);
    dyn(X(6.5), X(7.05), (tau) => plankMarble(tau - TBLOCK));
    E(7.0, 'plank', { u: plank(7.0).R[0], h: plank(7.0).R[1] });
    fly(X(7.05), X(XEND), plankMarble(7.05), FOOT); E(XEND, 'cupin', { u: FOOT[0], h: FOOT[1] });
  }
  E(1.25, 'roll_end', {});

  function descent(tau) {
    tau = clamp(tau, 0, DESC - 1e-6);
    for (const s of seg) if (tau >= s.t0 && tau < s.t1) {
      const d = s.t1 - s.t0, x = tau - s.t0;
      if (s.k === 'roll') { const L = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]), acc = 2 * (L - s.v0 * d) / (d * d), f = (s.v0 * x + 0.5 * acc * x * x) / L; return [s.a[0] + (s.b[0] - s.a[0]) * f, s.a[1] + (s.b[1] - s.a[1]) * f]; }
      if (s.k === 'fly') { const vy = (s.b[1] - s.a[1] + 0.5 * G * d * d) / d; return [s.a[0] + (s.b[0] - s.a[0]) * x / d, s.a[1] + vy * x - 0.5 * G * x * x]; }
      if (s.k === 'arc') { const g = 8 * s.apex / (d * d); const vy = 0.5 * g * d; return [s.a[0] + (s.b[0] - s.a[0]) * x / d, s.a[1] + vy * x - 0.5 * g * x * x]; }
      if (s.k === 'hold') return s.a.slice();
      if (s.k === 'dyn') return s.f(tau);
    }
    return seg[seg.length - 1].b ? seg[seg.length - 1].b.slice() : FOOT.slice();
  }
  const PAL8 = ['#FF8FA3', '#FFB26B', '#FFE066', '#8FD694', '#6FC8E8', '#8C9EFF', '#C79BFF', '#FF9FD0'];
  // marble m (0..7): loaded into a cup at t = TBP + 2 m (mod CYC)
  function marble(t, m) {
    const phi = mod(t - (TBP + BAR * m), CYC);
    if (phi < RIDE) { const c = cupAt(EL.V * phi); return { u: c.m[0], h: c.m[1], st: 'ride', phi, s: EL.V * phi, col: PAL8[m] }; }
    const p = descent(phi - RIDE); return { u: p[0], h: p[1], st: 'run', tau: phi - RIDE, phi, col: PAL8[m] };
  }
  function cups(t) { const out = []; for (let j = 0; j < NM; j++) { const s = mod(EL.V * (t - TBP - BAR * j), EL.L); out.push(Object.assign({ s, j }, cupAt(s))); } return out; }

  // ---------------------------------------------------------------- performers (functions of time since the block hit, x, taken mod 2)
  const xOf = (t, xe) => mod(t - (TBP + RIDE + TBLOCK) - xe + BAR / 2, BAR) - BAR / 2;     // time relative to an event that happens at x = xe (inside a 2 s window)
  // absolute events for the sound track
  function events() {
    const out = [];
    for (let m = 0; m < NM; m++) for (let r = -1; r <= 2; r++) {
      const t0 = TBP + BAR * m + CYC * r + RIDE;                          // release time of this marble
      for (const e of ev) { const t = t0 + e.tau; const tw = mod(t, T); out.push(Object.assign({}, e, { t: tw, m })); }
      // belt events
      out.push({ type: 'release', t: mod(t0, T), m, u: A0[0], h: A0[1] });
      const tl = t0 + DESC; out.push({ type: 'cupin', t: mod(tl, T), m });
    }
    // dedupe (r loop covers wraps)
    const seen = new Set(); return out.filter((e) => { const k = e.type + '|' + e.m + '|' + (e.i ?? '') + '|' + Math.round(e.t * 1000) + '|' + (e.g ?? ''); if (seen.has(k)) return false; seen.add(k); return true; }).sort((a, b) => a.t - b.t);
  }
  return { T, FPS, BPM, BEAT, BAR, G, RM, NM, CYC, S, OX, Y0, DQ, P, mod, clamp, sstep, rotUH, EL, pin, cupAt, cupTilt, S_REL, RIDE, DESC, TBLOCK, TBP, CH, BARS, CATCH, LIP3, SHI, GUT, PLK, FOOT, STOOL,
    plank, plankAng2, plankMarble, plankEndR, shiAng, shiMarble, shiCupPoint, descent, marble, cups, xOf, events, PAL8, A0, seg, ev };
})();
if (typeof module !== 'undefined') module.exports = CUE;
