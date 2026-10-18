// anim.js — frame(t): pure function of t. MODE: 'full' = scene + both real characters (no light/dust: light.py adds them); 'real' / 'realS' / 'realM' = characters only on white (masks for rim light + shadows).
const { QT, KS: KSp } = CUE, sst = CUE.sstep, clampK = CUE.clamp, lerpK = CUE.lerp;
const SAMS = 95, MOCS = 2.4, px = (u, h, q) => C.P(u, h, q);
const ramp_ = (w, a, b) => sst((w - a) / (b - a));
const pulse = (w, w0, d = 0.06) => Math.exp(-(((w - w0) / d) ** 2));
const lookTo = (face, from, to, ref = 150) => [clampK(face * (to[0] - from[0]) / ref, -1, 1), clampK((to[1] - from[1]) / ref, -1, 1)];
const ZOOM = 1.5, CAMX = 506, CAMY = 1178;
const toScr = (p) => [540 + (p[0] - CAMX) * ZOOM, 960 + (p[1] - CAMY) * ZOOM];
let MODE = 'full';
const blinkK = (w, L) => Math.max(0, ...L.map((t) => pulse(w, t, 0.045)));
const TIMPACT = [CUE.T_SL1, CUE.T_MSL1];
const impact = (w, d = 0.14) => Math.max(...TIMPACT.map((t) => (w >= t && w < t + d) ? 1 : 0));
const decay = (w, t0, k = 9, f = 32) => (w < t0 ? 0 : Math.exp(-(w - t0) * k) * Math.cos((w - t0) * f));
// ================================================================= SAMURAI (face = 1)
function samState(w) {
  const s = CUE.sam(w), S = SAMS, m = CUE.moc(w), [x, yf] = px(s.u, s.h, s.q);
  let sy = 1 + 0.012 * Math.sin(w * 3.2), sx = 1, rot = 0, cx = x, cy = null, walk = null, up = 0, back = 0;
  if (s.mode === 'hop') {
    if (s.ph === 'crouch') { const k = sst(s.k); sy = 1 - 0.2 * k; sx = 1 + 0.1 * k; back = k; }
    else if (s.ph === 'fly') { sy = 1 + 0.1 * Math.sin(Math.PI * s.k); sx = 1 - 0.04; const a_ = sst(Math.min(1, s.k / 0.3)); up = a_; back = 1 - a_; }
    else { sy = 1 - 0.15 * (1 - s.k); sx = 1 + 0.07 * (1 - s.k); up = 1 - sst(s.k); }
  }
  if (s.ph === 'crouch' && s.mode === 'stand') { const k = sst(s.k); sy = 1 - 0.17 * k; sx = 1 + 0.08 * k; back = k; }
  if (s.mode === 'slide') { rot = -0.5 * s.slope; sx = 0.97; up = 1; sy = 0.96; { const a_ = sst(Math.min(1, Math.max(0, (w - CUE.T_SL0) / 0.15))); up = a_; back = 1 - a_; } const n = [-Math.sin(s.slope), -Math.cos(s.slope)]; cx = x + n[0] * S * 1.1; cy = yf + n[1] * S * 1.1; }
  if (s.ph === 'bump') { const d = (w - (s.u > 10 ? CUE.T_MSL1 : CUE.T_SL1)); sx = 1 - 0.22 * Math.exp(-d * 13) * Math.cos(d * 34); sy = 1 + 0.12 * Math.exp(-d * 13) * Math.cos(d * 34); rot = 0.1 * Math.exp(-d * 10) * (s.u > 10 ? 1 : -1); }
  if (s.walk) { walk = Math.PI * 3 * s.wk; sy += 0.03 * Math.abs(Math.sin(walk)); }
  { const a_ = 0.6 * sst(Math.min(1, Math.max(0, (w - CUE.T_DN0) / 0.08))) * (1 - sst(Math.min(1, Math.max(0, (w - CUE.T_DN1) / 0.12)))); up = Math.max(up, a_); }
  if (cy == null) cy = yf - S * 1.58 * sy;
  const st = { x: cx, y: cy, S, face: 1, rot, sx, sy, sw: { mode: 'none' }, band: { a: 1, wind: 0.5 + 0.25 * Math.sin(w * 2.3) + (s.mode === 'slide' ? 1.8 : 0) + (s.mode === 'hop' && s.ph === 'fly' ? 1.0 : 0) }, ground: yf, walk };
  const g = samGeom(st, w);
  let hands = [g.X(1.36, 0.88), g.X(-1.36, 0.88)];
  if (walk != null) { const q = Math.sin(walk) * 0.7; hands = [g.X(1.36, 0.88 - q * 0.05), g.X(-1.36, 0.88 + q * 0.05)]; hands[0][0] -= q * S * 0.03; hands[1][0] += q * S * 0.03; }
  const toward = (a, b, k) => [lerpK(a[0], b[0], k), lerpK(a[1], b[1], k)];
  if (up > 0) { hands[0] = toward(hands[0], g.X(1.3, 0.0), up); hands[1] = toward(hands[1], g.X(-1.3, 0.0), up); }
  if (back > 0) { hands[0] = toward(hands[0], g.X(1.0, 1.1), back); hands[1] = toward(hands[1], g.X(-1.0, 1.1), back); }
  const sh1 = g.X(0.85, 0.5), sh2 = g.X(-0.85, 0.5); window._rawHands = [hands[0].slice(), hands[1].slice()]; window._shoulders = [sh1, sh2];
  { const lim = 0.72 * S, c2 = (hd, sh) => { const dx = hd[0] - sh[0], dy = hd[1] - sh[1], d = Math.hypot(dx, dy); return d > lim ? [sh[0] + dx * lim / d, sh[1] + dy * lim / d] : hd; }; hands[0] = c2(hands[0], sh1); hands[1] = c2(hands[1], sh2); }
  // eyes: always on Mochi's head (looks back over his 'shoulder' when she is on his left; eyes only, he never turns)
  const tgt = px(m.u, m.h + 9, m.q), look = lookTo(1, [st.x, st.y], tgt, 170);
  const squeeze = Math.max(impact(w, 0.14), (w >= CUE.T_DN0 && w < CUE.T_DN0 + 0.1) ? 0 : 0);
  const wide = 0.8 * Math.max(ramp_(w, CUE.T_SL0 - 0.05, CUE.T_SL0 + 0.1) * (1 - ramp_(w, CUE.T_SL1 - 0.02, CUE.T_SL1)), ramp_(w, CUE.T_MSL1 + 0.12, CUE.T_MSL1 + 0.2) * (1 - ramp_(w, CUE.T_MSL1 + 0.8, CUE.T_MSL1 + 0.95)), ramp_(w, 8.2, 8.4) * (1 - ramp_(w, 8.6, 8.7)));
  const closed = Math.max(squeeze, blinkK(w, CUE.BLINK) * (wide > 0.3 ? 0 : 1));
  st.sweat = pulse(w, CUE.T_SL1 + 0.5, 0.3) * 0.8;
  return { st, hands, ey: { open: 1, look, wide, closed, squeeze: closed }, u: s.u, s };
}
// ================================================================= MOCHI (sit pose with pro:'sit'; trots with walkPose; hops; slides sitting)
const TLS = [-31, -6, -2.35, 1.1, 1, 0], TLT = [-12, 28, 3.05, 0.7, 0.8, 0];
function catState(w) {
  const m = CUE.moc(w), sm = CUE.sam(w); const [x0, y00] = px(m.u, m.h, m.q); let y0 = y00, rot = 0, sy = 1, sx = 1;
  const trot = m.mode === 'trot' || m.mode === 'turn' || m.mode === 'hop' || m.mode === 'stand';
  let sitK = 1; if (w >= CUE.T_TROT0 - 0.25 && w < 8.0) sitK = 1 - ramp_(w, CUE.T_TROT0 - 0.25, CUE.T_TROT0); if (w >= 8.0) sitK = ramp_(w, 8.0, 8.25); if (w >= CUE.T_TROT0 && w < 8.0) sitK = 0;
  let pose = mixPose(P_STAND, P_SIT, sitK); pose.tl = TLS.map((v, i) => lerpK(v, TLT[i], sitK));
  if (m.mode === 'trot') { const ph = 2 * Math.PI * (CUE.MU0 - m.u) / 7.62; pose = walkPose(P_STAND, ph); pose.tl = TLS.slice(); }
  const pro = sitK > 0.5 ? 'sit' : undefined, e = { open: 1, look: [0, 0], dil: 0.5, sparkle: 1, wide: 0 }, mouth = { open: 0 };
  const tgt = px(sm.u, sm.h + 9, sm.q);
  let face = m.face;
  if (m.mode === 'hop') { if (m.ph === 'crouch') { sy = 1 - 0.16 * sst(m.k); sx = 1 + 0.08 * sst(m.k); } else if (m.ph === 'fly') { sy = 1 + 0.1 * Math.sin(Math.PI * m.k); rot = -0.25 * (m.k < 0.5 ? 1 : -0.7) * Math.sin(Math.PI * Math.min(1, m.k * 2)) * (face > 0 ? -1 : 1); pose.L.FN[3] -= 5; pose.L.HN[3] -= 5; } else { sy = 1 - 0.14 * (1 - m.k); sx = 1 + 0.07 * (1 - m.k); } }
  if (m.mode === 'turn') { sx = Math.max(0.12, Math.abs(Math.cos(Math.PI * m.k))); }
  if (m.mode === 'slide') { rot = 0.45 * m.slope * (face > 0 ? 1 : -1) * -1; const n = [-Math.sin(m.slope), -Math.cos(m.slope)]; y0 = y00 + n[1] * 4; }
  const hit = impact(w, 0.5);
  if (m.ph === 'bumped') { const d = w - (m.u > 10 || m.u < 6 && w < 6 ? CUE.T_SL1 : CUE.T_MSL1); const dd = w < 6 ? w - CUE.T_SL1 : w - CUE.T_MSL1; sx = 1 - 0.2 * Math.exp(-dd * 12) * Math.cos(dd * 32); sy = 1 + 0.1 * Math.exp(-dd * 12) * Math.cos(dd * 32); mouth.open = 0.7 * pulse(w, (w < 6 ? CUE.T_SL1 : CUE.T_MSL1) + 0.1, 0.12); }
  const lc = lookTo(face, [x0, y0 - 190], m.mode === 'trot' ? [x0 - 300, y0 - 190] : tgt, 150); e.look = lc;
  e.wide = 0.8 * Math.max(ramp_(w, CUE.T_SL0, CUE.T_SL1 - 0.05) * (1 - ramp_(w, CUE.T_SL1 + 0.3, CUE.T_SL1 + 0.7)), m.mode === 'slide' ? 1 : 0, ramp_(w, CUE.T_MSL1, CUE.T_MSL1 + 0.05) * (1 - ramp_(w, CUE.T_MSL1 + 0.6, CUE.T_MSL1 + 1.0)));
  if (w > 4.3 && w < 5.6) { e.open = 0.6; }                                                // annoyed half-lids after the bump
  const b = blinkK(w, CUE.BLINKC) * (e.wide > 0.3 ? 0 : 1); if (b > 0.5) e.sleep = 1;
  const earTw = 0.3 * (pulse(w, 1.4, 0.1) + pulse(w, 2.2, 0.1) * 2 + pulse(w, CUE.T_SL1, 0.1) * 3 + pulse(w, 9.0, 0.1));
  pose.h[2] += 0.06 * Math.sin(w * 1.3) * (sitK > 0.5 ? 1 : 0.3);
  if (sitK > 0.5 && w > 4.3 && w < 4.6) pose.h[2] += 0.12;
  return { mouth, face, kind: 'kit', col: ORG.k1, sd: 3, rot, x: x0, y: y0, s: MOCS, pose, sy, sx, e, tailWig: 0.35 + 0.8 * (m.mode === 'trot' ? 0.6 : 0) + 0.8 * (w > 4.3 && w < 5.5 ? 1 : 0), tailPh: TAU * w * 1.2, breath: 0.022 * Math.sin(w * 3.0), earTw, blush: 0.5, hTilt: 0, pro, _m: m };
}
// ================================================================= frame
function softFloor(c, w) {
  const s = CUE.sam(w), m = CUE.moc(w), k = (h) => 1 / (1 + Math.max(0, h) / 6);
  softShadow(c, s.u, s.q + 0.3, 6, 2.2, 0.3 * k(s.mode === 'hop' || s.mode === 'slide' ? 4 : 0), 0); softShadow(c, m.u, m.q + 0.3, 8, 2.6, 0.3 * k(m.mode === 'hop' || m.mode === 'slide' ? 4 : 0), 0);
  if (s.h > 0.05 && s.mode === 'stand') softShadow(c, s.u, s.q, 5, 2, 0.28, s.h); if (m.h > 0.05 && m.mode !== 'hop' && m.mode !== 'slide') softShadow(c, m.u, m.q, 7, 2.4, 0.28, m.h);
}
var frame = function (t) {
  const w = t;
  if (!window._neutral) { GRAIN.getContext('2d').fillStyle = '#fff'; GRAIN.getContext('2d').fillRect(0, 0, W, H); for (const cv of [FIB, VIG]) cv.getContext('2d').clearRect(0, 0, W, H); window._neutral = true; }
  const p = PAPER.getContext('2d'); p.setTransform(1, 0, 0, 1, 0, 0); p.globalCompositeOperation = 'source-over'; p.globalAlpha = 1; p.fillStyle = MODE === 'full' ? '#f1e9d8' : '#ffffff'; p.fillRect(0, 0, W, H);
  CAMNOW = [CAMX, CAMY, ZOOM];
  const sf = samState(w), cat = catState(w);
  composeFrame(CAMNOW, { noHalo: true,
    pre: (c) => { if (MODE === 'full') { drawStatic(c, w); structShadows(c); slideBack(c); steps(c); ramp(c); drawBucket(c); softFloor(c, w); } },
    chars: (c) => { if (MODE !== 'realM') { samLegs(c, sf.st, w); samInk(c, sf.st, w, 0.5); samArms(c, sf.st, w, sf.hands); } if (MODE !== 'realS') drawCat(c, cat, w); },
    over: (c) => { if (MODE !== 'realM') { samOver(c, sf.st, w); if (MODE === 'full' || MODE === 'real' || MODE === 'realS') samEyes(c, sf.st, w, sf.ey, sf.ey); } } });
};
window.grabLayer = (t, mode) => { MODE = mode; frame(t); return document.getElementById('c').toDataURL('image/png'); };
window.grab = (t) => window.grabLayer(t, 'full');
// info(t): numbers light.py needs (screen px)
function infoObj(t) {
  const w = t, s = CUE.sam(w), m = CUE.moc(w), a = toScr(px(s.u, 0, s.q)), b = toScr(px(m.u, 0, m.q));
  return { t, unit: C.S * ZOOM, zoom: ZOOM, samX: a[0], samG: a[1], mocX: b[0], mocG: b[1], samH: s.h * C.S * ZOOM, mocH: m.h * C.S * ZOOM, horizon: toScr([0, WALL_Y])[1] };
}
window.info = (t) => JSON.stringify(infoObj(t));
window.tab = () => ({ puffs: CUE.PUFFS.map(([t, u, h, q, k]) => { const s = toScr(px(u, h, q)); return [t, +s[0].toFixed(1), +s[1].toFixed(1), k]; }), unit: C.S * ZOOM });
