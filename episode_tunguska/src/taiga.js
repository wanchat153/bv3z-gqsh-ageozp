// The Tunguska taiga at model scale (1 unit ≈ 180 m: forest radius 140 ≈ 25 km, airburst at y 45 ≈ 8 km): mossy bog
// ground, ~4,000 instanced larches/pines, the epicentre swamp. blast(u): the shock front runs out from the centre and lays
// every tree down pointing away from it (crowns scorched brown); inside CORE the trunks stay standing, stripped bare.
// fireball(p, k): a blue-white ball + trail along the incoming path; flash(k): the airburst light. Far out at CABIN: the
// Vanavara-style log house with porch, chair and a window that shatters (shatter(u)). calendar(year): a big flip card.
import * as THREE from './three.module.js';
import { mulberry } from './toon.js';
import { makeCard, signText } from './flat.js';
import { skyRig } from './sky.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const STD = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, ...o });
export const R = 140, CORE = 9, AIR = V(0, 45, 0), CABIN = V(330, 0, 210);
function tex(w, h, fn, rep = [1, 1]) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8; return t; }
const glowT = (inner, outer) => tex(256, 256, (g, w) => { const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, inner); gr.addColorStop(0.25, outer.replace('A', '0.8')); gr.addColorStop(1, outer.replace('A', '0')); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); });

export function buildTaiga(scene) {
  const T = {}; const r = mulberry(19);
  const sky = skyRig(scene, { sunDir: V(0.7, 0.25, -1), shadow: 60, center: V(0, 0, 0) }); sky.setMode('morning'); T.sky = sky;
  const groundT = tex(1024, 1024, (g, w, h) => { g.fillStyle = '#6a7a42'; g.fillRect(0, 0, w, h); const rr = mulberry(3);
    for (let i = 0; i < 700; i++) { g.fillStyle = ['#7a8a4a', '#5a6a38', '#8a8048', '#4a5a34', '#9a8a5a'][i % 5]; g.globalAlpha = 0.5; g.beginPath(); g.ellipse(rr() * w, rr() * h, 10 + rr() * 50, 6 + rr() * 30, rr() * 3, 0, 7); g.fill(); }
    g.globalAlpha = 1; for (let i = 0; i < 8000; i++) { g.fillStyle = rr() < 0.5 ? 'rgba(40,50,20,0.4)' : 'rgba(200,190,120,0.35)'; g.fillRect(rr() * w, rr() * h, 2, 2); } }, [40, 40]);
  const gg = new THREE.PlaneGeometry(1600, 1600, 200, 200); const gp = gg.attributes.position;
  for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), y = gp.getY(i), d = Math.hypot(x, y); gp.setZ(i, (Math.sin(x * 0.02) * Math.cos(y * 0.017) * 3 + Math.sin(x * 0.006 + 2) * 6) * Math.min(1, Math.max(0, (d - 20) / 80))); }
  gg.computeVertexNormals(); const ground = new THREE.Mesh(gg, STD(0xffffff, { map: groundT })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground); T.ground = ground;
  const H = (x, z) => { const d = Math.hypot(x, z); return (Math.sin(x * 0.02) * Math.cos(-z * 0.017) * 3 + Math.sin(x * 0.006 + 2) * 6) * Math.min(1, Math.max(0, (d - 20) / 80)); }; T.H = H;
  // the epicentre bog: dark peat and small pools
  const bog = new THREE.Mesh(new THREE.CircleGeometry(16, 48), STD(0x4a4a30, { roughness: 0.5 })); bog.rotation.x = -Math.PI / 2; bog.position.y = 0.05; scene.add(bog);
  for (let i = 0; i < 9; i++) { const p = new THREE.Mesh(new THREE.CircleGeometry(1 + r() * 2.5, 24), STD(0x3a5a6a, { roughness: 0.1, metalness: 0.2 })); p.rotation.x = -Math.PI / 2; p.position.set((r() - 0.5) * 22, 0.08, (r() - 0.5) * 22); scene.add(p); }
  // trees: trunk + crown instanced; each tree knows its polar position
  const N = 4200 + 160; const trunkG = new THREE.CylinderGeometry(0.12, 0.22, 1, 6); trunkG.translate(0, 0.5, 0);
  const crownG = new THREE.ConeGeometry(1, 1, 7); crownG.translate(0, 0.5, 0);
  const trunks = new THREE.InstancedMesh(trunkG, STD(0x5a3a26), N), crowns = new THREE.InstancedMesh(crownG, STD(0xffffff), N); trunks.castShadow = crowns.castShadow = true; trunks.receiveShadow = crowns.receiveShadow = true;
  scene.add(trunks); scene.add(crowns); T.trunks = trunks; T.crowns = crowns;
  const trees = []; for (let i = 0; i < N - 160; i++) { const rr = Math.sqrt(r()) * (R + 60) + 2, a = r() * Math.PI * 2; const x = Math.cos(a) * rr, z = Math.sin(a) * rr; const h = 5 + r() * 4;
    trees.push({ x, z, y: H(x, z), a, rr, h, cw: 0.9 + r() * 0.6, ph: r(), green: new THREE.Color().setHSL(0.27 + r() * 0.06, 0.45, 0.22 + r() * 0.1) }); }
  for (let i = 0; i < 160; i++) { const rr = 1.5 + Math.sqrt(r()) * (CORE - 1.5), a = r() * Math.PI * 2; const x = Math.cos(a) * rr, z = Math.sin(a) * rr; const h = 6 + r() * 4;
    trees.push({ x, z, y: H(x, z), a, rr, h, cw: 0.9 + r() * 0.6, ph: r(), green: new THREE.Color().setHSL(0.27 + r() * 0.06, 0.45, 0.22 + r() * 0.1) }); }
  T.trees = trees; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), qa = new THREE.Quaternion(), sc = V(1, 1, 1), col = new THREE.Color(), scorched = new THREE.Color(0x7a4a2a), ash = new THREE.Color(0x3a2a20);
  // blast(u): 0 = untouched, u·(R+60) = shock radius; burn(k) browns the crowns of fallen trees
  T.blast = (u, t = 0) => { const front = u * (R + 70);
    for (let i = 0; i < N; i++) { const tr = trees[i]; const hit = u > 0 && tr.rr < front; const k = hit ? Math.min(1, (front - tr.rr) / 10) : 0; const core = tr.rr < CORE;
      const sway = u === 0 ? Math.sin(t * 1.3 + tr.ph * 6) * 0.03 : 0;
      // fall: rotate about the horizontal axis perpendicular to the radial direction
      const fall = core ? 0 : k * (Math.PI / 2 - 0.08); const axis = V(-Math.sin(tr.a), 0, Math.cos(tr.a)); q.setFromAxisAngle(axis, -fall); qa.setFromAxisAngle(V(1, 0, 0), sway); q.multiply(qa);
      m4.compose(V(tr.x, tr.y, tr.z), q, sc.set(1, tr.h, 1)); trunks.setMatrixAt(i, m4);
      const cs = core && hit ? 0 : 1 - 0.6 * k; const cw = 1 - 0.5 * k; const cpos = V(0, tr.h * 0.3, 0).applyQuaternion(q).add(V(tr.x, tr.y, tr.z));
      m4.compose(cpos, q, sc.set(tr.cw * cs * cw, tr.h * 0.8 * Math.max(cs, 0.0001), tr.cw * cs * cw)); crowns.setMatrixAt(i, m4);
      col.copy(tr.green); if (hit) col.lerp(core ? ash : scorched, Math.min(1, k * 1.5)); crowns.setColorAt(i, col);
      trunks.setColorAt(i, hit && core ? ash : col.set(0xffffff)); }
    trunks.instanceMatrix.needsUpdate = crowns.instanceMatrix.needsUpdate = true; crowns.instanceColor.needsUpdate = true; trunks.instanceColor.needsUpdate = true;
    ring.visible = u > 0 && u < 1; ring.scale.setScalar(Math.max(0.01, front)); ring.material.opacity = 0.8 * (1 - u);
    dust.forEach((s, j) => { const a = j / dust.length * Math.PI * 2; s.visible = u > 0.02 && u < 1; s.position.set(Math.cos(a) * front, 3 + (j % 3) * 2, Math.sin(a) * front); s.scale.setScalar(14 + front * 0.15); s.material.opacity = 0.55 * (1 - u); }); };
  // shock ring + dust wall
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 96), new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, depthWrite: false, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 2; scene.add(ring);
  const dustT = glowT('rgba(220,200,170,1)', 'rgba(200,170,130,A)'); const dust = []; for (let j = 0; j < 72; j++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustT, transparent: true, depthWrite: false })); scene.add(s); dust.push(s); }
  // fireball + trail + flash
  const fbT = glowT('rgba(255,255,255,1)', 'rgba(140,190,255,A)'); const fb = new THREE.Sprite(new THREE.SpriteMaterial({ map: fbT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); scene.add(fb); T.fb = fb;
  const trail = []; for (let j = 0; j < 40; j++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: fbT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, color: 0xbfd8ff })); scene.add(s); trail.push(s); }
  const START = V(-520, 260, -380); T.START = START;
  T.fireball = (p, k = 1) => { fb.visible = k > 0 && p < 1; trail.forEach((s) => { s.visible = fb.visible; }); if (!fb.visible) return; const pos = START.clone().lerp(AIR, p); fb.position.copy(pos); fb.scale.setScalar(70 * k * (0.8 + 0.4 * p));
    trail.forEach((s, j) => { const pp = Math.max(0, p - j * 0.02); s.position.copy(START.clone().lerp(AIR, pp)); s.scale.setScalar(55 * (1 - j / 40) * k); s.material.opacity = 0.85 * (1 - j / 40); }); };
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT('rgba(255,255,255,1)', 'rgba(255,230,190,A)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); flash.position.copy(AIR); scene.add(flash);
  const flashL = new THREE.PointLight(0xfff0e0, 0, 0, 0); flashL.position.copy(AIR); scene.add(flashL);
  T.flash = (k) => { flash.visible = k > 0.01; flash.scale.setScalar(60 + 900 * k); flash.material.opacity = Math.min(1, k * 1.4); flashL.intensity = 40 * k; };
  // ---- the trading post far out (CABIN): log house, porch, chair, window
  const cab = new THREE.Group(); cab.position.copy(CABIN); cab.position.y = H(CABIN.x, CABIN.z); scene.add(cab); T.cab = cab;
  const logT = tex(512, 512, (g, w, h) => { for (let y = 0; y < h; y += 32) { const gr = g.createLinearGradient(0, y, 0, y + 32); gr.addColorStop(0, '#8a5a34'); gr.addColorStop(0.5, '#b07a4a'); gr.addColorStop(1, '#6a4226'); g.fillStyle = gr; g.fillRect(0, y, w, 32); g.fillStyle = 'rgba(40,20,10,0.5)'; g.fillRect(0, y + 30, w, 2); } }, [2, 1]);
  const house = new THREE.Mesh(new THREE.BoxGeometry(7, 3.2, 5), STD(0xffffff, { map: logT })); house.position.set(0, 1.6, -2.5); house.castShadow = house.receiveShadow = true; cab.add(house);
  const roofM = STD(0x5a4a3a); for (const s of [-1, 1]) { const rf = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.18, 3.4), roofM); rf.position.set(0, 3.9, -2.5 + s * 1.35); rf.rotation.x = s * 0.62; rf.castShadow = true; cab.add(rf); }
  const porch = new THREE.Mesh(new THREE.BoxGeometry(7, 0.2, 2.2), STD(0x9a6a40)); porch.position.set(0, 0.25, 1.1); porch.receiveShadow = true; cab.add(porch);
  for (const x of [-3.3, 3.3]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.6, 8), STD(0x7a5030)); post.position.set(x, 1.5, 2.1); cab.add(post); }
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1, 2), STD(0x5a3a22)); door.position.set(-1.6, 1.25, 0.01); cab.add(door);
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.1), STD(0x7a5a3a)); frame.position.set(1.4, 1.8, 0.01); cab.add(frame);
  const glassM = new THREE.MeshStandardMaterial({ color: 0xcfe6ff, roughness: 0.1, metalness: 0.0, emissive: 0x6a90b8, emissiveIntensity: 0.5, transparent: true, opacity: 0.8, side: THREE.DoubleSide }); const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.9), glassM); glass.position.set(1.4, 1.8, 0.03); cab.add(glass);
  const shards = []; for (let j = 0; j < 22; j++) { const g = new THREE.BufferGeometry(); const a = r() * 6.28; g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, Math.cos(a) * 0.25, Math.sin(a) * 0.25, 0, Math.cos(a + 1) * 0.2, Math.sin(a + 1) * 0.2, 0], 3)); g.computeVertexNormals();
    const s = new THREE.Mesh(g, glassM); s.userData = { o: V(1.4 + (r() - 0.5) * 1.1, 1.8 + (r() - 0.5) * 0.8, 0.05), v: V((r() - 0.5) * 3, 1 + r() * 2.5, 2 + r() * 3), w: V(r() * 9, r() * 9, r() * 9) }; s.visible = false; cab.add(s); shards.push(s); }
  T.shatter = (u) => { glass.visible = u <= 0; shards.forEach((s) => { s.visible = u > 0; if (!s.visible) return; const d = s.userData; const tt = u * 1.2; s.position.copy(d.o).addScaledVector(d.v, tt).add(V(0, -4.9 * tt * tt, 0)); s.position.y = Math.max(0.3, s.position.y); s.rotation.set(d.w.x * tt, d.w.y * tt, d.w.z * tt); }); };
  const chair = new THREE.Group(); const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.6), STD(0x8a5a34)); seat.position.y = 0.5; chair.add(seat); const back = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.08), STD(0x8a5a34)); back.position.set(0, 0.85, -0.28); chair.add(back);
  for (const [x, z] of [[-0.26, -0.26], [0.26, -0.26], [-0.26, 0.26], [0.26, 0.26]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), STD(0x6a4226)); l.position.set(x, 0.25, z); chair.add(l); }
  chair.position.set(0.6, 0.35, 1.0); chair.traverse((o) => { if (o.isMesh) o.castShadow = true; }); cab.add(chair); T.chair = chair;
  const fence = new THREE.Group(); for (let i = 0; i < 14; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.12), STD(0x7a5a3a)); p.position.set(-8 + i * 1.3, 0.6, 5); fence.add(p); } const rail = new THREE.Mesh(new THREE.BoxGeometry(17, 0.1, 0.1), STD(0x7a5a3a)); rail.position.set(0.5, 0.9, 5); fence.add(rail); cab.add(fence);
  // ---- calendar flip card (T09)
  const cal = makeCard(24, 30, 768, () => {}, { transparent: true }); scene.add(cal); T.cal = cal;
  T.calendar = (year, flip = 0) => { cal.visible = year > 0; if (!cal.visible) return; cal.userData.redraw((g, w, h) => { g.fillStyle = '#f4ede0'; g.strokeStyle = '#2a1a16'; g.lineWidth = 20; g.beginPath(); g.roundRect(20, 60, w - 40, h - 80, 40); g.fill(); g.stroke();
      g.fillStyle = '#c8302a'; g.beginPath(); g.roundRect(20, 60, w - 40, 200, [40, 40, 0, 0]); g.fill(); g.stroke(); for (const x of [0.3, 0.7]) { g.fillStyle = '#2a1a16'; g.beginPath(); g.roundRect(w * x - 18, 20, 36, 90, 18); g.fill(); }
      signText(g, 'ปี', w / 2, 160, 110, '#ffffff', '#5a1a14', 'Kanit, Montserrat'); signText(g, String(year), w / 2, h * 0.6, 250, '#2a1a16', '#f4ede0');
      if (flip > 0) { g.fillStyle = `rgba(220,210,190,${0.9 * flip})`; g.fillRect(20, 260, w - 40, (h - 300) * flip); } }); };
  T.calendar(0);
  T.blast(0); T.fireball(0, 0); T.flash(0); T.shatter(0);
  return T;
}
