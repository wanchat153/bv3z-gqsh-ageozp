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

// ---- the body rig: every robed character bends. The robe is drawn in two passes — the LOWER pass (skirt / lap, below the
// sash) stays planted with the legs, the UPPER pass (torso, collar, sash, armour, arms, head) turns about the waist by p.lean.
// The sash sits on the waist line and hides the joint, so the robe reads as one piece. p.legs: 'stand' (default) | 'walk' |
// 'run' | 'sit' | 'fly'; p.walk = gait phase (radians). In 'sit' the upper body drops by the thigh length onto a lap.
let PART = 'all', RIG = { W: 145, drop: 0, legs: 'stand' };
const lower = () => PART === 'lower', upper = () => PART !== 'lower';
function robeShade(c, path, col, w, top, bot) { path(); formFill(c, col, -w, top, w, bot, 0.3);
  C(c, () => { path(); c.clip(); c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(w * 0.45, top - 400, w + 60, bot - top + 800);
    c.fillStyle = 'rgba(255,255,255,0.10)'; c.fillRect(-w + 18, top + 40, 26, bot - top - 60); });
  path(); c.lineWidth = LW * 1.1; c.strokeStyle = INK; c.stroke(); }
function robe(c, p, col, w = 118) {
  const top = -150, W = RIG.W, legs = RIG.legs;
  if (PART === 'upper') {   // torso: chin to just past the waist (the sash covers the joint)
    const b = W + 26; const path = () => { c.beginPath(); c.moveTo(-w, b); c.lineTo(-w, top + 70); c.quadraticCurveTo(-w, top, -w + 70, top); c.lineTo(w - 70, top); c.quadraticCurveTo(w, top, w, top + 70); c.lineTo(w, b); c.quadraticCurveTo(0, b + 14, -w, b); c.closePath(); };
    robeShade(c, path, col, w, top, b); return { top, bot: b, w }; }
  if (PART === 'lower') {
    if (legs === 'sitside') {   // seated, legs to the side (profile chair): hips, then the robe over the thighs out to the knee
      const h = W + RIG.drop - 12, kx = w + 170, ky = h + 40;
      const path = () => { c.beginPath(); c.moveTo(-w, h); c.lineTo(-w, h + 70); c.quadraticCurveTo(-w + 10, h + 95, 0, h + 95); c.lineTo(kx - 10, h + 92); c.quadraticCurveTo(kx + 34, h + 88, kx + 30, ky); c.quadraticCurveTo(kx + 26, h - 6, kx - 30, h - 8); c.lineTo(w, h - 6); c.quadraticCurveTo(0, h - 18, -w, h); c.closePath(); };
      robeShade(c, path, col, kx, h - 10, h + 95); return { top, bot: h + 95, w }; }
    if (legs === 'sit') {   // the lap: hips (dropped) → knees spread → hem at the ankles
      const h = W + RIG.drop - 12, k = h + 64, bot = 424 - (p.hem || 0);
      const path = () => { c.beginPath(); c.moveTo(-w, h); c.quadraticCurveTo(-w - 30, k - 20, -w - 26, k); c.lineTo(-w - 12, bot); c.lineTo(w + 12, bot); c.lineTo(w + 26, k); c.quadraticCurveTo(w + 30, k - 20, w, h); c.closePath(); };
      robeShade(c, path, col, w + 26, h, bot);
      c.beginPath(); c.moveTo(-w - 22, k + 2); c.quadraticCurveTo(0, k + 22, w + 22, k + 2); c.lineWidth = 6; c.strokeStyle = 'rgba(26,18,40,0.55)'; c.stroke();   // knee fold
      line(c, [[0, k + 12], [0, bot - 6]], 6, 'rgba(26,18,40,0.45)');
      for (const x of [-52, 52]) { ell(c, x, bot + 6, 34, 13); c.fillStyle = INK; c.fill(); }
      return { top, bot, w }; }
    const bot = (legs === 'walk' || legs === 'run' || legs === 'fly' ? 398 : 440) - (p.hem || 0), h = W - 12;
    const flare = legs === 'fly' ? 40 : legs === 'run' ? 18 : 0;
    const path = () => { c.beginPath(); c.moveTo(-w, h); c.lineTo(-w - flare, bot); c.quadraticCurveTo(0, bot + 10, w + flare, bot); c.lineTo(w, h); c.closePath(); };
    robeShade(c, path, col, w + flare, h, bot);
    if (legs === 'stand') for (const x of [-34, 34]) { ell(c, x, bot + 4, 30, 12); c.fillStyle = INK; c.fill(); }   // shoe tips under the hem
    return { top, bot, w }; }
  // PART 'all' (legacy single tube)
  const bot = 440 - (p.hem || 0);
  const path = () => { c.beginPath(); c.moveTo(-w, bot); c.lineTo(-w, top + 70); c.quadraticCurveTo(-w, top, -w + 70, top); c.lineTo(w - 70, top); c.quadraticCurveTo(w, top, w, top + 70); c.lineTo(w, bot); c.closePath(); };
  robeShade(c, path, col, w, top, bot);
  for (const x of [-34, 34]) { ell(c, x, bot + 4, 30, 12); c.fillStyle = INK; c.fill(); }
  return { top, bot, w };
}
// legs under the hem: dark trousers + shoes. walk/run: alternate steps (lifted foot), fly: kicked out and bent
function legsUnder(c, p) { const m = RIG.legs; if (m === 'stand' || m === 'sit') return;
  if (m === 'sitside') { const h = RIG.W + RIG.drop - 12, kx = 118 + 170, sw = p.swing || 0;
    for (const [dx, col] of [[-34, '#1e1e2c'], [0, '#2a2a3a']]) { const fx = kx + dx + 18 + sw * 40, fy = 432; line(c, [[kx + dx, h + 60], [fx, fy - 14]], 40, INK); line(c, [[kx + dx, h + 60], [fx, fy - 14]], 26, col);
      ell(c, fx + 26, fy - 4, 44, 16); c.fillStyle = INK; c.fill(); }
    return; }
  const ph = p.walk || 0, st = Math.sin(ph); const run = m === 'run' ? 1.6 : 1;
  const feet = m === 'fly' ? [[-120, 400, -0.6], [130, 380, 0.7]] : [[-40 - 14 * st * run, 446 - 22 * run * Math.max(0, st), 0], [40 - 14 * st * run, 446 - 22 * run * Math.max(0, -st), 0]];
  for (const [fx, fy, a] of feet) { const hx = Math.sign(fx) * 34, hy = 360; const kx = (hx + fx) / 2 + (m === 'fly' ? Math.sign(fx) * 40 : 0), ky = (hy + fy) / 2 + (m === 'fly' ? -30 : 0);
    line(c, [[hx, hy], [kx, ky], [fx, fy - 14]], 34, INK); line(c, [[hx, hy], [kx, ky], [fx, fy - 14]], 22, '#2a2a3a');
    C(c, () => { c.translate(fx, fy - 4); c.rotate(a); ell(c, Math.sign(fx) * 10, 0, 36, 14); c.fillStyle = INK; c.fill(); }); } }
function crossCollar(c, col = '#f6f2e6') { if (lower()) return;  // white crossed lapels (inventor)
  c.beginPath(); c.moveTo(-58, -150); c.lineTo(10, -40); c.lineTo(36, -40); c.lineTo(-30, -150); c.closePath(); ink(c, col, 7);
  c.beginPath(); c.moveTo(58, -150); c.lineTo(-10, -40); c.lineTo(-36, -40); c.lineTo(30, -150); c.closePath(); ink(c, col, 7);
}
function lambdaCollar(c, col = '#d23a2a', trim = '#f2b33a') { if (lower()) return;  // emperor: red λ chevron with gold trim
  c.beginPath(); c.moveTo(-46, -150); c.lineTo(8, -10); c.lineTo(52, -150); c.lineTo(28, -150); c.lineTo(6, -70); c.lineTo(-18, -150); c.closePath(); ink(c, col, 7);
  c.beginPath(); c.moveTo(-8, -82); c.lineTo(30, -12); c.lineWidth = 12; c.strokeStyle = trim; c.stroke();
}
function sash(c, y, col, w, h = 34) { if (lower()) return; c.beginPath(); c.rect(-w, y, 2 * w, h); formFill(c, col, 0, y, 0, y + h, 0.25); c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); }
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
function scaleArmour(c, top = -150, bot = 150, w = 118) { if (lower()) return;
  C(c, () => { c.beginPath(); c.roundRect(-w, top, 2 * w, bot - top, [70, 70, 8, 8]); c.clip();
    c.fillStyle = '#4a5468'; c.fillRect(-w, top, 2 * w, bot - top);
    for (let j = 0; j < 14; j++) for (let i = -6; i <= 6; i++) { const x = i * 36 + (j % 2) * 18, y = top + 10 + j * 22;
      c.beginPath(); c.roundRect(x - 16, y, 32, 30, [4, 4, 14, 14]); const g = c.createLinearGradient(0, y, 0, y + 30); g.addColorStop(0, '#c8d0de'); g.addColorStop(1, '#7c8698'); c.fillStyle = g; c.fill(); c.lineWidth = 3; c.strokeStyle = '#2e3444'; c.stroke(); } });
  c.beginPath(); c.roundRect(-w, top, 2 * w, bot - top, [70, 70, 8, 8]); c.lineWidth = LW; c.strokeStyle = INK; c.stroke();
  ell(c, 0, top + 80, 44, 44); const g = c.createRadialGradient(-12, top + 66, 4, 0, top + 80, 46); g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#c8d0de'); g.addColorStop(1, '#8a94a6'); c.fillStyle = g; c.fill(); c.lineWidth = 8; c.strokeStyle = '#3a4050'; c.stroke();
  ell(c, 0, top + 80, 52, 52); c.lineWidth = 6; c.strokeStyle = '#f2c040'; c.stroke();
}
function guardBelt(c, y) { if (lower()) return; c.beginPath(); c.rect(-122, y, 244, 30); ink(c, '#6a3a1e', 6); c.beginPath(); c.roundRect(-22, y - 6, 44, 42, 6); ink(c, '#f2c040', 6); ell(c, 0, y + 15, 7, 7); c.fillStyle = '#d23a2a'; c.fill();
  c.beginPath(); c.moveTo(-10, y + 36); c.lineTo(10, y + 36); c.lineTo(16, y + 96); c.lineTo(-16, y + 96); c.closePath(); ink(c, '#d23a2a', 5); }
export function halberd(c, x, yTop, yBot) { if (lower()) return;
  line(c, [[x, yTop], [x, yBot]], 14, INK); line(c, [[x, yTop], [x, yBot]], 7, '#7a4a2a');
  c.beginPath(); c.moveTo(x, yTop - 60); c.lineTo(x + 9, yTop - 10); c.lineTo(x - 9, yTop - 10); c.closePath(); ink(c, '#d8dde6', 5);
  c.beginPath(); c.moveTo(x - 6, yTop); c.quadraticCurveTo(x - 120, yTop - 30, x - 150, yTop + 40); c.quadraticCurveTo(x - 90, yTop + 10, x - 6, yTop + 40); c.closePath(); ink(c, '#d8dde6', 6);
  c.beginPath(); c.moveTo(x + 6, yTop + 10); c.lineTo(x + 50, yTop + 22); c.lineTo(x + 6, yTop + 34); c.closePath(); ink(c, '#d8dde6', 5);
}

// ---- public drawers: pose = { eyes, mouth, brow, look, stache, blush, tears, sweat, tilt, arms, bend, hold, sq, hairUp, dy } ----
function face(c, p) { drawEyes(c, p); drawMouth(c, p); tears(c, p);
  if (p.sweat) for (const [x, y, s] of [[-170, -380, 1], [178, -350, 0.8]]) { c.beginPath(); c.moveTo(x, y - 30 * s); c.quadraticCurveTo(x + 18 * s, y + 6, x, y + 12 * s); c.quadraticCurveTo(x - 18 * s, y + 6, x, y - 30 * s); ink(c, '#a9dcff', 6); } }
// a plain wooden chair in the same ink style, front view, sized to the 'sit' rig (seat under the lap at y≈265, feet at 440)
export function drawChair(c) { const wood = '#b07a46', dark = '#7a4e2a';
  for (const x of [-138, 138]) { c.beginPath(); c.roundRect(x - 13, -70, 26, 350, 8); ink(c, dark, 7); }   // back posts
  for (const y of [-40, 40, 120]) { c.beginPath(); c.roundRect(-138, y, 276, 34, 8); ink(c, wood, 7); }   // back slats
  for (const x of [-120, 120]) { c.beginPath(); c.moveTo(x - 10, 290); c.lineTo(x + 10, 290); c.lineTo(x + 8, 418); c.lineTo(x - 8, 418); c.closePath(); ink(c, dark, 6); }   // back legs
  c.beginPath(); c.moveTo(-150, 252); c.lineTo(150, 252); c.lineTo(185, 300); c.lineTo(-185, 300); c.closePath(); ink(c, wood, 8);   // seat (seen slightly from above)
  c.beginPath(); c.rect(-185, 300, 370, 22); ink(c, dark, 7);
  for (const x of [-170, 170]) { c.beginPath(); c.moveTo(x - 13, 320); c.lineTo(x + 13, 320); c.lineTo(x + 11, 446); c.lineTo(x - 11, 446); c.closePath(); ink(c, wood, 7); }   // front legs
  line(c, [[-165, 392], [165, 392]], 10, dark); }
export function drawChairSide(c) { const wood = '#b07a46', dark = '#7a4e2a';
  c.beginPath(); c.moveTo(-150, -60); c.lineTo(-118, -60); c.lineTo(-112, 446); c.lineTo(-140, 446); c.closePath(); ink(c, dark, 7);   // back post + back leg
  for (const y of [-40, 50, 140]) { c.beginPath(); c.roundRect(-160, y, 52, 30, 8); ink(c, wood, 6); }   // slat ends
  c.beginPath(); c.roundRect(-150, 300, 400, 34, 10); ink(c, wood, 8);   // seat
  c.beginPath(); c.moveTo(196, 334); c.lineTo(222, 334); c.lineTo(218, 446); c.lineTo(194, 446); c.closePath(); ink(c, wood, 7);   // front leg
  line(c, [[-120, 396], [204, 396]], 10, dark); }
export const CHAIR2D = (c, p = {}) => { c.translate(0, -190); if (p.side) drawChairSide(c); else drawChair(c); };
function frame(c, p, body) {
  const sq = p.sq || [1, 1]; c.translate(0, 448); c.scale(0.94 * sq[0], 0.94 * sq[1]); c.translate(0, -448 + (p.dy || 0));
  if (p.chair === 'side') drawChairSide(c); else if (p.chair) drawChair(c);
  const legs = p.legs || 'stand'; RIG = { W: p.waistY ?? 145, drop: (legs === 'sit' || legs === 'sitside') ? 118 : 0, legs };
  if (legs === 'stand' && !p.lean) {   // the classic single tube (identical to before for standing, upright characters)
    PART = 'all'; if (p.armsBehind) arms(c, p); body();
    C(c, () => { c.translate(0, -150); c.rotate(p.tilt || 0); c.translate(0, 150); p.headFn(); });
    if (!p.armsBehind) arms(c, p); return; }
  legsUnder(c, p);
  PART = 'lower'; body();
  C(c, () => { c.translate(0, RIG.drop); c.translate(0, RIG.W); c.rotate(p.lean || 0); c.translate(0, -RIG.W);
    PART = 'upper'; if (p.armsBehind) arms(c, p); body();
    C(c, () => { c.translate(0, -150); c.rotate(p.tilt || 0); c.translate(0, 150); p.headFn(); });
    if (!p.armsBehind) arms(c, p); });
  PART = 'all';
}
// (frame() needs the head drawer in the pose; wrap each role)
const role = (bodyFn, headExtras, defaults) => (c, p0) => { const p = { ...defaults, ...p0 };
  // p.turn (−1..1): the face slides toward that side and narrows (three-quarter view, as in INVENTOR_HAUL); an ear shows on the far side
  p.faceTx = (fn) => { const t = p.turn || 0; if (!t) return fn(); C(c, () => { c.translate(64 * t, 0); c.scale(1 - 0.2 * Math.abs(t), 1); fn(); }); };
  p.headFn = () => { if (p.hairUp) { for (let k = -5; k <= 5; k++) { line(c, [[k * 30, -440], [k * 44, -560 - Math.abs(k) * -6]], 10); } } head(c, p);
    const t = p.turn || 0;
    if (t) { const sx = -Math.sign(t); ell(c, sx * 150, -290, 30, 44); c.fillStyle = SKIN; c.fill(); c.lineWidth = 9; c.strokeStyle = INK; c.stroke(); ell(c, sx * 150, -290, 12, 20); c.fillStyle = 'rgba(190,120,110,0.5)'; c.fill();
      C(c, () => { ell(c, 0, -300, 172, 165); c.clip(); p.faceTx(() => face(c, p)); }); }
    else face(c, p);
    headExtras(c, p); };
  frame(c, p, () => bodyFn(c, p)); };
export const INVENTOR = role((c, p) => { robe(c, p, '#2f5fc0'); crossCollar(c); sash(c, 130, '#f0b030', 120); },
  (c, p) => { if (!p.hairUp) topBun(c); else topBun(c, '#1d1a22', false); }, { eyes: 'dash', mouth: 'dot', waistY: 147 });
export const EMPEROR = role((c, p) => { robe(c, p, '#26285a', 112); lambdaCollar(c); sash(c, 150, '#c8301e', 114, 30); },
  (c, p) => mianHat(c), { eyes: 'dash', mouth: 'frown', brow: 0.18, stache: 'droop', waistY: 165 });
export const GUARD = role((c, p) => { robe(c, { ...p, hem: 0 }, '#a8262a', 122); scaleArmour(c, -150, 160, 122); guardBelt(c, 150);
    if (p.halberd !== false) halberd(c, p.halberdX ?? 170, -420, 440); },
  (c, p) => helmet(c), { eyes: 'dash', mouth: 'line', brow: 0.1, waistY: 165 });
export const MINISTER = role((c, p) => { robe(c, p, p.col || '#2e6a4a'); crossCollar(c, '#f6f2e6'); sash(c, 130, '#8a5130', 120); },
  (c, p) => gauzeHat(c), { eyes: 'dash', mouth: 'smile', waistY: 147 });
export const TOWNSFOLK = role((c, p) => { robe(c, p, p.col || '#8a6a4a'); crossCollar(c, '#e8dcc0'); sash(c, 130, p.sash || '#5a3a22', 120); },
  (c, p) => { if (p.hat === 'straw') { c.beginPath(); c.moveTo(-230, -400); c.lineTo(0, -560); c.lineTo(230, -400); c.closePath(); ink(c, '#e0b860', 10); } else topBun(c, '#2a1e1a', false); },
  { eyes: 'dot', mouth: 'smile', waistY: 147 });

// ---- inventor hauling, three-quarter side view (S14), drawn like the reference: the robe is split at the sash into a
// short upright skirt (hips + legs: the hem steps with the stride, two shoes) and the upper body bent forward at the waist
// by p.lean (radians), head pushed forward, face three-quarters to the camera, the tow rope over the near shoulder and
// across the chest into both fists. p.stride (−1..1) swings the legs. INVENTOR_HAUL_ROPE(p) = canvas point where the
// rope leaves his back (for the 3D rope to the cart).
const WAIST = [6, 140], HAUL_BACK = [-78, -120];
const haulRot = (x, y, a) => [WAIST[0] + (x - WAIST[0]) * Math.cos(a) - (y - WAIST[1]) * Math.sin(a), WAIST[1] + (x - WAIST[0]) * Math.sin(a) + (y - WAIST[1]) * Math.cos(a)];
export const INVENTOR_HAUL_ROPE = (p) => { const [x, y] = haulRot(HAUL_BACK[0], HAUL_BACK[1], p.lean ?? 0.6); return [x, y + (p.dy || 0)]; };
export const INVENTOR_HAUL = (c, p0) => {
  const p = { eyes: 'dash', mouth: 'grit', brow: 0.3, ...p0 }; const lean = p.lean ?? 0.6, st = p.stride || 0;
  c.translate(0, 448); c.scale(0.94, 0.94); c.translate(0, -448 + (p.dy || 0));
  const BLUE = '#2f5fc0'; const R = (x, y) => haulRot(x, y, lean);
  // legs: two dark trouser legs + shoes under the hem; the back leg pushes off behind, the front one plants ahead
  const legs = [[-46 - 95 * st, 446 - 16 * Math.max(0, st)], [46 + 75 * st, 446 - 16 * Math.max(0, -st)]];
  for (const [fx, fy] of legs) { line(c, [[fx * 0.3, 320], [fx, fy - 16]], 36, INK); line(c, [[fx * 0.3, 320], [fx, fy - 16]], 24, '#23305a');
    ell(c, fx + 16, fy - 6, 40, 16); c.fillStyle = INK; c.fill(); }
  // rope + far arm sit behind the body
  C(c, () => { c.translate(WAIST[0], WAIST[1]); c.rotate(lean); c.translate(-WAIST[0], -WAIST[1]);
    const rope = [[124, -30], [78, -112], [14, -152], HAUL_BACK]; line(c, rope, 16, INK); line(c, rope, 9, '#c8a070');
    noodle(c, [-4, -96], [110, -6], -40, 12); ell(c, 110, -6, 21, 21); c.fillStyle = INK; c.fill(); });
  // ONE robe: a single continuous outline bending at the waist — the back curves round smoothly (convex), the belly folds in
  const back = -86 - 30 * Math.max(0, st), front = 90 + 18 * Math.max(0, -st);
  const robeP = () => { c.beginPath(); c.moveTo(back, 362);
    c.quadraticCurveTo(-98, 270, -92, 200);
    const b1 = R(-92, 70), b0 = R(-92, 150); c.quadraticCurveTo(b0[0] - 6, b0[1] + 4, b1[0], b1[1]);
    const q = (a, b) => { const A = R(...a), B = R(...b); c.quadraticCurveTo(A[0], A[1], B[0], B[1]); };
    const l = (a) => { const A = R(...a); c.lineTo(A[0], A[1]); };
    l([-92, -86]); q([-92, -156], [-20, -156]); l([24, -156]); q([92, -156], [92, -86]); l([92, 60]);
    const f0 = R(92, 120); c.quadraticCurveTo(f0[0] - 10, f0[1] + 20, 84, 190);
    c.quadraticCurveTo(96, 260, front, 362); c.lineTo(10 + 30 * st, 374); c.lineTo(back, 362); c.closePath(); };
  robeP(); formFill(c, BLUE, -100, -160, 110, 380, 0.3);
  C(c, () => { robeP(); c.clip();
    c.fillStyle = 'rgba(0,0,0,0.13)'; c.save(); c.translate(WAIST[0], WAIST[1]); c.rotate(lean * 0.5); c.fillRect(30, -330, 140, 560); c.restore();   // shadow side
    // the sash wraps the bend (rotated halfway), clipped to the body so it never sticks out
    c.save(); c.translate(WAIST[0], WAIST[1]); c.rotate(lean * 0.55); c.translate(-WAIST[0], -WAIST[1]);
    c.beginPath(); c.rect(-140, WAIST[1] - 52, 280, 34); formFill(c, '#f0b030', 0, WAIST[1] - 52, 0, WAIST[1] - 18, 0.25); c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); c.restore();
    line(c, [[0 + 10 * st, 230], [10 + 30 * st, 370]], 6, 'rgba(26,18,40,0.5)'); });   // fold between the legs
  robeP(); c.lineWidth = LW * 1.1; c.strokeStyle = INK; c.stroke();
  // upper body details in the bent frame: collar, head (neck bends back, head nearly upright), near arm on the rope
  C(c, () => { c.translate(WAIST[0], WAIST[1]); c.rotate(lean); c.translate(-WAIST[0], -WAIST[1]);
    c.beginPath(); c.moveTo(70, -154); c.lineTo(10, -40); c.lineTo(38, -40); c.lineTo(92, -140); c.closePath(); ink(c, '#f6f2e6', 7);
    C(c, () => { c.translate(44, 14); c.translate(0, -160); c.rotate(-lean * 0.55); c.translate(0, 160); C(c, () => { c.translate(-26, 0); topBun(c); });
      head(c, p); C(c, () => { ell(c, 0, -300, 172, 165); c.clip(); c.translate(52, 0); c.scale(0.82, 1); face(c, p); }); });
    noodle(c, [44, -96], [126, -34], 34, 12); ell(c, 126, -34, 22, 22); c.fillStyle = INK; c.fill();
    line(c, [[126, -34], [116, 0], [106, 40]], 12, INK); line(c, [[126, -34], [116, 0], [106, 40]], 6, '#c8a070'); });
};

// ---- Kola film: Soviet field scientist — padded coat (two rows of buttons, belt), fur ushanka with ear flaps, optional clipboard
function ushanka(c, col = '#6a4a32', fur = '#c8b49a') {
  c.beginPath(); c.ellipse(0, -430, 186, 120, 0, Math.PI, 0); c.lineTo(186, -400); c.lineTo(-186, -400); c.closePath(); formFill(c, col, -170, -550, 170, -400, 0.35); c.lineWidth = LW; c.strokeStyle = INK; c.stroke();
  c.beginPath(); c.roundRect(-196, -440, 392, 70, 30); formFill(c, fur, -190, -440, 190, -370, 0.3); c.lineWidth = LW; c.strokeStyle = INK; c.stroke();
  for (let k = -8; k <= 8; k++) { c.beginPath(); c.moveTo(k * 22, -436); c.lineTo(k * 22 + 6, -378); c.lineWidth = 3; c.strokeStyle = 'rgba(90,60,40,0.35)'; c.stroke(); }
  for (const s of [-1, 1]) { c.beginPath(); c.roundRect(s * 160 - 34, -390, 68, 150, 30); formFill(c, fur, s * 160 - 30, -390, s * 160 + 30, -240, 0.3); c.lineWidth = LW * 0.9; c.strokeStyle = INK; c.stroke();
    line(c, [[s * 160, -250], [s * 150, -200]], 5, '#5a4030'); }
  ell(c, 0, -470, 22, 22); ink(c, '#d8302a', 6);
}
function coatFront(c, col) { if (lower()) return;
  line(c, [[0, -140], [0, 420]], 6, 'rgba(40,30,30,0.5)');
  for (let k = 0; k < 5; k++) for (const x of [-40, 40]) { ell(c, x, -90 + k * 70, 11, 11); ink(c, '#e8d8a0', 4); }
  c.beginPath(); c.moveTo(-120, -150); c.lineTo(0, -60); c.lineTo(120, -150); c.lineWidth = LW; c.strokeStyle = INK; c.stroke();
  c.beginPath(); c.rect(-122, 132, 244, 34); ink(c, '#3a2a20', 6); c.beginPath(); c.roundRect(-20, 126, 40, 46, 6); ink(c, '#c8a040', 5); }
export const clipboard = (c, a) => { const [x, y] = a.R; c.save(); c.translate(x + 40, y - 70); c.rotate(-0.15); c.beginPath(); c.roundRect(-70, -95, 140, 190, 10); ink(c, '#b07a40', 7);
  c.beginPath(); c.rect(-55, -75, 110, 155); ink(c, '#f6f2e6', 5); for (let k = 0; k < 6; k++) line(c, [[-42, -50 + k * 22], [40 - (k % 3) * 18, -50 + k * 22]], 4, '#6a6a8a');
  c.beginPath(); c.roundRect(-25, -105, 50, 22, 5); ink(c, '#9aa2b0', 5); c.restore(); };
function peakCap(c, col = '#4a4a3a') { c.beginPath(); c.ellipse(0, -440, 170, 90, 0, Math.PI, 0); c.closePath(); formFill(c, col, -160, -530, 160, -440, 0.35); c.lineWidth = LW; c.strokeStyle = INK; c.stroke();
  c.beginPath(); c.moveTo(-60, -440); c.quadraticCurveTo(120, -470, 250, -420); c.quadraticCurveTo(140, -400, -60, -415); c.closePath(); ink(c, '#2a2a22', 7); ell(c, 0, -512, 14, 10); ink(c, col, 5); }
function beard(c, col = '#6a4a32') { c.beginPath(); c.moveTo(-120, -250); c.quadraticCurveTo(-110, -120, 0, -100); c.quadraticCurveTo(110, -120, 120, -250); c.quadraticCurveTo(60, -190, 0, -195); c.quadraticCurveTo(-60, -190, -120, -250); c.closePath(); ink(c, col, 7); }
function glasses(c) { for (const x of [-60, 60]) { ell(c, x, -300, 44, 38); c.lineWidth = 9; c.strokeStyle = INK; c.stroke(); } line(c, [[-16, -302], [16, -302]], 8, INK); }
function tunic(c, col) { if (lower()) return; c.beginPath(); c.moveTo(-40, -140); c.lineTo(0, -40); c.lineTo(40, -140); c.lineWidth = LW * 0.8; c.strokeStyle = INK; c.stroke();
  c.beginPath(); c.rect(-122, 132, 244, 30); ink(c, '#5a3a22', 6); for (let k = 0; k < 3; k++) { ell(c, 0, -110 + k * 40, 8, 8); ink(c, '#f2ead8', 3); } }
export const newspaper = (c, a) => { const [x, y] = a.R; c.save(); c.translate(x - 60, y - 40); c.rotate(-0.08); c.beginPath(); c.rect(-150, -110, 300, 220); ink(c, '#f2ecd8', 7);
  c.font = '800 34px Montserrat'; c.fillStyle = '#2a1a16'; c.fillText('THE TIMES', -110, -70); for (let k = 0; k < 6; k++) line(c, [[-130, -40 + k * 24], [130 - (k % 2) * 60, -40 + k * 24]], 5, '#7a7a8a'); c.restore(); };
export const SCIENTIST = role((c, p) => { robe(c, p, p.col || '#4a5a4a'); if (p.hat === 'cap') tunic(c); else coatFront(c); },
  (c, p) => { if (p.glasses) glasses(c); if (p.hat === 'cap') peakCap(c, p.hatCol); else ushanka(c, p.hatCol, p.fur); }, { eyes: 'dot', mouth: 'smile', waistY: 147 });
export const FARMER = role((c, p) => { robe(c, p, p.col || '#d8c8a0'); C(c, () => { c.translate(30 * (p.turn || 0), 0); tunic(c); }); },
  (c, p) => { if (p.beard !== false) p.faceTx(() => beard(c, p.beardCol)); C(c, () => { c.translate(22 * (p.turn || 0), 0); peakCap(c, p.hatCol || '#3a3a32'); }); }, { eyes: 'dot', mouth: 'line', waistY: 147 });

// ---- the farmer in true profile, facing +x (right), seated on the side chair. Same canvas contract (1024 units, origin
// centre, y down, floor at +440). p: eyes 'dot'|'ring'|'shut', mouth 'line'|'open', sweat, blush, swing (−1..1 shin swing),
// fly (0..1: the body is blown back off the seat — thigh lifts, arms fly up; pair it with a roll on the card), chair (bool).
export const FARMER_SIDE = (c, p0) => { const p = { eyes: 'dot', mouth: 'line', chair: true, ...p0 }; const fly = p.fly || 0, sw = p.swing || 0;
  const SH = '#d8c8a0', SH2 = '#b8a880', TR = '#3a3a4a', SKN = p.skin || SKIN;
  c.translate(0, 448); c.scale(0.94, 0.94); c.translate(0, -448);
  if (p.chair && fly < 0.05) drawChairSide(c);
  const hip = [-30, 250], knee = [250 - 40 * fly, 262 - 150 * fly], foot = [262 + 40 * sw - 20 * fly, 420 - 230 * fly];
  // far arm (behind the body), far leg (a darker copy, slightly offset)
  const sho = [10, -96];
  const elbFar = [-10 - 60 * fly, 60 - 200 * fly], handFar = [150 - 140 * fly, 200 - 360 * fly];
  line(c, [sho, elbFar, handFar], 38, INK); line(c, [sho, elbFar, handFar], 24, SH2); ell(c, handFar[0], handFar[1], 24, 22); c.fillStyle = SKN; c.fill(); c.lineWidth = 7; c.strokeStyle = INK; c.stroke();
  line(c, [[knee[0] - 30, knee[1] + 6], [foot[0] - 34, foot[1] - 10]], 40, INK); line(c, [[knee[0] - 30, knee[1] + 6], [foot[0] - 34, foot[1] - 10]], 26, '#22222e');
  ell(c, foot[0] - 6, foot[1] + 2, 46, 17); c.fillStyle = INK; c.fill();
  // near shin + shoe
  line(c, [knee, foot], 42, INK); line(c, [knee, foot], 28, TR); ell(c, foot[0] + 26, foot[1] + 6, 50, 18); c.fillStyle = INK; c.fill();
  // tunic: back curve (left), chest (right), skirt over the thigh out to the knee
  const tun = () => { c.beginPath(); c.moveTo(-30, -150); c.quadraticCurveTo(-112, -140, -112, -40); c.quadraticCurveTo(-118, 150, -100, hip[1] + 40);
    c.quadraticCurveTo(-90, hip[1] + 76, -20, hip[1] + 74); c.lineTo(knee[0] - 6, knee[1] + 44); c.quadraticCurveTo(knee[0] + 40, knee[1] + 30, knee[0] + 26, knee[1] - 16);
    c.quadraticCurveTo(knee[0] + 10, knee[1] - 40, knee[0] - 40, knee[1] - 40); c.lineTo(80, hip[1] - 40); c.quadraticCurveTo(96, 60, 92, -60); c.quadraticCurveTo(90, -140, 30, -152); c.closePath(); };
  tun(); formFill(c, SH, -110, -150, 100, hip[1] + 70, 0.3);
  C(c, () => { tun(); c.clip(); c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(-130, -160, 70, 520); c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(40, -120, 24, 300); });
  tun(); c.lineWidth = LW * 1.1; c.strokeStyle = INK; c.stroke();
  line(c, [[60, -120], [72, 150]], 6, 'rgba(60,40,30,0.5)'); for (let k = 0; k < 3; k++) { ell(c, 70, -90 + k * 50, 8, 8); ink(c, '#f2ead8', 3); }   // placket on the chest side
  c.save(); c.beginPath(); c.moveTo(-116, 168); c.lineTo(88, 158); c.lineTo(90, 192); c.lineTo(-114, 202); c.closePath(); ink(c, '#5a3a22', 6); c.restore();   // belt
  // neck + head in profile
  c.beginPath(); c.rect(-30, -200, 60, 70); c.fillStyle = SKN; c.fill(); line(c, [[30, -200], [32, -140]], 8, INK);
  const hx = 18, hy = -300; ell(c, hx, hy, 160, 158); const hg = c.createRadialGradient(hx + 40, hy - 70, 20, hx, hy, 180); hg.addColorStop(0, '#fffaf4'); hg.addColorStop(0.65, SKN); hg.addColorStop(1, '#e8d2c4'); c.fillStyle = hg; c.fill();
  ringStroke(c, hx, hy, 160, 158, LW * 1.25);
  c.beginPath(); c.moveTo(hx + 150, hy + 10); c.quadraticCurveTo(hx + 196, hy + 30, hx + 158, hy + 56); c.fillStyle = SKN; c.fill(); c.lineWidth = 9; c.strokeStyle = INK; c.stroke();   // nose
  ell(c, hx - 40, hy + 6, 30, 44); c.fillStyle = SKN; c.fill(); c.lineWidth = 9; c.strokeStyle = INK; c.stroke(); ell(c, hx - 40, hy + 6, 12, 22); c.fillStyle = 'rgba(190,120,110,0.5)'; c.fill();   // ear
  const ex = hx + 88, ey = hy - 18;   // the one visible eye
  if (p.eyes === 'ring') { ell(c, ex, ey, 26, 30); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 8; c.strokeStyle = INK; c.stroke(); ell(c, ex + 8, ey, 10, 12); c.fillStyle = INK; c.fill(); }
  else if (p.eyes === 'shut') taper(c, [ex - 22, ey], [ex, ey + 10], [ex + 22, ey], 10);
  else { ell(c, ex, ey, 13, 16); c.fillStyle = INK; c.fill(); }
  taper(c, [ex - 30, ey - 50 + (p.brow || 0) * -40], [ex, ey - 62], [ex + 30, ey - 56], 12);   // brow
  if (p.blush) { ell(c, hx + 70, hy + 50, 34, 18); c.fillStyle = 'rgba(240,120,120,0.3)'; c.fill(); }
  // beard in profile: from the ear line down round the jaw to under the nose
  c.beginPath(); c.moveTo(hx - 10, hy + 40); c.quadraticCurveTo(hx - 20, hy + 150, hx + 60, hy + 170); c.quadraticCurveTo(hx + 150, hy + 160, hx + 156, hy + 70); c.quadraticCurveTo(hx + 110, hy + 90, hx + 60, hy + 70); c.closePath(); ink(c, p.beardCol || '#6a4a32', 7);
  if (p.mouth === 'open') { ell(c, hx + 128, hy + 96, 20, 24); c.fillStyle = '#5a1a1a'; c.fill(); c.lineWidth = 7; c.strokeStyle = INK; c.stroke(); }
  else line(c, [[hx + 108, hy + 92], [hx + 146, hy + 88]], 9, INK);
  if (p.sweat) { c.beginPath(); c.moveTo(hx + 30, hy - 120); c.quadraticCurveTo(hx + 52, hy - 80, hx + 30, hy - 70); c.quadraticCurveTo(hx + 8, hy - 80, hx + 30, hy - 120); ink(c, '#a9dcff', 6); }
  if (p.hairUp) for (let k = -4; k <= 3; k++) line(c, [[hx + k * 30, hy - 150], [hx + k * 42, hy - 260]], 10);
  // cap in profile: dome over the crown, peak to the front
  c.beginPath(); c.ellipse(hx - 10, hy - 110, 168, 86, 0, Math.PI, 0); c.closePath(); formFill(c, p.hatCol || '#3a3a32', hx - 170, hy - 200, hx + 160, hy - 110, 0.35); c.lineWidth = LW; c.strokeStyle = INK; c.stroke();
  c.beginPath(); c.moveTo(hx + 120, hy - 112); c.quadraticCurveTo(hx + 220, hy - 116, hx + 262, hy - 92); c.quadraticCurveTo(hx + 200, hy - 86, hx + 110, hy - 96); c.closePath(); ink(c, '#2a2a22', 7);
  // near arm: shoulder → elbow → hand resting on the knee (or flung up)
  const elb = [40 - 70 * fly, 70 - 210 * fly], hand = [190 - 150 * fly, 214 - 380 * fly];
  line(c, [sho, elb, hand], 40, INK); line(c, [sho, elb, hand], 26, SH); ell(c, hand[0], hand[1], 26, 24); c.fillStyle = SKN; c.fill(); c.lineWidth = 7; c.strokeStyle = INK; c.stroke();
};

// ---- a walker in true profile, facing +x, with a real gait: p.walk = phase (radians; one cycle = two steps ≈ WALK_STRIDE m
// on the ground, so move the card by phase/2π·WALK_STRIDE and the feet never slide). The stance foot stays on the floor —
// the hips rise and fall with the legs (no hop). Arms swing against the legs. p: coat, hat 'cap'|null, hatCol, glasses,
// beard, pack (a rucksack + bedroll on the back), eyes, mouth.
export const WALK_STRIDE = 0.92;
export const WALKER_SIDE = (c, p0) => { const p = { coat: '#6a6a4a', eyes: 'dot', mouth: 'line', ...p0 }; const ph = p.walk || 0, SKN = p.skin || SKIN;
  c.translate(0, 448); c.scale(0.94, 0.94); c.translate(0, -448);
  const L1 = 150, L2 = 150, R = Math.PI / 180;
  const leg = (f) => { const a1 = 26 * R * Math.sin(f), kb = (6 + 55 * Math.pow(Math.max(0, Math.cos(f)), 1.2)) * R, a2 = a1 - kb;
    const k = [L1 * Math.sin(a1), L1 * Math.cos(a1)], ft = [k[0] + L2 * Math.sin(a2), k[1] + L2 * Math.cos(a2)]; return { k, ft, lift: Math.max(0, Math.cos(f)) }; };
  const A = leg(ph), B = leg(ph + Math.PI); const hipY = 440 - 16 - Math.max(A.ft[1], B.ft[1]); const hip = [0, hipY];
  const P = (v) => [hip[0] + v[0], hip[1] + v[1]];
  const drawLeg = (g, col) => { const kn = P(g.k), ft = P(g.ft); line(c, [hip, kn, ft], 42, INK); line(c, [hip, kn, ft], 28, col);
    C(c, () => { c.translate(ft[0], ft[1] + 6); c.rotate(-0.25 * g.lift); ell(c, 24, 0, 50, 18); c.fillStyle = INK; c.fill(); }); };
  const sho = [8, hipY - 250]; const arm = (f, col) => { const a = -24 * R * Math.sin(f), e = [sho[0] + 140 * Math.sin(a), sho[1] + 140 * Math.cos(a)], b = a + 22 * R;
    const hd = [e[0] + 130 * Math.sin(b), e[1] + 130 * Math.cos(b)]; line(c, [sho, e, hd], 38, INK); line(c, [sho, e, hd], 24, col); ell(c, hd[0], hd[1], 24, 22); c.fillStyle = SKN; c.fill(); c.lineWidth = 7; c.strokeStyle = INK; c.stroke(); };
  const dark = (h) => { const n = parseInt(h.slice(1), 16); const f = (x) => Math.round(x * 0.78).toString(16).padStart(2, '0'); return '#' + f(n >> 16) + f((n >> 8) & 255) + f(n & 255); };
  arm(ph, dark(p.coat)); drawLeg(B, '#22222e');
  if (p.pack) { c.beginPath(); c.roundRect(-190, hipY - 270, 110, 200, 30); ink(c, '#6a5a3a', 7); c.beginPath(); c.roundRect(-205, hipY - 300, 140, 50, 24); ink(c, '#8a3a2a', 6); }
  // coat in profile: back (left) to chest (right), hem just below the hips, swinging a little with the step
  const top = hipY - 290, hem = hipY + 70, sw = 10 * Math.sin(ph * 2);
  const coat = () => { c.beginPath(); c.moveTo(-26, top); c.quadraticCurveTo(-104, top + 10, -104, top + 110); c.quadraticCurveTo(-110, hipY, -100 + sw, hem); c.lineTo(96 + sw, hem - 6); c.quadraticCurveTo(92, hipY - 60, 92, top + 120); c.quadraticCurveTo(90, top + 6, 26, top - 2); c.closePath(); };
  coat(); formFill(c, p.coat, -104, top, 96, hem, 0.3); C(c, () => { coat(); c.clip(); c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(-120, top - 10, 60, hem - top + 20); });
  coat(); c.lineWidth = LW * 1.1; c.strokeStyle = INK; c.stroke();
  c.beginPath(); c.moveTo(-104, hipY - 30); c.lineTo(94, hipY - 38); c.lineTo(94, hipY - 6); c.lineTo(-106, hipY + 2); c.closePath(); ink(c, '#4a3020', 6);
  for (let k = 0; k < 4; k++) { ell(c, 72, top + 60 + k * 55, 8, 8); ink(c, '#e8dcc0', 3); }
  drawLeg(A, '#2c2c3a');
  // head in profile (same construction as FARMER_SIDE)
  const hx = 18, hy = top - 150; c.beginPath(); c.rect(-28, top - 60, 56, 70); c.fillStyle = SKN; c.fill();
  ell(c, hx, hy, 160, 158); const hg = c.createRadialGradient(hx + 40, hy - 70, 20, hx, hy, 180); hg.addColorStop(0, '#fffaf4'); hg.addColorStop(0.65, SKN); hg.addColorStop(1, '#e8d2c4'); c.fillStyle = hg; c.fill(); ringStroke(c, hx, hy, 160, 158, LW * 1.25);
  c.beginPath(); c.moveTo(hx + 150, hy + 10); c.quadraticCurveTo(hx + 196, hy + 30, hx + 158, hy + 56); c.fillStyle = SKN; c.fill(); c.lineWidth = 9; c.strokeStyle = INK; c.stroke();
  ell(c, hx - 40, hy + 6, 30, 44); c.fillStyle = SKN; c.fill(); c.lineWidth = 9; c.strokeStyle = INK; c.stroke(); ell(c, hx - 40, hy + 6, 12, 22); c.fillStyle = 'rgba(190,120,110,0.5)'; c.fill();
  const ex = hx + 88, ey = hy - 18; ell(c, ex, ey, 13, 16); c.fillStyle = INK; c.fill(); taper(c, [ex - 30, ey - 50], [ex, ey - 62], [ex + 30, ey - 56], 12);
  if (p.glasses) { ell(c, ex + 4, ey, 40, 34); c.lineWidth = 9; c.strokeStyle = INK; c.stroke(); line(c, [[ex - 36, ey - 4], [hx - 20, hy - 10]], 8, INK); }
  if (p.beard) { c.beginPath(); c.moveTo(hx - 10, hy + 40); c.quadraticCurveTo(hx - 20, hy + 150, hx + 60, hy + 170); c.quadraticCurveTo(hx + 150, hy + 160, hx + 156, hy + 70); c.quadraticCurveTo(hx + 110, hy + 90, hx + 60, hy + 70); c.closePath(); ink(c, p.beardCol || '#6a4a32', 7); }
  else { const m = p.mouth === 'open'; if (m) { ell(c, hx + 120, hy + 90, 18, 20); c.fillStyle = '#5a1a1a'; c.fill(); c.lineWidth = 7; c.strokeStyle = INK; c.stroke(); } else line(c, [[hx + 102, hy + 92], [hx + 140, hy + 88]], 9, INK); }
  if (p.hat === 'cap') { c.beginPath(); c.ellipse(hx - 10, hy - 110, 168, 86, 0, Math.PI, 0); c.closePath(); formFill(c, p.hatCol || '#3a3a32', hx - 170, hy - 200, hx + 160, hy - 110, 0.35); c.lineWidth = LW; c.strokeStyle = INK; c.stroke();
    c.beginPath(); c.moveTo(hx + 120, hy - 112); c.quadraticCurveTo(hx + 220, hy - 116, hx + 262, hy - 92); c.quadraticCurveTo(hx + 200, hy - 86, hx + 110, hy - 96); c.closePath(); ink(c, '#2a2a22', 7); }
  arm(ph + Math.PI, p.coat);
};
