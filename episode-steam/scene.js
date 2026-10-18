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
function drawFloor(ctx) {                                                    // a flat stone ledge on a mountain top: slabs, cracks, lichen, moss rim at the far edge
  const H = (...a) => CUE.hash(...a);
  ctx.fillStyle = grad(ctx, 0, WALL_Y, 0, FY1, [[0, '#8f8a92'], [1, '#a59f9c']]); ctx.fillRect(FX0, WALL_Y, FX1 - FX0, FY1 - WALL_Y);
  const PH = 5.2 * C.DQ * SC, j0 = Math.floor(WALL_Y / PH);
  for (let j = j0; j * PH < FY1; j++) {                                      // rows of irregular slabs
    const y = Math.max(j * PH, WALL_Y); let x = FX0 - H(j, 1) * 300;
    while (x < FX1) {
      const wdt = 230 + 260 * H(j, x | 0), tone = H(j, 7 + (x | 0));
      ctx.fillStyle = mix('#9a949a', tone > 0.5 ? '#b8b0a8' : '#807b86', 0.25 + 0.35 * Math.abs(tone - 0.5) * 2); ctx.globalAlpha = 0.6; ctx.fillRect(x, y, wdt, PH); ctx.globalAlpha = 1;
      ctx.strokeStyle = '#5f5a68'; ctx.lineWidth = 2.4; ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 6 * (H(j, 3) - 0.5), y + PH); ctx.stroke(); ctx.globalAlpha = 1;
      for (let k = 0; k < 3; k++) { const px_ = x + wdt * H(j, k + 20, x | 0), py = y + PH * (0.2 + 0.6 * H(k, j, 5)); ctx.fillStyle = k === 0 ? '#9cae8c' : '#6f6a78'; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.ellipse(px_, py, 5 + 9 * H(k, j, 8), 2.5 + 3 * H(k, j, 9), 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
      x += wdt;
    }
    ctx.strokeStyle = '#625c6c'; ctx.lineWidth = 2.4; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.moveTo(FX0, y); ctx.lineTo(FX1, y); ctx.stroke(); ctx.globalAlpha = 1;
  }
  ctx.fillStyle = grad(ctx, 0, WALL_Y, 0, WALL_Y + 140, [[0, 'rgba(30,24,50,0.35)'], [1, 'rgba(30,24,50,0)']]); ctx.fillRect(FX0, WALL_Y, FX1 - FX0, 140);   // far edge of the ledge falls into shade
  for (let x = FX0; x < FX1; x += 26) { const hh = 10 + 16 * CUE.hash(x | 0, 4); ctx.fillStyle = CUE.hash(x | 0, 5) > 0.5 ? '#6f8f5c' : '#58784c'; ctx.beginPath(); ctx.moveTo(x, WALL_Y + 3); ctx.quadraticCurveTo(x + 5, WALL_Y - hh, x + 13, WALL_Y + 3); ctx.fill(); }  // moss/grass tufts on the rim
}
function drawWall(ctx) {                                                     // blue hour above a sea of clouds: sky, low sun glow, far peaks, cloud sea, one pine branch
  const H = (...a) => CUE.hash(...a), x0 = FX0, x1 = FX1, y0 = 0;
  ctx.fillStyle = grad(ctx, 0, y0, 0, WALL_Y, [[0, '#232b5a'], [0.45, '#5b4f8f'], [0.78, '#d68aa0'], [1, '#ffc79a']]); ctx.fillRect(x0, y0, x1 - x0, WALL_Y - y0);
  for (let i = 0; i < 26; i++) { const sx = 200 + 700 * H(i, 1), sy = 740 + 330 * H(i, 2) * H(i, 2); ctx.fillStyle = '#fff6e0'; ctx.globalAlpha = 0.25 + 0.4 * H(i, 3) * (1 - sy / 1100); ctx.beginPath(); ctx.arc(sx, sy, 1.2 + 1.6 * H(i, 4), 0, 7); ctx.fill(); }   // fading stars
  const sx0 = 770, sy0 = WALL_Y - 40;                                        // the sun: half behind the clouds
  ctx.globalAlpha = 1; ctx.fillStyle = grad(ctx, 0, sy0 - 220, 0, sy0 + 20, [[0, 'rgba(255,214,160,0)'], [1, 'rgba(255,214,160,0.55)']]); ctx.beginPath(); ctx.arc(sx0, sy0, 230, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff2cf'; ctx.beginPath(); ctx.arc(sx0, sy0, 46, 0, 7); ctx.fill();
  const ridge = (base, amp, col, seed, step) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x0, WALL_Y); for (let x = x0; x <= x1; x += step) { const n = Math.sin(x * 0.0061 + seed) * 0.5 + Math.sin(x * 0.0173 + seed * 2.1) * 0.3 + Math.sin(x * 0.041 + seed * 3.3) * 0.2; ctx.lineTo(x, base - amp * (0.5 + 0.5 * n) * (0.55 + 0.45 * Math.abs(Math.sin(x * 0.004 + seed)))); } ctx.lineTo(x1, WALL_Y); ctx.fill(); };
  ridge(WALL_Y - 40, 300, '#9a7fa8', 1.3, 14); ridge(WALL_Y - 25, 210, '#6d5e96', 4.1, 12); ridge(WALL_Y - 10, 120, '#47467c', 7.7, 10);
  for (let r = 0; r < 4; r++) {                                              // sea of clouds, 4 bands, light on the tops
    const yb = WALL_Y - 120 + r * 30, col = ['#b78ab0', '#a77ca6', '#966f9c', '#84628f'][r];
    for (let x = x0 - 40; x < x1 + 60; x += 70 + 40 * H(r, x | 0)) { const rx = 80 + 70 * H(r, 3, x | 0), ry = 28 + 22 * H(r, 4, x | 0); ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, yb + 30 * H(r, 5, x | 0), rx, ry, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,214,206,0.34)'; ctx.beginPath(); ctx.ellipse(x - rx * 0.1, yb + 30 * H(r, 5, x | 0) - ry * 0.45, rx * 0.7, ry * 0.4, 0, 0, 7); ctx.fill(); }
  }
  ctx.fillStyle = '#84628f'; ctx.fillRect(x0, WALL_Y - 40, x1 - x0, 40);
  ctx.save(); ctx.strokeStyle = '#2a2236'; ctx.lineCap = 'round'; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(210, 745); ctx.bezierCurveTo(290, 770, 340, 760, 430, 810); ctx.stroke(); ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(330, 770); ctx.bezierCurveTo(350, 810, 380, 830, 400, 870); ctx.stroke();   // pine branch, top left
  for (const [cx, cy, r] of [[300, 790, 30], [380, 820, 34], [440, 818, 26], [395, 878, 24], [250, 770, 26]]) for (let k = 0; k < 14; k++) { const an = -1.2 + k * 0.5, L = r + 8 * H(k, cx); ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(an) * L, cy + Math.sin(an) * L * 0.8 + 10); ctx.stroke(); }
  ctx.restore();
}
function woodGrain(ctx, x0, y0, x1, y1, base, n, seed) {
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip(); ctx.strokeStyle = drk(base, 0.18); ctx.lineWidth = 1.4; ctx.globalAlpha = 0.4;
  for (let i = 0; i < n; i++) { const y = y0 + (y1 - y0) * (i + 0.5) / n + (CUE.hash(seed, i) - 0.5) * 5; ctx.beginPath(); ctx.moveTo(x0, y); ctx.bezierCurveTo(x0 + (x1 - x0) * 0.3, y + 3, x0 + (x1 - x0) * 0.7, y - 3, x1, y + (CUE.hash(seed, i + 9) - 0.5) * 3); ctx.stroke(); }
  ctx.restore();
}
// ------------------------------------------------------------------ the iron kettle (tetsubin) on a charcoal brazier (hibachi). geometry in cm at q = KQ; light.py adds coal glow + steam
const KT = CUE.KET, KQ = CUE.KQ;
const K_H = { box: 3.0, body0: 3.8, body1: 9.4, lid1: 10.6, knob: 11.5 };                 // heights (cm)
function kettleState(w) {
  const sh = CUE.KS(CUE.SHAKE, w), lr = CUE.KS(CUE.LIDR, w), up = CUE.KS(CUE.LIDUP, w), pr = CUE.KS(CUE.PRESS, w);
  const dx = sh * 1.4 * Math.sin(w * TAU * 31) + 0.35 * sh * Math.sin(w * TAU * 53), dy = sh * 0.7 * Math.abs(Math.sin(w * TAU * 27));
  const lidH = up * 2.2 + lr * 0.18 * Math.abs(Math.sin(w * TAU * 13)) - pr * 0.0, lidTilt = lr * 0.05 * Math.sin(w * TAU * 13) + up * 0.12;
  return { dx, dy, lidH, lidTilt };
}
const kettlePt = (u, h, w) => { const k = kettleState(w); const p = pp(KT.u + u, h, KQ); return [p[0] + k.dx, p[1] + k.dy]; };
function kettleAnchors(w) { const k = kettleState(w); return { spout: kettlePt(7.3, 9.1, w), vent: kettlePt(0.9, K_H.lid1 + 0.2 + k.lidH, w), knob: kettlePt(0, K_H.knob + k.lidH, w), coal: pp(KT.u, 1.6, KQ + 1.2) }; }
function drawHibachi(ctx) {
  const u0 = -6.2, u1 = 6.2, q0 = KQ - 3.2, q1 = KQ + 3.2, h1 = K_H.box;
  softShadow(ctx, KT.u, KQ + 0.8, 8.2, 3.2, 0.32);
  const A = pp(u0, h1, q1), B = pp(u1, h1, q1), Cc = pp(u1, 0, q1), D = pp(u0, 0, q1), A2 = pp(u0, h1, q0), B2 = pp(u1, h1, q0);
  poly(ctx, [A2, B2, B, A], '#5a4a46');                                                                        // top: ash bed
  ctx.save(); ctx.beginPath(); ctx.moveTo(A2[0], A2[1]); ctx.lineTo(B2[0], B2[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(A[0], A[1]); ctx.closePath(); ctx.clip();
  for (let i = 0; i < 26; i++) { const x = A[0] + (B[0] - A[0]) * (0.05 + 0.9 * CUE.hash(i, 1)), y = A2[1] + (A[1] - A2[1]) * (0.1 + 0.8 * CUE.hash(i, 2)); ctx.fillStyle = i % 3 ? '#8a7a74' : '#3a2e2c'; ctx.beginPath(); ctx.arc(x, y, 3 + 5 * CUE.hash(i, 3), 0, 7); ctx.fill(); }
  ctx.restore();
  poly(ctx, [A, B, Cc, D], grad(ctx, 0, A[1], 0, D[1], [[0, '#b4803f'], [1, '#8d5f3a']]));                      // front: wood
  woodGrain(ctx, A[0] + 4, A[1] + 6, B[0] - 4, D[1] - 6, '#a0702f', 4, 91);
  const m = pp(KT.u, 1.5, q1), vw = 3.4 * SC;                                                                   // the draught opening (light.py makes the coals glow here)
  rrect(ctx, m[0] - vw, m[1] - 0.9 * SC, 2 * vw, 1.8 * SC, 6, '#2a1c1a');
}
function drawKettle(ctx, w, part) {                                                                             // part: 'body' | 'lid'
  const k = kettleState(w), iron = '#3b3943', ironL = '#5d5a68', ironD = '#27252d', cx = pp(KT.u, 0, KQ)[0] + k.dx;
  const Y = (h) => pp(0, h, KQ)[1] + k.dy, R = 4.5 * SC;
  if (part === 'body') {
    // spout: tapered tube from the body to the tip (curved up)
    const s0 = [cx + R * 0.82, Y(5.6)], s1 = [cx + 7.3 * SC, Y(9.1)];
    ctx.lineCap = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = 0.95 * SC + 2 * OUTW; ctx.beginPath(); ctx.moveTo(s0[0], s0[1]); ctx.quadraticCurveTo(cx + 6.3 * SC, Y(5.6), s1[0], s1[1]); ctx.stroke();
    ctx.strokeStyle = iron; ctx.lineWidth = 0.95 * SC; ctx.beginPath(); ctx.moveTo(s0[0], s0[1]); ctx.quadraticCurveTo(cx + 6.3 * SC, Y(5.6), s1[0], s1[1]); ctx.stroke();
    ctx.strokeStyle = ironD; ctx.lineWidth = 0.42 * SC; ctx.beginPath(); ctx.arc(s1[0], s1[1], 0.2 * SC, 0, 7); ctx.stroke();
    // handle (folded to the left side)
    ctx.strokeStyle = OUT; ctx.lineWidth = 0.55 * SC + 2 * OUTW; ctx.beginPath(); ctx.moveTo(cx - R * 0.9, Y(8.2)); ctx.bezierCurveTo(cx - 8.2 * SC, Y(9.8), cx - 8.6 * SC, Y(5.2), cx - R * 0.92, Y(4.8)); ctx.stroke();
    ctx.strokeStyle = ironL; ctx.lineWidth = 0.55 * SC; ctx.beginPath(); ctx.moveTo(cx - R * 0.9, Y(8.2)); ctx.bezierCurveTo(cx - 8.2 * SC, Y(9.8), cx - 8.6 * SC, Y(5.2), cx - R * 0.92, Y(4.8)); ctx.stroke();
    // body: rounded drum
    const top = Y(K_H.body1), bot = Y(K_H.body0), mid = (top + bot) / 2;
    ctx.beginPath(); ctx.moveTo(cx - R * 0.78, top); ctx.bezierCurveTo(cx - R * 1.16, top + (bot - top) * 0.1, cx - R * 1.16, bot - (bot - top) * 0.05, cx - R * 0.8, bot); ctx.lineTo(cx + R * 0.8, bot); ctx.bezierCurveTo(cx + R * 1.16, bot - (bot - top) * 0.05, cx + R * 1.16, top + (bot - top) * 0.1, cx + R * 0.78, top); ctx.closePath();
    ctx.fillStyle = grad(ctx, cx - R, 0, cx + R, 0, [[0, ironL], [0.28, '#4c4a57'], [0.7, iron], [1, ironD]]); ctx.fill(); ctx.lineWidth = OUTW; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.save(); ctx.clip();                                                                                     // arare: the little cast bumps
    for (let r = 0; r < 5; r++) for (let c = 0; c < 9; c++) { const x = cx - R * 1.0 + (c + (r % 2) * 0.5) * R * 0.24, y = top + (bot - top) * (0.14 + r * 0.19); ctx.fillStyle = 'rgba(255,255,255,0.13)'; ctx.beginPath(); ctx.arc(x - 1.5, y - 1.5, 2.6, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.arc(x + 1.2, y + 1.6, 2.0, 0, 7); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = ironL; ctx.globalAlpha = 0.55; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - R * 0.95, top + (bot - top) * 0.25); ctx.quadraticCurveTo(cx - R * 1.0, mid, cx - R * 0.9, bot - (bot - top) * 0.2); ctx.stroke(); ctx.globalAlpha = 1;
  } else {
    const lh = k.lidH * SC, ty = Y(K_H.body1) - lh, ky = Y(K_H.knob) - lh;
    ctx.save(); ctx.translate(cx, ty + (Y(K_H.lid1) - Y(K_H.body1)) / 2 * 0); ctx.rotate(k.lidTilt); ctx.translate(-cx, -ty);
    ctx.beginPath(); ctx.ellipse(cx, ty, R * 0.8, 0.5 * C.DQ * SC * 1.2, 0, 0, 7); ctx.fillStyle = ironL; ctx.fill(); ctx.lineWidth = OUTW; ctx.strokeStyle = OUT; ctx.stroke();      // lid rim
    ctx.beginPath(); ctx.moveTo(cx - R * 0.72, ty); ctx.bezierCurveTo(cx - R * 0.6, Y(K_H.lid1) - lh - 4, cx + R * 0.6, Y(K_H.lid1) - lh - 4, cx + R * 0.72, ty); ctx.closePath();
    ctx.fillStyle = grad(ctx, cx - R * 0.7, 0, cx + R * 0.7, 0, [[0, '#6b6877'], [0.4, '#4f4d5b'], [1, '#34323c']]); ctx.fill(); ctx.stroke();                                               // dome
    ctx.beginPath(); ctx.arc(cx, ky + 5, 0.55 * SC, 0, 7); ctx.fillStyle = '#2f2d36'; ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(cx - 3, ky + 2, 2.4, 0, 7); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();   // knob
    ctx.fillStyle = '#17151b'; ctx.beginPath(); ctx.ellipse(cx + 0.9 * SC, Y(K_H.lid1 - 0.1) - lh, 0.2 * SC, 0.1 * SC, 0, 0, 7); ctx.fill();                                                  // steam hole
    ctx.restore();
  }
}
