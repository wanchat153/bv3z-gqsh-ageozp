// The Jar — full-length remake (64.833 s, 1945 frames) driven by the reference frame map (framemap.js).
// Shots are added segment by segment; an unbuilt shot renders a labelled placeholder so the timeline is always complete.
// Every frame is a pure function of t. Page contract: DUR, EV, render(t), grab(t), grabPNG(t), READY.
import * as THREE from './three.module.js';
import { DUR, FPS, SHOTS, TRANS, CUES } from './framemap.js';
import { clamp, mix } from './toon.js';
import { createEngine, toUV } from './engine.js';
import { makeFlat, makeCard, setFlatTarget } from './flat.js';
import { makeCaptions } from './captions.js';
import { makeOverlay, speedLines } from './fx2d.js';
import { buildHall, flame } from './hall.js';
import { buildHallExtras } from './hallx.js';
import { buildCity } from './city.js';
import { pbrify } from './pbr.js';
import { buildGate, makeCart } from './gate.js';
import { buildOutdoor, height, PAL } from './outdoor.js';
import { buildInner, IN } from './inner.js';
import { buildMountain, buildCutaway } from './quake.js';
import { haze } from './sky.js';
import { SKIN_MAT } from './dragonhead.js';
import { makeJar, JAR } from './jar.js';
import { INVENTOR, INVENTOR_HAUL, INVENTOR_HAUL_ROPE, EMPEROR, GUARD, MINISTER, TOWNSFOLK, halberd } from './cast.js';
import { INK, line } from './stick.js';

await Promise.all(['800 40px Montserrat', '800 40px Kanit'].map((f) => document.fonts.load(f)));
const QS = new URLSearchParams(location.search);
const E = createEngine({ W: innerWidth, H: innerHeight, clear: 0x3a3240 }); setFlatTarget(E.SH);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sst = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
const lin = (a, b, x) => clamp((x - a) / (b - a), 0, 1);
const lerpV = (a, b, u) => a.clone().lerp(b, u);
const SZ = 1.9;   // character plane (≈1.75 m tall figure)
const cam = {}; const camOf = (id, far = 200, near = 0.05) => (cam[id] = cam[id] || new THREE.PerspectiveCamera(35, E.W / E.H, near, far));
function aim(c, pos, tgt, fov, roll = 0) { c.position.copy(pos); c.up.set(0, 1, 0); c.lookAt(tgt); if (roll) c.rotateZ(roll); c.fov = fov; c.aspect = E.W / E.H; c.updateProjectionMatrix(); c.updateMatrixWorld(true); }
const right = (c) => V(1, 0, 0).applyQuaternion(c.quaternion);
// a key path: [[t, pos, tgt, fov, roll?], ...] eased between keys
function keys(K, t) { let i = 0; while (i < K.length - 2 && t > K[i + 1][0]) i++; const a = K[i], b = K[i + 1]; const u = sst(a[0], b[0], t);
  return [lerpV(a[1], b[1], u), lerpV(a[2], b[2], u), mix(a[3], b[3], u), mix(a[4] || 0, b[4] || 0, u)]; }

// ================= the hall world (lazy) =================
let HALL = null;
function hall() {
  if (HALL) return HALL;
  const S = new THREE.Scene(); const H = buildHall(S); const J = makeJar(); J.root.position.set(0, 0, 2.2); J.root.rotation.y = -1.22; S.add(J.root); J.root.updateMatrixWorld(true);   // dragon 0 points camera-left in S01/S02/S04
  const mk = (fn) => { const f = makeFlat(SZ, 1024, fn); S.add(f.mesh); S.add(f.shadow); f.shadow.material.color.set(0x1a1018); return f; };
  const X = buildHallExtras(S, H, flame);
  // cobwebs strung over the jar front, between the dragons and down to the frogs (time has passed in S08)
  for (const [x, y, sz, sd] of [[-0.55, 1.15, 0.7, 3], [0.35, 1.5, 0.55, 5], [0.7, 0.55, 0.6, 8], [-0.95, 0.35, 0.5, 9], [0.05, 0.25, 0.45, 12]]) {
    const w = X.web(sz, sd); w.position.set(x, y, 2.2 + 0.86); if (x > 0.2) w.scale.x = -1; X.webs.add(w); }
  if (!QS.has('toon')) pbrify(S, E.renderer, { env: 0.3 });
  HALL = { S, H, J, X, inv: mk(INVENTOR), emp: mk(EMPEROR), g1: mk(GUARD), g2: mk(GUARD), mins: [0, 1, 2, 3, 4].map(() => mk(MINISTER)) };
  HALL.mins.forEach((m) => { m.mesh.visible = false; m.shadow.visible = false; });
  return HALL;
}
const HAZE_HALL = { den: 0.07, start: 5, max: 0.3, col: [0.62, 0.52, 0.52] };
const DRAGON = 0;   // the dragon facing the camera-left in S01/S02/S04
const INVP = V(-1.1, 0, 3.15), EMPP = V(0, 0.5, -6.55), G1P = V(-1.05, 0.5, -6.35), G2P = V(1.05, 0.5, -6.35);
const at = (p) => p.clone().add(V(0, 0.43 * SZ, 0));
function emperorCourt(c, t, mood) {   // emperor + two guards on the dais; mood: 'stern' | 'laugh'
  const Hh = hall(); const R = right(c); const L = mood === 'laugh';
  const k = L ? Math.sin(t * 14) : 0;
  Hh.emp.update(c, at(EMPP).add(V(0, L ? 0.02 * Math.abs(k) : 0, 0)), R, { eyes: L ? 'happy' : 'dash', mouth: L ? 'laugh' : 'frown', brow: L ? -0.1 : 0.2, tears: L, tilt: L ? 0.12 * Math.sin(t * 7) : 0,
    arms: L ? { L: [-150, 40], R: [150, 40] } : { L: [-140, 160], R: [140, 160] } }, EMPP.y, 0.3, L ? 0.1 * Math.sin(t * 6) - 0.08 : 0);
  Hh.g1.update(c, at(G1P), R, { stache: 'droop', eyes: L ? 'happy' : 'dash', mouth: L ? 'laugh' : 'frown', brow: L ? -0.1 : 0.22, tears: L, halberdX: -170, tilt: L ? 0.18 + 0.06 * k : 0,
    arms: { L: [-170, 60], R: [140, 160] } }, G1P.y, 0.3, L ? -0.16 + 0.05 * k : 0);
  Hh.g2.update(c, at(G2P), R, { eyes: L ? 'happy' : 'dash', mouth: L ? 'laugh' : 'smirk', brow: L ? -0.1 : 0.1, halberdX: 170, tilt: L ? -0.15 - 0.05 * k : 0,
    arms: { L: [-140, 160], R: [170, 60] } }, G2P.y, 0.3, L ? 0.18 - 0.05 * k : 0);
}
function hideCourt() { const Hh = hall(); for (const f of [Hh.emp, Hh.g1, Hh.g2]) { f.mesh.visible = false; f.shadow.visible = false; } }
function showAll() { const Hh = hall(); for (const f of [Hh.inv, Hh.emp, Hh.g1, Hh.g2]) { f.mesh.visible = true; } }
// inventor holding the rod with the ball to the dragon's mouth (canvas units, measured against S01)
const rodHold = (len, ball) => (c, a) => { const [x, y] = a.R; line(c, [[x, y], [x + len * 0.92, y - len * 0.38]], 16, INK); line(c, [[x, y], [x + len * 0.92, y - len * 0.38]], 8, '#3a2a22');
  if (ball) { c.beginPath(); c.arc(x + len * 0.92 + 18, y - len * 0.38 - 8, 34, 0, 7); const g = c.createRadialGradient(x + len * 0.92 + 8, y - len * 0.38 - 20, 4, x + len * 0.92 + 18, y - len * 0.38 - 8, 36);
    g.addColorStop(0, '#ffe0a0'); g.addColorStop(0.5, '#c87a2a'); g.addColorStop(1, '#6a3a10'); c.fillStyle = g; c.fill(); c.lineWidth = 8; c.strokeStyle = INK; c.stroke(); } };

// ================= shots =================
const SHOT = {};
// S01 0.00–0.80 — wide: inventor raises the rod with the ball to the dragon; slow push right
SHOT.S01 = (t) => { const Hh = hall(); const c = camOf('S01');
  const [p, g, f] = keys([[0, V(-0.1, 1.62, 7.7), V(-0.95, 1.62, 2.6), 38], [0.8, V(-0.04, 1.63, 7.35), V(-0.9, 1.62, 2.6), 38]], t); aim(c, p, g, f);
  const prep = () => { const R = right(c); hideCourt(); Hh.inv.mesh.visible = true;
    Hh.inv.update(c, at(INVP), R, { eyes: t < 0.45 ? 'dash' : 'ring', mouth: t < 0.45 ? 'smirk' : 'dot', brow: t < 0.45 ? 0.25 : -0.1, look: [0.6, -0.2],
      arms: { L: [-130, 170], R: [150, -40] }, bend: { L: -30, R: -60 }, hold: rodHold(300, true) }, 0, 0.3);
    for (let i = 0; i < 8; i++) { Hh.J.setJaw(i, 0.6); Hh.J.setBall(i, i === DRAGON ? 'none' : 'held'); } Hh.H.flick(t); };
  return { haze: HAZE_HALL, scene: Hh.S, camera: c, prep, focus: { dist: c.position.distanceTo(at(INVP)), range: 1.6, amt: 0.55 } }; };
// S02 0.80–2.13 — dragon close-up: the rod brings the ball into the jaw (0.8–1.35), rod withdraws; slow push, glint
SHOT.S02 = (t) => { const Hh = hall(); const c = camOf('S02'); const hp = Hh.J.headWorld(DRAGON);
  const a = Hh.J.root.rotation.y; const d = V(Math.sin(a), 0, Math.cos(a)); const perp = V(-d.z, 0, d.x).multiplyScalar(-1);
  // camera placed in the dragon head's own frame (+x snout, +y up, z side): 3/4 front view from slightly above, like the reference
  const head = Hh.J.heads[DRAGON]; head.updateMatrixWorld(true); const L = (x, y, z) => head.localToWorld(V(x, y, z));
  // world-level camera beside the head: out = radial (the way the snout points), side = across it; slightly above, looking a touch down
  const out = hp.clone().sub(Hh.J.root.position).setY(0).normalize(), side = V(0, 1, 0).cross(out).normalize();
  const W0 = (o, sd, y) => hp.clone().addScaledVector(out, o).addScaledVector(side, sd).add(V(0, y, 0));
  const [p, g, f] = keys([[0.7, W0(1.72, 1.0, 0.22), W0(0.04, 0.08, 0.1), 30], [2.2, W0(1.58, 0.92, 0.2), W0(0.04, 0.08, 0.1), 29]], t); aim(c, p, g, f);
  const prep = () => { hideCourt(); Hh.inv.mesh.visible = false; Hh.inv.shadow.visible = false;
    if (!Hh.key2) { Hh.key2 = new THREE.PointLight(0xffe2b0, 6, 5, 1.2); Hh.S.add(Hh.key2); } Hh.key2.visible = true; Hh.S.environmentIntensity = 0.1; SKIN_MAT.color.setScalar(0.88);   /* less ambient fill in the close-up: the head gets real form shading */ Hh.key2.position.copy(L(0.9, 1.1, -0.6));   /* key above and in front of the snout: lit top, shaded underside */
    const u = sst(0.85, 1.35, t); Hh.J.setJaw(DRAGON, 0.98 - 0.06 * sst(1.35, 1.6, t)); Hh.J.dragons.forEach((d, k) => { d.visible = k === DRAGON; if (k !== DRAGON) Hh.J.setBall(k, 'none'); }); Hh.J.frogs.forEach((fr) => { fr.visible = false; }); Hh.J.setBall(DRAGON, u < 1 ? 'none' : 'held'); Hh.H.flick(t);
    // the rod + ball travel in from the left until the ball sits in the jaw
    if (!Hh.rod) { Hh.rod = new THREE.Group(); const r = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.4, 8), new THREE.MeshPhongMaterial({ color: 0x3a2a22 })); r.rotation.z = Math.PI / 2; r.position.x = -0.7; Hh.rod.add(r);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.065, 20, 14), Hh.J.balls[0].material); Hh.rod.add(b); Hh.rod.userData.ball = b; Hh.S.add(Hh.rod); }
    Hh.rod.visible = t < 1.75; const back = sst(1.35, 1.75, t); Hh.rod.userData.ball.visible = u < 1;
    const dd = V(Math.sin(Hh.J.root.rotation.y), 0, Math.cos(Hh.J.root.rotation.y)); Hh.rod.position.copy(hp).addScaledVector(dd, 0.55 * (1 - u) + 0.9 * back).add(V(0, -0.1 * (1 - u) - 0.08 * back, 0)); Hh.rod.rotation.set(0, Math.atan2(-dd.z, dd.x) + Math.PI, 0.3); };
  return { haze: HAZE_HALL, scene: Hh.S, camera: c, prep, focus: { dist: c.position.distanceTo(hp), range: 0.25, amt: 1.0, aper: 48, maxCoc: 28 } }; };
// S03 2.13–3.07 — over the jar lid to the throne: emperor between two guards, stern; slow push
SHOT.S03 = (t) => { const Hh = hall(); const c = camOf('S03');
  const [p, g, f] = keys([[1.95, V(0.05, 2.62, 3.3), V(0, 2.35, -7.0), 44], [3.1, V(0.05, 2.6, 3.1), V(0, 2.35, -7.0), 42.5]], t); aim(c, p, g, f);
  const prep = () => { Hh.inv.mesh.visible = false; Hh.inv.shadow.visible = false; for (const f2 of [Hh.emp, Hh.g1, Hh.g2]) f2.mesh.visible = true; emperorCourt(c, t, 'stern');
    for (let i = 0; i < 8; i++) Hh.J.setBall(i, 'held'); Hh.H.flick(t); };
  return { haze: HAZE_HALL, scene: Hh.S, camera: c, prep, focus: { dist: c.position.distanceTo(at(EMPP)), range: 2.0, amt: 0.6 } }; };
// S04 3.07–5.40 — inventor warns, a ball rolls out of the dragon into the frog (3.95–4.6); speed lines + push on 'run.' (4.73–5.07)
SHOT.S04 = (t) => { const Hh = hall(); const c = camOf('S04');
  const [p, g, f] = keys([[3.07, V(-0.15, 1.62, 7.6), V(-0.98, 1.62, 2.6), 38], [4.7, V(-0.12, 1.63, 7.3), V(-0.95, 1.62, 2.6), 38], [5.07, V(-0.6, 1.7, 6.6), V(-1.1, 1.75, 2.8), 37]], t); aim(c, p, g, f);
  const prep = () => { const R = right(c); hideCourt(); Hh.inv.mesh.visible = true; Hh.H.flick(t);
    const talk = Math.sin(t * 19) > 0; const scared = t > 3.95, run = t > 4.72;
    Hh.inv.update(c, at(INVP), R, { eyes: run ? 'wide' : scared ? 'ring' : 'dash', mouth: run ? 'o' : talk ? 'o' : 'smirk', brow: run ? -0.2 : 0.2, sweat: run, look: scared && !run ? [0.8, 0.4] : [0.2, 0],
      arms: run ? { L: [-130, 170], R: [140, -160] } : { L: [-130, 170], R: [170, 40 + 30 * Math.sin(t * 5)] }, bend: { L: -30, R: run ? -30 : -50 } }, 0, 0.3);
    for (let i = 0; i < 8; i++) Hh.J.setBall(i, 'held');
    const u = lin(3.95, 4.55, t); Hh.J.setJaw(DRAGON, 0.6); Hh.J.setBall(DRAGON, u <= 0 ? 'held' : u < 1 ? 'fall' : 'caught', u); };
  return { haze: HAZE_HALL, scene: Hh.S, camera: c, prep, focus: { dist: c.position.distanceTo(at(INVP)), range: 1.8, amt: 0.5 },
    overlay: t > 4.73 && t < 5.1 ? (g2, W, H) => speedLines(g2, W, H, { cx: 0.42, cy: 0.42, amt: Math.min(1, (t - 4.73) / 0.05, (5.1 - t) / 0.08), frame: Math.floor(t * 30) }) : null }; };
// S05 5.40–7.50 — dolly up the carpet to the emperor (5.2–5.75), stern beat, the court bursts out laughing (6.0→), camera pulls back
SHOT.S05 = (t) => { const Hh = hall(); const c = camOf('S05');
  const [p, g, f] = keys([[5.15, V(0.15, 1.35, 3.6), V(0, 1.4, -6.6), 40], [5.75, V(0, 1.7, -2.1), V(0, 1.72, -6.6), 40], [6.3, V(0, 1.7, -2.2), V(0, 1.72, -6.6), 40], [7.1, V(0, 2.1, -1.1), V(0, 2.1, -6.8), 54], [7.6, V(0, 2.15, -0.9), V(0, 2.12, -6.8), 55]], t); aim(c, p, g, f);
  const prep = () => { Hh.inv.mesh.visible = false; Hh.inv.shadow.visible = false; for (const f2 of [Hh.emp, Hh.g1, Hh.g2]) f2.mesh.visible = true;
    emperorCourt(c, t, t > 6.0 ? 'laugh' : 'stern'); for (let i = 0; i < 8; i++) Hh.J.setBall(i, i === DRAGON ? 'caught' : 'held'); Hh.H.flick(t); };
  return { haze: HAZE_HALL, scene: Hh.S, camera: c, prep, focus: { dist: c.position.distanceTo(at(EMPP)), range: 1.6, amt: 0.6 } }; };


// S06 7.50–13.53 — the jar alone: high orbit from front-left to dead front while descending; push into the front dragon (11.4–12.6), tilt down to its frog (12.6–13.4)
SHOT.S06 = (t) => { const Hh = hall(); const c = camOf('S06'); const FD = 1;   // dragon 1 faces the camera (+z)
  const hp = Hh.J.headWorld(FD), fp = Hh.J.frogWorld(FD), J0 = V(0, 1.45, 2.2);
  const orb = (u) => { const a = mix(-0.38, 0.0, u), R = mix(6.4, 5.2, u), y = mix(3.3, 2.1, u); return V(Math.sin(a) * R, y, 2.2 + Math.cos(a) * R); };
  let p, g, f;
  if (t < 11.4) { const u = sst(7.3, 11.4, t); p = orb(u); g = J0.clone().add(V(0, mix(0.1, 0.25, u), 0)); f = mix(46, 40, u); }
  else if (t < 12.6) { const u = sst(11.4, 12.6, t); p = lerpV(orb(1), hp.clone().add(V(0, 0.05, 2.3)), u); g = lerpV(J0.clone().add(V(0, 0.25, 0)), hp.clone().add(V(0, -0.05, 0)), u); f = mix(40, 36, u); }
  else { const u = sst(12.6, 13.4, t); p = lerpV(hp.clone().add(V(0, 0.05, 2.3)), hp.clone().add(V(0, -0.25, 2.2)), u); g = lerpV(hp.clone().add(V(0, -0.05, 0)), fp.clone().add(V(0, 0.05, 0)), u); f = 36; }
  aim(c, p, g, f);
  const prep = () => { hideCourt(); Hh.inv.mesh.visible = false; Hh.inv.shadow.visible = false; for (let i = 0; i < 8; i++) { Hh.J.setJaw(i, 0.55); Hh.J.setBall(i, 'held'); } Hh.H.flick(t); };
  return { haze: HAZE_HALL, scene: Hh.S, camera: c, prep, focus: { dist: c.position.distanceTo(t < 11.4 ? J0 : hp), range: t < 11.4 ? 1.8 : 0.5, amt: 0.6 } }; };

// ================= the balcony + parade ground (lazy) =================
let CITY = null;
function city() { if (CITY) return CITY; const S = new THREE.Scene(); const C = buildCity(S); if (!QS.has('toon')) pbrify(S, E.renderer, { env: 0.3 }); const emp = makeFlat(SZ, 1024, EMPEROR); S.add(emp.mesh); S.add(emp.shadow); emp.shadow.material.color.set(0x3a3028); CITY = { S, C, emp }; return CITY; }
const BALP = V(0, 0, 0.1);
// S07 13.53–17.87 — the emperor on the balcony, crane up to reveal the army + city (14.1–14.7), hold, crane back down (16.4–17.3)
SHOT.S07 = (t) => { const Cc = city(); const c = camOf('S07');
  const near = [V(0.55, 1.6, 4.6), V(0.0, 1.5, -0.4), 40], high = [V(0.0, 11, 7.5), V(0, -2.5, -34), 52];
  const K = [[13.4, ...near], [14.1, near[0].clone().add(V(-0.05, 0.05, -0.15)), near[1], 40], [14.75, ...high], [16.4, high[0].clone().add(V(0, -0.4, -1.2)), high[1], 45], [17.3, V(0.5, 1.6, 4.4), near[1], 40], [17.9, V(0.48, 1.6, 4.3), near[1], 40]];
  const [p, g, f] = keys(K, t); aim(c, p, g, f);
  const prep = () => { Cc.emp.update(c, at(BALP), right(c), { eyes: 'dash', mouth: 'frown', brow: 0.22, stache: 'droop', arms: { L: [-140, 160], R: [140, 160] } }, 0, 0.3); Cc.C.sun.target.position.copy(BALP); };
  return { haze: { den: 0.012, start: 8, max: 0.55, col: [0.78, 0.86, 0.98] }, scene: Cc.S, camera: c, prep, focus: { dist: c.position.distanceTo(at(BALP)), range: 3.0, amt: c.position.y > 4 ? 0 : 0.7 } }; };

// ================= segment C: the ball that fell, the court that laughed (S08–S12) =================
const KU = SZ / 1024 * 0.94;   // one canvas unit of a character flat in metres (after the 6 % shrink about the feet)
// world point of a canvas point (x, y) on a character flat anchored at `a`, facing camera c
const onFlat = (c, a, x, y) => { const R = right(c), U = V(0, 1, 0).applyQuaternion(c.quaternion); return a.clone().addScaledVector(R, x * KU).addScaledVector(U, -(448 + 0.94 * (y - 448)) * SZ / 1024); };
let DROP = -1;   // the dragon on the camera-right front of the jar in S08 (its ball is the one that falls)
function dropDragon() { if (DROP >= 0) return DROP; const Hh = hall(); let best = -1e9; for (let i = 0; i < 8; i++) { const p = Hh.J.headWorld(i); const sc = p.z * 1.0 + p.x * 0.6; if (p.x > 0.1 && sc > best) { best = sc; DROP = i; } } return DROP; }
// S08 17.87–19.97 — years later: cobwebs, a pigeon on the jar; the inventor dozes in front of it. A ball drops (18.4–19.0), he jolts awake
SHOT.S08 = (t) => { const Hh = hall(); const c = camOf('S08'); const D = dropDragon();
  const [p, g, f] = keys([[17.6, V(-0.05, 1.95, 9.6), V(-0.4, 1.45, 1.6), 42], [20.1, V(-0.08, 1.9, 9.1), V(-0.4, 1.45, 1.6), 41]], t); aim(c, p, g, f);
  const prep = () => { const R = right(c); hideCourt(); Hh.inv.mesh.visible = true; Hh.H.flick(t); Hh.X.webs.visible = true;
    const u = lin(18.4, 19.0, t), jolt = t > 18.75, settle = t > 19.35;
    Hh.inv.update(c, at(INVP.clone().add(V(0.3, 0, 0.95))), R, { eyes: jolt ? (settle ? 'ring' : 'wide') : 'closed', mouth: jolt ? (settle ? 'line' : 'grit') : 'dot', brow: jolt ? -0.25 : 0.1, sweat: jolt && !settle,
      hairUp: jolt && !settle, look: jolt ? [0.7, -0.3] : [0, 0], dy: jolt ? (settle ? 0 : -18 * Math.max(0, Math.sin((t - 18.75) * 20))) : 6,
      arms: jolt ? { L: [-170, -40], R: [170, -40] } : { L: [-120, 160], R: [120, 160] }, bend: { L: -30, R: 30 } }, 0, 0.3);
    const m = Hh.mins[0]; m.mesh.visible = true; m.update(c, at(V(1.75, 0, -0.2)), R, { col: '#2e6a4a', eyes: 'dot', mouth: 'line', arms: { L: [-140, 160], R: [140, 160] } }, 0, 0.3);
    for (let i = 0; i < 8; i++) { Hh.J.setJaw(i, 0.55); Hh.J.setBall(i, 'held'); }
    Hh.J.setBall(D, u <= 0 ? 'held' : u < 1 ? 'fall' : 'caught', u);
    Hh.X.pigeon.visible = true; Hh.X.pigeon.position.set(0.25, 2.33, 2.2 + 0.25); Hh.X.pigeon.quaternion.copy(c.quaternion); };
  return { haze: HAZE_HALL, scene: Hh.S, camera: c, prep, focus: { dist: c.position.distanceTo(at(INVP)), range: 2.2, amt: 0.45 } }; };
// S09 19.97–20.30 — push down onto that frog: the bronze ball sits in its mouth
SHOT.S09 = (t) => { const Hh = hall(); const c = camOf('S09'); const D = dropDragon(); const fp = Hh.J.frogWorld(D);
  const out = fp.clone().sub(V(0, fp.y, 2.2)).setY(0).normalize();
  const [p, g, f] = keys([[19.9, fp.clone().addScaledVector(out, 1.05).add(V(0.12, 0.55, 0)), fp.clone().add(V(0, 0.18, 0)), 40], [20.4, fp.clone().addScaledVector(out, 0.92).add(V(0.11, 0.46, 0)), fp.clone().add(V(0, 0.14, 0)), 39]], t); aim(c, p, g, f);
  const prep = () => { hideCourt(); Hh.inv.mesh.visible = false; Hh.inv.shadow.visible = false; Hh.X.webs.visible = true; for (let i = 0; i < 8; i++) Hh.J.setBall(i, i === D ? 'caught' : 'held'); Hh.H.flick(t); };
  return { haze: HAZE_HALL, scene: Hh.S, camera: c, prep, focus: { dist: c.position.distanceTo(fp), range: 0.3, amt: 0.9 } }; };
// the emperor's reflection floating on the still wine (drawn once: stern face, tinted by the wine)
let REFL = null;
function wineReflection() { if (REFL) return REFL; const cv = document.createElement('canvas'); cv.width = cv.height = 512; const g = cv.getContext('2d');
  g.save(); g.beginPath(); g.arc(256, 256, 250, 0, 7); g.clip(); g.translate(256, 300); g.scale(0.62, 0.62); g.translate(0, 300); g.lineJoin = g.lineCap = 'round';
  EMPEROR(g, { eyes: 'dash', mouth: 'frown', brow: 0.22, stache: 'droop', arms: { L: [-140, 160], R: [140, 160] } }); g.restore();
  g.globalCompositeOperation = 'multiply'; g.fillStyle = '#d06070'; g.fillRect(0, 0, 512, 512); g.globalCompositeOperation = 'destination-in'; const rg = g.createRadialGradient(256, 256, 120, 256, 256, 256); rg.addColorStop(0, 'rgba(0,0,0,0.85)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, 512, 512);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
  REFL = new THREE.Mesh(new THREE.CircleGeometry(0.1, 48), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false })); REFL.rotation.x = -Math.PI / 2; REFL.position.y = 0.1435; REFL.renderOrder = 3; hall().X.cup.add(REFL); return REFL; }
const EMP_HOLD = { L: [-140, 160], R: [70, 90] };
function placeCup(c, scale = 1) { const Hh = hall(); const a = at(EMPP); const h = onFlat(c, a, EMP_HOLD.R[0], EMP_HOLD.R[1]); const toCam = c.position.clone().sub(h).setY(0).normalize();
  Hh.X.cup.visible = true; Hh.X.cup.scale.setScalar(scale); Hh.X.cup.position.copy(h).addScaledVector(toCam, 0.1).add(V(0, -0.09, 0)); wineReflection(); }
// S10 20.30–22.50 — the still wine with the emperor's face in it (20.3–21.0); whip back to the emperor on his throne, cup in hand
SHOT.S10 = (t) => { const Hh = hall(); const c = camOf('S10');
  // the cup sits where the emperor's hand will be in the wide framing; the close-up looks down into it
  const wide = [V(0, 1.6, -3.3), V(0, 1.45, -6.6), 38]; aim(c, wide[0], wide[1], wide[2]); const cp = (() => { placeCup(c); return Hh.X.cup.position.clone(); })();
  const close = [cp.clone().add(V(0.02, 0.36, 0.2)), cp.clone().add(V(0, 0.13, 0)), 40];
  const [p, g, f] = keys([[20.3, close[0], close[1], close[2]], [21.0, close[0].clone().add(V(0, 0.02, 0.02)), close[1], 39], [21.32, ...wide], [22.6, wide[0].clone().add(V(0, 0.01, -0.25)), wide[1], 38]], t); aim(c, p, g, f);
  const prep = () => { const R = right(c); Hh.inv.mesh.visible = false; Hh.inv.shadow.visible = false; for (const x of [Hh.g1, Hh.g2]) { x.mesh.visible = false; x.shadow.visible = false; }
    Hh.emp.update(c, at(EMPP), R, { eyes: 'dash', mouth: 'frown', brow: 0.22, stache: 'droop', arms: EMP_HOLD, bend: { L: -40, R: -60 } }, EMPP.y, 0.3); Hh.emp.mesh.visible = t > 21.02; Hh.emp.shadow.visible = t > 21.02;   /* looking straight down into the bowl the billboard would face the lens */
    Hh.X.cup.visible = true; Hh.X.cup.position.copy(cp); for (let i = 0; i < 8; i++) Hh.J.setBall(i, 'held'); Hh.H.flick(t); };
  const fd = t < 21.1 ? c.position.distanceTo(cp) : c.position.distanceTo(at(EMPP));
  return { haze: HAZE_HALL, scene: Hh.S, camera: c, prep, focus: { dist: fd, range: t < 21.1 ? 0.08 : 0.8, amt: 0.8 } }; };
// S11 22.50–24.10 — the banquet: ministers roar with laughter, one topples backwards off the bench (23.0–23.5)
const SEATS = [[2.62, -4.9, '#2e6a4a'], [2.62, -4.0, '#8a5130'], [2.62, -3.1, '#3a4a8a'], [0.88, -2.3, '#6a3a5a'], [0.88, -4.4, '#2e6a4a']];
SHOT.S11 = (t) => { const Hh = hall(); const c = camOf('S11');
  const [p, g, f] = keys([[22.3, V(0.55, 2.3, 4.6), V(0.9, 1.15, -7.0), 58], [24.2, V(0.57, 2.27, 4.15), V(0.9, 1.15, -7.0), 57]], t); aim(c, p, g, f);
  const prep = () => { const R = right(c); Hh.inv.mesh.visible = false; Hh.inv.shadow.visible = false; for (const f2 of [Hh.emp, Hh.g1, Hh.g2]) f2.mesh.visible = true; emperorCourt(c, t, 'laugh');
    Hh.J.root.visible = false; Hh.X.banquet.visible = true; Hh.X.flames.forEach((fl) => { fl.scale.y = 0.14 * (1 + 0.1 * Math.sin(t * 25 + fl.id)); });
    SEATS.forEach(([x, z, col], i) => { const m = Hh.mins[i]; m.mesh.visible = true; const k = Math.sin(t * 15 + i * 1.7);
      let a = at(V(x, 0.36, z)), roll = 0.12 * k * (i % 2 ? 1 : -1);
      if (i === 3) { const u = sst(22.95, 23.45, t); roll = 1.35 * u + 0.05 * k; a = a.add(V(-0.45 * u, -0.62 * u, 0.1 * u)); }
      m.update(c, a, R, { col, eyes: 'happy', mouth: 'laugh', tears: i % 2 === 0, brow: -0.1, tilt: 0.1 * k, arms: i === 3 ? { L: [-170, -120], R: [170, -150] } : { L: [-150, 40 + 20 * k], R: [150, 40 - 20 * k] } }, 0, i === 3 ? 0 : 0.0, roll); });
    for (let i = 0; i < 8; i++) Hh.J.setBall(i, 'held'); Hh.H.flick(t); };
  return { haze: HAZE_HALL, scene: Hh.S, camera: c, prep, focus: { dist: c.position.distanceTo(V(1.8, 1.0, -2.6)), range: 2.0, amt: 0.5 } }; };
// S12 24.10–26.90 — the emperor mocks from the throne: "the world's most expensive toy" — smirk, then a wink (25.6→)
SHOT.S12 = (t) => { const Hh = hall(); const c = camOf('S12');
  const [p, g, f] = keys([[24.0, V(0.05, 1.62, -3.4), V(0, 1.5, -6.6), 40], [27.0, V(0.02, 1.62, -3.75), V(0, 1.5, -6.6), 39]], t); aim(c, p, g, f);
  const prep = () => { const R = right(c); Hh.inv.mesh.visible = false; Hh.inv.shadow.visible = false; for (const x of [Hh.g1, Hh.g2]) { x.mesh.visible = false; x.shadow.visible = false; }
    const talk = t < 25.5 && Math.sin(t * 17) > 0.2; Hh.emp.mesh.visible = true;
    Hh.emp.update(c, at(EMPP), R, { eyes: 'dash', wink: t > 25.6, mouth: talk ? 'o' : 'smirk', brow: t > 25.6 ? -0.15 : 0.18, stache: 'droop', tilt: t > 25.6 ? 0.08 : 0, arms: EMP_HOLD, bend: { L: -40, R: -60 } }, EMPP.y, 0.3);
    placeCup(c); for (let i = 0; i < 8; i++) Hh.J.setBall(i, 'held'); Hh.H.flick(t); };
  return { haze: HAZE_HALL, scene: Hh.S, camera: c, prep, focus: { dist: c.position.distanceTo(at(EMPP)), range: 0.8, amt: 0.75 } }; };

// ================= the city gate (lazy): S13 day, S17 + S18 night =================
let GATE = null;
function gate() { if (GATE) return GATE; const S = new THREE.Scene(); const G = buildGate(S); const J = makeJar(); S.add(J.root);
  const mk = (fn) => { const f = makeFlat(SZ, 1024, fn); S.add(f.mesh); S.add(f.shadow); f.shadow.material.color.set(0x2a2018); return f; };
  const dust = puffs(S, 14);
  if (!QS.has('toon')) pbrify(S, E.renderer, { env: 0.3 });
  GATE = { S, G, J, dust, inv: mk(INVENTOR), g1: mk(GUARD), g2: mk(GUARD), folk: [0, 1, 2, 3].map(() => mk(TOWNSFOLK)) }; return GATE; }
// soft dust puffs (sprites): burst(p, u) expands and fades a ring of puffs around p for u in 0..1
const PUFF = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,250,240,0.9)'); r.addColorStop(0.5, 'rgba(240,226,200,0.55)'); r.addColorStop(1, 'rgba(230,210,180,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
function puffs(scene, n) { const grp = new THREE.Group(); scene.add(grp); const sp = [];
  for (let i = 0; i < n; i++) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: PUFF, transparent: true, depthWrite: false, color: 0xf0e2c8 })); grp.add(m); sp.push(m); }
  return { burst(p, u, size = 1, col = 0xf0e2c8) { grp.visible = u > 0 && u < 1; sp.forEach((m, i) => { const a = i / n * Math.PI * 2 + i * 0.7, rr = (0.25 + 0.9 * Math.sqrt(u)) * size * (0.7 + 0.3 * Math.sin(i * 3.1));
      m.position.set(p.x + Math.cos(a) * rr, p.y + 0.15 * size + 0.35 * u * size * (0.5 + 0.5 * Math.sin(i)), p.z + Math.sin(a) * rr * 0.6); m.scale.setScalar(size * (0.5 + 0.9 * u)); m.material.opacity = Math.pow(1 - u, 1.4) * 0.85; m.material.color.set(col); }); },
    hide() { grp.visible = false; } }; }
const FOLK = [[-3.4, 5.4, '#8a6a4a', 'straw'], [3.1, 4.9, '#4a7aa8', null], [-5.2, 9.0, '#6a8a5a', null], [4.6, 8.6, '#9a5a3a', 'straw']];
// S13 26.90–29.70 — thrown out of the city: the inventor flies out of the arch (27.1–27.6), lands in the road; the jar follows (28.2–28.6) onto the cart; townsfolk laugh
SHOT.S13 = (t) => { const Gg = gate(); const c = camOf('S13', 900, 0.1);
  const [p, g, f] = keys([[26.8, V(0.2, 1.75, 15.0), V(0, 4.6, 0), 62], [29.8, V(0.15, 1.7, 13.9), V(0, 4.5, 0), 61]], t); aim(c, p, g, f);
  const LAND = V(0.5, 0, 6.8), CART = V(0.0, 0, 3.4);
  const prep = () => { const R = right(c); Gg.G.setMode('day'); Gg.G.flick(t); Gg.g1.mesh.visible = Gg.g2.mesh.visible = false; Gg.g1.shadow.visible = Gg.g2.shadow.visible = false;
    Gg.G.cart.visible = true; Gg.G.cart.position.copy(CART); Gg.G.cart.rotation.y = 0;
    // inventor: arc out of the tunnel, tumbling
    const u = lin(27.1, 27.6, t); let ip, roll = 0, pose;
    if (t < 27.6) { ip = V(mix(0, LAND.x, u), 1.1 + 2.6 * Math.sin(Math.PI * u) * 0.9 + (LAND.y - 1.1) * u, mix(-2.2, LAND.z, u)); roll = -u * Math.PI * 1.6;
      pose = { eyes: 'wide', mouth: 'o', brow: -0.2, sweat: true, arms: { L: [-190, -120], R: [190, -140] }, bend: { L: 30, R: -30 } }; }
    else { const k = lin(27.6, 27.8, t); ip = LAND.clone(); roll = 0; pose = { eyes: t < 28.6 ? 'spiral' : 'ring', mouth: t < 28.6 ? 'wobble' : 'line', brow: 0.1, sq: [1 + 0.25 * (1 - k), 1 - 0.25 * (1 - k)], arms: { L: [-150, 150], R: [150, 150] } }; }
    Gg.inv.mesh.visible = true; Gg.inv.update(c, at(ip), R, pose, 0, 0.3, roll);
    // jar: out of the arch, tumbling, onto the cart bed
    const v = lin(28.2, 28.6, t); Gg.J.root.visible = t > 28.15; const top = CART.clone().add(V(0, 0.68, 0));
    if (t < 28.6) { Gg.J.root.position.set(mix(0, top.x, v), mix(1.0, top.y, v) + 2.2 * Math.sin(Math.PI * v), mix(-2.6, top.z, v)); Gg.J.root.rotation.set(0.5 * (1 - v), 0.3 + v * 1.2, 0.3 * Math.sin(v * 6)); }
    else { const k = lin(28.6, 28.85, t); Gg.J.root.position.copy(top).add(V(0, 0.05 * Math.sin(k * Math.PI) , 0)); Gg.J.root.rotation.set(0, 1.5, 0); }
    Gg.J.root.scale.setScalar(0.62); for (let i = 0; i < 8; i++) { Gg.J.setJaw(i, 0.55); Gg.J.setBall(i, 'held'); }
    if (t > 27.55 && t < 28.3) Gg.dust.burst(LAND, lin(27.55, 28.3, t), 1.2); else if (t > 28.55 && t < 29.3) Gg.dust.burst(CART.clone().add(V(0, 0.2, 0.6)), lin(28.55, 29.3, t), 1.8); else Gg.dust.hide();
    FOLK.forEach(([x, z, col, hat], i) => { const m = Gg.folk[i]; m.mesh.visible = true; const lol = t > 27.75; const k = Math.sin(t * 15 + i * 2);
      m.update(c, at(V(x, 0, z)).add(V(0, lol ? 0.02 * Math.abs(k) : 0, 0)), R, { col, hat, eyes: lol ? 'happy' : 'dot', mouth: lol ? 'laugh' : 'o', tears: lol && i % 2 === 0, tilt: lol ? 0.1 * k : 0, look: [x < 0 ? 0.6 : -0.6, 0],
        arms: lol ? { L: [-150, 60 + 20 * k], R: [150, 60 - 20 * k] } : { L: [-140, 160], R: [140, 160] } }, 0, 0.3, lol ? 0.06 * k : 0); }); };
  return { haze: haze('day', 0.6), scene: Gg.S, camera: c, prep, focus: { dist: c.position.distanceTo(V(0, 1.5, 6)), range: 5, amt: 0.35 } }; };
// S17 37.27–40.43 — night, inside the gate: the portcullis is down; the inventor runs up the road and throws himself at the bars, screaming
SHOT.S17 = (t) => { const Gg = gate(); const c = camOf('S17', 900, 0.1);
  const [p, g, f] = keys([[37.2, V(0.1, 2.0, -10.5), V(0, 2.6, 6), 44], [38.7, V(0.08, 1.95, -9.2), V(0, 2.5, 6), 43], [40.5, V(0.06, 1.9, -8.6), V(0, 2.4, 6), 42]], t); aim(c, p, g, f);
  const prep = () => { const R = right(c); Gg.G.setMode('night'); Gg.G.flick(t); Gg.J.root.visible = false; Gg.dust.hide(); Gg.folk.forEach((m) => { m.mesh.visible = false; m.shadow.visible = false; }); Gg.g1.mesh.visible = Gg.g2.mesh.visible = false; Gg.g1.shadow.visible = Gg.g2.shadow.visible = false;
    const u = sst(37.3, 38.5, t); const run = t < 38.5; const ip = V(mix(1.5, 0.15, u), 0, mix(16, -0.05, u)); const ph = t * 14;
    Gg.inv.mesh.visible = true; Gg.inv.update(c, at(ip).add(V(0, run ? 0.03 * Math.abs(Math.sin(ph)) : 0, 0)), R, run ? { eyes: 'wide', mouth: 'o', sweat: true, brow: -0.2, arms: { L: [-160 + 40 * Math.sin(ph), 40], R: [160 - 40 * Math.sin(ph), 40] } }
      : { eyes: 'wide', mouth: Math.sin(t * 22) > -0.3 ? 'o' : 'grit', sweat: true, brow: -0.25, hairUp: Math.sin(t * 9) > 0, arms: { L: [-150, -170], R: [150, -170] }, bend: { L: 40, R: -40 }, dy: 4 * Math.sin(t * 30) }, 0, 0.3); };
  return { haze: haze('night', 0.2), scene: Gg.S, camera: c, prep, focus: { dist: Math.max(1.5, c.position.distanceTo(at(V(0.15, 0, mix(16, 0, sst(37.3, 38.5, t)))))), range: 1.2, amt: 0.6 } }; };
// S18 40.43–43.60 — night, on the wall walk: a guard leans on the parapet: "Hey, it's the toy guy…" and laughs
SHOT.S18 = (t) => { const Gg = gate(); const c = camOf('S18', 900, 0.1);
  const [p, g, f] = keys([[40.3, V(11.9, 10.75, 22.5), V(10.6, 10.0, 8.0), 46], [43.7, V(11.85, 10.72, 21.6), V(10.6, 10.0, 8.0), 45]], t); aim(c, p, g, f);
  const prep = () => { const R = right(c); Gg.G.setMode('night'); Gg.G.flick(t); Gg.J.root.visible = false; Gg.dust.hide(); Gg.inv.mesh.visible = false; Gg.inv.shadow.visible = false; Gg.folk.forEach((m) => { m.mesh.visible = false; m.shadow.visible = false; });
    const talk = t < 42.0 && Math.sin(t * 17) > 0, lol = t > 42.0; const k = Math.sin(t * 14);
    Gg.g1.mesh.visible = true; Gg.g1.update(c, at(V(11.75, 9.0, 16.8)), R, { eyes: lol ? 'happy' : 'dash', mouth: lol ? 'laugh' : talk ? 'o' : 'smirk', brow: lol ? -0.1 : 0.05, tears: lol, stache: 'droop', halberd: false, tilt: lol ? 0.1 * k : 0.08,
      arms: { L: [-150, 40], R: [170, -10] }, bend: { L: -40, R: 40 } }, 9.0, 0.3, lol ? 0.05 * k : 0.06);
    Gg.g2.mesh.visible = true; Gg.g2.update(c, at(V(11.2, 9.0, 11.0)), R, { eyes: lol ? 'happy' : 'dot', mouth: lol ? 'laugh' : 'line', halberdX: 170 }, 9.0, 0.3); };
  return { haze: haze('night', 0.2), scene: Gg.S, camera: c, prep, focus: { dist: c.position.distanceTo(V(11.75, 9.9, 16.8)), range: 1.5, amt: 0.5 } }; };

// ================= the countryside (lazy): camp, valley, palace; S14–S16, S20–S21, S25, S27 =================
let OUT = null;
function out() { if (OUT) return OUT; const S = new THREE.Scene(); const O = buildOutdoor(S); const J = makeJar(); J.root.position.copy(O.JAR); J.root.rotation.y = -1.22; S.add(J.root);
  const cart = makeCart(); S.add(cart); const J2 = makeJar(); J2.root.scale.setScalar(0.62); S.add(J2.root);   // J2: the jar riding the cart up the slope (S14)
  const mk = (fn) => { const f = makeFlat(SZ, 1024, fn); S.add(f.mesh); S.add(f.shadow); f.shadow.material.color.set(0x1a2a14); return f; };
  // the glowing crack that opens in the ground at the end of S27 (leads into the S28 cutaway)
  const crack = makeCard(5, 5, 1024, (c, W, H) => { c.clearRect(0, 0, W, H); const r = (k) => Math.sin(k * 12.9898) * 43758.5453 % 1;
    const path = []; let x = W * 0.08, y = H * 0.9; for (let k = 0; k < 14; k++) { path.push([x, y]); x += W * 0.065 + Math.abs(r(k)) * W * 0.02; y -= H * 0.055 + (r(k + 7)) * H * 0.04; }
    for (const [w, col] of [[60, 'rgba(255,170,40,0.25)'], [26, 'rgba(255,190,60,0.7)'], [10, '#fff2b0']]) { c.strokeStyle = col; c.lineWidth = w; c.lineJoin = 'miter'; c.beginPath(); path.forEach(([a, b], i) => (i ? c.lineTo(a, b) : c.moveTo(a, b))); c.stroke(); }
    c.strokeStyle = '#fff2b0'; c.lineWidth = 6; for (let k = 3; k < 12; k += 3) { const [a, b] = path[k]; c.beginPath(); c.moveTo(a, b); c.lineTo(a + W * 0.08, b + H * 0.04); c.stroke(); } }, { transparent: true });
  crack.rotation.x = -Math.PI / 2; crack.material.depthWrite = false; crack.material.toneMapped = false; S.add(crack);
  if (!QS.has('toon')) pbrify(S, E.renderer, { env: 0.3 });
  const rope = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: 0xc8a070, roughness: 0.9 })); rope.visible = false; S.add(rope);
  for (const y of [0.55, 1.25]) { const lash = new THREE.Mesh(new THREE.TorusGeometry(JAR.R * 1.005, 0.02, 6, 64), new THREE.MeshStandardMaterial({ color: 0xc8a070, roughness: 0.9 })); lash.rotation.x = Math.PI / 2; lash.position.y = y; J2.root.add(lash); }
  const dust = puffs(S, 10);
  OUT = { S, O, J, J2, cart, crack, rope, dust, inv: mk(INVENTOR), haul: mk(INVENTOR_HAUL) }; OUT.haul.mesh.visible = false; return OUT; }
const onGround = (x, z, dy = 0) => V(x, height(x, z) + dy, z);
const zzz = (k) => (c) => { c.save(); c.setTransform(c.getTransform()); c.font = '800 120px Montserrat'; c.fillStyle = '#f4f0ff'; c.strokeStyle = '#2a1a16'; c.lineWidth = 14;
  for (let i = 0; i < 3; i++) { const ph = (k + i / 3) % 1; c.globalAlpha = Math.min(1, ph * 4, (1 - ph) * 3); const x = 150 + ph * 120 + i * 10, y = -560 - ph * 260, s = 0.6 + ph * 0.6;
    c.save(); c.translate(x, y); c.scale(s, s); c.strokeText('Z', 0, 0); c.fillText('Z', 0, 0); c.restore(); } c.restore(); };
const lantern = (lit) => (c, a) => { const [x, y] = a.R; line(c, [[x, y], [x, y + 60]], 6, INK); c.beginPath(); c.roundRect(x - 34, y + 60, 68, 92, 12); c.fillStyle = lit ? '#ffd27a' : '#c8a060'; c.fill(); c.lineWidth = 8; c.strokeStyle = INK; c.stroke();
  c.beginPath(); c.moveTo(x - 40, y + 60); c.lineTo(x + 40, y + 60); c.stroke(); c.beginPath(); c.arc(x, y + 106, 14, 0, 7); c.fillStyle = '#fff6d0'; c.fill(); };
function outReset(Oo) { Oo.haul.mesh.visible = false; Oo.haul.shadow.visible = false; Oo.rope.visible = false; Oo.dust.hide(); Oo.cart.visible = false; Oo.J2.root.visible = false; Oo.J.root.visible = true; Oo.crack.visible = false; Oo.O.setCollapse(0); for (let i = 0; i < 8; i++) { Oo.J.setJaw(i, 0.55); Oo.J.setBall(i, 'held'); } }
// S14 29.70–31.80 — sunset: the inventor hauls the jar on a cart up a steep hill, the sun huge behind the ridge
SHOT.S14 = (t) => { const Oo = out(); const c = camOf('S14', 900, 0.1); const SL = Oo.O.SLOPE, A = Oo.O.SLOPE_A, cA = Math.cos(A);
  const surf = (xx) => SL.clone().add(V(xx, Math.tan(A) * xx + Oo.O.SLOPE_Y0, 5.0));
  // he hauls in pulses: each step leans into the rope (surge), the cart creeps on; one pace ≈ 0.42 s
  const PACE = 0.42, ph = (t - 29.7) / PACE; const surge = (k) => (Math.floor(k) + ss01(k - Math.floor(k))) ;
  const sAlong = 0.62 * surge(Math.max(0, ph)) * 0.36 + 0.05;   // metres climbed along the slope
  const xi = 0.5 + sAlong * cA;                                  // inventor (horizontal coordinate on the slab)
  const ROPE = 0.55, CART_BACK = ROPE + 2.2;                     // hands → hitch, hitch → cart origin (along the slope)
  const xc = xi - CART_BACK * cA;
  const mid = surf(xi - 1.15);
  const [p, g, f] = keys([[29.6, mid.clone().add(V(0.0, 1.9, 17.5)), mid.clone().add(V(0.0, 2.1, 0)), 33], [31.9, mid.clone().add(V(0.05, 1.9, 17.0)), mid.clone().add(V(0.05, 2.15, 0)), 32.5]], t); aim(c, p, g, f);
  const prep = () => { const R = right(c); outReset(Oo); Oo.O.setMode('sunset', { center: SL, sunDir: V(0.07, 0.07, -1), noClouds: false, sunScale: 330 });
    // cart: local −x points up the slope, local y along the slope normal; origin on the ground under the axle
    const fw = V(cA, Math.sin(A), 0), nrm = V(-Math.sin(A), cA, 0); const M = new THREE.Matrix4().makeBasis(fw.clone().negate(), nrm, V(0, 0, -1));
    Oo.cart.visible = true; Oo.cart.quaternion.setFromRotationMatrix(M); Oo.cart.position.copy(surf(xc + 0.1 * cA)).addScaledVector(nrm, 0.0);
    Oo.cart.userData.wheels.forEach((w) => { w.rotation.z = (sAlong / 0.42); });
    Oo.cart.updateMatrixWorld(true);
    // the jar rides upright on the bed (tilted with it), lashed with two rope rings
    Oo.J2.root.visible = true; Oo.J2.root.position.copy(Oo.cart.localToWorld(V(0.15, 0.68, 0))); Oo.J2.root.quaternion.copy(Oo.cart.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), 2.3));
    Oo.J2.root.scale.setScalar(0.6); for (let i = 0; i < 8; i++) { Oo.J2.setJaw(i, 0.55); Oo.J2.setBall(i, 'held'); }
    // the inventor: front view, leaning up the hill into the rope, both fists at his chest; a bob + sway on every pace
    // the inventor in three-quarter side view, bent into the rope; leans deeper on each heave
    Oo.J.root.visible = false; Oo.inv.mesh.visible = false; Oo.inv.shadow.visible = false; Oo.haul.mesh.visible = true;
    const k = ph - Math.floor(ph), step = Math.sin(Math.PI * k);
    const pose = { lean: 0.62 + 0.1 * step, stride: Math.sin(Math.PI * ph), dy: -8 * step, eyes: 'dash', mouth: 'grit', brow: 0.34, sweat: true, look: [0.6, 0.1] };
    const foot = surf(xi); const anchor = at(foot);
    Oo.haul.update(c, anchor, R, pose, foot.y, 0.25, 0);
    const re = INVENTOR_HAUL_ROPE(pose);
    const a0 = Oo.cart.localToWorld(Oo.cart.userData.hitch.clone()), a1 = onFlat(c, anchor, re[0], re[1]).add(V(0, 0, -0.02));
    const sag = 0.03 + 0.05 * (1 - step); const m = a0.clone().lerp(a1, 0.5).add(V(0, -sag, 0));
    Oo.rope.visible = true; Oo.rope.geometry.dispose(); Oo.rope.geometry = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a0, m, a1), 24, 0.014, 6, false);
    // dust kicked up by the wheels on each surge
    Oo.dust.burst(surf(xc - 0.25 * cA).add(V(0, 0.05, 0.4)), k, 0.45, 0xe8b8a8); };
  return { haze: haze('sunset', 0.15), scene: Oo.S, camera: c, prep, focus: { dist: c.position.distanceTo(mid), range: 2.5, amt: 0.35 } }; };
const ss01 = (x) => x * x * (3 - 2 * x);
// S15 31.80–33.10 — sunset at the camp on the hill above the palace: fire, laundry line, the inventor stands by the jar
SHOT.S15 = (t) => { const Oo = out(); const c = camOf('S15', 900, 0.1);
  const [p, g, f] = keys([[31.7, V(1.0, 2.9, 9.6), V(-1.0, 0.9, -5), 50], [33.2, V(0.9, 2.8, 9.0), V(-1.0, 0.9, -5), 49]], t); aim(c, p, g, f);
  const prep = () => { const R = right(c); outReset(Oo); Oo.O.setMode('sunset', { sunDir: V(-0.05, 0.08, -1) }); Oo.O.flick(t); Oo.inv.mesh.visible = true;
    Oo.inv.update(c, at(onGround(-0.1, 1.2)), R, { eyes: 'dash', mouth: 'line', brow: 0.15, look: [0.3, 0], arms: { L: [-140, 160], R: [140, 160] } }, height(-0.1, 1.2), 0.3); };
  return { haze: haze('sunset', 0.3), scene: Oo.S, camera: c, prep, focus: { dist: c.position.distanceTo(onGround(-0.1, 1.2, 0.8)), range: 3, amt: 0.35 } }; };
// S16 33.10–37.27 — night: he sleeps against the jar (Zzz); a ball drops (33.6), another (34.5), then all eight (35.3–35.7); pull back; he wakes, hair on end (36.5)
const SLEEP = () => onGround(0.85, 1.65);
SHOT.S16 = (t) => { const Oo = out(); const c = camOf('S16', 900, 0.1); const JP = Oo.O.JAR;
  const [p, g, f] = keys([[33.0, SLEEP().add(V(0.15, 1.55, 1.45)), JP.clone().add(V(-0.1, 1.55, 0)), 44], [35.6, SLEEP().add(V(0.1, 1.5, 1.6)), JP.clone().add(V(-0.1, 1.45, 0)), 44], [36.6, JP.clone().add(V(-0.6, 2.2, 7.6)), JP.clone().add(V(0, 1.15, 0)), 46], [37.4, JP.clone().add(V(-0.6, 2.18, 7.3)), JP.clone().add(V(0, 1.15, 0)), 46]], t); aim(c, p, g, f);
  const prep = () => { const R = right(c); outReset(Oo); Oo.O.setMode('night'); Oo.O.flick(t); Oo.inv.mesh.visible = true;
    const awake = t > 36.5; const ord = [1, 2]; const drop = (i) => (i === 1 ? 33.6 : i === 2 ? 34.5 : 35.3 + (i % 4) * 0.08);
    for (let i = 0; i < 8; i++) { const t0 = drop(i), u = lin(t0, t0 + 0.45, t); Oo.J.setJaw(i, 0.55); Oo.J.setBall(i, u <= 0 ? 'held' : u < 1 ? 'fall' : 'caught', u); }
    Oo.inv.update(c, at(SLEEP()).add(V(0, awake ? 0 : -0.06, 0)), R, awake ? { eyes: 'wide', mouth: 'grit', brow: -0.3, hairUp: true, sweat: true, arms: { L: [-170, -60], R: [170, -60] }, dy: -10 * Math.max(0, Math.sin((t - 36.5) * 18)) }
      : { eyes: 'closed', mouth: 'o', brow: 0.1, tilt: 0.18, sq: [1, 0.97], arms: { L: [-120, 170], R: [120, 170] }, hold: zzz(t * 0.7) }, height(SLEEP().x, SLEEP().z), 0.3, awake ? 0 : 0.12); };
  const fd = t < 35.6 ? c.position.distanceTo(at(SLEEP())) : c.position.distanceTo(JP);
  return { haze: haze('night', 0.2), scene: Oo.S, camera: c, prep, focus: { dist: fd, range: 0.8, amt: 0.6 } }; };
// S19 43.60–46.03 — night, outside the shut gate: the inventor walks back up the road with a lantern, head down
SHOT.S19 = (t) => { const Gg = gate(); const c = camOf('S19', 900, 0.1);
  const [p, g, f] = keys([[43.5, V(0.4, 1.8, 17.5), V(0, 5.2, 0), 66], [46.1, V(0.35, 1.75, 16.8), V(0, 5.1, 0), 65]], t); aim(c, p, g, f);
  const prep = () => { const R = right(c); Gg.G.setMode('night'); Gg.G.flick(t); Gg.J.root.visible = false; Gg.dust.hide(); Gg.folk.forEach((m) => { m.mesh.visible = false; m.shadow.visible = false; }); Gg.g1.mesh.visible = Gg.g2.mesh.visible = false; Gg.g1.shadow.visible = Gg.g2.shadow.visible = false;
    const u = lin(43.6, 46.1, t), ph = t * 8; const ip = V(0.2 + 0.05 * Math.sin(ph / 2), 0, mix(10.5, 14.0, u));
    Gg.inv.mesh.visible = true; Gg.inv.update(c, at(ip).add(V(0, 0.02 * Math.abs(Math.sin(ph)), 0)), R, { eyes: 'dash', mouth: 'frown', brow: 0.35, tilt: 0.06, look: [0, 0.5], arms: { L: [-130, 160 + 10 * Math.sin(ph)], R: [150, 60] }, bend: { L: -30, R: 30 }, hold: lantern(true) }, 0, 0.3); };
  return { haze: haze('night', 0.2), scene: Gg.S, camera: c, prep, focus: { dist: c.position.distanceTo(V(0.2, 1.4, 5)), range: 2, amt: 0.5 } }; };
// S20 46.03–47.33 — the next morning from the camp: far across the valley the palace begins to fall, a dust column rises (46.6→)
const VIEW = () => onGround(-0.4, 6.5, 2.1);
SHOT.S20 = (t) => { const Oo = out(); const c = camOf('S20', 900, 0.1);
  const tgt = PAL.clone().add(V(0, 2, 0)); const [p, g, f] = keys([[46.0, VIEW(), tgt, 44], [47.4, VIEW().add(V(0, 0, -0.3)), tgt, 43]], t); aim(c, p, g, f);
  const prep = () => { const R = right(c); outReset(Oo); Oo.O.setMode('morning', { sunDir: V(-0.55, 0.1, -1) }); Oo.O.setCollapse(0.38 * sst(46.55, 47.4, t)); Oo.inv.mesh.visible = true;
    Oo.inv.update(c, at(onGround(-1.9, 1.2)), R, { eyes: t > 46.7 ? 'ring' : 'dash', mouth: t > 46.7 ? 'o' : 'line', brow: 0, look: [0, -0.4], arms: { L: [-140, 160], R: [140, 160] } }, height(-1.9, 1.2), 0.3); };
  return { haze: haze('morning', 0.2), scene: Oo.S, camera: c, prep, focus: { dist: 30, range: 200, amt: 0.0 } }; };
// S21 47.33–48.90 — closer (long lens from the hill): the palace crumbles into a pile of stone, debris and a towering dust column, birds scatter
SHOT.S21 = (t) => { const Oo = out(); const c = camOf('S21', 900, 0.5);
  const tgt = PAL.clone().add(V(0, 9, 0)); const [p, g, f] = keys([[47.3, VIEW().add(V(0.5, 5, -10)), tgt, 8], [48.95, VIEW().add(V(0.5, 5, -10)), tgt.clone().add(V(0, 4, 0)), 9]], t); aim(c, p, g, f);
  const prep = () => { outReset(Oo); Oo.O.setMode('morning', { sunDir: V(-0.55, 0.1, -1) }); Oo.O.setCollapse(mix(0.38, 0.95, sst(47.33, 48.9, t))); Oo.inv.mesh.visible = false; Oo.inv.shadow.visible = false; };
  return { haze: haze('morning', 0.2), scene: Oo.S, camera: c, prep, focus: { dist: c.position.distanceTo(PAL), range: 40, amt: 0.0 } }; };
// S25 55.57–58.33 — back outside: a dragon's jaw creaks open (55.8–56.4) and its ball drops into the frog below (56.6–57.2)
SHOT.S25 = (t) => { const Oo = out(); const c = camOf('S25', 900, 0.05); const FD = 1; const hp = Oo.J.headWorld(FD), fp = Oo.J.frogWorld(FD);
  const outV = hp.clone().sub(Oo.O.JAR).setY(0).normalize(); const side = V(-outV.z, 0, outV.x);
  const [p, g, f] = keys([[55.5, hp.clone().addScaledVector(outV, 1.35).addScaledVector(side, 0.35).add(V(0, -0.15, 0)), hp.clone().add(V(0, -0.12, 0)), 40],
    [56.5, hp.clone().addScaledVector(outV, 1.25).addScaledVector(side, 0.3).add(V(0, -0.2, 0)), hp.clone().add(V(0, -0.2, 0)), 40],
    [57.3, hp.clone().addScaledVector(outV, 1.45).addScaledVector(side, 0.25).add(V(0, -0.5, 0)), fp.clone().add(V(0, 0.25, 0)), 42], [58.4, hp.clone().addScaledVector(outV, 1.5).addScaledVector(side, 0.25).add(V(0, -0.55, 0)), fp.clone().add(V(0, 0.22, 0)), 42]], t); aim(c, p, g, f);
  const prep = () => { outReset(Oo); Oo.O.setMode('morning', { sunDir: V(-0.55, 0.1, -1) }); Oo.O.setCollapse(1); Oo.inv.mesh.visible = false; Oo.inv.shadow.visible = false;
    for (let i = 0; i < 8; i++) Oo.J.setBall(i, 'held'); Oo.J.setJaw(FD, 0.55 + 0.4 * sst(55.8, 56.4, t)); const u = lin(56.6, 57.2, t); Oo.J.setBall(FD, u <= 0 ? 'held' : u < 1 ? 'fall' : 'caught', u); };
  return { haze: haze('morning', 0.2), scene: Oo.S, camera: c, prep, focus: { dist: c.position.distanceTo(t < 56.6 ? hp : fp), range: 0.3, amt: 0.8 } }; };
// S27 59.60–62.10 — the valley at sunrise, the jar on its hill, the ruined palace beyond; slow push; a glowing crack runs across the ground (61.3→)
SHOT.S27 = (t) => { const Oo = out(); const c = camOf('S27', 900, 0.1); const JP = Oo.O.JAR;
  const [p, g, f] = keys([[59.5, JP.clone().add(V(0.3, 2.5, 11.5)), JP.clone().add(V(0, 0.9, -12)), 46], [62.2, JP.clone().add(V(0.25, 2.35, 10.0)), JP.clone().add(V(0, 0.8, -12)), 45]], t); aim(c, p, g, f);
  const prep = () => { outReset(Oo); Oo.O.setMode('morning', { sunDir: V(-0.55, 0.1, -1) }); Oo.O.setCollapse(1); Oo.inv.mesh.visible = false; Oo.inv.shadow.visible = false;
    for (let i = 0; i < 8; i++) Oo.J.setBall(i, i === 1 ? 'caught' : 'held');
    const k = sst(61.2, 62.1, t); Oo.crack.visible = k > 0; Oo.crack.position.copy(JP).add(V(0.4, 0, 5.0)).setY(height(JP.x + 0.4, JP.z + 5.0) + 0.14); Oo.crack.scale.set(k, k, 1); Oo.crack.material.opacity = Math.min(1, k * 2); };
  return { haze: haze('morning', 0.2), scene: Oo.S, camera: c, prep, focus: { dist: c.position.distanceTo(JP), range: 2.5, amt: 0.4 } }; };

// ================= inside the jar (S22–S24) =================
let INNER = null;
function inner() { if (INNER) return INNER; const S = new THREE.Scene(); const I = buildInner(S); if (!QS.has('toon')) pbrify(S, E.renderer, { env: 0.25 }); INNER = { S, I }; return INNER; }
// S22 48.90–52.80 — inside the jar, straight down the pendulum: the heavy bob, eight rods to the dragons, lamps; slow turn + push down
SHOT.S22 = (t) => { const Ii = inner(); const c = camOf('S22', 60, 0.05); const u = sst(48.9, 52.7, t); const th = 0.5 + u * 0.9, rr = mix(0.55, 0.45, u), y = mix(8.05, 6.3, u);
  aim(c, V(Math.cos(th) * rr, y, Math.sin(th) * rr), V(0, IN.ROD_Y, 0), mix(74, 64, u));
  const prep = () => { Ii.I.reset(); Ii.I.bat.visible = false; };
  return { scene: Ii.S, camera: c, prep, focus: { dist: y - IN.ROD_Y, range: 1.5, amt: 0.4 } }; };
// S23 52.80–55.00 — fast orbit (52.8–53.15) down to a side view of the bob; a bat clings to its top; the pendulum swings into a rod (54.0–54.9)
SHOT.S23 = (t) => { const Ii = inner(); const c = camOf('S23', 60, 0.05); const bob = V(0, IN.PIV - (IN.PIV - IN.ROD_Y - 0.25), 0);
  const o = sst(52.8, 53.15, t); const ang = mix(1.4, 2.6, o) + 0.12 * lin(53.15, 55, t); const rad = mix(0.5, 2.75, o), y = mix(6.3, bob.y + 1.0, o);
  aim(c, V(Math.cos(ang) * rad, y, Math.sin(ang) * rad), bob.clone().add(V(0, mix(-3, 0.15, o), 0)), mix(64, 52, o));
  const prep = () => { Ii.I.reset(); const sw = 0.068 * Math.sin(Math.PI * lin(54.0, 54.9, t)) * (t < 54.9 ? 1 : 0) + (t >= 54.6 ? 0.066 : 0) * lin(54.6, 54.9, t) * 0;
    Ii.I.setSwing(t < 54.0 ? 0 : 0.068 * Math.sin(Math.min(Math.PI / 2, (t - 54.0) / 0.6 * Math.PI / 2)), 0); Ii.I.bat.visible = true; Ii.I.bat.quaternion.copy(c.quaternion);
    Ii.I.bat.parent.updateMatrixWorld(true); const q = Ii.I.bat.parent.getWorldQuaternion(new THREE.Quaternion()).invert(); Ii.I.bat.quaternion.premultiply(q); };
  return { scene: Ii.S, camera: c, prep, focus: { dist: c.position.distanceTo(bob), range: 0.6, amt: 0.6 } }; };
// S24 55.00–55.57 — whip up along the struck rod to the wall: the rod snaps at its crank (55.05–55.45)
SHOT.S24 = (t) => { const Ii = inner(); const c = camOf('S24', 60, 0.05); const u = sst(55.0, 55.5, t);
  aim(c, V(mix(1.2, 1.6, u), mix(3.2, 3.9, u), mix(-0.9, -1.1, u)), V(mix(2.6, IN.R, u), mix(3.0, 4.9, u), mix(0.2, 0.35, u)), 50);
  const prep = () => { Ii.I.reset(); Ii.I.setSwing(0.066, 0); Ii.I.bat.visible = false; Ii.I.snap(0, sst(55.05, 55.45, t)); };
  return { scene: Ii.S, camera: c, prep, focus: { dist: 1.6, range: 0.5, amt: 0.5 } }; };
// ================= the far mountain (S26) and the cutaway (S28) =================
let MTN = null, CUT = null;
function mtn() { if (MTN) return MTN; const S = new THREE.Scene(); const M = buildMountain(S); if (!QS.has('toon')) pbrify(S, E.renderer, { env: 0.25 }); MTN = { S, M }; return MTN; }
function cut() { if (CUT) return CUT; const S = new THREE.Scene(); const C = buildCutaway(S); if (!QS.has('toon')) pbrify(S, E.renderer, { env: 0.25 }); CUT = { S, C }; return CUT; }
// S26 58.33–59.60 — a distant mountain at sunset: a landslide pours down its face
SHOT.S26 = (t) => { const Mm = mtn(); const c = camOf('S26', 1200, 0.5);
  const [p, g, f] = keys([[58.2, V(0, 12, 70), V(-12, 72, -150), 42], [59.7, V(0, 12, 64), V(-12, 72, -150), 41]], t); aim(c, p, g, f);
  const prep = () => { Mm.M.sky.setMode('sunset', { center: V(0, 0, -60), sunDir: V(0.6, 0.06, -1) }); Mm.M.landslide(sst(58.45, 59.6, t)); };
  return { haze: haze('sunset', 0.12), scene: Mm.S, camera: c, prep, focus: { amt: 0 } }; };
// S28 62.10–64.83 — the camera sinks from the cracked road into a cutaway of the ground: rock layers split by a glowing fault
SHOT.S28 = (t) => { const Cc = cut(); const c = camOf('S28', 1200, 0.1);
  const [p, g, f] = keys([[62.0, V(0.5, 7.5, 24), V(0.4, 0.5, 0), 46], [62.9, V(0.5, 4.5, 26), V(0.4, -2.0, 0), 46], [64.9, V(0.5, -6.5, 30), V(0.4, -9.0, 0), 50]], t); aim(c, p, g, f);
  const prep = () => { Cc.C.sky.setMode('sunset', { sunDir: V(0.1, 0.12, -1) }); Cc.C.glow(mix(0.45, 1, sst(62.1, 64.5, t))); };
  return { haze: haze('sunset', 0.25), scene: Cc.S, camera: c, prep, focus: { amt: 0 } }; };

// ================= placeholder for shots not built yet =================
const PH = new THREE.Scene(); PH.background = new THREE.Color(0x202028); const phCam = new THREE.PerspectiveCamera(35, E.W / E.H, 0.1, 10);
const phCard = (() => { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const tx = new THREE.CanvasTexture(cv); const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 1), new THREE.MeshBasicMaterial({ map: tx, transparent: true }));
  m.position.z = -4; PH.add(m); return { draw(s) { const g = cv.getContext('2d'); g.clearRect(0, 0, 512, 256); g.fillStyle = '#ccc'; g.font = '800 60px Montserrat'; g.textAlign = 'center'; g.fillText(s, 256, 140); tx.needsUpdate = true; } }; })();
const placeholder = (id) => ({ scene: PH, camera: phCam, prep: () => phCard.draw(id + ' — todo'), focus: { amt: 0 } });

// ================= assembly =================
const KIND = { crash: 'crash', whip: 'whip', cut: null, 'dolly-blur': 'crash', dissolve: 'dissolve', 'push-cut': 'crash', 'match-dissolve': 'dissolve', flare: 'dissolve', smoke: 'smoke', 'fast-orbit': 'whip', 'pan-dissolve': 'dissolve', 'dissolve-descend': 'dissolve' };
const CAP = makeCaptions(E.W, E.H, CUES); const OV = makeOverlay(E.W, E.H);
// per-shot lights must not leak into other shots (frames render in any order on any worker)
const shotAt = (id, t) => { if (!SHOT[id]) return placeholder(id); const sh = SHOT[id](t); const p0 = sh.prep;
  sh.prep = () => { if (HALL) resetHall(id); p0 && p0(); }; return sh; };
function resetHall(id) { const H = HALL;
  if (H.key2) H.key2.visible = false; if (H.rod) H.rod.visible = false; H.S.environmentIntensity = 0.3; SKIN_MAT.color.setScalar(1); H.J.root.visible = true; H.J.dragons.forEach((d) => { d.visible = true; }); H.J.frogs.forEach((fr) => { fr.visible = true; });
  for (const k of ['banquet', 'cup', 'webs', 'pigeon']) H.X[k].visible = false; H.mins.forEach((m) => { m.mesh.visible = false; m.shadow.visible = false; });
  for (const f of [H.inv, H.emp, H.g1, H.g2]) f.shadow.visible = true; }
function render(t) {
  t = clamp(t, 0, DUR - 1e-4); const fr = Math.floor(t * FPS + 1e-6);
  const k = SHOTS.findIndex((s) => fr >= s.f0 && fr < s.f1); const s = SHOTS[k];
  // a transition straddles the boundary between shot k-1|k (or k|k+1); its frames come from the measured frame map
  const tr = TRANS.find((x) => fr >= x.f0 && fr <= x.f1); let A, B = null, trans = null;
  if (tr && KIND[tr.kind]) { const i = TRANS.indexOf(tr); const from = SHOTS[i].id, to = SHOTS[i + 1].id; const p = (fr - tr.f0 + 0.5) / (tr.f1 - tr.f0 + 1);
    A = shotAt(from, t); B = shotAt(to, t); trans = { kind: KIND[tr.kind], p, dir: [1, 0], zoom: 0.4, c: [0.5, 0.5] }; }
  else A = shotAt(s.id, t);
  const ov = (B && trans.p > 0.5 ? B : A).overlay; if (ov) OV.draw(ov); else OV.clear();
  CAP.draw(t, !QS.has('nocap'));
  E.frame({ A, B, trans, overlay: OV, captions: CAP, vig: 0.16, sat: 1.08, bloom: 0.3, bloomTh: 1.0 });
}
window.__hall = () => hall(); window.DUR = DUR; window.EV = []; window.CUES = CUES; window.render = render;
window.grabPNG = (t) => { render(t); return E.canvas.toDataURL('image/png').split(',')[1]; };
window.grab = (t) => { render(t); return E.canvas.toDataURL('image/jpeg', 0.95).split(',')[1]; };
render(0); window.READY = true;
