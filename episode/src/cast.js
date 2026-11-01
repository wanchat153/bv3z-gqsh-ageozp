// Cast for the Jar film: robed stick-toon figures. Same canvas contract as drawStick (1024 units, origin centre, y down,
// feet at +440, head centre (0,-300) r 172). Costumes from the reference crops (FRAMEMAP S01/S03/S05):
//  inventor — blue tube robe, white crossed collar, gold sash, black striped top-bun with gold pin + jade bead
//  emperor  — navy robe, red λ collar with gold edge, red sash, black cap + flat board crown with bead strings, droop moustache
//  guard    — steel dome helmet with gold band, red jewel + red plume, scale armour with round mirror plate, brown belt, red skirt, halberd
//  minister — green/brown robe, black gauze hat with side wings
import { INK, ringStroke, taper, ell, ink, line, hex, formFill, drawEyes, drawMouth, noodle, LW, SKIN } from './stick.js';

const C = (c, f) => { c.save(); f(); c.restore(); };
function head(c, p) {
  ell(c, 0, -300, 172, 165); const hg = c.createRadialGradient(-50, -370, 20, 0, -300, 190);
  hg.addColorStop(0, '#fffaf4'); hg.addColorStop(0.65, p.skin || SKIN); hg.addColorStop(1, '#e8d2c4'); c.fillStyle = hg; c.fill();
  C(c, () => { ell(c, 0, -300, 172, 165); c.clip(); ell(c, 135, -260, 110, 175); c.fillStyle = 'rgba(190,140,130,0.13)'; c.fill();
    if (p.blush) for (const x of [-105, 105]) { ell(c, x, -232, 34, 18); c.fillStyle = 'rgba(240,120,120,0.28)'; c.fill(); }
    if (p.pale) { ell(c, 0, -360, 160, 90); c.fillStyle = 'rgba(140,170,255,0.18)'; c.fill(); } });
  ringStroke(c, 0, -300, 172, 165, LW * 1.25);
}
function tears(c, p) { if (!p.tears) return; for (const s of [-1, 1]) { const x = s * 70; c.beginPath(); c.moveTo(x - 6, -280); c.quadraticCurveTo(x - 30 * s * 0 - 4, -230, x + 2, -200); c.lineWidth = 10; c.strokeStyle = '#7cc8ff'; c.stroke(); } }

// ---- robe body: a tall rounded tube from the chin to the floor ----
function robe(c, p, col, w = 118) {
  const top = -150, bot = 440 - (p.hem || 0);
  const path = () => { c.beginPath(); c.moveTo(-w, bot); c.lineTo(-w, top + 70); c.quadraticCurveTo(-w, top, -w + 70, top); c.lineTo(w - 70, top); c.quadraticCurveTo(w, top, w, top + 70); c.lineTo(w, bot); c.closePath(); };
  path(); formFill(c, col, -w, top, w, bot, 0.3);
  C(c, () => { path(); c.clip(); c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(w * 0.45, top, w, bot - top);   // shadow side
    c.fillStyle = 'rgba(255,255,255,0.10)'; c.fillRect(-w + 18, top + 40, 26, bot - top - 60); });
  path(); c.lineWidth = LW * 1.1; c.strokeStyle = INK; c.stroke();
  for (const x of [-34, 34]) { ell(c, x, bot + 4, 30, 12); c.fillStyle = INK; c.fill(); }   // shoe tips under the hem
  return { top, bot, w };
}
function crossCollar(c, col = '#f6f2e6') {  // white crossed lapels (inventor)
  c.beginPath(); c.moveTo(-58, -150); c.lineTo(10, -40); c.lineTo(36, -40); c.lineTo(-30, -150); c.closePath(); ink(c, col, 7);
  c.beginPath(); c.moveTo(58, -150); c.lineTo(-10, -40); c.lineTo(-36, -40); c.lineTo(30, -150); c.closePath(); ink(c, col, 7);
}
function lambdaCollar(c, col = '#d23a2a', trim = '#f2b33a') {  // emperor: red λ chevron with gold trim
  c.beginPath(); c.moveTo(-46, -150); c.lineTo(8, -10); c.lineTo(52, -150); c.lineTo(28, -150); c.lineTo(6, -70); c.lineTo(-18, -150); c.closePath(); ink(c, col, 7);
  c.beginPath(); c.moveTo(-8, -82); c.lineTo(30, -12); c.lineWidth = 12; c.strokeStyle = trim; c.stroke();
}
function sash(c, y, col, w, h = 34) { c.beginPath(); c.rect(-w, y, 2 * w, h); formFill(c, col, 0, y, 0, y + h, 0.25); c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); }
function arms(c, p, front = true) {
  const a = p.arms || { L: [-150, 150], R: [150, 150] }, b = p.bend || { L: -40, R: 40 };
  const sh = { L: [-96, -90], R: [96, -90] };
  for (const s of ['L', 'R']) { noodle(c, sh[s], a[s], b[s], 12); ell(c, a[s][0], a[s][1], 20, 20); c.fillStyle = INK; c.fill(); }
  if (p.hold) C(c, () => p.hold(c, a));
}

// ---- hair / hats ----
function topBun(c, col = '#1d1a22', pin = true) {
  const path = () => { c.beginPath(); c.ellipse(0, -452, 104, 82, 0, Math.PI, 0); c.lineTo(104, -440); c.quadraticCurveTo(0, -418, -104, -440); c.closePath(); };
  path(); formFill(c, col, -100, -530, 100, -430, 0.6); c.lineWidth = LW; c.strokeStyle = INK; c.stroke();
  C(c, () => { path(); c.clip(); c.strokeStyle = 'rgba(255,255,255,0.28)'; c.lineWidth = 5; for (let x = -84; x <= 84; x += 21) { c.beginPath(); c.moveTo(x * 0.55, -530); c.quadraticCurveTo(x * 1.05, -480, x, -425); c.stroke(); } });
  if (pin) { line(c, [[-180, -480], [150, -480]], 14, INK); line(c, [[-176, -480], [146, -480]], 8, '#f2c040'); ell(c, -188, -480, 22, 22); ink(c, '#2fae7a', 8); ell(c, -194, -486, 7, 7); c.fillStyle = 'rgba(255,255,255,0.7)'; c.fill(); }
}
function mianHat(c) {  // emperor: black cap + flat board with dangling bead strings
  c.beginPath(); c.moveTo(-110, -420); c.lineTo(-96, -540); c.lineTo(96, -540); c.lineTo(110, -420); c.closePath(); formFill(c, '#20202c', -100, -540, 100, -420, 0.5); c.lineWidth = LW; c.strokeStyle = INK; c.stroke();
  line(c, [[-104, -470], [104, -470]], 10, '#f2c040');
  c.beginPath(); c.moveTo(-230, -560); c.lineTo(230, -560); c.lineTo(214, -536); c.lineTo(-214, -536); c.closePath(); ink(c, '#262632', 10); line(c, [[-226, -556], [226, -556]], 6, '#f2c040');
  const beads = ['#d23a2a', '#2fae7a', '#f6f2e6', '#3a6ad6', '#f2c040'];
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { const x = s * (150 + k * 22); line(c, [[x, -536], [x, -470 + k * 4]], 4, '#f2c040');
    for (let j = 0; j < 3; j++) { ell(c, x, -520 + j * 20, 9, 9); ink(c, beads[(k + j) % 5], 4); } }
}
function helmet(c) {  // guard: steel dome, gold band with red jewel, red plume, ear flaps
  c.beginPath(); c.ellipse(0, -400, 176, 150, 0, Math.PI, 0); c.lineTo(176, -372); c.lineTo(-176, -372); c.closePath(); formFill(c, '#9aa2b0', -160, -540, 160, -380, 0.35); c.lineWidth = LW; c.strokeStyle = INK; c.stroke();
  for (const x of [-110, -55, 0, 55, 110]) { c.beginPath(); c.moveTo(x * 0.3, -548); c.quadraticCurveTo(x * 0.95, -470, x, -380); c.lineWidth = 5; c.strokeStyle = '#6a7282'; c.stroke(); }
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 172, -390); c.lineTo(s * 186, -290); c.lineTo(s * 140, -290); c.lineTo(s * 140, -380); c.closePath(); ink(c, '#8a92a0', 8); }
  c.beginPath(); c.roundRect(-182, -392, 364, 34, 10); formFill(c, '#f2c040', 0, -392, 0, -358, 0.3); c.lineWidth = 7; c.strokeStyle = INK; c.stroke();
  ell(c, 0, -375, 20, 16); ink(c, '#d23a2a', 6);
  c.beginPath(); c.moveTo(-10, -548); c.quadraticCurveTo(40, -640, 120, -600); c.quadraticCurveTo(60, -590, 20, -548); c.closePath(); ink(c, '#e0452e', 7);
}
function gauzeHat(c, col = '#1f1d26') {   // minister: black hat with two side wings
  c.beginPath(); c.roundRect(-118, -540, 236, 120, [60, 60, 6, 6]); formFill(c, col, -110, -540, 110, -420, 0.5); c.lineWidth = LW; c.strokeStyle = INK; c.stroke();
  for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * 200, -470, 90, 16, s * -0.1, 0, Math.PI * 2); ink(c, col, 8); }
}

// ---- torso extras ----
function scaleArmour(c, top = -150, bot = 150, w = 118) {
  C(c, () => { c.beginPath(); c.roundRect(-w, top, 2 * w, bot - top, [70, 70, 8, 8]); c.clip();
    c.fillStyle = '#4a5468'; c.fillRect(-w, top, 2 * w, bot - top);
    for (let j = 0; j < 14; j++) for (let i = -6; i <= 6; i++) { const x = i * 36 + (j % 2) * 18, y = top + 10 + j * 22;
      c.beginPath(); c.roundRect(x - 16, y, 32, 30, [4, 4, 14, 14]); const g = c.createLinearGradient(0, y, 0, y + 30); g.addColorStop(0, '#c8d0de'); g.addColorStop(1, '#7c8698'); c.fillStyle = g; c.fill(); c.lineWidth = 3; c.strokeStyle = '#2e3444'; c.stroke(); } });
  c.beginPath(); c.roundRect(-w, top, 2 * w, bot - top, [70, 70, 8, 8]); c.lineWidth = LW; c.strokeStyle = INK; c.stroke();
  ell(c, 0, top + 80, 44, 44); const g = c.createRadialGradient(-12, top + 66, 4, 0, top + 80, 46); g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#c8d0de'); g.addColorStop(1, '#8a94a6'); c.fillStyle = g; c.fill(); c.lineWidth = 8; c.strokeStyle = '#3a4050'; c.stroke();
  ell(c, 0, top + 80, 52, 52); c.lineWidth = 6; c.strokeStyle = '#f2c040'; c.stroke();
}
function guardBelt(c, y) { c.beginPath(); c.rect(-122, y, 244, 30); ink(c, '#6a3a1e', 6); c.beginPath(); c.roundRect(-22, y - 6, 44, 42, 6); ink(c, '#f2c040', 6); ell(c, 0, y + 15, 7, 7); c.fillStyle = '#d23a2a'; c.fill();
  c.beginPath(); c.moveTo(-10, y + 36); c.lineTo(10, y + 36); c.lineTo(16, y + 96); c.lineTo(-16, y + 96); c.closePath(); ink(c, '#d23a2a', 5); }
export function halberd(c, x, yTop, yBot) {
  line(c, [[x, yTop], [x, yBot]], 14, INK); line(c, [[x, yTop], [x, yBot]], 7, '#7a4a2a');
  c.beginPath(); c.moveTo(x, yTop - 60); c.lineTo(x + 9, yTop - 10); c.lineTo(x - 9, yTop - 10); c.closePath(); ink(c, '#d8dde6', 5);
  c.beginPath(); c.moveTo(x - 6, yTop); c.quadraticCurveTo(x - 120, yTop - 30, x - 150, yTop + 40); c.quadraticCurveTo(x - 90, yTop + 10, x - 6, yTop + 40); c.closePath(); ink(c, '#d8dde6', 6);
  c.beginPath(); c.moveTo(x + 6, yTop + 10); c.lineTo(x + 50, yTop + 22); c.lineTo(x + 6, yTop + 34); c.closePath(); ink(c, '#d8dde6', 5);
}

// ---- public drawers: pose = { eyes, mouth, brow, look, stache, blush, tears, sweat, tilt, arms, bend, hold, sq, hairUp, dy } ----
function face(c, p) { drawEyes(c, p); drawMouth(c, p); tears(c, p);
  if (p.sweat) for (const [x, y, s] of [[-170, -380, 1], [178, -350, 0.8]]) { c.beginPath(); c.moveTo(x, y - 30 * s); c.quadraticCurveTo(x + 18 * s, y + 6, x, y + 12 * s); c.quadraticCurveTo(x - 18 * s, y + 6, x, y - 30 * s); ink(c, '#a9dcff', 6); } }
function frame(c, p, body) {
  const sq = p.sq || [1, 1]; c.translate(0, 448); c.scale(0.94 * sq[0], 0.94 * sq[1]); c.translate(0, -448 + (p.dy || 0));
  if (p.armsBehind) arms(c, p); body();
  C(c, () => { c.translate(0, -150); c.rotate(p.tilt || 0); c.translate(0, 150); p.headFn(); });
  if (!p.armsBehind) arms(c, p);
}
// (frame() needs the head drawer in the pose; wrap each role)
const role = (bodyFn, headExtras, defaults) => (c, p0) => { const p = { ...defaults, ...p0 };
  p.headFn = () => { if (p.hairUp) { for (let k = -5; k <= 5; k++) { line(c, [[k * 30, -440], [k * 44, -560 - Math.abs(k) * -6]], 10); } } head(c, p); face(c, p); headExtras(c, p); };
  frame(c, p, () => bodyFn(c, p)); };
export const INVENTOR = role((c, p) => { robe(c, p, '#2f5fc0'); crossCollar(c); sash(c, 130, '#f0b030', 120); },
  (c, p) => { if (!p.hairUp) topBun(c); else topBun(c, '#1d1a22', false); }, { eyes: 'dash', mouth: 'dot' });
export const EMPEROR = role((c, p) => { robe(c, p, '#26285a', 112); lambdaCollar(c); sash(c, 150, '#c8301e', 114, 30); },
  (c, p) => mianHat(c), { eyes: 'dash', mouth: 'frown', brow: 0.18, stache: 'droop' });
export const GUARD = role((c, p) => { robe(c, { ...p, hem: 0 }, '#a8262a', 122); scaleArmour(c, -150, 160, 122); guardBelt(c, 150);
    if (p.halberd !== false) halberd(c, p.halberdX ?? 170, -420, 440); },
  (c, p) => helmet(c), { eyes: 'dash', mouth: 'line', brow: 0.1 });
export const MINISTER = role((c, p) => { robe(c, p, p.col || '#2e6a4a'); crossCollar(c, '#f6f2e6'); sash(c, 130, '#8a5130', 120); },
  (c, p) => gauzeHat(c), { eyes: 'dash', mouth: 'smile' });
export const TOWNSFOLK = role((c, p) => { robe(c, p, p.col || '#8a6a4a'); crossCollar(c, '#e8dcc0'); sash(c, 130, p.sash || '#5a3a22', 120); },
  (c, p) => { if (p.hat === 'straw') { c.beginPath(); c.moveTo(-230, -400); c.lineTo(0, -560); c.lineTo(230, -400); c.closePath(); ink(c, '#e0b860', 10); } else topBun(c, '#2a1e1a', false); },
  { eyes: 'dot', mouth: 'smile' });
