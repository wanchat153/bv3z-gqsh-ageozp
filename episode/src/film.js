// The Last Train — 3D Particle Fireball, IMAX Grain. Every frame is a pure function of t.
import * as THREE from './three.module.js';
import { DUR, T, V, TRACK_X, SIGNAL, GAP0, BLAST, DYN_OFF, Z0, frontZ, worldT, dist, EV } from './timeline.js';
import { clamp, mix } from './models.js';
import { buildWorld } from './world.js';
import { buildRail, RAIL_Y } from './set.js';
import { makeLoco, poseLoco, makeTender, makeBoxcar, makeSignalman, makeLantern } from './train.js';
import { buildFx, FBR, NOISE } from './fx.js';

const W = innerWidth, HH = innerHeight;
const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
const hash1 = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const WV = new THREE.Vector3(BLAST[0], 0, BLAST[2]);
const SV = new THREE.Vector3(...SIGNAL);

// ---------- renderer ----------
const canvas = document.createElement('canvas');
document.body.style.margin = '0'; document.body.style.background = '#000';
document.body.appendChild(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, HH, false);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x141a2c, 0.004);
const camera = new THREE.PerspectiveCamera(50, W / HH, 0.02, 3000);

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
{
  const es = new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide,
    vertexShader: `varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `varying vec3 vD; void main(){ float y=vD.y; vec3 c=mix(vec3(0.20,0.25,0.42),vec3(0.05,0.07,0.14),smoothstep(0.0,0.7,y));
      c+=vec3(0.5,0.3,0.3)*pow(max(0.0,dot(vD,normalize(vec3(1.0,0.05,0.25)))),8.0); if(y<0.0) c=vec3(0.05,0.04,0.035); gl_FragColor=vec4(c*1.3,1.0);} ` })));
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(es, 0.02).texture; scene.environmentIntensity = 0.22;
}
const world = buildWorld(scene, renderer, FB);
buildRail(scene);
const DUMMY = new THREE.Vector3(0, -500, 0);
const fx = buildFx(scene, WV, DUMMY, new THREE.Vector3(0, 0, -1), DUMMY, 10);
fx.motes.visible = fx.wake.visible = fx.felt.visible = false;

// ---------- lights ----------
const hemi = new THREE.HemisphereLight(0x5466a0, 0x1a140f, 0.55); scene.add(hemi);
const skyKey = new THREE.DirectionalLight(0x8ea0d8, 0.3); skyKey.position.set(-3, 8, 4); scene.add(skyKey);
const fireLight = new THREE.PointLight(0xffd8a0, 0, 0, 1.0); scene.add(fireLight);
const sun = new THREE.DirectionalLight(0xffc890, 0);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 9, bottom: -9, near: 1, far: 220 });
scene.add(sun); scene.add(sun.target);
const fillLight = new THREE.DirectionalLight(0xffd8a0, 0); fillLight.position.set(0, 0.2, 8); scene.add(fillLight); scene.add(fillLight.target);
// the engine's headlamp: a spot with shadows and a visible shaft in the dusty air
const head = new THREE.SpotLight(0xffe2b0, 0, 0, 0.32, 0.6, 2.0); head.castShadow = true; head.shadow.mapSize.set(1024, 1024); head.shadow.bias = -0.0005; head.shadow.camera.near = 1; head.shadow.camera.far = 200; scene.add(head); scene.add(head.target);
const shaftMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uA: { value: 0 } },
  vertexShader: `varying vec3 vL; void main(){ vL=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
  fragmentShader: `varying vec3 vL; uniform float uA; void main(){ float u=clamp(-vL.y/60.0+0.5,0.0,1.0); float r=length(vL.xz)/(0.3+u*20.0); float a=uA*(1.0-u)*(1.0-u)*exp(-r*r*3.0); gl_FragColor=vec4(vec3(1.0,0.86,0.62)*a,1.0);} ` });
const shaft = new THREE.Mesh(new THREE.ConeGeometry(20, 60, 32, 1, true), shaftMat); shaft.geometry.translate(0, 0, 0); scene.add(shaft);
const lanLight = new THREE.PointLight(0xff3018, 0, 0, 2.0); scene.add(lanLight);
const sparkLight = new THREE.PointLight(0xff8a3a, 0, 0, 2.0); scene.add(sparkLight);

// ---------- cast ----------
const SM = makeSignalman(); SM.root.position.copy(SV); scene.add(SM.root);
const LAN = makeLantern(); scene.add(LAN.g);
const RIM = { value: 0 };
function addRim(m) { if (m.__r) return; m.__r = 1; m.onBeforeCompile = (sh) => { sh.uniforms.uRim = RIM; sh.fragmentShader = 'uniform float uRim;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n float fr = pow(1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 4.0);\n totalEmissiveRadiance += vec3(1.0, 0.72, 0.42) * fr * uRim;'); }; m.customProgramCacheKey = () => 'rim'; }
SM.root.traverse((o) => { if (o.material) addRim(o.material); });
const LOCO = makeLoco(), TEN = makeTender(), CAR1 = makeBoxcar('#6a2a1a', 7), CAR2 = makeBoxcar('#4a3a2a', 9);
const CARS = [[LOCO, 0], [TEN, LOCO.length + 0.4], [CAR1, DYN_OFF], [CAR2, DYN_OFF + 10.4]];
for (const [c] of CARS) { scene.add(c.g); c.g.traverse((o) => { if (o.material && o.material.isMeshStandardMaterial) addRim(o.material); }); }

// smoke and steam from the stack, emitted in world time so the trail stays where it was laid
const LIFE = 7.0;
const smokeMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
  uniforms: { uTW: { value: 0 }, uTWend: { value: 1e9 }, uScale: { value: 1 }, uZ0: { value: Z0 }, uI: { value: 0 }, uHead: { value: 0 } },
  vertexShader: NOISE + `attribute vec4 aR; attribute vec4 aS; uniform float uTW,uTWend,uScale,uZ0,uI,uHead; varying vec4 vC;
  void main(){
    float age=mod(uTW-aR.x*${LIFE.toFixed(1)}, ${LIFE.toFixed(1)}); float te=uTW-age;   // emission time (world)
    float de=${V.toFixed(1)}*te;                                                        // distance travelled when emitted
    vec3 e=vec3(${TRACK_X.toFixed(2)}, ${(RAIL_Y + 4.5).toFixed(2)}, uZ0-de+2.25);
    float chuff=pow(0.5+0.5*cos(6.2831853*de/1.257),3.0);
    vec3 v=vec3((aR.y-0.5)*1.2,2.5+2.0*aR.z,(aR.w-0.5)*1.2);
    float k=1.2; float tt=(1.0-exp(-k*age))/k;
    vec3 p=e+v*tt+vec3(0.9*age,0.35*age,0.0);
    float rad=0.25+0.55*age+0.2*chuff;
    vec3 q=p*0.35+vec3(0.0,-age*0.2,0.0);
    p+=vec3(snoise(q),snoise(q+5.0),snoise(q+9.0))*rad*0.9;
    p+=(vec3(aS.x,aS.y,aS.z)-0.5)*rad*1.6;
    float a=(te>uTWend||te<-30.0)?0.0:(0.10+0.35*chuff)*smoothstep(0.0,0.3,age)*(1.0-age/${LIFE.toFixed(1)})*exp(-max(uTW-uTWend,0.0)*2.5);
    float steam=step(0.7,aS.w);
    vec3 col=mix(vec3(0.035,0.035,0.04),vec3(0.20,0.22,0.27),steam)+vec3(1.0,0.75,0.45)*uI*0.08+vec3(1.0,0.9,0.7)*uHead*0.06*exp(-age);
    vC=vec4(col,a*0.5);
    vec4 mv=modelViewMatrix*vec4(p,1.0);
    gl_PointSize=a<0.003?0.0:clamp(rad*1.6*uScale/-mv.z,1.0,90.0);
    gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `varying vec4 vC; void main(){ vec2 d=gl_PointCoord-0.5; float r=dot(d,d)*4.0; if(r>1.0) discard; gl_FragColor=vec4(vC.rgb, vC.a*exp(-r*2.6)); }`,
});
const mkPts = (n, seed, m) => { const g = new THREE.BufferGeometry(); let a = seed | 0; const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
  const A = new Float32Array(n * 4), B = new Float32Array(n * 4); for (let i = 0; i < n * 4; i++) { A[i] = rnd(); B[i] = rnd(); }
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('aR', new THREE.BufferAttribute(A, 4)); g.setAttribute('aS', new THREE.BufferAttribute(B, 4));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5); const p = new THREE.Points(g, m); p.frustumCulled = false; scene.add(p); return p; };
const smoke = mkPts(24000, 991, smokeMat);
// sparks where the driving wheels grind the rails
const SPL = 0.45;
const sparkMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uTW: { value: 0 }, uScale: { value: 1 }, uZ0: { value: Z0 }, uOn0: { value: 0 }, uOn1: { value: 0 } },
  vertexShader: `attribute vec4 aR; attribute vec4 aS; uniform float uTW,uScale,uZ0,uOn0,uOn1; varying vec4 vC;
  void main(){
    float age=mod(uTW-aR.x*${SPL.toFixed(2)}, ${SPL.toFixed(2)}); float te=uTW-age;
    float side=aS.x<0.5?-1.0:1.0; float wz=aS.y<0.5?6.1:8.3;
    vec3 e=vec3(${TRACK_X.toFixed(2)}+side*0.72, ${(RAIL_Y + 0.02).toFixed(2)}, uZ0-${V.toFixed(1)}*te+wz-0.75);
    vec3 v=vec3(side*(0.5+2.5*aR.y), 0.8+3.5*aR.z, -6.0-10.0*aR.w);
    vec3 p=e+v*age+vec3(0.0,-4.9*age*age,0.0); p.y=max(p.y,${(RAIL_Y - 0.25).toFixed(2)});
    float on=clamp((te-uOn0)/0.2,0.0,1.0)*(te<uOn1?1.0:0.0);
    float a=on*(1.0-age/${SPL.toFixed(2)});
    vC=vec4(mix(vec3(1.0,0.85,0.5),vec3(1.0,0.35,0.08),age/${SPL.toFixed(2)})*3.0,a);
    vec4 mv=modelViewMatrix*vec4(p,1.0);
    gl_PointSize=a<0.01?0.0:clamp(0.02*uScale/-mv.z,1.5,9.0);
    gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `varying vec4 vC; void main(){ vec2 d=gl_PointCoord-0.5; float r=dot(d,d)*4.0; if(r>1.0) discard; gl_FragColor=vec4(vC.rgb, vC.a*exp(-r*2.0)); }`,
});
const sparks = mkPts(16000, 773, sparkMat);

// ---------- shots and camera ----------
const SHOTS = [0, T.cut2, T.cut3, T.cut3b, T.cut4, T.imp, DUR];
const shotOf = (t) => { for (let i = SHOTS.length - 2; i >= 0; i--) if (t >= SHOTS[i]) return i; return 0; };
function heroCam(c, z, y, ty) { // low, the signalman centred, looking through him at the blast
  const x = SV.x + (SV.x - WV.x) * (z / -WV.z) * 1.0;
  c.pos.set(x, y, z); const d = new THREE.Vector3(SV.x - x, 0, -z).normalize();
  c.tgt.copy(c.pos).addScaledVector(d, 60); c.tgt.y = ty;
}
function camAt(t) {
  const c = { pos: new THREE.Vector3(), tgt: new THREE.Vector3(), fov: 50, roll: 0, focus: 8, ap: 0.3 };
  const s = shotOf(t);
  if (s === 0) {
    const u = t / T.cut2; heroCam(c, mix(7.6, 6.4, sstep(0, 1, u)), 0.55, 5.0); c.fov = 50; c.focus = c.pos.distanceTo(SV); c.ap = 0.3;
  } else if (s === 1) {
    const u = (t - T.cut2) / (T.cut3 - T.cut2);
    c.pos.set(TRACK_X + 2.35, 0.7 - 0.05 * u, 12.6); c.tgt.set(TRACK_X + 0.2, 2.2, 70); c.fov = 42;
    c.focus = Math.max(1.5, frontZ(t) - 12.6); c.ap = 0.5;
  } else if (s === 2) {
    const zf = frontZ(t);
    c.pos.set(TRACK_X + 2.3, 0.55, zf + 3.2); c.tgt.set(TRACK_X + 0.9, 0.85, zf + 7.4); c.fov = 46;
    c.focus = c.pos.distanceTo(c.tgt); c.ap = 0.5;
    c.pos.y += 0.006 * Math.sin(worldT(t) * 40) + 0.004 * Math.sin(worldT(t) * 63);
  } else if (s === 3) {
    const u = (t - T.cut3b) / (T.cut4 - T.cut3b);
    c.pos.set(SV.x + 1.5, 0.5, -9 - 0.6 * u); c.tgt.set(TRACK_X + 0.6, 1.8, 15); c.fov = 44;
    c.focus = c.pos.distanceTo(SV); c.ap = 0.3;
    const sh = sstep(T.cut3b + 2.5, T.cut3b + 3.2, t) * 0.006; c.pos.y += sh * Math.sin(t * 53); c.pos.x += sh * Math.sin(t * 41);
  } else if (s === 4) {
    const u = (t - T.cut4) / (T.imp - T.cut4);
    c.pos.set(-44, 2.5 - 1.0 * u, mix(-49, -52, u)); c.tgt.set(TRACK_X, -6, -65); c.fov = 60; c.focus = 43; c.ap = 0.15;
  } else {
    const u = (t - T.imp) / (DUR - T.imp);
    heroCam(c, mix(9.6, 6.6, sstep(0, 1, u)), mix(0.55, 0.68, u), mix(6.0, 8.0, u)); c.fov = 50; c.focus = c.pos.distanceTo(SV); c.ap = 0.12;
    const s1 = Math.exp(-Math.max(0, t - (T.imp + 0.22)) * 3.0) * (t > T.imp + 0.22 ? 1 : 0) * 0.025;
    const s2 = sstep(T.cam - 1.6, T.cam, t) * Math.exp(-Math.max(0, t - T.cam) * 0.8) * 0.02;
    const sh = s1 + s2; c.pos.x += sh * Math.sin(t * 61.0) * 0.6; c.pos.y += sh * Math.sin(t * 47.0 + 1.3) * 0.6;
  }
  return c;
}

// ---------- scene state at time t ----------
let POST = {};
const tmp = new THREE.Vector3();
function setup(t) {
  fireballState(t);
  const te = FB.te, tw = worldT(t), d = dist(t), zf = frontZ(t);
  const cam = camAt(t);
  camera.position.copy(cam.pos); camera.up.set(0, 1, 0); camera.lookAt(cam.tgt); camera.rotateZ(cam.roll);
  camera.fov = cam.fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  const scale = HH / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));

  // the train along the line; past the gap each car tips over the edge and drops
  const gone = te >= 0;
  for (const [c, off] of CARS) {
    const zv = zf + off; c.g.visible = !gone;
    const o = GAP0 - zv;
    if (o <= 0) { c.g.position.set(TRACK_X, RAIL_Y, zv); c.g.rotation.set(0, 0, 0); }
    else {
      const L = c.length, th = Math.min(1.35, Math.pow(o / L, 1.2) * 2.0);
      const drop = o > 0.55 * L ? 0.5 * 9.8 * Math.pow((o - 0.55 * L) / V, 2) * 3.0 : 0;
      c.g.position.set(TRACK_X, RAIL_Y - o * Math.sin(th) - drop, GAP0 - o * Math.cos(th));
      c.g.rotation.set(-th, 0, 0);
    }
    if (c === LOCO) poseLoco(LOCO, d); else for (const { w, r } of c.wheels) w.rotation.x = -d / r;
  }
  // headlamp
  const hp = new THREE.Vector3(TRACK_X, RAIL_Y + 3.5, zf + 1.4);
  head.position.copy(hp); head.target.position.copy(hp).add(new THREE.Vector3(0, -1.2, -40)).applyAxisAngle(new THREE.Vector3(1, 0, 0), 0);
  if (LOCO.g.rotation.x !== 0) { head.target.position.copy(hp).add(new THREE.Vector3(0, -30, -10)); }
  head.intensity = gone ? 0 : 2600; head.visible = !gone;
  shaft.visible = !gone; shaft.position.copy(hp).add(new THREE.Vector3(0, 0, -30)); shaft.rotation.set(Math.PI / 2 - 0.03, 0, 0);
  shaftMat.uniforms.uA.value = gone ? 0 : 0.05;

  // the signalman: waving the lantern, then holding it up through the blast, then lowering it
  const wave = (1 - sstep(T.imp - 0.3, T.imp + 0.6, t));
  const swing = 0.32 * Math.sin(tw * 2 * Math.PI * 0.75) * wave;
  const lowerA = 2.0 * sstep(T.lower, T.lower + 1.6, t);
  SM.arm.rotation.set(lowerA, 0.15 * swing, swing);
  SM.head.rotation.set(-0.03, 0.04 * Math.sin(tw * 0.7), 0);
  { const pa = SM.coat.geometry.attributes.position, base = SM.coatBase;
    const wind = 0.25 + 1.8 * sstep(T.pass - 0.6, T.pass + 0.6, t) * (1 - 0.6 * sstep(T.pass + 2, T.pass + 6, t));
    const tw2 = t < T.slow ? t : (t < T.imp ? tw + (T.slow - worldT(T.slow)) : t - (T.imp - worldT(T.imp)) + 0);
    for (let i = 0; i < pa.count; i++) { const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2]; const low = clamp((1.25 - y) / 0.9, 0, 1);
      const f = low * low * 0.045 * wind * (Math.sin(tw2 * 3.1 + y * 6 + x * 9) * 0.6 + Math.sin(tw2 * 5.3 + z * 11 + y * 3) * 0.4); const blow = low * low * 0.07 * (wind - 0.25);
      pa.setXYZ(i, x + f * 0.4, y + Math.abs(f) * 0.25 + blow * 0.3, z + f + blow); }
    pa.needsUpdate = true; SM.coat.geometry.computeVertexNormals(); }
  SM.root.updateMatrixWorld(true);
  SM.hand.getWorldPosition(tmp); LAN.g.position.copy(tmp);
  const swingVel = 0.32 * Math.cos(tw * 2 * Math.PI * 0.75) * wave;
  LAN.g.rotation.set(0.1 * Math.sin(tw * 2.9) * wave, 0, -0.5 * swingVel + 0.25 * swing);
  LAN.g.updateMatrixWorld(true);
  lanLight.position.copy(LAN.globe ? LAN.globe : tmp.set(LAN.g.position.x, LAN.g.position.y - 0.32, LAN.g.position.z)); lanLight.intensity = 0.25 * (0.92 + 0.08 * Math.sin(t * 23) * Math.sin(t * 7.1));

  // sparks light the wheels from below, flickering
  { const on = t > T.slow - 0.3 && t < T.plunge && !gone; sparkLight.position.set(TRACK_X + 0.9, RAIL_Y + 0.15, zf + 7.0); sparkLight.intensity = on ? 0.9 * (0.6 + 0.4 * Math.sin(tw * 97) * Math.sin(tw * 61)) : 0; }
  // blast lights
  const I = FB.I;
  RIM.value = 0.45 * I;
  fireLight.position.copy(FB.pos); fireLight.intensity = I * 70;
  const toFb = FB.pos.clone().sub(new THREE.Vector3(SV.x, 1, SV.z)).normalize();
  sun.target.position.set(SV.x, 0.8, 2); sun.position.copy(sun.target.position).addScaledVector(toFb, 90); sun.intensity = I * 2.2; sun.castShadow = I > 0.01;
  fillLight.target.position.set(SV.x, 1.4, 0); fillLight.intensity = I * 0.3;
  hemi.groundColor.setRGB(0.10 + 0.12 * I, 0.08 + 0.085 * I, 0.06 + 0.05 * I);
  scene.fog.color.setRGB(0.075 + 0.05 * I, 0.09 + 0.03 * I, 0.15 + 0.015 * I);
  world.starMat.opacity = 1 - clamp(I, 0, 1) * 0.9;
  world.skyMat.uniforms.uFb.value.copy(FB.pos); world.skyMat.uniforms.uI.value = I;
  for (const m of world.cloudMats) m.uniforms.uI.value = I;
  for (const m of [fx.fireMat, fx.smokeMat, fx.embMat, fx.dustMat]) { m.uniforms.uTe.value = te; m.uniforms.uScale.value = scale; m.uniforms.uI.value = 1.0 + 1.2 * FB.flash; }
  fx.dustMat.uniforms.uI.value = I;
  fx.fire.visible = fx.smoke.visible = fx.embers.visible = fx.dust.visible = te >= 0;
  fx.airMat.uniforms.uT.value = t; fx.airMat.uniforms.uScale.value = scale; fx.airMat.uniforms.uI.value = I; fx.airMat.uniforms.uFb.value.copy(FB.pos);
  fx.air.position.set(SV.x, 0, 0);
  const twImp = worldT(T.imp);
  smokeMat.uniforms.uTW.value = tw; smokeMat.uniforms.uTWend.value = twImp; smokeMat.uniforms.uScale.value = scale; smokeMat.uniforms.uI.value = I; smokeMat.uniforms.uHead.value = gone ? 0 : 1;
  sparkMat.uniforms.uTW.value = tw; sparkMat.uniforms.uScale.value = scale; sparkMat.uniforms.uOn0.value = worldT(T.slow - 0.4); sparkMat.uniforms.uOn1.value = worldT(T.plunge);

  const dCam = 15.5 * Math.pow(Math.max(te - 0.3, 0), 0.8);
  const camDist = Math.hypot(camera.position.x - WV.x, camera.position.z - WV.z);
  POST = {
    bs: 0, bp: new THREE.Vector2(-9, -9), bd: new THREE.Vector2(1, 0), focus: cam.focus, ap: cam.ap,
    flash: te >= 0 ? 2.2 * Math.exp(-te * 9) : 0,
    exp: te >= 0 ? 0.95 : 1.45,
    haze: te > 0 ? 0.10 * sstep(camDist - 6, camDist + 2, dCam) * Math.exp(-Math.max(0, dCam - camDist - 2) / 12) : 0,
    fade: sstep(0, 0.6, t) * (1 - sstep(T.fade, DUR, t)),
  };
}
const HIDDEN = () => [fx.fire, fx.smoke, fx.embers, fx.dust, fx.motes, fx.wake, fx.air, fx.felt, smoke, sparks, shaft];
function subframes(t) {
  const s = shotOf(t);
  if (s === 0) return 2; if (s === 1) return 4; if (s === 2) return 5; if (s === 3) return 4; if (s === 4) return 3;
  const te = t - T.imp;
  return (te < 1.2 || (t > T.cam - 1.4 && t < T.cam + 1.0)) ? 2 : 1;
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
