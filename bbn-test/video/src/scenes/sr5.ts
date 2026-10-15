// S5: backup power. Lights cut out, the servers keep blinking; a battery indicator.
import { C, F, ease, el, seg } from '../kit'
import { bobbed, buildRoom, frameOverlay } from '../serverkit'
import type { SceneDef } from '../types'

export default {
  theme: 'dark',
  type: { pos: 'bottom', size: 46, width: 1560 },
  create(ctx) {
    const cam = ctx.stage.camera
    cam.fov = 62; cam.updateProjectionMatrix()
    const room = buildRoom(ctx), fade = frameOverlay(ctx.dom)
    const bat = el('div', 'position:absolute;left:120px;top:120px;opacity:0', ctx.dom,
      `<div style="display:flex;align-items:center;gap:20px">
         <div style="position:relative;width:190px;height:86px;border:6px solid ${C.white};border-radius:14px;padding:6px;box-sizing:border-box">
           <div id="bfill" style="height:100%;width:100%;border-radius:6px;background:#3CFF8F;box-shadow:0 0 24px #3CFF8F"></div>
           <div style="position:absolute;right:-18px;top:24px;width:12px;height:30px;background:${C.white};border-radius:3px"></div></div>
         <div style="font:800 60px ${F.display};color:${C.white}">แบตเตอรี่สำรอง</div></div>`)
    const fill = bat.querySelector('#bfill') as HTMLElement
    const out = el('div', `position:absolute;left:0;right:0;top:420px;text-align:center;font:800 120px ${F.display};color:${C.red};opacity:0;text-shadow:0 0 40px #FF4D52`, ctx.dom, 'ไฟดับ')
    const run = el('div', `position:absolute;right:120px;top:130px;opacity:0;font:700 54px ${F.display};color:#3CFF8F;text-shadow:0 0 24px #3CFF8F`, ctx.dom, 'เครื่องยังทำงานอยู่')
    return {
      update(f) {
        const t = f.local, p = f.lp > 0 ? f.lp : seg(t, 0, 2.5) * 0.2, cut = 0.62
        const z = -9 - 0.9 * t
        bobbed(cam, t, 0, 1.68, z, 0, 1.45, z - 12, seg(t, 0, 0.8))
        // power: on, then a short flicker, then out
        const k = p < cut ? 1 : p < cut + 0.04 ? ((Math.floor((p - cut) * 400) % 2) ? 0.15 : 0.9) : 0
        room.setPower(k); room.update(f.t)
        bat.style.opacity = String(ease.out(seg(p, 0.22, 0.34)))
        fill.style.width = `${p < cut ? 100 : 100 - 18 * seg(p, cut, 1)}%`
        out.style.opacity = String(seg(p, cut, cut + 0.03) * (1 - seg(p, cut + 0.14, cut + 0.2)))
        run.style.opacity = String(ease.out(seg(p, cut + 0.12, cut + 0.2)))
        fade(t, f.t)
      },
    }
  },
} satisfies SceneDef
