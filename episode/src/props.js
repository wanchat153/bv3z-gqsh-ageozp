// Toy-diorama props with rounded edges, ink outlines and painted textures. Fill every set with these: the reference reads
// rich because each frame carries 10–30 small readable objects. All builders return a THREE.Group with its base at y = 0.
import * as THREE from './three.module.js';
import { toon, outlined, mulberry } from './toon.js';
import { TEX, mat, shade } from './textures.js';
import { makeCard, signText } from './flat.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const M = (c) => (c && c.isMaterial ? c : toon(new THREE.Color(c)));
const put = (parent, obj, x = 0, y = 0, z = 0, ry = 0) => { obj.position.set(x, y, z); obj.rotation.y = ry; parent.add(obj); return obj; };

// rounded box (toy look): extruded rounded rectangle, centred
const rgCache = new Map();
export function rboxGeo(w, h, d, r = 0.04) {
  const k = [w, h, d, r].map((v) => v.toFixed(3)).join(); if (rgCache.has(k)) return rgCache.get(k);
  r = Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3); const s = new THREE.Shape(); const x = -w / 2 + r, y = -h / 2 + r, W = w - 2 * r, H = h - 2 * r;
  s.moveTo(x, y - r); s.lineTo(x + W, y - r); s.quadraticCurveTo(x + W + r, y - r, x + W + r, y); s.lineTo(x + W + r, y + H); s.quadraticCurveTo(x + W + r, y + H + r, x + W, y + H + r);
  s.lineTo(x, y + H + r); s.quadraticCurveTo(x - r, y + H + r, x - r, y + H); s.lineTo(x - r, y); s.quadraticCurveTo(x - r, y - r, x, y - r);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: 0, bevelSegments: 3, curveSegments: 6 });
  g.translate(0, 0, -(d - 2 * r) / 2); g.computeVertexNormals(); rgCache.set(k, g); return g;
}
export const rbox = (w, h, d, c, r = 0.04, ink = 0.008) => outlined(rboxGeo(w, h, d, r), M(c), ink);
export const ball = (r, c, ink = 0.008, seg = 24) => outlined(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7)), M(c), ink);
export const tube = (r, h, c, ink = 0.006, seg = 16) => outlined(new THREE.CylinderGeometry(r, r, h, seg), M(c), ink);

export function tree(seed = 1, s = 1) {
  const r = mulberry(seed); const g = new THREE.Group(); const greens = ['#3f9b46', '#4fae4a', '#358a3f', '#5bbd55'];
  const trunk = tube(0.07 * s, 0.9 * s, '#7a4b2a', 0.006); trunk.position.y = 0.45 * s; g.add(trunk);
  for (let i = 0; i < 4; i++) { const b = outlined(new THREE.IcosahedronGeometry((0.33 + r() * 0.15) * s, 2), M(greens[i % 4]), 0.01 * s);
    b.position.set((r() - 0.5) * 0.5 * s, (1.0 + r() * 0.45) * s, (r() - 0.5) * 0.5 * s); g.add(b); }
  return g;
}
export function car(col = '#d63a3a', seed = 1) {
  const g = new THREE.Group(); const body = rbox(0.9, 0.26, 0.44, col, 0.08); body.position.y = 0.23; g.add(body);
  const cab = rbox(0.5, 0.22, 0.4, col, 0.07); cab.position.set(-0.05, 0.45, 0); g.add(cab);
  const glass = M('#bfe6ff'); for (const z of [0.201, -0.201]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.14), glass); w.position.set(-0.05, 0.46, z); if (z < 0) w.rotation.y = Math.PI; g.add(w); }
  for (const [x, z] of [[-0.28, 0.22], [0.28, 0.22], [-0.28, -0.22], [0.28, -0.22]]) { const w = tube(0.1, 0.08, '#222', 0.006); w.rotation.x = Math.PI / 2; w.position.set(x, 0.1, z); g.add(w);
    const hub = tube(0.05, 0.085, '#ccc', 0); hub.rotation.x = Math.PI / 2; hub.position.set(x, 0.1, z); g.add(hub); }
  for (const z of [0.13, -0.13]) { const l = ball(0.035, '#fff7c0', 0.004); l.position.set(0.45, 0.26, z); g.add(l); }
  return g;
}
export function ferrisWheel(R = 3, seed = 2) {
  const g = new THREE.Group(); const wheel = new THREE.Group(); wheel.position.y = R + 0.6; g.add(wheel);
  const rim = outlined(new THREE.TorusGeometry(R, 0.05, 8, 64), M('#ffffff'), 0.01); wheel.add(rim);
  const rim2 = outlined(new THREE.TorusGeometry(R * 0.55, 0.035, 8, 48), M('#ffffff'), 0.008); wheel.add(rim2);
  const cols = ['#e2453a', '#f4c430', '#2f6fd6', '#5aa79a', '#f39a2b', '#b05ad6'];
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const sp = rbox(0.04, R, 0.04, '#ffffff', 0.015, 0.004); sp.position.set(Math.cos(a) * R / 2, Math.sin(a) * R / 2, 0); sp.rotation.z = a - Math.PI / 2; wheel.add(sp);
    const cab = rbox(0.34, 0.3, 0.3, cols[i % 6], 0.06); cab.userData.a = a; cab.position.set(Math.cos(a) * R, Math.sin(a) * R - 0.2, 0); wheel.add(cab); }
  for (const s of [-1, 1]) for (const z of [-0.25, 0.25]) { const leg = rbox(0.1, R + 1.1, 0.1, '#ffffff', 0.03); leg.position.set(s * R * 0.32, (R + 0.6) / 2, z); leg.rotation.z = s * 0.3; g.add(leg); }
  g.userData.spin = (t) => { wheel.rotation.z = t * 0.12; wheel.children.forEach((c) => { if (c.userData.a !== undefined) { const a = c.userData.a + wheel.rotation.z; c.position.set(Math.cos(a - wheel.rotation.z) * R, Math.sin(a - wheel.rotation.z) * R - 0.2, 0); c.rotation.z = -wheel.rotation.z; } }); };
  return g;
}
export function coaster(len = 14, col = '#3fae5a') {
  const pts = []; for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push(V(-len / 2 + u * len, 1.2 + 2.2 * Math.abs(Math.sin(u * Math.PI * 2.2)) + (u > 0.45 && u < 0.6 ? 1.5 * Math.sin((u - 0.45) / 0.15 * Math.PI) : 0), Math.sin(u * 5) * 0.8)); }
  const curve = new THREE.CatmullRomCurve3(pts); const g = new THREE.Group();
  for (const off of [-0.12, 0.12]) { const c2 = new THREE.CatmullRomCurve3(pts.map((p) => p.clone().add(V(0, 0, off)))); g.add(outlined(new THREE.TubeGeometry(c2, 200, 0.035, 6), M(col), 0.008)); }
  for (let i = 0; i <= 28; i++) { const p = curve.getPoint(i / 28); const s = rbox(0.06, p.y, 0.06, '#f3efe6', 0.02, 0.004); s.position.set(p.x, p.y / 2, p.z); g.add(s); }
  return g;
}
export function fence(len = 6, col = '#f3efe6', h = 0.9) {
  const g = new THREE.Group(); const n = Math.round(len / 0.6);
  for (let i = 0; i <= n; i++) { const p = rbox(0.07, h, 0.07, col, 0.02, 0.005); p.position.set(-len / 2 + i * len / n, h / 2, 0); g.add(p); }
  for (const y of [h * 0.35, h * 0.8]) { const r = rbox(len, 0.06, 0.04, col, 0.02, 0.005); r.position.y = y; g.add(r); }
  return g;
}
export function lampPost(h = 2.6) { const g = new THREE.Group(); const p = tube(0.04, h, '#2a2f3a'); p.position.y = h / 2; g.add(p); const l = ball(0.13, '#fff3b0', 0.008); l.position.y = h + 0.05; g.add(l); return g; }
export function bench() { const g = new THREE.Group(); const seat = rbox(1.0, 0.06, 0.32, '#c77c45', 0.02); seat.position.y = 0.42; g.add(seat); const back = rbox(1.0, 0.24, 0.05, '#c77c45', 0.02); back.position.set(0, 0.68, -0.15); g.add(back);
  for (const x of [-0.42, 0.42]) { const l = rbox(0.06, 0.42, 0.3, '#2a2f3a', 0.02); l.position.set(x, 0.21, 0); g.add(l); } return g; }

// lattice ride tower with grating deck, hazard skirt, rail, ladder and a big vertical sign
export function rideTower(h = 6, w = 1.2, signText_ = 'SKYFALL') {
  const g = new THREE.Group(); const orange = mat(TEX.metal('#f28c28'), 1, 4); const white = M('#f6f6f2');
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const l = outlined(rboxGeo(0.1, h, 0.1, 0.02), orange, 0.008); l.position.set(x * w / 2, h / 2, z * w / 2); g.add(l); }
  const n = Math.round(h / (w * 0.8)), seg = h / n;
  for (let i = 0; i < n; i++) for (let side = 0; side < 4; side++) {
    const r = new THREE.Group(); r.rotation.y = side * Math.PI / 2; r.position.y = (i + 0.5) * seg; g.add(r);
    for (const s of [-1, 1]) { const b = outlined(new THREE.BoxGeometry(0.035, Math.hypot(w, seg), 0.035), white, 0.005); b.rotation.z = s * Math.atan2(w, seg); b.position.z = w / 2; r.add(b); }
    const hb = outlined(new THREE.BoxGeometry(w, 0.05, 0.05), orange, 0.005); hb.position.set(0, seg / 2, w / 2); r.add(hb);
  }
  const deckW = w * 1.8; const deck = outlined(new THREE.BoxGeometry(deckW, 0.12, deckW), [M('#3b414c'), M('#3b414c'), mat(TEX.grating(), 6, 6), M('#3b414c'), M('#3b414c'), M('#3b414c')], 0.01);
  deck.position.y = h + 0.06; g.add(deck);
  const sk = mat(TEX.stripes(), 10, 1); for (let r = 0; r < 4; r++) { const p = new THREE.Group(); p.rotation.y = r * Math.PI / 2; const s = new THREE.Mesh(new THREE.PlaneGeometry(deckW, 0.16), sk); s.position.set(0, h - 0.02, deckW / 2 + 0.002); p.add(s); g.add(p); }
  for (const z of [-deckW / 2 + 0.05]) { const rail = rbox(deckW, 0.05, 0.05, '#f28c28', 0.02); rail.position.set(0, h + 1.05, z); g.add(rail); for (const x of [-deckW / 2 + 0.05, 0, deckW / 2 - 0.05]) { const p = rbox(0.05, 1.0, 0.05, '#f28c28', 0.02); p.position.set(x, h + 0.6, z); g.add(p); } }
  const lad = new THREE.Group(); for (const x of [-0.12, 0.12]) { const s = rbox(0.03, h, 0.03, '#d0d0d0', 0.01, 0.004); s.position.set(x, h / 2, 0); lad.add(s); } for (let y = 0.2; y < h; y += 0.3) { const rr = rbox(0.24, 0.025, 0.025, '#d0d0d0', 0.01, 0.003); rr.position.y = y; lad.add(rr); }
  lad.position.set(w / 2 + 0.08, 0, 0); lad.rotation.y = Math.PI / 2; g.add(lad);
  const sign = makeCard(0.42, h * 0.75, 256, (c, W, H) => { c.fillStyle = '#1f3a8a'; c.fillRect(0, 0, W, H); c.strokeStyle = '#fff'; c.lineWidth = 8; c.strokeRect(8, 8, W - 16, H - 16);
    const L = signText_.length; for (let i = 0; i < L; i++) signText(c, signText_[i], W / 2, H * (i + 0.5) / L, Math.min(W * 0.7, H / L * 0.8), '#fff', '#0d1640'); }, { lit: true });
  sign.position.set(0, h * 0.45, w / 2 + 0.07); g.add(sign);
  const hsign = makeCard(0.5, 0.2, 256, (c, W, H) => { c.fillStyle = '#f4c430'; c.fillRect(0, 0, W, H); signText(c, `${Math.round(h * 16)} FT`, W / 2, H / 2, H * 0.6, '#1b1420', '#f4c430'); }, { lit: true });
  hsign.position.set(-0.05, h * 0.88, w / 2 + 0.08); g.add(hsign);
  g.userData.top = h + 0.12; return g;
}
// safety net on an orange frame (landing zone)
export function netFrame(w = 3.4, d = 3.4, h = 0.75) {
  const g = new THREE.Group(); const o = '#f28c28';
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const p = rbox(0.12, h, 0.12, o, 0.03); p.position.set(x * w / 2, h / 2, z * d / 2); g.add(p); }
  for (const [x, z, rw, rd] of [[0, d / 2, w, 0.12], [0, -d / 2, w, 0.12], [w / 2, 0, 0.12, d], [-w / 2, 0, 0.12, d]]) { const b = rbox(rw + 0.12, 0.16, rd + 0.12, o, 0.04); b.position.set(x, h, z); g.add(b); }
  const t = TEX.net().clone(); t.needsUpdate = true; t.repeat.set(w * 3, d * 3);
  const net = new THREE.Mesh(new THREE.PlaneGeometry(w, d, 16, 16), new THREE.MeshLambertMaterial({ map: t, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }));
  net.rotation.x = -Math.PI / 2; net.position.y = h - 0.05; net.castShadow = true; g.add(net); g.userData.net = net; return g;
}
export function cloud3D(seed = 1, s = 1) {
  const r = mulberry(seed); const g = new THREE.Group(); const m = toon(new THREE.Color('#ffffff'), { emissive: new THREE.Color('#dcecff'), emissiveIntensity: 0.35 });
  for (let i = 0; i < 6; i++) { const b = outlined(new THREE.SphereGeometry((0.45 + r() * 0.4) * s, 18, 12), m, 0); b.scale.y = 0.75; b.position.set((i - 2.5) * 0.5 * s, r() * 0.25 * s, (r() - 0.5) * 0.4 * s); g.add(b); }
  return g;
}
export function stringLights(a, b, n = 16, sag = 0.4, col = '#fff1a8') {
  const g = new THREE.Group(); const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push(a.clone().lerp(b, u).add(V(0, -sag * Math.sin(u * Math.PI), 0))); }
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.008, 4), new THREE.MeshBasicMaterial({ color: 0x2a2020 })));
  const bulbM = new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(1.8) });
  const glowT = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,240,170,0.9)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  for (let i = 1; i < n; i++) { const u = i / n; const p = a.clone().lerp(b, u).add(V(0, -sag * Math.sin(u * Math.PI) - 0.04, 0));
    const bl = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), bulbM); bl.position.copy(p); g.add(bl);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp.scale.set(0.35, 0.35, 1); sp.position.copy(p); g.add(sp); }
  return g;
}

// ---- interior props ----
export function desk(w = 1.5, d = 0.8, h = 0.78, col = '#c77c45') {
  const g = new THREE.Group(); const top = outlined(rboxGeo(w, 0.07, d, 0.025), mat(TEX.planks(col, 3), 1, 1), 0.008); top.position.y = h; g.add(top);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = rbox(0.06, h, 0.06, shade(col, -0.18), 0.02); l.position.set(x * (w / 2 - 0.06), h / 2, z * (d / 2 - 0.06)); g.add(l); }
  g.userData.top = h + 0.035; return g;
}
export function paperStack(n = 12, seed = 3, w = 0.42, d = 0.32, sketch) {
  const r = mulberry(seed); const g = new THREE.Group(); const pm = toon(new THREE.Color('#fbf8f0')); const edge = toon(new THREE.Color('#e9e2d2'));
  for (let i = 0; i < n; i++) { const s = outlined(new THREE.BoxGeometry(w, 0.008, d), [edge, edge, pm, pm, edge, edge], 0.002); s.position.set((r() - 0.5) * 0.03, 0.004 + i * 0.009, (r() - 0.5) * 0.03); s.rotation.y = (r() - 0.5) * 0.12; g.add(s); }
  const top = makeCard(w * 0.96, d * 0.96, 512, (c, W, H) => { c.fillStyle = '#fbf8f0'; c.fillRect(0, 0, W, H); (sketch || defaultSketch)(c, W, H, r); }, { lit: true });
  top.rotation.x = -Math.PI / 2; top.position.y = n * 0.009 + 0.006; g.add(top); g.userData.h = n * 0.009 + 0.01; return g;
}
function defaultSketch(c, W, H, r) { c.strokeStyle = '#3a4a7a'; c.lineWidth = 3; c.strokeRect(14, 14, W - 28, H - 28);
  c.strokeStyle = '#d0702a'; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(W * 0.3, H * 0.85); c.lineTo(W * (0.25 + r() * 0.5), H * (0.2 + r() * 0.3)); c.stroke(); }
  c.strokeStyle = '#555'; c.lineWidth = 2; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(W * 0.6, H * (0.3 + i * 0.12)); c.lineTo(W * 0.88, H * (0.3 + i * 0.12)); c.stroke(); } }
export function deskLamp(col = '#5fbf7f') {   // jointed arm: base → arm1 → elbow → arm2 → shade (each part hangs off the previous)
  const g = new THREE.Group(); const base = tube(0.09, 0.03, col, 0.005); base.position.y = 0.015; g.add(base);
  const j1 = new THREE.Group(); j1.position.y = 0.03; j1.rotation.z = 0.35; g.add(j1);
  const a1 = rbox(0.025, 0.4, 0.025, col, 0.01, 0.004); a1.position.y = 0.2; j1.add(a1);
  const j2 = new THREE.Group(); j2.position.y = 0.4; j2.rotation.z = 1.5; j1.add(j2); j2.add(ball(0.025, col, 0.004));
  const a2 = rbox(0.025, 0.32, 0.025, col, 0.01, 0.004); a2.position.y = 0.16; j2.add(a2);
  const j3 = new THREE.Group(); j3.position.y = 0.32; j3.rotation.z = 0.9; j2.add(j3);
  const sh = outlined(new THREE.ConeGeometry(0.1, 0.15, 24, 1, true), toon(new THREE.Color(col), { side: THREE.DoubleSide }), 0.005); sh.position.y = -0.04; sh.rotation.z = Math.PI; j3.add(sh);
  const bulb = ball(0.04, '#fff7c0', 0.003); bulb.position.y = -0.1; j3.add(bulb);
  return g;
}
export function stool(col = '#e9741c', h = 0.47) { const g = new THREE.Group(); const s = outlined(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 24), toon(new THREE.Color(col)), 0.006); s.position.y = h; g.add(s);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; const l = rbox(0.03, h, 0.03, '#8a5130', 0.01, 0.004); l.position.set(Math.cos(a) * 0.13, h / 2, Math.sin(a) * 0.13); l.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12); g.add(l); } return g; }
export function siren(on = true) { const g = new THREE.Group(); const b = rbox(0.16, 0.05, 0.16, '#2a2f3a', 0.02); b.position.y = 0.025; g.add(b);
  const dome = outlined(new THREE.SphereGeometry(0.075, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), toon(new THREE.Color('#e2302a'), { emissive: new THREE.Color('#ff2a1a'), emissiveIntensity: on ? 0.6 : 0 }), 0.006); dome.position.y = 0.05; g.add(dome); g.userData.dome = dome; return g; }
export function panicButton() { const g = new THREE.Group(); const base = outlined(rboxGeo(0.22, 0.09, 0.22, 0.02), mat(TEX.stripes(), 8, 8), 0.006); base.position.y = 0.045; g.add(base);
  const btn = outlined(new THREE.CylinderGeometry(0.07, 0.075, 0.05, 24), toon(new THREE.Color('#e2302a')), 0.006); btn.position.y = 0.115; g.add(btn);
  const lab = makeCard(0.16, 0.04, 256, (c, W, H) => { c.fillStyle = '#fff'; c.fillRect(0, 0, W, H); signText(c, 'PANIC', W / 2, H / 2, H * 0.75, '#e2302a', '#fff'); }, { lit: true }); lab.position.set(0, 0.05, 0.111); g.add(lab); return g; }
export function bookshelf(w = 0.9, h = 1.9, seed = 5) {
  const r = mulberry(seed); const g = new THREE.Group(); const wood = '#8a5130';
  const back = rbox(w, h, 0.05, shade(wood, -0.1), 0.01); back.position.set(0, h / 2, -0.15); g.add(back);
  for (const x of [-w / 2, w / 2]) { const s = rbox(0.05, h, 0.35, wood, 0.015); s.position.set(x, h / 2, 0); g.add(s); }
  const rows = 4; for (let i = 0; i <= rows; i++) { const sh = rbox(w, 0.04, 0.35, wood, 0.012); sh.position.y = i * h / rows + 0.02; g.add(sh);
    if (i < rows) { let x = -w / 2 + 0.05; while (x < w / 2 - 0.08) { const bw = 0.03 + r() * 0.04, bh = h / rows * (0.6 + r() * 0.3);
      const b = rbox(bw, bh, 0.24, ['#d63a3a', '#2f6fd6', '#f4c430', '#2e7d4f', '#f39a2b', '#7b4bb0', '#f3efe6'][Math.floor(r() * 7)], 0.008, 0.003); b.position.set(x + bw / 2, i * h / rows + 0.04 + bh / 2, 0.02); if (r() < 0.12) b.rotation.z = 0.2; g.add(b); x += bw + 0.004; } } }
  return g;
}
export function rug(R = 1.6, cols = ['#d9572b', '#f2a03d', '#f6d36b', '#5aa79a', '#f3ead8']) {
  const m = makeCard(R * 2, R * 2, 1024, (c, W) => { c.clearRect(0, 0, W, W); cols.forEach((col, i) => { c.beginPath(); c.arc(W / 2, W / 2, W / 2 * (1 - i / cols.length) - 2, 0, 7); c.fillStyle = col; c.fill(); c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,0.12)'; c.stroke(); });
    c.globalAlpha = 0.12; for (let i = 0; i < 3000; i++) { c.fillStyle = i % 2 ? '#000' : '#fff'; c.fillRect(Math.random() * W, Math.random() * W, 2, 2); } c.globalAlpha = 1;
    c.globalCompositeOperation = 'destination-in'; c.beginPath(); c.arc(W / 2, W / 2, W / 2 - 2, 0, 7); c.fill(); }, { lit: true, transparent: true });
  m.rotation.x = -Math.PI / 2; m.position.y = 0.006; return m;
}
// porthole: wooden ring with grain, inner bevel, glass glint; the view is a card behind the glass
export function porthole(r = 0.5, drawView) {
  const g = new THREE.Group();
  const ring = outlined(new THREE.TorusGeometry(r, r * 0.13, 16, 64), mat(TEX.planks('#8a4f28', 8), 4, 1), 0.01); g.add(ring);
  const view = makeCard(r * 2, r * 2, 1024, (c, W) => { c.save(); c.beginPath(); c.arc(W / 2, W / 2, W / 2, 0, 7); c.clip(); drawView(c, W); c.restore();
    c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = W * 0.025; c.beginPath(); c.arc(W / 2, W / 2, W * 0.38, Math.PI * 1.1, Math.PI * 1.45); c.stroke(); }, { transparent: true });
  view.position.z = -0.01; g.add(view); g.userData.view = view; return g;
}
export function sideTable(col = '#c77c45') { const g = new THREE.Group(); const t = rbox(0.5, 0.05, 0.5, col, 0.02); t.position.y = 0.55; g.add(t); const l = tube(0.03, 0.55, shade(col, -0.2)); l.position.y = 0.275; g.add(l); return g; }
export function chair(col = '#f4c430') { const g = new THREE.Group(); const s = rbox(0.42, 0.05, 0.42, col, 0.02); s.position.y = 0.45; g.add(s); const b = rbox(0.42, 0.42, 0.05, col, 0.02); b.position.set(0, 0.7, -0.19); g.add(b);
  for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) { const l = rbox(0.035, 0.45, 0.035, '#8a5130', 0.01); l.position.set(x, 0.225, z); g.add(l); } return g; }
export function pickup(col = '#d94a3a') {
  const g = new THREE.Group(); const b = rbox(2.3, 0.55, 1.1, col, 0.12); b.position.y = 0.62; g.add(b); const cab = rbox(0.95, 0.55, 1.0, col, 0.12); cab.position.set(-0.45, 1.15, 0); g.add(cab);
  const gl = M('#bfe6ff'); for (const z of [0.501, -0.501]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.32), gl); w.position.set(-0.45, 1.2, z); if (z < 0) w.rotation.y = Math.PI; g.add(w); }
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.36), gl); ws.position.set(0.026, 1.2, 0); ws.rotation.y = Math.PI / 2; g.add(ws);
  for (const [x, z] of [[-0.75, 0.55], [0.75, 0.55], [-0.75, -0.55], [0.75, -0.55]]) { const w = tube(0.28, 0.22, '#222', 0.008); w.rotation.x = Math.PI / 2; w.position.set(x, 0.28, z); g.add(w); const h = tube(0.13, 0.23, '#d8d8d8', 0); h.rotation.x = Math.PI / 2; h.position.set(x, 0.28, z); g.add(h); }
  for (const z of [0.35, -0.35]) { const l = ball(0.07, '#fff7c0', 0.005); l.position.set(1.15, 0.7, z); g.add(l); }
  return g;
}
export function cooler(col = '#2f6fd6') { const g = new THREE.Group(); const b = rbox(0.55, 0.35, 0.35, col, 0.05); b.position.y = 0.175; g.add(b); const lid = rbox(0.57, 0.07, 0.37, '#f3efe6', 0.03); lid.position.y = 0.37; g.add(lid); return g; }
export function grill() { const g = new THREE.Group(); const bowl = outlined(new THREE.SphereGeometry(0.28, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toon(new THREE.Color('#2a2f3a'), { side: THREE.DoubleSide }), 0.008); bowl.position.y = 0.8; g.add(bowl);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; const l = rbox(0.03, 0.8, 0.03, '#2a2f3a', 0.01); l.position.set(Math.cos(a) * 0.18, 0.4, Math.sin(a) * 0.18); g.add(l); }
  const lid = outlined(new THREE.SphereGeometry(0.28, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(new THREE.Color('#2a2f3a')), 0.008); lid.position.set(0.25, 0.95, 0); lid.rotation.z = -1.2; g.add(lid); return g; }
export { put };
