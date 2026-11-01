// The Lift — one timeline for picture and sound. World time (tau) slows during the "clue" so the drifting
// leaf reads, then speeds back up. Everything downstream is a pure function of film time t.
export const DUR = 26.0;
export const G = 9.8;
export const SLOW = 0.16;           // slow-motion rate during the clue

// Door openness is authored as keyframes in film.js; these are the story beats it (and the sound) key off.
export const T = {
  // --- hook: he strolls in, the doors start to close, he bolts ---
  walkIn0: 0.2, notice: 1.35, run: 1.8,
  // --- setback 1: he jams an arm in; the sensor bounces the doors open ---
  d1close0: 1.5, d1shut: 2.35, d1lunge: 2.35, d1open1: 3.05,
  stepIn0: 3.15, stepIn1: 3.95,
  // --- setback 2: doors close on his dangling scarf, bounce open ---
  d2close0: 4.15, d2catch: 4.9, d2open1: 5.4,
  yank: 5.45, yankDone: 5.95,
  // --- setback 3: a drifting leaf crosses the sensor, bounce open ---
  d3close0: 6.1, leaf1: 6.85, d3open1: 7.35,
  baffled: 7.5,
  // a second stray leaf reopens them once more (rule of three lands)
  d4close0: 8.1, leaf2: 8.8, d4open1: 9.3,
  lookUp: 9.6,
  // --- clue in slow motion: one leaf drifts down across the beam ---
  slowin: 10.6, leafSlow0: 10.9, leafSlowCross: 13.2, realize: 13.9, slowout: 14.8,
  // --- idea: he spots the plant and plucks the loose sprig ---
  think: 15.2, eureka: 16.1, reach0: 16.4, pluck: 17.3, back0: 17.6, back1: 18.2,
  // --- payoff: the doors finally glide shut ---
  dFinal0: 18.5, dFinalShut: 19.9, exhale: 20.1,
  // --- twist + deadpan: a ding, the doors reopen on an identical lobby, a leaf drifts ---
  ding: 21.6, reveal: 21.75, leafTwist: 22.6, deadpan: 23.3, fade: 24.9,
};

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const ramp = (a, b, u) => a + (b - a) * (1 - Math.cos(Math.PI * clamp(u, 0, 1))) / 2;
function rate(t) {
  if (t < T.slowin) return 1;
  if (t < T.slowin + 0.4) return ramp(1, SLOW, (t - T.slowin) / 0.4);
  if (t < T.slowout) return SLOW;
  if (t < T.slowout + 0.5) return ramp(SLOW, 1, (t - T.slowout) / 0.5);
  return 1;
}
export const rateAt = rate;
const STEP = 1 / 600, TAB = [0];
for (let i = 1; i <= DUR / STEP + 2; i++) TAB.push(TAB[i - 1] + rate((i - 0.5) * STEP) * STEP);
export const tau = (t) => { const f = Math.max(0, t) / STEP; const i = Math.min(TAB.length - 2, Math.floor(f)); return TAB[i] + (TAB[i + 1] - TAB[i]) * (f - i); };

// sound event table (consumed by mix.py via events.json)
export const EV = [
  { t: T.walkIn0 + 0.15, type: 'step' }, { t: T.walkIn0 + 0.55, type: 'step' }, { t: T.walkIn0 + 0.95, type: 'step' },
  { t: T.d1close0, type: 'motor', d: T.d1shut - T.d1close0 },
  { t: T.run, type: 'run', d: T.d1lunge - T.run },
  { t: T.d1shut, type: 'bump' }, { t: T.d1shut + 0.04, type: 'beep' }, { t: T.d1open1, type: 'motor', d: 0.4 },
  { t: T.stepIn0 + 0.1, type: 'step' }, { t: T.stepIn0 + 0.45, type: 'step' },
  { t: T.d2close0, type: 'motor', d: T.d2catch - T.d2close0 }, { t: T.d2catch, type: 'bump' }, { t: T.d2catch + 0.04, type: 'beep' }, { t: T.yank, type: 'whip' }, { t: T.d2open1, type: 'motor', d: 0.4 },
  { t: T.d3close0, type: 'motor', d: T.leaf1 - T.d3close0 }, { t: T.leaf1, type: 'leaf' }, { t: T.leaf1 + 0.02, type: 'beep' }, { t: T.d3open1, type: 'motor', d: 0.4 },
  { t: T.d4close0, type: 'motor', d: T.leaf2 - T.d4close0 }, { t: T.leaf2, type: 'leaf' }, { t: T.leaf2 + 0.02, type: 'beep' }, { t: T.d4open1, type: 'motor', d: 0.4 },
  { t: T.slowin, type: 'slowin' }, { t: T.leafSlowCross, type: 'beep' }, { t: T.realize, type: 'ting' }, { t: T.slowout, type: 'slowout' },
  { t: T.eureka, type: 'idea' }, { t: T.pluck, type: 'pluck' },
  { t: T.dFinal0, type: 'motor', d: T.dFinalShut - T.dFinal0 }, { t: T.dFinalShut, type: 'latch' }, { t: T.exhale, type: 'exhale' },
  { t: T.ding, type: 'ding' }, { t: T.reveal, type: 'motor', d: 0.5 }, { t: T.leafTwist, type: 'leaf' }, { t: T.deadpan, type: 'deadpan' },
];
