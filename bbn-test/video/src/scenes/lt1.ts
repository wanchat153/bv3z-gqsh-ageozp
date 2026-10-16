// L1: hook. A storm over a quiet town, bolts striking while the narrator opens; "40 per second" counter on line 2.
import * as THREE from 'three'
import { C, F, ease, el, seg } from '../kit'
import { V, card, cam, cloud, ground, makeBolt, overlay, scenery, setupSky, strike } from '../lightkit'
import type { SceneDef } from '../types'

const HITS = [{ t: 1.6, x: -26 }, { t: 4.4, x: 14 }, { t: 5.6, x: -6 }, { t: 9.2, x: 34 }, { t: 11.6, x: -16 }, { t: 14.0, x: 6 }]
export default {
  theme: 'dark',
  type: { pos: 'bottom', size: 54, width: 1560 },
  create(ctx) {
    const sky = setupSky(ctx, { fog: 70 }), fade = overlay(ctx.dom)
    ctx.stage.camera.fov = 52; ctx.stage.camera.updateProjectionMatrix()
    ground(ctx.root, 0, 700)
    const sc = scenery(ctx.root)
    sc.house(-9, -4, 1.2); sc.house(6, -12, 1); sc.house(-20, -16, 1.4, false); sc.house(20, -8, 1.1)
    for (let i = 0; i < 9; i++) sc.tree(-34 + i * 8.5, -20 - (i % 3) * 5, 1 + (i % 2) * 0.4)
    const cl = cloud(ctx.root, { seed: 5, n: 190, z: -105, y0: 24, y1: 66, w: 130, depth: 40, size: 1.1 })
    const bolts = HITS.map((h, i) => makeBolt(ctx.root, { seed: 40 + i, from: V(h.x * 1.2, 30, -100), to: V(h.x, 0, -38 - (i % 3) * 14), width: 0.32, branches: 6 }))
    const title = card(ctx.dom, 'ฟ้าผ่า', 'ไฟฟ้าหลายร้อยล้านโวลต์ ในเสี้ยววินาที', 'left:120px;top:100px', 112)
    const count = el('div', 'position:absolute;right:130px;top:120px;text-align:right;opacity:0', ctx.dom,
      `<div style="font:800 150px/1 ${F.display};color:${C.accent}">≈ 40</div>
       <div style="font:600 44px ${F.display};color:${C.white}">ครั้ง ทุกวินาที ทั่วโลก</div>`)
    return {
      update(f) {
        const t = f.local
        cam(ctx.stage.camera, f.p, [0, 6, 34], [0, 8, 14], [0, 16, -110], [0, 18, -110], t)
        let flash = 0
        bolts.forEach((b, i) => {
          const s = strike(t, HITS[i].t, 0.8, 14)
          b.update(s.leader, s.flash, s.fade)
          if (t > HITS[i].t + 0.7 && t < HITS[i].t + 1.6) flash = Math.max(flash, s.flash * 0.9)
          else flash = Math.max(flash, s.flash * 0.5)
        })
        sky(flash * 0.8); sc.lightK(flash); cl.setLight(0.08 + flash * 0.7 + 0.04 * Math.sin(t * 2))
        title.style.opacity = String(ease.out(seg(t, 0.6, 1.4)) * (1 - seg(f.li >= 1 ? f.lp : 0, 0.0, 0.15) * (f.li >= 1 ? 1 : 0)))
        count.style.opacity = String(f.li >= 1 ? ease.out(seg(f.lp, 0.02, 0.2)) : 0)
        fade(t, f.dur, 0.5)
      },
    }
  },
} satisfies SceneDef
