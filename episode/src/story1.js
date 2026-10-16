'use strict';
// ================= story part 1: world state (sapling, cloud, shishi, poles, bucket, ladle, particles) =================
const PI_ = Math.PI, G_ = 1900;
const lerpK = (keys, t) => { // linear between keys with smoothstep easing (no overshoot)
  const n = keys.length; if (t <= keys[0][0]) return keys[0][1]; if (t >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 1; while (i < n - 1 && t > keys[i][0]) i++; const a = keys[i - 1], b = keys[i], q = (t - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * q * q * (3 - 2 * q);
};
// ---------- sapling ----------
const GK = [[0, 0.05], [7.6, 0.05], [8.3, 0.13], [16.2, 0.13], [16.5, 0.16], [53.8, 0.16], [55.5, 0.46], [71.1, 0.46], [71.8, 0.5], [119.7, 0.5], [120.7, 0.68], [124.3, 0.68], [125.3, 0.85], [128.9, 0.85], [130.6, 1.0], [150, 1.0]];
const BOING = [7.7, 16.25, 53.9, 54.5, 55.1, 71.1, 119.8, 124.4, 129.0];
function saplingAt(t) {
  const g = lerpK(GK, t); let sy = 1, sx = 1;
  for (const b of BOING) { const d = t - b; if (d >= 0 && d < 1.2) { const e = Math.exp(-d / 0.28) * Math.sin(d * 20); sy += 0.09 * e; sx -= 0.05 * e; } }
  let droop = 0; for (const [a, k] of [[119.2, 0.8], [118.4, 0.4], [116.0, 0.3], [138.4, 0.5]]) { const d = t - a; if (d >= 0 && d < 1.6) droop += k * Math.exp(-d / 0.5) * Math.cos(d * 12); }
  const sway = 0.5 * Math.sin(t * 1.1) + 1.4 * ss(126, 130, t) * (1 - ss(133, 134, t)) * Math.sin(t * 5.5) + 0.8 * ss(136, 138, t) * Math.sin(t * 1.6);
  return { g, sy, sx, droop, sway };
}
// ---------- cloud (the authority: only its underside + a tendril are ever seen) ----------
const CY = [[0, -140], [9.0, -140], [9.9, 60], [22.0, 130], [26, 150], [40, 210], [54, 280], [64, 300], [76, 330], [86, 360], [93, 400], [100, 330], [104, 200], [116, 230], [124, 330], [130, 440], [133.7, 500], [135.6, 260], [140, 130], [150, 100]];
const CD = [[0, 0], [9, 0.0], [10, 0.3], [22, 0.38], [40, 0.5], [54, 0.62], [64, 0.7], [76, 0.76], [86, 0.82], [93, 0.88], [102, 0.5], [112, 0.4], [116, 0.55], [126, 0.8], [130, 1.0], [133.7, 1.0], [136, 0.3], [142, 0.12], [150, 0.05]];
const cloudY = (t) => lerpK(CY, t), cloudD = (t) => lerpK(CD, t);
const flashK = (t) => { let m = 0; for (const [te, s] of FLASH) { const d = t - te; if (d >= 0 && d < 0.5) m = Math.max(m, s * Math.exp(-d / 0.12) * (0.6 + 0.4 * Math.cos(d * 40))); } return m; };
// tendril tip path: [t, x, y]; hidden outside TEND windows (body grows from the cloud base)
const TIPK = [[22.9, 560, 150], [23.4, 520, 700], [23.7, 470, 760], [24.0, 600, 700], [24.4, 470, 760], [24.8, 600, 700], [25.1, 540, 400], [25.5, 540, 150],
  [56.9, 440, 150], [57.7, 436, 1140], [58.4, 436, 1130], [59.2, 436, 980], [60.0, 440, 880], [60.8, 470, 860], [61.6, 410, 880], [62.4, 440, 840], [62.7, 440, 800], [63.5, 440, 120], [63.9, 460, 600], [64.2, 480, 860], [64.6, 420, 880], [65.0, 500, 860], [65.4, 440, 880], [65.9, 480, 500], [66.6, 480, 150],
  [70.9, 580, 150], [71.3, 640, 960], [71.5, 640, 960], [72.0, 600, 400], [72.6, 600, 150], [75.5, 700, 150], [76.0, 640, 1000], [76.3, 650, 1000], [76.8, 650, 150],
  [87.7, 340, 150], [88.4, 380, 760], [89.2, 360, 800], [90.0, 380, 760], [90.3, 450, 900], [90.6, 440, 880], [91.2, 470, 830], [91.6, 500, 1000], [92.0, 380, 200],
  [136.9, 640, 150], [137.6, 650, 700], [138.3, 690, 590], [138.5, 690, 600], [139.4, 690, 640], [140.5, 690, 150]];
const tendrilAt = (t) => { for (const [a, b] of TEND) if (t >= a && t <= b) { const k = KS(TIPK.filter((r) => r[0] >= a - 0.2 && r[0] <= b + 0.1), t); return { x: k[0], y: k[1], a: ss(a, a + 0.3, t) * (1 - ss(b - 0.3, b, t)) }; } return null; };
// ---------- shishi-odoshi: shared tilt cycle ----------
function shishiAt(t) {
  const ph = (((t - TOCK0) % PERIOD) + PERIOD) % PERIOD; let tilt = 0, fill = 0, pour = 0;
  if (ph < 0.3) { tilt = 0.06 * Math.exp(-ph / 0.07) * Math.sin(ph * 40); }
  else if (ph < 3.2) fill = (ph - 0.3) / 2.9;
  else if (ph < 3.5) { const q = ss(3.2, 3.5, ph); tilt = q; fill = 1 - 0.7 * q; pour = q; }
  else if (ph < 3.8) { tilt = 1; fill = 0.3 * (1 - (ph - 3.5) / 0.3); pour = 1 - 0.4 * (ph - 3.5) / 0.3; }
  else { tilt = 1 - ss(3.8, 3.98, ph); fill = 0; pour = 0.3 * (1 - (ph - 3.8) / 0.18); }
  return { tilt, fill, pour: Math.max(0, pour), ph };
}
const SHX = 905, SHS = 0.8;
// mouth of the tube in world coords for a given tilt (pivot (7,-110) in the local frame, mouth (-158,0) rotated by 0.52-1.02*tilt)
function mouthPos(tilt) { const a = 0.52 - 1.02 * tilt, lx = -158 * Math.cos(a), ly = -158 * Math.sin(a); return [SHX + (7 + lx) * SHS, FL + (-110 + ly) * SHS]; }
// ---------- bamboo poles (gutter) ----------
const POLES = [ // len, stack position (centre), place window [t0,t1], end x when laid as gutter, toss window, toss target
  { id: 'A', len: 70, st: [330, 1345, 0.08], pick: 43.4, lay: [44.95, 46.0], endx: 745, toss: [46.0, 46.6, 70, 1395] },
  { id: 'B', len: 205, st: [290, 1365, 0.05], pick: 47.6, lay: [49.0, 50.15], endx: 605, toss: [50.15, 50.8, 60, 1415] },
  { id: 'C', len: 110, st: [350, 1380, 0.03], pick: 52.0, lay: [53.0, 86.6], endx: 703, toss: null },
];
const GUT0 = [812, 1226];
function drawPole(c, x1, y1, x2, y2, w = 22, col = '#9AAA5A') {
  const L = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1); c.save(); c.translate(x1, y1); c.rotate(a);
  c.fillStyle = 'rgba(46,34,22,0.28)'; c.beginPath(); c.ellipse(L / 2, w * 0.6, L / 2 + 6, w * 0.3, 0, 0, PI2); c.fill();
  SH(c, (c) => RR(c, 0, -w / 2, L, w, w / 2), { f: col, sh: 'rgba(30,60,20,0.45)', hl: 'rgba(240,248,190,0.45)', d: [0, w * 0.3], line: 3.2 });
  for (let x = 28; x < L - 14; x += 70) { c.fillStyle = '#566C32'; c.fillRect(x, -w / 2 - 1, 7, w + 2); c.strokeStyle = INKC; c.lineWidth = 2; c.strokeRect(x, -w / 2 - 1, 7, w + 2); }
  c.restore();
}
