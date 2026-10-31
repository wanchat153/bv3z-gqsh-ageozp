// 2D in 3D: flat drawings on planes.
// makeFlat  — a billboard redrawn every frame (characters). Its canvas resolution follows its size on screen
//             (512 → 4096 px tiers), so close-ups stay razor sharp and wide shots stay cheap.
// makeCard  — a fixed plane with a canvas texture drawn once (signs, posters, banners, paper props).
import * as THREE from './three.module.js';

let TARGET_H = 1920 * 1.5;              // render height in pixels (set by the film: E.SH)
export const setFlatTarget = (h) => { TARGET_H = h; };
const TIERS = [512, 1024, 2048, 4096];

export function makeFlat(sizeM, px, draw, { maxPx = 4096, fixed = false } = {}) {
  const pool = new Map();
  const tier = (n) => { if (!pool.has(n)) { const c = document.createElement('canvas'); c.width = c.height = n; const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; pool.set(n, { c, ctx: c.getContext('2d'), tex }); } return pool.get(n); };
  let cur = tier(px);
  const mat = new THREE.MeshBasicMaterial({ map: cur.tex, transparent: true, alphaTest: 0.03, depthWrite: true, side: THREE.DoubleSide, fog: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(sizeM, sizeM), mat); mesh.renderOrder = 2;
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 40), new THREE.MeshBasicMaterial({ color: 0x1b2a1a, transparent: true, opacity: 0.25, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.renderOrder = 1;
  const F = { mesh, shadow, sizeM, draw, get ctx() { return cur.ctx; }, get px() { return cur.c.width; },
    // anchor = world centre of the drawing; worldDir = camera-right for front-view characters (never mirrors)
    update(camera, anchor, worldDir, pose, ground = 0, shadowR = 0.25, roll = 0) {
      mesh.position.copy(anchor); mesh.quaternion.copy(camera.quaternion); if (roll) mesh.rotateZ(roll);
      if (!fixed) { const d = Math.max(0.05, camera.position.distanceTo(anchor)); const need = sizeM / (2 * d * Math.tan(camera.fov * Math.PI / 360)) * TARGET_H * 1.15;
        const n = TIERS.find((x) => x >= need && x <= maxPx) || Math.min(maxPx, 4096); if (n !== cur.c.width) { cur = tier(n); mat.map = cur.tex; } }
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      const face = Math.sign(right.dot(worldDir)) || 1; const ctx = cur.ctx, P = cur.c.width;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, P, P);
      ctx.setTransform(P / 1024 * face, 0, 0, P / 1024, P / 2, P / 2);
      ctx.lineJoin = ctx.lineCap = 'round'; draw(ctx, pose); cur.tex.needsUpdate = true;
      const h = Math.max(0, anchor.y - sizeM * 0.43 - ground);
      shadow.position.set(anchor.x, ground + 0.004, anchor.z); const s = shadowR * (1 + h * 0.15); shadow.scale.set(s * 2, s * 1.2, 1);
      shadow.material.opacity = 0.32 * Math.exp(-h * 0.6); shadow.visible = shadowR > 0;
    } };
  return F;
}

export function makeCard(wM, hM, pxW, draw, opts = {}) {
  const pxH = Math.round(pxW * hM / wM); const c = document.createElement('canvas'); c.width = pxW; c.height = pxH; const ctx = c.getContext('2d');
  ctx.lineJoin = ctx.lineCap = 'round'; draw(ctx, pxW, pxH);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  if (opts.repeat) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(...opts.repeat); }
  const mat = opts.lit ? new THREE.MeshLambertMaterial({ map: tex, transparent: !!opts.transparent, alphaTest: opts.transparent ? 0.02 : 0, side: THREE.DoubleSide })
    : new THREE.MeshBasicMaterial({ map: tex, transparent: !!opts.transparent, alphaTest: opts.transparent ? 0.02 : 0, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(wM, hM), mat); mesh.receiveShadow = !!opts.lit;
  mesh.userData.redraw = (fn) => { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, pxW, pxH); fn(ctx, pxW, pxH); tex.needsUpdate = true; };
  return mesh;
}

// bold sign text with ink outline (for banners / labels inside the world)
export function signText(ctx, text, x, y, size, fill = '#fff', stroke = '#1b1420', font = 'Montserrat, Kanit, sans-serif') {
  ctx.font = `800 ${size}px ${font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = size * 0.14; ctx.strokeStyle = stroke; ctx.strokeText(text, x, y); ctx.fillStyle = fill; ctx.fillText(text, x, y);
}
