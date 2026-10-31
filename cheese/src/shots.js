// Shot list (film seconds), 30 fps, 1080x1920. Each shot names its transition out (in-camera, per the reference benchmark).
export const FPS = 30;
const S = [
  ['dairy', 4.0, 'push'], ['problem', 3.6, 'page'], ['cows1', 1.2, 'cut'], ['street', 3.4, 'column'], ['lobby', 3.6, 'push'], ['door', 2.4, 'light'],
  ['cathedral', 4.8, 'cut'], ['money', 2.4, 'cut'], ['cows2', 1.4, 'cut'], ['aging', 4.2, 'lightsout'], ['sneak', 3.0, 'cut'], ['loading', 3.8, 'roll'],
  ['caught', 3.6, 'flash'], ['later', 4.4, 'continue'], ['rise', 3.8, 'end'],
];
const list = []; let t = 0; for (const [stage, d, out] of S) { list.push({ stage, out, t0: +t.toFixed(3), t1: +(t + d).toFixed(3) }); t += d; }
export const DUR = +t.toFixed(3);
const at = (n) => list.find((s) => s.stage === n);
export const T = {
  lift: at('dairy').t0 + 1.0, pat: at('dairy').t0 + 2.4, flip0: at('problem').t0 + 0.3, sigh: at('problem').t0 + 2.6, moo1: at('cows1').t0 + 0.3,
  roll0: at('street').t0, tap1: at('lobby').t0 + 0.9, tap2: at('lobby').t0 + 1.3, sniff: at('lobby').t0 + 1.9, stamp: at('lobby').t0 + 2.7,
  spin: at('door').t0 + 0.2, open: at('door').t0 + 0.9, reveal: at('cathedral').t0, bag: at('money').t0 + 0.6, munch: at('cows2').t0 + 0.2,
  lightsout: at('aging').t1 - 0.8, door2: at('sneak').t0 + 0.3, slip: at('loading').t0 + 2.0, siren: at('caught').t0 + 0.2, cut: at('later').t0 + 1.4, bite: at('later').t0 + 2.6,
};
export const SHOTS = { list, T };
