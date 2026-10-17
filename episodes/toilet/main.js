/* "ห้องน้ำปลายทาง" — silent bold-outline flat cartoon, 1080x1920. frame(t) is a pure function of t. */
(function () {
  'use strict';
  const W = 1080, H = 1920, EV = window.EV;
  const cv = document.getElementById('c'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const OUT = '#17202b';
  const C = { wall: '#f4e9c9', wall2: '#dccca3', ceil: '#fbf4de', bin: '#fffaec', binB: '#e4d6b0', sky: '#9fd4f6', floor: '#6c7b8d', aisle: '#a3aebb', aisleD: '#8795a4', seat: '#3f7ed0', seatD: '#2c5ea8', pillow: '#7db4ec', arm: '#8e9aa7', armT: '#b3bdc8', armD: '#6d7985', skin: '#eaa56d', skin2: '#d28a50', hair: '#16181e', hood: '#9ba2ad', hood2: '#7e8590', pants: '#3a3f4d' };
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), lerp = (a, b, k) => a + (b - a) * k, prog = (t, a, b) => clamp((t - a) / (b - a));
  const ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); }, easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3), easeIn = (x) => { x = clamp(x); return x * x * x; };
  const hf = (a, b, c) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 982451653)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const between = (t, a, b) => t >= a && t < b;

  // ---------- projection (one-point perspective) ----------
  const CAM = { x: 0, y: 1.25, z: 0, f: 900, vx: 540, vy: 800 };
  function P(x, y, z) { const d = Math.max(z - CAM.z, 0.08), k = CAM.f / d; return [CAM.vx + (x - CAM.x) * k, CAM.vy - (y - CAM.y) * k, k]; }
  const lwOf = (k) => clamp(0.8 + k * 0.014, 1, 6.4);
  function wob(a, b, seed) { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, off = (hf(seed, 5, 2) - 0.5) * 2 * Math.min(2.4, l * 0.012); g.quadraticCurveTo((a[0] + b[0]) / 2 - dy / l * off, (a[1] + b[1]) / 2 + dx / l * off, b[0], b[1]); }
  function rpath(p, r, seed) {
    const n = p.length, cs = [];
    for (let i = 0; i < n; i++) { const a = p[(i + n - 1) % n], b = p[i], c = p[(i + 1) % n], l1 = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, l2 = Math.hypot(c[0] - b[0], c[1] - b[1]) || 1, q = Math.min(r, l1 * 0.45, l2 * 0.45); cs.push([[b[0] + (a[0] - b[0]) / l1 * q, b[1] + (a[1] - b[1]) / l1 * q], b, [b[0] + (c[0] - b[0]) / l2 * q, b[1] + (c[1] - b[1]) / l2 * q]]); }
    g.beginPath(); g.moveTo(cs[0][0][0], cs[0][0][1]); let prev = null;
    for (let i = 0; i < n; i++) { if (prev) wob(prev, cs[i][0], seed + i); g.quadraticCurveTo(cs[i][1][0], cs[i][1][1], cs[i][2][0], cs[i][2][1]); prev = cs[i][2]; }
    wob(prev, cs[0][0], seed + n); g.closePath();
  }
  function quad(a, b, c, d, fill, stroke = true, lwm = 1, rad = 0.04) {
    const p = [P(...a), P(...b), P(...c), P(...d)], kk = (p[0][2] + p[1][2] + p[2][2] + p[3][2]) / 4, seed = Math.floor(hf(Math.round(a[0] * 100), Math.round(a[1] * 100), Math.round(a[2] * 100)) * 9999);
    rpath(p, stroke ? Math.min(rad * kk, 70) : 0.01, seed);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.lineWidth = lwOf(Math.max(p[0][2], p[1][2], p[2][2], p[3][2])) * lwm; g.strokeStyle = OUT; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); }
  }
  function line3(a, b, lwm = 1) { const p = P(...a), q = P(...b); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.lineWidth = lwOf(Math.max(p[2], q[2])) * lwm; g.strokeStyle = OUT; g.lineCap = 'round'; g.stroke(); }

  // ---------- unit-space drawing (1 unit = 1 m, y up, origin at feet) ----------
  let LU = 0.01;
  function unitDraw(sx, sy, k, fn) { g.save(); g.translate(sx, sy); g.scale(k, -k); g.lineJoin = 'round'; g.lineCap = 'round'; LU = clamp(1.6 + k * 0.006, 1.6, 5.6) / k; fn(); g.restore(); }
  const fs = (fill, lw = 1) => { if (fill) { g.fillStyle = fill; g.fill(); } if (lw > 0) { g.lineWidth = LU * lw; g.strokeStyle = OUT; g.stroke(); } };
  const ell = (x, y, rx, ry, fill, rot = 0, lw = 1) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, 6.2832); fs(fill, lw); };
  const rr = (x, y, w, h, r, fill, lw = 1) => { g.beginPath(); g.roundRect(x, y, w, h, r); fs(fill, lw); };
  const poly = (pts, fill, lw = 1) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); fs(fill, lw); };
  const ln = (x0, y0, x1, y1, lw = 1) => { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineWidth = LU * lw; g.strokeStyle = OUT; g.stroke(); };

  // ---------- characters ----------
  // o: ph (walk phase), walk, open (eye opening 0..1), look [dx,dy], mouth, armsFolded, seated, back, sq (squeeze x), sweat
  // soft-body rig: capsule limbs with bends, curved torso, egg head
  function limbs(arr) {
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    const tr = (l) => { g.beginPath(); g.moveTo(l.p[0][0], l.p[0][1]); if (l.p.length === 3) g.quadraticCurveTo(l.p[1][0], l.p[1][1], l.p[2][0], l.p[2][1]); else for (let i = 1; i < l.p.length; i++) g.lineTo(l.p[i][0], l.p[i][1]); };
    arr.forEach((l) => { tr(l); g.lineWidth = l.w + LU * 2.6; g.strokeStyle = OUT; g.stroke(); });
    arr.forEach((l) => { tr(l); g.lineWidth = l.w; g.strokeStyle = l.c; g.stroke(); });
    g.restore();
  }
  function handAt(x, y, sg, ang = 0) { g.save(); g.translate(x, y); g.rotate(ang); ell(0, 0, 0.058, 0.062, C.skin); ell(sg * 0.05, 0.025, 0.026, 0.034, C.skin, sg * 0.4); g.restore(); }
  function shoeAt(x, y, back, lifted) { g.save(); g.translate(x, y); if (back) { ell(0, -0.012, 0.098, 0.06, '#f4f4f4'); g.beginPath(); g.moveTo(-0.085, -0.045); g.quadraticCurveTo(0, -0.07, 0.085, -0.045); g.lineWidth = LU * 1.4; g.strokeStyle = '#9aa3ad'; g.stroke(); } else { ell(0, -0.012, 0.1, 0.062, '#f4f4f4'); g.beginPath(); g.moveTo(-0.085, -0.04); g.quadraticCurveTo(0, -0.07, 0.085, -0.04); g.lineWidth = LU * 1.4; g.strokeStyle = '#9aa3ad'; g.stroke(); ell(0, 0.015, 0.05, 0.03, '#e3e7eb', 0, 0.7); } g.restore(); }
  function eggHead(hy, k = 1) { g.beginPath(); g.moveTo(0, hy + 0.3 * k); g.bezierCurveTo(0.2, hy + 0.3 * k, 0.335, hy + 0.14, 0.33, hy - 0.02); g.bezierCurveTo(0.325, hy - 0.2, 0.17, hy - 0.3 * k, 0, hy - 0.3 * k); g.bezierCurveTo(-0.17, hy - 0.3 * k, -0.325, hy - 0.2, -0.33, hy - 0.02); g.bezierCurveTo(-0.335, hy + 0.14, -0.2, hy + 0.3 * k, 0, hy + 0.3 * k); g.closePath(); }
  function torsoPath(col, sh, nav) {
    const tp = () => { g.beginPath(); g.moveTo(-0.18, 1.05); g.bezierCurveTo(-0.3, 1.04, -0.32, 0.92, -0.29, 0.82); g.bezierCurveTo(-0.27, 0.7, -0.31, 0.62, -0.29, 0.53); g.quadraticCurveTo(0, 0.48, 0.29, 0.53); g.bezierCurveTo(0.31, 0.62, 0.27, 0.7, 0.29, 0.82); g.bezierCurveTo(0.32, 0.92, 0.3, 1.04, 0.18, 1.05); g.quadraticCurveTo(0, 1.1, -0.18, 1.05); g.closePath(); };
    tp(); fs(col);
    g.save(); tp(); g.clip(); g.fillStyle = sh; g.beginPath(); g.moveTo(0.1, 1.1); g.bezierCurveTo(0.2, 0.9, 0.12, 0.7, 0.2, 0.45); g.lineTo(0.4, 0.45); g.lineTo(0.4, 1.1); g.closePath(); g.fill(); g.restore(); tp(); g.lineWidth = LU; g.strokeStyle = OUT; g.stroke();
  }
  // o: ph, walk, open, look, mouth, armsFolded, seated, back, sq, sweat, tilt, tapL
  function hero(o) {
    const ph = o.ph || 0, w = !!o.walk, S = w ? Math.sin(ph) : 0, Cc = w ? Math.cos(ph) : 0, back = !!o.back;
    const hx = w ? S * 0.028 : 0, bob = w ? Math.abs(Cc) * 0.022 : 0;
    g.save(); if (o.sq) g.scale(o.sq, 1);
    if (!o.seated) { g.fillStyle = 'rgba(20,30,45,.18)'; g.beginPath(); g.ellipse(hx * 0.4, 0, 0.3, 0.06, 0, 0, 6.2832); g.fill();
      const Ls = [], ank = [];
      [-1, 1].forEach((sg) => { const pp = ph + (sg < 0 ? 0 : Math.PI), lift = w ? Math.max(0, Math.sin(pp)) : 0, tap = sg < 0 ? (o.tapL || 0) : 0, hip = [sg * 0.1 + hx, 0.64 + bob], knee = [sg * 0.15 + hx, 0.36 + lift * 0.1 + bob * 0.4 + tap * 0.4], an = [sg * 0.11 + hx, 0.085 + lift * 0.13 + tap]; Ls.push({ p: [hip, knee, an], w: 0.18, c: C.pants }); ank.push(an); });
      limbs(Ls); ank.forEach((an) => shoeAt(an[0], an[1] - 0.005, back));
    }
    g.save(); g.translate(hx, 0.62); g.rotate(S * 0.03 + (o.lean || 0)); g.translate(-hx, -0.62 + bob);
    if (o.seated) { g.beginPath(); g.roundRect(-0.3, -0.1, 0.6, 0.72, 0.12); fs(C.hood); }
    // back hood bump
    if (back) ell(0, 1.04, 0.2, 0.09, C.hood2);
    torsoPath(C.hood, C.hood2);
    if (!back) { g.beginPath(); g.moveTo(-0.2, 0.585); g.quadraticCurveTo(-0.17, 0.65, -0.14, 0.69); g.quadraticCurveTo(0, 0.71, 0.14, 0.69); g.quadraticCurveTo(0.17, 0.65, 0.2, 0.585); g.lineWidth = LU * 0.9; g.strokeStyle = OUT; g.stroke(); ln(-0.07, 0.98, -0.08, 0.84, 0.8); ln(0.07, 0.98, 0.08, 0.84, 0.8); ell(-0.08, 0.83, 0.014, 0.014, '#e9edf3', 0, 0.6); ell(0.08, 0.83, 0.014, 0.014, '#e9edf3', 0, 0.6); }
    else { ln(0, 0.55, 0, 0.9, 0.7); }
    g.beginPath(); g.moveTo(-0.2, 0.8); g.quadraticCurveTo(-0.1, 0.77, -0.04, 0.8); g.moveTo(0.14, 0.7); g.quadraticCurveTo(0.2, 0.68, 0.24, 0.72); g.lineWidth = LU * 0.7; g.strokeStyle = 'rgba(23,32,43,.55)'; g.stroke();
    ell(0, 1.03, 0.2, 0.07, C.hood2);
    // arms
    const A = [], hands = [];
    [-1, 1].forEach((sg) => {
      const sho = [sg * 0.255, 0.99]; let el, ha;
      if (o.armsFolded) { if (!back) { el = [sg * 0.35, sg < 0 ? 0.74 : 0.7]; ha = [-sg * 0.13, sg < 0 ? 0.8 : 0.76]; } else { el = [sg * 0.36, 0.74]; ha = [sg * 0.18, 0.8]; } }
      else if (o.seated) { el = [sg * 0.45, 0.76]; ha = [sg * 0.37, 0.595]; }
      else { const pp = ph + (sg < 0 ? Math.PI : 0), sw = w ? Math.sin(pp) : 0; el = [sg * (0.355 - sw * 0.0), 0.79 + sw * 0.025]; ha = [sg * (0.335 - Math.abs(sw) * 0.02), 0.575 + sw * 0.075]; }
      A.push({ p: [sho, el, ha], w: 0.15, c: C.hood2 }); hands.push([ha, sg]);
    });
    limbs(A); hands.forEach(([h, sg]) => handAt(h[0], h[1], sg));
    // head
    const hy = 1.32;
    g.save(); g.translate(0, 1.06); g.rotate((o.tilt || 0) - S * 0.025); g.translate(0, -1.06);
    ell(-0.325, hy - 0.03, 0.05, 0.07, C.skin); ell(0.325, hy - 0.03, 0.05, 0.07, C.skin);
    if (back) {
      rr(-0.09, 1.04, 0.18, 0.12, 0.05, C.skin); eggHead(hy); fs('#20232b');
      g.save(); eggHead(hy); g.clip(); g.fillStyle = C.hair; g.beginPath(); g.ellipse(0.06, hy - 0.1, 0.34, 0.26, 0, 0, 6.2832); g.fill(); g.restore();
      for (let i = 0; i < 11; i++) { const an = i / 11 * 6.2832 + 0.3, r0 = 0.05, r1 = 0.2 + (i % 3) * 0.035; g.beginPath(); g.moveTo(0.03 + Math.cos(an) * r0, hy + 0.1 + Math.sin(an) * r0 * 0.8); g.quadraticCurveTo(0.03 + Math.cos(an + 0.5) * r1 * 0.6, hy + 0.1 + Math.sin(an + 0.5) * r1 * 0.5, 0.03 + Math.cos(an + 0.35) * r1, hy + 0.1 + Math.sin(an + 0.35) * r1 * 0.85); g.lineWidth = LU * 0.8; g.strokeStyle = '#4b505c'; g.stroke(); }
      eggHead(hy); g.lineWidth = LU; g.strokeStyle = OUT; g.stroke();
    } else {
      eggHead(hy); fs(C.skin);
      g.save(); eggHead(hy); g.clip(); g.fillStyle = C.skin2; g.beginPath(); g.ellipse(0.09, hy - 0.09, 0.34, 0.31, 0, 0, 6.2832); g.fill(); g.fillStyle = C.skin; g.beginPath(); g.ellipse(-0.03, hy + 0.03, 0.31, 0.28, 0, 0, 6.2832); g.fill(); g.restore(); eggHead(hy); g.lineWidth = LU; g.strokeStyle = OUT; g.stroke();
      g.beginPath(); g.moveTo(-0.335, hy + 0.03); g.bezierCurveTo(-0.37, hy + 0.37, 0.37, hy + 0.37, 0.335, hy + 0.03); g.quadraticCurveTo(0.27, hy + 0.17, 0.16, hy + 0.08); g.quadraticCurveTo(0.08, hy + 0.21, -0.02, hy + 0.1); g.quadraticCurveTo(-0.1, hy + 0.21, -0.17, hy + 0.08); g.quadraticCurveTo(-0.29, hy + 0.17, -0.335, hy + 0.03); g.closePath(); fs(C.hair);
      const op = o.open === undefined ? 0.7 : o.open, lk = o.look || [0, 0];
      [-1, 1].forEach((sg) => {
        const cx = sg * 0.115, cy = hy - 0.02, rx = 0.088, ry = 0.064; g.save(); g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 6.2832); g.clip(); g.fillStyle = '#fff'; g.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
        const lidY = cy - ry + 2 * ry * op, sl = 0.018; g.beginPath(); g.moveTo(cx - rx - 0.01, cy - ry - 0.02); g.lineTo(cx + rx + 0.01, cy - ry - 0.02); g.lineTo(cx + rx + 0.01, lidY + (sg < 0 ? sl : -sl)); g.lineTo(cx - rx - 0.01, lidY + (sg < 0 ? -sl : sl)); g.closePath(); g.fillStyle = C.skin; g.fill(); g.beginPath(); g.moveTo(cx - rx - 0.01, lidY + (sg < 0 ? -sl : sl)); g.lineTo(cx + rx + 0.01, lidY + (sg < 0 ? sl : -sl)); g.lineWidth = LU * 1.3; g.strokeStyle = OUT; g.stroke();
        const px = cx + lk[0] * 0.035, py = Math.max(cy - ry + 0.03, Math.min(cy + ry - 0.035, lidY + 0.022 + lk[1] * 0.02)); g.fillStyle = OUT; g.beginPath(); g.arc(px, py, 0.026, 0, 6.2832); g.fill(); g.restore();
        g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 6.2832); g.lineWidth = LU; g.strokeStyle = OUT; g.stroke();
      });
      ln(-0.012, hy - 0.07, 0.012, hy - 0.09, 0.8);
      const m = o.mouth || 'flat', my = hy - 0.17;
      if (m === 'flat') { g.beginPath(); g.moveTo(-0.055, my); g.quadraticCurveTo(0, my - 0.008, 0.055, my + 0.004); g.lineWidth = LU * 1.15; g.strokeStyle = OUT; g.stroke(); }
      else if (m === 'wave') { g.beginPath(); g.moveTo(-0.07, my); g.bezierCurveTo(-0.04, my - 0.04, -0.02, my + 0.04, 0.01, my); g.bezierCurveTo(0.03, my - 0.04, 0.05, my + 0.03, 0.07, my); g.lineWidth = LU * 1.15; g.strokeStyle = OUT; g.stroke(); }
      else if (m === 'o') ell(0, my - 0.01, 0.032, 0.042, OUT);
      else if (m === 'grit') { g.beginPath(); g.roundRect(-0.075, my - 0.03, 0.15, 0.06, 0.02); fs('#fff', 0.9); ln(-0.075, my, 0.075, my, 0.5); ln(-0.025, my - 0.03, -0.025, my + 0.03, 0.4); ln(0.025, my - 0.03, 0.025, my + 0.03, 0.4); }
      else if (m === 'ease') { g.beginPath(); g.moveTo(-0.065, my + 0.01); g.quadraticCurveTo(0, my - 0.05, 0.065, my + 0.01); g.lineWidth = LU * 1.15; g.strokeStyle = OUT; g.stroke(); }
      if (o.sweat) { const yy = hy + 0.12 - o.sweat * 0.1; g.beginPath(); g.moveTo(0.3, yy + 0.02); g.quadraticCurveTo(0.35, yy - 0.06, 0.3, yy - 0.12); g.quadraticCurveTo(0.25, yy - 0.06, 0.3, yy + 0.02); g.closePath(); fs('#8fd0ff', 0.8); }
    }
    ln(0, hy + 0.29, -0.03, hy + 0.41, 1); ln(0.07, hy + 0.28, 0.12, hy + 0.38, 1); ln(-0.08, hy + 0.28, -0.14, hy + 0.36, 1);
    g.restore(); g.restore(); g.restore();
  }
  function attendant() {
    ell(0, 0, 0.3, 0.06, 'rgba(20,30,45,.18)', 0, 0);
    limbs([{ p: [[-0.08, 0.34], [-0.09, 0.2], [-0.09, 0.07]], w: 0.1, c: '#f2c9a0' }, { p: [[0.08, 0.34], [0.09, 0.2], [0.09, 0.07]], w: 0.1, c: '#f2c9a0' }]); ell(-0.09, 0.04, 0.09, 0.045, '#1e2430'); ell(0.09, 0.04, 0.09, 0.045, '#1e2430');
    g.beginPath(); g.moveTo(-0.2, 0.68); g.bezierCurveTo(-0.3, 0.52, -0.33, 0.4, -0.3, 0.28); g.quadraticCurveTo(0, 0.22, 0.3, 0.28); g.bezierCurveTo(0.33, 0.4, 0.3, 0.52, 0.2, 0.68); g.closePath(); fs('#25396a');
    g.beginPath(); g.moveTo(-0.17, 1.05); g.bezierCurveTo(-0.29, 1.03, -0.3, 0.92, -0.26, 0.82); g.bezierCurveTo(-0.24, 0.74, -0.25, 0.7, -0.22, 0.62); g.quadraticCurveTo(0, 0.58, 0.22, 0.62); g.bezierCurveTo(0.25, 0.7, 0.24, 0.74, 0.26, 0.82); g.bezierCurveTo(0.3, 0.92, 0.29, 1.03, 0.17, 1.05); g.quadraticCurveTo(0, 1.09, -0.17, 1.05); g.closePath(); fs('#25396a');
    g.beginPath(); g.moveTo(-0.1, 1.04); g.quadraticCurveTo(0, 1.0, 0.1, 1.04); g.quadraticCurveTo(0.05, 0.94, 0, 0.88); g.quadraticCurveTo(-0.05, 0.94, -0.1, 1.04); g.closePath(); fs('#e9edf3', 0.8); ln(0, 0.88, 0, 0.64, 0.8);
    limbs([{ p: [[-0.25, 0.98], [-0.34, 0.8], [-0.2, 0.66]], w: 0.13, c: '#25396a' }, { p: [[0.25, 0.98], [0.34, 0.8], [0.2, 0.66]], w: 0.13, c: '#25396a' }]); ell(-0.2, 0.64, 0.05, 0.05, '#f2c9a0'); ell(0.2, 0.64, 0.05, 0.05, '#f2c9a0');
    const hy = 1.32; eggHead(hy, 0.95); fs('#f2c9a0'); ell(0, hy + 0.3, 0.07, 0.07, C.hair);
    g.beginPath(); g.moveTo(-0.3, hy + 0.02); g.bezierCurveTo(-0.36, hy + 0.36, 0.36, hy + 0.36, 0.3, hy + 0.02); g.quadraticCurveTo(0.22, hy + 0.12, 0.1, hy + 0.1); g.quadraticCurveTo(0, hy + 0.2, -0.1, hy + 0.1); g.quadraticCurveTo(-0.24, hy + 0.14, -0.3, hy + 0.02); g.closePath(); fs(C.hair);
    ell(-0.09, hy - 0.04, 0.03, 0.04, OUT); ell(0.09, hy - 0.04, 0.03, 0.04, OUT); g.beginPath(); g.moveTo(-0.08, hy - 0.15); g.quadraticCurveTo(0, hy - 0.24, 0.08, hy - 0.15); g.lineWidth = LU; g.strokeStyle = OUT; g.stroke();
    ell(-0.18, hy - 0.1, 0.045, 0.028, 'rgba(240,120,120,.5)', 0, 0); ell(0.18, hy - 0.1, 0.045, 0.028, 'rgba(240,120,120,.5)', 0, 0);
  }
  function cart() {
    ell(0, 0, 0.28, 0.05, 'rgba(20,30,45,.18)', 0, 0);
    rr(-0.23, 0.14, 0.46, 0.8, 0.03, '#b9c2cc'); rr(-0.2, 0.22, 0.4, 0.17, 0.02, '#99a5b1', 0.8); rr(-0.2, 0.43, 0.4, 0.17, 0.02, '#99a5b1', 0.8); rr(-0.2, 0.64, 0.4, 0.2, 0.02, '#aab5c0', 0.8);
    rr(-0.26, 0.92, 0.52, 0.05, 0.02, '#d5dce3'); ell(-0.16, 0.07, 0.065, 0.065, '#2a2f38'); ell(0.16, 0.07, 0.065, 0.065, '#2a2f38');
  }
  function toiletUnit() { rr(-0.16, 0.38, 0.32, 0.42, 0.04, '#f4f6f8'); rr(-0.14, 0.2, 0.28, 0.2, 0.05, '#f4f6f8'); ell(0, 0.36, 0.2, 0.09, '#e6eaee'); ell(0, 0.36, 0.14, 0.055, '#c9d1d9', 0, 0.8); rr(-0.1, 0.0, 0.2, 0.22, 0.04, '#e6eaee'); }

  // ---------- cabin ----------
  const occ = (i, s, k) => hf(i, s * 7 + k, 3) < 0.26;
  const HAIR = ['#16181e', '#5a3b22', '#c9a26b', '#8a8a8a', '#2e2438'];
  function seatBack(zi, s, outer) {
    const x0 = s < 0 ? (outer ? -1.55 : -1.1) : (outer ? 1.13 : 0.68), x1 = x0 + 0.42, inner = !outer, ia = s < 0 ? x1 : x0;
        quad([x0, 0.42, zi], [x1, 0.42, zi], [x1, 1.25, zi], [x0, 1.25, zi], C.seat, true, 1, 0.13);
    quad([x0 + 0.05, 0.86, zi], [x1 - 0.05, 0.86, zi], [x1 - 0.05, 1.2, zi], [x0 + 0.05, 1.2, zi], C.pillow, true, 0.7, 0.09);
    if (inner) { quad([ia, 0.42, zi], [ia, 0.42, zi + 0.14], [ia, 1.25, zi + 0.14], [ia, 1.25, zi], C.seatD);
      const ax0 = s < 0 ? ia : ia - 0.08, ax1 = ax0 + 0.08;
      quad([ax0, 0.72, zi + 0.14], [ax1, 0.72, zi + 0.14], [ax1, 0.72, zi + 0.62], [ax0, 0.72, zi + 0.62], C.armT, true, 1, 0.05);
      const sx = s < 0 ? ax1 : ax0; quad([sx, 0.6, zi + 0.14], [sx, 0.6, zi + 0.62], [sx, 0.72, zi + 0.62], [sx, 0.72, zi + 0.14], C.armD, true, 1, 0.05);
    }
  }
  function headBack(x, y, z, r, col, tilt = 0) { const [sx, sy, k] = P(x, y, z); g.save(); g.translate(sx, sy); g.rotate(tilt); g.beginPath(); g.arc(0, 0, r * k, 0, 6.2832); g.fillStyle = col; g.fill(); g.lineWidth = lwOf(k); g.strokeStyle = OUT; g.stroke(); g.restore(); return [sx, sy, k]; }
  function zeds(x, y, z, t) { for (let i = 0; i < 3; i++) { const u = ((t * 0.5 + i / 3) % 1), [sx, sy, k] = P(x + 0.05 + u * 0.18, y + 0.2 + u * 0.4, z), s = (0.05 + u * 0.06) * k; g.save(); g.globalAlpha = 1 - u * u; g.beginPath(); g.moveTo(sx - s, sy - s); g.lineTo(sx + s, sy - s); g.lineTo(sx - s, sy + s); g.lineTo(sx + s, sy + s); g.lineWidth = Math.max(2, 0.014 * k); g.strokeStyle = OUT; g.lineJoin = 'round'; g.stroke(); g.restore(); } }

  function cabinShell(o) {
    const zf = o.wallZ, zn = CAM.z + 0.08;
    g.fillStyle = C.wall; g.fillRect(0, 0, W, H);
    quad([-1.6, 2.28, zn], [1.6, 2.28, zn], [1.6, 2.28, zf], [-1.6, 2.28, zf], C.ceil, false);
    const ARCH = [[-0.6, 2.28], [-0.42, 2.42], [-0.2, 2.51], [0, 2.54], [0.2, 2.51], [0.42, 2.42], [0.6, 2.28]];
    for (let i = 0; i < 6; i++) quad([ARCH[i][0], ARCH[i][1], zn], [ARCH[i + 1][0], ARCH[i + 1][1], zn], [ARCH[i + 1][0], ARCH[i + 1][1], zf], [ARCH[i][0], ARCH[i][1], zf], i % 2 ? '#f9f1d8' : '#fcf6e2', false);
    for (let z = Math.ceil(Math.max(zn, 0.4) / 1.6) * 1.6; z < zf; z += 1.6) { if (z > CAM.z + 60) break; const q = ARCH.map((a) => P(a[0], a[1], z)); g.beginPath(); g.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length - 1; i++) g.quadraticCurveTo(q[i][0], q[i][1], (q[i][0] + q[i + 1][0]) / 2, (q[i][1] + q[i + 1][1]) / 2); g.lineTo(q[q.length - 1][0], q[q.length - 1][1]); g.lineWidth = lwOf(q[3][2]) * 0.85; g.strokeStyle = OUT; g.lineCap = 'round'; g.stroke(); }
    quad([-1.6, 0, zn], [1.6, 0, zn], [1.6, 0, zf], [-1.6, 0, zf], C.floor, false);
    quad([-0.6, 0.002, zn], [0.6, 0.002, zn], [0.6, 0.002, zf], [-0.6, 0.002, zf], C.aisle, false);
    const i0 = Math.max(0, Math.floor((CAM.z - 0.6) / 0.8)), i1 = Math.floor(Math.min(zf - 0.2, CAM.z + 70) / 0.8);
    for (let i = i0; i <= i1; i++) { const zi = 0.55 + 0.8 * i; if (zi + 0.4 > zf) break; const q0 = P(0, 0.003, zi), q1 = P(0, 0.003, zi + 0.26); g.beginPath(); g.ellipse(q0[0], (q0[1] + q1[1]) / 2, 0.17 * (q0[2] + q1[2]) / 2, Math.abs(q0[1] - q1[1]) / 2, 0, 0, 6.2832); g.fillStyle = C.aisleD; g.fill(); }
    [-1, 1].forEach((s) => {
      const x = 1.6 * s; quad([x, 0, zn], [x, 0, zf], [x, 2.4, zf], [x, 2.4, zn], C.wall, false); quad([x, 0, zn], [x, 0, zf], [x, 0.85, zf], [x, 0.85, zn], C.wall2, false);
      for (let i = i0; i <= i1; i++) { const zi = 0.55 + 0.8 * i; if (zi + 0.7 > zf) break; quad([x, 0.88, zi + 0.02], [x, 0.88, zi + 0.72], [x, 1.52, zi + 0.72], [x, 1.52, zi + 0.02], '#fff8e4', true, 0.9, 0.12); quad([x, 0.95, zi + 0.1], [x, 0.95, zi + 0.64], [x, 1.45, zi + 0.64], [x, 1.45, zi + 0.1], C.sky, true, 0.8, 0.1); quad([x, 0.95, zi + 0.1], [x, 0.95, zi + 0.64], [x, 1.1, zi + 0.64], [x, 1.1, zi + 0.1], '#86c2ea', false); }
      const bx = 0.6 * s; quad([1.6 * s, 1.72, zn], [bx, 1.72, zn], [bx, 1.72, zf], [1.6 * s, 1.72, zf], C.binB, false); quad([bx, 1.72, zn], [bx, 1.72, zf], [bx, 2.28, zf], [bx, 2.28, zn], C.bin, false);
      line3([bx, 1.72, zn], [bx, 1.72, zf], 1.2); line3([bx, 2.28, zn], [bx, 2.28, zf], 1.2);
      for (let z = Math.ceil(Math.max(zn, 0.4) / 1.6) * 1.6; z < zf; z += 1.6) { if (z > CAM.z + 60) break; line3([bx, 1.72, z], [bx, 2.28, z], 0.9); line3([bx, 2.0, z + 0.7], [bx, 2.0, z + 0.9], 0.8); }
    });
    line3([-1.6, 2.4, zn], [-1.6, 2.4, zf], 1); line3([1.6, 2.4, zn], [1.6, 2.4, zf], 1);
    for (let z = Math.ceil(Math.max(zn, 0.4) / 6) * 6; z < zf; z += 6) { if (z > CAM.z + 60) break; const lit = o.lamp ? 1 : 0; quad([-0.25, 2.39, z], [0.25, 2.39, z], [0.25, 2.39, z + 0.4], [-0.25, 2.39, z + 0.4], lit ? '#ffd84a' : '#56616d', true, 0.9); }
    // end wall
    quad([-1.6, 0, zf], [1.6, 0, zf], [1.6, 2.4, zf], [-1.6, 2.4, zf], '#efe3c1', true, 1, 0.1);
    if (o.end === 'door') {
      const dz = zf, op = o.door || 0;
      quad([-0.5, 0, dz], [0.5, 0, dz], [0.5, 2.05, dz], [-0.5, 2.05, dz], '#d6c9a4', true, 1, 0.14);
      quad([-0.45, 0, dz], [0.45, 0, dz], [0.45, 2.0, dz], [-0.45, 2.0, dz], '#46525f', false);
      const pa = P(-0.45, 2.0, dz), pb = P(0.45, 0, dz);
      if (op > 0.02) { const pt = P(0, 0, dz + 0.5); g.save(); rpath([[pa[0], pa[1]], [pb[0], pa[1]], [pb[0], pb[1]], [pa[0], pb[1]]], 0.12 * pa[2], 3); g.clip(); unitDraw(pt[0], pt[1], pt[2], toiletUnit); o.inside && o.inside(); g.restore(); }
      g.save(); rpath([[pa[0], pa[1]], [pb[0], pa[1]], [pb[0], pb[1]], [pa[0], pb[1]]], 0.12 * pa[2], 3); g.clip();
      const off = op * 0.92; quad([-0.45 + off, 0, dz], [0.45 + off, 0, dz], [0.45 + off, 2.0, dz], [-0.45 + off, 2.0, dz], '#8f9ba8', true, 1, 0.1);
      quad([-0.3 + off, 1.0, dz], [-0.22 + off, 1.0, dz], [-0.22 + off, 1.2, dz], [-0.3 + off, 1.2, dz], '#c9d1d9', true, 0.8);
      quad([-0.3 + off, 0.35, dz], [0.3 + off, 0.35, dz], [0.3 + off, 0.4, dz], [-0.3 + off, 0.4, dz], '#7c8895', false);
      g.restore(); rpath([[pa[0], pa[1]], [pb[0], pa[1]], [pb[0], pb[1]], [pa[0], pb[1]]], 0.12 * pa[2], 3); g.lineWidth = lwOf(pa[2]); g.strokeStyle = OUT; g.stroke();
      quad([0.58, 1.18, dz], [0.76, 1.18, dz], [0.76, 1.46, dz], [0.58, 1.46, dz], '#fdfdfd', true);
      const [ix, iy, ik] = P(0.67, 1.32, dz); g.beginPath(); g.arc(ix, iy, 0.055 * ik, 0, 6.2832); g.fillStyle = o.ind === 'green' ? '#38c46b' : '#e64a3b'; g.fill(); g.lineWidth = lwOf(ik) * 0.8; g.strokeStyle = OUT; g.stroke();
      quad([-0.28, 2.1, dz], [0.28, 2.1, dz], [0.28, 2.36, dz], [-0.28, 2.36, dz], '#3b78d4', true, 1, 0.06);
      const [sx, sy, sk] = P(0, 2.23, dz); g.fillStyle = '#fff'; g.beginPath(); g.arc(sx - 0.05 * sk, sy - 0.06 * sk, 0.035 * sk, 0, 6.2832); g.fill(); g.fillRect(sx - 0.085 * sk, sy - 0.02 * sk, 0.07 * sk, 0.09 * sk); g.beginPath(); g.arc(sx + 0.07 * sk, sy - 0.06 * sk, 0.035 * sk, 0, 6.2832); g.fill(); g.fillRect(sx + 0.035 * sk, sy - 0.02 * sk, 0.07 * sk, 0.09 * sk);
    } else {
      quad([-0.9, 0, zf], [0.9, 0, zf], [0.9, 2.2, zf], [-0.9, 2.2, zf], '#3a5b8c', true, 1, 0.12);
      for (let i = 1; i < 6; i++) line3([-0.9 + i * 0.3, 0, zf], [-0.9 + i * 0.3, 2.2, zf], 0.8);
    }
  }

  // ---------- corridor scene (B, C, D) ----------
  const WS = EV.walkStart, WE = EV.walkEnd, TW = WE - WS, SPD = EV.speed;
  function walkS(t) { const u = clamp(t - WS, 0, TW), r = 1.0; if (u < r) return 0.5 * u * u; if (u < TW - r) return u - 0.5; const d = u - (TW - r); return (TW - r - 0.5) + d - 0.5 * d * d / r; }
  const camZ = (t) => SPD * walkS(t);
  const rowAt = (t) => Math.round((camZ(t) + 2.5) / 0.8);
  const ROW_SLEEP = rowAt(14.6), ROW_KID = rowAt(21.9);
  const Zend = camZ(WE);
  function corridor(t) {
    const walking = between(t, WS, WE), s = walkS(t), ph = (SPD * s) / 1.35 * 6.2832;
    CAM.z = camZ(t); const sway = walking ? Math.sin(ph) : 0; CAM.x = sway * 0.022; CAM.y = 1.25 + (walking ? Math.abs(Math.sin(ph)) * 0.012 : 0); CAM.vx = 540; CAM.vy = 800;
    const D = lerp(95, 3.4, ease(prog(t, 33, WE))), wallZ = CAM.z + D;
    const doorOp = (between(t, 48.8, 49.6) ? ease(prog(t, 48.8, 49.6)) : (t >= 49.6 && t < 56.4) ? 1 : between(t, 56.4, 57.2) ? 1 - ease(prog(t, 56.4, 57.2)) : (t >= 62.8 ? ease(prog(t, 62.8, 63.6)) : 0));
    const ind = (t >= 48.3 && t < 57.2) || t >= 62.5 ? 'green' : 'red';
    const lamp = between(t, 17.8, 19.8) || between(t, 30.2, 32.2) || between(t, 1.6, 3.6);
    const hz = CAM.z + 2.5, items = [];
    // hero state
    let hx = 0, hz2 = hz, hs = { back: true, walk: walking, ph, open: 0.5 }, heroFront = false, inDoor = false;
    if (t >= WE) { hz2 = wallZ - 0.9; }
    if (t >= 41.2 && t < 47.6) { const tp = EV.taps.find((a) => t >= a && t < a + 0.35); if (tp !== undefined) hs.tapL = Math.sin(prog(t, tp, tp + 0.35) * 3.1416) * 0.07; }
    if (t >= 51.0 && t < 54.4) hx = -0.4 * ease(prog(t, 51.0, 51.9)) * (1 - ease(prog(t, 53.4, 54.3)));
    if (t >= 54.4 && t < 56.5) { const k = ease(prog(t, 54.4, 56.2)); hz2 = lerp(wallZ - 0.9, wallZ + 0.35, k); hs.walk = true; hs.ph = k * 9; }
    if (t >= 56.5 && t < 62.8) { hz2 = wallZ + 0.35; inDoor = true; }
    if (t >= 62.8) { const k = ease(prog(t, 63.2, 64.7)); hz2 = lerp(wallZ + 0.35, wallZ - 0.85, k); heroFront = true; hs = { back: false, walk: k > 0 && k < 1, ph: k * 8, open: 0.52, mouth: t > 64.0 ? 'ease' : 'flat' }; }
    if (t >= 54.4 && t < 62.8) { /* inside / entering: back */ }
    // cart gag
    let squeeze = 0;
    const ct = EV.cart[0], rc = 12 - 3.7 * (t - ct);
    if (t >= ct - 0.3 && t < EV.cart[1] && rc > 0.2) { squeeze = ease(prog(t, 27.2, 28.4)) * (1 - ease(prog(t, 29.3, 30.4))); }
    if (t >= 27 && t < 31) { hx = -0.3 * squeeze; hs.sq = 1 - 0.5 * squeeze; }
    // sleepers & kid & heads rows
    const rows = []; const i0 = Math.max(0, Math.floor((CAM.z - 0.8) / 0.8)), i1 = Math.floor(Math.min(wallZ - 0.7, CAM.z + 60) / 0.8);
    for (let i = i0; i <= i1; i++) {
      const zi = 0.55 + 0.8 * i; if (zi + 0.4 > wallZ || zi + 0.6 < CAM.z + 0.2) continue;
      items.push({ z: zi + 0.3, fn: () => {
        [-1, 1].forEach((s) => [true, false].forEach((outer) => { seatBack(zi, s, outer);
          const kk = outer ? 0 : 1, xc = s < 0 ? (outer ? -1.34 : -0.89) : (outer ? 1.34 : 0.89);
          const isSleep = i === ROW_SLEEP && s > 0 && !outer, isKid = i === ROW_KID && s < 0 && !outer;
          if (isSleep) { headBack(xc + 0.08, 1.33, zi + 0.3, 0.17, '#5a3b22', 0.5); zeds(xc, 1.4, zi + 0.3, t); }
          else if (isKid) { const [sx, sy, k] = P(xc, 1.36, zi + 0.3), face = P(0, 0, hz)[0], lookX = clamp((face - sx) / 260, -1, 1) * (t < 22.6 ? 1 : 0), pass = t > 22.6; g.beginPath(); g.arc(sx, sy, 0.16 * k, 0, 6.2832); g.fillStyle = '#f3c79c'; g.fill(); g.lineWidth = lwOf(k); g.strokeStyle = OUT; g.stroke();
            g.beginPath(); g.arc(sx, sy - 0.03 * k, 0.16 * k, 3.4, 6.0); g.lineTo(sx, sy - 0.1 * k); g.fillStyle = C.hair; g.fill();
            [-1, 1].forEach((e) => { const ex = sx + e * 0.06 * k; g.beginPath(); g.ellipse(ex, sy + 0.01 * k, 0.04 * k, 0.045 * k, 0, 0, 6.2832); g.fillStyle = '#fff'; g.fill(); g.lineWidth = lwOf(k) * 0.7; g.stroke(); g.beginPath(); g.arc(ex + lookX * 0.015 * k, sy + 0.02 * k, 0.018 * k, 0, 6.2832); g.fillStyle = OUT; g.fill(); });
            g.beginPath(); g.moveTo(sx - 0.04 * k, sy + 0.1 * k); g.lineTo(sx + 0.04 * k, sy + 0.1 * k); g.lineWidth = lwOf(k) * 0.8; g.stroke(); }
          else if (occ(i, s, kk)) headBack(xc, 1.37, zi + 0.3, 0.15, HAIR[Math.floor(hf(i, s, 9) * HAIR.length)]);
        }));
      } });
    }
    // billboards
    const heroItem = () => { const [sx, sy, k] = P(hx, 0, hz2); const bobY = hs.walk ? Math.abs(Math.sin(hs.ph)) * 0.012 : 0; unitDraw(sx, sy - bobY * k, k, () => hero(hs)); };
    if (!inDoor || true) items.push({ z: hz2, fn: () => { if (inDoor) { const pa = P(-0.45, 2.0, wallZ), pb = P(0.45, 0, wallZ); g.save(); rpath([[pa[0], pa[1]], [pb[0], pa[1]], [pb[0], pb[1]], [pa[0], pb[1]]], 0.12 * pa[2], 3); g.clip(); heroItem(); g.restore(); } else heroItem(); }, late: true });
    if (t >= ct - 0.3 && t < EV.cart[1]) {
      const za = CAM.z + rc + 0.75, zc = CAM.z + rc; if (rc > 0.2) { items.push({ z: za, fn: () => { const [sx, sy, k] = P(0.12, 0, za); unitDraw(sx, sy, k, attendant); } }); items.push({ z: zc, fn: () => { const [sx, sy, k] = P(0.12, 0, zc); unitDraw(sx, sy, k, cart); } }); }
    }
    // twin
    if (t >= 49.6 && t < 55.4) {
      let tz, tx = 0, look = [0, 0], armsF = false, wk = false, tph = 0;
      const a = prog(t, 49.8, 51.3), b = prog(t, 53.2, 54.8), fx = 0.22 * ease(prog(t, 50.6, 51.6)) * (1 - ease(prog(t, 53.0, 53.6)));
      if (t < 51.3) { tz = lerp(wallZ - 0.15, hz + 0.55, ease(a)); tx = fx; wk = true; tph = a * 6; }
      else if (t < 53.2) { tz = hz + 0.55; tx = fx; armsF = true; look = [-0.9, 0]; }
      else { tz = lerp(hz + 0.55, CAM.z + 0.7, easeIn(b)); tx = fx + 0.2 * ease(prog(t, 53.2, 54.0)); wk = true; tph = 6 + b * 6; look = [t < 53.8 ? -0.8 : 0.2, 0]; }
      items.push({ z: tz, fn: () => { const [sx, sy, k] = P(tx, 0, tz); unitDraw(sx, sy, k, () => hero({ back: false, walk: wk, ph: tph, open: 0.72, look, armsFolded: armsF, mouth: 'flat' })); } });
    }
    items.sort((a, b) => b.z - a.z);
    cabinShell({ wallZ, end: 'door', lamp, door: doorOp, ind, inside: null });
    items.forEach((it) => it.fn());
  }

  // ---------- reverse view (E): short aisle, he sits ----------
  function sceneE(t) {
    CAM.z = 0; CAM.x = 0; CAM.y = 1.25; const wallZ = 26;
    const u = clamp((t - EV.eStep[0]) / (EV.eStep[1] - EV.eStep[0]));
    const seatZ = 0.55 + 0.8 * 5 + 0.3; const walkU = easeOut(prog(t, EV.eStep[0], EV.eStep[1] - 0.5));
    const hz = lerp(2.5, seatZ, walkU), moveX = ease(prog(t, EV.eStep[1] - 0.6, EV.eStep[1] + 0.8)), hx = -1.34 * moveX;
    const walking = t >= EV.eStep[0] && t < EV.eStep[1] + 0.8, ph = u * 14;
    const items = []; for (let i = 0; i <= 28; i++) { const zi = 0.55 + 0.8 * i; if (zi < 0.3) continue; items.push({ z: zi + 0.3, fn: () => { [-1, 1].forEach((s) => [true, false].forEach((outer) => { seatBack(zi, s, outer); const xc = s < 0 ? (outer ? -1.34 : -0.89) : (outer ? 1.34 : 0.89); if (!(i === 5 && s < 0) && occ(i + 40, s, outer ? 0 : 1)) headBack(xc, 1.37, zi + 0.3, 0.15, HAIR[Math.floor(hf(i + 40, s, 9) * HAIR.length)]); })); } }); }
    items.push({ z: hz, fn: () => { const sit = ease(prog(t, EV.eStep[1] - 0.2, EV.eStep[1] + 0.8)) * 0.06; const [sx, sy, k] = P(hx, -sit, hz); unitDraw(sx, sy - (walking ? Math.abs(Math.sin(ph)) * 0.012 * k : 0), k, () => hero({ back: true, walk: walking && moveX < 0.05, ph })); } });
    items.sort((a, b) => b.z - a.z);
    cabinShell({ wallZ, end: 'curtain', lamp: false });
    items.forEach((it) => it.fn());
  }

  // ---------- seated close-up (A start, F end) ----------
  function seated(t, F) {
    const shake = (() => { let a = 0; EV.gurgles.forEach(([s0, d]) => { if (between(t, s0, s0 + d)) a = Math.max(a, (F ? 0.5 : (s0 > 4 ? 1 : 0.5)) * Math.sin(Math.PI * prog(t, s0, s0 + d))); }); return a; })();
    g.save(); g.translate(Math.sin(t * 60) * 4 * shake, Math.cos(t * 53) * 3 * shake);
    g.fillStyle = C.wall; g.fillRect(-20, -20, W + 40, H + 40);
    g.fillStyle = C.wall2; g.fillRect(-20, 1050, W + 40, 900);
    // overhead bin + PSU
    g.beginPath(); g.roundRect(-40, -40, W + 80, 380, [0, 0, 90, 90]); g.fillStyle = C.bin; g.fill(); g.lineWidth = 6; g.strokeStyle = OUT; g.stroke();
    g.beginPath(); g.roundRect(-40, 330, W + 80, 110, [0, 0, 60, 60]); g.fillStyle = C.binB; g.fill(); g.stroke();
    [[70, 110, 220, 70], [720, 150, 260, 60]].forEach(([x, y, w, h]) => { g.beginPath(); g.roundRect(x, y, w, h, 28); g.fillStyle = '#d8ccaa'; g.fill(); g.stroke(); });
    const lit = EV.dings.some((d) => (F ? d >= 60 : d < 10) && between(t, d, d + 2.2));
    g.beginPath(); g.roundRect(640, 365, 140, 60, 14); g.fillStyle = lit ? '#ffd84a' : '#56616d'; g.fill(); g.lineWidth = 5; g.stroke();
    g.fillStyle = lit ? '#17202b' : '#7a8591'; g.beginPath(); g.arc(690, 395, 10, 0, 6.2832); g.fill(); g.beginPath(); g.roundRect(703, 391, 36, 8, 4); g.fill();
    if (lit) { g.save(); g.globalAlpha = 0.35 * (0.6 + 0.4 * Math.sin(t * 14)); g.fillStyle = '#ffe98a'; g.beginPath(); g.ellipse(710, 395, 120, 54, 0, 0, 6.2832); g.fill(); g.restore(); }
    g.beginPath(); g.arc(240, 398, 22, 0, 6.2832); g.fillStyle = '#c9bb96'; g.fill(); g.lineWidth = 5; g.stroke();
    // window
    g.beginPath(); g.roundRect(-60, 470, 330, 600, 120); g.fillStyle = '#fff8e4'; g.fill(); g.lineWidth = 7; g.stroke();
    g.save(); g.beginPath(); g.roundRect(-30, 505, 270, 530, 95); g.clip(); g.fillStyle = C.sky; g.fillRect(-60, 470, 340, 620);
    for (let i = 0; i < 3; i++) { const cx = ((i * 190 - t * 36 + 800) % 520) - 120, cy = 640 + i * 150; g.beginPath(); g.ellipse(cx, cy, 90, 36, 0, 0, 6.2832); g.ellipse(cx + 50, cy - 20, 60, 34, 0, 0, 6.2832); g.fillStyle = '#fff'; g.fill(); }
    g.fillStyle = 'rgba(40,90,150,.18)'; g.fillRect(-60, 800, 340, 300); g.restore();
    g.beginPath(); g.roundRect(-30, 505, 270, 530, 95); g.lineWidth = 6; g.strokeStyle = OUT; g.stroke();
    // seat
    const leaveK = F ? 0 : easeIn(prog(t, 7.0, 7.9)); const gone = !F && t >= 7.9;
    g.beginPath(); g.roundRect(250, 560, 580, 1500, 130); g.fillStyle = C.seat; g.fill(); g.lineWidth = 7; g.strokeStyle = OUT; g.stroke();
    g.fillStyle = C.seatD; g.beginPath(); g.roundRect(700, 580, 120, 1450, 70); g.fill();
    g.beginPath(); g.roundRect(330, 610, 420, 360, 60); g.fillStyle = C.pillow; g.fill(); g.stroke();
    // armrests
    [170, 770].forEach((x) => { g.beginPath(); g.roundRect(x, 1500, 140, 260, 44); g.fillStyle = C.arm; g.fill(); g.lineWidth = 6; g.strokeStyle = OUT; g.stroke(); g.beginPath(); g.roundRect(x, 1500, 140, 70, 34); g.fillStyle = C.armT; g.fill(); g.stroke(); });
    // heroes
    const sit = (!F && t < 8.4) || F;
    const op = (() => { let o = 0.68; if (!F) { if (between(t, 2.2, 2.45)) o = 0.05; if (between(t, 5.3, 6.9)) o = 0.12; if (between(t, 3.0, 4.2)) o = 0.42; } else { if (between(t, 70.6, 70.85)) o = 0.05; if (between(t, 72.4, 73.4)) o = 0.85; if (t >= 73.6) o = 0.1; if (t >= 69.0 && t < 70.0) o = 0.5; } return o; })();
    let look = [0, 0], mouth = 'flat', sweat = 0;
    if (!F) { if (between(t, 1.8, 2.7)) look = [0.2, 1.4]; if (between(t, 3.0, 4.4)) { look = [0, -1.3]; mouth = 'wave'; } if (between(t, 4.6, 5.0)) look = [1.3, 0]; if (between(t, 5.0, 6.8)) { mouth = 'grit'; sweat = prog(t, 5.0, 6.4); look = [1.2, 0]; } if (t >= 6.8) { look = [1.2, 0]; mouth = 'grit'; sweat = 1; } }
    else { if (between(t, 72.4, 73.6)) { mouth = 'o'; look = [0, -1.2]; } if (t >= 73.6) { mouth = 'ease'; } }
    const gx = 0, hy = 900, k = 830, sq = shake * 0.012;
    if (sit || leaveK > 0) {
      g.save(); g.translate(0, -leaveK * 1700); unitDraw(540, hy + 1.3 * k, k, () => { g.scale(1 + sq, 1 - sq); hero({ back: false, seated: true, open: op, look, mouth, sweat, armsFolded: false, tilt: Math.sin(t * 0.7) * 0.02 + shake * 0.03 }); }); g.restore();
    }
    if (!gone || F) { if (!F ? t < 6.6 : t < 69.5) { g.beginPath(); g.roundRect(330, 1620, 420, 60, 24); g.fillStyle = '#7c8794'; g.fill(); g.lineWidth = 5; g.stroke(); g.beginPath(); g.roundRect(500, 1612, 80, 76, 18); g.fillStyle = '#c9d1d9'; g.fill(); g.stroke(); } }
    g.restore();
  }

  // ---------- compositing, whips ----------
  function sceneA(t) { CAM.z = 0; seated(t, false); }
  function sceneF(t) { seated(t, true); }
  function drawAt(fn, t, dx) { g.save(); g.translate(dx, 0); g.beginPath(); g.rect(0, 0, W, H); g.clip(); fn(t); g.restore(); }
  function streaks(e) { g.save(); g.globalAlpha = 0.6 * Math.sin(Math.PI * e); g.strokeStyle = '#fff'; g.lineCap = 'round'; for (let i = 0; i < 14; i++) { const y = hf(i, 3, 5) * H, l = 300 + hf(i, 4, 5) * 500, x = lerp(W + 100, -l - 100, e) + hf(i, 5, 5) * 200; g.lineWidth = 6 + hf(i, 6, 5) * 12; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y); g.stroke(); } g.restore(); }
  function scene(t) {
    const [w0, w1] = EV.whips[0], [x0, x1] = EV.whips[1], [y0, y1] = EV.whips[2];
    if (t < w0) return sceneA(t);
    if (t < w1) { const e = ease(prog(t, w0, w1)); drawAt(sceneA, t, -W * e); drawAt(corridor, t, W * (1 - e)); return streaks(e); }
    if (t < x0) return corridor(t);
    if (t < x1) { const e = ease(prog(t, x0, x1)); drawAt(corridor, t, -W * e); drawAt(sceneE, t, W * (1 - e)); return streaks(e); }
    if (t < y0) return sceneE(t);
    if (t < y1) { const e = ease(prog(t, y0, y1)); drawAt(sceneE, t, -W * e); drawAt(sceneF, t, W * (1 - e)); return streaks(e); }
    return sceneF(t);
  }
  function frame(t) {
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.clearRect(0, 0, W, H); scene(t);
    const fade = Math.max(1 - t / 0.8, (t - (EV.dur - 2.4)) / 1.6); if (fade > 0) { g.fillStyle = `rgba(244,233,201,${clamp(fade)})`; g.fillRect(0, 0, W, H); }
  }
  window.frame = frame; window.grabPNG = (t) => { frame(t); return cv.toDataURL('image/png').split(',')[1]; };
  window.READY = true;
})();
