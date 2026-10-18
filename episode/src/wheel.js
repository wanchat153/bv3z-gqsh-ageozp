'use strict';
// ================= cues.js — ONE source of truth for picture AND sound ("Dynamo wheel"), 19.2 s seamless loop =================
// Pure functions of t. Wheel speed w(t) and lamp brightness L(t) come from a small simulation (torque - drag, lamp lag) run until it is periodic.
// Story: Mochi runs a wheel that lights the samurai's lantern; he paints her portrait stroke by stroke, only while the lamp is bright.
// She tires (sweat, panting, slowing, the lamp flickers), trips, is carried up the back of the wheel, tumbles down and slumps. The lamp dies, the half-finished portrait stays.
// He puts the brush down, takes the fishing rod, dangles a dried fish: she rises, sprints, the lamp flares. She bites the fish, braces to eat -> the wheel stops, the lamp dies again.
// He begs, she sighs and runs, the light returns, he swaps in a blank canvas and lifts the brush: the loop restarts.
const DUR = 19.2, PI = Math.PI;   // 3 x LOOP (core.js LOOP = 6.4), so every periodic helper still closes
const WX = 745, WY = 1130, RIN = 215, ROUT = 244, NSP = 8;          // wheel hub, running radius, outer radius, spokes
const SXC = 215, SYC = 1203, MS = 2.1;                              // samurai x / body-centre y, Mochi scale
const TB = { x0: 322, x1: 500, y: 1292 };                           // low table (top y)
const CV = { x: 352, y: 1182, w: 90, h: 94 }, PS = 0.8;
const cvPt = (p) => [CV.x + 4 + p[0] * PS, CV.y + 3 + (p[1] - 12) * PS];                     // easel card with the portrait
const LAMP = [392, 925], DYN = [841, 826];
const T_DIM = 3.2, T_STUM = 6.3, T_LAND = 7.5, T_DROP = 8.2, T_LURE = 8.8, T_FISH = 9.9, T_SMELL = 10.5, T_RISE = 10.9, T_SPR = 11.5, T_BITE = 14.0, T_BRACE = 14.8, T_BEG = 15.5, T_SWAP = 16.3, T_BACK = 17.0, T_PAINT = 18.5;
// ---- effort of the runner (0..1.5) ----
const U_KEYS = [[0, 1], [T_DIM, 1], [4.7, 0.34], [T_STUM - 0.1, 0.3], [T_STUM, 0], [10.95, 0], [11.15, 0.45], [11.9, 1.4], [T_BITE - 0.02, 1.4], [T_BITE, 0], [T_BACK, 0], [T_BACK + 0.15, 2.4], [T_BACK + 0.9, 1.1], [19.2, 1.0]];
const uAt = (t) => { if (t >= T_BITE - 0.02 && t < T_BACK) return t < T_BITE ? 1.4 : 0; return clamp(ks1(U_KEYS, t), 0, 1.6); };
const brace = (t) => wnd(T_BITE, T_BRACE, t, 0.08), stumDrag = (t) => wnd(T_STUM, T_STUM + 0.8, t, 0.1);
const AW = 5.4, CW = 2.4, WMAX = 2.2;
const gL = (w) => Math.pow(clamp(w / WMAX, 0, 1.7), 1.25);
const STRIDE = 90 / 2.1;
const SIM = (() => {
  const dt = 1 / 240, n = Math.round(DUR / dt); let w = 2, L = 1;
  const W = new Float32Array(n + 1), LL = new Float32Array(n + 1), TH = new Float32Array(n + 1), PH = new Float32Array(n + 1);
  for (let lp = 0; lp < 6; lp++) {
    let th = 0, ph = 0;
    for (let i = 0; i <= n; i++) {
      const t = Math.min(i * dt, DUR - 1e-6); W[i] = w; LL[i] = L; TH[i] = th; PH[i] = ph;
      const u = uAt(t), c = CW + 4.5 * brace(t) + 3 * stumDrag(t); w += (AW * u - c * w) * dt; if (w < 0) w = 0;
      const g = gL(w); L += ((g - L) / (g > L ? 0.10 : 0.16)) * dt;
      th += w * dt; const run = 0.3 + 0.7 * ss(0.4, 1.1, w); ph += ((w * RIN / MS) / STRIDE) * 2 * PI * run * dt;   // gait phase follows the wheel surface speed (stride 90/2.1 local units)
    }
    if (lp === 5) { const P = 2 * PI / NSP, tot = th, dth = tot - Math.round(tot / P) * P, dph = ph - Math.round(ph / (2 * PI)) * 2 * PI; for (let i = 0; i <= n; i++) { TH[i] -= dth * i / n; PH[i] -= dph * i / n; } }
  }
  return { W, L: LL, TH, PH, n, dt };
})();
const sim = (a, t) => { const x = clamp(t, 0, DUR) / SIM.dt, i = Math.min(Math.floor(x), SIM.n - 1), f = x - i; return a[i] * (1 - f) + a[i + 1] * f; };
const wAt = (t) => sim(SIM.W, t), lampAt = (t) => sim(SIM.L, t), thAt = (t) => sim(SIM.TH, t), phAt = (t) => sim(SIM.PH, t);
const hsh1 = (a) => { const x = Math.sin(a * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
const lampVis = (t) => { const L = lampAt(t), fl = (1 - clamp(L * 1.5)) * (0.5 + 0.5 * Math.sin(t * 53) * Math.sin(t * 17 + 1)); return clamp(L * (1 - 0.35 * fl), 0, 1.4); };
const pulse = (t, t0, d = 0.06) => Math.exp(-(((t - t0) / d) ** 2));
// ---- Mochi on the wheel floor: angle psi from the bottom (positive = forward = screen left) ----
function evPsi(t, t0, A, rise, k, Om) { const d = t - t0; if (d < 0) return 0; return d < rise ? A * ss(0, rise, d) : A * Math.exp(-k * (d - rise)) * Math.cos(Om * (d - rise)); }
const TRIP = { t0: T_STUM, A: -1.1, rise: 0.5, k: 1.15, Om: 3.3 }, BITEK = { t0: T_BITE, A: -0.85, rise: 0.2, k: 1.7, Om: 3.8 };
function psiAt(t) {
  const w = wAt(t), base = 0.17 * clamp(w / WMAX, 0, 1.3) + 0.12 * pulse(t, T_BITE - 0.04, 0.07);
  return base + evPsi(t, TRIP.t0, TRIP.A, TRIP.rise, TRIP.k, TRIP.Om) + evPsi(t, BITEK.t0, BITEK.A, BITEK.rise, BITEK.k, BITEK.Om) + 0.05 * pulse(t, T_BEG, 0.12) - 0.04 * pulse(t, T_BEG + 0.15, 0.1);
}
const TUMB0 = T_STUM + TRIP.rise + 0.05, TUMB1 = TUMB0 + 0.75;           // the tumble down the back of the wheel (one full flip)
const rollAt = (t) => -2 * PI * ss(TUMB0, TUMB1, t);
const slumpAt = (t) => Math.max(ss(TUMB1 - 0.1, TUMB1 + 0.25, t) * (1 - ss(T_SMELL, T_RISE, t)), ss(T_BITE + 0.9, T_BITE + 1.3, t) * (1 - ss(T_BACK - 0.1, T_BACK + 0.4, t)));   // 1 = slumped sitting
const exhaust = (t) => wnd(T_DIM + 0.2, T_STUM + 0.2, t, 1.0);             // 0..1 how tired she looks while she still runs
// ---- the portrait (canvas-local coordinates) and the brush: progress follows the light ----
const ell = (cx, cy, rx, ry, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; });
const STROKES = [
  [[22, 46], [16, 14], [44, 33]], [[82, 46], [88, 14], [60, 33]],                                   // ears
  ell(52, 66, 36, 31, PI * 1.12, PI * 3.0, 40),                                                       // head
  [[40, 36], [38, 44]], [[52, 33], [52, 42]], [[64, 36], [66, 44]],                                  // forehead stripes
  ell(38, 63, 6.5, 7.5, 0, 6.28, 14), ell(66, 63, 6.5, 7.5, 0, 6.28, 14),                            // eyes
  [[48, 74], [56, 74], [52, 79], [48, 74]], [[52, 79], [52, 85]], [[44, 90], [52, 85], [60, 90]],     // nose + mouth
  [[28, 76], [6, 70]], [[28, 80], [4, 82]], [[28, 84], [8, 94]], [[76, 76], [98, 70]], [[76, 80], [100, 82]], [[76, 84], [96, 94]],   // whiskers
  [[20, 100], [14, 118]], [[84, 100], [90, 118]],                                                     // shoulders
];
const PATHSEG = (() => { const segs = []; let prev = null, acc = 0; for (const st of STROKES) { if (prev) { const d = Math.hypot(st[0][0] - prev[0], st[0][1] - prev[1]); segs.push({ down: false, a: prev, b: st[0], len: d, w: d * 0.25, s0: acc }); acc += d * 0.25; }
  for (let i = 1; i < st.length; i++) { const d = Math.hypot(st[i][0] - st[i - 1][0], st[i][1] - st[i - 1][1]); segs.push({ down: true, a: st[i - 1], b: st[i], len: d, w: d, s0: acc }); acc += d; } prev = st[st.length - 1]; } return { segs, total: acc }; })();
const PAINT_RATE = 52, PAINT_STOP = T_STUM + 0.3;   // path units per second at full light
const PROG = (() => { const dt = 1 / 120, n = Math.round(DUR / dt), P = new Float32Array(n + 1); let s = 0; for (let i = 0; i <= n; i++) { const t = i * dt; P[i] = s; if (t < PAINT_STOP) s += PAINT_RATE * clamp((lampAt(t) - 0.1) / 0.55) * dt * (0.55 + 0.45 * Math.sin(t * 9 + 1) ** 2) / 0.775; } return P; })();
const progAt = (t) => { if (t >= T_SWAP) return 0; const x = clamp(t, 0, DUR) / (1 / 120), i = Math.min(Math.floor(x), PROG.length - 2), f = x - i; return Math.min(PATHSEG.total, PROG[i] * (1 - f) + PROG[i + 1] * f); };
function penAt(s) { const S = PATHSEG.segs; for (const g of S) if (s <= g.s0 + g.w) { const u = g.w > 0 ? clamp((s - g.s0) / g.w) : 1; return { x: lerp(g.a[0], g.b[0], u), y: lerp(g.a[1], g.b[1], u), down: g.down && s > g.s0 }; } const g = S[S.length - 1]; return { x: g.b[0], y: g.b[1], down: false }; }
// ---- samurai right hand = brush grip (world) ----
const BTIP = [56, -42];                                                       // grip -> brush tip
const READY = [SXC + 112, SYC + 92], RODB = [SXC + 140, SYC + 80], RODH = [SXC + 128, SYC + 18];
function paintGrip(t) { const s = progAt(t), p = penAt(s), tip = cvPt([p.x, p.y]); return [tip[0] - BTIP[0] + (p.down ? 0 : 0), tip[1] - BTIP[1] - (p.down ? 0 : 10)]; }
const paintW = (t) => (t < 9 ? 1 - ss(T_STUM + 0.35, T_STUM + 0.9, t) : ss(T_PAINT - 0.3, T_PAINT + 0.5, t));
function keyHand() {
  const K = [];
  for (const m of [-1, 0, 1]) { const o = m * DUR; const a = (t, p) => K.push([o + t, p[0], p[1]]);
    a(T_STUM, READY); a(T_DROP - 0.2, READY); a(T_DROP + 0.25, RODB); a(T_LURE + 0.15, RODB); a(T_LURE + 0.95, RODH); a(T_BITE - 0.03, [RODH[0], RODH[1] - 4]); a(T_BITE + 0.15, RODB); a(T_BITE + 0.4, READY);
    a(T_BEG, [SXC + 100, SYC + 6]); a(T_BEG + 0.9, [SXC + 92, SYC + 16]); a(T_BACK, [SXC + 100, SYC + 8]); a(T_BACK + 1.2, READY); a(T_PAINT + 0.5, READY);
  }
  return K.sort((x, y) => x[0] - y[0]);
}
const HK = keyHand();
const handAt = (t) => { const k = KS(HK, t), w = paintW(t); if (w <= 0) return k; const g = paintGrip(t); return [lerp(k[0], g[0], w), lerp(k[1], g[1], w)]; };
const rodHeld = (t) => t >= T_DROP + 0.2 && t < T_BITE + 0.2;
const brushHeld = (t) => t < T_DROP || t >= T_PAINT - 0.2;
// ---- events for the sound track: [t, type, amp, x, opts] ----
const EVF = (() => {
  const E = [];
  for (let t = 0.1; t < T_STUM + 0.2; t += 0.16) { const p = penAt(progAt(t)), q = penAt(progAt(t + 0.16)); if (q.down && progAt(t + 0.16) - progAt(t) > 0.8) E.push([t, 'brush', 0.3 * clamp(lampAt(t) * 1.2), CV.x + 60]); }
  for (let t = T_DIM + 0.6; t < T_STUM - 0.3; t += 0.85 + 0.45 * hsh1(t)) E.push([t, 'pant', 0.5, WX - 120]);
  E.push([T_STUM, 'stumble', 0.9, WX], [T_STUM + 0.05, 'gasp', 0.6, SXC], [TUMB0 + 0.35, 'tumble', 0.8, WX], [TUMB1 + 0.05, 'thump', 1.0, WX - 40], [TUMB1 + 0.35, 'thump', 0.4, WX - 30]);
  E.push([8.0, 'sigh', 0.5, SXC], [T_DROP, 'drop', 0.6, SXC + 130], [T_DROP + 0.45, 'tap', 0.4, SXC + 160], [T_LURE + 0.4, 'creak', 0.4, SXC + 200], [T_SMELL, 'sniff', 0.5, WX - 60], [T_RISE, 'groan', 0.5, WX], [T_SPR - 0.1, 'mew', 0.55, WX]);
  E.push([T_BITE - 0.03, 'zap', 0.9, LAMP[0]], [T_BITE, 'chomp', 1.0, WX - 140], [T_BITE + 0.02, 'wheelstop', 0.9, WX]);
  for (let k = 0; k < 6; k++) E.push([T_BITE + 0.5 + 0.22 * k, 'chew', 0.45, WX - 120]);
  E.push([T_BITE + 0.1, 'gasp', 0.7, SXC], [T_BITE + 0.3, 'tap', 0.6, SXC + 160]);
  E.push([T_BITE + 0.95, 'lampoff', 0.9, LAMP[0]], [T_BEG, 'beg', 0.5, SXC], [T_BEG + 1.0, 'sigh', 0.6, WX], [T_SWAP, 'swap', 0.4, CV.x], [T_BACK + 0.35, 'lampon', 0.7, LAMP[0]], [T_PAINT, 'tap', 0.4, SXC + 160]);
  return E.sort((a, b) => a[0] - b[0]);
})();
// ================= scene.js — drawing; everything is a pure function of t (cues.js holds all motion) =================
const WOODL = '#D2A56A', WOODM = '#A9743F', WOODD = '#5E3B20', BRASS = '#D8B452', BRASSD = '#9C7A2C';
const rotP = (c, x, y, a, fn) => { c.save(); c.translate(x, y); c.rotate(a); fn(); c.restore(); };
// ---------- background: a night workshop (the lantern grade is applied after the frame) ----------
function bgRoom(c, t) {
  const g = c.createLinearGradient(0, 0, 0, FL); g.addColorStop(0, '#CFE4D6'); g.addColorStop(1, '#A9CDB9'); c.fillStyle = g; c.fillRect(-300, -300, 1680, FL + 300);
  c.strokeStyle = 'rgba(60,92,80,0.35)'; c.lineWidth = 3; for (let x = -40; x < 1140; x += 96) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, FL); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,0.14)'; for (let x = -40; x < 1140; x += 192) c.fillRect(x + 6, 0, 14, FL);
  // wainscot + skirting
  c.fillStyle = 'rgba(70,50,30,0.16)'; c.fillRect(0, FL - 120, 1080, 120); c.fillStyle = WOODM; c.fillRect(0, FL - 124, 1080, 10); c.strokeStyle = INKC; c.lineWidth = 3; c.strokeRect(-4, FL - 124, 1088, 10);
  // hanging scroll: an ink mountain with a red seal (no letters)
  const sx = 96, sy = 300; c.fillStyle = WOODD; c.fillRect(sx - 14, sy - 14, 132, 12); c.fillRect(sx - 14, sy + 330, 132, 14); c.fillStyle = '#EFE3C4'; c.fillRect(sx, sy, 104, 330); c.strokeStyle = INKC; c.lineWidth = 3.5; c.strokeRect(sx, sy, 104, 330);
  c.strokeStyle = 'rgba(40,40,52,0.85)'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(sx + 10, sy + 250); c.quadraticCurveTo(sx + 40, sy + 120, sx + 62, sy + 170); c.quadraticCurveTo(sx + 78, sy + 90, sx + 96, sy + 230); c.stroke();
  c.lineWidth = 3; c.globalAlpha = 0.5; c.beginPath(); c.moveTo(sx + 14, sy + 270); c.quadraticCurveTo(sx + 52, sy + 210, sx + 96, sy + 276); c.stroke(); c.globalAlpha = 1; c.fillStyle = '#B3271F'; c.fillRect(sx + 72, sy + 290, 18, 18);
  // shelf with a jar, a bonsai and rolled scrolls
  const shx = 470, shy = 640; c.fillStyle = WOODM; c.fillRect(shx, shy, 300, 18); c.strokeStyle = INKC; c.lineWidth = 3.5; c.strokeRect(shx, shy, 300, 18); c.fillStyle = WOODD; c.fillRect(shx + 20, shy + 18, 10, 46); c.fillRect(shx + 270, shy + 18, 10, 46);
  c.fillStyle = '#7C5B8C'; c.beginPath(); c.roundRect(shx + 20, shy - 62, 54, 62, 14); c.fill(); c.stroke(); c.fillStyle = '#E9E0C8'; c.fillRect(shx + 30, shy - 70, 34, 10); c.strokeRect(shx + 30, shy - 70, 34, 10);
  c.fillStyle = '#9A6B3E'; c.beginPath(); c.roundRect(shx + 112, shy - 26, 70, 26, 6); c.fill(); c.stroke(); c.strokeStyle = '#4A3322'; c.lineWidth = 6; c.beginPath(); c.moveTo(shx + 146, shy - 26); c.quadraticCurveTo(shx + 128, shy - 62, shx + 150, shy - 84); c.stroke();
  c.fillStyle = '#4E8A55'; for (const [dx, dy, r] of [[134, -88, 22], [166, -82, 20], [148, -104, 18], [120, -74, 16]]) { c.beginPath(); c.arc(shx + dx, shy + dy, r, 0, PI2); c.fill(); c.strokeStyle = INKC; c.lineWidth = 3; c.stroke(); }
  for (let k = 0; k < 3; k++) { c.fillStyle = k % 2 ? '#E8D9B0' : '#D9C48C'; c.beginPath(); c.roundRect(shx + 214, shy - 70 + k * 6, 64, 20, 9); c.fill(); c.strokeStyle = INKC; c.lineWidth = 3; c.stroke(); c.translate(0, 0); }
  // round window with the night sky and a moon
  const wx = 880, wy = 470, wr = 112; c.fillStyle = '#1E2F52'; c.beginPath(); c.arc(wx, wy, wr, 0, PI2); c.fill();
  c.fillStyle = '#F1E7B8'; c.beginPath(); c.arc(wx + 28, wy - 26, 28, 0, PI2); c.fill(); c.fillStyle = '#1E2F52'; c.beginPath(); c.arc(wx + 40, wy - 32, 25, 0, PI2); c.fill();
  for (const [dx, dy, r, ph] of [[-60, -50, 3, 0], [-20, 40, 2.5, 1], [50, 50, 3, 2], [-70, 20, 2.5, 3], [10, -80, 2.5, 4], [70, -10, 2, 5]]) { c.fillStyle = `rgba(246,242,216,${0.6 + 0.4 * Math.sin(t * 2.1 + ph)})`; c.beginPath(); c.arc(wx + dx, wy + dy, r, 0, PI2); c.fill(); }
  c.strokeStyle = WOODD; c.lineWidth = 12; c.beginPath(); c.arc(wx, wy, wr, 0, PI2); c.stroke(); c.lineWidth = 7; c.beginPath(); c.moveTo(wx - wr, wy); c.lineTo(wx + wr, wy); c.moveTo(wx, wy - wr); c.lineTo(wx, wy + wr); c.stroke();
  c.strokeStyle = INKC; c.lineWidth = 3.5; c.beginPath(); c.arc(wx, wy, wr + 6, 0, PI2); c.stroke();
  // floor: wooden boards + a straw mat under the samurai and the table
  const f = c.createLinearGradient(0, FL, 0, 1920); f.addColorStop(0, '#B58B58'); f.addColorStop(1, '#8F6A40'); c.fillStyle = f; c.fillRect(-300, FL, 1680, 700);
  c.strokeStyle = 'rgba(50,30,14,0.5)'; c.lineWidth = 3; for (let y = FL + 12; y < 1900; y += 112) { c.beginPath(); c.moveTo(-300, y); c.lineTo(1380, y); c.stroke(); }
  c.strokeStyle = 'rgba(70,44,20,0.28)'; c.lineWidth = 2; for (let r = 0; r < 5; r++) for (let k = 0; k < 14; k++) { const y = FL + 30 + r * 112 + (k * 37 % 70), x = (k * 211 + r * 97) % 1080; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 60, y + 4, x + 130, y - 2); c.stroke(); }
  c.fillStyle = 'rgba(40,28,16,0.18)'; c.fillRect(-300, FL, 1680, 10);
  c.fillStyle = '#C9B26B'; c.beginPath(); c.roundRect(-30, FL + 44, 600, 190, 8); c.fill(); c.strokeStyle = INKC; c.lineWidth = 4; c.stroke(); c.strokeStyle = 'rgba(80,62,24,0.45)'; c.lineWidth = 2.5; for (let x = -10; x < 560; x += 18) { c.beginPath(); c.moveTo(x, FL + 48); c.lineTo(x, FL + 230); c.stroke(); }
  c.fillStyle = '#2E5C52'; c.fillRect(-30, FL + 44, 600, 12); c.fillRect(-30, FL + 222, 600, 12);
}
// ---------- wheel + stand + dynamo ----------
function wheelShadow(c, t, Lc) {
  if (Lc < 0.04) return; c.save(); c.translate(WX + 40, WY + 16); c.strokeStyle = `rgba(30,50,60,${0.16 * Math.min(1, Lc)})`; c.lineWidth = 28; c.beginPath(); c.arc(0, 0, (ROUT + RIN) / 2, 0, PI2); c.stroke();
  c.lineWidth = 7; for (let k = 0; k < NSP; k++) { const a = -thAt(t) + k * 2 * PI / NSP; c.beginPath(); c.moveTo(0, 0); c.lineTo(RIN * Math.cos(a), RIN * Math.sin(a)); c.stroke(); } c.restore();
}
function wheelStandBack(c) {
  const g = c.createLinearGradient(WX - 24, 0, WX + 24, 0); g.addColorStop(0, WOODM); g.addColorStop(1, WOODD); c.fillStyle = g; c.fillRect(WX - 24, DYN[1] - 6, 48, FL - DYN[1] + 6); c.strokeStyle = INKC; c.lineWidth = 4; c.strokeRect(WX - 24, DYN[1] - 6, 48, FL - DYN[1] + 6);
  c.fillStyle = WOODM; c.fillRect(WX - 70, FL - 26, 140, 26); c.strokeRect(WX - 70, FL - 26, 140, 26); c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(WX - 66, FL - 24, 132, 4);
  c.fillStyle = WOODM; c.fillRect(WX - 24, DYN[1] - 22, DYN[0] - WX + 70, 26); c.strokeRect(WX - 24, DYN[1] - 22, DYN[0] - WX + 70, 26);
  c.fillStyle = 'rgba(255,255,255,0.2)'; c.fillRect(WX - 20, DYN[1] - 19, DYN[0] - WX + 62, 4); c.fillStyle = '#6E6E78'; for (const x of [WX - 8, WX + 8, DYN[0] + 40]) { c.beginPath(); c.arc(x, DYN[1] - 9, 3, 0, PI2); c.fill(); }
}
function dynamo(c, t) {
  const w = wAt(t), th = thAt(t) * (28 / 15), L = lampVis(t);
  c.fillStyle = BRASS; c.beginPath(); c.roundRect(DYN[0] - 10, DYN[1] - 70, 86, 48, 8); c.fill(); c.strokeStyle = INKC; c.lineWidth = 4; c.stroke();
  c.fillStyle = BRASSD; c.fillRect(DYN[0] - 2, DYN[1] - 62, 70, 8); c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(DYN[0] - 2, DYN[1] - 52, 60, 4);
  c.fillStyle = '#6E6E78'; c.beginPath(); c.arc(DYN[0] + 64, DYN[1] - 46, 6, 0, PI2); c.fill(); c.stroke();   // terminal
  c.fillStyle = `rgb(${Math.round(lerp(70, 255, clamp(L)))},${Math.round(lerp(30, 220, clamp(L)))},${Math.round(lerp(30, 90, clamp(L)))})`; c.beginPath(); c.arc(DYN[0] + 14, DYN[1] - 46, 5.5, 0, PI2); c.fill(); c.stroke();   // pilot light
  rotP(c, DYN[0], DYN[1], -th, () => { c.fillStyle = '#8A8A94'; c.beginPath(); c.arc(0, 0, 15, 0, PI2); c.fill(); c.stroke(); c.strokeStyle = INKC; c.lineWidth = 3; c.beginPath(); c.moveTo(-15, 0); c.lineTo(15, 0); c.moveTo(0, -15); c.lineTo(0, 15); c.stroke(); });
}
function belt(c, t) {
  const R1 = 28, R2 = 15, dx = DYN[0] - WX, dy = DYN[1] - WY, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx), b = Math.acos((R1 - R2) / d), w = clamp(wAt(t) / WMAX), fl = 2.2 * w * Math.sin(t * 61);
  c.strokeStyle = '#3B2A1E'; c.lineWidth = 6; c.lineCap = 'round';
  for (const s of [1, -1]) { const q = a + s * b, p1 = [WX + R1 * Math.cos(q), WY + R1 * Math.sin(q)], p2 = [DYN[0] + R2 * Math.cos(q), DYN[1] + R2 * Math.sin(q)], mx = (p1[0] + p2[0]) / 2 + fl * (s > 0 ? 1 : -1) * Math.cos(a + PI / 2), my = (p1[1] + p2[1]) / 2 + fl * (s > 0 ? 1 : -1) * Math.sin(a + PI / 2); c.beginPath(); c.moveTo(p1[0], p1[1]); c.quadraticCurveTo(mx, my, p2[0], p2[1]); c.stroke(); }
  c.lineWidth = 2.5; c.strokeStyle = 'rgba(255,255,255,0.18)'; const th = thAt(t);
  for (let k = 0; k < 7; k++) { const u = ((k / 7 + th * 0.16) % 1 + 1) % 1; for (const s of [1, -1]) { const q = a + s * b, P = [WX + R1 * Math.cos(q), WY + R1 * Math.sin(q)], Q = [DYN[0] + R2 * Math.cos(q), DYN[1] + R2 * Math.sin(q)], x = lerp(P[0], Q[0], (s > 0 ? u : 1 - u)), y = lerp(P[1], Q[1], (s > 0 ? u : 1 - u)); c.beginPath(); c.arc(x, y, 2.2, 0, PI2); c.stroke(); } }
}
const wob = (t) => { const k = clamp(wAt(t) / WMAX); return [0.9 * k * Math.sin(t * 37), 0.6 * k * Math.sin(t * 29 + 1)]; };
function wheelBack(c, t) {
  const th = -thAt(t), [jx, jy] = wob(t), ox = 16, oy = -9;
  c.save(); c.translate(WX + ox + jx, WY + oy + jy);
  c.strokeStyle = 'rgba(90,56,28,0.9)'; c.lineWidth = 6; for (let k = 0; k < NSP; k++) { const a = th + k * 2 * PI / NSP; c.beginPath(); c.moveTo(0, 0); c.lineTo(RIN * Math.cos(a), RIN * Math.sin(a)); c.stroke(); }
  c.fillStyle = WOODD; c.beginPath(); c.arc(0, 0, ROUT, 0, PI2); c.arc(0, 0, RIN - 4, 0, PI2, true); c.fill('evenodd'); c.strokeStyle = INKC; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, ROUT, 0, PI2); c.stroke();
  c.restore();
}
function wheelSpokes(c, t) {
  const th = -thAt(t), [jx, jy] = wob(t); c.save(); c.translate(WX + jx, WY + jy);
  c.strokeStyle = WOODM; c.lineWidth = 9; for (let k = 0; k < NSP; k++) { const a = th + k * 2 * PI / NSP; c.beginPath(); c.moveTo(0, 0); c.lineTo((RIN - 2) * Math.cos(a), (RIN - 2) * Math.sin(a)); c.stroke(); }
  c.strokeStyle = INKC; c.lineWidth = 3; for (let k = 0; k < NSP; k++) { const a = th + k * 2 * PI / NSP; c.beginPath(); c.moveTo(0, 0); c.lineTo((RIN - 2) * Math.cos(a), (RIN - 2) * Math.sin(a)); c.stroke(); }
  c.strokeStyle = 'rgba(255,230,190,0.25)'; c.lineWidth = 2; for (let k = 0; k < NSP; k++) { const a = th + k * 2 * PI / NSP; c.beginPath(); c.moveTo(0, -3); c.lineTo(0, -3); c.moveTo(14 * Math.cos(a) - 2 * Math.sin(a), 14 * Math.sin(a) + 2 * Math.cos(a)); c.lineTo((RIN - 8) * Math.cos(a) - 2 * Math.sin(a), (RIN - 8) * Math.sin(a) + 2 * Math.cos(a)); c.stroke(); }
  c.restore();
}
function wheelFront(c, t) {
  const th = -thAt(t), [jx, jy] = wob(t); c.save(); c.translate(WX + jx, WY + jy);
  const rg = c.createRadialGradient(0, 0, RIN, 0, 0, ROUT); rg.addColorStop(0, '#C79A62'); rg.addColorStop(1, '#A9743F');
  c.fillStyle = rg; c.beginPath(); c.arc(0, 0, ROUT, 0, PI2); c.arc(0, 0, RIN, 0, PI2, true); c.fill('evenodd');
  c.strokeStyle = 'rgba(60,36,18,0.55)'; c.lineWidth = 3; for (let k = 0; k < 28; k++) { const a = th + k * 2 * PI / 28; c.beginPath(); c.moveTo(RIN * Math.cos(a), RIN * Math.sin(a)); c.lineTo(ROUT * Math.cos(a), ROUT * Math.sin(a)); c.stroke(); }
  c.fillStyle = '#3E3028'; for (let k = 0; k < 28; k++) { const a = th + (k + 0.5) * 2 * PI / 28; c.beginPath(); c.arc((ROUT - 11) * Math.cos(a), (ROUT - 11) * Math.sin(a), 2.4, 0, PI2); c.fill(); c.beginPath(); c.arc((RIN + 11) * Math.cos(a), (RIN + 11) * Math.sin(a), 2.4, 0, PI2); c.fill(); }
  c.strokeStyle = INKC; c.lineWidth = 4.5; c.beginPath(); c.arc(0, 0, ROUT, 0, PI2); c.stroke(); c.beginPath(); c.arc(0, 0, RIN, 0, PI2); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.22)'; c.beginPath(); c.arc(0, 0, ROUT - 8, 3.3, 4.1); c.arc(0, 0, ROUT - 22, 4.1, 3.3, true); c.fill();
  c.restore();
}
function hubFront(c, t) {
  const th = -thAt(t), [jx, jy] = wob(t); c.save(); c.translate(WX + jx, WY + jy); c.fillStyle = BRASS; c.beginPath(); c.arc(0, 0, 30, 0, PI2); c.fill(); c.strokeStyle = INKC; c.lineWidth = 4; c.stroke();
  c.rotate(th); c.fillStyle = BRASSD; for (let k = 0; k < 4; k++) { c.rotate(PI / 2); c.beginPath(); c.arc(17, 0, 4.5, 0, PI2); c.fill(); } c.fillStyle = INKC; c.beginPath(); c.arc(0, 0, 6, 0, PI2); c.fill(); c.restore();
}
// ---------- table, easel, portrait, brush, rod, fish ----------
function table(c, t) {
  c.fillStyle = WOODD; for (const x of [TB.x0 + 14, TB.x1 - 26]) { c.fillRect(x, TB.y + 16, 12, FL - TB.y - 16); c.strokeStyle = INKC; c.lineWidth = 3.5; c.strokeRect(x, TB.y + 16, 12, FL - TB.y - 16); }
  c.fillStyle = WOODL; c.beginPath(); c.roundRect(TB.x0, TB.y, TB.x1 - TB.x0, 18, 6); c.fill(); c.strokeStyle = INKC; c.lineWidth = 4; c.stroke(); c.fillStyle = 'rgba(255,255,255,0.28)'; c.fillRect(TB.x0 + 6, TB.y + 3, TB.x1 - TB.x0 - 12, 4);
  // inkstone with ink + water dropper + brush rest
  c.fillStyle = '#2C2C34'; c.beginPath(); c.roundRect(TB.x0 + 8, TB.y - 12, 34, 12, 3); c.fill(); c.strokeStyle = INKC; c.lineWidth = 3; c.stroke(); c.fillStyle = '#0F0F14'; c.beginPath(); c.ellipse(TB.x0 + 25, TB.y - 11, 11, 3, 0, 0, PI2); c.fill(); c.fillStyle = '#7FB2D9'; c.beginPath(); c.roundRect(TB.x0 + 46, TB.y - 14, 14, 14, 4); c.fill(); c.stroke();
  // plate of dried fish
  c.fillStyle = '#E8E4D6'; c.beginPath(); c.ellipse(TB.x1 - 54, TB.y - 2, 40, 6, 0, 0, PI2); c.fill(); c.strokeStyle = INKC; c.lineWidth = 3; c.stroke();
  const left = (t > T_DROP + 0.45 && t < T_SWAP) ? 2 : 3; for (let k = 0; k < left; k++) fishDraw(c, TB.x1 - 70 + k * 12, TB.y - 9 - k * 5, 0.1 + 0.05 * k, 0.7, 1);
}
function easel(c, t) {
  const x0 = CV.x - 12, y0 = CV.y - 12, w = CV.w + 24, h = CV.h + 20;
  c.fillStyle = WOODD; c.beginPath(); c.moveTo(x0 + 10, y0 + h); c.lineTo(x0 + 2, TB.y); c.lineTo(x0 + 18, TB.y); c.closePath(); c.fill(); c.beginPath(); c.moveTo(x0 + w - 10, y0 + h); c.lineTo(x0 + w - 2, TB.y); c.lineTo(x0 + w - 18, TB.y); c.closePath(); c.fill();
  c.fillStyle = WOODM; c.beginPath(); c.roundRect(x0, y0, w, h, 6); c.fill(); c.strokeStyle = INKC; c.lineWidth = 4; c.stroke();
  const sw = clamp((t - T_SWAP) / 0.5), sheet = t >= T_SWAP ? ss(T_SWAP, T_SWAP + 0.5, t) : 1;
  c.fillStyle = '#F6EEDD'; c.fillRect(CV.x, CV.y, CV.w, CV.h); c.strokeStyle = 'rgba(90,70,40,0.55)'; c.lineWidth = 2; c.strokeRect(CV.x, CV.y, CV.w, CV.h);
  const s = progAt(t); c.save(); c.beginPath(); c.rect(CV.x, CV.y, CV.w, CV.h); c.clip(); c.strokeStyle = '#1B1B22'; c.lineWidth = 3; c.lineCap = 'round'; c.lineJoin = 'round';
  for (const g of PATHSEG.segs) { if (!g.down || s <= g.s0) continue; const u = clamp((s - g.s0) / g.w), q = [lerp(g.a[0], g.b[0], u), lerp(g.a[1], g.b[1], u)]; const A = cvPt(g.a), B = cvPt(q); c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.stroke(); }
  if (s > PATHSEG.total * 0.55) { c.fillStyle = `rgba(230,150,70,${0.55 * ss(PATHSEG.total * 0.55, PATHSEG.total * 0.8, s)})`; c.beginPath(); { const W = cvPt([52, 66]); c.ellipse(W[0], W[1], 33 * PS, 28 * PS, 0, 0, PI2); }; c.fill(); }
  if (t >= T_SWAP && t < T_SWAP + 0.5) { c.fillStyle = `rgba(246,238,221,${1 - sw})`; }
  c.restore();
}
function brushDraw(c, held, hand, t) {
  const tipOff = BTIP, g = held ? hand : [SXC + 150, TB.y - 5], d = held ? tipOff : [1, 0.06], n = Math.hypot(d[0], d[1]), u = [d[0] / n, d[1] / n], L = held ? n : 78;
  c.save(); c.lineCap = 'round'; for (const [col, wd] of [[INKC, 9], ['#C9A15C', 5]]) { c.strokeStyle = col; c.lineWidth = wd; c.beginPath(); c.moveTo(g[0] - u[0] * 40, g[1] - u[1] * 40); c.lineTo(g[0] + u[0] * (L - 18), g[1] + u[1] * (L - 18)); c.stroke(); }
  c.strokeStyle = '#B3271F'; c.lineWidth = 5; c.beginPath(); c.moveTo(g[0] - u[0] * 40, g[1] - u[1] * 40); c.lineTo(g[0] - u[0] * 30, g[1] - u[1] * 30); c.stroke();
  c.strokeStyle = '#1B1B22'; c.lineWidth = 9; c.beginPath(); c.moveTo(g[0] + u[0] * (L - 18), g[1] + u[1] * (L - 18)); c.lineTo(g[0] + u[0] * L, g[1] + u[1] * L); c.stroke(); c.restore();
}
const ROD_REST_TIP = [SXC + 140 + 195, TB.y - 9];
function tipAt(t) {
  const K = [[T_DROP + 0.2, ROD_REST_TIP[0], ROD_REST_TIP[1]], [T_LURE + 0.6, 450, 1160], [T_LURE + 1.1, 622, 1182], [T_FISH, 640, 1170], [T_SMELL - 0.1, 640, 1176], [T_RISE, 628, 1190], [T_SPR + 0.4, 566, 1192], [T_BITE - 0.02, 566, 1192], [T_BITE + 0.15, 520, 1215], [T_BITE + 0.35, ROD_REST_TIP[0], ROD_REST_TIP[1]]];
  const p = KS(K, t); let x = p[0], y = p[1];
  if (t >= T_FISH && t < T_SMELL) { const k = wnd(T_FISH, T_SMELL, t, 0.25); y += 12 * Math.sin((t - T_FISH) * 14) * k; x += 6 * Math.sin((t - T_FISH) * 7) * k; }
  return [x, y];
}
function rodState(t) {
  const held = rodHeld(t), hand = handAt(t), butt = held ? [hand[0], hand[1]] : [SXC + 140, TB.y - 5], tip = held || (t >= T_BITE + 0.15 && t < T_BITE + 0.4) ? tipAt(t) : ROD_REST_TIP;
  return { butt, tip };
}
function rodDraw(c, R) {
  const bx = R.butt[0] - 18, by = R.butt[1], dx = R.tip[0] - R.butt[0], dy = R.tip[1] - R.butt[1], sag = Math.min(14, Math.hypot(dx, dy) * 0.05), cx = (bx + R.tip[0]) / 2, cy = (by + R.tip[1]) / 2 + sag;
  c.save(); c.lineCap = 'round'; for (const [col, wd] of [[INKC, 10], ['#C9A15C', 6]]) { c.strokeStyle = col; c.lineWidth = wd; c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(cx, cy, R.tip[0], R.tip[1]); c.stroke(); }
  c.strokeStyle = 'rgba(120,80,30,0.7)'; c.lineWidth = 2; for (const q of [0.25, 0.5, 0.75]) { const x = (1 - q) * (1 - q) * bx + 2 * q * (1 - q) * cx + q * q * R.tip[0], y = (1 - q) * (1 - q) * by + 2 * q * (1 - q) * cy + q * q * R.tip[1]; c.beginPath(); c.moveTo(x - 1, y - 5); c.lineTo(x + 1, y + 5); c.stroke(); } c.restore();
}
function fishDraw(c, x, y, rot, s, a = 1) {
  if (s <= 0.02) return; c.save(); c.globalAlpha = a; c.translate(x, y); c.rotate(rot); c.scale(s, s);
  c.fillStyle = '#E0B070'; c.beginPath(); c.ellipse(0, 0, 32, 12, 0, 0, PI2); c.fill(); c.strokeStyle = INKC; c.lineWidth = 3.5; c.stroke();
  c.fillStyle = '#C98F4B'; c.beginPath(); c.moveTo(-28, 0); c.lineTo(-52, -14); c.lineTo(-52, 14); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#C98F4B'; c.beginPath(); c.moveTo(-4, -11); c.lineTo(6, -22); c.lineTo(14, -10); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(110,60,20,0.6)'; c.lineWidth = 2; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(k * 9, -9); c.lineTo(k * 9 + 3, 9); c.stroke(); }
  c.fillStyle = '#FFF4DC'; c.beginPath(); c.arc(20, -3, 4.2, 0, PI2); c.fill(); c.stroke(); c.fillStyle = INKC; c.beginPath(); c.arc(21, -3, 2.2, 0, PI2); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(-4, -6, 16, 3, 0, 0, PI2); c.fill(); c.restore();
}
// ---------- samurai ----------
function samAt(t) {
  const lamp = lampAt(t), cheer = Math.max(wnd(T_SPR + 0.8, T_BITE, t, 0.3), wnd(T_BACK + 1.1, T_BACK + 2.0, t, 0.3) * 0.7), shock = pulse(t, T_BITE + 0.1, 0.12) + 0.8 * pulse(t, T_STUM + 0.12, 0.12), bow = wnd(T_BEG, T_BEG + 1.1, t, 0.25), worry = wnd(T_STUM + 0.2, T_DROP, t, 0.35);
  const paint = paintW(t), lean = (0.05 + 0.1 * (1 - clamp(lamp))) * paint;
  const hop = arc(t, T_SPR + 1.2, 8, 0.3) + arc(t, T_SPR + 1.55, 6, 0.3) + arc(t, T_SPR + 2.4, 7, 0.3) + 12 * shock + arc(t, T_BACK + 1.1, 6, 0.3);
  const rot = lean + 0.03 * Math.sin(t * 5) * cheer - 0.1 * shock + 0.05 * bow * Math.sin(t * 9) + 0.04 * bow - 0.05 * worry;
  const D2 = SAMS * 1.58, y = FL - D2 * Math.cos(rot) - hop, x = SXC + D2 * Math.sin(rot);
  const sweat = Math.max(0.3 * wnd(T_DIM, T_STUM + 1.0, t, 0.8), 0.6 * shock, 0.25 * worry);
  return { st: samState(0, { x, y, ground: y + D2 * Math.cos(rot), S: SAMS, face: 1, sx: 1, sy: 1, rot, walk: null, band: { a: 1, wind: 0.18 + 0.1 * Math.sin(t * 3) }, sweat }), cheer, shock, bow };
}
function samHands(S_, t) {
  const g = samGeom(S_.st, t), sh = [g.X(-0.85, 0.5), g.X(0.85, 0.5)], hr = handAt(t);
  const rest = g.X(-1.36, 0.88), up = [g.X(-1.12, 0.1)[0], SYC - 6], ch = S_.cheer, plead = g.X(-0.7, 0.2);
  let L = [lerp(rest[0], up[0], ch), lerp(rest[1], up[1], ch)]; const b = S_.bow; L = [lerp(L[0], plead[0], b), lerp(L[1], plead[1], b)];
  const raw = [L, hr.slice()], lim = 0.72 * SAMS, out = raw.map((h, i) => { const dx = h[0] - sh[i][0], dy = h[1] - sh[i][1], d = Math.hypot(dx, dy); return d > lim ? [sh[i][0] + dx * lim / d, sh[i][1] + dy * lim / d] : h; });
  window._raw = raw; window._sh = sh; window._hands = out; return out;
}
function samEyesAt(t, S_, fish) {
  const st = S_.st, g = samGeom(st, t), P = [g.X(-0.46, 0.26), g.X(0.16, 0.26)], lamp = lampAt(t), pen = penAt(progAt(t));
  let tg = cvPt([pen.x, pen.y]);
  if (t >= T_DIM + 0.8 && t < T_DIM + 1.4) tg = [LAMP[0], LAMP[1]];
  if (t >= T_STUM - 0.1 && t < 7.2) tg = [WX - 80, 1270];
  if (t >= 7.2 && t < 7.8) tg = [LAMP[0], LAMP[1]]; if (t >= 7.8 && t < T_DROP) tg = [WX - 90, 1290];
  if (t >= T_DROP && t < T_LURE + 1.0) tg = [TB.x1 - 54, TB.y - 12]; if (t >= T_LURE + 1.0 && t < T_BITE) tg = fish; if (t >= T_BITE && t < T_BITE + 0.2) tg = [WX - 140, 1230];
  if (t >= T_BITE + 0.2 && t < T_BEG) tg = [LAMP[0], LAMP[1]]; if (t >= T_BEG && t < T_BACK) tg = [WX - 90, 1270]; if (t >= T_BACK && t < T_BACK + 0.6) tg = [WX - 150, 1230]; if (t >= T_BACK + 0.6 && t < T_PAINT) tg = [LAMP[0], LAMP[1]];
  const ov = {}, set = (a, b, o) => { if (t >= a && t < b) Object.assign(ov, o); };
  const dimsq = clamp((0.7 - lamp) / 0.5); set(0, T_STUM, { squeeze: 0.6 * dimsq }); set(T_PAINT, 19.2, { squeeze: 0.5 * dimsq });
  set(T_STUM, T_DROP, { wide: 0.9, sad: 0.6 }); set(T_DROP, T_LURE + 1.0, { angry: 0.35, squeeze: 0.35 });
  set(T_SPR + 0.8, T_BITE, { happy: 0.9, wide: 0.3 }); set(T_BITE, T_BEG, { wide: 1, open: 1 }); set(T_BEG, T_BACK, { sad: 0.8, open: 1 }); set(T_BACK + 1.0, T_PAINT, { happy: 0.6 });
  return P.map((p) => { const dx = tg[0] - p[0], dy = tg[1] - p[1], l = Math.hypot(dx, dy) || 1; return Object.assign({ open: 0.9, wide: 0.2, sad: 0, look: [clamp(dx / l * 1.05, -1, 1), clamp(dy / l * 1.05, -1, 1)], closed: 0, squeeze: 0, happy: 0, angry: 0 }, ov); });
}
const sMouthAt = (t) => Math.max(0.9 * wnd(T_BITE + 0.05, T_BEG - 0.1, t, 0.1), 0.35 * wnd(T_BEG, T_BACK - 0.2, t, 0.15), 0.6 * wnd(T_SPR + 0.8, T_BITE - 0.05, t, 0.15), 0.8 * pulse(t, T_STUM + 0.12, 0.2), 0.3 * pulse(t, 7.9, 0.2));
// ---------- Mochi in the wheel ----------
function mixPose(A, B, k) {
  const P = clonePose(A), m = (a, b) => a.map((v, i) => v + (b[i] - v) * k); P.b = m(A.b, B.b); P.h = m(A.h, B.h); P.tl = m(A.tl, B.tl); P.ear = m(A.ear, B.ear);
  for (const L of ['FN', 'FF', 'HN', 'HF']) P.L[L] = m(A.L[L], B.L[L]); return P;
}
function mochiRun(t) {
  const w = wAt(t), psi = psiAt(t), kr = ss(0.35, 1.5, w), ph = phAt(t), ex = exhaust(t), sl = slumpAt(t);
  const nx0 = Math.sin(psi), ny0 = -Math.cos(psi), x0 = WX - RIN * nx0, y0 = WY + RIN * Math.cos(psi);
  const tumb = wnd(TUMB0 - 0.01, TUMB1, t, 0.06), spr = ss(T_SPR, T_SPR + 0.4, t) * (1 - ss(T_BITE, T_BITE + 0.05, t)), eating = t >= T_BITE + 0.08 && t < T_BEG, smell = wnd(T_SMELL - 0.2, T_RISE + 0.3, t, 0.2);
  let P = mixPose(P_STAND, P_RUN, kr); P.h = [P.h[0] - 4 * ex, P.h[1] + 12 * ex + 3 * Math.sin(t * 3.2) * ex, P.h[2], P.h[3]]; P.b = [P.b[0], P.b[1] + 5 * ex, P.b[2], P.b[3], P.b[4]];
  const amp = lerp(8, 20, kr) * (1 - 0.35 * ex), lift = lerp(4, 14, kr) * (1 - 0.5 * ex); P = walkPose(P, ph, amp, lift);
  if (tumb > 0.01) { const q = (t - TUMB0) * 16; P = walkPose(mixPose(P, P_STAND, 0.4), q, 30, 10); }
  if (sl > 0.01) { const S = clonePose(P_SIT); S.h = [S.h[0] - 2, S.h[1] + 12 * Math.min(1, sl * 1.2) + 3 * Math.sin(t * 2.4), S.h[2], S.h[3]]; P = mixPose(P, S, sl); }
  const bite = wnd(T_BITE - 0.08, T_BITE + 0.04, t, 0.03), chew = wnd(T_BITE + 0.3, T_BEG, t, 0.1) * (0.5 + 0.5 * Math.sin((t - T_BITE) * 26));
  const dizzy = wnd(TUMB1 + 0.1, T_SMELL, t, 0.4), lookFish = t >= T_FISH - 0.2 && t < T_BITE;
  const look = t >= T_SPR - 0.1 && t < T_BITE ? [-1, -0.05] : (lookFish ? [-0.9, -0.3] : [-0.7, 0.2 - 0.5 * ex]);
  const pantOpen = Math.max(ex * (0.55 + 0.35 * Math.sin(t * 9)), 0.7 * dizzy * (0.5 + 0.4 * Math.sin(t * 8)));
  const st = { mouth: { open: clamp(pantOpen + 0.95 * bite + 0.45 * Math.max(0, chew) * ss(T_BITE + 0.1, T_BITE + 0.2, t)) }, face: -1, kind: 'kit', col: ORG.k1, sd: 3, rot: -psi + rollAt(t) + 0.05 * (1 - ss(T_BITE, T_BITE + 0.5, t)) * 0, x: x0, y: y0, s: MS, pose: P, sx: 1, sy: 1 - 0.1 * ex,
    e: { sleep: eating ? 0 : Math.max(0.5 * ex, 0.9 * dizzy * (1 - smell)), open: eating ? 0.18 : 1 - 0.2 * ex, wide: 0.15 + 0.6 * spr + 0.5 * smell, look, dil: 0.5 + 0.4 * spr, sparkle: 1 }, breath: 0.02 * Math.sin(t * 7 + 1) + 0.05 * ex * Math.sin(t * 8) + 0.06 * dizzy * Math.sin(t * 7), tailWig: 0.12 + 0.5 * spr - 0.1 * ex, tailPh: t * 5, earTw: 0.05 * Math.sin(t * 5) + 0.4 * smell * Math.sin(t * 18),
    blush: 0.5, hTilt: 0.05 - 0.14 * ex - 0.16 * dizzy, mode: 'walk' };
  // keep the lowest paw on the running surface (no legs through the wheel); during the tumble she is lifted off it
  const G = catGeom(st, t); let pen = -1e9; for (const id in G.legs) { const p = G.legs[id].paw; pen = Math.max(pen, -((p[0] - x0) * nx0 + (p[1] - y0) * ny0) + 5 * MS); }
  const u = clamp((t - TUMB0) / (TUMB1 - TUMB0)), tl = (t >= TUMB0 && t <= TUMB1) ? 62 * Math.sin(PI * u) + 18 * Math.sin(PI * u) ** 2 : 0, wL = ss(TUMB1 - 0.05, TUMB1 + 0.12, t), wT = (t >= TUMB0 - 0.02 && t < TUMB1 + 0.12) ? 1 - wL : 0;
  pen = lerp(pen, tl + 40 * (1 - Math.cos(rollAt(t))) * 0.0, wT);
  st.x += pen * nx0; st.y += pen * ny0; return st;
}
function star(c, x, y, r, rot, a) { c.save(); c.globalAlpha = a; c.translate(x, y); c.rotate(rot); c.fillStyle = '#FFD94A'; c.strokeStyle = INKC; c.lineWidth = 2.2; c.beginPath(); for (let k = 0; k < 10; k++) { const rr = k % 2 ? r * 0.45 : r, q = k * PI / 5 - PI / 2; c.lineTo(rr * Math.cos(q), rr * Math.sin(q)); } c.closePath(); c.fill(); c.stroke(); c.restore(); }
// foot-strike dust: precomputed strike times (stance foot hits the surface every half gait cycle)
const STRIKES = (() => { const out = []; let last = Math.floor(phAt(0) / PI); for (let i = 1; i <= DUR * 120; i++) { const t = i / 120, k = Math.floor(phAt(t) / PI); if (k > last) { last = k; if (wAt(t) > 1.0 && !(t > T_STUM - 0.2 && t < T_STUM + 3.5) && !(t > T_BITE - 0.1 && t < T_BACK)) out.push(t); } } return out; })();
// ---------- render ----------
function renderFrame(T) {
  const t = ((T % DUR) + DUR) % DUR, S_ = samAt(t), sam = S_.st, hands = samHands(S_, t), R = rodState(t), mst = mochiRun(t), G = catGeom(mst, t), mouthP = G.HX(34, 5), Lv = lampVis(t), Lc = clamp(Lv);
  // fish position: on the plate -> on the string -> in the mouth -> eaten
  let fish, fr = 0, fs = 1, fa = 1;
  const plate = [TB.x1 - 70, TB.y - 9], pick = clamp(ss(T_DROP + 0.4, T_LURE + 0.9, t)), pend = (() => { const dt = 0.02, a = tipAt(t - dt), b = tipAt(t + dt), vx = (b[0] - a[0]) / (2 * dt); const be = clamp(-vx / 900, -0.5, 0.5) + 0.07 * Math.sin(t * 6.5); return [R.tip[0] + 58 * Math.sin(be), R.tip[1] + 58 * Math.cos(be), be]; })();
  if (t < T_BITE) { fish = [lerp(plate[0], pend[0], pick), lerp(plate[1], pend[1], pick)]; fr = lerp(0.1, -1.5707 + pend[2] * 0.3, pick); fa = (t < T_DROP + 0.4) ? 0 : 1; }
  else if (t < T_BEG) { fish = [mouthP[0] - 22, mouthP[1] + 8]; fr = 0.1 * Math.sin(t * 20); fs = 1 - 0.7 * ss(T_BITE + 0.3, T_BEG - 0.2, t); }
  else { fish = plate; fa = 0; }
  const eyes = samEyesAt(t, S_, fish), g = samGeom(sam, t), mouthG = g.X(0.16, 0.74);
  composeFrame([540, 960, 1], { noHalo: true,
    pre: (cx) => { bgRoom(cx, t); wheelShadow(cx, t, Lc); paperShadow(cx, SXC, FL + 8, 150, 0.5); paperShadow(cx, WX, FL + 6, 250, 0.4); paperShadow(cx, (TB.x0 + TB.x1) / 2, FL + 4, 110, 0.4); },
    ink: () => {},
    chars: (cx) => {
      wheelStandBack(cx); wheelBack(cx, t); dynamo(cx, t);
      cx.strokeStyle = 'rgba(30,20,12,0.9)'; cx.lineWidth = 4; cx.beginPath(); cx.moveTo(DYN[0] - 10, DYN[1] - 52); cx.quadraticCurveTo((DYN[0] + LAMP[0]) / 2, Math.max(DYN[1], LAMP[1]) - 100, LAMP[0], LAMP[1] - 64); cx.stroke();
      wheelSpokes(cx, t);
      // cat shadow on the wheel floor, then the cat
      { const nx = Math.sin(psiAt(t)), ny = -Math.cos(psiAt(t)); cx.save(); cx.fillStyle = 'rgba(40,24,10,0.22)'; cx.translate(WX - RIN * nx + 6, WY - RIN * ny * -1 + 2); cx.rotate(-psiAt(t)); cx.beginPath(); cx.ellipse(0, -2, 62, 7, 0, 0, PI2); cx.fill(); cx.restore(); }
      drawCat(cx, mst, t);
      for (const ts of STRIKES) { const d = t - ts; if (d >= 0 && d < 0.32) { const nx = Math.sin(psiAt(ts)); dust(cx, WX - RIN * nx + 40 + 30 * d * 4, WY + RIN * Math.cos(psiAt(ts)) - 4, d / 0.32, 0.45, 7); } }
      { const tr = wnd(T_DIM + 0.6, T_STUM + 1.2, t, 0.8), dz = wnd(TUMB1 + 0.1, T_SMELL, t, 0.4); const Hc = G.HX(0, -6);
        if (tr > 0.05) { cx.save(); for (let k = 0; k < 4; k++) { const u = ((t * 0.9 + k / 4) % 1), dir = k % 2 ? 1 : -0.6, x = Hc[0] + (24 + 46 * u) * dir + 8 * k, y = Hc[1] - 40 - 36 * u + 150 * u * u, r = 7 * (1 - 0.3 * u); cx.globalAlpha = tr * Math.min(1, (1 - u) * 2.5); cx.fillStyle = '#9ADBF5'; cx.strokeStyle = INKC; cx.lineWidth = 2.5; cx.beginPath(); cx.moveTo(x, y - r * 2); cx.quadraticCurveTo(x + r * 1.3, y, x, y + r); cx.quadraticCurveTo(x - r * 1.3, y, x, y - r * 2); cx.fill(); cx.stroke(); } cx.restore(); }
        if (dz > 0.05) for (let k = 0; k < 3; k++) { const a = t * 3.4 + k * 2.094; star(cx, Hc[0] + 56 * Math.cos(a), Hc[1] - 62 + 14 * Math.sin(a), 11, t * 2 + k, dz); } }
      wheelFront(cx, t); belt(cx, t); hubFront(cx, t);
      table(cx, t); easel(cx, t);
      if (!brushHeld(t)) brushDraw(cx, false, null, t);
      rodDraw(cx, R);
      if (t < T_BITE && fa > 0.02) { cx.save(); cx.strokeStyle = 'rgba(40,28,18,0.9)'; cx.lineWidth = 2.5; cx.globalAlpha = fa; cx.beginPath(); cx.moveTo(R.tip[0], R.tip[1]); cx.lineTo(fish[0], fish[1] - 12 * Math.cos(fr)); cx.stroke(); cx.restore(); }
      else if (t >= T_BITE && t < T_BITE + 0.4) { cx.save(); cx.strokeStyle = 'rgba(40,28,18,0.9)'; cx.lineWidth = 2.5; cx.beginPath(); cx.moveTo(R.tip[0], R.tip[1]); cx.lineTo(R.tip[0] + 6, R.tip[1] + 26 * Math.min(1, (t - T_BITE) / 0.1)); cx.stroke(); cx.restore(); }
      samLegs(cx, sam, t); samInk(cx, sam, t, 0.5); samOver(cx, Object.assign({}, sam, { band: { a: 0 }, e: { a: 0 }, sweat: 0, a: 0.28 }), t); samBand(cx, sam, t); samEyes(cx, sam, t, eyes[0], eyes[1]);
      const mw = sMouthAt(t); if (mw > 0.08) { const m = mouthG, o = 0.3 + 0.9 * mw; cx.save(); cx.translate(m[0], m[1]); cx.fillStyle = '#F1E9D8'; cx.beginPath(); cx.ellipse(0, 0, SAMS * 0.1 * (0.6 + 0.4 * mw), SAMS * 0.1 * o, 0, 0, 7); cx.fill(); cx.fillStyle = '#7A1B15'; cx.beginPath(); cx.ellipse(0, SAMS * 0.02, SAMS * 0.07 * (0.6 + 0.4 * mw), SAMS * 0.07 * o, 0, 0, 7); cx.fill(); cx.restore(); }
      samArms(cx, sam, t, hands, 0.17);
      if (brushHeld(t)) brushDraw(cx, true, hands[1], t);
      fishDraw(cx, fish[0], fish[1], fr, fs * 1.25, fa);
    } });
  // ---- lantern light: grade the whole frame (multiply), then moonlight, dust motes, the lantern itself ----
  const m = mctx; m.save(); m.setTransform(1, 0, 0, 1, 0, 0);
  const rad = 340 + 560 * Lc, ci = [lerp(88, 255, Lc), lerp(92, 246, Lc), lerp(126, 226, Lc)], co = [lerp(52, 234, Lc), lerp(62, 236, Lc), lerp(108, 240, Lc)], cm = ci.map((v, i) => lerp(v, co[i], 0.55));
  const gr = m.createRadialGradient(LAMP[0], LAMP[1], 30, LAMP[0], LAMP[1], rad); gr.addColorStop(0, `rgb(${ci.map(Math.round)})`); gr.addColorStop(0.45, `rgb(${cm.map(Math.round)})`); gr.addColorStop(1, `rgb(${co.map(Math.round)})`);
  m.globalCompositeOperation = 'multiply'; m.fillStyle = gr; m.fillRect(0, 0, 1080, 1920);
  m.globalCompositeOperation = 'screen';
  { const ma = 0.2 * (1 - Lc), mg = m.createLinearGradient(880, 470, 520, 1400); mg.addColorStop(0, `rgba(150,180,255,${ma})`); mg.addColorStop(1, 'rgba(150,180,255,0)'); m.fillStyle = mg; m.beginPath(); m.moveTo(790, 520); m.lineTo(1000, 480); m.lineTo(700, 1480); m.lineTo(420, 1480); m.closePath(); m.fill(); }
  const gl = m.createRadialGradient(LAMP[0], LAMP[1], 10, LAMP[0], LAMP[1], 70 + 330 * Lv); gl.addColorStop(0, `rgba(255,214,130,${0.55 * Lc})`); gl.addColorStop(1, 'rgba(255,200,110,0)'); m.fillStyle = gl; m.fillRect(0, 0, 1080, 1920);
  if (Lc > 0.08) for (let k = 0; k < 28; k++) { const a = hsh1(k * 3.1) * PI2, r = 70 + 330 * hsh1(k * 7.7), sp = 0.15 + 0.2 * hsh1(k), x = LAMP[0] + r * Math.cos(a + t * 0.05 * sp) + 12 * Math.sin(t * sp * 3 + k), y = LAMP[1] + r * 0.75 * Math.sin(a) - 14 * ((t * sp * 6 + k * 13) % 20) / 20 + 8 * Math.sin(t * sp * 2 + k * 2), al = 0.55 * Lc * (1 - r / 420) * (0.6 + 0.4 * Math.sin(t * 2 + k)); if (al > 0.02) { m.fillStyle = `rgba(255,236,190,${al})`; m.beginPath(); m.arc(x, y, 1.2 + 1.1 * hsh1(k * 5.3), 0, PI2); m.fill(); } }
  m.globalCompositeOperation = 'source-over';
  const sway = imp(t, T_BITE - 0.03, 0.1, 0.8, 7) + imp(t, T_STUM, 0.05, 0.7, 7) + imp(t, T_SPR + 0.8, 0.06, 0.7, 7) + 0.012 * Math.sin(t * 1.3) * Lc;
  m.translate(LAMP[0], LAMP[1] - 66); m.rotate(sway); m.translate(0, 66); m.strokeStyle = INKC; m.lineWidth = 3.5; m.beginPath(); m.moveTo(0, -60); m.lineTo(0, -66); m.stroke();
  const lg = m.createRadialGradient(0, 0, 4, 0, 0, 62); const cin = [lerp(120, 255, Lc), lerp(80, 240, Lc), lerp(60, 190, Lc)], cout = [lerp(86, 238, Lc), lerp(52, 160, Lc), lerp(40, 70, Lc)];
  lg.addColorStop(0, `rgb(${cin.map(Math.round)})`); lg.addColorStop(1, `rgb(${cout.map(Math.round)})`); m.fillStyle = lg; m.beginPath(); m.ellipse(0, 0, 46, 58, 0, 0, PI2); m.fill(); m.stroke();
  m.strokeStyle = `rgba(120,60,20,${0.5 + 0.2 * Lc})`; m.lineWidth = 2.5; for (const k of [-0.62, 0, 0.62]) { m.beginPath(); m.ellipse(0, 0, 46 * Math.abs(k) + 1, 58, 0, 0, PI2); m.stroke(); } for (const yy of [-16, 16]) { m.beginPath(); m.ellipse(0, yy * 2.1, 40 * Math.sqrt(1 - (yy * 2.1 / 58) ** 2), 4, 0, 0, PI2); m.stroke(); }
  m.fillStyle = '#2E2A2A'; m.fillRect(-18, -62, 36, 9); m.fillRect(-18, 54, 36, 9); m.strokeStyle = INKC; m.lineWidth = 3; m.strokeRect(-18, -62, 36, 9); m.strokeRect(-18, 54, 36, 9);
  m.strokeStyle = '#B3271F'; m.lineWidth = 3.5; m.beginPath(); m.moveTo(0, 63); m.lineTo(2 * Math.sin(t * 3), 84); m.stroke(); m.fillStyle = '#B3271F'; m.beginPath(); m.arc(2 * Math.sin(t * 3), 86, 4, 0, PI2); m.fill();
  if (Lv > 1.1) { m.globalCompositeOperation = 'screen'; const a = 0.5 * clamp((Lv - 1.1) / 0.3); m.strokeStyle = `rgba(255,240,200,${a})`; m.lineWidth = 3; m.beginPath(); m.moveTo(-90, 0); m.lineTo(90, 0); m.moveTo(0, -100); m.lineTo(0, 100); m.stroke(); }
  m.restore();
  // sparks at the dynamo when the lamp is overdriven
  if (Lv > 1.05) { m.save(); m.strokeStyle = '#FFE9A0'; m.lineWidth = 3; m.lineCap = 'round'; const q = Math.floor(t * 18); for (let k = 0; k < 7; k++) { const a = hsh1(q * 7 + k) * PI2, r0 = 24 + 20 * hsh1(q + k * 3), r1 = r0 + 12 + 14 * hsh1(q * 3 + k); m.beginPath(); m.moveTo(DYN[0] + 66 + r0 * Math.cos(a), DYN[1] - 46 + r0 * Math.sin(a)); m.lineTo(DYN[0] + 66 + r1 * Math.cos(a), DYN[1] - 46 + r1 * Math.sin(a)); m.stroke(); } m.restore(); }
}
function initStory(canvas) { deepFreeze(P_SIT); initEngine(canvas); initCast(); }
