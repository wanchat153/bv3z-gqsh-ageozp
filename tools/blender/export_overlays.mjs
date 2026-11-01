// The film's 2D layers for the Blender path: caption canvases (one PNG per cue) and fx2d overlays (speed lines, flashes;
// one PNG per frame that has one), drawn by the film's own code so they match the three.js render exactly.
// usage: node tools/blender/export_overlays.mjs <filmDir> <outDir>     → <out>/cap/cNNN.png, <out>/ov/fNNNN.png, <out>/overlays.json
import { mkdirSync, writeFileSync, createReadStream, statSync } from 'node:fs';
import { resolve, join, extname, dirname } from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); let pw; try { pw = require('playwright'); } catch { pw = require('playwright-core'); }
const [dir, out] = process.argv.slice(2).map((x) => resolve(x));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.ttf': 'font/ttf' };
const srv = http.createServer((rq, rs) => { if (rq.method === 'POST' && rq.url.startsWith('/__up')) { const f = new URL(rq.url, 'http://x').searchParams.get('f'); const ch = [];
    rq.on('data', (d) => ch.push(d)); rq.on('end', () => { mkdirSync(dirname(join(out, f)), { recursive: true }); writeFileSync(join(out, f), Buffer.concat(ch)); rs.writeHead(200); rs.end('ok'); }); return; }
  try { const p = join(dir, decodeURIComponent(rq.url.split('?')[0])); if (!statSync(p).isFile()) throw 0; rs.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); createReadStream(p).pipe(rs); } catch { rs.writeHead(404); rs.end(); } });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const opts = { args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }; if (process.env.CHROME) opts.executablePath = process.env.CHROME;
const b = await pw.chromium.launch(opts); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
p.on('pageerror', (e) => console.log('[err]', e.message));
await p.goto(`http://127.0.0.1:${srv.address().port}/studio.html?nocap`); await p.waitForFunction(() => window.READY, null, { timeout: 300000 }); p.setDefaultTimeout(0);
const res = await p.evaluate(async () => {
  const up = (f, blob) => fetch('/__up?f=' + encodeURIComponent(f), { method: 'POST', body: blob });
  const png = (c) => new Promise((r) => c.toBlob(r, 'image/png'));
  const NF = Math.round(window.DUR * 30); const cues = {}, ovs = [];
  for (let f = 0; f < NF; f++) { const t = (f + 0.5) / 30; const r = window.__ovAt(t);
    if (r.cue >= 0 && !(r.cue in cues)) { cues[r.cue] = window.CUES[r.cue]; await up(`cap/c${String(r.cue).padStart(3, '0')}.png`, await png(r.capc)); }
    if (r.ov) { ovs.push(f); await up(`ov/f${String(f).padStart(4, '0')}.png`, await png(r.ovc)); } }
  return { frames: NF, cues: window.CUES, overlays: ovs };
});
writeFileSync(join(out, 'overlays.json'), JSON.stringify(res)); console.log('overlays', res.cues.length, 'cues,', res.overlays.length, 'overlay frames');
await b.close(); srv.close();
