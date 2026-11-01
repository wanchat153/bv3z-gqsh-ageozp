// Sky + light rig shared by the outdoor worlds: gradient sky dome, sun disc with glow and rays, moon, stars, painted cloud
// streaks, hemisphere + key light with a shadow map. setMode('day'|'sunset'|'night'|'morning') switches everything in one
// call (shots that share a world switch mode in their own prep, so a dissolve between day and night is exact).
import * as THREE from './three.module.js';
import { mulberry } from './toon.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
function grad(stops) { const c = document.createElement('canvas'); c.width = 8; c.height = 512; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 512);
  stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, 8, 512); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function glowTex(inner, outer, rays = 0) { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  if (rays) { g.save(); g.translate(256, 256); for (let k = 0; k < rays; k++) { g.rotate(Math.PI * 2 / rays); const gr = g.createLinearGradient(0, 0, 250, 0); gr.addColorStop(0, outer.replace('A', '0.35')); gr.addColorStop(1, outer.replace('A', '0'));
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(256, -10); g.lineTo(256, 10); g.closePath(); g.fill(); } g.restore(); }
  const r = g.createRadialGradient(256, 256, 0, 256, 256, 256); r.addColorStop(0, inner); r.addColorStop(0.12, inner); r.addColorStop(0.16, outer.replace('A', '0.75')); r.addColorStop(0.45, outer.replace('A', '0.22')); r.addColorStop(1, outer.replace('A', '0'));
  g.fillStyle = r; g.fillRect(0, 0, 512, 512); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function moonTex() { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, '#ffffff'); r.addColorStop(0.28, '#fbf8ee'); r.addColorStop(0.32, 'rgba(220,230,255,0.55)'); r.addColorStop(0.6, 'rgba(160,180,255,0.15)'); r.addColorStop(1, 'rgba(120,140,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  g.fillStyle = 'rgba(200,205,220,0.35)'; for (const [x, y, s] of [[112, 118, 9], [140, 140, 6], [124, 146, 5], [146, 112, 4]]) { g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
// a long soft painted cloud streak (sunset / day)
function streak(seed, cols) { const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d'); const r = mulberry(seed);
  for (let k = 0; k < 7; k++) { const x = 60 + r() * 380, y = 50 + r() * 30, w = 60 + r() * 120, h = 18 + r() * 22; g.fillStyle = cols[0]; g.beginPath(); g.ellipse(x, y, w, h, 0, 0, 7); g.fill(); }
  g.fillStyle = cols[1]; for (let k = 0; k < 5; k++) { const x = 80 + r() * 340; g.beginPath(); g.ellipse(x, 86, 90 + r() * 60, 10, 0, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }

const MODES = {
  day: { sky: [[0, '#3f86d8'], [0.6, '#86bdf0'], [1, '#e2f2ff']], hemi: [0xeaf4ff, 0xb8a080, 1.0], key: [0xfff2dc, 2.4], env: 0.32, sun: false, moon: false, stars: false, clouds: ['#ffffff', '#dfe8f6'], fog: [0.006, [0.78, 0.86, 0.98]] },
  sunset: { sky: [[0, '#5a3f8a'], [0.35, '#c06a9a'], [0.62, '#f49a7a'], [0.82, '#ffcc7a'], [1, '#ffe2a0']], hemi: [0xffb090, 0x6a3a40, 0.75], key: [0xffa050, 2.9], env: 0.16, sun: true, moon: false, stars: false, clouds: ['#b878b8', '#f0a0a0'], fog: [0.012, [0.98, 0.7, 0.62]] },
  night: { sky: [[0, '#101a4a'], [0.55, '#253a8a'], [1, '#4a64c4']], hemi: [0x6a78ff, 0x14143a, 0.5], key: [0x98a8ff, 0.85], env: 0.09, sun: false, moon: true, stars: true, clouds: ['#3a4a9a', '#2a3a7a'], fog: [0.01, [0.2, 0.26, 0.55]] },
  morning: { sky: [[0, '#8ab0d8'], [0.5, '#f0d0a0'], [1, '#fff0d0']], hemi: [0xfff0d8, 0x8a7050, 1.0], key: [0xfff0c8, 2.2], env: 0.3, sun: true, moon: false, stars: false, clouds: ['#fff6e8', '#f6d8b8'], fog: [0.014, [1.0, 0.9, 0.76]] },
};

export function skyRig(scene, { sunDir = V(0, 0.12, -1), moonDir = V(-0.35, 0.5, -1), shadow = 14, center = V(0, 0, 0) } = {}) {
  const R = { mode: null, bgs: {} };
  for (const k in MODES) R.bgs[k] = grad(MODES[k].sky);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 2); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0005; key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left: -shadow, right: shadow, top: shadow, bottom: -shadow, near: 1, far: 200 }); scene.add(key); scene.add(key.target); key.target.position.copy(center);
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('#fffbe8', 'rgba(255,200,120,A)', 18), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); sun.scale.setScalar(150); scene.add(sun);
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex(), transparent: true, depthWrite: false, fog: false })); moon.scale.setScalar(36); scene.add(moon);
  const r = mulberry(5); const sp = []; for (let i = 0; i < 700; i++) { const a = r() * Math.PI * 2, e = 0.08 + r() * 1.3; sp.push(Math.cos(a) * Math.cos(e) * 400, Math.sin(e) * 400, Math.sin(a) * Math.cos(e) * 400); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.8, fog: false })); scene.add(stars);
  const clouds = new THREE.Group(); scene.add(clouds); const cm = [];
  for (let k = 0; k < 9; k++) { const m = new THREE.MeshBasicMaterial({ map: streak(10 + k, ['#ffffff', '#dddddd']), transparent: true, depthWrite: false, fog: false }); cm.push(m);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(90 + r() * 60, 20 + r() * 8), m); const a = -0.9 + k * 0.22 + r() * 0.1; p.position.set(Math.sin(a) * 330, 70 + r() * 70, -Math.cos(a) * 330); p.lookAt(0, p.position.y * 0.6, 0); clouds.add(p); }
  R.sunDir = sunDir.clone().normalize(); R.moonDir = moonDir.clone().normalize(); R.center = center;
  R.setMode = (mode, o = {}) => { const M = MODES[mode]; R.mode = mode; scene.background = R.bgs[mode];
    hemi.color.set(M.hemi[0]); hemi.groundColor.set(M.hemi[1]); hemi.intensity = M.hemi[2] * (o.hemi ?? 1); key.color.set(M.key[0]); key.intensity = M.key[1] * (o.key ?? 1); scene.environmentIntensity = M.env * (o.env ?? 1);
    const sd = (o.sunDir || R.sunDir).clone().normalize(), md = (o.moonDir || R.moonDir).clone().normalize();
    const ld = mode === 'night' ? md : mode === 'day' ? V(0.4, 1, 0.5).normalize() : sd.clone().setY(Math.max(0.25, sd.y)).normalize();
    const C0 = o.center || R.center; key.position.copy(C0).addScaledVector(ld, 80); key.target.position.copy(C0);
    sun.visible = M.sun; sun.position.copy(C0).addScaledVector(sd, 380); moon.visible = M.moon; moon.position.copy(C0).addScaledVector(md, 380); stars.visible = M.stars; stars.position.copy(C0); clouds.position.copy(C0);
    cm.forEach((m, i) => { m.color.set(M.clouds[i % 2]); }); clouds.visible = !o.noClouds; R.fog = M.fog; };
  R.hemi = hemi; R.key = key; R.sun = sun; R.moon = moon; R.stars = stars; R.clouds = clouds;
  return R;
}
export const haze = (mode, k = 1) => ({ den: MODES[mode].fog[0] * k, start: 6, max: 0.55, col: MODES[mode].fog[1] });
