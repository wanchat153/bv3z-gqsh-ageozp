'use strict';
// ---------- core: math, spline, brush, paper ----------
const W = 1080, H = 1920;
const LOOP = 6.4, LW = 2 * Math.PI / LOOP; // every periodic motion must complete whole cycles in LOOP seconds
const LQ = (k) => Math.max(1, Math.round(k / LW)) * LW;
const INKC = '#161312', EYEW = '#F4EDDE', PAPERC = '#EEE5D1';
const fr = (x) => x - Math.floor(x);
const h1 = (x) => fr(Math.sin(x * 127.1 + 311.7) * 43758.5453);
const hash = (a, b = 0) => h1(a * 12.9898 + b * 78.233 + 0.123);
function vnoise(x, seed = 0) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return h1(i + seed * 57.31) * (1 - u) + h1(i + 1 + seed * 57.31) * u; }
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const sstep = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
const ease = (u) => { u = clamp(u); return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const eOut = (u) => 1 - Math.pow(1 - clamp(u), 3);
const eIn = (u) => Math.pow(clamp(u), 3);
const seg = (t, a, b) => clamp((t - a) / (b - a));
const win = (t, a, b, fi, fo) => Math.min(sstep((t - a) / fi), sstep((b - t) / fo));
function kf(t, K, e = ease) {
  if (t <= K[0][0]) return K[0].slice(1);
  for (let i = 1; i < K.length; i++) if (t < K[i][0]) { const a = K[i - 1], b = K[i], u = e((t - a[0]) / (b[0] - a[0])); return a.slice(1).map((v, j) => lerp(v, b[j + 1], u)); }
  return K[K.length - 1].slice(1);
}
function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// Catmull-Rom densify
function cr(P, closed = false, sub = 10) {
  const n = P.length, out = [], g = (i) => closed ? P[((i % n) + n) % n] : P[Math.max(0, Math.min(n - 1, i))];
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    for (let k = 0; k < sub; k++) {
      const t = k / sub, t2 = t * t, t3 = t2 * t, f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  if (!closed) out.push(P[n - 1].slice());
  return out;
}
// resample polyline to N points evenly by arc length
function sampleN(P, N, closed) {
  const pts = closed ? P.concat([P[0]]) : P, cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = cum[cum.length - 1], out = []; let j = 1;
  const M = closed ? N : N - 1;
  for (let k = 0; k < N; k++) {
    const s = L * k / M; while (j < cum.length - 1 && cum[j] < s) j++;
    const u = (s - cum[j - 1]) / Math.max(1e-9, cum[j] - cum[j - 1]);
    out.push([lerp(pts[j - 1][0], pts[j][0], u), lerp(pts[j - 1][1], pts[j][1], u)]);
  }
  return out;
}
function plen(P) { let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return L; }
// prepared stroke: dense centerline, spacing ~step px
function prep(ctrl, step = 3, sub = 12) { const d = cr(ctrl, false, sub), L = plen(d); return { P: sampleN(d, Math.max(3, Math.round(L / step)), false), L }; }

// ---------- brush stroke (sumi-e): pressed head, pressure noise, tapered tail, ragged edges ----------
function prof(s, o) {
  const head = o.head ?? 0.07, taper = o.taper ?? 0.3, sd = o.seed || 0;
  let w = s < head ? 0.5 + 0.5 * sstep(s / head) : 1;
  w *= 0.66 + 0.68 * vnoise(s * (o.pf ?? 2.6), sd + 9);
  if (s > 1 - taper) w *= Math.pow(Math.max(0, (1 - s) / taper), o.tp ?? 0.8);
  if (o.pw) w *= o.pw(s);
  return Math.max(o.minw ?? 0.05, w);
}
function outline(S, o) {
  const P = S.P, n = P.length, from = o.from ?? 0, to = o.to ?? 1;
  const i0 = Math.floor(from * (n - 1)), i1 = Math.min(n - 1, Math.max(i0 + 1, Math.round(to * (n - 1))));
  const L = [], R = [], sd = o.seed || 0, rag = o.rag ?? 0.22;
  let wEnd = 0, wStart = 0;
  for (let i = i0; i <= i1; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const w = o.w * prof(i / (n - 1), o);
    const f2 = o.fuzz ?? 0.12, wl = w * (1 + rag * (vnoise(i * 0.13, sd) - 0.5) * 2 + f2 * (vnoise(i * 0.8, sd + 1.7) - 0.5) * 2), wr = w * (1 + rag * (vnoise(i * 0.13, sd + 3.3) - 0.5) * 2 + f2 * (vnoise(i * 0.8, sd + 5.1) - 0.5) * 2);
    L.push([P[i][0] - ty * wl, P[i][1] + tx * wl]); R.push([P[i][0] + ty * wr, P[i][1] - tx * wr]);
    if (i === i1) wEnd = w; if (i === i0) wStart = w;
  }
  return { L, R, i0, i1, wEnd, wStart };
}
function strokePath(ctx, S, o) {
  const { L, R, i0, i1, wEnd, wStart } = outline(S, o), P = S.P;
  ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i < L.length; i++) ctx.lineTo(L[i][0], L[i][1]);
  const e = P[i1], ae = Math.atan2(L[L.length - 1][1] - e[1], L[L.length - 1][0] - e[0]);
  if (wEnd > 1) ctx.arc(e[0], e[1], wEnd, ae, ae + Math.PI, true);
  for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
  const s0 = P[i0], as = Math.atan2(R[0][1] - s0[1], R[0][0] - s0[0]);
  if (wStart > 1) ctx.arc(s0[0], s0[1], wStart, as, as + Math.PI, true);
  ctx.closePath();
}
// dry brush (kasure): erase bristle streaks in the dry part of the stroke
function kasure(ctx, S, o) {
  const dry = o.dry || 0; if (dry <= 0) return;
  const P = S.P, n = P.length, from = o.from ?? 0, to = o.to ?? 1, ds = 1 - dry, sd = o.seed || 0;
  const i0 = Math.max(Math.floor(from * (n - 1)), Math.floor(ds * (n - 1))), i1 = Math.min(n - 1, Math.round(to * (n - 1)));
  if (i1 <= i0 + 1) return;
  ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.lineCap = 'round';
  const K = o.bristles ?? 7;
  for (let k = 0; k < K; k++) {
    const off = -0.78 + 1.56 * (k + 0.5 * hash(k, sd)) / K, lwf = 0.1 + 0.12 * hash(k + 7, sd);
    let on = false; ctx.beginPath(); let lw = 0;
    for (let i = i0; i <= i1; i++) {
      const s = i / (n - 1), q = (s - ds) / dry, thr = lerp(0.8, 0.28, q) - (o.dryAmt ?? 0);
      const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const w = o.w * prof(s, o); lw = Math.max(lw, w);
      const x = P[i][0] - ty * w * off, y = P[i][1] + tx * w * off;
      const vis = vnoise(i * 0.09 + k * 13.7, sd + k) > thr;
      if (vis) { if (!on) { ctx.moveTo(x, y); on = true; } else ctx.lineTo(x, y); } else on = false;
    }
    ctx.lineWidth = Math.max(0.8, lw * lwf); ctx.strokeStyle = 'rgba(0,0,0,0.9)'; ctx.stroke();
  }
  ctx.restore();
}
// full brush stroke onto ctx (ink layer)
function brush(ctx, S, o) {
  if ((o.a ?? 1) <= 0.003 || (o.to ?? 1) <= (o.from ?? 0)) return;
  ctx.fillStyle = o.col || INKC; ctx.globalAlpha = o.a ?? 1;
  if (o.fade != null) { // ink runs out: tone fades along the stroke
    const P = S.P, n = P.length, a0 = P[0], a1 = P[n - 1], g = ctx.createLinearGradient(a0[0], a0[1], a1[0], a1[1]);
    g.addColorStop(0, 'rgba(22,19,18,1)'); g.addColorStop(0.35, 'rgba(22,19,18,0.92)'); g.addColorStop(1, `rgba(22,19,18,${o.fade})`); ctx.fillStyle = g;
  }
  strokePath(ctx, S, o); ctx.fill();
  if (o.wet) { // darker wet head
    const o2 = Object.assign({}, o, { w: o.w * 0.62, to: Math.min(o.to ?? 1, o.wet), taper: 0.5, rag: 0.3 });
    if ((o2.to) > (o.from ?? 0) + 0.02) { ctx.globalAlpha = (o.a ?? 1) * 0.35; strokePath(ctx, S, o2); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  if (o.stri !== 0) striate(ctx, S, o);
  kasure(ctx, S, o);
  if (o.wctx && (o.wetA ?? 0) > 0.02) { for (const [c, al] of [[o.wctx, o.a ?? 1], [o.wmctx, o.wetA * (o.a ?? 1)]]) { if (!c) continue; c.globalAlpha = al; c.fillStyle = '#fff'; strokePath(c, S, o); c.fill(); c.globalAlpha = 1; } }
}
// dynamic stroke from control points (computed every frame)
function brushPts(ctx, ctrl, o, step = 3) { const S = prep(ctrl, step, o.sub ?? 8); brush(ctx, S, o); return S; }
function ellPts(cx, cy, rx, ry, n = 20, a0 = -Math.PI / 2, turns = 1, rot = 0) {
  const p = []; for (let i = 0; i <= n; i++) { const a = a0 + turns * 2 * Math.PI * i / n, x = Math.cos(a) * rx, y = Math.sin(a) * ry; p.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]); } return p;
}
function fillPoly(ctx, pts, col, a = 1) { ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }

// ---------- canvases ----------
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
let PAPER, GRAIN, FIB, VIG;
function buildPaper() {
  const R = rng(7);
  PAPER = mk(W, H); const p = PAPER.getContext('2d');
  p.fillStyle = PAPERC; p.fillRect(0, 0, W, H);
  // low-frequency mottling
  const m = mk(27, 48), mc = m.getContext('2d');
  for (let y = 0; y < 48; y++) for (let x = 0; x < 27; x++) { const v = R(); mc.fillStyle = v < 0.5 ? `rgba(150,120,80,${(0.5 - v) * 0.12})` : `rgba(255,252,240,${(v - 0.5) * 0.18})`; mc.fillRect(x, y, 1, 1); }
  p.imageSmoothingQuality = 'high'; p.filter = 'blur(28px)'; p.drawImage(m, -60, -60, W + 120, H + 120); p.filter = 'none';
  // fibers (kozo)
  FIB = mk(W, H); const f = FIB.getContext('2d');
  for (let i = 0; i < 1700; i++) {
    const x = R() * W, y = R() * H, len = 12 + R() * R() * 110, a = R() * Math.PI * 2, c = (R() - 0.5) * 0.9;
    const lw = 0.4 + R() * 1.3, light = R() < 0.82;
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len, mx = (x + x2) / 2 + Math.cos(a + 1.57) * len * c * 0.5, my = (y + y2) / 2 + Math.sin(a + 1.57) * len * c * 0.5;
    const col = light ? `rgba(255,251,240,${0.08 + R() * 0.2})` : `rgba(140,112,80,${0.04 + R() * 0.06})`;
    for (const g of light ? [p, f] : [p]) { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(mx, my, x2, y2); g.stroke(); }
  }
  // speckles
  for (let i = 0; i < 900; i++) { p.fillStyle = `rgba(120,95,60,${0.05 + R() * 0.12})`; p.beginPath(); p.arc(R() * W, R() * H, 0.4 + R() * 1.2, 0, 7); p.fill(); }
  // grain
  GRAIN = mk(W, H); const g = GRAIN.getContext('2d'), id = g.createImageData(W, H), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const v = 255 - Math.floor(R() * R() * 60); d[i] = v; d[i + 1] = v - 2; d[i + 2] = v - 6; d[i + 3] = 255; }
  g.putImageData(id, 0, 0);
  VIG = mk(W, H); const v = VIG.getContext('2d'), rg = v.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.62);
  rg.addColorStop(0, 'rgba(70,50,30,0)'); rg.addColorStop(1, 'rgba(70,50,30,0.2)'); v.fillStyle = rg; v.fillRect(0, 0, W, H);
}

// ================= v2: liquid ink helpers =================
// recursive midpoint displacement (watercolor-style deformation)
function deformPoly(P, depth, amt, sd) {
  let Q = P.map((p) => p.slice());
  for (let d = 0; d < depth; d++) {
    const R = [], n = Q.length;
    for (let i = 0; i < n; i++) {
      const a = Q[i], b = Q[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      const g = (hash(i + d * 97.1, sd) + hash(i * 3.3 + d, sd + 1) + hash(i * 7.7 + d, sd + 2) - 1.5) * 0.9;
      R.push(a, [(a[0] + b[0]) / 2 - dy / L * g * L * amt, (a[1] + b[1]) / 2 + dx / L * g * L * amt]);
    }
    Q = R;
  }
  return Q;
}
// layered ink wash cached to a canvas: {c, x0, y0, w, h}
function buildWash(poly, o = {}) {
  const sc = o.sc || 1.25, m = o.margin || 70, sd = o.seed || 1, layers = o.layers || 22;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of poly) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  x0 -= m; y0 -= m; x1 += m; y1 += m;
  const c = mk(Math.ceil((x1 - x0) * sc), Math.ceil((y1 - y0) * sc)), g = c.getContext('2d');
  g.setTransform(sc, 0, 0, sc, -x0 * sc, -y0 * sc);
  const base = deformPoly(poly, 2, o.baseAmt ?? 0.3, sd);
  for (let L = 0; L < layers; L++) fillPoly(g, deformPoly(base, 3, o.amt ?? 0.22, sd + L * 13.7), INKC, o.la ?? 0.03);
  if (o.grad) { g.globalCompositeOperation = 'destination-in'; const gr = g.createLinearGradient(0, o.grad[0], 0, o.grad[1]); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x0, y0, x1 - x0, y1 - y0); g.globalCompositeOperation = 'source-over'; }
  // wet edge darkening (pigment gathers at the drying edge)
  if (o.edge !== 0) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    const b = mk(c.width, c.height), bg = b.getContext('2d'); bg.filter = `blur(${Math.round(7 * sc)}px)`; bg.drawImage(c, 0, 0); bg.filter = 'none';
    const r = mk(c.width, c.height), rg = r.getContext('2d'); rg.drawImage(c, 0, 0); rg.globalCompositeOperation = 'destination-out'; rg.globalAlpha = 0.9; rg.drawImage(b, 0, 0);
    g.globalAlpha = o.edge ?? 0.7; g.drawImage(r, 0, 0); g.globalAlpha = 1;
  }
  return { c, x0, y0, w: x1 - x0, h: y1 - y0 };
}
function drawWash(ctx, Wc, a = 1) { if (a <= 0.003) return; ctx.globalAlpha = a; ctx.drawImage(Wc.c, Wc.x0, Wc.y0, Wc.w, Wc.h); ctx.globalAlpha = 1; }
// organic spreading clip (wet front)
function spreadClip(ctx, cx, cy, r, sd, ry = 1) { ctx.beginPath(); for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 2, rr = r * (1 + 0.16 * (vnoise(i * 0.55, sd) - 0.5) * 2 + 0.06 * (vnoise(i * 2.1, sd + 3) - 0.5)); const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * ry; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); ctx.clip(); }
// fiber mask for nijimi (ink wicking along washi fibers)
let FIBM;
function buildFiberMask() {
  const R = rng(31); FIBM = mk(W, H); const g = FIBM.getContext('2d');
  g.fillStyle = 'rgba(255,255,255,0.28)'; g.fillRect(0, 0, W, H); g.lineCap = 'round';
  for (let i = 0; i < 26000; i++) {
    const x = R() * W, y = R() * H, a = R() * Math.PI * 2, len = 4 + R() * R() * 34;
    g.strokeStyle = `rgba(255,255,255,${0.35 + R() * 0.65})`; g.lineWidth = 0.6 + R() * 1.3;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.4) * len * 0.5, y + Math.sin(a + 0.4) * len * 0.5, x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
  }
}
// bristle striation along the whole stroke (hair texture)
function striate(ctx, S, o) {
  const P = S.P, n = P.length, from = o.from ?? 0, to = o.to ?? 1, sd = o.seed || 0;
  const i0 = Math.floor(from * (n - 1)), i1 = Math.min(n - 1, Math.round(to * (n - 1))); if (i1 <= i0 + 2 || o.w < 2.5) return;
  ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.lineCap = 'round';
  for (const off of [-0.62, -0.25, 0.18, 0.55]) {
    ctx.beginPath(); let on = false, lw = 0;
    for (let i = i0; i <= i1; i++) {
      const s = i / (n - 1), a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const w = o.w * prof(s, o); lw = Math.max(lw, w); const x = P[i][0] - ty * w * off, y = P[i][1] + tx * w * off;
      if (vnoise(i * 0.05 + off * 31, sd + 17) > 0.42) { if (!on) { ctx.moveTo(x, y); on = true; } else ctx.lineTo(x, y); } else on = false;
    }
    ctx.lineWidth = Math.max(0.6, lw * 0.07); ctx.strokeStyle = `rgba(0,0,0,${o.stri ?? 0.28})`; ctx.stroke();
  }
  ctx.restore();
}
