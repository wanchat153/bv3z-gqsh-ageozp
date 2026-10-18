'use strict';
// ================= CAT cast: kittens + mama cat rig (orange watercolor wash + loose ink), samurai extras, props =================
const GY = 1400;                                    // ground line (world)
const WHI = '#FFFDF6', PAPB = '#EFE7D5';            // paper-white highlight, opaque paper base under the washes
const ORG = { k1: [226, 136, 58], k2: [236, 168, 96], k3: [230, 146, 70], mama: [214, 118, 44] };
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const dk = (c, k) => [Math.round(c[0] * k), Math.round(c[1] * k), Math.round(c[2] * k)];
function pathPoly(ctx, P) { ctx.beginPath(); P.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); }
function polyLine(ctx, P) { ctx.beginPath(); P.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); }
const OV = { stri: 0, dry: 0 };
function ovBrush(ctx, P, o, step = 2) { if ((o.a ?? 1) <= 0.004) return; brushPts(ctx, P, Object.assign({}, o, OV), step); }
const rot2 = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
function nubHand(ctx, p, S, a = 1) { if (a <= 0.01) return; ctx.globalAlpha = a; ctx.fillStyle = INKC; ctx.beginPath(); ctx.arc(p[0], p[1], S * 0.16, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,250,240,0.55)'; ctx.beginPath(); ctx.arc(p[0] - S * 0.05, p[1] - S * 0.05, S * 0.04, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
function tube(P, Wd) { const n = P.length, L = [], R = [];
  for (let i = 0; i < n; i++) { const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl; const w = Wd[i] / 2; L.push([P[i][0] - ty * w, P[i][1] + tx * w]); R.push([P[i][0] + ty * w, P[i][1] - tx * w]); }
  return cr(L.concat(R.reverse()), true, 4); }
function capsule(a, b, w, n = 10) { const dx = b[0] - a[0], dy = b[1] - a[1], an = Math.atan2(dy, dx), P = [];
  for (let i = 0; i <= n; i++) { const q = an + Math.PI / 2 + Math.PI * i / n; P.push([b[0] + Math.cos(q) * w, b[1] + Math.sin(q) * w]); }
  for (let i = 0; i <= n; i++) { const q = an - Math.PI / 2 + Math.PI * i / n; P.push([a[0] + Math.cos(q) * w, a[1] + Math.sin(q) * w]); }
  return P; }
function steamCurl(ctx, x, y, k, sd, sc = 1, a = 1) {
  if (k <= 0 || k >= 1 || a <= 0.01) return; const R = rng(Math.floor(sd * 997) + 3), h = (110 + 70 * R()) * sc, dir = R() < 0.5 ? -1 : 1, ph = R() * 6, rise = 90 * sc * k;
  const grow = eOut(Math.min(1, k * 2.2)), P = [];
  for (let i = 0; i <= 12; i++) { const q = i / 12 * grow; P.push([x + Math.sin(q * 4.2 + ph + k * 3) * 20 * sc * q, y - rise - h * q]); }
  const top = P[P.length - 1], cr0 = 24 * sc * grow;
  if (grow > 0.5) for (let i = 1; i <= 16; i++) { const an = Math.PI + dir * (i / 16) * Math.PI * 2.2, r = cr0 * (1 - i / 22); P.push([top[0] + dir * cr0 + Math.cos(an) * r * dir, top[1] + Math.sin(an) * r]); }
  const al = a * Math.min(1, Math.sin(Math.PI * k) * 1.4);
  brushPts(ctx, P, { w: 7 * sc, col: '#8A857E', a: al * 0.38, taper: 0.7, head: 0.35, dry: 0.2, stri: 0, seed: sd, pf: 1.2 }, 3);
}

// ---------- scratch canvas for one character at a time (lets dry-brush erase only inside that character) ----------
let SCC, scx, CAMNOW = [540, 960, 1];
function initCast() { SCC = mk(W, H); scx = SCC.getContext('2d'); buildGround(); }
function withScratch(ctx, fn) {
  scx.setTransform(1, 0, 0, 1, 0, 0); scx.globalCompositeOperation = 'source-over'; scx.globalAlpha = 1; scx.clearRect(0, 0, W, H); camXf(scx, CAMNOW);
  fn(scx); scx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.drawImage(SCC, 0, 0); ctx.restore();
}

// ---------- watercolor wash for a moving part ----------
// opaque paper base (so the cat covers what is behind it), 3 wobbly orange layers, darker wet edge, soft paper light
function wash(ctx, P, col, a, sd, o = {}) {
  if (a <= 0.01 || P.length < 3) return;
  fillPoly(ctx, P, PAPB, a);
  const k = o.k ?? 1;
  fillPoly(ctx, deformPoly(P, 2, 0.22, sd), rgba(col, 0.68 * k), a);
  fillPoly(ctx, deformPoly(P, 2, 0.3, sd + 7.1), rgba(col, 0.3 * k), a);
  if (o.core !== 0) { let cx = 0, cy = 0; for (const p of P) { cx += p[0]; cy += p[1]; } cx /= P.length; cy /= P.length;
    fillPoly(ctx, deformPoly(P.map((p) => [lerp(p[0], cx, 0.28), lerp(p[1], cy, 0.28)]), 2, 0.35, sd + 3.3), rgba(col, 0.2 * k), a); }
  ctx.save(); pathPoly(ctx, P); ctx.clip();
  ctx.globalAlpha = a * 0.5 * k; ctx.strokeStyle = rgba(dk(col, 0.82), 1); ctx.lineWidth = o.edge ?? 5; ctx.lineJoin = 'round'; pathPoly(ctx, deformPoly(P, 1, 0.18, sd + 9)); ctx.stroke();
  if (o.light) { const [lx, ly, lr] = o.light, g = ctx.createRadialGradient(lx, ly, 0, lx, ly, lr); g.addColorStop(0, `rgba(255,252,242,${0.55 * a})`); g.addColorStop(1, 'rgba(255,252,242,0)'); ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(lx - lr, ly - lr, 2 * lr, 2 * lr); }
  ctx.restore(); ctx.globalAlpha = 1;
}
// wash over the UNION of several polygons (one paper base + colour layers over all of them): no seams where parts join
function washUnion(ctx, Ps, col, a, sd, o = {}) {
  if (a <= 0.01) return; const k = o.k ?? 1, area = (P) => { let s2 = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; s2 += p[0] * q[1] - q[0] * p[1]; } return s2; }, path = (list) => { ctx.beginPath(); for (let P of list) { if (area(P) < 0) P = P.slice().reverse(); ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]); ctx.closePath(); } };
  const fillAll = (list, colr) => { path(list); ctx.globalAlpha = a; ctx.fillStyle = colr; ctx.fill('nonzero'); };
  const D = Ps.map((P, i) => deformPoly(P, 1.2, 0.2, sd + i)); fillAll(D, PAPB); fillAll(D, rgba(col, 0.68 * k)); fillAll(D, rgba(col, 0.3 * k));
  ctx.globalAlpha = 1;
}
// loose ink contour along part of a closed outline (indices as fractions), pushed slightly outward
function looseLine(ctx, P, f0, f1, w, a, sd, o = {}) {
  if (a <= 0.01) return; const n = P.length, i0 = Math.round(f0 * n), i1 = Math.round(f1 * n), Q = [];
  let cx = 0, cy = 0; for (const p of P) { cx += p[0]; cy += p[1]; } cx /= n; cy /= n;
  for (let i = i0; i <= i1; i += Math.max(1, Math.round(n / 40))) { const p = P[((i % n) + n) % n], dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1, off = (o.off ?? 1.5) + 1.2 * (vnoise(i * 0.3, sd) - 0.5); Q.push([p[0] + dx / l * off, p[1] + dy / l * off]); }
  if (Q.length < 2) return;
  brushPts(ctx, Q, Object.assign({ w, a, taper: 0.45, head: 0.15, dry: 0.35, stri: 0, seed: sd, pf: 1.4, rag: 0.28 }, o), 2);
}

// ================= CAT RIG =================
// pose (local, px at s=1, facing +x, y down, origin = ground point under the body):
//  b:[cx,cy,rx,ry,rot]  h:[x,y,rot,sc]  L:{FN|FF|HN|HF:[hipX,hipY (body-local), pawX,pawY (local)]}
//  tl:[baseX,baseY (body-local), a0, curl, len, front(0/1)]  ear:[back, perk]
const P_STAND = { b: [0, -33, 34, 23, 0], h: [30, -62, 0, 1], L: { FN: [17, 9, 20, 0], FF: [10, 9, 12, 0], HN: [-19, 9, -19, 0], HF: [-25, 9, -27, 0] }, tl: [-31, -6, -2.35, 1.1, 1, 0], ear: [0, 0] };
const P_TIPTOE = { b: [2, -42, 33, 22, -0.05], h: [34, -72, -0.05, 1], L: { FN: [17, 9, 24, -6], FF: [10, 9, 10, 0], HN: [-19, 9, -14, -4], HF: [-25, 9, -28, 0] }, tl: [-31, -6, -2.0, 1.6, 1, 0], ear: [0, 0.6] };
const P_SIT = { b: [-4, -37, 24, 30, 0.1], h: [8, -82, 0, 1], L: { FN: [10, 15, 12, 0], FF: [2, 15, 4, 0], HN: [-6, 24, 8, 0], HF: [-12, 24, 0, 0] }, tl: [-18, 24, 0.1, -1.7, 1.05, 1], ear: [0, 0] };
const P_CROUCH = { b: [-6, -23, 36, 17, 0.26], h: [33, -30, 0.08, 1], L: { FN: [18, 8, 32, 0], FF: [12, 8, 24, 0], HN: [-22, 6, -17, 0], HF: [-28, 6, -24, 0] }, tl: [-34, -4, -3.05, 0.4, 1, 0], ear: [0.15, 0.8] };
const P_POUNCE = { b: [0, -30, 44, 17, -0.3], h: [46, -60, -0.25, 1], L: { FN: [20, 6, 64, -52], FF: [14, 6, 58, -44], HN: [-24, 4, -68, -8], HF: [-30, 4, -62, -2] }, tl: [-40, -4, 3.3, 0.5, 1, 0], ear: [0.3, 0] };
const P_SLEEP = { b: [0, -21, 40, 20, 0], h: [30, -25, 0.45, 1], L: { FN: [18, 10, 34, -2], FF: [12, 10, 26, -2], HN: [-16, 10, -8, 0], HF: [-22, 10, -14, 0] }, tl: [-36, 4, 0.25, -0.2, 1.15, 1], ear: [0.1, 0] };
const P_HANG = { b: [0, -60, 34, 21, -Math.PI / 2], h: [3, -104, 0.05, 1], L: { FN: [17, 9, 12, -50], FF: [10, 9, 4, -52], HN: [-19, 9, 10, -14], HF: [-25, 9, 2, -16] }, tl: [-31, -6, Math.PI / 2 - 0.1, 0.25, 0.95, 0], ear: [0.2, 0] };
const P_BACK = { b: [0, -22, 34, 22, Math.PI], h: [-35, -24, 2.7, 1], L: { FN: [17, 9, -20, -62], FF: [10, 9, -10, -58], HN: [-19, 9, 18, -52], HF: [-25, 9, 26, -48] }, tl: [-31, -6, 0.25, -0.9, 1, 0], ear: [0, 0] };
const P_RUN = { b: [0, -36, 40, 20, 0], h: [38, -60, 0.1, 1], L: { FN: [20, 8, 26, 0], FF: [13, 8, 18, 0], HN: [-22, 8, -24, 0], HF: [-28, 8, -30, 0] }, tl: [-38, -4, 3.25, 0.6, 1.05, 0], ear: [0.5, 0] };
const P_LOAF = { b: [0, -26, 34, 25, 0], h: [22, -52, 0.1, 1], L: { FN: [18, 12, 30, -2], FF: [10, 12, 22, -2], HN: [-16, 12, -12, 0], HF: [-22, 12, -18, 0] }, tl: [-32, 8, 0.2, -0.4, 1.05, 1], ear: [0, 0] };
function mixPose(A, B, u) {
  if (u <= 0) return clonePose(A); if (u >= 1) return clonePose(B);
  if (Array.isArray(A)) return A.map((v, i) => lerp(v, B[i], u));
  const o = {}; for (const k in A) o[k] = (typeof A[k] === 'number') ? lerp(A[k], B[k], u) : mixPose(A[k], B[k], u);
  if (A.tl && B.tl) { let d = B.tl[2] - A.tl[2]; d -= 2 * Math.PI * Math.round(d / (2 * Math.PI)); o.tl[2] = A.tl[2] + d * u; }   // tail angle: shortest way round (no full-circle whip)
  return o;
}
function clonePose(P) { if (Array.isArray(P)) return P.slice(); const o = {}; for (const k in P) o[k] = typeof P[k] === 'number' ? P[k] : clonePose(P[k]); return o; }
// WALK / RUN (owner approved 2026-10-12, the Ep. 12 `feather_wand_loop` walk): diagonal-gait leg cycle on top of a base pose. ph = 2*PI*dist/STR with STR = 90/2.1 local units per cycle (integrate ph over time so walk->run never jumps). Use WITHOUT pro:1 (standard kit cat). run: k 0..1 -> amp 14..20, lift 8..14, and speed it up.
function walkPose(base, ph, amp = 14, lift = 8) {
  const P = clonePose(base), f = (L, sgn) => { const q = ph + (sgn > 0 ? 0 : Math.PI); P.L[L][2] = base.L[L][2] + amp * Math.sin(q); P.L[L][3] = base.L[L][3] - lift * Math.max(0, Math.cos(q)); };
  f('FN', 1); f('HF', 1); f('FF', -1); f('HN', -1); P.b[1] += 1.4 * Math.sin(2 * ph); P.h[1] += 1.2 * Math.sin(2 * ph + 0.6); return P;
}
// kind defaults
const CATK = {
  kit: { hr: 29, ear: 1, cheek: 0.06, fluff: 0.02, eye: [7.2, 8.6], eyeSp: 11, legW: [12, 14], tailW: 12, tailL: 58, stripes: 1 },
  mama: { hr: 31, hsc: 0.84, ruff: 0.16, ear: 0.95, cheek: 0.12, fluff: 0.03, eye: [7.5, 7.5], eyeSp: 11.5, legW: [12, 14], tailW: 11, tailL: 66, stripes: 1, iris: 1 },
};
// st: {x,y,s,face,sx,sy,rot,pose, kind, col, e:{open,look,wide,happy,sleep,dil}, mouth:{open,meow}, tailWig, t0ph, ear:[..], a, pat (patch pattern)}
function catGeom(st, t) {
  const K = CATK[st.kind || 'kit'], P = st.pose, s = st.s, f = st.face || 1, sx = st.sx ?? 1, sy = st.sy ?? 1, rot = st.rot || 0;
  const bc = [P.b[0], P.b[1]];
  const X = (lx, ly) => { let x = lx * sx, y = ly * sy; const cx = bc[0] * sx, cy = bc[1] * sy; const [rx, ry] = rot2(x - cx, y - cy, rot); return [st.x + (rx + cx) * f * s, st.y + (ry + cy) * s]; };
  const B = P.b, br = st.breath ?? (0.02 * Math.sin(t * LQ(3.3) + (st.ph || 0)));
  const BL = (bx, by) => { const [rx, ry] = rot2(bx, by, B[4]); return [B[0] + rx, B[1] + ry]; };   // body-local -> local
  // body polygon
  const body = []; for (let i = 0; i < 36; i++) { const a = i / 36 * 6.283, c = Math.cos(a), sn = Math.sin(a);
    const bulge = 1 + 0.08 * Math.max(0, sn) - 0.05 * Math.max(0, -c) * Math.max(0, -sn); const rx = B[2] * (1 + br) * bulge, ry = B[3] * (1 + br * 1.4) * bulge;
    body.push(X(...BL(c * rx, sn * ry))); }
  // head
  const H = P.h, hs = (H[3] ?? 1) * (K.hsc ?? 1), hr = K.hr * hs, hrot = H[2] + (st.hTilt || 0), HX = (hx, hy) => { const [rx, ry] = rot2(hx * hs, hy * hs, hrot); return X(H[0] + rx, H[1] + ry); };
  const head = []; for (let i = 0; i < 40; i++) { const a = i / 40 * 6.283, c = Math.cos(a), sn = Math.sin(a);
    let r = 1 + K.cheek * Math.exp(-(((a - 0.45) / 0.45) ** 2)) + K.cheek * Math.exp(-(((a - 2.7) / 0.45) ** 2)); r *= 1 - 0.1 * Math.max(0, -sn) ** 2;
    if (K.fluff) r += K.fluff * Math.max(0, sn + 0.2) * Math.sin(a * 11);
    if (K.ruff) { const side = Math.exp(-(((a - 0.55) / 0.4) ** 2)) + Math.exp(-(((a - 2.6) / 0.4) ** 2)); r += K.ruff * side * Math.pow(Math.abs(Math.sin(a * 10)), 3); } head.push(HX(c * K.hr * 1.1 * r, sn * K.hr * 0.95 * r + 2)); }
  // ears (head-local)
  const eb = (st.ear ? st.ear[0] : P.ear[0]) || 0, ep = (st.ear ? st.ear[1] : P.ear[1]) || 0, twitch = st.earTw || 0;
  const earP = (bx, sgn, far) => { const base = [bx, -K.hr * 0.62], an = -Math.PI / 2 + sgn * (0.38 + 0.55 * eb) - 0.15 * ep * sgn + (far ? 0 : twitch), L = K.hr * 0.72 * K.ear * (1 - 0.25 * eb);
    const tip = [base[0] + Math.cos(an) * L, base[1] + Math.sin(an) * L], w = K.hr * 0.36; const pa = [base[0] - w, base[1] + 5], pb = [base[0] + w, base[1] + 5];
    return { poly: cr([pa, [lerp(pa[0], tip[0], 0.55) - 2 * sgn, lerp(pa[1], tip[1], 0.55)], tip, [lerp(pb[0], tip[0], 0.55) + 2 * sgn, lerp(pb[1], tip[1], 0.55)], pb], false, 4).map((p) => HX(...p)),
      inner: [[base[0] - w * 0.45, base[1] + 1], [lerp(base[0], tip[0], 0.7), lerp(base[1], tip[1], 0.7)], [base[0] + w * 0.45, base[1] + 1]].map((p) => HX(...p)) }; };
  const earF = earP(12, 1, true), earN = earP(-12, -1, false);
  // legs
  const legs = {};
  for (const id of ['HF', 'FF', 'HN', 'FN']) { const q = P.L[id], hip = BL(q[0], q[1]), paw = [q[2], q[3]], front = id[0] === 'F', far = id[1] === 'F';
    const w = K.legW[front ? 0 : 1] * (st.legK ?? 1); const mid = [lerp(hip[0], paw[0], 0.5) + (front ? -2 : 3), lerp(hip[1], paw[1], 0.5)];
    legs[id] = { P: [X(...hip), X(...mid), X(...paw)], w: w * s, far, front, paw: X(paw[0] + 3, paw[1] - 4), pawL: paw, hipL: hip }; }
  // tail
  const T = P.tl, tb = BL(T[0], T[1]), tp = [X(...tb)], nT = 12, len = K.tailL * T[4] / nT, wig = st.tailWig ?? 0.25, tph = st.tailPh ?? t * LQ(4);
  let pt = tb.slice(); for (let i = 1; i <= nT; i++) { const q = i / nT, an = T[2] + T[3] * q + wig * Math.sin(tph - q * 3.2) * q; pt = [pt[0] + Math.cos(an) * len, pt[1] + Math.sin(an) * len]; tp.push(X(...pt)); }
  const tw = tp.map((_, i) => { const q = i / nT; return K.tailW * (st.tailK ?? 1) * s * (1 - 0.3 * q) * (q > 0.8 ? Math.sqrt(Math.max(0.04, 1 - ((q - 0.8) / 0.2) ** 2)) : 1); });
  return { X, HX, BL, body, head, earF, earN, legs, tail: { P: tp, w: tw }, tailFront: T[5] > 0.5, s, f, K, hs };
}
const bodyC = (G) => { let x = 0, y = 0; for (const p of G.body) { x += p[0]; y += p[1]; } return [x / G.body.length, y / G.body.length]; };
function catSil(G) { const out = [G.body, G.head, G.earF.poly, G.earN.poly, tube(G.tail.P, G.tail.w)]; for (const id in G.legs) { const L = G.legs[id]; out.push(capsule(L.P[0], L.P[2], L.w / 2)); } return out; }

// eye: kitten = glossy ink bean with glints; mama (iris) = orange iris + black slit that can dilate
function catEye(ctx, x, y, rx, ry, rot, e, s, iris, inner = 1) {
  const a = e.a ?? 1; if (a <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a;
  const sl = e.sleep || 0, hp = e.happy || 0;
  if (sl > 0.5 || hp > 0.5) { // closed: sleep = soft U curve, happy = ^
    ctx.strokeStyle = INKC; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.6, rx * 0.34 / Math.sqrt(Math.max(1, s / 1.2))); ctx.beginPath();
    if (hp > 0.5) { ctx.moveTo(-rx * 1.0, ry * 0.3); ctx.quadraticCurveTo(0, -ry * 0.9, rx * 1.0, ry * 0.3); } else { ctx.moveTo(-rx * 1.05, -ry * 0.05); ctx.quadraticCurveTo(0, ry * 0.75, rx * 1.05, -ry * 0.05); }
    ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1; return; }
  const wd = 1 + 0.35 * (e.wide || 0), op = clamp(e.open ?? 1); rx *= wd; ry *= wd;
  const oy = ry * Math.max(0.06, op);
  if (op < 0.1) { ctx.strokeStyle = INKC; ctx.lineWidth = Math.max(1.6, rx * 0.34); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-rx, 0); ctx.lineTo(rx, 0); ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1; return; }
  ctx.beginPath(); ctx.ellipse(0, ry - oy, rx, oy, 0, 0, 7); ctx.save(); ctx.clip();
  const lx = (e.look?.[0] || 0) * rx * 0.28, ly = (e.look?.[1] || 0) * ry * 0.22;
  if (iris) {
    const gI = ctx.createRadialGradient(lx, ly, 0, lx, ly, rx * 1.1); gI.addColorStop(0, '#F2C06A'); gI.addColorStop(0.7, '#E09A3E'); gI.addColorStop(1, '#B8702A');
    ctx.fillStyle = gI; ctx.fillRect(-rx * 1.2, -ry * 1.2, rx * 2.4, ry * 2.4);
    const dil = clamp(e.dil ?? 0.2); ctx.fillStyle = INKC; ctx.beginPath(); ctx.ellipse(lx, ly, rx * lerp(0.12, 0.78, dil), ry * lerp(0.92, 0.8, dil), 0, 0, 7); ctx.fill();
  } else { const g = ctx.createRadialGradient(lx - rx * 0.2, ly - ry * 0.2, 0, lx, ly, rx * 1.3); g.addColorStop(0, '#2c2622'); g.addColorStop(1, '#0e0c0b'); ctx.fillStyle = g; ctx.fillRect(-rx * 1.2, -ry * 1.2, rx * 2.4, ry * 2.4); }
  ctx.fillStyle = WHI; ctx.beginPath(); ctx.ellipse(lx - rx * 0.3, ly - ry * 0.34, rx * (iris ? 0.26 : 0.36), ry * (iris ? 0.22 : 0.3), -0.4, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(lx + rx * 0.34, ly + ry * 0.36, rx * 0.13, 0, 7); ctx.fill();
  if ((e.sparkle || 0) > 0.01) { ctx.globalAlpha = a * e.sparkle; ctx.beginPath(); ctx.arc(lx + rx * 0.3, ly - ry * 0.45, rx * 0.12, 0, 7); ctx.fill(); ctx.globalAlpha = a; }
  const ang = e.angry || 0;
  if (ang > 0.01) { const yi = ry - 2 * oy + 2 * oy * 0.95 * ang, yo = ry - 2 * oy + 2 * oy * 0.25 * ang; ctx.fillStyle = INKC; ctx.beginPath(); ctx.moveTo(-inner * rx * 1.3, -ry * 1.5); ctx.lineTo(-inner * rx * 1.3, yo); ctx.lineTo(inner * rx * 1.3, yi); ctx.lineTo(inner * rx * 1.3, -ry * 1.5); ctx.fill(); }
  ctx.restore();
  if (ang > 0.01) { const yi = ry - 2 * oy + 2 * oy * 0.95 * ang, yo = ry - 2 * oy + 2 * oy * 0.25 * ang; ctx.strokeStyle = INKC; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(2, rx * 0.34); ctx.beginPath(); ctx.moveTo(-inner * rx * 1.15, yo - ry * 0.05); ctx.lineTo(inner * rx * 1.1, yi - ry * 0.05); ctx.stroke(); }
  ctx.strokeStyle = INKC; ctx.lineWidth = Math.max(1.3, rx * (iris ? 0.22 : 0.12)); ctx.beginPath(); ctx.ellipse(0, ry - oy, rx, oy, 0, 0, 7); ctx.stroke();
  if (op < 0.98) { ctx.lineWidth = Math.max(1.8, rx * 0.3); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-rx * 1.08, ry - 2 * oy + oy * 0.15); ctx.quadraticCurveTo(0, ry - 2 * oy - oy * 0.35, rx * 1.08, ry - 2 * oy + oy * 0.15); ctx.stroke(); }
  ctx.restore(); ctx.globalAlpha = 1;
}

// draw a whole cat (chars layer). part: 'all' | 'back' (everything except front tail/paws) | 'front'
function drawCat(ctx, st, t, part = 'all') {
  const a = st.a ?? 1; if (a <= 0.01) return null;
  const G = catGeom(st, t), K = G.K, s = G.s, col = st.col || ORG.k1, sd = st.sd || 1, far = dk(col, 0.86);
  const inkW = (st.inkW ?? 1) * Math.pow(s, 0.6);
  withScratch(ctx, (c) => {
    const Hc = G.HX(0, 0), bc = bodyC(G);
    const legPoly = (id) => { const L = G.legs[id]; const w = L.w, fr = L.front, f = G.f, P0 = L.P[0], pc = [L.paw[0] + f * 1.5 * s, L.paw[1] - 1 * s], rx = 9 * s, ry = 6 * s, ank = [pc[0] - f * 2.5 * s, pc[1] - ry * 0.6];
      let dx = ank[0] - P0[0], dy = ank[1] - P0[1]; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl; const nx = -dy * f, ny = dx * f;
      const mid = [lerp(P0[0], ank[0], 0.5) - (fr ? 0 : f * 4 * s), lerp(P0[1], ank[1], 0.5)], hw = fr ? [0.55, 0.46, 0.52] : [0.82, 0.55, 0.52];
      const side = (sg) => [[P0, hw[0]], [mid, hw[1]], [ank, hw[2]]].map(([p, k]) => [p[0] + sg * nx * w * k, p[1] + sg * ny * w * k]);
      const Lp = side(1), Rp = side(-1), pawPts = []; for (let i = 0; i <= 10; i++) { const th = Math.PI - 0.15 - (Math.PI + 0.1) * i / 10; pawPts.push([pc[0] + Math.cos(th) * rx * f, pc[1] + Math.sin(th) * ry]); }
      return { poly: cr(Lp.concat(pawPts, Rp.reverse()), true, 5), pc, ry }; };
    const belly = () => { const B = st.pose.b, h = G.legs.HN.P[0], f2 = G.legs.FN.P[0], cx = (h[0] + f2[0]) / 2, cy = (h[1] + f2[1]) / 2 - 2 * s, rx = Math.abs(f2[0] - h[0]) / 2 + 6 * s; return ellPts(cx, cy, rx, 10 * s, 24); };
    // clean mode: ONE ink silhouette under every body part, then flat fills on top -> outline only round the outside of the union, no seams at the joints
    const inkPass = () => { c.save(); c.globalAlpha = a; c.strokeStyle = '#2a1c13'; c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = 4.6 * inkW * Math.pow(s, 0.2);
      for (const P of [legPoly('HF').poly, legPoly('FF').poly, G.body, belly(), legPoly('HN').poly, legPoly('FN').poly]) { c.beginPath(); P.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.stroke(); } c.restore(); };
    const legDraw = (id, shade) => { const L = G.legs[id];
      if (st.cleanLegs) { const q = legPoly(id);
        for (const k of [-3.5, 1.5]) { const p = [q.pc[0] + k * s * G.f, q.pc[1] + q.ry * 0.3]; brushPts(c, [p, [p[0], p[1] + 3 * s]], { w: 1.1 * inkW, a: a * 0.5, taper: 0.3, stri: 0, seed: sd + k }, 2); }
        return; } const poly = capsule(L.P[0], L.P[2], L.w / 2); wash(c, poly, shade, a, sd + id.length * 3 + (L.front ? 1 : 0), { edge: 3, core: 0 });
      const paw = ellPts(L.paw[0], L.paw[1], 9.5 * s, 6.5 * s, 16); wash(c, paw, shade, a, sd + 40 + id.charCodeAt(0), { edge: 3, core: 0 });
      looseLine(c, paw, 0.05, 0.55, 1.6 * inkW, a * (L.far ? 0.6 : 0.9), sd + 11, { dry: 0 });
      const d = [L.P[2][0] - L.P[0][0], L.P[2][1] - L.P[0][1]], dl = Math.hypot(...d) || 1, nx = -d[1] / dl * G.f, ny = d[0] / dl * G.f, off = L.w * 0.5 * (L.front ? 1 : -1);
      if (dl > 12 * s) brushPts(c, [[L.P[0][0] + nx * off + d[0] * 0.25, L.P[0][1] + ny * off + d[1] * 0.25], [L.P[2][0] + nx * off * 0.9, L.P[2][1] + ny * off * 0.9]], { w: 1.8 * inkW, a: a * (L.far ? 0.45 : 0.8), taper: 0.5, head: 0.2, stri: 0, dry: 0.3, seed: sd + 20 }, 2);
      if (st.closed && dl > 12 * s) { const o2 = -off, q0 = [L.P[0][0] + nx * o2 + d[0] * 0.3, L.P[0][1] + ny * o2 + d[1] * 0.3], q1 = [L.P[2][0] + nx * o2 * 0.95, L.P[2][1] + ny * o2 * 0.95]; brushPts(c, [q0, q1], { w: 1.7 * inkW, a: a * 0.8, taper: 0.7, head: 0.1, stri: 0, dry: 0.1, seed: sd + 21 }, 2); }
      for (const k of [-4, 1, 6]) { const p = [L.paw[0] + k * s * G.f, L.paw[1] + 3 * s]; brushPts(c, [p, [p[0], p[1] + 3.5 * s]], { w: 1.1 * inkW, a: a * 0.6, taper: 0.3, stri: 0, seed: sd + k }, 2); } };
    const tailDraw = () => { const T = G.tail; if (T.P.length < 3) return; const poly = tube(T.P, T.w); wash(c, poly, col, a, sd + 60, { edge: 3, core: 0 });
      if (K.stripes) for (const i of [4, 6, 8, 10]) { const p0 = T.P[i - 1], p1 = T.P[i], dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy) || 1, w = T.w[i] * 0.48;
        c.save(); pathPoly(c, poly); c.clip(); brushPts(c, [[p1[0] - dy / l * w, p1[1] + dx / l * w], [p1[0] + dy / l * w, p1[1] - dx / l * w]], { w: 3.4 * s, col: rgba(dk(col, 0.72), 1), a: a * 0.6, taper: 0.3, stri: 0, seed: i }, 2); c.restore(); }
      const side = T.P.map((p, i) => { const q0 = T.P[Math.max(0, i - 1)], q1 = T.P[Math.min(T.P.length - 1, i + 1)], dx = q1[0] - q0[0], dy = q1[1] - q0[1], l = Math.hypot(dx, dy) || 1, w = T.w[i] * 0.55; return [p[0] - dy / l * w, p[1] + dx / l * w]; });
      brushPts(c, side.slice(1), { w: 1.8 * inkW, a: a * 0.75, taper: 0.6, head: 0.2, stri: 0, dry: 0.3, seed: sd + 61 }, 2); };

    // ---- PRO standing body: one unified, anatomically-shaped silhouette (back, rump, thigh, hock, paws, belly, chest), tabby markings,
    // cream underside, soft shading, varied-weight ink contour, far legs behind. Local coords = P_STAND pose space (ground y = 0).
    const proBody = () => {
      const M = (pts) => pts.map((p) => G.X(p[0], p[1])), sm = (pts, n = 7) => cr(M(pts), true, n);
      const SIL = sm([[0, -57], [-14, -56], [-26, -51], [-33, -43], [-36, -34], [-35, -26], [-31, -18], [-28, -12], [-25, -7], [-24.5, -2.5], [-22.5, 0], [-9.5, 0], [-7.5, -2.4], [-11, -5.5], [-14, -9], [-14, -14], [-12, -20], [-6, -16.5], [2, -15], [9, -15.5], [11, -9], [11.5, -3.5], [13, 0], [27.5, 0], [29.5, -2.4], [26, -5.5], [24, -10], [24, -17], [29, -25], [32, -35], [30, -48], [22, -55], [10, -58]], 6);
      const FH = sm([[-24, -26], [-20, -14], [-19.5, -6], [-18.5, -2], [-16.5, 0], [-3, 0], [-1.5, -2.4], [-5, -5.5], [-8, -9.5], [-8, -18], [-11, -27]], 6);
      const FF = sm([[2, -26], [3, -10], [3.5, -4], [4.5, -1.5], [6.5, 0], [19.5, 0], [21, -2.4], [17.5, -5.5], [15.5, -10], [15.5, -22]], 6);
      const D = (list, sdv) => list.map((P, i) => deformPoly(P, 1.2, 0.18, sdv + i));
      const dkc = dk(col, 0.86), pawTicks = (x0, x1, sdv) => { for (const x of [x0, x1]) { const p = G.X(x, -0.8), q = G.X(x - 0.6 * G.f, -4.6); brushPts(c, [p, q], { w: 1.15 * inkW, a: a * 0.55, taper: 0.4, stri: 0, seed: sdv + x }, 2); } };
      // far legs (behind)
      for (const [P, sdv] of [[FH, 3], [FF, 5]]) { const [Q] = D([P], sd + sdv); wash(c, Q, dkc, a, sd + sdv, { edge: 0, core: 0 }); looseLine(c, Q, 0, 1, 1.4 * inkW, a * 0.7, sd + sdv + 1, { dry: 0.1, off: 0.4 }); }
      pawTicks(-11, -6, 31); pawTicks(10, 15, 33);
      // body wash over the single silhouette
      const [Q] = D([SIL], sd + 1);
      wash(c, Q, col, a, sd + 1, { edge: 0, core: 1, light: [...G.X(-12, -50), 26 * s] });
      c.save(); pathPoly(c, Q); c.clip();
      // cream underside + chest + paws (soft, bleeding up from the bottom edge)
      for (const [cx, cy, rx, ry, al] of [[2, -9, 34, 10, 0.5], [28, -22, 9, 13, 0.45], [-17, 1, 12, 4, 0.4], [20, 1, 12, 4, 0.4]]) { const p = G.X(cx, cy), g = c.createRadialGradient(p[0], p[1], 0, p[0], p[1], rx * s); g.addColorStop(0, `rgba(250,236,214,${al * a})`); g.addColorStop(1, 'rgba(250,236,214,0)'); c.save(); c.translate(p[0], p[1]); c.scale(1, ry / rx); c.translate(-p[0], -p[1]); c.fillStyle = g; c.fillRect(p[0] - rx * s, p[1] - rx * s, 2 * rx * s, 2 * rx * s); c.restore(); }
      // underside shadow (belly/thigh), a touch of warm dark
      for (const [cx, cy, rx, al] of [[-4, -20, 22, 0.16], [-30, -26, 12, 0.14]]) { const p = G.X(cx, cy), g = c.createRadialGradient(p[0], p[1], 0, p[0], p[1], rx * s); g.addColorStop(0, rgba(dk(col, 0.62), al * a)); g.addColorStop(1, rgba(dk(col, 0.62), 0)); c.fillStyle = g; c.fillRect(p[0] - rx * s, p[1] - rx * s, 2 * rx * s, 2 * rx * s); }
      // tabby: curved mackerel stripes down the back/flank, tail-base bars, leg rings, thigh swirl
      const sc = rgba(dk(col, 0.7), 1), strokes = [];
      for (let i = 0; i < 6; i++) { const x = -29 + i * 8.2, y0 = -57 + Math.abs(x + 6) * 0.1; strokes.push([[x, y0], [x - 1.5, y0 + 8], [x - 3.5 + (i > 3 ? 2 : 0), y0 + 16 + (i % 2) * 3]]); }
      for (const P of strokes) brushPts(c, P.map((p) => G.X(...p)), { w: 3.6 * s, col: sc, a: a * 0.55, taper: 0.85, head: 0.2, stri: 0, dry: 0, rag: 0, seed: sd + 40 + P[0][0] }, 2);
      for (const [x, y, ln] of [[-24, -24, 11], [-27, -17, 9], [-22, -9.5, 7], [-18, -4, 5], [17, -17, 8], [17.5, -10, 7], [17, -4.5, 5], [-13, -9, 6]]) { const p = G.X(x, y), q = G.X(x + ln * 0.9, y + 0.8); brushPts(c, [p, q], { w: 2.1 * s, col: sc, a: a * 0.5, taper: 0.5, head: 0.3, stri: 0, dry: 0, rag: 0, seed: sd + 90 + x }, 2); }
      brushPts(c, M([[-32, -33], [-27, -24], [-19, -19], [-13, -20]]), { w: 1.7 * inkW, a: a * 0.62, taper: 0.7, head: 0.1, stri: 0, dry: 0, rag: 0, seed: sd + 70, col: sc }, 2);   // thigh/stifle contour
      // rim light along the spine
      brushPts(c, M([[-24, -53], [-12, -56], [2, -57.5], [14, -57]]), { w: 2.4 * s, col: 'rgba(255,244,222,1)', a: a * 0.4, taper: 0.9, head: 0.2, stri: 0, dry: 0, rag: 0, seed: sd + 72 }, 2);
      c.restore();
      // ink contour (weight varies: heavier on the shadow side/bottom, lighter on the lit back)
      looseLine(c, Q, 0, 1, 1.9 * inkW, a * 0.92, sd + 2, { dry: 0.08, off: 0.5 });
      pawTicks(-19, -14, 35); pawTicks(18, 23, 37);
      for (const x of [-18, -13]) { const p = G.X(x, -0.8), q = G.X(x - 0.6 * G.f, -4.8); brushPts(c, [p, q], { w: 1.15 * inkW, a: a * 0.6, taper: 0.4, stri: 0, seed: sd + x }, 2); }
    };


    const proSitStd = () => {
      const grad = (cx, cy, rx, ry, rgb, al) => { const p = G.X(cx, cy), g = c.createRadialGradient(p[0], p[1], 0, p[0], p[1], rx * s); g.addColorStop(0, `rgba(${rgb},${al * a})`); g.addColorStop(1, `rgba(${rgb},0)`); c.save(); c.translate(p[0], p[1]); c.scale(1, ry / rx); c.translate(-p[0], -p[1]); c.fillStyle = g; c.fillRect(p[0] - rx * s, p[1] - rx * s, 2 * rx * s, 2 * rx * s); c.restore(); };
      const dkRgb = (() => { const d = dk(col, 0.55); return `${d[0] | 0},${d[1] | 0},${d[2] | 0}`; })(), lite = (cx, cy, rx, ry, al, rgb = '250,236,214') => grad(cx, cy, rx, ry, rgb, al), shade = (cx, cy, rx, ry, al) => grad(cx, cy, rx, ry, dkRgb, al);
      const M = (pts) => pts.map((p) => G.X(p[0], p[1])), sm = (pts, n = 7) => cr(M(pts), true, n);
      const RK = st.raise === true ? 1 : Math.max(0, Math.min(1, +st.raise || 0));   // 0 = arm down (leg in silhouette) .. 1 = arm raised; continuous
      const SA = [[10, -66], [-2, -64.5], [-14, -60], [-25, -51], [-32, -40], [-36, -28], [-38.5, -17], [-38, -8], [-33, -2], [-24, 0], [-6, 0], [14, 0], [27.5, 0], [29.5, -2.4], [26.5, -5.5], [25, -10], [25, -22], [28.5, -32], [28.5, -39], [28.5, -46], [23, -58], [16, -64]];
      const SB = [[10, -66], [-2, -64.5], [-14, -60], [-25, -51], [-32, -40], [-36, -28], [-38.5, -17], [-38, -8], [-33, -2], [-24, 0], [-6, 0], [12, 0], [21, 0], [23.5, -2.4], [20.5, -5.5], [19, -10], [19, -22], [24, -30], [27.5, -40], [27, -50], [22, -59], [16, -64]];
      const SIL = sm(SB, 6);   // body silhouette has NO near front leg; the near leg is always the arm tube from the shoulder (rest = hangs like the sheet, raise = same limb lifts)
      const HF = sm([[-19, -5.5], [-14, -9.5], [-6, -10.5], [2, -8.5], [7, -4.8], [8, -1.6], [5.5, 0], [-12, 0], [-18, -1.5]], 6);
      let AP = [], an = 0, pc = [0, 0], armPath = [];
      if (true) { const T = st.raiseTip || [48, -41], R0 = [[22, -36], [23, -28], [23, -18], [23, -9], [23.5, -4.5]], R1 = [[14, -30], [21, -31], [21 + (T[0] - 21) * 0.38, -31 + (T[1] + 31) * 0.38 + 1], [21 + (T[0] - 21) * 0.72, -31 + (T[1] + 31) * 0.72 + 0.6], T], path = armPath = cr(M(R0.map((p, i) => [p[0] + (R1[i][0] - p[0]) * RK, p[1] + (R1[i][1] - p[1]) * RK])), false, 6), n = path.length, wd = path.map((_, i) => (5.3 - 0.7 * i / (n - 1)) * s * 2), ARM = tube(path, wd), end = path[n - 1], pv = path[n - 3]; an = Math.atan2(end[1] - pv[1], end[0] - pv[0]);
        pc = [end[0] + Math.cos(an) * 2.0 * s, end[1] + Math.sin(an) * 2.0 * s];
        const PAW = ellPts(pc[0], pc[1], 6.4 * s, 5.4 * s, 22, -Math.PI / 2, 1, an), q0 = G.X(21, -31), ELB = ellPts(q0[0], q0[1], 5.4 * s, 5.4 * s, 20); AP = [ARM, PAW]; }
      const fixWind = (P) => { let ar = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; ar += p[0] * q[1] - q[0] * p[1]; } return ar < 0 ? P.slice().reverse() : P; };
      const FH = sm([[-12,-12],[-12,-4],[-10,-1],[0,0],[0,-2],[-3,-6],[-5,-12]], 4);
      const FF = sm([[5, -26], [5.5, -10], [6.5, -4], [8, -1.5], [10, 0], [21, 0], [22.5, -2.4], [19.5, -5.5], [17.5, -10], [17.5, -24]], 6);
      const D = (list, sdv) => list.map((P, i) => deformPoly(P, 1.2, 0.18, sdv + i));
      const dkc = dk(col, 0.86), pawTicks = (x0, x1, sdv) => { for (const x of [x0, x1]) { const p = G.X(x, -0.8), q = G.X(x - 0.6 * G.f, -4.6); brushPts(c, [p, q], { w: 1.15 * inkW, a: a * 0.55, taper: 0.4, stri: 0, seed: sdv + x }, 2); } };
      // far legs (behind)
      for (const [P, sdv] of [[FF, 5]]) { const [Q] = D([P], sd + sdv), fa = a; wash(c, Q, dkc, fa, sd + sdv, { edge: 0, core: 0 }); looseLine(c, Q, 0, 1, 1.4 * inkW, fa * 0.7, sd + sdv + 1, { dry: 0.1, off: 0.4 }); }
      pawTicks(12, 17, 33);
      // body wash over the single silhouette
      const [Q] = D([SIL], sd + 1);
      wash(c, Q, col, a, sd + 1, { edge: 0, core: 1, light: [...G.X(-12, -52), 26 * s] });
      const [QF] = D([HF], sd + 9); if (AP.length) { c.save(); c.globalAlpha = a; c.strokeStyle = '#2a1c13'; c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = 3.8 * inkW; for (const P of AP) { pathPoly(c, P); c.stroke(); } c.restore(); }
      washUnion(c, [Q, QF, ...AP], col, a, sd + 1);
      c.save(); pathPoly(c, Q); c.clip();
      // cream underside + chest + paws (soft, bleeding up from the bottom edge)
      for (const [cx, cy, rx, ry, al] of [[2, -4, 30, 8, 0.4], [26, -30, 8, 17, 0.5], [-8, 1, 10, 4, 0.4], [21, 1, 12, 4, 0.4]]) { const p = G.X(cx, cy), g = c.createRadialGradient(p[0], p[1], 0, p[0], p[1], rx * s); g.addColorStop(0, `rgba(250,236,214,${al * a})`); g.addColorStop(1, 'rgba(250,236,214,0)'); c.save(); c.translate(p[0], p[1]); c.scale(1, ry / rx); c.translate(-p[0], -p[1]); c.fillStyle = g; c.fillRect(p[0] - rx * s, p[1] - rx * s, 2 * rx * s, 2 * rx * s); c.restore(); }
      // underside shadow (belly/thigh), a touch of warm dark
      for (const [cx, cy, rx, al] of [[2, -30, 12, 0.16], [-30, -18, 10, 0.14]]) { const p = G.X(cx, cy), g = c.createRadialGradient(p[0], p[1], 0, p[0], p[1], rx * s); g.addColorStop(0, rgba(dk(col, 0.62), al * a)); g.addColorStop(1, rgba(dk(col, 0.62), 0)); c.fillStyle = g; c.fillRect(p[0] - rx * s, p[1] - rx * s, 2 * rx * s, 2 * rx * s); }
      // tabby: curved mackerel stripes down the back/flank, tail-base bars, leg rings, thigh swirl
      const sc = rgba(dk(col, 0.7), 1), strokes = [];
      for (const [x, y] of [[-6, -62], [-14, -58], [-21, -51], [-27, -42]]) strokes.push([[x, y], [x - 1.5, y + 7], [x - 3, y + 15]]);
      for (const P of strokes) brushPts(c, P.map((p) => G.X(...p)), { w: 3.6 * s, col: sc, a: a * 0.55, taper: 0.85, head: 0.2, stri: 0, dry: 0, rag: 0, seed: sd + 40 + P[0][0] }, 2);
      for (const [x, y, ln] of [[-33, -24, 9], [-33, -17, 9], [-30, -10, 8], [-25, -4.5, 6], ...(true ? [[13, -14, 5], [13, -7.5, 5]] : [[20, -26, 7], [20, -19, 7], [20, -12, 7], [20.5, -5.5, 5]])]) { const p = G.X(x, y), q = G.X(x + ln * 0.9, y + 0.8); brushPts(c, [p, q], { w: 2.1 * s, col: sc, a: a * 0.5, taper: 0.5, head: 0.3, stri: 0, dry: 0, rag: 0, seed: sd + 90 + x }, 2); }
      brushPts(c, M([[-30, -29], [-19, -32], [-8, -26], [-3.5, -17], [-5.2, -10.6]]), { w: 2.0 * inkW, a: a * 0.92, taper: 0.7, head: 0.15, stri: 0, dry: 0.05, rag: 0, seed: sd + 70 }, 2);   // thigh contour (ink)
      if (false) brushPts(c, M([[15.5, -30], [15.3, -18], [15.8, -7], [17, -2]]), { w: 1.9 * inkW, a: a * 0.9, taper: 0.7, head: 0.15, stri: 0, dry: 0.05, rag: 0, seed: sd + 71 }, 2);   // near leg inner edge (ink)
      // rim light along the spine
      brushPts(c, M([[-22, -52], [-12, -59], [0, -64]]), { w: 2.4 * s, col: 'rgba(255,244,222,1)', a: a * 0.4, taper: 0.9, head: 0.2, stri: 0, dry: 0, rag: 0, seed: sd + 72 }, 2);
      shade(11, -12, 5, 13, 0.3); lite(-26, -30, 8, 12, 0.22, '255,244,222'); shade(-3, -14, 5, 10, 0.2);
      c.restore();
      // ink contour (weight varies: heavier on the shadow side/bottom, lighter on the lit back)
      if (AP.length) {
        const ex = G.X(22.5, -30), erx = 6.2 * s, ery = 7.5 * s, L = [0]; for (let i = 1; i <= Q.length; i++) { const p = Q[i - 1], q = Q[i % Q.length]; L.push(L[i - 1] + Math.hypot(q[0] - p[0], q[1] - p[1])); }
        let i0 = -1, i1 = -1; Q.forEach((p, i) => { if (((p[0] - ex[0]) / erx) ** 2 + ((p[1] - ex[1]) / ery) ** 2 < 1) { if (i0 < 0) i0 = i; i1 = i; } });
        const f0 = i0 / Q.length, f1 = (i1 + 1) / Q.length;
        looseLine(c, Q, f1, 1, 1.9 * inkW, a * 0.92, sd + 2, { dry: 0.08, off: 0.5, taper: 0.2, head: 0.05 }); looseLine(c, Q, 0, f0, 1.9 * inkW, a * 0.92, sd + 3, { dry: 0.08, off: 0.5, taper: 0.05, head: 0.05 });
      } else looseLine(c, Q, 0, 1, 1.9 * inkW, a * 0.92, sd + 2, { dry: 0.08, off: 0.5 });
      looseLine(c, QF, 0, 1, 1.9 * inkW, a * 0.92, sd + 8, { dry: 0, off: 0.4 });
      const ik = (pts, w, al, sdv, tp = 0.7) => brushPts(c, M(pts), { w: w * inkW, a: a * al, taper: tp, head: 0.15, stri: 0, dry: 0.05, rag: 0, seed: sd + sdv }, 2);
      if (true) ik([[6.5, -24], [6.2, -12], [7, -5], [9.5, -2.6], [14.5, -3.2]], 1.5, 0.75, 81, 0.6);   // far leg edge + paw
      pawTicks(-12, -7, 35); if (true) { pawTicks(11, 16, 37); ik([[6, -24], [5.5, -12], [6.5, -4], [9, -1.5]], 1.2, 0.5, 82, 0.6); } else { pawTicks(21, 26, 37); pawTicks(10.5, 14, 38); }
      for (const x of []) { const p = G.X(x, -0.8), q = G.X(x - 0.6 * G.f, -4.8); brushPts(c, [p, q], { w: 1.15 * inkW, a: a * 0.6, taper: 0.4, stri: 0, seed: sd + x }, 2); }
      if (AP.length) {
        c.save(); c.beginPath(); for (const P of AP) { const Q2 = fixWind(P); c.moveTo(Q2[0][0], Q2[0][1]); for (let k = 1; k < Q2.length; k++) c.lineTo(Q2[k][0], Q2[k][1]); c.closePath(); } c.clip('nonzero');
        { const n = armPath.length, at = (f) => armPath[Math.min(n - 1, Math.round(f * (n - 1)))], pi = at(0.75), pb = at(0.3), L = (px_, py_, rx, ry, al, rgb) => { const g = c.createRadialGradient(px_, py_, 0, px_, py_, rx * s); g.addColorStop(0, `rgba(${rgb},${al * a})`); g.addColorStop(1, `rgba(${rgb},0)`); c.fillStyle = g; c.fillRect(px_ - rx * s, py_ - rx * s, 2 * rx * s, 2 * rx * s); };
          L(pi[0], pi[1], 8, 4, 0.3, '250,236,214'); L(pb[0], pb[1], 7, 4, 0.22, '120,70,40');
          for (const f of [0.5, 0.7]) { const q0 = at(f), q1 = at(Math.min(1, f + 0.08)), dx = q1[0] - q0[0], dy = q1[1] - q0[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, w = 4.2 * s; brushPts(c, [[q0[0] - nx * w, q0[1] - ny * w], [q0[0] + nx * w, q0[1] + ny * w]], { w: 2.1 * s, col: sc, a: a * 0.5, taper: 0.5, head: 0.3, stri: 0, dry: 0, rag: 0, seed: sd + 91 + f * 10 }, 2); } }
        c.restore();
        const nx = -Math.sin(an), ny = Math.cos(an);
        for (const k of [-0.9, 0, 0.9]) { const p = [pc[0] + nx * k * 2.2 * s + Math.cos(an) * 2.2 * s, pc[1] + ny * k * 2.2 * s + Math.sin(an) * 2.2 * s], q = [p[0] + Math.cos(an) * 1.8 * s, p[1] + Math.sin(an) * 1.8 * s]; brushPts(c, [p, q], { w: 1.1 * inkW, a: a * 0.55, taper: 0.4, stri: 0, seed: sd + k * 7 }, 2); }
      }
    };


    // PRO airborne body (jump / pounce / run): body ellipse + four tube legs, one colour over the union, thin ink outline all round
    const proAir = () => {
      const P0 = st.pose;
      const sc = rgba(dk(col, 0.7), 1), dkc = dk(col, 0.86), B = G.body;
      const legP = (id) => { const L = G.legs[id], pts = cr(L.P, false, 6), n = pts.length, w = pts.map((_, i) => L.w * (1 - 0.28 * i / (n - 1)) * 0.5 * 2); return tube(pts, w); };
      const pawP = (id) => { const L = G.legs[id], d = [L.P[2][0] - L.P[1][0], L.P[2][1] - L.P[1][1]], an = Math.atan2(d[1], d[0]); return ellPts(L.P[2][0] + Math.cos(an) * L.w * 0.25, L.P[2][1] + Math.sin(an) * L.w * 0.25, L.w * 0.62, L.w * 0.5, 18, -Math.PI / 2, 1, an); };
      const ink = (parts, wd) => { c.save(); c.globalAlpha = a; c.strokeStyle = '#2a1c13'; c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = wd * inkW; for (const P of parts) { pathPoly(c, P); c.stroke(); } c.restore(); };
      // far legs behind, darker
      const far = ['HF', 'FF'].map((id) => [legP(id), pawP(id)]).flat();
      ink(far, 3.4); washUnion(c, far, dkc, a, sd + 5);
      const near = ['HN', 'FN'].map((id) => [legP(id), pawP(id)]).flat(), parts = [B, ...near];
      ink(parts, 3.8); washUnion(c, parts, col, a, sd + 1);
      c.save(); c.beginPath(); for (const P of parts) { let Q = P, ar = 0; for (let i = 0; i < Q.length; i++) { const p = Q[i], q = Q[(i + 1) % Q.length]; ar += p[0] * q[1] - q[0] * p[1]; } if (ar < 0) Q = Q.slice().reverse(); c.moveTo(Q[0][0], Q[0][1]); for (let i = 1; i < Q.length; i++) c.lineTo(Q[i][0], Q[i][1]); c.closePath(); } c.clip('nonzero');
      const bx = P0.b, BL = G.BL, X = G.X, W = bx[2], Hh = bx[3], pt = (u, v) => X(...BL(u * W, v * Hh));
      const grad = (p, r, ry, rgb, al) => { const g = c.createRadialGradient(p[0], p[1], 0, p[0], p[1], r); g.addColorStop(0, `rgba(${rgb},${al * a})`); g.addColorStop(1, `rgba(${rgb},0)`); c.save(); c.translate(p[0], p[1]); c.scale(1, ry); c.translate(-p[0], -p[1]); c.fillStyle = g; c.fillRect(p[0] - r, p[1] - r, 2 * r, 2 * r); c.restore(); };
      grad(pt(0, 0.85), W * s * 0.8, 0.4, '250,236,214', 0.55);          // cream belly
      grad(pt(0.2, -0.5), W * s * 0.7, 0.45, '255,244,222', 0.2);        // back light
      grad(pt(-0.1, 1.0), W * s * 0.6, 0.3, `${(dk(col, 0.55)[0]) | 0},${(dk(col, 0.55)[1]) | 0},${(dk(col, 0.55)[2]) | 0}`, 0.2);
      for (let i = 0; i < 6; i++) { const u = -0.72 + i * 0.28; brushPts(c, [pt(u, -0.98), pt(u - 0.04, -0.55), pt(u - 0.1, -0.1 + (i % 2) * 0.12)], { w: 3.6 * s, col: sc, a: a * 0.55, taper: 0.85, head: 0.2, stri: 0, dry: 0, rag: 0, seed: sd + 40 + i }, 2); }
      for (const id of ['HN', 'FN']) { const L = G.legs[id], p0 = L.P[0], p1 = L.P[2], dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
        for (const k of [0.35, 0.55, 0.75]) { const m = [p0[0] + dx * k, p0[1] + dy * k], w = L.w * 0.5; brushPts(c, [[m[0] - nx * w, m[1] - ny * w], [m[0] + nx * w, m[1] + ny * w]], { w: 2.1 * s, col: sc, a: a * 0.5, taper: 0.5, head: 0.3, stri: 0, dry: 0, rag: 0, seed: sd + 90 + k * 10 }, 2); } }
      c.restore();
      for (const id of ['HF', 'FF', 'HN', 'FN']) { const L = G.legs[id], d = [L.P[2][0] - L.P[1][0], L.P[2][1] - L.P[1][1]], an = Math.atan2(d[1], d[0]), nx = -Math.sin(an), ny = Math.cos(an);
        for (const k of [-0.28, 0.28]) { const p = [L.P[2][0] + nx * k * L.w + Math.cos(an) * L.w * 0.25, L.P[2][1] + ny * k * L.w + Math.sin(an) * L.w * 0.25], q = [p[0] + Math.cos(an) * L.w * 0.34, p[1] + Math.sin(an) * L.w * 0.34]; brushPts(c, [p, q], { w: 1.1 * inkW, a: a * (L.far ? 0.4 : 0.6), taper: 0.4, stri: 0, seed: sd + k * 9 }, 2); } }
    };
    // PRO tail: closed ink contour all round, tapered, wrapped bands, dark tip; base tucks behind the haunch
    const proTail = () => {
      const T = G.tail; if (T.P.length < 3) return; const poly = tube(T.P, T.w), sc = rgba(dk(col, 0.7), 1);
      c.save(); c.globalAlpha = a; c.strokeStyle = '#2a1c13'; c.lineJoin = 'round'; c.lineCap = 'round'; c.restore();
      washUnion(c, [poly], col, a, sd + 60);
      c.save(); pathPoly(c, poly); c.clip();
      const n = T.P.length;
      for (const i of [3, 5, 7, 9]) { if (i >= n - 1) continue; const p0 = T.P[i - 1], p1 = T.P[i], p2 = T.P[i + 1], dx = p2[0] - p0[0], dy = p2[1] - p0[1], l = Math.hypot(dx, dy) || 1, w = T.w[i] * 0.62, nx = -dy / l, ny = dx / l, bow = l * 0.12;
        brushPts(c, [[p1[0] + nx * w, p1[1] + ny * w], [p1[0] + dx / l * bow, p1[1] + dy / l * bow], [p1[0] - nx * w, p1[1] - ny * w]], { w: 2.6 * s, col: sc, a: a * 0.6, taper: 0.25, head: 0.1, stri: 0, dry: 0, rag: 0, seed: sd + 80 + i }, 2); }
      const e = n - 1, q0 = T.P[e - 2], q1 = T.P[e], dx = q1[0] - q0[0], dy = q1[1] - q0[1], l = Math.hypot(dx, dy) || 1;
      brushPts(c, [[q0[0], q0[1]], [q1[0] + dx / l * 4, q1[1] + dy / l * 4]], { w: T.w[e - 2] * 0.9, col: sc, a: a * 0.7, taper: 0.1, head: 0, stri: 0, dry: 0, rag: 0, seed: sd + 99 }, 2);
      c.restore();
      looseLine(c, poly, 0, 1, 1.9 * inkW, a * 0.92, sd + 62, { dry: 0.08, off: 0.5 });
    };
    // ---- PRO sitting body: one silhouette (back, rump on the floor, chest, front legs), haunch + hind foot overlay, tabby, cream chest, outline
    const proSit = () => {
      const M = (pts) => pts.map((p) => G.X(p[0], p[1])), sm = (pts, n = 6) => cr(M(pts), true, n), ell = (cx, cy, rx, ry, n = 40) => { const q = G.X(cx, cy); return ellPts(q[0], q[1], rx * s, ry * s, n); };
      // anatomy as overlapping parts: torso, haunch (thigh), hind foot, near + far front legs. Union-filled (no seams), ink only round the union, form lines inside.
      const TORSO = sm([[2, -67], [-12, -61], [-24, -49], [-30, -34], [-30, -20], [-24, -8], [-12, -4], [8, -6], [22, -10], [26, -24], [25, -40], [20, -55], [11, -65]]);
      const HAUNCH = ell(-16, -15.5, 19.5, 15.5), FOOT = ell(-2.6, -2.9, 12.4, 4.9, 28);
      const NEAR = sm([[16, -26], [15.5, -12], [16.5, -4], [17, -1.5], [19, 0], [31, 0], [32.5, -2.5], [29, -5.5], [26, -9], [25.5, -24]]);
      const FAR = sm([[8, -22], [8, -8], [9, -3], [10, -1.5], [12, 0], [22, 0], [23.5, -2.4], [20.5, -5.5], [18, -10], [18, -22]]);
      const sc = rgba(dk(col, 0.7), 1), grad = (cx, cy, rx, ry, rgb, al) => { const p = G.X(cx, cy), g = c.createRadialGradient(p[0], p[1], 0, p[0], p[1], rx * s); g.addColorStop(0, `rgba(${rgb},${al * a})`); g.addColorStop(1, `rgba(${rgb},0)`); c.save(); c.translate(p[0], p[1]); c.scale(1, ry / rx); c.translate(-p[0], -p[1]); c.fillStyle = g; c.fillRect(p[0] - rx * s, p[1] - rx * s, 2 * rx * s, 2 * rx * s); c.restore(); };
      const dkRgb = (() => { const d = dk(col, 0.55); return `${d[0] | 0},${d[1] | 0},${d[2] | 0}`; })(), lite = (cx, cy, rx, ry, al, rgb = '250,236,214') => grad(cx, cy, rx, ry, rgb, al), shade = (cx, cy, rx, ry, al) => grad(cx, cy, rx, ry, dkRgb, al);
      const parts = [FAR, TORSO, HAUNCH, FOOT, NEAR];
      // 1. ink silhouette under everything
      c.save(); c.globalAlpha = a; c.strokeStyle = '#2a1c13'; c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = 4.2 * inkW * Math.pow(s, 0.2); for (const P of parts) { pathPoly(c, P); c.stroke(); } c.restore();
      // 2. one colour fill over the union
      washUnion(c, parts, col, a, sd + 1);
      // 3. shading / cream / markings, clipped to the union
      c.save(); c.beginPath(); for (const P of parts) { let Q = P; let ar = 0; for (let i = 0; i < Q.length; i++) { const p = Q[i], q = Q[(i + 1) % Q.length]; ar += p[0] * q[1] - q[0] * p[1]; } if (ar < 0) Q = Q.slice().reverse(); c.moveTo(Q[0][0], Q[0][1]); for (let i = 1; i < Q.length; i++) c.lineTo(Q[i][0], Q[i][1]); c.closePath(); } c.clip('nonzero');
      lite(-14, -46, 22, 16, 0.22, '255,244,222'); lite(22, -42, 12, 19, 0.6); lite(21, -20, 8, 13, 0.45); lite(8, -2, 22, 5, 0.4); lite(26, -3, 8, 4, 0.4);
      shade(-2.5, -26, 7, 9, 0.3); shade(0.5, -13, 4, 8, 0.28); shade(-14, -4, 14, 3.5, 0.22);   // body in shadow just beyond the thigh edge: gives the thigh volume (no soft pale blotch)
      shade(-30, -12, 8, 16, 0.22); shade(-12, -5, 18, 5, 0.2); shade(13, -58, 15, 6, 0.26);       // thigh rear, under the thigh, under the chin
      shade(12.5, -12, 4.5, 12, 0.34);                      // far front leg, darker behind the near leg
      for (const [x, y, dx, dy] of [[-3, -63, 9, 4], [-14, -57, 11, 5], [-22, -48, 12, 6], [-28, -38, 11, 7]]) brushPts(c, M([[x, y], [x + dx * 0.55, y + dy * 0.45 + 1.5], [x + dx, y + dy + 4]]), { w: 3.0 * s, col: sc, a: a * 0.55, taper: 0.9, head: 0.15, stri: 0, dry: 0, rag: 0, seed: sd + 40 + x }, 2);
      for (const [x0, y0, x1, y1, w, al] of [[-35, -28.5, -27.5, -28, 2.0, 0.5], [-35.5, -22.5, -26, -20.5, 2.6, 0.55], [-35, -15.5, -24.5, -13, 2.6, 0.55], [-32, -8.5, -22.5, -7, 2.2, 0.48]]) brushPts(c, M([[x0, y0], [(x0 + x1) / 2, (y0 + y1) / 2 - 1.6], [x1, y1]]), { w: w * s, col: sc, a: a * al, taper: 0.85, head: 0.1, stri: 0, dry: 0, rag: 0, seed: sd + 60 + y0 }, 2);   // thigh bars wrapping round the thigh
      lite(-30, -24, 5, 11, 0.26, '255,244,222');   // light catching the round rear of the thigh
      lite(-3, -3.2, 8, 3, 0.35, '255,240,214');    // toe tips of the hind foot
      for (const y of [-36, -28.5, -21, -13.5]) brushPts(c, M([[26.6, y - 0.5], [22, y + 1.2], [17.6, y + 0.8]]), { w: 2.3 * s, col: sc, a: a * 0.5, taper: 0.85, head: 0.1, stri: 0, dry: 0, rag: 0, seed: sd + 90 + y }, 2);      // near-leg bars from the outer edge inwards
      for (const y of [-17, -10.5]) brushPts(c, M([[8.6, y], [12.5, y + 0.9], [15.5, y + 0.4]]), { w: 1.7 * s, col: sc, a: a * 0.42, taper: 0.8, head: 0.1, stri: 0, dry: 0, rag: 0, seed: sd + 95 + y }, 2);
      shade(11.5, -10, 5, 11, 0.3); shade(14, -30, 4, 9, 0.2);
brushPts(c, M([[-22, -52], [-12, -59], [0, -65]]), { w: 2.4 * s, col: 'rgba(255,244,222,1)', a: a * 0.42, taper: 0.9, head: 0.2, stri: 0, dry: 0, rag: 0, seed: sd + 72 }, 2);
      c.restore();
      // 4. form lines (ink): thigh front edge, near-leg inner edge, hind-foot top, far-leg hints, toes
      const ln = (pts, w, al, sdv, tp = 0.8) => brushPts(c, M(pts), { w: w * inkW, a: a * al, taper: tp, head: 0.25, stri: 0, dry: 0, rag: 0, seed: sd + sdv }, 2);
      ln([[-25, -29.5], [-14, -31.5], [-5, -24], [-1.8, -13], [-3.5, -7.6]], 2.0, 0.85, 73);
      ln([[-13.5, -5.0], [-6, -7.4], [2.2, -6.2]], 1.8, 0.9, 74, 0.7);
      ln([[15.2, -33], [15.4, -22], [15.6, -11], [16.6, -4], [19.5, -0.9]], 2.0, 0.9, 75);
      ln([[8.2, -21], [8.2, -9], [8.6, -4.2], [11.2, -2.6], [15.4, -3.4]], 1.4, 0.6, 77, 0.6);   // far leg edge + its paw rounding
      
      for (const x of [-9, -4.5, 0]) { const p = G.X(x, -0.5), q = G.X(x - 0.4 * G.f, -3.8); brushPts(c, [p, q], { w: 1.1 * inkW, a: a * 0.55, taper: 0.4, stri: 0, seed: sd + x }, 2); }
      for (const x of [22.5, 26.5, 30]) { const p = G.X(x, -0.6), q = G.X(x - 0.4 * G.f, -4.2); brushPts(c, [p, q], { w: 1.1 * inkW, a: a * 0.55, taper: 0.4, stri: 0, seed: sd + x }, 2); }
      for (const x of [11.5, 14.5]) { const p = G.X(x, -0.6), q = G.X(x - 0.4 * G.f, -3.6); brushPts(c, [p, q], { w: 1 * inkW, a: a * 0.4, taper: 0.4, stri: 0, seed: sd + x + 9 }, 2); }
    };
    const doBack = part !== 'front', doFront = part !== 'back';
    if (doBack) {
      if (!G.tailFront) { if (st.pro === 'sit' || st.pro === 'air') proTail(); else tailDraw(); }
      if (st.pro) { if (st.pro === 'sit') proSitStd(); else if (st.pro === 'air') proAir(); else proBody(); } else {
      const SIT = !!st.sitFull;
      // sitting cat: ONE closed silhouette (back, rump, haunch to the floor, chest) instead of body ellipse + hind-leg capsule
      const SILP = SIT ? cr([[-9, -66], [-22, -57], [-31, -40], [-34, -20], [-30, -6], [-20, 0], [-4, 1], [14, 1], [19, -10], [17, -34], [14, -52], [6, -64]].map((p) => G.X(...p)), true, 7) : null;
      if (st.cleanLegs) { for (const id of ['HF', 'FF']) { const q = legPoly(id); wash(c, q.poly, col, a, sd + 30, { edge: 0, core: 0 }); looseLine(c, q.poly, 0.07, 0.93, 1.9 * inkW, a * 0.85, sd + 11, { dry: 0.15, off: 0.6 }); } }
      else { if (!SIT) legDraw('HF', far); legDraw('FF', far); }
      if (st.cleanLegs) washUnion(c, [legPoly('HN').poly, G.body, legPoly('FN').poly, belly()], col, a, sd + 1); else
      // body
      wash(c, SIT ? SILP : G.body, col, a, sd + 1, { edge: st.cleanLegs ? 0 : undefined, light: [bc[0] - 10 * s * G.f, bc[1] - 12 * s, 30 * s] });
      if (st.pat) { c.save(); pathPoly(c, G.body); c.clip(); for (const [bx, by, r] of st.pat) { const p = G.X(...G.BL(bx, by)); fillPoly(c, deformPoly(ellPts(p[0], p[1], r * s, r * 0.8 * s, 16), 2, 0.3, sd + bx), PAPB, a * 0.92); } c.restore(); }
      if (K.stripes) { c.save(); pathPoly(c, SIT ? SILP : G.body); c.clip(); const B = st.pose.b;
        for (let i = 0; i < 4; i++) { const bx = -B[2] * 0.55 + i * B[2] * 0.33, p0 = G.X(...G.BL(bx, -B[3] * 1.1)), p1 = G.X(...G.BL(bx - 3, -B[3] * 0.25)); brushPts(c, [p0, p1], { w: 4.5 * s, col: rgba(dk(col, 0.72), 1), a: a * 0.55, taper: 0.8, head: 0.2, stri: 0, seed: sd + i * 3 }, 2); }
        c.restore(); }
      if (SIT) { looseLine(c, SILP, 0, 1, 2.6 * inkW, a * 0.9, sd + 2, { dry: 0 });
        // haunch (thigh) contour, soft shade and hind foot, all inside the silhouette
        c.save(); pathPoly(c, SILP); c.clip(); const th = cr([[-30, -30], [-22, -12], [-8, -3], [6, -3]].map((p) => G.X(...p)), false, 6);
        brushPts(c, th, { w: 2.6 * inkW, col: rgba(dk(col, 0.6), 1), a: a * 0.7, taper: 0.7, head: 0.1, stri: 0, dry: 0.2, seed: sd + 8 }, 2);
        brushPts(c, cr([[-33, -22], [-30, -9], [-22, -2]].map((p) => G.X(...p)), false, 5), { w: 7 * s, col: rgba(dk(col, 0.78), 1), a: a * 0.35, taper: 0.8, stri: 0, seed: sd + 9 }, 2); c.restore();
        const hf = ellPts(...G.X(7, -3.5), 13 * s, 6 * s, 20); wash(c, hf, col, a, sd + 10, { edge: 3, core: 0 }); looseLine(c, hf, 0, 1, 1.9 * inkW, a * 0.9, sd + 11, { dry: 0 });
        for (const k of [-4, 1, 6]) { const p = G.X(7 + k, -1); brushPts(c, [p, [p[0], p[1] + 2.4 * s]], { w: 1.1 * inkW, a: a * 0.6, taper: 0.3, stri: 0, seed: sd + k }, 2); }
      } else {
      looseLine(c, G.body, 0.5, 1.0, 2.4 * inkW, a * 0.85, sd + 2);
      looseLine(c, G.body, 0.06, 0.3, 1.8 * inkW, a * 0.6, sd + 3);
      if (st.cleanLegs) for (const id of ['HN', 'FN']) looseLine(c, legPoly(id).poly, 0.07, 0.93, 2 * inkW, a * 0.9, sd + 12, { dry: 0.15, off: 0.6 });
      if (st.closed) looseLine(c, G.body, 0.28, 0.52, 2.0 * inkW, a * 0.8, sd + 4, { dry: 0 }); }
      if (!st.sitFull) legDraw('HN', col);
      if (!st.hideFN) legDraw('FN', col);
      }
    }
    if (doFront) { if (G.tailFront) tailDraw(); if (st.hideFN) legDraw('FN', col); }
    if (doBack && !st.noHead) {
      // head
      for (const E of [G.earF, G.earN]) { wash(c, E.poly, col, a, sd + 70, { edge: 3, core: 0 }); ovBrush(c, E.inner, { w: 3.2 * s, col: 'rgba(250,236,214,1)', a: a * 0.7, taper: 0.5, head: 0.3, seed: sd + 71 }, 2);
        brushPts(c, E.poly.slice(1, E.poly.length - 1), { w: 1.8 * inkW, a: a * 0.85, taper: 0.4, head: 0.2, stri: 0, dry: 0.2, seed: sd + 72 }, 2); }
      wash(c, G.head, col, a, sd + 5, { light: [Hc[0] - 10 * s * G.f, Hc[1] - 12 * s, 26 * s] });
      // muzzle/cheek paper patch + forehead stripes
      c.save(); pathPoly(c, G.head); c.clip();
      const mz = G.HX(6, 11); fillPoly(c, deformPoly(ellPts(mz[0], mz[1], 17 * s * G.hs, 10 * s * G.hs, 18, 0, 1, G.f * 0), 2, 0.25, sd + 8), PAPB, a * 0.8);
      if (K.stripes) for (const [x0, y0, x1, y1] of [[-2, -26, 0, -14], [7, -27, 7, -15], [16, -26, 13, -14]]) brushPts(c, [G.HX(x0, y0), G.HX(x1, y1)], { w: 3.6 * s * G.hs, col: rgba(dk(col, 0.7), 1), a: a * 0.6, taper: 0.8, head: 0.2, stri: 0, seed: sd + x0 }, 2);
      c.restore();
      looseLine(c, G.head, 0.45, 1.02, 2.2 * inkW, a * 0.9, sd + 6);
      if (st.pro) looseLine(c, G.head, 0.05, 0.42, 2.0 * inkW, a * 0.9, sd + 7, { dry: 0.05, off: 0.8 }); else looseLine(c, G.head, 0.08, 0.36, 1.8 * inkW, a * 0.7, sd + 7);
      // face
      const e = st.e || {}, eR = K.eye, hs = G.hs, ex = K.eyeSp, fc = 6;
      const E1 = G.HX(fc - ex, -2), E2 = G.HX(fc + ex, -2), rot = G.f * (st.pose.h[2] + (st.hTilt || 0) + (st.rot || 0));
      const ea = Object.assign({}, e, { a: (e.a ?? 1) * a }); catEye(c, E1[0], E1[1], eR[0] * s * hs, eR[1] * s * hs, rot, ea, s, K.iris, G.f); catEye(c, E2[0], E2[1], eR[0] * s * hs, eR[1] * s * hs, rot, ea, s, K.iris, -G.f);
      const N = G.HX(fc, 7.5); c.fillStyle = INKC; c.globalAlpha = a; c.beginPath(); c.moveTo(N[0] - 3.4 * s * hs, N[1] - 1.8 * s * hs); c.lineTo(N[0] + 3.4 * s * hs, N[1] - 1.8 * s * hs); c.lineTo(N[0], N[1] + 2.4 * s * hs); c.closePath(); c.fill(); c.globalAlpha = 1;
      const m = st.mouth || {}, mo = m.open || 0;
      if (mo > 0.05) { const M = G.HX(fc, 13 + 5 * mo); c.save(); c.translate(M[0], M[1]); c.rotate(rot); c.fillStyle = '#2a1a14'; c.globalAlpha = a; c.beginPath(); c.ellipse(0, 0, (4 + 3 * mo) * s * hs, (2 + 6 * mo) * s * hs, 0, 0, 7); c.fill();
        c.fillStyle = rgba(dk(col, 0.95), 1); c.beginPath(); c.ellipse(0, (1 + 3 * mo) * s * hs, (2.5 + 1.5 * mo) * s * hs, (1 + 2.5 * mo) * s * hs, 0, 0, 7); c.fill();
        if (m.fang !== 0 && mo > 0.4) { c.fillStyle = WHI; for (const sg of [-1, 1]) { c.beginPath(); c.moveTo(sg * 3.5 * s * hs, -(1 + 5 * mo) * s * hs); c.lineTo(sg * 2.2 * s * hs, -(1 + 5 * mo) * s * hs + 3 * s); c.lineTo(sg * 1.2 * s * hs, -(1 + 5 * mo) * s * hs); c.fill(); } }
        c.restore(); c.globalAlpha = 1; }
      else { const w = 3.6 * s * hs; const p0 = G.HX(fc, 10); ovBrush(c, [G.HX(fc - 5.5, 12.5), G.HX(fc - 2.6, 14), p0, G.HX(fc + 2.6, 14), G.HX(fc + 5.5, 12.5)], { w: 1.25 * inkW, a: a * 0.9, taper: 0.2, head: 0.2 }, 1.5); }
      for (let i = 0; i < 3; i++) for (const sg of [-1, 1]) { const p = G.HX(fc + sg * 11, 8 + i * 2.5), q = G.HX(fc + sg * (30 + 2 * i), 4 + i * 6 + 1.5 * Math.sin(t * LQ(2) + i)); ovBrush(c, [p, [lerp(p[0], q[0], 0.5), lerp(p[1], q[1], 0.5) - 1.5 * s], q], { w: 0.8 * inkW, a: a * 0.55, taper: 0.8, head: 0.05 }, 2); }
      if ((st.blush || 0) > 0.01) for (const sg of [-1, 1]) { const p = G.HX(fc + sg * 17, 7); const g = c.createRadialGradient(p[0], p[1], 0, p[0], p[1], 7 * s); g.addColorStop(0, rgba(dk(col, 0.85), 0.55 * st.blush)); g.addColorStop(1, rgba(col, 0)); c.fillStyle = g; c.fillRect(p[0] - 8 * s, p[1] - 8 * s, 16 * s, 16 * s); }
    }
  });
  // don't let the samurai's wet gloss shine through a cat on top of him
  if (part !== 'front') for (const cx_ of [wctx, wmx]) { cx_.save(); cx_.globalCompositeOperation = 'destination-out'; for (const P of catSil(G)) fillPoly(cx_, P, '#000', 1); cx_.restore(); }
  return G;
}

// ================= samurai extras =================
function samEyes(ctx, st, t, eL, eR) {   // per-eye control (eL = back eye, eR = front eye); closed = calm meditation arc
  const g = samGeom(st, t), S = st.S, a = st.a ?? 1, rx = 0.22 * S * Math.abs(st.sx || 1), ry = 0.27 * S * (st.sy || 1);
  const P1 = g.X(-0.16, 0.26), P2 = g.X(0.46, 0.26), s1 = P1[0] < P2[0] ? -1 : 1;
  [[P1, eL, s1], [P2, eR, -s1]].forEach(([p, e, sd]) => {
    if (e.closed != null && e.closed > 0.5) { ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(st.rot || 0); ctx.globalAlpha = a; ctx.strokeStyle = EYEW; ctx.lineCap = 'round'; ctx.lineWidth = rx * 0.36;
      const d = e.squeeze || 0; ctx.beginPath(); ctx.moveTo(-rx * 0.95, ry * 0.05 - d * ry * 0.3); ctx.quadraticCurveTo(0, ry * (0.62 - d * 0.9), rx * 0.95, ry * 0.05 - d * ry * 0.3); ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1; return; }
    drawEye(ctx, p[0], p[1], rx, ry, st.rot || 0, sd, Object.assign({}, e, { a: (e.a ?? 1) * a })); });
  return g;
}
function vein(ctx, p, r, a, t) { if (a <= 0.01) return; const k = 1 + 0.18 * Math.sin(t * LQ(22)); ctx.save(); ctx.translate(p[0], p[1]); ctx.scale(k, k); ctx.globalAlpha = a; ctx.strokeStyle = '#FFF6EA'; ctx.lineCap = 'round'; ctx.lineWidth = r * 0.28;
  for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(r * 0.25, -r * 0.95); ctx.quadraticCurveTo(r * 0.25, -r * 0.25, r * 0.95, -r * 0.25); ctx.stroke(); } ctx.restore(); ctx.globalAlpha = 1; }
// sageo: red cord tied on the scabbard (hanging loop). returns the attach point
function sageo(ctx, st, t, a = 1) { const g = samGeom(st, t), S = st.S; const p0 = g.X(-0.35, 0.78), p1 = g.X(-0.72, 0.66);
  const sw = Math.sin(t * LQ(2.4)) * 0.08, loop = [p0, [lerp(p0[0], p1[0], 0.2) + S * 0.05, p0[1] + S * (0.38 + sw)], [lerp(p0[0], p1[0], 0.7), p1[1] + S * (0.42 - sw)], p1];
  ovBrush(ctx, loop, { w: S * 0.032, col: REDC, a, taper: 0.05, head: 0.05, seed: 3 }, 2);
  ovBrush(ctx, [p1, [p1[0] - S * 0.08, p1[1] + S * 0.25], [p1[0] - S * 0.02, p1[1] + S * 0.4]], { w: S * 0.028, col: REDC, a, taper: 0.4, head: 0.05, seed: 4 }, 2);
  return p1; }
// sweat drop in paper white with ink rim (on paper or on the body)
function sweatDrop(ctx, p, r, a) { if (a <= 0.01) return; ctx.globalAlpha = a; ctx.fillStyle = EYEW; ctx.beginPath(); ctx.moveTo(p[0], p[1] - r * 1.9); ctx.quadraticCurveTo(p[0] + r * 1.1, p[1], p[0], p[1] + r); ctx.quadraticCurveTo(p[0] - r * 1.1, p[1], p[0], p[1] - r * 1.9); ctx.fill(); ctx.strokeStyle = INKC; ctx.lineWidth = r * 0.25; ctx.stroke(); ctx.globalAlpha = 1; }

// ================= props =================
// zabuton (flat cushion) — ink wash + outline + corner tassels (ink layer)
function zabuton(ctx, cx, a = 1) {
  if (a <= 0.01) return; const w = 250, h = 40, y = GY - h;
  const P = cr([[cx - w / 2 + 8, y + 6], [cx, y - 2], [cx + w / 2 - 8, y + 6], [cx + w / 2 + 4, y + h * 0.55], [cx + w / 2 - 6, y + h], [cx, y + h + 3], [cx - w / 2 + 6, y + h], [cx - w / 2 - 4, y + h * 0.55]], true, 6);
  fillPoly(ctx, P, INKC, 0.16 * a); fillPoly(ctx, deformPoly(P, 2, 0.25, 4), INKC, 0.08 * a);
  brushPts(ctx, [[cx - w / 2 - 4, y + h * 0.55], [cx - w / 2 + 8, y + 6], [cx, y - 2], [cx + w / 2 - 8, y + 6], [cx + w / 2 + 4, y + h * 0.55]], { w: 3.4, a: 0.85 * a, taper: 0.3, head: 0.1, dry: 0.4, seed: 81 }, 3);
  brushPts(ctx, [[cx - w / 2 - 2, y + h * 0.6], [cx - w / 2 + 6, y + h], [cx, y + h + 3], [cx + w / 2 - 6, y + h], [cx + w / 2 + 2, y + h * 0.6]], { w: 3, a: 0.7 * a, taper: 0.3, head: 0.1, dry: 0.5, seed: 82 }, 3);
  brushPts(ctx, [[cx - w / 2 + 20, y + h * 0.5], [cx, y + h * 0.55], [cx + w / 2 - 20, y + h * 0.5]], { w: 1.6, a: 0.35 * a, taper: 0.5, stri: 0, seed: 83 }, 3);
  for (const sg of [-1, 1]) { const p = [cx + sg * (w / 2 + 2), y + h * 0.55]; brushPts(ctx, [p, [p[0] + sg * 10, p[1] + 6], [p[0] + sg * 14, p[1] + 16]], { w: 3, a: 0.8 * a, taper: 0.6, stri: 0, seed: 84 + sg }, 2); }
}
// tea set: cup (tip 0..1 falls over), pot. ink layer
function teaCup(ctx, x, tip, a = 1, spill = 0) {
  if (a <= 0.01) return; const r = 17, h = 30;
  ctx.save(); const piv = [x + r * Math.sign(tip || 1), GY]; ctx.translate(piv[0], piv[1]); ctx.rotate(tip * Math.PI / 2 * 0.98); ctx.translate(-piv[0], -piv[1]);
  const P = [[x - r, GY - h], [x - r * 0.88, GY - h * 0.35], [x - r * 0.72, GY], [x + r * 0.72, GY], [x + r * 0.88, GY - h * 0.35], [x + r, GY - h]];
  fillPoly(ctx, cr(P, false, 5), INKC, 0.12 * a);
  brushPts(ctx, [P[0], P[1], P[2], P[3], P[4], P[5]], { w: 2.6, a: 0.9 * a, taper: 0.1, head: 0.1, dry: 0.3, seed: 91 }, 2);
  ctx.globalAlpha = 0.8 * a; ctx.strokeStyle = INKC; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.ellipse(x, GY - h, r, 4, 0, 0, 7); ctx.stroke();
  if (spill < 0.2) { ctx.globalAlpha = 0.5 * a; ctx.fillStyle = '#5a5047'; ctx.beginPath(); ctx.ellipse(x, GY - h + 1.5, r * 0.85, 3, 0, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 0.5 * a; brushPts(ctx, [[x - r * 0.9, GY - h * 0.7], [x + r * 0.9, GY - h * 0.7]], { w: 1.4, a: 0.5 * a, taper: 0.3, stri: 0, seed: 92 }, 2);
  ctx.restore(); ctx.globalAlpha = 1;
}
function teaPot(ctx, x, a = 1) {
  if (a <= 0.01) return; const y = GY;
  const body = cr([[x - 34, y - 20], [x - 26, y - 44], [x, y - 50], [x + 26, y - 44], [x + 34, y - 20], [x + 22, y], [x - 22, y]], true, 6);
  fillPoly(ctx, body, INKC, 0.2 * a); fillPoly(ctx, deformPoly(body, 2, 0.2, 7), INKC, 0.1 * a);
  brushPts(ctx, [[x - 22, y], [x - 34, y - 20], [x - 26, y - 44], [x, y - 50], [x + 26, y - 44], [x + 34, y - 20], [x + 22, y]], { w: 3, a: 0.85 * a, taper: 0.2, head: 0.1, dry: 0.4, seed: 93 }, 3);
  brushPts(ctx, [[x - 32, y - 30], [x - 48, y - 40], [x - 58, y - 56]], { w: 5, a: 0.85 * a, taper: 0.1, head: 0.2, dry: 0.3, seed: 94 }, 2);
  brushPts(ctx, [[x - 14, y - 49], [x - 10, y - 60], [x + 10, y - 60], [x + 14, y - 49]], { w: 2.2, a: 0.8 * a, taper: 0.2, stri: 0, seed: 95 }, 2);
  ctx.globalAlpha = a; ctx.fillStyle = INKC; ctx.beginPath(); ctx.arc(x, y - 63, 4, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  brushPts(ctx, [[x + 30, y - 38], [x + 50, y - 36], [x + 48, y - 16], [x + 32, y - 18]], { w: 3.4, a: 0.8 * a, taper: 0.2, stri: 0, dry: 0.3, seed: 96 }, 2);
}
// yarn ball (chars layer): red, wound-thread texture, highlight, loose end
function yarnBall(ctx, x, y, r, spin, a = 1, tail = 1) {
  if (a <= 0.01 || r < 1) return;
  ctx.save(); ctx.globalAlpha = a; const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05); g.addColorStop(0, '#D0483C'); g.addColorStop(0.7, REDC); g.addColorStop(1, '#7E1A14');
  ctx.fillStyle = PAPB; ctx.beginPath(); ctx.arc(x, y, r * 1.02, 0, 7); ctx.fill(); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.clip(); ctx.lineCap = 'round';
  for (let k = 0; k < 4; k++) { const an = spin * (k % 2 ? -0.7 : 1) + k * 0.8, ca = Math.cos(an), sa = Math.sin(an);
    for (let j = -4; j <= 4; j++) { const o = j / 5 * r, L = Math.sqrt(Math.max(0, r * r - o * o)) * 1.02, cx = x - sa * o, cy = y + ca * o, bu = L * 0.28 * (k % 2 ? 1 : -1);
      for (const [colr, lw, dd] of [['rgba(92,14,10,0.5)', Math.max(1, r * 0.05), 0], ['rgba(255,200,186,0.35)', Math.max(0.8, r * 0.025), r * 0.035]]) {
        ctx.strokeStyle = colr; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(cx - ca * L - sa * dd, cy - sa * L + ca * dd); ctx.quadraticCurveTo(cx - sa * (bu + dd), cy + ca * (bu + dd), cx + ca * L - sa * dd, cy + sa * L + ca * dd); ctx.stroke(); } } }
  ctx.restore(); ctx.globalAlpha = a;
  ctx.strokeStyle = INKC; ctx.lineWidth = Math.max(1.4, r * 0.06); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
  ctx.fillStyle = 'rgba(255,248,238,0.7)'; ctx.beginPath(); ctx.ellipse(x - r * 0.4, y - r * 0.45, r * 0.2, r * 0.11, -0.7, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  if (tail > 0.01) { const e = [x + Math.cos(spin + 2) * r, y + Math.sin(spin + 2) * r]; ovBrush(ctx, [e, [e[0] + r * 0.5, e[1] + r * 0.7], [e[0] + r * 1.2 * tail, y + r - 2]], { w: Math.max(1.4, r * 0.08), col: REDC, a: a, taper: 0.3, head: 0.1 }, 2); }
}
// fish toy (chars): red knit fish, paper eye
function fishToy(ctx, x, y, sc, ang, a = 1) {
  if (a <= 0.01 || sc < 0.02) return; ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(sc, sc); ctx.globalAlpha = a;
  const body = cr([[-34, 0], [-12, -17], [18, -15], [36, 0], [18, 15], [-12, 17]], true, 6), tail = [[-30, 0], [-52, -16], [-47, 0], [-52, 16]];
  fillPoly(ctx, tail, PAPB, a); fillPoly(ctx, tail, REDC, a * 0.95); fillPoly(ctx, body, PAPB, a); fillPoly(ctx, body, REDC, a);
  ctx.save(); pathPoly(ctx, body); ctx.clip(); ctx.strokeStyle = 'rgba(90,14,10,0.5)'; ctx.lineWidth = 1.6;
  for (let i = -5; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(i * 7 - 4, -20); ctx.lineTo(i * 7 + 4, 0); ctx.lineTo(i * 7 - 4, 20); ctx.stroke(); } ctx.restore();
  ctx.globalAlpha = a; ctx.strokeStyle = INKC; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; pathPoly(ctx, body); ctx.stroke(); pathPoly(ctx, tail); ctx.stroke();
  ctx.fillStyle = WHI; ctx.beginPath(); ctx.arc(20, -4, 5.5, 0, 7); ctx.fill(); ctx.fillStyle = INKC; ctx.beginPath(); ctx.arc(21, -4, 2.8, 0, 7); ctx.fill();
  ctx.strokeStyle = INKC; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(6, 0, 12, -1.2, 1.2); ctx.stroke();
  ctx.restore(); ctx.globalAlpha = 1;
}
// sleep bubbles ("zzz" without letters): ink-rimmed paper bubbles rising, popping
function sleepBubbles(ctx, x, y, t, t0, sc, a = 1, sd = 1) {
  if (t < t0 || a <= 0.01) return; const P = LOOP / 5;
  for (let k = 0; k < 3; k++) { const ph = (t - t0) / P - k / 3; if (ph < 0) continue; const u = ph - Math.floor(ph); const n = Math.floor(ph);
    const r = (4 + 12 * eOut(u / 0.8)) * sc * (1 - 0.15 * hash(n % 5, sd + k)), px = x + (18 * u + 10 * Math.sin(u * 5 + (n % 5))) * sc, py = y - 70 * u * sc;
    if (u < 0.82) { ctx.globalAlpha = a * Math.min(1, u / 0.1); ctx.fillStyle = 'rgba(250,246,236,0.75)'; ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill(); ctx.strokeStyle = INKC; ctx.lineWidth = 1.8 * sc; ctx.stroke();
      ctx.fillStyle = WHI; ctx.beginPath(); ctx.arc(px - r * 0.35, py - r * 0.35, r * 0.2, 0, 7); ctx.fill(); }
    else { const q = (u - 0.82) / 0.18; ctx.globalAlpha = a * (1 - q); ctx.fillStyle = INKC; for (let i = 0; i < 6; i++) { const an = i / 6 * 6.283, d = r * (1 + q * 0.8); ctx.beginPath(); ctx.arc(px + Math.cos(an) * d, py + Math.sin(an) * d, 1.6 * sc, 0, 7); ctx.fill(); } } }
  ctx.globalAlpha = 1;
}
// ground wash
let GROUND = null, GLINE = null;
function buildGround() {
  GLINE = prep([[-300, GY + 2], [200, GY - 1], [700, GY + 3], [1400, GY]], 3, 12);
  const pts = []; for (let x = -400; x <= 1500; x += 30) pts.push([x, GY + 4 * vnoise(x * 0.02, 3)]); pts.push([1500, GY + 520], [-400, GY + 520]);
  GROUND = buildWash(pts, { la: 0.006, layers: 18, seed: 77, grad: [GY - 20, GY + 320], amt: 0.1, baseAmt: 0.05, edge: 0.3 });
}
function deepFreeze(o) { Object.freeze(o); for (const k in o) if (typeof o[k] === 'object') deepFreeze(o[k]); return o; }
