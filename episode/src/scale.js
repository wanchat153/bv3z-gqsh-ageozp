'use strict';
// ================= cues.js — ONE source of truth for picture AND sound ("Balance": the cat outweighs four melons), 6.4 s seamless loop =================
// Pure functions of t (no canvas). The scene (scene.js) and the sound dump (EVF) both read this file.
// Story: Mochi sits on the right pan of a balance scale (the heavy side is down). The samurai lifts one watermelon at a time out of a basket and lobs it onto the left pan.
// The scale stays tilted toward Mochi after 1, 2, 3 melons; with the 4th melon it levels out (he cheers) -> Mochi puffs up (heavier) -> the scale slams down on her side,
// the left pan flings all four melons back into the basket and the loop starts again. The scale angle is a damped 2nd-order system driven by the weights (no keyframed angle).
const DUR = 6.4, PI = Math.PI, D2R = PI / 180;   // LOOP = 6.4 comes from core.js
const sst = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const dmp = (d, k, f) => (d < 0 ? 0 : Math.exp(-d * k) * Math.cos(d * f));
// ---- geometry (world px, floor FL = 1400) ----
const PX = 650, PY = 880, BL = 200, STR = 320;        // scale: pivot x/y, half beam length, string length (pan surface level at alpha 0 = PY + STR = 1200)
const PRL = 82, PRR = 108, MR = 40, G = 2600;         // pan radii, melon radius, gravity (px/s^2)
const A0 = 16;                                        // rest tilt (deg) with Mochi alone on the right pan (right side down)
const SXC = 185, MOCS = 2.5;                          // samurai x, Mochi scale
const BXC = 275;                                      // basket centre x
const TL = [0.95, 1.9, 2.85, 3.8];                    // melon k lands on the left pan
const TFL = 0.32;                                     // flight time of the lob
const TP = 4.55;                                      // Mochi's puff pops
const T_BAL = TL[3] + 0.25;                           // balanced: he notices
// ---- 2nd-order response of the beam ----
function stepR(tau, w, z) { if (tau < 0) return 0; const wd = w * Math.sqrt(1 - z * z), e = Math.exp(-z * w * tau); return 1 - e * (Math.cos(wd * tau) + (z * w / wd) * Math.sin(wd * tau)); }
function kickR(tau, w, z) { if (tau < 0) return 0; const wd = w * Math.sqrt(1 - z * z); return Math.exp(-z * w * tau) * Math.sin(wd * tau); }
function alphaAt(t) {
  let a = A0;
  for (const m of [-1, 0]) { const o = m * LOOP;
    for (const tl of TL) a += -A0 / 4 * stepR(t - (tl + o), 9, 0.3) - 3.4 * kickR(t - (tl + o), 9, 0.3);   // each melon: -4 deg + a landing thump
    a += A0 * stepR(t - (TP + o), 13, 0.34);                                                              // the puff slams her side down again
  }
  return a;
}
function beamAt(t) {
  const a = alphaAt(t) * D2R, c = Math.cos(a), s = Math.sin(a), eL = [PX - BL * c, PY - BL * s], eR = [PX + BL * c, PY + BL * s];
  return { a, eL, eR, pL: [eL[0], eL[1] + STR], pR: [eR[0], eR[1] + STR] };
}
// ---- melons ----
const PSLOT = [[-38, -MR], [38, -MR], [0, -MR - 70], [0, -MR - 150]];          // where melon k sits on the left pan (relative to the pan surface centre)
const BSLOT = [[-40, -44], [40, -44], [-40, -124], [40, -124]];                // basket slots s0..s3 (relative to basket centre on the floor)
const PICK = [3, 2, 1, 0];                                                     // melon k comes out of basket slot PICK[k] (top first)
const bw = (s) => [BXC + BSLOT[s][0], FL + BSLOT[s][1]];
const OFF = [30, 8];                                                          // right hand sits at the melon's lower right side: hand = melon + OFF
const TREL = [0.18, 0.18, 0.18, 0.18];
const RET = { vy: [-900, -980, -1080, -1180], slot: [3, 2, 1, 0] };            // return flight: launch speed up, destination basket slot per melon k
function melonAt(k, t) {
  // returns {x,y,rot,state} for melon k (k = 0..3) at time t in the loop
  const tl = TL[k], rel = tl - TFL, s = PICK[k], sp = bw(s);
  if (t < tl - 0.87) return { x: sp[0], y: sp[1], rot: 0, st: 'basket' };
  if (t < rel) { const h = handAt(t); return { x: h[0] - OFF[0], y: h[1] - OFF[1], rot: 0, st: 'hand' }; }
  const B = beamAt(tl), tx = B.pL[0] + PSLOT[k][0], ty = B.pL[1] + PSLOT[k][1];      // target = slot on the pan at the moment of landing
  const h0 = handAt(rel), x0 = h0[0] - OFF[0], y0 = h0[1] - OFF[1], vx = (tx - x0) / TFL, vy = (ty - y0 - 0.5 * G * TFL * TFL) / TFL, d = t - rel;
  if (t < tl) return { x: x0 + vx * d, y: y0 + vy * d + 0.5 * G * d * d, rot: 3.2 * d, st: 'fly' };
  if (t < TP + 0.02) { const Bt = beamAt(t); return { x: Bt.pL[0] + PSLOT[k][0], y: Bt.pL[1] + PSLOT[k][1], rot: 0, st: 'pan' }; }
  // launched back into the basket
  const t0 = TP + 0.02, Bl = beamAt(t0), x0b = Bl.pL[0] + PSLOT[k][0], y0b = Bl.pL[1] + PSLOT[k][1], dst = bw(RET.slot[k]), v0 = RET.vy[k];
  const T = (-v0 + Math.sqrt(v0 * v0 + 2 * G * (dst[1] - y0b))) / G, dd = t - t0;
  if (dd < T) return { x: x0b + (dst[0] - x0b) * dd / T, y: y0b + v0 * dd + 0.5 * G * dd * dd, rot: -4 * dd + 0.5 * k, st: 'back' };
  return { x: dst[0], y: dst[1], rot: 0, st: 'basket' };
}
const retTime = (k) => { const t0 = TP + 0.02, Bl = beamAt(t0), y0b = Bl.pL[1] + PSLOT[k][1], dst = bw(RET.slot[k]), v0 = RET.vy[k]; return t0 + (-v0 + Math.sqrt(v0 * v0 + 2 * G * (dst[1] - y0b))) / G; };
// ---- samurai right hand (world) and body crouch: keyed splines over three loop copies so the wrap is smooth ----
const SYC = 1203;                                                        // standing body-centre y (FL - 197)
const CARRY = [SXC + 150, SYC + 70], WIND = [SXC + 140, SYC + 82], REL = [SXC + 152, SYC + 8], HFT = [SXC + 150, SYC - 8], READY = [SXC + 120, SYC + 95];
function handKeys() {
  const K = [];
  for (const m of [-1, 0, 1]) { const o = m * LOOP;
    K.push([o + 6.0, ...READY]);
    for (let k = 0; k < 4; k++) { const tl = TL[k] + o, g = bw(PICK[k]);
      K.push([tl - 1.17, ...(k === 0 ? READY : HFT)], [tl - 0.87, g[0] + OFF[0], g[1] + OFF[1]], [tl - 0.78, g[0] + OFF[0], g[1] + OFF[1]],
        [tl - 0.52, ...CARRY], [tl - 0.40, ...WIND], [tl - 0.32, ...REL], [tl - 0.22, ...HFT]); }
    K.push([o + 3.85, SXC + 140, SYC - 18], [o + 4.4, SXC + 140, SYC - 18], [o + 4.7, SXC + 100, SYC + 70], [o + 5.3, SXC + 100, SYC + 70]);   // cheer (hand up), then arm drops after the pop
  }
  return K;
}
const HK = handKeys().sort((a, b) => a[0] - b[0]);
function handAt(t) { return KS(HK, t); }
const SYK = (() => { const K = []; for (const m of [-1, 0, 1]) { const o = m * LOOP; for (let k = 0; k < 4; k++) { const tl = TL[k] + o, lo = k < 2 ? 0.9 : 0.76; K.push([tl - 1.17, 1], [tl - 0.87, lo], [tl - 0.78, lo], [tl - 0.52, 1]); } } return K.sort((a, b) => a[0] - b[0]); })();
const crouchAt = (t) => ks1(SYK, t);
// ---- Mochi ----
function mochiAct(t) {
  const puff = sst((t - 4.2) / 0.35) * (t < TP ? 1 : 1) - sst((t - 5.6) / 0.5);                      // inflate before the pop, deflate afterwards
  const pop = t >= TP ? Math.exp(-(t - TP) / 0.12) * Math.cos((t - TP) * 40) : 0;
  const bal = sst((t - TL[3]) / 0.2) * (1 - sst((t - TP) / 0.1));
  return { sx: 1 + 0.38 * puff + 0.08 * pop, sy: 1 + 0.16 * puff - 0.06 * pop, bal, puff };
}
// ---- events for the sound track: [t, type, amp, x] ----
const EVF = (() => {
  const E = [[0.1, 'amb', 1, 540]];
  for (let k = 0; k < 4; k++) { const tl = TL[k], rel = tl - TFL; E.push([tl - 1.17 + 0.2, 'crouch', 0.45, SXC], [rel - 0.45, 'rustle', 0.35, SXC + 90], [rel, 'hop', 0.55, SXC + 120], [tl, 'melon', 0.85, 458, { p: k }], [tl + 0.02, 'creak', 0.5, PX]); }
  E.push([T_BAL, 'gasp', 0.6, SXC], [T_BAL + 0.3, 'giggle', 0.5, SXC], [4.25, 'inhale', 0.6, 842, { dur: 0.3 }], [TP, 'pop', 1, 842], [TP + 0.01, 'creak', 0.9, PX], [TP + 0.04, 'bonk', 0.9, 842]);
  for (let k = 0; k < 4; k++) E.push([retTime(k), 'melon', 0.8, bw(RET.slot[k])[0], { p: 3 - k }]);
  E.push([5.95, 'sigh', 0.6, SXC], [4.8, 'mew', 0.5, 842], [5.5, 'purr', 0.4, 842, { dur: 0.6 }]);
  return E.sort((a, b) => a[0] - b[0]);
})();
// ================= scene.js — drawing; everything is a pure function of t (cues.js holds all motion) =================
const WOODL = '#D2A56A', WOODM = '#A9743F', WOODD = '#5E3B20', BRASS = '#D8B452', BRASSD = '#9C7A2C';
// ---------- background: a fruit stall ----------
function bgMarket(c, t) {
  const g = c.createLinearGradient(0, 0, 0, FL); g.addColorStop(0, '#CFE4D6'); g.addColorStop(1, '#A9CDB9'); c.fillStyle = g; c.fillRect(-300, -300, 1680, FL + 300);
  c.strokeStyle = 'rgba(60,92,80,0.35)'; c.lineWidth = 3; for (let x = -40; x < 1140; x += 96) { c.beginPath(); c.moveTo(x, 190); c.lineTo(x, FL); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,0.14)'; for (let x = -40; x < 1140; x += 192) c.fillRect(x + 6, 190, 14, FL - 190);
  // awning
  for (let i = -1; i < 13; i++) { const x = i * 96; c.fillStyle = i % 2 ? '#F1E6C8' : '#B9473A'; c.beginPath(); c.moveTo(x, -300); c.lineTo(x + 96, -300); c.lineTo(x + 96, 200); c.quadraticCurveTo(x + 48, 256, x, 200); c.closePath(); c.fill(); c.strokeStyle = INKC; c.lineWidth = 4; c.stroke(); }
  c.fillStyle = 'rgba(0,0,0,0.10)'; c.fillRect(-300, 250, 1680, 30);
  // shelf with produce (left + right, behind the characters)
  const shelf = (x0, x1, y) => { c.fillStyle = WOODM; c.fillRect(x0, y, x1 - x0, 22); c.strokeStyle = INKC; c.lineWidth = 4; c.strokeRect(x0, y, x1 - x0, 22); c.fillStyle = WOODD; c.fillRect(x0 + 14, y + 22, 10, 60); c.fillRect(x1 - 24, y + 22, 10, 60); };
  shelf(30, 360, 560); shelf(760, 1060, 600);
  const fruit = (x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, PI2); c.fill(); c.strokeStyle = INKC; c.lineWidth = 3.5; c.stroke(); c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.ellipse(x - r * 0.35, y - r * 0.4, r * 0.22, r * 0.12, -0.7, 0, PI2); c.fill(); };
  for (const [x, col] of [[80, '#E58A3A'], [150, '#E58A3A'], [220, '#D9C24A'], [290, '#D9C24A']]) fruit(x, 560 - 36, 36, col);
  for (const [x, col] of [[810, '#7FB05A'], [880, '#7FB05A'], [950, '#C9503A'], [1020, '#C9503A']]) fruit(x, 600 - 32, 32, col);
  // hanging paper lantern
  c.strokeStyle = INKC; c.lineWidth = 3; c.beginPath(); c.moveTo(930, 240); c.lineTo(930, 330); c.stroke(); c.fillStyle = '#E8A04A'; c.beginPath(); c.ellipse(930, 380, 52, 66, 0, 0, PI2); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(120,60,20,0.5)'; for (let k = -1; k <= 1; k++) { c.beginPath(); c.ellipse(930, 380, 52 * Math.abs(k) * 0.9 + 1, 66, 0, 0, PI2); c.stroke(); } c.fillStyle = 'rgba(255,230,150,0.35)'; c.beginPath(); c.ellipse(915, 360, 14, 28, 0.2, 0, PI2); c.fill();
  // floor: flagstones
  const f = c.createLinearGradient(0, FL, 0, 1920); f.addColorStop(0, '#C2B08F'); f.addColorStop(1, '#A99673'); c.fillStyle = f; c.fillRect(-300, FL, 1680, 700);
  c.strokeStyle = 'rgba(70,56,38,0.45)'; c.lineWidth = 3; for (let y = FL + 10, r = 0; y < 1900; y += 130, r++) { c.beginPath(); c.moveTo(-300, y); c.lineTo(1380, y); c.stroke(); const off = r % 2 ? 90 : 0; for (let x = -300 + off; x < 1380; x += 180) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 130); c.stroke(); } }
  c.fillStyle = 'rgba(40,28,16,0.14)'; c.fillRect(-300, FL, 1680, 10);
}
// ---------- props ----------
function melonDraw(c, x, y, rot) {
  c.save(); c.translate(x, y); const r = MR;
  c.fillStyle = '#6AA84F'; c.beginPath(); c.arc(0, 0, r, 0, PI2); c.fill();
  c.save(); c.beginPath(); c.arc(0, 0, r - 1, 0, PI2); c.clip(); c.rotate(rot); c.strokeStyle = '#2F6B33'; c.lineWidth = 9; c.lineCap = 'round';
  for (let k = -3; k <= 3; k++) { c.beginPath(); c.moveTo(k * 13, -r); c.quadraticCurveTo(k * 22, 0, k * 13, r); c.stroke(); } c.restore();
  c.strokeStyle = INKC; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, r, 0, PI2); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.ellipse(-r * 0.38, -r * 0.42, r * 0.2, r * 0.11, -0.7, 0, PI2); c.fill();
  c.fillStyle = '#4B7A2E'; c.beginPath(); c.arc(0, -r + 2, 5, 0, PI2); c.fill();
  c.restore();
}
function panDraw(c, p, r) {
  c.save(); c.fillStyle = BRASSD; c.beginPath(); c.ellipse(p[0], p[1] + 9, r, 17, 0, 0, PI2); c.fill(); c.strokeStyle = INKC; c.lineWidth = 4; c.stroke();
  c.fillStyle = BRASS; c.beginPath(); c.ellipse(p[0], p[1], r, 17, 0, 0, PI2); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(p[0] - r * 0.3, p[1] - 3, r * 0.35, 4, 0, 0, PI2); c.fill(); c.restore();
}
function scaleBack(c, B) {
  c.save();
  // post + base
  const pg = c.createLinearGradient(PX - 18, 0, PX + 18, 0); pg.addColorStop(0, WOODL); pg.addColorStop(1, WOODM); c.fillStyle = pg; c.fillRect(PX - 17, PY + 14, 34, FL - PY - 14); c.strokeStyle = INKC; c.lineWidth = 4; c.strokeRect(PX - 17, PY + 14, 34, FL - PY - 14);
  c.fillStyle = WOODM; c.fillRect(PX - 70, FL - 30, 140, 30); c.strokeRect(PX - 70, FL - 30, 140, 30); c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(PX - 66, FL - 28, 132, 5);
  // strings (behind the pans, melons and Mochi)
  c.strokeStyle = 'rgba(40,28,18,0.85)'; c.lineWidth = 3.5;
  for (const [e, p, r] of [[B.eL, B.pL, PRL], [B.eR, B.pR, PRR]]) for (const dx of [-r * 0.96, 0, r * 0.96]) { c.beginPath(); c.moveTo(e[0], e[1] + 8); c.lineTo(p[0] + dx, p[1]); c.stroke(); }
  // beam
  c.translate(PX, PY); c.rotate(B.a); const bg = c.createLinearGradient(0, -14, 0, 14); bg.addColorStop(0, WOODL); bg.addColorStop(1, WOODM); c.fillStyle = bg;
  c.beginPath(); c.roundRect(-BL - 24, -13, 2 * BL + 48, 26, 13); c.fill(); c.stroke();
  c.fillStyle = BRASS; for (const sx of [-1, 1]) { c.beginPath(); c.arc(sx * BL, 6, 9, 0, PI2); c.fill(); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,0.28)'; c.fillRect(-BL, -10, 2 * BL, 4);
  c.restore();
  c.save(); c.translate(PX, PY); c.fillStyle = BRASS; c.strokeStyle = INKC; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 24, 0, PI2); c.fill(); c.stroke(); c.fillStyle = BRASSD; c.beginPath(); c.arc(0, 0, 9, 0, PI2); c.fill();
  c.rotate(B.a); c.fillStyle = '#B3271F'; c.beginPath(); c.moveTo(-7, 20); c.lineTo(7, 20); c.lineTo(0, 86); c.closePath(); c.fill(); c.stroke(); c.restore();
}
function basketFront(c) {
  c.save(); const x0 = BXC - 92, x1 = BXC + 92, yt = FL - 66, yb = FL;
  c.fillStyle = '#C48E4E'; c.beginPath(); c.moveTo(x0, yt); c.lineTo(x1, yt); c.lineTo(x1 - 12, yb); c.lineTo(x0 + 12, yb); c.closePath(); c.fill(); c.strokeStyle = INKC; c.lineWidth = 4.5; c.stroke();
  c.save(); c.clip(); c.strokeStyle = 'rgba(80,46,20,0.55)'; c.lineWidth = 3; for (let y = yt + 14; y < yb; y += 14) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); } for (let x = x0 + 10, i = 0; x < x1; x += 22, i++) for (let y = yt; y < yb; y += 28) { c.beginPath(); c.moveTo(x + (Math.floor(y / 28) % 2 ? 11 : 0), y); c.lineTo(x + (Math.floor(y / 28) % 2 ? 11 : 0), y + 14); c.stroke(); } c.restore();
  c.fillStyle = '#A8733A'; c.beginPath(); c.roundRect(x0 - 8, yt - 10, x1 - x0 + 16, 18, 8); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(x0, yt - 7, x1 - x0, 4);
  c.restore();
}
// ---------- samurai ----------
function samAt(t) {
  const sy = crouchAt(t), D2 = SAMS * 1.58 * sy, sx = 1 + 0.45 * (1 - sy), cheer = wnd(T_BAL, TP, t, 0.15), shock = pulse(t, TP, 0.12);
  let hop = arc(t, T_BAL + 0.05, 14, 0.3) + arc(t, T_BAL + 0.42, 10, 0.3) + 14 * shock, rot = 0.03 * Math.sin(t * 5) * cheer - 0.1 * shock;
  const y = FL - D2 * Math.cos(rot) - hop, x = SXC + D2 * Math.sin(rot);
  const sweat = Math.max(wnd(2.6, 3.9, t, 0.4) * 0.35, ss(T_BAL, T_BAL + 0.2, t) * (1 - ss(TP, TP + 0.1, t)) * 0.5);
  return { st: samState(0, { x, y, ground: y + D2 * Math.cos(rot), S: SAMS, face: 1, sx, sy, rot, walk: null, band: { a: 1, wind: 0.18 + 0.1 * Math.sin(t * 3) }, sweat }), cheer, shock };
}
const pulse = (t, t0, d = 0.06) => Math.exp(-(((t - t0) / d) ** 2));
function samHands(S_, t) {
  const g = samGeom(S_.st, t), sh = [g.X(-0.85, 0.5), g.X(0.85, 0.5)], hr = handAt(t);
  const rest = g.X(-1.36, 0.88), up = [g.X(-1.12, 0.1)[0], SYC - 18], ch = S_.cheer;
  let L = [lerp(rest[0], up[0], ch), lerp(rest[1], up[1], ch)];
  const raw = [L, hr.slice()], lim = 0.72 * SAMS, out = raw.map((h, i) => { const dx = h[0] - sh[i][0], dy = h[1] - sh[i][1], d = Math.hypot(dx, dy); return d > lim ? [sh[i][0] + dx * lim / d, sh[i][1] + dy * lim / d] : h; });
  window._raw = raw; window._sh = sh; window._hands = out; return out;
}
function samEyesAt(t, S_, mel, C) {
  const st = S_.st, g = samGeom(st, t), P = [g.X(-0.46, 0.26), g.X(0.16, 0.26)], B = beamAt(t);
  let tg = [B.pL[0], B.pL[1] - 80]; const k = TL.findIndex((tl) => t > tl - 1.17 && t <= tl - 0.2);
  if (k >= 0 && t < TL[k] - 0.32) { const m = mel[k]; tg = [m.x, m.y]; }
  if (t >= T_BAL && t < TP) tg = [B.pL[0], B.pL[1] - 150];
  if (t >= TP && t < TP + 0.9) { const m = mel[0]; tg = [m.x, m.y]; }
  if (t >= TP + 0.9) tg = [C.x, C.y - 150];
  const ov = {}, set = (a, b, o) => { if (t >= a && t < b) Object.assign(ov, o); };
  for (const tl of TL) set(tl - 0.5, tl - 0.3, { squeeze: 0.5 });
  set(T_BAL, TP - 0.1, { happy: 0.9, wide: 0.3 }); set(TP, TP + 0.6, { wide: 1, open: 1 }); set(TP + 0.8, 6.0, { open: 0.5 });
  return P.map((p) => { const dx = tg[0] - p[0], dy = tg[1] - p[1], l = Math.hypot(dx, dy) || 1; return Object.assign({ open: 0.9, wide: 0.2, sad: 0, look: [clamp(dx / l * 1.05, -1, 1), clamp(dy / l * 1.05, -1, 1)], closed: 0, squeeze: 0, happy: 0, angry: 0 }, ov); });
}
const mouthAt = (t) => Math.max(0.9 * wnd(T_BAL, T_BAL + 0.5, t, 0.1), 1.0 * wnd(TP, TP + 0.7, t, 0.1), 0.3 * wnd(2.4, 2.9, t, 0.2));
// ---------- Mochi on the right pan ----------
function catAt(t, B, mel) {
  const A = mochiAct(t), x = B.pR[0], y = B.pR[1];
  const near = mel.filter((m) => m.st === 'fly').sort((a, b) => b.y - a.y)[0];
  let tx = SXC + 60, ty = FL - 240; if (t >= TP + 0.1 && t < TP + 1.0) { tx = BXC; ty = FL - 200; } if (near) { tx = near.x; ty = near.y; }
  const look = [clamp((tx - x) / 260, -1, 1), clamp((ty - (y - 140)) / 300, -1, 0.3)];
  const smug = sst((t - TP - 0.3) / 0.3) * (1 - sst((t - 5.9) / 0.4)), half = 0.5 * smug;
  return { x, y, A, look, wide: 0.15 + 0.5 * A.bal + 0.3 * pulse(t, TP, 0.1), half, tail: 0.15 + 0.45 * A.puff, mouth: 0.5 * pulse(t, TP + 0.05, 0.1) + 0.3 * wnd(5.4, 5.9, t, 0.15), tilt: 0.05 + 0.1 * smug };
}
function drawMochi(c, C, t) {
  c.save(); if (C.A.sx !== 1 || C.A.sy !== 1) { c.translate(C.x, C.y); c.scale(C.A.sx, C.A.sy); c.translate(-C.x, -C.y); }
  const m = mochi(C.x, C.y - 2, MOCS, t, { rot: 0, swat: 0, wide: C.wide, look: C.look, tail: C.tail, tilt: C.tilt }); m.mouth = { open: C.mouth }; if (C.half > 0) m.e.open = 1 - 0.45 * C.half;
  drawCat(c, m, t); c.restore();
}
// ---------- render ----------
function renderFrame(T) {
  const t = ((T % LOOP) + LOOP) % LOOP, B = beamAt(t), S_ = samAt(t), mel = [0, 1, 2, 3].map((k) => melonAt(k, t)), C = catAt(t, B, mel), hands = samHands(S_, t), eyes = samEyesAt(t, S_, mel, C), sam = S_.st;
  const g = samGeom(sam, t), mouthG = g.X(0.16, 0.74);
  composeFrame([540, 960, 1], { noHalo: true,
    pre: (cx) => { bgMarket(cx, t);
      paperShadow(cx, SXC, FL + 8, 150, 0.5); paperShadow(cx, BXC, FL + 6, 150, 0.4); paperShadow(cx, PX, FL + 4, 90, 0.4);
      const h = (FL - B.pL[1]) / 400; paperShadow(cx, B.pL[0], FL + 8, 110, 0.22 / (1 + h)); paperShadow(cx, B.pR[0], FL + 8, 140, 0.26 / (1 + (FL - B.pR[1]) / 400)); },
    ink: () => {},
    chars: (cx) => {
      scaleBack(cx, B);
      panDraw(cx, B.pL, PRL); for (const m of mel) if (m.st === 'pan') melonDraw(cx, m.x, m.y, 0);
      panDraw(cx, B.pR, PRR); drawMochi(cx, C, t);
      samLegs(cx, sam, t); samInk(cx, sam, t, 0.5); samOver(cx, Object.assign({}, sam, { band: { a: 0 }, e: { a: 0 }, sweat: 0, a: 0.28 }), t); samBand(cx, sam, t); samEyes(cx, sam, t, eyes[0], eyes[1]);
      const inBasket = (m) => m.st === 'basket' || (m.st === 'back' && m.y > FL - 70);
      for (const m of mel) if (inBasket(m)) melonDraw(cx, m.x, m.y, m.rot);
      basketFront(cx);
      for (const m of mel) if (m.st === 'hand' || m.st === 'fly' || (m.st === 'back' && !inBasket(m))) melonDraw(cx, m.x, m.y, m.rot);
      const mw = mouthAt(t); if (mw > 0.08) { const m = mouthG, o = 0.3 + 0.9 * mw; cx.save(); cx.translate(m[0], m[1]); cx.fillStyle = '#F1E9D8'; cx.beginPath(); cx.ellipse(0, 0, SAMS * 0.1 * (0.6 + 0.4 * mw), SAMS * 0.1 * o, 0, 0, 7); cx.fill(); cx.fillStyle = '#7A1B15'; cx.beginPath(); cx.ellipse(0, SAMS * 0.02, SAMS * 0.07 * (0.6 + 0.4 * mw), SAMS * 0.07 * o, 0, 0, 7); cx.fill(); cx.restore(); }
      samArms(cx, sam, t, hands, 0.17);
      for (const k of [0, 1, 2, 3]) { const d = t - TL[k]; if (d >= 0 && d < 0.5) dust(cx, B.pL[0] + PSLOT[k][0], B.pL[1] + PSLOT[k][1] + MR, d / 0.5, 0.7, 12); }
      { const d = t - TP; if (d >= 0 && d < 0.6) { dust(cx, B.pR[0] - 90, B.pR[1] + 18, d / 0.6, 0.9, 16); dust(cx, B.pR[0] + 90, B.pR[1] + 18, d / 0.6, 0.9, 16); } }
    } });
}
function initStory(canvas) { deepFreeze(P_SIT); initEngine(canvas); initCast(); }
