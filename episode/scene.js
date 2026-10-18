// scene.js — flat pastel iso props for Tofu Shop (front-elevation iso). helpers + floor cached; props below.
const C = CUE, SC = C.S;
const OUT = '#3d3042', OUTW = 2.4;
const mix = (a, b, k) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
const lit = (c, k) => mix(c, '#ffffff', k), drk = (c, k) => mix(c, '#2a1f30', k);
const COL = { floor: '#f6e9c9', floor2: '#f0e0bb', seam: '#fff6df', blue: '#cfe3f3', blueD: '#9bbad3', panel: '#b9d4ea', chrome: '#e9eff6', gasket: '#6f8398', drum: '#5a7c9d',
  pink: '#ff9db0', lemon: '#ffe28a', mint: '#9fdcc6', lav: '#c9b8ee', peach: '#ffb98a', sky: '#8cc4f0', coral: '#ff8f7d', wood: '#dcab70', woodD: '#c18a54', foam: '#fbfdff', foamS: '#dbe8f6', foamO: '#8aa0bf', basket: '#f2b27a', basketD: '#d98f55' };
const TAU = Math.PI * 2, PER = C.T;                                         // PER = 6.4 s loop; every periodic motion uses a whole number of cycles per PER
const pp = (u, h, q = 0) => C.P(u, h, q);
function poly(ctx, pts, fill, stroke = OUT, w = OUTW) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.lineWidth = w; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.stroke(); } }
function line(ctx, pts, col, w, cap = 'round') { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = cap; ctx.lineJoin = 'round'; ctx.stroke(); }
function circle(ctx, x, y, r, fill, stroke = OUT, w = OUTW) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.lineWidth = w; ctx.strokeStyle = stroke; ctx.stroke(); } }
function rrect(ctx, x, y, w, h, r, fill, stroke = OUT, lw = OUTW) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.stroke(); } }
function grad(ctx, x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
// soft floor shadow (multiply), elliptical, centre (u,q), half-widths in cm
function softShadow(ctx, u, q, ru, rq, a = 0.22, h = 0) {
  const [x, y] = pp(u, h, q), rx = ru * SC, ry = rq * C.DQ * SC; ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.translate(x, y); ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, rx * 0.15, 0, 0, rx); g.addColorStop(0, `rgba(110,98,128,${a})`); g.addColorStop(1, 'rgba(110,98,128,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, 7); ctx.fill(); ctx.restore();
}
// front-elevation box: u0..u1, h0..h1, q0 (back) .. q1 (front). Faces: top (lit), front (base).
function box(ctx, u0, u1, h0, h1, q0, q1, base, o = {}) {
  const A = pp(u0, h1, q1), B = pp(u1, h1, q1), Cc = pp(u1, h0, q1), D = pp(u0, h0, q1), A2 = pp(u0, h1, q0), B2 = pp(u1, h1, q0);
  poly(ctx, [A2, B2, B, A], o.top || lit(base, 0.5));
  poly(ctx, [A, B, Cc, D], grad(ctx, 0, A[1], 0, D[1], [[0, lit(base, 0.08)], [1, drk(base, 0.10)]]));
  ctx.strokeStyle = lit(base, 0.75); ctx.lineWidth = 1.8; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(A[0] + 3, A[1] + 4); ctx.lineTo(D[0] + 3, D[1] - 4); ctx.stroke(); ctx.globalAlpha = 1;   // left-edge highlight
}
function sparkle4(ctx, x, y, r, a) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#fffdf0'; ctx.beginPath(); for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4, rr = i % 2 ? r * 0.32 : r; ctx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); } ctx.closePath(); ctx.fill(); ctx.restore(); }

// ------------------------------------------------------------------ floor (cached): cream tiles, full screen, no plinth
let _STATIC = null;
function buildStatic() {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
  ctx.fillStyle = COL.floor; ctx.fillRect(0, 0, W, H);
  // big tiles, 24 cm: u lines vertical, q lines horizontal (front-elevation floor); checker tint is very low contrast
  const TU = 30 * SC, TQ = 30 * C.DQ * SC, x0 = C.OX - 15 * SC - TU * 3, y0 = C.Y0 - TQ * 9;
  for (let j = 0; j < 18; j++) for (let i = 0; i < 8; i++) { if ((i + j) % 2) continue; ctx.fillStyle = COL.floor2; ctx.fillRect(x0 + i * TU, y0 + j * TQ, TU, TQ); }
  ctx.strokeStyle = COL.seam; ctx.lineWidth = 3; ctx.globalAlpha = 0.9;
  for (let j = 0; j < 19; j++) { ctx.beginPath(); ctx.moveTo(0, y0 + j * TQ); ctx.lineTo(W, y0 + j * TQ); ctx.stroke(); }
  for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(x0 + i * TU, 0); ctx.lineTo(x0 + i * TU, H); ctx.stroke(); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = grad(ctx, 0, 0, 0, H, [[0, 'rgba(255,255,255,0.28)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(150,120,90,0.10)']]); ctx.fillRect(0, 0, W, H);
  return cv;
}
function floorLayer(ctx) { if (!_STATIC) _STATIC = buildStatic(); ctx.drawImage(_STATIC, 0, 0); }

// ------------------------------------------------------------------ clothesline (behind the machine, q = -9)

// ------------------------------------------------------------------ palette for this scene
Object.assign(COL, { tofu: '#fff4d9', tofuS: '#f3e0b5', water: '#bfe7ef', waterD: '#8fc9d9', bamboo: '#9fcb6e', bambooD: '#6f9f47', stone: '#c9c3cf', iron: '#5d5868', brick: '#d99a74', brickD: '#b97654', plank: '#d9a86b', plankD: '#b98448', fire: '#ffb347' });
const TRY = CUE.TR, CB = CUE.CUBES;
const wpoly = (ctx, pts, fill, st = OUT, w = OUTW) => poly(ctx, pts, fill, st, w);
function woodGrain(ctx, x0, y0, x1, y1, base, n, seed) {          // thin darker grain lines along a plank face
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip(); ctx.strokeStyle = drk(base, 0.18); ctx.lineWidth = 1.4; ctx.globalAlpha = 0.5;
  for (let i = 0; i < n; i++) { const y = y0 + (y1 - y0) * (i + 0.5) / n + (CUE.hash(seed, i) - 0.5) * 5; ctx.beginPath(); ctx.moveTo(x0, y); ctx.bezierCurveTo(x0 + (x1 - x0) * 0.3, y + 3, x0 + (x1 - x0) * 0.7, y - 3, x1, y + (CUE.hash(seed, i + 9) - 0.5) * 3); ctx.stroke(); }
  ctx.restore();
}
// ------------------------------------------------------------------ stove + iron pot (back right) with whole-cycle steam
function drawStove(ctx, s) {
  const u0 = 27, u1 = 39, q0 = -3, q1 = 5;
  softShadow(ctx, (u0 + u1) / 2, q1 + 0.6, 9.5, 3.2, 0.22);
  box(ctx, u0, u1, 0, 11, q0, q1, COL.brick, { top: lit(COL.brick, 0.35) });
  const A = pp(u0 + 2.2, 7.6, q1), B = pp(u1 - 2.2, 0.5, q1);                                  // firebox mouth with flame
  ctx.save(); ctx.beginPath(); ctx.roundRect(A[0], A[1], B[0] - A[0], B[1] - A[1], [26, 26, 0, 0]); ctx.fillStyle = '#4a2f3a'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = OUTW; ctx.stroke(); ctx.clip();
  const fx = (A[0] + B[0]) / 2, fy = B[1];
  for (let k = 0; k < 3; k++) { const ph = TAU * (s / PER * 8 + k / 3), hh = (34 + 10 * Math.sin(ph)) * (1 - 0.18 * k), ww = 22 - 4 * k, dx = (k - 1) * 14 + 4 * Math.sin(ph * 1.5);
    ctx.fillStyle = k === 0 ? '#ff8a3d' : k === 1 ? '#ffb347' : '#ffe08a'; ctx.beginPath(); ctx.moveTo(fx + dx - ww, fy); ctx.quadraticCurveTo(fx + dx - ww * 0.4, fy - hh * 0.6, fx + dx + 3 * Math.sin(ph), fy - hh); ctx.quadraticCurveTo(fx + dx + ww * 0.4, fy - hh * 0.5, fx + dx + ww, fy); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  for (let i = 0; i < 4; i++) { const p = pp(u0 + 3 + i * 3.7, 10.4, q1 - 0.3); ctx.fillStyle = drk(COL.brick, 0.25); ctx.fillRect(p[0] - 1.5, p[1] - 14, 3, 12); }          // brick joints (short ticks)
  // pot: cast-iron belly, rim, two ears, ajar wooden lid
  const cu = (u0 + u1) / 2, pq = 1.2, base = pp(cu, 11, pq), rw = 5.0 * SC;
  const X = base[0], Y = base[1];
  ctx.beginPath(); ctx.moveTo(X - rw * 0.8, Y); ctx.bezierCurveTo(X - rw * 1.2, Y - 3.5 * SC, X - rw * 1.1, Y - 9 * SC, X - rw * 0.95, Y - 11 * SC); ctx.lineTo(X + rw * 0.95, Y - 11 * SC); ctx.bezierCurveTo(X + rw * 1.1, Y - 9 * SC, X + rw * 1.2, Y - 3.5 * SC, X + rw * 0.8, Y); ctx.closePath();
  ctx.fillStyle = grad(ctx, X - rw, 0, X + rw, 0, [[0, lit(COL.iron, 0.18)], [0.5, COL.iron], [1, drk(COL.iron, 0.2)]]); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = OUTW; ctx.stroke();
  line(ctx, [[X - rw * 0.7, Y - 8.5 * SC], [X - rw * 0.78, Y - 4.5 * SC]], 'rgba(255,255,255,0.35)', 3);
  for (const sg of [-1, 1]) { ctx.beginPath(); ctx.arc(X + sg * rw * 1.08, Y - 8.4 * SC, 1.5 * SC, 0, 7); ctx.strokeStyle = OUT; ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = COL.iron; ctx.lineWidth = 3.2; ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(X, Y - 11 * SC, rw * 0.95, 1.7 * SC, 0, 0, 7); ctx.fillStyle = '#e8dcc0'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = OUTW; ctx.stroke();       // soy milk surface
  ctx.save(); ctx.translate(X + rw * 0.45, Y - 12.6 * SC); ctx.rotate(-0.34); const lw = 8.4 * SC;                                                                              // ajar lid
  ctx.beginPath(); ctx.roundRect(-lw / 2, -1.1 * SC, lw, 2.2 * SC, 7); ctx.fillStyle = COL.plank; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = OUTW; ctx.stroke(); ctx.beginPath(); ctx.arc(0, -1.9 * SC, 1.1 * SC, 0, 7); ctx.fillStyle = COL.plankD; ctx.fill(); ctx.stroke(); ctx.restore();
  // steam: 4 wisps, 3.2 s cycle (two per loop), rise + sway + fade
  for (let k = 0; k < 4; k++) { const ph = ((s / 3.2) + k / 4) % 1, a = Math.sin(Math.PI * ph) * 0.55, y0 = Y - 12.5 * SC - ph * 30 * SC, x0 = X + (k - 1.5) * 1.8 * SC;
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#ffffff'; ctx.lineCap = 'round'; ctx.lineWidth = (6 + 5 * ph) ; ctx.beginPath(); for (let i = 0; i <= 12; i++) { const v = i / 12, yy = y0 - v * 9 * SC, xx = x0 + Math.sin(v * 5 + ph * 7 + k * 1.7) * (1.2 + 1.8 * v) * SC; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); ctx.restore(); }
}
// ------------------------------------------------------------------ wooden pail + bamboo ladle (left foreground, static dressing)
function drawPail(ctx) {
  const u = -35, q = 16, w = 5, h = 9; softShadow(ctx, u, q + 0.5, 8, 3, 0.2);
  const A = pp(u - w, h, q), B = pp(u + w, h, q), Cc = pp(u + w * 0.85, 0, q), D = pp(u - w * 0.85, 0, q);
  const T1 = pp(u - w, h, q - 3.2), T2 = pp(u + w, h, q - 3.2);
  ctx.beginPath(); ctx.ellipse((A[0] + B[0]) / 2, (A[1] + T1[1]) / 2, w * SC, (A[1] - T1[1]) / 2, 0, 0, 7); ctx.fillStyle = drk(COL.plank, 0.2); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = OUTW; ctx.stroke();
  wpoly(ctx, [A, B, Cc, D], grad(ctx, A[0], 0, B[0], 0, [[0, lit(COL.plank, 0.15)], [0.6, COL.plank], [1, drk(COL.plank, 0.18)]]));
  for (const k of [0.33, 0.66]) { const a = A[0] + (B[0] - A[0]) * k; line(ctx, [[a, A[1] + 2], [a + (k - 0.5) * 8, D[1] - 2]], drk(COL.plank, 0.25), 1.6); }
  for (const hh of [2.4, 7.4]) { const k = 1 - hh / h, l = pp(u - w * (0.85 + 0.15 * (hh / h)), hh, q), r = pp(u + w * (0.85 + 0.15 * (hh / h)), hh, q); line(ctx, [l, r], drk(COL.iron, 0.1), 4); }
  ctx.beginPath(); ctx.moveTo(A[0] + 3, A[1] - 2); ctx.bezierCurveTo(A[0], A[1] - 70, B[0], B[1] - 70, B[0] - 3, B[1] - 2); ctx.strokeStyle = OUT; ctx.lineWidth = 7; ctx.stroke(); ctx.strokeStyle = COL.iron; ctx.lineWidth = 3; ctx.stroke();
}
// ------------------------------------------------------------------ back shelf rack: wooden uprights + two planks, stacked wooden moulds, a bundle of pale cloth
function drawRack(ctx, s) {
  const q = -4, ua = -14, ub = 16; softShadow(ctx, (ua + ub) / 2, q + 2.2, 15, 2.2, 0.16);
  for (const u of [ua, ub]) { const a = pp(u - 1, 0, q), b = pp(u + 1, 70, q); wpoly(ctx, [[a[0], a[1]], [b[0] - 0, b[1]], [b[0] + 2 * SC, b[1]], [a[0] + 2 * SC, a[1]]], grad(ctx, a[0], 0, a[0] + 2 * SC, 0, [[0, lit(COL.plank, 0.15)], [1, COL.plankD]])); }
  for (const h of [24, 46, 68]) box(ctx, ua - 1, ub + 1, h, h + 2, q - 2.2, q + 2.2, COL.plank);
  const molds = [[-10, 0, 24, 12, 9], [4, 0, 24, 10, 7], [-9, 0, 46, 11, 8], [6, 0, 68, 9, 6]];
  for (const [u, , h0, w, hh] of molds) { box(ctx, u, u + w, h0 + 2, h0 + 2 + hh, q - 1.6, q + 1.8, COL.plankD, { top: lit(COL.plank, 0.4) }); const a = pp(u + 1, h0 + 2 + hh * 0.55, q + 1.8), b = pp(u + w - 1, h0 + 2 + hh * 0.55, q + 1.8); line(ctx, [a, b], drk(COL.plankD, 0.3), 2.2); }
  const cb = pp(8, 48, q + 0.4); ctx.beginPath(); ctx.ellipse(cb[0], cb[1] - 18, 36, 22, 0, 0, 7); ctx.fillStyle = '#f7f1e4'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = OUTW; ctx.stroke(); line(ctx, [[cb[0] - 14, cb[1] - 26], [cb[0] + 6, cb[1] - 10], [cb[0] + 20, cb[1] - 24]], '#d9cdb0', 2.4);
  ctx.beginPath(); ctx.ellipse(pp(-3, 26, q)[0], pp(-3, 26, q)[1] - 30, 0.1, 0.1, 0, 0, 7);
}
// ------------------------------------------------------------------ shishi-odoshi: bamboo pipe + dripping, pivoting tube on a stand, stone rest
const SHD = CUE.SH, PIPE = { u0: -44, h0: 35, u1: -16.7, h1: 27.6 };
function tubeEnds(s) { const th = SHD.th(s), c = Math.cos(th), sn = Math.sin(th); return { th, L: [SHD.pu - SHD.L1 * c, SHD.ph + SHD.L1 * sn], R: [SHD.pu + SHD.L2 * c, SHD.ph - SHD.L2 * sn] }; }
function drawPipe(ctx, s) {
  const a = pp(PIPE.u0, PIPE.h0, SHD.q), b = pp(PIPE.u1, PIPE.h1, SHD.q), ang = Math.atan2(b[1] - a[1], b[0] - a[0]), len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  ctx.save(); ctx.translate(a[0], a[1]); ctx.rotate(ang);
  ctx.beginPath(); ctx.roundRect(0, -1.5 * SC, len, 3 * SC, 8); ctx.fillStyle = grad(ctx, 0, -1.5 * SC, 0, 1.5 * SC, [[0, lit(COL.bamboo, 0.35)], [0.45, COL.bamboo], [1, COL.bambooD]]); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = OUTW; ctx.stroke();
  for (const k of [0.12, 0.38, 0.64, 0.9]) { ctx.fillStyle = COL.bambooD; ctx.fillRect(len * k - 3, -1.5 * SC, 6, 3 * SC); ctx.strokeStyle = OUT; ctx.lineWidth = 1.4; ctx.strokeRect(len * k - 3, -1.5 * SC, 6, 3 * SC); }
  ctx.restore();
  const m = pp(-39, 33, SHD.q); line(ctx, [[m[0], m[1] + 14], [m[0], pp(-39, 0, SHD.q + 0.4)[1]]], COL.plankD, 12);        // thin support post
  // hanging drop at the pipe end, grows 0.4 s before every drip leaves, then falls into the tube (g)
  for (const d of CUE.DRIPS) { const t = CUE.mod(s - d, PER); if (t > PER - 0.4) { const g = (t - (PER - 0.4)) / 0.4; dropBlob(ctx, ...pp(PIPE.u1, PIPE.h1 - 0.5 - 0.3 * g, SHD.q), (0.15 + 0.35 * g) * SC); } else if (t < 0.11) dropBlob(ctx, ...pp(PIPE.u1, PIPE.h1 - 0.8 - 0.5 * 981 * t * t, SHD.q), 0.45 * SC); }
}
function dropBlob(ctx, x, y, r, a = 1) { ctx.save(); ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = 'rgba(205,236,246,0.95)'; ctx.fill(); ctx.strokeStyle = '#6d9bbd'; ctx.lineWidth = 1.8; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.28, 0, 7); ctx.fill(); ctx.restore(); }
function drawShishi(ctx, s) {
  // stand: back post + brace + stone rest under the tail
  const pv = pp(SHD.pu, SHD.ph, SHD.q), post0 = pp(SHD.pu, TRY.h, SHD.q - 1.2), post1 = pp(SHD.pu, SHD.ph - 1, SHD.q - 1.2);
  wpoly(ctx, [[post1[0] - 7, post1[1]], [post1[0] + 7, post1[1]], [post0[0] + 8, post0[1]], [post0[0] - 8, post0[1]]], grad(ctx, post0[0] - 8, 0, post0[0] + 8, 0, [[0, lit(COL.plank, 0.2)], [1, COL.plankD]]));
  line(ctx, [pp(SHD.pu - 1, 9, SHD.q - 1.2), pp(SHD.pu - 5.5, TRY.h + 0.2, SHD.q - 1.2)], OUT, 9); line(ctx, [pp(SHD.pu - 1, 9, SHD.q - 1.2), pp(SHD.pu - 5.5, TRY.h + 0.2, SHD.q - 1.2)], COL.plankD, 5);
  const rest0 = pp(SHD.pu + SHD.L2 * Math.cos(SHD.th0) - 0.4, TRY.h, SHD.q - 0.6), restH = (SHD.ph - SHD.L2 * Math.sin(SHD.th0) - 1.9 - TRY.h) * SC;
  ctx.beginPath(); ctx.roundRect(rest0[0] - 1.9 * SC, rest0[1] - restH, 3.8 * SC, restH, 10); ctx.fillStyle = grad(ctx, rest0[0] - 1.9 * SC, 0, rest0[0] + 1.9 * SC, 0, [[0, lit(COL.stone, 0.4)], [1, drk(COL.stone, 0.15)]]); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = OUTW; ctx.stroke();
  // tube (rotating): capsule L1 + L2 long, 3.4 cm thick; open mouth at the left (spout), closed node at the right
  const e = tubeEnds(s), th = e.th; ctx.save(); ctx.translate(pv[0], pv[1]); ctx.rotate(-th);
  const l1 = SHD.L1 * SC, l2 = SHD.L2 * SC, r = 1.7 * SC;
  ctx.beginPath(); ctx.moveTo(-l1, -r); ctx.lineTo(l2 - r, -r); ctx.arc(l2 - r, 0, r, -Math.PI / 2, Math.PI / 2); ctx.lineTo(-l1 + 6, r); ctx.lineTo(-l1, r - 4); ctx.closePath();
  ctx.fillStyle = grad(ctx, 0, -r, 0, r, [[0, lit(COL.bamboo, 0.4)], [0.4, COL.bamboo], [1, COL.bambooD]]); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = OUTW; ctx.stroke();
  for (const k of [-3.2, 3.2]) { const x = k * SC; ctx.fillStyle = COL.bambooD; ctx.fillRect(x - 3, -r, 6, 2 * r); ctx.strokeStyle = OUT; ctx.lineWidth = 1.4; ctx.strokeRect(x - 3, -r, 6, 2 * r); }
  ctx.beginPath(); ctx.ellipse(-l1 + 3, -2, 3.5, r - 1, 0, 0, 7); ctx.fillStyle = '#4c6a2f'; ctx.fill();                              // dark mouth
  const f = SHD.fill(s); if (f > 0.02) { ctx.beginPath(); ctx.ellipse(-l1 + 4 + 4 * f, -2 + (1 - f) * 7, 4 * (0.4 + 0.6 * f), (r - 3) * (0.25 + 0.7 * f), 0, 0, 7); ctx.fillStyle = COL.water; ctx.fill(); }
  ctx.beginPath(); ctx.arc(0, 0, 4.4, 0, 7); ctx.fillStyle = COL.iron; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  const h = (s > SHD.CLACK - 0.02 && s < SHD.CLACK + 0.1) ? 1 - (s - SHD.CLACK + 0.02) / 0.12 : 0;                               // clack impact marks
  if (h > 0) { const c = rest0, k = 1 - h; ctx.save(); ctx.globalAlpha = h; ctx.strokeStyle = '#fff6d2'; ctx.lineWidth = 3.2; ctx.lineCap = 'round'; for (let i = 0; i < 5; i++) { const a = -Math.PI * (0.1 + 0.8 * i / 4), r1 = (3.4 + 6 * k) * SC * 0.8, r2 = r1 + 2.4 * SC * (1 - k * 0.5); ctx.beginPath(); ctx.moveTo(c[0] + Math.cos(a) * r1, c[1] - restH + 6 + Math.sin(a) * r1 * 0.7); ctx.lineTo(c[0] + Math.cos(a) * r2, c[1] - restH + 6 + Math.sin(a) * r2 * 0.7); ctx.stroke(); } ctx.restore(); }
}
// pour stream: from the spout at the tipped angle, ballistic (g) in the u-h plane, lands in the water behind the cubes; returns landing u
const POUR = (() => { const th = SHD.th1, c = Math.cos(th), sn = Math.sin(th), L = [SHD.pu - SHD.L1 * c, SHD.ph + SHD.L1 * sn], sp = 34, v = [-c * sp, sn * sp], hw = TRY.wl, G = 981;
  const disc = v[1] * v[1] + 2 * G * (L[1] - hw), tl = (v[1] + Math.sqrt(disc)) / G; return { L, v, tl, uL: L[0] + v[0] * tl }; })();
function drawStream(ctx, s) {
  if (s < SHD.POUR0 || s > SHD.POUR1 + POUR.tl + 0.02) return; const G = 981, age = s - SHD.POUR0, a0 = Math.max(0, s - SHD.POUR1), a1 = Math.min(age, POUR.tl);
  const thick = (a) => (1.5 + 0.7 * Math.sin(Math.PI * clampK((s - SHD.POUR0) / (SHD.POUR1 - SHD.POUR0)))) * SC * (1 - 0.35 * a / POUR.tl);
  if (a1 <= a0) return; const pts = []; for (let i = 0; i <= 14; i++) { const a = a0 + (a1 - a0) * i / 14; pts.push(pp(POUR.L[0] + POUR.v[0] * a, POUR.L[1] + POUR.v[1] * a - 0.5 * G * a * a, SHD.q)); }
  ctx.save(); ctx.lineCap = 'round'; for (const [col, w] of [['#5f93b6', 1.0], ['#cfeaf6', 0.62]]) { ctx.strokeStyle = col; for (let i = 1; i < pts.length; i++) { ctx.lineWidth = thick(a0 + (a1 - a0) * i / 14) * w + (w < 1 ? 0 : 3); ctx.beginPath(); ctx.moveTo(...pts[i - 1]); ctx.lineTo(...pts[i]); ctx.stroke(); } } ctx.restore();
}
// ------------------------------------------------------------------ the tray
function trayWaterPoly() { return [pp(TRY.u0 + 0.8, TRY.wl, TRY.q0 + 0.8), pp(TRY.u1 - 0.8, TRY.wl, TRY.q0 + 0.8), pp(TRY.u1 - 0.8, TRY.wl, TRY.q1 - 0.8), pp(TRY.u0 + 0.8, TRY.wl, TRY.q1 - 0.8)]; }
function drawTrayBack(ctx, s) {
  const bw = [pp(TRY.u0, TRY.h, TRY.q0), pp(TRY.u1, TRY.h, TRY.q0), pp(TRY.u1, 0, TRY.q0), pp(TRY.u0, 0, TRY.q0)];
  softShadow(ctx, (TRY.u0 + TRY.u1) / 2, TRY.q1 + 0.6, 30, 5.5, 0.2);
  wpoly(ctx, [pp(TRY.u0, TRY.h, TRY.q0), pp(TRY.u1, TRY.h, TRY.q0), pp(TRY.u1, TRY.h, TRY.q1), pp(TRY.u0, TRY.h, TRY.q1)], lit(COL.plank, 0.3));        // rim plane (whole top)
  const W = trayWaterPoly(); const inner = [pp(TRY.u0 + 0.8, TRY.h, TRY.q0 + 0.8), pp(TRY.u1 - 0.8, TRY.h, TRY.q0 + 0.8), W[1], W[0]];
  wpoly(ctx, inner, drk(COL.plank, 0.25), OUT, 1.6);                                                                               // inner back wall above the water
  wpoly(ctx, W, grad(ctx, 0, W[0][1], 0, W[3][1], [[0, COL.waterD], [1, COL.water]]), OUT, 1.6);
  ctx.save(); ctx.beginPath(); W.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.closePath(); ctx.clip();
  ctx.globalAlpha = 0.5; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; for (let k = 0; k < 5; k++) { const y = W[0][1] + (W[3][1] - W[0][1]) * (k + 0.5) / 5, x = pp(TRY.u0 + 6 + 9 * k + 3 * Math.sin(s / PER * TAU * 2 + k), 0)[0]; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 36, y); ctx.stroke(); }   // slow shimmer
  ctx.globalAlpha = 1;
  // ripples: each wobble impulse and each splash starts a ring on the water around the cube / landing point
  const ring = (uc, qc, age, amp) => { if (age < 0 || age > 1.1) return; const r = 2.2 + 13 * age, a = amp * (1 - age / 1.1) * Math.min(1, age / 0.04), [x, y] = pp(uc, TRY.wl, qc); ctx.globalAlpha = Math.min(1, Math.max(0, a) * 1.2); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.ellipse(x, y, r * SC, r * CUE.DQ * SC, 0, 0, 7); ctx.stroke(); ctx.globalAlpha = Math.max(0, a) * 0.5; ctx.strokeStyle = COL.waterD; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.ellipse(x, y, (r + 0.9) * SC, (r + 0.9) * CUE.DQ * SC, 0, 0, 7); ctx.stroke(); };
  CUE.CUBES.forEach((c, j) => CUE.IMPS_[j].forEach((m) => ring(c.u, 12.2, s - m.s, Math.min(1, Math.abs(m.a) * 1.1))));
  for (let k = 0; k < 7; k++) ring(POUR.uL, SHD.q, s - (SHD.POUR0 + POUR.tl + 0.14 * k), 0.9 - 0.08 * k);
  for (const d of CUE.DRIPS) { /* drips land in the tube, not the tray */ }
  ctx.restore();
  // splash crown at the landing: droplets thrown with g
  if (s > SHD.POUR0 + POUR.tl - 0.02 && s < SHD.POUR1 + POUR.tl + 0.5) for (let n = 0; n < 24; n++) { const sN = SHD.POUR0 + POUR.tl + 0.03 * n, t = s - sN; if (t < 0 || t > 0.32 || sN > SHD.POUR1 + POUR.tl) continue;
    const vu = (CUE.hash(n, 1) - 0.5) * 34, vh = 20 + 24 * CUE.hash(n, 2), hh = TRY.wl + vh * t - 0.5 * 981 * t * t; if (hh < TRY.wl) continue; dropBlob(ctx, ...pp(POUR.uL + vu * t, hh, SHD.q + 0.5), (0.25 + 0.2 * CUE.hash(n, 3)) * SC, 1 - t / 0.34); }
}
function drawTrayFront(ctx) {
  const fl = pp(TRY.u0, TRY.h, TRY.q1), fr = pp(TRY.u1, TRY.h, TRY.q1), bl = pp(TRY.u0, 0, TRY.q1), br = pp(TRY.u1, 0, TRY.q1);
  wpoly(ctx, [pp(TRY.u0 + 0.8, TRY.h, TRY.q1 - 0.8), pp(TRY.u1 - 0.8, TRY.h, TRY.q1 - 0.8), fr, fl], lit(COL.plank, 0.42), OUT, 1.6);                                  // front rim top
  wpoly(ctx, [fl, fr, br, bl], grad(ctx, 0, fl[1], 0, bl[1], [[0, lit(COL.plank, 0.1)], [1, drk(COL.plank, 0.12)]]));
  woodGrain(ctx, fl[0] + 4, fl[1] + 3, fr[0] - 4, bl[1] - 3, COL.plank, 3, 5);
  for (const k of [0, 1]) { const u = TRY.u0 + (TRY.u1 - TRY.u0) * (k ? 1 : 0), a = pp(u + (k ? -3.2 : 0), TRY.h, TRY.q1), b = pp(u + (k ? 0 : 3.2), 0, TRY.q1); ctx.fillStyle = 'rgba(80,60,40,0.14)'; ctx.fillRect(Math.min(a[0], b[0]), a[1], Math.abs(b[0] - a[0]), b[1] - a[1]); }
  for (const u of [TRY.u0 + 9, TRY.u1 - 9]) { const a = pp(u, TRY.h * 0.5, TRY.q1); circle(ctx, a[0], a[1], 3, drk(COL.plank, 0.35), OUT, 1.2); }                                              // nail heads
  wpoly(ctx, [pp(TRY.u0, TRY.h, TRY.q0), pp(TRY.u0 + 0.8, TRY.h, TRY.q0 + 0.8), pp(TRY.u0 + 0.8, TRY.h, TRY.q1 - 0.8), fl], lit(COL.plank, 0.2), OUT, 1.4);                    // left rim
  wpoly(ctx, [pp(TRY.u1, TRY.h, TRY.q0), pp(TRY.u1 - 0.8, TRY.h, TRY.q0 + 0.8), pp(TRY.u1 - 0.8, TRY.h, TRY.q1 - 0.8), fr], lit(COL.plank, 0.2), OUT, 1.4);                    // right rim
}
// ------------------------------------------------------------------ tofu cubes: soft jelly (top shear, vertical squash, poke dent), pale cream, pores, outline
function cubeGeom(j, s) {
  const c = CB[j], w = CUE.wob(j, s), pr = CUE.press(j, s), sq = w.sq * (1 - 0.2 * pr), hH = (c.ht - c.hb) * sq, bulge = 1 / Math.sqrt(sq);
  const sh = w.sh + (pr ? (j === 3 ? -0.5 : 0.5) * pr : 0), hw = c.w / 2 * bulge;
  const ht = c.hb + hH, back = (u, h, q) => pp(u, h, q);
  const top = (dx) => [[c.u - hw + dx, ht, c.qb], [c.u + hw + dx, ht, c.qb], [c.u + hw + dx, ht, c.qf], [c.u - hw + dx, ht, c.qf]];
  return { c, sh, hw, ht, sq, pr, w, T: top(sh).map((p) => pp(...p)), F: [pp(c.u - hw + sh, ht, c.qf), pp(c.u + hw + sh, ht, c.qf), pp(c.u + hw, c.hb, c.qf), pp(c.u - hw, c.hb, c.qf)] };
}
function drawCube(ctx, j, s) {
  const g = cubeGeom(j, s), c = g.c; softShadow(ctx, c.u, 12.2, 4.6, 3.1, 0.1, TRY.wl);
  ctx.save(); ctx.lineJoin = 'round';
  // front face (bulged sides via quad + soft curve), top face on top
  const F = g.F, bow = 2.5 * (g.sq - 1) * -10;
  ctx.beginPath(); ctx.moveTo(...F[0]); ctx.lineTo(...F[1]); ctx.quadraticCurveTo(F[2][0] + 3 * Math.sign(F[1][0] - F[2][0]) + bow, (F[1][1] + F[2][1]) / 2, ...F[2]); ctx.lineTo(...F[3]); ctx.quadraticCurveTo(F[3][0] + 3 * Math.sign(F[0][0] - F[3][0]) - bow, (F[0][1] + F[3][1]) / 2, ...F[0]); ctx.closePath();
  ctx.fillStyle = grad(ctx, 0, F[0][1], 0, F[3][1], [[0, COL.tofu], [0.8, COL.tofuS], [1, '#e7cf9c']]); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = OUTW; ctx.stroke();
  ctx.save(); ctx.clip(); const wl = pp(c.u, TRY.wl, c.qf)[1]; ctx.fillStyle = 'rgba(160,215,230,0.5)'; ctx.fillRect(F[0][0] - 20, wl, 160, 200); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(F[3][0] - 10, wl); ctx.lineTo(F[2][0] + 10, wl); ctx.stroke();      // submerged part tinted, waterline
  for (let k = 0; k < 9; k++) { const x = F[0][0] + (F[1][0] - F[0][0]) * (0.1 + 0.8 * CUE.hash(j, k, 1)), y = F[0][1] + (F[3][1] - F[0][1]) * (0.1 + 0.55 * CUE.hash(j, k, 2)); ctx.fillStyle = 'rgba(190,150,90,0.35)'; ctx.beginPath(); ctx.ellipse(x, y, 2.2, 1.5, 0, 0, 7); ctx.fill(); }     // pores
  ctx.restore();
  wpoly(ctx, g.T, lit(COL.tofu, 0.5), OUT, OUTW);
  const T = g.T; line(ctx, [[T[3][0] + 6, T[3][1] - 3], [T[2][0] - 6, T[2][1] - 3]], 'rgba(255,255,255,0.9)', 2.6);                                          // lit front edge of the top
  if (g.pr > 0.05) { const px_ = (T[0][0] + T[1][0]) / 2 + (j === 3 ? 12 : -12), py_ = (T[0][1] + T[3][1]) / 2; ctx.fillStyle = 'rgba(190,150,90,' + (0.35 * g.pr) + ')'; ctx.beginPath(); ctx.ellipse(px_, py_, 11, 6, 0, 0, 7); ctx.fill(); }          // fingertip dent
  ctx.restore();
}
function drawCubes(ctx, s) { for (let j = 0; j < CB.length; j++) drawCube(ctx, j, s); }
function drawBack(ctx, s) { floorLayer(ctx); drawStove(ctx, s); drawRack(ctx, s); drawPipe(ctx, s); drawTrayBack(ctx, s); drawShishi(ctx, s); drawStream(ctx, s); drawCubes(ctx, s); drawTrayFront(ctx); }
