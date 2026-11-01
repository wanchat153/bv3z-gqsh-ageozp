// Procedural canvas textures for toy-diorama sets: every surface gets a hand-painted pattern + speckle so nothing reads as
// flat CG. All are seeded (same picture every frame/run) and tile with RepeatWrapping. Use with mat(tex, rx, ry).
import * as THREE from './three.module.js';
import { mulberry } from './toon.js';

const cache = new Map();
function make(key, size, paint) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); paint(g, size, mulberry(hash(key)));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  cache.set(key, t); return t;
}
function hash(s) { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }
export const shade = (hex, k) => { const c = new THREE.Color(hex); c.offsetHSL(0, 0, k); return '#' + c.getHexString(); };
function speckle(g, S, r, n, cols, a, sz) { g.globalAlpha = a; for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; const s = sz * (0.5 + r()); g.fillRect(r() * S, r() * S, s, s); } g.globalAlpha = 1; }

// a textured toon material: repeat (rx, ry) times across the face
export function mat(tex, rx = 1, ry = rx, opts = {}) { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry);
  return new THREE.MeshToonMaterial({ map: t, gradientMap: GRAD, ...opts }); }
const GRAD = (() => { const d = new Uint8Array([90, 90, 90, 255, 165, 165, 165, 255, 228, 228, 228, 255, 255, 255, 255, 255]); const t = new THREE.DataTexture(d, 4, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();

export const TEX = {
  grass: (col = '#7cc04f') => make('grass' + col, 512, (g, S, r) => { g.fillStyle = col; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 900; i++) { const x = r() * S, y = r() * S, h = 6 + r() * 10; g.strokeStyle = r() < 0.5 ? shade(col, -0.08) : shade(col, 0.07); g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y - h); g.stroke(); }
    speckle(g, S, r, 400, [shade(col, -0.15), shade(col, 0.12), '#f4e27a'], 0.35, 3); }),
  planks: (col = '#b9784c', n = 6) => make('planks' + col + n, 512, (g, S, r) => { const w = S / n;
    for (let i = 0; i < n; i++) { g.fillStyle = shade(col, (r() - 0.5) * 0.06); g.fillRect(i * w, 0, w, S);
      g.strokeStyle = shade(col, -0.12); g.lineWidth = 1.5; for (let k = 0; k < 7; k++) { const x0 = i * w + 6 + r() * (w - 12); g.beginPath(); for (let y = 0; y <= S; y += 16) g.lineTo(x0 + Math.sin(y * 0.03 + k) * 3, y); g.stroke(); }
      const ey = r() * S; g.fillStyle = shade(col, -0.25); g.fillRect(i * w, ey, w, 3); if (r() < 0.5) { g.beginPath(); g.ellipse(i * w + w / 2, r() * S, 5, 9, 0, 0, 7); g.fill(); } }
    g.fillStyle = shade(col, -0.3); for (let i = 0; i <= n; i++) g.fillRect(i * w - 1.5, 0, 3, S); speckle(g, S, r, 300, ['#000', '#fff'], 0.05, 2); }),
  pavers: (col = '#e8dcc5') => make('pavers' + col, 512, (g, S, r) => { g.fillStyle = col; g.fillRect(0, 0, S, S); const n = 4, w = S / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = shade(col, (r() - 0.5) * 0.05); g.fillRect(i * w + 3, j * w + 3, w - 6, w - 6); }
    g.strokeStyle = shade(col, -0.18); g.lineWidth = 3; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * w, 0); g.lineTo(i * w, S); g.moveTo(0, i * w); g.lineTo(S, i * w); g.stroke(); }
    speckle(g, S, r, 700, [shade(col, -0.2), shade(col, 0.08)], 0.25, 2.5); }),
  asphalt: (col = '#454b55') => make('asphalt' + col, 512, (g, S, r) => { g.fillStyle = col; g.fillRect(0, 0, S, S); speckle(g, S, r, 2500, [shade(col, -0.08), shade(col, 0.1), '#8a8f98'], 0.5, 2); }),
  mulch: (col = '#7a3c22') => make('mulch' + col, 512, (g, S, r) => { g.fillStyle = shade(col, -0.1); g.fillRect(0, 0, S, S);
    for (let i = 0; i < 1600; i++) { g.save(); g.translate(r() * S, r() * S); g.rotate(r() * 6.3); g.fillStyle = [col, shade(col, 0.08), shade(col, -0.15), '#9a5a32'][i % 4]; g.fillRect(-6, -2, 10 + r() * 8, 3 + r() * 3); g.restore(); } }),
  grating: (col = '#3b414c') => make('grating' + col, 256, (g, S) => { g.fillStyle = shade(col, -0.12); g.fillRect(0, 0, S, S); const n = 16, w = S / n;
    g.fillStyle = col; for (let i = 0; i < n; i++) { g.fillRect(i * w, 0, w * 0.32, S); } g.fillStyle = shade(col, 0.14); for (let i = 0; i < n; i++) g.fillRect(i * w, 0, w * 0.08, S);
    g.fillStyle = shade(col, -0.05); for (let j = 0; j < 4; j++) g.fillRect(0, j * S / 4, S, 4); }),
  plaster: (col = '#f3e6cf') => make('plaster' + col, 512, (g, S, r) => { g.fillStyle = col; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 60; i++) { g.fillStyle = shade(col, (r() - 0.5) * 0.04); g.globalAlpha = 0.4; g.beginPath(); g.ellipse(r() * S, r() * S, 20 + r() * 60, 10 + r() * 40, r() * 3, 0, 7); g.fill(); }
    g.globalAlpha = 1; speckle(g, S, r, 500, [shade(col, -0.1), '#fff'], 0.18, 2); }),
  paper: (col = '#fbf8f0', lines = true) => make('paper' + col + lines, 512, (g, S, r) => { g.fillStyle = col; g.fillRect(0, 0, S, S); speckle(g, S, r, 400, ['#d9d2c3'], 0.3, 1.5);
    if (lines) { g.strokeStyle = 'rgba(80,110,170,0.35)'; g.lineWidth = 2; for (let y = 40; y < S; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); } } }),
  blueprint: () => make('blueprint', 512, (g, S) => { g.fillStyle = '#163e73'; g.fillRect(0, 0, S, S); g.strokeStyle = 'rgba(190,215,255,0.18)'; g.lineWidth = 1;
    for (let i = 0; i <= S; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, S); g.moveTo(0, i); g.lineTo(S, i); g.stroke(); }
    g.strokeStyle = 'rgba(190,215,255,0.32)'; g.lineWidth = 2; for (let i = 0; i <= S; i += 128) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, S); g.moveTo(0, i); g.lineTo(S, i); g.stroke(); } }),
  carpet: (col = '#c9b48a') => make('carpet' + col, 512, (g, S, r) => { g.fillStyle = col; g.fillRect(0, 0, S, S); speckle(g, S, r, 4000, [shade(col, -0.07), shade(col, 0.06)], 0.5, 2); }),
  metal: (col = '#f28c28') => make('metal' + col, 256, (g, S, r) => { g.fillStyle = col; g.fillRect(0, 0, S, S); speckle(g, S, r, 300, [shade(col, -0.08), shade(col, 0.08)], 0.35, 2);
    g.fillStyle = shade(col, 0.12); g.fillRect(0, 0, S, S * 0.08); }),
  stripes: (a = '#f4c430', b = '#1b1420') => make('stripes' + a + b, 256, (g, S) => { g.fillStyle = a; g.fillRect(0, 0, S, S); g.fillStyle = b;
    for (let i = -S; i < S * 2; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 32, 0); g.lineTo(i + 32 - S, S); g.lineTo(i - S, S); g.fill(); } }),
  net: () => make('net', 256, (g, S) => { g.clearRect(0, 0, S, S); g.strokeStyle = '#1d1a20'; g.lineWidth = 7; const n = 4, w = S / n;
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * w, 0); g.lineTo(i * w, S); g.moveTo(0, i * w); g.lineTo(S, i * w); g.stroke(); }
    g.strokeStyle = '#6b5f66'; g.lineWidth = 2; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * w - 1, 0); g.lineTo(i * w - 1, S); g.stroke(); } }),
  // ---- dense detail (STUDY-jar §4–5: detail density is what reads as 'sharp') ----
  tufted: (col = '#b8312c', stud = '#e8b84a') => make('tufted' + col + stud, 512, (g, S, r) => { g.fillStyle = col; g.fillRect(0, 0, S, S); const n = 6, w = S / n;
    for (let i = -1; i <= n; i++) for (let j = -1; j <= n; j++) { const x = i * w + (j % 2 ? w / 2 : 0), y = j * w * 0.9;
      const gr = g.createRadialGradient(x + w * 0.35, y + w * 0.3, 2, x + w / 2, y + w * 0.45, w * 0.62); gr.addColorStop(0, shade(col, 0.16)); gr.addColorStop(0.7, col); gr.addColorStop(1, shade(col, -0.22));
      g.fillStyle = gr; g.beginPath(); g.moveTo(x + w / 2, y - w * 0.05); g.lineTo(x + w * 1.02, y + w * 0.45); g.lineTo(x + w / 2, y + w * 0.95); g.lineTo(x - w * 0.02, y + w * 0.45); g.closePath(); g.fill();
      g.strokeStyle = shade(col, -0.3); g.lineWidth = 2; g.stroke(); }
    for (let i = -1; i <= n; i++) for (let j = -1; j <= n + 1; j++) { const x = i * w + (j % 2 ? w / 2 : 0) + w / 2, y = j * w * 0.9 - w * 0.05;
      g.fillStyle = shade(stud, -0.3); g.beginPath(); g.arc(x, y + 1.5, 6, 0, 7); g.fill(); g.fillStyle = stud; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); g.fillStyle = '#fff6d0'; g.beginPath(); g.arc(x - 1.5, y - 1.5, 1.8, 0, 7); g.fill(); } }),
  stone: (col = '#b9b2c4') => make('stone' + col, 512, (g, S, r) => { g.fillStyle = shade(col, -0.25); g.fillRect(0, 0, S, S); const rows = 8, h = S / rows;
    for (let j = 0; j < rows; j++) { let x = (j % 2) * -h * 0.8; while (x < S) { const w = h * (1.3 + r() * 0.9);
      const c0 = shade(col, (r() - 0.5) * 0.12); const gr = g.createLinearGradient(0, j * h, 0, j * h + h); gr.addColorStop(0, shade(c0, 0.08)); gr.addColorStop(1, shade(c0, -0.06));
      g.fillStyle = gr; g.beginPath(); g.roundRect(x + 3, j * h + 3, w - 6, h - 6, 5); g.fill();
      g.globalAlpha = 0.3; for (let k = 0; k < 6; k++) { g.fillStyle = r() < 0.5 ? shade(c0, -0.18) : shade(c0, 0.12); g.fillRect(x + 6 + r() * (w - 14), j * h + 6 + r() * (h - 12), 3, 2); } g.globalAlpha = 1;
      if (r() < 0.25) { g.strokeStyle = shade(c0, -0.3); g.lineWidth = 1.5; g.beginPath(); const cx = x + r() * w; g.moveTo(cx, j * h + 6); g.lineTo(cx + 6, j * h + h * 0.5); g.lineTo(cx - 2, j * h + h - 6); g.stroke(); }
      x += w; } } }),
  scales: (col = '#9aa3b5') => make('scales' + col, 256, (g, S) => { g.fillStyle = shade(col, -0.35); g.fillRect(0, 0, S, S); const w = S / 8, h = w * 0.8;
    for (let j = -1; j < 11; j++) for (let i = -1; i < 9; i++) { const x = i * w + (j % 2 ? w / 2 : 0), y = j * h;
      const gr = g.createLinearGradient(x, y, x, y + w); gr.addColorStop(0, shade(col, 0.2)); gr.addColorStop(1, shade(col, -0.15)); g.fillStyle = gr;
      g.beginPath(); g.roundRect(x + 2, y, w - 4, w * 0.95, [3, 3, w * 0.45, w * 0.45]); g.fill(); g.strokeStyle = shade(col, -0.45); g.lineWidth = 2; g.stroke();
      g.fillStyle = '#d8b04a'; g.beginPath(); g.arc(x + w / 2, y + 5, 2.2, 0, 7); g.fill(); } }),
  damask: (col = '#a8262a', fg = '#d9a63c') => make('damask' + col + fg, 512, (g, S) => { g.fillStyle = col; g.fillRect(0, 0, S, S); const n = 4, w = S / n; g.fillStyle = fg; g.globalAlpha = 0.75;
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) { const x = i * w + (j % 2 ? w / 2 : 0), y = j * w; g.save(); g.translate(x, y);
      for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) { g.save(); g.rotate(a); g.beginPath(); g.ellipse(0, -w * 0.16, w * 0.06, w * 0.14, 0, 0, 7); g.fill(); g.restore(); }
      g.beginPath(); g.arc(0, 0, w * 0.05, 0, 7); g.fill(); g.restore(); } g.globalAlpha = 1; }),
  rugBorder: (col = '#1f3a7a', trim = '#c23b2e') => make('rugBorder' + col + trim, 512, (g, S) => { g.fillStyle = col; g.fillRect(0, 0, S, S); g.fillStyle = trim; g.fillRect(0, 0, S * 0.12, S); g.fillRect(S * 0.88, 0, S * 0.12, S);
    g.fillStyle = '#e8c45a'; g.fillRect(S * 0.12, 0, S * 0.025, S); g.fillRect(S * 0.855, 0, S * 0.025, S);
    g.fillStyle = trim; for (let y = 0; y < S; y += S / 4) { g.beginPath(); g.moveTo(S / 2, y + S * 0.04); g.lineTo(S * 0.62, y + S / 8); g.lineTo(S / 2, y + S * 0.21); g.lineTo(S * 0.38, y + S / 8); g.closePath(); g.fill(); } }),
};
