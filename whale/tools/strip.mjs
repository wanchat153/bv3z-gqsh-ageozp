import { chromium } from 'playwright-core'; import { writeFileSync, mkdirSync, createReadStream, statSync } from 'node:fs'; import { resolve, join, extname } from 'node:path'; import http from 'node:http';
const [root, page, out, size, t0, t1, dt] = process.argv.slice(2); const R = resolve(root); const [VW, VH] = size.split('x').map(Number);
const srv = http.createServer((rq, rs) => { try { const p = join(R, decodeURIComponent(rq.url.split('?')[0])); if (!statSync(p).isFile()) throw 0; rs.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' }[extname(p)] || 'application/octet-stream' }); createReadStream(p).pipe(rs); } catch { rs.writeHead(404); rs.end(); } });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: VW, height: VH } }); pg.on('pageerror', (e) => console.log('[err]', e.message)); pg.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.text()); });
await pg.goto(`http://127.0.0.1:${srv.address().port}/${page}`); await pg.waitForFunction(() => window.READY, null, { timeout: 300000 });
let n = 0; for (let t = +t0; t <= +t1 + 1e-9; t += +dt) { writeFileSync(`${out}/f_${String(n++).padStart(3, '0')}.jpg`, Buffer.from(await pg.evaluate((t) => window.grab(t), +t.toFixed(4)), 'base64')); }
await b.close(); srv.close();
