// S1: walk into the room; data packets stream out; title card.
import { C, F, ease, el, seg } from '../kit'
import { addPackets, bobbed, buildRoom, frameOverlay } from '../serverkit'
import type { SceneDef } from '../types'

export default {
  theme: 'dark',
  type: { pos: 'bottom', size: 54, width: 1560 },
  create(ctx) {
    const cam = ctx.stage.camera
    cam.fov = 64; cam.updateProjectionMatrix()
    const room = buildRoom(ctx), packets = addPackets(ctx.root), fade = frameOverlay(ctx.dom)
    const title = el('div', 'position:absolute;left:120px;top:110px;opacity:0', ctx.dom,
      `<div style="font:800 104px/1.1 ${F.display};color:${C.white}">ห้องเซิร์ฟเวอร์</div>
       <div style="margin-top:6px;font:600 46px ${F.display};color:${C.accent}">หัวใจของโลกออนไลน์</div>`)
    return {
      update(f) {
        const t = f.local
        const z = 7.5 - 3.3 * (t - 0.3 * (1 - Math.exp(-t / 0.3)))
        bobbed(cam, t, 0, 1.68, z, 0, 1.45, z - 12, seg(t, 0, 0.8))
        room.update(f.t); packets(f.t)
        title.style.opacity = String(ease.out(seg(t, 0.9, 1.5)) * (1 - seg(t, f.dur - 1.6, f.dur - 0.9)))
        fade(t, f.t, 0.6)
      },
    }
  },
} satisfies SceneDef
