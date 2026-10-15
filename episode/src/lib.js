'use strict';
// ================= "ห้องสมุดห้ามเสียงดัง" — Library, No Noise (stills stage) =================
// Wordless. Pictogram sign only (no letters). Giant librarian hand = NEW character (sleeve + hand only, comes from above/right).
const FL = 1400, SAMS = 125, REDC2 = '#B3271F';
const sw = (t, n, ph = 0) => Math.sin(t * 2 * Math.PI * n / 6.4 + ph);
const SKIN = '#EBCFA8', SKIN_D = '#C79F72', SLEEVE = '#4C5F82', CUFF = '#B3271F';
const SPINE = ['#8C3B2E', '#4C5F82', '#6B7A4B', '#C9A24A', '#7A5A3A', '#3F5662', '#A8553C', '#5E4B6E'];
const rect = (c, x, y, w, h) => { c.beginPath(); c.rect(x, y, w, h); };
let STATE = { sign: 0, shadow: 0, hand: null, t: 0 };

// ---------- giant hand ----------
// pose: {x,y (wrist), ang (forearm direction, rad), s (scale), f:[thumb,index,mid,ring,pinky] curl 0..1, spread 0..1, thumbOut 0..1}
function lenAng(c, x, y, ang, len, w0, w1, col) { // tapered finger segment, returns tip
  const nx = -Math.sin(ang), ny = Math.cos(ang), tx = x + Math.cos(ang) * len, ty = y + Math.sin(ang) * len;
  c.beginPath(); c.moveTo(x + nx * w0 / 2, y + ny * w0 / 2); c.lineTo(tx + nx * w1 / 2, ty + ny * w1 / 2);
  c.arc(tx, ty, w1 / 2, ang + Math.PI / 2, ang - Math.PI / 2, true); c.lineTo(x - nx * w0 / 2, y - ny * w0 / 2); c.arc(x, y, w0 / 2, ang - Math.PI / 2, ang + Math.PI / 2, true); c.closePath();
  c.fillStyle = col; c.fill(); c.strokeStyle = INKC; c.lineWidth = 5; c.lineJoin = 'round'; c.stroke();
  return [tx, ty];
}
function giantHand(c, H, t) {
  if (!H) return;
  const s = H.s || 1, fa = H.ang; c.save(); c.translate(H.x, H.y); c.rotate(fa); c.scale(s, s);
  // forearm sleeve (extends back off-screen), local +x = toward fingers
  c.fillStyle = SLEEVE; c.strokeStyle = INKC; c.lineWidth = 6; c.beginPath(); c.moveTo(-1400, -135); c.lineTo(-30, -92); c.lineTo(-30, 92); c.lineTo(-1400, 135); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(20,28,50,0.45)'; c.lineWidth = 4; for (const k of [-0.4, 0.1, 0.5]) { c.beginPath(); c.moveTo(-900, 135 * k * 1.0); c.quadraticCurveTo(-400, 95 * k + 14, -40, 80 * k); c.stroke(); }
  // red cuff
  c.fillStyle = CUFF; c.beginPath(); c.moveTo(-70, -97); c.lineTo(-10, -92); c.lineTo(-10, 92); c.lineTo(-70, 97); c.closePath(); c.fill(); c.strokeStyle = INKC; c.lineWidth = 5; c.stroke();
  // wrist + palm
  c.fillStyle = SKIN; c.beginPath(); c.moveTo(-10, -82); c.quadraticCurveTo(60, -112, 150, -100); c.lineTo(190, -92); c.lineTo(190, 92); c.quadraticCurveTo(100, 118, -10, 82); c.closePath(); c.fill(); c.strokeStyle = INKC; c.lineWidth = 5; c.stroke();
  // palm creases
  c.strokeStyle = 'rgba(120,80,40,0.55)'; c.lineWidth = 4; c.beginPath(); c.moveTo(40, -40); c.quadraticCurveTo(100, -10, 150, 40); c.stroke(); c.beginPath(); c.moveTo(60, 10); c.quadraticCurveTo(110, 20, 160, 60); c.stroke();
  // fingers: index, middle, ring, pinky (y positions at the knuckles)
  const F = H.f || [0, 0, 0, 0, 0], sp = H.spread || 0, fy = [-66, -22, 22, 62], fl = [190, 210, 195, 150], fw = [52, 54, 50, 42];
  for (let i = 0; i < 4; i++) {
    const cu = F[i + 1], base = (i - 1.5) * 0.13 * sp; let a = base, x = 188, y = fy[i];
    if (cu > 0.5) { // folded finger: rounded knuckle block lying over the palm edge
      c.fillStyle = SKIN; c.beginPath(); c.ellipse(x + 26, y, 44, fw[i] / 2 + 3, 0, 0, 7); c.fill(); c.strokeStyle = INKC; c.lineWidth = 5; c.stroke();
      c.strokeStyle = 'rgba(120,80,40,0.55)'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(x + 6, y - fw[i] / 2 + 6); c.quadraticCurveTo(x + 22, y, x + 6, y + fw[i] / 2 - 6); c.stroke(); continue; }
    const segs = [fl[i] * 0.42, fl[i] * 0.33, fl[i] * 0.25], ws = [fw[i], fw[i] * 0.92, fw[i] * 0.84, fw[i] * 0.78];
    // knuckle webbing
    for (let k = 0; k < 3; k++) { const bend = cu * (k === 0 ? 1.0 : k === 1 ? 1.25 : 0.9) * 1.25; a += bend * (H.curlDir || 1); [x, y] = lenAng(c, x, y, a, segs[k], ws[k], ws[k + 1], SKIN); }
    // nail
    c.fillStyle = 'rgba(255,236,214,0.9)'; c.beginPath(); c.ellipse(x - Math.cos(a) * 12, y - Math.sin(a) * 12, 12, 8, a, 0, 7); c.fill(); c.strokeStyle = 'rgba(30,20,10,0.5)'; c.lineWidth = 2.5; c.stroke();
  }
  // thumb
  if (F[0] > 0.5) { c.fillStyle = SKIN; c.beginPath(); c.ellipse(120, -80, 70, 34, -0.15, 0, 7); c.fill(); c.strokeStyle = INKC; c.lineWidth = 5; c.stroke(); c.fillStyle = 'rgba(255,236,214,0.9)'; c.beginPath(); c.ellipse(176, -86, 11, 8, -0.15, 0, 7); c.fill(); c.strokeStyle = 'rgba(30,20,10,0.5)'; c.lineWidth = 2.5; c.stroke(); } else
  { const cu = F[0], to = H.thumbOut ?? 0.5; let a = -1.0 - 0.5 * to + cu * 1.3, x = 70, y = -88; [x, y] = lenAng(c, x, y, a, 80, 66, 56, SKIN); a -= cu * 0.4 * 0 - 0.15; [x, y] = lenAng(c, x, y, a - cu * 0.8, 70, 56, 48, SKIN);
    c.fillStyle = 'rgba(255,236,214,0.9)'; c.beginPath(); c.ellipse(x, y, 11, 8, a, 0, 7); c.fill(); c.strokeStyle = 'rgba(30,20,10,0.5)'; c.lineWidth = 2.5; c.stroke(); }
  c.restore();
}
const HAND_POSE = {
  open:   { f: [0, 0, 0, 0, 0], spread: 1, thumbOut: 0.8 },
  point:  { f: [0.9, 0, 1.1, 1.1, 1.1], spread: 0.2, thumbOut: 0.1 },
  shush:  { f: [0.9, 0.0, 1.1, 1.1, 1.1], spread: 0, thumbOut: 0 },
  pinch:  { f: [0.55, 0.65, 0.2, 0.2, 0.2], spread: 0.3, thumbOut: 0.2 },
  fist:   { f: [0.9, 1.1, 1.1, 1.1, 1.1], spread: 0, thumbOut: 0 },
};

// ---------- pictogram sign (finger over lips on a round board, red when loud) ----------
function noiseSign(c, x, y, r, flash, t) {
  c.save(); c.translate(x, y); c.rotate(0.03 * sw(t, 1) + 0.12 * flash * sw(t, 9));
  c.strokeStyle = INKC; c.lineWidth = 4; c.beginPath(); c.moveTo(-r * 0.5, -r * 1.7); c.lineTo(-r * 0.5, -r * 1.0); c.moveTo(r * 0.5, -r * 1.7); c.lineTo(r * 0.5, -r * 1.0); c.stroke();
  c.fillStyle = flash > 0.05 ? REDC2 : '#F3EAD6'; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill(); c.lineWidth = 6; c.stroke();
  const ink = flash > 0.05 ? '#F3EAD6' : INKC; c.strokeStyle = ink; c.fillStyle = ink; c.lineWidth = 5; c.lineCap = 'round';
  c.beginPath(); c.arc(0, -r * 0.15, r * 0.44, 0, 7); c.stroke();                       // face
  c.beginPath(); c.arc(-r * 0.16, -r * 0.27, r * 0.04, 0, 7); c.arc(r * 0.16, -r * 0.27, r * 0.04, 0, 7); c.fill();
  c.lineWidth = 7; c.beginPath(); c.moveTo(0, -r * 0.05); c.lineTo(0, r * 0.62); c.stroke();  // finger on lips
  c.lineWidth = 5; c.beginPath(); c.moveTo(-r * 0.12, r * 0.07); c.lineTo(r * 0.12, r * 0.07); c.stroke();
  c.restore();
}

// ---------- scene ----------
function wallBG(c, t) {
  c.fillStyle = '#E4D3AE'; c.fillRect(-300, -300, 1680, FL + 300);
  for (let k = 0; k < 38; k++) { c.fillStyle = `rgba(150,120,80,${0.03 + 0.03 * hash(k, 3)})`; c.fillRect(-300 + k * 46, -300, 3, FL + 300); }
  // dark beam
  c.fillStyle = '#4A3828'; c.fillRect(-300, 170, 1680, 38); c.strokeStyle = INKC; c.lineWidth = 4; c.strokeRect(-304, 170, 1688, 38);
  // shelves left (x 0..330) and right (750..1080), each 5 rows
  // the LEFT shelf is not drawn here: it moves (tilts) in story.js, so it is drawn only there (never leave a static copy in the background)
  bookshelf(c, 740, 240, 360, FL - 240, 7);
  // shoji door far wall center (rear), slightly visible between shelves
  const dx = 400, dw = 280, dy = 520, dh = FL - 520;
  c.fillStyle = '#F3EBD3'; c.fillRect(dx, dy, dw, dh); c.strokeStyle = '#6B4F33'; c.lineWidth = 8; c.strokeRect(dx, dy, dw, dh);
  c.lineWidth = 4; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(dx + dw * i / 4, dy); c.lineTo(dx + dw * i / 4, dy + dh); c.stroke(); }
  for (let j = 1; j < 6; j++) { c.beginPath(); c.moveTo(dx, dy + dh * j / 6); c.lineTo(dx + dw, dy + dh * j / 6); c.stroke(); }
  c.strokeStyle = INKC; c.lineWidth = 3; c.strokeRect(dx - 3, dy - 3, dw + 6, dh + 6);
  // hanging lantern
  const lx = 540, sway = 0.02 * sw(t, 2, 0.5); c.save(); c.translate(lx, 208); c.rotate(sway); c.strokeStyle = INKC; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 130); c.stroke(); c.translate(0, 205);
  c.save(); c.globalCompositeOperation = 'lighter'; const lg = c.createRadialGradient(0, 0, 10, 0, 0, 340); lg.addColorStop(0, 'rgba(255,190,110,0.42)'); lg.addColorStop(1, 'rgba(255,150,70,0)'); c.fillStyle = lg; c.fillRect(-360, -360, 720, 720); c.restore();
  const bg = c.createRadialGradient(-12, -14, 6, 0, 0, 74); bg.addColorStop(0, '#FFF3D2'); bg.addColorStop(1, '#F2C47E'); c.fillStyle = bg; c.beginPath(); c.arc(0, 0, 72, 0, 7); c.fill();
  c.strokeStyle = 'rgba(90,50,20,0.55)'; c.lineWidth = 2.4; for (const k of [-0.7, -0.35, 0, 0.35, 0.7]) { c.beginPath(); c.ellipse(0, 0, 72 * Math.abs(k) + 0.01, 72, 0, 0, 7); c.stroke(); }
  c.strokeStyle = INKC; c.lineWidth = 3.6; c.beginPath(); c.arc(0, 0, 72, 0, 7); c.stroke(); c.fillStyle = INKC; c.fillRect(-18, -80, 36, 12); c.fillRect(-18, 68, 36, 12); c.restore();
}
function bookshelf(c, x, y, w, h, seed) {
  c.fillStyle = '#6B4F33'; c.fillRect(x, y, w, h); c.strokeStyle = INKC; c.lineWidth = 5; c.strokeRect(x, y, w, h);
  const rows = 5, rh = h / rows;
  for (let r = 0; r < rows; r++) {
    const ry = y + r * rh, inner = ry + 10; c.fillStyle = '#3A2A1C'; c.fillRect(x + 8, inner, w - 16, rh - 18);
    let bx = x + 14, k = 0; while (bx < x + w - 30) {
      const bw = 20 + 18 * hash(seed + r * 11 + k, 2), bh = (rh - 34) * (0.72 + 0.28 * hash(seed + r * 7 + k, 4)), col = SPINE[Math.floor(hash(seed + r * 5 + k, 8) * SPINE.length)];
      if (bx + bw > x + w - 14) break; const by = inner + (rh - 18) - bh;
      c.fillStyle = col; c.fillRect(bx, by, bw, bh); c.strokeStyle = INKC; c.lineWidth = 2.5; c.strokeRect(bx, by, bw, bh);
      c.fillStyle = 'rgba(243,234,214,0.8)'; c.fillRect(bx + 3, by + bh * 0.2, bw - 6, 5); c.fillRect(bx + 3, by + bh * 0.62, bw - 6, 4);   // stripes only, no letters
      bx += bw + 2; k++;
    }
    c.fillStyle = '#7C5C3B'; c.fillRect(x + 4, ry + rh - 10, w - 8, 12); c.strokeStyle = INKC; c.lineWidth = 3; c.strokeRect(x + 4, ry + rh - 10, w - 8, 12);
  }
}
function floorBG(c) {
  c.save(); rect(c, -300, FL, 1700, 1200); c.clip(); c.fillStyle = '#C9A46A'; c.fillRect(-300, FL, 1700, 1200);
  const WOOD = ['#D9B67A', '#CFA96B', '#D4B073'], vx = 540, vy = FL - 300;
  for (let i = 0; i < 9; i++) { const y0 = FL + 30 * i * (1 + 0.17 * i), y1 = FL + 30 * (i + 1) * (1 + 0.17 * (i + 1)); c.fillStyle = WOOD[i % 3]; c.fillRect(-300, y0, 1700, y1 - y0);
    c.fillStyle = 'rgba(60,38,20,0.55)'; c.fillRect(-300, y0 - 1, 1700, 2.5 + 0.4 * i); const s0 = (y0 - vy) / (FL - vy), s1 = (y1 - vy) / (FL - vy);
    for (let k = -8; k <= 8; k++) { const xo = (k + 0.5 * (i % 2)) * 300; c.strokeStyle = 'rgba(60,38,20,0.4)'; c.lineWidth = 2; c.beginPath(); c.moveTo(vx + xo * s0, y0); c.lineTo(vx + xo * s1, y1); c.stroke(); } }
  const ao = c.createLinearGradient(0, FL, 0, FL + 90); ao.addColorStop(0, 'rgba(40,26,14,0.5)'); ao.addColorStop(1, 'rgba(40,26,14,0)'); c.fillStyle = ao; c.fillRect(-300, FL, 1700, 90); c.restore();
}
function readingDesk(c, x, y) { // low desk with a scroll; pictorial front view
  c.fillStyle = '#7C5C3B'; c.fillRect(x - 170, y - 80, 340, 26); c.fillRect(x - 150, y - 56, 24, 56); c.fillRect(x + 126, y - 56, 24, 56);
  c.strokeStyle = INKC; c.lineWidth = 4; c.strokeRect(x - 170, y - 80, 340, 26); c.strokeRect(x - 150, y - 56, 24, 56); c.strokeRect(x + 126, y - 56, 24, 56);
  c.fillStyle = '#F3EAD6'; c.fillRect(x - 60, y - 100, 120, 20); c.strokeRect(x - 60, y - 100, 120, 20); c.fillStyle = REDC2; c.fillRect(x - 66, y - 104, 10, 28); c.fillRect(x + 56, y - 104, 10, 28);
}

// ---------- samurai ----------
function samState(x, o = {}) { return Object.assign({ x, y: FL - SAMS * 1.58, ground: FL, S: SAMS, face: -1, sx: 1, sy: 1, rot: 0, wob: 0.01, sw: { mode: 'none' }, band: { a: 1, wind: 0.3 }, a: 1, walk: null, w: 0, sneeze: 0, kick: 0, cold: 0, sad: 0, sweat: 0, strain: 0, shock: 0 }, o); }
function drawSam(c, sam, t, hands, look) {
  const g0 = samGeom(sam, t), EP = [g0.X(-0.16, 0.26), g0.X(0.46, 0.26)];
  const eyes = EP.map((p) => { let lk = [0, 0]; if (look) { const dx = look[0] - p[0], dy = look[1] - p[1], l = Math.hypot(dx, dy) || 1; lk = [clamp(dx / l * 1.05, -1, 1), clamp(dy / l * 1.05, -1, 1)]; } return { open: 0.9, wide: 0.45 + 0.5 * sam.shock, sad: 0, look: lk, closed: 0, squeeze: 0 }; });
  samLegs(c, sam, t); samInk(c, sam, t, 0.5); samOver(c, Object.assign({}, sam, { band: { a: 0 }, e: { a: 0 }, sweat: 0, a: 0.28 }), t);
  samBand(c, sam, t); samEyes(c, sam, t, eyes[0], eyes[1]); if (sam.w > 0.08) { const g = samGeom(sam, t), m = g.X(0.16, 0.74), o = 0.3 + 0.9 * sam.w; c.save(); c.translate(m[0], m[1]); c.fillStyle = '#F1E9D8'; c.beginPath(); c.ellipse(0, 0, sam.S * 0.12, sam.S * 0.1 * o, 0, 0, 7); c.fill(); c.fillStyle = '#5A1410'; c.beginPath(); c.ellipse(0, sam.S * 0.012, sam.S * 0.092, sam.S * 0.078 * o, 0, 0, 7); c.fill(); c.restore(); } samArms(c, sam, t, hands, 0.17);
}
function samBand(ctx, st, t) { // same recipe as the kit's approved band
  const g = samGeom(st, t), S = st.S, ba = st.band.a, wind = st.band.wind;
  ctx.save(); pathPoly(ctx, g.pts); ctx.clip();
  const top = [], bot = []; for (let k = 0; k <= 16; k++) { const x = -1.2 + 2.4 * k / 16; top.push(g.X(x, -0.34 + 0.1 * x * x)); bot.push(g.X(x, -0.1 + 0.1 * x * x)); }
  fillPoly(ctx, top.concat(bot.slice().reverse()), REDC2, ba); ctx.restore(); ctx.globalAlpha = 1;
  const kn = g.X(-0.72, -0.22);
  for (const [dy, ph, ln] of [[0, 0, 1], [0.1, 1.3, 0.8]]) { const tp = []; for (let k = 0; k <= 7; k++) { const q = k / 7; tp.push(g.X(-0.72 - 1.0 * q * ln - 0.15 * wind * q, -0.22 + dy + 0.35 * q * (1.2 - wind * 0.8) + Math.sin(t * 2 * Math.PI / 6.4 * 2 - k * 1.1 + ph) * 0.12 * q * wind)); }
    brushPts(ctx, tp, { w: S * 0.09, col: REDC2, a: ba, taper: 0.45, head: 0.1, stri: 0, dry: 0, seed: 20 + ph * 7, pf: 1 }, 2); }
  ctx.globalAlpha = ba; ctx.fillStyle = REDC2; ctx.beginPath(); ctx.ellipse(kn[0], kn[1], S * 0.12, S * 0.09, 0.4, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
}

// ---------- mochi ----------
function mochi(x, y, s, t, wide) { const SP = clonePose(P_SIT); return { mouth: {}, face: -1, kind: 'kit', col: ORG.k1, sd: 3, rot: 0, pro: 'sit', x, y, s, pose: SP, e: { sleep: 0, open: 1, wide: wide || 0.15, look: [0.3, -0.2], dil: 0.4, sparkle: 1 }, breath: 0.02 * sw(t, 3, 0.2), tailWig: 0.12, tailPh: t * 2 * Math.PI / 6.4 * 2, earTw: 0.05 * sw(t, 5, 0.4), blush: 0.5, hTilt: 0.05, mode: 'walk' }; }

// ---------- frame ----------
function initStory(canvas) { deepFreeze(P_SIT); initEngine(canvas); initCast(); }
function renderStills(name, t) {
  const S0 = window.STILL || {}; const C = S0.cam || [540, 960, 1]; CAMNOW = C;
  const sam = samState(S0.samX ?? 540, S0.sam || {}); const hands = S0.hands || null;
  composeFrame(C, {
    noHalo: true,
    pre: (cx) => { wallBG(cx, t); floorBG(cx); readingDesk(cx, 880, FL + 6);
      if (S0.sign !== false) noiseSign(cx, 540, 700, 66, S0.flash || 0, t);
      paperShadow(cx, sam.x, FL + 8, 150, 0.6);
      },
    ink: () => {},
    chars: (cx) => { drawCat(cx, mochi(S0.catX ?? 880, FL - 90, 1.6, t, S0.catWide), t); if (!S0.noSam) drawSam(cx, sam, t, S0.noHands ? null : hands, S0.look); },
    over: (cx) => { if (S0.shadow) { cx.save(); cx.globalCompositeOperation = 'multiply'; const sg = cx.createLinearGradient(0, -300, 0, FL + 300); const k = Math.round(255 - 110 * S0.shadow); sg.addColorStop(0, `rgb(${k},${k - 6},${k - 12})`); sg.addColorStop(1, 'rgb(255,255,255)'); cx.fillStyle = sg; cx.fillRect(-300, -300, 1700, 2600); cx.restore(); } if (S0.hand) giantHand(cx, S0.hand, t); cx.save(); cx.globalCompositeOperation = 'multiply'; const vg = cx.createRadialGradient(540, FL - 300, 420, 540, FL - 300, 1100); vg.addColorStop(0, 'rgb(255,255,255)'); vg.addColorStop(1, 'rgb(205,196,190)'); cx.fillStyle = vg; cx.fillRect(-300, -300, 1700, 2600); cx.restore(); },
  });
}
function renderFrame(T) { renderStills('x', T); }
