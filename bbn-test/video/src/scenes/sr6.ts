// S6: walk back out towards the door; end card; fade to black at the end of the video.
import { C, F, ease, el, seg } from '../kit'
import { OUT_T, bobbed, buildRoom, frameOverlay } from '../serverkit'
import type { SceneDef } from '../types'

export default {
  theme: 'dark',
  type: { pos: 'bottom', size: 46, width: 1560 },
  create(ctx) {
    const cam = ctx.stage.camera
    cam.fov = 62; cam.updateProjectionMatrix()
    const room = buildRoom(ctx), fade = frameOverlay(ctx.dom)
    const card = el('div', 'position:absolute;left:0;right:0;top:300px;text-align:center;opacity:0', ctx.dom,
      `<div style="font:800 100px/1.15 ${F.display};color:${C.white}">ห้องเซิร์ฟเวอร์</div>
       <div style="margin-top:10px;font:600 50px ${F.display};color:${C.accent}">ความรู้ใกล้ตัว</div>`)
    return {
      update(f) {
        const t = f.local, z = -14 + 2.4 * t // facing the door, walking out
        bobbed(cam, t, 0, 1.66, z, 0, 1.5, z + 12, seg(t, 0, 0.8))
        room.update(f.t)
        card.style.opacity = String(ease.out(seg(f.t, OUT_T - 3.2, OUT_T - 2.4)))
        fade(t, f.t)
      },
    }
  },
} satisfies SceneDef
