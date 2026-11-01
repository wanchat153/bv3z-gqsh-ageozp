// Extra hall props for segment C (S08–S12): cobwebs on the jar (time has passed), the banquet table with food, the
// emperor's gold wine bowl with a still wine surface (his reflection is drawn on it by the film), a pigeon.
// Built before pbrify so they share the hall's physically based look. Every group starts hidden; shots switch them on.
import * as THREE from './three.module.js';
import { makeCard } from './flat.js';
import { mulberry } from './toon.js';
import * as P from './props.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const GOLD = () => new THREE.MeshPhongMaterial({ color: 0xe0b040, shininess: 90, specular: 0xfff0c0, emissive: 0x2a1800, emissiveIntensity: 0.3 });
const WOOD = (c = 0x7a4a2a) => new THREE.MeshPhongMaterial({ color: c, shininess: 18, specular: 0x2a1a10 });

// a dusty spider web drawn on a transparent card
function web(w, seed) {
  return makeCard(w, w, 512, (c, W) => { const r = mulberry(seed); c.clearRect(0, 0, W, W); c.strokeStyle = 'rgba(245,245,250,0.75)'; c.lineCap = 'round';
    const cx = W * (0.15 + r() * 0.2), cy = W * (0.15 + r() * 0.2), n = 9, ang = [];
    for (let k = 0; k < n; k++) ang.push(-0.2 + k / (n - 1) * (Math.PI / 2 + 0.4) + (r() - 0.5) * 0.12);
    c.lineWidth = 2.4; for (const a of ang) { c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * W, cy + Math.sin(a) * W); c.stroke(); }
    c.lineWidth = 1.6; for (let ring = 1; ring < 11; ring++) { const R = ring * W * 0.075; c.beginPath();
      ang.forEach((a, k) => { const rr = R * (0.92 + r() * 0.12); const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; if (!k) c.moveTo(x, y); else { const a0 = ang[k - 1], m = (a + a0) / 2; c.quadraticCurveTo(cx + Math.cos(m) * rr * 0.9, cy + Math.sin(m) * rr * 0.9, x, y); } }); c.stroke(); }
  }, { transparent: true });
}
function roast() { const g = new THREE.Group(); const m = new THREE.MeshPhongMaterial({ color: 0xb8662a, shininess: 60, specular: 0x6a4020 });
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 14), m); b.scale.set(1.25, 0.8, 0.95); b.position.y = 0.09; g.add(b);
  for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.1, 4, 8), m); leg.position.set(0.1, 0.13, s * 0.06); leg.rotation.z = -1.0; g.add(leg);
    const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 6), new THREE.MeshPhongMaterial({ color: 0xf4ecd8 })); bone.position.set(0.17, 0.17, s * 0.06); bone.rotation.z = -1.0; g.add(bone); }
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.02, 28), GOLD()); g.add(plate); return g; }
function goblet(h = 0.16) { const m = GOLD(); const pts = [[0, 0], [0.04, 0], [0.04, 0.008], [0.008, 0.02], [0.007, h * 0.55], [0.03, h * 0.62], [0.045, h * 0.8], [0.048, h], [0.044, h]].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.Mesh(new THREE.LatheGeometry(pts, 24), m); }
function candle(h = 0.25) { const g = new THREE.Group(); const s = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, h, 12), new THREE.MeshPhongMaterial({ color: 0xf6efe0, emissive: 0x3a3020 })); s.position.y = h / 2; g.add(s);
  const st = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.03, 16), GOLD()); g.add(st); return g; }

export function buildHallExtras(scene, H, flame) {
  const web0 = web;
  const X = {}; const r = mulberry(21);
  // --- cobwebs on the jar + the floor around it (S08 "later") ---
  X.webs = new THREE.Group(); scene.add(X.webs);
  // --- banquet: a long table running up the right side of the hall toward the throne ---
  const B = new THREE.Group(); B.position.set(1.75, 0, -3.2); scene.add(B); X.banquet = B;
  const TL = 5.2, TW = 1.05, TH = 0.78;
  const top = P.rbox(TW, 0.07, TL, '#6a4026', 0.01); top.position.y = TH; B.add(top);
  const cloth = new THREE.Mesh(new THREE.BoxGeometry(TW * 0.72, 0.012, TL + 0.02), new THREE.MeshPhongMaterial({ color: 0xf4eee2, shininess: 8 })); cloth.position.y = TH + 0.042; B.add(cloth);
  for (const s of [-1, 1]) { const drop = new THREE.Mesh(new THREE.PlaneGeometry(TL + 0.02, 0.32), new THREE.MeshPhongMaterial({ color: 0xece4d4, side: THREE.DoubleSide })); drop.rotation.y = Math.PI / 2; drop.position.set(s * TW * 0.36, TH - 0.12, 0); B.add(drop); }
  for (const [x, z] of [[-0.42, -2.4], [0.42, -2.4], [-0.42, 2.4], [0.42, 2.4], [-0.42, 0], [0.42, 0]]) { const l = P.rbox(0.08, TH, 0.08, '#5a3420', 0.01); l.position.set(x, TH / 2, z); B.add(l); }
  for (const s of [-1, 1]) { const bench = new THREE.Group(); const seat = P.rbox(0.36, 0.07, TL, '#7a4a2a', 0.01); seat.position.y = 0.46; bench.add(seat);
    for (const z of [-2.3, 0, 2.3]) { const l = P.rbox(0.07, 0.46, 0.07, '#5a3420', 0.01); l.position.set(0, 0.23, z); bench.add(l); } bench.position.x = s * 0.85; B.add(bench); }
  X.flames = [];
  for (let k = 0; k < 4; k++) { const z = -2.1 + k * 1.4;
    const ro = roast(); ro.position.set(0, TH + 0.05, z + 0.25); ro.rotation.y = r() * 3; B.add(ro);
    const cd = candle(0.22 + r() * 0.08); cd.position.set(0.12, TH + 0.05, z - 0.35); B.add(cd); const f = flame(0.07); f.position.set(0.12, TH + 0.33, z - 0.35); B.add(f); X.flames.push(f);
    for (const s of [-1, 1]) { const gb = goblet(); gb.position.set(s * 0.3, TH + 0.05, z + (r() - 0.5) * 0.5); B.add(gb); }
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), GOLD()); bowl.position.set(-0.15, TH + 0.17, z - 0.1); B.add(bowl);
    for (let j = 0; j < 6; j++) { const fr = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), new THREE.MeshPhongMaterial({ color: ['#c8302a', '#6aa83a', '#e8b838', '#7a3a8a'][j % 4], shininess: 60 })); fr.position.set(-0.15 + (r() - 0.5) * 0.12, TH + 0.12 + r() * 0.04, z - 0.1 + (r() - 0.5) * 0.12); B.add(fr); }
    const bread = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.1, 4, 10), new THREE.MeshPhongMaterial({ color: 0xd89a4a })); bread.rotation.z = Math.PI / 2; bread.position.set(0.25, TH + 0.08, z + 0.6); B.add(bread); }
  B.visible = false;
  // --- the emperor's gold wine bowl (S10): footed bowl, dark red wine with a thin bright rim ---
  const C = new THREE.Group(); scene.add(C); X.cup = C;
  const cupPts = [[0, 0], [0.05, 0], [0.055, 0.01], [0.02, 0.025], [0.018, 0.05], [0.06, 0.065], [0.105, 0.1], [0.12, 0.15], [0.122, 0.16], [0.112, 0.16], [0.1, 0.11], [0.05, 0.075], [0, 0.07]].map(([x, y]) => new THREE.Vector2(x, y));
  const cup = new THREE.Mesh(new THREE.LatheGeometry(cupPts, 64), GOLD()); C.add(cup);
  for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2; const st = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), GOLD()); st.position.set(Math.cos(a) * 0.112, 0.125, Math.sin(a) * 0.112); C.add(st); }
  const wine = new THREE.Mesh(new THREE.CircleGeometry(0.108, 48), new THREE.MeshPhongMaterial({ color: 0x5a0e14, shininess: 120, specular: 0xffd0d0 })); wine.rotation.x = -Math.PI / 2; wine.position.y = 0.142; C.add(wine); X.wine = wine;
  C.visible = false;
  // --- pigeon perched on the jar (S08) ---
  const pg = makeCard(0.32, 0.22, 256, (c, W, Hh) => { c.clearRect(0, 0, W, Hh); c.lineWidth = 6; c.strokeStyle = '#2a1a16';
    c.beginPath(); c.ellipse(W * 0.5, Hh * 0.58, W * 0.3, Hh * 0.26, -0.1, 0, 7); c.fillStyle = '#c8ccd8'; c.fill(); c.stroke();
    c.beginPath(); c.arc(W * 0.78, Hh * 0.32, Hh * 0.15, 0, 7); c.fillStyle = '#8a92a8'; c.fill(); c.stroke();
    c.beginPath(); c.moveTo(W * 0.9, Hh * 0.32); c.lineTo(W * 0.99, Hh * 0.36); c.lineTo(W * 0.9, Hh * 0.4); c.fillStyle = '#e8a040'; c.fill();
    c.beginPath(); c.arc(W * 0.8, Hh * 0.3, 5, 0, 7); c.fillStyle = '#2a1a16'; c.fill();
    c.beginPath(); c.moveTo(W * 0.25, Hh * 0.5); c.lineTo(W * 0.02, Hh * 0.62); c.lineTo(W * 0.24, Hh * 0.7); c.fillStyle = '#7a8298'; c.fill(); c.stroke();
    c.beginPath(); c.ellipse(W * 0.45, Hh * 0.52, W * 0.18, Hh * 0.12, -0.2, 0, 7); c.fillStyle = '#9aa2b8'; c.fill(); c.stroke(); }, { transparent: true, lit: true });
  X.pigeon = pg; scene.add(pg); pg.visible = false;
  X.webs.visible = false;
  X.web = (w, sd) => { const c = web0(w, sd); c.material.depthWrite = false; return c; };   // thin lines: stay out of the depth/AO pass
  return X;
}
