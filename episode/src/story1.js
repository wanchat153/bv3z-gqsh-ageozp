'use strict';
// ================= "ฟองสบู่ห้ามแตก" — timeline part 1: environment + samurai (pure functions of t) =================
const DUR = 150, PI = Math.PI;
const SHOCKS = EV.filter((e) => e[2] >= 0.25 && !['stick', 'lift', 'flip', 'squash', 'liftoff'].includes(e[1]));
function shockAt(t) { let m = 0; for (const [te, , f] of SHOCKS) { if (t < te) continue; const d = t - te; if (d > 2.0) continue; const v = f * Math.exp(-d / 0.8) * ss(te, te + 0.05, t); if (v > m) m = v; } return m; }

// ---------- environment ----------
function envAt(t) {
  let ch = 0, pine = 0;
  for (const [a, b, d, s] of GUST) { ch += imp(t, a, 0.16 * s * d, 0.9, 9); pine += imp(t, a, 0.9 * s, 1.4, 4.5) * 0.5 + (t > a && t < b ? 0.35 * s : 0); }
  const rain = wnd(42.5, 51.0, t, 1.0) * (t < 51.0 ? 1 : 0) + 0;
  return { chime: ch, pine: pine + 0.25 * Math.sin(t * 0.7), rain, dusk: ss(100.5, 110, t), night: ss(112, 122, t), wet: ss(44, 50, t) * (1 - ss(52, 60, t)) };
}
const gustK = (t) => { let k = 0; for (const [a, b, d, s] of GUST) if (t >= a && t <= b) k = Math.max(k, Math.sin(PI * (t - a) / (b - a)) * s); return k; };

// ---------- samurai ----------
const SX = [[0, -260], [0.3, -260], [2.7, 330], [12.2, 330], [13.9, 330], [15.0, 330], [15.3, 300], [15.7, 372], [16.1, 290], [16.5, 340], [17.2, 380], [18.0, 420], [24.5, 420], [26.0, 400], [27.8, 400], [28.4, 430], [29.0, 400], [34.9, 400],
  [35.0, 400], [35.65, 690], [37.0, 690], [37.9, 650], [39.5, 650], [40.8, 440], [42.8, 440], [43.0, 440], [43.9, 100], [44.0, 100], [44.9, 390], [47.0, 390], [49.6, 450], [56.9, 450], [57.5, 700], [57.9, 700], [58.7, 430], [66.0, 430], [67.2, 330], [67.6, 330], [71.0, 330], [72.0, 330],
  [72.5, 300], [73.6, 400], [78.0, 400], [78.6, 330], [81.0, 330], [86.0, 300], [87.4, 300], [88.0, 330], [88.95, 480], [90.0, 500], [90.7, 500], [91.6, 640], [93.0, 660], [93.3, 660], [94.0, 770], [94.95, 830], [95.6, 830], [96.0, 830], [96.9, 420], [97.4, 420], [100.2, 440], [100.9, 420], [103.0, 400], [104.0, 460], [150, 460]];
const CROUCHW = [[3.0, 4.1], [17.3, 18.1], [90.0, 90.7], [96.9, 97.5]];
const SITW = [[104.3, 150]];
const PRONE = [[35.0, 37.1], [88.0, 89.1]];
const sitK = (t) => { let m = 0; for (const [a, b] of SITW) m = Math.max(m, ss(a, a + 0.6, t) * (1 - ss(b, b + 0.4, t))); return m; };
const crouchK = (t) => { let m = 0; for (const [a, b] of CROUCHW) m = Math.max(m, ss(a, a + 0.25, t) * (1 - ss(b - 0.3, b, t))); return m; };
const proneK = (t) => { let m = 0; for (const [a, b] of PRONE) m = Math.max(m, ss(a + 0.12, a + 0.3, t) * (1 - ss(b - 0.5, b, t))); return m; };
// airborne lift (umbrella): negative = up
const LIFTK = [[46.95, 0], [47.4, -50], [48.1, -330], [48.9, -430], [49.3, -300], [49.62, 0], [150, 0]];
// extra lean keys (rad, + = leaning toward screen-right where the bubble usually is)
const ROTK = [[0, 0], [4.2, 0], [4.9, -0.12], [5.1, -0.1], [5.7, 0.1], [6.5, 0.02], [11.9, 0.02], [12.2, 0.1], [13.0, 0.06], [15.0, 0], [137.2, 0], [138.0, 0.0], [138.9, -0.28], [139.9, -0.22], [141.5, -0.14], [150, -0.14]];
const SLEEPW = [[110.2, 150]];
function samAt(t) {
  const x0 = ks1(SX, t), sp = (ks1(SX, t + 0.05) - ks1(SX, t - 0.05)) / 0.1, mov = Math.abs(sp) > 8 && proneK(t) < 0.2 && t < 104;
  const sit = sitK(t), cr = crouchK(t), pr = proneK(t), sh = shockAt(t), Dd = SAMS * 1.58;
  let hop = 0; for (const e of SHOCKS) hop += arc(t, e[0], 12 + 26 * e[2], 0.34);
  // breathing + gentle idle sway so he is never frozen
  const idle = 0.012 * Math.sin(t * 2.3);
  let rot = ks1(ROTK, t) + idle - 0.0006 * clamp(sp, -500, 500) * (1 - pr);   // lean into the run
  for (const e of SHOCKS) rot += imp(t, e[0], -0.16 * e[2], 0.45, 14);
  for (const [a, b] of SLEEPW) { const nod = 0.06 * wnd(a, b, t, 0.6) * (1 + 0.3 * Math.sin(t * 1.7)); rot += nod; }
  // three nods (act 8)
  for (const n of [[109.9, 0.15], [110.8, 0.28], [111.6, 0.42]]) rot += wnd(n[0], n[0] + 0.85, t, 0.35) * n[1] * (t < 112.6 ? 1 : 0);
  rot += -1.45 * pr;
  // squash & stretch: crouch, inhale, exhale, landing, anticipation
  const inh = ss(4.2, 5.0, t) * (1 - ss(5.0, 5.15, t)) + ss(8.0 - 0.9, 8.0, t) * 0 + wnd(108.3, 109.3, t, 0.4) * 0.8;
  const blow = PUFF.reduce((m, p) => Math.max(m, imp(t, p[0], 1, 0.28) * Math.min(1, p[1])), 0);
  let sy = 1 - 0.18 * cr + 0.07 * inh - 0.05 * blow + 0.012 * Math.sin(t * 2.1) - 0.17 * sit;
  let sx = 1 + 0.12 * cr - 0.05 * inh + 0.04 * blow + 0.1 * sit;
  // landing squash after hops / lift
  for (const e of SHOCKS) { const d = t - e[0] - 0.34; if (d > 0 && d < 0.3) { const q = Math.sin(PI * d / 0.3) * 0.12 * e[2]; sy -= q; sx += q * 0.7; } }
  const lift = ks1(LIFTK, t) * 1; const landSq = t > 49.62 && t < 49.95 ? Math.sin(PI * (t - 49.62) / 0.33) * 0.2 : 0; sy -= landSq; sx += landSq * 0.7;
  let gy = FL;
  const D2 = Dd * sy;
  let x = x0 + D2 * Math.sin(rot) * (1 - pr), y = gy - D2 * Math.cos(rot) - hop + lift;
  if (pr > 0) { y = FL - 118 * pr - (1 - pr) * D2 - hop; x = x0; }
  const strain = 0.7 * wnd(129.2, 134.3, t, 0.4);
  x += strain * 2.2 * Math.sin(t * 34) * 0;
  const walk = mov ? x0 * 0.045 : (lift < -40 ? t * 9 : null);
  const ground = lift < -40 ? y + D2 * 1.0 : y + D2 * Math.cos(rot);
  const sweat = Math.min(1, 0.6 * sh);
  return { x, y, ground, S: SAMS, face: -1, sx, sy, rot, wob: 0.01, sw: { mode: 'none' }, band: { a: 1, wind: 0.25 + 0.5 * sh + (mov ? 0.6 : 0) + 0.6 * gustK(t) }, a: 1, walk, w: 0, sneeze: 0, kick: 0, cold: 0, sad: 0, sweat, strain, shock: sh, sit, x0, cr, pr, lift };
}
// mouth: open windows [a, b, peak]
const MOUTHW = [[1.5, 2.5, 0.0], [4.9, 6.5, 0.45], [6.5, 7.4, 0.9], [8.0, 9.0, 0.7], [10.3, 10.6, 0.45], [11.0, 11.3, 0.45], [11.7, 12.0, 0.45], [13.8, 14.3, 0.45], [16.3, 16.9, 0.8], [17.0, 17.3, 0.45], [21.3, 22.4, 1.0], [22.2, 23.0, 0.45], [23.0, 23.5, 0.45], [23.6, 24.1, 0.45],
  [29.8, 30.5, 0.7], [33.6, 34.4, 0.6], [35.5, 36.2, 1.0], [39.7, 40.1, 0.5], [40.3, 40.7, 0.5], [43.5, 44.2, 0.7], [47.0, 49.5, 1.0], [51.6, 52.4, 0.8], [65.4, 66.0, 1.0], [66.1, 66.5, 0.5], [69.5, 70.5, 0.8], [77.4, 78.5, 0.9], [80.6, 81.4, 0.9], [88.8, 89.6, 1.0], [93.2, 95.0, 1.0], [100.4, 102.2, 1.0], [108.3, 109.4, 1.0], [125.3, 126.0, 0.5], [134.7, 135.4, 0.45], [137.2, 137.9, 0.6]];
const mouthAt = (t) => { let m = 0; for (const [a, b, p] of MOUTHW) if (t > a && t < b) m = Math.max(m, p * Math.sin(PI * (t - a) / (b - a))); return m; };
const SEW = [
  [0, 2.7, { open: 0.85 }], [3.0, 4.2, { open: 0.7 }], [4.2, 5.0, { closed: 1, squeeze: 0.35 }], [5.0, 6.4, { open: 0.5, angry: 0.2 }], [6.5, 7.8, { happy: 0.85 }], [7.9, 8.9, { wide: 1 }], [13.9, 15.2, { wide: 0.9 }], [15.2, 16.1, { closed: 1, squeeze: 0.2 }], [16.2, 17.0, { wide: 1 }],
  [18.4, 21.3, { happy: 0.5, open: 0.8 }], [21.3, 22.5, { wide: 1 }], [27.6, 29.0, { wide: 0.95, open: 1 }], [29.0, 31.0, { open: 1, wide: 1 }], [33.4, 34.6, { open: 0.45, dizzy: 1 }], [35.0, 36.0, { wide: 1 }], [36.0, 37.2, { open: 0.5, squeeze: 0.4 }], [37.8, 39.5, { open: 0.55 }],
  [44.8, 46.9, { happy: 0.7 }], [47.0, 49.6, { wide: 1 }], [49.7, 51.5, { open: 0.5, angry: 0.3 }], [51.6, 52.6, { wide: 0.7 }], [65.4, 66.2, { wide: 1 }], [69.5, 71.9, { wide: 0.9 }], [77.4, 78.6, { wide: 1 }], [88.8, 89.6, { wide: 1 }], [100.4, 102.4, { closed: 1, squeeze: 0.8 }],
  [108.3, 109.3, { closed: 1, squeeze: 0.2 }], [109.9, 112.4, { open: 0.3 }], [112.4, 125.4, { closed: 1, squeeze: 0.3 }], [125.4, 126.2, { closed: 1, squeeze: 0.3 }], [137.4, 138.6, { open: 0.3 }], [138.9, 150, { closed: 1, squeeze: 0.3 }]];
