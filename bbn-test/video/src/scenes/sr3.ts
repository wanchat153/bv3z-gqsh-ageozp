// S3: cooling. Top-down view: cold air from the front aisle through the racks, hot air out the back.
import * as THREE from 'three'
import { C, ease, lerp, rng, seg } from '../kit'
import { buildRoom, frameOverlay, place, rackZ, tag } from '../serverkit'
import type { SceneDef } from '../types'

const COUNT = 260, RZ = rackZ(6)
export default {
  theme: 'dark',
  type: { pos: 'bottom', size: 46, width: 1560 },
  create(ctx) {
    const cam = ctx.stage.camera
    cam.fov = 50; cam.updateProjectionMatrix()
    const room = buildRoom(ctx, { ceiling: false, fog: false, bodyOpacity: 0.4 }), fade = frameOverlay(ctx.dom)
    const tint = (x0: number, x1: number, col: THREE.Color, op: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 60), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false }))
      m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0.02, RZ); m.renderOrder = 3; ctx.root.add(m)
    }
    tint(-1.55, 1.55, new THREE.Color(0.15, 0.45, 1.0), 0.22)
    tint(2.65, 4.0, new THREE.Color(1.0, 0.25, 0.15), 0.2); tint(-4.0, -2.65, new THREE.Color(1.0, 0.25, 0.15), 0.2)
    const R = rng(5)
    const side = new Float32Array(COUNT), z0 = new Float32Array(COUNT), ph = new Float32Array(COUNT), sp = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) { side[i] = i % 2 ? 1 : -1; z0[i] = RZ + (R() - 0.5) * 12; ph[i] = R(); sp[i] = 0.28 + R() * 0.12 }
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.13, 0.13, 0.13), new THREE.MeshBasicMaterial({ color: 0xffffff }), COUNT)
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(COUNT * 3), 3); mesh.frustumCulled = false; ctx.root.add(mesh)
    const d = new THREE.Object3D(), cold = new THREE.Color(0.3, 0.75, 1.5), hot = new THREE.Color(1.6, 0.4, 0.2), c = new THREE.Color()
    const tCold = tag(ctx.dom, 'ลมเย็น', C.blue, 46), tHot = tag(ctx.dom, 'ลมร้อน', C.red, 46)
    const pCold = new THREE.Vector3(0, 0.3, RZ + 1.5), pHotL = new THREE.Vector3(-3.3, 0.5, RZ), pHotR = new THREE.Vector3(3.3, 0.5, RZ)
    const tHot2 = tag(ctx.dom, 'ลมร้อน', C.red, 46)
    return {
      update(f) {
        const t = f.local
        cam.position.set(0, 8.2, RZ + 5.2 - 0.25 * t); cam.lookAt(0, 0, RZ - 0.6 - 0.25 * t)
        room.update(f.t)
        for (let i = 0; i < COUNT; i++) {
          const u = (t * sp[i] + ph[i]) % 1
          const x = side[i] * (0.15 + u * 4.2), y = 0.35 + (u > 0.62 ? ease.out(seg(u, 0.62, 1)) * 2.4 : 0)
          d.position.set(x, y, z0[i]); d.updateMatrix(); mesh.setMatrixAt(i, d.matrix)
          c.copy(cold).lerp(hot, seg(u, 0.3, 0.62)); mesh.instanceColor!.setXYZ(i, c.r, c.g, c.b)
        }
        mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor!.needsUpdate = true
        place(cam, tCold, pCold, ease.out(seg(f.p, 0.22, 0.34)), -60, 0)
        place(cam, tHot, pHotL, ease.out(seg(f.p, 0.62, 0.74)), -60, 0); place(cam, tHot2, pHotR, ease.out(seg(f.p, 0.62, 0.74)), -60, 0)
        fade(t, f.t)
      },
    }
  },
} satisfies SceneDef
