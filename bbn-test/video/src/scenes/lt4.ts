// L4: air is an insulator until it breaks down; the stepped leader creeps down ~50 m at a time.
import * as THREE from 'three'
import { C, F, ease, el, lerp, rng, seg } from '../kit'
import { V, cam, charges, cloud, ground, makeBolt, overlay, place, scenery, setupSky, strike, tag } from '../lightkit'
import type { SceneDef } from '../types'

export default {
  theme: 'dark',
  type: { pos: 'bottom', size: 54, width: 1560 },
  create(ctx) {
    const sky = setupSky(ctx, { bg: '#080c18', fog: 90 }), fade = overlay(ctx.dom)
    ctx.stage.camera.fov = 50; ctx.stage.camera.updateProjectionMatrix()
    ground(ctx.root, 0, 500)
    const sc = scenery(ctx.root); sc.tree(-14, -40, 1.3); sc.house(14, -44, 1.3); sc.tree(24, -52, 1)
    const cl = cloud(ctx.root, { seed: 21, n: 170, z: -40, y0: 30, y1: 52, w: 56, depth: 24, size: 1.0 })
    const bolt = makeBolt(ctx.root, { seed: 77, from: V(0, 31, -40), to: V(2, 0.5, -40), width: 0.2, branches: 9, jag: 0.06 })
    const R = rng(8), top = charges(ctx.root, 40, '-', 2.2), low = charges(ctx.root, 40, '+', 1.8)
    const r = Array.from({ length: 40 }, () => [R(), R(), R()])
    const insul = el('div', 'position:absolute;left:0;right:0;top:190px;text-align:center;opacity:0', ctx.dom,
      `<div style="font:800 110px/1.1 ${F.display};color:${C.white}">อากาศ = ฉนวนไฟฟ้า</div>
       <div style="margin-top:8px;font:600 46px ${F.display};color:${C.accent}">จนกว่าประจุจะสะสมมากเกินไป</div>`)
    const tLead = tag(ctx.dom, 'ลีดเดอร์ (Leader)', C.blue), tStep = tag(ctx.dom, 'ก้าวทีละ ≈ 50 เมตร', C.accent, 36)
    return {
      update(f) {
        const t = f.local, t0 = 6.4, lead = strike(t, t0, f.dur - t0 - 1.0, 26)
        const tip = bolt.tip(lead.leader)
        cam(ctx.stage.camera, 0, [0, lerp(8, 4, seg(t, 6, f.dur)), 24], [0, 0, 0], [0, lerp(22, 14 - 3, seg(t, 6, f.dur)), -40], [0, 0, 0], t)
        bolt.update(lead.leader, 0, 1); cl.setLight(0.1 + 0.06 * Math.sin(t * 2.2)); sky(0)
        for (let i = 0; i < 40; i++) {
          top.at(i, -24 + r[i][0] * 48, 31 + r[i][1] * 1.2, -40 + (r[i][2] - 0.5) * 18)
          low.at(i, -24 + r[i][1] * 48, 0.4, -40 + (r[i][2] - 0.5) * 18)
        }
        top.flush(); low.flush(); top.opacity(ease.out(seg(t, 0.4, 1.6))); low.opacity(ease.out(seg(t, 1.4, 2.6)))
        insul.style.opacity = String(ease.out(seg(t, 2.0, 3.0)) * (1 - ease.out(seg(t, 5.6, 6.4))))
        const on = ease.out(seg(t, t0 + 0.6, t0 + 1.4))
        place(ctx.stage.camera, tLead, V(tip.x, tip.y, tip.z), on, 40, -20)
        place(ctx.stage.camera, tStep, V(tip.x, tip.y, tip.z), on * ease.out(seg(t, t0 + 3.5, t0 + 4.2)), 40, 50)
        fade(t, f.dur, 0.5)
      },
    }
  },
} satisfies SceneDef
