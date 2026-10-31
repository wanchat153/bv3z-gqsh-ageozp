// Composition check (Lemo-Opuscar directing rules made measurable). Needs the page to expose
// window.SUBJECTS(t) -> {W, H, shot, wide, subjects:[{id, kind, hero, back, box:[x0,y0,x1,y1] | null}]}.
// usage: node tools/framecheck.mjs <dir with index.html|studio.html> <outDir> [--step 0.25] [--size 540x960] [--page studio.html]
// Writes report.md + report.json and annotated stills (one per second) with boxes: hero yellow, others cyan, problems red.
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync, createReadStream, statSync, existsSync } from 'node:fs';
import http from 'node:http'; import { join, extname, resolve } from 'node:path';
const a = process.argv.slice(2); const opt = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
const dir = resolve(a[0]), out = resolve(a[1]); const step = +opt('--step', 0.25); const [VW, VH] = opt('--size', '540x960').split('x').map(Number);
const page = opt('--page', existsSync(join(dir, 'index.html')) ? 'index.html' : 'studio.html');
mkdirSync(out, { recursive: true });
const srv = http.createServer((rq, rs) => { try { const p = join(dir, decodeURIComponent(rq.url.split('?')[0])); if (!p.startsWith(dir) || !statSync(p).isFile()) throw 0; rs.writeHead(200, { 'content-type': extname(p) === '.js' || extname(p) === '.mjs' ? 'text/javascript' : extname(p) === '.html' ? 'text/html' : 'application/octet-stream' }); createReadStream(p).pipe(rs); } catch { rs.writeHead(404); rs.end(); } });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const b = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: VW, height: VH } }); pg.on('pageerror', (e) => console.log('[pageerror]', e.message));
await pg.goto(`http://127.0.0.1:${srv.address().port}/${page}`); await pg.waitForFunction(() => window.READY, null, { timeout: 300000 });
const DUR = await pg.evaluate(() => window.DUR);
const rows = []; const shots = {};
const inter = (A, B) => Math.max(0, Math.min(A[2], B[2]) - Math.max(A[0], B[0])) * Math.max(0, Math.min(A[3], B[3]) - Math.max(A[1], B[1]));
const area = (A) => Math.max(0, A[2] - A[0]) * Math.max(0, A[3] - A[1]);
for (let t = 0.1; t < DUR - 0.05; t += step) {
  const r = await pg.evaluate((t) => window.SUBJECTS(t), +t.toFixed(3)); const { W, H } = r; const F = [0, 0, W, H];
  const sh = shots[r.shot] ||= { shot: r.shot, wide: r.wide, t0: t, t1: t, heroMax: 0, heroMin: 1, flags: {} };
  sh.t1 = t; const flag = (k, msg) => { (sh.flags[k] ||= []).push(`${t.toFixed(2)}s ${msg}`); };
  const hero = r.subjects.find((s) => s.hero);
  const probs = [];
  if (!hero || !hero.box) { flag('no-hero', 'no hero subject on screen'); probs.push('hero'); }
  else { const hb = hero.box; const vis = area(hb) ? inter(hb, F) / area(hb) : 0; const hh = Math.min(H, hb[3]) - Math.max(0, hb[1]); const frac = hh / H;
    sh.heroMax = Math.max(sh.heroMax, frac); sh.heroMin = Math.min(sh.heroMin, frac);
    const bigger = hb[2] - hb[0] > W * 0.95 || hb[3] - hb[1] > H * 0.95;
    if (vis < 0.85 && !bigger) { flag('hero-clipped', `hero ${Math.round((1 - vis) * 100)}% outside frame`); probs.push(hero.id); }
    const cx = (Math.max(0, hb[0]) + Math.min(W, hb[2])) / 2 / W; if (!bigger && (cx < 0.15 || cx > 0.85)) { flag('hero-edge', `hero centre at ${Math.round(cx * 100)}% of width`); probs.push(hero.id); } }
  const chars = r.subjects.filter((s) => s.kind === 'char' && s.box && !s.back);
  for (const c of chars) { const bb = c.box; const head = [bb[0], bb[1], bb[2], bb[1] + (bb[3] - bb[1]) * 0.42]; const hv = area(head) ? inter(head, F) / area(head) : 0;
    if (hv > 0.05 && hv < 0.6 && area(head) > W * H * 0.004) { flag('face-cut', `${c.id} face cut by the frame edge`); probs.push(c.id); } }
  for (let i = 0; i < chars.length; i++) for (let j = i + 1; j < chars.length; j++) { const A = chars[i].box, B = chars[j].box; const ha = [A[0], A[1], A[2], A[1] + (A[3] - A[1]) * 0.42], hb2 = [B[0], B[1], B[2], B[1] + (B[3] - B[1]) * 0.42];
    const ov = inter(ha, hb2) / Math.max(1, Math.min(area(ha), area(hb2))); if (ov > 0.35 && Math.min(area(ha), area(hb2)) > W * H * 0.004) { flag('faces-overlap', `${chars[i].id} and ${chars[j].id} faces overlap ${Math.round(ov * 100)}%`); probs.push(chars[i].id, chars[j].id); } }
  rows.push({ t: +t.toFixed(2), shot: r.shot, subjects: r.subjects, probs });
}
// annotated stills: one per second, boxes drawn on the canvas
const marks = rows.filter((r) => Math.abs(r.t - Math.round(r.t * 1) / 1) < step / 2 + 1e-6 || r.probs.length);
let n = 0;
for (const r of marks.filter((r, i, A) => i === 0 || r.t - A[i - 1].t >= 0.99 || r.probs.length && !A[i - 1].probs.length)) {
  await pg.evaluate((t) => window.render(t), r.t);
  const data = await pg.evaluate((r) => { const src = document.querySelector('canvas'); const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const x = c.getContext('2d'); x.drawImage(src, 0, 0);
    for (const s of r.subjects) { if (!s.box) continue; const bad = r.probs.includes(s.id); x.lineWidth = s.hero ? 4 : 2; x.strokeStyle = bad ? '#ff2a2a' : s.hero ? '#ffd400' : '#3ad0ff'; x.strokeRect(s.box[0], s.box[1], s.box[2] - s.box[0], s.box[3] - s.box[1]); }
    x.strokeStyle = 'rgba(255,255,255,0.35)'; x.setLineDash([6, 6]); x.strokeRect(c.width * 0.15, 4, c.width * 0.7, c.height - 8); x.beginPath(); x.moveTo(0, c.height / 3); x.lineTo(c.width, c.height / 3); x.stroke();
    x.setLineDash([]); x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(0, 0, c.width, 26); x.fillStyle = r.probs.length ? '#ff6a6a' : '#fff'; x.font = 'bold 16px sans-serif'; x.fillText(`${r.t.toFixed(2)}s ${r.shot}${r.probs.length ? '  ✗' : ''}`, 8, 19);
    return c.toDataURL('image/jpeg', 0.85).split(',')[1]; }, r);
  writeFileSync(join(out, `f_${String(n++).padStart(3, '0')}_${r.t.toFixed(2)}.jpg`), Buffer.from(data, 'base64'));
}
// report
const L = ['# Frame check', '', `step ${step}s · ${VW}x${VH} · rules: hero ≥ 1/3 frame height somewhere in each non-wide shot; hero ≥ 85% inside the frame; hero centre within the middle 70%; no face cut by the edge; no two faces overlapping > 35%.`, '', '| shot | time | hero height (min–max of frame) | problems |', '|---|---|---|---|'];
let total = 0;
for (const s of Object.values(shots)) { const p = []; if (!s.wide && s.heroMax < 0.33) p.push(`hero never reaches 1/3 of frame height (max ${Math.round(s.heroMax * 100)}%)`);
  for (const [k, v] of Object.entries(s.flags)) p.push(`${k} ×${v.length} (first ${v[0]})`); total += p.length;
  L.push(`| ${s.shot}${s.wide ? ' (wide)' : ''} | ${s.t0.toFixed(1)}–${s.t1.toFixed(1)} | ${Math.round(s.heroMin * 100)}–${Math.round(s.heroMax * 100)}% | ${p.join('; ') || 'ok'} |`); }
L.push('', `${total} problem${total === 1 ? '' : 's'} found.`);
writeFileSync(join(out, 'report.md'), L.join('\n')); writeFileSync(join(out, 'report.json'), JSON.stringify({ shots, rows }, null, 0));
console.log(L.join('\n')); await b.close(); srv.close(); process.exit(0);
