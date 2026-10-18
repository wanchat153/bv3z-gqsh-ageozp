// anim.js — frame(t): pure function of t. MODE 'full' = lit room + kettle + REAL samurai and Mochi (no steam, no light: light.py adds them); 'real' = the real characters only (mask for rim light + steam occlusion); 'catmask' = Mochi alone, fixed pose (the cat-cloud silhouette).
const { SQ, MQ, KS: KSp } = CUE, sst = CUE.sstep, clampK = CUE.clamp, lerpK = CUE.lerp;
const SAMS = 95, MOCS = 2.4, px = (u, h, q) => C.P(u, h, q);
const ramp = (w, a, b) => sst((w - a) / (b - a));
const pulse = (w, w0, d = 0.06) => Math.exp(-(((w - w0) / d) ** 2));
const lookTo = (face, from, to, ref = 150) => [clampK(face * (to[0] - from[0]) / ref, -1, 1), clampK((to[1] - from[1]) / ref, -1, 1)];
const ZOOM = 1.85, CAMY = 1252;
const toScr = (p) => [540 + (p[0] - 540) * ZOOM, 960 + (p[1] - CAMY) * ZOOM];
let MODE = 'full';
const BLINK = [0.9, 2.3, 6.9, 8.7, 9.3], BLINKC = [1.3, 4.0, 5.3, 8.1, 9.0];
const blinkK = (w, L) => Math.max(0, ...L.map((t) => pulse(w, t, 0.045)));
const wispTip = (w) => px(CUE.KET.u + 7.6 + 0.5 * Math.sin(w * 1.7), 9.1 + 3.2 + 1.0 * Math.sin(w * 2.3), MQ);   // where the thin steam curls (Mochi follows it)
// ================================================================= SAMURAI (face = 1, looks right toward the kettle / Mochi)
function samState(w) {
  const S = SAMS, u = CUE.samU(w), wk = CUE.samSeg(w), mv = !!wk;
  const flinch = pulse(w, 3.55, 0.12), stumble = pulse(w, 5.8, 0.16);
  let sy = 1 + 0.012 * Math.sin(w * 3.2) - 0.07 * flinch - 0.04 * ramp(w, 4.4, 5.5) * (1 - ramp(w, 5.6, 5.7));
  const rot = -0.15 * stumble + 0.05 * ramp(w, 4.3, 5.5) * (1 - ramp(w, 5.6, 5.7)) + (mv ? 0.04 : 0) + 0.06 * (ramp(w, 9.0, 9.3) * (1 - ramp(w, 9.5, 9.8)));
  const phase = wk ? wk.ph : 0; sy += mv ? 0.035 * Math.abs(Math.sin(phase)) : 0;
  const by = px(u, 0, SQ)[1];
  const st = { x: px(u, 0, SQ)[0], y: by - S * 1.58 * sy, S, face: 1, rot, sx: 1, sy, sw: { mode: 'none' }, band: { a: 1, wind: 0.5 + 0.25 * Math.sin(w * 2.3) + (mv ? 1.2 : 0) + 1.5 * stumble }, ground: by, walk: mv ? phase : null };
  const g = samGeom(st, w), sh1 = g.X(0.85, 0.5), sh2 = g.X(-0.85, 0.5);
  let hands = [g.X(1.36, 0.88), g.X(-1.36, 0.88)];
  if (st.walk != null) { const q = Math.sin(st.walk) * wk.sp; hands = [g.X(1.36, 0.88 - q * 0.05), g.X(-1.36, 0.88 + q * 0.05)]; hands[0][0] -= q * S * 0.03; hands[1][0] += q * S * 0.04; }
  const toward = (a, b, k) => [lerpK(a[0], b[0], k), lerpK(a[1], b[1], k)];
  const ka = kettleAnchors(w), pr = KSp(CUE.PRESS, w), bn = KSp(CUE.BOUNCE, w), pk = KSp(CUE.POKE, w), cl = CUE.cloud(w);
  if (pr > 0) hands[0] = toward(hands[0], [ka.knob[0] - 3, ka.knob[1] + 0.2 * S], pr);
  if (bn > 0) hands[0] = toward(hands[0], [sh1[0] - 4, sh1[1] - 0.6 * S], bn);
  if (pk > 0) hands[0] = toward(hands[0], px(cl.u, cl.h, SQ), pk);
  window._rawHands = [hands[0].slice(), hands[1].slice()]; window._shoulders = [sh1, sh2];
  { const lim = 0.72 * S, c2 = (hd, sh) => { const dx = hd[0] - sh[0], dy = hd[1] - sh[1], d = Math.hypot(dx, dy); return d > lim ? [sh[0] + dx * lim / d, sh[1] + dy * lim / d] : hd; }; hands[0] = c2(hands[0], sh1); hands[1] = c2(hands[1], sh2); }
  // eyes
  const cp = px(CUE.MOC_U, 0, MQ), cpx = px(cl.u, cl.h, SQ);
  let tgt = [ka.knob[0], ka.knob[1] + 10];
  if (w > 3.9 && w < 5.6) tgt = ka.knob; if (w >= 5.6) tgt = ka.vent; if (w >= 6.0 && w < 9.0) tgt = cpx; if (w >= 9.0) tgt = [cp[0], cp[1] - 150];
  const look = lookTo(1, [st.x, st.y], tgt, 150);
  const squeeze = Math.max(ramp(w, 3.48, 3.54) * (1 - ramp(w, 3.7, 3.78)), ramp(w, 5.64, 5.68) * (1 - ramp(w, 5.9, 5.98)), pk > 0.5 ? 0 : 0);
  const wide = 0.8 * Math.max(ramp(w, 3.8, 3.9) * (1 - ramp(w, 5.6, 5.64)), ramp(w, 6.0, 6.1) * (1 - ramp(w, 6.8, 6.9)), pulse(w, 7.95, 0.15));
  const closed = Math.max(squeeze, blinkK(w, BLINK) * (wide > 0.3 ? 0 : 1));
  st.sweat = ramp(w, 4.8, 5.1) * (1 - ramp(w, 6.2, 6.7)) + ramp(w, 8.1, 8.3) * (1 - ramp(w, 8.9, 9.3));
  return { st, hands, ey: { open: 1, look, wide, closed, squeeze: closed }, u, sh1 };
}
// ================================================================= MOCHI (sits facing left; pro:'sit', head only rotates)
function catState(w) {
  const u = CUE.MOC_U, [x0, y0] = px(u, 0, MQ), pose = clonePose(P_SIT);
  pose.tl = [-12, 28, 3.05, 0.7, 0.8, 0];
  const e = { open: 1, look: [0.5, 0], dil: 0.5, sparkle: 1, wide: 0 }, mouth = { open: 0 };
  const cl = CUE.cloud(w), cpx = px(cl.u, cl.h, MQ), sp = px(CUE.samU(w), 6, SQ), kk = kettleAnchors(w);
  let tgt = wispTip(w);
  if (w >= 3.9 && w < 5.55) tgt = kk.knob; if (w >= 5.55 && w < 6.0) tgt = kk.vent; if (w >= 6.0 && w < 9.0) tgt = cpx; if (w >= 9.0) tgt = [sp[0] + 60, sp[1] - 60];
  const lc = lookTo(-1, [x0, y0 - 190], tgt, 140); e.look = lc;
  const flinch = ramp(w, 3.48, 3.54) * (1 - ramp(w, 3.9, 4.1)), cur = 0.08 * Math.sin(w * 1.3) * (1 - flinch);
  let hTilt = cur + 0.05 * pulse(w, 6.3, 0.3) - 0.08 * flinch;
  e.wide = 0.7 * Math.max(ramp(w, 5.65, 5.72) * (1 - ramp(w, 6.0, 6.2)), ramp(w, 6.0, 6.1) * (1 - ramp(w, 8.0, 8.2)));
  e.open = 1 - 0.45 * flinch;
  const b = blinkK(w, BLINKC) * (e.wide > 0.3 ? 0 : 1); if (b > 0.5) e.sleep = 1;
  const earTw = 0.3 * (pulse(w, 1.55, 0.1) + 3 * pulse(w, 3.55, 0.12) + 2 * pulse(w, 5.7, 0.1) + pulse(w, 9.0, 0.1)) + 0.25 * flinch;
  // paw swat: the far arm reaches toward the wisp (2.58) and the cloud (7.0). The reach is limited to the arm length (never stretches).
  let raise = KSp(CUE.SWAT, w), raiseTip = null;
  if (raise > 0) {
    const sw = w < 5 ? px(CUE.KET.u + 8.1, 9.2, MQ) : px(cl.u, cl.h, MQ), ms = MOCS, f = -1, lx = (sw[0] - x0) / (f * ms), ly = (sw[1] - y0) / ms, sh = [21, -31], dx = lx - sh[0], dy = ly - sh[1], d = Math.hypot(dx, dy) || 1, L = Math.min(d, 26);
    raiseTip = [sh[0] + dx / d * L, sh[1] + dy / d * L]; pose.h[2] += 0.08 * raise; pose.b[4] = (pose.b[4] || 0) + 0.04 * raise;
    window._swatReach = d;
  }
  pose.h[2] += hTilt;
  return { mouth, face: -1, kind: 'kit', col: ORG.k1, sd: 3, rot: 0, x: x0, y: y0, s: MOCS, pose, sy: 1, sx: 1, e, tailWig: 0.35 + 0.5 * flinch, tailPh: TAU * w * 1.2, breath: 0.022 * Math.sin(w * 3.0), earTw, blush: 0.5, hTilt: 0, pro: 'sit', raise, raiseTip, _mode: 'sit' };
}
// ================================================================= frame
function softFloor(c, w) { softShadow(c, CUE.samU(w), SQ + 0.4, 9, 3.0, 0.3); softShadow(c, CUE.MOC_U, MQ + 0.4, 10.5, 3.2, 0.3); }
var frame = function (t) {
  const w = t;
  if (!window._neutral) { GRAIN.getContext('2d').fillStyle = '#fff'; GRAIN.getContext('2d').fillRect(0, 0, W, H); for (const cv of [FIB, VIG]) cv.getContext('2d').clearRect(0, 0, W, H); window._neutral = true; }
  const p = PAPER.getContext('2d'); p.setTransform(1, 0, 0, 1, 0, 0); p.globalCompositeOperation = 'source-over'; p.globalAlpha = 1; p.fillStyle = MODE === 'full' ? '#f1e9d8' : '#ffffff'; p.fillRect(0, 0, W, H);
  CAMNOW = [540, CAMY, ZOOM];
  if (MODE === 'catmask') { const c0 = catState(0); c0.x = 540; c0.raise = 0; c0.raiseTip = null; c0.e = { open: 0, look: [0, 0], dil: 0.5, wide: 0, sleep: 1 }; c0.earTw = 0; c0.tailWig = 0; composeFrame(CAMNOW, { noHalo: true, pre: () => {}, chars: (c) => drawCat(c, c0, 0), over: () => {} }); return; }
  const sf = samState(w), cat = catState(w);
  composeFrame(CAMNOW, { noHalo: true,
    pre: (c) => { if (MODE === 'full') { drawWall(c); drawFloor(c); drawHibachi(c); drawKettle(c, w, 'body'); drawKettle(c, w, 'lid'); softFloor(c, w); } },
    chars: (c) => { samLegs(c, sf.st, w); samInk(c, sf.st, w, 0.5); samArms(c, sf.st, w, sf.hands); drawCat(c, cat, w); },
    over: (c) => { samOver(c, sf.st, w); if (MODE === 'full') samEyes(c, sf.st, w, sf.ey, sf.ey); } });
};
window.grabLayer = (t, mode) => { MODE = mode; frame(t); return document.getElementById('c').toDataURL('image/png'); };
window.grab = (t) => window.grabLayer(t, 'full');
// ================================================================= info(t): numbers light.py needs (screen px)
function infoObj(t) {
  const w = t, k = kettleAnchors(w), ks = kettleState(w), cl = CUE.cloud(w), cp = toScr(px(cl.u, cl.h, MQ)), sf = samState(w), cat = catState(w);
  const sw = KSp(CUE.SWAT, w); let paw = null;
  if (sw > 0.05 && cat.raiseTip) { const cg = catGeom(cat, w); }
  return { t, spout: toScr(k.spout), vent: toScr(k.vent), coal: toScr(k.coal), knob: toScr(k.knob), unit: C.S * ZOOM, zoom: ZOOM, shake: ks.dx * ZOOM,
    emit: KSp(CUE.EMIT, w), ventAmt: KSp(CUE.VENT, w), whistle: KSp(CUE.WHISTLE, w), cloud: { x: cp[0], y: cp[1], s: cl.s * C.S * ZOOM, a: cl.a, d: cl.d }, swat: sw, sweat: sf.st.sweat,
    wallY: toScr([0, WALL_Y])[1], footS: toScr(px(0, 0, SQ))[1], footC: toScr(px(0, 0, MQ))[1] };
}
window.info = (t) => JSON.stringify(infoObj(t));

// 240 Hz table for light.py: spout/vent screen positions + emission, so every part can rebuild the steam history of any frame on its own
window.tab = () => { const o = { hz: 240, sp: [], vt: [], em: [], vn: [], wh: [] }; for (let i = 0; i <= 2400; i++) { const w = i / 240, k = kettleAnchors(w), s = toScr(k.spout), v = toScr(k.vent); o.sp.push([+s[0].toFixed(1), +s[1].toFixed(1)]); o.vt.push([+v[0].toFixed(1), +v[1].toFixed(1)]); o.em.push(+KSp(CUE.EMIT, w).toFixed(3)); o.vn.push(+KSp(CUE.VENT, w).toFixed(3)); o.wh.push(+KSp(CUE.WHISTLE, w).toFixed(3)); } return o; };
