// Inside the ear: a soft pink tunnel into a chamber where the balance organ lives. A glass globe of blue fluid with
// white crystals always settles toward true "down"; three glass loops; sensor hairs that bend; light pulses running
// out along a nerve. The chamber (and the camera) turn with the cat's head, so the fluid seems to swing.
import * as THREE from './three.module.js';
import { toon, sphere, outlined, mulberry, mix, sstep } from './toon.js';

export const INNER_O = new THREE.Vector3(0, -300, 0);

export function buildInner(scene) {
  const root = new THREE.Group(); root.position.copy(INNER_O); scene.add(root);
  const chamber = new THREE.Group(); root.add(chamber);          // rotates with the head
  const pinkM = toon(0xf2a3ad, { side: THREE.BackSide }), pinkDeep = toon(0xd9798a, { side: THREE.BackSide });
  // tunnel: lumpy pink tube from the ear opening to the chamber
  const path = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 14), new THREE.Vector3(0.6, 0.3, 9), new THREE.Vector3(-0.4, -0.2, 5), new THREE.Vector3(0, 0, 2.6)]);
  const tg = new THREE.TubeGeometry(path, 80, 1, 28, false); const pa = tg.attributes.position; const c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= 80; i++) { path.getPointAt(i / 80, c); const rr = mix(0.7, 1.5, i / 80); for (let j = 0; j <= 28; j++) { const k = i * 29 + j; v.fromBufferAttribute(pa, k).sub(c); const a = Math.atan2(v.y, v.x); const bump = 1 + 0.12 * Math.sin(a * 5 + i * 0.4) * Math.sin(i * 0.25); v.multiplyScalar(rr * bump).add(c); pa.setXYZ(k, v.x, v.y, v.z); } }
  tg.computeVertexNormals();
  chamber.add(new THREE.Mesh(tg, pinkM));
  // the chamber
  const room = new THREE.Mesh(new THREE.SphereGeometry(3.0, 48, 32), pinkDeep); chamber.add(room);
  // three glass loops (semicircular canals) on three planes, with a glowing bead each that runs when the head turns
  const glassM = new THREE.MeshToonMaterial({ color: 0xd9f2ff, transparent: true, opacity: 0.35, depthWrite: false });
  const loops = [];
  const loopAt = (rot, pos, col) => {
    const g = new THREE.Group(); g.rotation.set(...rot); g.position.set(...pos); chamber.add(g);
    g.add(outlined(new THREE.TorusGeometry(0.7, 0.07, 14, 60, Math.PI * 1.6), glassM, 0.012));
    const fl = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.04, 10, 60, Math.PI * 1.6), toon(0x3f8fe0)); g.add(fl);
    const bead = sphere(0.06, new THREE.MeshBasicMaterial({ color: col }), 1, 1, 1, 0); g.add(bead);
    loops.push({ g, bead });
  };
  loopAt([0, 0, 0], [-1.1, 0.9, -0.6], 0xfff27a); loopAt([Math.PI / 2, 0, 0], [0.2, 1.3, -0.9], 0x9cff8a); loopAt([0, Math.PI / 2, 0], [1.2, 0.7, -0.5], 0xff9ad0);
  // the globe: glass, with fluid + crystals that always settle toward true down (kept in a world-aligned group)
  const globe = new THREE.Group(); globe.position.set(0, -0.35, -0.2); chamber.add(globe);
  globe.add(outlined(new THREE.SphereGeometry(0.85, 48, 32), new THREE.MeshToonMaterial({ color: 0xe6f6ff, transparent: true, opacity: 0.28, depthWrite: false }), 0.012));
  const settle = new THREE.Group(); globe.add(settle);
  const fluid = new THREE.Mesh(new THREE.SphereGeometry(0.8, 48, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toon(0x3f8fe0)); settle.add(fluid);
  const top = new THREE.Mesh(new THREE.CircleGeometry(0.8, 48), toon(0x6fb6f2)); top.rotation.x = -Math.PI / 2; settle.add(top);
  const r = mulberry(5); const crystals = new THREE.Group(); settle.add(crystals);
  for (let k = 0; k < 26; k++) { const a = r() * 6.28, d = Math.sqrt(r()) * 0.55; const cr = outlined(new THREE.OctahedronGeometry(0.06 + r() * 0.03), toon(0xffffff), 0.006); cr.position.set(Math.cos(a) * d, -0.62 + (0.55 - d) * -0.15 + r() * 0.05, Math.sin(a) * d); cr.rotation.set(r() * 3, r() * 3, r() * 3); crystals.add(cr); }
  // sensor hairs on the globe floor, in the world-aligned group, bending with the slosh
  const hairs = [];
  for (let k = 0; k < 14; k++) { const a = k / 14 * 6.28; const h = new THREE.Group(); h.position.set(Math.cos(a) * 0.5, -0.66, Math.sin(a) * 0.5); settle.add(h); const st = outlined(new THREE.CylinderGeometry(0.012, 0.018, 0.26, 8), toon(0xf7e3c2), 0.004); st.position.y = 0.13; h.add(st); const tip = sphere(0.025, toon(0xffd25a), 1, 1, 1, 0.004, 10); tip.position.y = 0.27; h.add(tip); hairs.push(h); }
  // the nerve: a cable out of the chamber with pulses of light
  const nerve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -1.2, -0.2), new THREE.Vector3(0.4, -2.0, -0.8), new THREE.Vector3(1.6, -2.4, -1.4), new THREE.Vector3(2.8, -2.2, -1.2)]);
  chamber.add(outlined(new THREE.TubeGeometry(nerve, 40, 0.12, 12, false), toon(0xf7e3c2), 0.012));
  const pulses = [];
  for (let k = 0; k < 5; k++) { const p = sphere(0.1, new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.6, 1.2) }), 1, 1, 1, 0, 12); chamber.add(p); pulses.push(p); }
  // soft light inside
  const lamp = new THREE.PointLight(0xffe6e0, 6, 0, 2.0); lamp.position.set(0, 1.2, 1.5); chamber.add(lamp);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return { root, chamber, settle, loops, hairs, pulses, nerve, path };
}

// pose the inner world at film time u in [0,1] across the visit; roll = chamber roll (head upside-down → upright)
export function poseInner(I, u, t) {
  const roll = Math.PI * (1 - sstep(0.18, 0.72, u));
  I.chamber.rotation.set(0, 0, roll);
  I.settle.rotation.set(0, 0, -roll);              // the fluid keeps to true down
  const spin = sstep(0.18, 0.72, u) - sstep(0.18, 0.72, u - 0.02);
  I.loops.forEach((L, i) => { const a = (u * 6.0 + i * 0.8) * (0.4 + 1.6 * Math.max(0, Math.sin(Math.PI * sstep(0.15, 0.8, u)))); L.bead.position.set(Math.cos(a) * 0.7, Math.sin(a) * 0.7, 0); });
  const slosh = Math.sin(Math.PI * sstep(0.18, 0.72, u)) * 0.6 * Math.sin(t * 2.0);
  I.hairs.forEach((h, k) => { h.rotation.z = slosh * (0.6 + 0.4 * Math.sin(k)) + 0.05 * Math.sin(t * 3 + k); });
  const fire = sstep(0.62, 0.7, u);
  I.pulses.forEach((p, k) => { const s = ((u - 0.62) * 3.0 - k * 0.18); p.visible = fire > 0 && s > 0 && s < 1; if (p.visible) p.position.copy(I.nerve.getPointAt(Math.min(1, s))); });
}
