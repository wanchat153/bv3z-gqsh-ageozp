/* Little Science Café — educational video. One continuous cutaway café counter, the camera glides station to station.
   frame(t) is a pure function of time t (seconds). Original scene (inspired by the camera/lighting approach of cozy isometric rooms). */
(function () {
  const W = 1920, H = 1080;
  const TL = window.TIMELINE, SEG = {};
  TL.segments.forEach((s) => (SEG[s.key] = s));
  const ORDER = TL.segments.map((s) => s.key);
  const FONT = "'NST','Noto Sans Thai',sans-serif";

  // ---------- helpers ----------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const sstep = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
  const fade = (t, a, b, fi = .6, fo = .6) => Math.min(ease((t - a) / fi), ease((b - t) / fo));
  function when(key, sub) {
    const s = SEG[key], i = s.text.indexOf(sub);
    if (i < 0) return s.start;
    return s.start + (i / s.text.length) * (s.end - s.start);
  }
  const hashf = (x, y, s) => { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 982451653)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  function vnoise(x, y, px, s) {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const x0 = ((xi % px) + px) % px, x1 = (x0 + 1) % px;
    const a = hashf(x0, yi, s), b = hashf(x1, yi, s), c = hashf(x0, yi + 1, s), d = hashf(x1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(u, v, oct, base, s, sy = 1) { let amp = .5, sum = 0, tot = 0, f = base; for (let o = 0; o < oct; o++) { sum += amp * vnoise(u * f, v * f * sy, f, s + o * 7); tot += amp; amp *= .5; f *= 2; } return sum / tot; }
  const rnd = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

  // ---------- renderer + post ----------
  const glc = document.createElement('canvas'); glc.width = W; glc.height = H;
  const renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H, false); renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
  const out = document.getElementById('c'), ctx = out.getContext('2d');
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x120d0b);
  const cam = new THREE.PerspectiveCamera(32, W / H, 0.1, 600);
  const composer = new THREE.EffectComposer(renderer); composer.setPixelRatio(1); composer.setSize(W, H);
  composer.addPass(new THREE.RenderPass(scene, cam));
  const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(W, H), .5, .6, 1.05); composer.addPass(bloom);
  composer.addPass(new THREE.OutputPass());
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new THREE.RoomEnvironment(), .04).texture; scene.environmentIntensity = .45; }

  // ---------- textures ----------
  function canvasTex(w, h, draw, srgb = true) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; }
  function pixTex(w, h, fn, rep) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), im = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const r = fn(x / w, y / h), i = (y * w + x) * 4; im.data[i] = r[0]; im.data[i + 1] = r[1]; im.data[i + 2] = r[2]; im.data[i + 3] = 255; }
    g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (rep) t.repeat.set(rep[0], rep[1]); return t;
  }
  const woodFn = (base, dark) => (u, v) => {
    const plank = Math.floor(v * 6), pv = v * 6 - plank, edge = pv < .02 || pv > .98 ? .55 : 1;
    const g = fbm(u * 1, (v + plank * .37) * 7, 5, 2, 17 + plank, 1) * .5 + fbm(u, v, 3, 6, 5) * .5, k = .55 + .6 * g;
    const tone = hashf(plank, 0, 3) * .25 + .85;
    return [lerp(dark[0], base[0], k) * edge * tone, lerp(dark[1], base[1], k) * edge * tone, lerp(dark[2], base[2], k) * edge * tone];
  };
  const floorTex = pixTex(512, 512, woodFn([150, 98, 58], [92, 56, 32]), [26, 3]);
  const counterTex = pixTex(512, 256, woodFn([196, 140, 88], [140, 92, 52]), [10, 1]);
  const wallTex = pixTex(512, 512, (u, v) => { const n = fbm(u, v, 5, 4, 29) * .16 + .92; return [226 * n, 205 * n, 176 * n]; }, [12, 1]);
  const tealTex = pixTex(256, 256, (u, v) => { const n = fbm(u, v, 4, 5, 31) * .14 + .93; return [34 * n, 92 * n, 98 * n]; }, [14, 1]);
  const bokehTex = canvasTex(1024, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1b2750'); gr.addColorStop(1, '#3a2848'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = rnd(7); for (let i = 0; i < 160; i++) { const x = r() * w, y = h * (.35 + r() * .65), rad = 6 + r() * 26; const col = r() > .5 ? '255,200,120' : r() > .5 ? '255,140,110' : '150,200,255'; const q = g.createRadialGradient(x, y, 0, x, y, rad); q.addColorStop(0, `rgba(${col},.85)`); q.addColorStop(1, `rgba(${col},0)`); g.fillStyle = q; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  });
  const softTex = canvasTex(128, 128, (g, w, h) => { const q = g.createRadialGradient(64, 64, 0, 64, 64, 64); q.addColorStop(0, 'rgba(255,255,255,1)'); q.addColorStop(.4, 'rgba(255,255,255,.35)'); q.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = q; g.fillRect(0, 0, w, h); }, false);

  // ---------- material helpers ----------
  const M = {
    steel: new THREE.MeshStandardMaterial({ color: 0xc9ccd0, metalness: 1, roughness: .26 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x2a2c31, metalness: .85, roughness: .38 }),
    copper: new THREE.MeshStandardMaterial({ color: 0xc27a4a, metalness: 1, roughness: .3 }),
    cream: new THREE.MeshPhysicalMaterial({ color: 0xf6ede0, roughness: .3, clearcoat: .6, clearcoatRoughness: .2 }),
    teal: new THREE.MeshStandardMaterial({ color: 0x2f7f86, roughness: .45, metalness: .1 }),
    red: new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: .4, metalness: .2 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x3a4650, roughness: .08, metalness: 0, transparent: true, opacity: .2, specularIntensity: .3, side: THREE.FrontSide, depthWrite: false }),
    coffee: new THREE.MeshStandardMaterial({ color: 0x2a1408, roughness: .25, metalness: .1 }),
    wood: new THREE.MeshStandardMaterial({ map: counterTex, roughness: .6 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x3e8a45, roughness: .7 }),
    pot: new THREE.MeshStandardMaterial({ color: 0xcf8f66, roughness: .8 }),
  };
  const HOT = (r, g, b) => new THREE.Color(r, g, b);
  const lathe = (pts, mat, seg = 48) => new THREE.Mesh(new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg), mat);
  const add = (parent, mesh, x = 0, y = 0, z = 0) => { mesh.position.set(x, y, z); parent.add(mesh); return mesh; };
  const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  const cyl = (rt, rb, h, mat, seg = 40) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  const sph = (r, mat, s = 24) => new THREE.Mesh(new THREE.SphereGeometry(r, s, Math.round(s * .7)), mat);
  function cupMesh(R = .95, Hh = 1.5, mat = M.cream) {
    const g = new THREE.Group();
    const outer = [[0, 0], [R * .7, 0], [R * .78, .05], [R * .9, Hh * .5], [R, Hh], [R - .06, Hh], [R * .86, Hh * .5], [R * .66, .16], [0, .16]];
    g.add(lathe(outer, mat)); const h = new THREE.Mesh(new THREE.TorusGeometry(R * .42, .09, 12, 24, Math.PI * 1.25), mat); h.position.set(R * .92, Hh * .55, 0); h.rotation.z = -Math.PI * .62; g.add(h);
    return g;
  }

  // ---------- room ----------
  const SX = [0, 20, 40, 60, 80, 100, 120, 140]; // stations: roast grind espresso milk caffeine cool cold ring
  const X0 = -22, X1 = 168, ROOMC = (X0 + X1) / 2;
  const room = new THREE.Group(); scene.add(room);
  add(room, new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0 + 80, 70), new THREE.MeshStandardMaterial({ map: floorTex, roughness: .55 })), ROOMC, -8, 20).rotation.x = -Math.PI / 2;
  // back wall: cream upper, teal lower
  add(room, new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0 + 80, 40), new THREE.MeshStandardMaterial({ map: wallTex, roughness: .95 })), ROOMC, 20, -12);
  add(room, new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0 + 80, 9), new THREE.MeshStandardMaterial({ map: tealTex, roughness: .8 })), ROOMC, 1.5, -11.95);
  // counter
  add(room, box(X1 - X0, 8, 7, new THREE.MeshStandardMaterial({ map: tealTex, roughness: .6 })), ROOMC, -4.2, 0);
  add(room, box(X1 - X0 + 1, .5, 8, M.wood), ROOMC, -.25, 0);
  // back counter with shelf
  add(room, box(X1 - X0, 6, 3, new THREE.MeshStandardMaterial({ color: 0x28383b, roughness: .6 })), ROOMC, -5, -9.5);
  add(room, box(X1 - X0, .4, 3.4, M.wood), ROOMC, -1.8, -9.5);
  const rj = rnd(4);
  for (let sh = 0; sh < 2; sh++) {
    add(room, box(X1 - X0, .35, 1.6, M.wood), ROOMC, 5 + sh * 3.6, -10.8);
    for (let i = 0; i < 48; i++) {
      const x = X0 + 2 + i * ((X1 - X0 - 4) / 47) + rj() * .4, jar = new THREE.Group(), hh = .9 + rj() * .9;
      jar.add(add(jar, cyl(.45, .45, hh, M.glass, 16), 0, hh / 2, 0));
      jar.add(add(jar, cyl(.38, .38, hh * .7, new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(.07 + rj() * .03, .6, .18 + rj() * .12), roughness: .8 }), 12), 0, hh * .37, 0));
      add(jar, cyl(.47, .47, .12, M.copper, 16), 0, hh + .05, 0); add(room, jar, x, 5.2 + sh * 3.6, -10.8);
    }
  }
  // windows with city bokeh
  [SX[2] - 8, SX[5] - 8, SX[7] - 8].forEach((x, i) => {
    add(room, new THREE.Mesh(new THREE.PlaneGeometry(14, 6), new THREE.MeshBasicMaterial({ map: bokehTex, toneMapped: false })), x + 8, 13.5, -11.9);
    [[0, 3.1, 14.4, .3], [0, -3.1, 14.4, .3], [-7.1, 0, .3, 6.4], [7.1, 0, .3, 6.4], [0, 0, .2, 6.2], [0, 0, 14.2, .2]].forEach(([dx, dy, w, h]) => add(room, box(w, h, .5, M.darkSteel), x + 8 + dx, 13.5 + dy, -11.7));
  });
  // pendant lamps
  const bulbs = [];
  SX.forEach((x, i) => {
    add(room, cyl(.04, .04, 5, M.darkSteel, 6), x, 14, -1);
    const shade = add(room, lathe([[.2, 0], [.25, .05], [1.9, -1.4], [1.95, -1.45], [1.8, -1.45], [.15, .02]], M.copper), x, 11.4, -1); shade.material.side = THREE.DoubleSide;
    const bulb = add(room, new THREE.Mesh(new THREE.SphereGeometry(.42, 16, 12), new THREE.MeshBasicMaterial({ color: HOT(5, 3.4, 1.7) })), x, 10.4, -1); bulbs.push(bulb);
    const cone = add(room, new THREE.Mesh(new THREE.ConeGeometry(3.4, 10.5, 24, 1, true), new THREE.MeshBasicMaterial({ color: HOT(.5, .32, .14), transparent: true, opacity: .035, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })), x, 5.2, -1);
  });
  // plants & decor between stations
  function plant(x, z, s = 1) {
    const g = new THREE.Group(); add(g, lathe([[0, 0], [.7, 0], [.9, 1.3], [.8, 1.3], [0, .2]], M.pot), 0, 0, 0);
    const r = rnd(Math.floor(x * 7 + 3)); for (let i = 0; i < 9; i++) { const l = sph(.5, M.leaf, 10); l.scale.set(.35, 1.2 + r() * .6, .12); l.position.set((r() - .5) * .8, 2 + r() * 1.2, (r() - .5) * .8); l.rotation.set((r() - .5) * .9, r() * 3, (r() - .5) * .9); g.add(l); }
    g.scale.setScalar(s); g.position.set(x, 0, z); room.add(g);
  }
  [10, 30, 50, 70, 90, 110, 130, 150, -12].forEach((x, i) => plant(x, -6.5 + (i % 2) * .6, .9 + (i % 3) * .15));
  // menu board
  const board = add(room, box(8, 5, .3, new THREE.MeshStandardMaterial({ map: canvasTex(512, 320, (g, w, h) => { g.fillStyle = '#1f2a26'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d9c9a8'; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20); g.fillStyle = '#e9dcc0'; g.font = `700 54px ${FONT}`; g.textAlign = 'center'; g.fillText('SCIENCE', w / 2, 120); g.fillText('CAFÉ', w / 2, 190); g.font = `400 30px ${FONT}`; g.fillText('☕  Est. 2026', w / 2, 255); }), roughness: .9 })), SX[0] - 14, 8.5, -11.6);

  // lights
  const hemi = new THREE.HemisphereLight(0xffe2bd, 0x2a1a14, .5); scene.add(hemi);
  const keyL = new THREE.DirectionalLight(0xffe9cf, .85); keyL.position.set(-25, 40, 40); scene.add(keyL);
  const spot = new THREE.PointLight(0xffc690, 26, 60, 1.6); scene.add(spot);

  // ambient dust motes
  const dust = (() => { const n = 700, pos = new Float32Array(n * 3), r = rnd(21); for (let i = 0; i < n; i++) { pos[i * 3] = X0 + r() * (X1 - X0); pos[i * 3 + 1] = r() * 14; pos[i * 3 + 2] = -8 + r() * 24; } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ map: softTex, color: 0xffe2b0, size: .22, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false })); p.frustumCulled = false; scene.add(p); return { p, base: pos.slice() }; })();

  // ---------- steam / particles ----------
  function makeSteam(n, size, color = 0xffffff, op = .22) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ map: softTex, color, size, transparent: true, opacity: op, depthWrite: false, blending: THREE.NormalBlending })); p.frustumCulled = false; return { n, p, g };
  }
  function updSteam(S, t, x, y, z, rise, spread, speed, amount = 1) {
    const a = S.g.attributes.position.array;
    for (let i = 0; i < S.n; i++) {
      const ph = ((t * speed + i / S.n) % 1), h = ph * rise, sw = Math.sin(t * 1.3 + i * 2.1) * spread * ph + Math.sin(i * 12.3) * spread * .4;
      a[i * 3] = x + sw + Math.sin(i * 7.7) * spread * .25 * (1 - ph); a[i * 3 + 1] = y + h; a[i * 3 + 2] = z + Math.cos(t * 1.1 + i * 1.7) * spread * ph * .7;
    }
    S.g.attributes.position.needsUpdate = true; S.p.material.opacity = .24 * amount; S.p.visible = amount > .01;
  }

  // ---------- stations ----------
  const ST = {};

  // 1. ROAST
  const gRoast = new THREE.Group(); gRoast.position.set(SX[0], 0, 0); scene.add(gRoast);
  ST.roast = (() => {
    add(gRoast, box(7, 7, 5.4, new THREE.MeshStandardMaterial({ color: 0x7a2f26, roughness: .35, metalness: .5 })), -4.5, 3.5, -2.8);
    add(gRoast, box(6.6, .35, 5.6, M.steel), -4.5, 7.2, -2.8);
    add(gRoast, cyl(.9, 2.2, 2.6, M.steel, 32), -4.5, 8.7, -2.8);
    const win = add(gRoast, cyl(1.9, 1.9, .3, M.darkSteel, 40), -4.5, 3.8, -.05); win.rotation.x = Math.PI / 2;
    const glow = add(gRoast, cyl(1.6, 1.6, .2, new THREE.MeshBasicMaterial({ color: HOT(1, .35, .1) }), 40), -4.5, 3.8, .12); glow.rotation.x = Math.PI / 2;
    const dial = add(gRoast, cyl(.6, .6, .15, M.cream, 32), -7.2, 5.9, -.05); dial.rotation.x = Math.PI / 2;
    const needle = add(gRoast, box(.08, .55, .06, M.red), -7.2, 5.9, .08); needle.geometry.translate(0, .22, 0);
    // tray with beans
    add(gRoast, cyl(3.4, 3.4, .4, M.steel, 48), 3.5, .2, 1.5);
    const beanGeo = new THREE.SphereGeometry(.34, 14, 10); beanGeo.scale(1, .68, .74);
    const NB = 150, beans = new THREE.InstancedMesh(beanGeo, new THREE.MeshStandardMaterial({ roughness: .55 }), NB), r = rnd(5), bp = [];
    for (let i = 0; i < NB; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 2.9; bp.push([Math.cos(a) * d, Math.sin(a) * d, r() * 6.28, r()]); }
    beans.instanceMatrix.setUsage(THREE.DynamicDrawUsage); gRoast.add(beans); beans.position.set(3.5, .55, 1.5);
    // hero bean
    const hero = new THREE.Group(); const hb = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), new THREE.MeshStandardMaterial({ roughness: .5 })); hb.scale.set(1.3, .88, .95); hero.add(hb);
    const crease = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), new THREE.MeshStandardMaterial({ color: 0x1a0f07, roughness: .9 })); crease.scale.set(1.18, .06, .08); crease.position.set(0, 0, .93); hero.add(crease);
    gRoast.add(hero);
    const heroGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: HOT(1.6, .7, .25), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); heroGlow.scale.setScalar(6); hero.add(heroGlow);
    const sparks = makeSteam(26, .35, 0xffc070, .9); sparks.p.material.blending = THREE.AdditiveBlending; gRoast.add(sparks.p);
    const heat = makeSteam(30, 1.4, 0xffd9b0, .12); gRoast.add(heat.p);
    const tempAt = (t, s) => { const a = s.start + 1, b = when('roast', 'หนึ่งร้อยสี่สิบ'), c = when('roast', 'สองร้อย'); return t < b ? lerp(25, 140, ease(prog(t, a, b))) : lerp(140, 200, ease(prog(t, b, c))); };
    const colAt = (T) => { const stops = [[25, [.38, .52, .2]], [100, [.55, .55, .22]], [140, [.55, .38, .15]], [170, [.33, .18, .08]], [200, [.17, .09, .045]], [240, [.1, .06, .035]]]; for (let i = 1; i < stops.length; i++) if (T <= stops[i][0]) { const k = (T - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]), a = stops[i - 1][1], b = stops[i][1]; return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; } return [.1, .06, .035]; };
    const dummy = new THREE.Object3D(), tc = new THREE.Color();
    return {
      temp: tempAt,
      upd(t, s, u) {
        const T = tempAt(t, s), c = colAt(T), crack = when('roast', 'เปรี๊ยะ');
        hb.material.color.setRGB(c[0], c[1], c[2]);
        const pop = Math.max(0, 1 - Math.abs(t - crack) * 3);
        hero.position.set(2.2, 6.6 + Math.sin(t * 1.4) * .15 + pop * .5, 4.2); hero.rotation.set(.3, t * .5, .15); hero.scale.setScalar(1.7 + pop * .25);
        heroGlow.material.opacity = .1 + .5 * sstep(100, 200, T) * (1 - .5 * sstep(200, 230, T));
        for (let i = 0; i < NB; i++) {
          const b = bp[i], jump = Math.max(0, Math.sin(t * 7 + b[3] * 20)) * (t > crack - .1 && t < crack + 3 ? .18 * Math.exp(-(t - crack) * .8) : 0);
          dummy.position.set(b[0], jump + b[3] * .08, b[1]); dummy.rotation.set(b[2], b[2] * 2, b[2] * .5); dummy.updateMatrix(); beans.setMatrixAt(i, dummy.matrix);
          const k = b[3] * .08; tc.setRGB(c[0] * (1 + k), c[1] * (1 + k), c[2] * (1 + k)); beans.setColorAt(i, tc);
        }
        beans.instanceMatrix.needsUpdate = true; beans.instanceColor.needsUpdate = true;
        needle.rotation.z = -lerp(-2.2, 2.2, (T - 25) / 215);
        glow.material.color.setRGB(1 + 1.5 * sstep(25, 200, T), .35 + .2 * sstep(25, 200, T), .1);
        // sparks burst at first crack
        const a = sparks.g.attributes.position.array, age = t - crack;
        for (let i = 0; i < sparks.n; i++) { const th = i * 2.399, ph = i * .63, sp = 2 + (i % 5) * .7; a[i * 3] = hero.position.x + Math.cos(th) * Math.sin(ph) * sp * age; a[i * 3 + 1] = hero.position.y + Math.cos(ph) * sp * age - 3 * age * age; a[i * 3 + 2] = hero.position.z + Math.sin(th) * Math.sin(ph) * sp * age; }
        sparks.g.attributes.position.needsUpdate = true; sparks.p.material.opacity = age > 0 && age < 1.2 ? (1 - age / 1.2) : 0; sparks.p.visible = age > 0 && age < 1.2;
        updSteam(heat, t, 3.5, 1, 1.5, 5, 1.2, .12, sstep(60, 160, T));
      },
    };
  })();

  // 2. GRIND
  const gGrind = new THREE.Group(); gGrind.position.set(SX[1], 0, 0); scene.add(gGrind);
  ST.grind = (() => {
    add(gGrind, box(3.8, 7, 3.6, M.darkSteel), -3, 3.5, -3);
    add(gGrind, cyl(.9, 2.2, 3.4, M.glass, 32), -3, 8.7, -3);
    add(gGrind, cyl(.75, 1.9, 2.4, new THREE.MeshStandardMaterial({ color: 0x3a2212, roughness: .7 }), 24), -3, 8.1, -3);
    add(gGrind, cyl(.5, .5, 1.4, M.copper, 20), -3, 3.6, -1.1).rotation.x = Math.PI / 2;
    add(gGrind, cyl(2, 2, .35, M.steel, 36), -3, .18, -.2);
    const pile = add(gGrind, new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.2, 28), new THREE.MeshStandardMaterial({ color: 0x2c170a, roughness: 1 })), -3, .75, -.2);
    const fall = makeSteam(220, .22, 0x3a2010, .95); fall.p.material.blending = THREE.NormalBlending; gGrind.add(fall.p);
    const dishes = [[2.2, .26, 40, 'coarse'], [5.4, .13, 140, 'good'], [8.6, .05, 520, 'fine']].map(([x, sz, n, k], i) => {
      add(gGrind, cyl(1.7, 1.5, .35, M.cream, 40), x, .2, 3.4);
      const geo = new THREE.SphereGeometry(sz, 8, 6), im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(.07, .6, .1 + i * .015), roughness: 1 }), n), d = new THREE.Object3D(), r = rnd(i + 3);
      for (let j = 0; j < n; j++) { const a = r() * 6.28, dd = Math.sqrt(r()) * 1.35; d.position.set(Math.cos(a) * dd, 0, Math.sin(a) * dd); d.scale.setScalar(.7 + r() * .6); d.updateMatrix(); im.setMatrixAt(j, d.matrix); }
      im.position.set(x, .45 + (n > 200 ? .0 : sz * .5), 3.4); gGrind.add(im); return { x };
    });
    return {
      dishes,
      upd(t, s, u) {
        const a = fall.g.attributes.position.array, run = fade(t, s.start + 1, s.end - 2, 1, 1);
        for (let i = 0; i < fall.n; i++) { const ph = (t * 1.6 + i / fall.n) % 1; a[i * 3] = -3 + Math.sin(i * 9.1) * .12 * ph; a[i * 3 + 1] = lerp(3.3, 1.0, ph * ph); a[i * 3 + 2] = -1.1 + ph * .9 + Math.cos(i * 4.3) * .05; }
        fall.g.attributes.position.needsUpdate = true; fall.p.visible = run > .02; pile.scale.setScalar(.6 + .4 * ease(prog(t, s.start, s.start + 8)));
      },
    };
  })();

  // 3. ESPRESSO
  const gEsp = new THREE.Group(); gEsp.position.set(SX[2], 0, 0); scene.add(gEsp);
  ST.espresso = (() => {
    add(gEsp, box(8.4, 7.4, 5.2, M.steel), -1.5, 3.9, -3.2);
    add(gEsp, box(8.8, .5, 5.6, M.darkSteel), -1.5, .45, -3.2); add(gEsp, box(8.8, .5, 5.6, M.darkSteel), -1.5, 7.8, -3.2);
    add(gEsp, cyl(1.1, 1.1, .8, M.darkSteel, 32), -1.5, 5.2, -.2);
    const pf = add(gEsp, cyl(.95, .8, .5, M.darkSteel, 32), -1.5, 4.7, -.1); add(gEsp, cyl(.18, .22, 3, new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: .6 }), 12), -1.5, 4.7, 1.8).rotation.x = Math.PI / 2;
    add(gEsp, box(7.4, .22, 4.2, M.darkSteel), -1.5, .8, 1.0);
    const gauge = add(gEsp, cyl(.95, .95, .2, M.cream, 40), -5.1, 6.2, -.58); gauge.rotation.x = Math.PI / 2;
    const gneedle = add(gEsp, box(.09, .8, .05, M.red), -5.1, 6.2, -.45); gneedle.geometry.translate(0, .32, 0);
    const cup = cupMesh(1.15, 1.8); cup.position.set(-1.5, .9, 1.2); gEsp.add(cup);
    const liquid = add(gEsp, cyl(.98, .84, 1, M.coffee, 36), -1.5, 1.1, 1.2);
    const crema = add(gEsp, cyl(.98, .98, .14, new THREE.MeshStandardMaterial({ color: 0xc88a45, roughness: .55 }), 36), -1.5, 2, 1.2);
    const stream = add(gEsp, cyl(.07, .07, 1, M.coffee, 10), -1.5, 3.4, 1.2);
    const steam = makeSteam(26, 1.2, 0xffffff, .18); gEsp.add(steam.p);
    const bub = makeSteam(60, .12, 0xf2c680, .9); bub.p.material.blending = THREE.NormalBlending; gEsp.add(bub.p);
    return {
      gaugeAt: (t, s) => 9 * ease(prog(t, when('espresso', 'เก้าบาร์') - 3, when('espresso', 'เก้าบาร์') + .5)),
      upd(t, s, u) {
        const e0 = when('espresso', 'ผ่านผงกาแฟ'), e1 = when('espresso', 'ชั้นฟอง') , p = prog(t, e0, e1), cr = ease(prog(t, e1, e1 + 3));
        const bar = 9 * ease(prog(t, when('espresso', 'เก้าบาร์') - 3, when('espresso', 'เก้าบาร์') + .5)) * (1 - .0 * p);
        gneedle.rotation.z = -lerp(-2.2, 2.2, bar / 10);
        const lh = .1 + 1.15 * ease(p); liquid.scale.set(1, lh, 1); liquid.position.y = 1.0 + lh / 2;
        const top = 1.0 + lh; crema.position.y = top + .02; crema.scale.set(1, 1, 1); crema.visible = cr > .01; crema.material.opacity = cr; crema.material.transparent = true;
        const flowing = t > e0 && t < e1 + .2 ? 1 : 0, sl = 3.9 - top;
        stream.visible = flowing > 0; stream.scale.set(1, sl, 1); stream.position.y = top + sl / 2;
        const a = bub.g.attributes.position.array; for (let i = 0; i < bub.n; i++) { const ph = (t * .5 + i / bub.n) % 1; a[i * 3] = -1.5 + Math.cos(i * 2.4) * .8 * Math.sqrt((i * 7 % 10) / 10); a[i * 3 + 1] = top + .1 + Math.sin(ph * 6) * .01; a[i * 3 + 2] = 1.2 + Math.sin(i * 2.4) * .8 * Math.sqrt((i * 7 % 10) / 10); }
        bub.g.attributes.position.needsUpdate = true; bub.p.visible = cr > .2; bub.p.material.opacity = cr;
        updSteam(steam, t, -1.5, top + .3, 1.2, 3.4, .5, .18, cr);
      },
    };
  })();

  // 4. MILK
  const gMilk = new THREE.Group(); gMilk.position.set(SX[3], 0, 0); scene.add(gMilk);
  ST.milk = (() => {
    add(gMilk, box(7, 7.4, 4.8, M.steel), 5.5, 3.9, -3.4); add(gMilk, box(7.4, .5, 5.2, M.darkSteel), 5.5, .45, -3.4);
    const wandGrp = new THREE.Group(); gMilk.add(wandGrp);
    add(wandGrp, cyl(.12, .12, 5, M.steel, 12), 0, 0, 0); const wandBend = add(wandGrp, cyl(.12, .12, 2.5, M.steel, 12), -1.2, -2.2, 0); wandBend.rotation.z = .5;
    wandGrp.position.set(3.2, 5.8, 0.4);
    const pitcher = new THREE.Group(); gMilk.add(pitcher);
    add(pitcher, lathe([[0, 0], [1.1, 0], [1.5, 1.8], [1.65, 3.2], [1.75, 3.55], [1.6, 3.5], [1.38, 1.9], [0, .1]], M.steel), 0, 0, 0).material = M.steel;
    const hdl = new THREE.Mesh(new THREE.TorusGeometry(.8, .1, 10, 20, Math.PI), M.darkSteel); hdl.position.set(1.6, 2, 0); hdl.rotation.z = -Math.PI / 2; pitcher.add(hdl);
    pitcher.position.set(-.5, 0.4, 1.2);
    const milkTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#f6efe2'; g.fillRect(0, 0, w, h); for (let i = 0; i < 12; i++) { g.strokeStyle = `rgba(215,200,175,${.35})`; g.lineWidth = 4; g.beginPath(); g.arc(128, 128, 10 + i * 10, i * .8, i * .8 + 3.8); g.stroke(); } });
    const milkSurf = add(pitcher, cyl(1.4, 1.4, .06, new THREE.MeshStandardMaterial({ map: milkTex, roughness: .6 }), 40), 0, 1.4, 0);
    const foam = makeSteam(220, .1, 0xfff6e6, .5); foam.p.material.blending = THREE.NormalBlending; pitcher.add(foam.p);
    const steam = makeSteam(40, 1.2, 0xffffff, .22); gMilk.add(steam.p); const wandSteam = makeSteam(26, .9, 0xffffff, .2); gMilk.add(wandSteam.p);
    const thermo = add(pitcher, cyl(.05, .05, 3.6, M.red, 8), .8, 2.6, .5); thermo.rotation.z = -.15;
    return {
      tempAt: (t, s) => { const a = when('milk', 'ใช้ไอน้ำ'), b = when('milk', 'เจ็ดสิบ'); return t < b ? lerp(8, 63, ease(prog(t, a, b - 3))) : lerp(63, 76, ease(prog(t, b, b + 4))); },
      upd(t, s, u) {
        const T = this.tempAt(t, s), lvl = 1.4 + .9 * ease(prog(t, s.start + 3, when('milk', 'โปรตีนในนม') + 4)); milkSurf.position.y = lvl; milkSurf.rotation.y = t * 1.5;
        pitcher.rotation.z = Math.sin(t * .5) * .02; wandGrp.position.y = 5.8; wandGrp.rotation.z = 0;
        const overheat = ease(prog(t, when('milk', 'เจ็ดสิบ'), when('milk', 'เจ็ดสิบ') + 4));
        const a = foam.g.attributes.position.array; for (let i = 0; i < foam.n; i++) { const ph = (t * .3 + i / foam.n) % 1, r = Math.sqrt((i * 13 % 100) / 100) * 1.3, th = i * 2.4 + t * .6; a[i * 3] = Math.cos(th) * r; a[i * 3 + 1] = lvl + .04 + Math.abs(Math.sin(ph * 6.28 + i)) * .1 * (1 - overheat); a[i * 3 + 2] = Math.sin(th) * r; }
        foam.g.attributes.position.needsUpdate = true; foam.p.material.opacity = .5 * (1 - overheat * .8);
        updSteam(steam, t, -.5, lvl + .6, 1.2, 4.2, .6, .15, sstep(20, 55, T));
        updSteam(wandSteam, t, 1.5, 4.4, .9, 1.5, .25, .6, fade(t, s.start + 2, s.end - 2, 1, 1));
      },
    };
  })();

  // 5. CAFFEINE
  const gCaf = new THREE.Group(); gCaf.position.set(SX[4], 0, 0); scene.add(gCaf);
  ST.caffeine = (() => {
    const cup = cupMesh(1.5, 2.2); cup.position.set(-6.5, .3, 1.5); gCaf.add(cup); add(gCaf, cyl(2.4, 2.1, .2, M.cream, 40), -6.5, .1, 1.5);
    add(gCaf, cyl(1.34, 1.2, .1, M.coffee, 36), -6.5, 2.2, 1.5);
    const steam = makeSteam(24, 1.2, 0xffffff, .2); gCaf.add(steam.p);
    // molecular stage
    const stage = new THREE.Group(); stage.position.set(3.5, 7.5, 1); gCaf.add(stage);
    add(stage, cyl(7.5, 7.5, .15, new THREE.MeshBasicMaterial({ color: HOT(.05, .12, .2), transparent: true, opacity: .8 }), 64), 0, -2.6, 0);
    const mem = add(stage, cyl(7, 7, .6, new THREE.MeshStandardMaterial({ color: 0x1f5a63, roughness: .5, emissive: 0x0a2a33 }), 64), 0, -1.8, 0);
    const sockets = [-3.6, 0, 3.6].map((x) => { const g = new THREE.Group(); const ring = new THREE.Mesh(new THREE.TorusGeometry(1, .28, 12, 28, Math.PI * 1.55), new THREE.MeshStandardMaterial({ color: 0x59d1c3, emissive: 0x1a6a62, roughness: .3 })); ring.rotation.x = -Math.PI / 2; ring.rotation.z = Math.PI * .72; g.add(ring); g.position.set(x, -1.3, 0); stage.add(g); return g; });
    function molecule(color, big) { const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .45, roughness: .3 }); [[0, 0, 0, .55], [.6, .25, 0, .38], [-.5, .35, .2, .32], [.1, -.5, .2, .3], [.7, -.3, -.2, .26]].forEach(([x, y, z, r]) => { const s = sph(r * (big ? 1.15 : 1), m, 16); s.position.set(x, y, z); g.add(s); }); const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .55 })); gl.scale.setScalar(3.4); g.add(gl); return g; }
    const ade = [0, 1, 2, 3, 4, 5].map((i) => { const m = molecule(0x4aa8ff, false); stage.add(m); return m; });
    const caf = [0, 1, 2].map(() => { const m = molecule(0xffb347, true); stage.add(m); return m; });
    return {
      upd(t, s, u) {
        updSteam(steam, t, -6.5, 2.5, 1.5, 4.5, .6, .17, 1);
        stage.rotation.y = Math.sin(t * .3) * .15;
        const tAd = when('caffeine', 'อะดีโนซีน'), tBlock = when('caffeine', 'แย่งจับ'), tSig = when('caffeine', 'บล็อก');
        // caffeine docks one by one starting at tBlock
        caf.forEach((m, k) => { const t0 = tBlock + k * 1.2, a = ease(prog(t, t0, t0 + 1.4)); const sx = sockets[k].position.x; m.position.set(lerp(sx - 6 + k * 2, sx, a), lerp(5 + k, -.55, a), lerp(2 - k, 0, a)); m.rotation.set(t * .8, t * .6, 0); m.visible = t > t0 - 3; });
        ade.forEach((m, i) => {
          const k = i % 3, sx = sockets[k].position.x, docked = t > tAd + 1 + i * .5 && t < tBlock;
          const blocked = t > tBlock + k * 1.2 + 1.2, ap = .5 + .5 * Math.sin(t * 1.4 + i * 1.9), cyc = (t * .22 + i * .17) % 1;
          let x, y, z; if (t < tAd - 1) { x = sx + Math.cos(t * .5 + i) * 6; y = 3 + Math.sin(t * .7 + i * 2) * 1.5; z = Math.sin(t * .4 + i * 3) * 3; } else if (!blocked && !(docked && i < 3)) { const app = ease(prog(t, tAd + i * .35, tAd + i * .35 + 2.2)); x = lerp(sx + Math.cos(t * .5 + i) * 6, sx, app); y = lerp(3 + Math.sin(t * .7 + i * 2) * 1.5, -.55, app); z = lerp(Math.sin(t * .4 + i * 3) * 3, 0, app); } else if (blocked) { const bnc = Math.abs(Math.sin(t * 2 + i)); x = sx + Math.cos(t * .5 + i) * (2 + 4 * (1 - bnc)); y = 2.4 + bnc * 2; z = Math.sin(t * .6 + i) * 3 + 1; } else { x = sx; y = -.55; z = 0; }
          m.position.set(x, y, z); m.rotation.set(t * .4 + i, t * .5, 0);
        });
        sockets.forEach((g, k) => { g.children[0].material.emissiveIntensity = 1 + .6 * Math.sin(t * 3 + k); });
      },
    };
  })();

  // 6. COOL
  const gCool = new THREE.Group(); gCool.position.set(SX[5], 0, 0); scene.add(gCool);
  ST.cool = (() => {
    const cup = cupMesh(2.1, 3.1); cup.position.set(0, .3, 1.5); gCool.add(cup); add(gCool, cyl(3.2, 2.8, .25, M.cream, 40), 0, .12, 1.5);
    add(gCool, cyl(1.92, 1.74, .1, M.coffee, 36), 0, 3.2, 1.5);
    const lid = new THREE.Group(); add(lid, cyl(2.3, 2.2, .22, M.darkSteel, 40), 0, 0, 0); add(lid, cyl(.5, .6, .25, M.darkSteel, 20), 0, .2, 0); lid.position.set(0, 12, 1.5); gCool.add(lid);
    const steam = makeSteam(60, 1.8, 0xffffff, .25); gCool.add(steam.p);
    const arrows = [[new THREE.Vector3(1, 0, 0), new THREE.Vector3(2.3, 1.8, 1.5), 0xff7a4a], [new THREE.Vector3(-1, 0, 0), new THREE.Vector3(-2.3, 1.8, 1.5), 0xff7a4a], [new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 3.6, 1.5), 0xffd25a]].map(([d, p, c]) => { const a = new THREE.ArrowHelper(d, p, 1, c, .6, .45); a.line.material = new THREE.LineBasicMaterial({ color: HOT(c >> 16 & 255 ? 3 : 1, 1.4, .5) }); a.cone.material = new THREE.MeshBasicMaterial({ color: HOT(3, 1.5, .4) }); gCool.add(a); return a; });
    return {
      lidT: (s) => when('cool', 'ปิดฝา'),
      upd(t, s, u) {
        const tl = when('cool', 'ปิดฝา'), drop = ease(prog(t, tl, tl + 1.2)), ly = lerp(12, 3.45, drop); lid.position.y = ly; lid.rotation.z = (1 - drop) * .6;
        const hasLid = drop;
        updSteam(steam, t, 0, 3.4, 1.5, 7, 1.2, .2, (sstep(0, 2, t - s.start)) * (1 - hasLid));
        const tp = when('cool', 'ถ่ายเท'), te = when('cool', 'ระเหย');
        arrows[0].setLength(.9 + 1.2 * ease(prog(t, tp, tp + 1)) * (1 - drop), .5, .4); arrows[1].setLength(.9 + 1.2 * ease(prog(t, tp, tp + 1)) * (1 - drop), .5, .4);
        arrows[2].setLength(.8 + 3 * ease(prog(t, te - .5, te + 1)) * (1 - drop), .8, .6);
        arrows.forEach((a) => (a.visible = t > tp - .5 && drop < .9));
      },
    };
  })();

  // 7. COLD
  const gCold = new THREE.Group(); gCold.position.set(SX[6], 0, 0); scene.add(gCold);
  ST.cold = (() => {
    const jar = new THREE.Group(); add(jar, lathe([[0, 0], [2.2, 0], [2.4, .3], [2.4, 4.8], [2.1, 5.2], [1.9, 5.5], [1.9, 5.3], [2.2, 4.8], [2.2, .4], [0, .3]], M.glass), 0, 0, 0);
    const jl = add(jar, cyl(2.15, 2.15, 4.2, new THREE.MeshStandardMaterial({ color: 0x2b1609, roughness: .6, envMapIntensity: .1 }), 36), 0, 2.4, 0); jar.position.set(-5.5, 0, 1); gCold.add(jar);
    const grounds = makeSteam(200, .16, 0x1e0e05, .9); grounds.p.material.blending = THREE.NormalBlending; jar.add(grounds.p);
    const glass = new THREE.Group(); add(glass, lathe([[0, 0], [1.5, 0], [1.9, .2], [2.15, 6.4], [2.05, 6.4], [1.8, .4], [0, .35]], M.glass), 0, 0, 0);
    const gl = add(glass, cyl(1.9, 1.6, 4.6, new THREE.MeshStandardMaterial({ color: 0x3a1c0b, roughness: .6, envMapIntensity: .1 }), 36), 0, 2.5, 0); glass.position.set(4.5, 0, 1.5); gCold.add(glass);
    const iceMat = new THREE.MeshPhysicalMaterial({ color: 0xe8f7ff, roughness: .08, transparent: true, opacity: .55, specularIntensity: .35, depthWrite: false, ior: 1.31 });
    const cubes = [0, 1, 2, 3, 4].map((i) => { const c = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.15, 1.15), iceMat); glass.add(c); return c; });
    const cold = makeSteam(30, 1.6, 0xcfeaff, .12); gCold.add(cold.p);
    return {
      upd(t, s, u) {
        const ti = when('cold', 'น้ำแข็ง'), r = rnd(9);
        cubes.forEach((c, i) => { const t0 = ti + i * .35, k = prog(t, t0, t0 + .9), landY = 3.4 + (i % 2) * .15 + Math.floor(i / 2) * 1.2, ax = ((i * 37) % 10) / 10 - .5; c.visible = t > t0 - .01; c.position.set(ax * 1.1, lerp(11, landY, k * k) + (t > t0 + .9 ? Math.sin((t - t0) * 1.3 + i) * .06 : 0), (((i * 53) % 10) / 10 - .5) * .8); c.rotation.set(k * 3 + i, k * 2, i); });
        gl.scale.set(1, 1 + .12 * ease(prog(t, ti, ti + 2)), 1); gl.position.y = 2.5 + .28 * ease(prog(t, ti, ti + 2));
        const a = grounds.g.attributes.position.array; for (let i = 0; i < grounds.n; i++) { const th = i * 2.39, rr = Math.sqrt((i * 7 % 100) / 100) * 1.9; a[i * 3] = Math.cos(th + t * .1) * rr; a[i * 3 + 1] = 1.2 + ((i * 29) % 100) / 100 * 2.3 + Math.sin(t * .4 + i) * .1; a[i * 3 + 2] = Math.sin(th + t * .1) * rr; } grounds.g.attributes.position.needsUpdate = true;
        updSteam(cold, t, 4.5, 6.8, 1.5, 1.8, .5, .12, ease(prog(t, ti + 1, ti + 3)));
      },
    };
  })();

  // 8. RING
  const gRing = new THREE.Group(); gRing.position.set(SX[7], 0, 0); scene.add(gRing);
  ST.ring = (() => {
    const RC = 512, can = document.createElement('canvas'); can.width = can.height = RC; const cg = can.getContext('2d');
    const tex = new THREE.CanvasTexture(can); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const spill = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: .35, depthWrite: false })); spill.rotation.x = -Math.PI / 2; spill.position.set(0, .06, 2); gRing.add(spill);
    const cup = cupMesh(1.5, 2.2); cup.position.set(-6, 1.5, -.5); cup.rotation.z = Math.PI / 2 + .1; gRing.add(cup);
    const parts = Array.from({ length: 260 }, (_, i) => { const r = rnd(i * 7 + 1); return [r() * 6.28, Math.sqrt(r()), r()]; });
    function draw(p) {
      cg.clearRect(0, 0, RC, RC); const c = RC / 2, R = RC * .42;
      const gr = cg.createRadialGradient(c, c, 0, c, c, R); const inner = .5 - .3 * p;
      gr.addColorStop(0, `rgba(88,46,20,${.28 * (1 - p) + .1})`); gr.addColorStop(.75, `rgba(80,40,16,${.38 * (1 - p) + .1})`); gr.addColorStop(.93, `rgba(60,28,10,${.45 + .5 * p})`); gr.addColorStop(1, `rgba(40,18,6,${.5 + .5 * p})`);
      cg.fillStyle = gr; cg.beginPath(); cg.arc(c, c, R, 0, 7); cg.fill();
      cg.strokeStyle = `rgba(28,12,4,${.2 + .8 * p})`; cg.lineWidth = 3 + 11 * p; cg.beginPath(); cg.arc(c, c, R - 3 - 5 * p, 0, 7); cg.stroke();
      parts.forEach(([a, rr, ph]) => { const k = clamp(p * 1.1 * (.5 + ph * .5)), rad = lerp(rr * R * .9, R * (.95 - .03 * ph), k); cg.fillStyle = `rgba(30,12,4,${.55})`; cg.beginPath(); cg.arc(c + Math.cos(a) * rad, c + Math.sin(a) * rad, 2.5, 0, 7); cg.fill(); });
      tex.needsUpdate = true;
    }
    return { upd(t, s, u) { draw(ease(prog(t, when('ring', 'ขณะที่หยดน้ำ') - 1, s.end - 1))); } };
  })();

  // ---------- overlay helpers ----------
  const CREAM = '#fff1d8', AMBER = '#ffb84d', TEAL = '#6fe0d2';
  function txt(s, x, y, size, o = {}) {
    ctx.save(); ctx.font = `${o.w || 700} ${size}px ${FONT}`; ctx.textAlign = o.al || 'center'; ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = o.a === undefined ? 1 : o.a;
    ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 2; if (o.ls) ctx.letterSpacing = o.ls + 'px'; ctx.fillStyle = o.c || CREAM; ctx.fillText(s, x, y); ctx.restore();
  }
  function project(v) { const p = v.clone().project(cam); return { x: (p.x * .5 + .5) * W, y: (-p.y * .5 + .5) * H }; }
  const wp = (g, x, y, z) => g.localToWorld(new THREE.Vector3(x, y, z));
  const tag = (s, x, y, a, c = CREAM) => { txt(s, x, y, 36, { a, w: 700, c }); ctx.save(); ctx.globalAlpha = a * .7; ctx.fillStyle = AMBER; ctx.fillRect(x - 22, y + 14, 44, 3); ctx.restore(); };
  const chip = (s, sub, x, y, a, c = AMBER) => { ctx.save(); ctx.globalAlpha = a * .55; ctx.fillStyle = 'rgba(12,8,6,.9)'; ctx.beginPath(); ctx.roundRect(x - 150, y - 80, 300, 118, 26); ctx.fill(); ctx.restore(); txt(s, x, y, 72, { a, c }); txt(sub, x, y + 28, 28, { a: a * .85, w: 400 }); };

  // ---------- scenes ----------
  const pos = (sx, ox, oy, oz, ty = 3, tx = 0) => [sx + ox, oy, oz, sx + tx, ty, 0];
  const scenes = {
    intro: { upd() { }, pose: (t, s, u) => [lerp(SX[0] + 40, SX[0] + 6, ease(u)), lerp(14, 8, ease(u)), lerp(60, 26, ease(u)), lerp(SX[0] + 60, SX[0] - 1, ease(u)), 4, 0], overlay(t, s) { const a = fade(t, s.start + 2, s.start + 13, 1.4, 1.8); txt('ร้านกาแฟเล่าวิทยาศาสตร์', W / 2, 190, 108, { a }); txt('ทุกแก้วคือห้องทดลอง', W / 2, 262, 48, { a, w: 400, c: AMBER, ls: 6 }); } },
    roast: { upd: (t, s, u) => ST.roast.upd(t, s, u), pose: (t, s, u) => pos(SX[0], lerp(-1, 4, u), lerp(8, 7, u), lerp(24, 19, u), 4.6, 0),
      overlay(t, s) { const T = ST.roast.temp(t, s), a = fade(t, s.start + 1, s.end + 1, 1, 1.2); txt(Math.round(T) + '°C', 1500, 330, 130, { a, c: T < 140 ? CREAM : AMBER }); const cr = when('roast', 'เปรี๊ยะ'); txt('เปรี๊ยะ!', 1500, 420, 70, { a: Math.max(0, 1 - Math.abs(t - cr) / 1.4) * a, c: '#ffd06b' }); } },
    grind: { upd: (t, s, u) => ST.grind.upd(t, s, u), pose: (t, s, u) => pos(SX[1], lerp(0, 2, u), lerp(9, 8, u), lerp(24, 21, u), 3.4, 1.6),
      overlay(t, s) { const tags = [['หยาบ → เปรี้ยว', 'หยาบ', 0], ['พอดี', 'พอดี', 1], ['ละเอียดเกิน → ขม', 'ละเอียดเกินไป', 2]]; tags.forEach(([lab, key, i]) => { const tm = key === 'พอดี' ? when('grind', 'น้ำร้อนจึง') : when('grind', key === 'หยาบ' ? 'หยาบเกินไป' : 'ละเอียดเกินไป'); const a = ease((t - tm + .2) / .6) * fade(t, s.start, s.end + 1.5, .1, 1.2); if (a <= 0) return; const q = project(wp(gGrind, ST.grind.dishes[i].x, 2.8, 3.4)); tag(lab, q.x, q.y, a, i === 1 ? TEAL : (i === 0 ? '#ffc07a' : '#ff9a8a')); }); } },
    espresso: { upd: (t, s, u) => ST.espresso.upd(t, s, u), pose: (t, s, u) => pos(SX[2], lerp(-6, -1, u), lerp(8, 6.4, u), lerp(24, 18, u), 3.6, -1.5),
      overlay(t, s) { const a1 = fade(t, when('espresso', 'เก้าบาร์') - 2, s.end + 1, .8, 1.2); chip('9 บาร์', '≈ 9 × ความดันอากาศ', 1560, 300, a1); const a2 = fade(t, when('espresso', 'สามสิบวินาที') - .5, s.end + 1, .8, 1.2); chip('30 วิ', 'เวลาสกัด', 1560, 500, a2, TEAL); const a3 = fade(t, when('espresso', 'เครมา') - .5, s.end + 2, .8, 1.2); const q = project(wp(gEsp, -1.5, 3.6, 1.2)); tag('เครมา', q.x + 210, q.y, a3, AMBER); } },
    milk: { upd(t, s, u) { ST.milk.upd(t, s, u); }, pose: (t, s, u) => pos(SX[3], lerp(-5, 0, u), lerp(11, 10, u), lerp(19, 16, u), 2.5, 1.0),
      overlay(t, s) { const T = ST.milk.tempAt(t, s), a = fade(t, s.start + 1.5, s.end + 1, 1, 1.2), hot = T > 70; txt(Math.round(T) + '°C', 1500, 340, 130, { a, c: hot ? '#ff7d6a' : CREAM }); txt(hot ? 'ร้อนเกินไป ✗' : '60–65°C กำลังดี ✓', 1500, 420, 44, { a: a * (T > 55 ? 1 : 0), c: hot ? '#ff7d6a' : TEAL, w: 700 }); } },
    caffeine: { upd(t, s, u) { ST.caffeine.upd(t, s, u); }, pose: (t, s, u) => [SX[4] + lerp(-3, 1, u), lerp(10, 9, u), lerp(32, 28, u), SX[4] + lerp(-1, 2, ease(u)), 5.2, 0],
      overlay(t, s) {
        const k = (key, lab, g, dx, dy, c, t0) => { const a = ease((t - t0) / .6) * fade(t, s.start, s.end + 1.5, .1, 1.2); if (a <= 0) return; const q = project(wp(g, dx, dy, 0)); tag(lab, q.x, q.y, a, c); };
        k(0, 'อะดีโนซีน', gCaf, 3.5 - 3, 7.5 + 2.8, '#7cc0ff', when('caffeine', 'อะดีโนซีน') - .2);
        k(1, 'ตัวรับ', gCaf, 3.5, 7.5 - 3.4, TEAL, when('caffeine', 'ตัวรับ'));
        k(2, 'คาเฟอีน', gCaf, 3.5 + 3.6, 7.5 + 2.6, AMBER, when('caffeine', 'คาเฟอีนมี') - .2);
        const th = when('caffeine', 'ครึ่งหนึ่ง'), a = fade(t, th - 5, s.end + 1.5, .8, 1.2);
        if (a > 0) { const bars = [['0 ชม.', 1], ['5–6 ชม.', .5]]; bars.forEach(([lab, v], i) => { const g = ease((t - (th - 4 + i * 1.2)) / .8) * a; ctx.save(); ctx.globalAlpha = g * .9; ctx.fillStyle = AMBER; ctx.beginPath(); ctx.roundRect(1540 + i * 150, 760 - 220 * v, 90, 220 * v, 12); ctx.fill(); ctx.restore(); txt(lab, 1585 + i * 150, 800, 28, { a: g, w: 400 }); }); txt('ปริมาณคาเฟอีนในร่างกาย', 1660, 520, 30, { a, w: 400 }); }
      } },
    cool: { upd(t, s, u) { ST.cool.upd(t, s, u); }, pose: (t, s, u) => pos(SX[5], lerp(-4, 1, u), lerp(7, 6, u), lerp(20, 15, u), 3.2, 0),
      overlay(t, s) {
        const tp = when('cool', 'ถ่ายเท'), te = when('cool', 'ระเหย'), tl = when('cool', 'ปิดฝา');
        const mk = (lab, tm, dx, dy, c) => { const a = ease((t - tm) / .6) * fade(t, s.start, tl + 2, .1, 1.2); if (a > 0) { const q = project(wp(gCool, dx, dy, 1.5)); tag(lab, q.x, q.y, a, c); } };
        mk('แก้ว', tp, 3.8, 2.2, '#ffb38a'); mk('อากาศ', tp + 1, -3.9, 2.2, '#ffb38a'); mk('ระเหย (มากที่สุด)', te, 0, 7.4, '#ffd25a');
        // temperature chart
        const a = fade(t, s.start + 2, s.end + 1.5, 1, 1.2), cx = 1330, cy = 840, cw = 480, ch = 300;
        ctx.save(); ctx.globalAlpha = a * .55; ctx.fillStyle = 'rgba(12,8,6,.9)'; ctx.beginPath(); ctx.roundRect(cx - 50, cy - ch - 80, cw + 100, ch + 140, 24); ctx.fill(); ctx.globalAlpha = a; ctx.strokeStyle = 'rgba(255,241,216,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy - ch); ctx.lineTo(cx, cy); ctx.lineTo(cx + cw, cy); ctx.stroke();
        const dur = s.end - s.start - 3, t0 = s.start + 2;
        [['#ff7d6a', 0.045, 0], ['#6fe0d2', 0.018, 1]].forEach(([col, rate, withLid]) => { const pr = prog(t, t0, t0 + dur); ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.beginPath(); for (let i = 0; i <= 80; i++) { const x = i / 80; if (x > pr) break; const tt = x * 60, T = 25 + 65 * Math.exp(-tt * (withLid ? rate : rate * 2.3)); const px = cx + x * cw, py = cy - ((T - 20) / 75) * ch; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); });
        ctx.restore(); txt('ไม่มีฝา', cx + 330, cy - ch - 25, 28, { a, c: '#ff7d6a', w: 400 }); txt('มีฝา', cx + 450, cy - ch - 25, 28, { a, c: TEAL, w: 400 }); txt('อุณหภูมิ ↓ เวลา →', cx + cw / 2, cy + 44, 26, { a, w: 400 });
      } },
    cold: { upd(t, s, u) { ST.cold.upd(t, s, u); }, pose: (t, s, u) => pos(SX[6], lerp(-3, 1, u), lerp(8, 7, u), lerp(21, 17, u), 3.2, -.5),
      overlay(t, s) {
        const a = fade(t, s.start + 1, when('cold', 'ส่วนน้ำแข็ง'), 1, 1), cx = 1500, cy = 360, R = 120; if (a > 0) { const hrs = 12 * ease(prog(t, s.start + 1, when('cold', 'ผลที่ได้'))); ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = CREAM; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke(); ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(hrs / 12 * 6.283) * R * .75, cy - Math.cos(hrs / 12 * 6.283) * R * .75); ctx.stroke(); ctx.strokeStyle = AMBER; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(hrs * 6.283) * R * .95, cy - Math.cos(hrs * 6.283) * R * .95); ctx.stroke(); ctx.restore(); txt(Math.round(hrs) + ' ชม.', cx, cy + 210, 70, { a, c: AMBER }); }
        const b = fade(t, when('cold', 'น้ำแข็งที่ใส่') - .5, s.end + 1.5, .8, 1.2); txt('❄ น้ำแข็งดูดความร้อนเพื่อละลาย', W / 2, 190, 52, { a: b, c: '#bfe6ff' });
      } },
    ring: { upd(t, s, u) { ST.ring.upd(t, s, u); }, pose: (t, s, u) => [SX[7] + lerp(-6, 0, ease(u)), lerp(17, 15, u), lerp(8, 4.2, ease(u)), SX[7], 0, 2.3],
      overlay(t, s) { txt('วงแหวนกาแฟ', 440, 150, 78, { a: fade(t, s.start + .5, s.end + 1, .8, 1.2) }); const a = fade(t, when('ring', 'น้ำจึงไหล') - .5, s.end + 1.5, .8, 1.2); txt('น้ำไหลออกสู่ขอบ → พาอนุภาคไปกองรวมกัน', W / 2, 960, 44, { a, c: AMBER }); } },
    outro: { upd() { }, pose: (t, s, u) => [lerp(SX[7] - 4, ROOMC, ease(u)), lerp(7, 24, ease(u)), lerp(20, 130, ease(u)), lerp(SX[7], ROOMC, ease(u)), lerp(3.5, 5, u), 0],
      overlay(t, s) { txt('ขอบคุณที่รับชมครับ', W / 2, 360, 120, { a: ease((t - (s.end - 7)) / 1.4) * ease((TL.duration - 1 - t) / 1.2) }); txt('วิทยาศาสตร์อยู่ในทุกแก้ว', W / 2, 440, 54, { a: ease((t - (s.end - 6)) / 1.4) * ease((TL.duration - 1 - t) / 1.2), c: AMBER, w: 400, ls: 4 }); } },
  };
  const SC = ORDER.map((k) => ({ k, s: SEG[k], sc: scenes[k] }));
  const uOf = (e, t) => clamp((t - e.s.start) / (e.s.end - e.s.start));
  const TS = SC.map((e, i) => (i < SC.length - 1 ? e.s.end - 1.6 : 1e9)), TE = SC.map((e, i) => (i < SC.length - 1 ? SC[i + 1].s.start + 1.0 : 1e9));
  const lerpA = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));

  function frame(t) {
    SC.forEach((e) => e.sc.upd(t, e.s, uOf(e, t)));
    dust.p.geometry.attributes.position.array.forEach((v, i) => { const a = dust.p.geometry.attributes.position.array, b = dust.base; if (i % 3 === 1) a[i] = (b[i] + t * .25 + Math.sin(t * .3 + i) * .4) % 14; else a[i] = b[i] + Math.sin(t * .2 + i * 1.3) * .8; });
    dust.p.geometry.attributes.position.needsUpdate = true;
    let j = 0; while (j < SC.length - 1 && t >= TE[j]) j++;
    let P = SC[j].sc.pose(t, SC[j].s, uOf(SC[j], t));
    if (j < SC.length - 1 && t >= TS[j]) { const k = ease((t - TS[j]) / (TE[j] - TS[j])), Q = SC[j + 1].sc.pose(t, SC[j + 1].s, 0); P = lerpA(P, Q, k); P[1] += Math.sin(Math.PI * k) * 3; }
    cam.position.set(P[0], P[1], P[2]); cam.lookAt(P[3], P[4], P[5]);
    spot.position.set(P[3] + 2, 10, 8);
    bloom.strength = .5 + .15 * Math.sin(t * .4);
    composer.render();
    ctx.clearRect(0, 0, W, H); ctx.drawImage(glc, 0, 0);
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * .5, W / 2, H / 2, H * .98); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,4,0,.5)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    SC.forEach((e) => { if (t >= e.s.start - 1 && t <= e.s.end + 3.5) e.sc.overlay(t, e.s, uOf(e, t)); });
    let d = 0; if (t < 1.2) d = 1 - t / 1.2; if (t > TL.duration - 1.5) d = Math.max(d, (t - (TL.duration - 1.5)) / 1.5);
    if (d > 0) { ctx.fillStyle = `rgba(0,0,0,${clamp(d)})`; ctx.fillRect(0, 0, W, H); }
  }
  window.frame = frame; window.grabPNG = (t) => { frame(t); return out.toDataURL('image/png').split(',')[1]; };
  Promise.all([document.fonts.load('700 46px NST', 'กขคabc'), document.fonts.load('400 30px NST', 'กขคabc')]).then(() => document.fonts.ready).then(() => { frame(0); window.READY = true; });
})();
