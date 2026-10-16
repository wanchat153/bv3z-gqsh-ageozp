// Shared kit for the lightning episode: storm sky, soft clouds, branching bolts (leader steps + return stroke),
// charge glyphs, simple landscape silhouettes, camera/overlay helpers. Everything is a pure function of time.
import * as THREE from 'three'
import { C, F, canvasTexture, clamp, ease, el, lerp, rng, seg } from './kit'
import type { SceneCtx } from './types'

export { tag, place } from './serverkit'
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
export { V }

/** background + fog + far plane; returns a setter that lights the sky during a flash (k 0..1). */
export function setupSky(ctx: SceneCtx, o: { bg?: string; fog?: number } = {}) {
  const { stage } = ctx
  const base = new THREE.Color(o.bg ?? '#070a14')
  const bg = base.clone()
  stage.scene.background = bg
  stage.scene.fog = o.fog ? new THREE.Fog(base.clone(), o.fog, o.fog * 6) : null
  stage.camera.far = 900; stage.camera.updateProjectionMatrix()
  const hot = new THREE.Color('#9fb4ff')
  return (k: number) => {
    bg.copy(base).lerp(hot, clamp(k) * 0.5)
    if (stage.scene.fog) (stage.scene.fog as THREE.Fog).color.copy(bg)
  }
}

/** black fade layer + vignette + caption shade. fade(local, dur, fadeIn, fadeOut) */
export function overlay(dom: HTMLElement) {
  el('div', 'position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 55%,rgba(0,0,0,.55) 100%)', dom)
  el('div', 'position:absolute;left:0;right:0;bottom:0;height:300px;background:linear-gradient(rgba(0,0,0,0),rgba(0,0,0,.72))', dom)
  const black = el('div', 'position:absolute;inset:0;background:#000;opacity:1', dom)
  return (local: number, dur: number, fadeIn = 0.4, fadeOut = 0) => {
    black.style.opacity = String(Math.max(1 - ease.out(seg(local, 0, fadeIn)), fadeOut > 0 ? seg(local, dur - fadeOut, dur) : 0))
  }
}

/** glowing label card. pos is a css string. */
export function card(dom: HTMLElement, title: string, sub: string, css: string, size = 96) {
  return el('div', `position:absolute;${css};opacity:0`, dom,
    `<div style="font:800 ${size}px/1.1 ${F.display};color:${C.white}">${title}</div>
     <div style="margin-top:6px;font:600 ${Math.round(size * 0.46)}px ${F.display};color:${C.accent}">${sub}</div>`)
}

/** gentle camera move: position and look-at target interpolated by e (0..1) with a tiny handheld sway */
export function cam(c: THREE.PerspectiveCamera, e: number, p0: number[], p1: number[], l0: number[], l1: number[], t = 0, sway = 1) {
  const k = ease.inOut(clamp(e))
  c.position.set(lerp(p0[0], p1[0], k) + 0.02 * Math.sin(t * 1.3) * sway, lerp(p0[1], p1[1], k) + 0.02 * Math.sin(t * 1.7) * sway, lerp(p0[2], p1[2], k))
  c.lookAt(lerp(l0[0], l1[0], k), lerp(l0[1], l1[1], k), lerp(l0[2], l1[2], k))
}

// ---------------------------------------------------------------- clouds
const puffTex = () => canvasTexture(128, 128, g => {
  const r = g.createRadialGradient(64, 64, 4, 64, 64, 62)
  r.addColorStop(0, 'rgba(255,255,255,0.95)'); r.addColorStop(0.45, 'rgba(255,255,255,0.45)'); r.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = r; g.fillRect(0, 0, 128, 128)
})

export interface CloudOpts { seed?: number; n?: number; x?: number; z?: number; y0: number; y1: number; w: number; depth?: number; anvil?: number; size?: number; tint?: string }
/** cumulonimbus built from soft sprites; setLight(k) brightens it (inner glow from lightning) */
export function cloud(root: THREE.Group, o: CloudOpts) {
  const R = rng(o.seed ?? 3), tex = puffTex(), n = o.n ?? 140, g = new THREE.Group(); root.add(g)
  const dark = new THREE.Color(o.tint ?? '#2a3246'), lit = new THREE.Color('#c9d6ff')
  const sprites: THREE.Sprite[] = [], hs: number[] = []
  for (let i = 0; i < n; i++) {
    const h = Math.pow(R(), 0.8)
    const flare = (o.anvil ?? 1) * Math.max(0, h - 0.74) * 4.2
    const rad = o.w * (0.32 + 0.22 * Math.sin(h * 2.2) + flare)
    const m = new THREE.SpriteMaterial({ map: tex, color: dark.clone(), transparent: true, opacity: 0.5 + R() * 0.35, depthWrite: false, fog: false })
    const s = new THREE.Sprite(m)
    const sz = (o.size ?? 1) * (o.w * 0.2 + R() * o.w * 0.22) * (h > 0.8 ? 1.2 : 1)
    s.scale.set(sz * 1.3, sz, 1)
    s.position.set((o.x ?? 0) + (R() - 0.5) * 2 * rad, lerp(o.y0, o.y1, h) + (R() - 0.5) * o.w * 0.06, (o.z ?? 0) + (R() - 0.5) * (o.depth ?? o.w * 0.5))
    g.add(s); sprites.push(s); hs.push(h)
  }
  return {
    group: g,
    setLight(k: number, low = 0) {
      sprites.forEach((s, i) => (s.material as THREE.SpriteMaterial).color.copy(dark).lerp(lit, clamp(k * (0.5 + 0.5 * (1 - Math.abs(hs[i] - low)))) * 0.9))
    },
  }
}

// ---------------------------------------------------------------- bolts
interface BSeg { a: THREE.Vector3; b: THREE.Vector3; birth: number; level: number }
function path(a: THREE.Vector3, b: THREE.Vector3, depth: number, jag: number, R: () => number): THREE.Vector3[] {
  let pts = [a.clone(), b.clone()]
  let amp = a.distanceTo(b) * jag
  for (let d = 0; d < depth; d++) {
    const next: THREE.Vector3[] = [pts[0]]
    for (let i = 0; i < pts.length - 1; i++) {
      const m = pts[i].clone().add(pts[i + 1]).multiplyScalar(0.5)
      m.x += (R() - 0.5) * 2 * amp; m.z += (R() - 0.5) * 2 * amp * 0.6; m.y += (R() - 0.5) * amp * 0.4
      next.push(m, pts[i + 1])
    }
    pts = next; amp *= 0.55
  }
  return pts
}

export interface Bolt { group: THREE.Group; update(leader: number, flash: number, fade?: number, tint?: THREE.Color): void; segs: number; tip(leader: number): THREE.Vector3 }
/** Branching bolt from `from` to `to`. birth is the 0..1 growth order (distance from the root). */
export function makeBolt(root: THREE.Group, o: { seed: number; from: THREE.Vector3; to: THREE.Vector3; width?: number; branches?: number; jag?: number; depth?: number }): Bolt {
  const R = rng(o.seed), segs: BSeg[] = []
  const main = path(o.from, o.to, o.depth ?? 6, o.jag ?? 0.075, R)
  const dist: number[] = [0]
  for (let i = 1; i < main.length; i++) dist.push(dist[i - 1] + main[i].distanceTo(main[i - 1]))
  const total = dist[dist.length - 1]
  main.forEach((p, i) => { if (i) segs.push({ a: main[i - 1], b: p, birth: dist[i] / total, level: 0 }) })
  const addBranch = (start: THREE.Vector3, d0: number, dir: THREE.Vector3, len: number, level: number) => {
    const end = start.clone().add(dir.clone().multiplyScalar(len))
    const pts = path(start, end, level === 1 ? 4 : 3, 0.12, R)
    let d = d0
    for (let i = 1; i < pts.length; i++) {
      d += pts[i].distanceTo(pts[i - 1])
      segs.push({ a: pts[i - 1], b: pts[i], birth: Math.min(1, d / total), level })
      if (level === 1 && R() < 0.06) addBranch(pts[i], d, dir.clone().add(V((R() - 0.5) * 1.2, 0, (R() - 0.5) * 0.8)).normalize(), len * 0.4, 2)
    }
  }
  const down = o.to.clone().sub(o.from).normalize()
  for (let b = 0; b < (o.branches ?? 7); b++) {
    const i = Math.floor(lerp(6, main.length - 12, R()))
    const dir = down.clone().add(V((R() - 0.5) * 2.2, 0, (R() - 0.5) * 1.2)).normalize()
    addBranch(main[i], dist[i], dir, (total - dist[i]) * (0.18 + 0.3 * R()), 1)
  }

  const w = o.width ?? 0.05, group = new THREE.Group(); root.add(group)
  const mk = (scale: number) => {
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), segs.length)
    m.frustumCulled = false
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(segs.length * 3), 3)
    const d = new THREE.Object3D(), up = V(0, 1, 0)
    segs.forEach((s, i) => {
      const dir = s.b.clone().sub(s.a), len = dir.length()
      d.position.copy(s.a).add(s.b).multiplyScalar(0.5)
      d.quaternion.setFromUnitVectors(up, dir.normalize())
      const ww = w * (s.level === 0 ? 1 : s.level === 1 ? 0.5 : 0.3) * scale
      d.scale.set(ww, len * 1.15, ww); d.updateMatrix(); m.setMatrixAt(i, d.matrix)
    })
    group.add(m); return m
  }
  const core = mk(1), glow = mk(5)
  const lead = new THREE.Color(0.55, 0.75, 1.5), white = new THREE.Color(1.5, 1.45, 1.8)
  return {
    group, segs: segs.length,
    tip(leader: number) {
      let best = o.from, bb = -1
      for (const s of segs) if (s.level === 0 && s.birth <= leader && s.birth > bb) { bb = s.birth; best = s.b }
      return best
    },
    update(leader, flash, fade = 1, tint) {
      const cc = core.instanceColor!, gc = glow.instanceColor!
      segs.forEach((s, i) => {
        const vis = s.birth <= leader ? 1 : 0
        const age = leader - s.birth
        let b = vis * (0.35 + 2.2 * Math.exp(-age * 18)) * fade * (s.level === 0 ? 1 : 0.7)
        let c = tint ?? lead
        if (flash > 0.001 && vis) { b = Math.max(b, flash * (s.level === 0 ? 3.2 : 1.7) * (0.7 + 0.3 * Math.sin(i * 12.9898))); c = white }
        cc.setXYZ(i, c.r * b, c.g * b, c.b * b)
        gc.setXYZ(i, c.r * b * 0.07, c.g * b * 0.07, c.b * b * 0.09)
      })
      cc.needsUpdate = true; gc.needsUpdate = true
    },
  }
}

/** timing of one strike starting at t0: stepped leader, then a flickering return stroke. */
export function strike(t: number, t0: number, leaderDur = 0.9, steps = 16) {
  if (t < t0) return { leader: 0, flash: 0, fade: 1 }
  const u = (t - t0) / leaderDur
  if (u < 1) {
    const s = u * steps, st = Math.floor(s)
    return { leader: (st + clamp((s - st) / 0.4)) / steps, flash: 0, fade: 1 }
  }
  const a = t - (t0 + leaderDur)
  const f = Math.exp(-a * 7) * (1 + 0.45 * Math.sin(a * 55)) + (a > 0.2 ? Math.exp(-(a - 0.2) * 10) * 0.8 : 0)
  return { leader: 1, flash: clamp(f, 0, 1.4), fade: Math.exp(-a * 2.4) }
}

// ---------------------------------------------------------------- charges
const glyph = (ch: string, col: string) => canvasTexture(64, 64, g => {
  g.fillStyle = col; g.beginPath(); g.arc(32, 32, 26, 0, 7); g.fill()
  g.fillStyle = '#fff'; g.fillRect(16, 28, 32, 8)
  if (ch === '+') g.fillRect(28, 16, 8, 32)
})
/** a cloud of +/- glyph sprites; positions set per frame with at(i, x, y, z) then flush() */
export function charges(root: THREE.Group, n: number, sign: '+' | '-', size: number) {
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3)
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: glyph(sign, sign === '+' ? '#ff5a64' : '#4f8cff'), size, sizeAttenuation: true, transparent: true, depthWrite: false, fog: false }))
  pts.frustumCulled = false; root.add(pts)
  return {
    pts,
    at(i: number, x: number, y: number, z: number) { pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z },
    flush() { (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true },
    opacity(k: number) { (pts.material as THREE.PointsMaterial).opacity = clamp(k) },
  }
}

/** small round particles (ice, snow, dots) as one Points object */
export function dots(root: THREE.Group, n: number, size: number, color: string, soft = true) {
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3)
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const map = canvasTexture(64, 64, g => {
    const r = g.createRadialGradient(32, 32, 2, 32, 32, 30)
    r.addColorStop(0, '#fff'); r.addColorStop(soft ? 0.5 : 0.9, 'rgba(255,255,255,0.9)'); r.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = r; g.fillRect(0, 0, 64, 64)
  })
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map, color, size, sizeAttenuation: true, transparent: true, depthWrite: false, fog: false }))
  pts.frustumCulled = false; root.add(pts)
  return {
    pts,
    at(i: number, x: number, y: number, z: number) { pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z },
    flush() { (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true },
    opacity(k: number) { (pts.material as THREE.PointsMaterial).opacity = clamp(k) },
  }
}

// ---------------------------------------------------------------- landscape
export function ground(root: THREE.Group, y = 0, size = 600, color = '#0a0f18') {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ color }))
  m.rotation.x = -Math.PI / 2; m.position.y = y; root.add(m)
  const grid = new THREE.GridHelper(size, size / 6, 0x1c2638, 0x121a29); grid.position.y = y + 0.02; root.add(grid)
  return m
}
/** dark silhouettes (house/tree/tower) that catch a little light during a flash */
export function scenery(root: THREE.Group) {
  const mats: { m: THREE.MeshBasicMaterial; base: THREE.Color }[] = []
  const basic = (c: string) => { const m = new THREE.MeshBasicMaterial({ color: c }); mats.push({ m, base: new THREE.Color(c) }); return m }
  const add = (mesh: THREE.Mesh, x: number, y: number, z: number) => { mesh.position.set(x, y, z); root.add(mesh); return mesh }
  const warm = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.2, 0.5), fog: false })
  const lightK = (k: number) => mats.forEach(({ m, base }) => m.color.copy(base).lerp(new THREE.Color('#8ea4d8'), clamp(k) * 0.55))
  return {
    lightK,
    house(x: number, z: number, s = 1, lit = true) {
      add(new THREE.Mesh(new THREE.BoxGeometry(3 * s, 2 * s, 2.4 * s), basic('#0d1320')), x, s, z)
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.4 * s, 1.4 * s, 4), basic('#0b101b')); roof.rotation.y = Math.PI / 4
      add(roof, x, 2 * s + 0.7 * s, z)
      if (lit) add(new THREE.Mesh(new THREE.PlaneGeometry(0.6 * s, 0.6 * s), warm), x + 0.4 * s, 1.1 * s, z + 1.21 * s)
    },
    tree(x: number, z: number, s = 1) {
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 1.6 * s, 6), basic('#0a0e16')), x, 0.8 * s, z)
      for (let i = 0; i < 3; i++) add(new THREE.Mesh(new THREE.ConeGeometry((1.5 - i * 0.35) * s, 2 * s, 7), basic('#0a121a')), x, (2 + i * 1.1) * s, z)
    },
    tower(x: number, z: number, h: number, w = 1.2) {
      add(new THREE.Mesh(new THREE.BoxGeometry(w, h, w), basic('#0e1522')), x, h / 2, z)
      add(new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, h * 0.18, w * 0.5), basic('#0e1522')), x, h + h * 0.09, z)
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, h * 0.22, 5), basic('#2a3550')), x, h + h * 0.28, z)
    },
  }
}

export const mix = (a: number, b: number, t: number) => a + (b - a) * t
