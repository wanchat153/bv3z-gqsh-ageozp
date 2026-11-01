// Page-side half of the three.js → Blender bridge (no glTF: the stock exporter is far too slow on these sculpted worlds).
// begin(id, ts): dry-runs the shot's frames (so lazily built props exist), names every node N0..Nn in a fixed traversal
// order, poses the first frame and uploads the world as raw parts: geo/<uuid>.bin (positions, normals, uvs, colours, index),
// tex/<uuid>.png (≤ 2048 px), inst/<name>.bin (instance matrices + colours) and world.json (nodes, materials, textures).
// frame(t, f) then reports what moves: camera, changed local matrices, visibility, character canvases, sprites, lights.
import * as THREE from './three.module.js';

let S = null, ID = null, BASE = new Map(), NODES = [], FLATS = [], SPRITES = [], LIGHTS = [];
const vis = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
const arr = (m) => Array.from(m.elements, (x) => +x.toFixed(6));
const up = (f, body) => fetch('/__up?f=' + encodeURIComponent(f), { method: 'POST', body });
function canvasOf(img, max = 2048) { const w = img.width || img.videoWidth, h = img.height || img.videoHeight; const k = Math.min(1, max / Math.max(w, h));
  if (k === 1 && img.toBlob) return img; const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k)); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c; }
const blob = (img, max) => new Promise((res) => canvasOf(img, max).toBlob(res, 'image/png'));
function pose(t) { const sh = window.__shotAt(ID, t); if (sh.prep) sh.prep(); sh.scene.updateMatrixWorld(true); sh.camera.updateMatrixWorld(true); return sh; }
function packGeo(g) {   // [nVerts, nIdx, flags] + pos + nrm + uv + col + idx as one Float32/Uint32 blob
  const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, C = g.attributes.color, I = g.index;
  const n = P.count, ni = I ? I.count : 0; const flags = (N ? 1 : 0) | (U ? 2 : 0) | (C ? 4 : 0);
  const size = 3 + n * 3 + (N ? n * 3 : 0) + (U ? n * 2 : 0) + (C ? n * 3 : 0) + ni; const buf = new ArrayBuffer(size * 4); const f = new Float32Array(buf), u = new Uint32Array(buf);
  u[0] = n; u[1] = ni; u[2] = flags; let o = 3;
  const put = (A, k) => { for (let i = 0; i < n; i++) for (let j = 0; j < k; j++) f[o++] = A.getComponent ? A.getComponent(i, j) : A.array[i * k + j]; };
  put(P, 3); if (N) put(N, 3); if (U) put(U, 2); if (C) { for (let i = 0; i < n; i++) { f[o++] = C.getX(i); f[o++] = C.getY(i); f[o++] = C.getZ(i); } }
  if (I) for (let i = 0; i < ni; i++) u[o++] = I.getX(i);
  return buf; }
const hex = (c) => (c ? c.toArray().map((x) => +x.toFixed(4)) : null);
export async function begin(id, ts) {
  ID = id; for (const t of ts) pose(t);
  const sh = pose(ts[0]); S = sh.scene; NODES = []; FLATS = []; SPRITES = []; LIGHTS = []; BASE = new Map();
  let i = 0; S.traverse((o) => { o.userData.oname ??= o.name; o.name = 'N' + i++; NODES.push(o);
    if (o.isMesh && o.renderOrder === 2 && o.material && o.material.map && o.material.map.image && o.material.map.image.getContext) FLATS.push(o);
    if (o.isSprite) SPRITES.push(o); if (o.isLight) LIGHTS.push(o); });
  for (const o of NODES) { o.updateMatrix(); BASE.set(o, { m: arr(o.matrix).join(), v: vis(o) }); }
  const geos = new Set(), mats = {}, texs = {}; const nodes = [];
  const texOf = async (t) => { if (!t || !t.image) return null; if (!texs[t.uuid]) { texs[t.uuid] = { repeat: t.repeat.toArray(), offset: t.offset.toArray(), wrap: t.wrapS === THREE.RepeatWrapping, srgb: t.colorSpace === THREE.SRGBColorSpace, rot: t.rotation };
      try { await up(`tex/${t.uuid}.png`, await blob(t.image, 2048)); } catch (e) { texs[t.uuid].bad = true; } } return t.uuid; };
  const matOf = async (m) => { if (!m) return null; if (!mats[m.uuid]) { mats[m.uuid] = { type: m.type, color: hex(m.color), emissive: hex(m.emissive), ei: m.emissiveIntensity ?? 1, rough: m.roughness ?? 0.6, metal: m.metalness ?? 0, envI: m.envMap ? m.envMapIntensity : null, push: (m.customProgramCacheKey && /^ink[\d.]+$/.test(m.customProgramCacheKey())) ? parseFloat(m.customProgramCacheKey().slice(3)) : 0,
      opacity: m.opacity, transparent: m.transparent, alphaTest: m.alphaTest, side: m.side, vc: m.vertexColors, blending: m.blending, depthWrite: m.depthWrite,
      map: await texOf(m.map), normalMap: await texOf(m.normalMap), ns: m.normalScale ? m.normalScale.x : 1, emissiveMap: await texOf(m.emissiveMap), alphaMap: await texOf(m.alphaMap) }; } return m.uuid; };
  for (const o of NODES) { o.updateMatrix(); const n = { name: o.name, parent: o.parent && o.parent !== S ? o.parent.name : null, m: arr(o.matrix), v: o.visible, type: o.isInstancedMesh ? 'inst' : o.isMesh ? 'mesh' : o.isSprite ? 'sprite' : o.isLight ? 'light' : o.isPoints ? 'points' : 'group', ro: o.renderOrder };
    if (o.isMesh) { const g = o.geometry; if (!geos.has(g.uuid)) { geos.add(g.uuid); await up(`geo/${g.uuid}.bin`, new Blob([packGeo(g)])); } n.geo = g.uuid; n.groups = g.groups.map((x) => [x.start, x.count, x.materialIndex]);
      n.mat = Array.isArray(o.material) ? await Promise.all(o.material.map(matOf)) : [await matOf(o.material)]; n.shadow = o.castShadow;
      if (o.isInstancedMesh) { const k = o.count; const b = new Float32Array(k * 16 + (o.instanceColor ? k * 3 : 0)); b.set(o.instanceMatrix.array.subarray(0, k * 16)); if (o.instanceColor) b.set(o.instanceColor.array.subarray(0, k * 3), k * 16);
        await up(`inst/${o.name}.bin`, new Blob([b])); n.count = k; n.icol = !!o.instanceColor; } }
    if (o.isSprite && o.material.map) n.tex = await texOf(o.material.map);
    nodes.push(n); }
  const bg = S.background && S.background.isColor ? S.background.toArray() : null;
  let bgImg = null; if (S.background && S.background.isTexture && S.background.image) { await up('tex/background.png', await blob(S.background.image)); bgImg = 'tex/background.png'; }
  const hemi = []; S.traverse((o) => { if (o.isHemisphereLight) hemi.push({ sky: o.color.toArray(), ground: o.groundColor.toArray(), i: o.intensity }); });
  await up('world.json', new Blob([JSON.stringify({ nodes, mats, texs })]));
  return { nodes: NODES.length, flats: FLATS.map((o) => o.name), sprites: SPRITES.map((s) => ({ name: s.name, tex: s.material.map ? s.material.map.uuid : null, add: s.material.blending === THREE.AdditiveBlending })),
    lights: LIGHTS.filter((l) => !l.isHemisphereLight).map((l) => ({ name: l.name, type: l.type, color: l.color.toArray(), distance: l.distance ?? 0, decay: l.decay ?? 2 })), hemi,
    background: bg, backgroundImg: bgImg, envIntensity: S.environmentIntensity ?? 1, hiddenAt0: NODES.filter((o) => (o.isMesh || o.isSprite) && !vis(o)).map((o) => o.name) };
}
export async function frame(t, fi) {
  const sh = pose(t); const cam = sh.camera; const out = { t, focus: sh.focus || null, haze: sh.haze || null, cam: { m: arr(cam.matrixWorld), fov: cam.fov, aspect: cam.aspect, near: cam.near, far: cam.far }, nodes: {}, vis: {}, flats: {}, sprites: {}, lights: {} };
  for (const o of NODES) { o.updateMatrix(); const m = arr(o.matrix); const v = vis(o); const b = BASE.get(o);
    if (m.join() !== b.m) out.nodes[o.name] = m; if ((o.isMesh || o.isSprite) && v !== b.v) out.vis[o.name] = v; }
  for (const f of FLATS) { const v = vis(f); out.vis[f.name] = v; if (v) { const pth = `flats/${f.name}_${String(fi).padStart(4, '0')}.png`; await up(pth, await blob(f.material.map.image, 4096)); out.flats[f.name] = { png: pth, opacity: f.material.opacity }; } }
  for (const s of SPRITES) { const v = vis(s); out.vis[s.name] = v; if (v) { const p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(); s.matrixWorld.decompose(p, q, sc);
    out.sprites[s.name] = { p: p.toArray(), s: [sc.x, sc.y], c: s.material.color.toArray(), o: s.material.opacity }; } }
  for (const l of LIGHTS) if (!l.isHemisphereLight) out.lights[l.name] = { i: vis(l) ? l.intensity : 0, p: new THREE.Vector3().setFromMatrixPosition(l.matrixWorld).toArray(), c: l.color.toArray(), tg: l.target ? (l.target.updateMatrixWorld(), new THREE.Vector3().setFromMatrixPosition(l.target.matrixWorld).toArray()) : null };
  return out;
}
