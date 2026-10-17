// usage: node tools/render_part.mjs <episodeDir> <startFrame> <endFrame(exclusive)> <outDir>
// renders frames [start,end) at 60 fps from <episodeDir>/studio.html (window.grab(t)) and encodes them as one near-lossless segment (part.mp4)
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const [ep, s, e, out] = [resolve(process.argv[2]), +process.argv[3], +process.argv[4], resolve(process.argv[5])];
const FPS = +(process.env.FPS || 60), NW = +(process.env.WORKERS || 2), CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const VW = +(process.env.WIDTH || 1080), VH = +(process.env.HEIGHT || 1920); // default stays 9:16; set WIDTH=1920 HEIGHT=1080 for landscape
mkdirSync(out + '/f', { recursive: true });
const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
await Promise.all([...Array(NW).keys()].map(async (w) => {
  const p = await b.newPage({ viewport: { width: VW, height: VH } });
  p.on('pageerror', (er) => console.log('[err]', er.message));
  await p.goto('file://' + ep + '/studio.html', { timeout: 300000 }); await p.waitForFunction(() => window.READY, null, { timeout: 900000 }); p.setDefaultTimeout(0);
  for (let i = s + w; i < e; i += NW) { const f = `${out}/f/f${String(i).padStart(6, '0')}.png`; if (existsSync(f)) continue;
    writeFileSync(f, Buffer.from(await p.evaluate((t) => window.grabPNG(t), i / FPS), 'base64')); }
}));
await b.close();
const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-start_number', String(s), '-i', `${out}/f/f%06d.png`, '-frames:v', String(e - s), '-c:v', 'libx264', '-crf', '10', '-preset', 'veryfast', '-g', String(FPS), '-keyint_min', String(FPS), '-sc_threshold', '0', '-bf', '0', '-pix_fmt', 'yuv420p', '-an', `${out}/part.mp4`], { stdio: 'inherit' });
if (r.status) process.exit(r.status);
spawnSync('rm', ['-rf', out + '/f']); console.log('part ok', s, e);
