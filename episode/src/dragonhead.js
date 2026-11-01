// Sculpted dragon head: lofted surfaces (a cross-section swept along the head with hand-tuned profiles + local bumps),
// not primitives. Upper skull/snout, a hinged lower jaw, lips, gums, palate, tongue, two rows of irregular teeth with a pair
// of fangs, eye sockets under a heavy brow, raised nostrils, tapered curving horns, a spike crest, and raised scales
// (normal map). Local frame: +x = snout direction, +y up, z sideways; hinge near the origin. Units ≈ metres.
import * as THREE from './three.module.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ovalCap = (u, s0) => (u <= s0 ? 1 : Math.sqrt(Math.max(0, 1 - ((u - s0) / (1 - s0)) ** 2)));
const G = (x, m, s) => Math.exp(-((x - m) * (x - m)) / (2 * s * s));
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
// piecewise-smooth profile through (u, value) keys
const prof = (K) => (u) => { let i = 0; while (i < K.length - 2 && u > K[i + 1][0]) i++; const [u0, a] = K[i], [u1, b] = K[i + 1]; return lerp(a, b, ss(u0, u1, u)); };

// ---------- scale textures (colour + normal) ----------
function scaleMaps(base = '#d0b25e') {
  // irregular plate scales (Voronoi): flat-topped tiles of varying size with deep grooves, like the reference's cast-gold skin
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d');
  const h = document.createElement('canvas'); h.width = h.height = N; const hg = h.getContext('2d');
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const CELLS = 18, cs = N / CELLS, pts = [];
  for (let j = 0; j < CELLS; j++) for (let i = 0; i < CELLS; i++) pts.push([(i + 0.15 + rnd() * 0.7) * cs, (j + 0.15 + rnd() * 0.7) * cs, rnd()]);
  const P = (i, j) => pts[((j + CELLS) % CELLS) * CELLS + ((i + CELLS) % CELLS)];
  const hImg = hg.createImageData(N, N), cImg = g.createImageData(N, N);
  const bc = new THREE.Color(base), hi = new THREE.Color('#f6e8b4'), lo = new THREE.Color('#6e5626');
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const ci = Math.floor(x / cs), cj = Math.floor(y / cs); let d1 = 1e9, d2 = 1e9, best = null, bx = 0, by = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const p = P(ci + di, cj + dj); const px = p[0] + Math.floor((ci + di) / CELLS) * N - (((ci + di) % CELLS + CELLS) % CELLS === (ci + di) ? 0 : 0);
      const ox = (ci + di) * cs + (p[0] - Math.floor(p[0] / cs) * cs), oy = (cj + dj) * cs + (p[1] - Math.floor(p[1] / cs) * cs);
      const d = Math.hypot(x - ox, y - oy); if (d < d1) { d2 = d1; d1 = d; best = p; bx = ox; by = oy; } else if (d < d2) d2 = d; }
    const edge = d2 - d1;                                    // 0 on the groove between two plates
    const plate = Math.min(1, edge / 5.5); const dome = 1 - Math.min(1, d1 / (cs * 0.9)) * 0.35;
    const hv = Math.pow(plate, 0.6) * dome;                  // flat-topped plate, slight dome, deep groove
    const k = (y * N + x) * 4; hImg.data[k] = hImg.data[k + 1] = hImg.data[k + 2] = hv * 255; hImg.data[k + 3] = 255;
    const col = bc.clone().lerp(hi, Math.max(0, (by - y + bx - x) / (cs * 1.6)) * 0.55 * plate + best[2] * 0.12).lerp(lo, (1 - plate) * 0.5);
    cImg.data[k] = col.r * 255; cImg.data[k + 1] = col.g * 255; cImg.data[k + 2] = col.b * 255; cImg.data[k + 3] = 255;
  }
  hg.putImageData(hImg, 0, 0); g.putImageData(cImg, 0, 0);
  // normal map from the height field (Sobel)
  const hd = hImg.data, nc = document.createElement('canvas'); nc.width = nc.height = N; const ng = nc.getContext('2d'); const out = ng.createImageData(N, N);
  const H = (x, y) => hd[(((y + N) % N) * N + ((x + N) % N)) * 4] / 255;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const dx = (H(x + 1, y) - H(x - 1, y)) * 2.2, dy = (H(x, y + 1) - H(x, y - 1)) * 2.2; const l = Math.hypot(dx, dy, 1);
    const k = (y * N + x) * 4; out.data[k] = (-dx / l * 0.5 + 0.5) * 255; out.data[k + 1] = (dy / l * 0.5 + 0.5) * 255; out.data[k + 2] = (1 / l * 0.5 + 0.5) * 255; out.data[k + 3] = 255; }
  ng.putImageData(out, 0, 0);
  const sample = (u, v) => { const x = ((u % 1) + 1) % 1 * N, y = ((v % 1) + 1) % 1 * N; const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    return (H(x0, y0) * (1 - fx) + H(x0 + 1, y0) * fx) * (1 - fy) + (H(x0, y0 + 1) * (1 - fx) + H(x0 + 1, y0 + 1) * fx) * fy; };
  const mk = (cv, srgb) => { const t = new THREE.CanvasTexture(cv); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
  return { map: mk(c, true), normal: mk(nc, false), height: sample };
}
const SC = scaleMaps();
export const DRAGON_GOLD = new THREE.MeshStandardMaterial({ color: 0xffffff, map: SC.map, normalMap: SC.normal, normalScale: new THREE.Vector2(0.6, 0.6), metalness: 0.12, roughness: 0.58 });
DRAGON_GOLD.userData.metal = true;
const HEAD_GOLD = DRAGON_GOLD.clone(); HEAD_GOLD.vertexColors = true; HEAD_GOLD.userData.metal = true; HEAD_GOLD.normalScale = new THREE.Vector2(0.5, 0.5);
const GOLD_SMOOTH = new THREE.MeshStandardMaterial({ color: 0xdcc070, metalness: 0.25, roughness: 0.38 }); GOLD_SMOOTH.userData.metal = true;
const MOUTH = new THREE.MeshStandardMaterial({ color: 0x3a0c0a, roughness: 0.6 });
const GUM = new THREE.MeshStandardMaterial({ color: 0x4c1410, roughness: 0.45 });
const TONGUE = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.3, metalness: 0 });
const TOOTH = new THREE.MeshStandardMaterial({ color: 0xe8e6e0, roughness: 0.22, metalness: 0.15 });
const EYE = new THREE.MeshStandardMaterial({ color: 0x1a0e08, roughness: 0.15, metalness: 0.2 });

// ---------- lofting ----------
// spine(u) → centre point; sec(u, a) → [dy, dz] offset of the surface point at angle a (a = 0: +z side, π/2: top)
function loft(nu, na, spine, sec, uvScale = [3.8, 2.1], bump = null, tint = null) {
  const pos = [], uv = [], idx = [], col = [];
  for (let i = 0; i <= nu; i++) { const u = i / nu; const c = spine(u);
    for (let j = 0; j <= na; j++) { const a = j / na * Math.PI * 2; let [dy, dz] = sec(u, a); const U = u * uvScale[0], Vv = j / na * uvScale[1];
      if (bump) { const r = Math.hypot(dy, dz) || 1; const b = bump(u, a, U, Vv); dy += dy / r * b; dz += dz / r * b; }
      pos.push(c.x, c.y + dy, c.z + dz); uv.push(U, Vv); if (tint) col.push(...tint(u, a)); } }
  for (let i = 0; i < nu; i++) for (let j = 0; j < na; j++) { const a = i * (na + 1) + j, b = a + na + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  if (tint) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals(); return g;
}
// tapered tube along a curve (horns, fangs)
function taperTube(curve, r0, r1, seg = 32, rad = 12) {
  const g = new THREE.TubeGeometry(curve, seg, 1, rad, false); const p = g.attributes.position, n = g.attributes.normal; const v = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) { const t = i / seg; const c = curve.getPointAt(t); const r = lerp(r0, r1, Math.pow(t, 0.9));
    for (let j = 0; j <= rad; j++) { const k = i * (rad + 1) + j; v.set(n.getX(k), n.getY(k), n.getZ(k)); p.setXYZ(k, c.x + v.x * r, c.y + v.y * r, c.z + v.z * r); } }
  p.needsUpdate = true; g.computeVertexNormals(); return g;
}

// ---------- solid scales: 3D cellular noise in the head's own space (no UV seams, no pinch at the nose pole) ----------
// Each vertex finds its nearest two jittered cell centres; the gap F2-F1 is the groove between plates. The plate is lifted
// along the surface normal (slightly domed, flat top) and the groove is darkened in the vertex colour, so every scale is a
// real raised bump that catches the key light on its upper edge, like the reference's cast-gold skin.
const hash3 = (i, j, k, n) => { const x = Math.sin(i * 127.1 + j * 311.7 + k * 74.7 + n * 19.19) * 43758.5453; return x - Math.floor(x); };
function cell3(x, y, z, s) {
  const X = x / s, Y = y / s, Z = z / s, ix = Math.floor(X), iy = Math.floor(Y), iz = Math.floor(Z); let f1 = 1e9, f2 = 1e9, id = 0;
  for (let k = -1; k <= 1; k++) for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const a = ix + i, b = iy + j, c = iz + k;
    const dx = a + 0.1 + 0.8 * hash3(a, b, c, 1) - X, dy = b + 0.1 + 0.8 * hash3(a, b, c, 2) - Y, dz = c + 0.1 + 0.8 * hash3(a, b, c, 3) - Z; const d = dx * dx + dy * dy + dz * dz;
    if (d < f1) { f2 = f1; f1 = d; id = hash3(a, b, c, 4); } else if (d < f2) f2 = d; }
  f1 = Math.sqrt(f1); f2 = Math.sqrt(f2); return { f1, edge: f2 - f1, id };
}
const SKIN = { hi: new THREE.Color('#e8cc78'), mid: new THREE.Color('#bc9640'), lo: new THREE.Color('#7e5e28') };   // soft: grooves only a few shades darker
// o: { cell, amp, holes: [{c: Vector3, n: Vector3, r, depth}], mask(p, n) → 0..1 scale strength, tint(p) → extra darkening }
function scaleSkin(geo, o) {
  geo.computeVertexNormals(); const P = geo.attributes.position, N = geo.attributes.normal, n = P.count; const col = new Float32Array(n * 3); const N0 = N.array.slice();
  const p = new THREE.Vector3(), nm = new THREE.Vector3(), q = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    p.fromBufferAttribute(P, i); nm.fromBufferAttribute(N, i);
    const m = o.mask ? o.mask(p, nm) : 1; const v = cell3(p.x, p.y, p.z, o.cell);
    const plate = ss(0.0, 0.32, v.edge); const dome = 1 - 0.55 * v.f1 * v.f1; const h = Math.sqrt(plate) * dome;   // pillowy pebbles: rounded edges, soft dome
    let disp = o.amp * m * (h - 0.55), dark = 0;
    for (const H of o.holes || []) {   // nostrils: deep round holes with a lip, carved straight into the nose along its axis
      q.copy(p).sub(H.c); const along = q.dot(H.n); const rad = Math.sqrt(Math.max(0, q.lengthSq() - along * along)) / H.r;
      if (Math.abs(along) > H.r * 1.6) continue;
      const bowl = rad < 1 ? Math.pow(1 - Math.pow(rad, 6), 0.5) : 0; const lip = Math.exp(-((rad - 1.12) ** 2) * 30);
      disp += -H.depth * bowl + H.r * 0.12 * lip; dark = Math.max(dark, Math.min(1, (1.05 - rad) * 3.5)); }
    q.copy(nm).multiplyScalar(disp); P.setXYZ(i, p.x + q.x, p.y + q.y, p.z + q.z);
    c.copy(SKIN.mid).lerp(SKIN.hi, (0.3 + 0.25 * v.id) * plate * m).lerp(SKIN.lo, Math.pow(1 - plate, 2) * 0.32 * m);
    const t = o.tint ? o.tint(p) : 0; const k = 1 - Math.min(1, t); c.multiplyScalar(k);
    c.lerp(new THREE.Color('#1a0c08'), dark);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  P.needsUpdate = true; geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  // soften the relief in the shading: blend the bumpy normals back toward the smooth form, so light rolls over the head
  // in one soft gradient and the scales read as gentle pebbling (the reference's soft cast-gold look)
  const NA = geo.attributes.normal.array, sb = o.soft ?? 0.5; for (let i = 0; i < NA.length; i += 3) { const x = lerp(NA[i], N0[i], sb), y = lerp(NA[i + 1], N0[i + 1], sb), z = lerp(NA[i + 2], N0[i + 2], sb), l = Math.hypot(x, y, z) || 1; NA[i] = x / l; NA[i + 1] = y / l; NA[i + 2] = z / l; }
  return geo;
}
// thin ink silhouette like the reference: an inverted hull pushed out along the normals, back faces only
const INK = new THREE.MeshBasicMaterial({ color: 0x1a1008, side: THREE.BackSide });
function hull(geo, w) { const g = geo.clone(); const P = g.attributes.position, N = g.attributes.normal;
  for (let i = 0; i < P.count; i++) P.setXYZ(i, P.getX(i) + N.getX(i) * w, P.getY(i) + N.getY(i) * w, P.getZ(i) + N.getZ(i) * w); g.deleteAttribute('color'); return new THREE.Mesh(g, INK); }
export const SKIN_MAT = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, metalness: 0.15, roughness: 0.46 }); SKIN_MAT.userData.metal = true;

// gum ridge: ONE continuous U-shaped tube that runs up one side of the mouth, round the front and back down the other
// side (no open ends at the snout tip or chin). X/Y/HW give the rim's x, height and half width at a length parameter u;
// the front is an arc from cap0 to uEnd following the same elliptical cap as the jaw/snout surface.
function uGum(X, Y, HW, u0, cap0, uEnd, r) {
  const pts = [], side = [];
  for (let k = 0; k <= 24; k++) { const u = lerp(u0, cap0, k / 24); side.push([u, 1]); }
  for (let k = 1; k < 24; k++) { const f = k / 24 * Math.PI; const u = cap0 + (uEnd - cap0) * Math.sin(f); side.push([u, Math.cos(f), true]); }
  for (let k = 24; k >= 0; k--) { const u = lerp(u0, cap0, k / 24); side.push([u, -1]); }
  for (const [u, c] of side) pts.push(V(X(u), Y(u), HW(Math.min(u, cap0)) * c));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const g = new THREE.TubeGeometry(curve, 240, r, 10, false); const P = g.attributes.position, cen = new THREE.Vector3();
  // flatten the tube a little vertically so it reads as a fleshy ridge, not a hose
  for (let i = 0; i <= 240; i++) { curve.getPointAt(i / 240, cen); for (let j = 0; j <= 10; j++) { const k = i * 11 + j; P.setY(k, cen.y + (P.getY(k) - cen.y) * 0.75); } }
  g.computeVertexNormals(); return g;
}

// ---------- the head ----------
// raised scales: the same height field as the colour/normal maps, so every bump lines up with its painted scale
const scaleBump = (amp) => (u, a, U, Vv) => { const h = SC.height(U, Vv); return amp * (h - 0.6); };
function buildHead() {
  const root = new THREE.Group();
  // upper skull + snout: x from -0.2 (back of skull) to 0.46 (nose tip)
  const L0 = -0.2, L1 = 0.46;
  const W = prof([[0, 0.1], [0.1, 0.145], [0.24, 0.14], [0.42, 0.098], [0.74, 0.078], [0.9, 0.094], [1, 0.09]]);       // half width
  const T = prof([[0, 0.09], [0.12, 0.135], [0.25, 0.13], [0.4, 0.092], [0.72, 0.064], [0.9, 0.082], [1, 0.07]]);       // height above the jaw line
  const B = prof([[0, 0.08], [0.2, 0.06], [0.45, 0.028], [1, 0.022]]);                                                  // depth below (upper jaw)
  // the blunt nose cap is swept by angle (rings evenly spaced in arc length), so the front face where the nostrils sit is
  // as finely meshed as the rest of the head instead of a few stretched rings around the pole
  const capT = (u) => Math.max(0, (u - 0.88) / 0.12) * Math.PI / 2, cu = (u) => (u <= 0.88 ? u : 0.88 + 0.12 * Math.sin(capT(u)));
  const up = loft(460, 420, (u0) => { const u = cu(u0); return V(lerp(L0, L1, u), 0.02 * Math.sin(u * Math.PI) - 0.02 * u, 0); }, (u0, a) => {
    const u = cu(u0); const top = Math.sin(a) > 0; const cap = u0 > 0.88 ? Math.cos(capT(u0)) : u < 0.04 ? 0.55 + 0.45 * Math.sqrt(u / 0.04) : 1;
    let w = W(u) * cap, h = (top ? T(u) : B(u)) * cap;
    const ca = Math.cos(a), sa = Math.sin(a);
    // squarer cross-section on the snout (flat top, vertical sides) — superellipse
    const e = lerp(2, 2.5, ss(0.35, 0.7, u)); const sx = Math.sign(ca) * Math.pow(Math.abs(ca), 2 / e), sy = Math.sign(sa) * Math.pow(Math.abs(sa), 2 / e);
    let dz = w * sx, dy = h * sy;
    if (top) {
      dy += 0.045 * G(u, 0.255, 0.055) * G(Math.abs(ca), 0.62, 0.22);          // heavy brow ridges over the eyes
      dy -= 0.02 * G(u, 0.305, 0.045) * G(Math.abs(ca), 0.15, 0.2);           // groove between the brows
      dy += 0.014 * G(u, 0.9, 0.05) * G(Math.abs(ca), 0.45, 0.25);          // soft swell over the nostrils
      dy += 0.01 * Math.sin(u * 40) * G(Math.abs(ca), 0, 0.3) * ss(0.45, 0.8, u);   // knobbly ridge along the snout
      dz += Math.sign(ca) * 0.018 * G(u, 0.1, 0.05) * G(sa, 0.3, 0.3);       // cheek bulge
    }
    dz -= Math.sign(ca) * 0.022 * G(u, 0.22, 0.036) * G(sa, 0.42, 0.14);      // eye socket
    return [dy, dz];
  });
  // nostrils: two round holes on the blunt front of the snout, angled slightly out and up (found on the built surface)
  const tip = V(L1, 0.02 * Math.sin(Math.PI) - 0.02, 0); const holes = [-1, 1].map((sd) => { const dir = V(1, 0.32, sd * 0.52).normalize();
    const P = up.attributes.position; let best = -1e9, bp = V(); const o = V(L1 - 0.07, -0.005, 0), q = V();
    for (let i = 0; i < P.count; i++) { q.fromBufferAttribute(P, i).sub(o); const d = q.clone().normalize().dot(dir); if (d > best) { best = d; bp.fromBufferAttribute(P, i); } }
    return { c: bp, n: bp.clone().sub(o).normalize(), r: 0.028, depth: 0.026 }; });
  up.computeVertexNormals(); const upI = hull(up, 0.0036); upI.userData.ink = true;
  scaleSkin(up, { cell: 0.015, amp: 0.0026, soft: 0.2, holes,
    mask: (p) => 1 - 0.55 * ss(-0.01, -0.035, p.y) * ss(0.0, 0.3, p.x),                                       // finer, flatter scales on the lip line
    tint: (p) => 0.4 * G(p.x, lerp(L0, -0.2 + 0.56, 0.26), 0.035) * G(p.y, 0.065, 0.03) });                             // shadowed eye sockets
  for (const H of holes) { const d = new THREE.Mesh(new THREE.CircleGeometry(H.r * 0.98, 32), new THREE.MeshBasicMaterial({ color: 0x24120c }));
    d.position.copy(H.c).addScaledVector(H.n, -H.depth * 0.55); d.lookAt(d.position.clone().add(H.n)); d.userData.ink = true; root.add(d); }
  const upM = new THREE.Mesh(up, SKIN_MAT); upM.castShadow = true; root.add(upM); root.add(upI);
  // nostrils (dark ovals sunk into the mounds) and eyes
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), EYE); eye.position.set(lerp(L0, 0.36, 0.26), 0.07, s * 0.112); eye.scale.set(1.3, 0.75, 0.6); root.add(eye);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff6dd })); glint.position.copy(eye.position).add(V(0.008, 0.008, s * 0.012)); root.add(glint);
    // horns sweeping back and up from behind the brow
    const hc = new THREE.CatmullRomCurve3([V(-0.06, 0.1, s * 0.08), V(-0.22, 0.12, s * 0.1), V(-0.4, 0.08, s * 0.09), V(-0.56, 0.01, s * 0.06)]);   // thick horns swept back along the neck
    const horn = new THREE.Mesh(taperTube(hc, 0.045, 0.006, 40, 16), GOLD_SMOOTH); horn.castShadow = true; root.add(horn);
    // cheek frills
    for (let k = 0; k < 3; k++) { const fc = new THREE.CatmullRomCurve3([V(-0.04 - k * 0.04, 0.0 - k * 0.01, s * 0.13), V(-0.12 - k * 0.04, 0.02 - k * 0.03, s * 0.17), V(-0.2 - k * 0.03, 0.05 - k * 0.05, s * 0.18)]);
      const f = new THREE.Mesh(taperTube(fc, 0.016, 0.002, 16, 8), GOLD_SMOOTH); root.add(f); }
  }
  // spike crest along the top of the skull, rising toward the back
  for (let k = 0; k < 3; k++) { const x = -0.04 - k * 0.075, hgt = 0.07 - k * 0.012; const cc = new THREE.CatmullRomCurve3([V(x, 0.11, 0), V(x - 0.05, 0.11 + hgt * 0.55, 0), V(x - 0.11, 0.11 + hgt * 0.8, 0)]);
    const sp = new THREE.Mesh(taperTube(cc, 0.022, 0.002, 14, 10), GOLD_SMOOTH); sp.castShadow = true; root.add(sp); }
  // palate + upper gum line
  const pal = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 16), MOUTH); pal.scale.set(0.28, 0.025, 0.07); pal.position.set(0.18, -0.02, 0); root.add(pal);
  // gums follow the lip line and close around the rounded snout/chin instead of ending in open flaps
  const gumU = uGum((uh) => lerp(L0, L1, uh), () => -0.024, (uh) => W(uh) * 0.9 + 0.004, 0.27, 0.88, 0.985, 0.0075);
  root.add(new THREE.Mesh(gumU, GUM));

  // ---------- lower jaw (hinged) ----------
  const jaw = new THREE.Group(); jaw.name = 'jaw'; jaw.position.set(-0.05, -0.02, 0); root.add(jaw);
  const JW = prof([[0, 0.11], [0.3, 0.075], [0.8, 0.058], [1, 0.05]]), JB = prof([[0, 0.06], [0.35, 0.045], [0.85, 0.036], [1, 0.03]]);
  const jT = (u) => Math.max(0, (u - 0.82) / 0.18) * Math.PI / 2, ju = (u) => (u <= 0.82 ? u : 0.82 + 0.18 * Math.sin(jT(u)));   /* U-shaped chin */
  const lo = loft(300, 260, (u0) => { const u = ju(u0); return V(lerp(0, 0.48, u), -0.01 * u, 0); }, (u0, a) => {
    const u = ju(u0); const cap = u0 > 0.82 ? Math.cos(jT(u0)) : 1; const sa = Math.sin(a), ca = Math.cos(a);
    const e = 2.6; const sx = Math.sign(ca) * Math.pow(Math.abs(ca), 2 / e), sy = Math.sign(sa) * Math.pow(Math.abs(sa), 2 / e);
    let dy = (sa > 0 ? 0.012 : JB(u)) * sy * cap, dz = JW(u) * sx * cap;
    if (sa < 0) dy -= 0.012 * G(u, 0.88, 0.05);   // chin knob
    return [dy, dz]; });
  lo.computeVertexNormals(); const loI = hull(lo, 0.0034); loI.userData.ink = true;
  scaleSkin(lo, { cell: 0.015, amp: 0.0024, soft: 0.2, mask: (p) => p.y > 0.004 ? 0.25 : 1 });
  const loM = new THREE.Mesh(lo, SKIN_MAT); loM.castShadow = true; jaw.add(loM); jaw.add(loI);
  const floor = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), MOUTH); floor.scale.set(0.2, 0.008, 0.045); floor.position.set(0.17, 0.004, 0); jaw.add(floor);
  // tongue: a broad, flat, sculpted tongue lying in the jaw (not a capsule): wide domed top with a centre groove, thin
  // rounded edges, a spoon-shaped tip that stops short of the chin, and a root that dips into the throat; wet sheen
  const tT = (u) => Math.max(0, (u - 0.95) / 0.05) * Math.PI / 2, tu = (u) => (u <= 0.95 ? u : 0.95 + 0.05 * Math.sin(tT(u)));
  const TX0 = -0.01, TX1 = 0.474;   // the tongue runs all the way to the chin, its round tip filling the front of the jaw
  const tg = loft(160, 64, (u0) => { const u = tu(u0); const x = lerp(TX0, TX1, u), uj = x / 0.48; return V(x, -0.01 * uj + 0.012 * ovalCap(uj, 0.82) + 0.004 - 0.012 * ss(0.12, 0, u), 0); }   /* lies on the jaw floor, following it down over the chin */, (u0, a) => {
    const u = tu(u0); const cap = u0 > 0.95 ? Math.sqrt(Math.max(0, Math.cos(tT(u0)))) : 1;   /* round (not pointed) tip in plan */ const ca = Math.cos(a), sa = Math.sin(a);
    const ujt = lerp(TX0, TX1, u) / 0.48; const w = JW(ujt) * 0.8 * Math.max(0.25, ovalCap(ujt, 0.82)) * (0.82 + 0.18 * ss(0, 0.25, u)) * cap;     // fills most of the jaw, a touch narrower at the root
    const e = 2.8; const sx = Math.sign(ca) * Math.pow(Math.abs(ca), 2 / e), sy = Math.sign(sa) * Math.pow(Math.abs(sa), 2 / e);
    let dy = (sa > 0 ? 0.011 : 0.006) * sy * (0.35 + 0.65 * cap);
    if (sa > 0) dy -= 0.0045 * G(ca, 0, 0.16) * ss(0.05, 0.3, u) * (1 - ss(0.85, 1, u));   // centre groove
    return [dy, w * sx]; });
  { const P = tg.attributes.position, n = P.count, col = new Float32Array(n * 3); const deep = new THREE.Color('#2e0a08'), mid = new THREE.Color('#581812'), hi = new THREE.Color('#82382c'), c = new THREE.Color();
    tg.computeBoundingBox(); const bb = tg.boundingBox;
    for (let i = 0; i < n; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i); const t = (y - bb.min.y) / (bb.max.y - bb.min.y); const side = Math.min(1, Math.abs(z) / 0.05);
      const pap = hash3(Math.floor(x * 900), Math.floor(z * 900), 0, 7);              // fine papillae speckle
      c.copy(deep).lerp(mid, ss(0.2, 0.75, t)).lerp(hi, 0.35 * ss(0.7, 1, t) * (1 - side) * (0.6 + 0.4 * pap)); c.multiplyScalar(1 - 0.45 * G(z, 0, 0.006) * ss(0.6, 1, t)); // darker groove
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    tg.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
  const tongue = new THREE.Mesh(tg, TONGUE); jaw.add(tongue);
  const gumL = uGum((uj) => uj * 0.48, (uj) => -0.01 * uj + 0.012 * ovalCap(uj, 0.82), (uj) => JW(uj) * 0.88 + 0.003, 0.08, 0.82, 0.975, 0.0065);
  jaw.add(new THREE.Mesh(gumL, GUM));

  // ---------- teeth: irregular, two rows, curved fangs ----------
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const tooth = (len, r, curve) => { const c = new THREE.CatmullRomCurve3([V(0, 0, 0), V(curve * 0.3, -len * 0.5, 0), V(curve, -len, 0)]); return taperTube(c, r, 0.0015, 10, 8); };
  for (const s of [-1, 1]) {
    for (let k = 0; k < 7; k++) { const u = 0.36 + k * 0.092; const fang = k === 6 || k === 3; /* big front fangs hang in front of the ball */ const len = fang ? 0.075 : 0.034 + rnd() * 0.018;
      const t = new THREE.Mesh(tooth(len, fang ? 0.014 : 0.009, fang ? -0.014 : -0.005), TOOTH); t.position.set(lerp(L0, L1, u), -0.028, s * W(u) * 0.86); t.rotation.x = s * 0.12; root.add(t); }
    for (let k = 0; k < 8; k++) { const u = 0.12 + k * 0.11; const fang = k === 6; const len = fang ? 0.06 : 0.024 + rnd() * 0.018;
      const t = new THREE.Mesh(tooth(len, fang ? 0.012 : 0.0075, fang ? 0.01 : 0.004), TOOTH); t.rotation.z = Math.PI; t.rotation.x = -s * 0.1; t.position.set(lerp(0, 0.48, u), 0.016, s * JW(u) * 0.84); jaw.add(t); }
  }
  root.traverse((o) => { if (o.isMesh) o.castShadow = !o.userData.ink; });
  return root;
}

// every dragon shares one sculpted head (geometry + materials); each copy gets its own transforms and hinged jaw
let HEAD = null;
export function sculptedHead() { if (!HEAD) HEAD = buildHead(); const h = HEAD.clone(true); h.userData.jaw = h.getObjectByName('jaw'); return h; }
