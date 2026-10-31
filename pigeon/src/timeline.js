// Pigeon vs Ice Cream — one timeline for picture and sound.
// Beats are authored in FILM time (seconds of the video). Everything that moves runs on WORLD time
// w = tau(t), so the two slow-motion windows slow the man, the birds and the clock together.
export const FPS = 24;
export const S1 = 0.07;   // slow motion 1: the third steal (the clue)
export const S2 = 0.25;   // slow motion 2: the decoy drop

// slow-motion windows (film time)
const SL = { a1: 12.7, b1: 18.0, a2: 27.25, b2: 30.15 };
const ramp = (a, b, u) => a + (b - a) * (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, u)))) / 2;
function rate(t) {
  if (t < SL.a1) return 1; if (t < SL.a1 + 0.25) return ramp(1, S1, (t - SL.a1) / 0.25);
  if (t < SL.b1) return S1; if (t < SL.b1 + 0.4) return ramp(S1, 1, (t - SL.b1) / 0.4);
  if (t < SL.a2) return 1; if (t < SL.a2 + 0.2) return ramp(1, S2, (t - SL.a2) / 0.2);
  if (t < SL.b2) return S2; if (t < SL.b2 + 0.3) return ramp(S2, 1, (t - SL.b2) / 0.3);
  return 1;
}
export const rateAt = rate;
const STEP = 1 / 600, TAB = [0], MAXT = 60;
for (let i = 1; i <= MAXT / STEP + 2; i++) TAB.push(TAB[i - 1] + rate((i - 0.5) * STEP) * STEP);
export const tau = (t) => { const f = Math.max(0, t) / STEP; const i = Math.min(TAB.length - 2, Math.floor(f)); return TAB[i] + (TAB[i + 1] - TAB[i]) * (f - i); };
export const filmAt = (w) => { let lo = 0, hi = MAXT; for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (tau(m) < w) lo = m; else hi = m; } return lo; };

// ---- the four flights of the pigeon, in WORLD time ----
const DIVE = 0.5, BACK = 0.65;
export const W = {};
W.launch1 = 2.5; W.grab1 = W.launch1 + DIVE; W.perch1 = W.grab1 + BACK;
W.launch2 = 7.6; W.grab2 = W.launch2 + DIVE; W.perch2 = W.grab2 + BACK;
W.launch3 = tau(12.62); W.grab3 = W.launch3 + DIVE; W.perch3 = W.grab3 + BACK;
W.launch4 = tau(26.6); W.grab4 = W.launch4 + 0.48; W.top4 = W.grab4 + 0.38; W.bonk4 = W.top4 + Math.sqrt(2 * 1.62 / 9.8) + 0.02;

const F = (w) => filmAt(w);
const B = F(W.bonk4); // the decoy lands: everything after is timed from here

// ---- authored beats (film time) ----
export const T = {
  open: 0,
  lick1: 2.2, grab1: F(W.grab1), stare1: 3.25, lookUp1: 4.0, gulp1: 4.25,
  reach2: 5.3, new2: 5.95, lookA: 6.35, lookB: 6.85, lick2: 7.45, grab2: F(W.grab2), gulp2: 9.15, fist: 8.45, fistEnd: 9.9,
  reach3: 10.3, new3: 10.95, glare: 11.3, lick3: 12.5, launch3: 12.62, slow1a: SL.a1, grab3: F(W.grab3), slow1b: SL.b1, perch3: F(W.perch3),
  wake3: 18.55, gulp3: 19.1,
  test1: 19.75, test1o: 20.15, test2: 20.5, test2o: 20.85, eureka: 21.25, bulbOff: 22.35,
  stone0: 22.5, stone1: 23.1, stone2: 23.6, dip0: 23.9, dip1: 24.45, plop: 23.75,
  real0: 25.25, real1: 25.75,
  raise: 26.0, bait: 26.45, launch4: 26.6, grab4: F(W.grab4), slow2a: SL.a2, top4: F(W.top4), bonk: B, slow2b: SL.b2,
  grin: B + 0.55, reveal: B + 0.95, bliss0: B + 1.55, bliss1: B + 3.3,
  getUp: B + 1.7, whistle: B + 2.35,
  flockIn: B + 2.55, flockLand: B + 3.6, shade0: B + 2.75, shade1: B + 3.5,
  eyesOpen: B + 3.35, lookUp: B + 3.75, crane0: B + 3.85, snap: B + 5.0, sweat: B + 5.35, crane1: B + 5.4,
  dive: B + 5.9, hit: B + 6.6,
  tableau: B + 7.1, gulpEnd: B + 8.6, deadpan1: B + 8.9, deadpan2: B + 10.6, fade: B + 11.4,
};
export const DUR = +(B + 12.5).toFixed(3);
// beats in WORLD time, for the choreography
export const K = {}; for (const k in T) K[k] = tau(T[k]);
Object.assign(K, { grab1: W.grab1, grab2: W.grab2, grab3: W.grab3, grab4: W.grab4, bonk: W.bonk4, perch3: W.perch3 });

// sound events (film time)
export const EV = [
  ...[1, 2, 3, 4].map((i) => ({ t: F(W['launch' + i]), type: 'launch', i })),
  ...[1, 2, 3, 4].map((i) => ({ t: F(W['grab' + i]), type: 'grab', i })),
  ...[1, 2, 3].map((i) => ({ t: F(W['perch' + i]), type: 'perch', i })),
  { t: T.gulp1, type: 'gulp' }, { t: T.gulp2, type: 'gulp' }, { t: T.gulp3, type: 'gulp' },
  { t: T.lick1, type: 'lick' }, { t: T.lick2, type: 'lick' }, { t: T.lick3, type: 'lick' },
  { t: T.new2, type: 'cooler' }, { t: T.new3, type: 'cooler' }, { t: T.dip0, type: 'dip' }, { t: T.real0, type: 'cooler' },
  { t: T.fist, type: 'grumble' }, { t: T.eureka, type: 'eureka' }, { t: T.plop, type: 'plop' },
  { t: T.bonk, type: 'bonk' }, { t: T.whistle, type: 'whistle' }, { t: T.flockLand, type: 'flock' },
  { t: T.snap, type: 'snap' }, { t: T.hit, type: 'hit' },
];
export const SLOW = SL;
