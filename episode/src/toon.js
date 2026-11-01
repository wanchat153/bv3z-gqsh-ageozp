// Toon look: banded shading and ink outlines (inverted hull), plus small helpers.
import * as THREE from './three.module.js';

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const mix = (a, b, u) => a + (b - a) * u;
export const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
export function mulberry(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const grad = (() => { const d = new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 225, 225, 225, 255, 255, 255, 255, 255]); const t = new THREE.DataTexture(d, 4, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
export const toon = (c, opts = {}) => new THREE.MeshToonMaterial({ color: c, gradientMap: grad, ...opts });

// ink outline: back faces pushed out along the normal, drawn flat
const INK = new THREE.MeshBasicMaterial({ color: 0x2a1a16, side: THREE.BackSide });
INK.onBeforeCompile = (sh) => { sh.uniforms.uW = { value: 1 }; sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed += normal * OUTLINE_W;'); };
const inks = new Map();
function inkMat(w) {
  const k = w.toFixed(4); if (inks.has(k)) return inks.get(k);
  const m = new THREE.MeshBasicMaterial({ color: 0x2a1a16, side: THREE.BackSide });
  m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n transformed += normal * ${k};`); };
  m.customProgramCacheKey = () => 'ink' + k; inks.set(k, m); return m;
}
export function outlined(geo, material, w = 0.006) {
  const g = new THREE.Group(); const m = new THREE.Mesh(geo, material); m.castShadow = true; m.receiveShadow = true; g.add(m);
  if (w > 0) { const o = new THREE.Mesh(geo, inkMat(w)); g.add(o); }
  g.userData.mesh = m; return g;
}
export const sphere = (r, m, sx = 1, sy = 1, sz = 1, w = 0.006, seg = 32) => { const g = outlined(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7)), m, w / Math.max(sx, sy, sz)); g.scale.set(sx, sy, sz); return g; };
export const capsule = (r, len, m, w = 0.006) => outlined(new THREE.CapsuleGeometry(r, len, 8, 20), m, w);
// a capsule hanging down from its group's origin (for limbs)
export function bone(r, len, m, w = 0.006) { const g = new THREE.Group(); const c = capsule(r, len, m, w); c.position.y = -len / 2; g.add(c); return g; }
