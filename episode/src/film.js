// Shop interior still (ani3d-sitck detail test): a packed corner store, shopkeeper behind the counter, customer with a basket.
// Built to hit the detail-density target (strong edges >= 1.2 %): every shelf filled with labelled goods, price tags, signs.
import * as THREE from './three.module.js';
import { clamp, mulberry, toon, outlined } from './toon.js';
import { createEngine } from './engine.js';
import { makeFlat, makeCard, signText, setFlatTarget } from './flat.js';
import { drawStick, INK } from './stick.js';
import { V, lights } from './set.js';
import { makeCaptions } from './captions.js';
import { makeOverlay, speedLines } from './fx2d.js';
import { toUV } from './engine.js';
import { CUES } from './cues.js';
import { TEX, mat, shade } from './textures.js';
import * as P from './props.js';

await Promise.all(['800 40px Montserrat', '800 40px Kanit'].map((f) => document.fonts.load(f)));
const QS = new URLSearchParams(location.search);
const E = createEngine({ W: innerWidth, H: innerHeight, clear: 0x2a1a16 }); setFlatTarget(E.SH);
const S = new THREE.Scene(); S.background = new THREE.Color(0x3a2a22);
const L = lights(S, { sky: 0xffe6c8, ground: 0x8a5a3a, hemi: 1.15, sun: 1.6, sunCol: 0xffd7a0, ext: 4 });
L.aim(V(0, 1, -0.5), V(-4.5, 5, 3));
for (const [x, y, z] of [[-0.8, 2.5, -0.3], [0.9, 2.5, 0.4]]) { const pl = new THREE.PointLight(0xffc98a, 6, 6, 1.6); pl.position.set(x, y, z); S.add(pl); }
const R = mulberry(77);
const pick = (a) => a[Math.floor(R() * a.length)];

// ---------- room ----------
const W = 5.2, D = 4.2, Hh = 3.0;
{ const fl = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mat(TEX.planks('#a8693e', 7), 4, 3)); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; S.add(fl);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, Hh), mat(TEX.plaster('#e9d2a8'), 4, 2)); back.position.set(0, Hh / 2, -D / 2); back.receiveShadow = true; S.add(back);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(D, Hh), mat(TEX.plaster('#e2c99c'), 3, 2)); left.rotation.y = Math.PI / 2; left.position.set(-W / 2, Hh / 2, 0); left.receiveShadow = true; S.add(left);
  const right = left.clone(); right.rotation.y = -Math.PI / 2; right.position.x = W / 2; S.add(right);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mat(TEX.planks('#7a4a2a', 9), 3, 3)); ceil.rotation.x = Math.PI / 2; ceil.position.y = Hh; S.add(ceil);
  for (let i = 0; i < 4; i++) { const b = P.rbox(W, 0.14, 0.16, '#5a361e', 0.02); b.position.set(0, Hh - 0.07, -D / 2 + 0.6 + i * 1.1); S.add(b); }
  const wain = P.rbox(W, 0.9, 0.04, '#6f8f5a', 0.01); wain.position.set(0, 0.45, -D / 2 + 0.03); S.add(wain); }
const rugM = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.4), mat(TEX.rugBorder('#1f3a7a', '#c23b2e'), 1, 2)); rugM.rotation.x = -Math.PI / 2; rugM.rotation.z = Math.PI / 2; rugM.position.set(0.2, 0.005, 0.7); S.add(rugM);

// ---------- goods ----------
const BRANDS = ['MAMA', 'NOM', 'KAO', 'SODA', 'TEA', 'RICE', 'MILK', 'JAM', 'POP', 'SALT', 'น้ำปลา', 'ข้าว', 'ชา', 'ขนม'];
const COLS = ['#d63a3a', '#2f6fd6', '#f4c430', '#2e9d5a', '#f39a2b', '#7b4bb0', '#f3efe6', '#e86a7a', '#1f3a8a', '#8a5130', '#5aa79a'];
const labelMats = []; const LAB = (i) => labelMats[i % labelMats.length];
for (let i = 0; i < 18; i++) {
  const bg = COLS[i % COLS.length], fg = COLS[(i * 5 + 3) % COLS.length] === bg ? '#fff' : COLS[(i * 5 + 3) % COLS.length]; const name = BRANDS[i % BRANDS.length];
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256; const g = cv.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 256); g.fillStyle = fg; g.fillRect(0, 150, 256, 40); g.fillStyle = shade(bg, -0.2); g.fillRect(0, 230, 256, 26);
  g.beginPath(); g.arc(128, 92, 52, 0, 7); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 8; g.strokeStyle = fg; g.stroke();
  g.fillStyle = shade(fg, -0.1); g.beginPath(); for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 - Math.PI / 2; g.lineTo(128 + Math.cos(a) * 30, 92 + Math.sin(a) * 30); g.lineTo(128 + Math.cos(a + 0.63) * 13, 92 + Math.sin(a + 0.63) * 13); } g.fill();
  signText(g, name, 128, 170, name.length > 4 ? 30 : 38, '#fff', INK);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  labelMats.push({ face: toon(new THREE.Color('#ffffff'), { map: t }), side: toon(new THREE.Color(bg)), top: toon(new THREE.Color(shade(bg, 0.1))) });
}
function box(w, h, d, i) { const m = LAB(i); return outlined(new THREE.BoxGeometry(w, h, d), [m.side, m.side, m.top, m.side, m.face, m.side], 0.0035); }
function can(r, h, i) { const m = LAB(i); const g = new THREE.Group(); const b = outlined(new THREE.CylinderGeometry(r, r, h, 20), [m.face, toon(new THREE.Color('#c9ced6')), toon(new THREE.Color('#9aa0a8'))], 0.003); b.position.y = h / 2; b.rotation.y = -Math.PI / 2; g.add(b); return g; }
function jar(r, h, fill) { const g = new THREE.Group();
  const inside = outlined(new THREE.CylinderGeometry(r * 0.9, r * 0.9, h * 0.8, 18), toon(new THREE.Color(fill)), 0); inside.position.y = h * 0.42; g.add(inside);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20, 1, true), new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, shininess: 90, specular: 0xffffff })); glass.position.y = h / 2; g.add(glass);
  const lid = outlined(new THREE.CylinderGeometry(r * 1.02, r * 1.02, h * 0.14, 18), toon(new THREE.Color(pick(['#d63a3a', '#f4c430', '#2f6fd6', '#2e9d5a']))), 0.003); lid.position.y = h + h * 0.06; g.add(lid); return g; }
function bottle(r, h, i) { const m = LAB(i); const g = new THREE.Group(); const glassCol = pick(['#3f8a4a', '#7a3a1a', '#d0e8f0', '#c23b2e']);
  const b = outlined(new THREE.CylinderGeometry(r, r, h * 0.62, 16), [m.face, toon(new THREE.Color(glassCol)), toon(new THREE.Color(glassCol))], 0.003); b.position.y = h * 0.31; b.rotation.y = -Math.PI / 2; g.add(b);
  const sh = outlined(new THREE.CylinderGeometry(r * 0.35, r, h * 0.16, 16), toon(new THREE.Color(glassCol)), 0.003); sh.position.y = h * 0.7; g.add(sh);
  const nk = outlined(new THREE.CylinderGeometry(r * 0.32, r * 0.32, h * 0.18, 12), toon(new THREE.Color(glassCol)), 0.003); nk.position.y = h * 0.87; g.add(nk);
  const cap = outlined(new THREE.CylinderGeometry(r * 0.36, r * 0.36, h * 0.05, 12), toon(new THREE.Color('#f4c430')), 0.002); cap.position.y = h * 0.98; g.add(cap); return g; }
function fillShelf(parent, x0, x1, y, z, depth, seed) {
  const r = mulberry(seed); let x = x0 + 0.01; const kinds = ['box', 'box', 'can', 'can', 'jar', 'bottle'];
  const k = kinds[Math.floor(r() * kinds.length)]; const li = Math.floor(r() * 99);
  while (x < x1 - 0.05) {   // a run of identical items, then switch product
    const n = 2 + Math.floor(r() * 4), kind = kinds[Math.floor(r() * kinds.length)], lab = Math.floor(r() * 99);
    const w = kind === 'box' ? 0.07 + r() * 0.08 : kind === 'can' ? 0.045 + r() * 0.015 : kind === 'jar' ? 0.05 + r() * 0.02 : 0.03 + r() * 0.01;
    const h = kind === 'box' ? 0.14 + r() * 0.14 : kind === 'can' ? 0.09 + r() * 0.06 : kind === 'jar' ? 0.12 + r() * 0.06 : 0.22 + r() * 0.08;
    const fill = pick(['#f4c430', '#d63a3a', '#8a5130', '#f3efe6', '#e86a7a', '#5aa79a', '#f39a2b']);
    for (let i = 0; i < n && x < x1 - 0.05; i++) {
      const wx = kind === 'box' ? w : w * 2; let o;
      if (kind === 'box') { o = box(w, h, Math.min(depth * 0.7, 0.18), lab); o.position.set(x + w / 2, y + h / 2, z); }
      else if (kind === 'can') o = can(w, h, lab); else if (kind === 'jar') o = jar(w, h, fill); else o = bottle(w, h, lab);
      if (kind !== 'box') o.position.set(x + w, y, z);
      o.rotation.y += (r() - 0.5) * 0.12; parent.add(o);
      if (kind === 'can' && r() < 0.5) { const o2 = can(w, h, lab); o2.position.set(x + w, y + h, z); parent.add(o2); }   // stacked cans
      x += wx + 0.006;
    }
    x += 0.02;
  }
}
function tagStrip(w, n, seed) { const r = mulberry(seed); return makeCard(w, 0.045, 1024, (c, Wp, Hp) => { c.fillStyle = '#6b3f22'; c.fillRect(0, 0, Wp, Hp);
  for (let i = 0; i < n; i++) { const x = (i + 0.15 + r() * 0.3) * Wp / n; c.fillStyle = r() < 0.25 ? '#ff5a3a' : '#fff4b0'; c.fillRect(x, Hp * 0.12, Wp / n * 0.42, Hp * 0.76);
    c.fillStyle = INK; c.font = `800 ${Hp * 0.55}px Montserrat, Kanit`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('฿' + (5 + Math.floor(r() * 90)), x + Wp / n * 0.21, Hp * 0.52); } }, { lit: true }); }
function shelfUnit(w, h, rows, d, seed) {
  const g = new THREE.Group(); const wood = '#8a5130';
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(TEX.planks('#7a4526', 5), 2, 2)); back.position.set(0, h / 2, -d / 2); back.receiveShadow = true; g.add(back);
  for (const x of [-w / 2, w / 2]) { const s = P.rbox(0.05, h, d, wood, 0.012); s.position.set(x, h / 2, 0); g.add(s); }
  const top = P.rbox(w + 0.1, 0.06, d + 0.06, '#6b3f22', 0.015); top.position.y = h; g.add(top);
  for (let i = 0; i < rows; i++) { const y = 0.12 + i * (h - 0.14) / rows; const sh = P.rbox(w, 0.035, d, wood, 0.01); sh.position.y = y; g.add(sh);
    fillShelf(g, -w / 2 + 0.03, w / 2 - 0.03, y + 0.018, -d * 0.1, d, seed * 31 + i);
    const tg = tagStrip(w - 0.06, Math.round(w / 0.16), seed * 7 + i); tg.position.set(0, y - 0.005, d / 2 + 0.002); g.add(tg); }
  return g;
}
// kept low so the price board above it shows in full
const BACK = shelfUnit(3.6, 2.15, 5, 0.36, 3); BACK.position.set(0.1, 0, -D / 2 + 0.2); S.add(BACK);
const SIDE = shelfUnit(2.4, 2.2, 5, 0.34, 9); SIDE.rotation.y = Math.PI / 2; SIDE.position.set(-W / 2 + 0.2, 0, -0.1); S.add(SIDE);

// hanging goods: snack strips and chillies from the beam
for (let i = 0; i < 6; i++) { const strip = makeCard(0.1, 0.6, 256, (c, Wp, Hp) => { c.fillStyle = '#3a2a22'; c.fillRect(Wp * 0.47, 0, Wp * 0.06, Hp);
    for (let k = 0; k < 6; k++) { const col = COLS[(i * 3 + k) % COLS.length]; c.fillStyle = col; c.beginPath(); c.roundRect(Wp * 0.08, 20 + k * Hp / 6.3, Wp * 0.84, Hp / 7, 10); c.fill(); c.lineWidth = 4; c.strokeStyle = INK; c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(Wp / 2, 20 + k * Hp / 6.3 + Hp / 14, Wp * 0.18, 0, 7); c.fill(); } }, { lit: true, transparent: true });
  strip.position.set(0.95 + i * 0.17, 2.5, -1.45 + (i % 2) * 0.06); S.add(strip); }

// ---------- counter ----------
const CT = new THREE.Group(); CT.position.set(0.15, 0, -0.35); S.add(CT);
{ const front = outlined(P.rboxGeo(2.2, 0.95, 0.6, 0.03), mat(TEX.planks('#b8763e', 8), 3, 1), 0.01); front.position.y = 0.475; CT.add(front);
  const top = outlined(P.rboxGeo(2.35, 0.07, 0.72, 0.025), mat(TEX.planks('#6b3f22', 4), 2, 1), 0.01); top.position.y = 0.98; CT.add(top);
  const kick = P.rbox(2.2, 0.08, 0.62, '#4a2a16', 0.02); kick.position.y = 0.04; CT.add(kick);
  // both counter signs sit on the right half so the customer (front-left) never covers them
  const posters = makeCard(2.0, 0.55, 1024, (c, Wp, Hp) => { c.clearRect(0, 0, Wp, Hp);
    c.fillStyle = '#f4c430'; c.beginPath(); c.roundRect(Wp * 0.4, 30, Wp * 0.285, Hp - 60, 22); c.fill(); c.lineWidth = 8; c.strokeStyle = INK; c.stroke();
    signText(c, 'ลดราคา!', Wp * 0.5425, Hp * 0.4, Hp * 0.2, '#d63a3a', '#fff'); signText(c, '2 FOR ฿50', Wp * 0.5425, Hp * 0.7, Hp * 0.13, INK, '#f4c430');
    c.fillStyle = '#2f6fd6'; c.beginPath(); c.roundRect(Wp * 0.705, 30, Wp * 0.285, Hp - 60, 22); c.fill(); c.stroke();
    signText(c, 'ICE COLD', Wp * 0.8475, Hp * 0.4, Hp * 0.14, '#fff', '#0d1640'); signText(c, 'น้ำเย็น ❄', Wp * 0.8475, Hp * 0.7, Hp * 0.14, '#bfe6ff', '#0d1640'); }, { lit: true, transparent: true });
  posters.position.set(0, 0.5, 0.302); CT.add(posters); }
const TOPY = 1.015;
{ // cash register
  const reg = new THREE.Group(); reg.position.set(-0.65, TOPY, -0.05); CT.add(reg);
  const body = P.rbox(0.42, 0.18, 0.34, '#5a6a7a', 0.03); body.position.y = 0.09; reg.add(body);
  const keys = makeCard(0.3, 0.16, 256, (c, Wp, Hp) => { c.fillStyle = '#3a4450'; c.fillRect(0, 0, Wp, Hp); for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { c.fillStyle = (i + j) % 3 ? '#f3efe6' : '#f4c430'; c.beginPath(); c.roundRect(14 + i * 60, 10 + j * 45, 46, 34, 6); c.fill(); } }, { lit: true });
  keys.rotation.x = -1.1; keys.position.set(0, 0.2, 0.08); reg.add(keys);
  const head = P.rbox(0.26, 0.14, 0.06, '#5a6a7a', 0.02); head.position.set(0, 0.3, -0.08); reg.add(head);
  const scr = makeCard(0.2, 0.08, 256, (c, Wp, Hp) => { c.fillStyle = '#1a2a1a'; c.fillRect(0, 0, Wp, Hp); c.fillStyle = '#7dff8a'; c.font = `800 ${Hp * 0.6}px Montserrat`; c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText('฿ 125.00', Wp - 12, Hp / 2); }, {}); scr.position.set(0, 0.3, -0.047); reg.add(scr); }
{ // candy jars row
  const cols = ['#f4a7c0', '#f4c430', '#7dd3a8', '#f39a2b']; cols.forEach((col, i) => { const j = jar(0.07, 0.2, col); j.position.set(0.15 + i * 0.17, TOPY, -0.12); CT.add(j);
    for (let k = 0; k < 7; k++) { const b = P.ball(0.018, pick(['#e2302a', '#fff', '#2f6fd6', '#f4c430']), 0.002); b.position.set(0.15 + i * 0.17 + (R() - 0.5) * 0.08, TOPY + 0.04 + R() * 0.12, -0.12 + (R() - 0.5) * 0.08); CT.add(b); } }); }
{ // fruit basket + scale
  const bk = outlined(new THREE.CylinderGeometry(0.17, 0.12, 0.1, 20, 1, true), toon(new THREE.Color('#c48a4a'), { side: THREE.DoubleSide }), 0.004); bk.position.set(0.6, TOPY + 0.05, 0.12); CT.add(bk);
  for (let k = 0; k < 9; k++) { const f = P.ball(0.045, k % 3 ? '#f39a2b' : '#d63a3a', 0.003); f.position.set(0.6 + Math.cos(k * 2.4) * 0.09 * (k > 5 ? 0.3 : 1), TOPY + 0.09 + (k > 5 ? 0.06 : 0), 0.12 + Math.sin(k * 2.4) * 0.09 * (k > 5 ? 0.3 : 1)); CT.add(f); }
  const sc = P.rbox(0.24, 0.06, 0.22, '#e8e2d6', 0.02); sc.position.set(-0.2, TOPY + 0.03, 0.15); CT.add(sc);
  const pan = outlined(new THREE.CylinderGeometry(0.12, 0.09, 0.03, 20), toon(new THREE.Color('#c9ced6')), 0.003); pan.position.set(-0.2, TOPY + 0.09, 0.15); CT.add(pan);
  const dial = makeCard(0.1, 0.05, 128, (c, Wp, Hp) => { c.fillStyle = '#fff'; c.fillRect(0, 0, Wp, Hp); c.strokeStyle = '#d63a3a'; c.lineWidth = 4; c.beginPath(); c.moveTo(Wp / 2, Hp); c.lineTo(Wp * 0.7, 6); c.stroke(); }, { lit: true }); dial.position.set(-0.2, TOPY + 0.035, 0.261); CT.add(dial); }

// ---------- walls: window, chalkboard, clock, calendar, lamps ----------
{ const win = makeCard(1.3, 1.1, 1024, (c, Wp, Hp) => { const g = c.createLinearGradient(0, 0, 0, Hp); g.addColorStop(0, '#7cc4f0'); g.addColorStop(1, '#d9f0ff'); c.fillStyle = g; c.fillRect(0, 0, Wp, Hp);
    c.fillStyle = '#f2d4a8'; c.fillRect(0, Hp * 0.55, Wp, Hp * 0.45); for (let i = 0; i < 4; i++) { c.fillStyle = ['#e86a7a', '#5aa7e6', '#f4c430', '#9ac76a'][i]; c.fillRect(Wp * (0.05 + i * 0.24), Hp * (0.25 + (i % 2) * 0.08), Wp * 0.2, Hp * 0.4); c.fillStyle = '#fff'; for (let k = 0; k < 4; k++) c.fillRect(Wp * (0.08 + i * 0.24) + (k % 2) * Wp * 0.08, Hp * (0.3 + (i % 2) * 0.08) + Math.floor(k / 2) * Hp * 0.12, Wp * 0.05, Hp * 0.07); }
    c.fillStyle = '#3f9b46'; c.beginPath(); c.arc(Wp * 0.85, Hp * 0.4, Wp * 0.12, 0, 7); c.fill();
    c.strokeStyle = '#f3efe6'; c.lineWidth = 26; c.strokeRect(0, 0, Wp, Hp); c.beginPath(); c.moveTo(Wp / 2, 0); c.lineTo(Wp / 2, Hp); c.moveTo(0, Hp / 2); c.lineTo(Wp, Hp / 2); c.stroke();
    signText(c, 'ร้านป้าแดง', Wp / 2, Hp * 0.16, Hp * 0.09, '#d63a3a', '#fff'); }, { lit: true });
  win.rotation.y = -Math.PI / 2; win.position.set(W / 2 - 0.01, 1.65, 0.6); S.add(win);
  const board = makeCard(1.1, 0.62, 1024, (c, Wp, Hp) => { c.fillStyle = '#2f3a33'; c.fillRect(0, 0, Wp, Hp); c.strokeStyle = '#8a5130'; c.lineWidth = 34; c.strokeRect(0, 0, Wp, Hp);
    c.font = `800 ${Hp * 0.13}px Kanit, Montserrat`; c.fillStyle = '#f3efe6'; c.textAlign = 'left'; c.textBaseline = 'middle';
    [['ราคาวันนี้', ''], ['ไข่ไก่', '฿5'], ['ข้าวสาร', '฿45'], ['น้ำแข็ง', '฿10']].forEach(([a, b], i) => { c.fillStyle = i ? '#f3efe6' : '#f4c430'; c.fillText(a, Wp * 0.1, Hp * (0.2 + i * 0.2)); c.textAlign = 'right'; c.fillText(b, Wp * 0.9, Hp * (0.2 + i * 0.2)); c.textAlign = 'left'; });
    c.strokeStyle = 'rgba(243,239,230,0.5)'; c.lineWidth = 4; c.setLineDash([10, 10]); for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(Wp * 0.35, Hp * (0.2 + i * 0.2)); c.lineTo(Wp * 0.75, Hp * (0.2 + i * 0.2)); c.stroke(); } }, { lit: true });
  board.position.set(0.15, 2.52, -D / 2 + 0.01); S.add(board);
  const clock = new THREE.Group(); const rim = outlined(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 32), toon(new THREE.Color('#d63a3a')), 0.004); rim.rotation.x = Math.PI / 2; clock.add(rim);
  const face = makeCard(0.3, 0.3, 256, (c, Wp) => { c.fillStyle = '#fff'; c.beginPath(); c.arc(Wp / 2, Wp / 2, Wp / 2, 0, 7); c.fill(); c.fillStyle = INK; for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; c.fillRect(Wp / 2 + Math.cos(a) * Wp * 0.4 - 4, Wp / 2 + Math.sin(a) * Wp * 0.4 - 4, 8, 8); }
    c.lineWidth = 10; c.strokeStyle = INK; c.beginPath(); c.moveTo(Wp / 2, Wp / 2); c.lineTo(Wp / 2 + 50, Wp / 2 - 40); c.moveTo(Wp / 2, Wp / 2); c.lineTo(Wp / 2 - 10, Wp / 2 - 90); c.stroke(); }, { transparent: true });
  face.position.z = 0.021; clock.add(face); clock.position.set(-0.78, 2.55, -D / 2 + 0.03); S.add(clock);
  for (const x of [-1.3, 1.5]) {   // lamps wide apart: never in front of the price board
    const cord = P.tube(0.008, 0.5, '#2a1a16', 0); cord.position.set(x, Hh - 0.25, 0.1); S.add(cord);
    const sh = outlined(new THREE.ConeGeometry(0.2, 0.18, 24, 1, true), toon(new THREE.Color('#2e7d4f'), { side: THREE.DoubleSide }), 0.005); sh.position.set(x, Hh - 0.55, 0.1); S.add(sh);
    const bl = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff2c0').multiplyScalar(1.6) })); bl.position.set(x, Hh - 0.65, 0.1); S.add(bl); } }
// floor clutter: sacks of rice, crates of drinks, a broom
for (let i = 0; i < 3; i++) { const sk = outlined(new THREE.SphereGeometry(0.22, 18, 12), toon(new THREE.Color('#e8dcc0')), 0.006); sk.scale.set(1, 1.25, 0.8); sk.position.set(1.65 + i * 0.32, 0.26, -1.3 + (i % 2) * 0.2); S.add(sk);
  const lb = makeCard(0.2, 0.14, 256, (c, Wp, Hp) => { c.fillStyle = '#e8dcc0'; c.fillRect(0, 0, Wp, Hp); signText(c, 'ข้าว', Wp / 2, Hp / 2, Hp * 0.5, '#2e7d4f', '#e8dcc0'); }, { lit: true }); lb.position.set(1.65 + i * 0.32, 0.3, -1.3 + (i % 2) * 0.2 + 0.18); S.add(lb); }
for (let i = 0; i < 2; i++) { const cr = P.rbox(0.42, 0.28, 0.32, '#d63a3a', 0.03); cr.position.set(-1.6 + i * 0.05, 0.14 + i * 0.28, 0.9); cr.rotation.y = 0.2 * i; S.add(cr);
  for (let k = 0; k < 6; k++) { const bt = bottle(0.03, 0.2, k + i * 6); bt.position.set(-1.6 + i * 0.05 - 0.12 + (k % 3) * 0.12, 0.2 + i * 0.28, 0.85 + Math.floor(k / 3) * 0.1); S.add(bt); } }

// ---------- people ----------
const SZ = 1.9;
const KEEP = makeFlat(SZ, 1024, drawStick), CUST = makeFlat(SZ, 1024, drawStick);
for (const f of [KEEP, CUST]) { S.add(f.mesh); S.add(f.shadow); f.shadow.material.color.set(0x1a0e08); }
const CAT = makeFlat(0.5, 1024, (c, p) => { // a sleeping cat curled on the counter
  c.beginPath(); c.ellipse(0, 60, 300, 170, 0, 0, 7); c.fillStyle = '#f39a4a'; c.fill(); c.lineWidth = 20; c.strokeStyle = INK; c.stroke();
  c.strokeStyle = '#c96a24'; c.lineWidth = 22; for (const x of [-140, -60, 20]) { c.beginPath(); c.moveTo(x, -90); c.quadraticCurveTo(x + 20, -30, x, 20); c.stroke(); }
  c.beginPath(); c.ellipse(190, 30, 120, 105, 0, 0, 7); c.fillStyle = '#f39a4a'; c.fill(); c.lineWidth = 20; c.strokeStyle = INK; c.stroke();
  for (const [x, a] of [[130, -0.4], [250, 0.4]]) { c.save(); c.translate(x, -50); c.rotate(a); c.beginPath(); c.moveTo(-40, 20); c.lineTo(0, -70); c.lineTo(40, 20); c.closePath(); c.fillStyle = '#f39a4a'; c.fill(); c.lineWidth = 16; c.stroke(); c.restore(); }
  for (const x of [150, 230]) { c.beginPath(); c.arc(x, 30, 20, 0.2, Math.PI - 0.2); c.lineWidth = 12; c.stroke(); }
  c.beginPath(); c.moveTo(-290, 80); c.quadraticCurveTo(-200, 260, 100, 200); c.lineWidth = 60; c.strokeStyle = INK; c.stroke(); c.lineWidth = 36; c.strokeStyle = '#f39a4a'; c.stroke();
  c.font = '800 90px Montserrat'; c.fillStyle = '#5a7ac8'; c.fillText('z', 300, -120); c.font = '800 60px Montserrat'; c.fillText('z', 370, -200); });
S.add(CAT.mesh);


// ================= the ฿99 clip (10 s) =================
const DUR = 10.0;
const sst = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
const mixv = (a, b, u) => a.clone().lerp(b, u);
// the price tag on the counter: redrawn every frame (first digit glows, second fades)
const TAGP = V(0.12, TOPY + 0.085, 0.02);
const TAG = makeCard(0.22, 0.13, 1024, () => {}, {}); TAG.position.copy(TAGP); S.add(TAG);
const stand = P.rbox(0.03, 0.09, 0.03, '#8a5130', 0.01); stand.position.set(TAGP.x, TOPY + 0.0, TAGP.z - 0.01); S.add(stand);
const snack = box(0.16, 0.2, 0.06, 4); snack.position.set(TAGP.x + 0.2, TOPY + 0.1, TAGP.z - 0.05); snack.rotation.y = -0.3; S.add(snack);
function drawTag(glow, fade) {
  TAG.userData.redraw((c, W, H) => {
    c.fillStyle = '#fff4b0'; c.beginPath(); c.roundRect(8, 8, W - 16, H - 16, 40); c.fill(); c.lineWidth = 16; c.strokeStyle = INK; c.stroke();
    c.beginPath(); c.arc(70, H / 2, 22, 0, 7); c.fillStyle = '#e8d9a0'; c.fill(); c.lineWidth = 8; c.stroke();
    c.font = `800 ${H * 0.62}px Montserrat`; c.textBaseline = 'middle'; c.textAlign = 'center';
    const y = H * 0.56, xB = W * 0.27, x1 = W * 0.52, x2 = W * 0.77;
    c.fillStyle = '#d63a3a'; c.fillText('฿', xB, y);
    if (glow > 0) { c.save(); c.shadowColor = `rgba(255,190,40,${glow})`; c.shadowBlur = 60 * glow; c.beginPath(); c.arc(x1, y, H * 0.36 * (1 + 0.1 * glow), 0, 7); c.fillStyle = `rgba(255,214,64,${0.55 * glow})`; c.fill(); c.restore(); }
    c.save(); c.translate(x1, y); c.scale(1 + 0.18 * glow, 1 + 0.18 * glow); c.fillStyle = INK; c.fillText('9', 0, 0); c.restore();
    c.globalAlpha = 1 - 0.78 * fade; c.fillStyle = INK; c.fillText('9', x2, y); c.globalAlpha = 1;
  });
}
// thought bubble next to the customer
const BUB = makeFlat(0.62, 1024, (c, p) => {
  if (p.s <= 0.01) return; c.scale(p.s, p.s);
  c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 16;
  const blobs = [[-180, -60, 170], [0, -120, 200], [180, -60, 170], [120, 90, 150], [-120, 90, 150], [0, 40, 210]];
  for (const [x, y, r] of blobs) { c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); } for (const [x, y, r] of blobs) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
  for (const [x, y, r] of [[-260, 300, 40], [-330, 390, 24]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.stroke(); }
  c.textAlign = 'center'; c.textBaseline = 'middle';
  if (p.a > 0) { c.globalAlpha = p.a; signText(c, '฿90', 0, -40, 230, '#2e9d5a', INK); c.globalAlpha = 1; }
  if (p.b > 0) { c.globalAlpha = p.b; signText(c, '฿100', 20, 150, 120, '#9a9a9a', INK); c.strokeStyle = '#d63a3a'; c.lineWidth = 26; c.beginPath(); c.moveTo(-130, 150 + 10); c.lineTo(170 * Math.min(1, p.b * 1.5) + (-130) * (1 - Math.min(1, p.b * 1.5)), 150 - 20); c.stroke(); c.globalAlpha = 1; }
});
S.add(BUB.mesh);
const CAP = makeCaptions(E.W, E.H, CUES);
const OV = makeOverlay(E.W, E.H);
const CAMS = {}; const camOf = (id) => (CAMS[id] = CAMS[id] || new THREE.PerspectiveCamera(42, E.W / E.H, 0.03, 50));
const aimCam = (cam, pos, tgt, fov, roll = 0) => { cam.position.copy(pos); cam.up.set(0, 1, 0); cam.lookAt(tgt); if (roll) cam.rotateZ(roll); cam.fov = fov; cam.aspect = E.W / E.H; cam.updateProjectionMatrix(); cam.updateMatrixWorld(true); };
const CUSTP = V(-0.5, 0.43 * SZ, 0.5), KEEPP = V(0.25, 0.43 * SZ + 0.1, -0.95);
const custHold = (c, a) => { const [x, y] = a.L; c.beginPath(); c.roundRect(x - 90, y, 180, 110, 18); c.fillStyle = '#d63a3a'; c.fill(); c.lineWidth = 12; c.strokeStyle = INK; c.stroke();
  c.fillStyle = '#9b2a20'; for (let i = 0; i < 4; i++) c.fillRect(x - 70 + i * 40, y + 20, 22, 70); c.beginPath(); c.arc(x, y, 80, Math.PI, 0); c.lineWidth = 12; c.stroke();
  c.fillStyle = '#f4c430'; c.fillRect(x - 60, y - 40, 40, 50); c.strokeRect(x - 60, y - 40, 40, 50); c.fillStyle = '#2e9d5a'; c.beginPath(); c.arc(x + 30, y - 10, 28, 0, 7); c.fill(); c.stroke(); };
function people(cam, t) {
  const right = V(1, 0, 0).applyQuaternion(cam.quaternion);
  const smirk = sst(7.38, 7.5, t), deadpan = sst(7.55, 7.62, t), wink = t > 8.6 && t < 9.25;
  KEEP.update(cam, KEEPP, right, { outfit: { kind: 'shirt', col: '#e86a7a', apron: '#4f9a6a' }, hair: 'bun', hairCol: '#3a2418', glasses: true,
    eyes: deadpan > 0.5 ? 'flat' : 'dot', wink, mouth: smirk > 0.5 ? 'smirk' : 'smile', brow: deadpan > 0.5 ? 0.12 : -0.1,
    look: deadpan > 0.5 ? [-0.2, 0] : [0.4, 0.1], tilt: 0.06 * smirk, arms: { L: [-170, 60], R: [200, -120] }, bend: { L: -40, R: 60 } }, 0, 0);
  const amazed = sst(4.3, 4.45, t), shock = t > 1.55 && t < 4.2;
  const point = sst(0.6, 1.0, t);
  CUST.update(cam, CUSTP, right, { outfit: { kind: 'shirt', col: '#f2c230' }, hat: 'cap', hatCol: '#2f6fd6', hair: 'bowl', hairCol: '#5a3a22',
    eyes: amazed > 0.5 ? (t > 5.4 ? 'happy' : 'wide') : 'ring', mouth: amazed > 0.5 ? (t > 5.4 ? 'grin' : 'o') : shock ? 'o' : 'line', brow: 0.15, blush: t > 5.4,
    look: amazed > 0.5 ? [0.6, -0.6] : [0.8, 0.1], sweat: t > 3.6 && t < 4.2,
    arms: { L: [-160, 150], R: [180 + 90 * point, 60 + 40 * point] }, bend: { L: -40, R: -50 }, hold: custHold }, 0, 0.28);
  CAT.update(cam, V(0.92, TOPY + 0.12, -0.32), right, {}, TOPY, 0);
  const bs = sst(4.75, 4.95, t) * (1 + 0.12 * Math.sin(Math.max(0, t - 4.75) * 18) * Math.exp(-Math.max(0, t - 4.75) * 6));
  BUB.update(cam, CUSTP.clone().add(V(0.42, 0.95, 0.05)), right, { s: bs, a: sst(4.85, 5.0, t), b: sst(5.45, 5.75, t) }, 0, 0);
}
const SHOTS = [
  { id: 'wide', t0: 0, t1: 2.13 }, { id: 'tag', t0: 2.0, t1: 4.35 }, { id: 'cust', t0: 4.05, t1: 6.72 }, { id: 'keep', t0: 6.6, t1: DUR },
];
const TRANS = [
  { from: 'wide', to: 'tag', t0: 2.0, t1: 2.13, kind: 'crash' },
  { from: 'tag', to: 'cust', t0: 4.05, t1: 4.35, kind: 'whip', dir: [1, 0] },
  { from: 'cust', to: 'keep', t0: 6.6, t1: 6.72, kind: 'dissolve' },
];
function shot(id, t) {
  const cam = camOf(id); let focus;
  if (id === 'wide') { const u = sst(0, 2.1, t); aimCam(cam, mixv(V(0.3, 1.62, 4.6), V(0.18, 1.45, 3.3), u), mixv(V(0, 1.25, -0.7), V(0.05, 1.12, -0.3), u), 44);
    focus = { dist: cam.position.distanceTo(V(0, 1.2, -0.4)), range: 1.4, amt: 0.45 }; }
  else if (id === 'tag') { const u = sst(2.0, 4.3, t); const shake = t > 3.66 && t < 3.9 ? 0.004 * Math.sin(t * 90) : 0;
    aimCam(cam, mixv(V(0.15, TOPY + 0.2, 0.62), V(0.13, TOPY + 0.15, 0.4), u).add(V(shake, 0, 0)), TAGP.clone().add(V(0, 0.005, 0)), 38, -0.04 + 0.05 * u);
    focus = { dist: cam.position.distanceTo(TAGP), range: 0.07, amt: 1.0 }; }
  else if (id === 'cust') { const u = sst(4.05, 6.7, t); const head = CUSTP.clone().add(V(0, 0.47, 0));   // head centre (canvas y -255 after the 6 % shrink)
    aimCam(cam, mixv(head.clone().add(V(0.5, 0.22, 2.45)), head.clone().add(V(0.42, 0.2, 2.1)), u), head.clone().add(V(0.24, 0.2, 0)), 42);
    focus = { dist: cam.position.distanceTo(head), range: 0.5, amt: 0.8 }; }
  else { const u = sst(6.6, DUR, t); const head = KEEPP.clone().add(V(0, 0.47, 0));
    aimCam(cam, mixv(V(0.42, 1.66, 0.95), V(0.32, 1.62, 0.6), u), head.clone().add(V(0.02, -0.12, 0)), 40);
    focus = { dist: cam.position.distanceTo(head), range: 0.35, amt: 0.8 }; }
  people(cam, t);
  return { scene: S, camera: cam, focus };
}
function render(t) {
  t = clamp(t, 0, DUR - 1e-4);
  drawTag(sst(2.84, 3.05, t), sst(3.62, 3.8, t));
  const tr = TRANS.find((x) => t >= x.t0 && t < x.t1); let A, B = null, trans = null;
  if (tr) { const p = (t - tr.t0) / (tr.t1 - tr.t0); B = shot(tr.to, t); A = shot(tr.from, t);
    trans = { kind: tr.kind, p, dir: tr.dir, c: tr.kind === 'crash' ? toUV(A.camera, TAGP) : undefined, zoom: 0.35 }; }
  else { const s = [...SHOTS].reverse().find((x) => t >= x.t0); A = shot(s.id, t); }
  if (t > 3.62 && t < 3.98) { const cu = toUV(camOf('tag'), TAGP); OV.draw((g, W, H) => speedLines(g, W, H, { cx: cu[0], cy: 1 - cu[1], amt: Math.min(1, (t - 3.62) / 0.05, (3.98 - t) / 0.1), frame: Math.floor(t * 30) })); } else OV.clear();
  CAP.draw(t, !QS.has('nocap'));
  E.frame({ A, B, trans, overlay: OV, captions: CAP, vig: 0.18, sat: 1.12, fade: sst(0, 0.15, t) * (1 - sst(DUR - 0.3, DUR, t)) });
}
export const EV = [
  { t: 0.12, type: 'whoosh' }, { t: 1.63, type: 'pop' }, { t: 2.0, type: 'whip' }, { t: 2.86, type: 'ding' }, { t: 3.66, type: 'thud' }, { t: 3.64, type: 'riser', d: 0.3 },
  { t: 4.05, type: 'whoosh' }, { t: 4.75, type: 'pop' }, { t: 5.5, type: 'slide', d: 0.4 }, { t: 6.6, type: 'whoosh', gain: -4 }, { t: 7.55, type: 'stop', d: 0.9 }, { t: 8.62, type: 'sting' },
];
window.DUR = DUR; window.EV = EV; window.CUES = CUES; window.render = render;
window.grabPNG = (t) => { render(t); return E.canvas.toDataURL('image/png').split(',')[1]; };
window.grab = (t) => { render(t); return E.canvas.toDataURL('image/jpeg', 0.95).split(',')[1]; };
render(0); window.READY = true;
