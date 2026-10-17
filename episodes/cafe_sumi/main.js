/* ร้านกาแฟเล่าวิทยาศาสตร์ — sumi-e emaki (ink-wash scroll). One continuous scroll painting; the camera slides along it.
   frame(t) is a pure function of time t (seconds). 2D canvas only. */
(function () {
  const W = 1920, H = 1080, CX = W / 2, CY = H / 2;
  const TL = window.TIMELINE, SEG = {};
  TL.segments.forEach((s) => (SEG[s.key] = s));
  const ORDER = TL.segments.map((s) => s.key);
  const FONT = "'NST','Noto Sans Thai',sans-serif";
  const INK = '26,21,17', RED = '192,56,42', SEP = '120,84,48', GREY = '70,64,58';

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

  // ---------- paper ----------
  const paper = (() => {
    const w = 960, h = 540, c = mk(w, h), q = c.getContext('2d'), im = q.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const n = fbm2(x / 90, y / 90, 3, 4), m = fbm2(x / 6, y / 6, 9, 2), i = (y * w + x) * 4;
      const v = .93 + (n - .5) * .09 + (m - .5) * .04, d = Math.hypot(x / w - .5, y / h - .5);
      const vig = 1 - Math.pow(d * 1.25, 3) * .22;
      im.data[i] = 240 * v * vig; im.data[i + 1] = 231 * v * vig; im.data[i + 2] = 212 * v * vig; im.data[i + 3] = 255;
    }
    q.putImageData(im, 0, 0);
    q.globalAlpha = .06; q.strokeStyle = '#7b6a4a'; q.lineWidth = .7; let sd = 3; const r = () => ((sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 900; i++) { const x = r() * w, y = r() * h, a = r() * 6.28, l = 4 + r() * 12; q.beginPath(); q.moveTo(x, y); q.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); q.stroke(); }
    const full = mk(); const fq = full.getContext('2d'); fq.imageSmoothingQuality = 'high'; fq.drawImage(c, 0, 0, W, H); return full;
  })();

  // ---------- brush engine ----------
  function smooth(pts, step = 3) { // Catmull-Rom, resampled ~step px
    const P = [pts[0], ...pts, pts[pts.length - 1]], dense = [];
    for (let i = 1; i < P.length - 2; i++) {
      const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]], seglen = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), n = Math.max(2, Math.ceil(seglen / step));
      for (let k = 0; k < n; k++) { const u = k / n, u2 = u * u, u3 = u2 * u; dense.push([.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3), .5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3)]); }
    }
    dense.push(pts[pts.length - 1]); return dense;
  }
  const cache = new Map();
  function build(pts, w, o) {
    const sm = smooth(pts, o.step || 3), n = sm.length, nx = [], ny = [], cum = [0];
    for (let i = 0; i < n; i++) { const a = sm[Math.max(0, i - 1)], b = sm[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; nx.push(-dy / l); ny.push(dx / l); if (i) cum.push(cum[i - 1] + Math.hypot(sm[i][0] - sm[i - 1][0], sm[i][1] - sm[i - 1][1])); }
    return { sm, n, nx, ny, cum, L: cum[n - 1] || 1, w, o, seed: o.seed || Math.floor(hf(Math.round(pts[0][0]), Math.round(pts[0][1]), 7) * 1000) };
  }
  function drawS(S, p, alphaMul = 1) {
    const { sm, n, nx, ny, cum, L, w, o, seed } = S, m = Math.max(2, Math.min(n, Math.floor(n * p) + 1)), col = o.col || INK, a0 = (o.a === undefined ? .88 : o.a) * alphaMul;
    const uniform = o.uniform, wl = [], wr = [];
    for (let i = 0; i < m; i++) {
      const s = i / (n - 1), head = sstep(0, .05, s), tail = 1 - .8 * sstep(o.tail || .8, 1, s);
      const base = uniform ? w * (.9 + .2 * vn(cum[i] / 14, seed)) : w * (.45 + .55 * head) * tail * (.82 + .36 * vn(cum[i] / 10, seed));
      const j1 = (vn(cum[i] / 5, seed + 1) - .5) * base * .22, j2 = (vn(cum[i] / 5, seed + 2) - .5) * base * .22;
      wl.push([sm[i][0] + nx[i] * (base / 2 + j1), sm[i][1] + ny[i] * (base / 2 + j1)]); wr.push([sm[i][0] - nx[i] * (base / 2 + j2), sm[i][1] - ny[i] * (base / 2 + j2)]);
    }
    const path = (pad) => { g.beginPath(); g.moveTo(wl[0][0], wl[0][1]); for (let i = 1; i < m; i++) g.lineTo(wl[i][0], wl[i][1]); for (let i = m - 1; i >= 0; i--) g.lineTo(wr[i][0], wr[i][1]); g.closePath(); };
    g.save();
    g.lineJoin = 'round'; g.lineWidth = Math.max(2, w * .5);
    g.strokeStyle = `rgba(${col},${a0 * .08})`; path(); g.stroke(); // soft bleed
    g.fillStyle = `rgba(${col},${a0})`; path(); g.fill();
    if (!o.noDry && w > 5) { // dry-brush bristle gaps
      g.globalCompositeOperation = 'destination-out'; g.lineWidth = 1.4;
      const dry = o.dry === undefined ? .45 : o.dry;
      for (let k = 0; k < 5; k++) {
        const f = ((k + .5) / 5 * 2 - 1) * .78; g.beginPath(); let pen = false;
        for (let i = 0; i < m; i += 2) {
          const s = i / (n - 1), thr = 1 - dry * (.12 + .88 * s * s), v = vn(cum[i] / 7, seed * 3 + k * 11);
          const bw = (Math.hypot(wl[i][0] - wr[i][0], wl[i][1] - wr[i][1])) / 2 * f, x = sm[i][0] + nx[i] * bw, y = sm[i][1] + ny[i] * bw;
          if (v > thr) { pen ? g.lineTo(x, y) : g.moveTo(x, y); pen = true; } else pen = false;
        }
        g.strokeStyle = `rgba(0,0,0,${.5})`; g.stroke();
      }
    }
    g.restore();
  }
  // stroke with caching; u in [0,1] progress
  function K(key, pts, w, p, o = {}, am = 1) { if (p <= .001) return; let S = cache.get(key); if (!S) { S = build(pts, w, o); cache.set(key, S); } drawS(S, p, am); }
  function D(pts, w, p, o = {}, am = 1) { if (p <= .001) return; drawS(build(pts, w, o), p, am); }
  const circ = (cx, cy, r, a0 = 0, a1 = Math.PI * 2, n = 18, sq = 1) => Array.from({ length: n + 1 }, (_, i) => { const a = lerp(a0, a1, i / n); return [cx + Math.cos(a) * r, cy + Math.sin(a) * r * sq]; });
  const rect = (x, y, w, h) => [[x, y], [x + w, y + 2], [x + w + 3, y + h], [x + 2, y + h + 3], [x + 1, y - 6]];
  // washes
  function wash(cx, cy, rx, ry, a, col = INK, seed = 1, rot = 0) {
    g.save(); g.translate(cx, cy); g.rotate(rot);
    for (let k = 0; k < 3; k++) {
      const ox = (hf(seed, k, 1) - .5) * rx * .25, oy = (hf(seed, k, 2) - .5) * ry * .25, sx = 1 - k * .12;
      g.save(); g.translate(ox, oy); g.scale(rx * sx, ry * sx); const q = g.createRadialGradient(0, 0, 0, 0, 0, 1); q.addColorStop(0, `rgba(${col},${a * .5})`); q.addColorStop(.7, `rgba(${col},${a * .38})`); q.addColorStop(.93, `rgba(${col},${a * .55})`); q.addColorStop(1, `rgba(${col},0)`); g.fillStyle = q; g.beginPath(); g.arc(0, 0, 1, 0, 7); g.fill(); g.restore();
    }
    g.restore();
  }
  function ink(s, x, y, size, a = 1, o = {}) { if (a <= .01) return; g.save(); g.font = `${o.w || 700} ${size}px ${FONT}`; g.textAlign = o.al || 'center'; g.textBaseline = 'alphabetic'; if (o.ls) g.letterSpacing = o.ls + 'px'; g.fillStyle = `rgba(${o.col || INK},${a * (o.k || .92)})`; g.shadowColor = `rgba(${o.col || INK},${a * .35})`; g.shadowBlur = 5; g.fillText(s, x, y); g.restore(); }
  function seal(x, y, k, size = 92) { if (k <= .02) return; const sc = 1 + (1 - ease(k * 1.6)) * .5; g.save(); g.translate(x, y); g.rotate(-.06); g.scale(sc, sc); g.globalAlpha = clamp(k * 3); g.fillStyle = `rgba(${RED},.9)`; g.beginPath(); g.roundRect(-size / 2, -size / 2, size, size, 7); g.fill(); g.globalCompositeOperation = 'destination-out'; g.lineWidth = 5; g.strokeStyle = '#000'; g.beginPath(); g.ellipse(0, 0, size * .22, size * .3, .5, 0, 7); g.stroke(); g.beginPath(); g.moveTo(-size * .14, size * .2); g.quadraticCurveTo(0, -size * .06, size * .14, -size * .2); g.stroke(); g.restore(); }
  const arrow = (x0, y0, x1, y1, w, p, col = RED, key) => { const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l; D([[x0, y0], [x0 + dx * .5 + uy * 8, y0 + dy * .5 - ux * 8], [x1, y1]], w, p, { col, noDry: true, tail: .95 }); if (p > .95) { D([[x1 - ux * 28 + uy * 16, y1 - uy * 28 - ux * 16], [x1, y1], [x1 - ux * 28 - uy * 16, y1 - uy * 28 + ux * 16]], w * .8, 1, { col, noDry: true }); } };

  // ---------- scroll layout ----------
  const SP = 2000, SXw = (i) => i * SP; // station spacing along the scroll
  const NAMES = ['roast', 'grind', 'espresso', 'milk', 'caffeine', 'cool', 'cold', 'ring'];

  // decor: mountain washes (parallax) + bamboo strokes between stations
  function mountains(camX, scale) {
    for (let L = 0; L < 3; L++) {
      const par = .25 + L * .12, ofs = camX * par, base = 760 - L * 40, amp = 190 - L * 38, al = .07 + L * .035;
      g.save(); g.beginPath(); g.moveTo(-50, H + 20);
      for (let x = -50; x <= W + 50; x += 14) { const wx = (x + ofs) / (1.4 + L * .5) / 70; const y = base - (fbm2(wx + L * 13, L * 3, 40 + L, 4) - .25) * amp * 2; g.lineTo(x, y); }
      g.lineTo(W + 50, H + 20); g.closePath(); const q = g.createLinearGradient(0, base - amp, 0, H); q.addColorStop(0, `rgba(${GREY},${al})`); q.addColorStop(.6, `rgba(${GREY},${al * .5})`); q.addColorStop(1, `rgba(${GREY},0)`); g.fillStyle = q; g.fill(); g.restore();
    }
  }
  function bamboo(x, y, s, a) { // static decor stalk in world coords
    const key = 'bam' + x;
    K(key, [[x, y], [x + 8, y - 200], [x - 6, y - 420], [x + 4, y - 640]], 12 * s, 1, { a: a * .55, uniform: true, noDry: true });
    for (let i = 1; i < 4; i++) D([[x - 14, y - i * 160], [x + 14, y - i * 160 + 2]], 5, 1, { a: a * .5, noDry: true });
    for (let i = 0; i < 5; i++) { const ly = y - 260 - i * 80, d = i % 2 ? 1 : -1; K(key + 'l' + i, [[x, ly], [x + d * 70, ly - 25], [x + d * 140, ly + 18]], 9 * s, 1, { a: a * .6, tail: .5 }); }
  }

  // ---------- stations: each draws in local coords (0,0 = screen centre when focused) ----------
  const ST = {};
  const bean = (cx, cy, rx, ry, dark, rot = 0, k = 'b', seed = 1) => { g.save(); g.translate(cx, cy); g.rotate(rot); wash(0, 0, rx, ry, .25 + .72 * dark, INK, seed); D(circ(0, 0, 1, 0, 6.5, 22, ry / rx).map(([x, y]) => [x * rx, y * rx]), Math.max(3, rx * .05), 1, { a: .75, noDry: true, uniform: true }); g.globalCompositeOperation = 'destination-out'; g.lineWidth = Math.max(2.5, rx * .06); g.strokeStyle = `rgba(0,0,0,${.4 + .5 * dark})`; g.beginPath(); g.moveTo(-rx * .8, 0); g.bezierCurveTo(-rx * .3, -ry * .25, rx * .3, ry * .25, rx * .8, 0); g.stroke(); g.restore(); };

  ST.roast = (t, s) => {
    const D_ = s.end - s.start, R = (a, b) => ease(prog(t, s.start + a * D_, s.start + b * D_));
    const tb = when('roast', 'หนึ่งร้อยสี่สิบ'), tc = when('roast', 'สองร้อย'), T = t < tb ? lerp(25, 140, ease(prog(t, s.start + 1, tb))) : lerp(140, 200, ease(prog(t, tb, tc)));
    const dark = clamp((T - 25) / 190);
    // roaster
    K('r1', rect(-720, -150, 420, 400), 11, R(.02, .12)); K('r2', [[-760, -150], [-540, -165], [-280, -150]], 12, R(.1, .15));
    K('r3', [[-640, -150], [-600, -310], [-420, -310], [-380, -150]], 9, R(.14, .2));
    K('r4', circ(-510, 70, 118, 0, 6.4, 22), 9, R(.18, .26)); K('r5', circ(-510, 70, 86, .5, 6.9, 20), 4, R(.24, .3), { a: .5 });
    wash(-510, 70, 102, 102, .2 + .5 * sstep(60, 200, T), RED, 5);
    K('r6', circ(-690, -75, 34, 0, 6.4, 14), 5, R(.2, .26)); { const a = lerp(-2.2, 2.2, dark); D([[-690, -75], [-690 + Math.sin(a) * 28, -75 - Math.cos(a) * 28]], 4, R(.22, .27), { col: RED, noDry: true }); }
    for (let i = 0; i < 3; i++) { const fl = 1 + .25 * Math.sin(t * 6 + i * 2); D([[-580 + i * 60, 270], [-590 + i * 60, 240 - 18 * fl], [-570 + i * 60, 215 - 34 * fl], [-585 + i * 60, 190 - 50 * fl]], 9, R(.3, .36) * sstep(30, 120, T), { col: RED, a: .8, noDry: true }); }
    // hero bean
    bean(130, -40, 200, 140, dark, -.18 + Math.sin(t * .6) * .03, 'h', 4);
    // tray with beans
    K('r7', circ(250, 300, 340, 0, 6.4, 30, .18), 8, R(.34, .42));
    for (let i = 0; i < 16; i++) { const ax = 250 + (hf(i, 1, 4) - .5) * 520, ay = 300 + (hf(i, 2, 4) - .5) * 70, k = R(.4 + i * .008, .46 + i * .008); if (k > 0) bean(ax, ay, 34, 23, dark, hf(i, 3, 4) * 3, 'tb' + i, i); }
    // crack burst
    const age = t - when('roast', 'เปรี๊ยะ'); if (age > 0 && age < 1.4) for (let i = 0; i < 14; i++) { const a = i * .449, d0 = 190 + age * 90, d1 = d0 + 40 * (1 - age / 1.4); D([[130 + Math.cos(a) * d0, -40 + Math.sin(a) * d0 * .8], [130 + Math.cos(a) * d1, -40 + Math.sin(a) * d1 * .8]], 7, 1, { col: RED, a: 1 - age / 1.4, noDry: true }); }
    const ta = fade(t, s.start + 1, s.end + 1, 1, 1.2); ink(Math.round(T) + '°C', 640, -190, 130, ta, { col: T < 140 ? INK : RED });
    seal(740, 330, prog(t, s.end - 3, s.end - 2.2));
  };

  ST.grind = (t, s) => {
    const D_ = s.end - s.start, R = (a, b) => ease(prog(t, s.start + a * D_, s.start + b * D_));
    K('g1', rect(-640, -40, 220, 330), 11, R(.02, .12)); K('g2', [[-670, -40], [-740, -310], [-330, -310], [-390, -40]], 9, R(.1, .18));
    for (let i = 0; i < 7; i++) wash(-545 + (hf(i, 1, 6) - .5) * 190, -230 + (hf(i, 2, 6)) * 120, 30, 22, .65, INK, i + 3);
    K('g3', circ(-420, 160, 36, 0, 6.4, 12), 6, R(.16, .22)); K('g4', [[-420, 160], [-340, 150], [-300, 110]], 8, R(.2, .26));
    K('g5', [[-545, 290], [-545, 330]], 9, R(.2, .24));
    const fall = prog(t, s.start + .1 * D_, s.end - 2);
    if (fall > 0) for (let i = 0; i < 90; i++) { const ph = (t * 1.2 + i / 90) % 1, x = -545 + (hf(i, 1, 9) - .5) * 24 * ph, y = lerp(335, 440, ph * ph); g.fillStyle = `rgba(${INK},${.7 * (1 - ph * .3)})`; g.beginPath(); g.arc(x, y, 2.4 + hf(i, 2, 9) * 1.4, 0, 7); g.fill(); }
    wash(-545, 455, 120, 40, .55, INK, 12); K('g6', [[-690, 480], [-545, 420], [-400, 480]], 9, R(.2, .26));
    // three dishes
    [[-80, 11, 12, 'หยาบ → เปรี้ยว', 'หยาบเกินไป', .3], [260, 5.5, 34, 'พอดี ✓', 'น้ำร้อนจึง', .38], [600, 2.4, 160, 'ละเอียดเกิน → ขม', 'ละเอียดเกินไป', .46]].forEach(([x, r, n, lab, key, u0], i) => {
      K('dish' + i, circ(x, 180, 140, 0, 6.4, 24, .3), 7, R(u0, u0 + .1));
      const kd = R(u0 + .03, u0 + .14); for (let j = 0; j < n; j++) { const a = hf(j, i, 5) * 6.28, d = Math.sqrt(hf(j, i, 6)) * 112; if (j / n < kd) { g.fillStyle = `rgba(${INK},${.82})`; g.beginPath(); g.ellipse(x + Math.cos(a) * d, 176 + Math.sin(a) * d * .26, r * (.75 + hf(j, i, 7) * .5), r * .65 * (.75 + hf(j, i, 7) * .5), 0, 0, 7); g.fill(); } }
      const tl = (key === 'น้ำร้อนจึง' ? when('grind', key) : when('grind', key)), ak = ease((t - tl + .2) / .6) * fade(t, s.start, s.end + 1.5, .1, 1.2); ink(lab, x, 40, 40, ak, { col: i === 1 ? INK : RED });
    });
    seal(790, -260, prog(t, s.end - 3, s.end - 2.2));
  };

  ST.espresso = (t, s) => {
    const D_ = s.end - s.start, R = (a, b) => ease(prog(t, s.start + a * D_, s.start + b * D_));
    K('e1', rect(-640, -300, 540, 430), 12, R(.02, .12)); K('e2', [[-670, -300], [-380, -330], [-70, -300]], 13, R(.1, .15));
    K('e3', rect(-440, -110, 140, 80), 9, R(.14, .2)); K('e4', [[-370, -30], [-370, 10], [-250, 30]], 9, R(.2, .25), { col: INK });
    K('e5', rect(-640, 190, 560, 38), 9, R(.2, .26));
    K('e6', circ(-540, -190, 56, 0, 6.4, 16), 6, R(.16, .22)); const bar = 9 * ease(prog(t, when('espresso', 'เก้าบาร์') - 3, when('espresso', 'เก้าบาร์') + .5)); D([[-540, -190], [-540 + Math.sin(lerp(-2.2, 2.2, bar / 10)) * 40, -190 - Math.cos(lerp(-2.2, 2.2, bar / 10)) * 40]], 5, R(.18, .24), { col: RED, noDry: true });
    // cup
    const cupPts = [[-440, 110], [-428, 220], [-380, 262], [-250, 262], [-200, 220], [-190, 110]]; K('ecup', cupPts, 10, R(.22, .3)); K('ecup2', circ(-155, 170, 36, -1.4, 1.5, 10), 8, R(.28, .33));
    const e0 = when('espresso', 'ผ่านผงกาแฟ'), e1 = when('espresso', 'ชั้นฟอง'), pf = ease(prog(t, e0, e1)), top = lerp(250, 135, pf);
    if (pf > 0) { g.save(); g.beginPath(); g.moveTo(-434, 135); g.lineTo(-421, 218); g.lineTo(-376, 256); g.lineTo(-254, 256); g.lineTo(-207, 218); g.lineTo(-196, 135); g.closePath(); g.clip(); g.fillStyle = `rgba(${INK},.88)`; g.fillRect(-460, top, 300, 200); g.restore(); }
    const cr = ease(prog(t, e1, e1 + 3)); if (cr > 0) { wash(-315, top + 4, 118, 18, .5 * cr, SEP, 8); }
    if (t > e0 && t < e1 + .2) D([[-315, 30], [-315, 60], [-315 + Math.sin(t * 8) * 2, top]], 7, 1, { noDry: true, uniform: true });
    // steam
    const sa = cr; for (let i = 0; i < 3; i++) { const k = (t * .35 + i / 3) % 1; D(Array.from({ length: 6 }, (_, j) => [-340 + i * 30 + Math.sin(j * 1.2 + t * 1.4 + i) * 18, 110 - k * 20 - j * 34]), 10, 1, { a: .22 * sa * (1 - k), noDry: true }); }
    // numbers
    const k1 = fade(t, when('espresso', 'เก้าบาร์') - 2, s.end + 1, .8, 1.2); ink('9 บาร์', 450, -130, 120, k1, { col: INK }); ink('≈ 9 เท่าของความดันอากาศ', 450, -80, 34, k1, { w: 400 });
    const k2 = fade(t, when('espresso', 'สามสิบวินาที') - .5, s.end + 1, .8, 1.2); ink('30 วินาที', 450, 70, 84, k2, { col: RED });
    const k3 = fade(t, when('espresso', 'เครมา') - .5, s.end + 2, .8, 1.2); ink('เครมา', -90, top - 20, 44, k3, { col: SEP, al: 'left' });
    seal(780, 300, prog(t, s.end - 3, s.end - 2.2));
  };

  ST.milk = (t, s) => {
    const D_ = s.end - s.start, R = (a, b) => ease(prog(t, s.start + a * D_, s.start + b * D_));
    K('m1', [[-150, -90], [-130, 120], [-90, 200], [90, 200], [130, 120], [160, -90], [100, -100], [40, -70]], 11, R(.02, .14)); K('m2', [[-150, -90], [-190, -110], [-212, -150]], 9, R(.12, .17));
    K('m3', circ(210, 20, 80, -1.5, 1.5, 14), 9, R(.14, .2));
    // wand
    K('m4', [[440, -330], [440, -130], [310, 20], [30, -20]], 11, R(.12, .22)); K('m5', rect(330, -420, 260, 110), 11, R(.04, .12));
    const milkLvl = lerp(150, 20, ease(prog(t, s.start + 3, when('milk', 'โปรตีนในนม') + 4)));
    g.save(); g.beginPath(); g.moveTo(-140, milkLvl); g.lineTo(-125, 120); g.lineTo(-86, 192); g.lineTo(86, 192); g.lineTo(125, 120); g.lineTo(150, milkLvl); g.closePath(); g.clip();
    const q = g.createLinearGradient(0, milkLvl, 0, 200); q.addColorStop(0, `rgba(${GREY},.18)`); q.addColorStop(1, `rgba(${GREY},.42)`); g.fillStyle = q; g.fillRect(-170, milkLvl, 340, 220); g.restore();
    const over = ease(prog(t, when('milk', 'เจ็ดสิบ'), when('milk', 'เจ็ดสิบ') + 4)); // foam swirl on top
    D(Array.from({ length: 24 }, (_, i) => { const a = i * .5 + t * 1.2, r = 6 + i * 4.8; return [Math.cos(a) * r, milkLvl + Math.sin(a) * r * .22]; }), 5, ease(prog(t, s.start + 6, s.start + 12)), { a: .6 * (1 - over * .7), noDry: true, uniform: true });
    for (let i = 0; i < 3; i++) { const k = (t * .3 + i / 3) % 1; D(Array.from({ length: 6 }, (_, j) => [-30 + i * 40 + Math.sin(j * 1.1 + t * 1.5 + i * 2) * 20, milkLvl - 20 - k * 30 - j * 38]), 10, 1, { a: .22 * (1 - k) * sstep(10, 40, 8 + 55 * ease(prog(t, s.start + 2, s.start + 12))), noDry: true }); }
    const a0 = when('milk', 'ใช้ไอน้ำ'), b0 = when('milk', 'เจ็ดสิบ'), T = t < b0 ? lerp(8, 63, ease(prog(t, a0, b0 - 3))) : lerp(63, 76, ease(prog(t, b0, b0 + 4))), hot = T > 70;
    const ta = fade(t, s.start + 1.5, s.end + 1, 1, 1.2); ink(Math.round(T) + '°C', 560, -120, 130, ta, { col: hot ? RED : INK }); ink(hot ? 'ร้อนเกินไป ✗' : '60–65°C กำลังดี ✓', 560, -50, 44, ta * (T > 55 ? 1 : 0), { col: hot ? RED : INK });
    seal(780, 300, prog(t, s.end - 3, s.end - 2.2));
  };

  ST.caffeine = (t, s) => {
    const D_ = s.end - s.start, R = (a, b) => ease(prog(t, s.start + a * D_, s.start + b * D_));
    K('c1', [[-760, 90], [-748, 220], [-700, 262], [-560, 262], [-510, 220], [-500, 90]], 10, R(.02, .1)); K('c2', circ(-465, 150, 36, -1.4, 1.5, 10), 8, R(.08, .13)); K('c3', [[-820, 270], [-630, 285], [-440, 270]], 8, R(.1, .15));
    for (let i = 0; i < 3; i++) { const k = (t * .3 + i / 3) % 1; D(Array.from({ length: 6 }, (_, j) => [-640 + i * 22 + Math.sin(j * 1.2 + t * 1.3 + i) * 16, 80 - k * 20 - j * 36]), 10, 1, { a: .2 * (1 - k), noDry: true }); }
    // membrane + receptors
    K('cm', [[-240, 200], [-60, 190], [200, 205], [460, 190], [700, 200], [820, 195]], 26, R(.06, .2), { a: .85, noDry: true });
    const sock = [30, 330, 630];
    sock.forEach((x, i) => K('cs' + i, circ(x, 160, 62, 2.6, 6.9, 14), 12, R(.18, .26), { col: '60,100,95', a: .9, noDry: true }));
    const tAd = when('caffeine', 'อะดีโนซีน'), tBlock = when('caffeine', 'แย่งจับ');
    const molecule = (x, y, col, big, ph) => { [[0, 0, 22], [28, 10, 15], [-24, 14, 13], [4, -26, 12], [30, -16, 10]].forEach(([dx, dy, r]) => { const rr = r * (big ? 1.15 : 1); wash(x + dx, y + dy, rr, rr, .85, col, ph + dx); }); };
    const nAd = 6;
    for (let i = 0; i < nAd; i++) {
      const k = i % 3, sx = sock[k], blockedAt = tBlock + k * 1.2 + 1.2, blocked = t > blockedAt;
      let x, y; const wob = Math.sin(t * .8 + i * 2) * 30;
      if (t < tAd - 1) { x = sx + Math.cos(t * .5 + i) * 220; y = -120 + Math.sin(t * .7 + i * 2) * 90; }
      else if (!blocked) { const app = ease(prog(t, tAd + i * .35, tAd + i * .35 + 2.2)); x = lerp(sx + Math.cos(t * .5 + i) * 220, sx, app); y = lerp(-120 + Math.sin(t * .7 + i * 2) * 90, 150, app); }
      else { const bn = Math.abs(Math.sin(t * 2 + i)); x = sx + Math.cos(t * .5 + i) * (80 + 160 * (1 - bn)); y = -80 - bn * 110 + wob * .3; }
      if (i >= 3 && !blocked && t > tAd + 1) { x = sx + 40 * Math.sin(i * 3); y = -40 + Math.sin(t * 1.3 + i) * 20; }
      molecule(x, y, INK, false, i);
    }
    for (let k = 0; k < 3; k++) { const t0 = tBlock + k * 1.2, a = ease(prog(t, t0, t0 + 1.4)); if (t > t0 - 3) molecule(lerp(sock[k] - 200 + k * 60, sock[k], a), lerp(-220 - k * 30, 150, a), RED, true, k + 20); }
    const lab = (txt_, x, y, t0, col) => ink(txt_, x, y, 38, ease((t - t0) / .6) * fade(t, s.start, s.end + 1.5, .1, 1.2), { col });
    lab('อะดีโนซีน', 30, -290, tAd - .2, INK); lab('ตัวรับ', 330, 280, when('caffeine', 'ตัวรับ'), '60,100,95'); lab('คาเฟอีน', 630, -290, when('caffeine', 'คาเฟอีนมี') - .2, RED);
    const th = when('caffeine', 'ครึ่งหนึ่ง'), a = fade(t, th - 5, s.end + 1.5, .8, 1.2);
    [['0', 1], ['5–6 ชม.', .5]].forEach(([l, v], i) => { const kk = ease((t - (th - 4 + i * 1.2)) / .8) * a; if (kk > 0) { D([[760 + i * 120, 400], [760 + i * 120 + 2, 400 - 170 * v * kk]], 54, 1, { col: RED, a: .85, noDry: true, tail: .98, uniform: true }); ink(l, 760 + i * 120, 440, 30, kk, { w: 400 }); } });
    seal(840, -300, prog(t, s.end - 3, s.end - 2.2));
  };

  ST.cool = (t, s) => {
    const D_ = s.end - s.start, R = (a, b) => ease(prog(t, s.start + a * D_, s.start + b * D_));
    K('k1', [[-330, -40], [-310, 150], [-240, 230], [40, 230], [110, 150], [130, -40]], 13, R(.02, .13)); K('k2', circ(160, 60, 70, -1.5, 1.6, 12), 11, R(.1, .16)); K('k3', [[-420, 245], [-100, 265], [220, 245]], 10, R(.12, .18));
    g.save(); g.beginPath(); g.ellipse(-100, -40, 228, 38, 0, 0, 7); g.clip(); g.fillStyle = `rgba(${INK},.8)`; g.fillRect(-340, -80, 460, 80); g.restore(); K('k4', circ(-100, -40, 230, 0, 6.4, 20, .17), 8, R(.1, .16));
    const tl = when('cool', 'ปิดฝา'), drop = ease(prog(t, tl, tl + 1.2)), ly = lerp(-420, -62, drop);
    if (t > tl - 1) { D([[-360, ly], [-100, ly + 14], [160, ly]], 18, 1, { a: .9, noDry: true, uniform: true }); D([[-120, ly - 10], [-100, ly - 26], [-80, ly - 10]], 10, 1, { noDry: true }); }
    for (let i = 0; i < 4; i++) { const k = (t * .3 + i / 4) % 1; D(Array.from({ length: 7 }, (_, j) => [-190 + i * 62 + Math.sin(j * 1.1 + t * 1.5 + i * 1.7) * 26, -70 - k * 30 - j * 52]), 13, 1, { a: .26 * (1 - k) * (1 - drop) * sstep(0, 2, t - s.start), noDry: true }); }
    const tp = when('cool', 'ถ่ายเท'), te = when('cool', 'ระเหย'), arrOn = 1 - drop;
    arrow(140, 40, 270, 10, 11, ease(prog(t, tp, tp + 1)) * arrOn); arrow(-340, 40, -470, 10, 11, ease(prog(t, tp + .8, tp + 1.8)) * arrOn); arrow(-100, -150, -100, -330, 13, ease(prog(t, te - .3, te + 1)) * arrOn);
    const lab = (txt_, x, y, t0) => ink(txt_, x, y, 36, ease((t - t0) / .6) * fade(t, s.start, tl + 2, .1, 1.2), { col: RED });
    lab('แก้ว', 370, -30, tp); lab('อากาศ', -560, -30, tp + 1); lab('ระเหย (มากที่สุด)', -100, -360, te);
    // chart
    const a = fade(t, s.start + 2, s.end + 1.5, 1, 1.2), cx = 420, cy = 400, cw = 420, ch = 300;
    D([[cx, cy - ch], [cx, cy], [cx + cw, cy]], 6, a * 1, { noDry: true, uniform: true, a: .7 });
    const dur = s.end - s.start - 3, t0 = s.start + 2, pr = prog(t, t0, t0 + dur);
    [[RED, .045 * 2.3], [INK, .018]].forEach(([col, rate]) => { const pts = []; for (let i = 0; i <= 40; i++) { const x = i / 40; if (x > pr) break; const T = 25 + 65 * Math.exp(-x * 60 * rate); pts.push([cx + x * cw, cy - ((T - 20) / 75) * ch]); } if (pts.length > 2) D(pts, 9, 1, { col, noDry: true, a: .85 * a, tail: .95 }); });
    ink('ไม่มีฝา', cx + 300, cy + 120 - 400 + 100, 30, 0); ink('ไม่มีฝา', cx + 180, cy - 20, 30, a, { col: RED, w: 400 }); ink('มีฝา', cx + 340, cy - 205, 30, a, { w: 400 }); ink('อุณหภูมิ ↑  เวลา →', cx + cw / 2, cy + 50, 28, a, { w: 400 });
    seal(-760, -300, prog(t, s.end - 3, s.end - 2.2));
  };

  ST.cold = (t, s) => {
    const D_ = s.end - s.start, R = (a, b) => ease(prog(t, s.start + a * D_, s.start + b * D_));
    K('d1', [[-560, -180], [-570, 250], [-300, 250], [-290, -180]], 12, R(.02, .13)); K('d1b', [[-590, -180], [-560, -215], [-300, -215], [-270, -180]], 9, R(.12, .17));
    wash(-430, 40, 130, 190, .5, SEP, 3);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${INK},.7)`; g.beginPath(); g.arc(-430 + (hf(i, 1, 3) - .5) * 220, -100 + hf(i, 2, 3) * 300 + Math.sin(t * .5 + i) * 4, 2.6, 0, 7); g.fill(); }
    K('d2', [[220, -250], [250, 250], [500, 250], [530, -250]], 12, R(.1, .2));
    const ti = when('cold', 'น้ำแข็ง'), lvl = lerp(-40, -90, ease(prog(t, ti, ti + 2)));
    g.save(); g.beginPath(); g.moveTo(228, lvl); g.lineTo(254, 244); g.lineTo(496, 244); g.lineTo(522, lvl); g.closePath(); g.clip(); g.fillStyle = `rgba(${INK},.85)`; g.fillRect(200, lvl, 360, 330); g.restore();
    for (let i = 0; i < 5; i++) { const t0 = ti + i * .35, k = prog(t, t0, t0 + .9); if (t < t0) continue; const x = 300 + (hf(i, 1, 8)) * 150 + (i % 2) * 20, y = lerp(-450, lvl - 40 + (i % 2) * 20 + Math.floor(i / 2) * 22, k * k) + (k >= 1 ? Math.sin((t - t0) * 1.3 + i) * 3 : 0); g.save(); g.translate(x, y); g.rotate(k * 2.4 * (1 - k) + i * .3); g.fillStyle = 'rgba(255,255,255,.75)'; g.strokeStyle = `rgba(${GREY},.7)`; g.lineWidth = 4; g.beginPath(); g.roundRect(-34, -34, 68, 68, 9); g.fill(); g.stroke(); g.restore(); }
    // clock
    const a = fade(t, s.start + 1, when('cold', 'ส่วนน้ำแข็ง'), 1, 1), hrs = 12 * ease(prog(t, s.start + 1, when('cold', 'ผลที่ได้')));
    if (a > 0) { K('dc', circ(-60, -250, 100, 0, 6.4, 18), 8, a, { a: .85 * a, noDry: true }); D([[-60, -250], [-60 + Math.sin(hrs / 12 * 6.283) * 62, -250 - Math.cos(hrs / 12 * 6.283) * 62]], 8, 1, { a, noDry: true }); D([[-60, -250], [-60 + Math.sin(hrs * 6.283) * 84, -250 - Math.cos(hrs * 6.283) * 84]], 5, 1, { col: RED, a, noDry: true }); ink(Math.round(hrs) + ' ชม.', -60, -90, 70, a, { col: RED }); }
    const b = fade(t, when('cold', 'น้ำแข็งที่ใส่') - .5, s.end + 1.5, .8, 1.2); ink('น้ำแข็งดูดความร้อนเพื่อละลาย', 400, -300, 44, b, { col: GREY });
    seal(760, 330, prog(t, s.end - 3, s.end - 2.2));
  };

  ST.ring = (t, s) => {
    const D_ = s.end - s.start, p = ease(prog(t, when('ring', 'ขณะที่หยดน้ำ') - 1, s.end - 1)), R0 = 340;
    const grow = ease(prog(t, s.start, s.start + 3));
    wash(0, 40, R0 * grow, R0 * .95 * grow, .45 * (1 - p * .75) + .1, INK, 11);
    // dark rim grows as evaporation proceeds
    if (grow > .5) { for (let k = 0; k < 3; k++) K('rr' + k, circ(0, 40, R0 - 6 - k * 3, k * .4, 6.6 + k * .4, 28, .95), 6 + 18 * p, ease(prog(t, s.start + 2, s.start + 4)), { a: (.25 + .6 * p), noDry: p < .5, dry: .15 }); }
    for (let i = 0; i < 160; i++) { const a = hf(i, 1, 5) * 6.28, r0 = Math.sqrt(hf(i, 2, 5)) * R0 * .9, ph = hf(i, 3, 5), k = clamp(p * 1.15 * (.45 + ph * .55)), r = lerp(r0, R0 * (.97 - .04 * ph), k); g.fillStyle = `rgba(${INK},.6)`; g.beginPath(); g.arc(Math.cos(a) * r, 40 + Math.sin(a) * r * .95, 2.6, 0, 7); g.fill(); }
    if (p > .1) for (let i = 0; i < 12; i++) { const a = i * .5236 + .2, k = p * (.6 + .4 * hf(i, 1, 7)); arrow(Math.cos(a) * 100, 40 + Math.sin(a) * 100, Math.cos(a) * 230, 40 + Math.sin(a) * 230, 5, ease(prog(t, when('ring', 'น้ำจึงไหล') - .5 + i * .05, when('ring', 'น้ำจึงไหล') + 1.5)) * (1 - p * .6), INK); }
    ink('วงแหวนกาแฟ', -520, -250, 80, fade(t, s.start + .5, s.end + 1, .8, 1.2));
    K('rcup', [[-780, 190], [-720, 320], [-650, 345], [-560, 300], [-585, 175]], 10, ease(prog(t, s.start + 1, s.start + 3)), { a: .8 });
    seal(780, 330, prog(t, s.end - 3, s.end - 2.2));
  };

  // ---------- title / outro layers ----------
  function titleLayer(t, s) { // intro
    const ak = fade(t, s.start + 1.5, s.start + 14, 1.8, 1.8);
    const wipe = ease(prog(t, s.start + 1.5, s.start + 5));
    if (ak > .01) {
      g.save(); const tc = mk(1500, 320), q = tc.getContext('2d'); q.font = `700 120px ${FONT}`; q.textAlign = 'center'; q.fillStyle = `rgb(${INK})`; q.fillText('ร้านกาแฟ', 750, 150); q.fillText('เล่าวิทยาศาสตร์', 750, 290);
      q.globalCompositeOperation = 'destination-in'; const gr = q.createLinearGradient(0, 0, 1500, 0), e = wipe * 1.3 - .15; gr.addColorStop(clamp(e - .15), 'rgba(0,0,0,1)'); gr.addColorStop(clamp(e), 'rgba(0,0,0,0)'); q.fillStyle = gr; q.fillRect(0, 0, 1500, 320);
      g.globalAlpha = ak; g.drawImage(tc, CX - 750 - 380, 90 + 0 - 0); g.restore();
      ink('ทุกแก้วคือห้องทดลอง', CX - 380, 500, 46, ak * ease(prog(t, s.start + 4, s.start + 6)), { w: 400, col: RED, ls: 6 });
      seal(CX + 320, 400, prog(t, s.start + 5.5, s.start + 6.5));
    }
  }

  // ---------- scene composition ----------
  const scenes = ORDER.map((k, i) => ({ k, s: SEG[k], i }));
  const idx = { intro: 0 }; // intro sits left of station 0 (scroll start), outro zooms out
  const stIdx = (k) => NAMES.indexOf(k);
  const focusX = (k) => (k === 'intro' ? SXw(0) - 1000 : k === 'outro' ? SXw(7) : SXw(stIdx(k)));
  const poseOf = (e, t) => {
    const u = clamp((t - e.s.start) / (e.s.end - e.s.start));
    if (e.k === 'outro') { const z = lerp(1, .13, ease(prog(t, e.s.start + .5, e.s.start + 9))); return [lerp(SXw(7), SXw(3.5) + 400, ease(prog(t, e.s.start + .5, e.s.start + 9))), z]; }
    return [focusX(e.k) + lerp(-120, 120, u), e.k === 'intro' ? 1 : 1 + .05 * Math.sin(u * 3)];
  };
  const TS = scenes.map((e, i) => (i < scenes.length - 1 ? e.s.end - 1.8 : 1e9)), TE = scenes.map((e, i) => (i < scenes.length - 1 ? scenes[i + 1].s.start + 1.2 : 1e9));

  function frame(t) {
    let j = 0; while (j < scenes.length - 1 && t >= TE[j]) j++;
    let P = poseOf(scenes[j], t);
    if (j < scenes.length - 1 && t >= TS[j]) { const k = ease((t - TS[j]) / (TE[j] - TS[j])), Q = poseOf(scenes[j + 1], t), z = Math.exp(lerp(Math.log(P[1]), Math.log(Q[1]), k)); P = [lerp(P[0], Q[0], k), z]; }
    const [camX, zoom] = P;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    // background mountains (screen space, parallax)
    mountains(camX, zoom);
    // world
    g.save(); g.translate(CX, CY + 20 * (1 - zoom)); g.scale(zoom, zoom); g.translate(-camX, 0);
    const vis = (x) => Math.abs(x - camX) * zoom < W / 2 + 1100 * zoom;
    // decor
    [-1200, ...NAMES.map((_, i) => SXw(i) + SP / 2), SXw(7) + 1100].forEach((x, i) => { if (vis(x)) bamboo(x, 420, 1.1 - (i % 3) * .1, 1); });
    // ground line
    for (let i = -1; i < 8; i++) { const x0 = SXw(i) + SP / 2 - SP / 2; if (vis(x0 + SP / 2)) K('gl' + i, [[x0 - 1000, 420], [x0 - 500, 414], [x0, 424], [x0 + 500, 418], [x0 + 1000, 422]], 8, 1, { a: .5, dry: .5, step: 5 }); }
    // stations
    scenes.forEach((e) => {
      if (e.k === 'intro' || e.k === 'outro') return; const cx = SXw(stIdx(e.k)); if (!vis(cx)) return;
      g.save(); g.translate(cx, 0); ST[e.k](t, e.s); g.restore();
    });
    g.restore();
    // screen-space overlays
    const sI = SEG.intro, sO = SEG.outro; titleLayer(t, sI);
    const ao = ease((t - (sO.end - 8)) / 1.4) * ease((TL.duration - 1 - t) / 1.2); ink('ขอบคุณที่รับชมครับ', CX, 330, 120, ao); ink('วิทยาศาสตร์อยู่ในทุกแก้ว', CX, 410, 50, ao * ease((t - (sO.end - 6.5)) / 1.2), { col: RED, w: 400, ls: 4 }); seal(CX + 520, 300, prog(t, sO.end - 5, sO.end - 4));
    // composite on paper
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(paper, 0, 0);
    ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(inkC, 0, 0); ctx.globalCompositeOperation = 'source-over';
    let d = 0; if (t < 1.2) d = 1 - t / 1.2; if (t > TL.duration - 1.5) d = Math.max(d, (t - (TL.duration - 1.5)) / 1.5);
    if (d > 0) { ctx.fillStyle = `rgba(239,230,211,${clamp(d)})`; ctx.fillRect(0, 0, W, H); }
  }
  window.frame = frame; window.grabPNG = (t) => { frame(t); return out.toDataURL('image/png').split(',')[1]; };
  Promise.all([document.fonts.load('700 46px NST', 'กขคabc'), document.fonts.load('400 30px NST', 'กขคabc')]).then(() => document.fonts.ready).then(() => { frame(0); window.READY = true; });
})();
