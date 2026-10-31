// Flat 2D characters living in the 3D set: each is drawn every frame with Canvas2D (flat fills, thick ink outline)
// onto a plane that always faces the camera. A character turning over is drawn as each half flipping vertically.
import * as THREE from './three.module.js';
import { clamp, mix } from './toon.js';

const INK = '#1b1420', LW = 14;
export function makeFlat(sizeM, px, draw) {
  const c = document.createElement('canvas'); c.width = c.height = px; const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.03, depthWrite: true, side: THREE.DoubleSide, fog: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(sizeM, sizeM), mat); mesh.renderOrder = 2;
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 40), new THREE.MeshBasicMaterial({ color: 0x1b2a1a, transparent: true, opacity: 0.25, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.renderOrder = 1;
  return { mesh, shadow, ctx, tex, px, sizeM, draw,
    // pose: anchor = world centre of the drawing; facing: +1 if the character's nose points along +worldDir on screen
    update(camera, anchor, worldDir, pose, ground = 0, shadowR = 0.25) {
      mesh.position.copy(anchor); mesh.quaternion.copy(camera.quaternion);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      const face = Math.sign(right.dot(worldDir)) || 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, px, px);
      ctx.setTransform(px / 1024 * face, 0, 0, px / 1024, px / 2, px / 2);
      ctx.lineJoin = ctx.lineCap = 'round'; draw(ctx, pose); tex.needsUpdate = true;
      const h = Math.max(0, anchor.y - ground);
      shadow.position.set(anchor.x, ground + 0.004, anchor.z); const s = shadowR * (1 + h * 0.15); shadow.scale.set(s * 2, s * 1.2, 1);
      shadow.material.opacity = 0.28 * Math.exp(-h * 0.6);
    } };
}
const ell = (ctx, x, y, rx, ry, rot = 0) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); };
const fillInk = (ctx, fill, lw = LW) => { ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke(); };
function stickLeg(ctx, x, y, a, k, len1, len2, w, fur, paw) {
  const kx = x + Math.sin(a) * len1, ky = y + Math.cos(a) * len1; const b = a + k; const fx = kx + Math.sin(b) * len2, fy = ky + Math.cos(b) * len2;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy);
  ctx.lineWidth = w + LW * 2; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = w; ctx.strokeStyle = fur; ctx.stroke();
  ell(ctx, fx + 8, fy, w * 0.75, w * 0.55); fillInk(ctx, paw, LW * 0.8);
}
function eye(ctx, x, y, r, open, look, size = 1) {
  ell(ctx, x, y, r, r * 1.18); fillInk(ctx, '#ffffff', LW * 0.7);
  if (open > 0.05) { ctx.save(); ell(ctx, x, y, r, r * 1.18); ctx.clip(); ell(ctx, x + look[0] * r * 0.35, y + look[1] * r * 0.35, r * 0.55 * size, r * 0.62 * size); ctx.fillStyle = INK; ctx.fill(); ell(ctx, x + look[0] * r * 0.35 + r * 0.2, y + look[1] * r * 0.35 - r * 0.25, r * 0.15, r * 0.15); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore(); }
  return (lidCol) => { const cover = 1 - clamp(open, 0, 1); if (cover <= 0.02) return; ctx.save(); ell(ctx, x, y, r + 2, r * 1.18 + 2); ctx.clip(); ctx.fillStyle = lidCol; ctx.fillRect(x - r - 4, y - r * 1.3, r * 2 + 8, r * 2.36 * cover); ctx.beginPath(); ctx.moveTo(x - r, y - r * 1.18 + r * 2.36 * cover); ctx.lineTo(x + r, y - r * 1.18 + r * 2.36 * cover); ctx.lineWidth = LW * 0.8; ctx.strokeStyle = INK; ctx.stroke(); ctx.restore(); ell(ctx, x, y, r, r * 1.18); ctx.lineWidth = LW * 0.7; ctx.strokeStyle = INK; ctx.stroke(); };
}

// ---------------- Pip the cat (side view, nose to the right) ----------------
// pose: rollF/rollR (0 upright … π belly up), legs {FL,FR,HL,HR:[a,k]}, head {tilt}, eye {open, look, size}, tail {curl, lift}, sq [sx, sy], mood
export const FUR = '#8fa3c4', FUR_D = '#71839f', BELLY = '#f5f0e6', PINKC = '#f29bb0';
export function drawCat(ctx, p) {
  const sq = p.sq || [1, 1]; ctx.scale(sq[0], sq[1]);
  const cF = Math.cos(p.rollF || 0), cR = Math.cos(p.rollR || 0);
  const half = (cs, side, fn) => { ctx.save(); ctx.beginPath(); side < 0 ? ctx.rect(-600, -600, 580, 1200) : ctx.rect(-20, -600, 620, 1200); ctx.clip(); ctx.scale(1, cs >= 0 ? Math.max(0.08, cs) : Math.min(-0.08, cs)); fn(cs < 0); ctx.restore(); };
  const legs = p.legs;
  // far legs first (darker), body, near legs, then head
  const drawLegs = (near, front) => {
    const ks = front ? ['FR', 'FL'] : ['HR', 'HL']; const k = near ? ks[1] : ks[0]; const [a, kb] = legs[k];
    const x = (front ? 120 : -150) + (near ? 18 : -14), y = 50;
    stickLeg(ctx, x, y, a, kb, 95, 90, 40, near ? FUR : FUR_D, near ? BELLY : '#ddd6c8');
  };
  // tail (rear)
  half(cR, -1, (flip) => {
    const c = p.tail || { curl: 0.5, lift: 0.6 }; const bx = -225, by = -30;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.bezierCurveTo(bx - 120, by - 40 * c.lift, bx - 150 - 60 * c.curl, by - 200 * c.lift, bx - 60 - 120 * c.curl, by - 280 * c.lift - 40 * c.curl);
    ctx.lineWidth = 46 + LW * 2; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 46; ctx.strokeStyle = FUR; ctx.stroke();
    drawLegs(false, false);
  });
  half(cF, 1, () => drawLegs(false, true));
  // body: one bean, coloured per half (belly shows when a half is flipped)
  half(cR, -1, (flip) => { ell(ctx, -40, 0, 215, 118); fillInk(ctx, flip ? BELLY : FUR); if (!flip) { ctx.fillStyle = FUR_D; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(-150 + k * 50, -80, 12, 34, 0.3, 0, Math.PI * 2); ctx.fill(); } } drawLegs(true, false); });
  half(cF, 1, (flip) => { ell(ctx, -40, 0, 215, 118); fillInk(ctx, flip ? BELLY : FUR); ell(ctx, 120, 40, 70, 60); ctx.fillStyle = flip ? BELLY : BELLY; ctx.fill(); drawLegs(true, true);
    // head rides on the front half
    const h = p.head || {}; ctx.save(); ctx.translate(200, -85); ctx.rotate((h.tilt || 0)); ctx.scale(1, 1);
    // ears
    for (const [ex, ang] of [[-55, -0.35], [35, 0.15]]) { ctx.save(); ctx.translate(ex, -95); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(-42, 20); ctx.lineTo(0, -70); ctx.lineTo(42, 20); ctx.closePath(); fillInk(ctx, FUR); ctx.beginPath(); ctx.moveTo(-22, 12); ctx.lineTo(0, -40); ctx.lineTo(22, 12); ctx.closePath(); ctx.fillStyle = PINKC; ctx.fill(); ctx.restore(); }
    ell(ctx, 0, 0, 132, 118); fillInk(ctx, FUR);
    ell(ctx, 70, 52, 66, 46); ctx.fillStyle = BELLY; ctx.fill();
    const e = p.eye || { open: 1, look: [0, 0], size: 1 }; const look = e.look || [0, 0];
    const lid1 = eye(ctx, 18, -12, 38, e.open, look, e.size || 1), lid2 = eye(ctx, 96, -8, 34, e.open, look, e.size || 1);
    lid1(FUR); lid2(FUR);
    ctx.beginPath(); ctx.moveTo(122, 30); ctx.lineTo(146, 28); ctx.lineTo(132, 46); ctx.closePath(); fillInk(ctx, PINKC, LW * 0.6);
    ctx.beginPath(); ctx.moveTo(110, 62); ctx.quadraticCurveTo(122, 74, 132, 60); ctx.quadraticCurveTo(142, 74, 154, 62); ctx.lineWidth = LW * 0.6; ctx.strokeStyle = INK; ctx.stroke();
    if (p.mood === 'smug') { ctx.beginPath(); ctx.moveTo(108, 70); ctx.quadraticCurveTo(140, 92, 166, 60); ctx.stroke(); }
    if (p.mood === 'shock') { ell(ctx, 132, 82, 16, 20); fillInk(ctx, '#5a2030', LW * 0.6); }
    ctx.lineWidth = 5; for (const [dy, a] of [[40, -0.12], [54, 0.0], [68, 0.12]]) { ctx.beginPath(); ctx.moveTo(150, dy); ctx.lineTo(150 + 95 * Math.cos(a), dy + 95 * Math.sin(a)); ctx.stroke(); }
    if (p.sweat) { ctx.beginPath(); ctx.moveTo(-90, -70); ctx.quadraticCurveTo(-110, -30, -95, -20); ctx.quadraticCurveTo(-75, -30, -90, -70); fillInk(ctx, '#bfe6ff', LW * 0.5); }
    ctx.restore();
  });
}

// ---------------- Biscuit the pup ----------------
export const TAN = '#e0a868', TAN_D = '#b9834a', CREAM = '#f6e6c8', EAR = '#8a5a34';
export function drawDog(ctx, p) {
  if (p.pitch) { ctx.translate(-120, 200); ctx.rotate(p.pitch); ctx.translate(120, -200); }
  const sq = p.sq || [1, 1]; ctx.translate(0, 200); ctx.scale(sq[0], sq[1]); ctx.translate(0, -200);
  const c = Math.cos(p.roll || 0); ctx.save(); ctx.scale(1, c >= 0 ? Math.max(0.08, c) : Math.min(-0.08, c)); const flip = c < 0;
  const legs = p.legs;
  const L = (k, near, x) => { const [a, kb] = legs[k]; stickLeg(ctx, x + (near ? 12 : -12), 70, a, kb, 60, 55, 46, near ? TAN : TAN_D, CREAM); };
  // tail stub
  ctx.beginPath(); ctx.moveTo(-200, -30); ctx.quadraticCurveTo(-260, -80 - 30 * (p.wag || 0), -250, -130); ctx.lineWidth = 34 + LW * 2; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 34; ctx.strokeStyle = TAN; ctx.stroke();
  L('HR', false, -120); L('FR', false, 110);
  ell(ctx, -20, 10, 210, 120); fillInk(ctx, flip ? CREAM : TAN);
  if (!flip) { ell(ctx, -60, -40, 60, 40, 0.3); ctx.fillStyle = TAN_D; ctx.fill(); }
  L('HL', true, -120); L('FL', true, 110);
  // collar
  ctx.beginPath(); ctx.moveTo(150, -80); ctx.quadraticCurveTo(175, 10, 150, 80); ctx.lineWidth = 34; ctx.strokeStyle = '#d83a34'; ctx.stroke();
  // head
  ctx.save(); ctx.translate(215, -70); ctx.rotate(p.headTilt || 0);
  ell(ctx, -70, -10, 50, 95, 0.3); fillInk(ctx, EAR);
  ell(ctx, 0, 0, 135, 120); fillInk(ctx, TAN);
  ell(ctx, 95, 45, 75, 55); fillInk(ctx, CREAM);
  ell(ctx, 158, 22, 30, 24); fillInk(ctx, '#2a1a14', LW * 0.6);
  if (p.tongue) { ctx.beginPath(); ctx.ellipse(110, 108 + 20 * p.tongue, 22, 30 + 25 * p.tongue, 0.2, 0, Math.PI); fillInk(ctx, '#e86a7a', LW * 0.6); }
  const e = p.eye || { open: 1, look: [0, 0], size: 1 }; const lid1 = eye(ctx, 20, -25, 36, e.open, e.look || [0, 0], e.size || 1), lid2 = eye(ctx, 92, -22, 32, e.open, e.look || [0, 0], e.size || 1); lid1(TAN); lid2(TAN);
  ctx.restore();
  ctx.restore();
  if (p.stars) { // dizzy stars around the head (drawn upright, outside the flip)
    for (let k = 0; k < 4; k++) { const a = p.stars + k * Math.PI / 2; const sx = 215 + Math.cos(a) * 150, sy = (flip ? 80 : -70) - 150 + Math.sin(a) * 40; ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 16 : 36, b = i * Math.PI / 5 - Math.PI / 2; i ? ctx.lineTo(sx + Math.cos(b) * r, sy + Math.sin(b) * r) : ctx.moveTo(sx + Math.cos(b) * r, sy + Math.sin(b) * r); } ctx.closePath(); fillInk(ctx, '#ffd64a', LW * 0.6); }
  }
}

// a flat butterfly
export function drawButterfly(ctx, p) {
  const f = Math.abs(Math.cos(p.flap || 0));
  for (const s of [-1, 1]) { ctx.save(); ctx.scale(s * (0.2 + 0.8 * f), 1); ell(ctx, 120, -60, 120, 90, -0.4); fillInk(ctx, '#ffa31a'); ell(ctx, 100, 70, 80, 60, 0.4); fillInk(ctx, '#ff7a1a'); ell(ctx, 150, -70, 22, 22); ctx.fillStyle = INK; ctx.fill(); ctx.restore(); }
  ell(ctx, 0, 0, 18, 110); ctx.fillStyle = INK; ctx.fill();
}

// ---------------- Walt, the man in striped pyjamas (front view) ----------------
// Canvas units: the plane is 1024 wide; feet at y=+430, top of the hair near -460.
export const SKIN = '#f6c9a4', SKIN_D = '#e2a582', PJ = '#5b8fd6', PJ_S = '#e9f1fb', HAIR = '#5a3a2a', SLIP = '#e95b4b';
export const MAN_SHOULDER = { L: [-100, -195], R: [100, -195] };
const UA = 150, FA = 140;
export function armIK(S, H, side) {
  let dx = H[0] - S[0], dy = H[1] - S[1]; let d = Math.hypot(dx, dy) || 1;
  const maxd = UA + FA - 2; let hx = H[0], hy = H[1];
  if (d > maxd) { hx = S[0] + dx / d * maxd; hy = S[1] + dy / d * maxd; dx = hx - S[0]; dy = hy - S[1]; d = maxd; }
  d = Math.max(d, 40);
  const a = Math.acos(clamp((UA * UA + d * d - FA * FA) / (2 * UA * d), -1, 1)); const base = Math.atan2(dy, dx);
  const e1 = [S[0] + Math.cos(base + a) * UA, S[1] + Math.sin(base + a) * UA], e2 = [S[0] + Math.cos(base - a) * UA, S[1] + Math.sin(base - a) * UA];
  const sc = (e) => e[1] + 0.8 * side * e[0];
  return { E: sc(e1) > sc(e2) ? e1 : e2, H: [hx, hy] };
}
function hand(ctx, H, E, shape, side) {
  const ang = Math.atan2(H[1] - E[1], H[0] - E[0]);
  ctx.save(); ctx.translate(H[0], H[1]); ctx.rotate(ang);
  if (shape === 'point') { ctx.beginPath(); ctx.roundRect(4, -10, 62, 20, 10); fillInk(ctx, SKIN, LW * 0.6); }
  ell(ctx, 0, 0, 34, 30); fillInk(ctx, SKIN, LW * 0.75);
  ell(ctx, 4, -26 * side, 14, 11, 0.6 * side); fillInk(ctx, SKIN, LW * 0.6);
  ctx.restore();
}
function knife(ctx, H, E) {
  const ang = Math.atan2(H[1] - E[1], H[0] - E[0]);
  ctx.save(); ctx.translate(H[0], H[1]); ctx.rotate(ang + 0.5);
  ctx.beginPath(); ctx.roundRect(-10, -9, 70, 18, 8); fillInk(ctx, '#e8e2d6', LW * 0.6);
  ctx.beginPath(); ctx.moveTo(56, -11); ctx.lineTo(170, -8); ctx.quadraticCurveTo(186, 0, 170, 9); ctx.lineTo(56, 9); ctx.closePath(); fillInk(ctx, '#c9d2dc', LW * 0.6);
  ctx.beginPath(); ctx.ellipse(140, 0, 26, 7, 0, 0, Math.PI * 2); ctx.fillStyle = '#ffe27a'; ctx.fill();
  ctx.restore();
}
// arms only (drawn on their own layer so hands can rest on the table top in front of it)
export function drawManArms(ctx, p) {
  const sq = p.sq || [1, 1]; ctx.translate(0, 430); ctx.scale(sq[0], sq[1]); ctx.translate(0, -430); ctx.translate(0, p.dy || 0);
  for (const side of [-1, 1]) {
    const k = side < 0 ? 'L' : 'R'; const S = MAN_SHOULDER[k]; const tgt = (p.hands && p.hands[k]) || [side * 150, 30];
    const { E, H } = armIK(S, tgt, side);
    ctx.beginPath(); ctx.moveTo(S[0], S[1]); ctx.lineTo(E[0], E[1]); ctx.lineTo(H[0], H[1]);
    ctx.lineWidth = 48 + LW * 2; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 48; ctx.strokeStyle = PJ; ctx.stroke();
    // a white cuff
    const cx = E[0] + (H[0] - E[0]) * 0.8, cy = E[1] + (H[1] - E[1]) * 0.8; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(E[0] + (H[0] - E[0]) * 0.86, E[1] + (H[1] - E[1]) * 0.86); ctx.lineWidth = 50; ctx.strokeStyle = PJ_S; ctx.stroke();
    const shape = (p.shape && p.shape[k]) || 'open';
    hand(ctx, H, E, shape, side);
    if (k === 'R' && p.knife) knife(ctx, H, E);
  }
}
export function drawMan(ctx, p) {
  const sq = p.sq || [1, 1]; ctx.translate(0, 430); ctx.scale(sq[0], sq[1]); ctx.translate(0, -430); ctx.translate(0, p.dy || 0);
  const mood = p.mood || 'happy';
  // legs and slippers
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.roundRect(s * 48 - 36, 30, 72, 380, 30); fillInk(ctx, PJ); ctx.save(); ctx.beginPath(); ctx.roundRect(s * 48 - 36, 30, 72, 380, 30); ctx.clip(); ctx.fillStyle = PJ_S; for (let x = -3; x <= 3; x++) ctx.fillRect(s * 48 + x * 24 - 4, 30, 8, 380); ctx.restore(); ctx.beginPath(); ctx.roundRect(s * 48 - 36, 30, 72, 380, 30); ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
    ell(ctx, s * 58, 418, 62, 26); fillInk(ctx, SLIP); ell(ctx, s * 58 + s * 4, 404, 30, 10); ctx.fillStyle = '#ffffff'; ctx.fill(); }
  // torso: striped pyjama top
  const torso = () => { ctx.beginPath(); ctx.moveTo(-108, -205); ctx.quadraticCurveTo(-130, -60, -110, 70); ctx.quadraticCurveTo(0, 100, 110, 70); ctx.quadraticCurveTo(130, -60, 108, -205); ctx.quadraticCurveTo(0, -232, -108, -205); ctx.closePath(); };
  torso(); ctx.fillStyle = PJ; ctx.fill(); ctx.save(); torso(); ctx.clip(); ctx.fillStyle = PJ_S; for (let x = -6; x <= 6; x++) ctx.fillRect(x * 24 - 5, -240, 10, 340); ctx.restore(); torso(); ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
  // collar and buttons
  ctx.beginPath(); ctx.moveTo(-60, -214); ctx.lineTo(0, -150); ctx.lineTo(60, -214); ctx.lineTo(28, -222); ctx.lineTo(0, -185); ctx.lineTo(-28, -222); ctx.closePath(); fillInk(ctx, PJ_S, LW * 0.8);
  ctx.beginPath(); ctx.moveTo(-26, -222); ctx.lineTo(0, -186); ctx.lineTo(26, -222); ctx.closePath(); ctx.fillStyle = SKIN; ctx.fill();
  for (let k = 0; k < 4; k++) { ell(ctx, 0, -120 + k * 52, 9, 9); fillInk(ctx, '#ffffff', LW * 0.5); }
  ctx.beginPath(); ctx.roundRect(40, -110, 50, 44, 8); ctx.fillStyle = PJ_S; ctx.fill(); ctx.lineWidth = LW * 0.6; ctx.strokeStyle = INK; ctx.stroke();
  // head (tilted)
  ctx.save(); ctx.translate(0, -240); ctx.rotate(p.tilt || 0); ctx.translate(0, -90);
  const look = p.look || [0, 0];
  // ears
  for (const s of [-1, 1]) { ell(ctx, s * 104, 8, 22, 32); fillInk(ctx, SKIN, LW * 0.8); }
  ell(ctx, 0, 0, 108, 118); fillInk(ctx, SKIN);
  // hair: a dark cap with a tuft that springs
  ctx.beginPath(); ctx.moveTo(-104, -20); ctx.quadraticCurveTo(-118, -110, -40, -122); ctx.quadraticCurveTo(10, -140, 60, -118); ctx.quadraticCurveTo(116, -100, 104, -20); ctx.quadraticCurveTo(90, -70, 40, -78); ctx.quadraticCurveTo(-10, -60, -40, -82); ctx.quadraticCurveTo(-90, -70, -104, -20); ctx.closePath(); fillInk(ctx, HAIR);
  const tf = p.tuft || 0; ctx.beginPath(); ctx.moveTo(-6, -128); ctx.quadraticCurveTo(-20 - 10 * tf, -190 - 30 * tf, 26 + 20 * tf, -200 - 40 * tf); ctx.quadraticCurveTo(10, -170, 26, -130); ctx.closePath(); fillInk(ctx, HAIR, LW * 0.8);
  // cheeks
  ctx.fillStyle = 'rgba(242,140,140,0.45)'; ell(ctx, -66, 40, 22, 14); ctx.fill(); ell(ctx, 66, 40, 22, 14); ctx.fill();
  // eyes
  const E = { open: 1, size: 1 }; let browL = 0, browR = 0, browY = 0, happyEyes = false, squintL = 1, squintR = 1;
  if (mood === 'horror') { E.size = 0.45; browY = -22; browL = 0.25; browR = -0.25; }
  if (mood === 'despair') { E.open = 0.62; browL = -0.35; browR = 0.35; browY = -6; }
  if (mood === 'suspicious') { squintL = 0.45; squintR = 0.7; browL = 0.35; browR = -0.05; browY = 8; }
  if (mood === 'sneeze0') { E.open = 0.55; browL = -0.25; browR = 0.25; browY = -10; }
  if (mood === 'sneeze') { E.open = 0; browL = 0.3; browR = -0.3; browY = 10; }
  if (mood === 'think') { E.size = 0.8; browL = -0.1; browR = 0.25; browY = -8; }
  if (mood === 'eureka') { E.size = 0.6; browY = -26; }
  if (mood === 'nervous') { E.size = 0.5; browL = -0.25; browR = 0.25; browY = -12; }
  if (mood === 'cheer') { happyEyes = true; browY = -20; }
  if (mood === 'deadpan') { E.open = 0.48; browY = 6; }
  if (mood === 'happy') { E.open = 0.95; browY = -4; }
  const blink = p.blink || 0; const ex = 40, ey = -8;
  if (happyEyes) { for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * ex - 26, ey + 8); ctx.quadraticCurveTo(s * ex, ey - 30, s * ex + 26, ey + 8); ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke(); } }
  else if (E.open === 0) { for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * ex - 26, ey - 10); ctx.lineTo(s * ex + 6 * s, ey); ctx.lineTo(s * ex - 26, ey + 10); ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke(); } }
  else { const l1 = eye(ctx, -ex, ey, 30, E.open * squintL * (1 - blink), look, E.size); const l2 = eye(ctx, ex, ey, 30, E.open * squintR * (1 - blink), look, E.size); l1(SKIN); l2(SKIN); }
  // brows
  for (const [s, a] of [[-1, browL], [1, browR]]) { ctx.save(); ctx.translate(s * ex, ey - 52 + browY); ctx.rotate(a * s * -1); ctx.beginPath(); ctx.moveTo(-26, 0); ctx.quadraticCurveTo(0, -8, 26, 0); ctx.lineWidth = LW * 1.3; ctx.strokeStyle = HAIR; ctx.stroke(); ctx.restore(); }
  // nose
  ell(ctx, 0, 26, 24, 20); fillInk(ctx, SKIN_D, LW * 0.75);
  // mouth
  ctx.lineWidth = LW * 0.9; ctx.strokeStyle = INK; const my = 70;
  const openMouth = (w, h, fill = '#6a2a34') => { ctx.beginPath(); ctx.ellipse(0, my + h * 0.3, w, h, 0, 0, Math.PI * 2); fillInk(ctx, fill, LW * 0.8); ctx.save(); ctx.clip(); ell(ctx, 0, my + h * 1.0, w * 0.7, h * 0.5); ctx.fillStyle = '#e8737f'; ctx.fill(); ctx.restore(); };
  if (mood === 'happy') { ctx.beginPath(); ctx.moveTo(-40, my - 6); ctx.quadraticCurveTo(0, my + 30, 40, my - 6); ctx.stroke(); }
  else if (mood === 'horror') openMouth(30, 44);
  else if (mood === 'despair') { ctx.beginPath(); ctx.moveTo(-40, my + 18); ctx.bezierCurveTo(-20, my - 4, -6, my + 10, 0, my + 4); ctx.bezierCurveTo(8, my - 2, 20, my - 6, 40, my + 18); ctx.stroke(); }
  else if (mood === 'suspicious') { ctx.beginPath(); ctx.moveTo(-10, my + 6); ctx.lineTo(42, my - 2); ctx.stroke(); }
  else if (mood === 'sneeze0') openMouth(18, 16);
  else if (mood === 'sneeze') openMouth(36, 26);
  else if (mood === 'think') { ctx.beginPath(); ctx.moveTo(-6, my + 6); ctx.quadraticCurveTo(14, my - 6, 30, my + 4); ctx.stroke(); }
  else if (mood === 'eureka' || mood === 'cheer') { ctx.beginPath(); ctx.moveTo(-50, my - 10); ctx.quadraticCurveTo(0, my - 2, 50, my - 10); ctx.quadraticCurveTo(40, my + 60, 0, my + 62); ctx.quadraticCurveTo(-40, my + 60, -50, my - 10); ctx.closePath(); fillInk(ctx, '#6a2a34', LW * 0.8); ctx.save(); ctx.clip(); ctx.fillStyle = '#ffffff'; ctx.fillRect(-50, my - 14, 100, 16); ell(ctx, 0, my + 52, 28, 16); ctx.fillStyle = '#e8737f'; ctx.fill(); ctx.restore(); }
  else if (mood === 'nervous') { ctx.beginPath(); ctx.moveTo(-36, my + 6); for (let k = 1; k <= 6; k++) ctx.lineTo(-36 + k * 12, my + 6 + (k % 2 ? -8 : 8)); ctx.stroke(); }
  else if (mood === 'deadpan') { ctx.beginPath(); ctx.moveTo(-30, my + 6); ctx.lineTo(30, my + 6); ctx.stroke(); }
  if (p.sweat) { ctx.beginPath(); ctx.moveTo(96, -70); ctx.quadraticCurveTo(70, -26, 90, -14); ctx.quadraticCurveTo(112, -26, 96, -70); fillInk(ctx, '#bfe6ff', LW * 0.5); }
  ctx.restore();
}
// the idea bulb that pops over his head
export function drawBulb(ctx, p) {
  const s = p.s || 1; ctx.scale(s, s);
  if (p.rays) { ctx.lineWidth = 26; ctx.strokeStyle = '#ffd64a'; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + 0.2; const r0 = 300 + 40 * p.rays, r1 = 380 + 80 * p.rays; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, -60 + Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, -60 + Math.sin(a) * r1); ctx.stroke(); } }
  ctx.beginPath(); ctx.arc(0, -80, 220, Math.PI * 0.8, Math.PI * 2.2); ctx.quadraticCurveTo(110, 120, 100, 200); ctx.lineTo(-100, 200); ctx.quadraticCurveTo(-110, 120, -176, 52); ctx.closePath(); fillInk(ctx, '#fff27a', 22);
  ell(ctx, -80, -150, 50, 70, -0.5); ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.beginPath(); ctx.roundRect(-100, 200, 200, 120, 30); fillInk(ctx, '#b9c3cc', 22);
  for (const y of [240, 280]) { ctx.beginPath(); ctx.moveTo(-100, y); ctx.lineTo(100, y); ctx.lineWidth = 14; ctx.strokeStyle = INK; ctx.stroke(); }
}
