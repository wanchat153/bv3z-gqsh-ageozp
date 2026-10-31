// The launch site: rocket, lattice tower with swing arms, pad and flame trench, lightning masts, water tower, the sea,
// the fence by the engineer, and the launch box he presses.
import * as THREE from './three.module.js';
import { mulberry, mix, limb, mat, LEATHER } from './models.js';
import { PAD } from './timeline.js';

function beams(scene, list, material, parent) {
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, list.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  list.forEach(([a, b, w, d], i) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b); q.setFromUnitVectors(up, B.clone().sub(A).normalize()); s.set(w, A.distanceTo(B), d ?? w); m.compose(A.clone().add(B).multiplyScalar(0.5), q, s); im.setMatrixAt(i, m); });
  im.castShadow = true; im.receiveShadow = true; (parent || scene).add(im); return im;
}

// a white two-stage rocket with black roll bands, four engine bells, fins; origin at the base, +y up
export function makeRocket() {
  const g = new THREE.Group();
  const c = document.createElement('canvas'); c.width = 512; c.height = 512; const x = c.getContext('2d');
  x.fillStyle = '#e9e7e2'; x.fillRect(0, 0, 512, 512);
  x.fillStyle = '#111214'; for (let k = 0; k < 4; k += 2) x.fillRect(k * 128, 380, 128, 132); for (let k = 1; k < 4; k += 2) x.fillRect(k * 128, 0, 128, 60);
  x.fillStyle = 'rgba(0,0,0,0.06)'; for (let k = 0; k < 24; k++) x.fillRect(0, k * 22, 512, 1); for (let k = 0; k < 16; k++) x.fillRect(k * 32, 0, 1, 512);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const white = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45, metalness: 0.05 });
  const plain = new THREE.MeshStandardMaterial({ color: 0xe6e4df, roughness: 0.45 }), black = new THREE.MeshStandardMaterial({ color: 0x121316, roughness: 0.5 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x6a6660, roughness: 0.3, metalness: 0.9, envMapIntensity: 2 });
  const stage = (r, h, y, m) => { const s = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 64), m); s.position.y = y + h / 2; g.add(s); return s; };
  stage(2.0, 28, 2.4, white);
  stage(2.02, 1.4, 30.4, black);
  stage(2.0, 9, 31.8, plain);
  const fp = []; for (let i = 0; i <= 24; i++) { const u = i / 24; fp.push(new THREE.Vector2(2.05 * Math.sqrt(Math.max(0, 1 - Math.pow(u, 1.6))) + 0.02, u * 9.5)); }
  const fair = new THREE.Mesh(new THREE.LatheGeometry(fp, 64), plain); fair.position.y = 40.8; g.add(fair);
  // engine section, bells, fins
  stage(2.1, 1.2, 1.4, black);
  const bp = []; for (let i = 0; i <= 16; i++) { const u = i / 16; bp.push(new THREE.Vector2(0.28 + 0.55 * Math.pow(u, 1.6), -u * 1.7)); }
  const bells = [];
  for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2; const b = new THREE.Mesh(new THREE.LatheGeometry(bp, 32), metal); b.material.side = THREE.DoubleSide; b.position.set(Math.cos(a) * 1.05, 1.5, Math.sin(a) * 1.05); g.add(b); bells.push(b); }
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(1.6, -0.6); s.lineTo(1.6, 1.0); s.lineTo(0, 4.0); s.lineTo(0, 0);
    const f = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: false }), black); f.position.set(Math.cos(a) * 1.95, 1.6, Math.sin(a) * 1.95); f.rotation.y = -a; g.add(f); }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { g, bells };
}

export function buildPad(scene) {
  const out = {};
  const r = mulberry(5150);
  const steel = new THREE.MeshStandardMaterial({ color: 0x8a3a22, roughness: 0.6, metalness: 0.4 });   // red-oxide lattice
  const grey = new THREE.MeshStandardMaterial({ color: 0x5a5a58, roughness: 0.85 });
  const concrete = new THREE.MeshStandardMaterial({ color: 0x6a6864, roughness: 0.95 });
  const [px, , pz] = PAD;
  // pad deck with a flame trench running out to both sides
  const deck = new THREE.Mesh(new THREE.BoxGeometry(46, 3, 40), concrete); deck.position.set(px, 1.5 - 3.0, pz); deck.receiveShadow = true; scene.add(deck);
  const ramp = new THREE.Mesh(new THREE.CylinderGeometry(30, 46, 3, 48), concrete); ramp.position.set(px, -1.5, pz); ramp.receiveShadow = true; scene.add(ramp);
  const mount = new THREE.Mesh(new THREE.BoxGeometry(8, 4.5, 8), grey); mount.position.set(px, -0.75, pz); mount.castShadow = true; mount.receiveShadow = true; scene.add(mount);
  const trench = new THREE.Mesh(new THREE.BoxGeometry(60, 1, 6), new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 1 })); trench.position.set(px, 0.0, pz); scene.add(trench);
  // the rocket stands on the launch mount
  const RK = makeRocket(); RK.g.position.set(px, 1.5, pz); scene.add(RK.g); out.rocket = RK;
  // umbilical tower: a square lattice, 6 m on a side, 62 m tall, just behind the rocket on the right
  const tx = px + 7.5, tz = pz - 1.5, H = 62, list = [];
  const cs = [[-3, -3], [3, -3], [3, 3], [-3, 3]];
  for (const [a, b] of cs) list.push([[tx + a, -1, tz + b], [tx + a, H, tz + b], 0.45]);
  for (let y = 0; y < H; y += 4) {
    for (let k = 0; k < 4; k++) { const [a, b] = cs[k], [c, d] = cs[(k + 1) % 4]; list.push([[tx + a, y, tz + b], [tx + c, y, tz + d], 0.25]); list.push([[tx + a, y, tz + b], [tx + c, y + 4, tz + d], 0.16]); }
  }
  list.push([[tx, H, tz], [tx, H + 14, tz], 0.35]);  // lightning rod mast
  beams(scene, list, steel);
  // service levels: grated floors every 12 m
  for (let y = 10; y < H; y += 12) { const f = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.3, 6.6), grey); f.position.set(tx, y, tz); f.castShadow = true; scene.add(f); }
  // two swing arms reaching to the rocket (they rotate clear at ignition)
  out.arms = [];
  for (const y of [26, 38]) {
    const piv = new THREE.Group(); piv.position.set(tx - 3, y, tz + 1.5); scene.add(piv);
    const arm = []; arm.push([[0, 0, 0], [-3.5, 0, 0], 0.5, 1.2]); arm.push([[0, 1.0, 0], [-3.5, 1.0, 0], 0.18, 0.18]); arm.push([[0, 0, 0], [-3.5, 1.0, 0], 0.12, 0.12]);
    beams(scene, arm, steel, piv); out.arms.push(piv);
  }
  // four lightning masts around the pad with catenary wires to the top of the tower
  const masts = [];
  for (const [mx, mz] of [[-38, -30], [38, -30], [-38, 30], [38, 30]]) { masts.push(new THREE.Vector3(px + mx, 78, pz + mz)); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 78, 12), grey); m.position.set(px + mx, 39, pz + mz); m.castShadow = true; scene.add(m); }
  const wireM = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.5, metalness: 0.6 });
  for (const m of masts) { const a = m.clone(), b = new THREE.Vector3(tx, H + 14, tz); const mid = a.clone().add(b).multiplyScalar(0.5); mid.y -= 6; scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 24, 0.06, 5, false), wireM)); }
  // water tower on the left
  { const wt = new THREE.Group(); wt.position.set(px - 55, 0, pz + 10); scene.add(wt);
    const tank = new THREE.Mesh(new THREE.SphereGeometry(6, 32, 20), new THREE.MeshStandardMaterial({ color: 0xd8d6d0, roughness: 0.5 })); tank.position.y = 34; tank.castShadow = true; wt.add(tank);
    const L = []; for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; L.push([[Math.cos(a) * 7, 0, Math.sin(a) * 7], [Math.cos(a) * 3.5, 30, Math.sin(a) * 3.5], 0.5]); } L.push([[0, 0, 0], [0, 30, 0], 0.8]); beams(scene, L, grey, wt); }
  // the fence the engineer stands at: posts and three taut wires, nothing finer
  const fl = [];
  for (let x = -40; x <= 40; x += 3.5) fl.push([[x, 0, -1.2], [x, 1.35, -1.2], 0.06]);
  beams(scene, fl, new THREE.MeshStandardMaterial({ color: 0x8a8c90, roughness: 0.4, metalness: 0.7 }));
  for (const y of [0.45, 0.85, 1.25]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 80, 4), wireM); w.rotation.z = Math.PI / 2; w.position.set(0, y, -1.2); scene.add(w); }
  return out;
}

// the sea beyond the pad: sky reflected on gentle swell, with the glare of the launch laid on the water
export function buildSea(scene, FB) {
  const m = new THREE.ShaderMaterial({
    uniforms: { uFb: { value: FB.pos }, uI: { value: 0 }, uT: { value: 0 }, uPlume: { value: new THREE.Vector3() }, uPI: { value: 0 } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `varying vec3 vW; uniform vec3 uFb,uPlume; uniform float uI,uT,uPI;
    vec3 sky(vec3 d){ float y=max(d.y,0.0); vec3 top=vec3(0.012,0.018,0.042), mid=vec3(0.045,0.06,0.115), hor=vec3(0.13,0.15,0.23);
      vec3 c=mix(hor,mid,smoothstep(0.0,0.12,y)); c=mix(c,top,smoothstep(0.12,0.7,y));
      float e=max(0.0,dot(normalize(vec3(d.x,0.0,d.z)),normalize(vec3(1.0,0.0,-0.3)))); c+=vec3(0.30,0.16,0.12)*pow(e,5.0)*exp(-y*10.0); return c; }
    void main(){
      vec3 V=normalize(vW-cameraPosition);
      vec2 p=vW.xz;
      vec3 n=normalize(vec3(0.03*sin(p.x*0.21+uT*0.9)+0.02*sin(p.x*0.53-p.y*0.31+uT*1.4)+0.01*sin(p.x*1.7+p.y*1.1+uT*2.3), 1.0, 0.03*sin(p.y*0.19+uT*0.7)+0.02*sin(p.y*0.61+p.x*0.27-uT*1.1)+0.01*sin(p.y*1.9-p.x*0.8+uT*2.1)));
      vec3 R=reflect(V,n); float fres=0.04+0.96*pow(1.0-max(dot(-V,n),0.0),5.0);
      vec3 c=vec3(0.004,0.008,0.014)+sky(R)*fres*1.2;
      vec3 L=normalize(uFb-vW); c+=vec3(1.0,0.6,0.3)*uI*pow(max(dot(R,L),0.0),120.0)*3.0*fres*4.0;
      vec3 Lp=normalize(uPlume-vW); c+=vec3(1.0,0.85,0.6)*uPI*pow(max(dot(R,Lp),0.0),300.0)*4.0*fres*4.0;
      gl_FragColor=vec4(c,1.0); }`,
  });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(6000, 3000, 1, 1), m); sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.6, -1700); scene.add(sea);
  return m;
}

// the launch box on its stand: a guarded red button and a row of status lights
export function makeLaunchBox() {
  const g = new THREE.Group();
  const caseM = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.55, metalness: 0.3 });
  const panel = new THREE.MeshStandardMaterial({ color: 0x1a1b1e, roughness: 0.4, metalness: 0.2 });
  const L = [[[0, 0, 0], [0, 1.0, 0], 0.035], [[0, 0, 0], [0.25, 0, 0.2], 0.03], [[0, 0, 0], [-0.25, 0, 0.2], 0.03], [[0, 0, 0], [0, 0, -0.3], 0.03]];
  beams(null, L, new THREE.MeshStandardMaterial({ color: 0x3a3c40, roughness: 0.4, metalness: 0.7 }), g);
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.3), caseM); box.position.set(0, 1.06, 0); box.rotation.x = 0.35; g.add(box);
  const top = new THREE.Group(); top.position.set(0, 1.06, 0); top.rotation.x = -0.35; g.add(top);
  const pl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.006, 0.26), panel); pl.position.y = 0.062; top.add(pl);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.042, 0.02, 32), new THREE.MeshStandardMaterial({ color: 0xb0b2b6, roughness: 0.25, metalness: 0.95 })); ring.position.set(0.07, 0.072, 0.02); top.add(ring);
  const button = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.032, 0.022, 32), new THREE.MeshStandardMaterial({ color: 0xb01010, roughness: 0.3, emissive: new THREE.Color(0.25, 0.0, 0.0) })); button.position.set(0.07, 0.082, 0.02); top.add(button);
  // hinged clear guard over the button
  const guardPiv = new THREE.Group(); guardPiv.position.set(0.07, 0.075, -0.035); top.add(guardPiv);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.005, 0.075), new THREE.MeshStandardMaterial({ color: 0xffc820, roughness: 0.2, transparent: true, opacity: 0.45, emissive: new THREE.Color(0.08, 0.05, 0.0) })); guard.position.set(0, 0.03, 0.04); guardPiv.add(guard);
  const leds = [];
  for (let k = 0; k < 5; k++) { const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 0.1, 0.05), fog: false }); const l = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.01, 16), m); l.position.set(-0.13, 0.07, -0.08 + k * 0.04); top.add(l); leds.push(m); }
  const sw = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.05), new THREE.MeshStandardMaterial({ color: 0x9a9ca2, roughness: 0.3, metalness: 0.9 })); sw.position.set(-0.05, 0.07, 0.08); top.add(sw);
  // a gloved hand, index finger out
  const glove = mat(0x8a7a5e, 0.75, 0, LEATHER, 0.6);
  const hand = new THREE.Group(); top.add(hand);
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.03, 20, 16), glove); palm.scale.set(1.25, 0.6, 1.0); palm.position.set(0.17, 0.115, 0.025); hand.add(palm);
  hand.add(limb([[0.15, 0.113, 0.025], [0.115, 0.104, 0.022], [0.085, 0.097, 0.02]], [0.0105, 0.0098, 0.009], glove, 10, 12));
  for (let k = 0; k < 3; k++) hand.add(limb([[0.15, 0.112, 0.008 - k * 0.013], [0.135, 0.1, 0.0 - k * 0.013], [0.148, 0.094, 0.004 - k * 0.013]], [0.0105, 0.0098, 0.009], glove, 8, 10));
  hand.add(limb([[0.16, 0.11, 0.045], [0.14, 0.102, 0.055], [0.128, 0.1, 0.05]], [0.011, 0.0105, 0.0095], glove, 8, 10));
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.04, 0.12, 24), mat(0xb8b0a0, 0.85)); cuff.rotation.z = Math.PI / 2 - 0.25; cuff.position.set(0.25, 0.135, 0.025); hand.add(cuff);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { g, top, button, guardPiv, leds, hand };
}
