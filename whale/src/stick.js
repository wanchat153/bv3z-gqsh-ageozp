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
      // world points -> card canvas units (a ray from the camera through the point meets the card plane), so planted feet stay
      // planted and hands reach real objects in any view
      if (pose.feetW || pose.handLW || pose.handRW) { mesh.updateMatrixWorld(true); const n = new THREE.Vector3(0, 0, 1).applyQuaternion(mesh.quaternion), rt = new THREE.Vector3(1, 0, 0).applyQuaternion(mesh.quaternion);
        const k = 1024 / sizeM, M = mesh.position, Cp = camera.position;
        const toC = (P) => { const d = P.clone().sub(Cp); const tt = M.clone().sub(Cp).dot(n) / d.dot(n); const X = Cp.clone().addScaledVector(d, tt).sub(M); return [X.dot(rt) * k * (pose.flip ? -1 : 1), -X.y * k]; };
        if (pose.feetW) pose.feet = pose.feetW.map(toC);
        const shY = 250 - (pose.bodyH || 345) + 115 + (pose.bob || 0), bw = (pose.bodyW || 98) * 0.72 * (Math.abs(pose.turn || 0) === 2 ? 0.82 : 1);
        if (pose.handLW) { const c = toC(pose.handLW); pose.armL = [c[0] + bw, c[1] - shY, 12]; }
        if (pose.handRW) { const c = toC(pose.handRW); pose.armR = [c[0] - bw, c[1] - shY, -12]; } }
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
  bag(c) { c.beginPath(); c.moveTo(-50, -20); c.quadraticCurveTo(-70, 70, 0, 75); c.quadraticCurveTo(70, 70, 50, -20); c.quadraticCurveTo(0, -5, -50, -20); fillStroke(c, '#c9a46a', 8); c.beginPath(); c.moveTo(-30, -28); c.lineTo(-18, -55); c.lineTo(0, -35); c.lineTo(18, -55); c.lineTo(30, -28); fillStroke(c, '#c9a46a', 7); c.beginPath(); c.moveTo(-34, -24); c.lineTo(34, -24); stroke(c, 9, '#8a5a2a');
    c.beginPath(); c.arc(0, 28, 22, 0, 7); fillStroke(c, '#f2c230', 6); c.beginPath(); c.moveTo(-8, 18); c.lineTo(8, 18); c.moveTo(-8, 30); c.lineTo(6, 30); stroke(c, 4); },
  tapper(c) { c.beginPath(); c.moveTo(0, 15); c.lineTo(0, -60); stroke(c, 8, '#8a5a32'); c.beginPath(); c.moveTo(0, 15); c.lineTo(0, -60); stroke(c, 2); c.beginPath(); c.ellipse(0, -66, 20, 9, 0, 0, 7); fillStroke(c, '#b0b8c0', 5); },
  stamp(c) { rrect(c, -18, -60, 18, -20, 8); fillStroke(c, '#7a3a2a', 6); rrect(c, -30, -22, 30, 0, 4); fillStroke(c, '#3a3a3a', 6); },
  knife(c) { c.beginPath(); c.moveTo(0, 20); c.lineTo(0, -10); stroke(c, 12, '#5a3a24'); c.beginPath(); c.moveTo(-12, -10); c.lineTo(12, -10); c.lineTo(4, -60); c.lineTo(-4, -60); c.closePath(); fillStroke(c, '#d8dde2', 5); },
  wedge(c) { c.beginPath(); c.moveTo(-40, 10); c.lineTo(40, 10); c.lineTo(0, -60); c.closePath(); fillStroke(c, '#f2cf6a', 7); c.beginPath(); c.moveTo(-40, 10); c.lineTo(40, 10); stroke(c, 14, '#d9a640'); for (const [x, y] of [[-8, -10], [10, -25], [0, -2]]) { ell(c, x, y, 5, 4); c.fillStyle = '#e8b84a'; c.fill(); } },
  torch(c, p) { rrect(c, -14, -40, 14, 30, 6); fillStroke(c, '#2a2a30', 6); ell(c, 0, -46, 20, 10); fillStroke(c, '#ffffc0', 6); },
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
  if (kind === 'slick') { c.beginPath(); c.ellipse(hx, hy - ry * 0.1, rx * 1.02, ry * 0.95, 0, Math.PI * 1.02, Math.PI * 1.98); c.quadraticCurveTo(hx + rx * 0.2, hy - ry * 0.62, hx - rx * 1.0, hy - ry * 0.2); fillStroke(c, col, 10); for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(hx - rx * 0.6 + k * rx * 0.35, hy - ry * 0.9); c.quadraticCurveTo(hx - rx * 0.3 + k * rx * 0.35, hy - ry * 0.75, hx - rx * 0.1 + k * rx * 0.4, hy - ry * 0.55); stroke(c, 4, 'rgba(255,255,255,0.5)'); } }
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
  if (kind === 'chef') { c.beginPath(); c.moveTo(hx - rx * 0.62, top + ry * 0.32); c.lineTo(hx - rx * 0.66, top - ry * 0.25); c.bezierCurveTo(hx - rx * 1.0, top - ry * 0.75, hx - rx * 0.3, top - ry * 1.05, hx, top - ry * 0.72); c.bezierCurveTo(hx + rx * 0.3, top - ry * 1.05, hx + rx * 1.0, top - ry * 0.75, hx + rx * 0.66, top - ry * 0.25); c.lineTo(hx + rx * 0.62, top + ry * 0.32); c.closePath(); fillStroke(c, '#fbfaf5', 10);
    c.beginPath(); c.moveTo(hx - rx * 0.62, top + ry * 0.12); c.lineTo(hx + rx * 0.62, top + ry * 0.12); stroke(c, 6); }
  if (kind === 'police') { c.beginPath(); c.ellipse(hx, top + ry * 0.3, rx * 0.95, ry * 0.42, 0, Math.PI, Math.PI * 2); c.closePath(); fillStroke(c, col, 10); rrect(c, hx - rx * 0.98, top + ry * 0.22, hx + rx * 0.98, top + ry * 0.4, 10); fillStroke(c, '#1a1a1a', 8); c.beginPath(); c.moveTo(hx - rx * 0.8, top + ry * 0.42); c.quadraticCurveTo(hx, top + ry * 0.62, hx + rx * 0.8, top + ry * 0.42); fillStroke(c, '#1a1a1a', 8); ell(c, hx, top + ry * 0.05, 18, 18); fillStroke(c, '#e3b341', 6); }
  if (kind === 'bonnet') { c.beginPath(); c.ellipse(hx, hy - ry * 0.2, rx * 1.08, ry * 0.95, 0, Math.PI * 0.95, Math.PI * 2.05); c.closePath(); fillStroke(c, col, 11); c.beginPath(); c.moveTo(hx - rx * 0.6, hy + ry * 0.75); c.lineTo(hx - rx * 0.95, hy + ry * 0.2); stroke(c, 7, '#d04a6a'); }
}

// ---------------- the face ----------------
// p.face: {eyes: 'dot'|'lid'|'shut'|'wide'|'happy'|'glasses'|'shades', look:[x,y], brow: -1..1 (raised), browAng: + angry, mouth: 'line'|'smile'|'grin'|'open'|'o'|'frown'|'teeth'|'smirk', open: 0..1, tears, sweat, blush}
function face(c, f, hx, hy, rx, ry, t) {
  const tn = f.turn || 0, ts = Math.sign(tn), ta = Math.abs(tn);
  const lx = (f.look ? f.look[0] : 0) * rx * 0.22 * (ta ? 0.3 : 1) + ts * rx * (ta === 1 ? 0.36 : ta === 2 ? 0.58 : 0), ly = (f.look ? f.look[1] : 0) * ry * 0.14;
  const ex = rx * 0.34, ey = hy - ry * 0.05 + ly, ebR = rx * 0.085;
  const blink = f.blink ? 1 : 0; let eyes = blink ? 'shut' : (f.eyes || 'dot');
  for (const s of [-1, 1]) {
    if (ta === 2 && s !== ts) continue;                       // profile: only the near eye
    const x = hx + lx + s * ex * (ta === 1 ? 0.78 : ta === 2 ? 0.55 : 1), y = ey;
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
  for (const s of [-1, 1]) { if (ta === 2 && s !== ts) continue; const x = hx + lx + s * ex * (ta === 1 ? 0.78 : ta === 2 ? 0.55 : 1), y = ey - ry * 0.27 - br * ry * 0.08 + (eyes === 'wide' ? -ry * 0.07 : 0); const L = rx * 0.17; const dy = ba * L * 0.6;
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
  const turn = p.back ? 4 : (p.turn || 0), tsg = Math.sign(turn) || 1, tab = Math.abs(turn), front = tab < 3, backV = tab >= 3;
  const t = p.t || 0, sq = p.sq || 1; c.save(); c.translate(0, 430); c.rotate(p.lean || 0); c.scale(1 / Math.sqrt(sq), sq); c.translate(0, -430);
  const bob = p.bob || 0; const bw = (p.bodyW || 98) * (Math.abs(p.back ? 4 : (p.turn || 0)) === 2 ? 0.82 : 1), bh = p.bodyH || 345, body = p.body || '#e2782f';
  const hipY = 250, topY = hipY - bh + 30 + bob; const [hrx, hry] = p.head || [160, 148];
  const hx = (p.look ? p.look[0] : 0) * 10, hy = topY - hry * 0.72;
  // legs
  // legs: hips narrow in profile; feet come from the gait (world-planted, projected onto the card) or stand still
  const hipX = tab === 2 ? 10 : tab === 1 || tab === 3 ? 26 : 38;
  const legs = [-1, 1].map((s) => { let fx = s * 42, fy = 430; if (p.feet) { const F = p.feet[0][0] <= p.feet[1][0] ? p.feet : [p.feet[1], p.feet[0]]; fx = F[s < 0 ? 0 : 1][0]; fy = F[s < 0 ? 0 : 1][1]; }
    else if (p.walk != null) { const ph = p.walk + (s > 0 ? Math.PI : 0); fx += Math.sin(ph) * (p.run ? 70 : 38); fy -= Math.max(0, Math.cos(ph)) * (p.run ? 40 : 18); }
    if (p.sit) { fx = s * 46; fy = hipY + 20; } if (p.legs) { fx += p.legs[s < 0 ? 0 : 1][0]; fy += p.legs[s < 0 ? 0 : 1][1]; } return [s * hipX, hipY + bob - 10, fx, fy, s]; });
  // the far leg first; shoes point the way the body faces (sideways in profile, small ovals front/back)
  legs.sort((a, b) => (tab === 2 ? (a[4] === tsg ? 1 : -1) : a[3] - b[3]));
  for (const [x0, y0, x1, y1, s] of legs) { const knee = tab === 2 ? -tsg * 14 : 0; limb(c, x0, y0, x1, y1, knee, 11, 0); const toe = tab === 2 || tab === 1 || tab === 3 ? tsg * 14 : (x1 > 0 ? 8 : -8);
    ell(c, x1 + toe, y1, tab === 0 || tab === 4 ? 16 : 20, 8); c.fillStyle = INK; c.fill(); }
  if (p.sit) for (const [x0, y0, x1, y1] of legs) { limb(c, x1, y1, x1 + (x1 > 0 ? 6 : -6), y1 + 120, 0, 15, 0); ell(c, x1 + (x1 > 0 ? 14 : -14), y1 + 122, 20, 10); c.fillStyle = INK; c.fill(); }
  // far arm behind the body when it hangs back
  const sh = [-bw * 0.72, topY + 85 + bob], shR = [bw * 0.72, topY + 85 + bob];
  const aL = p.armL || [-40, 150, 12], aR = p.armR || [40, 150, -12];
  const handL = [sh[0] + aL[0], sh[1] + aL[1]], handR = [shR[0] + aR[0], shR[1] + aR[1]];
  // body: a tall bean
  const bean = () => { const y0 = topY, y1 = hipY + bob + 25, wt = bw * 0.86; c.beginPath(); c.moveTo(-wt, y0 + wt); c.quadraticCurveTo(-wt, y0, 0, y0); c.quadraticCurveTo(wt, y0, wt, y0 + wt);
    c.lineTo(bw, y1 - bw); c.quadraticCurveTo(bw, y1, 0, y1); c.quadraticCurveTo(-bw, y1, -bw, y1 - bw); c.closePath(); };
  bean(); fillStroke(c, body, 10); bean(); softShade(c, 0, (topY + hipY) / 2, bh * 0.6, 0.22);
  if (p.collar && front) { c.beginPath(); c.moveTo(-bw * 0.35, topY + 8); c.lineTo(0, topY + 70); c.lineTo(bw * 0.35, topY + 8); stroke(c, 8); }
  if (p.belt) { c.beginPath(); c.moveTo(-bw * 0.97, hipY - 40 + bob); c.lineTo(bw * 0.97, hipY - 40 + bob); stroke(c, 22, p.belt); c.beginPath(); c.moveTo(-bw * 0.97, hipY - 51 + bob); c.lineTo(bw * 0.97, hipY - 51 + bob); c.moveTo(-bw * 0.97, hipY - 29 + bob); c.lineTo(bw * 0.97, hipY - 29 + bob); stroke(c, 5); }
  if (p.stripes) { c.save(); bean(); c.clip(); for (let y = topY + 40; y < hipY + 20; y += 42) { c.beginPath(); c.moveTo(-bw, y); c.lineTo(bw, y); stroke(c, 14, p.stripes); } c.restore(); bean(); stroke(c, 10); }
  if (p.apron && front) { c.save(); bean(); c.clip(); rrect(c, -bw * 0.62, topY + 70 + bob, bw * 0.62, hipY + bob + 40, 26); fillStroke(c, p.apron, 8); c.beginPath(); c.moveTo(-bw * 0.62, topY + 70 + bob); c.lineTo(-bw * 0.35, topY + 8 + bob); c.moveTo(bw * 0.62, topY + 70 + bob); c.lineTo(bw * 0.35, topY + 8 + bob); stroke(c, 8); c.restore(); bean(); stroke(c, 10); }
  if (p.vest) { c.save(); bean(); c.clip(); c.fillStyle = p.vest; c.fillRect(-bw * 1.1, topY - 10, bw * 2.2, (hipY - topY) * 0.78); c.beginPath(); c.moveTo(-bw * 1.1, topY + (hipY - topY) * 0.42); c.lineTo(bw * 1.1, topY + (hipY - topY) * 0.42); stroke(c, 16, '#f4f0e0'); c.restore(); bean(); stroke(c, 10); }
  if (p.scarf) { c.beginPath(); c.moveTo(-bw * 0.8, topY + 18); c.quadraticCurveTo(0, topY + 46, bw * 0.8, topY + 18); stroke(c, 26, p.scarf); if (front) { c.beginPath(); c.moveTo(bw * 0.3, topY + 34); c.lineTo(bw * 0.42, topY + 120); stroke(c, 22, p.scarf); } }
  if (p.tie && front) { c.beginPath(); c.moveTo(0, topY + 10); c.lineTo(-16, topY + 40); c.lineTo(0, topY + 150); c.lineTo(16, topY + 40); c.closePath(); fillStroke(c, p.tie, 6); }
  if (p.buttons && front) for (let i = 0; i < 3; i++) { ell(c, 0, topY + 70 + i * 45, 8, 8); fillStroke(c, p.buttons, 4); }
  if (p.sash && front) { c.beginPath(); c.moveTo(-bw * 0.8, topY + 30); c.lineTo(bw * 0.85, hipY - 30); stroke(c, 30, p.sash); }
  // arms over the body
  limb(c, sh[0], sh[1], handL[0], handL[1], aL[2] ?? 12, 11, 10); limb(c, shR[0], shR[1], handR[0], handR[1], aR[2] ?? -12, 11, 10);
  if (p.prop) { const h = p.prop.hand === 'L' ? handL : handR; c.save(); c.translate(h[0], h[1]); c.rotate(p.prop.rot || 0); PROPS[p.prop.kind](c, p); c.restore(); }
  // head
  ell(c, hx, hy, hrx, hry); fillStroke(c, p.skin || '#f6f2ea', 10.5); ell(c, hx, hy, hrx, hry); softShade(c, hx, hy, hrx, 0.12);
  if (tab === 3) { if (p.hair) { c.save(); ell(c, hx, hy, hrx, hry); c.clip(); c.beginPath(); c.ellipse(hx - tsg * hrx * 0.28, hy - hry * 0.08, hrx * 1.0, hry * 1.02, 0, 0, Math.PI * 2); c.fillStyle = p.hairCol || '#7a4a2a'; c.fill(); c.restore(); ell(c, hx, hy, hrx, hry); stroke(c, 10.5); }
    c.beginPath(); c.moveTo(hx + tsg * hrx * 0.86, hy - hry * 0.1); c.quadraticCurveTo(hx + tsg * hrx * 0.98, hy + hry * 0.2, hx + tsg * hrx * 0.8, hy + hry * 0.5); stroke(c, 6, 'rgba(42,29,29,0.5)'); }
  else if (tab === 1 || tab === 2) { c.save(); ell(c, hx, hy, hrx, hry); c.clip(); c.translate(-tsg * hrx * (tab === 1 ? 0.14 : 0.3), 0); hair(c, p.hair, p.hairCol || '#7a4a2a', hx, hy, hrx, hry); c.restore();
    if (p.hair && tab === 2) { c.save(); ell(c, hx, hy, hrx, hry); c.clip(); c.beginPath(); c.ellipse(hx - tsg * hrx * 0.55, hy - hry * 0.1, hrx * 0.7, hry * 1.05, 0, 0, Math.PI * 2); c.fillStyle = p.hairCol || '#7a4a2a'; c.fill(); c.restore(); }
    ell(c, hx, hy, hrx, hry); stroke(c, 10.5); }
  else if (tab !== 3) hair(c, p.hair, p.hairCol || '#7a4a2a', hx, hy, hrx, hry);
  if (p.beard && !backV) { c.beginPath(); c.ellipse(hx, hy + hry * 0.35, hrx * 0.72, hry * 0.58, 0, 0.05 * Math.PI, 0.95 * Math.PI); c.quadraticCurveTo(hx, hy + hry * 0.5, hx + hrx * 0.71, hy + hry * 0.38); fillStroke(c, p.beard, 10); }
  if (p.moustache && !backV) { if (tab) { c.save(); c.translate(tsg * hrx * (tab === 1 ? 0.36 : 0.58), 0); c.scale(tab === 2 ? 0.55 : 0.8, 1); } for (const s of [-1, 1]) { c.beginPath(); c.moveTo(hx, hy + hry * 0.3); c.quadraticCurveTo(hx + s * hrx * 0.25, hy + hry * 0.2, hx + s * hrx * 0.4, hy + hry * 0.38); stroke(c, 13, p.moustache); } if (tab) c.restore(); }
  if (tab === 4) { if (p.hair) { ell(c, hx, hy - hry * 0.05, hrx * 0.98, hry * 0.95); fillStroke(c, p.hairCol || '#7a4a2a', 10); } }
  else if (tab !== 3) face(c, { ...(p.face || {}), turn }, hx, hy, hrx, hry, t);
  if (p.mask && !backV) { const lx = (p.face && p.face.look ? p.face.look[0] : 0) * hrx * 0.22; c.beginPath(); c.moveTo(hx - hrx * 0.98, hy - hry * 0.2); c.quadraticCurveTo(hx + lx, hy - hry * 0.38, hx + hrx * 0.98, hy - hry * 0.2); c.lineTo(hx + hrx * 0.9, hy + hry * 0.12); c.quadraticCurveTo(hx + lx, hy - hry * 0.02, hx - hrx * 0.9, hy + hry * 0.12); c.closePath(); fillStroke(c, '#16161c', 8);
    for (const s of [-1, 1]) { ell(c, hx + lx + s * hrx * 0.34, hy - hry * 0.05, hrx * 0.13, hry * 0.1); c.fillStyle = '#ffffff'; c.fill(); ell(c, hx + lx * 1.3 + s * hrx * 0.34, hy - hry * 0.05, hrx * 0.05, hry * 0.06); c.fillStyle = INK; c.fill(); } }
  { const sh = tab === 1 || tab === 2 ? -tsg * hrx * 0.06 * tab : tab === 3 ? -tsg * hrx * 0.08 : 0; c.save(); c.translate(sh, 0); if (tab === 2 && p.hat === 'cap') { c.translate(hx, 0); c.scale(tsg, 1); c.translate(-hx, 0); } hat(c, p.hat, p.hatCol || '#2a2a3a', hx, hy, hrx, hry, t); c.restore(); }
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

// a side-view cow, nose to the right; p.eat (0..1 head down), p.happy, p.chew
export function drawCow(c, p) {
  const t = p.t || 0, dn = p.eat || 0; c.translate(-40, 126);
  for (const [x, ph] of [[-170, 0], [-120, 1], [110, 2], [160, 3]]) { c.beginPath(); c.moveTo(x, 110); c.lineTo(x + (p.walk != null ? Math.sin(p.walk + ph * 1.6) * 20 : 0), 300); stroke(c, 26); ell(c, x + 4, 304, 18, 10); c.fillStyle = '#3a2a24'; c.fill(); }
  ell(c, -10, 60, 230, 120); fillStroke(c, '#fbfaf3', 11); ell(c, -10, 60, 230, 120); softShade(c, -10, 60, 200, 0.12);
  for (const [x, y, rx, ry] of [[-120, 20, 60, 45], [40, 90, 70, 40], [120, 10, 40, 35]]) { c.save(); ell(c, -10, 60, 226, 116); c.clip(); ell(c, x, y, rx, ry, 0.3); c.fillStyle = '#2b2522'; c.fill(); c.restore(); }
  c.beginPath(); c.moveTo(-235, 30); c.quadraticCurveTo(-290, 80, -270, 170); stroke(c, 10); ell(c, -268, 180, 14, 22); c.fillStyle = INK; c.fill();
  c.save(); c.translate(200, 0); c.rotate(0.9 * dn); c.translate(-200, 0);
  ell(c, 260, -10 + 40 * dn, 95, 85); fillStroke(c, '#fbfaf3', 11); ell(c, 300, 40 + 40 * dn, 70, 48); fillStroke(c, '#f2b8b0', 10);
  for (const s of [-1, 1]) { ell(c, 330 + s * 22, 40 + 40 * dn, 7, 9); c.fillStyle = INK; c.fill(); }
  ell(c, 240, -40 + 40 * dn, 12, 15); c.fillStyle = INK; c.fill(); if (p.happy) { c.beginPath(); c.moveTo(220, -60 + 40 * dn); c.quadraticCurveTo(240, -75 + 40 * dn, 262, -60 + 40 * dn); stroke(c, 6); }
  for (const s of [-1, 1]) { ell(c, 200 + s * 10, -85 + 40 * dn, 34, 16, s * 0.6); fillStroke(c, '#fbfaf3', 8); }
  c.beginPath(); c.moveTo(220, -95 + 40 * dn); c.quadraticCurveTo(205, -140 + 40 * dn, 225, -150 + 40 * dn); stroke(c, 12, '#e8dcc0'); c.beginPath(); c.moveTo(220, -95 + 40 * dn); c.quadraticCurveTo(205, -140 + 40 * dn, 225, -150 + 40 * dn); stroke(c, 3);
  if (p.chew) { c.beginPath(); c.moveTo(285, 75 + 40 * dn); c.quadraticCurveTo(305, 80 + 40 * dn + 6 * Math.sin(t * 14), 325, 72 + 40 * dn); stroke(c, 6); }
  c.restore();
}

// A turn is a snap through separate drawings (back -> 3/4 -> profile -> 3/4 -> front), each held >= 2 frames at 30 fps,
// never a rotating card. turnAt(l, t0, from, to, hold) returns the drawing index at local time l.
export function turnAt(l, t0, from, to, hold = 2 / 30) {
  if (l < t0) return from; const path = []; const step = from === 3 ? (to <= 0 ? -1 : 1) : Math.sign(to - from);
  let k = from; if (from === 3) { path.push(to < 0 ? -2 : to > 0 ? 2 : (to === 0 ? 2 : 2)); k = path[0]; }
  else if (to === 3) { while (Math.abs(k) < 2) { k += Math.sign(k || 1); path.push(k); } path.push(3); return path[Math.min(path.length - 1, Math.floor((l - t0) / hold))] ?? to; }
  while (k !== to) { k += Math.sign(to - k); path.push(k); }
  return path[Math.min(path.length - 1, Math.floor((l - t0) / hold))] ?? to;
}

// a gull: side view, beak to the right. p.fly (0 standing, 1 flying), p.flap (wing phase), p.walk (phase), p.peck 0..1, p.shout
export function drawGull(c, p) {
  const t = p.t || 0, fl = p.fly || 0; c.translate(0, 270);
  // legs (pink-orange), long enough to stand on; webbed feet
  if (fl < 0.5) for (const s of [-1, 1]) { const ph = p.walk != null ? Math.sin(p.walk + (s > 0 ? Math.PI : 0)) * 24 : 0; const x0 = s * 16 - 10; c.beginPath(); c.moveTo(x0, 50); c.lineTo(x0 + ph, 158); stroke(c, 8, '#e89a6a');
    c.beginPath(); c.moveTo(x0 + ph - 10, 160); c.lineTo(x0 + ph + 30, 160); stroke(c, 9, '#e89a6a'); }
  const pk = p.peck || 0; c.save(); c.translate(0, 0); c.rotate(-0.2 * fl);
  // tail feathers, white with a black wing tip over them
  c.beginPath(); c.moveTo(-110, 10); c.lineTo(-190, 32); c.lineTo(-175, -4); c.closePath(); fillStroke(c, '#f6f6f2', 8);
  // body: a plump oval tilted chest-up
  ell(c, -10, 0, 125, 72, -0.18); fillStroke(c, '#fbfbf8', 10); ell(c, -10, 0, 125, 72, -0.18); softShade(c, -10, 0, 110, 0.14);
  if (fl < 0.5) { c.beginPath(); c.moveTo(-95, -32); c.quadraticCurveTo(10, -78, 70, -40); c.quadraticCurveTo(30, 22, -165, 16); c.closePath(); fillStroke(c, '#a2acb8', 8);
    c.beginPath(); c.moveTo(-165, 16); c.lineTo(-120, 6); c.lineTo(-118, 22); c.closePath(); c.fillStyle = '#26262c'; c.fill(); for (const x of [-140, -126]) { ell(c, x, 14, 4, 4); c.fillStyle = '#ffffff'; c.fill(); } }
  else { const a = Math.sin(p.flap ?? t * 18); c.beginPath(); c.moveTo(-60, -30); c.quadraticCurveTo(-10, -30 - 170 * a, 60 + 40 * Math.abs(a), -50 - 250 * a); c.quadraticCurveTo(40, -30 - 80 * a, 60, -30); c.closePath(); fillStroke(c, '#a2acb8', 8); }
  // head on a short neck, bowing to peck
  c.save(); c.translate(70, -40); c.rotate(0.9 * pk); c.translate(-70, 40);
  c.beginPath(); c.moveTo(55, -50); c.quadraticCurveTo(80, -90, 95, -100); stroke(c, 40, '#fbfbf8'); c.beginPath(); c.moveTo(55, -50); c.quadraticCurveTo(80, -90, 95, -100); stroke(c, 0.01);
  ell(c, 105, -112, 50, 46); fillStroke(c, '#fbfbf8', 10); ell(c, 120, -122, 8, 9); c.fillStyle = INK; c.fill(); ell(c, 122, -125, 3, 3); c.fillStyle = '#fff'; c.fill();
  c.beginPath(); c.moveTo(150, -112); c.lineTo(212, -104 - (p.shout ? 8 : 0)); c.quadraticCurveTo(206, -96, 190, -96); c.lineTo(150, -96); c.closePath(); fillStroke(c, '#f2c230', 6);
  if (p.shout) { c.beginPath(); c.moveTo(150, -96); c.lineTo(200, -78); c.lineTo(150, -90); c.closePath(); fillStroke(c, '#f2c230', 5); }
  ell(c, 196, -98, 6, 5); c.fillStyle = '#d0402a'; c.fill();
  c.restore(); c.restore();
}
// the eight views a character can show, in ring order: 0 front, 1/2/3 to the right (3/4, profile, back 3/4), 4 back, -3/-2/-1 on the left
export const RING = [0, 1, 2, 3, 4, -3, -2, -1];
