// The Tunguska taiga at model scale (1 unit ≈ 180 m: forest radius 140 ≈ 25 km, airburst at y 45 ≈ 8 km), HQ pass:
// a forest floor of moss, lichen and needle litter (painted colour + normal map, macro tint in the vertex colours), ~4,000
// spruces and Scots pines with bark-mapped trunks and branchy crowns, grass tufts, sedge, fireweed, rocks, bushes and
// fallen branches concentrated where the cameras look, the epicentre bog with open water.
// blast(u): the shock front runs out from the centre and lays every tree down pointing away from it — uprooted ones show
// their root plate and pit, others snap and leave a splintered stub; crowns go to bare dead branches; inside CORE the
// trunks stay standing, stripped (the 'telegraph pole forest'); young spruces have come back among the logs by 1927.
// fireball(p, k), flash(k), the trading-post izba at CABIN (cabin.js) with shatter(u), calendar(year): as before.
import * as THREE from './three.module.js';
import { mulberry } from './toon.js';
import { makeCard, signText } from './flat.js';
import { skyRig } from './sky.js';
import { fbm, floorTex, barkTex, spruceCrown, pineCrown, deadCrown, rootPlate, stubGeo, trunkGeo, tuftGeo, fireweedGeo, rockGeo, bushGeo, twigGeo } from './hq.js';
import { buildCabin } from './cabin.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const STD = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, ...o });
export const R = 140, CORE = 9, AIR = V(0, 45, 0), CABIN = V(330, 0, 210);
function tex(w, h, fn, rep = [1, 1]) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8; return t; }
const glowT = (inner, outer) => tex(256, 256, (g, w) => { const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, inner); gr.addColorStop(0.25, outer.replace('A', '0.8')); gr.addColorStop(1, outer.replace('A', '0')); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); });
const sst = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
// the walk of T10 (Kulik + guide from (34, 18) towards the centre) and its side camera must stay clear of trunks and stubs
const WALK = V(34, 0, 18).normalize(), WNRM = V(-WALK.z, 0, WALK.x).negate();   // lateral axis, + towards the T10 camera

export function buildTaiga(scene) {
  const T = {}; const r = mulberry(19), r2 = mulberry(1927);
  const sky = skyRig(scene, { sunDir: V(0.7, 0.25, -1), shadow: 60, center: V(0, 0, 0) }); sky.setMode('morning'); T.sky = sky;
  // terrain: gentle swells, flat at the centre, levelled around the izba
  const H0 = (x, z) => { const d = Math.hypot(x, z); return (Math.sin(x * 0.02) * Math.cos(-z * 0.017) * 3 + Math.sin(x * 0.006 + 2) * 6) * Math.min(1, Math.max(0, (d - 20) / 80)); };
  const HC = H0(CABIN.x, CABIN.z); const H = (x, z) => { const dc = Math.hypot(x - CABIN.x, z - CABIN.z); return HC + (H0(x, z) - HC) * sst(12, 28, dc); }; T.H = H;
  const FT = floorTex(1024); FT.map.repeat.set(50, 50); FT.normalMap.repeat.set(50, 50);
  const gg = new THREE.PlaneGeometry(1600, 1600, 400, 400); const gp = gg.attributes.position; const gcol = [];
  for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), z = -gp.getY(i); gp.setZ(i, H(x, z)); const m = fbm(x * 0.012, z * 0.012, 0, 3), d = fbm(x * 0.05 + 9, z * 0.05, 0, 2); const bog = 1 - sst(14, 26, Math.hypot(x, z));
    const k = (0.85 + 0.25 * d) * (1 - 0.45 * bog); gcol.push((0.85 + 0.3 * m) * k, (0.92 + 0.12 * m) * k, (0.78 + 0.1 * d) * k); }
  gg.setAttribute('color', new THREE.Float32BufferAttribute(gcol, 3)); gg.computeVertexNormals();
  const ground = new THREE.Mesh(gg, STD(0xffffff, { map: FT.map, normalMap: FT.normalMap, vertexColors: true, roughness: 0.95 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground); T.ground = ground;
  // the epicentre bog: dark peat, open pools of still water
  const bog = new THREE.Mesh(new THREE.CircleGeometry(16, 64), STD(0x3e3c2a, { roughness: 0.6, transparent: true, opacity: 0.85 })); bog.rotation.x = -Math.PI / 2; bog.position.y = 0.04; scene.add(bog); bog.receiveShadow = true;
  const pools = []; for (let i = 0; i < 9; i++) { const pr = 1 + r() * 2.5, px = (r() - 0.5) * 22, pz = (r() - 0.5) * 22; const g = new THREE.CircleGeometry(pr, 40); const A = g.attributes.position; for (let k = 1; k < A.count; k++) { const a = Math.atan2(A.getY(k), A.getX(k)); const s = 0.8 + 0.35 * fbm(Math.cos(a) * 2 + i, Math.sin(a) * 2, 0, 2); A.setXY(k, A.getX(k) * s, A.getY(k) * s); }
    const p = new THREE.Mesh(g, STD(0x1e2a2c, { roughness: 0.04, metalness: 0.0 })); p.rotation.x = -Math.PI / 2; p.position.set(px, 0.07, pz); scene.add(p); pools.push([px, pz, pr]); }
  // ---------------- trees ----------------
  const N = 4200 + 160; const trees = [];
  for (let i = 0; i < N - 160; i++) { const rr = Math.sqrt(r()) * (R + 60) + 2, a = r() * Math.PI * 2; const x = Math.cos(a) * rr, z = Math.sin(a) * rr; const h = 5 + r() * 4;
    trees.push({ x, z, y: H(x, z), a, rr, h, cw: 0.9 + r() * 0.6, ph: r(), green: new THREE.Color().setHSL(0.27 + r() * 0.06, 0.45, 0.22 + r() * 0.1) }); }
  for (let i = 0; i < 160; i++) { const rr = 1.5 + Math.sqrt(r()) * (CORE - 1.5), a = r() * Math.PI * 2; const x = Math.cos(a) * rr, z = Math.sin(a) * rr; const h = 6 + r() * 4;
    trees.push({ x, z, y: H(x, z), a, rr, h, cw: 0.9 + r() * 0.6, ph: r(), green: new THREE.Color().setHSL(0.27 + r() * 0.06, 0.45, 0.22 + r() * 0.1) }); }
  // per-tree detail from its own stream (keeps the original layout): species, girth, snapped or uprooted
  trees.forEach((tr, ti) => { tr.pine = r2() < 0.45; tr.th = 0.95 + r2() * 0.65; tr.snap = r2() < 0.4 ? 0.5 + r2() * 1.1 : 0; tr.pr = 0.55 + r2() * 0.45; tr.bark = new THREE.Color().setHSL(0.07 + r2() * 0.03, 0.25, 0.75 + r2() * 0.2);
    if (tr.pine) tr.green.offsetHSL(0.02, 0.05, 0.06); tr.core = ti >= N - 160;
    // clear the T10 corridor: a lying trunk spans radial [rr, rr + h]; move it sideways out of the walk + camera strip
    const d = tr.x * WALK.x + tr.z * WALK.z, l = tr.x * WNRM.x + tr.z * WNRM.z;
    if (!tr.core && d < 43 && d + tr.h + 1.5 > 30 && l > -2.6 && l < 8.6) { const l2 = l < 3 ? -2.8 - r2() * 3 : 8.8 + r2() * 3; tr.x = WALK.x * d + WNRM.x * l2; tr.z = WALK.z * d + WNRM.z * l2; tr.a = Math.atan2(tr.z, tr.x); tr.rr = Math.hypot(tr.x, tr.z); tr.y = H(tr.x, tr.z); } });
  T.trees = trees;
  const BT = barkTex(); const barkM = STD(0xffffff, { map: BT.map, normalMap: BT.normalMap, roughness: 0.95 });
  const needleM = STD(0xffffff, { vertexColors: true, roughness: 0.85 }), deadM = STD(0xffffff, { vertexColors: true, roughness: 0.95 });
  const mk = (geo, mat, n, shadow = true) => { const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n)); m.castShadow = shadow; m.receiveShadow = true; scene.add(m); return m; };
  const trunks = mk(trunkGeo(), barkM, N), spr = trees.filter((t) => !t.pine), pin = trees.filter((t) => t.pine);
  const crS = mk(spruceCrown(11), needleM, spr.length), crP = mk(pineCrown(12), needleM, pin.length), dead = mk(deadCrown(13), deadM, N), bare = mk(deadCrown(14, false), deadM, 160);
  spr.forEach((t, i) => { t.ci = i; }); pin.forEach((t, i) => { t.ci = i; });
  const upr = trees.filter((t) => !t.snap && !t.core), snp = trees.filter((t) => t.snap && !t.core); upr.forEach((t, i) => { t.ui = i; }); snp.forEach((t, i) => { t.si = i; });
  const plates = mk(rootPlate(15), STD(0xffffff, { vertexColors: true, roughness: 1 }), upr.length), pits = mk(new THREE.SphereGeometry(1, 16, 8), STD(0x2e2a20, { roughness: 0.7 }), upr.length, false);
  const stubs = mk(stubGeo(), barkM, snp.length);
  // young spruces among the logs (1927)
  const YN = 1600; const young = mk(spruceCrown(16), needleM, YN); const yl = []; for (let i = 0; i < YN; i++) { const near = i < 700; let x, z;
    if (near) { x = -10 + r2() * 90; z = -15 + r2() * 70; } else { const rr = 12 + Math.sqrt(r2()) * (R + 40), a = r2() * Math.PI * 2; x = Math.cos(a) * rr; z = Math.sin(a) * rr; }
    const d = x * WALK.x + z * WALK.z, l = x * WNRM.x + z * WNRM.z; if (d > 29 && d < 44 && l > -2.5 && l < 8.5) { x += WNRM.x * 12; z += WNRM.z * 12; }
    if ([[62, 34], [57, 32], [52, 30], [9, 12], [7.5, 10.5], [6, 9]].some(([cx, cz]) => Math.hypot(x - cx, z - cz) < 7)) { x += 15; z -= 9; }
    yl.push({ x, z, s: 0.5 + r2() * 1.3, a: r2() * 6.28, c: new THREE.Color().setHSL(0.25 + r2() * 0.06, 0.5, 0.26 + r2() * 0.1) }); }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), qa = new THREE.Quaternion(), sc = V(1, 1, 1), col = new THREE.Color();
  const scorched = new THREE.Color(0x8a5a32), fallen = new THREE.Color(0x6e5242), weathered = new THREE.Color(0xd0c8be), charred = new THREE.Color(0xd8d0c8), HIDE = V(1e-4, 1e-4, 1e-4), Z = new THREE.Quaternion();
  const hide = (im, i) => { m4.compose(V(0, -50, 0), Z, HIDE); im.setMatrixAt(i, m4); };
  // blast(u): 0 = untouched, u·(R+70) = shock radius
  T.blast = (u, t = 0) => { const front = u * (R + 70);
    for (let i = 0; i < N; i++) { const tr = trees[i]; const hit = u > 0 && tr.rr < front; const k = hit ? Math.min(1, (front - tr.rr) / 10) : 0; const core = tr.core;
      const sway = u === 0 ? Math.sin(t * 1.3 + tr.ph * 6) * 0.03 : 0; const down = !core && k > 0.5;
      const axis = V(-Math.sin(tr.a), 0, Math.cos(tr.a)); const base = V(tr.x, tr.y, tr.z);
      // pivot: ground (standing), stub top (snapped), lifted root plate (uprooted)
      const lift = down ? (tr.snap ? tr.snap : 0.42 * tr.pr) : 0; const L = tr.h - (down && tr.snap ? tr.snap : 0);
      const fall = core ? 0 : k * (Math.PI / 2 + Math.asin(Math.min(0.9, lift / L)) - 0.03); q.setFromAxisAngle(axis, -fall); qa.setFromAxisAngle(V(1, 0, 0), sway); q.multiply(qa);
      const piv = base.clone().add(V(0, lift, 0));
      m4.compose(piv, q, sc.set(tr.th, L, tr.th)); trunks.setMatrixAt(i, m4);
      trunks.setColorAt(i, hit ? (core ? charred : col.copy(tr.bark).lerp(fallen, 0.55)) : tr.bark);
      // crowns: living (spruce or pine), else dead branches (fallen) or bare stubs (standing core)
      const cpos = V(0, L * 0.3, 0).applyQuaternion(q).add(piv); const live = tr.pine ? crP : crS;
      if (!hit || k < 0.5) { const cs = 1 - 0.5 * k; m4.compose(cpos, q, sc.set(tr.cw * cs, L * 0.8 * cs, tr.cw * cs)); live.setMatrixAt(tr.ci, m4); col.copy(tr.green); if (hit) col.lerp(scorched, Math.min(1, k * 1.5)); live.setColorAt(tr.ci, col); hide(dead, i); }
      else { hide(live, tr.ci); m4.compose(cpos, q, sc.set(tr.cw * 0.9, L * 0.7, tr.cw * 0.9)); dead.setMatrixAt(i, m4); dead.setColorAt(i, col.copy(tr.bark).lerp(fallen, 0.6)); }
      if (core) { const bi = i - (N - 160); if (hit) { hide(dead, i); m4.compose(V(0, tr.h * 0.35, 0).add(base), Z, sc.set(tr.cw * 0.5, tr.h * 0.6, tr.cw * 0.5)); bare.setMatrixAt(bi, m4); bare.setColorAt(bi, charred); } else hide(bare, bi); }
      if (tr.ui !== undefined) { if (down) { m4.compose(base.clone().add(V(0, 0.42 * tr.pr, 0)), q, sc.set(tr.pr, tr.pr, tr.pr)); plates.setMatrixAt(tr.ui, m4); const cp = V(Math.cos(tr.a), 0, Math.sin(tr.a)).multiplyScalar(-0.35 * tr.pr).add(base);
          m4.compose(cp.add(V(0, -0.02, 0)), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), -tr.a), sc.set(0.45 * tr.pr, 0.06, 0.85 * tr.pr)); pits.setMatrixAt(tr.ui, m4); } else { hide(plates, tr.ui); hide(pits, tr.ui); } }
      if (tr.si !== undefined) { if (down) { m4.compose(base, Z, sc.set(tr.th, tr.snap, tr.th)); stubs.setMatrixAt(tr.si, m4); stubs.setColorAt(tr.si, col.copy(tr.bark).lerp(fallen, 0.55)); } else hide(stubs, tr.si); } }
    yl.forEach((y, i) => { if (u >= 1) { const s = y.s; m4.compose(V(y.x, H(y.x, y.z) - 0.05, y.z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), y.a), sc.set(s * 0.55, s * 1.4, s * 0.55)); young.setMatrixAt(i, m4); young.setColorAt(i, y.c); } else hide(young, i); });
    for (const im of [trunks, crS, crP, dead, bare, plates, pits, stubs, young]) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
    ring.visible = u > 0 && u < 1; ring.scale.setScalar(Math.max(0.01, front)); ring.material.opacity = 0.8 * (1 - u);
    dust.forEach((s, j) => { const a = j / dust.length * Math.PI * 2; s.visible = u > 0.02 && u < 1; s.position.set(Math.cos(a) * front, 3 + (j % 3) * 2, Math.sin(a) * front); s.scale.setScalar(14 + front * 0.15); s.material.opacity = 0.55 * (1 - u); }); };
  // ---------------- ground cover (dense where the cameras look: the T02/T03/T10/T11 sector, the izba clearing, the bog) ----------------
  const cabinFoot = (x, z) => { const lx = x - CABIN.x, lz = z - CABIN.z; return (lx > -6 && lx < 4.2 && lz > -5.8 && lz < 3.1) || (Math.abs(lx + 1.6) < 1.1 && lz > 2.5 && lz < 12); };
  const onPool = (x, z) => pools.some(([px, pz, pr]) => Math.hypot(x - px, z - pz) < pr * 0.95);
  // keep-outs: nothing tall right in front of a low camera (T02 dolly, T11 push-in), nothing tall between the T10 pair and their camera
  const CAMS = [[62, 34, 7], [57, 32, 7], [52, 30, 7], [9, 12, 3.5], [7.5, 10.5, 3.5], [6, 9, 3.5]];
  const tall = (x, z) => { const d = x * WALK.x + z * WALK.z, l = x * WNRM.x + z * WNRM.z; return CAMS.some(([cx, cz, cr]) => Math.hypot(x - cx, z - cz) < cr) || (d > 28 && d < 44 && l > -1.6 && l < 8.6); };
  const low = (x, z) => CAMS.some(([cx, cz, cr]) => Math.hypot(x - cx, z - cz) < cr * (cx > 40 ? 0.55 : 0.3));
  const scatter = (zones, fn, keep = tall) => { let i = 0; for (const [n, gen] of zones) for (let k = 0; k < n; k++) { const [x, z] = gen(); if (cabinFoot(x, z) || onPool(x, z) || keep(x, z)) continue; fn(x, z, i++); } return i; };
  const SECT = () => [-10 + r2() * 92, -18 + r2() * 76], CLR = () => { const a = r2() * 6.28, d = 3 + Math.sqrt(r2()) * 30; return [CABIN.x + Math.cos(a) * d, CABIN.z + Math.sin(a) * d]; }, WIDE = () => { const a = r2() * 6.28, d = Math.sqrt(r2()) * 230; return [Math.cos(a) * d, Math.sin(a) * d]; };
  const BOG = () => { const a = r2() * 6.28, d = Math.sqrt(r2()) * 24; return [Math.cos(a) * d, Math.sin(a) * d]; };
  const inst = (geo, mat, list, shadow = true) => { const im = mk(geo, mat, list.length, shadow); list.forEach((o, i) => { m4.compose(o.p, o.q, o.s); im.setMatrixAt(i, m4); if (o.c) im.setColorAt(i, o.c); }); return im; };
  const yrot = () => new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), r2() * 6.28);
  const grassM = STD(0xffffff, { vertexColors: true, side: THREE.DoubleSide, roughness: 0.8 });
  const gl = []; scatter([[46000, SECT], [16000, CLR], [9000, WIDE]], (x, z) => { const s = 0.35 + r2() * 0.45; const dry = r2(); gl.push({ p: V(x, H(x, z) - 0.02, z), q: yrot(), s: V(s, s * (0.8 + r2() * 0.5), s), c: new THREE.Color().setHSL(0.2 + 0.07 * dry, 0.35 + 0.2 * r2(), 0.42 + 0.12 * r2()).multiplyScalar(1.25) }); }, low);
  T.grass = inst(tuftGeo(21), grassM, gl, false);
  const sl = []; scatter([[3500, BOG]], (x, z) => { const s = 0.5 + r2() * 0.5; sl.push({ p: V(x, 0.02, z), q: yrot(), s: V(s, s, s), c: new THREE.Color().setHSL(0.17 + 0.05 * r2(), 0.4, 0.45).multiplyScalar(1.5) }); });
  inst(tuftGeo(22, 14, true), grassM, sl, false);
  const fl = []; scatter([[2600, SECT], [500, CLR], [500, WIDE]], (x, z) => { const s = 0.4 + r2() * 0.4; fl.push({ p: V(x, H(x, z) - 0.02, z), q: yrot(), s: V(s, s, s) }); });
  inst(fireweedGeo(23), STD(0xffffff, { vertexColors: true, side: THREE.DoubleSide, roughness: 0.75 }), fl, false);
  const rk = []; scatter([[320, SECT], [50, CLR], [150, WIDE]], (x, z) => { const s = 0.12 + Math.pow(r2(), 3) * 0.9; rk.push({ p: V(x, H(x, z) - s * 0.25, z), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(r2() * 0.3, r2() * 6.28, r2() * 0.3)), s: V(s * (1 + r2() * 0.5), s, s), c: new THREE.Color().setScalar(0.42 + r2() * 0.2) }); });
  inst(rockGeo(24), STD(0xffffff, { vertexColors: true, roughness: 0.85 }), rk);
  const bl = []; scatter([[600, SECT], [110, CLR], [1900, WIDE]], (x, z) => { const s = 0.35 + r2() * 0.6; bl.push({ p: V(x, H(x, z) - 0.05, z), q: yrot(), s: V(s, s * (0.7 + r2() * 0.4), s), c: new THREE.Color().setHSL(0.2 + r2() * 0.1, 0.32, 0.2 + r2() * 0.08) }); });
  T.shrubs = inst(bushGeo(25), STD(0xffffff, { vertexColors: true, roughness: 0.85 }), bl);
  const tw = []; scatter([[3000, SECT], [250, CLR], [2200, WIDE]], (x, z) => { const s = 0.4 + r2() * 1.4; tw.push({ p: V(x, H(x, z), z), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r2() * 6.28, (r2() - 0.5) * 0.1)), s: V(s, s * 0.8, s * 0.8), c: new THREE.Color(0.8 + r2() * 0.3, 0.75 + r2() * 0.2, 0.7 + r2() * 0.2) }); });
  inst(twigGeo(), STD(0xffffff, { vertexColors: true, map: BT.map, roughness: 0.95 }), tw);
  // shock ring + dust wall
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 96), new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, depthWrite: false, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 2; scene.add(ring);
  const dustT = glowT('rgba(220,200,170,1)', 'rgba(200,170,130,A)'); const dust = []; for (let j = 0; j < 72; j++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustT, transparent: true, depthWrite: false })); scene.add(s); dust.push(s); }
  // fireball + trail + flash
  const fbT = glowT('rgba(255,255,255,1)', 'rgba(140,190,255,A)'); const fb = new THREE.Sprite(new THREE.SpriteMaterial({ map: fbT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); scene.add(fb); T.fb = fb;
  const trail = []; for (let j = 0; j < 40; j++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: fbT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, color: 0xbfd8ff })); scene.add(s); trail.push(s); }
  const smokeT = glowT('rgba(200,200,210,1)', 'rgba(150,150,165,A)'); const smoke = []; for (let j = 0; j < 60; j++) { const s2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeT, transparent: true, depthWrite: false, color: 0xd8dce8 })); scene.add(s2); smoke.push(s2); }
  const fbL = new THREE.PointLight(0xa8c8ff, 0, 0, 2); scene.add(fbL);
  const START = V(-520, 260, -380); T.START = START;
  T.fireball = (p, k = 1) => { fb.visible = k > 0 && p < 1; trail.forEach((s) => { s.visible = fb.visible; }); smoke.forEach((s2) => { s2.visible = fb.visible; }); fbL.intensity = 0; if (!fb.visible) return; const pos = START.clone().lerp(AIR, p); fb.position.copy(pos); fb.scale.setScalar(70 * k * (0.8 + 0.4 * p));
    trail.forEach((s, j) => { const pp = Math.max(0, p - j * 0.02); s.position.copy(START.clone().lerp(AIR, pp)); s.scale.setScalar(55 * (1 - j / 40) * k); s.material.opacity = 0.85 * (1 - j / 40); });
    smoke.forEach((s2, j) => { const pp = Math.max(0, p - 0.03 - j * 0.012); s2.visible = pp > 0; s2.position.copy(START.clone().lerp(AIR, pp)).add(V(Math.sin(j * 1.7) * 3, Math.sin(j * 2.3) * 3 + j * 0.15, 0)); s2.scale.setScalar(18 + j * 1.2); s2.material.opacity = 0.55 * (1 - j / 60); });
    fbL.position.copy(pos); fbL.intensity = 6e5 * k; };
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT('rgba(255,255,255,1)', 'rgba(255,230,190,A)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); flash.position.copy(AIR); scene.add(flash);
  const flashL = new THREE.PointLight(0xfff0e0, 0, 0, 0); flashL.position.copy(AIR); scene.add(flashL);
  T.flash = (k) => { flash.visible = k > 0.01; flash.scale.setScalar(60 + 900 * k); flash.material.opacity = Math.min(1, k * 1.4); flashL.intensity = 40 * k; };
  // ---------------- the trading post far out (CABIN): HQ izba + window glass that shatters + the 3D chair (hidden in the porch shots)
  const cab = new THREE.Group(); cab.position.copy(CABIN); cab.position.y = H(CABIN.x, CABIN.z); scene.add(cab); T.cab = cab;
  buildCabin(cab, (lx, lz) => H(CABIN.x + lx, CABIN.z + lz) - cab.position.y);
  const glassM = new THREE.MeshStandardMaterial({ color: 0xcfe6ff, roughness: 0.06, metalness: 0.0, emissive: 0x4a6a88, emissiveIntensity: 0.35, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.95), glassM); glass.position.set(1.4, 1.8, -0.1); cab.add(glass);
  const shards = []; for (let j = 0; j < 44; j++) { const g = new THREE.BufferGeometry(); const a = r() * 6.28; g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, Math.cos(a) * 0.4, Math.sin(a) * 0.4, 0, Math.cos(a + 0.9) * 0.3, Math.sin(a + 0.9) * 0.3, 0], 3)); g.computeVertexNormals();
    const s = new THREE.Mesh(g, glassM); s.userData = { o: V(1.4 + (r() - 0.5) * 1.1, 1.8 + (r() - 0.5) * 0.8, -0.08), v: V((r() - 0.5) * 3, 1 + r() * 2.5, 2 + r() * 3), w: V(r() * 9, r() * 9, r() * 9) }; s.visible = false; cab.add(s); shards.push(s); }
  T.shatter = (u) => { glass.visible = u <= 0; shards.forEach((s) => { s.visible = u > 0; if (!s.visible) return; const d = s.userData; const tt = u * 1.2; s.position.copy(d.o).addScaledVector(d.v, tt).add(V(0, -4.9 * tt * tt, 0)); s.position.y = Math.max(0.4, s.position.y); s.rotation.set(d.w.x * tt, d.w.y * tt, d.w.z * tt); }); };
  const chair = new THREE.Group(); const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.6), STD(0x8a5a34)); seat.position.y = 0.5; chair.add(seat); const back = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.08), STD(0x8a5a34)); back.position.set(0, 0.85, -0.28); chair.add(back);
  for (const [x, z] of [[-0.26, -0.26], [0.26, -0.26], [-0.26, 0.26], [0.26, 0.26]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), STD(0x6a4226)); l.position.set(x, 0.25, z); chair.add(l); }
  chair.position.set(0.6, 0.35, 1.0); chair.traverse((o) => { if (o.isMesh) o.castShadow = true; }); cab.add(chair); T.chair = chair;
  // ---- calendar flip card (T09)
  const cal = makeCard(24, 30, 768, () => {}, { transparent: true }); cal.renderOrder = 2; scene.add(cal); T.cal = cal;
  T.calendar = (year, flip = 0) => { cal.visible = year > 0; if (!cal.visible) return; cal.userData.redraw((g, w, h) => { g.fillStyle = '#f4ede0'; g.strokeStyle = '#2a1a16'; g.lineWidth = 20; g.beginPath(); g.roundRect(20, 60, w - 40, h - 80, 40); g.fill(); g.stroke();
      g.fillStyle = '#c8302a'; g.beginPath(); g.roundRect(20, 60, w - 40, 200, [40, 40, 0, 0]); g.fill(); g.stroke(); for (const x of [0.3, 0.7]) { g.fillStyle = '#2a1a16'; g.beginPath(); g.roundRect(w * x - 18, 20, 36, 90, 18); g.fill(); }
      signText(g, 'ปี', w / 2, 160, 110, '#ffffff', '#5a1a14', 'Kanit, Montserrat'); signText(g, String(year), w / 2, h * 0.6, 250, '#2a1a16', '#f4ede0');
      if (flip > 0) { g.fillStyle = `rgba(220,210,190,${0.9 * flip})`; g.fillRect(20, 260, w - 40, (h - 300) * flip); } }); };
  T.calendar(0);
  T.blast(0); T.fireball(0, 0); T.flash(0); T.shatter(0);
  return T;
}
