// The set: pre-dawn sky with stars, mesas, clouds, cracked desert floor cut by a gorge, rocks, sagebrush, a dead tree.
import * as THREE from './three.module.js';
import { mulberry, mix, clamp, limb } from './models.js';


export const VNOISE = /* glsl */`
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
vec2 h22(vec2 p){return vec2(h21(p),h21(p+17.3));}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float s=0.0,a=0.5;for(int i=0;i<5;i++){s+=a*vn(p);p=p*2.03+vec2(1.7,9.2);a*=0.5;}return s;}
// distance to the nearest voronoi edge: dried-mud cracks
float crack(vec2 p){ vec2 n=floor(p), f=fract(p); vec2 mg, mr; float md=8.0;
  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){ vec2 g=vec2(float(i),float(j)); vec2 o=h22(n+g); vec2 r=g+o-f; float d=dot(r,r); if(d<md){md=d;mr=r;mg=g;} }
  md=8.0; for(int j=-2;j<=2;j++)for(int i=-2;i<=2;i++){ vec2 g=mg+vec2(float(i),float(j)); vec2 o=h22(n+g); vec2 r=g+o-f; if(dot(mr-r,mr-r)>0.00001) md=min(md,dot(0.5*(mr+r),normalize(r-mr))); }
  return md; }`;

export function buildWorld(scene, renderer, FB) {
  const out = {};
  // ---- sky ----
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: { uFb: { value: new THREE.Vector3() }, uI: { value: 0 } },
    vertexShader: `varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `varying vec3 vD; uniform vec3 uFb; uniform float uI;
    void main(){ float y=vD.y;
      vec3 top=vec3(0.012,0.018,0.042), mid=vec3(0.045,0.06,0.115), hor=vec3(0.115,0.135,0.215);
      vec3 c=mix(hor,mid,smoothstep(0.0,0.12,y)); c=mix(c,top,smoothstep(0.12,0.7,y));
      // first light low in the east (+x), a thin rose band on the horizon
      float e=max(0.0,dot(normalize(vec3(vD.x,0.0,vD.z)),normalize(vec3(1.0,0.0,0.25))));
      c+=vec3(0.16,0.10,0.11)*pow(e,6.0)*exp(-max(y,0.0)*14.0)*0.9;
      vec3 fd=normalize(uFb-cameraPosition); float a=max(0.0,dot(vD,fd));
      c+=uI*(vec3(1.0,0.55,0.25)*pow(a,40.0)*0.9+vec3(1.0,0.62,0.32)*pow(a,12.0)*0.07);
      if(y<0.0) c=mix(c,vec3(0.02,0.018,0.016),smoothstep(0.0,-0.02,y));
      gl_FragColor=vec4(c,1.0);} `,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 24), skyMat); sky.frustumCulled = false; scene.add(sky);
  out.skyMat = skyMat;
  // stars, fading toward the horizon and toward the dawn side
  {
    const n = 2600, r = mulberry(91), pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const az = r() * Math.PI * 2, el = Math.asin(mix(0.03, 1, Math.pow(r(), 0.7)));
      pos.set([Math.cos(el) * Math.cos(az) * 1400, Math.sin(el) * 1400, Math.cos(el) * Math.sin(az) * 1400], i * 3);
      const dawn = Math.max(0, Math.cos(az - 0.24)) * (1 - Math.sin(el));
      const b = Math.pow(r(), 6) * 1.2 * clamp(Math.sin(el) * 4, 0, 1) * (1 - 0.8 * dawn);
      col.set([b * 0.85, b * 0.9, b], i * 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    out.starMat = new THREE.PointsMaterial({ size: 2.0, sizeAttenuation: false, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const s = new THREE.Points(g, out.starMat); s.frustumCulled = false; scene.add(s);
  }
  // mesas in three layers of haze
  {
    const r = mulberry(7);
    const mk = (z, x0, x1, hmax, col, ry = 0) => {
      const s = new THREE.Shape(); s.moveTo(x0, -5);
      let h = 0, tgt = 0; for (let x = x0; x <= x1; x += 4) { if (r() < 0.025) tgt = r() < 0.45 ? hmax * (0.35 + 0.65 * r()) : hmax * 0.08 * r(); h += (tgt - h) * (Math.abs(tgt - h) > hmax * 0.3 ? 0.35 : 0.08) + (r() - 0.5) * 1.0; h = Math.max(0, h); s.lineTo(x, h); }
      s.lineTo(x1, -5);
      const m = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color: col, fog: false }));
      m.position.z = z; m.rotation.y = ry; scene.add(m); return m;
    };
    mk(1000, -1300, 1300, 46, new THREE.Color(0.050, 0.058, 0.095), Math.PI);
  }
  // clouds
  out.cloudMats = [];
  {
    const r = mulberry(11);
    for (let i = 0; i < 10; i++) {
      const m2 = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false,
        uniforms: { uFb: { value: FB.pos }, uI: { value: 0 }, uSeed: { value: r() * 50 } },
        vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
        fragmentShader: VNOISE + `varying vec2 vUv; varying vec3 vW; uniform vec3 uFb; uniform float uI; uniform float uSeed;
        void main(){ vec2 p=vUv*vec2(6.0,2.2)+uSeed; float n=fbm(p)+0.5*fbm(p*2.7+3.0);
          float e=smoothstep(0.0,0.3,vUv.x)*smoothstep(1.0,0.7,vUv.x)*smoothstep(0.0,0.4,vUv.y)*smoothstep(1.0,0.55,vUv.y);
          float a=smoothstep(0.66,1.08,n)*e;
          float under=1.0-vUv.y;
          float d=distance(vW,uFb); float lit=uI*1.4/(1.0+pow(d/110.0,2.0));
          vec3 base=vec3(0.03,0.04,0.075)*(0.7+0.5*n)+vec3(0.06,0.04,0.05)*smoothstep(0.3,0.0,vUv.y)*0.4;
          vec3 c=base+vec3(1.0,0.72,0.45)*lit*(0.25+1.0*under)*(0.5+0.7*n);
          gl_FragColor=vec4(c,a*0.8); }`,
      });
      out.cloudMats.push(m2);
      const w = 110 + r() * 150, h = 26 + r() * 22;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m2);
      m.position.set(-200 + r() * 400, 55 + r() * 60, -90 - r() * 260);
      m.lookAt(0, 0, 40); m.rotateX(-0.9); scene.add(m);
    }
  }

  // ---- ground: standard lighting + shadows, procedural dried earth ----
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.98, metalness: 0 });
  groundMat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('void main() {', 'varying vec3 vWP;\nvoid main() {').replace('#include <project_vertex>', '#include <project_vertex>\n vWP=(modelMatrix*vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'varying vec3 vWP;\n' + VNOISE + `
      float gh(vec2 p){ float c=crack(p*3.4+fbm(p*0.8)*0.8); float cw=smoothstep(0.4,0.7,fbm(p*0.25)); return fbm(p*2.2)*0.6+fbm(p*9.0)*0.15; }
      vec3 gcol(vec2 p){ float n=fbm(p*0.12), n2=fbm(p*1.3), c=crack(p*3.4+fbm(p*0.8)*0.8), pe=vn(p*22.0); float cw=smoothstep(0.4,0.7,fbm(p*0.25));
        vec3 a=vec3(0.098,0.078,0.060), b=vec3(0.062,0.052,0.044), sand=vec3(0.13,0.108,0.084);
        vec3 col=mix(b,a,smoothstep(0.3,0.7,n)); col=mix(col,sand,smoothstep(0.55,0.8,n2)*0.6);
        col*=0.8+0.35*pe; col*=0.16;
        float rut=exp(-pow((abs(p.x-0.9-0.02*p.y)-0.78)/0.12,2.0))*0.35; col*=1.0-rut;
        return col; }
      void main() {`)
      .replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb = gcol(vWP.xz);')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { float e=0.03; vec2 p=vWP.xz; float h0=gh(p); float hx=gh(p+vec2(e,0.0))-h0, hz=gh(p+vec2(0.0,e))-h0;
          float k=0.22*smoothstep(40.0,3.0,length(vWP-cameraPosition));
          vec3 nw=normalize(vec3(-hx/e*0.035*k,1.0,-hz/e*0.035*k));
          normal=normalize((viewMatrix*vec4(nw,0.0)).xyz); }`);
  };
  // the coastal flat, ending at the shoreline (the sea is drawn separately)
  { const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 1820), groundMat); ground.rotation.x = -Math.PI / 2; ground.position.z = 1500 - 910; ground.receiveShadow = true; scene.add(ground); }
  // ---- props: keep the cowboy's mark and the camera lanes clear ----
  const clear = (x, z) => (Math.abs(x) < 3.0 && z > -3 && z < 14) || Math.hypot(x, z + 120) < 48 || z < -300 || (Math.abs(x) < 12 && z < 0 && z > -120);
  const r = mulberry(33);
  // rocks: one displaced boulder, instanced
  {
    const g = new THREE.IcosahedronGeometry(1, 3); const pa = g.attributes.position; const v = new THREE.Vector3();
    for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i); const n = 0.22 * Math.sin(v.x * 3.1 + 1.3) * Math.sin(v.y * 2.7 + 0.4) * Math.sin(v.z * 3.3 + 2.0) + 0.08 * Math.sin(v.x * 9 + v.z * 7); v.multiplyScalar(1 + n); v.y *= 0.62; if (v.y < -0.15) v.y = -0.15; pa.setXYZ(i, v.x, v.y, v.z); }
    g.computeVertexNormals();
    const N = 900; const im = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }), N);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
    let k = 0;
    while (k < N) {
      const x = mix(-45, 45, Math.pow(r(), 1) ), z = mix(-80, 80, r());
      const near = Math.exp(-Math.hypot(x, z - 4) / 18);
      if (r() > 0.25 + 0.75 * near) continue;
      if (clear(x, z)) continue;
      const sz = 0.04 + Math.pow(r(), 4) * 0.55;
      p.set(x, sz * 0.25, z); q.setFromEuler(new THREE.Euler(r() * 0.4, r() * 6.3, r() * 0.4)); s.set(sz * (0.8 + r() * 0.6), sz, sz * (0.8 + r() * 0.6));
      m.compose(p, q, s); im.setMatrixAt(k, m); c.setRGB(0.05 + r() * 0.025, 0.04 + r() * 0.015, 0.033 + r() * 0.01); im.setColorAt(k, c); k++;
    }
    im.castShadow = true; im.receiveShadow = true; scene.add(im);
  }
  // sagebrush: a twiggy cluster, instanced
  {
    const parts = []; const rr = mulberry(55);
    for (let i = 0; i < 26; i++) { const sg = new THREE.IcosahedronGeometry(0.16 + rr() * 0.1, 1); const a = rr() * 6.28, d = rr() * 0.35; sg.translate(Math.cos(a) * d, 0.16 + rr() * 0.28, Math.sin(a) * d); parts.push(sg); }
    for (let i = 0; i < 9; i++) { const st = new THREE.CylinderGeometry(0.008, 0.014, 0.35, 5); const a = rr() * 6.28; st.rotateZ(0.5 * Math.cos(a)); st.rotateX(0.5 * Math.sin(a)); st.translate(Math.cos(a) * 0.08, 0.15, Math.sin(a) * 0.08); parts.push(st); }
    const merged = mergeGeos(parts);
    const pa = merged.attributes.position; const v = new THREE.Vector3();
    for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i); v.x += 0.04 * Math.sin(v.y * 40 + v.z * 30); v.z += 0.04 * Math.sin(v.x * 37 + v.y * 23); pa.setXYZ(i, v.x, v.y, v.z); }
    merged.computeVertexNormals();
    const N = 260; const im = new THREE.InstancedMesh(merged, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1.0, flatShading: true }), N);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
    let k = 0;
    while (k < N) {
      const x = mix(-60, 60, r()), z = mix(-90, 70, r());
      if (clear(x, z) || Math.hypot(x, z) < 3.0) continue;
      if (r() > 0.4 + 0.6 * Math.exp(-Math.abs(x) / 25)) continue;
      const sz = 0.5 + r() * 0.9; p.set(x, 0, z); q.setFromEuler(new THREE.Euler(0, r() * 6.3, 0)); s.set(sz, sz * (0.7 + r() * 0.5), sz);
      m.compose(p, q, s); im.setMatrixAt(k, m); c.setRGB(0.035 + r() * 0.01, 0.038 + r() * 0.01, 0.026); im.setColorAt(k, c); k++;
    }
    im.castShadow = true; im.receiveShadow = true; scene.add(im);
  }
  return out;
}

function mergeGeos(geos) {
  let n = 0, ni = 0; const parts = geos.map((g) => { const ng = g.index ? g.toNonIndexed() : g; n += ng.attributes.position.count; return ng; });
  const pos = new Float32Array(n * 3); let o = 0;
  for (const g of parts) { pos.set(g.attributes.position.array, o); o += g.attributes.position.array.length; }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); return m;
}
