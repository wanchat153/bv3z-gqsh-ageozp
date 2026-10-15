'use strict';
// ================= "ห้องสมุดห้ามเสียงดัง" — full 150 s timeline (pure function of t) =================
const DUR = 150, PIVX = 170;
const ss = (a, b, x) => { const q = clamp((x - a) / (b - a)); return q * q * (3 - 2 * q); };
function K(keys, t) { if (t <= keys[0][0]) return keys[0].slice(1); for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const a = keys[i - 1], b = keys[i], q = ss(a[0], b[0], t); return a.slice(1).map((v, j) => v + (b[j + 1] - v) * q); } return keys[keys.length - 1].slice(1); }
const k1 = (keys, t) => K(keys, t)[0];
const imp = (t, t0, a, tau) => (t < t0 ? 0 : a * Math.exp(-(t - t0) / tau) * ss(t0, t0 + 0.04, t));
const arc = (t, t0, h, d) => (t > t0 && t < t0 + d ? h * Math.sin(Math.PI * (t - t0) / d) : 0);
const lerpA = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);

// ---------- alert / shadow from events ----------
function flashAt(t) { let m = 0; for (const [te, , f] of EV) { if (f <= 0 || t < te) continue; const d = t - te, v = f * (d < 0.35 ? 1 : Math.exp(-(d - 0.35) / 0.4)); if (v > m) m = v; } return m; }
function shockAt(t) { let m = 0; for (const [te, , f] of EV) { if (f < 0.5 || t < te) continue; const d = t - te; if (d > 3) continue; const v = f * Math.exp(-d / 1.1) * ss(te, te + 0.05, t); if (v > m) m = v; } return m; }

// ---------- giant hand ----------
const POSE = { open: [[0, 0, 0, 0, 0], 1, 0.8, 410], point: [[0.9, 0, 1.1, 1.1, 1.1], 0.2, 0.1, 400], pinch: [[0.55, 0.65, 0.2, 0.2, 0.2], 0.3, 0.2, 370], fist: [[0.9, 1.1, 1.1, 1.1, 1.1], 0, 0, 250] };
const PI = Math.PI;
const HSEG = [
  { a: 14.8, b: 21.8, s: 1.5, alert: 1, pose: [[14.8, 'point']], tip: [[14.8, 1100, -250], [16.6, 660, 770], [20.4, 660, 770], [21.8, 1100, -250]], ang: [[14.8, PI * 0.72]], wag: [17.2, 20.6, 0.16, 2.6] },
  { a: 33.0, b: 41.2, s: 1.35, alert: 1, pose: [[33, 'point']], tip: [[33, 700, -250], [34.0, 230, 840], [34.4, 230, 840], [35.4, 560, 850], [38.2, 560, 850], [41.2, 1000, -250]], ang: [[33, PI * 0.72], [35.4, PI * 0.76]], wag: [35.4, 38.4, 0.16, 2.6] },
  { a: 45.8, b: 57.2, s: 1.5, alert: 1, pose: [[45.8, 'point'], [48.0, 'point'], [48.6, 'fist'], [55.0, 'fist'], [55.8, 'open']], tip: [[45.8, 560, -300], [47.0, 640, 700], [48.0, 640, 700], [49.0, 'S', -145], [54.6, 'S', -145], [55.4, 'S', -190], [57.2, 560, -400]], ang: [[45.8, PI / 2]], stick: true },
  { a: 82.6, b: 88.4, s: 2.1, alert: 1, pose: [[82.6, 'open']], tip: [[82.6, 560, -500], [84.5, 560, 720], [87.0, 560, 720], [88.4, 560, -500]], ang: [[82.6, PI / 2]], sway: [84.5, 87, 0.04, 1.4] },
  { a: 89.5, b: 104.4, s: 1.4, alert: 0.3, pose: [[89.5, 'pinch'], [99.8, 'pinch'], [100.1, 'point'], [100.6, 'point'], [101.2, 'open']],
    tip: [[89.5, 820, -300], [91.0, 685, 1330], [91.9, 685, 1340], [92.6, 800, 1280], [93.0, 800, 1300], [93.6, 790, 1180], [94.2, 735, 1370], [94.7, 735, 1380], [95.5, 800, 1280], [95.9, 800, 1300], [96.5, 600, 1150], [97.2, 250, 1370], [97.7, 250, 1360], [98.6, 790, 1260], [99.0, 800, 1290], [99.6, 480, 1060], [100.0, 440, 1060], [100.9, 380, 1100], [101.4, 450, 1000], [104.4, 900, -300]], ang: [[89.5, PI * 0.5], [96, PI * 0.6], [100, PI * 0.55]] },
  { a: 128.2, b: 143.2, s: 1.9, alert: 1, pose: [[128.2, 'fist'], [142.0, 'fist'], [143.2, 'open']], tip: [[128.2, 900, -400], [130.4, 540, 780], [139.2, 540, 790], [139.8, 540, 790], [140.1, 540, 1130], [143.2, 540, 1000]], ang: [[128.2, PI / 2]], shake: [131, 139.4, 5] },
  { a: 143.2, b: 149.4, s: 1.4, alert: 0, pose: [[143.2, 'open']], tip: [[143.2, 820, -300], [144.0, 'S', -150], [147.4, 'S', -150], [149.4, 820, -300]], ang: [[143.2, PI / 2]], pat: [144.0, 147.2] },
];
function lerpPose(keys, t) {
  let a = keys[0], b = keys[0], q = 0; for (let i = 1; i < keys.length; i++) { if (t >= keys[i][0]) { a = keys[i]; b = keys[i]; } else { a = keys[i - 1]; b = keys[i]; q = ss(a[0], b[0], t); break; } }
  const A = POSE[a[1]], B = POSE[b[1]]; return { f: lerpA(A[0], B[0], q), spread: A[1] + (B[1] - A[1]) * q, thumbOut: A[2] + (B[2] - A[2]) * q, L: A[3] + (B[3] - A[3]) * q };
}
function handAt(t, sam) {
  for (const g of HSEG) {
    if (t < g.a || t > g.b) continue;
    const P = lerpPose(g.pose, t); let tx, ty;
    const ks = g.tip.map((k) => [k[0], k[1] === 'S' ? sam.x : k[1], k[2] < 0 && k[1] === 'S' ? sam.y + k[2] : k[2]]); [tx, ty] = K(ks, t);
    if (g.pat && t > g.pat[0] && t < g.pat[1]) ty += 26 * Math.abs(Math.sin((t - g.pat[0]) * 2 * PI * 0.85)) * -1 + 26;
    if (g.shake && t > g.shake[0] && t < g.shake[1]) { tx += g.shake[2] * Math.sin(t * 52); ty += g.shake[2] * 0.6 * Math.sin(t * 41 + 1); }
    let ang = k1(g.ang, t); if (g.wag && t > g.wag[0] && t < g.wag[1]) ang += g.wag[2] * Math.sin((t - g.wag[0]) * 2 * PI * g.wag[3] * 0.5) * ss(g.wag[0], g.wag[0] + 0.3, t) * ss(g.wag[1], g.wag[1] - 0.3, t);
    if (g.sway && t > g.sway[0] && t < g.sway[1]) ang += g.sway[2] * Math.sin(t * g.sway[3]);
    const d = [Math.cos(ang), Math.sin(ang)], L = P.L * g.s;
    return { x: tx - d[0] * L, y: ty - d[1] * L, ang, s: g.s, f: P.f, spread: P.spread, thumbOut: P.thumbOut, tip: [tx, ty], alert: g.alert * ss(g.a, g.a + 1.2, t) * ss(g.b + 0.2, g.b - 1.2, t), seg: g };
  }
  return null;
}

// ---------- samurai ----------
const SX = [[0, -170], [5, 470], [26, 470], [26.3, 470], [27.6, 100], [33.4, 100], [34.2, 100], [35.2, 470], [43, 470], [58, 470], [60, 520], [80, 520], [81, 520], [101, 520], [101.3, 120], [104.5, 120], [106.2, 300], [120, 300], [121.5, 170], [124, 170], [126, 300], [150, 300]];
const ROTK = [[0, 0], [58, 0], [60, 0.04], [62, 0.14], [75.9, 0.16], [76.1, 0], [150, 0]];
const IMPS = [[14.0, -0.2, 0.5], [31.7, -0.08, 0.3], [44.3, -0.15, 0.5], [76.0, -0.3, 0.6], [80.5, -0.4, 0.8], [101.2, -0.3, 0.3], [120.5, -0.45, 0.45], [125.8, -0.2, 0.5], [140.0, 0.12, 0.5]];
const HOPS = [[14.0, 36, 0.4], [30.4, 14, 0.25], [31.7, 14, 0.25], [33.1, 26, 0.35], [44.3, 50, 0.45], [80.5, 70, 0.55], [92.9, 18, 0.3], [95.8, 26, 0.3], [98.9, 18, 0.3], [100.2, 30, 0.35], [120.5, 40, 0.4], [125.8, 50, 0.45]];
function samAt(t) {
  const x0 = k1(SX, t), sp = (k1(SX, t + 0.05) - k1(SX, t - 0.05)) / 0.1, mov = Math.abs(sp) > 8;
  const lift = k1([[0, 0], [49.4, 0], [51.5, 360], [53.7, 360], [54.9, 0]], t);
  let hop = 0; for (const h of HOPS) hop += arc(t, h[0], h[1], h[2]);
  if (mov && lift < 1) hop += 7 + 6 * Math.abs(Math.sin(x0 * 0.045));
  const sh = shockAt(t);
  let rot = k1(ROTK, t); for (const i of IMPS) rot += imp(t, i[0], i[1], i[2]);
  // sneeze build: head back, then forward lurch
  const sn = ss(117.4, 120.4, t) * (t < 120.5 ? 1 : 0); rot += -0.12 * sn * 1 + 0.03 * Math.sin(t * 38) * sn;
  const sit = k1([[0, 0], [105.8, 0], [106.8, 1], [117.0, 1], [118, 0.2], [150, 0]], t);
  const burst = t > 120.5 ? Math.exp(-(t - 120.5) / 0.3) : 0;
  const sy = 1 - 0.17 * sit + 0.1 * sn - 0.2 * burst - 0.06 * sh + 0.012 * Math.sin(t * 2.1), sx = 1 + 0.1 * sit - 0.08 * sn + 0.18 * burst + 0.05 * sh;
  const Dd = SAMS * 1.58 * sy, strain = ss(60, 62, t) * (1 - ss(75.9, 76.1, t)) + 0.5 * sn;
  const shake = strain * 3 * Math.sin(t * 34) + (t > 125.8 && t < 128 ? 3 * Math.sin(t * 40) : 0) + (t > 131 && t < 140 ? 2.5 * Math.sin(t * 36) : 0) * 0.5;
  const walk = lift > 1 ? t * 9 : (mov ? x0 * 0.045 : null);
  const x = x0 + shake + Dd * Math.sin(rot), y = FL - Dd * Math.cos(rot) - hop - lift;
  const wob = 0;
  return { x, y, ground: FL - lift, S: SAMS, face: -1, sx, sy, rot, wob: 0.01, sw: { mode: 'none' }, band: { a: 1, wind: 0.25 + 0.7 * sh + 0.4 * strain + (mov ? 0.5 : 0) }, a: 1, walk, w: Math.max(sh * 0.9, burst * 1, sn * 0.6, strain * 0.2), sneeze: 0, kick: 0, cold: 0, sad: 0, sweat: Math.min(1, 0.7 * sh + 0.6 * strain), strain, shock: sh, sit, sn, burst, lift, x0 };
}

// ---------- props & world state ----------
const BOOK0 = { fall0: 13.0, land: 14.0, x: 685, y: FL - 14 };
const FB = [ // shelf books that fall: [landing t, shelf-local start (x,y), floor x, rot]
  { te: 60.8, sx: 70, sy: 560, fx: 140, r: 0.3 }, { te: 62.3, sx: 120, sy: 780, fx: 215, r: -0.4 }, { te: 64.0, sx: 205, sy: 330, fx: 290, r: 0.5 }, { te: 66.1, sx: 255, sy: 1000, fx: 95, r: -0.25 }];
const TILT = [[0, 0], [58, 0], [60.5, -0.03], [66, -0.09], [75.9, -0.12], [76.2, -0.12], [76.8, 0.045], [77.6, -0.02], [78.3, 0.01], [79.2, 0], [150, 0]];
function tiltAt(t) { let a = k1(TILT, t); if (t > 62 && t < 76) a += 0.004 * Math.sin(t * 30); return a; }
function shelfPt(lx, ly, tilt) { const dx = lx - PIVX, dy = ly - FL, c = Math.cos(tilt), s = Math.sin(tilt); return [PIVX + dx * c - dy * s, FL + dx * s + dy * c]; }
const GONG_REST = [250, FL - 46];
function gongAt(t, tilt) { // returns {x,y,rot,onShelf}
  const top = shelfPt(170, 196, tilt);
  if (t < 79.8) { const tee = ss(77.0, 79.6, t); const wob = t > 77.0 ? 0.18 * Math.sin((t - 77) * 6) * ss(77, 78, t) : 0; return { x: top[0] + 130 * tee * 0.55, y: top[1], rot: wob + tilt, onShelf: true, tee }; }
  const e = shelfPt(170, 196, 0); const sx = e[0] + 130 * 0.55, sy = e[1];
  if (t < 80.5) { const q = (t - 79.8) / 0.7, q2 = q * q; return { x: sx + (GONG_REST[0] - sx) * q, y: sy + (GONG_REST[1] - sy) * q2, rot: 6 * q, onShelf: false }; }
  const d = t - 80.5, bounce = d < 0.9 ? 24 * Math.abs(Math.sin(d * 3.4)) * Math.exp(-d * 2.2) : 0;
  return { x: GONG_REST[0] + 70 * ss(80.5, 81.4, t), y: GONG_REST[1] - bounce, rot: 6 + 0.1 * Math.sin(d * 18) * Math.exp(-d * 1.6), onShelf: false, rolling: d < 1.2 };
}
function hornAt(t) { // desk top -> floor, bounces; carried by the hand 94.2-95.9 into the box
  const x0 = 790, y0 = FL - 74 - 26;
  if (t < 43.2) return { x: x0, y: y0, r: 0, sq: 0, vis: 1 };
  if (t < 44.3) { const q = (t - 43.2) / 1.1; const px = x0 + (735 - x0) * ss(0, 1, q); const py = q < 0.2 ? y0 : y0 + (FL + 14 - y0) * Math.pow((q - 0.2) / 0.8, 2); return { x: px, y: py, r: -2.6 * q, sq: 0, vis: 1 }; }
  if (t < 94.2) { const d = t - 44.3; let by = 0, sq = 0; if (d < 0.45) { by = 60 * Math.sin(Math.PI * d / 0.45); sq = d < 0.08 ? 1 - d / 0.08 : 0; } else if (d < 0.8) { by = 28 * Math.sin(Math.PI * (d - 0.45) / 0.35); } return { x: 735 + 14 * ss(0, 0.8, d), y: FL + 14 - by, r: -2.6 + 0.1 * Math.min(d, 0.8), sq: (d < 0.1 ? 0.5 : 0) + (Math.abs(d - 0.45) < 0.05 ? 0.4 : 0), vis: 1 }; }
  return { x: 749, y: FL + 14, r: -2.52, sq: 0, vis: 1, hand: true };
}
const CARRY = { book: [[91.2, 92.9, 685, FL - 14, 800, FL - 30]], horn: [[94.5, 95.9, 749, FL + 14, 800, FL - 30]], gong: [[97.3, 98.9, GONG_REST[0], GONG_REST[1], 800, FL - 50]] };
function carried(t, name, hand) { for (const [a, b] of CARRY[name].map((c) => [c[0], c[1]])) { if (t >= a && t <= b && hand) return hand.tip; } return null; }
function boxX(t) { return 800 + 600 * (1 - ss(88.8, 89.8, t)); }

// ---------- cat ----------
function catAt(t) {
  let x = 880, y = FL - 90, rot = 0, wide = 0.12, sleep = 0, look = [0.3, 0.1];
  const swat = ss(42.9, 43.15, t) * (1 - ss(43.15, 43.7, t)); x -= 26 * swat; rot -= 0.08 * swat;
  if (t > 43.2 && t < 47.5) { wide = 0.25; look = [-0.4, 0.8]; }
  if (t >= 124.4) { const q = ss(124.4, 125.8, t); const b = boxX(t); const pk = Math.sin(Math.PI * clamp((t - 124.4) / 1.4)) * 190; x = 880 + (b + 10 - 880) * q; y = (FL - 90) + (FL - 8 - 8 - (FL - 90)) * q - pk; }
  if (t > 125.8) { wide = 0.6 * Math.exp(-(t - 125.8) / 2); look = [0, -0.6]; }
  if (t > 128.5 && t < 143) wide = 0.9;
  if (t >= 147) sleep = ss(147, 148.6, t);
  const gaze = (t < 100 || t > 120) ? look : [-0.5, 0.5];
  return { x, y, rot, wide, sleep, look: gaze };
}

// ---------- drawing: props ----------
function inkRect(c, x, y, w, h, fill, r = 0) { c.beginPath(); if (r) { c.roundRect(x, y, w, h, r); } else c.rect(x, y, w, h); c.fillStyle = fill; c.fill(); c.strokeStyle = INKC; c.lineWidth = 4.5; c.lineJoin = 'round'; c.stroke(); }
function drawBook(c, x, y, rot, open, flap, sc = 1) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(sc, sc);
  if (open) {
    c.fillStyle = '#7A3B2E'; c.strokeStyle = INKC; c.lineWidth = 4.5; c.lineJoin = 'round'; c.beginPath(); c.rect(-84, -52, 168, 108); c.fill(); c.stroke();
    c.fillStyle = '#F3EAD6'; c.beginPath(); c.moveTo(0, -46); c.lineTo(-76, -42); c.lineTo(-76, 48); c.lineTo(0, 52); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(0, -46); c.lineTo(76, -42); c.lineTo(76, 48); c.lineTo(0, 52); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(40,30,20,0.35)'; c.lineWidth = 3; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-64, -26 + i * 18); c.lineTo(-12, -24 + i * 18); c.moveTo(12, -24 + i * 18); c.lineTo(64, -26 + i * 18); c.stroke(); }
    if (flap > 0.01) { const a = flap * Math.PI; const px = 76 * Math.cos(a); c.fillStyle = '#FBF4E2'; c.strokeStyle = INKC; c.lineWidth = 4; c.beginPath(); c.moveTo(0, -46); c.lineTo(px, -42 - 26 * Math.sin(a)); c.lineTo(px, 48 - 26 * Math.sin(a)); c.lineTo(0, 52); c.closePath(); c.fill(); c.stroke(); }
  } else {
    inkRect(c, -60, -20, 120, 40, '#8C3B2E', 3); c.fillStyle = '#F3EAD6'; c.fillRect(-52, -8, 104, 5); c.fillRect(-52, 4, 104, 5);
  }
  c.restore();
}
function drawBell(c, x, y, rot, swing) {
  c.save(); c.translate(x, y); c.rotate(rot);
  inkRect(c, -9, 12, 18, 52, '#7A5A3A', 6); c.beginPath(); c.moveTo(-44, 14); c.quadraticCurveTo(-40, -44, 0, -50); c.quadraticCurveTo(40, -44, 44, 14); c.closePath(); c.fillStyle = '#C9A24A'; c.fill(); c.strokeStyle = INKC; c.lineWidth = 4.5; c.stroke();
  c.fillStyle = 'rgba(255,240,190,0.6)'; c.beginPath(); c.ellipse(-16, -14, 6, 14, 0.4, 0, 7); c.fill();
  c.fillStyle = INKC; c.beginPath(); c.arc(swing * 14, 24, 8, 0, 7); c.fill(); c.restore();
}
function drawHorn(c, x, y, rot, sq) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(1 + 0.25 * sq, 1 - 0.3 * sq);
  c.beginPath(); c.moveTo(-14, -6); c.lineTo(66, -34); c.lineTo(66, 34); c.lineTo(-14, 6); c.closePath(); c.fillStyle = '#C9A24A'; c.fill(); c.strokeStyle = INKC; c.lineWidth = 4.5; c.stroke();
  c.beginPath(); c.ellipse(-30, 0, 34, 28, 0, 0, 7); c.fillStyle = REDC2; c.fill(); c.stroke(); c.fillStyle = 'rgba(255,220,210,0.55)'; c.beginPath(); c.ellipse(-40, -10, 8, 12, 0.5, 0, 7); c.fill(); c.restore();
}
function drawGong(c, x, y, rot, stand) {
  c.save(); c.translate(x, y); c.rotate(rot);
  if (stand) { c.strokeStyle = INKC; c.fillStyle = '#6B4F33'; c.lineWidth = 4.5; c.fillRect(-4, 0, 8, 56); c.strokeRect(-4, 0, 8, 56); }
  const g = c.createRadialGradient(-12, -14, 4, 0, 0, 50); g.addColorStop(0, '#F2D98A'); g.addColorStop(1, '#B08A35'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 48, 0, 7); c.fill(); c.strokeStyle = INKC; c.lineWidth = 5; c.stroke();
  c.strokeStyle = 'rgba(90,60,20,0.55)'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 32, 0, 7); c.stroke(); c.fillStyle = '#8A6A25'; c.beginPath(); c.arc(0, 0, 11, 0, 7); c.fill(); c.stroke(); c.restore();
}
function drawBox(c, x, y, t, items) {
  const jig = (t > 125.8 && t < 128 ? 4 * Math.sin(t * 50) * Math.exp(-(t - 125.8) / 1.0) : 0);
  c.save(); c.translate(x + jig, y);
  if (items.book) drawBook(c, -40, -48, 0.15, false, 0); if (items.horn) drawHorn(c, 40, -44 - (jig ? 8 : 0), -0.4, 0); if (items.gong) drawGong(c, 0, -62, 0.1, false);
  inkRect(c, -115, -36, 230, 112, '#9A7448', 4); c.strokeStyle = 'rgba(60,38,20,0.5)'; c.lineWidth = 3; for (const yy of [-6, 22, 50]) { c.beginPath(); c.moveTo(-112, yy); c.lineTo(112, yy); c.stroke(); }
  c.fillStyle = '#6B4F33'; c.fillRect(-115, -36, 230, 12); c.strokeRect(-115, -36, 230, 12); c.restore();
}
function drawChest(c, t) {
  const ex = k1([[0, 0], [34.9, 0], [36.1, 1], [37.0, 1], [37.5, 0]], t), cx = 620, cy = FL - 52;
  c.save(); c.translate(cx, cy);
  inkRect(c, -76, -52, 152, 104, '#9A7448', 3);
  c.fillStyle = '#3A2A1C'; if (ex > 0.02) c.fillRect(-64, -40, 128, 26 + 8 * ex);
  const dh = 40 + 18 * ex, dyy = 2 + 12 * ex, dw = 136 + 16 * ex; inkRect(c, -dw / 2, dyy, dw, dh, '#B08A58', 3); c.fillStyle = INKC; c.beginPath(); c.arc(0, dyy + dh / 2, 6, 0, 7); c.fill(); c.restore();
}
function drawRope(c, p0, p1, slack) { const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2 + slack; c.save(); c.strokeStyle = '#7A5A3A'; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath(); c.moveTo(p0[0], p0[1]); c.quadraticCurveTo(mx, my, p1[0], p1[1]); c.stroke(); c.strokeStyle = INKC; c.lineWidth = 2.5; c.setLineDash([8, 6]); c.beginPath(); c.moveTo(p0[0], p0[1]); c.quadraticCurveTo(mx, my, p1[0], p1[1]); c.stroke(); c.restore(); }
function dust(c, x, y, k, a = 1, r = 14) { if (k <= 0 || k >= 1) return; c.save(); for (let i = 0; i < 6; i++) { const dir = i < 3 ? -1 : 1, d = k * (30 + 16 * (i % 3)) , px = x + dir * d * (0.8 + 0.3 * (i % 3)), py = y - 8 * (i % 3) - k * 20, rr = r * (0.7 + k * 1.2 + 0.2 * (i % 3)); c.fillStyle = `rgba(250,246,236,${0.7 * a * (1 - k)})`; c.beginPath(); c.arc(px, py, rr, 0, 7); c.fill(); } c.restore(); }
const DUSTS = [[14.0, 685, FL - 6], [44.3, 735, FL + 20], [54.9, 470, FL + 8], [61, 140, FL], [62.5, 215, FL], [64.2, 290, FL], [66.3, 95, FL], [80.5, 250, FL], [92.9, 800, FL - 10], [122.4, 420, FL + 4], [125.8, 800, FL - 10]];
function motes(c, t) { c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 16; i++) { const x = 300 + 480 * hash(i, 1) + 30 * Math.sin(t * 0.4 + i), y = 500 + 760 * ((hash(i, 2) + t * 0.01 * (0.4 + hash(i, 3))) % 1), a = 0.25 * (0.5 + 0.5 * Math.sin(t * 0.8 + i * 2)); c.fillStyle = `rgba(255,236,190,${a})`; c.beginPath(); c.arc(x, y, 2.5 + 2 * hash(i, 4), 0, 7); c.fill(); } c.restore(); }

// ---------- render ----------
function drawShelfAndGong(c, t, tilt, gong) {
  c.save(); c.translate(PIVX, FL); c.rotate(tilt); c.translate(-PIVX, -FL); bookshelf(c, -20, 240, 360, FL - 240, 1);
  c.fillStyle = '#3A2A1C'; for (const b of FB) if (t > b.te - 0.78) c.fillRect(b.sx - 2, b.sy, 30, 112);
  if (gong.onShelf && gong.tee === 0) drawGong(c, 170, 196, 0, true);
  c.restore();
  if (gong.onShelf && gong.tee > 0) drawGong(c, gong.x, gong.y, gong.rot, false);
}
function renderStory(t) {
  const sam = samAt(t), tilt = tiltAt(t), gong = gongAt(t, tilt), HND = handAt(t, sam), horn = hornAt(t), cat = catAt(t), flash = flashAt(t);
  const alert = Math.max(flash, HND ? HND.alert : 0), shadow = Math.min(1, Math.max(HND ? 0.55 * HND.alert : 0, 0.5 * flash, k1([[0, 0], [79.9, 0], [80.6, 0.9], [86, 0.9], [89, 0.2], [90, 0]], t)));
  const g = samGeom(sam, t), SHR = g.X(-0.85, 0.5), SHLf = g.X(0.85, 0.5);
  const reach = (sh, h, mx = 1.15 * SAMS) => { const dx = h[0] - sh[0], dy = h[1] - sh[1], l = Math.hypot(dx, dy); return l > mx ? [sh[0] + dx / l * mx, sh[1] + dy / l * mx] : h; };
  // ---- grips ----
  let R = g.X(-1.36, 0.88), Lh = g.X(1.36, 0.88), item = null, itemR = 0;   // R = screen-right hand (face=-1 mirrors g.X)
  const ig = [sam.x + 175, sam.y + 20];
  // book reading (act 1)
  if (t >= 5.6 && t < 13.0) { const pop = ss(5.6, 6.2, t), sh = 12.4 < t ? 3 * Math.sin(t * 40) * ss(12.4, 12.8, t) : 0; R = [ig[0] + sh, ig[1] + 22 + 40 * (1 - pop) + sh]; item = ['book', { open: 1, flap: t > 7.8 && t < 8.4 ? ss(7.8, 8.3, t) : 0, sc: pop }]; }
  // bell
  if (t >= 27.3 && t < 36.9) { const wipe = t > 28.0 && t < 30.2 ? Math.sin((t - 28) * 18) * 14 : 0, ring = (t > 30.4 && t < 31.3) ? 1 : (t > 31.7 && t < 32.6) ? 1 : 0, pk = ss(27.3, 28, t); R = [ig[0] + (t < 34 ? 0 : 0), ig[1] - 40 * pk + wipe * 0.6]; item = ['bell', { rot: 0.05 * Math.sin((t - 30.4) * 30) * ring + 0.12 * (wipe / 14), swing: Math.sin(t * 30) * ring }];
    if (t > 34.2 && t < 35.3) R[1] -= 10 * Math.abs(Math.sin(t * 20)); if (t > 35.2 && t < 36.9) R = [sam.x + 190, sam.y + 55]; }
  // drawer push (hand at the drawer front while it closes)
  if (t >= 37.0 && t < 37.8) { R = [sam.x + 190, sam.y + 62]; }
  // horn carry etc. handled by hand
  // rope (act 5-6): left hand holds the rope end
  const ropeOn = t >= 58.8 && t < 76.0;
  const shTop = shelfPt(335, 262, tilt);
  if (ropeOn) { Lh = reach(SHLf, [sam.x - 170, sam.y + 20 + 8 * Math.sin(t * 34) * ss(62, 64, t)]); }
  // sneeze lurch and reading book (act 8)
  let reading = false;
  if (t >= 106.4 && t < 121.2) { reading = true; const pop = ss(106.4, 107.1, t); R = [sam.x + 170, sam.y + 24 + 40 * (1 - pop)]; item = ['book', { open: 1, flap: (t > 110.8 && t < 111.4) ? ss(110.8, 111.3, t) : (t > 113.8 && t < 114.4) ? ss(113.8, 114.3, t) : 0, sc: pop }]; }
  R = reach(SHR, R); Lh = reach(SHLf, Lh);
  // eyes
  const eyeP = [g.X(-0.16, 0.26), g.X(0.46, 0.26)];
  let tg = [540, 700]; if (t < 5) tg = [540, 700]; else if (t < 12) tg = (t > 8 && t < 11) ? [560, 700] : [sam.x + 170, sam.y + 20]; else if (t > 13 && t < 14.9) tg = [BOOK0.x, BOOK0.y];
  if (HND) tg = HND.tip; else if (t > 43.1 && t < 46) tg = [horn.x, horn.y]; else if (t >= 24 && t < 26) tg = [BOOK0.x, BOOK0.y]; else if (t >= 106 && t < 121) tg = [sam.x + 170, sam.y + 30]; else if (t >= 76 && t < 80.3) tg = [gong.x, gong.y]; else if (t >= 80.3 && t < 82.5) tg = [GONG_REST[0], GONG_REST[1]]; else if (t >= 125 && t < 128) tg = [cat.x, cat.y];
  else if (t >= 58 && t < 76) tg = shTop; else if (t >= 15 && t < 33) tg = [540, 700];
  const eyes = eyeP.map((p) => { const dx = tg[0] - p[0], dy = tg[1] - p[1], l = Math.hypot(dx, dy) || 1; const happy = t > 145.4 ? ss(145.4, 146.4, t) : 0; const closed = (sam.strain > 0.55 && sam.shock < 0.1) ? 1 : 0; const sneezeClose = (t > 120.3 && t < 121.0) ? 1 : 0; return { open: 0.9 - 0.3 * sam.sn, wide: 0.4 + 0.55 * sam.shock, sad: 0.5 * Math.min(1, sam.strain), look: [clamp(dx / l * 1.05, -1, 1), clamp(dy / l * 1.05, -1, 1)], closed: Math.max(closed, sneezeClose), squeeze: Math.min(1, sam.strain * 1.1 + (t > 120.3 && t < 121 ? 1 : 0)), happy }; });
  const CAMC = [540, 960, 1];
  const takeBook = (t >= 91.2 && t <= 92.9), takeHorn = (t >= 94.2 && t <= 95.9), takeGong = (t >= 97.2 && t <= 98.9);
  const hit = HND ? HND.tip : null;
  composeFrame(CAMC, {
    noHalo: true,
    pre: (cx) => {
      wallBG(cx, t); floorBG(cx); drawShelfAndGong(cx, t, tilt, gong); readingDesk(cx, 880, FL + 6); drawChest(cx, t); motes(cx, t);
      noiseSign(cx, 540, 700, 66, alert, t);
      paperShadow(cx, sam.x0 ?? sam.x, FL + 8, 150, 0.6 * (sam.lift > 5 ? 0.3 : 1));
      // floor objects
      if (!(t >= 5.6 && t < 13.0)) { /* none */ }
      if (t >= 14.0 && !takeBook && t < 91.2) drawBook(cx, BOOK0.x, BOOK0.y, 0.12, true, 0, 0.6);
      else if (t >= 13.0 && t < 14.0) { const q = (t - 13.0), y = sam.y + 20 + (BOOK0.y - sam.y - 20) * q * q; drawBook(cx, sam.x + 175 + (BOOK0.x - sam.x - 175) * q, y, 0.12 * q + 0.8 * (1 - q) * 0, true, 0, 0.6 + 0.4 * (1 - q)); }
      if (t < 27.3) drawBell(cx, 250, FL - 24, 0, 0);
      // fallen shelf books on the floor
      FB.forEach((b, i) => { if (t < b.te) return; if (i === 0 && t >= 106.4 && t < 121.2) return; if (i === 0 && t >= 121.2) { const q = clamp((t - 121.2) / 1.2); if (q < 1) drawBook(cx, sam.x + 170 + (420 - sam.x - 170) * q, sam.y + 24 - 260 * Math.sin(Math.PI * q) + (FL - 14 - sam.y - 24) * q * q, b.r + 6 * q, true, 0, 0.6); else drawBook(cx, 420, FL - 14, 0.2, true, 0, 0.6); return; } drawBook(cx, b.fx, FL - 12, b.r, false, 0, 1); });
      // box and its items
      const bx = boxX(t); if (bx < 1300) drawBox(cx, bx, FL + 55, t, { book: t > 92.9, horn: t > 95.9, gong: t > 98.9 });
      // gong on the floor / falling, horn
      if (!gong.onShelf && !takeGong && !(t > 98.9)) drawGong(cx, gong.x, gong.y, gong.rot, false);
      if (!takeHorn && t < 95.9) drawHorn(cx, horn.x, horn.y, horn.r, horn.sq);
      // falling shelf books
      FB.forEach((b) => { const d = b.te - t; if (d > 0 && d < 0.78) { const q = 1 - d / 0.78, p0 = shelfPt(b.sx, b.sy, tilt), x = p0[0] + (b.fx - p0[0]) * q, y = p0[1] + (FL - 12 - p0[1]) * q * q; drawBook(cx, x, y, b.r * q * 6, false, 0, 1); } });
      DUSTS.forEach(([td, x, y]) => dust(cx, x, y, (t - td) / 0.6, 1));
    },
    ink: () => {},
    chars: (cx) => {
      drawCat(cx, Object.assign(mochi(cat.x, cat.y, 1.6, t, cat.wide), { rot: cat.rot, e: { sleep: cat.sleep, open: 1, wide: cat.wide, look: cat.look, dil: 0.4 + 0.5 * cat.wide, sparkle: 1 } }), t);
      samLegs(cx, sam, t); samInk(cx, sam, t, 0.5); samOver(cx, Object.assign({}, sam, { band: { a: 0 }, e: { a: 0 }, sweat: 0, a: 0.28 }), t);
      samBand(cx, sam, t); samEyes(cx, sam, t, eyes[0], eyes[1]);
      if (sam.w > 0.08) { const m = g.X(0.16, 0.74), o = 0.3 + 0.9 * sam.w; cx.save(); cx.translate(m[0], m[1]); cx.fillStyle = '#F1E9D8'; cx.beginPath(); cx.ellipse(0, 0, SAMS * 0.12, SAMS * 0.1 * o, 0, 0, 7); cx.fill(); cx.fillStyle = '#5A1410'; cx.beginPath(); cx.ellipse(0, SAMS * 0.012, SAMS * 0.092, SAMS * 0.078 * o, 0, 0, 7); cx.fill(); cx.restore(); }
      samArms(cx, sam, t, [Lh, R], 0.17);
      // held item
      if (item) { const [n, o] = item; const px = R[0] + 8, py = R[1] - 30; if (n === 'book') drawBook(cx, px, py - 6, -0.06, true, o.flap, o.sc); else if (n === 'bell') drawBell(cx, px, py - 10, o.rot, o.swing); }
      if (ropeOn) drawRope(cx, shTop, Lh, 14 * (1 - ss(62, 63, t)));
      if (t >= 76.0 && t < 77.6) { const w = Math.exp(-(t - 76) / 0.3) * 40; cx.save(); cx.strokeStyle = '#7A5A3A'; cx.lineWidth = 8; cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(Lh[0], Lh[1]); cx.quadraticCurveTo(Lh[0] - 30, Lh[1] - 40 - w, Lh[0] - 60, Lh[1] - 90 + w * Math.sin(t * 30)); cx.stroke(); cx.beginPath(); cx.moveTo(shTop[0], shTop[1]); cx.quadraticCurveTo(shTop[0] + 10, shTop[1] + 80, shTop[0] + 20 * Math.sin(t * 14), shTop[1] + 160); cx.stroke(); cx.restore(); }
      // items carried by the giant hand
      if (hit) { if (takeBook) drawBook(cx, hit[0], hit[1], 0.2, true, 0, 0.6); if (takeHorn) drawHorn(cx, hit[0], hit[1], -0.5, t > 95.5 ? 0.4 : 0); if (takeGong) drawGong(cx, hit[0], hit[1], 0.3, false); }
    },
    over: (cx) => {
      if (shadow > 0.01) { cx.save(); cx.globalCompositeOperation = 'multiply'; const sg = cx.createLinearGradient(0, -300, 0, FL + 300), k = Math.round(255 - 125 * shadow); sg.addColorStop(0, `rgb(${k},${k - 6},${k - 12})`); sg.addColorStop(1, `rgb(${255 - Math.round(60 * shadow)},${255 - Math.round(60 * shadow)},${255 - Math.round(60 * shadow)})`); cx.fillStyle = sg; cx.fillRect(-300, -300, 1700, 2600); cx.restore(); }
      if (HND) giantHand(cx, { x: HND.x, y: HND.y, ang: HND.ang, s: HND.s, f: HND.f, spread: HND.spread, thumbOut: HND.thumbOut }, t);
      cx.save(); cx.globalCompositeOperation = 'multiply'; const vg = cx.createRadialGradient(540, FL - 300, 420, 540, FL - 300, 1100); vg.addColorStop(0, 'rgb(255,255,255)'); vg.addColorStop(1, 'rgb(205,196,190)'); cx.fillStyle = vg; cx.fillRect(-300, -300, 1700, 2600); cx.restore();
    },
  });
}
function renderFrame(T) { renderStory(Math.max(0, Math.min(DUR, T))); }
