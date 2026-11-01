// The palace hall (shots S01–S06, S08–S10, S12): gothic stone hall, blue carpet with red diamond border, throne dais at the north
// end (z < 0) under a red canopy with gold valance + crown, gold gothic throne with tufted red back and a blue dragon shield,
// rose window above, columns + round arches along the sides, gold candelabras, braziers, wall sconces, halberd racks.
// Origin: floor centre of the hall; jar stands at (0,0,2.2) on the carpet; throne seat front at z ≈ -4.2.
import * as THREE from './three.module.js';
import { toon, outlined, mulberry } from './toon.js';
import { TEX, mat, shade } from './textures.js';
import { makeCard, signText } from './flat.js';
import * as P from './props.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const GOLD = () => new THREE.MeshPhongMaterial({ color: 0xe8b838, shininess: 80, specular: 0xfff0c0, emissive: 0x3a2600, emissiveIntensity: 0.35 });
function flameTex() { const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 92, 2, 32, 80, 60); gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(0.35, 'rgba(255,214,90,0.95)'); gr.addColorStop(0.7, 'rgba(255,130,30,0.5)'); gr.addColorStop(1, 'rgba(255,90,0,0)');
  g.fillStyle = gr; g.beginPath(); g.moveTo(32, 4); g.bezierCurveTo(60, 60, 58, 120, 32, 124); g.bezierCurveTo(6, 120, 4, 60, 32, 4); g.fill(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const FLAME = flameTex();
export function flame(s = 0.12) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: FLAME, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp.scale.set(s, s * 2, 1); return sp; }
function glowSprite(s = 0.6, col = 'rgba(255,190,90,') { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, col + '0.55)'); gr.addColorStop(1, col + '0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp.scale.set(s, s, 1); return sp; }

function candle(h = 0.25) { const g = new THREE.Group(); const c = P.tube(0.022, h, '#f6efdc', 0.003); c.position.y = h / 2; g.add(c); const f = flame(0.07); f.position.y = h + 0.06; g.add(f); const gl = glowSprite(0.4); gl.position.y = h + 0.05; g.add(gl); g.userData.flames = [f]; return g; }
export function candelabra(arms = 3, h = 1.9) {
  const g = new THREE.Group(); const m = GOLD(); const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.22, 0.12, 20), m); foot.position.y = 0.06; g.add(foot);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, h, 12), m); stem.position.y = h / 2; g.add(stem);
  for (let k = 0; k < 4; k++) { const k1 = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 10), m); k1.position.y = 0.4 + k * 0.38; g.add(k1); }
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.06, 12), m); cup.position.y = h; g.add(cup); const cd = candle(0.3); cd.position.y = h + 0.03; g.add(cd);
  for (const s of [-1, 1]) { const curve = new THREE.CatmullRomCurve3([V(0, h - 0.45, 0), V(s * 0.18, h - 0.42, 0), V(s * 0.3, h - 0.25, 0), V(s * 0.32, h - 0.12, 0)]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.018, 8), m)); const c2 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.03, 0.05, 12), m); c2.position.set(s * 0.32, h - 0.1, 0); g.add(c2);
    const cd2 = candle(0.26); cd2.position.set(s * 0.32, h - 0.08, 0); g.add(cd2); }
  for (const s of [-1, 1]) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.14, 10), m); t.rotation.z = Math.PI; t.position.set(s * 0.12, h - 0.5, 0); g.add(t); }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return g;
}
export function brazier() { const g = new THREE.Group(); const m = GOLD();
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; const l = P.rbox(0.04, 0.85, 0.04, '#3a2a1e', 0.01, 0.004); l.position.set(Math.cos(a) * 0.2, 0.42, Math.sin(a) * 0.2); l.rotation.set(Math.sin(a) * 0.18, 0, -Math.cos(a) * 0.18); g.add(l); }
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.42, 28, 12, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), m); bowl.scale.y = 0.45; bowl.position.y = 1.02; g.add(bowl);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.025, 8, 40), m); rim.rotation.x = Math.PI / 2; rim.position.y = 0.95; g.add(rim);
  g.userData.flames = []; for (let k = 0; k < 7; k++) { const f = flame(0.2 + (k % 3) * 0.05); const a = k / 7 * Math.PI * 2; f.position.set(Math.cos(a) * 0.22 * (k % 2), 1.12, Math.sin(a) * 0.22 * (k % 2)); g.add(f); g.userData.flames.push(f); }
  const gl = glowSprite(2.2); gl.position.y = 1.2; g.add(gl); return g; }

function roseWindow(D = 2.2) { return makeCard(D, D, 1024, (c, W) => { const R = W / 2; c.translate(R, R);
  c.fillStyle = '#6a6070'; c.beginPath(); c.arc(0, 0, R, 0, 7); c.fill(); c.fillStyle = '#4a4252'; c.beginPath(); c.arc(0, 0, R * 0.93, 0, 7); c.fill();
  const cols = ['#3a6ad6', '#f2b33a', '#3a6ad6', '#f2b33a', '#3a6ad6', '#f2b33a', '#3a6ad6', '#f2b33a'];
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; c.save(); c.rotate(a); const g = c.createRadialGradient(0, -R * 0.55, 10, 0, -R * 0.55, R * 0.25); g.addColorStop(0, '#fff'); g.addColorStop(0.3, cols[i]); g.addColorStop(1, shade(cols[i], -0.3));
    c.fillStyle = g; c.beginPath(); c.arc(0, -R * 0.56, R * 0.22, 0, 7); c.fill(); c.lineWidth = 12; c.strokeStyle = '#3a3440'; c.stroke(); c.restore(); }
  c.fillStyle = '#d23a2a'; c.beginPath(); c.arc(0, 0, R * 0.17, 0, 7); c.fill(); c.lineWidth = 14; c.strokeStyle = '#3a3440'; c.stroke();
  for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * Math.PI * 2; c.fillStyle = '#e8e0d0'; c.beginPath(); c.moveTo(Math.sin(a) * R * 0.22, -Math.cos(a) * R * 0.22); c.lineTo(Math.sin(a - 0.12) * R * 0.38, -Math.cos(a - 0.12) * R * 0.38); c.lineTo(Math.sin(a + 0.12) * R * 0.38, -Math.cos(a + 0.12) * R * 0.38); c.fill(); }
  c.lineWidth = 16; c.strokeStyle = '#3a3440'; c.beginPath(); c.arc(0, 0, R * 0.93, 0, 7); c.stroke(); }, { lit: true, transparent: true }); }

function fleur(c, x, y, s, col) { c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = col; c.beginPath(); c.moveTo(0, -30); c.quadraticCurveTo(12, -10, 0, 10); c.quadraticCurveTo(-12, -10, 0, -30); c.fill();
  for (const k of [-1, 1]) { c.beginPath(); c.moveTo(0, 6); c.quadraticCurveTo(k * 26, -12, k * 22, 8); c.quadraticCurveTo(k * 14, 4, 0, 12); c.fill(); } c.fillRect(-14, 10, 28, 6); c.beginPath(); c.moveTo(-4, 16); c.lineTo(4, 16); c.lineTo(0, 30); c.fill(); c.restore(); }
function damaskFleur(W, H, bg = '#8e1f22', fg = '#e2a73a') { return (c) => { const g = c.createLinearGradient(0, 0, W, 0); g.addColorStop(0, shade(bg, -0.15)); g.addColorStop(0.5, bg); g.addColorStop(1, shade(bg, -0.15)); c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (let j = 0; j < H / 70; j++) for (let i = 0; i < W / 70 + 1; i++) fleur(c, i * 70 + (j % 2) * 35, j * 70 + 30, 0.9, fg); }; }
function drapes(w, h, col = '#c0302e') { return makeCard(w, h, 512, (c, W, H) => { const n = 7; for (let i = 0; i < n; i++) { const x0 = i * W / n; const g = c.createLinearGradient(x0, 0, x0 + W / n, 0);
  g.addColorStop(0, shade(col, -0.3)); g.addColorStop(0.45, shade(col, 0.12)); g.addColorStop(1, shade(col, -0.3)); c.fillStyle = g; c.fillRect(x0, 0, W / n + 1, H); }
  c.strokeStyle = 'rgba(40,10,10,0.6)'; c.lineWidth = 3; for (let i = 1; i < n; i++) { c.beginPath(); c.moveTo(i * W / n, 0); c.lineTo(i * W / n, H); c.stroke(); }
  c.fillStyle = '#e2a73a'; c.fillRect(0, H - 14, W, 14); }, { lit: true }); }
function swagValance(w, h) { return makeCard(w, h, 1024, (c, W, H) => { c.clearRect(0, 0, W, H); const n = 4, sw = W / n;
  for (let i = 0; i < n; i++) { const x = i * sw; const g = c.createLinearGradient(0, 0, 0, H * 0.75); g.addColorStop(0, '#d8524a'); g.addColorStop(1, '#8e1f22'); c.fillStyle = g;
    c.beginPath(); c.moveTo(x, 0); c.lineTo(x + sw, 0); c.quadraticCurveTo(x + sw / 2, H * 1.25, x, 0); c.fill(); c.strokeStyle = '#e2a73a'; c.lineWidth = 12; c.beginPath(); c.moveTo(x, 6); c.quadraticCurveTo(x + sw / 2, H * 1.18, x + sw, 6); c.stroke();
    c.strokeStyle = 'rgba(80,10,10,0.5)'; c.lineWidth = 4; for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(x + 10, k * 12); c.quadraticCurveTo(x + sw / 2, H * (0.3 + k * 0.2), x + sw - 10, k * 12); c.stroke(); }
    c.fillStyle = '#e2a73a'; c.beginPath(); c.moveTo(x + sw - 10, 0); c.lineTo(x + sw + 10, 0); c.lineTo(x + sw + 16, H * 0.62); c.lineTo(x + sw - 16, H * 0.62); c.closePath(); c.fill(); c.beginPath(); c.arc(x + sw, H * 0.14, 14, 0, 7); c.fill(); } }, { lit: true, transparent: true }); }
function goldBand(w, h) { return makeCard(w, h, 1024, (c, W, H) => { c.fillStyle = '#b98a22'; c.fillRect(0, 0, W, H); c.fillStyle = '#e8b838'; c.fillRect(0, 4, W, 8); c.fillRect(0, H - 12, W, 8);
  for (let x = 30; x < W; x += 60) { c.strokeStyle = '#6a4a10'; c.lineWidth = 5; for (const [dx, dy] of [[0, -10], [0, 10], [-10, 0], [10, 0]]) { c.beginPath(); c.arc(x + dx, H / 2 + dy, 10, 0, 7); c.stroke(); } }
  for (let x = 30; x < W; x += 60) fleur(c, x, -2, 0.5, '#e8b838'); }, { lit: true }); }

export function throne() {
  const g = new THREE.Group(); const gm = new THREE.MeshPhongMaterial({ color: 0xa8782a, shininess: 60, specular: 0xd8b060, emissive: 0x1a0e00, emissiveIntensity: 0.3 });   // darker antique gold (S03 crop)
  const seatBack = makeCard(1.2, 1.9, 512, (c, W, H) => { c.fillStyle = '#7a4a1a'; c.fillRect(0, 0, W, H);
    c.save(); c.beginPath(); c.moveTo(W * 0.1, H); c.lineTo(W * 0.1, H * 0.35); c.quadraticCurveTo(W * 0.1, H * 0.08, W / 2, H * 0.05); c.quadraticCurveTo(W * 0.9, H * 0.08, W * 0.9, H * 0.35); c.lineTo(W * 0.9, H); c.closePath(); c.clip();
    const t = TEX.tufted('#b8312c', '#e8b84a').image; for (let y = 0; y < H; y += 128) for (let x = 0; x < W; x += 128) c.drawImage(t, x, y, 128, 128); c.restore();
    c.strokeStyle = '#e8b838'; c.lineWidth = 14; c.beginPath(); c.moveTo(W * 0.1, H); c.lineTo(W * 0.1, H * 0.35); c.quadraticCurveTo(W * 0.1, H * 0.08, W / 2, H * 0.05); c.quadraticCurveTo(W * 0.9, H * 0.08, W * 0.9, H * 0.35); c.lineTo(W * 0.9, H); c.stroke();
    // blue shield with a gold dragon
    c.save(); c.translate(W / 2, H * 0.3); c.fillStyle = '#2f5fc0'; c.strokeStyle = '#e8b838'; c.lineWidth = 8; c.beginPath(); c.moveTo(-60, -60); c.lineTo(60, -60); c.lineTo(60, 10); c.quadraticCurveTo(60, 60, 0, 80); c.quadraticCurveTo(-60, 60, -60, 10); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#e8b838'; c.beginPath(); c.moveTo(-30, 40); c.quadraticCurveTo(-10, -10, 20, -30); c.lineTo(30, -20); c.quadraticCurveTo(10, 0, 0, 40); c.closePath(); c.fill(); c.beginPath(); c.arc(22, -30, 12, 0, 7); c.fill();
    c.beginPath(); c.moveTo(-10, 0); c.lineTo(-40, -30); c.lineTo(-20, 10); c.fill(); c.restore();
    for (let k = 0; k < 3; k++) { c.fillStyle = ['#d23a2a', '#2fae7a', '#3a6ad6'][k]; c.beginPath(); c.arc(W / 2 - 24 + k * 24, H * 0.14, 8, 0, 7); c.fill(); } }, { lit: true });
  seatBack.scale.set(1.15, 1.1, 1); seatBack.position.set(0, 1.6, -0.32); g.add(seatBack);
  // gothic frame: two pinnacled posts + pointed gable with a round medallion
  for (const s of [-1, 1]) { const post = outlined(new THREE.BoxGeometry(0.16, 2.9, 0.18), gm, 0.008); post.position.set(s * 0.72, 1.45, -0.3); g.add(post);
    const pin = outlined(new THREE.ConeGeometry(0.09, 0.5, 4), gm, 0.006); pin.position.set(s * 0.72, 3.15, -0.3); pin.rotation.y = Math.PI / 4; g.add(pin);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), gm); knob.position.set(s * 0.72, 3.43, -0.3); g.add(knob);
    const arm = outlined(P.rboxGeo(0.14, 0.12, 0.7, 0.04), gm, 0.006); arm.position.set(s * 0.65, 0.95, 0.05); g.add(arm);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 10), gm); ball.position.set(s * 0.65, 1.05, 0.42); g.add(ball); }
  const gable = makeCard(1.6, 1.0, 512, (c, W, H) => { c.clearRect(0, 0, W, H); c.fillStyle = '#c8962a'; c.beginPath(); c.moveTo(0, H); c.lineTo(W / 2, 0); c.lineTo(W, H); c.closePath(); c.fill();
    c.strokeStyle = '#6a4a10'; c.lineWidth = 10; c.stroke(); c.fillStyle = '#8a5a14'; c.beginPath(); c.arc(W / 2, H * 0.55, H * 0.2, 0, 7); c.fill(); c.strokeStyle = '#f2c040'; c.lineWidth = 12; c.stroke();
    c.fillStyle = '#2a1a10'; c.beginPath(); c.arc(W / 2, H * 0.55, H * 0.1, 0, 7); c.fill(); for (const x of [0.25, 0.75]) { c.strokeStyle = '#6a4a10'; c.lineWidth = 6; for (const [dx, dy] of [[0, -14], [-12, 8], [12, 8]]) { c.beginPath(); c.arc(W * x + dx, H * 0.78 + dy, 12, 0, 7); c.stroke(); } }
    fleur(c, W / 2, -2, 1.2, '#f2c040'); }, { lit: true, transparent: true });
  gable.scale.setScalar(0.7); gable.position.set(0, 2.85, -0.28); g.add(gable);
  const seat = outlined(P.rboxGeo(1.3, 0.22, 0.75, 0.05), toon(new THREE.Color('#b8312c')), 0.008); seat.position.set(0, 0.62, 0.05); g.add(seat);
  const base = outlined(P.rboxGeo(1.45, 0.52, 0.8, 0.04), gm, 0.008); base.position.set(0, 0.26, 0.02); g.add(base);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g;
}

export function buildHall(scene, { seed = 3 } = {}) {
  const H = {}; const r = mulberry(seed);
  const W = 9, L = 22, WH = 8.5;
  const stoneW = mat(TEX.stone('#a9a0b6'), 6, 6);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, L), mat(TEX.pavers('#9a92a4'), 6, 12)); floor.rotation.x = -Math.PI / 2; floor.position.z = 1; floor.receiveShadow = true; scene.add(floor);
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 12.5), mat(TEX.rugBorder('#22357a', '#b8312c'), 1, 7)); carpet.rotation.x = -Math.PI / 2; carpet.position.set(0, 0.006, 2.0); carpet.receiveShadow = true; scene.add(carpet);
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(L, WH), stoneW); w.rotation.y = -s * Math.PI / 2; w.position.set(s * W / 2, WH / 2, 1); w.receiveShadow = true; scene.add(w); }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, WH), stoneW); back.position.set(0, WH / 2, -L / 2 + 1); back.receiveShadow = true; scene.add(back);
  const front = back.clone(); front.rotation.y = Math.PI; front.position.z = L / 2 + 1; scene.add(front);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, L), mat(TEX.planks('#4a3a34', 8), 4, 8)); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, WH, 1); scene.add(ceil);
  // columns + arches on both sides
  const colM = mat(TEX.stone('#b3abc0'), 1, 4);
  for (const s of [-1, 1]) for (let k = 0; k < 7; k++) { const z = -7.6 + k * 2.6;
    const col = outlined(new THREE.CylinderGeometry(0.32, 0.36, 5.2, 24), colM, 0.012); col.position.set(s * 3.2, 2.6, z); scene.add(col);
    const cap = outlined(P.rboxGeo(0.95, 0.4, 0.95, 0.05), toon(new THREE.Color('#bfb6c8')), 0.01); cap.position.set(s * 3.2, 5.35, z); scene.add(cap);
    const bse = outlined(P.rboxGeo(0.9, 0.3, 0.9, 0.04), toon(new THREE.Color('#a69db3')), 0.01); bse.position.set(s * 3.2, 0.15, z); scene.add(bse);
    if (k < 6) { const arch = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.22, 10, 32, Math.PI), colM); arch.position.set(s * 3.2, 5.55, z + 1.3); arch.rotation.y = Math.PI / 2; scene.add(arch);
      const recess = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 5.6), toon(new THREE.Color('#5e566a'))); recess.position.set(s * (W / 2 - 0.02), 2.8, z + 1.3); recess.rotation.y = -s * Math.PI / 2; scene.add(recess); } }
  // tall arched lattice windows with warm light + heraldic banners and round shields between the columns
  const win = () => makeCard(1.5, 3.4, 512, (c, Wp, Hp) => { c.clearRect(0, 0, Wp, Hp); c.save(); c.beginPath(); c.moveTo(0, Hp); c.lineTo(0, Wp / 2); c.arc(Wp / 2, Wp / 2, Wp / 2, Math.PI, 0); c.lineTo(Wp, Hp); c.closePath(); c.clip();
      const g = c.createLinearGradient(0, 0, 0, Hp); g.addColorStop(0, '#fff0c8'); g.addColorStop(1, '#e8b870'); c.fillStyle = g; c.fillRect(0, 0, Wp, Hp);
      c.strokeStyle = '#4a3a34'; c.lineWidth = 7; for (let k = -Hp; k < Hp * 2; k += 46) { c.beginPath(); c.moveTo(0, k); c.lineTo(Wp, k + Wp); c.stroke(); c.beginPath(); c.moveTo(Wp, k); c.lineTo(0, k + Wp); c.stroke(); } c.restore();
      c.lineWidth = 22; c.strokeStyle = '#6a5e6a'; c.beginPath(); c.moveTo(4, Hp); c.lineTo(4, Wp / 2); c.arc(Wp / 2, Wp / 2, Wp / 2 - 4, Math.PI, 0); c.lineTo(Wp - 4, Hp); c.stroke(); }, { transparent: true });
  const heraldry = () => makeCard(1.0, 2.3, 256, (c, Wp, Hp) => { c.clearRect(0, 0, Wp, Hp); c.fillStyle = '#1f2a5a'; c.beginPath(); c.moveTo(0, 0); c.lineTo(Wp, 0); c.lineTo(Wp, Hp * 0.86); c.lineTo(Wp / 2, Hp); c.lineTo(0, Hp * 0.86); c.closePath(); c.fill();
      for (let k = 0; k < 40; k++) { c.fillStyle = 'rgba(255,230,160,0.7)'; c.fillRect((k * 37) % Wp, (k * 61) % (Hp * 0.8), 3, 3); }
      c.fillStyle = '#b8262a'; c.beginPath(); c.moveTo(Wp * 0.2, Hp * 0.25); c.lineTo(Wp * 0.8, Hp * 0.25); c.lineTo(Wp * 0.8, Hp * 0.55); c.quadraticCurveTo(Wp * 0.8, Hp * 0.7, Wp / 2, Hp * 0.78); c.quadraticCurveTo(Wp * 0.2, Hp * 0.7, Wp * 0.2, Hp * 0.55); c.closePath(); c.fill();
      c.strokeStyle = '#e8b838'; c.lineWidth = 6; c.stroke(); c.fillStyle = '#e8b838'; c.beginPath(); c.arc(Wp / 2, Hp * 0.48, Wp * 0.1, 0, 7); c.fill(); c.fillRect(0, 0, Wp, 8); }, { lit: true, transparent: true });
  const shield = (cols) => makeCard(0.7, 0.7, 256, (c, Wp) => { c.clearRect(0, 0, Wp, Wp); for (let q = 0; q < 4; q++) { c.fillStyle = cols[q % 2]; c.beginPath(); c.moveTo(Wp / 2, Wp / 2); c.arc(Wp / 2, Wp / 2, Wp * 0.46, q * Math.PI / 2, (q + 1) * Math.PI / 2); c.fill(); }
      c.lineWidth = 14; c.strokeStyle = '#8a5130'; c.beginPath(); c.arc(Wp / 2, Wp / 2, Wp * 0.46, 0, 7); c.stroke(); c.fillStyle = '#c9ced6'; c.beginPath(); c.arc(Wp / 2, Wp / 2, Wp * 0.09, 0, 7); c.fill(); }, { lit: true, transparent: true });
  for (const s2 of [-1, 1]) for (let k = 0; k < 6; k++) { const z = -6.3 + k * 2.6;
    const w = win(); w.position.set(s2 * (W / 2 - 0.03), 3.6, z); w.rotation.y = -s2 * Math.PI / 2; scene.add(w);
    if (k % 2 === 0) { const h = heraldry(); h.position.set(s2 * (W / 2 - 0.05), 5.4, z + 1.3); h.rotation.y = -s2 * Math.PI / 2; scene.add(h); }
    else { const sh = shield(k % 4 === 1 ? ['#d23a2a', '#f2c040'] : ['#2f5fc0', '#f2efe4']); sh.position.set(s2 * (W / 2 - 0.05), 1.7, z + 1.3); sh.rotation.y = -s2 * Math.PI / 2; scene.add(sh); } }
  // wall sconces between columns
  H.flames = [];
  for (const s of [-1, 1]) for (let k = 0; k < 6; k++) { const sc = new THREE.Group(); const arm = P.rbox(0.06, 0.06, 0.3, '#3a2a1e', 0.01, 0.004); arm.position.z = 0.15; sc.add(arm);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.04, 0.12, 12), GOLD()); cup.position.set(0, 0.06, 0.3); sc.add(cup); const f = flame(0.14); f.position.set(0, 0.2, 0.3); sc.add(f); H.flames.push(f);
    const gl = glowSprite(1.4); gl.position.set(0, 0.2, 0.3); sc.add(gl); sc.position.set(s * (W / 2 - 0.02), 2.6, -5.0 + k * 2.6); sc.rotation.y = -s * Math.PI / 2; scene.add(sc); }
  // throne dais at the north end
  const dz = -7.0; H.thronePos = V(0, 0.5, dz - 0.15);
  for (let k = 0; k < 2; k++) { const st = outlined(P.rboxGeo(4.2 - k * 0.8, 0.25, 2.6 - k * 0.6, 0.03), mat(TEX.stone('#b8b0c4'), 3, 2), 0.01); st.position.set(0, 0.125 + k * 0.25, dz - 0.4 + k * 0.2); st.receiveShadow = true; scene.add(st); }
  const dcarpet = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.8), mat(TEX.rugBorder('#22357a', '#b8312c'), 1, 1)); dcarpet.rotation.x = -Math.PI / 2; dcarpet.position.set(0, 0.507, dz - 0.2); scene.add(dcarpet);
  const TH = throne(); TH.scale.setScalar(0.82); TH.position.set(0, 0.5, dz - 0.35); scene.add(TH); H.throne = TH;
  // canopy: damask backdrop, drapes, gold valance with fleurs + crown, swags with tassels, chains
  const bd = makeCard(3.6, 4.6, 1024, (c, Wp, Hp) => damaskFleur(Wp, Hp)(c), { lit: true }); bd.position.set(0, 2.8, dz - 1.05); scene.add(bd);
  for (const s of [-1, 1]) { const dr = drapes(0.85, 4.6); dr.position.set(s * 1.75, 2.8, dz - 0.95); dr.rotation.y = s * -0.15; scene.add(dr); }
  const band = goldBand(4.0, 0.42); band.position.set(0, 5.25, dz - 0.75); scene.add(band);
  const top = outlined(P.rboxGeo(4.1, 0.08, 0.6, 0.02), GOLD(), 0.006); top.position.set(0, 5.5, dz - 0.95); scene.add(top);
  const sw = swagValance(3.9, 0.7); sw.position.set(0, 4.75, dz - 0.72); scene.add(sw);
  const crown = new THREE.Group(); const cb = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.22, 24, 1, true), Object.assign(GOLD(), { side: THREE.DoubleSide })); crown.add(cb);
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; const pt = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 6), GOLD()); pt.position.set(Math.cos(a) * 0.33, 0.2, Math.sin(a) * 0.33); crown.add(pt);
    const gem = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), new THREE.MeshPhongMaterial({ color: ['#d23a2a', '#2fae7a', '#3a6ad6'][k % 3], shininess: 120 })); gem.position.set(Math.cos(a) * 0.36, 0, Math.sin(a) * 0.36); crown.add(gem); }
  crown.position.set(0, 5.7, dz - 0.9); scene.add(crown);
  for (const s of [-1, 1]) { const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 3, 6), new THREE.MeshPhongMaterial({ color: 0x2a2a30 })); ch.position.set(s * 1.9, 7.0, dz - 0.9); scene.add(ch); }
  const rose = roseWindow(2.4); rose.position.set(0, 6.3, -L / 2 + 1.02); scene.add(rose);
  const archBack = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.25, 10, 40, Math.PI), colM); archBack.position.set(0, 5.4, -L / 2 + 1.05); scene.add(archBack);
  // candelabras flanking the throne, braziers near the jar, halberd stand
  H.cands = []; for (const s of [-1, 1]) { const cd = candelabra(); cd.position.set(s * 2.35, 0.5, dz - 0.2); scene.add(cd); H.cands.push(cd); }
  H.braziers = []; for (const [x, z] of [[-2.2, 1.2], [2.3, 0.6], [-2.6, 4.5]]) { const b = brazier(); b.position.set(x, 0, z); scene.add(b); H.braziers.push(b); }
  for (let k = 0; k < 2; k++) { const hb = new THREE.Group(); const pole = P.rbox(0.035, 2.4, 0.035, '#5a3a22', 0.01, 0.004); pole.position.y = 1.2; hb.add(pole);
    const bl = makeCard(0.4, 0.3, 256, (c, Wp, Hp) => { c.clearRect(0, 0, Wp, Hp); c.fillStyle = '#d8dde6'; c.beginPath(); c.moveTo(Wp * 0.5, Hp * 0.2); c.quadraticCurveTo(0, 0, Wp * 0.05, Hp * 0.9); c.quadraticCurveTo(Wp * 0.3, Hp * 0.4, Wp * 0.5, Hp * 0.6); c.fill(); }, { transparent: true, lit: true });
    bl.position.set(-0.18, 2.3, 0); hb.add(bl); hb.position.set(-2.9 + k * 0.25, 0, -4.8); scene.add(hb); }
  // lights
  scene.add(new THREE.HemisphereLight(0xe8dcff, 0x6a4a3a, 1.05));
  const key = new THREE.DirectionalLight(0xffe2b8, 1.7); key.position.set(-4, 9, 6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0005; key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 }); scene.add(key); scene.add(key.target); key.target.position.set(0, 1, 0); H.key = key;
  for (const [x, y, z] of [[-2.2, 1.6, 1.2], [2.3, 1.6, 0.6], [0, 3, -6.5]]) { const pl = new THREE.PointLight(0xffb060, 5, 7, 1.5); pl.position.set(x, y, z); scene.add(pl); }
  scene.background = new THREE.Color(0x3a3240);
  H.flick = (t) => { for (const f of [...H.flames, ...H.braziers.flatMap((b) => b.userData.flames)]) { const k = 1 + 0.12 * Math.sin(t * 23 + f.id) + 0.06 * Math.sin(t * 41 + f.id * 3); f.scale.y = f.userData.sy ??= f.scale.y; f.scale.y = f.userData.sy * k; } };
  return H;
}
