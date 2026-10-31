import { writeFileSync } from 'node:fs';
import { SHOTS, DUR, T } from './src/shots.js';
writeFileSync(new URL('./events.json', import.meta.url), JSON.stringify({ DUR, shots: SHOTS.list, T }));
console.log('events', DUR);
