import * as THREE from 'three'
const W = 1920, H = 1080
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(W, H); r.setPixelRatio(1); document.body.appendChild(r.domElement)
const scene = new THREE.Scene(); scene.background = new THREE.Color('#E4DCCB'); scene.fog = new THREE.Fog('#E4DCCB', 14, 40)
const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 100); cam.position.set(0, 1.45, 11); cam.lookAt(0, 1.0, 0)
const meta = await (await fetch('/ink/meta.json')).json()
const loader = new THREE.TextureLoader()
const TX: Record<string, THREE.Texture> = {}
for (const n of Object.keys(meta)) { const t = await loader.loadAsync(`/ink/${n}.png`); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; TX[n] = t }
const tex = (n: string) => TX[n]
const PX = 1 / 300
function sprite(name: string, ax: number, ay: number, k: number, x: number, z: number, y = 0, tilt = 0) {
  const m = meta[name], w = m.w * PX * k, h = m.h * PX * k
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex(name), transparent: true, alphaTest: 0.02, depthWrite: false }))
  mesh.position.set(x + ((m.x + m.w / 2) - ax) * PX * k, y - ((m.y + m.h / 2) - ay) * PX * k, z); mesh.rotation.z = tilt; mesh.renderOrder = Math.round(z * 100) + (name === "sam_eyes" ? 3 : 0); scene.add(mesh); return mesh
}
// ground plane with painted paper + brush lines
const gc = document.createElement('canvas'); gc.width = 1024; gc.height = 1024; const g = gc.getContext('2d')!
g.fillStyle = '#D9D0BC'; g.fillRect(0, 0, 1024, 1024)
for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(60,64,72,${0.06 + 0.1 * ((i * 37) % 10) / 10})`; g.lineWidth = 2 + (i % 4); const y = (i * 97) % 1024, x = (i * 211) % 1024; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 120 + (i % 7) * 50, y + (i % 3) * 3); g.stroke() }
const gt = new THREE.CanvasTexture(gc); gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(3, 3); gt.colorSpace = THREE.SRGBColorSpace
const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ map: gt })); ground.rotation.x = -Math.PI / 2; scene.add(ground)
// puddles (flat, slightly glossy blue-grey) on the ground
for (const [x, z, rx] of [[-3, 2.5, 1.5], [2.6, 3.5, 1.9], [4.2, -1, 1.2]]) { const p = new THREE.Mesh(new THREE.CircleGeometry(rx, 40), new THREE.MeshBasicMaterial({ color: '#9FB0BA', transparent: true, opacity: 0.7 })); p.rotation.x = -Math.PI / 2; p.scale.y = 0.5; p.position.set(x, 0.005, z); p.renderOrder = -150; scene.add(p) }
// hills as flat planes at depth
for (const [z, h, c, o] of [[-14, 3.2, '#8C98A3', 0.55], [-9, 1.9, '#7B8792', 0.7]] as const) { const sh = new THREE.Shape(); sh.moveTo(-30, 0); for (let x = -30; x <= 30; x += 1.5) sh.lineTo(x, h * (0.55 + 0.45 * Math.sin(x * 0.31 + z) * Math.cos(x * 0.13))); sh.lineTo(30, 0); const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o })); m.position.set(0, 0, z); m.renderOrder = -200; scene.add(m) }
// characters (flat painted parts), feet on the ground
const SS = 0.62   // samurai scale
const sx = -0.6, sz = 0
const ax = 600, ay = 520 + 1.58 * 300
sprite('sam_legs', ax, ay, SS, sx, sz); sprite('sam_body', ax, ay, SS, sx, sz + 0.01); sprite('sam_arms', ax, ay, SS, sx, sz + 0.02); sprite('sam_over', ax, ay, SS, sx, sz + 0.03); sprite('sam_eyes', ax, ay, SS, sx, sz + 0.04)
sprite('cat_sit_all', 560, 1050, 0.62, 1.9, 0.2)
sprite('umbrella', 700, 760, SS * 1.5, sx + 0.9, sz - 0.05, 1.0)
// shadows
for (const [x, z, rx] of [[sx, 0, 0.55], [1.75, 0.2, 0.5]]) { const s = new THREE.Mesh(new THREE.CircleGeometry(rx, 32), new THREE.MeshBasicMaterial({ color: '#161312', transparent: true, opacity: 0.22 })); s.rotation.x = -Math.PI / 2; s.scale.y = 0.35; s.position.set(x, 0.01, z); s.renderOrder = -100; scene.add(s) }
// extra depth: a second pair of characters far back (parallax / scale check)
sprite('cat_stand_all', 560, 1050, 0.3, -5.2, -5)
r.render(scene, cam); (window as any).READY = true
