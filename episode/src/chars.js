'use strict';
// ================= characters: samurai drop, mosquito, fly, mantis =================
const EYEW2 = EYEW;
// draw fn() twice, clipped to each side of a cut line through (x,y) at angle ang, halves pushed apart
function splitDraw(ctx, x, y, ang, sep, spin, fn) {
  if (sep <= 0.001) { fn(); return; }
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  for (const sd of [-1, 1]) {
    ctx.save(); ctx.translate(x + nx * sep * sd, y + ny * sep * sd + sep * 0.6); ctx.rotate(spin * sd); ctx.translate(-x, -y);
    ctx.beginPath(); const L = 3000, c = Math.cos(ang), s = Math.sin(ang);
    ctx.moveTo(x - c * L, y - s * L); ctx.lineTo(x + c * L, y + s * L); ctx.lineTo(x + c * L + nx * L * sd, y + s * L + ny * L * sd); ctx.lineTo(x - c * L + nx * L * sd, y - s * L + ny * L * sd); ctx.closePath(); ctx.clip();
    fn(); ctx.restore();
  }
}
// shatter into wedges flying outward
function shatterDraw(ctx, x, y, k, n, sd, fn) {
  if (k <= 0.001) { fn(); return; }
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * 6.283 + hash(i, sd) * 0.3, a1 = ((i + 1) / n) * 6.283 + hash(i + 1, sd) * 0.3, am = (a0 + a1) / 2, d = k * (120 + 160 * hash(i, sd + 3)), rt = k * (hash(i, sd + 5) - 0.5) * 1.6;
    ctx.save(); ctx.translate(x + Math.cos(am) * d, y + Math.sin(am) * d + k * k * 160); ctx.rotate(rt); ctx.translate(-x, -y);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a0) * 2000, y + Math.sin(a0) * 2000); ctx.lineTo(x + Math.cos(a1) * 2000, y + Math.sin(a1) * 2000); ctx.closePath(); ctx.clip();
    ctx.globalAlpha = 1 - k * 0.6; fn(); ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// ---------- SAMURAI DROP ----------
// st: {x,y,S,sx,sy,rot,face,wob,e, sw:{mode:'hold'|'sheath'|'none', ang, draw, glint, slide}, band:{a,wind}, sweat, pts}
function samGeom(st, t) {
  const D = dropPts(), f = st.face || 1, c = Math.cos(st.rot || 0), s = Math.sin(st.rot || 0), sx = st.sx || 1, sy = st.sy || 1;
  const X = (x, y) => { const px = x * st.S * sx * f, py = y * st.S * sy; return [st.x + px * c - py * s, st.y + px * s + py * c]; };
  const wob = st.wob ?? 0.012;
  const pts = st.pts || D.map((p, i) => X(p[0] + wob * Math.sin(i * 0.37 + t * LQ(4.1)), p[1] + wob * Math.cos(i * 0.29 + t * LQ(3.7))));
  return { pts, X, f };
}
function swordFrame(st, g) {
  const sw = st.sw || {}, f = g.f, r = st.rot || 0, a = sw.ang ?? -0.9, lx = Math.cos(a) * f, ly = Math.sin(a);
  const dir = [lx * Math.cos(r) - ly * Math.sin(r), lx * Math.sin(r) + ly * Math.cos(r)], G = g.X(sw.gx ?? 1.0, sw.gy ?? 0.72);
  return { G, dir, per: [-dir[1] * f, dir[0] * f] };
}
function samInk(ctx, st, t, wet = 1) {
  const g = samGeom(st, t), S = st.S, a = st.a ?? 1; if (a <= 0.01) return g;
  fillPoly(ctx, g.pts, INKC, a); if (wet) wetFill(g.pts, a * wet);
  const sw = st.sw || {};
  if ((sw.mode === 'sheath' || sw.saya) && sw.tool !== 'brush') { // saya (scabbard) at the hip, behind
    const h0 = g.X(0.2, 0.9), h1 = g.X(-1.55, 0.35); brushPts(ctx, [h0, g.X(-0.7, 0.72), h1], { w: S * 0.075, a, taper: 0.08, head: 0.05, stri: 0, seed: 7 });
  }
  if (sw.mode && sw.mode !== 'none') {
    const F = swordFrame(st, g), { G, dir, per } = F; let hb = [G[0] - dir[0] * S * 0.5, G[1] - dir[1] * S * 0.5], hf = [G[0] + dir[0] * S * 0.34, G[1] + dir[1] * S * 0.34], gc = [G[0] + dir[0] * S * 0.36, G[1] + dir[1] * S * 0.36], gdir = dir;
    if (sw.tool === 'brush') { /* no hilt */ } else {
    // ONE sword rule (owner 2026-10-11): while sheathed (or mid-draw) the hilt continues the saya's own axis, so saya + hilt read as ONE scabbard, not two sticks.
    // saya axis = tip at the back (-1.55,0.35) -> mouth at the hip (0.2,0.9); the hilt sticks out of the mouth along that axis. k=1 sheathed -> 0 once the blade is mostly out.
    const holdOn = sw.mode === 'hold', k = holdOn ? 1 - sstep((sw.draw ?? 1) / 0.4) : 1;
    if (k > 0.001) {
      const m0 = g.X(0.2, 0.9), m1 = g.X(-1.55, 0.35), ax = [m0[0] - m1[0], m0[1] - m1[1]], al = Math.hypot(ax[0], ax[1]) || 1, ux = [ax[0] / al, ax[1] / al];
      const sb = m0, sf = [m0[0] + ux[0] * S * 0.72, m0[1] + ux[1] * S * 0.72], sg = [m0[0] + ux[0] * S * 0.05, m0[1] + ux[1] * S * 0.05];
      hb = [lerp(hb[0], sb[0], k), lerp(hb[1], sb[1], k)]; hf = [lerp(hf[0], sf[0], k), lerp(hf[1], sf[1], k)]; gc = [lerp(gc[0], sg[0], k), lerp(gc[1], sg[1], k)];
      gdir = [lerp(dir[0], ux[0], k), lerp(dir[1], ux[1], k)];
    }
    brushPts(ctx, [hb, hf], { w: S * 0.065, a, taper: 0.04, head: 0.04, stri: 0, seed: 9, rag: 0.05 }, 2);
    ctx.save(); ctx.translate(gc[0], gc[1]); ctx.rotate(Math.atan2(gdir[1], gdir[0])); ctx.fillStyle = INKC; ctx.globalAlpha = a; ctx.beginPath(); ctx.ellipse(0, 0, S * 0.05, S * 0.17, 0, 0, 7); ctx.fill(); ctx.restore(); ctx.globalAlpha = 1;
    }
  }
  // nub hands
  if (sw.mode && sw.mode !== 'none' && !sw.noHands) { const F = swordFrame(st, g); for (const k of [-0.25, 0.12]) { ctx.fillStyle = INKC; ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(F.G[0] + F.dir[0] * S * k, F.G[1] + F.dir[1] * S * k, S * 0.16, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; }
  return g;
}

// short ink arms + ball hands (owner approved 2026-10-09). hands: optional [[x,y],[x,y]] override, hr: hand radius factor
function samArms(c, st, t, hands, hr = 0.18) {
  const g = samGeom(st, t), S = st.S, sw = st.sw || {}, a = st.a ?? 1; if (a <= 0.01) return;
  let H1, H2;
  if (hands) { H1 = hands[0]; H2 = hands[1]; }
  else if (sw.mode && sw.mode !== 'none' && sw.mode !== 'sheath') { const F = swordFrame(st, g); H1 = [F.G[0] + F.dir[0] * S * 0.12, F.G[1] + F.dir[1] * S * 0.12]; H2 = [F.G[0] - F.dir[0] * S * 0.25, F.G[1] - F.dir[1] * S * 0.25]; }
  else if (sw.mode === 'sheath') { H1 = g.X(1.3, 0.95); H2 = g.X(-1.25, 0.98); }
  else { H1 = g.X(1.36, 0.88); H2 = g.X(-1.36, 0.88); if (st.walk != null) { const w = Math.sin(st.walk); H1 = g.X(1.36, 0.88 - w * 0.2); H2 = g.X(-1.36, 0.88 + w * 0.2); H1[0] -= w * S * 0.12; H2[0] += w * S * 0.12; } }
  const arm = (sh, hd, w) => { const mid = [(sh[0] + hd[0]) / 2, (sh[1] + hd[1]) / 2 + S * 0.07];
    c.save(); c.globalAlpha = a; c.strokeStyle = INKC; c.fillStyle = INKC; c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = w; c.beginPath(); c.moveTo(sh[0], sh[1]); c.quadraticCurveTo(mid[0], mid[1], hd[0], hd[1]); c.stroke();
    c.beginPath(); c.arc(hd[0], hd[1], S * hr, 0, 7); c.fill(); c.restore(); };
  arm(g.X(-0.85, 0.5), H2, S * 0.15); arm(g.X(0.85, 0.5), H1, S * 0.15);
}

// short ink legs + oval feet (owner approved 2026-10-09). st.walk = phase (rad) or null for standing; st.ground = absolute foot-line y (optional)
function samLegs(c, st, t) {
  const g = samGeom(st, t), S = st.S, a = st.a ?? 1; if (a <= 0.01) return;
  c.save(); c.globalAlpha = a; c.fillStyle = INKC; c.strokeStyle = INKC; c.lineCap = 'round'; c.lineWidth = S * 0.17;
  for (const k of [-1, 1]) {
    const hip = g.X(k * 0.42, 1.12); let fx = hip[0] + k * S * 0.03, fy = hip[1] + S * 0.34;
    if (st.walk != null) { const p = st.walk + (k > 0 ? 0 : Math.PI); fx = hip[0] + Math.sin(p) * S * 0.28 + k * S * 0.03; fy = (st.ground != null ? st.ground - S * 0.1 : hip[1] + S * 0.34) - Math.max(0, Math.cos(p)) * S * 0.14; }
    c.beginPath(); c.moveTo(hip[0], hip[1]); c.lineTo(fx, fy); c.stroke();
    c.beginPath(); c.ellipse(fx + S * 0.07, fy + S * 0.03, S * 0.19, S * 0.085, 0, 0, 7); c.fill();
  }
  c.restore();
}
function samOver(ctx, st, t) {
  const g = samGeom(st, t), S = st.S, a = st.a ?? 1, f = g.f; if (a <= 0.01) return;
  bodyHighlight(ctx, g.pts, a * 0.9, S * 1.1);
  // headband (hachimaki)
  const band = st.band || { a: 1, wind: 1 };
  if ((band.a ?? 1) > 0.01) {
    const ba = band.a ?? 1, wind = band.wind ?? 1;
    ctx.save(); ctx.beginPath(); ctx.moveTo(g.pts[0][0], g.pts[0][1]); for (const p of g.pts) ctx.lineTo(p[0], p[1]); ctx.closePath(); ctx.clip();
    const top = [], bot = []; for (let k = 0; k <= 16; k++) { const x = -1.2 + 2.4 * k / 16; top.push(g.X(x, -0.34 + 0.1 * x * x)); bot.push(g.X(x, -0.1 + 0.1 * x * x)); }
    const poly = top.concat(bot.reverse()); ctx.globalAlpha = ba; fillPoly(ctx, poly, REDC, ba);
    ctx.globalAlpha = ba * 0.35; ctx.strokeStyle = '#4a0906'; ctx.lineWidth = S * 0.035; ctx.beginPath(); bot.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
    ctx.globalAlpha = ba * 0.3; ctx.strokeStyle = '#ffd9cc'; ctx.lineWidth = S * 0.025; ctx.beginPath(); for (let k = 3; k <= 9; k++) { const x = -1.2 + 2.4 * k / 16, p = g.X(x, -0.3 + 0.1 * x * x); k === 3 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]); } ctx.stroke();
    ctx.restore(); ctx.globalAlpha = 1;
    // knot + tails at the back
    const kn = g.X(-0.72, -0.22);
    for (const [dy, ph, ln] of [[0, 0, 1], [0.1, 1.3, 0.8]]) {
      const tp = []; for (let k = 0; k <= 7; k++) { const q = k / 7; tp.push(g.X(-0.72 - 1.0 * q * ln - 0.15 * wind * q, -0.22 + dy + 0.35 * q * (1.2 - wind * 0.8) + Math.sin(t * LQ(11) - k * 1.1 + ph) * 0.12 * q * wind)); }
      brushPts(ctx, tp, { w: S * 0.09, col: REDC, a: ba, taper: 0.45, head: 0.1, stri: 0, seed: 20 + ph * 7, pf: 1 }, 2);
    }
    ctx.globalAlpha = ba; ctx.fillStyle = REDC; ctx.beginPath(); ctx.ellipse(kn[0], kn[1], S * 0.12, S * 0.09, 0.4, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  }
  // blade (steel = paper-white with ink edge)
  const sw = st.sw || {};
  if (sw.mode === 'hold' && sw.tool === 'brush' && (sw.draw ?? 1) > 0.02) {
    const { G, dir, per } = swordFrame(st, g), B0 = [G[0] + dir[0] * S * 0.4, G[1] + dir[1] * S * 0.4], Lb = S * 2.7 * (sw.draw ?? 1);
    const P = (q, o = 0) => [B0[0] + dir[0] * Lb * q + per[0] * o, B0[1] + dir[1] * Lb * q + per[1] * o];
    const path = (pts, close) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); if (close) ctx.closePath(); };
    const band = (q0, q1, w0, w1, col, ol, o0 = 0, o1 = 0) => { const A = [], B = []; for (let k = 0; k <= 10; k++) { const u = k / 10, q = lerp(q0, q1, u), w = lerp(w0, w1, u); A.push(P(q, o0 + w)); B.push(P(q, o1 - w)); } const poly = A.concat(B.reverse()); ctx.globalAlpha = a; ctx.fillStyle = col; path(poly, 1); ctx.fill(); if (ol) { ctx.strokeStyle = INKC; ctx.lineWidth = Math.max(1.3, S * 0.02); ctx.lineJoin = 'round'; ctx.stroke(); } ctx.globalAlpha = 1; };
    const w0 = S * 0.082;
    // red cord + tassel at the butt end (accent)
    { const e = P(-0.2, 0); ctx.globalAlpha = a; ctx.strokeStyle = REDC; ctx.lineWidth = S * 0.028; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(e[0], e[1]); ctx.quadraticCurveTo(e[0] - dir[0] * S * 0.12 + per[0] * S * 0.2, e[1] - dir[1] * S * 0.12 + per[1] * S * 0.2 + S * 0.12, e[0] - dir[0] * S * 0.05 + per[0] * S * 0.12, e[1] + S * 0.3); ctx.stroke();
      for (let k = -2; k <= 2; k++) { ctx.lineWidth = S * 0.012; ctx.beginPath(); const b = [e[0] - dir[0] * S * 0.05 + per[0] * S * 0.12, e[1] + S * 0.3]; ctx.moveTo(b[0], b[1]); ctx.lineTo(b[0] + k * S * 0.016, b[1] + S * 0.12); ctx.stroke(); } ctx.globalAlpha = 1; }
    band(-0.2, 0.62, w0, w0 * 0.86, '#C79B58', 1);                                            // bamboo shaft: base tone
    band(-0.18, 0.61, w0 * 0.34, w0 * 0.3, '#EBD39C', 0, w0 * 0.5, w0 * 0.5);                     // lit side stripe
    band(-0.18, 0.61, w0 * 0.3, w0 * 0.26, '#8E6A38', 0, -w0 * 0.62, -w0 * 0.62);                 // shaded side stripe
    for (const q of [0.08, 0.34]) { const p = P(q, w0 * 1.04), r = P(q, -w0 * 1.04); ctx.globalAlpha = a; ctx.strokeStyle = '#6B4D26'; ctx.lineWidth = Math.max(1.4, S * 0.022); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(r[0], r[1]); ctx.stroke(); ctx.globalAlpha = 1; }
    band(-0.23, -0.18, w0 * 0.95, w0 * 0.95, '#7A1E18', 1);                                      // lacquered end cap
    band(0.6, 0.69, w0 * 0.98, w0 * 1.18, '#E3B64E', 1);                                         // gold ferrule
    for (const q of [0.625, 0.66]) { const p = P(q, w0 * 1.12), r = P(q, -w0 * 1.12); ctx.globalAlpha = a * 0.7; ctx.strokeStyle = '#7A5A14'; ctx.lineWidth = Math.max(1, S * 0.012); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(r[0], r[1]); ctx.stroke(); ctx.globalAlpha = 1; }
    // bristles: belly then fine tip; dry brown near the ferrule -> wet black at the point
    { const N = 18, A = [], B = []; for (let k = 0; k <= N; k++) { const u = k / N, q = lerp(0.685, 1.0, u), w = S * 0.3 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.78 + 0.1)), 0.8) * Math.pow(1 - u, 0.55) * (u < 0.08 ? 0.85 + u * 1.9 : 1) + 0.3; A.push(P(q, w)); B.push(P(q, -w)); }
      const poly = A.concat(B.reverse()); const s0 = P(0.69, 0), s1 = P(1.0, 0); const gr = ctx.createLinearGradient(s0[0], s0[1], s1[0], s1[1]); gr.addColorStop(0, '#9A8468'); gr.addColorStop(0.28, '#3A322C'); gr.addColorStop(0.6, '#14110F'); gr.addColorStop(1, '#0A0908');
      ctx.globalAlpha = a; ctx.fillStyle = gr; path(poly, 1); ctx.fill(); ctx.strokeStyle = INKC; ctx.lineWidth = Math.max(1.3, S * 0.018); ctx.lineJoin = 'round'; ctx.stroke();
      ctx.strokeStyle = 'rgba(200,190,175,0.38)'; ctx.lineWidth = Math.max(0.8, S * 0.009); for (const o of [-0.7, -0.35, 0, 0.35, 0.7]) { ctx.beginPath(); const a0 = P(0.71, S * 0.2 * o), a1 = P(0.86, S * 0.12 * o), a2 = P(0.985, S * 0.006 * o); ctx.moveTo(a0[0], a0[1]); ctx.quadraticCurveTo(a1[0], a1[1], a2[0], a2[1]); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,253,246,0.7)'; ctx.lineWidth = Math.max(1.2, S * 0.016); ctx.lineCap = 'round'; ctx.beginPath(); const h0 = P(0.8, S * 0.11), h1 = P(0.95, S * 0.04); ctx.moveTo(h0[0], h0[1]); ctx.lineTo(h1[0], h1[1]); ctx.stroke();   // wet shine
      const tp = P(1.0, 0); ctx.fillStyle = INKC; ctx.beginPath(); ctx.arc(tp[0], tp[1], S * 0.045, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,253,246,0.8)'; ctx.beginPath(); ctx.arc(tp[0] - S * 0.014, tp[1] - S * 0.016, S * 0.012, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
  } else
  if (sw.mode === 'hold' && (sw.draw ?? 1) > 0.02) {
    const { G, dir, per } = swordFrame(st, g), B0 = [G[0] + dir[0] * S * 0.4, G[1] + dir[1] * S * 0.4], Lb = S * 2.6 * (sw.draw ?? 1), L = [], R = [];
    for (let k = 0; k <= 14; k++) { const q = k / 14, cv = -S * 0.13 * Math.sin(Math.PI * q * 0.85) * q, w = S * 0.11 * (1 - 0.45 * q) * (q > 0.9 ? (1 - q) / 0.1 : 1) + 0.5;
      const cx = B0[0] + dir[0] * Lb * q + per[0] * cv, cy = B0[1] + dir[1] * Lb * q + per[1] * cv; L.push([cx + per[0] * w, cy + per[1] * w]); R.push([cx - per[0] * w * 0.5, cy - per[1] * w * 0.5]); }
    const poly = L.concat(R.reverse()); fillPoly(ctx, poly, '#F7F3EA', a);
    ctx.globalAlpha = a; ctx.strokeStyle = INKC; ctx.lineWidth = Math.max(1.4, S * 0.022); ctx.lineJoin = 'round'; ctx.beginPath(); poly.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.stroke();
    ctx.strokeStyle = 'rgba(40,36,34,0.35)'; ctx.lineWidth = Math.max(1, S * 0.012); ctx.beginPath(); for (let k = 1; k < 13; k++) { const q = k / 14, p = L[k], r = poly[poly.length - 1 - k]; const m = [lerp(p[0], r[0], 0.45 + 0.12 * Math.sin(k * 2.1)), lerp(p[1], r[1], 0.45 + 0.12 * Math.sin(k * 2.1))]; k === 1 ? ctx.moveTo(m[0], m[1]) : ctx.lineTo(m[0], m[1]); } ctx.stroke();
    ctx.globalAlpha = 1;
    if ((sw.glint ?? -1) >= 0) { const q = sw.glint, p = [B0[0] + dir[0] * Lb * q, B0[1] + dir[1] * Lb * q]; sparkle(ctx, p[0], p[1], S * 0.35 * Math.sin(Math.PI * q), 0.95, 0.3); }
  }
  // eyes
  const e = st.e || {}; const ea = (e.a ?? 1) * a;
  if (ea > 0.01) { const rx = 0.22 * S * Math.abs(st.sx || 1), ry = 0.27 * S * (st.sy || 1); eyePair(ctx, g.X(-0.16, 0.26), g.X(0.46, 0.26), rx, ry, st.rot || 0, Object.assign({}, e, { a: ea })); }
  if ((st.sweat || 0) > 0.01) { const p = g.X(-0.95, -0.35), r = S * 0.13; ctx.globalAlpha = st.sweat; ctx.fillStyle = EYEW; ctx.beginPath(); ctx.moveTo(p[0], p[1] - r * 1.9); ctx.quadraticCurveTo(p[0] + r * 1.1, p[1], p[0], p[1] + r); ctx.quadraticCurveTo(p[0] - r * 1.1, p[1], p[0], p[1] - r * 1.9); ctx.fill(); ctx.strokeStyle = INKC; ctx.lineWidth = S * 0.03; ctx.stroke(); ctx.globalAlpha = 1; }
}

// ---------- MOSQUITO ----------
function mosqPts(st) { const f = st.face || 1, s = st.s, r = st.rot || 0, c = Math.cos(r), sn = Math.sin(r); return (x, y) => { const px = x * s * f, py = y * s; return [st.x + px * c - py * sn, st.y + px * sn + py * c]; }; }
function mosqInk(ctx, st, t) {
  const X = mosqPts(st), s = st.s, a = st.a ?? 1, fl = Math.sin(t * 70) * 0.3;
  for (const [cx, cy, rot] of [[-0.25, -0.38, -0.55 + fl], [-0.08, -0.34, -0.25 - fl]]) {
    const p = X(cx, cy), ang = Math.atan2(X(cx + Math.cos(rot), cy + Math.sin(rot))[1] - p[1], X(cx + Math.cos(rot), cy + Math.sin(rot))[0] - p[0]);
    ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(ang); ctx.globalAlpha = 0.14 * a; ctx.fillStyle = INKC; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.5, s * 0.13, 0, 0, 7); ctx.fill();
    ctx.globalAlpha = 0.45 * a; ctx.strokeStyle = INKC; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 6; i++) { const bx = -0.12 + 0.07 * i, kx = -0.55 + 0.26 * i, fx = -0.72 + 0.34 * i + 0.05 * Math.sin(t * 3 + i), fy = 0.95 + 0.08 * Math.sin(t * 2 + i);
    brushPts(ctx, [X(bx, 0.12), X(kx, 0.5), X(fx, fy)], { w: s * 0.022, a, taper: 0.5, head: 0.2, stri: 0, seed: 30 + i, sub: 4 }, 2); }
  brushPts(ctx, [X(-0.15, 0.02), X(-0.55, 0.14), X(-1.0, 0.32)], { w: s * 0.16, a, taper: 0.6, head: 0.12, stri: 0, seed: 40 }, 2);
  ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.lineCap = 'round'; ctx.lineWidth = s * 0.035; ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  for (const q of [0.3, 0.5, 0.7]) { const c = X(-0.15 - 0.85 * q, 0.02 + 0.3 * q), d = X(-0.15 - 0.85 * q + 0.05, 0.02 + 0.3 * q - 0.12 * (1 - q)); ctx.beginPath(); ctx.moveTo(c[0], c[1] - s * 0.1 * (1 - q)); ctx.lineTo(c[0], c[1] + s * 0.1 * (1 - q)); ctx.stroke(); }
  ctx.restore();
  let p = X(0, 0); ctx.fillStyle = INKC; ctx.globalAlpha = a; ctx.beginPath(); ctx.ellipse(p[0], p[1], s * 0.28, s * 0.22, st.rot || 0, 0, 7); ctx.fill();
  p = X(0.36, -0.06); ctx.beginPath(); ctx.arc(p[0], p[1], s * 0.16, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  brushPts(ctx, [X(0.48, 0.0), X(0.8, 0.1), X(1.08, 0.2)], { w: s * 0.03, a, taper: 0.8, head: 0.1, stri: 0, seed: 41 }, 2);
  brushPts(ctx, [X(0.4, -0.18), X(0.5, -0.32), X(0.6, -0.42)], { w: s * 0.02, a, taper: 0.6, stri: 0, seed: 42 }, 2);
}
function mosqOver(ctx, st, t) { const X = mosqPts(st), s = st.s; const e = Object.assign({ angry: 0.6, look: [0.6, 0.2] }, st.e || {}); e.a = (e.a ?? 1) * (st.a ?? 1); eyePair(ctx, X(0.31, -0.1), X(0.45, -0.08), s * 0.06, s * 0.075, st.rot || 0, e); }

// ---------- FLY ----------
function flyX(st) { return mosqPts(st); }
function flyInk(ctx, st, t) {
  const X = flyX(st), s = st.s, a = st.a ?? 1, bz = Math.sin(t * 80 + (st.ph || 0)) * 0.35;
  for (const [cx, cy, rot] of [[-0.3, -0.48, -0.7 + bz], [-0.05, -0.52, -0.3 - bz]]) {
    const p = X(cx, cy), q = X(cx + Math.cos(rot), cy + Math.sin(rot)), ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
    ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(ang); ctx.globalAlpha = 0.16 * a; ctx.fillStyle = INKC; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.48, s * 0.2, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 0.4 * a; ctx.strokeStyle = INKC; ctx.lineWidth = 1.3; ctx.stroke(); ctx.restore();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 6; i++) { const bx = -0.2 + 0.12 * i, kx = -0.45 + 0.24 * i; brushPts(ctx, [X(bx, 0.25), X(kx, 0.52), X(kx + 0.12, 0.72 + 0.04 * Math.sin(t * 5 + i))], { w: s * 0.04, a, taper: 0.4, stri: 0, seed: 50 + i, sub: 4 }, 2); }
  const body = []; for (let i = 0; i < 40; i++) { const an = i / 40 * 6.283; body.push(X(-0.22 + Math.cos(an) * 0.5, 0.08 + Math.sin(an) * 0.4)); }
  fillPoly(ctx, body, INKC, a); wetFill(body, a * 0.8);
  let p = X(0.25, -0.05); ctx.fillStyle = INKC; ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(p[0], p[1], s * 0.33, 0, 7); ctx.fill();
  p = X(0.6, 0.02); ctx.beginPath(); ctx.arc(p[0], p[1], s * 0.3, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  for (let i = 0; i < 5; i++) brushPts(ctx, [X(-0.4 + 0.2 * i, -0.3 - 0.1 * Math.sin(i)), X(-0.43 + 0.2 * i, -0.45 - 0.1 * Math.sin(i))], { w: s * 0.025, a, taper: 0.6, stri: 0, seed: 60 + i }, 2);
  return body;
}
function flyOver(ctx, st, t) { const X = flyX(st), s = st.s; const e = Object.assign({ angry: 0.55, look: [0.5, 0.1] }, st.e || {}); e.a = (e.a ?? 1) * (st.a ?? 1); eyePair(ctx, X(0.5, -0.1), X(0.8, -0.05), s * 0.15, s * 0.19, st.rot || 0, e); }

// ---------- MANTIS ----------
function mantX(st) { const f = st.face || 1, s = st.s; return (x, y) => [st.x + x * s * f, st.y + y * s]; }
function mantArm(st, t, far) {
  const X = mantX(st), r = st.raise ?? 0, k = st.strike ?? 0, o = far ? [0.12, 0.06] : [0, 0], s = st.s;
  const Al = [0.1 + o[0], -1.35 + o[1]];
  let E = [Al[0] + lerp(0.4, 0.62, r), Al[1] + lerp(0.3, -0.4, r)], C = [E[0] + lerp(-0.08, -0.14, r), E[1] + lerp(0.45, 0.62, r)];
  const b = 0.02 * Math.sin(t * 2.3 + (far ? 1 : 0)); E[1] += b; C[1] += b;
  const A = X(...Al); let Ew = X(...E), Cw = X(...C);
  if (k > 0) { const T = st.target ? [st.target[0] + (far ? -20 : 0), st.target[1] + (far ? -12 : 0)] : X(Al[0] + 1.4, Al[1] + 0.6), Et = [(A[0] + T[0]) / 2, Math.min(A[1], T[1]) - 0.32 * s]; Ew = mix2c(Ew, Et, k); Cw = mix2c(Cw, T, k); }
  return { A, E: Ew, C: Cw };
}
const mix2c = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
function mantInk(ctx, st, t) {
  const X = mantX(st), s = st.s, a = st.a ?? 1, br = 0.012 * Math.sin(t * 2.1);
  // abdomen (wash + outline)
  const ab = cr([[-0.08, -0.72], [-0.5, -0.98], [-0.95, -0.82], [-1.2, -0.45], [-0.95, -0.42], [-0.55, -0.48], [-0.12, -0.62]], true, 6).map(([x, y]) => X(x, y + br));
  fillPoly(ctx, ab, INKC, 0.42 * a);
  brushPts(ctx, [X(-0.08, -0.74 + br), X(-0.5, -0.99 + br), X(-0.95, -0.83 + br), X(-1.2, -0.46 + br)], { w: s * 0.03, a, taper: 0.4, dry: 0.4, seed: 70 }, 3);
  brushPts(ctx, [X(-1.2, -0.46 + br), X(-0.95, -0.42 + br), X(-0.55, -0.48 + br), X(-0.12, -0.62 + br)], { w: s * 0.022, a: 0.8 * a, taper: 0.4, dry: 0.4, seed: 71 }, 3);
  for (let i = 1; i <= 4; i++) { const q = i / 5; brushPts(ctx, [X(-0.1 - 1.05 * q, -0.72 - 0.25 * Math.sin(Math.PI * q) + br), X(-0.12 - 0.95 * q, -0.5 + 0.02 * q + br)], { w: s * 0.012, a: 0.5 * a, taper: 0.5, stri: 0, seed: 72 + i }, 3); }
  // legs
  for (const [b, kn, ft, sd] of [[[-0.05, -0.82], [-0.45, -0.52], [-0.72, 0]], [[-0.02, -0.84], [-0.28, -0.5], [-0.22, 0]], [[0.04, -1.02], [0.38, -0.62], [0.32, 0]], [[0.06, -1.05], [0.56, -0.72], [0.64, 0]]].map((q, i) => [...q, 80 + i]))
    brushPts(ctx, [X(...b), X(...kn), X(...ft)], { w: s * 0.028, a, taper: 0.3, head: 0.1, stri: 0, seed: sd }, 3);
  // thorax (long neck)
  brushPts(ctx, [X(-0.05, -0.78 + br), X(0.05, -1.25 + br), X(0.14, -1.78 + br)], { w: s * 0.1, a, taper: 0.1, head: 0.1, dry: 0.3, seed: 90, pw: (q) => 0.7 + 0.5 * Math.sin(Math.PI * q) }, 3);
  // arms (far then near)
  for (const far of [true, false]) {
    const { A, E, C } = mantArm(st, t, far), al = (far ? 0.7 : 1) * a;
    brushPts(ctx, [A, E], { w: s * 0.11, a: al, pw: (q) => 0.6 + 0.6 * Math.sin(Math.PI * q), taper: 0.15, head: 0.1, dry: 0.3, seed: 91 + far }, 3);
    brushPts(ctx, [E, [lerp(E[0], C[0], 0.6), lerp(E[1], C[1], 0.6)], C], { w: s * 0.07, a: al, taper: 0.2, head: 0.1, seed: 93 + far }, 3);
    const dx = C[0] - E[0], dy = C[1] - E[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    brushPts(ctx, [C, [C[0] + ux * s * 0.2 - uy * s * 0.16 * (st.face || 1), C[1] + uy * s * 0.2 + ux * s * 0.16 * (st.face || 1)]], { w: s * 0.045, a: al, taper: 0.8, head: 0.1, stri: 0, seed: 95 + far }, 2);
    for (let i = 1; i <= 5; i++) { const q = i / 6, px = lerp(A[0], E[0], q), py = lerp(A[1], E[1], q), fx = E[0] - A[0], fy = E[1] - A[1], fl = Math.hypot(fx, fy) || 1;
      brushPts(ctx, [[px, py], [px + fy / fl * s * 0.16 * (st.face || 1), py - fx / fl * s * 0.16 * (st.face || 1)]], { w: s * 0.034, a: al, taper: 0.8, head: 0.1, stri: 0, seed: 100 + i + far * 9 }, 2); }
  }
  // head
  const hd = cr([[-0.12, -2.02], [0.18, -2.1], [0.48, -2.0], [0.3, -1.8], [0.2, -1.7], [0.08, -1.8]], true, 6).map(([x, y]) => X(x, y + br));
  fillPoly(ctx, hd, INKC, a); wetFill(hd, 0.7 * a);
  brushPts(ctx, [X(0.08, -2.05 + br), X(-0.1, -2.4), X(-0.45, -2.62)], { w: s * 0.012, a, taper: 0.7, stri: 0, seed: 110 }, 3);
  brushPts(ctx, [X(0.2, -2.08 + br), X(0.15, -2.45), X(-0.05, -2.75)], { w: s * 0.012, a, taper: 0.7, stri: 0, seed: 111 }, 3);
  return hd;
}
function mantOver(ctx, st, t) {
  const X = mantX(st), s = st.s, br = 0.012 * Math.sin(t * 2.1), e = Object.assign({ angry: 0.75, look: [0.7, 0.4] }, st.e || {}); e.a = (e.a ?? 1) * (st.a ?? 1);
  eyePair(ctx, X(-0.04, -1.98 + br), X(0.38, -1.96 + br), s * 0.1, s * 0.12, 0, e);
}
