// T08: a European street at night under the strange glowing sky of July 1908 — a row of tall narrow houses with lit
// windows and chimneys, cobbles, a gas lamp; the sky glows pink-orange low over the roofs (sky mode 'glow').
import * as THREE from './three.module.js';
import { mulberry } from './toon.js';
import { skyRig } from './sky.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const STD = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
export function buildTown(scene) {
  const W = {}; const r = mulberry(23);
  const sky = skyRig(scene, { sunDir: V(0, 0.1, -1), moonDir: V(-0.5, 0.6, -1), shadow: 20, center: V(0, 0, -6) }); sky.setMode('glow'); W.sky = sky;
  const cob = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); g.fillStyle = '#3a3640'; g.fillRect(0, 0, 512, 512); const rr = mulberry(4);
    for (let y = 0; y < 512; y += 32) for (let x = (y / 32) % 2 ? 0 : 16; x < 512; x += 32) { g.fillStyle = ['#5a5260', '#4a4452', '#625a6a'][Math.floor(rr() * 3)]; g.beginPath(); g.roundRect(x + 2, y + 2, 28, 28, 8); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(20, 20); return t; })();
  const street = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), STD(0xffffff, { map: cob, roughness: 0.6 })); street.rotation.x = -Math.PI / 2; street.receiveShadow = true; scene.add(street);
  const winM = new THREE.MeshStandardMaterial({ color: 0x302010, emissive: 0xffc070, emissiveIntensity: 1.2 });
  const cols = ['#c8b8a0', '#a8a0b0', '#d0b090', '#b8a888', '#9a8a9a', '#c8a8a0'];
  let x = -14; for (let i = 0; i < 12; i++) { const w = 2.6 + r() * 1.4, h = 6 + r() * 5, d = 5; const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), STD(cols[i % cols.length])); b.position.set(x + w / 2, h / 2, -9); b.castShadow = b.receiveShadow = true; scene.add(b);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.75, 2.2, 4), STD(0x3a2a34)); roof.rotation.y = Math.PI / 4; roof.position.set(x + w / 2, h + 1.1, -9); scene.add(roof);
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.4, 0.4), STD(0x6a4a3a)); ch.position.set(x + w * 0.7, h + 1.4, -9.5); scene.add(ch);
    for (let fy = 1.6; fy < h - 0.8; fy += 1.9) for (let fx = 0.6; fx < w - 0.4; fx += 1.1) { const win = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.0), r() < 0.7 ? winM : STD(0x1a1a2a)); win.position.set(x + fx, fy, -6.49); scene.add(win); }
    x += w + 0.05; }
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 3.4, 10), STD(0x2a2a30, { metalness: 0.6 })); post.position.set(2.5, 1.7, -3); scene.add(post);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffc060, emissiveIntensity: 3 })); lamp.position.set(2.5, 3.5, -3); scene.add(lamp);
  const L = new THREE.PointLight(0xffc070, 6, 12, 1.5); L.position.set(2.5, 3.4, -3); scene.add(L);
  return W;
}
