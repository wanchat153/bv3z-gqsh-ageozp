// anim.js — frame(t): pure function of t. Egg = ballistic arcs (g = 981) between hands / head / table; bodies re-posed every frame.
const { PLAT, TAB, POT, STOOL, SQ, MQ, EQ, G: GR, KS: KSp } = CUE, sst = CUE.sstep, clampK = CUE.clamp, lerpK = CUE.lerp;
const SAMS = 95, MOCS = 2.4, px = (u, h, q) => C.P(u, h, q);
const toWu = (p) => (p[0] - CUE.OX) / SC;
const ramp = (w, a, b) => sst((w - a) / (b - a));
const pulse = (w, w0, d = 0.06) => Math.exp(-(((w - w0) / d) ** 2));
const damp = (w, w0, A, tau, per) => w < w0 ? 0 : A * Math.exp(-(w - w0) / tau) * Math.sin(TAU * (w - w0) / per);
const lookTo = (face, from, to, ref = 150) => [clampK(face * (to[0] - from[0]) / ref, -1, 1), clampK((to[1] - from[1]) / ref, -1, 1)];
function turnOf(w, FL, init) { let face = init, sx = 1; for (const [fw, f] of FL) { if (w >= fw) face = f; const d = Math.abs(w - fw); if (d < 0.07) sx = Math.min(sx, Math.max(0.12, d / 0.07)); } return { face, sx }; }
// ================================================================= SAMURAI (body only; hands come later because they follow the egg)
const SFL = [[17.5, -1], [18.58, 1], [19.25, -1], [21.3, 1]];
function samBase(w) {
  const u = CUE.samU(w), { face, sx: tsx } = turnOf(w, SFL, 1);
  let h = 0, sy = 1, rot = 0, cc = null;
  if (w < 3.38) h = PLAT.h; else if (w < 3.72) h = KSp([[3.38, 4], [3.50, 5.2], [3.72, 0]], w);
  if (w > 3.26 && w < 3.38) sy = 1 - 0.10 * sst((w - 3.26) / 0.12);
  if (w >= 3.72 && w < 3.96) sy = 1 - 0.15 * Math.sin(Math.PI * (w - 3.72) / 0.24);
  if (w > 12.4 && w < 12.9) sy = 1 + 0.05 * Math.sin(Math.PI * (w - 12.4) / 0.5);
  let lean = 0;
  if (w > 3.7 && w < 4.9) lean = 0.05 * Math.sin((w - 3.7) * 9);                     // staggering under the juggled egg
  if (w > 7.86 && w < 8.5) lean = -0.1 * Math.sin(Math.PI * ramp(w, 7.86, 8.5)) ;     // recoils when the paw hits
  if (w > 18.5 && w < 19.3) lean = -0.03;
  if (w >= 23.85 && w < 25.7) {                                                      // the dive
    cc = KSp([[23.85, 11.1], [23.95, 9.4], [24.02, 9.6], [24.12, 9.0], [24.22, 8.2], [24.30, 5.8], [24.36, 4.9], [24.6, 4.9], [24.9, 4.9], [25.25, 8.5], [25.6, 11.1], [25.7, 11.1]], w);
    rot = KSp([[23.95, 0], [24.12, 1.5], [24.3, 1.5708], [24.9, 1.5708], [25.25, 0.5], [25.45, -0.1], [25.6, 0], [25.7, 0]], w);
    sy = w < 24.02 ? 0.88 : w < 24.3 ? 1.2 : (w < 24.5 ? 1.02 : 1);
  }
  const breath = 0.012 * Math.sin(w * 3.2);
  const [bx, by] = px(u, h, SQ), S = SAMS, syy = sy * (1 + breath), sxx = (1 + (1 - sy) * 0.4) * tsx;
  const cy = cc == null ? by - S * 1.58 * syy : px(u, cc, SQ)[1];
  const st = { x: bx, y: cy, S, face, rot: rot * face + lean, sx: sxx, sy: syy, sw: { mode: 'none' }, band: { a: 1, wind: 0.55 + 0.3 * Math.sin(w * 2.3) }, ground: by };
  if (CUE.samWalkOn(w)) st.walk = CUE.phAt(CUE.samPh, w);
  return { st, u, h, dive: cc != null, cc };
}
const holdPx = (w, sm) => { sm = sm || samBase(w); const g = samGeom(sm.st, w); return g.X(1.05, 0.92); };
// ================================================================= MOCHI (floor, table, pot)
const P_PAW = clonePose(P_POUNCE); P_PAW.L.FN = [20, 6, 64, -9]; P_PAW.L.FF = [14, 6, 56, -4];
const P_SWATJ = clonePose(P_STAND); P_SWATJ.L = { FN: [17, 9, 52, -14], FF: [10, 9, 42, -9], HN: [-19, 9, -14, -7], HF: [-25, 9, -22, -4] }; P_SWATJ.b[4] = -0.1; P_SWATJ.h = [34, -66, -0.1, 1];
const P_CROUCHM = clonePose(P_CROUCH); P_CROUCHM.h = [34, -33, 0.1, 1];
const P_TUCK = clonePose(P_STAND); P_TUCK.L = { FN: [17, 9, 14, -13], FF: [10, 9, 6, -11], HN: [-19, 9, -6, -12], HF: [-25, 9, -14, -10] }; P_TUCK.b[1] -= 2;
const P_REACH = clonePose(P_STAND); P_REACH.L = { FN: [17, 9, 30, -8], FF: [10, 9, 24, -6], HN: [-19, 9, -20, -9], HF: [-25, 9, -28, -6] };
const JUMPS = [[16.80, 0.22, 'up'], [24.55, 0.30, 'down'], [28.28, 0.24, 'up']];
function jumpAt(w) {                      // ballistic jump: crouch -> push-off stretch -> tuck at the top -> reach for the landing; body tilts with the velocity (nose up rising, nose down falling)
  for (const [w0, T, kind] of JUMPS) if (w >= w0 - 0.14 && w < w0 + T + 0.12) {
    const k = (w - w0) / T, a = CUE.mocPos(w - 0.012), b = CUE.mocPos(w + 0.012), vu = Math.abs(b.u - a.u) / 0.024, vh = (b.h - a.h) / 0.024, ang = Math.atan2(vh, Math.max(vu, 20));
    let pose;
    if (k < 0) pose = mixPose(P_STAND, P_CROUCH, ramp(k, -0.64, 0));
    else if (k < 0.3) pose = mixPose(P_CROUCH, P_RUN, ramp(k, 0, 0.3));
    else if (k < 0.65) pose = mixPose(P_RUN, P_TUCK, ramp(k, 0.3, 0.62));
    else if (k <= 1) pose = mixPose(P_TUCK, P_REACH, ramp(k, 0.62, 0.95));
    else pose = mixPose(P_REACH, kind === 'down' ? P_STAND : P_CROUCH, ramp(k, 1, 1.5));
    return { pose, rot: k < 0 || k > 1 ? 0 : -clampK(ang * 0.5, -0.5, 0.5), land: k > 1 ? 1 - 0.14 * Math.sin(Math.PI * clampK((k - 1) / 0.5)) : 1 };
  }
  return null;
}
const CFL = [[13.1, 1], [16.4, -1], [26.0, 1], [28.75, -1]];
const P_STALK = mixPose(P_STAND, P_CROUCH, 0.6); P_STALK.h = [34, -44, 0.1, 1];
// swat: the near front paw (cat-local px) rests at BASE, winds up, taps the egg's near tip at the hit time, then holds / returns. Hit x is solved from the real positions.
function pawFor(w, wp, hold) {
  const uc = KSp(CUE.CT, wp), tip = KSp(EU, wp) + 2.7, xh = (uc - tip) / (MOCS / SC) - 2.5;
  const a = ramp(w, wp - 0.18, wp - 0.03), b = ramp(w, wp - 0.03, wp), c = ramp(w, wp + hold, wp + hold + 0.35);
  const lp = (p, q, k) => [lerpK(p[0], q[0], k), lerpK(p[1], q[1], k)]; const base = [30, -2], wind = [26, -32], hit = [xh, -8.4];
  return lp(lp(lp(base, wind, a), hit, b), base, c);
}
function pawNow(w) { return w < 19.8 ? pawFor(w, 18.25, 0.9) : w < 21.8 ? pawFor(w, 20.6, 0.22) : pawFor(w, 22.8, 0.2); }
function catBase(w) {
  const m = CUE.mocPos(w), { face, sx: tsx } = turnOf(w, CFL, -1);
  let [x0, y0] = px(m.u, m.h, m.q), pose = clonePose(P_STAND), sy = 1, rot = 0, pro = null;
  const e = { open: 1, look: [0.2, 0], dil: 0.45, sparkle: 1, wide: 0 }, mouth = { open: 0 };
  let tailWig = 0.3, earTw = 0.25 * (pulse(w, 2.2) + pulse(w, 4.6) + pulse(w, 6.1) + pulse(w, 11.0)), blush = 0.5, hTilt = 0;
  const ph = CUE.phAt(CUE.catPh, w), eggHold = holdPx(w);
  const fwdLook = (to) => lookTo(face, [x0, y0 - 150], to, 140);
  if (w < 7.2) { pose = clonePose(P_STAND); e.look = fwdLook(eggHold); e.look[1] = clampK(e.look[1] + 0.2, -1, 1); tailWig = 0.4; pose.b[1] += 0.5 * Math.sin(w * 3); }
  else if (w < 7.78) { const k = ramp(w, 7.2, 7.5); pose = mixPose(P_STAND, P_CROUCH, k); pose.b[0] += 2.4 * Math.sin(TAU * 7 * (w - 7.2)) * k; e.look = fwdLook(eggHold); e.dil = 0.9; tailWig = 0.9; }
  else if (w < 7.96) { pose = mixPose(P_CROUCH, P_SWATJ, ramp(w, 7.78, 7.85)); e.look = fwdLook(eggHold); e.dil = 0.9; mouth.open = 0.3; }
  else if (w < 12.4) {
    const k = ramp(w, 7.96, 8.2); pose = mixPose(P_SWATJ, P_STAND, k);
    sy = 1 - 0.12 * Math.sin(Math.PI * clampK((w - 7.96) / 0.2)) - 0.07 * pulse(w, 8.33, 0.05);
    pose.h[2] = -0.2 * ramp(w, 8.1, 8.4) + 0.025 * Math.sin(w * 5); pose.h[1] -= 1.5 * ramp(w, 8.1, 8.4);
    e.look = [0.1, -1]; e.wide = 0.5 * ramp(w, 8.2, 8.4); e.dil = 0.85; tailWig = 0.05 + 0.1 * pulse(w, 11.2, 0.4); 
    if (w > 11.3 && w < 12.2) e.look = [0.95, 0.35];                                  // sneaks a glance at the samurai
    pose.ear = [0.55, 0];
  }
  else if (w < 13.1) { pose = clonePose(P_STAND); e.open = 0.55; e.look = [0.6, 0.2]; pose.ear = [0.7, 0]; mouth.open = 0.1 * pulse(w, 12.9, 0.1); pose.h[2] = -0.2 * (1 - ramp(w, 12.4, 12.8)); }
  else if (w < 16.5) { pose = walkPose(P_STAND, ph, 15, 9); e.look = [0.7, 0.05]; tailWig = 0.5; pose.tl[2] += 0.5; e.open = 0.6 + 0.4 * ramp(w, 13.1, 13.5); }
  else if (w < 16.7) { pose = mixPose(P_STAND, P_CROUCH, ramp(w, 16.45, 16.65)); e.look = [0.8, 0.5]; e.dil = 0.9; tailWig = 0.9; }
  else if (w < 17.08) { pose = mixPose(P_CROUCH, P_POUNCE, ramp(w, 16.7, 16.85)); pose = mixPose(pose, P_CROUCH, ramp(w, 16.95, 17.08)); e.look = [1, 0.1]; e.dil = 0.9; }
  else if (w < 24.55) {                                                                // on the table: stalking, three pats
    pose = CUE.catCrawlOn(w) ? walkPose(P_STALK, ph, 7, 3) : clonePose(P_STALK);
    sy = 1 - 0.1 * pulse(w, 17.1, 0.07) * 1;
    e.dil = 0.92; e.look = [1, 0.35]; tailWig = 0.35; pose.h[2] += 0.02 * Math.sin(w * 4);
    const pw = pawNow(w); if (!CUE.catCrawlOn(w) || w > 18.1) pose.L.FN = [pose.L.FN[0], pose.L.FN[1], pw[0], pw[1]];
    const hitK = (a) => pulse(w, a, 0.06);
    pose.b[0] += 1.2 * pulse(w, 18.25, 0.07) + 1.5 * pulse(w, 20.6, 0.07) + 5 * pulse(w, 22.8 + 0.04, 0.12);
    pose.h[0] += 1.2 * hitK(18.25) + 1.5 * hitK(20.6) + 6 * hitK(22.84);
    if (w > 18.3 && w < 19.5) { e.look = [-0.2, -0.1]; e.open = 1; e.dil = 0.5; e.look = [0.9, 0.6]; }                     // freezes, eyes slide to the samurai
    if (w >= 19.5 && w < 19.9) { e.open = 0.2; mouth.open = 0; }
    if (w > 20.6 && w < 21.9) { e.look = [0, 0]; e.sparkle = 1; e.happy = 0.7; e.wide = 0.3; mouth.open = 0.25; tailWig = 0.8; }                // looks straight at us
    if (w > 22.0 && w < 22.78) { pose.b[0] += 1.4 * Math.sin(TAU * 8 * (w - 22.0)); tailWig = 1.0; e.dil = 1; }
    if (w > 23.3) { pose.ear = [1, 0]; e.wide = 1; e.dil = 0.2; mouth.open = 0.7 * ramp(w, 23.3, 23.7); tailWig = 0.05; pose.tl[3] = 1.7; }
  }
  else if (w < 24.98) { pose = mixPose(P_CROUCH, P_POUNCE, ramp(w, 24.55, 24.7)); pose = mixPose(pose, P_CROUCH, ramp(w, 24.8, 24.97)); e.look = [1, 0.4]; e.wide = 0.6; }
  else if (w < 25.62) { pose = walkPose(P_STAND, ph, 15, 9); sy = 1 - 0.1 * pulse(w, 25.0, 0.07); e.look = [0.9, 0.4]; e.wide = 0.5; tailWig = 0.6; }
  else if (w < 26.0) { pose = clonePose(P_STAND); const k = Math.sin(Math.PI * ramp(w, 25.62, 26.0)); pose.h[1] += 12 * k; pose.h[0] += 3 * k; pose.h[2] += 0.25 * k; e.look = [0.9, 0.8]; e.wide = 0.3; tailWig = 0.7; }
  else if (w < 28.1) { pose = walkPose(P_STAND, ph, 15, 9); e.look = [0.8, 0.1]; e.happy = 0.3; tailWig = 0.7; pose.tl[2] += 0.4; }
  else if (w < 28.28) { pose = mixPose(P_STAND, P_CROUCH, ramp(w, 28.1, 28.26)); e.look = [0.8, 0.5]; e.dil = 0.9; tailWig = 0.9; }
  else if (w < 28.58) { pose = mixPose(P_CROUCH, P_POUNCE, ramp(w, 28.28, 28.36)); pose = mixPose(pose, P_SIT, ramp(w, 28.45, 28.58)); e.look = [0.8, 0.6]; e.wide = 0.4; }
  else {
    pose = clonePose(P_SIT); sy = 1 - 0.12 * Math.sin(Math.PI * clampK((w - 28.58) / 0.22));
    const slp = ramp(w, 29.15, 30.0); e.sleep = slp; e.happy = 0.6 * slp; e.look = [-0.3, 0.3]; e.wide = 0; e.dil = 0.4; mouth.open = 0; tailWig = 0.12; blush = 0.9;
    pose.h[2] += 0.12 * ramp(w, 29.2, 30.1); pose.h[1] += 4 * ramp(w, 29.2, 30.1);
  }
  const J = jumpAt(w); if (J) { pose = J.pose; rot = J.rot; sy = J.land; }
  const wob = (m.mode === 'pot' || m.mode === 'floor' && w > 28.3) ? 0 : 0;
  const sxx = tsx;
  return { mouth, face, kind: 'kit', col: ORG.k1, sd: 3, rot, x: x0, y: y0, s: MOCS, pose, sy, sx: sxx, e, tailWig, tailPh: TAU * w * 1.2, breath: 0.022 * Math.sin(w * 3.0), earTw, blush, _mode: m.mode };
}

const headTop = (w) => { const cat = catBase(w), g = catGeom(cat, w); return g.HX(0, -g.K.hr / g.hs * 1.02); };
// ================================================================= THE EGG
const EGG_R = 20;                                                                     // px: centre sits this far above what it rests on
function arc(w, w0, T, a, b) {                                                       // ballistic in px: gravity in px/s^2
  const g = GR * SC, t = w - w0, vx = (b[0] - a[0]) / T, vy = (b[1] - a[1] - 0.5 * g * T * T) / T; return [a[0] + vx * t, a[1] + vy * t + 0.5 * g * t * t]; }
const EU = [[17.05, 6.0], [18.25, 6.0], [18.9, 5.0], [19.4, 4.6], [20.6, 4.6], [21.2, 3.2], [21.7, 2.7], [22.8, 2.7], [23.2, 1.4], [23.6, 0.2], [24.0, -0.55], [24.2, -1.0]];
const tableEggPx = (w) => { const u = KSp(EU, w), p = px(u, TAB.egg, TAB.eggQ); return [p[0], p[1], u]; };
function diveHands(w, sm) { const g = samGeom(sm.st, w), a = g.X(0.5, -2.0), b = g.X(0.5, -2.5); return [a, b]; }
function eggAt(w) {
  let p, ang = 0, sq = 1, layer = 'front', a = 1;
  const S = SAMS;
  if (w < 3.45) p = holdPx(w);
  else if (w < 3.80) { p = arc(w, 3.45, 0.35, holdPx(3.45), holdPx(3.80)); ang = (w - 3.45) * 9; }
  else if (w < 4.12) { const a0 = holdPx(3.80); p = arc(w, 3.80, 0.32, [a0[0], a0[1]], holdPx(4.12)); ang = 3.15 - (w - 3.8) * 11; }
  else if (w < 4.50) { p = arc(w, 4.12, 0.38, holdPx(4.12), holdPx(4.50)); ang = -0.35 + (w - 4.12) * 7; }
  else if (w < 7.87) { p = holdPx(w); ang = 0.04 * Math.sin(w * 3.1); }
  else if (w < 8.28) { p = arc(w, 7.87, 0.41, holdPx(7.87), eggRest(8.28)); ang = (w - 7.87) * 12; }
  else if (w < 12.3) { p = eggRest(w); ang = damp(w, 8.28, 0.22, 0.5, 0.42) + damp(w, 9.6, 0.1, 0.4, 0.5) + damp(w, 10.6, 0.14, 0.4, 0.5) + damp(w, 11.7, 0.35, 0.5, 0.5); sq = 1 - 0.08 * pulse(w, 8.3, 0.05); }
  else if (w < 12.8) { const k = ramp(w, 12.3, 12.8), a0 = eggRest(12.3), b0 = holdPx(12.8); p = [lerpK(a0[0], b0[0], k), lerpK(a0[1], b0[1], k) - 22 * Math.sin(Math.PI * k)]; }
  else if (w < 16.7) { p = holdPx(w); ang = 0.04 * Math.sin(w * 3.1); }
  else if (w < 17.05) { const k = ramp(w, 16.7, 17.05), a0 = holdPx(16.7), b0 = tableEggPx(17.05); p = [lerpK(a0[0], b0[0], k), lerpK(a0[1], b0[1], k) - 10 * Math.sin(Math.PI * k)]; layer = 'front'; }
  else if (w < 24.2) { const t = tableEggPx(w); p = [t[0], t[1]]; ang = 0.32 * Math.sin((t[2] - 6.0) * 1.3) + damp(w, 17.05, 0.12, 0.2, 0.3) + (w > 23.9 ? 0.5 * ramp(w, 23.9, 24.2) : 0); if (w > 24.0) p[1] += 6 * ramp(w, 24.0, 24.2); }
  else if (w < 24.31) { const a0 = tableEggPx(24.199); const sm = samBase(24.31), hh = diveHands(24.31, sm), tg = [(hh[0][0] + hh[1][0]) / 2, (hh[0][1] + hh[1][1]) / 2 - 30]; a0[1] += 6; p = arc(w, 24.2, 0.11, a0, tg); ang = 0.5 + (w - 24.2) * 5; }
  else if (w < 25.0) { const sm = samBase(w), hh = diveHands(w, sm); p = [(hh[0][0] + hh[1][0]) / 2, (hh[0][1] + hh[1][1]) / 2 - 30]; ang = 0.5 * (1 - ramp(w, 24.31, 24.6)) + 0.05; sq = 1 - 0.12 * pulse(w, 24.33, 0.04); }
  else if (w < 25.3) { const sm = samBase(w), hh = diveHands(w, sm), k = ramp(w, 25.0, 25.3), a0 = [(hh[0][0] + hh[1][0]) / 2, (hh[0][1] + hh[1][1]) / 2 - 30], b0 = holdPx(w, sm); p = [lerpK(a0[0], b0[0], k), lerpK(a0[1], b0[1], k)]; }
  else if (w < 27.88) { p = holdPx(w); ang = 0.04 * Math.sin(w * 3.1); }
  else if (w < 28.22) { const tg = px(28.6, POT.h - 1.3, POT.q); p = arc(w, 27.88, 0.34, holdPx(27.88), tg); ang = (w - 27.88) * 8; if (w > 28.12) layer = 'pot'; }
  else { const u = 28.6, bob = damp(w, 28.22, 1.6, 0.45, 0.55); p = px(u + 0.1 * Math.sin(w * 3), POT.h - 1.9 - bob * 0.35 + 0.18 * Math.sin(w * 2.4), POT.q + 1.6); layer = 'pot'; ang = 0.2 * Math.sin(w * 2.1) + 0.2; }
  return { p, ang, sq, layer, a };
}
function eggRest(w) { const t = headTop(w); return [t[0], t[1] - EGG_R - 3]; }
// ================================================================= samurai hands / expression (depends on the egg)
function samFinal(w) {
  const sm = samBase(w), st = sm.st, f = st.face, g = samGeom(st, w), S = SAMS, egg = eggAt(w), E = egg.p, hold = g.X(1.05, 0.92);
  const idleL = g.X(-1.3, 0.95), idleR = g.X(1.3, 0.95);
  const cradle = (e) => [[e[0] - 22 * f, e[1] + 16], [e[0] + 22 * f, e[1] + 16]];
  let hands = null, look = [0.3, 0.1], wide = 0, closed = 0, sweat = 0, squeeze = 0;
  const rubL = Math.sin(TAU * 2.4 * w);
  if (w < 3.45 || (w >= 4.5 && w < 7.87) || (w >= 12.8 && w < 16.7) || (w >= 25.3 && w < 27.7)) hands = cradle(hold);
  else if (w < 4.5) hands = cradle([E[0], E[1] + 4]);
  else if (w < 8.9) { const k = ramp(w, 7.87, 8.0); hands = [[lerpK(hold[0] - 22 * f, hold[0] + 34 * f, k), lerpK(hold[1] + 16, hold[1] - 60, k)], [lerpK(hold[0] + 22 * f, hold[0] + 62 * f, k), lerpK(hold[1] + 16, hold[1] - 40, k)]]; }
  else if (w < 12.3) { const k = ramp(w, 8.9, 11.5), tx = E[0], ty = E[1]; hands = [[lerpK(hold[0] + 34 * f, tx - 52 * f, k), lerpK(hold[1] - 60, ty + 10, k)], [lerpK(hold[0] + 62 * f, tx + 52 * f, k), lerpK(hold[1] - 40, ty + 10, k)]]; }
  else if (w < 12.8) hands = cradle(E);
  else if (w < 17.0) hands = cradle(E);
  else if (w < 17.5) { const k = ramp(w, 17.05, 17.25), br = g.X(0.8, -0.35); const a = [lerpK(hold[0] - 22 * f, br[0] + 8 * Math.sin(w * 14) * f, k), lerpK(hold[1] + 16, br[1], k)]; hands = [a, idleL]; if (w > 17.3) hands = [[br[0] + 12 * Math.sin((w - 17.3) * 16) * f, br[1]], g.X(-1.3, 0.95)]; }
  else if (w < 21.5) hands = null;
  else if (w < 23.98) {
    const bp = bowlAt(w), c = [bp[0], bp[1]]; hands = [[c[0] - 30 * f, c[1] + 8], [c[0] + 30 * f, c[1] + 8]];
  }
  else if (w < 25.0) hands = diveHands(w, sm);
  else if (w < 25.3) { const k = ramp(w, 25.0, 25.3), d = diveHands(w, sm), c = cradle(hold); hands = [[lerpK(d[0][0], c[0][0], k), lerpK(d[0][1], c[0][1], k)], [lerpK(d[1][0], c[1][0], k), lerpK(d[1][1], c[1][1], k)]]; }
  else if (w < 28.6) { const k = ramp(w, 27.7, 27.9) * (1 - ramp(w, 28.2, 28.6)), c = cradle(hold); hands = [[c[0][0] + 34 * f * k, c[0][1] - 52 * k], [c[1][0] + 46 * f * k, c[1][1] - 40 * k]]; }
  else hands = null;
  if (!hands && st.walk == null) hands = [g.X(1.18, 1.02 + 0.03 * Math.sin(w * 2.1)), g.X(-1.18, 1.02 + 0.03 * Math.sin(w * 2.1 + 1))];
  // eyes
  const eggLook = (p) => lookTo(f, [st.x, st.y], p, 150);
  if (w < 3.3) look = [0.1, 0.5]; else if (w < 4.6) { look = eggLook(E); wide = 0.8; } else if (w < 7.6) { look = w < 6.4 ? [0.1, 0.45] : [0.8, 0.25]; wide = ramp(w, 6.4, 7.0) * 0.3; }
  else if (w < 7.87) { look = [0.9, 0.3]; wide = 0.5; } else if (w < 8.4) { look = eggLook(E); wide = 1; sweat = ramp(w, 8.0, 8.3); }
  else if (w < 12.4) { look = eggLook(E); wide = 0.9; sweat = 0.9; squeeze = 0.0; }
  else if (w < 13.6) { look = [0.4, 0.2]; closed = w > 12.9 ? ramp(w, 12.9, 13.1) * (1 - ramp(w, 13.5, 13.6)) : 0; sweat = 1 - ramp(w, 12.4, 13.2); }
  else if (w < 16.6) look = [0.6, 0.2]; else if (w < 17.1) look = eggLook(E);
  else if (w < 17.5) { look = [0.3, -0.4]; closed = ramp(w, 17.2, 17.3) * (1 - ramp(w, 17.45, 17.5)); }
  else if (w < 21.3) { look = w > 18.58 && w < 19.25 ? [0.9, 0.2] : [0.4, 0.3]; wide = w > 18.6 && w < 19.2 ? 0.6 : 0; sweat = w > 18.6 && w < 19.2 ? 0.7 : 0; }
  else if (w < 23.65) { const bp = bowlAt(w); look = lookTo(f, [st.x, st.y], bp, 120); look[1] = Math.max(look[1], 0.3); closed = 0; }
  else if (w < 24.9) { look = eggLook(E); look[1] = Math.max(look[1], -0.2); wide = 1; sweat = 1; }
  else if (w < 26.4) { look = [0.2, 0.3]; closed = ramp(w, 24.9, 25.05) * (1 - ramp(w, 26.0, 26.2)); squeeze = 1; sweat = 1 - ramp(w, 24.9, 25.8); }
  else if (w < 28.2) look = eggLook(E); else { look = lookTo(f, [st.x, st.y], px(CUE.mocPos(w).u, CUE.mocPos(w).h + 8, 13)); closed = ramp(w, 28.8, 29.2) * 0.0; }
  if (w > 29.3) closed = ramp(w, 29.3, 29.7);
  if (w > 29.3) squeeze = 0.8;
  st.sweat = sweat;
  return { st, ey: { open: 1, look, wide, closed, squeeze }, hands, sm, egg };
}
// ---- bowl: rests on the stool, lifted at 20.3, polished until the dive, flies off at 23.98, wobbles on the floor
function bowlAt(w) {
  const sp = px(STOOL.u, STOOL.h + 0.1, STOOL.q);
  if (w < 21.5) return [sp[0], sp[1] - 0, 0, 'rest'];
  const sm = samBase(w), g = samGeom(sm.st, w), hold = g.X(1.0, 0.55);
  if (w < 21.9) { const k = ramp(w, 21.5, 21.9); return [lerpK(sp[0], hold[0], k), lerpK(sp[1], hold[1], k) - 14 * Math.sin(Math.PI * k), 0, 'lift']; }
  if (w < 23.98) return [hold[0] + 5 * Math.sin(TAU * 2.4 * w), hold[1] + 3 * Math.cos(TAU * 2.4 * w), 0.07 * Math.sin(TAU * 2.4 * w + 1), 'held'];
  const h0 = g.X(1.0, 0.55), fl = px(-24.5, 0.0, 18.6);
  if (w < 24.3) { const p = arc(w, 23.98, 0.32, [h0[0], h0[1]], [fl[0], fl[1]]); return [p[0], p[1], -(w - 23.98) * 14, 'fly']; }
  const t = w - 24.3, wob = 0.45 * Math.exp(-t / 0.18) * Math.sin(TAU * t / 0.09);
  return [fl[0], fl[1], wob, 'floor'];
}
// ================================================================= layers
function shadows(ctx, w, sf, cat, egg) {
  const sm = sf.sm, lift = clampK(sm.h / 6, 0, 1.4);
  if (!sm.dive) softShadow(ctx, sm.u, SQ + 0.4, 9 * (1 - 0.1 * lift), 3.0 * (1 - 0.1 * lift), 0.3 * (1 - 0.4 * lift), sm.h < 1 ? 0 : sm.h > 3 ? PLAT.h : 0);
  else softShadow(ctx, sm.u + 3, SQ + 0.4, 12, 3.0, 0.28);
  const m = CUE.mocPos(w); if (m.mode === 'floor') softShadow(ctx, m.u + 0.5 * cat.face * -1, MQ + 0.4, 10.5, 3.2, 0.3); else if (m.mode === 'table') softShadow(ctx, m.u, 11.9, 9, 2.4, 0.3, TAB.h); else if (m.mode === 'air') softShadow(ctx, m.u, m.q + 0.4, 9 * 0.8, 2.4, 0.15 + 0.1, m.h > 6.4 ? 0 : 0);
}
function eggShadow(ctx, w, egg) {
  const u = toWu(egg.p); let surf = null, q = EQ;
  if (w >= 17.05 && w < 24.2) { surf = TAB.h; q = TAB.eggQ; } else if (w >= 24.2 && w < 24.31) { surf = 0; } else if (w >= 3.45 && w < 4.5) surf = 0;
  if (surf == null) return;
  const hh = (px(0, surf, q)[1] - egg.p[1]) / SC; softShadow(ctx, u, q + 0.2, 2.6 * (1 - clampK(hh / 40) * 0.4), 0.9, 0.34 * (1 - clampK((hh - 2) / 30)), surf);
}
function dust(ctx, u, h, q, w, w0, big = 1) { const t = w - w0; if (t < 0 || t > 0.4) return; for (let i = 0; i < 6; i++) { const sd = i % 2 ? 1 : -1, d = (0.5 + 0.5 * CUE.hash(i, 3)) * 5 * big * t * 6 * sd, y = -1.6 * t * 6 * CUE.hash(i, 4), r = (0.5 + 0.9 * CUE.hash(i, 5)) * (0.5 + t * 4) * big, p = px(u + d, h + 0.3 - y * 0.2, q); ctx.save(); ctx.globalAlpha = 0.5 * (1 - t / 0.4); ctx.fillStyle = '#fff6e4'; ctx.beginPath(); ctx.arc(p[0], p[1] - 4 - y * 5, r * 7, 0, 7); ctx.fill(); ctx.restore(); } }
function backLayer(ctx, w, sf, cat) {
  drawWall(ctx); drawFloor(ctx); drawPlatform(ctx); drawStool(ctx); drawTable(ctx); drawPotBack(ctx, w);
  const eg = sf.egg; if (eg.layer === 'pot') drawEgg(ctx, eg.p[0], eg.p[1], eg.ang, eg.sq);
  drawPotFront(ctx);
  const b = bowlAt(w); if (b[3] === 'rest') drawBowl(ctx, b[0], b[1], b[2]);
  shadows(ctx, w, sf, cat, eg); eggShadow(ctx, w, eg);
}
function frontLayer(ctx, w, sf, cat) {
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  if (cat._mode === 'pot') { ctx.save(); ctx.beginPath(); const { cx, rx } = potBody(); ctx.rect(cx - rx * 0.78, 0, rx * 3, 3000); ctx.clip(); drawPotFront(ctx); ctx.restore(); }
  const eg = sf.egg; if (eg.layer === 'front') drawEgg(ctx, eg.p[0], eg.p[1], eg.ang, eg.sq);
  const b = bowlAt(w); if (b[3] !== 'rest') drawBowl(ctx, b[0], b[1], b[2]);
  drawSteam(ctx, w, cat._mode === 'pot' ? 0.8 : 1);
  dust(ctx, -26.4, 0, SQ + 0.6, w, 3.72, 1); dust(ctx, 0.6, 0, MQ + 0.4, w, 7.96, 0.8); dust(ctx, 17.8, TAB.h, 9.5, w, 17.08, 0.7); dust(ctx, -3.0, 0, SQ + 0.6, w, 24.3, 1.6); dust(ctx, -0.5, 0, MQ + 0.4, w, 24.98, 0.8);
  if (w > 24.0 && w < 24.5) for (let i = 0; i < 4; i++) { const p0 = px(-9 + 7 * (w - 24.0) / 0.3 - i * 2.2, 5 + 1.4 * i, SQ + 0.4); line(ctx, [[p0[0] - 60, p0[1]], [p0[0] - 12, p0[1]]], 'rgba(61,48,66,0.35)', 2.4); }       // speed lines behind the dive
  if (w > 28.56 && w < 29.1) { const p = px(31.6, POT.h - 0.5, POT.q + 2); for (let i = 0; i < 10; i++) { const t = w - 28.58, an = -Math.PI * (0.15 + 0.7 * CUE.hash(i, 8)), v = 30 + 40 * CUE.hash(i, 9), x = p[0] + Math.cos(an) * v * t * 5.2, y = p[1] + (Math.sin(an) * v * t - 0.5 * 160 * t * t) * 5.2; ctx.save(); ctx.globalAlpha = 0.9 * (1 - t / 0.5); ctx.fillStyle = COL.broth; ctx.beginPath(); ctx.arc(x, y, 5 + 4 * CUE.hash(i, 10), 0, 7); ctx.fill(); ctx.restore(); } }
  if (w > 30.0) for (let i = 0; i < 3; i++) { const ph = ((w - 30.0) * 0.5 + i / 3) % 1, p0 = px(31.6 + (i - 1) * 2.4, POT.h + 14, POT.q), x = p0[0] + 20 * Math.sin(ph * 5 + i * 2), y = p0[1] - ph * 150, r = 16 + 5 * i; ctx.save(); ctx.globalAlpha = Math.sin(Math.PI * ph) * 0.85; ctx.fillStyle = '#ff8fa3'; ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + r * 0.9); ctx.bezierCurveTo(x - r * 1.6, y - r * 0.3, x - r * 0.5, y - r * 1.3, x, y - r * 0.4); ctx.bezierCurveTo(x + r * 0.5, y - r * 1.3, x + r * 1.6, y - r * 0.3, x, y + r * 0.9); ctx.fill(); ctx.stroke(); ctx.restore(); }
  if (w > 24.3 && w < 24.8) sparkle4(ctx, sf.egg.p[0] + 40, sf.egg.p[1] - 36, 26 * Math.sin(Math.PI * (w - 24.3) / 0.5), 0.9);
}
const CAMU = [[0, -32], [3.0, -30], [5.5, -16], [8.5, -9], [13.5, -6], [15.5, 1], [17.5, 3], [19.3, 0], [21.3, -8], [23.7, -8], [24.5, -7.5], [25.7, -6], [27.5, 8], [29.0, 22], [34, 24]];
const CAMZ = [[0, 1.6], [23.0, 1.6], [24.0, 1.75], [24.4, 1.85], [25.4, 1.7], [26.2, 1.6], [34, 1.6]];
var frame = function (t) {
  const w = CUE.wOf(t);
  if (!window._neutral) { GRAIN.getContext('2d').fillStyle = '#fff'; GRAIN.getContext('2d').fillRect(0, 0, W, H); for (const cv of [FIB, VIG]) cv.getContext('2d').clearRect(0, 0, W, H); window._neutral = true; }
  const p = PAPER.getContext('2d'); p.setTransform(1, 0, 0, 1, 0, 0); p.globalCompositeOperation = 'source-over'; p.globalAlpha = 1; p.fillStyle = '#f1e9d8'; p.fillRect(0, 0, W, H);
  const sf = samFinal(w), cat = catBase(w);
  CAMNOW = [CUE.OX + KSp(CAMU, w) * SC, 1262, KSp(CAMZ, w)];
  composeFrame(CAMNOW, { noHalo: true,
    pre: (c) => backLayer(c, w, sf, cat),
    chars: (c) => { if (cat._mode === 'table' || cat._mode === 'pot') drawCat(c, cat, w); samLegs(c, sf.st, w); samInk(c, sf.st, w, 0.5); samArms(c, sf.st, w, sf.hands || undefined); if (!(cat._mode === 'table' || cat._mode === 'pot')) drawCat(c, cat, w); },
    over: (c) => { samOver(c, sf.st, w); samEyes(c, sf.st, w, sf.ey, sf.ey); frontLayer(c, w, sf, cat); } });
};
