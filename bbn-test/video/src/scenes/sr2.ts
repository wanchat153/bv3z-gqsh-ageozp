// S2: racks in rows, each rack holds many servers; running 24/7.
import * as THREE from 'three'
import { C, F, ease, el, lerp, seg } from '../kit'
import { AISLE, bobbed, buildRoom, frameOverlay, place, rackZ, tag, unitY } from '../serverkit'
import type { SceneDef } from '../types'

const K = 12, RZ = rackZ(K), U = 5
export default {
  theme: 'dark',
  type: { pos: 'bottom', size: 54, width: 1560 },
  create(ctx) {
    const cam = ctx.stage.camera
    cam.fov = 58; cam.updateProjectionMatrix()
    const room = buildRoom(ctx), fade = frameOverlay(ctx.dom)
    // outline around the rack face and around one server unit
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.88, 0.29) })
    const bar = (w: number, h: number, d: number, y: number, z: number, x = AISLE - 0.035) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); ctx.root.add(m)
    }
    bar(0.03, 0.03, 0.84, 2.42, RZ); bar(0.03, 0.03, 0.84, 0.0, RZ); bar(0.03, 2.42, 0.03, 1.21, RZ - 0.42); bar(0.03, 2.42, 0.03, 1.21, RZ + 0.42)
    const uy = unitY(U)
    bar(0.03, 0.03, 0.74, uy + 0.1, RZ, AISLE - 0.05); bar(0.03, 0.03, 0.74, uy - 0.1, RZ, AISLE - 0.05)
    bar(0.03, 0.2, 0.03, uy, RZ - 0.37, AISLE - 0.05); bar(0.03, 0.2, 0.03, uy, RZ + 0.37, AISLE - 0.05)
    const tRack = tag(ctx.dom, 'ตู้แร็ก (Rack)', C.accent), tUnit = tag(ctx.dom, 'เซิร์ฟเวอร์ 1 เครื่อง = 1 ชั้น', C.blue)
    const big = el('div', 'position:absolute;left:120px;top:110px;opacity:0', ctx.dom,
      `<div style="font:800 96px/1.1 ${F.display};color:${C.white}">ทำงานตลอด 24 ชั่วโมง</div>
       <div style="margin-top:6px;font:600 44px ${F.display};color:${C.accent}">ไม่มีวันหยุด</div>`)
    const pRack = new THREE.Vector3(AISLE, 2.45, RZ), pUnit = new THREE.Vector3(AISLE - 0.03, uy + 0.1, RZ - 0.3)
    return {
      update(f) {
        const t = f.local, z = -1.5 - 0.75 * t
        bobbed(cam, t, -0.4, 1.55, z, 1.6, 1.3, lerp(z - 4, RZ, seg(t, 0, f.dur)), seg(t, 0, 0.8))
        room.update(f.t)
        place(cam, tRack, pRack, ease.out(seg(t, 1.0, 1.5)), -80, -6)
        place(cam, tUnit, pUnit, ease.out(seg(t, 2.6, 3.1)), -10, -6)
        big.style.opacity = String(ease.out(seg(f.p, 0.68, 0.8)))
        fade(t, f.t)
      },
    }
  },
} satisfies SceneDef
