// The Kola site in the Arctic tundra: snow field with rocks and wind ripples, low hills and sparse dark firs, the drilling
// complex (long corrugated hall + red/white lattice derrick with lit windows), service huts, pipes, and the rusty welded
// cap over the hole (Ø 0.23 m bore under a 0.62 m bolted flange) on a cracked concrete pad. ruin(u) turns the site into
// the abandoned ruin of K16: derrick gone, roof holes, broken windows, drifted snow.
import * as THREE from './three.module.js';
import { mulberry } from './toon.js';
import { makeCard, signText } from './flat.js';
import { skyRig } from './sky.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const STD = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, ...o });
function canvasTex(w, h, fn, rep = [1, 1]) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8; return t; }

const snowTex = () => canvasTex(1024, 1024, (g, w, h) => { const r = mulberry(4); g.fillStyle = '#eef2fa'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) { const y = r() * h, x = r() * w, L = 80 + r() * 260; g.strokeStyle = r() < 0.5 ? 'rgba(170,185,220,0.35)' : 'rgba(255,255,255,0.8)'; g.lineWidth = 2 + r() * 4;
    g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + L * 0.3, y - 10, x + L * 0.7, y + 10, x + L, y); g.stroke(); }
  for (let i = 0; i < 4000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(200,210,235,0.25)' : 'rgba(255,255,255,0.6)'; g.fillRect(r() * w, r() * h, 2, 2); } }, [24, 24]);
const rustTex = () => canvasTex(1024, 1024, (g, w, h) => { const r = mulberry(9); g.fillStyle = '#7a3a1c'; g.fillRect(0, 0, w, h);
  const cols = ['#a4522a', '#5a2a14', '#c86a32', '#3a2a24', '#8a4a2a', '#b8783e'];
  for (let i = 0; i < 900; i++) { g.fillStyle = cols[i % cols.length]; g.globalAlpha = 0.15 + r() * 0.35; g.beginPath(); g.ellipse(r() * w, r() * h, 8 + r() * 60, 6 + r() * 40, r() * 3, 0, 7); g.fill(); }
  g.globalAlpha = 1; for (let i = 0; i < 6000; i++) { g.fillStyle = r() < 0.5 ? '#2a1a12' : '#d8884a'; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); }
  g.globalAlpha = 0.35; for (let i = 0; i < 30; i++) { g.fillStyle = '#4a2a1a'; g.beginPath(); g.ellipse(r() * w, r() * h, 2 + r() * 6, 20 + r() * 50, 0, 0, 7); g.fill(); } g.globalAlpha = 1; });
const concreteTex = () => canvasTex(1024, 1024, (g, w, h) => { const r = mulberry(13); g.fillStyle = '#9a9aa2'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(60,60,70,0.25)' : 'rgba(230,230,235,0.3)'; g.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 3); }
  g.strokeStyle = 'rgba(40,40,48,0.7)'; for (let i = 0; i < 14; i++) { g.lineWidth = 2 + r() * 3; g.beginPath(); let x = r() * w, y = r() * h; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (r() - 0.5) * 120; y += (r() - 0.5) * 120; g.lineTo(x, y); } g.stroke(); }
  g.fillStyle = 'rgba(122,58,28,0.35)'; g.beginPath(); g.ellipse(w / 2, h / 2, 300, 260, 0, 0, 7); g.fill(); });
const corrugTex = (base) => canvasTex(512, 512, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0);
  gr.addColorStop(0, 'rgba(0,0,0,0.18)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0.18)'); g.fillStyle = gr; g.fillRect(x, 0, 16, h); }
  const r = mulberry(21); for (let i = 0; i < 70; i++) { g.fillStyle = 'rgba(110,60,30,' + (0.1 + r() * 0.25) + ')'; g.fillRect(r() * w, r() * h * 0.2 + h * 0.8 * r(), 4 + r() * 10, 20 + r() * 80); } }, [4, 1]);

export function buildArctic(scene) {
  const A = {}; const r = mulberry(31);
  const sky = skyRig(scene, { sunDir: V(-0.8, 0.08, -1), shadow: 40, center: V(0, 0, -10) }); A.sky = sky; sky.setMode('arctic');
  // snow field + gentle undulation
  const gGeo = new THREE.PlaneGeometry(900, 900, 160, 160); const gp = gGeo.attributes.position;
  for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), y = gp.getY(i), d = Math.hypot(x, y); gp.setZ(i, d < 25 ? 0 : (Math.sin(x * 0.03) * Math.cos(y * 0.025) * 1.4 + Math.sin(x * 0.011 + 1) * 3) * Math.min(1, (d - 25) / 60)); }
  gGeo.computeVertexNormals(); const ground = new THREE.Mesh(gGeo, STD(0xffffff, { map: snowTex(), roughness: 0.75 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  // distant hills (soft snowy domes) and dark firs
  for (let i = 0; i < 16; i++) { const a = -1.6 + i * 0.21 + r() * 0.1, d = 180 + r() * 120; const h = new THREE.Mesh(new THREE.SphereGeometry(40 + r() * 50, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), STD(0xe4eaf6));
    h.scale.y = 0.18 + r() * 0.2; h.position.set(Math.sin(a) * d, -2, -Math.cos(a) * d); scene.add(h); }
  const firG = new THREE.ConeGeometry(1, 4, 7); const firs = new THREE.InstancedMesh(firG, STD(0x2c3a34), 260); { const m = new THREE.Matrix4(); for (let i = 0; i < 260; i++) { const a = r() * Math.PI * 2, d = 60 + r() * 140; const s = 0.7 + r() * 1.3;
    m.compose(V(Math.sin(a) * d, 2 * s, -Math.abs(Math.cos(a)) * d - 20), new THREE.Quaternion(), V(s, s, s)); firs.setMatrixAt(i, m); } } firs.castShadow = true; scene.add(firs);
  const rockG = new THREE.DodecahedronGeometry(1, 1); { const p = rockG.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.8 + 0.4 * Math.abs(Math.sin(i * 12.9)); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.6, p.getZ(i) * k); } rockG.computeVertexNormals(); }
  const rocks = new THREE.InstancedMesh(rockG, STD(0x4a4850, { flatShading: true }), 140); { const m = new THREE.Matrix4(); for (let i = 0; i < 140; i++) { const a = r() * Math.PI * 2, d = 6 + r() * 70, s = 0.2 + r() * 0.9;
    m.compose(V(Math.sin(a) * d, s * 0.15, Math.cos(a) * d), new THREE.Quaternion().setFromEuler(new THREE.Euler(r(), r() * 6, r())), V(s, s, s)); rocks.setMatrixAt(i, m); } } rocks.castShadow = true; rocks.receiveShadow = true; scene.add(rocks);

  // ---- the drilling complex, behind the cap (cap at the origin; complex centred at z −26)
  const CX = V(-4, 0, -30); const site = new THREE.Group(); site.position.copy(CX); scene.add(site); A.site = site;
  const wallM = STD(0xffffff, { map: corrugTex('#a8b4a0') }), roofM = STD(0x6a7078, { roughness: 0.6, metalness: 0.3 });
  const hall = new THREE.Mesh(new THREE.BoxGeometry(34, 12, 14), wallM); hall.position.set(0, 6, 0); hall.castShadow = hall.receiveShadow = true; site.add(hall);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(35, 0.8, 15), roofM); roof.position.set(0, 12.4, 0); roof.castShadow = true; site.add(roof); A.roof = roof;
  const winM = new THREE.MeshStandardMaterial({ color: 0x222833, emissive: 0xffc070, emissiveIntensity: 0.0, roughness: 0.3 }); A.winM = winM;
  for (let i = 0; i < 12; i++) for (let j = 0; j < 2; j++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.1), winM); w.position.set(-15 + i * 2.7, 3.4 + j * 4.2, 7.02); site.add(w); }
  const tower = new THREE.Mesh(new THREE.BoxGeometry(10, 22, 10), STD(0xffffff, { map: corrugTex('#b8c0b4') })); tower.position.set(8, 23, 0); tower.castShadow = true; site.add(tower);
  for (let j = 0; j < 6; j++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.9), winM); w.position.set(8, 15 + j * 3.2, 5.02); site.add(w); }
  // the derrick: four tapering legs with cross braces, red/white bands
  const der = new THREE.Group(); der.position.set(8, 34, 0); site.add(der); A.derrick = der; const legM = STD(0xd8402a, { roughness: 0.5, metalness: 0.4 }), whM = STD(0xf4f0e8, { roughness: 0.5, metalness: 0.3 });
  const H = 30; for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { for (let k = 0; k < 6; k++) { const y0 = k * H / 6, y1 = (k + 1) * H / 6, w0 = 4.2 - y0 * 0.11, w1 = 4.2 - y1 * 0.11;
      const a = V(sx * w0, y0, sz * w0), b = V(sx * w1, y1, sz * w1); const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, a.distanceTo(b), 8), k % 2 ? whM : legM);
      leg.position.copy(a).lerp(b, 0.5); leg.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()); leg.castShadow = true; der.add(leg); } }
  for (let k = 0; k < 6; k++) { const y0 = k * H / 6, y1 = (k + 1) * H / 6, w0 = 4.2 - y0 * 0.11, w1 = 4.2 - y1 * 0.11;
    for (let s = 0; s < 4; s++) { const a0 = s * Math.PI / 2 + Math.PI / 4, a1 = a0 + Math.PI / 2; const P = (w, y, a) => V(Math.sign(Math.cos(a)) * w, y, Math.sign(Math.sin(a)) * w);
      for (const [a, b] of [[P(w0, y0, a0), P(w1, y1, a1)], [P(w0, y0, a1), P(w1, y1, a0)], [P(w1, y1, a0), P(w1, y1, a1)]]) { const br = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, a.distanceTo(b), 6), whM);
        br.position.copy(a).lerp(b, 0.5); br.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()); der.add(br); } } }
  const crown = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.6, 2.6), legM); crown.position.y = H + 0.6; der.add(crown);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), new THREE.MeshStandardMaterial({ color: 0xff3020, emissive: 0xff2010, emissiveIntensity: 2 })); beacon.position.y = H + 1.8; der.add(beacon); A.beacon = beacon;
  // huts and pipes
  for (const [x, z, c] of [[-26, 6, '#c86a3a'], [-20, 12, '#5a7aa8'], [22, 10, '#c8b04a']]) { const hut = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 3.5), STD(0xffffff, { map: corrugTex(c) })); hut.position.set(x, 1.5, z); hut.castShadow = hut.receiveShadow = true; site.add(hut);
    const hr = new THREE.Mesh(new THREE.BoxGeometry(5.3, 0.3, 3.8), roofM); hr.position.set(x, 3.15, z); site.add(hr); }
  const pipeM = STD(0x8a8f98, { metalness: 0.6, roughness: 0.4 }); for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 30, 12), pipeM); p.rotation.z = Math.PI / 2; p.position.set(-2, 0.6 + i * 0.9, 12 + i * 0.2); p.castShadow = true; site.add(p); }
  const sign = makeCard(10, 2.2, 1024, (g, w, h) => { g.fillStyle = '#c8302a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f2e6c8'; g.lineWidth = 14; g.strokeRect(14, 14, w - 28, h - 28); signText(g, 'СГ-3  KOLA', w / 2, h / 2 + 4, 120, '#f6efdc', '#5a1a14'); }, { lit: true });
  sign.position.set(0, 9.6, 7.05); site.add(sign);

  // ---- the cap at the origin: cracked concrete pad, rusty flange with 12 bolts, welded centre plate, a stub pipe, snow dusting
  const cap = new THREE.Group(); scene.add(cap); A.cap = cap; const rust = rustTex();
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.92, 0.22, 48), STD(0xffffff, { map: concreteTex() })); pad.position.y = 0.11; pad.receiveShadow = pad.castShadow = true; cap.add(pad);
  const rustM = new THREE.MeshStandardMaterial({ map: rust, color: 0xffffff, roughness: 0.92, metalness: 0.25 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.44, 0.22, 48), rustM); base.position.y = 0.33; base.castShadow = true; cap.add(base);
  const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.07, 48), rustM); flange.position.y = 0.475; flange.castShadow = true; cap.add(flange);
  const weld = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.022, 8, 64), new THREE.MeshStandardMaterial({ color: 0x5a3a2a, roughness: 0.7, metalness: 0.4 })); weld.rotation.x = Math.PI / 2; weld.position.y = 0.44; cap.add(weld);
  const bolts = []; const boltG = new THREE.CylinderGeometry(0.028, 0.028, 0.05, 6); const boltM = new THREE.MeshStandardMaterial({ color: 0x6a4a3a, roughness: 0.6, metalness: 0.6 });
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; const b = new THREE.Mesh(boltG, boltM); b.position.set(Math.cos(a) * 0.36, 0.465, Math.sin(a) * 0.36); b.castShadow = true; cap.add(b); bolts.push(b); }
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.025, 32), rustM); plate.position.y = 0.52; cap.add(plate);
  const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.12, 12), boltM); stub.position.set(0.08, 0.57, -0.05); cap.add(stub);
  const paint = makeCard(0.36, 0.1, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.font = '800 110px Montserrat'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(236,226,206,0.78)'; g.fillText('12 262', w / 2, h / 2 + 4); }, { transparent: true, lit: true });
  paint.rotation.x = -Math.PI / 2; paint.position.set(0, 0.5115, 0.2); paint.rotation.z = 0; cap.add(paint);
  const dust = makeCard(1.8, 1.8, 1024, (g, w, h) => { const rr = mulberry(77); g.clearRect(0, 0, w, h); for (let i = 0; i < 900; i++) { const a = rr() * 6.283, d = (0.3 + rr() * 0.7) * w / 2; g.fillStyle = `rgba(250,252,255,${0.15 + rr() * 0.4})`; g.beginPath(); g.ellipse(w / 2 + Math.cos(a) * d, h / 2 + Math.sin(a) * d, 2 + rr() * 9, 1 + rr() * 5, a, 0, 7); g.fill(); } }, { transparent: true, lit: true });
  dust.rotation.x = -Math.PI / 2; dust.position.y = 0.232; cap.add(dust);
  // the bore itself (shown when the cap lifts / in top-down K03): a black disc 0.23 m
  const bore = new THREE.Mesh(new THREE.CircleGeometry(0.115, 40), new THREE.MeshBasicMaterial({ color: 0x050405 })); bore.rotation.x = -Math.PI / 2; bore.position.y = 0.225; bore.visible = false; cap.add(bore); A.bore = bore;
  A.capParts = [base, flange, weld, plate, stub, paint, ...bolts];
  // ruin(u): 0 = working site, 1 = abandoned (derrick removed, roof gaps, windows dark, drifts)
  const drifts = []; for (let i = 0; i < 18; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(2 + r() * 3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), STD(0xf2f6fc)); d.scale.y = 0.35; d.position.set(-20 + r() * 40, 0, -20 + r() * 14); d.visible = false; scene.add(d); drifts.push(d); }
  A.ruin = (u) => { der.visible = u < 0.5; beacon.visible = u < 0.5; roof.scale.x = u > 0.5 ? 0.6 : 1; roof.position.x = u > 0.5 ? -6 : 0; drifts.forEach((d) => { d.visible = u > 0.5; }); winM.emissiveIntensity = u > 0.5 ? 0 : A.winOn ?? 0.0; };

  // ---- K09: the mud return — a pipe pouring grey drilling mud into a steaming pit, bubbles boiling up
  const pit = new THREE.Group(); pit.position.set(3.2, 0, -2.5); scene.add(pit); A.pit = pit;
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.6, 0.35, 40, 1, true), STD(0x6a6a72, { side: THREE.DoubleSide })); rim.position.y = 0.17; pit.add(rim);
  const mud = new THREE.Mesh(new THREE.CircleGeometry(1.5, 40), STD(0x5a5650, { roughness: 0.35 })); mud.rotation.x = -Math.PI / 2; mud.position.y = 0.25; pit.add(mud);
  const outlet = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.4, 16), STD(0x8a8f98, { metalness: 0.6, roughness: 0.4 })); outlet.rotation.z = Math.PI / 2 - 0.25; outlet.position.set(-1.9, 1.15, 0); pit.add(outlet);
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.9, 12), STD(0x625e58, { roughness: 0.3 })); stream.position.set(-0.75, 0.7, 0); pit.add(stream);
  const bub = []; const bubG = new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2); const bubM = STD(0x6e6a64, { roughness: 0.25, metalness: 0.1 });
  for (let i = 0; i < 26; i++) { const b = new THREE.Mesh(bubG, bubM); b.userData = { x: (r() - 0.5) * 2.2, z: (r() - 0.5) * 2.2, ph: r(), sp: 0.8 + r() * 1.4 }; pit.add(b); bub.push(b); }
  const steamT = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const steam = []; for (let i = 0; i < 14; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamT, transparent: true, depthWrite: false, color: 0xf0f2f8 })); s.userData = { x: (r() - 0.5) * 1.6, ph: r() }; pit.add(s); steam.push(s); }
  A.boil = (t, on = 1) => { pit.visible = on > 0; bub.forEach((b) => { const u = (t * b.userData.sp + b.userData.ph) % 1; const s = 0.05 + 0.22 * Math.sin(Math.PI * u); b.position.set(b.userData.x * Math.min(1, 0.68 / Math.hypot(b.userData.x, b.userData.z) || 1), 0.25, b.userData.z * Math.min(1, 0.68 / Math.hypot(b.userData.x, b.userData.z) || 1)); b.scale.set(s, s * (u < 0.85 ? 1 : 0.2), s); });
    steam.forEach((s) => { const u = (t * 0.35 + s.userData.ph) % 1; s.position.set(s.userData.x + Math.sin(u * 4) * 0.2, 0.4 + u * 3, 0); s.scale.setScalar(0.6 + u * 1.6); s.material.opacity = 0.6 * Math.sin(Math.PI * u); });
    stream.scale.x = stream.scale.z = 1 + 0.08 * Math.sin(t * 20); };
  A.boil(0, 0);
  // ---- K13: the STOP sign hung on the hall door
  const stop = makeCard(2.6, 1.4, 1024, (g, w, h) => { g.fillStyle = '#d8302a'; g.beginPath(); g.roundRect(8, 8, w - 16, h - 16, 40); g.fill(); g.lineWidth = 18; g.strokeStyle = '#ffffff'; g.stroke();
    g.font = '800 230px Kanit, Montserrat'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffffff'; g.fillText('STOP', w / 2, h / 2 + 10); }, { lit: true }); stop.position.set(-1, 3.2, 7.08); site.add(stop); A.stop = stop; stop.visible = false;
  A.ruin(0);
  return A;
}
