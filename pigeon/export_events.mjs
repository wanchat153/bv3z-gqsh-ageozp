// writes events.json for mix.py: beats, events, slow windows and the world-time table (every 0.1 s of film)
import { writeFileSync } from 'node:fs';
import { T, EV, DUR, tau, SLOW, W } from './src/timeline.js';
const tauT = []; for (let t = 0; t <= DUR + 0.2; t += 0.1) tauT.push(+tau(t).toFixed(5));
writeFileSync(new URL('./events.json', import.meta.url), JSON.stringify({ T, EV, DUR, SLOW, tau: tauT }, null, 0));
console.log('events.json', EV.length, 'events, DUR', DUR);
