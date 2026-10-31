// Butter Side Down — wordless toon short. Every frame is a pure function of t.
import * as THREE from './three.module.js';
import { DUR, T, TOP0, LAYER, NLAYER, TH, OMEGA, FALLS, tau, layerT, EV } from './timeline.js';
import { clamp, mix, sstep, mulberry } from './toon.js';
import { buildSet, makeToast } from './set.js';
import { makeFlat, drawMan, drawManArms, drawDog, drawBulb } from './flat.js';

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

const hemi = new THREE.HemisphereLight(0xfff8ee, 0xe9c9a6, 1.35); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1dc, 2.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
Object.assign(sun.shadow.camera, { left: -3.2, right: 3.2, top: 3.2, bottom: -3.2, near: 0.5, far: 30 });
scene.add(sun); scene.add(sun.target);
const SET = buildSet(scene);
SET.stack[3].visible = false;

// ---------- toasts, ghosts, splats ----------
const TOAST = {}; for (const k of ['A', 'B', 'C', 'F']) { TOAST[k] = makeToast(true); scene.add(TOAST[k].root); }
const GH = {}; const NG = 9;
for (const k of ['C', 'F']) { GH[k] = []; for (let i = 0; i < NG; i++) { const g = makeToast(true, true); scene.add(g.root); GH[k].push(g); } }
const DOTM = new THREE.MeshBasicMaterial({ color: 0x3a2a4a, transparent: true, opacity: 0.6, depthWrite: false });
const DOTS = {}; const ND = 22;
for (const k of ['C', 'F']) { DOTS[k] = []; for (let i = 0; i < ND; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.006, 10, 8), DOTM.clone()); scene.add(d); DOTS[k].push(d); } }
const SPLAT = {}; const butterM = new THREE.MeshToonMaterial({ color: 0xffe27a, gradientMap: TOAST.A.butter.material.gradientMap });
for (const k of ['A', 'B', 'C']) {
  const g = new THREE.Group(); scene.add(g);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 40), butterM); pool.rotation.x = -Math.PI / 2; pool.position.y = 0.002; g.add(pool);
  const r = mulberry(k.charCodeAt(0) * 7); const blobs = [];
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), butterM); b.castShadow = true; scene.add(b); const a = r() * Math.PI * 2; blobs.push({ m: b, a, v: 0.5 + r() * 0.6, vy: 0.6 + r() * 0.7, r: 0.007 + r() * 0.006 }); }
  SPLAT[k] = { g, pool, blobs };
}
const CRUMBS = []; { const r = mulberry(31); for (let i = 0; i < 7; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.009, 0.01), TOAST.A.body.children[0].material[1]); c.castShadow = true; scene.add(c); CRUMBS.push({ m: c, a: r() * 6.28, v: 0.25 + r() * 0.35, vy: 0.5 + r() * 0.6, spin: r() * 20 }); } }

// ---------- flat characters ----------
const MAN = makeFlat(2.1, 2048, drawMan); scene.add(MAN.mesh); scene.add(MAN.shadow);
const ARMS = makeFlat(2.1, 1024, drawManArms); scene.add(ARMS.mesh); ARMS.mesh.renderOrder = 10;
const DOG = makeFlat(0.7, 1024, drawDog); scene.add(DOG.mesh); scene.add(DOG.shadow);
const BULB = makeFlat(0.34, 512, drawBulb); scene.add(BULB.mesh);
MAN.shadow.material.color.set(0x5a3a2a); DOG.shadow.material.color.set(0x5a3a2a);

// ---------- the table rising ----------
const pop = (u) => { if (u <= 0) return 0; if (u >= 1) return 1; const c1 = 1.7, v = u - 1; return 1 + (c1 + 1) * v * v * v + c1 * v * v; };
function layerF(L, t) { return clamp(pop((t - layerT(L)) / 0.28), 0, 1.12); }
function tableY(t) { let y = 0; for (let L = 0; L < NLAYER; L++) y += Math.min(1, layerF(L, t)) * LAYER; return y; }
const topAt = (t) => TOP0 + tableY(t);
function jolt(t) { const s = t - T.bSneeze; return s > 0 ? 0.035 * Math.exp(-s * 7) * Math.sin(s * 30) : 0; }

// ---------- toast choreography ----------
const PLATE = (t) => new THREE.Vector3(0.1 + jolt(t), topAt(t) + 0.014 + TH / 2, 0.06);
const STACKTOP = (t, n) => new THREE.Vector3(-0.28 + jolt(t), topAt(t) + 0.02 + TH / 2 + n * (TH + 0.001), 0.04);
const arcMove = (a, b, u, h = 0.08) => a.clone().lerp(b, sstep(0, 1, u)).add(new THREE.Vector3(0, h * Math.sin(Math.PI * clamp(u, 0, 1)), 0));
const FALL_PLAN = {
  A: { pick: null, b0: T.aButter0, b1: T.aButter1, lift: T.aPlace - 0.4, place: T.aPlace, spot: [0.44, 0.06], push0: T.aPlace, kind: 'tip' },
  B: { pick: T.bPick, b0: T.bButter0, b1: T.bButter1, lift: T.bButter1, place: T.bPlace, spot: [0.2, 0.2], push0: T.bSneeze + 0.05, kind: 'jolt' },
  C: { pick: T.cPick, b0: T.cButter0, b1: T.cButter1, lift: T.cButter1, place: T.cPlace, spot: [0.42, -0.12], push0: T.cPush, kind: 'push' },
  F: { pick: T.fPick, b0: T.fButter0, b1: T.fButter1, lift: T.fButter1, place: T.fPlace, spot: [0.42, 0.04], push0: T.fPush, kind: 'push' },
};
const STACK_N = { B: 2, C: 1, F: 0 };
// eaten by the pup: [start, end]
const EAT = { B: [22.0, 22.6], A: [23.3, 23.9], C: [24.4, 25.0], F: [T.gulp, T.gulp + 0.35] };
function toastAt(k, t) {
  const P = FALL_PLAN[k], F = FALLS[k]; const s = { pos: new THREE.Vector3(), rz: 0, yaw: 0, vis: true, butter: 1, sq: 1, held: false, phase: 'table', scale: 1 };
  const w = tau(t), fs = w - F.w0;
  if (P.pick !== null && t < P.pick) { s.vis = false; return s; }
  s.butter = sstep(P.b0, P.b1, t);
  if (fs < 0) {
    if (P.pick !== null && t < P.b0) { s.pos.copy(arcMove(STACKTOP(t, STACK_N[k]), PLATE(t), (t - P.pick) / (P.b0 - P.pick), 0.08)); s.held = true; s.phase = 'carry'; }
    else if (t < P.lift) { s.pos.copy(PLATE(t)); s.phase = 'butter'; }
    else if (t < P.place) { const spot = new THREE.Vector3(P.spot[0] + jolt(t), topAt(t) + TH / 2 + 0.002, P.spot[1]); s.pos.copy(arcMove(PLATE(t), spot, (t - P.lift) / (P.place - P.lift), 0.07)); s.held = true; s.phase = 'carry'; }
    else {
      const spot = new THREE.Vector3(P.spot[0] + jolt(t), topAt(t) + TH / 2 + 0.002, P.spot[1]); s.pos.copy(spot);
      const u = clamp((t - P.push0) / Math.max(0.01, F.rel - P.push0), 0, 1);
      if (t > P.push0) {
        const ease = P.kind === 'jolt' ? u * u : P.kind === 'tip' ? u * u : sstep(0, 1, u) * 0.6 + u * 0.4;
        s.pos.x = mix(P.spot[0], F.x0, ease) + jolt(t); s.phase = P.kind === 'push' ? 'push' : 'slide';
        s.rz = -0.12 * sstep(0.6, 1, u);
      }
    }
    s.yaw = 0; return s;
  }
  // free flight (world time), then the landing
  const top = F.top; const y0 = top + TH / 2 + 0.002; const rz0 = -0.12;
  if (fs < F.sL) {
    s.phase = 'fall';
    s.pos.set(F.x0 + F.vx * fs, y0 - 0.5 * 9.8 * fs * fs, F.z); s.rz = rz0 - OMEGA * fs; s.yaw = F.yaw * fs / F.sL;
    s.pos.y = Math.max(s.pos.y, TH / 2 + 0.003);
  } else {
    s.phase = 'down'; const after = fs - F.sL; const thL = rz0 - OMEGA * F.sL; const tgt = -Math.round(-thL / Math.PI) * Math.PI;
    const u = sstep(0, 0.07, after); s.rz = mix(thL, tgt, u);
    s.pos.set(F.x0 + F.vx * F.sL + 0.04 * sstep(0, 0.07, after), TH / 2 + 0.002 + 0.025 * Math.sin(Math.PI * clamp(after / 0.07, 0, 1)) * (1 - u * 0.5), F.z); s.yaw = F.yaw;
    s.sq = 1 - 0.35 * Math.exp(-after * 40) * (after > 0 ? 1 : 0);
    const e = EAT[k]; if (e && t > e[0]) { const b = clamp((t - e[0]) / (e[1] - e[0]), 0, 1); s.scale = 1 - Math.floor(b * 3.0 + (k === 'F' ? 2 : 0)) / 3; if (b >= 1) s.vis = false; s.pos.x -= 0.03 * b; }
  }
  return s;
}
function placeToast(obj, s) {
  obj.root.visible = s.vis && s.scale > 0.01; obj.root.position.copy(s.pos);
  obj.root.rotation.set(0, s.yaw, s.rz, 'YXZ'); obj.root.scale.set(s.scale, s.sq * Math.max(0.3, s.scale), s.scale);
  obj.butter.scale.set(Math.max(0.001, s.butter), 1, Math.max(0.001, s.butter)); obj.butter.visible = s.butter > 0.01; if (obj.pat) { obj.pat.visible = s.butter > 0.6; }
}

// ---------- the man ----------
const MAN_FLOOR = new THREE.Vector3(-0.06, 0.882, -0.62);
const LADDER_POS = new THREE.Vector3(-0.1, 0, -0.85);
const MAN_TOP = new THREE.Vector3(-0.1, 2.25 + 0.025 + 0.882, -0.85);
const MAN_SIDE = new THREE.Vector3(-1.0, 0.882, 0.25);
function manAt(t, toasts) {
  const m = { anchor: MAN_FLOOR.clone(), mood: 'happy', look: null, lookW: null, hands: { L: { c: [-150, 30] }, R: { c: [150, 30] } }, shape: {}, knife: false, over: false, tilt: 0, sq: [1, 1], tuft: 0, sweat: false, blink: 0, ground: 0, carry: false };
  const w = tau(t);
  m.blink = (Math.sin(w * 1.3) > 0.985 || Math.sin(w * 0.77 + 2) > 0.99) ? 1 : 0;
  // which toast is in play
  const seg = t < T.bPick ? 'A' : t < T.cPick ? 'B' : t < 22 ? 'C' : 'F';
  const butterHands = (k, T0, T1) => {
    const s = toasts[k]; const P = FALL_PLAN[k];
    if (s.phase === 'butter') {
      m.over = true; m.knife = true; m.lookW = s.pos;
      m.hands.L = { w: s.pos.clone().add(new THREE.Vector3(-0.085, 0.012, 0.02)) };
      const st = clamp((t - P.b0) / (P.b1 - P.b0), 0, 1); const freq = (P.b1 - P.b0) < 1 ? 7 : 4.5;
      const scoop = t < P.b0 ? 1 : 0;
      const kp = s.pos.clone().add(new THREE.Vector3(0.03 + 0.04 * Math.sin((t - P.b0) * freq * Math.PI) * (st > 0 && st < 1 ? 1 : 0.2), 0.02, -0.01 + 0.02 * Math.cos((t - P.b0) * freq * 0.5 * Math.PI)));
      m.hands.R = { w: kp };
    } else if (s.phase === 'carry') {
      m.over = true; m.lookW = s.pos;
      m.hands.L = { w: s.pos.clone().add(new THREE.Vector3(-0.09, 0.01, 0)) }; m.hands.R = { w: s.pos.clone().add(new THREE.Vector3(0.09, 0.01, 0)) };
    }
  };
  if (t < T.think) {
    // ---- falls A, B, C at the table ----
    const k = seg; const s = toasts[k]; const P = FALL_PLAN[k]; const F = FALLS[k];
    if (k !== 'C' || t < F.rel) butterHands(k);
    if (k === 'A') {
      if (t > T.aPlace) { m.hands.L = { c: [-120, -60] }; m.hands.R = { c: [130, -40] }; m.lookW = s.pos; m.over = false; }
      if (t > 2.95) { m.mood = 'nervous'; m.lookW = s.pos; }
      if (t > F.land + 0.05) { m.mood = 'horror'; m.hands.L = { c: [-125, -285] }; m.hands.R = { c: [125, -285] }; m.lookW = new THREE.Vector3(0.62, 0, 0.06); m.tuft = Math.exp(-(t - F.land) * 5) * Math.sin((t - F.land) * 30); const e = Math.exp(-(t - F.land) * 9); m.sq = [1 - 0.06 * e, 1 + 0.08 * e]; }
    } else if (k === 'B') {
      m.mood = 'happy';
      if (t < T.bButter0 && t > T.bPick) { m.mood = 'despair'; }
      if (t > T.bPlace) { m.hands.L = { c: [-120, -60] }; m.hands.R = { c: [130, -40] }; m.over = false; m.lookW = s.pos; }
      if (t > T.bPlace + 0.05 && t < T.bSneeze) { m.mood = 'sneeze0'; m.tilt = -0.12 * sstep(T.bPlace, T.bSneeze, t); m.lookW = null; m.look = [0, -0.5]; m.hands.R = { c: [40, -300] }; }
      if (t >= T.bSneeze) { const e = Math.exp(-(t - T.bSneeze) * 6); m.mood = t < T.bSneeze + 0.35 ? 'sneeze' : 'horror'; m.tilt = 0.18 * e; m.sq = [1 + 0.05 * e, 1 - 0.07 * e]; m.lookW = s.pos; m.hands.R = { c: [130, -60] }; }
      if (t > F.land + 0.05) { m.mood = 'despair'; m.hands.L = { c: [-95, -430] }; m.hands.R = { c: [95, -430] }; m.lookW = new THREE.Vector3(0.85, 0, 0.22); m.tilt = 0.06 * Math.sin(t * 5); }
    } else {
      m.mood = 'suspicious';
      if (t > T.cPlace && t < F.rel) { m.hands.L = { c: [-120, -60] }; m.over = false; m.lookW = s.pos; m.tilt = 0.08; }
      if (t > T.cPush - 0.1 && t < F.rel + 0.25) { m.over = true; m.shape.R = 'point'; const fp = s.pos.clone().add(new THREE.Vector3(-0.115, 0.012, 0.0)); m.hands.R = { w: fp }; }
      if (t >= F.rel + 0.25) {
        // the long slow fall: wary → worried → horrified, all in slow motion
        const u = sstep(F.rel + 0.25, F.land, t);
        m.mood = u < 0.3 ? 'suspicious' : u < 0.7 ? 'nervous' : 'horror'; m.lookW = s.pos; m.sweat = u > 0.45;
        const hu = sstep(0.55, 0.95, u);
        m.hands.L = { c: [mix(-120, -125, hu), mix(-60, -285, hu)] }; m.hands.R = { c: [mix(140, 125, hu), mix(-20, -285, hu)] }; m.over = false;
        m.tilt = 0.08 * (1 - u);
      }
      if (t > F.land + 0.02) { m.mood = 'despair'; m.hands.L = { c: [-95, -430] }; m.hands.R = { c: [95, -430] }; m.lookW = new THREE.Vector3(0.7, 0, -0.12); m.sweat = false; }
    }
  } else if (t < T.crates - 0.5) {
    // ---- thinking, then the idea ----
    m.mood = 'think'; m.look = [-0.5, -0.75]; m.hands.R = { c: [30, -255], }; m.hands.L = { c: [-30, -110] }; m.tilt = -0.08;
    if (t > T.eureka) { const e = Math.exp(-(t - T.eureka) * 7); m.mood = 'eureka'; m.look = [0, -0.2]; m.hands.R = { c: [175, -480] }; m.shape.R = 'point'; m.tilt = 0; m.sq = [1 - 0.07 * e, 1 + 0.1 * e]; m.tuft = e * Math.sin((t - T.eureka) * 25); }
  } else if (t < T.climb) {
    // ---- time-lapse: crates carried in, the table rises ----
    m.anchor.copy(MAN_SIDE); m.mood = 'eureka';
    const L = clamp(Math.floor((t - T.crates + 0.55) / 0.75), 0, NLAYER);
    const tl = layerT(Math.min(NLAYER - 1, L));
    const holding = L < NLAYER && t > tl - 0.55 && t < tl;
    m.anchor.x += (L % 2 ? -0.12 : 0.0); m.anchor.z += (L % 2 ? 0.08 : 0);
    if (holding) { m.carry = true; m.hands.L = { c: [-140, -470] }; m.hands.R = { c: [140, -470] }; m.mood = 'happy'; m.tilt = 0.05 * Math.sin(t * 20); }
    else { m.hands.L = { c: [-150, 20] }; m.hands.R = { c: [150, 20] }; m.look = [0.55, -0.6]; m.mood = 'happy'; }
    const since = t - tl; if (since > 0 && since < 0.2) m.sq = [1.06, 0.94];
  } else if (t < T.onTop) {
    // ---- hop onto the ladder top ----
    const u = sstep(T.climb, T.onTop, t); m.anchor.copy(MAN_SIDE).lerp(MAN_TOP, u); m.anchor.y += 0.5 * Math.sin(Math.PI * u); m.mood = 'eureka';
    m.hands.L = { c: [-170, -330] }; m.hands.R = { c: [170, -330] }; m.ground = 2.275 * u;
  } else {
    // ---- up top: one more toast ----
    m.anchor.copy(MAN_TOP); m.ground = 2.275; const s = toasts.F; const F = FALLS.F;
    const land = Math.exp(-Math.max(0, t - T.onTop) * 8); m.sq = [1 + 0.06 * land, 1 - 0.08 * land];
    m.mood = 'happy'; butterHands('F');
    if (t > T.fPlace) { m.hands.L = { c: [-120, -60] }; m.hands.R = { c: [130, -40] }; m.over = false; m.lookW = s.pos; }
    if (t > T.fLook && t < T.fPush) { m.mood = 'nervous'; m.lookW = new THREE.Vector3(0.6, 0, 0.3); m.sweat = true; m.tilt = 0.1; }
    if (t > T.fPush - 0.1 && t < F.rel + 0.25) { m.mood = 'suspicious'; m.over = true; m.shape.R = 'point'; m.hands.R = { w: s.pos.clone().add(new THREE.Vector3(-0.115, 0.012, 0.0)) }; m.lookW = s.pos; }
    if (t >= F.rel + 0.25 && t < F.land + 0.05) { const u = sstep(F.rel, F.land, t); m.mood = u < 0.5 ? 'nervous' : 'horror'; m.lookW = s.pos; m.hands.L = { c: [-90, -150] }; m.hands.R = { c: [90, -150] }; m.sweat = true; m.tilt = 0.12; }
    if (t >= F.land + 0.05) {
      const e = Math.exp(-(t - F.land - 0.05) * 6); m.mood = 'cheer'; m.hands.L = { c: [-215, -470] }; m.hands.R = { c: [215, -470] }; m.sq = [1 - 0.08 * e, 1 + 0.1 * e]; m.tuft = Math.sin((t - F.land) * 14) * (0.5 + 0.5 * e);
      m.dyBounce = -30 * Math.abs(Math.sin((t - F.land) * 7)) * (t < T.gulp ? 1 : 0);
    }
    if (t >= T.gulp) { m.mood = t < T.gulp + 0.6 ? 'horror' : 'deadpan'; m.hands.L = { c: [-150, 25] }; m.hands.R = { c: [150, 25] }; m.lookW = new THREE.Vector3(1.0, 0.05, 0.1); m.tuft = 0; m.sweat = false;
      if (t > T.gulp + 0.6) { m.blink = (t > 44.6 && t < 45.0) ? 1 : 0; m.tilt = 0.06 * sstep(T.deadpan, T.deadpan + 1, t); }
    }
  }
  return m;
}

// ---------- the pup ----------
const L2 = (a, k = 0) => [a, k];
function dogAt(t) {
  const w = tau(t);
  const d = { pos: new THREE.Vector3(3.6, 0.144, 0.4), dir: new THREE.Vector3(-1, 0, 0), legs: { FL: L2(0), FR: L2(0), HL: L2(0), HR: L2(0) }, headTilt: 0, tongue: 0, eye: { open: 1, size: 1, look: [0, 0] }, wag: Math.sin(w * 14), pitch: 0, sq: [1, 1], vis: true };
  const walk = (a, b, t0, t1) => { const u = clamp((t - t0) / (t1 - t0), 0, 1); d.pos.copy(a).lerp(b, u); const ph = (w - tau(t0)) * 11; if (u > 0 && u < 1) { d.legs = { FL: L2(0.45 * Math.sin(ph), 0.4 * Math.max(0, Math.sin(ph + 1.5))), FR: L2(-0.45 * Math.sin(ph), 0.4 * Math.max(0, -Math.sin(ph + 1.5))), HL: L2(-0.45 * Math.sin(ph), -0.3 * Math.max(0, -Math.sin(ph))), HR: L2(0.45 * Math.sin(ph), -0.3 * Math.max(0, Math.sin(ph))) }; d.pos.y += 0.012 * Math.abs(Math.sin(ph)); } d.dir.set(Math.sign(b.x - a.x) || -1, 0, 0); return u; };
  const at = (k, dz = 0.12) => { const F = FALLS[k]; return new THREE.Vector3(F.xL + 0.04 + 0.27, 0.144, F.z + dz); };
  const eat = (t0, t1) => { const u = clamp((t - t0) / (t1 - t0), 0, 1); const b = Math.sin(u * Math.PI); d.pitch = 0.3 * b; d.headTilt = 0.8 * b + 0.15 * Math.sin(u * Math.PI * 6) * b; d.eye.open = 1 - 0.5 * b; };
  if (t < 7.4) { d.vis = false; return d; }
  if (t < 26.2) {
    walk(new THREE.Vector3(2.5, 0.144, 0.36), at('B'), 7.4, 8.5);
    if (t > 8.5 && t < 22.0) {
      d.pitch = 0.18 * sstep(8.5, 8.9, t); d.headTilt = 0.45 * sstep(8.5, 8.9, t) + 0.05 * Math.sin(w * 18); d.wag = Math.sin(w * 18);
      if (t > FALLS.C.land) { const e = sstep(FALLS.C.land, FALLS.C.land + 0.12, t); d.headTilt = mix(d.headTilt, -0.15, e); d.pitch = mix(d.pitch, 0, e); d.eye.size = 1.3; d.eye.look = [-0.6, 0.2]; }
    }
    if (t >= 22.0) eat(22.0, 22.6);
    if (t > 22.65) { walk(at('B'), at('A'), 22.65, 23.25); if (t > 23.3) eat(23.3, 23.9); }
    if (t > 23.95) { walk(at('A'), at('C', 0.14), 23.95, 24.4); if (t > 24.4) eat(24.4, 25.0); }
    if (t > 25.05) { d.tongue = sstep(25.05, 25.3, t) * (1 - sstep(25.9, 26.1, t)); d.eye.open = 0.5; d.wag = Math.sin(w * 20); }
    return d;
  }
  if (t < T.dogBack) { walk(at('C', 0.14), new THREE.Vector3(3.2, 0.144, 0.3), 26.2, 27.8); if (t > 27.8) d.vis = false; return d; }
  walk(new THREE.Vector3(2.7, 0.144, 0.3), at('F'), T.dogBack, T.gulp - 0.1);
  if (t > T.gulp - 0.1) {
    const u = clamp((t - T.gulp) / 0.35, 0, 1); const b = Math.sin(u * Math.PI); d.pitch = 0.3 * b; d.headTilt = 0.8 * b;
    if (t > T.gulp + 0.35) { const c = t - T.gulp - 0.35; d.sq = [1 + 0.04 * Math.sin(c * 30) * Math.exp(-c * 3), 1 - 0.04 * Math.sin(c * 30) * Math.exp(-c * 3)]; d.tongue = sstep(0.4, 0.6, c) * (1 - sstep(1.4, 1.6, c)); d.eye.open = c < 1.6 ? 0.45 : 1; d.headTilt = -0.25 * sstep(1.6, 2.0, c); d.eye.look = [0.2, -0.8 * sstep(1.6, 2.0, c)]; d.wag = Math.sin(w * 16); }
  }
  return d;
}

// ---------- camera ----------
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const KEYS = [
  [0.0, V(0.36, 1.42, 1.75), V(0.1, 1.02, -0.2), 40],
  [2.5, V(0.32, 1.38, 1.6), V(0.12, 1.0, -0.2), 40],
  [3.25, V(0.95, 1.1, 3.0), V(0.35, 0.8, -0.1), 40],
  [3.75, V(0.95, 1.1, 3.0), V(0.35, 0.8, -0.1), 40],
  [4.15, V(0.22, 1.5, 0.95), V(-0.06, 1.48, -0.62), 40],
  [4.55, V(0.22, 1.5, 0.95), V(-0.06, 1.48, -0.62), 40],
  [5.1, V(0.4, 1.4, 1.85), V(0.1, 1.0, -0.2), 40],
  [6.3, V(0.5, 1.35, 2.2), V(0.15, 1.0, -0.2), 40],
  [6.9, V(1.05, 1.1, 3.1), V(0.45, 0.78, -0.05), 40],
  [8.2, V(1.1, 1.08, 3.15), V(0.5, 0.76, -0.05), 40],
  [8.7, V(0.38, 1.38, 1.8), V(0.14, 1.0, -0.2), 40],
  [9.9, V(0.64, 1.18, 1.7), V(0.36, 0.95, -0.12), 40],
];
const KEYS2 = [
  [21.6, null], // handled by the orbit blend
  [22.6, V(0.75, 1.05, 2.9), V(0.3, 0.75, -0.1), 40],
  [23.6, V(0.75, 1.05, 2.9), V(0.3, 0.75, -0.1), 40],
  [24.1, V(0.25, 1.55, 1.45), V(-0.04, 1.65, -0.62), 40],
  [24.9, V(0.25, 1.55, 1.45), V(-0.04, 1.65, -0.62), 40],
  [25.6, V(1.3, 1.5, 5.6), V(-0.2, 1.45, 0), 42],
  [29.0, V(1.25, 2.4, 6.0), V(-0.2, 2.05, 0), 42],
  [30.0, V(0.55, 3.55, 2.15), V(0.12, 3.3, -0.45), 40],
  [31.9, V(0.7, 3.4, 1.6), V(0.35, 3.15, -0.15), 40],
];
function keyCam(K, t) {
  let i = 0; while (i < K.length - 2 && t > K[i + 1][0]) i++;
  const a = K[i], b = K[i + 1]; const u = sstep(a[0], b[0], t);
  return { pos: a[1].clone().lerp(b[1], u), tgt: a[2].clone().lerp(b[2], u), fov: mix(a[3], b[3], u) };
}
const blend = (A, B, u) => ({ pos: A.pos.clone().lerp(B.pos, u), tgt: A.tgt.clone().lerp(B.tgt, u), fov: mix(A.fov, B.fov, u) });
function orbitC(t, toasts) {
  const F = FALLS.C; const u = sstep(F.rel, F.land, t); const p = toasts.C.pos.clone();
  if (toasts.C.phase === 'down') p.copy(toasts.C.pos);
  const phi = mix(1.3, 1.9, u), R = mix(1.05, 0.9, u), h = mix(0.22, 0.12, u);
  const cen = p.clone().add(V(0.02, 0, 0));
  return { pos: cen.clone().add(V(R * Math.cos(phi), h, R * Math.sin(phi))), tgt: cen.clone().add(V(0, 0.02, 0)), fov: 40 };
}
function trackF(t, toasts) {
  const F = FALLS.F; const u = sstep(F.rel, F.land, t); const p = toasts.F.pos.clone();
  const phi = mix(1.2, 1.75, u), R = mix(0.75, 0.95, u), h = mix(0.18, 0.12, u);
  const pos = p.clone().add(V(R * Math.cos(phi), h, R * Math.sin(phi))); pos.y = Math.max(0.14, pos.y);
  return { pos, tgt: p.clone().add(V(0, mix(0.02, 0.06, u), 0)), fov: 40 };
}
function camAt(t, toasts) {
  if (t < 9.9) return keyCam(KEYS, t);
  if (t < 22.6) {
    const k0 = keyCam(KEYS, 9.9); const o = orbitC(Math.min(t, FALLS.C.land), toasts);
    let c = blend(k0, o, sstep(9.9, 10.9, t));
    if (t > 21.6) c = blend(c, keyCam(KEYS2, 22.6), sstep(21.6, 22.6, t));
    return c;
  }
  if (t < 31.9) return keyCam(KEYS2.slice(1), t);
  if (t < 39.4) { const k0 = keyCam(KEYS2.slice(1), 31.9); return blend(k0, trackF(Math.min(t, FALLS.F.land), toasts), sstep(31.9, 32.8, t)); }
  const end = trackF(FALLS.F.land, toasts);
  const K3 = [[39.4, end.pos, end.tgt, 40], [40.2, V(1.6, 1.6, 6.6), V(0.2, 2.1, -0.2), 42], [40.8, V(1.6, 1.6, 6.6), V(0.2, 2.1, -0.2), 42], [41.4, V(1.3, 0.42, 1.75), V(1.0, 0.24, 0.1), 40], [42.9, V(1.3, 0.42, 1.75), V(1.0, 0.24, 0.1), 40], [43.6, V(0.62, 3.45, 1.75), V(-0.05, 3.55, -0.85), 40], [DUR, V(0.6, 3.45, 1.6), V(-0.06, 3.55, -0.85), 40]];
  return keyCam(K3, t);
}

// ---------- helpers: world point → flat canvas units ----------
const _f = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3();
function toCanvas(flat, P) {
  _f.set(0, 0, -1).applyQuaternion(camera.quaternion); _r.set(1, 0, 0).applyQuaternion(camera.quaternion); _u.set(0, 1, 0).applyQuaternion(camera.quaternion);
  const C = camera.position, A = flat.mesh.position; const d = P.clone().sub(C); const n = _f.clone().negate();
  const k = A.clone().sub(C).dot(n) / d.dot(n); const X = C.clone().addScaledVector(d, k).sub(A);
  return [X.dot(_r) / flat.sizeM * 1024, -X.dot(_u) / flat.sizeM * 1024];
}

let POST = {};
function setup(t) {
  // table + crates
  const ty = tableY(t); SET.table.position.set(jolt(t), ty, 0); SET.table.rotation.z = -jolt(t) * 0.6;
  for (let L = 0; L < NLAYER; L++) { const f = layerF(L, t); const g = SET.crates[L]; g.visible = f > 0.001; g.position.set(0, L * LAYER, 0); g.scale.set(1, Math.max(0.001, Math.min(1, f)), 1); }
  const lad = sstep(T.ladder, T.ladder + 0.25, t); SET.ladder.visible = lad > 0; SET.ladder.position.copy(LADDER_POS); SET.ladder.scale.set(1, Math.max(0.001, lad * (1 + 0.1 * Math.sin(Math.PI * lad))), 1);
  const picks = (t > T.bPick ? 1 : 0) + (t > T.cPick ? 1 : 0) + (t > T.fPick ? 1 : 0);
  for (let k = 0; k < 3; k++) SET.stack[k].visible = k < 3 - picks;
  // clock hands follow film time a little
  SET.hands[0].rotation.z = -t * 0.12; SET.hands[1].rotation.z = -1.2 - t * 0.01;
  // toasts
  const TS = {}; for (const k of ['A', 'B', 'C', 'F']) { TS[k] = toastAt(k, t); placeToast(TOAST[k], TS[k]); }
  // ghost trails + dotted arcs
  for (const k of ['C', 'F']) {
    const F = FALLS[k]; const fs = tau(t) - F.w0; const fade = k === 'C' ? 1 - sstep(24.2, 25.0, t) : 1 - sstep(40.2, 40.8, t);
    GH[k].forEach((g, i) => { const si = (i / (NG - 1)) * F.sL; const on = fs > si + F.sL * 0.06 && fade > 0.01 && (i < NG - 1);
      g.root.visible = on; if (!on) return; const y0 = F.top + TH / 2 + 0.002;
      g.root.position.set(F.x0 + F.vx * si, Math.max(TH / 2 + 0.003, y0 - 4.9 * si * si), F.z); g.root.rotation.set(0, F.yaw * si / F.sL, -0.12 - OMEGA * si, 'YXZ');
      const op = 0.3 * fade * (0.5 + 0.5 * i / NG); g.root.traverse((o) => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach((mm) => (mm.opacity = op)); }); });
    DOTS[k].forEach((d, i) => { const si = (i / (ND - 1)) * F.sL; const on = fs > si && fade > 0.01; d.visible = on; if (!on) return; const y0 = F.top + TH / 2 + 0.002; d.position.set(F.x0 + F.vx * si, Math.max(0.006, y0 - 4.9 * si * si), F.z + 0.0); d.material.opacity = 0.65 * fade; });
  }
  // splats (butter-down falls)
  for (const k of ['A', 'B', 'C']) {
    const F = FALLS[k]; const after = tau(t) - F.w0 - F.sL; const S = SPLAT[k]; const e = EAT[k];
    const gone = e ? sstep(e[0], e[1], t) : 0; const lx = F.x0 + F.vx * F.sL + 0.04;
    S.g.visible = after > 0 && gone < 1; S.g.position.set(lx, 0, F.z); S.g.rotation.y = F.yaw;
    const g = sstep(0, 0.05, after); S.pool.scale.set(0.105 * g * (1 - gone), 0.09 * g * (1 - gone), 1);
    S.blobs.forEach((b) => { const on = after > 0 && gone < 1; b.m.visible = on; if (!on) return; const s = Math.min(after, 2 * b.vy / 9.8); const fly = after < 2 * b.vy / 9.8;
      const R = 0.08 + b.v * s; b.m.position.set(lx + Math.cos(b.a) * R, Math.max(0.004, b.vy * s - 4.9 * s * s), F.z + Math.sin(b.a) * R);
      const sc = b.r * (1 - gone); b.m.scale.set(sc * (fly ? 1 : 1.6), sc * (fly ? 1 : 0.35), sc * (fly ? 1 : 1.6)); });
  }
  { const F = FALLS.F; const after = tau(t) - F.w0 - F.sL; const lx = F.x0 + F.vx * F.sL + 0.04; const gone = t > T.gulp + 0.3;
    CRUMBS.forEach((c) => { const on = after > 0 && !gone; c.m.visible = on; if (!on) return; const tf = 2 * c.vy / 9.8; const s = Math.min(after, tf); const R = 0.07 + c.v * s; c.m.position.set(lx + Math.cos(c.a) * R, Math.max(0.005, c.vy * s - 4.9 * s * s) * 0.5, F.z + Math.sin(c.a) * R); c.m.rotation.set(c.spin * s, c.spin * s * 0.7, 0); }); }
  // camera
  const c = camAt(t, TS);
  camera.position.copy(c.pos); camera.up.set(0, 1, 0); camera.lookAt(c.tgt); camera.fov = c.fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  // man
  const m = manAt(t, TS);
  MAN.mesh.position.copy(m.anchor); ARMS.mesh.position.copy(m.anchor);
  const pose = { mood: m.mood, look: m.look || [0, 0], tilt: m.tilt, sq: m.sq, tuft: m.tuft, sweat: m.sweat, blink: m.blink, dy: m.dyBounce || 0, hands: {}, shape: m.shape, knife: m.knife };
  if (m.lookW) { const q = toCanvas(MAN, m.lookW); const fx = q[0], fy = q[1] + 330; const L = Math.hypot(fx, fy) || 1; pose.look = [fx / L * Math.min(1, L / 160), fy / L * Math.min(1, L / 160)]; }
  for (const s of ['L', 'R']) { const h = m.hands[s]; pose.hands[s] = h.w ? toCanvas(MAN, h.w) : h.c; }
  MAN.update(camera, m.anchor, right, pose, m.ground, 0.0);
  ARMS.update(camera, m.anchor, right, pose, m.ground, 0.0);
  ARMS.mesh.material.depthTest = !m.over; ARMS.mesh.position.addScaledVector(new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion), -0.01);
  MAN.shadow.position.set(m.anchor.x, m.ground + 0.006, m.anchor.z); MAN.shadow.scale.set(0.42, 0.26, 1); MAN.shadow.material.opacity = 0.22; MAN.shadow.visible = !(m.anchor.y - m.ground > 0.95);
  ARMS.shadow.visible = false;
  // the crate he carries in the time-lapse
  SET.carry.visible = m.carry; if (m.carry) { SET.carry.position.copy(m.anchor).add(V(0, 0.88 + 0.22 - 0.882 + 0.882 * 0 + 0.05, 0.02)); SET.carry.position.y = m.anchor.y + 0.98; SET.carry.rotation.set(0, 0, 0.05 * Math.sin(t * 20)); }
  // idea bulb
  const bu = t - T.eureka; const bon = bu > 0 && t < T.crates - 0.5; BULB.mesh.visible = bon; BULB.shadow.visible = false;
  if (bon) { const s = clamp(bu / 0.15, 0, 1) * (1 + 0.25 * Math.exp(-bu * 8) * Math.sin(bu * 30)) * (1 - sstep(T.crates - 0.8, T.crates - 0.5, t)); BULB.update(camera, m.anchor.clone().add(V(0.0, 1.36, 0.02)), right, { s: Math.max(0.01, s), rays: 0.5 + 0.5 * Math.sin(bu * 10) }, 0, 0); }
  // pup
  const d = dogAt(t); DOG.mesh.visible = DOG.shadow.visible = d.vis;
  if (d.vis) DOG.update(camera, d.pos, d.dir, { legs: d.legs, headTilt: d.headTilt, tongue: d.tongue, eye: d.eye, wag: d.wag, pitch: d.pitch, sq: d.sq }, 0, 0.2);
  // sun follows the action so shadows stay crisp
  const focus = c.tgt.clone(); focus.y = Math.min(focus.y, 2.0);
  sun.target.position.copy(focus); sun.position.copy(focus).add(V(-2.6, 6.5, 4.2));
  const big = t > 25.3 && t < 30.1 || (t > 39.6 && t < 41.1);
  const ext = big ? 4.6 : 2.6; Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext }); sun.shadow.camera.updateProjectionMatrix();
  POST = { fade: sstep(0, 0.5, t) * (1 - sstep(T.fade, DUR - 0.05, t)), flash: 0 };
}
function subframes(t) {
  const near = (x, a, b) => t > x - a && t < x + b;
  return (near(FALLS.A.land, 0.42, 0.3) || near(FALLS.B.land, 0.42, 0.3) || near(T.bSneeze, 0.05, 0.3)) ? 3 : 1;
}

// ---------- post: clean — MSAA, gentle halation from the brightest parts, filmic curve, soft vignette. No grain. ----------
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
    if (i === 0) { const m = firstMat || copyMat; m.uniforms.tSrc.value = src; pass(m, A[0]); }
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
  if (N <= 1) { setup(t); renderer.setRenderTarget(rtScene); renderer.setClearColor(0xbfe3ff, 1); renderer.render(scene, camera); src = rtScene.texture; }
  else {
    renderer.setRenderTarget(rtAcc); renderer.setClearColor(0, 1); renderer.clear();
    for (let k = 0; k < N; k++) {
      const ts = clamp(t - 1 / 96 + (k + 0.5) / N / 48, 0, DUR - 1e-4);
      setup(ts); renderer.setRenderTarget(rtScene); renderer.setClearColor(0xbfe3ff, 1); renderer.render(scene, camera);
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
