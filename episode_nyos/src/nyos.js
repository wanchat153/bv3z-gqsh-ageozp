// Lake Nyos (Cameroon) as a diorama, compressed scale (1 unit ≈ 1 m near the village, the crater shrunk to fit):
// the maar — a round lake (radius LR) in a crater ring (rim height ~50, a low notch where the natural dam is), grass
// highlands with rock on the steep walls, a valley running out of the notch down to the village of Lower Nyos (VC):
// ~24 mud-brick houses (thatch or corrugated-iron roofs, plank doors, shuttered windows that glow at night, each with
// a lamp light), a red laterite road, cooking fires, fences, clay pots, banana plants, maize, trees and palms.
// API: setLake('blue'|'night'|'red'), fountain(k, t) — the 1986 eruption column; mist(front, t, col) — the CO2 cloud
// pouring over the notch and down the valley (front 0..1 along the path); lights(fn) — per-house lamp on/off by
// the mist front; fires(on, t); raft(on, t) — the degassing raft with its jet (2001–today).
import * as THREE from './three.module.js';
import { mulberry } from './toon.js';
import { skyRig } from './sky.js';
import { fbm, vnoise, painted, merge, plankTex, tuftGeo, bushGeo, rockGeo, splitCyl } from './hq.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const STD = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, ...o });
const sst = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
const box = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
const cl = (x) => Math.max(0, Math.min(255, x)); const mixc = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
export const LR = 120, RIM = 165, VD = V(0.3, 0, 1).normalize(), VC = VD.clone().multiplyScalar(360);
const AV = Math.atan2(VD.z, VD.x), LAT = V(-VD.z, 0, VD.x);
function tex(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
export const glowT = (inner, outer) => tex(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, inner); gr.addColorStop(0.3, outer.replace('A', '0.75')); gr.addColorStop(1, outer.replace('A', '0')); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); });
// soft lumpy cloud puff (for the gas, smoke, spray)
export const puffT = (seed, rgb = '255,255,255') => tex(256, 256, (g) => { const r = mulberry(seed); for (let k = 0; k < 26; k++) { const x = 128 + (r() - 0.5) * 120, y = 128 + (r() - 0.5) * 90, s = 30 + r() * 60; const gr = g.createRadialGradient(x, y, 0, x, y, s); gr.addColorStop(0, `rgba(${rgb},0.22)`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); } });

// ---------------- terrain ----------------
const angd = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
function H0(x, z) { const r = Math.hypot(x, z), a = Math.atan2(z, x);
  const notch = Math.exp(-Math.pow(angd(a, AV) / 0.2, 2)); const rim = (50 + (fbm(Math.cos(a) * 2 + 3, Math.sin(a) * 2, 0, 3) - 0.5) * 30) * (1 - 0.72 * notch);
  const plain = -45 + (fbm(x * 0.004 + 7, z * 0.004, 0, 4) - 0.5) * 50 + Math.max(0, r - 700) * 0.12 * fbm(x * 0.003, z * 0.003 + 5, 0, 3);
  if (r < LR) return -70 * (1 - Math.pow(r / LR, 2)) - 1.5;
  let h; if (r < RIM) { const t = (r - LR) / (RIM - LR); h = -1.5 + (rim + 1.5) * Math.pow(Math.sin(t * Math.PI / 2), 0.8); }
  else { const t = Math.min(1, (r - RIM) / 150); h = rim + (plain - rim) * (t * t * (3 - 2 * t)); }
  const along = x * VD.x + z * VD.z, l = Math.abs(x * LAT.x + z * LAT.z);
  if (along > RIM * 0.75) { const w = 24 + 0.12 * (along - RIM); h -= 16 * Math.exp(-Math.pow(l / w, 2)) * sst(RIM * 0.75, RIM + 40, along); }
  return h; }
const HV = H0(VC.x, VC.z) - 2;
export function H(x, z) { const h = H0(x, z); const d = Math.hypot(x - VC.x, z - VC.z); return HV + (h - HV) * sst(55, 110, d); }

export function buildNyos(scene, { keep = [] } = {}) {   // keep: [[x, z, r]] — no plants within r of these points (camera positions)
  const T = { H }; const r = mulberry(86), r2 = mulberry(1986);
  const sky = skyRig(scene, { sunDir: V(-0.6, 0.35, -0.7), moonDir: V(0.5, 0.55, -0.6), shadow: 120, center: VC.clone() }); sky.setMode('day'); T.sky = sky;
  // ground: grass with red laterite showing, rock on the steep crater walls (vertex colours by slope)
  const GT = painted(1024, 1024, (x, y) => { const u = x / 1024, v = y / 1024; const f = (a, b, s) => fbm(u * a + s, v * b, s, 4);
    const g = f(12, 12, 1), soil = f(5, 5, 7), blade = vnoise(x * 0.9, y * 0.35);
    let c = mixc([84, 118, 48], [132, 150, 66], g); c = mixc(c, [150, 84, 50], Math.max(0, soil - 0.6) * 3); c = mixc(c, [60, 82, 36], Math.max(0, 0.4 - g) * 2);
    const n = (blade - 0.5) * 34; return [cl(c[0] + n), cl(c[1] + n), cl(c[2] + n * 0.5), g * 0.5 + blade * 0.3]; }, 3);
  for (const t of [GT.map, GT.normalMap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(160, 160); }
  const SEG = 600, SZ = 2400; const gg = new THREE.PlaneGeometry(SZ, SZ, SEG, SEG); const gp = gg.attributes.position; const gcol = new Float32Array(gp.count * 3);
  for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), z = -gp.getY(i); gp.setZ(i, H(x, z)); }
  gg.computeVertexNormals(); const gn = gg.attributes.normal;
  for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), z = -gp.getY(i); const slope = 1 - gn.getZ(i); const rr = Math.hypot(x, z); const m = fbm(x * 0.01, z * 0.01, 0, 3);
    const mm = fbm(x * 0.0035 + 2, z * 0.0035, 2, 3), dry = sst(0.5, 0.7, fbm(x * 0.012 + 9, z * 0.012, 4, 3)); let c = [0.85 + 0.35 * mm + 0.25 * dry, 0.92 + 0.15 * mm + 0.05 * dry, 0.8 + 0.1 * mm - 0.2 * dry]; const rock = sst(0.2, 0.42, slope) * (0.6 + 0.4 * fbm(x * 0.03, z * 0.03, 6, 3)); c = mixc(c, [0.5, 0.44, 0.42], rock);
    if (rr < LR + 6) c = mixc(c, [0.5, 0.42, 0.36], sst(LR + 6, LR - 2, rr)); c = c.map((q) => q * (0.85 + 0.3 * fbm(x * 0.05, z * 0.05, 1, 2)));
    gcol.set(c, i * 3); }
  gg.setAttribute('color', new THREE.BufferAttribute(gcol, 3));
  const ground = new THREE.Mesh(gg, STD(0xffffff, { map: GT.map, normalMap: GT.normalMap, vertexColors: true, roughness: 0.95 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  // ---------------- the lake ----------------
  const WN = painted(512, 512, (x, y) => { const u = x / 512, v = y / 512; const h = fbm(u * 16, v * 16, 0, 4) * 0.7 + fbm(u * 40 + 3, v * 40, 1, 2) * 0.3; return [128, 128, 255, h]; }, 1.6);
  WN.normalMap.repeat.set(24, 24);
  const water = new THREE.Mesh(new THREE.CircleGeometry(LR + 8, 160), STD(0x0e3450, { roughness: 0.05, metalness: 0.0, normalMap: WN.normalMap })); water.rotation.x = -Math.PI / 2; water.position.y = 0; water.receiveShadow = true; scene.add(water); T.water = water;
  const LAKE = { blue: [0x0e3450, 0.05], night: [0x0c1a2a, 0.05], red: [0x7a3a22, 0.35] };
  T.setLake = (m) => { water.material.color.setHex(LAKE[m][0]); water.material.roughness = LAKE[m][1]; };
  // shore: pebbles + reeds ring
  // ---------------- vegetation ----------------
  const mk = (geo, mat, list, shadow = true) => { const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length)); im.castShadow = shadow; im.receiveShadow = true; const m4 = new THREE.Matrix4();
    list.forEach((o, i) => { m4.compose(o.p, o.q || new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), r2() * 6.28), o.s); im.setMatrixAt(i, m4); if (o.c) im.setColorAt(i, o.c); }); scene.add(im); return im; };
  const nearV = (x, z) => Math.hypot(x - VC.x, z - VC.z);
  const HOUSES = []; const freeAt = (x, z, pad = 0) => !keep.some(([kx, kz, kr]) => Math.hypot(x - kx, z - kz) < kr) && !HOUSES.some((h) => Math.hypot(x - h.x, z - h.z) < h.rad + pad) && Math.abs((x * LAT.x + z * LAT.z) - Math.sin((x * VD.x + z * VD.z) * 0.02) * 6) > 3.8 + pad * 0.3;   // clear of the (wiggling) road
  // village houses first (vegetation avoids them)
  { const rr = mulberry(7); for (let i = 0; i < 60 && HOUSES.length < 24; i++) { const al = (rr() - 0.5) * 120, lt = (rr() < 0.5 ? -1 : 1) * (8 + rr() * 30); const x = VC.x + VD.x * al + LAT.x * lt, z = VC.z + VD.z * al + LAT.z * lt;
      const w = 5 + rr() * 2.5, d = 4 + rr() * 1.5; if (HOUSES.some((h) => Math.hypot(x - h.x, z - h.z) < (w + h.w) * 0.75 + 3)) continue;
      HOUSES.push({ x, z, w, d, h: 2.6 + rr() * 0.4, rot: Math.atan2(-lt * LAT.x, -lt * LAT.z) + (rr() - 0.5) * 0.5, iron: rr() < 0.55, rad: Math.max(w, d) * 0.8, al, lt }); } }
  T.houses = HOUSES;
  const grassM = STD(0xffffff, { vertexColors: true, side: THREE.DoubleSide, roughness: 0.8 });
  const tufts = []; const place = (n, gen, fn, pad = 3.5) => { for (let k = 0; k < n; k++) { const [x, z] = gen(); if (Math.hypot(x, z) < LR + 3 || !freeAt(x, z, pad)) continue; fn(x, z); } };   // swept yards: nothing within pad of a house
  const VIL = () => [VC.x + (r2() - 0.5) * 220, VC.z + (r2() - 0.5) * 220], RIMZ = () => { const a = AV + (r2() - 0.5) * 1.6, d = LR + 4 + r2() * 90; return [Math.cos(a) * d, Math.sin(a) * d]; }, WIDE = () => { const a = r2() * 6.28, d = LR + 5 + Math.sqrt(r2()) * 650; return [Math.cos(a) * d, Math.sin(a) * d]; };
  place(42000, VIL, (x, z) => { const s = 0.6 + r2() * 0.9; tufts.push({ p: V(x, H(x, z) - 0.03, z), s: V(s, s * (0.8 + r2() * 0.8), s), c: new THREE.Color().setHSL(0.17 + 0.08 * r2(), 0.4, 0.45 + 0.1 * r2()).multiplyScalar(1.15) }); });
  place(26000, RIMZ, (x, z) => { const s = 0.8 + r2() * 1.2; tufts.push({ p: V(x, H(x, z) - 0.03, z), s: V(s, s, s), c: new THREE.Color().setHSL(0.16 + 0.08 * r2(), 0.4, 0.45 + 0.1 * r2()).multiplyScalar(1.15) }); });
  place(16000, WIDE, (x, z) => { const s = 1 + r2() * 1.5; tufts.push({ p: V(x, H(x, z) - 0.03, z), s: V(s, s, s), c: new THREE.Color().setHSL(0.18 + 0.07 * r2(), 0.4, 0.42).multiplyScalar(1.1) }); });
  mk(tuftGeo(31, 13, true), grassM, tufts, false);
  // trees: broadleaf (canopy clumps), eucalyptus (tall pale trunk), raffia/oil palms in the valley
  const bark = STD(0x8a7a6a, { roughness: 0.95 }); const leafM = STD(0xffffff, { vertexColors: true, roughness: 0.85 });
  const trunkG = new THREE.CylinderGeometry(0.18, 0.32, 1, 8); trunkG.translate(0, 0.5, 0);
  const canopy = (() => { const g = bushGeo(41); g.scale(2.2, 1.8, 2.2); return g; })();
  const palmG = (() => { const parts = []; const tr = new THREE.CylinderGeometry(0.022, 0.03, 1, 8, 6); tr.translate(0, 0.5, 0); parts.push({ g: tr, col: [0.55, 0.45, 0.35] });
    for (let k = 0; k < 14; k++) { const a = k * 2.4, up = 0.4 + (k % 3) * 0.25; const pts = []; for (let s = 0; s <= 8; s++) { const t = s / 8; pts.push([t * 0.55, 1 + up * t * 0.25 - t * t * 0.35]); }
      const pos = []; for (let s = 0; s < 8; s++) { const [x0, y0] = pts[s], [x1, y1] = pts[s + 1]; const w0 = 0.12 * Math.sin((s / 8) * Math.PI) + 0.01, w1 = 0.12 * Math.sin(((s + 1) / 8) * Math.PI) + 0.01;
        for (const [a_, b_, c_] of [[[x0, y0, -w0], [x1, y1, -w1], [x1, y1, w1]], [[x0, y0, -w0], [x1, y1, w1], [x0, y0, w0]]]) pos.push(...a_, ...b_, ...c_); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); g.rotateY(a); parts.push({ g, col: [0.45 + 0.1 * (k % 2), 0.62, 0.3] }); }
    return merge(parts); })();
  const tl = [], cl_ = [], pl = [];
  place(2600, WIDE, (x, z) => { const al_ = x * VD.x + z * VD.z, la_ = Math.abs(x * LAT.x + z * LAT.z); if (al_ > RIM - 10 && al_ < 300 && la_ < 50) return; const h = 4 + r2() * 5; tl.push({ p: V(x, H(x, z) - 0.2, z), s: V(1, h, 1) }); cl_.push({ p: V(x, H(x, z) + h * 0.85, z), s: V(1 + r2(), 0.8 + r2() * 0.6, 1 + r2()).multiplyScalar(1 + h * 0.15), c: new THREE.Color().setHSL(0.22 + r2() * 0.08, 0.45, 0.24 + r2() * 0.08) }); });
  place(160, VIL, (x, z) => { const h = 5 + r2() * 6; tl.push({ p: V(x, H(x, z) - 0.2, z), s: V(1, h, 1) }); cl_.push({ p: V(x, H(x, z) + h * 0.85, z), s: V(1 + r2(), 0.8 + r2() * 0.6, 1 + r2()).multiplyScalar(1 + h * 0.12), c: new THREE.Color().setHSL(0.22 + r2() * 0.08, 0.45, 0.26 + r2() * 0.08) }); });
  place(140, VIL, (x, z) => { const h = 6 + r2() * 6; pl.push({ p: V(x, H(x, z) - 0.2, z), s: V(h * 0.9, h, h * 0.9), q: new THREE.Quaternion().setFromEuler(new THREE.Euler((r2() - 0.5) * 0.15, r2() * 6.28, (r2() - 0.5) * 0.15)) }); });
  mk(trunkG, bark, tl); mk(canopy, leafM, cl_); mk(palmG, leafM, pl);
  // bananas round the houses, maize plots, bushes, rocks on the rim
  const bananaG = (() => { const parts = []; const st = new THREE.CylinderGeometry(0.12, 0.16, 1.6, 8); st.translate(0, 0.8, 0); parts.push({ g: st, col: [0.55, 0.62, 0.35] });
    for (let k = 0; k < 7; k++) { const a = k * 2.2; const g = new THREE.PlaneGeometry(1.6, 0.42, 8, 2); const A = g.attributes.position; for (let i = 0; i < A.count; i++) { const x = A.getX(i) + 0.8; A.setX(i, x); A.setY(i, A.getY(i) - x * x * 0.18 + Math.abs(A.getY(i)) * 0.4); A.setZ(i, (vnoise(i, k) - 0.5) * 0.06); } g.rotateX(-Math.PI / 2 + 0.4); g.rotateY(a); g.translate(0, 1.5 + (k % 3) * 0.15, 0); g.computeVertexNormals();
      parts.push({ g, col: [0.5 + 0.1 * (k % 2), 0.78, 0.32] }); }
    return merge(parts); })();
  const bl = []; for (const h of HOUSES) for (let k = 0; k < 4; k++) { const a = r2() * 6.28, d = h.rad + 2 + r2() * 3; const x = h.x + Math.cos(a) * d, z = h.z + Math.sin(a) * d; if (!freeAt(x, z, 0.5)) continue; const s = 0.9 + r2() * 0.8; bl.push({ p: V(x, H(x, z), z), s: V(s, s, s) }); }
  mk(bananaG, STD(0xffffff, { vertexColors: true, side: THREE.DoubleSide, roughness: 0.7 }), bl);
  const maizeG = (() => { const parts = []; const st = new THREE.CylinderGeometry(0.02, 0.03, 2.1, 5); st.translate(0, 1.05, 0); parts.push({ g: st, col: [0.6, 0.66, 0.35] });
    for (let k = 0; k < 8; k++) { const g = new THREE.PlaneGeometry(0.7, 0.07, 6, 1); const A = g.attributes.position; for (let i = 0; i < A.count; i++) { const x = A.getX(i) + 0.35; A.setX(i, x); A.setY(i, A.getY(i) - x * x * 0.5); } g.rotateY(k * 2.4); g.translate(0, 0.4 + k * 0.2, 0); parts.push({ g, col: [0.55, 0.7, 0.3] }); }
    const ts = new THREE.ConeGeometry(0.06, 0.3, 5); ts.translate(0, 2.25, 0); parts.push({ g: ts, col: [0.85, 0.75, 0.45] }); return merge(parts); })();
  const ml = []; for (let f = 0; f < 6; f++) { const al = (r2() - 0.5) * 160, lt = (r2() < 0.5 ? -1 : 1) * (40 + r2() * 30); const cx = VC.x + VD.x * al + LAT.x * lt, cz = VC.z + VD.z * al + LAT.z * lt;
    for (let i = 0; i < 14; i++) for (let j = 0; j < 10; j++) { const x = cx + LAT.x * (i * 0.9 - 6) + VD.x * (j * 0.9 - 4) + (r2() - 0.5) * 0.3, z = cz + LAT.z * (i * 0.9 - 6) + VD.z * (j * 0.9 - 4) + (r2() - 0.5) * 0.3; if (!freeAt(x, z, 0)) continue; const s = 0.8 + r2() * 0.35; ml.push({ p: V(x, H(x, z), z), s: V(s, s, s) }); } }
  mk(maizeG, STD(0xffffff, { vertexColors: true, side: THREE.DoubleSide, roughness: 0.75 }), ml);
  const bu = []; place(4200, WIDE, (x, z) => { const s = 0.6 + r2() * 1.2; bu.push({ p: V(x, H(x, z) - 0.1, z), s: V(s, s * 0.8, s), c: new THREE.Color().setHSL(0.2 + r2() * 0.1, 0.35, 0.22 + r2() * 0.06) }); });
  place(500, VIL, (x, z) => { const s = 0.5 + r2() * 0.8; bu.push({ p: V(x, H(x, z) - 0.1, z), s: V(s, s * 0.8, s), c: new THREE.Color().setHSL(0.2 + r2() * 0.1, 0.35, 0.24 + r2() * 0.06) }); });
  mk(bushGeo(42), leafM, bu);
  const rk = []; for (let k = 0; k < 520; k++) { const a = r2() * 6.28, d = LR + 2 + r2() * 50; const x = Math.cos(a) * d, z = Math.sin(a) * d; const s = 0.3 + Math.pow(r2(), 3) * 1.6; rk.push({ p: V(x, H(x, z) - s * 0.25, z), s: V(s * (1 + r2() * 0.5), s, s), c: new THREE.Color(0.42 + r2() * 0.12, 0.38 + r2() * 0.1, 0.34 + r2() * 0.08) }); }
  mk(rockGeo(43), STD(0xffffff, { vertexColors: true, roughness: 0.85 }), rk);
  // ---------------- the road (red laterite ribbon down the valley, through the village) ----------------
  { const RT = painted(256, 256, (x, y) => { const u = x / 256, v = y / 256; const n = fbm(u * 8, v * 8, 0, 4), rut = Math.exp(-Math.pow((u - 0.3) / 0.05, 2)) + Math.exp(-Math.pow((u - 0.7) / 0.05, 2)); const pb = vnoise(x * 0.5, y * 0.5) > 0.82;
      let c = mixc([168, 92, 54], [196, 120, 74], n); c = mixc(c, [120, 64, 40], rut * 0.5); if (pb) c = [150, 130, 110]; return [cl(c[0]), cl(c[1]), cl(c[2]), n * 0.5 - rut * 0.3 + (pb ? 0.4 : 0)]; }, 2.5);
    RT.map.repeat.set(1, 1); const pos = [], uv = []; const W = 3.2; let vv = 0;
    const pts = []; for (let a = RIM * 0.9; a < 620; a += 2) { const w = Math.sin(a * 0.02) * 6; pts.push(VD.clone().multiplyScalar(a).addScaledVector(LAT, w)); }
    for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[i], p1 = pts[i + 1]; const dir = p1.clone().sub(p0).normalize(), n = V(-dir.z, 0, dir.x); const seg = p1.distanceTo(p0);
      const q = [p0.clone().addScaledVector(n, -W), p0.clone().addScaledVector(n, W), p1.clone().addScaledVector(n, W), p1.clone().addScaledVector(n, -W)].map((p) => [p.x, H(p.x, p.z) + 0.06, p.z]);
      const uu = [[0, vv], [1, vv], [1, vv + seg / 6], [0, vv + seg / 6]]; for (const k of [0, 2, 1, 0, 3, 2]) { pos.push(...q[k]); uv.push(...uu[k]); } vv += seg / 6; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    const road = new THREE.Mesh(g, STD(0xffffff, { map: RT.map, normalMap: RT.normalMap, roughness: 1 })); road.receiveShadow = true; scene.add(road); }
  // ---------------- houses ----------------
  const ADB = painted(256, 256, (x, y) => { const row = Math.floor(y / 21), fy = y % 21, sx = (x + (row % 2) * 24) % 48; const k = 0.85 + vnoise(Math.floor((x + (row % 2) * 24) / 48) * 3.1, row * 1.9) * 0.3;
    const mort = fy < 3 || sx < 3; const n = (fbm(x / 30, y / 30, 0, 3) - 0.5) * 40; const plaster = fbm(x / 60 + 5, y / 60, 2, 3) > 0.62;
    let c = mort ? [120, 74, 50] : [168 * k + n, 96 * k + n * 0.6, 62 * k + n * 0.4]; if (plaster) c = mixc(c, [180 + n, 140 + n, 110 + n], 0.3); return [cl(c[0]), cl(c[1]), cl(c[2]), mort && !plaster ? 0.1 : 0.6 + n / 200]; }, 3);
  const THA = painted(256, 256, (x, y) => { const s = vnoise(x * 0.6, y * 0.04) * 0.6 + vnoise(x * 1.7, y * 0.1) * 0.4; const band = (y % 40) / 40; const k = 0.75 + s * 0.4 - band * 0.15;
    return [cl(190 * k), cl(160 * k), cl(96 * k), s * 0.8 + (band > 0.9 ? -0.4 : 0)]; }, 3);
  const RUST = painted(256, 256, (x, y) => { const n = fbm(x / 40, y / 40, 0, 4), st = fbm(x / 8, y / 120, 3, 3); let c = mixc([150, 150, 150], [140, 74, 40], Math.max(0, n - 0.35) * 2.2); c = mixc(c, [96, 50, 30], Math.max(0, st - 0.6) * 2);
    return [cl(c[0]), cl(c[1]), cl(c[2]), n * 0.2]; }, 1.5);
  const PLK = plankTex(4, [120, 84, 56]);
  const wallM = STD(0xffffff, { map: ADB.map, normalMap: ADB.normalMap, vertexColors: true }); const thM = STD(0xffffff, { map: THA.map, normalMap: THA.normalMap, roughness: 1, vertexColors: true });
  const tinM = STD(0xffffff, { map: RUST.map, normalMap: RUST.normalMap, roughness: 0.55, metalness: 0.4, vertexColors: true, side: THREE.DoubleSide }); const woodM = STD(0xffffff, { map: PLK.map, normalMap: PLK.normalMap, vertexColors: true });
  const walls = [], thatch = [], tin = [], wood = [], glowL = [];
  const xf = (g, h) => { g.rotateY(h.rot); g.translate(h.x, H(h.x, h.z) - 0.05, h.z); return g; };
  T.lamps = [];
  for (const h of HOUSES) { const { w, d } = h, wh = h.h, tint = 0.85 + r2() * 0.25;
    walls.push({ g: xf(box(w, wh, d, 0, wh / 2, 0), h), col: [tint, tint * 0.97, tint * 0.95] });
    walls.push({ g: xf(box(w + 0.12, 0.35, d + 0.12, 0, 0.17, 0), h), col: [0.6, 0.48, 0.4] });   // splash plinth
    // door + frame, window shutters + frame (front = +z local)
    const dx = -w * 0.22, wx = w * 0.22; wood.push({ g: xf(box(0.9, 1.9, 0.08, dx, 0.95, d / 2 + 0.03), h), col: [0.7, 0.6, 0.55] });
    for (const g of [box(0.1, 2.05, 0.14, dx - 0.5, 1.02, d / 2 + 0.04), box(0.1, 2.05, 0.14, dx + 0.5, 1.02, d / 2 + 0.04), box(1.1, 0.12, 0.14, dx, 2.05, d / 2 + 0.04), box(0.9, 0.1, 0.12, wx, 1.95, d / 2 + 0.04), box(0.9, 0.1, 0.16, wx, 1.05, d / 2 + 0.06), box(0.08, 0.95, 0.12, wx - 0.45, 1.5, d / 2 + 0.04), box(0.08, 0.95, 0.12, wx + 0.45, 1.5, d / 2 + 0.04)]) wood.push({ g: xf(g, h), col: [0.85, 0.75, 0.65] });
    const sh = r2() < 0.5; for (const s of [-1, 1]) wood.push({ g: xf(box(0.42, 0.85, 0.05, wx + s * (sh ? 0.68 : 0.22), 1.5, d / 2 + (sh ? 0.06 : 0.09)), h), col: [0.55 + 0.2 * r2(), 0.45, 0.4] });
    // lamp glow in the window (night): an emissive pane + a point light just inside
    const gl = xf(new THREE.PlaneGeometry(0.8, 0.85).translate(wx, 1.5, d / 2 + 0.005), h); glowL.push(gl);
    const lp = new THREE.PointLight(0xffa850, 0, 9, 1.6); const lpos = V(wx, 1.5, d / 2 + 0.6).applyAxisAngle(V(0, 1, 0), h.rot).add(V(h.x, H(h.x, h.z), h.z)); lp.position.copy(lpos); scene.add(lp);
    const al = (h.x * VD.x + h.z * VD.z); T.lamps.push({ light: lp, al, h });
    if (h.iron) { // gable roof, corrugated sheets
      const pitch = 0.42, half = d / 2 + 0.45, L = half / Math.cos(pitch); for (const s of [-1, 1]) { const g = new THREE.PlaneGeometry(w + 0.8, L, 60, 2); const A = g.attributes.position; for (let i = 0; i < A.count; i++) A.setZ(i, Math.sin(A.getX(i) * 12) * 0.035);
        g.rotateX(-Math.PI / 2); g.translate(0, 0, s * L / 2); g.rotateX(s * pitch); g.translate(0, wh + Math.tan(pitch) * (d / 2) + 0.1, 0); g.computeVertexNormals(); tin.push({ g: xf(g, h), col: [0.8 + 0.2 * r2(), 0.8, 0.8] }); }
      for (const s of [-1, 1]) { const sh2 = new THREE.Shape(); sh2.moveTo(-d / 2, 0); sh2.lineTo(d / 2, 0); sh2.lineTo(0, Math.tan(pitch) * d / 2 + 0.1); sh2.closePath(); const g = new THREE.ShapeGeometry(sh2); g.rotateY(Math.PI / 2); g.translate(s * w / 2 * 0.999, wh, 0); walls.push({ g: xf(g, h), col: [tint, tint, tint] }); }
    } else { // hipped thatch: a 4-sided pyramid with overhang + a thick fringe
      const rh = 2.2 + r2() * 0.5; const g = new THREE.ConeGeometry(1, rh, 4, 3, false); g.rotateY(Math.PI / 4); g.scale((w + 1.2) / Math.SQRT2, 1, (d + 1.2) / Math.SQRT2); g.translate(0, wh + rh / 2 - 0.15, 0);
      const A = g.attributes.position; for (let i = 0; i < A.count; i++) { A.setY(i, A.getY(i) + (vnoise(A.getX(i) * 2, A.getZ(i) * 2) - 0.5) * 0.12); } g.computeVertexNormals(); thatch.push({ g: xf(g, h), col: [0.9 + 0.15 * r2(), 0.9, 0.85] });
      const fr = new THREE.CylinderGeometry(1, 1.04, 0.3, 4, 1, true); fr.rotateY(Math.PI / 4); fr.scale((w + 1.25) / Math.SQRT2, 1, (d + 1.25) / Math.SQRT2); fr.translate(0, wh - 0.2, 0); thatch.push({ g: xf(fr, h), col: [0.75, 0.7, 0.6] }); }
    // yard: clay pots, a bench, a woodpile, a fence run
    for (let k = 0; k < 3; k++) { const pg = new THREE.LatheGeometry([[0.0, 0], [0.18, 0.02], [0.26, 0.2], [0.24, 0.38], [0.12, 0.48], [0.13, 0.55]].map(([a, b]) => new THREE.Vector2(a * (0.8 + k * 0.2), b * (0.8 + k * 0.2))), 14); pg.translate(w / 2 + 0.4 + k * 0.45, 0, d / 2 + 0.6); walls.push({ g: xf(pg, h), col: [0.95, 0.72, 0.6] }); }
    wood.push({ g: xf(box(1.6, 0.08, 0.35, -w / 2 + 0.4, 0.45, d / 2 + 0.6), h), col: [0.8, 0.7, 0.6] }); for (const s of [-1, 1]) wood.push({ g: xf(box(0.08, 0.45, 0.3, -w / 2 + 0.4 + s * 0.65, 0.22, d / 2 + 0.6), h), col: [0.7, 0.6, 0.5] });
    for (let k = 0; k < 10; k++) { const g = new THREE.CylinderGeometry(0.06, 0.07, 1.2 + r2() * 0.3, 5); g.translate(-w / 2 - 1.5, 0.6, -d / 2 + k * 0.6); wood.push({ g: xf(g, h), col: [0.7, 0.62, 0.5] }); }
    for (let k = 0; k < 8; k++) { const g = new THREE.CylinderGeometry(0.07, 0.07, 1.1, 5); g.rotateZ(Math.PI / 2); g.translate(w / 2 + 0.5, 0.08 + (k % 3) * 0.14, -d / 2 + 0.5 + Math.floor(k / 3) * 0.16); wood.push({ g: xf(g, h), col: [0.7, 0.6, 0.5] }); }
  }
  const add = (parts, m, shadow = true) => { const o = new THREE.Mesh(merge(parts), m); o.castShadow = shadow; o.receiveShadow = true; scene.add(o); return o; };
  add(walls, wallM); add(thatch, thM); add(tin, tinM); add(wood, woodM);
  // window glows: one mesh per house so each can go dark on its own (visibility is exported per frame)
  const glowM = new THREE.MeshStandardMaterial({ color: 0x100804, emissive: 0xffb060, emissiveIntensity: 2.2 }); const darkM = STD(0x141010, { roughness: 0.4 });
  T.glows = glowL.map((g, i) => { const o = new THREE.Mesh(g, glowM); scene.add(o); const dk = new THREE.Mesh(g, darkM); dk.position.y = 0; scene.add(dk); dk.visible = false; T.lamps[i].glow = o; T.lamps[i].dark = dk; return o; });
  // lamps on/off: fn(lamp) → 0..1 brightness (0 = out)
  T.lights = (fn) => { for (const L of T.lamps) { const k = fn ? fn(L) : 0; L.light.intensity = 1.6 * k; L.glow.visible = k > 0.05; L.dark.visible = !L.glow.visible; } };
  T.lights(null);
  // ---------------- cooking fires (dusk) ----------------
  const fireT = glowT('rgba(255,240,180,1)', 'rgba(255,120,30,A)'), smokeT = puffT(5, '200,200,205'); T.fires = [];
  for (let k = 0; k < 6; k++) { const h = HOUSES[(k * 4) % HOUSES.length]; const p = V(h.w * 0.5 + 1.6, 0, h.d * 0.5 + 2.2).applyAxisAngle(V(0, 1, 0), h.rot).add(V(h.x, 0, h.z)); p.y = H(p.x, p.z);
    const st = []; for (let j = 0; j < 3; j++) { const a = j * 2.1; st.push({ g: (() => { const g = new THREE.DodecahedronGeometry(0.16, 0); g.translate(p.x + Math.cos(a) * 0.3, p.y + 0.1, p.z + Math.sin(a) * 0.3); return g; })(), col: [0.5, 0.48, 0.45] }); }
    for (let j = 0; j < 3; j++) { const g = new THREE.CylinderGeometry(0.04, 0.05, 0.8, 5); g.rotateZ(Math.PI / 2); g.rotateY(j * 2.1); g.translate(p.x, p.y + 0.1, p.z); st.push({ g, col: [0.4, 0.3, 0.2] }); }
    add(st, STD(0xffffff, { vertexColors: true }));
    const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: fireT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); fl.position.copy(p).add(V(0, 0.35, 0)); fl.scale.set(0.7, 0.9, 1); scene.add(fl);
    const L = new THREE.PointLight(0xff8a30, 0, 10, 1.6); L.position.copy(p).add(V(0, 0.5, 0)); scene.add(L);
    const sm = []; for (let j = 0; j < 8; j++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeT, transparent: true, depthWrite: false, color: 0xb8b8c0 })); scene.add(s); sm.push(s); }
    T.fires.push({ p, fl, L, sm }); }
  T.fire = (on, t) => { for (const F of T.fires) { F.fl.visible = on; F.L.intensity = on ? 3 + Math.sin(t * 17 + F.p.x) * 0.6 : 0; F.fl.scale.set(0.7, 0.9 + 0.15 * Math.sin(t * 23 + F.p.z), 1);
      F.sm.forEach((s, j) => { s.visible = on; const u = ((t * 0.25 + j / 8) % 1); s.position.copy(F.p).add(V(Math.sin(j * 1.7 + t) * 0.4 + u * 1.5, 0.6 + u * 7, u * 0.8)); s.scale.setScalar(0.8 + u * 4); s.material.opacity = 0.5 * (1 - u) * Math.min(1, u * 6); }); } };
  T.fire(false, 0);
  // ---------------- the 1986 eruption column ----------------
  const foamT = puffT(9, '255,255,255');
  const colG = (() => { const g = new THREE.CylinderGeometry(0.55, 1, 1, 24, 20, true); const A = g.attributes.position; for (let i = 0; i < A.count; i++) { const y = A.getY(i) + 0.5, a = Math.atan2(A.getZ(i), A.getX(i)); const k = 1 + 0.25 * (fbm(Math.cos(a) * 2, y * 5, Math.sin(a) * 2, 3) - 0.5) * 2 + y * 0.6;
      A.setX(i, A.getX(i) * k); A.setZ(i, A.getZ(i) * k); } g.translate(0, 0.5, 0); g.computeVertexNormals(); return g; })();
  const column = new THREE.Mesh(colG, STD(0xe8eef2, { roughness: 0.8 })); column.castShadow = true; scene.add(column); T.column = column;
  const spray = []; for (let j = 0; j < 70; j++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: foamT, transparent: true, depthWrite: false, color: 0xe8f0f8 })); scene.add(s); spray.push(s); }
  T.fountain = (k, t, col = 0xe8f0f8) => { column.visible = k > 0.01; const H_ = 60 * k; column.scale.set(5 + 3 * k, Math.max(0.01, H_ * 1.3), 5 + 3 * k);
    spray.forEach((s, j) => { s.visible = k > 0.01; if (!s.visible) return; const a = j * 2.4, u = ((t * 0.35 + j / 70) % 1); const top = j % 2 === 0; const rad = top ? 3 + u * 18 * k : 6 + u * 26 * k; const y = top ? H_ * 1.3 * (1 - u * u * 0.8) + 2 : 1 + u * 4;
      s.position.set(Math.cos(a) * rad, y, Math.sin(a) * rad); s.scale.setScalar((top ? 6 + u * 14 : 8 + u * 16) * (0.5 + k * 0.5)); s.material.color.setHex(col); s.material.opacity = 0.6 * (1 - u * 0.7); }); };
  T.fountain(0, 0);
  // ---------------- the gas cloud: puffs flowing along lake → notch → valley → village → beyond ----------------
  const PATH = [V(0, 3, 0), V(VD.x * 90, 6, VD.z * 90), V(VD.x * (RIM + 5), 0, VD.z * (RIM + 5)), V(VD.x * 260, 0, VD.z * 260), VC.clone(), VD.clone().multiplyScalar(560)];
  const curve = new THREE.CatmullRomCurve3(PATH); T.curve = curve;
  const mistT = [puffT(11), puffT(12), puffT(13)]; const mist = [];
  for (let j = 0; j < 520; j++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistT[j % 3], transparent: true, depthWrite: false, color: 0xdde4ee })); s.userData = { u: j / 520 + (r2() - 0.5) * 0.006, l: (r2() - 0.5) * 2, y: r2(), ph: r2() * 6.28 }; scene.add(s); mist.push(s); }
  // front: 0..1 along the path; col: puff colour (night: dim blue-grey); thick: layer height (units)
  T.mist = (front, t, col = 0xdde4ee, thick = 14, opacity = 0.32) => { mist.forEach((s) => { const d = s.userData; s.visible = front > 0 && d.u < front; if (!s.visible) return;
      const u = Math.max(0, Math.min(1, d.u + Math.sin(t * 0.3 + d.ph) * 0.004)); const p = curve.getPointAt(u); const tan = curve.getTangentAt(u); const n = V(-tan.z, 0, tan.x).normalize();
      const w = u < 0.12 ? 30 : 18 + 30 * u; p.addScaledVector(n, d.l * w); const g = H(p.x, p.z); p.y = Math.max(u < 0.12 ? 2 : g, g) + d.y * thick * (u < 0.12 ? 1.6 : 0.7) + 3;
      s.position.copy(p); const sz = (24 + d.y * 24) * (u < 0.12 ? 1.4 : 1); s.scale.set(sz * 1.7, sz, 1); s.material.color.setHex(col);
      const edge = Math.min(1, (front - d.u) * 25); s.material.opacity = opacity * edge; }); };
  T.mist(0, 0);
  // ---------------- the degassing raft (2001 →): pontoons, deck, rail, the pipe and its jet ----------------
  const raft = new THREE.Group(); scene.add(raft); T.raftG = raft;
  { const parts = []; for (const s of [-1, 1]) { const g = new THREE.CylinderGeometry(0.6, 0.6, 9, 16); g.rotateZ(Math.PI / 2); g.translate(0, 0.2, s * 2.6); parts.push({ g, col: [0.95, 0.55, 0.2] }); }
    parts.push({ g: box(8, 0.15, 6, 0, 0.9, 0), col: [0.7, 0.62, 0.55] }); for (const [x, z] of [[-3.9, -2.9], [3.9, -2.9], [-3.9, 2.9], [3.9, 2.9]]) parts.push({ g: box(0.08, 1.1, 0.08, x, 1.5, z), col: [0.85, 0.85, 0.85] });
    for (const z of [-2.9, 2.9]) parts.push({ g: box(7.8, 0.06, 0.06, 0, 2.0, z), col: [0.9, 0.9, 0.9] }); for (const x of [-3.9, 3.9]) parts.push({ g: box(0.06, 0.06, 5.8, x, 2.0, 0), col: [0.9, 0.9, 0.9] });
    const pp = new THREE.CylinderGeometry(0.22, 0.22, 6, 14); pp.translate(0, -2, 0); parts.push({ g: pp, col: [0.3, 0.3, 0.32] }); const nz = new THREE.CylinderGeometry(0.12, 0.25, 1.4, 14); nz.translate(0, 1.6, 0); parts.push({ g: nz, col: [0.4, 0.4, 0.42] });
    parts.push({ g: box(1.2, 0.8, 0.9, 2.6, 1.4, 1.6), col: [0.25, 0.45, 0.7] });
    const o = new THREE.Mesh(merge(parts), STD(0xffffff, { vertexColors: true, roughness: 0.6, metalness: 0.2 })); o.castShadow = o.receiveShadow = true; raft.add(o); }
  const jetG = new THREE.CylinderGeometry(0.18, 0.5, 1, 16, 10, true); { const A = jetG.attributes.position; for (let i = 0; i < A.count; i++) { const y = A.getY(i) + 0.5; const k = 1 + y * 2 + (vnoise(i * 0.7, y * 9) - 0.5) * 0.6; A.setX(i, A.getX(i) * k); A.setZ(i, A.getZ(i) * k); } jetG.translate(0, 0.5, 0); jetG.computeVertexNormals(); }
  const jet = new THREE.Mesh(jetG, STD(0xf4f8ff, { roughness: 0.6, transparent: true, opacity: 0.8 })); jet.position.y = 2.2; raft.add(jet);
  const jsp = []; for (let j = 0; j < 40; j++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: foamT, transparent: true, depthWrite: false, color: 0xf0f6ff })); scene.add(s); jsp.push(s); }
  T.raft = (on, t, hgt = 26) => { raft.visible = on; jet.scale.set(1, hgt, 1); jsp.forEach((s, j) => { s.visible = on; if (!on) return; const u = ((t * 0.5 + j / 40) % 1), a = j * 2.4; const R_ = 1 + u * 7; const y = 2.2 + hgt * (1 - u * u * 0.9);
      s.position.set(raft.position.x + Math.cos(a) * R_, y, raft.position.z + Math.sin(a) * R_); s.scale.setScalar(2.5 + u * 6); s.material.opacity = 0.55 * (1 - u * 0.8); }); };
  T.raft(false, 0);
  return T;
}
