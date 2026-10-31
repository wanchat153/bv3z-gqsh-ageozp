// Stick-toon characters: big round white head, bean torso (vest / coat / shirt), noodle arms with ball hands,
// thin stick legs. Drawn with Canvas2D onto a camera-facing plane (use makeFlat() from flat.js).
// Canvas units: the plane is 1024 wide, origin at the centre, y down. Feet rest at y = +440, head top near -470.
// Detail pass (matches the reference): soft form shading on head/torso, stitched straps with buckles, pocket pens,
// hair strands and highlights, cap panels and button, shoe soles, ink line weight 14 (outer) / 6–9 (inner).
import { clamp } from './toon.js';

export const INK = '#2a1a16';   // warm dark-brown ink (reference: never pure black)
const LW = 14;
const SKIN = '#f9ede1';         // cream with a pink cast

const ell = (c, x, y, rx, ry, rot = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); };
const ink = (c, fill, lw = LW) => { if (fill) { c.fillStyle = fill; c.fill(); } c.lineWidth = lw; c.strokeStyle = INK; c.stroke(); };
const line = (c, pts, lw, col = INK) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.lineWidth = lw; c.strokeStyle = col; c.stroke(); };
const hex = (h, k) => { const n = parseInt(h.slice(1), 16); const f = (v) => clamp(Math.round(v * (1 + k)), 0, 255); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };
// fill the current path with a light→dark gradient (light from the upper left) and a soft rim
function formFill(c, col, x0, y0, x1, y1, k = 0.22) {
  const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, hex(col, k * 0.35)); g.addColorStop(0.55, col); g.addColorStop(1, hex(col, -k)); c.fillStyle = g; c.fill();
}

// ---- brush ink: thick-thin strokes like the reference's hand inking ----
// ellipse outline whose width swells on the shadow side (angle `ang`, canvas y down) and thins on the lit side
export function ringStroke(c, cx, cy, rx, ry, w, k = 0.6, ang = 0.7, col = INK) {
  const N = 96, out = [], inn = [];
  for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2; const ww = w * (1 - k / 2 + k * Math.max(0, Math.cos(a - ang))) * (1 + 0.06 * Math.sin(a * 7));
    const x = Math.cos(a), y = Math.sin(a); out.push([cx + x * (rx + ww / 2), cy + y * (ry + ww / 2)]); inn.push([cx + x * (rx - ww / 2), cy + y * (ry - ww / 2)]); }
  c.beginPath(); out.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); for (let i = inn.length - 1; i >= 0; i--) c.lineTo(inn[i][0], inn[i][1]); c.closePath(); c.fillStyle = col; c.fill();
}
// tapered stroke along a quadratic curve a → (ctrl) → b: thick in the middle, pointed ends
export function taper(c, a, ctrl, b, w, col = INK, ends = 0.18) {
  const N = 24, L = [], R = [];
  for (let i = 0; i <= N; i++) { const u = i / N, v = 1 - u;
    const x = v * v * a[0] + 2 * v * u * ctrl[0] + u * u * b[0], y = v * v * a[1] + 2 * v * u * ctrl[1] + u * u * b[1];
    let dx = 2 * v * (ctrl[0] - a[0]) + 2 * u * (b[0] - ctrl[0]), dy = 2 * v * (ctrl[1] - a[1]) + 2 * u * (b[1] - ctrl[1]); const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
    const ww = w * (ends + (1 - ends) * Math.pow(Math.sin(Math.PI * u), 0.7)) / 2; L.push([x - dy * ww, y + dx * ww]); R.push([x + dy * ww, y - dx * ww]); }
  c.beginPath(); L.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); for (let i = R.length - 1; i >= 0; i--) c.lineTo(R[i][0], R[i][1]); c.closePath(); c.fillStyle = col; c.fill();
}

// noodle limb: shoulder → hand with a sideways bend
function noodle(c, a, b, bend, lw) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; const dx = b[0] - a[0], dy = b[1] - a[1]; const L = Math.hypot(dx, dy) || 1;
  const cx = mx + (-dy / L) * bend, cy = my + (dx / L) * bend;
  c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo(cx, cy, b[0], b[1]); c.lineWidth = lw; c.strokeStyle = INK; c.stroke();
}

// ---- face parts ----
function eyes(c, p) {
  const k = p.eyes || 'ring'; const look = p.look || [0, 0]; const ex = [-62, 62], ey = -300;
  for (let i = 0; i < 2; i++) {
    const x = ex[i], y = ey;
    if (p.wink && i === 1) { taper(c, [x - 28, y + 6], [x, y - 14], [x + 28, y + 6], 13); continue; }
    if (k === 'dot') { ell(c, x + look[0] * 10, y + look[1] * 8, 13, 17); c.fillStyle = INK; c.fill(); }
    else if (k === 'bean') { ell(c, x + look[0] * 8, y + look[1] * 6, 10, 16); c.fillStyle = INK; c.fill(); }
    else if (k === 'dash') taper(c, [x - 26, y + 4], [x, y + 1], [x + 26, y + 4], 13);
    else if (k === 'ring' || k === 'wide') {
      const r = k === 'wide' ? 34 : 24; ell(c, x, y, r, r * 1.05); ink(c, '#fff', LW * 0.7);
      ell(c, x + look[0] * r * 0.38, y + look[1] * r * 0.38, r * 0.34, r * 0.36); c.fillStyle = INK; c.fill();
    } else if (k === 'spiral') {
      c.beginPath(); for (let a = 0; a < Math.PI * 5; a += 0.15) { const r = 4 + a * 2.6; const px = x + Math.cos(a + (p.spin || 0)) * r, py = y + Math.sin(a + (p.spin || 0)) * r; a === 0 ? c.moveTo(px, py) : c.lineTo(px, py); }
      c.lineWidth = 8; c.strokeStyle = INK; c.stroke();
    } else if (k === 'happy') { c.beginPath(); c.arc(x, y + 10, 26, Math.PI * 1.1, Math.PI * 1.9); c.lineWidth = 11; c.strokeStyle = INK; c.stroke(); }
    else if (k === 'closed') line(c, [[x - 24, y + 4], [x + 24, y + 4]], 10);
    else if (k === 'flat') {
      ell(c, x, y, 34, 30); ink(c, '#fff', LW * 0.8); c.save(); ell(c, x, y, 34, 30); c.clip();
      ell(c, x + look[0] * 10, y + 8, 13, 14); c.fillStyle = INK; c.fill(); c.fillStyle = SKIN; c.fillRect(x - 40, y - 34, 80, 32); c.restore();
      line(c, [[x - 36, y - 2], [x + 36, y - 2]], 10);
    }
  }
  if (p.brow !== undefined && p.brow !== null) { const a = p.brow; for (const s of [-1, 1]) { const x = s * 62; c.save(); c.translate(x, -358); c.rotate(-s * a); taper(c, [-34, 4], [0, -8], [34, 2], 15); c.restore(); } }
  if (p.glasses) { for (const x of ex) { ell(c, x, ey, 50, 46); c.fillStyle = 'rgba(200,230,255,0.18)'; c.fill(); c.lineWidth = 9; c.strokeStyle = INK; c.stroke();
    c.beginPath(); c.arc(x - 8, ey - 8, 30, Math.PI * 1.1, Math.PI * 1.4); c.lineWidth = 5; c.strokeStyle = 'rgba(255,255,255,0.8)'; c.stroke(); } line(c, [[-12, ey - 6], [12, ey - 6]], 8); }
  if (p.blush) for (const x of [-100, 100]) { ell(c, x, -240, 26, 14); c.fillStyle = 'rgba(240,120,130,0.35)'; c.fill(); }
}
function mouth(c, p) {
  const k = p.mouth || 'line'; const y = -205;
  if (k === 'line') taper(c, [-36, y + 2], [0, y - 2], [36, y + 2], 13);
  else if (k === 'frown') taper(c, [-44, y + 14], [0, y - 22], [44, y + 14], 14);
  else if (k === 'smile') taper(c, [-40, y - 10], [0, y + 32], [40, y - 10], 14);
  else if (k === 'grin') { c.beginPath(); c.moveTo(-60, y - 14); c.quadraticCurveTo(0, y + 60, 60, y - 14); c.closePath(); ink(c, '#fff', 10); line(c, [[-52, y - 2], [52, y - 2]], 6);
    c.save(); c.beginPath(); c.moveTo(-60, y - 14); c.quadraticCurveTo(0, y + 60, 60, y - 14); c.closePath(); c.clip(); ell(c, 0, y + 30, 30, 16); c.fillStyle = '#e8737f'; c.fill(); c.restore(); }
  else if (k === 'grit') {
    c.beginPath(); c.roundRect(-46, y - 26, 92, 50, 12); ink(c, '#fff', 10);
    line(c, [[-46, y - 1], [46, y - 1]], 6); for (const x of [-22, 0, 22]) line(c, [[x, y - 26], [x, y + 24]], 6);
  } else if (k === 'o') { ell(c, 0, y, 18, 24); ink(c, '#3a1d28', 9); }
  else if (k === 'wobble') { c.beginPath(); c.moveTo(-40, y); for (let i = 1; i <= 8; i++) c.lineTo(-40 + i * 10, y + (i % 2 ? -8 : 8)); c.lineWidth = 9; c.strokeStyle = INK; c.stroke(); }
  else if (k === 'smirk') taper(c, [-30, y + 4], [12, y + 18], [44, y - 14], 13);
  if (p.stache === 'droop') { taper(c, [0, y - 40], [-40, y - 46], [-58, y + 6], 16, INK, 0.1); taper(c, [0, y - 40], [40, y - 46], [58, y + 6], 16, INK, 0.1); }
  else if (p.stache) { c.beginPath(); c.moveTo(-34, y - 34); c.quadraticCurveTo(0, y - 52, 34, y - 34); c.quadraticCurveTo(0, y - 24, -34, y - 34); c.fillStyle = INK; c.fill(); }
}
function strands(c, col, pts) { c.lineWidth = 5; c.strokeStyle = hex(col, -0.35); for (const [a, b, d] of pts) { c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo(d[0], d[1], b[0], b[1]); c.stroke(); } }
function hair(c, p) {
  const k = p.hair || 'none'; const col = p.hairCol || '#4a3020';
  if (k === 'bowl') { const path = () => { c.beginPath(); c.arc(0, -300, 172, Math.PI * 1.02, Math.PI * 1.98); c.quadraticCurveTo(120, -400, 0, -392); c.quadraticCurveTo(-120, -400, -170, -318); };
    path(); formFill(c, col, -150, -470, 150, -320); c.lineWidth = LW; c.strokeStyle = INK; c.stroke();
    c.save(); path(); c.clip(); strands(c, col, [[[-120, -420], [-60, -400], [-100, -440]], [[-40, -460], [20, -400], [-20, -450]], [[50, -455], [110, -395], [90, -450]]]);
    c.beginPath(); c.arc(-40, -420, 80, Math.PI * 1.15, Math.PI * 1.5); c.lineWidth = 12; c.strokeStyle = 'rgba(255,255,255,0.25)'; c.stroke(); c.restore(); }
  else if (k === 'side') { const path = () => { c.beginPath(); c.moveTo(-168, -300); c.quadraticCurveTo(-170, -470, 20, -472); c.quadraticCurveTo(170, -462, 168, -320); c.quadraticCurveTo(60, -420, -60, -360); c.quadraticCurveTo(-120, -330, -168, -300); };
    path(); formFill(c, col, -150, -470, 150, -320); c.lineWidth = LW; c.strokeStyle = INK; c.stroke();
    c.save(); path(); c.clip(); strands(c, col, [[[-140, -340], [40, -450], [-80, -440]], [[-100, -320], [100, -430], [0, -420]]]); c.restore(); }
  else if (k === 'tuft') { for (const s of [-1, 1]) { ell(c, s * 160, -310, 30, 44); ink(c, '#d9d6cf', 9); } }
  else if (k === 'bun') { ell(c, 0, -478, 56, 46); formFill(c, col, -50, -520, 50, -440); c.lineWidth = LW; c.strokeStyle = INK; c.stroke();
    c.beginPath(); c.arc(0, -300, 172, Math.PI * 1.08, Math.PI * 1.92); c.quadraticCurveTo(0, -420, -165, -340); formFill(c, col, -150, -470, 150, -320); c.lineWidth = LW; c.strokeStyle = INK; c.stroke(); }
}
function hat(c, p) {
  const k = p.hat; if (!k) return; const col = p.hatCol || '#e0453a';
  if (k === 'cap') {   // sits high: brim bottom stays above the eyes (y ≈ -336)
    c.beginPath(); c.arc(0, -362, 166, Math.PI, 0); c.closePath(); formFill(c, col, -140, -510, 160, -362, 0.28); c.lineWidth = LW; c.strokeStyle = INK; c.stroke();
    for (const x of [-70, 70]) { c.beginPath(); c.moveTo(0, -526); c.quadraticCurveTo(x * 1.2, -460, x * 1.6, -364); c.lineWidth = 5; c.strokeStyle = hex(col, -0.3); c.stroke(); }
    c.setLineDash([10, 10]); c.beginPath(); c.arc(0, -362, 148, Math.PI * 1.05, Math.PI * 1.95); c.lineWidth = 3; c.strokeStyle = hex(col, -0.35); c.stroke(); c.setLineDash([]);
    ell(c, 0, -360, 176, 24); formFill(c, col, 0, -384, 0, -336, 0.3); c.lineWidth = LW; c.strokeStyle = INK; c.stroke();
    ell(c, 0, -528, 15, 11); ink(c, hex(col, -0.15), 8);
    c.beginPath(); c.arc(-60, -452, 70, Math.PI * 1.2, Math.PI * 1.45); c.lineWidth = 10; c.strokeStyle = 'rgba(255,255,255,0.3)'; c.stroke();
  } else if (k === 'hardhat') { c.beginPath(); c.arc(0, -340, 160, Math.PI, 0); c.closePath(); formFill(c, col || '#f4c430', -140, -480, 160, -340); c.lineWidth = LW; c.strokeStyle = INK; c.stroke();
    line(c, [[0, -498], [0, -350]], 22, hex(col || '#f4c430', -0.1)); c.beginPath(); c.roundRect(-196, -350, 392, 34, 16); formFill(c, col || '#f4c430', 0, -350, 0, -316); c.lineWidth = LW; c.strokeStyle = INK; c.stroke(); }
  else if (k === 'straw') { ell(c, 0, -360, 250, 46); formFill(c, '#e9c46a', -200, -400, 200, -320); c.lineWidth = LW; c.strokeStyle = INK; c.stroke();
    c.beginPath(); c.roundRect(-120, -470, 240, 120, 40); formFill(c, '#e9c46a', -120, -470, 120, -350); c.lineWidth = LW; c.strokeStyle = INK; c.stroke();
    c.strokeStyle = 'rgba(150,100,30,0.45)'; c.lineWidth = 3; for (let x = -100; x <= 100; x += 18) line(c, [[x, -462], [x + 6, -385]], 3, 'rgba(150,100,30,0.45)');
    line(c, [[-118, -380], [118, -380]], 22, '#a0522d'); }
}

// ---- torso ----
const torsoPath = (c) => ell(c, 0, 20, 112, 170);
function stitch(c, pts, col) { c.setLineDash([10, 9]); line(c, pts, 3.5, col); c.setLineDash([]); }
function buckle(c, x, y) { c.beginPath(); c.roundRect(x - 22, y - 16, 44, 32, 6); ink(c, '#c9ced6', 6); c.beginPath(); c.roundRect(x - 10, y - 6, 20, 12, 3); c.fillStyle = '#7d8590'; c.fill(); }
function torso(c, p) {
  const o = p.outfit || { kind: 'vest', col: '#f39a2b' }; const col = o.col || '#f39a2b';
  if (o.kind === 'coat') {
    const path = () => { c.beginPath(); c.moveTo(-95, -140); c.quadraticCurveTo(-140, 60, -150, 210); c.lineTo(150, 210); c.quadraticCurveTo(140, 60, 95, -140); c.quadraticCurveTo(0, -175, -95, -140); };
    path(); formFill(c, '#ffffff', -150, -150, 150, 210, 0.1); c.lineWidth = LW; c.strokeStyle = INK; c.stroke();
    c.save(); path(); c.clip(); c.fillStyle = 'rgba(120,130,150,0.18)'; c.beginPath(); c.moveTo(60, -150); c.quadraticCurveTo(160, 40, 150, 220); c.lineTo(70, 220); c.quadraticCurveTo(90, 40, 60, -150); c.fill(); c.restore();
    line(c, [[-40, -150], [0, -40], [40, -150]], 7); line(c, [[0, -40], [0, 205]], 6);
    for (const y of [10, 80, 150]) { ell(c, 14, y, 9, 9); ink(c, '#e8e8e8', 4); }
    c.beginPath(); c.roundRect(-82, -20, 56, 50, 6); ink(c, '#fff', 6);
    line(c, [[-68, -48], [-68, -10]], 8, '#2f6fd6'); line(c, [[-50, -46], [-50, -10]], 8, '#d63a3a'); ell(c, -68, -50, 5, 5); c.fillStyle = '#c9ced6'; c.fill();
    c.beginPath(); c.roundRect(40, 120, 70, 46, 6); ink(c, '#fff', 6);
  } else {
    torsoPath(c); formFill(c, o.under || col, -110, -150, 112, 190, 0.26);
    c.save(); torsoPath(c); c.clip();
    if (o.kind === 'vest') {
      const st = o.strap || hex(col, -0.18), sd = hex(col, -0.45);
      for (const x of [-52, 52]) { line(c, [[x, -160], [x, 190]], 30, st); stitch(c, [[x - 11, -160], [x - 11, 190]], sd); stitch(c, [[x + 11, -160], [x + 11, 190]], sd); }
      line(c, [[-112, 40], [112, 40]], 26, st); stitch(c, [[-112, 30], [112, 30]], sd); stitch(c, [[-112, 50], [112, 50]], sd);
      stitch(c, [[-96, -120], [-104, 120]], sd); stitch(c, [[96, -120], [104, 120]], sd);
      line(c, [[-112, 165], [112, 165]], 26, hex(col, -0.3));
    } else if (o.kind === 'shirt') {
      line(c, [[0, -150], [0, 190]], 4, hex(col, -0.3)); for (const y of [-60, 10, 80]) { ell(c, 10, y, 7, 7); c.fillStyle = hex(col, -0.25); c.fill(); }
      c.beginPath(); c.roundRect(30, -60, 60, 50, 6); c.lineWidth = 5; c.strokeStyle = hex(col, -0.35); c.stroke();
    }
    if (o.apron) { const ac = o.apron; c.beginPath(); c.moveTo(-70, -60); c.lineTo(70, -60); c.lineTo(100, 200); c.lineTo(-100, 200); c.closePath(); formFill(c, ac, -100, -60, 100, 200, 0.2); c.lineWidth = 6; c.strokeStyle = INK; c.stroke();
      stitch(c, [[-62, -48], [62, -48]], hex(ac, -0.4)); c.beginPath(); c.roundRect(-46, 60, 92, 56, 6); c.lineWidth = 5; c.strokeStyle = hex(ac, -0.4); c.stroke(); line(c, [[0, 60], [0, 116]], 4, hex(ac, -0.4));
      line(c, [[-70, -60], [-40, -160]], 9, hex(ac, -0.15)); line(c, [[70, -60], [40, -160]], 9, hex(ac, -0.15)); }
    c.restore();
    ringStroke(c, 0, 20, 112, 170, LW * 1.15);
    if (o.kind === 'vest') { for (const x of [-52, 52]) buckle(c, x, 40); c.beginPath(); c.roundRect(-28, 118, 56, 46, 8); ink(c, '#d9dde3', 7); ell(c, 0, 141, 8, 8); c.fillStyle = '#7d8590'; c.fill(); }
    if (o.kind === 'shirt') { c.beginPath(); c.moveTo(-60, -140); c.lineTo(0, -95); c.lineTo(60, -140); c.lineTo(30, -158); c.lineTo(0, -125); c.lineTo(-30, -158); c.closePath(); ink(c, hex(col, 0.15), 7); }
    if (o.tag) { c.beginPath(); c.roundRect(14, -70, 78, 44, 6); ink(c, '#fff', 6); c.fillStyle = '#d63a3a'; c.fillRect(17, -67, 72, 10); c.fillStyle = INK; c.font = '800 22px Montserrat, Kanit, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(o.tag, 53, -42); }
  }
}

// pose = { eyes, wink (right eye closed), mouth, look:[x,y], brow, glasses, stache, blush, hair, hairCol, hat, hatCol, outfit:{kind:'vest'|'coat'|'shirt', col, strap, tag},
//          arms:{L:[x,y], R:[x,y]} hand positions, bend:{L,R}, legs:{L:[x,y], R:[x,y]} feet, tilt (head radians), sq:[sx,sy], sweat, hold(c, arms) }
export function drawStick(c, p) {
  // headroom: hats, buns and cap buttons reach y ≈ -540, past the canvas edge (-512). Shrink 6 % about the feet so
  // everything from the top of the tallest hat to the shoe soles fits inside the plane (feet stay at the ground line).
  c.translate(0, 448); c.scale(0.94, 0.94); c.translate(0, -448);
  const sq = p.sq || [1, 1]; c.translate(0, 440); c.scale(sq[0], sq[1]); c.translate(0, -440);
  const legs = p.legs || { L: [-46, 440], R: [46, 440] };
  for (const [s, x] of [['L', -42], ['R', 42]]) { const f = legs[s]; noodle(c, [x, 160], f, 0, 13); const fx = f[0] + (s === 'L' ? -12 : 12);
    ell(c, fx, f[1] - 6, 26, 14); c.fillStyle = INK; c.fill(); ell(c, fx, f[1] + 2, 26, 6); c.fillStyle = '#4a4050'; c.fill(); }
  const arms = p.arms || { L: [-150, 140], R: [150, 140] }; const bend = p.bend || { L: -40, R: 40 };
  const shoulders = { L: [-92, -70], R: [92, -70] };
  if (p.armsBehind) for (const s of ['L', 'R']) noodle(c, shoulders[s], arms[s], bend[s], 12);
  torso(c, p);
  c.save(); c.translate(0, -150); c.rotate(p.tilt || 0); c.translate(0, 150);
  ell(c, 0, -300, 172, 165); const hg = c.createRadialGradient(-50, -370, 20, 0, -300, 190); hg.addColorStop(0, '#fffaf4'); hg.addColorStop(0.65, p.skin || SKIN); hg.addColorStop(1, '#e8d2c4');
  c.fillStyle = hg; c.fill();
  c.save(); ell(c, 0, -300, 172, 165); c.clip(); ell(c, 135, -260, 110, 175); c.fillStyle = 'rgba(190,140,130,0.13)'; c.fill();
  for (const x of [-105, 105]) { ell(c, x, -232, 34, 18); c.fillStyle = 'rgba(240,150,150,0.10)'; c.fill(); } c.restore();
  ringStroke(c, 0, -300, 172, 165, LW * 1.25);
  hair(c, p); eyes(c, p); mouth(c, p); hat(c, p);
  if (p.sweat) { for (const [x, y, s] of [[-170, -380, 1], [178, -350, 0.8]]) { c.beginPath(); c.moveTo(x, y - 30 * s); c.quadraticCurveTo(x + 18 * s, y + 6, x, y + 12 * s); c.quadraticCurveTo(x - 18 * s, y + 6, x, y - 30 * s); ink(c, '#a9dcff', 6);
    ell(c, x - 4 * s, y - 2, 4 * s, 7 * s); c.fillStyle = '#fff'; c.fill(); } }
  c.restore();
  if (!p.armsBehind) for (const s of ['L', 'R']) noodle(c, shoulders[s], arms[s], bend[s], 12);
  for (const s of ['L', 'R']) { const h = arms[s]; ell(c, h[0], h[1], 21, 21); c.fillStyle = INK; c.fill(); ell(c, h[0] - 6, h[1] - 7, 6, 5); c.fillStyle = 'rgba(255,255,255,0.25)'; c.fill(); }
  if (p.hold) { c.save(); p.hold(c, arms); c.restore(); }
}

export function walkPose(phase, stride = 60) {
  const s = Math.sin(phase * Math.PI * 2), lift = (v) => Math.max(0, v) * 26;
  return { legs: { L: [-42 + s * stride, 440 - lift(s)], R: [42 - s * stride, 440 - lift(-s)] }, arms: { L: [-150 - s * 40, 130], R: [150 + s * 40, 130] } };
}
export const clampLook = (v) => [clamp(v[0], -1, 1), clamp(v[1], -1, 1)];
