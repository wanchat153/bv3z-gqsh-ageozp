// Inside the jar (S22–S24): a tall bronze cylinder seen from within (stone-grey plates with horizontal grooves, rivet rows,
// rail rings), lamps on the wall, and the mechanism: a heavy gold pendulum (banded urn-shaped bob) hanging from the dome
// on a rod, eight horizontal rods radiating from a ring around the bob out to the wall, each with gold sleeves + a crank
// at the wall end (that crank opens a dragon's jaw). setSwing(a) tilts the pendulum; snap(i, u) breaks rod i.
import * as THREE from './three.module.js';
import { mulberry } from './toon.js';
import { makeCard } from './flat.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const GOLD = () => new THREE.MeshPhongMaterial({ color: 0xe8b040, shininess: 90, specular: 0xfff0c0, emissive: 0x3a2400, emissiveIntensity: 0.25 });
const IRON = () => new THREE.MeshPhongMaterial({ color: 0x3a3a44, shininess: 40, specular: 0x808090 });
export const IN = { R: 3.2, H: 9, ROD_Y: 3.0, PIV: 8.4 };

function wallTex() { const c = document.createElement('canvas'); c.width = 1024; c.height = 1024; const g = c.getContext('2d'); const r = mulberry(3);
  g.fillStyle = '#8a8e9e'; g.fillRect(0, 0, 1024, 1024);
  const rows = 8, cols = 10; for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const x = i * 1024 / cols + (j % 2) * 51, y = j * 1024 / rows;
    const sh = 128 + (r() - 0.5) * 18; g.fillStyle = `rgb(${sh},${sh + 4},${sh + 18})`; g.fillRect(x + 3, y + 3, 1024 / cols - 6, 1024 / rows - 6);
    g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x + 3, y + 3, 1024 / cols - 6, 10); }
  g.fillStyle = '#5a5e6e'; for (let j = 0; j <= rows; j++) g.fillRect(0, j * 1024 / rows - 3, 1024, 6);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 2.2); t.anisotropy = 8; return t; }
function glow(col = 'rgba(255,240,200,A)') { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.2, col.replace('A', '0.9')); rg.addColorStop(1, col.replace('A', '0')); g.fillStyle = rg; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }

export function buildInner(scene) {
  const I = {}; const { R, H } = IN; const r = mulberry(8);
  scene.background = new THREE.Color(0x2a2a34);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 96, 1, true), new THREE.MeshPhongMaterial({ map: wallTex(), side: THREE.BackSide, shininess: 14 })); wall.position.y = H / 2; wall.receiveShadow = true; scene.add(wall);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(R, 96), new THREE.MeshPhongMaterial({ color: 0x6a6e7e, shininess: 10 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  for (let k = 0; k < 6; k++) { const rr = R * (0.25 + k * 0.14); const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.03, 6, 96), IRON()); ring.rotation.x = Math.PI / 2; ring.position.y = 0.02; scene.add(ring); }
  const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhongMaterial({ color: 0x7a7e8e, side: THREE.BackSide })); dome.position.y = H; dome.scale.y = 0.4; scene.add(dome);
  // rail rings + rivet rows on the wall
  for (const y of [1.2, 2.4, 3.6, 4.8, 6.0, 7.2]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(R - 0.06, 0.05, 8, 128), IRON()); ring.rotation.x = Math.PI / 2; ring.position.y = y; scene.add(ring);
    const rv = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshPhongMaterial({ color: 0xd8b060, shininess: 80 }), 72); const M = new THREE.Matrix4();
    for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2; M.makeTranslation(Math.cos(a) * (R - 0.04), y + 0.12, Math.sin(a) * (R - 0.04)); rv.setMatrixAt(i, M); } scene.add(rv); }
  // lamps: brass cups with glowing bulbs on the wall
  I.lamps = []; const gl = glow();
  for (let k = 0; k < 8; k++) for (const y of [5.4, 7.6]) { const a = (k + 0.5) / 8 * Math.PI * 2 + (y > 6 ? 0.2 : 0); const p = V(Math.cos(a) * (R - 0.25), y, Math.sin(a) * (R - 0.25));
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff6dc })); bulb.position.copy(p); scene.add(bulb);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: gl, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp.scale.setScalar(1.1); sp.position.copy(p); scene.add(sp);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.18, 12), GOLD()); cup.position.copy(p).add(V(0, -0.15, 0)); scene.add(cup);
    if (y < 6) { const pl = new THREE.PointLight(0xffe2b0, 2.2, 6, 1.4); pl.position.copy(p).multiplyScalar(0.9); scene.add(pl); I.lamps.push(pl); } }
  scene.add(new THREE.HemisphereLight(0xc8c8e0, 0x3a3440, 0.6));
  const key = new THREE.PointLight(0xfff0d0, 6, 20, 1.2); key.position.set(0, 8.2, 0); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); scene.add(key);
  // ---- pendulum: pivot near the dome, rod, urn-shaped bob with bands ----
  const pend = new THREE.Group(); pend.position.set(0, IN.PIV, 0); scene.add(pend); I.pend = pend;
  const pivot = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), GOLD()); pend.add(pivot);
  const LEN = IN.PIV - IN.ROD_Y - 0.25; const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, LEN, 12), IRON()); rod.position.y = -LEN / 2; pend.add(rod);
  const bobPts = [[0, 0.55], [0.18, 0.55], [0.22, 0.48], [0.42, 0.36], [0.58, 0.16], [0.62, 0], [0.6, -0.22], [0.5, -0.42], [0.3, -0.56], [0.1, -0.62], [0, -0.64]].map(([x, y]) => new THREE.Vector2(x, y));
  const bob = new THREE.Mesh(new THREE.LatheGeometry(bobPts, 48), GOLD()); bob.position.y = -LEN; bob.castShadow = true; pend.add(bob); I.bob = bob;
  for (const [y, rr] of [[0.18, 0.6], [-0.1, 0.63], [-0.36, 0.53]]) { const b = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.03, 8, 48), new THREE.MeshPhongMaterial({ color: 0x9a6a20, shininess: 60 })); b.rotation.x = Math.PI / 2; b.position.y = -LEN + y; pend.add(b); }
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; const d = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshPhongMaterial({ color: 0x8a5a18 })); d.position.set(Math.cos(a) * 0.61, -LEN + 0.04, Math.sin(a) * 0.61); pend.add(d); }
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), GOLD()); knob.position.y = -LEN - 0.66; pend.add(knob);
  I.bobWorld = () => bob.getWorldPosition(new THREE.Vector3());
  // ---- the bat that clings to the top of the bob (S23) ----
  const bat = makeCard(0.42, 0.28, 256, (c, W, Hh) => { c.clearRect(0, 0, W, Hh); c.fillStyle = '#1e1a22'; c.beginPath(); c.moveTo(W / 2, Hh * 0.35);
    c.quadraticCurveTo(W * 0.3, 0, 0, Hh * 0.2); c.quadraticCurveTo(W * 0.15, Hh * 0.5, W * 0.12, Hh * 0.8); c.quadraticCurveTo(W * 0.3, Hh * 0.6, W / 2, Hh * 0.75);
    c.quadraticCurveTo(W * 0.7, Hh * 0.6, W * 0.88, Hh * 0.8); c.quadraticCurveTo(W * 0.85, Hh * 0.5, W, Hh * 0.2); c.quadraticCurveTo(W * 0.7, 0, W / 2, Hh * 0.35); c.fill();
    c.beginPath(); c.arc(W / 2, Hh * 0.42, Hh * 0.16, 0, 7); c.fill(); c.fillStyle = '#ffffff'; for (const s of [-1, 1]) { c.beginPath(); c.arc(W / 2 + s * 10, Hh * 0.4, 5, 0, 7); c.fill(); } }, { transparent: true });
  bat.position.y = -LEN + 0.6; pend.add(bat); I.bat = bat;
  // ---- eight rods: from a collar ring around the bob out to cranks at the wall ----
  I.rods = [];
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.05, 8, 64), IRON()); collar.rotation.x = Math.PI / 2; collar.position.y = IN.ROD_Y; scene.add(collar);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const g = new THREE.Group(); g.position.y = IN.ROD_Y; g.rotation.y = -a; scene.add(g);
    const inner = new THREE.Group(); inner.position.x = 0.95; g.add(inner); const L = R - 1.1;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, L, 10), IRON()); shaft.rotation.z = Math.PI / 2; shaft.position.x = L / 2; inner.add(shaft);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), GOLD()); inner.add(tip);
    for (const x of [L * 0.3, L * 0.7]) { const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.28, 12), GOLD()); sl.rotation.z = Math.PI / 2; sl.position.x = x; inner.add(sl); }
    const crank = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), GOLD()); crank.position.set(L, 0.2, 0); inner.add(crank);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, IN.ROD_Y, 8), IRON()); post.position.set(L * 0.5, -IN.ROD_Y / 2, 0); inner.add(post);
    I.rods.push({ g, inner, shaft, L }); }
  I.setSwing = (a, dir = 0) => { pend.rotation.set(0, 0, 0); pend.rotateY(dir); pend.rotateZ(a); };
  I.snap = (i, u) => { const R0 = I.rods[i]; R0.inner.rotation.z = -0.6 * u; R0.inner.position.y = -0.4 * u * u; };
  I.reset = () => { I.rods.forEach((rd) => { rd.inner.rotation.set(0, 0, 0); rd.inner.position.set(0.95, 0, 0); }); I.setSwing(0); };
  return I;
}
