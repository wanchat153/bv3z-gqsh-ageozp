// L2: the storm cloud (cumulonimbus, 10+ km) and the churning ice inside it.
import * as THREE from 'three'
import { C, F, ease, el, lerp, rng, seg } from '../kit'
import { V, cam, cloud, dots, ground, overlay, place, setupSky, tag } from '../lightkit'
import type { SceneDef } from '../types'

export default {
  theme: 'dark',
  type: { pos: 'bottom', size: 54, width: 1560 },
  create(ctx) {
    const sky = setupSky(ctx, { bg: '#0a1020' }), fade = overlay(ctx.dom)
    ctx.stage.camera.fov = 50; ctx.stage.camera.updateProjectionMatrix()
    ground(ctx.root, 0, 500)
    const cl = cloud(ctx.root, { seed: 11, n: 230, z: -30, y0: 8, y1: 40, w: 34, depth: 16, size: 0.9 })
    // up/down air currents (small streaks) and ice (small = light, large = heavy)
    const R = rng(9), NA = 120, NS = 260, NB = 70
    const air = dots(ctx.root, NA, 0.7, '#7fb0ff'), small = dots(ctx.root, NS, 0.5, '#e9f4ff'), big = dots(ctx.root, NB, 1.15, '#bfe3ff')
    const ra = Array.from({ length: NA }, () => R()), rs = Array.from({ length: NS }, () => [R(), R(), R(), R()]), rb = Array.from({ length: NB }, () => [R(), R(), R(), R()])
    const tTop = tag(ctx.dom, 'ยอดเมฆ สูงกว่า 10 กม.', C.accent), tBase = tag(ctx.dom, 'ฐานเมฆ', C.blue), tUp = tag(ctx.dom, 'ลมพัดขึ้น', C.blue)
    const tSmall = tag(ctx.dom, 'เม็ดน้ำแข็งเล็ก (เบา)', C.white, 36), tBig = tag(ctx.dom, 'ก้อนน้ำแข็งใหญ่ (หนัก)', C.accent, 36)
    const title = el('div', 'position:absolute;left:120px;top:100px;opacity:0', ctx.dom,
      `<div style="font:800 92px/1.1 ${F.display};color:${C.white}">เมฆคิวมูโลนิมบัส</div>
       <div style="margin-top:6px;font:600 44px ${F.display};color:${C.accent}">เมฆฝนฟ้าคะนอง</div>`)
    const pTop = V(0, 40, -30), pBase = V(-14, 8, -22), pUp = V(-6, 26, -16)
    return {
      update(f) {
        const t = f.local, inside = ease.inOut(seg(f.p, 0.5, 0.66))
        cam(ctx.stage.camera, 0, [lerp(0, 2, inside), lerp(18, 22, inside), lerp(66, 12, inside)], [0, 0, 0], [0, lerp(22, 24, inside), -30], [0, 0, 0], t)
        cl.setLight(0.06 + 0.03 * Math.sin(t * 1.3)); sky(0)
        for (let i = 0; i < NA; i++) { // updraft in the middle column, downdrafts at the sides
          const up = i % 3 !== 0, ph = (ra[i] + t * (up ? 0.2 : 0.14)) % 1
          air.at(i, up ? -4 + (ra[i] - 0.5) * 7 : (i % 2 ? 11 : -13) + ra[i] * 3, up ? lerp(2, 40, ph) : lerp(40, 2, ph), -28 + (ra[(i * 7) % NA] - 0.5) * 12)
        }
        const vis = ease.out(seg(f.p, 0.42, 0.62))
        for (let i = 0; i < NS; i++) {
          const a = rs[i], ph = (a[0] + t * 0.11) % 1, ang = ph * 6.28 * 2 + a[1] * 6.28
          small.at(i, -3 + Math.cos(ang) * (2 + a[2] * 7), lerp(10, 36, (ph + a[3]) % 1), -28 + Math.sin(ang) * (2 + a[2] * 6))
        }
        for (let i = 0; i < NB; i++) {
          const a = rb[i], ph = (a[0] + t * 0.07) % 1, ang = ph * 6.28 * 1.5 + a[1] * 6.28
          big.at(i, -3 + Math.cos(ang) * (3 + a[2] * 8), lerp(34, 10, (ph + a[3]) % 1), -28 + Math.sin(ang) * (3 + a[2] * 7))
        }
        air.flush(); small.flush(); big.flush(); small.opacity(vis); big.opacity(vis); air.opacity(0.55)
        place(ctx.stage.camera, tTop, pTop, (1 - inside) * ease.out(seg(t, 1.4, 2.0)), 0, -20)
        place(ctx.stage.camera, tBase, pBase, (1 - inside) * ease.out(seg(t, 2.4, 3.0)), -10, 40)
        place(ctx.stage.camera, tUp, pUp, (1 - inside) * ease.out(seg(t, 4.6, 5.2)), 20, 0)
        title.style.opacity = String(ease.out(seg(t, 0.3, 1.0)) * (1 - inside))
        place(ctx.stage.camera, tSmall, V(-3, 30, -28), inside * ease.out(seg(f.p, 0.68, 0.74)), 40, -10)
        place(ctx.stage.camera, tBig, V(2, 18, -28), inside * ease.out(seg(f.p, 0.76, 0.82)), 60, 10)
        fade(t, f.dur, 0.5)
      },
    }
  },
} satisfies SceneDef
