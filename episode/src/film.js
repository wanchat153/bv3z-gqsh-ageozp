// Cat Flip — wordless toon short. Every frame is a pure function of t.
import * as THREE from './three.module.js';
import { DUR, T, LEDGE_Y, CAT_Y0, tau, TAU_OFF, FALL_T, T_LAND, EV } from './timeline.js';
import { clamp, mix, sstep } from './toon.js';
import { buildSet, makeButterfly } from './set.js';
import { makeCat, poseCat, LEG, STAND, makeDog } from './chars.js';
import { buildInner, poseInner, INNER_O } from './inner.js';

const W = innerWidth, HH = innerHeight;
const canvas = document.createElement('canvas');
document.body.style.margin = '0'; document.body.style.background = '#000';
document.body.appendChild(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, HH, false);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, W / HH, 0.005, 1000);

const hemi = new THREE.HemisphereLight(0xd6ecff, 0x9a8a6a, 1.15); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0dc, 2.6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 40 });
scene.add(sun); scene.add(sun.target);
const SET = buildSet(scene);
const CAT = makeCat(); scene.add(CAT.root);
const DOG = makeDog(); scene.add(DOG.root);
const BF = makeButterfly(); scene.add(BF.g);
const IN = buildInner(scene);
const DOG_HOME = new THREE.Vector3(2.55, SET.WALL_TOP + 0.13, 1.3);

// ---------- the cat through the film ----------
const L = LEG;
const QS = new URLSearchParams(location.search); const HEADP = +(QS.get('hp') ?? -0.45), HEADY = +(QS.get('hy') ?? -0.9);
function catAt(t) {
  const p = STAND(); const pos = new THREE.Vector3(); let rotY = -Math.PI / 2, rotX = 0, rotZ = 0;
  const tr = tau(t) - TAU_OFF;             // world seconds since leaving the ledge
  if (t < T.off) {
    // asleep on its back along the rail; nose twitch, sneeze, slide toward the edge
    const breathe = 0.04 * Math.sin(t * 2.4);
    p.aF = p.aR = Math.PI; p.arch = breathe * 0.5;
    p.legs = { FL: L(0.7, 1.1), FR: L(0.5, 1.3), HL: L(-0.3, -1.0), HR: L(-0.5, -0.8) };
    p.eye = { open: 0 }; p.tail = { curl: -0.2, up: -0.5, sway: 0.9 };
    p.head = { pitch: HEADP, yaw: HEADY, roll: 0 };
    const tw = sstep(T.twitch, T.twitch + 0.15, t) * (1 - sstep(T.sneeze - 0.1, T.sneeze, t));
    p.head.roll += 0.06 * tw * Math.sin(t * 45);
    const sn = Math.exp(-Math.max(0, t - T.sneeze) * 9) * (t > T.sneeze ? 1 : 0);
    p.head.pitch += -0.5 * sn; p.arch += 0.25 * sn;
    p.eye = { open: t > T.sneeze ? 0.2 * (1 - sn) : 0 };
    const sl = sstep(T.slide, T.off, t);
    pos.set(0, CAT_Y0 + 0.02 * sn - 0.04 * sl * sl, -0.06 + 0.36 * sl * sl);
    rotX = 0.35 * sl * sl;                  // tipping over the front edge
  } else if (tr < FALL_T) {
    const s = tr;
    pos.set(0, CAT_Y0 - 0.04 - 4.9 * s * s, 0.30 + 0.5 * s);
    rotX = 0.35 * (1 - sstep(0.0, 0.2, s));
    const f = sstep(0.12, 0.24, s), r = sstep(0.22, 0.34, s), x = sstep(0.32, 0.42, s);
    p.aF = Math.PI * (1 - f); p.aR = Math.PI * (1 - r);
    const flail = 1 - sstep(0.08, 0.14, s), wob = Math.sin(t * 7.0);
    const fl = (a, b) => mix(a, b, 1);
    p.legs = {
      FL: L(mix(mix(0.3 * wob, 0.95, sstep(0.1, 0.16, s)), mix(0.25, 0.15, x), r), mix(mix(0.4, 1.7, sstep(0.1, 0.16, s)), mix(0.35, 0.15, x), r), 0.55 * flail + 0.12 * x),
      FR: L(mix(mix(-0.3 * wob, 0.95, sstep(0.1, 0.16, s)), mix(0.25, 0.15, x), r), mix(mix(0.4, 1.7, sstep(0.1, 0.16, s)), mix(0.35, 0.15, x), r), 0.55 * flail + 0.12 * x),
      HL: L(mix(mix(-0.4, -0.35, f), mix(0.55, -0.15, x), r), mix(mix(-0.3, -0.15, f), mix(-1.5, -0.25, x), r), 0.5 * flail + 0.3 * (f - r) + 0.12 * x),
      HR: L(mix(mix(0.4, -0.35, f), mix(0.55, -0.15, x), r), mix(mix(-0.3, -0.15, f), mix(-1.5, -0.25, x), r), 0.5 * flail + 0.3 * (f - r) + 0.12 * x),
    };
    p.arch = 0.22 * x;
    p.head = { pitch: 0.25 * f, yaw: 0, roll: 0 };
    p.eye = { open: 1, size: mix(0.5, 1.0, x), look: [0, -0.6 * f] };
    p.tail = { curl: mix(-0.2, 0.7, x), up: mix(-0.3, 0.9, x), sway: 0.9 * (1 - f) - 1.4 * (f - r) + 0.2 * r };
  } else {
    // landed: absorb, stand, sit proud; later stroll over to the pup and sit beside him
    const s = tr - FALL_T; const ld = new THREE.Vector3(0, 0.255, 0.30 + 0.5 * FALL_T);
    const sq = Math.exp(-s * 10) * Math.sin(Math.min(Math.PI, s * 18));
    pos.copy(ld); pos.y -= 0.07 * sq;
    p.legs = { FL: L(0.15, 0.35 * sq), FR: L(0.15, 0.35 * sq), HL: L(-0.15, -0.5 * sq), HR: L(-0.15, -0.5 * sq) };
    p.eye = { open: 1, size: 1 }; p.tail = { curl: 0.8, up: 1.0, sway: 0.1 * Math.sin(t * 2) };
    const sit = sstep(T_LAND + 1.0, T_LAND + 1.6, t) * (1 - sstep(T.catWalk - 0.3, T.catWalk, t));
    rotX = -0.45 * sit; pos.y -= 0.03 * sit;
    p.legs.HL = L(mix(-0.15, -1.35, sit), mix(0, -2.2, sit)); p.legs.HR = L(mix(-0.15, -1.35, sit), mix(0, -2.2, sit));
    p.legs.FL.sw += 0.45 * sit; p.legs.FR.sw += 0.45 * sit;
    p.head = { pitch: 0.4 * sit, yaw: 0.6 * sit * sstep(T.pan, T.pan + 1, t) };
    p.eye.open = mix(1, 0.55, sit * sstep(T_LAND + 1.4, T_LAND + 2.0, t));
    // walk over to the pup
    const wk = sstep(T.catWalk, T.catWalk + 2.8, t);
    if (t > T.catWalk) {
      const end = new THREE.Vector3(2.0, 0.255, 2.5);
      pos.lerp(end, wk); pos.y = 0.255;
      rotY = mix(-Math.PI / 2, Math.PI * 0.18, sstep(T.catWalk, T.catWalk + 0.6, t));
      const ph = (t - T.catWalk) * 9.0, go = 1 - sstep(T.catWalk + 2.4, T.catWalk + 2.9, t);
      p.legs = { FL: L(0.35 * Math.sin(ph) * go, 0.3 * Math.max(0, Math.cos(ph)) * go), FR: L(-0.35 * Math.sin(ph) * go, 0.3 * Math.max(0, -Math.cos(ph)) * go), HL: L(-0.35 * Math.sin(ph) * go, -0.3 * Math.max(0, -Math.cos(ph)) * go), HR: L(0.35 * Math.sin(ph) * go, -0.3 * Math.max(0, Math.cos(ph)) * go) };
      const sit2 = sstep(T.catWalk + 2.9, T.catWalk + 3.5, t);
      rotX = -0.45 * sit2; pos.y -= 0.03 * sit2;
      p.legs.HL = L(mix(p.legs.HL.sw, -1.35, sit2), mix(p.legs.HL.bend, -2.2, sit2)); p.legs.HR = L(mix(p.legs.HR.sw, -1.35, sit2), mix(p.legs.HR.bend, -2.2, sit2));
      p.legs.FL.sw += 0.45 * sit2; p.legs.FR.sw += 0.45 * sit2;
      p.head = { pitch: 0.35 * sit2, yaw: -0.5 * sstep(T.catWalk + 3.2, T.catWalk + 3.8, t) };
      const blink = sstep(42.6, 42.9, t) * (1 - sstep(43.1, 43.5, t));
      p.eye = { open: mix(1, 0.55, sit2) * (1 - blink), size: 1 };
      p.tail = { curl: 0.9, up: 1.2 - 0.6 * sit2, sway: 0.25 * Math.sin(t * 3) };
    }
  }
  return { pos, rotY, rotX, rotZ, pose: p };
}

// ---------- the pup ----------
function dogAt(t) {
  const pos = DOG_HOME.clone(); let rotY = -Math.PI / 2, rotZ = 0;
  const legs = { FL: L(-1.2, 0.0), FR: L(-1.2, 0.0), HL: L(1.1, -0.2), HR: L(1.1, -0.2) }; // lying sphinx-like
  let eye = { open: 1, size: 1, look: [0, 0] }, tongue = 0, stars = false, headP = 0, headR = 0;
  if (t > T_LAND - 0.3) eye.size = mix(1, 1.5, sstep(T_LAND - 0.3, T_LAND + 0.2, t)) * (1 - 0.3 * sstep(T.dogLie, T.dogLie + 0.5, t));
  const roll = sstep(T.dogLie, T.dogLie + 1.0, t);
  rotZ = Math.PI * roll;
  if (t > T.dogLie) {
    const wig = sstep(T.dogLie + 1.0, T.dogLie + 1.3, t) * Math.sin(t * 16) * (1 - sstep(T.dogRoll - 0.1, T.dogRoll, t));
    rotZ += 0.15 * wig; legs.FL = L(mix(-1.2, 0.6, roll) + 0.3 * wig, 0.6); legs.FR = L(mix(-1.2, 0.6, roll) - 0.3 * wig, 0.6); legs.HL = L(mix(1.1, -0.4, roll), -0.6); legs.HR = L(mix(1.1, -0.4, roll), -0.6);
    tongue = roll; eye = { open: 1, size: 0.8 };
  }
  if (t > T.dogRoll) {
    // rolls off the wall toward the lawn, lands flat on his back
    const s = t - T.dogRoll; const fallT = 0.45;
    const u = clamp(s / fallT, 0, 1);
    pos.z = mix(DOG_HOME.z, DOG_HOME.z + 0.62, u); pos.y = s < fallT ? DOG_HOME.y + 0.08 * Math.sin(Math.PI * u) - (DOG_HOME.y - 0.14) * u * u : 0.14;
    rotZ = Math.PI + 0.4 * Math.sin(Math.PI * u);
    const b = s > fallT ? Math.exp(-(s - fallT) * 7) * Math.abs(Math.sin((s - fallT) * 16)) : 0; pos.y += 0.06 * b;
    legs.FL = L(0.9, 0.2 + 0.2 * Math.sin(s * 3)); legs.FR = L(0.7, 0.3); legs.HL = L(-0.8, -0.2); legs.HR = L(-0.6, -0.3);
    stars = s > fallT + 0.1; eye = { open: 1, size: 0.45, look: [Math.sin(t * 6) * 0.6, Math.cos(t * 6) * 0.6] }; tongue = 1; headR = 0.2 * Math.sin(t * 4);
  }
  return { pos, rotY, rotZ, legs, eye, tongue, stars, headP, headR };
}

// ---------- the butterfly ----------
function butterflyAt(t, catNose) {
  const fl = Math.sin(t * 40);
  let p = new THREE.Vector3(), yaw = 0, flap = 0.9 * fl;
  const start = new THREE.Vector3(1.4, 4.9, 1.6);
  if (t < T.land) { const u = sstep(T.fly - 1.2, T.land, t); p.copy(start).lerp(catNose, u); p.y += 0.12 * Math.sin(u * 9) * (1 - u); p.x += 0.1 * Math.sin(u * 7) * (1 - u); yaw = 2.4; }
  else if (t < T.sneeze) { p.copy(catNose); p.y += 0.02; flap = 0.5 + 0.4 * Math.sin(t * 3); yaw = 2.4; }
  else if (t < 30) { const u = sstep(T.sneeze, T.sneeze + 2.5, t); p.copy(catNose).lerp(new THREE.Vector3(-1.5, 5.6, 1.2), u); p.y += 0.1 * Math.sin(u * 8); yaw = 3.8; if (t > 7) p.set(-50, -50, -50); }
  else { // it comes back for the pup's nose at the end
    const nose = DOG.head.localToWorld(new THREE.Vector3(0, -0.015, 0.17));
    const u = sstep(40.6, 42.6, t); p.copy(new THREE.Vector3(-0.5, 1.6, 3.2)).lerp(nose, u); p.y += 0.1 * Math.sin(u * 8) * (1 - u) + 0.015; yaw = 0.6;
    if (t > 42.6) flap = 0.5 + 0.4 * Math.sin(t * 3); if (t < 40.6) p.set(-50, -50, -50);
  }
  return { p, yaw, flap };
}

// ---------- camera ----------
const headW = () => CAT.head.localToWorld(new THREE.Vector3(0, 0, 0));
const earW = () => CAT.ears[1].localToWorld(new THREE.Vector3(0, -0.006, 0.02));
function orbitAt(t, center) {
  const u = sstep(T.off, T.dive, t);
  const phi = mix(1.25, 2.6, u) + 0.15 * Math.sin(u * Math.PI * 2), R = mix(1.6, 1.9, Math.sin(u * Math.PI)), h = mix(0.35, -0.2, u) + 0.15 * Math.sin(u * Math.PI);
  return center.clone().add(new THREE.Vector3(R * Math.cos(phi), h, R * Math.sin(phi)));
}
function camAt(t) {
  const c = { pos: new THREE.Vector3(), tgt: new THREE.Vector3(), fov: 40, inner: false };
  CAT.root.updateMatrixWorld(true);
  if (t < T.off) {
    const H = headW(); const u = t / T.off;
    const sl = sstep(T.slide, T.off, t);
    c.pos.copy(H).add(new THREE.Vector3(-0.38 + 0.5 * sl, 0.5 + 0.15 * sl, 1.0 - 0.08 * u + 0.5 * sl));
    c.tgt.copy(H).add(new THREE.Vector3(0.02 + 0.25 * sl, -0.03 - 0.3 * sl, 0.04 + 0.2 * sl)); c.fov = 38;
    const sn = Math.exp(-Math.max(0, t - T.sneeze) * 8) * (t > T.sneeze ? 1 : 0); c.pos.y += 0.01 * sn * Math.sin(t * 70);
  } else if (t < T.dive) {
    const cen = CAT.root.position.clone(); c.pos.copy(orbitAt(t, cen)); c.tgt.copy(cen); c.fov = 40;
  } else if (t < T.inner) {
    const u = sstep(T.dive, T.inner, t) ** 1.6; const e = earW(); const cen = CAT.root.position.clone();
    const from = orbitAt(T.dive, cen); const fwd = CAT.head.localToWorld(new THREE.Vector3(0, 0, 0.3)).sub(headW()).normalize();
    const near = e.clone().addScaledVector(fwd, 0.02);
    c.pos.copy(from).lerp(near, u); c.tgt.copy(cen).lerp(e, sstep(0, 0.5, u)); c.fov = mix(40, 30, u);
  } else if (t < T.out) {
    c.inner = true; const u = (t - T.inner) / (T.out - T.inner);
    const back = sstep(0.9, 1.0, u);
    const along = IN.path.getPointAt(Math.min(1, sstep(0, 0.28, u)) * (1 - back * 0.9));
    const look = sstep(0.18, 0.32, u);
    const lp = new THREE.Vector3(0.55, 0.75, 2.75);
    const pl = along.clone().lerp(lp, look * (1 - back));
    const ahead = IN.path.getPointAt(Math.min(1, sstep(0, 0.28, u) + 0.05)).lerp(new THREE.Vector3(0, -0.3, -0.2), look);
    IN.chamber.updateMatrixWorld(true);
    c.pos.copy(IN.chamber.localToWorld(pl)); c.tgt.copy(IN.chamber.localToWorld(ahead)); c.fov = 62;
    c.up = new THREE.Vector3(0, 1, 0).applyQuaternion(IN.chamber.getWorldQuaternion(new THREE.Quaternion()));
  } else if (t < T.swoop) {
    const u = sstep(T.out, T.swoop, t); const e = earW(); const cen = CAT.root.position.clone();
    const away = cen.clone().add(new THREE.Vector3(-0.35, 0.3, 1.7));
    c.pos.copy(e).lerp(away, u); c.tgt.copy(e).lerp(cen, sstep(0, 0.6, u)); c.fov = mix(30, 42, u);
  } else if (t < T.pan) {
    const u = sstep(T.swoop, T_LAND - 0.25, t); const cen = CAT.root.position.clone();
    const a = new THREE.Vector3(-0.35, 3.75, 2.2), b = new THREE.Vector3(-0.7, 0.2, 2.35);
    c.pos.copy(a).lerp(b, u); c.tgt.copy(cen).add(new THREE.Vector3(0, mix(0, 0.05, u), 0)); c.fov = mix(42, 40, u);
    const sh = Math.exp(-Math.max(0, t - T_LAND) * 6) * (t > T_LAND ? 1 : 0); c.pos.y += 0.006 * sh * Math.sin(t * 60);
  } else if (t < T.catWalk) {
    const u = sstep(T.pan, T.pan + 1.6, t);
    const a = new THREE.Vector3(-0.7, 0.2, 2.35), b = new THREE.Vector3(1.25, 1.3, 3.5);
    c.pos.copy(a).lerp(b, u); c.tgt.copy(new THREE.Vector3(0, 0.3, 0.75)).lerp(new THREE.Vector3(2.4, 1.05, 1.3), u); c.fov = 40;
    const v = sstep(T.dogRoll - 0.2, T.dogRoll + 0.9, t);
    c.pos.lerp(new THREE.Vector3(2.05, 0.6, 3.55), v); c.tgt.lerp(new THREE.Vector3(2.35, 0.3, 1.95), v);
  } else {
    const u = sstep(T.catWalk, DUR, t);
    c.pos.set(mix(2.05, 2.15, u), mix(0.6, 0.66, u), mix(3.55, 4.05, u)); c.tgt.set(mix(2.35, 2.3, u), 0.28, mix(1.95, 2.15, u)); c.fov = 40;
  }
  return c;
}

let POST = {};
function setup(t) {
  // cat
  const ca = catAt(t);
  CAT.root.position.copy(ca.pos); CAT.root.rotation.set(ca.rotX, ca.rotY, ca.rotZ, 'YXZ'); poseCat(CAT, ca.pose);
  CAT.root.updateMatrixWorld(true);
  // pup
  const d = dogAt(t);
  DOG.root.position.copy(d.pos); DOG.root.rotation.set(0, d.rotY, 0); DOG.root.rotateZ(d.rotZ);
  for (const k of ['FL', 'FR', 'HL', 'HR']) { DOG.legs[k].sh.rotation.set(d.legs[k].sw, 0, 0); DOG.legs[k].knee.rotation.x = d.legs[k].bend; }
  DOG.eyes.forEach((e) => { e.pupil.scale.set(0.75 * d.eye.size, d.eye.size, 0.4); e.pupil.position.x = (d.eye.look ? d.eye.look[0] : 0) * 0.008; e.pupil.position.y = (d.eye.look ? d.eye.look[1] : 0) * 0.008; });
  DOG.tongue.scale.set(0.9, 0.4, 1.4 * (0.6 + 0.8 * d.tongue)); DOG.tongue.visible = d.tongue > 0.05;
  DOG.head.rotation.set(d.headP, 0, d.headR);
  DOG.stars.visible = d.stars; if (d.stars) { DOG.root.remove(DOG.stars); DOG.head.remove(DOG.stars); scene.add(DOG.stars); DOG.head.updateMatrixWorld(true); DOG.stars.position.copy(DOG.head.localToWorld(new THREE.Vector3(0, 0, 0))).add(new THREE.Vector3(0, 0.2, 0)); DOG.stars.rotation.set(0, t * 3.0, 0); }
  DOG.tail.rotation.x = 0.4 * Math.sin(t * (t > T_LAND && t < T.dogLie ? 14 : 3));
  DOG.root.updateMatrixWorld(true);
  // butterfly
  const nose = CAT.head.localToWorld(new THREE.Vector3(0, 0.005, 0.1));
  const b = butterflyAt(t, nose); BF.g.position.copy(b.p); BF.g.rotation.set(0, b.yaw, 0);
  BF.wings.forEach((w) => { w.piv.rotation.z = w.s * b.flap; });
  // inner world
  if (t >= T.inner - 0.05 && t < T.out + 0.05) poseInner(IN, clamp((t - T.inner) / (T.out - T.inner), 0, 1), t);
  // camera
  const c = camAt(t);
  camera.position.copy(c.pos); camera.up.copy(c.up || new THREE.Vector3(0, 1, 0)); camera.lookAt(c.tgt);
  camera.fov = c.fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  // sun follows the action so shadows stay crisp
  const focus = c.inner ? CAT.root.position : c.tgt;
  sun.target.position.copy(focus); sun.position.copy(focus).add(new THREE.Vector3(3.5, 7, 4.5));
  POST = { bs: 0, bp: new THREE.Vector2(-9, -9), bd: new THREE.Vector2(1, 0), focus: 3, ap: 0, flash: 0, exp: 1.0, haze: 0,
    fade: sstep(0, 0.4, t) * (1 - sstep(T.fade, DUR, t)) };
}
const HIDDEN = () => [];
function subframes(t) { return ((t > T.sneeze - 0.1 && t < T.off + 0.3) || (t > 31.0 && t < 32.6) || (t > T.dogRoll - 0.1 && t < T.dogRoll + 0.9)) ? 2 : 1; }
const SHOTS = [0, T.inner, T.out, DUR];
const shotOf = (t) => (t < T.inner ? 0 : t < T.out ? 1 : 2);

// ---------- post: motion-blur accumulation, depth of field, halation, IMAX grade ----------
const rtScene = new THREE.WebGLRenderTarget(W, HH, { type: THREE.HalfFloatType, depthBuffer: true, samples: 4 });
const rtAcc = new THREE.WebGLRenderTarget(W, HH, { type: THREE.HalfFloatType, depthBuffer: false });
const mk = (w, h) => new THREE.WebGLRenderTarget(Math.max(2, w), Math.max(2, h), { type: THREE.HalfFloatType, depthBuffer: false });
const lw = Math.round(W / 4), lh = Math.round(HH / 4);
const rtDepth = new THREE.WebGLRenderTarget(lw * 2, lh * 2, { type: THREE.HalfFloatType, depthBuffer: true });
const rA = [mk(lw, lh), mk(lw >> 1, lh >> 1), mk(lw >> 2, lh >> 2)], rB = [mk(lw, lh), mk(lw >> 1, lh >> 1), mk(lw >> 2, lh >> 2)];
const dA = [mk(W >> 1, HH >> 1), mk(W >> 2, HH >> 2), mk(W >> 3, HH >> 3)], dB = [mk(W >> 1, HH >> 1), mk(W >> 2, HH >> 2), mk(W >> 3, HH >> 3)];
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); const quadScene = new THREE.Scene(); quadScene.add(quad);
const VQ = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0);} `;
const accMat = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null }, uW: { value: 1 } }, vertexShader: VQ, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false,
  fragmentShader: `uniform sampler2D tSrc; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor=vec4(texture2D(tSrc,vUv).rgb*uW,1.0);} ` });
const brightMat = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null }, uTh: { value: 1.0 } }, vertexShader: VQ,
  fragmentShader: `uniform sampler2D tSrc; uniform float uTh; varying vec2 vUv; void main(){ vec3 c=texture2D(tSrc,vUv).rgb; float l=dot(c,vec3(0.3,0.55,0.15)); gl_FragColor=vec4(c*smoothstep(uTh,uTh+0.8,l),1.0);} ` });
const blurMat = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } }, vertexShader: VQ,
  fragmentShader: `uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv; void main(){ vec3 s=texture2D(tSrc,vUv).rgb*0.2270;
    s+=(texture2D(tSrc,vUv+uDir*1.3846).rgb+texture2D(tSrc,vUv-uDir*1.3846).rgb)*0.3162; s+=(texture2D(tSrc,vUv+uDir*3.2308).rgb+texture2D(tSrc,vUv-uDir*3.2308).rgb)*0.0703; gl_FragColor=vec4(s,1.0);} ` });
const copyMat = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null } }, vertexShader: VQ, fragmentShader: `uniform sampler2D tSrc; varying vec2 vUv; void main(){ gl_FragColor=texture2D(tSrc,vUv);} ` });
const distMat = new THREE.ShaderMaterial({
  vertexShader: `varying float vD; void main(){ vec4 p=vec4(position,1.0);
    #ifdef USE_INSTANCING
      p=instanceMatrix*p;
    #endif
    vec4 mv=modelViewMatrix*p; vD=-mv.z; gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `varying float vD; void main(){ gl_FragColor=vec4(vD,0.0,0.0,1.0); }`, side: THREE.DoubleSide,
});
const finalMat = new THREE.ShaderMaterial({
  uniforms: {
    tScene: { value: null }, tB0: { value: null }, tB1: { value: null }, tB2: { value: null }, tD0: { value: null }, tD1: { value: null }, tD2: { value: null }, tDepth: { value: null },
    uFrame: { value: 0 }, uExp: { value: 1 }, uFlash: { value: 0 }, uFade: { value: 1 }, uHaze: { value: 0 }, uFocus: { value: 8 }, uAp: { value: 0.3 },
    uBP: { value: new THREE.Vector2(-9, -9) }, uBD: { value: new THREE.Vector2(1, 0) }, uBS: { value: 0 }, uWeave: { value: new THREE.Vector2() }, uAsp: { value: W / HH },
  },
  vertexShader: VQ,
  fragmentShader: `uniform sampler2D tScene,tB0,tB1,tB2,tD0,tD1,tD2,tDepth; uniform float uFrame,uExp,uFlash,uFade,uHaze,uBS,uAsp,uFocus,uAp; uniform vec2 uBP,uBD,uWeave; varying vec2 vUv;
  float h12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*0.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
  float coc(vec2 uv){ float z=texture2D(tDepth,uv).r; z=z<=0.0?3000.0:z; return clamp((abs(z-uFocus)/z*uAp-0.04)/0.96,0.0,1.0); }
  void main(){
    vec2 uv=vUv+uWeave;
    // shock cone around the round (screen-space refraction)
    if(uBS>0.0){
      vec2 q=(uv-uBP)*vec2(uAsp,1.0); vec2 d=normalize(uBD*vec2(uAsp,1.0)); vec2 nn=vec2(-d.y,d.x);
      float a=dot(q,d), b=dot(q,nn);
      float cone=abs(abs(b)-(-a)*0.55); float behind=smoothstep(0.0,-0.02,a)*exp(a*4.0);
      float ring=exp(-cone*cone/(0.0004*uBS))*behind;
      float tip=exp(-dot(q,q)/(0.0005*uBS));
      uv+=(nn*sign(b)*ring*0.006+q*tip*0.18)*uBS/vec2(uAsp,1.0);
    }
    // depth of field: sharp frame blended into a blur pyramid by circle of confusion
    float k=coc(uv); vec2 px=vec2(2.0/${(W / 4).toFixed(1)},2.0/${(HH / 4).toFixed(1)});
    k=max(k,0.6*max(max(coc(uv+vec2(px.x,0.0)),coc(uv-vec2(px.x,0.0))),max(coc(uv+vec2(0.0,px.y)),coc(uv-vec2(0.0,px.y)))));
    vec3 c0=texture2D(tScene,uv).rgb, c1=texture2D(tD0,uv).rgb, c2=texture2D(tD1,uv).rgb, c3=texture2D(tD2,uv).rgb;
    vec3 c=k<0.33?mix(c0,c1,k/0.33):(k<0.66?mix(c1,c2,(k-0.33)/0.33):mix(c2,c3,(k-0.66)/0.34));
    // warm halation around bright sources
    vec3 hal=texture2D(tB0,uv).rgb*0.55+texture2D(tB1,uv).rgb*0.8+texture2D(tB2,uv).rgb*1.1;
    c+=hal*vec3(1.0,0.6,0.35)*0.22;
    c+=vec3(0.55,0.42,0.30)*uHaze*(0.6+0.4*vUv.y);
    c=c*uExp+vec3(1.0,0.96,0.9)*uFlash;
    // filmic curve: soft toe, linear mids, the brightest core clips
    c=1.22*c/(1.0+0.32*c);
    c=pow(clamp(c,0.0,1.0),vec3(1.0/2.2));
    float l=dot(c,vec3(0.3,0.55,0.15));
    c=mix(c*vec3(0.92,0.98,1.10),c*vec3(1.05,1.0,0.92),smoothstep(0.25,0.75,l));
    vec2 v=(vUv-0.5)*vec2(1.0,1.15); c*=1.0-0.25*smoothstep(0.35,0.9,length(v)*1.25);
    c*=uFade;
    gl_FragColor=vec4(c,1.0);
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
const SUB = new URLSearchParams(location.search).get('sub');

function render(t) {
  t = clamp(t, 0, DUR - 1e-4);
  const s = shotOf(t), a = SHOTS[s], b = SHOTS[s + 1] - 1e-4;
  const N = SUB ? +SUB : subframes(t);
  let src;
  if (N <= 1) { setup(t); renderer.setRenderTarget(rtScene); renderer.setClearColor(0, 1); renderer.render(scene, camera); src = rtScene.texture; }
  else {
    renderer.setRenderTarget(rtAcc); renderer.setClearColor(0, 1); renderer.clear();
    for (let k = 0; k < N; k++) {
      const ts = clamp(t - 1 / 96 + (k + 0.5) / N / 48, a, b);
      setup(ts); renderer.setRenderTarget(rtScene); renderer.setClearColor(0, 1); renderer.render(scene, camera);
      accMat.uniforms.tSrc.value = rtScene.texture; accMat.uniforms.uW.value = 1 / N; quad.material = accMat;
      renderer.setRenderTarget(rtAcc); renderer.autoClear = false; renderer.render(quadScene, quadCam); renderer.autoClear = true;
    }
    src = rtAcc.texture;
    setup(t); // centre of the shutter for depth and post values
  }
  // depth of meshes only, for the DOF
  const hidden = HIDDEN();
  const vis = hidden.map((o) => o.visible); hidden.forEach((o) => (o.visible = false));
  const fog = scene.fog, bg = scene.environment; scene.fog = null; scene.overrideMaterial = distMat; renderer.shadowMap.enabled = false;
  renderer.setRenderTarget(rtDepth); renderer.setClearColor(0, 1); renderer.render(scene, camera);
  scene.overrideMaterial = null; scene.fog = fog; renderer.shadowMap.enabled = true; hidden.forEach((o, i) => (o.visible = vis[i]));
  // pyramids for halation and DOF
  brightMat.uniforms.uTh.value = 1.0; pyramid(src, rA, rB, brightMat);
  pyramid(src, dA, dB, null);
  const fu = finalMat.uniforms;
  fu.tScene.value = src; fu.tB0.value = rA[0].texture; fu.tB1.value = rA[1].texture; fu.tB2.value = rA[2].texture;
  fu.tD0.value = dA[0].texture; fu.tD1.value = dA[1].texture; fu.tD2.value = dA[2].texture; fu.tDepth.value = rtDepth.texture;
  fu.uBS.value = POST.bs; fu.uBP.value.copy(POST.bp); fu.uBD.value.copy(POST.bd);
  fu.uFocus.value = POST.focus; fu.uAp.value = POST.ap;
  const frame = Math.round(t * 24); fu.uFrame.value = 0;
  fu.uWeave.value.set(0, 0);
  fu.uExp.value = POST.exp; fu.uFlash.value = POST.flash; fu.uHaze.value = POST.haze; fu.uFade.value = POST.fade;
  pass(finalMat, null);
}

window.DUR = DUR; window.EV = EV; window.render = render;
window.grabPNG = (t) => { render(t); return canvas.toDataURL('image/png').split(',')[1]; };
window.grab = (t) => { render(t); return canvas.toDataURL('image/jpeg', 0.95).split(',')[1]; };
render(0);
window.READY = true;
