// Tunguska 1908 (no narration: Thai captions, music, SFX). Timeline from framemap.js (make_map.py). Pure function of t.
// Worlds: taiga (the forest at model scale, blast, the trading post), town (glowing night sky), globe (space: the incoming rock).
import * as THREE from './three.module.js';
import { DUR, FPS, SHOTS, TRANS, CUES } from './framemap.js';
import { clamp, mix, mulberry } from './toon.js';
import { createEngine } from './engine.js';
import { makeFlat, makeCard, setFlatTarget, signText } from './flat.js';
import { makeCaptions } from './captions.js';
import { makeOverlay, flash as flash2d, speedLines } from './fx2d.js';
import { pbrify } from './pbr.js';
import { haze } from './sky.js';
import { buildTaiga, AIR, CABIN, CORE, R as RF } from './taiga.js';
import { buildTown } from './town.js';
import { buildGlobe } from './globe.js';
import { SCIENTIST, FARMER, newspaper } from './cast.js';

await Promise.all(['800 40px Montserrat', '800 40px Kanit'].map((f) => document.fonts.load(f)));
const QS = new URLSearchParams(location.search);
const E = createEngine({ W: innerWidth, H: innerHeight, clear: 0x8090b0 }); setFlatTarget(E.SH);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sst = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
const lerpV = (a, b, u) => a.clone().lerp(b, u);
const SZ = 1.9;
const cam = {}; const camOf = (id, far = 2000, near = 0.05) => (cam[id] = cam[id] || new THREE.PerspectiveCamera(35, E.W / E.H, near, far));
function aim(c, pos, tgt, fov, roll = 0) { c.position.copy(pos); c.up.set(0, 1, 0); c.lookAt(tgt); if (roll) c.rotateZ(roll); c.fov = fov; c.aspect = E.W / E.H; c.updateProjectionMatrix(); c.updateMatrixWorld(true); }
const right = (c) => V(1, 0, 0).applyQuaternion(c.quaternion);
function keys(K, t) { let i = 0; while (i < K.length - 2 && t > K[i + 1][0]) i++; const a = K[i], b = K[i + 1]; const u = sst(a[0], b[0], t);
  return [lerpV(a[1], b[1], u), lerpV(a[2], b[2], u), mix(a[3], b[3], u), mix(a[4] || 0, b[4] || 0, u)]; }
const T0 = Object.fromEntries(SHOTS.map((s) => [s.id, s.t0])), DD = Object.fromEntries(SHOTS.map((s) => [s.id, s.t1 - s.t0]));
const loc = (id, t) => t - T0[id];
const orbit = (c, r, h, a, tgt, fov) => aim(c, V(Math.cos(a) * r, h, Math.sin(a) * r).add(tgt), tgt, fov);

// ================= worlds =================
let TG = null; function taiga() { if (TG) return TG; const S = new THREE.Scene(); const T = buildTaiga(S); if (!QS.has('toon')) pbrify(S, E.renderer, { env: 0.32 });
  const mk = (fn) => { const f = makeFlat(SZ, 1024, fn); S.add(f.mesh); S.add(f.shadow); f.shadow.material.color.set(0x2a3a1a); return f; };
  TG = { S, T, farmer: mk(FARMER), kulik: mk(SCIENTIST), porter: mk(FARMER) }; return TG; }
let TW = null; function town() { if (TW) return TW; const S = new THREE.Scene(); const W = buildTown(S); if (!QS.has('toon')) pbrify(S, E.renderer, { env: 0.15 });
  const f = makeFlat(SZ, 1024, FARMER); S.add(f.mesh); S.add(f.shadow); TW = { S, W, man: f }; return TW; }
let GL = null; function space() { if (GL) return GL; const S = new THREE.Scene(); const G = buildGlobe(S); G.ring.visible = false; G.arrow.visible = false; G.label.visible = false;
  const rockG = new THREE.IcosahedronGeometry(0.35, 1); const rp = rockG.attributes.position; for (let i = 0; i < rp.count; i++) { const k = 0.8 + 0.4 * Math.abs(Math.sin(i * 7.3)); rp.setXYZ(i, rp.getX(i) * k, rp.getY(i) * k * 0.8, rp.getZ(i) * k); } rockG.computeVertexNormals();
  const rock = new THREE.Mesh(rockG, new THREE.MeshStandardMaterial({ color: 0x8a7a70, roughness: 0.9, flatShading: true, emissive: 0xff7030, emissiveIntensity: 0 })); S.add(rock); G.rock = rock;
  const tailT = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.3, 'rgba(255,150,60,0.7)'); gr.addColorStop(1, 'rgba(255,80,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  G.tail = []; for (let j = 0; j < 24; j++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tailT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); S.add(s); G.tail.push(s); }
  const label = makeCard(5.2, 1.2, 1024, (g, w, h) => { g.clearRect(0, 0, w, h); signText(g, '54,000 กม./ชม.', w / 2, h / 2, 130, '#ffe9a8', '#1b1420', 'Kanit, Montserrat'); }, { transparent: true }); S.add(label); G.speed = label;
  // energy grid: hundreds of tiny flashes on a black card that fill the frame (T14)
  const grid = makeCard(8, 14.2, 1024, () => {}, { transparent: true }); S.add(grid); G.grid = grid;
  const full = new THREE.Mesh(new THREE.SphereGeometry(5, 96, 48), G.earth.children[0].material.clone()); full.material.side = THREE.FrontSide; S.add(full); G.full = full;
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(5.25, 64, 32), new THREE.MeshBasicMaterial({ color: 0x7ab8ff, transparent: true, opacity: 0.18, side: THREE.BackSide, depthWrite: false })); S.add(atmo); G.atmo = atmo;
  GL = { S, G }; return GL; }
const HZ = { ...haze('morning', 0.5), max: 0.45 }; const HZA = { ...haze('morning', 0.2), start: 60, max: 0.15 };

// ================= shots =================
const SHOT = {};
const tgReset = (W) => { const T = W.T; T.sky.setMode('morning'); T.fireball(0, 0); T.flash(0); T.shatter(0); T.calendar(0); for (const k of ['farmer', 'kulik', 'porter']) { W[k].mesh.visible = false; W[k].shadow.visible = false; } W.T.chair.position.set(0.6, 0.35, 1.0); W.T.chair.rotation.set(0, 0, 0); if (W.q) W.q.visible = false; if (W.dia) W.dia.visible = false; };
const show = (f) => { f.mesh.visible = true; f.shadow.visible = true; };
// T01 — high above the flattened forest, slowly turning: everything lies in a circle
SHOT.T01 = (t) => { const W = taiga(); const c = camOf('T01'); const u = loc('T01', t); orbit(c, 105 - 8 * u, 125 - 6 * u, 0.9 + 0.05 * u, V(0, 0, 0), 48);
  return { haze: HZA, scene: W.S, camera: c, prep: () => { tgReset(W); W.T.blast(1); }, focus: { amt: 0 } }; };
// T02 — low along the fallen trunks: all point away from one place
SHOT.T02 = (t) => { const W = taiga(); const c = camOf('T02'); const u = loc('T02', t);
  const [p, g, f] = keys([[0, V(62, 5, 34), V(20, 2, 8), 40], [DD.T02, V(52, 6, 30), V(10, 2, 4), 42]], u); aim(c, p, g, f);
  return { haze: HZ, scene: W.S, camera: c, prep: () => { tgReset(W); W.T.blast(1); }, focus: { dist: 30, range: 15, amt: 0.4 } }; };
// T03 — the centre: a peat bog, no crater — a big question mark hangs over it
SHOT.T03 = (t) => { const W = taiga(); const c = camOf('T03'); const u = loc('T03', t);
  const [p, g, f] = keys([[0, V(26, 16, 26), V(0, 2, 0), 40], [DD.T03, V(20, 12, 20), V(0, 3, 0), 38]], u); aim(c, p, g, f);
  const prep = () => { tgReset(W); W.T.blast(1); if (!W.q) { W.q = makeCard(10, 14, 512, (gg, w, h) => { gg.clearRect(0, 0, w, h); signText(gg, '?', w / 2, h / 2, 640, '#ffe9a8', '#1b1420'); }, { transparent: true }); W.S.add(W.q); }
    W.q.visible = true; W.q.position.set(0, 12 + Math.sin(t * 3) * 0.5, 0); W.q.quaternion.copy(c.quaternion); W.q.scale.setScalar(0.35 + 0.25 * sst(0.2, 0.8, u)); };
  return { haze: HZ, scene: W.S, camera: c, prep, focus: { amt: 0 } }; };
// T04 — before: the living taiga at morning; a blue-white fireball streaks across the sky
SHOT.T04 = (t) => { const W = taiga(); const c = camOf('T04'); const u = loc('T04', t); const p = 0.25 + 0.72 * u / DD.T04;
  const fbp = W.T.START.clone().lerp(AIR, p); const cp = V(110, W.T.H(110, 140) + 13, 140); aim(c, cp, cp.clone().lerp(fbp, 0.35).add(V(0, -14, 0)), 56);
  const prep = () => { tgReset(W); W.T.blast(0, t); W.T.fireball(p, 1); };
  return { haze: HZA, scene: W.S, camera: c, prep, focus: { amt: 0 } }; };
// T05 — 65 km away: a farmer on his porch; the flash, a wave of heat
SHOT.T05 = (t) => { const W = taiga(); const c = camOf('T05'); const u = loc('T05', t); const C = CABIN.clone().setY(W.T.cab.position.y);
  const [p, g, f] = keys([[0, C.clone().add(V(-3.5, 1.7, 6.5)), C.clone().add(V(0.6, 1.3, 0.8)), 40], [DD.T05, C.clone().add(V(-2.6, 1.5, 5.0)), C.clone().add(V(0.6, 1.3, 0.8)), 38]], u); aim(c, p, g, f);
  const k = sst(0.3, 0.6, u) * (1 - 0.6 * sst(1.2, DD.T05, u));
  const prep = () => { tgReset(W); W.T.blast(0, t); W.T.flash(0.4 * k); show(W.farmer); W.farmer.update(c, C.clone().add(V(0.6, 0.43 * SZ - 0.12, 1.55)), right(c), { legs: 'sit', eyes: u < 0.4 ? 'dot' : 'ring', mouth: u < 0.4 ? 'line' : 'open', sweat: u > 0.6, brow: u > 0.5 ? -0.2 : 0, blush: u > 0.6, arms: { L: [-150, 160], R: [150, 160] }, col: '#d8c8a0' }, C.y + 0.35, 0.3); };
  return { haze: HZ, scene: W.S, camera: c, prep, focus: { amt: 0 },
    overlay: (g, Wd, Hd) => { if (k > 0.01) { const gr = g.createRadialGradient(Wd * 0.7, 0, 0, Wd * 0.7, 0, Hd); gr.addColorStop(0, `rgba(255,245,220,${0.85 * k})`); gr.addColorStop(1, `rgba(255,170,90,${0.25 * k})`); g.fillStyle = gr; g.fillRect(0, 0, Wd, Hd); } } }; };
// T06 — the blast wave arrives: he is thrown off the chair, the chair tumbles
SHOT.T06 = (t) => { const W = taiga(); const c = camOf('T06'); const u = loc('T06', t); const C = CABIN.clone().setY(W.T.cab.position.y); const k = sst(0.15, 0.9, u);
  const shake = (1 - sst(0.2, 1.4, u)) * 0.12; const sh = V(Math.sin(t * 61) * shake, Math.sin(t * 47) * shake, 0);
  aim(c, C.clone().add(V(-2.6, 1.6, 6.4)).add(sh), C.clone().add(V(0.0, 1.0, 1.6)), 42);
  const prep = () => { tgReset(W); W.T.blast(0, t); show(W.farmer); W.T.chair.position.set(0.6 - 1.2 * k, 0.35 + 0.5 * Math.sin(Math.PI * k), 1.0 + 1.0 * k); W.T.chair.rotation.set(-1.6 * k, 0, 0.8 * k);
    W.farmer.update(c, C.clone().add(V(0.6 - 1.3 * k, 0.43 * SZ - 0.12 + 0.7 * Math.sin(Math.PI * k) - 0.15 * k, 1.55 + 0.5 * k)), right(c), { legs: k > 0.1 ? 'fly' : 'sit', eyes: 'ring', mouth: 'open', hairUp: k > 0.1, arms: { L: [-120, -80], R: [120, -80] }, col: '#d8c8a0' }, C.y + 0.35, 0.3, 1.1 * k); };
  return { haze: HZ, scene: W.S, camera: c, prep, focus: { amt: 0 },
    overlay: u > 0.1 && u < 0.7 ? (g, Wd, Hd) => speedLines(g, Wd, Hd, { cx: 0.85, cy: 0.35, amt: Math.min(1, (u - 0.1) / 0.1, (0.7 - u) / 0.2), frame: Math.floor(t * 30), col: '230,210,170' }) : null }; };
// T07 — a window hundreds of km away bursts inward
SHOT.T07 = (t) => { const W = taiga(); const c = camOf('T07'); const u = loc('T07', t); const C = CABIN.clone().setY(W.T.cab.position.y);
  const [p, g, f] = keys([[0, C.clone().add(V(3.4, 1.9, 4.2)), C.clone().add(V(1.4, 1.8, 0)), 40], [DD.T07, C.clone().add(V(3.0, 1.9, 3.8)), C.clone().add(V(1.4, 1.7, 0.4)), 40]], u); aim(c, p, g, f);
  const prep = () => { tgReset(W); W.T.blast(0, t); W.T.shatter(sst(0.4, 1.4, u) > 0 ? (u - 0.4) / 1.4 : 0); };
  return { haze: HZ, scene: W.S, camera: c, prep, focus: { amt: 0 } }; };
// T08 — nights later, far away in Europe: the sky glows; a man reads his newspaper in the street at night
SHOT.T08 = (t) => { const W = town(); const c = camOf('T08', 400); const u = loc('T08', t);
  const [p, g, f] = keys([[0, V(-1.5, 1.3, 6.5), V(0.5, 3.5, -8), 44], [DD.T08, V(-1.1, 1.2, 5.6), V(0.5, 4.5, -8), 46]], u); aim(c, p, g, f);
  const prep = () => { W.man.mesh.visible = true; W.man.update(c, V(0.9, 0.43 * SZ, -1.8), right(c), { eyes: 'dot', mouth: 'open', look: [0.2, -0.6], beard: false, hatCol: '#2a2a32', col: '#3a3a4a', arms: { L: [-150, 150], R: [150, 150] }, bend: { R: -40 }, hold: newspaper }, 0, 0.3); };
  return { haze: { den: 0.01, start: 6, max: 0.3, col: [0.7, 0.45, 0.6] }, scene: W.S, camera: c, prep, focus: { dist: 7, range: 2, amt: 0.4 } }; };
// T09 — 19 years: a calendar card over the flattened forest flips 1908 → 1927
SHOT.T09 = (t) => { const W = taiga(); const c = camOf('T09'); const u = loc('T09', t); orbit(c, 100, 118, 0.95 + 0.06 * u, V(0, 0, 0), 48);
  const yr = Math.round(mix(1908, 1927, sst(0.2, DD.T09 - 0.3, u)));
  const prep = () => { tgReset(W); W.T.blast(1); W.T.calendar(yr, (u * 8) % 1 * (yr < 1927 ? 1 : 0)); W.T.cal.position.copy(c.position).add(V(0, 0, 0)).lerp(V(0, 0, 0), 0.35); W.T.cal.quaternion.copy(c.quaternion); W.T.cal.scale.setScalar(0.9); };
  return { haze: HZA, scene: W.S, camera: c, prep, focus: { amt: 0 } }; };
// T10 — 1927: Kulik and a guide climb through the fallen trunks
SHOT.T10 = (t) => { const W = taiga(); const c = camOf('T10'); const u = loc('T10', t); const P = V(34, 0, 18); P.y = W.T.H(P.x, P.z);
  const dir = P.clone().setY(0).normalize().negate(); const walk = (k) => P.clone().addScaledVector(dir, k);
  const [p, g, f] = keys([[0, P.clone().add(V(4, 2.2, 9)), P.clone().add(V(-2, 1.4, 0)), 40], [DD.T10, P.clone().add(V(1, 2.0, 7)), P.clone().add(V(-4, 1.4, -2)), 40]], u); aim(c, p, g, f);
  const prep = () => { tgReset(W); W.T.blast(1); show(W.kulik); show(W.porter); const a = walk(u * 1.4), b = walk(u * 1.4 - 2.2).add(V(1.2, 0, 1.0));
    W.kulik.update(c, a.clone().add(V(0, 0.43 * SZ + 0.15 * Math.abs(Math.sin(t * 6)), 0)), right(c), { legs: 'walk', walk: t * 7, hat: 'cap', glasses: true, col: '#6a6a4a', hatCol: '#5a5a42', eyes: 'dot', mouth: 'line', look: [-0.6, 0], arms: { L: [-160, 150], R: [140, -40] } }, a.y, 0.3);
    W.porter.update(c, b.clone().add(V(0, 0.43 * SZ + 0.15 * Math.abs(Math.sin(t * 6 + 1)), 0)), right(c), { legs: 'walk', walk: t * 7 + 1.5, col: '#b8a888', eyes: 'dash', mouth: 'line', arms: { L: [-150, 160], R: [150, 160] } }, b.y, 0.3); };
  return { haze: HZ, scene: W.S, camera: c, prep, focus: { dist: 9, range: 2.5, amt: 0.45 } }; };
// T11 — the centre: no crater; the trees still stand, stripped bare like telegraph poles
SHOT.T11 = (t) => { const W = taiga(); const c = camOf('T11'); const u = loc('T11', t);
  const [p, g, f] = keys([[0, V(9, 1.6, 12), V(0, 4, 0), 50], [DD.T11, V(6, 1.4, 9), V(0, 6, 0), 56]], u); aim(c, p, g, f);
  const prep = () => { tgReset(W); W.T.blast(1); show(W.kulik); const a = V(4.2, 0, 5.0); W.kulik.update(c, a.clone().add(V(0, 0.43 * SZ, 0)), right(c), { hat: 'cap', glasses: true, col: '#6a6a4a', hatCol: '#5a5a42', eyes: u < 1.2 ? 'dot' : 'ring', mouth: u < 1.2 ? 'line' : 'open', look: [-0.3, -0.9], tilt: -0.1, arms: { L: [-160, 150], R: [100, -120] } }, 0, 0.3); };
  return { haze: HZ, scene: W.S, camera: c, prep, focus: { amt: 0 } }; };
// T12 — side-view diagram (a painted card): the burst 5–10 km up; straight down at the centre (trees stand), sideways outside (trees fall)
SHOT.T12 = (t) => { const W = taiga(); const c = camOf('T12'); const u = loc('T12', t); aim(c, V(0, 400, 60), V(0, 400, 0), 30); const k = sst(0.2, DD.T12 - 0.4, u);
  const prep = () => { tgReset(W); if (!W.dia) { W.dia = makeCard(18.1, 32.2, 1080, () => {}, {}); W.S.add(W.dia); } W.dia.visible = true; W.dia.position.set(0, 400, 0);
    W.dia.userData.redraw((g, w, h) => { const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#6a9ad8'); sky.addColorStop(0.7, '#cfe2f4'); sky.addColorStop(1, '#f4ecd8'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
      const gy = h * 0.74, bx = w / 2, by = h * 0.22; g.fillStyle = '#6a7a42'; g.fillRect(0, gy, w, h - gy); g.fillStyle = '#4a3a2a'; g.fillRect(0, gy + 40, w, h - gy - 40);
      // shock rings
      for (let i = 0; i < 4; i++) { const rr = (k * 1.3 - i * 0.12) * h * 0.7; if (rr <= 0) continue; g.strokeStyle = `rgba(255,240,210,${Math.max(0, 0.7 - i * 0.15) * (1 - k * 0.5)})`; g.lineWidth = 14; g.beginPath(); g.arc(bx, by, rr, 0, Math.PI); g.stroke(); }
      // trees: centre upright bare, outside fallen away from the centre (only where the wave has reached)
      const reach = Math.max(0, k * 1.3 * h * 0.7 - (gy - by)); for (let i = -14; i <= 14; i++) { const x = bx + i * w / 30; const dx = x - bx, d = Math.abs(dx); const hit = Math.hypot(dx, gy - by) < k * 1.3 * h * 0.7;
        g.save(); g.translate(x, gy); const lean = hit && d > w * 0.08 ? Math.sign(dx) * (Math.PI / 2 - 0.15) : 0; g.rotate(lean); g.fillStyle = '#5a3a26'; g.fillRect(-6, -120, 12, 120);
        if (!(hit && d <= w * 0.08)) { g.fillStyle = hit ? '#9a5a2a' : '#3a7a3a'; g.beginPath(); g.moveTo(0, -150); g.lineTo(-30, -50); g.lineTo(30, -50); g.closePath(); g.fill(); } g.restore(); }
      // arrows: down at the centre, sideways outside
      g.strokeStyle = '#d8302a'; g.fillStyle = '#d8302a'; g.lineWidth = 16; const arr = (x0, y0, x1, y1) => { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); const a = Math.atan2(y1 - y0, x1 - x0); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - 40 * Math.cos(a - 0.5), y1 - 40 * Math.sin(a - 0.5)); g.lineTo(x1 - 40 * Math.cos(a + 0.5), y1 - 40 * Math.sin(a + 0.5)); g.closePath(); g.fill(); };
      if (k > 0.25) { arr(bx, by + 120, bx, gy - 180); arr(bx - 80, by + 100, w * 0.12, gy - 120); arr(bx + 80, by + 100, w * 0.88, gy - 120); }
      // the burst + altitude bracket
      const fl = g.createRadialGradient(bx, by, 0, bx, by, 160 + 60 * (1 - k)); fl.addColorStop(0, '#ffffff'); fl.addColorStop(0.35, 'rgba(255,230,160,0.95)'); fl.addColorStop(1, 'rgba(255,160,60,0)'); g.fillStyle = fl; g.beginPath(); g.arc(bx, by, 220, 0, 7); g.fill();
      g.strokeStyle = '#1b1420'; g.lineWidth = 10; g.setLineDash([30, 20]); g.beginPath(); g.moveTo(w * 0.12, by); g.lineTo(w * 0.12, gy); g.stroke(); g.setLineDash([]); for (const y of [by, gy]) { g.beginPath(); g.moveTo(w * 0.07, y); g.lineTo(w * 0.17, y); g.stroke(); }
      g.save(); g.translate(w * 0.2, (by + gy) / 2); g.textAlign = 'left'; signText(g, '5–10 กม.', 170, 0, 92, '#ffe9a8', '#1b1420', 'Kanit, Montserrat'); g.restore(); }); };
  return { scene: W.S, camera: c, prep, focus: { amt: 0 } }; };
// T13 — space: a 50–80 m rock falls into the atmosphere at 54,000 km/h
SHOT.T13 = (t) => { const W = space(); const c = camOf('T13', 400); const u = loc('T13', t); const k = u / DD.T13;
  const [p, g, f] = keys([[0, V(9, 6, 15), V(2.5, 4.5, 0), 44], [DD.T13, V(7.5, 5.5, 12.5), V(2.6, 4.8, 1), 42]], u); aim(c, p, g, f);
  const prep = () => { const G = W.G; G.earth.visible = false; G.full.visible = true; G.atmo.visible = true; G.full.rotation.y = 2.2 + 0.05 * k; G.grid.visible = false; const A = V(9, 9, 4), B = V(2.6, 4.6, 2.6); const pos = A.clone().lerp(B, Math.min(1, k * 1.05));
    G.rock.visible = true; G.rock.position.copy(pos); G.rock.rotation.set(t * 3, t * 2, 0); G.rock.material.emissiveIntensity = 0.2 + 1.2 * k;
    G.tail.forEach((s, j) => { s.visible = true; s.position.copy(pos).addScaledVector(A.clone().sub(B).normalize(), 0.12 + j * 0.13); s.scale.setScalar((0.9 - j * 0.03) * (0.4 + k)); s.material.opacity = (1 - j / 24) * (0.3 + 0.7 * k); });
    G.speed.visible = k > 0.25; G.speed.position.copy(pos).add(V(-1.2, 1.4, 0)); G.speed.quaternion.copy(c.quaternion); G.speed.scale.setScalar(0.5); };
  return { scene: W.S, camera: c, prep, focus: { amt: 0 } }; };
// T14 — hundreds of Hiroshima-size flashes fill the frame and merge into one
SHOT.T14 = (t) => { const W = space(); const c = camOf('T14', 400); const u = loc('T14', t); aim(c, V(0, 0, 30), V(0, 0, 0), 30);
  const prep = () => { const G = W.G; G.earth.visible = false; G.full.visible = false; G.atmo.visible = false; G.rock.visible = false; G.tail.forEach((s) => { s.visible = false; }); G.speed.visible = false; G.grid.visible = true; G.grid.position.set(0, 0, 20); G.grid.quaternion.copy(c.quaternion);
    const n = Math.floor(200 * sst(0.1, 1.2, u)), merge = sst(1.3, DD.T14, u);
    G.grid.userData.redraw((g, w, h) => { g.fillStyle = '#0a0c1c'; g.fillRect(0, 0, w, h); const rr = mulberry(7);
      for (let i = 0; i < 200; i++) { const x = (i % 10 + 0.5) / 10 * w, y = (Math.floor(i / 10) + 0.5) / 20 * h * 0.82 + h * 0.06; const tx = mix(x, w / 2, merge), ty = mix(y, h / 2, merge);
        if (i >= n) { g.fillStyle = 'rgba(255,255,255,0.08)'; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); continue; }
        const gr = g.createRadialGradient(tx, ty, 0, tx, ty, 30); gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(0.4, 'rgba(255,190,90,0.8)'); gr.addColorStop(1, 'rgba(255,100,30,0)'); g.fillStyle = gr; g.beginPath(); g.arc(tx, ty, 30, 0, 7); g.fill(); }
      if (merge > 0.3) { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.9 * merge); gr.addColorStop(0, `rgba(255,255,240,${merge})`); gr.addColorStop(0.5, `rgba(255,190,100,${0.6 * merge})`); gr.addColorStop(1, 'rgba(255,100,30,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
      signText(g, 'ฮิโรชิมา × หลายร้อย', w / 2, h * 0.94, 64, '#ffe9a8', '#1b1420', 'Kanit, Montserrat'); }); };
  return { scene: W.S, camera: c, prep, focus: { amt: 0 } }; };
// T15 — back up high over the circle of fallen trees (matches T01 → loop)
SHOT.T15 = (t) => { const W = taiga(); const c = camOf('T15'); const u = loc('T15', t); const k = u / DD.T15; orbit(c, mix(85, 105, k), mix(100, 125, k), mix(0.8, 0.9, k), V(0, 0, 0), 48);
  return { haze: HZA, scene: W.S, camera: c, prep: () => { tgReset(W); W.T.blast(1); if (W.q) W.q.visible = false; if (W.dia) W.dia.visible = false; }, focus: { amt: 0 } }; };
// shots that share the taiga must hide each other's props
for (const id of ['T01', 'T02', 'T04', 'T05', 'T06', 'T07', 'T09', 'T10', 'T11']) { const f0 = SHOT[id]; SHOT[id] = (t) => { const sh = f0(t); const p0 = sh.prep; sh.prep = () => { if (TG) { if (TG.q) TG.q.visible = false; if (TG.dia) TG.dia.visible = false; } p0(); }; return sh; }; }

// ================= assembly =================
const PH = new THREE.Scene(); PH.background = new THREE.Color(0x202028); const phCam = new THREE.PerspectiveCamera(35, E.W / E.H, 0.1, 10);
const placeholder = () => ({ scene: PH, camera: phCam, prep: () => {}, focus: { amt: 0 } });
const KIND = { crash: 'crash', whip: 'whip', cut: null, 'dolly-blur': 'crash', dissolve: 'dissolve', 'push-cut': 'crash', 'match-dissolve': 'dissolve', flare: 'flare', smoke: 'smoke', 'fast-orbit': 'whip', 'pan-dissolve': 'dissolve', 'dissolve-descend': 'dissolve' };
const CAP = makeCaptions(E.W, E.H, CUES); const OV = makeOverlay(E.W, E.H);
const shotAt = (id, t) => (SHOT[id] ? SHOT[id](t) : placeholder(id));
function pick(t) { t = clamp(t, 0, DUR - 1e-4); const fr = Math.floor(t * FPS + 1e-6); const k = SHOTS.findIndex((s) => fr >= s.f0 && fr < s.f1);
  const tr = TRANS.find((x) => fr >= x.f0 && fr <= x.f1); let A, B = null, trans = null;
  if (tr && KIND[tr.kind]) { const i = TRANS.indexOf(tr); const p = (fr - tr.f0 + 0.5) / (tr.f1 - tr.f0 + 1); A = shotAt(SHOTS[i].id, t); B = shotAt(SHOTS[i + 1].id, t); trans = { kind: KIND[tr.kind], p, dir: [1, 0], zoom: 0.4, c: [0.5, 0.5] }; }
  else A = shotAt(SHOTS[k].id, t);
  return { t, A, B, trans }; }
function render(t0) { const { t, A, B, trans } = pick(t0);
  const ov = (B && trans.p > 0.5 ? B : A).overlay; if (ov) OV.draw(ov); else OV.clear();
  CAP.draw(t, !QS.has('nocap'));
  E.frame({ A, B, trans, overlay: OV, captions: CAP, vig: 0.26, sat: 1.12, contrast: 1.08, bloom: 0.35, bloomTh: 0.95 }); }
window.DUR = DUR; window.EV = []; window.CUES = CUES; window.render = render;
window.grabPNG = (t) => { render(t); return E.canvas.toDataURL('image/png').split(',')[1]; };
window.grab = (t) => { render(t); return E.canvas.toDataURL('image/jpeg', 0.95).split(',')[1]; };
render(0); window.READY = true;
window.__ovAt = (t0) => { const { t, A, B, trans } = pick(t0); const ov = (B && trans.p > 0.5 ? B : A).overlay; if (ov) OV.draw(ov); else OV.clear(); CAP.draw(t, true);
  const c = CUES.findIndex((q) => t >= q.t0 && t < q.t1); return { ov: !!ov, cue: c, ovc: OV.tex.image, capc: CAP.tex.image }; };
window.__shotAt = shotAt; window.__SHOTS = SHOTS; window.__TRANS = TRANS; window.__KIND = KIND; window.__cam = (id) => cam[id]; window.__E = E;
