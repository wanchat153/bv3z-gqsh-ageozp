// cues.js — ONE timeline for picture (anim.js/scene.js), the Python light pass (light.py reads out/info + mask passes from grab.mjs) and sound (sfx.py reads cues.json from `node dump_cues.js`).
// "The paper bird" (นกกระดาษบินได้): 10 s, 600 frames, fixed room, camera pushes in on the samurai's hands while he folds, pulls back when he blows the bird away. No slow motion (video t == world w).
// Story: the samurai folds a sheet into a paper bird in 5 clear stages (square -> triangle -> kite -> folded head -> wings), Mochi watches wide-eyed. He lays it on his palm and blows: it flies; Mochi hops to catch it and misses;
// it circles the room and lands on her TAIL. She turns to see (two hop-turns after her own tail, the bird flutters from tail to tail), the samurai laughs (shoulder shake), her wagging tail flings the bird up, it glides back into his palm.
// World cm: u right, h up, q toward camera. Screen = [OX+u*S, Y0+q*DQ*S-h*S] (world px) then the camera (cx,cy,zoom) of camAt(w).
const CUE = (function () {
  const T = 10, FPS = 60;
  const S = 13.5, OX = 540, Y0 = 1400, DQ = 0.6;
  const P = (u, h, q = 0) => [OX + u * S, Y0 + q * DQ * S - h * S];
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const sstep = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const hash = (...a) => { let x = Math.sin(a.reduce((s, v, i) => s + (i + 1) * 12.9898 * v, 78.233)) * 43758.5453; return x - Math.floor(x); };
  function KS(keys, t) {                                                                  // Hermite spline through keys [t, v]; zero tangent where a neighbour repeats the value (a real rest)
    const n = keys.length; if (t <= keys[0][0]) return keys[0][1]; if (t >= keys[n - 1][0]) return keys[n - 1][1];
    let i = 1; while (i < n - 1 && t > keys[i][0]) i++;
    const a = keys[i - 1], b = keys[i], dt = b[0] - a[0], u = (t - a[0]) / dt, u2 = u * u, u3 = u2 * u;
    const tan = (k) => { const p = keys[k], q = keys[k - 1], r = keys[k + 1]; if (!q || !r) return 0; if (p[1] === q[1] || p[1] === r[1]) return 0; return (r[1] - q[1]) / (r[0] - q[0]); };
    return (2 * u3 - 3 * u2 + 1) * a[1] + (u3 - 2 * u2 + u) * dt * tan(i - 1) + (-2 * u3 + 3 * u2) * b[1] + (u3 - u2) * dt * tan(i);
  }
  const wOf = (t) => t, tOf = (w) => w, W_END = T;
  // ---- places (cm)
  const SQ = 14, MQ = 15.4, WALL_Y = 1380;
  const SAM_U = -11, MOC_U = 7;
  // ---- camera: wide -> push in on the folding hands -> pull back for the flight
  const CX = [[0, 540], [0.25, 540], [1.0, 495], [3.7, 495], [4.5, 540], [10, 540]], CY = [[0, 1401], [0.25, 1401], [1.0, 1378], [3.7, 1378], [4.5, 1401], [10, 1401]], CZ = [[0, 1.85], [0.25, 1.85], [1.0, 2.5], [3.7, 2.5], [4.5, 1.85], [10, 1.85]];
  const camAt = (w) => [KS(CX, w), KS(CY, w), KS(CZ, w)];
  // ---- the fold sequence (sheet units: D = 1 = half diagonal of the diamond; y down). Each fold: [t0, t1, crease p0, crease p1, side (+1/-1 = which half moves)]
  const R2 = Math.SQRT1_2;
  const FOLDS = [
    { t0: 0.55, t1: 1.15, p0: [0, 0], n: [0, 1] },                                                        // 1: bottom corner up -> triangle (crease along the horizontal diagonal)
    { t0: 1.40, t1: 1.95, p0: [0, 0], n: [-R2, R2] },                                                     // 2a: left corner to the apex (crease y=x)
    { t0: 2.00, t1: 2.55, p0: [0, 0], n: [R2, R2] },                                                      // 2b: right corner to the apex (crease y=-x) -> kite
    { t0: 2.75, t1: 3.20, p0: [0, -0.7], n: [0, -1] },                                                    // 3: the tip folds down = head
  ];
  const WING = [[0, 0], [3.25, 0], [3.65, 1], [10, 1]];                                                   // 4: wings pulled up (0..1 of the dihedral)
  const ORI = [[0, 0], [3.45, 0], [4.15, 1], [10, 1]];                                                   // face-on (0) -> flat in the air (1): the sheet is tilted down onto his palm
  const HOLD = [[0, 0], [3.35, 0], [4.15, 1], [4.45, 1], [4.62, 0], [9.2, 0], [9.55, 1], [10, 1]];       // 0 = belly (two hands), 1 = on the front palm
  // ---- the bird's flight: keyframes in cm [t, u, h, q]; first/last keys are replaced at runtime by the real palm / tail anchors
  const FLY = [[4.45, 0, 0, 0], [4.75, -0.4, 15, 14], [5.10, 2.8, 26, 13], [5.40, 4.4, 34, 12], [5.70, 1.0, 37, 10], [6.0, -6.0, 33, 8], [6.25, -9.0, 27, 7], [6.5, -5.0, 23, 8], [6.75, 2.0, 27, 9], [6.95, 9.5, 24, 10], [7.0, 0, 0, 0]];
  const GLIDE = [[8.65, 0, 0, 0], [8.85, 14, 20, 11], [9.05, 12, 29, 10], [9.3, 5, 31, 9], [9.5, -2, 22, 11], [9.7, 0, 0, 0]];
  // heading yaw (rad, unwrapped; 0 = flying right, pi = left, via +q = toward the camera), nose pitch from the velocity is added in anim.js
  const YAW = [[4.45, 0], [5.55, 0], [6.0, Math.PI], [6.3, Math.PI], [6.8, 2 * Math.PI], [7.2, 2 * Math.PI], [8.65, 2 * Math.PI], [8.8, 2 * Math.PI], [9.15, 3 * Math.PI], [9.7, 3 * Math.PI]];
  const FLAP = [[0, 0], [4.4, 0], [4.55, 1], [6.9, 1], [7.05, 0.15], [8.5, 0.15], [8.6, 1], [9.35, 1], [9.6, 0.1], [10, 0.1]];   // flap amplitude 0..1
  // ---- Mochi's leap to catch it (and miss), the two hop-turns after her tail, the shake of the samurai
  const LEAP = { w0: 5.0, T: 0.30, h: 9.0 };                                                              // crouch from w0-0.16, flight w0..w0+T, landing squash to w0+T+0.14
  const FLIPS = [7.5, 8.05];                                                                              // hop-turn instants (face toggles, width dips to 0.7)
  const FACE = (w) => (w < FLIPS[0] ? -1 : w < FLIPS[1] ? 1 : -1);
  const LAUGH = [[0, 0], [7.55, 0], [7.7, 1], [8.7, 1], [8.9, 0], [10, 0]];                               // the samurai's shoulder shake
  const LOOKUP = [[0, 0], [4.6, 0], [4.8, 1], [6.9, 1], [7.1, 0], [10, 0]];                              // Mochi follows the bird
  const events = [];
  const add = (w, type, u = 0, a = 1, o = {}) => events.push(Object.assign({ w, type, u, a }, o));
  add(0.20, 'grab', -11, 0.3);
  add(0.72, 'fold', -11, 0.8); add(1.12, 'crease', -11, 0.7);
  add(1.58, 'fold', -11, 0.7); add(1.92, 'crease', -11, 0.6);
  add(2.15, 'fold', -11, 0.7); add(2.52, 'crease', -11, 0.6);
  add(2.88, 'fold', -11, 0.6); add(3.18, 'crease', -11, 0.7);
  add(3.30, 'wings', -11, 0.8, { dur: 0.35 }); add(3.9, 'lift', -8, 0.5);
  add(4.28, 'inhale', -10, 0.8, { dur: 0.3 }); add(4.45, 'blow', -6, 1.0); add(4.48, 'launch', -3, 0.9);
  for (let w = 4.6; w < 6.95; w += 0.19) add(w, 'flap', 0, 0.3 + 0.2 * hash(w), { u: clamp(-9 + (w - 4.6) * 4, -9, 8) });
  add(4.85, 'ears', 7, 0.6); add(4.98, 'crouch', 7, 0.7); add(5.02, 'hop', 7, 1.0); add(5.30, 'swipe', 5, 0.8); add(5.38, 'mew', 7, 0.7); add(5.46, 'land', 7, 1.0);
  add(7.0, 'perch', 12, 0.8); add(7.1, 'gasp', 7, 0.8); add(7.2, 'ears', 7, 0.7);
  add(7.5, 'hop', 7, 0.8); add(7.52, 'flutter', 7, 0.6); add(7.76, 'perch', 6, 0.6);
  for (const w of [7.68, 7.84, 8.0, 8.16, 8.32]) add(w, 'giggle', -11, 0.7, { f: 700 + 120 * hash(w) });
  add(8.05, 'hop', 7, 0.8); add(8.07, 'flutter', 7, 0.6); add(8.3, 'perch', 12, 0.6);
  add(8.36, 'wag', 12, 0.7, { dur: 0.3 }); add(8.65, 'fling', 12, 1.0); add(8.7, 'mew', 7, 0.6);
  add(9.7, 'catch', -4, 0.8); add(9.78, 'sigh', -11, 0.5); add(9.86, 'mew', 7, 0.6);
  const evs = () => events.filter((e) => e.w < W_END).map((e) => Object.assign({}, e, { t: e.w, slow: 0 })).sort((a, b) => a.t - b.t);
  return { T, FPS, S, OX, Y0, DQ, P, clamp, sstep, lerp, hash, KS, wOf, tOf, W_END, SQ, MQ, WALL_Y, SAM_U, MOC_U, camAt, FOLDS, WING, ORI, HOLD, FLY, GLIDE, YAW, FLAP, LEAP, FLIPS, FACE, LAUGH, LOOKUP, events: evs };
})();
if (typeof module !== 'undefined') module.exports = CUE;
