// The Oregon beach, November 1970: wide sand, surf, dunes with grass, driftwood, a headland, the parking lot; the whale,
// the highway truck, the dynamite cases, the detonator, the brand-new car, the bulldozer. Every object that is used
// registers a ground collider (x0, z0, x1, z1) so characters keep their working room and never pass through it.
import * as THREE from './three.module.js';
import { canvasTex } from './world.js';
import { WHALE, SEA_Z, DUNE_Z, LOT, CAR, TRUCK, PLUNGER } from './layout.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rnd = (s) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o });
const sh = (m, cast = true, recv = true) => { m.traverse((o) => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = recv; } }); return m; };
export const COLLIDERS = [];   // {name, x0, z0, x1, z1, on}
const box = (name, cx, cz, hx, hz) => { const c = { name, x0: cx - hx, z0: cz - hz, x1: cx + hx, z1: cz + hz, on: true }; COLLIDERS.push(c); return c; };

export function duneH(x, z) { const gap = Math.max(0, 1 - Math.max(0, Math.abs(x - 436) - 22) / 14); const z0 = DUNE_Z + gap * 11; if (z < z0) return 0; const u = Math.min(1, (z - z0) / 16); return (u * u * (3 - 2 * u)) * (6.5 + 1.8 * Math.sin(x * 0.045) + 1.1 * Math.sin(x * 0.13 + 1.3) + 0.6 * Math.sin(z * 0.4 + x * 0.02)); }

export function makeBeach(scene) {
  const r = rnd(5);
  // sand with ripples and grain; a wet band toward the sea
  const sandT = canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#e0bd84'; x.fillRect(0, 0, w, h); for (let k = 0; k < 9000; k++) { const v = 170 + r() * 60; x.fillStyle = `rgba(${v},${v * 0.82},${v * 0.55},0.35)`; x.fillRect(r() * w, r() * h, 2, 2); }
    for (let k = 0; k < 40; k++) { const y = r() * h; x.strokeStyle = 'rgba(150,125,90,0.25)'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, y); for (let i = 0; i <= 16; i++) x.lineTo(i * w / 16, y + Math.sin(i * 0.9 + k) * 6); x.stroke(); } }, [160, 50]);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(1800, 500, 1, 1), std(0xffffff, { map: sandT, roughness: 0.95 })); sand.rotation.x = -Math.PI / 2; sand.position.set(250, 0, 0); sand.receiveShadow = true; scene.add(sand);
  const wet = new THREE.Mesh(new THREE.PlaneGeometry(1800, 9), std(0x9a7a50, { roughness: 0.35, metalness: 0.05, transparent: true, opacity: 0.7 })); wet.rotation.x = -Math.PI / 2; wet.position.set(250, 0.004, SEA_Z + 3.5); wet.receiveShadow = true; scene.add(wet);
  // the sea: deep teal, with moving foam lines
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1800, 900), std(0x1f7a86, { roughness: 0.18, metalness: 0.05 })); sea.rotation.x = -Math.PI / 2; sea.position.set(250, 0.02, SEA_Z - 450); sea.receiveShadow = true; scene.add(sea);
  const foamM = new THREE.MeshBasicMaterial({ color: 0xf4f7f2, transparent: true, opacity: 0.85, depthWrite: false });
  const foams = []; for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1.2, 180, 1), foamM.clone()); f.rotation.x = -Math.PI / 2; const pos = f.geometry.attributes.position; for (let k = 0; k < pos.count; k++) pos.setY(k, pos.getY(k) + Math.sin(pos.getX(k) * 0.08 + i) * 0.6 + Math.sin(pos.getX(k) * 0.023 + i * 2) * 1.2); f.position.set(250, 0.03, SEA_Z); scene.add(f); foams.push(f); }
  // dunes
  const dg = new THREE.PlaneGeometry(1800, 70, 360, 28); dg.rotateX(-Math.PI / 2); dg.translate(250, 0, DUNE_Z + 33); { const p = dg.attributes.position; for (let k = 0; k < p.count; k++) p.setY(k, duneH(p.getX(k), p.getZ(k))); dg.computeVertexNormals(); }
  const dune = new THREE.Mesh(dg, std(0xffffff, { map: canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#d8b67c'; x.fillRect(0, 0, w, h); for (let k = 0; k < 5000; k++) { x.fillStyle = `rgba(${150 + r() * 60},${130 + r() * 50},${90 + r() * 40},0.4)`; x.fillRect(r() * w, r() * h, 3, 3); } }, [120, 6]), roughness: 0.95 })); dune.receiveShadow = true; scene.add(dune);
  // beach grass on the dunes: instanced tufts of three blades
  const blade = new THREE.ConeGeometry(0.05, 0.9, 3); blade.translate(0, 0.45, 0); const grassM = std(0x8a9a40, { roughness: 0.9 });
  const NG = 2600; const grass = new THREE.InstancedMesh(blade, grassM, NG * 3); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); let gi = 0;
  for (let k = 0; k < NG; k++) { const gx = -150 + r() * 700, gz = DUNE_Z + 3 + r() * 30; if (duneH(gx, gz) < 0.4) continue; const gy = duneH(gx, gz); const tone = new THREE.Color().setHSL(0.17 + r() * 0.05, 0.35, 0.32 + r() * 0.15);
    for (let b = 0; b < 3; b++) { e.set((r() - 0.5) * 0.6, r() * 6, (r() - 0.5) * 0.6); q.setFromEuler(e); const s = 0.7 + r() * 0.7; m4.compose(V(gx + (r() - 0.5) * 0.3, gy - 0.05, gz + (r() - 0.5) * 0.3), q, V(s, s, s)); grass.setMatrixAt(gi, m4); grass.setColorAt(gi, tone); gi++; } }
  grass.castShadow = true; scene.add(grass);
  // driftwood logs (kept out of the working areas)
  const logM = std(0x9a8670, { roughness: 0.95 }); const keepOut = (x, z) => (x > -14 && x < 32 && z > -4 && z < 13) || (x > 380 && x < 456 && z > -4 && z < 32);
  for (let k = 0; k < 70; k++) { let x, z; do { x = -120 + r() * 640; z = -6 + r() * 26; } while (keepOut(x, z)); const L = 1.5 + r() * 4, R = 0.12 + r() * 0.2; const lg = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.8, R, L, 8), logM); lg.rotation.set(Math.PI / 2, 0, r() * Math.PI); lg.rotation.order = 'YXZ'; lg.rotation.y = r() * Math.PI; lg.position.set(x, R * 0.85, z); sh(lg); scene.add(lg); }
  // clutter on the sand: kelp heaps, pebbles and shells, footprints (decals), all outside the working areas
  const kelpM = std(0x4a5a24, { roughness: 0.6 });
  for (let k = 0; k < 90; k++) { let x, z; do { x = -60 + r() * 520; z = SEA_Z + 2 + r() * 14; } while (keepOut(x, z) && r() < 0.95); if (keepOut(x, z)) continue; const pts = []; let px = x, pz = z; for (let i = 0; i < 6; i++) { px += (r() - 0.5) * 0.8; pz += (r() - 0.5) * 0.5; pts.push(V(px, 0.04, pz)); }
    const kp = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.035 + r() * 0.03, 5), kelpM); kp.castShadow = true; scene.add(kp); const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), kelpM); bulb.position.copy(pts[5]); scene.add(bulb); }
  const peb = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), std(0xffffff, { roughness: 0.8 }), 2500); for (let k = 0; k < 2500; k++) { const x = -60 + r() * 520, z = SEA_Z + r() * 32; const s2 = 0.02 + r() * 0.06;
    m4.compose(V(x, s2 * 0.4, z), q.setFromEuler(e.set(r() * 3, r() * 3, r() * 3)), V(s2 * 1.3, s2 * 0.7, s2)); peb.setMatrixAt(k, m4); peb.setColorAt(k, new THREE.Color().setHSL(0.08 + r() * 0.05, 0.2 + r() * 0.3, 0.35 + r() * 0.5)); } peb.receiveShadow = true; scene.add(peb);
  const fpT = canvasTex(256, 256, (x, w, h) => { x.clearRect(0, 0, w, h); for (let i = 0; i < 9; i++) { const yy = 240 - i * 27, xx = 128 + (i % 2 ? 14 : -14) + Math.sin(i * 0.5) * 8; x.fillStyle = 'rgba(120,85,45,0.35)'; x.beginPath(); x.ellipse(xx, yy, 7, 12, 0, 0, 7); x.fill(); } });
  fpT.wrapS = fpT.wrapT = THREE.ClampToEdgeWrapping; fpT.repeat.set(1, 1);
  for (const [x, z, a] of [[3, 6, 0.4], [9, 6.5, -0.9], [-3, 7, 0.2], [1, 9, 1.0], [12, 4.6, -1.2], [-6, 5, 0.6], [395, 9, 1.4], [402, 11, 1.7], [398, 2, 1.5], [406, 3, 1.3]]) { const fp = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 4.5), new THREE.MeshBasicMaterial({ map: fpT, transparent: true, depthWrite: false })); fp.rotation.set(-Math.PI / 2, 0, a); fp.position.set(x, 0.008, z); scene.add(fp); }
  // a headland to the south and sea stacks
  const rockM = std(0x3c4038, { roughness: 1 }), greenM = std(0x2f4a30, { roughness: 1 });
  for (const [x, z, sx, sy] of [[-1200, 420, 1300, 110], [400, 520, 900, 90], [1900, 440, 1400, 120]]) { const hl = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), greenM); hl.scale.set(sx, sy * 0.35, 200); hl.position.set(x, 0, z); scene.add(hl); }
  // (no sea stacks: they read as dark blobs over the whale in the vertical frame)
  // inland forest line beyond the dunes
  const treeM = std(0x26402a, { roughness: 1 }); const tree = new THREE.ConeGeometry(2.2, 9, 6); tree.translate(0, 4.5, 0); const trees = new THREE.InstancedMesh(tree, treeM, 500);
  for (let k = 0; k < 500; k++) { const x = -200 + r() * 900, z = 62 + r() * 40; const s = 0.8 + r() * 0.9; m4.compose(V(x, duneH(x, 60) * 0.6, z), q.identity(), V(s, s * (0.9 + r() * 0.5), s)); trees.setMatrixAt(k, m4); } scene.add(trees);
  // parking lot (gravel), fence posts with rope, power poles
  const lot = new THREE.Mesh(new THREE.PlaneGeometry(LOT.x1 - LOT.x0, LOT.z1 - LOT.z0), std(0xffffff, { map: canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#a08a6a'; x.fillRect(0, 0, w, h); for (let k = 0; k < 3000; k++) { const v = 110 + r() * 80; x.fillStyle = `rgb(${v},${v * 0.88},${v * 0.7})`; x.fillRect(r() * w, r() * h, 2, 2); } }, [8, 5]), roughness: 1 }));
  lot.rotation.x = -Math.PI / 2; lot.position.set((LOT.x0 + LOT.x1) / 2, 0.01, (LOT.z0 + LOT.z1) / 2); lot.receiveShadow = true; scene.add(lot);
  const postM = std(0x6a5a48); for (let x = 300; x < 560; x += 3.2) { if (x > LOT.x0 - 2 && x < LOT.x1 + 2) continue; const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.1, 6), postM); p.position.set(x, 0.55, 19.5 + Math.sin(x) * 0.3); sh(p); scene.add(p); }
  { const pts = []; for (let x = 300; x < LOT.x0 - 2; x += 3.2) pts.push(V(x, 0.95, 19.5 + Math.sin(x) * 0.3)); const rope = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, 0.015, 4), std(0xc8b48a)); scene.add(rope); }
  for (let x = 380; x < 520; x += 38) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 10, 6), postM); p.position.set(x, duneH(x, 34) + 5, 34); sh(p); scene.add(p); const cr = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 2.0), postM); cr.position.set(x, duneH(x, 34) + 9.4, 34); scene.add(cr); }
  // other parked cars in the lot
  for (const [x, z, c] of [[424.0, 26.5, 0xc89a2a], [441.0, 26.8, 0x7a2a2a], [447.5, 22.0, 0xe8e4d8]]) { const cc = makeCar(c); cc.root.position.set(x, 0, z); cc.root.rotation.y = c === 0xe8e4d8 ? Math.PI / 2 : 0; scene.add(cc.root); box('parked', x, z, c === 0xe8e4d8 ? 1.0 : 2.7, c === 0xe8e4d8 ? 2.7 : 1.0); }
  return { foams, update(t) { foams.forEach((f, i) => { const k = ((t * 0.12 + i / 4) % 1); f.position.z = SEA_Z - 18 + k * 18.5; f.material.opacity = 0.85 * Math.sin(Math.PI * k); }); } };
}

// ---------------- the whale: a sperm whale on its side ----------------
export function makeWhale() {
  const r = rnd(9); const g = new THREE.Group();
  const skin = canvasTex(1024, 256, (x, w, h) => { x.fillStyle = '#5e5048'; x.fillRect(0, 0, w, h); for (let k = 0; k < 1400; k++) { x.strokeStyle = `rgba(${28 + r() * 20},${24 + r() * 18},${22 + r() * 16},0.5)`; x.lineWidth = 2; const y = r() * h, x0 = r() * w; x.beginPath(); x.moveTo(x0, y); x.quadraticCurveTo(x0 + 20, y + (r() - 0.5) * 12, x0 + 40 + r() * 40, y + (r() - 0.5) * 10); x.stroke(); }
    for (let k = 0; k < 160; k++) { x.fillStyle = `rgba(214,206,196,${0.1 + r() * 0.22})`; x.beginPath(); x.ellipse(r() * w, r() * h, 6 + r() * 26, 2 + r() * 5, r(), 0, 7); x.fill(); } });
  const mat = std(0xffffff, { map: skin, roughness: 0.55, metalness: 0.0, envMapIntensity: 0.25 });
  // profile along the body: blunt square head (0..0.33), body, tail stock
  const prof = []; const N = 40; for (let i = 0; i <= N; i++) { const u = i / N; let rad; if (u < 0.025) rad = 1.2 + 14 * u; else if (u < 0.36) rad = 1.55 + 0.04 * Math.sin(u * 9); else if (u < 0.9) rad = 1.55 * (1 - Math.pow((u - 0.36) / 0.54, 1.5) * 0.84); else rad = 0.25 - (u - 0.9) * 1.6;
    prof.push(new THREE.Vector2(Math.max(0.02, rad), (u - 0.5) * WHALE.len * 0.94)); }
  prof.unshift(new THREE.Vector2(0.001, prof[0].y)); prof.push(new THREE.Vector2(0.001, prof[prof.length - 1].y));
  const bodyG = new THREE.LatheGeometry(prof, 40); bodyG.rotateZ(Math.PI / 2);  // along x; head at +x
  // the sperm whale's head is a block: square the cross-section toward the front (superellipse, n = 4)
  { const p = bodyG.attributes.position; for (let k = 0; k < p.count; k++) { const x = p.getX(k), y = p.getY(k), z = p.getZ(k); const w = Math.min(1, Math.max(0, (x - WHALE.len * 0.08) / (WHALE.len * 0.12)));
      if (w <= 0) continue; const a = Math.atan2(z, y); const n = 4; const f = 1 / Math.pow(Math.pow(Math.abs(Math.cos(a)), n) + Math.pow(Math.abs(Math.sin(a)), n), 1 / n); const k2 = 1 + (f - 1) * w * 0.85; p.setY(k, y * k2); p.setZ(k, z * k2); }
    bodyG.computeVertexNormals(); }
  const body = new THREE.Mesh(bodyG, mat); body.scale.set(1, 0.86, 1.0); body.position.y = 1.15; body.rotation.x = 0.35; g.add(body);
  // flukes, flipper, jaw, eye
  const fl = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), mat); fl.scale.set(0.7, 0.12, 1.9); fl.position.set(-WHALE.len * 0.49, 0.35, 0.2); fl.rotation.set(0.3, 0, 0.15); g.add(fl);
  const flip = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), mat); flip.scale.set(0.8, 0.1, 0.35); flip.position.set(WHALE.len * 0.17, 2.32, -0.4); flip.rotation.set(0.2, 0.4, 0.3); g.add(flip);
  const jaw = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 3.6, 10), std(0xb8b2aa, { roughness: 0.6 })); jaw.rotation.z = Math.PI / 2; jaw.position.set(WHALE.len * 0.3, 0.45, 1.35); g.add(jaw);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), std(0x111111, { roughness: 0.2 })); eye.position.set(WHALE.len * 0.2, 0.9, 1.5); g.add(eye);
  sh(g);
  // after the blast: a crater over the middle (fragments inside the sphere are discarded), raw flesh inside
  const crater = { c: new THREE.Vector3(0.6, 2.9, 0.2), r: 0 };
  const cut = (m) => { m.onBeforeCompile = (s) => { s.uniforms.uC = { value: crater.c }; s.uniforms.uR = { get value() { return crater.r; } };
      s.vertexShader = 'varying vec3 vWp;\n' + s.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      s.fragmentShader = 'uniform vec3 uC; uniform float uR; varying vec3 vWp;\n' + s.fragmentShader.replace('void main() {', 'void main() { float nz = sin(vWp.x * 3.1) * sin(vWp.z * 4.3 + vWp.y * 2.0) * 0.18 + sin(vWp.x * 9.0 + vWp.y * 7.0) * 0.07; if (uR > 0.0 && distance(vWp, uC) < uR * (1.0 + nz)) discard;'); };
    m.customProgramCacheKey = () => 'whale-crater'; };
  cut(mat);
  const fleshM = std(0x9a4a48, { roughness: 0.55, side: THREE.BackSide, map: canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#7e4a42'; x.fillRect(0, 0, w, h); for (let k = 0; k < 300; k++) { x.fillStyle = `rgba(${200 + r() * 40},${170 + r() * 40},${140 + r() * 30},0.45)`; x.beginPath(); x.arc(r() * w, r() * h, 3 + r() * 10, 0, 7); x.fill(); } }) });
  // the flesh bowl is the inside of the crater sphere, kept only within the whale's body (an ellipsoid test)
  fleshM.onBeforeCompile = (s) => { s.vertexShader = 'varying vec3 vWp;\n' + s.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    s.fragmentShader = 'varying vec3 vWp;\n' + s.fragmentShader.replace('void main() {', 'void main() { vec3 q = (vWp - vec3(0.0, 1.18, 0.0)) / vec3(5.4, 1.32, 1.6); if (dot(q, q) > 1.0) discard;'); };
  fleshM.customProgramCacheKey = () => 'whale-flesh';
  const flesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), fleshM); flesh.position.copy(crater.c); flesh.visible = false; g.add(flesh);
  g.position.set(WHALE.x, 0, WHALE.z);
  box('whale', WHALE.x, WHALE.z, WHALE.len / 2 + 0.3, WHALE.w / 2 + 0.2);
  return { root: g, setCrater(rad) { crater.r = rad; flesh.visible = rad > 0; flesh.scale.setScalar(rad); } };
}

// ---------------- vehicles ----------------
const wheel = (R, w) => { const gg = new THREE.Group(); const t = new THREE.Mesh(new THREE.CylinderGeometry(R, R, w, 20), std(0x1c1c1e, { roughness: 0.9 })); t.rotation.x = Math.PI / 2; gg.add(t);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.5, R * 0.5, w + 0.02, 12), std(0xc8c8c0, { metalness: 0.6, roughness: 0.3 })); hub.rotation.x = Math.PI / 2; gg.add(hub);
  const sp = new THREE.Mesh(new THREE.BoxGeometry(R * 0.9, 0.05, w + 0.04), std(0x8a8a86)); gg.add(sp); return gg; };
export function makeTruck() {
  const g = new THREE.Group(); const orange = std(0xe2731c, { roughness: 0.55 }), dark = std(0x2a2a2a), glass = std(0x9fc0d0, { roughness: 0.1, metalness: 0.3 });
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.5, 2.3), orange); cab.position.set(1.9, 1.9, 0); g.add(cab);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 2.2), orange); hood.position.set(3.6, 1.6, 0); g.add(hood);
  const grill = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 1.6), std(0xb8b8b0, { metalness: 0.6, roughness: 0.3 })); grill.position.set(4.42, 1.55, 0); g.add(grill);
  const ws = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 2.0), glass); ws.position.set(2.86, 2.25, 0); g.add(ws);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.3, 1.8), dark); frame.position.set(0.9, 0.95, 0); g.add(frame);
  const bed = new THREE.Group(); const bedM = std(0xc8641a, { roughness: 0.6 }); const fl = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 2.3), bedM); fl.position.y = 0; bed.add(fl);
  for (const [x, z, sx, sz] of [[0, 1.12, 3.6, 0.08], [0, -1.12, 3.6, 0.08], [1.78, 0, 0.08, 2.3]]) { const s = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.8, sz), bedM); s.position.set(x, 0.42, z); bed.add(s); }
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 2.3), bedM); tail.position.set(-1.8, 0.42, 0); bed.add(tail); bed.position.set(-0.9, 1.2, 0); g.add(bed);
  // the passenger door on the right (+z) side swings open on a front hinge
  const doorP = new THREE.Group(); doorP.position.set(2.85, 1.25, 1.16); const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.3, 0.06), orange); door.position.set(-0.6, 0.65, 0); doorP.add(door);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.07), glass); win.position.set(-0.6, 1.0, 0); doorP.add(win); g.add(doorP);
  const wheels = []; for (const [x, z] of [[3.5, 1.05], [3.5, -1.05], [-1.4, 1.05], [-1.4, -1.05], [-2.4, 1.05], [-2.4, -1.05]]) { const w = wheel(0.55, 0.38); w.position.set(x, 0.55, z); g.add(w); wheels.push(w); }
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12), std(0xfff2c0, { emissive: 0x403010 })); lamp.rotation.z = Math.PI / 2; lamp.position.set(4.46, 1.75, 0.75); g.add(lamp); const l2 = lamp.clone(); l2.position.z = -0.75; g.add(l2);
  const bcn = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.18, 10), std(0xf2a020, { emissive: 0x804000 })); bcn.position.set(1.9, 2.75, 0); g.add(bcn);
  sh(g); const col = box('truck', TRUCK.x + 0.9, TRUCK.z, 3.7, 1.25);
  return { root: g, wheels, doorP, col, R: 0.55 };
}
export function makeCar(color = 0x3aa6a0) {
  const g = new THREE.Group(); const paint = std(color, { roughness: 0.3, metalness: 0.25 }), chrome = std(0xdedede, { metalness: 0.85, roughness: 0.2 }), glassM = std(0x2e4652, { roughness: 0.05, metalness: 0.5, transparent: true, opacity: 0.92 });
  const low = new THREE.Mesh(new THREE.BoxGeometry(CAR.len, 0.62, CAR.w), paint); low.position.y = 0.62; g.add(low);
  for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, CAR.w + 0.05), chrome); b.position.set(s * (CAR.len / 2 + 0.05), 0.42, 0); g.add(b); }
  const fin = new THREE.Mesh(new THREE.BoxGeometry(CAR.len * 0.98, 0.04, CAR.w + 0.02), chrome); fin.position.y = 0.94; g.add(fin);
  // the greenhouse: pillars, glass and the roof, built so the roof can be pushed down (crush 0..0.4 m)
  const cabin = new THREE.Group(); cabin.position.set(-0.15, 0.95, 0); g.add(cabin);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.08, 1.6), paint); roof.position.y = CAR.roofY - 0.95; cabin.add(roof);
  const pillars = []; for (const [x, z] of [[1.05, 0.75], [1.05, -0.75], [-1.1, 0.75], [-1.1, -0.75], [0, 0.78], [0, -0.78]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1, 0.08), paint); p.position.set(x, 0, z); cabin.add(p); pillars.push(p); }
  const glass = []; for (const [x, z, sx, sz] of [[1.08, 0, 0.04, 1.5], [-1.12, 0, 0.04, 1.5], [0.52, 0.79, 1.0, 0.03], [-0.55, 0.79, 1.0, 0.03], [0.52, -0.79, 1.0, 0.03], [-0.55, -0.79, 1.0, 0.03]]) { const gl = new THREE.Mesh(new THREE.BoxGeometry(sx, 1, sz), glassM); gl.position.set(x, 0, z); cabin.add(gl); glass.push(gl); }
  // 1970 sedan details: roof overhang, grille, headlights, red tail lights, chrome side strip, wheel arches
  const ov = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.05, 1.7), paint); ov.position.y = CAR.roofY - 0.95 + 0.04; cabin.add(ov); roof.userData.ov = ov;
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 1.5), std(0x2a2a2a, { metalness: 0.6, roughness: 0.4 })); grille.position.set(CAR.len / 2 + 0.01, 0.68, 0); g.add(grille);
  for (const z of [0.62, -0.62]) { const tl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.34), std(0xc8261e, { emissive: 0x300000 })); tl.position.set(-CAR.len / 2 - 0.01, 0.74, z); g.add(tl); }
  for (const s of [-1, 1]) { const strip = new THREE.Mesh(new THREE.BoxGeometry(CAR.len * 0.92, 0.03, 0.02), chrome); strip.position.set(0, 0.72, s * (CAR.w / 2 + 0.005)); g.add(strip); }
  for (const [x, z] of [[1.7, 1], [1.7, -1], [-1.7, 1], [-1.7, -1]]) { const arch = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.04, 20, 1, false, 0, Math.PI), std(0x1a1a1a)); arch.rotation.set(Math.PI / 2, 0, Math.PI / 2); arch.position.set(x, 0.4, z * (CAR.w / 2 + 0.006)); g.add(arch); }
  const wheels = []; for (const [x, z] of [[1.7, 0.92], [1.7, -0.92], [-1.7, 0.92], [-1.7, -0.92]]) { const w = wheel(0.36, 0.25); w.position.set(x, 0.36, z); g.add(w); wheels.push(w); }
  const lights = []; for (const z of [0.68, -0.68]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 12), std(0xfff8e0, { emissive: 0x302820 })); l.rotation.z = Math.PI / 2; l.position.set(CAR.len / 2 + 0.01, 0.72, z); g.add(l); lights.push(l); }
  // door on the +z side (the owner's side in the lot), hinge at the front
  const doorP = new THREE.Group(); doorP.position.set(0.95, 0.35, CAR.w / 2 + 0.01); const door = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.6, 0.04), paint); door.position.set(-0.62, 0.3, 0); doorP.add(door); g.add(doorP);
  sh(g);
  function crush(c) { // c = metres the roof went down; the glass between roof and beltline is gone once it bends
    const top = CAR.roofY - 0.95 - c; roof.position.y = top; roof.rotation.z = -c * 0.25; const ov = roof.userData.ov; if (ov) { ov.position.y = top + 0.04; ov.rotation.z = roof.rotation.z; } const hgt = Math.max(0.05, top - 0.0);
    for (const p of pillars) { p.scale.y = hgt; p.position.y = hgt / 2; p.rotation.z = c * 0.4 * Math.sign(p.position.x || 1); }
    for (const gl of glass) { gl.scale.y = hgt * 0.92; gl.position.y = hgt / 2; gl.visible = c < 0.02; } }
  crush(0);
  return { root: g, wheels, doorP, crush, glassM };
}
export function makeCrate() {
  const g = new THREE.Group(); const wood = std(0xb08a58, { roughness: 0.85 }); const b = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.32, 0.36), wood); g.add(b);
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.1, 0.37), std(0xb8332a, { roughness: 0.7 })); g.add(band);
  for (const s of [-1, 1]) { const sl = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.33, 0.37), std(0x8a6a40)); sl.position.x = s * 0.2; g.add(sl); }
  return sh(g);
}
export const CRATE = { w: 0.56, h: 0.32, d: 0.36 };
export function makePlunger() {
  const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.26), std(0x6a4a2a, { roughness: 0.8 })); b.position.y = 0.18; g.add(b);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 8), std(0xb0b0b0, { metalness: 0.7, roughness: 0.3 })); rod.position.y = 0.36 + 0.22; g.add(rod);
  const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 8), std(0x2a2a2a)); tb.rotation.x = Math.PI / 2; tb.position.y = 0.36 + 0.45; g.add(tb);
  const handle = new THREE.Group(); handle.add(rod, tb); g.add(handle);
  for (const s of [-1, 1]) { const tm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.05, 8), std(0xd8b040, { metalness: 0.6 })); tm.position.set(0.1 * s, 0.38, 0.1); g.add(tm); }
  sh(g); g.position.set(PLUNGER[0], 0, PLUNGER[1]); box('plunger', PLUNGER[0], PLUNGER[1], 0.2, 0.16);
  return { root: g, handle, set(push) { handle.position.y = -0.3 * push; }, gripY: () => 0.36 + 0.45 + handle.position.y };
}
export function makeDozer() {
  const g = new THREE.Group(); const y = std(0xe8b81c, { roughness: 0.5 }), dk = std(0x2a2a28, { roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.3, 2.2), y); body.position.set(0, 1.35, 0); g.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.2, 1.6), y); cab.position.set(-0.7, 2.6, 0); g.add(cab);
  const roofC = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 1.8), y); roofC.position.set(-0.7, 3.25, 0); g.add(roofC);
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.0, 8), dk); stack.position.set(0.9, 2.4, 0.5); g.add(stack);
  for (const s of [-1, 1]) { const tr = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.8, 0.55), dk); tr.position.set(0, 0.4, s * 1.2); g.add(tr); }
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.2, 3.4), std(0xd0a018, { roughness: 0.6 })); blade.position.set(2.4, 0.6, 0); g.add(blade);
  for (const s of [-1, 1]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.15, 0.15), dk); arm.position.set(1.8, 0.7, s * 1.0); g.add(arm); }
  sh(g); return { root: g, bladeX: 2.53 };
}
// a reporter's film camera on a tripod
export function makeTripod() {
  const g = new THREE.Group(); const m = std(0x2a2a2a); for (let i = 0; i < 3; i++) { const a = i * 2.1; const l = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.45, 6), m); l.position.set(Math.sin(a) * 0.22, 0.7, Math.cos(a) * 0.22); l.rotation.set(Math.cos(a) * 0.3, 0, -Math.sin(a) * 0.3); g.add(l); }
  const cam = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.16), std(0x3a3a3e)); cam.position.y = 1.5; g.add(cam); const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.18, 12), std(0x111111, { roughness: 0.2 })); lens.rotation.z = Math.PI / 2; lens.position.set(-0.24, 1.5, 0); g.add(lens);
  for (const s of [-1, 1]) { const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 16), m); reel.rotation.x = Math.PI / 2; reel.position.set(s * 0.09, 1.71, 0); g.add(reel); }
  return sh(g);
}
// a blubber lump: an irregular icosphere, grey skin on one side, pink fat on the other
export function blubberGeo(seed) { const r = rnd(seed); const gg = new THREE.IcosahedronGeometry(1, 1); const p = gg.attributes.position; const cols = [];
  for (let k = 0; k < p.count; k++) { const v = V(p.getX(k), p.getY(k), p.getZ(k)); const s = 0.75 + r() * 0.45; p.setXYZ(k, v.x * s * 1.15, v.y * s * 0.8, v.z * s); const skin = v.y > 0.25; const c = skin ? new THREE.Color(0x4a4a50) : new THREE.Color().setHSL(0.02, 0.45, 0.62 + r() * 0.1); cols.push(c.r, c.g, c.b); }
  gg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); gg.computeVertexNormals(); return gg; }
export const blubberMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, flatShading: true });
