// L8: safety. Lone tree / open field = bad, building and metal car = good; wait 30 minutes after the last thunder.
import * as THREE from 'three'
import { C, F, clamp, ease, el, lerp, seg } from '../kit'
import { V, cam, cloud, ground, makeBolt, overlay, place, scenery, setupSky, strike, tag } from '../lightkit'
import type { SceneDef } from '../types'

export default {
  theme: 'dark',
  type: { pos: 'bottom', size: 54, width: 1560 },
  create(ctx) {
    const sky = setupSky(ctx, { bg: '#080c18', fog: 110 }), fade = overlay(ctx.dom)
    ctx.stage.camera.fov = 50; ctx.stage.camera.updateProjectionMatrix()
    ground(ctx.root, 0, 500)
    const sc = scenery(ctx.root)
    sc.tree(-14, -30, 2.2); sc.house(12, -32, 1.8)
    // car
    const car = new THREE.Group(); car.position.set(44, 0, -30); car.scale.setScalar(1.8); ctx.root.add(car)
    const cm = new THREE.MeshBasicMaterial({ color: '#34476b' })
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(6, 1.3, 2.6), cm); b1.position.y = 0.95; car.add(b1)
    const b2 = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.1, 2.4), cm); b2.position.set(-0.2, 2.1, 0); car.add(b2)
    for (const x of [-1.9, 1.9]) for (const z of [-1.3, 1.3]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 14), new THREE.MeshBasicMaterial({ color: '#070a10' })); w.rotation.x = Math.PI / 2; w.position.set(x, 0.55, z); car.add(w) }
    for (const z of [-0.8, 0.8]) { const hl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.25, 0.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.0, 1.2) })); hl.position.set(3.05, 1.0, z); car.add(hl) }
    const skin = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(6.15, 1.45, 2.75)), new THREE.LineBasicMaterial({ color: new THREE.Color(1.4, 1.2, 0.4), transparent: true, opacity: 0 })); skin.position.y = 0.95; car.add(skin)
    const inner = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 1.1, 0.5), transparent: true, opacity: 0, blending: THREE.AdditiveBlending })); inner.position.y = 1.7; car.add(inner)
    const cl = cloud(ctx.root, { seed: 71, n: 160, z: -40, y0: 34, y1: 56, w: 80, depth: 22 })
    const bTree = makeBolt(ctx.root, { seed: 81, from: V(-12, 36, -34), to: V(-14, 7.6, -30), width: 0.22, branches: 5 })
    const bCar = makeBolt(ctx.root, { seed: 82, from: V(42, 36, -34), to: V(44, 3.6, -30), width: 0.22, branches: 5 })
    const tBad = tag(ctx.dom, '✗ ใต้ต้นไม้โดดเดี่ยว / กลางที่โล่ง', '#ff4d52', 38), tOk = tag(ctx.dom, '✓ เข้าอาคาร', '#3ddc84', 38), tCar = tag(ctx.dom, '✓ รถตัวถังโลหะปิดมิดชิด', '#3ddc84', 38)
    const tFlow = tag(ctx.dom, 'กระแสไหลผ่านผิวนอก', C.accent, 36)
    const wait = el('div', 'position:absolute;left:0;right:0;top:170px;text-align:center;opacity:0', ctx.dom,
      `<div style="display:inline-block;position:relative"><svg width="300" height="300" viewBox="0 0 300 300"><circle cx="150" cy="150" r="136" fill="none" stroke="#2E3442" stroke-width="12"/>
        <path id="arc" d="" fill="none" stroke="#FFE14A" stroke-width="12" stroke-linecap="round"/>
        <line id="hand" x1="150" y1="150" x2="150" y2="42" stroke="#F4F6FA" stroke-width="8" stroke-linecap="round"/></svg></div>
       <div style="font:800 90px/1.1 ${F.display};color:${C.white}">รอ 30 นาที</div>
       <div style="font:600 42px ${F.display};color:${C.accent}">หลังได้ยินเสียงฟ้าร้องครั้งสุดท้าย</div>`)
    const arc = wait.querySelector('#arc') as SVGPathElement, hand = wait.querySelector('#hand') as SVGLineElement
    let L1 = -1, L2 = -1
    return {
      update(f) {
        const t = f.local
        if (L1 < 0) { L1 = f.lines[1] ? f.lines[1].start - (f.t - f.local) : f.dur * 0.4; L2 = f.lines[2] ? f.lines[2].start - (f.t - f.local) : f.dur * 0.7 }
        const pan = ease.inOut(seg(t, L1 - 0.6, L1 + 0.8))
        cam(ctx.stage.camera, 0, [lerp(-1, 40, pan), 10, lerp(44, 36, pan)], [0, 0, 0], [lerp(0, 44, pan), 5, -30], [0, 0, 0], t)
        const s1 = strike(t, 2.6, 0.5, 10), s2 = strike(t, L1 + 1.8, 0.5, 10)
        bTree.update(s1.leader, s1.flash, s1.fade); bCar.update(s2.leader, s2.flash, s2.fade)
        const flash = Math.max(s1.flash, s2.flash)
        sky(flash * 0.75); sc.lightK(flash); cl.setLight(0.07 + flash * 0.7)
        const hit = clamp((t - (L1 + 1.8 + 0.5)) / 0.4)
        ;(skin.material as THREE.LineBasicMaterial).opacity = hit > 0 ? Math.max(0, 1 - (t - (L1 + 2.3)) / 3.0) : 0
        ;(inner.material as THREE.MeshBasicMaterial).opacity = hit > 0 ? 0.18 + 0.05 * Math.sin(t * 3) : 0
        place(ctx.stage.camera, tBad, V(-14, 9, -30), ease.out(seg(t, 1.0, 1.6)) * (1 - pan), 0, -10)
        place(ctx.stage.camera, tOk, V(12, 6.4, -32), ease.out(seg(t, 4.2, 4.8)) * (1 - pan), 0, 0)
        place(ctx.stage.camera, tCar, V(44, 7.4, -30), ease.out(seg(t, L1 + 0.8, L1 + 1.4)) * (1 - ease.out(seg(t, L2 - 0.3, L2 + 0.3))), 0, -10)
        place(ctx.stage.camera, tFlow, V(44, 4.6, -28), ease.out(seg(t, L1 + 3.2, L1 + 3.8)) * (1 - ease.out(seg(t, L2 - 0.3, L2 + 0.3))), 0, 30)
        const w = f.li >= 2 ? ease.out(seg(f.lp, 0.0, 0.2)) : 0
        wait.style.opacity = String(w)
        const prog = f.li >= 2 ? clamp(seg(f.lp, 0.15, 0.95)) : 0, ang = prog * Math.PI * 2
        arc.setAttribute('d', prog > 0.001 ? `M150 14 A136 136 0 ${prog > 0.5 ? 1 : 0} 1 ${150 + 136 * Math.sin(ang)} ${150 - 136 * Math.cos(ang)}` : '')
        hand.setAttribute('x2', String(150 + 108 * Math.sin(ang))); hand.setAttribute('y2', String(150 - 108 * Math.cos(ang)))
        fade(t, f.dur, 0.5)
      },
    }
  },
} satisfies SceneDef
