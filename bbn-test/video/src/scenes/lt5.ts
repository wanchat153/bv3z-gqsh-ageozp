// L5: ground streamers rise to meet the leader; the connection triggers the blinding return stroke; 30,000 degrees.
import * as THREE from 'three'
import { C, F, clamp, ease, el, lerp, seg } from '../kit'
import { V, cam, cloud, ground, makeBolt, overlay, place, scenery, setupSky, tag } from '../lightkit'
import type { SceneDef } from '../types'

export default {
  theme: 'dark',
  type: { pos: 'bottom', size: 54, width: 1560 },
  create(ctx) {
    const sky = setupSky(ctx, { bg: '#080c18', fog: 100 }), fade = overlay(ctx.dom)
    ctx.stage.camera.fov = 48; ctx.stage.camera.updateProjectionMatrix()
    ground(ctx.root, 0, 500)
    const sc = scenery(ctx.root)
    sc.tower(5, -42, 11, 1.5); sc.tree(-9, -42, 1.5); sc.house(-20, -40, 1.5); sc.house(22, -48, 1.2); sc.tree(-30, -50, 1.1)
    const cl = cloud(ctx.root, { seed: 31, n: 150, z: -42, y0: 36, y1: 58, w: 50, depth: 20 })
    const main = makeBolt(ctx.root, { seed: 12, from: V(0, 38, -42), to: V(5, 14.3, -42), width: 0.26, branches: 8, jag: 0.05 })
    const st = [V(5, 14.3, -42), V(-9, 5.6, -42), V(-20, 5.2, -40)].map(p => V(p.x, p.y, p.z))
    const streams = [[5, 11.6, 14.3], [-9, 4.4, 8.4], [-20, 3.6, 7.2]].map(([x, y0, y1], i) =>
      makeBolt(ctx.root, { seed: 90 + i, from: V(x, y0, i === 2 ? -40 : -42), to: V(x, y1, i === 2 ? -40 : -42), width: 0.1, branches: 2, jag: 0.12, depth: 4 }))
    const tUp = tag(ctx.dom, 'สายไฟจากพื้น พุ่งขึ้นไปรับ', C.accent), tConn = tag(ctx.dom, 'เชื่อมต่อ!', '#ff5a64', 46)
    const hot = el('div', 'position:absolute;left:150px;right:150px;top:150px;opacity:0', ctx.dom,
      `<div style="font:700 40px ${F.display};color:${C.white};margin-bottom:12px">อุณหภูมิ</div>
       <div style="display:flex;align-items:center;margin-bottom:18px"><div style="width:420px;font:600 34px ${F.display};color:${C.white}">ช่องสายฟ้า</div>
         <div style="height:54px;border-radius:10px;background:linear-gradient(90deg,#ff9a3c,#fff2c4);width:0" id="b1"></div><div id="v1" style="margin-left:18px;font:800 48px ${F.display};color:${C.accent}"></div></div>
       <div style="display:flex;align-items:center"><div style="width:420px;font:600 34px ${F.display};color:${C.white}">ผิวดวงอาทิตย์</div>
         <div style="height:54px;border-radius:10px;background:#ffb02e;width:0" id="b2"></div><div id="v2" style="margin-left:18px;font:800 48px ${F.display};color:${C.white}"></div></div>`)
    const b1 = hot.querySelector('#b1') as HTMLElement, b2 = hot.querySelector('#b2') as HTMLElement
    const v1 = hot.querySelector('#v1') as HTMLElement, v2 = hot.querySelector('#v2') as HTMLElement
    let L1 = -1
    return {
      update(f) {
        const t = f.local
        if (L1 < 0) L1 = f.lines[1] ? f.lines[1].start - (f.t - f.local) : f.dur * 0.33
        const gE = seg(t, 0.6, L1 - 0.2) // leader approach
        const g = clamp(gE) * 0.985
        cam(ctx.stage.camera, seg(t, 0, L1 + 2), [0, 9, 38], [3, 8, 30], [0, 22, -42], [5, 14, -42], t)
        main.update(g, 0, 1)
        const sg = ease.in(seg(t, L1 - 3.2, L1 - 0.05))
        streams.forEach((s, i) => s.update(sg * (i === 0 ? 1 : 0.92), 0, 1, new THREE.Color(1.1, 0.8, 0.5)))
        // return stroke, in slow motion
        const a = Math.max(0, t - L1) * 0.45
        const flash = t < L1 ? 0 : clamp(Math.exp(-a * 3.2) * (1 + 0.4 * Math.sin(a * 40)) + (a > 0.3 ? Math.exp(-(a - 0.3) * 5) * 0.7 : 0), 0, 1.4)
        const glow = t < L1 ? 0 : Math.exp(-(t - L1) * 0.35)
        if (flash > 0) main.update(1, flash, 0.25 + 0.75 * glow)
        else if (t >= L1) main.update(1, 0, glow)
        sky(flash * 0.9); sc.lightK(flash); cl.setLight(0.08 + flash * 0.8)
        place(ctx.stage.camera, tUp, V(5, 14.5, -42), ease.out(seg(t, L1 - 3.0, L1 - 2.3)) * (1 - ease.out(seg(t, L1 - 0.1, L1 + 0.2))), 30, -10)
        place(ctx.stage.camera, tConn, V(5, 14.5, -42), ease.out(seg(t, L1 + 0.0, L1 + 0.3)) * (1 - ease.out(seg(t, L1 + 2.4, L1 + 3.0))), 30, -10)
        const o = ease.out(seg(f.li >= 2 ? f.lp : 0, 0.05, 0.2)) * (f.li >= 2 ? 1 : 0)
        hot.style.opacity = String(o)
        const w = ease.out(seg(f.li >= 2 ? f.lp : 0, 0.1, 0.55))
        b1.style.width = `${Math.round(900 * w)}px`; b2.style.width = `${Math.round(900 * w * 5500 / 30000)}px`
        v1.textContent = `${Math.round(30000 * w).toLocaleString('en-US')} °C`; v2.textContent = `${Math.round(5500 * w).toLocaleString('en-US')} °C`
        fade(t, f.dur, 0.5)
      },
    }
  },
} satisfies SceneDef
