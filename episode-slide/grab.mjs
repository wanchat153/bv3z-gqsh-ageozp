// node grab.mjs [start end] -> out/lit (scene + chars, no light/dust), out/real|realS|realM (char masks), out/info/fNNNN.json, out/tab.json
import { chromium } from 'playwright-core'; import { writeFileSync, mkdirSync } from 'node:fs';
const FPS = 60, NF = Math.round(10 * FPS), s = +(process.argv[2] ?? 0), e = +(process.argv[3] ?? NF), NW = +(process.env.WORKERS || 2);
for (const d of ['lit', 'real', 'realS', 'realM', 'info']) mkdirSync('out/' + d, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-gpu', '--allow-file-access-from-files'] });
await Promise.all([...Array(NW).keys()].map(async (k) => {
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } }); p.on('pageerror', (er) => console.log('[err]', er.message));
  await p.goto('file://' + process.cwd() + '/studio.html'); await p.waitForFunction(() => window.READY);
  if (k === 0) writeFileSync('out/tab.json', await p.evaluate(() => JSON.stringify(window.tab())));
  for (let i = s + k; i < e; i += NW) { const t = i / FPS, n = String(i).padStart(4, '0');
    for (const [dir, mode] of [['lit', 'full'], ['real', 'real'], ['realS', 'realS'], ['realM', 'realM']]) { const d = await p.evaluate(([t, m]) => window.grabLayer(t, m), [t, mode]); writeFileSync(`out/${dir}/f${n}.png`, Buffer.from(d.split(',')[1], 'base64')); }
    writeFileSync(`out/info/f${n}.json`, await p.evaluate((t) => window.info(t), t)); }
}));
await b.close(); console.log('grabbed', s, e);
