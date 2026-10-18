// anim.js — frame(t): pure function of t. Cubes = damped jelly responses, tube = gravity pendulum, drops/stream = ballistic (g = 981), Mochi/samurai re-posed every frame (no sprites).
const E1 = (o) => Object.assign({ open: 1 }, o);
const { POKES, DROP, HOPS, SIT_U } = CUE, sst = CUE.sstep, easeK = (x) => x * x * (3 - 2 * x), clampK = CUE.clamp;
const SAM = { u: CUE.SAM_U, q: CUE.SQ, S: 95 }, MOC = { u: SIT_U, q: CUE.MQ, s: 2.4 };
const px = (u, h, q) => C.P(u, h, q);
function hopAt(s) {
  let h = 0, sq = 1;
  for (const H of HOPS) { const t = s - H.t0, vy = 0.5 * CUE.G * H.T;
    if (t > -0.12 && t < 0) sq = Math.min(sq, 1 - 0.13 * sst((t + 0.12) / 0.12));
    else if (t >= 0 && t <= H.T) { h = vy * t - 0.5 * CUE.G * t * t; sq = Math.min(sq, 0.87 + 0.17 * sst(t / 0.08)); }
    else if (t > H.T && t < H.T + 0.16) sq = Math.min(sq, 1 - 0.14 * Math.sin(Math.PI * (t - H.T) / 0.16)); }
  return { h, sq };
}
function pokeW(s, by, rise = 0.2, fall = 0.2) { let w = 0, p0 = null; for (const p of POKES) if (p.by === by) { const d = s - p.s; const k = d < 0 ? sst(1 + d / rise) : 1 - sst(d / fall); if (k > w) { w = k; p0 = p; } } return { w, p: p0 }; }
function lookToward(from, to, ref = 160) { return [clampK((to[0] - from[0]) / ref, -1, 1), clampK((to[1] - from[1]) / ref, -1, 1)]; }
const cubeFacePx = (j, s, side) => { const g = cubeGeom(j, s), c = g.c; return pp(c.u + side * (g.hw + 0.15) + g.sh * 0.6, c.hb + (g.ht - c.hb) * 0.78, c.qf - 0.6); };
// ---------------------------------------------------------------- the samurai: stands at the left of the tray, pokes the left cube with a hand, startles at the clack
function samuraiBuild(s) {
  const { h, sq } = hopAt(s), breath = Math.sin(TAU * s / PER * 4) * 0.012;
  const st0 = Math.max(0, sst((s - CUE.SH.CLACK) / 0.04) * (1 - sst((s - CUE.SH.CLACK - 0.35) / 0.3)));
  const [bx, by] = px(SAM.u, h, SAM.q), S = SAM.S, sy = (1 + breath) * sq, sx = 1 + (1 - sq) * 0.4;
  const st = { x: bx, y: by - S * 1.58 * sy, S, face: 1, rot: -0.07 * st0 + 0.014 * Math.sin(TAU * s / PER * 2), sx, sy, sw: { mode: 'none' }, band: { a: 1, wind: 0.5 }, ground: by };
  const g = samGeom(st, s), rest = [g.X(1.2, 0.9), g.X(-1.2, 0.9)], shoulder = g.X(0.85, 0.5);
  let hand = rest[0], look = [0.5, 0.1];
  const { w, p } = pokeW(s, 'hand', 0.22, 0.2); 
  const cbx = cubeFacePx(0, s, -1);
  if (w > 0) { const tip = [cbx[0] - 0.12 * S, cbx[1]], dd = Math.hypot(tip[0] - shoulder[0], tip[1] - shoulder[1]), lim = Math.min(dd, 0.98 * S);
    const wind = Math.sin(Math.PI * clampK((p.s - 0.2 - s) / -0.2 * -1, 0, 1)) * 0;                                   // (no extra arc: approach is the lerp itself)
    const tp = [shoulder[0] + (tip[0] - shoulder[0]) / (dd || 1) * lim, shoulder[1] + (tip[1] - shoulder[1]) / (dd || 1) * lim - 0.1 * S * Math.sin(Math.PI * clampK(1 - Math.abs(s - p.s + 0.06) / 0.16))];
    hand = [rest[0][0] + (tp[0] - rest[0][0]) * w, rest[0][1] + (tp[1] - rest[0][1]) * w]; look = lookToward([st.x, st.y], cbx); look = [look[0] * 0.9 + 0.1, look[1]]; st.rot += 0.04 * w; }
  else { const e = CUE.wob(0, s); look = [0.5 + 0.3 * Math.sin(s * 3) * 0, 0.0]; if (s > CUE.SH.TIP - 0.1 && s < CUE.SH.CLACK + 0.5) look = [0.2, -0.6]; }
  const hl = [rest[1][0] + 0.02 * S * Math.sin(TAU * s / PER * 3), rest[1][1] + 0.03 * S * Math.sin(TAU * s / PER * 4 + 1)];
  st.handsAbs = [hand, hl];
  const ey = Object.assign({}, E1({ look }), st0 > 0.3 ? { wide: 0.9 } : {});
  return { st, ey, h, sq };
}
// ---------------------------------------------------------------- Mochi: sits at the right end; the FAR arm (behind the body) does the poking; continuous raise (no silhouette swap)
const P_SITM = clonePose(P_SIT); P_SITM.tl = [-12, 28, 3.05, 0.7, 0.8, 0];
function sneezeAt(s) {
  const a = DROP.sSneeze - 0.18, t = s - DROP.sSneeze; let hr = 0, hop = 0, open = 0, eye = 1;
  if (s > a && s < DROP.sSneeze) { const k = (s - a) / (DROP.sSneeze - a); hr = -0.3 * easeK(k); eye = 1 - 0.8 * k; open = 0.5 * k; }
  else if (s >= DROP.sSneeze) { hr = 0.34 * Math.exp(-t / 0.1) * Math.cos(TAU * t / 0.22); eye = t < 0.22 ? 0.0 : sst((t - 0.22) / 0.1); open = t < 0.14 ? 1 : Math.max(0, 1 - (t - 0.14) / 0.12); const T2 = 0.07; hop = t < T2 ? 0.5 * CUE.G * T2 / 2 * t - 0.5 * CUE.G * t * t : 0; hop = Math.max(0, hop); }
  return { hr, hop, open, eye };
}
const pulse = (s, t0, w = 0.05) => Math.exp(-(((s - t0) / w) ** 2));
const earFlick = (s) => 0.3 * (pulse(s, 0.4) + pulse(s, 2.2) + pulse(s, 3.65) + pulse(s, 4.65) + pulse(s, 6.0));
function mochiBuild(s) {
  const pose = clonePose(P_SITM), sn = sneezeAt(s), mm = { sq: 1 - 0.05 * Math.sin(Math.PI * clampK((s - 0.55) / 0.2)) * 0 };
  const [x0, y0] = px(MOC.u, sn.hop, MOC.q); let look = [-0.7, 0.2], raiseK = 0, raiseTip = null;
  const { w, p } = pokeW(s, 'paw', 0.22, 0.22);
  const g3 = cubeGeom(2, s), ctop = pp(g3.c.u + g3.hw * 0.55 + g3.sh, g3.ht + 0.35, g3.c.qf - 0.8);
  if (w > 0) { const ms = MOC.s, f = -1, lx = (ctop[0] - x0) / (f * ms), ly = (ctop[1] - y0) / ms, sh = [21, -31], dx = lx - sh[0], dy = ly - sh[1], d = Math.hypot(dx, dy) || 1, L = Math.min(d, 22);
    const lift = Math.sin(Math.PI * clampK(1 - Math.abs(s - p.s + 0.05) / 0.2)) * 0 + 7 * (1 - sst((s - (p.s - 0.1)) / 0.1)) * (s < p.s - 0.1 ? 1 : 0.0);      // paw above the cube before it comes down
    raiseK = w; raiseTip = [sh[0] + dx / d * L, sh[1] + dy / d * L - (w < 0.99 && s < p.s ? 6 * (1 - w) : 0)]; pose.h[2] += 0.1 * w; pose.b[4] += 0.04 * w;
    look = lookToward([x0, y0 - 190], ctop, 140); look = [-look[0] * 0.9 + 0.1, look[1]]; }
  else { const wv = CUE.wob(2, s).sh; look = [-0.75 + 0.18 * wv, 0.2 + 0.4 * Math.abs(wv) * 0]; }
  // the leap drop: she follows it, crosses her eyes when it sticks to her nose
  let cross = 0; if (s > DROP.s0 - 0.1 && s < DROP.sSneeze + 0.05) { const dp = px(...DROP.pos(s)), k = sst((s - DROP.s0 + 0.1) / 0.25); const lk = lookToward([x0, y0 - 190], dp, 140); look = [look[0] + (-lk[0] * 0.9 + 0.1 - look[0]) * k, look[1] + (lk[1] - look[1]) * k]; cross = sst((s - DROP.sHit) / 0.05) * (s < DROP.sSneeze ? 1 : 0); }
  pose.h[2] += sn.hr;
  const e = { sleep: 1 - sn.eye > 0 ? Math.min(1, 1 - sn.eye) : 0, open: 1, wide: s > DROP.s0 - 0.1 && s < DROP.sSneeze ? 0.5 : 0, look, dil: 0.5, sparkle: 1 };
  return { mouth: { open: sn.open }, face: -1, kind: 'kit', col: ORG.k1, sd: 3, rot: 0, pro: 'sit', raise: raiseK, raiseTip, x: x0, y: y0, s: MOC.s, pose, sy: 1, e, tailWig: 0.32, tailPh: TAU * s / PER * 4, breath: 0.022 * Math.sin(TAU * s / PER * 3), earTw: earFlick(s), blush: 0.55, _hop: sn.hop };
}
// ---------------------------------------------------------------- shadows
function perfShadows(ctx, s) { const sm = hopAt(s); softShadow(ctx, SAM.u, SAM.q + 0.4, 9.5 * (1 - sm.h / 40), 3.2 * (1 - sm.h / 40), 0.3 * (1 - sm.h / 14)); softShadow(ctx, MOC.u + 1, MOC.q + 0.4, 10.5, 3.2, 0.3); }
function backLayer(ctx, s) { floorLayer(ctx); drawBack(ctx, s); perfShadows(ctx, s); }
// ---------------------------------------------------------------- front: the leap drop, nose drop, sneeze spray
function frontLayer(ctx, s) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  if (s >= DROP.s0 && s < DROP.sHit) { const p = px(...DROP.pos(s)); dropBlob(ctx, p[0], p[1], 0.75 * SC); }
  if (s >= DROP.s0 - 0.0 && s < DROP.s0 + 0.2) for (let n = 0; n < 5; n++) { const t = s - DROP.s0, vu = (CUE.hash(n, 5) - 0.3) * 26, vh = 24 + 18 * CUE.hash(n, 6), hh = DROP.p0[1] + vh * t - 0.5 * 981 * t * t; if (hh > DROP.p0[1]) dropBlob(ctx, ...px(DROP.p0[0] + vu * t, hh, DROP.p0[2]), 0.28 * SC, 1 - t / 0.22); }
  if (s >= DROP.sHit && s < DROP.sSneeze + 0.03) { const [nx, ny] = px(...DROP.nose), k = sst((s - DROP.sHit) / 0.04); dropBlob(ctx, nx, ny, (0.85 - 0.1 * sst((s - DROP.sHit) / 0.17)) * SC * k); }
  const t = s - DROP.sSneeze; if (t > 0 && t < 0.5) for (let i = 0; i < 10; i++) { const a = 2.7 + 0.5 * CUE.hash(i, 31), v = 55 + 70 * CUE.hash(i, 32), u = DROP.nose[0] - 0.8 - v * Math.abs(Math.cos(a)) * t * 0.75, h = DROP.nose[1] - 0.2 + v * Math.sin(a) * t * 0.35 * 0 + 8 * (CUE.hash(i, 33) - 0.4) * t * 3 - 0.5 * 981 * t * t * 0.55, al = 1 - t / 0.5;
    if (h > 0.2) dropBlob(ctx, ...px(u, h, DROP.nose[2]), (0.22 + 0.2 * CUE.hash(i, 34)) * SC, al); }
}
let _neutral = false;
var frame = function (t) {
  const s = C.sOf(t);
  if (!_neutral) { GRAIN.getContext('2d').fillStyle = '#fff'; GRAIN.getContext('2d').fillRect(0, 0, W, H); for (const cv of [FIB, VIG]) cv.getContext('2d').clearRect(0, 0, W, H); _neutral = true; }
  const p = PAPER.getContext('2d'); p.setTransform(1, 0, 0, 1, 0, 0); p.globalCompositeOperation = 'source-over'; p.globalAlpha = 1;
  backLayer(p, s);
  const cat = mochiBuild(s), sm = samuraiBuild(s);
  CAMNOW = [540, 960, 1];
  composeFrame(CAMNOW, { noHalo: true,
    chars: (c) => { drawCat(c, cat, s); samLegs(c, sm.st, s); samInk(c, sm.st, s, 0.5); samArms(c, sm.st, s, sm.st.handsAbs); },
    over: (c) => { samOver(c, sm.st, s); samEyes(c, sm.st, s, sm.ey, sm.ey); } });
  frontLayer(mctx, s);
};
