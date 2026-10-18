// anim.js — frame(t): pure function of t. MODE 'full' = room + real samurai + real Mochi + the paper bird (no light/shadow: light.py adds them),
// 'bird' = the bird alone in black on white (mask for its cast shadow + paper shading), 'real' = the real characters alone (mask so the bird's shadow never darkens them).
const { SQ, MQ, KS: KSp } = CUE, sst = CUE.sstep, clampK = CUE.clamp, lerpK = CUE.lerp;
const SAMS = 95, MOCS = 2.4, px = (u, h, q) => C.P(u, h, q);
const ramp = (w, a, b) => sst((w - a) / (b - a));
const pulse = (w, w0, d = 0.06) => Math.exp(-(((w - w0) / d) ** 2));
const lookTo = (face, from, to, ref = 150) => [clampK(face * (to[0] - from[0]) / ref, -1, 1), clampK((to[1] - from[1]) / ref, -1, 1)];
const lerp2 = (a, b, k) => [lerpK(a[0], b[0], k), lerpK(a[1], b[1], k)];
let MODE = 'full';
const BLINK = [0.9, 2.9, 5.9, 8.9], BLINKC = [1.7, 3.9, 6.3, 9.2];
const blinkK = (w, L) => Math.max(0, ...L.map((t) => pulse(w, t, 0.045)));
const camNow = (w) => CUE.camAt(w);
const toScr = (p, w) => { const c = camNow(w); return [540 + (p[0] - c[0]) * c[2], 960 + (p[1] - c[1]) * c[2]]; };
// ================================================================= tiny 3D helpers: basis (U right, V down, Q toward the camera); screen = [U, V + 0.6 Q]
const v3 = { add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]] };
const rod = (v, k, th) => { const c = Math.cos(th), s = Math.sin(th), kv = v3.cross(k, v), kd = v3.dot(k, v); return [v[0] * c + kv[0] * s + k[0] * kd * (1 - c), v[1] * c + kv[1] * s + k[1] * kd * (1 - c), v[2] * c + kv[2] * s + k[2] * kd * (1 - c)]; };
const mmul = (A, B) => A.map((r) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
const mvec = (M, v) => [v3.dot(M[0], v), v3.dot(M[1], v), v3.dot(M[2], v)];
const Rv = (a) => { const c = Math.cos(a), s = Math.sin(a); return [[c, 0, -s], [0, 1, 0], [s, 0, c]]; };               // about V (vertical): head (1,0,0) -> (cos, 0, sin)
const Rq = (a) => { const c = Math.cos(a), s = Math.sin(a); return [[c, -s, 0], [s, c, 0], [0, 0, 1]]; };               // about Q (screen plane)
const RxL = (a) => { const c = Math.cos(a), s = Math.sin(a); return [[1, 0, 0], [0, c, -s], [0, s, c]]; };
const RyL = (a) => { const c = Math.cos(a), s = Math.sin(a); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; };
const R_FLAT = [[0, -1, 0], [0, 0, -1], [1, 0, 0]];                                                                       // local (x wings, y body, z normal) -> flat in the air: head (-y) -> +U, normal z -> up (-V), x -> Q
const flatAA = (() => { const M = R_FLAT, th = Math.acos((M[0][0] + M[1][1] + M[2][2] - 1) / 2); let k = [M[2][1] - M[1][2], M[0][2] - M[2][0], M[1][0] - M[0][1]]; const n = Math.hypot(...k); k = k.map((x) => x / n); return { k, th }; })();
const Rori = (kap) => { const { k, th } = flatAA, c = Math.cos(th * kap), s = Math.sin(th * kap), K = [[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]];
  return [0, 1, 2].map((i) => [0, 1, 2].map((j) => (i === j ? c : 0) + s * K[i][j] + (1 - c) * k[i] * k[j])); };
const CVEC = (() => { const n = Math.hypot(0.6, 1); return [0, -0.6 / n, 1 / n]; })(), LDIR = (() => { const v = [-0.45, -0.65, 0.6], n = Math.hypot(...v); return v.map((x) => x / n); })();
// ================================================================= THE SHEET: polygons [{pts:[[x,y,z]], cn:[nx,ny,nz]}] ; cn = normal of the COLOURED face. D = 1 = half diagonal of the diamond (y down).
const SH_D = 0.8;                                                                                        // half diagonal in samurai units S
function clipPoly(pts, p0, n, keep) {                                                                     // keep the part with sign*(p-p0).n >= 0 (convex polygon, 2D)
  const d = (p) => ((p[0] - p0[0]) * n[0] + (p[1] - p0[1]) * n[1]) * keep, out = [];
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], da = d(a), db = d(b);
    if (da >= -1e-9) out.push(a);
    if ((da > 1e-9 && db < -1e-9) || (da < -1e-9 && db > 1e-9)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 0]); } }
  return out.length >= 3 ? out : null;
}
function applyFold(polys, f, th) {                                                                         // polys 2D (z=0), fold about the crease; the moving half rotates by th toward the viewer
  const stay = [], move = [], k = [f.n[1], -f.n[0], 0], p0 = [f.p0[0], f.p0[1], 0];
  for (const P of polys) {
    const s = clipPoly(P.pts, f.p0, f.n, -1), m = clipPoly(P.pts, f.p0, f.n, 1);
    if (s) stay.push({ pts: s, cn: P.cn });
    if (m) move.push({ pts: m.map((p) => v3.add(p0, rod(v3.sub([p[0], p[1], 0], p0), k, th))), cn: rod(P.cn, k, th) });
  }
  return stay.concat(move.reverse());                                                                    // the folded stack reverses its order
}
function sheetAt(w) {
  let polys = [{ pts: [[0, -1, 0], [1, 0, 0], [0, 1, 0], [-1, 0, 0]], cn: [0, 0, 1] }];
  for (const f of CUE.FOLDS) { if (w >= f.t1) polys = applyFold(polys.map((P) => ({ pts: P.pts.map((p) => [p[0], p[1], 0]), cn: P.cn.map((x, i) => (i === 2 ? Math.round(x) : x)) })), f, Math.PI); else if (w > f.t0) { polys = applyFold(polys, f, Math.PI * sst((w - f.t0) / (f.t1 - f.t0))); break; } else break; }
  return polys;
}
let BIRD = null;
function birdModel() {                                                                                     // the finished kite split along the body axis into a left and a right wing group
  if (BIRD) return BIRD;
  const polys = sheetAt(99), L = [], R = [];
  for (const P of polys) { const pl = clipPoly(P.pts, [0, 0], [-1, 0], 1), pr = clipPoly(P.pts, [0, 0], [1, 0], 1); if (pl) L.push({ pts: pl.map((p) => [p[0], p[1], 0]), cn: P.cn }); if (pr) R.push({ pts: pr.map((p) => [p[0], p[1], 0]), cn: P.cn }); }
  return (BIRD = { L, R });
}
const PIV = [0, -0.45, 0];                                                                                 // the bird's visual centre (so anchors sit at the body, not at the sheet corner)
function wingRot(p, a, sg) {                                                                               // rotate about the body axis (local y): the wing tip goes up (+z) for a > 0
  const x = p[0] * Math.cos(a) + sg * 0 , s = Math.sin(a);
  return sg < 0 ? [p[0] * Math.cos(a) + p[2] * s, p[1], -p[0] * s + p[2] * Math.cos(a)] : [p[0] * Math.cos(a) - p[2] * s, p[1], p[0] * s + p[2] * Math.cos(a)];
}
// ================================================================= SAMURAI
function samBase(w) {
  const S = SAMS, u = CUE.SAM_U, lf = KSp(CUE.LAUGH, w), inh = ramp(w, 4.2, 4.42) * (1 - ramp(w, 4.46, 4.52)), blw = pulse(w, 4.5, 0.06);
  let sy = 1 + 0.012 * Math.sin(w * 3.2) - 0.05 * inh + 0.02 * blw, rot = 0.012 * Math.sin(w * 1.3);
  rot += 0.035 * Math.sin(TAU * 7.5 * w) * lf; sy += 0.03 * Math.abs(Math.sin(TAU * 3.75 * w)) * lf - 0.015 * lf;
  rot += 0.06 * inh - 0.03 * blw;
  const by = px(u, 0, SQ)[1], st = { x: px(u, 0, SQ)[0], y: by - S * 1.58 * sy, S, face: 1, rot, sx: 1 + 0.03 * inh, sy, sw: { mode: 'none' }, band: { a: 1, wind: 0.5 + 0.25 * Math.sin(w * 2.3) + 1.4 * blw + 0.8 * lf }, ground: by };
  return st;
}
const palmX = (g) => g.X(1.30, 0.66);
function samHands(w, g, S) {
  const idleF = g.X(1.36, 0.88), idleB = g.X(-1.36, 0.88), bw = KSp([[0, 1], [3.45, 1], [3.95, 0], [10, 0]], w), pw = KSp([[0, 0], [3.4, 0], [4.0, 1], [4.55, 1], [4.75, 0], [9.0, 0], [9.4, 1], [10, 1]], w);
  // belly: both hands on the sheet's upper edges at x=+-0.3 S (inside the +-0.3 rule); small working moves per fold
  const fl = (a, b) => pulse(w, (a + b) / 2, (b - a) / 2.2);
  let bx = 0.3, by = 0.8, bxB = 0.3, byB = 0.8;
  by -= 0.05 * fl(0.55, 1.15); byB -= 0.05 * fl(0.55, 1.15);                                               // lift with the first fold
  bxB -= 0.04 * fl(1.40, 1.95); byB += 0.04 * fl(1.40, 1.95);                                              // back hand presses the left corner
  bx -= 0.04 * fl(2.00, 2.55); by += 0.04 * fl(2.00, 2.55);                                                // front hand presses the right corner
  bx -= 0.04 * fl(2.75, 3.20); bxB -= 0.04 * fl(2.75, 3.20); by += 0.04 * fl(2.75, 3.20); byB += 0.04 * fl(2.75, 3.20);   // both press the head
  bx -= 0.05 * fl(3.25, 3.65); bxB -= 0.05 * fl(3.25, 3.65);                                               // pinch the wings up
  let F = lerp2(idleF, g.X(bx, by), bw), B = lerp2(idleB, g.X(-bxB, byB), bw);
  const pm = palmX(g); F = lerp2(F, [pm[0], pm[1] + 10], pw);
  return [F, B];
}
function samState(w) {
  const st = samBase(w), g = samGeom(st, w), S = SAMS, hands = samHands(w, g, S), sh1 = g.X(0.85, 0.5), sh2 = g.X(-0.85, 0.5);
  window._rawHands = [hands[0].slice(), hands[1].slice()]; window._shoulders = [sh1, sh2];
  { const lim = 0.72 * S, cl = (hd, sh) => { const dx = hd[0] - sh[0], dy = hd[1] - sh[1], d = Math.hypot(dx, dy); return d > lim ? [sh[0] + dx * lim / d, sh[1] + dy * lim / d] : hd; }; hands[0] = cl(hands[0], sh1); hands[1] = cl(hands[1], sh2); }
  // eyes: on the paper while folding, on the bird while it flies, closed when blowing, squeezed while laughing
  const eye = g.X(0.15, 0.26), f = 1, lf = KSp(CUE.LAUGH, w);
  const paperP = g.X(0, 1.1), bp = birdPose(w, true).A, lp = lookTo(f, eye, paperP, 150), lb = lookTo(f, eye, bp, 150);
  const watch = KSp([[0, 0], [3.5, 0], [3.9, 0.5], [4.2, 0.4], [4.6, 1], [7.4, 1], [7.7, 0.3], [8.4, 0.3], [8.7, 1], [10, 1]], w);
  let look = lerp2([lp[0], Math.max(lp[1], 0.3)], lb, watch), wide = 0.2 + 0.7 * pulse(w, 7.1, 0.25) + 0.3 * pulse(w, 9.7, 0.3), closed = blinkK(w, BLINK), squeeze = closed;
  const blow = ramp(w, 4.38, 4.43) * (1 - ramp(w, 4.58, 4.66)); if (blow > closed) { closed = blow; squeeze = blow; look = [0.6, 0]; }
  if (lf > 0.5) { closed = Math.max(closed, lf * 0.9); squeeze = Math.max(squeeze, lf); }
  st.sweat = 0; return { st, hands, ey: { open: 1, look, wide, closed, squeeze }, g };
}
// ================================================================= MOCHI (sits facing left; pro:'sit' all the time, hops are the whole body)
const tailMemo = {};
function catBase(w, light) {
  const u = CUE.MOC_U, ms = MOCS, L = CUE.LEAP, face = CUE.FACE(w);
  let [x0, y0] = px(u, 0, MQ), pose = clonePose(P_SIT); pose.tl = [-12, 28, 3.05, 0.7, 0.8, 0];
  const e = { open: 1, look: [0.6, 0], dil: 0.6, sparkle: 1, wide: 0.5 }, mouth = { open: 0 };
  let sy = 1, sx = 1, hTilt = 0, tailWig = 0.35, blush = 0.45, raise = 0, raiseTip = null;
  const earTw = 0.3 * (pulse(w, 1.2, 0.1) + pulse(w, 2.6, 0.1) + 2 * pulse(w, 4.85, 0.1) + 2 * pulse(w, 7.2, 0.1) + pulse(w, 9.5, 0.1));
  // the leap (crouch -> push -> apex -> landing squash); the paw is reaching for the bird and misses
  const k = (w - L.w0) / L.T; let hop = 0;
  if (w >= L.w0 - 0.16 && w < L.w0) { const c = sst((w - (L.w0 - 0.16)) / 0.14); sy = 1 - 0.14 * c; sx = 1 + 0.05 * c; }
  else if (w >= L.w0 && w < L.w0 + L.T) { hop = L.h * 4 * k * (1 - k); sy = 1 + 0.07 * Math.sin(Math.PI * k) * (k < 0.5 ? 1 : 0.4); sx = 1 - 0.03 * Math.sin(Math.PI * k); }
  else if (w >= L.w0 + L.T && w < L.w0 + L.T + 0.16) { const c = (w - L.w0 - L.T) / 0.16; sy = 1 - 0.13 * Math.sin(Math.PI * c) * (1 - 0.3 * c); sx = 1 + 0.05 * Math.sin(Math.PI * c); }
  // the two hop-turns after her tail: a small hop, the width dips to 0.7 at the flip instant
  for (const fw of CUE.FLIPS) { const a = (w - fw) / 0.13; if (Math.abs(a) < 1) { hop += 1.6 * (1 - a * a); sx *= 1 - 0.3 * (1 - a * a); sy *= 1 + 0.05 * (1 - a * a); } }
  y0 -= hop * CUE.S;
  if (!light) {
    const sp = samBase(w), sg = samGeom(sp, w), paper = sg.X(0, 1.1), bp = birdPose(w, true).A, eye0 = [x0, y0 - 190];
    const watchPaper = 1 - ramp(w, 3.7, 4.5), lu = KSp(CUE.LOOKUP, w), lp = lookTo(face, eye0, paper, 140), lb = lookTo(face, eye0, bp, 140);
    let look = lerp2(lp, lb, 1 - watchPaper); e.look = lerp2(lp, lb, ramp(w, 4.4, 4.7)); if (w > 7.0 && w < 8.9) { const tl = tailPtMemo(w); const lt = lookTo(face, eye0, tl, 140); e.look = lerp2(e.look, lt, ramp(w, 7.05, 7.25) * (1 - ramp(w, 8.7, 8.9))); }
    e.wide = 0.5 + 0.4 * pulse(w, 7.1, 0.3) + 0.4 * ramp(w, 4.8, 5.0) * (1 - ramp(w, 5.6, 5.8)); e.dil = 0.7;
    if (blinkK(w, BLINKC) > 0.5) e.sleep = 1;
    tailWig = 0.35 + 0.5 * ramp(w, 3.0, 3.6) + 1.2 * ramp(w, 8.3, 8.4) * (1 - ramp(w, 8.66, 8.8));
    hTilt += 0.12 * pulse(w, 3.0, 0.5) - 0.22 * ramp(w, 7.05, 7.3) * (1 - ramp(w, 7.5, 7.6)) + 0.1 * ramp(w, 9.6, 9.8);
    if (w > L.w0 + 0.04 && w < L.w0 + L.T + 0.26) {                                                         // reach: the near front leg is the swatting arm (raise float + raiseTip, tofu-shop lesson)
      raise = sst((w - (L.w0 + 0.04)) / 0.08) * (1 - sst((w - (L.w0 + L.T - 0.02)) / 0.14));
      const tgt = flightPx(Math.min(w, L.w0 + L.T - 0.02) + 0.0), lx = (tgt[0] - x0) / (face * ms), ly = (tgt[1] - y0) / ms, shd = [21, -31], dx = lx - shd[0], dy = ly - shd[1], d = Math.hypot(dx, dy) || 1, Ln = Math.min(d, 21);
      raiseTip = [shd[0] + dx / d * Ln, shd[1] + dy / d * Ln]; pose.h[2] += 0.06 * raise; mouth.open = 0.3 * raise; }
    if (w >= 7.0 && w < 7.15) mouth.open = 0.5 * pulse(w, 7.1, 0.05);
    blush = 0.45 + 0.4 * ramp(w, 9.4, 9.8);
  }
  pose.h[2] += hTilt;
  return { mouth, face, kind: 'kit', col: ORG.k1, sd: 3, rot: 0, x: x0, y: y0, s: ms, pose, sy, sx, e, tailWig, tailPh: TAU * w * 1.2, breath: 0.022 * Math.sin(w * 3.0), earTw, blush, hTilt: 0, pro: 'sit', raise, raiseTip, _mode: 'sit' };
}
const TAIL_K = 8;
function tailPt(w) { const cat = catBase(w, true), g = catGeom(cat, w), P = g.tail.P, k = Math.min(TAIL_K, P.length - 1); return [P[k][0], P[k][1]]; }
function tailPtMemo(w) { const k = Math.round(w * 600); return tailMemo[k] || (tailMemo[k] = tailPt(w)); }
// ================================================================= THE BIRD: position/orientation (screen px of the pivot, 3x3 matrix, depth q)
const BS = SH_D * SAMS;                                                                                     // px per sheet unit
const anchorOffset = [0, -0.26 * BS];
const palmA = (w) => { const g = samGeom(samBase(w), w), p = palmX(g); return [p[0], p[1] - 12]; };
const bellyA = (w) => { const g = samGeom(samBase(w), w); return g.X(0, 0.76); };
const tailA = (w) => { const p = tailPtMemo(w); return [p[0] + anchorOffset[0], p[1] + anchorOffset[1]]; };
let FLYX = null, FLYY = null, GLX = null, GLY = null;
function pathKeys() {
  if (FLYX) return;
  const mk = (keys, a0, a1) => { const xs = [], ys = []; keys.forEach((k, i) => { const p = i === 0 ? a0 : i === keys.length - 1 ? a1 : px(k[1], k[2], k[3]); xs.push([k[0], p[0]]); ys.push([k[0], p[1]]); }); return [xs, ys]; };
  [FLYX, FLYY] = mk(CUE.FLY, palmA(CUE.FLY[0][0]), tailA(CUE.FLY[CUE.FLY.length - 1][0]));
  [GLX, GLY] = mk(CUE.GLIDE, tailA(CUE.GLIDE[0][0]), palmA(CUE.GLIDE[CUE.GLIDE.length - 1][0]));
}
function flightPx(w) { pathKeys(); const f = CUE.FLAP, wob = 2.5 * Math.sin(w * 17) * KSp(CUE.FLAP, w); return [KSp(FLYX, w), KSp(FLYY, w) + wob]; }
const hopPath = (a, b, t0, t1, w, amp) => { const k = clampK((w - t0) / (t1 - t0)), p = [lerpK(a[0], b[0], sst(k)), lerpK(a[1], b[1], sst(k))]; return [p[0], p[1] - amp * Math.sin(Math.PI * k)]; };
function birdA(w) {                                                                                          // [A, qCm]
  pathKeys();
  if (w < 4.45) { const h = KSp(CUE.HOLD, w), a = bellyA(w), p = palmA(w); return [lerp2(a, p, h), SQ + 0.6]; }
  if (w < 7.0) { const qk = KSp([[4.45, SQ + 0.8], [4.75, 14], [5.1, 13], [5.4, 12], [5.7, 10], [6.0, 8], [6.25, 7], [6.5, 8], [6.75, 9], [7.0, MQ - 0.6]], w); return [flightPx(w), qk]; }
  if (w < 7.5) return [tailA(w), MQ - 0.6];
  if (w < 7.76) return [hopPath(tailA(7.5), tailA(7.76), 7.5, 7.76, w, 14), MQ - 0.6];
  if (w < 8.05) return [tailA(w), MQ - 0.6];
  if (w < 8.3) return [hopPath(tailA(8.05), tailA(8.3), 8.05, 8.3, w, 14), MQ - 0.6];
  if (w < 8.65) return [tailA(w), MQ - 0.6];
  if (w < 9.7) { const qk = KSp([[8.65, MQ - 0.6], [8.85, 11], [9.05, 10], [9.3, 9], [9.5, 11], [9.7, SQ + 0.8]], w); return [[KSp(GLX, w), KSp(GLY, w) + 2.5 * Math.sin(w * 17) * KSp(CUE.FLAP, w)], qk]; }
  return [palmA(w), SQ + 0.8];
}
function birdPose(w, lite) {
  const [A, q] = birdA(w), flap = KSp(CUE.FLAP, w); if (lite) return { A, q };
  const a2 = birdA(w + 0.02)[0], a1 = birdA(w - 0.02)[0], vx = (a2[0] - a1[0]) / 0.04, vy = (a2[1] - a1[1]) / 0.04;
  let R;
  if (w < 4.45) { const kap = KSp(CUE.ORI, w), hold = KSp(CUE.HOLD, w); R = mmul(Rq(samBase(w).rot * (1 - hold)), Rori(kap)); }
  else {
    const yaw = KSp(CUE.YAW, w), dy = (KSp(CUE.YAW, w + 0.03) - KSp(CUE.YAW, w - 0.03)) / 0.06;
    const fly = (w >= 4.45 && w < 7.0) || (w >= 8.65 && w < 9.7), ft = fly ? (ramp(w, 4.45, 4.7) * (1 - ramp(w, 6.75, 7.0)) + ramp(w, 8.65, 8.9) * (1 - ramp(w, 9.4, 9.7))) : 0;
    const pitch = clampK(Math.atan2(-vy, Math.abs(vx) + 60) * 0.8, -0.6, 0.6) * ft, roll = clampK(dy * 0.12, -0.5, 0.5) * ft;
    R = mmul(mmul(mmul(Rv(yaw), R_FLAT), RxL(-pitch)), RyL(roll));
  }
  return { A, q, R, flap };
}
// ---- draw the bird (full colour or black mask)
const COLC = [226, 84, 63], COLW = [248, 242, 228];
function drawBird(c, w, mask) {
  const P = birdPose(w); if (!P.R) return; const s = BS * (w >= 4.45 ? 1.45 : 1), R = P.R, prog = KSp(CUE.WING, w);
  const fl = P.flap, ang = 0.5 * prog + fl * 0.55 * Math.sin(TAU * 3.4 * w) + 0.0;
  const polys = [];
  const push = (list, tf, grp) => { for (const pl of list) { const pts = pl.pts.map((p) => tf(p)), cn = tf(pl.cn, true); polys.push({ pts, cn, grp }); } };
  const toW = (p, isN) => { const v = isN ? p : v3.sub(p, PIV); return mvec(R, v); };
  const stage4 = w >= CUE.FOLDS[3].t1;
  if (!stage4) push(sheetAt(w), (p, n) => toW(p, n), 0);
  else { const B = birdModel(); push(B.L, (p, n) => toW(n ? wingRot(p, ang, -1) : wingRot(p, ang, -1), n), 1); push(B.R, (p, n) => toW(wingRot(p, ang, 1), n), 2); }
  // wings: sort the two groups far -> near; the sheet keeps its list order (stack)
  let order = polys.map((pl, i) => i);
  if (stage4) { const dep = (g) => { let sum = 0, n = 0; for (const pl of polys) if (pl.grp === g) for (const p of pl.pts) { sum += v3.dot(p, CVEC); n++; } return sum / n; }; const d1 = dep(1), d2 = dep(2); const far = d1 < d2 ? 1 : 2; order = order.filter((i) => polys[i].grp === far).concat(order.filter((i) => polys[i].grp !== far)); }
  c.save(); c.lineJoin = 'round';
  for (const i of order) {
    const pl = polys[i]; c.beginPath(); pl.pts.forEach((p, j) => { const X = P.A[0] + p[0] * s, Y = P.A[1] + (p[1] + 0.6 * p[2]) * s; j ? c.lineTo(X, Y) : c.moveTo(X, Y); }); c.closePath();
    if (mask) { c.fillStyle = '#000'; c.fill(); continue; }
    const nz = v3.dot(pl.cn, CVEC) > 0, nv = nz ? pl.cn : v3.mul(pl.cn, -1), lam = Math.max(0, v3.dot(nv, LDIR)), base = nz ? COLC : COLW, k = 0.74 + 0.32 * lam;
    c.fillStyle = `rgb(${Math.min(255, base[0] * k) | 0},${Math.min(255, base[1] * k) | 0},${Math.min(255, base[2] * k) | 0})`; c.fill();
    c.strokeStyle = nz ? 'rgba(92,34,26,0.7)' : 'rgba(120,108,92,0.75)'; c.lineWidth = 1.6; c.stroke();
  }
  c.restore();
}
// ================================================================= frame
function softFloor(c, w) { softShadow(c, CUE.SAM_U, SQ + 0.4, 9, 3.0, 0.3); const m = catBase(w, true); softShadow(c, CUE.MOC_U, MQ + 0.4, 10.5, 3.2, 0.3 * (1 - clampK(((m.y - px(0, 0, MQ)[1]) / -80), 0, 0.6))); }
var frame = function (t) {
  const w = t;
  if (!window._neutral) { GRAIN.getContext('2d').fillStyle = '#fff'; GRAIN.getContext('2d').fillRect(0, 0, W, H); for (const cv of [FIB, VIG]) cv.getContext('2d').clearRect(0, 0, W, H); window._neutral = true; }
  const p = PAPER.getContext('2d'); p.setTransform(1, 0, 0, 1, 0, 0); p.globalCompositeOperation = 'source-over'; p.globalAlpha = 1; p.fillStyle = MODE === 'full' ? '#f1e9d8' : '#ffffff'; p.fillRect(0, 0, W, H);
  CAMNOW = camNow(w);
  if (MODE === 'bird') { composeFrame(CAMNOW, { noHalo: true, pre: () => {}, chars: () => {}, over: (c) => drawBird(c, w, true) }); return; }
  const sf = samState(w), cat = catBase(w), heldBelly = w < 3.9;
  composeFrame(CAMNOW, { noHalo: true,
    pre: (c) => { if (MODE === 'full') { drawWall(c); drawFloor(c); softFloor(c, w); } },
    chars: (c) => { samLegs(c, sf.st, w); samInk(c, sf.st, w, 0.5); if (heldBelly && MODE === 'full') drawBird(c, w, false); samArms(c, sf.st, w, sf.hands); drawCat(c, cat, w); },
    over: (c) => { samOver(c, sf.st, w); if (MODE === 'full') { samEyes(c, sf.st, w, sf.ey, sf.ey); if (!heldBelly) drawBird(c, w, false); } } });
};
window.grabLayer = (t, mode) => { MODE = mode; frame(t); return document.getElementById('c').toDataURL('image/png'); };
// ================================================================= info(t): numbers light.py needs (screen px)
function infoObj(t) {
  const w = t, c = camNow(w), z = c[2], bp = birdPose(w, true), A = toScr(bp.A, w), unit = CUE.S * z, gy = toScr([0, CUE.Y0 + bp.q * CUE.DQ * CUE.S], w)[1];
  return { t, zoom: z, unit, wallY: toScr([0, WALL_Y], w)[1], bird: { x: A[0], y: A[1], groundY: gy, hpx: gy - A[1], q: bp.q, size: BS * z }, cam: c };
}
window.info = (t) => JSON.stringify(infoObj(t));
