import * as THREE from 'three'
import { Assets, layer, samurai, mochi, mulBlend } from './inkkit'
const W = 1920, H = 1080
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(W, H); r.setPixelRatio(1); r.autoClear = false; document.body.appendChild(r.domElement)
const A = await new Assets().load()
const scene = new THREE.Scene(); scene.background = A.tex['paper_paper']
const cam = new THREE.PerspectiveCamera(28, W / H, 0.1, 100); cam.position.set(0, 1.5, 12); cam.lookAt(0, 0.95, 0)
// ground: perspective plane, ink wash + strokes, multiplied onto paper
const gc = document.createElement('canvas'); gc.width = 1024; gc.height = 1024; const g = gc.getContext('2d')!
g.fillStyle = '#fff'; g.fillRect(0, 0, 1024, 1024)
const grad = g.createLinearGradient(0, 0, 0, 1024); grad.addColorStop(0, 'rgba(120,120,128,0.10)'); grad.addColorStop(1, 'rgba(120,120,128,0.30)'); g.fillStyle = grad; g.fillRect(0, 0, 1024, 1024)
for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(40,44,52,${0.07 + 0.12 * ((i * 37) % 10) / 10})`; g.lineWidth = 3 + (i % 4); const y = (i * 97) % 1024, x = (i * 211) % 1024; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 140 + (i % 7) * 60, y + (i % 3) * 4); g.stroke() }
const gt = new THREE.CanvasTexture(gc); gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(2, 4); gt.colorSpace = THREE.SRGBColorSpace
const ground = new THREE.Mesh(new THREE.PlaneGeometry(50, 60), (() => { const m = new THREE.MeshBasicMaterial({ map: gt, transparent: true, depthWrite: false }); mulBlend(m); return m })()); ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -20); ground.renderOrder = -50; scene.add(ground)
// backdrop: hills (far), tora lantern, tree - ink layers multiplied onto the paper, bottoms standing on the ground line
const kb = 0.0105
const hills = layer(A, 'hills', 960, 900, kb * 1.0, { mul: true, order: -40 }); hills.g.position.set(0, 0, -30); hills.g.scale.setScalar(4.5); scene.add(hills.g)
const toro = layer(A, 'toro', 250, 900, 0.0042 * 1.6, { mul: true, order: -20 }); toro.g.position.set(-6.2, 0, -3); scene.add(toro.g)
const tree = layer(A, 'tree', 1640, 900, 0.0042 * 1.6, { mul: true, order: -20 }); tree.g.position.set(6.6, 0, -4); scene.add(tree.g)
// contact shadows
const shadow = (x: number, z: number, rx: number) => { const s = new THREE.Mesh(new THREE.CircleGeometry(rx, 32), new THREE.MeshBasicMaterial({ color: '#161312', transparent: true, opacity: 0.22, depthWrite: false })); s.rotation.x = -Math.PI / 2; s.scale.y = 0.4; s.position.set(x, 0.01, z); s.renderOrder = -10; scene.add(s) }
const SW = 0.5   // samurai S in world units
const sam = samurai(A, SW, 10); sam.root.position.set(-0.7, 1.58 * SW, 0); scene.add(sam.root); shadow(-0.7, 0, SW * 0.95)
// umbrella: grip pinned to the samurai's right hand
const handR: [number, number] = [1.05, 0.7]
sam.pose({ handR, eyes: 'up' })
const um = layer(A, 'umbrella', 960, 860, SW / 300 * 2.6, { order: 6 }); scene.add(um.g)
um.g.position.set(-0.7 + handR[0] * SW, 1.58 * SW + handR[1] * SW, 0.05)
const cat = mochi(A, SW, 12); cat.root.position.set(1.15, 0, 0.2); cat.show('cat_sit_tail2'); scene.add(cat.root); shadow(1.1, 0.2, 0.45)
// paper treatment on top, like the kit's final composite
const ov = new THREE.Scene(), oc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
const quad = (t: THREE.Texture, blending: THREE.Blending, op: number) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: op, blending, depthTest: false })); ov.add(m) }
quad(A.tex['paper_vig'], THREE.NormalBlending, 1)
r.clear(); r.render(scene, cam); r.render(ov, oc)
;(window as any).READY = true
