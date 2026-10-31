// Outdoor world: sky dome with sun glow and painted clouds, environment light, animated harbour water,
// the stone quay with bollards, barrels and crates, the old town climbing the hill (gabled houses, a church spire,
// the castle), green islands across the water, gulls.
import * as THREE from './three.module.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rnd = (s) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
export function canvasTex(w, h, fn, rep = [1, 1]) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8; return t; }
export const QUAY = { z: 9.5, top: 1.6 };

export function makeSky(scene) {
  const u = { uSun: { value: V(-0.5, 0.35, -0.8).normalize() }, uTop: { value: new THREE.Color(0.18, 0.42, 0.85) }, uHor: { value: new THREE.Color(0.95, 0.85, 0.7) }, uSunC: { value: new THREE.Color(1.0, 0.85, 0.6) }, uDark: { value: 0 } };
  const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: u,
    vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
    fragmentShader: `uniform vec3 uSun,uTop,uHor,uSunC; uniform float uDark; varying vec3 vP;
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      void main(){ float y=max(vP.y,0.0); vec3 c=mix(uHor,uTop,pow(smoothstep(0.0,0.6,y),0.7));
        float s=max(dot(vP,uSun),0.0); c+=uSunC*(pow(s,8.0)*0.45+pow(s,400.0)*1.6);
        vec2 q=vP.xz/(vP.y+0.25)*1.6; float cl=n(q*1.2)*0.6+n(q*2.7)*0.3+n(q*6.0)*0.1; cl=smoothstep(0.55,0.8,cl)*smoothstep(0.02,0.25,y);
        c=mix(c,mix(vec3(1.0,0.97,0.92),uSunC,0.25)*1.15,cl*0.85);
        c=mix(c,c*vec3(0.25,0.3,0.45),uDark);
        gl_FragColor=vec4(c,1.0);} ` });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), m); scene.add(sky); return { sky, u };
}
export function makeEnv(renderer, skyU) {
  const s = new THREE.Scene(); const m = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: skyU,
    vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
    fragmentShader: 'uniform vec3 uTop,uHor,uSunC,uSun; varying vec3 vP; void main(){ float y=vP.y; vec3 c=y>0.0?mix(uHor,uTop,smoothstep(0.0,0.6,y)):mix(uHor*0.6,vec3(0.15,0.2,0.18),smoothstep(0.0,-0.4,y)); c+=uSunC*pow(max(dot(vP,uSun),0.0),12.0)*2.0; gl_FragColor=vec4(c,1.0);} ' }));
  s.add(m); const pm = new THREE.PMREMGenerator(renderer); const env = pm.fromScene(s, 0.02).texture; pm.dispose(); return env;
}

export function makeWater(scene, size = 1200) {
  // scrolling normal map from layered value noise, reflective standard material
  const N = 256; const c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'); const img = x.createImageData(N, N); const r = rnd(7);
  const hgt = new Float32Array(N * N); for (let o = 0; o < 5; o++) { const f = 4 << o, a = 1 / (1 << o); const g = []; for (let i = 0; i < f * f; i++) g.push(r());
    for (let yy = 0; yy < N; yy++) for (let xx = 0; xx < N; xx++) { const gx = xx / N * f, gy = yy / N * f; const ix = Math.floor(gx), iy = Math.floor(gy); const fx = gx - ix, fy = gy - iy; const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      const G = (i, j) => g[((j % f) * f + (i % f))]; hgt[yy * N + xx] += a * ((G(ix, iy) * (1 - sx) + G(ix + 1, iy) * sx) * (1 - sy) + (G(ix, iy + 1) * (1 - sx) + G(ix + 1, iy + 1) * sx) * sy); } }
  for (let yy = 0; yy < N; yy++) for (let xx = 0; xx < N; xx++) { const h = (i, j) => hgt[((j + N) % N) * N + ((i + N) % N)]; const dx = (h(xx + 1, yy) - h(xx - 1, yy)) * 3, dy = (h(xx, yy + 1) - h(xx, yy - 1)) * 3; const k = (yy * N + xx) * 4;
    const l = Math.hypot(dx, dy, 1); img.data[k] = (dx / l * 0.5 + 0.5) * 255; img.data[k + 1] = (dy / l * 0.5 + 0.5) * 255; img.data[k + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[k + 3] = 255; }
  x.putImageData(img, 0, 0); const nt = new THREE.CanvasTexture(c); nt.wrapS = nt.wrapT = THREE.RepeatWrapping; nt.repeat.set(size / 14, size / 14);
  const mat = new THREE.MeshStandardMaterial({ color: 0x1c4d5e, roughness: 0.12, metalness: 0.15, normalMap: nt, normalScale: new THREE.Vector2(0.55, 0.55), transparent: false });
  const w = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat); w.rotation.x = -Math.PI / 2; w.receiveShadow = true; scene.add(w);
  return { mesh: w, mat, update(t) { nt.offset.set(t * 0.012, t * 0.02); } };
}

export function makeHarbour(scene) {
  const r = rnd(11); const out = { crowdSpots: [] };
  const stoneT = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#9c9284'; x.fillRect(0, 0, w, h); for (let j = 0; j < 8; j++) for (let i = 0; i < 4; i++) { const ox = (j % 2) * 32; x.fillStyle = `rgb(${140 + r() * 40},${130 + r() * 35},${115 + r() * 30})`; x.fillRect(i * 64 + ox + 2, j * 32 + 2, 60, 28); } }, [20, 1]);
  const stoneM = new THREE.MeshStandardMaterial({ map: stoneT, roughness: 0.9 });
  const woodT = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#8a6440'; x.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { x.fillStyle = `rgba(${90 + r() * 40},${60 + r() * 20},35,0.7)`; x.fillRect(0, i * 32, w, 30); x.fillStyle = '#4a3220'; x.fillRect(0, i * 32 + 30, w, 2); } }, [30, 3]);
  const woodM = new THREE.MeshStandardMaterial({ map: woodT, roughness: 0.85 });
  // quay: stone wall rising from the water, plank top
  const wall = new THREE.Mesh(new THREE.BoxGeometry(220, 5, 8), stoneM); wall.position.set(0, QUAY.top - 2.5, QUAY.z + 4); wall.receiveShadow = wall.castShadow = true; scene.add(wall);
  const top = new THREE.Mesh(new THREE.BoxGeometry(220, 0.2, 14), woodM); top.position.set(0, QUAY.top, QUAY.z + 7); top.receiveShadow = true; scene.add(top);
  const cob = new THREE.Mesh(new THREE.PlaneGeometry(260, 120), new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#a99a83'; x.fillRect(0, 0, w, h); for (let k = 0; k < 600; k++) { x.fillStyle = `rgba(${120 + r() * 60},${110 + r() * 50},${95 + r() * 40},0.8)`; x.beginPath(); x.arc(r() * w, r() * h, 4 + r() * 5, 0, 7); x.fill(); } }, [60, 30]), roughness: 0.95 }));
  cob.rotation.x = -Math.PI / 2; cob.position.set(0, QUAY.top + 0.11, QUAY.z + 74); cob.receiveShadow = true; scene.add(cob);
  const darkM = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.8 });
  for (let i = -10; i <= 10; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 0.9, 10), darkM); b.position.set(i * 6, QUAY.top + 0.45, QUAY.z + 0.7); b.castShadow = true; scene.add(b); }
  // mooring lines from the ship to the bollards are added by the film when docked
  // barrels, crates
  const barrelM = new THREE.MeshStandardMaterial({ color: 0x7a5030, roughness: 0.7 }); const hoopM = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.6, roughness: 0.4 });
  for (let i = 0; i < 18; i++) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.1, 14), barrelM); g.add(b); for (const y of [-0.35, 0.35]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.035, 6, 18), hoopM); h.rotation.x = Math.PI / 2; h.position.y = y; g.add(h); }
    g.position.set(-60 + r() * 120, QUAY.top + 0.55, QUAY.z + 3 + r() * 9); g.traverse((o) => (o.castShadow = true)); scene.add(g); }
  for (let i = 0; i < 14; i++) { const s = 0.7 + r() * 0.5; const b = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), woodM); b.position.set(-60 + r() * 120, QUAY.top + s / 2, QUAY.z + 4 + r() * 9); b.rotation.y = r(); b.castShadow = true; scene.add(b); }
  // the town: rows of tall gabled houses climbing away from the quay
  const cols = [0xd99a4e, 0xc0563d, 0xe6c27a, 0xb8724a, 0xe2a35c, 0x9e4a36, 0xf0d39a, 0xcf7e4e];
  const winM = new THREE.MeshStandardMaterial({ color: 0x2a2a35, roughness: 0.2, metalness: 0.4, emissive: 0x000000 }); const roofM = new THREE.MeshStandardMaterial({ color: 0x7a3a2a, roughness: 0.8 });
  for (let row = 0; row < 7; row++) for (let i = 0; i < 26; i++) {
    const w = 5 + r() * 3, h = 9 + r() * 7 + row * 0.8, d = 8; const x = -75 + i * 6.2 + r() * 1.5, z = QUAY.z + 20 + row * 13 + r() * 2, base = QUAY.top + row * 3.2;
    const m = new THREE.MeshStandardMaterial({ color: cols[Math.floor(r() * cols.length)], roughness: 0.85 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, base + h / 2, z); b.castShadow = b.receiveShadow = true; scene.add(b);
    const gab = new THREE.Mesh(new THREE.CylinderGeometry(0, w * 0.72, 3.6, 4, 1), roofM); gab.rotation.y = Math.PI / 4; gab.scale.set(1, 1, d / w); gab.position.set(x, base + h + 1.8, z); gab.castShadow = true; scene.add(gab);
    if (row < 3) for (let fy = 0; fy < Math.floor(h / 3.2); fy++) for (let fx = 0; fx < 2; fx++) { const wi = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.4), winM); wi.position.set(x - w * 0.22 + fx * w * 0.44, base + 2.2 + fy * 3.1, z - d / 2 - 0.02); wi.rotation.y = Math.PI; scene.add(wi); }
  }
  // church spire and the castle with its tower
  const spireM = new THREE.MeshStandardMaterial({ color: 0x3d6b5a, roughness: 0.5, metalness: 0.3 });
  const tower = new THREE.Mesh(new THREE.BoxGeometry(8, 30, 8), new THREE.MeshStandardMaterial({ color: 0xc9b08a, roughness: 0.85 })); tower.position.set(18, 22, QUAY.z + 60); tower.castShadow = true; scene.add(tower);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(5.2, 26, 8), spireM); spire.position.set(18, 50, QUAY.z + 60); scene.add(spire);
  const castle = new THREE.Mesh(new THREE.BoxGeometry(46, 22, 18), new THREE.MeshStandardMaterial({ color: 0xd8c39a, roughness: 0.85 })); castle.position.set(-48, 26, QUAY.z + 78); castle.castShadow = true; scene.add(castle);
  const ct = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5, 34, 12), castle.material); ct.position.set(-36, 33, QUAY.z + 70); scene.add(ct); const cc = new THREE.Mesh(new THREE.ConeGeometry(5.6, 12, 12), spireM); cc.position.set(-36, 56, QUAY.z + 70); scene.add(cc);
  for (const [cx, cy, cz] of [[-36, 64, QUAY.z + 70]]) { const crown = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.3, 8, 16), new THREE.MeshStandardMaterial({ color: 0xffc04a, metalness: 0.9, roughness: 0.3 })); crown.position.set(cx, cy, cz); scene.add(crown); }
  // green islands and the far shore across the water
  const islandM = new THREE.MeshStandardMaterial({ color: 0x5f8a4a, roughness: 1 }); const treeM = new THREE.MeshStandardMaterial({ color: 0x3f6e3a, roughness: 1 });
  for (let i = 0; i < 9; i++) { const R = 30 + r() * 50; const isl = new THREE.Mesh(new THREE.SphereGeometry(R, 24, 12), islandM); isl.scale.y = 0.18; isl.position.set(-260 + i * 70 + r() * 30, -R * 0.08, -170 - r() * 120); scene.add(isl);
    for (let k = 0; k < 14; k++) { const tr = new THREE.Mesh(new THREE.ConeGeometry(2.5 + r() * 2, 9 + r() * 6, 7), treeM); tr.position.set(isl.position.x + (r() - 0.5) * R * 1.3, R * 0.1 + 3, isl.position.z + (r() - 0.5) * R * 0.8); scene.add(tr); } }
  // spots on the quay edge where the crowd stands (x, z)
  for (let i = 0; i < 70; i++) out.crowdSpots.push([-34 + (i % 35) * 2.0 + r() * 0.8, QUAY.z + 1.6 + Math.floor(i / 35) * 1.8 + r() * 0.5]);
  return out;
}

// gulls: little white V shapes circling
export function makeGulls(scene, n = 8) {
  const m = new THREE.MeshBasicMaterial({ color: 0xf6f6f6, side: THREE.DoubleSide }); const gs = [];
  for (let i = 0; i < n; i++) { const g = new THREE.Group(); for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.22), m); w.position.x = s * 0.45; g.add(w); } scene.add(g); gs.push({ g, ph: i * 1.3, R: 14 + i * 3, h: 18 + i * 2.5, cx: -10 + i * 4 }); }
  return { update(t) { gs.forEach((q) => { const a = t * 0.25 + q.ph; q.g.position.set(q.cx + Math.cos(a) * q.R, q.h + Math.sin(t * 0.7 + q.ph), -10 + Math.sin(a) * q.R); q.g.rotation.y = -a; const f = Math.sin(t * 9 + q.ph) * 0.5; q.g.children[0].rotation.z = f; q.g.children[1].rotation.z = -f; }); } };
}
