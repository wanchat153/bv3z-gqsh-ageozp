// The whole Earth with a quarter cut away (K15): painted oceans/continents/ice outside, and on the two cut faces the
// layers to scale — crust (thin), mantle, outer core, inner core. The borehole is a hair-thin dark line at the top of the
// cut (12 km of 6,371 km = 0.19 %), found by a pulsing red ring + arrow. space: dark starry background.
import * as THREE from './three.module.js';
import { mulberry } from './toon.js';
import { makeCard, signText } from './flat.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const R = 5;
function surfTex() { const c = document.createElement('canvas'); c.width = 2048; c.height = 1024; const g = c.getContext('2d'); const r = mulberry(8);
  const gr = g.createLinearGradient(0, 0, 0, 1024); gr.addColorStop(0, '#2a6ac8'); gr.addColorStop(0.5, '#1a50b0'); gr.addColorStop(1, '#2a6ac8'); g.fillStyle = gr; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 26; i++) { const x = r() * 2048, y = 220 + r() * 600, s = 60 + r() * 220; g.fillStyle = ['#5aa048', '#78b050', '#c8b070', '#4a8a40'][i % 4]; g.beginPath();
    for (let k = 0; k <= 24; k++) { const a = k / 24 * Math.PI * 2, rr = s * (0.6 + 0.4 * Math.sin(a * 3 + i) * Math.cos(a * 2 + i * 2)); g.lineTo(x + Math.cos(a) * rr * 1.3, y + Math.sin(a) * rr * 0.8); } g.closePath(); g.fill(); }
  g.fillStyle = '#f4f8ff'; g.fillRect(0, 0, 2048, 90); g.fillRect(0, 960, 2048, 64);
  for (let i = 0; i < 300; i++) { g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(r() * 2048, r() * 1024, 20 + r() * 80, 6 + r() * 16, 0, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function layersTex() { const c = document.createElement('canvas'); c.width = c.height = 2048; const g = c.getContext('2d'); const cx = 1024, cy = 1024, s = 1024;
  // radii (km): surface 6371, crust ~40 (exaggerated ×4 so it reads), mantle to 3480, outer core to 1220
  const ring = (rk, col) => { g.fillStyle = col; g.beginPath(); g.arc(cx, cy, s * rk / 6371, 0, 7); g.fill(); };
  const mg = g.createRadialGradient(cx, cy, s * 3480 / 6371, cx, cy, s); mg.addColorStop(0, '#d8402a'); mg.addColorStop(0.6, '#e8702a'); mg.addColorStop(1, '#f0a050');
  g.fillStyle = '#8a6a5a'; g.beginPath(); g.arc(cx, cy, s, 0, 7); g.fill(); g.fillStyle = mg; g.beginPath(); g.arc(cx, cy, s * (6371 - 160) / 6371, 0, 7); g.fill();
  const og = g.createRadialGradient(cx, cy, 0, cx, cy, s * 3480 / 6371); og.addColorStop(0, '#fff6a0'); og.addColorStop(0.35, '#ffd040'); og.addColorStop(1, '#f09020'); g.fillStyle = og; g.beginPath(); g.arc(cx, cy, s * 3480 / 6371, 0, 7); g.fill();
  const ig = g.createRadialGradient(cx, cy, 0, cx, cy, s * 1220 / 6371); ig.addColorStop(0, '#ffffff'); ig.addColorStop(1, '#fff0a0'); g.fillStyle = ig; g.beginPath(); g.arc(cx, cy, s * 1220 / 6371, 0, 7); g.fill();
  g.globalAlpha = 0.18; const r = mulberry(4); for (let i = 0; i < 3000; i++) { g.fillStyle = r() < 0.5 ? '#ffffff' : '#5a1a10'; g.fillRect(r() * 2048, r() * 2048, 3, 3); } g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

export function buildGlobe(scene) {
  const G = {}; scene.background = new THREE.Color(0x0a0c1c);
  const hemi = new THREE.HemisphereLight(0xc8d8ff, 0x201830, 0.6); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff0dc, 2.2); key.position.set(-8, 6, 10); scene.add(key);
  const r = mulberry(3); const sp = []; for (let i = 0; i < 1200; i++) { const a = r() * Math.PI * 2, e = (r() - 0.5) * Math.PI; sp.push(Math.cos(a) * Math.cos(e) * 120, Math.sin(e) * 120, Math.sin(a) * Math.cos(e) * 120); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, sizeAttenuation: false })));
  const earth = new THREE.Group(); scene.add(earth); G.earth = earth;
  // 3/4 sphere: the missing quarter faces the camera (+x, +z quadrant)
  const shell = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 64, Math.PI, Math.PI * 1.5), new THREE.MeshStandardMaterial({ map: surfTex(), roughness: 0.6, side: THREE.DoubleSide })); earth.add(shell);
  const lt = layersTex(); const faceM = new THREE.MeshStandardMaterial({ map: lt, roughness: 0.7, emissive: 0xffffff, emissiveMap: lt, emissiveIntensity: 0.35, side: THREE.DoubleSide });
  for (const rot of [0, -Math.PI / 2]) { const f = new THREE.Mesh(new THREE.CircleGeometry(R, 128, -Math.PI / 2, Math.PI), faceM); f.rotation.y = rot; earth.add(f); }
  // the borehole: a hair line at the top of the x-face, 12.262/6371 of R long, and a red finder ring + arrow
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(0.004, R * 12.262 / 6371), new THREE.MeshBasicMaterial({ color: 0x000000 })); hole.position.set(0.6, R - R * 12.262 / 6371 / 2 - 0.0, 0.003); earth.add(hole);
  const ring = makeCard(0.6, 0.6, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.lineWidth = 18; g.strokeStyle = '#ff3a2a'; g.beginPath(); g.arc(w / 2, h / 2, w * 0.4, 0, 7); g.stroke(); }, { transparent: true });
  ring.position.set(0.6, R * Math.cos(Math.asin(0.6 / R)) - 0.02, 0.05); earth.add(ring); G.ring = ring;
  const arrow = makeCard(1.6, 1.6, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#ff3a2a'; g.strokeStyle = '#2a1a16'; g.lineWidth = 16; g.beginPath(); g.moveTo(w * 0.15, h * 0.15); g.lineTo(w * 0.7, h * 0.7); g.lineTo(w * 0.72, h * 0.45); g.moveTo(w * 0.7, h * 0.7); g.lineTo(w * 0.45, h * 0.72); g.lineCap = 'round'; g.lineWidth = 44; g.strokeStyle = '#2a1a16'; g.stroke(); g.lineWidth = 26; g.strokeStyle = '#ff3a2a'; g.stroke(); }, { transparent: true });
  arrow.position.set(-0.4, R + 0.9, 0.08); earth.add(arrow); G.arrow = arrow;
  const label = makeCard(4.2, 0.9, 1024, (g, w, h) => { g.clearRect(0, 0, w, h); signText(g, '0.2 %', w / 2, h / 2, 190, '#ffe9a8', '#1b1420'); }, { transparent: true });
  label.position.set(-1.6, R + 2.1, 0.1); earth.add(label); G.label = label;
  G.pulse = (t) => { const k = 1 + 0.25 * Math.sin(t * 8); ring.scale.setScalar(k); arrow.position.y = R + 0.9 + 0.12 * Math.sin(t * 6); };
  return G;
}
