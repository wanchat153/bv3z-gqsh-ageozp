// Ink samurai (ซามูไรหมึก) + Mochi (แมวโมจิ) as flat-toon three.js rigs with inverted-hull ink outlines.
// Everything is a pure function of the pose numbers you pass in. Units: samurai ~1.0 tall, Mochi ~0.5.
import * as THREE from 'three'

export const INK = '#161312', PAPER = '#F1E9D8', RED = '#B3271F', ORANGE = '#E2883A', CREAM = '#F3DDB4', STRIPE = '#A8541C'
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)

// 3-step toon ramp so shading stays flat/graphic
const ramp = (() => {
  const d = new Uint8Array([150, 150, 150, 255, 205, 205, 205, 255, 255, 255, 255, 255])
  const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t
})()
export const toon = (color: string) => new THREE.MeshToonMaterial({ color, gradientMap: ramp })

// outline: same geometry pushed out along normals, back faces only
const hullMat = (w: number, color = INK) => new THREE.ShaderMaterial({
  side: THREE.BackSide, uniforms: { w: { value: w }, col: { value: new THREE.Color(color) } },
  vertexShader: 'uniform float w; void main(){ vec3 p = position + normalize(normal) * w; gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0); }',
  fragmentShader: 'uniform vec3 col; void main(){ gl_FragColor = vec4(col,1.0); }',
})
export function inked(geo: THREE.BufferGeometry, color: string, w = 0.012, outline = INK) {
  const g = new THREE.Group(), m = new THREE.Mesh(geo, toon(color)), h = new THREE.Mesh(geo, hullMat(w, outline))
  g.add(m, h); return g
}
/** place a unit-height capsule-like limb between two points (a→b). Geometry is a CapsuleGeometry(r, len) along Y. */
function limb(r: number, color: string, w = 0.01) {
  const geo = new THREE.CapsuleGeometry(r, 1, 6, 14), g = inked(geo, color, w), root = new THREE.Group(); root.add(g); return { root, r }
}
function fit(l: { root: THREE.Group; r: number }, a: THREE.Vector3, b: THREE.Vector3) {
  const d = b.clone().sub(a), len = Math.max(1e-4, d.length() - 2 * l.r)
  l.root.position.copy(a.clone().add(b).multiplyScalar(0.5))
  l.root.quaternion.setFromUnitVectors(V(0, 1, 0), d.clone().normalize())
  l.root.scale.set(1, len, 1)
}

// ======================================================================== SAMURAI
export interface SamPose {
  hands?: [THREE.Vector3, THREE.Vector3]   // local space, [left(back), right(front)] ; undefined = hang at sides
  walk?: number | null                      // phase (rad) or null
  look?: [number, number]                   // pupil offset -1..1
  open?: number                             // eye openness 0..1
  mood?: 'calm' | 'happy' | 'angry' | 'sad' | 'wide'
  windBand?: number
}
export function samurai() {
  const root = new THREE.Group(), rig = new THREE.Group(); root.add(rig)
  // drop body: lathe profile, round belly, pointed tip curving up-back
  const prof: THREE.Vector2[] = []
  for (let i = 0; i <= 28; i++) {
    const u = i / 28, y = -0.5 + u * 1.55
    const r = u < 0.55 ? 0.43 * Math.sqrt(1 - ((0.55 - u) / 0.55) ** 2 * 0.98) : 0.43 * Math.pow(Math.max(0, 1 - (u - 0.55) / 0.45), 1.35)
    prof.push(new THREE.Vector2(Math.max(0.001, r), y))
  }
  const body = inked(new THREE.LatheGeometry(prof, 40), INK, 0.014, '#000000'); rig.add(body)
  body.position.y = 0.58
  // sheen: pale reflected band on the left
  const sheen = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), new THREE.MeshBasicMaterial({ color: '#5E5A57', transparent: true, opacity: 0.55 }))
  sheen.scale.set(0.45, 1.5, 0.3); sheen.position.set(-0.2, 0.78, 0.33); rig.add(sheen)
  // headband: tilted ring around the head, knot + two tails
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.325, 0.045, 10, 36), toon(RED)); band.rotation.set(Math.PI / 2 - 0.12, 0, 0); band.position.set(0, 0.86, 0); band.scale.set(1, 1, 1.15)
  rig.add(band)
  const tails: THREE.Mesh[] = []
  for (let i = 0; i < 2; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.012), toon(RED)); t.geometry.translate(-0.17, 0, 0); t.position.set(-0.3, 0.84 - i * 0.03, -0.1); tails.push(t); rig.add(t) }
  // eyes
  const eyes: { grp: THREE.Group; pupil: THREE.Mesh; lid: THREE.Mesh }[] = []
  for (const sx of [-1, 1]) {
    const grp = new THREE.Group(), white = new THREE.Mesh(new THREE.SphereGeometry(0.095, 20, 14), new THREE.MeshBasicMaterial({ color: PAPER }))
    white.scale.set(1, 1.25, 0.5)
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), new THREE.MeshBasicMaterial({ color: INK })); pupil.scale.set(1, 1.2, 0.6); pupil.position.z = 0.03
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff' })); hl.position.set(-0.015, 0.03, 0.06)
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: INK })); lid.scale.set(1, 1.28, 0.55); lid.visible = false
    grp.add(white, pupil, lid); pupil.add(hl); grp.position.set(sx * 0.17, 0.62, 0.395); grp.rotation.y = sx * 0.28
    rig.add(grp); eyes.push({ grp, pupil, lid })
  }
  // arms + legs
  const arms = [limb(0.05, INK, 0.008), limb(0.05, INK, 0.008)], legs = [limb(0.07, INK, 0.008), limb(0.07, INK, 0.008)]
  const hands = [0, 1].map(() => { const h = inked(new THREE.SphereGeometry(0.075, 16, 12), INK, 0.01, '#000'); rig.add(h); return h })
  const feet = [0, 1].map(() => { const f = inked(new THREE.SphereGeometry(0.1, 16, 12), INK, 0.01, '#000'); f.scale.set(1.5, 0.75, 1.2); rig.add(f); return f })
  for (const l of [...arms, ...legs]) rig.add(l.root)

  function pose(p: SamPose = {}) {
    const sh = [V(-0.34, 0.5, 0.1), V(0.34, 0.5, 0.1)]
    const H = p.hands ?? [V(-0.5, 0.2, 0.12), V(0.5, 0.2, 0.12)]
    for (let i = 0; i < 2; i++) { fit(arms[i], sh[i], H[i]); hands[i].position.copy(H[i]) }
    const hip = [V(-0.17, 0.12, 0), V(0.17, 0.12, 0)]
    for (let i = 0; i < 2; i++) {
      let f = V(hip[i].x, -0.02, 0.02)
      if (p.walk != null) { const ph = p.walk + (i ? Math.PI : 0); f = V(hip[i].x, -0.02 + Math.max(0, Math.cos(ph)) * 0.08, Math.sin(ph) * 0.2) }
      fit(legs[i], hip[i], f.clone().add(V(0, 0.07, 0))); feet[i].position.copy(f).add(V(0, 0.05, 0.05))
    }
    const open = p.open ?? 1, lk = p.look ?? [0.15, 0]
    for (const e of eyes) { e.grp.scale.y = Math.max(0.08, open); e.pupil.position.set(lk[0] * 0.03, lk[1] * 0.04, 0.03) }
    for (let i = 0; i < 2; i++) tails[i].rotation.z = -0.15 - (p.windBand ?? 0.3) * (0.4 + i * 0.25)
  }
  pose()
  return { root, rig, pose, eyes, S: 1 }
}

// ======================================================================== MOCHI
export interface CatPose {
  body: THREE.Vector3; bodyRot: number; head: THREE.Vector3; headRot: number
  paws: { FN: THREE.Vector3; FF: THREE.Vector3; HN: THREE.Vector3; HF: THREE.Vector3 }
  tail: THREE.Vector3[]; eyeOpen?: number; happy?: number; mouth?: number
}
const P_STAND = (): CatPose => ({
  body: V(0, 0.27, 0), bodyRot: 0, head: V(0.22, 0.42, 0.02), headRot: 0,
  paws: { FN: V(0.17, 0, 0.1), FF: V(0.11, 0, -0.1), HN: V(-0.17, 0, 0.1), HF: V(-0.2, 0, -0.1) },
  tail: [V(-0.28, 0.3, 0), V(-0.42, 0.34, 0), V(-0.5, 0.46, 0), V(-0.5, 0.6, 0)],
})
const P_SIT = (): CatPose => ({
  body: V(-0.03, 0.24, 0), bodyRot: 0.55, head: V(0.07, 0.52, 0.02), headRot: 0,
  paws: { FN: V(0.13, 0, 0.1), FF: V(0.09, 0, -0.1), HN: V(-0.1, 0, 0.14), HF: V(-0.12, 0, -0.14) },
  tail: [V(-0.2, 0.08, 0), V(-0.34, 0.03, 0.04), V(-0.46, 0.03, 0.1), V(-0.5, 0.05, 0.18)],
})
export const catPoses = { stand: P_STAND, sit: P_SIT }
export function mochi() {
  const root = new THREE.Group(), rig = new THREE.Group(); root.add(rig)
  const body = inked(new THREE.SphereGeometry(0.2, 32, 24), ORANGE, 0.012); body.scale.set(1.35, 1, 1.05)
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 16), toon(CREAM)); belly.scale.set(1.2, 0.8, 0.7); belly.position.set(0.02, -0.06, 0.1); body.add(belly)
  const stripes: THREE.Mesh[] = []
  for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 6, 20, 1.5), toon(STRIPE)); s.rotation.set(0, Math.PI / 2, 0); s.position.x = -0.12 + i * 0.07; s.rotation.z = 1.6; s.scale.set(1, 1.0, 1.0); body.add(s); stripes.push(s) }
  const head = new THREE.Group(), skull = inked(new THREE.SphereGeometry(0.17, 32, 24), ORANGE, 0.012); skull.scale.set(1.12, 0.95, 1); head.add(skull)
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.07, 18, 14), toon(CREAM)); muzzle.position.set(0.08, -0.05, 0.1); muzzle.scale.set(1.3, 0.9, 1); head.add(muzzle)
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), new THREE.MeshBasicMaterial({ color: '#C0524A' })); nose.position.set(0.15, -0.025, 0.16); head.add(nose)
  const ears = [-1, 1].map((s) => { const e = inked(new THREE.ConeGeometry(0.075, 0.15, 4), ORANGE, 0.009); e.position.set(-0.01, 0.16, s * 0.1); e.rotation.x = s * 0.35; head.add(e);
    const inn = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.09, 4), new THREE.MeshBasicMaterial({ color: '#E9A18E' })); inn.position.set(0, -0.015, 0.03); e.add(inn); return e })
  const eyes = [-1, 1].map((s) => { const g = new THREE.Group(), w = new THREE.Mesh(new THREE.SphereGeometry(0.052, 18, 14), new THREE.MeshBasicMaterial({ color: '#2A1A10' })); w.scale.set(0.8, 1.2, 0.5)
    const sp = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff' })); sp.position.set(0.012, 0.025, 0.03)
    const sp2 = sp.clone(); sp2.scale.setScalar(0.5); sp2.position.set(-0.012, -0.02, 0.03)
    g.add(w, sp, sp2); g.position.set(0.1, 0.02, s * 0.085); g.rotation.y = s * 0.55; head.add(g); return g })
  const whisk = [-1, 1].map((s) => [0, 1].map((k) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.004, 0.004), new THREE.MeshBasicMaterial({ color: INK })); m.position.set(0.14, -0.045 - k * 0.02, s * 0.12); m.rotation.y = s * (0.5 + k * 0.2); head.add(m); return m }))
  const legs = ['FN', 'FF', 'HN', 'HF'].map((id) => ({ id, l: limb(0.055, ORANGE, 0.008) }))
  const paws = legs.map(() => { const p = inked(new THREE.SphereGeometry(0.065, 14, 10), CREAM, 0.008); p.scale.set(1.25, 0.7, 1); rig.add(p); return p })
  const tailSeg = [0, 1, 2].map(() => limb(0.048, ORANGE, 0.008)); const tip = inked(new THREE.SphereGeometry(0.05, 12, 10), STRIPE, 0.008)
  rig.add(body, head, tip); for (const l of legs) rig.add(l.l.root); for (const t of tailSeg) rig.add(t.root)

  function pose(p: CatPose = P_STAND()) {
    body.position.copy(p.body); body.rotation.z = p.bodyRot
    head.position.copy(p.head); head.rotation.z = p.headRot
    legs.forEach((lg, i) => {
      const front = lg.id[0] === 'F', far = lg.id[1] === 'F', z = far ? -0.1 : 0.1
      const hip = V(front ? p.body.x + 0.15 : p.body.x - 0.14, p.body.y - 0.05, z * 0.8), paw = (p.paws as any)[lg.id] as THREE.Vector3
      fit(lg.l, hip, paw.clone().add(V(0, 0.07, 0))); paws[i].position.copy(paw).add(V(0.03, 0.04, 0))
    })
    for (let i = 0; i < 3; i++) fit(tailSeg[i], p.tail[i], p.tail[i + 1]); tip.position.copy(p.tail[3])
    const o = p.eyeOpen ?? 1; for (const e of eyes) e.scale.y = Math.max(0.1, o)
  }
  pose()
  return { root, rig, pose, head, ears, eyes }
}
