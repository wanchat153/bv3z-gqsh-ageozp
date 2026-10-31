// The set: a sunny back garden under a pastel two-storey building with a balcony; a low brick wall; a tree,
// bushes, neighbours' houses, cartoon clouds; and a butterfly.
import * as THREE from './three.module.js';
import { toon, sphere, outlined, mulberry, mix } from './toon.js';
import { LEDGE_Y } from './timeline.js';

const box = (w, h, d, m, ink = 0.01) => outlined(new THREE.BoxGeometry(w, h, d), m, ink);

function brickTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#e8d8c4'; x.fillRect(0, 0, 256, 128);
  const r = mulberry(9);
  for (let row = 0; row < 8; row++) for (let k = -1; k < 5; k++) { const off = row % 2 ? 32 : 0; x.fillStyle = `hsl(${10 + r() * 8},${55 + r() * 10}%,${46 + r() * 8}%)`; x.fillRect(k * 64 + off + 2, row * 16 + 2, 60, 12); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

export function buildSet(scene) {
  const out = {};
  // sky dome: clean gradient, no noise
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `varying vec3 vD; void main(){ float y=max(vD.y,0.0); vec3 c=mix(vec3(0.62,0.82,0.98),vec3(0.22,0.52,0.92),pow(y,0.7)); gl_FragColor=vec4(c,1.0);} ` }));
  sky.frustumCulled = false; scene.add(sky);
  // lawn and a stone path
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), toon(0x7cc85a)); grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true; scene.add(grass);
  const stoneM = toon(0xd9d2c4); const r = mulberry(17);
  for (let k = 0; k < 9; k++) { const s = outlined(new THREE.CylinderGeometry(0.22 + r() * 0.06, 0.24, 0.03, 18), stoneM, 0.008); s.position.set(-1.4 + r() * 0.15, 0.015, 0.9 + k * 0.62); s.scale.set(1, 1, 0.75); s.rotation.y = r() * 3; scene.add(s); }
  // the building: peach walls, white trim, blue windows, a door
  const wall = toon(0xf4b79a), trim = toon(0xfbf6ee), glass = toon(0x6fb3e0), roofM = toon(0xc0564a), door = toon(0x4a7fb5);
  const bld = box(9, 7.2, 3, wall, 0.02); bld.position.set(0, 3.6, -2.7); scene.add(bld);
  const roof = outlined(new THREE.CylinderGeometry(0.1, 5.6, 1.8, 4, 1), roofM, 0.02); roof.rotation.y = Math.PI / 4; roof.scale.set(1.15, 1, 0.45); roof.position.set(0, 8.1, -2.7); scene.add(roof);
  const win = (x, y, w = 1.0, h = 1.3) => { const f = box(w + 0.16, h + 0.16, 0.08, trim, 0.008); f.position.set(x, y, -1.17); scene.add(f); const g = box(w, h, 0.06, glass, 0.006); g.position.set(x, y, -1.13); scene.add(g); const m = box(0.05, h, 0.07, trim, 0.0); m.position.set(x, y, -1.11); scene.add(m); };
  win(-3.0, 1.6); win(3.0, 1.6); win(-3.0, 5.4); win(3.0, 5.4);
  const dr = box(1.1, 2.2, 0.1, door, 0.01); dr.position.set(-1.4, 1.1, -1.15); scene.add(dr);
  const df = box(1.3, 2.35, 0.08, trim, 0.008); df.position.set(-1.4, 1.17, -1.18); scene.add(df);
  // balcony: slab, French door behind, balustrade with a broad flat top rail (the cat's bed)
  const slab = box(3.4, 0.22, 1.25, trim, 0.012); slab.position.set(0, 3.0, -0.6); scene.add(slab);
  const fd = box(1.3, 2.1, 0.08, glass, 0.008); fd.position.set(0, 4.1, -1.15); scene.add(fd);
  for (let x = -1.55; x <= 1.56; x += 0.22) { const b = outlined(new THREE.CylinderGeometry(0.045, 0.06, 0.66, 12), trim, 0.006); b.position.set(x, 3.44, -0.05); scene.add(b); }
  const rail = box(3.4, 0.12, 0.3, trim, 0.012); rail.position.set(0, LEDGE_Y - 0.06, -0.06); scene.add(rail);
  for (const x of [-1.62, 1.62]) { const s = box(0.12, 0.98, 1.25, trim, 0.01); s.position.set(x, 3.6, -0.6); scene.add(s); }
  // flower pots on the balcony and by the door
  const pot = toon(0xd2774a), leaf = toon(0x3f9a4a), red = toon(0xe8484a), yel = toon(0xf5cc3a);
  const plant = (x, y, z, fc) => { const p = outlined(new THREE.CylinderGeometry(0.14, 0.1, 0.22, 16), pot, 0.006); p.position.set(x, y + 0.11, z); scene.add(p); const b = sphere(0.17, leaf, 1, 0.8, 1, 0.006, 16); b.position.set(x, y + 0.3, z); scene.add(b); for (let k = 0; k < 4; k++) { const f = sphere(0.04, fc, 1, 1, 1, 0.004, 12); f.position.set(x + Math.cos(k * 1.7) * 0.12, y + 0.38 + (k % 2) * 0.05, z + Math.sin(k * 1.7) * 0.12); scene.add(f); } };
  plant(-1.2, 3.11, -0.75, red); plant(1.2, 3.11, -0.75, yel); plant(-2.3, 0, -0.9, red); plant(-0.55, 0, -0.9, yel);
  // the low garden wall the pup suns himself on
  const bt = brickTex(); bt.repeat.set(3, 1);
  const bw = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 0.42), new THREE.MeshToonMaterial({ map: bt, gradientMap: toon(0).gradientMap })); bw.position.set(2.4, 0.45, 1.3); bw.castShadow = true; bw.receiveShadow = true; scene.add(bw);
  const bwInk = outlined(new THREE.BoxGeometry(2.6, 0.9, 0.42), new THREE.MeshBasicMaterial({ visible: false }), 0.01); bwInk.position.copy(bw.position); scene.add(bwInk);
  const cap = box(2.7, 0.08, 0.5, toon(0xe9e2d6), 0.008); cap.position.set(2.4, 0.94, 1.3); scene.add(cap);
  out.WALL_TOP = 0.98;
  // a tree and bushes
  const trunk = outlined(new THREE.CylinderGeometry(0.16, 0.26, 3.2, 12), toon(0x8a5a3a), 0.012); trunk.position.set(-4.2, 1.6, 1.8); scene.add(trunk);
  for (let k = 0; k < 7; k++) { const s = sphere(0.9 + r() * 0.4, toon(0x52b04a), 1, 0.9, 1, 0.015, 20); s.position.set(-4.2 + (r() - 0.5) * 1.8, 3.6 + r() * 1.2, 1.8 + (r() - 0.5) * 1.4); scene.add(s); }
  for (const [x, z, s] of [[4.6, -0.6, 0.7], [5.4, 0.6, 0.55], [-3.0, -0.6, 0.5], [3.8, 3.2, 0.6], [-5.6, 4.2, 0.8]]) { const b = sphere(s, toon(0x5cbf4e), 1.2, 0.8, 1, 0.012, 18); b.position.set(x, s * 0.6, z); scene.add(b); }
  // neighbours' houses in the distance and a fence
  const hc = [0xa8d8ea, 0xf6e3a1, 0xc9b6e4, 0xf7c6c7, 0xb9e4b5];
  for (let k = 0; k < 9; k++) { const w = 4 + r() * 3, h = 4 + r() * 5; const b = box(w, h, 4, toon(hc[k % 5]), 0.03); b.position.set(-22 + k * 5.6, h / 2, -14 - r() * 6); scene.add(b); const rf = outlined(new THREE.CylinderGeometry(0.1, w * 0.75, 1.6, 4, 1), toon(0xc0564a), 0.03); rf.rotation.y = Math.PI / 4; rf.scale.set(1, 1, 0.7); rf.position.set(b.position.x, h + 0.8, b.position.z); scene.add(rf); }
  for (let x = -10; x <= 10; x += 0.7) { const p = box(0.12, 1.2, 0.05, trim, 0.006); p.position.set(x, 0.6, 7.5); scene.add(p); }
  const fr = box(20, 0.08, 0.05, trim, 0.006); fr.position.set(0, 0.95, 7.5); scene.add(fr);
  // cartoon clouds
  out.clouds = [];
  for (let k = 0; k < 7; k++) { const c = new THREE.Group(); for (let i = 0; i < 5; i++) { const s = sphere(1.6 + r() * 1.2, toon(0xffffff), 1.3, 0.8, 1, 0.0, 18); s.position.set((i - 2) * 1.6, r() * 0.8, r() * 0.6); s.userData.mesh && (s.userData.mesh.castShadow = false); c.add(s); } c.position.set(-40 + k * 14, 18 + r() * 10, -60 - r() * 30); scene.add(c); out.clouds.push(c); }
  scene.traverse((o) => { if (o.isMesh && o.material && !o.material.isShaderMaterial) { o.receiveShadow = true; if (o.castShadow === false) o.castShadow = true; } });
  return out;
}

export function makeButterfly() {
  const g = new THREE.Group();
  const wingM = new THREE.MeshToonMaterial({ color: 0xffa31a, side: THREE.DoubleSide }), spot = new THREE.MeshBasicMaterial({ color: 0x2a1a14, side: THREE.DoubleSide });
  const wingShape = new THREE.Shape(); wingShape.moveTo(0, 0); wingShape.bezierCurveTo(0.02, 0.05, 0.07, 0.06, 0.075, 0.02); wingShape.bezierCurveTo(0.08, -0.01, 0.05, -0.05, 0.0, -0.01);
  const wings = [];
  for (const s of [-1, 1]) { const piv = new THREE.Group(); g.add(piv); const w = new THREE.Mesh(new THREE.ShapeGeometry(wingShape), wingM); w.rotation.x = -Math.PI / 2; w.scale.x = s; piv.add(w); const d = new THREE.Mesh(new THREE.CircleGeometry(0.008, 10), spot); d.rotation.x = -Math.PI / 2; d.position.set(s * 0.05, 0.001, -0.02); piv.add(d); wings.push({ piv, s }); }
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.004, 0.035, 4, 8), new THREE.MeshBasicMaterial({ color: 0x2a1a14 })); body.rotation.x = Math.PI / 2; g.add(body);
  return { g, wings };
}
