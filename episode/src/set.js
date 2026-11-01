// The set: a bright, clean office lobby. Warm walls, pale marble floor, a steel lift with two sliding doors,
// a lit floor-indicator and call buttons, a leafy potted plant beside the doors, and a thin safety-beam across
// the threshold. The doors, beam, plant and loose sprig are returned so film.js can animate them.
import * as THREE from './three.module.js';
import { toon, sphere, outlined, mulberry } from './toon.js';

const box = (w, h, d, m, ink = 0.008) => outlined(new THREE.BoxGeometry(w, h, d), m, ink);
const cyl = (rt, rb, h, m, ink = 0.006, seg = 24) => outlined(new THREE.CylinderGeometry(rt, rb, h, seg), m, ink);
const tex = (w, h, fn, rep = [1, 1]) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8; return t; };
const gm = toon(0).gradientMap;
const tmat = (map) => new THREE.MeshToonMaterial({ map, gradientMap: gm });

// lift geometry (shared with film.js)
export const BZ = -1.25;            // front plane of the lift / back wall
export const DW = 0.66;             // half the door opening (each door is this wide)
export const DH = 2.3;              // door height
export const BEAMY = 1.05;          // height of the safety beam
export const PLANT = new THREE.Vector3(-1.18, 0, -0.95);

export function buildSet(scene) {
  const out = {};
  const steel = toon(0xc4ccd4), steelD = toon(0x9aa4ae), gold = toon(0xd9b45a), dark = toon(0x2c3038);
  const wallC = toon(0xf0e4cf), wallD = toon(0xe6d4b6), white = toon(0xfbf7ef), trim = toon(0xcf7f54);

  // floor: pale marble checker
  const fl = tex(512, 512, (x) => {
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? '#efe7d6' : '#e2d2b4'; x.fillRect(i * 256, j * 256, 256, 256); }
    x.strokeStyle = '#cbbb98'; x.lineWidth = 5; for (let k = 0; k <= 2; k++) { x.beginPath(); x.moveTo(k * 256, 0); x.lineTo(k * 256, 512); x.stroke(); x.beginPath(); x.moveTo(0, k * 256); x.lineTo(512, k * 256); x.stroke(); }
    // faint veins
    x.strokeStyle = 'rgba(180,165,135,0.5)'; x.lineWidth = 2; const r = mulberry(9);
    for (let k = 0; k < 10; k++) { x.beginPath(); let px = r() * 512, py = r() * 512; x.moveTo(px, py); for (let s = 0; s < 4; s++) { px += (r() - 0.5) * 120; py += (r() - 0.5) * 120; x.lineTo(px, py); } x.stroke(); }
  }, [10, 10]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(13, 13), tmat(fl)); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 1.6); floor.receiveShadow = true; scene.add(floor);

  // back wall (with the lift opening cut out) + side walls
  const WH = 4.4, HW = 3.4;
  const wallPiece = (x0, x1, y0, y1, m = wallC) => { const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, 0.12), m); b.position.set((x0 + x1) / 2, (y0 + y1) / 2, BZ - 0.12); b.receiveShadow = true; scene.add(b); };
  wallPiece(-HW, -DW - 0.12, 0, WH); wallPiece(DW + 0.12, HW, 0, WH); wallPiece(-DW - 0.12, DW + 0.12, DH + 0.1, WH);
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.12, WH, 7.5), wallC); w.position.set(s * HW, WH / 2, BZ + 3.6); w.receiveShadow = true; scene.add(w); }
  // ceiling
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(2 * HW, 0.1, 7.5), white); ceil.position.set(0, WH, BZ + 3.6); scene.add(ceil);
  // skirting + a chair rail stripe
  const skirt = box(2 * HW, 0.12, 0.04, white, 0.004); skirt.position.set(0, 0.06, BZ - 0.02); scene.add(skirt);
  // chair rail: stops at the lift opening so it never crosses the doorway
  for (const [x0, x1] of [[-HW, -DW - 0.12], [DW + 0.12, HW]]) { const r = box(x1 - x0, 0.05, 0.03, trim, 0.003); r.position.set((x0 + x1) / 2, 1.5, BZ - 0.03); scene.add(r); }

  // ---- the lift cab (recess behind the opening) ----
  const CBZ = BZ - 0.72;            // cab back wall
  const cabFloorMat = toon(0xb9bfc6);
  const cabFloor = new THREE.Mesh(new THREE.PlaneGeometry(2 * DW, 0.72), cabFloorMat); cabFloor.rotation.x = -Math.PI / 2; cabFloor.position.set(0, 0.005, BZ - 0.36); cabFloor.receiveShadow = true; scene.add(cabFloor);
  const cabBack = box(2 * DW, DH, 0.06, toon(0xd7dde3), 0.006); cabBack.position.set(0, DH / 2, CBZ); scene.add(cabBack);
  for (const s of [-1, 1]) { const w = box(0.06, DH, 0.72, steelD, 0.006); w.position.set(s * DW, DH / 2, BZ - 0.36); scene.add(w); }
  const cabCeil = box(2 * DW, 0.06, 0.72, white, 0.004); cabCeil.position.set(0, DH, BZ - 0.36); scene.add(cabCeil);
  // cab ceiling light
  const cabLight = box(0.5, 0.03, 0.4, toon(0xfff6d8), 0.003); cabLight.position.set(0, DH - 0.05, BZ - 0.36); scene.add(cabLight);
  cabLight.userData.mesh.material.emissive = new THREE.Color(0xfff2c8); cabLight.userData.mesh.material.emissiveIntensity = 0.6; out.cabLight = cabLight;
  // a short handrail low on each SIDE wall of the cab (out of frame behind the rider; no bar across him)
  for (const s of [-1, 1]) { const hr = cyl(0.016, 0.016, 0.5, gold, 0.004, 12); hr.position.set(s * (DW - 0.03), 0.92, BZ - 0.4); scene.add(hr); }

  // ---- steel door frame surround ----
  const jw = 0.1;
  for (const s of [-1, 1]) { const j = box(jw, DH + 0.14, 0.16, steel, 0.006); j.position.set(s * (DW + jw / 2), (DH + 0.14) / 2, BZ + 0.02); scene.add(j); }
  const lintel = box(2 * DW + 2 * jw, 0.14, 0.16, steel, 0.006); lintel.position.set(0, DH + 0.07, BZ + 0.02); scene.add(lintel);

  // ---- the two sliding doors (brushed steel with a seam line) ----
  const doorTex = tex(128, 512, (x, w, h) => { const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#c9d0d7'); g.addColorStop(0.5, '#e2e7ec'); g.addColorStop(1, '#c2c9d1'); x.fillStyle = g; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(150,160,170,0.5)'; x.lineWidth = 2; for (let k = 0; k < 8; k++) { x.beginPath(); x.moveTo(k * 18 + 6, 0); x.lineTo(k * 18 + 6, h); x.stroke(); } });
  const mkDoor = (s) => {
    const g = new THREE.Group();
    const panel = new THREE.Mesh(new THREE.BoxGeometry(DW, DH, 0.05), tmat(doorTex)); panel.castShadow = true; panel.receiveShadow = true; g.add(panel);
    const ink = outlined(new THREE.BoxGeometry(DW, DH, 0.05), new THREE.MeshBasicMaterial({ visible: false }), 0.006); g.add(ink);
    // a slim seam highlight on the meeting edge
    const seam = box(0.012, DH, 0.052, steelD, 0); seam.position.set(-s * (DW / 2 - 0.006), 0, 0); g.add(seam);
    g.position.set(s * DW / 2, DH / 2, BZ - 0.02);        // closed: the two meet at x=0
    g.userData.closedX = s * DW / 2; g.userData.s = s; scene.add(g); return g;
  };
  out.doorL = mkDoor(-1); out.doorR = mkDoor(1);

  // ---- floor indicator above the lintel: a dark panel with up/down arrows and a number ----
  const disp = box(0.5, 0.26, 0.05, dark, 0.004); disp.position.set(0, DH + 0.3, BZ + 0.04); scene.add(disp);
  const arrowMat = (c) => { const m = new THREE.MeshBasicMaterial({ color: c }); return m; };
  const tri = (up) => { const sh = new THREE.Shape(); const r = 0.05; if (up) { sh.moveTo(0, r); sh.lineTo(-r, -r); sh.lineTo(r, -r); } else { sh.moveTo(0, -r); sh.lineTo(-r, r); sh.lineTo(r, r); } sh.closePath(); const g = new THREE.ShapeGeometry(sh); return g; };
  const arrowUp = new THREE.Mesh(tri(true), arrowMat(0x3a4048)); arrowUp.position.set(-0.17, DH + 0.3, BZ + 0.075); scene.add(arrowUp); out.arrowUp = arrowUp;
  const arrowDn = new THREE.Mesh(tri(false), arrowMat(0x3a4048)); arrowDn.position.set(-0.17, DH + 0.3, BZ + 0.075); arrowDn.visible = false; scene.add(arrowDn); out.arrowDn = arrowDn;
  // a lit numeral strip
  const numCanvas = document.createElement('canvas'); numCanvas.width = 128; numCanvas.height = 128; const nctx = numCanvas.getContext('2d');
  const numTex = new THREE.CanvasTexture(numCanvas); numTex.colorSpace = THREE.SRGBColorSpace;
  out.setFloor = (txt) => { nctx.fillStyle = '#1a1e24'; nctx.fillRect(0, 0, 128, 128); nctx.fillStyle = '#ff9d3a'; nctx.font = 'bold 92px monospace'; nctx.textAlign = 'center'; nctx.textBaseline = 'middle'; nctx.fillText(txt, 64, 70); numTex.needsUpdate = true; };
  out.setFloor('1');
  const numPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshBasicMaterial({ map: numTex })); numPlate.position.set(0.09, DH + 0.3, BZ + 0.08); scene.add(numPlate);

  // ---- call-button panel on the right jamb ----
  const panel = box(0.1, 0.3, 0.05, steelD, 0.004); panel.position.set(DW + 0.17, 1.2, BZ + 0.05); scene.add(panel);
  const btnUp = cyl(0.028, 0.028, 0.03, toon(0xe8e2d6), 0.003, 16); btnUp.rotation.x = Math.PI / 2; btnUp.position.set(DW + 0.17, 1.28, BZ + 0.09); scene.add(btnUp);
  const btnDn = cyl(0.028, 0.028, 0.03, toon(0xe8e2d6), 0.003, 16); btnDn.rotation.x = Math.PI / 2; btnDn.position.set(DW + 0.17, 1.12, BZ + 0.09); scene.add(btnDn);
  out.btnUp = btnUp.userData.mesh;

  // ---- the safety beam across the threshold ----
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 2 * DW - 0.04, 12), new THREE.MeshBasicMaterial({ color: 0xff5a5a, transparent: true, opacity: 0.0 }));
  beam.rotation.z = Math.PI / 2; beam.position.set(0, BEAMY, BZ - 0.02); scene.add(beam); out.beam = beam;
  // the two little emitters on the jambs
  for (const s of [-1, 1]) { const e = cyl(0.016, 0.016, 0.03, dark, 0.002, 10); e.rotation.z = Math.PI / 2; e.position.set(s * (DW - 0.01), BEAMY, BZ - 0.02); scene.add(e); }

  // ---- potted plant beside the lift ----
  const plant = new THREE.Group(); plant.position.copy(PLANT); scene.add(plant);
  const pot = cyl(0.17, 0.13, 0.34, trim, 0.006, 20); pot.position.y = 0.17; plant.add(pot);
  const rim = cyl(0.185, 0.17, 0.06, toon(0xb86a44), 0.004, 20); rim.position.y = 0.33; plant.add(rim);
  const soil = new THREE.Mesh(new THREE.CircleGeometry(0.15, 20), toon(0x4a3524)); soil.rotation.x = -Math.PI / 2; soil.position.y = 0.335; plant.add(soil);
  const stem = cyl(0.02, 0.03, 1.1, toon(0x4f7a3a), 0.004, 10); stem.position.y = 0.9; plant.add(stem);
  const leafMat = toon(0x5bb24a), leafMat2 = toon(0x4a9a3c);
  const rr = mulberry(21);
  for (let k = 0; k < 14; k++) {
    const big = k % 2 === 0; const lf = sphere(0.14, big ? leafMat : leafMat2, 1.5, 0.35, 0.9, 0.005, 14);
    const a = k / 14 * Math.PI * 2 + rr() * 0.4; const hy = 0.7 + rr() * 0.7; const rad = 0.16 + rr() * 0.12;
    lf.position.set(Math.cos(a) * rad, hy, Math.sin(a) * rad); lf.rotation.set(rr() * 0.5, a, 0.5 + rr() * 0.6); plant.add(lf);
  }
  // a loose sprig that sticks out toward the doorway (he plucks it); film.js hides it after the pluck
  const sprig = new THREE.Group();
  const twig = cyl(0.008, 0.012, 0.34, toon(0x4f7a3a), 0.003, 8); twig.rotation.z = -0.9; twig.position.set(0.14, 0.02, 0); sprig.add(twig);
  for (const [dx, dy] of [[0.26, 0.12], [0.3, -0.02], [0.2, 0.2]]) { const lf = sphere(0.09, leafMat, 1.5, 0.3, 0.9, 0.004, 12); lf.position.set(dx, dy, 0); lf.rotation.z = 0.4; sprig.add(lf); }
  sprig.position.set(0.02, 1.02, 0.14); plant.add(sprig); out.sprig = sprig;

  // ---- lobby dressing: a bench on the right, a wall clock, a rug ----
  const bench = new THREE.Group(); bench.position.set(2.5, 0, BZ + 0.6); scene.add(bench);
  const seat = box(1.4, 0.08, 0.4, trim, 0.006); seat.position.y = 0.45; bench.add(seat);
  for (const x of [-0.6, 0.6]) { const l = box(0.08, 0.45, 0.36, toon(0x8a5436), 0.004); l.position.set(x, 0.225, 0); bench.add(l); }
  const clk = cyl(0.22, 0.22, 0.04, white, 0.006, 40); clk.rotation.x = Math.PI / 2; clk.position.set(2.2, 2.7, BZ - 0.02); scene.add(clk);
  const clkRim = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 8, 40), trim); clkRim.position.set(2.2, 2.7, BZ + 0.0); scene.add(clkRim);
  out.hands = [];
  for (const [len, w] of [[0.14, 0.014], [0.1, 0.018]]) { const h = new THREE.Group(); h.position.set(2.2, 2.7, BZ + 0.02); const b = new THREE.Mesh(new THREE.BoxGeometry(w, len, 0.006), dark); b.position.y = len / 2; h.add(b); scene.add(h); out.hands.push(h); }
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.3, 64), toon(0xcf7f54)); rug.rotation.x = -Math.PI / 2; rug.position.set(0.2, 0.004, 0.9); rug.scale.set(1, 0.7, 1); rug.receiveShadow = true; scene.add(rug);
  const rug2 = new THREE.Mesh(new THREE.RingGeometry(1.12, 1.2, 64), white); rug2.rotation.x = -Math.PI / 2; rug2.position.set(0.2, 0.005, 0.9); rug2.scale.set(1, 0.7, 1); scene.add(rug2);
  // a framed print on the left wall
  const frame = box(0.7, 0.5, 0.04, white, 0.005); frame.position.set(-2.4, 2.1, BZ - 0.02); scene.add(frame);
  const art = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.38), toon(0x7fb8e0)); art.position.set(-2.4, 2.1, BZ + 0.01); scene.add(art);

  scene.traverse((o) => { if (o.isMesh && o.material && o.material.isMeshToonMaterial) { o.castShadow = true; o.receiveShadow = true; } });
  floor.castShadow = false;
  return out;
}
