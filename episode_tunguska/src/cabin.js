// The trading-post izba (HQ): every wall a stack of round logs with axe-cut ends crossing at the corners (saddle notches),
// moss chinking in the seams, gables of vertical boards, a shingle roof (≈500 hand-split shingles), a fieldstone chimney,
// a plank door with Z-brace, a window with carved pale-blue nalichnik trim, open shutters, curtains, a dim interior,
// a porch deck of separate boards on log joists, steps, and a few props (barrel, bucket, broom, woodpile, chopping block).
// Same footprint as before: front wall face at z = 0, house x ±3.5, z −5..0, deck top at y 0.35, window centre (1.4, 1.8).
import * as THREE from './three.module.js';
import { mulberry } from './toon.js';
import { merge, splitCyl, logTex, endTex, plankTex, stoneTex, vnoise } from './hq.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const STD = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, ...o });
const box = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };

export function buildCabin(cab, Hl = () => 0, r = mulberry(31)) {   // Hl(x, z): ground height in cabin-local coordinates
  const LT = logTex(), ET = endTex(), PT = plankTex(5), BT = plankTex(1, [140, 104, 72]), ST = stoneTex();
  const logM = STD(0xffffff, { map: LT.map, normalMap: LT.normalMap, vertexColors: true }), endM = STD(0xffffff, { map: ET.map, normalMap: ET.normalMap, vertexColors: true });
  const out = { meshes: [] }; const add = (g, m, shadow = true) => { const o = new THREE.Mesh(g, m); o.castShadow = shadow; o.receiveShadow = true; cab.add(o); out.meshes.push(o); return o; };
  // ---- log walls
  const R = 0.17, S = 0.3, logs = [];
  const tint = () => { const k = 0.82 + r() * 0.3; return [k, k * (0.96 + r() * 0.06), k * (0.92 + r() * 0.1)]; };
  const log = (axis, a0, a1, y, c, rad = R) => { const L = a1 - a0; const g = new THREE.CylinderGeometry(rad * (0.95 + r() * 0.1), rad * (0.95 + r() * 0.1), L, 16, 1); const uv = g.attributes.uv; const off = r(), rep = L / 1.6;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) + off, uv.getY(i) * rep + off * 3);
    g.rotateY(r() * 6.28); if (axis === 'x') g.rotateZ(Math.PI / 2); else g.rotateX(Math.PI / 2);
    if (axis === 'x') g.translate((a0 + a1) / 2, y, c); else g.translate(c, y, (a0 + a1) / 2); const t = tint();
    logs.push({ g, col: t }); };
  const OPEN = [[-2.15, -1.05, -1, 2.3], [0.75, 2.05, 1.25, 2.35]];   // door, window: x0, x1, y0, y1
  for (let i = 0; i < 11; i++) { const y = 0.17 + i * S, ys = y + S / 2;
    // front wall (cut around the openings), back wall
    let segs = [[-3.85, 3.85]]; for (const [x0, x1, y0, y1] of OPEN) if (y > y0 - 0.05 && y < y1 + 0.05) segs = segs.flatMap(([a, b]) => (x1 <= a || x0 >= b) ? [[a, b]] : [[a, x0], [x1, b]].filter(([p, q]) => q - p > 0.05));
    for (const [a, b] of segs) log('x', a, b, y, -R); log('x', -3.85, 3.85, y, -5 + R);
    for (const s of [-1, 1]) log('z', -5.35, 0.35, ys, s * (3.5 - R)); }
  // gables: shorter side logs up to the ridge line
  const TH = 0.62, RIDGE = 5.65;
  for (let i = 0; i < 7; i++) { const ys = 3.32 + 0.15 + i * S; const half = (RIDGE - ys - 0.1) / Math.tan(TH); if (half < 0.25) break; for (const s of [-1, 1]) log('z', -2.5 - half, -2.5 + half, ys, s * (3.5 - R)); }
  // logs → one mesh: bark side (group 0) + end grain caps (groups 1, 2) — split by triangle groups
  { const side = [], caps = []; for (const L of logs) { const [a, b] = splitCyl(L.g, L.col); side.push(a); caps.push(b); } add(merge([...side, ...caps]), [logM, endM]); }
  // moss chinking along the seams of the front wall and sides (thin dark-green strands)
  { const parts = []; for (let i = 0; i < 11; i++) { const y = 0.17 + i * S + S / 2; let segs = [[-3.5, 3.5]]; for (const [x0, x1, y0, y1] of OPEN) if (y > y0 - 0.1 && y < y1 + 0.1) segs = segs.flatMap(([a, b]) => (x1 <= a || x0 >= b) ? [[a, b]] : [[a, x0], [x1, b]].filter(([p, q]) => q - p > 0.05));
      for (const [a, b] of segs) { const g = new THREE.CylinderGeometry(0.03, 0.03, b - a, 6, 1); const A = g.attributes.position; for (let k = 0; k < A.count; k++) { const yy = A.getY(k); const w = 0.6 + 0.8 * vnoise(yy * 3 + i * 7, A.getX(k) * 9); A.setX(k, A.getX(k) * w); A.setZ(k, A.getZ(k) * w); } g.computeVertexNormals(); g.rotateZ(Math.PI / 2); g.translate((a + b) / 2, y, -0.075); parts.push({ g, col: [0.5 + r() * 0.15, 0.48 + r() * 0.1, 0.3] }); } }
    add(merge(parts), STD(0x6a6a44, { vertexColors: true, roughness: 1 }), false); }
  // dim interior + floor so the window and door read as openings into a room
  add(box(6.3, 3.4, 4.3, 0, 1.7, -2.5), STD(0x2a2018, { side: THREE.BackSide, roughness: 1 }), false);
  // ---- door (plank door, Z-brace, jambs, iron latch)
  const plankM = STD(0xffffff, { map: PT.map, normalMap: PT.normalMap }); const boardM = STD(0xffffff, { map: BT.map, normalMap: BT.normalMap, vertexColors: true });
  add(box(1.0, 2.2, 0.06, -1.6, 1.1, -0.22), plankM);
  { const parts = []; for (const y of [0.35, 1.85]) parts.push({ g: box(0.92, 0.14, 0.04, -1.6, y, -0.17), col: [0.85, 0.8, 0.75] });
    const d = box(0.12, 1.75, 0.04, 0, 0, 0); d.rotateZ(Math.atan2(1.5, 0.75) - Math.PI / 2); d.translate(-1.6, 1.1, -0.17); parts.push({ g: d, col: [0.85, 0.8, 0.75] });
    for (const x of [-2.12, -1.08]) parts.push({ g: box(0.1, 2.4, 0.4, x, 1.2, -0.17), col: [0.95, 0.9, 0.85] });
    parts.push({ g: box(1.24, 0.14, 0.42, -1.6, 2.38, -0.17), col: [0.95, 0.9, 0.85] }); add(merge(parts), boardM); }
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 8).rotateZ(Math.PI / 2).translate(-1.25, 1.05, -0.12), STD(0x2a2624, { metalness: 0.6, roughness: 0.5 }));
  // ---- window: casing, sill, mullions, carved nalichnik (pale blue + white), open shutters, curtains
  const blue = STD(0x8fb3cc, { roughness: 0.7 }), white = STD(0xeeeae0, { roughness: 0.7 });
  { const parts = []; for (const x of [0.79, 2.01]) parts.push({ g: box(0.08, 1.2, 0.36, x, 1.8, -0.17) }); parts.push({ g: box(1.3, 0.08, 0.36, 1.4, 2.36, -0.17) }); parts.push({ g: box(1.3, 0.08, 0.36, 1.4, 1.24, -0.17) });
    parts.push({ g: box(0.045, 0.95, 0.04, 1.4, 1.8, -0.07) }); parts.push({ g: box(1.15, 0.045, 0.04, 1.4, 1.95, -0.07) }); add(merge(parts), white); }
  add(box(1.6, 0.06, 0.34, 1.4, 1.2, 0.06), boardM);   // sill
  { const parts = []; for (const x of [0.66, 2.14]) parts.push({ g: box(0.13, 1.42, 0.04, x, 1.8, 0.03) }); parts.push({ g: box(1.6, 0.12, 0.04, 1.4, 1.1, 0.03) });
    // pediment: a stepped carved top with a sun-burst cut-out suggested by a white inner board
    const ped = new THREE.Shape(); ped.moveTo(-0.85, 0); ped.lineTo(0.85, 0); ped.lineTo(0.7, 0.18); ped.quadraticCurveTo(0.35, 0.22, 0, 0.42); ped.quadraticCurveTo(-0.35, 0.22, -0.7, 0.18); ped.closePath();
    const pg = new THREE.ExtrudeGeometry(ped, { depth: 0.04, bevelEnabled: false }); pg.translate(1.4, 2.5, 0.01); parts.push({ g: pg }); add(merge(parts), blue); }
  { const ped = new THREE.Shape(); ped.moveTo(-0.5, 0); ped.lineTo(0.5, 0); ped.quadraticCurveTo(0.2, 0.1, 0, 0.26); ped.quadraticCurveTo(-0.2, 0.1, -0.5, 0); const pg = new THREE.ExtrudeGeometry(ped, { depth: 0.02, bevelEnabled: false }); pg.translate(1.4, 2.55, 0.05);
    const parts = [{ g: pg }]; for (let k = 0; k < 7; k++) parts.push({ g: new THREE.SphereGeometry(0.028, 8, 6).translate(0.8 + k * 0.1, 2.5, 0.07) }); add(merge(parts), white); }
  // shutters (open against the wall): boards + white diamond
  for (const [x, s] of [[0.27, -1], [2.53, 1]]) { add(box(0.6, 1.15, 0.05, x, 1.8, 0.04), blue); const dm = new THREE.PlaneGeometry(0.22, 0.22).rotateZ(Math.PI / 4).translate(x, 1.8, 0.07); add(dm, white, false);
    for (const y of [1.35, 2.25]) add(box(0.56, 0.06, 0.02, x, y, 0.075), white, false); }
  // curtains: two gathered panels behind the glass
  { const parts = []; for (const s of [-1, 1]) { const g = new THREE.PlaneGeometry(0.42, 1.0, 18, 1); const A = g.attributes.position; for (let i = 0; i < A.count; i++) { const x = A.getX(i); A.setZ(i, Math.sin(x * 60) * 0.025); } g.computeVertexNormals(); g.translate(1.4 + s * 0.38, 1.8, -0.3); parts.push({ g, col: [0.95, 0.92, 0.85] }); }
    parts.push({ g: box(1.3, 0.12, 0.02, 1.4, 2.27, -0.29), col: [0.75, 0.3, 0.25] }); add(merge(parts), STD(0xffffff, { vertexColors: true, side: THREE.DoubleSide, roughness: 1 }), false); }
  // ---- roof: board sheathing, ≈500 shingles, ridge boards, barge boards, gable boards
  const shM = STD(0xffffff, { map: BT.map, normalMap: BT.normalMap, roughness: 0.95 });
  { const rows = [], q = new THREE.Quaternion(), m = new THREE.Matrix4();
    for (const s of [-1, 1]) { const Ls = 2.5 / Math.cos(TH) + 0.65; for (let j = 0; j < 13; j++) { const d = Ls - j * 0.3 - 0.25; if (d < 0.1) break; let x = -4.25 + (j % 2) * 0.2;
        while (x < 4.25) { const w = 0.3 + r() * 0.2; const cx = Math.min(x + w / 2, 4.25 - 0.1); const along = d; const yy = RIDGE - along * Math.sin(TH) + 0.07, zz = -2.5 + s * along * Math.cos(TH);
          rows.push({ p: V(cx, yy, zz), rx: s * (TH - 0.04 - r() * 0.03), rz: (r() - 0.5) * 0.04, w, c: 0.75 + r() * 0.35, moss: r() < 0.12 }); x += w + 0.015; } } }
    const im = new THREE.InstancedMesh(box(1, 0.025, 0.5, 0, 0, 0), shM, rows.length); im.castShadow = im.receiveShadow = true; const col = new THREE.Color();
    rows.forEach((o, i) => { q.setFromEuler(new THREE.Euler(o.rx, 0, o.rz)); m.compose(o.p, q, V(o.w, 1, 1)); im.setMatrixAt(i, m); im.setColorAt(i, o.moss ? col.setRGB(0.55 * o.c, 0.62 * o.c, 0.4 * o.c) : col.setRGB(0.78 * o.c, 0.72 * o.c, 0.66 * o.c)); });
    cab.add(im); out.shingles = im;
    const parts = []; for (const s of [-1, 1]) { const Ls = 2.5 / Math.cos(TH) + 0.65; const g = box(8.5, 0.05, Ls, 0, 0, s * Ls / 2); g.rotateX(s * TH); g.translate(0, RIDGE, -2.5); parts.push({ g, col: [0.6, 0.55, 0.5] });
      const rb = box(8.6, 0.05, 0.28, 0, 0, s * 0.12); rb.rotateX(s * TH); rb.translate(0, RIDGE + 0.1, -2.5); parts.push({ g: rb, col: [0.9, 0.85, 0.8] });
      for (const x of [-4.3, 4.3]) { const bb = box(0.05, 0.22, Ls + 0.1, x, 0, s * (Ls + 0.1) / 2); bb.rotateX(s * TH); bb.translate(0, RIDGE + 0.02, -2.5); parts.push({ g: bb, col: [0.85, 0.8, 0.75] }); } }
    add(merge(parts), boardM); }
  // ---- chimney (fieldstone) through the back slope, with a cap
  { const cm = STD(0xffffff, { map: ST.map, normalMap: ST.normalMap }); ST.map.repeat.set(1, 3); ST.normalMap.repeat.set(1, 3); add(box(0.75, 4.2, 0.75, -1.9, 4.1, -3.4), cm); add(box(0.95, 0.12, 0.95, -1.9, 6.26, -3.4), STD(0x5a5450)); }
  // frieze boards closing the gap between the top logs and the roof (front and back)
  add(merge([{ g: box(7.4, 0.5, 0.05, 0, 3.6, 0.02), col: [0.8, 0.75, 0.7] }, { g: box(7.4, 0.5, 0.05, 0, 3.6, -5.02), col: [0.8, 0.75, 0.7] }]), boardM);
  // ---- porch: boards on log joists, edge board, two steps
  { const parts = []; for (let i = 0; i < 39; i++) { const x = -3.6 + i * 0.185 + 0.09; const g = box(0.17, 0.06, 2.3 - r() * 0.04, x, 0.32, 1.15); const uv = g.attributes.uv; const off = r(); for (let k = 0; k < uv.count; k++) uv.setY(k, uv.getY(k) * 1.4 + off); parts.push({ g, col: tint() }); }
    parts.push({ g: box(7.3, 0.18, 0.06, 0, 0.24, 2.32), col: [0.8, 0.75, 0.7] });
    for (const [y, z] of [[0.24, 2.6], [0.12, 2.9]]) parts.push({ g: box(1.3, 0.05, 0.3, -1.6, y, z), col: [0.9, 0.85, 0.8] });
    for (const x of [-2.2, -1.0]) parts.push({ g: box(0.06, 0.3, 0.7, x, 0.15, 2.7), col: [0.7, 0.65, 0.6] });
    const pm = add(merge(parts), STD(0xffffff, { map: LT.map, normalMap: LT.normalMap, vertexColors: true })); pm.castShadow = true;
    const j = []; for (const z of [0.3, 1.2, 2.1]) { const g = new THREE.CylinderGeometry(0.12, 0.12, 7.3, 12); g.rotateZ(Math.PI / 2); g.translate(0, 0.16, z); j.push({ g, col: tint() }); } add(merge(j), logM); }
  // ---- props: water barrel + bucket on the deck, broom by the door, woodpile at the left corner, chopping block with an axe
  { const bm = STD(0xffffff, { map: BT.map, normalMap: BT.normalMap }); const bar = new THREE.CylinderGeometry(0.32, 0.29, 0.85, 20, 6); { const A = bar.attributes.position; for (let i = 0; i < A.count; i++) { const k = 1 + 0.08 * Math.cos(A.getY(i) / 0.425 * Math.PI / 2); A.setX(i, A.getX(i) * k); A.setZ(i, A.getZ(i) * k); } bar.computeVertexNormals(); }
    bar.translate(3.05, 0.35 + 0.425, 0.45); add(bar, bm); const hoops = []; for (const y of [0.15, 0.7]) { const t = new THREE.TorusGeometry(0.33, 0.012, 6, 32); t.rotateX(Math.PI / 2); t.translate(3.05, 0.35 + y, 0.45); hoops.push({ g: t }); } add(merge(hoops), STD(0x3a3430, { metalness: 0.7, roughness: 0.45 }));
    const wat = new THREE.CircleGeometry(0.3, 24).rotateX(-Math.PI / 2).translate(3.05, 0.35 + 0.78, 0.45); add(wat, STD(0x1a2a30, { roughness: 0.05, metalness: 0.1 }), false);
    const bk = new THREE.CylinderGeometry(0.16, 0.12, 0.3, 16, 1, true); bk.translate(2.45, 0.5, 0.35); add(bk, STD(0x7a7672, { metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide }));
    const br = []; const st = new THREE.CylinderGeometry(0.02, 0.02, 1.4, 6); st.translate(0, 0.7, 0); br.push({ g: st, col: [0.7, 0.55, 0.4] }); const bh = new THREE.ConeGeometry(0.14, 0.45, 10, 1, true); bh.rotateX(Math.PI); bh.translate(0, 0.0, 0); br.push({ g: bh, col: [0.75, 0.62, 0.35] });
    const brg = merge(br); brg.rotateZ(-0.12); brg.translate(-0.85, 0.55, 0.12); add(brg, STD(0xffffff, { vertexColors: true, side: THREE.DoubleSide }));
    const wp = [], wpc = []; for (let row = 0; row < 6; row++) for (let k = 0; k < 9; k++) { const rad = 0.09 + r() * 0.04; const g = new THREE.CylinderGeometry(rad, rad, 0.55, 3 + Math.floor(r() * 3), 1); g.rotateX(Math.PI / 2); g.rotateZ(r() * 6); g.translate(-5.5 + k * 0.2 + (row % 2) * 0.1, 0.1 + row * 0.18, 0.55 + (r() - 0.5) * 0.08);
      const [a, b] = splitCyl(g, tint()); wp.push(a); wpc.push(b); }
    add(merge([...wp, ...wpc]), [logM, endM]); add(merge([-5.65, -3.72].map((x) => ({ g: box(0.07, 1.25, 0.07, x, 0.62, 0.55), col: [0.8, 0.75, 0.7] }))), boardM);
    const blk = new THREE.CylinderGeometry(0.3, 0.33, 0.55, 18); blk.translate(-5.0, 0.27 + Hl(-5, 2.6), 2.6); add(merge(splitCyl(blk, [0.9, 0.85, 0.8])), [logM, endM]);
    const ax = []; const hd = box(0.08, 0.16, 0.22, 0, 0, 0); ax.push({ g: hd, col: [0.35, 0.36, 0.38] }); const hn = new THREE.CylinderGeometry(0.018, 0.022, 0.75, 6); hn.translate(0, 0.37, 0); ax.push({ g: hn, col: [0.8, 0.6, 0.4] });
    const axg = merge(ax); axg.rotateZ(0.7); axg.translate(-5.0, 0.6 + Hl(-5, 2.6), 2.6); add(axg, STD(0xffffff, { vertexColors: true, roughness: 0.6 })); }
  // ---- path of trodden earth from the steps
  { const g = new THREE.PlaneGeometry(1.4, 9, 8, 30); const A = g.attributes.position; for (let i = 0; i < A.count; i++) A.setX(i, A.getX(i) * (0.8 + 0.4 * vnoise(A.getY(i) * 0.8, 0)) + Math.sin(A.getY(i) * 0.4) * 0.5); g.rotateX(-Math.PI / 2); g.translate(-1.6, 0, 7.5); for (let i = 0; i < A.count; i++) A.setY(i, Hl(A.getX(i), A.getZ(i)) + 0.025); g.computeVertexNormals();
    add(g, STD(0x6a5a44, { roughness: 1, transparent: false }), false); }
  return out;
}
