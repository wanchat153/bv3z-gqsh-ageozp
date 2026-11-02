// 2D overlay effects drawn over the picture (under the captions): manga speed lines, impact flash, vignette pulse.
// Reference (STUDY-jar §3): white tapered speed lines rush in from the frame edges toward the face on a shocked word,
// re-randomised every frame, for ~0.3 s, while the camera pushes in.
import * as THREE from './three.module.js';
import { mulberry } from './toon.js';

export function makeOverlay(W, H) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  let dirty = false;
  return { tex, g, W, H,
    clear() { if (dirty) { g.clearRect(0, 0, W, H); tex.needsUpdate = true; dirty = false; } },
    draw(fn) { g.clearRect(0, 0, W, H); fn(g, W, H); tex.needsUpdate = true; dirty = true; } };
}

// speed lines toward (cx, cy) in 0..1 screen coords (y down); amt 0..1 fades them; frame = integer frame index (new lines each frame)
export function speedLines(g, W, H, { cx = 0.5, cy = 0.4, n = 72, amt = 1, frame = 0, inner = 0.3, col = '255,255,255' } = {}) {
  const r = mulberry(frame * 7919 + 13); const X = cx * W, Y = cy * H, R = Math.hypot(W, H) * 0.75;
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, len = R * (0.25 + r() * 0.45), r0 = R * (inner + r() * 0.25), w = (3 + r() * 9) * W / 1080;
    const x0 = X + Math.cos(a) * (r0 + len), y0 = Y + Math.sin(a) * (r0 + len), x1 = X + Math.cos(a) * r0, y1 = Y + Math.sin(a) * r0;
    const nx = -Math.sin(a) * w, ny = Math.cos(a) * w;
    g.beginPath(); g.moveTo(x0 + nx, y0 + ny); g.lineTo(x0 - nx, y0 - ny); g.lineTo(x1, y1); g.closePath();
    g.fillStyle = `rgba(${col},${(0.55 + r() * 0.45) * amt})`; g.fill();
  }
}
export function flash(g, W, H, amt, col = '255,244,220') { g.fillStyle = `rgba(${col},${amt})`; g.fillRect(0, 0, W, H); }
