// usage: node tools/stills.mjs <episodeDir> <outDir> <WxH> t1 t2 ...   (renders jpg stills with local Chrome)
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync, createReadStream, statSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
import http from 'node:http';
const [ep, out, size, ...ts] = process.argv.slice(2); const EP = resolve(ep); const [VW, VH] = size.split('x').map(Number);
const MIME = { '.html': 'text/html', '.js': 'text/javascript' };
const srv = http.createServer((rq, rs) => { try { const p = join(EP, decodeURIComponent(rq.url.split('?')[0])); if (!statSync(p).isFile()) throw 0; rs.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); createReadStream(p).pipe(rs); } catch { rs.writeHead(404); rs.end(); } });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: VW, height: VH } });
p.on('pageerror', (e) => console.log('[err]', e.message)); p.on('console', (m) => { if (m.type() === 'error') console.log('[console]', m.text()); });
await p.goto(`http://127.0.0.1:${srv.address().port}/studio.html${process.env.QS || ''}`); await p.waitForFunction(() => window.READY, null, { timeout: 300000 });
for (const t of ts) { const s = Date.now(); writeFileSync(`${out}/s_${String(t).padStart(6, '0')}.jpg`, Buffer.from(await p.evaluate((t) => window.grab(t), +t), 'base64')); console.log('still', t, Date.now() - s, 'ms'); }
await b.close(); srv.close();
