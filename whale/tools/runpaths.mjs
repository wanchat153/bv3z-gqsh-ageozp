// Search escape directions for the rain runners so no blubber piece lands on anyone (uses the same gait and bake as the film).
import { readFileSync } from 'node:fs';
import { makeWalker } from '../src/gait.js';
import { SPECT } from '../src/layout.js';
import { SHOTS } from '../src/shots.js';
const SIM = JSON.parse(readFileSync(new URL('../src/sim.json', import.meta.url)));
const t0 = SHOTS.at('rain').t0, t1 = SHOTS.at('rain').t1;
function pieceAt(b, ts) { const f = Math.min(b.p.length / 3 - 1, Math.max(0, Math.round((ts - SIM.t0) * SIM.fps))); return [b.p[f * 3], b.p[f * 3 + 1], b.p[f * 3 + 2]]; }
function mk(i, ang) { const [px, pz] = SPECT[i]; const d = [Math.cos(ang), Math.sin(ang)]; const go = t0 + 0.35 + (i % 4) * 0.12; const e1 = [px + d[0] * 3, pz + d[1] * 3], e2 = [px + d[0] * 9.5, pz + d[1] * 9.5];
  return makeWalker([[t0, px, pz, { face: Math.PI * 1.5 }], [go, px, pz], [go + 0.15, px, pz, { face: Math.atan2(d[0], d[1]) }], [go + 0.25, px, pz], [go + 1.1, e1[0], e1[1], { run: true, via: true }], [go + 2.9, e2[0], e2[1], { run: true }], [99, e2[0], e2[1]]], { run: true }); }
function cost(w) { let m = 1e9; for (let ts = t0; ts < t1 + 1; ts += 1 / 30) { const s = w.at(ts); for (const b of SIM.bodies) { const q = pieceAt(b, ts); if (q[1] > b.r + 1.8) continue; m = Math.min(m, Math.hypot(q[0] - s.p.x, q[2] - s.p.z) - b.r - 0.22); } } return m; }
const want = [[-1, -0.6], [-0.2, -1], [0.3, 1], [1, -0.5], [-0.9, 0.7], [0.4, 1], [1, 0.4], [-1, 0.6]].map(([x, z]) => Math.atan2(z, x) * 180 / Math.PI);
const out = [];
for (let i = 0; i < SPECT.length; i++) { let best = null; for (let a = 0; a < 360; a += 5) { const c = cost(mk(i, a * Math.PI / 180)); if (c < 0.8) continue; const dd = Math.abs(((a - want[i]) % 360 + 540) % 360 - 180); if (!best || dd < best.dd) best = { a, c, dd }; } out.push(best); console.log(i, best); }
console.log(JSON.stringify(out.map((o) => o.a)));
