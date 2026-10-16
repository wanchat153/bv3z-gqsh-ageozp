import * as THREE from 'three'
import { samurai, mochi, catPoses, INK } from './inkchars'
const W = 1920, H = 1080
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(W, H); r.setPixelRatio(1); document.body.appendChild(r.domElement)
const scene = new THREE.Scene(); scene.background = new THREE.Color('#F1E9D8')
const cam = new THREE.OrthographicCamera(-4.8, 4.8, 2.7, -2.7, 0.1, 50); cam.position.set(0, 1.2, 10); cam.lookAt(0, 1.2, 0)
scene.add(new THREE.HemisphereLight(0xffffff, 0xcdb99a, 1.6)); const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-3, 6, 6); scene.add(key)
const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 0.02), new THREE.MeshBasicMaterial({ color: INK })); ground.position.y = -0.01; scene.add(ground)
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)
const S = 2.0
const mk = (g: THREE.Object3D, x: number, y: number, s: number, ry: number) => { g.position.set(x, y, 0); g.scale.setScalar(s); g.rotation.y = ry; scene.add(g) }
const a = samurai(); a.pose({ walk: null }); mk(a.root, -3.4, 0, S * 1.5, 0.35)
const b = samurai(); b.pose({ walk: 1.2, look: [0.5, 0], hands: [V(-0.5, 0.35, 0.1), V(0.5, 0.05, 0.1)] }); mk(b.root, -0.6, 0, S * 0.9, -0.5)
const m1 = mochi(); m1.pose(catPoses.stand()); mk(m1.root, 1.6, 0, S * 1.5, -0.45)
const m2 = mochi(); m2.pose(catPoses.sit()); mk(m2.root, 3.7, 0, S * 1.5, -0.35)
r.render(scene, cam)
;(window as any).READY = true
