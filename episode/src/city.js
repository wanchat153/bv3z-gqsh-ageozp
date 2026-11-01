// S07 world: the palace balcony above the parade ground. Balcony at the origin (floor y = 0), the plaza 10 m below toward -z,
// an army of ~2,600 soldiers in blocks either side of a red avenue, white side halls with red banners, the city gate with
// round towers + blue-grey cone roofs, houses climbing the hill, snowy mountains, sky with puffy clouds.
import * as THREE from './three.module.js';
import { toon, outlined, mulberry } from './toon.js';
import { TEX, mat, shade } from './textures.js';
import { makeCard, signText } from './flat.js';
import * as P from './props.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const STONE = (c = '#e6e0d6') => new THREE.MeshPhongMaterial({ color: c, shininess: 12, specular: 0x302a24 });
function skyTex() { const c = document.createElement('canvas'); c.width = 4; c.height = 512; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, '#3f86d8'); gr.addColorStop(0.55, '#7db8ec'); gr.addColorStop(1, '#dcefff'); g.fillStyle = gr; g.fillRect(0, 0, 4, 512); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function banner(w, h) { return makeCard(w, h, 256, (c, W, H) => { c.fillStyle = '#b8262a'; c.beginPath(); c.moveTo(0, 0); c.lineTo(W, 0); c.lineTo(W, H * 0.88); c.lineTo(W / 2, H); c.lineTo(0, H * 0.88); c.closePath(); c.fill();
  c.strokeStyle = '#e8b838'; c.lineWidth = 8; c.strokeRect(10, 10, W - 20, H * 0.8); c.beginPath(); c.arc(W / 2, H * 0.4, W * 0.28, 0, 7); c.lineWidth = 10; c.stroke(); c.beginPath(); c.arc(W / 2, H * 0.4, W * 0.12, 0, 7); c.stroke(); }, { lit: true, transparent: true }); }
function griffin() {   // stone eagle statue (beige), sitting with folded wings
  const g = new THREE.Group(); const m = STONE('#d8c8a8');
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), m); body.scale.set(0.8, 1.2, 0.9); body.position.y = 0.35; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), m); head.position.set(0, 0.78, 0.1); g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 10), m); beak.rotation.x = Math.PI / 2 + 0.5; beak.position.set(0, 0.74, 0.27); g.add(beak);
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.4), m); w.position.set(s * 0.24, 0.55, -0.08); w.rotation.set(-0.3, 0, s * -0.15); g.add(w);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 6), m); tip.position.set(s * 0.26, 0.95, -0.2); tip.rotation.x = -0.4; g.add(tip); }
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.4, 6, 8), m); tail.position.set(0.1, 0.12, -0.25); tail.rotation.set(1.1, 0, 0.6); g.add(tail);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return g;
}
export function buildCity(scene) {
  const C = {}; const r = mulberry(7); scene.background = skyTex();
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0xb8a080, 1.2));
  const sun = new THREE.DirectionalLight(0xfff2dc, 2.2); sun.position.set(12, 30, 16); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 80 }); sun.shadow.bias = -0.0005; scene.add(sun); scene.add(sun.target);
  // ---- balcony ----
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), mat(TEX.pavers('#e8e0d2'), 6, 4)); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 2.6); floor.receiveShadow = true; scene.add(floor);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 4), mat(TEX.rugBorder('#a8262a', '#e8b838'), 1, 2)); rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.005, 1.4); scene.add(rug);
  const slab = P.rbox(12, 0.3, 0.6, '#ddd5c6', 0.04); slab.position.set(0, 1.05, -1.2); scene.add(slab);
  const base = P.rbox(12, 0.25, 0.6, '#ddd5c6', 0.04); base.position.set(0, 0.12, -1.2); scene.add(base);
  const balG = new THREE.LatheGeometry([[0, 0], [0.09, 0], [0.09, 0.05], [0.06, 0.12], [0.1, 0.35], [0.11, 0.45], [0.06, 0.62], [0.08, 0.72], [0.08, 0.78], [0, 0.78]].map(([x, y]) => new THREE.Vector2(x, y)), 14);
  const bal = new THREE.InstancedMesh(balG, STONE('#ece6da'), 40); const M = new THREE.Matrix4(); for (let i = 0; i < 40; i++) { M.makeTranslation(-5.85 + i * 0.3, 0.24, -1.2); bal.setMatrixAt(i, M); } bal.castShadow = true; scene.add(bal);
  for (const x of [-2.2, 2.2]) { const pil = P.rbox(0.62, 1.4, 0.62, '#e2dacb', 0.05); pil.position.set(x, 0.7, -1.2); scene.add(pil);
    const panel = makeCard(0.5, 0.9, 256, (c, W, H) => { c.fillStyle = '#d8cfbe'; c.fillRect(0, 0, W, H); c.strokeStyle = '#b8ae9c'; c.lineWidth = 8; c.strokeRect(14, 14, W - 28, H - 28); c.beginPath(); c.arc(W / 2, H / 2, W * 0.22, 0, 7); c.stroke(); }, { lit: true }); panel.position.set(x, 0.72, -0.885); scene.add(panel); }
  const gr = griffin(); gr.position.set(2.2, 1.4, -1.2); gr.rotation.y = -0.4; scene.add(gr); C.griffin = gr;
  const pot = new THREE.Group(); const urn = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.18, 0], [0.12, 0.08], [0.28, 0.3], [0.3, 0.42], [0, 0.42]].map(([x, y]) => new THREE.Vector2(x, y)), 20), STONE()); pot.add(urn);
  for (let k = 0; k < 9; k++) { const f = P.ball(0.07, k % 3 ? '#d8302a' : '#2e7d4f', 0.004); f.position.set((r() - 0.5) * 0.4, 0.5 + r() * 0.12, (r() - 0.5) * 0.4); pot.add(f); }
  pot.position.set(-2.9, 1.2, -1.2); scene.add(pot);
  for (const x of [-3.6, 3.6]) { const pole = P.tube(0.04, 3.4, '#5a3a22', 0.006); pole.position.set(x, 1.7, 0.2); scene.add(pole); const fin = P.ball(0.08, '#e8b838', 0.004); fin.position.set(x, 3.45, 0.2); scene.add(fin);
    const b = banner(0.9, 2.0); b.position.set(x + 0.48 * Math.sign(-x), 2.2, 0.21); scene.add(b); }
  // ---- plaza 10 m below ----
  const PY = -4;
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(60, 56), mat(TEX.pavers('#d8d0c2'), 30, 28)); plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, PY, -26); plaza.receiveShadow = true; scene.add(plaza);
  const ave = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 52), mat(TEX.rugBorder('#b8262a', '#e8b838'), 1, 18)); ave.rotation.x = -Math.PI / 2; ave.position.set(0, PY + 0.02, -26); scene.add(ave);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(14, 4), STONE('#e0d8ca')); wall.position.set(0, PY + 2, -0.9); scene.add(wall);   // palace facade under the balcony
  // army: blocks of soldiers either side of the avenue (InstancedMesh: robe, head, helmet)
  const bodyG = new THREE.CapsuleGeometry(0.2, 0.7, 4, 8), headG = new THREE.SphereGeometry(0.17, 10, 8), helmG = new THREE.SphereGeometry(0.18, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  const N = 2640; const bodies = new THREE.InstancedMesh(bodyG, toon(new THREE.Color('#8e2a2a')), N), heads = new THREE.InstancedMesh(headG, toon(new THREE.Color('#f4e6d6')), N), helms = new THREE.InstancedMesh(helmG, toon(new THREE.Color('#5a6070')), N);
  let n = 0; const q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1);
  for (const side of [-1, 1]) for (let blk = 0; blk < 3; blk++) for (let row = 0; row < 22; row++) for (let col = 0; col < 20 && n < N; col++) {
    const x = side * (2.6 + col * 0.95) + (r() - 0.5) * 0.06, z = -4 - blk * 14.5 - row * 0.62;
    M.compose(V(x, PY + 0.55, z), q, sc); bodies.setMatrixAt(n, M); M.compose(V(x, PY + 1.1, z), q, sc); heads.setMatrixAt(n, M); M.compose(V(x, PY + 1.16, z), q, sc); helms.setMatrixAt(n, M); n++; }
  for (const im of [bodies, heads, helms]) { im.count = n; scene.add(im); }
  for (const side of [-1, 1]) for (let k = 0; k < 7; k++) { const pole = P.tube(0.05, 4, '#3a2a1e', 0); pole.position.set(side * 2.0, PY + 2, -4 - k * 6.5); scene.add(pole);
    const b = banner(0.8, 1.8); b.position.set(side * 2.0, PY + 3, -4 - k * 6.5 + 0.02); scene.add(b); }
  // side halls with arcades + banners
  for (const side of [-1, 1]) { const hallM = STONE('#ece6dc'); const h = new THREE.Mesh(new THREE.BoxGeometry(10, 9, 50), hallM); h.position.set(side * 27, PY + 4.5, -26); scene.add(h);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(11, 0.8, 51), STONE('#5a6478')); roof.position.set(side * 27, PY + 9.2, -26); scene.add(roof);
    for (let k = 0; k < 11; k++) { const arch = makeCard(2.2, 4, 128, (c, W, H) => { c.fillStyle = '#4a4a58'; c.beginPath(); c.moveTo(0, H); c.lineTo(0, H * 0.3); c.arc(W / 2, H * 0.3, W / 2, Math.PI, 0); c.lineTo(W, H); c.fill(); }, { transparent: true });
      arch.position.set(side * 21.98, PY + 2, -6 - k * 4.2); arch.rotation.y = -side * Math.PI / 2; scene.add(arch);
      const b = banner(1.2, 3); b.position.set(side * 21.96, PY + 6.2, -8 - k * 4.2); b.rotation.y = -side * Math.PI / 2; scene.add(b); } }
  // city gate: curtain wall + round towers with cone roofs
  const gate = new THREE.Group(); gate.position.set(0, PY, -52); scene.add(gate);
  const cw = new THREE.Mesh(new THREE.BoxGeometry(40, 7.5, 3), STONE('#e6e0d4')); cw.position.y = 3.75; gate.add(cw);
  for (let k = -9; k <= 9; k++) { const mer = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.2, 3.1), STONE('#e6e0d4')); mer.position.set(k * 2.2, 8.1, 0); gate.add(mer); }
  const door = makeCard(4, 6.5, 128, (c, W, H) => { c.fillStyle = '#3a2a2a'; c.beginPath(); c.moveTo(0, H); c.lineTo(0, H * 0.35); c.arc(W / 2, H * 0.35, W / 2, Math.PI, 0); c.lineTo(W, H); c.fill(); }, { transparent: true }); door.position.set(0, 3.25, 1.52); gate.add(door);
  for (const x of [-12, -4.5, 4.5, 12]) { const tw = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.1, 11, 24), STONE('#ece6dc')); tw.position.set(x, 5.5, 0.5); gate.add(tw);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.5, 5, 24), toon(new THREE.Color('#6a7a98'))); cone.position.set(x, 13.5, 0.5); gate.add(cone);
    const b = banner(1.0, 3.2); b.position.set(x, 6, 2.55); gate.add(b); }
  // houses climbing the hill behind the gate
  const hG = new THREE.BoxGeometry(1, 1, 1), rG = new THREE.ConeGeometry(0.75, 0.7, 4); const NH = 900;
  const houses = new THREE.InstancedMesh(hG, toon(new THREE.Color('#f2ece0')), NH), roofs = new THREE.InstancedMesh(rG, toon(new THREE.Color('#d8673a')), NH);
  const rq = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), Math.PI / 4);
  for (let i = 0; i < NH; i++) { const x = (r() - 0.5) * 120, z = -58 - r() * 90; const y = PY + Math.max(0, (-z - 58) * 0.4) + Math.sin(x * 0.05) * 3; const w = 2 + r() * 2.5, h = 2 + r() * 2.5;
    M.compose(V(x, y + h / 2, z), q, V(w, h, w)); houses.setMatrixAt(i, M); M.compose(V(x, y + h + w * 0.25, z), rq, V(w * 1.1, w * 0.9, w * 1.1)); roofs.setMatrixAt(i, M);
    roofs.setColorAt(i, new THREE.Color(r() < 0.6 ? '#d8673a' : r() < 0.5 ? '#6a7a98' : '#b84a3a')); }
  scene.add(houses); scene.add(roofs);
  for (let k = 0; k < 9; k++) { const tw = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 14, 16), STONE('#ece6dc')); const x = -50 + k * 12 + r() * 4, z = -90 - r() * 40;
    tw.position.set(x, PY + 7 + (-z - 58) * 0.4, z); scene.add(tw); const cn = new THREE.Mesh(new THREE.ConeGeometry(1.6, 5, 16), toon(new THREE.Color('#6a7a98'))); cn.position.set(x, tw.position.y + 9.5, z); scene.add(cn); }
  // mountains + clouds
  for (let k = 0; k < 9; k++) { const h = 50 + r() * 60; const mtn = new THREE.Mesh(new THREE.ConeGeometry(28 + r() * 20, h, 7), toon(new THREE.Color(shade('#8a98b8', (r() - 0.5) * 0.1))));
    mtn.position.set(-160 + k * 42 + r() * 20, PY + h / 2 + 30, -230 - r() * 50); mtn.rotation.y = r() * 3; scene.add(mtn);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(9, h * 0.25, 7), toon(new THREE.Color('#ffffff'))); cap.position.set(mtn.position.x, PY + 30 + h - h * 0.125, mtn.position.z); cap.rotation.y = mtn.rotation.y; scene.add(cap); }
  for (let k = 0; k < 10; k++) { const cl = P.cloud3D(k + 40, 5 + r() * 4); cl.position.set(-140 + k * 30 + r() * 10, 60 + r() * 30, -260 - r() * 60); scene.add(cl); }
  C.sun = sun; C.plazaY = PY; return C;
}
