// anim.js — frame(t): pure function of t. Draws the LIT room + both characters (no flame, no darkness). light.py adds the flame, the light map, ember, smoke and eye glow from `info(t)`.
const { SQ, MQ, KS: KSp } = CUE, sst = CUE.sstep, clampK = CUE.clamp, lerpK = CUE.lerp;
const SAMS = 95, MOCS = 2.4, px = (u, h, q) => C.P(u, h, q);
const ramp = (w, a, b) => sst((w - a) / (b - a));
const pulse = (w, w0, d = 0.06) => Math.exp(-(((w - w0) / d) ** 2));
const lookTo = (face, from, to, ref = 150) => [clampK(face * (to[0] - from[0]) / ref, -1, 1), clampK((to[1] - from[1]) / ref, -1, 1)];
const ZOOM = 1.85, CAMY = 1401;
const toScr = (p) => [540 + (p[0] - 540) * ZOOM, 960 + (p[1] - CAMY) * ZOOM];
// ================================================================= SAMURAI
const SY = [[0, 1], [0.35, 1], [0.78, 1.06], [0.86, 0.95], [1.05, 0.95], [1.45, 1], [1.55, 1], [1.96, 1.10], [2.06, 0.92], [2.4, 0.93], [2.8, 1], [2.85, 1], [3.46, 1.17], [3.56, 0.90], [3.85, 0.9], [4.3, 1], [4.7, 1], [5.3, 0.97], [5.6, 0.97], [6.0, 1], [6.4, 1]];
const SX = [[0, 1], [0.35, 1], [0.78, 1.05], [0.86, 0.96], [1.05, 0.96], [1.45, 1], [1.55, 1], [1.96, 1.08], [2.06, 0.94], [2.4, 0.94], [2.8, 1], [2.85, 1], [3.46, 1.15], [3.56, 0.92], [3.85, 0.92], [4.3, 1], [6.4, 1]];
const SR = [[0, 0], [0.35, 0], [0.78, -0.05], [0.86, 0.10], [1.05, 0.10], [1.45, 0], [1.55, 0], [1.96, -0.08], [2.06, 0.16], [2.4, 0.16], [2.8, 0], [2.85, 0], [3.46, -0.10], [3.56, 0.20], [3.85, 0.20], [4.3, 0.05], [4.7, 0.05], [5.3, 0.12], [5.8, 0.12], [6.2, 0.05], [6.4, 0.05]];
function samBase(w) {
  const u = CUE.samU(w), S = SAMS, sy = KSp(SY, w) * (1 + 0.012 * Math.sin(w * 3.2)), sxx = KSp(SX, w);
  const trem = 0.012 * Math.sin(TAU * 18 * w) * ramp(w, 3.1, 3.4) * (1 - ramp(w, 3.5, 3.56));
  const rot = KSp(SR, w) + trem, by = px(u, 0, SQ)[1], blow = Math.max(pulse(w, 0.95, 0.12), pulse(w, 2.2, 0.2), pulse(w, 3.6, 0.15));
  const st = { x: px(u, 0, SQ)[0], y: by - S * 1.58 * sy, S, face: 1, rot, sx: sxx, sy, sw: { mode: 'none' }, band: { a: 1, wind: 0.5 + 0.25 * Math.sin(w * 2.3) + 1.6 * blow }, ground: by };
  return { st, u };
}
function samFinal(w) {
  const sm = samBase(w), st = sm.st, f = 1, g = samGeom(st, w), S = SAMS, wick = CUE.P(CUE.CANDLE.u, CUE.CANDLE.wickH, CUE.CANDLE.q);
  const mc = catBase(w), CG = catGeom(mc, w), ceye = CG.HX(6 - 11, -2), cEyeMid = CG.HX(6, -2);
  let look = lookTo(f, [st.x, st.y], wick, 150), wide = 0, closed = 0, squeeze = 0, sweat = 0;
  look[1] = clampK(look[1] + 0.15, -1, 1);
  const inh = Math.max(ramp(w, 0.35, 0.78) * (1 - ramp(w, 0.8, 0.84)), ramp(w, 1.55, 1.96) * (1 - ramp(w, 1.98, 2.02)), ramp(w, 2.85, 3.46) * (1 - ramp(w, 3.48, 3.52)));
  wide = 0.55 * inh;
  for (const [a, b] of [[0.84, 1.12], [2.03, 2.45], [3.52, 3.82]]) { const k = ramp(w, a, a + 0.03) * (1 - ramp(w, b - 0.05, b)); if (k > closed) { closed = k; squeeze = k; } }
  if (w >= 3.82 && w < 4.35) { look = lookTo(f, [st.x, st.y], cEyeMid, 150); wide = 1; sweat = ramp(w, 3.84, 4.0) * (1 - ramp(w, 4.85, 5.2)); }
  else if (w >= 4.35 && w < 5.55) { look = lookTo(f, [st.x, st.y], wick, 150); look[1] = clampK(look[1] + 0.2, -1, 1); wide = 0.7; sweat = ramp(w, 3.84, 4.0) * (1 - ramp(w, 4.85, 5.2)); }
  else if (w >= 5.55) { look = lookTo(f, [st.x, st.y], cEyeMid, 150); wide = 0.3; sweat = 0.85 * ramp(w, 5.6, 5.9); closed = ramp(w, 6.24, 6.28) * (1 - ramp(w, 6.33, 6.38)); }
  const br = 1 + 0.12 * inh, hands = [g.X(1.18 + 0.12 * inh, 1.02 + 0.03 * Math.sin(w * 2.1)), g.X(-1.18 - 0.12 * inh, 1.02 + 0.03 * Math.sin(w * 2.1 + 1))];
  const sh1 = g.X(0.85, 0.5), sh2 = g.X(-0.85, 0.5); window._rawHands = hands.slice();
  { const lim = 0.72 * S, cl = (hd, sh) => { const dx = hd[0] - sh[0], dy = hd[1] - sh[1], d = Math.hypot(dx, dy); return d > lim ? [sh[0] + dx * lim / d, sh[1] + dy * lim / d] : hd; }; hands[0] = cl(hands[0], sh1); hands[1] = cl(hands[1], sh2); }
  st.sweat = sweat; return { st, ey: { open: 1, look, wide, closed, squeeze }, hands, sm };
}
// ================================================================= MOCHI (sits facing the candle, face -1)
function catBase(w) {
  const u = CUE.mocU(w), [x0, y0] = px(u, 0, MQ), pose = clonePose(P_SIT), wick = CUE.P(CUE.CANDLE.u, CUE.CANDLE.wickH, CUE.CANDLE.q);
  const e = { open: 1, look: [0.2, 0], dil: 0.5, sparkle: 1, wide: 0 }, mouth = { open: 0 };
  pose.tl = [-12, 28, 3.05, 0.7, 0.8, 0];   // approved sit tail (lessons 2026-10-18)
  let sy = 1, tailWig = 0.35, blush = 0.45, hTilt = 0;
  e.look = lookTo(-1, [x0, y0 - 190], wick, 140);
  // sniffs (nose tells before the sneeze)
  const sn = pulse(w, 1.15, 0.05) + pulse(w, 2.2, 0.05) + pulse(w, 2.42, 0.05) + pulse(w, 2.64, 0.05);
  pose.h[1] -= 0.8 * sn; pose.h[2] += 0.05 * sn;
  const earTw = 0.3 * (pulse(w, 0.97, 0.1) + pulse(w, 2.15, 0.1) + pulse(w, 0.5, 0.1));
  // tension: the head tips back slowly (nose up), mouth opens, eyes go half shut
  const back = ramp(w, 2.9, 3.5) * (1 - ramp(w, 3.54, 3.58));
  hTilt += -0.3 * back; mouth.open = Math.max(mouth.open, 0.55 * ramp(w, 3.1, 3.48) * (1 - ramp(w, 3.54, 3.58))); e.open = 1 - 0.45 * ramp(w, 3.0, 3.48) * (1 - ramp(w, 3.56, 3.6));
  tailWig = 0.35 + 0.7 * ramp(w, 2.9, 3.5);
  // THE SNEEZE: snap forward + down, eyes shut tight, mouth wide, body squashes, then shakes it off
  const sk = ramp(w, 3.54, 3.6) * (1 - ramp(w, 3.72, 3.95));
  hTilt += 0.34 * sk; pose.h[1] += 1.6 * sk; mouth.open = Math.max(mouth.open, 1.0 * sk * (1 - ramp(w, 3.7, 3.8)));
  if (w >= 3.55 && w < 3.9) { e.sleep = 1; }
  if (w >= 3.9) { e.open = 1; e.dil = 1.0; e.wide = 0.3; e.look = lookTo(-1, [x0, y0 - 190], [px(CUE.samU(w), 11, SQ)[0], y0 - 190], 140); }
  if (w >= 4.3 && w < 4.6) { e.look = [-0.4, 0.5]; }                                  // sheepish look away
  if (w >= 4.6 && w < 5.55) { e.look = lookTo(-1, [x0, y0 - 190], wick, 140); e.look[1] = clampK(e.look[1] + 0.35, -1, 1); }
  // she leans over the glowing wick and puffs twice
  const lean = ramp(w, 4.75, 5.2); pose.h[0] += 1.5 * lean; pose.h[1] += 2 * lean; pose.b[4] = (pose.b[4] || 0) + 0.04 * lean; hTilt += 0.22 * lean;
  mouth.open = Math.max(mouth.open, 0.4 * pulse(w, 5.2, 0.05) + 0.5 * pulse(w, 5.38, 0.06));
  // relit: smug happy eyes
  if (w >= 5.78) { e.happy = ramp(w, 5.78, 5.84) > 0.5 ? 1 : 0; blush = 0.9; tailWig = 0.7; }
  if (w >= 6.12) { mouth.open = 0.3 * pulse(w, 6.15, 0.08); }
  pose.h[2] += hTilt;
  const [x, y] = [x0, y0];
  return { mouth, face: -1, kind: 'kit', col: ORG.k1, sd: 3, rot: 0, x, y, s: MOCS, pose, sy, sx: 1, e, tailWig, tailPh: TAU * w * 1.2, breath: 0.022 * Math.sin(w * 3.0), earTw, blush, hTilt: 0, pro: 'sit', raise: 0, _mode: 'sit' };
}
// ================================================================= props in the lit pass: air puffs
function puffs(c, w) {
  const wk = CUE.P(CUE.CANDLE.u, CUE.CANDLE.wickH, CUE.CANDLE.q), sm = samBase(w), g = samGeom(sm.st, w);
  const arcs = (src, dst, k, n, size, col, dir) => { for (let i = 0; i < n; i++) { const q = clampK(k * 1.15 - i * 0.16, 0, 1); if (q <= 0 || q >= 1) continue; const p = [lerpK(src[0], dst[0], q), lerpK(src[1], dst[1], q) + 3 * Math.sin(q * 6 + i)], r = size * (0.6 + 0.8 * q), a = Math.sin(Math.PI * q) * 0.9;
    c.save(); c.globalAlpha = a; c.strokeStyle = col; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.arc(p[0] - dir * r * 0.3, p[1], r, -0.9, 0.9); if (dir < 0) { c.restore(); c.save(); c.globalAlpha = a; c.strokeStyle = col; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.arc(p[0] + r * 0.3, p[1], r, Math.PI - 0.9, Math.PI + 0.9); } c.stroke(); c.restore(); } };
  for (const [w0, d, n, sz] of [[0.82, 0.3, 3, 20], [2.02, 0.4, 4, 26], [3.5, 0.3, 4, 30]]) if (w >= w0 && w < w0 + d + 0.35) arcs(g.X(1.0, 0.55), [wk[0] - 34, wk[1] + 6], (w - w0) / (d + 0.25), n, sz, '#ffffff', 1);
  // the sneeze blows back from the cat's side (3.57) + a spray of dots
  const mc = catBase(w), cg = catGeom(mc, w), mz = cg.HX(6, 13);
  if (w >= 3.57 && w < 3.95) { arcs(mz, [wk[0] + 34, wk[1] + 10], (w - 3.57) / 0.3, 4, 30, '#ffffff', -1);
    for (let i = 0; i < 9; i++) { const k = clampK((w - 3.58) / 0.3 - 0.05 * i, 0, 1); if (k <= 0 || k >= 1) continue; const an = (CUE.hash(i, 7) - 0.5) * 0.9, d = 240 * k * (0.6 + 0.6 * CUE.hash(i, 8)); c.save(); c.globalAlpha = 0.9 * (1 - k); c.fillStyle = '#ffffff'; c.beginPath(); c.arc(mz[0] - Math.cos(an) * d, mz[1] + Math.sin(an) * d * 0.7 + 90 * k * k, 3 + 3 * CUE.hash(i, 9), 0, 7); c.fill(); c.restore(); } }
  for (const [w0, a0] of [[5.2, 0.5], [5.38, 0.9]]) if (w >= w0 && w < w0 + 0.3) arcs(cg.HX(6, 13), [wk[0] + 26, wk[1] + 30], (w - w0) / 0.25, 2, 12, '#ffffff', -1);
}
// ================================================================= frame
function shadows(c, w) {
  const sm = samBase(w); softShadow(c, sm.u, SQ + 0.4, 9, 3.0, 0.3); softShadow(c, CUE.mocU(w), MQ + 0.4, 10.5, 3.2, 0.3);
}
var frame = function (t) {
  const w = t;
  if (!window._neutral) { GRAIN.getContext('2d').fillStyle = '#fff'; GRAIN.getContext('2d').fillRect(0, 0, W, H); for (const cv of [FIB, VIG]) cv.getContext('2d').clearRect(0, 0, W, H); window._neutral = true; }
  const p = PAPER.getContext('2d'); p.setTransform(1, 0, 0, 1, 0, 0); p.globalCompositeOperation = 'source-over'; p.globalAlpha = 1; p.fillStyle = '#f1e9d8'; p.fillRect(0, 0, W, H);
  const sf = samFinal(w), cat = catBase(w);
  CAMNOW = [540, CAMY, ZOOM];
  composeFrame(CAMNOW, { noHalo: true,
    pre: (c) => { drawWall(c); drawFloor(c); drawCandle(c); shadows(c, w); },
    chars: (c) => { samLegs(c, sf.st, w); samInk(c, sf.st, w, 0.5); samArms(c, sf.st, w, sf.hands); drawCat(c, cat, w); },
    over: (c) => { samOver(c, sf.st, w); samEyes(c, sf.st, w, sf.ey, sf.ey); puffs(c, w); } });
};
// ================================================================= info(t): everything light.py needs, in SCREEN pixels
function infoObj(t) {
  const w = t, sf = samFinal(w), st = sf.st, g = samGeom(st, w), cat = catBase(w), cg = catGeom(cat, w), K = cg.K, hs = cg.hs, s = cat.s;
  const fl = CUE.flameAt(w), wk = toScr(wickPx()), eyes = [];
  const rx = 0.22 * SAMS * Math.abs(st.sx), ry = 0.27 * SAMS * st.sy, e = sf.ey;
  for (const [pp_, side] of [[g.X(-0.16, 0.26), 0], [g.X(0.46, 0.26), 1]]) { const c = toScr(pp_); eyes.push({ x: c[0], y: c[1], rx: rx * ZOOM, ry: ry * ZOOM, open: e.closed > 0.5 ? 0 : 1, look: e.look, kind: 's', rot: st.rot, wide: e.wide }); }
  const ce = cat.e, shut = (ce.sleep || 0) > 0.5 || (ce.happy || 0) > 0.5, fc = 6, ex = K.eyeSp;
  for (const sg of [-1, 1]) { const c = toScr(cg.HX(fc + sg * ex, -2)); eyes.push({ x: c[0], y: c[1], rx: K.eye[0] * s * hs * ZOOM * (1 + 0.35 * (ce.wide || 0)), ry: K.eye[1] * s * hs * ZOOM * (1 + 0.35 * (ce.wide || 0)), open: shut ? 0 : (ce.open ?? 1), look: ce.look, kind: 'c', rot: cat.pose.h[2] + (cat.hTilt || 0), dil: ce.dil, shut: shut ? (ce.happy > 0.5 ? 'happy' : 'sleep') : '' }); }
  const win = toScr([CUE.P(2, 0, 0)[0], 1060]);
  return { t, flame: { x: wk[0], y: wk[1], len: fl.len, lean: fl.lean, ember: fl.ember, smoke: fl.smoke }, eyes, win: { x: win[0], y: win[1], r: 120 * ZOOM }, zoom: ZOOM, sweat: st.sweat };
}
window.info = (t) => JSON.stringify(infoObj(t));
