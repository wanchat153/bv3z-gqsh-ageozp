// Thai captions that pop in word by word, as if spoken (there is no voice). Kanit ExtraBold, white with a thick ink
// outline and soft shadow; the newest word is yellow and lands with a small spring (0.6 -> 1.12 -> 1.0, 0.2 s).
// Lines break only between words. The block sits in the band 60-70 % down the frame (checked against faces).
import * as THREE from './three.module.js';

export async function loadFonts(base = './fonts/') {
  for (const f of ['kanit-thai-800-normal.woff2', 'kanit-latin-800-normal.woff2']) {
    const buf = await (await fetch(base + f)).arrayBuffer(); const ff = new FontFace('Kanit', buf, { weight: '800' }); await ff.load(); document.fonts.add(ff);
  }
  await document.fonts.ready;
}
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
// word timing: the first word 0.15 s into the shot, then each word after the previous by its length (Thai reading pace)
export function wordTimes(words, t0) { const out = []; let t = t0 + 0.15; for (const w of words) { out.push(t); t += clamp(0.1 + 0.035 * [...w].length, 0.16, 0.38); } return out; }
const spring = (u) => u <= 0 ? 0 : u >= 1 ? 1 : u < 0.45 ? 0.6 + (1.12 - 0.6) * (u / 0.45) : 1.12 - 0.12 * ((u - 0.45) / 0.55);

export function makeCaptions(W, H) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.premultiplyAlpha = false; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
  const size = Math.round(W * 0.082), lineH = size * 1.32, maxW = W * 0.86, gap = size * 0.16;
  let lastKey = '';
  function draw(words, times, t, yFrac = 0.64, fadeOut = 1) {
    const shown = words.filter((_, i) => t >= times[i]); const key = `${words.join('')}|${shown.length}|${Math.round(t * 30)}|${yFrac}|${fadeOut.toFixed(2)}`;
    if (key === lastKey) return tex; lastKey = key;
    x.clearRect(0, 0, W, H); if (!shown.length || fadeOut <= 0) { tex.needsUpdate = true; return tex; }
    x.font = `800 ${size}px Kanit`; x.textBaseline = 'alphabetic'; x.lineJoin = 'round';
    // lay out ALL words (so lines don't jump as words arrive), then draw the shown ones
    const ws = words.map((w) => x.measureText(w).width); const lines = [[]]; let lw = 0;
    words.forEach((w, i) => { const add = (lines[lines.length - 1].length ? gap : 0) + ws[i]; if (lw + add > maxW && lines[lines.length - 1].length) { lines.push([]); lw = 0; } lines[lines.length - 1].push(i); lw += (lines[lines.length - 1].length > 1 ? gap : 0) + ws[i]; });
    const y0 = H * yFrac - (lines.length - 1) * lineH / 2 + size * 0.35;
    x.globalAlpha = fadeOut;
    lines.forEach((ln, li) => { const tw = ln.reduce((a, i, k) => a + ws[i] + (k ? gap : 0), 0); let cx = (W - tw) / 2; const cy = y0 + li * lineH;
      for (const i of ln) { const w = ws[i]; if (t >= times[i]) { const u = (t - times[i]) / 0.2; const sc = spring(u); const newest = i === shown.length - 1 && t - times[i] < 0.55;
          x.save(); x.translate(cx + w / 2, cy - size * 0.35); x.scale(sc, sc); x.translate(-(cx + w / 2), -(cy - size * 0.35));
          x.shadowColor = 'rgba(0,0,0,0.45)'; x.shadowBlur = size * 0.18; x.shadowOffsetY = size * 0.06; x.lineWidth = size * 0.2; x.strokeStyle = '#1e1414'; x.strokeText(words[i], cx, cy);
          x.shadowColor = 'transparent'; x.fillStyle = newest ? '#ffd23a' : '#ffffff'; x.fillText(words[i], cx, cy); x.restore(); }
        cx += w + gap; } });
    x.globalAlpha = 1; tex.needsUpdate = true; return tex;
  }
  // screen box of the caption block (for the framing check: it must not cover a face)
  function box(words, yFrac = 0.64) { x.font = `800 ${size}px Kanit`; const ws = words.map((w) => x.measureText(w).width); let lines = 1, lw = 0, widest = 0;
    words.forEach((w, i) => { const add = (lw ? gap : 0) + ws[i]; if (lw + add > maxW && lw) { widest = Math.max(widest, lw); lines++; lw = ws[i]; } else lw += add; }); widest = Math.max(widest, lw);
    const h = lines * lineH; return [(W - widest) / 2, H * yFrac - h / 2, (W + widest) / 2, H * yFrac + h / 2]; }
  return { draw, box, tex };
}
