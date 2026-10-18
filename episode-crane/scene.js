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

// ------------------------------------------------------------------ palette
Object.assign(COL, { floorW: '#efd5a6', floorL: '#dcb985', floorS: '#c99f68', engawa: '#c8925a', engawaT: '#dba96f', tab: '#a9754a', tabT: '#c99564', pot: '#6e5f6a', potL: '#8a7a86', potD: '#4a3f48', broth: '#f1c46a', brothD: '#d99f3f', egg: '#fff1d6', eggS: '#ecd2a6', steam: '#ffffff' });
// ------------------------------------------------------------------ room: shoji wall behind, wide plank floor in front (drawn in world px, under the pan/zoom camera)
const WALL_Y = CUE.WALL_Y, FX0 = -520, FX1 = 1640, FY1 = 2300;
function drawFloor(ctx) {
  ctx.fillStyle = COL.floorW; ctx.fillRect(FX0, WALL_Y, FX1 - FX0, FY1 - WALL_Y);
  const PH = 4.2 * C.DQ * SC, j0 = Math.floor(WALL_Y / PH);
  for (let j = j0; j * PH < FY1; j++) {
    const y = j * PH; ctx.fillStyle = (j % 2) ? COL.floorL : COL.floorW; ctx.globalAlpha = 0.5; ctx.fillRect(FX0, Math.max(y, WALL_Y), FX1 - FX0, PH); ctx.globalAlpha = 1;
    ctx.strokeStyle = COL.floorS; ctx.lineWidth = 2.2; ctx.globalAlpha = 0.75; ctx.beginPath(); ctx.moveTo(FX0, y); ctx.lineTo(FX1, y); ctx.stroke();
    ctx.globalAlpha = 0.5; for (let x = FX0 + CUE.hash(j, 3) * 300; x < FX1; x += 360 + 80 * CUE.hash(j, 4)) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + PH); ctx.stroke(); } ctx.globalAlpha = 1;
    woodGrain(ctx, FX0, y + 4, FX1, y + PH - 4, (j % 2) ? COL.floorL : COL.floorW, 2, j + 40);
  }
  ctx.fillStyle = grad(ctx, 0, WALL_Y, 0, WALL_Y + 160, [[0, 'rgba(80,50,30,0.28)'], [1, 'rgba(80,50,30,0)']]); ctx.fillRect(FX0, WALL_Y, FX1 - FX0, 160);     // contact shade under the wall
}
function drawWall(ctx) {
  const y0 = 300, x0 = FX0, x1 = FX1;
  ctx.fillStyle = grad(ctx, 0, y0, 0, WALL_Y, [[0, '#f4e7cc'], [1, '#f9efd8']]); ctx.fillRect(x0, y0, x1 - x0, WALL_Y - y0);
  const PW = 330, top = 560, bot = WALL_Y - 30;                              // shoji panels: dark wood frame, paper, lattice
  for (let x = Math.floor(x0 / PW) * PW; x < x1; x += PW) {
    ctx.fillStyle = '#fffaf0'; ctx.fillRect(x + 6, top, PW - 12, bot - top);
    ctx.strokeStyle = '#b98a5a'; ctx.lineWidth = 3; ctx.globalAlpha = 0.9;
    for (let k = 1; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x + 6 + (PW - 12) * k / 3, top); ctx.lineTo(x + 6 + (PW - 12) * k / 3, bot); ctx.stroke(); }
    for (let k = 1; k < 6; k++) { const yy = top + (bot - top) * k / 6; ctx.beginPath(); ctx.moveTo(x + 6, yy); ctx.lineTo(x + PW - 6, yy); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.lineWidth = 8; ctx.strokeStyle = '#a9754a'; ctx.strokeRect(x + 3, top - 3, PW - 6, bot - top + 6);
  }
  ctx.fillStyle = '#a9754a'; ctx.fillRect(x0, top - 26, x1 - x0, 26); ctx.fillStyle = '#8d5f3a'; ctx.fillRect(x0, WALL_Y - 30, x1 - x0, 30);     // beam + skirting
  
}
function woodGrain(ctx, x0, y0, x1, y1, base, n, seed) {
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip(); ctx.strokeStyle = drk(base, 0.18); ctx.lineWidth = 1.4; ctx.globalAlpha = 0.4;
  for (let i = 0; i < n; i++) { const y = y0 + (y1 - y0) * (i + 0.5) / n + (CUE.hash(seed, i) - 0.5) * 5; ctx.beginPath(); ctx.moveTo(x0, y); ctx.bezierCurveTo(x0 + (x1 - x0) * 0.3, y + 3, x0 + (x1 - x0) * 0.7, y - 3, x1, y + (CUE.hash(seed, i + 9) - 0.5) * 3); ctx.stroke(); }
  ctx.restore();
}
