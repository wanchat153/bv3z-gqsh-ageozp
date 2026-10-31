// The other sets, each its own scene: the lower gun deck, the inquiry room, the seabed, the museum hall,
// plus the 1961 salvage rig that is added to the harbour scene.
import * as THREE from './three.module.js';
import { canvasTex } from './world.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rnd = (s) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
const planks = (base, n = 16, seed = 3, vert = false) => { const r = rnd(seed); return canvasTex(512, 512, (x, w, h) => { x.fillStyle = base; x.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '255,220,170' : '30,15,5'},${0.06 + r() * 0.12})`; vert ? x.fillRect(i * w / n, 0, w / n - 2, h) : x.fillRect(0, i * h / n, w, h / n - 2); x.fillStyle = 'rgba(25,12,4,0.75)'; vert ? x.fillRect((i + 1) * w / n - 2, 0, 2, h) : x.fillRect(0, (i + 1) * h / n - 2, w, 2);
    for (let k = 0; k < 2; k++) { const p = r(); vert ? x.fillRect(i * w / n, p * h, w / n, 2) : x.fillRect(p * w, i * h / n, 2, h / n); } }
  for (let k = 0; k < 500; k++) { x.fillStyle = `rgba(${r() < 0.5 ? '255,230,190' : '20,10,0'},0.05)`; vert ? x.fillRect(r() * w, r() * h, 1.5, 30 + r() * 50) : x.fillRect(r() * w, r() * h, 30 + r() * 50, 1.5); } }); };
const shadowed = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };
export function makeCannon(bronze, wood) {
  const g = new THREE.Group();
  const barrel = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.22, 0], [0.24, 0.1], [0.2, 0.2], [0.19, 1.5], [0.15, 2.3], [0.18, 2.4], [0.14, 2.45], [0.1, 2.45]].map(([a, b]) => new THREE.Vector2(a, b)), 16), bronze);
  barrel.rotation.z = -Math.PI / 2; barrel.position.set(-0.9, 0.62, 0); g.add(barrel);
  const car = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 0.75), wood); car.position.set(-0.35, 0.32, 0); g.add(car);
  for (const x of [-0.85, 0.15]) for (const z of [-0.36, 0.36]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 12), wood); w.rotation.x = Math.PI / 2; w.position.set(x, 0.18, z); g.add(w); }
  return shadowed(g);
}

// ---------- lower gun deck: a long low room, cannons both sides, bright ports, beams, lanterns, light shafts ----------
export function makeGunDeck() {
  const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x2a1a10, 0.035);
  const floorM = new THREE.MeshStandardMaterial({ map: planks('#8a6038', 12, 5, true), roughness: 0.85 }); floorM.map.repeat.set(2, 8);
  const wallM = new THREE.MeshStandardMaterial({ map: planks('#5a3a22', 10, 6), roughness: 0.85 }); wallM.map.repeat.set(10, 1);
  const beamM = new THREE.MeshStandardMaterial({ color: 0x3a2414, roughness: 0.9 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0xc08040, metalness: 0.9, roughness: 0.3 }); const wood = new THREE.MeshStandardMaterial({ color: 0x6a4024, roughness: 0.85 });
  const L = 40, Wd = 10.4, Hh = 2.3;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(Wd, L), floorM); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(Wd, L), floorM); ceil.rotation.x = Math.PI / 2; ceil.position.y = Hh; scene.add(ceil);
  for (let i = 0; i < 22; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(Wd, 0.25, 0.3), beamM); b.position.set(0, Hh - 0.12, -L / 2 + i * 1.9); b.castShadow = true; scene.add(b); }
  const ports = [];
  for (const s of [-1, 1]) {
    // wall with port openings: build from segments so the openings are real
    for (let i = 0; i < 14; i++) { const z = -L / 2 + 1.2 + i * 2.8;
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.3, Hh, 2.0), wallM); seg.position.set(s * Wd / 2, Hh / 2, z + 1.4); scene.add(seg);
      const lo = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.75, 0.8), wallM); lo.position.set(s * Wd / 2, 0.375, z); scene.add(lo);
      const hi = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.75, 0.8), wallM); hi.position.set(s * Wd / 2, Hh - 0.375, z); scene.add(hi);
      const sky = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.2, 1.8) })); sky.position.set(s * (Wd / 2 + 0.3), 1.15, z); sky.rotation.y = -s * Math.PI / 2; scene.add(sky);
      const can = makeCannon(bronze, wood); can.position.set(s * (Wd / 2 - 1.5), 0, z); can.rotation.y = s > 0 ? 0 : Math.PI; scene.add(can);
      // light shaft through the port
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.9, 3.2, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.035, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      shaft.rotation.z = s * (Math.PI / 2 - 0.35); shaft.position.set(s * (Wd / 2 - 2.0), 0.55, z); scene.add(shaft);
      ports.push({ x: s * Wd / 2, z, sky, can });
    }
  }
  const lanternM = new THREE.MeshStandardMaterial({ color: 0xffd080, emissive: 0xffa040, emissiveIntensity: 1.6 });
  for (let i = 0; i < 6; i++) { const z = -L / 2 + 4 + i * 6.5; const l = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.3, 8), lanternM); l.position.set(0, Hh - 0.45, z); scene.add(l); const pl = new THREE.PointLight(0xffb060, 3.5, 7, 1.6); pl.position.set(0, Hh - 0.55, z); scene.add(pl); }
  const sun = new THREE.DirectionalLight(0xffe0b0, 2.2); sun.position.set(12, 4, 3); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 60 }); sun.shadow.bias = -0.0005; scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(0xffe0c0, 0x402010, 0.45));
  // rising water for the flooding shot
  const water = new THREE.Mesh(new THREE.PlaneGeometry(Wd, L), new THREE.MeshStandardMaterial({ color: 0x2a6a70, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.85 }));
  water.rotation.x = -Math.PI / 2; water.visible = false; scene.add(water);
  shadowed(scene);
  return { scene, ports, water, L, Wd, Hh };
}

// ---------- the inquiry room ----------
export function makeRoom() {
  const scene = new THREE.Scene();
  const wallM = new THREE.MeshStandardMaterial({ map: planks('#7a5232', 8, 9, true), roughness: 0.8 }); wallM.map.repeat.set(4, 1);
  const floorM = new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (x, w, h) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#3a2a20' : '#d8c8a8'; x.fillRect(i * 64, j * 64, 64, 64); } }, [8, 8]), roughness: 0.6 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), floorM); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), wallM); back.position.set(0, 3, -4); back.receiveShadow = true; scene.add(back);
  for (const s of [-1, 1]) { const sw = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), wallM); sw.position.set(s * 7, 3, 1); sw.rotation.y = -s * Math.PI / 2; scene.add(sw); }
  // tall window with light pouring in
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.0), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.0, 1.7) })); win.position.set(-3.6, 3.0, -3.98); scene.add(win);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.2, 0.1), new THREE.MeshStandardMaterial({ color: 0x3a2414 })); frame.position.set(-3.6, 3.0, -4.02); scene.add(frame);
  for (const d of [[0, 0, 0.06, 3.0], [0, 0, 1.6, 0.06]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(d[2], d[3], 0.08), frame.material); b.position.set(-3.6, 3.0, -3.94); scene.add(b); }
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.0, 7), new THREE.MeshBasicMaterial({ color: 0xffe2b0, transparent: true, opacity: 0.06, depthWrite: false, blending: THREE.AdditiveBlending }));
  shaft.position.set(-2.4, 2.0, -0.6); shaft.rotation.set(-0.35, 0.3, 0); scene.add(shaft);
  // the judges' bench, a portrait of a crowned king, a model ship on the table
  const deskM = new THREE.MeshStandardMaterial({ color: 0x4a2a16, roughness: 0.6 });
  const desk = new THREE.Mesh(new THREE.BoxGeometry(5.5, 1.2, 1.2), deskM); desk.position.set(0.4, 0.6, -2.2); scene.add(desk);
  const cloth = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.05, 1.3), new THREE.MeshStandardMaterial({ color: 0x1f3f7a, roughness: 0.9 })); cloth.position.set(0.4, 1.22, -2.2); scene.add(cloth);
  const portrait = canvasTex(256, 320, (x, w, h) => { x.fillStyle = '#3a2a1a'; x.fillRect(0, 0, w, h); x.fillStyle = '#c99a3a'; x.fillRect(8, 8, w - 16, h - 16); x.fillStyle = '#5a3a2a'; x.fillRect(24, 24, w - 48, h - 48);
    x.fillStyle = '#7a2a3a'; x.beginPath(); x.roundRect(78, 170, 100, 130, 40); x.fill(); x.lineWidth = 6; x.strokeStyle = '#2a1d1d'; x.stroke(); x.fillStyle = '#f6f2ea'; x.beginPath(); x.ellipse(128, 130, 62, 56, 0, 0, 7); x.fill(); x.stroke();
    x.fillStyle = '#2a1d1d'; x.beginPath(); x.ellipse(108, 130, 5, 7, 0, 0, 7); x.ellipse(148, 130, 5, 7, 0, 0, 7); x.fill(); x.fillStyle = '#f2c230'; x.beginPath(); x.moveTo(90, 85); x.lineTo(98, 55); x.lineTo(113, 78); x.lineTo(128, 50); x.lineTo(143, 78); x.lineTo(158, 55); x.lineTo(166, 85); x.closePath(); x.fill(); x.stroke();
    x.lineWidth = 5; x.beginPath(); x.moveTo(110, 160); x.quadraticCurveTo(128, 150, 146, 160); x.stroke(); });
  const pf = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.0), new THREE.MeshStandardMaterial({ map: portrait, roughness: 0.6 })); pf.position.set(2.6, 3.6, -3.97); scene.add(pf);
  const sun = new THREE.DirectionalLight(0xffe0b8, 2.6); sun.position.set(-6, 7, -9); sun.target.position.set(0, 0, 1); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 }); sun.shadow.bias = -0.0005; scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(0xfff0dd, 0x5a4030, 0.75));
  const candleM = new THREE.MeshStandardMaterial({ color: 0xfff0d0, emissive: 0xffc070, emissiveIntensity: 0.3 });
  for (const x of [-1.6, 2.4]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.35, 8), candleM); c.position.set(x, 1.42, -2.0); scene.add(c); const f = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.2, 1) })); f.position.set(x, 1.64, -2.0); scene.add(f); }
  shadowed(scene);
  return { scene, deskTop: 1.24 };
}

// ---------- the seabed: murky blue-green, light shafts from above, mud, drifting particles, a few fish ----------
export function makeSeabed() {
  const scene = new THREE.Scene(); const fogC = new THREE.Color(0x0e2f3a); scene.fog = new THREE.FogExp2(fogC, 0.016); scene.background = fogC;
  const r = rnd(17);
  const mudG = new THREE.PlaneGeometry(200, 200, 120, 120); const p = mudG.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 0.3) * 0.3 + Math.cos(p.getY(i) * 0.21) * 0.4 + (r() - 0.5) * 0.15); mudG.computeVertexNormals();
  const mud = new THREE.Mesh(mudG, new THREE.MeshStandardMaterial({ color: 0x4a4a3a, roughness: 1 })); mud.rotation.x = -Math.PI / 2; mud.position.y = -32; mud.receiveShadow = true; scene.add(mud);
  for (let i = 0; i < 30; i++) { const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + r() * 0.8), new THREE.MeshStandardMaterial({ color: 0x3a4038, roughness: 1 })); rock.position.set(-40 + r() * 80, -32, -30 + r() * 50); scene.add(rock); }
  const sun = new THREE.DirectionalLight(0x9fe0e8, 1.6); sun.position.set(10, 30, 10); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 120 }); scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(0x4aa8b8, 0x10201a, 0.9));
  // soft god rays: open cylinders whose alpha fades toward the edges and the bottom
  const shafts = []; const sm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide, uniforms: { uA: { value: 0.05 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying float vY; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); vY=uv.y; gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'uniform float uA; varying vec3 vN; varying vec3 vV; varying float vY; void main(){ float e=pow(abs(dot(vN,vV)),2.0); gl_FragColor=vec4(vec3(0.62,0.92,0.95)*uA*e*smoothstep(0.0,0.7,vY),1.0); }' });
  for (let i = 0; i < 7; i++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.8 + r(), 3 + r() * 2, 50, 16, 1, true), sm); s.position.set(-30 + i * 7 + r() * 4, -8, -14 + r() * 16); s.rotation.z = 0.25; scene.add(s); shafts.push(s); }
  const motes = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 3000 }, (_, i) => (i % 3 === 1 ? -32 + r() * 30 : (r() - 0.5) * 70)), 3)), new THREE.PointsMaterial({ color: 0xc8f0e8, size: 0.06, transparent: true, opacity: 0.6, depthWrite: false }));
  scene.add(motes);
  const fishM = new THREE.MeshStandardMaterial({ color: 0x9ab0b8, metalness: 0.6, roughness: 0.3 }); const fish = [];
  for (let i = 0; i < 14; i++) { const f = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), fishM); b.scale.set(1.8, 0.7, 0.5); f.add(b); const tl = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.3, 4), fishM); tl.rotation.z = Math.PI / 2; tl.position.x = -0.55; f.add(tl); scene.add(f); fish.push({ f, ph: r() * 6, R: 6 + r() * 10, y: -28 + r() * 10, c: V(-10 + r() * 20, 0, -6 + r() * 10) }); }
  return { scene, mudY: -32, update(t) { motes.position.y = (t * 0.08) % 2; fish.forEach((q) => { const a = t * 0.3 + q.ph; q.f.position.set(q.c.x + Math.cos(a) * q.R, q.y + Math.sin(t + q.ph) * 0.3, q.c.z + Math.sin(a) * q.R * 0.5); q.f.rotation.y = -a - Math.PI / 2; }); sm.uniforms.uA.value = 0.18 + 0.05 * Math.sin(t * 0.7); } };
}

// ---------- the 1961 salvage rig (added to the harbour scene) ----------
export function makeSalvage(scene) {
  const g = new THREE.Group(); scene.add(g);
  const steel = new THREE.MeshStandardMaterial({ color: 0x5a6670, metalness: 0.6, roughness: 0.5 }); const rust = new THREE.MeshStandardMaterial({ color: 0x8a4a2a, roughness: 0.8 });
  for (const s of [-1, 1]) {
    const pont = new THREE.Mesh(new THREE.BoxGeometry(46, 4.5, 9), steel); pont.position.set(0, 1.0, s * 13); g.add(pont);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(46, 0.3, 9), rust); deck.position.set(0, 3.4, s * 13); g.add(deck);
    for (let i = 0; i < 6; i++) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.4, 12), steel); w.rotation.x = Math.PI / 2; w.position.set(-18 + i * 7.2, 4.3, s * 9.6); g.add(w); }
    const cr = new THREE.Mesh(new THREE.BoxGeometry(0.8, 14, 0.8), new THREE.MeshStandardMaterial({ color: 0xd8a830, roughness: 0.6 })); cr.position.set(10 * s, 10, s * 15); cr.rotation.z = s * 0.3; g.add(cr);
  }
  const cables = []; const cm = new THREE.LineBasicMaterial({ color: 0x1a1a1a });
  for (let i = 0; i < 6; i++) { const x = -18 + i * 7.2; const geo = new THREE.BufferGeometry().setFromPoints([V(x, 4.3, -9.6), V(x, -5, -5.5), V(x, -6, 0), V(x, -5, 5.5), V(x, 4.3, 9.6)]); const l = new THREE.Line(geo, cm); g.add(l); cables.push(l); }
  shadowed(g);
  return { group: g, cables };
}

// ---------- the museum hall ----------
export function makeMuseum() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b0d10); scene.fog = new THREE.Fog(0x0b0d10, 40, 120);
  const wallM = new THREE.MeshStandardMaterial({ color: 0x1c2026, roughness: 0.9 }); const floorM = new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.5, metalness: 0.1 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(140, 80), floorM); floor.rotation.x = -Math.PI / 2; floor.position.y = -5.2; floor.receiveShadow = true; scene.add(floor);
  for (const [x, z, ry, w] of [[0, -22, 0, 140], [0, 22, Math.PI, 140], [-58, 0, Math.PI / 2, 60], [58, 0, -Math.PI / 2, 60]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 70), wallM); m.position.set(x, 30, z); m.rotation.y = ry; scene.add(m); }
  // walkways with glass railings on several levels
  const railM = new THREE.MeshStandardMaterial({ color: 0x9ab0c0, transparent: true, opacity: 0.25, roughness: 0.1, metalness: 0.3 }); const walkM = new THREE.MeshStandardMaterial({ color: 0x3a3430, roughness: 0.7 });
  const walk = []; for (const [y, z] of [[-5.2, 12], [2.5, 13.5], [9.5, 14.5]]) { const w = new THREE.Mesh(new THREE.BoxGeometry(110, 0.4, 5), walkM); w.position.set(0, y - 0.2, z + 2); w.receiveShadow = true; scene.add(w); const rl = new THREE.Mesh(new THREE.BoxGeometry(110, 1.1, 0.06), railM); rl.position.set(0, y + 0.55, z - 0.4); scene.add(rl);
    const top = new THREE.Mesh(new THREE.BoxGeometry(110, 0.08, 0.12), new THREE.MeshStandardMaterial({ color: 0x8a8a8a, metalness: 0.8, roughness: 0.3 })); top.position.set(0, y + 1.1, z - 0.4); scene.add(top); walk.push([y, z]); }
  // spotlights on the ship, a warm wash
  const spots = [];
  for (const [x, y, z, tx, ty] of [[-30, 40, 18, -15, 8], [0, 45, 20, 0, 6], [28, 40, 18, 15, 8], [-10, 30, -18, -8, 5], [15, 32, -18, 10, 5]]) {
    const s = new THREE.SpotLight(0xffd6a0, 2600, 140, 0.36, 0.6, 1.5); s.position.set(x, y, z); s.target.position.set(tx, ty, 0); s.castShadow = spots.length < 2; if (s.castShadow) { s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.0005; } scene.add(s, s.target); spots.push(s); }
  scene.add(new THREE.HemisphereLight(0x8a9ab0, 0x302418, 0.7));
  // glowing info panels on the walkway
  const panelM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.85, 0.7) });
  for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9), panelM); p.position.set(-30 + i * 12, -4.1, 11.55); p.rotation.x = -0.6; scene.add(p); }
  shadowed(scene);
  return { scene, walk };
}
