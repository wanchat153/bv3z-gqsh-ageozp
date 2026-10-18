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
  if (w > 12.33 && w < 12.57) { const k = (w - 12.45) / 0.12; h = Math.max(h, 8.0 * (1 - k * k)); }                       // hop to reach the egg on Mochi's head (arm reach is only ~0.72 S)
  if (w >= 12.57 && w < 12.8) sy = 1 - 0.12 * Math.sin(Math.PI * (w - 12.57) / 0.23);
  let lean = 0;
  if (w > 3.7 && w < 4.9) lean = 0.05 * Math.sin((w - 3.7) * 9);                     // staggering under the juggled egg
  if (w > 7.86 && w < 8.5) lean = -0.1 * Math.sin(Math.PI * ramp(w, 7.86, 8.5)) ;     // recoils when the paw hits
  if (w > 18.5 && w < 19.3) lean = -0.03;
  if (w >= 23.85 && w < 25.7) {                                                      // the dive
    cc = KSp([[23.85, 11.1], [23.95, 9.4], [24.02, 9.2], [24.12, 8.6], [24.22, 8.0], [24.30, 7.6], [24.6, 7.6], [24.9, 7.6], [25.25, 9.2], [25.6, 11.1], [25.7, 11.1]], w);
    rot = KSp([[23.95, 0], [24.12, 0.8], [24.3, 0.95], [24.9, 0.95], [25.25, 0.45], [25.5, 0.0], [25.7, 0]], w);
    sy = w < 24.02 ? 0.88 : w < 24.3 ? 1.2 : (w < 24.5 ? 1.02 : 1);
  }
  const breath = 0.012 * Math.sin(w * 3.2);
  const [bx, by] = px(u, h, SQ), S = SAMS, syy = sy * (1 + breath), sxx = (1 + (1 - sy) * 0.4) * tsx;
  const cy = cc == null ? by - S * 1.58 * syy : px(u, cc, SQ)[1];
  const st = { x: bx, y: cy, S, face, rot: rot * face + lean, sx: sxx, sy: syy, sw: { mode: 'none' }, band: { a: 1, wind: 0.55 + 0.3 * Math.sin(w * 2.3) }, ground: by };
  if (CUE.samWalkOn(w)) st.walk = CUE.phAt(CUE.samPh, w);
  return { st, u, h, dive: cc != null, cc };
}
const holdPx = (w, sm) => { sm = sm || samBase(w); const g = samGeom(sm.st, w); const hi = ramp(w, 12.45, 12.66) * (1 - ramp(w, 13.1, 13.6)); return g.X(0.95 + 0.0 * hi, 0.85 - 1.2 * hi); };   // held high while Mochi's face is next to it
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
function eggAt(w) {
  let p, ang = 0, sq = 1, layer = 'front', a = 1;
  const S = SAMS;
  if (w < 3.45) p = holdPx(w);
  else if (w < 3.80) { p = arc(w, 3.45, 0.35, holdPx(3.45), holdPx(3.80)); ang = (w - 3.45) * 9; }
  else if (w < 4.12) { const a0 = holdPx(3.80); p = arc(w, 3.80, 0.32, [a0[0], a0[1]], holdPx(4.12)); ang = 3.15 - (w - 3.8) * 11; }
  else if (w < 4.50) { p = arc(w, 4.12, 0.38, holdPx(4.12), holdPx(4.50)); ang = -0.35 + (w - 4.12) * 7; }
  else if (w < 7.87) { p = holdPx(w); ang = 0.04 * Math.sin(w * 3.1); }
  else if (w < 8.28) { p = arc(w, 7.87, 0.41, holdPx(7.87), eggRest(8.28)); ang = (w - 7.87) * 12; }
  else if (w < 12.45) { p = eggRest(w); ang = damp(w, 8.28, 0.22, 0.5, 0.42) + damp(w, 9.6, 0.1, 0.4, 0.5) + damp(w, 10.6, 0.14, 0.4, 0.5) + damp(w, 11.7, 0.35, 0.5, 0.5); sq = 1 - 0.08 * pulse(w, 8.3, 0.05); }
  else if (w < 12.8) { const k = ramp(w, 12.45, 12.66), a0 = eggRest(12.45), b0 = holdPx(w); p = [lerpK(a0[0], b0[0], k), lerpK(a0[1], b0[1], k) - 14 * Math.sin(Math.PI * k)]; }
  else if (w < 16.7) { p = holdPx(w); ang = 0.04 * Math.sin(w * 3.1); }
  else if (w < 17.05) { const k = ramp(w, 16.7, 17.05), a0 = holdPx(16.7), b0 = tableEggPx(17.05); p = [lerpK(a0[0], b0[0], k), lerpK(a0[1], b0[1], k) - 10 * Math.sin(Math.PI * k)]; layer = 'front'; }
  else if (w < 24.2) { const t = tableEggPx(w); p = [t[0], t[1]]; ang = 0.32 * Math.sin((t[2] - 6.0) * 1.3) + damp(w, 17.05, 0.12, 0.2, 0.3) + (w > 23.9 ? 0.5 * ramp(w, 23.9, 24.2) : 0); if (w > 24.0) p[1] += 6 * ramp(w, 24.0, 24.2); }
  else if (w < 24.31) { const a0 = tableEggPx(24.199), b = bowlAt(24.31); a0[1] += 6; p = arc(w, 24.2, 0.11, a0, [b[0], b[1] - 8]); ang = 0.5 + (w - 24.2) * 5; }
  else if (w < 27.88) { const b = bowlAt(w), t = w - 24.31, k1 = clampK(b[2] / 0.95, 0, 1), c = Math.cos(b[2]), sn = Math.sin(b[2]), ox = 34 * k1, oy = -8 - 8 * k1, wb = 3.5 * Math.exp(-t / 0.25) * Math.sin(TAU * t / 0.11); p = [b[0] + wb + ox * c - oy * sn, b[1] + ox * sn + oy * c]; ang = b[2] * 0.6 + 0.3 * Math.exp(-t / 0.3) * Math.sin(TAU * t / 0.13); layer = 'bowl'; sq = 1 - 0.1 * pulse(w, 24.33, 0.04); }
  else if (w < 28.22) { const b0 = bowlAt(27.88), c = Math.cos(b0[2]), sn = Math.sin(b0[2]), tg = px(28.6, POT.h - 1.3, POT.q); p = arc(w, 27.88, 0.34, [b0[0] + 34 * c + 8 * sn, b0[1] + 34 * sn - 16 * c], tg); ang = (w - 27.88) * 8; if (w > 28.12) layer = 'pot'; }
  else { const u = 28.6, bob = damp(w, 28.22, 1.6, 0.45, 0.55); p = px(u + 0.1 * Math.sin(w * 3), POT.h - 1.9 - bob * 0.35 + 0.18 * Math.sin(w * 2.4), POT.q + 1.6); layer = 'pot'; ang = 0.2 * Math.sin(w * 2.1) + 0.2; }
  return { p, ang, sq, layer, a };
}
function eggRest(w) { const t = headTop(w); return [t[0], t[1] - EGG_R - 3]; }
// ================================================================= samurai hands / expression (depends on the egg)
function samFinal(w) {
  const sm = samBase(w), st = sm.st, f = st.face, g = samGeom(st, w), S = SAMS, egg = eggAt(w), E = egg.p, hold = holdPx(w, sm);
  const sh1 = g.X(0.85, 0.5), sh2 = g.X(-0.85, 0.5);
  const idleB = g.X(-1.18, 1.02 + 0.03 * Math.sin(w * 2.1 + 1) + (st.walk != null ? 0.06 * Math.sin(st.walk) : 0)), idleF = g.X(1.18, 1.02 + 0.03 * Math.sin(w * 2.1));
  const L2 = (a, b, k) => [lerpK(a[0], b[0], k), lerpK(a[1], b[1], k)];
  let hands = null, look = [0.3, 0.1], wide = 0, closed = 0, sweat = 0, squeeze = 0;
  const holdF = [hold[0] - 3 * f, hold[1] + 19], holdOne = [holdF, idleB];                     // ONE hand carries the egg, the other arm hangs (reach limit ~0.72 S per arm)
  const up = [g.X(1.35, 0.1), g.X(-1.35, 0.1)], chest = [g.X(0.55, 0.6 + 0.02 * Math.sin(w * 17)), g.X(-0.55, 0.6 + 0.02 * Math.sin(w * 17 + 1))];
  if (w < 3.45) hands = holdOne;
  else if (w < 4.5) { let dip = 0; for (const tc of [3.45, 3.80, 4.12]) dip -= 7 * Math.exp(-Math.pow((w - tc) / 0.05, 2)); for (const tc of [3.80, 4.12, 4.50]) dip += 5 * Math.exp(-Math.pow((w - tc) / 0.06, 2)); hands = [[holdF[0], holdF[1] + dip], idleB]; }
  else if (w < 7.87) hands = holdOne;
  else if (w < 8.9) hands = [L2(holdF, up[0], ramp(w, 7.87, 8.0)), L2(idleB, up[1], ramp(w, 7.87, 8.0))];
  else if (w < 12.28) { const k = ramp(w, 8.9, 9.4); hands = [L2(up[0], chest[0], k), L2(up[1], chest[1], k)]; }
  else if (w < 12.45) { const k = ramp(w, 12.28, 12.45), gr = [[E[0] - 22 * f, E[1] + 6], g.X(-0.6, 0.15)]; hands = [L2(chest[0], gr[0], k), L2(chest[1], gr[1], k)]; }
  else if (w < 12.8) { const k = ramp(w, 12.45, 12.66); hands = [[E[0] + lerpK(-22 * f, -3 * f, k), E[1] + lerpK(6, 19, k)], L2(g.X(-0.6, 0.15), idleB, k)]; }
  else if (w < 17.05) hands = holdOne;
  else if (w < 17.5) { const k = ramp(w, 17.05, 17.25), wv = g.X(1.1, -0.02); const a = [wv[0] + (w > 17.3 ? 12 * Math.sin((w - 17.3) * 16) * f : 0), wv[1]]; hands = [L2(holdF, a, k), L2(idleB, g.X(-1.2, 0.35), k)]; }
  else if (w < 17.85 && w >= 17.5) { const k = ramp(w, 17.5, 17.85), wv = g.X(1.1, -0.02), a = [wv[0] + 12 * Math.sin((w - 17.3) * 16) * f * (1 - k), wv[1]]; hands = [L2(a, idleF, k), L2(g.X(-1.2, 0.35), idleB, k)]; }
  else if (w < 21.45) hands = null;
  else if (w < 23.88) { const rub = Math.sin(TAU * 2.4 * w), bp = bowlAt(w), ka = ramp(w, 21.45, 21.85); hands = [L2(idleF, [bp[0] - 0.36 * S * f + 9 * rub * ka * f, bp[1] + 0.12 * S + 4 * ka * Math.cos(TAU * 2.4 * w)], ka), L2(idleB, g.X(-1.1, 0.8), ka)]; }
  else { const b = bowlAt(w), c = Math.cos(b[2]), sn = Math.sin(b[2]), o = (x, y) => [b[0] + x * c - y * sn, b[1] + x * sn + y * c]; const kd = ramp(w, 23.88, 24.04), rubP = [b[0] - 0.36 * S * f + 9 * Math.sin(TAU * 2.4 * 23.88) * f, b[1] + 0.12 * S + 4 * Math.cos(TAU * 2.4 * 23.88)]; let F = (w < 25.0 && w >= 23.88) ? L2(rubP, [b[0] - 0.42 * S * f, b[1] + 24], kd) : (w < 25.7 && w >= 25.0) ? L2([b[0] - 0.42 * S * f, b[1] + 24], o(0, 46), ramp(w, 25.0, 25.7)) : o(0, 46);
    const Bk = (w >= 23.88 && w < 25.0) ? L2(g.X(-1.1, 0.8), [sh2[0] - 0.45 * S * f, sh2[1] - 0.4 * S], kd) : L2([sh2[0] - 0.45 * S * f, sh2[1] - 0.4 * S], idleB, ramp(w, 24.9, 25.4)); hands = [F, Bk]; }
  if (!hands && st.walk == null) hands = [g.X(1.18, 1.02 + 0.03 * Math.sin(w * 2.1)), g.X(-1.18, 1.02 + 0.03 * Math.sin(w * 2.1 + 1))];
  if (!hands) hands = [idleF, idleB];
  window._rawHands = hands;
  { const lim = 0.72 * S, cl = (hd, sh) => { const dx = hd[0] - sh[0], dy = hd[1] - sh[1], d = Math.hypot(dx, dy); return d > lim ? [sh[0] + dx * lim / d, sh[1] + dy * lim / d] : hd; }; hands = [cl(hands[0], sh1), cl(hands[1], sh2)]; }   // safety: an arm never stretches
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
  const sp = px(STOOL.u, STOOL.h + 0.1, STOOL.q), S = SAMS, GY = px(0, 0, SQ)[1], am = ramp(w, 21.6, 22.0);
  if (w < 23.88) return [sp[0] + 1.6 * am * Math.sin(TAU * 2.4 * w), sp[1], 0.04 * am * Math.sin(TAU * 2.4 * w + 1), 'rest'];     // polished where it stands (stool): one hand rubs, the bowl rocks
  const FBf = (ww) => { const s2 = samBase(ww), g2 = samGeom(s2.st, ww), sh = g2.X(0.85, 0.5); return [sh[0] + 1.08 * S * s2.st.face, GY - 38]; };
  const carry = (ww) => { const s2 = samBase(ww), g2 = samGeom(s2.st, ww), c = g2.X(1.15, 0.55); return [c[0], c[1]]; };
  const t = w - 24.3, wob = w > 24.3 ? 0.45 * Math.exp(-t / 0.18) * Math.sin(TAU * t / 0.09) : 0;
  if (w < 24.6) { const k = ramp(w, 23.88, 24.22), fb = FBf(w); return [lerpK(sp[0], fb[0], k), lerpK(sp[1], fb[1], k) - 22 * Math.sin(Math.PI * k), wob, 'fly']; }
  if (w < 25.55) { const k = ramp(w, 24.95, 25.55), a = FBf(24.6), b = carry(w); return [lerpK(a[0], b[0], k), lerpK(a[1], b[1], k) - 10 * Math.sin(Math.PI * k), wob, 'floor']; }
  const c = carry(w), k1 = ramp(w, 27.70, 27.88) * (1 - ramp(w, 27.92, 28.25)), f = samBase(w).st.face;
  return [c[0] + 0.2 * S * f * k1, c[1] - 0.3 * S * k1, 0.95 * f * k1, 'carry'];
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
  if (eg.layer === 'bowl') { ctx.save(); ctx.beginPath(); ctx.rect(b[0] - 400, b[1] - 400, 800, 400 + 6); ctx.clip(); drawEgg(ctx, eg.p[0], eg.p[1], eg.ang, eg.sq); ctx.restore(); }
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
