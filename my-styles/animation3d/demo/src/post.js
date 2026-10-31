// Renderer + cinematic post: MSAA scene pass with depth, depth-of-field (two blur levels mixed by circle of confusion),
// bloom from the bright parts, filmic curve, per-shot grade (exposure, warm/cool tint, saturation), vignette, fade.
import * as THREE from './three.module.js';

export function makePost(canvas, W, H) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const depthTex = new THREE.DepthTexture(W, H); depthTex.type = THREE.UnsignedIntType;
  const rtMS = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const rtD = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, depthTexture: depthTex });   // depth pass (no MSAA)
  const mk = (w, h) => new THREE.WebGLRenderTarget(Math.max(2, w), Math.max(2, h), { type: THREE.HalfFloatType, depthBuffer: false });
  const hw = W >> 1, hh = H >> 1;
  const blurA = [mk(hw, hh), mk(hw >> 1, hh >> 1)], blurB = [mk(hw, hh), mk(hw >> 1, hh >> 1)];
  const lw = W >> 2, lh = H >> 2; const bA = [mk(lw, lh), mk(lw >> 1, lh >> 1), mk(lw >> 2, lh >> 2)], bB = [mk(lw, lh), mk(lw >> 1, lh >> 1), mk(lw >> 2, lh >> 2)];
  const qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); const qs = new THREE.Scene(); qs.add(quad);
  const VQ = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0);} ';
  const copy = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null } }, vertexShader: VQ, fragmentShader: 'uniform sampler2D tSrc; varying vec2 vUv; void main(){ gl_FragColor=texture2D(tSrc,vUv);} ' });
  const bright = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null }, uT: { value: 1.0 } }, vertexShader: VQ, fragmentShader: 'uniform sampler2D tSrc; uniform float uT; varying vec2 vUv; void main(){ vec3 c=texture2D(tSrc,vUv).rgb; float l=dot(c,vec3(0.3,0.55,0.15)); gl_FragColor=vec4(c*smoothstep(uT,uT+0.8,l),1.0);} ' });
  const blur = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } }, vertexShader: VQ,
    fragmentShader: `uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv; void main(){ vec3 s=texture2D(tSrc,vUv).rgb*0.2270;
      s+=(texture2D(tSrc,vUv+uDir*1.3846).rgb+texture2D(tSrc,vUv-uDir*1.3846).rgb)*0.3162; s+=(texture2D(tSrc,vUv+uDir*3.2308).rgb+texture2D(tSrc,vUv-uDir*3.2308).rgb)*0.0703; gl_FragColor=vec4(s,1.0);} ` });
  const final = new THREE.ShaderMaterial({
    uniforms: { tS: { value: null }, tD: { value: depthTex }, tB1: { value: null }, tB2: { value: null }, tG0: { value: null }, tG1: { value: null }, tG2: { value: null },
      uNear: { value: 0.1 }, uFar: { value: 1000 }, uFocus: { value: 5 }, uDof: { value: 0 }, uBloom: { value: 0.25 }, uExp: { value: 1 }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uSat: { value: 1.08 },
      uFade: { value: 1 }, uFlash: { value: 0 }, uVig: { value: 0.22 }, uAspect: { value: W / H } },
    vertexShader: VQ,
    fragmentShader: `uniform sampler2D tS,tD,tB1,tB2,tG0,tG1,tG2; uniform float uNear,uFar,uFocus,uDof,uBloom,uExp,uSat,uFade,uFlash,uVig,uAspect; uniform vec3 uTint; varying vec2 vUv;
    float lin(float d){ float z=d*2.0-1.0; return 2.0*uNear*uFar/(uFar+uNear-z*(uFar-uNear)); }
    void main(){
      vec3 c=texture2D(tS,vUv).rgb;
      if(uDof>0.0){ float z=lin(texture2D(tD,vUv).r); float coc=clamp(abs(1.0/max(z,0.01)-1.0/uFocus)*uDof,0.0,2.0);
        vec3 b1=texture2D(tB1,vUv).rgb, b2=texture2D(tB2,vUv).rgb; c=mix(c,b1,clamp(coc,0.0,1.0)); c=mix(c,b2,clamp(coc-1.0,0.0,1.0)); }
      vec3 g=texture2D(tG0,vUv).rgb*0.5+texture2D(tG1,vUv).rgb*0.8+texture2D(tG2,vUv).rgb*1.1; c+=g*uBloom;
      c*=uExp*uTint; c+=vec3(uFlash);
      c=c*(2.51*c+0.03)/(c*(2.43*c+0.59)+0.14);
      c=pow(clamp(c,0.0,1.0),vec3(1.0/2.2));
      float l=dot(c,vec3(0.3,0.55,0.15)); c=mix(vec3(l),c,uSat);
      c=mix(c*vec3(0.96,0.98,1.05),c*vec3(1.04,1.0,0.95),smoothstep(0.25,0.85,l));
      vec2 v=(vUv-0.5)*vec2(uAspect,1.0)*1.6; c*=1.0-uVig*smoothstep(0.35,1.05,length(v));
      gl_FragColor=vec4(clamp(c*uFade,0.0,1.0),1.0);
    }` });
  const pass = (m, t) => { quad.material = m; renderer.setRenderTarget(t); renderer.render(qs, qc); };
  function chain(src, A, B, first) { for (let i = 0; i < A.length; i++) { const m = i === 0 ? first : copy; m.uniforms.tSrc.value = i === 0 ? src : A[i - 1].texture; pass(m, A[i]);
    blur.uniforms.tSrc.value = A[i].texture; blur.uniforms.uDir.value.set(1 / A[i].width, 0); pass(blur, B[i]); blur.uniforms.tSrc.value = B[i].texture; blur.uniforms.uDir.value.set(0, 1 / A[i].height); pass(blur, A[i]); } }
  function render(scene, camera, o = {}) {
    const bg = o.clear ?? 0x000000;
    renderer.setClearColor(bg, 1);
    renderer.setRenderTarget(rtMS); renderer.render(scene, camera);
    const dof = o.dof || 0;
    if (dof > 0) { renderer.setRenderTarget(rtD); const sm = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false; renderer.render(scene, camera); renderer.shadowMap.autoUpdate = sm;
      chain(rtMS.texture, blurA, blurB, copy); blur.uniforms.tSrc.value = blurA[1].texture; blur.uniforms.uDir.value.set(2 / blurA[1].width, 0); pass(blur, blurB[1]); blur.uniforms.tSrc.value = blurB[1].texture; blur.uniforms.uDir.value.set(0, 2 / blurA[1].height); pass(blur, blurA[1]); }
    bright.uniforms.uT.value = o.bloomT ?? 1.0; chain(rtMS.texture, bA, bB, bright);
    const u = final.uniforms; u.tS.value = rtMS.texture; u.tB1.value = blurA[0].texture; u.tB2.value = blurA[1].texture; u.tG0.value = bA[0].texture; u.tG1.value = bA[1].texture; u.tG2.value = bA[2].texture;
    u.uNear.value = camera.near; u.uFar.value = camera.far; u.uFocus.value = o.focus ?? 10; u.uDof.value = dof; u.uBloom.value = o.bloom ?? 0.25; u.uExp.value = o.exp ?? 1;
    u.uTint.value.set(...(o.tint || [1, 1, 1])); u.uSat.value = o.sat ?? 1.08; u.uFade.value = o.fade ?? 1; u.uFlash.value = o.flash ?? 0; u.uVig.value = o.vig ?? 0.22;
    pass(final, null);
  }
  return { renderer, render };
}
