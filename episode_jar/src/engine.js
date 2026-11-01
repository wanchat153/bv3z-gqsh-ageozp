// ani3d-sitck engine: renders one or two shots per frame, each with its own depth of field, joins them with a
// transition (dissolve, iris, mask, wipe, zoom), grades, sharpens, and lays the word captions on top.
// Sharpness: every shot renders at SS× the output size (default 1.5) with 4× MSAA, then a 4-tap downsample + unsharp mask.
// Every frame is a pure function of t: the film calls E.frame({...}) from its render(t).
import * as THREE from './three.module.js';
import { GTAOPass } from './addons/postprocessing/GTAOPass.js';
// Ambient occlusion + physical depth of field ported from lemo-opuscar core/three/post.js (MIT):
// GTAO contact shadows (the soft dark in every crease that makes the reference read as lit 3D), and a 96-tap spiral
// gather DOF with CoC ∝ |1/focus − 1/z| that never lets a blurred background bleed over a sharp foreground.

const VQ = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }';

export function createEngine({ W = innerWidth, H = innerHeight, clear = 0xbfe3ff, ss = +(new URLSearchParams(location.search).get('ss') || 1.5), sharpen = 0.45 } = {}) {
  const canvas = document.createElement('canvas');
  document.body.style.margin = '0'; document.body.style.background = '#000'; document.body.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const SW = Math.round(W * ss), SH = Math.round(H * ss);

  const HF = THREE.HalfFloatType;
  const mk = (w, h, o = {}) => new THREE.WebGLRenderTarget(Math.max(2, w), Math.max(2, h), { type: HF, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, ...o });
  const slot = [0, 1].map(() => {
    const depthTexture = new THREE.DepthTexture(SW, SH); depthTexture.type = THREE.UnsignedIntType;
    return { scene: mk(SW, SH, { depthBuffer: true, samples: 4, depthTexture }), dof: mk(SW, SH),
      a: [mk(SW >> 1, SH >> 1), mk(SW >> 2, SH >> 2)], b: [mk(SW >> 1, SH >> 1), mk(SW >> 2, SH >> 2)] };
  });
  const rtComp = mk(SW, SH);
  const aoPass = new Map();   // per scene: GTAOPass bound to (scene, camera)
  function ao(scene, camera) { let a = aoPass.get(scene); if (!a) { a = new GTAOPass(scene, camera, SW, SH); a.output = GTAOPass.OUTPUT.Off;
      a.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.2, thickness: 1, scale: 2.2, distanceFallOff: 0.6, samples: 16 });
      a.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6 * ss, rings: 2, samples: 16 }); aoPass.set(scene, a); }
    a.camera = camera; a.gtaoMaterial.uniforms.cameraNear.value = camera.near; a.gtaoMaterial.uniforms.cameraFar.value = camera.far;
    a.gtaoMaterial.uniforms.cameraProjectionMatrix.value.copy(camera.projectionMatrix); a.gtaoMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(camera.projectionMatrixInverse);
    a.gtaoMaterial.uniforms.cameraWorldMatrix && a.gtaoMaterial.uniforms.cameraWorldMatrix.value.copy(camera.matrixWorld);
    a.pdMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(camera.projectionMatrixInverse); return a; }
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); const quadScene = new THREE.Scene(); quadScene.add(quad);
  const pass = (mat, target) => { quad.material = mat; renderer.setRenderTarget(target); renderer.render(quadScene, quadCam); };
  const sm = (u, fs) => new THREE.ShaderMaterial({ uniforms: u, vertexShader: VQ, fragmentShader: fs, depthTest: false, depthWrite: false });

  const copyM = sm({ tSrc: { value: null } }, 'uniform sampler2D tSrc; varying vec2 vUv; void main(){ gl_FragColor=texture2D(tSrc,vUv); }');
  const blurM = sm({ tSrc: { value: null }, uDir: { value: new THREE.Vector2() } }, `uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
    void main(){ vec4 s=texture2D(tSrc,vUv)*0.2270; s+=(texture2D(tSrc,vUv+uDir*1.3846)+texture2D(tSrc,vUv-uDir*1.3846))*0.3162;
    s+=(texture2D(tSrc,vUv+uDir*3.2308)+texture2D(tSrc,vUv-uDir*3.2308))*0.0703; gl_FragColor=s; }`);
  // depth of field: circle of confusion from linear depth; the subject band (focus ± range) stays fully sharp
  const dofM = sm({ tC: { value: null }, tD: { value: null }, tB1: { value: null }, tB2: { value: null }, uNear: { value: 0.01 }, uFar: { value: 200 },
    uFocus: { value: 5 }, uRange: { value: 1 }, uAmt: { value: 0 } }, `uniform sampler2D tC,tD,tB1,tB2; uniform float uNear,uFar,uFocus,uRange,uAmt; varying vec2 vUv;
    float lin(float d){ return uNear*uFar/(uFar-d*(uFar-uNear)); }
    void main(){ vec4 c=texture2D(tC,vUv); if(uAmt<=0.0){ gl_FragColor=c; return; }
      float z=lin(texture2D(tD,vUv).x); float dz=abs(z-uFocus)-uRange;
      float coc=clamp(dz/(uFocus*0.9+0.001),0.0,1.0)*uAmt; if(dz<0.0) coc=0.0;
      vec4 b1=texture2D(tB1,vUv), b2=texture2D(tB2,vUv);
      vec4 o=mix(c,b1,smoothstep(0.0,0.5,coc)); o=mix(o,b2,smoothstep(0.45,1.0,coc)); gl_FragColor=o; }`);
  const cocM = sm({ tColor: { value: null }, tDepth: { value: null }, tAO: { value: null }, tAOD: { value: null }, aoAmt: { value: 0 }, focus: { value: 3 }, aper: { value: 4 }, maxCoc: { value: 18 }, near: { value: 0.05 }, far: { value: 200 }, range: { value: 0 }, hazeCol: { value: new THREE.Vector3(1, 0.9, 0.8) }, hazeDen: { value: 0 }, hazeStart: { value: 2 }, hazeMax: { value: 0.6 } },
  `#include <packing>
    varying vec2 vUv; uniform sampler2D tColor, tDepth, tAO, tAOD; uniform float aoAmt, focus, aper, maxCoc, near, far, range, hazeDen, hazeStart, hazeMax; uniform vec3 hazeCol;
    void main(){ float d = texture2D(tDepth, vUv).x; float z = -perspectiveDepthToViewZ(d, near, far);
      float zz = z < focus ? min(z + range, focus) : max(z - range, focus);           // the subject band stays exactly in focus
      float c = clamp(aper * (1.0/focus - 1.0/zz), -maxCoc, maxCoc);
      vec3 col = texture2D(tColor, vUv).rgb; if (aoAmt > 0.) { float za = -perspectiveDepthToViewZ(texture2D(tAOD, vUv).x, near, far); float own = step(za - z, 0.03 * z + 0.02); col *= mix(1., pow(texture2D(tAO, vUv).r, 1.6), aoAmt * own); }
      if (hazeDen > 0.) col = mix(col, hazeCol, hazeMax * (1. - exp(-max(0., z - hazeStart) * hazeDen)));   // aerial perspective
      gl_FragColor = vec4(col, c); }`);
  const gatherM = sm({ tIn: { value: null }, res: { value: new THREE.Vector2(SW, SH) }, maxCoc: { value: 18 } },
  `varying vec2 vUv; uniform sampler2D tIn; uniform vec2 res; uniform float maxCoc;
    void main(){ vec4 c0 = texture2D(tIn, vUv); float a0 = abs(c0.a); if (maxCoc < .5 || a0 < .25 && maxCoc < 1.) { gl_FragColor = vec4(c0.rgb, 1.); return; }
      vec3 acc = c0.rgb / (a0*a0 + 1.); float wsum = 1. / (a0*a0 + 1.);
      for (int i = 0; i < 96; i++) { float r = maxCoc * sqrt((float(i) + .5) / 96.); float th = float(i) * 2.39996;
        vec4 s = texture2D(tIn, vUv + vec2(cos(th), sin(th)) * r / res); float sa = abs(s.a);
        if (s.a > c0.a) sa = min(sa, max(a0, 0.));
        float w = smoothstep(r - 1.5, r + .5, sa) / (sa*sa + 1.); acc += s.rgb * w; wsum += w; }
      gl_FragColor = vec4(acc / wsum, 1.); }`);
  const rtCoc = mk(SW, SH);
  const bA = [mk(SW >> 2, SH >> 2), mk(SW >> 3, SH >> 3), mk(SW >> 4, SH >> 4)], bB = [mk(SW >> 2, SH >> 2), mk(SW >> 3, SH >> 3), mk(SW >> 4, SH >> 4)];
  const brightM = sm({ tSrc: { value: null }, uTh: { value: 0.82 } }, 'uniform sampler2D tSrc; uniform float uTh; varying vec2 vUv; void main(){ vec3 c=texture2D(tSrc,vUv).rgb; float l=dot(c,vec3(0.3,0.55,0.15)); gl_FragColor=vec4(c*smoothstep(uTh,uTh+0.5,l),1.0); }');
  function bloom(src, th) { brightM.uniforms.tSrc.value = src; brightM.uniforms.uTh.value = th; pass(brightM, bA[0]);
    for (let i = 0; i < 3; i++) { if (i) { copyM.uniforms.tSrc.value = bA[i - 1].texture; pass(copyM, bA[i]); } const w = bA[i].width, h = bA[i].height;
      blurM.uniforms.tSrc.value = bA[i].texture; blurM.uniforms.uDir.value.set(1.5 / w, 0); pass(blurM, bB[i]); blurM.uniforms.tSrc.value = bB[i].texture; blurM.uniforms.uDir.value.set(0, 1.5 / h); pass(blurM, bA[i]); } }
  const transM = sm({ tA: { value: null }, tB: { value: null }, tM: { value: null }, uKind: { value: 0 }, uP: { value: 0 }, uC: { value: new THREE.Vector2(0.5, 0.5) },
    uR: { value: 0 }, uF: { value: 0.004 }, uRing: { value: 0 }, uAsp: { value: W / H }, uDir: { value: new THREE.Vector2(1, 0) }, uZoom: { value: 0.18 }, uBulge: { value: 0.35 }, uFog: { value: new THREE.Vector3(1.0, 0.86, 0.7) } },
  `uniform sampler2D tA,tB,tM; uniform float uKind,uP,uR,uF,uRing,uAsp,uZoom,uBulge; uniform vec2 uC,uDir; uniform vec3 uFog; varying vec2 vUv;
    float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
    float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<5;i++){ s+=a*vn(p); p*=2.03; a*=0.5; } return s; }
    vec4 dirBlur(sampler2D t, vec2 uv, vec2 d){ vec4 s=vec4(0.0); for(int i=0;i<16;i++){ float k=float(i)/15.0-0.5; s+=texture2D(t,uv+d*k); } return s/16.0; }
    vec4 zoomBlur(sampler2D t, vec2 uv, vec2 c, float a){ vec4 s=vec4(0.0); for(int i=0;i<16;i++){ float k=float(i)/15.0; s+=texture2D(t,c+(uv-c)*(1.0-a*k)); } return s/16.0; }
    void main(){
      if(uKind>4.5){ float e=sin(3.14159*uP);
        if(uKind<5.5){ vec2 d=normalize(uDir)*vec2(1.0/uAsp,1.0)*0.22*e; vec2 sh=normalize(uDir)*vec2(1.0/uAsp,1.0)*0.35;   // whip pan
          vec4 a=dirBlur(tA,vUv+sh*smoothstep(0.0,1.0,uP),d), b=dirBlur(tB,vUv-sh*(1.0-smoothstep(0.0,1.0,uP)),d); gl_FragColor=mix(a,b,smoothstep(0.4,0.6,uP)); return; }
        if(uKind<6.5){ vec2 ua=uC+(vUv-uC)/(1.0+uZoom*4.0*uP*uP), ub=uC+(vUv-uC)*(1.0+uZoom*2.0*(1.0-uP));            // crash zoom
          vec4 a=zoomBlur(tA,ua,uC,0.25*e), b=zoomBlur(tB,ub,uC,0.25*e); gl_FragColor=mix(a,b,smoothstep(0.45,0.7,uP)); return; }
        if(uKind<7.5){ float n=fbm(vUv*vec2(uAsp,1.0)*3.0+vec2(0.0,-uP*0.8));                                          // smoke fills the frame
          float m=smoothstep(n-0.12,n+0.12,uP*1.3-0.15); vec4 o=mix(texture2D(tA,vUv),texture2D(tB,vUv),m);
          float fog=smoothstep(0.0,0.5,e)*(0.55+0.45*fbm(vUv*5.0+uP)); o.rgb=mix(o.rgb,uFog,fog*0.9); gl_FragColor=o; return; }
        vec4 o=mix(texture2D(tA,vUv),texture2D(tB,vUv),smoothstep(0.35,0.65,uP)); o.rgb+=uFog*pow(e,1.5)*1.3; gl_FragColor=o; return; }   // flare
      vec2 d=(vUv-uC)*vec2(uAsp,1.0); float r=length(d);
      if(uKind<0.5){ gl_FragColor=mix(texture2D(tA,vUv),texture2D(tB,vUv),uP); return; }
      if(uKind<1.5){ float m=1.0-smoothstep(uR-uF,uR+uF,r);
        float k=uBulge*(1.0-uP)*(1.0-clamp(r*r/max(uR*uR,1e-5),0.0,1.0)); vec2 ub=uC+(vUv-uC)*(1.0-k);
        vec4 o=mix(texture2D(tA,vUv),texture2D(tB,ub),m);
        float ring=uRing*(1.0-smoothstep(0.0,uF*1.5+0.002,abs(r-uR-uRing*0.5)-uRing*0.5)); o.rgb=mix(o.rgb,vec3(0.105,0.08,0.125),clamp(ring,0.0,1.0)*step(0.001,uRing));
        float glint=smoothstep(0.92,1.0,1.0-abs(r/max(uR,1e-4)-0.82))*step(0.0,d.x*-1.0+d.y)*m*(1.0-uP)*0.35; o.rgb+=glint;
        gl_FragColor=o; return; }
      if(uKind<2.5){ float m=texture2D(tM,vUv).a; gl_FragColor=mix(texture2D(tA,vUv),texture2D(tB,vUv),m); return; }
      if(uKind<3.5){ float s=dot(vUv-0.5,normalize(uDir))+0.5; float m=smoothstep(uP-uF,uP+uF,1.0-s);
        gl_FragColor=mix(texture2D(tA,vUv),texture2D(tB,vUv),m); return; }
      vec2 ua=0.5+(vUv-0.5)*(1.0-uZoom*uP), ubb=0.5+(vUv-0.5)*(1.0+uZoom*(1.0-uP));
      gl_FragColor=mix(texture2D(tA,ua),texture2D(tB,ubb),smoothstep(0.0,1.0,uP)); }`);
  // downsample (4 taps) + unsharp mask + grade + vignette + fade + captions
  const finalM = sm({ tS: { value: null }, tCap: { value: null }, tOv: { value: null }, tB0: { value: null }, tB1: { value: null }, tB2: { value: null }, uBloom: { value: 0 }, uBloomTint: { value: new THREE.Vector3(1, 0.85, 0.65) }, uPx: { value: new THREE.Vector2(1 / W, 1 / H) }, uSharp: { value: sharpen }, uFade: { value: 1 }, uSat: { value: 1.1 },
    uTint: { value: new THREE.Vector3(1, 1, 1) }, uVig: { value: 0.14 }, uCapOn: { value: 1 }, uContrast: { value: 1.04 } },
  `uniform sampler2D tS,tCap,tOv,tB0,tB1,tB2; uniform float uBloom; uniform vec3 uBloomTint; uniform vec2 uPx; uniform float uSharp,uFade,uSat,uVig,uCapOn,uContrast; uniform vec3 uTint; varying vec2 vUv;
    vec3 tap(vec2 uv){ vec2 h=uPx*0.25; return 0.25*(texture2D(tS,uv+vec2(-h.x,-h.y)).rgb+texture2D(tS,uv+vec2(h.x,-h.y)).rgb+texture2D(tS,uv+vec2(-h.x,h.y)).rgb+texture2D(tS,uv+vec2(h.x,h.y)).rgb); }
    vec3 grade(vec3 c){ c*=uTint; c=1.22*c/(1.0+0.32*c); c=pow(clamp(c,0.0,1.0),vec3(1.0/2.2)); c=(c-0.5)*uContrast+0.5; c=c*c*(3.0-2.0*c)*0.35+c*0.65;   /* gentle S-curve: deeper shadows, richer mids (depth) */
      float l=dot(c,vec3(0.3,0.55,0.15)); return mix(vec3(l),c,uSat); }
    void main(){ vec3 c=tap(vUv);
      vec3 n=(tap(vUv+vec2(uPx.x,0.0))+tap(vUv-vec2(uPx.x,0.0))+tap(vUv+vec2(0.0,uPx.y))+tap(vUv-vec2(0.0,uPx.y)))*0.25;
      c=max(c+(c-n)*uSharp*2.0,0.0); if(uBloom>0.) c+=(texture2D(tB0,vUv).rgb*0.5+texture2D(tB1,vUv).rgb*0.8+texture2D(tB2,vUv).rgb*1.1)*uBloom*uBloomTint; c=grade(c);
      vec2 v=(vUv-0.5)*vec2(1.0,1.1); c*=1.0-uVig*smoothstep(0.45,0.95,length(v)*1.25); c*=uFade;
      vec4 ov=texture2D(tOv,vUv); c=mix(c,ov.rgb,ov.a);
      vec4 k=texture2D(tCap,vUv); c=mix(c,k.rgb,k.a*uCapOn);
      gl_FragColor=vec4(clamp(c,0.0,1.0),1.0); }`);

  const dummy = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1); dummy.needsUpdate = true;

  function renderShot(i, shot) {
    if (shot.prep) shot.prep();   // shots sharing one scene set their poses right before their own render
    const S = slot[i]; const cam = shot.camera;
    renderer.setRenderTarget(S.scene); renderer.setClearColor(shot.clear ?? clear, 1); renderer.render(shot.scene, cam);
    const f = shot.focus || { amt: 0 };
    if (!f.legacy) {   // lemo-opuscar path: AO + physical spiral DOF. f.amt scales the aperture, f.ao (0..1) the occlusion
      const aoAmt = f.ao ?? 0.85; let a = null; if (aoAmt > 0) { a = ao(shot.scene, cam);
        // the AO pass re-renders the scene with an override material: sprites, points and non-depth-writing see-through cards would occlude as
        // solid quads (dark squares), so they sit this pass out. character flats too (their full quads would print square contact shadows); the CoC pass then compares the scene depth with the AO pass depth and leaves AO off wherever something nearer (a flat) covers the occluded surface, so flats never show the AO of what stands behind them
        const hid = []; shot.scene.traverse((o) => { if (o.visible && (o.isSprite || o.isPoints || (o.material && !Array.isArray(o.material) && o.material.transparent))) { o.visible = false; hid.push(o); } });
        a.render(renderer, null, null); hid.forEach((o) => { o.visible = true; }); }
      const u = cocM.uniforms; u.tColor.value = S.scene.texture; u.tDepth.value = S.scene.depthTexture; u.tAO.value = a ? a.gtaoMap : null; u.tAOD.value = a ? a.depthTexture : null; u.aoAmt.value = a ? aoAmt : 0;
      u.focus.value = Math.max(0.05, f.dist || 5); u.range.value = f.range ?? 0.6; u.aper.value = f.aper ? f.aper * ss : 26 * (f.amt || 0) * ss * Math.max(0.3, f.dist || 5) / 5; u.maxCoc.value = (f.maxCoc || 22 * Math.min(1, (f.amt || 0) * 1.4)) * ss;
      u.near.value = cam.near; u.far.value = cam.far; const hz = shot.haze || {}; u.hazeDen.value = hz.den || 0; u.hazeStart.value = hz.start ?? 2; u.hazeMax.value = hz.max ?? 0.6; if (hz.col) u.hazeCol.value.set(...hz.col); pass(cocM, rtCoc);
      gatherM.uniforms.tIn.value = rtCoc.texture; gatherM.uniforms.maxCoc.value = u.maxCoc.value; pass(gatherM, S.dof); return S.dof.texture;
    }
    if (f.amt > 0) {
      copyM.uniforms.tSrc.value = S.scene.texture; pass(copyM, S.a[0]);
      for (let k = 0; k < 2; k++) {
        if (k === 1) { copyM.uniforms.tSrc.value = S.a[0].texture; pass(copyM, S.a[1]); }
        const w = S.a[k].width, h = S.a[k].height;
        for (let rep = 0; rep < 2; rep++) {
          blurM.uniforms.tSrc.value = S.a[k].texture; blurM.uniforms.uDir.value.set(1.6 / w, 0); pass(blurM, S.b[k]);
          blurM.uniforms.tSrc.value = S.b[k].texture; blurM.uniforms.uDir.value.set(0, 1.6 / h); pass(blurM, S.a[k]);
        }
      }
    }
    const u = dofM.uniforms; u.tC.value = S.scene.texture; u.tD.value = S.scene.depthTexture; u.tB1.value = S.a[0].texture; u.tB2.value = S.a[1].texture;
    u.uNear.value = cam.near; u.uFar.value = cam.far; u.uFocus.value = f.dist || 5; u.uRange.value = f.range ?? 0.6; u.uAmt.value = f.amt || 0;
    pass(dofM, S.dof); return S.dof.texture;
  }

  // opts: { A: shot, B?: shot, trans?: {kind: dissolve|iris|mask|wipe|zoom|whip|crash|smoke|flare, p, c, r, feather, ring, mask, dir, zoom, bulge, fog:[r,g,b]},
  //         overlay? (fx2d.js: speed lines, flashes), captions?, capOn, fade, sat, tint, vig, sharpen, contrast }
  // shot: { scene, camera, focus:{dist, range, amt}, clear }
  function frame(o) {
    let src = renderShot(0, o.A);
    if (o.B && o.trans) {
      const tb = renderShot(1, o.B); const T = o.trans, u = transM.uniforms;
      u.tA.value = src; u.tB.value = tb; u.uP.value = T.p;
      u.uKind.value = { dissolve: 0, iris: 1, mask: 2, wipe: 3, zoom: 4, whip: 5, crash: 6, smoke: 7, flare: 8 }[T.kind] ?? 0;
      if (T.fog) u.uFog.value.set(...T.fog);
      if (T.c) u.uC.value.set(T.c[0], T.c[1]); u.uR.value = T.r || 0; u.uF.value = T.feather ?? 0.004; u.uRing.value = T.ring || 0;
      u.uDir.value.set(...(T.dir || [1, 0])); u.uZoom.value = T.zoom ?? 0.18; u.uBulge.value = T.bulge ?? 0.35; u.tM.value = T.mask || dummy;
      pass(transM, rtComp); src = rtComp.texture;
    }
    const bl = o.bloom ?? 0.35; if (bl > 0) bloom(src, o.bloomTh ?? 0.82);
    const f = finalM.uniforms; f.tS.value = src; f.uBloom.value = bl; f.tB0.value = bA[0].texture; f.tB1.value = bA[1].texture; f.tB2.value = bA[2].texture; f.tCap.value = o.captions ? o.captions.tex : dummy; f.uCapOn.value = o.capOn ?? 1; f.tOv.value = o.overlay ? o.overlay.tex : dummy;
    f.uFade.value = o.fade ?? 1; f.uSat.value = o.sat ?? 1.1; f.uVig.value = o.vig ?? 0.14; f.uTint.value.set(...(o.tint || [1, 1, 1]));
    f.uSharp.value = o.sharpen ?? sharpen; f.uContrast.value = o.contrast ?? 1.04;
    pass(finalM, null);
  }
  return { canvas, renderer, W, H, SW, SH, ss, frame };
}

// world point → screen uv (0..1, y up) for centring an iris on an eye, a porthole, a door…
export function toUV(camera, P) { const v = P.clone().project(camera); return [v.x * 0.5 + 0.5, v.y * 0.5 + 0.5]; }
// pixels a world-size object covers on screen (for choosing billboard texture resolution)
export function screenPx(camera, P, sizeM, H) { const d = camera.position.distanceTo(P); return sizeM / (2 * d * Math.tan(camera.fov * Math.PI / 360)) * H; }
