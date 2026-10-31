// One timeline for picture and sound. World time (tau) slows during the third fall and the final fall.
export const DUR = 48.0;
export const TOP0 = 0.75;                 // table top height on the floor
export const LAYER = 0.45, NLAYER = 5;    // crate layers that raise the table to 3.0 m
export const TOP1 = TOP0 + LAYER * NLAYER;
export const TH = 0.024;                  // toast thickness
export const G = 9.8;
export const OMEGA = 6.6;                 // spin a toast picks up tipping off the edge (rad/s)
export const S1 = 0.022, S2 = 0.092;      // slow-motion rates
export const T = {
  // fall A: buttered, placed too near the edge, tips off
  aButter0: 0.5, aButter1: 2.2, aPlace: 2.7, aRel: 3.1,
  // fall B: placed in the middle, a sneeze jolts the table
  bPick: 4.6, bButter0: 5.0, bButter1: 5.8, bPlace: 6.05, bSneeze: 6.45, bRel: 6.8,
  // fall C: a deliberate test push, in slow motion
  cPick: 8.4, cButter0: 8.6, cButter1: 9.1, cPlace: 9.25, cPush: 9.55, cRel: 9.9,
  slow1: 21.4,           // speed back up after the splat
  think: 22.6, eureka: 23.9,
  crates: 25.4,          // first crate layer pops in; one every 0.75 s
  ladder: 29.0, climb: 29.2, onTop: 29.6,
  fPick: 30.0, fButter0: 30.3, fButter1: 30.9, fPlace: 31.05, fLook: 31.3, fPush: 31.6, fRel: 31.9,
  slow2: 39.3,
  dogBack: 40.6, gulp: 41.6, deadpan: 43.0, fade: 46.6,
};
export const layerT = (L) => T.crates + 0.75 * L;
const ramp = (a, b, u) => a + (b - a) * (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, u)))) / 2;
function rate(t) {
  if (t < T.cRel) return 1; if (t < T.cRel + 0.3) return ramp(1, S1, (t - T.cRel) / 0.3);
  if (t < T.slow1) return S1; if (t < T.slow1 + 0.6) return ramp(S1, 1, (t - T.slow1) / 0.6);
  if (t < T.fRel) return 1; if (t < T.fRel + 0.3) return ramp(1, S2, (t - T.fRel) / 0.3);
  if (t < T.slow2) return S2; if (t < T.slow2 + 0.5) return ramp(S2, 1, (t - T.slow2) / 0.5);
  return 1;
}
export const rateAt = rate;
const STEP = 1 / 600, TAB = [0];
for (let i = 1; i <= DUR / STEP + 2; i++) TAB.push(TAB[i - 1] + rate((i - 0.5) * STEP) * STEP);
export const tau = (t) => { const f = Math.max(0, t) / STEP; const i = Math.min(TAB.length - 2, Math.floor(f)); return TAB[i] + (TAB[i + 1] - TAB[i]) * (f - i); };
export const filmAt = (w) => { let lo = 0, hi = DUR; for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (tau(m) < w) lo = m; else hi = m; } return lo; };
// free flight from table height h: time until the toast meets the floor
export const flightT = (h) => Math.sqrt(2 * h / G);
export const FALLS = {
  A: { rel: T.aRel, top: TOP0, x0: 0.515, z: 0.06, vx: 0.28, yaw: 0.25 },
  B: { rel: T.bRel, top: TOP0, x0: 0.52, z: 0.22, vx: 0.85, yaw: -0.35 },
  C: { rel: T.cRel, top: TOP0, x0: 0.515, z: -0.12, vx: 0.48, yaw: 0.1 },
  F: { rel: T.fRel, top: TOP1, x0: 0.515, z: 0.04, vx: 0.5, yaw: -0.15 },
};
for (const k in FALLS) { const f = FALLS[k]; f.w0 = tau(f.rel); f.sL = flightT(f.top); f.land = filmAt(f.w0 + f.sL); f.thL = OMEGA * f.sL; f.up = Math.cos(f.thL) > 0; f.xL = f.x0 + f.vx * f.sL; }
export const EV = [
  { t: T.aButter0, type: 'butter', d: T.aButter1 - T.aButter0 }, { t: FALLS.A.rel - 0.3, type: 'slide' }, { t: FALLS.A.land, type: 'splat' },
  { t: T.bButter0, type: 'butter', d: T.bButter1 - T.bButter0 }, { t: T.bSneeze, type: 'sneeze' }, { t: FALLS.B.land, type: 'splat' },
  { t: T.cButter0, type: 'butter', d: T.cButter1 - T.cButter0 }, { t: T.cPush, type: 'push' }, { t: T.cRel, type: 'slowin' }, { t: FALLS.C.land, type: 'splatslow' },
  { t: T.eureka, type: 'eureka' },
  ...[0, 1, 2, 3, 4].map((L) => ({ t: layerT(L), type: 'crate', L })),
  { t: T.ladder, type: 'ladder' }, { t: T.onTop, type: 'hop' },
  { t: T.fButter0, type: 'butter', d: T.fButter1 - T.fButter0 }, { t: T.fPush, type: 'push' }, { t: T.fRel, type: 'slowin' }, { t: FALLS.F.land, type: 'landup' },
  { t: FALLS.F.land + 0.35, type: 'cheer' }, { t: T.gulp, type: 'gulp' }, { t: T.deadpan, type: 'deadpan' },
];
