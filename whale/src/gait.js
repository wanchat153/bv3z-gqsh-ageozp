// Walking that obeys the ground: feet are planted at world positions along the path and never skate.
// A walker is built from timed waypoints [t, x, z, opts]. Equal consecutive positions mean standing; opts.via keeps
// walking through a corner without stopping; opts.face = angle (radians, 0 = +z) or [x, z] turns to face that way
// (with a step on the spot); opts.run uses a longer, higher stride.
// Query: w.at(t) -> { p: body ground point, feet: [footA, footB] (world, y = lift), heading, moving, bob }.
// Facing drawing: w.view(t, cam) -> one of 0, ±1, ±2, ±3, 4, changed one ring step at a time, each held >= 2 frames.
import * as THREE from './three.module.js';
import { RING } from './stick.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const sm = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const HIP = 0.11;                     // half the stance width (m) for a 1.68 m character
const fwd = (a) => V(Math.sin(a), 0, Math.cos(a));
const lat = (a) => V(Math.cos(a), 0, -Math.sin(a));
const angOf = (d) => Math.atan2(d.x, d.z);

// trapezoid speed profile: accelerate over ~0.25 s, cruise, decelerate; returns arc fraction 0..1 for time fraction u
function profile(u, T) { const r = clamp(0.28 / Math.max(T, 0.01), 0.05, 0.45); const vmax = 1 / (1 - r);
  if (u <= 0) return 0; if (u >= 1) return 1;
  if (u < r) return 0.5 * vmax * u * u / r; if (u > 1 - r) { const w = 1 - u; return 1 - 0.5 * vmax * w * w / r; } return 0.5 * vmax * r + vmax * (u - r); }

export function makeWalker(points, o = {}) {
  const scale = o.scale ?? 1;
  const segs = []; let i = 0;
  let heading = o.heading ?? 0;
  if (points[0][3]?.face != null) heading = faceAngle(points[0][3].face, V(points[0][1], 0, points[0][2]));
  let pA = V(points[0][1], 0, points[0][2]).addScaledVector(lat(heading), HIP * scale), pB = V(points[0][1], 0, points[0][2]).addScaledVector(lat(heading), -HIP * scale);
  function faceAngle(f, at) { return Array.isArray(f) ? Math.atan2(f[0] - at.x, f[1] - at.z) : f; }
  while (i < points.length - 1) {
    const a = points[i], b = points[i + 1]; const pa = V(a[1], 0, a[2]), pb = V(b[1], 0, b[2]);
    if (pa.distanceTo(pb) < 1e-4) {   // standing; maybe pivot to a new facing with two small steps
      const fc = b[3]?.face ?? a[3]?.face; const nh = fc != null ? faceAngle(fc, pa) : heading; /* a face on the arriving point or on the next one */ const pivot = Math.abs(Math.atan2(Math.sin(nh - heading), Math.cos(nh - heading))) > 0.3;
      const seg = { kind: 'stand', t0: a[0], t1: b[0], p: pa, h0: heading, h1: nh, pivot, fromA: pA.clone(), fromB: pB.clone() };
      if (pivot) { pA = pa.clone().addScaledVector(lat(nh), HIP * scale); pB = pa.clone().addScaledVector(lat(nh), -HIP * scale); }
      seg.toA = pA.clone(); seg.toB = pB.clone(); heading = nh; segs.push(seg); i++; continue;
    }
    // a move: this leg plus any via points
    const poly = [pa]; let j = i + 1; poly.push(pb); while (j < points.length - 1 && points[j][3]?.via) { j++; poly.push(V(points[j][1], 0, points[j][2])); }
    const cum = [0]; for (let k = 1; k < poly.length; k++) cum.push(cum[k - 1] + poly[k].distanceTo(poly[k - 1])); const D = cum[cum.length - 1];
    const run = !!(points[j][3]?.run || points[i][3]?.run || o.run);
    const h0 = (run ? 0.6 : 0.34) * scale; const n = Math.max(2, Math.round(D / h0)); const h = D / n; const lift = (run ? 0.16 : 0.07) * scale;
    const at = (s) => { s = clamp(s, 0, D); let k = 1; while (k < cum.length - 1 && cum[k] < s) k++; const u = (s - cum[k - 1]) / Math.max(1e-6, cum[k] - cum[k - 1]); const d = poly[k].clone().sub(poly[k - 1]); return { p: poly[k - 1].clone().lerp(poly[k], u), h: angOf(d) }; };
    const plant = (s, side) => { const q = at(s); return q.p.addScaledVector(lat(q.h), side * HIP * scale); };
    // steps: foot A then B alternately; the last extra step brings the trailing foot alongside
    const steps = []; let curA = pA.clone(), curB = pB.clone(); const firstA = at(0).p.clone().sub(pa).length() >= 0 ? true : true;
    // the first foot to move is the one further behind the direction of travel
    const dir0 = fwd(at(0).h); const aFirst = curA.clone().sub(pa).dot(dir0) <= curB.clone().sub(pa).dot(dir0);
    for (let k = 1; k <= n + 1; k++) { const isA = (k % 2 === 1) === aFirst; const target = plant(Math.min(k, n) * h, isA ? 1 : -1);
      const w0 = Math.max(0, (k - 1.5) * h), w1 = k <= n ? (k - 0.5) * h : D; const from = isA ? curA : curB; steps.push({ isA, w0: k === n + 1 ? (n - 0.5) * h : w0, w1, from: from.clone(), to: target });
      if (isA) curA = target; else curB = target; }
    pA = curA; pB = curB; heading = at(D).h;
    segs.push({ kind: 'move', t0: a[0], t1: points[j][0], poly, cum, D, h, n, lift, run, at, steps });
    i = j;
  }
  const last = points[points.length - 1]; segs.push({ kind: 'stand', t0: last[0], t1: 1e9, p: V(last[1], 0, last[2]), h0: heading, h1: heading, pivot: false, fromA: pA.clone(), fromB: pB.clone(), toA: pA.clone(), toB: pB.clone() });

  function at(t) {
    let sg = segs[0]; if (t < segs[0].t0) sg = { ...segs[0], kind: 'stand', t0: -1e9, t1: segs[0].t0, p: V(points[0][1], 0, points[0][2]), pivot: false, h0: segs[0].h0 ?? heading, h1: segs[0].h0 ?? heading, fromA: segs[0].fromA ?? segs[0].steps[0].from, fromB: segs[0].fromB ?? segs[0].steps[1].from, toA: segs[0].fromA ?? segs[0].steps[0].from, toB: segs[0].fromB ?? segs[0].steps[1].from };
    else for (const s of segs) if (t >= s.t0 && t < s.t1) { sg = s; break; }
    if (sg.kind === 'stand') {
      if (!sg.pivot) return { p: sg.p.clone(), feet: [sg.toA.clone(), sg.toB.clone()], heading: sg.h1, moving: false, bob: 0 };
      const l = t - sg.t0; const kA = sm(l / 0.15), kB = sm((l - 0.15) / 0.15);   // a step on the spot with each foot
      const fA = sg.fromA.clone().lerp(sg.toA, kA); fA.y = Math.sin(Math.PI * clamp(l / 0.15, 0, 1)) * 0.06; const fB = sg.fromB.clone().lerp(sg.toB, kB); fB.y = Math.sin(Math.PI * clamp((l - 0.15) / 0.15, 0, 1)) * 0.06;
      return { p: sg.p.clone(), feet: [fA, fB], heading: l < 0.08 ? sg.h0 : sg.h1, moving: false, bob: 0 };
    }
    const u = (t - sg.t0) / (sg.t1 - sg.t0); const s = sg.D * profile(u, sg.t1 - sg.t0); const q = sg.at(s);
    let fA = null, fB = null;
    for (const st of sg.steps) { if (s < st.w0) { if (st.isA && !fA) fA = st.from.clone(); if (!st.isA && !fB) fB = st.from.clone(); continue; }
      const k = clamp((s - st.w0) / Math.max(1e-6, st.w1 - st.w0), 0, 1); const p = st.from.clone().lerp(st.to, sm(k)); p.y = Math.sin(Math.PI * k) * sg.lift;
      if (st.isA) fA = p; else fB = p; }
    const speed = sg.D / (sg.t1 - sg.t0);
    return { p: q.p, feet: [fA, fB], heading: q.h, moving: true, run: sg.run, bob: -Math.abs(Math.sin(Math.PI * s / sg.h)) * (sg.run ? 26 : 14), speed };
  }
  // the drawing for the current camera: desired view from heading, then stepped around the ring one view at a time
  function desired(hd, p, cam) {
    const toCam = cam.position.clone().sub(p); toCam.y = 0; toCam.normalize(); const right = V(1, 0, 0).applyQuaternion(cam.quaternion); right.y = 0; right.normalize();
    const f = fwd(hd); const a = Math.atan2(f.dot(right), f.dot(toCam)); const k = Math.round(a / (Math.PI / 4));   // 0 = toward camera, ±4 = away
    return k === -4 ? 4 : k;
  }
  function view(t, cam, fps = 30) {
    let idx = null, held = 99; for (let f = 12; f >= 0; f--) { const tt = t - f / fps; const s = at(tt); const d = desired(s.heading, s.p, cam);
      if (idx == null) { idx = d; continue; } held++; if (d !== idx && held >= 2) { const a = RING.indexOf(idx), b = RING.indexOf(d); let diff = (b - a + 8) % 8; if (diff > 4) diff -= 8; idx = RING[(a + Math.sign(diff) + 8) % 8]; held = 0; } }
    return idx;
  }
  return { at, view, segs, footprint: 0.22 * scale };
}
