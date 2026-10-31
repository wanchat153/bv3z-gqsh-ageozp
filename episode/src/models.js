// Hard-surface and character models built in code: the cowboy, his hat, the bandit's revolver + glove, the round.
import * as THREE from './three.module.js';

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const mix = (a, b, u) => a + (b - a) * u;
export function mulberry(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const interp = (arr, u) => { const f = u * (arr.length - 1); const i = Math.min(arr.length - 2, Math.floor(f)); return mix(arr[i], arr[i + 1], f - i); };

// fine fabric / leather grain for bump maps (deterministic)
export function grainTexture(seed, size = 256, scale = 1) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  const img = g.createImageData(size, size); const r = mulberry(seed);
  const base = new Float32Array(size * size); for (let i = 0; i < base.length; i++) base[i] = r();
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let s = 0, w = 0; // a little box blur for a woven feel
    for (let k = -1; k <= 1; k++) { s += base[((y + k + size) % size) * size + x] * 0.6 + base[y * size + ((x + k + size) % size)] * 0.4; w += 1; }
    const v = Math.round(clamp(128 + (s / w - 0.5) * 255 * scale + 20 * Math.sin(x * 0.9) * Math.sin(y * 0.35), 0, 255));
    const i = (y * size + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; return t;
}
export const CLOTH = grainTexture(21); CLOTH.repeat.set(6, 10);
export const LEATHER = grainTexture(22, 256, 0.6); LEATHER.repeat.set(3, 3);
export const mat = (c, rough, metal = 0, bump = null, bs = 0.6) => {
  const m = new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal });
  if (bump) { m.bumpMap = bump; m.bumpScale = bs; }
  return m;
};

// smooth tapered tube along a curve, radius per control point, rounded ends
export function limb(pts, radii, material, segs = 24, radial = 16, caps = true) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => V3(...p)), false, 'centripetal');
  const g = new THREE.TubeGeometry(curve, segs, 1, radial, false);
  const pa = g.attributes.position; const c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    curve.getPointAt(i / segs, c); const r = interp(radii, i / segs);
    for (let j = 0; j <= radial; j++) { const k = i * (radial + 1) + j; v.fromBufferAttribute(pa, k).sub(c).multiplyScalar(r).add(c); pa.setXYZ(k, v.x, v.y, v.z); }
  }
  g.computeVertexNormals();
  const grp = new THREE.Group(); grp.add(new THREE.Mesh(g, material));
  if (caps) for (const [u, r] of [[0, radii[0]], [1, radii[radii.length - 1]]]) { const s = new THREE.Mesh(new THREE.SphereGeometry(r, radial, 10), material); s.position.copy(curve.getPointAt(u)); grp.add(s); }
  return grp;
}

// a draped cloth surface around the body: rows from y0 down to y1; ring = ellipse (rx, rz) opened at the front by gap(v)
export function drape({ y0, y1, rx, rz, gap, folds = 0, foldK = 9, rows = 28, cols = 72, zoff = 0, seed = 1 }) {
  const g = new THREE.BufferGeometry(); const pos = [], uv = [], idx = [];
  const rr = mulberry(seed); const ph = Array.from({ length: 4 }, () => rr() * 6.28);
  for (let i = 0; i <= rows; i++) {
    const v = i / rows, y = mix(y0, y1, v); const gp = interp(gap, v);
    for (let j = 0; j <= cols; j++) {
      const u = j / cols; const th = mix(gp, Math.PI * 2 - gp, u);
      const f = interp(folds instanceof Array ? folds : [folds, folds], v);
      const fold = 1 + f * (Math.sin(th * foldK + ph[0] + 1.6 * Math.sin(th * 3 + ph[1])) * 0.6 + Math.sin(th * (foldK * 1.7) + ph[2]) * 0.4);
      const edge = Math.pow(1 - Math.min(1, Math.min(th - gp, Math.PI * 2 - gp - th) / 0.5), 3); // lapels roll outward a touch
      const ax = interp(rx, v) * fold * (1 + 0.06 * edge), az = interp(rz, v) * fold * (1 + 0.06 * edge);
      pos.push(ax * Math.sin(th), y - 0.01 * edge * v, az * Math.cos(th) + zoff); uv.push(u, v);
    }
  }
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) { const a = i * (cols + 1) + j, b = a + cols + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  g.setIndex(idx); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals(); return g;
}

// ---------------- the cowboy ----------------
export function makeCowboy() {
  const root = new THREE.Group();
  const coatM = mat(0x46352a, 0.92, 0, CLOTH, 0.9); coatM.side = THREE.DoubleSide;
  const capeM = coatM;
  const denim = mat(0x2a3140, 0.95, 0, CLOTH, 0.7), shirt = mat(0x6a5a48, 0.9, 0, CLOTH, 0.5), vest = mat(0x2a2018, 0.85, 0, LEATHER, 0.5);
  const boot = mat(0x2a1c14, 0.55, 0, LEATHER, 0.8), belt = mat(0x3a2618, 0.6, 0, LEATHER, 0.8), brass = mat(0xb08a4a, 0.35, 1.0), steel = mat(0x8a8c92, 0.35, 0.9);
  const skin = mat(0x4a3024, 0.75), glove = mat(0x5a4030, 0.7, 0, LEATHER, 0.6), red = mat(0x5e1c16, 0.9, 0, CLOTH, 0.6);
  const add = (o) => { root.add(o); return o; };

  // legs (weight on the right, left foot turned out a little)
  add(limb([[-0.12, 0.92, 0.0], [-0.135, 0.52, 0.035], [-0.15, 0.13, 0.03]], [0.088, 0.066, 0.05], denim));
  add(limb([[0.11, 0.92, 0.0], [0.12, 0.52, 0.01], [0.13, 0.13, -0.02]], [0.088, 0.066, 0.05], denim));
  // boots: shaft, foot with a pointed toe, heel block, spur
  for (const [x, z, yaw] of [[-0.15, 0.03, -0.25], [0.13, -0.02, 0.12]]) {
    const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = yaw; root.add(b);
    b.add(limb([[0, 0.38, -0.01], [0, 0.2, -0.005], [0, 0.08, 0.0]], [0.064, 0.06, 0.055], boot, 10, 16));
    b.add(limb([[0, 0.065, -0.05], [0, 0.05, 0.06], [0, 0.035, 0.15], [0, 0.03, 0.2]], [0.052, 0.05, 0.034, 0.012], boot, 16, 16));
    const heel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.045, 0.06), boot); heel.position.set(0, 0.022, -0.055); b.add(heel);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.012, 0.2), mat(0x15100c, 0.8)); sole.position.set(0, 0.008, 0.06); sole.scale.set(1, 1, 1); b.add(sole);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.006, 6, 24), belt); strap.rotation.x = Math.PI / 2; strap.position.set(0, 0.075, -0.01); strap.scale.set(1, 1.2, 1); b.add(strap);
    const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.05, 6), steel); shank.rotation.x = Math.PI / 2; shank.position.set(0, 0.07, -0.09); b.add(shank);
    const rowel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.003, 10), steel); rowel.rotation.z = Math.PI / 2; rowel.position.set(0, 0.07, -0.115); b.add(rowel);
  }
  // torso: shirt under a vest
  {
    const prof = [[0.0, 0.84], [0.16, 0.86], [0.165, 0.95], [0.152, 1.04], [0.17, 1.16], [0.19, 1.27], [0.18, 1.38], [0.13, 1.45], [0.06, 1.5], [0.0, 1.5]].map(([r, y]) => new THREE.Vector2(r, y));
    const t = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), shirt); t.scale.set(1.12, 1, 0.72); add(t);
    const vp = [[0.172, 0.93], [0.16, 1.04], [0.178, 1.16], [0.198, 1.27], [0.188, 1.37], [0.15, 1.43]].map(([r, y]) => new THREE.Vector2(r, y));
    const v = new THREE.Mesh(new THREE.LatheGeometry(vp, 40, 0.28, Math.PI * 2 - 0.56), vest); v.material.side = THREE.DoubleSide; v.scale.set(1.12, 1, 0.74); add(v);
  }
  // gun belt slung low on the right, cartridge loops, holster with the revolver's grip
  {
    const gb = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.024, 8, 48), belt); gb.rotation.x = Math.PI / 2; gb.rotation.y = -0.14; gb.scale.set(1.15, 0.78, 1.6); gb.position.set(0.01, 0.885, 0); add(gb);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.045, 0.01), brass); buckle.position.set(-0.02, 0.9, 0.145); buckle.rotation.z = -0.14; add(buckle);
    for (let k = 0; k < 14; k++) { const a = Math.PI * 0.55 + k * 0.13; const c = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.03, 6), brass); c.position.set(Math.cos(a) * 0.215, 0.885 + Math.cos(a) * 0.026 + 0.01, Math.sin(a) * 0.15); add(c); }
    const hol = limb([[0.235, 0.86, 0.01], [0.245, 0.74, 0.015], [0.25, 0.6, 0.02]], [0.038, 0.034, 0.024], belt, 10, 12); add(hol);
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.004, 6, 24), belt); tie.rotation.x = Math.PI / 2; tie.position.set(0.15, 0.64, 0.02); tie.scale.set(1.1, 1, 0.8); add(tie);
    add(limb([[0.245, 0.86, 0.0], [0.25, 0.92, -0.02], [0.245, 0.97, -0.05]], [0.016, 0.017, 0.018], mat(0x4a2a16, 0.5, 0, LEATHER, 0.3), 8, 10));
    const hm = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.02, 0.012), steel); hm.position.set(0.245, 0.9, 0.0); add(hm);
  }
  // arms in coat sleeves: right hand hovering by the gun, left relaxed
  const sleeve = coatM;
  add(limb([[0.2, 1.4, 0.0], [0.285, 1.13, -0.045], [0.3, 0.95, 0.04]], [0.07, 0.06, 0.05], sleeve));
  add(limb([[-0.2, 1.4, 0.0], [-0.275, 1.12, -0.03], [-0.27, 0.9, 0.05]], [0.07, 0.06, 0.05], sleeve));
  // gloved hands
  const hand = (x, y, z, sx, open) => {
    const h = new THREE.Group(); h.position.set(x, y, z); root.add(h);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), glove); p.scale.set(0.6, 1.0, 0.95); h.add(p);
    for (let k = 0; k < 4; k++) h.add(limb([[0, -0.03, -0.02 + k * 0.014], [sx * 0.008 * open, -0.07, -0.02 + k * 0.016], [sx * 0.02 * open, -0.095 + k * 0.004, -0.01 + k * 0.016]], [0.0095, 0.0085, 0.0075], glove, 6, 8));
    h.add(limb([[0, -0.01, 0.03], [sx * 0.012, -0.04, 0.045], [sx * 0.015, -0.06, 0.05]], [0.011, 0.01, 0.009], glove, 6, 8));
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.05, 16), glove); cuff.position.y = 0.035; h.add(cuff);
    return h;
  };
  hand(0.305, 0.9, 0.05, 1, 1.0);
  hand(-0.27, 0.85, 0.055, -1, 0.4);

  // the duster: long coat open at the front, folds deepening to the hem
  const coatGeo = drape({ y0: 1.43, y1: 0.4, rx: [0.215, 0.215, 0.235, 0.27, 0.31, 0.35], rz: [0.155, 0.16, 0.18, 0.21, 0.25, 0.28], gap: [0.32, 0.46, 0.5, 0.5, 0.48], folds: [0.0, 0.02, 0.05, 0.08], foldK: 8, zoff: -0.008, seed: 5 });
  const coat = add(new THREE.Mesh(coatGeo, coatM));
  // shoulder cape, the duster's tell
  const capeGeo = drape({ y0: 1.47, y1: 1.2, rx: [0.17, 0.27, 0.31], rz: [0.12, 0.2, 0.23], gap: [0.42, 0.55, 0.62], folds: [0.0, 0.05, 0.07], foldK: 7, rows: 12, cols: 64, zoff: -0.01, seed: 9 });
  const cape = add(new THREE.Mesh(capeGeo, capeM));
  // turned-up collar
  const colGeo = drape({ y0: 1.6, y1: 1.44, rx: [0.115, 0.105], rz: [0.1, 0.095], gap: [0.75, 0.55], folds: 0, rows: 5, cols: 48, zoff: -0.012, seed: 3 });
  add(new THREE.Mesh(colGeo, coatM));

  // head: neck, skull, jaw, nose, ears; bandana knotted at the throat
  const head = new THREE.Group(); head.position.set(0, 1.5, 0); root.add(head);
  head.add(limb([[0, -0.02, -0.005], [0, 0.08, 0.0]], [0.055, 0.05], skin, 4, 14));
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.1, 28, 20), skin); skull.scale.set(0.84, 1.08, 0.98); skull.position.set(0, 0.17, -0.005); head.add(skull);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.068, 20, 14), skin); jaw.scale.set(1.0, 0.85, 0.9); jaw.position.set(0, 0.105, 0.012); head.add(jaw);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.04, 10), skin); nose.position.set(0, 0.155, 0.095); nose.rotation.x = Math.PI / 2 + 0.5; head.add(nose);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), skin); e.scale.set(0.5, 1.1, 0.8); e.position.set(s * 0.083, 0.165, -0.01); head.add(e); }
  const bandana = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.018, 8, 24), red); bandana.rotation.x = Math.PI / 2 + 0.2; bandana.position.set(0, 0.035, 0.005); head.add(bandana);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.09, 3), red); tail.position.set(0.0, -0.02, 0.06); tail.rotation.set(0.25, Math.PI, 0); tail.scale.set(1, 1, 0.3); head.add(tail);

  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { root, head, coat, coatBase: Float32Array.from(coatGeo.attributes.position.array), cape, capeBase: Float32Array.from(capeGeo.attributes.position.array) };
}

// cattleman hat: creased crown, pinched front, rolled brim
export function makeHat() {
  const g = new THREE.Group();
  const felt = mat(0x2e241c, 0.95, 0, CLOTH, 0.4); felt.side = THREE.DoubleSide;
  const prof = []; for (let i = 0; i <= 14; i++) { const u = i / 14; prof.push(new THREE.Vector2(0.096 - 0.012 * u * u, u * 0.15)); }
  prof.push(new THREE.Vector2(0.05, 0.152)); prof.push(new THREE.Vector2(0.0, 0.15));
  const cg = new THREE.LatheGeometry(prof, 48); const pa = cg.attributes.position;
  for (let i = 0; i < pa.count; i++) {
    let x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i);
    const top = Math.max(0, (y - 0.08) / 0.072);
    y -= 0.04 * top * Math.exp(-(x * x) / 0.0012);              // centre crease
    if (z > 0) { x *= 1 - 0.28 * top * Math.min(1, z / 0.09); }  // front pinch
    pa.setXYZ(i, x * 1.0, y, z * 1.1);
  }
  cg.computeVertexNormals();
  const crown = new THREE.Mesh(cg, felt); g.add(crown);
  const bg = new THREE.RingGeometry(0.094, 0.25, 72, 4); const pb = bg.attributes.position;
  for (let i = 0; i < pb.count; i++) {
    const x = pb.getX(i), y = pb.getY(i); const r = Math.hypot(x, y), a = Math.atan2(y, x);
    const w = clamp((r - 0.12) / 0.13, 0, 1);
    const side = Math.pow(Math.abs(Math.cos(a)), 2.0);
    const lift = w * w * (0.07 * side) - w * 0.012 * (1 - side);
    pb.setXYZ(i, x, y * 1.08, lift);
  }
  bg.computeVertexNormals();
  const brim = new THREE.Mesh(bg, felt); brim.rotation.x = -Math.PI / 2; g.add(brim);
  const edge = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.003, 4, 96), felt); edge.rotation.x = Math.PI / 2; edge.scale.set(1, 1.08, 1); g.add(edge);
  // the edge has to follow the brim curl: rebuild positions
  { const pe = edge.geometry.attributes.position; for (let i = 0; i < pe.count; i++) { const x = pe.getX(i), y = pe.getY(i), z = pe.getZ(i); const a = Math.atan2(y, x); const side = Math.pow(Math.abs(Math.cos(a)), 2.0); pe.setZ(i, z - (0.07 * side - 0.012 * (1 - side))); } edge.geometry.computeVertexNormals(); }
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0975, 0.0985, 0.022, 48, 1, true), mat(0x15100c, 0.7)); band.position.y = 0.013; band.scale.z = 1.1; g.add(band);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  return g;
}

// ---------------- the bandit's revolver (single-action, side profile in metres) ----------------
// local frame: muzzle at the origin, barrel along -z (fires toward -z), +y up, grip at +z
export function makeRevolver() {
  const gun = new THREE.Group();
  const blued = mat(0x2a2e38, 0.22, 0.9), steel = mat(0x9a9ca2, 0.28, 0.95), wood = mat(0x5a301a, 0.45, 0, LEATHER, 0.25), brassM = mat(0xb08a4a, 0.3, 1.0);
  const glove = mat(0x5a4030, 0.72, 0, LEATHER, 0.7), cuffM = mat(0x2a2420, 0.95, 0, CLOTH, 0.6), sleeveM = mat(0x262a30, 0.95, 0, CLOTH, 0.8);
  const prof = (pts, depth, m, bevel = 0.0015) => {
    const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 6 });
    g.translate(0, 0, -depth / 2); const me = new THREE.Mesh(g, m); me.rotation.y = -Math.PI / 2; return me; // shape x → gun z
  };
  // barrel, front sight, ejector housing and rod
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.0088, 0.0092, 0.142, 32), blued); bar.rotation.x = Math.PI / 2; bar.position.z = 0.071; gun.add(bar);
  const crown = new THREE.Mesh(new THREE.TorusGeometry(0.0075, 0.0013, 8, 32), blued); crown.position.z = 0.0005; gun.add(crown);
  const bore = new THREE.Mesh(new THREE.CircleGeometry(0.0058, 24), new THREE.MeshBasicMaterial({ color: 0x000000 })); bore.position.z = -0.0008; bore.rotation.y = Math.PI; gun.add(bore);
  gun.add(prof([[0.004, 0.0085], [0.004, 0.0135], [0.009, 0.0135], [0.014, 0.0085]], 0.0025, blued, 0.0004));
  const ej = new THREE.Mesh(new THREE.CylinderGeometry(0.0052, 0.0052, 0.105, 20), blued); ej.rotation.x = Math.PI / 2; ej.position.set(0.004, -0.0135, 0.088); gun.add(ej);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.03, 10), steel); rod.rotation.x = Math.PI / 2; rod.position.set(0.004, -0.0135, 0.025); gun.add(rod);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.004, 12, 10), steel); knob.position.set(0.004, -0.0135, 0.012); gun.add(knob);
  // frame with an open cylinder window
  {
    const s = new THREE.Shape();
    const P = [[0.138, 0.0105], [0.2, 0.0105], [0.209, 0.0072], [0.216, -0.004], [0.226, -0.022], [0.236, -0.04], [0.251, -0.07], [0.26, -0.1], [0.264, -0.122], [0.256, -0.13], [0.24, -0.13], [0.232, -0.112], [0.224, -0.083], [0.214, -0.052], [0.204, -0.037], [0.14, -0.037], [0.137, -0.012]];
    s.moveTo(P[0][0], P[0][1]); for (const p of P.slice(1)) s.lineTo(p[0], p[1]);
    const h = new THREE.Path(); h.moveTo(0.1425, 0.0065); h.lineTo(0.1865, 0.0065); h.lineTo(0.1865, -0.0335); h.lineTo(0.1425, -0.0335); h.lineTo(0.1425, 0.0065); s.holes.push(h);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.022, bevelEnabled: true, bevelThickness: 0.0018, bevelSize: 0.0016, bevelSegments: 3, curveSegments: 4 });
    g.translate(0, 0, -0.011); const fr = new THREE.Mesh(g, blued); fr.rotation.y = -Math.PI / 2; gun.add(fr);
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.0235, 0.0235, 0.006, 40), steel); shield.rotation.x = Math.PI / 2; shield.position.set(0, -0.0125, 0.19); gun.add(shield);
  }
  // cylinder: six flutes, chamber mouths with brass case heads behind
  const cylinder = new THREE.Group(); cylinder.position.set(0, -0.0125, 0.1645); gun.add(cylinder);
  {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.0212, 0.0212, 0.042, 48), blued); c.rotation.x = Math.PI / 2; cylinder.add(c);
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3 + Math.PI / 6;
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.03, 12), new THREE.MeshStandardMaterial({ color: 0x10121a, roughness: 0.4, metalness: 0.9 }));
      f.rotation.x = Math.PI / 2; f.position.set(Math.cos(a) * 0.0205, Math.sin(a) * 0.0205, 0.002); cylinder.add(f);
      const ca = k * Math.PI / 3 + Math.PI / 2;
      const ch = new THREE.Mesh(new THREE.CircleGeometry(0.0058, 16), new THREE.MeshBasicMaterial({ color: 0x050505 })); ch.position.set(Math.cos(ca) * 0.0125, Math.sin(ca) * 0.0125, -0.0212); ch.rotation.y = Math.PI; cylinder.add(ch);
      const bul = new THREE.Mesh(new THREE.SphereGeometry(0.0052, 12, 8), mat(0x8a8a90, 0.6, 0.3)); bul.position.set(Math.cos(ca) * 0.0125, Math.sin(ca) * 0.0125, -0.0222); bul.scale.z = 0.5; cylinder.add(bul);
    }
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.05, 10), steel); pin.rotation.x = Math.PI / 2; cylinder.add(pin);
  }
  // hammer with a checkered spur, pivot at (z .214, y .0)
  const hammer = new THREE.Group(); hammer.position.set(0, 0.0, 0.214); gun.add(hammer);
  {
    const hp = prof([[-0.006, -0.008], [0.004, -0.009], [0.008, 0.004], [0.013, 0.018], [0.022, 0.03], [0.03, 0.031], [0.028, 0.024], [0.016, 0.014], [0.006, 0.012], [-0.006, 0.006]], 0.0075, steel, 0.0008);
    hammer.add(hp);
    for (let k = 0; k < 5; k++) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.0007, 0.0012), blued); r.position.set(0, 0.027 + k * 0.0006, 0.019 + k * 0.0022); r.rotation.x = -0.6; hammer.add(r); }
  }
  // trigger guard (brass), trigger
  {
    const curve = new THREE.CatmullRomCurve3([V3(0, -0.036, 0.158), V3(0, -0.05, 0.168), V3(0, -0.058, 0.188), V3(0, -0.054, 0.206), V3(0, -0.043, 0.214)]);
    gun.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.0024, 8, false), brassM));
    const tc = new THREE.CatmullRomCurve3([V3(0, -0.036, 0.192), V3(0, -0.044, 0.19), V3(0, -0.05, 0.194)]);
    gun.add(new THREE.Mesh(new THREE.TubeGeometry(tc, 8, 0.0018, 6, false), steel));
  }
  // walnut grip panels, screws
  gun.add(prof([[0.212, -0.04], [0.224, -0.068], [0.236, -0.098], [0.243, -0.122], [0.256, -0.124], [0.252, -0.096], [0.243, -0.064], [0.23, -0.036]], 0.03, wood, 0.0035));
  for (const [z, y] of [[0.145, -0.03], [0.16, 0.007], [0.203, -0.03]]) { const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.025, 10), steel); sc.rotation.z = Math.PI / 2; sc.position.set(0, y, z); gun.add(sc); }
  // gloved hand: three fingers round the grip, index on the trigger, thumb by the hammer
  {
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.044, 20, 16), glove); palm.scale.set(0.95, 1.25, 0.85); palm.position.set(0.012, -0.08, 0.252); gun.add(palm);
    for (let k = 0; k < 3; k++) {
      const y = -0.066 - k * 0.021, z0 = 0.236 - k * 0.006;
      gun.add(limb([[0.034, y, z0 + 0.02], [0.03, y - 0.002, z0 - 0.012], [0.008, y - 0.004, z0 - 0.026], [-0.016, y - 0.003, z0 - 0.016]], [0.0115, 0.011, 0.0105, 0.0095], glove, 12, 10));
    }
    gun.add(limb([[0.03, -0.05, 0.24], [0.026, -0.045, 0.214], [0.01, -0.044, 0.196], [0.002, -0.046, 0.192]], [0.0115, 0.0105, 0.0095, 0.009], glove, 12, 10));
    gun.add(limb([[-0.026, -0.06, 0.25], [-0.022, -0.03, 0.236], [-0.014, -0.008, 0.228]], [0.013, 0.012, 0.0105], glove, 10, 10));
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.056, 0.085, 24), glove); cuff.position.set(0.006, -0.112, 0.318); cuff.rotation.x = Math.PI / 2 - 0.55; gun.add(cuff);
    const slv = limb([[0.006, -0.135, 0.36], [0.0, -0.21, 0.5], [-0.01, -0.3, 0.68]], [0.06, 0.068, 0.075], sleeveM, 10, 18); gun.add(slv);
    const sc = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.009, 8, 28), cuffM); sc.position.set(0.006, -0.135, 0.36); sc.rotation.x = 0.55 + Math.PI / 2 - Math.PI / 2; sc.lookAt(sc.position.clone().add(V3(0, -0.075, 0.14))); gun.add(sc);
  }
  return { gun, hammer, cylinder };
}

// ---------------- the round (.45 jacketed, round-nose) ----------------
export function makeBullet() {
  const g = new THREE.Group();
  const pts = [new THREE.Vector2(0.0, 0.0)];
  for (let i = 0; i <= 20; i++) { const u = i / 20; const y = u * 0.021; const r = u < 0.5 ? 0.00575 : 0.00575 * Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.5) / 0.5, 2))); pts.push(new THREE.Vector2(Math.max(r, 0.0002), y)); }
  // engraved rifling: a texture of six twisted lands
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#b06a34'; x.fillRect(0, 0, 256, 64);
  const gr = x.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, 'rgba(255,220,170,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0.25)'); x.fillStyle = gr; x.fillRect(0, 0, 256, 64);
  x.strokeStyle = 'rgba(60,24,6,0.85)'; x.lineWidth = 5;
  for (let k = 0; k < 6; k++) { x.beginPath(); x.moveTo(k * 256 / 6, 64); x.lineTo(k * 256 / 6 + 20, 22); x.stroke(); }
  x.fillStyle = 'rgba(50,20,6,0.9)'; x.fillRect(0, 46, 256, 4);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping;
  const geo = new THREE.LatheGeometry(pts, 48);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.22, metalness: 1.0, bumpMap: tex, bumpScale: 0.4, envMapIntensity: 4.0 }));
  m.rotation.x = -Math.PI / 2; g.add(m);
  return g;
}
