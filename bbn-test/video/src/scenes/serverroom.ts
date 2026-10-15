// First-person walk into a server room: door frame, then a long aisle of racks with blinking LEDs,
// ceiling light strips, a glossy raised floor (mirrored LEDs/lights under a translucent floor) and a bright door at the far end.
// Pure function of the Frame: all randomness comes from rng(), blinking from f.t.
import * as THREE from 'three'
import { C, canvasTexture, ease, el, rng, seg } from '../kit'
import type { SceneDef } from '../types'

const AISLE = 1.6 // half-width of the walkway (rack fronts sit at x = ±AISLE)
const PITCH = 0.85 // rack spacing along z
const N = 80 // racks per side
const Z0 = 1.5 // first rack centre
const UNITS = 10 // server units per rack
const GAPS = new Set([14, 40]) // cross aisles
const Z_NEAR = 14, Z_FAR = -70, LEN = Z_NEAR - Z_FAR
const GAIN = 1.35 // LED brightness above 1.0 so they bloom

const PALETTE: [number, number, number][] = [
  [0.24, 1.0, 0.56], // green
  [0.36, 0.55, 1.0], // blue
  [1.0, 0.69, 0.13], // amber
  [1.0, 0.3, 0.32], // red (rare)
]

export default {
  theme: 'dark',
  type: false,
  create(ctx) {
    const { stage, root, dom } = ctx
    const cam = stage.camera
    cam.fov = 64; cam.near = 0.1; cam.far = 140; cam.updateProjectionMatrix()
    stage.scene.fog = new THREE.Fog(new THREE.Color(C.ink), 6, 62)
    const R = rng(7)
    const dummy = new THREE.Object3D()
    const basic = (color: THREE.ColorRepresentation, extra: THREE.MeshBasicMaterialParameters = {}) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, ...extra })
    const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
      m.position.set(x, y, z); root.add(m); return m
    }

    // ---- racks ----
    const racks: { s: number; z: number }[] = []
    for (const s of [-1, 1]) for (let k = 0; k < N; k++) if (!GAPS.has(k)) racks.push({ s, z: Z0 - k * PITCH })
    const bodies = new THREE.InstancedMesh(new THREE.BoxGeometry(1.0, 2.4, 0.78), basic(0x0b0e14), racks.length)
    const plates = new THREE.InstancedMesh(new THREE.BoxGeometry(0.022, 0.17, 0.7), basic(0xffffff), racks.length * UNITS)
    plates.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(racks.length * UNITS * 3), 3)
    const LED_N = racks.length * UNITS * 3
    const ledGeo = new THREE.BoxGeometry(0.012, 0.026, 0.034)
    const leds = new THREE.InstancedMesh(ledGeo, basic(0xffffff, { fog: true }), LED_N)
    const ledsMirror = new THREE.InstancedMesh(ledGeo, basic(0xffffff), LED_N) // reflection under the floor
    for (const m of [leds, ledsMirror]) m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(LED_N * 3), 3)
    const base = new Float32Array(LED_N * 3)
    const phase = new Float32Array(LED_N), rate = new Float32Array(LED_N), duty = new Float32Array(LED_N), kind = new Uint8Array(LED_N)
    let li = 0, pi = 0
    racks.forEach((r, ri) => {
      dummy.scale.set(1, 1, 1); dummy.rotation.set(0, 0, 0)
      dummy.position.set(r.s * (AISLE + 0.5), 1.2, r.z); dummy.updateMatrix(); bodies.setMatrixAt(ri, dummy.matrix)
      for (let u = 0; u < UNITS; u++) {
        const y = 0.28 + u * 0.2
        dummy.position.set(r.s * (AISLE - 0.012), y, r.z); dummy.updateMatrix(); plates.setMatrixAt(pi, dummy.matrix)
        const g = 0.05 + R() * 0.07
        plates.instanceColor!.setXYZ(pi++, g, g * 1.04, g * 1.12)
        for (let j = 0; j < 3; j++) {
          const zo = [-0.28, -0.2, 0.28][j]
          dummy.position.set(r.s * (AISLE - 0.027), y, r.z + zo); dummy.updateMatrix(); leds.setMatrixAt(li, dummy.matrix)
          dummy.position.y = -y; dummy.updateMatrix(); ledsMirror.setMatrixAt(li, dummy.matrix)
          const q = R()
          const c = j === 2 ? PALETTE[0] : q < 0.45 ? PALETTE[0] : q < 0.75 ? PALETTE[1] : q < 0.93 ? PALETTE[2] : PALETTE[3]
          base.set(c, li * 3)
          const kq = R()
          kind[li] = j === 2 ? 0 : kq < 0.15 ? 0 : kq < 0.88 ? 1 : 2
          phase[li] = R(); rate[li] = 1.5 + R() * 5.5; duty[li] = 0.35 + R() * 0.25
          li++
        }
      }
    })
    for (const m of [bodies, plates, leds, ledsMirror]) { m.instanceMatrix.needsUpdate = true; m.frustumCulled = false; root.add(m) }

    // ---- floor (translucent, so the mirrored LEDs/lights read as reflections) ----
    const PX = 32
    const floorTex = canvasTexture(8 * PX, LEN * PX, g => {
      const W = 8 * PX, H = LEN * PX
      g.fillStyle = '#0d1118'; g.fillRect(0, 0, W, H)
      g.strokeStyle = 'rgba(130,160,210,0.11)'; g.lineWidth = 1
      for (let x = 0; x <= 8; x += 0.6) { g.beginPath(); g.moveTo(x * PX, 0); g.lineTo(x * PX, H); g.stroke() }
      for (let z = Z_NEAR; z >= Z_FAR; z -= 0.6) { const y = ((z - Z_FAR) / LEN) * H; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke() }
      for (let j = 0; j < 17; j++) { // light pools under the ceiling strips
        const cy = ((4 - j * 4.5 - Z_FAR) / LEN) * H
        g.save(); g.translate(W / 2, cy); g.scale(85, 200)
        const rg = g.createRadialGradient(0, 0, 0, 0, 0, 1)
        rg.addColorStop(0, 'rgba(150,190,255,0.30)'); rg.addColorStop(1, 'rgba(150,190,255,0)')
        g.fillStyle = rg; g.fillRect(-1, -1, 2, 2); g.restore()
      }
    })
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, LEN), basic(0xffffff, { map: floorTex, transparent: true, opacity: 0.84, depthWrite: false }))
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, (Z_NEAR + Z_FAR) / 2); floor.renderOrder = 2; root.add(floor)

    // ---- shell: ceiling, side walls, corridor, trays, light strips ----
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(14, LEN), basic(0x07090d))
    ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 3.2, (Z_NEAR + Z_FAR) / 2); root.add(ceil)
    for (const s of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(LEN, 3.2), basic(0x0a0d13))
      wall.rotation.y = Math.PI / 2; wall.position.set(s * 7, 1.6, (Z_NEAR + Z_FAR) / 2); root.add(wall)
      box(0.35, 0.06, LEN - 10, basic(0x1a2030), s * 2.1, 2.65, -28) // cable tray
      for (const k of GAPS) { // cold-aisle glow at each cross aisle
        const gl = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), basic(new THREE.Color(0.14, 0.3, 0.7)))
        gl.rotation.y = Math.PI / 2; gl.position.set(s * 6.95, 1.4, Z0 - k * PITCH); root.add(gl)
      }
      // corridor walls leading to the door
      box(0.1, 3.2, 12, basic(0x12161f), s * 1.9, 1.6, 8.2)
    }
    const stripMat = basic(new THREE.Color(0.72, 0.8, 1.0)), stripMirror = basic(new THREE.Color(0.2, 0.24, 0.32))
    for (let j = 0; j < 17; j++) {
      const z = 4 - j * 4.5
      box(0.22, 0.03, 1.8, stripMat, 0, 3.17, z)
      box(0.22, 0.03, 1.8, stripMirror, 0, -3.17, z)
    }
    box(0.3, 0.03, 1.6, basic(new THREE.Color(1.0, 0.78, 0.5)), 0, 3.17, 7) // warm corridor light
    // door frame
    const frame = basic(0x1b212c)
    box(0.18, 3.2, 0.3, frame, -1.8, 1.6, 2.6); box(0.18, 3.2, 0.3, frame, 1.8, 1.6, 2.6); box(3.8, 0.5, 0.3, frame, 0, 2.95, 2.6)
    box(3.6, 0.04, 0.05, basic(new THREE.Color(0.5, 1.0, 0.75)), 0, 2.68, 2.6) // access-granted bar
    // beacon at the far end (fog:false so it stays visible as a destination)
    const beacon = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.0), basic(new THREE.Color(0.62, 0.78, 1.0), { fog: false }))
    beacon.position.set(0, 1.5, -69.4); root.add(beacon)
    box(14, 3.2, 0.1, basic(0x07090d), 0, 1.6, -69.6)

    // ---- DOM: fade-in from black + vignette ----
    el('div', 'position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 52%,rgba(0,0,0,.62) 100%)', dom)
    const black = el('div', 'position:absolute;inset:0;background:#000', dom)

    const colA = leds.instanceColor!.array as Float32Array, colB = ledsMirror.instanceColor!.array as Float32Array
    return {
      update(f) {
        const t = f.local
        // walk: accelerate out of the doorway, then steady; light head bob and sway
        const d = 3.3 * (t - 0.3 * (1 - Math.exp(-t / 0.3)))
        const z = 7.5 - d, ramp = seg(t, 0, 0.8)
        const bob = 0.03 * Math.sin(t * Math.PI * 2 * 1.7) * ramp, sway = 0.018 * Math.sin(t * Math.PI * 2 * 0.85) * ramp
        cam.position.set(sway, 1.68 + bob, z)
        cam.lookAt(0.05 * Math.sin(t * 0.9), 1.45 + 0.03 * Math.sin(t * 1.1), z - 12)
        // LEDs: quantised blink so it reads as digital activity
        const tq = Math.floor(t * 30) / 30
        for (let i = 0; i < LED_N; i++) {
          let v = 1
          if (kind[i] === 1) v = (tq * rate[i] + phase[i]) % 1 < duty[i] ? 1 : 0.07
          else if (kind[i] === 2) v = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * 2.2 + phase[i] * 6.283))
          const k = v * GAIN, m = k * 0.55, o = i * 3
          colA[o] = base[o] * k; colA[o + 1] = base[o + 1] * k; colA[o + 2] = base[o + 2] * k
          colB[o] = base[o] * m; colB[o + 1] = base[o + 1] * m; colB[o + 2] = base[o + 2] * m
        }
        leds.instanceColor!.needsUpdate = true; ledsMirror.instanceColor!.needsUpdate = true
        black.style.opacity = String(1 - ease.out(seg(t, 0, 0.6)))
      },
      dispose() { stage.scene.fog = null },
    }
  },
} satisfies SceneDef
