// L6: thunder = shock wave of superheated air; light arrives first, sound (340 m/s) later; seconds / 3 = km.
import * as THREE from 'three'
import { C, F, clamp, ease, el, lerp, seg } from '../kit'
import { V, cam, cloud, ground, makeBolt, overlay, place, scenery, setupSky, strike, tag } from '../lightkit'
import type { SceneDef } from '../types'

export default {
  theme: 'dark',
  type: { pos: 'bottom', size: 54, width: 1560 },
  create(ctx) {
    const sky = setupSky(ctx, { bg: '#080c18', fog: 130 }), fade = overlay(ctx.dom)
    ctx.stage.camera.fov = 52; ctx.stage.camera.updateProjectionMatrix()
    ground(ctx.root, 0, 600)
    const sc = scenery(ctx.root)
    sc.house(-30, 4, 1.1)
    for (let i = 0; i < 5; i++) sc.tree(-44 + i * 6, 8 - (i % 2) * 4, 1)
    const cl = cloud(ctx.root, { seed: 41, n: 150, x: 30, z: -50, y0: 30, y1: 52, w: 50, depth: 22 })
    const BX = 30, BZ = -42
    const bolt = makeBolt(ctx.root, { seed: 23, from: V(BX, 34, BZ), to: V(BX, 0, BZ), width: 0.28, branches: 7 })
    const bolt2 = makeBolt(ctx.root, { seed: 24, from: V(BX + 3, 34, BZ), to: V(BX + 3, 0, BZ), width: 0.28, branches: 7 })
    const shells = [0, 1, 2].map(i => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 34, 36, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 0.9, 1.4), transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }))
      m.position.set(BX, 17, BZ); ctx.root.add(m); return m
    })
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.1, 0.4), transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }))
    ring.rotation.x = -Math.PI / 2; ring.position.set(BX, 0.1, BZ); ctx.root.add(ring)
    const me = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1.2, 4, 8), new THREE.MeshBasicMaterial({ color: '#cfd8ee' })); me.position.set(-12, 1.1, BZ); ctx.root.add(me)
    const tShock = tag(ctx.dom, 'คลื่นกระแทก = เสียงฟ้าร้อง', C.accent), tLight = tag(ctx.dom, 'แสงมาถึงทันที', C.white, 38), tSnd = tag(ctx.dom, 'เสียง ≈ 340 ม./วินาที', C.blue, 38)
    const clock = el('div', 'position:absolute;left:120px;top:110px;opacity:0', ctx.dom,
      `<div id="s" style="font:800 150px/1 ${F.display};color:${C.white}"></div>
       <div id="k" style="margin-top:8px;font:700 56px ${F.display};color:${C.accent}"></div>`)
    const sEl = clock.querySelector('#s') as HTMLElement, kEl = clock.querySelector('#k') as HTMLElement
    let LB = -1, LC = -1
    return {
      update(f) {
        const t = f.local
        if (LB < 0) { LB = f.lines[1] ? f.lines[1].start - (f.t - f.local) : f.dur * 0.3; LC = f.lines[2] ? f.lines[2].start - (f.t - f.local) : f.dur * 0.65 }
        // strikes: one near the start (rings), one when line 2 begins (timing the sound)
        const s1 = strike(t, 0.6, 0.5, 10), s2 = strike(t, LB + 0.3, 0.5, 10)
        bolt.update(s1.leader, s1.flash, s1.fade); bolt2.update(t < LB ? 0 : s2.leader, t < LB ? 0 : s2.flash, s2.fade)
        const flash = Math.max(s1.flash, t >= LB ? s2.flash : 0)
        sky(flash * 0.8); sc.lightK(flash); cl.setLight(0.08 + flash * 0.7)
        // shock shells expand around the channel
        const a = Math.max(0, t - (0.6 + 0.5))
        shells.forEach((m, i) => { const q = a - i * 0.55; const r = 0.5 + Math.max(0, q) * 3.2; m.scale.set(r, 1, r); (m.material as THREE.MeshBasicMaterial).opacity = q > 0 ? 0.35 * Math.exp(-q * 0.7) * (t < LB ? 1 : 0) : 0 })
        // sound front on the ground (slowed down): reaches the observer ~8 s after the flash
        const tau = Math.max(0, t - (LB + 0.3 + 0.5)), D = BX + 12, v = D / 8.1
        ring.scale.set(Math.max(0.01, tau * v), Math.max(0.01, tau * v), 1)
        ;(ring.material as THREE.MeshBasicMaterial).opacity = t < LB + 0.8 ? 0 : (tau * v < D ? 0.9 : 0.9 * Math.exp(-(tau * v - D) * 0.6))
        const e = seg(t, 0, f.dur)
        cam(ctx.stage.camera, ease.inOut(seg(t, LB - 1, LB + 1)), [20, 12, 46], [8, 40, 26], [30, 16, -42], [9, 0, -42], t)
        place(ctx.stage.camera, tShock, V(BX, 20, BZ), ease.out(seg(t, 3.2, 3.8)) * (t < LB ? 1 : 0), 40, 0)
        place(ctx.stage.camera, tLight, V(-12, 3.6, BZ), ease.out(seg(t, LB + 0.5, LB + 1.0)), 0, 0)
        place(ctx.stage.camera, tSnd, V(BX - tau * v * 0.8, 1, BZ + tau * v * 0.2), ease.out(seg(t, LB + 1.5, LB + 2.0)), 0, -10)
        const secs = t < LB + 0.8 ? 0 : Math.min(9, (t - (LB + 0.8)) * 1.0)
        const show = f.li >= 1 ? ease.out(seg(t, LB + 0.8, LB + 1.4)) : 0
        clock.style.opacity = String(show)
        sEl.textContent = `${secs.toFixed(1)} วินาที`
        kEl.textContent = f.li >= 2 ? `${Math.floor(secs)} ÷ 3 ≈ ${(Math.floor(secs) / 3).toFixed(1)} กม.` : 'เสียงเดินทาง ≈ 1 กม. ทุก 3 วินาที'
        fade(t, f.dur, 0.5)
      },
    }
  },
} satisfies SceneDef
