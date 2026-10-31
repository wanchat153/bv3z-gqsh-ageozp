// Pigeon vs Ice Cream — wordless 3D toon short. Every frame is a pure function of t.
import * as THREE from './three.module.js';
import { DUR, T, K, W, tau, filmAt, SLOW } from './timeline.js';
import { clamp, mix, sstep, mulberry } from './toon.js';
import { buildSet, PERCH, BRANCH, COOLER, STONE0 } from './set.js';
import { makeMan, makePigeon, makeCone, makeScoop, makeStone, makeBulb, makeStar, makeSweat, makeFeather } from './chars.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const VA = (a) => V(a[0], a[1], a[2]);
const W0 = innerWidth, HH = innerHeight;
const canvas = document.createElement('canvas'); document.body.appendChild(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W0, HH, false);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, W0 / HH, 0.02, 200);
const QS = new URLSearchParams(location.search);

const hemi = new THREE.HemisphereLight(0xeaf4ff, 0x8fc77a, 1.25); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1d6, 2.4); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
Object.assign(sun.shadow.camera, { left: -2.6, right: 2.6, top: 2.6, bottom: -2.6, near: 0.5, far: 30 }); scene.add(sun, sun.target);
const SET = buildSet(scene);

// ---------- keyframe helpers ----------
// kf([[filmTime, value], ...]) -> f(w): smooth (eased) blend between keys, keys converted to WORLD time
function kf(keys, film = true) {
  const ks = keys.map(([t, v]) => [film ? tau(t) : t, v]);
  return (w) => {
    if (w <= ks[0][0]) return ks[0][1];
    for (let i = 1; i < ks.length; i++) if (w < ks[i][0]) {
      const [a, va] = ks[i - 1], [b, vb] = ks[i]; const u = sstep(0, 1, (w - a) / (b - a));
      return Array.isArray(va) ? va.map((x, j) => mix(x, vb[j], u)) : mix(va, vb, u);
    }
    return ks[ks.length - 1][1];
  };
}
const bump = (w, a, b, e = 0.1) => sstep(a - e, a, w) * (1 - sstep(b, b + e, w));
const bez = (p0, p1, p2, p3, u) => { const v = 1 - u; return p0.clone().multiplyScalar(v * v * v).addScaledVector(p1, 3 * v * v * u).addScaledVector(p2, 3 * v * u * u).addScaledVector(p3, u * u * u); };
const bezD = (p0, p1, p2, p3, u) => { const v = 1 - u; return p1.clone().sub(p0).multiplyScalar(3 * v * v).addScaledVector(p2.clone().sub(p1), 6 * v * u).addScaledVector(p3.clone().sub(p2), 3 * u * u); };

// ---------- the man ----------
const MX = -0.08;
const MAN = makeMan(); MAN.root.position.set(MX, 0, 0); scene.add(MAN.root);
const HOLD = [0.14, 0.86, 0.34], HOLD2 = [0.04, 0.9, 0.4], LICK = [-0.06, 0.91, 0.4], CIN = [0.43, 0.56, 0.0], FIST = [0.34, 1.3, 0.36];
const RAISE = [0.22, 1.42, 0.3], KNEE_P = [0.2, 0.72, 0.38], KNEE_N = [-0.26, 0.62, 0.36], GUARD = [-0.02, 1.0, 0.45], BEHIND = [-0.36, 0.76, -0.22];
const LICKN = [-0.1, 0.91, 0.4], FRONTN = [-0.15, 0.86, 0.38], STN = [STONE0.x, STONE0.y + 0.06, STONE0.z + 0.02], CINN = [0.36, 0.58, 0.02];
const B = T.bonk;
const LEAN = kf([[0, 0.05], [1.9, 0.05], [2.25, 0.2], [3.0, 0.2], [3.3, -0.03], [5.3, 0.0], [5.65, 0.14], [6.0, 0.02], [7.2, 0.02], [7.5, 0.2], [8.15, 0.2], [8.4, -0.05], [9.9, 0.0],
  [10.3, 0.0], [10.65, 0.14], [10.95, 0.02], [11.3, -0.05], [12.3, -0.03], [12.55, 0.2], [18.45, 0.2], [18.75, 0.02], [21.0, 0.0], [21.3, -0.07], [22.3, 0.0],
  [22.75, 0.22], [23.15, 0.24], [23.55, 0.06], [24.0, 0.16], [24.45, 0.16], [24.8, 0.03], [25.3, 0.2], [25.55, 0.2], [25.85, 0.0], [26.2, -0.03], [27.1, -0.04], [27.35, -0.13], [28.5, -0.08],
  [B, 0.0], [B + 0.55, 0.02], [B + 1.6, 0.2], [B + 3.3, 0.2], [B + 3.8, -0.1], [B + 5.4, -0.13], [B + 6.6, -0.05], [DUR, -0.02]]);
const TWIST = kf([[0, 0], [5.4, 0], [5.65, 0.3], [6.0, 0.3], [6.35, 0], [10.4, 0], [10.65, 0.3], [10.95, 0.3], [11.3, 0], [22.4, 0], [22.75, -0.45], [23.2, -0.45], [23.6, 0],
  [23.95, 0.3], [24.45, 0.3], [24.8, 0], [25.1, 0], [25.35, 0.55], [25.55, 0.55], [25.85, -0.1], [26.1, 0], [DUR, 0]]);
// look keys: [yaw, pitch]
const AT_LAMP = [0.72, 0.55];
const LOOK = kf([[0, [0, -0.05]], [2.0, [0, -0.1]], [2.3, [0, -0.15]], [3.2, [0, -0.3]], [3.6, [0, -0.3]], [4.0, AT_LAMP], [5.1, AT_LAMP], [5.45, [0.35, -0.25]], [6.0, [0, -0.2]], [6.35, [-0.85, 0.1]], [6.8, [-0.85, 0.1]], [7.0, [0.85, 0.15]], [7.25, [0.85, 0.15]], [7.45, [0, -0.15]],
  [8.15, [0, -0.15]], [8.45, AT_LAMP], [9.9, AT_LAMP], [10.35, [0.35, -0.25]], [10.95, [0, -0.2]], [11.3, [0.42, 0.42]], [12.25, [0.42, 0.42]], [12.5, [0, -0.15]], [18.5, [0, -0.15]], [18.75, [0, -0.32]], [19.25, AT_LAMP],
  [21.1, AT_LAMP], [21.35, [0, 0.12]], [22.35, [0, 0.0]], [22.65, [-0.6, -0.5]], [23.3, [-0.6, -0.5]], [23.6, [0, -0.3]], [23.95, [0.3, -0.4]], [24.6, [0.3, -0.4]], [24.85, [0, -0.15]],
  [25.25, [0.45, -0.3]], [25.6, [0.45, -0.3]], [25.85, [0, 0]], [26.15, [0.3, 0.45]], [26.45, [0.15, 0.2]], [27.12, [0.15, 0.2]], [27.3, [0.45, 0.5]], [28.0, [0.5, 0.3]], [29.3, [0.55, -0.45]],
  [B + 0.3, [0.55, -0.5]], [B + 0.55, [0, 0]], [B + 0.95, [-0.2, -0.15]], [B + 1.55, [0, -0.12]], [B + 3.35, [0, -0.05]], [B + 3.75, [-0.15, 0.7]], [B + 5.0, [-0.15, 0.7]], [B + 5.35, [-0.05, 0.6]],
  [B + 6.6, [0, 0]], [DUR, [0, -0.02]]]);
const TILT = kf([[0, 0], [3.2, 0], [3.5, 0.18], [3.9, 0], [18.55, 0], [18.8, 0.22], [19.2, 0], [B + 1.6, 0], [B + 2.0, 0.15], [B + 3.3, 0.15], [B + 3.5, 0], [DUR, 0]]);
// eyes: [N, P] openness (1 open, 0 shut, >1 wide)
const tb = (a, d = 0.08) => [[a - d, [1, 1]], [a, [0, 0]], [a + 0.12, [0, 0]], [a + 0.12 + d, [1, 1]]];
const EYES = kf([[0, [1, 1]], ...tb(0.9), [2.15, [1, 1]], [2.3, [0, 0]], [3.05, [0, 0]], [3.2, [1.3, 1.3]], [3.8, [1, 1]], ...tb(5.0), [7.4, [1, 1]], [7.55, [0, 0]], [8.15, [0, 0]], [8.25, [1.3, 1.3]], [8.45, [0.55, 0.55]], [9.9, [0.55, 0.55]], [10.2, [1, 1]],
  [11.2, [1, 1]], [11.4, [0.42, 0.42]], [12.45, [0.42, 0.42]], [12.62, [0, 0]], [18.5, [0, 0]], [18.62, [1.3, 1.3]], [19.2, [1, 1]],
  [19.65, [1, 1]], [19.75, [0, 0]], [20.05, [0, 0]], [20.15, [1, 1]], [20.4, [1, 1]], [20.5, [0, 0]], [20.75, [0, 0]], [20.85, [1, 1]], [21.15, [1, 1]], [21.3, [1.3, 1.3]], [22.0, [1.1, 1.1]], [22.4, [1, 1]],
  ...tb(24.6), [26.3, [1, 1]], [26.45, [0.3, 0]], [27.12, [0.3, 0]], [27.25, [1.3, 1.3]], [28.6, [1.15, 1.15]], [B + 0.5, [1, 1]], [B + 1.5, [1, 1]], [B + 1.65, [0, 0]], [B + 3.3, [0, 0]], [B + 3.45, [1, 1]],
  [B + 3.8, [1.15, 1.15]], [B + 4.9, [1.15, 1.15]], [B + 5.05, [1.4, 1.4]], [B + 6.5, [1.3, 1.3]], [B + 7.2, [0.5, 0.5]],
  [T.deadpan1 - 0.06, [0.5, 0.5]], [T.deadpan1, [0, 0]], [T.deadpan1 + 0.18, [0, 0]], [T.deadpan1 + 0.26, [0.5, 0.5]], [T.deadpan2 - 0.06, [0.5, 0.5]], [T.deadpan2, [0, 0]], [T.deadpan2 + 0.25, [0, 0]], [T.deadpan2 + 0.35, [0.45, 0.45]], [DUR, [0.45, 0.45]]]);
// brows: [height, angle]  (angle > 0 = angry V)
const BROW = kf([[0, [0, 0]], [3.15, [0, 0]], [3.25, [1, -0.15]], [3.9, [0.3, 0]], [4.1, [-0.3, 0.25]], [5.1, [-0.3, 0.25]], [5.4, [0, 0]], [8.15, [0, 0]], [8.25, [1, -0.15]], [8.45, [-1, 0.45]], [9.9, [-1, 0.45]], [10.2, [0, 0]],
  [11.2, [0, 0]], [11.4, [-1, 0.4]], [12.45, [-1, 0.4]], [12.6, [0, 0]], [18.5, [0, 0]], [18.62, [1, -0.2]], [19.2, [-0.6, 0.3]], [21.1, [-0.6, 0.3]], [21.3, [1.2, -0.2]], [22.3, [0.3, 0]],
  [26.3, [0, 0]], [26.45, [0.5, 0.35]], [27.12, [0.5, 0.35]], [27.25, [1.2, -0.2]], [28.8, [1.0, -0.1]], [B + 0.5, [0.4, 0.2]], [B + 1.5, [0.3, 0]], [B + 3.4, [0.3, 0]], [B + 3.8, [0.8, -0.2]],
  [B + 5.0, [0.8, -0.2]], [B + 5.1, [1.3, -0.35]], [B + 6.6, [1.1, -0.3]], [B + 7.2, [-0.3, 0]], [DUR, [-0.3, 0]]]);
// mouth: [open, tongue, smile, wide, blush]
const M0 = [0, 0, 0.45, 0, 0];
const MOUTH = kf([[0, M0], [2.1, M0], [2.3, [0.45, 1, 0.4, 0, 0.6]], [3.0, [0.45, 1, 0.4, 0, 0.6]], [3.2, [0.75, 0, 0, 0, 0]], [3.9, [0.4, 0, 0, 0, 0]], [4.1, [0, 0, -0.5, 0, 0]], [5.2, [0, 0, -0.5, 0, 0]], [6.0, [0, 0, 0.45, 0, 0]],
  [6.3, [0, 0, -0.2, 0, 0]], [7.3, [0, 0, 0.2, 0, 0]], [7.5, [0.45, 1, 0.4, 0, 0.6]], [8.12, [0.45, 1, 0.4, 0, 0.6]], [8.25, [0.75, 0, 0, 0, 0]], [8.45, [0.28, 0, -0.6, 1, 0]], [9.9, [0.28, 0, -0.6, 1, 0]], [10.2, [0, 0, -0.5, 0, 0]],
  [11.0, [0, 0, 0.3, 0, 0]], [11.4, [0, 0, -0.6, 0, 0]], [12.4, [0, 0, -0.6, 0, 0]], [12.6, [0.45, 1, 0.4, 0, 0.6]], [18.48, [0.45, 1, 0.4, 0, 0.6]], [18.62, [0.6, 0, 0, 0, 0]], [19.1, [0, 0, -0.6, 0, 0]],
  [21.15, [0, 0, -0.6, 0, 0]], [21.3, [0.6, 0, 0.8, 0.5, 0]], [21.9, [0, 0, 0.9, 0, 0]], [22.4, [0, 0, 0.5, 0, 0]], [26.3, [0, 0, 0.5, 0, 0]], [26.45, [0, 0, 0.95, 0, 0]], [27.12, [0, 0, 0.95, 0, 0]],
  [27.25, [0.8, 0, 0, 0, 0]], [28.6, [0.55, 0, 0, 0, 0]], [B + 0.2, [0.3, 0, 0, 0.5, 0]], [B + 0.55, [0, 0, 1, 0, 0.4]], [B + 1.5, [0, 0, 1, 0, 0.4]], [B + 1.65, [0.42, 1, 0.5, 0, 0.9]], [B + 3.3, [0.42, 1, 0.5, 0, 0.9]],
  [B + 3.45, [0, 0, 0.6, 0, 0.3]], [B + 3.8, [0.2, 0, 0, 0, 0]], [B + 5.0, [0.2, 0, 0, 0, 0]], [B + 5.1, [0, 0, -0.7, 0, 0]], [B + 6.6, [0, 0, -0.7, 0, 0]], [B + 7.2, [0, 0, -0.25, 0, 0]], [DUR, [0, 0, -0.25, 0, 0]]]);
const HANDP = kf([[0, HOLD], [1.95, HOLD], [2.3, LICK], [3.0, LICK], [3.3, [0.05, 0.96, 0.43]], [3.9, [0.1, 0.9, 0.38]], [5.3, HOLD], [5.7, CIN], [5.95, CIN], [6.3, [0.3, 1.0, 0.25]], [6.55, HOLD2], [7.25, HOLD2], [7.55, LICK], [8.1, LICK],
  [8.45, FIST], [9.9, FIST], [10.3, HOLD], [10.7, CIN], [10.95, CIN], [11.3, [0.26, 0.98, 0.28]], [12.3, HOLD], [12.6, LICK], [18.45, LICK], [18.7, [0.05, 0.96, 0.43]], [19.4, HOLD],
  [23.2, HOLD], [23.45, HOLD2], [23.8, HOLD2], [24.0, [0.2, 1.0, 0.25]], [24.2, CIN], [24.45, CIN], [24.75, [0.25, 1.0, 0.28]], [25.0, HOLD], [26.0, HOLD], [26.4, RAISE], [27.25, RAISE], [27.7, [0.34, 0.95, 0.4]],
  [B + 0.55, [0.18, 0.84, 0.36]], [B + 0.95, KNEE_P], [DUR, KNEE_P]]);
const HANDN = kf([[0, KNEE_N], [6.2, KNEE_N], [6.45, GUARD], [7.3, GUARD], [7.5, KNEE_N], [8.45, [-0.33, 0.8, 0.2]], [9.9, [-0.33, 0.8, 0.2]], [10.2, KNEE_N], [22.35, KNEE_N],
  [22.75, STN], [23.15, STN], [23.5, [0.0, 1.06, 0.47]], [23.75, [0.04, 1.0, 0.42]], [24.0, KNEE_N], [25.05, KNEE_N], [25.35, CINN], [25.55, CINN], [25.9, BEHIND], [B + 0.55, BEHIND],
  [B + 0.95, FRONTN], [B + 1.6, LICKN], [B + 3.3, LICKN], [B + 3.75, FRONTN], [DUR, FRONTN]]);
const LID = kf([[0, 0], [5.45, 0], [5.6, 1], [6.2, 1], [6.35, 0], [10.4, 0], [10.55, 1], [11.15, 1], [11.3, 0], [23.95, 0], [24.1, 1], [24.7, 1], [24.85, 0], [25.15, 0], [25.3, 1], [25.75, 1], [25.9, 0], [DUR, 0]]);

// ---------- props ----------
const coneP = makeCone(); scene.add(coneP); const scoopP = makeScoop(); scene.add(scoopP);
const coneN = makeCone(); scene.add(coneN); const scoopN = makeScoop(); scene.add(scoopN);
const stolen = makeScoop(); scene.add(stolen);
const stone = makeStone(); scene.add(stone);
const bulb = makeBulb(); scene.add(bulb);
const stars = [0, 1, 2, 3].map(() => { const s = makeStar(); scene.add(s); return s; });
const sweat = makeSweat(); scene.add(sweat);
const feathers = []; { const r = mulberry(77); for (let i = 0; i < 40; i++) { const f = makeFeather(i); scene.add(f); feathers.push({ m: f, a: r() * 6.283, el: (r() - 0.3) * 1.2, v: 0.6 + r() * 1.2, sp: r() * 10, ph: r() * 6.283, d: 0.3 + r() * 0.5 }); } }
const coneOff = V(0, 0.045, 0.02), scoopOff = V(0, 0.16, 0.02);

// ---------- the pigeon (P1) ----------
const P1 = makePigeon(0); scene.add(P1.root);
const yawTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
const MANHEAD = V(MX, 1.2, 0.05);
const PERCHYAW = yawTo(PERCH, MANHEAD);
const LICKSCOOP = VA(LICK).add(scoopOff);
const TIP_UP = 0.19, TIP_FWD = 0.19;
const rootFor = (tipTarget, dir) => { const f = V(dir.x, 0, dir.z).normalize(); return tipTarget.clone().addScaledVector(f, -TIP_FWD).add(V(0, -TIP_UP, 0)); };
const G1 = rootFor(LICKSCOOP, V(-0.6, 0, -0.4)), G3 = rootFor(LICKSCOOP, V(-0.5, 0, -0.7)), G2 = rootFor(LICKSCOOP, V(0.8, 0, 0.1));
const RAISESC = VA(RAISE).add(scoopOff); const G4 = rootFor(RAISESC, V(-0.6, 0, -0.5));
const TOP4 = V(0.42, 1.62, 0.58), LAND4 = V(0.52, 0.0, 0.85);
const FL = [
  // dive in, then loop back to the lamp
  { w0: W.launch1, w1: W.grab1, p: [PERCH, PERCH.clone().add(V(0.05, 0.3, 0.75)), G1.clone().add(V(0.55, 0.3, 0.35)), G1] },
  { w0: W.grab1, w1: W.perch1, p: [G1, G1.clone().add(V(-0.45, 0.25, 0.25)), PERCH.clone().add(V(-0.5, 0.65, 0.55)), PERCH] },
  { w0: W.launch2, w1: W.grab2, p: [PERCH, PERCH.clone().add(V(-0.5, 0.6, -0.4)), G2.clone().add(V(-0.6, 0.35, -0.05)), G2] },
  { w0: W.grab2, w1: W.perch2, p: [G2, G2.clone().add(V(0.35, 0.3, 0.45)), PERCH.clone().add(V(0.2, 0.5, 0.6)), PERCH] },
  { w0: W.launch3, w1: W.grab3, p: [PERCH, PERCH.clone().add(V(0.1, 0.12, 0.9)), G3.clone().add(V(0.45, -0.05, 0.45)), G3] },
  { w0: W.grab3, w1: W.perch3, p: [G3, G3.clone().add(V(-0.4, 0.3, 0.3)), PERCH.clone().add(V(-0.45, 0.6, 0.6)), PERCH] },
  { w0: W.launch4, w1: W.grab4, p: [PERCH, PERCH.clone().add(V(0.05, 0.3, 0.7)), G4.clone().add(V(0.45, 0.25, 0.35)), G4] },
  { w0: W.grab4, w1: W.top4, p: [G4, G4.clone().add(V(0.1, 0.0, 0.1)), TOP4.clone().add(V(-0.05, -0.05, -0.05)), TOP4], heavy: true },
];
const fly = (w, f) => { const u = clamp((w - f.w0) / (f.w1 - f.w0), 0, 1); const e = mix(u, sstep(0, 1, u), 0.45); return { pos: bez(...f.p, e), d: bezD(...f.p, e), u }; };
// perched behaviour driven by the man's eyes in the tests, and by the gulps
const P1CROUCH = kf([[0, 0], [2.3, 0], [2.45, 1], [2.5, 0], [7.4, 0], [7.55, 1], [7.6, 0], [12.5, 0], [12.6, 1], [12.62, 0], [19.7, 0], [19.8, 1], [20.12, 1], [20.17, 0], [20.45, 0], [20.55, 1], [20.82, 1], [20.87, 0], [26.4, 0], [26.55, 1], [26.6, 0], [DUR, 0]]);
const P1AWAY = kf([[0, 0], [20.1, 0], [20.18, 1], [20.4, 1], [20.47, 0], [20.85, 0], [20.92, 1], [21.4, 1], [21.6, 0], [DUR, 0]]);
const GULPS = [[T.gulp1, 0], [T.gulp2, 0], [T.gulp3, 0]];
function p1At(w, t) {
  const s = { pos: PERCH.clone(), yaw: PERCHYAW, pitch: 0, roll: 0, flap: 0, open: 0, headPitch: -0.3, headYaw: 0, bob: 0, beak: 0, crouch: 0, squash: 1, legs: 1, eyesShut: false, carry: null };
  s.bob = 0.008 * Math.sin(w * 7.0); s.headPitch += 0.08 * Math.sin(w * 3.1);
  const cr = P1CROUCH(w); s.crouch = cr; s.pitch = 0.35 * cr; s.open = 0.15 * cr;
  const aw = P1AWAY(w); s.headYaw = 1.1 * aw; s.headPitch = mix(s.headPitch, 0.55, aw); s.beak = 0.6 * aw * (0.5 + 0.5 * Math.sin(w * 30));
  for (const [gt] of GULPS) { const u = (t - gt) / 0.45; if (u > -0.3 && u < 1.2) { s.headPitch = mix(s.headPitch, 0.75, bump(u, 0, 1, 0.3)); s.beak = Math.max(s.beak, 0.8 * bump(u, 0, 0.5, 0.2)); s.bob += 0.02 * Math.sin(u * 20) * bump(u, 0, 1, 0.2); } }
  for (const f of FL) if (w >= f.w0 && w < f.w1) {
    const r = fly(w, f); s.pos = r.pos; const d = r.d; s.yaw = Math.atan2(d.x, d.z); s.pitch = clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)) * 0.8, -0.9, 0.9);
    s.open = 1; s.flap = w * 2 * Math.PI * (f.heavy ? 14 : 8.5); s.legs = 0.2; s.headPitch = 0.1; s.crouch = 0;
    if (r.u > 0.75 && !f.heavy && f.p[3] === PERCH) { const k = sstep(0.75, 1, r.u); s.legs = mix(0.2, 1, k); s.pitch = mix(s.pitch, -0.5, k); s.yaw = mix(s.yaw, PERCHYAW, k * k); }
    if (f.heavy) { s.pitch = -0.45 + 0.1 * Math.sin(w * 40); s.headPitch = -0.2; s.roll = 0.15 * Math.sin(w * 11); }
    return s;
  }
  if (w >= W.top4) {
    const fs = w - W.top4, tl = Math.sqrt(2 * TOP4.y / 9.8);
    if (fs < tl) { const u = fs / tl; s.pos = TOP4.clone().lerp(LAND4, u); s.pos.y = TOP4.y - 4.9 * fs * fs; s.yaw = yawTo(TOP4, LAND4); s.pitch = mix(0.2, 1.2, u); s.roll = 0.6 * Math.sin(fs * 9);
      s.open = 1; s.flap = w * 2 * Math.PI * 16; s.legs = 0.4; s.headPitch = 0.4; s.beak = 1; return s; }
    const a = fs - tl; s.pos = LAND4.clone(); s.yaw = -0.6; s.legs = 1; s.open = 0;
    const tUp = K.getUp, tWh = K.whistle;
    if (w < tUp) {
      s.squash = 1 - 0.55 * Math.exp(-a * 9) * Math.cos(a * 22); s.roll = 1.45 * sstep(0, 0.12, a); s.pos.y = 0.0; s.eyesShut = true; s.headPitch = 0; s.headRoll = 0.3 * Math.sin(w * 6);
      return s;
    }
    const g = (w - tUp); const up = sstep(0, 0.35, g); s.roll = mix(1.45, 0.25 * Math.sin(g * 14) * Math.exp(-g * 2), up); s.eyesShut = g < 0.2;
    s.yaw = mix(-0.6, yawTo(LAND4, MANHEAD), sstep(0.3, 0.6, g)); s.headPitch = 0.1;
    const wh = w - tWh; if (wh > -0.1 && wh < 0.8) { const k = bump(wh, 0, 0.6, 0.1); s.headPitch = mix(s.headPitch, 0.85, k); s.beak = k; s.crouch = 0.3 * k; }
    if (w > K.snap) { s.headPitch = -0.3; s.bob = 0.01 * Math.sin(w * 8); }
    return s;
  }
  return s;
}

// ---------- ghosts + dotted arc of the third dive (slow-motion clue) ----------
function ghostify(p, op) { p.root.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = op; o.material.depthWrite = false; o.castShadow = false; } }); return p; }
const GHOSTS = [1, 2, 3, 4, 5, 6].map((k) => { const g = ghostify(makePigeon(0), 0.32 * (1 - k / 7)); scene.add(g.root); return g; });
const DOTS = []; { const f = FL[4]; for (let i = 0; i < 26; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false })); const e = mix(i / 25, sstep(0, 1, i / 25), 0.45); d.position.copy(bez(...f.p, e)).add(V(0, 0.12, 0.08)); scene.add(d); DOTS.push(d); } }

// ---------- the flock ----------
const NF = 11;
const FLOCK = []; { const r = mulberry(99);
  const spots = [[-0.62, 0.935, -0.26, 0.3], [-0.55, 0.0, 0.72, 0.4], [-0.56, 0.47, 0.07, 0.6], [-0.36, 1.0, 0.0, 0.2], [-0.24, 0.6, 0.44, 0.1], [null], [0.04, 0.6, 0.44, -0.1], [0.19, 1.0, 0.0, -0.2], [0.27, 0.0, 0.74, -0.4], [0.43, 0.765, 0.0, -0.5], [0.62, 0.935, -0.26, -0.3]];
  for (let i = 0; i < NF; i++) { const p = makePigeon((r() - 0.5) * 2); scene.add(p.root);
    FLOCK.push({ p, i, br: V(-0.78 + i * 0.18 + (r() - 0.5) * 0.04, BRANCH.y + 0.045, BRANCH.z), sky: V(3.2 + i * 0.22, 3.0 + (i % 3) * 0.35, -2.6 - (i % 4) * 0.35),
      in0: K.flockIn + i * 0.07 + r() * 0.05, in1: 0, dv0: K.dive + i * 0.025 + r() * 0.03, spot: spots[i], ph: r() * 6.28, look: r() * 2 - 1, ry: (r() - 0.5) * 0.3 });
    FLOCK[i].in1 = FLOCK[i].in0 + 0.95; }
}
function headSpot() { return MAN.headWorld(V(0, 0.27, -0.03)); }
function flockAt(F, w) {
  const s = { pos: F.br.clone(), yaw: F.ry, pitch: 0, roll: 0, flap: 0, open: 0, headPitch: 0, headYaw: 0, bob: 0, beak: 0, crouch: 0, squash: 1, legs: 1, vis: true };
  if (w < F.in0) { s.vis = false; return s; }
  if (w < F.in1) { const u = (w - F.in0) / (F.in1 - F.in0); const e = sstep(0, 1, u); const p = [F.sky, F.sky.clone().add(V(-1.2, -0.3, 0.6)), F.br.clone().add(V(0.6, 0.5, 0.2)), F.br];
    s.pos = bez(...p, e); const d = bezD(...p, e); s.yaw = Math.atan2(d.x, d.z); s.open = 1; s.flap = w * 2 * Math.PI * 8 + F.ph; s.legs = mix(0.2, 1, sstep(0.75, 1, u)); return s; }
  const target = F.spot[0] === null ? headSpot() : V(F.spot[0], F.spot[1], F.spot[2]);
  if (w < F.dv0) {
    s.bob = 0.008 * Math.sin(w * 6 + F.ph);
    const snapped = sstep(K.snap, K.snap + 0.06, w); const wander = F.look * 0.9 * Math.sin(w * 1.3 + F.ph);
    s.headYaw = mix(wander, yawTo(F.br, MANHEAD) - F.ry, snapped); s.headPitch = mix(0.05 * Math.sin(w * 2 + F.ph), -0.45, snapped);
    s.crouch = sstep(K.dive - 0.2, K.dive, w) * 0.8; return s;
  }
  const hit = K.hit; const u = clamp((w - F.dv0) / (hit - F.dv0), 0, 1);
  if (u < 1) { const p = [F.br, F.br.clone().add(V(0, 0.35, 0.3)), target.clone().add(V(0, 0.5, 0.5)), target]; const e = sstep(0, 1, u);
    s.pos = bez(...p, e); const d = bezD(...p, e); s.yaw = Math.atan2(d.x, d.z); s.pitch = clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)) * 0.7, -0.9, 0.9); s.open = 1; s.flap = w * 2 * Math.PI * 9 + F.ph; s.legs = mix(0.2, 1, sstep(0.7, 1, u)); return s; }
  // settled on the man / the bench / the grass
  s.pos = target; s.yaw = F.spot[0] === null ? 0 : F.spot[3] + 0.15 * Math.sin(w * 0.7 + F.ph); const a = w - hit;
  s.squash = 1 - 0.25 * Math.exp(-a * 8) * Math.cos(a * 25); s.bob = 0.012 * Math.sin(w * 5 + F.ph) * (Math.sin(w * 1.7 + F.ph) > 0.2 ? 1 : 0);
  s.headPitch = -0.15 + 0.1 * Math.sin(w * 1.1 + F.ph); s.headYaw = 0.5 * Math.sin(w * 0.8 + F.ph * 2);
  if (F.spot[0] === null) { s.headYaw = 0; s.headPitch = mix(-0.2, 0.7, bump(w, K.gulpEnd - 0.5, K.gulpEnd, 0.15)); s.beak = 0.6 * bump(w, K.gulpEnd - 0.5, K.gulpEnd - 0.1, 0.1); }
  return s;
}

// ---------- camera: keyframes in FILM time, monotone cubic per component ----------
const CK = [
  [0.0, [0.3, 1.12, 1.7], [0.0, 1.06, 0.2], 36], [1.7, [0.26, 1.1, 1.55], [0.0, 1.05, 0.2], 36],
  [2.7, [0.38, 1.36, 3.1], [0.3, 1.45, -0.1], 41], [4.8, [0.42, 1.38, 3.15], [0.33, 1.48, -0.15], 41],
  [5.7, [0.28, 1.15, 2.5], [0.12, 1.02, 0.1], 38], [7.15, [0.3, 1.18, 2.6], [0.12, 1.08, 0.1], 38],
  [7.6, [0.38, 1.38, 3.15], [0.27, 1.45, -0.1], 41], [9.9, [0.35, 1.36, 3.0], [0.25, 1.43, -0.1], 41],
  [10.7, [0.1, 1.12, 2.25], [0.0, 1.05, 0.15], 36], [12.35, [0.18, 1.2, 2.4], [0.12, 1.22, 0.0], 37],
  [13.2, [1.35, 1.4, 2.15], [0.42, 1.55, -0.15], 42], [15.4, [1.25, 1.3, 1.75], [0.25, 1.32, 0.12], 40], [17.3, [1.05, 1.25, 1.65], [0.05, 1.12, 0.3], 39],
  [18.5, [0.32, 1.3, 2.8], [0.25, 1.42, -0.1], 41], [21.0, [0.36, 1.33, 2.9], [0.3, 1.45, -0.12], 41],
  [21.6, [0.06, 1.36, 1.65], [-0.06, 1.36, 0.0], 38], [22.45, [0.06, 1.34, 1.7], [-0.06, 1.34, 0.0], 38],
  [23.0, [-0.4, 1.0, 2.3], [-0.32, 0.78, 0.1], 42], [23.6, [-0.2, 1.0, 2.3], [-0.12, 0.86, 0.2], 42],
  [24.3, [0.2, 1.0, 2.35], [0.22, 0.85, 0.1], 41], [25.0, [0.15, 1.02, 2.4], [0.12, 0.9, 0.05], 41], [25.9, [0.0, 1.05, 2.45], [0.0, 0.95, 0.0], 41],
  [26.4, [0.42, 1.42, 3.25], [0.35, 1.55, -0.1], 42], [27.15, [0.55, 1.5, 2.75], [0.32, 1.55, 0.3], 41], [28.2, [1.25, 1.35, 2.7], [0.42, 1.4, 0.6], 42],
  [29.6, [0.85, 0.42, 2.0], [0.5, 0.2, 0.8], 40], [B + 0.45, [0.82, 0.38, 1.85], [0.52, 0.12, 0.85], 39],
  [B + 0.9, [0.16, 1.1, 2.25], [0.0, 1.0, 0.12], 38], [B + 3.3, [0.18, 1.08, 2.05], [-0.02, 1.02, 0.15], 37],
  [B + 3.85, [0.2, 1.25, 2.55], [0.0, 1.25, 0.0], 40], [B + 5.3, [0.4, 1.2, 3.7], [0.08, 1.85, -0.8], 47], [B + 5.85, [0.38, 1.18, 3.6], [0.06, 1.8, -0.75], 47],
  [B + 6.45, [0.1, 1.0, 2.7], [0.0, 0.95, 0.1], 43], [B + 7.1, [0.02, 0.98, 3.1], [-0.02, 0.84, 0.0], 42], [DUR, [0.02, 1.02, 2.65], [-0.02, 0.88, 0.0], 40],
];
function pchip(xs, ys) {
  const n = xs.length, h = [], d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) { h.push(xs[i + 1] - xs[i]); d.push((ys[i + 1] - ys[i]) / h[i]); }
  for (let i = 1; i < n - 1; i++) { if (d[i - 1] * d[i] <= 0) m[i] = 0; else { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); } }
  return (x) => { if (x <= xs[0]) return ys[0]; if (x >= xs[n - 1]) return ys[n - 1]; let i = 0; while (x > xs[i + 1]) i++;
    const u = (x - xs[i]) / h[i], u2 = u * u, u3 = u2 * u; return (2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * h[i] * m[i] + (-2 * u3 + 3 * u2) * ys[i + 1] + (u3 - u2) * h[i] * m[i + 1]; };
}
const CX = CK.map((k) => k[0]); const CAMF = [];
for (let j = 0; j < 3; j++) CAMF.push(pchip(CX, CK.map((k) => k[1][j])));
for (let j = 0; j < 3; j++) CAMF.push(pchip(CX, CK.map((k) => k[2][j])));
CAMF.push(pchip(CX, CK.map((k) => k[3])));
function camAt(t) { const c = CAMF.map((f) => f(t)); const dr = 0.012; const pos = V(c[0] + dr * Math.sin(t * 0.37), c[1] + dr * 0.6 * Math.sin(t * 0.29 + 1), c[2]); return { pos, tgt: V(c[3], c[4], c[5]), fov: c[6] }; }

// ---------- one frame ----------
let POST = { fade: 1, flash: 0 };
function setup(t) {
  const w = tau(t);
  const look = LOOK(w), eyes = EYES(w), brow = BROW(w), mo = MOUTH(w);
  const hp = VA(HANDP(w)), hn = VA(HANDN(w));
  if (w > K.fist && w < K.fistEnd) hp.add(V(0.03 * Math.sin(w * 38), 0.04 * Math.abs(Math.sin(w * 19)), 0));
  const shake = w > K.snap && w < K.hit ? 0.006 * Math.sin(w * 70) : 0;
  MAN.pose({ lean: LEAN(w), twist: TWIST(w), headYaw: look[0] + shake, headPitch: look[1], headTilt: TILT(w), eyeN: eyes[0], eyeP: eyes[1],
    look: [clamp(look[0] * 0.8, -1, 1), clamp(look[1] * 0.9, -1, 1)], brow: brow[0], browAng: brow[1], mouth: mo[0], tongue: mo[1], smile: mo[2], wide: mo[3], blush: mo[4],
    handP: hp, handN: hn, hatPop: 0.05 * bump(w, K.snap, K.snap + 0.15, 0.04) });
  SET.lid.rotation.x = -1.9 * LID(w);
  // P cone: always in the P hand; the scoop is there until each grab (new scoops come out of the cooler)
  coneP.position.copy(hp).add(coneOff); coneP.rotation.set(0.1, 0, w > K.fist && w < K.fistEnd ? 0.3 * Math.sin(w * 38) : 0);
  const hasP = w < W.grab1 || (w > tau(5.9) && w < W.grab2) || (w > tau(10.9) && w < W.grab3);
  scoopP.visible = hasP; scoopP.position.copy(hp).add(scoopOff);
  // the stolen scoop rides the pigeon's beak to the lamp and is gulped there
  const p = p1At(w, t); P1.set(p);
  let sv = false, ss = 1;
  for (const [g, gl] of [[W.grab1, K.gulp1], [W.grab2, K.gulp2], [W.grab3, K.gulp3]]) if (w >= g && w < gl + 0.45) { sv = true; ss = 1 - sstep(gl, gl + 0.4, w); }
  stolen.visible = sv; if (sv) { const tp = P1.tipWorld(); stolen.position.copy(tp).add(V(0, -0.03, 0.0)); stolen.scale.setScalar(Math.max(0.01, 0.75 * ss)); }
  // decoy stone: ground -> N hand -> on the empty cone -> dipped pink -> beak -> grass
  const pink = sstep(K.dip0 + 0.25, K.dip1, w); stone.userData.mat.color.setRGB(mix(0.6, 1.0, pink), mix(0.6, 0.56, pink), mix(0.6, 0.69, pink));
  if (w < K.stone1) stone.position.copy(STONE0);
  else if (w < K.plop) stone.position.copy(hn).add(V(0, 0.06, 0.0));
  else if (w < W.grab4) stone.position.copy(hp).add(scoopOff).add(V(0, -0.005, 0));
  else if (w < W.bonk4) stone.position.copy(P1.tipWorld()).add(V(0, -0.04, 0));
  else stone.position.copy(LAND4).add(V(0.12, 0.05, 0.08));
  // real cone: in the cooler until the N hand fetches it, hidden behind his back, then eaten
  coneN.visible = w > K.real0 + 0.15; coneN.position.copy(hn).add(coneOff); coneN.rotation.set(0.1, 0, 0);
  const headF = FLOCK[5];
  const nScoopOn = w > K.real0 + 0.15 && w < K.hit;
  scoopN.visible = nScoopOn; scoopN.position.copy(hn).add(scoopOff);
  // flock
  for (const F of FLOCK) { const s = flockAt(F, w); F.p.root.visible = s.vis; if (s.vis) F.p.set(s); }
  if (w >= K.hit && w < K.gulpEnd + 0.1) { const tp = headF.p.tipWorld(); scoopN.visible = true; scoopN.position.copy(tp).add(V(0, -0.03, 0)); scoopN.scale.setScalar(Math.max(0.01, 0.8 * (1 - sstep(K.gulpEnd - 0.45, K.gulpEnd, w)))); }
  else scoopN.scale.setScalar(1);
  // ghosts + dots in the first slow motion
  const sl = sstep(T.slow1a, T.slow1a + 0.4, t) * (1 - sstep(T.slow1b - 0.4, T.slow1b, t));
  GHOSTS.forEach((g, k) => { const gw = w - (k + 1) * 0.035; const on = sl > 0.01 && gw > W.launch3 && gw < W.perch3; g.root.visible = on; if (on) { g.set(p1At(gw, filmAt(gw))); g.root.traverse((o) => { if (o.isMesh) o.material.opacity = 0.3 * (1 - (k + 1) / 7) * sl; }); } });
  DOTS.forEach((d, i) => { const on = sl > 0.01; d.visible = on; if (on) d.material.opacity = 0.85 * sl * clamp((w - W.launch3) / (W.grab3 - W.launch3) * 26 - i + 2, 0, 1); });
  // bulb
  const bu = w - K.eureka; bulb.visible = bu > 0 && w < K.bulbOff;
  if (bulb.visible) { const s = clamp(bu / 0.12, 0, 1) * (1 + 0.3 * Math.exp(-bu * 7) * Math.sin(bu * 30)) * (1 - sstep(K.bulbOff - 0.25, K.bulbOff, w)); bulb.position.copy(MAN.headWorld(V(0, 0.48, 0))); bulb.scale.setScalar(Math.max(0.01, s)); bulb.userData.rays.rotation.z = bu * 1.5; bulb.userData.rays.scale.setScalar(0.85 + 0.2 * Math.sin(bu * 18)); }
  // dizzy stars
  const st = w > W.bonk4 && w < K.getUp + 0.3;
  stars.forEach((s, i) => { s.visible = st; if (st) { const a = w * 5 + i * Math.PI / 2; const c = P1.tipWorld().add(V(0, 0.07, -0.08)); s.position.set(c.x + Math.cos(a) * 0.09, c.y + 0.03 * Math.sin(a * 2), c.z + Math.sin(a) * 0.09); s.rotation.set(0, a, a); } });
  // sweat
  const sw = w - K.sweat; sweat.visible = sw > 0 && w < K.hit; if (sweat.visible) { sweat.position.copy(MAN.headWorld(V(0.19, 0.12 - 0.08 * sstep(0, 0.8, sw), 0.12))); sweat.scale.setScalar(clamp(sw / 0.1, 0, 1)); }
  // feather burst when the flock lands
  const fa = w - K.hit;
  feathers.forEach((f) => { const on = fa > -0.05 && fa < 5; f.m.visible = on; if (!on) return; const a = Math.max(0, fa); const out = f.v * (1 - Math.exp(-a * 3)) / 3 * 2.4;
    f.m.position.set(MX + Math.cos(f.a) * (0.15 + out) * 1.0 + 0.04 * Math.sin(a * 3 + f.ph), 0.95 + Math.sin(f.el) * out * 0.8 - 0.12 * a + 0.03 * Math.sin(a * 4 + f.ph), 0.2 + Math.sin(f.a) * (0.12 + out) * 0.6);
    f.m.position.y = Math.max(0.01, f.m.position.y); f.m.rotation.set(f.sp * a * 0.3 + f.ph, f.sp * a * 0.2, 0.6 * Math.sin(a * 3 + f.ph)); f.m.scale.setScalar(Math.min(1, a / 0.05 + 0.2)); });
  // camera
  const c = camAt(t);
  { const k = bump(t, 27.7, 30.3, 0.4); if (k > 0) c.tgt.lerp(p.pos.clone().add(V(0, 0.12, 0)), 0.85 * k); }
  camera.position.copy(c.pos); camera.lookAt(c.tgt); camera.fov = c.fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  // sun follows the focus; the flock's shadow passes
  const focus = c.tgt.clone(); focus.y = Math.min(focus.y, 1.4);
  sun.target.position.copy(focus); sun.position.copy(focus).add(V(-2.4, 6.2, 4.0));
  const ext = c.fov > 44 ? 3.6 : 2.4; Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext }); sun.shadow.camera.updateProjectionMatrix();
  const shade = bump(t, T.shade0, T.shade1, 0.25); sun.intensity = 2.4 * (1 - 0.6 * shade); hemi.intensity = 1.25 * (1 - 0.25 * shade);
  POST = { fade: sstep(0, 0.35, t) * (1 - sstep(T.fade, DUR - 0.05, t)), flash: 0.12 * Math.max(0, 1 - Math.abs(t - T.eureka) / 0.12) };
}
function subframes(t) { const near = (x, a, b) => t > x - a && t < x + b; return near(T.grab1, 0.25, 0.25) || near(T.grab2, 0.25, 0.25) || near(T.grab4, 0.2, 0.1) || near(T.hit, 0.6, 0.05) ? 3 : 1; }

// ---------- post: MSAA, gentle halation, filmic curve, soft vignette. No grain. ----------
const rtScene = new THREE.WebGLRenderTarget(W0, HH, { type: THREE.HalfFloatType, depthBuffer: true, samples: 4 });
const rtAcc = new THREE.WebGLRenderTarget(W0, HH, { type: THREE.HalfFloatType, depthBuffer: false });
const mk = (w, h) => new THREE.WebGLRenderTarget(Math.max(2, w), Math.max(2, h), { type: THREE.HalfFloatType, depthBuffer: false });
const lw = Math.round(W0 / 4), lh = Math.round(HH / 4);
const rA = [mk(lw, lh), mk(lw >> 1, lh >> 1), mk(lw >> 2, lh >> 2)], rB = [mk(lw, lh), mk(lw >> 1, lh >> 1), mk(lw >> 2, lh >> 2)];
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); const quadScene = new THREE.Scene(); quadScene.add(quad);
const VQ = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0);} `;
const accMat = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null }, uW: { value: 1 } }, vertexShader: VQ, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false,
  fragmentShader: `uniform sampler2D tSrc; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor=vec4(texture2D(tSrc,vUv).rgb*uW,1.0);} ` });
const brightMat = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null } }, vertexShader: VQ,
  fragmentShader: `uniform sampler2D tSrc; varying vec2 vUv; void main(){ vec3 c=texture2D(tSrc,vUv).rgb; float l=dot(c,vec3(0.3,0.55,0.15)); gl_FragColor=vec4(c*smoothstep(1.1,1.9,l),1.0);} ` });
const blurMat = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } }, vertexShader: VQ,
  fragmentShader: `uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv; void main(){ vec3 s=texture2D(tSrc,vUv).rgb*0.2270;
    s+=(texture2D(tSrc,vUv+uDir*1.3846).rgb+texture2D(tSrc,vUv-uDir*1.3846).rgb)*0.3162; s+=(texture2D(tSrc,vUv+uDir*3.2308).rgb+texture2D(tSrc,vUv-uDir*3.2308).rgb)*0.0703; gl_FragColor=vec4(s,1.0);} ` });
const copyMat = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null } }, vertexShader: VQ, fragmentShader: `uniform sampler2D tSrc; varying vec2 vUv; void main(){ gl_FragColor=texture2D(tSrc,vUv);} ` });
const finalMat = new THREE.ShaderMaterial({
  uniforms: { tScene: { value: null }, tB0: { value: null }, tB1: { value: null }, tB2: { value: null }, uFade: { value: 1 }, uFlash: { value: 0 } },
  vertexShader: VQ,
  fragmentShader: `uniform sampler2D tScene,tB0,tB1,tB2; uniform float uFade,uFlash; varying vec2 vUv;
  void main(){
    vec3 c=texture2D(tScene,vUv).rgb;
    vec3 hal=texture2D(tB0,vUv).rgb*0.5+texture2D(tB1,vUv).rgb*0.7+texture2D(tB2,vUv).rgb*0.9;
    c+=hal*vec3(1.0,0.8,0.55)*0.18; c+=vec3(1.0)*uFlash;
    c=1.22*c/(1.0+0.32*c);
    c=pow(clamp(c,0.0,1.0),vec3(1.0/2.2));
    float l=dot(c,vec3(0.3,0.55,0.15));
    c=mix(c*vec3(0.97,0.99,1.04),c*vec3(1.03,1.0,0.96),smoothstep(0.3,0.8,l));
    c=mix(vec3(l),c,1.1);
    vec2 v=(vUv-0.5)*vec2(1.0,1.1); c*=1.0-0.16*smoothstep(0.45,0.95,length(v)*1.25);
    c*=uFade; gl_FragColor=vec4(clamp(c,0.0,1.0),1.0);
  }`,
});
function pass(mat, target) { quad.material = mat; renderer.setRenderTarget(target); renderer.render(quadScene, quadCam); }
function pyramid(src, A, Bq, firstMat) {
  for (let i = 0; i < 3; i++) {
    if (i === 0) { const m = firstMat || copyMat; m.uniforms.tSrc.value = src; pass(m, A[0]); }
    else { copyMat.uniforms.tSrc.value = A[i - 1].texture; pass(copyMat, A[i]); }
    const w = A[i].width, h = A[i].height;
    blurMat.uniforms.tSrc.value = A[i].texture; blurMat.uniforms.uDir.value.set(1 / w, 0); pass(blurMat, Bq[i]);
    blurMat.uniforms.tSrc.value = Bq[i].texture; blurMat.uniforms.uDir.value.set(0, 1 / h); pass(blurMat, A[i]);
  }
}
const SUB = QS.get('sub');
function render(t) {
  t = clamp(t, 0, DUR - 1e-4);
  const N = SUB ? +SUB : subframes(t); let src;
  if (N <= 1) { setup(t); renderer.setRenderTarget(rtScene); renderer.setClearColor(0xbfe3ff, 1); renderer.render(scene, camera); src = rtScene.texture; }
  else {
    renderer.setRenderTarget(rtAcc); renderer.setClearColor(0, 1); renderer.clear();
    for (let k = 0; k < N; k++) {
      const ts = clamp(t - 1 / 96 + (k + 0.5) / N / 48, 0, DUR - 1e-4);
      setup(ts); renderer.setRenderTarget(rtScene); renderer.setClearColor(0xbfe3ff, 1); renderer.render(scene, camera);
      accMat.uniforms.tSrc.value = rtScene.texture; accMat.uniforms.uW.value = 1 / N; quad.material = accMat;
      renderer.setRenderTarget(rtAcc); renderer.autoClear = false; renderer.render(quadScene, quadCam); renderer.autoClear = true;
    }
    src = rtAcc.texture; setup(t);
  }
  pyramid(src, rA, rB, brightMat);
  const fu = finalMat.uniforms; fu.tScene.value = src; fu.tB0.value = rA[0].texture; fu.tB1.value = rA[1].texture; fu.tB2.value = rA[2].texture;
  fu.uFade.value = POST.fade; fu.uFlash.value = POST.flash; pass(finalMat, null);
}
window.DUR = DUR; window.render = render;
window.grabPNG = (t) => { render(t); return canvas.toDataURL('image/png').split(',')[1]; };
window.grab = (t) => { render(t); return canvas.toDataURL('image/jpeg', 0.95).split(',')[1]; };
render(0);
window.READY = true;
