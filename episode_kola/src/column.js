// The diagram world: the crust under Kola as a giant cut-open slab (1 unit = 1 km, surface at y = 0), painted strata
// (snow, gneiss, pink granite with cracks, wet bands 3–6 km, a fossil seam at 6 km, deeper granite), the 23 cm hole as a
// dark line, a drill string with a gold bit, a depth ruler with a live counter, the "expected basalt" ghost band at 7 km,
// a heat overlay (blue → orange → red with depth), and beside it the ocean: a water column down to the Challenger Deep
// (10.935 km) with a tiny submarine, for K05.
// API: drill(dKm) · heat(u) · basalt(u) · ocean(u) · counter(m) · wet(u) · fossils(u)
import * as THREE from './three.module.js';
import { mulberry } from './toon.js';
import { makeCard, signText } from './flat.js';
import { skyRig } from './sky.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const STD = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
const KM = 13.2, W = 5, T = 3;

function faceTex() { const c = document.createElement('canvas'); c.width = 1024; c.height = 2700; const g = c.getContext('2d'); const r = mulberry(5); const H = c.height, px = H / KM;
  const bands = [[0, 0.05, '#f4f6fc'], [0.05, 0.25, '#6a5a50'], [0.25, 1.4, '#8c8a96'], [1.4, 2.8, '#a07a84'], [2.8, 6.4, '#c88a84'], [6.4, 6.6, '#9a7a70'], [6.6, 9.5, '#d09a8a'], [9.5, KM, '#b87868']];
  for (const [a, b, col] of bands) { g.fillStyle = col; g.beginPath(); g.moveTo(0, a * px); for (let x = 0; x <= 1024; x += 32) g.lineTo(x, a * px + Math.sin(x * 0.01 + a) * 10 * (a > 0.1));
    for (let x = 1024; x >= 0; x -= 32) g.lineTo(x, b * px + Math.sin(x * 0.01 + b) * 10); g.closePath(); g.fill(); }
  // granite speckle + gneiss streaks
  for (let i = 0; i < 26000; i++) { const y = r() * H, k = y / px; if (k < 0.05) continue; g.fillStyle = r() < 0.45 ? 'rgba(255,240,240,0.5)' : r() < 0.6 ? 'rgba(40,30,40,0.45)' : 'rgba(240,170,170,0.4)'; g.fillRect(r() * 1024, y, 2 + r() * 5, 2 + r() * 4); }
  g.globalAlpha = 0.35; for (let i = 0; i < 120; i++) { const y = (0.25 + r() * 2.5) * px; g.strokeStyle = r() < 0.5 ? '#4a4450' : '#d8d4dc'; g.lineWidth = 2 + r() * 5; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 1024; x += 40) g.lineTo(x, y + Math.sin(x * 0.012 + i) * 14); g.stroke(); }
  g.globalAlpha = 1;
  // cracks (the wet zone 3–6 km is where they live)
  g.strokeStyle = '#3a2a30'; for (let i = 0; i < 70; i++) { let x = r() * 1024, y = (2.6 + r() * 4) * px; g.lineWidth = 2 + r() * 3; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 70; y += r() * 40; g.lineTo(x, y); } g.stroke(); }
  // fossil seam at 6 km: small pale specks
  for (let i = 0; i < 200; i++) { g.fillStyle = 'rgba(255,248,220,0.7)'; g.beginPath(); g.arc(r() * 1024, (5.85 + r() * 0.3) * px, 2 + r() * 3, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

export function buildColumn(scene) {
  const C = {}; const r = mulberry(17);
  const sky = skyRig(scene, { sunDir: V(-0.6, 0.15, -1), shadow: 16, center: V(0, -4, 0) }); sky.setMode('arctic'); C.sky = sky;
  const face = faceTex();
  const sideM = STD(0x7a6a72), topM = STD(0xf2f5fb);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(W, KM, T), [sideM, sideM, topM, sideM, new THREE.MeshStandardMaterial({ map: face, roughness: 0.8 }), sideM]);
  slab.position.set(0, -KM / 2, 0); slab.receiveShadow = true; scene.add(slab);
  // the ground beyond, so the top edge meets a snow field
  const snow = new THREE.Mesh(new THREE.PlaneGeometry(400, 200), STD(0xeef2fa)); snow.rotation.x = -Math.PI / 2; snow.position.set(0, 0, -T / 2 - 100); scene.add(snow);
  // a mini rig on top (diorama scale)
  const rig = new THREE.Group(); scene.add(rig); rig.position.set(0, 0, 0); C.rig = rig;
  const hallM = STD(0xa8b4a0); const hb = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.8), hallM); hb.position.set(-0.4, 0.2, -0.3); hb.castShadow = true; rig.add(hb);
  const der = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.22, 1.4, 4, 1, true), STD(0xd8402a, { wireframe: false, side: THREE.DoubleSide })); der.position.set(0, 0.7, 0); der.castShadow = true; rig.add(der);
  // the hole: a dark slot on the face, drill string + bit
  const holeM = new THREE.MeshBasicMaterial({ color: 0x120c10 }); const hole = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 1), holeM); hole.position.set(0, -0.5, T / 2 + 0.006); scene.add(hole); C.hole = hole;
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 8), STD(0x9aa0aa, { metalness: 0.6, roughness: 0.35 })); pipe.position.set(0, -0.5, T / 2 + 0.03); scene.add(pipe);
  const bit = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 12), STD(0xe8b030, { metalness: 0.9, roughness: 0.25 })); bit.rotation.x = Math.PI; scene.add(bit); C.bit = bit;
  const spark = new THREE.PointLight(0xffb060, 0, 1.6, 2); scene.add(spark);
  C.drill = (d) => { const dd = Math.max(0.02, d); hole.scale.y = dd; hole.position.y = -dd / 2; pipe.scale.y = dd; pipe.position.y = -dd / 2; bit.position.set(0, -dd - 0.05, T / 2 + 0.03); spark.position.set(0, -dd, T / 2 + 0.3); C.depth = dd; };
  C.spin = (t) => { bit.rotation.y = t * 20; spark.intensity = 0.6 + 0.4 * Math.sin(t * 40); };
  // depth ruler on the right of the slab
  const ruler = makeCard(1.1, KM, 256, (g, w, h) => { g.fillStyle = 'rgba(20,18,30,0.75)'; g.fillRect(w * 0.42, 0, w * 0.16, h); const px = h / KM;
    for (let k = 0; k <= 13; k++) { g.fillStyle = '#ffffff'; g.fillRect(w * 0.3, k * px - 3, w * 0.4, 6); if (k % 1 === 0) { g.font = '800 46px Montserrat'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.lineWidth = 8; g.strokeStyle = '#1b1420'; const s = k + ' km'; g.strokeText(s, w * 0.74, k * px); g.fillStyle = '#fff'; g.fillText(s, w * 0.74, k * px); } }
    for (let k = 0; k < 13 * 4; k++) { g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(w * 0.4, k * px / 4 - 1, w * 0.2, 2); } }, { transparent: true });
  ruler.position.set(W / 2 + 0.75, -KM / 2, T / 2); scene.add(ruler);
  // live counter that rides down with the bit
  const cnt = makeCard(2.4, 0.7, 768, () => {}, { transparent: true }); scene.add(cnt); C.cnt = cnt;
  C.counter = (m) => { cnt.userData.redraw((g, w, h) => { g.fillStyle = 'rgba(20,18,30,0.82)'; g.beginPath(); g.roundRect(6, 6, w - 12, h - 12, 40); g.fill(); g.lineWidth = 10; g.strokeStyle = '#ffd86a'; g.stroke();
      signText(g, Math.round(m).toLocaleString('en-US') + ' m', w / 2, h / 2 + 6, 128, '#ffe9a8', '#1b1420'); }); cnt.position.set(-W / 2 - 1.5, -(m / 1000), T / 2 + 0.1); };
  // the ghost basalt band at 7 km (expected) — dashed dark band with a label
  const bas = makeCard(W + 0.4, 0.8, 1024, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(25,22,30,0.82)'; g.fillRect(0, h * 0.2, w, h * 0.6); g.setLineDash([40, 26]); g.lineWidth = 12; g.strokeStyle = '#fff6c8'; g.strokeRect(8, h * 0.2, w - 16, h * 0.6);
    signText(g, 'บะซอลต์?', w * 0.42, h / 2 + 4, 78, '#ffffff', '#1b1420', 'Kanit, Montserrat'); }, { transparent: true }); bas.position.set(0, -7, T / 2 + 0.04); scene.add(bas); C.bas = bas;
  C.basalt = (u) => { bas.visible = u > 0.01; bas.material.opacity = u; };
  // water glints in the cracks (3–6 km)
  const glintT = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(220,245,255,1)'); gr.addColorStop(0.3, 'rgba(90,180,255,0.8)'); gr.addColorStop(1, 'rgba(60,140,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const glints = []; for (let i = 0; i < 60; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glintT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.position.set((r() - 0.5) * W * 0.95, -(3 + r() * 3), T / 2 + 0.05); s.scale.setScalar(0.12 + r() * 0.2); s.userData.ph = r() * 6; scene.add(s); glints.push(s); }
  C.wet = (u, t = 0) => glints.forEach((s) => { s.visible = u > 0.01; s.material.opacity = u * (0.5 + 0.5 * Math.sin(t * 6 + s.userData.ph)); });
  // fossil glows at 6 km
  const fos = []; for (let i = 0; i < 24; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glintT, color: 0xfff0b0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.position.set((r() - 0.5) * W * 0.9, -(5.85 + r() * 0.3), T / 2 + 0.05); s.scale.setScalar(0.18); s.userData.k = i / 24; scene.add(s); fos.push(s); }
  C.fossils = (u) => fos.forEach((s) => { const k = Math.max(0, Math.min(1, (u - s.userData.k * 0.7) * 4)); s.visible = k > 0; s.material.opacity = k; });
  // heat: a glowing overlay that fills the deep part of the face from the bottom up
  const heatTex = (() => { const c = document.createElement('canvas'); c.width = 8; c.height = 512; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, 'rgba(80,140,255,0.0)'); gr.addColorStop(0.35, 'rgba(255,170,60,0.35)'); gr.addColorStop(0.75, 'rgba(255,90,30,0.6)'); gr.addColorStop(1, 'rgba(255,40,20,0.8)'); g.fillStyle = gr; g.fillRect(0, 0, 8, 512); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const heat = new THREE.Mesh(new THREE.PlaneGeometry(W, KM), new THREE.MeshBasicMaterial({ map: heatTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); heat.position.set(0, -KM / 2, T / 2 + 0.02); scene.add(heat); C.heatM = heat;
  C.heat = (u) => { heat.visible = u > 0.01; heat.material.opacity = u; };
  // the ocean beside (K05): water column + trench walls + a tiny submarine at 10.9 km
  const ocean = new THREE.Group(); ocean.position.set(-W - 1.6, 0, 0); scene.add(ocean); C.oceanG = ocean;
  const waterTex = (() => { const c = document.createElement('canvas'); c.width = 8; c.height = 512; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#5ab8e8'); gr.addColorStop(0.3, '#2a6ab8'); gr.addColorStop(1, '#0a1640'); g.fillStyle = gr; g.fillRect(0, 0, 8, 512); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const water = new THREE.Mesh(new THREE.BoxGeometry(W, 10.935, T), new THREE.MeshStandardMaterial({ map: waterTex, roughness: 0.2, transparent: true, opacity: 0.92 })); water.position.y = -10.935 / 2; ocean.add(water);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, KM - 10.935, T), STD(0x5a4a5a)); floor.position.y = -10.935 - (KM - 10.935) / 2; ocean.add(floor);
  const sub = makeCard(1.0, 0.5, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#ffd040'; g.strokeStyle = '#2a1a16'; g.lineWidth = 14; g.beginPath(); g.ellipse(w * 0.45, h * 0.6, w * 0.38, h * 0.28, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.roundRect(w * 0.36, h * 0.15, w * 0.18, h * 0.3, 10); g.fill(); g.stroke();
    g.fillStyle = '#9ad8ff'; for (const x of [0.3, 0.45, 0.6]) { g.beginPath(); g.arc(w * x, h * 0.6, 18, 0, 7); g.fill(); g.stroke(); } g.fillStyle = '#ffd040'; g.beginPath(); g.moveTo(w * 0.85, h * 0.6); g.lineTo(w * 0.97, h * 0.35); g.lineTo(w * 0.97, h * 0.85); g.closePath(); g.fill(); g.stroke(); }, { transparent: true });
  sub.position.set(0, -10.6, T / 2 + 0.1); ocean.add(sub); C.sub = sub;
  const lab = (txt, y, x) => { const m = makeCard(3.2, 0.8, 1024, (g, w, h) => { g.clearRect(0, 0, w, h); signText(g, txt, w / 2, h / 2, 150, '#ffffff', '#1b1420'); }, { transparent: true }); m.position.set(x, y, T / 2 + 0.12); scene.add(m); return m; };
  C.labOcean = lab('10,935 m', -10.935 + 0.0, -W - 1.6); C.labOcean.position.y = -10.935 - 0.6; C.labHole = lab('12,262 m', -12.262 - 0.6, 0);
  C.ocean = (u) => { ocean.visible = u > 0.01; C.labOcean.visible = u > 0.5; C.labHole.visible = u > 0.5; };

  // ---- K08: a magnifier over the fossil seam with 24 stone plankton (radiolarians, forams, diatoms) popping in
  const lens = makeCard(3.4, 3.4, 1024, () => {}, { transparent: true }); lens.position.set(1.2, -6.0, T / 2 + 0.6); scene.add(lens); C.lens = lens;
  const plank = (g, x, y, s, k) => { g.save(); g.translate(x, y); g.lineWidth = 6; g.strokeStyle = '#3a2a24'; g.fillStyle = ['#efe2c4', '#e6d2b0', '#f4ead2'][k % 3];
    if (k % 3 === 0) { g.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283, rr = s * (i % 2 ? 0.75 : 1); g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.arc(0, 0, s * 0.4, 0, 7); g.stroke(); }
    else if (k % 3 === 1) { for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(i * s * 0.32 - s * 0.4, Math.sin(i) * s * 0.2, s * (0.22 + i * 0.08), 0, 7); g.fill(); g.stroke(); } }
    else { g.beginPath(); g.ellipse(0, 0, s, s * 0.45, k * 0.4, 0, 7); g.fill(); g.stroke(); for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * s * 0.25, -s * 0.3); g.lineTo(i * s * 0.25, s * 0.3); g.lineWidth = 3; g.stroke(); } }
    g.restore(); };
  C.lensDraw = (u) => { lens.visible = u > 0.01; if (!lens.visible) return; lens.userData.redraw((g, w, h) => { const cx = w / 2, cy = h * 0.45, R = w * 0.4;
    g.save(); g.beginPath(); g.arc(cx, cy, R, 0, 7); g.clip(); const bg = g.createRadialGradient(cx, cy, 0, cx, cy, R); bg.addColorStop(0, '#d8a090'); bg.addColorStop(1, '#a87064'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const n = Math.floor(24 * Math.min(1, u * 1.2)); for (let i = 0; i < n; i++) { const a = i * 2.399, rr = R * 0.85 * Math.sqrt((i + 0.5) / 24); plank(g, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 30 + (i % 4) * 6, i); } g.restore();
    g.lineWidth = 34; g.strokeStyle = '#2a1a16'; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke(); g.lineWidth = 20; g.strokeStyle = '#c8a040'; g.stroke();
    g.lineCap = 'round'; g.lineWidth = 64; g.strokeStyle = '#2a1a16'; g.beginPath(); g.moveTo(cx + R * 0.72, cy + R * 0.72); g.lineTo(cx + R * 1.12, cy + R * 1.12); g.stroke(); g.lineWidth = 44; g.strokeStyle = '#7a4a2a'; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(cx - R * 0.45, cy - R * 0.5, R * 0.22, R * 0.1, -0.6, 0, 7); g.fill();
    if (n >= 24) { g.fillStyle = '#1b1420'; g.beginPath(); g.roundRect(cx - 170, h * 0.88, 340, 100, 50); g.fill(); g.font = '800 70px Kanit, Montserrat'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffe9a8'; g.fillText('× 24', cx, h * 0.88 + 52); } }); };
  // ---- K11: a giant thermometer beside the bottom of the hole
  const th = makeCard(2.4, 6.4, 768, () => {}, { transparent: true }); th.position.set(W / 2 + 2.7, -9.3, T / 2 + 0.3); scene.add(th); C.thermo = th;
  C.thermoDraw = (deg) => { th.visible = deg > 0; if (!th.visible) return; th.userData.redraw((g, w, h) => { const cx = w * 0.62, top = h * 0.06, bot = h * 0.82, tw = 64, br = 100;
    const yOf = (d) => bot - (bot - top) * (d / 200); g.fillStyle = '#f4f2ee'; g.strokeStyle = '#2a1a16'; g.lineWidth = 18; g.beginPath(); g.roundRect(cx - tw, top - tw, tw * 2, bot - top + tw, tw); g.fill(); g.stroke();
    g.beginPath(); g.arc(cx, h * 0.88, br, 0, 7); g.fill(); g.stroke(); const hot = Math.min(1, Math.max(0, (deg - 100) / 80)); const col = `rgb(${200 + 55 * hot},${60 - 30 * hot},${40})`;
    g.fillStyle = col; g.beginPath(); g.arc(cx, h * 0.88, br * 0.72, 0, 7); g.fill(); g.fillRect(cx - tw * 0.5, yOf(deg), tw, h * 0.88 - yOf(deg));
    for (let d = 0; d <= 200; d += 20) { g.fillStyle = '#2a1a16'; g.fillRect(cx + tw * 0.6, yOf(d) - 3, d % 100 ? tw * 0.5 : tw * 0.9, 6); }
    for (const [d, label, c2] of [[100, '100°C', '#3a7ad8'], [180, '180°C', '#e8402a']]) { g.font = '800 84px Kanit, Montserrat'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.lineWidth = 16; g.strokeStyle = '#ffffff'; g.strokeText(label, cx - tw * 1.4, yOf(d)); g.fillStyle = c2; g.fillText(label, cx - tw * 1.4, yOf(d)); }
    if (hot > 0.95) { g.globalCompositeOperation = 'lighter'; const gl = g.createRadialGradient(cx, yOf(deg), 0, cx, yOf(deg), w * 0.5); gl.addColorStop(0, 'rgba(255,120,60,0.6)'); gl.addColorStop(1, 'rgba(255,60,20,0)'); g.fillStyle = gl; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'source-over'; } }); };
  // ---- K12: soft rock squeezing the bit (a wobbling blob around the bottom of the hole) and a bent drill string
  const blobG = new THREE.IcosahedronGeometry(0.7, 12); const bp0 = blobG.attributes.position.array.slice();
  const blobTex = face.clone(); blobTex.needsUpdate = true; blobTex.repeat.set(1, 0.08); blobTex.offset.set(0, 0.05); blobTex.wrapS = blobTex.wrapT = THREE.RepeatWrapping;
  const blob = new THREE.Mesh(blobG, new THREE.MeshStandardMaterial({ map: blobTex, color: 0xffc8b0, roughness: 0.6, emissive: 0xa03010, emissiveIntensity: 0.45 })); blob.position.set(0, -12.45, T / 2 + 0.25); blob.scale.set(1.1, 0.7, 0.45); scene.add(blob); C.blob = blob;
  C.squish = (u, t) => { blob.visible = u > 0.01; if (!blob.visible) return; const p = blobG.attributes.position; for (let i = 0; i < p.count; i++) { const x = bp0[i * 3], y = bp0[i * 3 + 1], z = bp0[i * 3 + 2];
      const k = 1 + u * (0.12 * Math.sin(x * 4 + t * 5) * Math.cos(y * 3 - t * 4) + 0.08 * Math.sin(z * 5 + t * 3)) - u * 0.25 * Math.exp(-(x * x) * 30) * (y > 0 ? 1 : 0); p.setXYZ(i, x * k, y * k, z * k); } p.needsUpdate = true; blobG.computeVertexNormals();
    bit.rotation.z = Math.PI + 0.6 * u * Math.sin(t * 3) * 0.3 + 0.5 * u; };
  // ---- K14: the rest of the crust under the column (to ~36 km) + a bracket "1/3"
  const deep = new THREE.Mesh(new THREE.BoxGeometry(W, 36 - KM, T), STD(0x6a4a5a)); deep.position.set(0, -KM - (36 - KM) / 2, 0); scene.add(deep); C.deep = deep;
  const deepFace = makeCard(W, 36 - KM, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#a86a6a'); gr.addColorStop(1, '#4a2a40'); g.fillStyle = gr; g.fillRect(0, 0, w, h); const rr = mulberry(3);
    for (let i = 0; i < 6000; i++) { g.fillStyle = rr() < 0.5 ? 'rgba(255,230,230,0.3)' : 'rgba(30,20,30,0.3)'; g.fillRect(rr() * w, rr() * h, 3, 3); } }, {});
  deepFace.position.set(0, -KM - (36 - KM) / 2, T / 2 + 0.01); scene.add(deepFace); C.deepFace = deepFace;
  const brace = makeCard(4, 36, 512, (g, w, h) => { g.clearRect(0, 0, w, h); const y12 = h * 12.262 / 36; g.lineCap = 'round';
    for (const [y0, y1, col, txt] of [[0, y12, '#ffd040', '1/3'], [0, h, '#ffffff', '']]) { g.strokeStyle = '#1b1420'; g.lineWidth = 34; g.beginPath(); g.moveTo(w * (txt ? 0.15 : 0.55), y0 + 10); g.lineTo(w * (txt ? 0.3 : 0.7), y0 + 10); g.lineTo(w * (txt ? 0.3 : 0.7), y1 - 10); g.lineTo(w * (txt ? 0.15 : 0.55), y1 - 10); g.stroke(); g.strokeStyle = col; g.lineWidth = 18; g.stroke(); }
    g.font = '800 120px Kanit, Montserrat'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.lineWidth = 20; g.strokeStyle = '#1b1420'; g.strokeText('1/3', w * 0.32, y12 / 2); g.fillStyle = '#ffe9a8'; g.fillText('1/3', w * 0.32, y12 / 2);
    g.save(); g.translate(w * 0.86, h / 2); g.rotate(-Math.PI / 2); g.strokeText('เปลือกโลก', 0, 0); g.fillStyle = '#ffffff'; g.fillText('เปลือกโลก', 0, 0); g.restore(); }, { transparent: true });
  brace.position.set(W / 2 + 3.2, -18, T / 2 + 0.2); scene.add(brace); C.brace = brace;
  C.crust = (u) => { deep.visible = deepFace.visible = brace.visible = u > 0.01; brace.material.opacity = u; };
  C.lensDraw(0); C.thermoDraw(0); C.squish(0, 0); C.crust(0);
  C.ocean(0); C.basalt(0); C.wet(0); C.fossils(0); C.heat(0); C.drill(0.05); C.counter(0);
  return C;
}
