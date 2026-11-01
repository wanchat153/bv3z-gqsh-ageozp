// Basic set helpers: lights, plain toon boxes/cylinders, canvas ground, card clouds, banners.
// Detailed props (rounded toy geometry, towers, cars, trees, interiors…) live in props.js; textures in textures.js.
// Each shot owns its own THREE.Scene; build it with these helpers.
import * as THREE from './three.module.js';
import { toon, outlined, mulberry } from './toon.js';
import { makeCard, signText } from './flat.js';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function lights(scene, { sky = 0xfff8ee, ground = 0xe9c9a6, hemi = 1.35, sun = 2.2, sunCol = 0xfff1dc, ext = 6 } = {}) {
  scene.add(new THREE.HemisphereLight(sky, ground, hemi));
  const s = new THREE.DirectionalLight(sunCol, sun); s.castShadow = true; s.shadow.mapSize.set(2048, 2048); s.shadow.bias = -0.0006; s.shadow.normalBias = 0.02;
  Object.assign(s.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 0.5, far: 60 }); scene.add(s); scene.add(s.target);
  return { sun: s, aim(target, off = V(-4, 9, 6)) { s.target.position.copy(target); s.position.copy(target).add(off); } };
}

export function box(w, h, d, col, ink = 0.01) { const g = outlined(new THREE.BoxGeometry(w, h, d), toon(col), ink); return g; }
export function cyl(r, h, col, ink = 0.01, seg = 32) { return outlined(new THREE.CylinderGeometry(r, r, h, seg), toon(col), ink); }

export function groundPlane(size, draw, px = 2048) {
  const m = makeCard(size, size, px, draw, { lit: true }); m.rotation.x = -Math.PI / 2; return m;
}

export function cloud(scale = 1, seed = 1) {
  const r = mulberry(seed);
  return makeCard(2.4 * scale, 1.1 * scale, 512, (c, W, H) => {
    c.fillStyle = '#ffffff'; c.strokeStyle = '#c9dff0'; c.lineWidth = 10;
    const blobs = [...Array(5)].map((_, i) => [W * (0.2 + i * 0.15), H * (0.62 - r() * 0.22), H * (0.22 + r() * 0.12)]);
    for (const [x, y, rr] of blobs) { c.beginPath(); c.arc(x, y, rr, 0, 7); c.stroke(); }
    for (const [x, y, rr] of blobs) { c.beginPath(); c.arc(x, y, rr, 0, 7); c.fill(); }
    c.fillRect(W * 0.18, H * 0.62, W * 0.64, H * 0.2);
  }, { transparent: true });
}

export function banner(w, h, text, { bg = '#1f3a8a', fg = '#ffffff', stripe = '#d63a3a' } = {}) {
  return makeCard(w, h, 1024, (c, W, H) => { c.fillStyle = bg; c.fillRect(0, 0, W, H); c.fillStyle = stripe; c.fillRect(0, H * 0.82, W, H * 0.08); signText(c, text, W / 2, H * 0.42, H * 0.46, fg, '#0d1640'); }, { lit: true });
}
