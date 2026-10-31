// Data-only view of the ฿99 clip timing for tools/events.mjs (the film itself lives in film.js).
import { CUES } from './cues.js';
export const DUR = 10.0;
export const EV = [
  { t: 0.12, type: 'whoosh' }, { t: 1.63, type: 'pop' }, { t: 2.0, type: 'whip' }, { t: 2.86, type: 'ding' }, { t: 3.66, type: 'thud' }, { t: 3.64, type: 'riser', d: 0.3 },
  { t: 4.05, type: 'whoosh' }, { t: 4.75, type: 'pop' }, { t: 5.5, type: 'slide', d: 0.4 }, { t: 6.6, type: 'whoosh', gain: -4 }, { t: 7.55, type: 'stop', d: 0.9 }, { t: 8.62, type: 'sting' },
];
export const SHOTS = [{ id: 'wide', t0: 0, t1: 2.13 }, { id: 'tag', t0: 2.0, t1: 4.35 }, { id: 'cust', t0: 4.05, t1: 6.72 }, { id: 'keep', t0: 6.6, t1: DUR }];
export const TRANS = [{ from: 'wide', to: 'tag', t0: 2.0, t1: 2.13, kind: 'crash' }, { from: 'tag', to: 'cust', t0: 4.05, t1: 4.35, kind: 'whip' }, { from: 'cust', to: 'keep', t0: 6.6, t1: 6.72, kind: 'dissolve' }];
export { CUES };
