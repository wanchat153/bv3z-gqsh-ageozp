'use strict';
// ================= garden: scene + props. Wordless, no letters. Cast = ink samurai + Mochi. See ../REF.md =================
// stage: wall base y~1032, gravel from ~1115, characters stand at FL. Camera is locked [540,960,1] (identity) so static layers are cached.
const FL = 1262, SAMS = 125, REDC2 = '#B3271F', PI = Math.PI, PI2 = Math.PI * 2;
const sw = (t, n, ph = 0) => Math.sin(t * 2 * Math.PI * n / 6.4 + ph);
function KS(keys, t) { // Hermite spline through [t, v1, v2..]; repeated values = rest
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
const arc = (t, t0, h, d) => (t > t0 && t < t0 + d ? h * Math.sin(PI * (t - t0) / d) : 0);
const imp = (t, t0, a, tau, w = 0) => { if (t < t0) return 0; const d = t - t0; return a * Math.exp(-d / tau) * (w ? Math.sin(w * d) : 1) * ss(t0, t0 + 0.04, t); };
const ol = (c, w = 4) => { c.strokeStyle = INKC; c.lineWidth = w; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); };
const E = (c, x, y, rx, ry) => { c.moveTo(x + rx, y); c.ellipse(x, y, rx, ry, 0, 0, PI2); };
const CI = (c, x, y, r) => E(c, x, y, r, r);
const RR = (c, x, y, w, h, r) => { c.roundRect(x, y, w, h, r); };
const mix = (a, b, u) => { const pa = [1, 3, 5].map((i) => parseInt(a.substr(i, 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.substr(i, 2), 16)); return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * u).toString(16).padStart(2, '0')).join(''); };

// SH: shape with flat fill + inner shade (lower-right) + inner light (upper-left) + ink outline. path(c) appends subpaths (moveTo first).
function SH(c, path, o = {}) {
  const f = o.f || '#888', d = o.d || [10, 12];
  c.beginPath(); path(c); c.fillStyle = f; c.fill();
  if (o.sh || o.hl) {
    c.save(); c.beginPath(); path(c); c.clip();
    if (o.sh) { c.beginPath(); c.rect(-3000, -3000, 7000, 7000); c.save(); c.translate(-d[0], -d[1]); path(c); c.restore(); c.fillStyle = o.sh; c.fill('evenodd'); }
    if (o.hl) { c.beginPath(); c.rect(-3000, -3000, 7000, 7000); c.save(); c.translate(d[0] * 0.5, d[1] * 0.5); path(c); c.restore(); c.fillStyle = o.hl; c.fill('evenodd'); }
    if (o.tex) o.tex(c);
    c.restore();
  }
  if (o.line !== 0) { c.beginPath(); path(c); c.strokeStyle = o.lc || INKC; c.lineWidth = o.line || 3.5; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }
}
const grad = (c, x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); for (const [p, col] of stops) g.addColorStop(p, col); return g; };
function blob(c, cx, cy, r, n, seed, rough = 0.18, ry = 1) { // scalloped foliage outline
  const pts = []; for (let i = 0; i < n; i++) { const a = i / n * PI2, rr = r * (1 + rough * (hash(seed + i, 7) - 0.5) * 2); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * ry]); }
  const m = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; let s = m(pts[n - 1], pts[0]); c.moveTo(s[0], s[1]);
  for (let i = 0; i < n; i++) { const q = m(pts[i], pts[(i + 1) % n]); c.quadraticCurveTo(pts[i][0], pts[i][1], q[0], q[1]); }
  c.closePath();
}
function mapleLeaf(c, x, y, r, rot, col, line = 2) {
  c.save(); c.translate(x, y); c.rotate(rot); c.beginPath();
  for (let i = 0; i < 5; i++) { const a = -PI / 2 + i * PI2 / 5, b = a + PI / 5; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); c.lineTo(Math.cos(b) * r * 0.5, Math.sin(b) * r * 0.5); }
  c.closePath(); c.fillStyle = col; c.fill(); if (line) ol(c, line); c.strokeStyle = 'rgba(60,20,10,0.5)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, r * 0.1); c.lineTo(0, -r * 0.8); c.stroke(); c.restore();
}

// ---------- sky + far hills (cached) ----------
function drawSkyStatic(c, storm = 0.12) {
  c.fillStyle = grad(c, 0, 0, 0, 820, [[0, `rgb(${Math.round(150 - 40 * storm)},${Math.round(190 - 50 * storm)},${Math.round(214 - 30 * storm)})`], [0.55, '#CFE0E3'], [1, '#F3EAD3']]); c.fillRect(0, 0, 1080, 1000);
  // sun glow upper-left
  const g = c.createRadialGradient(150, 60, 10, 150, 60, 720); g.addColorStop(0, 'rgba(255,244,214,0.75)'); g.addColorStop(1, 'rgba(255,244,214,0)'); c.fillStyle = g; c.fillRect(0, 0, 1080, 1000);
  const ridge = (y0, a1, a2, p1, p2, col, mist) => { c.fillStyle = col; c.beginPath(); c.moveTo(-10, 1000); for (let x = -10; x <= 1090; x += 12) c.lineTo(x, y0 - a1 * Math.abs(Math.sin(x * 0.0042 + p1)) - a2 * Math.sin(x * 0.011 + p2)); c.lineTo(1090, 1000); c.closePath(); c.fill();
    if (mist) { const m = c.createLinearGradient(0, y0 - 40, 0, y0 + 80); m.addColorStop(0, 'rgba(243,234,211,0)'); m.addColorStop(1, 'rgba(243,234,211,0.85)'); c.fillStyle = m; c.fillRect(0, y0 - 40, 1080, 140); } };
  ridge(640, 70, 26, 0.4, 0.2, '#C2D0CE', true); ridge(690, 84, 30, 2.4, 1.1, '#A3B8B3', true); ridge(740, 70, 34, 4.2, 2.6, '#80988F', true);
  // far five-storey pagoda on the middle ridge
  c.save(); c.translate(842, 700); c.fillStyle = 'rgba(78,94,92,0.62)'; for (let i = 0; i < 5; i++) { const w = 40 - i * 5, y = -i * 15; c.beginPath(); c.moveTo(-w, y); c.lineTo(-w * 0.55, y - 9); c.lineTo(w * 0.55, y - 9); c.lineTo(w, y); c.closePath(); c.fill(); c.fillRect(-w * 0.45, y, w * 0.9, 6); } c.fillRect(-2, -92, 4, -24); c.restore();
  // cedar silhouettes on the nearest ridge
  c.fillStyle = 'rgba(52,74,66,0.7)'; for (let i = 0; i < 46; i++) { const x = 20 + i * 23 + 8 * hash(i, 1), yb = 760 - 70 * Math.abs(Math.sin(x * 0.0042 + 4.2)) - 34 * Math.sin(x * 0.011 + 2.6) + 6, h = 30 + 24 * hash(i, 2); c.beginPath(); c.moveTo(x - 9, yb + 14); c.lineTo(x, yb - h * 0.8); c.lineTo(x + 9, yb + 14); c.closePath(); c.fill(); }
  const m = c.createLinearGradient(0, 760, 0, 860); m.addColorStop(0, 'rgba(243,234,211,0)'); m.addColorStop(1, 'rgba(243,234,211,0.9)'); c.fillStyle = m; c.fillRect(0, 760, 1080, 100);
}
function softCloud(c, x, y, s, a = 1) { // cumulus with flat base, lit from upper-left, no outline (union fills only: no seams)
  const U = (c, dx, dy) => { c.beginPath(); for (const [ox, oy, r] of [[-120, 30, 52], [-70, -10, 76], [0, -34, 92], [76, -6, 74], [128, 30, 50], [0, 34, 80]]) { c.moveTo(x + (ox + dx) * s + r * s, y + (oy + dy) * s); c.arc(x + (ox + dx) * s, y + (oy + dy) * s, r * s, 0, PI2); } };
  c.save(); c.globalAlpha = a; U(c, 0, 0); c.fillStyle = '#9DB2C4'; c.fill(); c.clip();
  U(c, 0, -34); c.fillStyle = '#E6EEF2'; c.fill(); U(c, 6, -52); c.fillStyle = '#FBF8F0'; c.fill(); U(c, 12, -64); c.fillStyle = '#FFFFFF'; c.fill(); c.restore();
}
// ---------- trees behind the wall (cached) ----------
function mapleTree(c, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s);
  SH(c, (c) => { c.moveTo(-18, 0); c.bezierCurveTo(-14, -120, -34, -200, -10, -330); c.lineTo(14, -330); c.bezierCurveTo(6, -200, 30, -120, 20, 0); c.closePath(); }, { f: '#5A4636', sh: 'rgba(30,18,10,0.45)', hl: 'rgba(200,170,130,0.25)', d: [7, 0], line: 3 });
  for (const [a, l, w] of [[-0.9, 150, 9], [0.8, 170, 9], [-0.3, 120, 7]]) { c.save(); c.translate(0, -230 - 30 * a); c.rotate(a); c.strokeStyle = '#5A4636'; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -l); c.stroke(); c.restore(); }
  const cols = ['#C23A25', '#D9552A', '#E4752E', '#B8301F'];
  for (const [bx, by, r, k] of [[-120, -380, 100, 0], [20, -470, 120, 1], [140, -360, 105, 2], [-30, -330, 90, 3], [-150, -290, 70, 1], [170, -250, 66, 0]]) {
    SH(c, (c) => blob(c, bx, by, r, 12, k * 5 + bx, 0.16, 0.82), { f: cols[k], sh: 'rgba(90,20,10,0.38)', hl: 'rgba(255,196,110,0.4)', d: [r * 0.12, r * 0.16], line: 2.6,
      tex: (c) => { for (let i = 0; i < 26; i++) { const a = hash(i + k, 3) * PI2, rr = r * 0.8 * hash(i + k, 4); mapleLeaf(c, bx + Math.cos(a) * rr, by + Math.sin(a) * rr * 0.8, 6 + 3.5 * hash(i, 5), hash(i, 6) * 6, hash(i, 8) > 0.5 ? '#F29A44' : '#9E2418', 0); } } });
  }
  c.restore();
}
function pineBehind(c, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s);
  SH(c, (c) => { c.moveTo(-14, 0); c.bezierCurveTo(-30, -60, 20, -120, -6, -210); c.lineTo(18, -210); c.bezierCurveTo(40, -120, -2, -60, 16, 0); c.closePath(); }, { f: '#5B4333', sh: 'rgba(30,18,10,0.45)', d: [6, 0], line: 2.6 });
  for (const [px, py, r] of [[-70, -150, 74], [60, -200, 84], [-20, -260, 70], [110, -120, 58]]) SH(c, (c) => E(c, px, py, r, r * 0.4), { f: '#3F6A47', sh: 'rgba(14,40,24,0.45)', hl: 'rgba(150,200,120,0.4)', d: [6, 10], line: 2.6 });
  c.restore();
}
function bambooStalk(c, x, top, bot, w, col = '#7F9A52') {
  SH(c, (c) => RR(c, x - w / 2, top, w, bot - top, w / 2), { f: col, sh: 'rgba(30,60,20,0.42)', hl: 'rgba(235,245,180,0.4)', d: [w * 0.28, 0], line: 2.8 });
  for (let y = bot - 80; y > top + 30; y -= 150 - 20 * hash(x + y, 2)) { c.fillStyle = mix(col, '#2E4222', 0.45); c.fillRect(x - w / 2 - 2, y, w + 4, 8); c.strokeStyle = INKC; c.lineWidth = 2.2; c.strokeRect(x - w / 2 - 2, y, w + 4, 8); }
}
function bambooLeaves(c, x, y, t, sway, k = 1) { // cluster of narrow leaves fanning out, swaying with t
  for (let i = 0; i < 9; i++) { const a = -2.6 + i * 0.52 + 0.06 * Math.sin(t * 1.3 + i + x) + sway * 0.14, l = (92 + 28 * hash(i, x)) * k; c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = i % 2 ? '#8CA859' : '#6F8E46'; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(l * 0.5, -14 * k, l, 2); c.quadraticCurveTo(l * 0.5, 10 * k, 0, 0); c.fill(); c.strokeStyle = INKC; c.lineWidth = 1.8; c.stroke(); c.restore(); }
}
// ---------- wall ----------
function kawaraCap(c, y0, x0 = -20, x1 = 1100) {
  // rafter shadow + eave
  c.fillStyle = '#3F3228'; c.fillRect(x0, y0 + 36, x1 - x0, 22); c.strokeStyle = INKC; c.lineWidth = 3; c.strokeRect(x0, y0 + 36, x1 - x0, 22);
  c.fillStyle = '#6A5A46'; for (let x = x0 + 14; x < x1; x += 56) c.fillRect(x, y0 + 40, 7, 16);
  // clay roof body
  SH(c, (c) => { c.rect(x0, y0, x1 - x0, 40); }, { f: '#5B5A58', sh: 'rgba(20,22,26,0.4)', hl: 'rgba(210,214,220,0.25)', d: [0, 9], line: 3.2 });
  // curved tiles: alternating raised (maru) and flat (hira), highlights on the raised ones
  for (let x = x0; x < x1; x += 32) { SH(c, (c) => { c.moveTo(x + 3, y0 + 42); c.lineTo(x + 3, y0 + 18); c.quadraticCurveTo(x + 16, y0 - 2, x + 29, y0 + 18); c.lineTo(x + 29, y0 + 42); c.closePath(); }, { f: '#6E6D6B', sh: 'rgba(14,16,20,0.45)', hl: 'rgba(235,238,242,0.45)', d: [6, 4], line: 2.4 }); }
  // ridge cap
  SH(c, (c) => RR(c, x0, y0 - 14, x1 - x0, 18, 8), { f: '#4D4C4B', sh: 'rgba(0,0,0,0.35)', hl: 'rgba(230,234,240,0.3)', d: [0, 5], line: 3.2 });
}
function earthWall(c, y0, y1) {
  c.fillStyle = grad(c, 0, y0, 0, y1, [[0, '#E9DBB6'], [1, '#D8C69A']]); c.fillRect(-20, y0, 1120, y1 - y0);
  // pale-stripe bands (tsuiji style)
  for (const [yy, th] of [[y0 + 44, 7], [y0 + 66, 5], [y0 + 84, 4]]) { c.fillStyle = '#FBF6E6'; c.fillRect(-20, yy, 1120, th); c.fillStyle = 'rgba(120,96,60,0.4)'; c.fillRect(-20, yy + th, 1120, 2); c.fillStyle = 'rgba(120,96,60,0.25)'; c.fillRect(-20, yy - 2, 1120, 2); }
  // weathering: vertical rain stains, mottled patches, hairline cracks
  for (let i = 0; i < 34; i++) { const x = hash(i, 1) * 1100, w = 6 + 16 * hash(i, 2), h = 20 + 90 * hash(i, 3), a = 0.04 + 0.07 * hash(i, 4); c.fillStyle = `rgba(110,84,50,${a})`; c.beginPath(); c.moveTo(x, y0 + 8); c.lineTo(x + w, y0 + 8); c.lineTo(x + w * 0.5, y0 + 8 + h); c.closePath(); c.fill(); }
  for (let i = 0; i < 40; i++) { const x = hash(i, 11) * 1100, y = y0 + 20 + hash(i, 12) * (y1 - y0 - 30); c.fillStyle = `rgba(150,120,80,${0.05 + 0.07 * hash(i, 13)})`; c.beginPath(); c.ellipse(x, y, 20 + 40 * hash(i, 14), 6 + 12 * hash(i, 15), 0, 0, PI2); c.fill(); }
  c.strokeStyle = 'rgba(90,66,40,0.5)'; c.lineWidth = 1.6; for (let i = 0; i < 5; i++) { let x = 80 + hash(i, 21) * 920, y = y0 + 20 + hash(i, 22) * 60; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (hash(i * 9 + k, 23) - 0.5) * 30; y += 10 + 10 * hash(i * 9 + k, 24); c.lineTo(x, y); } c.stroke(); }
  // rubble-stone footing
  for (let x = -20, k = 0; x < 1100; k++) { const w = 54 + 44 * hash(k, 31), h = 24 + 8 * hash(k, 32); SH(c, (c) => RR(c, x, y1 - h, w - 3, h, 10), { f: mix('#9C978C', '#B7B1A2', hash(k, 33)), sh: 'rgba(40,38,32,0.35)', hl: 'rgba(255,255,255,0.25)', d: [6, 6], line: 2.4 }); x += w; }
}
// bamboo fence (yotsume-gaki): stalks + two rails + hemp ties
function yotsume(c, x0, x1, yb, h) {
  const rails = [yb - h * 0.8, yb - h * 0.3];
  for (let x = x0; x <= x1; x += 26) { bambooStalk(c, x, yb - h, yb, 14, '#B5AF63'); }
  for (const ry of rails) { SH(c, (c) => RR(c, x0 - 14, ry - 8, x1 - x0 + 28, 16, 8), { f: '#9A9A52', sh: 'rgba(30,50,20,0.4)', hl: 'rgba(240,244,180,0.35)', d: [0, 5], line: 2.8 }); }
  c.fillStyle = '#231D18'; for (let x = x0; x <= x1; x += 26) for (const ry of rails) { c.beginPath(); c.arc(x, ry, 5.5, 0, PI2); c.fill(); c.strokeStyle = 'rgba(210,190,150,0.5)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x - 6, ry - 3); c.lineTo(x + 6, ry + 3); c.stroke(); }
}
// ---------- ground ----------
function mossPatch(c, x, y, rx, ry, seed = 0) {
  SH(c, (c) => blob(c, x, y, rx, 14, seed, 0.2, ry / rx), { f: '#6F8F4E', sh: 'rgba(30,60,26,0.4)', hl: 'rgba(190,220,120,0.4)', d: [rx * 0.06, ry * 0.2], line: 0,
    tex: (c) => { for (let i = 0; i < 70; i++) { const a = hash(seed + i, 3) * PI2, rr = hash(seed + i, 4); c.fillStyle = hash(i, 5) > 0.5 ? 'rgba(170,205,100,0.5)' : 'rgba(30,70,30,0.35)'; c.beginPath(); c.arc(x + Math.cos(a) * rr * rx * 0.95, y + Math.sin(a) * rr * ry * 0.95, 3 + 3 * hash(i, 6), 0, PI2); c.fill(); } } });
}
function karikomi(c, x, y, r) { // clipped azalea mound
  SH(c, (c) => { c.moveTo(x - r, y); c.bezierCurveTo(x - r, y - r * 1.05, x + r, y - r * 1.05, x + r, y); c.closePath(); }, { f: '#3F6E43', sh: 'rgba(10,36,22,0.45)', hl: 'rgba(160,210,120,0.42)', d: [r * 0.1, r * 0.14], line: 3,
    tex: (c) => { for (let i = 0; i < 60; i++) { const a = -PI + PI * hash(i, 1), rr = r * 0.95 * hash(i, 2); c.fillStyle = hash(i, 3) > 0.4 ? 'rgba(120,180,96,0.55)' : 'rgba(20,50,30,0.45)'; c.beginPath(); c.ellipse(x + Math.cos(a) * rr, y - Math.abs(Math.sin(a)) * rr * 0.9, 6, 3.5, hash(i, 4) * 3, 0, PI2); c.fill(); } for (let i = 0; i < 9; i++) { c.fillStyle = '#E86B8E'; const a = -PI + PI * hash(i, 9), rr = r * 0.8 * hash(i, 8); c.beginPath(); c.arc(x + Math.cos(a) * rr, y - Math.abs(Math.sin(a)) * rr * 0.9, 4, 0, PI2); c.fill(); } } });
}
function cobble(c, x, y, w, h, k = 0) { SH(c, (c) => E(c, x, y, w, h), { f: mix('#8E8A80', '#B0AA9A', hash(k, 1)), sh: 'rgba(30,28,24,0.4)', hl: 'rgba(255,255,255,0.3)', d: [w * 0.12, h * 0.3], line: 2.4 }); }
function rock(c, x, y, s, k = 0) { // faceted boulder with moss cap, y = ground contact
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = 'rgba(46,34,22,0.28)'; c.beginPath(); c.ellipse(8, 4, 108, 16, 0, 0, PI2); c.fill();
  SH(c, (c) => { c.moveTo(-92, 2); c.bezierCurveTo(-110, -50, -70, -108, -10, -110); c.bezierCurveTo(50, -116, 106, -70, 98, 2); c.closePath(); }, { f: '#97938A', sh: 'rgba(36,34,34,0.5)', hl: 'rgba(255,255,255,0.28)', d: [34, 12], line: 4.2,
    tex: (c) => { c.strokeStyle = 'rgba(40,38,36,0.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-14, -108); c.lineTo(-30, -60); c.lineTo(-10, -30); c.lineTo(-22, 0); c.stroke(); c.beginPath(); c.moveTo(48, -92); c.lineTo(40, -50); c.lineTo(62, -20); c.stroke(); c.fillStyle = 'rgba(70,64,56,0.35)'; for (let i = 0; i < 24; i++) { c.beginPath(); c.arc(-80 + 170 * hash(i + k, 1), -100 + 100 * hash(i + k, 2), 1.5 + 2 * hash(i, 3), 0, PI2); c.fill(); } } });
  SH(c, (c) => blob(c, -22, -100, 62, 12, k + 3, 0.2, 0.3), { f: '#6F9150', sh: 'rgba(30,60,26,0.4)', hl: 'rgba(190,220,120,0.5)', d: [4, 6], line: 2.4 });
  c.fillStyle = '#7B9F58'; c.beginPath(); c.ellipse(60, -60, 18, 10, 0.6, 0, PI2); c.fill();
  c.restore();
}
function raked(c, rocks) { // gravel with samon: long parallel waves + concentric rings round rock groups; engraved look (dark groove + light ridge)
  const g = c.createLinearGradient(0, 1100, 0, 1920); g.addColorStop(0, '#E9DEC0'); g.addColorStop(1, '#D8C9A4'); c.fillStyle = g; c.fillRect(-20, 1100, 1120, 840);
  for (let i = 0; i < 1400; i++) { const x = hash(i, 1) * 1080, y = 1110 + hash(i, 2) * 810; c.fillStyle = hash(i, 3) > 0.5 ? 'rgba(255,252,238,0.55)' : 'rgba(120,98,62,0.28)'; c.beginPath(); c.arc(x, y, 1 + 1.6 * hash(i, 4), 0, PI2); c.fill(); }
  const groove = (pathFn) => { c.save(); c.translate(0, 2.5); c.strokeStyle = 'rgba(255,252,240,0.8)'; c.lineWidth = 3; c.beginPath(); pathFn(); c.stroke(); c.restore(); c.strokeStyle = 'rgba(110,86,52,0.55)'; c.lineWidth = 3; c.beginPath(); pathFn(); c.stroke(); };
  for (let i = 0; i < 11; i++) { const y = 1190 + i * 38; if (i < 3) continue; groove(() => { for (let x = -20; x <= 1100; x += 18) { const yy = y + 7 * Math.sin(x * 0.012 + i * 0.7) * (1 + i * 0.1); x === -20 ? c.moveTo(x, yy) : c.lineTo(x, yy); } }); }
  for (const [x, y, n, step] of rocks) for (let r = 0; r < n; r++) { const rx = 140 + r * step, ry = rx * 0.27; groove(() => { c.ellipse(x, y + 6, rx, ry, 0, 0, PI2); }); }
}
// ---------- stone lantern (toro) ----------
function lantern(c, x, y, s = 1, glow = 0, top = true) { // y = ground
  c.save(); c.translate(x, y); c.scale(s, s);
  const st = '#A39E92', P = { sh: 'rgba(34,32,34,0.42)', hl: 'rgba(255,255,255,0.32)' };
  c.fillStyle = 'rgba(46,34,22,0.3)'; c.beginPath(); c.ellipse(10, 4, 100, 14, 0, 0, PI2); c.fill();
  SH(c, (c) => RR(c, -76, -26, 152, 26, 5), { f: st, ...P, d: [8, 7], line: 4 });                                          // kidan
  SH(c, (c) => { c.moveTo(-52, -26); c.quadraticCurveTo(-56, -64, -34, -78); c.lineTo(34, -78); c.quadraticCurveTo(56, -64, 52, -26); c.closePath(); }, { f: st, ...P, d: [9, 7], line: 4 }); // kiso
  SH(c, (c) => { c.moveTo(-22, -78); c.lineTo(-24, -150); c.quadraticCurveTo(-30, -168, -24, -186); c.lineTo(24, -186); c.quadraticCurveTo(30, -168, 24, -150); c.lineTo(22, -78); c.closePath(); }, { f: st, ...P, d: [10, 0], line: 4 }); // sao
  SH(c, (c) => { c.moveTo(-34, -112); c.quadraticCurveTo(0, -126, 34, -112); c.quadraticCurveTo(38, -122, 0, -134); c.quadraticCurveTo(-38, -122, -34, -112); }, { f: '#8E897D', line: 3 }); // shaft ring
  SH(c, (c) => { c.moveTo(-68, -188); c.lineTo(-52, -212); c.lineTo(52, -212); c.lineTo(68, -188); c.closePath(); }, { f: st, ...P, d: [8, 6], line: 4 });  // chudai
  SH(c, (c) => RR(c, -46, -296, 92, 86, 4), { f: '#9B968A', ...P, d: [9, 7], line: 4 });                                  // hibukuro
  SH(c, (c) => RR(c, -26, -280, 52, 56, 24), { f: glow > 0 ? mix('#2C2A2C', '#FFD27A', glow) : '#34322F', line: 3.4 });    // window
  if (glow > 0) { c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(0, -252, 4, 0, -252, 120); g.addColorStop(0, `rgba(255,214,120,${0.55 * glow})`); g.addColorStop(1, 'rgba(255,214,120,0)'); c.fillStyle = g; c.fillRect(-140, -380, 280, 260); c.restore(); }
  if (top !== false) lanternTopParts(c);
  c.fillStyle = 'rgba(111,145,80,0.95)'; for (const [mx, my, w] of [[-30, -208, 24], [38, -76, 26], [-34, -24, 34]]) { c.beginPath(); c.ellipse(mx, my, w, 7, -0.05, 0, PI2); c.fill(); c.strokeStyle = 'rgba(20,40,20,0.7)'; c.lineWidth = 1.6; c.stroke(); }
  c.restore();
}
function lanternTopParts(c) {
  const st = '#A39E92', P = { sh: 'rgba(34,32,34,0.42)', hl: 'rgba(255,255,255,0.32)' };
  SH(c, (c) => { c.moveTo(-122, -296); c.quadraticCurveTo(-70, -300, -40, -330); c.lineTo(-18, -366); c.lineTo(18, -366); c.lineTo(40, -330); c.quadraticCurveTo(70, -300, 122, -296); c.quadraticCurveTo(0, -310, -122, -296); c.closePath(); }, { f: st, ...P, d: [12, 8], line: 4.2 }); // kasa
  SH(c, (c) => { c.moveTo(-28, -366); c.quadraticCurveTo(-34, -380, -16, -384); c.lineTo(16, -384); c.quadraticCurveTo(34, -380, 28, -366); c.closePath(); }, { f: '#98938A', ...P, d: [6, 4], line: 3.4 }); // ukebana
  SH(c, (c) => { c.moveTo(0, -434); c.bezierCurveTo(24, -410, 22, -392, 0, -384); c.bezierCurveTo(-22, -392, -24, -410, 0, -434); }, { f: st, ...P, d: [5, 4], line: 3.4 }); // hoju
  c.fillStyle = 'rgba(111,145,80,0.95)'; for (const [mx, my, w] of [[-72, -295, 34], [30, -352, 28]]) { c.beginPath(); c.ellipse(mx, my, w, 7, -0.05, 0, PI2); c.fill(); c.strokeStyle = 'rgba(20,40,20,0.7)'; c.lineWidth = 1.6; c.stroke(); }
}
function kasaDraw(c, x, y, s, dx, dy, rot) { c.save(); c.translate(x + dx * s, y + dy * s); c.scale(s, s); c.translate(0, -330); c.rotate(rot); c.translate(0, 330); lanternTopParts(c); c.restore(); }
// ---------- tsukubai: basin + bamboo spout; hishaku laid on the basin when ladle=true ----------
function basin(c, x, y, s = 1, t = 0, flow = 1) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = 'rgba(46,34,22,0.3)'; c.beginPath(); c.ellipse(10, 4, 150, 16, 0, 0, PI2); c.fill();
  SH(c, (c) => { c.moveTo(-128, 0); c.bezierCurveTo(-150, -50, -124, -112, -72, -122); c.lineTo(78, -122); c.bezierCurveTo(130, -108, 152, -48, 130, 0); c.closePath(); }, { f: '#8F8B82', sh: 'rgba(34,34,38,0.5)', hl: 'rgba(255,255,255,0.28)', d: [28, 10], line: 4.2,
    tex: (c) => { c.fillStyle = 'rgba(60,56,50,0.35)'; for (let i = 0; i < 30; i++) { c.beginPath(); c.arc(-120 + 250 * hash(i, 1), -118 + 112 * hash(i, 2), 1.4 + 2 * hash(i, 3), 0, PI2); c.fill(); } } });
  SH(c, (c) => E(c, 0, -118, 100, 22), { f: '#5C8896', sh: 'rgba(20,44,60,0.4)', d: [0, 6], line: 3.4 });
  c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.ellipse(-30, -122, 40, 6, 0, 0, PI2); c.fill();
  if (flow > 0) { for (const r of [0.2, 0.55, 0.9]) { const q = ((t * 0.7 + r) % 1); c.strokeStyle = `rgba(255,255,255,${0.55 * (1 - q)})`; c.lineWidth = 2; c.beginPath(); c.ellipse(-60, -116, 6 + 36 * q, 2 + 7 * q, 0, 0, PI2); c.stroke(); } }
  // bamboo spout (kakei) on a short post
  bambooStalk(c, 118, -300, -40, 15, '#8FA45A'); SH(c, (c) => { c.moveTo(130, -278); c.lineTo(-62, -226); c.lineTo(-62, -204); c.lineTo(130, -258); c.closePath(); }, { f: '#8FA45A', sh: 'rgba(30,60,20,0.42)', hl: 'rgba(235,245,180,0.4)', d: [0, 6], line: 3 });
  if (flow > 0) { c.strokeStyle = 'rgba(176,214,228,0.95)'; c.lineWidth = 5; c.beginPath(); c.moveTo(-62, -212); c.lineTo(-60, -124); c.stroke(); c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-63, -208 + 6 * Math.sin(t * 9)); c.lineTo(-61, -130); c.stroke(); }
  c.restore();
}
function hishaku(c, x, y, ang, s = 1, water = 0) { // cup centre at (x,y); handle along ang. Bamboo cup (open top, node bottom) + long thin handle
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, Math.cos(ang) < 0 ? -s : s);
  SH(c, (c) => RR(c, 14, -5, 190, 10, 5), { f: '#CFB27A', sh: 'rgba(80,56,20,0.4)', hl: 'rgba(255,248,210,0.45)', d: [0, 3], line: 2.8 });
  SH(c, (c) => { c.moveTo(-30, -30); c.lineTo(-26, 26); c.quadraticCurveTo(0, 32, 26, 26); c.lineTo(30, -30); c.closePath(); }, { f: '#D6BB84', sh: 'rgba(80,56,20,0.42)', hl: 'rgba(255,248,210,0.5)', d: [8, 4], line: 3.4 });
  c.strokeStyle = 'rgba(70,44,16,0.7)'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(-27, 14); c.lineTo(27, 14); c.stroke();
  SH(c, (c) => E(c, 0, -30, 30, 8), { f: water > 0 ? '#6E9CAC' : '#8C6E3E', line: 3 });
  c.restore();
}
// ---------- shishi-odoshi ----------
// tilt 0 = rest (tail on the stone, open end up); 1 = tipped (open end down, pouring). fill 0..1 water inside the open compartment.
function shishi(c, x, y, tilt = 0, fill = 0, t = 0, stream = 1, sc = 1) { // y = ground
  c.save(); c.translate(x, y); c.scale(sc, sc);
  c.fillStyle = 'rgba(46,34,22,0.3)'; c.beginPath(); c.ellipse(20, 4, 130, 14, 0, 0, PI2); c.fill();
  bambooStalk(c, -232, -300, 0, 14, '#8FA45A');
  SH(c, (c) => { c.moveTo(-240, -304); c.lineTo(-130, -266); c.lineTo(-130, -246); c.lineTo(-240, -284); c.closePath(); }, { f: '#8FA45A', sh: 'rgba(30,60,20,0.42)', hl: 'rgba(235,245,180,0.4)', d: [0, 5], line: 3 });
  // knock stone under the tail
  SH(c, (c) => { c.moveTo(52, 0); c.quadraticCurveTo(46, -32, 82, -40); c.quadraticCurveTo(122, -42, 128, 0); c.closePath(); }, { f: '#8E8A80', sh: 'rgba(34,34,38,0.5)', hl: 'rgba(255,255,255,0.3)', d: [12, 6], line: 4 });
  // frame: two uprights holding the pivot rod
  for (const fx of [-6, 22]) bambooStalk(c, fx, -124, 0, 13, '#A5A85A');
  const ang = 0.52 - 1.02 * tilt; // about the pivot at (7,-110): rest = tail down on the stone, open end up; tipped = open end down
  c.save(); c.translate(7, -110); c.rotate(ang);
  SH(c, (c) => { c.moveTo(-150, -22); c.lineTo(-166, 10); c.lineTo(-150, 22); c.lineTo(86, 22); c.quadraticCurveTo(100, 0, 86, -22); c.closePath(); }, { f: '#8FA85A', sh: 'rgba(30,60,20,0.45)', hl: 'rgba(236,246,184,0.45)', d: [0, 9], line: 3.8,
    tex: (c) => { if (fill > 0) { c.fillStyle = 'rgba(110,158,176,0.95)'; c.fillRect(-150, 22 - 40 * fill, 116, 40 * fill); } } });
  c.fillStyle = '#566C32'; c.fillRect(-34, -22, 9, 44); c.strokeStyle = INKC; c.lineWidth = 2.4; c.strokeRect(-34, -22, 9, 44); // node partition
  c.fillStyle = '#566C32'; c.fillRect(52, -22, 8, 44); c.strokeRect(52, -22, 8, 44);
  c.fillStyle = '#2E3A1E'; c.beginPath(); c.ellipse(-158, 0, 8, 17, 0.3, 0, PI2); c.fill(); // open mouth
  c.fillStyle = '#231D18'; c.beginPath(); c.arc(0, 0, 7, 0, PI2); c.fill(); c.restore(); // pivot rod
  if (stream > 0) { c.strokeStyle = 'rgba(176,214,228,0.95)'; c.lineWidth = 5; c.beginPath(); c.moveTo(-134, -246); c.lineTo(-134, -246 + 70 * stream); c.stroke(); }
  c.restore();
}
// ---------- bucket ----------
function bucket(c, x, y, s = 1, water = 0.8) { // wooden oke, y = ground
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = 'rgba(46,34,22,0.3)'; c.beginPath(); c.ellipse(6, 3, 84, 11, 0, 0, PI2); c.fill();
  SH(c, (c) => { c.moveTo(-66, -120); c.lineTo(-58, 0); c.lineTo(58, 0); c.lineTo(66, -120); c.closePath(); }, { f: '#BB8F58', sh: 'rgba(70,40,16,0.45)', hl: 'rgba(255,224,170,0.35)', d: [16, 0], line: 4.2,
    tex: (c) => { c.strokeStyle = 'rgba(70,44,20,0.5)'; c.lineWidth = 2; for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * 20, -118); c.lineTo(i * 18, -2); c.stroke(); } c.strokeStyle = 'rgba(70,44,20,0.25)'; for (let i = 0; i < 12; i++) { c.beginPath(); c.moveTo(-60 + 120 * hash(i, 1), -110 * hash(i, 2) - 8); c.lineTo(-56 + 120 * hash(i, 1), -110 * hash(i, 2) + 6); c.stroke(); } } });
  for (const [yy, ins] of [[-100, 0], [-26, 6]]) SH(c, (c) => RR(c, -66 + ins, yy, 132 - 2 * ins, 12, 5), { f: '#6B5A3A', sh: 'rgba(20,14,6,0.45)', hl: 'rgba(240,226,180,0.3)', d: [0, 4], line: 3 });
  SH(c, (c) => E(c, 0, -120, 64, 14), { f: '#5C8896', line: 3.2 }); c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.ellipse(-16, -123, 26, 4, 0, 0, PI2); c.fill();
  c.restore();
}
// ---------- young pine (niwaki) with stake: g 0..1 growth, droop 0..1 ----------
function sapling(c, x, y, g = 0.2, t = 0, sway = 0, droop = 0) {
  c.save(); c.translate(x, y);
  // soil mound with moss and ring stones
  c.fillStyle = 'rgba(46,34,22,0.3)'; c.beginPath(); c.ellipse(8, 4, 96, 13, 0, 0, PI2); c.fill();
  SH(c, (c) => { c.moveTo(-70, 0); c.quadraticCurveTo(-56, -30, 0, -30); c.quadraticCurveTo(56, -30, 70, 0); c.closePath(); }, { f: '#6E5238', sh: 'rgba(30,18,8,0.45)', hl: 'rgba(210,170,120,0.3)', d: [8, 6], line: 3.4 });
  mossPatch(c, 0, -22, 50, 10, 77); for (const [sx, sy, w] of [[-66, -4, 16], [-30, 4, 14], [34, 4, 15], [68, -4, 16]]) cobble(c, sx, sy, w, w * 0.6, sx);
  c.rotate(sway * 0.05 + 0.012 * Math.sin(t * 0.9));
  const Hh = 150 + 520 * g, wd = 7 + 30 * g, bx = (yy) => 26 * Math.sin(yy * 2.4) * (0.5 + g) * (1 - 0.3 * yy) - 6; // gentle S-curve
  // bamboo stake (shichiku) behind trunk, tied
  bambooStalk(c, 54 + 40 * g, -Hh * 0.82, -4, 9 + 6 * g, '#B5AF63');
  const trunk = (c) => { c.moveTo(-wd + bx(0), -24); for (let k = 0; k <= 8; k++) { const q = k / 8; c.lineTo(-wd * (1 - 0.55 * q) + bx(q), -24 - (Hh - 24) * q); } for (let k = 8; k >= 0; k--) { const q = k / 8; c.lineTo(wd * (1 - 0.55 * q) + bx(q), -24 - (Hh - 24) * q); } c.closePath(); };
  SH(c, trunk, { f: '#6B4A2E', sh: 'rgba(28,14,6,0.5)', hl: 'rgba(220,170,120,0.28)', d: [wd * 0.5, 0], line: 3.8, tex: (c) => { c.strokeStyle = 'rgba(30,18,8,0.45)'; c.lineWidth = 1.8; for (let i = 0; i < 7; i++) { c.beginPath(); const q0 = i / 7; c.moveTo(-wd * 0.6 + bx(q0), -24 - (Hh - 24) * q0); c.lineTo(-wd * 0.2 + bx(q0 + 0.12), -24 - (Hh - 24) * (q0 + 0.12)); c.stroke(); } } });
  c.fillStyle = '#231D18'; for (const q of [0.25, 0.55]) { const yy = -24 - (Hh - 24) * q; c.beginPath(); c.ellipse(bx(q) + (wd + 6), yy, 6, 4, 0, 0, PI2); c.fill(); }
  const pads = [[-1, 0.42, 1, 0], [1, 0.62, 1.1, 1], [-1, 0.82, 0.92, 2], [0, 1.0, 1.15, 3]];
  for (const [sd, q, sc, k] of pads) {
    const bx0 = bx(q), by0 = -24 - (Hh - 24) * q, px = bx0 + sd * (50 + 120 * g) * sc, py = by0 - 18 - 14 * g + droop * 24 * (sd ? 1 : 0.4) + 3 * Math.sin(t * 1.3 + k), rx = (44 + 118 * g) * sc;
    c.strokeStyle = '#5E4128'; c.lineWidth = 5 + 8 * g; c.lineCap = 'round'; c.beginPath(); c.moveTo(bx0, by0); c.quadraticCurveTo((bx0 + px) / 2, by0 - 4, px, py + 8); c.stroke();
    SH(c, (c) => E(c, px, py, rx, rx * 0.42), { f: '#4A7A48', sh: 'rgba(14,40,24,0.5)', hl: 'rgba(168,214,120,0.45)', d: [rx * 0.06, rx * 0.2], line: 3.8,
      tex: (c) => { c.lineWidth = 1.8; for (let i = 0; i < 46; i++) { const a = -PI + PI * hash(i + k, 1), rr = 0.35 + 0.65 * hash(i + k, 2); c.strokeStyle = hash(i, 3) > 0.5 ? 'rgba(170,214,120,0.7)' : 'rgba(18,48,28,0.6)'; const ax = px + Math.cos(a) * rx * rr, ay = py + Math.sin(a) * rx * 0.42 * rr; c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax + Math.cos(a) * 12, ay + Math.sin(a) * 6 + 2); c.stroke(); } } });
  }
  c.restore();
}
// ---------- misc ----------
function fallenLeaf(c, x, y, r, rot, k) { mapleLeaf(c, x, y, r, rot, ['#C23A25', '#D9552A', '#E4752E'][k % 3], 1.8); }
function sunBeams(c, t) { c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 5; i++) { const x0 = 40 + i * 120, w = 50 + 30 * hash(i, 1), a = 0.022 + 0.014 * Math.sin(t * 0.4 + i); const g = c.createLinearGradient(x0, 0, x0 + 520, 1200); g.addColorStop(0, `rgba(255,240,190,${a * 1.6})`); g.addColorStop(1, 'rgba(255,240,190,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(x0, -20); c.lineTo(x0 + w, -20); c.lineTo(x0 + w + 560, 1300); c.lineTo(x0 + 420, 1300); c.closePath(); c.fill(); } c.restore(); }
function motes(c, t) { c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 26; i++) { const x = 40 + 1000 * hash(i, 1) + 22 * Math.sin(t * 0.5 + i), y = 200 + 1100 * ((hash(i, 2) + t * 0.012 * (0.4 + hash(i, 3))) % 1), a = 0.12 + 0.12 * hash(i, 4); c.fillStyle = `rgba(255,240,190,${a})`; c.beginPath(); c.arc(x, y, 2 + 2.2 * hash(i, 5), 0, PI2); c.fill(); } c.restore(); }
function mapleBranchFG(c, t, sway = 0) { // out-of-frame branch, top-right corner, framing the sky
  c.save(); c.translate(1100, -30); c.rotate(0.03 * Math.sin(t * 0.7) + sway * 0.03);
  c.strokeStyle = '#4C3A2C'; c.lineCap = 'round'; for (const [x1, y1, x2, y2, w] of [[0, 0, -250, 130, 22], [-160, 90, -300, 80, 11], [-210, 112, -270, 220, 9], [-70, 40, -120, 170, 8]]) { c.lineWidth = w + 5; c.strokeStyle = INKC; c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 - 14, x2, y2); c.stroke(); c.lineWidth = w; c.strokeStyle = '#5A4636'; c.stroke(); }
  const cols = ['#C23A25', '#D9552A', '#E4752E', '#B8301F', '#F08A3A'];
  for (let i = 0; i < 22; i++) { const a = hash(i, 1), bx = -60 - a * 260, by = 30 + 30 * Math.sin(bx * 0.03) + 150 * hash(i, 2) * (1 - a * 0.4); mapleLeaf(c, bx + 14 * Math.sin(t * 1.2 + i), by, 34 + 18 * hash(i, 3), hash(i, 4) * 6.28 + 0.1 * Math.sin(t * 1.5 + i), cols[i % 5], 2.4); }
  c.restore();
}
function samState(x, o = {}) { return Object.assign({ x, y: FL - SAMS * 1.58, ground: FL, S: SAMS, face: -1, sx: 1, sy: 1, rot: 0, wob: 0.01, sw: { mode: 'none' }, band: { a: 1, wind: 0.3 }, a: 1, walk: null, w: 0, sneeze: 0, kick: 0, cold: 0, sad: 0, sweat: 0, strain: 0, shock: 0 }, o); }
// ---------- cached static layers ----------
let BG1 = null, BG2 = null;
function bgLayers() {
  if (BG1) return;
  const mk = () => { const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1920; return cv; };
  BG1 = mk(); drawSkyStatic(BG1.getContext('2d'));
  BG2 = mk(); const c = BG2.getContext('2d');
  // behind the wall
  for (const [x, w, top] of [[34, 22, 120], [112, 16, 250], [186, 12, 380]]) bambooStalk(c, x, top, 1000, w, w > 18 ? '#7F9A52' : '#92AA66');
  pineBehind(c, 470, 880, 1.05); mapleTree(c, 880, 900, 1.0);
  kawaraCap(c, 818); earthWall(c, 864, 1000);
  yotsume(c, 250, 560, 1038, 170);
  // gravel + moss border
  c.fillStyle = '#6F8F4E'; c.fillRect(-20, 1000, 1120, 130);
  c.fillStyle = grad(c, 0, 1000, 0, 1130, [[0, 'rgba(30,60,26,0.45)'], [0.5, 'rgba(30,60,26,0.05)'], [1, 'rgba(30,60,26,0)']]); c.fillRect(-20, 1000, 1120, 130);
  for (let i = 0; i < 160; i++) { const x = hash(i, 1) * 1100, y = 1012 + hash(i, 2) * 100; c.fillStyle = hash(i, 3) > 0.5 ? 'rgba(176,210,110,0.5)' : 'rgba(26,62,28,0.35)'; c.beginPath(); c.arc(x, y, 3 + 4 * hash(i, 4), 0, PI2); c.fill(); }
  raked(c, [[830, 1700, 6, 40], [180, 1810, 5, 40]]);
  // moss strip occludes the top of the gravel
  c.save(); c.beginPath(); c.moveTo(-20, 1000); c.lineTo(1100, 1000); for (let x = 1100; x >= -20; x -= 16) c.lineTo(x, 1112 + 7 * Math.sin(x * 0.03) + 5 * Math.sin(x * 0.08)); c.closePath(); c.fillStyle = '#6F8F4E'; c.fill(); c.clip();
  for (let i = 0; i < 220; i++) { const x = hash(i, 5) * 1100, y = 1008 + hash(i, 6) * 110; c.fillStyle = hash(i, 7) > 0.5 ? 'rgba(176,210,110,0.5)' : 'rgba(26,62,28,0.35)'; c.beginPath(); c.arc(x, y, 3 + 4 * hash(i, 8), 0, PI2); c.fill(); }
  c.restore(); c.strokeStyle = 'rgba(30,56,26,0.7)'; c.lineWidth = 3; c.beginPath(); for (let x = -20; x <= 1100; x += 16) { const y = 1112 + 7 * Math.sin(x * 0.03) + 5 * Math.sin(x * 0.08); x === -20 ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke();
  for (let x = 10, k = 0; x < 1100; k++) { const w = 20 + 10 * hash(k, 41); cobble(c, x, 1120 + 7 * Math.sin(x * 0.03), w, 13, k); x += w * 2 - 4; }
  karikomi(c, 140, 1090, 96); karikomi(c, 640, 1086, 74); karikomi(c, 990, 1092, 92);
  mossPatch(c, 420, 1160, 90, 14, 5);
  // stepping stones (tobi-ishi) leading toward the stage
  for (const [x, y, w, h] of [[250, 1890, 92, 30], [330, 1790, 82, 27], [420, 1702, 72, 24], [520, 1630, 62, 20], [612, 1568, 54, 17]]) { c.fillStyle = 'rgba(46,34,22,0.3)'; c.beginPath(); c.ellipse(x + 6, y + 8, w, h, 0, 0, PI2); c.fill(); SH(c, (c) => { E(c, x, y + 4, w, h); }, { f: '#7E7A70', line: 3.4 }); SH(c, (c) => E(c, x, y - 5, w, h), { f: '#A7A194', sh: 'rgba(40,38,34,0.32)', hl: 'rgba(255,255,255,0.36)', d: [w * 0.1, h * 0.35], line: 3.4 }); }
  rock(c, 830, 1708, 1.15, 1); rock(c, 940, 1736, 0.6, 2); rock(c, 704, 1744, 0.42, 3); rock(c, 176, 1818, 0.95, 4); rock(c, 66, 1850, 0.5, 5);
  // lantern + basin (static bodies)
  
  // fallen leaves
  for (let i = 0; i < 12; i++) fallenLeaf(c, 60 + 960 * hash(i, 7), 1190 + 700 * hash(i, 8) * hash(i, 8), 13 + 5 * hash(i, 9), hash(i, 10) * 6.28, i);
}
