// T08: a European street at night under the strange glowing sky of July 1908 (HQ pass): a row of tall narrow plastered
// houses on stone plinths — string courses between floors, cornices, recessed windows with white surrounds, sills,
// lintels and glazing bars (lit ones glow warm behind curtains), panelled doors on steps, tiled gable roofs, brick
// chimneys with pots; a flagstone pavement with a kerb, a cobbled street, a cast-iron gas lamp with a glazed lantern.
// The sky glows pink-orange low over the roofs (sky mode 'glow').
import * as THREE from './three.module.js';
import { mulberry } from './toon.js';
import { skyRig } from './sky.js';
import { painted, merge, vnoise, fbm } from './hq.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const STD = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
const box = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
const cl = (x) => Math.max(0, Math.min(255, x));
// voronoi stones (cobbles / flags / bricks-ish): returns painted() tile
function stones(n, seed, base, mortar, sx = 1, sy = 1, bump = 10) { const r = mulberry(seed); const pts = []; for (let i = 0; i < n; i++) pts.push([r(), r(), 0.75 + r() * 0.5]);
  return painted(256, 256, (x, y) => { const u = x / 256, v = y / 256; let d1 = 9, d2 = 9, k = 1;
    for (const [cx, cy, s] of pts) for (const ox of [-1, 0, 1]) for (const oy of [-1, 0, 1]) { const d = Math.hypot((u - cx - ox) * sx, (v - cy - oy) * sy); if (d < d1) { d2 = d1; d1 = d; k = s; } else if (d < d2) d2 = d; }
    const e = d2 - d1; const hgt = Math.min(1, e * bump) * (0.85 + vnoise(x * 0.3, y * 0.3) * 0.15); const n = (vnoise(x * 1.2, y * 1.2) - 0.5) * 26;
    const c = e < 0.025 ? mortar : base.map((q) => q * k + n); return [cl(c[0]), cl(c[1]), cl(c[2]), hgt]; }, 3); }
// a lit (or dark) window pane: warm light, curtain folds at the sides, a pot plant or lamp silhouette
function paneTex(seed, lit) { const r = mulberry(seed); const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
  if (lit) { const gr = g.createRadialGradient(64, 150, 10, 64, 140, 170); gr.addColorStop(0, '#fff2c8'); gr.addColorStop(0.5, '#ffc070'); gr.addColorStop(1, '#a05a20'); g.fillStyle = gr; g.fillRect(0, 0, 128, 256);
    for (const s of [0, 1]) { const w = 22 + r() * 22; for (let x = 0; x < w; x += 3) { g.fillStyle = `rgba(${150 + 60 * Math.sin(x * 0.7)},${90 + 40 * Math.sin(x * 0.7)},60,0.85)`; g.fillRect(s ? 128 - x - 3 : x, 0, 3, 256); } }
    if (r() < 0.5) { g.fillStyle = 'rgba(40,24,14,0.9)'; g.fillRect(48, 214, 32, 30); g.beginPath(); g.ellipse(64, 200, 26, 20, 0, 0, 7); g.fill(); } else if (r() < 0.5) { g.fillStyle = 'rgba(50,30,16,0.85)'; g.fillRect(60, 170, 6, 70); g.beginPath(); g.moveTo(40, 172); g.lineTo(88, 172); g.lineTo(76, 140); g.lineTo(52, 140); g.fill(); } }
  else { const gr = g.createLinearGradient(0, 0, 128, 256); gr.addColorStop(0, '#3a3a5a'); gr.addColorStop(1, '#141420'); g.fillStyle = gr; g.fillRect(0, 0, 128, 256); g.fillStyle = 'rgba(255,190,220,0.15)'; g.fillRect(0, 0, 128, 60); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }

export function buildTown(scene) {
  const W = {}; const r = mulberry(23);
  const sky = skyRig(scene, { sunDir: V(0, 0.1, -1), moonDir: V(-0.5, 0.6, -1), shadow: 20, center: V(0, 0, -6) }); sky.setMode('glow'); W.sky = sky;
  // street: cobbles; pavement: flags + kerb
  const CB = stones(70, 4, [96, 90, 104], [40, 36, 44], 1, 1, 14); CB.map.repeat.set(60, 60); CB.normalMap.repeat.set(60, 60);
  const street = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), STD(0xffffff, { map: CB.map, normalMap: CB.normalMap, roughness: 0.45 })); street.rotation.x = -Math.PI / 2; street.receiveShadow = true; scene.add(street);
  const FL = stones(9, 7, [120, 116, 112], [60, 56, 54], 1.6, 1, 8); FL.map.repeat.set(30, 1.2); FL.normalMap.repeat.set(30, 1.2);
  const pave = new THREE.Mesh(box(60, 0.14, 2.6, 0, 0.07, -5.2), STD(0xffffff, { map: FL.map, normalMap: FL.normalMap, roughness: 0.6 })); pave.receiveShadow = true; scene.add(pave);
  scene.add(new THREE.Mesh(box(60, 0.16, 0.22, 0, 0.08, -3.85), STD(0x8a8680, { roughness: 0.7 })));
  // facades
  const PL = painted(256, 256, (x, y) => { const n = fbm(x / 40, y / 40, 0, 4), s = vnoise(x * 0.8, y * 0.8); const k = 200 + (n - 0.5) * 50 + (s - 0.5) * 16; return [cl(k), cl(k), cl(k * 0.97), n * 0.6 + s * 0.2]; }, 2.5);
  PL.map.repeat.set(2, 3); PL.normalMap.repeat.set(2, 3);
  const SN = stones(14, 9, [130, 124, 116], [70, 66, 62], 2.2, 1, 9); SN.map.repeat.set(4, 1); SN.normalMap.repeat.set(4, 1);
  const TL = painted(128, 128, (x, y) => { const row = Math.floor(y / 16), fy = (y % 16) / 16, col_ = Math.floor((x + (row % 2) * 8) / 16), fx = ((x + (row % 2) * 8) % 16) / 16; const k = 0.8 + vnoise(col_ * 3.1, row * 2.7) * 0.4;
    const hgt = fy * 0.8 + (Math.abs(fx - 0.5) > 0.45 ? -0.3 : 0); return [cl(110 * k), cl(70 * k), cl(64 * k), hgt]; }, 3); TL.map.repeat.set(4, 4); TL.normalMap.repeat.set(4, 4);
  const BR = painted(128, 128, (x, y) => { const row = Math.floor(y / 10), fy = y % 10, fx = (x + (row % 2) * 12) % 24; const k = 0.75 + vnoise(Math.floor((x + (row % 2) * 12) / 24) * 3.3, row * 1.7) * 0.5; const m = fy < 2 || fx < 2;
    return m ? [150, 140, 130, 0.1] : [cl(140 * k), cl(64 * k), cl(48 * k), 0.7]; }, 3); BR.map.repeat.set(1, 3); BR.normalMap.repeat.set(1, 3);
  const cols = ['#d8c8a8', '#b8b0c4', '#e0bc96', '#c8b890', '#a8a0b2', '#d8b4a8'];
  const white = STD(0xe8e2d8, { roughness: 0.7 }), dark = STD(0x1a1a24), panes = [0, 1, 2, 3, 4, 5].map((i) => { const t = paneTex(40 + i, i < 4); return new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.1, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: i < 4 ? 1.4 : 0.6 }); });
  const trim = [], roofG = [], chim = [], pots = [];
  let x = -14; const Z = -6.5;
  for (let i = 0; i < 12; i++) { const w = 2.6 + r() * 1.4, h = 6 + r() * 5, d = 5, cx = x + w / 2;
    const b = new THREE.Mesh(box(w, h, d, cx, h / 2, -9), STD(cols[i % cols.length], { map: PL.map, normalMap: PL.normalMap, roughness: 0.9 })); b.castShadow = b.receiveShadow = true; scene.add(b);
    const pl = new THREE.Mesh(box(w + 0.02, 0.7, 0.12, cx, 0.35, Z + 0.06), STD(0xffffff, { map: SN.map, normalMap: SN.normalMap })); scene.add(pl);
    trim.push(box(w + 0.02, 0.28, 0.3, cx, h - 0.14, Z + 0.15), box(w + 0.02, 0.1, 0.22, cx, h - 0.33, Z + 0.11));                 // cornice
    for (let fy = 1.6 + 1.9 - 0.25; fy < h - 0.8; fy += 1.9) trim.push(box(w + 0.02, 0.08, 0.08, cx, fy, Z + 0.04));                 // string courses
    // gable roof along x, tiles
    const rh = 1.6 + r() * 0.8; const sh = new THREE.Shape(); sh.moveTo(-d / 2 - 0.25, 0); sh.lineTo(d / 2 + 0.25, 0); sh.lineTo(0, rh); sh.closePath();
    const rg = new THREE.ExtrudeGeometry(sh, { depth: w + 0.1, bevelEnabled: false }); rg.rotateY(Math.PI / 2); rg.translate(x - 0.05, h, -9);
    { const uv = rg.attributes.uv; const p = rg.attributes.position; for (let k = 0; k < uv.count; k++) uv.setXY(k, p.getX(k) * 0.6, (p.getY(k) + p.getZ(k)) * 0.6); } roofG.push(rg);
    const chx = cx + w * (r() - 0.5) * 0.5; chim.push(box(0.5, 2.0, 0.5, chx, h + rh * 0.6, -9.6)); trim.push(box(0.62, 0.1, 0.62, chx, h + rh * 0.6 + 1.0, -9.6));
    for (const o of [-0.12, 0.12]) pots.push(new THREE.CylinderGeometry(0.06, 0.08, 0.28, 10).translate(chx + o, h + rh * 0.6 + 1.19, -9.6));
    // windows: recessed panes, surround, sill, lintel, glazing bars
    for (let fy = 1.6; fy < h - 0.8; fy += 1.9) for (let fx = 0.6; fx < w - 0.4; fx += 1.1) { const wx = x + fx;
      if (fy < 2 && fx < 1.0 && i % 3 === 0) { // a door instead
        const dr = new THREE.Mesh(box(0.8, 1.9, 0.08, wx, 1.05, Z + 0.13), STD(0x4a2a24, { roughness: 0.6 })); scene.add(dr); for (const py of [0.5, 1.15, 1.65]) trim.push(box(0.6, 0.02, 0.03, wx, py, Z + 0.18));
        trim.push(box(0.12, 2.1, 0.1, wx - 0.46, 1.05, Z + 0.16), box(0.12, 2.1, 0.1, wx + 0.46, 1.05, Z + 0.16), box(1.08, 0.18, 0.14, wx, 2.12, Z + 0.17), box(1.1, 0.12, 0.5, wx, 0.06, Z + 0.4)); continue; }
      const pm = panes[Math.floor(r() * 6)]; const pg = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.0), pm); pg.position.set(wx, fy, Z + 0.006); scene.add(pg);
      trim.push(box(0.08, 1.16, 0.12, wx - 0.34, fy, Z + 0.02), box(0.08, 1.16, 0.12, wx + 0.34, fy, Z + 0.02), box(0.76, 0.08, 0.12, wx, fy + 0.54, Z + 0.02));
      trim.push(box(0.84, 0.07, 0.2, wx, fy - 0.55, Z + 0.07), box(0.86, 0.14, 0.14, wx, fy + 0.66, Z + 0.05));                  // sill, lintel
      trim.push(box(0.03, 1.0, 0.03, wx, fy, Z + 0.025), box(0.6, 0.03, 0.03, wx, fy + 0.18, Z + 0.025));   // glazing bars
    }
    x += w + 0.05; }
  const tm = new THREE.Mesh(merge(trim.map((g) => ({ g }))), white); tm.castShadow = tm.receiveShadow = true; scene.add(tm);
  const rf = new THREE.Mesh(merge(roofG.map((g) => ({ g }))), STD(0xffffff, { map: TL.map, normalMap: TL.normalMap, roughness: 0.75 })); rf.castShadow = true; scene.add(rf);
  const ch = new THREE.Mesh(merge(chim.map((g) => ({ g }))), STD(0xffffff, { map: BR.map, normalMap: BR.normalMap })); ch.castShadow = true; scene.add(ch);
  scene.add(new THREE.Mesh(merge(pots.map((g) => ({ g }))), STD(0xa05a3a)));
  // gas lamp: stepped base, fluted post, cross arm, glazed lantern with frame and cap
  const iron = STD(0x1e2024, { metalness: 0.7, roughness: 0.45 }); const lp = [];
  lp.push(new THREE.CylinderGeometry(0.2, 0.26, 0.35, 16).translate(2.5, 0.175 + 0.14, -3), new THREE.CylinderGeometry(0.14, 0.18, 0.25, 16).translate(2.5, 0.47 + 0.14, -3));
  const post = new THREE.LatheGeometry([[0.1, 0], [0.07, 0.2], [0.065, 2.4], [0.09, 2.5], [0.06, 2.6]].map(([a, b]) => new THREE.Vector2(a, b)), 16); post.translate(2.5, 0.6, -3); lp.push(post);
  lp.push(box(0.6, 0.04, 0.04, 2.5, 3.0, -3), new THREE.CylinderGeometry(0.16, 0.08, 0.12, 4).translate(2.5, 3.26, -3));
  for (const [dx, dz] of [[-0.14, -0.14], [0.14, -0.14], [0.14, 0.14], [-0.14, 0.14]]) lp.push(box(0.025, 0.46, 0.025, 2.5 + dx, 3.55, -3 + dz));
  const cap = new THREE.ConeGeometry(0.28, 0.24, 4); cap.rotateY(Math.PI / 4); cap.translate(2.5, 3.9, -3); lp.push(cap, new THREE.SphereGeometry(0.04, 8, 6).translate(2.5, 4.04, -3));
  const lamp = new THREE.Mesh(merge(lp.map((g) => ({ g }))), iron); lamp.castShadow = true; scene.add(lamp);
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.42, 0.26), new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffc060, emissiveIntensity: 3, transparent: true, opacity: 0.85 })); glow.position.set(2.5, 3.55, -3); scene.add(glow);
  const L = new THREE.PointLight(0xffc070, 6, 12, 1.5); L.position.set(2.5, 3.5, -3); scene.add(L);
  return W;
}
