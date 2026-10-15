// Shared server-room kit for the educational clip: racks + blinking LEDs, glossy floor, ceiling lights, data packets,
// and DOM helpers (captions shade, labels pinned to 3D points). Everything is a pure function of time.
import * as THREE from 'three'
import { C, F, canvasTexture, clamp, ease, el, rng, seg } from './kit'
import type { SceneCtx } from './types'

export const OUT_T = 45 // video length in seconds (last second fades to black)
export const AISLE = 1.6, PITCH = 0.85, Z0 = 1.5, UNITS = 10
const N = 80, GAPS = new Set([14, 40]), Z_NEAR = 14, Z_FAR = -70, LEN = Z_NEAR - Z_FAR
export const rackZ = (k: number) => Z0 - k * PITCH
export const unitY = (u: number) => 0.28 + u * 0.2

const PAL: [number, number, number][] = [[0.24, 1.0, 0.56], [0.36, 0.55, 1.0], [1.0, 0.69, 0.13], [1.0, 0.3, 0.32]]
/** cumulative thresholds on each LED's random q: green | blue | amber | (rest) red */
export type Mix = [number, number, number]
export const NORMAL_MIX: Mix = [0.45, 0.75, 0.93]

export interface RoomOpts { ceiling?: boolean; fog?: boolean; ledScale?: number; gain?: number; bodyOpacity?: number; bodyColor?: number; glow?: boolean }

export function buildRoom(ctx: SceneCtx, o: RoomOpts = {}) {
  const { stage, root } = ctx
  const cam = stage.camera
  cam.far = 140
  stage.scene.fog = o.fog === false ? null : new THREE.Fog(new THREE.Color(C.ink), 6, 62)
  const R = rng(7), dummy = new THREE.Object3D()
  const gain = o.gain ?? 1.35, sc = o.ledScale ?? 1
  const basic = (color: THREE.ColorRepresentation, extra: THREE.MeshBasicMaterialParameters = {}) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, ...extra })
  const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); root.add(m); return m
  }

  // ---- racks, faceplates, LEDs ----
  const racks: { s: number; z: number }[] = []
  for (const s of [-1, 1]) for (let k = 0; k < N; k++) if (!GAPS.has(k)) racks.push({ s, z: rackZ(k) })
  const bodyMat = basic(o.bodyColor ?? 0x0b0e14, o.bodyOpacity !== undefined ? { transparent: true, opacity: o.bodyOpacity, depthWrite: false } : {})
  const bodies = new THREE.InstancedMesh(new THREE.BoxGeometry(1.0, 2.4, 0.78), bodyMat, racks.length)
  const platesMat = basic(0xffffff)
  const plates = new THREE.InstancedMesh(new THREE.BoxGeometry(0.022, 0.17, 0.7), platesMat, racks.length * UNITS)
  plates.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(racks.length * UNITS * 3), 3)
  const LED_N = racks.length * UNITS * 3
  const ledGeo = new THREE.BoxGeometry(0.012, 0.026 * sc, 0.034 * sc)
  const leds = new THREE.InstancedMesh(ledGeo, basic(0xffffff), LED_N)
  const ledsMirror = new THREE.InstancedMesh(ledGeo, basic(0xffffff), LED_N)
  for (const m of [leds, ledsMirror]) m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(LED_N * 3), 3)
  const q = new Float32Array(LED_N), phase = new Float32Array(LED_N), rate = new Float32Array(LED_N), duty = new Float32Array(LED_N)
  const steady = new Uint8Array(LED_N), power = new Uint8Array(LED_N)
  let li = 0, pi = 0
  racks.forEach((r, ri) => {
    dummy.scale.set(1, 1, 1)
    dummy.position.set(r.s * (AISLE + 0.5), 1.2, r.z); dummy.updateMatrix(); bodies.setMatrixAt(ri, dummy.matrix)
    for (let u = 0; u < UNITS; u++) {
      const y = unitY(u)
      dummy.position.set(r.s * (AISLE - 0.012), y, r.z); dummy.updateMatrix(); plates.setMatrixAt(pi, dummy.matrix)
      const g = 0.012 + R() * 0.03
      plates.instanceColor!.setXYZ(pi++, g, g * 1.04, g * 1.12)
      for (let j = 0; j < 3; j++) {
        dummy.position.set(r.s * (AISLE - 0.027), y, r.z + [-0.28, -0.2, 0.28][j]); dummy.updateMatrix(); leds.setMatrixAt(li, dummy.matrix)
        dummy.position.y = -y; dummy.updateMatrix(); ledsMirror.setMatrixAt(li, dummy.matrix)
        q[li] = R(); phase[li] = R(); rate[li] = 1.5 + R() * 5.5; duty[li] = 0.35 + R() * 0.25
        steady[li] = R() < 0.15 ? 1 : 0; power[li] = j === 2 ? 1 : 0
        li++
      }
    }
  })
  for (const m of [bodies, plates, leds, ledsMirror]) { m.instanceMatrix.needsUpdate = true; m.frustumCulled = false; root.add(m) }

  // ---- floor (translucent so the mirrored LEDs/lights read as reflections) ----
  const PX = 32
  const floorTex = canvasTexture(8 * PX, LEN * PX, g => {
    const W = 8 * PX, H = LEN * PX
    g.fillStyle = '#0d1118'; g.fillRect(0, 0, W, H)
    g.strokeStyle = 'rgba(130,160,210,0.11)'; g.lineWidth = 1
    for (let x = 0; x <= 8; x += 0.6) { g.beginPath(); g.moveTo(x * PX, 0); g.lineTo(x * PX, H); g.stroke() }
    for (let z = Z_NEAR; z >= Z_FAR; z -= 0.6) { const y = ((z - Z_FAR) / LEN) * H; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke() }
    for (let j = 0; j < 17; j++) {
      const cy = ((4 - j * 4.5 - Z_FAR) / LEN) * H
      g.save(); g.translate(W / 2, cy); g.scale(85, 200)
      const rg = g.createRadialGradient(0, 0, 0, 0, 0, 1)
      rg.addColorStop(0, 'rgba(150,190,255,0.30)'); rg.addColorStop(1, 'rgba(150,190,255,0)')
      g.fillStyle = rg; g.fillRect(-1, -1, 2, 2); g.restore()
    }
  })
  const floorMat = basic(0xffffff, { map: floorTex, transparent: true, opacity: 0.84, depthWrite: false })
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, LEN), floorMat)
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, (Z_NEAR + Z_FAR) / 2); floor.renderOrder = 2; root.add(floor)

  // ---- shell ----
  if (o.ceiling !== false) {
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(14, LEN), basic(0x07090d))
    ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 3.2, (Z_NEAR + Z_FAR) / 2); root.add(ceil)
  }
  for (const s of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(LEN, 3.2), basic(0x0a0d13))
    wall.rotation.y = Math.PI / 2; wall.position.set(s * 7, 1.6, (Z_NEAR + Z_FAR) / 2); root.add(wall)
    if (o.ceiling !== false) box(0.35, 0.06, LEN - 10, basic(0x1a2030), s * 2.1, 2.65, -28)
    if (o.glow !== false) for (const k of GAPS) {
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), basic(new THREE.Color(0.14, 0.3, 0.7)))
      gl.rotation.y = Math.PI / 2; gl.position.set(s * 6.95, 1.4, rackZ(k)); root.add(gl)
    }
    box(0.1, 3.2, 12, basic(0x12161f), s * 1.9, 1.6, 8.2)
  }
  const stripCol = new THREE.Color(0.72, 0.8, 1.0)
  const stripMat = basic(stripCol.clone()), stripMirror = basic(new THREE.Color(0.2, 0.24, 0.32))
  if (o.ceiling !== false) for (let j = 0; j < 17; j++) {
    box(0.22, 0.03, 1.8, stripMat, 0, 3.17, 4 - j * 4.5)
    box(0.22, 0.03, 1.8, stripMirror, 0, -3.17, 4 - j * 4.5)
  }
  box(0.3, 0.03, 1.6, basic(new THREE.Color(1.0, 0.78, 0.5)), 0, 3.17, 7)
  const frame = basic(0x1b212c)
  box(0.18, 3.2, 0.3, frame, -1.8, 1.6, 2.6); box(0.18, 3.2, 0.3, frame, 1.8, 1.6, 2.6); box(3.8, 0.5, 0.3, frame, 0, 2.95, 2.6)
  box(3.6, 0.04, 0.05, basic(new THREE.Color(0.5, 1.0, 0.75)), 0, 2.68, 2.6)
  const beacon = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.0), basic(new THREE.Color(0.62, 0.78, 1.0), { fog: false }))
  beacon.position.set(0, 1.5, -69.4); root.add(beacon)
  box(14, 3.2, 0.1, basic(0x07090d), 0, 1.6, -69.6)

  const colA = leds.instanceColor!.array as Float32Array, colB = ledsMirror.instanceColor!.array as Float32Array
  return {
    /** ceiling-light level 0..1 (also darkens the floor's baked light pools) */
    setPower(k: number) {
      stripMat.color.copy(stripCol).multiplyScalar(k)
      floorMat.color.setScalar(0.18 + 0.82 * k)
      platesMat.color.setScalar(0.3 + 0.7 * k)
    },
    /** blink the LEDs for time t; `mix` decides how many are green/blue/amber/red (amber/red pulse) */
    update(t: number, mix: Mix = NORMAL_MIX) {
      const tq = Math.floor(t * 30) / 30
      for (let i = 0; i < LED_N; i++) {
        const ci = power[i] ? 0 : q[i] < mix[0] ? 0 : q[i] < mix[1] ? 1 : q[i] < mix[2] ? 2 : 3
        let v = 1
        if (ci >= 2) v = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * (ci === 3 ? 5.5 : 3) + phase[i] * 6.283))
        else if (!steady[i] && !power[i]) v = (tq * rate[i] + phase[i]) % 1 < duty[i] ? 1 : 0.07
        const k = v * gain, m = k * 0.55, o3 = i * 3, c = PAL[ci]
        colA[o3] = c[0] * k; colA[o3 + 1] = c[1] * k; colA[o3 + 2] = c[2] * k
        colB[o3] = c[0] * m; colB[o3 + 1] = c[1] * m; colB[o3 + 2] = c[2] * m
      }
      leds.instanceColor!.needsUpdate = true; ledsMirror.instanceColor!.needsUpdate = true
    },
  }
}
export type Room = ReturnType<typeof buildRoom>

/** Glowing data packets streaming along the ceiling, out of the room (towards +z). */
export function addPackets(root: THREE.Group, count = 70) {
  const R = rng(21), span = 76
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.055, 0.055, 0.24), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.45, 1.2, 1.2) }), count)
  mesh.frustumCulled = false
  const x = new Float32Array(count), y = new Float32Array(count), off = new Float32Array(count), sp = new Float32Array(count)
  for (let i = 0; i < count; i++) { x[i] = (R() - 0.5) * 3.4; y[i] = 2.3 + R() * 0.5; off[i] = R() * span; sp[i] = 5 + R() * 5 }
  const d = new THREE.Object3D(); root.add(mesh)
  return (t: number) => {
    for (let i = 0; i < count; i++) {
      d.position.set(x[i], y[i], Z_FAR + 4 + ((t * sp[i] + off[i]) % span)); d.updateMatrix(); mesh.setMatrixAt(i, d.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  }
}

/** vignette + caption shade + black fade layer. Returns fade(local, absT, fadeIn). */
export function frameOverlay(dom: HTMLElement) {
  el('div', 'position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 52%,rgba(0,0,0,.6) 100%)', dom)
  el('div', 'position:absolute;left:0;right:0;bottom:0;height:300px;background:linear-gradient(rgba(0,0,0,0),rgba(0,0,0,.72))', dom)
  const black = el('div', 'position:absolute;inset:0;background:#000;opacity:1', dom)
  return (local: number, absT: number, fadeIn = 0.3) => {
    black.style.opacity = String(Math.max(1 - ease.out(seg(local, 0, fadeIn)), seg(absT, OUT_T - 0.7, OUT_T)))
  }
}

/** label pill (hidden until shown with place()) */
export function tag(parent: HTMLElement, text: string, color: string = C.accent, size = 40) {
  return el('div', `position:absolute;left:0;top:0;white-space:nowrap;font:700 ${size}px/1.2 ${F.display};color:${C.white};
    background:rgba(12,14,19,.8);border-left:8px solid ${color};padding:10px 26px 12px 22px;border-radius:12px;opacity:0`, parent, text)
}
const _v = new THREE.Vector3()
/** pin a DOM element above a 3D point (screen is 1920x1080); `op` is its opacity */
export function place(cam: THREE.Camera, d: HTMLElement, p: THREE.Vector3, op: number, dx = 0, dy = 0) {
  cam.updateMatrixWorld()
  _v.copy(p).project(cam)
  const behind = _v.z > 1
  d.style.opacity = String(behind ? 0 : clamp(op))
  d.style.transform = `translate(${(_v.x * 0.5 + 0.5) * 1920 + dx}px,${(-_v.y * 0.5 + 0.5) * 1080 + dy}px) translate(0,-100%)`
}

/** first-person walk helper: gentle head bob + sway on top of position/target */
export function bobbed(cam: THREE.PerspectiveCamera, t: number, x: number, y: number, z: number, tx: number, ty: number, tz: number, amt = 1) {
  cam.position.set(x + 0.018 * Math.sin(t * Math.PI * 1.7) * amt, y + 0.03 * Math.sin(t * Math.PI * 3.4) * amt, z)
  cam.lookAt(tx + 0.05 * Math.sin(t * 0.9), ty + 0.03 * Math.sin(t * 1.1), tz)
}
