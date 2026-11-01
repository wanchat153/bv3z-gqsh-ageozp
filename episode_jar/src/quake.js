// The far-away earthquake (S26) and the cutaway of the ground (S28).
// buildMountain: a tall pale rock peak with layered strata above farmland at sunset; a twin peak behind; landslide(u) sends
// a sheet of rock + a dust cloud down the left face. buildCutaway: a block of land sliced open like a diorama — a ruined
// town on top, then soil, red clay, an aquifer band with blue water pockets, sand, slate, deep violet rock — split by a
// glowing zig-zag fault (glow(u) brightens and lengthens it).
import * as THREE from './three.module.js';
import { mulberry } from './toon.js';
import { makeCard } from './flat.js';
import { skyRig } from './sky.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const PH = (c, sh = 6) => new THREE.MeshPhongMaterial({ color: c, shininess: sh });

function strataTex(cols, seed, w = 512, h = 1024, wav = 1) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); const r = mulberry(seed);
  let y = 0; let k = 0; while (y < h) { const th = 10 + r() * 40; g.fillStyle = cols[k++ % cols.length]; g.beginPath(); g.moveTo(0, y);
    for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x * 0.02 + k) * 4 * wav); for (let x = w; x >= 0; x -= 16) g.lineTo(x, y + th + Math.sin(x * 0.02 + k + 1) * 4 * wav); g.closePath(); g.fill(); y += th; }
  g.globalAlpha = 0.25; for (let i = 0; i < 1500; i++) { g.fillStyle = r() < 0.5 ? '#ffffff' : '#6a5a6a'; g.fillRect(r() * w, r() * h, 2 + r() * 6, 1 + r() * 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }

export function buildMountain(scene) {
  const M = {}; const r = mulberry(6);
  const sky = skyRig(scene, { sunDir: V(0.6, 0.06, -1), shadow: 60, center: V(0, 0, -60) }); M.sky = sky;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), PH(0x7aa848)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  // field quilt near the foot
  const fields = new THREE.Group(); scene.add(fields);
  for (let i = 0; i < 160; i++) { const w = 6 + r() * 10, d = 4 + r() * 8; const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), PH(['#9ac850', '#c8c060', '#78b048', '#d8b860', '#8ab84a'][i % 5]));
    f.rotation.x = -Math.PI / 2; f.rotation.z = (r() - 0.5) * 0.4; f.position.set((r() - 0.5) * 220, 0.02 + i * 0.0005, -10 - r() * 90); fields.add(f); }
  const trees = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), PH(0x3e8a34), 400); { const m4 = new THREE.Matrix4(); for (let i = 0; i < 400; i++) { const s = 1.5 + r() * 2; m4.compose(V((r() - 0.5) * 240, s, -r() * 110), new THREE.Quaternion(), V(s, s * 1.1, s)); trees.setMatrixAt(i, m4); } } scene.add(trees);
  const peak = (h, rad, seed, x, z, tone) => { const g = new THREE.ConeGeometry(rad, h, 11, 30); const p = g.attributes.position; const rr = mulberry(seed);
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = 1 - (y + h / 2) / h; const ax = p.getX(i), az = p.getZ(i); const n = 1 + 0.06 * Math.sin(y * 0.15 + ax * 0.2) + 0.05 * Math.sin(az * 0.2 + y * 0.1) + (rr() - 0.5) * 0.04;
      p.setX(i, ax * n); p.setZ(i, az * n); } g.computeVertexNormals();
    const tex = strataTex(tone, seed); tex.repeat.set(3, 2); const m = new THREE.Mesh(g, new THREE.MeshPhongMaterial({ map: tex, shininess: 4, flatShading: true })); m.position.set(x, h / 2, z); m.castShadow = true; scene.add(m); return m; };
  M.peak = peak(150, 48, 3, -10, -150, ['#e8dce8', '#d8c8d8', '#f2eaf0', '#c8b4c8', '#ece0ec']);
  M.peak2 = peak(110, 46, 5, 50, -220, ['#d8c4d4', '#e4d4e0', '#c8b0c4']);
  // landslide: a slab of the face that slides down + a rolling dust cloud
  const slab = new THREE.Mesh(new THREE.BoxGeometry(18, 30, 4), new THREE.MeshPhongMaterial({ color: 0xd8c8d8, flatShading: true })); scene.add(slab); M.slab = slab;
  const pT = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64); rg.addColorStop(0, 'rgba(230,214,210,1)'); rg.addColorStop(0.6, 'rgba(200,180,180,0.6)'); rg.addColorStop(1, 'rgba(190,170,170,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const dust = []; for (let i = 0; i < 46; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: pT, transparent: true, depthWrite: false, color: 0xd8c4c0 })); scene.add(s); dust.push([s, r(), r(), r()]); }
  const top = V(-30, 118, -138), foot = V(-48, 8, -112);
  M.landslide = (u) => { slab.visible = u > 0 && u < 1; slab.position.copy(top.clone().lerp(foot, u * u)); slab.rotation.set(0.5, 0.2, 0.55 + u * 0.8);
    dust.forEach(([s, a, b, c2]) => { const k = Math.max(0, Math.min(1, (u - a * 0.5) * 2)); s.visible = k > 0; const p = top.clone().lerp(foot, Math.min(1, b * 0.6 + k * 0.6)); s.position.copy(p).add(V((c2 - 0.5) * 30 * k, 8 * k, 6));
      s.scale.setScalar(12 + 30 * k * (0.5 + c2)); s.material.opacity = 0.8 * Math.min(1, k * 3) * (1 - 0.3 * k); }); };
  M.landslide(0);
  return M;
}

export function buildCutaway(scene) {
  const C = {}; const r = mulberry(12);
  const sky = skyRig(scene, { sunDir: V(0.1, 0.12, -1), shadow: 20, center: V(0, 0, 0) }); C.sky = sky;
  // the slice: a block 24 wide, 30 deep (down), 10 thick; front face painted with strata
  const W = 24, D = 30, T = 10;
  const face = (() => { const c = document.createElement('canvas'); c.width = 1024; c.height = 1280; const g = c.getContext('2d'); const bands = [[0.0, '#6a4a2a'], [0.06, '#8a5a34'], [0.12, '#c8503a'], [0.2, '#d87a5a'], [0.26, '#3aa8a8'], [0.33, '#e8d0a0'], [0.42, '#c8a878'], [0.5, '#4a5a9a'], [0.56, '#d8a080'], [0.66, '#7a4a8a'], [0.8, '#5a3070'], [1.0, '#3a2050']];
    for (let i = 0; i < bands.length - 1; i++) { const [y0, col] = bands[i], y1 = bands[i + 1][0]; g.fillStyle = col; g.beginPath(); g.moveTo(0, y0 * 1280 + Math.sin(i) * 10);
      for (let x = 0; x <= 1024; x += 32) g.lineTo(x, y0 * 1280 + Math.sin(x * 0.006 + i * 1.7) * 18); for (let x = 1024; x >= 0; x -= 32) g.lineTo(x, y1 * 1280 + Math.sin(x * 0.006 + i * 1.7 + 1) * 18); g.closePath(); g.fill();
      g.globalAlpha = 0.25; for (let k = 0; k < 600; k++) { g.fillStyle = k % 2 ? '#ffffff' : '#000000'; g.fillRect(r() * 1024, (y0 + r() * (y1 - y0)) * 1280, 3 + r() * 10, 2 + r() * 3); } g.globalAlpha = 1; }
    for (const [x, y, w, h] of [[260, 300, 120, 50], [700, 420, 150, 60], [480, 640, 110, 44], [180, 780, 90, 36]]) { g.fillStyle = '#2a4ab8'; g.beginPath(); g.ellipse(x, y, w, h, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(160,200,255,0.6)'; g.beginPath(); g.ellipse(x - w * 0.3, y - h * 0.4, w * 0.3, h * 0.2, 0, 0, 7); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; })();
  const block = new THREE.Mesh(new THREE.BoxGeometry(W, D, T), [PH(0x5a3a5a), PH(0x5a3a5a), PH(0x6a9a48), PH(0x3a2050), new THREE.MeshPhongMaterial({ map: face, shininess: 6 }), PH(0x5a3a5a)]);
  block.position.set(0, -D / 2, 0); scene.add(block);
  // the far land beyond the slice (green) so the horizon is filled
  const land = new THREE.Mesh(new THREE.PlaneGeometry(600, 400), PH(0x7aa848)); land.rotation.x = -Math.PI / 2; land.position.set(0, -0.05, -205); scene.add(land);
  // a ruined town along the top edge: houses (some tilted, some collapsed), a road with the crack
  const hs = new THREE.Group(); scene.add(hs);
  for (let i = 0; i < 26; i++) { const w = 1.2 + r() * 1.4, h = 1.4 + r() * 2.2, d = 1.4 + r() * 1.2; const x = -11 + (i % 13) * 1.75 + (r() - 0.5) * 0.4, z = (i < 13 ? -3 : -0.6) + (r() - 0.5) * 0.6;
    const house = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), PH(['#f0e4cc', '#e8d8c0', '#f4ecdc'][i % 3])); b.position.y = h / 2; house.add(b);
    const rf = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.75, 1.0, 4), PH(['#5a3a4a', '#8a4a3a', '#3a3a5a'][i % 3])); rf.rotation.y = Math.PI / 4; rf.position.y = h + 0.5; house.add(rf);
    for (let k = 0; k < 2; k++) { const win = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), new THREE.MeshBasicMaterial({ color: 0x3a3a5a })); win.position.set(-w * 0.2 + k * w * 0.4, h * 0.6, d / 2 + 0.01); house.add(win); }
    house.position.set(x, 0, z); house.rotation.set((r() - 0.5) * 0.25, (r() - 0.5) * 0.4, (r() - 0.5) * 0.3); if (r() < 0.3) house.scale.y = 0.5; hs.add(house); }
  for (let i = 0; i < 60; i++) { const rb = new THREE.Mesh(new THREE.DodecahedronGeometry(0.15 + r() * 0.3, 0), PH(0xd8c8b8)); rb.position.set((r() - 0.5) * 22, 0.1, 1.5 + r() * 3); scene.add(rb); }
  const road = new THREE.Mesh(new THREE.PlaneGeometry(W, 2.2), PH(0xc8a878)); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.03, 2.6); scene.add(road);
  // the glowing fault: a jagged bright line down the face + along the road; glow sprites
  const faultCard = makeCard(6, D + 2, 512, (c, Wp, Hp) => { c.clearRect(0, 0, Wp, Hp); const pts = []; let x = Wp / 2; for (let k = 0; k <= 30; k++) { pts.push([x, k * Hp / 30]); x += (Math.sin(k * 2.7) * 0.6 + Math.sin(k * 1.3)) * Wp * 0.06; x = Math.max(Wp * 0.15, Math.min(Wp * 0.85, x)); }
    for (const [w, col] of [[90, 'rgba(255,160,40,0.2)'], [40, 'rgba(255,190,60,0.6)'], [14, '#fff4c0']]) { c.strokeStyle = col; c.lineWidth = w; c.lineJoin = 'miter'; c.beginPath(); pts.forEach(([a, b], i) => (i ? c.lineTo(a, b) : c.moveTo(a, b))); c.stroke(); }
    c.strokeStyle = '#fff4c0'; c.lineWidth = 7; for (let k = 4; k < 30; k += 5) { const [a, b] = pts[k]; c.beginPath(); c.moveTo(a, b); c.lineTo(a + (k % 2 ? 1 : -1) * Wp * 0.18, b + Hp * 0.02); c.stroke(); } }, { transparent: true });
  faultCard.material.depthWrite = false; faultCard.material.toneMapped = false; faultCard.position.set(0.5, -D / 2 + 1, T / 2 + 0.05); scene.add(faultCard); C.fault = faultCard;
  const roadCrack = makeCard(2.2, 3.4, 256, (c, Wp, Hp) => { c.clearRect(0, 0, Wp, Hp); c.strokeStyle = '#fff0a0'; c.lineWidth = 16; c.beginPath(); c.moveTo(Wp * 0.5, 0); for (let k = 1; k <= 8; k++) c.lineTo(Wp * (0.5 + (k % 2 ? 0.15 : -0.15)), k * Hp / 8); c.stroke();
    c.strokeStyle = 'rgba(255,170,40,0.4)'; c.lineWidth = 50; c.stroke(); }, { transparent: true });
  roadCrack.rotation.x = -Math.PI / 2; roadCrack.material.depthWrite = false; roadCrack.position.set(0.5, 0.06, 3.2); scene.add(roadCrack); C.roadCrack = roadCrack;
  C.glow = (u) => { faultCard.material.opacity = 0.4 + 0.6 * u; faultCard.scale.y = 0.3 + 0.7 * u; faultCard.position.y = -(D + 2) * faultCard.scale.y / 2 + 0.2; roadCrack.material.opacity = 0.5 + 0.5 * u; };
  C.glow(0.5);
  return C;
}
