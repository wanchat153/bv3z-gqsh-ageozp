// One timeline for picture and sound (seconds of film time). World time runs slow between `slow` and `fast`.
export const DUR = 30.0;
export const T = {
  whistle1: 1.0, whistle2: 2.7,
  cut2: 3.6,       // rail-level, the engine charging at us
  slow: 5.2,       // time starts to stretch
  slowFull: 6.2,
  cut3: 6.8,       // riding beside the driving wheels
  cut3b: 9.4,      // low behind the signalman as the train storms past
  slowEnd: 13.0,
  fast: 13.8,      // back to real time
  cut4: 13.8,      // the gorge from the side
  plunge: 15.87,   // engine front reaches the gap
  imp: 16.77,      // the dynamite car reaches the gap: flash
  pass: 22.87,     // dust wall reaches the signalman
  cam: 23.97,      // dust wall reaches the camera
  lower: 26.3,     // he lowers the lantern
  fade: 28.8,
};
export const V = 20;           // train speed, m/s (world)
export const SLOWV = 4;        // film speed in bullet time (1/5)
export const TRACK_X = -2.0;   // track centreline
export const SIGNAL = [2.6, 0, 0];
export const GAP0 = -62, GAP1 = -72;   // the missing span of the trestle
export const GORGE0 = -44, GORGE1 = -92;
export const BLAST = [TRACK_X, 0, GAP0 - 1];
export const DYN_OFF = 18;     // the dynamite car's front, metres behind the engine's front

// film-speed profile (m/s) and distance travelled by the engine's front
function vAt(t) {
  const ramp = (a, b, u) => a + (b - a) * (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, u)))) / 2;
  if (t < T.slow) return V; if (t < T.slowFull) return ramp(V, SLOWV, t - T.slow);
  if (t < T.slowEnd) return SLOWV; if (t < T.fast) return ramp(SLOWV, V, (t - T.slowEnd) / (T.fast - T.slowEnd)); return V;
}
const STEP = 1 / 480, TABLE = [];
{ let d = 0; for (let i = 0; i <= DUR / STEP + 2; i++) { TABLE.push(d); d += vAt((i + 0.5) * STEP) * STEP; } }
export function dist(t) { const f = Math.max(0, t) / STEP; const i = Math.min(TABLE.length - 2, Math.floor(f)); return TABLE[i] + (TABLE[i + 1] - TABLE[i]) * (f - i); }
export const Z0 = -3 + dist(11.0);           // the engine's front passes z = -3 at t = 11
export const frontZ = (t) => Z0 - dist(t);
export const worldT = (t) => dist(t) / V;     // seconds of world time
export const filmAtFront = (z) => { let lo = 0, hi = DUR; for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; if (frontZ(m) > z) lo = m; else hi = m; } return lo; };

export const EV = [
  { t: T.whistle1, type: 'whistle' }, { t: T.whistle2, type: 'whistle' }, { t: T.slow, type: 'slow' },
  { t: T.plunge, type: 'plunge' }, { t: T.imp, type: 'flash' }, { t: T.imp + 0.22, type: 'boom' },
  { t: T.pass, type: 'wall' }, { t: T.cam, type: 'wallcam' }, { t: T.lower, type: 'lower' },
];
