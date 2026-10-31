// events.json for mix.py: shot list, beats, camera-flash times in the salvage shot
import { writeFileSync } from 'node:fs';
import { SHOTS, DUR } from './src/shots.js';
const sv = SHOTS.list.find((s) => s.stage === 'salvage'); const flashes = [];
for (let t = sv.t0; t < sv.t1; t += 1 / 120) for (let i = 0; i < 5; i++) { const v = ((t * 1.3 + i * 0.37) % 1.6); if (Math.abs(v - 0.1) < 1 / 120 * 1.3 * 0.6) flashes.push(+t.toFixed(3)); }
writeFileSync(new URL('./events.json', import.meta.url), JSON.stringify({ DUR, shots: SHOTS.list, T: SHOTS.T, flashes }));
console.log('events', DUR, flashes.length, 'flashes');
