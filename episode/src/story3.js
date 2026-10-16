'use strict';
// ================= story part 3: effects, drawing, renderFrame =================
const SEW = [[0, 2.6, { open: 0.85 }], [7.9, 8.6, { happy: 0.85 }], [9.9, 12, { wide: 1 }], [18.4, 19.5, { wide: 1 }], [20.8, 21.6, { closed: 1, squeeze: 0.4 }], [23, 25.5, { wide: 1 }], [29.2, 29.8, { angry: 0.2 }], [33.35, 34.3, { wide: 0.9 }], [37.35, 38.5, { closed: 1, squeeze: 0.6 }],
  [53.9, 55.3, { happy: 0.8 }], [57.3, 58.3, { wide: 1 }], [59, 62.5, { wide: 1, sad: 0.4 }], [63.0, 64.4, { open: 0.45, dizzy: 1 }], [74.5, 75.5, { wide: 1 }], [75.5, 76.4, { happy: 0.6 }], [84.4, 85.8, { closed: 1, squeeze: 0.5 }], [87.2, 90.2, { angry: 0.5 }], [90.4, 91.5, { wide: 1 }],
  [92.6, 95.0, { open: 0.45, dizzy: 1 }], [99.6, 107, { open: 0.5 }], [108.0, 109.2, { closed: 1, squeeze: 0.2 }], [109.6, 119.5, { closed: 1, squeeze: 0.3 }], [119.6, 121, { wide: 1 }], [125.5, 133.7, { wide: 0.9 }], [135, 140, { open: 0.6 }], [140.5, 150, { closed: 1, squeeze: 0.3 }]];
const MOUTHW = [[7.9, 8.6, 0.6], [9.9, 10.8, 0.8], [18.5, 19.3, 0.9], [21.1, 21.8, 0.6], [33.4, 34.0, 0.6], [37.4, 38.3, 1.0], [54.0, 55.6, 0.8], [57.2, 58.0, 0.8], [62.7, 63.4, 0.9], [74.4, 75.0, 0.8], [84.5, 85.8, 0.9], [90.4, 91.0, 0.8], [91.5, 92.6, 1.0], [108.0, 109.0, 1.0], [119.7, 120.5, 0.6], [125.4, 126.1, 0.6], [129.0, 130.0, 0.9]];
const mouthAt = (t) => { let m = 0; for (const [a, b, p] of MOUTHW) if (t > a && t < b) m = Math.max(m, p * Math.sin(PI * (t - a) / (b - a))); return m; };
const LOOKW = [[9.8, 12, [540, 250]], [22.6, 26, [540, 250]], [40.2, 42.5, [540, 250]], [54.4, 57, [540, 250]], [71, 72.6, [620, 250]], [75.6, 76.6, [650, 300]], [88.5, 90.4, [400, 800]], [136, 140, [690, 600]], [126, 133.7, [540, 250]]];
function samEyesAt(t, sam, g, C) {
  const P = [g.X(-0.16, 0.26), g.X(0.46, 0.26)]; let tg = [700, 1090];
  if (t < 3) tg = [sam.x + 300, 1090]; if (t >= 57 && t < 66) tg = [440, 880]; if (t >= 78 && t < 84.4) tg = [C.x, C.y - 70]; if (t >= 19 && t < 21.8) tg = [C.x, C.y - 70];
  for (const [a, b, p] of LOOKW) if (t >= a && t < b) tg = p;
  const tz = tendrilAt(t); if (tz && t >= 87.8 && t < 92) tg = [tz.x, tz.y];
  let ov = {}; for (const [a, b, o] of SEW) if (t >= a && t < b) ov = Object.assign({}, ov, o);
  return P.map((p) => { const dx = tg[0] - p[0], dy = tg[1] - p[1], l = Math.hypot(dx, dy) || 1;
    return Object.assign({ open: 0.9 - 0.05 * Math.sin(t * 3), wide: 0.4 + 0.55 * sam.shock, sad: 0, look: [clamp(dx / l * 1.05, -1, 1), clamp(dy / l * 1.05, -1, 1)], closed: 0, squeeze: 0, happy: 0, angry: 0 }, ov); });
}
function blinkOv(t, eyes) { const bp = (t * 0.27 + 0.11) % 1; if (bp < 0.03) { const k = Math.sin(bp / 0.03 * PI); for (const e of eyes) if (!e.closed) e.closed = k; } return eyes; }
function samBand(ctx, st, t) {
  const g = samGeom(st, t), S = st.S, ba = st.band.a, wind = st.band.wind;
  ctx.save(); pathPoly(ctx, g.pts); ctx.clip();
  const top = [], bot = []; for (let k = 0; k <= 16; k++) { const x = -1.2 + 2.4 * k / 16; top.push(g.X(x, -0.34 + 0.1 * x * x)); bot.push(g.X(x, -0.1 + 0.1 * x * x)); }
  fillPoly(ctx, top.concat(bot.slice().reverse()), REDC2, ba); ctx.restore(); ctx.globalAlpha = 1;
  const kn = g.X(-0.72, -0.22);
  for (const [dy, ph, ln] of [[0, 0, 1], [0.1, 1.3, 0.8]]) { const tp = []; for (let k = 0; k <= 7; k++) { const q = k / 7; tp.push(g.X(-0.72 - 1.0 * q * ln - 0.15 * wind * q, -0.22 + dy + 0.35 * q * (1.2 - wind * 0.8) + Math.sin(t * 2 + q * 3 + ph) * 0.08 * (0.4 + wind) * q)); }
    brushPts(ctx, tp, { w: S * 0.09, col: REDC2, a: ba, taper: 0.45, head: 0.1, stri: 0, dry: 0, seed: 20 + ph * 7, pf: 1 }, 2); }
  ctx.globalAlpha = ba; ctx.fillStyle = REDC2; ctx.beginPath(); ctx.ellipse(kn[0], kn[1], S * 0.12, S * 0.09, 0.4, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
}
function armRim(c, g, st, hands) { // thin cool rim light so the black arms and hands read against the black body (same sun side as the scene: upper left)
  const S = st.S, sh = [g.X(0.85, 0.5), g.X(-0.85, 0.5)];
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  for (let k = 0; k < 2; k++) { const s0 = sh[k], h = hands[k], mid = [(s0[0] + h[0]) / 2, (s0[1] + h[1]) / 2 + S * 0.07];
    c.strokeStyle = 'rgba(214,226,240,0.30)'; c.lineWidth = 3.2; c.beginPath(); c.moveTo(s0[0] - 3, s0[1] - 7); c.quadraticCurveTo(mid[0] - 3, mid[1] - 8, h[0] - 3, h[1] - S * 0.13); c.stroke();
    c.fillStyle = 'rgba(230,238,250,0.5)'; c.beginPath(); c.ellipse(h[0] - S * 0.06, h[1] - S * 0.07, S * 0.045, S * 0.028, -0.6, 0, PI2); c.fill(); }
  c.restore();
}
function itemShadow(c, x, yTop, w, a = 0.3) { const h = FL + 8 - yTop; if (h < -40) return; const k = clamp(1 - h / 700); if (k <= 0.02) return; c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = `rgba(60,42,28,${a * k})`; c.beginPath(); c.ellipse(x + 10 + h * 0.06, FL + 12, w * (0.5 + 0.5 * k), w * 0.14 * (0.6 + 0.4 * k), 0, 0, PI2); c.fill(); c.restore(); }
function mochiPose(sw_) { const P = clonePose(P_SIT); if (sw_ > 0) { P.L.FN = [10, 15, 12 + 62 * sw_, -6 - 34 * sw_]; P.L.FF = [2, 15, 4 + 54 * sw_, -4 - 30 * sw_]; } return P; }
function mochi(x, y, s, t, o = {}) { const w = o.wet || 0, col = ORG.k1.map((v, i) => v * (1 - 0.2 * w) - (i === 2 ? 4 * w : 0)); return { mouth: {}, face: -1, kind: 'kit', col, sd: 3, rot: o.rot || 0, pro: 'sit', x, y, s, pose: mochiPose(o.swat || 0), e: { sleep: o.sleep || 0, open: 1, wide: o.wide ?? 0.15, look: o.look || [0.3, -0.2], dil: 0.4 + 0.5 * (o.wide || 0), sparkle: 1 }, breath: 0.02 * sw(t, 3, 0.2), tailWig: o.tail ?? 0.12, tailPh: t * 2 * Math.PI / 6.4 * 2, earTw: 0.05 * sw(t, 5, 0.4), blush: 0.5, hTilt: o.tilt ?? 0.05, mode: 'walk' }; }
function initStory(canvas) { deepFreeze(P_SIT); initEngine(canvas); initCast(); }

// ---------- particles ----------
let PARTS = null;
const gy_ = FL + 12;
function buildParts() {
  const P = [], H = (a, b) => hash(a * 7.13, b * 3.7);
  const add = (t0, x, y, vx, vy, r = 5, kind = 0) => P.push([t0, x, y, vx, vy, r, kind]);
  const burst = (t0, x, y, n, vx0, vx1, vy0, vy1, r = 5, kind = 0) => { for (let i = 0; i < n; i++) add(t0 + 0.012 * i, x + 10 * (H(t0, i) - 0.5), y, vx0 + (vx1 - vx0) * H(t0, i + 11), vy0 + (vy1 - vy0) * H(t0, i + 23), r * (0.7 + 0.6 * H(t0, i + 5)), kind); };
  const emit = (a, b, rate, fn) => { for (let te = a, i = 0; te < b; te += 1 / rate, i++) { const o = fn(te, i); if (o) add(te, o[0], o[1], o[2], o[3], o[4] || 5, o[5] || 0); } };
  const cup = (te) => { const s = samAt(te), h = handsAt(te, s, null), l = ladleAt(te, h, bucketAt(te, h)); return l ? [l.x + h.f * 26, l.y + 6, h.f] : null; };
  for (const [a, b] of [[6.9, 7.5], [15.85, 16.25], [71.0, 71.35]]) emit(a, b, 24, (te, i) => { const c = cup(te); return c ? [c[0], c[1], c[2] * (50 + 40 * H(te, 1)), 40, 5] : null; });
  for (const te of [5.2, 5.7, 6.2, 14.45, 14.95, 15.25, 18.0]) { const c = cup(te); if (c) burst(te, c[0], c[1], 3, c[2] * 20, c[2] * 70, 10, 60, 4); }
  emit(18.5, 19.35, 26, (te) => { const l = ladleAt(te, handsAt(te, samAt(te), null), { x: 420, y: 1262 }); return l ? [l.x, l.y, 50 + 80 * H(te, 2), -40 + 60 * H(te, 3), 5] : null; });
  burst(19.4, 640, 1300, 16, -140, 160, -520, -220, 6, 3); emit(19.9, 20.8, 46, (te, i) => [640 + 20 * H(te, 1), 1310 - 20 * H(te, 4), -330 - 200 * H(te, 2), -260 + 120 * H(te, 3), 5, 3]);
  burst(33.35, 800, 1150, 12, -260, 120, -560, -240, 5); burst(34.25, 428, 1168, 9, -160, 160, -420, -220, 5);
  burst(37.35, 780, 1200, 34, -520, -200, -520, -180, 6); emit(39.0, 39.4, 40, (te, i) => { const a = H(te, 9) * PI2; return [500 + 60 * Math.cos(a), 1090 + 40 * Math.sin(a), 280 * Math.cos(a), 280 * Math.sin(a) - 200, 5]; });
  // shishi pours (every tip) from the mouth of the tube
  for (const tk of TOCKS) emit(tk - 0.8, tk - 0.2, 30, (te) => { const m = mouthPos(shishiAt(te).tilt); return [m[0] + 6 * (H(te, 1) - 0.5), m[1], -40 - 40 * H(te, 2), 30, 4.5]; });
  // pole flows: water leaves the pole end
  for (const [p, tk] of [[POLES[0], 46.0], [POLES[1], 50.0], [POLES[2], 54.0]]) emit(tk - 0.55, tk - 0.2, 22, (te) => [p.endx - 4, GUT0[1] + 20, -50 - 40 * H(te, 1), 40, 5, p.id === 'B' ? 3 : 0]);
  emit(53.5, 54.4, 20, (te) => [699, GUT0[1] + 22, -30, 60, 5]);
  burst(49.75, 640, 1300, 14, -200, 200, -380, -160, 5, 3);
  emit(72.7, 74.0, 26, (te, i) => [680 - 16 * H(te, 3), 1370, -60 - 160 * H(te, 4), -300 - 120 * H(te, 5), 5, 1]);
  burst(84.4, 880, 1120, 10, -120, 220, -420, -180, 5); burst(85.0, 800, 1200, 46, -640, -140, -640, -220, 6); emit(85.6, 86.3, 40, (te) => [770 + 20 * H(te, 1), 1180, -320 - 200 * H(te, 2), -260 + 100 * H(te, 3), 5]);
  burst(63.1, 440, 1262, 8, -200, 200, -240, -90, 6, 2); burst(92.6, 160, 1262, 10, -220, 220, -260, -100, 6, 2);
  return P.sort((a, b) => a[0] - b[0]);
}
function drawParts(c, t) {
  if (!PARTS) PARTS = buildParts();
  for (const [t0, x0, y0, vx, vy, r, kind] of PARTS) {
    if (t0 > t) break; const d = t - t0; if (d > 2.2) continue;
    let x = x0 + vx * d, y = y0 + vy * d + 0.5 * G_ * d * d;
    if (kind === 2) { const a = Math.min(1, d / 0.1) * (1 - d / 0.6); if (d > 0.6) continue; c.save(); c.globalAlpha = a * 0.7; c.fillStyle = 'rgba(250,246,236,1)'; c.beginPath(); c.arc(x0 + vx * d * 0.5, y0 - 20 * d - 8, 10 + 36 * d, 0, PI2); c.fill(); c.restore(); continue; }
    const gnd = kind === 1 ? 1388 : kind === 3 ? 1392 : gy_;
    if (y > gnd) { const dd = d - Math.sqrt(Math.max(0, 2 * (gnd - y0) / G_ + (vy / G_) ** 2) - vy / G_); if ((kind === 0 || kind === 3) && dd < 0.2 && dd >= 0) { c.save(); c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 2; c.globalAlpha = 1 - dd / 0.2; c.beginPath(); c.ellipse(x, gnd, 6 + 40 * dd, 2 + 8 * dd, 0, 0, PI2); c.stroke(); c.restore(); } continue; }
    c.save(); c.fillStyle = kind === 1 ? '#8A6A44' : 'rgba(150,196,214,0.96)'; c.beginPath(); c.arc(x, y, r, 0, PI2); c.fill(); c.strokeStyle = INKC; c.lineWidth = 1.5; c.stroke();
    if (kind === 0) { c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, PI2); c.fill(); } c.restore();
  }
}
// single raindrops from the cloud: [t, x, yTarget]
const PLINKS = [[116.0, 705, 905], [118.4, 560, 880], [119.2, 740, 930], [122.0, 640, 960], [122.5, 770, 980], [123.0, 600, 910], [123.4, 705, 940], [69.6, 800, 1190]];
function drawPlinks(c, t) {
  for (const [te, x, yT] of PLINKS) { const d = t - te; if (d < -0.5 || d > 0.4) continue; if (d < 0) { const q = (d + 0.5) / 0.5, yy = cloudY(te) - 40 + (yT - cloudY(te) + 40) * q * q; c.save(); c.fillStyle = 'rgba(150,196,214,0.96)'; c.strokeStyle = INKC; c.lineWidth = 1.8; c.beginPath(); c.ellipse(x, yy, 6, 9, 0, 0, PI2); c.fill(); c.stroke(); c.restore(); }
    else { c.save(); c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 2.5; c.globalAlpha = 1 - d / 0.4; for (let i = 0; i < 6; i++) { const a = -PI + i * PI / 5; c.beginPath(); c.moveTo(x + Math.cos(a) * 8, yT + Math.sin(a) * 6); c.lineTo(x + Math.cos(a) * (14 + 30 * d), yT + Math.sin(a) * (10 + 22 * d)); c.stroke(); } c.restore(); } }
}
// ---------- cloud + tendril ----------
function cloudCol(D, k = 0) { const a = [217, 226, 232], b = [64, 72, 90], q = clamp(D); return `rgb(${Math.round(a[0] + (b[0] - a[0]) * q - 18 * k)},${Math.round(a[1] + (b[1] - a[1]) * q - 18 * k)},${Math.round(a[2] + (b[2] - a[2]) * q - 14 * k)})`; }
function cloudDraw(c, t) {
  const yb = cloudY(t), D = cloudD(t); if (yb < -90) return; const fz = t > 133.7 && t < 135.4 ? 1 : 0;
  const dr = t * 7, U = (dy) => { c.beginPath(); c.rect(-80, -500, 1240, yb + dy + 500); for (let j = Math.ceil((-160 - dr) / 70); j <= Math.floor((1240 - dr) / 70); j++) { const x = 70 * j + dr, r = 70 + 36 * hash(j, 3), cy = yb + dy - 30 + 16 * Math.sin(j * 1.7 + t * 0.35) * (0.5 + hash(j, 4)) + (fz ? 3 * Math.sin(t * 60 + x) : 0); c.moveTo(x + r, cy); c.arc(x, cy, r, 0, PI2); } };
  c.save(); U(0); c.fillStyle = cloudCol(D, 1); c.fill(); U(-30); c.fillStyle = cloudCol(D, 0.4); c.fill(); U(-64); c.fillStyle = cloudCol(D, 0); c.fill();
  c.restore();
  const fk = flashK(t); if (fk > 0.01) { c.save(); c.globalCompositeOperation = 'lighter'; const gx = 220 + (Math.floor(t * 3.1) * 173) % 640, g = c.createRadialGradient(gx, yb - 60, 10, gx, yb - 60, 380); g.addColorStop(0, `rgba(255,248,214,${0.6 * fk})`); g.addColorStop(1, 'rgba(255,248,214,0)'); c.fillStyle = g; c.fillRect(0, 0, 1080, yb + 400);
    c.strokeStyle = `rgba(255,255,240,${0.95 * fk})`; c.lineWidth = 5; c.lineJoin = 'round'; c.beginPath(); let bx = gx, by = yb - 150; c.moveTo(bx, by); for (let i = 0; i < 5; i++) { bx += (hash(Math.floor(t * 3.1), i) - 0.5) * 70; by += 28; c.lineTo(bx, by); } c.stroke(); c.restore(); }
}
function tendrilDraw(c, t) {
  const T = tendrilAt(t); if (!T || T.a <= 0.01) return; const yb = cloudY(t), D = cloudD(t), bx = clamp(T.x * 0.6 + 200, 220, 880), by = yb - 40;
  const pts = []; for (let i = 0; i <= 30; i++) { const q = i / 30, u = 1 - q; const sw1 = 70 * Math.sin(q * PI * 1.3 + t * 2.1) * (1 - q * 0.6) * T.a; const x = u * u * bx + 2 * u * q * (bx + (T.x - bx) * 0.2) + q * q * T.x + sw1 * (1 - q), y = u * u * by + 2 * u * q * (by + (T.y - by) * 0.55) + q * q * T.y; pts.push([x, y, (60 - 30 * q + (q > 0.93 ? 12 : 0)) * T.a * (1 + 0.1 * Math.sin(i * 1.9 + t * 2.5))]); }
  const puffs = pts.slice(); for (let i = 3; i < pts.length - 2; i += 3) { const [x, y, r] = pts[i], nx = (i % 2 ? 1 : -1) * r * 0.62; puffs.push([x + nx, y + r * 0.1, r * (0.55 + 0.1 * Math.sin(i + t))]); }   // side puffs break the tube outline
  c.save(); for (const [dx, dy, col, rk, ox] of [[8, 11, cloudCol(D, 1), 1, 0], [0, 0, cloudCol(D, 0.12), 1, 0], [0, 0, cloudCol(D, -0.45), 0.55, 1]]) { c.fillStyle = col; c.globalAlpha = ox ? 0.7 : 1; c.beginPath(); for (const [x, y, r] of puffs) { const ex = ox ? -r * 0.28 : 0, ey = ox ? -r * 0.34 : 0, rr = r * rk; c.moveTo(x + dx + ex + rr, y + dy + ey); c.arc(x + dx + ex, y + dy + ey, rr, 0, PI2); } c.fill(); } c.restore();
}
function castShadow(c, x, y, rx, ry, off, a) { if (a <= 0.01) return; c.save(); c.globalCompositeOperation = 'multiply'; c.translate(x + off, y); c.scale(1, ry / rx); const g = c.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, `rgba(56,40,30,${a})`); g.addColorStop(0.6, `rgba(56,40,30,${a * 0.55})`); g.addColorStop(1, 'rgba(56,40,30,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, rx, 0, PI2); c.fill(); c.restore(); }
function samRim(c, st, t) { const g = samGeom(st, t); c.save(); pathPoly(c, g.pts); c.clip(); c.translate(5, 6); c.strokeStyle = 'rgba(210,226,246,0.30)'; c.lineWidth = 6; c.lineJoin = 'round'; pathPoly(c, g.pts); c.stroke(); c.restore(); }
function rainK(t) { return lerpK([[0, 0], [121.5, 0], [123, 0.25], [126, 0.5], [130, 0.85], [133.6, 0.85], [133.8, 0], [135.6, 0], [136.6, 0.3], [140, 0.35], [145, 0.25], [150, 0.12]], t); }
function rainLayer(c, t, k) {
  if (k <= 0.02) return; const rt = t < 133.8 ? t : (t < 135.6 ? 133.8 : 133.8 + (t - 135.6)); const soft = t > 135 ? 0.6 : 1; c.save(); c.strokeStyle = `rgba(70,96,112,${0.5 * k * soft})`; c.lineWidth = 2.6; c.lineCap = 'round';
  for (let i = 0; i < 110; i++) { const sp = 1500 + 400 * hash(i, 1), x = (hash(i, 2) * 1300 - 150 + rt * 110) % 1280 - 100, y = ((hash(i, 3) * 2400 + rt * sp) % 2400) - 200; if (y < cloudY(t)) continue; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 11, y + 56); c.stroke(); } c.restore();
}
function rainbow(c, a) { if (a <= 0.01) return; const cols = ['#E4584A', '#EE9A45', '#F3D55A', '#7DBE6A', '#5FA3D8', '#7A6CC4']; c.save(); c.globalAlpha = a * 0.42; c.lineWidth = 15; for (let i = 0; i < 6; i++) { c.strokeStyle = cols[i]; c.beginPath(); c.arc(560, 1010, 520 - i * 15, PI + 0.06, PI2 - 0.06); c.stroke(); } c.restore(); }
function firefly(c, x, y, t, a = 1) { c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(x, y, 0, x, y, 30); g.addColorStop(0, `rgba(255,240,150,${0.9 * a})`); g.addColorStop(1, 'rgba(255,240,150,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, 30, 0, PI2); c.fill(); c.restore(); c.fillStyle = `rgba(255,250,200,${a})`; c.beginPath(); c.arc(x, y, 4, 0, PI2); c.fill(); }
function stars(c, x, y, k, n = 3, r = 40) { c.save(); c.translate(x, y); c.fillStyle = '#E8C55A'; c.strokeStyle = INKC; c.lineWidth = 3; for (let i = 0; i < n; i++) { const a = k * 6 + i * 6.283 / n, px = Math.cos(a) * r, py = Math.sin(a) * r * 0.4; c.save(); c.translate(px, py); c.rotate(a); c.beginPath(); for (let j = 0; j < 5; j++) { const aa = j * 1.2566 - 1.5708, a2 = aa + 0.6283; c.lineTo(Math.cos(aa) * 12, Math.sin(aa) * 12); c.lineTo(Math.cos(a2) * 5, Math.sin(a2) * 5); } c.closePath(); c.fill(); c.stroke(); c.restore(); } c.restore(); }
function dust(c, x, y, k, a = 1, r = 14) { if (k <= 0 || k >= 1) return; c.save(); for (let i = 0; i < 6; i++) { const dir = i < 3 ? -1 : 1, d = k * (30 + 16 * (i % 3)), px = x + dir * d * (0.8 + 0.3 * (i % 3)), py = y - 8 * (i % 3) - k * 20, rr = r * (0.7 + k * 1.2 + 0.2 * (i % 3)); c.fillStyle = `rgba(250,246,236,${0.7 * a * (1 - k)})`; c.beginPath(); c.arc(px, py, rr, 0, 7); c.fill(); } c.restore(); }
function sleepBubble(c, x, y, k) { const br = 6 + 30 * (0.5 + 0.5 * Math.sin(k * 1.4 - 1.4)); c.save(); c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.arc(x - 22 - br * 1.05, y - br * 0.45, br, 0, 7); c.fill(); c.strokeStyle = INKC; c.lineWidth = 3.5; c.stroke(); c.restore(); }
function fishDraw(c, x, y, rot) { c.save(); c.translate(x, y); c.rotate(rot); SH(c, (c) => { c.moveTo(-34, 0); c.quadraticCurveTo(-4, -20, 30, 0); c.quadraticCurveTo(-4, 20, -34, 0); c.closePath(); }, { f: '#C9D3DB', sh: 'rgba(60,76,96,0.45)', hl: 'rgba(255,255,255,0.55)', d: [3, 5], line: 3 }); SH(c, (c) => { c.moveTo(28, 0); c.lineTo(52, -16); c.lineTo(46, 0); c.lineTo(52, 16); c.closePath(); }, { f: '#B9C4CF', line: 3 }); c.fillStyle = INKC; c.beginPath(); c.arc(-20, -3, 3.2, 0, PI2); c.fill(); c.strokeStyle = 'rgba(70,86,106,0.6)'; c.lineWidth = 1.6; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-6 + i * 8, -9); c.quadraticCurveTo(-2 + i * 8, 0, -6 + i * 8, 9); c.stroke(); } c.restore(); }
const PUDDLES = [[29.7, 800, 70, 0], [34.3, 428, 60, 0], [37.4, 640, 130, 0], [45.85, 745, 60, 0], [49.75, 640, 80, 118], [53.8, 700, 60, 0], [85.0, 800, 150, 0], [20.8, 640, 90, 118]];
function puddles(c, t) { for (const [te, x, w, dy] of PUDDLES) { const d = t - te; if (d < 0 || d > 14) continue; const a = ss(0, 0.6, d) * (1 - ss(8, 14, d)); c.save(); c.globalAlpha = 0.34 * a; c.fillStyle = '#6D5A3C'; c.beginPath(); c.ellipse(x, FL + 22 + dy, w * (0.6 + 0.4 * ss(0, 1.5, d)), 14, 0, 0, PI2); c.fill(); c.restore(); } }

// ---------- the frame ----------
function renderFrame(T) {
  const t = clamp(T, 0, DUR); bgLayers();
  const sam = samAt(t), g = samGeom(sam, t), C = catAt(t), sap = saplingAt(t), shi = shishiAt(t), D = cloudD(t);
  const SHR = g.X(-0.85, 0.5), SHL = g.X(0.85, 0.5), reach = (sh, h, mx = 1.15 * SAMS) => { const dx = h[0] - sh[0], dy = h[1] - sh[1], l = Math.hypot(dx, dy); return l > mx ? [sh[0] + dx / l * mx, sh[1] + dy / l * mx] : h; };
  const hd = handsAt(t, sam, g); hd.R = reach(SHR, hd.R); hd.L = reach(SHL, hd.L);
  const bk = bucketAt(t, hd), ld = ladleAt(t, hd, bk), sword = swordAt(t, hd), fish = fishAt(t, hd), kasa = kasaAt(t);
  const eyes = blinkOv(t, samEyesAt(t, sam, g, C)), mouthG = g.X(0.16, 0.74);
  const glow = Math.max(ss(102, 106, t) * (1 - ss(117, 118.5, t)), ss(136, 140, t) * 0.8) * 0.9;
  const CAM = camAt(t); CAMNOW = [CAM[0], CAM[1], CAM[2]];
  composeFrame([CAM[0], CAM[1], CAM[2]], {
    noHalo: true,
    pre: (cx) => {
      cx.drawImage(BG1, 0, 0, 1080, 1920); sunBeams(cx, t);
      rainbow(cx, ss(140, 146, t) * (1 - ss(149, 150, t)));
      if (cloudY(t) > -90 || true) { const a = 1 - cloudD(t) * 1.2; if (a > 0) { softCloud(cx, 250, 250, 1.35, clamp(a)); softCloud(cx, 800, 170, 1.0, clamp(a)); softCloud(cx, 560, 420, 0.7, clamp(a * 0.8)); } }
      cx.drawImage(BG2, 0, 0, 1080, 1920); cloudDraw(cx, t);
      for (const [x, k] of [[96, 0], [152, 1]]) bambooLeaves(cx, x + 8, 150 + 80 * k, t, sap.sway * 0.3 + 0.8 * D, 1);
      bambooLeaves(cx, 120, 260, t, sap.sway * 0.3 + 0.8 * D, 1.0); bambooLeaves(cx, 194, 392, t, sap.sway * 0.3 + 0.8 * D, 0.8);
      puddles(cx, t);
      lantern(cx, 118, 1226, 0.92, glow, false); kasaDraw(cx, 118, 1226, 0.92, kasa.dx, kasa.dy, kasa.rot);
      // bucket + ladle
      if (!bk.gone && !bk.held && bk.y < 1300) bucket(cx, bk.x, bk.y, 0.8, 0.85);
      // pole stack / gutter
      for (const p of POLES) { const pp = poleAt(p, t, hd); if (pp && pp.show && !pp.carried) drawPole(cx, pp.a[0], pp.a[1], pp.b[0], pp.b[1], 22, p.id === 'B' ? '#A9B162' : '#97A85A'); }
      shishi(cx, SHX, 1262, shi.tilt, shi.fill, t, 1, SHS);
      cx.save(); cx.translate(690, 1272); cx.scale(sap.sx, sap.sy); cx.translate(-690, -1272); sapling(cx, 690, 1272, sap.g, t, sap.sway, sap.droop); cx.restore();
      castShadow(cx, sam.x0, FL + 10, 175 * (sam.pr > 0.4 ? 1.3 : 1), 26, 62, 0.5 * clamp(1 - (FL - sam.y - Dd) / 500, 0.2, 1) * (sam.y > FL - 300 ? 1 : 0.45)); castShadow(cx, C.x, C.y + 8, 112, 17, 30, 0.5 * (C.y > FL + 100 ? 1 : 0.35));
      motes(cx, t);
    },
    chars: (cx) => {
      // Mochi
      const dig = t > 72.7 && t < 74.2 ? 0.5 + 0.5 * Math.sin(t * 20) : 0;
      cx.save(); if (C.sqx !== 1 || C.sqy !== 1) { cx.translate(C.x, C.y); cx.scale(C.sqx, C.sqy); cx.translate(-C.x, -C.y); }
      drawCat(cx, mochi(C.x, C.y, 1.75, t, { rot: C.rot, sleep: C.sleep, wide: C.wide, look: C.look, tail: C.tail, wet: C.wet, swat: dig }), t); cx.restore();
      // Sam
      samLegs(cx, sam, t); samInk(cx, sam, t, 0.5 + 0.5 * sam.wet); samRim(cx, sam, t); samOver(cx, Object.assign({}, sam, { band: { a: 0 }, e: { a: 0 }, sweat: 0, a: 0.28 }), t);
      samBand(cx, sam, t); samEyes(cx, sam, t, eyes[0], eyes[1]);
      const mw = mouthAt(t); if (mw > 0.08) { const m = mouthG, o = 0.3 + 0.9 * mw; cx.save(); cx.translate(m[0], m[1]); cx.fillStyle = '#F1E9D8'; cx.beginPath(); cx.ellipse(0, 0, SAMS * 0.1 * (0.6 + 0.4 * mw), SAMS * 0.1 * o, 0, 0, 7); cx.fill(); cx.fillStyle = '#7A1B15'; cx.beginPath(); cx.ellipse(0, SAMS * 0.02, SAMS * 0.07 * (0.6 + 0.4 * mw), SAMS * 0.07 * o, 0, 0, 7); cx.fill(); cx.restore(); }
      // held / carried things (drawn before the arms so hands cover the grips)
      if (ld) { itemShadow(cx, ld.y, 70, 0.28); hishaku(cx, ld.x, ld.y, ld.ang, 0.78, ld.wat); }
      if (bk.held) bucket(cx, bk.x, bk.y, 0.8, 0.85); else if (!bk.gone && bk.y < 1000 && t >= 62.6) bucket(cx, bk.x, bk.y, 0.8, 0.85);
      for (const p of POLES) { const pp = poleAt(p, t, hd); if (pp && pp.carried) drawPole(cx, pp.a[0], pp.a[1], pp.b[0], pp.b[1], 22, '#A9B162'); }
      if (sword) drawPole(cx, sword.a[0], sword.a[1], sword.b[0], sword.b[1], 20, '#97A85A');
      if (fish) fishDraw(cx, fish.x, fish.y, fish.rot);
      samArms(cx, sam, t, [hd.L, hd.R], 0.17);
      armRim(cx, g, sam, [hd.L, hd.R]);
      if (sam.wet > 0.3) { for (const h of [hd.L, hd.R]) { cx.save(); cx.fillStyle = 'rgba(200,230,240,0.55)'; cx.beginPath(); cx.arc(h[0] - 3, h[1] - 4, SAMS * 0.1, 0, PI2); cx.fill(); cx.restore(); } }
      if (sam.wet > 0.2) { cx.save(); cx.fillStyle = `rgba(180,214,230,${0.9 * sam.wet})`; cx.strokeStyle = INKC; cx.lineWidth = 1.2; for (let i = 0; i < 6; i++) { const q = ((t * 0.9 + i * 0.37) % 1), p = g.X(-0.7 + 0.28 * i, 0.9); cx.beginPath(); cx.ellipse(p[0], p[1] + q * 40, 4, 6 + 4 * q, 0, 0, PI2); cx.fill(); cx.stroke(); } cx.restore(); }
      drawParts(cx, t); drawPlinks(cx, t);
      for (const [te] of EV.filter((e) => ['thump'].includes(e[1]))) { const d = t - te; if (d >= 0 && d < 0.6) dust(cx, te > 80 ? 170 : 440, FL + 6, d / 0.6, 0.8, 16); }
      // dizzy, sleep bubbles, fireflies
      if ((t >= 92.7 && t < 95) || (t >= 63.2 && t < 64.4)) stars(cx, sam.x, sam.y - 230, t, 3, 70);
      if ((t >= 112 && t < 119.5) || (t >= 141 && t < 150)) { const m = g.X(0.62, 0.44); sleepBubble(cx, m[0], m[1], t - 112); }
      if (t >= 104.5 && t < 118) for (let i = 0; i < 4; i++) { const a = ss(104.5 + i * 0.4, 105.5 + i * 0.4, t) * (1 - ss(115, 118, t)); firefly(cx, 160 + 700 * hash(i, 21) + 40 * Math.sin(t * 0.7 + i * 2), 900 + 300 * hash(i, 22) + 30 * Math.sin(t * 0.9 + i), t, a * (0.6 + 0.4 * Math.sin(t * 2 + i * 1.7))); }
      if (t >= 139 && t < 150) for (let i = 0; i < 6; i++) { const a = ss(139 + i * 0.3, 141 + i * 0.3, t); firefly(cx, 300 + 480 * hash(i, 31) + 30 * Math.sin(t * 0.8 + i), 800 + 320 * hash(i, 32) + 24 * Math.sin(t * 1.1 + i * 2), t, a * 0.7); }
    },
    over: (cx) => {
      tendrilDraw(cx, t); mapleBranchFG(cx, t, sap.sway * 0.3);
      rainLayer(cx, t, rainK(t));
      // darkness (storm) and dusk, flashes
      const dk = 0.34 * D; if (dk > 0.01) { cx.save(); cx.fillStyle = `rgba(26,32,52,${dk})`; cx.fillRect(-2000, -2000, 5000, 6000); cx.restore(); }
      const dusk = ss(100, 104, t) * (1 - ss(116, 118, t)) * 0.12; if (dusk > 0.005) { cx.save(); cx.fillStyle = `rgba(255,170,96,${dusk})`; cx.fillRect(-2000, -2000, 5000, 6000); cx.restore(); }
      const fk = flashK(t); if (fk > 0.01) { cx.save(); cx.fillStyle = `rgba(255,252,236,${0.26 * fk})`; cx.fillRect(-2000, -2000, 5000, 6000); cx.restore(); }
    },
  });
  const c = document.getElementById('c').getContext('2d');
  const fade = 1 - ss(0, 0.5, t) + ss(148.8, 150, t); if (fade > 0.002) { c.save(); c.fillStyle = `rgba(241,233,216,${clamp(fade)})`; c.fillRect(0, 0, 1080, 1920); c.restore(); }
}
