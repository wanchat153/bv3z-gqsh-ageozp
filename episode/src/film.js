// Countdown — 3D Particle Fireball (clean, no grain). Every frame is a pure function of t.
import * as THREE from './three.module.js';
import { DUR, T, PAD, ENG, rocketH, ACC, EV } from './timeline.js';
import { clamp, mix } from './models.js';
import { buildWorld } from './world.js';
import { buildPad, buildSea, makeLaunchBox } from './pad.js';
import { makeSignalman } from './train.js';
import { buildFx, FBR, NOISE } from './fx.js';

const W = innerWidth, HH = innerHeight;
const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
const WV = new THREE.Vector3(PAD[0], 0, PAD[2]);
const EV3 = new THREE.Vector3(...ENG);

const canvas = document.createElement('canvas');
document.body.style.margin = '0'; document.body.style.background = '#000';
document.body.appendChild(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, HH, false);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x141a2c, 0.0006);   // only the faintest air perspective at range
const camera = new THREE.PerspectiveCamera(50, W / HH, 0.02, 6000);

const FB = { I: 0, pos: new THREE.Vector3(), te: -1, flash: 0 };
function fireballState(t) {
  const te = t - T.ign; FB.te = te;
  if (te < 0) { FB.I = 0; FB.flash = 0; FB.pos.set(WV.x, 3, WV.z); return; }
  const R = FBR.R0 * (1 - Math.exp(-te * FBR.k)) + FBR.lin * te;
  const rise = Math.max(te - 1.6, 0);
  const Hc = mix(R * 0.45, R * 0.62 + FBR.rise * Math.pow(rise, FBR.riseP), sstep(1.6, 6.5, te));
  FB.pos.set(WV.x, Math.max(3, Hc), WV.z);
  FB.flash = te < 0.5 ? Math.exp(-te * 7) : Math.exp(-3.5) * Math.exp(-(te - 0.5) * 4);
  FB.I = 1.0 + 4.0 * FB.flash - 0.35 * sstep(3, 16, te);
}
{
  const es = new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide,
    vertexShader: `varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `varying vec3 vD; void main(){ float y=vD.y; vec3 c=mix(vec3(0.22,0.27,0.44),vec3(0.05,0.07,0.14),smoothstep(0.0,0.7,y));
      c+=vec3(0.7,0.4,0.3)*pow(max(0.0,dot(vD,normalize(vec3(1.0,0.05,-0.3)))),6.0); if(y<0.0) c=vec3(0.05,0.045,0.04); gl_FragColor=vec4(c*1.3,1.0);} ` })));
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(es, 0.02).texture; scene.environmentIntensity = 0.3;
}
const world = buildWorld(scene, renderer, FB);
const PADS = buildPad(scene);
const seaMat = buildSea(scene, FB);
const DUMMY = new THREE.Vector3(0, -500, 0);
const fx = buildFx(scene, WV, DUMMY, new THREE.Vector3(0, 0, -1), DUMMY, 10);
fx.motes.visible = fx.wake.visible = fx.felt.visible = fx.air.visible = false;
const NO_EMBERS = true;

// ---------- lights ----------
const hemi = new THREE.HemisphereLight(0x5a6aa8, 0x1a140f, 0.6); scene.add(hemi);
const dawn = new THREE.DirectionalLight(0xffb89a, 0.35); dawn.position.set(400, 60, -150); scene.add(dawn);
const fireLight = new THREE.PointLight(0xffd8a0, 0, 0, 1.0); scene.add(fireLight);
const sun = new THREE.DirectionalLight(0xffc890, 0);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 8, bottom: -8, near: 1, far: 300 });
scene.add(sun); scene.add(sun.target);
const fillLight = new THREE.DirectionalLight(0xffd8a0, 0); fillLight.position.set(0, 0.2, 8); scene.add(fillLight); scene.add(fillLight.target);
// xenon floodlights on the rocket
const floods = [];
for (const [dx, dz] of [[-40, 32], [40, 32], [0, 48]]) {
  const s = new THREE.SpotLight(0xdfe8ff, 1500, 0, 0.13, 0.5, 2.0); s.position.set(PAD[0] + dx, 1.5, PAD[2] + dz); s.target.position.set(PAD[0], 24, PAD[2]); scene.add(s); scene.add(s.target); floods.push(s);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 6.5, 7), fog: false })); lamp.position.copy(s.position); lamp.lookAt(s.target.position); scene.add(lamp);
}
// the engines: a hot point light, a crisp glowing core
const engLight = new THREE.PointLight(0xffc070, 0, 0, 2.0); scene.add(engLight);
const coreMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uA: { value: 0 } },
  vertexShader: `varying vec3 vL; void main(){ vL=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
  fragmentShader: `varying vec3 vL; uniform float uA; void main(){ float u=clamp(0.5-vL.y/1.0,0.0,1.0); float r=length(vL.xz)/(0.5*(1.0-u)+0.02);
    float diamonds=0.75+0.25*cos(u*38.0); float a=uA*exp(-r*r*1.6)*(1.0-u)*diamonds; gl_FragColor=vec4(vec3(1.0,0.86,0.6)*a*3.0+vec3(0.6,0.75,1.0)*a*exp(-u*8.0),1.0);} ` });
const core = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.02, 1, 32, 8, true), coreMat); scene.add(core);

// ---------- cast ----------
const SM = makeSignalman({ hard: true, coat: 0xb8b0a0 }); SM.root.position.copy(EV3); scene.add(SM.root);
SM.arm.rotation.set(2.0, 0, 0.05);
const boxLight = new THREE.PointLight(0xdfe6ff, 0.6, 0, 2.0); boxLight.position.set(0.3, 1.9, 0.9); scene.add(boxLight);
const BOX = makeLaunchBox(); BOX.g.position.set(0.62, 0, 0.35); BOX.g.rotation.y = -0.25; scene.add(BOX.g);
BOX.top.rotation.x = 0.35;
const RIM = { value: 0 };
function addRim(m) { if (m.__r) return; m.__r = 1; m.onBeforeCompile = (sh) => { sh.uniforms.uRim = RIM; sh.fragmentShader = 'uniform float uRim;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n float fr = pow(1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 4.0);\n totalEmissiveRadiance += vec3(1.0, 0.72, 0.42) * fr * uRim;'); }; m.customProgramCacheKey = () => 'rim'; }
SM.root.traverse((o) => { if (o.material) addRim(o.material); });

const mkPts = (n, seed, m) => { const g = new THREE.BufferGeometry(); let a = seed | 0; const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
  const A = new Float32Array(n * 4), B = new Float32Array(n * 4); for (let i = 0; i < n * 4; i++) { A[i] = rnd(); B[i] = rnd(); }
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('aR', new THREE.BufferAttribute(A, 4)); g.setAttribute('aS', new THREE.BufferAttribute(B, 4));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5); const p = new THREE.Points(g, m); p.frustumCulled = false; scene.add(p); return p; };
const SPR = `varying vec4 vC; void main(){ vec2 d=gl_PointCoord-0.5; float r=dot(d,d)*4.0; if(r>1.0) discard; gl_FragColor=vec4(vC.rgb, vC.a*exp(-r*2.6)); }`;
const HFN = `float rh(float t){ return t<${T.lift.toFixed(2)}?0.0:0.5*${ACC.toFixed(1)}*(t-${T.lift.toFixed(2)})*(t-${T.lift.toFixed(2)}); }`;
// exhaust plume: emitted continuously from the bells (periodic, so each particle keeps its own emission time)
const PL = 0.5;
const plumeMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uScale: { value: 1 } },
  vertexShader: `attribute vec4 aR; attribute vec4 aS; uniform float uT,uScale; varying vec4 vC; ${HFN}
  void main(){ float age=mod(uT-aR.x*${PL.toFixed(2)},${PL.toFixed(2)}); float te=uT-age;
    float on=te>${T.ign.toFixed(2)}?1.0:0.0;
    float a0=aR.y*6.2831853; vec3 e=vec3(${PAD[0].toFixed(1)}+cos(a0)*1.3*aR.z, 1.5+rh(te)-0.3, ${PAD[2].toFixed(1)}+sin(a0)*1.3*aR.z);
    float vd=55.0+25.0*aS.x; vec3 p=e+vec3(cos(a0),0.0,sin(a0))*(2.0+6.0*aS.y)*age+vec3(0.0,-vd*age,0.0);
    float under=max(0.0,-p.y+0.5); p.y=max(p.y,0.5); p.x+=sign(cos(a0+0.3))*under*1.4; p.z+=sin(a0)*under*0.4;
    float k=age/${PL.toFixed(2)};
    vec3 col=k<0.25?mix(vec3(1.0,0.95,0.8),vec3(1.0,0.7,0.35),k/0.25):mix(vec3(1.0,0.7,0.35),vec3(0.6,0.25,0.08),(k-0.25)/0.75);
    float a=on*(1.0-k)*0.12;
    vC=vec4(col*2.2,a);
    vec4 mv=modelViewMatrix*vec4(p,1.0);
    gl_PointSize=a<0.003?0.0:clamp((1.5+6.0*k)*uScale/-mv.z,2.0,90.0); gl_Position=projectionMatrix*mv; }`,
  fragmentShader: SPR });
const plume = mkPts(9000, 31, plumeMat);
// the climb's trail: fixed emission times, so it hangs in the sky where it was laid
const trailMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uT: { value: 0 }, uScale: { value: 1 }, uI: { value: 0 } },
  vertexShader: NOISE + `attribute vec4 aR; attribute vec4 aS; uniform float uT,uScale,uI; varying vec4 vC; ${HFN}
  void main(){ float te=${(T.lift + 0.3).toFixed(2)}+pow(aR.x,1.15)*${(DUR - T.lift).toFixed(2)}; float age=uT-te;
    float h=rh(te); vec3 e=vec3(${PAD[0].toFixed(1)}, 1.5+h-6.0, ${PAD[2].toFixed(1)});
    float rad=1.2+2.2*sqrt(max(age,0.0))+0.004*h;
    vec3 q=vec3(aR.y*5.0,h*0.03,age*0.2);
    vec3 p=e+vec3(cos(aR.z*6.2831853),0.0,sin(aR.z*6.2831853))*rad*sqrt(aR.w)+vec3(snoise(q),snoise(q+3.0)*0.5,snoise(q+7.0))*rad*0.7+vec3(2.5*age,0.0,0.6*age);
    float a=age<0.0?0.0:smoothstep(0.0,0.4,age)*0.20*exp(-age/26.0);
    float lit=exp(-age*1.5);
    vec3 col=vec3(0.33,0.36,0.44)+vec3(1.0,0.72,0.42)*lit*1.4+vec3(0.35,0.22,0.18)*max(0.0,cos(aR.z*6.2831853))*0.6;
    vC=vec4(col,a);
    vec4 mv=modelViewMatrix*vec4(p,1.0);
    gl_PointSize=a<0.003?0.0:clamp(rad*1.7*uScale/-mv.z,1.0,80.0); gl_Position=projectionMatrix*mv; }`,
  fragmentShader: SPR });
const trail = mkPts(45000, 47, trailMat);

// ---------- shots and camera ----------
const SHOTS = [0, T.cut2, T.cut3, T.cut4, DUR];
const shotOf = (t) => { for (let i = SHOTS.length - 2; i >= 0; i--) if (t >= SHOTS[i]) return i; return 0; };
function heroCam(c, z, y, ang) { c.pos.set(0, y, z); const D = z - PAD[2]; c.tgt.set(0, y + D * Math.tan(ang), PAD[2]); }
const tmp = new THREE.Vector3();
function camAt(t) {
  const c = { pos: new THREE.Vector3(), tgt: new THREE.Vector3(), fov: 50, roll: 0 };
  const s = shotOf(t);
  if (s === 0) {
    BOX.g.updateMatrixWorld(true); const u = t / T.cut2;
    c.pos.copy(BOX.top.localToWorld(new THREE.Vector3(-0.015 + 0.01 * u, 0.62 - 0.06 * u, 0.42 - 0.05 * u)));
    c.tgt.copy(BOX.top.localToWorld(new THREE.Vector3(-0.015, 0.07, -0.01))); c.fov = 42;
  } else if (s === 1) {
    const u = (t - T.cut2) / (T.cut3 - T.cut2); heroCam(c, mix(9.6, 8.8, sstep(0, 1, u)), 0.6, THREE.MathUtils.degToRad(12));
  } else if (s === 2) {
    const u = (t - T.cut3) / (T.cut4 - T.cut3);
    c.pos.set(PAD[0] + 26, 2.5 + 0.8 * u, PAD[2] + 38); c.tgt.set(PAD[0] + 1, 9 + Math.max(0, rocketH(t)) * 0.8, PAD[2]); c.fov = 40;
    const sh = (t > T.ign ? 0.03 * Math.exp(-(t - T.ign) * 0.8) : 0); c.pos.x += sh * Math.sin(t * 61); c.pos.y += sh * Math.sin(t * 47 + 1.3);
  } else {
    const u = (t - T.cut4) / (DUR - T.cut4);
    const ang = mix(12, 25, sstep(0.3, 0.85, u));
    heroCam(c, mix(9.4, 7.6, sstep(0, 1, u)), mix(0.6, 0.5, u), THREE.MathUtils.degToRad(ang)); c.fov = mix(50, 58, sstep(0.3, 0.85, u));
    const s2 = sstep(T.cam - 1.6, T.cam, t) * Math.exp(-Math.max(0, t - T.cam) * 0.8) * 0.02;
    c.pos.x += s2 * Math.sin(t * 61.0) * 0.6; c.pos.y += s2 * Math.sin(t * 47.0 + 1.3) * 0.6;
  }
  return c;
}

let POST = {};
function setup(t) {
  fireballState(t);
  const te = FB.te, h = rocketH(t);
  // the launch box: guard up, finger down, lights go green
  BOX.guardPiv.rotation.x = -2.1 * sstep(T.cover, T.cover + 0.45, t);
  const reach = sstep(T.press - 0.9, T.press - 0.05, t), push = sstep(T.press - 0.05, T.press + 0.06, t) * (1 - sstep(T.press + 0.35, T.press + 0.6, t));
  BOX.hand.position.set(0.12 * (1 - reach), 0.05 * (1 - reach) - 0.008 * push, 0.0);
  BOX.button.position.y = 0.082 - 0.008 * push;
  BOX.leds.forEach((m, k) => { const g = sstep(T.press + 0.15 + k * 0.14, T.press + 0.2 + k * 0.14, t); m.color.setRGB(mix(2.5, 0.1, g), mix(0.1, 2.6, g), mix(0.05, 0.3, g)); });
  BOX.hand.visible = t < T.cut2;

  const cam = camAt(t);
  camera.position.copy(cam.pos); camera.up.set(0, 1, 0); camera.lookAt(cam.tgt); camera.rotateZ(cam.roll);
  camera.fov = cam.fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  const scale = HH / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));

  // rocket, arms
  PADS.rocket.g.position.y = 1.5 + h;
  PADS.arms.forEach((a, i) => { a.rotation.y = -1.4 * sstep(T.arms + i * 0.2, T.arms + 1.4 + i * 0.2, t); });
  // engines
  const on = t >= T.ign;
  const flick = 0.85 + 0.15 * Math.sin(t * 71) * Math.sin(t * 37.3);
  const bellY = 1.5 + h - 0.3;
  engLight.position.set(PAD[0], bellY - 3, PAD[2]); engLight.intensity = on ? 9000 * flick * sstep(T.ign, T.ign + 0.3, t) : 0;
  const coreLen = on ? mix(4, 30, sstep(T.ign, T.ign + 0.6, t)) * (1 + 0.6 * sstep(T.lift, T.lift + 4, t)) : 0.01;
  core.visible = on; core.scale.set(2.6, coreLen, 2.6); core.position.set(PAD[0], bellY - coreLen / 2, PAD[2]); coreMat.uniforms.uA.value = on ? 1.0 * flick : 0;
  plumeMat.uniforms.uT.value = t; plumeMat.uniforms.uScale.value = scale; plume.visible = on;
  trailMat.uniforms.uT.value = t; trailMat.uniforms.uScale.value = scale; trail.visible = t > T.lift;
  // the engineer tips his head up to follow the climb
  SM.head.rotation.set(-0.55 * sstep(T.look, T.look + 2.5, t), 0, 0);

  // blast lights
  const I = FB.I;
  RIM.value = 0.45 * I;
  fireLight.position.copy(FB.pos); fireLight.intensity = I * 160;
  const src = new THREE.Vector3(PAD[0], Math.max(8, bellY - 6), PAD[2]);
  const toFb = src.clone().sub(new THREE.Vector3(0, 1, 0)).normalize();
  sun.target.position.set(0, 0.8, 2); sun.position.copy(sun.target.position).addScaledVector(toFb, 160); sun.intensity = I * 2.4; sun.castShadow = I > 0.01;
  fillLight.target.position.set(0, 1.4, 0); fillLight.intensity = I * 0.3;
  hemi.groundColor.setRGB(0.10 + 0.12 * I, 0.08 + 0.085 * I, 0.06 + 0.05 * I);
  scene.fog.color.setRGB(0.075 + 0.05 * I, 0.09 + 0.03 * I, 0.15 + 0.015 * I);
  world.starMat.opacity = 0.5 * (1 - clamp(I, 0, 1) * 0.9);
  world.skyMat.uniforms.uFb.value.copy(FB.pos); world.skyMat.uniforms.uI.value = I;
  for (const m of world.cloudMats) m.uniforms.uI.value = I;
  seaMat.uniforms.uI.value = I; seaMat.uniforms.uT.value = t; seaMat.uniforms.uPlume.value.set(PAD[0], bellY - 10, PAD[2]); seaMat.uniforms.uPI.value = on ? 1.5 : 0;
  for (const m of [fx.fireMat, fx.smokeMat, fx.embMat, fx.dustMat]) { m.uniforms.uTe.value = te; m.uniforms.uScale.value = scale; m.uniforms.uI.value = 1.0 + 1.2 * FB.flash; }
  fx.dustMat.uniforms.uI.value = I;
  fx.fire.visible = fx.dust.visible = te >= 0; fx.smoke.visible = fx.embers.visible = false;
  POST = { bs: 0, bp: new THREE.Vector2(-9, -9), bd: new THREE.Vector2(1, 0), focus: 10, ap: 0,
    flash: te >= 0 ? 1.6 * Math.exp(-te * 9) : 0, exp: te >= 0 ? 0.9 : 1.35, haze: 0,
    fade: sstep(0, 0.5, t) * (1 - sstep(T.fade, DUR, t)) };
}
const HIDDEN = () => [fx.fire, fx.smoke, fx.embers, fx.dust, fx.motes, fx.wake, fx.air, fx.felt, plume, trail, core];
function subframes(t) { const s = shotOf(t); if (s === 0) return 1; if (s === 2) return 2; const te = t - T.ign; return (s === 3 && (te < 4.0 || (t > T.cam - 1.4 && t < T.cam + 1.0))) ? 2 : 1; }

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
  const frame = Math.round(t * 24); fu.uFrame.value = frame % 997;
  fu.uWeave.value.set(0, 0);
  fu.uExp.value = POST.exp; fu.uFlash.value = POST.flash; fu.uHaze.value = POST.haze; fu.uFade.value = POST.fade;
  pass(finalMat, null);
}

window.DUR = DUR; window.EV = EV; window.render = render;
window.grabPNG = (t) => { render(t); return canvas.toDataURL('image/png').split(',')[1]; };
window.grab = (t) => { render(t); return canvas.toDataURL('image/jpeg', 0.95).split(',')[1]; };
render(0);
window.READY = true;
