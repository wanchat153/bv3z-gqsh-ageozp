// node grab.mjs [start end] -> out/lit (room+kettle+real chars, no light/steam), out/real (real chars mask), out/info/fNNNN.json, out/catmask.png (Mochi silhouette for the cat-shaped cloud)
import { chromium } from 'playwright-core'; import { writeFileSync, mkdirSync } from 'node:fs';
const FPS = 60, NF = Math.round(10 * FPS), s = +(process.argv[2] ?? 0), e = +(process.argv[3] ?? NF), NW = +(process.env.WORKERS || 2);
for (const d of ['lit', 'real', 'info']) mkdirSync('out/' + d, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-gpu', '--allow-file-access-from-files'] });
await Promise.all([...Array(NW).keys()].map(async (k) => {
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } }); p.on('pageerror', (er) => console.log('[err]', er.message));
  await p.goto('file://' + process.cwd() + '/studio.html'); await p.waitForFunction(() => window.READY);
  if (k === 0) writeFileSync('out/tab.json', await p.evaluate(() => JSON.stringify(window.tab())));
  if (k === 0 && s === 0) { const d = await p.evaluate(() => window.grabLayer(0, 'catmask')); writeFileSync('out/catmask.png', Buffer.from(d.split(',')[1], 'base64')); }
  for (let i = s + k; i < e; i += NW) { const t = i / FPS, n = String(i).padStart(4, '0');
    for (const [dir, mode] of [['lit', 'full'], ['real', 'real']]) { const d = await p.evaluate(([t, m]) => window.grabLayer(t, m), [t, mode]); writeFileSync(`out/${dir}/f${n}.png`, Buffer.from(d.split(',')[1], 'base64')); }
    writeFileSync(`out/info/f${n}.json`, await p.evaluate((t) => window.info(t), t)); }
}));
await b.close(); console.log('grabbed', s, e);
