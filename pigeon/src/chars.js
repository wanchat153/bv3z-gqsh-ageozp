// Characters and props, all full 3D toon: the man on the bench (two-bone IK arms that can rubber-hose stretch),
// the pigeon (folding/flapping wings, bobbing head, opening beak), the ice cream cone and scoop, the idea bulb,
// dizzy stars, a sweat drop, feathers.
import * as THREE from './three.module.js';
import { toon, sphere, capsule, outlined, clamp } from './toon.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UPY = V(0, 1, 0);
// a capsule segment between two points (unit-length capsule scaled along y)
export function makeSeg(r, mat, w = 0.006, nominal = 0.22) {
  const g = new THREE.Group(); const c = capsule(r, nominal, mat, w); g.add(c); g.userData.nom = nominal + 2 * r; g.userData.r = r; return g;
}
export function placeSeg(g, a, b) {
  const d = b.clone().sub(a); const L = d.length(); g.position.copy(a).addScaledVector(d, 0.5);
  g.quaternion.setFromUnitVectors(UPY, d.normalize());
  const k = Math.max(0.3, (L + 2 * g.userData.r * 0.6) / g.userData.nom); g.scale.set(1, k, 1);
}
// two-bone IK with rubber-hose stretch when the target is out of reach
export function ik(S, H, a, b, pole) {
  const d = H.clone().sub(S); let L = d.length(); const dir = d.clone().normalize();
  let k = 1; if (L > (a + b) * 0.995) { k = Math.min(1.9, L / ((a + b) * 0.995)); }
  const A = a * k, Bb = b * k; L = Math.max(L, Math.abs(A - Bb) + 1e-4);
  const ca = clamp((A * A + L * L - Bb * Bb) / (2 * A * L), -1, 1), sa = Math.sqrt(1 - ca * ca);
  const pp = pole.clone().sub(S); pp.addScaledVector(dir, -pp.dot(dir)); if (pp.lengthSq() < 1e-8) pp.set(0, -1, 0); pp.normalize();
  return S.clone().addScaledVector(dir, A * ca).addScaledVector(pp, A * sa);
}

// ---------------- the man ----------------
export function makeMan() {
  const skin = toon(0xffcca6), shirt = toon(0xf2604a), pants = toon(0x2e4277), shoe = toon(0x5a3524), hair = toon(0x6b4127);
  const hatM = toon(0xf4b63a), hatBand = toon(0x2e4277), white = toon(0xffffff), black = new THREE.MeshBasicMaterial({ color: 0x1a1420 });
  const nose = toon(0xff9c84), mouthM = new THREE.MeshBasicMaterial({ color: 0x5a1f2b }), tongueM = toon(0xff6f8a), blushM = new THREE.MeshBasicMaterial({ color: 0xff8f8f, transparent: true, opacity: 0.55, depthWrite: false });
  const root = new THREE.Group();
  const torso = new THREE.Group(); torso.position.set(0, 0.5, 0); root.add(torso);
  const body = sphere(0.3, shirt, 1.05, 1.0, 0.9, 0.008, 40); body.position.set(0, 0.27, 0); torso.add(body);
  const collar = outlined(new THREE.TorusGeometry(0.1, 0.03, 10, 24), white, 0.005); collar.rotation.x = Math.PI / 2 - 0.2; collar.position.set(0, 0.55, 0.02); torso.add(collar);
  for (let i = 0; i < 3; i++) { const b = sphere(0.016, white, 1, 1, 0.6, 0.003, 10); b.position.set(0, 0.45 - i * 0.1, 0.27 - i * 0.002 + (i === 2 ? -0.01 : 0)); torso.add(b); }
  const neck = new THREE.Group(); neck.position.set(0, 0.58, 0.02); torso.add(neck);
  const head = new THREE.Group(); head.position.set(0, 0.16, 0.0); neck.add(head);
  const skull = sphere(0.24, skin, 1, 0.98, 0.95, 0.008, 40); head.add(skull);
  for (const s of [-1, 1]) { const e = sphere(0.055, skin, 0.55, 1, 0.8, 0.005, 14); e.position.set(s * 0.232, -0.01, -0.01); head.add(e); }
  for (const s of [-1, 1]) { const h = sphere(0.07, hair, 0.6, 1, 1, 0.005, 14); h.position.set(s * 0.2, 0.06, -0.07); head.add(h); }
  // hat (the flock's favourite seat)
  const hat = new THREE.Group(); hat.position.set(0, 0.15, -0.01); hat.rotation.x = -0.12; head.add(hat);
  const brim = outlined(new THREE.CylinderGeometry(0.27, 0.27, 0.02, 32), hatM, 0.005); hat.add(brim);
  const crown = sphere(0.19, hatM, 1, 0.55, 1, 0.006, 28); crown.position.y = 0.02; hat.add(crown);
  const hb = outlined(new THREE.CylinderGeometry(0.192, 0.195, 0.035, 28, 1, true), hatBand, 0.0); hb.position.y = 0.03; hat.add(hb);
  // face
  const eyes = [], pupils = [], brows = [];
  for (const s of [-1, 1]) {
    const ew = sphere(0.06, white, 1, 1.2, 0.6, 0.005, 20); ew.position.set(s * 0.085, 0.045, 0.2); head.add(ew); eyes.push(ew);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.027, 14, 10), black); p.position.set(s * 0.085, 0.045, 0.235); head.add(p); pupils.push(p);
    const b = capsule(0.014, 0.06, hair, 0.003); b.rotation.z = Math.PI / 2; b.position.set(s * 0.09, 0.14, 0.205); head.add(b); brows.push(b);
  }
  const nz = sphere(0.064, nose, 1, 0.9, 1, 0.005, 20); nz.position.set(0, -0.02, 0.245); head.add(nz);
  for (const s of [-1, 1]) { const m = sphere(0.05, hair, 1.4, 0.6, 0.7, 0.004, 14); m.position.set(s * 0.055, -0.085, 0.225); m.rotation.z = s * 0.35; head.add(m); }
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 12), mouthM); mouth.position.set(0, -0.145, 0.205); head.add(mouth);
  const tongue = sphere(0.03, tongueM, 1.1, 0.5, 1.2, 0.003, 12); tongue.position.set(0, -0.16, 0.24); head.add(tongue);
  const smileG = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.009, 8, 20, Math.PI), black); smileG.position.set(0, -0.125, 0.215); head.add(smileG);
  const blush = []; for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.04, 14, 10), blushM); b.scale.set(1.2, 0.6, 0.4); b.position.set(s * 0.16, -0.05, 0.185); head.add(b); blush.push(b); }
  // legs (seated, never move)
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = V(s * 0.12, 0.5, 0.05), knee = V(s * 0.14, 0.5, 0.42), ank = V(s * 0.15, 0.12, 0.46);
    const th = makeSeg(0.085, pants, 0.007); placeSeg(th, hip, knee); root.add(th);
    const sh = makeSeg(0.07, pants, 0.007); placeSeg(sh, knee, ank); root.add(sh);
    const f = sphere(0.075, shoe, 1, 0.6, 1.5, 0.006, 16); f.position.set(s * 0.15, 0.05, 0.52); root.add(f); legs.push(th, sh);
  }
  // arms: segments live in root space (root is never rotated)
  const UA = 0.22, FA = 0.22;
  const arm = {};
  for (const k of ['P', 'N']) {
    const s = k === 'P' ? 1 : -1;
    const sl = sphere(0.075, shirt, 1, 1, 1, 0.006, 16);
    const up = makeSeg(0.055, shirt, 0.006, UA - 0.08), lo = makeSeg(0.045, skin, 0.005, FA - 0.08);
    const hand = new THREE.Group(); const palm = sphere(0.055, skin, 1, 0.9, 1, 0.005, 16); hand.add(palm);
    const th = sphere(0.022, skin, 1, 1, 1, 0.003, 10); th.position.set(-s * 0.045, 0.02, 0.025); hand.add(th);
    root.add(sl, up, lo, hand); arm[k] = { s, sl, up, lo, hand, sh: V(s * 0.25, 0.42, 0.0) };
  }
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  const tmp = new THREE.Vector3();
  function pose(p) {
    torso.rotation.set(p.lean || 0, p.twist || 0, p.side || 0);
    neck.rotation.set(-(p.headPitch || 0) * 0.5, (p.headYaw || 0) * 0.5, (p.headTilt || 0) * 0.5);
    head.rotation.set(-(p.headPitch || 0) * 0.5, (p.headYaw || 0) * 0.5, (p.headTilt || 0) * 0.5);
    head.position.y = 0.16 + (p.headBob || 0);
    const op = [p.eyeN ?? 1, p.eyeP ?? 1];
    for (let i = 0; i < 2; i++) {
      const o = clamp(op[i], 0, 1.3); eyes[i].scale.set(1, Math.max(0.1, 1.2 * o), 0.6);
      const lx = (p.look ? p.look[0] : 0) * 0.03, ly = (p.look ? p.look[1] : 0) * 0.03 * o;
      pupils[i].position.set((i ? 1 : -1) * 0.085 + lx, 0.045 + ly, 0.235); pupils[i].visible = o > 0.28; pupils[i].scale.set(1, Math.min(1, o * 1.2), 1);
      const ba = (p.browAng || 0) * (i ? -1 : 1); brows[i].rotation.z = Math.PI / 2 + ba; brows[i].position.y = 0.14 + (p.brow || 0) * 0.03 + (o < 0.5 ? -0.01 : 0);
    }
    const mo = clamp(p.mouth || 0, 0, 1);
    mouth.visible = mo > 0.08; mouth.scale.set(0.8 + 0.6 * mo + (p.wide || 0) * 0.5, 0.25 + 1.0 * mo, 0.5);
    tongue.visible = (p.tongue || 0) > 0.02; tongue.position.z = 0.215 + 0.05 * (p.tongue || 0); tongue.position.y = -0.16 - 0.01 * (p.tongue || 0);
    const sm = p.smile ?? 0.4; smileG.visible = mo <= 0.08 && Math.abs(sm) > 0.05;
    smileG.rotation.z = sm >= 0 ? Math.PI : 0; smileG.scale.set(0.6 + 0.6 * Math.abs(sm), 0.4 + 0.8 * Math.abs(sm), 1); smileG.position.y = sm >= 0 ? -0.115 : -0.155;
    blush.forEach((b) => (b.visible = (p.blush || 0) > 0.05)); blush.forEach((b) => (b.material.opacity = 0.55 * (p.blush || 0)));
    hat.position.y = 0.15 + (p.hatPop || 0); hat.rotation.z = (p.hatTilt || 0);
    root.updateMatrixWorld(true);
    for (const k of ['P', 'N']) {
      const A = arm[k]; const S = A.sh.clone(); torso.localToWorld(S); root.worldToLocal(S);
      const H = p['hand' + k] ? root.worldToLocal(p['hand' + k].clone()) : V(A.s * 0.3, 0.62, 0.25);
      const pole = S.clone().add(V(A.s * 0.35, -0.35, -0.25)).add(p['pole' + k] || V(0, 0, 0));
      const E = ik(S, H, UA, FA, pole);
      A.sl.position.copy(S); placeSeg(A.up, S, E); placeSeg(A.lo, E, H); A.hand.position.copy(H);
      A.hand.rotation.set(0, 0, p['handRot' + k] || 0);
    }
  }
  function headWorld(local) { root.updateMatrixWorld(true); return head.localToWorld(local.clone()); }
  return { root, torso, head, hat, pose, headWorld, arm };
}

// ---------------- the pigeon ----------------
export function makePigeon(tint = 0) {
  const c = new THREE.Color(0x98a3c2).offsetHSL(0, 0, tint * 0.06);
  const bodyM = toon(c), wingM = toon(new THREE.Color(0x7c87a8).offsetHSL(0, 0, tint * 0.05)), darkM = toon(0x434a66), neckG = toon(0x3db58a), neckP = toon(0x9a62c4);
  const beakM = toon(0xf2a33a), eyeM = toon(0xff8a2a), black = new THREE.MeshBasicMaterial({ color: 0x1a1420 }), legM = toon(0xff7f8f), cereM = toon(0xf4f1ea);
  const root = new THREE.Group(); const tilt = new THREE.Group(); root.add(tilt);
  const body = new THREE.Group(); body.position.y = 0.1; tilt.add(body);
  const torso = sphere(0.085, bodyM, 0.95, 0.85, 1.3, 0.005, 24); torso.rotation.x = -0.18; body.add(torso);
  const ng = sphere(0.058, neckG, 1, 1, 0.9, 0.004, 18); ng.position.set(0, 0.055, 0.075); body.add(ng);
  const np = sphere(0.05, neckP, 1, 0.9, 0.9, 0.0, 16); np.position.set(0, 0.03, 0.09); body.add(np);
  const tail = sphere(0.06, darkM, 0.9, 0.22, 1.25, 0.004, 14); tail.position.set(0, 0.0, -0.14); tail.rotation.x = 0.25; body.add(tail);
  const headP = new THREE.Group(); headP.position.set(0, 0.08, 0.09); body.add(headP);
  const head = sphere(0.052, bodyM, 1, 1, 1.05, 0.005, 20); head.position.set(0, 0.035, 0.02); headP.add(head);
  const eyesG = []; for (const s of [-1, 1]) { const e = sphere(0.015, eyeM, 1, 1, 1, 0.003, 10); e.position.set(s * 0.036, 0.048, 0.045); headP.add(e); const p = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), black); p.position.set(s * 0.045, 0.05, 0.052); headP.add(p); eyesG.push(e, p); }
  const beakU = new THREE.Group(); beakU.position.set(0, 0.03, 0.068); headP.add(beakU);
  const bu = outlined(new THREE.ConeGeometry(0.013, 0.05, 10), beakM, 0.003); bu.rotation.x = Math.PI / 2; bu.position.z = 0.022; beakU.add(bu);
  const cere = sphere(0.009, cereM, 1.3, 0.8, 1, 0.0, 8); cere.position.set(0, 0.009, 0.004); beakU.add(cere);
  const beakL = new THREE.Group(); beakL.position.set(0, 0.022, 0.068); headP.add(beakL);
  const bl = outlined(new THREE.ConeGeometry(0.009, 0.038, 8), beakM, 0.003); bl.rotation.x = Math.PI / 2; bl.position.z = 0.017; beakL.add(bl);
  const tip = new THREE.Object3D(); tip.position.set(0, 0.02, 0.105); headP.add(tip);   // where stolen things are held
  const wings = [];
  for (const s of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(s * 0.06, 0.035, 0.02); body.add(piv);
    const wi = new THREE.Group(); piv.add(wi);
    const w = sphere(0.075, wingM, 0.28, 0.55, 1.25, 0.004, 16); w.position.set(s * 0.02, -0.01, -0.05); wi.add(w);
    const wt = sphere(0.05, darkM, 0.25, 0.4, 1.1, 0.003, 12); wt.position.set(s * 0.022, -0.012, -0.12); wi.add(wt);
    const bar = sphere(0.045, darkM, 0.27, 0.12, 0.6, 0.0, 10); bar.position.set(s * 0.03, -0.0, -0.04); wi.add(bar);
    wings.push({ piv, wi, s });
  }
  const legs = [];
  for (const s of [-1, 1]) { const l = new THREE.Group(); l.position.set(s * 0.025, 0.05, 0.0); body.add(l); const c2 = capsule(0.008, 0.045, legM, 0.002); c2.position.y = -0.03; l.add(c2); const toe = sphere(0.016, legM, 1, 0.35, 1.6, 0.002, 8); toe.position.set(0, -0.062, 0.012); l.add(toe); legs.push(l); }
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const wp = new THREE.Vector3();
  function set(s) {
    root.position.copy(s.pos); root.rotation.set(0, s.yaw || 0, 0); root.scale.setScalar(s.scale || 1);
    tilt.rotation.set(s.pitch || 0, 0, s.roll || 0);
    const cr = s.crouch || 0, sq = s.squash || 1;
    body.position.y = 0.1 - 0.035 * cr; body.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    headP.rotation.set(-(s.headPitch || 0), s.headYaw || 0, s.headRoll || 0); headP.position.set(0, 0.08 - 0.02 * cr, 0.09 + (s.bob || 0));
    beakL.rotation.x = 0.7 * (s.beak || 0);
    const op = s.open || 0, ph = s.flap || 0;
    wings.forEach(({ piv, wi, s: sd }) => {
      const flapA = op * (1.25 + 0.95 * Math.sin(ph)); piv.rotation.set(0, 0, sd * (0.08 + flapA)); wi.rotation.set(-0.25 * op * Math.cos(ph), 0, 0);
      wi.scale.set(1, 1 + 0.5 * op, 1 + 0.25 * op);
    });
    const lg = s.legs ?? 1; legs.forEach((l) => { l.rotation.x = (1 - lg) * 1.2; l.scale.y = 0.4 + 0.6 * lg; });
    const ey = s.eyesShut ? 0.15 : 1; eyesG.forEach((e) => (e.scale.y = ey));
  }
  function tipWorld() { root.updateMatrixWorld(true); return tip.getWorldPosition(wp).clone(); }
  return { root, set, tipWorld, head: headP };
}

// ---------------- props ----------------
const waffle = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#e2a65a'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#b97834'; x.lineWidth = 5;
  for (let i = -128; i < 256; i += 22) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 128, 128); x.stroke(); x.beginPath(); x.moveTo(i + 128, 0); x.lineTo(i, 128); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1); return t; })();
export function makeCone() {
  const g = new THREE.Group();
  const m = new THREE.MeshToonMaterial({ map: waffle, gradientMap: toon(0).gradientMap });
  const c = outlined(new THREE.ConeGeometry(0.05, 0.17, 24, 1, true), m, 0.004); c.rotation.x = Math.PI; g.add(c);
  const rim = outlined(new THREE.TorusGeometry(0.05, 0.008, 8, 24), toon(0xd8964a), 0.003); rim.rotation.x = Math.PI / 2; rim.position.y = 0.085; g.add(rim);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;   // origin = cone middle; scoop sits at +0.12
}
export function makeScoop(color = 0xff8fb1) {
  const g = new THREE.Group(); const m = toon(color);
  const s = sphere(0.062, m, 1, 0.92, 1, 0.005, 28); g.add(s);
  const drip = outlined(new THREE.TorusGeometry(0.052, 0.017, 10, 28), m, 0.004); drip.rotation.x = Math.PI / 2; drip.position.y = -0.035; g.add(drip);
  for (const [x, z] of [[0.025, 0.05], [-0.04, 0.035], [0.05, -0.02]]) { const d = sphere(0.014, m, 1, 1.6, 1, 0.003, 8); d.position.set(x, -0.06, z); g.add(d); }
  const cols = [0xffffff, 0x5ad1ff, 0xffd23f, 0x7ee081]; const rr = [[0.02, 0.05, 0.03], [-0.03, 0.045, 0.035], [0.045, 0.03, -0.01], [-0.01, 0.06, -0.02], [0.0, 0.03, 0.055], [-0.05, 0.02, 0.0]];
  rr.forEach((p, i) => { const sp = new THREE.Mesh(new THREE.CapsuleGeometry(0.004, 0.012, 4, 6), new THREE.MeshBasicMaterial({ color: cols[i % 4] })); sp.position.set(...p); sp.rotation.set(i, i * 2, 0); g.add(sp); });
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
export function makeStone() {
  const g = new THREE.Group(); const m = toon(0x9a9a9a); const s = sphere(0.055, m, 1.05, 0.9, 1, 0.005, 20); g.add(s);
  g.userData.mat = m; g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return g;
}
export function makeBulb() {
  const g = new THREE.Group();
  const glass = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.7, 1.5, 0.55) });
  const b = outlined(new THREE.SphereGeometry(0.08, 24, 16), glass, 0.005); b.position.y = 0.05; g.add(b);
  const base = outlined(new THREE.CylinderGeometry(0.04, 0.035, 0.06, 16), toon(0x9aa3ad), 0.004); base.position.y = -0.04; g.add(base);
  for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.039, 0.006, 6, 16), toon(0x7a838d)); r.rotation.x = Math.PI / 2; r.position.y = -0.055 + i * 0.02; g.add(r); }
  const rays = new THREE.Group(); g.add(rays); const rm = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.25, 0.4) });
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const r = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.05, 4, 6), rm); r.position.set(Math.sin(a) * 0.15, 0.05 + Math.cos(a) * 0.15, 0); r.rotation.z = -a; rays.add(r); }
  g.userData.rays = rays; return g;
}
export function makeStar() {
  const sh = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, r = i % 2 ? 0.012 : 0.028; const x = Math.sin(a) * r, y = Math.cos(a) * r; i ? sh.lineTo(x, y) : sh.moveTo(x, y); }
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.008, bevelEnabled: false }); geo.center();
  return outlined(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.15, 0.3) }), 0.002);
}
export function makeSweat() {
  const g = new THREE.Group(); const m = toon(0x8fd3ff); const s = sphere(0.022, m, 1, 1, 0.7, 0.003, 12); g.add(s);
  const c = outlined(new THREE.ConeGeometry(0.0215, 0.035, 12), m, 0.003); c.position.y = 0.025; g.add(c); return g;
}
export function makeFeather(i) {
  const g = new THREE.Group(); const m = toon(i % 3 ? 0xf3f5fa : 0xaab3cc); const f = sphere(0.03, m, 0.35, 0.12, 1, 0.002, 10); g.add(f); return g;
}
