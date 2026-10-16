// Inflate a transparent PNG into a puffy 3D part: front + back shells displaced by a blurred-alpha height field.
// The painted art stays the colour map, so the approved 2D look is kept; real depth gives lighting, parallax and clean layering.
import * as THREE from 'three'

export interface Inflated { group: THREE.Group; w: number; h: number }
const cache = new Map<string, Promise<HTMLImageElement>>()
export const loadImg = (url: string) => { if (!cache.has(url)) cache.set(url, new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url })); return cache.get(url)! }

/** height field 0..1 from alpha: repeated box blur then sqrt so edges round off like a pillow */
function heightField(img: HTMLImageElement, N: number) {
  const c = document.createElement('canvas'), asp = img.width / img.height, W = asp >= 1 ? N : Math.round(N * asp), H = asp >= 1 ? Math.round(N / asp) : N
  c.width = W; c.height = H; const x = c.getContext('2d')!; x.drawImage(img, 0, 0, W, H)
  const d = x.getImageData(0, 0, W, H).data, a = new Float32Array(W * H); for (let i = 0; i < W * H; i++) a[i] = d[i * 4 + 3] > 127 ? 1 : 0
  let src = a, dst = new Float32Array(W * H); const R = Math.max(2, Math.round(Math.min(W, H) * 0.09))
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < H; y++) { let s = 0; for (let k = -R; k <= R; k++) s += src[y * W + Math.min(W - 1, Math.max(0, k))]; for (let xx = 0; xx < W; xx++) { dst[y * W + xx] = s / (2 * R + 1); s += src[y * W + Math.min(W - 1, xx + R + 1)] - src[y * W + Math.max(0, xx - R)] } }
    src = dst; dst = new Float32Array(W * H)
    for (let xx = 0; xx < W; xx++) { let s = 0; for (let k = -R; k <= R; k++) s += src[Math.min(H - 1, Math.max(0, k)) * W + xx]; for (let y = 0; y < H; y++) { dst[y * W + xx] = s / (2 * R + 1); s += src[Math.min(H - 1, y + R + 1) * W + xx] - src[Math.max(0, y - R) * W + xx] } }
    src = dst; dst = new Float32Array(W * H)
  }
  for (let i = 0; i < W * H; i++) src[i] = a[i] ? Math.min(1, src[i] * 1.5) : 0
  return { f: src, W, H }
}
export async function inflate(url: string, wUnits: number, depth: number, opts: { seg?: number; flat?: boolean } = {}): Promise<Inflated> {
  const img = await loadImg(url), hUnits = wUnits * img.height / img.width, seg = opts.seg ?? 110
  const hf = heightField(img, 128), tex = new THREE.Texture(img); tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true; tex.anisotropy = 8
  const sample = (u: number, v: number) => { const x = Math.min(hf.W - 1, Math.max(0, Math.round(u * (hf.W - 1)))), y = Math.min(hf.H - 1, Math.max(0, Math.round((1 - v) * (hf.H - 1)))); return hf.f[y * hf.W + x] }
  const group = new THREE.Group()
  for (const side of [1, -1]) {
    const g = new THREE.PlaneGeometry(wUnits, hUnits, seg, Math.round(seg * hUnits / wUnits)), pos = g.attributes.position, uv = g.attributes.uv
    for (let i = 0; i < pos.count; i++) pos.setZ(i, side * (opts.flat ? 0.002 : depth * sample(uv.getX(i), uv.getY(i))))
    g.computeVertexNormals()
    const m = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, roughness: 0.85, metalness: 0, side: side > 0 ? THREE.FrontSide : THREE.BackSide, transparent: false })
    const mesh = new THREE.Mesh(g, m); if (side < 0) mesh.scale.x = 1
    group.add(mesh)
  }
  return { group, w: wUnits, h: hUnits }
}
