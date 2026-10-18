// anim.js — frame(t): pure function of t. MODE 'full' = the lit room + the REAL samurai and Mochi (no light, no shadows on the wall: light.py adds them);
// 'sam' / 'cat' = the SHADOW samurai / cat only (black-on-white mask pass, they move on their own); 'real' = the real characters only (mask to keep the wall shadow off them).
const { SQ, MQ, KS: KSp } = CUE, sst = CUE.sstep, clampK = CUE.clamp, lerpK = CUE.lerp;
const SAMS = 95, MOCS = 2.4, px = (u, h, q) => C.P(u, h, q);
const ramp = (w, a, b) => sst((w - a) / (b - a));
const pulse = (w, w0, d = 0.06) => Math.exp(-(((w - w0) / d) ** 2));
const lookTo = (face, from, to, ref = 150) => [clampK(face * (to[0] - from[0]) / ref, -1, 1), clampK((to[1] - from[1]) / ref, -1, 1)];
const ZOOM = 1.85, CAMY = 1401;
const toScr = (p) => [540 + (p[0] - 540) * ZOOM, 960 + (p[1] - CAMY) * ZOOM];
let MODE = 'full';
const BLINK = [0.9, 2.55, 4.25, 5.95, 8.7, 9.3], BLINKC = [1.7, 3.9, 5.3, 6.4, 8.45, 9.05];
const blinkK = (w, L) => Math.max(0, ...L.map((t) => pulse(w, t, 0.045)));
const lookUp = (face) => [-0.15 * face * face, -0.95];                       // the shadow is up and slightly behind them
// ================================================================= SAMURAI (real or shadow). face = 1 (looks right toward Mochi).
function samState(w, shadow, catPos) {
  const S = SAMS, u = shadow ? CUE.shu(w) : CUE.SAM_U, wk = shadow ? CUE.shuWalk(w) : null, v = shadow ? CUE.shuV(w) : 0, mv = !!wk;
  const cud = shadow ? KSp(CUE.CUDDLE, w) : 0, pk = shadow ? KSp(CUE.POKE, w) : 0, wv = shadow ? KSp(CUE.WAVE, w) : 0;
  let sy = 1 + 0.012 * Math.sin(w * 3.2), sxx = 1, rot = 0;
  if (!shadow) { rot = 0.07 * (ramp(w, 3.9, 4.2) * (1 - ramp(w, 4.5, 4.8))) + 0.07 * (ramp(w, 8.6, 8.9) * (1 - ramp(w, 9.1, 9.4))); }
  else { rot = 0.07 * (ramp(w, 3.9, 4.2) * (1 - ramp(w, 4.5, 4.8))) * (mv ? 0 : 1) + 0.07 * (ramp(w, 8.6, 8.9) * (1 - ramp(w, 9.1, 9.4))) * (mv ? 0 : 1) + 0.16 * cud + 0.05 * pk + (mv ? 0.05 * Math.sign(v) : 0); }
  const phase = wk ? wk.ph : 0, hop = mv ? 0.035 * Math.abs(Math.sin(phase)) : 0;
  // the poke is a HOP (he cannot stretch): crouch 2.62-2.81, flight 2.81-2.99 (apex 2.9, 0.7 S high), landing squash
  let hopPx = 0; if (shadow) { const fs = (w - 2.81) / 0.18; if (fs > 0 && fs < 1) hopPx = 0.7 * S * 4 * fs * (1 - fs);
    sy *= 1 - 0.12 * sst((w - 2.62) / 0.15) * (1 - sst((w - 2.80) / 0.015)) - 0.1 * (1 - sst((w - 2.99) / 0.13)) * (w > 2.99 ? 1 : 0); }
  sy += hop; const by = px(u, 0, SQ)[1] - hopPx;
  const st = { x: px(u, 0, SQ)[0], y: by - S * 1.58 * sy, S, face: 1, rot, sx: sxx, sy, sw: { mode: 'none' }, band: { a: 1, wind: 0.5 + 0.25 * Math.sin(w * 2.3) + (mv ? 1.4 : 0) }, ground: by, walk: mv ? phase : null };
  const g = samGeom(st, w);
  const sh1 = g.X(0.85, 0.5), sh2 = g.X(-0.85, 0.5), idle = (side) => g.X(side * 1.36, 0.88);
  let hands = [idle(1), idle(-1)];
  if (st.walk != null) { const q = Math.sin(st.walk) * wk.sp; hands = [g.X(1.36, 0.88 - q * 0.12), g.X(-1.36, 0.88 + q * 0.12)]; hands[0][0] -= q * S * 0.07; hands[1][0] += q * S * 0.07; }
  const toward = (hd, tgt, k) => [lerpK(hd[0], tgt[0], k), lerpK(hd[1], tgt[1], k)];
  let reach = 0;
  if (shadow && pk > 0 && catPos) { const t = catPos.cheek; hands[0] = toward(hands[0], t, pk); }
  if (shadow && cud > 0 && catPos) { const t = catPos.back, k = KSp(CUE.PAT, w); hands[0] = toward(hands[0], t, k); }
  if (shadow && wv > 0) { const t = g.X(1.15 + 0.12 * Math.sin(w * TAU * 2.6) * wv, 0.08); hands[0] = toward(hands[0], t, wv); }
  window._rawHands = [hands[0].slice(), hands[1].slice()]; window._shoulders = [sh1, sh2];
  { const lim = 0.72 * S, cl = (hd, sh) => { const dx = hd[0] - sh[0], dy = hd[1] - sh[1], d = Math.hypot(dx, dy); return d > lim ? [sh[0] + dx * lim / d, sh[1] + dy * lim / d] : hd; }; hands[0] = cl(hands[0], sh1); hands[1] = cl(hands[1], sh2); }
  // eyes (real only)
  let look = [0.6, 0], wide = 0, sweat = 0;
  if (!shadow) {
    const cp = px(CUE.MOC_U, 0, MQ), tgt = [cp[0], cp[1] - 190], up = KSp(CUE.LUS, w);
    const lc = lookTo(1, [st.x, st.y], tgt, 150), lu = lookUp(1);
    look = [lerpK(lc[0], lu[0], up), lerpK(lc[1], lu[1], up)]; wide = 0.9 * KSp(CUE.SURP_S, w);
    sweat = ramp(w, 7.4, 7.7) * (1 - ramp(w, 8.6, 9.0)) + ramp(w, 9.85, 9.95);
  }
  st.sweat = sweat; const closed = blinkK(w, BLINK) * (wide > 0.3 ? 0 : 1);
  return { st, hands, ey: { open: 1, look, wide, closed, squeeze: closed }, u, sh1 };
}
// ================================================================= MOCHI (sits facing left; real or shadow)
function catState(w, shadow) {
  const u = CUE.MOC_U, [x0, y0] = px(u, 0, MQ), pose = clonePose(P_SIT);
  pose.tl = [-12, 28, 3.05, 0.7, 0.8, 0];                                                    // approved sit tail
  const e = { open: 1, look: [0.5, 0], dil: 0.5, sparkle: 1, wide: 0 }, mouth = { open: 0 };
  let hTilt = 0, earTw = 0.3 * (pulse(w, 1.9, 0.1) + pulse(w, 5.9, 0.1) + pulse(w, 2.95, 0.12) * 2 + pulse(w, 7.15, 0.12) * 2 + pulse(w, 9.78, 0.1) * 2), tailWig = 0.35, blush = 0.45;
  const sc = KSp(CUE.SURP_C, w), cur = ramp(w, 3.6, 3.9) * (1 - ramp(w, 4.4, 4.7)) + ramp(w, 8.4, 8.7) * (1 - ramp(w, 9.0, 9.3));
  hTilt += -0.18 * sc + 0.1 * cur; pose.h[1] -= 0.8 * sc;
  if (shadow) {
    const rc = KSp(CUE.RECOIL, w), cud = KSp(CUE.CUDDLE, w);
    hTilt += -0.3 * rc + 0.2 * cud + 0.03 * Math.sin(w * 2.2) * cud; pose.h[0] += 1.5 * rc - 1.3 * cud; pose.h[1] += 1.2 * cud;
    tailWig = 0.35 + 0.6 * cud;
  } else {
    const lu = KSp(CUE.LUC, w), sp = px(CUE.SAM_U, 0, SQ), tgt = [sp[0], sp[1] - 150], lc = lookTo(-1, [x0, y0 - 190], tgt, 140), lk = lookUp(-1);
    e.look = [lerpK(lc[0], lk[0], lu), lerpK(lc[1], lk[1], lu)]; e.wide = 0.6 * sc; tailWig = 0.35 + 0.5 * sc;
    const b = blinkK(w, BLINKC) * (sc > 0.3 ? 0 : 1); if (b > 0.5) e.sleep = 1;
  }
  pose.h[2] += hTilt;
  return { mouth, face: -1, kind: 'kit', col: ORG.k1, sd: 3, rot: 0, x: x0, y: y0, s: MOCS, pose, sy: 1, sx: 1, e, tailWig, tailPh: TAU * w * 1.2, breath: 0.022 * Math.sin(w * 3.0), earTw, blush, hTilt: 0, pro: 'sit', raise: 0, _mode: 'sit' };
}
// where the samurai shadow's hand goes: the cat shadow's cheek (toward him, left side of her face) and her back/head top for the pat
function catSpots(w) {
  const cat = catState(w, true), cg = catGeom(cat, w);
  return { cheek: cg.HX(6 + 17, 6), back: cg.HX(6 + 16, 34) };
}
// ================================================================= frame
function softFloor(c, w) { softShadow(c, CUE.SAM_U, SQ + 0.4, 9, 3.0, 0.3); softShadow(c, CUE.MOC_U, MQ + 0.4, 10.5, 3.2, 0.3); }
var frame = function (t) {
  const w = t;
  if (!window._neutral) { GRAIN.getContext('2d').fillStyle = '#fff'; GRAIN.getContext('2d').fillRect(0, 0, W, H); for (const cv of [FIB, VIG]) cv.getContext('2d').clearRect(0, 0, W, H); window._neutral = true; }
  const p = PAPER.getContext('2d'); p.setTransform(1, 0, 0, 1, 0, 0); p.globalCompositeOperation = 'source-over'; p.globalAlpha = 1; p.fillStyle = MODE === 'full' ? '#f1e9d8' : '#ffffff'; p.fillRect(0, 0, W, H);
  CAMNOW = [540, CAMY, ZOOM];
  const drawSam = (c, sf) => { samLegs(c, sf.st, w); samInk(c, sf.st, w, MODE === 'full' || MODE === 'real' ? 0.5 : 0); samArms(c, sf.st, w, sf.hands); };
  if (MODE === 'sam') { const sf = samState(w, true, catSpots(w)); composeFrame(CAMNOW, { noHalo: true, pre: () => {}, chars: (c) => drawSam(c, sf), over: (c) => samOver(c, sf.st, w) }); return; }
  if (MODE === 'cat') { composeFrame(CAMNOW, { noHalo: true, pre: () => {}, chars: (c) => drawCat(c, catState(w, true), w), over: () => {} }); return; }
  const sf = samState(w, false, null), cat = catState(w, false);
  composeFrame(CAMNOW, { noHalo: true,
    pre: (c) => { if (MODE === 'full') { drawWall(c); drawFloor(c); drawLantern(c); softFloor(c, w); } },
    chars: (c) => { drawSam(c, sf); drawCat(c, cat, w); },
    over: (c) => { samOver(c, sf.st, w); if (MODE === 'full') samEyes(c, sf.st, w, sf.ey, sf.ey); } });
};
window.grabLayer = (t, mode) => { MODE = mode; frame(t); return document.getElementById('c').toDataURL('image/png'); };
// ================================================================= info(t): numbers light.py needs (screen px)
function infoObj(t) {
  const w = t, sf = samState(w, false, null), st = sf.st, g = samGeom(st, w), cat = catState(w, false), cg = catGeom(cat, w), K = cg.K, hs = cg.hs, s = cat.s;
  const eyes = [], rx = 0.22 * SAMS * Math.abs(st.sx), ry = 0.27 * SAMS * st.sy, e = sf.ey;
  for (const pp_ of [g.X(-0.16, 0.26), g.X(0.46, 0.26)]) { const c = toScr(pp_); eyes.push({ x: c[0], y: c[1], rx: rx * ZOOM, ry: ry * ZOOM }); }
  const L = lanternBox(), lc = toScr([L.cx, L.base - L.h * 0.5]), lamp = toScr([L.cx, L.base - 7 * C.S]);
  return { t, lamp: { x: lamp[0], y: lamp[1] }, lant: { x: lc[0], y: lc[1], hw: L.hw * ZOOM, h: L.h * ZOOM }, wallY: toScr([0, WALL_Y])[1], unit: C.S * ZOOM,
    footS: toScr(px(0, 0, SQ))[1], footC: toScr(px(0, 0, MQ))[1], K: CUE.K_WALL, qw: CUE.QW, ql: CUE.LANT.q, qs: SQ, qc: MQ, zq: C.DQ * C.S * ZOOM, y0: toScr([0, C.Y0])[1], zoom: ZOOM, sweat: st.sweat, flick: 1 };
}
window.info = (t) => JSON.stringify(infoObj(t));
