// Rigid-body bake for the blast: every blubber piece is a real body (gravity 9.81, air drag, friction, restitution),
// launched at the blast instant and stepped at 240 Hz with cannon-es. The launch velocity of each piece is solved by
// shooting (Newton on the drag ballistics) so it lands where and when the story needs it; after that, cannon decides
// the bounces, rolls and the car roof's collapse. Output: ../src/sim.json (30 fps samples; 240 Hz around the car hit).
// usage: node bake/bake.mjs
import * as C from './cannon-es.js';
import { writeFileSync } from 'node:fs';
import { WHALE, CAR, RAIN, RAIN_T, BLAST_T, CAR_HIT_T, G } from '../src/layout.js';

const RHO_AIR = 1.2, RHO_FAT = 900, CD = 0.6, DT = 1 / 240;
let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const radiusOf = (m) => Math.cbrt((3 * m) / (4 * Math.PI * RHO_FAT));
const dragK = (m, r) => (0.5 * RHO_AIR * CD * Math.PI * r * r) / m;   // a_drag = -k |v| v

// point-mass flight with the same integrator cannon uses (semi-implicit Euler): when does it come down to height yT?
function fly(p0, v0, k, yT, tMax = 20) {
  const p = [...p0], v = [...v0]; let t = 0, up = true;
  while (t < tMax) { const s = Math.hypot(...v); for (let i = 0; i < 3; i++) v[i] += (-k * s * v[i] + (i === 1 ? -G : 0)) * DT; for (let i = 0; i < 3; i++) p[i] += v[i] * DT; t += DT;
    if (v[1] < 0) up = false; if (!up && p[1] <= yT) { const f = (yT - p[1]) / (v[1] * DT); return { t: t + f * DT, p: [p[0] + v[0] * DT * f, yT, p[2] + v[2] * DT * f] }; } }
  return { t, p };
}
// solve the launch so the piece lands at (x,z) on height yT after T seconds
function solve(p0, target, yT, T, k) {
  const dx = target[0] - p0[0], dz = target[1] - p0[2], R = Math.hypot(dx, dz), ux = dx / R, uz = dz / R;
  let vh = R / T * 1.2, vy = G * T / 2;
  for (let it = 0; it < 40; it++) {
    const f = (a, b) => { const o = fly(p0, [a * ux, b, a * uz], k, yT); return [Math.hypot(o.p[0] - p0[0], o.p[2] - p0[2]) - R, o.t - T]; };
    const F = f(vh, vy); if (Math.abs(F[0]) < 0.02 && Math.abs(F[1]) < 1 / 480) break; if (!isFinite(F[0] + F[1])) throw new Error('solve');
    const e = 0.2, A = f(vh + e, vy), B = f(vh, vy + e);
    const J = [[(A[0] - F[0]) / e, (B[0] - F[0]) / e], [(A[1] - F[1]) / e, (B[1] - F[1]) / e]]; const det = J[0][0] * J[1][1] - J[0][1] * J[1][0];
    vh -= (J[1][1] * F[0] - J[0][1] * F[1]) / det; vy -= (-J[1][0] * F[0] + J[0][0] * F[1]) / det;
  }
  return [vh * ux, vy, vh * uz];
}

// ---------- the pieces ----------
const pieces = [];
const launchPt = () => [WHALE.x + (rnd() - 0.5) * WHALE.len * 0.5, WHALE.top - 0.3 + rnd() * 0.4, WHALE.z + (rnd() - 0.5) * 1.2];
// the big one for the car
pieces.push({ kind: 'car', m: 136, target: [CAR.x - 0.15, CAR.z + 0.05], yT: CAR.roofY + 0.04, T: CAR_HIT_T - BLAST_T });
// the rain over the crowd
RAIN.forEach((tg, i) => pieces.push({ kind: 'rain', m: 3 + rnd() * 26, target: tg, yT: 0, T: RAIN_T[0] - BLAST_T + (RAIN_T[1] - RAIN_T[0]) * (i / (RAIN.length - 1)) * (0.85 + 0.3 * rnd()) }));
// the near fall-back around the whale (seen in the blast shots)
for (let i = 0; i < 36; i++) { const a = rnd() * Math.PI * 2, d = 7 + rnd() * 55; pieces.push({ kind: 'near', m: 4 + rnd() * 50, target: [WHALE.x + Math.cos(a) * d * 1.3, WHALE.z + Math.sin(a) * d * 0.7], yT: 0, T: 1.6 + rnd() * 3.4 }); }

// ---------- the world ----------
const world = new C.World({ gravity: new C.Vec3(0, -G, 0) }); world.broadphase = new C.SAPBroadphase(world); world.allowSleep = true;
const sand = new C.Material('sand'), fat = new C.Material('fat'), steel = new C.Material('steel');
world.addContactMaterial(new C.ContactMaterial(fat, sand, { friction: 0.85, restitution: 0.06 }));
world.addContactMaterial(new C.ContactMaterial(fat, steel, { friction: 0.6, restitution: 0.1 }));
world.addContactMaterial(new C.ContactMaterial(fat, fat, { friction: 0.7, restitution: 0.05 }));
const ground = new C.Body({ mass: 0, material: sand }); ground.addShape(new C.Plane()); ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0); world.addBody(ground);
// the car: a static lower body, a seat-level stop, and a roof that can only move down and yields plastically
const carBody = new C.Body({ mass: 0, material: steel }); carBody.addShape(new C.Box(new C.Vec3(CAR.len / 2, 0.35, CAR.w / 2)), new C.Vec3(0, 0.25 + 0.35, 0));   // lower body up to the beltline (0.95 m) carBody.position.set(CAR.x, 0, CAR.z); world.addBody(carBody);
const stop = new C.Body({ mass: 0, material: steel }); stop.addShape(new C.Box(new C.Vec3(1.1, 0.04, 0.75))); stop.position.set(CAR.x - 0.15, 0.93, CAR.z); world.addBody(stop);
const ROOF0 = CAR.roofY; const roof = new C.Body({ mass: 45, material: steel }); roof.addShape(new C.Box(new C.Vec3(1.15, 0.04, 0.8))); roof.position.set(CAR.x - 0.15, ROOF0, CAR.z);
roof.linearFactor.set(0, 1, 0); roof.angularFactor.set(0, 0, 0); roof.allowSleep = false; world.addBody(roof);
const K_ROOF = 1.5e6, F_YIELD = 28e3; let plastic = 0;
world.addEventListener('preStep', () => {
  const comp = ROOF0 - roof.position.y; if (K_ROOF * (comp - plastic) > F_YIELD) plastic = comp - F_YIELD / K_ROOF;
  const f = Math.min(F_YIELD, Math.max(0, K_ROOF * (comp - plastic)) - 900 * roof.velocity.y); roof.applyForce(new C.Vec3(0, Math.max(0, f), 0));   // steel yields: never more than F_YIELD
});
// the seat frame stops the roof (a hard stop; a thin box would tunnel at this speed)
const CMAX = 0.40; world.addEventListener('postStep', () => { if (ROOF0 - roof.position.y > CMAX) { roof.position.y = ROOF0 - CMAX; if (roof.velocity.y < 0) roof.velocity.y = 0; } });
// spawn the pieces with solved launches
const bodies = pieces.map((pc) => {
  const r = radiusOf(pc.m), k = dragK(pc.m, r), p0 = launchPt(); const v0 = solve(p0, pc.target, pc.yT + r, pc.T, k);
  const b = new C.Body({ mass: pc.m, material: fat, linearDamping: 0, angularDamping: 0.25, collisionFilterGroup: 2, collisionFilterMask: 1 }); /* pieces leave the blast apart: they meet only the sand and the car */ b.addShape(new C.Sphere(r)); b.position.set(...p0); b.velocity.set(...v0);
  b.angularVelocity.set((rnd() - 0.5) * 8, (rnd() - 0.5) * 8, (rnd() - 0.5) * 8); b.sleepSpeedLimit = 0.05; b.allowSleep = true; b.k = k; world.addBody(b); return { pc, b, r, p0, v0 };
});
// blubber is soft and sand is loose: a piece that touches down splats and ploughs (no rolling away across the beach).
// Ploughing resistance ~ 30 s^-1 on the sliding speed, and the spin dies quickly; on the roof the fat sticks the same way.
const onRoof = (b, r) => Math.abs(b.position.x - roof.position.x) < 1.15 && Math.abs(b.position.z - roof.position.z) < 0.8 && b.position.y - r < roof.position.y + 0.08;
world.addEventListener('preStep', () => { for (const B of bodies) { const { b, r } = B; const roofed = onRoof(b, r); if (b.position.y - r < 0.05 || roofed) B.landed = true; if (!B.landed) continue;
  const vs = roofed ? roof.velocity.y : 0; const up = Math.max(0, b.velocity.y - vs);   // no rebound: soft fat into loose sand
  b.applyForce(new C.Vec3(-30 * b.mass * b.velocity.x, -60 * b.mass * up, -30 * b.mass * b.velocity.z)); b.angularVelocity.scale(0.92, b.angularVelocity); } });
world.addEventListener('preStep', () => { for (const { b } of bodies) { const v = b.velocity, s = v.length(); if (s > 0) b.applyForce(new C.Vec3(-b.k * s * v.x * b.mass, -b.k * s * v.y * b.mass, -b.k * s * v.z * b.mass)); } });
let hitT = null; const carPiece = bodies[0].b; carPiece.addEventListener('collide', (e) => { if (hitT == null && e.body === roof) hitT = BLAST_T + time; });

// ---------- step and record ----------
const DURS = 24.5, FPS = 30, HI = 240; let time = 0;
const out = { fps: FPS, t0: BLAST_T, frames: Math.round(DURS * FPS) + 1, bodies: bodies.map(({ pc, r }) => ({ kind: pc.kind, m: +pc.m.toFixed(1), r: +r.toFixed(3), p: [], q: [] })), roof: [], hi: { hz: HI, t0: CAR_HIT_T - 1.2, p: [], q: [], roof: [] }, launch: [] };
const R3 = (x) => Math.round(x * 1000) / 1000;
const rec = (o, b) => { o.p.push(R3(b.position.x), R3(b.position.y), R3(b.position.z)); o.q.push(R3(b.quaternion.x), R3(b.quaternion.y), R3(b.quaternion.z), R3(b.quaternion.w)); };
const steps = Math.round(DURS / DT);
for (let i = 0; i <= steps; i++) {
  if (i % (240 / FPS) === 0) { bodies.forEach(({ b }, j) => rec(out.bodies[j], b)); out.roof.push(R3(ROOF0 - roof.position.y)); }
  const ft = BLAST_T + time; if (ft >= out.hi.t0 - 1e-9 && ft <= out.hi.t0 + 2.4) { rec(out.hi, carPiece); out.hi.roof.push(R3(ROOF0 - roof.position.y)); }
  world.step(DT); time += DT;
}
out.hitT = hitT; out.crush = R3(ROOF0 - roof.position.y);
// landing report: first ground or roof contact time vs the target
const rep = bodies.map(({ pc, b, v0 }, j) => { const o = out.bodies[j]; let land = null; for (let f = 1; f < out.frames; f++) { const y = o.p[f * 3 + 1]; if (y <= o.r + (pc.kind === 'car' ? pc.yT : 0) + 0.02 && o.p[(f - 1) * 3 + 1] > y) { land = f / FPS; break; } }
  return `${pc.kind.padEnd(4)} m=${pc.m.toFixed(0).padStart(3)}kg v0=${Math.hypot(...v0).toFixed(1)}m/s target T=${pc.T.toFixed(2)} landed ~${land?.toFixed(2)} at (${o.p[o.p.length - 3]}, ${o.p[o.p.length - 1]})`; });
out.launch = bodies.map(({ v0 }) => v0.map(R3));
writeFileSync(new URL('../src/sim.json', import.meta.url), JSON.stringify(out));
console.log(rep.slice(0, 25).join('\n')); const cp = out.bodies[0]; console.log('car piece rests at', cp.p.slice(-3), 'impact speed', (() => { const o = out.hi; let best = 0; for (let i = 1; i < o.p.length / 3; i++) best = Math.max(best, Math.hypot(o.p[i*3]-o.p[i*3-3], o.p[i*3+1]-o.p[i*3-2], o.p[i*3+2]-o.p[i*3-1]) * o.hz); return best.toFixed(1); })()); console.log('car hit at', hitT?.toFixed(3), 'roof crushed', out.crush, 'm');
