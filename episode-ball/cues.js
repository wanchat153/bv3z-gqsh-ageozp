// cues.js — ONE timeline for picture (anim.js/scene.js), the Python ball pass (light.py reads info/*.json made in grab.mjs) and sound (sfx.py reads cues.json from `node dump_cues.js`).
// "Super ball" (ลูกบอลเด้งไม่หยุด): 10 s, fixed camera, no slow motion (video time t == world time w).
// Story: a rubber ball bounces between the samurai and Mochi, every bounce lower and quicker (restitution), they watch it like tennis. Mochi hop-pounces and misses; her landing THUMP jolts the floor
// exactly when the ball is down, so it rebounds high toward the samurai, who ducks, stands up into it: the ball lands on his pointed head and SLIDES OFF (nothing can sit on it), skips to Mochi's raised paw, bounces
// out again, decays and rolls to a stop. World cm: u right, h up (ball CENTRE height), q toward camera. All flights are exact parabolas (g = 981 cm/s^2) through the contact nodes.
const CUE = (function () {
  const T = 10, FPS = 60, G = 981, R = 3.2;                                        // ball radius 3.2 cm
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
  const wOf = (t) => t, tOf = (w) => w, W_END = T, WALL_Y = 1380;
  const SQ = 14, MQ = 15.4, BQ = 21;                                               // characters 16 cm in front of the wall; the ball is 6 cm nearer the camera than them
  const SAM_U = -12, MOC_U0 = 12;
  // measured from the samurai drop outline (anim.js `tipProbe`): head tip relative to his centre line / the floor, in cm
  const TIP = { du: 0.16, h: 21.9 };
  // ------------------------------------------------------------------ the ball: contact nodes {t,u,h,kind}; between two nodes the ball flies on the exact parabola through them
  const nodes = [];
  const H0 = 34, RHO = 0.87;                                                       // dropped from 34 cm above its rest height; each bounce keeps 84 % of the height (restitution 0.92)
  let t = 0, H = H0, n = 0;
  nodes.push({ t: 0, u: -5.2, h: R + H0, kind: 'apex' });
  t = Math.sqrt(2 * H0 / G);
  const AMP = (k) => 5.2 * Math.pow(0.985, k);
  let k = 0; nodes.push({ t, u: -AMP(k) * 0.9, h: R, kind: 'floor' });
  while (true) {
    H *= RHO; const dt = 2 * Math.sqrt(2 * H / G); if (t + dt > 4.9 && H < 3.6) break; t += dt; k++;
    nodes.push({ t, u: (k % 2 ? 1 : -1) * AMP(k), h: R, kind: 'floor' });
    if (t > 5.4) break;
  }
  // the thump contact must have the ball at u < 0 (Mochi lands to the right of it) and be the last decay node
  const last = nodes[nodes.length - 1]; if (last.u > 0) last.u = -Math.abs(last.u) - 2.5; last.u = -5.0;
  const TC = last.t, UC = last.u; last.kind = 'thump';
  // rebound toward the samurai: lands on his pointed tip
  const T_TIP = TC + 0.38;
  nodes.push({ t: T_TIP, u: SAM_U + TIP.du + 0.75 * R, h: TIP.h + 0.62 * R, kind: 'tip' });
  // skid off the cone (to the right), pops a little off it and lands on the floor
  const T_SL = T_TIP + 0.25; nodes.push({ t: T_SL, u: SAM_U + 6.2, h: R, kind: 'floor' });
  // skips to Mochi's raised paw (she sits at MOC_U1 after the hop; the paw tip comes from anim.js and is mirrored here)
  const MOC_U1 = 6.6, PAW = { du: -7.1, h: 3.2 };                                 // paw contact point relative to her centre (cm)
  const T_PAW = T_SL + 0.30; nodes.push({ t: T_PAW, u: MOC_U1 + PAW.du, h: PAW.h + R * 0.95, kind: 'paw' });
  // bounces off her paw back to the left, then decays by the same restitution while drifting
  const T_OUT = T_PAW + 0.30; nodes.push({ t: T_OUT, u: MOC_U1 + PAW.du - 0.6, h: R, kind: 'floor' });
  // tail: simulate the floor bounces from the out-node (speed of the incoming flight), 20 % horizontal loss, then roll with friction
  (function () {
    const a = nodes[nodes.length - 2], b = nodes[nodes.length - 1], dt = b.t - a.t;
    let vh = Math.abs((b.h - a.h - 0.5 * G * dt * dt) / dt - G * 0 + 0); const vh0 = (b.h - a.h + 0.5 * G * dt * dt) / dt; vh = Math.abs(vh0 - G * dt);   // |incoming vertical speed|
    let vu = (b.u - a.u) / dt, tt = b.t, uu = b.u;
    while (true) {
      vh *= 0.80; vu *= 0.6; const fl = 2 * vh / G; if (vh * vh / (2 * G) < 0.35) break;
      tt += fl; uu += vu * fl; nodes.push({ t: tt, u: uu, h: R, kind: 'floor' });
    }
    nodes.push({ t: tt, u: uu, h: R, kind: 'roll', vu }); nodes[nodes.length - 1].stop = tt + Math.abs(vu) / 22;
  })();
  const RN = nodes[nodes.length - 1], T_STOP = RN.stop, U_STOP = RN.u + RN.vu * (T_STOP - RN.t) - 0.5 * 22 * Math.sign(RN.vu) * (T_STOP - RN.t) ** 2;
  // ball state at video time w -> {u,h,vu,vh,kind,ci (nearest contact index), dtc (signed time to nearest contact)}
  function ballAt(w) {
    if (w >= T_STOP) return { u: U_STOP, h: R, vu: 0, vh: 0, kind: 'rest', seg: nodes.length };
    let i = 0; while (i < nodes.length - 1 && w >= nodes[i + 1].t) i++;
    const a = nodes[i], b = nodes[i + 1];
    if (a.kind === 'roll') { const d = Math.min(w - a.t, Math.abs(a.vu) / 22), s = Math.sign(a.vu); return { u: a.u + a.vu * d - 0.5 * 22 * s * d * d, h: R, vu: a.vu - 22 * s * d, vh: 0, kind: 'roll', seg: i }; }
    const dt = b.t - a.t, x = (w - a.t), vh0 = (b.h - a.h + 0.5 * G * dt * dt) / dt, vu = (b.u - a.u) / dt;
    return { u: a.u + vu * x, h: a.h + vh0 * x - 0.5 * G * x * x, vu, vh: vh0 - G * x, kind: 'fly', seg: i };
  }
  // squash/stretch description: compress along the contact normal for ±0.03 s around floor/thump/tip/paw nodes, stretch along the velocity in flight
  function ballShape(w) {
    const b = ballAt(w); let sq = 0, ang = Math.PI / 2;                               // ang = compression axis (screen angle, rad); PI/2 = vertical
    for (let i = 1; i < nodes.length; i++) { const nd = nodes[i]; if (nd.kind === 'apex' || nd.kind === 'roll') continue;
      const d = (w - nd.t) / 0.034; if (Math.abs(d) < 1) { const pa = nodes[i - 1], dt = nd.t - pa.t, vin = Math.abs((nd.h - pa.h - 0.5 * G * dt * dt) / dt - G * dt) ; sq = Math.max(sq, clamp(vin / 520, 0.05, 0.34) * Math.cos(d * Math.PI / 2) ** 2); if (nd.kind === 'tip') ang = 0.8; } }
    const sp = Math.hypot(b.vu, b.vh), st = b.kind === 'fly' ? clamp(sp / 900, 0, 0.16) : 0;
    return { sq, ang, st, vang: Math.atan2(-b.vh, b.vu) };                            // vang = direction of travel on screen (y down)
  }
  const ROLL_FRIC = 22;
  const SQ_END = 0;
  // ------------------------------------------------------------------ the characters' choreography
  // Mochi: sit-hop from MOC_U0 to MOC_U1 (flight 0.22 s landing exactly on the thump), swat paw during the flight; then the paw reflex when the ball comes
  const HOP = { t0: TC - 0.22, t1: TC, crouch0: TC - 0.52, crouch1: TC - 0.28 };
  const mocU = (w) => w <= HOP.t0 ? MOC_U0 : w >= HOP.t1 ? MOC_U1 : lerp(MOC_U0, MOC_U1, sstep((w - HOP.t0) / 0.22) * 0.0 + (w - HOP.t0) / 0.22);
  const mocHop = (w) => { if (w <= HOP.t0 || w >= HOP.t1) return 0; const s = (w - HOP.t0) / 0.22; return 4 * 6.0 * s * (1 - s); };          // cm, apex 6 cm (g*T^2/8 = 5.9)
  // samurai: duck (crouch) then stand into the ball; startle hop when the ball reaches Mochi's paw
  const DUCK = [[0, 0], [TC + 0.02, 0], [TC + 0.10, 1], [TC + 0.22, 1], [T_TIP - 0.07, 0], [T_TIP, 0], [20, 0]];
  const STARTLE = [[0, 0], [T_PAW - 0.12, 0], [T_PAW - 0.02, 1], [T_PAW + 0.35, 0.6], [T_PAW + 0.8, 0], [20, 0]];
  const PAWK = [[0, 0], [T_SL - 0.05, 0], [T_PAW - 0.18, 1], [T_PAW + 0.15, 1], [T_PAW + 0.55, 0], [20, 0]];          // Mochi's near paw comes up (reflex) to meet the ball, then lowers
  const events = [];
  const add = (w, type, u = 0, a = 1, o = {}) => events.push(Object.assign({ w, type, u, a }, o));
  for (let i = 1; i < nodes.length; i++) { const nd = nodes[i], pa = nodes[i - 1]; if (nd.kind === 'apex' || nd.kind === 'roll') continue; const dt = nd.t - pa.t, vin = Math.abs((nd.h - pa.h - 0.5 * G * dt * dt) / dt - G * dt);
    if (nd.kind === 'floor') add(nd.t, 'bounce', nd.u, clamp(vin / 600, 0.1, 1));
    else if (nd.kind === 'thump') { add(nd.t, 'bounce', nd.u, clamp(vin / 600, 0.1, 1)); add(nd.t, 'thump', MOC_U1, 1.0); }
    else if (nd.kind === 'tip') add(nd.t, 'tip', nd.u, 1.0);
    else if (nd.kind === 'paw') add(nd.t, 'paw', nd.u, 1.0); }
  add(HOP.crouch0, 'rustle', MOC_U0, 0.3); add(HOP.t0, 'leap', MOC_U0, 0.8); add(HOP.t0 + 0.1, 'swat', 8, 0.7);
  add(TC + 0.04, 'gasp', SAM_U, 0.7); add(TC + 0.1, 'duck', SAM_U, 0.6); add(T_TIP - 0.06, 'rustle', SAM_U, 0.45);
  add(T_TIP + 0.04, 'slide', SAM_U + 3, 0.9, { dur: 0.2 });
  add(T_PAW - 0.12, 'gasp', MOC_U1, 0.8); add(T_PAW - 0.02, 'gasp', SAM_U, 0.8); add(T_PAW + 0.05, 'mew', MOC_U1, 0.7);
  add(RN.t, 'roll', RN.u, 0.8, { dur: Math.abs(RN.vu) / 22 });
  add(T_STOP + 0.25, 'sigh', SAM_U, 0.6); add(T_STOP + 0.55, 'bloop', SAM_U, 0.5); add(T_STOP + 1.0, 'blink', MOC_U1, 0.3); add(T_STOP + 1.6, 'mew', MOC_U1, 0.45);
  const evs = () => events.filter((e) => e.w < W_END).map((e) => Object.assign({}, e, { t: e.w, slow: 0 })).sort((a, b) => a.t - b.t);
  return { T, FPS, S, OX, Y0, DQ, P, clamp, sstep, lerp, hash, KS, wOf, tOf, W_END, WALL_Y, SQ, MQ, BQ, SAM_U, MOC_U0, MOC_U1, R, G, TIP, PAW, nodes, TC, UC, T_TIP, T_SL, T_PAW, T_OUT, T_STOP, U_STOP, ballAt, ballShape, HOP, mocU, mocHop, DUCK, STARTLE, PAWK, events: evs };
})();
if (typeof module !== 'undefined') module.exports = CUE;
