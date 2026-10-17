// scene.js — flat pastel iso props for Pebble Garden (front-elevation iso: front face + top face, depth q shifts down the screen). Pure functions of t.
const C = CUE, SC = C.S;
const OUT = '#3d3042', OUTW = 2.4;
const mix = (a, b, k) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
const lit = (c, k) => mix(c, '#ffffff', k), drk = (c, k) => mix(c, '#2a1f30', k);
const COL = { floor: '#cfe0cc', floor2: '#c3d6c1', wood: '#dcab70', woodD: '#c18a54', woodL: '#efc995', bamboo: '#a9d28f', bambooD: '#86b46f', bambooL: '#c9e6b4', stone: '#c9c6d8', stoneD: '#a9a5bd', bronze: '#e6bb5c', board: '#ead3ad', gantry: '#d9c4a8', cream: '#f6ecd6' };
const pp = (u, h, q = 0) => C.P(u, h, q);
function poly(ctx, pts, fill, stroke = OUT, w = OUTW) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.lineWidth = w; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.stroke(); } }
function line(ctx, pts, col, w, cap = 'round') { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = cap; ctx.lineJoin = 'round'; ctx.stroke(); }
function circle(ctx, x, y, r, fill, stroke = OUT, w = OUTW) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.lineWidth = w; ctx.strokeStyle = stroke; ctx.stroke(); } }
function grad(ctx, x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
// soft floor shadow (multiply), elliptical, centre (u,q), half-widths in cm
function softShadow(ctx, u, q, ru, rq, a = 0.22, h = 0) {
  const [x, y] = pp(u, h, q), rx = ru * SC, ry = rq * C.DQ * SC; ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.translate(x, y); ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, rx * 0.15, 0, 0, rx); g.addColorStop(0, `rgba(88,100,118,${a})`); g.addColorStop(1, 'rgba(88,100,118,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, 7); ctx.fill(); ctx.restore();
}
// front-elevation box: u0..u1, h0..h1, q0 (back) .. q1 (front). Faces: top (lit), front (base). Returns nothing.
function box(ctx, u0, u1, h0, h1, q0, q1, base, o = {}) {
  const A = pp(u0, h1, q1), B = pp(u1, h1, q1), Cc = pp(u1, h0, q1), D = pp(u0, h0, q1), A2 = pp(u0, h1, q0), B2 = pp(u1, h1, q0);
  poly(ctx, [A2, B2, B, A], o.top || lit(base, 0.38));                                   // top face
  const fr = grad(ctx, 0, A[1], 0, D[1], [[0, lit(base, 0.08)], [1, drk(base, 0.10)]]);
  poly(ctx, [A, B, Cc, D], fr);                                                         // front face
  if (o.grain) { ctx.save(); ctx.beginPath(); ctx.rect(A[0], A[1], B[0] - A[0], D[1] - A[1]); ctx.clip(); ctx.strokeStyle = drk(base, 0.16); ctx.lineWidth = 1.2; for (let k = 1; k <= o.grain; k++) { const y = A[1] + (D[1] - A[1]) * k / (o.grain + 1) + ((k * 7) % 3 - 1) * 1.5; ctx.beginPath(); ctx.moveTo(A[0] + 3, y); ctx.lineTo(B[0] - 3, y + ((k % 2) ? 1.2 : -1.2)); ctx.stroke(); } ctx.restore(); }
  ctx.strokeStyle = lit(base, 0.7); ctx.lineWidth = 1.6; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.moveTo(A[0] + 2, A[1] + 3); ctx.lineTo(D[0] + 2, D[1] - 3); ctx.stroke(); ctx.globalAlpha = 1;   // left-edge highlight
}
// slanted plank/gutter band between two points (marble-centre line a->b), surface below the centre line by RM
function surfPts(a, b, off = C.RM) { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L; const s = ny > 0 ? 1 : -1; return [[a[0] + nx * s * off * -1 * -1 * 0, a[1] - off * Math.abs(ny) / (Math.abs(ny)) * 0]]; }
// gutter (bamboo half pipe) along centre line a->b (marble centres); half = half depth (cm)
function gutterBack(ctx, a, b, o = {}) {
  const th = o.thick ?? 1.6, qh = o.q ?? 2.2, ex0 = o.ext0 ?? 2.6, ex1 = o.ext1 ?? 2.6, base = o.col || COL.bamboo;
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
  const a2 = [a[0] - ux * ex0, a[1] - uy * ex0], b2 = [b[0] + ux * ex1, b[1] + uy * ex1];
  const sa = [a2[0], a2[1] - C.RM], sb = [b2[0], b2[1] - C.RM];              // channel floor line (surface under the marble)
  // channel floor (top view band) + back wall
  poly(ctx, [pp(sa[0], sa[1], -qh), pp(sb[0], sb[1], -qh), pp(sb[0], sb[1], qh), pp(sa[0], sa[1], qh)], lit(base, 0.25));
  poly(ctx, [pp(sa[0], sa[1], -qh), pp(sb[0], sb[1], -qh), pp(sb[0], sb[1] + 2.6, -qh), pp(sa[0], sa[1] + 2.6, -qh)], drk(base, 0.14));
  // underside / thickness
  poly(ctx, [pp(sa[0], sa[1], qh), pp(sb[0], sb[1], qh), pp(sb[0], sb[1] - th, qh), pp(sa[0], sa[1] - th, qh)], base);
  line(ctx, [pp(sa[0], sa[1] - th * 0.3, qh), pp(sb[0], sb[1] - th * 0.3, qh)], lit(base, 0.55), 1.4);
  return { sa, sb, qh, th };
}
function gutterLip(ctx, a, b, o = {}) {      // front lip drawn after marbles
  const qh = o.q ?? 2.2, ex0 = o.ext0 ?? 2.6, ex1 = o.ext1 ?? 2.6, base = o.col || COL.bamboo, lh = o.lip ?? 1.5;
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
  const a2 = [a[0] - ux * ex0, a[1] - uy * ex0 - C.RM], b2 = [b[0] + ux * ex1, b[1] + uy * ex1 - C.RM];
  poly(ctx, [pp(a2[0], a2[1] + lh, qh), pp(b2[0], b2[1] + lh, qh), pp(b2[0], b2[1] - 1.3, qh), pp(a2[0], a2[1] - 1.3, qh)], base);
  line(ctx, [pp(a2[0], a2[1] + lh, qh), pp(b2[0], b2[1] + lh, qh)], lit(base, 0.6), 1.6);
}
function post(ctx, u, h0, h1, w, q0, q1, base, o) { box(ctx, u - w / 2, u + w / 2, h0, h1, q0, q1, base, o || {}); }
function sparkle(ctx, x, y, r, a) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#fffdf0'; ctx.beginPath(); for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4, rr = i % 2 ? r * 0.32 : r; ctx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); } ctx.closePath(); ctx.fill(); ctx.restore(); }

// ------------------------------------------------------------------ floor + static layer (cached)
let _STATIC = null;
function buildStatic() {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
  ctx.fillStyle = COL.floor; ctx.fillRect(0, 0, W, H);
  // very soft vertical value shift so the floor is not dead flat (top slightly lighter)
  ctx.fillStyle = grad(ctx, 0, 0, 0, H, [[0, 'rgba(255,255,255,0.22)'], [0.55, 'rgba(255,255,255,0)'], [1, 'rgba(60,90,80,0.10)']]); ctx.fillRect(0, 0, W, H);
  // raked sand lines: soft arcs around two stone clusters (faint)
  ctx.save(); ctx.lineCap = 'round';
  const rake = (cx, cy, r0, n, dr, col, a0, a1) => { for (let i = 0; i < n; i++) { const r = r0 + i * dr; ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.ellipse(cx, cy, r, r * C.DQ * 1.05, 0, a0, a1); ctx.stroke(); } ctx.globalAlpha = 1; };
  rake(900, 1735, 70, 6, 26, lit(COL.floor, 0.5), Math.PI * 0.95, Math.PI * 2.05);
  rake(120, 1760, 60, 6, 26, lit(COL.floor, 0.5), Math.PI * 0.98, Math.PI * 2.02);
  for (let y = 1640; y < 1900; y += 22) { ctx.strokeStyle = lit(COL.floor, 0.42); ctx.globalAlpha = 0.45; ctx.lineWidth = 2; ctx.beginPath(); const x0 = 230 + (y % 3) * 7; ctx.moveTo(x0, y); ctx.bezierCurveTo(x0 + 140, y - 8, x0 + 300, y + 8, x0 + 600, y - 4); ctx.stroke(); } ctx.globalAlpha = 1; ctx.restore();
  // zen stones (front corners) — real garden stones, not a base
  const stone = (x, y, rx, ry, col) => { ctx.save(); poly(ctx, [[x - rx, y], [x - rx * 0.8, y - ry * 0.7], [x - rx * 0.2, y - ry], [x + rx * 0.5, y - ry * 0.85], [x + rx, y - ry * 0.2], [x + rx * 0.9, y], [x, y + ry * 0.14]], col); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(x - rx * 0.3, y - ry * 0.62, rx * 0.32, ry * 0.14, -0.4, 0, 7); ctx.fill(); ctx.restore(); };
  softShadow(ctx, 0, 0, 1, 1, 0, 0);
  const shd = (x, y, rx) => { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.translate(x, y); ctx.scale(1, 0.3); const g = ctx.createRadialGradient(0, 0, rx * 0.2, 0, 0, rx); g.addColorStop(0, 'rgba(88,100,118,0.3)'); g.addColorStop(1, 'rgba(88,100,118,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, 7); ctx.fill(); ctx.restore(); };
  shd(905, 1700, 120); stone(905, 1698, 80, 66, COL.stone); shd(985, 1722, 60); stone(988, 1720, 46, 34, COL.stoneD);
  shd(110, 1712, 100); stone(112, 1710, 66, 50, COL.stoneD); shd(176, 1726, 44); stone(178, 1724, 34, 26, COL.stone);
  // moss tufts
  for (const [x, y] of [[860, 1690], [958, 1706], [86, 1700], [150, 1716]]) { ctx.fillStyle = '#9fcb94'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(x + k * 9 - 14, y - 6 - (k % 2) * 4, 7, 5, 0, 0, 7); ctx.fill(); } }
  return cv;
}
function floorLayer(ctx) {
  if (!_STATIC) _STATIC = buildStatic(); ctx.drawImage(_STATIC, 0, 0);
}

// ------------------------------------------------------------------ gantry (low-contrast structure behind the machine, q = -6)
function drawGantry(ctx) {
  const g = COL.gantry, qb = -7, qf = -5;
  softShadow(ctx, -41.2, -6, 3.4, 1.6, 0.18); softShadow(ctx, 35.4, -4, 10, 2, 0.18);
  post(ctx, -41.2, 0, 112, 3.6, qb, qf, g, { grain: 6 });
  for (const hh of [100.5, 73, 45.5]) box(ctx, -41.2, 27.0, hh - 1.0, hh + 1.0, qb, qf, g);
  // top cap
  box(ctx, -43.2, -39.2, 112, 114, qb - 0.5, qf + 0.5, lit(g, 0.1));
}

// ------------------------------------------------------------------ elevator
function drawElevatorBack(ctx, t) {
  const E = C.EL, qb = -2.5, qf = -0.6;
  // backboard (rounded top) behind the chain
  const u0 = E.uUp - 2.4, u1 = E.uDn + 2.4, h0 = 3, h1 = E.ht + E.rs + 3;
  softShadow(ctx, (u0 + u1) / 2, -1.5, 9.5, 2.2, 0.22);
  box(ctx, u0, u1, h0, h1, qb, qf, COL.board, { grain: 12 });
  // slot (darker groove) following the chain loop
  const pts = []; for (let s = 0; s <= E.L; s += 2.0) pts.push(pp(...C.pin(s), -0.45));
  ctx.save(); line(ctx, pts.concat([pts[0]]), 'rgba(110,80,60,0.28)', 15); ctx.restore();
  // chain: two thin rails + link dashes moving with the belt
  const off = C.mod(E.V * t, E.SP / 4);
  const rail = []; for (let s = 0; s <= E.L + 0.01; s += 1.5) rail.push(pp(...C.pin(s), 0));
  line(ctx, rail, '#7a5a4c', 4.2);
  for (let s = off; s < E.L; s += E.SP / 4) { const a = C.pin(s), b = C.pin(s + 0.9), A = pp(a[0], a[1], 0), B = pp(b[0], b[1], 0); line(ctx, [A, B], '#f0dcc0', 4.6); }
  // sprockets
  for (const hc of [E.ht, E.hb]) {
    const [x, y] = pp(E.uc, hc, 0.4), r = E.rs * SC; const rot = E.V * t / E.rs;
    ctx.save(); ctx.translate(x, y); softShadow(ctx, 0, 0, 0, 0, 0);
    circle(ctx, 0, 0, r * 0.98, COL.wood, OUT, OUTW); circle(ctx, 0, 0, r * 0.62, COL.woodL, drk(COL.wood, 0.3), 1.6);
    ctx.rotate(rot); for (let k = 0; k < 6; k++) { ctx.rotate(Math.PI / 3); poly(ctx, [[r * 0.2, -r * 0.1], [r * 0.9, -r * 0.1], [r * 0.9, r * 0.1], [r * 0.2, r * 0.1]], drk(COL.wood, 0.14), 'rgba(61,48,66,0.7)', 1.4); circle(ctx, r * 0.94, 0, r * 0.07, '#7a5a4c', null); }
    ctx.rotate(-rot); circle(ctx, 0, 0, r * 0.2, COL.bronze, OUT, 2); circle(ctx, -r * 0.05, -r * 0.05, r * 0.07, '#fff6d4', null);
    ctx.restore();
  }
  // foot block under the backboard
  box(ctx, u0 - 1.2, u1 + 1.2, 0, 3, qb - 1, qf + 1.2, COL.woodD, { grain: 2 });
  // cups (all eight), upright hanging trays
  for (const cp of C.cups(t)) drawCup(ctx, cp);
}
function drawCup(ctx, cp) {
  const [px, py] = pp(cp.pin[0], cp.pin[1], 0.2);
  ctx.save(); ctx.translate(px, py); ctx.rotate(cp.tilt);
  const cx = C.CUPO ? 0 : 0; const ox = -3.6 * SC, oy = 2.6 * SC;                                        // cup centre offset (screen: +y down)
  // hanger arm
  line(ctx, [[0, 0], [ox * 0.55, oy * 0.55 - 6]], '#7a5a4c', 4);
  // bowl (front view): half-pipe tray
  ctx.beginPath(); ctx.moveTo(ox - 3.6 * SC, oy - 0.6 * SC); ctx.lineTo(ox + 3.6 * SC, oy - 0.6 * SC); ctx.quadraticCurveTo(ox + 3.2 * SC, oy + 2.4 * SC, ox, oy + 2.5 * SC); ctx.quadraticCurveTo(ox - 3.2 * SC, oy + 2.4 * SC, ox - 3.6 * SC, oy - 0.6 * SC); ctx.closePath();
  ctx.fillStyle = grad(ctx, 0, oy - 6, 0, oy + 2.5 * SC, [[0, lit(COL.bamboo, 0.2)], [1, COL.bambooD]]); ctx.fill(); ctx.lineWidth = OUTW; ctx.strokeStyle = OUT; ctx.lineJoin = 'round'; ctx.stroke();
  line(ctx, [[ox - 3.4 * SC, oy - 0.6 * SC], [ox + 3.4 * SC, oy - 0.6 * SC]], lit(COL.bamboo, 0.7), 2.2);
  circle(ctx, 0, 0, 5.5, COL.bronze, OUT, 2);
  ctx.restore();
}
function drawCupLips(ctx, t, ridingOnly) {
  // front rim of a cup that carries a marble (drawn after the marble)
  for (const cp of C.cups(t)) {
    const [px, py] = pp(cp.pin[0], cp.pin[1], 0.2); ctx.save(); ctx.translate(px, py); ctx.rotate(cp.tilt);
    const ox = -3.6 * SC, oy = 2.6 * SC; ctx.beginPath(); ctx.moveTo(ox - 3.3 * SC, oy - 0.2 * SC); ctx.quadraticCurveTo(ox, oy + 1.1 * SC, ox + 3.3 * SC, oy - 0.2 * SC);
    ctx.lineWidth = 6; ctx.strokeStyle = COL.bambooD; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke(); ctx.restore();
  }
}

// ------------------------------------------------------------------ station 1: chute + wall block
function drawChute1(ctx, t) {
  const a = C.CH.a, b = C.CH.b; gutterBack(ctx, a, b, { ext0: 1.2, ext1: 1.8 });
  // supports: bracket from the backboard and two struts to the gantry
  const sa = [a[0] + 2, a[1] - C.RM], sb = [b[0], b[1] - C.RM];
  line(ctx, [pp(sb[0] + 1, sb[1] - 1.6, -2), pp(sb[0] + 1, 100.5 + 0.9, -5)], drk(COL.gantry, 0.2), 4); line(ctx, [pp(-2, 100.5, -2.5), pp(-2, (sa[1] + (sb[1] - sa[1]) * 0.55) - 1.6, -1.5)], drk(COL.gantry, 0.2), 4);
  box(ctx, 24.2, 29.2, a[1] - C.RM - 2.2, a[1] - C.RM - 0.2, -2.4, -0.4, COL.woodD);
}
function drawBlock(ctx, t) {
  const rel = C.xOf(t, 0), k = rel >= 0 ? Math.exp(-rel * 22) * Math.sin(rel * 70) : 0, dx = -0.5 * Math.max(0, k);      // block recoils (to the left) when hit
  const b = C.CH.b, u1 = b[0] - 2.2, h0 = 89.5, h1 = 104.5;
  box(ctx, u1 - 3.4 + dx, u1 + dx, h0, h1, -3.4, 3.4, COL.wood, { grain: 5 });
  // face plate (marble strike pad, front half)
  const A = pp(u1 + dx - 0.2, 99, 3.4), B = pp(u1 + dx - 0.2, 93, 3.4);
  line(ctx, [A, B], drk(COL.wood, 0.34), 3);
  if (rel >= 0 && rel < 0.12) sparkle(ctx, pp(u1 + 1.2, b[1])[0] + 4, pp(u1, b[1])[1], 26 * (1 - rel / 0.12), 1 - rel / 0.12);
}

// ------------------------------------------------------------------ station 2: marimba
const BARCOL = ['#ff9db0', '#ffb98a', '#ffe28a', '#b5e29a', '#86d6c8', '#8cc4f0', '#a9a4f2', '#d9a6f0'];
function drawMarimba(ctx, t) {
  const bs = C.BARS;
  // rail (back stringer) following the bars, plus legs to the gantry
  line(ctx, [pp(bs[0].u - 3, bs[0].h - 1.2, -5.5), pp(bs[7].u + 3, bs[7].h - 1.2, -5.5)], drk(COL.wood, 0.1), 7);
  for (let i = 0; i < 8; i++) {
    const b = bs[i], rel = C.xOf(t, 0.25 * (i + 1)), dip = rel >= 0 ? 0.55 * Math.exp(-rel * 26) : 0, ring = rel >= 0 ? Math.exp(-rel * 7) : 0;
    // resonator tube hanging below (longer for the lower notes)
    const tl = 13.5 - 1.15 * i, tu = b.u;
    const A = pp(tu - 1.5, b.h - 1.8, 0), B = pp(tu + 1.5, b.h - 1.8, 0), D = pp(tu - 1.5, b.h - 1.8 - tl, 0), E = pp(tu + 1.5, b.h - 1.8 - tl, 0);
    poly(ctx, [A, B, E, D], grad(ctx, A[0], 0, B[0], 0, [[0, lit(COL.bamboo, 0.1)], [1, COL.bambooD]]));
    ctx.beginPath(); ctx.ellipse((D[0] + E[0]) / 2, D[1], (E[0] - D[0]) / 2, 5, 0, 0, 7); ctx.fillStyle = drk(COL.bambooD, 0.3); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
    // the bar
    const col = BARCOL[i]; box(ctx, b.u - b.w / 2, b.u + b.w / 2, b.h - 1.8 - dip, b.h - dip, -b.d / 2, b.d / 2, col, { top: lit(col, 0.45) });
    if (ring > 0.02) { ctx.save(); ctx.globalAlpha = 0.5 * ring; ctx.strokeStyle = '#fffbe6'; ctx.lineWidth = 3; for (const s of [1, 2]) { ctx.beginPath(); ctx.arc(...pp(b.u, b.h, 0), (14 + s * 12 + (1 - ring) * 16), 3.7, 5.6); ctx.stroke(); } ctx.restore(); }
  }
}

// ------------------------------------------------------------------ station 3: catch tray + ramp 3 + shishi-odoshi
function drawStation3(ctx, t) {
  const c = C.CATCH, l = C.LIP3;
  // catch tray (curved back stop on the right) + ramp
  gutterBack(ctx, c, l, { ext0: 3.6, ext1: 1.6, q: 2.2 });
  box(ctx, c[0] + 2.8, c[0] + 4.6, c[1] - C.RM - 1.5, c[1] + 2.4, -2.2, 2.2, COL.bambooD);
  line(ctx, [pp(c[0] + 1, c[1] - C.RM - 1.6, -2), pp(c[0] + 1, 45.5 + 0.9, -5)], drk(COL.gantry, 0.2), 4); line(ctx, [pp(l[0] + 1, l[1] - C.RM - 1.6, -2), pp(l[0] + 1, 45.5 + 0.9, -5)], drk(COL.gantry, 0.2), 4);
  // shishi-odoshi: post + bamboo tube pivoting + stone
  const pv = C.SHI.pv, ang = C.shiAng(3.3 + C.mod(t - (C.TBP + C.RIDE + C.TBLOCK) - 3.3, 2));
  softShadow(ctx, pv[0], 0, 5, 2, 0.0);
  box(ctx, pv[0] - 1.6, pv[0] + 1.6, 28, pv[1] - 0.5, -2, 1.2, COL.wood, { grain: 3 });              // post
  box(ctx, pv[0] - 5, pv[0] + 5, 27, 29, -3, 2.4, COL.woodD);                                        // foot rail on the gantry
  // stone the tail strikes
  const st = C.SHI.stone; poly(ctx, [pp(st[0] - 3.4, st[1] - 1.0, 0), pp(st[0] - 2.2, st[1] + 1.6, 0), pp(st[0] + 1.6, st[1] + 2.0, 0), pp(st[0] + 3.4, st[1] - 0.2, 0), pp(st[0] + 2.6, st[1] - 1.6, 0)], COL.stone);
  // the tube (rotated about the pivot, screen-clockwise positive)
  const [px, py] = pp(pv[0], pv[1], 0.6); ctx.save(); ctx.translate(px, py); ctx.rotate(ang);
  const L0 = -C.SHI.cupL * SC, L1 = C.SHI.tailL * SC, R = 2.7 * SC;                                  // cup end to the left
  ctx.beginPath(); ctx.moveTo(-L0, -R); ctx.lineTo(L1, -R); ctx.quadraticCurveTo(L1 + 8, 0, L1, R); ctx.lineTo(-L0 + 6, R); ctx.lineTo(-L0 + 6, 0.2 * R); ctx.lineTo(-L0 + 1, -0.1 * R); ctx.closePath();
  ctx.fillStyle = grad(ctx, 0, -R, 0, R, [[0, lit(COL.bamboo, 0.3)], [0.55, COL.bamboo], [1, COL.bambooD]]); ctx.fill(); ctx.lineWidth = OUTW; ctx.strokeStyle = OUT; ctx.lineJoin = 'round'; ctx.stroke();
  // open scoop at the cup end (dark inside) + nodes
  ctx.beginPath(); ctx.ellipse(-L0 + 8, -R * 0.55, 18, 9, -0.35, 0, 7); ctx.fillStyle = drk(COL.bambooD, 0.55); ctx.fill();
  for (const nx of [-L0 * 0.15, L1 * 0.55]) { ctx.beginPath(); ctx.moveTo(nx, -R); ctx.lineTo(nx, R); ctx.lineWidth = 3; ctx.strokeStyle = drk(COL.bambooD, 0.25); ctx.stroke(); }
  circle(ctx, 0, 0, 8, COL.bronze, OUT, 2);
  ctx.restore();
  const rel = C.xOf(t, 4.5); if (rel >= 0 && rel < 0.12) sparkle(ctx, ...pp(st[0] + 1, st[1] + 1.5, 0), 30 * (1 - rel / 0.12), 1 - rel / 0.12);
  // ramp 3b (pour spout) down to the low gutter
  const o3 = C.shiMarble(3.9); gutterBack(ctx, [o3[0] + 0.0, o3[1] - 0.3], [o3[0] - 4.2, 30.4], { ext0: 0.6, ext1: 1.0, q: 2.0 });
}

// ------------------------------------------------------------------ station 4: low gutter, plank, stool
function drawStage(ctx, t) {
  // low gutter on little legs (Mochi pats the marble onto it)
  const g = C.GUT; softShadow(ctx, -20, 0, 9, 3, 0.26);
  const a = [g.a[0] + 1.5, g.a[1] + C.RM + 0.6], b = [g.b[0], g.b[1] + C.RM];
  gutterBack(ctx, [g.a[0], g.a[1] + C.RM], [g.b[0] + 1.2, g.b[1] + C.RM], { ext0: 3.0, ext1: 0.6, q: 2.2, col: COL.wood });
  for (const [u, h] of [[g.a[0] - 1.4, g.a[1]], [g.b[0] - 0.6, g.b[1]]]) box(ctx, u - 0.9, u + 0.9, 0, h - 1.6, -1.6, 1.4, COL.woodD);
  // plank + fulcrum
  const x = 6.4 + C.mod(t - (C.TBP + C.RIDE + C.TBLOCK) - 6.4, 2), pk = C.plank(x), pv = C.PLK.pv;
  softShadow(ctx, pv[0], 0, 9, 2.6, 0.3); softShadow(ctx, 12, 0, 6, 2.6, 0.3);
  poly(ctx, [pp(pv[0] - 3.2, 0, 2), pp(pv[0] + 3.2, 0, 2), pp(pv[0], pv[1] - 1.1, 2)], COL.woodD);            // fulcrum wedge
  const A = pp(pk.L[0], pk.L[1] + 0.0, 2.6), B = pp(pk.R[0], pk.R[1], 2.6), th = 1.6, Bd = pp(pk.R[0], pk.R[1] - th, 2.6), Ad = pp(pk.L[0], pk.L[1] - th, 2.6);
  const A2 = pp(pk.L[0], pk.L[1], -2.6), B2 = pp(pk.R[0], pk.R[1], -2.6);
  poly(ctx, [A2, B2, B, A], lit(COL.wood, 0.38)); poly(ctx, [A, B, Bd, Ad], COL.wood);
  line(ctx, [[A[0] + 3, A[1] + 3], [B[0] - 3, B[1] + 3]], lit(COL.wood, 0.7), 1.6);
  // stool the samurai hops from
  const s = C.STOOL; box(ctx, s.u - 4.6, s.u + 4.6, 0, s.h, -3.2, 3.2, COL.wood, { grain: 4 });
  box(ctx, s.u - 4.9, s.u + 4.9, s.h - 0.6, s.h, -3.5, 3.5, COL.woodL);
}

// ------------------------------------------------------------------ marbles (front layer)
function drawMarble(ctx, u, h, col, a = 1, q = 0) {
  const [x, y] = pp(u, h, q), r = C.RM * SC;
  ctx.save(); ctx.globalAlpha = a;
  circle(ctx, x, y, r, null, null);
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = grad(ctx, x - r * 0.6, y - r * 0.7, x + r * 0.8, y + r * 0.9, [[0, lit(col, 0.45)], [0.45, col], [1, drk(col, 0.28)]]); ctx.fill();
  ctx.lineWidth = 2.2; ctx.strokeStyle = OUT; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.26, r * 0.16, -0.7, 0, 7); ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.28, y + r * 0.34, r * 0.1, 0, 7); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fill();
  ctx.restore();
}
function marbleShadow(ctx, u, h, below) {                 // tiny contact shadow on the surface directly under the marble
  if (below == null) return; const [x, y] = pp(u, below, 0); ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(70,64,90,0.28)'; ctx.beginPath(); ctx.ellipse(x, y + 2, 16 * Math.max(0.4, 1 - (h - below) / 40), 4.5, 0, 0, 7); ctx.fill(); ctx.restore();
}
