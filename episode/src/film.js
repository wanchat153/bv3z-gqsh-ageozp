// Cowboy Bullet — 3D Particle Fireball, IMAX Grain. Every frame is a pure function of t.
import * as THREE from './three.module.js';
import { DUR, T, M, H, PATH1, WAGON, bulletS, EV } from './timeline.js';

const W = innerWidth, HH = innerHeight;
const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
const mix = (a, b, u) => a + (b - a) * u;
function mulberry(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
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
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.autoClear = true;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, W / HH, 0.01, 3000);

// ---------- GLSL helpers ----------
const NOISE = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+10.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 105.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;
const VNOISE = /* glsl */`
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float s=0.0,a=0.5;for(int i=0;i<5;i++){s+=a*vn(p);p=p*2.03+vec2(1.7,9.2);a*=0.5;}return s;}`;

// shared fireball light (world) and strength
const FB = { I: 0, pos: new THREE.Vector3(), te: -1, flash: 0 };
function fireballState(t) {
  const te = t - T.imp;
  FB.te = te;
  if (te < 0) { FB.I = 0; FB.flash = 0; FB.pos.set(WV.x, 3, WV.z); return; }
  const R = 10.5 * (1 - Math.exp(-te * 2.4)) + 0.5 * te;
  const rise = Math.max(te - 1.6, 0);
  const Hc = mix(R * 0.45, R * 0.62 + 1.0 * Math.pow(rise, 1.1), sstep(1.6, 6.5, te));
  FB.pos.set(WV.x, Math.max(2.5, Hc), WV.z);
  FB.flash = te < 0.5 ? Math.exp(-te * 7) : Math.exp(-3.5) * Math.exp(-(te - 0.5) * 4);
  FB.I = 1.0 + 5.0 * FB.flash - 0.38 * sstep(2, 13, te);
}

// ---------- sky ----------
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  uniforms: { uFb: { value: new THREE.Vector3() }, uI: { value: 0 } },
  vertexShader: `varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
  fragmentShader: `varying vec3 vD; uniform vec3 uFb; uniform float uI;
  void main(){ float y=vD.y;
    vec3 top=vec3(0.020,0.028,0.060), hor=vec3(0.090,0.115,0.200);
    vec3 c=mix(hor,top,smoothstep(0.0,0.55,y));
    // the faint first light low in the east (+x)
    c+=vec3(0.11,0.09,0.10)*pow(max(0.0,dot(vD,normalize(vec3(1.0,0.02,0.15)))),18.0)*smoothstep(-0.05,0.08,y)*0.6;
    vec3 fd=normalize(uFb-cameraPosition); float a=max(0.0,dot(vD,fd));
    c+=uI*(vec3(1.0,0.55,0.25)*pow(a,40.0)*0.9+vec3(1.0,0.62,0.32)*pow(a,12.0)*0.07);
    if(y<0.0) c=mix(c,vec3(0.02,0.018,0.016),smoothstep(0.0,-0.02,y));
    gl_FragColor=vec4(c,1.0);} `,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 24), skyMat);
sky.frustumCulled = false; scene.add(sky);

// distant mesas (silhouettes)
{
  const r = mulberry(7);
  const mk = (z, x0, x1, hmax, col) => {
    const s = new THREE.Shape(); s.moveTo(x0, -5);
    let h = 0, tgt = 0; for (let x = x0; x <= x1; x += 5) { if (r() < 0.025) tgt = r() < 0.45 ? hmax * (0.35 + 0.65 * r()) : hmax * 0.08 * r(); h += (tgt - h) * (Math.abs(tgt - h) > hmax * 0.3 ? 0.35 : 0.08) + (r() - 0.5) * 1.2; h = Math.max(0, h); s.lineTo(x, h); }
    s.lineTo(x1, -5);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color: col }));
    m.position.z = z; scene.add(m); return m;
  };
  mk(-1100, -1400, 1400, 55, new THREE.Color(0.045, 0.052, 0.085));
  mk(-700, -900, 900, 22, new THREE.Color(0.026, 0.028, 0.042));
  const back = mk(900, -1200, 1200, 40, new THREE.Color(0.045, 0.052, 0.085)); back.rotation.y = Math.PI;
}

// clouds
const cloudMats = [];
{
  const r = mulberry(11);
  for (let i = 0; i < 9; i++) {
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uFb: { value: FB.pos }, uI: { value: 0 }, uSeed: { value: r() * 50 } },
      vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
      fragmentShader: VNOISE + `varying vec2 vUv; varying vec3 vW; uniform vec3 uFb; uniform float uI; uniform float uSeed;
      void main(){ vec2 p=vUv*vec2(5.0,2.0)+uSeed; float n=fbm(p)+0.5*fbm(p*2.7);
        float e=smoothstep(0.0,0.25,vUv.x)*smoothstep(1.0,0.75,vUv.x)*smoothstep(0.0,0.35,vUv.y)*smoothstep(1.0,0.6,vUv.y);
        float a=smoothstep(0.62,1.05,n)*e;
        float under=1.0-vUv.y;
        float d=distance(vW,uFb); float lit=uI*1.1/(1.0+pow(d/90.0,2.0));
        vec3 base=vec3(0.035,0.045,0.080)*(0.8+0.4*n);
        vec3 c=base+vec3(1.0,0.78,0.52)*lit*(0.35+0.9*under)*(0.6+0.6*n);
        gl_FragColor=vec4(c,a*0.85); }`,
    });
    cloudMats.push(mat);
    const w = 90 + r() * 120, h = 26 + r() * 20;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(-160 + r() * 320, 45 + r() * 45, -60 - r() * 180);
    m.lookAt(0, 0, 40); m.rotateX(-0.9);
    scene.add(m);
  }
}

// ---------- ground ----------
const groundMat = new THREE.ShaderMaterial({
  uniforms: { uFb: { value: FB.pos }, uI: { value: 0 }, uLan: { value: 1 }, uLanPos: { value: new THREE.Vector3(WV.x + 0.9, 1.7, WV.z + 1.0) } },
  vertexShader: `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragmentShader: VNOISE + `varying vec3 vW; uniform vec3 uFb; uniform float uI; uniform float uLan; uniform vec3 uLanPos;
  // shadow of the cowboy (vertical capsule at the origin) from a point light L
  float capShadow(vec3 P, vec3 L){
    vec3 d=L-P; float t=-(P.x*d.x+P.z*d.z)/max(1e-4,d.x*d.x+d.z*d.z); t=clamp(t,0.0,1.0);
    vec3 q=P+d*t; float hy=q.y; float r=hy<0.35?0.20:(hy<1.45?mix(0.36,0.22,(hy-0.35)/1.1):(hy<1.62?0.16:(hy<1.86?0.24:0.0)));
    float dist=length(q.xz); return (hy>0.0&&hy<1.86)?1.0-smoothstep(r*0.8,r*1.15,dist):0.0; }
  void main(){
    vec2 p=vW.xz; float n=fbm(p*0.35); float n2=fbm(p*2.2); float n3=vn(p*9.0);
    vec3 base=vec3(0.086,0.070,0.055)*(0.7+0.5*n)*(0.8+0.35*n2);
    base*=0.85+0.3*n3;
    // ruts of an old wagon track toward the camera
    float rut=smoothstep(0.10,0.0,abs(abs(vW.x-0.6-0.004*vW.z*vW.z*0.0)-0.75))*0.25; base*=1.0-rut;
    // fake bump normal for grazing light
    float e=0.08; float hx=fbm((p+vec2(e,0.0))*2.2)-n2, hz=fbm((p+vec2(0.0,e))*2.2)-n2;
    vec3 N=normalize(vec3(-hx*3.0,1.0,-hz*3.0));
    vec3 amb=vec3(0.16,0.20,0.34)*0.55;
    vec3 L=uFb-vW; float dl=length(L); vec3 Ld=L/dl;
    float fall=1.0/(1.0+pow(dl/48.0,2.0));
    float sh=capShadow(vW,uFb);
    vec3 warm=vec3(1.0,0.847,0.627);
    float lam=max(0.0,dot(N,Ld))*0.75+0.25;
    vec3 c=base*(amb+warm*uI*fall*lam*2.6*(1.0-0.92*sh));
    vec3 Lt=uLanPos-vW; c+=base*vec3(1.0,0.6,0.3)*uLan*0.9/(1.0+dot(Lt,Lt)*0.6);
    // distance haze
    float fd=1.0-exp(-length(vW-cameraPosition)/420.0);
    c=mix(c,vec3(0.07,0.085,0.14)+vec3(0.5,0.32,0.18)*uI*0.15,fd);
    gl_FragColor=vec4(c,1.0);} `,
});
const ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), groundMat);
ground.rotation.x = -Math.PI / 2; scene.add(ground);

// ---------- lights for meshes ----------
const hemi = new THREE.HemisphereLight(0x4a5a8a, 0x1a140f, 0.9); scene.add(hemi);
const fireLight = new THREE.PointLight(0xffd8a0, 0, 0, 1.0); scene.add(fireLight);
const rimLight = new THREE.DirectionalLight(0xffc890, 0); scene.add(rimLight); scene.add(rimLight.target);
const muzLight = new THREE.PointLight(0xffb070, 0, 0, 2.0); scene.add(muzLight);
const lanLight = new THREE.PointLight(0xff9a50, 0.0, 0, 2.0); scene.add(lanLight);
const fillLight = new THREE.DirectionalLight(0xffd8a0, 0); scene.add(fillLight); scene.add(fillLight.target);

{
  const es = new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide,
    vertexShader: `varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `varying vec3 vD; void main(){ float y=vD.y; vec3 c=mix(vec3(0.20,0.25,0.42),vec3(0.05,0.07,0.14),smoothstep(0.0,0.7,y)); if(y<0.0) c=vec3(0.05,0.04,0.035); gl_FragColor=vec4(c*1.4,1.0);} ` })));
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(es, 0.02).texture; scene.environmentIntensity = 1.0;
}
const skyKey = new THREE.DirectionalLight(0x8ea0d8, 0.35); skyKey.position.set(-3, 8, 4); scene.add(skyKey);
const std = (c, rough = 0.85, metal = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal });

// ---------- cowboy ----------
const cowboy = new THREE.Group(); scene.add(cowboy);
const coatMat = std(0x3a2c22, 0.9), darkMat = std(0x1c1612, 0.9), skinMat = std(0x3a281e, 0.8), hatMat = std(0x2e241c, 0.95), denim = std(0x222a38, 0.9);
const cap = (r, a, b, mat) => { const A = V(a), B = V(b); const len = A.distanceTo(B); const g = new THREE.CapsuleGeometry(r, len, 6, 14); const m = new THREE.Mesh(g, mat); m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); return m; };
let coat, coatBase, head, hatOn;
{
  // legs, boots
  for (const s of [-1, 1]) {
    cowboy.add(cap(0.075, [s * 0.13, 0.12, 0], [s * 0.12, 0.92, 0], denim));
    const boot = cap(0.07, [s * 0.13, 0.06, -0.04], [s * 0.13, 0.06, 0.12], darkMat); cowboy.add(boot);
    cowboy.add(cap(0.075, [s * 0.13, 0.08, 0], [s * 0.13, 0.32, 0], darkMat));
  }
  cowboy.add(cap(0.17, [0, 0.98, 0], [0, 1.38, 0], std(0x4a3a2c, 0.9)));            // torso (vest)
  cowboy.add(cap(0.10, [-0.16, 1.43, 0], [0.16, 1.43, 0], coatMat));                 // shoulders
  // belt + holster + revolver grip
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 8, 24), darkMat); belt.rotation.x = Math.PI / 2; belt.position.y = 0.92; cowboy.add(belt);
  cowboy.add(cap(0.04, [0.27, 0.72, 0.02], [0.27, 0.9, 0.02], darkMat));
  cowboy.add(cap(0.022, [0.27, 0.9, 0.03], [0.28, 0.98, -0.02], std(0x3a2a1c, 0.6)));
  // arms (coat sleeves) hanging, the right hand by the holster
  cowboy.add(cap(0.06, [-0.25, 1.4, 0], [-0.3, 1.12, 0.02], coatMat));
  cowboy.add(cap(0.055, [-0.3, 1.12, 0.02], [-0.31, 0.88, 0.06], coatMat));
  cowboy.add(cap(0.045, [-0.31, 0.88, 0.06], [-0.31, 0.8, 0.07], darkMat));
  cowboy.add(cap(0.06, [0.25, 1.4, 0], [0.31, 1.13, 0.0], coatMat));
  cowboy.add(cap(0.055, [0.31, 1.13, 0.0], [0.33, 0.93, 0.08], coatMat));
  cowboy.add(cap(0.045, [0.33, 0.93, 0.08], [0.32, 0.87, 0.1], darkMat));
  // duster coat: a lathe opened at the front
  const prof = [];
  for (let i = 0; i <= 14; i++) { const u = i / 14; const y = mix(1.47, 0.32, u); const rr = mix(0.2, 0.42, Math.pow(u, 0.8)) + 0.03 * Math.sin(u * 3); prof.push(new THREE.Vector2(rr, y)); }
  const cg = new THREE.LatheGeometry(prof, 48, Math.PI / 2 + 0.42, Math.PI * 2 - 0.84);
  coat = new THREE.Mesh(cg, std(0x3a2c22, 0.92)); coat.material.side = THREE.DoubleSide; cowboy.add(coat);
  coatBase = Float32Array.from(cg.attributes.position.array);
  // head, neck, bandana
  head = new THREE.Group(); head.position.set(0, 1.5, 0); cowboy.add(head);
  head.add(cap(0.055, [0, 0.0, 0], [0, 0.1, 0], skinMat));
  const hd = new THREE.Mesh(new THREE.SphereGeometry(0.105, 24, 18), skinMat); hd.scale.set(0.92, 1.12, 1.0); hd.position.y = 0.17; head.add(hd);
  const ban = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.12, 20, 1, true), std(0x5a1e18, 0.9)); ban.position.set(0, 0.05, 0.02); ban.rotation.x = Math.PI; head.add(ban);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), skinMat); jaw.position.set(0, 0.1, 0.035); head.add(jaw);
}
function makeHat() {
  const g = new THREE.Group();
  const crown = [];
  for (let i = 0; i <= 10; i++) { const u = i / 10; crown.push(new THREE.Vector2(0.1 - 0.025 * u * u + (u > 0.85 ? -0.04 * (u - 0.85) / 0.15 : 0), u * 0.14)); }
  crown.push(new THREE.Vector2(0.0, 0.125));
  const c = new THREE.Mesh(new THREE.LatheGeometry(crown, 32), hatMat); c.material.side = THREE.DoubleSide; g.add(c);
  const bg = new THREE.RingGeometry(0.09, 0.235, 48, 2); const pa = bg.attributes.position;
  for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i); const r = Math.hypot(x, y); const a = Math.atan2(y, x); const up = Math.pow(clamp((r - 0.14) / 0.1, 0, 1), 2) * 0.055 * Math.pow(Math.abs(Math.cos(a)), 1.5); pa.setZ(i, up - (r - 0.09) * 0.05 * Math.abs(Math.sin(a))); }
  bg.computeVertexNormals();
  const b = new THREE.Mesh(bg, hatMat); b.material.side = THREE.DoubleSide; b.rotation.x = -Math.PI / 2; g.add(b);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.101, 0.101, 0.022, 32, 1, true), std(0x15100c, 0.8)); band.position.y = 0.02; g.add(band);
  return g;
}
const hat = makeHat(); scene.add(hat);
const RIM = { value: 0 };
function addRim(m) { m.onBeforeCompile = (sh) => { sh.uniforms.uRim = RIM; sh.fragmentShader = 'uniform float uRim;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n float fr = pow(1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 4.0);\n totalEmissiveRadiance += vec3(1.0, 0.72, 0.42) * fr * uRim;'); }; m.customProgramCacheKey = () => 'rim'; }
cowboy.traverse((o) => { if (o.material && !o.material.__r) { addRim(o.material); o.material.__r = 1; } });
hat.traverse((o) => { if (o.material && !o.material.__r) { addRim(o.material); o.material.__r = 1; } });

// ---------- wagon with dynamite crates ----------
const wagon = new THREE.Group(); wagon.position.copy(WV); wagon.rotation.y = 0.35; scene.add(wagon);
{
  const wood = std(0x3a2a1c, 0.95), crate = std(0x5a4228, 0.9), iron = std(0x1a1a1a, 0.6, 0.5);
  const box = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); wagon.add(b); return b; };
  box(1.7, 0.12, 3.4, 0, 0.95, 0, wood); box(0.08, 0.45, 3.4, -0.85, 1.2, 0, wood); box(0.08, 0.45, 3.4, 0.85, 1.2, 0, wood);
  for (const [x, z] of [[-0.95, -1.2], [0.95, -1.2], [-0.95, 1.2], [0.95, 1.2]]) {
    const wh = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.04, 8, 28), iron); wh.position.set(x, 0.52, z); wh.rotation.y = Math.PI / 2; wagon.add(wh);
    for (let k = 0; k < 6; k++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.95, 0.03), wood); s.position.set(x, 0.52, z); s.rotation.x = k * Math.PI / 6; wagon.add(s); }
  }
  const r = mulberry(3);
  for (let i = 0; i < 9; i++) box(0.62, 0.4, 0.45, (i % 2 ? 0.34 : -0.34) + (r() - 0.5) * 0.06, 1.21 + Math.floor(i / 4) * 0.4, -1.2 + (i % 4) * 0.65, crate).rotation.y = (r() - 0.5) * 0.15;
  box(0.06, 1.2, 0.06, 0.9, 1.6, 1.0, wood);
  const lan = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 1.3, 0.5) })); lan.position.set(0.9, 2.15, 1.0); wagon.add(lan);
}
lanLight.position.copy(wagon.localToWorld(new THREE.Vector3(0.9, 2.15, 1.0)));
groundMat.uniforms.uLanPos.value.copy(lanLight.position);

// ---------- revolver (the bandit's) ----------
const gun = new THREE.Group(); scene.add(gun);
let hammer, cylinder;
{
  const steel = std(0x8a8c92, 0.3, 0.85), blued = std(0x3a3e4a, 0.26, 0.8), woodG = std(0x4a2a16, 0.5), leather = std(0x4a3020, 0.8);
  // gun local: barrel along -z, muzzle at origin
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.0095, 0.19, 24), blued); barrel.rotation.x = Math.PI / 2; barrel.position.z = 0.095; gun.add(barrel);
  const bore = new THREE.Mesh(new THREE.CircleGeometry(0.0055, 20), new THREE.MeshBasicMaterial({ color: 0x000000 })); bore.position.z = -0.0005; bore.rotation.y = Math.PI; gun.add(bore);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.15, 12), steel); rod.rotation.x = Math.PI / 2; rod.position.set(0, -0.016, 0.105); gun.add(rod);
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.008, 0.012), blued); sight.position.set(0, 0.012, 0.01); gun.add(sight);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.05, 0.075), blued); frame.position.set(0, -0.004, 0.23); gun.add(frame);
  cylinder = new THREE.Group(); cylinder.position.set(0, -0.004, 0.225); gun.add(cylinder);
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.045, 30), steel); cyl.rotation.x = Math.PI / 2; cylinder.add(cyl);
  for (let k = 0; k < 6; k++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.006, 0.034), blued); const a = k * Math.PI / 3; f.position.set(Math.cos(a) * 0.021, Math.sin(a) * 0.021, 0); cylinder.add(f); }
  hammer = new THREE.Group(); hammer.position.set(0, 0.018, 0.268); gun.add(hammer);
  const hm = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.03, 0.012), steel); hm.position.set(0, 0.012, 0.004); hammer.add(hm);
  const spur = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.006, 0.016), steel); spur.position.set(0, 0.026, 0.012); hammer.add(spur);
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.003, 8, 20, Math.PI * 1.2), blued); guard.position.set(0, -0.036, 0.25); guard.rotation.y = Math.PI / 2; gun.add(guard);
  const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.07, 6, 12), woodG); grip.position.set(0, -0.055, 0.29); grip.rotation.x = -0.45; grip.scale.set(1, 1, 1.35); gun.add(grip);
  // gloved hand around the grip, thumb by the hammer, cuff behind
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.042, 18, 14), leather); palm.scale.set(1.0, 1.25, 0.95); palm.position.set(0.004, -0.06, 0.3); gun.add(palm);
  for (let k = 0; k < 3; k++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.03, 4, 10), leather); f.position.set(0.012, -0.045 - k * 0.022, 0.262); f.rotation.z = Math.PI / 2; gun.add(f); }
  const index = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.028, 4, 10), leather); index.position.set(0.01, -0.03, 0.245); index.rotation.x = 1.2; gun.add(index);
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.035, 4, 10), leather); thumb.position.set(-0.016, 0.0, 0.29); thumb.rotation.x = 1.1; gun.add(thumb);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.08, 18), std(0x2a2420, 0.95)); cuff.position.set(0.0, -0.085, 0.37); cuff.rotation.x = Math.PI / 2 - 0.5; gun.add(cuff);
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.4, 18), std(0x262a30, 0.95)); sleeve.position.set(0.0, -0.18, 0.55); sleeve.rotation.x = Math.PI / 2 - 0.5; gun.add(sleeve);
}
gun.position.copy(MV); gun.lookAt(MV.clone().sub(DIR)); // local -z → along DIR? lookAt points +z at target

// ---------- bullet ----------
const bullet = new THREE.Group(); scene.add(bullet);
{
  const pts = [];
  for (let i = 0; i <= 16; i++) { const u = i / 16; const y = u * 0.021; const r = u < 0.55 ? 0.0057 : 0.0057 * Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.55) / 0.45, 2))) ; pts.push(new THREE.Vector2(Math.max(r, 0.0002), y)); }
  pts.unshift(new THREE.Vector2(0.0, 0.0));
  const b = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), new THREE.MeshStandardMaterial({ color: 0xb8743c, roughness: 0.25, metalness: 1.0, emissive: 0x2a0c02 }));
  b.rotation.x = -Math.PI / 2; // lathe axis y → -z (nose forward along -z)
  bullet.add(b);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0057, 0.0005, 6, 32), new THREE.MeshStandardMaterial({ color: 0x4a2008, roughness: 0.6, metalness: 1 }));
  ring.position.z = -0.004; bullet.add(ring);
}
const bulletSpin = new THREE.Group();
// streak for fast frames
const streak = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 8, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.0, 0.6), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
scene.add(streak);

// ---------- particles ----------
function pointsGeo(n, seed, fill) {
  const g = new THREE.BufferGeometry(); const r = mulberry(seed);
  const pos = new Float32Array(n * 3), a = new Float32Array(n * 4), b = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { for (let k = 0; k < 4; k++) { a[i * 4 + k] = r(); b[i * 4 + k] = r(); } }
  if (fill) fill(pos, a, b, r);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aR', new THREE.BufferAttribute(a, 4)); g.setAttribute('aS', new THREE.BufferAttribute(b, 4));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
  return g;
}
const SPRITE_FS = (alphaMul) => `varying vec4 vC; void main(){ vec2 d=gl_PointCoord-0.5; float r=dot(d,d)*4.0; if(r>1.0) discard; float f=exp(-r*2.6); gl_FragColor=vec4(vC.rgb, vC.a*f*${alphaMul}); }`;
const commonU = () => ({ uTe: { value: 0 }, uC: { value: new THREE.Vector3(WV.x, 0, WV.z) }, uScale: { value: 1 }, uI: { value: 1 }, uT: { value: 0 } });

// fireball (additive)
const N_FIRE = 400000;
const fireMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: commonU(),
  vertexShader: NOISE + `
  attribute vec4 aR; attribute vec4 aS; uniform float uTe; uniform vec3 uC; uniform float uScale; uniform float uI; varying vec4 vC;
  void main(){
    float te=uTe;
    float az=aR.x*6.2831853; float cy=mix(-0.10,1.0,pow(aR.y,0.8)); float sy=sqrt(max(0.0,1.0-cy*cy));
    vec3 dir=vec3(sy*cos(az),cy,sy*sin(az));
    float rf=pow(aR.z,0.55);
    float R=10.5*(1.0-exp(-te*2.4))+0.5*te;
    float Rf=5.0*(1.0-exp(-te*10.0));
    vec3 pF=dir*Rf*rf; pF.y=abs(pF.y)+Rf*0.25;
    vec3 pD=dir*R*rf; pD.y=abs(pD.y)*1.05;
    vec3 p=mix(pF,pD,smoothstep(0.05,0.7,te));
    float rise=max(te-1.6,0.0);
    float Hc=R*0.62+1.0*pow(rise,1.1);
    float Rt=R*0.62+0.22*rise; float rt=R*0.46*(0.25+0.75*rf);
    float th=aR.w*6.2831853-te*0.5;
    vec3 rad=vec3(cos(az),0.0,sin(az));
    vec3 pT=rad*(Rt+rt*cos(th))+vec3(0.0,Hc+rt*sin(th)*0.85,0.0);
    float isStem=step(aS.x,0.15);
    float yy=fract(aS.y+te*0.07);
    vec3 pS=rad*(1.6+2.6*aS.z*(0.5+0.7*yy))+vec3(0.0,yy*max(0.0,Hc-rt*0.6),0.0);
    float mt=smoothstep(1.4,6.5,te);
    p=mix(p,mix(pT,pS,isStem),mt);
    float Rn=max(R,1.0);
    vec3 q=p/Rn*2.2+vec3(aS.w*0.0,-te*0.16,0.0);
    float amp=(0.11+0.07*mt)*Rn;
    p+=amp*vec3(snoise(q),snoise(q+17.1),snoise(q+31.7));
    p.y=max(p.y,0.05);
    float lob=snoise(q*1.9+5.0);
    float tmp=(1.0-rf)*0.95+0.25*lob+0.15-te*0.035+0.6*exp(-te*3.0);
    tmp=clamp(tmp,0.0,1.4);
    vec3 cW=vec3(1.0,0.93,0.76), cG=vec3(1.0,0.604,0.314), cR=vec3(0.62,0.20,0.07), cD=vec3(0.10,0.04,0.025);
    vec3 col=tmp>0.62?mix(cG,cW,smoothstep(0.62,1.0,tmp)):(tmp>0.32?mix(cR,cG,smoothstep(0.32,0.62,tmp)):mix(cD,cR,smoothstep(0.05,0.32,tmp)));
    float br=(0.45+0.85*smoothstep(-0.35,0.6,lob))*(0.6+0.8*tmp);
    br*=1.0+isStem*(-0.35);
    float flash=exp(-te*8.0);
    col=mix(col,vec3(1.0,0.97,0.9),flash);
    vC=vec4(col*br*uI, 0.09*(1.0+3.0*flash));
    vec4 mv=modelViewMatrix*vec4(uC+p,1.0);
    float sz=mix(0.26,0.14+0.16*aS.z,smoothstep(0.0,1.0,te))*(Rn/10.5*0.6+0.4);
    gl_PointSize=clamp(sz*uScale/-mv.z,1.0,40.0);
    if(te<0.0) gl_PointSize=0.0;
    gl_Position=projectionMatrix*mv;
  }`,
  fragmentShader: SPRITE_FS('1.0'),
});
const fire = new THREE.Points(pointsGeo(N_FIRE, 101), fireMat); fire.frustumCulled = false; scene.add(fire);

// smoke veins and the top edge (normal blend, dark)
const N_SMOKE = 30000;
const smokeMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, uniforms: commonU(),
  vertexShader: NOISE + `
  attribute vec4 aR; attribute vec4 aS; uniform float uTe; uniform vec3 uC; uniform float uScale; uniform float uI; varying vec4 vC;
  void main(){
    float te=uTe;
    float az=aR.x*6.2831853; float cy=mix(0.25,1.0,aR.y); float sy=sqrt(1.0-cy*cy);
    vec3 dir=vec3(sy*cos(az),cy,sy*sin(az));
    float rf=1.0+0.06*aR.z;
    float R=10.5*(1.0-exp(-te*2.4))+0.5*te;
    vec3 p=dir*R*rf; p.y*=0.9;
    float rise=max(te-1.6,0.0);
    float Hc=R*0.62+1.0*pow(rise,1.1); float Rt=R*0.62+0.22*rise; float rt=R*0.46*1.02;
    float th=mix(0.35,2.6,aR.w)-te*0.5;
    vec3 rad=vec3(cos(az),0.0,sin(az));
    vec3 pT=rad*(Rt+rt*cos(th))+vec3(0.0,Hc+rt*sin(th)*0.85,0.0);
    float mt=smoothstep(1.4,6.5,te);
    p=mix(p,pT,mt);
    float Rn=max(R,1.0);
    vec3 q=p/Rn*2.2+vec3(0.0,-te*0.16,0.0);
    p+=(0.11+0.07*mt)*Rn*vec3(snoise(q),snoise(q+17.1),snoise(q+31.7));
    float v=abs(snoise(q*2.4+3.0));
    float top=smoothstep(0.55,0.95,(p.y-Hc*0.6)/max(Rn,1.0));
    float keep=max((1.0-smoothstep(0.015,0.04,v))*step(0.45,(p.y)/max(Hc+rt,1.0)), top*step(aS.x,0.6));
    vC=vec4(vec3(0.05,0.032,0.024)+vec3(0.30,0.14,0.05)*uI*0.12, 0.11*keep*smoothstep(0.8,2.5,te));
    vec4 mv=modelViewMatrix*vec4(uC+p,1.0);
    gl_PointSize=keep<0.01||te<0.0?0.0:clamp(0.45*(Rn/10.5*0.6+0.4)*uScale/-mv.z,1.0,40.0);
    gl_Position=projectionMatrix*mv;
  }`,
  fragmentShader: SPRITE_FS('1.0'),
});
const smoke = new THREE.Points(pointsGeo(N_SMOKE, 202), smokeMat); smoke.frustumCulled = false; scene.add(smoke);

// embers (additive, ballistic)
const N_EMB = 12000;
const embMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: commonU(),
  vertexShader: `attribute vec4 aR; attribute vec4 aS; uniform float uTe; uniform vec3 uC; uniform float uScale; varying vec4 vC;
  void main(){ float te=uTe; float az=aR.x*6.2831853; float el=mix(0.15,1.3,aR.y); float sp=mix(8.0,42.0,pow(aR.z,1.5));
    float k=1.6; float tt=(1.0-exp(-k*te))/k;
    vec3 v=vec3(cos(az)*cos(el),sin(el),sin(az)*cos(el))*sp;
    vec3 p=v*tt+vec3(0.0,-4.9*te*te*0.55,0.0);
    p.y=max(p.y,0.0)+1.0;
    float life=mix(1.5,5.0,aS.x); float a=te<0.0?0.0:smoothstep(life,life*0.5,te);
    vC=vec4(vec3(1.0,0.62,0.28)*(1.5+aS.y*2.0),a);
    vec4 mv=modelViewMatrix*vec4(uC+p,1.0);
    gl_PointSize=a<0.01?0.0:clamp(0.09*uScale/-mv.z,1.0,8.0);
    gl_Position=projectionMatrix*mv; }`,
  fragmentShader: SPRITE_FS('1.0'),
});
const embers = new THREE.Points(pointsGeo(N_EMB, 303), embMat); embers.frustumCulled = false; scene.add(embers);

// dust wall (base surge) sweeping toward the camera
const N_DUST = 90000;
const dustMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, uniforms: { ...commonU(), uCam: { value: new THREE.Vector3() } },
  vertexShader: NOISE + `attribute vec4 aR; attribute vec4 aS; uniform float uTe; uniform vec3 uC; uniform float uScale; uniform float uI; uniform vec3 uCam; varying vec4 vC;
  void main(){ float te=uTe;
    float az=1.5708+(aR.x-0.5)*2.2;
    float Rd=15.5*pow(max(te-0.3,0.0),0.8);
    float back=pow(aR.y,1.6)*(2.0+0.15*Rd);
    float r=max(Rd-back,0.0);
    float hmax=1.5+0.06*Rd;
    float h=hmax*pow(aR.z,1.7)*(0.6+0.4*(1.0-aR.y));
    vec3 rad=vec3(cos(az),0.0,sin(az));
    vec3 p=rad*r+vec3(0.0,h,0.0);
    vec3 q=p*0.11+vec3(0.0,-te*0.35,te*0.2);
    p+=vec3(snoise(q),snoise(q+9.0)*0.6,snoise(q+19.0))*(1.0+0.12*Rd);
    p.y=max(p.y,0.05);
    float front=1.0-aR.y;
    float glow=uI*(0.25+0.75*smoothstep(0.2,1.0,h/hmax));
    vec3 col=vec3(0.07,0.055,0.045)*(0.7+0.6*front)+vec3(1.0,0.847,0.627)*glow*0.22*(0.4+0.6*aR.w)*smoothstep(0.4,1.0,h/hmax);
    float a=0.16*smoothstep(0.3,1.2,te)*(0.4+0.6*front);
    vec4 mv=modelViewMatrix*vec4(uC+p,1.0);
    float dcam=-mv.z;
    a*=smoothstep(0.6,3.0,dcam);
    vC=vec4(col,a);
    gl_PointSize=(te<0.3||a<0.002)?0.0:clamp((0.5+0.9*aS.x)*(1.0+0.05*Rd)*uScale/dcam,1.0,60.0);
    gl_Position=projectionMatrix*mv; }`,
  fragmentShader: SPRITE_FS('1.0'),
});
const dust = new THREE.Points(pointsGeo(N_DUST, 404), dustMat); dust.frustumCulled = false; scene.add(dust);

// air motes along the bullet's path: pushed out when the round passes
const N_MOTE = 70000, PATH_ALL = PATH1 + 59;
const moteMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uS: { value: 0 }, uM: { value: MV.clone() }, uD: { value: DIR.clone() }, uScale: { value: 1 }, uT: { value: 0 }, uA: { value: 1 } },
  vertexShader: `attribute vec4 aR; attribute vec4 aS; uniform float uS; uniform vec3 uM; uniform vec3 uD; uniform float uScale; uniform float uT; uniform float uA; varying vec4 vC;
  void main(){
    vec3 up=vec3(0.0,1.0,0.0); vec3 e1=normalize(cross(uD,up)); vec3 e2=cross(e1,uD);
    float sa=mix(-1.0,${PATH_ALL.toFixed(1)},aR.x);
    float rr=0.9*pow(aR.y,1.8)+0.004; float ang=aR.z*6.2831853;
    vec2 o=vec2(cos(ang),sin(ang))*rr;
    float since=uS-sa;
    float pushed=since>0.0?(1.0-exp(-since/0.35)):0.0;
    float k=exp(-rr/0.10);
    vec2 o2=o*(1.0+2.2*k*pushed)+vec2(-o.y,o.x)*0.6*k*pushed*sin(since*6.0+aR.w*6.0);
    vec3 p=uM+uD*sa+e1*o2.x+e2*o2.y+vec3(0.0,0.02*sin(uT*0.3+aR.w*6.3),0.0);
    vec4 mv=modelViewMatrix*vec4(p,1.0);
    float sz=mix(0.0006,0.0022,aS.x)*uScale/-mv.z;
    float a=clamp(sz,0.0,1.0)*uA*(0.35+0.9*k*pushed*exp(-max(since,0.0)/3.0));
    vC=vec4(vec3(0.62,0.70,0.90)*(0.5+aS.y)+vec3(0.6,0.3,0.1)*k*pushed,a*0.6);
    float oof=smoothstep(4.0,14.0,sz); vC.a*=1.0-0.85*oof; gl_PointSize=uA<0.01?0.0:clamp(sz,1.0,7.0);
    gl_Position=projectionMatrix*mv; }`,
  fragmentShader: SPRITE_FS('1.0'),
});
const motes = new THREE.Points(pointsGeo(N_MOTE, 505), moteMat); motes.frustumCulled = false; scene.add(motes);

// wake and muzzle gas: wisps along the path behind the bullet + the muzzle flash and smoke ring
const N_WAKE = 30000;
const wakeMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uS: { value: 0 }, uM: { value: MV.clone() }, uD: { value: DIR.clone() }, uScale: { value: 1 }, uTf: { value: 0 }, uA: { value: 1 } },
  vertexShader: NOISE + `attribute vec4 aR; attribute vec4 aS; uniform float uS; uniform vec3 uM; uniform vec3 uD; uniform float uScale; uniform float uTf; uniform float uA; varying vec4 vC;
  void main(){
    vec3 up=vec3(0.0,1.0,0.0); vec3 e1=normalize(cross(uD,up)); vec3 e2=cross(e1,uD);
    vec3 p; vec4 c; float sz;
    if(aR.w<0.55){ // wake behind the round
      float sa=aR.x*${PATH_ALL.toFixed(1)}; float since=uS-sa;
      float g=0.003+0.05*sqrt(max(since,0.0));
      float ang=aR.y*6.2831853+since*3.0;
      vec3 q=vec3(sa*1.3,aR.y*4.0,since*0.4);
      vec2 o=vec2(cos(ang),sin(ang))*g*pow(aR.z,0.5)+vec2(snoise(q),snoise(q+5.0))*g*0.8;
      p=uM+uD*sa+e1*o.x+e2*o.y;
      float a=since>0.0?exp(-since/5.0)*smoothstep(0.0,0.15,since):0.0;
      c=vec4(vec3(0.55,0.62,0.80),a*0.10);
      sz=0.004;
    } else if(aR.w<0.75){ // muzzle flash: a forward cone of hot gas
      float tf=uTf; float u=aR.x;
      float d=(0.01+0.28*u)*smoothstep(0.0,0.35,tf+0.02);
      float spread=0.01+0.07*u*u;
      float ang=aR.y*6.2831853;
      p=uM+uD*d+(e1*cos(ang)+e2*sin(ang))*spread*pow(aR.z,0.5)*(0.5+tf);
      float a=tf<0.0?0.0:exp(-tf*2.4)*(1.0-u*0.7);
      c=vec4(mix(vec3(1.0,0.95,0.8),vec3(1.0,0.45,0.12),u)*3.0,a*0.16);
      sz=0.0025+0.005*u;
    } else { // smoke ring and gas cloud from the muzzle
      float tf=max(uTf,0.0); float ang=aR.y*6.2831853;
      float ringR=0.012+0.10*(1.0-exp(-tf*1.2));
      float dz=0.04+0.22*(1.0-exp(-tf*0.9));
      vec3 q=vec3(aR.x*8.0,ang,tf*0.5);
      float minor=0.006+0.016*aR.z;
      float th=aR.x*6.2831853+tf*2.0;
      vec3 rad=e1*cos(ang)+e2*sin(ang);
      p=uM+uD*(dz+minor*sin(th))+rad*(ringR+minor*cos(th))+vec3(snoise(q),snoise(q+3.0),snoise(q+7.0))*0.012;
      float a=uTf<0.0?0.0:smoothstep(0.0,0.4,tf)*exp(-tf/6.0);
      c=vec4(vec3(0.35,0.36,0.42),a*0.06);
      sz=0.005;
    }
    vC=c;
    vec4 mv=modelViewMatrix*vec4(p,1.0);
    gl_PointSize=(c.a<0.0005||uA<0.01)?0.0:clamp(sz*uScale/-mv.z,1.0,40.0);
    gl_Position=projectionMatrix*mv; }`,
  fragmentShader: SPRITE_FS('1.0'),
});
const wake = new THREE.Points(pointsGeo(N_WAKE, 606), wakeMat); wake.frustumCulled = false; scene.add(wake);

// pre-dawn wind dust near the cowboy (all shots of him)
const N_AIR = 20000;
const airMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uScale: { value: 1 }, uI: { value: 0 }, uFb: { value: FB.pos } },
  vertexShader: `attribute vec4 aR; attribute vec4 aS; uniform float uT; uniform float uScale; uniform float uI; uniform vec3 uFb; varying vec4 vC;
  void main(){ vec3 p=vec3(mix(-14.0,14.0,aR.x),pow(aR.y,2.0)*5.0,mix(-12.0,14.0,aR.z));
    p.x=mod(p.x+uT*(0.6+aS.x)+14.0,28.0)-14.0; p.y+=0.15*sin(uT*0.7+aS.y*9.0);
    vec4 mv=modelViewMatrix*vec4(p,1.0);
    float sz=mix(0.003,0.012,aS.z)*uScale/-mv.z;
    float back=1.0/(1.0+pow(distance(p,uFb)/40.0,2.0));
    vC=vec4(vec3(0.5,0.58,0.8)*0.35+vec3(1.0,0.75,0.45)*uI*back*1.4,clamp(sz,0.0,1.0)*0.5);
    gl_PointSize=clamp(sz,1.0,14.0); gl_Position=projectionMatrix*mv; }`,
  fragmentShader: SPRITE_FS('1.0'),
});
const air = new THREE.Points(pointsGeo(N_AIR, 707), airMat); air.frustumCulled = false; scene.add(air);

// felt fibres torn off the brim
const N_FELT = 1500;
const feltMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, uniforms: { uT: { value: 0 }, uScale: { value: 1 }, uP: { value: HV.clone() }, uD: { value: DIR.clone() } },
  vertexShader: `attribute vec4 aR; attribute vec4 aS; uniform float uT; uniform float uScale; uniform vec3 uP; uniform vec3 uD; varying vec4 vC;
  void main(){ float tt=uT; vec3 v=normalize(uD*1.5+vec3(aR.x-0.5,aR.y-0.3,aR.z-0.5))*mix(0.5,3.0,aS.x);
    vec3 p=uP+v*(1.0-exp(-tt*3.0))/3.0+vec3(0.0,-0.4*tt*tt,0.0);
    float a=tt<0.0?0.0:exp(-tt*0.8);
    vC=vec4(vec3(0.2,0.15,0.11),a*0.9);
    vec4 mv=modelViewMatrix*vec4(p,1.0);
    gl_PointSize=a<0.01?0.0:clamp(0.006*uScale/-mv.z,1.0,8.0); gl_Position=projectionMatrix*mv; }`,
  fragmentShader: SPRITE_FS('1.0'),
});
const felt = new THREE.Points(pointsGeo(N_FELT, 808), feltMat); felt.frustumCulled = false; scene.add(felt);

// ---------- hat path ----------
const HAT_ON = new THREE.Vector3(0, 1.735, 0.0);
function hatPose(t) {
  // returns position + euler of the hat in world space
  const p = new THREE.Vector3(), e = new THREE.Euler();
  if (t < T.hat) { // on the head: follows the head tilt
    head.updateMatrixWorld(true);
    p.set(0, 0.235, 0.0); head.localToWorld(p);
    e.set(head.rotation.x, 0, head.rotation.z);
    return { p, e };
  }
  const L1 = new THREE.Vector3(-0.35, 0.03, -1.7);
  if (t < T.hat + 1.0) {
    const u = (t - T.hat) / 1.0;
    p.set(mix(0.0, L1.x, u), mix(1.735, L1.y, u) + 1.1 * Math.sin(Math.PI * Math.pow(u, 0.8)) * (1 - u * 0.2), mix(0.0, L1.z, u));
    e.set(-u * 5.2, u * 1.2, -u * 0.6);
    return { p, e };
  }
  if (t < T.pass - 0.15) { p.copy(L1); e.set(-5.2 + Math.PI * 2, 1.2, -0.6); return { p, e }; }
  const L2 = new THREE.Vector3(-0.8, 0.03, 1.5);
  const u = clamp((t - (T.pass - 0.15)) / (T.hatLand - T.pass + 0.15), 0, 1);
  const w = u < 1 ? 1 - Math.pow(1 - u, 1.7) : 1;
  p.set(mix(L1.x, L2.x, w) + 0.2 * Math.sin(u * 7), mix(L1.y, L2.y, w) + 0.9 * Math.sin(Math.PI * u) * (1 - u * 0.3), mix(L1.z, L2.z, w));
  const ww = sstep(0, 1, u);
  e.set(mix(1.08, Math.PI * 4, ww), 1.2 + ww * 3.0, -0.6 * (1 - ww) + 2.0 * Math.sin(Math.PI * ww) * 0.6);
  return { p, e };
}

// ---------- camera ----------
function camAt(t) {
  const c = { pos: new THREE.Vector3(), tgt: new THREE.Vector3(), fov: 50, roll: 0 };
  const n = new THREE.Vector3().crossVectors(DIR, new THREE.Vector3(0, 1, 0)).normalize(); // side the camera sits on (+x)
  if (t < T.cut2) {
    const u = t / T.cut2;
    c.pos.set(0.22, mix(0.48, 0.5, u), mix(8.6, 7.4, sstep(0, 1, u)));
    c.tgt.set(0, 3.3, -14); c.fov = 52;
  } else if (t < T.cut3) {
    const b = bulletPos(t);
    const tg0 = MV.clone().addScaledVector(DIR, -0.07);
    const k = sstep(T.fire + 0.15, T.cut3, t);
    c.tgt.copy(tg0).lerp(b.clone().addScaledVector(DIR, 0.03), k * 0.85);
    c.tgt.copy(MV).addScaledVector(DIR, 0.08).add(new THREE.Vector3(0, -0.02, 0)).lerp(b.clone().addScaledVector(DIR, 0.011), k);
    c.pos.copy(MV).addScaledVector(DIR, -0.80 + 1.3 * k * k).addScaledVector(n, 0.30 - 0.14 * k).add(new THREE.Vector3(0, 0.13 - 0.10 * k, 0));
    c.fov = 32;
  } else if (t < T.cut4) {
    const u = (t - T.cut3) / (T.cut4 - T.cut3);
    const e = sstep(0.12, 0.78, u);
    const b = bulletPos(t);
    // orbit from side-on to behind the round, keeping it in frame (it drifts from centre to the lower third)
    const phi = e * 1.45, R = mix(0.15, 0.30, e);
    const bc = b.clone().addScaledVector(DIR, 0.011);
    c.pos.copy(bc).addScaledVector(n, R * Math.cos(phi)).addScaledVector(DIR, -R * Math.sin(phi)).add(new THREE.Vector3(0, mix(0.008, 0.05, e), 0));
    const want = mix(0.0, 0.13, e);
    const vb = bc.clone().sub(c.pos).normalize();
    let lo = 0, hi = 60;
    for (let k = 0; k < 30; k++) { const L = (lo + hi) / 2; const vt = bc.clone().addScaledVector(DIR, L).sub(c.pos).normalize(); if (Math.acos(clamp(vb.dot(vt), -1, 1)) < want) lo = L; else hi = L; }
    c.tgt.copy(bc).addScaledVector(DIR, lo);
    c.fov = mix(26, 34, e);
    c.roll = 0.03 * Math.sin(u * 5.0) * (1 - e);
  } else if (t < T.imp) {
    const u = (t - T.cut4) / (T.imp - T.cut4);
    c.pos.set(0.36, 0.95, mix(5.8, 5.4, u)); c.tgt.set(0.0, 1.5, 0); c.fov = 36;
  } else {
    const u = (t - T.imp) / (DUR - T.imp);
    c.pos.set(0, mix(0.55, 0.68, u), mix(9.6, 6.6, sstep(0, 1, u)));
    c.tgt.set(0, mix(6.4, 7.0, u), -20); c.fov = 50;
    // shake as the blast and the dust wall arrive
    const s1 = Math.exp(-Math.max(0, t - (T.imp + 0.13)) * 3.0) * (t > T.imp + 0.13 ? 1 : 0) * 0.025;
    const s2 = sstep(T.cam - 1.6, T.cam, t) * Math.exp(-Math.max(0, t - T.cam) * 0.8) * 0.02;
    const s = s1 + s2;
    c.pos.x += s * (hash1(Math.floor(t * 24)) - 0.5); c.pos.y += s * (hash1(Math.floor(t * 24) + 7) - 0.5);
  }
  return c;
}

// ---------- post ----------
const rtOpts = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: true, samples: 4 };
const rtScene = new THREE.WebGLRenderTarget(W, HH, rtOpts);
const lw = Math.round(W / 4), lh = Math.round(HH / 4);
const mk = (w, h) => new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false });
const rA = [mk(lw, lh), mk(lw >> 1, lh >> 1), mk(lw >> 2, lh >> 2)], rB = [mk(lw, lh), mk(lw >> 1, lh >> 1), mk(lw >> 2, lh >> 2)];
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); const quadScene = new THREE.Scene(); quadScene.add(quad);
const VQ = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0);} `;
const brightMat = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null }, uTh: { value: 0.7 } }, vertexShader: VQ,
  fragmentShader: `uniform sampler2D tSrc; uniform float uTh; varying vec2 vUv; void main(){ vec3 c=texture2D(tSrc,vUv).rgb; float l=dot(c,vec3(0.3,0.55,0.15)); gl_FragColor=vec4(c*smoothstep(uTh,uTh+0.8,l),1.0);} ` });
const blurMat = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } }, vertexShader: VQ,
  fragmentShader: `uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv; void main(){ vec3 s=texture2D(tSrc,vUv).rgb*0.2270;
    s+=(texture2D(tSrc,vUv+uDir*1.3846).rgb+texture2D(tSrc,vUv-uDir*1.3846).rgb)*0.3162; s+=(texture2D(tSrc,vUv+uDir*3.2308).rgb+texture2D(tSrc,vUv-uDir*3.2308).rgb)*0.0703; gl_FragColor=vec4(s,1.0);} ` });
const copyMat = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null } }, vertexShader: VQ, fragmentShader: `uniform sampler2D tSrc; varying vec2 vUv; void main(){ gl_FragColor=texture2D(tSrc,vUv);} ` });
const finalMat = new THREE.ShaderMaterial({
  uniforms: {
    tScene: { value: null }, tB0: { value: null }, tB1: { value: null }, tB2: { value: null },
    uFrame: { value: 0 }, uExp: { value: 1 }, uFlash: { value: 0 }, uFade: { value: 1 }, uHaze: { value: 0 }, uWarm: { value: 0 },
    uBP: { value: new THREE.Vector2(-9, -9) }, uBD: { value: new THREE.Vector2(1, 0) }, uBS: { value: 0 }, uWeave: { value: new THREE.Vector2() }, uAsp: { value: W / HH },
  },
  vertexShader: VQ,
  fragmentShader: `uniform sampler2D tScene,tB0,tB1,tB2; uniform float uFrame,uExp,uFlash,uFade,uHaze,uWarm,uBS,uAsp; uniform vec2 uBP,uBD,uWeave; varying vec2 vUv;
  float h12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*0.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
  void main(){
    vec2 uv=vUv+uWeave;
    // shock cone behind the bullet tip (screen space)
    if(uBS>0.0){
      vec2 q=(uv-uBP)*vec2(uAsp,1.0); vec2 d=normalize(uBD*vec2(uAsp,1.0)); vec2 nn=vec2(-d.y,d.x);
      float a=dot(q,d), b=dot(q,nn);
      float cone=abs(abs(b)-(-a)*0.55); float behind=smoothstep(0.0,-0.02,a)*exp(a*4.0);
      float ring=exp(-cone*cone/(0.00025*uBS))*behind;
      float tip=exp(-dot(q,q)/(0.0004*uBS));
      uv+= (nn*sign(b)*ring*0.004 + q*tip*0.15)*uBS/vec2(uAsp,1.0);
    }
    vec3 c=texture2D(tScene,uv).rgb;
    vec3 hal=texture2D(tB0,uv).rgb*0.55+texture2D(tB1,uv).rgb*0.8+texture2D(tB2,uv).rgb*1.1;
    c+=hal*vec3(1.0,0.55,0.32)*0.30;      // warm halation
    c+=vec3(0.55,0.42,0.30)*uHaze*(0.6+0.4*vUv.y);
    c=c*uExp+vec3(1.0,0.96,0.9)*uFlash;
    // filmic: soft toe, linear mids, clip only the brightest core
    c=1.22*c/(1.0+0.32*c);
    c=pow(clamp(c,0.0,1.0),vec3(1.0/2.2));
    // grade: cool shadows, warm highlights
    float l=dot(c,vec3(0.3,0.55,0.15));
    c=mix(c*vec3(0.92,0.98,1.10),c*vec3(1.05,1.0,0.92),smoothstep(0.25,0.75,l));
    // vignette
    vec2 v=(vUv-0.5)*vec2(1.0,1.15); c*=1.0-0.55*smoothstep(0.25,0.85,length(v)*1.25);
    // grain ±3 %, two-pixel clumps
    vec2 gp=floor(gl_FragCoord.xy/1.5);
    float g=(h12(gp+uFrame*17.31)+h12(gp*1.7+uFrame*3.1)-1.0);
    c*=1.0+0.03*g*(1.2-l*0.4); c+=0.006*g;
    c*=uFade;
    gl_FragColor=vec4(c,1.0);
  }`,
});
function pass(mat, target) { quad.material = mat; renderer.setRenderTarget(target); renderer.render(quadScene, quadCam); }

// ---------- one frame ----------
const tmpV = new THREE.Vector3();
function render(t) {
  t = clamp(t, 0, DUR - 1e-4);
  fireballState(t);
  const te = FB.te;
  const cam = camAt(t);
  camera.position.copy(cam.pos); camera.up.set(0, 1, 0); camera.lookAt(cam.tgt); camera.rotateZ(cam.roll);
  camera.fov = cam.fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  const scale = HH / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));

  // cowboy: breathing, head tilt as the round arrives, coat in the wind
  const tilt = sstep(T.tilt, T.hat - 0.1, t) * (1 - 0.6 * sstep(T.hat + 0.2, T.hat + 1.5, t));
  head.rotation.set(-0.04 * tilt, 0, 0.16 * tilt);
  head.position.y = 1.5 + 0.004 * Math.sin(t * 2.2);
  {
    const pa = coat.geometry.attributes.position; const wind = 0.25 + 1.6 * sstep(T.pass - 0.6, T.pass + 0.6, t) * (1 - 0.6 * sstep(T.pass + 2, T.pass + 6, t));
    for (let i = 0; i < pa.count; i++) {
      const x = coatBase[i * 3], y = coatBase[i * 3 + 1], z = coatBase[i * 3 + 2];
      const low = clamp((1.3 - y) / 1.0, 0, 1);
      const f = low * low * 0.05 * wind * (Math.sin(t * 3.1 + y * 6 + x * 9) * 0.6 + Math.sin(t * 5.3 + z * 11) * 0.4);
      const blow = low * low * 0.06 * (wind - 0.25);
      pa.setXYZ(i, x + f * 0.4, y + Math.abs(f) * 0.2, z + f - blow);
    }
    pa.needsUpdate = true;
  }
  const hp = hatPose(t); hat.position.copy(hp.p); hat.rotation.copy(hp.e);

  // gun: hammer, cylinder; only in the shots that see it
  const cock = sstep(T.cock - 0.05, T.cock + 0.15, t) * (1 - sstep(T.fire - 0.03, T.fire, t));
  hammer.rotation.x = cock * 0.75;
  cylinder.rotation.z = sstep(T.cock - 0.05, T.cock + 0.15, t) * Math.PI / 3;
  gun.visible = t >= T.cut2 - 0.01 && t < T.cut4;
  gun.position.copy(MV).addScaledVector(DIR, -0.012 * sstep(T.fire, T.fire + 0.6, t)); // recoil (slow-mo)

  // bullet
  const s = bulletS(t), bp = bulletPos(t);
  bullet.visible = t >= T.fire && t < T.imp;
  bullet.position.copy(bp); bullet.lookAt(bp.clone().sub(DIR)); bullet.rotateZ(t * 4.0);
  const v = (bulletS(t + 1 / 48) - bulletS(t - 1 / 48)) * 24;
  if (bullet.visible && t >= T.cut4 && v / 24 > 0.06) {
    const a = bulletPos(Math.max(T.fire, t - 1 / 48)); streak.visible = true;
    streak.position.copy(a).add(bp).multiplyScalar(0.5);
    streak.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), DIR); streak.scale.set(1, a.distanceTo(bp), 1);
  } else streak.visible = false;

  // wagon disappears into the flash
  wagon.visible = te < 0.02;
  lanLight.intensity = te < 0 ? 0.8 : 0; groundMat.uniforms.uLan.value = te < 0 ? 1 : 0;

  // lights
  const I = FB.I;
  RIM.value = 0.45 * I;
  fireLight.position.copy(FB.pos); fireLight.intensity = I * 90;
  rimLight.position.copy(FB.pos); rimLight.target.position.set(0, 1, 0); rimLight.intensity = I * 3.2;
  fillLight.position.set(0, 0.2, 8); fillLight.target.position.set(0, 1.4, 0); fillLight.intensity = I * 0.30; // faces warm at half strength (bounce)
  hemi.intensity = 0.55; hemi.groundColor.setRGB(0.10 + 0.5 * I * 0.25, 0.08 + 0.35 * I * 0.25, 0.06 + 0.2 * I * 0.25);
  const tf = t - T.fire;
  muzLight.position.copy(MV).addScaledVector(DIR, 0.08); muzLight.intensity = tf < 0 ? 0 : 0.6 * Math.exp(-tf * 2.4);

  // uniforms
  skyMat.uniforms.uFb.value.copy(FB.pos); skyMat.uniforms.uI.value = I;
  for (const m of cloudMats) m.uniforms.uI.value = I;
  groundMat.uniforms.uI.value = I;
  for (const m of [fireMat, smokeMat, embMat, dustMat]) { m.uniforms.uTe.value = te; m.uniforms.uScale.value = scale; m.uniforms.uI.value = 1.0 + 1.2 * FB.flash; }
  dustMat.uniforms.uI.value = I;
  dustMat.uniforms.uCam.value.copy(camera.position);
  fire.visible = smoke.visible = embers.visible = dust.visible = te >= 0;
  const inBullet = t >= T.cut2 && t < T.imp;
  moteMat.uniforms.uS.value = s; moteMat.uniforms.uScale.value = scale; moteMat.uniforms.uT.value = t; moteMat.uniforms.uA.value = inBullet ? 1 : 0;
  motes.visible = inBullet;
  wakeMat.uniforms.uS.value = s; wakeMat.uniforms.uScale.value = scale; wakeMat.uniforms.uTf.value = tf; wake.visible = t >= T.fire && t < T.imp + 1;
  airMat.uniforms.uT.value = t < T.fire ? t : (t < T.imp ? T.fire + (t - T.fire) * 0.02 : t); airMat.uniforms.uScale.value = scale; airMat.uniforms.uI.value = I;
  air.visible = t < T.cut2 || t >= T.cut4;
  feltMat.uniforms.uT.value = t - T.hat; feltMat.uniforms.uScale.value = scale; felt.visible = t > T.hat && t < T.hat + 4;

  // render scene → HDR target
  renderer.setRenderTarget(rtScene); renderer.setClearColor(0x000000, 1); renderer.render(scene, camera);
  // halation chain
  brightMat.uniforms.tSrc.value = rtScene.texture; brightMat.uniforms.uTh.value = 1.0; pass(brightMat, rA[0]);
  for (let i = 0; i < 3; i++) {
    if (i > 0) { copyMat.uniforms.tSrc.value = rA[i - 1].texture; pass(copyMat, rA[i]); }
    const w = rA[i].width, h = rA[i].height;
    blurMat.uniforms.tSrc.value = rA[i].texture; blurMat.uniforms.uDir.value.set(1 / w, 0); pass(blurMat, rB[i]);
    blurMat.uniforms.tSrc.value = rB[i].texture; blurMat.uniforms.uDir.value.set(0, 1 / h); pass(blurMat, rA[i]);
  }
  // bullet in screen space for the shock-cone refraction
  const fu = finalMat.uniforms;
  fu.uBS.value = 0;
  if (t >= T.fire + 0.05 && t < T.cut4) {
    tmpV.copy(bp).project(camera); const p0 = new THREE.Vector2(tmpV.x * 0.5 + 0.5, tmpV.y * 0.5 + 0.5);
    const ahead = bp.clone().addScaledVector(DIR, 0.05).project(camera); const p1 = new THREE.Vector2(ahead.x * 0.5 + 0.5, ahead.y * 0.5 + 0.5);
    if (tmpV.z < 1 && ahead.z < 1 && p1.distanceTo(p0) > 1e-4) {
      fu.uBP.value.copy(p0); fu.uBD.value.copy(p1.sub(p0).normalize());
      fu.uBS.value = clamp(0.05 / Math.max(0.05, bp.distanceTo(camera.position)), 0, 1.5) * sstep(T.fire, T.fire + 0.5, t);
    }
  }
  fu.tScene.value = rtScene.texture; fu.tB0.value = rA[0].texture; fu.tB1.value = rA[1].texture; fu.tB2.value = rA[2].texture;
  const frame = Math.round(t * 24);
  fu.uFrame.value = frame % 997;
  fu.uWeave.value.set((hash1(frame * 0.37) - 0.5) * 0.0009, (hash1(frame * 0.71 + 3) - 0.5) * 0.0011);
  fu.uExp.value = te >= 0 ? 0.95 : 1.15;
  fu.uFlash.value = te >= 0 ? 2.2 * Math.exp(-te * 9) : 0;
  const dCam = 15.5 * Math.pow(Math.max(te - 0.3, 0), 0.8);
  const camDist = Math.hypot(camera.position.x - WV.x, camera.position.z - WV.z);
  fu.uHaze.value = te > 0 ? 0.12 * sstep(camDist - 6, camDist + 2, dCam) * Math.exp(-Math.max(0, dCam - camDist - 2) / 12) : 0;
  fu.uFade.value = sstep(0, 0.6, t) * (1 - sstep(T.fade, DUR, t));
  pass(finalMat, null);
}

window.DUR = DUR; window.EV = EV; window.render = render;
window.grabPNG = (t) => { render(t); return canvas.toDataURL('image/png').split(',')[1]; };
window.grab = (t) => { render(t); return canvas.toDataURL('image/jpeg', 0.95).split(',')[1]; };
render(0);
window.READY = true;
