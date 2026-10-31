// The warship, built procedurally at real scale (metres). Bow points +x, waterline at y = 0, keel at y = -4.8.
// Lofted hull with tumblehome, high stern castle, beakhead + gilded lion, two tiers of gun ports with red lids and
// bronze muzzles, a carved and gilded transom, three masts with yards, sails that can be furled or set and billow,
// shrouds, stern lanterns and waving flags. ship.set({heel, sails, wind, t, wreck}) animates it.
import * as THREE from './three.module.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sstep = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
export const HULL = { L: 47, B: 5.9, keel: -4.8 };
const X0 = -23.5, X1 = 23.5;
const halfB = (x) => { const u = (x - X0) / (X1 - X0); if (u < 0.08) return HULL.B * (0.72 + 0.28 * sstep(0, 0.08, u)); const v = Math.max(0, (u - 0.55) / 0.45); return HULL.B * Math.pow(Math.max(0, 1 - Math.pow(v, 2.2)), 0.6); };
export const deckY = (x) => { const u = (x - X0) / (X1 - X0); return 6.2 + 5.8 * (1 - sstep(0.0, 0.3, u)) + 1.6 * sstep(0.82, 1.0, u); };
const keelY = (x) => { const u = (x - X0) / (X1 - X0); return HULL.keel + 1.2 * sstep(0.88, 1.0, u); };

function canvasTex(w, h, fn, rep = [1, 1]) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8; return t; }
const rnd = (s) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };

export function makeShip() {
  const root = new THREE.Group();     // positioned in the world
  const heel = new THREE.Group(); root.add(heel);   // rolls about the waterline
  const r = rnd(42);
  // ---------- materials ----------
  const plankT = canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#5b3a22'; x.fillRect(0, 0, w, h); for (let i = 0; i < 16; i++) { x.fillStyle = `rgba(${40 + r() * 30},${25 + r() * 15},${12},${0.35 + r() * 0.3})`; x.fillRect(0, i * 32, w, 30); x.fillStyle = 'rgba(20,10,5,0.7)'; x.fillRect(0, i * 32 + 30, w, 2);
      for (let k = 0; k < 3; k++) { const px = r() * w; x.fillRect(px, i * 32, 2, 30); } }
    for (let k = 0; k < 900; k++) { x.fillStyle = `rgba(${r() < 0.5 ? '255,220,180' : '20,10,0'},0.05)`; x.fillRect(r() * w, r() * h, 30 + r() * 60, 1.5); } }, [6, 3]);
  const hullM = new THREE.MeshStandardMaterial({ map: plankT, roughness: 0.75, metalness: 0.0, color: 0xffffff });
  const darkM = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.85 });
  const redM = new THREE.MeshStandardMaterial({ color: 0xa8231c, roughness: 0.6 });
  const blueM = new THREE.MeshStandardMaterial({ color: 0x1d3f7a, roughness: 0.6 });
  const goldM = new THREE.MeshStandardMaterial({ color: 0xffc04a, metalness: 0.95, roughness: 0.28, emissive: 0x2a1600 });
  const bronzeM = new THREE.MeshStandardMaterial({ color: 0xb87a3c, metalness: 0.9, roughness: 0.35 });
  const deckT = canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#b08355'; x.fillRect(0, 0, w, h); for (let i = 0; i < 16; i++) { x.fillStyle = `rgba(${120 + r() * 50},${80 + r() * 30},${45},0.6)`; x.fillRect(i * 32, 0, 30, h); x.fillStyle = 'rgba(60,35,15,0.8)'; x.fillRect(i * 32 + 30, 0, 2, h); for (let k = 0; k < 2; k++) x.fillRect(i * 32, r() * h, 30, 2); } }, [4, 10]);
  const deckM = new THREE.MeshStandardMaterial({ map: deckT, roughness: 0.8 });
  const sailT = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#efe4c8'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(150,120,80,0.35)'; x.lineWidth = 2; for (let i = 0; i < 8; i++) { x.beginPath(); x.moveTo(i * 32 + 16, 0); x.lineTo(i * 32 + 16, h); x.stroke(); } x.strokeStyle = 'rgba(120,90,60,0.6)'; x.lineWidth = 6; x.strokeRect(3, 3, w - 6, h - 6); });
  const sailM = new THREE.MeshStandardMaterial({ map: sailT, roughness: 0.9, side: THREE.DoubleSide });
  const ropeM = new THREE.LineBasicMaterial({ color: 0x2a2018 });
  const mats = { hullM, darkM, redM, goldM, bronzeM, deckM, sailM, blueM };

  // ---------- hull: loft cross-sections ----------
  const NX = 70, NS = 30; const pos = [], uv = [], idx = [];
  for (let i = 0; i <= NX; i++) {
    const x = X0 + (X1 - X0) * i / NX; const B = halfB(x), yk = keelY(x), yd = deckY(x) + 1.1; // bulwark 1.1 m above the deck
    for (let j = 0; j <= NS; j++) {
      const v = j / NS; const side = v < 0.5 ? -1 : 1; const yn = Math.abs(v - 0.5) * 2;          // 0 at keel centre, 1 at the rail
      const y = yk + (yd - yk) * (1 - Math.cos(yn * Math.PI / 2) * 0 - 0) * yn;
      const k = (1 - Math.pow(1 - Math.min(1, yn * 1.05), 2.4)); const tum = 1 - 0.2 * sstep(0.5, 1, (y - 0) / (yd - 0 + 0.001)) * (y > 0 ? 1 : 0);
      const w = B * Math.sqrt(Math.max(0, k)) * tum;
      pos.push(x, y, side * w); uv.push(x / 8, y / 4);
    }
  }
  for (let i = 0; i < NX; i++) for (let j = 0; j < NS; j++) { const a = i * (NS + 1) + j, b = a + NS + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); hg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); hg.setIndex(idx); hg.computeVertexNormals();
  const hull = new THREE.Mesh(hg, hullM); hull.material.side = THREE.DoubleSide; hull.castShadow = hull.receiveShadow = true; heel.add(hull);
  // painted bands: red wale above the upper gun deck and a gilded rail
  const band = (y0, h, m, inset = 0.02) => { const g = new THREE.Group(); for (const s of [-1, 1]) { const pts = []; for (let i = 3; i <= NX - 4; i++) { const x = X0 + (X1 - X0) * i / NX; pts.push(V(x, y0, s * (widthAt(x, y0) + inset))); }
    const curve = new THREE.CatmullRomCurve3(pts); const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, h, 6, false), m); tube.castShadow = true; g.add(tube); } heel.add(g); return g; };
  function widthAt(x, y) { const B = halfB(x), yk = keelY(x), yd = deckY(x) + 1.1; const yn = Math.min(1, Math.max(0, (y - yk) / (yd - yk))); const k = 1 - Math.pow(1 - Math.min(1, yn * 1.05), 2.4); const tum = 1 - 0.2 * sstep(0.5, 1, y / yd) * (y > 0 ? 1 : 0); return B * Math.sqrt(Math.max(0, k)) * tum; }
  band(5.6, 0.22, redM); band(5.95, 0.08, goldM); band(1.15, 0.16, darkM); band(3.35, 0.14, darkM);
  // decks (one plane per stepped level) — the main deck is the one people stand on
  const mainDeck = new THREE.Mesh(new THREE.PlaneGeometry(30, 1), deckM); // replaced by a shaped deck below
  {
    const sh = new THREE.Shape(); const N = 40; const xs = []; for (let i = 0; i <= N; i++) xs.push(-14 + 34 * i / N);
    xs.forEach((x, i) => { const w = widthAt(x, deckY(x)) - 0.15; i ? sh.lineTo(x, w) : sh.moveTo(x, w); }); for (let i = N; i >= 0; i--) { const x = xs[i]; sh.lineTo(x, -(widthAt(x, deckY(x)) - 0.15)); }
    const g = new THREE.ShapeGeometry(sh); g.rotateX(Math.PI / 2); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { p.setY(i, deckY(p.getX(i))); } g.computeVertexNormals();
    const d = new THREE.Mesh(g, deckM); d.material.side = THREE.DoubleSide; d.receiveShadow = true; heel.add(d);
  }
  // stern castle deck + the transom (flat, carved and gilded)
  const sternX = X0 + 0.05, sternW = halfB(X0) * 0.9;
  const transT = canvasTex(512, 640, (x, w, h) => {
    x.fillStyle = '#8f1d18'; x.fillRect(0, 0, w, h);
    const gold = (a) => { x.fillStyle = `rgba(255,${190 + a * 30},70,1)`; x.strokeStyle = '#7a4a10'; x.lineWidth = 3; };
    gold(0); for (let i = 0; i < 5; i++) { x.fillRect(0, 80 + i * 120, w, 14); x.strokeRect(0, 80 + i * 120, w, 14); }
    for (let i = 0; i < 6; i++) for (let k = 0; k < 4; k++) { const cx = 45 + i * 85, cy = 140 + k * 120; gold(0.5); x.beginPath(); x.ellipse(cx, cy - 20, 14, 16, 0, 0, 7); x.fill(); x.stroke(); x.beginPath(); x.moveTo(cx - 18, cy + 40); x.quadraticCurveTo(cx, cy - 10, cx + 18, cy + 40); x.closePath(); x.fill(); x.stroke(); }
    gold(1); x.beginPath(); x.ellipse(w / 2, 300, 80, 100, 0, 0, 7); x.fill(); x.stroke(); x.fillStyle = '#1d3f7a'; x.beginPath(); x.ellipse(w / 2, 300, 55, 75, 0, 0, 7); x.fill(); x.fillStyle = '#ffd040'; x.fillRect(w / 2 - 8, 230, 16, 140); x.fillRect(w / 2 - 50, 290, 100, 16);
    x.fillStyle = '#2a1408'; for (let i = 0; i < 3; i++) { x.fillRect(110 + i * 110, 420, 70, 80); } gold(0); for (let i = 0; i < 3; i++) x.strokeRect(110 + i * 110, 420, 70, 80);
  });
  { const sp = [], su = []; const ytop = deckY(X0) + 1.1, ybot = 0.6; const cap = [];
    for (let j = 0; j <= NS; j++) { const k = j * 3; cap.push([pos[k + 1], pos[k + 2]]); }
    const pts = cap.filter(([y]) => y >= ybot - 1.5); const cy = (ytop + ybot) / 2;
    for (let i = 0; i < pts.length - 1; i++) { for (const [y, z] of [[cy, 0], pts[i], pts[i + 1]]) { sp.push(X0 - 0.02, y, z); su.push(0.5 + z / (2 * HULL.B * 0.95), (y - ybot) / (ytop - ybot)); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(su, 2)); g.computeVertexNormals();
    const tm = new THREE.MeshStandardMaterial({ map: transT, roughness: 0.5, metalness: 0.25, side: THREE.FrontSide }); tm.map.wrapS = tm.map.wrapT = THREE.ClampToEdgeWrapping; tm.map.repeat.set(1, 1);
    const transom = new THREE.Mesh(g, tm); heel.add(transom); }
  // relief: gilded figures standing out from the stern and along the upper sides
  // carved statues: a lathe silhouette (plinth, robed body, shoulders, head) with little arms, all gilded
  const statueG = (() => { const pr = [[0, 0], [0.32, 0], [0.32, 0.12], [0.22, 0.18], [0.26, 0.5], [0.3, 0.85], [0.24, 1.05], [0.3, 1.12], [0.12, 1.2], [0.1, 1.26], [0.17, 1.36], [0.16, 1.5], [0.08, 1.58], [0, 1.6]].map(([x, y]) => new THREE.Vector2(x, y)); return new THREE.LatheGeometry(pr, 14); })();
  const armG = new THREE.CapsuleGeometry(0.06, 0.42, 4, 6);
  const fig = (x, y, z, s = 1, pose = 0) => { const g = new THREE.Group(); const b = new THREE.Mesh(statueG, goldM); g.add(b);
    for (const k of [-1, 1]) { const a = new THREE.Mesh(armG, goldM); a.position.set(k * 0.3, 1.0, 0.04); a.rotation.z = k * (0.4 + (pose % 3) * 0.5); g.add(a); }
    g.scale.setScalar(s); g.position.set(x, y - 0.6 * s, z); g.children.forEach((m) => (m.castShadow = true)); heel.add(g); return g; };
  for (let k = 0; k < 2; k++) for (let i = 0; i < 5; i++) { const y = 5.2 + k * 3.6; const zz = (-0.66 + i * 0.33) * widthAt(X0, y); const f = fig(X0 - 0.3, y, zz, 0.95, i + k * 2); f.rotation.y = -Math.PI / 2; }
  for (let i = 0; i < 3; i++) { const x = -18.0 + i * 2.6; for (const sd of [-1, 1]) { const f = fig(x, deckY(x) + 1.25, sd * (widthAt(x, deckY(x)) + 0.12), 1.0, i); f.rotation.y = sd * Math.PI / 2; } }
  // quarter galleries
  // quarter galleries: half-round bay towers with windows, gold trim and an onion dome
  const winM = new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.25, metalness: 0.3, emissive: 0x201004 });
  for (const s of [-1, 1]) { const gx = -20.6, gz = s * (widthAt(-20.6, 8) + 0.05); const qg = new THREE.Group(); qg.position.set(gx, 0, gz); heel.add(qg);
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.2, 5.6, 16, 1, false, s > 0 ? 0 : Math.PI, Math.PI), redM); tw.position.y = 8.6; qg.add(tw);
    for (const y of [6.0, 8.6, 11.2]) { const r2 = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.1, 6, 24, Math.PI), goldM); r2.rotation.x = Math.PI / 2; r2.rotation.z = s > 0 ? 0 : Math.PI; r2.position.y = y; qg.add(r2); }
    for (let k = 0; k < 3; k++) for (const y of [7.4, 9.8]) { const a2 = (k + 0.5) / 3 * Math.PI; const w2 = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.0), winM); w2.position.set(Math.cos(a2) * 1.52, y, s * Math.sin(a2) * 1.52); w2.lookAt(gx + Math.cos(a2) * 5, y, gz + s * Math.sin(a2) * 5); w2.position.set(Math.cos(a2) * 1.52, y, s * Math.sin(a2) * 1.52); w2.rotation.y = Math.atan2(Math.cos(a2), s * Math.sin(a2)); qg.add(w2); }
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.45, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), goldM); dome.position.y = 11.4; dome.scale.y = 1.2; qg.add(dome);
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.4, 8), goldM); fin.position.y = 13.4; qg.add(fin); }
  // stern lanterns
  const lantM = new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffb040, emissiveIntensity: 0.6, roughness: 0.3 });
  for (const z of [-2.3, 0, 2.3]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.3, 1.4, 8), lantM); l.position.set(X0 - 0.5, deckY(X0) + 2.2 + (z === 0 ? 0.6 : 0), z); heel.add(l); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 6), darkM); st.position.set(X0 - 0.3, deckY(X0) + 1.4 + (z === 0 ? 0.6 : 0), z); heel.add(st); const c = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.6, 8), goldM); c.position.set(X0 - 0.5, deckY(X0) + 3.2 + (z === 0 ? 0.6 : 0), z); heel.add(c); }
  // beakhead + lion figurehead
  const beak = new THREE.Mesh(new THREE.ConeGeometry(1.1, 8, 10), redM); beak.rotation.z = -Math.PI / 2 + 0.25; beak.position.set(X1 + 3.2, 3.8, 0); heel.add(beak);
  const lion = new THREE.Group(); const lb = new THREE.Mesh(new THREE.SphereGeometry(1.0, 16, 12), goldM); lb.scale.set(1.6, 0.9, 0.8); lion.add(lb); const lh = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 12), goldM); lh.position.set(1.3, 0.6, 0); lion.add(lh);
  const mane = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.3, 8, 16), goldM); mane.position.set(1.2, 0.6, 0); mane.rotation.y = Math.PI / 2; lion.add(mane); lion.position.set(X1 + 6.2, 5.4, 0); lion.rotation.z = 0.35; heel.add(lion);
  const bowsprit = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 16, 8), darkM); bowsprit.rotation.z = -Math.PI / 2 + 0.45; bowsprit.position.set(X1 + 5, 9.5, 0); heel.add(bowsprit);
  // ---------- gun ports: two tiers, open red lids, bronze muzzles ----------
  const portG = new THREE.BoxGeometry(0.85, 0.8, 0.3), lidG = new THREE.BoxGeometry(0.95, 0.9, 0.1), gunG = new THREE.CylinderGeometry(0.16, 0.2, 1.4, 10);
  const holeM = new THREE.MeshBasicMaterial({ color: 0x0c0604 });
  const lids = []; const ports = [];
  for (const [y, n, x0] of [[2.15, 13, -15.5], [4.3, 13, -15.5]]) for (let i = 0; i < n; i++) for (const s of [-1, 1]) {
    const x = x0 + i * 2.45; const w = widthAt(x, y);
    const h = new THREE.Mesh(portG, holeM); h.position.set(x, y, s * (w - 0.05)); heel.add(h);
    const gun = new THREE.Mesh(gunG, bronzeM); gun.rotation.x = Math.PI / 2; gun.position.set(x, y, s * (w + 0.35)); gun.castShadow = true; heel.add(gun);
    const lp = new THREE.Group(); lp.position.set(x, y + 0.45, s * (w + 0.05)); const lid = new THREE.Mesh(lidG, redM); lid.position.set(0, 0.45, 0); lp.add(lid); lp.rotation.x = s * -1.25; heel.add(lp); lids.push(lp); ports.push(V(x, y, s * w));
  }
  // ---------- masts, yards, sails ----------
  const masts = []; const sails = []; const rig = [];
  for (const [x, H, yards] of [[12, 34, [[13, 22], [24, 15], [31, 9]]], [0, 40, [[14, 26], [27, 18], [36, 11]]], [-13, 26, [[14, 15], [21, 10]]]]) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.6, H, 10), darkM); const base = deckY(x); m.position.set(x, base + H / 2, 0); m.castShadow = true; heel.add(m);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.9, 0.8, 12), darkM); top.position.set(x, base + yards[0][0] + 1.6, 0); heel.add(top); rig.push(top);
    masts.push({ x, H, base, mesh: m });
    for (const [yy, span] of yards) {
      const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, span, 8), darkM); yard.rotation.x = Math.PI / 2; yard.position.set(x + 0.4, base + yy, 0); heel.add(yard); rig.push(yard);
      const sh = (yards.find((q) => q[0] > yy) || [yy + 9])[0] - yy - 0.8; const geo = new THREE.PlaneGeometry(span * 0.9, sh, 12, 8); const s = new THREE.Mesh(geo, sailM); s.rotation.y = Math.PI / 2;
      s.position.set(x + 0.6, base + yy - sh / 2, 0); s.castShadow = true; heel.add(s);
      const furl = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, span * 0.88, 8), sailM); furl.rotation.x = Math.PI / 2; furl.position.set(x + 0.45, base + yy - 0.35, 0); heel.add(furl);
      sails.push({ mesh: s, furl, h: sh, top: base + yy, base0: geo.attributes.position.array.slice() });
    }
    // shrouds
    const pts = []; for (const s of [-1, 1]) for (let k = 0; k < 6; k++) { const xx = x - 1.5 + k * 0.6; pts.push(V(x, base + yards[0][0] + 1.4, 0), V(xx, deckY(xx) + 1.0, s * (widthAt(xx, deckY(xx)) + 0.6))); }
    const lg = new THREE.BufferGeometry().setFromPoints(pts); const shr = new THREE.LineSegments(lg, ropeM); heel.add(shr); rig.push(shr);
    const stay = new THREE.BufferGeometry().setFromPoints([V(x, base + H - 1, 0), V(x + (x > 5 ? 14 : 12), deckY(x + 10) + 2, 0)]); { const st = new THREE.LineSegments(stay, ropeM); heel.add(st); rig.push(st); }
  }
  // flags (blue with a yellow cross)
  const flagT = canvasTex(160, 100, (x, w, h) => { x.fillStyle = '#1f5fbf'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffcc1a'; x.fillRect(50, 0, 20, h); x.fillRect(0, 40, w, 20); });
  const flagM = new THREE.MeshStandardMaterial({ map: flagT, side: THREE.DoubleSide, roughness: 0.8 });
  const flags = [];
  for (const [x, y, s] of [[12, deckY(12) + 35, 3], [0, deckY(0) + 41, 4], [-13, deckY(-13) + 27, 3], [-23.2, 17.2, 5]]) {
    const g = new THREE.PlaneGeometry(1.6 * s, s, 10, 4); g.translate(0.8 * s, 0, 0); const f = new THREE.Mesh(g, flagM); f.position.set(x, y, 0); heel.add(f);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, s * 1.4, 6), darkM); pole.position.set(x, y - s * 0.3, 0); heel.add(pole); rig.push(pole); flags.push({ m: f, base: g.attributes.position.array.slice(), s });
  }
  // deck furniture: capstan, hatches, ship's boat
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 1.2, 12), darkM); cap.position.set(-6, deckY(-6) + 0.6, 0); heel.add(cap);
  for (const x of [4, 8]) { const h = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.4, 2.4), darkM); h.position.set(x, deckY(x) + 0.2, 0); heel.add(h); }
  const boat = new THREE.Mesh(new THREE.CapsuleGeometry(1.0, 4.5, 4, 10), new THREE.MeshStandardMaterial({ color: 0x7a5232, roughness: 0.8 })); boat.rotation.z = Math.PI / 2; boat.scale.set(1, 1, 0.55); boat.position.set(-1, deckY(-1) + 0.8, 0); heel.add(boat);
  heel.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  const state = { heel: 0, sails: 0, wind: 0.5, t: 0 };
  function set(s) {
    Object.assign(state, s); heel.rotation.x = state.heel; heel.rotation.z = state.pitch || 0;
    for (const sl of sails) {
      const set = state.sails; sl.furl.visible = set < 0.98; sl.mesh.visible = set > 0.02; sl.furl.scale.set(1, 1, 1); sl.furl.material = sailM;
      const p = sl.mesh.geometry.attributes.position; const b = sl.base0; const gust = state.wind;
      for (let i = 0; i < p.count; i++) { const x = b[i * 3], y = b[i * 3 + 1]; const v = (sl.h / 2 - y) / sl.h; const u = x / (sl.mesh.geometry.parameters.width / 2);
        const belly = (0.6 + 1.6 * gust) * Math.sin(Math.PI * Math.min(1, v / Math.max(0.05, set))) * (1 - u * u * 0.7) + 0.08 * Math.sin(state.t * 3 + x + y);
        const yy = sl.h / 2 - Math.min(v, set) * sl.h; p.setXYZ(i, x, yy, set > 0.02 ? belly : 0); }
      p.needsUpdate = true; sl.mesh.geometry.computeVertexNormals();
    }
    for (const f of flags) { const p = f.m.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = f.base[i * 3]; p.setZ(i, Math.sin(state.t * 6 - x * 1.4) * 0.12 * x * (0.5 + state.wind)); } p.needsUpdate = true; f.m.rotation.y = state.flagYaw || 0.4; }
    if (state.wreck != null) { const w = state.wreck; hullM.color.setRGB(1 - 0.55 * w, 1 - 0.5 * w, 1 - 0.45 * w); redM.color.setRGB(0.66 - 0.4 * w, 0.14, 0.11 + 0.05 * w); goldM.color.setRGB(1 - 0.6 * w, 0.75 - 0.5 * w, 0.29 - 0.15 * w);
      goldM.metalness = 0.95 - 0.8 * w; sails.forEach((sl) => { sl.mesh.visible = false; sl.furl.visible = w < 0.5; }); flags.forEach((f) => (f.m.visible = w < 0.5)); rig.forEach((o) => (o.visible = w < 0.5)); lantM.emissiveIntensity = 0.6 * (1 - w); masts.forEach((m) => { m.mesh.scale.y = 1 - 0.45 * w; m.mesh.position.y = m.base + m.H * (1 - 0.45 * w) / 2; }); }
  }
  set({});
  return { root, heel, hull, set, ports, lids, mats, masts, widthAt, deckY };
}
