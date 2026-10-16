import * as THREE from 'three'
import { inflate } from './inflate'
const W = 1920, H = 1080
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(W, H); r.setPixelRatio(1); document.body.appendChild(r.domElement)
const scene = new THREE.Scene(); scene.background = new THREE.Color('#F1E9D8')
const cam = new THREE.OrthographicCamera(-4.8, 4.8, 2.7, -2.7, 0.1, 50); cam.position.set(0, 1.4, 10); cam.lookAt(0, 1.4, 0)
scene.add(new THREE.HemisphereLight(0xffffff, 0xb9a98a, 1.9)); const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(-3, 6, 7); scene.add(key)
const meta = await (await fetch('/ink/meta.json')).json()
const PX = 1 / 300
async function part(name: string, ax: number, ay: number, k: number, depth: number, z: number, parent: THREE.Object3D) {
  const m = meta[name], p = await inflate(`/ink/${name}.png`, m.w * PX * k, depth * k)
  p.group.position.set(((m.x + m.w / 2) - ax) * PX * k, -((m.y + m.h / 2) - ay) * PX * k, z * k); parent.add(p.group); return p
}
async function samurai(x: number, ry: number) {
  const g = new THREE.Group(); g.position.set(x, 0, 0); g.rotation.y = ry; scene.add(g)
  const ax = 600, ay = 520 + 1.58 * 300   // feet line
  await part('sam_body', ax, ay, 1, 0.30, 0, g); await part('sam_legs', ax, ay, 1, 0.12, 0.02, g); await part('sam_arms', ax, ay, 1, 0.10, 0.22, g)
  await part('sam_over', ax, ay, 1, 0.04, 0.27, g); await part('sam_eyes', ax, ay, 1, 0.05, 0.3, g); return g
}
async function cat(name: string, x: number, ry: number) {
  const g = new THREE.Group(); g.position.set(x, 0, 0); g.rotation.y = ry; scene.add(g)
  await part(name, 560, 1050, 1.2, 0.32, 0, g); return g
}
const s = 0.0 // unused
await samurai(-3.6, 0.0); await samurai(-1.4, 0.4); await cat('cat_stand_all', 0.9, -0.0); await cat('cat_stand_all', 2.6, -0.4); await cat('cat_sit_all', 4.0, 0.0)
r.render(scene, cam); (window as any).READY = true
