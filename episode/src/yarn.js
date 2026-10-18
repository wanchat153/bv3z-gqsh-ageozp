'use strict';
// ================= "ลูกบอลลอดรั้ว" (10 s) — flat Canvas2D, the same engine/code as the Daruma + bubble episodes =================
// Cast: ink samurai + Mochi only. Everything faces LEFT (as in the approved episodes: samurai face -1, Mochi face -1). No letters.
// Story (one cause -> one effect, gag told twice):
//   Mochi swats a ball; it rolls through the TUNNEL in a wall. The samurai runs after it, BONKS the wall (too round), tries to jump over (too short),
//   puffs up, squashes flat like a pancake, slides through the tunnel and pops round on the far side. Mochi then hops onto the wall top in ONE jump. Flat stares.

const DUR = 10, PI = Math.PI;
const SAMX = 380, MOCX = 830, MOCS = 2.9;
const sst = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const dmp = (d, k, f) => (d < 0 ? 0 : Math.exp(-d * k) * Math.cos(d * f));
const pulse = (t, t0, d = 0.06) => Math.exp(-(((t - t0) / d) ** 2));
// timeline
const T_WG = 1.15, T_PJ0 = 1.5, T_PJ1 = 1.95;                   // Mochi wiggle, pounce flight, land with the ribbon tip
const HOPS = [[2.05, 2.4, 640, 730], [2.45, 2.8, 730, 820], [2.85, 3.2, 820, 900]];   // 3 backwards hops (x from, x to)
const T_S0 = 2.3, T_S1 = 3.0, T_S2 = 5.05, T_S3 = 6.05, WMAX = 13; // spin start, full speed, decel start, stop
const TOT = 6 * PI * 2;                                          // 6 whole turns
const T_RC = 5.0, T_R0 = 5.25, T_R1 = 6.45, XM1 = 700;           // Mochi crouch, roll start/end
const T_D1 = 7.5;                                                // samurai sees the ribbon ball
// spin angle theta(t): ramp up, constant, ramp down, ends at an exact multiple of 2 pi
const CD = (TOT - 0.5 * WMAX * (T_S1 - T_S0) - 0.5 * WMAX * (T_S3 - T_S2)) / WMAX; // const duration needed
function theta(t) {
  if (t <= T_S0) return 0; const a = T_S1 - T_S0, b = T_S3 - T_S2;
  if (t < T_S1) { const x = t - T_S0; return 0.5 * WMAX * x * x / a; }
  const th1 = 0.5 * WMAX * a, c = CD;
  if (t < T_S1 + c) return th1 + WMAX * (t - T_S1);
  const th2 = th1 + WMAX * c, x = Math.min(t - (T_S1 + c), b); return th2 + WMAX * x - 0.5 * WMAX * x * x / b;
}
// ---------- Mochi ----------
function hopState(t) { for (let i = 0; i < HOPS.length; i++) { const [a, b, x0, x1] = HOPS[i]; if (t >= a && t < b) { const s = (t - a) / (b - a); return { x: lerp(x0, x1, sst(s)), up: 4 * 34 * s * (1 - s), s, on: true }; } } return null; }
function catAt(t, S_) {
  let x = MOCX, up = 0, rot = 0, sqx = 1, sqy = 1, sw_ = 0, tail = 0.2, wide = 0.12, mouth = 0, ph = 'sit', wind = 0, cr = 0;
  if (t >= 0.5 && t < T_PJ0) { tail = 0.55; sw_ = 0; }
  if (t >= T_WG && t < T_PJ0) { const q = sst((t - T_WG) / (T_PJ0 - T_WG)); sqy = 1 - 0.18 * q; sqx = 1 + 0.08 * q; x += 4 * Math.sin(t * 38) * q; wide = 0.5; ph = 'wiggle'; tail = 0.9; }
  if (t >= T_PJ0 && t < T_PJ1) { const s = (t - T_PJ0) / (T_PJ1 - T_PJ0); x = lerp(MOCX, 640, s); up = 4 * 80 * s * (1 - s); sw_ = sst(s * 1.6); sqy = 1 + 0.12 * Math.sin(PI * s); rot = -0.12 * Math.sin(PI * s); ph = 'fly'; wide = 0.6; }
  if (t >= T_PJ1) { x = 640; sw_ = 1; ph = 'hold'; wide = 0.6; const d = t - T_PJ1; if (d < 0.12) { sqy = 1 - 0.14 * Math.sin(PI * d / 0.12); } }
  for (let i = 0; i < HOPS.length; i++) { const [a, b, x0, x1] = HOPS[i]; if (t >= a) x = x1; }
  const h = hopState(t); if (h) { x = h.x; up = h.up; sqy = 1 + 0.08 * Math.sin(PI * h.s); ph = 'hop'; rot = 0.1; }
  for (const [a, b] of HOPS) if (t >= b && t < b + 0.18) { const d = (t - b) / 0.18; sqy = 1 - 0.14 * Math.sin(PI * d); sqx = 1 + 0.07 * Math.sin(PI * d); }
  if (t >= 3.2 && t < T_RC) { rot = 0.12 + 0.015 * Math.sin(t * 9); tail = 0.8; }
  if (t >= T_RC && t < T_R0) { const q = sst((t - T_RC) / (T_R0 - T_RC)); sqy = 1 - 0.2 * q; sqx = 1 + 0.1 * q; sw_ = 1 - q; rot = 0.12 * (1 - q); ph = 'crouch'; wide = 0.5; }
  if (t >= T_R0 && t < T_R1) { const s = (t - T_R0) / (T_R1 - T_R0), e = sst(s); x = lerp(900, XM1, e); cr = -4 * PI * e; up = 4 * 40 * s * (1 - s); ph = 'roll'; sw_ = 0; wind = e; wide = 0.7; }
  if (t >= T_R1) { x = XM1; wind = 1; ph = 'sit'; const d = t - T_R1; sqy = 1 - 0.14 * dmp(d, 10, 24); sqx = 1 + 0.07 * dmp(d, 10, 24); tail = 0.2; }
  if (t >= 7.5) wide = 0.15; if (t >= 8.3) { tail = 0.5; }
  if (t < T_PJ1 + 0.05) sw_ = Math.min(sw_, 1);
  // eyes
  const tx = S_.st.x, ty = S_.st.y - 40;
  const look = [clamp((tx - x) / 220, -1, 1), clamp((ty - (FL - up)) / 260, -1, 0.3)];
  const half = t >= 8.4 ? 0.55 * sst((t - 8.4) / 0.3) : 0;
  const mw = t >= 8.9 ? 0.6 * pulse(t, 9.0, 0.15) : 0;
  return { x, y: FL - 14 * 0 - up, rot, sqx, sqy, sw: sw_, tail, wide, look, mouth: mw, ph, half, tilt: 0.05 + 0.1 * ss(8.2, 8.8, t), wind, cr };
}
function drawMochi(cx, C, t) {
  cx.save(); const y = C.y - 2;
  if (C.cr) { const cy = y - 120; cx.translate(C.x, cy); cx.rotate(C.cr); cx.translate(-C.x, -cy); }
  if (C.sqx !== 1 || C.sqy !== 1) { cx.translate(C.x, y); cx.scale(C.sqx, C.sqy); cx.translate(-C.x, -y); }
  const m = mochi(C.x, y, MOCS, t, { rot: C.rot, swat: C.sw, wide: C.wide, look: C.look, tail: C.tail, tilt: C.tilt });
  m.mouth = { open: C.mouth }; if (C.half > 0) m.e.open = 1 - 0.45 * C.half;
  drawCat(cx, m, t);
  if (C.wind > 0) { // ribbon wound on Mochi's body (clipped to the body, head stays free)
    cx.save(); cx.beginPath(); cx.ellipse(C.x, y - 105, 98, 118, 0, 0, PI2); cx.clip();
    const n = 7; for (let i = 0; i < n; i++) { const k = i / (n - 1), a = clamp(C.wind * n - i, 0, 1); if (a <= 0) continue; const yy = y - 215 + k * 200, w = 98 * Math.sqrt(1 - ((yy - (y - 105)) / 118) ** 2) + 6;
      cx.globalAlpha = a; cx.strokeStyle = INKC; cx.lineWidth = 17; cx.beginPath(); cx.moveTo(C.x - w, yy + 22); cx.quadraticCurveTo(C.x, yy - 4, C.x + w, yy + 22 - 20); cx.stroke();
      cx.strokeStyle = REDC2; cx.lineWidth = 11; cx.stroke(); }
    cx.restore(); cx.globalAlpha = 1; }
  cx.restore();
}
// ---------- samurai ----------
function samAt(t) {
  let hop = 0, sx = 1, sy = 1 + 0.012 * Math.sin(t * 3.1), rot = 0, x0 = SAMX, face = -1, ph = 'idle', front = 1, th = 0;
  if (t >= T_S0) {
    th = theta(t); const c = Math.cos(th); sx = Math.max(0.24, Math.abs(c)); face = c >= 0 ? -1 : 1; front = c; ph = t < T_S3 ? 'spin' : 'dizzy';
    const w = t < T_S1 ? WMAX * (t - T_S0) / (T_S1 - T_S0) : t < T_S2 ? WMAX : t < T_S3 ? WMAX * (1 - (t - T_S2) / (T_S3 - T_S2)) : 0;
    hop = 3 * (w / WMAX) * Math.abs(Math.sin(t * 30)); rot = -0.07 * (w / WMAX);
    x0 += 6 * (w / WMAX) * Math.sin(t * 19);
  }
  if (t >= T_S3) { const d = t - T_S3, k = Math.exp(-d * 1.3); rot = 0.13 * Math.sin(d * 7) * k; x0 += 24 * Math.sin(d * 5.2) * k; sy = 1 + 0.03 * Math.sin(d * 7) * k; if (d < 0.25) { sx = 1; } }
  if (t >= 1.95 && t < 2.3) { sy = 1 + 0.05 * Math.sin(PI * (t - 1.95) / 0.35); rot = -0.04 * Math.sin(PI * (t - 1.95) / 0.35); }
  const gy = FL, Dd = SAMS * 1.58, D2 = Dd * sy, x = x0 + D2 * Math.sin(rot), y = gy - D2 * Math.cos(rot) - hop;
  const sweat = Math.max(pulse(t, 1.95, 0.4) * 0.6, ss(7.5, 7.8, t) * 0.8);
  const st = samState(0, { x, y, ground: y + D2 * Math.cos(rot), S: SAMS, face, sx, sy, rot, walk: null, band: { a: 1, wind: 0.3 + (ph === 'spin' ? 0.3 : 0) }, sweat });
  return { st, x0, hop, ph, th, front };
}
function samEyesAt(t, S_, C) {
  const st = S_.st, g = samGeom(st, t), P = [g.X(-0.16, 0.26), g.X(0.46, 0.26)];
  let tg = [C.x, C.y - 150];
  const ov = {}; const set = (a, b, o) => { if (t >= a && t < b) Object.assign(ov, o); };
  set(1.95, 2.6, { wide: 0.9 }); set(T_S3, T_S3 + 1.4, { squeeze: 0.5, wide: 0.1 }); set(T_D1, 8.3, { wide: 0.7 }); set(8.4, 10, { open: 0.5 }); set(T_S3 + 1.4, T_D1, { open: 0.6 });
  if (t >= T_S3 && t < T_D1) { const a = (t - T_S3) * 6; tg = [st.x + 90 * Math.cos(a), st.y - 80 + 60 * Math.sin(a)]; }
  if (t >= 8.4) tg = [C.x, C.y - 120];
  return P.map((p) => { const dx = tg[0] - p[0], dy = tg[1] - p[1], l = Math.hypot(dx, dy) || 1; return Object.assign({ open: 0.9, wide: 0.2, sad: 0, look: [clamp(dx / l * 1.05, -1, 1), clamp(dy / l * 1.05, -1, 1)], closed: 0, squeeze: 0, happy: 0, angry: 0 }, ov); });
}
// ---------- events ----------
const EVF = [[0.2, 'amb', 1, 540], [0.9, 'sniff', 0.3, MOCX], [1.0, 'earflick', 0.5, MOCX], [T_WG + 0.05, 'crouch', 0.5, MOCX], [T_PJ0, 'hop', 0.7, 740], [T_PJ1, 'land', 0.8, 640], [T_PJ1 + 0.02, 'gasp', 0.6, SAMX],
  [2.05, 'hop', 0.5, 680], [2.4, 'land', 0.5, 730], [2.45, 'hop', 0.5, 780], [2.8, 'land', 0.5, 820], [2.85, 'hop', 0.5, 860], [3.2, 'land', 0.6, 900],
  [T_S0, 'squeeze', 0.9, SAMX, { dur: T_S3 - T_S0 }], [T_RC + 0.05, 'crouch', 0.5, 900], [T_R0, 'hop', 0.6, 900], [T_R0 + 0.1, 'roll', 0.9, 700, { dur: 1.1 }], [T_R0 + 0.2, 'rustle', 0.7, 700], [T_R0 + 0.6, 'rustle', 0.7, 650],
  [T_R1, 'land', 0.9, XM1], [T_S3 + 0.05, 'oof', 0.7, SAMX], [6.9, 'grumble', 0.4, SAMX], [T_D1 + 0.1, 'sigh', 0.7, SAMX], [8.3, 'mew', 0.6, XM1], [9.0, 'purr', 0.5, XM1, { dur: 0.6 }]];
EVF.sort((a, b) => a[0] - b[0]);
const DUST = [[T_PJ1, 640, 0], [3.2, 900, 0], [T_R1, XM1, 0]];
// ---------- scene ----------
function bgYarn(c, t) {
  const g = c.createLinearGradient(0, 0, 0, FL); g.addColorStop(0, '#F6E6DC'); g.addColorStop(0.5, '#F4DCC8'); g.addColorStop(1, '#EAD2B0'); c.fillStyle = g; c.fillRect(-300, -300, 1680, FL + 300);
  c.fillStyle = 'rgba(236,150,110,0.20)'; c.beginPath(); c.arc(300, 600, 200, 0, PI2); c.fill();
  for (const [y0, col, ph] of [[1040, 'rgba(150,120,120,0.20)', 1.1], [1090, 'rgba(110,96,100,0.26)', 3.3], [1140, 'rgba(70,62,66,0.30)', 5.1]]) {
    c.fillStyle = col; c.beginPath(); c.moveTo(-100, FL); for (let x = -100; x <= 1180; x += 40) c.lineTo(x, y0 - 70 * Math.abs(Math.sin(x * 0.0043 + ph)) - 30 * Math.sin(x * 0.011 + ph * 2)); c.lineTo(1180, FL); c.closePath(); c.fill(); }
  // stone lantern (far left) and bamboo (far right)
  c.save(); c.strokeStyle = INKC; c.lineWidth = 5; c.fillStyle = '#CFC4B0';
  const lx = 150, ly = FL; c.fillRect(lx - 22, ly - 190, 44, 190); c.strokeRect(lx - 22, ly - 190, 44, 190);
  c.fillRect(lx - 52, ly - 250, 104, 60); c.strokeRect(lx - 52, ly - 250, 104, 60); c.fillStyle = '#F6E7B8'; c.fillRect(lx - 26, ly - 238, 52, 36);
  c.fillStyle = '#7C7468'; c.beginPath(); c.moveTo(lx - 86, ly - 250); c.lineTo(lx, ly - 316); c.lineTo(lx + 86, ly - 250); c.closePath(); c.fill(); c.stroke(); c.restore();
  for (const [bx, h] of [[1010, 520], [1050, 700], [980, 380]]) { c.fillStyle = '#9DB383'; c.strokeStyle = INKC; c.lineWidth = 4; c.fillRect(bx - 12, FL - h, 24, h); c.strokeRect(bx - 12, FL - h, 24, h); for (let y = FL - h + 90; y < FL; y += 110) { c.beginPath(); c.moveTo(bx - 14, y); c.lineTo(bx + 14, y); c.stroke(); } }
  pineBranch(c, 0.5 * Math.sin(t * 0.8), t);
}
function ribbonDraw(c, A, P, slack, t, a) {
  const mx = (A[0] + P[0]) / 2, my = (A[1] + P[1]) / 2 + slack, wig = (1 - Math.min(1, slack / 40)) * 5 * Math.sin(t * 30);
  c.save(); c.globalAlpha = a; c.lineCap = 'round';
  c.beginPath(); c.moveTo(A[0], A[1]); c.quadraticCurveTo(mx, Math.min(my + wig, FL - 8), P[0], P[1]); c.strokeStyle = INKC; c.lineWidth = 15; c.stroke(); c.strokeStyle = REDC2; c.lineWidth = 9; c.stroke(); c.restore();
}
// ---------- render ----------
function renderFrame(T) {
  const t = clamp(T, 0, DUR), S_ = samAt(t), sam = S_.st, g = samGeom(sam, t), C = catAt(t, S_);
  const eyes = samEyesAt(t, S_, C);
  const sh1 = g.X(0.85, 0.5), sh2 = g.X(-0.85, 0.5); let hands = [g.X(1.36, 0.88), g.X(-1.36, 0.88)];
  const pull = t >= 1.95 && t < 2.5 ? Math.sin(PI * (t - 1.95) / 0.55) : 0;
  if (pull > 0) { const a = [g.X(1.2, 0.95), g.X(-1.2, 0.95)]; hands = hands.map((h, i) => [lerp(h[0], a[i][0], pull), lerp(h[1], a[i][1], pull)]); }
  window._raw = [hands[0].slice(), hands[1].slice()]; window._sh = [sh1, sh2];
  { const lim = 0.72 * SAMS, c2 = (hd, sh) => { const dx = hd[0] - sh[0], dy = hd[1] - sh[1], d = Math.hypot(dx, dy); return d > lim ? [sh[0] + dx * lim / d, sh[1] + dy * lim / d] : hd; }; hands = [c2(hands[0], sh1), c2(hands[1], sh2)]; }
  // ribbon: from the stock tail tip to Mochi's paw
  const tip = g.X(-1.72, 0.12), paw = [C.x - 70 - 30 * C.sw, C.y - 95 - 10 * C.sw];
  const D = Math.hypot(paw[0] - tip[0], paw[1] - tip[1]);
  let slack = 0; if (t < T_PJ1) slack = 0; else if (t >= T_R0) slack = 190 * sst((t - T_R0) / (T_R1 - T_R0)) * Math.min(1, D / 300 + 0.2); else if (t < 3.2) slack = 16 * (1 - sst((t - T_PJ1) / 1.0)); else slack = 3;
  if (t >= T_R1 + 0.3) slack = 70 + 30 * Math.sin((t - T_R1) * 0.8) * 0;
  const ribA = t >= T_PJ1 ? 1 : 0, ribPaw = t >= T_PJ1 ? paw : tip;
  const mouthG = g.X(0.16, 0.74);
  composeFrame([540, 960, 1], { noHalo: true,
    pre: (cx) => { bgYarn(cx, t); deckBG(cx, 0);
      paperShadow(cx, S_.x0, FL + 8, 150, 0.5 * (S_.hop > 6 ? 0.8 : 1)); paperShadow(cx, C.x, FL + 8, 105, C.y < FL - 10 ? 0.28 : 0.5); },
    ink: () => {},
    chars: (cx) => {
      drawMochi(cx, C, t);
      if (ribA) ribbonDraw(cx, tip, paw, slack, t, 1);
      samLegs(cx, sam, t); samInk(cx, sam, t, 0.5); samOver(cx, Object.assign({}, sam, { band: { a: 0 }, e: { a: 0 }, sweat: 0, a: 0.28 }), t);
      samBand(cx, sam, t); if (S_.front > 0.25) samEyes(cx, sam, t, eyes[0], eyes[1]);
      samArms(cx, sam, t, hands, 0.17);
      for (const [te, x] of DUST) { const d = t - te; if (d >= 0 && d < 0.6) dust(cx, x, FL + 6, d / 0.6, 0.85, 16); }
      if (t >= T_S3 + 0.2 && t < T_D1 - 0.2) stars(cx, sam.x, sam.y - 235, (t - T_S3) * 1.4, 3, 64);
    } });
  const c = document.getElementById('c').getContext('2d'); const fade = 1 - ss(0, 0.35, t); if (fade > 0.002) { c.save(); c.fillStyle = `rgba(241,233,216,${clamp(fade)})`; c.fillRect(0, 0, 1080, 1920); c.restore(); }
}
