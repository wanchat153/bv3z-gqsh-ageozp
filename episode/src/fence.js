'use strict';
// ================= "ลูกบอลลอดรั้ว" (10 s) — flat Canvas2D, the same engine/code as the Daruma + bubble episodes =================
// Cast: ink samurai + Mochi only. Everything faces LEFT (as in the approved episodes: samurai face -1, Mochi face -1). No letters.
// Story (one cause -> one effect, gag told twice):
//   Mochi swats a ball; it rolls through the TUNNEL in a wall. The samurai runs after it, BONKS the wall (too round), tries to jump over (too short),
//   puffs up, squashes flat like a pancake, slides through the tunnel and pops round on the far side. Mochi then hops onto the wall top in ONE jump. Flat stares.
const DUR = 10, PI = Math.PI;
const WL = 420, WR = 620, WTOP = 1060, TUN = 1170, CAPY = 1030;            // wall slab x-range, top, tunnel top (tunnel floor = FL), top of the tile cap
const BALLR = 46, MOCX = 860, MOCS = 2.9, MLANE = 14;
// ---------- helpers ----------
const sst = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const dmp = (d, k, f) => (d < 0 ? 0 : Math.exp(-d * k) * Math.cos(d * f));
const trap = (t, t0, t1, ta, L) => { const x = clamp(t - t0, 0, t1 - t0), T = t1 - t0, v = L / (T - 0.5 * ta); return x < ta ? 0.5 * v * x * x / ta : 0.5 * v * ta + v * (x - ta); };   // distance with an ease-in only (constant speed after)
// ---------- timeline constants ----------
const T_SW = 1.22, T_RL = 2.2;                         // swat contact, ball roll duration
const T_W0 = 1.9, T_BONK = 3.9, X0 = 1250, XB = 738;    // samurai start, bonk time, start x and bonk x
const T_C0 = 4.45, T_J0 = 4.7, T_J1 = 5.25, XR = 776;  // crouch, jump, land; x after the recoil
const T_TH = 5.45, T_IN = 5.95, T_CP = 6.2, T_SQ0 = 6.4, T_POP = 7.4, XP = 296;
const T_MC = 7.4, T_MF0 = 7.62, T_MF1 = 8.25;          // Mochi crouch, flight, land
const SQK = [[T_SQ0, XR], [T_SQ0 + 0.18, XR - 6], [T_SQ0 + 0.35, XR - 30], [T_SQ0 + 0.6, XR - 190], [T_SQ0 + 0.85, XR - 400], [T_POP, XP]];   // slides in with a small stick at the mouth of the tunnel
// ---------- the ball ----------
function ballAt(t) { const s = clamp((t - T_SW) / T_RL), e = 1 - (1 - s) * (1 - s), x = 700 - 580 * e; return { x, y: FL - BALLR, roll: (700 - x) / BALLR, moving: s > 0 && s < 1 }; }
// ---------- samurai ----------
function samAt(t) {
  let x0 = X0, hop = 0, sx = 1, sy = 1 + 0.012 * Math.sin(t * 3.1), rot = 0, walk = null, ph = 'idle', k = 0;
  if (t >= T_W0 && t < T_BONK) { const d = trap(t, T_W0, T_BONK, 0.3, X0 - XB); x0 = X0 - d; walk = d * 0.045; ph = 'walk'; sy += 0.03 * Math.abs(Math.sin(walk)); rot = -0.04; }
  else if (t >= T_BONK) {
    const d = t - T_BONK; x0 = XB + (XR - XB) * (1 - Math.exp(-d * 9)); ph = 'bonk';
    if (d < 0.5) { sx = 1 + 0.2 * dmp(d, 11, 30); sy = 1 - 0.14 * dmp(d, 11, 30); rot = 0.17 * Math.exp(-d * 6); hop = arc(t, T_BONK + 0.06, 30, 0.4); }
    if (t >= T_C0 && t < T_J0) { const q = sst((t - T_C0) / (T_J0 - T_C0)); sy = 1 - 0.2 * q; sx = 1 + 0.1 * q; ph = 'crouch'; }
    if (t >= T_J0 && t < T_J1) { const s = (t - T_J0) / (T_J1 - T_J0); hop = 170 * Math.sin(PI * s) ** 0.85; sy = 1 + 0.1 * Math.sin(PI * s); sx = 1 - 0.05 * Math.sin(PI * s); ph = 'jump'; k = s; rot = -0.06 * Math.sin(PI * s); }
    if (t >= T_J1 && t < T_J1 + 0.3) { const q = Math.sin(PI * (t - T_J1) / 0.3) * 0.16; sy = 1 - q; sx = 1 + q * 0.7; ph = 'land'; }
    if (t >= T_TH && t < T_IN) { ph = 'think'; k = (t - T_TH) / (T_IN - T_TH); rot = 0.03 * Math.sin((t - T_TH) * 16) * Math.min(1, k * 4, (1 - k) * 4); }
    if (t >= T_IN && t < T_CP) { const q = sst((t - T_IN) / (T_CP - T_IN)); sx = 1 + 0.12 * q; sy = 1 + 0.07 * q; ph = 'inhale'; }
    if (t >= T_CP && t < T_SQ0) { const q = sst((t - T_CP) / (T_SQ0 - T_CP)); sx = lerp(1.12, 1.5, q); sy = lerp(1.07, 0.5, q); ph = 'compress'; }
    if (t >= T_SQ0 && t < T_POP) { x0 = KS(SQK, t)[0] - 0; sx = 1.5 + 0.03 * Math.sin(t * 34); sy = 0.5 + 0.02 * Math.sin(t * 29); ph = 'squeeze'; walk = (XR - x0) * 0.045; }
    if (t >= T_POP) { const d2 = t - T_POP; x0 = XP; sx = 1 + (1.5 - 1) * dmp(d2, 13, 28); sy = 1 + (0.5 - 1) * dmp(d2, 13, 28); ph = 'pop'; k = d2; }
  }
  const gy = FL, Dd = SAMS * 1.58, D2 = Dd * sy, x = x0 + D2 * Math.sin(rot), y = gy - D2 * Math.cos(rot) - hop;
  const st = samState(0, { x, y, ground: y + D2 * Math.cos(rot), S: SAMS, face: -1, sx, sy, rot, walk, band: { a: 1, wind: 0.3 + 0.5 * (ph === 'walk' ? 1 : 0) + (ph === 'jump' ? 0.8 : 0) + (ph === 'squeeze' ? 0.8 : 0) }, sweat: Math.max(pulse(t, 5.6, 0.45) * 0.9, ss(8.6, 8.9, t) * 0.8) });
  return { st, x0, hop, ph, k };
}
const pulse = (t, t0, d = 0.06) => Math.exp(-(((t - t0) / d) ** 2));
// ---------- Mochi ----------
function catAt(t, sam, B) {
  let x = MOCX, y = FL - MLANE, rot = 0, sqx = 1, sqy = 1, sw_ = 0, tail = 0.15, wide = 0.12, mouth = 0, ph = 'sit';
  if (t >= 0.9 && t < 1.7) { const a = sst((t - 0.9) / 0.3), r = 1 - sst((t - T_SW - 0.04) / 0.3); sw_ = a * (t < T_SW ? 1 : r); rot = t < T_SW ? 0.07 * a : -0.13 * pulse(t, T_SW + 0.06, 0.16) + 0.0; sqx = 1 + 0.03 * a; if (t >= T_SW) { x -= 10 * pulse(t, T_SW + 0.05, 0.12); } tail = 0.5; }
  if (t >= T_MC && t < T_MF0) { const q = sst((t - T_MC) / (T_MF0 - T_MC)); sqy = 1 - 0.22 * q; sqx = 1 + 0.12 * q; tail = 0.5; ph = 'crouch'; }
  if (t >= T_MF0 && t < T_MF1) { const s = (t - T_MF0) / (T_MF1 - T_MF0), up = (FL - CAPY - MLANE) * s + 4 * 170 * s * (1 - s); x = lerp(MOCX, 520, s); y = FL - MLANE * (1 - s) - up; sqy = 1 + 0.12 * Math.sin(PI * s); rot = -0.2 * Math.sin(PI * Math.min(1, s * 1.4)) + 0.14 * sst((s - 0.7) / 0.3); ph = 'fly'; wide = 0.5; }
  if (t >= T_MF1) { x = 520; y = CAPY; const d = t - T_MF1; sqy = 1 - 0.14 * dmp(d, 12, 26); sqx = 1 + 0.07 * dmp(d, 12, 26); ph = 'cap'; tail = 0.5; mouth = 0.7 * pulse(t, 8.55, 0.12); }
  // eyes: ball while it rolls, then the samurai
  let tx = B.x, ty = B.y; if (t >= 2.0) { tx = sam.st.x; ty = sam.st.y - 40; } if (t >= T_POP + 0.2 && t < T_MC) { tx = XP; ty = FL - 150; }
  const look = [clamp((tx - x) / 220, -1, 1), clamp((ty - y) / 260, -1, 0.3)];
  if (t >= 2.2 && t < 2.7) wide = 0.5;
  if (t >= T_BONK && t < T_BONK + 0.5) wide = 0.9;
  if (t >= T_POP && t < T_POP + 0.5) wide = 0.7;
  const half = t >= 8.6 ? 0.5 * sst((t - 8.6) / 0.25) : 0;
  return { x, y, rot, sqx, sqy, sw: sw_, tail, wide, look, mouth, ph, half, tilt: 0.05 + 0.1 * ss(8.4, 8.9, t) };
}
function drawMochi(cx, C, t) {
  cx.save(); const y = C.y - 2; if (C.sqx !== 1 || C.sqy !== 1) { cx.translate(C.x, y); cx.scale(C.sqx, C.sqy); cx.translate(-C.x, -y); }
  const m = mochi(C.x, y, MOCS, t, { rot: C.rot, swat: C.sw, wide: C.wide, look: C.look, tail: C.tail, tilt: C.tilt });
  m.mouth = { open: C.mouth }; if (C.half > 0) m.e.open = 1 - 0.45 * C.half;
  drawCat(cx, m, t); cx.restore();
}
// ---------- samurai eyes / mouth ----------
function samEyesAt(t, S_, B, C) {
  const st = S_.st, g = samGeom(st, t), P = [g.X(-0.16, 0.26), g.X(0.46, 0.26)];
  let tg = [B.x, B.y - 20];
  if (t >= T_TH && t < T_TH + 0.22) tg = [(WL + WR) / 2, FL - 110]; else if (t >= T_TH + 0.22 && t < T_IN) tg = [st.x, st.ground - 30];
  if (t >= T_POP + 0.5) tg = [C.x, C.y - 120];
    let ov = {};
  const sets = [[0, 1.9, {}], [1.9, 3.4, { wide: 0.75 }], [T_BONK, T_BONK + 0.16, { closed: 1, squeeze: 0.5 }], [T_BONK + 0.16, T_BONK + 0.8, { wide: 0.8 }], [T_C0, T_J0, { open: 0.8, angry: 0.25 }], [T_J0, T_J1, { wide: 0.9, open: 1 }], [T_J1, T_J1 + 0.4, { closed: 1, squeeze: 0.4 }],
    [T_CP, T_POP, { closed: 1, squeeze: 0.6 }], [T_POP, T_POP + 0.12, { closed: 1, squeeze: 0.5 }], [T_POP + 0.12, T_POP + 0.7, { wide: 1 }], [T_POP + 0.9, T_POP + 1.3, { happy: 0.7 }], [8.5, 10, { open: 0.5 }]];
  for (const [a, b, o] of sets) if (t >= a && t < b) ov = Object.assign({}, ov, o);
  const eyes = P.map((p) => { const dx = tg[0] - p[0], dy = tg[1] - p[1], l = Math.hypot(dx, dy) || 1; return Object.assign({ open: 0.9 - 0.05 * Math.sin(t * 3), wide: 0.2, sad: 0, look: [clamp(dx / l * 1.05, -1, 1), clamp(dy / l * 1.05, -1, 1)], closed: 0, squeeze: 0, happy: 0, angry: 0 }, ov); });
  const bp = (t * 0.31 + 0.13) % 1; if (bp < 0.03) { const k = Math.sin(bp / 0.03 * PI); for (const e of eyes) if (!e.closed) e.closed = k; }
  return eyes;
}
const MOUTHW = [[1.95, 2.4, 0.5], [T_BONK + 0.05, T_BONK + 0.5, 1.0], [T_J0 + 0.1, T_J1, 0.6], [T_POP + 0.1, T_POP + 0.6, 0.9], [8.7, 9.3, 0.3]];
const mouthAt = (t) => { let m = 0; for (const [a, b, p] of MOUTHW) if (t > a && t < b) m = Math.max(m, p * Math.sin(PI * (t - a) / (b - a))); return m; };
// ---------- the event table (picture dust + sound): [t, type, amp, x] ----------
const EVF = [[0.2, 'amb', 1, 540], [0.95, 'sniff', 0.3, MOCX], [1.75, 'earflick', 0.5, MOCX], [T_SW, 'swat', 1, 700], [T_SW + 0.05, 'roll', 0.9, 400, { dur: T_RL }], [1.95, 'gasp', 0.6, 1000], [3.45, 'blink', 0.3, MOCX],
  [T_BONK, 'bonk', 1, XB], [T_BONK + 0.03, 'oof', 0.8, XB], [4.1, 'mew', 0.5, MOCX], [T_C0 + 0.1, 'crouch', 0.5, XR], [T_J0, 'hop', 0.7, XR], [T_J1, 'land', 0.8, XR], [5.7, 'grumble', 0.5, XR],
  [T_IN, 'inhale', 0.6, XR, { dur: 0.25 }], [T_SQ0, 'squeeze', 1, 520, { dur: T_POP - T_SQ0 }], [T_POP, 'pop', 1, XP], [T_POP + 0.1, 'rustle', 0.5, XP], [T_MC + 0.05, 'crouch', 0.5, MOCX], [T_MF0, 'hop', 0.8, 700], [T_MF1, 'land', 0.9, 520], [8.55, 'mew', 0.6, 520],
  [9.0, 'sigh', 0.6, XP], [9.5, 'purr', 0.4, 520, { dur: 0.3 }]];
for (let t = T_W0; t < T_BONK; t += 0.004) { const a = Math.floor(trap(t, T_W0, T_BONK, 0.3, X0 - XB) * 0.045 / PI), b = Math.floor(trap(t + 0.004, T_W0, T_BONK, 0.3, X0 - XB) * 0.045 / PI); if (b > a) EVF.push([+t.toFixed(3), 'step', 0.45, X0 - trap(t, T_W0, T_BONK, 0.3, X0 - XB)]); }
EVF.sort((a, b) => a[0] - b[0]);
const DUST = [[T_BONK, XB], [T_J1, XR], [T_POP, XP], [T_MF1, 520]];
// ---------- scene ----------
function bgFence(c, t) {
  const g = c.createLinearGradient(0, 0, 0, FL); g.addColorStop(0, '#F7F1E0'); g.addColorStop(0.55, '#F3E9CC'); g.addColorStop(1, '#E9DBB6'); c.fillStyle = g; c.fillRect(-300, -300, 1680, FL + 300);
  c.fillStyle = 'rgba(214,170,98,0.18)'; c.beginPath(); c.arc(760, 520, 190, 0, PI2); c.fill(); c.fillStyle = 'rgba(244,222,170,0.5)'; c.beginPath(); c.arc(760, 520, 120, 0, PI2); c.fill();   // pale sun (no red)
  for (const [y0, col, ph] of [[1000, 'rgba(120,128,126,0.20)', 0], [1060, 'rgba(90,100,100,0.26)', 2.3], [1130, 'rgba(60,66,66,0.30)', 4.1]]) {
    c.fillStyle = col; c.beginPath(); c.moveTo(-100, FL); for (let x = -100; x <= 1180; x += 40) c.lineTo(x, y0 - 90 * Math.abs(Math.sin(x * 0.0051 + ph)) - 34 * Math.sin(x * 0.013 + ph * 2)); c.lineTo(1180, FL); c.closePath(); c.fill(); }
  const m = c.createLinearGradient(0, 1100, 0, FL); m.addColorStop(0, 'rgba(243,236,215,0)'); m.addColorStop(1, 'rgba(243,236,215,0.75)'); c.fillStyle = m; c.fillRect(-300, 1100, 1680, FL - 1100);
  for (let i = 0; i < 3; i++) { const x = ((i * 470 + 160 - t * 9) % 1500 + 1500) % 1500 - 200, y = 330 + 120 * i; c.fillStyle = 'rgba(255,255,255,0.7)'; for (const [dx, dy, r] of [[0, 0, 30], [38, -12, 38], [84, 0, 32], [52, 10, 32]]) { c.beginPath(); c.arc(x + dx * 1.6, y + dy * 1.6, r * 1.6, 0, PI2); c.fill(); } }
  pineBranch(c, 0.5 * Math.sin(t * 0.8), t);
}
function wallProp(c) {
  c.save();
  // long shadow on the floor (light from the right)
  c.fillStyle = 'rgba(60,46,34,0.16)'; c.beginPath(); c.moveTo(WL, FL); c.lineTo(WL - 190, FL + 56); c.lineTo(WL - 190 + 40, FL + 70); c.lineTo(WR - 20, FL + 40); c.lineTo(WR, FL); c.closePath(); c.fill();
  // stone slab
  const g = c.createLinearGradient(WL, 0, WR, 0); g.addColorStop(0, '#D4C59E'); g.addColorStop(0.6, '#DDCFA9'); g.addColorStop(1, '#E6D9B6'); c.fillStyle = g; c.fillRect(WL, WTOP, WR - WL, FL - WTOP);
  c.strokeStyle = 'rgba(70,56,40,0.4)'; c.lineWidth = 2.6; for (let y = WTOP + 56, r = 0; y < FL; y += 56, r++) { c.beginPath(); c.moveTo(WL, y); c.lineTo(WR, y); c.stroke(); const off = r % 2 ? 40 : 0; for (let x = WL + 30 + off; x < WR - 4; x += 80) { c.beginPath(); c.moveTo(x, y - 56); c.lineTo(x, y); c.stroke(); } }
  c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(WL + 4, WTOP, 8, FL - WTOP);
  c.strokeStyle = INKC; c.lineWidth = 5; c.strokeRect(WL, WTOP, WR - WL, FL - WTOP);
  // the tunnel (a cut-away: characters pass through it)
  const tg = c.createLinearGradient(0, TUN, 0, FL); tg.addColorStop(0, '#3A2F24'); tg.addColorStop(0.35, '#5E4E3A'); tg.addColorStop(1, '#7B6747'); c.fillStyle = tg; c.fillRect(WL + 3, TUN, WR - WL - 6, FL - TUN);
  c.fillStyle = 'rgba(255,240,200,0.18)'; c.fillRect(WL + 3, FL - 18, WR - WL - 6, 18);
  c.strokeStyle = INKC; c.lineWidth = 5; c.beginPath(); c.moveTo(WL, FL); c.lineTo(WL, TUN); c.lineTo(WR, TUN); c.lineTo(WR, FL); c.stroke();
  // tile cap
  c.fillStyle = '#5A5146'; c.strokeStyle = INKC; c.lineWidth = 5; c.beginPath(); c.rect(WL - 32, CAPY, WR - WL + 64, WTOP - CAPY + 6); c.fill(); c.stroke();
  c.fillStyle = '#6B6154'; for (let x = WL - 32; x < WR + 32; x += 32) { c.beginPath(); c.moveTo(x, WTOP + 6); c.quadraticCurveTo(x + 16, WTOP - 22, x + 32, WTOP + 6); c.fill(); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,0.16)'; c.fillRect(WL - 28, CAPY + 4, WR - WL + 56, 6);
  c.restore();
}
function ballDraw(c, B) {
  c.save(); c.translate(B.x, B.y); const r = BALLR;
  c.fillStyle = '#F6EEDD'; c.beginPath(); c.arc(0, 0, r, 0, PI2); c.fill();
  c.save(); c.beginPath(); c.arc(0, 0, r - 1, 0, PI2); c.clip(); c.rotate(B.roll);
  for (let k = 0; k < 3; k++) { c.fillStyle = ['#B3271F', '#D9B25A', '#688CA0'][k]; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r * 1.5, k * 2.094 + 0.2, k * 2.094 + 0.2 + 1.047); c.closePath(); c.fill(); }
  c.restore(); c.strokeStyle = INKC; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, r, 0, PI2); c.stroke(); c.fillStyle = '#F6EEDD'; c.beginPath(); c.arc(0, 0, r * 0.14, 0, PI2); c.fill(); c.lineWidth = 2.5; c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.ellipse(-r * 0.35, -r * 0.42, r * 0.2, r * 0.11, -0.7, 0, PI2); c.fill();
  c.restore();
}
// ---------- render ----------
function renderFrame(T) {
  const t = clamp(T, 0, DUR), S_ = samAt(t), sam = S_.st, g = samGeom(sam, t), B = ballAt(t), C = catAt(t, S_, B);
  const eyes = samEyesAt(t, S_, B, C);
  // hands: rest pose with walk swing; clamped to 0.72 S from OWN shoulder
  const sh1 = g.X(0.85, 0.5), sh2 = g.X(-0.85, 0.5); let hands = [g.X(1.36, 0.88), g.X(-1.36, 0.88)];
  if (sam.walk != null) { const q = Math.sin(sam.walk) * 0.7; hands = [g.X(1.36, 0.88 - q * 0.05), g.X(-1.36, 0.88 + q * 0.05)]; hands[0][0] -= q * SAMS * 0.03 * -1; hands[1][0] += q * SAMS * 0.03 * -1; }
  const up = S_.ph === 'jump' ? sst(Math.min(1, S_.k / 0.3)) * (1 - sst((S_.k - 0.8) / 0.2)) : S_.ph === 'bonk' && t < T_BONK + 0.4 ? Math.exp(-(t - T_BONK) * 5) : 0;
  if (up > 0) { const a = [g.X(1.2, 1.05), g.X(-1.2, 1.05)]; hands = hands.map((h, i) => [lerp(h[0], a[i][0], up), lerp(h[1], a[i][1], up)]); }
  window._raw = [hands[0].slice(), hands[1].slice()]; window._sh = [sh1, sh2];
  { const lim = 0.72 * SAMS, c2 = (hd, sh) => { const dx = hd[0] - sh[0], dy = hd[1] - sh[1], d = Math.hypot(dx, dy); return d > lim ? [sh[0] + dx * lim / d, sh[1] + dy * lim / d] : hd; }; hands = [c2(hands[0], sh1), c2(hands[1], sh2)]; }
  const mouthG = g.X(0.16, 0.74);
  composeFrame([540, 960, 1], { noHalo: true,
    pre: (cx) => {
      bgFence(cx, t); deckBG(cx, 0); wallProp(cx);
      paperShadow(cx, S_.x0, FL + 8, 150 * (sam.sx > 1.3 ? 1.3 : 1), 0.5 * (S_.hop > 20 ? 0.45 : 1)); paperShadow(cx, C.x, FL + 8, 105, C.y < FL - 10 ? 0.28 : 0.5);
      if (C.ph === 'cap') paperShadow(cx, C.x, CAPY + 6, 90, 0.35);
      paperShadow(cx, B.x, FL + 12, BALLR * 1.05, 0.4);
    },
    ink: () => {},
    chars: (cx) => {
      ballDraw(cx, B);
      drawMochi(cx, C, t);
      samLegs(cx, sam, t); samInk(cx, sam, t, 0.5); samOver(cx, Object.assign({}, sam, { band: { a: 0 }, e: { a: 0 }, sweat: 0, a: 0.28 }), t);
      samBand(cx, sam, t); samEyes(cx, sam, t, eyes[0], eyes[1]);
      const mw = mouthAt(t); if (mw > 0.08) { const m = mouthG, o = 0.3 + 0.9 * mw; cx.save(); cx.translate(m[0], m[1]); cx.fillStyle = '#F1E9D8'; cx.beginPath(); cx.ellipse(0, 0, SAMS * 0.1 * (0.6 + 0.4 * mw), SAMS * 0.1 * o, 0, 0, 7); cx.fill(); cx.fillStyle = '#7A1B15'; cx.beginPath(); cx.ellipse(0, SAMS * 0.02, SAMS * 0.07 * (0.6 + 0.4 * mw), SAMS * 0.07 * o, 0, 0, 7); cx.fill(); cx.restore(); }
      samArms(cx, sam, t, hands, 0.17);
      for (const [te, x] of DUST) { const d = t - te; if (d >= 0 && d < 0.6) dust(cx, x, te === T_MF1 ? CAPY + 4 : FL + 6, d / 0.6, 0.85, 16); }
      if (t >= T_BONK && t < T_BONK + 0.7) stars(cx, sam.x, sam.y - 230, (t - T_BONK) * 1.6, 3, 64);
    } });
  const c = document.getElementById('c').getContext('2d'); const fade = 1 - ss(0, 0.35, t); if (fade > 0.002) { c.save(); c.fillStyle = `rgba(241,233,216,${clamp(fade)})`; c.fillRect(0, 0, 1080, 1920); c.restore(); }
}
