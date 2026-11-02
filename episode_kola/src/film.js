// The Deepest Hole — the Kola Superdeep Borehole (no narration: captions, music, SFX). Timeline from framemap.js
// (make_map.py ← SCRIPT.md). Every frame is a pure function of t. Page contract: DUR, EV, render(t), grab(t), grabPNG(t), READY.
// Worlds: arctic (the site + the rusty cap), column (the cut-open crust, 1 unit = 1 km), globe (Earth with a quarter cut away).
import * as THREE from './three.module.js';
import { DUR, FPS, SHOTS, TRANS, CUES } from './framemap.js';
import { clamp, mix } from './toon.js';
import { createEngine } from './engine.js';
import { makeFlat, makeCard, setFlatTarget, signText } from './flat.js';
import { makeCaptions } from './captions.js';
import { makeOverlay } from './fx2d.js';
import { pbrify } from './pbr.js';
import { haze } from './sky.js';
import { buildArctic } from './arctic.js';
import { buildColumn } from './column.js';
import { buildGlobe } from './globe.js';
import { SCIENTIST, clipboard } from './cast.js';

await Promise.all([['800 40px Montserrat', 'Ab1'], ['800 40px Kanit', 'Ab1'], ['800 40px Kanit', 'กขคภูมิ']].map(([f, s]) => document.fonts.load(f, s)));   // the Thai subset loads only for Thai text
const QS = new URLSearchParams(location.search);
const E = createEngine({ W: innerWidth, H: innerHeight, clear: 0x8090b0 }); setFlatTarget(E.SH);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sst = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
const lerpV = (a, b, u) => a.clone().lerp(b, u);
const SZ = 1.9;
const cam = {}; const camOf = (id, far = 600, near = 0.02) => (cam[id] = cam[id] || new THREE.PerspectiveCamera(35, E.W / E.H, near, far));
function aim(c, pos, tgt, fov, roll = 0) { c.position.copy(pos); c.up.set(0, 1, 0); c.lookAt(tgt); if (roll) c.rotateZ(roll); c.fov = fov; c.aspect = E.W / E.H; c.updateProjectionMatrix(); c.updateMatrixWorld(true); }
const right = (c) => V(1, 0, 0).applyQuaternion(c.quaternion);
function keys(K, t) { let i = 0; while (i < K.length - 2 && t > K[i + 1][0]) i++; const a = K[i], b = K[i + 1]; const u = sst(a[0], b[0], t);
  return [lerpV(a[1], b[1], u), lerpV(a[2], b[2], u), mix(a[3], b[3], u)]; }
const T0 = Object.fromEntries(SHOTS.map((s) => [s.id, s.t0])), T1 = Object.fromEntries(SHOTS.map((s) => [s.id, s.t1]));
const loc = (id, t) => t - T0[id];   // shot-local time

// ================= worlds (lazy) =================
let ARC = null; function arctic() { if (ARC) return ARC; const S = new THREE.Scene(); const A = buildArctic(S); if (!QS.has('toon')) pbrify(S, E.renderer, { env: 0.34 });
  const mk = (fn) => { const f = makeFlat(SZ, 1024, fn); S.add(f.mesh); S.add(f.shadow); f.shadow.material.color.set(0x5a6a8a); return f; };
  ARC = { S, A, s1: mk(SCIENTIST), s2: mk(SCIENTIST) }; return ARC; }
let COL = null; function column() { if (COL) return COL; const S = new THREE.Scene(); const C = buildColumn(S); if (!QS.has('toon')) pbrify(S, E.renderer, { env: 0.34 });
  const mk = (fn) => { const f = makeFlat(SZ * 0.6, 1024, fn); S.add(f.mesh); f.shadow.visible = false; return f; };
  COL = { S, C, sc: mk(SCIENTIST) }; return COL; }
let GLO = null; function globe() { if (GLO) return GLO; const S = new THREE.Scene(); const G = buildGlobe(S); GLO = { S, G }; return GLO; }
const HAZE_ARC = { ...haze('arctic', 0.6), max: 0.35 };
const arcReset = (W) => { W.A.sky.setMode('arctic'); W.A.boil(0, 0); W.A.stop.visible = false; };
const hideFlats = (W) => { for (const k of ['s1', 's2']) if (W[k]) { W[k].mesh.visible = false; W[k].shadow.visible = false; } };

// ================= shots =================
const SHOT = {};
// K01 — the rusty cap in the snow: slow push down onto it, the site soft behind
SHOT.K01 = (t) => { const W = arctic(); const c = camOf('K01'); const u = loc('K01', t);
  const [p, g, f] = keys([[0, V(1.7, 1.55, 2.9), V(0, 0.38, 0), 38], [3.6, V(1.25, 1.2, 2.1), V(0, 0.42, 0), 36]], u); aim(c, p, g, f);
  const prep = () => { hideFlats(W); arcReset(W); W.A.ruin(1); W.A.bore.visible = false; W.A.capParts.forEach((m) => { m.visible = true; }); if (W.ruler) { W.ruler.visible = false; W.boot.visible = false; } };
  return { haze: HAZE_ARC, scene: W.S, camera: c, prep, focus: { dist: c.position.distanceTo(V(0, 0.45, 0)), range: 0.2, amt: 0.9 } }; };
// K02 — 1970: the working site, two scientists in front, one with a clipboard; camera cranes up toward the derrick
SHOT.K02 = (t) => { const W = arctic(); const c = camOf('K02'); const u = loc('K02', t);
  const [p, g, f] = keys([[0, V(0.2, 1.2, 7.6), V(-0.2, 2.4, -2), 44], [5.6, V(1.0, 1.1, 9.4), V(-1.2, 6.5, -20), 46]], u); aim(c, p, g, f);
  const prep = () => { arcReset(W); for (const k of ['s1', 's2']) { W[k].mesh.visible = true; } W.A.capParts.forEach((m) => { m.visible = true; }); if (W.ruler) { W.ruler.visible = false; W.boot.visible = false; } W.A.ruin(0); W.A.winOn = 0.9; W.A.winM.emissiveIntensity = 0.9; W.A.bore.visible = false; const R = right(c);
    W.s1.update(c, V(-0.75, 0.43 * SZ, 1.9), R, { eyes: 'dot', mouth: 'smile', look: [0.5, -0.1], arms: { L: [-150, 170], R: [130, -30] }, bend: { R: -70 }, hold: clipboard, col: '#4a5a4a', hatCol: '#5a3e2a' }, 0, 0.3);
    W.s2.update(c, V(0.65, 0.43 * SZ, 2.3), R, { eyes: 'ring', mouth: 'open', look: [-0.6, -0.4], arms: { L: [-130, -70], R: [140, 160] }, col: '#5a4a3a', hatCol: '#3a3a42', fur: '#d8ccb8' }, 0, 0.3); };
  return { haze: HAZE_ARC, scene: W.S, camera: c, prep, focus: { dist: c.position.distanceTo(V(-0.4, 1.4, 0.9)), range: 1.6, amt: 0.45 } }; };
// K03 — top-down: a boot beside the open bore, a ruler across it: 23 cm
SHOT.K03 = (t) => { const W = arctic(); const c = camOf('K03'); const u = loc('K03', t);
  const [p, g, f] = keys([[0, V(0.05, 2.3, 0.5), V(0.05, 0.22, 0), 36], [2.6, V(0.03, 1.7, 0.35), V(0.05, 0.22, 0), 34]], u); aim(c, p, g, f);
  const prep = () => { hideFlats(W); arcReset(W); W.A.ruin(0); W.A.bore.visible = true; W.A.capParts.forEach((m) => { m.visible = false; });
    if (!W.ruler) { W.ruler = makeCard(0.5, 0.08, 1024, (gg, w, h) => { gg.fillStyle = '#f2d24a'; gg.fillRect(0, 0, w, h); gg.strokeStyle = '#2a1a16'; gg.lineWidth = 6; gg.strokeRect(3, 3, w - 6, h - 6);
        for (let k = 0; k <= 50; k++) { gg.fillStyle = '#2a1a16'; gg.fillRect(k * w / 50, 0, 3, k % 10 ? h * 0.3 : h * 0.55); } signText(gg, '23 cm', w * 0.46, h * 0.72, 46, '#c8302a', '#ffffff'); }, { lit: true });
      W.ruler.rotation.x = -Math.PI / 2; W.ruler.position.set(0, 0.235, 0.0); W.S.add(W.ruler); }
    if (!W.boot) { W.boot = makeCard(0.34, 0.6, 512, (gg, w, h) => { gg.clearRect(0, 0, w, h); gg.fillStyle = '#3a2a22'; gg.strokeStyle = '#1a1210'; gg.lineWidth = 14;
        gg.beginPath(); gg.roundRect(w * 0.12, h * 0.05, w * 0.76, h * 0.9, [w * 0.38, w * 0.38, w * 0.3, w * 0.3]); gg.fill(); gg.stroke(); gg.fillStyle = '#5a4434';
        for (let k = 0; k < 7; k++) { gg.fillRect(w * 0.2, h * (0.15 + k * 0.11), w * 0.6, h * 0.05); } }, { transparent: true, lit: true });
      W.boot.rotation.x = -Math.PI / 2; W.boot.position.set(0.36, 0.24, 0.05); W.S.add(W.boot); }
    W.ruler.visible = true; W.boot.visible = true; };
  return { haze: HAZE_ARC, scene: W.S, camera: c, prep, focus: { amt: 0 } }; };
// K04 — the cut-open crust: the bit races down to 12,262 m, camera follows
SHOT.K04 = (t) => { const W = column(); const c = camOf('K04'); const u = loc('K04', t); const d = 12.262 * sst(0.05, 1.75, u);
  const [p, g, f] = keys([[0, V(2.5, 0.8, 9), V(0, -1.2, 0), 42], [1.95, V(3.2, -10.5, 11), V(0, -11.6, 0), 46]], u); aim(c, p, g, f);
  const prep = () => { colReset(W); W.C.drill(d); W.C.spin(t); W.C.counter(d * 1000); };
  return { scene: W.S, camera: c, prep, focus: { amt: 0 } }; };
// K05 — beside it, the ocean down to the Challenger Deep: the hole goes further
SHOT.K05 = (t) => { const W = column(); const c = camOf('K05'); const u = loc('K05', t);
  const [p, g, f] = keys([[0, V(-2.2, -9.0, 14), V(-3.3, -9.6, 0), 46], [2.0, V(-3.3, -6.4, 25), V(-3.3, -6.6, 0), 46]], u); aim(c, p, g, f);
  const prep = () => { colReset(W); W.C.drill(12.262); W.C.spin(t); W.C.counter(12262); W.C.cnt.visible = false; W.C.ocean(1); W.C.sub.position.x = 0.3 * Math.sin(u * 2); };
  return { scene: W.S, camera: c, prep, focus: { amt: 0 } }; };

// column helpers: everything off, then each shot switches on what it needs
function colReset(W) { const C = W.C; C.ocean(0); C.basalt(0); C.wet(0); C.fossils(0); C.heat(0); C.lensDraw(0); C.thermoDraw(0); C.squish(0, 0); C.crust(0); C.cnt.visible = true; W.sc.mesh.visible = false; C.bit.scale.setScalar(1); C.bit.rotation.set(Math.PI, 0, 0); }
const narr = (W, c, pos, pose) => { W.sc.mesh.visible = true; W.sc.update(c, pos, right(c), { eyes: 'dot', mouth: 'smile', col: '#4a5a4a', hatCol: '#5a3e2a', ...pose }, -99, 0); };
// K06 — at 7 km the expected basalt: a dashed ghost band, a scientist points at it
SHOT.K06 = (t) => { const W = column(); const c = camOf('K06'); const u = loc('K06', t); const D = T1.K06 - T0.K06;
  const [p, g, f] = keys([[0, V(0.1, -5.2, 9.0), V(-0.35, -6.6, 0), 42], [D, V(-0.1, -6.2, 7.8), V(-0.4, -7.0, 0), 40]], u); aim(c, p, g, f);
  const prep = () => { colReset(W); W.C.drill(6.6 + 0.5 * sst(0, D, u)); W.C.spin(t); W.C.counter((6.6 + 0.5 * sst(0, D, u)) * 1000); W.C.basalt(0.4 + 0.6 * sst(0.2, 0.8, u) * (0.75 + 0.25 * Math.sin(t * 8)));
    narr(W, c, V(-0.85, -5.8, 2.8), { arms: { L: [-150, 170], R: [80, -100] }, bend: { R: -10 }, look: [0.8, 0.2], eyes: 'dot', mouth: 'open' }); };
  return { scene: W.S, camera: c, prep, focus: { amt: 0 } }; };
// K07 — no basalt: the ghost band breaks up, the granite cracks glitter with water (3–6 km)
SHOT.K07 = (t) => { const W = column(); const c = camOf('K07'); const u = loc('K07', t); const D = T1.K07 - T0.K07;
  const [p, g, f] = keys([[0, V(-0.1, -6.2, 7.8), V(-0.4, -7.0, 0), 40], [D * 0.45, V(0.0, -5.6, 8.2), V(-0.35, -6.4, 0), 42], [D, V(0.1, -4.0, 9.0), V(-0.3, -4.6, 0), 44]], u); aim(c, p, g, f);
  const prep = () => { colReset(W); W.C.drill(7.4); W.C.spin(t); W.C.counter(7400); W.C.basalt(1 - sst(0, 0.5, u)); W.C.wet(sst(0.9, 1.6, u), t);
    narr(W, c, V(-0.8, -5.0, 2.8), { arms: { L: [-120, -60], R: [120, -60] }, eyes: u < 1 ? 'ring' : 'dot', mouth: u < 1 ? 'open' : 'smile', look: [0.6, 0] }); W.sc.mesh.position.y = mix(-6.25, -4.4, sst(D * 0.4, D, u)); };
  return { scene: W.S, camera: c, prep, focus: { amt: 0 } }; };
// K08 — at 6 km: fossil specks glow, then a magnifier shows 24 stone plankton
SHOT.K08 = (t) => { const W = column(); const c = camOf('K08'); const u = loc('K08', t); const D = T1.K08 - T0.K08;
  const [p, g, f] = keys([[0, V(0.6, -5.4, 7.6), V(0.3, -6.0, 0), 40], [D, V(0.9, -5.5, 6.0), V(0.8, -6.1, 0), 38]], u); aim(c, p, g, f);
  const prep = () => { colReset(W); W.C.drill(7.4); W.C.counter(6000); W.C.cnt.visible = false; W.C.fossils(sst(0.1, 1.2, u)); W.C.lensDraw(sst(1.0, D - 0.6, u)); W.C.lens.scale.setScalar(0.4 + 0.6 * sst(0.9, 1.4, u)); };
  return { scene: W.S, camera: c, prep, focus: { amt: 0 } }; };
// K09 — at the surface: the returning mud boils with hydrogen, a scientist backs off
SHOT.K09 = (t) => { const W = arctic(); const c = camOf('K09'); const u = loc('K09', t); const D = T1.K09 - T0.K09;
  const [p, g, f] = keys([[0, V(5.6, 2.3, 4.2), V(2.9, 0.6, -2.6), 42], [D, V(5.0, 1.9, 3.2), V(2.9, 0.5, -2.6), 40]], u); aim(c, p, g, f);
  const prep = () => { hideFlats(W); arcReset(W); W.A.ruin(0); W.A.winM.emissiveIntensity = 0.9; W.A.capParts.forEach((m) => { m.visible = true; }); if (W.ruler) { W.ruler.visible = false; W.boot.visible = false; } W.A.boil(t, 1);
    W.s2.mesh.visible = true; W.s2.shadow.visible = true; const back = sst(0.3, 1.2, u); W.s2.update(c, V(4.3 - 0.1 * back, 0.43 * SZ, -0.9 + 0.6 * back), right(c), { eyes: 'ring', mouth: 'open', brow: -0.2, sweat: true, lean: -0.15 * back, arms: { L: [-140, -40], R: [140, -40] }, look: [-0.7, 0.3], col: '#5a4a3a', hatCol: '#3a3a42', fur: '#d8ccb8' }, 0, 0.3); };
  return { haze: HAZE_ARC, scene: W.S, camera: c, prep, focus: { dist: c.position.distanceTo(V(3.2, 0.5, -2.5)), range: 1.2, amt: 0.5 } }; };
// K10 — deeper = hotter: the camera rides the bit down from 6 to 11 km while the face glows from blue to red
SHOT.K10 = (t) => { const W = column(); const c = camOf('K10'); const u = loc('K10', t); const D = T1.K10 - T0.K10; const d = mix(6, 11.2, sst(0, D, u));
  aim(c, V(1.4, -d + 0.8, 6.5), V(0, -d - 0.3, 0), 42);
  const prep = () => { colReset(W); W.C.drill(d); W.C.spin(t); W.C.counter(d * 1000); W.C.heat(0.25 + 0.75 * sst(0, D, u)); };
  return { scene: W.S, camera: c, prep, focus: { amt: 0 } }; };
// K11 — the thermometer: 100 °C planned, mercury shoots to 180 °C and glows
SHOT.K11 = (t) => { const W = column(); const c = camOf('K11'); const u = loc('K11', t); const D = T1.K11 - T0.K11;
  const [p, g, f] = keys([[0, V(5.0, -9.4, 10.5), V(5.0, -9.3, 0), 44], [D, V(5.2, -9.3, 9.2), V(5.2, -9.3, 0), 42]], u); aim(c, p, g, f);
  const deg = u < 1.0 ? mix(20, 100, sst(0, 0.9, u)) : mix(100, 180, sst(1.4, 2.4, u));
  const prep = () => { colReset(W); W.C.drill(12.262); W.C.spin(t); W.C.counter(12262); W.C.cnt.visible = false; W.C.heat(1); W.C.thermoDraw(deg); };
  return { scene: W.S, camera: c, prep, focus: { amt: 0 } }; };
// K12 — the hot rock behaves like plastic: it wobbles and squeezes the bit, the bit bends
SHOT.K12 = (t) => { const W = column(); const c = camOf('K12'); const u = loc('K12', t); const D = T1.K12 - T0.K12;
  const [p, g, f] = keys([[0, V(0.5, -11.1, 5.6), V(0, -11.9, 0), 40], [D, V(0.4, -11.3, 4.8), V(0, -11.95, 0), 38]], u); aim(c, p, g, f);
  const prep = () => { colReset(W); W.C.drill(11.9); W.C.counter(12262); W.C.cnt.visible = false; W.C.heat(1); W.C.bit.scale.setScalar(3); W.C.squish(sst(0, 0.8, u), t); };
  return { scene: W.S, camera: c, prep, focus: { amt: 0 } }; };
// K13 — 1992: dusk at the site, windows go dark one by one, a scientist hangs STOP on the door
SHOT.K13 = (t) => { const W = arctic(); const c = camOf('K13'); const u = loc('K13', t); const D = T1.K13 - T0.K13;
  const [p, g, f] = keys([[0, V(3.0, 1.8, -8), V(-1.5, 4.2, -23), 46], [D, V(2.4, 1.7, -10), V(-1.2, 3.8, -23), 44]], u); aim(c, p, g, f);
  const prep = () => { hideFlats(W); W.A.ruin(0); W.A.sky.setMode('sunset', { key: 0.6 }); W.A.boil(0, 0); W.A.winM.emissiveIntensity = 0.9 * (1 - sst(0.2, D * 0.8, u)); W.A.stop.visible = u > 0.9;
    W.s1.mesh.visible = true; W.s1.shadow.visible = true; W.s1.update(c, V(0.2, 0.43 * SZ, -17.5), right(c), { eyes: 'dash', mouth: 'frown', brow: 0.2, arms: { L: [-150, 170], R: [150, -120] }, look: [-0.3, -0.3], col: '#4a5a4a', hatCol: '#5a3e2a' }, 0, 0.3); };
  return { haze: HAZE_ARC, scene: W.S, camera: c, prep, focus: { amt: 0 } }; };
// K14 — zoom out: the column is only the top third of the continental crust
SHOT.K14 = (t) => { const W = column(); const c = camOf('K14', 900); const u = loc('K14', t); const D = T1.K14 - T0.K14;
  const [p, g, f] = keys([[0, V(1.2, -8, 18), V(0, -8, 0), 44], [D, V(2.5, -18, 52), V(1.5, -18, 0), 44]], u); aim(c, p, g, f);
  const prep = () => { colReset(W); W.C.drill(12.262); W.C.counter(12262); W.C.cnt.visible = false; W.C.crust(sst(0.3, 1.2, u)); };
  return { scene: W.S, camera: c, prep, focus: { amt: 0 } }; };
// K15 — the whole Earth, a quarter cut away; the hole is a hair line under a pulsing red ring
SHOT.K15 = (t) => { const W = globe(); const c = camOf('K15', 400, 0.05); const u = loc('K15', t);
  const [p, g, f] = keys([[0, V(9, 6.5, 13), V(0, 1.2, 0), 40], [4.2, V(7.2, 6.2, 11), V(0, 1.6, 0), 38]], u); aim(c, p, g, f);
  const prep = () => { W.G.earth.rotation.y = 0.55; W.G.pulse(t); };
  return { scene: W.S, camera: c, prep, focus: { amt: 0 } }; };
// K16 — the abandoned site, wind, end on the cap framing of K01 (loop)
SHOT.K16 = (t) => { const W = arctic(); const c = camOf('K16'); const u = loc('K16', t); const D = T1.K16 - T0.K16;
  const [p, g, f] = keys([[0, V(6, 4, 14), V(-3, 4, -26), 44], [D * 0.55, V(2.2, 1.8, 4.2), V(0, 0.5, 0), 40], [D, V(1.7, 1.55, 2.9), V(0, 0.38, 0), 38]], u); aim(c, p, g, f);
  const prep = () => { hideFlats(W); arcReset(W); W.A.ruin(1); W.A.bore.visible = false; W.A.capParts.forEach((m) => { m.visible = true; }); if (W.ruler) { W.ruler.visible = false; W.boot.visible = false; } };
  return { haze: HAZE_ARC, scene: W.S, camera: c, prep, focus: { dist: c.position.distanceTo(V(0, 0.45, 0)), range: 0.4, amt: 0.6 * sst(D * 0.5, D, u) } }; };

// ================= placeholder for shots not built yet =================
const PH = new THREE.Scene(); PH.background = new THREE.Color(0x202028); const phCam = new THREE.PerspectiveCamera(35, E.W / E.H, 0.1, 10);
const phCard = (() => { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const tx = new THREE.CanvasTexture(cv); const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 1), new THREE.MeshBasicMaterial({ map: tx, transparent: true }));
  m.position.z = -4; PH.add(m); return { draw(s) { const g = cv.getContext('2d'); g.clearRect(0, 0, 512, 256); g.fillStyle = '#ccc'; g.font = '800 60px Montserrat'; g.textAlign = 'center'; g.fillText(s, 256, 140); tx.needsUpdate = true; } }; })();
const placeholder = (id) => ({ scene: PH, camera: phCam, prep: () => phCard.draw(id + ' — todo'), focus: { amt: 0 } });

// ================= assembly =================
const KIND = { crash: 'crash', whip: 'whip', cut: null, 'dolly-blur': 'crash', dissolve: 'dissolve', 'push-cut': 'crash', 'match-dissolve': 'dissolve', flare: 'dissolve', smoke: 'smoke', 'fast-orbit': 'whip', 'pan-dissolve': 'dissolve', 'dissolve-descend': 'dissolve' };
const CAP = makeCaptions(E.W, E.H, CUES); const OV = makeOverlay(E.W, E.H);
const shotAt = (id, t) => (SHOT[id] ? SHOT[id](t) : placeholder(id));
function render(t) {
  t = clamp(t, 0, DUR - 1e-4); const fr = Math.floor(t * FPS + 1e-6);
  const k = SHOTS.findIndex((s) => fr >= s.f0 && fr < s.f1); const s = SHOTS[k];
  const tr = TRANS.find((x) => fr >= x.f0 && fr <= x.f1); let A, B = null, trans = null;
  if (tr && KIND[tr.kind]) { const i = SHOTS.findIndex((x) => x.f1 >= tr.f0 && x.f1 <= tr.f1); const from = SHOTS[i].id, to = SHOTS[i + 1].id; const p = (fr - tr.f0 + 0.5) / (tr.f1 - tr.f0 + 1);
    A = shotAt(from, t); B = shotAt(to, t); trans = { kind: KIND[tr.kind], p, dir: [1, 0], zoom: 0.4, c: [0.5, 0.5] }; }
  else A = shotAt(s.id, t);
  const ov = (B && trans.p > 0.5 ? B : A).overlay; if (ov) OV.draw(ov); else OV.clear();
  CAP.draw(t, !QS.has('nocap'));
  E.frame({ A, B, trans, overlay: OV, captions: CAP, vig: 0.28, sat: 1.12, contrast: 1.08, bloom: 0.3, bloomTh: 1.0 });
}
window.DUR = DUR; window.EV = []; window.CUES = CUES; window.render = render;
window.grabPNG = (t) => { render(t); return E.canvas.toDataURL('image/png').split(',')[1]; };
window.grab = (t) => { render(t); return E.canvas.toDataURL('image/jpeg', 0.95).split(',')[1]; };
render(0); window.READY = true;
// hooks for the Blender exporter (tools/blender/export_shot.mjs, export_overlays.mjs)
window.__ovAt = (t) => { t = clamp(t, 0, DUR - 1e-4); const fr = Math.floor(t * FPS + 1e-6); const k = SHOTS.findIndex((s) => fr >= s.f0 && fr < s.f1);
  const tr = TRANS.find((x) => fr >= x.f0 && fr <= x.f1); let A, B = null, p = 0;
  if (tr && KIND[tr.kind]) { const i = SHOTS.findIndex((x) => x.f1 >= tr.f0 && x.f1 <= tr.f1); A = shotAt(SHOTS[i].id, t); B = shotAt(SHOTS[i + 1].id, t); p = (fr - tr.f0 + 0.5) / (tr.f1 - tr.f0 + 1); } else A = shotAt(SHOTS[k].id, t);
  const ov = (B && p > 0.5 ? B : A).overlay; if (ov) OV.draw(ov); else OV.clear(); CAP.draw(t, true);
  const c = CUES.findIndex((q) => t >= q.t0 && t < q.t1); return { ov: !!ov, cue: c, ovc: OV.tex.image, capc: CAP.tex.image }; };
window.__shotAt = shotAt; window.__SHOTS = SHOTS; window.__TRANS = TRANS; window.__KIND = KIND; window.__cam = (id) => cam[id]; window.__E = E;
