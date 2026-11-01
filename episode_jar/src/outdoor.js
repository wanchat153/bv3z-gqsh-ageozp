// The countryside world (S14–S16, S20–S21, S25, S27): the inventor's camp on a grassy hilltop at the origin, looking north
// (-z) down over a valley of farmland to the emperor's palace on the far hill; mountains beyond. Camp: the jar, a campfire
// in a stone ring, a cooking pot on a tripod, a laundry line with his spare robe, a vegetable bed, a chest, a dirt path down
// the hill, a big leaning pine whose branch overhangs the camp. A separate steep slope far to the east is the silhouette
// hill of S14 (the cart haul at sunset). The palace can collapse (setCollapse(u)): towers tilt and sink, debris flies,
// a dust column rises.
import * as THREE from './three.module.js';
import { toon, mulberry } from './toon.js';
import { TEX, mat } from './textures.js';
import { makeCard } from './flat.js';
import { flame } from './hall.js';
import * as P from './props.js';
import { skyRig } from './sky.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const PH = (c, sh = 8) => new THREE.MeshPhongMaterial({ color: c, shininess: sh });
const G = (x, m, s) => Math.exp(-((x - m) ** 2) / (2 * s * s));
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const PAL = V(-8, 0, -185);   // palace centre (ground height filled in by buildOutdoor)

// terrain height: camp plateau, slope down to the valley, the palace hill, rolling sides
export function height(x, z) {
  let h = 0;
  h -= 14 * ss(-6, -45, z) * (1 - ss(-110, -140, z));            // down into the valley
  h += 6 * ss(-120, -150, z) * G(x + 6, 0, 60) - 14 * (1 - G(x + 6, 0, 60)) * ss(-120, -150, z);   // palace hill
  h += 3 * Math.sin(x * 0.045) * Math.cos(z * 0.03) * ss(-10, -40, z) + 6 * G(x, -70, 30) * ss(0, -60, z) + 8 * G(x, 80, 35) * ss(10, -50, z);
  h += 1.2 * G(Math.hypot(x, z), 0, 9) - 2.5 * ss(8, 40, z);       // the hilltop camp is a gentle dome; behind it the hill falls away
  return h;
}
function groundTex() { const N = 2048, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'); const r = mulberry(9);
  g.fillStyle = '#6aa840'; g.fillRect(0, 0, N, N);
  for (let i = 0; i < 26000; i++) { g.fillStyle = ['#5a9a34', '#78b84a', '#4e8a2e', '#8ac25a', '#6aa83e'][i % 5]; g.globalAlpha = 0.55; const x = r() * N, y = r() * N; g.fillRect(x, y, 2 + r() * 3, 5 + r() * 9); }
  // farmland quilt in the valley (world z -30..-125 ↔ canvas rows), fields of crops in stripes
  g.globalAlpha = 1; const W2C = (x, z) => [(x + 300) / 600 * N, (z + 300) / 600 * N];
  for (let k = 0; k < 140; k++) { const x = -150 + r() * 300, z = -35 - r() * 90, w = 8 + r() * 14, d = 6 + r() * 10, a = (r() - 0.5) * 0.6;
    const [cx, cy] = W2C(x, z); const col = ['#9ac850', '#c8c060', '#78b048', '#d8b860', '#8ab84a', '#b0d070'][k % 6]; g.save(); g.translate(cx, cy); g.rotate(a);
    const pw = w / 600 * N, pd = d / 600 * N; g.fillStyle = col; g.fillRect(-pw / 2, -pd / 2, pw, pd); g.strokeStyle = 'rgba(60,80,30,0.35)'; g.lineWidth = 1.5;
    for (let j = -pd / 2 + 3; j < pd / 2; j += 4) { g.beginPath(); g.moveTo(-pw / 2, j); g.lineTo(pw / 2, j); g.stroke(); }
    g.strokeStyle = 'rgba(80,110,40,0.8)'; g.lineWidth = 2; g.strokeRect(-pw / 2, -pd / 2, pw, pd); g.restore(); }
  // dirt paths: down from the camp and along the valley to the palace
  g.strokeStyle = '#c8a070'; g.lineCap = 'round'; g.lineWidth = 4; g.beginPath(); let [x0, y0] = W2C(0.5, 1.5); g.moveTo(x0, y0);
  for (const [x, z] of [[2, 6], [-1, 12], [3, 20], [8, 8], [12, -6], [6, -25], [-4, -45], [-8, -80], [-6, -120], [-6, -140]]) { const [a, b] = W2C(x, z); g.lineTo(a, b); } g.stroke();
  g.lineWidth = 2; g.strokeStyle = '#d8b484'; g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16; return t; }
function tree(seed, s = 1, col = '#3e8a34') { const g = new THREE.Group(); const r = mulberry(seed);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.2 * s, 2.2 * s, 8), PH(0x6a4226)); trunk.position.y = 1.1 * s; g.add(trunk);
  for (let k = 0; k < 5; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry((0.8 + r() * 0.5) * s, 14, 10), PH(new THREE.Color(col).offsetHSL(0, 0, (r() - 0.5) * 0.08).getHex(), 6));
    b.position.set((r() - 0.5) * 1.4 * s, (2.4 + r() * 1.0) * s, (r() - 0.5) * 1.4 * s); b.castShadow = true; g.add(b); } return g; }
// a big leaning pine with layered flat canopies (the branch that overhangs the camp)
function pine() { const g = new THREE.Group(); const bark = PH(0x5a3a26);
  const curve = new THREE.CatmullRomCurve3([V(0, 0, 0), V(0.4, 2.5, 0), V(-0.6, 5, 0.2), V(-2.6, 7.2, 0.6), V(-5.5, 8.2, 1.0)]);
  const tr = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.3, 10), bark); tr.castShadow = true; g.add(tr);
  const br = new THREE.CatmullRomCurve3([V(0.2, 5.6, 0.1), V(2.2, 6.4, 0.4), V(4.5, 6.6, 1.2)]); g.add(new THREE.Mesh(new THREE.TubeGeometry(br, 20, 0.16, 8), bark));
  for (const [x, y, z, s] of [[-5.6, 8.4, 1.0, 2.4], [-3.2, 7.8, 0.6, 2.0], [-0.6, 6.0, 0.4, 1.6], [4.6, 6.9, 1.2, 1.9], [2.6, 6.8, 0.6, 1.4]]) {
    const pad = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 10), PH(0x2e6a3a, 6)); pad.scale.set(s, s * 0.38, s * 0.9); pad.position.set(x, y, z); pad.castShadow = true; g.add(pad);
    const pad2 = pad.clone(); pad2.material = PH(0x3e8a44, 6); pad2.scale.multiplyScalar(0.8); pad2.position.y += s * 0.18; g.add(pad2); }
  return g; }
function castle() { const g = new THREE.Group(); const r = mulberry(14); const WALL = 0xf2e4e0, ROOF = 0x5a6a9a; const parts = [];
  const stone = mat(TEX.stone('#f0e0dc'), 3, 3);
  const box = (w, h, d, x, z, y = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stone); m.position.set(x, y + h / 2, z); m.castShadow = m.receiveShadow = true; g.add(m); parts.push(m); return m; };
  const tower = (rad, h, x, z, y = 0, roofH = rad * 2.6) => { const t = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 1.05, h, 20), stone); b.position.y = h / 2; b.castShadow = true; t.add(b);
    const rf = new THREE.Mesh(new THREE.ConeGeometry(rad * 1.25, roofH, 20), PH(ROOF, 20)); rf.position.y = h + roofH / 2; rf.castShadow = true; t.add(rf);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(rad * 0.9, rad * 0.5), PH(0xc0262a)); fl.position.set(rad * 0.45, h + roofH + rad * 0.2, 0); t.add(fl);
    t.position.set(x, y, z); g.add(t); parts.push(t); return t; };
  // curtain wall ring with towers
  for (const [w, d, x, z] of [[46, 2, 0, 16], [46, 2, 0, -16], [2, 32, -23, 0], [2, 32, 23, 0]]) box(w, 7, d, x, z);
  for (const [x, z] of [[-23, 16], [23, 16], [-23, -16], [23, -16], [-8, 16], [8, 16]]) tower(2.6, 10, x, z);
  box(6, 9, 3, 0, 16.5); // gatehouse
  // inner palace: halls, keep, spires
  box(20, 12, 14, 0, -2); box(10, 8, 10, -13, 2); box(10, 8, 10, 13, 2);
  const keep = tower(5, 22, 0, -4, 12, 12); keep.userData.main = true;
  for (const [x, z, rr, h] of [[-8, -6, 2.4, 20], [8, -6, 2.4, 20], [-13, 4, 2.0, 14], [13, 4, 2.0, 14], [-4, 6, 1.6, 17], [4, 6, 1.6, 17], [0, 8, 1.4, 22]]) tower(rr, h, x, z, 4);
  // windows (warm by night): small cards on the big hall
  const win = new THREE.MeshBasicMaterial({ color: 0x3a3a5a }); g.userData.win = win;
  for (let k = 0; k < 18; k++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.6), win); w.position.set(-8.5 + (k % 9) * 2.1, 4 + Math.floor(k / 9) * 4, 5.02); g.add(w); }
  parts.forEach((p) => { p.userData.p0 = p.position.clone(); p.userData.r0 = p.rotation.clone(); p.userData.rnd = [r(), r(), r()]; });
  g.userData.parts = parts; return g; }

export function buildOutdoor(scene) {
  const O = {}; const r = mulberry(17);
  const sky = skyRig(scene, { sunDir: V(-0.05, 0.1, -1), moonDir: V(-0.3, 0.45, -1), shadow: 12, center: V(0, 0, 0) }); O.sky = sky;
  // ---- terrain ----
  const tg = new THREE.PlaneGeometry(600, 600, 300, 300); tg.rotateX(-Math.PI / 2); const p = tg.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, height(p.getX(i), p.getZ(i))); tg.computeVertexNormals();
  const ground = new THREE.Mesh(tg, new THREE.MeshPhongMaterial({ map: groundTex(), shininess: 3 })); ground.receiveShadow = true; scene.add(ground); O.ground = ground;
  // grass tufts + flowers around the camp
  const tuft = new THREE.InstancedMesh(new THREE.ConeGeometry(0.025, 0.15, 3), toon(new THREE.Color('#4e9a34')), 2600); { const M = new THREE.Matrix4(); const q = new THREE.Quaternion(); let n = 0;
    for (let i = 0; i < 2600; i++) { const x = (r() - 0.5) * 36, z = (r() - 0.5) * 36 + 4; if (Math.hypot(x + 1, z - 1) < 1.2) continue; M.compose(V(x, height(x, z) + 0.1, z), q, V(1, 0.7 + r() * 0.8, 1)); tuft.setMatrixAt(n++, M); } tuft.count = n; } scene.add(tuft);
  const fl = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 6), toon(new THREE.Color('#ffffff')), 600); { const M = new THREE.Matrix4(); for (let i = 0; i < 600; i++) { const a = r() * 6.28, d = 6 + r() * 14; const x = Math.cos(a) * d, z = Math.sin(a) * d + 3; M.makeTranslation(x, height(x, z) + 0.08, z); fl.setMatrixAt(i, M); fl.setColorAt(i, new THREE.Color(['#ffffff', '#f6d040', '#e86a8a', '#b88ae8', '#f08a3a'][i % 5])); } } scene.add(fl);
  // ---- trees: valley orchards + scattered + hero pine ----
  const crown = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), PH(0x3e8a34, 6), 1400), trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.15, 0.22, 1, 6), PH(0x6a4226), 1400);
  { const M = new THREE.Matrix4(), q = new THREE.Quaternion(); let n = 0;
    for (let i = 0; i < 1400; i++) { let x, z; if (i < 900) { x = (r() - 0.5) * 320; z = -25 - r() * 120; } else { x = (r() - 0.5) * 400; z = -150 - r() * 130; }
      if (Math.abs(x - PAL.x) < 30 && Math.abs(z - PAL.z) < 22) continue; const s = 1.2 + r() * 1.6, y = height(x, z);
      M.compose(V(x, y + s * 1.6, z), q, V(s, s * 1.1, s)); crown.setMatrixAt(n, M); crown.setColorAt(n, new THREE.Color().setHSL(0.27 + r() * 0.06, 0.45, 0.32 + r() * 0.1)); M.compose(V(x, y + s * 0.5, z), q, V(s, s, s)); trunk.setMatrixAt(n, M); n++; }
    crown.count = trunk.count = n; } crown.castShadow = true; scene.add(crown); scene.add(trunk);
  for (const [x, z, sd, s] of [[-7, -3, 1, 1.2], [6.5, -6, 2, 1.0], [-10, 6, 3, 1.4], [9, 4, 4, 1.1]]) { const t = tree(sd, s); t.position.set(x, height(x, z), z); scene.add(t); }
  const pn = pine(); pn.position.set(6.2, height(6.2, 1.5), 1.5); pn.rotation.y = 0.2; scene.add(pn); O.pine = pn;
  // ---- the camp ----
  O.JAR = V(1.4, height(1.4, -0.6), -0.6);
  const camp = new THREE.Group(); scene.add(camp); O.camp = camp;
  const FIRE = V(-1.2, height(-1.2, 1.4), 1.4); O.FIRE = FIRE;
  for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12, 0), PH(0x8a8478)); s.position.set(FIRE.x + Math.cos(a) * 0.38, FIRE.y + 0.05, FIRE.z + Math.sin(a) * 0.38); s.rotation.set(r(), r(), r()); camp.add(s); }
  for (let k = 0; k < 3; k++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8), PH(0x6a4226)); l.position.set(FIRE.x, FIRE.y + 0.08, FIRE.z); l.rotation.set(Math.PI / 2, 0, k * 1.05); camp.add(l); }
  O.flames = []; for (const [dx, dz, s] of [[0, 0, 0.55], [0.1, 0.05, 0.38], [-0.1, -0.04, 0.42]]) { const f = flame(s); f.position.set(FIRE.x + dx, FIRE.y + 0.35 * s / 0.55 + 0.1, FIRE.z + dz); camp.add(f); O.flames.push(f); }
  O.fireLight = new THREE.PointLight(0xff9a40, 0, 9, 1.5); O.fireLight.position.set(FIRE.x, FIRE.y + 0.6, FIRE.z); scene.add(O.fireLight);
  // tripod + pot
  const TP = V(-2.4, height(-2.4, 0.4), 0.4);
  for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; const l = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.5, 6), PH(0x5a3a26)); l.position.set(TP.x + Math.cos(a) * 0.3, TP.y + 0.7, TP.z + Math.sin(a) * 0.3); l.lookAt(TP.x, TP.y + 1.5, TP.z); l.rotateX(Math.PI / 2); camp.add(l); }
  const pot = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 10), PH(0x2a2a30, 40)); pot.scale.y = 0.8; pot.position.set(TP.x, TP.y + 0.62, TP.z); camp.add(pot);
  // laundry line with the spare blue robe + a white cloth
  const LL = [V(-3.4, 0, -1.8), V(-0.6, 0, -2.6)].map((v) => v.setY(height(v.x, v.z)));
  for (const q of LL) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.0, 8), PH(0x6a4226)); pole.position.copy(q).add(V(0, 1.0, 0)); camp.add(pole); }
  const rope = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(LL[0].clone().add(V(0, 1.9, 0)), LL[0].clone().lerp(LL[1], 0.5).add(V(0, 1.7, 0)), LL[1].clone().add(V(0, 1.9, 0))), 20, 0.01, 4), PH(0xe8dcc0)); camp.add(rope);
  const robe = makeCard(0.9, 1.05, 256, (c, W, H) => { c.clearRect(0, 0, W, H); c.fillStyle = '#2f5fc0'; c.strokeStyle = '#2a1a16'; c.lineWidth = 8; c.beginPath(); c.moveTo(W * 0.2, H * 0.05); c.lineTo(W * 0.8, H * 0.05); c.lineTo(W, H * 0.3); c.lineTo(W * 0.85, H * 0.36); c.lineTo(W * 0.78, H * 0.98); c.lineTo(W * 0.22, H * 0.98); c.lineTo(W * 0.15, H * 0.36); c.lineTo(0, H * 0.3); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#f6f2e6'; c.beginPath(); c.moveTo(W * 0.38, H * 0.05); c.lineTo(W * 0.5, H * 0.32); c.lineTo(W * 0.62, H * 0.05); c.lineTo(W * 0.56, H * 0.05); c.lineTo(W * 0.5, H * 0.2); c.lineTo(W * 0.44, H * 0.05); c.fill(); c.fillStyle = '#f0b030'; c.fillRect(W * 0.2, H * 0.55, W * 0.6, H * 0.07); }, { transparent: true, lit: true });
  robe.position.copy(LL[0].clone().lerp(LL[1], 0.35)).add(V(0, 1.25, 0)); robe.lookAt(robe.position.clone().add(V(0.3, 0, 1))); camp.add(robe);
  const cloth = makeCard(0.5, 0.6, 128, (c, W, H) => { c.fillStyle = '#f4efe4'; c.fillRect(0, 0, W, H); c.strokeStyle = '#c0262a'; c.lineWidth = 6; c.strokeRect(8, 8, W - 16, H - 16); }, { lit: true });
  
  // vegetable bed (rows of cabbages in a wooden frame), a chest, a lantern post, a watering can
  const VB = V(-2.2, height(-2.2, 3.2), 3.2); const bed = P.rbox(2.2, 0.18, 1.2, '#7a4a2a', 0.02); bed.position.copy(VB).add(V(0, 0.09, 0)); camp.add(bed);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { const cb = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), PH(i % 2 ? 0x8ac25a : 0x6aa840)); cb.scale.y = 0.75; cb.position.copy(VB).add(V(-0.78 + i * 0.52, 0.25, -0.35 + j * 0.35)); camp.add(cb); }
  const chest = P.rbox(0.6, 0.42, 0.42, '#8a4a2a', 0.04); chest.position.set(-0.4, height(-0.4, -0.9) + 0.21, -0.9); camp.add(chest);
  const lp = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.8, 6), PH(0x5a3a26)); lp.position.set(-3.3, height(-3.3, 2) + 0.9, 2); camp.add(lp);
  const lan = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.16), new THREE.MeshPhongMaterial({ color: 0xffd080, emissive: 0xffa040, emissiveIntensity: 0.0 })); lan.position.set(-3.3, height(-3.3, 2) + 1.75, 2.12); camp.add(lan); O.lantern = lan;
  // ---- the palace on the far hill ----
  PAL.y = height(PAL.x, PAL.z); const cs = castle(); cs.position.copy(PAL); cs.scale.setScalar(0.6); scene.add(cs); O.castle = cs;
  // collapse dust column (stacked soft puffs) + debris chunks
  const puffT = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    rg.addColorStop(0, 'rgba(255,240,220,1)'); rg.addColorStop(0.55, 'rgba(240,210,180,0.7)'); rg.addColorStop(1, 'rgba(230,200,170,0)'); g.fillStyle = rg; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const dust = new THREE.Group(); scene.add(dust); const puffs = [];
  for (let i = 0; i < 70; i++) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffT, transparent: true, depthWrite: false, color: 0xf0d8c0 })); dust.add(m); puffs.push({ m, a: r() * 6.28, h: r(), s: 0.6 + r() * 0.8, d: r() }); }
  const deb = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), PH(0xe8d8d0), 90); scene.add(deb); const dv = []; for (let i = 0; i < 90; i++) dv.push([(r() - 0.5) * 2, 0.6 + r(), (r() - 0.5) * 2, 0.4 + r() * 1.4, r()]);
  O.setCollapse = (u) => { // u: 0 intact → 1 rubble (the palace itself), dust/debris follow
    cs.userData.parts.forEach((pt) => { const [a, b, c2] = pt.userData.rnd; const k = ss(b * 0.4, 0.5 + b * 0.5, u);
      pt.position.copy(pt.userData.p0).add(V((a - 0.5) * 3 * k, -k * (pt.userData.main ? 22 : 10 + c2 * 6), (c2 - 0.5) * 3 * k)); pt.rotation.set(pt.userData.r0.x + (a - 0.5) * 0.9 * k, pt.userData.r0.y, pt.userData.r0.z + (c2 - 0.5) * 1.2 * k); });
    dust.visible = u > 0; const base = PAL.clone().add(V(0, 4, 4));
    puffs.forEach(({ m, a, h, s, d }) => { const grow = ss(d * 0.3, 0.3 + d * 0.5, u); const y = base.y + h * 60 * grow + 6 * grow; const rad = (4 + h * 8) * grow;
      m.position.set(base.x + Math.cos(a) * rad * (1 - h * 0.5), y, base.z + Math.sin(a) * rad * 0.5); m.scale.setScalar((10 + h * 14) * s * (0.3 + grow)); m.material.opacity = 0.85 * grow * (1 - 0.3 * h); m.material.color.setHSL(0.07, 0.35, 0.82 - h * 0.18); });
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(); deb.visible = u > 0 && u < 0.98;
    dv.forEach(([x, y, z, s, ph], i) => { const k = Math.max(0, u - ph * 0.4) * 1.8; const pos = base.clone().add(V(x * 30 * k, (y * 46 * k - 40 * k * k), z * 18 * k)); q.setFromEuler(new THREE.Euler(k * 8 * x, k * 6 * z, k * 5));
      M.compose(pos, q, V(s, s, s)); deb.setMatrixAt(i, M); }); deb.instanceMatrix.needsUpdate = true; };
  O.setCollapse(0);
  // ---- S14 silhouette slope far to the east: a steep grassy ridge facing the camera at +z ----
  const SL = V(400, 0, 0); O.SLOPE = SL; O.SLOPE_A = 0.36; O.SLOPE_Y0 = 15 / Math.cos(0.36) - 15;   // the slab's top face passes y = Y0 + tan(A)·x
  const slope = new THREE.Mesh(new THREE.BoxGeometry(90, 30, 60), PH(0x5a3050, 4)); slope.position.copy(SL).add(V(0, -15, 18)); /* deep slab: the camera looks across its top */ slope.rotation.z = 0.36; slope.receiveShadow = true; scene.add(slope); O.slope = slope;
  // dry grass: thin blades in tufts over the whole slope top, a few small rocks
  const blades = new THREE.InstancedMesh(new THREE.ConeGeometry(0.018, 0.42, 3), new THREE.MeshBasicMaterial({ color: 0x2a1022 }), 5200); { const M = new THREE.Matrix4(), q = new THREE.Quaternion(); let n = 0;
    for (let tft = 0; tft < 650 && n < 5200; tft++) { const cx = (r() - 0.5) * 56, cz = -4 + r() * 34; const k = 4 + Math.floor(r() * 5);
      for (let j = 0; j < k && n < 5200; j++) { const x = cx + (r() - 0.5) * 0.25, z = cz + (r() - 0.5) * 0.25; const y = Math.tan(0.36) * x + O.SLOPE_Y0;
        q.setFromEuler(new THREE.Euler((r() - 0.5) * 0.5, 0, (r() - 0.5) * 0.6)); M.compose(SL.clone().add(V(x, y + 0.18, z)), q, V(1, 0.5 + r() * 1.3, 1)); blades.setMatrixAt(n++, M); } }
    blades.count = n; } scene.add(blades);
  for (let k = 0; k < 40; k++) { const x = (r() - 0.5) * 50, z = r() * 30; const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + r() * 0.2, 0), PH(0x4a2a40, 4)); rk.position.copy(SL).add(V(x, Math.tan(0.36) * x + O.SLOPE_Y0 + 0.05, z)); rk.scale.y = 0.6; scene.add(rk); };
  // distant pink mountains with mottled rock spots, low on the horizon behind the sun (reference S14)
  const spotT = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 512; const g = cv.getContext('2d'); g.fillStyle = '#e09ab4'; g.fillRect(0, 0, 512, 512); const rr = mulberry(77);
    for (let i = 0; i < 260; i++) { g.fillStyle = rr() < 0.5 ? 'rgba(170,90,130,0.45)' : 'rgba(255,200,215,0.5)'; g.beginPath(); g.ellipse(rr() * 512, rr() * 512, 6 + rr() * 16, 4 + rr() * 9, 0, 0, 7); g.fill(); }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2); return t; })();
  for (const [dx, dz, rad, h] of [[-90, -300, 90, 40], [30, -340, 110, 32], [150, -320, 90, 44]]) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 9, 4), new THREE.MeshStandardMaterial({ map: spotT, roughness: 1, color: 0xffffff, emissiveMap: spotT, emissive: 0xffffff, emissiveIntensity: 0.55 })); m.position.copy(SL).add(V(dx, h / 2 - 4, dz)); m.scale.z = 0.5; scene.add(m); }
  // the slope itself is backlit: a dark plum silhouette with a warm rim on the crest
  // backlit by the low sun: the reference paints it, not lights it — a warm orange band along the crest where the characters walk,
  // deepening to plum toward the camera. Unlit vertex colours (no grazing env reflection washing it out to brown).
  slope.geometry = new THREE.BoxGeometry(90, 30, 60, 1, 1, 60); { const P = slope.geometry.attributes.position, col = []; const cA = new THREE.Color('#d0704c'), cB = new THREE.Color('#8a3c4c'), cC = new THREE.Color('#3a1632'), cc = new THREE.Color();
    for (let i = 0; i < P.count; i++) { const zl = P.getZ(i), yl = P.getY(i); const u = Math.min(1, Math.max(0, (zl + 20) / 9)), v = Math.min(1, Math.max(0, (zl + 11) / 26));
      cc.copy(cA).lerp(cB, u).lerp(cC, v); if (yl < 14) cc.copy(cC).multiplyScalar(0.6); col.push(cc.r, cc.g, cc.b); }
    slope.geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); }
  slope.material = new THREE.MeshBasicMaterial({ vertexColors: true });
  // ---- modes ----
  O.setMode = (mode, o = {}) => { sky.setMode(mode, o); const night = mode === 'night', eve = mode === 'sunset';
    O.fireLight.intensity = night ? 6 : eve ? 3 : 0; O.flames.forEach((f) => { f.visible = night || eve; }); lan.material.emissiveIntensity = night ? 1.5 : 0;
    cs.userData.win.color.set(night ? 0xffc870 : 0x3a3a5a); };
  O.flick = (t) => { O.flames.forEach((f, i) => { f.userData.sy ??= f.scale.y; f.scale.y = f.userData.sy * (1 + 0.15 * Math.sin(t * 19 + i * 2.1) + 0.07 * Math.sin(t * 33 + i)); });
    if (O.fireLight.intensity > 0) O.fireLight.intensity *= 1 + 0.08 * Math.sin(t * 23); };
  return O;
}
