'use strict';
// ================= cues.js — ONE source of truth for picture AND sound ("Moonlight Mirror"), 19.2 s seamless loop =================
// Story: Mochi sits on a low table and tilts a bronze mirror in the moonlight. The reflected dot of light runs over the floor; the samurai tries to stay calm
// but cannot resist: he pounces (misses), pounces, bumps the pillar, tries to meditate, is teased, spins after the dot, falls dizzy. She stops, yawns.
// He glares, walks back, closes his eyes... and the dot appears again (loop).
// Physics: the mirror tilt is SOLVED from where the dot must land (reflection law), so mirror, beam, dot and Mochi's paw always agree.
const DUR = 19.2, PI = Math.PI;                        // 3 x LOOP (core.js LOOP = 6.4)
const GND = 1440;                                       // ground line for the samurai and the dot
const MX = 770, MY = 1205, MLEN = 150;                 // mirror pivot (on a stand on the low table) and plate length
const TBL = { x0: 640, x1: 1040, y: 1330 };            // low table top (Mochi sits on it)
const WIN = [300, 560, 118];                           // round moon window (beam source) x, y, r
const PIL = 100;                                       // pillar face x (left wall)
const D_IN = (() => { const dx = MX - WIN[0], dy = MY - WIN[1], l = Math.hypot(dx, dy); return [dx / l, dy / l]; })();
const hsh1 = (a) => { const x = Math.sin(a * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
const pulse = (t, t0, d = 0.06) => Math.exp(-(((t - t0) / d) ** 2));
const GRX = [0.5, 0.5];

// ---- samurai pounces: [take-off, landing, x_land, dot_target_after] ----
const POUNCE = [[1.85, 2.20, 170], [2.85, 3.22, 420], [3.75, 4.05, 290], [4.5, 4.95, 520], [5.45, 5.75, 360], [6.15, 6.65, 540], [7.0, 7.6, 190]];
const T_BUMP = 7.6, T_CALM = 8.9, T_PEEK = 9.7, T_OFF1 = 10.0, T_CHEER = 10.4, T_ON2 = 10.95, T_TOUCH = 12.2, T_SPIN0 = 12.3, T_FALL = 14.8, T_OFF2 = 15.0, T_YAWN = 15.3, T_SIT = 16.3, T_WALK = 17.3, T_TURN = 18.35, T_OFF3 = 18.5;
const SX0 = 250;                                       // samurai start x
// ---- dot target on the floor (x), with jumps of 0.1 s timed 0.1 s before each landing ----
const DOTK = (() => {
  const K = [[0, 380]];
  const jump = (t, x) => { const L = K[K.length - 1]; K.push([t, L[1]]); K.push([t + 0.1, x]); };
  jump(1.55, 170); jump(2.08, 420); jump(3.12, 290); jump(3.95, 520); jump(4.85, 360); jump(5.65, 540); jump(6.55, 150);
  jump(8.6, 340); K.push([9.2, 360]); K.push([9.45, 300]); K.push([9.7, 360]); K.push([10.0, 330]);
  K.push([10.95, 380]); K.push([12.2, 262]);
  K.push([14.9, 380]); K.push([18.5, 380]); K.push([DUR, 380]);
  return K;
})();
const JT = [1.55, 2.08, 3.12, 3.95, 4.85, 5.65, 6.55, 8.6, 10.95];
const wobX = (t) => { let w = 0; for (const tj of JT) { const d = t - tj - 0.1; if (d > 0 && d < 0.5) w += 16 * Math.exp(-d / 0.1) * Math.sin(38 * d); } return w; };
const flickAt = (t) => Math.max(...JT.map((q) => pulse(t, q - 0.03, 0.05)));
const SMUGT = [2.45, 3.45, 4.3, 5.2, 6.05, 6.9, 7.9, 9.0, 11.6];
const WIG = (t) => { let w = 0; for (const [ta] of POUNCE) w = Math.max(w, wnd(ta - 0.6, ta - 0.1, t, 0.08)); return w; };
const dotXb = (t) => { const K = DOTK; if (t <= K[0][0]) return K[0][1]; for (let i = 1; i < K.length; i++) if (t <= K[i][0]) { const a = K[i - 1], b = K[i], u = (t - a[0]) / (b[0] - a[0] || 1); return a[1] + (b[1] - a[1]) * (u * u * (3 - 2 * u)); } return K[K.length - 1][1]; };
const spinEnv = (t) => wnd(T_SPIN0, T_FALL - 0.1, t, 0.45);
const spinPhi = (t) => 2 * PI * 0.8 * (t - T_SPIN0);
const dotXf = (t) => { const e = spinEnv(t), b = dotXb(t) + wobX(t); return e > 0 ? lerp(b, samXf(t) + 150 * Math.cos(spinPhi(t)), e) : b; };
const dotYf = (t) => { const e = spinEnv(t); return e > 0 ? lerp(GND - 2, GND + 8 + 50 * Math.sin(spinPhi(t)), e) : GND - 2; };
const dotPos = (t) => [dotXf(t), dotYf(t)];
const dotVis = (t) => Math.max(ss(0.3, 0.6, t) * (1 - ss(T_OFF1 - 0.08, T_OFF1, t)), ss(T_ON2, T_ON2 + 0.25, t) * (1 - ss(T_OFF2 - 0.1, T_OFF2, t)));

// ---- samurai x (ground contact), face, hop, lean, lying ----
const eio = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
function samXf(t) {
  let x = SX0;
  for (const [ta, tl, xl] of POUNCE) { if (t >= tl) x = xl; else if (t > ta) { x = lerp(x, xl, eio((t - ta) / (tl - ta))); break; } else break; }
  if (t >= T_BUMP) x = 190 + 30 * Math.exp(-(t - T_BUMP) * 9) * Math.cos((t - T_BUMP) * 16) * -1 + 28 * Math.exp(-(t - T_BUMP) * 6);
  if (t >= T_SPIN0) { const u = ss(T_SPIN0, T_FALL, t); x = lerp(190, 330, u) + 22 * Math.sin((t - T_SPIN0) * 6) * (1 - 0.6 * u); }
  if (t >= T_FALL) x = 330 + 70 * ss(T_FALL, T_FALL + 0.45, t);
  if (t >= T_WALK) x = lerp(400, SX0, eio((t - T_WALK) / (T_TURN - 0.3 - T_WALK)));
  if (t >= T_TURN - 0.3) x = SX0;
  return x;
}
function faceAt(t) {   // +1 looks right, -1 left; flip 0.08 s before each take-off; spin = fast flips (sx squash handles the turn)
  if (t < 1.77) return 1; let f = 1;
  const pf = [[1.77, -1], [2.75, 1], [3.67, -1], [4.42, 1], [5.37, -1], [6.08, 1], [6.92, -1], [T_CALM, 1], [T_WALK - 0.2, -1], [T_TURN, 1]];
  for (const [tt, ff] of pf) if (t >= tt) f = ff; return f;
}
const FLIPS = [1.77, 2.75, 3.67, 4.42, 5.37, 6.08, 6.92, T_CALM, T_WALK - 0.2, T_TURN];
const turnPulse = (t) => Math.max(...FLIPS.map((q) => pulse(t, q, 0.045)));
const SPIN = (t) => (t >= T_SPIN0 && t < T_FALL) ? (t - T_SPIN0) : 0;
function spinSx(t) { if (!(t >= T_SPIN0 && t < T_FALL - 0.25)) return [1, 0]; const ph = (t - T_SPIN0) * (7 + 5 * ss(T_SPIN0, T_FALL, t)); return [Math.max(0.35, Math.abs(Math.cos(ph))), Math.cos(ph) >= 0 ? 1 : -1]; }
const lieAt = (t) => t < T_FALL - 0.25 ? 0 : (t < T_SIT ? ss(T_FALL - 0.25, T_FALL + 0.2, t) : 1 - ss(T_SIT, T_SIT + 0.7, t));
const hopAt = (t) => { let h = 0; for (const [ta, tl] of POUNCE) h += arc(t, ta, 34 + 0.04 * (POUNCE.indexOf([ta, tl]) + 1) * 0 + (tl - ta) * 90, tl - ta);
  h += arc(t, T_TOUCH, 70, 0.4) + arc(t, T_TOUCH + 0.4, 18, 0.25) + arc(t, T_CHEER + 0.1, 12, 0.3) + arc(t, T_CHEER + 0.45, 10, 0.3); return h; };
const dizzy = (t) => wnd(T_BUMP + 0.15, T_CALM, t, 0.3) + 0.9 * wnd(T_SPIN0 + 1.5, T_FALL + 1.5, t, 0.4);

// ---- the beam: dot hit (floor or samurai body), mirror tilt solved from the reflection law ----
const FLOORY = GND - 2;
function dirOut(xd, yd = FLOORY) { const dx = xd - MX, dy = yd - MY, l = Math.hypot(dx, dy); return [dx / l, dy / l]; }
function mirrorN(t) { const o = dirOut(dotXf(t), dotYf(t)), nx = o[0] - D_IN[0], ny = o[1] - D_IN[1], l = Math.hypot(nx, ny); return [nx / l, ny / l]; }   // plate normal (toward the light)
function mirrorBeta(t) { const n = mirrorN(t); return Math.atan2(n[1], n[0]); }
function mirrorEnds(t) { const n = mirrorN(t), tv = [-n[1], n[0]]; if (tv[1] > 0) { tv[0] = -tv[0]; tv[1] = -tv[1]; } return { top: [MX + tv[0] * MLEN / 2, MY + tv[1] * MLEN / 2], bot: [MX - tv[0] * MLEN / 2, MY - tv[1] * MLEN / 2], n }; }
function dotHit(t) { const p = dotPos(t); return { x: p[0], y: p[1], body: false, front: spinEnv(t) > 0.05 && p[1] > GND + 14 }; }
// ---- Mochi ----
const swatAt = (t) => { const c = mirrorEnds(t); return clamp((c.top[1] - 1180) / 60, 0, 1); };
const sweatS = (t) => Math.max(0.5 * wnd(2.9, 7.6, t, 0.6), 0.7 * wnd(T_BUMP, T_CALM + 0.6, t, 0.3), 0.8 * wnd(T_SPIN0, T_FALL + 0.5, t, 0.4));
const T_CAT_LAUGH = SMUGT;

// ---- events for the sound track: [t, type, amp, x, opts] ----
const EVF = (() => {
  const E = [];
  const tink = (t, x) => E.push([t, 'tink', 0.5, x]);
  tink(0.3, 380); for (const tj of JT) E.push([tj - 0.03, 'tap', 0.35, 880]);
  for (const [ta, tl, xl] of POUNCE) { E.push([ta - 0.06, 'crouch', 0.5, xl]); E.push([ta, 'hop', 0.6, xl]); E.push([tl, 'land', 0.8, xl]); }
  for (let i = 1; i < DOTK.length; i++) { const a = DOTK[i - 1], b = DOTK[i]; if (b[0] < 8.5 && b[0] - a[0] > 0.05 && b[0] - a[0] < 0.15 && Math.abs(b[1] - a[1]) > 60) tink(a[0], b[1]); }
  E.push([T_BUMP, 'bonk', 1.0, 150], [T_BUMP + 0.5, 'star', 0.6, 190], [T_BUMP + 1.2, 'star', 0.5, 190], [T_BUMP + 2.2, 'sigh', 0.5, 200]);
  E.push([T_PEEK, 'tink', 0.4, 330], [T_OFF1, 'blink', 0.5, 330], [T_CHEER, 'giggle', 0.5, 900], [T_ON2, 'tink', 0.5, 380], [T_TOUCH, 'squeak', 0.9, 240]);
  for (let t = T_SPIN0; t < T_FALL - 0.3; t += 0.45) E.push([t, 'whirl', 0.4, 300], [t + 0.2, 'tink', 0.35, 300 + 150 * Math.sin((t - T_SPIN0) * 11)]);
  E.push([T_FALL, 'fall', 1.0, 380], [T_FALL + 0.35, 'thump', 0.8, 420], [T_YAWN, 'yawn', 0.6, 900], [T_SIT + 0.2, 'grumble', 0.5, 400], [T_OFF3, 'tink', 0.2, 330]);
  for (let t = T_WALK; t < T_TURN - 0.3; t += 0.27) E.push([t, 'step', 0.4, lerp(400, SX0, (t - T_WALK) / (T_TURN - T_WALK))]);
  return E.sort((a, b) => a[0] - b[0]);
})();
// ================= scene.js — drawing; every frame is a pure function of t (cues.js holds all motion) =================
const WOODL = '#C99B62', WOODM = '#9B6B3C', WOODD = '#573720', BRZ = '#C99A45', BRZD = '#8A6428';
const star = (c, x, y, r, rot, a) => { c.save(); c.globalAlpha = a; c.translate(x, y); c.rotate(rot); c.fillStyle = '#FFD94A'; c.strokeStyle = INKC; c.lineWidth = 2.2; c.beginPath(); for (let k = 0; k < 10; k++) { const rr = k % 2 ? r * 0.45 : r, q = k * PI / 5 - PI / 2; c.lineTo(rr * Math.cos(q), rr * Math.sin(q)); } c.closePath(); c.fill(); c.stroke(); c.restore(); };
// ---------- room ----------
function bgRoom(c, t) {
  const g = c.createLinearGradient(0, 0, 0, FL); g.addColorStop(0, '#CBDDEA'); g.addColorStop(1, '#A7BFD4'); c.fillStyle = g; c.fillRect(-300, -300, 1680, FL + 300);
  c.strokeStyle = 'rgba(70,92,120,0.32)'; c.lineWidth = 3; for (let x = -20; x < 1140; x += 108) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, FL); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,0.12)'; for (let x = -20; x < 1140; x += 216) c.fillRect(x + 6, 0, 16, FL);
  c.fillStyle = 'rgba(60,44,30,0.14)'; c.fillRect(0, FL - 130, 1080, 130); c.fillStyle = WOODM; c.fillRect(0, FL - 134, 1080, 10); c.strokeStyle = INKC; c.lineWidth = 3; c.strokeRect(-4, FL - 134, 1088, 10);
  // round moon window (the beam comes from here)
  const [wx, wy, wr] = WIN; c.fillStyle = '#1E2F52'; c.beginPath(); c.arc(wx, wy, wr, 0, PI2); c.fill();
  c.fillStyle = '#F6EDC0'; c.beginPath(); c.arc(wx + 8, wy - 6, 56, 0, PI2); c.fill(); c.fillStyle = 'rgba(190,170,110,0.35)'; for (const [dx, dy, r] of [[-12, -18, 11], [20, 14, 8], [-4, 24, 6]]) { c.beginPath(); c.arc(wx + 8 + dx, wy - 6 + dy, r, 0, PI2); c.fill(); }
  for (const [dx, dy, r, ph] of [[-80, -60, 3, 0], [70, -70, 2.5, 1], [86, 30, 3, 2], [-84, 40, 2.5, 3], [10, 88, 2.5, 4], [-30, -92, 2, 5]]) { c.fillStyle = `rgba(246,242,216,${0.55 + 0.45 * Math.sin(t * 2.1 + ph)})`; c.beginPath(); c.arc(wx + dx, wy + dy, r, 0, PI2); c.fill(); }
  c.strokeStyle = WOODD; c.lineWidth = 12; c.beginPath(); c.arc(wx, wy, wr, 0, PI2); c.stroke(); c.lineWidth = 7; c.beginPath(); c.moveTo(wx - wr, wy); c.lineTo(wx + wr, wy); c.moveTo(wx, wy - wr); c.lineTo(wx, wy + wr); c.stroke();
  c.strokeStyle = INKC; c.lineWidth = 3.5; c.beginPath(); c.arc(wx, wy, wr + 6, 0, PI2); c.stroke();
  // hanging scroll (ink mountain + red seal, no letters) on the right wall
  const sx = 906, sy = 560; c.fillStyle = WOODD; c.fillRect(sx - 12, sy - 14, 108, 12); c.fillRect(sx - 12, sy + 300, 108, 14); c.fillStyle = '#EFE3C4'; c.fillRect(sx, sy, 84, 300); c.strokeStyle = INKC; c.lineWidth = 3.5; c.strokeRect(sx, sy, 84, 300);
  c.strokeStyle = 'rgba(40,40,52,0.85)'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(sx + 8, sy + 230); c.quadraticCurveTo(sx + 32, sy + 110, sx + 50, sy + 160); c.quadraticCurveTo(sx + 62, sy + 80, sx + 76, sy + 210); c.stroke(); c.fillStyle = '#B3271F'; c.fillRect(sx + 56, sy + 262, 16, 16);
  // unlit paper lantern hanging from the beam
  c.strokeStyle = INKC; c.lineWidth = 3; c.beginPath(); c.moveTo(640, 0); c.lineTo(640, 360); c.stroke(); c.fillStyle = '#E8D6B0'; c.beginPath(); c.ellipse(640, 412, 38, 52, 0, 0, PI2); c.fill(); c.stroke(); c.strokeStyle = 'rgba(120,70,30,0.5)'; c.lineWidth = 2.2; for (const k of [-0.6, 0, 0.6]) { c.beginPath(); c.ellipse(640, 412, 38 * Math.abs(k) + 1, 52, 0, 0, PI2); c.stroke(); }
  c.fillStyle = '#2E2A2A'; c.fillRect(622, 358, 36, 9); c.fillRect(622, 458, 36, 9);
  // floor boards + tatami under the table
  const f = c.createLinearGradient(0, FL, 0, 1920); f.addColorStop(0, '#B08650'); f.addColorStop(1, '#8B6840'); c.fillStyle = f; c.fillRect(-300, FL, 1680, 700);
  c.strokeStyle = 'rgba(50,30,14,0.5)'; c.lineWidth = 3; for (let y = FL + 14; y < 1900; y += 116) { c.beginPath(); c.moveTo(-300, y); c.lineTo(1380, y); c.stroke(); }
  c.strokeStyle = 'rgba(70,44,20,0.26)'; c.lineWidth = 2; for (let r = 0; r < 5; r++) for (let k = 0; k < 12; k++) { const y = FL + 34 + r * 116 + (k * 37 % 70), x = (k * 233 + r * 97) % 1080; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 60, y + 4, x + 130, y - 2); c.stroke(); }
  c.fillStyle = 'rgba(40,28,16,0.2)'; c.fillRect(-300, FL, 1680, 10);
  c.fillStyle = '#C3AE6C'; c.beginPath(); c.roundRect(560, FL + 40, 640, 210, 8); c.fill(); c.strokeStyle = INKC; c.lineWidth = 4; c.stroke(); c.strokeStyle = 'rgba(80,62,24,0.42)'; c.lineWidth = 2.5; for (let x = 572; x < 1190; x += 18) { c.beginPath(); c.moveTo(x, FL + 44); c.lineTo(x, FL + 246); c.stroke(); }
  c.fillStyle = '#2E5C52'; c.fillRect(560, FL + 40, 640, 12); c.fillRect(560, FL + 238, 640, 12);
}
function pillar(c, bump) {
  const g = c.createLinearGradient(0, 0, PIL, 0); g.addColorStop(0, '#4A2E18'); g.addColorStop(0.7, WOODM); g.addColorStop(1, '#B98A55'); c.fillStyle = g; c.fillRect(-20, -20, PIL + 20, GND + 60);
  c.strokeStyle = INKC; c.lineWidth = 4; c.beginPath(); c.moveTo(PIL, -20); c.lineTo(PIL, GND + 40); c.stroke(); c.strokeStyle = 'rgba(40,24,10,0.45)'; c.lineWidth = 2.5;
  for (let k = 0; k < 9; k++) { const x = 10 + k * 9; c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + 8, 500, x - 6, 1000, x + 4, GND); c.stroke(); }
  c.fillStyle = BRZ; c.fillRect(-20, 700, PIL + 20, 16); c.fillRect(-20, 1100, PIL + 20, 16); c.strokeStyle = INKC; c.lineWidth = 3; c.strokeRect(-20, 700, PIL + 20, 16); c.strokeRect(-20, 1100, PIL + 20, 16);
  if (bump > 0.02) { c.strokeStyle = `rgba(255,255,255,${0.6 * bump})`; c.lineWidth = 4; c.lineCap = 'round'; for (let k = 0; k < 5; k++) { const y = 1230 + k * 26, l = 14 + 10 * (k % 2); c.beginPath(); c.moveTo(PIL + 16, y); c.lineTo(PIL + 16 + l, y + (k - 2) * 6); c.stroke(); } }
}
// ---------- table, mirror ----------
function table(c) {
  c.fillStyle = WOODD; for (const x of [TBL.x0 + 22, TBL.x1 - 36]) { c.fillRect(x, TBL.y + 16, 14, GND - TBL.y - 16); c.strokeStyle = INKC; c.lineWidth = 3.5; c.strokeRect(x, TBL.y + 16, 14, GND - TBL.y - 16); }
  c.fillStyle = WOODL; c.beginPath(); c.roundRect(TBL.x0, TBL.y, TBL.x1 - TBL.x0, 22, 7); c.fill(); c.strokeStyle = INKC; c.lineWidth = 4; c.stroke(); c.fillStyle = 'rgba(255,255,255,0.28)'; c.fillRect(TBL.x0 + 8, TBL.y + 4, TBL.x1 - TBL.x0 - 16, 4);
  // cushion for Mochi
  c.fillStyle = '#7C3A3A'; c.beginPath(); c.roundRect(TBL.x0 + 170, TBL.y - 16, 170, 18, 9); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(TBL.x0 + 164, TBL.y - 13, 138, 4);
}
function mirrorStand(c) {
  c.fillStyle = WOODD; c.beginPath(); c.roundRect(MX - 30, TBL.y - 14, 60, 14, 4); c.fill(); c.strokeStyle = INKC; c.lineWidth = 3.5; c.stroke();
  c.fillStyle = '#2E2A2A'; c.fillRect(MX - 6, MY + 4, 12, TBL.y - 14 - MY - 4); c.strokeRect(MX - 6, MY + 4, 12, TBL.y - 14 - MY - 4);
  c.fillStyle = BRZ; c.beginPath(); c.arc(MX, MY, 9, 0, PI2); c.fill(); c.stroke();
}
function mirrorPlate(c, t) {
  const E = mirrorEnds(t), n = E.n, th = 12; c.save(); c.lineJoin = 'round';
  const tv = [E.top[0] - MX, E.top[1] - MY], l = Math.hypot(tv[0], tv[1]), u = [tv[0] / l, tv[1] / l];
  const P = (a, b) => [MX + u[0] * a + n[0] * b, MY + u[1] * a + n[1] * b], h = MLEN / 2;
  // bronze body (back), silver face toward the light (n)
  c.fillStyle = BRZ; c.beginPath(); for (const [a, b] of [[-h, -th / 2], [h, -th / 2], [h + 2, th / 2 - 2], [-h - 2, th / 2 - 2]]) { const p = P(a, b); c.lineTo(p[0], p[1]); } c.closePath(); c.fill(); c.strokeStyle = INKC; c.lineWidth = 3.5; c.stroke();
  const f0 = P(-h + 2, th / 2 - 1), f1 = P(h - 2, th / 2 - 1), g = c.createLinearGradient(f0[0], f0[1], f1[0], f1[1]); g.addColorStop(0, '#DDEBF5'); g.addColorStop(0.5, '#FFFFFF'); g.addColorStop(1, '#BFD3E3');
  c.strokeStyle = g; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(f0[0], f0[1]); c.lineTo(f1[0], f1[1]); c.stroke();
  const gl = P(-h * 0.4, th / 2 + 3); c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 2.2; const gl2 = P(-h * 0.1, th / 2 + 3); c.beginPath(); c.moveTo(gl[0], gl[1]); c.lineTo(gl2[0], gl2[1]); c.stroke();
  c.restore(); return E;
}
// ---------- light: beams, motes, the dot ----------
function beamPoly(m, p0, p1, w0, w1, a, col) {
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  const g = m.createLinearGradient(p0[0], p0[1], p1[0], p1[1]); g.addColorStop(0, `rgba(${col},${a * 0.5})`); g.addColorStop(0.5, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},${a * 0.8})`);
  m.fillStyle = g; m.beginPath(); m.moveTo(p0[0] + nx * w0, p0[1] + ny * w0); m.lineTo(p1[0] + nx * w1, p1[1] + ny * w1); m.lineTo(p1[0] - nx * w1, p1[1] - ny * w1); m.lineTo(p0[0] - nx * w0, p0[1] - ny * w0); m.closePath(); m.fill();
}
function dotDraw(c, hit, a, onBody) {
  if (a < 0.02) return; c.save(); c.globalCompositeOperation = 'screen'; c.translate(hit.x, hit.y); if (!onBody) c.scale(1, 0.5);
  const g = c.createRadialGradient(0, 0, 2, 0, 0, 64); g.addColorStop(0, `rgba(255,255,240,${a})`); g.addColorStop(0.35, `rgba(255,238,170,${0.8 * a})`); g.addColorStop(1, 'rgba(255,220,130,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 64, 0, PI2); c.fill();
  c.fillStyle = `rgba(255,255,250,${a})`; c.beginPath(); c.arc(0, 0, 25, 0, PI2); c.fill(); c.strokeStyle = `rgba(255,250,210,${0.7 * a})`; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 36, 0, PI2); c.stroke(); c.restore();
}
// ---------- samurai ----------
function samPlan(t) {
  const xs = samXf(t), f = faceAt(t), lie = lieAt(t), [sq, sf] = spinSx(t), spinning = t >= T_SPIN0 && t < T_FALL - 0.25;
  let rot = 0, crouch = 0, face = f;
  for (const [ta, tl] of POUNCE) { if (t > ta && t < tl) rot += f * 0.3 * Math.sin(PI * (t - ta) / (tl - ta)); crouch = Math.max(crouch, wnd(ta - 0.12, ta + 0.02, t, 0.05), 0.8 * pulse(t, tl + 0.04, 0.07)); }
  const wg = WIG(t); rot += 0.13 * wg * Math.sin(t * 46); crouch = Math.max(crouch, 0.55 * wg);
  rot += 0.3 * Math.exp(-(t - T_BUMP) * 7) * Math.cos(14 * (t - T_BUMP)) * (t >= T_BUMP ? 1 : 0) + 0.08 * dizzy(t) * Math.sin(t * 5.5);
  rot += lie * 1.42 * 1;
  const fall = t >= T_FALL - 0.25 && t < T_FALL + 0.2 ? 0 : 0;
  const hop = hopAt(t) + (t > T_TOUCH && t < T_TOUCH + 0.4 ? 0 : 0), tremble = (wnd(T_CALM, T_PEEK + 0.2, t, 0.2) + wnd(T_ON2, T_TOUCH, t, 0.3) * 0.8 + wnd(1.2, 1.8, t, 0.2) * 0.5) * 1.5 * Math.sin(t * 55);
  const D2 = SAMS * 1.58, x = xs + D2 * Math.sin(rot) + tremble, y = GND - D2 * Math.cos(rot) - hop - 55 * lie * 0 + 0 + (crouch ? 8 * crouch : 0);
  const walking = t >= T_WALK && t < T_TURN - 0.3;
  if (spinning) face = sf;
  return { xs, x, y, rot, face, sx: spinning ? sq : 1 - 0.7 * turnPulse(t), sy: 1 - 0.1 * crouch, hop, lie, walking, tremble, spinning };
}
function samAt(t) {
  const P = samPlan(t), sweat = sweatS(t), pre = (1 - ss(1.2, 1.6, t)) * 0;
  const st = samState(0, { x: P.x, y: P.y, ground: P.y + SAMS * 1.58 * Math.cos(P.rot) + 0, S: SAMS, face: P.face, sx: P.sx, sy: P.sy, rot: P.rot, walk: P.walking ? (t - T_WALK) * 9 : null, band: { a: 1, wind: 0.2 + 0.25 * Math.min(1, Math.abs(P.hop) / 40) + 0.1 * Math.sin(t * 3) }, sweat: Math.min(1, sweat) });
  return { st, P };
}
function samHandsAt(S_, t) {
  const g = samGeom(S_.st, t), P = S_.P, sh = [g.X(-0.85, 0.5), g.X(0.85, 0.5)];
  const L = (a, b) => g.X(a, b);
  let back = [-1.36, 0.88], front = [1.36, 0.88];
  const lerp2 = (A, B, k) => [lerp(A[0], B[0], k), lerp(A[1], B[1], k)];
  let pa = 0; for (const [ta, tl] of POUNCE) pa = Math.max(pa, wnd(ta - 0.15, tl + 0.05, t, 0.1));
  back = lerp2(back, [-1.05, 0.35], pa); front = lerp2(front, [1.15, 0.05], pa);
  const calm = wnd(T_CALM, T_PEEK, t, 0.3) + wnd(T_SPIN0 - 0.3, T_SPIN0 + 0.1, t, 0.1) * 0 + wnd(0, 0.7, t, 0.2) * 0.8 + wnd(T_TURN, DUR, t, 0.25) * 0.8;
  back = lerp2(back, [-0.5, 0.78], clamp(calm)); front = lerp2(front, [0.5, 0.78], clamp(calm));
  const ch = wnd(T_CHEER, T_ON2 - 0.1, t, 0.2); back = lerp2(back, [-1.0, -0.1], ch);
  const ts = wnd(T_ON2, T_TOUCH, t, 0.2) * 0.8; back = lerp2(back, [-0.55, 0.8], ts); front = lerp2(front, [0.55, 0.8], ts);
  const flail = pulse(t, T_BUMP + 0.1, 0.25) + wnd(T_SPIN0, T_FALL, t, 0.2) * 0.9; const sw = Math.sin((t - T_SPIN0) * 13) * 0.3;
  back = lerp2(back, [-1.3, 0.3 + sw * 1.2], clamp(flail)); front = lerp2(front, [1.3, 0.3 - sw * 1.2], clamp(flail));
  const lieA = S_.P.lie; back = lerp2(back, [-1.3, 0.2], lieA); front = lerp2(front, [1.3, 0.25], lieA);
  const frust = wnd(T_SIT + 0.5, T_WALK, t, 0.2); front = lerp2(front, [0.7, 0.55], frust); back = lerp2(back, [-0.7, 0.55], frust);
  if (P.walking) { const w = Math.sin((t - T_WALK) * 9); back = [-1.2 + 0.08 * w, 0.8 + 0.1 * w]; front = [1.2 - 0.08 * w, 0.8 - 0.1 * w]; }
  const raw = [L(back[0], back[1]), L(front[0], front[1])], lim = 0.72 * SAMS, out = raw.map((h, i) => { const dx = h[0] - sh[i][0], dy = h[1] - sh[i][1], d = Math.hypot(dx, dy); return d > lim ? [sh[i][0] + dx * lim / d, sh[i][1] + dy * lim / d] : h; });
  window._raw = raw; window._sh = sh; window._hands = out; return out;
}
function samEyesAt(t, S_, hit, fish) {
  const P = S_.P, g = samGeom(S_.st, t), c0 = g.X(0.15, 0.26), mochiP = [930, 1180];
  let tg = [hit.x, hit.y];
  const ov = {}, set = (a, b, o) => { if (t >= a && t < b) Object.assign(ov, o); };
  set(0, 0.62, { closed: 1 }); set(0.62, 0.95, { wide: 0.7 });
  set(1.2, 1.55, { squeeze: 0.5 });
  for (const [ta, tl] of POUNCE) { set(tl, tl + 0.42, { wide: 0.95, sad: 0.25 }); set(ta - 0.15, ta, { angry: 0.3 }); }
  set(T_BUMP, T_CALM, { wide: 0.6, squeeze: 0.55 });
  set(T_CALM, T_PEEK, { closed: 1, squeeze: 0.7 });
  const peek = t >= T_PEEK && t < T_OFF1;
  set(T_OFF1, T_CHEER, { wide: 0.2 }); set(T_CHEER, T_ON2 - 0.2, { happy: 0.9 });
  set(T_ON2, T_TOUCH, { wide: 0.85 }); set(T_TOUCH, T_TOUCH + 0.25, { wide: 1 });
  set(T_SIT, T_WALK, { angry: 0.9, squeeze: 0.2 }); set(T_WALK, T_TURN - 0.3, { squeeze: 0.45 }); set(T_TURN - 0.3, DUR, { closed: 1 });
  if (t >= T_SPIN0 && t < T_FALL) { const a = t * 9; tg = [c0[0] + 80 * Math.cos(a), c0[1] + 60 * Math.sin(a)]; Object.assign(ov, { wide: 0.6, squeeze: 0.3 }); }
  if (t >= T_FALL - 0.25 && t < T_SIT) { Object.assign(ov, { closed: 1, squeeze: 0.9 }); }
  if (t >= T_SIT && t < T_WALK) tg = mochiP; if (t >= T_OFF1 && t < T_CHEER) tg = mochiP; if (t >= T_CHEER && t < T_ON2) tg = [c0[0] + 140 * P.face, c0[1] - 20];
  if (t >= T_WALK && t < T_TURN - 0.3) tg = [c0[0] - 140, c0[1]];
  const dx = tg[0] - c0[0], dy = tg[1] - c0[1], l = Math.hypot(dx, dy) || 1, look = [clamp(dx / l * 1.05 * P.face * 1, -1, 1) * (P.face > 0 ? 1 : 1), clamp(dy / l * 1.05, -1, 1)];
  const mk = (over) => Object.assign({ open: 0.9, wide: 0.2, sad: 0, look: [clamp(dx / l * 1.05, -1, 1), clamp(dy / l * 1.05, -1, 1)], closed: 0, squeeze: 0, happy: 0, angry: 0 }, ov, over || {});
  const E0 = mk(), E1 = mk(); if (peek) E0.closed = 1;
  return [E0, E1];
}
const sMouthAt = (t) => { let m = 0; for (const [ta] of POUNCE) m = Math.max(m, 0.7 * pulse(t, ta + 0.02, 0.1)); return Math.max(m, 0.9 * pulse(t, T_BUMP + 0.04, 0.2), 0.9 * wnd(T_TOUCH, T_TOUCH + 0.5, t, 0.1), 0.5 * wnd(T_SPIN0, T_FALL, t, 0.3) * (0.5 + 0.5 * Math.sin(t * 12)), 0.7 * wnd(T_FALL, T_FALL + 0.5, t, 0.1), 0.45 * wnd(T_FALL + 0.5, T_SIT, t, 0.2) * (0.5 + 0.5 * Math.sin(t * 9)), 0.5 * wnd(T_CHEER, T_ON2 - 0.2, t, 0.1)); };
// ---------- Mochi ----------
function mochiSt(t, E) {
  const sit = Math.max(0, 0), mx = 900, my = TBL.y - 8, ms = 2.05;
  const smug = Math.min(1, 1.2 * Math.max(...T_CAT_LAUGH.map((q) => pulse(t, q, 0.45)))), yawn = wnd(T_YAWN, T_YAWN + 0.9, t, 0.25), blink = pulse(t, 2.4, 0.06) + pulse(t, 6.9, 0.06) + pulse(t, 11.6, 0.06) + pulse(t, 17.4, 0.06) + pulse(t, 9.0, 0.06) + pulse(t, 13.2, 0.06);
  const shock = pulse(t, T_BUMP + 0.05, 0.25) + pulse(t, T_FALL, 0.3), look = [-0.95, 0.12 + (t > T_FALL ? 0.1 : 0)];
  const base = mochi(mx, my, ms, t, { look, wide: 0.1 + 0.6 * shock, tail: 0.3 + 0.25 * shock, tilt: 0.05 + 0.12 * smug, sleep: Math.min(1, 0.55 * smug + 0.95 * yawn + 0.9 * blink) });
  base.breath = 0.02 * Math.sin(t * 2 * PI / 6.4 * 3); base.tailPh = t * 2 * PI / 6.4 * 2; base.earTw = 0.05 * Math.sin(t * 2 * PI / 6.4 * 5) + 0.35 * shock * Math.sin(t * 20);
  base.mouth = { open: clamp(0.85 * yawn + 0.3 * wnd(T_FALL, T_FALL + 0.5, t, 0.1)) }; if (E) base.pose = mochiPose(E.swat);
  return base;
}
function mochiWithPaw(t) {
  const E = mirrorEnds(t), target = [(MX + (E.bot[0] - MX) * 0.45) - E.n[0] * 10, (MY + (E.bot[1] - MY) * 0.45) - E.n[1] * 10]; let best = 0, bd = 1e9;
  for (let k = 0; k <= 20; k++) { const sw = k / 20, st = mochiSt(t, { swat: sw }), G = catGeom(st, t), p = G.legs.FN.paw, d = Math.hypot(p[0] - target[0], p[1] - target[1]); if (d < bd) { bd = d; best = sw; } }
  const st = mochiSt(t, { swat: best }); window._pawErr = bd; window._paw = catGeom(st, t).legs.FN.paw; window._pawT = target; return st;
}
function mochiArm(c, t) {   // far arm: drawn BEHIND the body so the shoulder is hidden; tapered, with an elbow sag
  const E = mirrorEnds(t), fk = flickAt(t), C = [(MX + (E.bot[0] - MX) * 0.45) - E.n[0] * 9 + 10 * fk, (MY + (E.bot[1] - MY) * 0.45) - E.n[1] * 9 - 22 * fk], S0 = [884, TBL.y - 84];
  const mid = [(S0[0] + C[0]) / 2 + 6, (S0[1] + C[1]) / 2 + 20], Q = (u) => { const a = (1 - u) * (1 - u), b = 2 * u * (1 - u), d = u * u; return [a * S0[0] + b * mid[0] + d * C[0], a * S0[1] + b * mid[1] + d * C[1]]; };
  c.save(); c.lineCap = 'round'; const N = 14;
  for (const [col, dw] of [[INKC, 8], ['rgb(226,136,58)', 0]]) for (let k = 0; k < N; k++) { const p = Q(k / N), q = Q((k + 1.2) / N), w = lerp(30, 17, k / N) + dw; c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.stroke(); }
  c.strokeStyle = 'rgba(120,60,20,0.35)'; c.lineWidth = 3; for (const u of [0.35, 0.55, 0.75]) { const p = Q(u); c.beginPath(); c.moveTo(p[0] - 1, p[1] - 7); c.lineTo(p[0] + 3, p[1] + 5); c.stroke(); }
  c.fillStyle = '#F3D9B8'; c.strokeStyle = INKC; c.lineWidth = 3; c.beginPath(); c.arc(C[0] - 3, C[1], 13, 0, PI2); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(120,70,30,0.7)'; c.lineWidth = 2; for (const dy of [-5, 0, 5]) { c.beginPath(); c.moveTo(C[0] - 13, C[1] + dy); c.lineTo(C[0] - 6, C[1] + dy); c.stroke(); } c.restore();
}
function dotWithTrail(cx, t, hit, dv) { for (let k = 1; k <= 4; k++) { const tp = t - 0.025 * k, pp = dotPos(tp); if (Math.hypot(pp[0] - hit.x, pp[1] - hit.y) > 25) dotDraw(cx, { x: pp[0], y: pp[1] }, dv * (1 - k / 5) * 0.6, false); } dotDraw(cx, hit, dv, false); }
function beamLayer(c, t, dv, hit) {   // reflected beam is drawn UNDER the samurai, so he blocks it and the dot is hidden when it is behind him
  if (dv < 0.02) return; c.save(); c.globalCompositeOperation = 'screen'; beamPoly(c, [MX, MY], [hit.x, hit.y], 40, 24, 0.55 * dv, '255,238,175'); c.restore();
}
// ---------- render ----------
function renderFrame(T) {
  const t = ((T % DUR) + DUR) % DUR, S_ = samAt(t), sam = S_.st, hands = samHandsAt(S_, t), P = S_.P, mst = mochiWithPaw(t);
  const dv = dotVis(t), dxT = dotXf(t), hit = dotHit(t);
  const eyes = samEyesAt(t, S_, hit), g = samGeom(sam, t), mouthG = g.X(0.16, 0.74), bump = pulse(t, T_BUMP + 0.05, 0.25);
  composeFrame([540, 960, 1], { noHalo: true,
    pre: (cx) => { bgRoom(cx, t); pillar(cx, bump); paperShadow(cx, P.xs, GND + 10, 140, 0.5 * (1 - 0.5 * P.lie)); paperShadow(cx, 870, GND + 8, 230, 0.42); },
    ink: () => {},
    chars: (cx) => {
      table(cx); mirrorStand(cx); mirrorPlate(cx, t);
      mochiArm(cx, t);
      drawCat(cx, mst, t);
      beamLayer(cx, t, dv, hit);
      if (!hit.front) dotWithTrail(cx, t, hit, dv);
      samLegs(cx, sam, t); samInk(cx, sam, t, 0.5); samOver(cx, Object.assign({}, sam, { band: { a: 0 }, e: { a: 0 }, sweat: 0, a: 0.28 }), t); samBand(cx, sam, t); samEyes(cx, sam, t, eyes[0], eyes[1]);
      const mw = sMouthAt(t); if (mw > 0.08) { const m = mouthG, o = 0.3 + 0.9 * mw; cx.save(); cx.translate(m[0], m[1]); cx.fillStyle = '#F1E9D8'; cx.beginPath(); cx.ellipse(0, 0, SAMS * 0.1 * (0.6 + 0.4 * mw), SAMS * 0.1 * o, 0, 0, 7); cx.fill(); cx.fillStyle = '#7A1B15'; cx.beginPath(); cx.ellipse(0, SAMS * 0.02, SAMS * 0.07 * (0.6 + 0.4 * mw), SAMS * 0.07 * o, 0, 0, 7); cx.fill(); cx.restore(); }
      samArms(cx, sam, t, hands, 0.17);
      if (hit.front) dotWithTrail(cx, t, hit, dv);
      // stars while dizzy
      const dz = clamp(dizzy(t)), Hc = g.X(0.0, -1.2); if (dz > 0.05) for (let k = 0; k < 3; k++) { const a = t * 3.6 + k * 2.094; star(cx, Hc[0] + 62 * Math.cos(a), Hc[1] - 30 + 13 * Math.sin(a), 11, t * 2 + k, dz); }
      // impact dust at the pillar
      if (t > T_BUMP && t < T_BUMP + 0.4) dust(cx, PIL + 6, GND - 40, (t - T_BUMP) / 0.4, 0.7, 7);
      for (const [ta, tl, xl] of POUNCE) if (t > tl && t < tl + 0.35) dust(cx, xl, GND - 4, (t - tl) / 0.35, 0.5, 6);
    } });
  // ---- moonlit night grade, then beams (screen), motes, and the dot glow ----
  const m = mctx; m.save(); m.setTransform(1, 0, 0, 1, 0, 0);
  const gr = m.createRadialGradient(WIN[0], WIN[1], 60, WIN[0], WIN[1], 1500); gr.addColorStop(0, 'rgb(205,218,250)'); gr.addColorStop(0.5, 'rgb(130,148,200)'); gr.addColorStop(1, 'rgb(88,100,152)');
  m.globalCompositeOperation = 'multiply'; m.fillStyle = gr; m.fillRect(0, 0, 1080, 1920);
  m.globalCompositeOperation = 'screen';
  // incident beam (cool white) window -> mirror
  const w0 = [WIN[0] + 40, WIN[1] + 40], aIn = 0.17;
  beamPoly(m, w0, [MX, MY], 62, 38, aIn, '190,210,255');
  // reflected beam (warm) mirror -> hit
  if (dv > 0.02) { const e = mirrorEnds(t); 
    // dust motes drifting in both beams
    for (let k = 0; k < 34; k++) { const u = (hsh1(k * 3.7) + t * (0.03 + 0.05 * hsh1(k))) % 1, a = k < 12 ? [w0, [MX, MY]] : [[MX, MY], [hit.x, hit.y]], wob = 18 * (hsh1(k * 9.1) - 0.5) * 2, x = lerp(a[0][0], a[1][0], u) + wob + 5 * Math.sin(t * 1.3 + k), y = lerp(a[0][1], a[1][1], u) + 12 * Math.sin(t * 0.9 + k * 2), al = (k < 12 ? 0.5 : 0.7 * dv) * Math.sin(PI * u) * (0.6 + 0.4 * Math.sin(t * 2 + k)); m.fillStyle = `rgba(255,248,215,${al})`; m.beginPath(); m.arc(x, y, 1.2 + 1.2 * hsh1(k * 5.3), 0, PI2); m.fill(); }
    // soft pool of light around the dot, tinting the floor
    const gl = m.createRadialGradient(hit.x, hit.y, 10, hit.x, hit.y, 150); gl.addColorStop(0, `rgba(255,224,150,${0.3 * dv})`); gl.addColorStop(1, 'rgba(255,220,130,0)'); m.fillStyle = gl; m.fillRect(0, 0, 1080, 1920);
    // glint on the mirror
    const fl = flickAt(t), gx = MX - 22, gy = MY - 8, R = 16 + 34 * fl; m.fillStyle = `rgba(255,255,255,${dv * (0.7 + 0.3 * fl)})`; m.beginPath(); m.arc(gx, gy, 6 + 6 * fl, 0, PI2); m.fill(); m.strokeStyle = `rgba(255,255,255,${dv * (0.6 + 0.4 * fl)})`; m.lineWidth = 2.5 + 2 * fl; m.beginPath(); m.moveTo(gx - R, gy); m.lineTo(gx + R, gy); m.moveTo(gx, gy - R); m.lineTo(gx, gy + R); m.stroke(); m.moveTo(gx - R * 0.6, gy - R * 0.6); m.lineTo(gx + R * 0.6, gy + R * 0.6); m.moveTo(gx - R * 0.6, gy + R * 0.6); m.lineTo(gx + R * 0.6, gy - R * 0.6); m.stroke(); }
  m.globalCompositeOperation = 'source-over'; m.restore();
}
function initStory(canvas) { deepFreeze(P_SIT); initEngine(canvas); initCast(); }
// ---- pacing: the whole story (cues.js time) is played KSLOW times slower (owner: "too fast") -> output length = DUR * KSLOW ----
const KSLOW = 1.5, DUR_OUT = DUR * KSLOW;
const _renderFrameStory = renderFrame; renderFrame = function (T) { return _renderFrameStory(T / KSLOW); };
