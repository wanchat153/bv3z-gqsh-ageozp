// Cowboy Bullet — 3D Particle Fireball, IMAX Grain. Every frame is a pure function of t.
import * as THREE from './three.module.js';
import { DUR, T, M, H, PATH1, PATH2, WAGON, bulletS, EV } from './timeline.js';
import { makeCowboy, makeHat, makeRevolver, makeBullet, clamp, mix } from './models.js';
import { buildWorld } from './world.js';
import { buildFx, FBR } from './fx.js';

const W = innerWidth, HH = innerHeight;
const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
const hash1 = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const MV = V(M), HV = V(H), WV = new THREE.Vector3(WAGON[0], 0, WAGON[2]);
const DIR = HV.clone().sub(MV).normalize();
const bulletPos = (t) => MV.clone().addScaledVector(DIR, bulletS(t));

// ---------- renderer ----------
const canvas = document.createElement('canvas');
document.body.style.margin = '0'; document.body.style.background = '#000';
document.body.appendChild(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, HH, false);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x141a2c, 0.0045);
const camera = new THREE.PerspectiveCamera(50, W / HH, 0.005, 3000);

// shared fireball state
const FB = { I: 0, pos: new THREE.Vector3(), te: -1, flash: 0 };
function fireballState(t) {
  const te = t - T.imp; FB.te = te;
  if (te < 0) { FB.I = 0; FB.flash = 0; FB.pos.set(WV.x, 3, WV.z); return; }
  const R = FBR.R0 * (1 - Math.exp(-te * FBR.k)) + FBR.lin * te;
  const rise = Math.max(te - 1.6, 0);
  const Hc = mix(R * 0.45, R * 0.62 + FBR.rise * Math.pow(rise, FBR.riseP), sstep(1.6, 6.5, te));
  FB.pos.set(WV.x, Math.max(2.5, Hc), WV.z);
  FB.flash = te < 0.5 ? Math.exp(-te * 7) : Math.exp(-3.5) * Math.exp(-(te - 0.5) * 4);
  FB.I = 1.0 + 5.0 * FB.flash - 0.35 * sstep(2, 13, te);
}

// ---------- environment light for metals ----------
{
  const es = new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide,
    vertexShader: `varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `varying vec3 vD; void main(){ float y=vD.y; vec3 c=mix(vec3(0.20,0.25,0.42),vec3(0.05,0.07,0.14),smoothstep(0.0,0.7,y));
      c+=vec3(0.5,0.3,0.3)*pow(max(0.0,dot(vD,normalize(vec3(1.0,0.05,0.25)))),8.0); if(y<0.0) c=vec3(0.05,0.04,0.035); gl_FragColor=vec4(c*1.3,1.0);} ` })));
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(es, 0.02).texture; scene.environmentIntensity = 0.22;
}

const world = buildWorld(scene, renderer, FB, WV, DIR, MV);
const PATH_ALL = PATH1 + PATH2 + 1;
const fx = buildFx(scene, WV, MV, DIR, HV, PATH_ALL);

// ---------- lights ----------
const hemi = new THREE.HemisphereLight(0x5466a0, 0x1a140f, 0.55); scene.add(hemi);
const skyKey = new THREE.DirectionalLight(0x8ea0d8, 0.32); skyKey.position.set(-3, 8, 4); scene.add(skyKey);
const fireLight = new THREE.PointLight(0xffd8a0, 0, 0, 1.0); scene.add(fireLight);
const sun = new THREE.DirectionalLight(0xffc890, 0); // the blast as a key from behind: rim + long shadows toward camera
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 9, bottom: -9, near: 1, far: 220 });
scene.add(sun); scene.add(sun.target);
const muzLight = new THREE.PointLight(0xffb070, 0, 0, 2.0); scene.add(muzLight);
const bulKey = new THREE.PointLight(0xc8d4ff, 0, 0, 2.0); scene.add(bulKey);
const lanLight = new THREE.PointLight(0xff9a50, 0, 0, 2.0); lanLight.position.copy(world.lanPos); scene.add(lanLight);
const fillLight = new THREE.DirectionalLight(0xffd8a0, 0); fillLight.position.set(0, 0.2, 8); scene.add(fillLight); scene.add(fillLight.target);

// ---------- cast ----------
const CB = makeCowboy(); scene.add(CB.root);
const hat = makeHat(); scene.add(hat);
const RIM = { value: 0 };
function addRim(m) { if (m.__r) return; m.__r = 1; m.onBeforeCompile = (sh) => { sh.uniforms.uRim = RIM; sh.fragmentShader = 'uniform float uRim;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n float fr = pow(1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 4.0);\n totalEmissiveRadiance += vec3(1.0, 0.72, 0.42) * fr * uRim;'); }; m.customProgramCacheKey = () => 'rim'; }
CB.root.traverse((o) => { if (o.material) addRim(o.material); });
hat.traverse((o) => { if (o.material) addRim(o.material); });
const RV = makeRevolver(); const gun = RV.gun; scene.add(gun);
gun.traverse((o) => { if (o.material && o.material.metalness > 0.5) o.material.envMapIntensity = 4.0; });
gun.position.copy(MV); gun.lookAt(MV.clone().sub(DIR)); // local +z (grip) away from the target, barrel along DIR
const gunQ = gun.quaternion.clone();
const bullet = makeBullet(); scene.add(bullet);
const streak = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 8, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.0, 0.6), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
scene.add(streak);

// ---------- hat path ----------
function hatPose(t) {
  const p = new THREE.Vector3(), e = new THREE.Euler();
  if (t < T.hat) { CB.head.updateMatrixWorld(true); p.set(0, 0.245, -0.005); CB.head.localToWorld(p); e.set(CB.head.rotation.x, 0, CB.head.rotation.z); return { p, e }; }
  const L1 = new THREE.Vector3(-0.35, 0.03, -1.7);
  if (t < T.hat + 1.0) {
    const u = (t - T.hat) / 1.0;
    p.set(mix(0.0, L1.x, u), mix(1.745, L1.y, u) + 1.1 * Math.sin(Math.PI * Math.pow(u, 0.8)) * (1 - u * 0.2), mix(0.0, L1.z, u));
    e.set(-u * 5.2, u * 1.2, -u * 0.6); return { p, e };
  }
  if (t < T.pass - 0.15) { p.copy(L1); e.set(-5.2 + Math.PI * 2, 1.2, -0.6); return { p, e }; }
  const L2 = new THREE.Vector3(-0.8, 0.03, 1.5);
  const u = clamp((t - (T.pass - 0.15)) / (T.hatLand - T.pass + 0.15), 0, 1);
  const w = 1 - Math.pow(1 - u, 1.7), ww = sstep(0, 1, u);
  p.set(mix(L1.x, L2.x, w) + 0.2 * Math.sin(u * 7), mix(L1.y, L2.y, w) + 0.9 * Math.sin(Math.PI * u) * (1 - u * 0.3), mix(L1.z, L2.z, w));
  e.set(mix(1.08, Math.PI * 4, ww), 1.2 + ww * 3.0, -0.6 * (1 - ww) + 1.2 * Math.sin(Math.PI * ww));
  return { p, e };
}

// ---------- shots and camera ----------
const SHOTS = [0, T.cut2, T.cut3, T.cut4, T.imp, DUR];
const shotOf = (t) => { for (let i = SHOTS.length - 2; i >= 0; i--) if (t >= SHOTS[i]) return i; return 0; };
function camAt(t) {
  const c = { pos: new THREE.Vector3(), tgt: new THREE.Vector3(), fov: 50, roll: 0, focus: 8, ap: 0.3 };
  const n = new THREE.Vector3().crossVectors(DIR, new THREE.Vector3(0, 1, 0)).normalize();
  const s = shotOf(t);
  if (s === 0) {
    const u = t / T.cut2;
    c.pos.set(0.22, mix(0.46, 0.5, u), mix(8.6, 7.3, sstep(0, 1, u)));
    c.tgt.set(0, 3.3, -14); c.fov = 52; c.focus = c.pos.z; c.ap = 0.3;
  } else if (s === 1) {
    const b = bulletPos(t); const k = sstep(T.fire + 0.15, T.cut3, t);
    const g0 = MV.clone().addScaledVector(DIR, -0.04).add(new THREE.Vector3(0, -0.02, 0));
    c.tgt.copy(g0).lerp(b.clone().addScaledVector(DIR, 0.011), k);
    c.pos.copy(MV).addScaledVector(DIR, -0.5 + 0.9 * k * k).addScaledVector(n, 0.3 - 0.15 * k).add(new THREE.Vector3(0, 0.07 - 0.05 * k, 0));
    c.fov = 34; c.focus = mix(c.pos.distanceTo(g0), c.pos.distanceTo(b), k); c.ap = 1.1;
  } else if (s === 2) {
    const u = (t - T.cut3) / (T.cut4 - T.cut3); const e = sstep(0.12, 0.78, u);
    const b = bulletPos(t);
    const phi = e * 1.45, R = mix(0.15, 0.30, e);
    const bc = b.clone().addScaledVector(DIR, 0.011);
    c.pos.copy(bc).addScaledVector(n, R * Math.cos(phi)).addScaledVector(DIR, -R * Math.sin(phi)).add(new THREE.Vector3(0, mix(0.008, 0.05, e), 0));
    const want = mix(0.0, 0.13, e); const vb = bc.clone().sub(c.pos).normalize();
    let lo = 0, hi = 60;
    for (let k = 0; k < 30; k++) { const L = (lo + hi) / 2; const vt = bc.clone().addScaledVector(DIR, L).sub(c.pos).normalize(); if (Math.acos(clamp(vb.dot(vt), -1, 1)) < want) lo = L; else hi = L; }
    c.tgt.copy(bc).addScaledVector(DIR, lo);
    c.fov = mix(26, 34, e); c.roll = 0.03 * Math.sin(u * 5.0) * (1 - e);
    // focus on the round, then rack to the cowboy in the last second before the cut
    const dB = c.pos.distanceTo(bc), dC = c.pos.distanceTo(new THREE.Vector3(0, 1.6, 0));
    const rk = sstep(T.cut4 - 0.55, T.cut4 - 0.15, t);
    c.focus = Math.exp(mix(Math.log(dB), Math.log(dC), rk)); c.ap = mix(0.8, 0.42, e);
  } else if (s === 3) {
    const u = (t - T.cut4) / (T.imp - T.cut4);
    c.pos.set(0.36, 0.95, mix(5.8, 5.4, u)); c.tgt.set(0.0, 1.5, 0); c.fov = 36; c.focus = c.pos.length(); c.ap = 0.4;
  } else {
    const u = (t - T.imp) / (DUR - T.imp);
    c.pos.set(0, mix(0.55, 0.68, u), mix(9.6, 6.6, sstep(0, 1, u)));
    c.tgt.set(0, mix(6.4, 7.0, u), -20); c.fov = 50; c.focus = c.pos.z; c.ap = 0.12;
    const s1 = Math.exp(-Math.max(0, t - (T.imp + 0.13)) * 3.0) * (t > T.imp + 0.13 ? 1 : 0) * 0.025;
    const s2 = sstep(T.cam - 1.6, T.cam, t) * Math.exp(-Math.max(0, t - T.cam) * 0.8) * 0.02;
    const sh = s1 + s2; // smooth shake: incommensurate sines, so the subframes blur it
    c.pos.x += sh * Math.sin(t * 61.0) * 0.6; c.pos.y += sh * Math.sin(t * 47.0 + 1.3) * 0.6;
  }
  return c;
}

// ---------- scene state at time t ----------
let POST = {};
function setup(t) {
  fireballState(t);
  const te = FB.te;
  const cam = camAt(t);
  camera.position.copy(cam.pos); camera.up.set(0, 1, 0); camera.lookAt(cam.tgt); camera.rotateZ(cam.roll);
  camera.fov = cam.fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  const scale = HH / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));

  // cowboy: breath, the head tilt as the round arrives, coat and cape in the wind
  const tilt = sstep(T.tilt, T.hat - 0.1, t) * (1 - 0.6 * sstep(T.hat + 0.2, T.hat + 1.5, t));
  CB.head.rotation.set(-0.04 * tilt, 0, 0.16 * tilt);
  CB.head.position.y = 1.5 + 0.003 * Math.sin(t * 2.2);
  const wind = 0.25 + 1.8 * sstep(T.pass - 0.6, T.pass + 0.6, t) * (1 - 0.6 * sstep(T.pass + 2, T.pass + 6, t));
  const tw = t < T.fire ? t : (t < T.imp ? T.fire + (t - T.fire) * 0.03 : t - (T.imp - T.fire) * 0.97); // wind runs slow in bullet time
  for (const [mesh, base, y0] of [[CB.coat, CB.coatBase, 1.25], [CB.cape, CB.capeBase, 1.45]]) {
    const pa = mesh.geometry.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2];
      const low = clamp((y0 - y) / 0.9, 0, 1);
      const f = low * low * 0.045 * wind * (Math.sin(tw * 3.1 + y * 6 + x * 9) * 0.6 + Math.sin(tw * 5.3 + z * 11 + y * 3) * 0.4);
      const blow = low * low * 0.07 * (wind - 0.25);
      const open = z > 0 ? low * 0.03 * (wind - 0.25) * Math.sign(x) : 0;
      pa.setXYZ(i, x + f * 0.4 + open, y + Math.abs(f) * 0.25 + blow * 0.3, z + f + blow);
    }
    pa.needsUpdate = true; mesh.geometry.computeVertexNormals();
  }
  const hp = hatPose(t); hat.position.copy(hp.p); hat.rotation.copy(hp.e);

  // revolver: hammer, cylinder index, slow recoil and muzzle flip
  const cock = sstep(T.cock - 0.05, T.cock + 0.15, t) * (1 - sstep(T.fire - 0.03, T.fire, t));
  RV.hammer.rotation.x = cock * 0.75;
  RV.cylinder.rotation.z = sstep(T.cock - 0.05, T.cock + 0.15, t) * Math.PI / 3;
  gun.visible = t >= T.cut2 - 0.01 && t < T.cut4;
  const rec = sstep(T.fire, T.fire + 1.4, t);
  gun.position.copy(MV).addScaledVector(DIR, -0.012 * rec);
  gun.quaternion.copy(gunQ); gun.rotateX(0.08 * rec);

  // the round
  const s = bulletS(t), bp = bulletPos(t);
  bullet.visible = t >= T.fire && t < T.imp;
  bullet.position.copy(bp); bullet.lookAt(bp.clone().sub(DIR)); bullet.rotateZ(t * 4.0);
  const v = (bulletS(t + 1 / 48) - bulletS(t - 1 / 48)) * 24;
  if (bullet.visible && t >= T.cut4 && v / 24 > 0.06) {
    const a = bulletPos(Math.max(T.fire, t - 1 / 96)); streak.visible = true;
    streak.position.copy(a).add(bp).multiplyScalar(0.5);
    streak.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), DIR); streak.scale.set(1, a.distanceTo(bp), 1);
  } else streak.visible = false;

  bulKey.position.copy(bp).add(new THREE.Vector3(0, 0.12, 0)).addScaledVector(new THREE.Vector3().crossVectors(DIR, new THREE.Vector3(0, 1, 0)).normalize(), 0.08);
  bulKey.intensity = bullet.visible && t < T.cut4 ? 0.04 : 0;
  world.wagon.visible = te < 0.02;
  lanLight.intensity = te < 0 ? 0.9 : 0;

  // lights
  const I = FB.I;
  RIM.value = 0.45 * I;
  fireLight.position.copy(FB.pos); fireLight.intensity = I * 60;
  const toFb = FB.pos.clone().sub(new THREE.Vector3(0, 1, 0)).normalize();
  sun.target.position.set(0, 0.8, 2); sun.position.copy(sun.target.position).addScaledVector(toFb, 90); sun.intensity = I * 2.2;
  sun.castShadow = I > 0.01;
  fillLight.target.position.set(0, 1.4, 0); fillLight.intensity = I * 0.3;
  hemi.groundColor.setRGB(0.10 + 0.12 * I, 0.08 + 0.085 * I, 0.06 + 0.05 * I);
  const tf = t - T.fire;
  muzLight.position.copy(MV).addScaledVector(DIR, 0.08); muzLight.intensity = tf < 0 ? 0 : 0.6 * Math.exp(-tf * 2.4);
  scene.fog.color.setRGB(0.075 + 0.05 * I, 0.09 + 0.03 * I, 0.15 + 0.015 * I);
  world.starMat.opacity = 1 - clamp(I, 0, 1) * 0.9;

  // uniforms
  world.skyMat.uniforms.uFb.value.copy(FB.pos); world.skyMat.uniforms.uI.value = I;
  for (const m of world.cloudMats) m.uniforms.uI.value = I;
  for (const m of [fx.fireMat, fx.smokeMat, fx.embMat, fx.dustMat]) { m.uniforms.uTe.value = te; m.uniforms.uScale.value = scale; m.uniforms.uI.value = 1.0 + 1.2 * FB.flash; }
  fx.dustMat.uniforms.uI.value = I;
  fx.fire.visible = fx.smoke.visible = fx.embers.visible = fx.dust.visible = te >= 0;
  const inBullet = t >= T.cut2 && t < T.imp;
  fx.moteMat.uniforms.uS.value = s; fx.moteMat.uniforms.uScale.value = scale; fx.moteMat.uniforms.uT.value = t; fx.moteMat.uniforms.uA.value = inBullet ? 1 : 0;
  fx.motes.visible = inBullet;
  fx.wakeMat.uniforms.uS.value = s; fx.wakeMat.uniforms.uScale.value = scale; fx.wakeMat.uniforms.uTf.value = tf; fx.wake.visible = t >= T.fire && t < T.imp + 1;
  fx.airMat.uniforms.uT.value = tw; fx.airMat.uniforms.uScale.value = scale; fx.airMat.uniforms.uI.value = I; fx.airMat.uniforms.uFb.value.copy(FB.pos);
  fx.air.visible = t < T.cut2 || t >= T.cut4;
  fx.feltMat.uniforms.uT.value = t - T.hat; fx.feltMat.uniforms.uScale.value = scale; fx.felt.visible = t > T.hat && t < T.hat + 4;

  // values the post pass needs (taken at the centre of the shutter)
  const fu = { bs: 0, bp: new THREE.Vector2(-9, -9), bd: new THREE.Vector2(1, 0) };
  if (t >= T.fire + 0.05 && t < T.cut4) {
    const p0v = bp.clone().project(camera), p1v = bp.clone().addScaledVector(DIR, 0.05).project(camera);
    if (p0v.z < 1 && p1v.z < 1) {
      const p0 = new THREE.Vector2(p0v.x * 0.5 + 0.5, p0v.y * 0.5 + 0.5), p1 = new THREE.Vector2(p1v.x * 0.5 + 0.5, p1v.y * 0.5 + 0.5);
      if (p1.distanceTo(p0) > 1e-4) { fu.bp.copy(p0); fu.bd.copy(p1.sub(p0).normalize()); fu.bs = clamp(0.05 / Math.max(0.05, bp.distanceTo(camera.position)), 0, 1.5) * sstep(T.fire, T.fire + 0.5, t); }
    }
  }
  const dCam = 15.5 * Math.pow(Math.max(te - 0.3, 0), 0.8);
  const camDist = Math.hypot(camera.position.x - WV.x, camera.position.z - WV.z);
  POST = {
    ...fu, focus: cam.focus, ap: cam.ap,
    flash: te >= 0 ? 2.2 * Math.exp(-te * 9) : 0,
    exp: te >= 0 ? 0.95 : 1.45,
    haze: te > 0 ? 0.10 * sstep(camDist - 6, camDist + 2, dCam) * Math.exp(-Math.max(0, dCam - camDist - 2) / 12) : 0,
    fade: sstep(0, 0.6, t) * (1 - sstep(T.fade, DUR, t)),
  };
}

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
    c+=hal*vec3(1.0,0.5,0.28)*0.32;
    c+=vec3(0.55,0.42,0.30)*uHaze*(0.6+0.4*vUv.y);
    c=c*uExp+vec3(1.0,0.96,0.9)*uFlash;
    // filmic curve: soft toe, linear mids, the brightest core clips
    c=1.22*c/(1.0+0.32*c);
    c=pow(clamp(c,0.0,1.0),vec3(1.0/2.2));
    float l=dot(c,vec3(0.3,0.55,0.15));
    c=mix(c*vec3(0.92,0.98,1.10),c*vec3(1.05,1.0,0.92),smoothstep(0.25,0.75,l));
    vec2 v=(vUv-0.5)*vec2(1.0,1.15); c*=1.0-0.5*smoothstep(0.25,0.85,length(v)*1.25);
    // grain ±3 %, fine clumps, stronger in the mids
    vec2 gp=floor(gl_FragCoord.xy/1.5);
    float g=(h12(gp+uFrame*17.31)+h12(gp*1.7+uFrame*3.1)-1.0);
    c*=1.0+0.03*g*(1.2-l*0.4); c+=0.005*g;
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
// subframes per shot (180° shutter): more where things move fast across the frame
function subframes(t) {
  const s = shotOf(t);
  if (s === 0) return 2; if (s === 1) return 4; if (s === 2) return 6; if (s === 3) return 4;
  const te = t - T.imp;
  return (te < 1.2 || (t > T.cam - 1.4 && t < T.cam + 1.0)) ? 2 : 1;
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
  const hidden = [fx.fire, fx.smoke, fx.embers, fx.dust, fx.motes, fx.wake, fx.air, fx.felt, streak];
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
  const frame = Math.round(t * 24); fu.uFrame.value = frame % 997;
  fu.uWeave.value.set((hash1(frame * 0.37) - 0.5) * 0.0008, (hash1(frame * 0.71 + 3) - 0.5) * 0.001);
  fu.uExp.value = POST.exp; fu.uFlash.value = POST.flash; fu.uHaze.value = POST.haze; fu.uFade.value = POST.fade;
  pass(finalMat, null);
}

window.DUR = DUR; window.EV = EV; window.render = render;
window.grabPNG = (t) => { render(t); return canvas.toDataURL('image/png').split(',')[1]; };
window.grab = (t) => { render(t); return canvas.toDataURL('image/jpeg', 0.95).split(',')[1]; };
render(0);
window.READY = true;
