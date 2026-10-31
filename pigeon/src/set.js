// The set: a sunny toon park. Grass, a sand path, a green park bench, a lamp post (the pigeon's lookout),
// a big tree with one long branch (where the flock lines up later), bushes, flowers, distant trees, sky and clouds.
import * as THREE from './three.module.js';
import { toon, sphere, outlined, mulberry } from './toon.js';

const box = (w, h, d, m, ink = 0.008) => outlined(new THREE.BoxGeometry(w, h, d), m, ink);
const cyl = (r0, r1, h, m, ink = 0.008, seg = 20) => outlined(new THREE.CylinderGeometry(r0, r1, h, seg), m, ink);
const tex = (w, h, fn, rep = [1, 1]) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8; return t; };
const gm = toon(0).gradientMap;
const tmat = (map) => new THREE.MeshToonMaterial({ map, gradientMap: gm });

export const LAMP = { x: 0.85, z: -0.75, top: 2.3 };         // perch point is on the lantern cap
export const PERCH = new THREE.Vector3(LAMP.x, LAMP.top + 0.06, LAMP.z);
export const BRANCH = { x0: -0.95, x1: 1.15, y: 2.18, z: -1.4 };
export const COOLER = { x: 0.43, y: 0.45, z: 0.0, w: 0.3, h: 0.27, d: 0.25 };
export const STONE0 = new THREE.Vector3(-0.56, 0.495, 0.05);   // a round pebble lying on the bench

export function buildSet(scene) {
  const out = {};
  // sky dome: vertical gradient
  const skyM = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
    fragmentShader: 'varying vec3 vP; void main(){ float h=clamp(vP.y,0.0,1.0); vec3 top=vec3(0.16,0.45,0.92), mid=vec3(0.45,0.72,1.0), low=vec3(0.86,0.94,1.0); vec3 c=mix(low,mid,smoothstep(0.0,0.18,h)); c=mix(c,top,smoothstep(0.18,0.7,h)); gl_FragColor=vec4(c,1.0);} ' });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(80, 32, 16), skyM); scene.add(sky); out.sky = sky;
  // grass with soft mowing stripes
  const grassT = tex(512, 512, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#7ccb5a' : '#86d464'; x.fillRect(0, i * h / 8, w, h / 8); } const r = mulberry(5); x.fillStyle = 'rgba(60,140,50,0.35)'; for (let k = 0; k < 900; k++) { const a = r() * w, b = r() * h; x.fillRect(a, b, 2, 6); } }, [10, 10]);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), tmat(grassT)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  // sand path in front of the bench
  const pathT = tex(256, 256, (x, w, h) => { x.fillStyle = '#f2dcae'; x.fillRect(0, 0, w, h); const r = mulberry(9); for (let k = 0; k < 500; k++) { x.fillStyle = r() < 0.5 ? 'rgba(200,170,120,0.5)' : 'rgba(255,245,220,0.6)'; x.fillRect(r() * w, r() * h, 3, 3); } }, [8, 1]);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(24, 1.3), tmat(pathT)); path.rotation.x = -Math.PI / 2; path.position.set(0, 0.004, 0.85); path.receiveShadow = true; scene.add(path);
  const edgeM = toon(0xe3c48e);
  for (const z of [0.2, 1.5]) { const e = box(24, 0.03, 0.05, edgeM, 0.003); e.position.set(0, 0.015, z); scene.add(e); }

  // bench: green iron ends, wooden slats
  const slat = toon(0xd98b4a), iron = toon(0x2f6b55);
  for (let i = 0; i < 3; i++) { const s = box(1.5, 0.035, 0.11, slat, 0.005); s.position.set(0, 0.43, 0.13 - i * 0.125); scene.add(s); }
  for (let i = 0; i < 3; i++) { const s = box(1.5, 0.09, 0.03, slat, 0.005); s.position.set(0, 0.62 + i * 0.13, -0.2 - i * 0.03); s.rotation.x = -0.18; scene.add(s); }
  for (const x of [-0.68, 0.68]) {
    const leg = box(0.05, 0.43, 0.05, iron, 0.004); leg.position.set(x, 0.215, 0.13); scene.add(leg);
    const back = box(0.05, 0.98, 0.05, iron, 0.004); back.position.set(x, 0.49, -0.24); back.rotation.x = -0.12; scene.add(back);
    const arm = box(0.05, 0.04, 0.42, iron, 0.004); arm.position.set(x * 1.03, 0.62, -0.02); scene.add(arm);
    const armF = box(0.05, 0.2, 0.05, iron, 0.004); armF.position.set(x * 1.03, 0.53, 0.17); scene.add(armF);
  }
  // cooler bag on the bench (lid hinges at the back)
  const cb = toon(0x4fb3e8), cw = toon(0xfafafa), cs = toon(0xff7a59);
  const cool = box(COOLER.w, COOLER.h, COOLER.d, cb, 0.006); cool.position.set(COOLER.x, COOLER.y + COOLER.h / 2, COOLER.z); scene.add(cool);
  const band = box(COOLER.w + 0.006, 0.04, COOLER.d + 0.006, cw, 0.0); band.position.set(COOLER.x, COOLER.y + COOLER.h * 0.55, COOLER.z); scene.add(band);
  const lidPivot = new THREE.Group(); lidPivot.position.set(COOLER.x, COOLER.y + COOLER.h, COOLER.z - COOLER.d / 2); scene.add(lidPivot);
  const lid = box(COOLER.w + 0.02, 0.045, COOLER.d + 0.02, cw, 0.006); lid.position.set(0, 0.022, COOLER.d / 2); lidPivot.add(lid);
  const handle = outlined(new THREE.TorusGeometry(0.05, 0.012, 8, 20, Math.PI), cs, 0.004); handle.position.set(0, 0.045, COOLER.d / 2); lidPivot.add(handle);
  const inside = new THREE.Mesh(new THREE.BoxGeometry(COOLER.w - 0.03, 0.01, COOLER.d - 0.03), new THREE.MeshBasicMaterial({ color: 0x1d4f70 })); inside.position.set(COOLER.x, COOLER.y + COOLER.h - 0.004, COOLER.z); scene.add(inside);
  out.lid = lidPivot;

  // lamp post: the pigeon's lookout
  const pole = cyl(0.035, 0.05, LAMP.top - 0.25, iron, 0.006); pole.position.set(LAMP.x, (LAMP.top - 0.25) / 2, LAMP.z); scene.add(pole);
  const base = cyl(0.09, 0.11, 0.12, iron, 0.006); base.position.set(LAMP.x, 0.06, LAMP.z); scene.add(base);
  const glass = new THREE.MeshToonMaterial({ color: 0xfff0b8, emissive: 0x6b5a20, gradientMap: gm });
  const lant = outlined(new THREE.CylinderGeometry(0.11, 0.08, 0.2, 6), glass, 0.006); lant.position.set(LAMP.x, LAMP.top - 0.12, LAMP.z); scene.add(lant);
  const cap = outlined(new THREE.ConeGeometry(0.16, 0.1, 6), iron, 0.006); cap.position.set(LAMP.x, LAMP.top + 0.0, LAMP.z); scene.add(cap);
  const capTop = sphere(0.025, iron, 1, 1, 1, 0.004, 12); capTop.position.set(LAMP.x, LAMP.top + 0.06, LAMP.z); scene.add(capTop);
  const collar = cyl(0.06, 0.06, 0.04, iron, 0.004); collar.position.set(LAMP.x, LAMP.top - 0.24, LAMP.z); scene.add(collar);

  // the big tree behind, with its one long branch
  const bark = toon(0x8a5a3b), leaf = toon(0x4fae4a), leaf2 = toon(0x3e9a44);
  const trunk = cyl(0.13, 0.2, 3.4, bark, 0.008); trunk.position.set(BRANCH.x0, 1.7, BRANCH.z); scene.add(trunk);
  const brL = BRANCH.x1 - BRANCH.x0;
  const br = outlined(new THREE.CapsuleGeometry(0.045, brL, 6, 12), bark, 0.006); br.rotation.z = Math.PI / 2; br.position.set((BRANCH.x0 + BRANCH.x1) / 2, BRANCH.y, BRANCH.z); scene.add(br);
  const tw = outlined(new THREE.CapsuleGeometry(0.025, 0.3, 6, 10), bark, 0.005); tw.position.set(BRANCH.x1 - 0.05, BRANCH.y + 0.13, BRANCH.z); tw.rotation.z = -0.6; scene.add(tw);
  const lb = sphere(0.14, leaf, 1, 0.8, 1, 0.006, 16); lb.position.set(BRANCH.x1 + 0.08, BRANCH.y + 0.28, BRANCH.z); scene.add(lb);
  { const r = mulberry(3); for (let i = 0; i < 9; i++) { const s = sphere(0.7 + r() * 0.5, i % 2 ? leaf : leaf2, 1, 0.85, 1, 0.012, 20); s.position.set(BRANCH.x0 + (r() - 0.5) * 2.2, 3.4 + r() * 1.0, BRANCH.z - 0.4 + (r() - 0.5) * 1.2); scene.add(s); } }
  // bushes behind the bench
  const bush = toon(0x5cbc52), bush2 = toon(0x49a948);
  { const r = mulberry(7); for (let i = 0; i < 14; i++) { const x = -3.4 + i * 0.5 + (r() - 0.5) * 0.2; if (Math.abs(x - BRANCH.x0) < 0.3) continue; const s = sphere(0.32 + r() * 0.16, i % 2 ? bush : bush2, 1, 0.85, 1, 0.008, 18); s.position.set(x, 0.25, -1.0 - r() * 0.3); scene.add(s); } }
  // flowers dotted on the grass
  { const r = mulberry(13); const cols = [0xff6f91, 0xffd23f, 0xffffff, 0xb28dff]; const stem = toon(0x3c8f3c);
    for (let i = 0; i < 40; i++) { const x = (r() - 0.5) * 6, z = r() < 0.5 ? -0.55 - r() * 0.4 : 1.6 + r() * 1.6; if (Math.abs(x) < 0.8 && z < 0) continue;
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.08, 4), stem); st.position.set(x, 0.04, z); scene.add(st);
      const f = sphere(0.022, toon(cols[i % 4]), 1, 0.6, 1, 0.003, 8); f.position.set(x, 0.085, z); scene.add(f); } }
  // distant trees and hills (no outline, softer)
  const far = (c) => new THREE.MeshBasicMaterial({ color: c });
  { const r = mulberry(21); for (let i = 0; i < 16; i++) { const x = -14 + i * 1.9 + (r() - 0.5); const z = -9 - r() * 4; const h = 1.6 + r() * 1.2;
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, h, 8), far(0x9c7a5e)); t.position.set(x, h / 2, z); scene.add(t);
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.9 + r() * 0.5, 16, 10), far(r() < 0.5 ? 0x84c76f : 0x77bb66)); f.position.set(x, h + 0.4, z); scene.add(f); } }
  for (const [x, r, c] of [[-10, 9, 0x9fd98a], [8, 11, 0x95d27f]]) { const h = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16), far(c)); h.position.set(x, -r + 2.2, -22); scene.add(h); }
  // clouds
  const cloudM = new THREE.MeshBasicMaterial({ color: 0xffffff });
  { const r = mulberry(33); for (let c = 0; c < 6; c++) { const g = new THREE.Group(); const cx = -12 + c * 5 + r() * 2, cy = 7 + r() * 4, cz = -26 - r() * 6;
      for (let k = 0; k < 5; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(1.0 + r() * 0.8, 16, 10), cloudM); s.position.set((k - 2) * 1.1, r() * 0.5, 0); s.scale.y = 0.75; g.add(s); }
      g.position.set(cx, cy, cz); scene.add(g); } }
  // a waste bin by the lamp for scale
  const bin = cyl(0.13, 0.11, 0.42, toon(0x2f6b55), 0.006); bin.position.set(1.35, 0.21, -0.35); scene.add(bin);
  const binTop = cyl(0.14, 0.14, 0.03, toon(0x24564a), 0.004); binTop.position.set(1.35, 0.43, -0.35); scene.add(binTop);
  return out;
}
