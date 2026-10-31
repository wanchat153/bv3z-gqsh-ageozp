// The set: a bright toon kitchen. Mint walls, big cream-and-coral floor tiles, a sunny window, counter, fridge,
// a wooden table with plate, butter dish and a stack of bread; crates and a stepladder for later; and the toast.
import * as THREE from './three.module.js';
import { toon, sphere, outlined, mulberry } from './toon.js';
import { TOP0, LAYER, NLAYER, TH } from './timeline.js';

const box = (w, h, d, m, ink = 0.008) => outlined(new THREE.BoxGeometry(w, h, d), m, ink);
const tex = (w, h, fn, rep = [1, 1]) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8; return t; };
const gm = toon(0).gradientMap;
const tmat = (map) => new THREE.MeshToonMaterial({ map, gradientMap: gm });

export function buildSet(scene) {
  const out = {};
  // floor: big checker tiles, clean grout
  const fl = tex(512, 512, (x, w) => { for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? '#f3e6cf' : '#f2a58e'; x.fillRect(i * 256, j * 256, 256, 256); } x.strokeStyle = '#d9c6a8'; x.lineWidth = 6; for (let k = 0; k <= 2; k++) { x.beginPath(); x.moveTo(k * 256, 0); x.lineTo(k * 256, 512); x.stroke(); x.beginPath(); x.moveTo(0, k * 256); x.lineTo(512, k * 256); x.stroke(); } }, [12, 12]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), tmat(fl)); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 2.5); floor.receiveShadow = true; scene.add(floor);
  // walls: mint, with a white skirting and a chair rail; the back wall has a window opening
  const mint = toon(0x9fdcc8), white = toon(0xfbf7ef), wood = toon(0xc98a52), woodD = toon(0x9c6538);
  const BZ = -1.6, WH = 4.6;
  const winX0 = -1.75, winX1 = -0.55, winY0 = 1.2, winY1 = 2.45;
  const wallPiece = (x0, x1, y0, y1) => { const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, 0.1), mint); b.position.set((x0 + x1) / 2, (y0 + y1) / 2, BZ - 0.05); b.receiveShadow = true; scene.add(b); };
  wallPiece(-3.2, winX0, 0, WH); wallPiece(winX1, 3.2, 0, WH); wallPiece(winX0, winX1, 0, winY0); wallPiece(winX0, winX1, winY1, WH);
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.1, WH, 9), mint); w.position.set(s * 3.2, WH / 2, BZ + 4.5); w.receiveShadow = true; scene.add(w); }
  const skirt = box(6.4, 0.12, 0.03, white, 0.004); skirt.position.set(0, 0.06, BZ + 0.015); scene.add(skirt);
  for (const s of [-1, 1]) { const k = box(0.03, 0.12, 9, white, 0.004); k.position.set(s * 3.15, 0.06, BZ + 4.5); scene.add(k); }
  // window: frame, cross bars, sky and a hill outside, curtains
  const fr = (w, h, x, y) => { const b = box(w, h, 0.14, white, 0.005); b.position.set(x, y, BZ); scene.add(b); };
  fr(winX1 - winX0 + 0.12, 0.08, (winX0 + winX1) / 2, winY0); fr(winX1 - winX0 + 0.12, 0.08, (winX0 + winX1) / 2, winY1);
  fr(0.08, winY1 - winY0, winX0, (winY0 + winY1) / 2); fr(0.08, winY1 - winY0, winX1, (winY0 + winY1) / 2);
  fr(0.04, winY1 - winY0, (winX0 + winX1) / 2, (winY0 + winY1) / 2); fr(winX1 - winX0, 0.04, (winX0 + winX1) / 2, (winY0 + winY1) / 2);
  const sill = box(1.45, 0.05, 0.22, white, 0.005); sill.position.set((winX0 + winX1) / 2, winY0 - 0.03, BZ + 0.08); scene.add(sill);
  const skyT = tex(64, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#5aa8f0'); g.addColorStop(1, '#bfe3ff'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), new THREE.MeshBasicMaterial({ map: skyT })); sky.position.set(-1.1, 3, BZ - 3); scene.add(sky);
  for (const [x, r, c] of [[-2.4, 2.2, 0x7fcf6a], [0.2, 2.6, 0x6cbf5c]]) { const h = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16), new THREE.MeshBasicMaterial({ color: c })); h.position.set(x, -0.6, BZ - 2.6); scene.add(h); }
  const sunDisk = new THREE.Mesh(new THREE.CircleGeometry(0.22, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.45, 0.9) })); sunDisk.position.set(-0.7, 3.3, BZ - 2.9); scene.add(sunDisk);
  const cur = toon(0xf6d36b);
  for (const x of [winX0 - 0.16, winX1 + 0.16]) { const c = outlined(new THREE.CylinderGeometry(0.11, 0.15, 1.5, 12, 1, false), cur, 0.006); c.scale.set(1, 1, 0.35); c.position.set(x, (winY0 + winY1) / 2 + 0.05, BZ + 0.1); scene.add(c); }
  const rod = box(1.9, 0.03, 0.03, woodD, 0.004); rod.position.set((winX0 + winX1) / 2, winY1 + 0.12, BZ + 0.1); scene.add(rod);
  // counter along the back wall, right of the window: cabinets, top, toaster, kettle, a plant
  const cab = toon(0xf9f3e6), top = toon(0x5e8fc9), knob = toon(0xe6704e);
  const CX0 = 0.0, CX1 = 2.1;
  const base = box(CX1 - CX0, 0.86, 0.6, cab, 0.01); base.position.set((CX0 + CX1) / 2, 0.43, BZ + 0.3); scene.add(base);
  const ctop = box(CX1 - CX0 + 0.04, 0.05, 0.64, top, 0.008); ctop.position.set((CX0 + CX1) / 2, 0.885, BZ + 0.32); scene.add(ctop);
  for (let k = 0; k < 3; k++) { const d = box(0.62, 0.7, 0.02, cab, 0.006); d.position.set(CX0 + 0.37 + k * 0.68, 0.43, BZ + 0.61); scene.add(d); const n = sphere(0.022, knob, 1, 1, 1, 0.004, 12); n.position.set(CX0 + 0.37 + k * 0.68 + 0.22, 0.62, BZ + 0.63); scene.add(n); }
  const upper = box(CX1 - CX0, 0.7, 0.36, cab, 0.01); upper.position.set((CX0 + CX1) / 2, 2.05, BZ + 0.18); scene.add(upper);
  for (let k = 0; k < 3; k++) { const d = box(0.62, 0.6, 0.02, cab, 0.006); d.position.set(CX0 + 0.37 + k * 0.68, 2.05, BZ + 0.37); scene.add(d); const n = sphere(0.02, knob, 1, 1, 1, 0.004, 12); n.position.set(CX0 + 0.37 + k * 0.68 + 0.22, 1.85, BZ + 0.39); scene.add(n); }
  const tst = new THREE.Group(); tst.position.set(0.55, 0.91, BZ + 0.35); scene.add(tst);
  const tb = outlined(new THREE.BoxGeometry(0.3, 0.2, 0.18), toon(0xe95b4b), 0.008); tb.position.y = 0.1; tst.add(tb);
  for (const x of [-0.06, 0.06]) { const s = box(0.03, 0.01, 0.13, toon(0x2a2030), 0); s.position.set(x, 0.205, 0); tst.add(s); }
  const lev = box(0.03, 0.025, 0.03, toon(0x2a2030), 0.003); lev.position.set(0.16, 0.12, 0); tst.add(lev);
  const ket = outlined(new THREE.SphereGeometry(0.11, 24, 16), toon(0xffffff), 0.008); ket.scale.set(1, 0.85, 1); ket.position.set(1.25, 1.0, BZ + 0.35); scene.add(ket);
  const sp = outlined(new THREE.CylinderGeometry(0.015, 0.025, 0.12, 10), toon(0xffffff), 0.004); sp.rotation.z = -1.0; sp.position.set(1.37, 1.03, BZ + 0.35); scene.add(sp);
  const pot = outlined(new THREE.CylinderGeometry(0.08, 0.06, 0.12, 16), toon(0xe6704e), 0.005); pot.position.set(1.85, 0.97, BZ + 0.33); scene.add(pot);
  const r = mulberry(4);
  for (let k = 0; k < 6; k++) { const l = sphere(0.06, toon(0x4caf50), 0.6, 1.4, 0.6, 0.004, 12); l.position.set(1.85 + Math.cos(k) * 0.05, 1.1 + r() * 0.05, BZ + 0.33 + Math.sin(k) * 0.05); l.rotation.z = Math.cos(k) * 0.5; scene.add(l); }
  // fridge on the far left
  const fz = box(0.75, 1.9, 0.7, toon(0xf0f4f7), 0.012); fz.position.set(-2.6, 0.95, BZ + 0.38); scene.add(fz);
  const fl2 = box(0.73, 0.012, 0.01, toon(0xb9c3cc), 0); fl2.position.set(-2.6, 1.3, BZ + 0.735); scene.add(fl2);
  for (const y of [1.0, 1.6]) { const h = box(0.03, 0.22, 0.04, toon(0xb9c3cc), 0.004); h.position.set(-2.32, y, BZ + 0.75); scene.add(h); }
  const mag = sphere(0.04, toon(0xf6c33b), 1, 1, 0.4, 0.004, 12); mag.position.set(-2.75, 1.5, BZ + 0.74); scene.add(mag);
  const mag2 = sphere(0.035, toon(0x5bc0eb), 1, 1, 0.4, 0.004, 12); mag2.position.set(-2.5, 1.62, BZ + 0.74); scene.add(mag2);
  // wall clock (ticks only) and a shelf with jars on the left wall area
  const clk = outlined(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 40), toon(0xffffff), 0.008); clk.rotation.x = Math.PI / 2; clk.position.set(0.9, 3.0, BZ + 0.03); scene.add(clk);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 8, 40), toon(0xe6704e)); rim.position.set(0.9, 3.0, BZ + 0.05); scene.add(rim);
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; const tk = box(0.012, 0.035, 0.005, toon(0x2a2030), 0); tk.position.set(0.9 + Math.sin(a) * 0.16, 3.0 + Math.cos(a) * 0.16, BZ + 0.055); tk.rotation.z = -a; scene.add(tk); }
  out.hands = [];
  for (const [len, w] of [[0.12, 0.016], [0.09, 0.02]]) { const hnd = new THREE.Group(); hnd.position.set(0.9, 3.0, BZ + 0.06); const b = new THREE.Mesh(new THREE.BoxGeometry(w, len, 0.006), toon(0x2a2030)); b.position.y = len / 2; hnd.add(b); scene.add(hnd); out.hands.push(hnd); }
  const shelf = box(0.9, 0.04, 0.22, wood, 0.006); shelf.position.set(-2.0, 2.75, BZ + 0.11); scene.add(shelf);
  for (let k = 0; k < 4; k++) { const j = outlined(new THREE.CylinderGeometry(0.06, 0.06, 0.16 + (k % 2) * 0.05, 16), toon([0xf7a440, 0xe85d5d, 0x7cc36b, 0xf6d36b][k]), 0.005); j.position.set(-2.3 + k * 0.2, 2.85 + (k % 2) * 0.025, BZ + 0.11); scene.add(j); const lid = outlined(new THREE.CylinderGeometry(0.062, 0.062, 0.025, 16), white, 0.004); lid.position.set(-2.3 + k * 0.2, 2.95 + (k % 2) * 0.05, BZ + 0.11); scene.add(lid); }
  // a round rug under the table
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.25, 64), toon(0x7fb3e6)); rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.003, 0); rug.scale.set(1.25, 0.9, 1); rug.receiveShadow = true; scene.add(rug);
  const rug2 = new THREE.Mesh(new THREE.RingGeometry(1.08, 1.16, 64), toon(0xfbf7ef)); rug2.rotation.x = -Math.PI / 2; rug2.position.set(0, 0.004, 0); rug2.scale.set(1.25, 0.9, 1); scene.add(rug2);

  // ---- the table (a group so it can be raised) with what's on it ----
  const table = new THREE.Group(); scene.add(table);
  const tt = tex(256, 128, (x, w, h) => { x.fillStyle = '#d99a5e'; x.fillRect(0, 0, w, h); x.strokeStyle = '#c48347'; x.lineWidth = 3; for (let k = 1; k < 4; k++) { x.beginPath(); x.moveTo(0, k * 32); x.lineTo(w, k * 32); x.stroke(); } });
  const ttop = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 0.7), tmat(tt)); ttop.position.y = TOP0 - 0.025; ttop.castShadow = ttop.receiveShadow = true; table.add(ttop);
  const ttopInk = outlined(new THREE.BoxGeometry(1.0, 0.05, 0.7), new THREE.MeshBasicMaterial({ visible: false }), 0.008); ttopInk.position.copy(ttop.position); table.add(ttopInk);
  for (const [x, z] of [[-0.44, -0.29], [0.44, -0.29], [-0.44, 0.29], [0.44, 0.29]]) { const l = box(0.05, TOP0 - 0.05, 0.05, woodD, 0.006); l.position.set(x, (TOP0 - 0.05) / 2, z); table.add(l); }
  const apron = box(0.92, 0.08, 0.62, wood, 0.006); apron.position.y = TOP0 - 0.09; table.add(apron);
  const plate = outlined(new THREE.CylinderGeometry(0.13, 0.1, 0.014, 40), toon(0xffffff), 0.005); plate.position.set(0.1, TOP0 + 0.007, 0.06); table.add(plate);
  const prim = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.004, 6, 40), toon(0x5bc0eb)); prim.rotation.x = Math.PI / 2; prim.position.set(0.1, TOP0 + 0.0145, 0.06); table.add(prim);
  // bread board with a stack of slices (one disappears each time he takes one)
  const board = box(0.24, 0.02, 0.2, wood, 0.005); board.position.set(-0.28, TOP0 + 0.01, 0.04); table.add(board);
  out.stack = [];
  for (let k = 0; k < 4; k++) { const s = makeToast(false); s.root.position.set(-0.28 + (k % 2 ? 0.006 : -0.004), TOP0 + 0.02 + TH / 2 + k * (TH + 0.001), 0.04); s.root.rotation.y = (k % 2 ? 0.08 : -0.05); table.add(s.root); out.stack.push(s.root); }
  // butter dish with a butter block, a knife rest and a mug
  const dish = outlined(new THREE.CylinderGeometry(0.075, 0.065, 0.012, 32), toon(0x5bc0eb), 0.004); dish.scale.set(1.3, 1, 0.9); dish.position.set(-0.1, TOP0 + 0.006, -0.2); table.add(dish);
  const blk = box(0.09, 0.04, 0.05, toon(0xffe27a), 0.004); blk.position.set(-0.11, TOP0 + 0.032, -0.2); table.add(blk);
  const mug = outlined(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 24), toon(0xf6d36b), 0.006); mug.position.set(-0.32, TOP0 + 0.05, -0.2); table.add(mug);
  const hdl = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.008, 8, 20), toon(0xf6d36b)); hdl.position.set(-0.37, TOP0 + 0.055, -0.2); table.add(hdl);
  const cof = new THREE.Mesh(new THREE.CircleGeometry(0.04, 24), toon(0x6b3d22)); cof.rotation.x = -Math.PI / 2; cof.position.set(-0.32, TOP0 + 0.092, -0.2); table.add(cof);
  out.table = table;

  // ---- crates for the tower: 2x2 per layer, slightly narrower than the table ----
  const ct = tex(128, 128, (x, w, h) => { x.fillStyle = '#e2b06f'; x.fillRect(0, 0, w, h); x.fillStyle = '#c4884a'; for (let k = 0; k < 4; k++) x.fillRect(0, k * 32 + 26, w, 6); x.fillStyle = '#b2773c'; x.fillRect(0, 0, 10, h); x.fillRect(w - 10, 0, 10, h); });
  const cm = tmat(ct);
  out.crates = [];
  for (let L = 0; L < NLAYER; L++) {
    const g = new THREE.Group(); g.visible = false; scene.add(g);
    for (const [x, z] of [[-0.21, -0.17], [0.21, -0.17], [-0.21, 0.17], [0.21, 0.17]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.42, LAYER - 0.004, 0.34), cm); m.position.set(x, LAYER / 2, z); m.castShadow = m.receiveShadow = true; g.add(m); const ink = outlined(new THREE.BoxGeometry(0.42, LAYER - 0.004, 0.34), new THREE.MeshBasicMaterial({ visible: false }), 0.006); ink.position.copy(m.position); g.add(ink); }
    out.crates.push(g);
  }
  out.carry = (() => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.42, LAYER - 0.004, 0.34), cm); const g = outlined(new THREE.BoxGeometry(0.42, LAYER - 0.004, 0.34), new THREE.MeshBasicMaterial({ visible: false }), 0.006); const gr = new THREE.Group(); gr.add(m); gr.add(g); m.castShadow = true; gr.visible = false; scene.add(gr); return gr; })();
  // ---- stepladder (A-frame), top step at 2.25 m ----
  const lad = new THREE.Group(); lad.visible = false; scene.add(lad);
  const lm = toon(0xe95b4b), stepM = toon(0xd8dde3);
  const LH = 2.3;
  for (const s of [-1, 1]) for (const fb of [-1, 1]) { const rail = box(0.045, LH * 1.02, 0.045, lm, 0.006); rail.position.set(s * 0.22, LH / 2, fb * 0.24); rail.rotation.x = fb * 0.105; lad.add(rail); }
  for (let k = 1; k <= 6; k++) { const y = k * LH / 6.6; const st = box(0.46, 0.03, 0.12, stepM, 0.004); st.position.set(0, y, 0.24 - (y / LH) * 0.24 + 0.02); lad.add(st); }
  const topStep = box(0.5, 0.05, 0.3, stepM, 0.006); topStep.position.set(0, 2.25, 0); lad.add(topStep);
  out.ladder = lad;
  scene.traverse((o) => { if (o.isMesh && o.material && o.material.isMeshToonMaterial) { o.castShadow = true; o.receiveShadow = true; } });
  floor.castShadow = false; sky.castShadow = false;
  return out;
}

// ---- a slice of toast (shape in XZ, thickness along Y). Butter on +Y. ----
let SHAPE = null;
function breadShape(s = 1) {
  const sh = new THREE.Shape(); const w = 0.078 * s, h = 0.075 * s;
  sh.moveTo(-w, h); sh.lineTo(-w, -h * 0.35);
  sh.bezierCurveTo(-w * 1.25, -h * 0.75, -w * 0.95, -h * 1.18, -w * 0.45, -h * 1.12);
  sh.bezierCurveTo(-w * 0.2, -h * 1.35, w * 0.2, -h * 1.35, w * 0.45, -h * 1.12);
  sh.bezierCurveTo(w * 0.95, -h * 1.18, w * 1.25, -h * 0.75, w, -h * 0.35);
  sh.lineTo(w, h); sh.closePath(); return sh;
}
const crustM = toon(0xa45e2a), faceM = toon(0xebb86a), butterM = toon(0xffe27a), meltM = toon(0xffd04a);
export function makeToast(buttered = true, ghost = false) {
  if (!SHAPE) SHAPE = breadShape(1);
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  const geo = new THREE.ExtrudeGeometry(SHAPE, { depth: TH, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2, curveSegments: 20 });
  geo.translate(0, 0, -TH / 2); geo.rotateX(-Math.PI / 2); geo.translate(0, 0, -0.013);
  const mats = ghost ? [new THREE.MeshBasicMaterial({ color: 0xebb86a, transparent: true, opacity: 0.28, depthWrite: false }), new THREE.MeshBasicMaterial({ color: 0xa45e2a, transparent: true, opacity: 0.28, depthWrite: false })] : [faceM, crustM];
  const m = new THREE.Mesh(geo, mats); m.castShadow = !ghost; m.receiveShadow = !ghost; body.add(m);
  if (!ghost) { const ink = outlined(geo, new THREE.MeshBasicMaterial({ visible: false }), 0.004); body.add(ink); }
  // butter layer
  const bs = breadShape(0.8); const bg = new THREE.ExtrudeGeometry(bs, { depth: 0.005, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.004, bevelSegments: 2, curveSegments: 16 });
  bg.rotateX(-Math.PI / 2); bg.translate(0, TH / 2 + 0.001, -0.0104);
  const bm = new THREE.Mesh(bg, ghost ? new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.32, depthWrite: false }) : butterM); body.add(bm);
  const pat = ghost ? null : outlined(new THREE.BoxGeometry(0.035, 0.012, 0.03), meltM, 0.003); if (pat) { pat.position.set(0.01, TH / 2 + 0.009, 0.0); pat.rotation.y = 0.4; body.add(pat); }
  bm.visible = buttered; if (pat) pat.visible = buttered;
  return { root, body, butter: bm, pat };
}
