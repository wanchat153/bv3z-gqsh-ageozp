// Shot list and story beats (film seconds). 30 fps, vertical 1080x1920.
export const FPS = 30;
const S = [
  ['harbour', 4.0], ['stern', 3.2], ['gundeck', 3.0], ['test', 4.4], ['admiral', 3.4], ['depart', 4.0], ['gust1', 3.0], ['gust2', 2.2],
  ['ports', 1.6], ['flood', 1.4], ['sink', 4.8], ['shock', 2.0], ['inquiry', 3.0], ['seabed', 4.4], ['salvage', 4.4], ['museum', 5.2],
];
const list = []; let t = 0; for (const [stage, d] of S) { list.push({ stage, t0: +t.toFixed(3), t1: +(t + d).toFixed(3) }); t += d; }
const at = (n) => list.find((s) => s.stage === n);
export const DUR = +t.toFixed(3);
const T = {
  test0: at('test').t0 + 0.2, test1: at('test').t1 - 0.4,
  stop: at('admiral').t0 + 0.1, go: at('admiral').t0 + 2.4,
  depart: at('depart').t0 + 0.4, gust1: at('gust1').t0 + 0.5, gust2: at('gust2').t0 + 0.3,
  flood: at('ports').t0 + 0.2, sink0: at('sink').t0 + 0.2, sink1: at('sink').t1 - 0.4,
  gavel: at('inquiry').t0 + 2.0, worm: at('seabed').t0 + 1.5, rise: at('salvage').t0, museum: at('museum').t0,
};
export const SHOTS = { list, T };
