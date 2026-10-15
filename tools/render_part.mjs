// usage: node tools/render_part.mjs <episodeDir> <startFrame> <endFrame(exclusive)> <outDir>
// renders frames [start,end) at 60 fps from <episodeDir>/studio.html (window.grab(t)) and encodes them as one near-lossless segment (part.mp4)
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const [ep, s, e, out] = [resolve(process.argv[2]), +process.argv[3], +process.argv[4], resolve(process.argv[5])];
const FPS = 60, NW = +(process.env.WORKERS || 2), CHROME = process.env.CHROME || '/usr/bin/google-chrome';
mkdirSync(out + '/f', { recursive: true });
const b = await chromium.launch({ executablePath: CHROME, args: ['--disable-gpu', '--no-sandbox', '--allow-file-access-from-files'] });
await Promise.all([...Array(NW).keys()].map(async (w) => {
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', (er) => console.log('[err]', er.message));
  await p.goto('file://' + ep + '/studio.html'); await p.waitForFunction(() => window.READY, null, { timeout: 120000 });
  for (let i = s + w; i < e; i += NW) { const f = `${out}/f/f${String(i).padStart(6, '0')}.png`; if (existsSync(f)) continue;
    writeFileSync(f, Buffer.from(await p.evaluate((t) => window.grabPNG(t), i / FPS), 'base64')); }
}));
await b.close();
const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '60', '-start_number', String(s), '-i', `${out}/f/f%06d.png`, '-frames:v', String(e - s), '-c:v', 'libx264', '-crf', '10', '-preset', 'veryfast', '-g', '60', '-keyint_min', '60', '-sc_threshold', '0', '-bf', '0', '-pix_fmt', 'yuv420p', '-an', `${out}/part.mp4`], { stdio: 'inherit' });
if (r.status) process.exit(r.status);
spawnSync('rm', ['-rf', out + '/f']); console.log('part ok', s, e);
