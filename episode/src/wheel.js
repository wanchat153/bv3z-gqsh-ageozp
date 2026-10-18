'use strict';
// ================= cues.js — ONE source of truth for picture AND sound ("Dynamo wheel": Mochi runs a wheel that lights the samurai's lantern), 6.4 s seamless loop =================
// Pure functions of t. Wheel speed w(t) and lamp brightness L(t) come from a tiny simulation (torque - drag), run until it is periodic.
// Story: Mochi runs in a wheel -> the lantern is bright, the samurai draws. She tires -> the lantern dims. He dangles a dried fish on a rod -> she sprints, the lantern flares.
// She bites the fish and braces to eat -> the wheel stops, the lantern dies. He begs; she sighs and starts running again; the light returns; he picks up the brush.
const DUR = 6.4, PI = Math.PI;   // LOOP = 6.4 comes from core.js
const WX = 690, WY = 1130, RIN = 215, ROUT = 244, NSP = 8;          // wheel hub, inner (running) radius, outer radius, spokes
const SXC = 170, SYC = 1203, MS = 2.4;                              // samurai x / body-centre y, Mochi scale
const TB = { x0: 290, x1: 470, y: 1292 };                           // low table (top y)
const LAMP = [392, 930];                                            // lantern centre
const DYN = [786, 826];                                             // dynamo pulley centre (above the wheel)
const T_LURE = 3.15, T_SEE = 3.95, T_BITE = 4.85, T_BEG = 5.45, T_BACK = 5.95;
// ---- effort of the runner (0..1.4) ----
const U_KEYS = [[0, 1], [1.15, 1], [1.8, 0.3], [3.45, 0.3], [4.1, 1.35], [4.84, 1.35], [4.86, 0], [5.85, 0], [5.95, 2.4], [6.3, 1.1], [6.4, 1.0]];
const uAt = (t) => { if (t >= 4.84 && t < 5.9) return t < 4.86 ? 1.35 : 0; return clamp(ks1(U_KEYS, t), 0, 1.6); };
const brace = (t) => wnd(T_BITE, 5.5, t, 0.08);
const AW = 5.4, CW = 2.4, WMAX = 2.2;
const gL = (w) => Math.pow(clamp(w / WMAX, 0, 1.7), 1.25);
const SIM = (() => {
  const dt = 1 / 240, n = Math.round(DUR / dt); let w = 2, L = 1;
  const W = new Float32Array(n + 1), LL = new Float32Array(n + 1), TH = new Float32Array(n + 1), PH = new Float32Array(n + 1);
  for (let lp = 0; lp < 6; lp++) {
    let th = 0, ph = 0;
    for (let i = 0; i <= n; i++) {
      const t = Math.min(i * dt, DUR - 1e-6); W[i] = w; LL[i] = L; TH[i] = th; PH[i] = ph;
      const u = uAt(t), c = CW + 4.5 * brace(t); w += (AW * u - c * w) * dt; if (w < 0) w = 0;
      const g = gL(w); L += ((g - L) / (g > L ? 0.10 : 0.16)) * dt;
      th += w * dt; const run = 0.35 + 0.65 * ss(0.5, 1.2, w); ph += (w * RIN / (MS * 2) / (90 / 2.1)) * 2 * PI * run * dt;   // gait phase follows wheel speed (stride 90/2.1 local units)
    }
    if (lp === 5) { const P = 2 * PI / NSP, tot = th, dth = tot - Math.round(tot / P) * P, dph = ph - Math.round(ph / (2 * PI)) * 2 * PI; for (let i = 0; i <= n; i++) { TH[i] -= dth * i / n; PH[i] -= dph * i / n; } }
  }
  return { W, L: LL, TH, PH, n, dt };
})();
const sim = (a, t) => { const x = clamp(t, 0, DUR) / SIM.dt, i = Math.min(Math.floor(x), SIM.n - 1), f = x - i; return a[i] * (1 - f) + a[i + 1] * f; };
const wAt = (t) => sim(SIM.W, t), lampAt = (t) => sim(SIM.L, t), thAt = (t) => sim(SIM.TH, t), phAt = (t) => sim(SIM.PH, t);
const lampVis = (t) => { const L = lampAt(t), fl = (1 - clamp(L * 1.5)) * (0.5 + 0.5 * Math.sin(t * 53) * Math.sin(t * 17 + 1)); return clamp(L * (1 - 0.35 * fl), 0, 1.4); };
// ---- Mochi on the wheel floor: angle psi from the bottom (positive = forward = screen left) ----
const pulse = (t, t0, d = 0.06) => Math.exp(-(((t - t0) / d) ** 2));
function psiAt(t) {
  const w = wAt(t); let psi = 0.17 * clamp(w / WMAX, 0, 1.3) + 0.12 * pulse(t, T_BITE - 0.04, 0.07);
  const carry = ss(T_BITE, T_BITE + 0.2, t) * (1 - ss(T_BITE + 0.22, T_BITE + 0.75, t));   // braced, she is carried up the back of the wheel
  return lerp(psi, -0.8, carry) + 0.05 * pulse(t, 5.45, 0.12) - 0.04 * pulse(t, 5.6, 0.1);
}
// ---- samurai right hand (world) ----
const BRUSH = [SXC + 150, SYC + 70], RODB = [SXC + 158, SYC + 82], RODH = [SXC + 152, SYC + 4];
function handKeys() {
  const K = [];
  for (const m of [-1, 0, 1]) { const o = m * DUR; const a = (t, p) => K.push([o + t, p[0], p[1]]);
    a(0, BRUSH); a(2.9, BRUSH); a(3.2, RODB); a(3.35, RODB); a(3.85, RODH); a(4.82, [RODH[0], RODH[1] - 4]); a(5.0, RODB); a(5.2, [SXC + 100, SYC + 95]);
    a(5.5, [SXC + 112, SYC + 4]); a(5.75, [SXC + 104, SYC + 14]); a(5.95, [SXC + 112, SYC + 6]); a(6.2, BRUSH); a(6.4, BRUSH);
  }
  return K.sort((x, y) => x[0] - y[0]);
}
const HK = handKeys();
const handAt = (t) => { const h = KS(HK, t), k = 0.4 + 0.6 * clamp(lampAt(t) + 0.2), am = 13 * k * (t < 3 ? 1 - ss(2.6, 2.95, t) : ss(6.2, 6.4, t)), w = 2 * PI / DUR;
  return [h[0] + am * Math.sin(17 * w * t), h[1] + 0.23 * am * Math.sin(34 * w * t + 1)]; };
const rodHeld = (t) => t >= T_LURE + 0.05 && t < 5.0;     // rod in the hand
const brushHeld = (t) => t < 3.1 || t >= 6.1;
// ---- events for the sound track: [t, type, amp, x, opts] ----
const EVF = (() => {
  const E = [];
  for (let t = 0.12; t < T_LURE - 0.1; t += 0.21) E.push([t, 'brush', 0.35 * (0.3 + lampAt(t)), SXC + 230]);
  E.push([3.12, 'tap', 0.5, SXC + 200], [3.45, 'creak', 0.4, SXC + 300], [T_SEE - 0.1, 'mew', 0.55, WX]);
  E.push([T_BITE - 0.03, 'zap', 0.9, LAMP[0]], [T_BITE, 'chomp', 1.0, WX - 140], [T_BITE + 0.02, 'wheelstop', 0.9, WX]);
  for (let k = 0; k < 4; k++) E.push([5.1 + 0.2 * k, 'chew', 0.45, WX - 120]);
  E.push([4.93, 'gasp', 0.7, SXC], [5.0, 'tap', 0.6, SXC + 200]);
  E.push([5.3, 'lampoff', 0.9, LAMP[0]], [T_BEG, 'beg', 0.5, SXC], [5.75, 'sigh', 0.6, WX], [T_BACK, 'lampon', 0.7, LAMP[0]], [6.2, 'tap', 0.4, SXC + 200]);
  return E.sort((a, b) => a[0] - b[0]);
})();
// ================= scene.js — drawing; everything is a pure function of t (cues.js holds all motion) =================
const WOODL = '#D2A56A', WOODM = '#A9743F', WOODD = '#5E3B20', BRASS = '#D8B452', BRASSD = '#9C7A2C';
const hsh1 = (a) => { const x = Math.sin(a * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
// ---------- background: a night workshop (grading by the lantern is applied after the frame) ----------
function bgRoom(c, t) {
  const g = c.createLinearGradient(0, 0, 0, FL); g.addColorStop(0, '#CFE4D6'); g.addColorStop(1, '#A9CDB9'); c.fillStyle = g; c.fillRect(-300, -300, 1680, FL + 300);
  c.strokeStyle = 'rgba(60,92,80,0.35)'; c.lineWidth = 3; for (let x = -40; x < 1140; x += 96) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, FL); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,0.14)'; for (let x = -40; x < 1140; x += 192) c.fillRect(x + 6, 0, 14, FL);
  // round window with the night sky and a moon
  const wx = 870, wy = 520, wr = 120; c.fillStyle = '#243659'; c.beginPath(); c.arc(wx, wy, wr, 0, PI2); c.fill();
  c.fillStyle = '#F1E7B8'; c.beginPath(); c.arc(wx + 30, wy - 28, 30, 0, PI2); c.fill(); c.fillStyle = '#243659'; c.beginPath(); c.arc(wx + 42, wy - 34, 27, 0, PI2); c.fill();
  c.fillStyle = '#F6F2D8'; for (const [dx, dy, r] of [[-60, -50, 3], [-20, 40, 2.5], [50, 50, 3], [-70, 20, 2.5], [10, -80, 2.5]]) { c.beginPath(); c.arc(wx + dx, wy + dy, r, 0, PI2); c.fill(); }
  c.strokeStyle = WOODD; c.lineWidth = 12; c.beginPath(); c.arc(wx, wy, wr, 0, PI2); c.stroke(); c.lineWidth = 7; c.beginPath(); c.moveTo(wx - wr, wy); c.lineTo(wx + wr, wy); c.moveTo(wx, wy - wr); c.lineTo(wx, wy + wr); c.stroke();
  c.strokeStyle = INKC; c.lineWidth = 3.5; c.beginPath(); c.arc(wx, wy, wr + 6, 0, PI2); c.stroke();
  // floor boards
  const f = c.createLinearGradient(0, FL, 0, 1920); f.addColorStop(0, '#C2B08F'); f.addColorStop(1, '#A99673'); c.fillStyle = f; c.fillRect(-300, FL, 1680, 700);
  c.strokeStyle = 'rgba(70,56,38,0.45)'; c.lineWidth = 3; for (let y = FL + 10, r = 0; y < 1900; y += 130, r++) { c.beginPath(); c.moveTo(-300, y); c.lineTo(1380, y); c.stroke(); const off = r % 2 ? 90 : 0; for (let x = -300 + off; x < 1380; x += 180) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 130); c.stroke(); } }
  c.fillStyle = 'rgba(40,28,16,0.14)'; c.fillRect(-300, FL, 1680, 10);
}
// ---------- wheel + stand + dynamo ----------
const rotP = (c, x, y, a, fn) => { c.save(); c.translate(x, y); c.rotate(a); fn(); c.restore(); };
function wheelStandBack(c) {
  // back board (the axle is fixed to it) + bracket to the dynamo
  const g = c.createLinearGradient(WX - 24, 0, WX + 24, 0); g.addColorStop(0, WOODM); g.addColorStop(1, WOODD); c.fillStyle = g; c.fillRect(WX - 24, DYN[1] - 6, 48, FL - DYN[1] + 6); c.strokeStyle = INKC; c.lineWidth = 4; c.strokeRect(WX - 24, DYN[1] - 6, 48, FL - DYN[1] + 6);
  c.fillStyle = WOODM; c.fillRect(WX - 70, FL - 26, 140, 26); c.strokeRect(WX - 70, FL - 26, 140, 26);
  c.fillStyle = WOODM; c.fillRect(WX - 24, DYN[1] - 22, DYN[0] - WX + 70, 26); c.strokeRect(WX - 24, DYN[1] - 22, DYN[0] - WX + 70, 26);
}
function dynamo(c, t) {
  const w = wAt(t), th = thAt(t) * (28 / 15);
  c.fillStyle = BRASS; c.beginPath(); c.roundRect(DYN[0] - 10, DYN[1] - 70, 86, 48, 8); c.fill(); c.strokeStyle = INKC; c.lineWidth = 4; c.stroke();
  c.fillStyle = BRASSD; c.fillRect(DYN[0] - 2, DYN[1] - 62, 70, 8); c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(DYN[0] - 2, DYN[1] - 52, 60, 4);
  c.fillStyle = '#6E6E78'; c.beginPath(); c.arc(DYN[0] + 64, DYN[1] - 46, 6, 0, PI2); c.fill(); c.stroke();   // terminal
  rotP(c, DYN[0], DYN[1], -th, () => { c.fillStyle = '#8A8A94'; c.beginPath(); c.arc(0, 0, 15, 0, PI2); c.fill(); c.stroke(); c.strokeStyle = INKC; c.lineWidth = 3; c.beginPath(); c.moveTo(-15, 0); c.lineTo(15, 0); c.moveTo(0, -15); c.lineTo(0, 15); c.stroke(); });
}
function belt(c, t) {
  const R1 = 28, R2 = 15, dx = DYN[0] - WX, dy = DYN[1] - WY, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx), b = Math.acos((R1 - R2) / d);
  c.strokeStyle = '#3B2A1E'; c.lineWidth = 6; c.lineCap = 'round';
  for (const s of [1, -1]) { const q = a + s * b, p1 = [WX + R1 * Math.cos(q), WY + R1 * Math.sin(q)], p2 = [DYN[0] + R2 * Math.cos(q), DYN[1] + R2 * Math.sin(q)]; c.beginPath(); c.moveTo(p1[0], p1[1]); c.lineTo(p2[0], p2[1]); c.stroke(); }
  c.lineWidth = 2.5; c.strokeStyle = 'rgba(255,255,255,0.18)'; const th = thAt(t);   // moving stitches on the belt
  for (let k = 0; k < 7; k++) { const u = ((k / 7 + th * 0.16) % 1 + 1) % 1; for (const s of [1, -1]) { const q = a + s * b, P = [WX + R1 * Math.cos(q), WY + R1 * Math.sin(q)], Q = [DYN[0] + R2 * Math.cos(q), DYN[1] + R2 * Math.sin(q)], x = lerp(P[0], Q[0], (s > 0 ? u : 1 - u)), y = lerp(P[1], Q[1], (s > 0 ? u : 1 - u)); c.beginPath(); c.arc(x, y, 2.2, 0, PI2); c.stroke(); } }
}
function wheelBack(c, t) {
  const th = -thAt(t), ox = 16, oy = -9;
  c.save(); c.translate(WX + ox, WY + oy);
  c.strokeStyle = 'rgba(90,56,28,0.9)'; c.lineWidth = 6; for (let k = 0; k < NSP; k++) { const a = th + k * 2 * PI / NSP; c.beginPath(); c.moveTo(0, 0); c.lineTo(RIN * Math.cos(a), RIN * Math.sin(a)); c.stroke(); }
  c.fillStyle = WOODD; c.beginPath(); c.arc(0, 0, ROUT, 0, PI2); c.arc(0, 0, RIN - 4, 0, PI2, true); c.fill('evenodd'); c.strokeStyle = INKC; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, ROUT, 0, PI2); c.stroke();
  c.restore();
}
function wheelFront(c, t) {
  const th = -thAt(t);
  c.save(); c.translate(WX, WY);
  // track floor seen as a lit band just outside the running surface, then the front ring
  const rg = c.createRadialGradient(0, 0, RIN, 0, 0, ROUT); rg.addColorStop(0, '#C79A62'); rg.addColorStop(1, '#A9743F');
  c.fillStyle = rg; c.beginPath(); c.arc(0, 0, ROUT, 0, PI2); c.arc(0, 0, RIN, 0, PI2, true); c.fill('evenodd');
  c.strokeStyle = 'rgba(60,36,18,0.55)'; c.lineWidth = 3; for (let k = 0; k < 28; k++) { const a = th + k * 2 * PI / 28; c.beginPath(); c.moveTo(RIN * Math.cos(a), RIN * Math.sin(a)); c.lineTo(ROUT * Math.cos(a), ROUT * Math.sin(a)); c.stroke(); }
  c.strokeStyle = INKC; c.lineWidth = 4.5; c.beginPath(); c.arc(0, 0, ROUT, 0, PI2); c.stroke(); c.beginPath(); c.arc(0, 0, RIN, 0, PI2); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.22)'; c.beginPath(); c.arc(0, 0, ROUT - 8, 3.3, 4.1); c.arc(0, 0, ROUT - 22, 4.1, 3.3, true); c.fill();
  c.restore();
}
function wheelSpokes(c, t) {
  const th = -thAt(t); c.save(); c.translate(WX, WY);
  c.strokeStyle = WOODM; c.lineWidth = 9; for (let k = 0; k < NSP; k++) { const a = th + k * 2 * PI / NSP; c.beginPath(); c.moveTo(0, 0); c.lineTo((RIN - 2) * Math.cos(a), (RIN - 2) * Math.sin(a)); c.stroke(); }
  c.strokeStyle = INKC; c.lineWidth = 3; for (let k = 0; k < NSP; k++) { const a = th + k * 2 * PI / NSP; c.beginPath(); c.moveTo(0, 0); c.lineTo((RIN - 2) * Math.cos(a), (RIN - 2) * Math.sin(a)); c.stroke(); }
  c.restore();
}

function hubFront(c, t) {
  const th = -thAt(t); c.save(); c.translate(WX, WY); c.fillStyle = BRASS; c.beginPath(); c.arc(0, 0, 30, 0, PI2); c.fill(); c.strokeStyle = INKC; c.lineWidth = 4; c.stroke();
  c.rotate(th); c.fillStyle = BRASSD; for (let k = 0; k < 4; k++) { c.rotate(PI / 2); c.beginPath(); c.arc(17, 0, 4.5, 0, PI2); c.fill(); } c.fillStyle = INKC; c.beginPath(); c.arc(0, 0, 6, 0, PI2); c.fill(); c.restore();
}
// ---------- table, paper, brush, rod, fish ----------
function table(c) {
  c.fillStyle = WOODD; for (const x of [TB.x0 + 14, TB.x1 - 26]) { c.fillRect(x, TB.y + 16, 12, FL - TB.y - 16); c.strokeStyle = INKC; c.lineWidth = 3.5; c.strokeRect(x, TB.y + 16, 12, FL - TB.y - 16); }
  c.fillStyle = WOODL; c.beginPath(); c.roundRect(TB.x0, TB.y, TB.x1 - TB.x0, 18, 6); c.fill(); c.strokeStyle = INKC; c.lineWidth = 4; c.stroke(); c.fillStyle = 'rgba(255,255,255,0.28)'; c.fillRect(TB.x0 + 6, TB.y + 3, TB.x1 - TB.x0 - 12, 4);
  // paper with a little ink picture
  c.fillStyle = '#F6EEDD'; c.beginPath(); c.moveTo(TB.x0 + 40, TB.y); c.lineTo(TB.x1 - 30, TB.y); c.lineTo(TB.x1 - 38, TB.y - 9); c.lineTo(TB.x0 + 50, TB.y - 9); c.closePath(); c.fill(); c.strokeStyle = INKC; c.lineWidth = 2.5; c.stroke();
  c.strokeStyle = '#2A2A33'; c.lineWidth = 3.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(TB.x0 + 70, TB.y - 4); c.quadraticCurveTo(TB.x0 + 90, TB.y - 8, TB.x0 + 108, TB.y - 4); c.stroke();
}
function brushDraw(c, held, hand) {
  const g = held ? hand : [SXC + 178, TB.y - 5], d = held ? [1, 0.82] : [1, 0.06], n = Math.hypot(d[0], d[1]), u = [d[0] / n, d[1] / n];
  c.save(); c.lineCap = 'round'; c.strokeStyle = INKC; c.lineWidth = 9; c.beginPath(); c.moveTo(g[0] - u[0] * 52, g[1] - u[1] * 52); c.lineTo(g[0] + u[0] * 14, g[1] + u[1] * 14); c.stroke();
  c.strokeStyle = '#C9A15C'; c.lineWidth = 5; c.beginPath(); c.moveTo(g[0] - u[0] * 52, g[1] - u[1] * 52); c.lineTo(g[0] + u[0] * 14, g[1] + u[1] * 14); c.stroke();
  c.strokeStyle = '#1B1B22'; c.lineWidth = 9; c.beginPath(); c.moveTo(g[0] + u[0] * 14, g[1] + u[1] * 14); c.lineTo(g[0] + u[0] * 30, g[1] + u[1] * 30); c.stroke(); c.restore();
}
const ROD_L = 185, A_HELD = -0.3;
function rodState(t) {
  const held = rodHeld(t), hand = handAt(t);
  const butt = held ? [hand[0] + 2 * Math.sin(t * 40) * ss(3.9, 4.2, t), hand[1]] : [SXC + 160, TB.y - 5];
  const A = ks1([[3.2, 0], [3.9, A_HELD], [4.84, A_HELD], [5.0, 0.12], [5.05, 0]], t) + (held ? 0.02 * Math.sin(t * 30) * ss(4.0, 4.4, t) : 0);
  const tip = [butt[0] + ROD_L * Math.cos(A), butt[1] + ROD_L * Math.sin(A)];
  return { butt, tip, A };
}
function rodDraw(c, R) {
  c.save(); c.lineCap = 'round'; c.strokeStyle = INKC; c.lineWidth = 10; c.beginPath(); c.moveTo(R.butt[0] - 16 * Math.cos(R.A), R.butt[1] - 16 * Math.sin(R.A)); c.lineTo(R.tip[0], R.tip[1]); c.stroke();
  c.strokeStyle = '#C9A15C'; c.lineWidth = 6; c.beginPath(); c.moveTo(R.butt[0] - 16 * Math.cos(R.A), R.butt[1] - 16 * Math.sin(R.A)); c.lineTo(R.tip[0], R.tip[1]); c.stroke(); c.restore();
}
function fishDraw(c, x, y, rot, s, a = 1) {
  if (s <= 0.02) return; c.save(); c.globalAlpha = a; c.translate(x, y); c.rotate(rot); c.scale(s, s);
  c.fillStyle = '#E0B070'; c.beginPath(); c.ellipse(0, 0, 32, 12, 0, 0, PI2); c.fill(); c.strokeStyle = INKC; c.lineWidth = 3.5; c.stroke();
  c.fillStyle = '#C98F4B'; c.beginPath(); c.moveTo(-28, 0); c.lineTo(-52, -14); c.lineTo(-52, 14); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(110,60,20,0.6)'; c.lineWidth = 2; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(k * 9, -9); c.lineTo(k * 9 + 3, 9); c.stroke(); }
  c.fillStyle = INKC; c.beginPath(); c.arc(20, -3, 2.8, 0, PI2); c.fill(); c.restore();
}
// ---------- samurai ----------
const samPulse = pulse;
function samAt(t) {
  const lamp = lampAt(t), cheer = wnd(4.1, 4.85, t, 0.15), shock = pulse(t, T_BITE + 0.1, 0.12), bow = wnd(T_BEG, 5.85, t, 0.15);
  const draw = (t < 3.05 ? 1 - ss(2.6, 3.0, t) : ss(6.05, 6.35, t));
  const hop = arc(t, 4.2, 14, 0.3) + arc(t, 4.52, 10, 0.3) + 14 * shock;
  const rot = (0.045 + 0.09 * (1 - clamp(lamp))) * draw + 0.03 * Math.sin(t * 5) * cheer - 0.1 * shock + 0.06 * bow * Math.sin(t * 9) + 0.04 * bow;
  const D2 = SAMS * 1.58, y = FL - D2 * Math.cos(rot) - hop, x = SXC + D2 * Math.sin(rot);
  const sweat = Math.max(0.35 * wnd(2.3, 3.2, t, 0.4), 0.5 * shock);
  return { st: samState(0, { x, y, ground: y + D2 * Math.cos(rot), S: SAMS, face: 1, sx: 1, sy: 1, rot, walk: null, band: { a: 1, wind: 0.18 + 0.1 * Math.sin(t * 3) }, sweat }), cheer, shock, bow };
}
function samHands(S_, t) {
  const g = samGeom(S_.st, t), sh = [g.X(-0.85, 0.5), g.X(0.85, 0.5)], hr = handAt(t);
  const rest = g.X(-1.36, 0.88), up = [g.X(-1.12, 0.1)[0], SYC - 18], ch = S_.cheer, plead = g.X(-0.7, 0.2);
  let L = [lerp(rest[0], up[0], ch), lerp(rest[1], up[1], ch)]; const b = S_.bow; L = [lerp(L[0], plead[0], b), lerp(L[1], plead[1], b)];
  const raw = [L, hr.slice()], lim = 0.72 * SAMS, out = raw.map((h, i) => { const dx = h[0] - sh[i][0], dy = h[1] - sh[i][1], d = Math.hypot(dx, dy); return d > lim ? [sh[i][0] + dx * lim / d, sh[i][1] + dy * lim / d] : h; });
  window._raw = raw; window._sh = sh; window._hands = out; return out;
}
function samEyesAt(t, S_, fish) {
  const st = S_.st, g = samGeom(st, t), P = [g.X(-0.46, 0.26), g.X(0.16, 0.26)], lamp = lampAt(t);
  let tg = [SXC + 300, TB.y - 4];
  if (t >= 3.05 && t < T_SEE) tg = [WX - 150, 1230]; if (t >= T_SEE && t < T_BITE) tg = fish; if (t >= T_BITE && t < T_BITE + 0.2) tg = [WX - 140, 1230];
  if (t >= T_BITE + 0.2 && t < T_BEG) tg = [LAMP[0], LAMP[1]]; if (t >= T_BEG && t < 6.0) tg = [WX - 120, 1260]; if (t >= 6.0 && t < 6.25) tg = [WX - 150, 1230];
  const ov = {}, set = (a, b, o) => { if (t >= a && t < b) Object.assign(ov, o); };
  const dimsq = clamp((0.7 - lamp) / 0.5); set(0, 3.05, { squeeze: 0.6 * dimsq }); set(6.1, 6.4, { squeeze: 0.6 * dimsq });
  set(4.1, T_BITE, { happy: 0.9, wide: 0.3 }); set(T_BITE, T_BEG, { wide: 1, open: 1 }); set(T_BEG, 5.95, { sad: 0.8, open: 1 });
  return P.map((p) => { const dx = tg[0] - p[0], dy = tg[1] - p[1], l = Math.hypot(dx, dy) || 1; return Object.assign({ open: 0.9, wide: 0.2, sad: 0, look: [clamp(dx / l * 1.05, -1, 1), clamp(dy / l * 1.05, -1, 1)], closed: 0, squeeze: 0, happy: 0, angry: 0 }, ov); });
}
const sMouthAt = (t) => Math.max(0.9 * wnd(T_BITE + 0.05, T_BEG - 0.1, t, 0.1), 0.35 * wnd(T_BEG, 5.9, t, 0.15), 0.6 * wnd(4.15, 4.8, t, 0.12));
// ---------- Mochi in the wheel ----------
function mixPose(A, B, k) {
  const P = clonePose(A), m = (a, b) => a.map((v, i) => v + (b[i] - v) * k); P.b = m(A.b, B.b); P.h = m(A.h, B.h); P.tl = m(A.tl, B.tl); P.ear = m(A.ear, B.ear);
  for (const L of ['FN', 'FF', 'HN', 'HF']) P.L[L] = m(A.L[L], B.L[L]); return P;
}
function mochiRun(t) {
  const w = wAt(t), psi = psiAt(t), kr = ss(0.35, 1.5, w), ph = phAt(t), carried = ss(T_BITE, T_BITE + 0.2, t) * (1 - ss(T_BITE + 0.22, T_BITE + 0.75, t));
  const x = WX - RIN * Math.sin(psi), y = WY + RIN * Math.cos(psi);
  const tired = clamp((0.9 - w) / 0.6) * (1 - ss(T_SEE - 0.1, T_SEE + 0.1, t)) , spr = ss(T_SEE, T_SEE + 0.25, t) * (1 - ss(T_BITE, T_BITE + 0.05, t));
  let P = mixPose(P_STAND, P_RUN, kr); P.h = [P.h[0], P.h[1] + 7 * tired, P.h[2], P.h[3]];
  const amp = lerp(8, 20, kr), lift = lerp(4, 14, kr); P = walkPose(P, ph, amp * (1 - carried * 0.8), lift * (1 - carried * 0.8));
  const bite = wnd(T_BITE - 0.08, T_BITE + 0.04, t, 0.03), chew = wnd(5.0, 5.85, t, 0.1) * (0.5 + 0.5 * Math.sin((t - 5.0) * 26));
  const look = t >= T_SEE - 0.15 && t < T_BITE ? [-1, -0.05] : [-0.7, 0.2 - 0.3 * tired];
  const st = { mouth: { open: clamp(0.5 * tired + 0.95 * bite + 0.45 * Math.max(0, chew) * ss(T_BITE + 0.1, T_BITE + 0.2, t)) }, face: -1, kind: 'kit', col: ORG.k1, sd: 3, rot: -psi + 0.05 * carried, x, y, s: MS, pose: P,
    e: { sleep: 0, open: t >= T_BITE + 0.08 && t < 5.9 ? 0.18 : 1 - 0.5 * tired, wide: 0.15 + 0.6 * spr, look, dil: 0.5 + 0.4 * spr, sparkle: 1 }, breath: 0.02 * Math.sin(t * 7 + 1) * (1 + 2 * tired), tailWig: 0.12 + 0.5 * spr, tailPh: t * 5, earTw: 0.05 * Math.sin(t * 5),
    blush: 0.5, hTilt: 0.05 - 0.12 * tired, mode: 'walk' };
  return st;
}
// ---------- render ----------
function renderFrame(T) {
  const t = ((T % LOOP) + LOOP) % LOOP, S_ = samAt(t), sam = S_.st, hands = samHands(S_, t), R = rodState(t), mst = mochiRun(t), G = catGeom(mst, t), mouthP = G.HX(34, 5);
  // fish position
  let fish, fr = 0, fs = 1, fa = 1;
  const lure = clamp(ss(3.3, 3.75, t)), pend = (() => { const dt = 0.02, a = rodState(t - dt).tip, b = rodState(t + dt).tip, vx = (b[0] - a[0]) / (2 * dt); const be = clamp(-vx / 900, -0.5, 0.5) + 0.07 * Math.sin(t * 6.5) * (1 - 0.6 * ss(3.9, 4.3, t)); return [R.tip[0] + 58 * Math.sin(be), R.tip[1] + 58 * Math.cos(be), be]; })();
  const restF = [TB.x0 + 150, TB.y - 9];
  if (t < T_BITE) { fish = [lerp(restF[0], pend[0], lure), lerp(restF[1], pend[1], lure)]; fr = lerp(0.12, -pend[2] * 0.6 + 1.45, lure * 0.0 + (t > 3.7 ? 1 : 0) * 0); fr = lerp(0.1, -1.5707 + pend[2] * 0.3, lure); }
  else if (t < 5.85) { fish = [mouthP[0] - 22, mouthP[1] + 8]; fr = 0.1 * Math.sin(t * 20); fs = 1 - 0.7 * ss(5.0, 5.8, t); }
  else { fish = restF; fr = 0.1; fs = ss(5.45, 5.7, t) > 0 ? 1 : 0; fa = ss(5.45, 5.75, t); }
  if (t >= 5.85 || (t < 3.3 && t >= 0)) { fish = restF; fr = 0.1; fs = 1; fa = t < 3.3 ? 1 : ss(5.45, 5.75, t); }
  if (t >= 5.85) fa = 1;
  const eyes = samEyesAt(t, S_, fish), g = samGeom(sam, t), mouthG = g.X(0.16, 0.74), L = lampVis(t);
  composeFrame([540, 960, 1], { noHalo: true,
    pre: (cx) => { bgRoom(cx, t); paperShadow(cx, SXC, FL + 8, 150, 0.5); paperShadow(cx, WX, FL + 6, 250, 0.4); paperShadow(cx, (TB.x0 + TB.x1) / 2, FL + 4, 100, 0.4); },
    ink: () => {},
    chars: (cx) => {
      wheelStandBack(cx); wheelBack(cx, t); dynamo(cx, t);
      cx.strokeStyle = 'rgba(30,20,12,0.9)'; cx.lineWidth = 4; cx.beginPath(); cx.moveTo(DYN[0] - 10, DYN[1] - 52); cx.quadraticCurveTo((DYN[0] + LAMP[0]) / 2, Math.max(DYN[1], LAMP[1]) - 140 + 40, LAMP[0], LAMP[1] - 60); cx.stroke();
      wheelSpokes(cx, t); drawCat(cx, mst, t);
      wheelFront(cx, t); belt(cx, t); hubFront(cx, t);
      table(cx);
      if (!brushHeld(t)) brushDraw(cx, false); if (!rodHeld(t) || true) { }
      rodDraw(cx, R);
      if (t < T_BITE || t >= 5.85) { cx.save(); cx.strokeStyle = 'rgba(40,28,18,0.9)'; cx.lineWidth = 2.5; cx.globalAlpha = fa; cx.beginPath(); cx.moveTo(R.tip[0], R.tip[1]); if (lure < 0.5) cx.quadraticCurveTo((R.tip[0] + fish[0]) / 2, Math.max(R.tip[1], fish[1]) + 6, fish[0] + 30, fish[1]); else cx.lineTo(fish[0], fish[1] - 12); cx.stroke(); cx.restore(); }
      else if (t < T_BITE + 0.4) { cx.save(); cx.strokeStyle = 'rgba(40,28,18,0.9)'; cx.lineWidth = 2.5; cx.beginPath(); cx.moveTo(R.tip[0], R.tip[1]); cx.lineTo(R.tip[0] + 6, R.tip[1] + 26 * Math.min(1, (t - T_BITE) / 0.1)); cx.stroke(); cx.restore(); }
      samLegs(cx, sam, t); samInk(cx, sam, t, 0.5); samOver(cx, Object.assign({}, sam, { band: { a: 0 }, e: { a: 0 }, sweat: 0, a: 0.28 }), t); samBand(cx, sam, t); samEyes(cx, sam, t, eyes[0], eyes[1]);
      const mw = sMouthAt(t); if (mw > 0.08) { const m = mouthG, o = 0.3 + 0.9 * mw; cx.save(); cx.translate(m[0], m[1]); cx.fillStyle = '#F1E9D8'; cx.beginPath(); cx.ellipse(0, 0, SAMS * 0.1 * (0.6 + 0.4 * mw), SAMS * 0.1 * o, 0, 0, 7); cx.fill(); cx.fillStyle = '#7A1B15'; cx.beginPath(); cx.ellipse(0, SAMS * 0.02, SAMS * 0.07 * (0.6 + 0.4 * mw), SAMS * 0.07 * o, 0, 0, 7); cx.fill(); cx.restore(); }
      samArms(cx, sam, t, hands, 0.17);
      if (brushHeld(t)) brushDraw(cx, true, hands[1]);
      if (t < 5.85 && (t < 3.3 || t >= T_BITE || true)) fishDraw(cx, fish[0], fish[1], fr, fs * 1.25, fa); else fishDraw(cx, fish[0], fish[1], fr, fs * 1.25, fa);
      if (t >= 5.85) { }
    } });
  // ---- lantern light: grade the whole frame (multiply), then draw the lantern itself + glow ----
  const m = mctx; m.save(); m.setTransform(1, 0, 0, 1, 0, 0);
  const Lc = clamp(L), rad = 340 + 560 * Lc, ci = [lerp(88, 255, Lc), lerp(92, 246, Lc), lerp(126, 226, Lc)], co = [lerp(52, 234, Lc), lerp(62, 236, Lc), lerp(108, 240, Lc)], cm = ci.map((v, i) => lerp(v, co[i], 0.55));
  const gr = m.createRadialGradient(LAMP[0], LAMP[1], 30, LAMP[0], LAMP[1], rad); gr.addColorStop(0, `rgb(${ci.map(Math.round)})`); gr.addColorStop(0.45, `rgb(${cm.map(Math.round)})`); gr.addColorStop(1, `rgb(${co.map(Math.round)})`);
  m.globalCompositeOperation = 'multiply'; m.fillStyle = gr; m.fillRect(0, 0, 1080, 1920);
  m.globalCompositeOperation = 'screen'; const gl = m.createRadialGradient(LAMP[0], LAMP[1], 10, LAMP[0], LAMP[1], 70 + 330 * L); gl.addColorStop(0, `rgba(255,214,130,${0.55 * clamp(L)})`); gl.addColorStop(1, 'rgba(255,200,110,0)'); m.fillStyle = gl; m.fillRect(0, 0, 1080, 1920);
  m.globalCompositeOperation = 'source-over';
  // lantern body (emissive)
  m.translate(LAMP[0], LAMP[1]); m.strokeStyle = INKC; m.lineWidth = 3.5; m.beginPath(); m.moveTo(0, -60); m.lineTo(0, -66); m.stroke();
  const lg = m.createRadialGradient(0, 0, 4, 0, 0, 62); const cin = [lerp(120, 255, Lc), lerp(80, 240, Lc), lerp(60, 190, Lc)], cout = [lerp(86, 238, Lc), lerp(52, 160, Lc), lerp(40, 70, Lc)];
  lg.addColorStop(0, `rgb(${cin.map(Math.round)})`); lg.addColorStop(1, `rgb(${cout.map(Math.round)})`); m.fillStyle = lg; m.beginPath(); m.ellipse(0, 0, 46, 58, 0, 0, PI2); m.fill(); m.stroke();
  m.strokeStyle = `rgba(120,60,20,${0.5 + 0.2 * Lc})`; m.lineWidth = 2.5; for (const k of [-0.62, 0, 0.62]) { m.beginPath(); m.ellipse(0, 0, 46 * Math.abs(k) + 1, 58, 0, 0, PI2); m.stroke(); } for (const yy of [-16, 16]) { m.beginPath(); m.ellipse(0, yy * 2.1, 40 * Math.sqrt(1 - (yy * 2.1 / 58) ** 2), 4, 0, 0, PI2); m.stroke(); }
  m.fillStyle = '#2E2A2A'; m.fillRect(-18, -62, 36, 9); m.fillRect(-18, 54, 36, 9); m.strokeStyle = INKC; m.lineWidth = 3; m.strokeRect(-18, -62, 36, 9); m.strokeRect(-18, 54, 36, 9);
  m.restore();
  // sparks at the dynamo when the lamp is overdriven
  if (L > 1.05) { m.save(); m.strokeStyle = '#FFE9A0'; m.lineWidth = 3; m.lineCap = 'round'; const q = Math.floor(t * 18); for (let k = 0; k < 7; k++) { const a = hsh1(q * 7 + k) * PI2, r0 = 24 + 20 * hsh1(q + k * 3), r1 = r0 + 12 + 14 * hsh1(q * 3 + k); m.beginPath(); m.moveTo(DYN[0] + 66 + r0 * Math.cos(a), DYN[1] - 46 + r0 * Math.sin(a)); m.lineTo(DYN[0] + 66 + r1 * Math.cos(a), DYN[1] - 46 + r1 * Math.sin(a)); m.stroke(); } m.restore(); }
}
function initStory(canvas) { deepFreeze(P_SIT); initEngine(canvas); initCast(); }
