// anim.js — frame(t): pure function of t. MODE: 'full' = scene + both real characters (no light/dust: light.py adds them); 'real' / 'realS' / 'realM' = characters only on white (masks); 'fenceM' = the fence boards only (black on white) so light.py keeps shadows/dust of things behind the fence off the boards.
const { KS: KSp } = CUE, sst = CUE.sstep, clampK = CUE.clamp, lerpK = CUE.lerp;
const SAMS = 95, MOCS = 2.4, px = (u, h, q) => C.P(u, h, q);
const ramp_ = (w, a, b) => sst((w - a) / (b - a));
const pulse = (w, w0, d = 0.06) => Math.exp(-(((w - w0) / d) ** 2));
const lookTo = (face, from, to, ref = 150) => [clampK(face * (to[0] - from[0]) / ref, -1, 1), clampK((to[1] - from[1]) / ref, -1, 1)];
const ZOOM = 1.9, CAMX = 473, CAMY = 1300;
const toScr = (p) => [540 + (p[0] - CAMX) * ZOOM, 960 + (p[1] - CAMY) * ZOOM];
let MODE = 'full';
const blinkK = (w, L) => Math.max(0, ...L.map((t) => pulse(w, t, 0.045)));
const dmp = (d, k, f) => (d < 0 ? 0 : Math.exp(-d * k) * Math.cos(d * f));
// ================================================================= SAMURAI (face = 1 always)
function samState(w) {
  const s = CUE.sam(w), S = SAMS, m = CUE.moc(w), [x, yf] = px(s.u, 0, s.q);
  let sy = 1 + 0.012 * Math.sin(w * 3.2), sx = 1, rot = 0, walk = null, ph = s.ph, k = s.k, closed = 0, wide = 0;
  if (ph === 'walk') { walk = s.wph; sy += 0.03 * Math.abs(Math.sin(walk)); rot = 0.035; }
  if (ph === 'push') { rot = 0.12 * sst(k); sy *= 1 - 0.03 * sst(k); }
  if (ph === 'bonk') { const d = k; sx = 1 + 0.2 * dmp(d, 11, 30); sy = 1 - 0.14 * dmp(d, 11, 30); rot = -0.13 * Math.exp(-d * 8) + 0.0; closed = d < 0.15 ? 1 : 0; wide = d > 0.15 ? 0.7 * Math.exp(-(d - 0.15) * 3) : 0; }
  if (ph === 'think') { const e = Math.min(1, k * 3, (1 - k) * 3); rot = 0.05 * Math.sin((w - CUE.T_RB) * 22) * e; }
  if (ph === 'inhale') { sx = 1 + 0.12 * sst(k); sy = 1 + 0.07 * sst(k); }
  if (ph === 'compress') { sx = lerpK(1.12, 0.42, sst(k)); sy = lerpK(1.07, 1.3, sst(k)); closed = 1; }
  if (ph === 'squeeze') { sx = 0.42 + 0.025 * Math.sin(w * 34); sy = 1.3 + 0.02 * Math.sin(w * 29); closed = 1; }
  if (ph === 'pop') { const d = k * 0.5; sx = 1 + (0.42 - 1) * dmp(d, 13, 28); sy = 1 + 0.3 * dmp(d, 13, 28); closed = d < 0.06 ? 1 : 0; wide = 0.8 * Math.exp(-d * 4); }
  const cy = yf - S * 1.58 * sy;
  const st = { x, y: cy, S, face: 1, rot, sx, sy, sw: { mode: 'none' }, band: { a: 1, wind: 0.5 + 0.25 * Math.sin(w * 2.3) + (ph === 'squeeze' ? 1.2 : 0) + (ph === 'walk' ? 0.6 : 0) }, ground: yf, walk };
  const g = samGeom(st, w);
  let hands = [g.X(1.36, 0.88), g.X(-1.36, 0.88)];
  if (walk != null) { const q = Math.sin(walk) * 0.7; hands = [g.X(1.36, 0.88 - q * 0.05), g.X(-1.36, 0.88 + q * 0.05)]; hands[0][0] -= q * S * 0.03; hands[1][0] += q * S * 0.03; }
  const toward = (a, b, kk) => [lerpK(a[0], b[0], kk), lerpK(a[1], b[1], kk)];
  const lift = Math.max(ph === 'pop' ? sst(Math.min(1, k / 0.08)) * Math.exp(-k * 6) : 0, ph === 'bonk' ? sst(Math.min(1, k / 0.07)) * Math.exp(-k * 4) : 0, ph === 'inhale' ? sst(k) : 0, ph === 'compress' ? 1 - sst(k) : 0);   // arms lift a little with the puff / bump
  if (lift > 0) { hands[0] = toward(hands[0], g.X(1.3, 0.35), lift); hands[1] = toward(hands[1], g.X(-1.3, 0.35), lift); }
  const sh1 = g.X(0.85, 0.5), sh2 = g.X(-0.85, 0.5); window._rawHands = [hands[0].slice(), hands[1].slice()]; window._shoulders = [sh1, sh2];
  { const lim = 0.72 * S, c2 = (hd, sh) => { const dx = hd[0] - sh[0], dy = hd[1] - sh[1], d = Math.hypot(dx, dy); return d > lim ? [sh[0] + dx * lim / d, sh[1] + dy * lim / d] : hd; }; hands[0] = c2(hands[0], sh1); hands[1] = c2(hands[1], sh2); }
  // eyes: ball until it stops and while he squeezes through, Mochi in between and at the end
  const b = CUE.ballPos(w), toBall = px(b.u, b.h, b.q), toMoc = px(m.u, m.h + 7, m.q);
  const useBall = w < 3.1 || (w >= CUE.T_INH && w < CUE.HF0 + 0.1), tgt = useBall ? toBall : toMoc, look = lookTo(1, [st.x, st.y], tgt, 190);
  wide = Math.max(wide, 0.8 * pulse(w, 2.7, 0.18), 0.5 * pulse(w, CUE.HF0 + 0.25, 0.2));
  const flat = ramp_(w, 8.4, 8.7) * 0.45;                                                  // half-lidded stare at the end
  const cl = Math.max(closed, blinkK(w, CUE.BLINK) * (wide > 0.3 ? 0 : 1), flat * (blinkK(w, [9.2]) < 0.5 ? 1 : 0.2));
  st.sweat = Math.max(pulse(w, CUE.T_RB + 0.3, 0.35) * 0.8, ramp_(w, 8.5, 8.8) * 0.7);
  return { st, hands, ey: { open: 1, look, wide, closed: cl, squeeze: cl }, u: s.u, s };
}
// ================================================================= MOCHI (sits all the time: pro 'sit'; swat lunge, hop to the fence top)
const TLT = [-12, 28, 3.05, 0.7, 0.8, 0];
function catState(w) {
  const m = CUE.moc(w), sm = CUE.sam(w), b = CUE.ballPos(w); const [x00, y00] = px(m.u, m.h, m.q); let x0 = x00, rot = 0, sy = 1, sx = 1;
  let pose = mixPose(P_STAND, P_SIT, 1); pose.tl = TLT.slice();
  const e = { open: 1, look: [0, 0], dil: 0.5, sparkle: 1, wide: 0 }, mouth = { open: 0 };
  const hot = m.ph === 'wind' ? m.wind : 0;
  if (m.ph === 'wind') { rot = -0.09 * m.k; sy = 1 - 0.04 * m.k; x0 -= 8 * m.k; }
  if (m.ph === 'lunge') { rot = 0.16 * m.lun - 0.09 * m.wind; x0 += 26 * m.lun; sy = 1 + 0.03 * m.lun; sx = 1 - 0.03 * m.lun; }
  if (m.mode === 'hop') { if (m.ph === 'crouch') { sy = 1 - 0.16 * sst(m.k); sx = 1 + 0.08 * sst(m.k); } else { sy = 1 + 0.1 * Math.sin(Math.PI * m.k); rot = 0.22 * Math.sin(Math.PI * Math.min(1, m.k * 1.5)) * (m.k < 0.6 ? 1 : -0.5); pose.L.FN[3] -= 5; pose.L.HN[3] -= 5; } }
  if (m.ph === 'land') { const d = (w - CUE.HF1); sy = 1 - 0.14 * Math.exp(-d * 12) * Math.cos(d * 26); sx = 1 + 0.07 * Math.exp(-d * 12) * Math.cos(d * 26); mouth.open = 0.6 * pulse(w, CUE.HF1 + 0.55, 0.14); }
  const toBall = px(b.u, b.h, b.q), toSam = px(sm.u, 10, sm.q);
  const tgt = w < 3.0 ? toBall : toSam; e.look = lookTo(1, [x0, y00 - 150], tgt, 170);
  e.wide = 0.8 * Math.max(pulse(w, 2.0, 0.4), pulse(w, CUE.T_BONK + 0.1, 0.25), pulse(w, CUE.T_POP + 0.15, 0.25) * 0.8, ramp_(w, 8.9, 9.0) * (1 - ramp_(w, 9.3, 9.4)) * 0.0);
  if (w > 8.5) e.open = 0.78;
  const bl = blinkK(w, CUE.BLINKC) * (e.wide > 0.3 ? 0 : 1); if (bl > 0.5) e.sleep = 1;
  const earTw = 0.3 * (pulse(w, 1.75, 0.1) + pulse(w, CUE.TS, 0.1) * 2 + pulse(w, CUE.T_BONK, 0.1) * 3 + pulse(w, CUE.T_POP, 0.1) * 2);
  pose.h[2] += 0.06 * Math.sin(w * 1.3);
  return { mouth, face: 1, kind: 'kit', col: ORG.k1, sd: 3, rot, x: x0, y: y00, s: MOCS, pose, sy, sx, e, tailWig: 0.35 + 0.9 * Math.max(pulse(w, 2.2, 0.5), ramp_(w, 8.2, 8.5)), tailPh: TAU * w * 1.2, breath: 0.022 * Math.sin(w * 3.0), earTw, blush: 0.5, hTilt: 0, pro: 'sit', _m: m };
}
// ================================================================= frame
function softFloor(c, w) {
  const s = CUE.sam(w), m = CUE.moc(w);
  softShadow(c, s.u, s.q + 0.3, 6.5 * (s.ph === 'squeeze' ? 0.45 : 1), 2.2, 0.3, 0);
  if (m.h < 0.3) softShadow(c, m.u, m.q + 0.3, 8, 2.6, 0.3, 0);
  ballShadow(c, w);
}
var frame = function (t) {
  const w = t;
  if (!window._neutral) { GRAIN.getContext('2d').fillStyle = '#fff'; GRAIN.getContext('2d').fillRect(0, 0, W, H); for (const cv of [FIB, VIG]) cv.getContext('2d').clearRect(0, 0, W, H); window._neutral = true; }
  const p = PAPER.getContext('2d'); p.setTransform(1, 0, 0, 1, 0, 0); p.globalCompositeOperation = 'source-over'; p.globalAlpha = 1; p.fillStyle = MODE === 'full' ? '#f1e9d8' : '#ffffff'; p.fillRect(0, 0, W, H);
  CAMNOW = [CAMX, CAMY, ZOOM];
  const sf = samState(w), cat = catState(w), sBehind = CUE.sam(w).q < CUE.QF, bBehind = CUE.ballPos(w).q < CUE.QF;
  const wrapS = (c, fn) => sBehind ? behindFence(c, fn) : fn();
  composeFrame(CAMNOW, { noHalo: true,
    pre: (c) => {
      if (MODE === 'fenceM') { c.fillStyle = '#000'; for (const P of fencePolys()) { c.beginPath(); P.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.fill(); } return; }
      if (MODE !== 'full') return;
      drawSky(c, w); drawGround(c); softFloor(c, w); drawFence(c);
      (bBehind ? behindFence : (cc, fn) => fn())(c, () => drawBall(c, w));
    },
    chars: (c) => { if (MODE === 'fenceM') return; if (MODE !== 'realM') wrapS(c, () => { samLegs(c, sf.st, w); samInk(c, sf.st, w, 0.5); samArms(c, sf.st, w, sf.hands); }); if (MODE !== 'realS') drawCat(c, cat, w); },
    over: (c) => { if (MODE !== 'realM' && MODE !== 'fenceM') wrapS(c, () => { samOver(c, sf.st, w); if (MODE === 'full' || MODE === 'real' || MODE === 'realS') samEyes(c, sf.st, w, sf.ey, sf.ey); }); } });
};
window.grabLayer = (t, mode) => { MODE = mode; frame(t); return document.getElementById('c').toDataURL('image/png'); };
window.grab = (t) => window.grabLayer(t, 'full');
function infoObj(t) {
  const w = t, s = CUE.sam(w), m = CUE.moc(w), a = toScr(px(s.u, 0, s.q)), b = toScr(px(m.u, 0, m.q));
  return { t, unit: C.S * ZOOM, zoom: ZOOM, samX: a[0], samG: a[1], mocX: b[0], mocG: b[1], samH: 0, mocH: m.h * C.S * ZOOM, horizon: toScr([0, WALL_Y])[1] };
}
window.info = (t) => JSON.stringify(infoObj(t));
window.tab = () => ({ puffs: CUE.PUFFS.map(([t, u, h, q, k]) => { const s = toScr(px(u, h, q)); return [t, +s[0].toFixed(1), +s[1].toFixed(1), k, q < CUE.QF ? 1 : 0]; }), unit: C.S * ZOOM });
