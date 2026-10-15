'use strict';
// ================= timeline part 3: eyes + renderFrame =================
function samEyesAt(t, sam, g, B, C) {
  const P = [g.X(-0.16, 0.26), g.X(0.46, 0.26)];
  let tg = [B.x, B.y];
  if (B.r < 4) tg = [sam.x + 300, sam.y - 100];
  if ((t >= 7.2 && t < 7.9) || (t >= 34.5 && t < 35.0)) tg = [C.x, C.y - 80];
  if (t >= 15.2 && t < 16.1) tg = [sam.x + 200, sam.y];
  const df = dfAt(t); if (df && t >= 29.3 && t < 31.0) tg = [df.x, df.y]; if (df && t >= 31.0 && t < 34.4) tg = [df.x, df.y];
  if (t >= 111 && t < 150) tg = [B.x, B.y];
  if (t >= 138.6) tg = [B.x, B.y];
  let ov = {}; for (const [a, b, o] of SEW) if (t >= a && t < b) ov = Object.assign({}, ov, o);
  return P.map((p) => { const dx = tg[0] - p[0], dy = tg[1] - p[1], l = Math.hypot(dx, dy) || 1;
    return Object.assign({ open: 0.9 - 0.05 * Math.sin(t * 3), wide: 0.4 + 0.55 * sam.shock, sad: 0, look: [clamp(dx / l * 1.05, -1, 1), clamp(dy / l * 1.05, -1, 1)], closed: 0, squeeze: 0, happy: 0, angry: 0 }, ov); });
}
function blinkOv(t, eyes) { const bp = (t * 0.27 + 0.11) % 1; if (bp < 0.03) { const k = Math.sin(bp / 0.03 * PI); for (const e of eyes) if (!e.closed) e.closed = k; } return eyes; }

function renderFrame(T) {
  const t = clamp(T, 0, DUR);
  const E = envAt(t), sam = samAt(t), g = samGeom(sam, t);
  { let m = g.pts[0]; for (const p of g.pts) if (p[1] < m[1]) m = p; SAM_TIP = m[1]; SAM_TIPX = m[0]; }
  const B = bubbleAt(t);
  const C = catAt(t, B, sam);
  const SHR = g.X(-0.85, 0.5), SHL = g.X(0.85, 0.5), reach = (sh, h, mx = 1.15 * SAMS) => { const dx = h[0] - sh[0], dy = h[1] - sh[1], l = Math.hypot(dx, dy); return l > mx ? [sh[0] + dx / l * mx, sh[1] + dy / l * mx] : h; };
  const hasHands = !(t < 2.6 && false);
  const hR0 = handPos(HR, t, sam, B), hL0 = handPos(HL, t, sam, B);
  // flailing while blind (leaf over the face), joy wiggle, struggle
  let hRr = hR0.slice(), hLr = hL0.slice();
  if (t >= 15.1 && t < 16.2) { hRr[0] += 28 * Math.sin(t * 22); hRr[1] += 22 * Math.cos(t * 19); hLr[0] += 28 * Math.sin(t * 20 + 1); hLr[1] += 22 * Math.cos(t * 23); }
  if (t >= 33.4 && t < 34.5) { hRr[1] += 12 * Math.sin(t * 14); hLr[1] += 12 * Math.sin(t * 14 + 2); }
  const R = reach(SHR, hRr), Lh = reach(SHL, hLr);
  const hands = [Lh, R];
  // bubble drawn with Mochi inside it behind the film
  const insideCat = C.inside;
  const eyes = blinkOv(t, samEyesAt(t, sam, g, B, C));
  const mouthG = g.X(0.16, 0.74);
  composeFrame([540, 960, 1], {
    noHalo: true,
    pre: (cx) => {
      wallBG(cx, t, E);
      pillars(cx);
      deckBG(cx, E.wet);
      skyOverlay(cx, E.rain, E.dusk, E.night); skyStars(cx, t, ss(108, 118, t));
      sunDust(cx, t);
      // floor shadows
      paperShadow(cx, sam.x0, FL + 8, 150 * (sam.pr > 0.4 ? 1.3 : 1), 0.5 * (sam.y > FL - 260 ? 1 : 0.3));
      if (!insideCat) paperShadow(cx, C.x, FL + 8, 105, 0.5 * (C.y > FL - 10 ? 1 : 0.35));
      { const sh = clamp(1 - (FL - (B.y + B.r)) / 700, 0, 1); if (B.r > 4) paperShadow(cx, B.x, FL + 12, B.r * 1.0 * (0.8 + 0.3 * sh), 0.18 + 0.28 * sh); }
      puddle(cx, 760, FL + 70, ss(52.6, 54.0, t) * (1 - ss(60, 62, t)), t);
      if (t >= 103.5) cushion(cx, 470, FL + 4, sam.sit > 0.3 ? sam.sit : 0);
      if (t >= 101.5) cushion(cx, 480, FL + 4, sam.sit > 0.3 ? sam.sit : 0);
      // leaf B on the floor, tub, bowl
      if (t >= 16.9 && t < 24) { const k = KS(LEAFB, Math.min(t, 18.8)); leaf(cx, k[0], k[1], k[2], 1.7, 0); }
      const tb = tubAt(t); if (tb && t < 100) tub(cx, tb.x, FL + 6);
      if (t < 97.0) bowl(cx, 470, FL + 6, 1, 1); else if (t >= 101.3) bowl(cx, 430, FL + 8, 1, 0.3);
      // wand resting in the bowl
      if ((t < 3.45) || (t >= 10.2 && t < 97)) { cx.save(); cx.strokeStyle = '#8C5E34'; cx.lineWidth = 8; cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(472, FL - 20); cx.lineTo(548, FL - 150); cx.stroke(); cx.strokeStyle = INKC; cx.lineWidth = 2.5; cx.stroke(); cx.strokeStyle = '#B5B8BC'; cx.lineWidth = 6; cx.beginPath(); cx.ellipse(560, FL - 177, 24, 28, 0.4, 0, PI2); cx.stroke(); cx.restore(); }
      { const fa = fanAt(t, [null, R]); if (fa && !fa.held) fanUchiwa(cx, fa.x, fa.y, fa.ang); }
      { const ua = umbAt(t, sam, [Lh, R]); if (!ua.held && t < 100) wagasa(cx, ua.x, ua.y, ua.ang, 1, ua.flip, 0); }
    },
    ink: () => {},
    chars: (cx) => {
      // ----- Mochi (outside the bubble) -----
      const drawMochi = () => { cx.save(); if (C.sqx !== 1 || C.sqy !== 1) { cx.translate(C.x, C.y + CATY); cx.scale(C.sqx, C.sqy); cx.translate(-C.x, -(C.y + CATY)); }
        drawCat(cx, mochi(C.x, C.y + CATY, 1.6, t, { rot: C.rot, swat: C.sw, sleep: C.sleep, wide: C.wide, look: C.look, tail: C.tail }), t); cx.restore(); };
      if (!insideCat) drawMochi();
      // ----- samurai -----
      samLegs(cx, sam, t); samInk(cx, sam, t, 0.5); samOver(cx, Object.assign({}, sam, { band: { a: 0 }, e: { a: 0 }, sweat: 0, a: 0.28 }), t);
      samBand(cx, sam, t); samEyes(cx, sam, t, eyes[0], eyes[1]);
      const mw = mouthAt(t); if (mw > 0.08) { const m = mouthG, o = 0.3 + 0.9 * mw; cx.save(); cx.translate(m[0], m[1]); cx.fillStyle = '#F1E9D8'; cx.beginPath(); cx.ellipse(0, 0, SAMS * 0.1 * (0.6 + 0.4 * mw), SAMS * 0.1 * o, 0, 0, 7); cx.fill(); cx.fillStyle = '#7A1B15'; cx.beginPath(); cx.ellipse(0, SAMS * 0.02, SAMS * 0.07 * (0.6 + 0.4 * mw), SAMS * 0.07 * o, 0, 0, 7); cx.fill(); cx.restore(); }
      // foam on his face after the soap shower
      if (t >= 100.9 && t < 107.5) { const k = ss(100.9, 101.1, t) * (1 - ss(105.5, 107.5, t)); cx.save(); cx.globalAlpha = k; for (const [dx, dy, rr] of [[-60, 70, 26], [-10, 92, 30], [30, 60, 24], [-40, 36, 20], [20, 120, 28], [60, 100, 22]]) { const p = g.X(dx / SAMS, dy / SAMS * 0.9 + 0.1); cx.fillStyle = 'rgba(255,255,255,0.95)'; cx.beginPath(); cx.arc(p[0], p[1] + 8 * (1 - k), rr, 0, PI2); cx.fill(); cx.strokeStyle = 'rgba(22,19,18,0.6)'; cx.lineWidth = 2.5; cx.stroke(); } cx.restore(); }
      // leaf over his face
      if (t >= 15.2 && t < 16.1) { const fp = g.X(0.1, 0.28); leaf(cx, fp[0], fp[1], 0.5 + 0.1 * Math.sin(t * 30), 1.15, 0); }
      // ----- Mochi inside the bubble -----
      if (insideCat) drawMochi();
      // ----- the bubble -----
      if (B.r > 3) { const pts = bubbleBig(cx, { x: B.x, y: B.y, r: B.r, sx: B.sx, sy: B.sy, rot: B.rot, wob: B.wob, t, a: 1 }); }
      // near-miss rings (the rule's mark)
      for (const [te, a, kind] of WOB) if (kind && t >= te && t < te + 0.5) tingRingsB(cx, B.x + B.r * 0.72, B.y - B.r * 0.72, (t - te) / 0.5, 0.9);
      // film in the wand while he gets ready
      const wandHeld = t >= 3.45 && t < 10.1;
      if (wandHeld) { const film = t < 4.0 ? 0 : t < 5.0 ? ss(4.0, 4.4, t) : t < 6.2 ? 1 - ss(5.6, 6.2, t) : 0; const wa = -0.5 - 0.15 * Math.sin(t * 1.4); wandRing(cx, R[0], R[1], t < 4.0 ? 0.2 : wa, film, t); }
      // hoop
      if (t >= 74.0 && t < 78.6) { const film = t < 74.9 ? 0 : 1; hoop(cx, R[0], R[1], -0.2 + 0.05 * Math.sin(t * 6), 92, film * ss(74.9, 75.3, t), t); }
      // bowl in his hands (act 7) / fan / umbrella
      if (t >= 97.0 && t < 101.3) { const mid = [R[0], R[1] + 4]; bowl(cx, mid[0], mid[1] + 34, 1, 1); if (t >= 100.4) { cx.save(); cx.fillStyle = 'rgba(255,255,255,0.95)'; for (let i = 0; i < 8; i++) { const q = ss(100.4, 101.3, t), px = mid[0] - 70 + 20 * i + 15 * Math.sin(i * 3) , py = mid[1] - 40 + q * (190 + 20 * i) ; cx.beginPath(); cx.arc(px, py, 9 + 3 * (i % 3), 0, PI2); cx.fill(); } cx.restore(); } }
      { const fa = fanAt(t, [null, R]); if (fa && fa.held) fanUchiwa(cx, fa.x, fa.y, fa.ang, fa.flap || 0); }
      { const ua = umbAt(t, sam, [Lh, R]); if (ua.held) wagasa(cx, ua.x, ua.y, ua.ang, 1, ua.flip, ua.water); }
      samArms(cx, sam, t, hands, 0.17);
      // wet hands shine
      if ((t >= 17.4 && t < 22) || (t >= 90.0 && t < 95.6)) { for (const h of [Lh, R]) { cx.save(); cx.fillStyle = 'rgba(200,230,240,0.55)'; cx.beginPath(); cx.arc(h[0] - 3, h[1] - 4, SAMS * 0.1, 0, PI2); cx.fill(); cx.restore(); } }
      // puffs
      for (const [te, s] of PUFF) { if (s <= 0) continue; const d = t - te; if (d >= 0 && d < 0.5) { const ang = Math.atan2(B.y - mouthG[1], B.x - mouthG[0]); puffLines(cx, mouthG[0], mouthG[1], ang, d / 0.5, s); } }
      // the Wind
      for (const [a, b, d, s] of GUST) gustSwirl(cx, t, a, b, d, s);
      // leaves, dragonfly, rain
      { const lf = leafPos(t); if (lf) leaf(cx, lf.x, lf.y, lf.rot, 1, lf.flip); }
      { const lf = t >= 16.1 && t < 21 ? KS([[16.1, 470, 1240, 0.6], [16.8, 800, 1100, 2.0], [17.8, 980, 1300, 3.5], [18.8, 1030, 1392, 3.1], [24, 1030, 1392, 3.1]], t) : null; if (lf) leaf(cx, lf[0], lf[1], lf[2], 1, t > 18.8 ? 0.7 : 0.3 * Math.abs(Math.sin(t * 9))); }
      { const df = dfAt(t); if (df) dragonfly(cx, df.x, df.y, df.rot, t, 0.9); }
      if (t >= 42.5 && t < 52) { rainLayer(cx, t, ss(42.5, 44, t) * (1 - ss(50.6, 51.8, t))); }
      for (const dt of [42.8, 43.2, 43.5]) { const k = (t - dt) / 0.4; if (k >= 0 && k < 1) splashDrops(cx, 600 + 150 * hash(dt, 1), FL + 60, k, 6, 40, 40); }
      if (t >= 51.5 && t < 53) { const q = (t - 51.6) / 0.7; if (q >= 0 && q < 1) { cx.save(); cx.fillStyle = 'rgba(160,196,210,0.9)'; cx.strokeStyle = INKC; cx.lineWidth = 1.5; for (let i = 0; i < 12; i++) { const px = 700 + 130 * q + 14 * i, py = 1160 + 280 * q * q + 20 * Math.sin(i * 2) - 100 * (1 - q); cx.beginPath(); cx.arc(px, py, 6, 0, PI2); cx.fill(); cx.stroke(); } cx.restore(); } }
      if (t >= 52.3 && t < 53.4) { const q = (t - 52.3) / 1.1; cx.save(); cx.fillStyle = 'rgba(160,196,210,0.9)'; for (let i = 0; i < 9; i++) { const a = i * 0.7; cx.globalAlpha = 1 - q; cx.beginPath(); cx.arc(C.x + Math.cos(a) * 80 * q * 2.3 * (i % 2 ? -1 : 1) - 40 * q, C.y - 90 - 120 * q * (0.5 + 0.5 * Math.sin(a)), 5, 0, PI2); cx.fill(); } cx.restore(); }
      // dust puffs
      for (const [te, , , ] of EV.filter((e) => ['thump', 'land', 'dive', 'catch', 'dust', 'dustB', 'tub'].includes(e[1]))) { const d = t - te; if (d >= 0 && d < 0.6) dust(cx, te < 36 ? sam.x : (te > 80 ? sam.x0 : sam.x0), FL + 6, d / 0.6, 0.8, 16); }
      // fireflies and the tiny trigger
      if (t >= 105.5) { for (let i = 0; i < 4; i++) { const a = ss(105.5 + i * 0.4, 106.5 + i * 0.4, t) * (1 - ss(133, 135, t) * 0.0); const px = 160 + 700 * hash(i, 21) + 40 * Math.sin(t * 0.7 + i * 2), py = 900 + 300 * hash(i, 22) + 30 * Math.sin(t * 0.9 + i); firefly(cx, px, py, t, a * (0.6 + 0.4 * Math.sin(t * 2 + i * 1.7))); } }
      if (t >= 116.0 && t < 125) { const q = clamp((t - 115.6) / 0.6), fx = 520 + 40 * Math.sin(t * 3), fy = B.y - B.r - 30 + 20 * (1 - q) * 4; firefly(cx, fx, B.y - B.r - 12 * q, t, 0.9 * q * (1 - ss(124, 125, t))); }
      // sleep bubble from his nose
      if (t >= 112.4 && t < 138.6) { const m = g.X(0.62, 0.44); const ph = (t - 112.4); const br = 6 + 30 * (0.5 + 0.5 * Math.sin(ph * 1.4 - 1.4)) * ss(112.4, 114, t); bubble(cx, m[0] - 22 - br * 1.05, m[1] - br * 0.45, br); }
      if (t >= 138.6 && t < 144.2) { const m = g.X(0.62, 0.44), br = 8 + 62 * ss(138.6, 143.0, t), al = 1 - ss(143.0, 144.2, t); bubble(cx, sam.x + 60 + br, m[1] - br * 0.3, br, al); }
      // stars/dizzy
      if (t >= 33.4 && t < 34.6) stars(cx, sam.x, sam.y - 220, t, 3, 70);
      if (t >= 30.6 && t < 31.3) stars(cx, sam.x, sam.y - 220, t, 3, 60);
      // final sparkle
      if (t >= 148.5) { const k = (t - 148.5) / 1.5; sparkBurst(cx, B.x, B.y - B.r * 0.2, k, 14, B.r * 1.15); }
    },
  });
  // fade in/out, dusk dimming for the tense moment
  const c = document.getElementById('c').getContext('2d');
  const dim = 0.34 * wnd(129.2, 134.4, t, 1.2); if (dim > 0.01) { c.save(); c.fillStyle = `rgba(20,16,30,${dim})`; c.fillRect(0, 0, 1080, 1920); c.restore(); }
  const fade = 1 - ss(0, 0.5, t) + ss(148.8, 150, t); if (fade > 0.002) { c.save(); c.fillStyle = `rgba(241,233,216,${clamp(fade)})`; c.fillRect(0, 0, 1080, 1920); c.restore(); }
}
function pillars(c) { for (const [x, w] of [[-20, 130], [985, 150]]) { c.fillStyle = '#5A4331'; c.fillRect(x, 150, w, FL - 150); c.strokeStyle = INKC; c.lineWidth = 5; c.strokeRect(x, 150, w, FL - 150); c.strokeStyle = 'rgba(30,18,8,0.35)'; c.lineWidth = 3; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(x + w * i / 4, 160); c.lineTo(x + w * i / 4, FL); c.stroke(); } c.fillStyle = '#8A8478'; c.fillRect(x - 12, FL - 30, w + 24, 30); c.strokeRect(x - 12, FL - 30, w + 24, 30); } }
