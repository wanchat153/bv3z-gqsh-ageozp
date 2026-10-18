// scene.js — playground: slide, steps, sand, lawn, trees, swing set. Front-elevation iso, drawn in world px under the pan/zoom camera.
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
const WALL_Y = CUE.WALL_Y, FX0 = -700, FX1 = 1800, FY1 = 2600, QS = CUE.QS, H_ = (...a) => CUE.hash(...a);
const PL = { slide: '#ffcf4a', slideD: '#e5a528', slideL: '#fff0b0', blue: '#5b9fe0', blueD: '#3f7cc0', blueL: '#9cc8f2', coral: '#ff8f7d', coralD: '#e0655a', lemon: '#ffd86b', lemonD: '#e0b040', mint: '#8fd8b0', post: '#4f86c9' };
// ---------------------------------------------------------------- sky + far scenery
function drawSky(ctx, w) {
  ctx.fillStyle = grad(ctx, 0, 400, 0, WALL_Y, [[0, '#7fc0ee'], [0.55, '#b4def5'], [1, '#fdeccd']]); ctx.fillRect(FX0, 400, FX1 - FX0, WALL_Y - 400);
  ctx.fillStyle = grad(ctx, 0, 0, 0, 1, [[0, '#fff']]); ctx.globalAlpha = 0.6; const sg = ctx.createRadialGradient(860, 860, 10, 860, 860, 380); sg.addColorStop(0, 'rgba(255,248,214,0.95)'); sg.addColorStop(1, 'rgba(255,248,214,0)'); ctx.fillStyle = sg; ctx.globalAlpha = 1; ctx.fillRect(FX0, 400, FX1 - FX0, WALL_Y - 400);
  ctx.fillStyle = '#fffbe8'; ctx.beginPath(); ctx.arc(860, 860, 34, 0, 7); ctx.fill();
  for (let i = 0; i < 4; i++) {                                                 // clouds drift left slowly (3 px/s), seamless
    const base = (i * 380 + 120 - w * 3 + 4000) % 1500 - 300, y = 800 + 110 * H_(i, 1) + (i % 2) * 60, sc = 0.8 + 0.5 * H_(i, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; for (const [dx, dy, r] of [[0, 0, 38], [42, -14, 46], [96, 0, 40], [60, 12, 40], [-32, 8, 28], [128, 8, 26]]) { ctx.beginPath(); ctx.arc(base + dx * sc, y + dy * sc, r * sc, 0, 7); ctx.fill(); }
    ctx.fillStyle = 'rgba(190,214,238,0.5)'; ctx.beginPath(); ctx.ellipse(base + 60 * sc, y + 30 * sc, 96 * sc, 14 * sc, 0, 0, 7); ctx.fill();
  }
  ctx.fillStyle = '#b9d9c0'; ctx.beginPath(); ctx.moveTo(FX0, WALL_Y); for (let x = FX0; x <= FX1; x += 20) ctx.lineTo(x, WALL_Y - 70 - 40 * Math.sin(x * 0.004 + 1) - 22 * Math.sin(x * 0.011)); ctx.lineTo(FX1, WALL_Y); ctx.fill();   // far hills
  for (let i = 0; i < 14; i++) {                                                // tree line
    const x = FX0 + 80 + i * 175 + 40 * H_(i, 3), y = WALL_Y - 4, r = 62 + 34 * H_(i, 4), col = ['#6aa86a', '#5a9a62', '#7bb86f'][i % 3];
    ctx.fillStyle = '#7a5a46'; ctx.fillRect(x - 6, y - 70, 12, 70);
    for (const [dx, dy, rr] of [[0, -r * 1.05, r], [-r * 0.6, -r * 0.75, r * 0.7], [r * 0.62, -r * 0.7, r * 0.72]]) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + dx, y + dy - 40, rr, 0, 7); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 1.2 - 40, r * 0.5, 0, 7); ctx.fill();
  }
  ctx.fillStyle = '#82b872'; ctx.fillRect(FX0, WALL_Y - 6, FX1 - FX0, 60);
}
function drawSwings(ctx, w) {                                                    // a far swing set, the swings sway gently
  const q = 2, A = pp(-14, 0, q), B = pp(-2, 0, q), top = (u) => pp(u, 16, q);
  ctx.strokeStyle = '#d9604f'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  for (const [x0, x1] of [[-14, -11], [-5, -2]]) { line(ctx, [pp(x0, 0, q), pp((x0 + x1) / 2 + 0.0, 16, q)], '#d9604f', 7); line(ctx, [pp(x1, 0, q), pp((x0 + x1) / 2, 16, q)], '#d9604f', 7); }
  line(ctx, [pp(-12.5, 16, q), pp(-3.5, 16, q)], '#c24b3b', 8);
  for (const [i, uu] of [[0, -10], [1, -6]]) { const an = 0.18 * Math.sin(w * 1.6 + i * 1.7) , L = 11 * SC, tx = pp(uu, 16, q); const sx = tx[0] + Math.sin(an) * L, sy = tx[1] + Math.cos(an) * L;
    line(ctx, [[tx[0] - 8, tx[1]], [sx - 8, sy]], '#7a6a60', 2); line(ctx, [[tx[0] + 8, tx[1]], [sx + 8, sy]], '#7a6a60', 2); ctx.fillStyle = '#ffd86b'; ctx.beginPath(); ctx.roundRect(sx - 16, sy - 2, 32, 7, 3); ctx.fill(); }
}
function drawFence(ctx) {
  const y0 = pp(0, 0, -3)[1]; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#d5dae0'; ctx.lineWidth = 2;
  for (let x = FX0; x < FX1; x += 36) { ctx.beginPath(); ctx.roundRect(x, y0 - 60, 22, 62, 4); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = '#fff'; ctx.fillRect(FX0, y0 - 44, FX1 - FX0, 9); ctx.fillRect(FX0, y0 - 18, FX1 - FX0, 9);
  ctx.fillStyle = 'rgba(80,110,70,0.25)'; ctx.fillRect(FX0, y0 + 2, FX1 - FX0, 10);
}
// ---------------------------------------------------------------- ground: lawn + wooden sand border + sand
function drawGround(ctx) {
  const yL = pp(0, 0, -3)[1], yS = pp(0, 0, 6.0)[1];
  ctx.fillStyle = grad(ctx, 0, yL, 0, yS, [[0, '#8cc47a'], [1, '#6fae62']]); ctx.fillRect(FX0, yL, FX1 - FX0, yS - yL + 4);
  for (let i = 0; i < 90; i++) { const x = FX0 + H_(i, 5) * (FX1 - FX0), y = yL + 6 + H_(i, 6) * (yS - yL - 14); ctx.strokeStyle = 'rgba(70,130,70,0.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y - 10); ctx.moveTo(x, y); ctx.lineTo(x + 4, y - 9); ctx.stroke(); }
  for (let i = 0; i < 16; i++) { const x = FX0 + 60 + H_(i, 7) * (FX1 - FX0 - 120), y = yL + 18 + H_(i, 8) * (yS - yL - 40), col = ['#fff', '#ffd1e0', '#fff3a0'][i % 3]; for (let k = 0; k < 5; k++) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + Math.cos(k * 1.256) * 5, y + Math.sin(k * 1.256) * 5, 3.6, 0, 7); ctx.fill(); } ctx.fillStyle = '#f2b43c'; ctx.beginPath(); ctx.arc(x, y, 2.8, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#b98a5a'; ctx.fillRect(FX0, yS - 4, FX1 - FX0, 16); ctx.fillStyle = '#d2a572'; ctx.fillRect(FX0, yS - 4, FX1 - FX0, 5); ctx.fillStyle = 'rgba(70,40,20,0.3)'; ctx.fillRect(FX0, yS + 10, FX1 - FX0, 4);   // wooden sand border
  const y1 = yS + 12; ctx.fillStyle = grad(ctx, 0, y1, 0, FY1, [[0, '#ecd6a4'], [0.5, '#f0dcae'], [1, '#e6cd98']]); ctx.fillRect(FX0, y1, FX1 - FX0, FY1 - y1);
  for (let i = 0; i < 260; i++) { const x = FX0 + H_(i, 11) * (FX1 - FX0), y = y1 + 6 + H_(i, 12) * (FY1 - y1 - 10); ctx.fillStyle = H_(i, 13) > 0.5 ? 'rgba(190,150,90,0.45)' : 'rgba(255,248,225,0.6)'; ctx.beginPath(); ctx.ellipse(x, y, 3 + 5 * H_(i, 14), 1.8 + 1.6 * H_(i, 15), 0, 0, 7); ctx.fill(); }
  for (let j = 0; j < 22; j++) { const y = y1 + 30 + j * 46 + 8 * H_(j, 2); ctx.strokeStyle = 'rgba(190,150,90,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); for (let x = FX0; x < FX1; x += 40) ctx.lineTo(x, y + 4 * Math.sin(x * 0.02 + j * 2)); ctx.stroke(); }
  ctx.fillStyle = grad(ctx, 0, y1, 0, y1 + 40, [[0, 'rgba(90,70,40,0.25)'], [1, 'rgba(90,70,40,0)']]); ctx.fillRect(FX0, y1, FX1 - FX0, 40);
}
function drawBucket(ctx) {                                                       // a sand bucket and spade in the foreground (quiet detail)
  const b = pp(-19.5, 0, 17.5), s = SC * 1.0; ctx.save(); ctx.translate(b[0], b[1]);
  ctx.fillStyle = 'rgba(90,70,40,0.25)'; ctx.beginPath(); ctx.ellipse(6, 4, 38, 9, 0, 0, 7); ctx.fill();
  poly(ctx, [[-22, -50], [22, -50], [17, 0], [-17, 0]], '#ff8f7d', OUT, 2.2); poly(ctx, [[-22, -50], [22, -50], [24, -56], [-24, -56]], '#ffb0a0', OUT, 2.2); ctx.strokeStyle = OUT; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(0, -56, 26, Math.PI, 0); ctx.stroke();
  ctx.translate(44, 0); ctx.rotate(0.9); poly(ctx, [[-3, -2], [3, -2], [3, -34], [-3, -34]], '#5b9fe0', OUT, 2); poly(ctx, [[-10, -34], [10, -34], [8, -58], [-8, -58]], '#8fd8b0', OUT, 2); ctx.restore();
}
// ---------------------------------------------------------------- the slide structure at q = QS (profile with a 5 cm deep top so the characters stand IN it)
const DEP = 2.6;
function ramp(ctx) {
  const R = CUE.RAMP, us = []; for (let u = R.u0; u <= R.lipEnd + 0.001; u += 0.25) us.push(u);
  const edge = (q, dh = 0) => us.map((u) => pp(u, CUE.rampH(u) + dh, q));
  const bk = edge(QS - DEP), fr = edge(QS + DEP), frB = edge(QS + DEP, -1.1), bkW = edge(QS - DEP, 2.6);
  poly(ctx, [...bk, ...bkW.slice().reverse()], PL.slideD, OUT, 2.2);                                          // back wall (rail) behind the riders
  poly(ctx, [...bk, ...fr.slice().reverse()], grad(ctx, 0, bk[0][1], 0, fr[fr.length - 1][1], [[0, PL.slide], [1, PL.slideL]]), OUT, 2.2);   // the sliding surface (a strip with some depth)
  poly(ctx, [...fr, ...frB.slice().reverse()], PL.slideD, OUT, 2.2);                                          // front edge thickness
  ctx.save(); ctx.globalAlpha = 0.55; line(ctx, edge(QS - 0.3, 0.05), '#fffbe0', 3); ctx.restore();           // polish
}
function steps(ctx) {
  const SB = [[-18, -14, 5, PL.coral], [-14, -10, 10, PL.lemon]];
  SB.forEach(([u0, u1, h, col]) => { box(ctx, u0, u1, 0, h, QS - DEP, QS + DEP, col); });
  box(ctx, -10, -5, 0, 15, QS - DEP, QS + DEP, PL.blue);                                                   // the platform block
  box(ctx, -10.3, -4.7, 14.0, 15.0, QS - DEP - 0.3, QS + DEP + 0.3, PL.blueL);                              // its top slab
  for (const u of [-10.1, -4.9]) { const a = pp(u, 15, QS - DEP), b = pp(u, 19.5, QS - DEP); line(ctx, [a, b], PL.blueD, 8); }            // two back posts
  line(ctx, [pp(-10.1, 19.5, QS - DEP), pp(-4.9, 19.5, QS - DEP)], PL.blueD, 8);
}
function supports(ctx) {
  for (const u of [-1.0, 5.0]) { const h = CUE.rampH(u) - 1.0; const a = pp(u, h, QS - DEP + 0.6), b = pp(u, 0, QS - DEP + 0.6), c = pp(u + 1.1, 0, QS - DEP + 0.6); poly(ctx, [pp(u, h, QS - DEP + 0.6), pp(u + 1.1, h, QS - DEP + 0.6), c, b], PL.post, OUT, 2); }
  for (const u of [-1.0, 5.0]) { const h = CUE.rampH(u) - 1.0; poly(ctx, [pp(u, h, QS + DEP - 0.6), pp(u + 1.1, h, QS + DEP - 0.6), pp(u + 1.1, 0, QS + DEP - 0.6), pp(u, 0, QS + DEP - 0.6)], PL.blue, OUT, 2); }
}
function slideBack(ctx) { supports(ctx); }                                                                // everything BEHIND the characters
function slideFront(ctx) { }                                                                              // (nothing in front of the characters: the slide is a cut-away profile)
function drawStatic(ctx, w) { drawSky(ctx, w); drawFence(ctx); drawSwings(ctx, w); drawGround(ctx); }
// contact shadows of the structure on the sand (soft); the characters' own shadows are made by light.py
function structShadows(ctx) {
  softShadow(ctx, -11, QS + 0.5, 12.5, 3.4, 0.28); softShadow(ctx, 3, QS + 0.5, 11, 3.2, 0.24); softShadow(ctx, 10, QS + 0.4, 5, 2.6, 0.2);
}
