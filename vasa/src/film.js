// The Ship That Sank in 20 Minutes — wordless 3D-set / 2D-character short. Every frame is a pure function of t.
import * as THREE from './three.module.js';
import { makePost } from './post.js';
import { makeSky, makeEnv, makeWater, makeHarbour, makeGulls, QUAY } from './world.js';
import { makeShip } from './ship.js';
import { makeGunDeck, makeRoom, makeSeabed, makeSalvage, makeMuseum } from './sets.js';
import { makeBoard, drawPerson, drawWorm } from './stick.js';
import { SHOTS, DUR, FPS } from './shots.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x)); const mix = (a, b, u) => a + (b - a) * u;
const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
const ease = (u) => sstep(0, 1, u);
const rnd = (s) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
// keys [[t, value]] -> smooth value at t (numbers or arrays)
function kf(keys, t) { if (t <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) { const [a, va] = keys[i - 1], [b, vb] = keys[i]; const u = ease((t - a) / (b - a)); return Array.isArray(va) ? va.map((x, j) => mix(x, vb[j], u)) : mix(va, vb, u); } return keys[keys.length - 1][1]; }
const VA = (a) => V(a[0], a[1], a[2]);

const W = innerWidth, H = innerHeight;
const canvas = document.createElement('canvas'); document.body.appendChild(canvas);
const POST = makePost(canvas, W, H);
const cam = new THREE.PerspectiveCamera(40, W / H, 0.1, 2500);

// ================= harbour scene =================
const HS = new THREE.Scene(); const SKY = makeSky(HS); const ENV = makeEnv(POST.renderer, SKY.u); HS.environment = ENV; HS.environmentIntensity = 0.7;
HS.fog = new THREE.Fog(0xd8d0c0, 140, 800);
const hsun = new THREE.DirectionalLight(0xffe2b8, 3.0); hsun.castShadow = true; hsun.shadow.mapSize.set(2048, 2048); hsun.shadow.bias = -0.0004; hsun.shadow.normalBias = 0.05; HS.add(hsun, hsun.target);
const hhemi = new THREE.HemisphereLight(0xbfd8ff, 0x6a5a40, 0.6); HS.add(hhemi);
const WATER = makeWater(HS); const HARB = makeHarbour(HS); const GULLS = makeGulls(HS);
const SHIP = makeShip(); HS.add(SHIP.root);
const SALV = makeSalvage(HS); SALV.group.visible = false;
const WRECK2 = makeShip(); HS.add(WRECK2.root); WRECK2.set({ wreck: 1 }); WRECK2.root.visible = false;
// foam / splash particles around the ship
const foamTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(240,250,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const foamM = new THREE.SpriteMaterial({ map: foamTex, color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false });
const FOAM = []; { const r = rnd(5); for (let i = 0; i < 260; i++) { const m = new THREE.Sprite(foamM); m.visible = false; HS.add(m); FOAM.push({ m, a: r(), b: r(), c: r() }); } }
// wind streaks for the gusts
const WIND = []; { const r = rnd(9); const wm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide }); for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(9 + r() * 6, 0.12), wm.clone()); HS.add(m); WIND.push({ m, y: 8 + r() * 26, z: -30 + r() * 12, ph: r() }); } }

// ================= other sets =================
const GD = makeGunDeck(); const RM = makeRoom(); const SB = makeSeabed(); const MU = makeMuseum();
GD.scene.environment = ENV; GD.scene.environmentIntensity = 0.25; RM.scene.environment = ENV; RM.scene.environmentIntensity = 0.35;
const SBSHIP = makeShip(); SBSHIP.set({ wreck: 1 }); SB.scene.add(SBSHIP.root); SBSHIP.root.position.set(0, SB.mudY + 3.6, 0); SBSHIP.heel.rotation.x = -0.12;
const MUSHIP = makeShip(); MUSHIP.set({ wreck: 0.75 }); MU.scene.add(MUSHIP.root); MUSHIP.root.position.set(0, 0, 0);
MU.scene.environment = ENV; MU.scene.environmentIntensity = 0.12;

// ================= cast =================
const LOOK = {
  king: { body: '#7a2a3a', hat: 'crown', moustache: '#6b4427', sash: '#2f6fd6', buttons: '#f2c230' },
  captain: { body: '#24386a', hat: 'tricorn', hatCol: '#1e1e2a', moustache: '#4a3020', buttons: '#e3b341', belt: '#4a2a1a' },
  admiral: { body: '#1d2b4f', hat: 'bicorne', hatCol: '#15151f', sash: '#c8312d', buttons: '#e3b341', bodyW: 108 },
  painter: { body: '#e8e0cc', hat: 'beanie', hatCol: '#a03a2a', hair: 'side', hairCol: '#5a3a24' },
  judge: { body: '#1a1a22', hair: 'wig', hairCol: '#f2efe6', collar: true },
  wright: { body: '#6a4a2a', hat: 'beanie', hatCol: '#3a5a3a', belt: '#2a1a10' },
  messenger: { body: '#3a6a3a', hat: 'cap', hatCol: '#2a4a2a' },
  worker: { body: '#9a6a3a', hair: 'cap', hairCol: '#4a2a14' },
};
const sailor = (i) => ({ body: '#f2f2f2', stripes: i % 2 ? '#2f5fb0' : '#b0302a', hat: i % 3 ? 'sailor' : null, hatCol: '#1d2d4a', hair: i % 3 ? null : 'cap', hairCol: ['#4a2a14', '#8a5a32', '#2a1a10'][i % 3] });
const CROWD_LOOK = (r) => { const bodies = ['#2f6a8a', '#8a3a3a', '#5a7a3a', '#a07a3a', '#6a4a8a', '#3a3a5a', '#b05a2a', '#4a6a6a']; const k = Math.floor(r() * 10);
  return { body: bodies[Math.floor(r() * bodies.length)], hair: ['cap', 'bun', 'curly', 'cap', 'bun'][k % 5], hairCol: ['#4a2a14', '#8a5a32', '#2a1a10', '#b07a3a'][Math.floor(r() * 4)], hat: k > 6 ? ['trilby', 'bonnet', 'beanie'][k - 7] : null, hatCol: ['#3a2a1a', '#e8d8b8', '#7a3a2a'][k % 3], bodyW: 88 + r() * 22, bodyH: 300 + r() * 60 }; };
const MOD_LOOK = (r) => { const bodies = ['#e2782f', '#5b3fa8', '#2f8a6a', '#c83a4a', '#3a6ab0', '#e0c040', '#4a4a4a']; const k = Math.floor(r() * 6); return { body: bodies[Math.floor(r() * bodies.length)], hair: ['cap', 'bun', 'curly', 'cap', 'side', 'bun'][k], hairCol: ['#4a2a14', '#8a5a32', '#2a1a10', '#b07a3a'][Math.floor(r() * 4)], hat: k === 4 ? 'cap' : null, hatCol: '#2a3a6a', bodyW: 88 + r() * 22, bodyH: 300 + r() * 60 }; };
const RETRO_LOOK = (r) => { const bodies = ['#4a4a52', '#5a4a3a', '#3a4a5a', '#6a5a4a']; return { body: bodies[Math.floor(r() * 4)], hat: 'trilby', hatCol: ['#2a2a2a', '#4a3a2a', '#3a3a4a'][Math.floor(r() * 3)], collar: true, bodyW: 95 + r() * 12 }; };

// a pool of boards per scene, reused shot to shot
function pool(scene, n, size, px) { const a = []; for (let i = 0; i < n; i++) { const b = makeBoard(size, px, drawPerson); b.mesh.visible = b.shadow.visible = false; scene.add(b.mesh, b.shadow); a.push(b); } return a; }
const HB = pool(HS, 8, 2.3, 1024), HC = pool(HS, 46, 2.3, 384);   // harbour: hero boards + crowd boards
const GB = pool(GD.scene, 6, 2.3, 768); const RB = pool(RM.scene, 4, 2.3, 1024); const MB = pool(MU.scene, 14, 2.3, 512);
const WORM = makeBoard(2.4, 512, drawWorm); SB.scene.add(WORM.mesh); WORM.shadow.visible = false;
const used = [];   // boards placed this frame, in order: the first is the hero unless the stage names one
function put(board, feet, pose, tint, ground) { board.mesh.visible = true; board.update(cam, feet, pose, tint, ground); used.push({ board, feet: feet.clone(), back: !!pose.back }); }
function hideAll() { for (const a of [HB, HC, GB, RB, MB]) for (const b of a) { b.mesh.visible = false; b.shadow.visible = false; } used.length = 0; }
// ---- one world -> screen function: every framing check, focus pull and caption placement goes through it ----
const _v = new THREE.Vector3();
function toScreen(p) { _v.copy(p).project(cam); return [(_v.x * 0.5 + 0.5) * W, (1 - (_v.y * 0.5 + 0.5)) * H, _v.z < 1]; }
function boxOfPoints(pts) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, front = true; for (const p of pts) { const [x, y, f] = toScreen(p); front = front && f; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return front ? [x0, y0, x1, y1] : null; }
function charBox(u) { const k = u.board.sizeM / 2.3; const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion); right.y = 0; right.normalize().multiplyScalar(0.34 * k);
  const top = u.feet.clone().add(new THREE.Vector3(0, 1.68 * k, 0)); return boxOfPoints([u.feet.clone().add(right), u.feet.clone().sub(right), top.clone().add(right), top.clone().sub(right)]); }
function objBox(obj) { obj.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(obj); if (b.isEmpty()) return null; const c = []; for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) c.push(new THREE.Vector3(x, y, z)); return { box: boxOfPoints(c), centre: b.getCenter(new THREE.Vector3()) }; }
let LAST = { subjects: [], shot: '' };

// crowd layout on the quay (stable random looks)
const CROWD = []; { const r = rnd(123); for (let i = 0; i < HC.length; i++) { const row = i < 26 ? 0 : 1; const x = -26 + (row ? (i - 26) * 2.3 : i * 1.9) + r() * 0.6, z = QUAY.z + 1.4 + row * 1.6 + r() * 0.4;
  CROWD.push({ x, z, look: CROWD_LOOK(r), ph: r() * 6.28, prop: r() < 0.25 ? 'hankie' : r() < 0.3 ? 'flag' : null, kid: r() < 0.1 }); } }

// ================= ship path and heel (harbour time) =================
// docked at the origin; departs at T.depart, heading +x and curving away from the quay
const DOCK = V(0, 0, 0);
function shipPath(t) {
  const T = SHOTS.T; const u = clamp((t - T.depart) / (T.sink1 - T.depart), 0, 1); const d = 70 * Math.pow(u, 1.35);
  return { pos: V(d, 0, -d * 0.32), yaw: 0.3 * sstep(0, 0.4, u) };
}
function heelAt(t) {
  const T = SHOTS.T; let h = 0;
  // the stability test: three growing rolls
  if (t > T.test0 && t < T.test1 + 1.2) { const u = (t - T.test0); h += -0.055 * Math.sin(u * Math.PI * 2 / 1.4) * Math.min(1, u / 1.4) * (1 + u * 0.35) * (1 - sstep(T.test1, T.test1 + 1.2, t)); }
  // under way: gentle roll
  if (t > T.depart) h += 0.012 * Math.sin(t * 1.3);
  // gust 1: lean and come back
  h += -0.36 * (sstep(T.gust1, T.gust1 + 0.7, t) - sstep(T.gust1 + 1.0, T.gust1 + 2.2, t)) * (1 + 0.08 * Math.sin(t * 9) * sstep(T.gust1, T.gust1 + 0.3, t) * (1 - sstep(T.gust1 + 1, T.gust1 + 2, t)));
  // gust 2: lean... and keep going
  h += -0.55 * sstep(T.gust2, T.gust2 + 1.4, t) - 0.75 * sstep(T.flood, T.sink1, t);
  return h;
}
function sinkY(t) { const T = SHOTS.T; return -26 * Math.pow(sstep(T.sink0, T.sink1, t), 1.6); }

// ================= per-shot staging =================
const tintDay = new THREE.Color(1, 1, 1);
function harbourBase(t, o = {}) {
  SKY.u.uSun.value.set(-0.5, 0.33, -0.8).normalize(); SKY.u.uDark.value = o.dark || 0;
  const sp = shipPath(t); SHIP.root.visible = true; SHIP.root.position.copy(sp.pos); SHIP.root.position.y = sinkY(t); SHIP.root.rotation.y = sp.yaw;
  SHIP.set({ t, heel: heelAt(t), pitch: 0.06 * sstep(SHOTS.T.flood, SHOTS.T.sink1, t), sails: o.sails ?? 0, wind: o.wind ?? 0.3, flagYaw: 0.5 });
  WATER.update(t); GULLS.update(t);
  hsun.position.copy(o.sunAt || V(0, 0, 0)).add(V(-60, 52, -80)); hsun.target.position.copy(o.sunAt || V(0, 0, 0)); const ext = o.shadowExt || 50; Object.assign(hsun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: 400 }); hsun.shadow.camera.updateProjectionMatrix();
  hsun.intensity = 3.0 * (1 - 0.5 * (o.dark || 0)); hhemi.intensity = 0.6;
  SALV.group.visible = false; WRECK2.root.visible = false;
  FOAM.forEach((f) => (f.m.visible = false)); WIND.forEach((w) => (w.m.material.opacity = 0));
}
function camSet(p, tg, fov, roll = 0) { cam.position.copy(p); cam.up.set(Math.sin(roll), Math.cos(roll), 0); cam.lookAt(tg); cam.fov = fov; cam.near = 0.1; cam.far = 2500; cam.updateProjectionMatrix(); }
const onDeck = (x, z, t) => { SHIP.root.updateMatrixWorld(true); return SHIP.heel.localToWorld(V(x, SHIP.deckY(x), z)); };
function crowd(t, mood, o = {}) {
  const r = rnd(7); CROWD.forEach((c, i) => { if (i >= (o.n || CROWD.length)) return; const b = HC[i];
    const pose = { t, ...c.look, back: o.back, face: mood(c, i), bob: 0, walk: null };
    const wave = o.wave ? Math.sin(t * 8 + c.ph) : 0;
    if (c.prop && !o.noProps) { pose.prop = { hand: 'R', kind: c.prop, rot: 0.15 * wave }; pose.armR = [60 + 20 * wave, -150, -30]; }
    else if (o.cheer) { const j = Math.abs(Math.sin(t * 7 + c.ph)); pose.armL = [-70, -170 - 30 * j, 30]; pose.armR = [70, -170 - 30 * j, -30]; pose.bob = -14 * j; }
    else if (o.cover) { pose.armL = [70, -230, 40]; pose.armR = [-70, -230, -40]; }
    put(b, V(c.x + (o.dx || 0), QUAY.top, c.z), pose, null, QUAY.top); });
}
function shotFoam(t, centre, amount, spread = 6) { const T = SHOTS.T; FOAM.forEach((f, i) => { const k = i / FOAM.length; if (k > amount) { f.m.visible = false; return; } f.m.visible = true; const a = f.a * 6.28 + t * 0.6, rr = spread * (0.4 + f.b);
  f.m.position.set(centre.x + Math.cos(a) * rr * 1.6, 0.15 + Math.abs(Math.sin(t * 6 + f.c * 9)) * 0.8 * f.c, centre.z + Math.sin(a) * rr * 0.6); const s = 0.6 + f.c * 1.6; f.m.scale.set(s, s * 0.7, 1); }); }

const T = SHOTS.T;
const STAGE = {
  // 1. establishing: crane down from the sky over the water to the ship at the quay
  harbour(t, l, d) {
    harbourBase(t, { sails: 0 });
    const u = l / d; camSet(V(mix(70, 30, ease(u)), mix(55, 9, ease(u)), mix(-95, -48, ease(u))), V(mix(-5, -2, u), mix(5, 10, u), mix(15, 4, u)), 38);
    // workers on the quay: barrel rollers, a waver
    const r = rnd(3); for (let i = 0; i < 6; i++) { const x = -18 + i * 6 + (i % 2 ? l * 0.8 : -l * 0.6); put(HB[i], V(x, QUAY.top, QUAY.z + 2.2 + (i % 3) * 1.5), { t, ...(i % 2 ? LOOK.worker : sailor(i)), walk: t * 7 + i, face: { eyes: 'dot', mouth: i % 2 ? 'smile' : 'line' } }); }
    return { exp: 1.0, bloom: 0.3, dof: 0, wide: true, heroObj: SHIP.hull, hero: 0 };
  },
  // 2. the stern and the king who wants it grander
  stern(t, l, d) {
    harbourBase(t, { sails: 0, sunAt: V(-22, 6, 4), shadowExt: 25 });
    const u = l / d; camSet(V(mix(-39, -37.5, u), mix(2.5, 3.0, u), mix(15.2, 14.6, u)), V(-24, mix(6.5, 9.5, ease(u)), 0), 42);
    const pointUp = l > 0.6; const kp = { t, ...LOOK.king, face: { eyes: 'lid', mouth: pointUp ? 'smirk' : 'line', look: [-0.6, -0.3], browAng: -0.2 }, armR: pointUp ? [-70, -260, 30] : [40, 150, -12], armL: [-30, 60, 20] };
    put(HB[0], V(-35.6, QUAY.top, QUAY.z + 2.6), kp);
    // painter on a hanging plank beside the stern, gilding
    const pl = l > 1.6; put(HB[1], V(-25.0, 5.2, 2.2), { t, ...LOOK.painter, face: { eyes: pl ? 'happy' : 'dot', mouth: pl ? 'grin' : 'o', look: [0.4, -0.2] }, prop: { hand: 'R', kind: 'brush', rot: -0.6 + 0.3 * Math.sin(t * 10) }, armR: [90, -120, -20] }, null, 6.0);
    return { exp: 1.0, bloom: 0.45, bloomT: 0.9, dof: 1.2, focus: 5.0 };
  },
  // 3. the lower gun deck: cannons both sides
  gundeck(t, l, d) {
    const u = l / d; camSet(V(mix(-0.6, -0.9, u), 1.35, mix(-15, -11, u)), V(-3.9, 0.85, mix(-6, -1, u)), 48);
    GD.water.visible = false;
    const sx = [[-2.6, -9.0], [-2.4, -6.4], [-2.7, -3.6], [-2.3, -0.8]];
    sx.forEach(([x, z], i) => { const push = i === 0 ? clamp(l / 1.6, 0, 1) : 0; put(GB[i], V(x + Math.sign(x) * push * 0.6, 0, z), { t, ...sailor(i + 1), face: { eyes: i === 1 ? 'happy' : 'dot', mouth: i === 1 ? 'grin' : 'smile', look: [-Math.sign(x) * 0.4, 0] }, armL: [-80 * Math.sign(x), 20, 20], armR: [90 * Math.sign(x), 10, -20], walk: i === 0 ? t * 6 : null }, null, 0); });
    return { scene: GD.scene, exp: 1.05, bloom: 0.45, bloomT: 1.1, dof: 0.8, focus: 5.0, tint: [1.05, 0.98, 0.9] };
  },
  // 4. the stability test: sailors stampede side to side and the ship rolls more each time
  test(t, l, d) {
    harbourBase(t, { sails: 0, sunAt: V(-8, 7, 0), shadowExt: 18 });
    const deckP = onDeck(-15.5, 0, t); const h = heelAt(t);
    camSet(onDeck(-19.5, 2.6, t).add(V(0, 2.4, 0)), onDeck(1, -0.6, t).add(V(0, 0.8, 0)), 50, -h * 0.9);
    // the runners: a column of sailors sprinting across the deck (z), reversing every 1.4 s
    for (let i = 0; i < 10; i++) { const ph = (l + i * 0.04) / 0.7; const lane = Math.floor(ph) % 2 === 0 ? 1 : -1; const f = ph % 1; const z = lane * mix(-3.4, 3.4, ease(f));
      const x = -9 + (i % 5) * 2.2 + Math.floor(i / 5) * 1.0; const p = onDeck(x, z, t);
      put(HC[i], p, { t, ...sailor(i), face: { eyes: 'dot', mouth: i % 2 ? 'open' : 'grin', open: 0.5 }, walk: t * 14 + i, run: 1, armL: [-90, -40, 20], armR: [90, -40, -20], roll: -h, flip: lane < 0 }); }
    // the worried captain in the foreground
    put(HB[0], onDeck(-16.2, 1.5, t), { t, ...LOOK.captain, face: { eyes: l > 2 ? 'wide' : 'dot', mouth: l > 2 ? 'o' : 'frown', sweat: l > 1.5 ? 1 : 0, look: [0.2, 0], browAng: -0.4, brow: 1 }, armR: [40, 140, -12], roll: -h * 0.6 });
    return { exp: 1.0, bloom: 0.3, dof: 1.2, focus: 3.5 };
  },
  // 5. the admiral stops it... reads the king's letter... shrugs: sail anyway
  admiral(t, l, d) {
    harbourBase(t, { sails: 0, sunAt: V(-8, 7, 0), shadowExt: 14 });
    const p0 = onDeck(-9.2, 0.0, t); camSet(p0.clone().add(V(0.4, 1.35, 4.6)), p0.clone().add(V(0, 1.1, -0.2)), 42);
    const stop = l < 1.3, read = l >= 1.3 && l < 2.4, go = l >= 2.4;
    put(HB[0], onDeck(-8.6, 0.2, t), { t, ...LOOK.admiral, face: { eyes: read ? 'wide' : go ? 'lid' : 'dot', mouth: stop ? 'open' : read ? 'o' : 'smirk', open: 0.8, look: read ? [0.5, 0.3] : [-0.3, 0], browAng: stop ? 0.5 : 0, sweat: read ? 1 : 0 },
      armR: kf([[0, [40, 150, -12]], [0.18, [90, -230, -30]], [1.15, [90, -230, -30]], [1.45, [60, 40, -20]], [2.3, [60, 40, -20]], [2.6, [170, -60, -20]]], l),
      armL: kf([[0, [-30, 140, 12]], [2.3, [-30, 140, 12]], [2.6, [-90, -90, 40]]], l) });
    put(HB[1], onDeck(-10.6, 0.1, t), { t, ...LOOK.captain, face: { eyes: go ? 'shut' : 'dot', mouth: go ? 'frown' : 'line', look: [0.6, 0] }, armL: kf([[0, [-30, 150, 12]], [2.45, [-30, 150, 12]], [2.8, [40, -190, -10]]], l) });
    if (l > 0.9) put(HB[2], onDeck(mix(-4, -7.0, clamp((l - 0.9) / 0.4, 0, 1)), 0.4, t), { t, ...LOOK.messenger, face: { eyes: 'dot', mouth: 'smile', look: [-0.6, 0] }, prop: { hand: 'R', kind: 'scroll' }, armR: [-90, -40, -20], walk: l < 1.3 ? t * 8 : null });
    // frozen sailors in the background
    for (let i = 0; i < 4; i++) put(HC[i], onDeck(-12 + i * 1.6, -3.0, t), { t, ...sailor(i), face: { eyes: 'wide', mouth: 'o' }, armL: [-90, -40, 20], armR: [90, -40, -20], legs: [[-30, 0], [40, 0]] });
    return { exp: 1.0, bloom: 0.3, dof: 3.0, focus: 4.8 };
  },
  // 6. departure: the quay packed with people waving, the ship sets sail
  depart(t, l, d) {
    harbourBase(t, { sails: clamp(l / 2.2, 0, 1), wind: 0.5, sunAt: V(10, 0, 0), shadowExt: 40 });
    const u = l / d; camSet(V(mix(-14, -10, u), 3.6, QUAY.z + 6.5), V(mix(4, 10, u), 6, -6), 42);
    crowd(t, (c) => ({ eyes: 'happy', mouth: 'grin' }), { back: true, wave: true });
    return { exp: 1.02, bloom: 0.3, dof: 1.0, wide: true, heroObj: SHIP.hull, hero: 0 };
  },
  // 7. first gust: she leans... and comes back; cheers
  gust1(t, l, d) {
    harbourBase(t, { sails: 1, wind: 0.5 + 0.8 * sstep(T.gust1, T.gust1 + 0.5, t) * (1 - sstep(T.gust1 + 1, T.gust1 + 2, t)), sunAt: shipPath(t).pos, shadowExt: 45 });
    const sp = shipPath(t).pos; camSet(sp.clone().add(V(mix(-6, 4, l / d), 7, -62)), sp.clone().add(V(0, 13, 0)), 42);
    windStreaks(t, sp, sstep(T.gust1 - 0.2, T.gust1 + 0.3, t) * (1 - sstep(T.gust1 + 0.9, T.gust1 + 1.5, t)));
    return { exp: 1.0, bloom: 0.3, dof: 0 };
  },
  // 8. second gust: further... and further
  gust2(t, l, d) {
    harbourBase(t, { sails: 1, wind: 1.3, sunAt: shipPath(t).pos, shadowExt: 45 });
    const sp = shipPath(t).pos; camSet(sp.clone().add(V(-2, 5, mix(-46, -40, l / d))), sp.clone().add(V(0, 11, 0)), 42);
    windStreaks(t, sp, sstep(T.gust2 - 0.2, T.gust2 + 0.3, t));
    return { exp: 0.98, bloom: 0.3, dof: 0 };
  },
  // 9a. the open gun ports dip under: the sea pours in
  ports(t, l, d) {
    harbourBase(t, { sails: 1, wind: 1.3, sunAt: shipPath(t).pos, shadowExt: 25 });
    const sp = shipPath(t).pos; camSet(sp.clone().add(V(-9, 0.8, -17)), sp.clone().add(V(-2, 2.2, -4)), 44);
    shotFoam(t, sp.clone().add(V(-3, 0, -5.5)), 0.8 * sstep(0, 0.6, l), 8);
    return { exp: 0.95, bloom: 0.25, dof: 2.0, focus: 8 };
  },
  // 9b. inside: the deck tilts, water floods through the ports
  flood(t, l, d) {
    const h = heelAt(t); camSet(V(0.2, 1.3, -6), V(-0.6, 0.8, 4), 56, h * 0.9);
    GD.water.visible = true; GD.water.position.y = mix(0.0, 1.4, ease(l / d)); GD.water.rotation.set(-Math.PI / 2, -h, 0);
    put(GB[0], V(0.8, Math.min(0.0, 0), 0.5), { t, ...sailor(3), face: { eyes: 'wide', mouth: 'open', open: 1, sweat: 1, look: [-0.5, 0] }, armL: [-110, -120, 30], armR: [110, -120, -30], roll: h * 0.9 }, null, 0);
    return { scene: GD.scene, exp: 1.05, bloom: 0.5, bloomT: 1.0, dof: 1.6, focus: 4.5, tint: [0.95, 1.0, 1.05] };
  },
  // 10a. wide from the quay: she rolls over and goes down
  sink(t, l, d) {
    harbourBase(t, { sails: 1, wind: 1, sunAt: shipPath(t).pos, shadowExt: 60 });
    const sp = shipPath(t).pos; camSet(V(sp.x - 50, 4.2, QUAY.z + 6.2), sp.clone().add(V(0, mix(10, 3, ease(l / d)), 0)), 34);
    crowd(t, () => ({}), { back: true, noProps: true, n: 30, dx: sp.x - 42 });
    shotFoam(t, sp, sstep(0.3, 2.5, l) * (1 - sstep(4.0, 5.0, l) * 0.6), 18);
    return { exp: 0.98, bloom: 0.28, dof: 0.8, wide: true, heroObj: SHIP.hull, hero: 0 };
  },
  // 10b. the crowd, frozen in shock
  shock(t, l, d) {
    harbourBase(t, { sails: 1, wind: 1, sunAt: V(0, 0, QUAY.z), shadowExt: 20 });
    camSet(V(mix(-3.9, -3.4, l / d), 2.9, QUAY.z - 2.6), V(-3.6, 2.75, QUAY.z + 2), 46);
    const r = rnd(77); for (let i = 0; i < 6; i++) { const lk = CROWD_LOOK(r); const zz = QUAY.z + 1.3 + (i % 2) * 1.1; const drop = i === 2 && l > 0.6;
      put(HB[i], V(-6.4 + i * 1.15, QUAY.top, zz), { t, ...lk, face: { eyes: 'wide', mouth: i % 3 ? 'o' : 'open', open: 0.9, look: [0.35, -0.1], sweat: i % 3 === 0 ? 1 : 0 }, armL: i === 4 ? [80, -230, 40] : [-40, 150, 12], armR: i === 4 ? [-80, -230, -40] : [40, 150, -12],
        prop: i === 2 ? { hand: 'R', kind: 'flag', rot: drop ? 2.2 * Math.min(1, (l - 0.6) / 0.4) : 0 } : null }); }
    return { exp: 1.0, bloom: 0.25, dof: 0.8, focus: 9 };
  },
  // 11. the inquiry: everyone points at everyone; nobody is punished
  inquiry(t, l, d) {
    const u = l / d; camSet(V(0.2, 1.8, mix(7.8, 7.0, u)), V(0.2, 1.4, -1.5), 50);
    const ph = l < 1.0 ? 0 : l < 2.0 ? 1 : 2;
    put(RB[0], V(0.4, 1.0, -2.8), { t, ...LOOK.judge, face: { eyes: ph === 2 ? 'shut' : 'lid', mouth: ph === 2 ? 'line' : 'frown', look: [ph === 0 ? -0.5 : 0.5, 0] }, armR: kf([[0, [40, 120, -10]], [1.9, [40, 120, -10]], [2.15, [140, -160, -20]]], l), armL: kf([[0, [-40, 120, 10]], [1.9, [-40, 120, 10]], [2.15, [-140, -160, 20]]], l), prop: ph === 2 ? null : { hand: 'R', kind: 'gavel' }, shadow: false }, null, 1.0);
    put(RB[1], V(-1.35, 0, 0.6), { t, ...LOOK.captain, face: { eyes: 'dot', mouth: ph === 1 ? 'open' : 'frown', open: 0.5, browAng: 0.5, look: [0.6, 0] }, armR: kf([[0, [40, 150, -12]], [0.15, [190, -60, -10]], [0.95, [190, -60, -10]], [1.15, [10, -270, -10]], [1.9, [10, -270, -10]], [2.1, [190, -60, -10]]], l) });
    put(RB[2], V(1.8, 0, 0.6), { t, ...LOOK.wright, face: { eyes: 'dot', mouth: ph === 1 ? 'open' : 'frown', open: 0.5, browAng: 0.5, look: [-0.6, 0] }, armL: kf([[0, [-40, 150, 12]], [0.35, [-190, -60, 10]], [0.95, [-190, -60, 10]], [1.15, [-10, -270, 10]], [1.9, [-10, -270, 10]], [2.1, [-190, -60, 10]]], l) });
    return { scene: RM.scene, exp: 1.05, bloom: 0.4, bloomT: 1.0, dof: 1.6, focus: 5.5, tint: [1.05, 1.0, 0.92] };
  },
  // 12. down on the seabed: cold, dark water; the shipworm shivers and gives up
  seabed(t, l, d) {
    SB.update(t); const u = l / d;
    camSet(V(mix(30, 13, ease(u)), mix(-15, -25.5, ease(u)), mix(-36, -19, ease(u))), V(mix(2, 5, u), mix(-22, -26.2, u), mix(0, -6.5, u)), 44);
    const wx = 7.5 - 1.2 * Math.min(1, l / 1.6) + 2.2 * sstep(2.4, 3.8, l); const cold = l > 1.5;
    WORM.mesh.visible = true; WORM.update(cam, V(wx, -27.6, -7.6), { t, shiver: cold ? 1 : 0, cold, turn: l > 2.4 ? 1 : 0, wiggle: 1, shadow: false }, new THREE.Color(0.75, 0.95, 1.0));
    return { scene: SB.scene, heroObj: WORM.mesh, hero: 0, exp: 1.5, bloom: 0.5, bloomT: 0.7, dof: 1.0, focus: 14, tint: [0.85, 1.0, 1.05], vig: 0.4 };
  },
  // 13. 1961: pontoons, cables, and up she comes, streaming water; flashbulbs
  salvage(t, l, d) {
    harbourBase(t, { sails: 0, dark: 0.25, sunAt: V(0, 0, -40), shadowExt: 50 }); SHIP.root.visible = false; SALV.group.visible = true; SALV.group.position.set(0, 0, -40);
    WRECK2.root.visible = true; WRECK2.root.position.set(0, mix(-8, 0.6, ease(l / d)), -40); WRECK2.heel.rotation.x = 0;
    const u = l / d; camSet(V(mix(-20, -15, u), 9.5, -40 + 26), V(-2, mix(2, 5, u), -40), 46);
    shotFoam(t, V(0, 0, -40), 0.9, 14);
    for (let i = 0; i < 5; i++) { const fl = Math.max(0, 1 - Math.abs(((t * 1.3 + i * 0.37) % 1.6) - 0.1) * 8); put(HB[i], V(-15.5 + i * 2.0, 3.6, -40 + 11.8), { t, ...RETRO_LOOK(rnd(31 + i)), face: { eyes: 'dot', mouth: i % 2 ? 'o' : 'smile', look: [0.4, -0.2] }, prop: { hand: 'R', kind: 'flashcam' }, flash: fl, armR: [10, -60, -20], armL: [80, -40, 20] }, null, 3.55); }
    return { heroObj: WRECK2.hull, hero: 0, exp: 0.95, bloom: 0.45, bloomT: 0.9, dof: 1.0, focus: 9, sat: 0.85, tint: [0.98, 0.98, 1.02], flash: 0 };
  },
  // 14. today: the museum hall, the ship lit in the dark, visitors looking up
  museum(t, l, d) {
    const u = l / d; camSet(V(mix(2.4, 1.2, ease(u)), mix(-3.1, -2.4, ease(u)), mix(22.5, 21.6, u)), V(mix(-4, -2, u), mix(-1.5, 2.5, ease(u)), 0), 50);
    const r = rnd(51); for (let i = 0; i < 8; i++) { const x = -3.2 + i * 0.95 + r() * 0.3; const lk = MOD_LOOK(r); const ph = r() < 0.35;
      put(MB[i], V(x, -5.2, 15.4 + (i % 2) * 0.9 + r() * 0.3), { t, ...lk, back: !ph && r() < 0.5, face: { eyes: i % 3 ? 'dot' : 'wide', mouth: i % 3 ? 'smile' : 'o', look: [-0.4, -0.5] }, prop: ph ? { hand: 'R', kind: 'phone' } : null, armR: ph ? [20, -200, -20] : [40, 150, -12] }, new THREE.Color(0.9, 0.85, 0.8), -5.2); }
    return { scene: MU.scene, heroObj: MUSHIP.hull, hero: 0, wide: true, exp: 1.5, bloom: 0.45, bloomT: 0.9, dof: 0.9, focus: 8, vig: 0.35, tint: [1.05, 1.0, 0.95] };
  },
};
function windStreaks(t, sp, k) { WIND.forEach((w, i) => { const ph = (t * 0.9 + w.ph) % 1; w.m.position.set(sp.x - 40 + ph * 80, w.y, sp.z + w.z); w.m.material.opacity = 0.55 * k * Math.sin(Math.PI * ph); w.m.lookAt(cam.position); }); }

// ================= frame =================
function shotAt(t) { for (const s of SHOTS.list) if (t < s.t1) return s; return SHOTS.list[SHOTS.list.length - 1]; }
function render(t) {
  t = clamp(t, 0, DUR - 1e-4); hideAll(); WORM.mesh.visible = false;
  const s = shotAt(t); const l = t - s.t0, d = s.t1 - s.t0;
  STAGE[s.stage](t, l, d); hideAll(); WORM.mesh.visible = false;   // pass 1 settles the camera
  const o = STAGE[s.stage](t, l, d) || {};
  cam.updateMatrixWorld(true);
  const subjects = used.map((u, i) => ({ id: `char${i}`, kind: 'char', back: u.back, box: charBox(u), at: u.feet.clone().add(new THREE.Vector3(0, 1.2 * u.board.sizeM / 2.3, 0)) }));
  const heroObj = o.heroObj || ((o.scene || HS) === HS && !used.length ? SHIP.hull : null);
  if (heroObj) { const ob = objBox(heroObj); if (ob) subjects.unshift({ id: 'object', kind: 'object', box: ob.box, at: ob.centre }); }
  const hi = o.hero ?? 0; if (subjects[hi]) subjects[hi].hero = true;
  // focus follows the hero every frame (from the camera to the subject), unless the stage pins it
  if (o.dof > 0 && subjects[hi] && !o.pinFocus) o.focus = cam.position.distanceTo(subjects[hi].at);
  LAST = { shot: s.stage, wide: !!o.wide, subjects: subjects.map(({ at, ...r }) => r) };
  // shot boundary fades: quick dip at the very start and end of the film
  const fade = sstep(0, 0.4, t) * (1 - sstep(DUR - 1.0, DUR - 0.05, t));
  POST.render(o.scene || HS, cam, { ...o, fade });
}
window.DUR = DUR; window.FPS = FPS; window.render = render; window.SUBJECTS = (t) => { render(t); return { W, H, ...LAST }; };
window.grabPNG = (t) => { render(t); return canvas.toDataURL('image/png').split(',')[1]; };
window.grab = (t) => { render(t); return canvas.toDataURL('image/jpeg', 0.95).split(',')[1]; };
render(0); window.READY = true;
