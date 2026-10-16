'use strict';
// ================= story part 2: Sam, hands + items, Mochi (pure functions of t) =================
const Dd = SAMS * 1.58;
// ---------- Sam path (body centre x). Facing is derived from the last movement unless overridden ----------
const SX = [[0, -220], [2.6, 240], [4.1, 240], [6.5, 455], [12.0, 455], [13.5, 240], [14.0, 240], [15.5, 455], [16.4, 455], [17.2, 240], [17.8, 240], [18.4, 390], [19.2, 500], [26.0, 500], [27.0, 545], [27.8, 545], [28.8, 500], [42.0, 500],
  [43.1, 300], [43.6, 300], [44.9, 520], [46.0, 520], [47.1, 300], [47.6, 300], [48.9, 520], [50.1, 520], [51.2, 300], [52.0, 300], [53.0, 520], [57.0, 520], [58.2, 440], [66.8, 440], [68.4, 500], [69.8, 500], [70.8, 455], [78.0, 455],
  [79.0, 820], [80.0, 420], [81.0, 800], [82.0, 380], [83.0, 780], [84.2, 860], [84.6, 830], [86.0, 830], [86.6, 760], [88.0, 520], [91.45, 520], [92.6, 150], [93.0, 165], [95.5, 170], [99.0, 570], [124.2, 570], [125.5, 600], [150, 600]];
const FACEOV = [[13.4, 14.2, -1], [17.1, 18.0, -1], [28.8, 42.0, -1], [86.6, 91.5, 1], [92.6, 99.0, -1]];
function faceAt(t) {
  for (const [a, b, f] of FACEOV) if (t >= a && t < b) return f;
  for (let u = t; u > -1; u -= 0.1) { const v = ks1(SX, u + 0.15) - ks1(SX, u - 0.15); if (Math.abs(v) > 22) return v > 0 ? -1 : 1; } return -1;
}
const HOPS = [[8.0, 30], [10.4, 34], [37.45, 28], [54.2, 40], [54.8, 40], [57.3, 26], [58.4, 54], [74.5, 30], [85.5, 30], [120.4, 26], [125.5, 28], [21.15, 20]];
const CROUCHW = [[27.0, 27.6], [35.5, 36.0], [43.2, 43.6], [47.5, 47.9], [51.8, 52.2], [66.6, 67.2], [75.2, 75.7], [86.4, 86.8], [18.1, 18.45], [57.2, 57.7]];
const PRONEW = [[18.5, 22.0], [62.95, 64.2]];
const SITW = [[99.3, 150]];
const LIFTK = [[58.4, 0], [58.7, -20], [59.5, -130], [60.4, -190], [61.4, -150], [62.4, -210], [62.6, -210]];
const wk = (W, t, e = 0.25) => { let m = 0; for (const [a, b] of W) m = Math.max(m, ss(a, a + e, t) * (1 - ss(b - e, b, t))); return m; };
function shockAt(t) { let m = 0; for (const e of EV) { if (e[2] < 0.25 || t < e[0]) continue; const d = t - e[0]; if (d > 1.6) continue; if (!['hop', 'meow', 'grow', 'splash', 'spray', 'clang', 'tong', 'slash', 'hiss', 'burp', 'pop', 'dig', 'twang'].includes(e[1])) m = Math.max(m, e[2] * Math.exp(-d / 0.7) * ss(e[0], e[0] + 0.05, t)); } return m; }
function samAt(t) {
  const x0 = ks1(SX, t), sp = (ks1(SX, t + 0.05) - ks1(SX, t - 0.05)) / 0.1, face = faceAt(t);
  const cr = wk(CROUCHW, t, 0.12), pr = wk(PRONEW, t, 0.2), sit = wk(SITW, t, 0.5), sh = shockAt(t);
  const mov = Math.abs(sp) > 8 && pr < 0.2 && sit < 0.3;
  let hop = 0; for (const [te, h] of HOPS) hop += arc(t, te, h, 0.34);
  let rot = 0.035 * Math.sin(t * 1.3) * (1 - pr);
  if (mov) rot += 0.05 * Math.sign(sp) * Math.min(1, Math.abs(sp) / 300) * (Math.abs(sp) > 250 ? 1.6 : 1);
  rot += -1.45 * pr;
  // dips at the bucket / pours: small forward lean
  rot += 0.1 * wk([[3.3, 4.0], [13.6, 14.1], [17.3, 17.8], [35.6, 36.0]], t, 0.15) * -face;
  // slip: body tips back as feet fly (face = right)
  rot += -0.5 * (ss(18.3, 18.5, t) * (1 - ss(18.5, 18.6, t)));
  // thrown by the tendril: spin
  let fly = 0, airY = 0; if (t >= 91.45 && t < 92.6) { const q = (t - 91.45) / 1.15; rot += -2 * PI * q; airY = -230 * Math.sin(PI * q); fly = 1; }
  const D2a = Dd;
  let sy = 1 - 0.18 * cr + 0.012 * Math.sin(t * 2.1) - 0.17 * sit, sx = 1 + 0.12 * cr + 0.1 * sit;
  for (const [te] of HOPS) { const d = t - te - 0.34; if (d > 0 && d < 0.3) { const q = Math.sin(PI * d / 0.3) * 0.1; sy -= q; sx += q * 0.7; } }
  // landing squash after the lift fall + after the throw
  for (const [ta, w] of [[63.05, 0.3], [92.6, 0.3]]) { const d = t - ta; if (d > 0 && d < w) { const q = Math.sin(PI * d / w) * 0.2; sy -= q; sx += q * 0.7; } }
  let lift = t < 62.6 ? ks1(LIFTK, t) : (t < 63.05 ? -210 * (1 - Math.pow((t - 62.6) / 0.45, 2)) : 0);
  lift += airY;
  const D2 = Dd * sy;
  let x = x0 + D2 * Math.sin(rot) * (1 - pr) * (fly ? 0.0 : 1), y = FL - D2 * Math.cos(rot) - hop + lift;
  if (pr > 0) { y = FL - 118 * pr - (1 - pr) * D2 * Math.cos(rot * (1 - pr)) - hop + lift; x = x0; }
  if (fly) { x = x0; y = FL - Dd * 0.5 + airY; }
  const walk = mov ? x0 * 0.045 * (-face) : (lift < -40 ? t * 9 : null);
  const ground = lift < -40 ? y + D2 : y + D2 * Math.cos(rot);
  const wet = Math.max(wk([[37.4, 44]], t, 1.0) * 0.8, wk([[85.0, 92]], t, 1.0) * 0.9);
  return { x, y, ground, S: SAMS, face, sx, sy, rot, wob: 0.01, sw: { mode: 'none' }, band: { a: 1, wind: 0.25 + 0.5 * sh + (mov ? 0.5 : 0) + 0.5 * Math.abs(Math.sin(t * 1.7)) * cloudD(t) }, a: 1, walk, w: 0, sneeze: 0, kick: 0, cold: 0, sad: 0, sweat: Math.min(1, 0.6 * sh), strain: 0, shock: sh, sit, x0, pr, lift, wet };
}
// ---------- hand poses (forward frame, dx dy from the body centre) + ladle angle aF ----------
const PS = {
  idle: [-150, 95, 150, 95, 0], carry: [-150, 95, 165, 45, PI + 0.15], scoop: [-150, 95, 132, -14, PI + 1.2], pour: [-150, 95, 165, -50, PI + 0.95], cheer: [-110, -30, 110, -30, 0], shrug: [-140, 70, 140, 70, 0],
  catchP: [-150, 95, 165, 60, PI + 0.45], hold2: [30, 118, 125, 118, 0], pole: [20, 78, 165, 80, 0], place: [-150, 95, 160, 135, 0], sword: [-140, 60, 150, -45, 0], slash: [-140, 60, 150, 70, 0],
  fishup: [-150, 95, 130, -70, 0], run: [-130, 40, 130, 40, 0], flail: [-120, -50, 110, -80, 0], up: [-60, -130, 60, -130, 0], rest: [-130, 120, 130, 120, 0],
};
const HP = [[0, 'idle'], [3.0, 'idle'], [3.3, 'carry'], [3.55, 'scoop'], [3.9, 'scoop'], [4.3, 'carry'], [6.6, 'carry'], [6.9, 'pour'], [7.5, 'pour'], [7.8, 'carry'], [7.95, 'cheer'], [8.4, 'cheer'], [8.8, 'carry'], [13.5, 'carry'], [13.65, 'scoop'], [14.0, 'scoop'], [14.35, 'carry'], [15.6, 'carry'], [15.85, 'pour'], [16.25, 'pour'], [16.5, 'carry'],
  [17.2, 'carry'], [17.35, 'scoop'], [17.75, 'scoop'], [17.95, 'carry'], [18.4, 'carry'], [18.6, 'flail'], [19.0, 'flail'], [19.3, 'idle'], [26.6, 'idle'], [27.2, 'place'], [27.5, 'carry'], [28.8, 'carry'], [29.2, 'catchP'], [33.2, 'catchP'], [33.5, 'shrug'], [34.5, 'idle'], [35.5, 'idle'], [35.7, 'scoop'], [35.95, 'scoop'], [36.2, 'catchP'], [37.3, 'catchP'], [37.45, 'flail'], [37.9, 'idle'], 
  [43.0, 'idle'], [43.3, 'place'], [43.6, 'pole'], [44.9, 'pole'], [45.05, 'place'], [45.3, 'idle'], [46.9, 'idle'], [47.3, 'place'], [47.7, 'pole'], [48.9, 'pole'], [49.05, 'place'], [49.3, 'idle'], [51.0, 'idle'], [51.8, 'place'], [52.1, 'pole'], [52.9, 'pole'], [53.05, 'place'], [53.3, 'idle'], [53.9, 'cheer'], [54.7, 'cheer'], [55.3, 'idle'],
  [57.3, 'shrug'], [58.1, 'run'], [58.3, 'hold2'], [62.5, 'hold2'], [62.7, 'flail'], [63.2, 'idle'], [66.5, 'idle'], [66.95, 'place'], [67.2, 'carry'], [68.4, 'carry'], [68.9, 'catchP'], [69.5, 'catchP'], [69.9, 'carry'], [70.8, 'carry'], [71.0, 'pour'], [71.35, 'pour'], [71.5, 'shrug'], [72.5, 'shrug'],
  [73.0, 'idle'], [74.5, 'shrug'], [75.2, 'place'], [75.55, 'fishup'], [76.2, 'fishup'], [76.4, 'idle'], [77.8, 'idle'], [78.2, 'run'], [84.4, 'run'], [84.6, 'flail'], [85.2, 'flail'], [85.7, 'idle'], [86.4, 'idle'], [86.8, 'pole'], [87.3, 'sword'], [90.0, 'sword'], [90.25, 'slash'], [90.45, 'flail'], [91.5, 'flail'], [92.6, 'idle'],
  [99.2, 'idle'], [99.6, 'rest'], [107.9, 'rest'], [108.3, 'up'], [108.9, 'up'], [109.4, 'rest'], [120.0, 'rest'], [120.5, 'cheer'], [121.0, 'rest'], [125.4, 'rest'], [125.6, 'shrug'], [126.4, 'rest'], [150, 'rest']];
function handKeys(t) { const keys = HP.map(([tt, n]) => [tt, ...PS[n]]); return KS(keys, t); }
function handsAt(t, sam, g) {
  const k = handKeys(t), f = -sam.face; // forward direction on screen = -face
  const walkSw = sam.walk != null ? 14 * Math.sin(sam.walk * 6) : 0;
  const pos = (dx, dy, sg) => [sam.x + dx * f, sam.y + dy + (sg ? walkSw * sg : 0)];
  const idleish = k[1] > 60 && k[3] > 60;
  return { L: pos(k[0], k[1], idleish ? -1 : 0), R: pos(k[2], k[3], idleish ? 1 : 0), aF: k[4], f };
}
// ---------- ladle ----------
const LHAND = [[0, 41.8], [42.0, 42.0, 'bucket'], [62.4, 62.4, 'fall'], [66.95, 71.4]]; // (informational)
const ladleHeld = (t) => (t < 18.5) || (t >= 27.5 && t < 33.4) || (t >= 35.9 && t < 37.3) || (t >= 67.1 && t < 71.4);
const WAT = [[0, 0], [3.7, 0], [3.95, 1], [6.8, 1], [7.55, 0], [13.9, 0], [14.1, 1], [15.9, 1], [16.3, 0], [17.7, 0], [17.85, 1], [18.5, 1], [18.9, 0], [29.5, 0], [29.7, 0.25], [33.2, 0.25], [33.4, 0], [35.9, 0], [36.0, 0.2], [37.2, 0.3], [37.4, 0], [69.2, 0], [69.5, 1], [71.0, 1], [71.4, 0.2], [71.6, 0]];
function ladleAt(t, hands, bk) {
  const wat = lerpK(WAT, t);
  const held = (c, aF) => { const aS = hands.f > 0 ? aF : PI - aF; return { x: hands.R[0] - 133 * Math.cos(aS), y: hands.R[1] - 133 * Math.sin(aS), ang: aS, wat }; };
  if (ladleHeld(t)) return held(0, hands.aF);
  if (t >= 18.5 && t < 19.6) { const k = KS([[18.5, 450, 1090, PI - 0.5], [18.9, 560, 880, PI + 1.5], [19.35, 600, 1170, PI + 3.0], [19.6, 560, 1248, PI + 0.2]], t); return { x: k[0], y: k[1], ang: k[2], wat: wat }; }
  if (t >= 19.6 && t < 27.45) return { x: 560, y: 1248, ang: PI + 0.2, wat: 0, rest: true };
  if (t >= 33.4 && t < 34.3) { const k = KS([[33.4, 800, 1150, PI + 0.45], [33.75, 620, 880, PI + 1.8], [34.3, 428, 1165, PI + 1.2]], t); return { x: k[0], y: k[1], ang: k[2], wat: 0 }; }
  if (t >= 37.3 && t < 37.9) { const k = KS([[37.3, 785, 1180, PI + 0.45], [37.6, 640, 1090, PI + 2.2], [37.9, 470, 1250, PI + 0.2]], t); return { x: k[0], y: k[1], ang: k[2], wat: 0 }; }
  if (t >= 37.9 && t < 42.0) return { x: 470, y: 1250, ang: PI + 0.2, wat: 0, rest: true };
  if ((t >= 34.3 && t < 35.9) || (t >= 42.0 && t < 62.4)) return { x: bk.x + 14, y: bk.y - 98, ang: -1.2 + PI * 0 + PI, wat: 0, inb: true };
  if (t >= 62.4 && t < 63.2) { const k = KS([[62.4, bk.x, bk.y, PI + 1.0], [62.8, 430, 1200, PI + 3.0], [63.2, 455, 1252, PI + 0.1]], t); return { x: k[0], y: k[1], ang: k[2], wat: 0 }; }
  if (t >= 63.2 && t < 67.1) return { x: 455, y: 1252, ang: PI + 0.1, wat: 0, rest: true };
  if (t >= 71.4 && t < 72.4) { const q = (t - 71.4); return { x: 640 + 30 * q, y: 960 - 1000 * q * q, ang: PI + 6 * q, wat: 0.2 }; }
  return null;
}
// ---------- bucket ----------
function bucketAt(t, hands) {
  if (t < 58.4) return { x: 420, y: 1262, held: false };
  if (t < 62.6) { const mx = (hands.L[0] + hands.R[0]) / 2; return { x: mx, y: hands.R[1] + 92, held: true }; }
  if (t < 63.9) { const q = (t - 62.6) / 1.3; const sx = hands ? 0 : 0; return { x: 440, y: Math.max(-200, 1000 - 1300 * q * q), held: false, gone: false }; }
  return { x: 420, y: 1262, held: false, gone: true };
}
// ---------- poles: positions (stack / carried / gutter / tossed) ----------
function poleAt(p, t, hands) {
  const carriedPose = () => { const f = hands.f, hx = hands.R[0], hy = hands.R[1]; const a0 = (f > 0 ? 0 : PI) + (p.id === 'B' ? -0.2 * Math.sin((t - p.pick) * 6) : 0); return { a: [hx - 30 * Math.cos(a0), hy - 30 * Math.sin(a0)], b: [hx + (p.len - 30) * Math.cos(a0), hy + (p.len - 30) * Math.sin(a0)] }; };
  const laid = { a: [GUT0[0], GUT0[1]], b: [p.endx, GUT0[1] + 14] };
  if (t < p.pick - 0.2) return { a: [p.st[0] - p.len / 2, p.st[1]], b: [p.st[0] + p.len / 2, p.st[1] + 6], show: true };
  if (t < p.lay[0] - 0.12) return Object.assign(carriedPose(), { show: true, carried: true });
  if (t < p.lay[0]) { const q = ss(p.lay[0] - 0.12, p.lay[0], t), c0 = carriedPose(); return { a: [lerp(c0.a[0], laid.a[0], q), lerp(c0.a[1], laid.a[1], q)], b: [lerp(c0.b[0], laid.b[0], q), lerp(c0.b[1], laid.b[1], q)], show: true, carried: true }; }
  if (t < p.lay[1] || !p.toss) { if (p.id === 'C' && t >= 86.6 && t < 90.45) return null; return Object.assign({ show: true, laid: true }, laid); }
  if (t < p.toss[1]) { const q = (t - p.toss[0]) / (p.toss[1] - p.toss[0]); const cx = lerp(p.endx + (GUT0[0] - p.endx) / 2, p.toss[2], q), cy = lerp(1240, p.toss[3], q) - 120 * Math.sin(PI * q); const a = 1.5 * q; return { a: [cx - p.len / 2 * Math.cos(a), cy - p.len / 2 * Math.sin(a)], b: [cx + p.len / 2 * Math.cos(a), cy + p.len / 2 * Math.sin(a)], show: true }; }
  return { a: [p.toss[2] - p.len / 2, p.toss[3]], b: [p.toss[2] + p.len / 2, p.toss[3] + 5], show: true };
}
// pole C as a sword (act 7) + yank
function swordAt(t, hands) {
  if (t < 86.8 || t >= 90.5) return null; const f = hands.f, hx = hands.R[0], hy = hands.R[1];
  let a = -1.1, q = 0; if (t >= 90.0) { q = ss(90.0, 90.3, t); a = -1.1 + 1.9 * q; }
  const ar = f > 0 ? a : PI - a; const L = 110 + 60; return { a: [hx - 30 * Math.cos(ar), hy - 30 * Math.sin(ar)], b: [hx + (L - 30) * Math.cos(ar), hy + (L - 30) * Math.sin(ar)] };
}
// ---------- fish (act 6) ----------
function fishAt(t, hands) {
  if (t < 74.3 || t >= 76.2) return null;
  if (t < 74.9) { const q = (t - 74.3) / 0.6; return { x: 640 + 30 * q, y: 1210 - 160 * Math.sin(PI * q), rot: 6 * q }; }
  if (t < 75.55) return { x: 672, y: 1236, rot: 0.1 };
  if (t < 76.0) return { x: hands.R[0], y: hands.R[1] - 20, rot: -0.6 };
  const q = (t - 76.0) / 0.2; return { x: hands.R[0] + 6 * q, y: hands.R[1] - 20 - 200 * q, rot: -0.6 };
}
// ---------- lantern kasa (roof) falls off when Sam crashes into it ----------
function kasaAt(t) { // offsets relative to its seat: dx, dy, rot
  if (t < 92.6) return { dx: 0, dy: 0, rot: 0 };
  if (t < 93.0) { const q = (t - 92.6) / 0.4; return { dx: 14 * q, dy: -50 * Math.sin(PI * q) - 6 * q, rot: 0.25 * q }; }
  if (t < 93.9) { const d = t - 93.0; return { dx: 52 + 40 * ss(93.3, 93.9, t), dy: -2 + 26 * ss(93.3, 93.9, t), rot: 0.08 * Math.sin(d * 18) + 0.3 * ss(93.3, 93.9, t) }; }
  if (t < 94.3) { const q = (t - 93.9) / 0.4; return { dx: 92 - 40 * q, dy: 24 + 150 * q * q, rot: 0.3 + 0.8 * q }; }
  return { dx: 52, dy: 174, rot: 1.1 };
}
// ---------- Mochi ----------
const MH = [[10.4, 10.9, 600, 600, 45], [33.95, 34.5, 600, 600, 70], [63.0, 63.5, 600, 600, 50], [72.4, 73.0, 600, 650, 25], [74.3, 74.8, 650, 650, 70],
  [78.6, 79.3, 650, 760, 90], [79.5, 80.3, 760, 520, 100], [80.5, 81.3, 520, 740, 100], [81.5, 82.3, 740, 440, 100], [82.5, 83.3, 440, 700, 100], [83.4, 84.1, 700, 770, 70], [100.5, 101.2, 770, 700, 40], [120.4, 121.0, 700, 715, 40]];
function catGround(t) { let x = 600, up = 0, last = null; for (const m of MH) if (t >= m[0]) last = m; if (last) { const [t0, t1, x0, x1, h] = last; if (t < t1) { const q = (t - t0) / (t1 - t0), e = q * q * (3 - 2 * q); x = x0 + (x1 - x0) * e; up = h * Math.sin(PI * q); } else x = x1; } return { x, up }; }
function catAt(t) {
  const g = catGround(t); let rot = 0, sqx = 1, sqy = 1, tail = 0.12, sleep = 0, wide = 0.12;
  for (const m of MH) { const a = m[0] - 0.4, b = m[0]; if (t > a && t < b) { const q = ss(a, b - 0.03, t); sqy = 1 - 0.18 * q; sqx = 1 + 0.1 * q; tail = 0.4; } const d = t - m[1]; if (d > 0 && d < 0.35) { const q = Math.sin(PI * d / 0.35) * Math.exp(-d / 0.25); sqy *= 1 - 0.16 * q; sqx *= 1 + 0.1 * q; } }
  // surprise squash at the water hits
  for (const te of [19.4, 49.75, 85.0]) { const d = t - te; if (d > 0 && d < 0.6) { const q = Math.sin(PI * Math.min(1, d / 0.4)) * Math.exp(-d / 0.4); sqy *= 1 - 0.2 * q; sqx *= 1 + 0.12 * q; wide = 0.9; } }
  // shakes
  for (const [a, b] of [[19.9, 20.8], [50.4, 51.0], [85.6, 86.3]]) if (t > a && t < b) { const q = Math.sin(PI * (t - a) / (b - a)); rot += 0.14 * q * Math.sin(t * 44); tail = 0.5; }
  if (t > 22.2 && t < 22.7) { sqy *= 1 - 0.12 * Math.sin(PI * (t - 22.2) / 0.5); } // sneeze
  // dig (paw dips): handled via pose swat; head bob here
  if (t > 72.7 && t < 74.2) { rot += 0.05 * Math.sin(t * 22); }
  // fear / hiss puff
  const puff = Math.max(wk([[10.4, 11.6], [63.1, 64.4], [76.9, 78.4], [126, 134]], t, 0.2), wk([[22.6, 25.5]], t, 0.2) * 0.8);
  if (puff > 0) { sqx *= 1 + 0.06 * puff; tail = Math.max(tail, 0.5); wide = Math.max(wide, 0.5 * puff); }
  sleep = Math.max(ss(110.4, 111.4, t) * (1 - ss(116.0, 116.1, t)) * 0.0, 0) ;
  const asleep = ss(110.6, 111.6, t) * (1 - ss(116.0, 116.12, t)) + ss(118.9, 119.0, t) * 0 + ss(139.8, 141.0, t);
  const wetK = Math.max(wk([[19.4, 22]], t, 0.6), wk([[49.8, 52.5]], t, 0.6), wk([[85.0, 90]], t, 0.8));
  let look = [0.5, -0.1];
  for (const [a, b, l] of [[9.8, 12, [0.2, -0.9]], [22.6, 26, [0.1, -0.9]], [57, 64, [-0.4, -0.7]], [75, 77, [0.1, -0.9]], [116, 119, [0.3, -0.8]], [126, 134, [0.1, -0.9]], [136, 141, [0.2, -0.9]]]) if (t >= a && t < b) look = l;
  return { x: g.x, y: FL - g.up - 2, rot, sqx, sqy, tail, sleep: asleep, wide, wet: wetK, look, down: 0 };
}
