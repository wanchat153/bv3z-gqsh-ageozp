import * as THREE from 'three'
import { samurai, mochi, umbrella, strokeGeo, polyGeo, flat } from './native'
const W = 1920, H = 1080
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(W, H); r.setPixelRatio(1); document.body.appendChild(r.domElement)
// ---- procedural paper (three.js CanvasTexture)
function paper() {
  const c = document.createElement('canvas'); c.width = 1920; c.height = 1080; const g = c.getContext('2d')!
  g.fillStyle = '#e9e1cd'; g.fillRect(0, 0, 1920, 1080)
  const id = g.getImageData(0, 0, 1920, 1080), d = id.data
  for (let i = 0; i < d.length; i += 4) { const n = (Math.sin(i * 0.0013) * 0.5 + Math.random() - 0.5) * 7; d[i] += n; d[i + 1] += n; d[i + 2] += n * 1.1 }
  g.putImageData(id, 0, 0)
  for (let i = 0; i < 260; i++) { g.strokeStyle = `rgba(110,95,70,${0.03 + Math.random() * 0.05})`; g.lineWidth = 0.6 + Math.random(); g.beginPath(); const x = Math.random() * 1920, y = Math.random() * 1080; g.moveTo(x, y); g.bezierCurveTo(x + 30, y + 10 * Math.random(), x + 60, y - 20, x + 40 + Math.random() * 60, y + 25); g.stroke() }
  const vg = g.createRadialGradient(960, 540, 300, 960, 540, 1250); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(70,55,30,0.22)'); g.fillStyle = vg; g.fillRect(0, 0, 1920, 1080)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}
const scene = new THREE.Scene(); scene.background = paper()
const cam = new THREE.PerspectiveCamera(28, W / H, 0.1, 100); cam.position.set(0, 1.3, 7.5); cam.lookAt(0, 0.9, 0)
// ---- ink-wash backdrop built from three.js shapes: far hills (grey wash), ground band, brush strokes
const wash = (pts: [number, number][], z: number, col: string, op: number, order: number) => {
  const m = new THREE.Mesh(polyGeo(pts.map(p => new THREE.Vector2(p[0], p[1]))), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false })); m.position.z = z; m.renderOrder = order; scene.add(m) }
const ridge = (seed: number, base: number, amp: number, x0: number, x1: number) => { const p: [number, number][] = [[x0, 0]]; for (let x = x0; x <= x1; x += 1) p.push([x, base + amp * (Math.sin(x * 0.35 + seed) * 0.5 + Math.sin(x * 0.9 + seed * 2) * 0.25 + 0.6)]); p.push([x1, 0]); return p }
wash(ridge(1, 1.3, 1.6, -40, 40), -30, '#8b8f94', 0.28, -40); wash(ridge(4, 0.7, 1.1, -34, 34), -22, '#6f757c', 0.34, -39); wash(ridge(8, 0.2, 0.7, -26, 26), -14, '#4f565d', 0.42, -38)
const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 80), new THREE.MeshBasicMaterial({ color: '#cfc3a6', transparent: true, opacity: 0.55, depthWrite: false })); ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -30); ground.renderOrder = -45; scene.add(ground)
for (let i = 0; i < 46; i++) { const z = -8 + (i % 9) * 0.9 - 4, x = ((i * 7919) % 100) / 100 * 16 - 8, len = 1 + ((i * 31) % 7) * 0.5
  const m = new THREE.Mesh(strokeGeo([new THREE.Vector2(0, 0), new THREE.Vector2(len, 0.02)], (u) => 0.05 + 0.03 * Math.sin(Math.PI * u)), new THREE.MeshBasicMaterial({ color: '#4a4e55', transparent: true, opacity: 0.08 + 0.1 * ((i * 13) % 5) / 5, depthWrite: false }))
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0.005, z); m.renderOrder = -30; scene.add(m) }
const shadow = (x: number, z: number, rx: number) => { const s = new THREE.Mesh(new THREE.CircleGeometry(rx, 32), new THREE.MeshBasicMaterial({ color: '#161312', transparent: true, opacity: 0.22, depthWrite: false })); s.rotation.x = -Math.PI / 2; s.scale.y = 0.4; s.position.set(x, 0.01, z); s.renderOrder = -10; scene.add(s) }
// ---- cast
const SW = 0.5
const sam = samurai(SW, 100); sam.root.position.set(-0.6, 1.47 * SW, 0); scene.add(sam.root); shadow(-0.6, 0, SW * 0.95)
const handR: [number, number] = [1.05, 0.7]
sam.pose({ handR, eyes: { state: 'open', look: [0.4, 0.7] }, t: 0.4, wind: 0.5 })
const um = umbrella(SW, 150); um.root.position.set(-0.6 + handR[0] * SW, 1.47 * SW + handR[1] * SW, 0.05); scene.add(um.root)
const cat = mochi(SW * 1.3, 200); cat.root.position.set(0.62, 0, 0.2); cat.root.scale.x = -1; cat.pose({ tail: 0.6, look: [0, 0.6] }); scene.add(cat.root); shadow(0.45, 0.2, 0.42)
r.render(scene, cam)
;(window as any).READY = true
