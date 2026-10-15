'use strict';
// engine: shared liquid-ink rendering (from หยดหมึก v2)
const REDC = '#B3271F';
const blink = (t, arr) => { let v = 1; for (const b of arr) { const d = Math.abs(t - b); if (d < 0.1) v = Math.min(v, sstep(d / 0.1)); } return v; };
const sinU = (x) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x));

function rrPts(x, y, w, h, r) { return [[x + w / 2, y], [x + w - r, y], [x + w, y + r], [x + w, y + h - r], [x + w - r, y + h], [x + r, y + h], [x, y + h - r], [x, y + r], [x + r, y], [x + w / 2 - 4, y]]; }

const NPT = 150;
function drawEye(ctx, x, y, rx, ry, rot, side, e) {
  const a = e.a ?? 1; if (a <= 0.01 || rx < 0.6) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a;
  const wd = 1 + 0.18 * (e.wide || 0); rx *= wd; ry *= wd;
  const hp = sstep(((e.happy || 0) - 0.2) / 0.6), oy = ry * (e.open ?? 1) * (1 - hp);
  if (oy > ry * 0.08) {
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, rx, oy, 0, 0, 7); ctx.fillStyle = EYEW; ctx.fill(); ctx.clip();
    const pr = rx * 0.56 * (1 - 0.3 * (e.wide || 0)), lx = (e.look?.[0] || 0) * rx * 0.4, ly = (e.look?.[1] || 0) * ry * 0.34;
    ctx.fillStyle = INKC; ctx.beginPath(); ctx.ellipse(lx, ly + ry * 0.04, pr, pr * 1.1, 0, 0, 7); ctx.fill();
    ctx.fillStyle = EYEW; ctx.beginPath(); ctx.arc(lx - pr * 0.36, ly - pr * 0.36, pr * 0.34, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(lx + pr * 0.34, ly + pr * 0.42, pr * 0.14, 0, 7); ctx.fill();
    const ang = e.angry || 0;
    if (ang > 0.01) { const yi = -ry + ry * 1.1 * ang, yo = -ry + ry * 0.25 * ang, d = (yi - yo) * 0.15;
      ctx.fillStyle = INKC; ctx.beginPath(); ctx.moveTo(-side * rx * 1.3, -ry * 1.4); ctx.lineTo(-side * rx * 1.3, yi + d); ctx.lineTo(side * rx * 1.3, yo - d); ctx.lineTo(side * rx * 1.3, -ry * 1.4); ctx.fill(); }
    const sad = e.sad || 0;
    if (sad > 0.01) {
      const yo = -ry + ry * 1.05 * sad, yi = -ry + ry * 0.25 * sad, d = (yo - yi) * 0.15;
      ctx.fillStyle = INKC; ctx.beginPath(); ctx.moveTo(side * rx * 1.3, -ry * 1.4); ctx.lineTo(side * rx * 1.3, yo + d); ctx.lineTo(-side * rx * 1.3, yi - d); ctx.lineTo(-side * rx * 1.3, -ry * 1.4); ctx.fill();
    }
    ctx.restore();
  }
  if (hp > 0.01) { ctx.globalAlpha = a * hp; ctx.strokeStyle = EYEW; ctx.lineCap = 'round'; ctx.lineWidth = rx * 0.42; ctx.beginPath(); ctx.arc(0, ry * 0.32, rx * 0.86, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
  ctx.restore();
}
function eyePair(ctx, p1, p2, rx, ry, rot, e) { const s1 = p1[0] < p2[0] ? -1 : 1; drawEye(ctx, p1[0], p1[1], rx, ry, rot, s1, e); drawEye(ctx, p2[0], p2[1], rx, ry, rot, -s1, e); }

function mkSplash(sd, sc) {
  const R = rng(sd), spikes = [], drops = [];
  for (let k = 0; k < 22; k++) spikes.push({ th: R() * 6.283, L: (18 + R() * R() * 115) * sc, w: 0.035 + R() * 0.07 });
  spikes.forEach((s) => { if (s.L > 50 * sc) drops.push({ th: s.th + (R() - 0.5) * 0.08, D: (60 + R() * 170) * sc, r: (3.5 + R() * 6) * sc, T: 0.17 + R() * 0.12, td: 0.035 + R() * 0.03, L: s.L }); });
  for (let k = 0; k < 10; k++) drops.push({ th: R() * 6.283, D: (80 + R() * 200) * sc, r: (1.1 + R() * 2.2) * sc, T: 0.14 + R() * 0.14, td: 0.02 + R() * 0.03, L: 0, mist: true });
  return { spikes, drops, sd, sc };
}
function splatR(SP, th, tau) {
  const sc = SP.sc, base = 92 * sc * (1 - Math.exp(-tau / 0.03)), e = 1 - Math.exp(-tau / 0.045); let spk = 0;
  for (const s of SP.spikes) { const d = Math.abs((((th - s.th) % 6.2832) + 9.4248) % 6.2832 - 3.1416); spk += s.L * e * Math.exp(-((d / s.w) ** 2)); }
  return (base + spk) * (1 + 0.05 * (vnoise(th * 9, SP.sd) - 0.5) * 2 + 0.025 * (vnoise(th * 31, SP.sd + 2) - 0.5) * 2);
}
function splatPoly(SP, cx, cy, tau, k = 1) { const P = []; for (let i = 0; i < NPT; i++) { const th = -Math.PI / 2 + 2 * Math.PI * i / NPT, r = splatR(SP, th, tau) * k; P.push([cx + Math.cos(th) * r, cy + Math.sin(th) * r * 0.95]); } return P; }
function dropState(SP, d, cx, cy, tau, ky = 0.95) {
  const t1 = tau - d.td; if (t1 < 0) return null;
  const R0 = d.L ? splatR(SP, d.th, d.td) * 0.95 : 55 * SP.sc, u = Math.min(1, t1 / d.T), dist = R0 + d.D * (1 - Math.exp(-u * 3)) / (1 - Math.exp(-3));
  const x = cx + Math.cos(d.th) * dist, y = cy + Math.sin(d.th) * dist * ky;
  return t1 < d.T ? { air: true, x, y, r: d.r, h: Math.sin(Math.PI * u), t1 } : { land: true, x, y, r: d.r, t1 };
}
function lerpPoly(A, B, u, wob, t) { return A.map((a, i) => [lerp(a[0], B[i][0], u) + wob * Math.sin(i * 0.41 + t * 9), lerp(a[1], B[i][1], u) + wob * Math.cos(i * 0.33 + t * 8)]); }
function airDrop(ctx, x, y, r, sx, sy, red, trail = 0) {
  if (trail > 2) { const g = ctx.createLinearGradient(x, y - trail, x, y); g.addColorStop(0, red ? 'rgba(140,25,20,0)' : 'rgba(14,12,11,0)'); g.addColorStop(1, red ? 'rgba(140,25,20,0.35)' : 'rgba(14,12,11,0.35)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y - trail * 0.5, r * sx * 0.75, trail * 0.5 + r * 0.3, 0, 0, 7); ctx.fill(); }
  const g = ctx.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.1, x, y, r * 1.02);
  if (red) { g.addColorStop(0, '#6e110c'); g.addColorStop(0.7, '#8f1b14'); g.addColorStop(1, '#d0564a'); } else { g.addColorStop(0, '#0b0a09'); g.addColorStop(0.72, '#141110'); g.addColorStop(1, '#4a4238'); }
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r * sx, r * sy, 0, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,252,245,0.93)'; ctx.beginPath(); ctx.ellipse(x - r * 0.36 * sx, y - r * 0.4 * sy, r * 0.27, r * 0.16, -0.65, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,252,245,0.45)'; ctx.beginPath(); ctx.arc(x + r * 0.34 * sx, y + r * 0.38 * sy, r * 0.09, 0, 7); ctx.fill();
}
function paperShadow(ctx, x, y, r, a) { if (a <= 0.01) return; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(60,42,28,${a})`); g.addColorStop(1, 'rgba(60,42,28,0)'); ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore(); }
// specular highlights on a liquid body (clipped to its outline)
function bodyHighlight(ctx, pts, a, S) {
  if (a <= 0.01) return; let cx = 0, cy = 0, best = 1e9, bp = pts[0]; for (const p of pts) { cx += p[0]; cy += p[1]; const v = p[0] + p[1] * 1.2; if (v < best) { best = v; bp = p; } } cx /= pts.length; cy /= pts.length;
  const hx = lerp(bp[0], cx, 0.3), hy = lerp(bp[1], cy, 0.3);
  ctx.save(); ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts) ctx.lineTo(p[0], p[1]); ctx.closePath(); ctx.clip();
  const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, S * 0.9); g.addColorStop(0, `rgba(255,250,240,${0.16 * a})`); g.addColorStop(1, 'rgba(255,250,240,0)'); ctx.fillStyle = g; ctx.fillRect(hx - S, hy - S, 2 * S, 2 * S);
  const sx0 = hx + S * 0.08, sy0 = hy + S * 0.1, g2 = ctx.createRadialGradient(sx0, sy0, 0, sx0, sy0, S * 0.16);
  g2.addColorStop(0, `rgba(255,252,246,${0.8 * a})`); g2.addColorStop(0.55, `rgba(255,252,246,${0.55 * a})`); g2.addColorStop(1, 'rgba(255,252,246,0)');
  ctx.fillStyle = g2; ctx.save(); ctx.translate(sx0, sy0); ctx.rotate(-0.8); ctx.scale(1, 0.42); ctx.beginPath(); ctx.arc(0, 0, S * 0.16, 0, 7); ctx.restore(); ctx.fill();
  ctx.fillStyle = `rgba(255,252,246,${0.75 * a})`; ctx.beginPath(); ctx.arc(hx + S * 0.28, hy - S * 0.02, S * 0.025, 0, 7); ctx.fill();
  ctx.restore();
}
function drawAirDroplets(ctx, SP, cx, cy, tau, red, ky = 0.95) {
  if (tau < 0) return;
  for (const d of SP.drops) {
    const st = dropState(SP, d, cx, cy, tau, ky); if (!st || !st.air) continue;
    if (!d.mist && st.t1 < 0.06 && d.L) { const tip = splatR(SP, d.th, d.td) * 0.95, tx = cx + Math.cos(d.th) * tip, ty = cy + Math.sin(d.th) * tip * ky, px = -Math.sin(d.th), py = Math.cos(d.th), w1 = d.r * 0.5 * (1 - st.t1 / 0.06);
      fillPoly(ctx, [[tx + px * w1 * 1.6, ty + py * w1 * 1.6], [st.x + px * w1, st.y + py * w1], [st.x - px * w1, st.y - py * w1], [tx - px * w1 * 1.6, ty - py * w1 * 1.6]], red ? '#8f1b14' : '#141110', 1); }
    paperShadow(ctx, st.x + st.h * 16, st.y + st.h * 20, d.r * (1.6 + st.h), 0.22 * st.h);
    airDrop(ctx, st.x, st.y - st.h * 8, d.r * (1 + 0.55 * st.h), 1, 1, red);
  }
}
function drawLanded(ctx, SP, cx, cy, tau, col, a, ky = 0.95) {
  if (tau < 0 || a <= 0) return; ctx.fillStyle = col;
  for (const d of SP.drops) { const st = dropState(SP, d, cx, cy, tau, ky); if (!st || !st.land) continue; const k = eOut(Math.min(1, (st.t1 - d.T) / 0.08));
    ctx.globalAlpha = a; ctx.beginPath(); ctx.ellipse(st.x, st.y, st.r * (1.25 + 0.35 * k), st.r * (1.1 + 0.25 * k), d.th, 0, 7); ctx.fill();
    if (!d.mist) { ctx.beginPath(); ctx.ellipse(st.x + Math.cos(d.th) * st.r * 2.1, st.y + Math.sin(d.th) * st.r * 2.1, st.r * 0.42, st.r * 0.34, 0, 0, 7); ctx.fill(); } }
  ctx.globalAlpha = 1;
}

function camXf(ctx, C, s = 1) { const [cx, cy, z] = C; ctx.setTransform(s * z, 0, 0, s * z, s * (W / 2 - cx * z), s * (H / 2 - cy * z)); }
function blurSmall(src, sm, smc, blur) { smc.setTransform(1, 0, 0, 1, 0, 0); smc.clearRect(0, 0, sm.width, sm.height); smc.filter = `blur(${blur}px)`; smc.drawImage(src, 0, 0, sm.width, sm.height); smc.filter = 'none'; }
function inkComposite(src, a, soft, fib) {
  blurSmall(src, B1, b1ctx, 2.5);
  ftx.setTransform(1, 0, 0, 1, 0, 0); ftx.globalCompositeOperation = 'source-over'; ftx.clearRect(0, 0, W, H); ftx.drawImage(B1, 0, 0, W, H);
  ftx.globalCompositeOperation = 'destination-in'; ftx.drawImage(FIBM, 0, 0); ftx.globalCompositeOperation = 'source-over';
  blurSmall(src, B2, b2ctx, 2);
  mctx.globalCompositeOperation = 'multiply';
  mctx.globalAlpha = soft * a; mctx.drawImage(B1, 0, 0, W, H);
  mctx.globalAlpha = 0.14 * a; mctx.drawImage(B2, 0, 0, W, H);
  mctx.globalAlpha = fib * a; mctx.drawImage(FT, 0, 0);
  mctx.globalAlpha = a; mctx.drawImage(src, 0, 0);
}
function glossComposite(a) {
  const pass = (hx, H_, blur, gx, G_, d1, d2) => {
    hx.setTransform(1, 0, 0, 1, 0, 0); hx.clearRect(0, 0, W / 2, H / 2); hx.filter = `blur(${blur}px)`; hx.drawImage(WETC, 0, 0); hx.filter = 'none';
    gx.setTransform(1, 0, 0, 1, 0, 0); gx.globalCompositeOperation = 'source-over'; gx.clearRect(0, 0, W / 2, H / 2); gx.drawImage(H_, -d1, -d1);
    gx.globalCompositeOperation = 'destination-out'; gx.drawImage(H_, d2, d2);
    gx.globalCompositeOperation = 'lighter'; gx.drawImage(G_, 0, 0); gx.drawImage(G_, 0, 0);
    gx.globalCompositeOperation = 'destination-in'; gx.drawImage(G_, 0, 0);
  };
  pass(hbx, HB, 3, glx, GL, 2, 1.5); pass(h2x, H2, 1, g2x, G2, 1, 0.8);
  glx.globalCompositeOperation = 'lighter'; glx.drawImage(G2, 0, 0);
  glx.globalCompositeOperation = 'destination-in'; glx.drawImage(WM, 0, 0); glx.drawImage(HB, 0, 0); glx.drawImage(HB, 0, 0);
  glx.globalCompositeOperation = 'source-in'; glx.fillStyle = '#FFF9EE'; glx.fillRect(0, 0, W / 2, H / 2); glx.globalCompositeOperation = 'source-over';
  mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.globalCompositeOperation = 'screen'; mctx.globalAlpha = 0.75 * a; mctx.drawImage(GL, 0, 0, W, H);
  mctx.globalCompositeOperation = 'source-over'; mctx.globalAlpha = 1;
}

function wetFill(pts, a) { if (a <= 0.02) return; fillPoly(wctx, pts, '#fff', 1); fillPoly(wmx, pts, '#fff', Math.min(1, a)); }

// ---------- drop shape ----------
let _DROP = null;
function dropPts() { if (_DROP) return _DROP; const c = []; for (let i = 0; i < 28; i++) { const a = -Math.PI / 2 + 2 * Math.PI * i / 28, up = Math.max(0, -Math.sin(a)); c.push([Math.cos(a) * (1 - 0.55 * Math.pow(up, 1.4)), 0.3 + Math.sin(a) * (1 + 0.85 * Math.pow(up, 4))]); } _DROP = sampleN(cr(c, true, 8), NPT, true); return _DROP; }
// ---------- layers + frame composition ----------
let CHR, chx, HAL, hax, WM, wmx, MAIN, INK, B1, B2, FT, RED, RB, WETC, HB, H2, GL, G2, mctx, ictx, b1ctx, b2ctx, ftx, rctx, rbctx, wctx, hbx, h2x, glx, g2x;
function initEngine(canvas) {
  MAIN = canvas; mctx = MAIN.getContext('2d');
  INK = mk(W, H); ictx = INK.getContext('2d'); RED = mk(W, H); rctx = RED.getContext('2d'); FT = mk(W, H); ftx = FT.getContext('2d');
  B1 = mk(W / 4, H / 4); b1ctx = B1.getContext('2d'); B2 = mk(W / 12, H / 12); b2ctx = B2.getContext('2d'); RB = mk(W / 4, H / 4); rbctx = RB.getContext('2d');
  WETC = mk(W / 2, H / 2); wctx = WETC.getContext('2d'); WM = mk(W / 2, H / 2); wmx = WM.getContext('2d');
  HB = mk(W / 2, H / 2); hbx = HB.getContext('2d'); H2 = mk(W / 2, H / 2); h2x = H2.getContext('2d'); GL = mk(W / 2, H / 2); glx = GL.getContext('2d'); G2 = mk(W / 2, H / 2); g2x = G2.getContext('2d');
  CHR = mk(W, H); chx = CHR.getContext('2d'); HAL = mk(W / 4, H / 4); hax = HAL.getContext('2d');
  for (const c of [mctx, b1ctx, b2ctx, rbctx, ftx, hax]) c.imageSmoothingQuality = 'high';
  buildPaper(); buildFiberMask();
}
// f = { pre(ctx), ink(ictx), red(rctx) -> alpha, over(mctx), fade, shake:[dx,dy] }
function composeFrame(C, f) {
  const fade = f.fade ?? 1;
  mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.globalCompositeOperation = 'source-over'; mctx.globalAlpha = 1; mctx.drawImage(PAPER, 0, 0);
  if (f.pre) { camXf(mctx, C); f.pre(mctx); mctx.globalAlpha = 1; mctx.globalCompositeOperation = 'source-over'; }
  ictx.setTransform(1, 0, 0, 1, 0, 0); ictx.clearRect(0, 0, W, H); camXf(ictx, C);
  for (const c of [wctx, wmx]) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W / 2, H / 2); camXf(c, C, 0.5); }
  if (f.ink) f.ink(ictx);
  ictx.setTransform(1, 0, 0, 1, 0, 0); mctx.setTransform(1, 0, 0, 1, 0, 0);
  inkComposite(INK, fade, 0.26, 0.55);
  if (f.red) {
    rctx.setTransform(1, 0, 0, 1, 0, 0); rctx.clearRect(0, 0, W, H); camXf(rctx, C); const ra = f.red(rctx);
    if (ra > 0) { rctx.setTransform(1, 0, 0, 1, 0, 0); blurSmall(RED, RB, rbctx, 3.5); mctx.globalCompositeOperation = 'multiply'; mctx.globalAlpha = 0.55 * ra; mctx.drawImage(RB, 0, 0, W, H); mctx.globalAlpha = ra; mctx.drawImage(RED, 0, 0); }
  }
  mctx.globalCompositeOperation = 'source-over'; mctx.globalAlpha = 1;
  if (f.chars) { // characters: own layer with a soft paper-colored halo so they read over the black strokes
    chx.setTransform(1, 0, 0, 1, 0, 0); chx.clearRect(0, 0, W, H); camXf(chx, C); f.chars(chx); chx.setTransform(1, 0, 0, 1, 0, 0);
    hax.setTransform(1, 0, 0, 1, 0, 0); hax.clearRect(0, 0, W / 4, H / 4); hax.filter = 'blur(2.2px)'; hax.drawImage(CHR, 0, 0, W / 4, H / 4); hax.filter = 'none';
    hax.globalCompositeOperation = 'lighter'; hax.drawImage(HAL, 0, 0); hax.drawImage(HAL, 0, 0); hax.globalCompositeOperation = 'source-in'; hax.fillStyle = '#F1E9D8'; hax.fillRect(0, 0, W / 4, H / 4); hax.globalCompositeOperation = 'source-over';
    if (!f.noHalo) { mctx.globalAlpha = 0.92 * fade; mctx.drawImage(HAL, 0, 0, W, H); }
    mctx.globalAlpha = fade; mctx.drawImage(CHR, 0, 0); mctx.globalAlpha = 1;
  }
  glossComposite(1);
  if (f.over) { camXf(mctx, C); f.over(mctx); }
  mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.globalAlpha = 1;
  mctx.globalCompositeOperation = 'multiply'; mctx.globalAlpha = 0.2; mctx.drawImage(GRAIN, 0, 0);
  mctx.globalCompositeOperation = 'screen'; mctx.globalAlpha = 0.14; mctx.drawImage(FIB, 0, 0);
  mctx.globalCompositeOperation = 'source-over'; mctx.globalAlpha = 1; mctx.drawImage(VIG, 0, 0);
  if (f.post) f.post(mctx);
}
// speed lines (overlay)
function speedLines(ctx, x0, y0, x1, y1, n, sd, a, len = 1) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, px = -uy, py = ux;
  for (let i = 0; i < n; i++) { const o = (hash(i, sd) - 0.5) * 120, s0 = hash(i, sd + 1) * L, l = (40 + 120 * hash(i, sd + 2)) * len, x = x0 + ux * s0 + px * o, y = y0 + uy * s0 + py * o;
    brushPts(ctx, [[x, y], [x + ux * l, y + uy * l]], { w: 1.2 + 1.8 * hash(i, sd + 3), a: a * (0.4 + 0.6 * hash(i, sd + 4)), taper: 0.5, head: 0.4, stri: 0, seed: i + sd }, 6); }
}
function sparkle(ctx, x, y, r, a, rot = 0) { if (a <= 0.01) return; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a; ctx.fillStyle = '#FFFDF6'; ctx.beginPath();
  for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4, rr = i % 2 ? r * 0.18 : r; ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); } ctx.closePath(); ctx.fill(); ctx.restore(); ctx.globalAlpha = 1; }
