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
const PL = CUE.PLAT, TB = CUE.TAB, PT = CUE.POT;
// ------------------------------------------------------------------ room: shoji wall behind, wide plank floor in front (drawn in world px, under the pan/zoom camera)
const WALL_Y = 1330, FX0 = -520, FX1 = 1640, FY1 = 2300;
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
  ctx.fillStyle = grad(ctx, 0, top, 0, bot, [[0, 'rgba(255,214,150,0.0)'], [1, 'rgba(255,214,150,0.22)']]); ctx.fillRect(x0, top, x1 - x0, bot - top);
  // a round window and a paper lantern (set dressing, static)
  const wx = pp(18, 0, 0)[0], wy = 905; ctx.fillStyle = '#c9e4f2'; ctx.beginPath(); ctx.arc(wx, wy, 120, 0, 7); ctx.fill(); ctx.lineWidth = 14; ctx.strokeStyle = '#8d5f3a'; ctx.stroke();
  ctx.strokeStyle = '#8d5f3a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(wx - 120, wy); ctx.lineTo(wx + 120, wy); ctx.moveTo(wx, wy - 120); ctx.lineTo(wx, wy + 120); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(wx - 40, wy - 45, 46, 20, -0.5, 0, 7); ctx.fill();
  const lx = pp(-24, 0, 0)[0], ly = 760; ctx.strokeStyle = '#6b5a4a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lx, top - 26); ctx.lineTo(lx, ly - 70); ctx.stroke();
  ctx.fillStyle = '#ff9d6f'; ctx.beginPath(); ctx.ellipse(lx, ly, 52, 70, 0, 0, 7); ctx.fill(); ctx.lineWidth = OUTW; ctx.strokeStyle = OUT; ctx.stroke();
  ctx.strokeStyle = 'rgba(120,40,20,0.35)'; ctx.lineWidth = 3; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.ellipse(lx, ly, 52, 70 * Math.abs(k) / 2.4 + 0.1, 0, 0, 7); } ctx.beginPath(); ctx.ellipse(lx, ly, 52, 24, 0, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.ellipse(lx, ly, 52, 46, 0, 0, 7); ctx.stroke();
  ctx.fillStyle = '#6b5a4a'; ctx.fillRect(lx - 24, ly - 72, 48, 10); ctx.fillRect(lx - 24, ly + 62, 48, 10);
  const g = ctx.createRadialGradient(lx, ly, 20, lx, ly, 260); g.addColorStop(0, 'rgba(255,200,120,0.35)'); g.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = g; ctx.fillRect(lx - 260, ly - 260, 520, 520);
}
function woodGrain(ctx, x0, y0, x1, y1, base, n, seed) {
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip(); ctx.strokeStyle = drk(base, 0.18); ctx.lineWidth = 1.4; ctx.globalAlpha = 0.4;
  for (let i = 0; i < n; i++) { const y = y0 + (y1 - y0) * (i + 0.5) / n + (CUE.hash(seed, i) - 0.5) * 5; ctx.beginPath(); ctx.moveTo(x0, y); ctx.bezierCurveTo(x0 + (x1 - x0) * 0.3, y + 3, x0 + (x1 - x0) * 0.7, y - 3, x1, y + (CUE.hash(seed, i + 9) - 0.5) * 3); ctx.stroke(); }
  ctx.restore();
}
// ------------------------------------------------------------------ engawa (raised veranda) on the left: the samurai walks in along its top and steps down
function drawPlatform(ctx) {
  const A = pp(PL.u0, PL.h, PL.q1), B = pp(PL.u1, PL.h, PL.q1), Cc = pp(PL.u1, 0, PL.q1), D = pp(PL.u0, 0, PL.q1), A2 = pp(PL.u0, PL.h, PL.q0), B2 = pp(PL.u1, PL.h, PL.q0);
  softShadow(ctx, (PL.u0 + PL.u1) / 2 + 1, PL.q1 + 0.8, (PL.u1 - PL.u0) / 2 + 1, 2.4, 0.22);
  poly(ctx, [A2, B2, B, A], COL.engawaT);
  for (let i = 1; i < 3; i++) { const y = A2[1] + (A[1] - A2[1]) * i / 3; line(ctx, [[A2[0], y], [B2[0], y]], drk(COL.engawaT, 0.14), 2); }
  poly(ctx, [A, B, Cc, D], grad(ctx, 0, A[1], 0, D[1], [[0, lit(COL.engawa, 0.05)], [1, drk(COL.engawa, 0.12)]]));
  woodGrain(ctx, D[0], A[1] + 4, Cc[0], D[1] - 4, COL.engawa, 2, 7);
  line(ctx, [[B[0] - 1, B[1]], [Cc[0] - 1, Cc[1]]], drk(COL.engawa, 0.25), 3);
}
// ------------------------------------------------------------------ low table: egg lies on top; legs, slab
function drawTable(ctx) {
  const u0 = TB.u0, u1 = TB.u1, h = TB.h, th = 1.3, lw = 1.5;
  softShadow(ctx, (u0 + u1) / 2, TB.q1 + 0.8, (u1 - u0) / 2 + 1.4, 3.2, 0.25);
  const legR = (u, q, front) => { const a = pp(u, h - th, q), b = pp(u, 0, q); rrect(ctx, a[0], a[1], lw * SC, b[1] - a[1], 3, front ? COL.tab : drk(COL.tab, 0.15)); };
  legR(u0 + 0.5, TB.q0 + 1, false); legR(u1 - lw - 0.5, TB.q0 + 1, false);
  const A = pp(u0, h, TB.q1), B = pp(u1, h, TB.q1), A2 = pp(u0, h, TB.q0), B2 = pp(u1, h, TB.q0), A3 = pp(u0, h - th, TB.q1), B3 = pp(u1, h - th, TB.q1);
  poly(ctx, [A2, B2, B, A], COL.tabT); woodGrain(ctx, A[0] + 4, A2[1] + 6, B[0] - 4, A[1] - 6, COL.tabT, 4, 11);
  poly(ctx, [A, B, B3, A3], grad(ctx, 0, A[1], 0, A3[1], [[0, lit(COL.tab, 0.1)], [1, COL.tab]]));
  legR(u0 + 0.5, TB.q1 - 1.2, true); legR(u1 - lw - 0.5, TB.q1 - 1.2, true);
}
// ------------------------------------------------------------------ the pot (donabe) with warm broth: back half behind the cat, front wall over her
function potRim() { return pp(PT.u, PT.h, PT.q); }
function drawPotBack(ctx, w) {
  const [cx, cy] = potRim(), rx = PT.hw * SC, ry = PT.qw * C.DQ * SC;
  softShadow(ctx, PT.u, PT.q + PT.qw + 0.4, PT.hw + 1.4, 3.4, 0.26);
  ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 7); ctx.fillStyle = COL.potD; ctx.fill(); ctx.restore();
  const by = cy + 0.9 * SC + 0.4 * SC * Math.sin(w * 2.1);                         // broth surface a little below the rim
  ctx.save(); ctx.beginPath(); ctx.ellipse(cx, by, rx - 7, ry - 5, 0, 0, 7); ctx.fillStyle = grad(ctx, cx - rx, 0, cx + rx, 0, [[0, COL.broth], [1, COL.brothD]]); ctx.fill(); ctx.restore();
  for (let i = 0; i < 6; i++) { const ph = (w * 0.9 + i * 0.37) % 1, bx = cx + (CUE.hash(i, 7) - 0.5) * (rx - 30), byy = by + (CUE.hash(i, 8) - 0.5) * (ry - 14); ctx.save(); ctx.globalAlpha = 0.6 * Math.sin(Math.PI * ph); ctx.strokeStyle = '#fff4cf'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(bx, byy, 3 + 7 * ph, 1.6 + 3 * ph, 0, 0, 7); ctx.stroke(); ctx.restore(); }
}
function potBody() { const [cx, cy] = potRim(), rx = PT.hw * SC, ry = PT.qw * C.DQ * SC, bot = pp(PT.u, 0, PT.q)[1] + PT.qw * C.DQ * SC * 0.85, bw = rx * 0.78; return { cx, cy, rx, ry, bot, bw }; }
function drawPotFront(ctx) {
  const { cx, cy, rx, ry, bot, bw } = potBody();
  ctx.save(); ctx.beginPath(); ctx.moveTo(cx - rx, cy); ctx.bezierCurveTo(cx - rx - 8, cy + 55, cx - bw - 6, bot - 26, cx - bw, bot - 6); ctx.quadraticCurveTo(cx, bot + ry * 0.7, cx + bw, bot - 6); ctx.bezierCurveTo(cx + bw + 6, bot - 26, cx + rx + 8, cy + 55, cx + rx, cy); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI, false); ctx.closePath();
  ctx.fillStyle = grad(ctx, cx - rx, 0, cx + rx, 0, [[0, lit(COL.pot, 0.08)], [0.4, COL.potL], [1, drk(COL.pot, 0.12)]]); ctx.fill(); ctx.lineWidth = OUTW; ctx.strokeStyle = OUT; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI, false); ctx.lineWidth = 10; ctx.strokeStyle = lit(COL.potL, 0.2); ctx.stroke(); ctx.lineWidth = OUTW; ctx.strokeStyle = OUT; ctx.stroke(); ctx.restore();
  ctx.save(); ctx.globalAlpha = 0.45; ctx.strokeStyle = '#d9ccd6'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx - rx * 0.78, cy + 38); ctx.quadraticCurveTo(cx - rx * 0.86, cy + 80, cx - bw * 0.95, bot - 50); ctx.stroke(); ctx.restore();
  for (const sx of [-1, 1]) { ctx.save(); ctx.fillStyle = COL.potD; ctx.beginPath(); ctx.ellipse(cx + sx * rx * 0.97, cy + 4, 14, 9, 0, 0, 7); ctx.fill(); ctx.lineWidth = OUTW; ctx.strokeStyle = OUT; ctx.stroke(); ctx.restore(); }   // ear handles
}
function drawSteam(ctx, w, amt = 1) {
  const [cx, cy] = potRim();
  for (let i = 0; i < 7; i++) { const ph = (w * 0.32 + i / 7) % 1, x = cx + (CUE.hash(i, 21) - 0.5) * 90 + Math.sin(w * 1.3 + i * 2) * 14 * ph, y = cy - 20 - ph * 260, r = 22 + 46 * ph, a = 0.32 * Math.sin(Math.PI * ph) * amt;
    ctx.save(); ctx.globalAlpha = a; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore(); }
}
// ------------------------------------------------------------------ the egg: 5.4 x 4.0 cm; (x,y) centre in px, ang = rotation of the long axis, sq = squash along the short axis
function drawEgg(ctx, x, y, ang = 0, sq = 1, a = 1) {
  const L = 2.75 * SC, Wd = 2.0 * SC;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(ang); ctx.scale(1 / Math.sqrt(sq), sq);
  ctx.beginPath(); ctx.moveTo(-L, 0); ctx.bezierCurveTo(-L, -Wd * 1.05, L * 0.1, -Wd * 1.15, L, -Wd * 0.12); ctx.bezierCurveTo(L * 1.02, Wd * 0.55, -L * 0.3, Wd * 1.2, -L, 0); ctx.closePath();
  ctx.fillStyle = grad(ctx, 0, -Wd, 0, Wd, [[0, '#fffaf0'], [1, COL.eggS]]); ctx.fill(); ctx.lineWidth = OUTW; ctx.strokeStyle = OUT; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.ellipse(-L * 0.25, -Wd * 0.45, L * 0.28, Wd * 0.16, -0.15, 0, 7); ctx.fill(); ctx.restore();
}
// ------------------------------------------------------------------ stool + bowl (the samurai's errand while the egg waits)
function drawStool(ctx) {
  const st = CUE.STOOL, u0 = st.u - st.hw, u1 = st.u + st.hw, h = st.h, q0 = st.q - 2.2, q1 = st.q + 2.2;
  softShadow(ctx, st.u, q1 + 0.6, st.hw + 1.2, 2.4, 0.24);
  for (const [u, q] of [[u0 + 0.5, q0 + 0.4], [u1 - 1.2, q0 + 0.4], [u0 + 0.5, q1 - 0.4], [u1 - 1.2, q1 - 0.4]]) { const a = pp(u, h - 0.6, q), b = pp(u, 0, q); rrect(ctx, a[0], a[1], 1.0 * SC, b[1] - a[1], 3, q > st.q ? COL.tab : drk(COL.tab, 0.14)); }
  box(ctx, u0, u1, h - 0.9, h, q0, q1, COL.tabT, { top: lit(COL.tabT, 0.35) });
}
function drawBowl(ctx, x, y, ang = 0, a = 1) {       // porcelain rice bowl, ~6 cm wide; (x,y) = centre of the rim; ang tilts it
  const R = 3.0 * SC, Hb = 3.1 * SC;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(ang);
  ctx.beginPath(); ctx.moveTo(-R, 0); ctx.bezierCurveTo(-R, Hb * 0.9, -R * 0.45, Hb * 1.05, 0, Hb * 1.05); ctx.bezierCurveTo(R * 0.45, Hb * 1.05, R, Hb * 0.9, R, 0); ctx.ellipse(0, 0, R, R * 0.28, 0, 0, Math.PI, true); ctx.closePath();
  ctx.fillStyle = grad(ctx, -R, 0, R, 0, [[0, '#ffffff'], [0.6, '#eef4fb'], [1, '#c9d7e8']]); ctx.fill(); ctx.lineWidth = OUTW; ctx.strokeStyle = OUT; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, 0, R, R * 0.28, 0, 0, 7); ctx.fillStyle = '#dfe9f4'; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, 0, R * 0.78, R * 0.19, 0, 0, 7); ctx.fillStyle = '#f7fbff'; ctx.fill();
  ctx.strokeStyle = '#6f9cc9'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-R * 0.86, Hb * 0.34); ctx.quadraticCurveTo(0, Hb * 0.5, R * 0.86, Hb * 0.34); ctx.stroke();
  ctx.restore();
}
