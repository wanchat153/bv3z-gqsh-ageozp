// The train (4-4-0 engine, tender, dynamite car, boxcar), the signalman and his lantern.
import * as THREE from './three.module.js';
import { limb, drape, mat, CLOTH, LEATHER, mulberry, mix, clamp } from './models.js';

const box = (g, w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; };
const cylZ = (g, r, len, x, y, z, m, seg = 32) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), m); c.rotation.x = Math.PI / 2; c.position.set(x, y, z); g.add(c); return c; };

// planked wood texture (no lettering)
function planks(seed, base, n = 12) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d'); const r = mulberry(seed);
  x.fillStyle = base; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < n; i++) { const y = i * 256 / n; x.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.15})`; x.fillRect(0, y, 256, 256 / n); x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillRect(0, y, 256, 2); }
  for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(255,255,255,${r() * 0.04})`; x.fillRect(r() * 256, r() * 256, 1 + r() * 30, 1); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

// spoked wheel, axis along x
export function wheel(r, spokes, iron, opts = {}) {
  const g = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.14, 48, 1, true), iron); tyre.rotation.z = Math.PI / 2; g.add(tyre);
  const flange = new THREE.Mesh(new THREE.TorusGeometry(r * 0.99, 0.03, 6, 48), iron); flange.rotation.y = Math.PI / 2; flange.position.x = -0.06; g.add(flange);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 0.9, 0.045, 8, 48), iron); rim.rotation.y = Math.PI / 2; rim.position.x = 0.03; g.add(rim);
  for (let k = 0; k < spokes; k++) { const a = k * Math.PI * 2 / spokes; const s = new THREE.Mesh(new THREE.BoxGeometry(0.05, r * 0.82, 0.07), iron); s.position.set(0.03, Math.cos(a) * r * 0.46, Math.sin(a) * r * 0.46); s.rotation.x = a; g.add(s); }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.18, r * 0.2, 0.2, 20), iron); hub.rotation.z = Math.PI / 2; g.add(hub);
  if (opts.counter) { const cw = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.78, r * 0.78, 0.09, 32, 1, false, -0.7, 1.4), iron); cw.rotation.z = Math.PI / 2; cw.position.x = 0.03; g.add(cw); }
  return g;
}

// local frame of every vehicle: front at z = 0, body toward +z, rail top at y = 0, centred on x = 0
export function makeLoco() {
  const g = new THREE.Group();
  const iron = mat(0x1d1f24, 0.5, 0.65), black = mat(0x14161a, 0.55, 0.5), green = mat(0x1d2c24, 0.4, 0.4), brass = mat(0xb08a4a, 0.3, 1.0), red = mat(0x5e1e16, 0.7, 0, CLOTH, 0.3), wood = mat(0x3a2418, 0.85, 0, CLOTH, 0.4);
  // pilot (cowcatcher): slats converging to a nose
  for (let k = -5; k <= 5; k++) { const x = k * 0.12; const s = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.5), red); s.position.set(x * 1.0, 0.55, 0.75); s.rotation.set(0.55, -x * 0.9, 0); g.add(s); }
  box(g, 2.5, 0.32, 0.25, 0, 1.08, 1.4, red);
  // leading truck
  const wheels = [];
  for (const z of [2.3, 3.5]) for (const s of [-1, 1]) { const w = wheel(0.42, 10, iron); w.position.set(s * 0.72, 0.42, z); if (s < 0) w.rotation.y = Math.PI; g.add(w); wheels.push({ w, r: 0.42 }); }
  // cylinders and steam chests
  for (const s of [-1, 1]) { cylZ(g, 0.3, 1.0, s * 1.02, 1.0, 2.9, black); box(g, 0.32, 0.45, 0.9, s * 1.0, 1.5, 2.9, black); }
  // smokebox, boiler with brass bands, firebox
  cylZ(g, 0.82, 1.4, 0, 2.25, 2.3, black);
  const door = new THREE.Mesh(new THREE.CircleGeometry(0.7, 40), iron); door.position.set(0, 2.25, 1.59); door.rotation.y = Math.PI; g.add(door);
  cylZ(g, 0.73, 5.4, 0, 2.25, 5.7, green);
  for (let z = 3.3; z < 8.3; z += 0.9) { const b = new THREE.Mesh(new THREE.TorusGeometry(0.735, 0.022, 6, 48), brass); b.position.set(0, 2.25, z); g.add(b); }
  box(g, 1.3, 1.3, 1.4, 0, 1.6, 8.0, black);
  // stack: a balloon spark-arrester
  { const p = [[0.24, 0], [0.26, 0.6], [0.34, 0.9], [0.62, 1.35], [0.66, 1.5], [0.6, 1.55], [0.0, 1.56]].map(([r, y]) => new THREE.Vector2(r, y)); const st = new THREE.Mesh(new THREE.LatheGeometry(p, 32), black); st.material = black; st.position.set(0, 2.95, 2.25); g.add(st); }
  // headlamp box with a bright lens
  box(g, 0.75, 0.8, 0.85, 0, 3.5, 2.0, black);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.25, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 7.2, 4.5), fog: false })); lens.position.set(0, 3.5, 1.56); lens.rotation.y = Math.PI; g.add(lens);
  // domes, bell, whistle
  { const dome = (z, r) => { const d = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), brass); d.position.set(0, 3.12, z); d.scale.y = 1.2; g.add(d); const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.15, 0.3, 24), brass); c.position.set(0, 2.98, z); g.add(c); }; dome(4.9, 0.36); dome(6.9, 0.42); }
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.3, 20), brass); bell.position.set(0, 3.15, 3.9); g.add(bell);
  const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.4, 12), brass); wh.position.set(0, 3.55, 7.0); g.add(wh);
  // running boards and handrails
  for (const s of [-1, 1]) { box(g, 0.4, 0.05, 5.4, s * 1.18, 1.55, 5.6, iron); const hr = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 5.4, 6), brass); hr.rotation.x = Math.PI / 2; hr.position.set(s * 0.82, 2.65, 5.6); g.add(hr); }
  // frame
  box(g, 1.0, 0.3, 9.5, 0, 1.0, 5.6, iron);
  // driving wheels with counterweights, cranks on the outside
  const drivers = [];
  for (const z of [6.1, 8.3]) for (const s of [-1, 1]) { const w = wheel(0.8, 14, iron, { counter: true }); w.position.set(s * 0.72, 0.8, z); if (s < 0) w.rotation.y = Math.PI; g.add(w); drivers.push({ w, r: 0.8, s, z }); }
  // rods (posed each frame)
  const rods = [];
  for (const s of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 2.2 + 0.2), mat(0x6a6c72, 0.35, 0.9)); g.add(side);
    const main = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 1), mat(0x6a6c72, 0.35, 0.9)); g.add(main);
    const xh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.25), mat(0x6a6c72, 0.35, 0.9)); g.add(xh);
    const pr = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 10), mat(0x9a9ca2, 0.25, 1.0)); g.add(pr);
    rods.push({ s, side, main, xh, pr });
  }
  // cab with windows and an overhanging roof
  const cabT = planks(5, '#5a2418', 14); const cabM = new THREE.MeshStandardMaterial({ map: cabT, roughness: 0.8 });
  box(g, 2.5, 2.0, 0.08, 0, 2.6, 8.6, cabM); box(g, 0.08, 2.0, 2.6, -1.25, 2.6, 9.9, cabM); box(g, 0.08, 2.0, 2.6, 1.25, 2.6, 9.9, cabM);
  for (const s of [-1, 1]) { const win = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), new THREE.MeshBasicMaterial({ color: 0x060608 })); win.position.set(s * 1.3, 3.0, 9.6); win.rotation.y = s * Math.PI / 2; g.add(win); }
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 3.0, 32, 1, true, -0.42, 0.84), black); roof.rotation.x = Math.PI / 2; roof.rotation.z = 0; roof.position.set(0, 0.55, 9.9); roof.material.side = THREE.DoubleSide; g.add(roof);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { g, wheels, drivers, rods, lens, length: 11.2 };
}

// pose the moving parts for a distance travelled d (metres)
export function poseLoco(L, d) {
  for (const { w, r } of L.wheels) w.rotation.x = -d / r;
  const th = -d / 0.8;
  for (const { w } of L.drivers) w.rotation.x = th;
  for (const R of L.rods) {
    const ph = th + (R.s > 0 ? 0 : Math.PI / 2); const cr = 0.32; const x = R.s * 0.92;
    const c1 = new THREE.Vector3(x, 0.8 + cr * Math.cos(ph), 6.1 - cr * Math.sin(ph)), c2 = new THREE.Vector3(x, 0.8 + cr * Math.cos(ph), 8.3 - cr * Math.sin(ph));
    R.side.position.copy(c1).add(c2).multiplyScalar(0.5); R.side.position.x = x + R.s * 0.03;
    // crosshead slides on the guide; main rod from crosshead to the front crank
    const L2 = 2.6; const dy = c1.y - 1.0; const xz = c1.z - Math.sqrt(Math.max(0.01, L2 * L2 - dy * dy));
    const xhp = new THREE.Vector3(x, 1.0, xz);
    R.xh.position.copy(xhp);
    R.main.position.copy(xhp).add(c1).multiplyScalar(0.5); R.main.scale.z = xhp.distanceTo(c1);
    R.main.rotation.set(Math.atan2(-(c1.y - xhp.y), c1.z - xhp.z), 0, 0);
    R.pr.position.set(x * 1.1, 1.0, (xz + 3.4) / 2); R.pr.scale.y = Math.max(0.05, xz - 3.4); R.pr.rotation.x = Math.PI / 2;
  }
}

export function makeTender() {
  const g = new THREE.Group(); const iron = mat(0x1d1f24, 0.5, 0.65), black = mat(0x14161a, 0.6, 0.4), coal = mat(0x0a0a0c, 0.6, 0.2);
  box(g, 2.6, 1.9, 5.8, 0, 1.95, 2.9, black);
  const heap = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), coal); heap.scale.set(1, 0.35, 1.6); heap.position.set(0, 2.9, 2.0); g.add(heap);
  box(g, 1.0, 0.3, 6.0, 0, 0.85, 2.9, iron);
  const wheels = [];
  for (const z of [1.0, 2.0, 3.8, 4.8]) for (const s of [-1, 1]) { const w = wheel(0.42, 10, iron); w.position.set(s * 0.72, 0.42, z); g.add(w); wheels.push({ w, r: 0.42 }); }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { g, wheels, length: 5.9 };
}

export function makeBoxcar(color, seed) {
  const g = new THREE.Group(); const iron = mat(0x1d1f24, 0.5, 0.65);
  const t = planks(seed, color, 18); t.repeat.set(4, 1); t.rotation = Math.PI / 2;
  const body = new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 });
  box(g, 2.7, 2.7, 10.0, 0, 2.55, 5.0, body);
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 10.2, 24, 1, true, -0.4, 0.8), mat(0x2a2620, 0.8)); roof.rotation.x = Math.PI / 2; roof.position.set(0, 0.55, 5.0); roof.material.side = THREE.DoubleSide; g.add(roof);
  for (const s of [-1, 1]) { box(g, 0.06, 2.3, 1.8, s * 1.37, 2.45, 5.0, mat(0x2a1a12, 0.85)); for (const z of [0.3, 9.7]) box(g, 0.06, 2.7, 0.12, s * 1.37, 2.55, z, iron); }
  box(g, 1.0, 0.3, 10.0, 0, 1.0, 5.0, iron);
  const wheels = [];
  for (const z of [1.2, 2.4, 7.6, 8.8]) for (const s of [-1, 1]) { const w = wheel(0.42, 10, iron); w.position.set(s * 0.72, 0.42, z); g.add(w); wheels.push({ w, r: 0.42 }); }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { g, wheels, length: 10.0 };
}

// ---------------- the signalman ----------------
export function makeSignalman(opt = {}) {
  const root = new THREE.Group();
  const coatM = mat(opt.coat ?? 0x2a2e36, 0.92, 0, CLOTH, 0.9); coatM.side = THREE.DoubleSide;
  const denim = mat(0x2a2a30, 0.95, 0, CLOTH, 0.7), shirt = mat(0x4a4038, 0.9, 0, CLOTH, 0.5), vest = mat(0x221c18, 0.85, 0, LEATHER, 0.5);
  const boot = mat(0x1e1610, 0.55, 0, LEATHER, 0.8), belt = mat(0x2a1c12, 0.6, 0, LEATHER, 0.8), skin = mat(0x4a3024, 0.75), glove = mat(0x4a3628, 0.72, 0, LEATHER, 0.6), capM = mat(0x1e2028, 0.8, 0, CLOTH, 0.4);
  const add = (o) => { root.add(o); return o; };
  add(limb([[-0.12, 0.92, 0.0], [-0.135, 0.52, 0.035], [-0.15, 0.13, 0.03]], [0.09, 0.068, 0.052], denim));
  add(limb([[0.11, 0.92, 0.0], [0.12, 0.52, 0.01], [0.13, 0.13, -0.02]], [0.09, 0.068, 0.052], denim));
  for (const [x, z, yaw] of [[-0.15, 0.03, -0.25], [0.13, -0.02, 0.12]]) {
    const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = yaw; root.add(b);
    b.add(limb([[0, 0.3, -0.01], [0, 0.16, -0.005], [0, 0.07, 0.0]], [0.066, 0.062, 0.056], boot, 10, 16));
    b.add(limb([[0, 0.06, -0.05], [0, 0.05, 0.06], [0, 0.04, 0.14], [0, 0.035, 0.18]], [0.054, 0.052, 0.04, 0.025], boot, 16, 16));
    const heel = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.035, 0.07), boot); heel.position.set(0, 0.017, -0.05); b.add(heel);
  }
  { const prof = [[0.0, 0.84], [0.16, 0.86], [0.165, 0.95], [0.152, 1.04], [0.17, 1.16], [0.19, 1.27], [0.18, 1.38], [0.13, 1.45], [0.06, 1.5], [0.0, 1.5]].map(([r, y]) => new THREE.Vector2(r, y));
    const t = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), shirt); t.scale.set(1.12, 1, 0.72); add(t);
    const vp = [[0.172, 0.93], [0.16, 1.04], [0.178, 1.16], [0.198, 1.27], [0.188, 1.37], [0.15, 1.43]].map(([r, y]) => new THREE.Vector2(r, y));
    const v = new THREE.Mesh(new THREE.LatheGeometry(vp, 40, 0.28, Math.PI * 2 - 0.56), vest); v.material.side = THREE.DoubleSide; v.scale.set(1.12, 1, 0.74); add(v); }
  const bl = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 8, 48), belt); bl.rotation.x = Math.PI / 2; bl.scale.set(1.12, 0.78, 1); bl.position.y = 0.94; add(bl);
  // left arm relaxed; the right arm is its own group, pivoting at the shoulder, to swing the lantern
  add(limb([[-0.2, 1.4, 0.0], [-0.275, 1.12, -0.03], [-0.27, 0.9, 0.05]], [0.07, 0.06, 0.05], coatM));
  { const h = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), glove); h.scale.set(0.6, 1.1, 0.95); h.position.set(-0.27, 0.84, 0.055); add(h); }
  const arm = new THREE.Group(); arm.position.set(0.2, 1.4, 0.0); root.add(arm);
  arm.add(limb([[0, 0, 0], [0.13, 0.08, 0.17], [0.2, 0.33, 0.27]], [0.07, 0.06, 0.05], coatM));
  const fist = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), glove); fist.scale.set(0.85, 1.0, 0.9); fist.position.set(0.21, 0.39, 0.28); arm.add(fist);
  const hand = new THREE.Object3D(); hand.position.set(0.21, 0.37, 0.28); arm.add(hand);
  const coatGeo = drape({ y0: 1.43, y1: 0.42, rx: [0.215, 0.215, 0.235, 0.27, 0.31, 0.34], rz: [0.155, 0.16, 0.18, 0.21, 0.25, 0.27], gap: [0.32, 0.46, 0.5, 0.5, 0.48], folds: [0.0, 0.02, 0.05, 0.08], foldK: 8, zoff: -0.008, seed: 15 });
  const coat = add(new THREE.Mesh(coatGeo, coatM));
  const colGeo = drape({ y0: 1.58, y1: 1.44, rx: [0.115, 0.105], rz: [0.1, 0.095], gap: [0.75, 0.55], folds: 0, rows: 5, cols: 48, zoff: -0.012, seed: 3 });
  add(new THREE.Mesh(colGeo, coatM));
  const head = new THREE.Group(); head.position.set(0, 1.5, 0); root.add(head);
  head.add(limb([[0, -0.02, -0.005], [0, 0.08, 0.0]], [0.055, 0.05], skin, 4, 14));
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.1, 28, 20), skin); skull.scale.set(0.84, 1.08, 0.98); skull.position.set(0, 0.17, -0.005); head.add(skull);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.068, 20, 14), skin); jaw.scale.set(1.0, 0.85, 0.9); jaw.position.set(0, 0.105, 0.012); head.add(jaw);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.04, 10), skin); nose.position.set(0, 0.155, 0.095); nose.rotation.x = Math.PI / 2 + 0.5; head.add(nose);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), skin); e.scale.set(0.5, 1.1, 0.8); e.position.set(s * 0.083, 0.165, -0.01); head.add(e); }
  if (opt.hard) { // white hard hat with a brim ridge
    const hm = new THREE.MeshStandardMaterial({ color: 0xe8e6e0, roughness: 0.35 });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.125, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), hm); dome.scale.set(1, 0.85, 1.12); dome.position.set(0, 0.235, 0.0); head.add(dome);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.012, 40), hm); brim.scale.z = 1.18; brim.position.set(0, 0.235, 0.012); head.add(brim);
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.02, 0.26), hm); ridge.position.set(0, 0.34, 0.0); head.add(ridge);
  } else {
  // brakeman's cap with a visor; a short beard line
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.098, 0.1, 0.075, 32), capM); cap.position.set(0, 0.27, -0.005); head.add(cap);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.098, 0.012, 32), capM); top.position.set(0, 0.31, -0.005); head.add(top);
  const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.008, 24, 1, false, -0.9, 1.8), mat(0x0c0c10, 0.4)); visor.position.set(0, 0.238, 0.03); visor.rotation.x = 0.18; visor.scale.z = 1.25; head.add(visor);
  }
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { root, head, arm, hand, coat, coatBase: Float32Array.from(coatGeo.attributes.position.array) };
}

// railroad lantern: origin at the top of the bail (where the hand holds it)
export function makeLantern() {
  const g = new THREE.Group(); const tin = mat(0x6a6a66, 0.45, 0.8), dark = mat(0x22221e, 0.6, 0.6);
  const bail = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.005, 6, 24, Math.PI), tin); bail.rotation.z = Math.PI; bail.position.y = -0.075; g.add(bail);
  const capg = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.05, 20), dark); capg.position.y = -0.16; g.add(capg);
  const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.04, 20), tin); vent.position.y = -0.2; g.add(vent);
  const prof = [[0.045, 0], [0.07, 0.03], [0.072, 0.08], [0.058, 0.13], [0.045, 0.145]].map(([r, y]) => new THREE.Vector2(r, y));
  const globeMat = new THREE.MeshStandardMaterial({ color: 0x401010, emissive: new THREE.Color(3.2, 0.35, 0.12), roughness: 0.15, metalness: 0.0, transparent: true, opacity: 0.95 });
  const globe = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), globeMat); globe.position.y = -0.37; g.add(globe);
  for (const y of [-0.22, -0.3, -0.37]) { const r = new THREE.Mesh(new THREE.TorusGeometry(y === -0.3 ? 0.076 : 0.066, 0.004, 6, 28), tin); r.rotation.x = Math.PI / 2; r.position.y = y; g.add(r); }
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; const w = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.16, 5), tin); w.position.set(Math.cos(a) * 0.074, -0.3, Math.sin(a) * 0.074); g.add(w); }
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.05, 24), tin); base.position.y = -0.4; g.add(base);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 4.5, 1.6), fog: false })); flame.scale.y = 1.8; flame.position.y = -0.31; g.add(flame);
  g.traverse((o) => { if (o.isMesh && o !== flame && o !== globe) o.castShadow = true; });
  return { g, globeMat, flame };
}
