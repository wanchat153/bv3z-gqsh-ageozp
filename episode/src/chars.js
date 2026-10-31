// Original characters: Pip the blue-grey cat (body split in a front and a rear half that roll on their own,
// which is how a cat rights itself) and Biscuit the short-legged tan pup.
import * as THREE from './three.module.js';
import { toon, sphere, capsule, bone, outlined, clamp, mix } from './toon.js';

const FUR = 0x8fa3bf, WHITE = 0xf4f1ea, PINK = 0xf29bb0, INKC = 0x1a1420;

// tapered tube along a curve (rebuilt per frame for tails)
function taperTube(pts, r0, r1, segs = 24, radial = 12) {
  const curve = new THREE.CatmullRomCurve3(pts);
  const g = new THREE.TubeGeometry(curve, segs, 1, radial, false); const pa = g.attributes.position; const c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) { curve.getPointAt(i / segs, c); const r = mix(r0, r1, Math.pow(i / segs, 1.3)); for (let j = 0; j <= radial; j++) { const k = i * (radial + 1) + j; v.fromBufferAttribute(pa, k).sub(c).multiplyScalar(r).add(c); pa.setXYZ(k, v.x, v.y, v.z); } }
  g.computeVertexNormals(); return g;
}

function makeLeg(furM, pawM, upper, lower, r, w) {
  const sh = new THREE.Group();
  sh.add(bone(r, upper, furM, w));
  const knee = new THREE.Group(); knee.position.y = -upper; sh.add(knee);
  knee.add(bone(r * 0.88, lower, furM, w));
  const paw = sphere(r * 1.15, pawM, 1.1, 0.7, 1.35, w); paw.position.set(0, -lower - r * 0.2, r * 0.35); knee.add(paw);
  return { sh, knee, paw };
}

function makeEye(x, s = 1) {
  const g = new THREE.Group(); g.position.set(x, 0.018, 0.07);
  const sclera = sphere(0.024 * s, toon(0xffffff), 1, 1.15, 0.55, 0.004); g.add(sclera);
  const pupilM = new THREE.MeshBasicMaterial({ color: INKC });
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.0145 * s, 20, 14), pupilM); pupil.scale.set(0.75, 1, 0.4); pupil.position.z = 0.009; g.add(pupil);
  const hl = new THREE.Mesh(new THREE.SphereGeometry(0.0045 * s, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); hl.position.set(0.006, 0.008, 0.016); g.add(hl);
  return { g, pupil };
}

export function makeCat() {
  const fur = toon(FUR), white = toon(WHITE), pink = toon(PINK), W = 0.0065;
  const root = new THREE.Group();
  const mid = sphere(0.1, fur, 1.0, 0.95, 1.3, W); root.add(mid);
  const front = new THREE.Group(), rear = new THREE.Group(); root.add(front, rear);
  const chest = sphere(0.105, fur, 1.0, 0.98, 1.25, W); chest.position.z = 0.085; front.add(chest);
  const bib = sphere(0.07, white, 1.0, 1.0, 0.8, W); bib.position.set(0, -0.045, 0.15); front.add(bib);
  const hips = sphere(0.112, fur, 1.0, 0.98, 1.2, W); hips.position.z = -0.09; rear.add(hips);
  // head
  const head = new THREE.Group(); head.position.set(0, 0.075, 0.2); front.add(head);
  const skull = sphere(0.088, fur, 1.12, 0.95, 0.95, W); head.add(skull);
  for (const s of [-1, 1]) { const ch = sphere(0.042, fur, 1, 0.85, 0.9, W); ch.position.set(s * 0.05, -0.03, 0.035); head.add(ch); }
  const muzzle = sphere(0.033, white, 1.35, 0.8, 0.85, W); muzzle.position.set(0, -0.028, 0.072); head.add(muzzle);
  const nose = sphere(0.011, pink, 1.3, 0.8, 0.8, 0.003); nose.position.set(0, -0.008, 0.098); head.add(nose);
  const ears = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(s * 0.052, 0.068, -0.005); e.rotation.set(-0.15, 0, -s * 0.38); head.add(e);
    const o = outlined(new THREE.ConeGeometry(0.036, 0.075, 4, 1), fur, W); o.rotation.y = Math.PI / 4; e.add(o);
    const i = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.05, 4, 1), pink); i.rotation.y = Math.PI / 4; i.position.set(0, -0.006, 0.01); e.add(i);
    ears.push(e);
  }
  const eyes = [makeEye(-0.038, 1.3), makeEye(0.038, 1.3)]; eyes.forEach((e) => head.add(e.g));
  const lidM = toon(FUR);
  const lids = eyes.map((e) => { const l = new THREE.Mesh(new THREE.SphereGeometry(0.0332, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), lidM); l.scale.set(1.05, 1.2, 0.62); e.g.add(l); return l; });
  const wM = new THREE.MeshBasicMaterial({ color: INKC });
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const wk = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0008, 0.09, 4), wM); wk.rotation.z = Math.PI / 2 + s * (k - 1) * 0.18; wk.position.set(s * 0.075, -0.026 - k * 0.006, 0.07); head.add(wk); }
  // legs
  const legs = {};
  for (const [k, grp, x, z] of [['FL', front, 0.055, 0.13], ['FR', front, -0.055, 0.13], ['HL', rear, 0.062, -0.13], ['HR', rear, -0.062, -0.13]]) {
    const L = makeLeg(fur, white, 0.095, 0.085, 0.03, W); L.sh.position.set(x, -0.05, z); grp.add(L.sh); legs[k] = L;
  }
  // tail (rebuilt per pose)
  const tailMesh = new THREE.Mesh(new THREE.BufferGeometry(), fur); tailMesh.castShadow = true;
  const tailInk = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: INKC, side: THREE.BackSide }));
  const tailTip = sphere(0.02, white, 1, 1, 1, W);
  const tail = new THREE.Group(); tail.position.set(0, 0.045, -0.2); rear.add(tail); tail.add(tailMesh, tailInk, tailTip);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  return { root, mid, front, rear, head, eyes, lids, ears, legs, tail, tailMesh, tailInk, tailTip };
}

// pose: aF/aR roll of front/rear halves, arch, legs {sw, bend, splay}, head {yaw,pitch,roll}, eye {open, look:[x,y], size}, tail {curl, up, sway}
export function poseCat(C, p) {
  C.front.rotation.set(-(p.arch || 0), 0, p.aF || 0, 'ZXY'); C.rear.rotation.set(p.arch || 0, 0, p.aR || 0, 'ZXY');
  C.mid.rotation.z = ((p.aF || 0) + (p.aR || 0)) / 2;
  for (const k of ['FL', 'FR', 'HL', 'HR']) {
    const L = C.legs[k], q = p.legs[k], s = k.endsWith('L') ? 1 : -1;
    L.sh.rotation.set(q.sw, 0, s * (q.splay || 0)); L.knee.rotation.x = q.bend;
  }
  const h = p.head || {}; C.head.rotation.set(h.pitch || 0, h.yaw || 0, h.roll || 0);
  const e = p.eye || { open: 1 };
  C.lids.forEach((l, i) => { l.rotation.x = mix(Math.PI * 0.5, -1.1, clamp(e.open, 0, 1)); });
  C.eyes.forEach((ey) => { const sz = e.size || 1; ey.pupil.scale.set(0.75 * sz, sz, 0.4); ey.pupil.position.x = (e.look ? e.look[0] : 0) * 0.008; ey.pupil.position.y = (e.look ? e.look[1] : 0) * 0.008; });
  const t = p.tail || { curl: 0.4, up: 0.3, sway: 0 };
  const pts = []; let pos = new THREE.Vector3(0, 0, 0); let ang = -t.up; let yaw = t.sway;
  for (let i = 0; i < 7; i++) { pts.push(pos.clone()); const seg = 0.045; ang += t.curl * 0.35; yaw += t.sway * 0.15; pos = pos.clone().add(new THREE.Vector3(Math.sin(yaw) * Math.cos(ang) * seg, Math.sin(ang) * seg * -1, -Math.cos(yaw) * Math.cos(ang) * seg)); }
  const g = taperTube(pts, 0.024, 0.016, 28, 12);
  C.tailMesh.geometry.dispose(); C.tailMesh.geometry = g;
  const gi = g.clone(); { const pa = gi.attributes.position, n = gi.attributes.normal; for (let i = 0; i < pa.count; i++) pa.setXYZ(i, pa.getX(i) + n.getX(i) * 0.006, pa.getY(i) + n.getY(i) * 0.006, pa.getZ(i) + n.getZ(i) * 0.006); }
  C.tailInk.geometry.dispose(); C.tailInk.geometry = gi;
  C.tailTip.position.copy(pts[pts.length - 1]);
}

// standing / sitting reference poses
export const LEG = (sw = 0, bend = 0, splay = 0) => ({ sw, bend, splay });
export const STAND = () => ({ aF: 0, aR: 0, arch: 0, legs: { FL: LEG(), FR: LEG(), HL: LEG(), HR: LEG() }, head: {}, eye: { open: 1, size: 1 }, tail: { curl: 0.5, up: 0.6, sway: 0 } });

// ---------------- the pup ----------------
export function makeDog() {
  const tan = toon(0xd9a066), dark = toon(0x7a4a2a), cream = toon(0xf1dfc0), red = toon(0xd83a34), W = 0.007;
  const root = new THREE.Group();
  const body = sphere(0.13, tan, 1.0, 0.9, 1.45, W); root.add(body);
  const belly = sphere(0.09, cream, 1.0, 0.8, 1.3, W); belly.position.set(0, -0.05, 0.02); root.add(belly);
  const head = new THREE.Group(); head.position.set(0, 0.11, 0.2); root.add(head);
  head.add(sphere(0.105, tan, 1.05, 0.95, 1.0, W));
  const snout = sphere(0.055, cream, 1.0, 0.8, 1.2, W); snout.position.set(0, -0.035, 0.09); head.add(snout);
  const nose = sphere(0.02, toon(0x2a1a14), 1.3, 0.9, 0.9, 0.004); nose.position.set(0, -0.015, 0.155); head.add(nose);
  const tongue = sphere(0.02, toon(0xe86a7a), 0.9, 0.4, 1.4, 0.004); tongue.position.set(0.012, -0.07, 0.12); head.add(tongue);
  const ears = [];
  for (const s of [-1, 1]) { const e = new THREE.Group(); e.position.set(s * 0.085, 0.05, 0.0); head.add(e); const o = sphere(0.045, dark, 0.55, 1.4, 0.9, W); o.position.y = -0.05; e.add(o); ears.push(e); }
  const eyes = [makeEye(-0.04, 1.05), makeEye(0.04, 1.05)]; eyes.forEach((e) => { e.g.position.z = 0.085; e.g.position.y = 0.03; head.add(e.g); });
  const collar = outlined(new THREE.TorusGeometry(0.075, 0.014, 8, 28), red, W); collar.position.set(0, 0.07, 0.17); collar.rotation.x = 1.2; root.add(collar);
  const legs = {};
  for (const [k, x, z] of [['FL', 0.07, 0.12], ['FR', -0.07, 0.12], ['HL', 0.075, -0.13], ['HR', -0.075, -0.13]]) { const L = makeLeg(tan, cream, 0.06, 0.05, 0.034, W); L.sh.position.set(x, -0.06, z); root.add(L.sh); legs[k] = L; }
  const tail = new THREE.Group(); tail.position.set(0, 0.06, -0.19); root.add(tail);
  const tl = bone(0.018, 0.09, tan, W); tl.rotation.x = Math.PI * 0.75; tail.add(tl);
  // dizzy stars, hidden until needed
  const stars = new THREE.Group(); head.add(stars); stars.position.y = 0.16;
  const sm = new THREE.MeshBasicMaterial({ color: 0xffd64a });
  for (let k = 0; k < 4; k++) { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.012 : 0.028, a = i * Math.PI / 5; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(r, 0); } const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.006, bevelEnabled: false }), sm); const a = k * Math.PI / 2; m.position.set(Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12); stars.add(m); }
  stars.visible = false;
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { root, head, ears, eyes, legs, tail, stars, tongue };
}
