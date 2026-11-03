// Inside a Nyos house (N09, N13): mud-brick walls, a shuttered window looking out on the valley, a table with a printed
// cloth, a hurricane lantern (tank, guard wires, glass globe, chimney cap, bail handle, a flame + its light), an enamel cup,
// a 1986 calendar, a sleeping mat in the back. A soda bottle (glass, liquid, crown cap) for the 'shaken bottle' shot.
// API: lantern(k, t) — flame strength 0..1 (dies in CO2); bottle(shake, pop, t); outside(mode) — what the window shows.
import * as THREE from './three.module.js';
import { mulberry } from './toon.js';
import { painted, merge, plankTex, vnoise, fbm } from './hq.js';
import { glowT, puffT } from './nyos.js';
import { makeCard, signText } from './flat.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const STD = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, ...o });
const box = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
const cl = (x) => Math.max(0, Math.min(255, x));
const lathe = (pts, seg = 32) => new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), seg);

export function buildRoom(scene) {
  const R = {}; const r = mulberry(5);
  scene.background = new THREE.Color(0x0a0a10);
  const hemi = new THREE.HemisphereLight(0xffe8d0, 0x302820, 0.35); scene.add(hemi); R.hemi = hemi;
  const key = new THREE.DirectionalLight(0xfff0d8, 0); key.position.set(-1.2, 2.2, -3); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); scene.add(key); scene.add(key.target); key.target.position.set(0, 0.8, 0); R.key = key;
  // walls: plastered mud with brick showing, a floor of beaten earth
  const WT = painted(512, 512, (x, y) => { const row = Math.floor(y / 30), sx = (x + (row % 2) * 34) % 68, fy = y % 30; const pl = fbm(x / 90, y / 90, 0, 4); const n = (fbm(x / 12, y / 12, 3, 3) - 0.5) * 40;
    const mort = fy < 4 || sx < 4; let c = pl > 0.5 ? [196 + n, 168 + n, 136 + n] : mort ? [118, 76, 52] : [160 + n, 92 + n * 0.6, 58 + n * 0.4]; return [cl(c[0]), cl(c[1]), cl(c[2]), pl > 0.5 ? 0.7 + n / 300 : mort ? 0.15 : 0.55]; }, 3);
  const wallM = STD(0xffffff, { map: WT.map, normalMap: WT.normalMap });
  const FT = painted(256, 256, (x, y) => { const n = fbm(x / 30, y / 30, 0, 4); const c = [120 + n * 50, 86 + n * 36, 60 + n * 24]; return [cl(c[0]), cl(c[1]), cl(c[2]), n]; }, 2); FT.map.repeat.set(3, 3); FT.normalMap.repeat.set(3, 3);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), STD(0xffffff, { map: FT.map, normalMap: FT.normalMap })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  // back wall (z = −1.2) with a window opening 1.0 × 0.9 centred at x −0.6, y 1.45; side wall at x −2.2
  const back = new THREE.Group(); scene.add(back);
  for (const g of [box(5, 0.95, 0.3, 0, 0.475, -1.35), box(5, 0.9, 0.3, 0, 2.35, -1.35), box(1.8, 0.95, 0.3, -2.0, 1.425, -1.35), box(2.2, 0.95, 0.3, 1.0, 1.425, -1.35), box(0.3, 2.8, 5, -2.35, 1.4, 1.1)]) { const m = new THREE.Mesh(g, wallM); m.castShadow = m.receiveShadow = true; back.add(m); }
  const roof = new THREE.Mesh(box(5, 0.1, 5, 0, 2.85, 1.1), STD(0x3a2a20)); scene.add(roof);
  // window: frame, sill, open plank shutters (outside), a wooden bar
  const PK = plankTex(3, [128, 92, 60]); const woodM = STD(0xffffff, { map: PK.map, normalMap: PK.normalMap, vertexColors: true });
  { const parts = []; for (const x of [-1.13, -0.07]) parts.push({ g: box(0.08, 1.0, 0.34, x, 1.425, -1.35), col: [0.8, 0.7, 0.6] }); parts.push({ g: box(1.15, 0.08, 0.34, -0.6, 1.92, -1.35), col: [0.8, 0.7, 0.6] }); parts.push({ g: box(1.3, 0.06, 0.45, -0.6, 0.95, -1.3), col: [0.85, 0.75, 0.65] });
    for (const s of [-1, 1]) parts.push({ g: box(0.5, 0.9, 0.04, -0.6 + s * 0.78, 1.425, -1.58), col: [0.62, 0.48, 0.42] }); parts.push({ g: box(0.04, 0.9, 0.04, -0.6, 1.425, -1.3), col: [0.7, 0.6, 0.5] });
    const o = new THREE.Mesh(merge(parts), woodM); o.castShadow = o.receiveShadow = true; scene.add(o); }
  // outside the window: the valley at night (a painted backdrop card far out) — swapped by outside(mode)
  const night = makeCard(30, 16, 1536, (g, w, h) => { const s = g.createLinearGradient(0, 0, 0, h); s.addColorStop(0, '#0a1030'); s.addColorStop(0.6, '#1c2c5a'); s.addColorStop(1, '#2a3a5a'); g.fillStyle = s; g.fillRect(0, 0, w, h);
    const rr = mulberry(9); for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + rr() * 0.6})`; g.fillRect(rr() * w, rr() * h * 0.5, 2, 2); }
    g.fillStyle = '#0c1424'; g.beginPath(); g.moveTo(0, h * 0.62); for (let x = 0; x <= w; x += 20) g.lineTo(x, h * 0.6 - Math.sin(x * 0.004) * 60 - fbm(x * 0.01, 0, 0, 3) * 120); g.lineTo(w, h); g.lineTo(0, h); g.fill();
    for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(255,170,80,0.9)'; g.fillRect(w * (0.2 + i * 0.12), h * (0.74 + (i % 2) * 0.05), 8, 6); } }, {});
  night.position.set(-0.6, 2.2, -12); scene.add(night); R.night = night;
  const day = makeCard(30, 16, 1536, (g, w, h) => { const s = g.createLinearGradient(0, 0, 0, h); s.addColorStop(0, '#7ab0e8'); s.addColorStop(0.7, '#cfe4f4'); s.addColorStop(1, '#e8eef0'); g.fillStyle = s; g.fillRect(0, 0, w, h);
    g.fillStyle = '#5a8a3a'; g.beginPath(); g.moveTo(0, h * 0.62); for (let x = 0; x <= w; x += 20) g.lineTo(x, h * 0.6 - Math.sin(x * 0.004) * 60 - fbm(x * 0.01, 0, 0, 3) * 120); g.lineTo(w, h); g.lineTo(0, h); g.fill();
    g.fillStyle = '#7aa04a'; g.fillRect(0, h * 0.8, w, h * 0.2); }, {});
  day.position.copy(night.position); scene.add(day); R.day = day;
  R.outside = (m) => { night.visible = m === 'night'; day.visible = m === 'day'; };
  // mist drifting past outside the window
  const mt = [puffT(21), puffT(22)]; R.mistS = []; for (let j = 0; j < 16; j++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mt[j % 2], transparent: true, depthWrite: false, color: 0x8090b0 })); scene.add(s); R.mistS.push(s); }
  R.mist = (k, t) => R.mistS.forEach((s, j) => { s.visible = k > 0; if (!s.visible) return; const u = ((t * 0.08 + j / 16) % 1); s.position.set(-4 + u * 7, 0.6 + (j % 4) * 0.45, -2.2 - (j % 3) * 0.8); s.scale.setScalar(1.6 + (j % 3) * 0.6); s.material.opacity = 0.7 * k; });
  // table with a printed cloth
  { const tb = []; tb.push({ g: box(1.4, 0.05, 0.8, -0.5, 0.78, -0.75), col: [0.7, 0.55, 0.45] }); for (const [x, z] of [[-1.15, -1.1], [0.15, -1.1], [-1.15, -0.4], [0.15, -0.4]]) tb.push({ g: box(0.06, 0.78, 0.06, x, 0.39, z), col: [0.6, 0.45, 0.35] });
    const o = new THREE.Mesh(merge(tb), woodM); o.castShadow = o.receiveShadow = true; scene.add(o);
    const CT = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); g.fillStyle = '#c8402a'; g.fillRect(0, 0, 512, 512);
      for (let y = 0; y < 512; y += 64) for (let x = 0; x < 512; x += 64) { g.fillStyle = '#f2c040'; g.beginPath(); g.arc(x + 32, y + 32, 20, 0, 7); g.fill(); g.fillStyle = '#1a3a6a'; g.beginPath(); g.moveTo(x + 32, y + 14); g.lineTo(x + 50, y + 32); g.lineTo(x + 32, y + 50); g.lineTo(x + 14, y + 32); g.closePath(); g.fill(); }
      g.strokeStyle = '#2a1a16'; g.lineWidth = 6; for (let y = 0; y < 512; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); return t; })();
    const cg = new THREE.PlaneGeometry(1.6, 1.25, 40, 30); const A = cg.attributes.position; for (let i = 0; i < A.count; i++) { const x = A.getX(i), y = A.getY(i); const over = Math.max(Math.abs(x) - 0.7, Math.abs(y) - 0.4, 0); A.setZ(i, -over * 1.6 + Math.sin(x * 30) * 0.008 * (over > 0 ? 3 : 0.2)); }
    cg.rotateX(-Math.PI / 2); cg.translate(-0.5, 0.81, -0.75); cg.computeVertexNormals(); const cloth = new THREE.Mesh(cg, STD(0xffffff, { map: CT, side: THREE.DoubleSide, roughness: 1 })); cloth.castShadow = cloth.receiveShadow = true; scene.add(cloth); }
  // hurricane lantern (tubular 'Dietz' type, ~0.42 m): enamelled tin fount with seams, filler cap and wick knob, brass burner,
  // a hurricane globe (real glass), wire guard following the globe, two air tubes curving into the top, vented chimney cap,
  // bail with a wooden grip; flame = blue root + gold teardrop on a flat wick; the light sits in the flame
  const lan = new THREE.Group(); lan.position.set(-0.75, 0.81, -0.95); lan.rotation.y = 0.5; scene.add(lan); R.lan = lan;
  const spl = (pts, n = 48) => { const c = new THREE.SplineCurve(pts.map(([a, b]) => new THREE.Vector2(a, b))); return new THREE.LatheGeometry(c.getPoints(n), 64); };
  const ENM = painted(256, 256, (x, y) => { const n = fbm(x / 40, y / 40, 0, 4), sc = vnoise(x * 0.9, y * 0.05) > 0.93, rust = fbm(x / 18 + 5, y / 18, 2, 3) > 0.7;
    const c = rust ? [110, 60, 34] : sc ? [200, 190, 180] : [176 - n * 30, 36 + n * 10, 30 + n * 8]; return [c[0], c[1], c[2], n * 0.3 + (sc ? -0.4 : 0) + (rust ? 0.3 : 0)]; }, 2);
  const tin = new THREE.MeshStandardMaterial({ color: 0xffffff, map: ENM.map, normalMap: ENM.normalMap, metalness: 0.25, roughness: 0.32 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x9a9a9e, metalness: 1, roughness: 0.32 }), brass = new THREE.MeshStandardMaterial({ color: 0xc89a48, metalness: 1, roughness: 0.28 }), dark = STD(0x1a1614, { roughness: 0.6 });
  const pm = (g, m, sh = true) => { const o = new THREE.Mesh(g, m); o.castShadow = sh; o.receiveShadow = true; lan.add(o); return o; };
  const tube = (pts, r_, m, seg = 64) => pm(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), seg, r_, 12, false), m);
  // fount
  pm(spl([[0.0, 0], [0.098, 0], [0.104, 0.004], [0.112, 0.03], [0.114, 0.055], [0.108, 0.085], [0.085, 0.104], [0.06, 0.112], [0.0, 0.114]]), tin);
  for (const [y, rr] of [[0.004, 0.1], [0.056, 0.114]]) { const g = new THREE.TorusGeometry(rr, 0.0035, 8, 96); g.rotateX(Math.PI / 2); g.translate(0, y, 0); pm(g, tin); }
  { const g = new THREE.CylinderGeometry(0.016, 0.017, 0.016, 28); const A = g.attributes.position; for (let i = 0; i < A.count; i++) { const a = Math.atan2(A.getZ(i), A.getX(i)); const k = 1 + 0.06 * (Math.sin(a * 28) > 0 ? 1 : 0); if (Math.abs(A.getY(i)) < 0.0079) { A.setX(i, A.getX(i) * k); A.setZ(i, A.getZ(i) * k); } } g.computeVertexNormals(); g.rotateZ(-0.5); g.translate(0.075, 0.104, 0); pm(g, brass); }
  // burner + wick knob
  pm(spl([[0.0, 0.112], [0.05, 0.112], [0.056, 0.12], [0.05, 0.13], [0.058, 0.142], [0.06, 0.15], [0.045, 0.152], [0.0, 0.152]], 32), brass);
  { const g = new THREE.CylinderGeometry(0.006, 0.006, 0.05, 12); g.rotateZ(Math.PI / 2); g.translate(0.08, 0.128, 0); pm(g, brass); const k = new THREE.CylinderGeometry(0.016, 0.016, 0.006, 24); k.rotateZ(Math.PI / 2); k.translate(0.106, 0.128, 0); pm(k, brass); }
  { const g = new THREE.BoxGeometry(0.022, 0.006, 0.004); g.translate(0, 0.156, 0); pm(g, dark); }
  // globe (glass) — classic hurricane profile
  const globe = pm(spl([[0.046, 0.15], [0.06, 0.17], [0.082, 0.22], [0.088, 0.255], [0.08, 0.3], [0.062, 0.335], [0.05, 0.355]]), new THREE.MeshPhysicalMaterial({ color: 0xfff8ec, roughness: 0.07, transmission: 1, thickness: 0.003, ior: 1.47, transparent: true, opacity: 0.3, side: THREE.DoubleSide }), false);
  // guard: 6 wires bowed around the globe + 2 rings
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + 0.26; const P = (r_, y) => [Math.cos(a) * r_, y, Math.sin(a) * r_]; tube([P(0.07, 0.15), P(0.096, 0.2), P(0.104, 0.255), P(0.094, 0.31), P(0.07, 0.35)], 0.0022, steel, 32); }
  for (const [y, rr] of [[0.2, 0.097], [0.31, 0.095]]) { const g = new THREE.TorusGeometry(rr, 0.0025, 8, 96); g.rotateX(Math.PI / 2); g.translate(0, y, 0); pm(g, steel); }
  // air tubes from the fount shoulder up and over into the top
  for (const s of [-1, 1]) tube([[s * 0.104, 0.07], [s * 0.118, 0.12], [s * 0.122, 0.25], [s * 0.12, 0.37], [s * 0.1, 0.41], [s * 0.06, 0.425]], 0.0105, tin, 96);
  // chimney cap with vents
  pm(spl([[0.05, 0.352], [0.066, 0.36], [0.094, 0.375], [0.098, 0.385], [0.08, 0.4], [0.062, 0.418], [0.05, 0.43], [0.03, 0.438], [0.0, 0.44]]), tin);
  for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5; const g = new THREE.CylinderGeometry(0.006, 0.006, 0.004, 12); g.rotateX(Math.PI / 2); g.lookAt(new THREE.Vector3(Math.cos(a), 0.6, Math.sin(a))); g.translate(Math.cos(a) * 0.071, 0.406, Math.sin(a) * 0.071); pm(g, dark, false); }
  { const g = new THREE.SphereGeometry(0.012, 16, 10); g.translate(0, 0.445, 0); pm(g, tin); }
  // bail + wooden grip
  { const pts = []; for (let i = 0; i <= 32; i++) { const a = Math.PI * i / 32; pts.push([Math.cos(a) * 0.125, 0.39 + Math.sin(a) * 0.15, 0]); } tube(pts, 0.0025, steel, 64);
    const g = new THREE.CylinderGeometry(0.008, 0.008, 0.06, 16); g.rotateZ(Math.PI / 2); g.translate(0, 0.54, 0); pm(g, STD(0x8a5a34, { roughness: 0.6 })); }
  // flame: a blue root and a gold teardrop on the wick
  const flameG = spl([[0.0, 0.0], [0.006, 0.004], [0.011, 0.014], [0.012, 0.024], [0.008, 0.038], [0.003, 0.05], [0.0, 0.056]], 24);
  const flame = new THREE.Mesh(flameG, new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffa040, emissiveIntensity: 3.2 })); flame.position.y = 0.158; lan.add(flame); R.flame = flame;
  const core = new THREE.Mesh(spl([[0, 0], [0.004, 0.004], [0.006, 0.012], [0.004, 0.02], [0, 0.026]], 16), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xfff2c8, emissiveIntensity: 4 })); core.position.y = 0.162; lan.add(core);
  const root = new THREE.Mesh(new THREE.SphereGeometry(0.009, 16, 8).scale(1.2, 0.5, 0.6), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x3a6aff, emissiveIntensity: 2 })); root.position.y = 0.16; lan.add(root);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT('rgba(255,220,150,1)', 'rgba(255,140,40,A)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); halo.position.set(0, 0.185, 0); lan.add(halo); R.halo = halo;
  const L = new THREE.PointLight(0xffa850, 0, 8, 1.6); L.position.set(0, 0.185, 0); L.castShadow = true; lan.add(L); R.L = L;
  R.lantern = (k, t) => { const f = k * (0.92 + 0.08 * Math.sin(t * 19) * Math.sin(t * 7)); const on = k > 0.02; flame.visible = core.visible = root.visible = halo.visible = on;
    const sway = Math.sin(t * 5.3) * 0.08 * f; flame.scale.set(0.7 + 0.3 * f, 0.25 + 0.75 * f, 0.7 + 0.3 * f); flame.rotation.z = sway; core.scale.set(0.7 + 0.3 * f, 0.3 + 0.7 * f, 0.7 + 0.3 * f); core.rotation.z = sway * 0.6;
    root.scale.setScalar(0.6 + 0.4 * f); L.intensity = 0.45 * f; halo.scale.setScalar(0.08 + 0.06 * f); halo.material.opacity = 0.1 * f; };
  // enamel cup, matches
  { const cup = lathe([[0, 0], [0.04, 0], [0.045, 0.01], [0.045, 0.09], [0.048, 0.095], [0.041, 0.095], [0.041, 0.012], [0, 0.012]], 28); cup.translate(-0.25, 0.81, -0.6); const o = new THREE.Mesh(cup, STD(0xf0f0e8, { roughness: 0.25 })); o.castShadow = true; scene.add(o);
    const hd = new THREE.TorusGeometry(0.025, 0.006, 6, 16, Math.PI * 1.2); hd.rotateZ(-Math.PI / 2); hd.translate(-0.2, 0.86, -0.6); scene.add(new THREE.Mesh(hd, STD(0xf0f0e8, { roughness: 0.25 })));
    const mb = new THREE.Mesh(box(0.1, 0.02, 0.06, -0.1, 0.82, -0.9), STD(0x2a5ab0)); mb.rotation.y = 0.3; scene.add(mb); }
  // calendar on the wall: AOÛT / AUGUST 1986 (Cameroon is bilingual)
  const cal = makeCard(0.5, 0.7, 512, (g, w, h) => { g.fillStyle = '#f4efe2'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8302a'; g.fillRect(0, 0, w, h * 0.22); signText(g, 'AUGUST 1986', w / 2, h * 0.11, 52, '#fff', '#5a1a14');
    g.fillStyle = '#2a1a16'; g.font = '700 30px Montserrat'; g.textAlign = 'center'; for (let d = 1; d <= 31; d++) { const k = d + 4, x = (k % 7 + 0.5) * w / 7, y = h * 0.3 + Math.floor(k / 7) * h * 0.13; if (d === 21) { g.strokeStyle = '#c8302a'; g.lineWidth = 5; g.beginPath(); g.arc(x, y - 8, 26, 0, 7); g.stroke(); } g.fillText(String(d), x, y); } }, { lit: true });
  cal.position.set(0.55, 1.75, -1.19); scene.add(cal);
  // sleeping mat in the back corner (the sleeper is a flat card placed by the film)
  { const m = new THREE.Mesh(box(1.9, 0.08, 0.9, 1.2, 0.04, 0.6), STD(0xb89a60, { roughness: 1 })); m.receiveShadow = true; scene.add(m); const bl = new THREE.Mesh(box(1.2, 0.12, 0.85, 1.4, 0.12, 0.6), STD(0x6a3a7a, { roughness: 1 })); bl.castShadow = true; scene.add(bl); }
  // soda bottle on the table (N13): glass, liquid, crown cap, foam
  const bot = new THREE.Group(); bot.position.set(-0.45, 0.81, -0.8); scene.add(bot); R.bot = bot;
  const prof = [[0, 0], [0.032, 0], [0.036, 0.005], [0.036, 0.11], [0.03, 0.15], [0.015, 0.19], [0.014, 0.215], [0.016, 0.22], [0.014, 0.225]];
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0x9ad0a0, roughness: 0.05, transmission: 1, thickness: 0.004, ior: 1.5, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
  const gl = new THREE.Mesh(lathe(prof, 40), glassM); bot.add(gl);
  const liq = new THREE.Mesh(lathe([[0, 0.004], [0.033, 0.004], [0.033, 0.11], [0.027, 0.15], [0.013, 0.18], [0, 0.18]], 32), new THREE.MeshPhysicalMaterial({ color: 0x6a3a1a, roughness: 0.1, transmission: 0.6, transparent: true, opacity: 0.8 })); bot.add(liq);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.018, 0.012, 21), STD(0xd8b040, { metalness: 0.8, roughness: 0.3 })); cap.position.y = 0.229; bot.add(cap); R.cap = cap;
  const bub = []; const bubT = glowT('rgba(255,255,255,0.9)', 'rgba(255,255,255,A)'); for (let j = 0; j < 24; j++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubT, transparent: true, depthWrite: false, color: 0xfff0e0 })); bot.add(s); bub.push(s); }
  const foam = []; const fT = puffT(31, '250,240,225'); for (let j = 0; j < 30; j++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: fT, transparent: true, depthWrite: false, color: 0xf6eee0 })); scene.add(s); foam.push(s); }
  R.bottle = (on, shake, pop, t) => { bot.visible = on; foam.forEach((s) => { s.visible = false; }); if (!on) return; bot.rotation.set(0, 0, Math.sin(t * 38) * 0.18 * shake); bot.position.x = -0.45 + Math.sin(t * 38) * 0.02 * shake;
    cap.position.set(pop * 0.05, 0.229 + pop * 0.5 - pop * pop * 0.2, 0); cap.rotation.set(pop * 9, 0, pop * 6);
    bub.forEach((s, j) => { const u = ((t * (0.6 + shake) + j / 24) % 1); s.visible = shake > 0.05 || pop > 0; s.position.set(Math.sin(j * 2.3) * 0.022, 0.01 + u * 0.17, Math.cos(j * 1.7) * 0.022); s.scale.setScalar(0.006 + 0.006 * (j % 3)); s.material.opacity = 0.8; });
    foam.forEach((s, j) => { if (pop <= 0) return; const u = Math.min(1, pop * 1.4 - j / 60); if (u <= 0) return; s.visible = true; const a = j * 2.4; const top = V(bot.position.x, bot.position.y + 0.23, bot.position.z);
      s.position.copy(top).add(V(Math.sin(a) * u * 0.08, u * 0.35 * (1 - u * 0.5), Math.cos(a) * u * 0.05)); s.scale.setScalar(0.05 + u * 0.12); s.material.opacity = 0.9 * (1 - u * 0.5); }); };
  R.bottle(false, 0, 0, 0);
  return R;
}
