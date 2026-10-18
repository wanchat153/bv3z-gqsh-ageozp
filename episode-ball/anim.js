// anim.js — frame(t): pure function of t. Draws the room + both characters + the ball's floor shadow. The BALL itself (sphere shading, squash/stretch, ghost trail) is drawn by light.py from info(t).
const { SQ, MQ, BQ, KS: KSp } = CUE, sst = CUE.sstep, clampK = CUE.clamp, lerpK = CUE.lerp, R_ = CUE.R;
const SAMS = 95, MOCS = 2.4, px = (u, h, q) => C.P(u, h, q);
const ramp = (w, a, b) => sst((w - a) / (b - a));
const pulse = (w, w0, d = 0.06) => Math.exp(-(((w - w0) / d) ** 2));
const lookTo = (face, from, to, ref = 150) => [clampK(face * (to[0] - from[0]) / ref, -1, 1), clampK((to[1] - from[1]) / ref, -1, 1)];
const ZOOM = 1.95, CAMY = 1230;
const toScr = (p) => [540 + (p[0] - 540) * ZOOM, 960 + (p[1] - CAMY) * ZOOM];
const BLINK = [0.9, 2.7, 4.2, 7.0, 8.0, 9.1], BLINKC = [1.6, 3.4, 4.3, 7.2, 8.5, 9.5];
const blinkK = (w, L) => Math.max(0, ...L.map((t) => pulse(w, t, 0.045)));
const ballW = (w) => { const b = CUE.ballAt(w); return px(b.u, b.h, BQ); };               // ball centre in world px
const LAG = 0.07;                                                                          // eyes follow the ball a little late
// ================================================================= SAMURAI (face = 1, looks right)
function samState(w) {
  const S = SAMS, u = CUE.SAM_U, du = KSp(CUE.DUCK, w), sU = KSp(CUE.STARTLE, w);
  let sy = 1 + 0.012 * Math.sin(w * 3.2) - 0.30 * du, sxx = 1 + 0.12 * du;
  const sk = (w - (CUE.T_PAW - 0.04)) / 0.2; let hop = 0; if (sk > 0 && sk < 1) hop = 0.3 * S * 4 * sk * (1 - sk);              // a startle hop (he cannot stretch; he jumps)
  const by = px(u, 0, SQ)[1] - hop, bw = ballW(w - LAG);
  const xs = px(u, 0, SQ)[0];
  let rot = 0.05 * clampK((bw[0] - xs) / 300, -1, 1) - 0.06 * sU;
  const st = { x: xs, y: by - S * 1.58 * sy, S, face: 1, rot, sx: sxx, sy, sw: { mode: 'none' }, band: { a: 1, wind: 0.5 + 0.25 * Math.sin(w * 2.3) + 1.2 * sU }, ground: by, walk: null };
  const g = samGeom(st, w), sh1 = g.X(0.85, 0.5), sh2 = g.X(-0.85, 0.5);
  let hands = [g.X(1.36, 0.88), g.X(-1.36, 0.88)];
  const up = [g.X(1.28, 0.35), g.X(-1.28, 0.35)];                                                                                  // startle: hands up at chest height
  hands = hands.map((h, i) => [lerpK(h[0], up[i][0], sU), lerpK(h[1], up[i][1], sU)]);
  window._rawHands = [hands[0].slice(), hands[1].slice()]; window._shoulders = [sh1, sh2];
  { const lim = 0.72 * S, cl = (hd, sh) => { const dx = hd[0] - sh[0], dy = hd[1] - sh[1], d = Math.hypot(dx, dy); return d > lim ? [sh[0] + dx * lim / d, sh[1] + dy * lim / d] : hd; }; hands[0] = cl(hands[0], sh1); hands[1] = cl(hands[1], sh2); }
  const look = lookTo(1, [st.x, st.y - 10], bw, 130), wide = Math.max(0.75 * sU, 0.6 * du, 0.5 * pulse(w, CUE.T_TIP, 0.12));
  st.sweat = ramp(w, CUE.T_STOP + 0.5, CUE.T_STOP + 0.8) * (1 - ramp(w, CUE.T_STOP + 2.2, CUE.T_STOP + 2.45));
  const closed = blinkK(w, BLINK) * (wide > 0.3 ? 0 : 1);
  return { st, hands, ey: { open: 1, look, wide, closed, squeeze: closed }, sh1 };
}
// ================================================================= MOCHI (sits facing left, pro:'sit'; her pounce is a SIT-HOP: crouch -> push -> flight -> landing squash, no pose swap)
function catState(w) {
  const H = CUE.HOP, u = CUE.mocU(w), hopCm = CUE.mocHop(w), [x0, y00] = px(u, 0, MQ), y0 = y00 - hopCm * C.S, pose = clonePose(P_SIT);
  pose.tl = [-12, 28, 3.05, 0.7, 0.8, 0];
  const e = { open: 1, look: [0.5, 0], dil: 0.5, sparkle: 1, wide: 0 }, mouth = { open: 0 };
  const cr = ramp(w, H.crouch0, H.crouch1) * (1 - ramp(w, H.t0 - 0.03, H.t0)), fs = (w - H.t0) / (H.t1 - H.t0), inFl = fs > 0 && fs < 1;
  const land = pulse(w, H.t1 + 0.07, 0.07);
  let sy = 1 - 0.10 * cr - 0.10 * land + (inFl ? 0.08 * Math.sin(Math.PI * Math.min(1, fs * 2)) : 0), rot = 0;
  if (inFl) rot = 0.30 * (fs < 0.5 ? 1 : -1) * Math.sin(Math.PI * Math.min(1, fs * 2)) * (fs < 0.5 ? 1 : 0.8) * -1;               // nose up rising, nose down falling (sign set by the contact sheet)
  // paw: swat during the hop, reflex paw at the ball later
  const sw = ramp(w, H.t0 + 0.02, H.t0 + 0.08) * (1 - ramp(w, H.t1 + 0.12, H.t1 + 0.3)), rf = KSp(CUE.PAWK, w), ms = MOCS;
  let raise = Math.max(sw, rf), tip = [43, -31];
  if (sw > rf) { const ph = lerpK(-0.95, 0.6, ramp(w, H.t0 + 0.06, H.t1)); tip = [21 + 22 * Math.cos(ph), -31 + 22 * Math.sin(ph)]; }
  else { const px_ = px(CUE.MOC_U1 + CUE.PAW.du, CUE.PAW.h, MQ), lx = (px_[0] - (px(CUE.MOC_U1, 0, MQ)[0])) / (-ms), ly = (px_[1] - px(CUE.MOC_U1, 0, MQ)[1]) / ms, dx = lx - 21, dy = ly + 31, d = Math.hypot(dx, dy) || 1, L = Math.min(d, 22); tip = [21 + dx / d * L, -31 + dy / d * L]; }
  const bw = ballW(w - LAG), lk = lookTo(-1, [x0, y0 - 190], bw, 150);
  e.look = [lk[0], lk[1]];
  const sU = KSp(CUE.STARTLE, w), rfw = KSp(CUE.PAWK, w); e.wide = Math.max(0.6 * rfw, 0.5 * cr); e.dil = 0.5 + 0.4 * Math.max(rfw, cr);
  let hTilt = 0.06 * clampK((bw[0] - x0) / -300, -1, 1) - 0.14 * rfw + (w > CUE.T_STOP ? 0.1 * ramp(w, CUE.T_STOP + 0.9, CUE.T_STOP + 1.3) * (1 - ramp(w, CUE.T_STOP + 2.0, CUE.T_STOP + 2.4)) : 0);
  pose.h[2] += hTilt;
  const b = blinkK(w, BLINKC) * (e.wide > 0.3 ? 0 : 1); if (b > 0.5) e.sleep = 1;
  const earTw = 0.3 * (pulse(w, 1.9, 0.1) + pulse(w, H.t0, 0.1) * 2 + pulse(w, CUE.T_PAW, 0.12) * 2);
  mouth.open = 0.5 * pulse(w, CUE.T_PAW + 0.05, 0.08);
  return { mouth, face: -1, kind: 'kit', col: ORG.k1, sd: 3, rot, x: x0, y: y0, s: MOCS, pose, sy, sx: 1, e, tailWig: 0.35 + 0.6 * Math.max(cr, rfw), tailPh: TAU * w * 1.2, breath: 0.022 * Math.sin(w * 3.0), earTw, blush: 0.45, hTilt: 0, pro: 'sit', raise, raiseTip: tip, _mode: 'sit' };
}
// ================================================================= frame
function floorShadows(c, w) {
  const b = CUE.ballAt(w), k = 1 / (1 + b.h / 9);
  softShadow(c, CUE.SAM_U, SQ + 0.4, 9, 3.0, 0.3); softShadow(c, CUE.mocU(w), MQ + 0.4, 10.5, 3.2, 0.3 / (1 + CUE.mocHop(w) / 2.5));
  softShadow(c, b.u, BQ + 0.3, R_ * 1.35 * (0.8 + 0.5 * k), R_ * 0.9, 0.34 * k + 0.06);
}
var frame = function (t) {
  const w = t;
  if (!window._neutral) { GRAIN.getContext('2d').fillStyle = '#fff'; GRAIN.getContext('2d').fillRect(0, 0, W, H); for (const cv of [FIB, VIG]) cv.getContext('2d').clearRect(0, 0, W, H); window._neutral = true; }
  const p = PAPER.getContext('2d'); p.setTransform(1, 0, 0, 1, 0, 0); p.globalCompositeOperation = 'source-over'; p.globalAlpha = 1; p.fillStyle = '#f1e9d8'; p.fillRect(0, 0, W, H);
  CAMNOW = [540, CAMY, ZOOM];
  const sf = samState(w), cat = catState(w);
  composeFrame(CAMNOW, { noHalo: true,
    pre: (c) => { drawWall(c); drawFloor(c); floorShadows(c, w); },
    chars: (c) => { samLegs(c, sf.st, w); samInk(c, sf.st, w, 0.5); samArms(c, sf.st, w, sf.hands); drawCat(c, cat, w); },
    over: (c) => { samOver(c, sf.st, w); samEyes(c, sf.st, w, sf.ey, sf.ey); } });
};
window.grab = (t, fmt = 'png', q = 0.93) => { frame(t); return document.getElementById('c').toDataURL(fmt === 'jpg' ? 'image/jpeg' : 'image/png', q); };
// ================================================================= info(t): the ball in SCREEN px for light.py
function ballInfo(w) {
  const b = CUE.ballAt(w), sh = CUE.ballShape(w), p = toScr(px(b.u, b.h, BQ)), r = R_ * C.S * ZOOM;
  const spin = (b.u - (-5.2)) / R_ * 0.9 + 0.4;
  return { x: p[0], y: p[1], r, sq: sh.sq, ang: sh.ang, st: sh.st, vang: sh.vang, spin, h: b.h, kind: b.kind, speed: Math.hypot(b.vu, b.vh) };
}
function infoObj(t) {
  const trail = []; for (let i = 1; i <= 7; i++) { const tw = t - 0.014 * i; if (tw < 0) break; trail.push(ballInfo(tw)); }
  return { t, ball: ballInfo(t), trail, zoom: ZOOM };
}
window.info = (t) => JSON.stringify(infoObj(t));
// probe used once to measure the samurai's head tip (cm above the floor, cm from his centre line)
window.tipProbe = () => { const sf = samState(0), g = samGeom(sf.st, 0); let tip = g.pts[0]; for (const p of g.pts) if (p[1] < tip[1]) tip = p; return { du: (tip[0] - px(CUE.SAM_U, 0, SQ)[0]) / C.S, h: (px(CUE.SAM_U, 0, SQ)[1] - tip[1]) / C.S, leftEdge: (Math.min(...g.pts.map((p) => p[0])) - px(CUE.SAM_U, 0, SQ)[0]) / C.S, rightEdge: (Math.max(...g.pts.map((p) => p[0])) - px(CUE.SAM_U, 0, SQ)[0]) / C.S }; };
