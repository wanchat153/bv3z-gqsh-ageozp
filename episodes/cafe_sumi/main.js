/* ร้านกาแฟเล่าวิทยาศาสตร์ — sumi-e emaki v2 (ink-wash scroll painting). frame(t) is a pure function of t. 2D canvas only. */
(function () {
  const W = 1920, H = 1080, CX = W / 2, CY = H / 2, GY = 300;
  const TL = window.TIMELINE, SEG = {};
  TL.segments.forEach((s) => (SEG[s.key] = s));
  const ORDER = TL.segments.map((s) => s.key);
  const FONT = "'NST','Noto Sans Thai',sans-serif";
  const INK = '24,20,17', RED = '190,52,38', SEP = '128,88,48', GREY = '78,72,66', JADE = '58,98,92', PINK = '205,110,110';

  // ---------- helpers ----------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const sstep = (a, b, x) => ease((x - a) / (b - a));
  const fade = (t, a, b, fi = .6, fo = .6) => Math.min(ease((t - a) / fi), ease((b - t) / fo));
  function when(key, sub) { const s = SEG[key], i = s.text.indexOf(sub); return i < 0 ? s.start : s.start + (i / s.text.length) * (s.end - s.start); }
  const hf = (x, y, s) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 982451653)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  function vn(x, s) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hf(i, 0, s) * (1 - u) + hf(i + 1, 0, s) * u; }
  function vn2(x, y, s) { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); const a = hf(xi, yi, s), b = hf(xi + 1, yi, s), c = hf(xi, yi + 1, s), d = hf(xi + 1, yi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
  const fbm2 = (x, y, s, o = 4) => { let a = .5, t = 0, f = 1, n = 0; for (let i = 0; i < o; i++) { t += a * vn2(x * f, y * f, s + i * 5); n += a; a *= .5; f *= 2; } return t / n; };

  const out = document.getElementById('c'), ctx = out.getContext('2d');
  const mk = (w = W, h = H) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const inkC = mk(), g = inkC.getContext('2d');

  // ---------- paper (washi with fibres) & grain (pigment granulation) ----------
  const paper = (() => {
    const w = 960, h = 540, c = mk(w, h), q = c.getContext('2d'), im = q.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const n = fbm2(x / 110, y / 110, 3, 4), m = fbm2(x / 5, y / 5, 9, 2), i = (y * w + x) * 4;
      const v = .94 + (n - .5) * .08 + (m - .5) * .05, d = Math.hypot(x / w - .5, y / h - .5), vig = 1 - Math.pow(d * 1.25, 3) * .2;
      im.data[i] = 241 * v * vig; im.data[i + 1] = 233 * v * vig; im.data[i + 2] = 214 * v * vig; im.data[i + 3] = 255;
    }
    q.putImageData(im, 0, 0);
    let sd = 7; const r = () => ((sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296);
    q.lineCap = 'round';
    for (let i = 0; i < 1400; i++) { const x = r() * w, y = r() * h, a = r() * 6.28, l = 3 + r() * 16; q.globalAlpha = .035 + r() * .06; q.strokeStyle = r() < .5 ? '#8a7650' : '#fff8e6'; q.lineWidth = .5 + r() * .8; q.beginPath(); q.moveTo(x, y); q.quadraticCurveTo(x + Math.cos(a) * l * .5 + r() * 3, y + Math.sin(a) * l * .5 + r() * 3, x + Math.cos(a) * l, y + Math.sin(a) * l); q.stroke(); }
    const full = mk(); const fq = full.getContext('2d'); fq.imageSmoothingQuality = 'high'; fq.drawImage(c, 0, 0, W, H); return full;
  })();
  const grain = (() => {
    const w = 960, h = 540, c = mk(w, h), q = c.getContext('2d'), im = q.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const n = fbm2(x / 2.2, y / 2.2, 21, 3), m = fbm2(x / 30, y / 30, 5, 3), i = (y * w + x) * 4; const a = clamp((n - .5) * 1.6 + (m - .5) * .5, 0, 1); im.data[i] = im.data[i + 1] = im.data[i + 2] = 0; im.data[i + 3] = a * 150; }
    q.putImageData(im, 0, 0); const full = mk(); const fq = full.getContext('2d'); fq.drawImage(c, 0, 0, W, H); return full;
  })();

  // ---------- brush engine ----------
  function smooth(pts, step = 3) {
    const P = [pts[0], ...pts, pts[pts.length - 1]], dense = [];
    for (let i = 1; i < P.length - 2; i++) {
      const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]], sl = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), n = Math.max(2, Math.ceil(sl / step));
      for (let k = 0; k < n; k++) { const u = k / n, u2 = u * u, u3 = u2 * u; dense.push([.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3), .5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3)]); }
    }
    dense.push(pts[pts.length - 1]); return dense;
  }
  const cache = new Map();
  function build(pts, w, o) {
    const sm = smooth(pts, o.step || 3), n = sm.length, nx = [], ny = [], cum = [0];
    for (let i = 0; i < n; i++) { const a = sm[Math.max(0, i - 2)], b = sm[Math.min(n - 1, i + 2)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; nx.push(-dy / l); ny.push(dx / l); if (i) cum.push(cum[i - 1] + Math.hypot(sm[i][0] - sm[i - 1][0], sm[i][1] - sm[i - 1][1])); }
    return { sm, n, nx, ny, cum, L: cum[n - 1] || 1, w, o, seed: o.seed || Math.floor(hf(Math.round(pts[0][0]), Math.round(pts[0][1]), 7) * 1000) };
  }
  function drawS(S, p, am = 1) {
    const { sm, n, nx, ny, cum, w, o, seed } = S, m = Math.max(2, Math.min(n, Math.floor(n * p) + 1)), col = o.col || INK, a0 = (o.a === undefined ? .86 : o.a) * am, wl = [], wr = [];
    const tailAt = o.tail || .78;
    for (let i = 0; i < m; i++) {
      const s = i / (n - 1), head = sstep(0, .06, s), tail = 1 - (o.blunt ? .15 : .82) * sstep(tailAt, 1, s);
      const press = .8 + .36 * vn(cum[i] / 38, seed + 4), flick = .86 + .28 * vn(cum[i] / 9, seed);
      const base = o.uniform ? w * (.92 + .16 * vn(cum[i] / 16, seed)) : w * (.4 + .6 * head) * tail * press * flick;
      const j1 = (vn(cum[i] / 4, seed + 1) - .5) * base * .2, j2 = (vn(cum[i] / 4, seed + 2) - .5) * base * .2;
      wl.push([sm[i][0] + nx[i] * (base / 2 + j1), sm[i][1] + ny[i] * (base / 2 + j1)]); wr.push([sm[i][0] - nx[i] * (base / 2 + j2), sm[i][1] - ny[i] * (base / 2 + j2)]);
    }
    const path = () => { g.beginPath(); g.moveTo(wl[0][0], wl[0][1]); for (let i = 1; i < m; i++) g.lineTo(wl[i][0], wl[i][1]); for (let i = m - 1; i >= 0; i--) g.lineTo(wr[i][0], wr[i][1]); g.closePath(); };
    g.save(); g.lineJoin = 'round';
    g.lineWidth = Math.max(3, w * .7); g.strokeStyle = `rgba(${col},${a0 * .07})`; path(); g.stroke();      // bleed
    g.lineWidth = Math.max(2, w * .3); g.strokeStyle = `rgba(${col},${a0 * .09})`; path(); g.stroke();
    g.fillStyle = `rgba(${col},${a0 * .94})`; path(); g.fill();
    g.lineWidth = 1.1; g.strokeStyle = `rgba(${col},${a0 * .45})`; path(); g.stroke();                       // pigment gathers at the edge
    if (!o.noDry && w > 4.5) {
      g.globalCompositeOperation = 'destination-out'; g.lineWidth = 1.2; const dry = o.dry === undefined ? .5 : o.dry;
      for (let k = 0; k < 7; k++) {
        const f = ((k + .5) / 7 * 2 - 1) * .8; g.beginPath(); let pen = false;
        for (let i = 0; i < m; i += 2) {
          const s = i / (n - 1), thr = 1 - dry * (.1 + .9 * s * s), v = vn(cum[i] / 6, seed * 3 + k * 11);
          const bw = Math.hypot(wl[i][0] - wr[i][0], wl[i][1] - wr[i][1]) / 2 * f, x = sm[i][0] + nx[i] * bw, y = sm[i][1] + ny[i] * bw;
          if (v > thr) { pen ? g.lineTo(x, y) : g.moveTo(x, y); pen = true; } else pen = false;
        }
        g.strokeStyle = 'rgba(0,0,0,.55)'; g.stroke();
      }
    }
    g.restore();
    if (p >= .995 && !o.noPool && w > 6) { g.fillStyle = `rgba(${col},${a0 * .2})`; const e = sm[n - 1]; g.beginPath(); g.arc(e[0], e[1], w * .38, 0, 7); g.fill(); }
  }
  function K(key, pts, w, p, o = {}, am = 1) { if (p <= .001) return; let S = cache.get(key); if (!S) { S = build(pts, w, o); cache.set(key, S); } drawS(S, p, am); }
  function D(pts, w, p, o = {}, am = 1) { if (p <= .001) return; drawS(build(pts, w, o), p, am); }
  const circ = (cx, cy, r, a0 = 0, a1 = Math.PI * 2, n = 18, sq = 1) => Array.from({ length: n + 1 }, (_, i) => { const a = lerp(a0, a1, i / n); return [cx + Math.cos(a) * r, cy + Math.sin(a) * r * sq]; });
  const box = (x, y, w, h) => [[x + 3, y], [x + w, y + 3], [x + w - 2, y + h], [x + 4, y + h - 3], [x, y - 8]];
  // wash with hard, pooled edge (flat tonal steps like real sumi-e wash)
  function blob(cx, cy, rx, ry, a, col = INK, seed = 1, rot = 0, layers = 3) {
    g.save(); g.translate(cx, cy); g.rotate(rot);
    for (let k = 0; k < layers; k++) {
      const sc = 1 - k * .16, N = 36; g.beginPath();
      for (let i = 0; i <= N; i++) { const an = i / N * 6.2832, rr = 1 + (fbm2(Math.cos(an) * 1.3 + 5 + seed + k * 3, Math.sin(an) * 1.3 + 9, 31 + seed, 3) - .5) * .3; const x = Math.cos(an) * rx * sc * rr + (hf(seed, k, 3) - .5) * rx * .12 * k, y = Math.sin(an) * ry * sc * rr + (hf(seed, k, 4) - .5) * ry * .12 * k; i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.closePath(); g.fillStyle = `rgba(${col},${a * (k === 0 ? .42 : .3)})`; g.fill();
      if (k === 0) { g.lineWidth = 2.6; g.strokeStyle = `rgba(${col},${a * .42})`; g.shadowColor = `rgba(${col},${a * .5})`; g.shadowBlur = 5; g.stroke(); g.shadowBlur = 0; }
    }
    g.restore();
  }
  function soft(cx, cy, rx, ry, a, col = INK, rot = 0) { g.save(); g.translate(cx, cy); g.rotate(rot); g.scale(rx, ry); const q = g.createRadialGradient(0, 0, 0, 0, 0, 1); q.addColorStop(0, `rgba(${col},${a})`); q.addColorStop(.55, `rgba(${col},${a * .55})`); q.addColorStop(1, `rgba(${col},0)`); g.fillStyle = q; g.beginPath(); g.arc(0, 0, 1, 0, 7); g.fill(); g.restore(); }
  function hatch(key, x, y, w, h, n, p, seed = 1, col = INK, a = .5) { for (let i = 0; i < n; i++) { const u = (i + hf(i, seed, 2) * .6) / n, x0 = x + u * w, y0 = y + h * (.1 + hf(i, seed, 3) * .15); K(key + i, [[x0, y0], [x0 - w * .12, y0 + h * (.5 + hf(i, seed, 4) * .4)]], 3, p, { a, noDry: true, noPool: true, col }); } }
  function ink(s, x, y, size, a = 1, o = {}) { if (a <= .01) return; g.save(); g.font = `${o.w || 700} ${size}px ${FONT}`; g.textAlign = o.al || 'center'; g.textBaseline = 'alphabetic'; if (o.ls) g.letterSpacing = o.ls + 'px'; g.fillStyle = `rgba(${o.col || INK},${a * (o.k || .92)})`; g.shadowColor = `rgba(${o.col || INK},${a * .4})`; g.shadowBlur = 6; g.fillText(s, x, y); g.restore(); }
  function seal(x, y, k, size = 92) { if (k <= .02) return; const sc = 1 + (1 - ease(k * 1.6)) * .5; g.save(); g.translate(x, y); g.rotate(-.06); g.scale(sc, sc); g.globalAlpha = clamp(k * 3); g.fillStyle = `rgba(${RED},.92)`; g.beginPath(); g.roundRect(-size / 2, -size / 2, size, size, 7); g.fill(); g.globalCompositeOperation = 'destination-out'; g.lineWidth = 5; g.strokeStyle = '#000'; g.beginPath(); g.ellipse(0, 0, size * .22, size * .3, .5, 0, 7); g.stroke(); g.beginPath(); g.moveTo(-size * .14, size * .2); g.quadraticCurveTo(0, -size * .06, size * .14, -size * .2); g.stroke(); g.restore(); }
  const arrow = (x0, y0, x1, y1, w, p, col = RED) => { const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l; D([[x0, y0], [x0 + dx * .5 + uy * 8, y0 + dy * .5 - ux * 8], [x1, y1]], w, p, { col, noDry: true, tail: .95 }); if (p > .95) D([[x1 - ux * 30 + uy * 17, y1 - uy * 30 - ux * 17], [x1, y1], [x1 - ux * 30 - uy * 17, y1 - uy * 30 + ux * 17]], w * .8, 1, { col, noDry: true }); };
  const wisp = (x, y, t, i, a, h = 200, w = 14) => { const k = (t * .3 + i / 3) % 1; D(Array.from({ length: 7 }, (_, j) => [x + Math.sin(j * 1.15 + t * 1.4 + i * 1.9) * (14 + j * 3), y - k * 24 - j * h / 6]), w, 1, { a: a * (1 - k * .9) * .3, noDry: true, noPool: true }); };

  // ---------- scroll layout ----------
  const SP = 2000, SXw = (i) => i * SP;
  const NAMES = ['roast', 'grind', 'espresso', 'milk', 'caffeine', 'cool', 'cold', 'ring'];

  // ---------- backdrop: misty mountains, sun, birds ----------
  function backdrop(t, camX) {
    soft(1460 - camX * .04 % 200, 250, 150, 150, .2, RED); g.fillStyle = `rgba(${RED},.14)`; g.beginPath(); g.arc(1460 - camX * .04 % 200, 250, 92, 0, 7); g.fill();
    for (let L = 0; L < 4; L++) {
      const par = .12 + L * .1, ofs = camX * par + L * 400, base = 650 + L * 42, amp = 210 - L * 34, al = .06 + L * .03, scl = 130 - L * 10;
      g.save(); g.beginPath(); g.moveTo(-50, H + 20);
      for (let x = -50; x <= W + 50; x += 10) { const wx = (x + ofs) / scl; const y = base - Math.pow(fbm2(wx + L * 13, L * 3, 40 + L, 3), 1.7) * amp * 2.2 + 70; g.lineTo(x, y); }
      g.lineTo(W + 50, H + 20); g.closePath(); const q = g.createLinearGradient(0, base - amp * 1.4, 0, base + 150); q.addColorStop(0, `rgba(${GREY},${al})`); q.addColorStop(.75, `rgba(${GREY},${al * .35})`); q.addColorStop(1, `rgba(${GREY},0)`); g.fillStyle = q; g.fill(); g.restore();
      for (let b = 0; b < 3; b++) soft(((b * 700 + L * 330 - camX * (par + .05) + t * 6 * (L + 1)) % 2400 + 2400) % 2400 - 250, base + 50 + b * 10, 520, 38, .14, '240,233,214');
    }
    for (let i = 0; i < 4; i++) { const px = ((i * 590 - camX * .28) % 2400 + 2400) % 2400 - 200, py = 700 + hf(i, 1, 2) * 30; D([[px, py], [px + 6, py - 70], [px - 4, py - 140]], 7, 1, { a: .22, noDry: true, noPool: true }); for (let k = 0; k < 4; k++) D([[px, py - 40 - k * 25], [px + (k % 2 ? 40 : -40), py - 50 - k * 25], [px + (k % 2 ? 80 : -80), py - 42 - k * 25]], 6, 1, { a: .2, tail: .6, noDry: true, noPool: true }); }
    for (let i = 0; i < 4; i++) { const bx = ((i * 520 + t * 22 - camX * .06) % 2300 + 2300) % 2300 - 200, by = 150 + i * 36 + Math.sin(t * .8 + i) * 8, fl = Math.sin(t * 5 + i * 2) * 5; D([[bx - 26, by + fl], [bx - 8, by - 8 + fl * .4], [bx, by]], 3.5, 1, { a: .5, noDry: true, noPool: true }); D([[bx, by], [bx + 8, by - 8 + fl * .4], [bx + 26, by + fl]], 3.5, 1, { a: .5, noDry: true, noPool: true }); }
  }
  // long counter (the table that carries every scene)
  function counter(i, vis) {
    const x0 = SXw(i) - SP / 2; if (!vis(x0 + SP / 2)) return;
    K('ct' + i, [[x0 - 20, GY + 8], [x0 + 500, GY + 2], [x0 + 1000, GY + 10], [x0 + 1500, GY + 3], [x0 + SP + 20, GY + 8]], 20, 1, { a: .8, step: 6, dry: .6, blunt: true, noPool: true });
    K('ct2' + i, [[x0, GY + 34], [x0 + 800, GY + 38], [x0 + SP, GY + 33]], 5, 1, { a: .55, step: 6, noPool: true });
    for (let k = 0; k < 4; k++) K('cg' + i + k, [[x0 + 80 + hf(i, k, 2) * 300 + k * 450, GY + 56 + k * 9], [x0 + 330 + k * 450, GY + 52 + k * 9 + hf(i, k, 3) * 6], [x0 + 560 + k * 430, GY + 58 + k * 9]], 3, 1, { a: .3, noDry: true, noPool: true });
    K('cl' + i, [[x0 + SP, GY + 38], [x0 + SP + 2, GY + 190], [x0 + SP - 2, GY + 330]], 22, 1, { a: .5, dry: .7, tail: .5, noPool: true });
    soft(SXw(i), GY + 150, 760, 100, .1, GREY);
  }

  // ---------- stations (local coords: x=0 centre of screen when focused; table top at y=GY) ----------
  const ST = {};
  const bean = (cx, cy, rx, ry, dark, rot, seed, o = {}) => {
    g.save(); g.translate(cx, cy); g.rotate(rot);
    blob(0, 0, rx, ry, .22 + .74 * dark, dark < .35 ? SEP : INK, seed, 0, 3);
    D(Array.from({ length: 25 }, (_, i) => { const a = i / 24 * 6.4; return [Math.cos(a) * rx, Math.sin(a) * ry]; }), Math.max(2.5, rx * .045), 1, { a: .8, noDry: true, uniform: true, noPool: true });
    const open = o.open || 0;
    g.save(); g.globalCompositeOperation = 'destination-out'; g.lineCap = 'round'; g.lineWidth = Math.max(2.2, rx * (.05 + open * .05)); g.strokeStyle = `rgba(0,0,0,${.55 + .35 * dark})`; g.beginPath(); g.moveTo(-rx * .82, ry * .02); g.bezierCurveTo(-rx * .35, -ry * .3, rx * .25, ry * .3, rx * .84, -ry * .02); g.stroke();
    if (o.sheen) { g.fillStyle = `rgba(0,0,0,${o.sheen * .5})`; g.beginPath(); g.ellipse(-rx * .35, -ry * .45, rx * .26, ry * .1, -.4, 0, 7); g.fill(); }
    g.restore();
    if (o.wrinkle) for (let k = 0; k < 6; k++) { const y0 = (k - 2.5) * ry * .28; D([[-rx * .3 - k * 4, y0 - 6], [-rx * .05, y0 + 6], [rx * .3 + k * 3, y0 - 5]], 2.6, o.wrinkle, { a: .5 * (1 - dark * .3), noDry: true, noPool: true, col: dark > .5 ? '120,112,100' : SEP }); }
    g.restore();
  };

  ST.roast = (t, s) => {
    const D_ = s.end - s.start, R = (a, b) => ease(prog(t, s.start + a * D_, s.start + b * D_));
    const tb = when('roast', 'หนึ่งร้อยสี่สิบ'), tc = when('roast', 'สองร้อย'), T = t < tb ? lerp(25, 140, ease(prog(t, s.start + 1, tb))) : lerp(140, 200, ease(prog(t, tb, tc)));
    const dark = clamp((T - 25) / 190), hot = sstep(60, 200, T);
    blob(-545, 70, 160, 190, .1, GREY, 2, 0, 2);
    K('ro1', box(-700, -105, 310, 335), 11, R(.02, .12)); K('ro2', [[-742, -105], [-545, -120], [-350, -105]], 13, R(.1, .15));
    hatch('rh', -420, -60, 40, 270, 5, R(.15, .22), 2, INK, .35);
    K('ro3', [[-650, -118], [-710, -300], [-382, -300], [-440, -118]], 9, R(.14, .22));
    if (R(.14, .24) > .95) for (let i = 0; i < 6; i++) bean(-575 + (i % 3) * 52 + (i > 2 ? 24 : 0), -250 + Math.floor(i / 3) * 40, 24, 16, .1, hf(i, 2, 8) * 3, i + 20);
    K('ro4', [[-410, -40], [-330, -40], [-330, -250], [-326, -400]], 15, R(.2, .3));
    for (let i = 0; i < 3; i++) wisp(-328, -400, t, i, hot, 260, 30);
    K('ro5', circ(-545, 85, 96, 0, 6.4, 24), 13, R(.2, .3)); K('ro5b', circ(-545, 85, 78, .5, 6.9, 22), 4.5, R(.26, .34), { a: .5 });
    if (R(.2, .3) > .95) { g.save(); g.beginPath(); g.arc(-545, 85, 80, 0, 7); g.clip(); soft(-545, 85, 90, 90, .15 + .6 * hot, RED);
    for (let i = 0; i < 11; i++) { const an = t * (1.1 + hf(i, 1, 2) * .5) + i * .62, rr = 18 + hf(i, 2, 2) * 52; bean(-545 + Math.cos(an) * rr, 85 + Math.sin(an) * rr * .8, 17, 11, clamp(dark * 1.1 - .05 + hf(i, 3, 2) * .1), an * 1.7, i + 40); } g.restore(); }
    K('ro6', circ(-640, -30, 30, 0, 6.4, 14), 5, R(.24, .3)); D([[-640, -30], [-640 + Math.sin(lerp(-2.2, 2.2, dark)) * 24, -30 - Math.cos(lerp(-2.2, 2.2, dark)) * 24]], 3.5, R(.26, .3), { col: RED, noDry: true });
    K('ro7', [[-690, 228], [-694, GY - 4]], 14, R(.2, .26), { a: .8 }); K('ro8', [[-400, 228], [-396, GY - 4]], 14, R(.2, .26), { a: .8 });
    for (let i = 0; i < 4; i++) { const fl = 1 + .3 * Math.sin(t * 7 + i * 2); D([[-640 + i * 32, 230], [-646 + i * 32, 205 - 14 * fl], [-632 + i * 32, 178 - 30 * fl]], 9, hot * R(.3, .36), { col: RED, a: .85, noDry: true }); }
    const age = t - when('roast', 'เปรี๊ยะ');
    bean(160, -30, 215, 148, dark, -.2 + Math.sin(t * .6) * .03, 4, { open: age > 0 ? ease(age / .8) : 0, wrinkle: R(.3, .5) * sstep(.2, .6, dark), sheen: sstep(.6, 1, dark) });
    if (age > 0 && age < 1.5) for (let i = 0; i < 16; i++) { const an = i * .393 + .1, d0 = 235 + age * 110, d1 = d0 + 50 * (1 - age / 1.5); D([[160 + Math.cos(an) * d0, -30 + Math.sin(an) * d0 * .75], [160 + Math.cos(an) * d1, -30 + Math.sin(an) * d1 * .75]], 7, 1, { col: RED, a: 1 - age / 1.5, noDry: true, blunt: true }); }
    blob(180, GY - 18, 330, 22, .22, GREY, 5, 0, 2); K('ro9', circ(180, GY - 20, 330, 0, 6.4, 30, .12), 7, R(.34, .42), { a: .7 });
    for (let i = 0; i < 15; i++) { const k = R(.4 + i * .007, .45 + i * .007); if (k > 0) bean(180 + (hf(i, 1, 4) - .5) * 520, GY - 34 + (hf(i, 2, 4) - .5) * 26, 32, 21, dark, hf(i, 3, 4) * 3, i + 60); }
    K('th1', [[610, -300], [610, 160]], 30, R(.3, .4), { a: .6, uniform: true, noDry: true, noPool: true }); K('th2', circ(610, 200, 38, 0, 6.4, 14), 9, R(.34, .42), { a: .8 });
    soft(610, 200, 36, 36, .75 * R(.34, .42), RED);
    D([[610, 200], [610, 200 - (T - 20) / 190 * 470]], 15, 1, { col: RED, a: .9, uniform: true, noDry: true, noPool: true });
    [140, 200].forEach((v) => { const y = 200 - (v - 20) / 190 * 470; D([[640, y], [676, y]], 4, 1, { a: .6, noDry: true, noPool: true }); ink(String(v), 700, y + 11, 30, .8, { w: 400, al: 'left' }); });
    const ta = fade(t, s.start + 1, s.end + 1, 1, 1.2); ink(Math.round(T) + '°C', 320, -280, 128, ta, { col: T < 140 ? INK : RED });
    seal(-760, -330, prog(t, s.end - 3, s.end - 2.2));
  };

  ST.grind = (t, s) => {
    const D_ = s.end - s.start, R = (a, b) => ease(prog(t, s.start + a * D_, s.start + b * D_));
    blob(-560, 40, 150, 200, .08, GREY, 8, 0, 2);
    K('g1', box(-690, -110, 260, 300), 12, R(.02, .12)); K('g2', [[-650, -125], [-720, -330], [-400, -330], [-470, -125]], 10, R(.1, .18)); K('g2b', [[-740, -335], [-560, -345], [-380, -335]], 9, R(.16, .2));
    if (R(.1, .2) > .95) for (let i = 0; i < 7; i++) bean(-600 + (i % 4) * 44 + (i > 3 ? 22 : 0), -290 + Math.floor(i / 4) * 40, 24, 16, .12, hf(i, 2, 8) * 3, i + 70);
    K('g3', circ(-560, 30, 70, 0, 6.4, 20), 6, R(.16, .24), { a: .7 }); K('g3b', circ(-560, 30, 40, .4, 6.5, 16), 4, R(.2, .26), { a: .5 });
    const ang = t * 3.4; K('g4', circ(-430, 30, 5, 0, 6.4, 8), 6, R(.2, .24)); D([[-430, 30], [-430 + Math.cos(ang) * 120, 30 + Math.sin(ang) * 120]], 10, R(.2, .26), { noDry: true, noPool: true }); if (R(.2, .26) > .9) { blob(-430 + Math.cos(ang) * 130, 30 + Math.sin(ang) * 130, 24, 24, .8, INK, 3, 0, 2); }
    K('g5', [[-570, 190], [-570, 224]], 11, R(.2, .24)); K('g5b', [[-740, GY - 30], [-380, GY - 28]], 10, R(.2, .26), { a: .7 });
    blob(-560, GY - 52, 100, 22, .8, SEP, 12, 0, 2);
    if (R(.1, .2) > .9) for (let i = 0; i < 110; i++) { const ph = (t * 1.4 + i / 110) % 1, x = -560 + (hf(i, 1, 9) - .5) * 14 * ph, y = lerp(226, GY - 56, ph * ph); g.fillStyle = `rgba(${SEP},.75)`; g.beginPath(); g.arc(x, y, 1.8 + hf(i, 2, 9) * 1.5, 0, 7); g.fill(); }
    const dishes = [[-60, 11.5, 12, 'หยาบเกินไป', 'หยาบ → เปรี้ยว', .3], [250, 5.8, 34, 'น้ำร้อนจึง', 'พอดี ✓', .38], [560, 2.4, 170, 'ละเอียดเกินไป', 'ละเอียด → ขม', .46]];
    dishes.forEach(([x, r, n, key, lab, u0], i) => {
      blob(x, GY - 20, 150, 24, .18, GREY, 20 + i, 0, 2);
      K('dish' + i, circ(x, GY - 28, 140, 0, 6.4, 24, .22), 7, R(u0, u0 + .1), { a: .8 }); K('dishb' + i, circ(x, GY - 20, 112, 0, 6.4, 20, .2), 3, R(u0 + .03, u0 + .1), { a: .4 });
      const kd = R(u0 + .03, u0 + .15); for (let j = 0; j < n; j++) { if (j / n >= kd) break; const a = hf(j, i, 5) * 6.28, d = Math.sqrt(hf(j, i, 6)) * 108; g.fillStyle = `rgba(${i === 0 ? INK : SEP},.85)`; g.beginPath(); g.ellipse(x + Math.cos(a) * d, GY - 32 + Math.sin(a) * d * .17, r * (.75 + hf(j, i, 7) * .5), r * .62 * (.75 + hf(j, i, 7) * .5), hf(j, i, 8) * 3, 0, 7); g.fill(); }
      const ak = ease((t - when('grind', key) + .2) / .6) * fade(t, s.start, s.end + 1.5, .1, 1.2); ink(lab, x, GY - 150, 40, ak, { col: i === 1 ? INK : RED });
    });
    seal(790, -280, prog(t, s.end - 3, s.end - 2.2));
  };

  ST.espresso = (t, s) => {
    const D_ = s.end - s.start, R = (a, b) => ease(prog(t, s.start + a * D_, s.start + b * D_));
    blob(-350, -90, 280, 240, .08, GREY, 14, 0, 2);
    K('e1', box(-640, -330, 570, 440), 13, R(.02, .12)); K('e2', [[-680, -335], [-360, -362], [-30, -335]], 14, R(.1, .15));
    hatch('eh', -110, -300, 40, 400, 5, R(.14, .2), 3, INK, .35);
    K('e3', box(-470, 22, 240, 80), 10, R(.14, .2)); K('e3b', [[-350, 100], [-350, 128]], 12, R(.18, .22));
    K('e4', [[-250, 62], [-140, 70], [-92, 118]], 13, R(.2, .26)); K('e4b', circ(-92, 126, 14, 0, 6.4, 8), 7, R(.24, .28));
    K('e5', box(-690, 232, 620, 44), 10, R(.22, .28)); for (let i = 0; i < 9; i++) D([[-640 + i * 62, 246], [-630 + i * 62, 266]], 4, R(.26, .3), { noDry: true, noPool: true, a: .6 });
    K('e6', circ(-520, -190, 62, 0, 6.4, 18), 8, R(.16, .24)); K('e6b', circ(-520, -190, 46, .4, 6.6, 16), 3, R(.2, .26), { a: .4 });
    for (let i = 0; i <= 9; i++) { const an = lerp(-2.4, 2.4, i / 9) - 1.57; D([[-520 + Math.cos(an) * 36, -190 + Math.sin(an) * 36], [-520 + Math.cos(an) * 46, -190 + Math.sin(an) * 46]], 3, R(.2, .26), { noDry: true, noPool: true, a: .7 }); }
    const tb = when('espresso', 'เก้าบาร์'), bar = 9 * ease(prog(t, tb - 3, tb + .5)), an = lerp(-2.4, 2.4, bar / 10) - 1.57; D([[-520, -190], [-520 + Math.cos(an) * 40, -190 + Math.sin(an) * 40]], 5, R(.18, .26), { col: RED, noDry: true });
    K('e7', [[-560, -90], [-480, -96]], 5, R(.22, .28), { a: .5 });
    blob(-340, GY - 8, 120, 14, .3, GREY, 17, 0, 2); K('ecup', [[-450, 168], [-440, 246], [-396, 282], [-290, 282], [-246, 246], [-236, 168]], 11, R(.22, .3)); K('ecup2', circ(-228, 214, 38, -1.5, 1.5, 12), 9, R(.28, .33)); K('esau', circ(-343, 290, 138, 0, 6.4, 22, .1), 8, R(.28, .34), { a: .75 });
    const e0 = when('espresso', 'ผ่านผงกาแฟ'), e1 = when('espresso', 'ชั้นฟอง'), pf = ease(prog(t, e0, e1)), top = lerp(272, 192, pf);
    if (pf > 0) { g.save(); g.beginPath(); g.moveTo(-442, 192); g.lineTo(-432, 244); g.lineTo(-392, 276); g.lineTo(-294, 276); g.lineTo(-254, 244); g.lineTo(-244, 192); g.closePath(); g.clip(); g.fillStyle = `rgba(${INK},.9)`; g.fillRect(-460, top, 240, 100); g.restore(); }
    const cr = ease(prog(t, e1, e1 + 3)); if (cr > 0) blob(-343, top + 2, 98, 12, .55 * cr, SEP, 8, 0, 2);
    if (t > e0 && t < e1 + .3) D([[-350, 128], [-350 + Math.sin(t * 9) * 2, 160], [-343, top]], 6, 1, { noDry: true, uniform: true, noPool: true });
    if (t > e0 - 4 && t < e1) for (let i = 0; i < 4; i++) { const ph = (t * .9 + i * .25) % 1; g.fillStyle = `rgba(${INK},.75)`; g.beginPath(); g.ellipse(-350 + Math.sin(i * 7) * 6, 126 + ph * 54, 4, 7, 0, 0, 7); g.fill(); }
    for (let i = 0; i < 3; i++) wisp(-343 + (i - 1) * 40, 160, t, i, cr, 150, 12);
    const k1 = fade(t, tb - 2, s.end + 1, .8, 1.2); ink('9 บาร์', 420, -200, 126, k1); ink('≈ 9 เท่าของความดันอากาศ', 420, -150, 34, k1, { w: 400 });
    const t30 = when('espresso', 'สามสิบวินาที'), k2 = fade(t, t30 - .5, s.end + 1, .8, 1.2), sw = ease(prog(t, t30 - .2, t30 + 3.5));
    if (k2 > .01) { K('sw1', circ(420, 100, 88, 0, 6.4, 22), 9, k2, { a: .85 }); K('sw2', [[420, 4], [420, 14]], 14, k2, { a: .85 }); D([[420, 100], [420 + Math.sin(sw * 6.28) * 68, 100 - Math.cos(sw * 6.28) * 68]], 5, 1, { col: RED, noDry: true }, k2); ink('30 วินาที', 420, 240, 56, k2, { col: RED }); }
    const k3 = fade(t, when('espresso', 'เครมา') - .5, s.end + 2, .8, 1.2); ink('เครมา', -190, top - 40, 40, k3, { col: SEP, al: 'left' });
    seal(780, -330, prog(t, s.end - 3, s.end - 2.2));
  };

  ST.milk = (t, s) => {
    const D_ = s.end - s.start, R = (a, b) => ease(prog(t, s.start + a * D_, s.start + b * D_));
    blob(-60, 100, 230, 230, .08, GREY, 16, 0, 2);
    const cupPts = [[-210, -60], [-190, 160], [-140, 262], [50, 262], [100, 160], [120, -60]];
    K('m1', cupPts, 12, R(.02, .14)); K('m2', [[-210, -60], [-250, -90], [-276, -140]], 10, R(.12, .17)); K('m3', circ(124, 70, 74, -1.5, 1.5, 14), 10, R(.14, .2)); K('m3b', [[-230, -60], [100, -62]], 7, R(.12, .18), { a: .7 });
    hatch('mh', -170, -20, 240, 250, 6, R(.15, .22), 4, INK, .3);
    K('m5', box(330, -440, 290, 120), 12, R(.04, .12)); K('m4', [[470, -320], [470, -120], [340, 40], [60, 30]], 12, R(.12, .24));
    const milkLvl = lerp(190, 40, ease(prog(t, s.start + 3, when('milk', 'โปรตีนในนม') + 4)));
    g.save(); g.beginPath(); g.moveTo(-196, milkLvl); g.lineTo(-180, 160); g.lineTo(-132, 254); g.lineTo(42, 254); g.lineTo(92, 160); g.lineTo(108, milkLvl); g.closePath(); g.clip();
    const q = g.createLinearGradient(0, milkLvl, 0, 262); q.addColorStop(0, `rgba(${GREY},.2)`); q.addColorStop(1, `rgba(${GREY},.45)`); g.fillStyle = q; g.fillRect(-230, milkLvl, 380, 260); g.restore();
    const b70 = when('milk', 'เจ็ดสิบ'), over = ease(prog(t, b70, b70 + 4));
    D(Array.from({ length: 28 }, (_, i) => { const a = i * .5 + t * 1.2, r = 6 + i * 5.2; return [-45 + Math.cos(a) * r, milkLvl + Math.sin(a) * r * .16]; }), 5, ease(prog(t, s.start + 6, s.start + 12)), { a: .6 * (1 - over * .7), noDry: true, uniform: true, noPool: true });
    for (let i = 0; i < 9; i++) { const k = ease(prog(t, s.start + 7 + i * .5, s.start + 9 + i * .5)); if (k > 0) { g.strokeStyle = `rgba(${INK},${.5 * (1 - over * .6)})`; g.lineWidth = 2; g.beginPath(); g.arc(-150 + hf(i, 1, 3) * 230, milkLvl - 2, 3 + hf(i, 2, 3) * 6, 0, 7); g.stroke(); } }
    for (let i = 0; i < 3; i++) { const h = 60 + 120 * ease(prog(t, s.start + 2, s.start + 12)); wisp(-70 + i * 60, milkLvl - 30, t, i, 1, h, 16); }
    const a0 = when('milk', 'ใช้ไอน้ำ'), T = t < b70 ? lerp(8, 63, ease(prog(t, a0, b70 - 3))) : lerp(63, 76, ease(prog(t, b70, b70 + 4))), hot = T > 70;
    const ta = fade(t, s.start + 1.5, s.end + 1, 1, 1.2); ink(Math.round(T) + '°C', -470, -150, 124, ta, { col: hot ? RED : INK }); ink(hot ? 'ร้อนเกินไป ✗' : '60–65°C กำลังดี ✓', -470, -80, 44, ta * (T > 55 ? 1 : 0), { col: hot ? RED : INK });
    const tok = when('milk', 'หกสิบ'), rk = ease(prog(t, tok, tok + 3)) * (1 - over), cxC = 470, cyC = 150;
    K('lc1', [[cxC - 120, cyC - 10], [cxC - 104, cyC + 80], [cxC - 60, cyC + 118], [cxC + 60, cyC + 118], [cxC + 104, cyC + 80], [cxC + 120, cyC - 10]], 10, R(.3, .38)); K('lc2', circ(cxC, cyC - 10, 120, 0, 6.4, 22, .24), 8, R(.3, .38)); blob(cxC, cyC - 8, 108, 24, .5, SEP, 9, 0, 2);
    for (let i = 0; i < 4; i++) D([[cxC - 54 + i * 8, cyC - 8 - i * 3], [cxC + 54 - i * 8, cyC - 8 - i * 3]], 8, rk, { a: .5, col: '235,225,205', noDry: true, noPool: true });
    seal(780, 330, prog(t, s.end - 3, s.end - 2.2));
  };

  const mol = (x, y, col, big, seed, a = .85) => { const r = big ? 26 : 22; const hexp = (cx, cy, rr, rot) => Array.from({ length: 7 }, (_, i) => [cx + Math.cos(rot + i * 1.0472) * rr, cy + Math.sin(rot + i * 1.0472) * rr]); blob(x, y, r * 1.2, r * 1.2, .5 * a, col, seed, 0, 2); D(hexp(x, y, r, .3), 4, 1, { col, a: a, noDry: true, noPool: true, uniform: true }); D(hexp(x + r * 1.6, y + r * .3, r * .72, .9).slice(0, 6), 3.4, 1, { col, a: a, noDry: true, noPool: true, uniform: true }); g.fillStyle = `rgba(${col},${a})`; [[-.5, -1.4], [1.4, -1], [-1.5, .9]].forEach(([dx, dy]) => { g.beginPath(); g.arc(x + dx * r, y + dy * r, 5.5, 0, 7); g.fill(); }); };
  ST.caffeine = (t, s) => {
    const D_ = s.end - s.start, R = (a, b) => ease(prog(t, s.start + a * D_, s.start + b * D_));
    blob(-640, 160, 130, 130, .08, GREY, 18, 0, 2);
    K('c1', [[-770, 110], [-760, 220], [-715, 270], [-565, 270], [-520, 220], [-510, 110]], 11, R(.02, .1)); K('c2', circ(-495, 170, 38, -1.4, 1.5, 10), 9, R(.08, .13)); K('c3', circ(-640, 280, 160, 0, 6.4, 22, .09), 8, R(.1, .15), { a: .75 }); blob(-640, 118, 120, 14, .8, INK, 4, 0, 2);
    for (let i = 0; i < 3; i++) wisp(-640 + (i - 1) * 40, 100, t, i, 1, 150, 12);
    K('cm', [[-300, 190], [-60, 178], [200, 195], [460, 180], [700, 192], [860, 186]], 30, R(.06, .2), { a: .85, noDry: true, blunt: true, noPool: true }); hatch('cmh', -280, 200, 1100, 70, 18, R(.1, .22), 6, INK, .3);
    const sock = [10, 310, 610], tAd = when('caffeine', 'อะดีโนซีน'), tBlock = when('caffeine', 'แย่งจับ');
    sock.forEach((x, i) => K('cs' + i, circ(x, 168, 62, 2.7, 6.8, 14), 12, R(.18, .26), { col: JADE, a: .95, noDry: true }));
    for (let i = 0; i < 6; i++) {
      const k = i % 3, sx = sock[k], blockedAt = tBlock + k * 1.2 + 1.2, blocked = t > blockedAt; let x, y;
      if (t < tAd - 1) { x = sx + Math.cos(t * .5 + i) * 220; y = -110 + Math.sin(t * .7 + i * 2) * 90; }
      else if (!blocked) { const app = ease(prog(t, tAd + i * .3, tAd + i * .3 + 2.2)); x = lerp(sx + Math.cos(t * .5 + i) * 220, sx, app); y = lerp(-110 + Math.sin(t * .7 + i * 2) * 90, 130, app); if (i >= 3) { x = sx + 60 * Math.sin(i * 3) + Math.cos(t * .4 + i) * 40; y = -50 + Math.sin(t * 1.1 + i) * 30; } }
      else { const bn = Math.abs(Math.sin(t * 2 + i)); x = sx + Math.cos(t * .5 + i) * (80 + 160 * (1 - bn)); y = -80 - bn * 110; }
      mol(x - 20, y, INK, false, i);
    }
    for (let k = 0; k < 3; k++) { const t0 = tBlock + k * 1.2, a = ease(prog(t, t0, t0 + 1.4)); if (t > t0 - 3) mol(lerp(sock[k] - 200 + k * 60, sock[k], a) - 20, lerp(-230 - k * 30, 130, a), RED, true, k + 20, 1); }
    const lab = (txt_, x, y, t0, col) => ink(txt_, x, y, 38, ease((t - t0) / .6) * fade(t, s.start, s.end + 1.5, .1, 1.2), { col });
    lab('อะดีโนซีน', 10, -300, tAd - .2, INK); lab('ตัวรับ', 310, 280, when('caffeine', 'ตัวรับ'), JADE); lab('คาเฟอีน', 610, -300, when('caffeine', 'คาเฟอีนมี') - .2, RED);
    const th = when('caffeine', 'ครึ่งหนึ่ง'), a = fade(t, th - 5, s.end + 1.5, .8, 1.2);
    [['0', 1], ['5–6 ชม.', .5]].forEach(([l, v], i) => { const kk = ease((t - (th - 4 + i * 1.2)) / .8) * a; if (kk > 0) { D([[790 + i * 130, 120], [790 + i * 130 + 2, 120 - 330 * v * kk]], 56, 1, { col: RED, a: .85, noDry: true, tail: .98, uniform: true }); ink(l, 790 + i * 130, 160, 30, kk, { w: 400 }); } });
    seal(-760, -330, prog(t, s.end - 3, s.end - 2.2));
  };

  ST.cool = (t, s) => {
    const D_ = s.end - s.start, R = (a, b) => ease(prog(t, s.start + a * D_, s.start + b * D_));
    blob(-190, 120, 250, 190, .08, GREY, 22, 0, 2);
    K('k1', [[-420, -20], [-400, 170], [-330, 262], [-60, 262], [10, 170], [30, -20]], 14, R(.02, .13)); K('k2', circ(62, 90, 78, -1.5, 1.6, 12), 12, R(.1, .16)); K('k3', circ(-195, 285, 280, 0, 6.4, 24, .06), 9, R(.12, .18), { a: .75 });
    g.save(); g.beginPath(); g.ellipse(-195, -20, 222, 36, 0, 0, 7); g.clip(); g.fillStyle = `rgba(${INK},.82)`; g.fillRect(-440, -70, 480, 80); g.restore(); K('k4', circ(-195, -20, 224, 0, 6.4, 22, .16), 9, R(.1, .16));
    hatch('kh', -380, 20, 330, 230, 7, R(.14, .22), 5, INK, .3);
    const tl = when('cool', 'ปิดฝา'), drop = ease(prog(t, tl, tl + 1.2)), ly = lerp(-420, -42, drop);
    if (t > tl - 1) { D([[-450, ly], [-195, ly + 12], [50, ly]], 20, 1, { a: .9, noDry: true, uniform: true }); D([[-215, ly - 10], [-195, ly - 30], [-175, ly - 10]], 11, 1, { noDry: true }); }
    for (let i = 0; i < 4; i++) wisp(-290 + i * 62, -50, t, i, (1 - drop) * sstep(0, 2, t - s.start), 230, 18);
    const tp = when('cool', 'ถ่ายเท'), te = when('cool', 'ระเหย'), arrOn = 1 - drop;
    arrow(40, 70, 170, 40, 11, ease(prog(t, tp, tp + 1)) * arrOn); arrow(-430, 70, -560, 40, 11, ease(prog(t, tp + .8, tp + 1.8)) * arrOn); arrow(-195, -150, -195, -340, 13, ease(prog(t, te - .3, te + 1)) * arrOn);
    const lab = (txt_, x, y, t0) => ink(txt_, x, y, 36, ease((t - t0) / .6) * fade(t, s.start, tl + 2, .1, 1.2), { col: RED });
    lab('แก้ว', 250, 40, tp); lab('อากาศ', -650, 60, tp + 1); lab('ระเหย (มากที่สุด)', -195, -365, te);
    const a = fade(t, s.start + 2, s.end + 1.5, 1, 1.2), cx = 400, cy = 230, cw = 450, ch = 380;
    D([[cx, cy - ch], [cx, cy], [cx + cw, cy]], 6, a, { noDry: true, uniform: true, a: .7 }); for (let i = 1; i < 4; i++) D([[cx + 10, cy - ch * i / 4], [cx + cw, cy - ch * i / 4]], 2, a, { noDry: true, a: .22, noPool: true });
    const dur = s.end - s.start - 3, t0 = s.start + 2, pr = prog(t, t0, t0 + dur);
    [[RED, .1], [INK, .018]].forEach(([col, rate]) => { const pts = []; for (let i = 0; i <= 40; i++) { const x = i / 40; if (x > pr) break; const T = 25 + 65 * Math.exp(-x * 60 * rate); pts.push([cx + x * cw, cy - ((T - 20) / 75) * ch]); } if (pts.length > 2) D(pts, 9, 1, { col, noDry: true, a: .85 * a, tail: .95 }); });
    ink('ไม่มีฝา', cx + 250, cy - 70, 32, a, { col: RED, w: 400 }); ink('มีฝา', cx + 420, cy - 270, 32, a, { w: 400 }); ink('อุณหภูมิ ↑  เวลา →', cx + cw / 2, cy + 60, 28, a, { w: 400 });
    seal(-760, -330, prog(t, s.end - 3, s.end - 2.2));
  };

  ST.cold = (t, s) => {
    const D_ = s.end - s.start, R = (a, b) => ease(prog(t, s.start + a * D_, s.start + b * D_));
    blob(-400, 100, 200, 240, .08, GREY, 25, 0, 2); blob(380, 100, 160, 240, .08, GREY, 26, 0, 2);
    K('d1', [[-560, -140], [-570, 255], [-290, 255], [-280, -140]], 13, R(.02, .13)); K('d1b', [[-590, -140], [-560, -176], [-290, -176], [-262, -140]], 10, R(.12, .17));
    K('d1c', [[-575, 255], [-425, 270], [-278, 255]], 8, R(.12, .18), { a: .7 });
    g.save(); g.beginPath(); g.rect(-556, -60, 268, 310); g.clip(); blob(-425, 90, 128, 175, .42, SEP, 3, 0, 3); g.restore();
    if (R(.02, .15) > .95) for (let i = 0; i < 46; i++) { g.fillStyle = `rgba(${INK},.6)`; g.beginPath(); g.arc(-425 + (hf(i, 1, 3) - .5) * 220, -40 + hf(i, 2, 3) * 280 + Math.sin(t * .5 + i) * 4, 2.2, 0, 7); g.fill(); }
    K('bag1', [[-470, -110], [-478, 40], [-425, 76], [-372, 40], [-382, -110]], 8, R(.1, .2), { a: .85 }); for (let i = 0; i < 5; i++) D([[-474 + i * 24, -100], [-470 + i * 24 + (i % 2 ? 4 : -4), 60]], 1.8, R(.16, .22), { a: .4, noDry: true, noPool: true }); K('bag2', [[-425, -110], [-410, -150], [-380, -190]], 5, R(.12, .2));
    K('d2', [[210, -160], [235, 255], [490, 255], [515, -160]], 13, R(.1, .2)); K('d2c', [[195, 255], [360, 272], [525, 255]], 8, R(.16, .22), { a: .7 });
    const ti = when('cold', 'น้ำแข็ง'), lvl = lerp(10, -50, ease(prog(t, ti, ti + 2)));
    g.save(); g.beginPath(); g.moveTo(222, lvl); g.lineTo(242, 248); g.lineTo(484, 248); g.lineTo(504, lvl); g.closePath(); g.clip(); g.fillStyle = `rgba(${INK},.86)`; g.fillRect(190, lvl, 350, 320); g.restore();
    for (let i = 0; i < 5; i++) { const t0 = ti + i * .35, k = prog(t, t0, t0 + .9); if (t < t0) continue; const x = 285 + hf(i, 1, 8) * 150 + (i % 2) * 20, y = lerp(-420, lvl - 36 + (i % 2) * 20 + Math.floor(i / 2) * 22, k * k) + (k >= 1 ? Math.sin((t - t0) * 1.3 + i) * 3 : 0); g.save(); g.translate(x, y); g.rotate(k * 2.4 * (1 - k) + i * .3); g.fillStyle = 'rgba(150,178,190,.42)'; g.strokeStyle = `rgba(${GREY},.8)`; g.lineWidth = 3.5; g.beginPath(); g.roundRect(-33, -33, 66, 66, 9); g.fill(); g.stroke(); g.strokeStyle = 'rgba(80,110,125,.45)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-18, -14); g.lineTo(-4, -22); g.moveTo(8, 12); g.lineTo(20, 4); g.stroke(); g.restore(); }
    const a = fade(t, s.start + 1, when('cold', 'ส่วนน้ำแข็ง'), 1, 1), hrs = 12 * ease(prog(t, s.start + 1, when('cold', 'ผลที่ได้')));
    if (a > 0) { K('dc', circ(-60, -250, 96, 0, 6.4, 18), 9, a, { a: .85 }); for (let i = 0; i < 12; i++) { const an = i * .5236; D([[-60 + Math.sin(an) * 80, -250 - Math.cos(an) * 80], [-60 + Math.sin(an) * 90, -250 - Math.cos(an) * 90]], 3, 1, { noDry: true, noPool: true, a: .6 }, a); } D([[-60, -250], [-60 + Math.sin(hrs / 12 * 6.283) * 56, -250 - Math.cos(hrs / 12 * 6.283) * 56]], 8, 1, { a, noDry: true }); D([[-60, -250], [-60 + Math.sin(hrs * 6.283) * 78, -250 - Math.cos(hrs * 6.283) * 78]], 5, 1, { col: RED, a, noDry: true }); ink(Math.round(hrs) + ' ชม.', -60, -100, 68, a, { col: RED }); }
    const b = fade(t, when('cold', 'น้ำแข็งที่ใส่') - .5, s.end + 1.5, .8, 1.2); ink('น้ำแข็งดูดความร้อนเพื่อละลาย', 360, -300, 44, b, { col: GREY });
    seal(780, -330, prog(t, s.end - 3, s.end - 2.2));
  };

  ST.ring = (t, s) => {
    const p = ease(prog(t, when('ring', 'ขณะที่หยดน้ำ') - 1, s.end - 1)), R0 = 330, grow = ease(prog(t, s.start, s.start + 3)), cy = 60;
    blob(0, cy, R0 * grow, R0 * .95 * grow, .5 * (1 - p * .75) + .12, INK, 11, 0, 4);
    if (grow > .5) for (let k = 0; k < 3; k++) K('rr' + k, circ(0, cy, R0 - 6 - k * 3, k * .4, 6.6 + k * .4, 28, .95), 6 + 18 * p, ease(prog(t, s.start + 2, s.start + 4)), { a: .25 + .6 * p, noDry: p < .5, dry: .15, noPool: true });
    for (let i = 0; i < 180; i++) { const a = hf(i, 1, 5) * 6.28, r0 = Math.sqrt(hf(i, 2, 5)) * R0 * .9, ph = hf(i, 3, 5), k = clamp(p * 1.15 * (.45 + ph * .55)), r = lerp(r0, R0 * (.97 - .04 * ph), k); g.fillStyle = `rgba(${INK},.62)`; g.beginPath(); g.arc(Math.cos(a) * r, cy + Math.sin(a) * r * .95, 2.4, 0, 7); g.fill(); }
    const tf = when('ring', 'น้ำจึงไหล'); for (let i = 0; i < 12; i++) { const a = i * .5236 + .2; arrow(Math.cos(a) * 100, cy + Math.sin(a) * 100, Math.cos(a) * 235, cy + Math.sin(a) * 235, 5, ease(prog(t, tf - .5 + i * .05, tf + 1.5)) * (1 - p * .6), INK); }
    ink('วงแหวนกาแฟ', -520, -250, 80, fade(t, s.start + .5, s.end + 1, .8, 1.2));
    K('rcup', [[-790, 200], [-730, 322], [-660, 346], [-570, 300], [-595, 180]], 11, ease(prog(t, s.start + 1, s.start + 3)), { a: .85 });
    seal(780, 330, prog(t, s.end - 3, s.end - 2.2));
  };

  // ---------- foreground: plum branch, petals, title ----------
  function plum(t) {
    g.save(); g.scale(.72, .72); try { plum0(t); } finally { g.restore(); }
    if (t > 5) petals(t);
  }
  function plum0(t) {
    const k = ease(prog(t, .6, 5)), sw = Math.sin(t * .7) * 3;
    K('pb1', [[-30, 70], [150, 105], [310, 82], [450, 150], [560, 140]], 17, k, { a: .88, dry: .6 });
    K('pb2', [[160, 100], [190, 30], [270, -10]], 9, ease(prog(t, 1.6, 5.5)), { a: .85, dry: .5 }); K('pb3', [[330, 90], [380, 190], [430, 230]], 8, ease(prog(t, 2.2, 6)), { a: .85, dry: .5 }); K('pb4', [[450, 150], [500, 215], [570, 230]], 6, ease(prog(t, 2.8, 6.4)), { a: .85 });
    [[190, 30], [270, -10], [240, 12], [380, 190], [430, 230], [330, 94], [500, 215], [570, 230], [560, 140], [450, 150], [150, 105], [90, 90]].forEach(([x, y], i) => { const b = ease(prog(t, 3 + i * .35, 5.5 + i * .35)); if (b <= 0) return; const r = 15 * b + Math.sin(t * .8 + i) * .7; for (let q = 0; q < 5; q++) { const an = q * 1.2566 + i; blob(x + sw + Math.cos(an) * r * .75, y + Math.sin(an) * r * .75, r * .7, r * .7, .7, i % 3 ? PINK : RED, i * 5 + q, 0, 2); } g.fillStyle = `rgba(${INK},.7)`; g.beginPath(); g.arc(x + sw, y, 3.2 * b, 0, 7); g.fill(); });
  }
  function petals(t) {
    for (let i = 0; i < 14; i++) { const x = ((hf(i, 1, 4) * (W + 400) - t * (14 + hf(i, 2, 4) * 14)) % (W + 400) + W + 400) % (W + 400) - 100, y = (hf(i, 3, 4) * H + t * (26 + hf(i, 5, 4) * 20)) % (H + 100) - 50; g.save(); g.translate(x, y); g.rotate(t * (.6 + hf(i, 6, 4)) + i); g.fillStyle = `rgba(${i % 3 ? PINK : RED},.55)`; g.beginPath(); g.ellipse(0, 0, 7, 4, 0, 0, 7); g.fill(); g.restore(); }
  }
  function titleLayer(t, s) {
    const ak = fade(t, s.start + 1.5, s.start + 14, 1.8, 1.8), wipe = ease(prog(t, s.start + 1.5, s.start + 5));
    if (ak > .01) {
      g.save(); const tc = mk(1500, 330), q = tc.getContext('2d'); q.font = `700 124px ${FONT}`; q.textAlign = 'center'; q.fillStyle = `rgb(${INK})`; q.shadowColor = `rgba(${INK},.5)`; q.shadowBlur = 8; q.fillText('ร้านกาแฟ', 750, 150); q.fillText('เล่าวิทยาศาสตร์', 750, 292);
      q.globalCompositeOperation = 'destination-in'; q.shadowBlur = 0; const gr = q.createLinearGradient(0, 0, 1500, 0), e = wipe * 1.3 - .15; gr.addColorStop(clamp(e - .15), 'rgba(0,0,0,1)'); gr.addColorStop(clamp(e), 'rgba(0,0,0,0)'); q.fillStyle = gr; q.fillRect(0, 0, 1500, 330);
      g.globalAlpha = ak; g.drawImage(tc, CX + 400 - 750, 300); g.restore();
      ink('ทุกแก้วคือห้องทดลอง', CX + 400, 690, 46, ak * ease(prog(t, s.start + 4, s.start + 6)), { w: 400, col: RED, ls: 6 });
      seal(CX + 800, 340, prog(t, s.start + 5.5, s.start + 6.5));
    }
  }

  // ---------- composition ----------
  const scenes = ORDER.map((k, i) => ({ k, s: SEG[k], i }));
  const stIdx = (k) => NAMES.indexOf(k);
  const focusX = (k) => (k === 'intro' ? SXw(0) - 1100 : k === 'outro' ? SXw(7) : SXw(stIdx(k)));
  const poseOf = (e, t) => {
    const u = clamp((t - e.s.start) / (e.s.end - e.s.start));
    if (e.k === 'outro') { const k = ease(prog(t, e.s.start + .5, e.s.start + 9)); return [lerp(SXw(7), SXw(3.5) + 400, k), lerp(1, .13, k)]; }
    return [focusX(e.k) + lerp(-90, 90, u), e.k === 'intro' ? 1 : 1 + .04 * Math.sin(u * 3.14)];
  };
  const TS = scenes.map((e, i) => (i < scenes.length - 1 ? e.s.end - 1.8 : 1e9)), TE = scenes.map((e, i) => (i < scenes.length - 1 ? scenes[i + 1].s.start + 1.2 : 1e9));

  function frame(t) {
    let j = 0; while (j < scenes.length - 1 && t >= TE[j]) j++;
    let P = poseOf(scenes[j], t);
    if (j < scenes.length - 1 && t >= TS[j]) { const k = ease((t - TS[j]) / (TE[j] - TS[j])), Q = poseOf(scenes[j + 1], t); P = [lerp(P[0], Q[0], k), Math.exp(lerp(Math.log(P[1]), Math.log(Q[1]), k))]; }
    const [camX, zoom] = P;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    backdrop(t, camX);
    g.save(); g.translate(CX, CY + 20 * (1 - zoom)); g.scale(zoom, zoom); g.translate(-camX, 0);
    const vis = (x) => Math.abs(x - camX) * zoom < W / 2 + 1100 * zoom;
    for (let i = -1; i < 8; i++) counter(i, vis);
    scenes.forEach((e) => { if (e.k === 'intro' || e.k === 'outro') return; const cx = SXw(stIdx(e.k)); if (!vis(cx)) return; g.save(); g.translate(cx, 0); ST[e.k](t, e.s); g.restore(); });
    g.restore();
    plum(t);
    const sI = SEG.intro, sO = SEG.outro; titleLayer(t, sI);
    const ao = ease((t - (sO.end - 8)) / 1.4) * ease((TL.duration - 1 - t) / 1.2); ink('ขอบคุณที่รับชมครับ', CX, 330, 120, ao); ink('วิทยาศาสตร์อยู่ในทุกแก้ว', CX, 410, 50, ao * ease((t - (sO.end - 6.5)) / 1.2), { col: RED, w: 400, ls: 4 }); seal(CX + 520, 300, prog(t, sO.end - 5, sO.end - 4));
    g.save(); g.globalCompositeOperation = 'destination-out'; g.globalAlpha = .55; g.drawImage(grain, 0, 0); g.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(paper, 0, 0);
    ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(inkC, 0, 0); ctx.globalCompositeOperation = 'source-over';
    let d = 0; if (t < 1.2) d = 1 - t / 1.2; if (t > TL.duration - 1.5) d = Math.max(d, (t - (TL.duration - 1.5)) / 1.5);
    if (d > 0) { ctx.fillStyle = `rgba(241,233,214,${clamp(d)})`; ctx.fillRect(0, 0, W, H); }
  }
  window.frame = frame; window.grabPNG = (t) => { frame(t); return out.toDataURL('image/png').split(',')[1]; };
  Promise.all([document.fonts.load('700 46px NST', 'กขคabc'), document.fonts.load('400 30px NST', 'กขคabc')]).then(() => document.fonts.ready).then(() => { frame(0); window.READY = true; });
})();
