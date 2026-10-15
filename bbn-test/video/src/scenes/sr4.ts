// S4: what the status lights mean. Close-up of rack fronts; LEDs turn green, then amber appears, then red.
import { C, F, ease, el, seg } from '../kit'
import { bobbed, buildRoom, frameOverlay, rackZ, type Mix } from '../serverkit'
import type { SceneDef } from '../types'

const dot = (col: string) => `<span style="display:inline-block;width:38px;height:38px;border-radius:50%;background:${col};box-shadow:0 0 26px ${col};margin-right:26px;vertical-align:-6px"></span>`
export default {
  theme: 'dark',
  type: { pos: 'bottom', size: 54, width: 1560 },
  create(ctx) {
    const cam = ctx.stage.camera
    cam.fov = 48; cam.updateProjectionMatrix()
    const room = buildRoom(ctx, { ledScale: 1.5, gain: 1.3 }), fade = frameOverlay(ctx.dom)
    const row = (col: string, txt: string) => el('div', `opacity:0;margin-bottom:26px;font:700 56px/1.2 ${F.display};color:${C.white}`, panel, dot(col) + txt)
    const panel = el('div', 'position:absolute;right:130px;top:250px;padding:34px 46px 18px;border-radius:22px;background:rgba(12,14,19,.78)', ctx.dom)
    const rows = [row('#3CFF8F', 'เขียว  ปกติ'), row('#FFB020', 'เหลือง  เตือน'), row('#FF4D52', 'แดง  มีปัญหา')]
    el('div', `margin-top:-6px;font:500 26px ${F.ui};color:${C.gray}`, panel, 'ความหมายอาจต่างกันตามผู้ผลิต')
    return {
      update(f) {
        const t = f.local, p = f.lp > 0 ? f.lp : 0
        const z = rackZ(8) + 0.2 - 0.12 * t
        bobbed(cam, t, 0.3, 1.45, z, 1.6, 1.4, z - 0.9, 0.35)
        // all green -> amber joins -> red joins (the legend rows follow the narration)
        const mix: Mix = p < 0.42 ? [1, 1, 1] : p < 0.7 ? [0.72, 0.72, 1] : [0.64, 0.64, 0.9]
        room.update(f.t, mix)
        rows.forEach((r, i) => { r.style.opacity = String(ease.out(seg(p, [0.3, 0.5, 0.72][i], [0.4, 0.6, 0.82][i]))) })
        fade(t, f.t)
      },
    }
  },
} satisfies SceneDef
