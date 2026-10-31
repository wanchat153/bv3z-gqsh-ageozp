// The Bank That Keeps Cheese — animation3d style, wordless. Every frame is a pure function of t.
import * as THREE from './three.module.js';
import { makePost } from './post.js';
import { makeSky, makeEnv } from './world.js';
import { makeDairy, makeStreet, makeLobby, makeVault, makeDock, makeWheel, PALE, GOLD, WHEEL } from './sets.js';
import { makeBoard, drawPerson, drawCow, turnAt } from './stick.js';
import { SHOTS, DUR, FPS, T } from './shots.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x)); const mix = (a, b, u) => a + (b - a) * u;
const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
const ease = (u) => sstep(0, 1, u);
function kf(keys, t) { if (t <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) { const [a, va] = keys[i - 1], [b, vb] = keys[i]; const u = ease((t - a) / (b - a)); return Array.isArray(va) ? va.map((x, j) => mix(x, vb[j], u)) : mix(va, vb, u); } return keys[keys.length - 1][1]; }
const VA = (a) => V(a[0], a[1], a[2]);
const W = innerWidth, H = innerHeight;
const canvas = document.createElement('canvas'); document.body.appendChild(canvas);
const POST = makePost(canvas, W, H);
const cam = new THREE.PerspectiveCamera(40, W / H, 0.05, 2000);

// ================= scenes =================
const DA = makeDairy();
const OUT = new THREE.Scene(); const SKY = makeSky(OUT); SKY.u.uSun.value.set(0.2, 0.45, -0.85).normalize(); SKY.u.uHor.value.setRGB(1.0, 0.82, 0.62); const ENV = makeEnv(POST.renderer, SKY.u); OUT.environment = ENV; OUT.environmentIntensity = 0.8; OUT.fog = new THREE.Fog(0xf0d8b0, 40, 160);
const osun = new THREE.DirectionalLight(0xffd8a0, 3.2); osun.position.set(14, 22, -30); osun.castShadow = true; osun.shadow.mapSize.set(2048, 2048); osun.shadow.bias = -0.0005; osun.shadow.normalBias = 0.04; OUT.add(osun, osun.target); OUT.add(new THREE.HemisphereLight(0xcfe0ff, 0x8a6a4a, 0.7));
const ST = makeStreet(OUT);
const LB = makeLobby(); LB.scene.environment = ENV; LB.scene.environmentIntensity = 0.5;
const VT = makeVault(); VT.scene.environment = ENV; VT.scene.environmentIntensity = 0.35;
const NI = new THREE.Scene(); NI.background = new THREE.Color(0x0a1022); NI.fog = new THREE.Fog(0x0a1022, 12, 50); NI.environment = ENV; NI.environmentIntensity = 0.12; NI.add(new THREE.HemisphereLight(0x3a5a9a, 0x101018, 0.6));
const moon = new THREE.DirectionalLight(0x8aa8ff, 0.9); moon.position.set(-8, 14, 10); moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024); Object.assign(moon.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 }); NI.add(moon, moon.target);
const DK = makeDock(NI);
DA.scene.environment = ENV; DA.scene.environmentIntensity = 0.3;

// props that travel: the maker's wheel (one per scene), the money bag is drawn in 2D
const WH = { dairy: makeWheel(PALE.clone()), out: makeWheel(PALE.clone()), lobby: makeWheel(PALE.clone()), vault: makeWheel(GOLD.clone()), vault2: makeWheel(GOLD.clone()) };
DA.scene.add(WH.dairy); LB.scene.add(WH.lobby); VT.scene.add(WH.vault, WH.vault2);
const rollG = new THREE.Group(); OUT.add(rollG); WH.out.rotation.z = Math.PI / 2; rollG.add(WH.out);

// ================= cast =================
const LOOK = {
  maker: { body: '#3f6fb5', apron: '#fbfaf5', hat: 'chef', moustache: '#5a3a24', bodyW: 104 },
  banker: { body: '#2a2f3a', hair: 'slick', hairCol: '#2a1d14', tie: '#c8312d', collar: true, face0: { eyes: 'glasses' } },
  inspector: { body: '#f4f2ea', hat: 'hardhat', hatCol: '#f2b81a', buttons: '#9aa0a8' },
  thiefA: { body: '#2a2a32', stripes: '#4a4a56', hat: 'beanie', hatCol: '#1a1a22', mask: true },
  thiefB: { body: '#3a2a2a', hat: 'beanie', hatCol: '#5a1a1a', mask: true, bodyW: 112, bodyH: 300 },
  cop: { body: '#1d2a4a', hat: 'police', hatCol: '#1d2a4a', buttons: '#e3b341', belt: '#1a1a1a' },
};
function pool(scene, n, size, px, draw = drawPerson) { const a = []; for (let i = 0; i < n; i++) { const b = makeBoard(size, px, draw); b.mesh.visible = b.shadow.visible = false; scene.add(b.mesh, b.shadow); a.push(b); } return a; }
const B = { dairy: pool(DA.scene, 2, 2.3, 1024), cow: pool(DA.scene, 3, 2.8, 768, drawCow), out: pool(OUT, 2, 2.3, 1024), walkers: pool(OUT, 6, 2.3, 384), lobby: pool(LB.scene, 3, 2.3, 1024), vault: pool(VT.scene, 4, 2.3, 1024), night: pool(NI, 4, 2.3, 1024) };
const used = [];
function put(board, feet, pose, tint, ground) { board.mesh.visible = true; board.update(cam, feet, { t: 0, ...pose }, tint, ground); used.push({ board, feet: feet.clone(), back: !!pose.back, kind: board.draw === drawCow ? 'cow' : 'char' }); }
function hideAll() { for (const k in B) for (const b of B[k]) { b.mesh.visible = false; b.shadow.visible = false; } used.length = 0; }
// arm solver: a world point -> the hand offset from the shoulder in canvas units (the board faces the camera)
function armTo(feet, side, target, size = 2.3) {
  const k = 1024 / size; const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion); right.y = 0; right.normalize();
  const sh = feet.clone().add(V(0, size * (0.42 - 20 / 1024), 0)).addScaledVector(right, side * 70 / k);
  const d = target.clone().sub(sh); return [d.dot(right) * k, -d.y * k, -side * 14];
}

// facing for a moving character: the drawing that points along its screen motion (never a rotated card)
function facingFrom(feet, vel) { const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion); right.y = 0; right.normalize(); const fwd = cam.position.clone().sub(feet); fwd.y = 0; fwd.normalize();
  const sx = vel.dot(right), sz = vel.dot(fwd); const a = Math.atan2(sx, sz);   // 0 = toward camera, ±π/2 = sideways, π = away
  const k = Math.abs(a); const sgn = Math.sign(sx) || 1; return k < 0.45 ? 0 : k < 1.15 ? sgn : k < 2.2 ? 2 * sgn : 3; }
// ================= camera, world -> screen =================
function camSet(p, tg, fov = 40, roll = 0) { cam.position.copy(p); cam.up.set(Math.sin(roll), Math.cos(roll), 0); cam.lookAt(tg); cam.fov = fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld(true); }
const _v = new THREE.Vector3();
function toScreen(p) { _v.copy(p).project(cam); return [(_v.x * 0.5 + 0.5) * W, (1 - (_v.y * 0.5 + 0.5)) * H, _v.z < 1]; }
function boxOf(pts) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, f = true; for (const p of pts) { const [x, y, ok] = toScreen(p); f = f && ok; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return f ? [x0, y0, x1, y1] : null; }
function charBox(u) { const k = u.board.sizeM / 2.3; const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion); right.y = 0; right.normalize(); const w = u.kind === 'cow' ? 1.3 * k : 0.34 * k, h = u.kind === 'cow' ? 1.4 * k : 1.68 * k;
  const top = u.feet.clone().add(V(0, h, 0)); return boxOf([u.feet.clone().addScaledVector(right, w), u.feet.clone().addScaledVector(right, -w), top.clone().addScaledVector(right, w), top.clone().addScaledVector(right, -w)]); }
function objBox(o) { o.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(o); if (b.isEmpty()) return null; const c = []; for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) c.push(V(x, y, z)); return { box: boxOf(c), centre: b.getCenter(V(0, 0, 0)) }; }

// ================= staging =================
const STAGE = {
  // 1. dawn dairy: he lifts the fresh wheel and pats it; push through the steam, then into the rind
  dairy(t, l, d) {
    DA.update(t); DA.bills.forEach((b) => (b.visible = false)); DA.pages.forEach((p) => (p.rotation.x = 0));
    const feet = V(0.0, 0, -2.0); const lift = sstep(1.0, 1.7, l); const wp = V(0.05, mix(0.9 + WHEEL.h / 2 + 0.01, 1.08, lift), mix(-1.2, -1.45, lift));
    WH.dairy.position.copy(wp); WH.dairy.rotation.set(0, l * 0.2, 0); WH.dairy.visible = true;
    const pat = l > 2.3 && l < 3.2 ? Math.abs(Math.sin((l - 2.3) * 14)) * 0.06 : 0;
    put(B.dairy[0], feet, { ...LOOK.maker, face: { eyes: l > 2.2 ? 'happy' : 'dot', mouth: l > 2.2 ? 'grin' : 'smile', look: [0, 0.2], blush: l > 2.2 ? 1 : 0 },
      armL: lift > 0 ? armTo(feet, -1, wp.clone().add(V(-0.24, 0, 0))) : kf([[0, [-40, 150, 12]], [0.8, [-60, 110, 20]]], l), armR: lift > 0 ? armTo(feet, 1, wp.clone().add(V(0.24 - pat, 0.05 + pat, 0))) : kf([[0, [40, 150, -12]], [0.8, [60, 110, -20]]], l) });
    const u = l / d; const p = kf([[0, [1.4, 1.75, 3.6]], [3.4, [0.35, 1.5, 1.3]], [4.0, [0.05, 1.36, -0.85]]], l);
    camSet(VA(p), VA(kf([[0, [0, 1.35, -1.8]], [3.4, [0, 1.38, -1.7]], [4.0, [0, 1.32, -1.55]]], l)), 40);
    return { scene: DA.scene, exp: 1.15, sat: 1.3, bloom: 0.45, bloomT: 0.95, dof: 1.2, tint: [1.06, 1.0, 0.9], hero: 0 };
  },
  // 2. the problem: calendar pages fly, bills pile up, head in hands
  problem(t, l, d) {
    DA.update(t); WH.dairy.visible = true; WH.dairy.position.set(5.0, 0.86 + WHEEL.h / 2, 1.45);
    const nb = Math.floor(clamp((l - 0.2) / 2.6, 0, 1) * DA.bills.length); DA.bills.forEach((b, i) => (b.visible = i < nb));
    DA.pages.forEach((p, k) => { const f = clamp((l - 0.3 - k * 0.32) / 0.3, 0, 1); p.rotation.x = -Math.PI * 0.95 * ease(f); p.visible = f < 0.999 || k === DA.pages.length - 1; });
    const feet = V(5.9, 0, 0.35); const head = feet.clone().add(V(0, 1.38, 0)); const sigh = l > 2.4;
    put(B.dairy[0], feet, { ...LOOK.maker, face: { eyes: sigh ? 'shut' : 'lid', mouth: 'frown', look: [-0.3, -0.3], sweat: l > 1.4 ? 1 : 0, browAng: -0.5, brow: 0.6 },
      armL: sigh ? armTo(feet, -1, head.clone().add(V(-0.3, -0.12, 0))) : [-60, 110, 20], armR: sigh ? armTo(feet, 1, head.clone().add(V(0.3, -0.12, 0))) : [60, 110, -20], bob: sigh ? 10 : 0 });
    const p = kf([[0, [5.2, 1.7, 3.9]], [d, [5.7, 1.55, 3.2]]], l); camSet(VA(p), V(5.65, mix(1.6, 1.45, l / d), -0.6), 42);
    return { scene: DA.scene, exp: 1.05, sat: 1.25, bloom: 0.35, dof: 1.0, tint: [1.0, 0.97, 0.92], hero: 0 };
  },
  // 2b. the cows at the empty trough
  cows1(t, l, d) {
    DA.update(t); WH.dairy.visible = false; DA.bills.forEach((b) => (b.visible = false));
    put(B.cow[0], V(9.5, 0, 3.7), { t, eat: 0, happy: false, chew: false }, null, 0); put(B.cow[1], V(10.6, 0, 2.9), { t, flip: true, eat: 0.2, happy: false, chew: false }, null, 0);
    camSet(V(mix(9.6, 10.0, l / d), 1.4, 9.4), V(9.9, 1.0, 3.4), 48);
    hay(false);
    return { scene: DA.scene, exp: 1.05, sat: 1.25, bloom: 0.3, dof: 0.8, tint: [0.98, 0.98, 1.0], hero: 0 };
  },
  // 3. rolling the wheel down the arcade to the bank; the columns sweep past the lens
  street(t, l, d) {
    const z0 = -4, z1 = -15.5; const zw = mix(z0, z1, l / d); rollG.position.set(-1.2, WHEEL.r * 1.04, zw); rollG.rotation.set((zw - z0) / (WHEEL.r * 1.04), 0, 0); WH.out.visible = true;
    const feet = V(-1.2, 0, zw + 0.75); const wp = V(-1.2, WHEEL.r * 1.04 + 0.12, zw + 0.25);
    put(B.out[0], feet, { ...LOOK.maker, turn: facingFrom(feet, V(0, 0, -1)), face: { eyes: 'dot', mouth: 'grin' }, walk: t * 9, armL: armTo(feet, -1, wp.clone().add(V(-0.18, 0.05, 0))), armR: armTo(feet, 1, wp.clone().add(V(0.18, 0.05, 0))), lean: 0.12 }, null, 0);
    const pr = [[-3.2, -12, '#c8312d', 'bun'], [3.0, -14, '#2f6a8a', 'cap'], [-3.4, -18, '#5a7a3a', 'curly'], [2.6, -20, '#a07a3a', 'bun'], [-2.9, -24, '#6a4a8a', 'cap'], [3.3, -27, '#3a3a5a', 'side']];
    pr.forEach(([x, z, body, hair], i) => put(B.walkers[i], V(x, 0, z + (i % 2 ? 1 : -1) * l * 1.2), { turn: facingFrom(V(x, 0, z), V(0, 0, i % 2 ? 1 : -1)), body, hair, hairCol: ['#4a2a14', '#8a5a32', '#2a1a10'][i % 3], walk: t * 6 + i, flip: i % 2 === 1, face: { eyes: 'dot', mouth: 'smile', look: [i % 2 ? -0.5 : 0.5, 0] } }, null, 0));
    const wipe = sstep(d - 0.55, d - 0.05, l); const colZ = 2 - Math.round((2 - (zw - 1.4)) / 3.6) * 3.6;
    camSet(V(mix(2.2, -4.85, wipe), mix(1.25, 0.9, wipe), mix(zw - 3.4, colZ + 0.9 - 1.0 * wipe, wipe)), V(-1.0, 1.0, zw + 0.1), 46);
    osun.target.position.set(-1, 0, zw); osun.position.set(13, 22, zw - 30); Object.assign(osun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 80 }); osun.shadow.camera.updateProjectionMatrix();
    return { scene: OUT, exp: 1.05, sat: 1.3, bloom: 0.35, dof: 1.2, tint: [1.05, 1.0, 0.92], hero: 0 };
  },
  // 4. the lobby: tap, listen, sniff, smile, stamp
  lobby(t, l, d) {
    WH.lobby.position.set(-0.35, 1.23 + WHEEL.h / 2, -1.15); WH.lobby.visible = true; LB.hinge.rotation.y = 0; LB.spin.rotation.z = 0; LB.vaultL.intensity = 0; LB.behind.visible = false;
    const fb = V(-0.6, 0.42, -2.0); const top = WH.lobby.position.clone().add(V(0, WHEEL.h / 2 + 0.02, 0));
    const tap = (l > 0.8 && l < 1.0) || (l > 1.2 && l < 1.4); const listen = l > 0.8 && l < 1.7; const sniff = l > 1.8 && l < 2.4; const stamp = l > 2.6;
    put(B.lobby[0], fb, { ...LOOK.banker, face: { eyes: sniff ? 'shut' : listen ? 'lid' : l > 2.4 ? 'happy' : 'glasses', mouth: l > 2.4 ? 'smile' : sniff ? 'o' : 'line', look: [0.3, 0.2], browAng: listen ? -0.3 : 0 }, lean: listen ? -0.18 : sniff ? 0.1 : 0,
      armR: armTo(fb, 1, top.clone().add(V(0.15, tap ? 0.05 : 0.16, 0))), prop: stamp ? { hand: 'R', kind: 'stamp' } : { hand: 'R', kind: 'tapper', rot: tap ? 0.4 : 0 }, armL: [-50, 120, 15] });
    const fm = V(1.25, 0, 0.1); put(B.lobby[1], fm, { ...LOOK.maker, back: false, face: { eyes: l > 2.6 ? 'wide' : 'dot', mouth: l > 2.6 ? 'grin' : 'line', look: [-0.6, 0], sweat: l < 2.4 ? 1 : 0 }, armL: [-40, 140, 12] });
    const p = kf([[0, [0.9, 1.75, 3.6]], [2.2, [0.2, 1.62, 2.4]], [3.0, [0.0, 1.6, 2.2]], [d, [1.4, 1.9, 2.0]]], l); const tg = kf([[0, [-0.2, 1.4, -1.3]], [2.2, [-0.4, 1.55, -1.6]], [3.0, [-0.3, 1.5, -1.6]], [d, [3.4, 2.2, -5.6]]], l);
    camSet(VA(p), VA(tg), 40);
    return { scene: LB.scene, exp: 1.1, sat: 1.3, bloom: 0.45, bloomT: 0.95, dof: 1.2, tint: [1.05, 1.0, 0.92], hero: 0 };
  },
  // 5. the vault door: spin, swing, light pours out; push into the light
  door(t, l, d) {
    WH.lobby.visible = false; LB.spin.rotation.z = -Math.PI * 2 * ease(clamp(l / 0.8, 0, 1)); const op = ease(clamp((l - 0.8) / 1.1, 0, 1)); LB.hinge.rotation.y = -1.7 * op; LB.behind.visible = true; LB.vaultL.intensity = 40 * op;
    for (let i = 0; i < 2; i++) put(B.lobby[i], V(2.9 + i * 1.6, 0, -2.6), { ...(i ? LOOK.maker : LOOK.banker), back: true });
    const p = kf([[0, [3.6, 0.6, 2.4]], [1.6, [3.7, 0.9, 1.0]], [d, [3.8, 1.9, -3.6]]], l); camSet(VA(p), V(3.8, mix(2.0, 2.2, l / d), -6.0), 46);
    return { scene: LB.scene, exp: 1.1, sat: 1.25, bloom: 0.7, bloomT: 0.8, dof: 0, flash: 0.9 * sstep(d - 0.45, d, l), tint: [1.05, 1.0, 0.9], heroObj: LB.hinge, wide: true };
  },
  // 6. the cathedral of cheese: crane up and back
  cathedral(t, l, d) {
    vaultDay(t, 0.4); const ax = VT.aisleX(2); const feet = V(ax, 0, -4.0);
    const tm = turnAt(l, 2.6, 3, 0); put(B.vault[0], feet, { ...LOOK.maker, turn: tm, face: { eyes: 'wide', mouth: 'o', open: 0.9, look: [0, -0.4] } }); put(B.vault[1], V(ax + 0.9, 0, -3.6), { ...LOOK.banker, turn: turnAt(l, 3.0, 3, -1), face: { eyes: 'glasses', mouth: 'smirk' } });
    const u = ease(l / d); camSet(V(ax + mix(0.2, 0.6, u), mix(1.1, 9.0, u), mix(-1.6, 6.5, u)), V(ax, mix(1.9, 2.5, u), mix(-8, -24, u)), mix(46, 52, u));
    return { scene: VT.scene, exp: 1.15, sat: 1.3, bloom: 0.55, bloomT: 0.85, dof: 0.6, flash: 0.8 * (1 - sstep(0, 0.35, l)), tint: [1.06, 1.0, 0.88], wide: true, heroObj: VT.inst };
  },
  // 7. the money: the bag passes from the banker's palm to the maker's
  money(t, l, d) {
    vaultDay(t, 0.4); const ax = VT.aisleX(2); const fb = V(ax - 0.55, 0, -3.0), fm = V(ax + 0.55, 0, -2.8);
    const hand = clamp((l - 0.5) / 0.5, 0, 1); const bagP = V(ax + mix(-0.25, 0.25, ease(hand)), 1.05, -2.6);
    const hugs = l > 1.2;
    put(B.vault[0], fb, { ...LOOK.banker, face: { eyes: 'happy', mouth: 'smile', look: [0.5, 0] }, armR: hand < 1 ? armTo(fb, 1, bagP) : [40, 150, -12], prop: hand < 0.55 ? { hand: 'R', kind: 'bag' } : null });
    const dash = clamp((l - 1.75) / 0.6, 0, 1); fm.x += 1.6 * dash * dash; const tmm = turnAt(l, 1.6, 0, 2);
    put(B.vault[1], fm, { ...LOOK.maker, turn: tmm, walk: dash > 0 ? t * 14 : null, run: dash > 0 ? 1 : 0, face: { eyes: hugs ? 'happy' : 'wide', mouth: hugs ? 'grin' : 'o', blush: hugs ? 1 : 0, look: [-0.5, 0] }, armL: hand > 0.4 ? armTo(fm, -1, hugs ? fm.clone().add(V(0.05, 0.95, 0.1)) : bagP) : [-40, 150, 12], prop: hand >= 0.55 ? { hand: 'L', kind: 'bag' } : null, bob: hugs ? -10 * Math.abs(Math.sin(l * 9)) : 0 });
    camSet(V(ax + mix(0.1, -0.1, l / d), 1.55, mix(1.6, 1.0, l / d)), V(ax, 1.3, -2.9), 42);
    return { scene: VT.scene, exp: 1.15, sat: 1.3, bloom: 0.5, dof: 1.0, tint: [1.06, 1.0, 0.9], hero: 1 };
  },
  // 7b. the cows eat
  cows2(t, l, d) {
    DA.update(t); WH.dairy.visible = false; DA.bills.forEach((b) => (b.visible = false)); hay(true);
    for (let i = 0; i < 2; i++) put(B.cow[i], V(8.8 + i * 1.6, 0, 3.4 + i * 0.4), { t, flip: i === 1, eat: 0.6 + 0.3 * Math.sin(t * 5 + i), happy: true, chew: true }, null, 0);
    put(B.dairy[0], V(10.0, 0, 5.2), { ...LOOK.maker, face: { eyes: 'happy', mouth: 'grin', look: [-0.4, 0] }, armL: [-110, -30, 20] });
    camSet(V(mix(9.0, 9.6, l / d), 1.4, 8.8), V(9.8, 1.0, 3.3), 48);
    return { scene: DA.scene, exp: 1.1, sat: 1.3, bloom: 0.35, dof: 0.8, tint: [1.05, 1.0, 0.92], hero: 0 };
  },
  // 8. time passes: the machine turns and brushes, the inspector taps, the wheels go golden, days flicker
  aging(t, l, d) {
    const k = ease(l / (d - 0.8)); const dayCycle = 0.6 + 0.4 * Math.sin(l * 9); vaultDay(t, k, dayCycle);
    const ax = VT.aisleX(0); VT.mach.position.z = mix(-4, -16, l / d); VT.car.position.y = 1.0 + 2.4 * (0.5 + 0.5 * Math.sin(l * 3)); VT.brush.rotation.y = l * 30; VT.held.rotation.x = l * 2; VT.held.material.color.copy(PALE).lerp(GOLD, k);
    const off = sstep(d - 0.8, d - 0.1, l); VT.aisleL.forEach((p, i) => (p.intensity = 8 * (1 - sstep(d - 0.8 + i * 0.12, d - 0.7 + i * 0.12, l)))); VT.day.intensity *= 1 - off; VT.hemi.intensity *= 1 - 0.85 * off;
    const fi = V(ax + 0.6, 0, VT.mach.position.z + 3.2); put(B.vault[0], fi, { ...LOOK.inspector, face: { eyes: 'lid', mouth: 'line', look: [-0.6, 0.3] }, armL: armTo(fi, -1, V(ax - 1.3, 1.2, fi.z)), prop: { hand: 'L', kind: 'tapper', rot: Math.sin(l * 18) > 0.5 ? 0.4 : 0 } });
    camSet(V(ax + 1.3, 1.5, VT.mach.position.z + 6.0), V(ax - 0.4, 1.9, VT.mach.position.z - 0.5), 46);
    return { scene: VT.scene, exp: 1.12 * (1 - 0.7 * off), sat: 1.3, bloom: 0.45, dof: 0.8, tint: [1.05, 1.0, 0.9], heroObj: VT.mach };
  },
  // 9. night: the thieves sneak in with a tiny cart, torches sweeping
  sneak(t, l, d) {
    vaultNight(t); const ax = VT.aisleX(2); const z = mix(2.6, -1.4, l / d);
    VT.cart.position.set(ax + 0.6, 0, z - 0.8); VT.cart.scale.set(1, 1, 1); VT.cartLoad.forEach((w) => (w.visible = false));
    const fa = V(ax - 0.05, 0, z), fb2 = V(ax + 1.05, 0, z + 0.4);
    put(B.vault[0], fa, { ...LOOK.thiefA, turn: facingFrom(fa, V(0, 0, -1)), walk: t * 5, face: { eyes: 'dot', mouth: 'smirk', look: [0.5, 0] }, armR: [60, -60, -20], prop: { hand: 'R', kind: 'torch' }, lean: -0.08 }, new THREE.Color(0.6, 0.7, 1.0));
    put(B.vault[1], fb2, { ...LOOK.thiefB, turn: facingFrom(fb2, V(0, 0, -1)), walk: t * 5 + 1, face: { eyes: 'dot', mouth: 'line', look: [-0.4, 0] }, armL: armTo(fb2, -1, V(ax + 1.0, 0.95, z - 0.4)) }, new THREE.Color(0.6, 0.7, 1.0));
    torch(0, fa.clone().add(V(0.3, 1.0, 0)), V(ax + Math.sin(l * 1.7) * 2, 1.5, z - 8)); torch(1, fb2.clone().add(V(0, 1.0, 0)), V(ax + 1.5 + Math.sin(l * 2.1 + 1) * 2, 3, z - 10));
    camSet(V(ax + 0.8, 3.3, z + 3.9), V(ax + 0.45, 1.1, z - 0.4), 48);
    return { scene: VT.scene, exp: 1.25, sat: 1.15, bloom: 0.5, bloomT: 0.85, dof: 0.6, tint: [0.75, 0.85, 1.15], hero: 0 };
  },
  // 10. loading: the cart sags, a wheel escapes and rolls into the lens
  loading(t, l, d) {
    vaultNight(t); const ax = VT.aisleX(2); const z = -1.4;
    VT.cart.position.set(ax + 0.6, 0, z - 0.8); const nl = Math.floor(clamp(l / 1.8, 0, 1) * 9); VT.cartLoad.forEach((w, i) => { w.visible = i < nl; w.position.set(-0.25 + (i % 3) * 0.25, 0.53 + Math.floor(i / 3) * 0.25, (i % 2) * 0.1 - 0.05); });
    VT.cart.scale.set(1, 1 - 0.25 * clamp(nl / 9, 0, 1), 1);
    const slip = clamp((l - 2.0) / (d - 2.0), 0, 1); const runaway = WH.vault2; runaway.visible = l > 2.0; const rz = mix(z - 0.6, z + 6.8, Math.pow(slip, 1.3));
    runaway.position.set(ax + 0.3, WHEEL.r * 1.04, rz); runaway.rotation.set((rz - z) / (WHEEL.r * 1.04), 0, Math.PI / 2);
    const fa = V(ax - 0.3, 0, mix(z, z + 3.0, slip)), fb2 = V(ax + 1.3, 0, z + 0.4);
    put(B.vault[0], fa, { ...LOOK.thiefA, turn: slip > 0 ? facingFrom(fa, V(0, 0, 1)) : 0, walk: slip > 0 ? t * 12 : null, run: slip > 0 ? 1 : 0, face: { eyes: slip > 0 ? 'wide' : 'dot', mouth: slip > 0 ? 'open' : 'smirk', open: 0.8, sweat: slip > 0 ? 1 : 0 }, armL: [-110, -40, 20], armR: [110, -40, -20] }, new THREE.Color(0.6, 0.7, 1.0));
    put(B.vault[1], fb2, { ...LOOK.thiefB, face: { eyes: 'wide', mouth: 'o', look: [0.4, 0.3] }, armL: armTo(fb2, -1, V(ax + 0.7, 1.2, z - 0.8)), armR: armTo(fb2, 1, V(ax + 0.9, 1.2, z - 0.8)) }, new THREE.Color(0.6, 0.7, 1.0));
    torch(0, fa.clone().add(V(0.3, 1.0, 0)), V(ax, 0.3, rz)); torch(1, fb2.clone().add(V(0, 1.0, 0)), V(ax + 0.6, 0.6, z - 0.8));
    const p = l < 2.0 ? V(ax + 0.6, 1.7, z + 4.4) : V(ax + 0.35, 0.35, z + 7.4); camSet(p, l < 2.0 ? V(ax + 0.55, 1.1, z - 0.3) : V(ax + 0.3, 0.4, rz - 1.0), l < 2.0 ? 44 : 50);
    if (l >= 2.0) { VT.hemi.intensity = 0.7; VT.torches[0].intensity = 18; }
    return { scene: VT.scene, exp: l >= 2.0 ? 1.4 : 1.25, sat: 1.15, bloom: 0.5, bloomT: 0.85, dof: 0.6, tint: [0.75, 0.85, 1.15], hero: l < 2.0 ? 1 : 0, heroObj: l >= 2.0 ? runaway : null };
  },
  // 11. outside: the overloaded van crawls, sparks; blue lights; sheepish thieves
  caught(t, l, d) {
    const vx = mix(-4, -1.4, ease(clamp(l / 1.6, 0, 1))); DK.van.position.set(vx, 0, 2.0); DK.van.rotation.z = -0.06; DK.wheels.forEach((w) => (w.rotation.y = 0));
    DK.police.position.set(4.6, 0, 3.4); DK.police.rotation.y = -0.5; const fl = Math.sin(t * 18) > 0; DK.red.visible = fl; DK.blue.visible = !fl; DK.pr.intensity = fl ? 20 : 0; DK.pbl.intensity = fl ? 0 : 20;
    DK.sparks.forEach((s, i) => { const k = (t * 3 + i * 0.13) % 1; s.position.set(vx - 1.2 - k * 1.5, 0.05 + Math.sin(i) * 0.1 + k * 0.4 - k * k * 0.6, 2.0 + (i % 5 - 2) * 0.15); s.visible = l < 1.8; });
    const tint = fl ? new THREE.Color(1.0, 0.6, 0.6) : new THREE.Color(0.6, 0.7, 1.15);
    const f1 = V(1.0, 0, 4.4), f2 = V(1.75, 0, 4.6), wp = V(1.38, 0.95, 4.75);
    if (l > 1.4) {
      put(B.night[0], f1, { ...LOOK.thiefA, face: { eyes: 'lid', mouth: 'frown', sweat: 1, look: [0.2, 0.1] }, armR: armTo(f1, 1, wp.clone().add(V(-0.2, 0, 0))) }, tint, 0);
      put(B.night[1], f2, { ...LOOK.thiefB, face: { eyes: 'lid', mouth: 'line', look: [-0.2, 0.1] }, armL: armTo(f2, -1, wp.clone().add(V(0.2, 0, 0))) }, tint, 0);
      put(B.night[2], V(2.55, 0, 3.7), { ...LOOK.cop, face: { eyes: 'lid', mouth: 'smirk', look: [-0.6, 0] }, armL: [70, 20, 40], armR: [-70, 20, -40] }, tint, 0);
    }
    WH.out.visible = false; heldWheelNight.visible = l > 1.4; heldWheelNight.position.copy(wp); heldWheelNight.rotation.set(0, 0, Math.PI / 2);
    const p = l < 1.4 ? V(mix(-6, -4, l / 1.4), 1.2, 9.5) : V(mix(1.8, 1.7, (l - 1.4) / 2.2), 1.55, mix(10.0, 9.2, (l - 1.4) / 2.2)); camSet(p, l < 1.4 ? V(vx, 1.2, 2.0) : V(1.75, 1.25, 4.2), l < 1.4 ? 44 : 44);
    return { scene: NI, exp: 1.3, sat: 1.25, bloom: 0.6, bloomT: 0.8, dof: 0.8, tint: [0.9, 0.9, 1.1], flash: 0.85 * sstep(d - 0.3, d, l), hero: l < 1.4 ? null : 0, heroObj: l < 1.4 ? DK.van : null };
  },
  // 12. two years later: the golden wheel, a wedge shared (the held breath)
  later(t, l, d) {
    vaultDay(t, 1); const ax = VT.aisleX(2); const tbl = V(ax, 0, -3.4); WH.vault.visible = true; WH.vault.position.set(ax, 1.0 + WHEEL.h / 2, -3.4); tableG.position.copy(tbl); tableG.visible = true;
    const fb = V(ax - 0.55, 0, -3.95), fm = V(ax + 0.55, 0, -3.75); const cut = l > 1.2, give = clamp((l - 1.8) / 0.5, 0, 1), bite = l > 2.5;
    const wedgeAt = V(mix(ax - 0.3, ax + 0.35, ease(give)), mix(1.25, 1.45, ease(give)), -3.3);
    put(B.vault[0], fb, { ...LOOK.banker, face: { eyes: 'happy', mouth: 'smile', look: [0.5, 0] }, armR: give < 1 ? armTo(fb, 1, cut && give === 0 ? V(ax - 0.15, 1.3, -3.4) : wedgeAt) : [40, 150, -12], prop: give < 0.5 ? (cut ? { hand: 'R', kind: 'wedge' } : { hand: 'R', kind: 'knife', rot: -0.5 + 0.3 * Math.sin(l * 12) }) : null });
    put(B.vault[1], fm, { ...LOOK.maker, face: { eyes: bite ? 'shut' : 'wide', mouth: bite ? 'smile' : 'o', blush: bite ? 1 : 0, look: [-0.5, 0] }, armL: give > 0.4 ? armTo(fm, -1, bite ? fm.clone().add(V(-0.05, 1.32, 0.1)) : wedgeAt) : [-40, 150, 12], prop: give >= 0.5 ? { hand: 'L', kind: 'wedge' } : null });
    camSet(V(ax + mix(0.1, 0.0, l / d), mix(1.6, 1.5, l / d), mix(1.0, 0.3, ease(l / d))), V(ax, 1.3, -3.7), 42);
    return { scene: VT.scene, exp: 1.15, sat: 1.3, bloom: 0.5, dof: 1.2, tint: [1.07, 1.0, 0.88], hero: 1 };
  },
  // 13. rise: up the aisle to the skylights, into the light
  rise(t, l, d) {
    vaultDay(t, 1); const ax = VT.aisleX(2); tableG.visible = true; WH.vault.visible = true;
    put(B.vault[0], V(ax - 0.55, 0, -3.95), { ...LOOK.banker, face: { eyes: 'happy', mouth: 'smile' } }); put(B.vault[1], V(ax + 0.55, 0, -3.75), { ...LOOK.maker, face: { eyes: 'shut', mouth: 'smile', blush: 1 }, prop: { hand: 'L', kind: 'wedge' }, armL: [-60, -60, 20] });
    const u = ease(l / d); camSet(V(ax, mix(1.5, 9.2, u), mix(0.3, -3.4, u)), V(ax, mix(1.3, 12, u), mix(-3.6, -3.7, u)), mix(42, 60, u));
    return { scene: VT.scene, exp: 1.15 + 0.6 * u, sat: 1.3, bloom: 0.6 + 0.6 * u, dof: 0.5, tint: [1.07, 1.0, 0.88], wide: true, hero: 1 };
  },
};
// helpers that change set state
function hay(on) { DA.scene.traverse((o) => { if (o.isMesh && o.geometry.type === 'BoxGeometry' && o.geometry.parameters.width === 2.4 && o.geometry.parameters.height === 0.06) o.visible = on; }); }
function vaultDay(t, ageK, cycle = 1) { VT.ages(ageK); VT.day.intensity = 1.8 * cycle; VT.hemi.intensity = 0.9; VT.aisleL.forEach((p) => (p.intensity = 8)); VT.torches.forEach((s) => (s.intensity = 0)); VT.cart.visible = false; WH.vault2.visible = false; WH.vault.visible = false; tableG.visible = false; VT.rays.forEach((r) => (r.visible = true)); VT.mach.visible = true; VT.scene.fog.color.setRGB(0.165, 0.118, 0.07); }
function vaultNight(t) { VT.ages(0.5); VT.day.intensity = 0.0; VT.hemi.intensity = 0.25; VT.aisleL.forEach((p) => (p.intensity = 0)); VT.cart.visible = true; WH.vault.visible = false; tableG.visible = false; VT.rays.forEach((r) => (r.visible = false)); VT.scene.fog.color.setRGB(0.03, 0.04, 0.08); }
function torch(i, from, to) { const s = VT.torches[i]; s.intensity = 60; s.position.copy(from); s.target.position.copy(to); }
const tableG = new THREE.Group(); { const tb = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 0.7), new THREE.MeshStandardMaterial({ color: 0x7a5232, roughness: 0.7 })); tb.position.y = 1.0; tableG.add(tb); for (const [x, z] of [[-0.45, -0.3], [0.45, -0.3], [-0.45, 0.3], [0.45, 0.3]]) { const lg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.0, 0.05), tb.material); lg.position.set(x, 0.5, z); tableG.add(lg); } tableG.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; }); VT.scene.add(tableG); }
const heldWheelNight = makeWheel(GOLD.clone()); NI.add(heldWheelNight);

// ================= frame =================
let LAST = { shot: '', subjects: [] };
function shotAt(t) { for (const s of SHOTS.list) if (t < s.t1) return s; return SHOTS.list[SHOTS.list.length - 1]; }
function render(t) {
  t = clamp(t, 0, DUR - 1e-4); hideAll();
  const s = shotAt(t); const l = t - s.t0, d = s.t1 - s.t0;
  STAGE[s.stage](t, l, d); hideAll();            // pass 1 settles the camera for this frame
  const o = STAGE[s.stage](t, l, d) || {};       // pass 2 places boards and solves arms against that camera
  cam.updateMatrixWorld(true);
  const facing = (u) => { const n = new THREE.Vector3(0, 0, 1).applyQuaternion(u.board.mesh.quaternion); const dir = cam.position.clone().sub(u.board.mesh.position); dir.y = 0; n.y = 0; return n.normalize().dot(dir.normalize()); };
  const subjects = used.map((u, i) => ({ id: `${u.kind}${i}`, kind: u.kind, back: u.back, facing: facing(u), box: charBox(u), at: u.feet.clone().add(V(0, 1.2 * u.board.sizeM / 2.3, 0)) }));
  if (o.heroObj) { const ob = objBox(o.heroObj); if (ob) subjects.unshift({ id: 'object', kind: 'object', box: ob.box, at: ob.centre }); }
  const hi = o.heroObj ? 0 : (o.hero ?? 0); if (subjects[hi]) subjects[hi].hero = true;
  if (o.dof > 0 && subjects[hi] && !o.pinFocus) o.focus = cam.position.distanceTo(subjects[hi].at);
  LAST = { shot: s.stage, wide: !!o.wide, inTransition: s.out !== 'cut' && s.out !== 'end' && s.out !== 'continue' && l > d - 0.45, subjects: subjects.map(({ at, ...r }) => r) };
  const fade = sstep(0, 0.35, t) * (1 - sstep(DUR - 0.9, DUR - 0.05, t));
  POST.render(o.scene || OUT, cam, { ...o, fade });
}
window.DUR = DUR; window.FPS = FPS; window.render = render; window.SUBJECTS = (t) => { render(t); return { W, H, ...LAST }; };
window.grabPNG = (t) => { render(t); return canvas.toDataURL('image/png').split(',')[1]; };
window.grab = (t) => { render(t); return canvas.toDataURL('image/jpeg', 0.95).split(',')[1]; };
render(0); window.READY = true;
