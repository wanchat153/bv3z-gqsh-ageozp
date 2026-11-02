// Word-by-word captions measured from the reference (720x1280 → scaled to any size):
// white, very bold rounded sans, black outline, soft drop shadow, centred, baseline at ~70.5% of the height,
// cap size ≈ 3.6% of the frame height, 1 word per cue (2–3 short words merged), hard on/off (no pop), never a gap.
// cues = [{ t0, t1, text }] in film seconds (made by tools/word_cues.py).
import * as THREE from './three.module.js';

export const CAPTION = { y: 0.705, size: 0.0365, stroke: 0.17, shadow: 0.05, maxW: 0.86, font: 'Kanit, Montserrat, sans-serif', weight: 800 };

export function makeCaptions(W, H, cues, style = {}) {
  const S = { ...CAPTION, ...style };
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.premultiplyAlpha = false;
  let last = null;
  const at = (t) => { for (const c of cues) if (t >= c.t0 && t < c.t1) return c; return null; };
  return {
    tex,
    draw(t, on = true) {
      const c = on ? at(t) : null; const key = c ? c.text + c.t0 : '';
      if (key === last) return; last = key;
      g.clearRect(0, 0, W, H); if (c) {
        let size = Math.round(S.size * H); g.font = `${S.weight} ${size}px ${S.font}`;
        const w = g.measureText(c.text).width; if (w > S.maxW * W) { size = Math.floor(size * S.maxW * W / w); g.font = `${S.weight} ${size}px ${S.font}`; }
        g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.lineJoin = 'round'; g.miterLimit = 2;
        const x = W / 2, y = S.y * H + size * 0.36;
        g.save(); g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = size * 0.12; g.shadowOffsetY = size * S.shadow;
        g.lineWidth = size * S.stroke * 2; g.strokeStyle = '#000'; g.strokeText(c.text, x, y); g.restore();
        g.lineWidth = size * S.stroke * 2; g.strokeStyle = '#000'; g.strokeText(c.text, x, y);
        g.fillStyle = '#fff'; g.fillText(c.text, x, y);
      }
      tex.needsUpdate = true;
    },
  };
}
