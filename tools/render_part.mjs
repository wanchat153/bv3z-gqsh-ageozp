// usage: node tools/render_part.mjs <episodeDir> <startFrame> <endFrame(exclusive)> <outDir>
// renders frames [start,end) from <episodeDir>/studio.html (window.grabPNG(t), or window.grab(t) when FMT=jpg) and encodes them as one segment (part.mp4)
// env: FPS WORKERS WIDTH HEIGHT CHROME  FMT=png|jpg  PRESET=veryfast  CRF=10  (episode is served over http://127.0.0.1 so images never taint the canvas)
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, existsSync, createReadStream, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, join, extname } from 'node:path';
import http from 'node:http';
const [ep, s, e, out] = [resolve(process.argv[2]), +process.argv[3], +process.argv[4], resolve(process.argv[5])];
const FPS = +(process.env.FPS || 60), NW = +(process.env.WORKERS || 2), CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const VW = +(process.env.WIDTH || 1080), VH = +(process.env.HEIGHT || 1920);
const FMT = process.env.FMT || 'png', PRESET = process.env.PRESET || 'veryfast', CRF = process.env.CRF || '10';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json' };
const srv = http.createServer((rq, rs) => { try { const p = join(ep, decodeURIComponent(rq.url.split('?')[0])); if (!p.startsWith(ep) || !statSync(p).isFile()) throw 0; rs.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); createReadStream(p).pipe(rs); } catch { rs.writeHead(404); rs.end(); } });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const URL0 = `http://127.0.0.1:${srv.address().port}/studio.html`;
mkdirSync(out + '/f', { recursive: true });
const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
await Promise.all([...Array(NW).keys()].map(async (w) => {
  const p = await b.newPage({ viewport: { width: VW, height: VH } });
  p.on('pageerror', (er) => console.log('[err]', er.message));
  await p.goto(URL0, { timeout: 300000 }); await p.waitForFunction(() => window.READY, null, { timeout: 900000 }); p.setDefaultTimeout(0);
  for (let i = s + w; i < e; i += NW) { const f = `${out}/f/f${String(i).padStart(6, '0')}.${FMT}`; if (existsSync(f)) continue;
    writeFileSync(f, Buffer.from(await p.evaluate((a) => (a.j ? window.grab(a.t) : window.grabPNG(a.t)), { t: i / FPS, j: FMT === 'jpg' }), 'base64')); }
}));
await b.close(); srv.close();
const vf = 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p';
const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-start_number', String(s), '-i', `${out}/f/f%06d.${FMT}`, '-frames:v', String(e - s), '-vf', vf, '-c:v', 'libx264', '-crf', CRF, '-preset', PRESET, '-profile:v', 'high', '-g', String(FPS), '-keyint_min', String(FPS), '-sc_threshold', '0', '-bf', '0', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-an', `${out}/part.mp4`], { stdio: 'inherit' });
if (r.status) process.exit(r.status);
spawnSync('rm', ['-rf', out + '/f']); console.log('part ok', s, e);
