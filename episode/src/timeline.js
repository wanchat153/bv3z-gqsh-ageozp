// One timeline for picture and sound. World time (tau) runs slow while the cat falls.
export const DUR = 45.0;
export const T = {
  fly: 1.2,        // the butterfly flutters in
  land: 2.4,       // ...and lands on the cat's nose
  twitch: 2.8,
  sneeze: 3.6,
  slide: 3.8,      // the cat slides toward the edge
  off: 4.4,        // over the edge
  orbit: 5.5,      // camera circles the falling cat
  dive: 21.8,      // camera dives into the ear
  inner: 22.9,     // inside: the balance organ
  out: 29.3,       // back out
  swoop: 30.2,     // camera drops ahead of the cat
  pan: 33.6,       // over to the pup on the wall
  dogLie: 35.0,
  dogRoll: 37.4,
  catWalk: 39.2,
  fade: 44.2,
};
export const LEDGE_Y = 4.0;   // top of the balustrade
export const CAT_Y0 = LEDGE_Y + 0.115;
export const S1 = 0.0183, S2 = 0.0015;
const ramp = (a, b, u) => a + (b - a) * (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, u)))) / 2;
function rate(t) {
  if (t < 4.45) return 1; if (t < 4.65) return ramp(1, S1, (t - 4.45) / 0.2);
  if (t < 21.8) return S1; if (t < 22.6) return ramp(S1, S2, (t - 21.8) / 0.8);
  if (t < 29.4) return S2; if (t < 30.2) return ramp(S2, S1, (t - 29.4) / 0.8);
  if (t < 30.8) return S1; if (t < 31.8) return ramp(S1, 1, (t - 30.8) / 1.0); return 1;
}
const STEP = 1 / 600, TAB = [0];
for (let i = 1; i <= DUR / STEP + 2; i++) TAB.push(TAB[i - 1] + rate((i - 0.5) * STEP) * STEP);
export const tau = (t) => { const f = Math.max(0, t) / STEP; const i = Math.min(TAB.length - 2, Math.floor(f)); return TAB[i] + (TAB[i + 1] - TAB[i]) * (f - i); };
export const filmAt = (w) => { let lo = 0, hi = DUR; for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (tau(m) < w) lo = m; else hi = m; } return lo; };
export const FALL_T = Math.sqrt(2 * (CAT_Y0 - 0.255) / 9.8);      // world seconds from the edge to the lawn
export const TAU_OFF = T.off;                                     // tau == t before the slow-down
export const T_LAND = filmAt(TAU_OFF + FALL_T);                   // film time of the landing
export const EV = [
  { t: T.fly, type: 'flutter' }, { t: T.land, type: 'flutterland' }, { t: T.sneeze, type: 'sneeze' }, { t: T.slide, type: 'slide' },
  { t: T.off, type: 'off' }, { t: T.dive, type: 'dive' }, { t: T.inner, type: 'inner' }, { t: T.out, type: 'out' },
  { t: T_LAND, type: 'land' }, { t: T.dogRoll, type: 'dogroll' },
];
