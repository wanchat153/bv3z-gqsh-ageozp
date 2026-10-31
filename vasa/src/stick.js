// Flat 2D "round-head" characters for the narrated shorts, drawn every frame with Canvas2D onto camera-facing planes.
// Style: big off-white egg head with a thick dark-brown marker outline, no neck, a tall bean body in one flat clothes
// colour with soft shading, arms and legs as single thick dark strokes ending in small round hands, minimal faces
// (dot eyes, half-lids, thick short brows, tiny mouths), flat hair/hats with one or two inner strokes.
import * as THREE from './three.module.js';

export const INK = '#2a1d1d';
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const mix = (a, b, u) => a + (b - a) * u;

// a billboard: px canvas, drawn in 1024-unit space (origin centre, y down)
export function makeBoard(sizeM, px, draw) {
  const c = document.createElement('canvas'); c.width = c.height = px; const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.02, depthWrite: true, side: THREE.DoubleSide, fog: true });
  // the whole card sits at ONE depth (its anchor: the body centre, nudged toward the camera), so a character is either in front of
  // or behind a set piece, never sliced by it (no head or hat poking through walls, masts, racks or furniture)
  const anchorU = { value: new THREE.Vector3() };
  mat.onBeforeCompile = (sh) => { sh.uniforms.uAnchor = anchorU; sh.vertexShader = 'uniform vec3 uAnchor;\n' + sh.vertexShader.replace('#include <project_vertex>',
    '#include <project_vertex>\n  { vec4 ac = projectionMatrix * viewMatrix * vec4(uAnchor, 1.0); gl_Position.z = clamp(ac.z / ac.w, -1.0, 1.0) * gl_Position.w; }'); };
  mat.customProgramCacheKey = () => 'board-flat-depth';
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(sizeM, sizeM), mat); mesh.renderOrder = 2;
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32), new THREE.MeshBasicMaterial({ color: 0x1a1210, transparent: true, opacity: 0.3, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.renderOrder = 1;
  return { mesh, shadow, ctx, tex, px, sizeM, draw,
    // feet = world point under the feet; the plane faces the camera but stays upright
    update(camera, feet, pose, tint = null, ground = null) {
      const half = sizeM / 2;
      mesh.position.copy(feet).add(new THREE.Vector3(0, half - sizeM * 0.08, 0));
      const cp = camera.position; mesh.rotation.set(0, Math.atan2(cp.x - mesh.position.x, cp.z - mesh.position.z), 0); if (pose.roll) mesh.rotateZ(pose.roll);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, px, px);
      ctx.setTransform(px / 1024 * (pose.flip ? -1 : 1), 0, 0, px / 1024, px / 2, px / 2);
      ctx.lineJoin = ctx.lineCap = 'round'; draw(ctx, pose); tex.needsUpdate = true;
      if (tint) mat.color.copy(tint); else mat.color.setRGB(1, 1, 1);
      { const toCam = camera.position.clone().sub(feet); toCam.y = 0; const dist = toCam.length(); toCam.normalize();
        anchorU.value.copy(feet).add(new THREE.Vector3(0, sizeM * 0.36, 0)).addScaledVector(toCam, Math.min(pose.depthNudge ?? 0.35, dist * 0.5)); }
      const g = ground ?? feet.y; shadow.visible = pose.shadow !== false;
      shadow.position.set(feet.x, g + 0.006, feet.z); const s = sizeM * 0.2 * (pose.shadowW || 1); shadow.scale.set(s * 2, s, 1);
    } };
}

const ell = (c, x, y, rx, ry, r = 0) => { c.beginPath(); c.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), r, 0, Math.PI * 2); };
const stroke = (c, w, col = INK) => { c.lineWidth = w; c.strokeStyle = col; c.stroke(); };
const fillStroke = (c, fill, w = 10) => { c.fillStyle = fill; c.fill(); stroke(c, w); };
function rrect(c, x0, y0, x1, y1, r) { r = Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2); c.beginPath(); c.moveTo(x0 + r, y0); c.arcTo(x1, y0, x1, y1, r); c.arcTo(x1, y1, x0, y1, r); c.arcTo(x0, y1, x0, y0, r); c.arcTo(x0, y0, x1, y0, r); c.closePath(); }
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; const f = (v) => Math.round(clamp(v * k, 0, 255)); return `rgb(${f(r)},${f(g)},${f(b)})`; };
// soft inner shading on a closed path: darker toward the lower-right, light rim upper-left
function softShade(c, cx, cy, r, amt = 0.16) {
  const g = c.createRadialGradient(cx - r * 0.35, cy - r * 0.45, r * 0.1, cx, cy, r * 1.25);
  g.addColorStop(0, 'rgba(255,255,255,0.10)'); g.addColorStop(0.55, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(40,20,20,${amt})`);
  c.save(); c.clip(); c.fillStyle = g; c.fillRect(cx - r * 2, cy - r * 2, r * 4, r * 4); c.restore();
}
// a limb: one thick stroke with a soft bend, ending in a small round hand/foot
function limb(c, x0, y0, x1, y1, bend = 0, w = 15, end = 0) {
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
  c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(mx - dy / L * bend, my + dx / L * bend, x1, y1); stroke(c, w);
  if (end > 0) { ell(c, x1, y1, end, end); c.fillStyle = INK; c.fill(); }
}

// ---------------- props drawn in the hand (canvas units, origin = hand) ----------------
const PROPS = {
  flag(c, p) { c.beginPath(); c.moveTo(0, 10); c.lineTo(0, -150); stroke(c, 8); const w = 6 * Math.sin(p.t * 9); c.beginPath(); c.moveTo(0, -150); c.quadraticCurveTo(40, -150 + w, 85, -140); c.lineTo(85, -90); c.quadraticCurveTo(40, -100 - w, 0, -95); c.closePath(); fillStroke(c, '#2f6fd6', 7); c.beginPath(); c.moveTo(25, -150); c.lineTo(25, -95); c.moveTo(0, -122); c.lineTo(85, -116); stroke(c, 12, '#f2c230'); },
  hammer(c) { c.beginPath(); c.moveTo(0, 30); c.lineTo(0, -80); stroke(c, 12, '#a0703c'); c.beginPath(); c.moveTo(0, 30); c.lineTo(0, -80); stroke(c, 3); rrect(c, -30, -100, 30, -72, 6); fillStroke(c, '#8a8f99', 7); },
  brush(c) { c.beginPath(); c.moveTo(0, 20); c.lineTo(10, -70); stroke(c, 9, '#c58a4a'); ell(c, 12, -82, 10, 16, 0.1); fillStroke(c, '#e8b830', 6); },
  scroll(c) { rrect(c, -55, -70, 55, 40, 10); fillStroke(c, '#f2e2b8', 8); for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-35, -45 + i * 22); c.lineTo(35, -45 + i * 22); stroke(c, 4, '#8a6a4a'); } },
  phone(c) { rrect(c, -22, -60, 22, 20, 8); fillStroke(c, '#202028', 7); rrect(c, -15, -52, 15, 10, 4); c.fillStyle = '#9fd8ff'; c.fill(); },
  flashcam(c, p) { rrect(c, -45, -35, 45, 25, 8); fillStroke(c, '#2a2a2e', 7); ell(c, 0, -5, 18, 18); fillStroke(c, '#556677', 5); c.beginPath(); c.moveTo(30, -35); c.lineTo(30, -95); stroke(c, 6); ell(c, 30, -105, 26, 20); fillStroke(c, p.flash ? '#ffffff' : '#c8c8c8', 6);
    if (p.flash) { c.save(); c.globalAlpha = p.flash; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; c.beginPath(); c.moveTo(30 + Math.cos(a) * 34, -105 + Math.sin(a) * 30); c.lineTo(30 + Math.cos(a) * 70, -105 + Math.sin(a) * 62); stroke(c, 8, '#fff7c0'); } c.restore(); } },
  book(c) { rrect(c, -50, -40, 50, 30, 6); fillStroke(c, '#7a2a20', 7); c.beginPath(); c.moveTo(0, -40); c.lineTo(0, 30); stroke(c, 5); },
  gavel(c) { c.beginPath(); c.moveTo(0, 20); c.lineTo(0, -70); stroke(c, 10, '#8a5a32'); c.beginPath(); c.moveTo(0, 20); c.lineTo(0, -70); stroke(c, 3); rrect(c, -35, -95, 35, -65, 10); fillStroke(c, '#6a3a1e', 7); },
  camera(c) { rrect(c, -50, -40, 50, 30, 10); fillStroke(c, '#3a3a40', 8); ell(c, 0, -5, 22, 22); fillStroke(c, '#6a7a8a', 6); rrect(c, -40, -55, -10, -40, 4); fillStroke(c, '#d0d0d0', 5); },
  hankie(c, p) { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(30 + 8 * Math.sin(p.t * 12), -20, 50, 10); c.quadraticCurveTo(25, 30, 0, 0); fillStroke(c, '#ffffff', 6); },
};

// ---------------- hats and hair ----------------
function hair(c, kind, col, hx, hy, rx, ry) {
  if (!kind) return;
  c.save();
  if (kind === 'cap') { c.beginPath(); c.ellipse(hx, hy - ry * 0.05, rx * 1.03, ry * 1.0, 0, Math.PI * 1.02, Math.PI * 1.98); c.quadraticCurveTo(hx + rx * 0.5, hy - ry * 0.25, hx - rx * 0.1, hy - ry * 0.45); c.quadraticCurveTo(hx - rx * 0.6, hy - ry * 0.3, hx - rx * 1.02, hy - ry * 0.02); fillStroke(c, col, 11);
    c.beginPath(); c.moveTo(hx + rx * 0.05, hy - ry * 0.98); c.quadraticCurveTo(hx + rx * 0.0, hy - ry * 0.8, hx + rx * 0.08, hy - ry * 0.62); stroke(c, 6); }
  if (kind === 'bun') { ell(c, hx, hy - ry * 1.05, rx * 0.32, ry * 0.26); fillStroke(c, col, 10); c.beginPath(); c.ellipse(hx, hy - ry * 0.1, rx * 1.03, ry * 0.98, 0, Math.PI * 1.05, Math.PI * 1.95); c.quadraticCurveTo(hx, hy - ry * 0.55, hx - rx * 1.0, hy - ry * 0.25); fillStroke(c, col, 11); }
  if (kind === 'curly') { for (let i = 0; i < 7; i++) { const a = Math.PI * (1.05 + i * 0.15); ell(c, hx + Math.cos(a) * rx * 0.92, hy + Math.sin(a) * ry * 0.92, rx * 0.3, ry * 0.28); fillStroke(c, col, 9); } }
  if (kind === 'wig') { for (let i = 0; i < 9; i++) { const a = Math.PI * (0.85 + i * 0.165); ell(c, hx + Math.cos(a) * rx * 1.0, hy + Math.sin(a) * ry * 0.95 + (i < 2 || i > 6 ? ry * 0.25 : 0), rx * 0.3, ry * 0.3); fillStroke(c, col, 9); } }
  if (kind === 'side') { for (const s of [-1, 1]) { ell(c, hx + s * rx * 0.9, hy - ry * 0.15, rx * 0.2, ry * 0.32); fillStroke(c, col, 9); } }
  c.restore();
}
function hat(c, kind, col, hx, hy, rx, ry, t) {
  if (!kind) return;
  const top = hy - ry;
  if (kind === 'tricorn') { c.beginPath(); c.moveTo(hx - rx * 1.15, top + ry * 0.38); c.quadraticCurveTo(hx - rx * 0.6, top - ry * 0.55, hx, top - ry * 0.22); c.quadraticCurveTo(hx + rx * 0.6, top - ry * 0.55, hx + rx * 1.15, top + ry * 0.38); c.quadraticCurveTo(hx, top + ry * 0.12, hx - rx * 1.15, top + ry * 0.38); fillStroke(c, col, 11);
    c.beginPath(); c.moveTo(hx - rx * 1.05, top + ry * 0.33); c.quadraticCurveTo(hx, top + ry * 0.06, hx + rx * 1.05, top + ry * 0.33); stroke(c, 9, '#e3b341'); }
  if (kind === 'bicorne') { c.beginPath(); c.moveTo(hx - rx * 1.35, top + ry * 0.3); c.quadraticCurveTo(hx, top - ry * 0.9, hx + rx * 1.35, top + ry * 0.3); c.quadraticCurveTo(hx, top + ry * 0.05, hx - rx * 1.35, top + ry * 0.3); fillStroke(c, col, 11);
    c.beginPath(); c.moveTo(hx - rx * 1.2, top + ry * 0.25); c.quadraticCurveTo(hx, top + ry * 0.0, hx + rx * 1.2, top + ry * 0.25); stroke(c, 8, '#e3b341'); ell(c, hx + rx * 0.35, top - ry * 0.12, 16, 16); fillStroke(c, '#c8312d', 6); }
  if (kind === 'crown') { c.beginPath(); const y0 = top + ry * 0.22, y1 = top - ry * 0.4; c.moveTo(hx - rx * 0.62, y0); for (let i = 0; i <= 4; i++) { const x = hx - rx * 0.62 + i * rx * 0.31; c.lineTo(x, i % 2 ? y1 + ry * 0.18 : y1); } c.lineTo(hx + rx * 0.62, y0); c.closePath(); fillStroke(c, '#f2c230', 10);
    for (let i = 0; i < 3; i++) { ell(c, hx - rx * 0.31 + i * rx * 0.31, y0 - ry * 0.12, 10, 10); fillStroke(c, ['#d8323a', '#2f6fd6', '#2fa860'][i], 4); } }
  if (kind === 'sailor') { c.beginPath(); c.ellipse(hx, top + ry * 0.22, rx * 0.78, ry * 0.3, 0, Math.PI, Math.PI * 2); c.closePath(); fillStroke(c, col, 10); rrect(c, hx - rx * 0.82, top + ry * 0.16, hx + rx * 0.82, top + ry * 0.32, 12); fillStroke(c, shade(col, 0.75), 9); }
  if (kind === 'beanie') { c.beginPath(); c.ellipse(hx, top + ry * 0.4, rx * 0.98, ry * 0.75, 0, Math.PI * 1.0, Math.PI * 2); c.closePath(); fillStroke(c, col, 11); rrect(c, hx - rx * 1.0, top + ry * 0.28, hx + rx * 1.0, top + ry * 0.48, 14); fillStroke(c, shade(col, 0.8), 9); ell(c, hx, top - ry * 0.38, 22, 22); fillStroke(c, shade(col, 1.15), 8); }
  if (kind === 'hardhat') { c.beginPath(); c.ellipse(hx, top + ry * 0.35, rx * 0.95, ry * 0.7, 0, Math.PI, Math.PI * 2); c.closePath(); fillStroke(c, col, 11); rrect(c, hx - rx * 1.12, top + ry * 0.28, hx + rx * 1.12, top + ry * 0.42, 10); fillStroke(c, col, 9); c.beginPath(); c.moveTo(hx, top - ry * 0.3); c.lineTo(hx, top + ry * 0.3); stroke(c, 7); }
  if (kind === 'trilby') { c.beginPath(); c.ellipse(hx, top + ry * 0.3, rx * 1.15, ry * 0.12, 0, 0, Math.PI * 2); fillStroke(c, col, 10); c.beginPath(); c.moveTo(hx - rx * 0.62, top + ry * 0.28); c.lineTo(hx - rx * 0.55, top - ry * 0.32); c.quadraticCurveTo(hx, top - ry * 0.12, hx + rx * 0.55, top - ry * 0.32); c.lineTo(hx + rx * 0.62, top + ry * 0.28); c.closePath(); fillStroke(c, col, 10); c.beginPath(); c.moveTo(hx - rx * 0.6, top + ry * 0.14); c.lineTo(hx + rx * 0.6, top + ry * 0.14); stroke(c, 16, '#2a2a2a'); }
  if (kind === 'cap') { c.beginPath(); c.ellipse(hx, top + ry * 0.38, rx * 0.95, ry * 0.68, 0, Math.PI, Math.PI * 2); c.closePath(); fillStroke(c, col, 10); c.beginPath(); c.moveTo(hx + rx * 0.2, top + ry * 0.36); c.quadraticCurveTo(hx + rx * 1.1, top + ry * 0.3, hx + rx * 1.3, top + ry * 0.48); c.lineTo(hx + rx * 0.3, top + ry * 0.5); c.closePath(); fillStroke(c, shade(col, 0.8), 9); }
  if (kind === 'bonnet') { c.beginPath(); c.ellipse(hx, hy - ry * 0.2, rx * 1.08, ry * 0.95, 0, Math.PI * 0.95, Math.PI * 2.05); c.closePath(); fillStroke(c, col, 11); c.beginPath(); c.moveTo(hx - rx * 0.6, hy + ry * 0.75); c.lineTo(hx - rx * 0.95, hy + ry * 0.2); stroke(c, 7, '#d04a6a'); }
}

// ---------------- the face ----------------
// p.face: {eyes: 'dot'|'lid'|'shut'|'wide'|'happy'|'glasses'|'shades', look:[x,y], brow: -1..1 (raised), browAng: + angry, mouth: 'line'|'smile'|'grin'|'open'|'o'|'frown'|'teeth'|'smirk', open: 0..1, tears, sweat, blush}
function face(c, f, hx, hy, rx, ry, t) {
  const lx = (f.look ? f.look[0] : 0) * rx * 0.22, ly = (f.look ? f.look[1] : 0) * ry * 0.14;
  const ex = rx * 0.34, ey = hy - ry * 0.05 + ly, ebR = rx * 0.085;
  const blink = f.blink ? 1 : 0; let eyes = blink ? 'shut' : (f.eyes || 'dot');
  for (const s of [-1, 1]) {
    const x = hx + lx + s * ex, y = ey;
    if (eyes === 'dot') { ell(c, x, y, ebR, ebR * 1.25); c.fillStyle = INK; c.fill(); ell(c, x + ebR * 0.3, y - ebR * 0.45, ebR * 0.28, ebR * 0.28); c.fillStyle = '#fff'; c.fill(); }
    if (eyes === 'lid') { c.save(); ell(c, x, y + ebR * 0.25, ebR * 1.05, ebR * 1.0); c.clip(); ell(c, x + s * 0, y + ebR * 0.55, ebR, ebR * 1.2); c.fillStyle = INK; c.fill(); c.restore(); c.beginPath(); c.moveTo(x - ebR * 1.6, y - ebR * 0.05); c.lineTo(x + ebR * 1.6, y - ebR * 0.05 + s * 0); stroke(c, 8); }
    if (eyes === 'shut') { c.beginPath(); c.moveTo(x - ebR * 1.4, y); c.quadraticCurveTo(x, y + ebR * 0.9, x + ebR * 1.4, y); stroke(c, 8); }
    if (eyes === 'happy') { c.beginPath(); c.moveTo(x - ebR * 1.5, y + ebR * 0.4); c.quadraticCurveTo(x, y - ebR * 1.3, x + ebR * 1.5, y + ebR * 0.4); stroke(c, 9); }
    if (eyes === 'wide') { ell(c, x, y, ebR * 2.0, ebR * 2.3); fillStroke(c, '#ffffff', 7); ell(c, x + lx * 0.3, y + ly * 0.3, ebR * 0.75, ebR * 0.9); c.fillStyle = INK; c.fill(); }
    if (eyes === 'glasses') { ell(c, x, y, ebR * 2.3, ebR * 2.3); fillStroke(c, 'rgba(255,255,255,0.5)', 7); ell(c, x, y, ebR * 0.7, ebR * 0.8); c.fillStyle = INK; c.fill(); }
  }
  if (eyes === 'glasses') { c.beginPath(); c.moveTo(hx + lx - ex + ebR * 2.3, ey); c.lineTo(hx + lx + ex - ebR * 2.3, ey); stroke(c, 6); }
  // brows: thick short strokes
  const br = f.brow || 0, ba = f.browAng || 0;
  for (const s of [-1, 1]) { const x = hx + lx + s * ex, y = ey - ry * 0.27 - br * ry * 0.08 + (eyes === 'wide' ? -ry * 0.07 : 0); const L = rx * 0.17; const dy = ba * L * 0.6;
    c.beginPath(); c.moveTo(x - L, y + (s < 0 ? -dy : dy) * -1 * -1 * (s > 0 ? 1 : -1) * 0 + (s < 0 ? -dy : dy)); c.lineTo(x + L, y + (s < 0 ? dy : -dy)); stroke(c, 13); }
  // mouth
  const mx = hx + lx * 1.15, my = hy + ry * 0.42 + ly, mw = rx * 0.17, o = clamp(f.open ?? 0.6, 0, 1); const m = f.mouth || 'line';
  if (m === 'line') { c.beginPath(); c.moveTo(mx - mw * 0.6, my); c.lineTo(mx + mw * 0.6, my); stroke(c, 8); }
  if (m === 'smile') { c.beginPath(); c.moveTo(mx - mw, my - mw * 0.15); c.quadraticCurveTo(mx, my + mw * 0.7, mx + mw, my - mw * 0.15); stroke(c, 8); }
  if (m === 'smirk') { c.beginPath(); c.moveTo(mx - mw * 0.7, my + mw * 0.05); c.quadraticCurveTo(mx + mw * 0.2, my + mw * 0.35, mx + mw * 0.9, my - mw * 0.3); stroke(c, 8); }
  if (m === 'frown') { c.beginPath(); c.moveTo(mx - mw * 0.8, my + mw * 0.3); c.quadraticCurveTo(mx, my - mw * 0.45, mx + mw * 0.8, my + mw * 0.3); stroke(c, 8); }
  if (m === 'o') { ell(c, mx, my, mw * 0.38 * (0.6 + o), mw * 0.5 * (0.6 + o)); fillStroke(c, '#5a1f24', 7); }
  if (m === 'open' || m === 'grin' || m === 'teeth') {
    const h = mw * (0.5 + 0.9 * o); c.beginPath(); c.moveTo(mx - mw * 1.1, my - h * 0.25); c.quadraticCurveTo(mx, my - h * 0.4, mx + mw * 1.1, my - h * 0.25); c.quadraticCurveTo(mx + mw * 0.9, my + h, mx, my + h); c.quadraticCurveTo(mx - mw * 0.9, my + h, mx - mw * 1.1, my - h * 0.25); c.closePath();
    c.fillStyle = '#5a1f24'; c.fill(); c.save(); c.clip();
    if (m !== 'open') { c.fillStyle = '#ffffff'; c.fillRect(mx - mw * 1.2, my - h * 0.5, mw * 2.4, h * 0.42); for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(mx + i * mw * 0.45, my - h * 0.4); c.lineTo(mx + i * mw * 0.45, my - h * 0.08); stroke(c, 4); } }
    ell(c, mx, my + h * 0.95, mw * 0.6, h * 0.4); c.fillStyle = '#e2606a'; c.fill(); c.restore();
    c.beginPath(); c.moveTo(mx - mw * 1.1, my - h * 0.25); c.quadraticCurveTo(mx, my - h * 0.4, mx + mw * 1.1, my - h * 0.25); c.quadraticCurveTo(mx + mw * 0.9, my + h, mx, my + h); c.quadraticCurveTo(mx - mw * 0.9, my + h, mx - mw * 1.1, my - h * 0.25); stroke(c, 8);
  }
  if (f.blush) for (const s of [-1, 1]) { ell(c, hx + lx + s * rx * 0.55, hy + ry * 0.25, rx * 0.13, ry * 0.07); c.fillStyle = `rgba(240,120,120,${0.45 * f.blush})`; c.fill(); }
  if (f.tears) for (const s of [-1, 1]) { const k = (t * 1.6 + (s > 0 ? 0.5 : 0)) % 1; const x = hx + lx + s * (ex + rx * 0.12), y = ey + ry * 0.1 + k * ry * 0.5;
    c.beginPath(); c.moveTo(x, y - 18); c.quadraticCurveTo(x + 13, y + 6, x, y + 12); c.quadraticCurveTo(x - 13, y + 6, x, y - 18); fillStroke(c, '#7cc8f2', 5); }
  if (f.sweat) { const x = hx + rx * 0.82, y = hy - ry * 0.35 + ((t * 0.7) % 1) * ry * 0.3; c.beginPath(); c.moveTo(x, y - 22); c.quadraticCurveTo(x + 15, y + 6, x, y + 13); c.quadraticCurveTo(x - 15, y + 6, x, y - 22); fillStroke(c, '#9ad8ff', 5); }
}

// ---------------- the person ----------------
// pose: {t, look:[x,y] (face turns), body: '#hex', bodyW, bodyH, head: [rx, ry], skin, hair, hairCol, hat, hatCol, collar,
//        armL/armR: [dx, dy] hand offset from shoulder (canvas units) + bend, prop: {hand:'R', kind}, walk (phase or null), run, lean, bob, sq,
//        face:{...}, sit}
export function drawPerson(c, p) {
  const t = p.t || 0, sq = p.sq || 1; c.save(); c.translate(0, 430); c.rotate(p.lean || 0); c.scale(1 / Math.sqrt(sq), sq); c.translate(0, -430);
  const bob = p.bob || 0; const bw = p.bodyW || 98, bh = p.bodyH || 345, body = p.body || '#e2782f';
  const hipY = 250, topY = hipY - bh + 30 + bob; const [hrx, hry] = p.head || [160, 148];
  const hx = (p.look ? p.look[0] : 0) * 10, hy = topY - hry * 0.72;
  // legs
  const legs = [-1, 1].map((s) => { let fx = s * 42, fy = 430; if (p.walk != null) { const ph = p.walk + (s > 0 ? Math.PI : 0); fx += Math.sin(ph) * (p.run ? 70 : 38); fy -= Math.max(0, Math.cos(ph)) * (p.run ? 40 : 18); }
    if (p.sit) { fx = s * 46; fy = hipY + 20; } if (p.legs) { fx += p.legs[s < 0 ? 0 : 1][0]; fy += p.legs[s < 0 ? 0 : 1][1]; } return [s * 38, hipY + bob - 10, fx, fy]; });
  for (const [x0, y0, x1, y1] of legs) { limb(c, x0, y0, x1, y1, 0, 11, 0); ell(c, x1 + (x1 > 0 ? 8 : -8), y1, 16, 8); c.fillStyle = INK; c.fill(); }
  if (p.sit) for (const [x0, y0, x1, y1] of legs) { limb(c, x1, y1, x1 + (x1 > 0 ? 6 : -6), y1 + 120, 0, 15, 0); ell(c, x1 + (x1 > 0 ? 14 : -14), y1 + 122, 20, 10); c.fillStyle = INK; c.fill(); }
  // far arm behind the body when it hangs back
  const sh = [-bw * 0.72, topY + 85 + bob], shR = [bw * 0.72, topY + 85 + bob];
  const aL = p.armL || [-40, 150, 12], aR = p.armR || [40, 150, -12];
  const handL = [sh[0] + aL[0], sh[1] + aL[1]], handR = [shR[0] + aR[0], shR[1] + aR[1]];
  // body: a tall bean
  const bean = () => { const y0 = topY, y1 = hipY + bob + 25, wt = bw * 0.86; c.beginPath(); c.moveTo(-wt, y0 + wt); c.quadraticCurveTo(-wt, y0, 0, y0); c.quadraticCurveTo(wt, y0, wt, y0 + wt);
    c.lineTo(bw, y1 - bw); c.quadraticCurveTo(bw, y1, 0, y1); c.quadraticCurveTo(-bw, y1, -bw, y1 - bw); c.closePath(); };
  bean(); fillStroke(c, body, 10); bean(); softShade(c, 0, (topY + hipY) / 2, bh * 0.6, 0.22);
  if (p.collar) { c.beginPath(); c.moveTo(-bw * 0.35, topY + 8); c.lineTo(0, topY + 70); c.lineTo(bw * 0.35, topY + 8); stroke(c, 8); }
  if (p.belt) { c.beginPath(); c.moveTo(-bw * 0.97, hipY - 40 + bob); c.lineTo(bw * 0.97, hipY - 40 + bob); stroke(c, 22, p.belt); c.beginPath(); c.moveTo(-bw * 0.97, hipY - 51 + bob); c.lineTo(bw * 0.97, hipY - 51 + bob); c.moveTo(-bw * 0.97, hipY - 29 + bob); c.lineTo(bw * 0.97, hipY - 29 + bob); stroke(c, 5); }
  if (p.stripes) { c.save(); bean(); c.clip(); for (let y = topY + 40; y < hipY + 20; y += 42) { c.beginPath(); c.moveTo(-bw, y); c.lineTo(bw, y); stroke(c, 14, p.stripes); } c.restore(); bean(); stroke(c, 10); }
  if (p.buttons) for (let i = 0; i < 3; i++) { ell(c, 0, topY + 70 + i * 45, 8, 8); fillStroke(c, p.buttons, 4); }
  if (p.sash) { c.beginPath(); c.moveTo(-bw * 0.8, topY + 30); c.lineTo(bw * 0.85, hipY - 30); stroke(c, 30, p.sash); }
  // arms over the body
  limb(c, sh[0], sh[1], handL[0], handL[1], aL[2] ?? 12, 11, 10); limb(c, shR[0], shR[1], handR[0], handR[1], aR[2] ?? -12, 11, 10);
  if (p.prop) { const h = p.prop.hand === 'L' ? handL : handR; c.save(); c.translate(h[0], h[1]); c.rotate(p.prop.rot || 0); PROPS[p.prop.kind](c, p); c.restore(); }
  // head
  ell(c, hx, hy, hrx, hry); fillStroke(c, p.skin || '#f6f2ea', 10.5); ell(c, hx, hy, hrx, hry); softShade(c, hx, hy, hrx, 0.12);
  hair(c, p.hair, p.hairCol || '#7a4a2a', hx, hy, hrx, hry);
  if (p.beard) { c.beginPath(); c.ellipse(hx, hy + hry * 0.35, hrx * 0.72, hry * 0.58, 0, 0.05 * Math.PI, 0.95 * Math.PI); c.quadraticCurveTo(hx, hy + hry * 0.5, hx + hrx * 0.71, hy + hry * 0.38); fillStroke(c, p.beard, 10); }
  if (p.moustache) { for (const s of [-1, 1]) { c.beginPath(); c.moveTo(hx, hy + hry * 0.3); c.quadraticCurveTo(hx + s * hrx * 0.25, hy + hry * 0.2, hx + s * hrx * 0.4, hy + hry * 0.38); stroke(c, 13, p.moustache); } }
  if (p.back) { if (p.hair) { ell(c, hx, hy - hry * 0.05, hrx * 0.98, hry * 0.95); fillStroke(c, p.hairCol || '#7a4a2a', 10); } }
  else face(c, p.face || {}, hx, hy, hrx, hry, t);
  hat(c, p.hat, p.hatCol || '#2a2a3a', hx, hy, hrx, hry, t);
  c.restore();
}

// a cartoon shipworm: a pale segmented worm with a big face; p.shiver, p.turn (0 = toward wood, 1 = fleeing)
export function drawWorm(c, p) {
  const t = p.t || 0, sh = (p.shiver || 0) * Math.sin(t * 60) * 6; c.save(); c.translate(sh, 0); if (p.turn > 0.5) c.scale(-1, 1);
  for (let i = 5; i >= 0; i--) { const x = -230 + i * 70, y = 40 * Math.sin(t * 6 - i * 0.8) * (p.wiggle ?? 1); ell(c, x, y, 70 - i * 2, 62 - i * 2); fillStroke(c, i === 5 ? '#f1d3c4' : '#e8bfae', 10); }
  const hx = 160, hy = 40 * Math.sin(t * 6 - 5 * 0.8) * (p.wiggle ?? 1) - 20; ell(c, hx, hy, 110, 100); fillStroke(c, '#f6dccf', 11); ell(c, hx, hy, 110, 100); softShade(c, hx, hy, 110, 0.15);
  for (const s of [-1, 1]) { ell(c, hx + 25 + s * 38, hy - 15, 10, 13); c.fillStyle = INK; c.fill(); }
  if (p.cold) { c.beginPath(); c.moveTo(hx, hy + 45); for (let k = 0; k < 6; k++) c.lineTo(hx + 12 + k * 10, hy + 45 + (k % 2 ? -8 : 8)); stroke(c, 7); for (const s of [-1, 1]) { c.beginPath(); c.moveTo(hx + 25 + s * 38 - 18, hy - 42 - s * 4); c.lineTo(hx + 25 + s * 38 + 18, hy - 42 + s * 4); stroke(c, 9); } }
  else { c.beginPath(); c.moveTo(hx + 5, hy + 40); c.quadraticCurveTo(hx + 30, hy + 62, hx + 55, hy + 38); stroke(c, 7); }
  if (p.cold) { c.save(); c.globalAlpha = 0.8; for (const k of [0, 1, 2]) { ell(c, hx - 150 + k * 40, hy - 150 - k * 25, 16, 16); c.fillStyle = '#d8f0ff'; c.fill(); } c.restore(); }
  c.restore();
}
