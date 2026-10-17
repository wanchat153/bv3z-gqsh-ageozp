// anim.js — frame(t): a pure function of t. back layer (scene.js) -> characters (ink engine) -> front layer (marbles, lips).
const E1 = (o) => Object.assign({ open: 1 }, o), L0 = [0.15, 0.03];
const SP_ = clonePose(P_SIT);
const XW = (t) => t - (C.TBP + C.RIDE + C.TBLOCK);                 // unwrapped time since a block hit
const xin = (t, a) => a + C.mod(XW(t) - a, 2);                      // the 2 s window [a, a+2) that every performer repeats
const ease3 = (u) => { u = C.clamp(u); return u * u * (3 - 2 * u); };
const mixv = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);

// ---- the samurai: stands on the stool, hops onto the plank's right end at x = 7.0 (kick), hops back
function samuraiState(t) {
  const x = xin(t, 6.0), st0 = [C.STOOL.u, C.STOOL.h + 0.0];
  let u = st0[0], h = st0[1], sx = 1, sy = 1, arms = 'rest', look = L0, mood = 'calm', walk = null;
  const landR = (xx) => C.plankEndR(xx);
  if (x < 6.30) { const b = Math.sin(t * LQ(3.1)) * 0.012; sy = 1 + b; }
  else if (x < 6.52) { const k = ease3((x - 6.30) / 0.22); sy = 1 - 0.20 * k; sx = 1 + 0.10 * k; arms = 'back'; }
  else if (x < 7.0) { const f = (x - 6.52) / 0.48, e = landR(6.999); u = st0[0] + (e[0] - st0[0]) * f; h = st0[1] + (e[1] - st0[1]) * f + 4 * 9.0 * f * (1 - f); sy = 1.08 - 0.06 * Math.abs(f - 0.5); sx = 0.95; arms = 'up'; mood = 'wide'; }
  else if (x < 7.14) { const e = landR(x), k = Math.sin(Math.PI * (x - 7.0) / 0.14); u = e[0]; h = e[1]; sy = 1 - 0.22 * Math.max(0, 1 - (x - 7.0) / 0.1); sx = 1 + 0.12 * Math.max(0, 1 - (x - 7.0) / 0.1); arms = 'out'; mood = 'happy'; }
  else if (x < 7.60) { const f = (x - 7.14) / 0.46, e = landR(7.14); u = e[0] + (st0[0] - e[0]) * f; h = e[1] + (st0[1] - e[1]) * f + 4 * 7.5 * f * (1 - f); sy = 1.06; sx = 0.96; arms = 'up'; mood = 'happy'; }
  else if (x < 7.80) { const k = 1 - ease3((x - 7.60) / 0.20); sy = 1 - 0.14 * k; sx = 1 + 0.07 * k; arms = 'out'; mood = 'happy'; }
  else if (x < 8.30) { const b = Math.sin(t * LQ(3.1)) * 0.012; sy = 1 + b; mood = 'happy'; }
  // eyes follow the marble
  return { u, h, sx, sy, arms, mood, x };
}
function samuraiDraw(t) {
  const s = samuraiState(t), S = 95, [px, py] = C.P(s.u, s.h, 0.8), sw = { mode: 'none' };
  const st = { x: px, y: py - S * 1.58 * s.sy, S, face: -1, rot: 0, sx: s.sx, sy: s.sy, sw, band: { a: 1, wind: 0.5 }, ground: py };
  const g = samGeom(st, t); const HL = { rest: [[1.36, 0.88], [-1.36, 0.88]], back: [[1.25, 1.12], [-1.25, 1.12]], up: [[1.5, 0.1], [-1.5, 0.1]], out: [[1.7, 0.55], [-1.7, 0.55]] }[s.arms];
  st.handsAbs = HL.map((h) => g.X(h[0], h[1]));
  const ey = Object.assign({}, E1({ look: [-0.55, 0.15] }), s.mood === 'happy' ? { happy: 1 } : s.mood === 'wide' ? { wide: 0.8 } : {});
  return { st, ey };
}
// ---- Mochi: sits at the left, pats the marble at x = 5.0
function mochiDraw(t) {
  const x = xin(t, 4.4), S2 = 2.4; const marblePat = C.descent(C.TBLOCK + 5.0), tipU = marblePat[0] - C.RM - 0.1;
  const [tx, ty] = C.P(tipU, marblePat[1]); const cx = tx - 48 * S2, cy = ty + 41 * S2 - 4;
  const raise = x >= 4.92 && x < 5.30 ? 1 : 0, lean = x >= 4.92 && x < 5.30 ? 0.1 : 0;
  const look = kf(x, [[4.4, 0.55, -0.55], [4.55, 0.35, 0.35], [4.9, 0.7, 0.2], [5.2, 0.9, 0.15], [5.6, 0.95, 0.2], [6.3, 0.9, 0.05]]);
  const catBase = { mouth: {}, face: 1, kind: 'kit', col: ORG.k1, sd: 3, rot: 0, e: { sleep: 0, open: 1, wide: 0, look, dil: 0.4, sparkle: 1 }, breath: undefined, tailWig: 0.14, tailPh: 1, earTw: 0, blush: 0.55, hTilt: lean, mode: 'walk' };
  return Object.assign({}, catBase, { pro: 'sit', raise, x: cx, y: cy, s: S2, pose: SP_, e: Object.assign({}, catBase.e, { look, wide: x >= 4.8 && x < 5.4 ? 0.5 : 0 }) });
}

// ---- soft contact shadows under the performers (back layer)
function perfShadows(ctx, t) {
  const s = samuraiState(t); const air = Math.max(0, s.h - (C.STOOL.h)); softShadow(ctx, C.STOOL.u, 0.8, 7.2, 3.0, 0.0);
  const [px, py] = C.P(s.u, s.h, 0.8); ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(70,64,90,0.30)'; ctx.beginPath(); ctx.ellipse(px, C.P(0, Math.min(s.h, C.STOOL.h), 0.8)[1] + 2, 78 * (1 - Math.min(0.3, air * 0.02)), 10, 0, 0, 7); ctx.fill(); ctx.restore();
  const m = mochiDraw(t); const [cx, cy] = [m.x - 6, m.y + 3]; ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(70,64,90,0.26)'; ctx.beginPath(); ctx.ellipse(cx, cy, 110, 12, 0, 0, 7); ctx.fill(); ctx.restore();
}

function backLayer(ctx, t) {
  floorLayer(ctx);
  drawGantry(ctx);
  drawElevatorBack(ctx, t);
  drawChute1(ctx, t); drawBlock(ctx, t); drawMarimba(ctx, t); drawStation3(ctx, t); drawStage(ctx, t);
  perfShadows(ctx, t);
}
function frontLayer(ctx, t) {
  // marbles, then front lips
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  for (let m = 0; m < C.NM; m++) { const k = C.marble(t, m); drawMarble(ctx, k.u, k.h, k.col); }
  drawCupLips(ctx, t);
  const ch = C.CH; gutterLip(ctx, ch.a, ch.b, { ext0: 1.2, ext1: 1.8 });
  gutterLip(ctx, C.CATCH, C.LIP3, { ext0: 3.6, ext1: 1.6 });
  { const o3 = C.shiMarble(3.9); gutterLip(ctx, [o3[0], o3[1] - 0.3], [o3[0] - 4.2, 30.4], { ext0: 0.6, ext1: 1.0, q: 2.0 }); }
  const g = C.GUT; gutterLip(ctx, [g.a[0], g.a[1] + C.RM], [g.b[0] + 1.2, g.b[1] + C.RM], { ext0: 3.0, ext1: 0.6, col: COL.wood });
}
let _neutral = false;
function frame(t) {
  t = C.mod(t, C.T);
  if (!_neutral) { GRAIN.getContext('2d').fillStyle = '#fff'; GRAIN.getContext('2d').fillRect(0, 0, W, H); for (const cv of [FIB, VIG]) cv.getContext('2d').clearRect(0, 0, W, H); _neutral = true; }
  const p = PAPER.getContext('2d'); p.setTransform(1, 0, 0, 1, 0, 0); p.globalCompositeOperation = 'source-over'; p.globalAlpha = 1;
  backLayer(p, t);
  const cat = mochiDraw(t), sm = samuraiDraw(t);
  CAMNOW = [540, 960, 1];
  composeFrame(CAMNOW, { noHalo: true,
    chars: (c) => { drawCat(c, cat, t); samLegs(c, sm.st, t); samInk(c, sm.st, t, 0.5); samArms(c, sm.st, t, sm.st.handsAbs); },
    over: (c) => { samOver(c, sm.st, t); samEyes(c, sm.st, t, sm.ey, sm.ey); } });
  frontLayer(mctx, t);
}
