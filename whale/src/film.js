// The Exploding Whale (Oregon, 1970) — animation3d style, Thai word-pop captions, no voice. Every frame is a pure function of t.
// Physical truth: the blubber pieces come from a rigid-body bake (sim.json); walkers plant their feet in the world
// (gait.js); every used object keeps its working room (colliders in sets.js, checked by window.CLEAR).
import * as THREE from './three.module.js';
import { makePost } from './post.js';
import { makeSky, makeEnv, canvasTex } from './world.js';
import { makeBeach, makeWhale, makeTruck, makeCar, makeCrate, CRATE, makePlunger, makeDozer, makeTripod, blubberGeo, blubberMat, COLLIDERS, duneH } from './sets.js';
import { makeBoard, drawPerson, drawGull } from './stick.js';
import { makeWalker } from './gait.js';
import { makeCaptions, loadFonts, wordTimes } from './captions.js';
import { SHOTS, DUR, FPS, T } from './shots.js';
import { WHALE, CAR, TRUCK, PLUNGER, SPECT, REPORTER, CROWD, G } from './layout.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x)); const mix = (a, b, u) => a + (b - a) * u;
const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
const ease = (u) => sstep(0, 1, u);
function kf(keys, t) { if (t <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) { const [a, va] = keys[i - 1], [b, vb] = keys[i]; const u = ease((t - a) / (b - a)); return Array.isArray(va) ? va.map((x, j) => mix(x, vb[j], u)) : mix(va, vb, u); } return keys[keys.length - 1][1]; }
const VA = (a) => V(a[0], a[1], a[2]);
const W = innerWidth, H = innerHeight;

await loadFonts('./fonts/');
const SIM = await (await fetch('./src/sim.json')).json();
const canvas = document.createElement('canvas'); document.body.appendChild(canvas);
const POST = makePost(canvas, W, H);
const cam = new THREE.PerspectiveCamera(40, W / H, 0.1, 3000);
const CAP = makeCaptions(W, H);

// ================= the world =================
const S = new THREE.Scene(); const SKY = makeSky(S); const sunDir = V(-0.32, 0.3, -0.9).normalize(); SKY.u.uSun.value.copy(sunDir); SKY.u.uTop.value.setRGB(0.18, 0.42, 0.85); SKY.u.uHor.value.setRGB(0.9, 0.84, 0.74);
const ENV = makeEnv(POST.renderer, SKY.u); S.environment = ENV; S.environmentIntensity = 0.75; S.fog = new THREE.Fog(0xd8d4c4, 220, 2600);
const sun = new THREE.DirectionalLight(0xffe2b8, 3.0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.05; Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 200 }); S.add(sun, sun.target);
S.add(new THREE.HemisphereLight(0xcfe0ff, 0xa08a6a, 0.85));
function sunAt(p) { sun.target.position.copy(p); sun.position.copy(p).addScaledVector(sunDir, 80); sun.target.updateMatrixWorld(); }
const BEACH = makeBeach(S);
const WH = makeWhale(); S.add(WH.root);
const TR = makeTruck(); TR.root.position.set(TRUCK.x, 0, TRUCK.z); S.add(TR.root);
const NEWCAR = makeCar(0x37a7a0); NEWCAR.root.position.set(CAR.x, 0, CAR.z); S.add(NEWCAR.root);
const carCol = { name: 'car', x0: CAR.x - CAR.len / 2 - 0.1, z0: CAR.z - CAR.w / 2 - 0.1, x1: CAR.x + CAR.len / 2 + 0.1, z1: CAR.z + CAR.w / 2 + 0.1, on: true }; COLLIDERS.push(carCol);
const PL = makePlunger(); S.add(PL.root);
const TRI = makeTripod(); TRI.position.set(REPORTER[0] - 0.75, 0, REPORTER[1]); S.add(TRI); COLLIDERS.push({ name: 'tripod', x0: REPORTER[0] - 1.0, z0: REPORTER[1] - 0.25, x1: REPORTER[0] - 0.5, z1: REPORTER[1] + 0.25, on: true });
const DZ = makeDozer(); DZ.root.rotation.y = Math.PI / 2; S.add(DZ.root); const dozerCol = { name: 'dozer', x0: 0, z0: 0, x1: 0, z1: 0, on: false }; COLLIDERS.push(dozerCol);
// the detonator wire, lying on the sand from the plunger to the whale
{ const pts = []; for (let i = 0; i <= 60; i++) { const u = i / 60; pts.push(V(mix(PLUNGER[0] - 0.15, WHALE.x + 3, u), 0.02, mix(PLUNGER[1], 2.4, u) + Math.sin(u * 40) * 0.4 * (1 - Math.abs(u - 0.5) * 2))); }
  const wire = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 600, 0.012, 4), new THREE.MeshStandardMaterial({ color: 0x8a2a1a })); S.add(wire); }
// dynamite cases: 20 in two rows against the whale's landward side (working room: a gap of 0.25 m to the skin)
const CR = []; const crateAt = (k) => V(-2.5 + (k % 10) * 0.62, CRATE.h / 2 + (k >= 10 ? CRATE.h : 0), 1.98); for (let k = 0; k < 21; k++) { const c = makeCrate(); c.visible = false; S.add(c); CR.push(c); }
const crateCol = { name: 'crates', x0: -2.8, z0: 1.78, x1: 3.5, z1: 2.18, on: false }; COLLIDERS.push(crateCol);
// sand berm the dozer pushes
const berm = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xcdb68a, roughness: 1 })); berm.receiveShadow = berm.castShadow = true; S.add(berm);

// ================= physics replay =================
const PIECES = SIM.bodies.map((b, i) => { const m = new THREE.Mesh(blubberGeo(100 + i), blubberMat); m.scale.setScalar(b.r); m.castShadow = true; S.add(m); return { ...b, mesh: m }; });
const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
function sample(arrP, arrQ, f, out, q) { const n = arrP.length / 3; f = clamp(f, 0, n - 1); const i = Math.min(n - 2, Math.floor(f)), u = f - i;
  out.set(mix(arrP[i * 3], arrP[i * 3 + 3], u), mix(arrP[i * 3 + 1], arrP[i * 3 + 4], u), mix(arrP[i * 3 + 2], arrP[i * 3 + 5], u));
  qa.set(arrQ[i * 4], arrQ[i * 4 + 1], arrQ[i * 4 + 2], arrQ[i * 4 + 3]); qb.set(arrQ[i * 4 + 4], arrQ[i * 4 + 5], arrQ[i * 4 + 6], arrQ[i * 4 + 7]); q.slerpQuaternions(qa, qb, u); }
function piecesAt(ts) { const on = ts >= SIM.t0; for (const [i, p] of PIECES.entries()) { p.mesh.visible = on; if (!on) continue;
    if (i === 0 && ts >= SIM.hi.t0 && ts <= SIM.hi.t0 + 2.4) sample(SIM.hi.p, SIM.hi.q, (ts - SIM.hi.t0) * SIM.hi.hz, p.mesh.position, p.mesh.quaternion);
    else sample(p.p, p.q, (ts - SIM.t0) * SIM.fps, p.mesh.position, p.mesh.quaternion); } }
function roofAt(ts) { if (ts < SIM.t0) return 0; if (ts >= SIM.hi.t0 && ts <= SIM.hi.t0 + 2.4) { const f = (ts - SIM.hi.t0) * SIM.hi.hz, i = Math.min(SIM.hi.roof.length - 2, Math.floor(f)); return mix(SIM.hi.roof[i], SIM.hi.roof[i + 1], f - i); } const f = (ts - SIM.t0) * SIM.fps, i = Math.min(SIM.roof.length - 2, Math.floor(f)); return mix(SIM.roof[i], SIM.roof[i + 1], f - i); }
// landing instants (first touch of sand or roof), for splashes
const LAND = PIECES.map((p, i) => { const n = p.p.length / 3; for (let f = 1; f < n; f++) { const y = p.p[f * 3 + 1]; const lim = i === 0 ? CAR.roofY + 0.05 + p.r : p.r + 0.04; if (y <= lim) return { t: SIM.t0 + f / SIM.fps, at: V(p.p[f * 3], 0, p.p[f * 3 + 2]), r: p.r, roof: i === 0 }; } return null; });

// ================= particles (closed-form ballistics with air drag) =================
const rnd = (s) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
// linear drag k: x(t) = x0 + v0 (1 - e^-kt) / k ; y adds gravity: y = y0 + (v0y + g/k)(1 - e^-kt)/k - g t / k
function ballistic(out, p0, v0, k, t) { const e = (1 - Math.exp(-k * t)) / k; out.set(p0.x + v0.x * e, p0.y + (v0.y + G / k) * e - G * t / k, p0.z + v0.z * e); return out; }
const clumpG = new THREE.IcosahedronGeometry(1, 0); const sandM = new THREE.MeshStandardMaterial({ color: 0x9a7e58, roughness: 1, flatShading: true });
const NCOL = 2600; const column = new THREE.InstancedMesh(clumpG, sandM, NCOL); column.frustumCulled = false; S.add(column);
const colP = []; { const r = rnd(31); for (let i = 0; i < NCOL; i++) { const a = r() * 6.283, sp = 1 + r() * 7; const vy = 13 + r() * 13; colP.push({ p0: V(WHALE.x + (r() - 0.5) * 8, 1.6 + r() * 0.8, WHALE.z + (r() - 0.5) * 2), v0: V(Math.cos(a) * sp, vy, Math.sin(a) * sp), k: 0.25 + r() * 0.35, s: 0.05 + r() * r() * 0.32, spin: r() * 6 }); } }
const smokeT = canvasTex(128, 128, (x, w, h) => { const g = x.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
const NPUFF = 150; const puffs = []; { const r = rnd(41); for (let i = 0; i < NPUFF; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeT, color: new THREE.Color().setHSL(0.08, 0.28, 0.42 + r() * 0.22), transparent: true, depthWrite: false, fog: true })); sp.visible = false; S.add(sp); const a = r() * 6.283;
  puffs.push({ sp, dir: V(Math.cos(a), 0, Math.sin(a) * 0.6), up: 2 + r() * 28, R: 1 + r() * 7, size: 4 + r() * 8, delay: r() * 0.3 }); } }
const NSPL = 16; const splash = new THREE.InstancedMesh(clumpG, sandM, LAND.length * NSPL); splash.frustumCulled = false; S.add(splash);
const splP = LAND.map((L, i) => { const r = rnd(500 + i); return Array.from({ length: NSPL }, () => { const a = r() * 6.283, s = 1 + r() * 3; return { v0: V(Math.cos(a) * s, 2 + r() * 4, Math.sin(a) * s), s: 0.03 + r() * 0.07 }; }); });
const shardM = new THREE.MeshStandardMaterial({ color: 0xcfe6f2, roughness: 0.05, metalness: 0.5, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
const NSH = 60; const shards = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.05, 0.035), shardM, NSH); shards.frustumCulled = false; S.add(shards);
const shP = []; { const r = rnd(77); for (let i = 0; i < NSH; i++) { const side = r() < 0.5 ? -1 : 1, front = r() < 0.3; const p0 = front ? V(CAR.x - 0.15 + 1.08, 1.2, CAR.z + (r() - 0.5) * 1.4) : V(CAR.x - 0.15 + (r() - 0.5) * 2.0, 1.15 + r() * 0.2, CAR.z + side * 0.8);
  shP.push({ p0, v0: front ? V(2 + r() * 3, 1 + r() * 2.5, (r() - 0.5) * 3) : V((r() - 0.5) * 2, 0.5 + r() * 2.5, side * (2 + r() * 3)), spin: V(r() * 20, r() * 20, r() * 20) }); } }
const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), ee = new THREE.Euler(), sc3 = new THREE.Vector3(), tmp = new THREE.Vector3();
function effectsAt(ts, camPos) {
  // the column of sand
  const tb = ts - T.blast; column.visible = tb > 0 && tb < 9;
  if (column.visible) colP.forEach((c, i) => { ballistic(tmp, c.p0, c.v0, c.k, tb); const down = tmp.y < 0; if (down) tmp.y = -1; ee.set(c.spin * tb, c.spin * tb * 0.7, 0); qq.setFromEuler(ee); m4.compose(tmp, qq, sc3.setScalar(down ? 0.0001 : c.s)); column.setMatrixAt(i, m4); });
  column.instanceMatrix.needsUpdate = true;
  // the dust cloud: spreads, rises, thins over ~10 s
  puffs.forEach((p) => { const l = tb - p.delay; p.sp.visible = l > 0 && l < 12; if (!p.sp.visible) return; const k = 1 - Math.exp(-l / 0.9);
    p.sp.position.set(WHALE.x + p.dir.x * p.R * k, 1 + p.up * (1 - Math.exp(-l / 1.2)) + l * 0.3, WHALE.z + p.dir.z * p.R * k); const s = p.size * (0.4 + 0.6 * k + l * 0.08); p.sp.scale.set(s, s, 1); p.sp.material.opacity = 0.9 * (1 - sstep(4, 14, l)) * sstep(0, 0.12, l); });
  // splashes where pieces land
  let n = 0; LAND.forEach((L, i) => { for (const s of splP[i]) { const l = L ? ts - L.t : -1; if (!L || l < 0 || l > 1.6) { m4.compose(tmp.set(0, -5, 0), qq.identity(), sc3.setScalar(0.0001)); }
      else { const base = L.roof ? V(L.at.x, CAR.roofY - 0.3, L.at.z) : L.at; ballistic(tmp, base, s.v0, 0.8, l); if (tmp.y < 0) tmp.y = 0.02; m4.compose(tmp, qq.identity(), sc3.setScalar(s.s)); } splash.setMatrixAt(n++, m4); } });
  splash.instanceMatrix.needsUpdate = true;
  // glass shards from the car (simple ballistics; they stop on the sand)
  const lh = SIM.hitT ? ts - SIM.hitT : -1; shards.visible = lh > 0;
  if (shards.visible) shP.forEach((s, i) => { ballistic(tmp, s.p0, s.v0, 0.5, lh); const rest = tmp.y <= 0.01; if (rest) tmp.y = 0.01; ee.set(rest ? Math.PI / 2 : s.spin.x * lh, rest ? 0 : s.spin.y * lh, rest ? i : s.spin.z * lh); qq.setFromEuler(ee); m4.compose(tmp, qq, sc3.setScalar(1)); shards.setMatrixAt(i, m4); });
  shards.instanceMatrix.needsUpdate = true;
}

// ================= cast =================
const LOOK = {
  engineer: { body: '#e8eef4', tie: '#2a4a7a', collar: true, hat: 'hardhat', hatCol: '#f6f6f2', moustache: '#4a3020' },
  worker1: { body: '#3f5f8f', buttons: '#d8d8d8', hat: 'hardhat', hatCol: '#f2b81a' },
  worker2: { body: '#5d6b3c', hat: 'hardhat', hatCol: '#f2b81a', beard: '#6a4a2a' },
  owner: { body: '#6a5440', hat: 'trilby', hatCol: '#4a3a2a', tie: '#a83a2a', collar: true },
  reporter: { body: '#3a6a4a', hat: 'cap', hatCol: '#c8312d' },
  sp: [{ body: '#c8312d', hat: 'beanie', hatCol: '#2a4a8a' }, { body: '#e3b341', hair: 'bun', hairCol: '#5a3a24', scarf: '#2a6a8a' }, { body: '#4a4a6a', hair: 'curly', hairCol: '#2a1d14' },
    { body: '#2f8a7a', hat: 'cap', hatCol: '#2a2a2a' }, { body: '#9a5aa0', hair: 'side', hairCol: '#e0c080' }, { body: '#7a4a2a', hair: 'slick', hairCol: '#1a1a1a', scarf: '#c8a02a' },
    { body: '#d86a3a', hat: 'beanie', hatCol: '#e8e4d8' }, { body: '#3a7ab8', hair: 'bun', hairCol: '#c87a3a' }],
};
const SIZE = 2.3;
const BOARDS = []; for (let i = 0; i < 16; i++) { const b = makeBoard(SIZE, i < 4 ? 1024 : 640, drawPerson); b.mesh.visible = b.shadow.visible = false; S.add(b.mesh, b.shadow); BOARDS.push(b); }
const GULLS = []; for (let i = 0; i < 10; i++) { const b = makeBoard(1.3, 384, drawGull); b.mesh.visible = b.shadow.visible = false; S.add(b.mesh, b.shadow); GULLS.push(b); }
let nB = 0, nG = 0; const used = [];
function put(name, feet, pose, opts = {}) { const b = BOARDS[nB++]; b.mesh.visible = true; b.update(cam, feet, { t: 0, ...pose }, null, opts.ground ?? 0); used.push({ name, board: b, feet: feet.clone(), kind: 'char', pose, hands: [pose.handLW, pose.handRW].filter(Boolean), ...opts }); }
function gull(feet, pose) { const b = GULLS[nG++]; b.mesh.visible = true; b.update(cam, feet, { t: 0, ...pose }, null, pose.ground ?? feet.y); used.push({ name: 'gull', board: b, feet: feet.clone(), kind: 'gull' }); }
function hideAll() { for (const b of [...BOARDS, ...GULLS]) { b.mesh.visible = false; b.shadow.visible = false; } nB = nG = 0; used.length = 0; }
// a walker on screen: feet, body bob and the view drawing all come from the gait
function walk(name, w, t, look, extra = {}) { const s = w.at(t); put(name, s.p, { ...look, ...extra, feetW: s.feet, turn: extra.turn ?? w.view(t, cam), bob: (extra.bob ?? 0) + s.bob }); return s; }
// a standing character facing an angle (or a point) with planted feet
function stand(name, p, faceTo, look, extra = {}) { const a = Array.isArray(faceTo) ? Math.atan2(faceTo[0] - p.x, faceTo[1] - p.z) : faceTo; const w = makeWalker([[0, p.x, p.z, { face: a }], [1, p.x, p.z]]); return walk(name, w, 0.5, look, extra); }

// ================= camera =================
function camSet(p, tg, fov = 40, roll = 0) { cam.position.copy(p); cam.up.set(Math.sin(roll), Math.cos(roll), 0); cam.lookAt(tg); cam.fov = fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld(true); }
const _v = new THREE.Vector3();
function toScreen(p) { _v.copy(p).project(cam); return [(_v.x * 0.5 + 0.5) * W, (1 - (_v.y * 0.5 + 0.5)) * H, _v.z < 1]; }
function boxOf(pts) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, f = true; for (const p of pts) { const [x, y, ok] = toScreen(p); f = f && ok; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return f ? [x0, y0, x1, y1] : null; }
function charBox(u) { const right = V(1, 0, 0).applyQuaternion(cam.quaternion); right.y = 0; right.normalize(); const k = u.board.sizeM / SIZE; const w = u.kind === 'gull' ? 0.3 : 0.34 * k, h = u.kind === 'gull' ? 0.45 : 1.68 * k;
  const top = u.feet.clone().add(V(0, h, 0)); return boxOf([u.feet.clone().addScaledVector(right, w), u.feet.clone().addScaledVector(right, -w), top.clone().addScaledVector(right, w), top.clone().addScaledVector(right, -w)]); }
function objBox(o) { o.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(o); if (b.isEmpty()) return null; const c = []; for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) c.push(V(x, y, z)); return { box: boxOf(c), centre: b.getCenter(V(0, 0, 0)) }; }

// ================= helpers that set world state =================
const LOCAL = [V(-1.6, 0, 4.4), V(-4.2, 0, 3.7)];
let tsNow = 0;
function worldAt(t, o = {}) {
  tsNow = o.ts ?? t; BEACH.update(t);
  const after = tsNow >= T.blast; WH.setCrater(after ? 2.0 : 0);
  // crates: how many are placed by now (the crates shot places #17 and #18; all 20 by the gulls shot); none after the blast
  const placed = after ? 0 : t < SHOTS.at('crates').t0 ? 0 : t < SHOTS.at('gulls').t0 ? (t < SHOTS.at('crates').t0 + 3.6 ? 16 : 17) : 20;
  CR.forEach((c, k) => { c.visible = k < placed && k < 20; if (c.visible) { c.position.copy(crateAt(k)); c.rotation.set(0, 0, 0); } }); crateCol.on = placed > 0; crateCol.x1 = -2.5 + Math.min(10, placed) * 0.62 + 0.0;
  PL.set(0); NEWCAR.crush(roofAt(tsNow)); NEWCAR.doorP.rotation.y = 0; TR.doorP.rotation.y = 0;
  piecesAt(tsNow); effectsAt(tsNow); berm.visible = false; DZ.root.visible = false; dozerCol.on = false;
  TR.root.position.set(TRUCK.x, 0, TRUCK.z); TR.root.visible = t >= SHOTS.at('truck').t0 && !(t > SHOTS.at('retreat').t0 && t < SHOTS.at('after').t0); TR.col.on = TR.root.visible;
}

// ================= staging =================
const SP = SPECT.map(([x, z]) => V(x, 0, z));
const WALK = {};
// 3: the truck brakes to a stop (v0 8 m/s, constant deceleration 3.5 m/s^2), the driver's door swings open, the engineer hops down
const TRK = { t0: SHOTS.at('truck').t0, v0: 8, a: 3.5, brake: 0.4 };
TRK.stopL = TRK.brake + TRK.v0 / TRK.a; TRK.dist = TRK.v0 * TRK.brake + TRK.v0 * TRK.v0 / (2 * TRK.a);
function truckX(l) { const d = l < TRK.brake ? TRK.v0 * l : l < TRK.stopL ? TRK.v0 * TRK.brake + TRK.v0 * (l - TRK.brake) - 0.5 * TRK.a * (l - TRK.brake) ** 2 : TRK.dist; return TRUCK.x - TRK.dist + d; }
{ const b0 = SHOTS.at('boulder').t0; WALK.eng4 = makeWalker([[b0, 7.8, 6.6], [b0 + 1.6, 6.0, 3.6, { face: [5.5, 0] }], [b0 + 1.9, 6.0, 3.6], [b0 + 2.0, 6.0, 3.6, { face: [6.4, 9.5] }], [99, 6.0, 3.6]]); }
{ const t0 = SHOTS.at('crates').t0; WALK.w1 = makeWalker([[t0, 4.7, 4.0], [t0 + 2.5, 1.22, 2.5, { face: [1.22, 0] }], [99, 1.22, 2.5]]); WALK.w2 = makeWalker([[t0, 2.0, 2.65, { face: [2, 0] }], [t0 + 0.2, 2.0, 2.65], [t0 + 0.4, 2.0, 2.65, { face: [2.6, 6] }], [t0 + 0.5, 2.0, 2.65], [t0 + 1.9, 2.6, 5.4, { via: true }], [t0 + 4.0, 6.6, 6.4], [99, 6.6, 6.4]]); }
{ const t0 = SHOTS.at('retreat').t0; WALK.ownerC = makeWalker([[t0, 393.0, 10.6], [t0 + 3.2, 403.6, 10.9, { face: Math.PI * 1.5 }], [99, 403.6, 10.9]]); WALK.owner = makeWalker([[t0, 432.96, 23.25, { face: [433.4, 22.6] }], [t0 + 0.9, 432.96, 23.25], [t0 + 1.2, 432.96, 23.25, { face: Math.PI * 1.5 }], [t0 + 1.3, 432.96, 23.25], [t0 + 2.4, 429.6, 23.15, { via: true }], [t0 + 3.6, 425.3, 20.4], [99, 425.3, 20.4]]);
  WALK.crowd = SP.map((p, i) => makeWalker([[t0, p.x - 7 - (i % 3), p.z + (i % 2 ? 0.6 : -0.4)], [t0 + 3.0 + (i % 4) * 0.15, p.x, p.z, { face: Math.PI * 1.5 }], [99, p.x, p.z]])); }
// 11: when the rain starts, people run outward, each away from the nearest landing
{ const t0 = SHOTS.at('rain').t0; const c = V(CROWD.x + 0.6, 0, CROWD.z + 1.0); const dirs = [[-1, -0.6], [-0.2, -1], [0.3, 1], [1, -0.5], [-0.9, 0.7], [0.4, 1], [1, 0.4], [-1, 0.6]];
  WALK.run = SP.map((p, i) => { const d = V(dirs[i][0], 0, dirs[i][1]).normalize(); const go = t0 + 0.35 + (i % 4) * 0.12; const e1 = p.clone().addScaledVector(d, 3.0), e2 = p.clone().addScaledVector(d, 9.5);
    return makeWalker([[t0, p.x, p.z, { face: Math.PI * 1.5 }], [go, p.x, p.z], [go + 0.15, p.x, p.z, { face: Math.atan2(d.x, d.z) }], [go + 0.25, p.x, p.z], [go + 1.1, e1.x, e1.z, { run: true, via: true }], [go + 2.9, e2.x, e2.z, { run: true }], [99, e2.x, e2.z]], { run: true }); }); }
{ const t0 = SHOTS.at('owner').t0; WALK.owner2 = makeWalker([[t0, 426.4, 18.9], [t0 + 1.0, 429.5, 19.3, { face: [428, 16] }], [99, 429.5, 19.3]]); }
{ const t0 = SHOTS.at('after').t0; WALK.eng14 = makeWalker([[t0, 10.2, 7.2], [t0 + 2.3, 4.2, 4.3, { face: [2, 0] }], [99, 4.2, 4.3]]); WALK.w14a = makeWalker([[t0 + 0.3, 11.6, 6.9], [t0 + 2.8, 6.6, 5.3, { face: [2, 0] }], [99, 6.6, 5.3]]); WALK.w14b = makeWalker([[t0 + 0.5, 12.0, 8.0], [t0 + 3.0, 7.3, 6.6, { face: [2, 0] }], [99, 7.3, 6.6]]); }

const thought = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#ffffff'; x.strokeStyle = '#2a1d1d'; x.lineWidth = 12; for (const [cx, cy, r] of [[150, 450, 22], [200, 400, 34]]) { x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); x.stroke(); }
  x.beginPath(); for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283; x.ellipse(290 + Math.cos(a) * 140, 220 + Math.sin(a) * 105, 70, 60, 0, 0, 7); } x.fill(); x.beginPath(); for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283; x.moveTo(290 + Math.cos(a) * 140 + 70, 220 + Math.sin(a) * 105); x.ellipse(290 + Math.cos(a) * 140, 220 + Math.sin(a) * 105, 70, 60, 0, 0, 7); } x.stroke();
  x.beginPath(); x.ellipse(290, 220, 175, 135, 0, 0, 7); x.fill();
  x.beginPath(); x.moveTo(190, 280); x.lineTo(210, 190); x.lineTo(270, 150); x.lineTo(360, 160); x.lineTo(400, 230); x.lineTo(380, 290); x.closePath(); x.fillStyle = '#8a8a8e'; x.fill(); x.lineWidth = 10; x.stroke();
  for (const [sx] of [[260], [300], [340]]) { x.fillStyle = '#c8312d'; x.fillRect(sx - 12, 200, 24, 70); x.strokeRect(sx - 12, 200, 24, 70); x.beginPath(); x.moveTo(sx, 200); x.quadraticCurveTo(sx + 10, 180, sx + 4, 168); x.lineWidth = 5; x.stroke(); x.lineWidth = 10; }
  x.fillStyle = '#ffd23a'; x.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283, rr = i % 2 ? 14 : 30; x.lineTo(346 + Math.cos(a) * rr, 160 + Math.sin(a) * rr); } x.fill(); }), transparent: true, depthTest: false })); thought.renderOrder = 5; thought.visible = false; S.add(thought);
const fliesG = new THREE.InstancedMesh(new THREE.SphereGeometry(0.018, 6, 4), new THREE.MeshBasicMaterial({ color: 0x111111 }), 40); fliesG.visible = false; S.add(fliesG);
const stinkT = canvasTex(128, 256, (x, w, h) => { x.strokeStyle = 'rgba(120,150,60,0.9)'; x.lineWidth = 9; x.lineCap = 'round'; for (const ox of [34, 64, 94]) { x.beginPath(); for (let y = 240; y > 20; y -= 6) x.lineTo(ox + Math.sin(y * 0.06 + ox) * 12, y); x.stroke(); } });
const stink = []; for (let i = 0; i < 6; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: stinkT, transparent: true, depthWrite: false })); sp.visible = false; S.add(sp); stink.push(sp); }

const STAGE = {
  // 1. the whale on the beach; gulls on its back; two locals arrive to look
  hook(t, l, d) {
    worldAt(t); const u = l / d;
    for (let i = 0; i < 4; i++) { const gx = -3.0 + i * 2.0, peck = Math.max(0, Math.sin(t * 5 + i * 2)) ** 4; gull(V(gx, 2.42, -0.15 + (i % 2) * 0.3), { t, flip: i % 2 === 1, peck, ground: 2.4 }); }
    gull(V(6.0, 0, 3.9), { t, walk: t * 9, flip: true }); gull(V(-6.6, 0, 3.4), { t, peck: Math.max(0, Math.sin(t * 4)) ** 3 }); gull(V(9.0, 0, 6.2), { t, peck: Math.max(0, Math.sin(t * 3 + 1)) ** 3, flip: true });
    const lw = makeWalker([[0, 9.6, 7.4], [3.2, 6.6, 4.2, { face: [4, 0] }], [99, 6.6, 4.2]]); walk('local0', lw, l, LOOK.sp[0], { face: { eyes: 'wide', mouth: 'o', look: [0, -0.4] } });
    const lw2 = makeWalker([[0, 11.2, 6.8], [3.2, 8.4, 3.7, { face: [6, 0] }], [99, 8.4, 3.7]]); walk('local1', lw2, l, LOOK.sp[1], { face: { eyes: 'dot', mouth: 'line', look: [-0.3, -0.3] } });
    camSet(V(mix(15.5, 13.8, u), mix(2.6, 2.3, ease(u)), mix(10.5, 9.4, u)), V(mix(2.5, 3.0, u), 1.25, 0.6), 46); sunAt(V(2, 0, 3));
    return { exp: 1.0, sat: 1.38, bloom: 0.3, dof: 0.4, tint: [1.04, 1.0, 0.95], wide: true, heroObj: WH.root, cap: { y: 0.72 } };
  },
  // 2. the smell: stink lines, flies, one local pinches her nose, the other fans the air
  stink(t, l, d) {
    worldAt(t); const pA = V(-5.0, 0, 2.75), pB = V(-3.7, 0, 3.35);
    stand('local0', pA, [-5.0, 0], LOOK.sp[0], { face: { eyes: 'shut', mouth: 'frown', browAng: -0.4 }, handRW: pA.clone().add(V(0.05, 1.32, -0.2)), handLW: pA.clone().add(V(-0.28, 0.65, -0.12)) });
    const fan = Math.sin(l * 14) * 0.18; stand('local1', pB, [-4.3, 0], LOOK.sp[1], { face: { eyes: 'lid', mouth: 'teeth', open: 0.3, sweat: 1, browAng: -0.6 }, handRW: pB.clone().add(V(0.3 + fan, 1.4, -0.18)), handLW: pB.clone().add(V(-0.25, 0.62, -0.1)) });
    fliesG.visible = true; for (let i = 0; i < 40; i++) { const a2 = t * (3 + (i % 5)) + i; m4.makeTranslation(-4.6 + Math.cos(a2) * (0.6 + (i % 7) * 0.15), 1.5 + Math.sin(a2 * 1.7) * 0.6 + (i % 3) * 0.2, 1.4 + Math.sin(a2) * 0.5); fliesG.setMatrixAt(i, m4); } fliesG.instanceMatrix.needsUpdate = true;
    stink.forEach((sp, i) => { const k = ((l * 0.5 + i / 6) % 1); sp.visible = true; sp.position.set(-6.2 + i * 0.7, 2.2 + k * 1.6, 0.6); sp.scale.set(0.5, 1.0, 1); sp.material.opacity = Math.sin(Math.PI * k) * 0.9; });
    const u = l / d; camSet(V(mix(-9.6, -9.0, u), 1.35, mix(5.8, 5.4, u)), V(-4.4, 1.15, 2.6), 38); sunAt(V(-4, 0, 3));
    return { exp: 1.0, sat: 1.36, bloom: 0.25, dof: 0.9, tint: [1.02, 1.03, 0.95], hero: 0, cap: { y: 0.74 } };
  },
  // 3. the highway truck brakes to a stop on the sand; the door opens; the engineer hops down
  truck(t, l, d) {
    worldAt(t); const x = truckX(l); TR.root.position.set(x, 0, TRUCK.z); const dist = x - (TRUCK.x - TRK.dist); TR.wheels.forEach((w) => (w.rotation.z = -dist / TR.R));
    TR.doorP.rotation.y = 1.3 * sstep(TRK.stopL + 0.1, TRK.stopL + 0.45, l);
    let hero = null; if (l > TRK.stopL + 0.4) { const hop = clamp((l - TRK.stopL - 0.45) / 0.3, 0, 1); const y = 0.55 * (1 - hop); const tl = TRK.t0 + TRK.stopL + 0.75;
      if (hop < 1) put('engineer', V(17.45, y, 10.85), { ...LOOK.engineer, turn: 1, face: { eyes: 'dot', mouth: 'line', look: [0.3, 0] }, bob: -14 * Math.sin(Math.PI * hop), feetW: [V(17.37, y, 10.85), V(17.55, y, 10.88)] }, { ground: 0 });
      else walk('engineer', makeWalker([[tl, 17.45, 10.85, { face: [21, 14] }], [tl + 0.1, 17.45, 10.85], [tl + 0.9, 17.0, 12.15, { face: [21, 14] }], [99, 17.0, 12.15]]), t, LOOK.engineer, { face: { eyes: 'dot', mouth: 'line', look: [0.3, 0] } }); hero = 0; }
    const u = l / d; const k2 = sstep(TRK.stopL - 0.2, d, l); camSet(V(mix(26.5, 21.8, k2), mix(1.7, 1.45, k2), mix(15.5, 14.2, k2)), V(mix(x + 1.0, 17.6, k2), mix(1.7, 1.2, k2), mix(9.6, 10.6, k2)), mix(44, 40, k2)); sunAt(V(TRUCK.x, 0, TRUCK.z));
    return { exp: 1.0, sat: 1.38, bloom: 0.25, dof: 0.5, tint: [1.04, 1.0, 0.94], hero, heroObj: hero === null ? TR.root : null, cap: { y: 0.24 } };
  },
  // 4. the engineer sizes up the whale like a boulder (thought bubble: a rock and dynamite)
  boulder(t, l, d) {
    worldAt(t); const think = l > 1.9; const s = WALK.eng4.at(t);
    walk('engineer', WALK.eng4, t, LOOK.engineer, { face: { eyes: think ? 'lid' : 'dot', mouth: think ? 'smirk' : 'line', look: [-0.3, -0.2], brow: think ? 0.6 : 0 }, handRW: think ? s.p.clone().add(V(0.12, 1.12, -0.2)) : null });
    thought.visible = l > 2.1; const k = sstep(2.1, 2.4, l); thought.position.copy(s.p).add(V(0.9, 2.3 + 0.05 * Math.sin(l * 5), -0.3)); thought.scale.setScalar(1.3 * k);
    const u = l / d; camSet(V(mix(6.9, 6.5, u), mix(1.55, 1.5, u), mix(9.8, 8.6, u)), V(6.1, 1.35, 2.4), mix(42, 38, ease(u))); sunAt(V(6, 0, 3));
    return { exp: 1.0, sat: 1.36, bloom: 0.25, dof: 1.0, tint: [1.04, 1.0, 0.94], hero: 0, cap: { y: 0.76 } };
  },
  // 5. the dynamite cases: one worker carries a case and sets it on the stack, the other walks back for more
  crates(t, l, d) {
    worldAt(t); const s1 = WALK.w1.at(t); const set = sstep(2.6, 3.4, l);
    const fwd = V(Math.sin(s1.heading), 0, Math.cos(s1.heading)); const carry = s1.p.clone().addScaledVector(fwd, 0.36).add(V(0, 0.78, 0)); const dest = crateAt(16).clone(); const cp = l < 2.5 ? carry : carry.clone().lerp(dest, set);
    const c = CR[20]; c.visible = l < 3.6; c.position.copy(cp); c.rotation.y = l < 2.5 ? s1.heading + Math.PI / 2 : mix(s1.heading + Math.PI / 2, 0, set);
    const side = V(Math.cos(c.rotation.y), 0, -Math.sin(c.rotation.y)); const hl = cp.clone().addScaledVector(side, -0.3), hr = cp.clone().addScaledVector(side, 0.3);
    walk('worker1', WALK.w1, t, LOOK.worker1, { face: { eyes: 'dot', mouth: l > 3.3 ? 'smile' : 'line', look: [0, 0.3], sweat: 1 }, handLW: l < 3.5 ? hl : null, handRW: l < 3.5 ? hr : null, bob: -40 * Math.sin(Math.PI * set) });
    walk('worker2', WALK.w2, t, LOOK.worker2, { face: { eyes: 'dot', mouth: 'line' } });
    const u = l / d; camSet(V(mix(-2.6, -1.9, u), mix(1.05, 1.1, u), mix(3.6, 3.4, u)), V(mix(1.6, 1.5, u), 0.75, 2.5), 42); sunAt(V(1, 0, 3));
    return { exp: 1.0, sat: 1.38, bloom: 0.3, dof: 0.9, tint: [1.04, 1.0, 0.94], hero: 0, cap: { y: 0.7 } };
  },
  // 6. the gulls are supposed to eat the small pieces; the engineer points from them to the whale; whip-pan out
  gulls(t, l, d) {
    worldAt(t);
    for (let i = 0; i < 4; i++) gull(V(2.0 + i * 0.75, 0, 11.6 + (i % 2) * 0.6), { t, flip: i % 2 === 0, peck: Math.max(0, Math.sin(t * 3 + i * 1.7)) ** 6, shout: i === 1 && Math.sin(t * 6) > 0.6 });
    const pe = V(4.7, 0, 4.4); const toG = l < 1.5; stand('engineer', pe, toG ? [3, 12] : [3, 12], LOOK.engineer, { face: { eyes: 'dot', mouth: 'smile', look: [0, 0] }, handRW: toG ? pe.clone().add(V(0.15, 1.35, 0.45)) : pe.clone().add(V(0.42, 1.25, -0.25)) });
    const w = sstep(d - 0.35, d, l); camSet(V(3.4 + 0.2 * l, 0.42, 14.6), V(mix(4.2, 30, w * w), mix(1.0, 1.4, w), mix(4.0, 9, w)), 34); sunAt(V(4, 0, 8));
    return { exp: 1.0, sat: 1.38, bloom: 0.3, dof: 1.2, focus: 10.5, pinFocus: true, tint: [1.04, 1.0, 0.94], hero: 4, cap: { y: 0.2 } };
  },
  // 7. 400 m up the beach: the crowd backs off to safety; a man shuts the door of his brand-new car and walks to watch
  retreat(t, l, d) {
    worldAt(t); WALK.crowd.forEach((w, i) => walk(`sp${i}`, w, t, LOOK.sp[i], { face: { eyes: 'dot', mouth: i % 2 ? 'smile' : 'grin', look: [0.3, 0] } }));
    walk('owner', WALK.ownerC, t, LOOK.owner, { face: { eyes: 'happy', mouth: 'smile' } });
    const u = l / d; camSet(V(mix(411.5, 410.2, u), 1.5, mix(5.0, 5.6, u)), V(398, 1.25, 6.8), 40); sunAt(V(400, 0, 6));
    return { exp: 1.0, sat: 1.38, bloom: 0.25, dof: 0.6, tint: [1.05, 1.0, 0.93], hero: 6, cap: { y: 0.76 } };
  },
  // 8. 3:45 pm: hands on the T-handle; push
  plunger(t, l, d) {
    worldAt(t); const push = sstep(2.5, 2.62, l); PL.set(push); const g = PL.gripY(); const pe = V(PLUNGER[0] + 0.62, 0, PLUNGER[1]);
    stand('engineer', pe, Math.PI * 1.5, LOOK.engineer, { face: { eyes: l > 2.0 ? 'shut' : 'dot', mouth: l > 2.0 ? 'teeth' : 'line', open: 0.4, browAng: 0.5, sweat: l > 1.2 ? 1 : 0 },
      handLW: V(PLUNGER[0], g, PLUNGER[1] + 0.17), handRW: V(PLUNGER[0], g, PLUNGER[1] - 0.17), lean: -0.06 - 0.12 * push, bob: 30 * push });
    WALK.crowd.forEach((w, i) => walk(`sp${i}`, w, t, LOOK.sp[i], { face: { eyes: 'wide', mouth: 'o' } }));
    const u = l / d; camSet(V(mix(PLUNGER[0] - 1.2, PLUNGER[0] - 0.8, u), mix(0.55, 0.62, u), mix(PLUNGER[1] - 1.9, PLUNGER[1] - 1.5, u)), V(PLUNGER[0] + 0.45, 1.0, PLUNGER[1] + 0.05), 40); sunAt(V(395, 0, 6));
    return { exp: 1.0, sat: 1.38, bloom: 0.3, dof: 1.2, tint: [1.05, 1.0, 0.93], hero: 0, cap: { y: 0.3 } };
  },
  // 9. from behind the crowd (telephoto): the column of sand and blubber, 30 m high
  boom(t, l, d) {
    worldAt(t); const u = l / d; camSet(V(mix(112, 110, u), 3.2, mix(15, 14.5, u)), V(0, mix(10, 12.5, u), 0), mix(20, 21, u)); sunAt(V(0, 0, 0));
    return { exp: 1.02, sat: 1.32, bloom: 0.45, dof: 0, tint: [1.05, 1.0, 0.92], flash: 0.5 * (1 - sstep(0, 0.25, l)), wide: true, heroObj: WH.root, cap: { y: 0.8 } };
  },
  // 10. the crowd cheers, then looks up: what goes up must come down (tilt up into the sky)
  lookup(t, l, d) {
    worldAt(t); const up = l > 1.3;
    SP.forEach((p, i) => stand(`sp${i}`, p, Math.PI * 1.5, LOOK.sp[i], { face: up ? { eyes: 'wide', mouth: 'o', look: [0, -1], brow: 1 } : { eyes: 'happy', mouth: 'grin', blush: 1 }, handLW: !up && i % 2 ? p.clone().add(V(0, 1.62, 0.3)) : null, handRW: !up ? p.clone().add(V(0, 1.62, -0.3)) : null, bob: !up ? -12 * Math.abs(Math.sin(l * 9 + i)) : 0 }));
    put('reporter', V(REPORTER[0], 0, REPORTER[1]), { ...LOOK.reporter, turn: -2, face: { eyes: 'dot', mouth: 'line' }, handRW: V(REPORTER[0] - 0.45, 1.45, REPORTER[1]) });
    const u = l / d; camSet(V(mix(389.6, 390.8, u), 1.2, mix(8.4, 8.1, u)), V(400.5, mix(1.35, 1.6, u), 6.4), 38); sunAt(V(400, 0, 6));
    return { exp: 1.0, sat: 1.38, bloom: 0.25, dof: 0.6, tint: [1.05, 1.0, 0.93], hero: 2, cap: { y: 0.76 } };
  },
  // 11. the rain of blubber: pieces land in the gaps; everyone runs; the reporter keeps filming
  rain(t, l, d) {
    worldAt(t); WALK.run.forEach((w, i) => { const s = w.at(t); walk(`sp${i}`, w, t, LOOK.sp[i], { face: s.moving ? { eyes: 'wide', mouth: 'open', open: 1, sweat: 1 } : { eyes: 'wide', mouth: 'o', look: [0, -1] }, handLW: s.moving ? s.p.clone().add(V(0, 1.62, 0.12)) : null, handRW: s.moving ? s.p.clone().add(V(0, 1.62, -0.12)) : null }); });
    put('reporter', V(REPORTER[0], 0, REPORTER[1]), { ...LOOK.reporter, turn: 1, face: { eyes: 'lid', mouth: 'line', look: [-0.5, 0] }, handRW: V(REPORTER[0] - 0.45, 1.45, REPORTER[1]) });
    const shake = LAND.reduce((a, L) => a + (L && t - L.t > 0 && t - L.t < 0.25 ? (0.25 - (t - L.t)) * 0.12 * Math.sin((t - L.t) * 90) * L.r * 3 : 0), 0);
    const u = l / d; camSet(V(mix(400.0, 400.8, u), mix(3.4, 3.7, u) + shake, mix(19.5, 20.3, u)), V(400.3, 0.9 + shake * 0.5, 6.4), 44); sunAt(V(400, 0, 6));
    return { exp: 1.0, sat: 1.38, bloom: 0.25, dof: 0.4, tint: [1.05, 1.0, 0.93], hero: 2, cap: { y: 0.18 } };
  },
  // 12. slow motion (a speed ramp; the physics keeps its own clock): the 136 kg piece meets the new car
  car(t, l, d) {
    const ts = l < 1.6 ? 37.3 + l * 0.4 : l < 3.0 ? 37.94 + (l - 1.6) * 0.06 : 38.024 + (l - 3.0) * 0.5;
    worldAt(t, { ts }); const u = l / d; camSet(V(mix(427.4, 427.9, u), 1.15, mix(15.6, 16.0, u)), V(433.0, mix(3.2, 1.1, sstep(0.4, 2.5, l)), 21.0), 42); sunAt(V(433, 0, 21));
    return { exp: 1.0, sat: 1.38, bloom: 0.35, dof: 0.8, tint: [1.05, 1.0, 0.93], heroObj: NEWCAR.root, cap: { y: 0.24 } };
  },
  // 13. the owner, deadpan, in front of what was a brand-new car
  owner(t, l, d) {
    worldAt(t, { ts: 39 + l }); const s = WALK.owner2.at(t);
    walk('owner', WALK.owner2, t, LOOK.owner, { face: s.moving ? { eyes: 'wide', mouth: 'o' } : { eyes: l > 1.9 && l < 2.0 ? 'shut' : 'lid', mouth: 'line', sweat: l > 1.5 ? 1 : 0 } });
    const u = l / d; camSet(V(mix(427.0, 427.4, u), 1.3, mix(15.6, 16.1, u)), V(430.6, 1.15, 19.9), 40); sunAt(V(432, 0, 21));
    return { exp: 1.0, sat: 1.36, bloom: 0.3, dof: 0.9, tint: [1.04, 1.0, 0.94], hero: 0, cap: { y: 0.3 } };
  },
  // 14. back at the whale: most of it is still there, pieces all around, no gulls
  after(t, l, d) {
    worldAt(t);
    const se = walk('engineer', WALK.eng14, t, LOOK.engineer, { face: { eyes: 'lid', mouth: 'frown', sweat: 1, look: [-0.3, 0] } }); if (!se.moving) { used.pop(); nB--; walk('engineer', WALK.eng14, t, LOOK.engineer, { face: { eyes: 'lid', mouth: 'frown', sweat: 1, look: [-0.3, 0] }, handRW: se.p.clone().add(V(0.0, 1.66, 0.05 * Math.sin(l * 12))) }); }
    walk('worker1', WALK.w14a, t, LOOK.worker1, { face: { eyes: 'wide', mouth: 'o' } }); walk('worker2', WALK.w14b, t, LOOK.worker2, { face: { eyes: 'dot', mouth: 'frown' } });
    const u = l / d; camSet(V(mix(3.4, 3.9, u), mix(5.2, 4.7, u), mix(14.2, 13.4, u)), V(mix(3.0, 3.6, u), 1.2, 2.2), 42); sunAt(V(2, 0, 3));
    return { exp: 1.0, sat: 1.34, bloom: 0.3, dof: 0.5, tint: [1.05, 1.0, 0.92], hero: 0, cap: { y: 0.7 } };
  },
  // 15. the bulldozer pushes sand over what is left; crane up and away
  bury(t, l, d) {
    worldAt(t); const z = mix(9.6, 5.2, ease(clamp(l / 3.8, 0, 1))); DZ.root.visible = true; DZ.root.position.set(1.0, 0, z); dozerCol.on = true; Object.assign(dozerCol, { x0: -0.3, x1: 2.3, z0: z - 2.8, z1: z + 1.8 });
    const pushed = 9.6 - z; berm.visible = true; const bz = z - DZ.bladeX - 0.45; berm.position.set(1.0, 0, bz); berm.scale.set(1.8, 0.25 + pushed * 0.14, 0.45 + pushed * 0.12);
    stand('engineer', V(6.6, 0, 6.4), [1, 4], LOOK.engineer, { face: { eyes: 'lid', mouth: 'line' } }); stand('worker1', V(7.5, 0, 7.3), [1, 4], LOOK.worker1, { face: { eyes: 'dot', mouth: 'line' } });
    const u = ease(l / d); camSet(V(mix(9.0, 30, u), mix(2.2, 22, u), mix(13.0, 42, u)), V(mix(2.5, 4, u), mix(1.2, 0, u), mix(3.6, 2, u)), mix(42, 46, u)); sunAt(V(3, 0, 5));
    return { exp: 1.0 - 0.05 * u, sat: 1.34, bloom: 0.3, dof: 0.4, tint: [1.07, 0.98, 0.9], wide: l > 1.6, hero: 0, heroObj: l > 1.6 ? DZ.root : null, cap: { y: 0.66 } };
  },
};

// ================= frame =================
let LAST = { shot: '', subjects: [] };
function shotAt(t) { for (const s of SHOTS.list) if (t < s.t1) return s; return SHOTS.list[SHOTS.list.length - 1]; }
function clearFx() { thought.visible = false; fliesG.visible = false; stink.forEach((s) => (s.visible = false)); }
function render(t) {
  t = clamp(t, 0, DUR - 1e-4); hideAll(); clearFx();
  const s = shotAt(t); const l = t - s.t0, d = s.t1 - s.t0;
  STAGE[s.stage](t, l, d); hideAll(); clearFx();   // pass 1 settles the camera
  const o = STAGE[s.stage](t, l, d) || {};          // pass 2 places the cast against that camera
  cam.updateMatrixWorld(true);
  const subjects = used.map((u, i) => ({ id: `${u.kind}${i}`, name: u.name, kind: u.kind === 'gull' ? 'gull' : 'char', facing: 1, box: charBox(u), at: u.feet.clone().add(V(0, 1.2, 0)) }));
  if (o.heroObj) { const ob = objBox(o.heroObj); if (ob) subjects.unshift({ id: 'object', kind: 'object', box: ob.box, at: ob.centre }); }
  const hi = o.heroObj ? 0 : (o.hero ?? 0); if (subjects[hi] && o.hero !== null) subjects[hi].hero = true;
  if (o.dof > 0 && subjects[hi] && !o.pinFocus) o.focus = cam.position.distanceTo(subjects[hi].at);
  // captions: word by word, from the shot start; fade the block in the last 0.12 s before a cut
  const times = wordTimes(s.cap, s.t0); const yF = o.cap?.y ?? 0.64; const fadeOut = 1 - sstep(d - 0.12, d, l) * (s.out === 'end' ? 0 : 1);
  o.over = CAP.draw(s.cap, times, t, yF, fadeOut);
  LAST = { shot: s.stage, wide: !!o.wide, inTransition: s.out !== 'cut' && s.out !== 'end' && l > d - 0.45, caption: CAP.box(s.cap, yF), subjects: subjects.map(({ at, ...r }) => r) };
  const fade = sstep(0, 0.3, t) * (1 - sstep(DUR - 0.8, DUR - 0.05, t));
  POST.render(S, cam, { ...o, fade });
}
// clearance report for the frame just rendered: footprints vs colliders, people vs people, pieces vs people, reach of hands
function clearance() {
  const out = []; const chars = used.filter((u) => u.kind === 'char');
  for (const u of chars) { const r = 0.22, p = u.feet;
    for (const c of COLLIDERS) { if (!c.on) continue; const qx = clamp(p.x, c.x0, c.x1), qz = clamp(p.z, c.z0, c.z1); const dd = Math.hypot(p.x - qx, p.z - qz); if (dd < r) out.push(`${u.name} inside ${c.name} working room (${(r - dd).toFixed(2)} m)`); }
    for (const q of PIECES) { if (!q.mesh.visible) continue; const pp = q.mesh.position; if (pp.y < q.r + 1.7 && Math.hypot(pp.x - p.x, pp.z - p.z) < q.r + r) out.push(`${u.name} hit by a piece (${q.kind})`); }
    for (const h of u.hands) { const sh = p.clone().add(V(0, 0.92, 0)); if (sh.distanceTo(h) > 0.82) out.push(`${u.name} reaches ${sh.distanceTo(h).toFixed(2)} m (arm 0.8)`); } }
  for (let i = 0; i < chars.length; i++) for (let j = i + 1; j < chars.length; j++) { const dd = Math.hypot(chars[i].feet.x - chars[j].feet.x, chars[i].feet.z - chars[j].feet.z); if (dd < 0.44) out.push(`${chars[i].name} and ${chars[j].name} overlap (${dd.toFixed(2)} m apart)`); }
  return out;
}
window.DUR = DUR; window.FPS = FPS; window.render = render; window.SUBJECTS = (t) => { render(t); return { W, H, ...LAST, clear: clearance() }; };
window.CLEAR = (t) => { render(t); return clearance(); };
window.grabPNG = (t) => { render(t); return canvas.toDataURL('image/png').split(',')[1]; };
window.grab = (t) => { render(t); return canvas.toDataURL('image/jpeg', 0.95).split(',')[1]; };
render(0); window.READY = true;
