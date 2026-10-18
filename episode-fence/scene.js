// scene.js — back alley with a picket fence (one gap), garden behind, cobbled path in front, sky + trees. Front-elevation iso, drawn in world px under the pan/zoom camera.
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
const WALL_Y = CUE.WALL_Y, FX0 = -700, FX1 = 1800, FY1 = 2600, H_ = (...a) => CUE.hash(...a);
const PL = { coral: '#ff8f7d', lemon: '#ffd86b', blue: '#5b9fe0' };
const QF = CUE.QF, FH = CUE.FH, GU0 = CUE.GU0, GU1 = CUE.GU1, BR = CUE.BR;
// ---------------------------------------------------------------- sky + far scenery (same family as the park, no swings)
function drawSky(ctx, w) {
  ctx.fillStyle = grad(ctx, 0, 400, 0, WALL_Y, [[0, '#8cc6ee'], [0.55, '#bde1f4'], [1, '#fdeccd']]); ctx.fillRect(FX0, 400, FX1 - FX0, WALL_Y - 400);
  const sg = ctx.createRadialGradient(860, 860, 10, 860, 860, 380); sg.addColorStop(0, 'rgba(255,248,214,0.95)'); sg.addColorStop(1, 'rgba(255,248,214,0)'); ctx.fillStyle = sg; ctx.fillRect(FX0, 400, FX1 - FX0, WALL_Y - 400);
  ctx.fillStyle = '#fffbe8'; ctx.beginPath(); ctx.arc(860, 860, 34, 0, 7); ctx.fill();
  for (let i = 0; i < 4; i++) {
    const base = (i * 380 + 120 - w * 3 + 4000) % 1500 - 300, y = 780 + 110 * H_(i, 1) + (i % 2) * 60, sc = 0.8 + 0.5 * H_(i, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; for (const [dx, dy, r] of [[0, 0, 38], [42, -14, 46], [96, 0, 40], [60, 12, 40], [-32, 8, 28], [128, 8, 26]]) { ctx.beginPath(); ctx.arc(base + dx * sc, y + dy * sc, r * sc, 0, 7); ctx.fill(); }
    ctx.fillStyle = 'rgba(190,214,238,0.5)'; ctx.beginPath(); ctx.ellipse(base + 60 * sc, y + 30 * sc, 96 * sc, 14 * sc, 0, 0, 7); ctx.fill();
  }
  ctx.fillStyle = '#b9d9c0'; ctx.beginPath(); ctx.moveTo(FX0, WALL_Y); for (let x = FX0; x <= FX1; x += 20) ctx.lineTo(x, WALL_Y - 70 - 40 * Math.sin(x * 0.004 + 1) - 22 * Math.sin(x * 0.011)); ctx.lineTo(FX1, WALL_Y); ctx.fill();
  for (let i = 0; i < 14; i++) {
    const x = FX0 + 80 + i * 175 + 40 * H_(i, 3), y = WALL_Y - 4, r = 62 + 34 * H_(i, 4), col = ['#6aa86a', '#5a9a62', '#7bb86f'][i % 3];
    ctx.fillStyle = '#7a5a46'; ctx.fillRect(x - 6, y - 70, 12, 70);
    for (const [dx, dy, rr] of [[0, -r * 1.05, r], [-r * 0.6, -r * 0.75, r * 0.7], [r * 0.62, -r * 0.7, r * 0.72]]) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + dx, y + dy - 40, rr, 0, 7); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 1.2 - 40, r * 0.5, 0, 7); ctx.fill();
  }
  ctx.fillStyle = '#82b872'; ctx.fillRect(FX0, WALL_Y - 6, FX1 - FX0, 60);
}
// ---------------------------------------------------------------- ground: garden grass behind the fence (q < QF), cobbled alley path in front (q > QF)
function drawGround(ctx) {
  const yF = pp(0, 0, QF)[1];
  ctx.fillStyle = grad(ctx, 0, WALL_Y, 0, yF, [[0, '#86c076'], [1, '#74b064']]); ctx.fillRect(FX0, WALL_Y, FX1 - FX0, yF - WALL_Y + 2);
  for (let i = 0; i < 110; i++) { const x = FX0 + H_(i, 5) * (FX1 - FX0), y = WALL_Y + 4 + H_(i, 6) * (yF - WALL_Y - 8); ctx.strokeStyle = 'rgba(60,120,60,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y - 9); ctx.moveTo(x, y); ctx.lineTo(x + 4, y - 8); ctx.stroke(); }
  for (let i = 0; i < 18; i++) { const x = FX0 + 60 + H_(i, 7) * (FX1 - FX0 - 120), y = WALL_Y + 14 + H_(i, 8) * (yF - WALL_Y - 28), col = ['#fff', '#ffd1e0', '#fff3a0'][i % 3]; for (let k = 0; k < 5; k++) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + Math.cos(k * 1.256) * 4.5, y + Math.sin(k * 1.256) * 4.5, 3.2, 0, 7); ctx.fill(); } ctx.fillStyle = '#f2b43c'; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 7); ctx.fill(); }
  // alley path: warm grey flagstones in rows, mossy cracks, a few weeds
  ctx.fillStyle = grad(ctx, 0, yF, 0, FY1, [[0, '#cdbfae'], [0.4, '#d8cab6'], [1, '#c9baa6']]); ctx.fillRect(FX0, yF, FX1 - FX0, FY1 - yF);
  let y = yF, row = 0; while (y < FY1) { const hgt = 30 + row * 9; ctx.strokeStyle = 'rgba(95,80,70,0.38)'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(FX0, y); ctx.lineTo(FX1, y); ctx.stroke();
    let x = FX0 + 90 * H_(row, 31) - 90; while (x < FX1) { const wd = (70 + 60 * H_(row, x | 0)) * (1 + row * 0.07); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + hgt); ctx.stroke(); if (H_(row, x | 0, 3) > 0.55) { ctx.fillStyle = `rgba(${H_(x | 0, row) > 0.5 ? '255,248,230' : '150,125,100'},0.16)`; ctx.fillRect(x + 3, y + 3, wd - 6, hgt - 6); } x += wd; } y += hgt; row++; }
  for (let i = 0; i < 40; i++) { const x = FX0 + H_(i, 41) * (FX1 - FX0), yy = yF + 10 + H_(i, 42) * (FY1 - yF - 20); ctx.strokeStyle = 'rgba(95,140,80,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x - 2, yy - 7); ctx.moveTo(x, yy); ctx.lineTo(x + 3, yy - 6); ctx.stroke(); }
  ctx.fillStyle = grad(ctx, 0, yF, 0, yF + 46, [[0, 'rgba(70,55,40,0.32)'], [1, 'rgba(70,55,40,0)']]); ctx.fillRect(FX0, yF, FX1 - FX0, 46);       // fence-foot shadow on the path
}
// ---------------------------------------------------------------- the fence: weathered boards, one gap [GU0, GU1]
const BOARDS = (() => { const b = []; for (let k = 0; k < 9; k++) { b.push([GU0 - CUE.BW - k * CUE.BP, GU0 - k * CUE.BP]); b.push([GU1 + k * CUE.BP, GU1 + CUE.BW + k * CUE.BP]); } return b; })();
const fencePolys = () => { const yb = pp(0, 0, QF)[1], yt = pp(0, FH, QF)[1]; return BOARDS.map(([a, b]) => { const x0 = pp(a, 0, QF)[0], x1 = pp(b, 0, QF)[0]; return [[x0, yb], [x0, yt + 12], [(x0 + x1) / 2, yt - 6], [x1, yt + 12], [x1, yb]]; }); };
function drawFence(ctx) {
  const yb = pp(0, 0, QF)[1], yt = pp(0, FH, QF)[1];
  BOARDS.forEach(([a, b], i) => { const x0 = pp(a, 0, QF)[0], x1 = pp(b, 0, QF)[0], tone = [0.0, 0.06, -0.04, 0.03][i % 4];
    const cap = [[x0, yt + 12], [(x0 + x1) / 2, yt - 6], [x1, yt + 12]];
    ctx.beginPath(); ctx.moveTo(x0, yb); ctx.lineTo(x0, cap[0][1]); ctx.lineTo(cap[1][0], cap[1][1]); ctx.lineTo(x1, cap[2][1]); ctx.lineTo(x1, yb); ctx.closePath();
    ctx.fillStyle = grad(ctx, x0, 0, x1, 0, [[0, lit('#f1e2c4', 0.1 + tone)], [0.7, '#ead9b6'], [1, drk('#e4cfa8', 0.1)]]); ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = OUT; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.strokeStyle = 'rgba(150,115,80,0.35)'; ctx.lineWidth = 1.6; for (let g = 0; g < 3; g++) { const gx = x0 + (x1 - x0) * (0.3 + 0.2 * g + 0.05 * H_(i, g)); ctx.beginPath(); ctx.moveTo(gx, yt + 30); ctx.lineTo(gx + 2, yb - 8 - 20 * H_(i, g + 4)); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x0 + 3, yt + 18, 3, yb - yt - 26);                                       // left-edge highlight
    ctx.fillStyle = 'rgba(70,50,40,0.12)'; ctx.fillRect(x1 - 7, yt + 14, 7, yb - yt - 14);                                          // right-edge shade
    if (i === 3) { ctx.fillStyle = '#7a5b44'; ctx.beginPath(); ctx.ellipse((x0 + x1) / 2, yt + 60, 7, 10, 0, 0, 7); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.6; ctx.stroke(); }  // a knot hole
  });
  // two rails seen through the slits, behind the boards (only where boards exist; none across the gap)
}
function drawBall(ctx, w) {
  const b = CUE.ballPos(w), [x, y] = pp(b.u, b.h, b.q), r = BR * SC, a = b.roll;
  ctx.save(); ctx.translate(x, y);
  circle(ctx, 0, 0, r, '#fff6e6', OUT, 2.4);
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, 7); ctx.clip(); ctx.rotate(a);
  for (let k = 0; k < 3; k++) { ctx.fillStyle = [PL.coral, PL.lemon, PL.blue][k]; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r * 1.4, k * 2.094 + 0.2, k * 2.094 + 0.2 + 1.047); ctx.closePath(); ctx.fill(); }
  ctx.restore(); circle(ctx, 0, 0, r, null, OUT, 2.4); circle(ctx, 0, 0, r * 0.14, '#fff', OUT, 1.6);
  ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.beginPath(); ctx.ellipse(-r * 0.35, -r * 0.4, r * 0.22, r * 0.12, -0.7, 0, 7); ctx.fill();
  ctx.restore();
}
function drawStatic(ctx, w) { drawSky(ctx, w); drawGround(ctx); drawFence(ctx); }
function ballShadow(ctx, w) { const b = CUE.ballPos(w); softShadow(ctx, b.u, b.q + 0.2, BR * 1.1, 0.9, 0.34); }
// clip helper: everything that stands BEHIND the fence plane is drawn with the boards cut out
function behindFence(ctx, fn) { ctx.save(); ctx.beginPath(); ctx.rect(-5000, -5000, 12000, 12000); for (const P of fencePolys()) { ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]); ctx.closePath(); } ctx.clip('evenodd'); fn(); ctx.restore(); }
