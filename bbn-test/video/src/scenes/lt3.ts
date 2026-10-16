// L3: charge separation. Light ice rises (+ on top), heavy ice sinks (- at the base), ground follows with +.
import * as THREE from 'three'
import { C, F, ease, el, lerp, rng, seg } from '../kit'
import { V, cam, charges, cloud, dots, ground, overlay, place, setupSky, tag } from '../lightkit'
import type { SceneDef } from '../types'

const N = 90
export default {
  theme: 'dark',
  type: { pos: 'bottom', size: 54, width: 1560 },
  create(ctx) {
    const sky = setupSky(ctx, { bg: '#0a1020' }), fade = overlay(ctx.dom)
    ctx.stage.camera.fov = 50; ctx.stage.camera.updateProjectionMatrix()
    ground(ctx.root, 0, 500)
    const cl = cloud(ctx.root, { seed: 11, n: 200, z: -30, y0: 16, y1: 40, w: 30, depth: 14, size: 0.85 })
    const R = rng(4)
    const plus = charges(ctx.root, N, '+', 1.7), minus = charges(ctx.root, N, '-', 1.7), gnd = charges(ctx.root, 70, '+', 1.4)
    const ice = dots(ctx.root, N, 0.5, '#e9f4ff'), hail = dots(ctx.root, N, 1.0, '#bfe3ff')
    const a = Array.from({ length: N }, () => [R(), R(), R(), R()]), g = Array.from({ length: 70 }, () => [R(), R()])
    const tP = tag(ctx.dom, 'ประจุบวก (+) ด้านบน', '#ff5a64'), tN = tag(ctx.dom, 'ประจุลบ (−) ด้านล่าง', '#4f8cff'), tG = tag(ctx.dom, 'ประจุบวกบนพื้นดิน ไล่ตามเมฆ', '#ff5a64')
    const meter = el('div', 'position:absolute;right:120px;top:150px;width:60px;height:520px;border:4px solid #7D8597;border-radius:14px;opacity:0', ctx.dom,
      `<div style="position:absolute;left:0;right:0;bottom:0;height:0%;background:linear-gradient(#ff5a64,#4f8cff);border-radius:8px" id="fill"></div>`)
    const meterLbl = el('div', `position:absolute;right:60px;top:690px;width:200px;text-align:center;font:700 34px ${F.display};color:${C.white};opacity:0`, ctx.dom, 'ความต่างศักย์<br>สะสมสูงขึ้น')
    const fill = meter.querySelector('#fill') as HTMLElement
    return {
      update(f) {
        const t = f.local, p1 = seg(f.p, 0.04, 0.34), p2 = seg(f.p, 0.38, 0.66), p3 = seg(f.p, 0.7, 0.92)
        const drift = t * 0.4
        cam(ctx.stage.camera, f.p, [0, 20, 68], [4, 17, 62], [0, 20, -30], [4, 19, -30], t)
        cl.setLight(0.05 + 0.1 * p2); sky(0)
        for (let i = 0; i < N; i++) {
          const q = a[i], k = ease.inOut(seg(p1, q[3] * 0.4, 0.6 + q[3] * 0.4))
          const x = -12 + q[0] * 24, z = -28 + (q[1] - 0.5) * 10 + Math.sin(t + i) * 0.3
          ice.at(i, x + Math.sin(t * 1.1 + i), lerp(16 + q[2] * 22, 36 + q[2] * 3, k), z)
          hail.at(i, x + Math.sin(t * 0.9 + i * 2), lerp(16 + q[2] * 22, 16.5 + q[2] * 3, k), z)
          plus.at(i, x, lerp(25 + q[2] * 8, 35 + q[2] * 4, k), z + 1.2)
          minus.at(i, x, lerp(26 + q[2] * 6, 17.5 + q[2] * 3, k), z + 1.2)
        }
        for (let i = 0; i < 70; i++) gnd.at(i, -13 + g[i][0] * 26 + drift, 0.35, -26 + (g[i][1] - 0.5) * 12)
        ice.flush(); hail.flush(); plus.flush(); minus.flush(); gnd.flush()
        ice.opacity(1 - p1 * 0.4); hail.opacity(1 - p1 * 0.4); plus.opacity(p1); minus.opacity(p1); gnd.opacity(p3)
        place(ctx.stage.camera, tP, V(-6, 38, -26), ease.out(seg(p1, 0.6, 1)), 0, -30)
        place(ctx.stage.camera, tN, V(-8, 16, -26), ease.out(seg(p1, 0.8, 1)), 0, 60)
        place(ctx.stage.camera, tG, V(2 + drift, 0.4, -26), ease.out(seg(p3, 0.2, 0.6)), 0, -70)
        meter.style.opacity = meterLbl.style.opacity = String(ease.out(seg(f.p, 0.34, 0.42)))
        fill.style.height = `${Math.round(100 * ease.out(seg(f.p, 0.36, 0.9)))}%`
        fade(t, f.dur, 0.5)
      },
    }
  },
} satisfies SceneDef
