'use strict';
// ================= "ดารุมะล้มไม่ลุก... ไม่ได้" — scene + daruma + props =================
// Wordless. No letters anywhere. Cast = ink samurai + Mochi; the daruma is a PROP (round red tumbler doll with a bell inside).
const FL = 1400, SAMS = 125, REDC2 = '#B3271F';
const sw = (t, n, ph = 0) => Math.sin(t * 2 * Math.PI * n / 6.4 + ph);
const rect = (c, x, y, w, h) => { c.beginPath(); c.rect(x, y, w, h); };
const PAPERF = '#F6EEDD';

// ---------- scene ----------
function wallBG(c, t) {
  c.fillStyle = '#E9DDBE'; c.fillRect(-300, -300, 1680, FL + 300);
  for (let k = 0; k < 38; k++) { c.fillStyle = `rgba(150,120,80,${0.025 + 0.03 * hash(k, 3)})`; c.fillRect(-300 + k * 46, -300, 3, FL + 300); }
  // ceiling beam
  c.fillStyle = '#4A3828'; c.fillRect(-300, 170, 1680, 38); c.strokeStyle = INKC; c.lineWidth = 4; c.strokeRect(-304, 170, 1688, 38);
  // lower wall panel (wainscot)
  c.fillStyle = '#C8AE80'; c.fillRect(-300, FL - 150, 1680, 150); c.strokeStyle = INKC; c.lineWidth = 4; c.beginPath(); c.moveTo(-300, FL - 150); c.lineTo(1380, FL - 150); c.stroke();
  // shoji window (sunbeam source)
  const wx = 400, wy = 330, ww = 340, wh = 590;
  c.fillStyle = '#FFF4D2'; c.fillRect(wx, wy, ww, wh);
  c.save(); c.globalCompositeOperation = 'lighter'; const wg = c.createRadialGradient(wx + ww / 2, wy + wh / 2, 20, wx + ww / 2, wy + wh / 2, 380); wg.addColorStop(0, 'rgba(255,214,130,0.45)'); wg.addColorStop(1, 'rgba(255,214,130,0)'); c.fillStyle = wg; c.fillRect(wx - 220, wy - 160, ww + 440, wh + 320); c.restore();
  c.strokeStyle = '#6B4F33'; c.lineWidth = 7; c.strokeRect(wx, wy, ww, wh);
  c.lineWidth = 4; for (let i = 1; i < 3; i++) { c.beginPath(); c.moveTo(wx + ww * i / 3, wy); c.lineTo(wx + ww * i / 3, wy + wh); c.stroke(); }
  for (let j = 1; j < 6; j++) { c.beginPath(); c.moveTo(wx, wy + wh * j / 6); c.lineTo(wx + ww, wy + wh * j / 6); c.stroke(); }
  c.strokeStyle = INKC; c.lineWidth = 3; c.strokeRect(wx - 3, wy - 3, ww + 6, wh + 6);
  // hanging scroll with an enso (brush circle), no letters
  const sx = 120, sy = 300, sW = 150, sH = 420;
  c.fillStyle = '#5E4B6E'; c.fillRect(sx - 14, sy - 14, sW + 28, sH + 28); c.strokeStyle = INKC; c.lineWidth = 4; c.strokeRect(sx - 14, sy - 14, sW + 28, sH + 28);
  c.fillStyle = PAPERF; c.fillRect(sx, sy, sW, sH); c.strokeRect(sx, sy, sW, sH);
  c.save(); c.strokeStyle = INKC; c.lineCap = 'round'; c.lineWidth = 15; c.beginPath(); c.arc(sx + sW / 2, sy + sH / 2, 52, -2.2, 3.7); c.stroke(); c.lineWidth = 6; c.beginPath(); c.arc(sx + sW / 2, sy + sH / 2, 58, 3.0, 3.9); c.stroke(); c.restore();
  c.fillStyle = '#3A2A1C'; c.fillRect(sx - 20, sy + sH + 14, sW + 40, 12); c.fillRect(sx - 20, sy - 26, sW + 40, 12);
  // mini-daruma shelf board (the little dolls are drawn in story.js: they move)
  c.fillStyle = '#7C5C3B'; c.fillRect(690, 1010, 400, 22); c.strokeStyle = INKC; c.lineWidth = 4; c.strokeRect(690, 1010, 400, 22);
  c.fillStyle = '#5A4028'; c.beginPath(); c.moveTo(720, 1032); c.lineTo(720, 1090); c.lineTo(770, 1032); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(1050, 1032); c.lineTo(1050, 1090); c.lineTo(1000, 1032); c.closePath(); c.fill(); c.stroke();
  // tansu (chest of drawers) on the left, never moves
  tansu(c);
}
const TAN = { x: -20, y: 1060, w: 300, h: 340 };
function tansu(c) {
  const { x, y, w, h } = TAN;
  c.fillStyle = '#8A6038'; c.fillRect(x, y, w, h); c.strokeStyle = INKC; c.lineWidth = 5; c.strokeRect(x, y, w, h);
  c.fillStyle = '#A6784A'; c.fillRect(x - 8, y - 14, w + 16, 22); c.strokeRect(x - 8, y - 14, w + 16, 22);
  for (let i = 0; i < 4; i++) {
    const dy = y + 18 + i * 78; c.fillStyle = i % 2 ? '#94683F' : '#9C7044'; c.fillRect(x + 12, dy, w - 24, 68); c.lineWidth = 3.5; c.strokeRect(x + 12, dy, w - 24, 68);
    c.fillStyle = '#3A3A3A'; c.fillRect(x + w / 2 - 28, dy + 24, 56, 10); c.strokeRect(x + w / 2 - 28, dy + 24, 56, 10);
    c.beginPath(); c.arc(x + w / 2, dy + 34, 8, 0, 7); c.fillStyle = INKC; c.fill();
  }
  c.fillStyle = '#4A3828'; c.fillRect(x + 6, y + h - 2, 30, 6); c.fillRect(x + w - 36, y + h - 2, 30, 6);
}
function floorBG(c) {
  c.save(); rect(c, -300, FL, 1700, 1200); c.clip(); c.fillStyle = '#CFC18E'; c.fillRect(-300, FL, 1700, 1200);
  const TAT = ['#D2C593', '#CBBE8A', '#CFC28F'], vx = 540, vy = FL - 300;
  for (let i = 0; i < 9; i++) { const y0 = FL + 30 * i * (1 + 0.17 * i), y1 = FL + 30 * (i + 1) * (1 + 0.17 * (i + 1)); c.fillStyle = TAT[i % 3]; c.fillRect(-300, y0, 1700, y1 - y0);
    c.fillStyle = 'rgba(58,70,34,0.6)'; c.fillRect(-300, y0 - 1, 1700, 3 + 0.5 * i); const s0 = (y0 - vy) / (FL - vy), s1 = (y1 - vy) / (FL - vy);
    for (let k = -8; k <= 8; k++) { const xo = (k + 0.5 * (i % 2)) * 520; c.strokeStyle = 'rgba(58,70,34,0.5)'; c.lineWidth = 3; c.beginPath(); c.moveTo(vx + xo * s0, y0); c.lineTo(vx + xo * s1, y1); c.stroke(); }
    c.strokeStyle = 'rgba(110,100,60,0.18)'; c.lineWidth = 1.5; for (let q = 1; q < 4; q++) { c.beginPath(); c.moveTo(-300, y0 + (y1 - y0) * q / 4); c.lineTo(1400, y0 + (y1 - y0) * q / 4); c.stroke(); } }
  const ao = c.createLinearGradient(0, FL, 0, FL + 90); ao.addColorStop(0, 'rgba(40,36,14,0.5)'); ao.addColorStop(1, 'rgba(40,36,14,0)'); c.fillStyle = ao; c.fillRect(-300, FL, 1700, 90);
  // sun patch from the window (the nap spot)
  c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,224,140,0.22)'; c.beginPath(); c.moveTo(250, FL + 30); c.lineTo(640, FL + 30); c.lineTo(720, FL + 250); c.lineTo(150, FL + 250); c.closePath(); c.fill();
  c.restore();
}
function sunbeam(c) { // soft shaft in the air (over the wall, under the characters)
  c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createLinearGradient(0, 920, 0, FL + 40); g.addColorStop(0, 'rgba(255,226,150,0.16)'); g.addColorStop(1, 'rgba(255,226,150,0.03)'); c.fillStyle = g;
  c.beginPath(); c.moveTo(400, 920); c.lineTo(740, 920); c.lineTo(640, FL + 30); c.lineTo(250, FL + 30); c.closePath(); c.fill(); c.restore();
}
function motes(c, t) { c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 18; i++) { const x = 300 + 380 * hash(i, 1) + 24 * Math.sin(t * 0.5 + i), y = 900 + 480 * ((hash(i, 2) + t * 0.012 * (0.4 + hash(i, 3))) % 1), a = 0.3 * (0.5 + 0.5 * Math.sin(t * 0.9 + i * 2)); c.fillStyle = `rgba(255,236,190,${a})`; c.beginPath(); c.arc(x, y, 2 + 2 * hash(i, 4), 0, 7); c.fill(); } c.restore(); }

// ---------- daruma ----------
// d: {x,y (centre), r, th, sx, sy, ex:{lx,ly (look dir), brow, mad, mouth, o, squeeze, dizzy, sleepy, eyeL (0 blank..1 dotted), blink}}
function daruma(c, d, t) {
  const ex = d.ex || {}, k = d.r / 100;
  c.save(); c.translate(d.x, d.y); c.rotate(d.th || 0); c.scale(k * (d.sx || 1), k * (d.sy || 1)); c.lineJoin = 'round'; c.lineCap = 'round';
  // body
  const g = c.createRadialGradient(-34, -48, 8, 0, 0, 108); g.addColorStop(0, '#D84A3B'); g.addColorStop(0.5, '#B3271F'); g.addColorStop(1, '#7A1B15');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, 100, 0, 7); c.fill(); c.strokeStyle = INKC; c.lineWidth = 6.5; c.stroke();
  // gold belly ornament (no letters): two arcs + three coins
  c.strokeStyle = '#D9B25A'; c.lineWidth = 6; c.beginPath(); c.arc(0, 8, 84, 0.34, 2.8); c.stroke(); c.lineWidth = 4; c.beginPath(); c.arc(0, 8, 70, 0.5, 2.64); c.stroke();
  for (const [px, py, pr] of [[-34, 64, 10], [0, 78, 12], [34, 64, 10]]) { c.fillStyle = '#D9B25A'; c.beginPath(); c.arc(px, py, pr, 0, 7); c.fill(); c.strokeStyle = INKC; c.lineWidth = 3; c.stroke(); }
  // face
  c.fillStyle = PAPERF; c.beginPath(); c.ellipse(0, -16, 68, 58, 0, 0, 7); c.fill(); c.strokeStyle = INKC; c.lineWidth = 4.5; c.stroke();
  // cheek curls (side whiskers)
  c.strokeStyle = INKC; c.lineWidth = 6.5; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 66, -4); c.quadraticCurveTo(s * 80, 10, s * 66, 22); c.quadraticCurveTo(s * 56, 26, s * 54, 16); c.stroke(); }
  // eyes
  const lx = (ex.lx || 0), ly = (ex.ly || 0), wide = 1 + 0.35 * (ex.o || 0), blink = ex.blink || 0, sl = ex.sleepy || 0;
  for (const s of [-1, 1]) {
    const cx = s * 27, cy = -26; const isL = s < 0;
    if ((ex.squeeze || 0) > 0.5) { c.strokeStyle = INKC; c.lineWidth = 6; c.beginPath(); c.moveTo(cx - s * 12, cy - 9); c.lineTo(cx + s * 10, cy); c.lineTo(cx - s * 12, cy + 9); c.stroke(); continue; }
    c.save(); c.translate(cx, cy);
    c.fillStyle = '#FFFFFF'; c.strokeStyle = INKC; c.lineWidth = 3.8; c.beginPath(); c.ellipse(0, 0, 15 * wide, 13 * wide * (1 - blink), 0, 0, 7); c.fill(); c.stroke();
    const show = isL ? (ex.eyeL || 0) : 1;
    if (show > 0.02 && blink < 0.6) {
      if (ex.dizzy) { c.strokeStyle = INKC; c.lineWidth = 2.6; c.beginPath(); for (let a = 0; a < 18; a += 0.4) { const rr = 1 + a * 0.55; c.lineTo(Math.cos(a + t * 12 * (isL ? 1 : -1)) * rr, Math.sin(a + t * 12 * (isL ? 1 : -1)) * rr); } c.stroke(); }
      else { c.fillStyle = INKC; c.beginPath(); c.arc(lx * 5, ly * 4, 7 * wide * show, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(lx * 5 - 2, ly * 4 - 2.5, 2.2, 0, 7); c.fill(); }
    }
    if (sl > 0.02) { c.fillStyle = PAPERF; c.beginPath(); c.rect(-18, -16, 36, 16 + 14 * sl); c.fill(); c.strokeStyle = INKC; c.lineWidth = 3.4; c.beginPath(); c.moveTo(-15, 14 * sl); c.quadraticCurveTo(0, 14 * sl + 5, 15, 14 * sl); c.stroke(); }
    c.restore();
  }
  // brows (thick brush strokes), brow = raise 0..1, mad = -1 worried .. +1 angry
  const br = ex.brow || 0, md = ex.mad || 0;
  for (const s of [-1, 1]) { c.save(); c.translate(s * 30, -50 - 12 * br); c.rotate(s * md * 0.45); c.fillStyle = INKC; c.beginPath(); c.moveTo(-s * 24, 8); c.quadraticCurveTo(-s * 2, -14 - 6 * br, s * 22, 0); c.quadraticCurveTo(0, -4 - 4 * br, -s * 24, 8); c.fill(); c.restore(); }
  // nose
  c.strokeStyle = INKC; c.lineWidth = 4; c.beginPath(); c.moveTo(0, -12); c.quadraticCurveTo(7, -2, 0, 3); c.stroke();
  // moustache
  c.lineWidth = 8; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 3, 8); c.quadraticCurveTo(s * 32, 20, s * 52, 4); c.quadraticCurveTo(s * 60, -4, s * 52, -6); c.stroke(); }
  // mouth
  const mo = ex.mouth || 0, o = ex.o || 0; c.lineWidth = 4.5;
  if (o > 0.3) { c.fillStyle = '#5A1410'; c.beginPath(); c.ellipse(0, 28, 9, 10 * o, 0, 0, 7); c.fill(); c.stroke(); }
  else { c.beginPath(); c.moveTo(-14, 28 - 3 * mo); c.quadraticCurveTo(0, 28 + 12 * mo, 14, 28 - 3 * mo); c.stroke(); }
  // gloss
  c.fillStyle = 'rgba(255,230,220,0.5)'; c.beginPath(); c.ellipse(-60, -62, 11, 20, 0.6, 0, 7); c.fill();
  c.restore();
}
function tingRings(c, x, y, k, big = 1) { // pictogram of the bell: two arcs that open and fade (no letters)
  if (k <= 0 || k >= 1) return; c.save(); c.translate(x, y); c.strokeStyle = INKC; c.lineCap = 'round';
  for (const [rr, ph] of [[1, 0], [1.6, 0.25]]) { const q = clamp((k - ph) / (1 - ph)); if (q <= 0) continue; c.globalAlpha = 0.9 * (1 - q); c.lineWidth = 6 * (1 - q * 0.5); const R0 = (26 + 54 * q) * rr * big;
    for (const s of [-1, 1]) { c.beginPath(); c.arc(0, 0, R0, s < 0 ? Math.PI * 0.72 : -0.28 * Math.PI, s < 0 ? Math.PI * 1.28 : 0.28 * Math.PI); c.stroke(); } }
  c.restore();
}

// ---------- props ----------
function inkRect(c, x, y, w, h, fill, r = 0) { c.beginPath(); if (r) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); c.fillStyle = fill; c.fill(); c.strokeStyle = INKC; c.lineWidth = 4.5; c.lineJoin = 'round'; c.stroke(); }
function cushion(c, x, y, sq) { // zabuton; y = floor line
  const h = 40 - 20 * sq, w = 250 + 22 * sq; c.save(); c.translate(x, y);
  c.fillStyle = '#3F5662'; c.beginPath(); c.roundRect(-w / 2, -h, w, h, 9); c.fill(); c.strokeStyle = INKC; c.lineWidth = 5; c.stroke();
  c.strokeStyle = 'rgba(243,234,214,0.75)'; c.lineWidth = 3; c.beginPath(); c.moveTo(-w / 2 + 12, -h * 0.5); c.lineTo(w / 2 - 12, -h * 0.5); c.stroke();
  c.fillStyle = REDC2; for (const s of [-1, 1]) { c.beginPath(); c.arc(s * (w / 2 - 6), -h + 4, 7, 0, 7); c.fill(); c.stroke(); } c.restore();
}
function stone(c, x, y, rot, sq = 0) { // garden stone, y = bottom
  c.save(); c.translate(x, y - 52 * (1 - 0.3 * sq)); c.rotate(rot); c.scale(1 + 0.2 * sq, 1 - 0.3 * sq);
  const g = c.createRadialGradient(-16, -20, 6, 0, 0, 66); g.addColorStop(0, '#B8B4A8'); g.addColorStop(1, '#6F6C64'); c.fillStyle = g;
  c.beginPath(); c.moveTo(-58, 12); c.quadraticCurveTo(-62, -40, -10, -52); c.quadraticCurveTo(48, -52, 60, -4); c.quadraticCurveTo(62, 44, 0, 52); c.quadraticCurveTo(-52, 52, -58, 12); c.closePath(); c.fill(); c.strokeStyle = INKC; c.lineWidth = 5; c.stroke();
  c.strokeStyle = 'rgba(40,40,36,0.4)'; c.lineWidth = 3; c.beginPath(); c.moveTo(-30, 20); c.quadraticCurveTo(-10, 6, 12, 18); c.stroke(); c.beginPath(); c.moveTo(18, -22); c.quadraticCurveTo(30, -12, 28, 4); c.stroke(); c.restore();
}
function blanket(c, x, y, r, th, sag, alpha = 1) { // draped over a round object centred (x,y) radius r
  c.save(); c.globalAlpha = alpha; c.translate(x, y); c.rotate(th * 0.4);
  const R = r * 1.12, w = R * 1.35; c.beginPath(); c.moveTo(-w, R + 4 + sag * 6); c.quadraticCurveTo(-R * 1.22, -R * 0.2, -R * 0.5, -R * 0.98); c.quadraticCurveTo(0, -R * 1.16, R * 0.5, -R * 0.98); c.quadraticCurveTo(R * 1.22, -R * 0.2, w, R + 4 + sag * 6);
  c.lineTo(w * 0.7, R + 16 + sag * 6); c.lineTo(w * 0.35, R + 4); c.lineTo(0, R + 18); c.lineTo(-w * 0.35, R + 4); c.lineTo(-w * 0.7, R + 16 + sag * 6); c.closePath();
  c.fillStyle = '#5E4B6E'; c.fill(); c.strokeStyle = INKC; c.lineWidth = 5; c.stroke();
  c.strokeStyle = 'rgba(243,234,214,0.55)'; c.lineWidth = 4; c.beginPath(); c.moveTo(-w * 0.9, R * 0.2); c.quadraticCurveTo(0, R * 0.05, w * 0.9, R * 0.2); c.stroke();
  c.strokeStyle = 'rgba(20,14,34,0.4)'; c.lineWidth = 3; for (const f of [-0.5, 0, 0.5]) { c.beginPath(); c.moveTo(f * R * 0.7, -R * 0.9); c.quadraticCurveTo(f * R * 1.1, 0, f * R * 1.25, R); c.stroke(); } c.restore();
}
function blanketFlat(c, x, y, rot, folded) { // on the floor, y = floor line
  c.save(); c.translate(x, y); c.rotate(rot); if (folded >= 1) { inkRect(c, -60, -34, 120, 34, '#5E4B6E', 5); c.strokeStyle = 'rgba(243,234,214,0.55)'; c.lineWidth = 4; c.beginPath(); c.moveTo(-50, -18); c.lineTo(50, -18); c.stroke(); }
  else { const w = 150 + 50 * (1 - folded); c.beginPath(); c.moveTo(-w, 0); c.quadraticCurveTo(-w * 0.5, -46 * folded - 12, 0, -20); c.quadraticCurveTo(w * 0.5, -46 * folded - 6, w, 0); c.closePath(); c.fillStyle = '#5E4B6E'; c.fill(); c.strokeStyle = INKC; c.lineWidth = 5; c.stroke(); }
  c.restore();
}
function bucket(c, x, y, tilt, fill) { // sand bucket; y = floor
  c.save(); c.translate(x, y); c.rotate(tilt); c.translate(0, -60);
  c.beginPath(); c.moveTo(-50, -56); c.lineTo(50, -56); c.lineTo(40, 56); c.lineTo(-40, 56); c.closePath(); c.fillStyle = '#9A7448'; c.fill(); c.strokeStyle = INKC; c.lineWidth = 5; c.stroke();
  c.strokeStyle = '#4A3828'; c.lineWidth = 6; for (const yy of [-30, 28]) { c.beginPath(); c.moveTo(-47 + (yy < 0 ? 0 : 5), yy); c.lineTo(47 - (yy < 0 ? 0 : 5), yy); c.stroke(); }
  if (fill > 0.02) { c.fillStyle = '#D8C38A'; c.beginPath(); c.moveTo(-50, -56); c.quadraticCurveTo(0, -56 - 22 * fill, 50, -56); c.lineTo(50, -50); c.lineTo(-50, -50); c.closePath(); c.fill(); c.strokeStyle = INKC; c.lineWidth = 3.5; c.stroke(); }
  c.strokeStyle = INKC; c.lineWidth = 5; c.beginPath(); c.arc(0, -56, 50, Math.PI, 0); c.stroke(); c.restore();
}
function sandMound(c, x, y, h, w) { // y = floor
  if (h <= 1) return; c.save(); c.translate(x, y); c.beginPath(); c.moveTo(-w, 0); c.quadraticCurveTo(-w * 0.6, -h * 0.95, 0, -h); c.quadraticCurveTo(w * 0.6, -h * 0.95, w, 0); c.closePath();
  c.fillStyle = '#D8C38A'; c.fill(); c.strokeStyle = INKC; c.lineWidth = 5; c.stroke(); c.strokeStyle = 'rgba(120,96,50,0.5)'; c.lineWidth = 3; for (let i = 0; i < 6; i++) { const px = (hash(i, 7) - 0.5) * w * 1.1, py = -h * 0.2 * (1 + hash(i, 8)) - 6; c.beginPath(); c.moveTo(px - 12, py); c.lineTo(px + 12, py + 3); c.stroke(); } c.restore();
}
function sandSpray(c, x, y, k, spread, n = 22) { // falling sand grains (k 0..1)
  if (k <= 0 || k >= 1) return; c.save(); c.fillStyle = '#D8C38A'; c.strokeStyle = INKC; c.lineWidth = 1.5; for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (hash(i, 11) - 0.5) * 2.4, v = 260 + 380 * hash(i, 12), px = x + Math.cos(a) * v * k * spread, py = y + Math.sin(a) * v * k * 1.1 + 900 * k * k * (0.5 + hash(i, 13)); const r = 4 + 5 * hash(i, 14); if (py > FL + 30) continue; c.beginPath(); c.arc(px, py, r, 0, 7); c.fill(); c.stroke(); } c.restore();
}
function yarnBallD(c, x, y, rot, r = 38) { // y = centre
  c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = REDC2; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill(); c.strokeStyle = INKC; c.lineWidth = 4.5; c.stroke();
  c.strokeStyle = 'rgba(243,234,214,0.6)'; c.lineWidth = 3; for (const a of [0.3, 0.9, 1.5]) { c.beginPath(); c.ellipse(0, 0, r * 0.92, r * 0.42, a * 2, 0, 7); c.stroke(); } c.restore();
}
function thread(c, pts, col = REDC2, w = 5) { c.save(); c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); pts.forEach((p, i) => { if (i === 0) c.moveTo(p[0], p[1]); else c.lineTo(p[0], p[1]); }); c.stroke(); c.strokeStyle = INKC; c.lineWidth = 1.6; c.stroke(); c.restore(); }
function rope(c, p0, p1, slack) { const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2 + slack; c.save(); c.strokeStyle = '#7A5A3A'; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(p0[0], p0[1]); c.quadraticCurveTo(mx, my, p1[0], p1[1]); c.stroke(); c.strokeStyle = INKC; c.lineWidth = 2.5; c.setLineDash([8, 6]); c.beginPath(); c.moveTo(p0[0], p0[1]); c.quadraticCurveTo(mx, my, p1[0], p1[1]); c.stroke(); c.restore(); }
function dust(c, x, y, k, a = 1, r = 14) { if (k <= 0 || k >= 1) return; c.save(); for (let i = 0; i < 6; i++) { const dir = i < 3 ? -1 : 1, d = k * (30 + 16 * (i % 3)), px = x + dir * d * (0.8 + 0.3 * (i % 3)), py = y - 8 * (i % 3) - k * 20, rr = r * (0.7 + k * 1.2 + 0.2 * (i % 3)); c.fillStyle = `rgba(250,246,236,${0.7 * a * (1 - k)})`; c.beginPath(); c.arc(px, py, rr, 0, 7); c.fill(); } c.restore(); }
function bubble(c, x, y, r, a = 1) { // sleep bubble from the nose
  if (r < 2) return; c.save(); c.globalAlpha = a; c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.strokeStyle = INKC; c.lineWidth = 4; c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = 4; c.beginPath(); c.arc(x, y, r * 0.7, -2.6, -1.7); c.stroke(); c.restore();
}
function stars(c, x, y, k, n = 3, r = 40) { // dizzy stars / impact marks as plain shapes
  c.save(); c.translate(x, y); c.fillStyle = '#E8C55A'; c.strokeStyle = INKC; c.lineWidth = 3; for (let i = 0; i < n; i++) { const a = k * 6 + i * 6.283 / n, px = Math.cos(a) * r, py = Math.sin(a) * r * 0.4; c.save(); c.translate(px, py); c.rotate(a); c.beginPath(); for (let j = 0; j < 10; j++) { const rr = j % 2 ? 6 : 14, aa = j * Math.PI / 5; c.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } c.closePath(); c.fill(); c.stroke(); c.restore(); } c.restore();
}

// ---------- samurai (same recipes as the approved kit) ----------
function samState(x, o = {}) { return Object.assign({ x, y: FL - SAMS * 1.58, ground: FL, S: SAMS, face: -1, sx: 1, sy: 1, rot: 0, wob: 0.01, sw: { mode: 'none' }, band: { a: 1, wind: 0.3 }, a: 1, walk: null, w: 0, sneeze: 0, kick: 0, cold: 0, sad: 0, sweat: 0, strain: 0, shock: 0 }, o); }
function samBand(ctx, st, t) {
  const g = samGeom(st, t), S = st.S, ba = st.band.a, wind = st.band.wind;
  ctx.save(); pathPoly(ctx, g.pts); ctx.clip();
  const top = [], bot = []; for (let k = 0; k <= 16; k++) { const x = -1.2 + 2.4 * k / 16; top.push(g.X(x, -0.34 + 0.1 * x * x)); bot.push(g.X(x, -0.1 + 0.1 * x * x)); }
  fillPoly(ctx, top.concat(bot.slice().reverse()), REDC2, ba); ctx.restore(); ctx.globalAlpha = 1;
  const kn = g.X(-0.72, -0.22);
  for (const [dy, ph, ln] of [[0, 0, 1], [0.1, 1.3, 0.8]]) { const tp = []; for (let k = 0; k <= 7; k++) { const q = k / 7; tp.push(g.X(-0.72 - 1.0 * q * ln - 0.15 * wind * q, -0.22 + dy + 0.35 * q * (1.2 - wind * 0.8) + Math.sin(t * 2 * Math.PI / 6.4 * 2 - k * 1.1 + ph) * 0.12 * q * wind)); }
    brushPts(ctx, tp, { w: S * 0.09, col: REDC2, a: ba, taper: 0.45, head: 0.1, stri: 0, dry: 0, seed: 20 + ph * 7, pf: 1 }, 2); }
  ctx.globalAlpha = ba; ctx.fillStyle = REDC2; ctx.beginPath(); ctx.ellipse(kn[0], kn[1], S * 0.12, S * 0.09, 0.4, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
}
function mochiPose(sw_) { const P = clonePose(P_SIT); if (sw_ > 0) { P.L.FN = [10, 15, 12 + 62 * sw_, -6 - 34 * sw_]; P.L.FF = [2, 15, 4 + 54 * sw_, -4 - 30 * sw_]; } return P; }
function mochi(x, y, s, t, o = {}) { return { mouth: {}, face: -1, kind: 'kit', col: ORG.k1, sd: 3, rot: o.rot || 0, pro: 'sit', x, y, s, pose: mochiPose(o.swat || 0), e: { sleep: o.sleep || 0, open: 1, wide: o.wide ?? 0.15, look: o.look || [0.3, -0.2], dil: 0.4 + 0.5 * (o.wide || 0), sparkle: 1 }, breath: 0.02 * sw(t, 3, 0.2), tailWig: o.tail ?? 0.12, tailPh: t * 2 * Math.PI / 6.4 * 2, earTw: 0.05 * sw(t, 5, 0.4), blush: 0.5, hTilt: o.tilt ?? 0.05, mode: 'walk' }; }

function initStory(canvas) { deepFreeze(P_SIT); initEngine(canvas); initCast(); }
