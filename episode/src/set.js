// The railway: ballast, ties, rails, telegraph line, the gorge, and the timber trestle with its missing span.
import * as THREE from './three.module.js';
import { mulberry, mix } from './models.js';
import { TRACK_X, GAP0, GAP1, GORGE0, GORGE1 } from './timeline.js';

export const RAIL_Y = 0.42;     // rail top above the plain
const FLOOR = -38;

// instanced beams from endpoint pairs
function beams(scene, list, material, cast = true) {
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, list.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  list.forEach(([a, b, w, d], i) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b); const L = A.distanceTo(B);
    q.setFromUnitVectors(up, B.clone().sub(A).normalize()); s.set(w, L, d ?? w);
    m.compose(A.clone().add(B).multiplyScalar(0.5), q, s); im.setMatrixAt(i, m);
  });
  im.castShadow = cast; im.receiveShadow = true; scene.add(im); return im;
}

export function buildRail(scene) {
  const r = mulberry(404);
  const wood = new THREE.MeshStandardMaterial({ color: 0x2e241c, roughness: 0.95 });
  const tieM = new THREE.MeshStandardMaterial({ color: 0x241c16, roughness: 0.95 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x6a6460, roughness: 0.35, metalness: 0.85, envMapIntensity: 2.0 });
  const ballastM = new THREE.MeshStandardMaterial({ color: 0x26221e, roughness: 1.0 });
  const rockM = new THREE.MeshStandardMaterial({ color: 0x2a221c, roughness: 0.95, flatShading: true });

  // ballast prism on solid ground
  const prism = (z0, z1) => {
    const sh = new THREE.Shape(); sh.moveTo(-2.4, 0); sh.lineTo(-1.5, 0.28); sh.lineTo(1.5, 0.28); sh.lineTo(2.4, 0); sh.lineTo(-2.4, 0);
    const g = new THREE.ExtrudeGeometry(sh, { depth: z1 - z0, bevelEnabled: false }); const m = new THREE.Mesh(g, ballastM);
    m.position.set(TRACK_X, 0, z0); m.receiveShadow = true; scene.add(m);
  };
  prism(GORGE0 + 0.5, 600); prism(-700, GORGE1 - 0.5);

  // ties: on the ground and on the trestle, none across the gap
  const ties = [];
  for (let z = -650; z < 560; z += 0.62) { if (z > GAP0 && z < GAP1 + 0) continue; if (z < GAP0 + 0.0 && z > GAP1) continue; if (z <= GAP0 && z >= GAP1) continue; ties.push(z); }
  const tieIm = new THREE.InstancedMesh(new THREE.BoxGeometry(2.6, 0.13, 0.22), tieM, ties.length + 6);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  ties.forEach((z, i) => { e.set(0, (r() - 0.5) * 0.04, 0); q.setFromEuler(e); m.compose(new THREE.Vector3(TRACK_X + (r() - 0.5) * 0.04, RAIL_Y - 0.19, z), q, new THREE.Vector3(1, 1, 1)); tieIm.setMatrixAt(i, m); });
  // a few ties hanging off each broken end
  for (let k = 0; k < 6; k++) { const end = k < 3 ? GAP0 : GAP1; const sgn = k < 3 ? -1 : 1; e.set(sgn * (0.6 + k * 0.25), (r() - 0.5) * 0.6, (r() - 0.5) * 0.3); q.setFromEuler(e); m.compose(new THREE.Vector3(TRACK_X + (r() - 0.5) * 0.6, RAIL_Y - 0.6 - (k % 3) * 0.7, end + sgn * (0.3 + (k % 3) * 0.25)), q, new THREE.Vector3(1, 1, 1)); tieIm.setMatrixAt(ties.length + k, m); }
  tieIm.castShadow = true; tieIm.receiveShadow = true; scene.add(tieIm);

  // rails (and the broken rail ends curling down into the gap)
  const railGeo = (len) => new THREE.BoxGeometry(0.075, 0.13, len);
  for (const s of [-1, 1]) {
    for (const [z0, z1] of [[GAP0, 600], [-700, GAP1]]) { const rl = new THREE.Mesh(railGeo(z1 - z0), steel); rl.position.set(TRACK_X + s * 0.7175, RAIL_Y - 0.065, (z0 + z1) / 2); rl.castShadow = true; scene.add(rl); }
    for (const [z, dir] of [[GAP0, -1], [GAP1, 1]]) {
      const pts = []; for (let k = 0; k <= 8; k++) { const u = k / 8; pts.push(new THREE.Vector3(TRACK_X + s * 0.7175 + s * u * u * 0.6, RAIL_Y - 0.065 - 3.2 * u * u * (s > 0 ? 1 : 0.6), z + dir * 2.4 * Math.sin(u * 1.2))); }
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.045, 6, false), steel); tube.castShadow = true; scene.add(tube);
    }
  }

  // the gorge: two rock walls and a floor
  const wall = (z, face) => {
    const g = new THREE.PlaneGeometry(900, 44, 300, 22); const pa = g.attributes.position;
    for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i); const n = Math.sin(x * 0.11) * Math.sin(y * 0.23 + x * 0.05) * 2.2 + Math.sin(x * 0.53 + y * 0.7) * 0.6 + Math.sin(x * 1.7) * Math.sin(y * 1.3) * 0.3; pa.setZ(i, n + (y + 22) * 0.12 * 0); }
    g.computeVertexNormals();
    const w = new THREE.Mesh(g, rockM); w.position.set(0, -22, z); w.rotation.y = face > 0 ? 0 : Math.PI; w.receiveShadow = true; w.castShadow = true; scene.add(w);
  };
  wall(GORGE1, 1); wall(GORGE0, -1);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(900, GORGE0 - GORGE1, 60, 8), rockM); fl.rotation.x = -Math.PI / 2; fl.position.set(0, FLOOR, (GORGE0 + GORGE1) / 2); fl.receiveShadow = true; scene.add(fl);
  // the rim: a lip of broken rock along each edge
  for (const z of [GORGE0, GORGE1]) for (let x = -120; x < 120; x += 2.2) { if (Math.abs(x - TRACK_X) < 3) continue; const s = 0.4 + r() * 1.2; const b = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockM); b.position.set(x + r(), -s * 0.4, z + (r() - 0.5) * 1.5); b.rotation.set(r() * 3, r() * 3, r() * 3); b.castShadow = true; b.receiveShadow = true; scene.add(b); }

  // the trestle: battered bents every 4 m, girts and X-bracing, two stringers under the rails
  const list = [];
  const bentAt = (z, broken) => {
    const top = RAIL_Y - 0.25 - 0.4, depth = top - FLOOR, xs = [-1.6, -0.55, 0.55, 1.6];
    const px = (x, y) => TRACK_X + x * (1 + 0.4 * (top - y) / depth);
    const yTop = broken ? top - 6 - r() * 4 : top;
    for (const x of xs) list.push([[px(x, FLOOR), FLOOR, z], [px(x, yTop), yTop, z], 0.3]);
    for (let y = FLOOR + 6; y < yTop - 1; y += 7.5) {
      list.push([[px(-1.75, y), y, z], [px(1.75, y), y, z], 0.18, 0.25]);
      if (y + 7.5 < yTop) { list.push([[px(-1.6, y), y, z], [px(1.6, y + 7.5), y + 7.5, z], 0.12, 0.2]); list.push([[px(1.6, y), y, z], [px(-1.6, y + 7.5), y + 7.5, z], 0.12, 0.2]); }
    }
    if (!broken) list.push([[px(-1.9, top), top, z], [px(1.9, top), top, z], 0.3, 0.35]);
  };
  for (let z = GORGE0 - 2; z > GORGE1 + 1; z -= 4) { const inGap = z < GAP0 + 1.5 && z > GAP1 - 1.5; if (inGap && z < GAP0 - 2.5 && z > GAP1 + 2.5) continue; bentAt(z, inGap); }
  // longitudinal stringers and the sway braces between bents
  for (const [z0, z1] of [[GORGE0 + 1, GAP0], [GAP1, GORGE1 - 1]]) for (const x of [-0.75, 0.75]) list.push([[TRACK_X + x, RAIL_Y - 0.45, z0], [TRACK_X + x, RAIL_Y - 0.45, z1], 0.25, 0.4]);
  for (let z = GORGE0 - 2; z > GORGE1 + 3; z -= 4) { if (z < GAP0 + 2 && z > GAP1 - 6) continue; for (const x of [-1.6, 1.6]) for (let y = FLOOR + 6; y < -4; y += 15) list.push([[TRACK_X + x * (1 + 0.4 * (-y) / 38), y, z], [TRACK_X + x * (1 + 0.4 * (-y - 7) / 38), y + 7, z - 4], 0.12, 0.18]); }
  // fallen timbers on the floor of the gorge, under the gap
  for (let k = 0; k < 14; k++) { const x = TRACK_X + (r() - 0.5) * 9, z = mix(GAP1 - 3, GAP0 + 3, r()); const a = r() * 6.28, L = 3 + r() * 6; list.push([[x, FLOOR + 0.2, z], [x + Math.cos(a) * L, FLOOR + 0.2 + r() * 2.5, z + Math.sin(a) * L], 0.28]); }
  beams(scene, list, wood);

  // telegraph line along the left of the track, converging on the gorge
  const poles = []; const PX = TRACK_X - 4.2;
  for (let z = GORGE0 + 6; z < 420; z += 36) poles.push(new THREE.Vector3(PX + (r() - 0.5) * 0.3, 0, z));
  const nNear = poles.length;
  for (let z = GORGE1 - 6; z > -600; z -= 36) poles.push(new THREE.Vector3(PX + (r() - 0.5) * 0.3, 0, z));
  const pl = []; const wiresAt = [];
  for (const p of poles) {
    const h = 7.2 + r() * 0.5, lean = (r() - 0.5) * 0.1;
    pl.push([[p.x, -0.5, p.z], [p.x + lean, h, p.z], 0.22]);
    pl.push([[p.x - 1.0 + lean, h - 0.5, p.z], [p.x + 1.0 + lean, h - 0.5, p.z], 0.12, 0.14]);
    wiresAt.push([new THREE.Vector3(p.x - 0.8 + lean, h - 0.38, p.z), new THREE.Vector3(p.x + lean, h - 0.38, p.z), new THREE.Vector3(p.x + 0.8 + lean, h - 0.38, p.z)]);
  }
  beams(scene, pl, wood);
  const wireM = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.6, metalness: 0.6 });
  for (let i = 0; i < wiresAt.length - 1; i++) { if (i === nNear - 1) continue; for (let k = 0; k < 3; k++) { const a = wiresAt[i][k], b = wiresAt[i + 1][k]; const mm = a.clone().add(b).multiplyScalar(0.5); mm.y -= 0.6; scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mm, b), 16, 0.012, 4, false), wireM)); } }
}
