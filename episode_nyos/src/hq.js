// High-detail building blocks for the taiga (HQ pass): value noise, painted colour + normal-map textures computed per pixel
// (bark, hewn log, end grain, forest floor, stone, planks), and merged geometries with vertex colours (spruce and pine
// crowns, dead crowns, root plates, snapped stubs, grass tufts, fireweed, rocks, bushes, twigs). Everything is seeded,
// so every run builds the same world; nothing here changes per frame.
import * as THREE from './three.module.js';
import { mulberry } from './toon.js';

// ---------------- noise ----------------
const P = new Uint8Array(512); { const r = mulberry(1908); const p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) P[i] = p[i & 255]; }
const fade = (t) => t * t * (3 - 2 * t);
export function vnoise(x, y, z = 0) {   // value noise in [0,1]
  const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z); const fx = fade(x - X), fy = fade(y - Y), fz = fade(z - Z);
  const h = (i, j, k) => P[(P[(P[(X + i) & 255] + Y + j) & 255] + Z + k) & 255] / 255;
  const l = (a, b, t) => a + (b - a) * t;
  return l(l(l(h(0, 0, 0), h(1, 0, 0), fx), l(h(0, 1, 0), h(1, 1, 0), fx), fy), l(l(h(0, 0, 1), h(1, 0, 1), fx), l(h(0, 1, 1), h(1, 1, 1), fx), fy), fz);
}
export function fbm(x, y, z = 0, o = 4) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f, z * f + i * 17.3); n += a; a *= 0.5; f *= 2.03; } return s / n; }
// tileable 2D fbm (period px in x, py in y, in noise cells)
function tfbm(x, y, px, py, o = 4, seed = 0) { let s = 0, a = 0.5, n = 0;
  for (let i = 0; i < o; i++) { const k = 1 << i, X = x * k, Y = y * k, PX = px * k, PY = py * k;
    const v = (xx, yy) => vnoise(((xx % PX) + PX) % PX + seed, ((yy % PY) + PY) % PY + seed * 1.7, i * 7.1);
    const x0 = Math.floor(X), y0 = Math.floor(Y), fx = fade(X - x0), fy = fade(Y - y0);
    const l = (p, q, t) => p + (q - p) * t; s += a * l(l(v(x0, y0), v(x0 + 1, y0), fx), l(v(x0, y0 + 1), v(x0 + 1, y0 + 1), fx), fy); n += a; a *= 0.5; }
  return s / n; }

// ---------------- textures ----------------
function canvasTex(c, srgb, rep) { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (rep) t.repeat.set(...rep); return t; }
// paint(x, y) → [r, g, b, height] over a w×h tile; returns { map, normalMap }
export function painted(w, h, paint, strength = 2, rep = null) {
  const cc = document.createElement('canvas'); cc.width = w; cc.height = h; const g = cc.getContext('2d'); const im = g.createImageData(w, h); const H = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, gg, b, hh] = paint(x, y); const i = (y * w + x) * 4; im.data[i] = r; im.data[i + 1] = gg; im.data[i + 2] = b; im.data[i + 3] = 255; H[y * w + x] = hh; }
  g.putImageData(im, 0, 0);
  return { map: canvasTex(cc, true, rep), normalMap: normalTex(H, w, h, strength, rep), H };
}
export function normalTex(H, w, h, strength = 2, rep = null) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); const im = g.createImageData(w, h);
  const at = (x, y) => H[((y + h) % h) * w + ((x + w) % w)];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dx = (at(x + 1, y) - at(x - 1, y)) * strength, dy = (at(x, y + 1) - at(x, y - 1)) * strength; const l = Math.hypot(dx, dy, 1); const i = (y * w + x) * 4;
    im.data[i] = (-dx / l * 0.5 + 0.5) * 255; im.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; im.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0); return canvasTex(c, false, rep);
}
// canvas drawing (fast primitives) + its luminance as the height for the normal map
export function drawn(w, h, draw, strength = 2, rep = null, heightDraw = null) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  let hc = c; if (heightDraw) { hc = document.createElement('canvas'); hc.width = w; hc.height = h; heightDraw(hc.getContext('2d'), w, h); }
  const d = hc.getContext('2d').getImageData(0, 0, w, h).data; const H = new Float32Array(w * h); for (let i = 0; i < w * h; i++) H[i] = (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11) / 255;
  return { map: canvasTex(c, true, rep), normalMap: normalTex(H, w, h, strength, rep) };
}
const mixc = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const cl = (x) => Math.max(0, Math.min(255, x));

// bark: vertical furrows between scaly plates (tiles in both directions; v runs along the trunk)
export const barkTex = () => painted(256, 512, (x, y) => {
  const u = x / 256, v = y / 512;
  const ridge = 1 - Math.abs(tfbm(u * 8, v * 3, 8, 3, 4, 3) * 2 - 1);            // long furrows
  const plates = tfbm(u * 12, v * 18, 12, 18, 3, 9);                               // scales across them
  const hgt = Math.pow(ridge, 1.6) * 0.75 + plates * 0.25; const lich = tfbm(u * 6, v * 6, 6, 6, 3, 21);
  let c = mixc([62, 50, 40], [168, 146, 120], hgt); if (lich > 0.62) c = mixc(c, [150, 160, 120], Math.min(1, (lich - 0.62) * 4) * 0.6);
  const n = (vnoise(x * 0.9, y * 0.9) - 0.5) * 18; return [cl(c[0] + n), cl(c[1] + n), cl(c[2] + n), hgt]; }, 3.5, [1, 6]);
// hewn, weathered log surface: long fibres along v, a few drying checks, knots
export const logTex = () => painted(256, 512, (x, y) => {
  const u = x / 256, v = y / 512;
  const fib = tfbm(u * 40, v * 2, 40, 2, 3, 5); const grain = tfbm(u * 6, v * 1, 6, 1, 4, 11);
  let hgt = 0.55 + (fib - 0.5) * 0.5 + (grain - 0.5) * 0.3;
  const ck = Math.abs(Math.sin(u * 6.283 * 3 + tfbm(u * 2, v * 4, 2, 4, 2, 2) * 6)); if (ck > 0.985) hgt -= (ck - 0.985) * 30;   // checks
  for (const [ku, kv] of [[0.2, 0.3], [0.7, 0.75], [0.45, 0.1]]) { const du = Math.min(Math.abs(u - ku), 1 - Math.abs(u - ku)) * 3, dv = Math.min(Math.abs(v - kv), 1 - Math.abs(v - kv)) * 6; const d = Math.hypot(du, dv); if (d < 0.08) hgt -= (0.08 - d) * 4; }
  let c = mixc([92, 66, 44], [176, 136, 96], Math.max(0, Math.min(1, hgt))); const gr = tfbm(u * 3, v * 1, 3, 1, 3, 31); c = mixc(c, [128, 120, 110], Math.max(0, gr - 0.5) * 1.2);   // silvering
  return [cl(c[0]), cl(c[1]), cl(c[2]), hgt]; }, 2.5, [1, 1]);
// sawn/axed log ends: growth rings + radial cracks
export const endTex = () => painted(256, 256, (x, y) => {
  const dx = x / 128 - 1, dy = y / 128 - 1; const r = Math.hypot(dx, dy), a = Math.atan2(dy, dx); const rr = r * 14 + vnoise(a * 3, r * 4) * 1.5;
  const ring = 0.5 + 0.5 * Math.sin(rr * 6.283); let hgt = 0.6 + ring * 0.15; const crack = Math.abs(Math.sin(a * 2.5 + 1.3)); if (crack > 0.992 && r > 0.15) hgt -= 0.5;
  let c = mixc([176, 132, 86], [210, 170, 118], ring); c = mixc(c, [120, 84, 56], Math.max(0, r - 0.85) * 6); if (hgt < 0.3) c = [60, 40, 26];
  return [cl(c[0]), cl(c[1]), cl(c[2]), hgt]; }, 2, [1, 1]);
// forest floor: moss cushions, pale reindeer lichen, needle litter, dark peat between
export const floorTex = (size = 1024) => painted(size, size, (x, y) => {
  const u = x / size, v = y / size;
  const moss = tfbm(u * 10, v * 10, 10, 10, 4, 41), lich = tfbm(u * 16, v * 16, 16, 16, 3, 43), lit = tfbm(u * 64, v * 64, 64, 64, 2, 47), peat = tfbm(u * 5, v * 5, 5, 5, 3, 49);
  let c = [70, 62, 40], hgt = 0.3 + moss * 0.4;
  c = mixc(c, [78, 102, 44], Math.min(1, Math.max(0, (moss - 0.42) * 4)));                // moss
  c = mixc(c, [118, 126, 64], Math.min(1, Math.max(0, (moss - 0.62) * 5)) * 0.7);        // sunlit moss tips
  if (lich > 0.6) { const k = Math.min(1, (lich - 0.6) * 6); c = mixc(c, [176, 178, 150], k * 0.5); hgt += k * 0.2; }   // reindeer lichen
  c = mixc(c, [120, 84, 50], Math.max(0, lit - 0.62) * 2.2);                              // needle litter
  c = mixc(c, [46, 40, 28], Math.max(0, 0.35 - peat) * 2);                               // peat hollows
  const n = (vnoise(x * 1.3, y * 1.3) - 0.5) * 22; hgt += (vnoise(x * 0.7, y * 0.7) - 0.5) * 0.15;
  return [cl(c[0] + n), cl(c[1] + n), cl(c[2] + n * 0.6), hgt]; }, 3, [40, 40]);
// rough fieldstone with mortar (chimney)
export const stoneTex = () => { const r = mulberry(77); const cells = []; for (let i = 0; i < 40; i++) cells.push([r(), r(), 0.75 + r() * 0.5]);
  return painted(256, 256, (x, y) => { const u = x / 256, v = y / 256; let d1 = 9, d2 = 9, k = 0;
    for (const [cx, cy, s] of cells) for (const ox of [-1, 0, 1]) for (const oy of [-1, 0, 1]) { const d = Math.hypot((u - cx - ox) * 1.6, v - cy - oy); if (d < d1) { d2 = d1; d1 = d; k = s; } else if (d < d2) d2 = d; }
    const edge = d2 - d1; const hgt = Math.min(1, edge * 14) * (0.7 + vnoise(x * 0.2, y * 0.2) * 0.3); const n = (vnoise(x * 1.1, y * 1.1) - 0.5) * 30;
    const c = edge < 0.03 ? [150, 140, 125] : [120 * k + n, 116 * k + n, 108 * k + n]; return [cl(c[0]), cl(c[1]), cl(c[2]), hgt]; }, 3, [1, 1]); };
// weathered planks (n boards across u, grain along v)
export const plankTex = (n = 5, base = [150, 112, 76]) => painted(256, 512, (x, y) => { const u = x / 256, v = y / 512; const b = Math.floor(u * n), fu = u * n - b;
  const grain = tfbm(u * 30, v * 3, 30, 3, 3, 13 + b); const tone = 0.85 + vnoise(b * 3.3, 0.5) * 0.3; let hgt = 0.6 + (grain - 0.5) * 0.4;
  if (fu < 0.04 || fu > 0.96) hgt = 0.05; const nail = [0.08, 0.92].some((nv) => Math.hypot((fu - 0.5) * 0.3, v - nv) < 0.008);
  let c = base.map((q) => q * tone * (0.8 + grain * 0.4)); if (hgt < 0.1) c = [40, 28, 20]; if (nail) c = [50, 46, 44];
  return [cl(c[0]), cl(c[1]), cl(c[2]), hgt]; }, 2.5, [1, 1]);

// ---------------- geometry ----------------
// merge non-indexed geometries; each part may carry a colour (or per-vertex fn) → 'color' attribute; groups by material index
export function merge(parts) {   // parts: [{ g, col?: [r,g,b] | (pos, nrm, i) => [r,g,b], mat?: 0 }]
  const byMat = new Map(); for (const p of parts) { const k = p.mat || 0; if (!byMat.has(k)) byMat.set(k, []); byMat.get(k).push(p); }
  const pos = [], nrm = [], uv = [], col = [], groups = []; let start = 0;
  for (const [mi, list] of [...byMat.entries()].sort((a, b) => a[0] - b[0])) { let cnt = 0;
    for (const p of list) { const g = p.g.index ? p.g.toNonIndexed() : p.g; if (!g.attributes.normal) g.computeVertexNormals(); const A = g.attributes.position, Nn = g.attributes.normal, U = g.attributes.uv;
      for (let i = 0; i < A.count; i++) { const v = [A.getX(i), A.getY(i), A.getZ(i)], n = [Nn.getX(i), Nn.getY(i), Nn.getZ(i)]; pos.push(...v); nrm.push(...n); uv.push(U ? U.getX(i) : 0, U ? U.getY(i) : 0);
        const c = typeof p.col === 'function' ? p.col(v, n, i) : (p.col || [1, 1, 1]); col.push(...c); }
      cnt += A.count; }
    groups.push([start, cnt, mi]); start += cnt; }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  m.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); m.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  if (groups.length > 1) groups.forEach(([s, c, mi]) => m.addGroup(s, c, mi)); return m;
}
const displace = (g, amp, freq, seed = 0, sx = 1, sy = 1, sz = 1) => { const A = g.attributes.position;
  for (let i = 0; i < A.count; i++) { const x = A.getX(i), y = A.getY(i), z = A.getZ(i); const k = 1 + (fbm(x * freq + seed, y * freq, z * freq, 3) - 0.5) * 2 * amp; A.setXYZ(i, x * k * sx, y * k * sy, z * k * sz); }
  g.computeVertexNormals(); return g; };

// spruce crown in unit crown space (y 0..1, radius ≤ 1): dark core + 14 whorls of drooping flattened boughs + a leader
export function spruceCrown(seed = 1) { const r = mulberry(seed); const parts = [];
  const core = new THREE.ConeGeometry(0.34, 1.0, 9, 4); core.translate(0, 0.5, 0); parts.push({ g: core, col: [0.42, 0.45, 0.42] });
  const nW = 14; for (let i = 0; i < nW; i++) { const y = 0.03 + (i / nW) * 0.9, R = Math.pow(1 - y, 0.95) * (0.82 + r() * 0.3) + 0.05, nb = 6 + Math.floor(r() * 3);
    for (let j = 0; j < nb; j++) { const a = (j / nb) * Math.PI * 2 + i * 0.77 + r() * 0.5, L = R * (0.8 + r() * 0.3), w = 0.06 + 0.16 * (1 - y);
      const g = new THREE.ConeGeometry(w, L, 6, 3); g.rotateZ(-Math.PI / 2); g.scale(1, 0.42, 1);
      { const A = g.attributes.position; for (let k = 0; k < A.count; k++) { const x = A.getX(k) + L / 2; A.setX(k, x); A.setY(k, A.getY(k) - Math.pow(x / L, 2) * L * (0.22 + 0.1 * r())); A.setZ(k, A.getZ(k) * (1 + 0.6 * x / L)); } g.computeVertexNormals(); }
      g.rotateY(a); g.translate(0, y, 0); const tint = 0.85 + r() * 0.3;
      parts.push({ g, col: (v) => { const t = Math.min(1, Math.hypot(v[0], v[2]) / Math.max(0.05, L)); return [(0.5 + 0.7 * t) * tint, (0.55 + 0.6 * t) * tint, (0.5 + 0.45 * t) * tint]; } }); } }
  const top = new THREE.ConeGeometry(0.04, 0.14, 5); top.translate(0, 0.98, 0); parts.push({ g: top, col: [1.1, 1.1, 0.95] });
  return merge(parts); }
// Scots pine crown: bare upper trunk, a few limbs ending in lumpy needle clumps (y 0.45..1)
export function pineCrown(seed = 2) { const r = mulberry(seed); const parts = [];
  const n = 9; for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, y0 = 0.45 + (i / n) * 0.45, d = (0.25 + r() * 0.45) * (1 - (y0 - 0.45) * 0.9), y1 = y0 + 0.06 + r() * 0.1;
    const x1 = Math.cos(a) * d, z1 = Math.sin(a) * d; const L = Math.hypot(d, y1 - y0);
    const lg = new THREE.CylinderGeometry(0.012, 0.025, L, 5); lg.translate(0, L / 2, 0); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x1, y1 - y0, z1).normalize()); lg.applyQuaternion(q); lg.translate(0, y0, 0);
    parts.push({ g: lg, col: [0.75, 0.5, 0.35] });
    const s = 0.16 + r() * 0.14; const cl_ = displace(new THREE.IcosahedronGeometry(1, 2), 0.35, 2.2, i * 3.1); cl_.scale(s * 1.2, s * 0.6, s * 1.2); cl_.translate(x1, y1, z1);
    parts.push({ g: cl_, col: (v) => { const t = Math.max(0, Math.min(1, (v[1] - y1) / s + 0.5)); return [0.55 + 0.6 * t, 0.6 + 0.55 * t, 0.5 + 0.35 * t]; } }); }
  const top = displace(new THREE.IcosahedronGeometry(1, 2), 0.3, 2, 9.9); top.scale(0.26, 0.17, 0.26); top.translate(0, 0.95, 0); parts.push({ g: top, col: [0.95, 1.0, 0.85] });
  return merge(parts); }
// dead crown: bare branch stubs pointing up-out, a few rusty needle tufts (fallen / stripped trees)
export function deadCrown(seed = 3, tufts = true) { const r = mulberry(seed); const parts = [];
  for (let i = 0; i < 34; i++) { const y = 0.02 + r() * 0.93, a = r() * Math.PI * 2, L = (0.12 + 0.55 * Math.pow(1 - y, 1.2)) * (0.4 + r() * 0.7), up = 0.15 + r() * 0.6;
    const d = new THREE.Vector3(Math.cos(a), up, Math.sin(a)).normalize(); const g = new THREE.CylinderGeometry(0.004, 0.018, L, 4); g.translate(0, L / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d)); g.translate(0, y, 0);
    parts.push({ g, col: [0.85, 0.8, 0.75] });
    if (tufts && r() < 0.3) { const t = displace(new THREE.IcosahedronGeometry(1, 1), 0.4, 3, i); const s = 0.05 + r() * 0.07; t.scale(s, s * 0.6, s); const e = d.clone().multiplyScalar(L * 0.85); t.translate(e.x, y + e.y, e.z); parts.push({ g: t, col: [0.75, 0.42, 0.2] }); } }
  return merge(parts); }
// uprooted root plate: a lumpy soil disc in the trunk's local xz plane with root ends sticking out
export function rootPlate(seed = 4) { const r = mulberry(seed); const parts = [];
  const g = new THREE.CylinderGeometry(1, 0.8, 0.45, 18, 2); displace(g, 0.18, 2.2, seed); g.translate(0, -0.2, 0); parts.push({ g, col: (v) => { const k = fbm(v[0] * 4, v[1] * 4, v[2] * 4, 2); return [0.24 + k * 0.14, 0.18 + k * 0.1, 0.12 + k * 0.06]; } });
  for (let i = 0; i < 16; i++) { const a = r() * Math.PI * 2, L = 0.3 + r() * 0.6; const d = new THREE.Vector3(Math.cos(a), (r() - 0.6) * 0.6, Math.sin(a)).normalize(); const c = new THREE.CylinderGeometry(0.008, 0.04, L, 4); c.translate(0, L / 2, 0);
    c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d)); c.translate(d.x * 0.75, -0.15 + d.y * 0.2, d.z * 0.75); parts.push({ g: c, col: [0.55, 0.42, 0.3] }); }
  return merge(parts); }
// snapped stub: trunk piece with a splintered top (unit height)
export function stubGeo() { const g = new THREE.CylinderGeometry(0.16, 0.22, 1, 12, 4, true); const A = g.attributes.position;
  for (let i = 0; i < A.count; i++) if (A.getY(i) > 0.49) { const a = Math.atan2(A.getZ(i), A.getX(i)); A.setY(i, 0.5 + 0.25 * Math.abs(Math.sin(a * 3.5)) + 0.12 * Math.abs(Math.sin(a * 7.1 + 1))); }
  g.translate(0, 0.5, 0); g.computeVertexNormals(); return g; }
// trunk: slight taper and root flare, 12 sides (bark mapped u around, v along)
export function trunkGeo() { const g = new THREE.CylinderGeometry(0.09, 0.2, 1, 12, 10, false); const A = g.attributes.position;
  for (let i = 0; i < A.count; i++) { const y = A.getY(i) + 0.5; const fl = 1 + 0.9 * Math.pow(Math.max(0, 0.06 - y) / 0.06, 2) + 0.25 * Math.max(0, 0.03 - y) / 0.03 * Math.abs(Math.sin(Math.atan2(A.getZ(i), A.getX(i)) * 3));
    A.setX(i, A.getX(i) * fl + Math.sin(y * 3) * 0.015); A.setZ(i, A.getZ(i) * fl); }
  g.translate(0, 0.5, 0); g.computeVertexNormals(); return g; }
// grass tuft: ~11 curved tapering blades, base dark → tip pale
export function tuftGeo(seed = 5, n = 11, sedge = false) { const r = mulberry(seed); const pos = [], col = [];
  for (let b = 0; b < n; b++) { const a = r() * Math.PI * 2, lean = 0.2 + r() * (sedge ? 0.5 : 0.8), h = (sedge ? 0.5 : 0.28) + r() * 0.25, w = (sedge ? 0.018 : 0.012) + r() * 0.008; const ox = Math.cos(a) * r() * 0.06, oz = Math.sin(a) * r() * 0.06;
    const dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx; const seg = 4; const pts = [];
    for (let s = 0; s <= seg; s++) { const t = s / seg; const bend = lean * t * t * h; pts.push([ox + dx * bend, t * h * (1 - 0.25 * lean * t), oz + dz * bend, w * (1 - t)]); }
    for (let s = 0; s < seg; s++) { const [x0, y0, z0, w0] = pts[s], [x1, y1, z1, w1] = pts[s + 1]; const c0 = s / seg, c1 = (s + 1) / seg;
      const q = [[x0 - px * w0, y0, z0 - pz * w0, c0], [x0 + px * w0, y0, z0 + pz * w0, c0], [x1 + px * w1, y1, z1 + pz * w1, c1], [x1 - px * w1, y1, z1 - pz * w1, c1]];
      for (const k of [0, 1, 2, 0, 2, 3]) { pos.push(q[k][0], q[k][1], q[k][2]); const t = q[k][3]; col.push(0.3 + 0.7 * t, 0.38 + 0.6 * t, 0.18 + 0.35 * t); } } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  const N = g.attributes.normal; for (let i = 0; i < N.count; i++) { N.setXYZ(i, N.getX(i) * 0.4, 0.9, N.getZ(i) * 0.4); }   // grass lit mostly from above (no black backs)
  for (let i = 0; i < N.count; i++) { const l = Math.hypot(N.getX(i), N.getY(i), N.getZ(i)); N.setXYZ(i, N.getX(i) / l, N.getY(i) / l, N.getZ(i) / l); }
  return g; }
// fireweed: stem, narrow leaves, a magenta flower spike
export function fireweedGeo(seed = 6) { const r = mulberry(seed); const parts = [];
  const st = new THREE.CylinderGeometry(0.006, 0.01, 1, 4); st.translate(0, 0.5, 0); parts.push({ g: st, col: [0.4, 0.35, 0.25] });
  for (let i = 0; i < 9; i++) { const y = 0.12 + i * 0.06, a = i * 2.4; const lf = new THREE.PlaneGeometry(0.16, 0.025); lf.translate(0.08, 0, 0); lf.rotateZ(0.35); lf.rotateY(a); lf.translate(0, y, 0); parts.push({ g: lf, col: [0.35, 0.5, 0.22] }); }
  for (let i = 0; i < 22; i++) { const y = 0.7 + (i / 22) * 0.3, a = i * 2.4, d = 0.035 * (1 - (i / 22) * 0.6); const f = new THREE.IcosahedronGeometry(0.022 * (1 - i / 40), 0); f.translate(Math.cos(a) * d, y, Math.sin(a) * d); const k = i / 22; parts.push({ g: f, col: [0.9 - 0.2 * k, 0.25 + 0.1 * k, 0.55 + 0.1 * k] }); }
  return merge(parts); }
// lumpy lichen-spotted boulder (unit radius, sits half-buried)
export function rockGeo(seed = 7) { const g = displace(new THREE.IcosahedronGeometry(1, 3), 0.28, 1.6, seed, 1, 0.62, 1); return merge([{ g, col: (v) => { const l = fbm(v[0] * 5 + seed, v[1] * 5, v[2] * 5, 3); const base = 0.55 + (fbm(v[0] * 2, v[1] * 2, v[2] * 2, 2) - 0.5) * 0.3;
  let c = [base, base * 0.97, base * 0.93]; if (l > 0.58) c = [0.72, 0.74, 0.5]; else if (l < 0.33) c = [0.4, 0.46, 0.28]; if (v[1] < -0.2) c = c.map((q) => q * 0.6); return c; } }]); }
// bush: a few lumpy leaf masses
export function bushGeo(seed = 8) { const r = mulberry(seed); const parts = []; for (let i = 0; i < 11; i++) { const s = 0.22 + r() * 0.3; const g = displace(new THREE.IcosahedronGeometry(1, 3), 0.45, 3.5, i + seed); g.scale(s, s * 0.7, s); g.translate((r() - 0.5) * 0.8, s * 0.45, (r() - 0.5) * 0.8);
  parts.push({ g, col: (v) => { const t = Math.max(0, Math.min(1, v[1] / 0.8)); const k = fbm(v[0] * 6, v[1] * 6, v[2] * 6, 2); return [0.5 + 0.7 * t + (k - 0.5) * 0.6, 0.55 + 0.65 * t + (k - 0.5) * 0.6, 0.45 + 0.4 * t + (k - 0.5) * 0.4]; } }); }
  return merge(parts); }
// a fallen branch with two side twigs (unit length along +x)
export function twigGeo() { const parts = []; const m = new THREE.CylinderGeometry(0.012, 0.03, 1, 5); m.rotateZ(-Math.PI / 2); m.translate(0.5, 0.02, 0); parts.push({ g: m, col: [0.6, 0.5, 0.4] });
  for (const [x, a] of [[0.35, 0.6], [0.65, -0.5]]) { const s = new THREE.CylinderGeometry(0.005, 0.012, 0.3, 4); s.rotateZ(-Math.PI / 2); s.translate(0.15, 0, 0); s.rotateY(a); s.translate(x, 0.02, 0); parts.push({ g: s, col: [0.55, 0.45, 0.35] }); }
  return merge(parts); }
// a cylinder split into bark side (mat 0) and end caps (mat 1) parts for merge()
export function splitCyl(g, col) { const sideCount = g.groups[0].count; const ng = g.toNonIndexed(); const cnt = ng.attributes.position.count; const sg = new THREE.BufferGeometry(), cg = new THREE.BufferGeometry();
  for (const [dst, s0, c0] of [[sg, 0, sideCount], [cg, sideCount, cnt - sideCount]]) for (const k of ['position', 'normal', 'uv']) { const A = ng.attributes[k]; dst.setAttribute(k, new THREE.Float32BufferAttribute(A.array.slice(s0 * A.itemSize, (s0 + c0) * A.itemSize), A.itemSize)); }
  return [{ g: sg, col, mat: 0 }, { g: cg, col, mat: 1 }]; }
// Earth seen from space: continents from 3D fbm on the sphere (seamless), biomes by latitude + height (forest, steppe,
// desert, tundra, ice), shallow-shelf turquoise, deep ocean; a normal map from elevation; a separate cloud layer (RGBA).
export function earthTex(w = 2048, h = 1024) {
  const E = new Float32Array(w * h); const dir = (x, y) => { const lon = (x / w) * Math.PI * 2, lat = (0.5 - y / h) * Math.PI; return [Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon), lat]; };
  const surf = painted(w, h, (x, y) => { const [dx, dy, dz, lat] = dir(x, y); const e = fbm(dx * 1.6 + 5, dy * 1.6, dz * 1.6, 6) + (fbm(dx * 6, dy * 6, dz * 6 + 3, 3) - 0.5) * 0.12 - 0.53; E[y * w + x] = e; const al = Math.abs(lat) / (Math.PI / 2);
    let c; if (e < 0) { const d = Math.min(1, -e * 9); c = mixc([40, 130, 160], [12, 38, 96], Math.pow(d, 0.6)); }
    else { const m = fbm(dx * 4 + 11, dy * 4, dz * 4, 4); const hot = 1 - al; c = mixc([60, 104, 44], [96, 128, 60], m);
      if (hot > 0.55 && hot < 0.85 && m < 0.5) c = mixc(c, [196, 168, 112], Math.min(1, (0.5 - m) * 5));   // deserts
      if (al > 0.6) c = mixc(c, [120, 116, 96], Math.min(1, (al - 0.6) * 5)); if (e > 0.12) c = mixc(c, [130, 110, 90], Math.min(1, (e - 0.12) * 8)); }
    if (al > 0.86 + (fbm(dx * 3, dy * 3, dz * 3, 3) - 0.5) * 0.1) c = [236, 242, 250];
    return [cl(c[0]), cl(c[1]), cl(c[2]), Math.max(0, e) * 3]; }, 1.5);
  const cc = document.createElement('canvas'); cc.width = w / 2; cc.height = h / 2; const g = cc.getContext('2d'); const im = g.createImageData(w / 2, h / 2);
  for (let y = 0; y < h / 2; y++) for (let x = 0; x < w / 2; x++) { const [dx, dy, dz] = dir(x * 2, y * 2); const swirl = fbm(dx * 3 + fbm(dx * 2, dy * 2, dz * 2, 2) * 2, dy * 5, dz * 3, 5); const a = Math.max(0, Math.min(1, (swirl - 0.52) * 4)); const i = (y * w / 2 + x) * 4;
    im.data[i] = im.data[i + 1] = im.data[i + 2] = 250; im.data[i + 3] = a * 235; }
  g.putImageData(im, 0, 0); const clouds = new THREE.CanvasTexture(cc); clouds.colorSpace = THREE.SRGBColorSpace;
  surf.map.wrapT = surf.normalMap.wrapT = THREE.ClampToEdgeWrapping; return { map: surf.map, normalMap: surf.normalMap, clouds };
}
// a stony asteroid: lumpy, cratered, with a rock normal map
export function asteroidGeo(seed = 3) { const g = new THREE.IcosahedronGeometry(1, 5); const A = g.attributes.position; const r = mulberry(seed); const cr = []; for (let i = 0; i < 14; i++) { const v = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(); cr.push([v, 0.15 + r() * 0.3]); }
  for (let i = 0; i < A.count; i++) { const v = new THREE.Vector3(A.getX(i), A.getY(i), A.getZ(i)).normalize(); let k = 0.85 + fbm(v.x * 1.5 + seed, v.y * 1.5, v.z * 1.5, 5) * 0.4;
    for (const [c, s] of cr) { const d = v.distanceTo(c) / s; if (d < 1.3) k -= d < 1 ? 0.06 * (1 - d * d) : -0.03 * (1.3 - d) / 0.3; }
    v.multiplyScalar(k); A.setXYZ(i, v.x * 1.15, v.y * 0.85, v.z); }
  g.computeVertexNormals(); return g; }
