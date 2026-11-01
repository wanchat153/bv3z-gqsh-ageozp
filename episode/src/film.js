// The Lift — wordless toon short. A man races a closing lift; it keeps bouncing back open (his hand, his foot,
// then a mysterious leaf). In slow motion he sees the culprit: the potted plant shedding a leaf through the
// safety beam. He plucks the loose sprig, the doors finally shut — ding — they reopen on the same lobby and
// another leaf drifts down. Deadpan. Every frame is a pure function of t.
import * as THREE from './three.module.js';
import { DUR, T, G, SLOW, tau, EV } from './timeline.js';
import { clamp, mix, sstep, toon } from './toon.js';
import { buildSet, BZ, DW, BEAMY, PLANT } from './set.js';
import { makeFlat, drawMan, drawManArms, drawBulb } from './flat.js';

const W = innerWidth, HH = innerHeight;
const canvas = document.createElement('canvas');
document.body.style.margin = '0'; document.body.style.background = '#000';
document.body.appendChild(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, HH, false);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, W / HH, 0.01, 200);
const QS = new URLSearchParams(location.search);

const hemi = new THREE.HemisphereLight(0xfff8ee, 0xe6d6bc, 1.3); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1dc, 2.1); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
Object.assign(sun.shadow.camera, { left: -3.6, right: 3.6, top: 3.6, bottom: -3.6, near: 0.5, far: 30 });
scene.add(sun); scene.add(sun.target);
const SET = buildSet(scene);

// ---------- flat characters ----------
const MAN = makeFlat(2.1, 2048, drawMan); scene.add(MAN.mesh); scene.add(MAN.shadow);
const ARMS = makeFlat(2.1, 1024, drawManArms); scene.add(ARMS.mesh); ARMS.mesh.renderOrder = 10;
const BULB = makeFlat(0.34, 512, drawBulb); scene.add(BULB.mesh);
MAN.shadow.material.color.set(0x5a4030);

// ---------- the drifting leaf (3D) + ghost trail + dotted arc for the slow clue ----------
const leafGeo = new THREE.SphereGeometry(0.06, 14, 10); leafGeo.scale(1.5, 0.3, 0.9);
const leaf = new THREE.Group(); const leafMesh = new THREE.Mesh(leafGeo, toon(0x5bb24a)); leafMesh.castShadow = true; leaf.add(leafMesh); scene.add(leaf);
const NG = 8, GH = []; for (let i = 0; i < NG; i++) { const g = new THREE.Mesh(leafGeo, new THREE.MeshBasicMaterial({ color: 0x6cc05a, transparent: true, opacity: 0, depthWrite: false })); scene.add(g); GH.push(g); }
const ND = 20, DOTS = []; const dotMat = new THREE.MeshBasicMaterial({ color: 0x3a6a2a, transparent: true, opacity: 0, depthWrite: false });
for (let i = 0; i < ND; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 6), dotMat.clone()); scene.add(d); DOTS.push(d); }

// ---------- door motion ----------
// open: 0 = shut (meet at x=0), 1 = fully open. Each door slides outward by DW.
// near-shut caps stay ~0.34 on the setbacks so his reaction still reads in the gap; only the final close hits 0.
const DOORKEYS = [
  [0, 1], [T.d1close0, 1], [T.d1shut, 0.34], [T.d1shut + 0.06, 0.34], [T.d1open1, 1],
  [T.stepIn1, 1], [T.d2close0, 1], [T.d2catch, 0.2], [T.d2catch + 0.06, 0.2], [T.d2open1, 0.9],
  [T.yankDone, 0.9], [T.d3close0, 0.9], [T.leaf1, 0.34], [T.leaf1 + 0.05, 0.34], [T.d3open1, 0.92],
  [T.d4close0, 0.92], [T.leaf2, 0.34], [T.leaf2 + 0.05, 0.34], [T.d4open1, 0.92],
  [T.slowin, 0.92], [T.slowout, 0.92], [T.reach0, 0.92], [T.back1, 0.92],
  [T.dFinal0, 0.92], [T.dFinalShut, 0.0], [T.ding, 0.0],
  [T.reveal, 1.0], [T.leafTwist, 1.0], [DUR, 1.0],
];
function doorOpen(t) {
  let i = 0; while (i < DOORKEYS.length - 2 && t > DOORKEYS[i + 1][0]) i++;
  const a = DOORKEYS[i], b = DOORKEYS[i + 1];
  // snappier easing on fast motor moves, soft on the bounce back
  const u = sstep(a[0], b[0], t);
  return mix(a[1], b[1], u);
}

// ---------- leaf drops ----------
// each: start time, duration (film-time), x start, x drift, top y, z. The clue drop is long (slow motion reads).
// each leaf LEAVES THE PLANT (x0 near the plant's foliage) and drifts RIGHT into the door opening, crossing the
// safety beam in front of him, so the "the plant is the culprit" logic reads. x = x0 + dx*ease (dx>0 = rightward).
const PLTOP = PLANT.x + 0.14;        // where the foliage sits
const DROPS = [
  { t0: T.d3close0 + 0.05, t1: T.leaf1 + 0.7, x0: PLTOP, dx: 1.05, yTop: 1.68, z: -1.12, clue: false },
  { t0: T.d4close0 + 0.05, t1: T.leaf2 + 0.7, x0: PLTOP, dx: 1.1, yTop: 1.62, z: -1.12, clue: false },
  { t0: T.leafSlow0, t1: T.leafSlowCross + 1.6, x0: PLTOP, dx: 1.1, yTop: 1.7, z: -1.12, clue: true },
  { t0: T.leafTwist, t1: T.leafTwist + 1.8, x0: PLTOP, dx: 1.08, yTop: 1.66, z: -1.12, clue: false },
];
function leafPos(dp, t) {
  const u = clamp((t - dp.t0) / (dp.t1 - dp.t0), 0, 1);
  const yb = 0.06;                                  // settles on the threshold floor
  const y = mix(dp.yTop, yb, sstep(0, 1, u));
  const sway = Math.sin(u * Math.PI * 3 + 1) * 0.08 * (1 - u * 0.3);
  const x = dp.x0 + dp.dx * sstep(0, 1, u) + sway;  // drifts from the plant into the opening
  const z = mix(dp.z, BZ - 0.02, sstep(0, 1, u));
  const spin = u * (dp.clue ? 8 : 14);
  return { pos: new THREE.Vector3(x, y, z), u, spin };
}
function activeDrop(t) { for (const dp of DROPS) if (t >= dp.t0 && t <= dp.t1 + 0.4) return dp; return null; }

// ---------- camera ----------
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const KEYS = [
  [0.0, V(2.3, 1.62, 3.3), V(0.35, 1.12, -0.7), 42],
  [T.notice, V(1.7, 1.55, 3.0), V(0.25, 1.12, -0.8), 42],
  [T.run, V(1.0, 1.45, 2.45), V(0.12, 1.12, -0.95), 41],
  [T.d1shut, V(0.72, 1.4, 2.15), V(0.08, 1.12, -1.0), 40],
  [T.d1open1 + 0.2, V(0.66, 1.4, 2.15), V(0.06, 1.12, -1.0), 40],
  [T.stepIn1, V(0.56, 1.4, 2.1), V(0.05, 1.12, -1.05), 40],
  [T.d2catch, V(0.5, 1.3, 1.95), V(0.06, 1.0, -1.05), 40],
  [T.yankDone, V(0.52, 1.36, 2.05), V(0.05, 1.08, -1.05), 40],
  [T.leaf1, V(0.5, 1.36, 2.0), V(0.05, 1.1, -1.05), 40],
  [T.baffled, V(0.6, 1.4, 2.1), V(0.08, 1.12, -1.0), 40],
  [T.leaf2, V(0.55, 1.4, 2.05), V(0.06, 1.12, -1.0), 40],
  [T.lookUp, V(0.5, 1.46, 2.2), V(-0.1, 1.18, -1.0), 42],
  // slow clue — pull back and favour the plant + doorway so the leaf's whole arc from the plant reads
  [T.slowin + 0.3, V(-0.05, 1.46, 2.5), V(-0.5, 1.16, -1.0), 46],
  [T.leafSlowCross, V(0.0, 1.36, 2.35), V(-0.42, 1.06, -1.0), 45],
  [T.realize, V(0.12, 1.4, 2.2), V(-0.24, 1.1, -1.0), 43],
  // idea + pluck — favour man and plant together
  [T.eureka, V(-0.15, 1.42, 2.0), V(-0.45, 1.08, -0.95), 40],
  [T.pluck, V(-0.25, 1.38, 1.95), V(-0.5, 1.0, -0.9), 40],
  [T.back1, V(0.4, 1.42, 2.1), V(0.05, 1.12, -1.0), 40],
  // final close — slow push in
  [T.dFinal0, V(0.42, 1.42, 2.08), V(0.06, 1.14, -1.02), 40],
  [T.dFinalShut, V(0.3, 1.4, 1.9), V(0.05, 1.14, -1.05), 39],
  [T.exhale + 0.4, V(0.28, 1.4, 1.86), V(0.05, 1.14, -1.06), 39],
  // ding reveal — nudge wider
  [T.ding, V(0.5, 1.45, 2.2), V(0.08, 1.16, -1.05), 41],
  [T.leafTwist, V(0.42, 1.42, 2.05), V(0.03, 1.14, -1.08), 40],
  // deadpan — settle a touch in
  [T.deadpan, V(0.34, 1.4, 1.82), V(0.04, 1.14, -1.12), 39],
  [DUR, V(0.32, 1.4, 1.74), V(0.03, 1.14, -1.14), 39],
];
function keyCam(K, t) {
  let i = 0; while (i < K.length - 2 && t > K[i + 1][0]) i++;
  const a = K[i], b = K[i + 1]; const u = sstep(a[0], b[0], t);
  return { pos: a[1].clone().lerp(b[1], u), tgt: a[2].clone().lerp(b[2], u), fov: mix(a[3], b[3], u) };
}

// ---------- world point -> flat canvas units ----------
const _f = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3();
function toCanvas(flat, P) {
  _f.set(0, 0, -1).applyQuaternion(camera.quaternion); _r.set(1, 0, 0).applyQuaternion(camera.quaternion); _u.set(0, 1, 0).applyQuaternion(camera.quaternion);
  const C = camera.position, A = flat.mesh.position; const d = P.clone().sub(C); const n = _f.clone().negate();
  const k = A.clone().sub(C).dot(n) / d.dot(n); const X = C.clone().addScaledVector(d, k).sub(A);
  return [X.dot(_r) / flat.sizeM * 1024, -X.dot(_u) / flat.sizeM * 1024];
}

// ---------- the man ----------
const OUT_R = new THREE.Vector3(1.55, 0.9, 0.05);
const THRESH = new THREE.Vector3(0.18, 0.9, -0.5);
const INSIDE = new THREE.Vector3(0.05, 0.9, -1.5);
const REACH = new THREE.Vector3(-0.5, 0.9, -0.85);
const GAP = new THREE.Vector3(0.0, BEAMY, BZ - 0.02);       // the closing-door gap at beam height
function manAt(t) {
  const m = { anchor: INSIDE.clone(), mood: 'happy', look: [0, 0], lookW: null, hands: { L: { c: [-150, 30] }, R: { c: [150, 30] } }, shape: {}, over: false, tilt: 0, sq: [1, 1], tuft: 0, sweat: false, blink: 0, ground: 0, held: false };
  const w = tau(t);
  m.blink = (Math.sin(w * 1.3) > 0.985 || Math.sin(w * 0.77 + 2) > 0.99) ? 1 : 0;

  if (t < T.run) {
    // stroll in from the right with a real walk cycle, then spot the closing doors
    const u = sstep(T.walkIn0, T.notice + 0.15, t); m.anchor.copy(OUT_R).lerp(THRESH, u);
    const walking = t > T.walkIn0 + 0.05 && t < T.notice + 0.05; const ph = w * 9;
    m.walk = ph; m.walkAmp = walking ? 1 : 0;
    m.dyBounce = walking ? -Math.abs(Math.sin(ph)) * 15 : 0;
    const sw = walking ? Math.sin(ph) * 32 : 0;
    m.hands.L = { c: [-150, 26 - sw] }; m.hands.R = { c: [150, 26 + sw] };
    m.mood = 'happy'; m.look = [-0.4, 0.1];
    if (t > T.notice) { m.mood = 'horror'; m.walkAmp = 0; m.dyBounce = 0; m.look = [-0.2, -0.1]; m.tuft = Math.exp(-(t - T.notice) * 5) * Math.sin((t - T.notice) * 30); }
  } else if (t < T.stepIn0) {
    // bolt + lunge, stick a hand in the gap
    const u = sstep(T.run, T.d1lunge, t); m.anchor.copy(THRESH); m.anchor.x = mix(THRESH.x + 0.5, THRESH.x, u);
    m.mood = t < T.d1shut ? 'nervous' : 'horror'; m.sweat = true; m.over = true;
    m.lookW = GAP; m.shape.R = 'point'; m.hands.R = { w: GAP };
    m.hands.L = { c: [-130, -30] };
    if (t > T.d1shut) { const e = Math.exp(-(t - T.d1shut) * 8); m.sq = [1 + 0.05 * e, 1 - 0.06 * e]; m.hands.R = { w: GAP.clone().add(V(0, 0, 0)) }; m.tilt = -0.05; }
  } else if (t < T.d2close0) {
    // step inside, relieved
    const u = sstep(T.stepIn0, T.stepIn1, t); m.anchor.copy(THRESH).lerp(INSIDE, u);
    m.mood = 'happy'; m.look = [0, 0]; m.hands.L = { c: [-150, 25] }; m.hands.R = { c: [150, 25] };
  } else if (t < T.yank) {
    // the closing doors pinch his necktie — he's tugged toward the gap
    m.anchor.copy(INSIDE); m.mood = 'happy';
    if (t > T.d2close0 + 0.2) m.look = [0, -0.1];
    if (t > T.d2catch - 0.03) {
      const e = Math.exp(-(t - T.d2catch) * 5);
      m.mood = t < T.d2catch + 0.3 ? 'horror' : 'nervous';
      m.anchor.z += 0.13 * (1 - e); m.tilt = 0.15 * (1 - e * 0.4);     // pulled toward the doors
      m.look = [0, 0.6]; m.lookW = V(0.0, 0.55, BZ - 0.02);
      m.hands.L = { c: [-150, 30] }; m.hands.R = { c: [150, 30] };
    }
  } else if (t < T.d3close0) {
    // he grabs the tie with both hands and yanks it free, then rocks back
    const e = Math.exp(-(t - T.yank) * 5); m.anchor.copy(INSIDE); m.anchor.z += 0.13 * e;
    m.mood = t < T.yankDone ? 'despair' : 'suspicious';
    m.shape = { L: 'open', R: 'open' }; m.over = true;
    m.hands.L = { c: [-24, -120] }; m.hands.R = { c: [24, -120] };     // both hands at the chest, pulling the tie
    if (t > T.yankDone) { m.over = false; m.hands.L = { c: [-150, 25] }; m.hands.R = { c: [150, 25] }; m.look = [0, 0.3]; m.tilt = 0.04 * e; }
  } else if (t < T.lookUp) {
    // doors close, a leaf crosses, they bounce — twice. he gets baffled.
    m.anchor.copy(INSIDE); m.mood = 'suspicious'; m.look = [-0.3, -0.2];
    if ((t > T.leaf1 - 0.1 && t < T.d3open1 + 0.3) || (t > T.leaf2 - 0.1 && t < T.d4open1 + 0.3)) { m.mood = 'horror'; m.lookW = GAP; }
    if (t > T.baffled && t < T.leaf2 - 0.1) { m.mood = 'suspicious'; m.look = [0.5, -0.1]; m.tilt = 0.05; }
  } else if (t < T.think) {
    // watch the slow leaf fall — eyes track it
    m.anchor.copy(INSIDE); m.mood = t < T.realize ? 'nervous' : 'think';
    const dp = DROPS[2]; const lp = leafPos(dp, t); m.lookW = lp.pos;
    if (t > T.realize) { m.mood = 'think'; }
  } else if (t < T.reach0) {
    // the idea
    m.anchor.copy(INSIDE); m.mood = 'think'; m.look = [-0.5, -0.6]; m.hands.R = { c: [30, -255] }; m.hands.L = { c: [-30, -110] }; m.tilt = -0.06;
    if (t > T.eureka) { const e = Math.exp(-(t - T.eureka) * 7); m.mood = 'eureka'; m.look = [-0.6, -0.2]; m.hands.R = { c: [175, -470] }; m.shape.R = 'point'; m.tilt = 0; m.sq = [1 - 0.07 * e, 1 + 0.1 * e]; m.tuft = e * Math.sin((t - T.eureka) * 25); }
  } else if (t < T.back0) {
    // step to the plant and pluck the loose sprig
    const u = sstep(T.reach0, T.pluck, t); m.anchor.copy(INSIDE).lerp(REACH, sstep(T.reach0, T.reach0 + 0.5, t));
    m.mood = 'suspicious'; m.over = true; m.shape.R = 'open';
    const sprigW = PLANT.clone().add(V(0.28, 1.02, 0.14));
    m.lookW = sprigW; m.hands.R = { w: sprigW.clone().add(V(0.02, 0.02, 0)) }; m.hands.L = { c: [-140, 10] };
    if (t > T.pluck) { m.held = true; m.mood = 'happy'; const pulled = sprigW.clone().add(V(0.25 * sstep(T.pluck, T.back0, t), 0.1, 0.1)); m.hands.R = { w: pulled }; m.lookW = pulled; }
  } else if (t < T.dFinal0) {
    // step back in, pleased, holding the sprig
    const u = sstep(T.back0, T.back1, t); m.anchor.copy(REACH).lerp(INSIDE, u); m.mood = 'happy'; m.held = true;
    m.hands.R = { c: [150, -40] }; m.hands.L = { c: [-150, 25] }; m.look = [0, 0];
  } else if (t < T.ding) {
    // the doors glide shut; relief
    m.anchor.copy(INSIDE); m.held = true;
    if (t < T.dFinalShut) { m.mood = 'happy'; m.look = [0.2, 0.1]; }
    else { const e = Math.exp(-(t - T.exhale) * 3); m.mood = t < T.exhale + 0.5 ? 'cheer' : 'happy'; m.sq = [1 + 0.03 * e, 1 - 0.04 * e]; m.look = [0, 0.1]; }
  } else {
    // ding — doors reopen, a leaf drifts, deadpan to camera
    m.anchor.copy(INSIDE); m.held = true;
    m.mood = t < T.deadpan ? 'horror' : 'deadpan';
    const dp = DROPS[3]; const lp = leafPos(dp, t);
    if (t < T.deadpan) m.lookW = lp.pos; else { m.look = [0.0, 0.0]; m.lookW = null; }
    if (t > T.deadpan) { m.tilt = 0.05 * sstep(T.deadpan, T.deadpan + 1.0, t); m.blink = (t > T.deadpan + 1.1 && t < T.deadpan + 1.4) ? 1 : 0; }
  }
  return m;
}

// ---------- per-frame setup ----------
let POST = {};
function setup(t) {
  // doors
  const op = doorOpen(t);
  SET.doorL.position.x = -DW / 2 - op * DW; SET.doorR.position.x = DW / 2 + op * DW;
  // floor indicator: up-arrow lit while "travelling"; flips to show arrival at the end
  const travelling = t > T.dFinalShut && t < T.ding; SET.arrowUp.material.color.setHex(travelling ? 0xff9d3a : 0x3a4048);
  SET.setFloor(t > T.ding ? '1' : (t > T.dFinalShut ? '2' : '1'));
  // clock hands creep
  SET.hands[0].rotation.z = -t * 0.05; SET.hands[1].rotation.z = -1.2 - t * 0.004;

  // camera first (leaf/man look need it)
  const c = keyCam(KEYS, t);
  camera.position.copy(c.pos); camera.up.set(0, 1, 0); camera.lookAt(c.tgt); camera.fov = c.fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);

  // leaf drops
  const dp = activeDrop(t); let beamGlow = 0;
  leaf.visible = !!dp;
  if (dp) {
    const lp = leafPos(dp, t); leaf.position.copy(lp.pos); leaf.children[0].rotation.set(lp.spin * 0.6, lp.spin, lp.spin * 0.3);
    if (Math.abs(lp.pos.y - BEAMY) < 0.12 && Math.abs(lp.pos.x) < DW) beamGlow = 1 - Math.abs(lp.pos.y - BEAMY) / 0.12;
    // ghost trail + dotted arc only for the clue drop
    const clue = dp.clue;
    GH.forEach((g, i) => {
      if (!clue) { g.visible = false; return; }
      const tt = t - (i + 1) * 0.16 * (1 / Math.max(SLOW, 0.2)); const on = tt >= dp.t0 && tt <= t;
      g.visible = on; if (!on) return; const q = leafPos(dp, tt); g.position.copy(q.pos); g.rotation.set(q.spin * 0.6, q.spin, 0); g.material.opacity = 0.28 * (1 - i / NG);
    });
    DOTS.forEach((d, i) => {
      if (!clue) { d.visible = false; return; }
      const u = i / (ND - 1); const tt = mix(dp.t0, Math.min(t, dp.t1), u); const on = tt <= t && t > dp.t0 + 0.2;
      d.visible = on; if (!on) return; const q = leafPos(dp, tt); d.position.copy(q.pos); d.material.opacity = 0.5 * (1 - sstep(T.slowout, T.slowout + 0.6, t));
    });
  } else { GH.forEach((g) => (g.visible = false)); DOTS.forEach((d) => (d.visible = false)); }
  // beam opacity: faint always, bright when broken
  SET.beam.material.opacity = 0.12 + 0.7 * beamGlow;

  // hide the plucked sprig after the pluck
  SET.sprig.visible = t < T.pluck;

  // man + arms
  const m = manAt(t);
  MAN.mesh.position.copy(m.anchor); ARMS.mesh.position.copy(m.anchor);
  const pose = { mood: m.mood, look: m.look || [0, 0], tilt: m.tilt, sq: m.sq, tuft: m.tuft, sweat: m.sweat, blink: m.blink, dy: m.dyBounce || 0, walk: m.walk || 0, walkAmp: m.walkAmp || 0, hands: {}, shape: m.shape, knife: false };
  if (m.lookW) { const q = toCanvas(MAN, m.lookW); const fx = q[0], fy = q[1] + 330; const L = Math.hypot(fx, fy) || 1; pose.look = [fx / L * Math.min(1, L / 160), fy / L * Math.min(1, L / 160)]; }
  for (const s of ['L', 'R']) { const h = m.hands[s]; pose.hands[s] = h.w ? toCanvas(MAN, h.w) : h.c; }
  MAN.update(camera, m.anchor, right, pose, m.ground, 0.0);
  ARMS.update(camera, m.anchor, right, pose, m.ground, 0.0);
  ARMS.mesh.material.depthTest = !m.over; ARMS.mesh.position.addScaledVector(new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion), -0.01);
  MAN.shadow.position.set(m.anchor.x, m.ground + 0.006, m.anchor.z); MAN.shadow.scale.set(0.42, 0.26, 1); MAN.shadow.material.opacity = 0.22;
  ARMS.shadow.visible = false;

  // idea bulb
  const bu = t - T.eureka; const bon = bu > 0 && t < T.reach0; BULB.mesh.visible = bon; BULB.shadow.visible = false;
  if (bon) { const s = clamp(bu / 0.15, 0, 1) * (1 + 0.25 * Math.exp(-bu * 8) * Math.sin(bu * 30)) * (1 - sstep(T.reach0 - 0.3, T.reach0, t)); BULB.update(camera, m.anchor.clone().add(V(0.0, 1.36, 0.02)), right, { s: Math.max(0.01, s), rays: 0.5 + 0.5 * Math.sin(bu * 10) }, 0, 0); }

  // sun follows the action
  const focus = c.tgt.clone(); focus.y = Math.min(focus.y, 2.0);
  sun.target.position.copy(focus); sun.position.copy(focus).add(V(-2.4, 6.2, 4.4));

  POST = { fade: sstep(0, 0.5, t) * (1 - sstep(T.fade, DUR - 0.05, t)), flash: 0 };
}
function subframes(t) {
  const near = (x, a, b) => t > x - a && t < x + b;
  return (near(T.d1shut, 0.12, 0.2) || near(T.d2catch, 0.12, 0.2) || near(T.dFinalShut, 0.1, 0.2)) ? 3 : 1;
}

// ---------- post: MSAA, gentle halation, filmic curve, soft vignette. No grain. (from the kit) ----------
const rtScene = new THREE.WebGLRenderTarget(W, HH, { type: THREE.HalfFloatType, depthBuffer: true, samples: 4 });
const rtAcc = new THREE.WebGLRenderTarget(W, HH, { type: THREE.HalfFloatType, depthBuffer: false });
const mk = (w, h) => new THREE.WebGLRenderTarget(Math.max(2, w), Math.max(2, h), { type: THREE.HalfFloatType, depthBuffer: false });
const lw = Math.round(W / 4), lh = Math.round(HH / 4);
const rA = [mk(lw, lh), mk(lw >> 1, lh >> 1), mk(lw >> 2, lh >> 2)], rB = [mk(lw, lh), mk(lw >> 1, lh >> 1), mk(lw >> 2, lh >> 2)];
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); const quadScene = new THREE.Scene(); quadScene.add(quad);
const VQ = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0);} `;
const accMat = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null }, uW: { value: 1 } }, vertexShader: VQ, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false,
  fragmentShader: `uniform sampler2D tSrc; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor=vec4(texture2D(tSrc,vUv).rgb*uW,1.0);} ` });
const brightMat = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null } }, vertexShader: VQ,
  fragmentShader: `uniform sampler2D tSrc; varying vec2 vUv; void main(){ vec3 c=texture2D(tSrc,vUv).rgb; float l=dot(c,vec3(0.3,0.55,0.15)); gl_FragColor=vec4(c*smoothstep(1.1,1.9,l),1.0);} ` });
const blurMat = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } }, vertexShader: VQ,
  fragmentShader: `uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv; void main(){ vec3 s=texture2D(tSrc,vUv).rgb*0.2270;
    s+=(texture2D(tSrc,vUv+uDir*1.3846).rgb+texture2D(tSrc,vUv-uDir*1.3846).rgb)*0.3162; s+=(texture2D(tSrc,vUv+uDir*3.2308).rgb+texture2D(tSrc,vUv-uDir*3.2308).rgb)*0.0703; gl_FragColor=vec4(s,1.0);} ` });
const copyMat = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null } }, vertexShader: VQ, fragmentShader: `uniform sampler2D tSrc; varying vec2 vUv; void main(){ gl_FragColor=texture2D(tSrc,vUv);} ` });
const finalMat = new THREE.ShaderMaterial({
  uniforms: { tScene: { value: null }, tB0: { value: null }, tB1: { value: null }, tB2: { value: null }, uFade: { value: 1 }, uFlash: { value: 0 } },
  vertexShader: VQ,
  fragmentShader: `uniform sampler2D tScene,tB0,tB1,tB2; uniform float uFade,uFlash; varying vec2 vUv;
  void main(){
    vec3 c=texture2D(tScene,vUv).rgb;
    vec3 hal=texture2D(tB0,vUv).rgb*0.5+texture2D(tB1,vUv).rgb*0.7+texture2D(tB2,vUv).rgb*0.9;
    c+=hal*vec3(1.0,0.75,0.5)*0.18;
    c+=vec3(1.0)*uFlash;
    c=1.22*c/(1.0+0.32*c);
    c=pow(clamp(c,0.0,1.0),vec3(1.0/2.2));
    float l=dot(c,vec3(0.3,0.55,0.15));
    c=mix(c*vec3(0.97,0.99,1.04),c*vec3(1.03,1.0,0.96),smoothstep(0.3,0.8,l));
    c=mix(vec3(l),c,1.08);
    vec2 v=(vUv-0.5)*vec2(1.0,1.1); c*=1.0-0.18*smoothstep(0.45,0.95,length(v)*1.25);
    c*=uFade;
    gl_FragColor=vec4(clamp(c,0.0,1.0),1.0);
  }`,
});
function pass(mat, target) { quad.material = mat; renderer.setRenderTarget(target); renderer.render(quadScene, quadCam); }
function pyramid(src, A, B, firstMat) {
  for (let i = 0; i < 3; i++) {
    if (i === 0) { const mm = firstMat || copyMat; mm.uniforms.tSrc.value = src; pass(mm, A[0]); }
    else { copyMat.uniforms.tSrc.value = A[i - 1].texture; pass(copyMat, A[i]); }
    const w = A[i].width, h = A[i].height;
    blurMat.uniforms.tSrc.value = A[i].texture; blurMat.uniforms.uDir.value.set(1 / w, 0); pass(blurMat, B[i]);
    blurMat.uniforms.tSrc.value = B[i].texture; blurMat.uniforms.uDir.value.set(0, 1 / h); pass(blurMat, A[i]);
  }
}
const SUB = QS.get('sub');
function render(t) {
  t = clamp(t, 0, DUR - 1e-4);
  const N = SUB ? +SUB : subframes(t);
  let src;
  if (N <= 1) { setup(t); renderer.setRenderTarget(rtScene); renderer.setClearColor(0xdfeaf2, 1); renderer.render(scene, camera); src = rtScene.texture; }
  else {
    renderer.setRenderTarget(rtAcc); renderer.setClearColor(0, 1); renderer.clear();
    for (let k = 0; k < N; k++) {
      const ts = clamp(t - 1 / 96 + (k + 0.5) / N / 48, 0, DUR - 1e-4);
      setup(ts); renderer.setRenderTarget(rtScene); renderer.setClearColor(0xdfeaf2, 1); renderer.render(scene, camera);
      accMat.uniforms.tSrc.value = rtScene.texture; accMat.uniforms.uW.value = 1 / N; quad.material = accMat;
      renderer.setRenderTarget(rtAcc); renderer.autoClear = false; renderer.render(quadScene, quadCam); renderer.autoClear = true;
    }
    src = rtAcc.texture; setup(t);
  }
  pyramid(src, rA, rB, brightMat);
  const fu = finalMat.uniforms;
  fu.tScene.value = src; fu.tB0.value = rA[0].texture; fu.tB1.value = rA[1].texture; fu.tB2.value = rA[2].texture;
  fu.uFade.value = POST.fade; fu.uFlash.value = POST.flash;
  pass(finalMat, null);
}

window.DUR = DUR; window.EV = EV; window.render = render;
window.grabPNG = (t) => { render(t); return canvas.toDataURL('image/png').split(',')[1]; };
window.grab = (t) => { render(t); return canvas.toDataURL('image/jpeg', 0.95).split(',')[1]; };
render(0);
window.READY = true;
