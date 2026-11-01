// The bronze jar: grey bell body with a seam band, domed lid + knob, 8 gold dragons (snaking bodies + crocodile heads with an
// opening jaw holding a bronze ball), 8 grey frogs sitting below with mouths open upward. All parts are code-built.
// API: const J = makeJar(); scene.add(J.root); J.setJaw(i, open01); J.setBall(i, {state:'held'|'fall'|'caught', u}); J.dragonHead(i) world pos
import * as THREE from './three.module.js';
import { toon, outlined, mulberry } from './toon.js';
import { TEX } from './textures.js';
import { sculptedHead, DRAGON_GOLD } from './dragonhead.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const JAR = { H: 2.4, R: 0.82, N: 8, frogR: 1.62 };   // measured against S06 (body ⌀ ≈ 0.68 × body height, flange ≈ 1.25 × body)

function scaleTex(base = '#d9a92a') {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let j = 0; j < 20; j++) for (let i = 0; i < 20; i++) { const x = i * 13 + (j % 2) * 6.5, y = j * 13;
    const gr = g.createRadialGradient(x + 4, y + 3, 1, x + 6, y + 6, 9); gr.addColorStop(0, '#fff2b0'); gr.addColorStop(0.5, base); gr.addColorStop(1, '#8a6410');
    g.fillStyle = gr; g.beginPath(); g.arc(x + 6, y + 6, 6.5, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const GOLD = new THREE.MeshPhongMaterial({ color: 0xffffff, map: scaleTex(), shininess: 70, specular: 0xfff0b0, emissive: 0x3a2400, emissiveIntensity: 0.4 });
GOLD.map.repeat.set(3, 3);
const GOLDS = new THREE.MeshPhongMaterial({ color: 0xe8b830, shininess: 90, specular: 0xfff6d0, emissive: 0x3a2400, emissiveIntensity: 0.35 });
const MOUTH = new THREE.MeshPhongMaterial({ color: 0x5a1010, shininess: 20 });
const TOOTH = new THREE.MeshPhongMaterial({ color: 0xf2efe4, shininess: 60 });
const DARK = new THREE.MeshBasicMaterial({ color: 0x2a1a16 });
const BRONZE = new THREE.MeshStandardMaterial({ color: 0xc8823a, metalness: 1, roughness: 0.18 }); BRONZE.userData.metal = true;
const STONE = (c) => new THREE.MeshPhongMaterial({ color: c, shininess: 18, specular: 0x404858 });

function dragonHead() {   // crocodile-like: long flat snout, low skull, small brow ridges, nostrils on top, horns + 3 spikes
  const g = new THREE.Group();
  const snout = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.34, 8, 16), GOLD); snout.rotation.z = Math.PI / 2; snout.scale.set(0.72, 1, 0.82); snout.position.set(0.2, 0.03, 0); g.add(snout);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 16), GOLD); skull.scale.set(1.35, 0.78, 0.9); g.add(skull);
  const ridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.22, 6, 10), GOLD); ridge.rotation.z = Math.PI / 2 - 0.12; ridge.position.set(0.1, 0.09, 0); g.add(ridge);
  for (const z of [-0.045, 0.045]) { const n = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), DARK); n.scale.set(1, 0.7, 1); n.position.set(0.4, 0.075, z); g.add(n);
    const nb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), GOLD); nb.scale.set(1.2, 0.6, 1); nb.position.set(0.39, 0.06, z); g.add(nb);
    const brow = new THREE.Mesh(new THREE.SphereGeometry(0.04, 14, 10), GOLD); brow.scale.set(1.6, 0.6, 0.8); brow.position.set(0.04, 0.1, z * 1.9); g.add(brow);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), DARK); eye.position.set(0.06, 0.085, z * 2.2); g.add(eye); }
  // jaw: pivots at the back of the skull
  const jaw = new THREE.Group(); jaw.position.set(-0.02, -0.02, 0); g.add(jaw);
  const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.32, 8, 14), GOLD); lower.rotation.z = Math.PI / 2; lower.scale.set(1, 1, 0.75); lower.position.set(0.2, -0.06, 0); jaw.add(lower);
  const tongue = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.26, 6, 10), MOUTH); tongue.rotation.z = Math.PI / 2; tongue.scale.set(1, 0.5, 0.8); tongue.position.set(0.2, -0.015, 0); jaw.add(tongue);
  const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.26, 6, 10), MOUTH); inner.rotation.z = Math.PI / 2; inner.scale.set(1, 0.4, 0.7); inner.position.set(0.18, -0.02, 0); g.add(inner);
  for (let k = 0; k < 6; k++) for (const z of [-0.045, 0.045]) {
    const tu = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.045, 6), TOOTH); tu.rotation.z = Math.PI; tu.position.set(0.1 + k * 0.05, -0.035, z); g.add(tu);
    const tl = new THREE.Mesh(new THREE.ConeGeometry(0.011, 0.04, 6), TOOTH); tl.position.set(0.12 + k * 0.05, -0.02, z); jaw.add(tl); }
  for (const z of [-0.07, 0.07]) { const h = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.32, 10), GOLDS); h.position.set(-0.16, 0.16, z); h.rotation.set(z > 0 ? 0.25 : -0.25, 0, 1.15); g.add(h); }
  for (let k = 0; k < 3; k++) { const s = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.1 - k * 0.015, 8), GOLDS); s.position.set(-0.02 - k * 0.08, 0.2 - k * 0.01, 0); s.rotation.z = 0.35; g.add(s); }
  g.userData.jaw = jaw; g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function frog() {
  const g = new THREE.Group(); const m = STONE(0x8e939c);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), m); body.scale.set(1, 1.15, 0.95); body.position.y = 0.22; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), m); head.scale.set(1.15, 0.85, 1); head.position.set(0, 0.45, 0.04); g.add(head);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.032, 10, 24), m); lip.rotation.x = -Math.PI / 2 + 0.35; lip.position.set(0, 0.56, 0.07); g.add(lip);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.095, 24), new THREE.MeshBasicMaterial({ color: 0x3a1e18 })); hole.rotation.x = -Math.PI / 2 + 0.35; hole.position.set(0, 0.565, 0.07); g.add(hole);
  for (const x of [-0.11, 0.11]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), m); e.position.set(x, 0.58, -0.02); g.add(e);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), DARK); p.position.set(x * 1.1, 0.6, 0.01); g.add(p); }
  for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.22, 6, 10), m); leg.position.set(s * 0.2, 0.12, 0.05); leg.rotation.z = s * 0.9; g.add(leg);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.2, 6, 10), m); arm.position.set(s * 0.13, 0.12, 0.16); arm.rotation.set(0.3, 0, s * 0.25); g.add(arm);
    for (let k = -1; k <= 1; k++) { const toe = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.07, 4, 6), m); toe.position.set(s * 0.17 + k * 0.035, 0.012, 0.25); toe.rotation.x = Math.PI / 2; g.add(toe); } }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.mouth = V(0, 0.56, 0.07); return g;
}
// a long gold dragon: spiky neck curving out of the jar shoulder, crocodile head pitched down; local +x = outward
function dragon() {
  const g = new THREE.Group();
  const pts = [V(-0.05, 1.56, 0), V(0.18, 1.6, 0), V(0.4, 1.56, 0), V(0.56, 1.46, 0), V(0.64, 1.38, 0)];   // nearly horizontal neck (S06)
  const curve = new THREE.CatmullRomCurve3(pts);
  const neck = new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.075, 18), DRAGON_GOLD); neck.castShadow = true; g.add(neck);
  for (let k = 0; k < 5; k++) { const u = 0.08 + k * 0.17; const p = curve.getPoint(u), tg = curve.getTangent(u); const nrm = V(-tg.y, tg.x, 0).normalize();
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.13 - k * 0.006, 6), GOLDS); sp.position.copy(p).addScaledVector(nrm, 0.08); sp.quaternion.setFromUnitVectors(V(0, 1, 0), nrm.clone().add(tg.clone().multiplyScalar(-0.6)).normalize()); g.add(sp); }
  const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 24), GOLDS); mount.rotation.z = Math.PI / 2; mount.position.set(-0.01, 1.56, 0); g.add(mount);
  const h = sculptedHead(); h.position.copy(pts[4]); h.rotation.z = -0.38; h.scale.setScalar(1.0); g.add(h);
  g.userData.head = h; return g;
}
export function makeJar() {
  const root = new THREE.Group(); const { R, N } = JAR;
  // cloche body: flange foot, straight wall, round shoulder, small domed lid + knob
  const prof = [[0, 0], [R * 1.28, 0], [R * 1.3, 0.04], [R * 1.26, 0.09], [R * 1.04, 0.12], [R * 1.0, 0.18], [R * 0.99, 0.9], [R * 0.97, 1.42], [R * 0.9, 1.68], [R * 0.74, 1.88], [R * 0.5, 2.0], [R * 0.44, 2.02], [0, 2.02]].map(([x, y]) => new THREE.Vector2(x, y));
  const bodyM = new THREE.MeshPhongMaterial({ color: 0xb6bac6, shininess: 22, specular: 0x50586a });
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 80), bodyM); body.castShadow = body.receiveShadow = true; root.add(body);
  const ink = new THREE.Mesh(new THREE.LatheGeometry(prof.map((v) => new THREE.Vector2(v.x ? v.x + 0.012 : 0, v.y)), 80), new THREE.MeshBasicMaterial({ color: 0x2a1a16, side: THREE.BackSide })); root.add(ink);
  const lidProf = [[0, 2.0], [R * 0.48, 2.0], [R * 0.5, 2.04], [R * 0.46, 2.12], [R * 0.34, 2.22], [R * 0.14, 2.26], [0, 2.27]].map(([x, y]) => new THREE.Vector2(x, y));
  const lid = new THREE.Mesh(new THREE.LatheGeometry(lidProf, 64), bodyM); lid.castShadow = true; root.add(lid);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), bodyM); knob.scale.y = 0.85; knob.position.y = 2.33; root.add(knob);
  const heads = [], balls = [], frogs = [], dragons = [];
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2;
    const d = dragon(); const holder = new THREE.Group(); holder.rotation.y = a - Math.PI / 2; d.position.x = R * 0.86; holder.add(d); root.add(holder); dragons.push(d); heads.push(d.userData.head);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.085, 32, 22), BRONZE); ball.castShadow = true; root.add(ball); balls.push(ball);
    const f = frog(); f.scale.setScalar(1.15); f.position.set(Math.sin(a) * JAR.frogR, 0, Math.cos(a) * JAR.frogR); f.rotation.y = a; root.add(f); frogs.push(f);
  }
  root.updateMatrixWorld(true);
  const mouthPos = (i) => heads[i].localToWorld(V(0.3, -0.1, 0));
  const frogMouth = (i) => frogs[i].localToWorld(frogs[i].userData.mouth.clone());
  const api = { root, heads, balls, frogs, dragons,
    setJaw(i, o) { heads[i].userData.jaw.rotation.z = -0.05 - 0.95 * o; },
    setBall(i, st = 'held', u = 0) { const b = balls[i]; b.visible = st !== 'none'; root.updateMatrixWorld(true);
      const p0 = root.worldToLocal(mouthPos(i)), p1 = root.worldToLocal(frogMouth(i)).add(V(0, 0.06, 0));
      if (st === 'held') b.position.copy(p0); else if (st === 'caught') b.position.copy(p1); else if (st === 'fall') { b.position.set(mix(p0.x, p1.x, u), p0.y + (p1.y - p0.y) * u * u, mix(p0.z, p1.z, u)); } },
    headWorld: (i) => mouthPos(i), frogWorld: (i) => frogMouth(i) };
  for (let i = 0; i < N; i++) { api.setJaw(i, 0.55); api.setBall(i, 'held'); }
  return api;
}
const mix = (a, b, u) => a + (b - a) * u;
