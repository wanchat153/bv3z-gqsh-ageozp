// three.js → Blender: export one shot as <out>/world.json + geo/ tex/ inst/ bins + frames/fNNNN.json + flats/<node>_NNNN.png
// usage: node tools/blender/export_shot.mjs <filmDir> <shotId> <outDir> [--every N] [--from F --to F]
// Frame range = the shot's own frames plus the frames of the transitions in and out of it (FRAMEMAP), at the film's FPS.
import { mkdirSync, writeFileSync, createReadStream, statSync } from 'node:fs';
import { resolve, join, extname, dirname } from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); let pw; try { pw = require('playwright'); } catch { pw = require('playwright-core'); }
const a = process.argv.slice(2); const dir = resolve(a[0]), id = a[1], out = resolve(a[2]); let every = 1, from = null, to = null;
for (let i = 3; i < a.length; i++) { if (a[i] === '--every') every = +a[++i]; else if (a[i] === '--from') from = +a[++i]; else if (a[i] === '--to') to = +a[++i]; }
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png' };
// the page uploads big binaries (the GLB, character canvases) with POST /__up?f=<relative path> — nothing heavy crosses CDP
const srv = http.createServer((rq, rs) => { if (rq.method === 'POST' && rq.url.startsWith('/__up')) { const f = new URL(rq.url, 'http://x').searchParams.get('f'); const ch = [];
    rq.on('data', (d) => ch.push(d)); rq.on('end', () => { mkdirSync(dirname(join(out, f)), { recursive: true }); writeFileSync(join(out, f), Buffer.concat(ch)); rs.writeHead(200); rs.end('ok'); }); return; }
  try { const p = join(dir, decodeURIComponent(rq.url.split('?')[0])); if (!statSync(p).isFile()) throw 0; rs.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); createReadStream(p).pipe(rs); } catch { rs.writeHead(404); rs.end(); } });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const opts = { args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }; if (process.env.CHROME) opts.executablePath = process.env.CHROME;
const b = await pw.chromium.launch(opts); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
p.on('pageerror', (e) => console.log('[err]', e.message));
await p.goto(`http://127.0.0.1:${srv.address().port}/studio.html?nocap`); await p.waitForFunction(() => window.READY, null, { timeout: 300000 }); p.setDefaultTimeout(0);
const R = await p.evaluate((id) => { const S = window.__SHOTS, T = window.__TRANS, K = window.__KIND; const k = S.findIndex((s) => s.id === id);
  let f0 = S[k].f0, f1 = S[k].f1 - 1; if (k > 0 && T[k - 1] && K[T[k - 1].kind]) f0 = Math.min(f0, T[k - 1].f0); if (T[k] && K[T[k].kind]) f1 = Math.max(f1, T[k].f1); return { f0, f1, fps: 30 }; }, id);
const F0 = from ?? R.f0, F1 = to ?? R.f1; const fr = []; for (let f = F0; f <= F1; f += every) fr.push(f);
mkdirSync(out + '/frames', { recursive: true }); mkdirSync(out + '/flats', { recursive: true }); mkdirSync(out + '/tex', { recursive: true });
await p.evaluate(async () => { window.__bx = await import('./src/bexport.js'); });
const meta = await p.evaluate(async ({ id, ts }) => window.__bx.begin(id, ts), { id, ts: fr.map((f) => (f + 0.5) / R.fps) });
writeFileSync(out + '/shot.json', JSON.stringify({ id, fps: R.fps, frames: fr, ...meta }, null, 1));
for (const f of fr) { const d = await p.evaluate(({ t, f }) => window.__bx.frame(t, f), { t: (f + 0.5) / R.fps, f });
  writeFileSync(`${out}/frames/f${String(f).padStart(4, '0')}.json`, JSON.stringify(d)); }
console.log('exported', id, fr.length, 'frames', F0, '…', F1); await b.close(); srv.close();
