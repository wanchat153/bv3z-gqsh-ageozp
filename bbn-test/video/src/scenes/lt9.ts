// L9: calm after the storm; stars, a retreating cloud with faint inner flickers, "count the seconds", fade to black.
import * as THREE from 'three'
import { C, F, clamp, ease, el, lerp, rng, seg } from '../kit'
import { V, cam, cloud, dots, ground, overlay, scenery, setupSky } from '../lightkit'
import type { SceneDef } from '../types'

export default {
  theme: 'dark',
  type: { pos: 'bottom', size: 54, width: 1560 },
  create(ctx) {
    const sky = setupSky(ctx, { bg: '#060912', fog: 120 }), fade = overlay(ctx.dom)
    ctx.stage.camera.fov = 52; ctx.stage.camera.updateProjectionMatrix()
    ground(ctx.root, 0, 600)
    const sc = scenery(ctx.root)
    sc.house(-10, -14, 1.5); sc.house(8, -22, 1.2); sc.house(-26, -30, 1.6, false)
    for (let i = 0; i < 8; i++) sc.tree(-40 + i * 11, -34 - (i % 3) * 5, 1.1 + (i % 2) * 0.4)
    const R = rng(2), NS = 240, stars = dots(ctx.root, NS, 0.9, '#e8eeff')
    for (let i = 0; i < NS; i++) stars.at(i, (R() - 0.5) * 300, 20 + R() * 120, -200 - R() * 100)
    stars.flush()
    const cl = cloud(ctx.root, { seed: 91, n: 130, x: 60, z: -150, y0: 30, y1: 60, w: 70, depth: 30 })
    const text = el('div', 'position:absolute;left:0;right:0;top:170px;text-align:center;opacity:0', ctx.dom,
      `<div style="font:800 96px/1.15 ${F.display};color:${C.white}">ฟ้าผ่า = ไฟฟ้าที่ธรรมชาติสะสมไว้</div>
       <div style="margin-top:10px;font:600 50px ${F.display};color:${C.accent}">ทั้งน่ากลัว และน่าทึ่ง</div>`)
    const count = el('div', 'position:absolute;left:0;right:0;top:130px;text-align:center;opacity:0', ctx.dom,
      `<div id="c" style="font:800 220px/1 ${F.display};color:${C.accent}">1</div>
       <div style="font:700 56px ${F.display};color:${C.white}">ลองนับวินาที</div>`)
    const cEl = count.querySelector('#c') as HTMLElement
    return {
      update(f) {
        const t = f.local, flick = Math.max(0, Math.sin(t * 5.1) * Math.sin(t * 2.3 + 1)) ** 6
        cam(ctx.stage.camera, f.p, [0, 7, 30], [0, 9, 22], [10, 22, -150], [14, 24, -150], t)
        cl.setLight(0.05 + flick * 0.6); sky(flick * 0.12)
        stars.opacity(ease.out(seg(t, 0.5, 3)))
        const a = f.li === 0 ? ease.out(seg(f.lp, 0.05, 0.25)) * (1 - ease.out(seg(f.lp, 0.88, 1))) : 0
        text.style.opacity = String(a)
        const b = f.li >= 1 ? ease.out(seg(f.lp, 0.1, 0.3)) : 0
        count.style.opacity = String(b)
        cEl.textContent = String(1 + Math.floor((f.li >= 1 ? seg(f.lp, 0.3, 1) : 0) * 3.99))
        fade(t, f.dur, 0.6, 1.3)
      },
    }
  },
} satisfies SceneDef
