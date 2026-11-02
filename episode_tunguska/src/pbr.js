// Turn a toon/phong/lambert-built set into physically based materials lit by an environment (soft bounce light in every
// direction, the way the reference's 3D props read). Ink-outline hulls and billboards (MeshBasicMaterial) are left alone.
// pbrify(scene, renderer, { env: 0.55, gold: [hex,...] }) — call once after the set is built.
import * as THREE from './three.module.js';
import { RoomEnvironment } from './addons/environments/RoomEnvironment.js';

let ENV = null;
function envTex(renderer) { if (ENV) return ENV; const pm = new THREE.PMREMGenerator(renderer); ENV = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose(); return ENV; }
const cache = new Map();
function convert(m, o) {
  if (m && m.isMeshStandardMaterial && m.metalness > 0.5 && !m.envMap) { m.envMap = ENV; m.envMapIntensity = 1.1; }   // sculpted metals
  if (!m || m.isMeshBasicMaterial || m.isShaderMaterial || m.isSpriteMaterial || m.isMeshStandardMaterial) return m;
  if (cache.has(m)) return cache.get(m);
  const sh = m.shininess ?? 10; const col = m.color ? m.color.clone() : new THREE.Color(1, 1, 1);
  const goldish = m.isMeshPhongMaterial && sh >= 60 && m.specular && (m.specular.r > 0.6 && m.specular.g > 0.5);
  const n = new THREE.MeshStandardMaterial({ color: col, map: m.map || null, transparent: m.transparent, opacity: m.opacity, alphaTest: m.alphaTest, side: m.side,
    emissive: m.emissive ? m.emissive.clone().multiplyScalar(goldish ? 0.25 : 1) : new THREE.Color(0), emissiveIntensity: m.emissiveIntensity ?? 1, depthWrite: m.depthWrite,
    roughness: goldish ? 0.32 : Math.max(0.35, 1 - sh / 140), metalness: goldish ? 1.0 : 0.0, envMapIntensity: goldish ? o.env * 2.2 : o.env });
  if (goldish) { n.envMap = ENV; n.envMapIntensity = 1.1; }   // metals carry their own (stronger) reflection
  n.name = (m.name || '') + ':pbr'; cache.set(m, n); return n;
}
export function pbrify(scene, renderer, o = {}) {
  o = { env: 0.3, ...o };
  scene.environment = envTex(renderer); scene.environmentIntensity = o.env;   // r170: scene.environment uses this, not material.envMapIntensity
  // the set's lights were tuned for toon shading; the environment now supplies the fill, so pull them down
  scene.traverse((ob) => { if (ob.isHemisphereLight) ob.intensity *= o.hemi ?? 0.25; else if (ob.isDirectionalLight) ob.intensity *= o.key ?? 0.8; else if (ob.isPointLight) ob.intensity *= o.point ?? 0.6; });
  scene.traverse((ob) => { if (!ob.isMesh || ob.isInstancedMesh && ob.userData.keep) return;
    if (Array.isArray(ob.material)) ob.material = ob.material.map((m) => convert(m, o)); else ob.material = convert(ob.material, o); });
  return scene;
}
