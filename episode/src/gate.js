// The city gate world (S13 day, S17 + S18 night). Facade at z = 0 facing +z (outside the city), road running out toward +z.
// Gatehouse: crenellated curtain wall with a carved crest and two crosses, a round-arched tunnel (3 m deep) with an iron-banded
// door folded back and a portcullis (raised by day, down at night), two round towers with slate cone roofs + red banners,
// torches either side of the arch. Outside: a rutted dirt road, grass verges with tufts, market stalls with striped awnings,
// crates, barrels, sacks, pots. Inside: a cobbled street with townhouses. On top: the wall walk with parapets (S18).
// Beyond the city (for the views out through the portcullis): rolling hills, a zig-zag road up a hill, distant trees.
import * as THREE from './three.module.js';
import { toon, outlined, mulberry } from './toon.js';
import { TEX, mat, shade } from './textures.js';
import { makeCard } from './flat.js';
import { flame } from './hall.js';
import * as P from './props.js';
import { skyRig } from './sky.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const STONE = (c = '#e8e2d6', rx = 4, ry = 4) => { const m = mat(TEX.stone(c), rx, ry); return m; };
const PH = (c, sh = 10) => new THREE.MeshPhongMaterial({ color: c, shininess: sh });
function bannerCard(w, h) { return makeCard(w, h, 256, (c, W, H) => { c.clearRect(0, 0, W, H); c.fillStyle = '#c0262a'; c.beginPath(); c.moveTo(0, 0); c.lineTo(W, 0); c.lineTo(W, H * 0.9); c.lineTo(W / 2, H); c.lineTo(0, H * 0.9); c.closePath(); c.fill();
  c.strokeStyle = '#2a1a16'; c.lineWidth = 6; c.stroke(); c.strokeStyle = '#f0b838'; c.lineWidth = 7; c.strokeRect(14, 12, W - 28, H * 0.82);
  c.beginPath(); c.arc(W / 2, H * 0.24, W * 0.2, 0, 7); c.lineWidth = 9; c.stroke(); c.beginPath(); c.arc(W / 2, H * 0.24, W * 0.08, 0, 7); c.fillStyle = '#f0b838'; c.fill();
  for (let k = 0; k < 3; k++) { const y = H * (0.45 + k * 0.13); c.beginPath(); c.moveTo(W / 2, y - 14); c.lineTo(W / 2 + 12, y); c.lineTo(W / 2, y + 14); c.lineTo(W / 2 - 12, y); c.closePath(); c.fill(); } }, { lit: true, transparent: true }); }
function crest(w) { return makeCard(w, w * 1.15, 512, (c, W, H) => { c.clearRect(0, 0, W, H);
  c.fillStyle = '#d6cfc2'; c.beginPath(); c.roundRect(W * 0.05, H * 0.12, W * 0.9, H * 0.82, 30); c.fill(); c.strokeStyle = '#8a8274'; c.lineWidth = 10; c.stroke();
  c.fillStyle = '#c0262a'; c.beginPath(); c.moveTo(W * 0.24, H * 0.3); c.lineTo(W * 0.76, H * 0.3); c.lineTo(W * 0.76, H * 0.56); c.quadraticCurveTo(W * 0.76, H * 0.78, W / 2, H * 0.88); c.quadraticCurveTo(W * 0.24, H * 0.78, W * 0.24, H * 0.56); c.closePath(); c.fill();
  c.strokeStyle = '#f0b838'; c.lineWidth = 12; c.stroke(); c.beginPath(); c.arc(W / 2, H * 0.55, W * 0.11, 0, 7); c.lineWidth = 10; c.stroke();
  c.fillStyle = '#f0b838'; c.beginPath(); c.moveTo(W * 0.36, H * 0.24); c.lineTo(W * 0.4, H * 0.1); c.lineTo(W * 0.46, H * 0.2); c.lineTo(W / 2, H * 0.06); c.lineTo(W * 0.54, H * 0.2); c.lineTo(W * 0.6, H * 0.1); c.lineTo(W * 0.64, H * 0.24); c.closePath(); c.fill();
  for (const s of [-1, 1]) { c.strokeStyle = '#c0262a'; c.lineWidth = 9; c.beginPath(); c.moveTo(W / 2 + s * W * 0.27, H * 0.5); c.quadraticCurveTo(W / 2 + s * W * 0.4, H * 0.7, W / 2 + s * W * 0.2, H * 0.85); c.stroke(); } }, { lit: true, transparent: true }); }
function stall(seed, aw = ['#c0262a', '#f4efe4']) { const g = new THREE.Group(); const r = mulberry(seed);
  const top = P.rbox(1.6, 0.08, 0.8, '#8a5a34', 0.02); top.position.y = 0.85; g.add(top);
  for (const [x, z] of [[-0.75, -0.35], [0.75, -0.35], [-0.75, 0.35], [0.75, 0.35]]) { const l = P.rbox(0.07, z < 0 ? 2.1 : 1.75, 0.07, '#6a4226', 0.01); l.position.set(x, (z < 0 ? 2.1 : 1.75) / 2, z); g.add(l); }
  const awn = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.0), mat(TEX.stripes(aw[0], aw[1]), 3, 1)); awn.position.set(0, 1.95, 0); awn.rotation.x = -Math.PI / 2 + 0.38; g.add(awn);
  const val = makeCard(1.8, 0.22, 256, (c, W, H) => { c.clearRect(0, 0, W, H); for (let k = 0; k < 9; k++) { c.fillStyle = k % 2 ? aw[1] : aw[0]; c.beginPath(); c.moveTo(k * W / 9, 0); c.lineTo((k + 1) * W / 9, 0); c.lineTo((k + 1) * W / 9, H * 0.6); c.arc((k + 0.5) * W / 9, H * 0.6, W / 18, 0, Math.PI); c.closePath(); c.fill(); } }, { transparent: true, lit: true });
  val.position.set(0, 1.66, 0.48); val.rotation.x = 0.05; g.add(val);
  for (let k = 0; k < 7; k++) { const it = k % 3 === 0 ? P.ball(0.07, ['#d8302a', '#f0b030', '#6ab03a'][k % 3], 0.004) : P.rbox(0.18, 0.12, 0.14, ['#c89a5a', '#e8d8b8', '#8a6a4a'][k % 3], 0.02, 0.004); it.position.set(-0.6 + k * 0.2, 0.95, (r() - 0.5) * 0.4); g.add(it); }
  const sign = makeCard(0.5, 0.36, 256, (c, W, H) => { c.fillStyle = '#e8dcc0'; c.fillRect(0, 0, W, H); c.strokeStyle = '#6a4226'; c.lineWidth = 10; c.strokeRect(5, 5, W - 10, H - 10); c.fillStyle = '#c0262a'; c.font = '800 60px Montserrat'; c.textAlign = 'center'; c.fillText('✕', W / 2, H * 0.7); }, { lit: true });
  sign.position.set(-0.45, 1.25, -0.34); g.add(sign); return g; }
function barrel() { const g = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.7, 20), mat(TEX.planks('#9a6a3a', 10), 2, 1)); g.position.y = 0.35;
  const w = new THREE.Group(); w.add(g); for (const y of [0.12, 0.58]) { const b = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.015, 6, 24), PH(0x3a3a40, 40)); b.rotation.x = Math.PI / 2; b.position.y = y; w.add(b); } return w; }
function house(w, h, d, col, roof) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(TEX.plaster(col), 1, 1)); b.position.y = h / 2; g.add(b);
  const rf = new THREE.Mesh(new THREE.CylinderGeometry(0.01, d * 0.75, w * 1.1, 4, 1), toon(new THREE.Color(roof))); rf.rotation.z = Math.PI / 2; rf.rotation.x = Math.PI / 4; rf.scale.set(1, 1, 0.8); rf.position.y = h + d * 0.3; g.add(rf);
  for (let k = 0; k < 2; k++) { const win = makeCard(0.5, 0.7, 64, (c, W, H) => { c.fillStyle = '#3a4a6a'; c.fillRect(0, 0, W, H); c.strokeStyle = '#6a4226'; c.lineWidth = 8; c.strokeRect(0, 0, W, H); c.beginPath(); c.moveTo(W / 2, 0); c.lineTo(W / 2, H); c.stroke(); }, {}); win.position.set(-w * 0.25 + k * w * 0.5, h * 0.62, d / 2 + 0.01); g.add(win); g.userData.wins = (g.userData.wins || []).concat(win); }
  return g; }

export function makeCart() {
  const cart = new THREE.Group(); const bed = P.rbox(1.8, 0.12, 1.3, '#8a5a34', 0.02); bed.position.y = 0.62; cart.add(bed);
  cart.userData.wheels = [];
  // the axle is under the bed; the wheel radius is 0.42 so its rim touches the cart origin plane (y = 0): place the origin on the ground
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.6, 10), PH(0x4a3020)); axle.rotation.x = Math.PI / 2; axle.position.set(0.1, 0.42, 0); cart.add(axle);
  for (const s of [-1, 1]) { const wg = new THREE.Group(); wg.position.set(0.1, 0.42, s * 0.72); cart.add(wg); cart.userData.wheels.push(wg);
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.045, 8, 32), PH(0x6a4226)); wg.add(w);
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.022, 6, 40), PH(0x3a3036, 30)); wg.add(tyre);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 12), PH(0x8a6a3a)); hub.rotation.x = Math.PI / 2; wg.add(hub);
    for (let k = 0; k < 6; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.76, 0.035), PH(0x6a4226)); sp.rotation.z = k * Math.PI / 6; wg.add(sp); }
    const sh = P.rbox(1.6, 0.06, 0.06, '#7a4a2a', 0.01); sh.position.set(-1.4, 0.55, s * 0.4); sh.rotation.z = -0.15; cart.add(sh); }
  for (const s of [-1, 1]) { const rail = P.rbox(1.8, 0.22, 0.06, '#7a4a2a', 0.01); rail.position.set(0, 0.8, s * 0.64); cart.add(rail); }
  // crossbar joining the shaft tips: the tow rope is tied to its middle (cart.userData.hitch, cart-local)
  const bar = P.rbox(0.07, 0.07, 0.9, '#7a4a2a', 0.01); bar.position.set(-2.17, 0.67, 0); cart.add(bar); cart.userData.hitch = new THREE.Vector3(-2.2, 0.67, 0);
  return cart;
}
export function buildGate(scene) {
  const G = {}; const r = mulberry(31);
  const sky = skyRig(scene, { sunDir: V(0.3, 0.35, 1), moonDir: V(0.25, 0.42, 1), shadow: 16, center: V(0, 0, 4) }); G.sky = sky;
  const WALL = '#ebe5d8';
  // ---- facade with the arch hole (shape with hole), 18 m wide, 9 m high, 3 m thick ----
  const AW = 3.4, AH = 5.0;
  const shape = new THREE.Shape(); shape.moveTo(-9, 0); shape.lineTo(9, 0); shape.lineTo(9, 9); shape.lineTo(-9, 9); shape.closePath();
  const hole = new THREE.Path(); hole.moveTo(-AW / 2, 0); hole.lineTo(-AW / 2, AH - AW / 2); hole.absarc(0, AH - AW / 2, AW / 2, Math.PI, 0, true); hole.lineTo(AW / 2, 0); hole.closePath(); shape.holes.push(hole);
  const facadeG = new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: false, curveSegments: 24 }); facadeG.translate(0, 0, -3);
  // planar UVs in metres so the stone texture keeps its size on every face
  { const p = facadeG.attributes.position, n = facadeG.attributes.normal, uv = facadeG.attributes.uv; for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    uv.setXY(i, ax > 0.5 ? p.getZ(i) / 2.2 : p.getX(i) / 2.2, ay > 0.5 ? p.getZ(i) / 2.2 : p.getY(i) / 2.2); } }
  const st = mat(TEX.stone(WALL), 1, 1); st.map.wrapS = st.map.wrapT = THREE.RepeatWrapping;
  const facade = new THREE.Mesh(facadeG, st); facade.castShadow = facade.receiveShadow = true; scene.add(facade); G.facade = facade;
  // arch voussoirs + keystone ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(AW / 2 + 0.22, 0.24, 8, 40, Math.PI), PH(0xd8d0c2)); ring.position.set(0, AH - AW / 2, 0.05); ring.scale.z = 0.5; scene.add(ring);
  for (const s of [-1, 1]) { const jamb = P.rbox(0.44, AH - AW / 2, 0.25, '#d8d0c2', 0.02); jamb.position.set(s * (AW / 2 + 0.22), (AH - AW / 2) / 2, 0.05); scene.add(jamb); }
  // crenellations along the top, front and back parapet
  for (let k = -8; k <= 8; k++) for (const z of [0.0, -2.9]) { const m = P.rbox(0.62, 0.8, 0.35, WALL, 0.03); m.position.set(k * 1.05, 9.4, z - 0.15); scene.add(m); }
  const walk = new THREE.Mesh(new THREE.PlaneGeometry(18, 2.6), mat(TEX.pavers('#cfc6b6'), 8, 1.2)); walk.rotation.x = -Math.PI / 2; walk.position.set(0, 9.01, -1.5); walk.receiveShadow = true; scene.add(walk);
  const corbels = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.35, 0.3), PH(0xd8d0c2), 34); { const M = new THREE.Matrix4(); for (let k = 0; k < 34; k++) { M.makeTranslation(-8.6 + k * 0.52, 8.8, 0.12); corbels.setMatrixAt(k, M); } } scene.add(corbels);
  const cr = crest(1.6); cr.position.set(0, 6.9, 0.02); scene.add(cr);
  for (const s of [-1, 1]) { const x = makeCard(0.6, 0.9, 128, (c, W, H) => { c.clearRect(0, 0, W, H); c.fillStyle = '#3a3036'; c.fillRect(W * 0.42, 0, W * 0.16, H); c.fillRect(W * 0.1, H * 0.3, W * 0.8, H * 0.14); }, { transparent: true, lit: true }); x.position.set(s * 2.6, 6.9, 0.02); scene.add(x); }
  // ---- towers ----
  for (const s of [-1, 1]) { const tw = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.3, 13, 40, 1, true), mat(TEX.stone(WALL), 5, 5)); tw.position.set(s * 8.2, 6.5, -0.3); tw.castShadow = tw.receiveShadow = true; scene.add(tw);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(2.55, 2.4, 0.6, 40), PH(0xd8d0c2)); cap.position.set(s * 8.2, 13.1, -0.3); scene.add(cap);
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; const m = P.rbox(0.5, 0.7, 0.4, WALL, 0.03); m.position.set(s * 8.2 + Math.sin(a) * 2.45, 13.7, -0.3 + Math.cos(a) * 2.45); m.rotation.y = a; scene.add(m); }
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.7, 5.6, 40, 1, true), mat(TEX.scales('#5a6274'), 8, 3)); cone.material.side = THREE.DoubleSide; cone.position.set(s * 8.2, 17.0, -0.3); cone.castShadow = true; scene.add(cone);
    const fin = P.ball(0.14, '#e8b838', 0.006); fin.position.set(s * 8.2, 19.9, -0.3); scene.add(fin);
    const b = bannerCard(1.1, 3.6); b.position.set(s * 8.2 - s * 0.6, 7.6, 2.0); b.rotation.y = s * 0.42; scene.add(b);
    for (let k = 0; k < 3; k++) { const sl = makeCard(0.18, 0.7, 32, (c, W, H) => { c.fillStyle = '#2a2430'; c.fillRect(0, 0, W, H); }, {}); const a = s * (0.2 + k * 0.35); sl.position.set(s * 8.2 + Math.sin(a) * 2.32, 4 + k * 3, -0.3 + Math.cos(a) * 2.32); sl.rotation.y = a; scene.add(sl); } }
  for (const s of [-1, 1]) { const b = bannerCard(1.0, 3.4); b.position.set(s * 4.6, 6.0, 0.03); scene.add(b); }
  // ---- door leaves folded back inside the tunnel, the portcullis ----
  const plank = mat(TEX.planks('#7a4a2a', 6), 1, 1);
  for (const s of [-1, 1]) { const d = new THREE.Mesh(new THREE.BoxGeometry(AW / 2, AH - 0.4, 0.12), plank); d.position.set(s * (AW / 2 - 0.08), (AH - 0.4) / 2, -1.6 - AW / 4); d.rotation.y = s * Math.PI / 2; scene.add(d); }
  const pc = new THREE.Group(); const iron = PH(0x6a5a48, 30), wood = PH(0x8a5a30, 14);
  for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, AH + 0.5, 0.16), wood); b.position.set(-AW / 2 + 0.3 + k * (AW - 0.6) / 5, (AH + 0.5) / 2, 0); pc.add(b);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 6), iron); tip.rotation.x = Math.PI; tip.position.set(b.position.x, -0.1, 0); pc.add(tip); }
  for (let k = 0; k < 5; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(AW + 0.1, 0.1, 0.2), iron); b.position.set(0, 0.5 + k * 1.05, 0.02); pc.add(b);
    for (let j = 0; j < 6; j++) { const rv = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), PH(0xb8a888, 60)); rv.position.set(-AW / 2 + 0.3 + j * (AW - 0.6) / 5, 0.5 + k * 1.05, 0.13); pc.add(rv); } }
  pc.position.set(0, 0, -0.9); scene.add(pc); G.portcullis = pc;
  // torches flanking the arch (outside) and inside the tunnel
  G.flames = []; G.torchLights = [];
  for (const [x, y, z, ry] of [[-2.6, 3.4, 0.25, 0], [2.6, 3.4, 0.25, 0], [-AW / 2 + 0.05, 3.0, -2.4, Math.PI / 2], [AW / 2 - 0.05, 3.0, -2.4, -Math.PI / 2]]) {
    const t = new THREE.Group(); const br = P.rbox(0.08, 0.08, 0.3, '#3a2a1e', 0.01, 0.004); br.position.z = 0.15; t.add(br);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.05, 0.22, 10), PH(0x3a3a40, 30)); cup.position.set(0, 0.1, 0.3); t.add(cup);
    const f = flame(0.32); f.position.set(0, 0.42, 0.3); t.add(f); G.flames.push(f); t.position.set(x, y, z); t.rotation.y = ry; scene.add(t);
    const pl = new THREE.PointLight(0xffa040, 0, 9, 1.6); pl.position.set(x, y + 0.45, z + (ry ? 0 : 0.5)); scene.add(pl); G.torchLights.push(pl); }
  // ---- outside: road, verges, market ----
  const groundT = (() => { const c = document.createElement('canvas'); c.width = 1024; c.height = 1024; const g = c.getContext('2d');
    g.fillStyle = '#6aa83e'; g.fillRect(0, 0, 1024, 1024); const rr = mulberry(4);
    for (let i = 0; i < 6000; i++) { g.fillStyle = ['#5a9a34', '#7ab84a', '#4e8a2e', '#88c058'][i % 4]; g.globalAlpha = 0.5; g.fillRect(rr() * 1024, rr() * 1024, 2 + rr() * 4, 6 + rr() * 10); }
    g.globalAlpha = 1; const road = (w, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(512 - w, 0); g.lineTo(512 + w, 0); g.lineTo(512 + w * 1.25, 1024); g.lineTo(512 - w * 1.25, 1024); g.closePath(); g.fill(); };
    road(250, '#d8b884'); road(232, '#e2c492');
    for (let i = 0; i < 2500; i++) { g.fillStyle = ['#c8a470', '#f0d8a8', '#b8946a'][i % 3]; g.globalAlpha = 0.6; const x = 512 + (rr() - 0.5) * 520, y = rr() * 1024; g.fillRect(x, y, 3 + rr() * 5, 2 + rr() * 3); }
    g.globalAlpha = 0.5; g.strokeStyle = '#a8845a'; g.lineWidth = 14; for (const x of [-120, -70, 70, 120]) { g.beginPath(); g.moveTo(512 + x, 0); g.bezierCurveTo(512 + x * 1.1, 400, 512 + x * 0.9, 700, 512 + x * 1.2, 1024); g.stroke(); }
    g.globalAlpha = 1; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; })();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshPhongMaterial({ map: groundT, shininess: 4 })); ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, 20); ground.receiveShadow = true; scene.add(ground);
  const tuftG = new THREE.ConeGeometry(0.05, 0.22, 4); const tufts = new THREE.InstancedMesh(tuftG, toon(new THREE.Color('#5aa83a')), 900); { const M = new THREE.Matrix4(); let n = 0;
    for (let i = 0; i < 900; i++) { const x = (r() - 0.5) * 36, z = r() * 38 + 0.5; if (Math.abs(x) < 4.5 + z * 0.06 && r() < 0.85) continue; M.makeTranslation(x, 0.1, z); tufts.setMatrixAt(n++, M); } tufts.count = n; } scene.add(tufts);
  const flowers = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 6, 4), toon(new THREE.Color('#ffffff')), 300); { const M = new THREE.Matrix4(); for (let i = 0; i < 300; i++) { const s = r() < 0.5 ? -1 : 1; M.makeTranslation(s * (5 + r() * 12), 0.08, r() * 30); flowers.setMatrixAt(i, M); flowers.setColorAt(i, new THREE.Color(['#ffffff', '#f6d040', '#e86a8a', '#b88ae8'][i % 4])); } } scene.add(flowers);
  G.stalls = [];
  for (const [x, z, ry, sd, aw] of [[-5.6, 3.2, 0.5, 1, ['#c0262a', '#f4efe4']], [5.4, 3.6, -0.5, 2, ['#2f5fc0', '#f4efe4']], [-6.4, 7.5, 0.7, 3, ['#e8a020', '#f4efe4']], [6.2, 8.0, -0.6, 4, ['#c0262a', '#f4efe4']]]) {
    const s = stall(sd, aw); s.position.set(x, 0, z); s.rotation.y = ry; scene.add(s); G.stalls.push(s); }
  for (const [x, z] of [[-4.1, 1.6], [-4.5, 2.1], [4.3, 1.8], [7.4, 5.0], [-7.6, 5.5]]) { const b = barrel(); b.position.set(x, 0, z); scene.add(b); }
  for (const [x, z] of [[-3.9, 0.8], [4.0, 0.9], [4.6, 1.2], [-6.8, 9.6]]) { const cr2 = P.rbox(0.6, 0.45, 0.5, '#a8784a', 0.03); cr2.position.set(x, 0.225, z); cr2.rotation.y = r(); scene.add(cr2); }
  for (const [x, z] of [[3.6, 2.4], [-3.4, 2.6]]) { const pot = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.2, 0], [0.28, 0.2], [0.22, 0.42], [0.14, 0.5], [0, 0.5]].map(([a, b]) => new THREE.Vector2(a, b)), 20), PH(0xc8703a, 20)); pot.position.set(x, 0, z); scene.add(pot); }
  // a hand cart by the road (the jar lands on it in S13)
  const cart = makeCart();
  cart.position.set(-1.6, 0, 6.5); cart.rotation.y = 0.3; scene.add(cart); G.cart = cart;
  // ---- inside the city: cobbled street + townhouses ----
  const street = new THREE.Mesh(new THREE.PlaneGeometry(10, 30), mat(TEX.pavers('#b8b0a2'), 5, 15)); street.rotation.x = -Math.PI / 2; street.position.set(0, 0.002, -18); street.receiveShadow = true; scene.add(street);
  const tun = new THREE.Mesh(new THREE.PlaneGeometry(AW, 3), mat(TEX.pavers('#a8a092'), 2, 2)); tun.rotation.x = -Math.PI / 2; tun.position.set(0, 0.003, -1.5); scene.add(tun);
  for (let k = 0; k < 7; k++) for (const s of [-1, 1]) { const h = house(3.2, 4 + r() * 2.5, 3, ['#f0e4cc', '#f4ecdc', '#e8d8c0'][k % 3], ['#c8603a', '#5a6274', '#b84a3a'][(k + (s > 0)) % 3]); h.position.set(s * 4.4, 0, -6 - k * 3.4); h.rotation.y = s * -Math.PI / 2; scene.add(h); }
  // ---- inside-wall stair + wall walk extension along the hill (S18) ----
  const wallRun = new THREE.Group(); scene.add(wallRun);
  for (let k = 0; k < 6; k++) { const seg = new THREE.Mesh(new THREE.BoxGeometry(3, 9, 6), mat(TEX.stone(WALL), 2, 4)); seg.position.set(11 + k * 0.4, 4.5, 3 + k * 5.6); seg.rotation.y = -0.06; seg.castShadow = seg.receiveShadow = true; wallRun.add(seg);
    const wk = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 5.8), mat(TEX.pavers('#cfc6b6'), 1.2, 2.8)); wk.rotation.x = -Math.PI / 2; wk.position.set(11 + k * 0.4, 9.01, 3 + k * 5.6); wk.receiveShadow = true; wallRun.add(wk);
    for (let j = 0; j < 5; j++) { const m = P.rbox(0.36, 0.8, 0.62, WALL, 0.03); m.position.set(12.35 + k * 0.4, 9.4, 1 + k * 5.6 + j * 1.15); wallRun.add(m); }
    const lip = P.rbox(0.25, 0.4, 5.6, WALL, 0.02); lip.position.set(9.75 + k * 0.4, 9.2, 3 + k * 5.6); wallRun.add(lip); }
  // ---- the land outside the gate: rolling hills, a zig-zag road up the far hill, trees ----
  const hills = new THREE.Group(); scene.add(hills);
  const hillM = (c) => new THREE.MeshPhongMaterial({ color: c, shininess: 4, flatShading: false });
  for (const [x, z, rx, h, c] of [[-30, 70, 30, 14, 0x5a9a3a], [25, 80, 34, 18, 0x4e8e34], [0, 110, 40, 30, 0x5a9440], [-60, 120, 36, 20, 0x6aa04a], [60, 120, 40, 24, 0x5a9a3a]]) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), hillM(c)); m.scale.set(rx, h, rx * 0.7); m.position.set(x, 0, z); m.receiveShadow = true; hills.add(m); }
  { const pts = []; for (let k = 0; k <= 10; k++) { const y = k / 10; pts.push(V((k % 2 ? 1 : -1) * 9 * (1 - y * 0.6), 0, 0)); }
    const zz = makeCard(26, 30, 512, (c, W, H) => { c.clearRect(0, 0, W, H); c.strokeStyle = '#e8d8b0'; c.lineWidth = 18; c.lineJoin = 'round'; c.beginPath(); for (let k = 0; k <= 8; k++) { const y = H - k * H / 8, x = W / 2 + (k % 2 ? 1 : -1) * W * 0.35 * (1 - k / 10); if (!k) c.moveTo(W / 2, H); else c.lineTo(x, y); } c.stroke(); }, { transparent: true, lit: true });
    zz.position.set(0, 14, 96); zz.rotation.x = -0.9; zz.rotation.y = Math.PI; hills.add(zz); G.zigzag = zz; }
  const trees = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), toon(new THREE.Color('#3e7a2e')), 160); { const M = new THREE.Matrix4(); let n = 0;
    for (let i = 0; i < 160; i++) { const x = (r() - 0.5) * 120, z = 30 + r() * 80; if (Math.abs(x) < 8 && z < 50) continue; const s = 1.2 + r() * 1.6; M.compose(V(x, s * 0.9, z), new THREE.Quaternion(), V(s, s * 1.1, s)); trees.setMatrixAt(n++, M); } trees.count = n; } scene.add(trees);
  G.setMode = (mode) => { sky.setMode(mode); const night = mode === 'night'; G.torchLights.forEach((l) => { l.intensity = night ? 5 : 0; }); G.cart.visible = !night; G.flames.forEach((f) => { f.visible = true; });
    pc.position.y = night ? 0 : AH - 0.3; };
  G.flick = (t) => { G.flames.forEach((f, i) => { f.userData.sy ??= f.scale.y; f.scale.y = f.userData.sy * (1 + 0.14 * Math.sin(t * 21 + i * 2) + 0.06 * Math.sin(t * 37 + i)); });
    G.torchLights.forEach((l, i) => { if (l.intensity > 0) l.intensity = 5 * (1 + 0.1 * Math.sin(t * 19 + i * 3)); }); };
  G.AW = AW; G.AH = AH;
  return G;
}
