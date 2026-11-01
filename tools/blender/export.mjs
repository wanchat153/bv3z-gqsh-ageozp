// Export the hall world as posed at time t (shot S02) to GLB + the shot camera as JSON, for a Blender test render.
// usage: node export.mjs <filmDir> <out.glb> <cam.json> <t> <shotId>
import { writeFileSync, createReadStream, statSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire('/home/claude/ani3d-sitck/tools/still.mjs');
const pw = require('playwright');
const [dir, glb, camf, t, id] = [resolve(process.argv[2]), process.argv[3], process.argv[4], +process.argv[5], process.argv[6]];
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const srv = http.createServer((rq, rs) => { try { const p = join(dir, decodeURIComponent(rq.url.split('?')[0])); if (!statSync(p).isFile()) throw 0; rs.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); createReadStream(p).pipe(rs); } catch { rs.writeHead(404); rs.end(); } });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const b = await pw.chromium.launch({ args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 540, height: 960 } }); p.on('pageerror', (e) => console.log('[err]', e.message)); p.on('console', (m) => { if (m.type() !== 'log') return; console.log('[log]', m.text()); });
await p.goto(`http://127.0.0.1:${srv.address().port}/studio.html`); await p.waitForFunction(() => window.READY, null, { timeout: 300000 });
const res = await p.evaluate(async ({ t, id }) => {
  window.render(t); const H = window.__hall(); const cam = window.__cam(id);
  const { GLTFExporter } = await import('./src/addons/exporters/GLTFExporter.js');
  // hide what glTF cannot carry or what this test should not include (sprites, points, flats are re-made in Blender)
  const hidden = []; H.S.traverse((o) => { if (o.visible && (o.isSprite || o.isPoints || o.isLight)) { o.visible = false; hidden.push(o); } });
  const buf = await new GLTFExporter().parseAsync(H.S, { binary: true, onlyVisible: true, maxTextureSize: 2048 });
  hidden.forEach((o) => { o.visible = true; });
  const u8 = new Uint8Array(buf); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  cam.updateMatrixWorld(true); const head = H.J.heads[0]; head.updateMatrixWorld(true);
  return { b64: btoa(s), cam: { pos: cam.position.toArray(), quat: cam.quaternion.toArray(), fov: cam.fov, aspect: cam.aspect, near: cam.near },
    head: head.getWorldPosition(head.position.clone()).toArray(), mouth: H.J.headWorld(0).toArray() };
}, { t, id });
writeFileSync(glb, Buffer.from(res.b64, 'base64')); delete res.b64; writeFileSync(camf, JSON.stringify(res, null, 1));
console.log('exported', glb, JSON.stringify(res.cam));
await b.close(); srv.close();
