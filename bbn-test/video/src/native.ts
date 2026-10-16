// Native three.js characters: everything is built from three.js geometry + shaders. No images from the kit's 2D engine.
// The approved sheets are used only as a drawing reference (proportions / colours).
import * as THREE from 'three'
export const INK = '#171312', CREAM = '#efe7d3', RED = '#b3231c'
type P2 = [number, number]
const V = (p: P2) => new THREE.Vector2(p[0], p[1])

/** smooth closed outline through control points */
export function smoothLoop(pts: P2[], per = 10): THREE.Vector2[] {
  const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], 0)), true, 'centripetal')
  return c.getPoints(pts.length * per).map(v => new THREE.Vector2(v.x, v.y)).slice(0, -1)
}
export function smoothLine(pts: P2[], n = 24): THREE.Vector2[] {
  const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], 0)), false, 'centripetal')
  return c.getPoints(n).map(v => new THREE.Vector2(v.x, v.y))
}
/** ribbon along a polyline with per-point width (brush stroke) */
export function strokeGeo(pts: THREE.Vector2[], width: (u: number, i: number) => number, closed = false) {
  const q = closed ? [...pts, pts[0]] : pts, N = q.length, pos: number[] = [], idx: number[] = []
  for (let i = 0; i < N; i++) {
    const a = q[Math.max(0, i - 1)], b = q[Math.min(N - 1, i + 1)], d = b.clone().sub(a).normalize()
    const w = width(i / (N - 1), i) / 2
    pos.push(q[i].x - d.y * w, q[i].y + d.x * w, 0, q[i].x + d.y * w, q[i].y - d.x * w, 0)
    if (i < N - 1) { const j = i * 2; idx.push(j, j + 1, j + 2, j + 1, j + 3, j + 2) }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g
}
export const polyGeo = (pts: THREE.Vector2[]) => new THREE.ShapeGeometry(new THREE.Shape(pts))
const hash = (i: number) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }

/** radial gradient fill (colours given in sRGB) */
export function gradMat(c1: string, c2: string, ctr: P2, rad: number, opacity = 1) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false,
    uniforms: { c1: { value: new THREE.Color(c1).convertLinearToSRGB() }, c2: { value: new THREE.Color(c2).convertLinearToSRGB() }, ctr: { value: V(ctr) }, rad: { value: rad }, op: { value: opacity } },
    vertexShader: 'varying vec2 vp; void main(){ vp = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform vec3 c1,c2; uniform vec2 ctr; uniform float rad,op; varying vec2 vp; void main(){ float t = smoothstep(0.,1.,length(vp-ctr)/rad); gl_FragColor = vec4(mix(c1,c2,t), op); }',
  })
}
export const flat = (c: string, op = 1) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, depthWrite: false, depthTest: false })

/** sets render order in creation sequence so the 2D painter's order is kept inside the 3D scene */
class Painter {
  n = 0; constructor(public root: THREE.Object3D, public base: number) { }
  add(m: THREE.Mesh, parent: THREE.Object3D = this.root) { m.renderOrder = this.base + this.n++ * 0.01; parent.add(m); return m }
}
const mesh = (g: THREE.BufferGeometry, m: THREE.Material) => new THREE.Mesh(g, m)
const ellipse = (rx: number, ry: number, n = 40) => { const g = new THREE.CircleGeometry(1, n); g.scale(rx, ry, 1); return g }

// ------------------------------------------------------------------ ink samurai (units: S, y up; body centre = origin)
const BODY: P2[] = [[0, 2.05], [0.09, 1.85], [0.2, 1.6], [0.38, 1.3], [0.62, 1.0], [0.85, 0.7], [0.95, 0.4], [1.0, -0.1], [0.9, -0.65], [0.55, -0.98], [0, -1.07]]
const halfW = (y: number) => { for (let i = 0; i < BODY.length - 1; i++) { const a = BODY[i], b = BODY[i + 1]; if (y <= a[1] && y >= b[1]) return a[0] + (b[0] - a[0]) * (a[1] - y) / (a[1] - b[1]) } return 0 }
function bodyOutline(): THREE.Vector2[] {
  const right = BODY.map(p => [p[0], p[1]] as P2), left = BODY.slice(1, -1).reverse().map(p => [-p[0], p[1]] as P2)
  return smoothLoop([...right, ...left], 8)
}

export function samurai(S: number, base = 100) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.scale.setScalar(S)
  const P = new Painter(root, base)
  const addB = (m: THREE.Mesh) => P.add(m, body)
  const limbs = { arms: [] as THREE.Mesh[], legs: [] as THREE.Mesh[], hands: [] as THREE.Mesh[], feet: [] as THREE.Mesh[], joints: [] as THREE.Mesh[] }
  // legs & feet first (behind body)
  for (let i = 0; i < 2; i++) limbs.legs.push(addB(mesh(new THREE.BufferGeometry(), flat(INK))))
  for (let i = 0; i < 2; i++) limbs.feet.push(addB(mesh(ellipse(0.19, 0.085), flat(INK))))
  // body: ink drop, soft sheen toward upper-left, darker rim
  const outline = bodyOutline(), bodyMesh = addB(mesh(polyGeo(outline), gradMat('#2b2523', '#100d0c', [-0.35, 0.35], 1.5)))
  // glossy highlight on the point
  const hl = addB(mesh(ellipse(0.055, 0.13), flat('#a39d96', 0.75))); hl.position.set(0.2, 1.38, 0); hl.rotation.z = -0.38
  const hl2 = addB(mesh(ellipse(0.35, 0.16), flat('#ffffff', 0.05))); hl2.position.set(-0.3, 0.2, 0); hl2.rotation.z = 0.5
  // arms (in front of body edge, behind eyes), hands
  for (let i = 0; i < 2; i++) limbs.arms.push(addB(mesh(new THREE.BufferGeometry(), flat(INK))))
  for (let i = 0; i < 2; i++) limbs.hands.push(addB(mesh(ellipse(0.165, 0.165), flat(INK))))
  for (let i = 0; i < 2; i++) limbs.joints.push(addB(mesh(ellipse(0.075, 0.075), flat(INK))))
  // headband: ribbon wrapped around the head following the silhouette, + fluttering tail
  const yb = 0.66, hb = 0.2
  const band = addB(mesh(new THREE.BufferGeometry(), flat(RED)))
  const bandShade = addB(mesh(new THREE.BufferGeometry(), flat('#7d1612', 0.55)))
  const tail1 = addB(mesh(new THREE.BufferGeometry(), flat(RED))), tail2 = addB(mesh(new THREE.BufferGeometry(), flat('#9a1b16')))
  function drawBand(t: number, wind: number) {
    const xs = Array.from({ length: 21 }, (_, i) => -1 + i / 10), sag = (x: number) => -0.07 * (1 - x * x) + 0.02 * x
    const top: THREE.Vector2[] = [], bot: THREE.Vector2[] = []
    for (const u of xs) {
      const yt = yb + hb / 2, yb2 = yb - hb / 2
      const wt = halfW(yt + sag(u)) + 0.012, wb2 = halfW(yb2 + sag(u)) + 0.012
      top.push(new THREE.Vector2(u * wt, yt + sag(u))); bot.push(new THREE.Vector2(u * wb2, yb2 + sag(u)))
    }
    band.geometry.dispose(); band.geometry = polyGeo([...top, ...bot.reverse()])
    const shade = [...top.map(p => p.clone().add(new THREE.Vector2(0, -hb * 0.62)))], sh2 = bot.map(p => p.clone())
    bandShade.geometry.dispose(); bandShade.geometry = polyGeo([...shade, ...sh2.reverse().map(p => p)])
    // tail: from the left end of the band, streaming with the wind
    const ex = -halfW(yb) - 0.0, tailPts = (len: number, lift: number, ph: number, w0: number, jag: number) => {
      const c: THREE.Vector2[] = []; const n = 22
      for (let i = 0; i <= n; i++) { const s = i / n; c.push(new THREE.Vector2(ex - len * s * (0.6 + 0.4 * wind), yb + lift * s + 0.09 * s * Math.sin(4 * s - 3.2 * t + ph) * (0.5 + wind))) }
      return { c, w: (s: number) => w0 * (1 - 0.55 * s) * (1 + jag * (hash(Math.round(s * 22) + ph * 7) - 0.5)) }
    }
    const a = tailPts(1.25, 0.28, 0, 0.3, 0.25); tail1.geometry.dispose(); tail1.geometry = strokeGeo(a.c, (u) => a.w(u))
    const b = tailPts(0.85, -0.12, 2.1, 0.2, 0.25); tail2.geometry.dispose(); tail2.geometry = strokeGeo(b.c, (u) => b.w(u))
  }
  // eyes
  const eyeG = new THREE.Group(); body.add(eyeG)
  const eyes = [-1, 1].map(sx => {
    const g = new THREE.Group(); g.position.set(sx * 0.34, 0.16, 0); eyeG.add(g)
    const ring = addEye(g, mesh(ellipse(0.285, 0.285), flat('#2a2422')))                 // soft dark rim
    const white = addEye(g, mesh(ellipse(0.265, 0.265), flat(CREAM)))
    const pupil = addEye(g, mesh(ellipse(0.155, 0.155), flat('#0d0b0a')))
    const hi1 = addEye(g, mesh(ellipse(0.05, 0.05), flat('#fff'))), hi2 = addEye(g, mesh(ellipse(0.024, 0.024), flat('#fff')))
    const lid = addEye(g, mesh(polyGeo([new THREE.Vector2(-0.4, 0), new THREE.Vector2(0.4, 0), new THREE.Vector2(0.4, 0.5), new THREE.Vector2(-0.4, 0.5)]), flat(INK)))
    const smile = addEye(g, mesh(strokeGeo(smoothLine([[-0.22, -0.06], [0, 0.14], [0.22, -0.06]], 12), (u) => 0.1 * Math.sin(Math.PI * u) + 0.03), flat(CREAM)))
    smile.visible = false
    return { g, ring, white, pupil, hi1, hi2, lid, smile, sx }
  })
  function addEye(g: THREE.Object3D, m: THREE.Mesh) { P.add(m, g); return m }
  type Eye = { state?: string; look?: [number, number]; blink?: number }
  function setEyes(o: Eye) {
    const st = o.state ?? 'open', lk = o.look ?? [0.1, 0], open = 1 - (o.blink ?? 0)
    for (const e of eyes) {
      const happy = st === 'happy', wide = st === 'wide'
      e.white.visible = e.ring.visible = e.pupil.visible = e.hi1.visible = e.hi2.visible = !happy
      e.smile.visible = happy; e.lid.visible = false
      if (happy) continue
      let oy = open * (st === 'half' ? 0.55 : 1) * (wide ? 1.12 : 1)
      e.white.scale.set(wide ? 1.1 : 1, Math.max(oy, 0.04), 1); e.ring.scale.copy(e.white.scale).multiplyScalar(1.08)
      const px = lk[0] * 0.09 + (st === 'side' ? 0.1 : 0), py = lk[1] * 0.09 + (st === 'up' ? 0.09 : 0)
      e.pupil.position.set(px, py * oy, 0); e.pupil.scale.set(wide ? 0.72 : 1, Math.max(oy * (wide ? 0.72 : 1), 0.04), 1)
      e.hi1.position.set(px + 0.05, py * oy + 0.06 * oy, 0); e.hi2.position.set(px - 0.04, py * oy - 0.05 * oy, 0); e.hi1.scale.setScalar(oy); e.hi2.scale.setScalar(oy)
      if (st === 'angry' || st === 'sad') {   // brow wedge: ink shape cutting the upper inner (angry) / outer (sad) part of the eye
        const dir = (st === 'angry' ? 1 : -1) * -e.sx
        e.lid.visible = true; e.lid.geometry.dispose()
        e.lid.geometry = polyGeo([new THREE.Vector2(-0.34, 0.05), new THREE.Vector2(0.34, 0.05 - dir * 0.0), new THREE.Vector2(0.34, 0.45), new THREE.Vector2(-0.34, 0.45)])
        e.lid.rotation.z = dir * 0.42; e.lid.position.set(0, 0.07, 0)
      }
    }
  }
  const quadPts = (a: THREE.Vector2, m: THREE.Vector2, b: THREE.Vector2, n = 14) => Array.from({ length: n + 1 }, (_, i) => { const u = i / n; return a.clone().multiplyScalar((1 - u) ** 2).add(m.clone().multiplyScalar(2 * u * (1 - u))).add(b.clone().multiplyScalar(u * u)) })
  const setGeo = (m: THREE.Mesh, g: THREE.BufferGeometry) => { m.geometry.dispose(); m.geometry = g }
  /** hands: offsets from the body centre in S units (y up). walk: phase or null */
  function pose(o: { handL?: P2; handR?: P2; walk?: number | null; eyes?: Eye; t?: number; wind?: number; squash?: number } = {}) {
    const hL = o.handL ?? [-1.36, -0.88], hR = o.handR ?? [1.36, -0.88]
    ;([[-0.85, hL], [0.85, hR]] as [number, P2][]).forEach(([sx, h], i) => {
      const sh = new THREE.Vector2(sx, -0.5 + 0.55), hd = new THREE.Vector2(h[0], h[1]), mid = sh.clone().add(hd).multiplyScalar(0.5).add(new THREE.Vector2(0, -0.1))
      setGeo(limbs.arms[i], strokeGeo(quadPts(sh, mid, hd), () => 0.15)); limbs.hands[i].position.set(hd.x, hd.y, 0); limbs.joints[i].position.set(sh.x, sh.y, 0)
    })
    ;[-1, 1].forEach((k, i) => {
      const hip = new THREE.Vector2(k * 0.42, -1.0)
      let fx = hip.x + k * 0.03, fy = -1.47
      if (o.walk != null) { const p = o.walk + (k > 0 ? 0 : Math.PI); fx = hip.x + Math.sin(p) * 0.28 + k * 0.03; fy = -1.47 + Math.max(0, Math.cos(p)) * 0.14 }
      const foot = new THREE.Vector2(fx, fy)
      setGeo(limbs.legs[i], strokeGeo([hip, hip.clone().lerp(foot, 0.5), foot], () => 0.17)); limbs.feet[i].position.set(fx + 0.07, fy - 0.03, 0)
    })
    drawBand(o.t ?? 0, o.wind ?? 0.3); setEyes(o.eyes ?? {})
    const sq = o.squash ?? 0; body.scale.set(S * (1 + sq), S * (1 - sq), 1)
  }
  pose()
  return { root, pose }
}

// ------------------------------------------------------------------ Mochi (units: px of the model sheet, origin at the sitting base)
export const OR = '#e8923f', ORL = '#f4b878', ORD = '#b8651f', LINE = '#2a1c14'
export function mochi(S: number, base = 200) {
  const k = S / 300, root = new THREE.Group(), g = new THREE.Group(); g.scale.setScalar(k); root.add(g)
  const P = new Painter(root, base)
  const add = (m: THREE.Mesh, parent: THREE.Object3D = g) => P.add(m, parent)
  /** inked shape: brush-like outline (varying width) behind + gradient fill */
  function inked(parent: THREE.Object3D, pts: THREE.Vector2[], fill: THREE.Material, w = 9, seed = 1) {
    const o = add(mesh(strokeGeo(pts, (u, i) => w * (0.75 + 0.5 * hash(i * 1.7 + seed))) , flat(LINE)), parent); o.position.z = 0
    return add(mesh(polyGeo(pts), fill), parent)
  }
  const gradO = (c: P2, r = 130) => gradMat(ORL, OR, c, r)
  // tail (animated, drawn first = behind body)
  const tail = add(mesh(new THREE.BufferGeometry(), flat(OR))), tailLine = add(mesh(new THREE.BufferGeometry(), flat(LINE)))
  tail.renderOrder = base - 3; tailLine.renderOrder = base - 4
  const tailBands: THREE.Mesh[] = []; for (let i = 0; i < 5; i++) tailBands.push(add(mesh(new THREE.BufferGeometry(), flat(ORD))))
  function drawTail(wag: number, curl: number) {
    const a = wag; const pts: P2[] = [[-90, 55], [-150, 62 + 18 * Math.sin(a)], [-215, 78 + 38 * Math.sin(a + 0.6) + curl], [-255, 100 + 55 * Math.sin(a + 1.2) + curl * 1.6]]
    const c = smoothLine(pts, 28), wd = (u: number) => 40 - 12 * u
    setGeo(tailLine, strokeGeo(c, (u) => wd(u) + 11)); setGeo(tail, strokeGeo(c, (u) => wd(u)))
    tailBands.forEach((b, i) => { const u = 0.2 + i * 0.17, j = Math.round(u * 28), d = c[Math.min(28, j + 1)].clone().sub(c[Math.max(0, j - 1)]).normalize(), n = new THREE.Vector2(-d.y, d.x), p = c[j]
      const w = wd(u) * 0.55, a0 = p.clone().addScaledVector(n, w).addScaledVector(d, -4), a1 = p.clone().addScaledVector(n, -w).addScaledVector(d, -4), b0 = p.clone().addScaledVector(n, -w).addScaledVector(d, 9), b1 = p.clone().addScaledVector(n, w).addScaledVector(d, 9)
      setGeo(b, polyGeo([a0, a1, b0, b1])) })
  }
  const setGeo = (m: THREE.Mesh, gg: THREE.BufferGeometry) => { m.geometry.dispose(); m.geometry = gg }
  // body (sitting) + haunch + hind paw
  const bodyPts = smoothLoop([[-95, 6], [-112, 60], [-100, 140], [-68, 202], [-18, 232], [44, 222], [108, 172], [128, 100], [134, 40], [120, 6], [20, -6]], 8)
  inked(g, bodyPts, gradO([0, 110], 150), 10, 3)
  // belly/chest light patch
  const chest = add(mesh(polyGeo(smoothLoop([[70, 30], [64, 110], [90, 170], [118, 120], [124, 50]], 8)), flat(ORL, 0.55)))
  // front legs
  for (const [x, s] of [[86, 0], [120, 1]] as P2[]) { const l = add(mesh(strokeGeo(smoothLine([[x, 140], [x + 2, 70], [x, 12]], 10), () => 26), flat(s ? OR : ORL))); l.renderOrder += 0; add(mesh(strokeGeo(smoothLine([[x - 14, 140], [x - 13, 70], [x - 14, 12]], 10), () => 3.5), flat(LINE))) }
  // haunch
  const haunch = smoothLoop([[-80, 20], [-92, 70], [-60, 128], [-5, 132], [32, 80], [28, 24], [-20, 8]], 8)
  inked(g, haunch, gradMat('#f0a458', OR, [-40, 90], 80), 7, 9)
  // hind paw
  inked(g, smoothLoop([[-40, 22], [-30, 38], [28, 38], [62, 24], [64, 4], [20, -4], [-30, 0]], 8), flat(ORL), 7, 5)
  // toes
  for (const x of [30, 42, 54]) add(mesh(strokeGeo([new THREE.Vector2(x, 3), new THREE.Vector2(x, 13)], () => 3), flat(LINE)))
  // back stripes
  for (let i = 0; i < 4; i++) { const x = -70 + i * 36, y = 200 - i * 12 + (i === 3 ? -12 : 0); add(mesh(strokeGeo(smoothLine([[x, y], [x + 6, y - 28], [x + 4, y - 55]], 6), (u) => 15 * Math.sin(Math.PI * (0.15 + 0.7 * u)) + 2), flat(ORD, 0.85))) }
  // head group (pivot at the neck)
  const head = new THREE.Group(); head.position.set(40, 200, 0); g.add(head)
  const HP = new THREE.Vector2(57 - 40, 282 - 200)   // head centre relative to pivot
  const hc = (x: number, y: number): P2 => [HP.x + x, HP.y + y]
  // ears
  for (const sx of [-1, 1]) {
    const ex = sx * 60, outer = smoothLoop([hc(ex - 38 * sx * -1 * 0 + sx * -32, 70), hc(ex + sx * 8, 138), hc(ex + sx * 52, 86)].map(p => p as P2), 6)
    inked(head, outer, flat(OR), 8, 11 + sx)
    add(mesh(polyGeo([V(hc(ex + sx * -10, 80)), V(hc(ex + sx * 6, 122)), V(hc(ex + sx * 34, 86))]), flat('#f0b6a0')), head)
  }
  // head blob (slightly wider at the cheeks)
  const headPts = smoothLoop([hc(0, 96), hc(70, 78), hc(116, 20), hc(112, -42), hc(60, -92), hc(-10, -98), hc(-70, -78), hc(-116, -22), hc(-108, 40), hc(-62, 86)], 8)
  inked(head, headPts, gradMat('#f3b26d', OR, hc(0, 20), 130), 11, 21)
  // forehead stripes
  for (const x of [-26, 0, 26]) add(mesh(strokeGeo(smoothLine([hc(x * 1.4, 92), hc(x, 66)], 4), (u) => 11 * (1 - u) + 2), flat(ORD, 0.9)), head)
  // muzzle
  add(mesh(polyGeo(smoothLoop([hc(-2, -30), hc(42, -26), hc(62, -58), hc(24, -84), hc(-30, -80), hc(-52, -52)], 8)), flat('#f4dcb8')), head)
  const nose = add(mesh(polyGeo([V(hc(5, -34)), V(hc(33, -34)), V(hc(19, -48))]), flat('#3a2218')), head)
  add(mesh(strokeGeo(smoothLine([hc(19, -48), hc(19, -58), hc(8, -64)], 6), () => 3), flat(LINE)), head)
  add(mesh(strokeGeo(smoothLine([hc(19, -58), hc(30, -64)], 4), () => 3), flat(LINE)), head)
  // whiskers
  for (const sx of [-1, 1]) for (const dy of [8, -2, -14]) add(mesh(strokeGeo(smoothLine([hc(19 + sx * 40, -48 + dy * 0.5), hc(19 + sx * 100, -42 + dy * 2.2)], 5), (u) => 2.2 * (1 - 0.6 * u)), flat('#3a2a20', 0.8)), head)
  // eyes: big glossy cat eyes
  const eyeSet = [-1, 1].map(sx => {
    const eg = new THREE.Group(); eg.position.set(HP.x + sx * 46 - 26 + 26 * 0, HP.y + 4, 0); head.add(eg)
    const e = add(mesh(ellipse(44, 46), flat('#1a1210')), eg), r = add(mesh(ellipse(36, 38), flat('#3a2416', 0.9)), eg)
    r.position.set(0, -2, 0)
    const h1 = add(mesh(ellipse(12, 12), flat('#fff')), eg), h2 = add(mesh(ellipse(5.5, 5.5), flat('#fff')), eg)
    h1.position.set(14, 17, 0); h2.position.set(-14, -16, 0)
    const lid = add(mesh(ellipse(46, 48), flat(OR)), eg); lid.visible = false
    return { eg, e, r, h1, h2, lid }
  })
  function pose(o: { tail?: number; curl?: number; blink?: number; look?: P2; tilt?: number; t?: number } = {}) {
    drawTail(o.tail ?? 0, o.curl ?? 0)
    head.rotation.z = o.tilt ?? 0
    const bl = o.blink ?? 0, lk = o.look ?? [0, 0]
    for (const e of eyeSet) {
      const sy = Math.max(1 - bl, 0.06); e.e.scale.set(1, sy, 1); e.r.scale.set(1, sy, 1); e.r.position.set(lk[0] * 6, -2 + lk[1] * 6, 0)
      e.h1.visible = e.h2.visible = bl < 0.5; e.h1.position.set(14 + lk[0] * 6, 17 * sy + lk[1] * 4, 0); e.h2.position.set(-14 + lk[0] * 6, -16 * sy, 0)
    }
  }
  pose()
  return { root, pose }
}

// ------------------------------------------------------------------ wagasa (units: S of the samurai, y up; origin = grip in the hand)
export function umbrella(S: number, base = 150) {
  const root = new THREE.Group(), g = new THREE.Group(); g.scale.setScalar(S); root.add(g)
  const P = new Painter(root, base), add = (m: THREE.Mesh) => P.add(m, g)
  const R = 1.95, rimY = 1.38, apexY = 2.1
  // shaft + handle (behind the oil-paper, so it shows through faintly)
  add(mesh(strokeGeo([new THREE.Vector2(0, -0.28), new THREE.Vector2(0, apexY)], () => 0.05), flat('#3a2a1e')))
  add(mesh(strokeGeo([new THREE.Vector2(0, -0.3), new THREE.Vector2(0, 0.35)], () => 0.075), flat('#2a1d14')))
  // canopy: dome silhouette with scalloped rim
  const dome: THREE.Vector2[] = []
  for (let i = 0; i <= 40; i++) { const a = Math.PI * (1 - i / 40); dome.push(new THREE.Vector2(Math.cos(a) * R, rimY + Math.sin(a) * (apexY - rimY) * (1 - 0.06 * Math.cos(a * 2)))) }
  const N = 16, rim: THREE.Vector2[] = []
  for (let i = N; i >= 0; i--) { const x = -R + (2 * R * i) / N, y = rimY - 0.2 * (1 - (x / R) ** 2) * 0 - 0.09 * (1 - (x / R) ** 2); rim.push(new THREE.Vector2(x, y)) }
  const scallop: THREE.Vector2[] = []
  for (let i = 0; i < N; i++) { const x0 = rim[i].x, x1 = rim[i + 1].x, y0 = rim[i].y, y1 = rim[i + 1].y; for (let j = 0; j <= 6; j++) { const u = j / 6; scallop.push(new THREE.Vector2(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u - 0.07 * Math.sin(Math.PI * u))) } }
  const outline = [...dome, ...scallop]
  const canopy = add(mesh(polyGeo(outline), gradMat('#d6463a', '#a8201a', [0, 1.4], 1.7, 0.86)))
  // sheen band + ribs seen through the paper
  add(mesh(polyGeo(dome.map(p => new THREE.Vector2(p.x * 0.92, rimY + 0.42 + (p.y - rimY) * 0.38 * (p.x < 0 ? 1 : 1)))), flat('#ff9a85', 0.14)))
  for (let i = 0; i <= N; i++) { const x = -R + (2 * R * i) / N, ex = x, ey = rimY - 0.09 * (1 - (x / R) ** 2)
    const c = smoothLine([[0, apexY], [ex * 0.55, rimY + (apexY - rimY) * 0.62 * (1 - (ex / R) ** 2 * 0.2)], [ex, ey]], 10)
    add(mesh(strokeGeo(c, (u) => 0.012 + 0.008 * u), flat('#6a1410', 0.7))) }
  add(mesh(strokeGeo(scallop, () => 0.022), flat('#6a1410', 0.8)))
  add(mesh(strokeGeo(dome, () => 0.02), flat('#6a1410', 0.5)))
  // crown cap
  add(mesh(ellipse(0.05, 0.035), flat('#2a1d14'))).position.set(0, apexY + 0.01, 0)
  add(mesh(strokeGeo([new THREE.Vector2(0, apexY), new THREE.Vector2(0, apexY + 0.1)], () => 0.05), flat('#2a1d14')))
  return { root }
}
