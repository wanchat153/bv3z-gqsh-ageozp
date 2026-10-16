// Ink Samurai + Mochi as flat painted parts (rendered by the kit's own ink engine) placed in a three.js perspective scene.
import * as THREE from 'three'
export const INKC = '#161312'
const loader = new THREE.TextureLoader()
export type Meta = Record<string, { x: number; y: number; w: number; h: number }>
export class Assets {
  meta!: Meta; tex: Record<string, THREE.Texture> = {}
  async load() {
    this.meta = await (await fetch('/ink2/meta.json')).json()
    await Promise.all(Object.keys(this.meta).map(async n => {
      const ext = n.endsWith('_mul') || ['hills', 'toro', 'tree'].includes(n) ? 'jpg' : 'png'
      const file = ['hills', 'toro', 'tree'].includes(n) ? `${n}_mul.jpg` : `${n}.${ext}`
      const t = await loader.loadAsync(`/ink2/${file}`); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; this.tex[n] = t
    }))
    for (const n of ['paper', 'grain', 'fib', 'vig']) { const t = await loader.loadAsync(`/ink2/paper_${n}.png`); t.colorSpace = THREE.SRGBColorSpace; this.tex['paper_' + n] = t }
    return this
  }
}
/** a flat painted layer. (ax, ay) = the pixel of the layer that should land on the sprite's world position; k = world units per pixel */
export function layer(A: Assets, name: string, ax: number, ay: number, k: number, opts: { mul?: boolean; order?: number } = {}) {
  const m = A.meta[name], w = m.w * k, h = m.h * k
  const mat = new THREE.MeshBasicMaterial({ map: A.tex[name], transparent: true, depthWrite: false, alphaTest: opts.mul ? 0 : 0.01 })
  if (opts.mul) mulBlend(mat)
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); mesh.renderOrder = opts.order ?? 0
  const g = new THREE.Group(); mesh.position.set(((m.x + m.w / 2) - ax) * k, -((m.y + m.h / 2) - ay) * k, 0); g.add(mesh); return { g, mesh, mat }
}
export function mulBlend(m: THREE.Material) { m.blending = THREE.CustomBlending; m.blendEquation = THREE.AddEquation; m.blendSrc = THREE.DstColorFactor; m.blendDst = THREE.ZeroFactor; m.blendSrcAlpha = THREE.ZeroFactor; m.blendDstAlpha = THREE.OneFactor; m.premultipliedAlpha = false }
const flat = (c: string) => new THREE.MeshBasicMaterial({ color: c })
/** ink limb: a tube along a quadratic curve + round end */
function tube(r: number, z: number) {
  const g = new THREE.Group(), body = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(), new THREE.Vector3(1, 0, 0)), 2, r, 8), flat(INKC))
  g.add(body); return g
}
export function samurai(A: Assets, S: number, order = 0) {
  const k = S / 300, root = new THREE.Group()
  const ax = 600, ay = 520   // body centre in layer pixels
  const body = layer(A, 'sam_body', ax, ay, k, { order }); const over = layer(A, 'sam_over', ax, ay, k, { order: order + 4 })
  const eyeNames = ['open', 'half', 'happy', 'angry', 'sad', 'wide', 'up', 'side'], eyes: Record<string, ReturnType<typeof layer>> = {}
  for (const n of eyeNames) { eyes[n] = layer(A, 'eyes_' + n, ax, ay, k, { order: order + 5 }); eyes[n].g.visible = false; root.add(eyes[n].g) }
  root.add(body.g, over.g)
  const mkLimb = (r: number) => { const m = new THREE.Mesh(new THREE.BufferGeometry(), flat(INKC)); m.renderOrder = order + 2; root.add(m); return m }
  const arms = [mkLimb(0), mkLimb(0)], legs = [mkLimb(0), mkLimb(0)]
  const hands = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.CircleGeometry(S * 0.16, 24), flat(INKC)); m.renderOrder = order + 3; root.add(m); return m })
  const feet = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.CircleGeometry(1, 24), flat(INKC)); m.scale.set(S * 0.19, S * 0.085, 1); m.renderOrder = order + 2; root.add(m); return m })
  const P = (x: number, y: number) => new THREE.Vector3(x * S, -y * S, 0)    // local, y down like the kit
  function strokeGeo(pts: THREE.Vector3[], w: number) {
    const N = pts.length, pos: number[] = [], idx: number[] = []
    for (let i = 0; i < N; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N - 1, i + 1)], d = b.clone().sub(a).normalize(), n = new THREE.Vector3(-d.y, d.x, 0).multiplyScalar(w / 2)
      pos.push(pts[i].x + n.x, pts[i].y + n.y, 0, pts[i].x - n.x, pts[i].y - n.y, 0); if (i < N - 1) { const j = i * 2; idx.push(j, j + 1, j + 2, j + 1, j + 3, j + 2) } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g
  }
  const quad = (a: THREE.Vector3, m: THREE.Vector3, b: THREE.Vector3, n = 14) => Array.from({ length: n + 1 }, (_, i) => { const u = i / n; return a.clone().multiplyScalar((1 - u) ** 2).add(m.clone().multiplyScalar(2 * u * (1 - u))).add(b.clone().multiplyScalar(u * u)) })
  /** pose: hands = world offsets relative to the body centre, in S units (x right, y UP). walk = phase or null. face = ±1 */
  function pose(o: { handL?: [number, number]; handR?: [number, number]; walk?: number | null; eyes?: string; look?: number; face?: number } = {}) {
    const f = o.face ?? 1; root.scale.x = f
    const hL = o.handL ?? [-1.36, -0.88], hR = o.handR ?? [1.36, -0.88]   // y up: -0.88 = below centre
    ;[[-0.85, hL], [0.85, hR]].forEach(([sx, h], i) => { const sh = new THREE.Vector3((sx as number) * S, -0.5 * S, 0), hd = new THREE.Vector3((h as number[])[0] * S, (h as number[])[1] * S, 0), mid = sh.clone().add(hd).multiplyScalar(0.5).add(new THREE.Vector3(0, -0.07 * S, 0))
      arms[i].geometry.dispose(); arms[i].geometry = strokeGeo(quad(sh, mid, hd), S * 0.15); hands[i].position.copy(hd) })
    ;[-1, 1].forEach((kk, i) => { const hip = new THREE.Vector3(kk * 0.42 * S, -1.12 * S, 0); let fx = hip.x + kk * S * 0.03, fy = hip.y - S * 0.34
      if (o.walk != null) { const p = o.walk + (kk > 0 ? 0 : Math.PI); fx = hip.x + Math.sin(p) * S * 0.28 + kk * S * 0.03; fy = -1.58 * S + S * 0.1 + Math.max(0, Math.cos(p)) * S * 0.14 }
      const foot = new THREE.Vector3(fx, fy, 0); legs[i].geometry.dispose(); legs[i].geometry = strokeGeo([hip, hip.clone().lerp(foot, 0.5), foot], S * 0.17)
      feet[i].position.set(fx + S * 0.07, fy - S * 0.03, 0) })
    for (const n of eyeNames) eyes[n].g.visible = n === (o.eyes ?? 'open')
    const e = eyes[o.eyes ?? 'open']; e.g.position.x = (o.look ?? 0) * S * 0.04
  }
  pose()
  return { root, pose, S, handWorld: (h: THREE.Vector3) => h }
}
const CATFRAMES = { walk: 12, sitTail: 8 }
export function mochi(A: Assets, S: number, order = 0) {
  const k = (S / 300) * 1.0, root = new THREE.Group(), frames: Record<string, ReturnType<typeof layer>> = {}
  for (const n of Object.keys(A.meta).filter(n => n.startsWith('cat_'))) { frames[n] = layer(A, n, 960, 900, k, { order }); frames[n].g.visible = false; root.add(frames[n].g) }
  let cur = ''
  function show(name: string, face = -1) { if (cur && frames[cur]) frames[cur].g.visible = false; cur = name; frames[name].g.visible = true; root.scale.x = face }
  show('cat_sit'); return { root, show, k }
}
