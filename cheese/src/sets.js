// Sets for The Bank That Keeps Cheese: dairy (+ barn corner), arcaded street with the bank, marble lobby with the round
// vault door, the cheese vault (instanced wheels on tall racks, skylights, the turning machine), the night loading dock.
// Built for the animation3d style: dense props, saturated materials, warm vs cool practicals.
import * as THREE from './three.module.js';
import { canvasTex } from './world.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rnd = (s) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
const std = (c, r = 0.7, m = 0, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...extra });
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const cyl = (r0, r1, h, m, seg = 20) => new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), m);
const shadowed = (o) => { o.traverse((x) => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } }); return o; };
const glow = (c, i = 2) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i) });
function planks(base, n = 10, seed = 3, vert = false, rep = [1, 1]) { const r = rnd(seed); return canvasTex(512, 512, (x, w, h) => { x.fillStyle = base; x.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '255,220,170' : '40,20,5'},${0.06 + r() * 0.14})`; vert ? x.fillRect(i * w / n, 0, w / n - 3, h) : x.fillRect(0, i * h / n, w, h / n - 3); x.fillStyle = 'rgba(40,20,8,0.7)'; vert ? x.fillRect((i + 1) * w / n - 3, 0, 3, h) : x.fillRect(0, (i + 1) * h / n - 3, w, 3); }
  for (let k = 0; k < 400; k++) { x.fillStyle = `rgba(${r() < 0.5 ? '255,230,190' : '30,15,0'},0.06)`; vert ? x.fillRect(r() * w, r() * h, 1.5, 30 + r() * 50) : x.fillRect(r() * w, r() * h, 30 + r() * 50, 1.5); } }, rep); }
function stones(base, seed = 5, rep = [1, 1]) { const r = rnd(seed); return canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#6a5a48'; x.fillRect(0, 0, w, h);
  for (let j = 0; j < 12; j++) for (let i = 0; i < 6; i++) { const ox = (j % 2) * 42; const c = new THREE.Color(base).offsetHSL((r() - 0.5) * 0.03, (r() - 0.5) * 0.1, (r() - 0.5) * 0.12); x.fillStyle = '#' + c.getHexString(); x.beginPath(); x.roundRect(i * 85 + ox + 3, j * 43 + 3, 78 + r() * 6, 37, 8); x.fill(); } }, rep); }

// ---------- the cheese wheel ----------
export const WHEEL = { r: 0.22, h: 0.24 };
const rindTex = canvasTex(512, 128, (x, w, h) => { x.fillStyle = '#e9c97a'; x.fillRect(0, 0, w, h); const r = rnd(9);
  for (let k = 0; k < 900; k++) { x.fillStyle = `rgba(${r() < 0.5 ? '255,240,200' : '150,100,30'},0.12)`; x.fillRect(r() * w, r() * h, 2 + r() * 4, 2); }
  x.fillStyle = 'rgba(120,80,20,0.55)'; for (let row = 0; row < 3; row++) for (let i = 0; i < 64; i++) if ((i + row) % 7 > 1) { x.beginPath(); x.arc(4 + i * 8, 34 + row * 30, 2.2, 0, 7); x.fill(); } });
export function wheelGeo() { const pr = [[0, -WHEEL.h / 2], [WHEEL.r * 0.92, -WHEEL.h / 2], [WHEEL.r, -WHEEL.h * 0.3], [WHEEL.r * 1.04, 0], [WHEEL.r, WHEEL.h * 0.3], [WHEEL.r * 0.92, WHEEL.h / 2], [0, WHEEL.h / 2]].map(([a, b]) => new THREE.Vector2(a, b)); return new THREE.LatheGeometry(pr, 40); }
export const rindMat = (tint = 0xffffff) => new THREE.MeshStandardMaterial({ map: rindTex, color: tint, roughness: 0.6 });
export function makeWheel(tint) { const m = new THREE.Mesh(wheelGeo(), rindMat(tint)); m.castShadow = m.receiveShadow = true; return m; }
export const PALE = new THREE.Color(1.0, 0.97, 0.82), GOLD = new THREE.Color(1.0, 0.72, 0.32);

// ---------- dairy (with the kitchen table and the barn corner) ----------
export function makeDairy() {
  const S = new THREE.Scene(); S.fog = new THREE.FogExp2(0x3a2a1a, 0.02); S.background = new THREE.Color(0x2a1e14);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), std(0xffffff, 0.9, 0, { map: stones('#9a7a5a', 7, [6, 6]) })); floor.rotation.x = -Math.PI / 2; S.add(floor);
  const wallM = std(0xffffff, 0.95, 0, { map: stones('#c8a37a', 3, [4, 1.2]) });
  for (const [x, z, ry, w] of [[0, -5, 0, 24], [-8, 0, Math.PI / 2, 14], [12, 0, -Math.PI / 2, 14]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 5), wallM); m.position.set(x, 2.5, z); m.rotation.y = ry; S.add(m); }
  for (let i = 0; i < 8; i++) { const b = box(24, 0.3, 0.35, std(0x5a3a22, 0.8)); b.position.set(2, 4.6, -4.5 + i * 1.4); S.add(b); }
  // window with a warm sunbeam
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.8), glow(0xfff0c8, 2.6)); win.position.set(-2.5, 2.8, -4.98); S.add(win);
  const fr = box(1.8, 2.0, 0.1, std(0x5a3a22)); fr.position.set(-2.5, 2.8, -5.03); S.add(fr);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 7), new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.05, depthWrite: false, blending: THREE.AdditiveBlending })); beam.position.set(-1.6, 1.8, -1.6); beam.rotation.set(-0.5, 0.2, 0); S.add(beam);
  // the copper vat
  const copper = std(0xd0743a, 0.32, 0.9); const vat = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.9, 0.05], [1.0, 0.5], [0.95, 1.1], [1.0, 1.15]].map(([a, b]) => new THREE.Vector2(a, b)), 32), copper);
  vat.material.side = THREE.DoubleSide; vat.position.set(-4.4, 0.0, -2.6); S.add(vat); const milk = new THREE.Mesh(new THREE.CircleGeometry(0.93, 32), std(0xfff6dc, 0.4)); milk.rotation.x = -Math.PI / 2; milk.position.set(-4.4, 1.0, -2.6); S.add(milk);
  const fire = new THREE.PointLight(0xff8a3a, 6, 6, 1.6); fire.position.set(-4.4, 0.25, -2.6); S.add(fire);
  // shelves of young wheels
  const shelfM = std(0x7a5232, 0.8); const young = rindMat(PALE);
  for (let lv = 0; lv < 4; lv++) { const sh = box(5.5, 0.06, 0.6, shelfM); sh.position.set(3.4, 0.5 + lv * 0.8, -4.55); S.add(sh); for (let i = 0; i < 10; i++) { const w = new THREE.Mesh(wheelGeo(), young); w.position.set(1.0 + i * 0.52, 0.5 + lv * 0.8 + WHEEL.h / 2 + 0.03, -4.55); S.add(w); } }
  // work table with the fresh wheel in its band, cloths, ladle; the kitchen table with bills
  const table = box(2.2, 0.08, 1.1, std(0x9a6a3a, 0.7)); table.position.set(0, 0.9, -1.2); S.add(table); for (const [x, z] of [[-1, -1.6], [1, -1.6], [-1, -0.8], [1, -0.8]]) { const l = box(0.08, 0.9, 0.08, shelfM); l.position.set(x, 0.45, z); S.add(l); }
  const ktable = box(1.6, 0.06, 1.0, std(0x8a5a32, 0.7)); ktable.position.set(5.6, 0.82, 1.2); S.add(ktable); for (const [x, z] of [[4.9, 0.8], [6.3, 0.8], [4.9, 1.6], [6.3, 1.6]]) { const l = box(0.06, 0.82, 0.06, shelfM); l.position.set(x, 0.41, z); S.add(l); }
  const bills = []; const r = rnd(4); for (let i = 0; i < 24; i++) { const b = box(0.22, 0.004, 0.3, std(i % 4 ? 0xf4efe2 : 0xf2d7d0, 0.9)); b.position.set(5.4 + (r() - 0.5) * 0.25, 0.86 + i * 0.006, 1.1 + (r() - 0.5) * 0.2); b.rotation.y = (r() - 0.5) * 0.8; S.add(b); bills.push(b); }
  const lampK = new THREE.PointLight(0xffc070, 4, 5, 1.5); lampK.position.set(5.6, 2.1, 1.0); S.add(lampK); const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), glow(0xffd090, 3)); bulb.position.copy(lampK.position); S.add(bulb);
  // calendar on the wall: a stack of pages that flip
  const calTex = (k) => canvasTex(128, 160, (x, w, h) => { x.fillStyle = '#fbf7ee'; x.fillRect(0, 0, w, h); x.fillStyle = ['#c8312d', '#2f6fd6', '#3a8a3a', '#d08a2a'][k % 4]; x.fillRect(0, 0, w, 34); x.fillStyle = '#c8c0b0'; for (let i = 0; i < 5; i++) for (let j = 0; j < 7; j++) x.fillRect(8 + j * 16, 44 + i * 22, 12, 16); });
  const cal = new THREE.Group(); cal.position.set(5.6, 2.3, -4.95); S.add(cal); const pages = []; for (let k = 0; k < 8; k++) { const piv = new THREE.Group(); piv.position.y = 0.4; const pg = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.62), new THREE.MeshStandardMaterial({ map: calTex(k), side: THREE.DoubleSide })); pg.position.y = -0.31; piv.position.z = 0.002 * (8 - k); piv.add(pg); cal.add(piv); pages.push(piv); }
  // barn corner: trough
  const trough = box(2.6, 0.5, 0.7, std(0x6a4a2a, 0.8)); trough.position.set(9.5, 0.25, 2.5); S.add(trough); const hay = box(2.4, 0.06, 0.55, std(0xd8b04a, 1)); hay.position.set(9.5, 0.3, 2.5); S.add(hay);
  for (let i = 0; i < 4; i++) { const h = cyl(0.55, 0.55, 1.1, std(0xd8b04a, 1)); h.rotation.z = Math.PI / 2; h.position.set(11.0, 0.55, -4.0 + i * 1.2); S.add(h); }
  // clutter: ladles, buckets, milk cans, hanging cloths, copper pans
  for (let i = 0; i < 5; i++) { const c = cyl(0.18, 0.2, 0.55, std(0xb8c0c8, 0.3, 0.8), 16); c.position.set(-6.6 + i * 0.45, 0.28, 0.6 + (i % 2) * 0.4); S.add(c); }
  for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.12, 16), copper); p.position.set(-1.0 + i * 0.5, 3.4, -4.85); p.rotation.x = Math.PI / 2; S.add(p); }
  const sun = new THREE.DirectionalLight(0xffd6a0, 2.6); sun.position.set(-4, 7, -10); sun.target.position.set(0, 0, 0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10 }); sun.shadow.bias = -0.0005; S.add(sun, sun.target);
  S.add(new THREE.HemisphereLight(0xffe2c0, 0x4a3020, 0.7));
  const steam = []; const sm = new THREE.SpriteMaterial({ map: softDot(), color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false }); for (let i = 0; i < 40; i++) { const s = new THREE.Sprite(sm); S.add(s); steam.push({ s, a: r() * 6.28, sp: 0.3 + r() * 0.5, o: r() }); }
  shadowed(S);
  return { scene: S, bills, pages, update(t) { steam.forEach((q) => { const k = (t * q.sp * 0.4 + q.o) % 1; q.s.position.set(-4.4 + Math.cos(q.a) * 0.6 * (0.3 + k), 1.1 + k * 2.4, -2.6 + Math.sin(q.a) * 0.5 * (0.3 + k)); const sc = 0.4 + k * 1.4; q.s.scale.set(sc, sc, 1); q.s.material.opacity = 0.18; }); fire.intensity = 6 + Math.sin(t * 17) * 0.8 + Math.sin(t * 7.3) * 0.6; } };
}
function softDot() { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }

// ---------- arcaded street with the bank at the end ----------
export function makeStreet(scene) {
  const S = scene; const r = rnd(21);
  const cob = new THREE.Mesh(new THREE.PlaneGeometry(14, 120), std(0xffffff, 0.85, 0, { map: stones('#b09878', 11, [6, 40]) })); cob.rotation.x = -Math.PI / 2; cob.position.set(0, 0, -40); cob.receiveShadow = true; S.add(cob);
  const facades = [0xd9733f, 0xe7b04e, 0xc9563a, 0xe6c78e, 0xb85a36, 0xd88a4a]; const shutterM = std(0x2f6e4f, 0.6); const columnM = std(0xe4cfa6, 0.8); const archM = std(0xd8bf94, 0.85);
  const cols = []; // arcade columns (a foreground wipe passes these)
  for (const s of [-1, 1]) for (let i = 0; i < 26; i++) {
    const z = 2 - i * 3.6; const fm = std(facades[Math.floor(r() * facades.length)], 0.9);
    const fac = box(0.4, 13, 3.6, fm); fac.position.set(s * 6.8, 6.5, z - 1.8); S.add(fac);
    const col = cyl(0.28, 0.32, 3.6, columnM, 16); col.position.set(s * 4.3, 1.8, z); S.add(col); cols.push(col);
    const cap = box(0.75, 0.25, 0.75, columnM); cap.position.set(s * 4.3, 3.7, z); S.add(cap);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.22, 8, 16, Math.PI), archM); arch.position.set(s * 4.3, 3.8, z - 1.8); arch.rotation.y = Math.PI / 2; S.add(arch);
    const up = box(0.5, 9.2, 3.6, fm); up.position.set(s * 4.3, 8.4, z - 1.8); S.add(up);
    for (let f = 0; f < 3; f++) { const w = box(0.1, 1.4, 0.9, std(0x1d2a34, 0.2, 0.3)); w.position.set(s * 4.02, 6.0 + f * 2.4, z - 1.8); S.add(w); for (const d of [-1, 1]) { const sh = box(0.08, 1.4, 0.42, shutterM); sh.position.set(s * 4.0, 6.0 + f * 2.4, z - 1.8 + d * 0.7); S.add(sh); } }
    const ceil = box(2.6, 0.2, 3.6, archM); ceil.position.set(s * 5.5, 3.95, z - 1.8); S.add(ceil);
    { const shop = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), glow([0xffd9a0, 0xffe8c0, 0xffc890][i % 3], 1.25)); shop.position.set(s * 6.58, 1.5, z - 1.8); shop.rotation.y = -s * Math.PI / 2; S.add(shop);
      const sf = box(0.12, 2.7, 2.7, std([0x2f5a3a, 0x6a2a20, 0x2a3a5a][i % 3], 0.6)); sf.position.set(s * 6.62, 1.5, z - 1.8); S.add(sf);
      for (let k = 0; k < 4; k++) { const g = box(0.05, 0.25 + r() * 0.3, 0.3, std([0xe8b84a, 0xc8312d, 0x3a8a3a, 0xf2e2b8][(k + i) % 4], 0.7)); g.position.set(s * 6.5, 0.6 + (k % 2) * 0.6, z - 2.6 + k * 0.5); S.add(g); }
      const sign = box(0.06, 0.45, 1.2, std([0xc8312d, 0x2f5a3a, 0xe3b341, 0x2a3a5a][i % 4], 0.6)); sign.position.set(s * 5.4, 3.2, z - 1.8); sign.rotation.y = Math.PI / 2; S.add(sign);
      if (i % 3 === 1) { for (const dz of [-0.6, 0.6]) { const tbl = cyl(0.35, 0.35, 0.04, std(0xf2f2f2, 0.5), 16); tbl.position.set(s * 5.4, 0.75, z - 1.8 + dz); S.add(tbl); const leg = cyl(0.03, 0.03, 0.75, std(0x2a2a2a, 0.5, 0.5), 8); leg.position.set(s * 5.4, 0.375, z - 1.8 + dz); S.add(leg); const cup = cyl(0.04, 0.03, 0.08, std(0xffffff, 0.4), 8); cup.position.set(s * 5.4, 0.81, z - 1.8 + dz); S.add(cup); } }
      if (i % 3 === 2) { for (let k = 0; k < 3; k++) { const cr = box(0.5, 0.3, 0.4, std(0x9a6a3a, 0.8)); cr.position.set(s * 5.9, 0.15 + k * 0.32, z - 1.8 + (k % 2) * 0.2); S.add(cr); for (let q = 0; q < 5; q++) { const fr = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), std([0xe8551a, 0xf2c230, 0x3a9a3a][k], 0.6)); fr.position.set(s * 5.9 + (q - 2) * 0.08, 0.33 + k * 0.32, z - 1.8 + (k % 2) * 0.2); S.add(fr); } } } }
    if (r() < 0.5) { const pot = cyl(0.25, 0.18, 0.4, std(0xb8562a, 0.8), 12); pot.position.set(s * 3.9, 0.2, z - 0.9); S.add(pot); const pl = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), std(0x3f8a3a, 0.9)); pl.position.set(s * 3.9, 0.65, z - 0.9); S.add(pl); }
    if (r() < 0.35) { const aw = box(1.6, 0.06, 1.2, std(r() < 0.5 ? 0xc8312d : 0x2f6fd6, 0.8)); aw.position.set(s * 5.4, 2.9, z - 1.8); aw.rotation.z = s * 0.25; S.add(aw); }
    if (r() < 0.3) { const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), glow(0xffd090, 2.2)); lamp.position.set(s * 5.5, 3.5, z - 1.8); S.add(lamp); }
  }
  // the bank: a grand facade closing the street
  const bankM = std(0xefe2c8, 0.7); const bank = new THREE.Group(); bank.position.set(0, 0, -60); S.add(bank);
  const bf = box(13, 16, 1, bankM); bf.position.set(0, 8, -1); bank.add(bf);
  for (let i = 0; i < 6; i++) { const c = cyl(0.45, 0.5, 8, bankM, 20); c.position.set(-5 + i * 2, 5.2, 0.6); bank.add(c); }
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0, 7.4, 2.6, 3), bankM); ped.rotation.y = Math.PI / 2; ped.scale.set(1, 1, 0.12); ped.position.set(0, 10.6, 0.6); ped.rotation.z = 0; bank.add(ped);
  const ent = box(12, 0.4, 1.2, bankM); ent.position.set(0, 9.3, 0.6); bank.add(ent);
  for (let k = 0; k < 4; k++) { const st = box(12 - k * 0.6, 0.3, 1.2, bankM); st.position.set(0, 0.15 + k * 0.3, 2.8 - k * 0.6); bank.add(st); }
  const door = box(2.6, 4.2, 0.2, std(0x8a5a22, 0.3, 0.8)); door.position.set(0, 3.3, -0.45); bank.add(door);
  const lamps = [-3, 3].map((x) => { const l = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), glow(0xffe0a0, 2.4)); l.position.set(x, 4.5, 1.5); bank.add(l); return l; });
  shadowed(bank);
  for (let i = 0; i < 8; i++) { const b = new THREE.Group(); const fm = std([0xc8312d, 0x2f6fd6, 0x1a1a1a][i % 3], 0.4, 0.5); for (const z of [-0.5, 0.5]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.04, 6, 20), std(0x222222, 0.5)); w.position.z = z; w.rotation.y = Math.PI / 2; b.add(w); } const fr = box(0.05, 0.05, 1.0, fm); fr.position.y = 0.3; b.add(fr); b.position.set(i % 2 ? 3.6 : -3.6, 0.36, -6 - i * 7); b.rotation.y = Math.PI / 2; S.add(b); }
  return { cols };
}

// ---------- marble lobby with the round vault door ----------
export function makeLobby() {
  const S = new THREE.Scene(); S.background = new THREE.Color(0x2a2016);
  const marble = canvasTex(512, 512, (x, w, h) => { const r = rnd(13); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#2a3a34' : '#efe6d6'; x.fillRect(i * 128, j * 128, 128, 128); } x.strokeStyle = 'rgba(140,120,100,0.25)'; x.lineWidth = 2; for (let k = 0; k < 40; k++) { x.beginPath(); x.moveTo(r() * w, r() * h); x.bezierCurveTo(r() * w, r() * h, r() * w, r() * h, r() * w, r() * h); x.stroke(); } }, [6, 6]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), std(0xffffff, 0.15, 0.1, { map: marble })); floor.rotation.x = -Math.PI / 2; S.add(floor);
  const wallM = std(0xd9c49a, 0.8); const darkW = std(0x5a3a22, 0.6);
  for (const [x, z, ry] of [[0, -6, 0], [-8, 0, Math.PI / 2], [8, 0, -Math.PI / 2]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), wallM); m.position.set(x, 4.5, z); m.rotation.y = ry; S.add(m); const wd = new THREE.Mesh(new THREE.PlaneGeometry(16, 1.4), darkW); wd.position.set(x, 0.7, z); wd.position.addScaledVector(new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry)), 0.02); wd.rotation.y = ry; S.add(wd); }
  for (const x of [-6.5, -3.5, 3.5, 6.5]) { const c = cyl(0.42, 0.48, 9, std(0xf2ead8, 0.3), 24); c.position.set(x, 4.5, -5.2); S.add(c); }
  // counter with brass rail, green lamp, papers, a bell
  const counter = box(5.5, 1.15, 1.0, std(0x6a3a1e, 0.5)); counter.position.set(-1.0, 0.575, -1.2); S.add(counter);
  const top = box(5.7, 0.08, 1.15, std(0x2a1a10, 0.3)); top.position.set(-1.0, 1.19, -1.2); S.add(top);
  const brass = std(0xe0b050, 0.25, 0.95); const rail = cyl(0.03, 0.03, 5.6, brass, 8); rail.rotation.z = Math.PI / 2; rail.position.set(-1.0, 1.55, -1.65); S.add(rail);
  const lampShade = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), std(0x1f6a3a, 0.3, 0.2, { side: THREE.DoubleSide })); lampShade.position.set(-2.6, 1.6, -1.25); S.add(lampShade);
  const lampL = new THREE.PointLight(0xfff0c0, 3, 4, 1.5); lampL.position.set(-2.6, 1.5, -1.2); S.add(lampL);
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), brass); bell.position.set(0.5, 1.23, -0.95); S.add(bell);
  // chandelier
  const ch = new THREE.Group(); ch.position.set(0, 7.2, -1); S.add(ch); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const c = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), glow(0xffe0a0, 2.6)); c.position.set(Math.cos(a) * 0.9, 0, Math.sin(a) * 0.9); ch.add(c); } const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.05, 8, 32), brass); ring.rotation.x = Math.PI / 2; ch.add(ring);
  const chL = new THREE.PointLight(0xffd8a0, 18, 14, 1.5); chL.position.set(0, 6.6, -1); S.add(chL);
  // the vault door: thick steel disc with a spoked wheel and bolts, hinged on the left
  const steel = std(0xb8c0c8, 0.28, 0.95); const hinge = new THREE.Group(); hinge.position.set(1.9, 2.2, -5.8); S.add(hinge);
  const disc = cyl(1.9, 1.9, 0.6, steel, 48); disc.rotation.x = Math.PI / 2; disc.position.set(1.9, 0, 0.3); hinge.add(disc);
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; const b = cyl(0.09, 0.09, 0.2, std(0x8a929a, 0.3, 0.9), 12); b.rotation.x = Math.PI / 2; b.position.set(1.9 + Math.cos(a) * 1.65, Math.sin(a) * 1.65, 0.65); hinge.add(b); }
  const spin = new THREE.Group(); spin.position.set(1.9, 0, 0.75); hinge.add(spin); for (let i = 0; i < 3; i++) { const sp = cyl(0.05, 0.05, 1.5, brass, 8); sp.rotation.z = i * Math.PI / 3; spin.add(sp); } const hub = cyl(0.2, 0.2, 0.15, brass, 16); hub.rotation.x = Math.PI / 2; spin.add(hub);
  const frame = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.25, 12, 48), steel); frame.position.set(3.8, 2.2, -5.95); S.add(frame);
  const behind = new THREE.Mesh(new THREE.CircleGeometry(1.9, 40), glow(0xffd28a, 2.8)); behind.position.set(3.8, 2.2, -6.2); S.add(behind);
  const vaultL = new THREE.PointLight(0xffc870, 0, 12, 1.2); vaultL.position.set(3.8, 2.2, -5.4); S.add(vaultL);
  for (const x of [-6.2, 6.2]) { const pot = cyl(0.35, 0.28, 0.7, std(0x9a5a2a, 0.7), 14); pot.position.set(x, 0.35, -4.6); S.add(pot); for (let k = 0; k < 6; k++) { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), std(0x2f7a3a, 0.9)); lf.position.set(x + Math.cos(k) * 0.3, 1.0 + k * 0.15, -4.6 + Math.sin(k) * 0.3); S.add(lf); } }
  const clock = new THREE.Mesh(new THREE.CircleGeometry(0.6, 32), new THREE.MeshStandardMaterial({ map: canvasTex(128, 128, (x) => { x.fillStyle = '#f8f2e2'; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill(); x.strokeStyle = '#2a1d1d'; x.lineWidth = 6; x.stroke(); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; x.fillStyle = '#2a1d1d'; x.fillRect(64 + Math.cos(a) * 50 - 3, 64 + Math.sin(a) * 50 - 3, 6, 6); } x.lineWidth = 5; x.beginPath(); x.moveTo(64, 64); x.lineTo(64, 24); x.moveTo(64, 64); x.lineTo(92, 64); x.stroke(); }) })); clock.position.set(-3.5, 5.6, -5.97); S.add(clock);
  const key = new THREE.DirectionalLight(0xffe2b8, 1.4); key.position.set(-5, 8, 6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9 }); key.shadow.bias = -0.0005; S.add(key, key.target);
  S.add(new THREE.HemisphereLight(0xfff0dc, 0x3a2a1a, 0.6));
  shadowed(S);
  return { scene: S, hinge, spin, vaultL, behind };
}

// ---------- the vault: aisles of tall racks full of wheels ----------
export function makeVault(nAisles = 5, levels = 12, perRow = 90) {
  const S = new THREE.Scene(); S.background = new THREE.Color(0x1a140e); S.fog = new THREE.Fog(0x2a1e12, 18, 70);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 90), std(0x8a8270, 0.35, 0.1)); floor.rotation.x = -Math.PI / 2; floor.position.z = -30; S.add(floor);
  const plankM = std(0x9a6a3a, 0.8), postM = std(0x4a5a66, 0.5, 0.6); const rackX = []; for (let a = 0; a < nAisles; a++) { const cx = (a - (nAisles - 1) / 2) * 4.4; rackX.push(cx - 1.3, cx + 1.3); }
  const L = perRow * 0.52; const count = rackX.length * levels * perRow;
  const geo = (() => { const pr = [[0, -WHEEL.h / 2], [WHEEL.r * 0.92, -WHEEL.h / 2], [WHEEL.r * 1.03, 0], [WHEEL.r * 0.92, WHEEL.h / 2], [0, WHEEL.h / 2]].map(([a, b]) => new THREE.Vector2(a, b)); return new THREE.LatheGeometry(pr, 14); })(); const mat = rindMat(0xffffff); const inst = new THREE.InstancedMesh(geo, mat, count); inst.castShadow = false; inst.receiveShadow = true;
  const m = new THREE.Matrix4(); const col = new THREE.Color(); const r = rnd(33); let n = 0; const age = new Float32Array(count); const pos = [];
  for (const x of rackX) for (let lv = 0; lv < levels; lv++) {
    const y = 0.3 + lv * 0.62; const sh = box(0.62, 0.05, L, plankM); sh.position.set(x, y - 0.03, -L / 2 + 1); sh.receiveShadow = true; S.add(sh);
    for (let i = 0; i < perRow; i++) { const z = 1 - 0.26 - i * 0.52; m.makeTranslation(x, y + WHEEL.h / 2 + 0.002, z); inst.setMatrixAt(n, m); age[n] = r(); col.copy(PALE).lerp(GOLD, age[n]); inst.setColorAt(n, col); pos.push(x, y, z); n++; }
  }
  for (const x of rackX) for (let i = 0; i <= perRow / 10; i++) { const p = box(0.08, levels * 0.62 + 0.3, 0.08, postM); p.position.set(x, levels * 0.31, 1 - i * 5.2); S.add(p); }
  inst.instanceMatrix.needsUpdate = true; S.add(inst);
  // skylights, beams, god rays
  for (let a = -1; a < nAisles; a++) { const sl = new THREE.Mesh(new THREE.PlaneGeometry(1.4, L), glow(0xfff2d8, 1.8)); sl.rotation.x = Math.PI / 2; sl.position.set((a - (nAisles - 1) / 2 + 0.5) * 4.4, levels * 0.62 + 2.6, -L / 2 + 1); S.add(sl); }
  const ray = new THREE.MeshBasicMaterial({ color: 0xffe0b0, transparent: true, opacity: 0.035, depthWrite: false, blending: THREE.AdditiveBlending }); const rays = [];
  for (let i = 0; i < 10; i++) { const g = new THREE.Mesh(new THREE.BoxGeometry(1.1, levels * 0.62 + 2.6, 1.1), ray); g.position.set((i % 5 - 2) * 4.4, (levels * 0.62 + 2.6) / 2, -4 - Math.floor(i / 5) * 18 - (i % 3) * 4); g.rotation.z = 0.18; S.add(g); rays.push(g); }
  const day = new THREE.DirectionalLight(0xffe0b0, 1.8); day.position.set(6, 30, 8); day.castShadow = true; day.shadow.mapSize.set(2048, 2048); Object.assign(day.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 80 }); day.shadow.bias = -0.0005; S.add(day, day.target);
  const hemi = new THREE.HemisphereLight(0xffe8c8, 0x3a2a18, 0.9); S.add(hemi);
  const aisleL = []; for (let i = 0; i < 4; i++) { const p = new THREE.PointLight(0xffc070, 8, 14, 1.4); p.position.set(0, 5.5, -3 - i * 9); S.add(p); aisleL.push(p); }
  // the turning machine: a yellow gantry on rails along aisle 0 with an arm, gripper and spinning brush
  const yel = std(0xf2b81a, 0.45, 0.3); const mach = new THREE.Group(); S.add(mach);
  const mx = (0 - (nAisles - 1) / 2) * 4.4; mach.position.set(mx, 0, -6);
  const frameL = box(0.18, levels * 0.62 + 0.6, 0.18, yel); frameL.position.set(-0.4, (levels * 0.62 + 0.6) / 2, 0); mach.add(frameL); const frameR = frameL.clone(); frameR.position.x = 0.4; mach.add(frameR);
  const car = new THREE.Group(); mach.add(car); const carB = box(1.0, 0.35, 0.6, yel); car.add(carB); const grip = box(0.6, 0.12, 0.5, std(0x3a3a3a, 0.4, 0.6)); grip.position.y = -0.22; car.add(grip);
  const brush = cyl(0.12, 0.12, 0.55, std(0x8a5a2a, 0.9), 12); brush.rotation.x = Math.PI / 2; brush.position.set(0, -0.12, 0.4); car.add(brush);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), glow(0xff8a2a, 3)); beacon.position.set(0, levels * 0.62 + 0.7, 0); mach.add(beacon);
  const held = makeWheel(PALE.clone()); held.position.y = -0.38; car.add(held);
  // thieves' night: flashlight spots, the escape door, the little cart
  const night = new THREE.Group(); S.add(night);
  const torches = [0, 1].map(() => { const s = new THREE.SpotLight(0xe8f0ff, 0, 18, 0.35, 0.6, 1.2); s.castShadow = false; S.add(s, s.target); return s; });
  const door = box(0.2, 3, 2.4, std(0x3a4a5a, 0.5, 0.6)); door.position.set(12.0, 1.5, -2.0); S.add(door);
  const cart = new THREE.Group(); const cb = box(1.0, 0.12, 0.7, std(0x6a6a72, 0.4, 0.7)); cb.position.y = 0.35; cart.add(cb); for (const [x, z] of [[-0.4, -0.3], [0.4, -0.3], [-0.4, 0.3], [0.4, 0.3]]) { const w = cyl(0.1, 0.1, 0.06, std(0x1a1a1a, 0.6), 12); w.rotation.x = Math.PI / 2; w.position.set(x, 0.1, z); cart.add(w); } const handle = box(0.05, 0.8, 0.6, std(0x6a6a72, 0.4, 0.7)); handle.position.set(-0.52, 0.7, 0); cart.add(handle); S.add(cart);
  const cartLoad = []; for (let i = 0; i < 9; i++) { const w = makeWheel(GOLD.clone()); w.visible = false; cart.add(w); cartLoad.push(w); }
  shadowed(mach); shadowed(cart);
  const ages = (k) => { for (let i = 0; i < count; i++) { col.copy(PALE).lerp(GOLD, Math.min(1, age[i] * (1 - k) + k * (0.55 + 0.45 * age[i]))); inst.setColorAt(i, col); } inst.instanceColor.needsUpdate = true; };
  return { scene: S, inst, rackX, levels, L, mach, car, brush, held, beacon, torches, cart, cartLoad, door, day, hemi, aisleL, rays, ages, aisleX: (a) => (a - (nAisles - 1) / 2) * 4.4 };
}

// ---------- night loading dock: a tiny overloaded van, a police car ----------
export function makeDock(scene) {
  const S = scene; const g = new THREE.Group(); S.add(g);
  const wall = box(40, 8, 0.6, std(0x8a8478, 0.9)); wall.position.set(0, 4, -6); g.add(wall);
  const shutter = box(5, 4.2, 0.1, std(0x6a7480, 0.4, 0.6)); shutter.position.set(-2, 2.1, -5.65); g.add(shutter);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), std(0x2a2c30, 0.25, 0.2)); road.rotation.x = -Math.PI / 2; road.position.z = 6; g.add(road);
  const lamp = cyl(0.08, 0.1, 6, std(0x2a2a2a, 0.5, 0.5), 10); lamp.position.set(6, 3, -3); g.add(lamp); const lb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), glow(0xffd090, 2.5)); lb.position.set(6, 6.1, -3); g.add(lb);
  const sl = new THREE.PointLight(0xffb060, 16, 18, 1.5); sl.position.set(6, 5.8, -3); g.add(sl);
  const van = new THREE.Group(); g.add(van); const vb = box(2.6, 1.5, 1.4, std(0xe8e2d0, 0.5, 0.1)); vb.position.set(0, 1.2, 0); van.add(vb); const cab = box(1.0, 1.1, 1.36, std(0xe8e2d0, 0.5, 0.1)); cab.position.set(1.75, 1.0, 0); van.add(cab);
  const wind = box(0.05, 0.5, 1.1, std(0x2a3a4a, 0.1, 0.4)); wind.position.set(2.26, 1.25, 0); van.add(wind);
  const wheels = []; for (const [x, z] of [[-0.8, -0.72], [-0.8, 0.72], [1.7, -0.72], [1.7, 0.72]]) { const w = cyl(0.34, 0.34, 0.24, std(0x1a1a1a, 0.6), 18); w.rotation.x = Math.PI / 2; w.position.set(x, 0.34, z); van.add(w); wheels.push(w); }
  const roofLoad = []; for (let i = 0; i < 7; i++) { const w = makeWheel(GOLD.clone()); w.position.set(-1.0 + (i % 4) * 0.48, 2.08 + Math.floor(i / 4) * 0.25, (i % 2) * 0.3 - 0.15); van.add(w); roofLoad.push(w); }
  const police = new THREE.Group(); g.add(police); const pb = box(3.4, 1.0, 1.6, std(0x1d2a4a, 0.4, 0.3)); pb.position.y = 0.8; police.add(pb); const pc = box(1.8, 0.6, 1.5, std(0x1d2a4a, 0.4, 0.3)); pc.position.set(-0.2, 1.55, 0); police.add(pc);
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.5), glow(0xff2a2a, 3)), blue = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.5), glow(0x2a6aff, 3)); red.position.set(-0.2, 1.95, -0.35); blue.position.set(-0.2, 1.95, 0.35); police.add(red, blue);
  const pr = new THREE.PointLight(0xff2a2a, 0, 14, 1.4), pbl = new THREE.PointLight(0x3a6aff, 0, 14, 1.4); pr.position.set(-0.2, 2.3, -0.4); pbl.position.set(-0.2, 2.3, 0.4); police.add(pr, pbl);
  for (const [x, z] of [[-1.1, -0.82], [-1.1, 0.82], [1.1, -0.82], [1.1, 0.82]]) { const w = cyl(0.34, 0.34, 0.24, std(0x1a1a1a, 0.6), 18); w.rotation.x = Math.PI / 2; w.position.set(x, 0.34, z); police.add(w); }
  const sparks = []; const sm = new THREE.SpriteMaterial({ map: softDot(), color: 0xffc060, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }); for (let i = 0; i < 30; i++) { const s = new THREE.Sprite(sm); s.scale.set(0.08, 0.08, 1); g.add(s); sparks.push(s); }
  shadowed(g);
  return { group: g, van, wheels, roofLoad, police, red, blue, pr, pbl, sparks };
}
