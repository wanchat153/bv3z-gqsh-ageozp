// L7: tall towers are struck again and again (myth: never twice); the lightning rod + ground wire gives current a safe path.
import * as THREE from 'three'
import { C, F, clamp, ease, el, lerp, seg } from '../kit'
import { V, cam, cloud, ground, makeBolt, overlay, place, scenery, setupSky, strike, tag } from '../lightkit'
import type { SceneDef } from '../types'

const TOP = 24
export default {
  theme: 'dark',
  type: { pos: 'bottom', size: 54, width: 1560 },
  create(ctx) {
    const sky = setupSky(ctx, { bg: '#080c18', fog: 110 }), fade = overlay(ctx.dom)
    ctx.stage.camera.fov = 50; ctx.stage.camera.updateProjectionMatrix()
    ground(ctx.root, 0, 500)
    const sc = scenery(ctx.root)
    sc.tower(-22, -48, 9, 4); sc.tower(24, -50, 12, 4); sc.house(-6, -30, 1.4); sc.house(10, -26, 1.1)
    // the tall building: stepped box tower with a rod on top
    const bm = new THREE.MeshBasicMaterial({ color: '#0f1726' })
    const add = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); ctx.root.add(o); return o }
    add(new THREE.BoxGeometry(7, 16, 7), bm, 0, 8, -42); add(new THREE.BoxGeometry(5, 5, 5), bm, 0, 18.5, -42); add(new THREE.BoxGeometry(3, 3, 3), bm, 0, 22.5, -42)
    for (let y = 2; y < 22; y += 2.2) for (const x of [-2, 0, 2]) add(new THREE.PlaneGeometry(0.7, 0.9), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.1, 0.5) }), x, y, -38.45)
    const rodM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 1.7, 0.6) })
    add(new THREE.CylinderGeometry(0.07, 0.12, 4.5, 8), rodM, 0, TOP + 2.2, -42)
    const cable = new THREE.Mesh(new THREE.BoxGeometry(0.16, TOP + 3, 0.16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.28, 0.1) })); cable.position.set(3.7, (TOP + 3) / 2 - 2.5, -42); ctx.root.add(cable)
    const pulse = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.2, 0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.0, 0.8), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); ctx.root.add(pulse)
    const earth = add(new THREE.CylinderGeometry(0.5, 0.5, 0.15, 16), new THREE.MeshBasicMaterial({ color: '#cfa84a' }), 3.7, 0.1, -42)
    const cl = cloud(ctx.root, { seed: 51, n: 150, z: -45, y0: 34, y1: 56, w: 56, depth: 20 })
    const bolts = Array.from({ length: 6 }, (_, i) => makeBolt(ctx.root, { seed: 60 + i, from: V((i - 2.5) * 5, 36, -44), to: V(0, TOP + 4.4, -42), width: 0.2, branches: 5, jag: 0.06 }))
    const hits = [0.8, 2.4, 3.9, 5.2, 6.4, 7.5]
    const count = el('div', 'position:absolute;right:130px;top:120px;text-align:right;opacity:0', ctx.dom,
      `<div style="font:700 40px ${F.display};color:${C.white}">ตึกสูงโดนฟ้าผ่า</div>
       <div id="n" style="font:800 150px/1.05 ${F.display};color:${C.accent}">0</div><div style="font:600 40px ${F.display};color:${C.white}">ครั้ง / ปี (โดยประมาณ)</div>`)
    const nEl = count.querySelector('#n') as HTMLElement
    const tRod = tag(ctx.dom, 'เสาล่อฟ้า (แท่งโลหะ)', C.accent), tWire = tag(ctx.dom, 'สายลงดิน', C.blue), tEarth = tag(ctx.dom, 'ฝังลงดิน', C.white, 36)
    let L1 = -1
    return {
      update(f) {
        const t = f.local
        if (L1 < 0) L1 = f.lines[1] ? f.lines[1].start - (f.t - f.local) : f.dur * 0.5
        const t2 = t - L1
        cam(ctx.stage.camera, ease.inOut(seg(t, L1 - 0.5, L1 + 1.5)), [0, 16, 52], [4, 14, 28], [0, 22, -42], [2, 10, -42], t)
        let flash = 0
        const extra = strike(t, L1 + 3.0, 0.5, 10)
        bolts.forEach((b, i) => {
          const s = i < 5 ? strike(t, hits[i], 0.45, 10) : (i === 5 ? extra : strike(t, 99, 0.45))
          b.update(s.leader, s.flash, s.fade); flash = Math.max(flash, s.flash)
        })
        sky(flash * 0.75); sc.lightK(flash); cl.setLight(0.08 + flash * 0.7)
        // counter ticks up with each strike: 20 at the end of line 1
        const nHit = hits.slice(0, 5).filter(h => t > h + 0.45).length
        nEl.textContent = String(Math.round(lerp(0, 20, clamp((nHit + seg(t, hits[Math.min(nHit, 4)], hits[Math.min(nHit, 4)] + 0.45) * (nHit < 5 ? 1 : 0)) / 5))))
        count.style.opacity = String(ease.out(seg(t, 0.3, 1.0)) * (1 - ease.out(seg(t, L1 - 0.4, L1 + 0.3))))
        // current travels down the ground wire after the strike on the rod
        const q = clamp((t - (L1 + 3.0 + 0.55)) / 0.5)
        ;(pulse.material as THREE.MeshBasicMaterial).opacity = q > 0 && q < 1 ? 1 : 0
        pulse.position.set(3.7, lerp(TOP + 1, 0.5, ease.in(q)), -42)
        const w = ease.out(seg(t2, 0.8, 1.4))
        place(ctx.stage.camera, tRod, V(0, TOP + 4.6, -42), w, 20, 0)
        place(ctx.stage.camera, tWire, V(3.7, 14, -42), ease.out(seg(t2, 1.6, 2.2)), 30, 0)
        place(ctx.stage.camera, tEarth, V(3.7, 0.4, -42), ease.out(seg(t2, 2.2, 2.8)), 30, 0)
        fade(t, f.dur, 0.5)
      },
    }
  },
} satisfies SceneDef
