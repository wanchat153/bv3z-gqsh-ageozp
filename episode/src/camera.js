'use strict';
// ================= camera: a spring-smoothed path (pure function of t, built once) =================
// default: follow Sam (biased toward the sapling), medium-close; overrides frame the gags: [t0, t1, x, y, zoom]
const FOCW = [[0, 1.9, 540, 1010, 1.0], [3.1, 4.0, 360, 1070, 1.7], [6.6, 8.2, 620, 1050, 1.85], [9.4, 11.0, 560, 900, 1.15], [22.6, 25.6, 540, 940, 1.15],
  [29.0, 30.2, 660, 1080, 1.8], [33.0, 34.6, 660, 1080, 1.8], [37.0, 38.6, 650, 1070, 1.7], [44.6, 45.9, 650, 1090, 1.8], [48.8, 50.2, 620, 1090, 1.8], [52.8, 55.8, 660, 1040, 1.8],
  [57.0, 63.8, 470, 940, 1.25], [64.0, 66.5, 500, 950, 1.25], [72.4, 75.0, 640, 1090, 1.9], [75.4, 77.0, 620, 1000, 1.4], [78.0, 85.5, 600, 1070, 1.2],
  [87.2, 92.0, 420, 1000, 1.2], [92.4, 95.0, 200, 1030, 1.7], [100, 108, 620, 1070, 1.6], [108, 116, 620, 1070, 1.9], [116, 119, 700, 1000, 1.6], [119.4, 121, 640, 1050, 1.5],
  [124, 126, 640, 1000, 1.3], [128.5, 131.5, 600, 960, 1.0], [131.5, 134, 560, 900, 1.15], [134, 136, 560, 1000, 1.3], [137, 139, 680, 900, 1.3], [140, 143, 640, 1010, 1.15], [143, 150, 540, 1000, 1.0]];
let CAMTAB = null;
function camTarget(t) {
  let w = 0, x, y, z; // blend overrides in/out over 0.8 s so the target itself never jumps
  const sam = samAt(t); x = sam.x0 * 0.65 + 620 * 0.35; y = 1050; z = 1.5;
  for (const [a, b, ox, oy, oz] of FOCW) { const k = ss(a - 0.7, a + 0.7, t) * (1 - ss(b - 0.7, b + 0.7, t)); if (k > 0) { x = x + (ox - x) * k; y = y + (oy - y) * k; z = z + (oz - z) * k; } }
  return [x, y, z];
}
function buildCam() {
  const N = Math.round(DUR * 60) + 1, tab = new Float32Array(N * 3), dt = 1 / 60, OM = [3.6, 3.6, 2.3]; let p = camTarget(0), v = [0, 0, 0];
  for (let i = 0; i < N; i++) { const tg = camTarget(i * dt);
    for (let k = 0; k < 3; k++) { const om = OM[k], a = (tg[k] - p[k]) * om * om - 2 * om * v[k]; v[k] += a * dt; p[k] += v[k] * dt; tab[i * 3 + k] = p[k]; } }
  return tab;
}
function camAt(t) {
  if (!CAMTAB) CAMTAB = buildCam(); const f = clamp(t, 0, DUR) * 60, i = Math.min(Math.floor(f), Math.round(DUR * 60) - 1), q = f - i; const g = (k) => CAMTAB[i * 3 + k] * (1 - q) + CAMTAB[(i + 1) * 3 + k] * q;
  let z = Math.max(1.0, g(2)), x = g(0), y = g(1);
  // shake on hits and thunder
  let sx = 0, sy = 0; for (const e of EV) { if (!['thump', 'thunder', 'crash', 'tong', 'bonk', 'drench', 'stonehit'].includes(e[1]) || t < e[0]) continue; const d = t - e[0]; if (d > 0.6) continue; const a = (e[1] === 'thunder' ? 7 : 5) * Math.exp(-d / 0.18); sx += a * Math.sin(d * 55); sy += a * 0.7 * Math.cos(d * 47); }
  x = clamp(x, 540 / z, 1080 - 540 / z); y = clamp(y, 960 / z, 1920 - 960 / z);
  return [x + sx / z, y + sy / z, z];
}
