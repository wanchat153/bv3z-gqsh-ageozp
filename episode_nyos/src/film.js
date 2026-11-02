// Lake Nyos 1986 (no narration: Thai captions, music, SFX). Timeline from framemap.js (make_map.py). Pure function of t.
// Worlds: nyos (the crater lake, the valley, the village — day / dusk / moonlit night / dawn), room (inside a house: the
// lantern, the soda bottle), dia (the cross-section card).
import * as THREE from './three.module.js';
import { DUR, FPS, SHOTS, TRANS, CUES } from './framemap.js';
import { clamp, mix, mulberry } from './toon.js';
import { createEngine } from './engine.js';
import { makeFlat, makeCard, setFlatTarget, signText } from './flat.js';
import { makeCaptions } from './captions.js';
import { makeOverlay } from './fx2d.js';
import { pbrify } from './pbr.js';
import { haze } from './sky.js';
import { buildNyos, H, LR, RIM, VD, VC } from './nyos.js';
import { buildRoom } from './room.js';
import { PERSON, COW } from './cast.js';

await Promise.all([['800 40px Montserrat', 'Ab1'], ['800 40px Kanit', 'Ab1'], ['800 40px Kanit', 'กขคภูมิ']].map(([f, s]) => document.fonts.load(f, s)));   // the Thai subset loads only for Thai text
const QS = new URLSearchParams(location.search);
const E = createEngine({ W: innerWidth, H: innerHeight, clear: 0x8090b0 }); setFlatTarget(E.SH);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sst = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
const lerpV = (a, b, u) => a.clone().lerp(b, u);
const SZ = 1.9, CZ = 2.4;
const cam = {}; const camOf = (id, far = 3000, near = 0.05) => (cam[id] = cam[id] || new THREE.PerspectiveCamera(35, E.W / E.H, near, far));
function aim(c, pos, tgt, fov, roll = 0) { c.position.copy(pos); c.up.set(0, 1, 0); c.lookAt(tgt); if (roll) c.rotateZ(roll); c.fov = fov; c.aspect = E.W / E.H; c.updateProjectionMatrix(); c.updateMatrixWorld(true); }
const right = (c) => V(1, 0, 0).applyQuaternion(c.quaternion);
function keys(K, t) { let i = 0; while (i < K.length - 2 && t > K[i + 1][0]) i++; const a = K[i], b = K[i + 1]; const u = sst(a[0], b[0], t);
  return [lerpV(a[1], b[1], u), lerpV(a[2], b[2], u), mix(a[3], b[3], u), mix(a[4] || 0, b[4] || 0, u)]; }
const T0 = Object.fromEntries(SHOTS.map((s) => [s.id, s.t0])), DD = Object.fromEntries(SHOTS.map((s) => [s.id, s.t1 - s.t0]));
const loc = (id, t) => t - T0[id];
const LAT = V(-VD.z, 0, VD.x);
const xz = (p) => [p.x, p.z];
const at = (al, lt, dy = 0) => { const p = VC.clone().addScaledVector(VD, al).addScaledVector(LAT, lt); p.y = H(p.x, p.z) + dy; return p; };   // village coordinates

// ================= worlds =================
let NW = null; function nyos() { if (NW) return NW; const S = new THREE.Scene(); const T = buildNyos(S, { keep: [[...xz(at(-58, 1.5)), 5], [...xz(at(-52, 1.2)), 5], [...xz(at(-30, 12)), 6], [...xz(at(-27, 11)), 6], [...xz(at(-24, 8)), 5]] }); if (!QS.has('toon')) pbrify(S, E.renderer, { env: 0.3 });
  const mk = (fn, sz = SZ) => { const f = makeFlat(sz, 1024, fn); S.add(f.mesh); S.add(f.shadow); f.shadow.material.color.set(0x2a2a1a); return f; };
  NW = { S, T, man: mk(PERSON), woman: mk(PERSON), kid: mk(PERSON), herder: mk(PERSON), surv: mk(PERSON), cows: [0, 1, 2, 3, 4].map(() => mk(COW, CZ)) }; return NW; }
let RW = null; function room() { if (RW) return RW; const S = new THREE.Scene(); const R = buildRoom(S); if (!QS.has('toon')) pbrify(S, E.renderer, { env: 0.12 });
  const f = makeFlat(SZ, 1024, PERSON); S.add(f.mesh); S.add(f.shadow); f.shadow.visible = false; RW = { S, R, sleeper: f }; return RW; }
const FLATS = ['man', 'woman', 'kid', 'herder', 'surv'];
const reset = (W, mode, o = {}) => { const T = W.T; T.sky.setMode(mode, { noClouds: true, ...o }); T.sky.sun.visible = false; T.setLake(o.lake || (mode === 'moon' ? 'night' : 'blue')); T.fountain(0, 0); T.mist(0, 0); T.lights(null); T.fire(false, 0); T.raft(false, 0);
  for (const k of FLATS) { W[k].mesh.visible = false; W[k].shadow.visible = false; } W.cows.forEach((c) => { c.mesh.visible = false; c.shadow.visible = false; }); };
const show = (f) => { f.mesh.visible = true; f.shadow.visible = true; };
const HZ = (m, k = 1) => ({ ...haze(m, k), start: 20, max: 0.4 });
const cowAt = (W, i, c, p, dir, pose) => { const f = W.cows[i]; show(f); f.update(c, p.clone().add(V(0, 0.43 * CZ, 0)), dir, pose, p.y, 0.6); };

// ================= shots =================
const SHOT = {};
// N01 / N15 — high over the crater: the round lake, the raft's jet in the middle (today)
const aerial = (id, t, k, red = false) => { const W = nyos(); const c = camOf(id); const a = 2.6 + 0.12 * k; const r = mix(470, 430, k), h = mix(380, 400, k);
  aim(c, V(Math.cos(a) * r, h, Math.sin(a) * r), V(0, -10, 0), 40);
  return { haze: HZ(red ? 'dawn' : 'day', 0.12), scene: W.S, camera: c, prep: () => { reset(W, red ? 'dawn' : 'day', { lake: red ? 'red' : 'blue' }); if (!red) W.T.raft(true, t, 26); }, focus: { amt: 0 } }; };
SHOT.N01 = (t) => aerial('N01', t, loc('N01', t) / DD.N01);
// N02 — dawn, the next morning: a silent village, every house standing; cattle lie still far off in the pasture
SHOT.N02 = (t) => { const W = nyos(); const c = camOf('N02'); const u = loc('N02', t);
  const [p, g, f] = keys([[0, at(-58, 1.5, 1.6), at(-10, -4, 2.2), 40], [DD.N02, at(-52, 1.2, 1.5), at(-10, -4, 2.4), 38]], u); aim(c, p, g, f);
  const prep = () => { reset(W, 'dawn'); const d = VD.clone().negate(); [[-20, -26, 0], [-24, -30, 1], [-17, -33, 2]].forEach(([al, lt, i]) => cowAt(W, i, c, at(al, lt), LAT, { lie: 1, col: i === 1 ? '#e8e0d0' : '#a8452a', patch: i === 1 ? '#8a6a5a' : null })); };
  return { haze: HZ('dawn', 1.2), scene: W.S, camera: c, prep, focus: { dist: 14, range: 8, amt: 0.4 } }; };
// N03 — 21 August 1986, dusk: cooking fires, lamps being lit, a herder brings the cattle home past a woman with a basin
SHOT.N03 = (t) => { const W = nyos(); const c = camOf('N03'); const u = loc('N03', t);
  const [p, g, f] = keys([[0, at(-30, 12, 2.0), at(-10, -2, 1.6), 42], [DD.N03, at(-27, 11, 1.8), at(-10, -2, 1.7), 40]], u); aim(c, p, g, f);
  const prep = () => { reset(W, 'dusk', { sunDir: V(-VD.x * 0.5 + 0.6, 0.18, -VD.z * 0.5) }); W.T.fire(true, t); W.T.lights(() => 0.6);
    const dir = VD.clone().negate(); const walk = 1.05 * u;
    [0, 1, 2, 3].forEach((i) => { const pp = at(-14 + walk * 1.0 - i * 3.2, -1 + (i % 2) * 1.4); cowAt(W, i, c, pp, dir.clone().negate(), { walk: (walk * 1.0 - i * 3.2) / 1.1 * Math.PI, col: ['#a8452a', '#e8e0d0', '#7a3a22', '#c8603a'][i], patch: i === 1 ? '#6a4a3a' : null, tail: t * 3 + i }); });
    const hp = at(-14 + walk - 13.5, 0.2); show(W.herder); W.herder.update(c, hp.clone().add(V(0, 0.43 * SZ, 0)), VD, { pose: 'walk', walk: walk / 0.92 * Math.PI * 2, col: '#3a5a8a', trs: '#3a3228', print: '#e8c040', hair: 'kufi', hatCol: '#e8dcc0', arms: { L: [-150, 150], R: [190, -60] } }, hp.y, 0.3);
    const wp = at(-17, 5.5); show(W.woman); W.woman.update(c, wp.clone().add(V(0, 0.43 * SZ, 0)), LAT, { wrapper: true, col: '#c8402a', wrapCol2: '#1a4a8a', print: '#f2c040', print2: '#1a3a6a', hair: 'wrap', wrapCol: '#2a8a5a', mouth: 'smile', turn: 0.3, skin: '#8a5636' }, wp.y, 0.3);
    const kp = at(-21, 3.6); show(W.kid); W.kid.update(c, kp.clone().add(V(0, 0.33 * SZ, 0)), LAT, { col: '#f2c040', print: '#c8402a', trs: '#2a4a7a', hair: 'short', mouth: 'smile', sq: [0.75, 0.72], arms: { L: [-160, 60], R: [150, -120] } }, kp.y, 0.22); };
  return { haze: HZ('dusk', 1.0), scene: W.S, camera: c, prep, focus: { dist: 10, range: 6, amt: 0.45 } }; };
// N04 — about 9:30 p.m.: a man in his doorway turns towards the hills — a rumble from the lake
SHOT.N04 = (t) => { const W = nyos(); const c = camOf('N04'); const u = loc('N04', t); const h0 = W.T.houses[2];
  const door = V(-h0.w * 0.22, 0, h0.d / 2 + 0.7).applyAxisAngle(V(0, 1, 0), h0.rot).add(V(h0.x, 0, h0.z)); door.y = H(door.x, door.z);
  const out = V(0, 0, 1).applyAxisAngle(V(0, 1, 0), h0.rot); const side = V(1, 0, 0).applyAxisAngle(V(0, 1, 0), h0.rot);
  const [p, g, f] = keys([[0, door.clone().addScaledVector(out, 4.2).addScaledVector(side, 1.6).add(V(0, 1.4, 0)), door.clone().add(V(0, 1.3, 0)), 38], [DD.N04, door.clone().addScaledVector(out, 3.4).addScaledVector(side, 1.2).add(V(0, 1.45, 0)), door.clone().add(V(0, 1.4, 0)), 36]], u); aim(c, p, g, f);
  const prep = () => { reset(W, 'moon'); W.T.lights(() => 1); show(W.man); const turn = sst(0.5, 1.4, u);
    W.man.update(c, door.clone().add(V(0, 0.43 * SZ, 0)), right(c), { col: '#2a4a3a', print: '#c8a040', trs: '#2e2a26', hair: 'short', beard: true, turn: -0.8 * turn, eyes: turn > 0.5 ? 'ring' : 'dot', look: [-0.6 * turn, -0.2], brow: turn > 0.5 ? -0.25 : 0, mouth: turn > 0.6 ? 'o' : 'line' }, door.y, 0.3); };
  return { haze: HZ('moon', 1.0), scene: W.S, camera: c, prep, focus: { dist: 4, range: 2, amt: 0.6 } }; };
// N05 — the lake by moonlight: a column of water and foam rises from the middle (~100 m)
SHOT.N05 = (t) => { const W = nyos(); const c = camOf('N05'); const u = loc('N05', t); const a = Math.atan2(VD.z, VD.x) + 1.7;
  const P = (r, h) => V(Math.cos(a) * r, h, Math.sin(a) * r); const [p, g, f] = keys([[0, P(RIM + 4, 74), V(0, 18, 0), 44], [DD.N05, P(RIM - 6, 70), V(0, 26, 0), 46]], u); aim(c, p, g, f);
  const prep = () => { reset(W, 'moon'); W.T.fountain(sst(0.1, DD.N05 - 0.3, u), t, 0xc8d4e8); W.T.mist(0.06 * sst(0.8, DD.N05, u), t, 0x8a98b8); };
  return { haze: HZ('moon', 0.6), scene: W.S, camera: c, prep, focus: { amt: 0 } }; };
// N06 — the cloud pours over the low notch in the crater rim (the natural dam)
SHOT.N06 = (t) => { const W = nyos(); const c = camOf('N06'); const u = loc('N06', t); const n = VD.clone().multiplyScalar(RIM); n.y = H(n.x, n.z);
  const cp = VD.clone().multiplyScalar(262).addScaledVector(LAT, 8); cp.y = H(cp.x, cp.z) + 7; aim(c, cp.clone().addScaledVector(VD, -8 * u / DD.N06), n.clone().add(V(0, 6, 0)), 44);
  const prep = () => { reset(W, 'moon'); W.T.fountain(0.6, t, 0xc8d4e8); W.T.mist(mix(0.22, 0.5, u / DD.N06), t, 0x8894b0, 18); W.T.lights(() => 1); };
  return { haze: HZ('moon', 0.8), scene: W.S, camera: c, prep, focus: { amt: 0 } }; };
// N07 — heavier than air, it flows down the valley like an invisible river, 50 m thick, towards the lights
SHOT.N07 = (t) => { const W = nyos(); const c = camOf('N07'); const u = loc('N07', t); const k = u / DD.N07;
  const cp = VD.clone().multiplyScalar(240).addScaledVector(LAT, -95); cp.y = H(cp.x, cp.z) + 30; aim(c, cp.clone().addScaledVector(VD, 30 * k), VD.clone().multiplyScalar(290).add(V(0, H(VD.x * 290, VD.z * 290) + 4, 0)), 44);
  const prep = () => { reset(W, 'moon'); W.T.lights(() => 1); W.T.mist(mix(0.4, 0.66, k), t, 0x7884a0, 18); };
  return { haze: HZ('moon', 0.8), scene: W.S, camera: c, prep, focus: { amt: 0 } }; };
// N08 — in the village the lamps go out one by one as the cloud arrives
const frontAl = (W, fr) => { const p = W.T.curve.getPointAt(Math.min(1, Math.max(0, fr))); return p.x * VD.x + p.z * VD.z; };
SHOT.N08 = (t) => { const W = nyos(); const c = camOf('N08'); const u = loc('N08', t); const k = u / DD.N08;
  const hs = W.T.houses.map((h) => ({ h, al: (h.x - VC.x) * VD.x + (h.z - VC.z) * VD.z, lt: (h.x - VC.x) * LAT.x + (h.z - VC.z) * LAT.z })).filter((o) => Math.abs(o.lt) < 22 && o.al > -45 && o.al < 25).sort((p, q) => q.al - p.al);
  const far = hs.length ? hs[hs.length - 1] : { al: -30, lt: 0 }, near = hs.length ? hs[0] : { al: 10, lt: 0 };
  aim(c, at(near.al + 22 - 3 * k, near.lt * 0.3, 3.6), at((near.al + far.al) / 2, (near.lt + far.lt) / 2, 2.2), 50);
  const prep = () => { reset(W, 'moon'); const fr = mix(0.56, 0.76, k); W.T.mist(fr, t, 0x6a7694, 16); const fa = frontAl(W, fr - 0.01); W.T.lights((L) => (L.al > fa ? 1 : 0)); };
  return { haze: HZ('moon', 0.8), scene: W.S, camera: c, prep, focus: { amt: 0 } }; };
// N09 — inside: the lantern by the window gutters out; mist drifts past outside; a sleeper on the mat
SHOT.N09 = (t) => { const W = room(); const c = camOf('N09', 60); const u = loc('N09', t); const k = u / DD.N09;
  aim(c, V(-0.5 + 0.05 * k, 1.2, 0.35 - 0.12 * k), V(-0.68, 1.12, -0.95), 34);
  const prep = () => { const R = W.R; R.outside('night'); R.key.intensity = 0; R.hemi.intensity = 0.05; R.bottle(false, 0, 0, 0); R.lantern(1 - sst(0.25, 0.85, k), t); R.mist(1, t);
    W.sleeper.mesh.visible = true; W.sleeper.update(c, V(1.2, 0.3, 0.6), right(c), { col: '#2a4a6a', print: '#e8c040', hair: 'short', eyes: 'closed', mouth: 'line', arms: { L: [-120, 160], R: [120, 160] } }, 0, 0, Math.PI / 2); };
  return { scene: W.S, camera: c, prep, focus: { dist: 0.5, range: 0.25, amt: 0.6 } }; };
// N10 — dawn from above: the blue lake has turned a murky red
SHOT.N10 = (t) => aerial('N10', t, 0.4 + loc('N10', t) / DD.N10 * 0.6, true);
// N11 — mid-morning: a man who passed out wakes in his doorway; the village is silent
SHOT.N11 = (t) => { const W = nyos(); const c = camOf('N11'); const u = loc('N11', t); const h0 = W.T.houses[5];
  const door = V(-h0.w * 0.22, 0, h0.d / 2 + 0.5).applyAxisAngle(V(0, 1, 0), h0.rot).add(V(h0.x, 0, h0.z)); door.y = H(door.x, door.z); const out = V(0, 0, 1).applyAxisAngle(V(0, 1, 0), h0.rot), side = V(1, 0, 0).applyAxisAngle(V(0, 1, 0), h0.rot);
  const [p, g, f] = keys([[0, door.clone().addScaledVector(out, 3.6).addScaledVector(side, -1.5).add(V(0, 1.0, 0)), door.clone().add(V(0, 0.9, 0)), 40], [DD.N11, door.clone().addScaledVector(out, 4.4).addScaledVector(side, -2.2).add(V(0, 1.2, 0)), door.clone().add(V(0, 1.0, 0)), 42]], u); aim(c, p, g, f);
  const prep = () => { reset(W, 'day', { sunDir: V(0.4, 0.55, 0.6) }); show(W.surv); const up = sst(0.2, 1.2, u);
    W.surv.update(c, door.clone().add(V(0, 0.43 * SZ, 0)), right(c), { pose: 'sit', col: '#6a4a8a', trs: '#3a3a44', print: '#e8d8a0', hair: 'short', tilt: -0.25 * (1 - up), eyes: up < 0.6 ? 'closed' : 'dot', mouth: 'line', brow: -0.12 * up, look: [0.5, 0], turn: 0.4 * up, arms: { L: [-150, 200], R: [150, 200] } }, door.y, 0.35); };
  return { haze: HZ('day', 0.8), scene: W.S, camera: c, prep, focus: { dist: 4, range: 2, amt: 0.55 } }; };
// N12 — cross-section card: warm water on top, cold dense CO2-loaded water below, magma far beneath feeding gas in
let DW = null; function dia() { if (DW) return DW; const S = new THREE.Scene(); S.background = new THREE.Color(0x101820); const card = makeCard(18.1, 32.2, 1080, () => {}, {}); card.renderOrder = 2; S.add(card); DW = { S, card }; return DW; }
SHOT.N12 = (t) => { const W = dia(); const c = camOf('N12', 200); const u = loc('N12', t); const k = sst(0.1, DD.N12 - 0.3, u); aim(c, V(0, 0, 30 - 1.5 * u), V(0, 0, 0), 60);
  const prep = () => W.card.userData.redraw((g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h * 0.3); sky.addColorStop(0, '#7ab0e8'); sky.addColorStop(1, '#e0eef8'); g.fillStyle = sky; g.fillRect(0, 0, w, h * 0.3);
    // crater walls + ground
    g.fillStyle = '#6a8a3a'; g.beginPath(); g.moveTo(0, h * 0.2); g.lineTo(w * 0.12, h * 0.17); g.lineTo(w * 0.2, h * 0.3); g.lineTo(w * 0.8, h * 0.3); g.lineTo(w * 0.88, h * 0.16); g.lineTo(w, h * 0.19); g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fill();
    const rock = g.createLinearGradient(0, h * 0.3, 0, h); rock.addColorStop(0, '#7a5a44'); rock.addColorStop(0.6, '#4a3226'); rock.addColorStop(1, '#2a1a14'); g.fillStyle = rock; g.fillRect(0, h * 0.32, w, h * 0.68);
    // lake bowl: warm top layer, cold CO2 layer
    const bowl = () => { g.beginPath(); g.moveTo(w * 0.2, h * 0.3); g.quadraticCurveTo(w * 0.5, h * 0.62, w * 0.8, h * 0.3); g.closePath(); };
    bowl(); const wg = g.createLinearGradient(0, h * 0.3, 0, h * 0.46); wg.addColorStop(0, '#4aa0d0'); wg.addColorStop(0.18, '#3a88c0'); wg.addColorStop(0.2, '#1a3a6a'); wg.addColorStop(1, '#0e2040'); g.fillStyle = wg; g.fill(); g.lineWidth = 10; g.strokeStyle = '#1b1420'; g.stroke();
    // dissolved CO2 dots in the deep layer (denser with k)
    const rr = mulberry(3); for (let i = 0; i < 260 * k; i++) { const x = w * (0.24 + rr() * 0.52), y = h * (0.34 + rr() * 0.11); const inside = (y - h * 0.3) < (h * 0.32) * (1 - Math.pow((x - w * 0.5) / (w * 0.3), 2)) * 0.5 && y > h * 0.335; if (!inside) continue; g.fillStyle = 'rgba(220,240,255,0.85)'; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); }
    // magma chamber + rising gas
    const mg = g.createRadialGradient(w * 0.5, h * 0.86, 10, w * 0.5, h * 0.86, w * 0.4); mg.addColorStop(0, '#ffe080'); mg.addColorStop(0.4, '#ff7a20'); mg.addColorStop(1, 'rgba(160,30,10,0)'); g.fillStyle = mg; g.beginPath(); g.ellipse(w * 0.5, h * 0.86, w * 0.36, h * 0.07, 0, 0, 7); g.fill();
    for (let i = 0; i < 14; i++) { const ph = ((u * 0.4 + i / 14) % 1); const x = w * (0.4 + (i % 5) * 0.05) + Math.sin(ph * 9 + i) * 14, y = h * 0.8 - ph * h * 0.33; g.fillStyle = `rgba(230,240,255,${0.8 * (1 - ph * 0.4)})`; g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); }
    // labels + depth bracket
    signText(g, 'น้ำอุ่น', w * 0.5, h * 0.318, 46, '#ffffff', '#1b1420', 'Kanit, Montserrat'); signText(g, 'น้ำเย็น + CO₂', w * 0.5, h * 0.4, 52, '#cfe8ff', '#1b1420', 'Kanit, Montserrat');
    signText(g, 'แมกมา', w * 0.5, h * 0.9, 64, '#fff2c0', '#5a1a0a', 'Kanit, Montserrat'); signText(g, 'CO₂', w * 0.66, h * 0.66, 60, '#ffffff', '#1b1420');
    g.strokeStyle = '#ffffff'; g.lineWidth = 8; g.setLineDash([24, 16]); g.beginPath(); g.moveTo(w * 0.13, h * 0.3); g.lineTo(w * 0.13, h * 0.46); g.stroke(); g.setLineDash([]); for (const y of [h * 0.3, h * 0.46]) { g.beginPath(); g.moveTo(w * 0.09, y); g.lineTo(w * 0.17, y); g.stroke(); }
    signText(g, '200 ม.', w * 0.13, h * 0.5, 54, '#ffffff', '#1b1420', 'Kanit, Montserrat'); });
  return { scene: W.S, camera: c, prep, focus: { amt: 0 } }; };
// N13 — like a shaken soda bottle: the bottle shakes on the table, the cap pops, foam bursts out
SHOT.N13 = (t) => { const W = room(); const c = camOf('N13', 60); const u = loc('N13', t); const k = u / DD.N13;
  aim(c, V(-0.3 - 0.04 * k, 1.08, 0.0 + 0.06 * k), V(-0.45, 0.94, -0.8), 30);
  const prep = () => { const R = W.R; R.outside('day'); R.key.intensity = 2.2; R.hemi.intensity = 0.5; R.lantern(0, t); R.mist(0, t); W.sleeper.mesh.visible = false; const pop = sst(0.55, 0.62, k) * Math.min(1, (k - 0.55) / 0.4);
    R.bottle(true, k < 0.58 ? sst(0.05, 0.3, k) : 0.2 * (1 - k), Math.max(0, pop), t); };
  return { scene: W.S, camera: c, prep, focus: { dist: 0.45, range: 0.2, amt: 0.6 } }; };
// N14 — since 2001: a raft in the middle of the lake, a pipe to the bottom, the gas let out as a fountain
SHOT.N14 = (t) => { const W = nyos(); const c = camOf('N14'); const u = loc('N14', t); const a = 2.0;
  const [p, g, f] = keys([[0, V(Math.cos(a) * 40, 4, Math.sin(a) * 40), V(0, 8, 0), 40], [DD.N14, V(Math.cos(a + 0.15) * 34, 3.4, Math.sin(a + 0.15) * 34), V(0, 9, 0), 40]], u); aim(c, p, g, f);
  return { haze: HZ('day', 0.5), scene: W.S, camera: c, prep: () => { reset(W, 'day', { sunDir: V(Math.cos(a + 1.2), 0.5, Math.sin(a + 1.2)) }); W.T.raft(true, t, 18); }, focus: { dist: 36, range: 14, amt: 0.35 } }; };
SHOT.N15 = (t) => aerial('N15', t, 1 - loc('N15', t) / DD.N15);

// ================= assembly =================
const PH = new THREE.Scene(); PH.background = new THREE.Color(0x202028); const phCam = new THREE.PerspectiveCamera(35, E.W / E.H, 0.1, 10);
const placeholder = () => ({ scene: PH, camera: phCam, prep: () => {}, focus: { amt: 0 } });
const KIND = { crash: 'crash', whip: 'whip', cut: null, 'dolly-blur': 'crash', dissolve: 'dissolve', 'push-cut': 'crash', 'match-dissolve': 'dissolve', flare: 'flare', smoke: 'smoke', 'fast-orbit': 'whip', 'pan-dissolve': 'dissolve', 'dissolve-descend': 'dissolve' };
const CAP = makeCaptions(E.W, E.H, CUES); const OV = makeOverlay(E.W, E.H);
const shotAt = (id, t) => (SHOT[id] ? SHOT[id](t) : placeholder(id));
function pick(t) { t = clamp(t, 0, DUR - 1e-4); const fr = Math.floor(t * FPS + 1e-6); const k = SHOTS.findIndex((s) => fr >= s.f0 && fr < s.f1);
  const tr = TRANS.find((x) => fr >= x.f0 && fr <= x.f1); let A, B = null, trans = null;
  if (tr && KIND[tr.kind]) { const i = TRANS.indexOf(tr); const p = (fr - tr.f0 + 0.5) / (tr.f1 - tr.f0 + 1); A = shotAt(SHOTS[i].id, t); B = shotAt(SHOTS[i + 1].id, t); trans = { kind: KIND[tr.kind], p, dir: [1, 0], zoom: 0.4, c: [0.5, 0.5] }; }
  else A = shotAt(SHOTS[k].id, t);
  return { t, A, B, trans }; }
function render(t0) { const { t, A, B, trans } = pick(t0);
  const ov = (B && trans.p > 0.5 ? B : A).overlay; if (ov) OV.draw(ov); else OV.clear();
  CAP.draw(t, !QS.has('nocap'));
  E.frame({ A, B, trans, overlay: OV, captions: CAP, vig: 0.26, sat: 1.12, contrast: 1.08, bloom: 0.35, bloomTh: 0.95 }); }
window.DUR = DUR; window.EV = []; window.CUES = CUES; window.render = render;
window.grabPNG = (t) => { render(t); return E.canvas.toDataURL('image/png').split(',')[1]; };
window.grab = (t) => { render(t); return E.canvas.toDataURL('image/jpeg', 0.95).split(',')[1]; };
render(0); window.READY = true;
window.__ovAt = (t0) => { const { t, A, B, trans } = pick(t0); const ov = (B && trans.p > 0.5 ? B : A).overlay; if (ov) OV.draw(ov); else OV.clear(); CAP.draw(t, true);
  const c = CUES.findIndex((q) => t >= q.t0 && t < q.t1); return { ov: !!ov, cue: c, ovc: OV.tex.image, capc: CAP.tex.image }; };
window.__shotAt = shotAt; window.__SHOTS = SHOTS; window.__TRANS = TRANS; window.__KIND = KIND; window.__cam = (id) => cam[id]; window.__E = E;
