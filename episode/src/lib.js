'use strict';
// ================= "ฟองสบู่ห้ามแตก" — courtyard scene + props + the bubble =================
// Wordless. No letters anywhere. Cast = ink samurai + Mochi. The bubble is a PROP (a soap bubble that only SHARP things pop).
const FL = 1400, SAMS = 125, REDC2 = '#B3271F';
const sw = (t, n, ph = 0) => Math.sin(t * 2 * Math.PI * n / 6.4 + ph);
const rect = (c, x, y, w, h) => { c.beginPath(); c.rect(x, y, w, h); };
const PAPERF = '#F6EEDD';
const PI2 = Math.PI * 2;

// ---------- smooth motion: Hermite spline through keys [t, v1, v2, ...] (no stop at every key -> fluid, not stiff) ----------
// a key repeated with the same values (or equal to a neighbour) becomes a rest (zero tangent)
function KS(keys, t) {
  const n = keys.length; if (t <= keys[0][0]) return keys[0].slice(1); if (t >= keys[n - 1][0]) return keys[n - 1].slice(1);
  let i = 1; while (i < n - 1 && t > keys[i][0]) i++;
  const a = keys[i - 1], b = keys[i], dt = b[0] - a[0], u = (t - a[0]) / dt, u2 = u * u, u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  const tan = (k, j) => { const p = keys[k], q = keys[k - 1], r = keys[k + 1]; if (!q || !r) return 0; if (p[j] === q[j] || p[j] === r[j]) return 0; return (r[j] - q[j]) / (r[0] - q[0]); };
  const out = []; for (let j = 1; j < a.length; j++) out.push(h00 * a[j] + h10 * dt * tan(i - 1, j) + h01 * b[j] + h11 * dt * tan(i, j)); return out;
}
const ks1 = (keys, t) => KS(keys, t)[0];
const ss = (a, b, x) => { const q = clamp((x - a) / (b - a)); return q * q * (3 - 2 * q); };
const wnd = (a, b, t, e = 0.25) => ss(a, a + e, t) * (1 - ss(b - e, b, t));
const arc = (t, t0, h, d) => (t > t0 && t < t0 + d ? h * Math.sin(Math.PI * (t - t0) / d) : 0);
const imp = (t, t0, a, tau, w = 0) => { if (t < t0) return 0; const d = t - t0; return a * Math.exp(-d / tau) * (w ? Math.sin(w * d) : 1) * ss(t0, t0 + 0.04, t); };

// ---------- scene ----------
function skyTint(t) { // 0 day .. 1 dusk .. 2 night
  return ss(100.5, 110, t) + ss(112, 120, t);
}
function wallBG(c, t, E) {
  const g = c.createLinearGradient(0, 0, 0, 980); g.addColorStop(0, '#F3ECD7'); g.addColorStop(1, '#E7DBB9'); c.fillStyle = g; c.fillRect(-300, -300, 1680, 1280);
  // far mountains (ink wash)
  for (const [y0, col, ph, a] of [[860, 'rgba(120,128,126,0.20)', 0, 1], [900, 'rgba(90,100,100,0.26)', 2.3, 1], [935, 'rgba(60,66,66,0.30)', 4.1, 1]]) {
    c.fillStyle = col; c.beginPath(); c.moveTo(-100, 980); for (let x = -100; x <= 1180; x += 40) c.lineTo(x, y0 - 70 * Math.abs(Math.sin(x * 0.0051 + ph)) - 30 * Math.sin(x * 0.013 + ph * 2)); c.lineTo(1180, 980); c.closePath(); c.fill(); }
  // distant mist
  const m = c.createLinearGradient(0, 780, 0, 990); m.addColorStop(0, 'rgba(243,236,215,0)'); m.addColorStop(1, 'rgba(243,236,215,0.7)'); c.fillStyle = m; c.fillRect(-300, 780, 1680, 210);
  // bamboo (left)
  for (const [x, w, top] of [[40, 18, 130], [112, 14, 250], [-6, 20, 60]]) { c.fillStyle = '#7F8F52'; c.fillRect(x, top, w, 980 - top); c.strokeStyle = INKC; c.lineWidth = 3.5; c.strokeRect(x, top, w, 980 - top);
    for (let y = top + 90; y < 960; y += 150) { c.fillStyle = '#566638'; c.fillRect(x - 2, y, w + 4, 8); c.strokeRect(x - 2, y, w + 4, 8); } }
  for (let k = 0; k < 7; k++) { const x = 60 + 38 * k, y = 300 + 130 * ((k * 0.37) % 1) + 40 * k; c.save(); c.translate(x, y); c.rotate(-0.6 + 0.2 * k + 0.1 * Math.sin(t * 0.8 + k)); c.fillStyle = '#8CA05A'; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(50, -14, 120, 6); c.quadraticCurveTo(50, 12, 0, 0); c.fill(); c.strokeStyle = INKC; c.lineWidth = 2.5; c.stroke(); c.restore(); }
  // plaster garden wall + tiled cap
  c.fillStyle = '#E9DDBE'; c.fillRect(-300, 980, 1680, FL - 980);
  for (let k = 0; k < 38; k++) { c.fillStyle = `rgba(150,120,80,${0.025 + 0.03 * hash(k, 3)})`; c.fillRect(-300 + k * 46, 980, 3, FL - 980); }
  c.fillStyle = '#4A3828'; c.fillRect(-300, 970, 1680, 30); c.strokeStyle = INKC; c.lineWidth = 4; c.strokeRect(-304, 970, 1688, 30);
  c.fillStyle = '#5A5146'; for (let x = -300; x < 1400; x += 74) { c.beginPath(); c.moveTo(x, 970); c.quadraticCurveTo(x + 37, 928, x + 74, 970); c.fill(); c.stroke(); }
  c.fillStyle = '#C8AE80'; c.fillRect(-300, FL - 120, 1680, 120); c.beginPath(); c.moveTo(-300, FL - 120); c.lineTo(1380, FL - 120); c.stroke();
  // eave beam (top) and wind chime
  c.fillStyle = '#4A3828'; c.fillRect(-300, 0, 1680, 150); c.strokeStyle = INKC; c.lineWidth = 5; c.strokeRect(-304, -4, 1688, 154);
  c.fillStyle = '#5E4A36'; for (let x = -300; x < 1400; x += 120) { c.fillRect(x, 0, 6, 150); }
  windChime(c, 905, 150, E.chime, t);
  pineBranch(c, E.pine, t);
}
function windChime(c, x, y, k, t) {
  const sw_ = 0.06 * Math.sin(t * 1.3) + k; c.save(); c.translate(x, y); c.rotate(sw_); c.strokeStyle = INKC; c.lineWidth = 3;
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 120); c.stroke(); c.fillStyle = '#6EA1AD'; c.globalAlpha = 0.85; c.beginPath(); c.moveTo(-44, 120); c.quadraticCurveTo(-46, 64, 0, 52); c.quadraticCurveTo(46, 64, 44, 120); c.closePath(); c.fill(); c.globalAlpha = 1; c.stroke();
  c.beginPath(); c.moveTo(-50, 120); c.lineTo(50, 120); c.stroke();
  c.beginPath(); c.arc(0, 140, 7, 0, PI2); c.fillStyle = '#D9B25A'; c.fill(); c.stroke();
  c.save(); c.translate(0, 130); c.rotate(-sw_ * 2.2 + 0.05 * Math.sin(t * 2.7)); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 90); c.stroke(); // blank paper strip (no writing)
  c.fillStyle = '#F6EEDD'; c.beginPath(); c.roundRect(-14, 80, 28, 90, 3); c.fill(); c.stroke(); c.restore(); c.restore();
}
function pineBranch(c, k, t) { // pine branch with needle clusters, top right; k = sway
  c.save(); c.translate(1080, 330); c.rotate(0.05 * k); c.translate(-1080, -330);
  brushPts(c, [[1130, 250], [1000, 330], [880, 360], [770, 420], [700, 450]], { w: 38, a: 1, taper: 0.5, head: 0.1, stri: 0.3, seed: 31, rag: 0.12 }, 2);
  brushPts(c, [[900, 355], [860, 280], [820, 255]], { w: 14, a: 1, taper: 0.5, head: 0.1, seed: 33 }, 2);
  for (const [px, py, s] of [[700, 450, 1], [770, 420, 0.8], [830, 385, 0.85], [820, 255, 0.9], [940, 340, 0.7], [1010, 320, 0.7]]) {
    c.strokeStyle = '#3E4E2D'; c.lineWidth = 3.2; c.lineCap = 'round';
    for (let i = 0; i < 17; i++) { const a = -2.6 + i * 0.27 + 0.05 * Math.sin(t * 0.9 + i + px), L = 62 * s * (0.8 + 0.4 * hash(i, px)); c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.cos(a) * L, py + Math.sin(a) * L * 0.9 + 14 * s); c.stroke(); } }
  c.restore();
}
function deckBG(c, wet) {
  c.save(); rect(c, -300, FL, 1700, 1200); c.clip(); c.fillStyle = '#C9A56E'; c.fillRect(-300, FL, 1700, 1200);
  for (let i = 0; i < 12; i++) { const y0 = FL + 38 * i * (1 + 0.14 * i), y1 = FL + 38 * (i + 1) * (1 + 0.14 * (i + 1)); c.fillStyle = i % 2 ? 'rgba(130,90,48,0.10)' : 'rgba(255,230,170,0.06)'; c.fillRect(-300, y0, 1700, y1 - y0);
    c.fillStyle = 'rgba(70,46,24,0.55)'; c.fillRect(-300, y0 - 1, 1700, 3 + 0.4 * i);
    for (let k = -8; k <= 8; k++) { const jx = 540 + (k * 330 + 170 * (i % 3)) * (1 + 0.1 * i); c.fillStyle = 'rgba(70,46,24,0.35)'; c.fillRect(jx, y0, 3, y1 - y0); } }
  for (let k = 0; k < 60; k++) { c.strokeStyle = `rgba(120,80,40,${0.05 + 0.05 * hash(k, 9)})`; c.lineWidth = 2; const y = FL + 20 + hash(k, 4) * 480, x = hash(k, 5) * 1100; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 80 + 120 * hash(k, 6), y + 2); c.stroke(); }
  const ao = c.createLinearGradient(0, FL, 0, FL + 100); ao.addColorStop(0, 'rgba(40,26,10,0.5)'); ao.addColorStop(1, 'rgba(40,26,10,0)'); c.fillStyle = ao; c.fillRect(-300, FL, 1700, 100);
  if (wet > 0) { c.fillStyle = `rgba(60,44,28,${0.22 * wet})`; c.fillRect(-300, FL, 1700, 700); }
  c.restore();
}
function sunDust(c, t) { c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 18; i++) { const x = 100 + 880 * hash(i, 1) + 24 * Math.sin(t * 0.5 + i), y = 300 + 1000 * ((hash(i, 2) + t * 0.01 * (0.4 + hash(i, 3))) % 1), a = 0.1 + 0.1 * hash(i, 4); c.fillStyle = `rgba(255,236,180,${a})`; c.beginPath(); c.arc(x, y, 2 + 2.4 * hash(i, 5), 0, PI2); c.fill(); } c.restore(); }
// sky overlay for rain / dusk / night (drawn over scene, under characters? -> over background only)
function skyOverlay(c, rain, dusk, night) {
  if (rain > 0.01) { c.fillStyle = `rgba(70,84,96,${0.34 * rain})`; c.fillRect(-300, -300, 1680, 2600); }
  if (dusk > 0.01) { const g = c.createLinearGradient(0, 0, 0, FL); g.addColorStop(0, `rgba(94,74,110,${0.38 * dusk})`); g.addColorStop(0.6, `rgba(232,142,84,${0.34 * dusk})`); g.addColorStop(1, `rgba(236,160,96,${0.22 * dusk})`); c.fillStyle = g; c.fillRect(-300, -300, 1680, FL + 300); }
  if (night > 0.01) { c.fillStyle = `rgba(30,34,70,${0.34 * night})`; c.fillRect(-300, -300, 1680, 2600); }
}
function skyStars(c, t, k) { if (k <= 0.01) return; c.save(); for (let i = 0; i < 26; i++) { const x = 40 + 1000 * hash(i, 11), y = 200 + 560 * hash(i, 12), a = k * (0.5 + 0.5 * Math.sin(t * 1.4 + i)) ; c.fillStyle = `rgba(255,244,200,${0.8 * a})`; c.beginPath(); c.arc(x, y, 2 + 2 * hash(i, 13), 0, PI2); c.fill(); }
  c.fillStyle = `rgba(255,246,214,${0.9 * k})`; c.beginPath(); c.arc(200, 560, 46, 0, PI2); c.clip(); c.beginPath(); c.rect(0, 0, 1080, 1920); c.arc(228, 548, 40, 0, PI2); c.fill('evenodd'); c.restore(); }

// ---------- the bubble ----------
// o: {x,y,r, sx,sy (squash, volume kept by caller), rot (axis of sx), wob:[[amp, mode, phase]], t, a, tint}
function bubbleBig(c, o) {
  const N = 72, pts = [], ca = Math.cos(o.rot || 0), sa = Math.sin(o.rot || 0);
  for (let i = 0; i < N; i++) { const a = i / N * PI2; let rr = 1; for (const [amp, m, ph] of (o.wob || [])) rr += amp * Math.cos(m * a + ph);
    const lx = Math.cos(a) * rr * (o.sx || 1), ly = Math.sin(a) * rr * (o.sy || 1); pts.push([o.x + o.r * (lx * ca - ly * sa), o.y + o.r * (lx * sa + ly * ca)]); }
  const path = () => { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); };
  c.save(); c.globalAlpha = o.a ?? 1;
  // thin film body: nearly clear in the middle, milky at the rim
  const g = c.createRadialGradient(o.x, o.y, o.r * 0.2, o.x, o.y, o.r * 1.12); g.addColorStop(0, 'rgba(255,255,255,0.08)'); g.addColorStop(0.7, 'rgba(255,255,255,0.2)'); g.addColorStop(1, 'rgba(255,252,240,0.62)');
  path(); c.fillStyle = g; c.fill();
  // iridescent bands (palette-friendly: red, gold, pale ink-blue) sliding over the film
  c.save(); path(); c.clip(); const T = (o.t || 0);
  for (let k = 0; k < 3; k++) { const col = ['rgba(179,39,31,0.22)', 'rgba(217,178,90,0.26)', 'rgba(104,140,160,0.24)'][k]; c.strokeStyle = col; c.lineWidth = o.r * 0.11; c.beginPath(); c.arc(o.x - o.r * 0.1, o.y - o.r * 0.1, o.r * (0.78 + 0.07 * k + 0.02 * Math.sin(T * 0.9 + k * 2)), 0.5 + k * 0.5 + 0.25 * Math.sin(T * 0.6 + k), 1.35 + k * 0.5 + 0.25 * Math.sin(T * 0.6 + k)); c.stroke(); }
  c.restore();
  path(); c.strokeStyle = 'rgba(22,19,18,0.78)'; c.lineWidth = 3.8; c.stroke();
  // highlights
  c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineCap = 'round'; c.lineWidth = Math.max(3, o.r * 0.06); c.beginPath(); c.arc(o.x, o.y, o.r * 0.78, -2.55 + (o.rot || 0) * 0.2, -1.8 + (o.rot || 0) * 0.2); c.stroke();
  c.lineWidth = Math.max(2, o.r * 0.03); c.beginPath(); c.arc(o.x, o.y, o.r * 0.78, 0.5, 0.78); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.ellipse(o.x - o.r * 0.42, o.y - o.r * 0.5, o.r * 0.07, o.r * 0.045, -0.6, 0, PI2); c.fill();
  c.restore(); return pts;
}
function tingRingsB(c, x, y, k, a = 1) { // small ring arcs for a near-miss (the rule's mark): three arcs expand and fade
  if (k < 0 || k > 1) return; c.save(); c.strokeStyle = INKC; c.lineCap = 'round'; for (let i = 0; i < 3; i++) { const r = 20 + 22 * i + 26 * k, al = (1 - k) * a; c.globalAlpha = al; c.lineWidth = 4 - i * 0.7; c.beginPath(); c.arc(x, y, r, -0.95, -0.3); c.stroke(); c.beginPath(); c.arc(x, y, r, -2.85, -2.2); c.stroke(); } c.restore();
}
function sparkBurst(c, x, y, k, n = 10, R = 90) { if (k < 0 || k > 1) return; c.save(); for (let i = 0; i < n; i++) { const a = i * PI2 / n + 0.3, d = R * (0.35 + 0.65 * k) * (0.7 + 0.3 * hash(i, 5)); c.globalAlpha = 1 - k; c.fillStyle = ['#F8E6A0', '#FFFFFF', '#E8B0A8', '#B8D4DC'][i % 4]; c.beginPath(); c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 5 + 4 * (1 - k), 0, PI2); c.fill(); c.strokeStyle = INKC; c.lineWidth = 1.5; c.stroke(); } c.restore(); }

// ---------- props ----------
function bowl(c, x, y, s = 1, foam = 1) { // wooden soap bowl, y = floor
  c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = '#8C5E34'; c.beginPath(); c.moveTo(-72, -58); c.quadraticCurveTo(-60, 0, -34, 0); c.lineTo(34, 0); c.quadraticCurveTo(60, 0, 72, -58); c.closePath(); c.fill(); c.strokeStyle = INKC; c.lineWidth = 5; c.stroke();
  c.fillStyle = '#6E4724'; c.beginPath(); c.ellipse(0, -58, 72, 14, 0, 0, PI2); c.fill(); c.stroke();
  c.fillStyle = 'rgba(236,244,246,0.9)'; c.beginPath(); c.ellipse(0, -60, 62, 10, 0, 0, PI2); c.fill();
  if (foam) { for (const [fx, fy, fr] of [[-28, -66, 10], [-6, -72, 13], [20, -68, 11], [40, -63, 8]]) { c.fillStyle = 'rgba(255,255,255,0.95)'; c.beginPath(); c.arc(fx, fy, fr, 0, PI2); c.fill(); c.strokeStyle = 'rgba(22,19,18,0.5)'; c.lineWidth = 2; c.stroke(); } } c.restore();
}
function wandRing(c, hx, hy, ang, film = 0, t = 0, R = 36) { // handle from hand at angle, ring at the end; film 0..1
  c.save(); c.translate(hx, hy); c.rotate(ang); c.strokeStyle = '#8C5E34'; c.lineCap = 'round'; c.lineWidth = 9; c.beginPath(); c.moveTo(-26, 0); c.lineTo(64, 0); c.stroke();
  c.strokeStyle = INKC; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-26, -4.5); c.lineTo(64, -4.5); c.moveTo(-26, 4.5); c.lineTo(64, 4.5); c.stroke();
  c.translate(64 + R, 0);
  if (film > 0.01) { c.fillStyle = `rgba(255,255,255,${0.26 * film})`; c.beginPath(); c.ellipse(0, 0, R * 0.96, R, 0, 0, PI2); c.fill(); c.strokeStyle = `rgba(179,39,31,${0.35 * film})`; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, R * 0.6, 0.4 + t, 1.5 + t); c.stroke(); c.strokeStyle = `rgba(104,140,160,${0.4 * film})`; c.beginPath(); c.arc(0, 0, R * 0.45, 3.5 + t, 4.6 + t); c.stroke(); }
  c.strokeStyle = '#B5B8BC'; c.lineWidth = 7; c.beginPath(); c.ellipse(0, 0, R, R * 1.02, 0, 0, PI2); c.stroke(); c.strokeStyle = INKC; c.lineWidth = 2.6; c.beginPath(); c.ellipse(0, 0, R + 3.5, R * 1.02 + 3.5, 0, 0, PI2); c.stroke(); c.beginPath(); c.ellipse(0, 0, R - 3.5, R * 1.02 - 3.5, 0, 0, PI2); c.stroke();
  c.restore();
}
function leaf(c, x, y, rot, s = 1, flip = 0) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s * (1 - 0.8 * flip)); c.fillStyle = '#B5622E'; c.beginPath(); c.moveTo(-52, 0); c.quadraticCurveTo(-8, -34, 54, 0); c.quadraticCurveTo(-8, 34, -52, 0); c.fill(); c.strokeStyle = INKC; c.lineWidth = 3.5; c.stroke();
  c.strokeStyle = 'rgba(80,36,14,0.8)'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(-50, 0); c.lineTo(48, 0); for (const k of [-30, -6, 20]) { c.moveTo(k, 0); c.lineTo(k + 16, -16); c.moveTo(k, 0); c.lineTo(k + 16, 16); } c.stroke(); c.restore();
}
function dragonfly(c, x, y, rot, t, s = 1) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s); const fl = Math.sin(t * 70);
  c.fillStyle = 'rgba(210,235,240,0.7)'; c.strokeStyle = 'rgba(22,19,18,0.8)'; c.lineWidth = 2;
  for (const [dx, sy] of [[-6, -1], [6, -1], [-6, 1], [6, 1]]) { c.save(); c.translate(dx, 0); c.scale(1, 0.55 + 0.45 * fl * sy); c.beginPath(); c.ellipse(0, -38 * sy, 12, 34, dx * 0.03, 0, PI2); c.fill(); c.stroke(); c.restore(); }
  c.strokeStyle = INKC; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -14); c.lineTo(0, 66); c.stroke();
  c.fillStyle = REDC2; c.beginPath(); c.arc(0, -16, 10, 0, PI2); c.fill(); c.stroke();
  c.strokeStyle = INKC; c.lineWidth = 2; for (const k of [-1, 1]) { c.beginPath(); c.moveTo(0, 0); c.lineTo(k * 14, 12); c.stroke(); }
  c.fillStyle = '#EFE7D4'; c.beginPath(); c.arc(-4, -19, 3, 0, PI2); c.arc(4, -19, 3, 0, PI2); c.fill(); c.restore();
}
// wagasa umbrella. (x,y) = top of the shaft's grip point; ang = tilt; open 0..1; flip 0..1 (blown inside out)
function wagasa(c, x, y, ang, open = 1, flip = 0, water = 0) {
  c.save(); c.translate(x, y); c.rotate(ang); const L = 270, W = 200 * open;
  c.strokeStyle = '#8C5E34'; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 60); c.lineTo(0, -L); c.stroke();
  const cy = -L + 30; c.save(); c.translate(0, cy); c.scale(1, 1 - 2 * flip);
  c.fillStyle = REDC2; c.beginPath(); c.moveTo(-W, 40 * open); c.quadraticCurveTo(-W * 0.9, -90 * open - 30, 0, -112 * open - 24); c.quadraticCurveTo(W * 0.9, -90 * open - 30, W, 40 * open); c.quadraticCurveTo(0, 56 * open, -W, 40 * open); c.fill(); c.strokeStyle = INKC; c.lineWidth = 5; c.stroke();
  c.strokeStyle = 'rgba(246,238,221,0.85)'; c.lineWidth = 3; for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(0, -112 * open - 24); c.quadraticCurveTo(i * W * 0.3, -30 * open, i * W * 0.32, 40 * open); c.stroke(); }
  c.fillStyle = 'rgba(246,238,221,0.9)'; c.beginPath(); c.ellipse(0, -66 * open, W * 0.3, 11 * open + 2, 0, 0, PI2); c.fill(); c.strokeStyle = INKC; c.lineWidth = 3; c.stroke(); c.restore();
  if (water > 0) { c.fillStyle = `rgba(150,190,205,${0.9})`; c.beginPath(); c.ellipse(0, cy + 6, W * 0.8 * water, 18 * water, 0, 0, PI2); c.fill(); }
  c.restore();
}
function fanUchiwa(c, x, y, ang, flap = 0) { // handle grip at (x,y), round red face along ang
  c.save(); c.translate(x, y); c.rotate(ang); c.fillStyle = '#C79B5F'; c.fillRect(-10, -9, 90, 18); c.strokeStyle = INKC; c.lineWidth = 4; c.strokeRect(-10, -9, 90, 18);
  c.translate(80 + 78, 0); c.scale(1 - 0.12 * Math.abs(flap), 1); c.fillStyle = '#F2E7D0'; c.beginPath(); c.ellipse(0, 0, 80, 96, 0, 0, PI2); c.fill(); c.stroke();
  c.fillStyle = REDC2; c.beginPath(); c.arc(0, 0, 38, 0, PI2); c.fill(); c.strokeStyle = INKC; c.lineWidth = 3; c.stroke(); c.restore();
}
function tub(c, x, y) { // wooden wash tub with soapy water, y = floor
  c.save(); c.translate(x, y); c.fillStyle = '#A57B4A'; c.beginPath(); c.moveTo(-150, -150); c.lineTo(-130, 0); c.lineTo(130, 0); c.lineTo(150, -150); c.closePath(); c.fill(); c.strokeStyle = INKC; c.lineWidth = 6; c.stroke();
  c.strokeStyle = '#4A3828'; c.lineWidth = 10; for (const yy of [-110, -45]) { c.beginPath(); c.moveTo(-142 + (yy + 150) * -0.0, yy); c.lineTo(142, yy); c.stroke(); }
  c.fillStyle = '#7C5530'; c.beginPath(); c.ellipse(0, -150, 150, 26, 0, 0, PI2); c.fill(); c.stroke();
  c.fillStyle = 'rgba(236,244,246,0.95)'; c.beginPath(); c.ellipse(0, -152, 136, 19, 0, 0, PI2); c.fill();
  for (const [fx, fy, fr] of [[-70, -156, 16], [-20, -164, 20], [40, -158, 17], [90, -154, 13], [-100, -150, 11]]) { c.fillStyle = 'rgba(255,255,255,0.95)'; c.beginPath(); c.arc(fx, fy, fr, 0, PI2); c.fill(); c.strokeStyle = 'rgba(22,19,18,0.5)'; c.lineWidth = 2; c.stroke(); } c.restore();
}
function hoop(c, hx, hy, ang, R = 92, film = 0, t = 0) { // big rope hoop on a stick; hand at (hx,hy)
  c.save(); c.translate(hx, hy); c.rotate(ang); c.strokeStyle = '#8C5E34'; c.lineCap = 'round'; c.lineWidth = 10; c.beginPath(); c.moveTo(-20, 0); c.lineTo(70, 0); c.stroke(); c.translate(70 + R, 0);
  if (film > 0.01) { c.fillStyle = `rgba(255,255,255,${0.2 * film})`; c.beginPath(); c.ellipse(0, 0, R * 0.3, R, 0, 0, PI2); c.fill(); }
  c.strokeStyle = '#C79B5F'; c.lineWidth = 11; c.beginPath(); c.ellipse(0, 0, R * 0.3, R, 0, 0, PI2); c.stroke(); c.strokeStyle = INKC; c.lineWidth = 2.6; c.beginPath(); c.ellipse(0, 0, R * 0.3 + 6, R + 6, 0, 0, PI2); c.stroke(); c.beginPath(); c.ellipse(0, 0, R * 0.3 - 6, R - 6, 0, 0, PI2); c.stroke(); c.restore();
}
function cushion(c, x, y, sq) { const h = 40 - 20 * sq, w = 250 + 22 * sq; c.save(); c.translate(x, y); c.fillStyle = '#3F5662'; c.beginPath(); c.roundRect(-w / 2, -h, w, h, 9); c.fill(); c.strokeStyle = INKC; c.lineWidth = 5; c.stroke(); c.strokeStyle = 'rgba(243,234,214,0.75)'; c.lineWidth = 3; c.beginPath(); c.moveTo(-w / 2 + 12, -h * 0.5); c.lineTo(w / 2 - 12, -h * 0.5); c.stroke(); c.fillStyle = REDC2; for (const s of [-1, 1]) { c.beginPath(); c.arc(s * (w / 2 - 6), -h + 4, 7, 0, 7); c.fill(); c.stroke(); } c.restore(); }
function puffLines(c, x, y, ang, k, s = 1) { // wind from the mouth: three tapering brush strokes
  if (k <= 0 || k >= 1) return; c.save(); c.translate(x, y); c.rotate(ang); c.strokeStyle = INKC; c.lineCap = 'round'; for (let i = -1; i <= 1; i++) { c.globalAlpha = 0.85 * (1 - k); c.lineWidth = 4.5 - Math.abs(i) * 1.2; const L0 = 30 + 70 * k, L1 = L0 + 46 * s; c.beginPath(); c.moveTo(L0, i * 18 * (0.6 + k)); c.quadraticCurveTo((L0 + L1) / 2, i * 24 * (0.6 + k) + i * 6, L1, i * 30 * (0.6 + k)); c.stroke(); } c.restore();
}
function gustSwirl(c, t, a, b, dir, str) { // the Wind: long ink streaks sweeping across the sky with little curls
  const k = (t - a) / (b - a); if (k < 0 || k > 1) return; const al = Math.sin(Math.PI * k); c.save(); c.strokeStyle = INKC; c.lineCap = 'round';
  for (let i = 0; i < 5; i++) { const y = 380 + 130 * i + 40 * Math.sin(i * 2.1 + a), x0 = dir > 0 ? -200 + 1500 * (k * 1.1 - 0.05 * i) : 1280 - 1500 * (k * 1.1 - 0.05 * i); c.globalAlpha = 0.55 * al * str; c.lineWidth = 6 - i * 0.6;
    const L = 360 + 80 * i; c.beginPath(); c.moveTo(x0, y); c.bezierCurveTo(x0 + dir * L * 0.4, y - 26, x0 + dir * L * 0.7, y + 28, x0 + dir * L, y - 4); c.stroke();
    c.beginPath(); c.arc(x0 + dir * L, y - 22, 20 + 6 * i, dir > 0 ? 1.6 : 1.5, dir > 0 ? 4.8 : 4.7, dir < 0); c.stroke(); }
  c.restore();
}
function rainLayer(c, t, k) { if (k <= 0.02) return; c.save(); c.strokeStyle = `rgba(70,96,112,${0.55 * k})`; c.lineWidth = 3; c.lineCap = 'round'; for (let i = 0; i < 90; i++) { const sp = 1500 + 400 * hash(i, 1), x = (hash(i, 2) * 1500 - 150 + t * 120) % 1380 - 150, y = ((hash(i, 3) * 2200 + t * sp) % 2200) - 150; if (y < 150) continue; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 12, y + 62); c.stroke(); } c.restore(); }
function puddle(c, x, y, k, t) { if (k <= 0.01) return; c.save(); c.globalAlpha = k; c.fillStyle = 'rgba(112,148,164,0.55)'; c.beginPath(); c.ellipse(x, y, 190, 34, 0, 0, PI2); c.fill(); c.strokeStyle = 'rgba(22,19,18,0.55)'; c.lineWidth = 3; c.stroke(); c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 2.5; c.beginPath(); c.ellipse(x - 30, y - 6, 70, 8, 0, 3.4, 5.9); c.stroke(); c.restore(); }
function splashDrops(c, x, y, k, n = 8, H = 60, W = 70) { if (k <= 0 || k >= 1) return; c.save(); c.fillStyle = 'rgba(160,196,210,0.95)'; c.strokeStyle = INKC; c.lineWidth = 1.5; for (let i = 0; i < n; i++) { const u = (i / (n - 1) - 0.5) * 2, px = x + u * W * k, py = y - H * (1 - u * u) * Math.sin(Math.PI * Math.min(1, k * 1.2)) * (1 - k * 0.2) + 6 * k; c.beginPath(); c.arc(px, py, 4.5 * (1 - 0.4 * k), 0, PI2); c.fill(); c.stroke(); } c.restore(); }
function firefly(c, x, y, t, a = 1) { c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(x, y, 0, x, y, 30); g.addColorStop(0, `rgba(255,240,150,${0.9 * a})`); g.addColorStop(1, 'rgba(255,240,150,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, 30, 0, PI2); c.fill(); c.restore(); c.fillStyle = `rgba(255,250,200,${a})`; c.beginPath(); c.arc(x, y, 4, 0, PI2); c.fill(); }
function dust(c, x, y, k, a = 1, r = 14) { if (k <= 0 || k >= 1) return; c.save(); for (let i = 0; i < 6; i++) { const dir = i < 3 ? -1 : 1, d = k * (30 + 16 * (i % 3)), px = x + dir * d * (0.8 + 0.3 * (i % 3)), py = y - 8 * (i % 3) - k * 20, rr = r * (0.7 + k * 1.2 + 0.2 * (i % 3)); c.fillStyle = `rgba(250,246,236,${0.7 * a * (1 - k)})`; c.beginPath(); c.arc(px, py, rr, 0, 7); c.fill(); } c.restore(); }
function bubble(c, x, y, r, a = 1) { if (r < 2) return; c.save(); c.globalAlpha = a; c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.strokeStyle = INKC; c.lineWidth = 4; c.stroke(); c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = 4; c.beginPath(); c.arc(x, y, r * 0.7, -2.6, -1.7); c.stroke(); c.restore(); }
function stars(c, x, y, k, n = 3, r = 40) { c.save(); c.translate(x, y); c.fillStyle = '#E8C55A'; c.strokeStyle = INKC; c.lineWidth = 3; for (let i = 0; i < n; i++) { const a = k * 6 + i * 6.283 / n, px = Math.cos(a) * r, py = Math.sin(a) * r * 0.4; c.save(); c.translate(px, py); c.rotate(a); c.beginPath(); for (let j = 0; j < 5; j++) { const aa = j * 1.2566 - 1.5708, a2 = aa + 0.6283; c.lineTo(Math.cos(aa) * 12, Math.sin(aa) * 12); c.lineTo(Math.cos(a2) * 5, Math.sin(a2) * 5); } c.closePath(); c.fill(); c.stroke(); c.restore(); } c.restore(); }

// ---------- characters ----------
function samState(x, o = {}) { return Object.assign({ x, y: FL - SAMS * 1.58, ground: FL, S: SAMS, face: -1, sx: 1, sy: 1, rot: 0, wob: 0.01, sw: { mode: 'none' }, band: { a: 1, wind: 0.3 }, a: 1, walk: null, w: 0, sneeze: 0, kick: 0, cold: 0, sad: 0, sweat: 0, strain: 0, shock: 0 }, o); }
function samBand(ctx, st, t) {
  const g = samGeom(st, t), S = st.S, ba = st.band.a, wind = st.band.wind;
  ctx.save(); pathPoly(ctx, g.pts); ctx.clip();
  const top = [], bot = []; for (let k = 0; k <= 16; k++) { const x = -1.2 + 2.4 * k / 16; top.push(g.X(x, -0.34 + 0.1 * x * x)); bot.push(g.X(x, -0.1 + 0.1 * x * x)); }
  fillPoly(ctx, top.concat(bot.slice().reverse()), REDC2, ba); ctx.restore(); ctx.globalAlpha = 1;
  const kn = g.X(-0.72, -0.22);
  for (const [dy, ph, ln] of [[0, 0, 1], [0.1, 1.3, 0.8]]) { const tp = []; for (let k = 0; k <= 7; k++) { const q = k / 7; tp.push(g.X(-0.72 - 1.0 * q * ln - 0.15 * wind * q, -0.22 + dy + 0.35 * q * (1.2 - wind * 0.8) + Math.sin(t * 2 + q * 3 + ph) * 0.08 * (0.4 + wind) * q)); }
    brushPts(ctx, tp, { w: S * 0.09, col: REDC2, a: ba, taper: 0.45, head: 0.1, stri: 0, dry: 0, seed: 20 + ph * 7, pf: 1 }, 2); }
  ctx.globalAlpha = ba; ctx.fillStyle = REDC2; ctx.beginPath(); ctx.ellipse(kn[0], kn[1], S * 0.12, S * 0.09, 0.4, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
}
function mochiPose(sw_) { const P = clonePose(P_SIT); if (sw_ > 0) { P.L.FN = [10, 15, 12 + 62 * sw_, -6 - 34 * sw_]; P.L.FF = [2, 15, 4 + 54 * sw_, -4 - 30 * sw_]; } return P; }
function mochi(x, y, s, t, o = {}) { return { mouth: {}, face: -1, kind: 'kit', col: ORG.k1, sd: 3, rot: o.rot || 0, pro: 'sit', x, y, s, pose: mochiPose(o.swat || 0), e: { sleep: o.sleep || 0, open: 1, wide: o.wide ?? 0.15, look: o.look || [0.3, -0.2], dil: 0.4 + 0.5 * (o.wide || 0), sparkle: 1 }, breath: 0.02 * sw(t, 3, 0.2), tailWig: o.tail ?? 0.12, tailPh: t * 2 * Math.PI / 6.4 * 2, earTw: 0.05 * sw(t, 5, 0.4), blush: 0.5, hTilt: o.tilt ?? 0.05, mode: 'walk' }; }

function initStory(canvas) { deepFreeze(P_SIT); initEngine(canvas); initCast(); }
