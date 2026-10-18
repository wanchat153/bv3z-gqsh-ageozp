'use strict';
// ================= "ดารุมะล้มไม่ลุก... ไม่ได้" — full 150 s timeline (pure function of t) =================
const DUR = 150, RD = 140, DX0 = 745, CUSH = 430, PI = Math.PI;
const ss = (a, b, x) => { const q = clamp((x - a) / (b - a)); return q * q * (3 - 2 * q); };
function K(keys, t) { if (t <= keys[0][0]) return keys[0].slice(1); for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const a = keys[i - 1], b = keys[i], q = ss(a[0], b[0], t); return a.slice(1).map((v, j) => v + (b[j + 1] - v) * q); } return keys[keys.length - 1].slice(1); }
const k1 = (keys, t) => K(keys, t)[0];
const imp = (t, t0, a, tau) => (t < t0 ? 0 : a * Math.exp(-(t - t0) / tau) * ss(t0, t0 + 0.04, t));
const arc = (t, t0, h, d) => (t > t0 && t < t0 + d ? h * Math.sin(Math.PI * (t - t0) / d) : 0);
const lerp2 = (a, b, q) => [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q];
const wnd = (a, b, t, e = 0.25) => ss(a, a + e, t) * (1 - ss(b - e, b, t));

// ---------- shock from events ----------
function shockAt(t) { let m = 0; for (const [te, , f] of EV) { if (f < 0.25 || t < te) continue; const d = t - te; if (d > 2.5) continue; const v = f * Math.exp(-d / 0.9) * ss(te, te + 0.05, t); if (v > m) m = v; } return m; }
const SHOCKS = EV.filter((e) => e[2] >= 0.25);

// ---------- big daruma ----------
function rockOne(r, t) { const t0 = r[0], type = r[1], a = r[2], tau = r[3], w = r[4]; if (t < t0) return 0; const d = t - t0, e = Math.exp(-d / tau); return type === 'k' ? a * e * Math.sin(w * d) * ss(t0, t0 + 0.03, t) : a * e * Math.cos(w * d); }
function dTheta(t) { let cut = -1; for (const h of HOLD) { if (t >= h[0] && t < h[1]) return h[2] * ss(h[0], h[0] + h[3], t); if (t >= h[1]) cut = Math.max(cut, h[1] - 1e-6); } let s = 0; for (const r of ROCK) { if (r[0] < cut) continue; s += rockOne(r, t); } return s; }
const DHOP = [[27.45, 14, 0.3], [37.0, 200, 0.95], [77.55, 70, 0.5], [84.45, 22, 0.3], [125.2, 24, 0.35]];
const DSQ = [[0, 0], [21.7, 0], [21.86, 0.55], [22.5, 0.5], [22.62, 0], [76.34, 0], [76.46, 1], [77.35, 1], [77.55, -0.25], [77.95, 0], [101.9, 0], [102.35, 0.3], [102.7, 0], [150, 0]];
const DSPIN = [[0, 0], [37.0, 0], [37.95, 2 * PI], [150, 2 * PI]];
function dState(t) {
  const th = dTheta(t); let hop = 0; for (const h of DHOP) hop += arc(t, h[0], h[1], h[2]); for (const h of HOLD) hop += arc(t, h[1], 24, 0.32);
  const sq = k1(DSQ, t), sy = 1 - 0.4 * sq, sx = 1 + 0.32 * sq, spin = k1(DSPIN, t) % (2 * PI);
  return { x: DX0 + RD * th, y: FL - RD * sy - hop, th: th + spin, sx, sy, sq, hop, th0: th };
}
const dPt = (D, ang, f = 1) => [D.x + RD * f * D.sx * Math.cos(ang + D.th), D.y + RD * f * D.sy * Math.sin(ang + D.th)];

// ---------- little daruma (shelf) ----------
const MINI = [{ x: 745, r: 40 }, { x: 825, r: 36 }, { x: 897, r: 32 }, { x: 959, r: 28 }, { x: 1013, r: 24 }], BOARD = 1010;
function mTheta(i, t) {
  for (const h of MHOLD) if (h[0] === i && t >= h[1] && t < h[2]) return h[3] * ss(h[1], h[1] + h[4], t);
  let cut = -1; for (const h of MHOLD) if (h[0] === i && t >= h[2]) cut = Math.max(cut, h[2] - 1e-6);
  let s = 0; for (const r of MROCK) { if (r[0] !== i || r[1] < cut) continue; s += rockOne(r.slice(1), t); } return s;
}
function miniState(i, t) { const m = MINI[i], th = mTheta(i, t); return { x: m.x + m.r * th, y: BOARD - m.r, r: m.r, th }; }
const RING_BIG = EV.filter((e) => e[1] === 'ting'), RING_MINI = [0, 1, 2, 3, 4].map((i) => EV.filter((e) => e[1] === 'mini' + i));
function ringK(list, t, dur = 0.5) { let k = -1; for (const e of list) { const d = t - e[0]; if (d >= 0 && d < dur) k = d / dur; } return k; }

// ---------- samurai ----------
const SX = [[0, -250], [2.7, CUSH], [12.0, CUSH], [13.0, 520], [14.0, 520], [14.6, 470], [15.0, 470], [15.35, -290], [15.9, -290], [16.9, 330], [19.2, 330], [19.5, -290], [20.2, -290], [21.4, 520], [23.0, 520], [23.2, 420], [23.55, 420], [23.9, -290], [24.5, -290], [25.4, 340], [25.9, 300], [27.0, 300], [27.4, 470], [29.3, 470], [30.0, 470], [30.3, -290], [30.9, -290], [31.8, 440], [33.8, 440], [34.0, 490], [45.0, 490], [45.3, -290], [45.85, -290], [46.9, 560], [47.9, 560], [48.5, 745], [51.8, 745], [53.3, CUSH], [57.5, CUSH], [57.8, -290], [58.4, -290], [59.2, 460], [72.0, 460], [77.5, 470], [78.0, 470], [78.5, 250], [79.1, 380], [79.6, 290], [80.1, 330], [84.0, 330], [84.2, 380], [84.45, 480], [85.0, 440], [87.0, 440], [89.2, 480], [120.5, 480]];
const SX2 = [[119.5, 500], [120.0, 880], [121.4, 880], [121.7, 940], [123.2, 940], [123.4, 960], [124.6, 960], [125.0, 640], [125.7, 500], [128.6, 500], [129.0, 470], [135.0, 470], [137.0, 470], [138.0, 520], [141.0, 520], [142.4, 450], [150, 450]];
// full path = SX until 119.5, SX2 afterwards. Acts 7-8 extra keys:
const SX3 = [[87.0, 440], [89.2, 480], [106.2, 480], [107.1, 880], [107.4, 880], [110.4, 500], [119.5, 500]];
function sxAt(t) { if (t >= 119.5) return k1(SX2, t); if (t >= 87.0) return k1(SX3, t); return k1(SX, t); }
const SITW = [[3.0, 12.0], [27.7, 29.3], [48.6, 51.8], [53.3, 55.8], [70.2, 72.0], [89.3, 93.9], [111.2, 119.4], [137.0, 150]];
const sitK = (t) => { let m = 0; for (const [a, b] of SITW) m = Math.max(m, ss(a, a + 0.45, t) * (1 - ss(b, b + 0.45, t))); return m; };
const SLEEPW = [[4.0, 7.0], [8.7, 10.0], [55.4, 56.3], [91.8, 93.9], [143.0, 150]];
const ROTK = [[0, 0], [90.3, 0], [91.0, 0.13], [93.9, 0.13], [94.45, -1.45], [98.2, -1.45], [99.4, 0], [150, 0]];
const FLY = [{ a: 47.9, b: 48.5, p0: [560, FL], p1: [745, null], h: 90, spin: 0 }, { a: 51.8, b: 53.3, p0: [745, null], p1: [CUSH, FL - 20], h: 480, spin: -4 * PI }];
function samAt(t) {
  const x0 = sxAt(t), sp = (sxAt(t + 0.05) - sxAt(t - 0.05)) / 0.1, mov = Math.abs(sp) > 8;
  const sit = sitK(t), Dd = SAMS * 1.58;
  // pancake squash (stone lands on him) and re-inflate
  const pan = ss(80.15, 80.24, t) * (1 - ss(82.0, 83.3, t)), wob = t > 83.3 ? 0.14 * Math.exp(-(t - 83.3) / 0.5) * Math.sin((t - 83.3) * 20) : 0;
  const sh = shockAt(t);
  let hop = 0; for (const e of SHOCKS) hop += arc(t, e[0], 14 + 26 * e[2], 0.34);
  hop += arc(t, 85.1, 40, 0.34) + arc(t, 85.5, 40, 0.34) + arc(t, 85.9, 40, 0.34) + arc(t, 120.0, 150, 0.5) + arc(t, 121.7, 150, 0.5) + arc(t, 123.3, 160, 0.5);
  hop += arc(t, 76.6, 46, 0.36) + arc(t, 84.2, 12, 0.25);
  let rot = k1(ROTK, t); for (const e of SHOCKS) rot += imp(t, e[0], -0.2 * e[2], 0.5);
  for (const [a, b] of SLEEPW) rot += 0.11 * wnd(a, b, t, 0.4) * (1 + 0.2 * Math.sin(t * 1.7));
  rot += 0.16 * wnd(111.8, 119.2, t, 0.5) * 0;   // resting beside the cat
  const strain = wnd(25.6, 27.0, t, 0.3) + 0.8 * wnd(20.4, 21.5, t, 0.3) + 0.8 * wnd(46.0, 47.0, t, 0.3) + 0.6 * wnd(72.3, 73.5, t, 0.3) + wnd(129.0, 134.3, t, 0.4) * 0.6;
  // lift (what he stands/sits on)
  let gy = FL; const cr = crateAt(t); if (t >= 48.5 && t < 51.8 && cr) gy = cr.bot - 360 + 8; else if (sit > 0.3 && x0 > 330 && x0 < 570) gy = FL - 20 * sit;
  const sy = (1 - 0.17 * sit + 0.04 * Math.sin(t * 2.1)) * (1 - 0.86 * pan) + wob, sx = (1 + 0.1 * sit) * (1 + 0.8 * pan) - wob * 0.5;
  const D2 = Dd * (1 - 0.17 * sit) * (1 - 0.86 * pan);
  let x = x0 + D2 * Math.sin(rot), y = gy - D2 * Math.cos(rot) - hop, rr = rot;
  // jitter while straining
  x += strain * 2.5 * Math.sin(t * 34);
  // flights (jump onto the crate, rodeo launch)
  const Dsit = Dd * (1 - 0.17 * sit);
  if (t >= 47.9 && t <= 48.5) { const q = ss(0, 1, (t - 47.9) / 0.6), gnd = FL + (FL - 360 + 8 - FL) * q; x = 560 + 185 * q; y = gnd - Dsit - 90 * Math.sin(PI * q); }
  if (t >= 51.8 && t <= 53.3) { const c0 = crateAt(51.8), q = (t - 51.8) / 1.5, g0 = c0.bot - 360 + 8, g1 = FL - 20, e = ss(0, 1, q); x = 745 + (CUSH - 745) * e; y = g0 + (g1 - g0) * e - Dsit - 480 * Math.sin(PI * q); rr = -4 * PI * e; }
  // rodeo sway on the crate
  if (t >= 48.6 && t < 51.8 && cr) { const en = wnd(48.7, 51.7, t, 0.3); rr += (0.07 + 0.09 * ss(49.5, 51.5, t)) * Math.sin(t * 11) * en; x = cr.x + 14 * Math.sin(t * 9) * en; }
  const walk = mov ? x0 * 0.045 : null;
  const sweat = Math.min(1, 0.7 * sh + 0.6 * Math.min(1, strain));
  return { x, y, ground: y + D2 * Math.cos(rr), S: SAMS, face: -1, sx, sy, rot: rr, wob: 0.01, sw: { mode: 'none' }, band: { a: 1, wind: 0.25 + 0.6 * sh + 0.4 * Math.min(1, strain) + (mov ? 0.6 : 0) }, a: 1, walk, w: 0, sneeze: 0, kick: 0, cold: 0, sad: 0, sweat, strain: Math.min(1, strain), shock: sh, sit, x0, pan, gy };
}
// mouth opening windows [a, b, peak]
const MOUTHW = [[1.5, 2.5, 0.9], [20.4, 21.4, 0.4], [23.1, 23.9, 0.9], [27.4, 28.0, 0.9], [37.0, 38.0, 1], [50.4, 51.4, 1], [51.8, 53.0, 1], [66.9, 67.4, 0.8], [76.4, 77.2, 0.8], [80.2, 80.9, 1], [84.6, 86.2, 0.9], [94.3, 95.0, 1], [99.0, 100.2, 1], [120.0, 124.0, 0.8], [129.5, 131.5, 0.8], [141.0, 142.0, 0.8]];
const mouthAt = (t) => { let m = 0; for (const [a, b, p] of MOUTHW) if (t > a && t < b) m = Math.max(m, p * Math.sin(PI * (t - a) / (b - a))); return m; };

// ---------- eyes ----------
const SEW = [ // [a, b, props, look]
  [4.0, 6.95, { closed: 1, squeeze: 0.2 }], [8.7, 9.95, { closed: 1, squeeze: 0.2 }], [7.8, 8.6, { open: 0.5 }], [10.1, 10.8, { wide: 0.9 }], [11.0, 13.1, { angry: 0.7, open: 0.55 }],
  [13.7, 14.8, { happy: 0.8 }], [18.9, 19.5, { angry: 0.4, open: 0.6 }], [27.6, 29.0, { open: 0.45, dizzy: 1 }], [34.0, 35.4, { angry: 0.4, open: 0.65 }], [38.0, 40.5, { open: 0.5 }], [43.6, 44.9, { open: 0.45 }],
  [55.2, 56.3, { closed: 1, squeeze: 0.3 }], [56.3, 57.4, { angry: 0.6, open: 0.6 }], [76.6, 77.4, { happy: 0.9 }], [91.8, 93.8, { closed: 1, squeeze: 0.3 }], [96.2, 98.0, { open: 0.4 }], [131.0, 134.5, { closed: 1, squeeze: 1 }], [143.0, 150, { closed: 1, squeeze: 0.3 }], [139.0, 142.5, { happy: 0.5 }],
];
function samEyesAt(t, sam, g, D, C) {
  const P = [g.X(-0.16, 0.26), g.X(0.46, 0.26)];
  let tg = [D.x, D.y - 40];
  if ((t >= 6.5 && t < 7.5) || (t >= 9.5 && t < 10.5) || (t >= 28 && t < 29) || (t >= 55.5 && t < 57) || (t >= 93.5 && t < 95)) tg = [C.x, C.y - 60];
  if (t >= 73.6 && t < 76.4) tg = [sam.x + 40 * Math.sin(t), -300]; if (t >= 77.6 && t < 80.2) tg = [sam.x, -300];
  if (t >= 59.4 && t < 66) { const b = ballAt(t); tg = [b.x, b.y]; }
  if (t >= 100.5 && t < 107) tg = [C.x, C.y - 100]; if (t >= 107.0 && t < 111) tg = [C.x, C.y]; if (t >= 116.3 && t < 129) tg = [870, BOARD - 60];
  if (t >= 111 && t < 116.2) tg = [C.x, C.y - 40];
  let ov = {}; for (const [a, b, o] of SEW) if (t >= a && t < b) ov = Object.assign({}, ov, o);
  return P.map((p) => { const dx = tg[0] - p[0], dy = tg[1] - p[1], l = Math.hypot(dx, dy) || 1;
    return Object.assign({ open: 0.9 - 0.05 * Math.sin(t * 3), wide: 0.4 + 0.55 * sam.shock, sad: 0.5 * sam.strain, look: [clamp(dx / l * 1.05, -1, 1), clamp(dy / l * 1.05, -1, 1)], closed: 0, squeeze: Math.min(1, sam.strain * 1.1), happy: 0, angry: 0 }, ov); });
}

// ---------- cat ----------
const CX = [[0, 1000], [13.1, 1000], [13.45, 1035], [14.7, 1035], [15.0, 1000], [40.6, 1000], [41.0, 965], [43.6, 965], [44.0, 1000], [150, 1000]];
const CATLEAP = [[13.1, 45, 0.35], [14.7, 20, 0.3], [40.6, 40, 0.4], [43.6, 40, 0.4], [53.0, 90, 0.45], [76.4, 40, 0.3], [94.4, 24, 0.3]];
const SWAT = [6.9, 9.9, 28.6, 41.2, 41.5, 41.8, 42.1, 42.4, 56.0, 60.5, 61.2, 62.8, 64.6, 93.95];
function swatAt(t) { let k = 0; for (const t0 of SWAT) { const wind = ss(t0 - 0.45, t0 - 0.08, t) * (1 - ss(t0 - 0.08, t0 - 0.02, t)) * -0.25, hit = ss(t0 - 0.08, t0 + 0.06, t) * (1 - ss(t0 + 0.12, t0 + 0.55, t)); k += wind + hit; } return clamp(k, -0.3, 1); }
function catAt(t, D, sam) {
  let x = k1(CX, t), up = 0, rot = 0, sleep = 0, wide = 0.12, sqx = 1, sqy = 1, tail = 0.12;
  for (const l of CATLEAP) up += arc(t, l[0], l[1], l[2]);
  const sw = swatAt(t);
  x -= 22 * Math.max(0, sw); rot -= 0.07 * Math.max(0, sw);
  let y = FL; let ridden = false;
  if (t >= 100.9 && t < 101.6) { const q = ss(100.9, 101.5, t); sqy = 1 - 0.22 * q; sqx = 1 + 0.12 * q; }
  if (t >= 101.6 && t < 102.3) { const q = (t - 101.6) / 0.7, top = dPt(dState(102.3), -PI / 2, 0.97); x = 1000 + (top[0] - 1000) * ss(0, 1, q); y = FL + (top[1] - FL) * ss(0, 1, q) - 150 * Math.sin(PI * q); rot = -0.5 * (1 - q); sqy = 1.12; sqx = 0.92; ridden = true; }
  if (t >= 102.3 && t < 106.4) { const top = dPt(D, -PI / 2, 0.97); x = top[0]; y = top[1] + 16; rot = D.th * 0.85; ridden = true; wide = 0.4; }
  if (t >= 106.4 && t < 107.2) { const q = (t - 106.4) / 0.8, a = dPt(dState(106.4), -PI / 2, 0.97), b = [880, FL - 190]; x = a[0] + (b[0] - a[0]) * ss(0, 1, q); y = a[1] + (b[1] - a[1]) * ss(0, 1, q) - 70 * Math.sin(PI * q) + 110 * q * q; rot = 0.8 * q; ridden = true; wide = 0.9; }
  if (t >= 107.2 && t < 110.8) { x = sam.x + 128; y = sam.y + 150 + 3 * Math.sin(t * 5); rot = 0.12; ridden = true; sleep = ss(107.4, 108.2, t); wide = 0.1; }
  if (t >= 110.8) { x = CUSH - 85; y = FL - 20; sleep = 1; ridden = true; sqy = 1 - 0.02 * Math.sin(t * 2.2); }
  if (t >= 125.4 && t < 138.6) { sleep = 1 - ss(125.4, 125.9, t); wide = 0.7 * ss(125.4, 126.2, t); }
  if (t >= 138.6) sleep = ss(138.6, 139.8, t);
  if (!ridden) { y = FL - up; if (t > 44.0 && t < 100.9 || true) { } }
  let look = [-0.7, 0.1];
  if (t >= 59 && t < 66.5) { const b = ballAt(t); look = [clamp((b.x - x) / 200, -1, 1), clamp((b.y - y) / 200, -1, 1) + 0.2]; }
  if (t > 72 && t < 90) wide = 0.3; if (t >= 76.2 && t < 82) wide = 0.7; if (t >= 12.5 && t < 15.5) wide = 0.6; if (t >= 36.8 && t < 38.5) wide = 0.8; if (t >= 52.8 && t < 54) wide = 0.9;
  return { x, y, rot, sleep, wide, look, sw, sqx, sqy, tail };
}
const CATY = -2;   // pose origin -> floor calibration (checked on stills)

// ---------- props ----------
function crateAt(t) {
  if (t < 47.1 || t > 53.3) return null;
  if (t < 47.5) { const x0 = sxAt(47.1), q = ss(47.1, 47.5, t); return { x: x0 + (745 - x0) * q, bot: (FL - 330) + 330 * q * q, rot: 0.25 * (1 - q), air: 1 }; }
  if (t < 51.8) { const hop = arc(t, 48.9, 40, 0.4) + arc(t, 50.3, 90, 0.55) + arc(t, 51.6, 170, 0.5); const tilt = 0.05 * Math.sin(t * 13) * (hop > 1 ? 1 : 0) + 0.2 * (t > 51.6 ? Math.sin(PI * (t - 51.6) / 0.5) : 0); return { x: 745, bot: FL - hop, rot: tilt, air: 0 }; }
  const q = (t - 51.8) / 1.5; return { x: 745 + 900 * q, bot: FL - 380 * Math.sin(PI * Math.min(1, q) * 0.9) + 90 * q * q, rot: 7 * q, air: 1 };
}
function drawCrate(c, x, bot, rot) {
  c.save(); c.translate(x, bot); c.rotate(rot); const w = 390, h = 360;
  c.fillStyle = '#A57B4A'; c.fillRect(-w / 2, -h, w, h); c.strokeStyle = INKC; c.lineWidth = 6; c.strokeRect(-w / 2, -h, w, h);
  c.fillStyle = '#8A6038'; c.fillRect(-w / 2, -h, w, 34); c.strokeRect(-w / 2, -h, w, 34);
  c.strokeStyle = 'rgba(60,38,20,0.6)'; c.lineWidth = 4; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(-w / 2, -h + 34 + (h - 34) * i / 4); c.lineTo(w / 2, -h + 34 + (h - 34) * i / 4); c.stroke(); }
  c.lineWidth = 7; c.beginPath(); c.moveTo(-w / 2 + 14, -h + 40); c.lineTo(w / 2 - 14, -14); c.moveTo(w / 2 - 14, -h + 40); c.lineTo(-w / 2 + 14, -14); c.stroke();
  c.fillStyle = '#3A2A1C'; for (const [px, py] of [[-170, -h + 17], [170, -h + 17], [-170, -22], [170, -22]]) { c.beginPath(); c.arc(px, py, 7, 0, 7); c.fill(); } c.restore();
}
const BALL = [ // [t0, t1, x0, y0, x1, y1, h]
  [59.4, 60.5, 520, FL - 38, 950, FL - 38, 0], [60.5, 61.2, 950, FL - 38, 950, FL - 38, 0], [61.2, 61.75, 950, FL - 38, 905, FL - 60, 6], [61.75, 62.5, 905, FL - 60, 955, FL - 38, 30], [62.5, 62.8, 955, FL - 38, 955, FL - 38, 0],
  [62.8, 63.35, 955, FL - 38, 905, FL - 110, 18], [63.35, 64.5, 905, FL - 110, 950, FL - 38, 60], [64.5, 64.6, 950, FL - 38, 950, FL - 38, 0], [64.6, 65.05, 950, FL - 38, 900, FL - 160, 10], [65.05, 66.0, 900, FL - 160, 800, 1050, 140], [66.0, 66.9, 800, 1050, 470, 1018, 120],
  [66.9, 67.6, 470, 1018, 320, FL - 38, 90], [67.6, 68.6, 320, FL - 38, 250, FL - 38, 0], [68.6, 200, 250, FL - 38, 250, FL - 38, 0]];
function ballAt(t) {
  if (t < 59.4) return { x: sxAt(t) + 95, y: FL - 150, rot: 0, vis: t >= 58.9 };
  for (const b of BALL) if (t >= b[0] && t < b[1]) { const q = (t - b[0]) / (b[1] - b[0]); return { x: b[2] + (b[4] - b[2]) * q, y: b[3] + (b[5] - b[3]) * q - b[6] * Math.sin(PI * q) * 1.4, rot: q * 5 + b[0] * 3, vis: true }; }
  return { x: 250, y: FL - 38, rot: 0, vis: true };
}
function threadPts(t) { const b = ballAt(t), a0 = [985, FL - 14], pts = [], dist = Math.hypot(b.x - a0[0], b.y - a0[1]); for (let i = 0; i <= 16; i++) { const u = i / 16; pts.push([a0[0] + (b.x - a0[0]) * u, Math.min(FL - 6, a0[1] + (b.y - a0[1]) * u + (40 + 0.12 * dist) * Math.sin(PI * u))]); } return pts; }
const sandCapK = (t) => k1([[0, 0], [37.3, 0], [37.8, 1], [40.2, 1], [40.8, 0], [42.6, 0], [43.0, 1], [44.9, 1], [45.2, 0], [150, 0]], t);

// ---------- hands ----------
function handsAt(t, sam, g, D, C) {
  const rel = (dx, dy) => [sam.x + dx, sam.y + dy], R0 = g.X(-1.36, 0.88), L0 = g.X(1.36, 0.88), q = (a, b) => ss(a, b, t);
  let L = null, R = null;
  if (t >= 12.6 && t < 14.1) { const tp = ss(12.6, 13.1, t); R = lerp2(R0, dPt(D, -2.55, 0.92), tp); L = lerp2(L0, dPt(D, -2.1, 0.96), tp); if (t > 13.9) { const b = ss(13.9, 14.1, t); R = lerp2(R, rel(40, 20), b); L = lerp2(L, rel(52, 22), b); } }
  else if (t >= 14.0 && t < 14.6) { const p = Math.abs(Math.sin((t - 14.0) * 18)); R = rel(40 + 22 * p, 22); L = rel(86 - 18 * p, 22); }
  if (t >= 16.0 && t < 17.0) { R = rel(-95, -75); L = rel(95, -75); } else if (t >= 17.0 && t < 17.5) { R = rel(150, -120); L = rel(115, -145); }
  if (t >= 20.3 && t < 21.4) { R = rel(-105, -75); L = rel(105, -75); } else if (t >= 21.4 && t < 21.9) { R = rel(150, -120); L = rel(110, -140); }
  if (t >= 24.6 && t < 25.5) { R = rel(120, 30); L = rel(90, 40); }
  if (t >= 25.5 && t < 27.4) { const pull = q(25.6, 26.2); R = rel(110 - 10 * pull, 10); L = rel(80 - 10 * pull, 30); }
  if (t >= 27.4 && t < 28.0) { R = rel(120, 10); L = rel(100, 30); }
  if (t >= 31.0 && t < 32.0) { R = rel(125, 40); L = rel(95, 55); } else if (t >= 32.0 && t < 32.6) { const sw_ = q(32.0, 32.3); R = rel(125 + 30 * sw_, 40 - 90 * sw_); L = rel(95 + 30 * sw_, 55 - 80 * sw_); }
  if (t >= 33.9 && t < 36.2) { const pt = Math.max(0, Math.sin((t - 34.2) * 2 * PI / 0.4)); const m = [DX0 - 95, FL - 70]; R = [m[0] + 10, m[1] - 30 - 40 * pt]; L = [m[0] - 60, m[1] + 10 - 30 * pt]; }
  if (t >= 36.2 && t < 37.0) { R = rel(60, 60); L = rel(40, 70); }
  if (t >= 45.9 && t < 47.1) { R = rel(-105, -75); L = rel(105, -75); } else if (t >= 47.1 && t < 47.6) { R = rel(150, -110); L = rel(110, -130); }
  if (t >= 49.2 && t < 51.8) { const wv = Math.sin(t * 10); R = rel(-70, -95 + 6 * wv); L = rel(110 + 20 * wv, -150 - 40 * Math.abs(wv)); }
  if (t >= 51.8 && t < 53.3) { R = rel(-120, -120); L = rel(120, -130); }
  if (t >= 58.5 && t < 59.5) { R = rel(120, 55); L = rel(88, 70); } else if (t >= 59.5 && t < 60.0) { R = rel(150, 80); L = rel(110, 90); }
  if (t >= 66.8 && t < 69.9) { R = rel(95, 5 + 6 * Math.sin(t * 25)); L = rel(100, 40 + 5 * Math.sin(t * 23)); }
  if (t >= 72.4 && t < 73.1) { R = rel(-105, -75); L = rel(105, -75); } else if (t >= 73.1 && t < 73.8) { const u = q(73.1, 73.6); R = rel(-105, -75 - 10 * u); L = rel(105, -75 - 10 * u); } else if (t >= 73.8 && t < 74.3) { R = rel(-60, -190); L = rel(60, -190); }
  if (t >= 76.5 && t < 77.4) { const cheer = Math.abs(Math.sin((t - 76.5) * 9)); R = rel(-90, -120 - 30 * cheer); L = rel(90, -120 - 30 * cheer); }
  if (t >= 80.6 && t < 81.0) { R = rel(-130, -100); L = rel(130, -100); }
  if (t >= 84.0 && t < 84.45) { R = rel(-110, 30); L = rel(110, 30); } if (t >= 84.6 && t < 86.4) { R = rel(-30, 150); L = rel(40, 100); }
  if (t >= 90.3 && t < 93.9) { R = rel(-120, 80); L = rel(120, 70); }
  if (t >= 94.5 && t < 98.0) { const a = q(95.2, 95.8) * (1 - q(97.0, 97.5)); R = rel(-130 - 30 * a, 60 - 190 * a); L = rel(130, 60); }
  if (t >= 100.5 && t < 106.4) { const wv = Math.sin(t * 7); R = rel(-130, -20 + 15 * wv); L = rel(130, -20 - 15 * wv); }
  if (t >= 106.4 && t < 107.2) { R = rel(-130, 30); L = rel(150, 60); } if (t >= 107.2 && t < 110.8) { R = rel(70, 60); L = rel(30, 70); }
  if (t >= 110.8 && t < 116.0) { const u = q(110.8, 111.4); R = lerp2(rel(70, 60), R0, u); L = lerp2(rel(30, 70), L0, u); }
  if (t >= 116.0 && t < 119.8) { R = rel(-115, 30); L = rel(115, 30); } if (t >= 119.8 && t < 125.0) { const j = Math.max(arc(t, 120.0, 1, 0.5), arc(t, 121.7, 1, 0.5), arc(t, 123.3, 1, 0.5)); R = rel(-150, 40 - 280 * j); L = rel(150, 40 - 280 * j); }
  if (t >= 125.0 && t < 129.0) { R = dPt(D, -2.7, 0.9); L = dPt(D, -2.2, 0.95); }
  if (t >= 129.0 && t < 134.4) { R = rel(-70, -130); L = rel(70, -130); }
  if (t >= 138.0 && t < 140.4) { const u = q(138.2, 139.1) * (1 - q(139.6, 140.2)); L = lerp2(L0, [DX0 - 38, D.y - 48], u); }
  return [L, R];
}

// ---------- render ----------
function ringsAt(c, x, y, k, big = 1) { tingRings(c, x, y, k, big); }
function dustAt(c, t) { for (const [td, x, y] of [[13.7, 840, FL - 8], [22.62, 560, FL - 6], [27.45, 600, FL - 8], [47.5, 745, FL - 8], [53.3, 430, FL - 10], [80.2, 330, FL - 8], [94.5, 300, FL - 8], [53.0, 1000, FL - 8]]) dust(c, x, y, (t - td) / 0.6, 1); }
function renderStory(t) {
  const D = dState(t), sam = samAt(t), g = samGeom(sam, t), C = catAt(t, D, sam), cr = crateAt(t);
  const H = handsAt(t, sam, g, D, C), eyes = samEyesAt(t, sam, g, D, C);
  const SHR = g.X(-0.85, 0.5), SHL = g.X(0.85, 0.5), reach = (sh, h, mx = 1.15 * SAMS) => { if (!h) return h; const dx = h[0] - sh[0], dy = h[1] - sh[1], l = Math.hypot(dx, dy); return l > mx ? [sh[0] + dx / l * mx, sh[1] + dy / l * mx] : h; };
  let Lh = H[0] ? reach(SHL, H[0]) : null, Rh = H[1] ? reach(SHR, H[1]) : null;
  const hands = (Lh || Rh) ? [Lh || g.X(1.36, 0.88), Rh || g.X(-1.36, 0.88)] : null;
  // ---- daruma face ----
  const dEx = { lx: 0, ly: 0, brow: 0, mad: 0, mouth: 0.35, o: 0, squeeze: 0, dizzy: 0, sleepy: 0, eyeL: ss(139.2, 139.7, t), blink: 0 };
  { let tg = [sam.x, sam.y - 60]; if (t >= 6.4 && t < 7.6 || t >= 9.4 && t < 10.6 || t >= 28.3 && t < 29.3 || t >= 55.8 && t < 57) tg = [C.x, C.y - 60]; if (t >= 59.4 && t < 66.5) { const b = ballAt(t); tg = [b.x, b.y]; } if (t >= 73.4 && t < 76.4) tg = [D.x, -300]; if (t >= 77.5 && t < 80.2) tg = [sam.x, sam.y]; if (t >= 116.3 && t < 129) tg = [870, BOARD - 60];
    const vx = tg[0] - D.x, vy = tg[1] - D.y, l = Math.hypot(vx, vy) || 1, ux = vx / l, uy = vy / l, cth = Math.cos(D.th), sth = Math.sin(D.th); dEx.lx = ux * cth + uy * sth; dEx.ly = -ux * sth + uy * cth; }
  if (Math.abs(D.th0) > 0.75 && !(t >= 129 && t < 134.5)) dEx.squeeze = 1; if (D.sq > 0.3) dEx.squeeze = 1;
  if (t >= 6.9 && t < 8.2) { dEx.brow = 0.5; dEx.mouth = 0.8; } if (t >= 9.9 && t < 11.4) { dEx.brow = 0.5; dEx.mouth = 1; }
  if (t >= 14.4 && t < 16.0) { dEx.mouth = 1; dEx.brow = 0.6; } if (t >= 18.9 && t < 20.2) { dEx.mad = 1; dEx.brow = -0.2; dEx.mouth = -0.6; dEx.squeeze = 0; }
  if (t >= 22.6 && t < 24) { dEx.mouth = 1; dEx.brow = 0.6; } if (t >= 27.4 && t < 29.5) { dEx.mouth = 1; dEx.brow = 0.6; dEx.squeeze = 0; } if (t >= 33.0 && t < 36.5) { dEx.mad = 0.6; dEx.mouth = -0.3; } if (t >= 36.2 && t < 37.0) dEx.squeeze = 1;
  if (t >= 37.8 && t < 39.2) { dEx.dizzy = 1; dEx.mouth = 0.8; } if (t >= 51.9 && t < 53.4) { dEx.mouth = 1; dEx.brow = 0.8; } if (t >= 55.6 && t < 57.3) { dEx.mad = 0.7; dEx.mouth = -0.2; dEx.squeeze = 0; }
  if (t >= 66.9 && t < 69) { dEx.mouth = 1; dEx.brow = 0.5; } if (t >= 73.5 && t < 76.4) { dEx.o = 1; dEx.brow = 1; dEx.mouth = 0; } if (t >= 77.55 && t < 79) { dEx.mouth = 1; dEx.brow = 0.8; dEx.squeeze = 0; dEx.o = 0; }
  if (t >= 80.2 && t < 84) { dEx.mouth = 1; dEx.brow = 0.7; } if (t >= 84.5 && t < 86.5) { dEx.mouth = 1; dEx.brow = 0.6; } if (t >= 94.0 && t < 96) { dEx.mouth = 1; dEx.brow = 0.5; }
  if (t >= 101.6 && t < 106.4) { dEx.mouth = 0.8; dEx.o = 0; } if (t >= 116.2 && t < 129) { dEx.mouth = 0.6; dEx.brow = 0.4; } if (t >= 129 && t < 134.5) { dEx.mad = 1; dEx.brow = -0.3; dEx.mouth = -0.5; dEx.o = 0; dEx.squeeze = 0; }
  if (t >= 134.5 && t < 139.2) { dEx.mouth = 0.2; dEx.brow = 0.3; } if (t >= 139.6) { dEx.mouth = 1; } if (t >= 141.2) dEx.sleepy = ss(141.2, 142.4, t);
  const bp = (t * 0.31 + 0.13) % 1; if (bp < 0.035) dEx.blink = Math.sin(bp / 0.035 * PI);
  const Dd = Object.assign({ r: RD }, D, { ex: dEx });
  const flashBlanket = t >= 17.5 && t < 18.7 ? 1 : 0;

  composeFrame([540, 960, 1], {
    noHalo: true,
    pre: (cx) => {
      wallBG(cx, t); floorBG(cx); sunbeam(cx); motes(cx, t);
      // floor shadows
      paperShadow(cx, D.x, FL + 6, RD * 1.1, 0.5 * (1 - Math.min(1, D.hop / 120)));
      paperShadow(cx, sam.x0, FL + 8, 150, sam.pan > 0.5 ? 0.5 : 0.55 * (sam.y > FL - 120 ? 1 : 0.4));
      if (t < 107.2 || t > 110.8) paperShadow(cx, C.x, FL + 8, 110, 0.5 * (C.y > FL - 10 ? 1 : 0.3));
      cushion(cx, CUSH, FL + 4, sam.sit > 0.3 && sam.x0 > 330 && sam.x0 < 570 ? sam.sit : (t >= 110.8 ? 0.35 : 0));
      // blanket heap
      if (t >= 19.4 && t < 22) blanketFlat(cx, 870, FL + 2, 0.08, 0.7);
      // shadow of the dropped stone
      if (t >= 74.6 && t < 76.4) { const k = ss(74.6, 76.4, t); cx.save(); cx.globalCompositeOperation = 'multiply'; cx.fillStyle = `rgba(60,42,28,${0.55 * k})`; cx.beginPath(); cx.ellipse(DX0, FL + 10, 30 + 150 * k, 10 + 24 * k, 0, 0, 7); cx.fill(); cx.restore(); }
      if (t >= 78.3 && t < 80.2) { const k = ss(78.3, 80.15, t), sx_ = k1([[78.3, DX0], [78.7, 520], [79.6, 290], [80.15, 330]], t); cx.save(); cx.globalCompositeOperation = 'multiply'; cx.fillStyle = `rgba(60,42,28,${0.55 * k})`; cx.beginPath(); cx.ellipse(sx_, FL + 10, 30 + 140 * k, 10 + 22 * k, 0, 0, 7); cx.fill(); cx.restore(); }
      // little daruma on the shelf
      for (let i = 0; i < 5; i++) { const m = miniState(i, t); const sing = t >= 116.3 && t < 134.6; const sl = t >= 141.2 ? ss(141.2, 143, t) : 0;
        daruma(cx, { x: m.x, y: m.y, r: m.r, th: m.th, ex: { lx: -0.5, ly: 0.3, mouth: 0.5, o: sing && ringK(RING_MINI[i], t, 0.3) >= 0 ? 0.7 : 0, eyeL: 1, sleepy: sl, mad: t >= 129 && t < 134.5 ? 0.8 : 0, brow: t >= 116.3 && t < 129 ? 0.4 : 0 } }, t); }
      for (let i = 0; i < 5; i++) { const m = miniState(i, t), k = ringK(RING_MINI[i], t, 0.4); if (k >= 0) tingRings(cx, m.x + m.r * 0.8, m.y - m.r * 0.9, k, 0.5); }
    },
    ink: () => {},
    chars: (cx) => {
      // ----- daruma (+ things covering it) -----
      const covered = (t >= 47.45 && t < 51.8);
      daruma(cx, Dd, t);
      { const kb = ringK(RING_BIG, t, 0.5); if (kb >= 0 && !covered) tingRings(cx, D.x + RD * 0.8, D.y - RD * 0.95, kb, 1); }
      // rope loop on the belly (act 2)
      if (t >= 25.5 && t < 30.0) { const bp_ = dPt(D, PI * 0.95, 0.98), hand = (hands ? hands[1] : g.X(-1.36, 0.88)); const slack = t < 27.0 ? 6 : 50; rope(cx, bp_, t < 27.4 ? [hand[0], hand[1]] : [sam.x + 100, FL - 30], slack);
        cx.save(); cx.translate(D.x, D.y); cx.rotate(D.th); cx.strokeStyle = '#7A5A3A'; cx.lineWidth = 11; cx.beginPath(); cx.ellipse(0, RD * 0.38, RD * 0.97, RD * 0.2, 0, 0.05, PI - 0.05); cx.stroke(); cx.strokeStyle = INKC; cx.lineWidth = 2.5; cx.setLineDash([8, 6]); cx.stroke(); cx.restore(); }
      // blanket draped over the daruma
      if (t >= 17.5 && t < 18.7) blanket(cx, D.x, D.y + 6, RD, D.th, 0.5 + 0.4 * Math.sin(t * 25) * (t > 17.9 ? 1 : 0));
      else if (t >= 18.7 && t < 19.4) { const q = ss(18.7, 19.4, t); blanket(cx, D.x + 125 * q, D.y + 6 + 22 * q * q * 5, RD, D.th + 0.9 * q, 0.5, 1 - 0.0 * q); }
      // sand mound (act 3)
      { const h = t < 37.0 ? k1([[32.3, 0], [34.0, 100]], t) * (t > 36.2 ? 1 + 0.03 * Math.sin(t * 40) : 1) : (t < 41.0 ? 22 : (t < 49 ? 22 : 0)); if (h > 1) sandMound(cx, DX0 + (t > 36.2 && t < 37.0 ? 4 * Math.sin(t * 50) : 0), FL + 4, h, 150 + (h - 22) * 0.4); }
      // crate (act 4)
      if (cr && !(t < 47.1)) drawCrate(cx, cr.x, cr.bot, cr.rot);
      // ----- cat (drawn after the samurai while he carries her) -----
      const carried = t >= 107.2 && t < 110.8;
      const drawMochi = () => { cx.save(); if (C.sqx !== 1 || C.sqy !== 1) { cx.translate(C.x, C.y + CATY); cx.scale(C.sqx, C.sqy); cx.translate(-C.x, -(C.y + CATY)); }
        drawCat(cx, Object.assign(mochi(C.x, C.y + CATY, 1.6, t, { rot: C.rot, swat: C.sw, sleep: C.sleep, wide: C.wide, look: C.look, tail: C.tail }), {}), t); cx.restore(); };
      if (!carried) drawMochi();
      // ----- ball and thread (act 5) -----
      if (t >= 58.9 && t < 72) { const b = ballAt(t), fade = 1 - ss(71, 72, t); cx.save(); cx.globalAlpha = fade; if (t >= 59.4) thread(cx, threadPts(t)); yarnBallD(cx, b.x, b.y, b.rot); cx.restore(); }
      // ----- samurai -----
      samLegs(cx, sam, t); samInk(cx, sam, t, 0.5); samOver(cx, Object.assign({}, sam, { band: { a: 0 }, e: { a: 0 }, sweat: 0, a: 0.28 }), t);
      samBand(cx, sam, t); samEyes(cx, sam, t, eyes[0], eyes[1]);
      const mw = mouthAt(t); if (mw > 0.08) { const m = g.X(0.16, 0.74), o = 0.3 + 0.9 * mw; cx.save(); cx.translate(m[0], m[1]); cx.fillStyle = '#F1E9D8'; cx.beginPath(); cx.ellipse(0, 0, SAMS * 0.12, SAMS * 0.1 * o, 0, 0, 7); cx.fill(); cx.fillStyle = '#5A1410'; cx.beginPath(); cx.ellipse(0, SAMS * 0.012, SAMS * 0.092, SAMS * 0.078 * o, 0, 0, 7); cx.fill(); cx.restore(); }
      if (carried) drawMochi();
      // tangled in the yarn (act 5): red turns around the body and a taut thread to the daruma
      if (t >= 67.6 && t < 70.0) { const a_ = ss(67.6, 68.0, t), j = 3 * Math.sin(t * 28); cx.save(); cx.globalAlpha = a_; for (const [dx, dy, ex_, ey] of [[-125, 20, 125, -24], [-120, -10, 122, 36], [-110, 50, 115, 4]]) thread(cx, [[sam.x + dx, sam.y + dy + j], [sam.x + ex_, sam.y + ey - j]], REDC2, 5); thread(cx, [[sam.x + 118, sam.y + 4], dPt(D, PI * 0.93, 0.98)], REDC2, 5); cx.restore(); }
      samArms(cx, sam, t, hands, 0.17);
      // sleep bubble from the face
      { const m = g.X(0.62, 0.44); let br = 0; if (t >= 4.2 && t < 7.0) br = 8 + 50 * ss(4.2, 6.9, t) + 3 * Math.sin(t * 2.4); else if (t >= 9.0 && t < 10.0) br = 8 + 44 * ss(9.0, 9.95, t); else if (t >= 55.0 && t < 56.1) br = 6 + 36 * ss(55.0, 56.0, t); else if (t >= 92.0 && t < 93.9) br = 8 + 40 * ss(92.0, 93.8, t); else if (t >= 143.4 && t < 149.0) br = 8 + 40 * ss(143.4, 148.6, t) + 3 * Math.sin(t * 2.4);
        bubble(cx, m[0] - 20 - br * 1.05, m[1] - br * 0.45, br); const popT = [7.0, 10.0, 56.1, 93.9, 149.0].find((p) => t >= p && t < p + 0.35); if (popT) { const k = (t - popT) / 0.35; cx.save(); cx.strokeStyle = INKC; cx.lineWidth = 4; cx.globalAlpha = 1 - k; for (let a = 0; a < 8; a++) { const an = a * PI / 4, r0 = 40 + 30 * k, r1 = r0 + 14; cx.beginPath(); cx.moveTo(m[0] - 80 + Math.cos(an) * r0, m[1] - 40 + Math.sin(an) * r0); cx.lineTo(m[0] - 80 + Math.cos(an) * r1, m[1] - 40 + Math.sin(an) * r1); cx.stroke(); } cx.restore(); } }
      // sand on his head
      { const sk = sandCapK(t); if (sk > 0.02) { const top = g.X(0.0, -1.12); cx.save(); cx.globalAlpha = sk; cx.fillStyle = '#D8C38A'; cx.strokeStyle = INKC; cx.lineWidth = 4; cx.beginPath(); cx.ellipse(top[0], top[1] - 6, 70, 34 * sk, 0, PI, 0); cx.lineTo(top[0] + 70, top[1] + 4); cx.lineTo(top[0] - 70, top[1] + 4); cx.closePath(); cx.fill(); cx.stroke(); cx.fillStyle = 'rgba(216,195,138,0.9)'; for (let i = 0; i < 9; i++) { cx.beginPath(); cx.arc(sam.x + (hash(i, 31) - 0.5) * 220, sam.y - 60 + hash(i, 32) * 200, 3 + 3 * hash(i, 33), 0, 7); cx.fill(); } cx.restore(); } }
      // held props
      const hC = (hands && hands[1]) ? hands[1] : null;
      if (t >= 16.0 && t < 17.0) blanketFlat(cx, sam.x, sam.y - 140, 0, 1);
      if (t >= 17.0 && t < 17.5) { const q = (t - 17.0) / 0.5, a = [sam.x + 40, sam.y - 150], b = [D.x, D.y - 20], p = lerp2(a, b, ss(0, 1, q)); blanketFlat(cx, p[0], p[1] - 80 * Math.sin(PI * q) + 30, q * 3, 1 - 0.0 - q); }
      if (t >= 20.2 && t < 21.4) stone(cx, sam.x, sam.y - 118, 0, 0.0);
      if (t >= 21.4 && t < 21.86) { const q = (t - 21.4) / 0.46, a = [sam.x + 40, sam.y - 130], b = [D.x, D.y - RD * 0.95 + 40], p = lerp2(a, b, ss(0, 1, q)); stone(cx, p[0], p[1] - 90 * Math.sin(PI * q) + 20, q * 2, 0); }
      if (t >= 21.86 && t < 22.6) stone(cx, D.x + 3 * Math.sin(t * 40), D.y - RD * D.sy - 6 + 60, 0, 0.0);
      if (t >= 22.6 && t < 23.1) { const q = (t - 22.6) / 0.5, a = [D.x - 30, D.y - RD * D.sy + 60], b = [545, FL], p = lerp2(a, b, q); stone(cx, p[0], p[1] - 130 * Math.sin(PI * q) * 0 + 130 * 0, -5 * q, 0); }
      if (t >= 23.1 && t < 23.6) stone(cx, 545, FL, -5, 0);
      if (t >= 24.5 && t < 25.5) { cx.save(); cx.strokeStyle = '#7A5A3A'; cx.lineWidth = 10; cx.beginPath(); cx.arc(sam.x + 100, sam.y + 50, 28, 0, 7); cx.stroke(); cx.restore(); }
      if (t >= 30.9 && t < 32.7) { const tl = ss(32.0, 32.3, t) * 0.9 * (1 - ss(32.5, 32.7, t)); bucket(cx, sam.x + 125 + 40 * tl, sam.y + 150 - 90 * tl, tl * 1.2, 1 - ss(32.2, 32.6, t)); }
      if (t >= 32.2 && t < 34.2) sandSpray(cx, sam.x + 170, sam.y - 20, (t - 32.2) / 1.5, 0.9, 16);
      if (t >= 32.7 && t < 34.0) { const q = (t - 32.7) / 1.3; bucket(cx, sam.x - 60 - 600 * q, sam.y + 150 - 420 * Math.sin(PI * Math.min(1, q)) + 400 * q * q, q * 7, 0); }
      if (t >= 45.85 && t < 47.1) drawCrate(cx, sam.x, sam.y - 118, 0);
      if (t >= 58.9 && t < 59.4) yarnBallD(cx, sam.x + 100, sam.y + 60, t * 2);
      if (t >= 72.0 && t < 73.8) stone(cx, sam.x, t < 72.9 ? sam.y - 118 : sam.y - 118 - 8 * ss(72.9, 73.6, t), 0, 0);
      if (t >= 73.8 && t < 76.4) { const q = (t - 73.8) / 0.55; if (q < 1) stone(cx, sam.x, sam.y - 118 - 1300 * q * (2 - q), 0, 0); else { const f = (t - 74.35) / (76.4 - 74.35); stone(cx, DX0, -300 + (D.y - RD * D.sy + 70 + 300) * f * f, f * 3, 0); } }
      if (t >= 76.4 && t < 77.5) stone(cx, D.x, D.y - RD * D.sy + 74 - 44 * Math.max(0, (t - 77.2) / 0.3), 0.06, 0);
      if (t >= 77.5 && t < 80.2) { const f = (t - 77.5) / (80.2 - 77.5); if (f < 0.3) { stone(cx, DX0 - 40 * f, D.y - 140 - 1400 * Math.sin(PI * f / 0.6) * 0.5 - 100, f * 6, 0); } else { const e = (f - 0.3) / 0.7; stone(cx, 650 - 320 * e, -400 + (sam.y - 60 + 400) * e * e, f * 6, 0); } }
      if (t >= 80.2 && t < 81.6) { const q = (t - 80.2) / 1.4; stone(cx, 330 - 520 * ss(0, 1, q), FL - 30 * Math.abs(Math.sin(q * 7)) * (1 - q) + 0, -q * 6, 0); }
      if (t >= 81.4) { if (t >= 81.4 && t < 82) { } }
      // bat marks and rings
      dustAt(cx, t);
      if (t >= 37.0 && t < 38.6) sandSpray(cx, D.x, D.y - 120, (t - 37.0) / 1.6, 1.0, 26);
      if (t >= 41.2 && t < 43.1) sandSpray(cx, C.x - 30, FL - 40, (t - 41.2) / 1.6, 0.8, 18); if (t >= 42.5 && t < 44.2) sandSpray(cx, C.x - 30, FL - 60, (t - 42.5) / 1.5, 1.1, 20);
      // dizzy stars
      if ((t >= 27.6 && t < 29.2) || (t >= 53.4 && t < 55.2) || (t >= 94.6 && t < 96.4) || (t >= 80.9 && t < 82.2)) { const top = g.X(0, -1.1); stars(cx, top[0], top[1] - 18, t * 0.5, 3, 62); }
      // ink drop into the blank eye
      if (t >= 138.8 && t < 139.7) { const eye = dPt(D, PI * 1.12, 0.31), q = (t - 138.8) / 0.4; const hp = (hands && hands[0]) ? hands[0] : [DX0 - 40, D.y - 90]; const fx = hp[0], fy = hp[1]; cx.fillStyle = INKC; cx.beginPath(); const dy = fy + (eye[1] - fy) * Math.min(1, q); cx.ellipse(fx + (eye[0] - fx) * Math.min(1, q), dy, 7, 11, 0, 0, 7); cx.fill(); }
    },
    over: (cx) => {
      cx.save(); cx.globalCompositeOperation = 'multiply'; const vg = cx.createRadialGradient(540, FL - 300, 420, 540, FL - 300, 1100); vg.addColorStop(0, 'rgb(255,255,255)'); vg.addColorStop(1, 'rgb(212,204,196)'); cx.fillStyle = vg; cx.fillRect(-300, -300, 1700, 2600); cx.restore();
      // quiet moments: slight dimming (sound drops, light follows)
      const dim = 0.18 * wnd(130.5, 134.4, t, 0.8) + 0.1 * wnd(111.4, 115.8, t, 0.8); if (dim > 0.01) { cx.save(); cx.globalCompositeOperation = 'multiply'; const k = Math.round(255 * (1 - dim)); cx.fillStyle = `rgb(${k},${k - 4},${k - 8})`; cx.fillRect(-300, -300, 1700, 2600); cx.restore(); }
      // fade in / out
      const fi = 1 - ss(0, 0.5, t), fo = ss(149.3, 150, t); const f = Math.max(fi, fo); if (f > 0.01) { cx.save(); cx.fillStyle = `rgba(241,233,216,${f})`; cx.fillRect(-300, -300, 1700, 2600); cx.restore(); }
    },
  });
}
function renderFrame(T) { renderStory(Math.max(0, Math.min(DUR, T))); }
