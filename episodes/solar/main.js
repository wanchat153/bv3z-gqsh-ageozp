/* Solar system & gravity — educational video v2 (HDR + bloom, procedural planets, minimal text).
   frame(t) is a pure function of time t (seconds). */
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

  // ---------- renderer + post ----------
  const glc = document.createElement('canvas'); glc.width = W; glc.height = H;
  const renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H, false); renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const out = document.getElementById('c'), ctx = out.getContext('2d');
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(38, W / H, 0.1, 4000);
  const composer = new THREE.EffectComposer(renderer);
  composer.setPixelRatio(1); composer.setSize(W, H);
  composer.addPass(new THREE.RenderPass(scene, cam));
  const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(W, H), .7, .65, 1.0);
  composer.addPass(bloom);
  composer.addPass(new THREE.OutputPass());

  // ---------- procedural noise textures ----------
  const hash = (x, y, s) => { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 982451653)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  function vnoise(x, y, px, s) { // periodic in x with period px
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const x0 = ((xi % px) + px) % px, x1 = (x0 + 1) % px;
    const a = hash(x0, yi, s), b = hash(x1, yi, s), c = hash(x0, yi + 1, s), d = hash(x1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(u, v, oct, base, s, sy = 1) {
    let amp = .5, sum = 0, tot = 0, f = base;
    for (let o = 0; o < oct; o++) { sum += amp * vnoise(u * f, v * f * .5 * sy, f, s + o * 7); tot += amp; amp *= .5; f *= 2; }
    return sum / tot;
  }
  const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
  function ramp(stops, k) {
    k = clamp(k);
    for (let i = 1; i < stops.length; i++) if (k <= stops[i][0]) {
      const a = stops[i - 1], b = stops[i], q = (k - a[0]) / (b[0] - a[0] || 1), ca = hex(a[1]), cb = hex(b[1]);
      return [ca[0] + (cb[0] - ca[0]) * q, ca[1] + (cb[1] - ca[1]) * q, ca[2] + (cb[2] - ca[2]) * q];
    }
    return hex(stops[stops.length - 1][1]);
  }
  const TW = 1024, TH = 512;
  function makeTex(fn, opts = {}) {
    const c = document.createElement('canvas'); c.width = TW; c.height = TH; const g = c.getContext('2d');
    const im = g.createImageData(TW, TH), hc = document.createElement('canvas'); hc.width = TW; hc.height = TH;
    const hg = hc.getContext('2d'), hi = hg.createImageData(TW, TH);
    for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
      const r = fn(x / TW, y / TH), i = (y * TW + x) * 4;
      im.data[i] = r[0]; im.data[i + 1] = r[1]; im.data[i + 2] = r[2]; im.data[i + 3] = r[3] === undefined ? 255 : r[3];
      const hh = (r[4] === undefined ? (r[0] + r[1] + r[2]) / 3 : r[4]);
      hi.data[i] = hi.data[i + 1] = hi.data[i + 2] = hh; hi.data[i + 3] = 255;
    }
    g.putImageData(im, 0, 0); hg.putImageData(hi, 0, 0);
    if (opts.craters) {
      const rr = (() => { let sd = opts.craters; return () => ((sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296); })();
      for (let i = 0; i < 170; i++) {
        const cx = rr() * TW, cy = (.1 + .8 * rr()) * TH, r = 3 + Math.pow(rr(), 2.4) * 34;
        for (const [c2, dark, lite] of [[g, 'rgba(0,0,0,.28)', 'rgba(255,255,255,.22)'], [hg, 'rgba(0,0,0,.5)', 'rgba(255,255,255,.4)']]) {
          const gr = c2.createRadialGradient(cx, cy, r * .2, cx, cy, r);
          gr.addColorStop(0, dark); gr.addColorStop(.82, 'rgba(0,0,0,.05)'); gr.addColorStop(.92, lite); gr.addColorStop(1, 'rgba(255,255,255,0)');
          c2.fillStyle = gr; c2.beginPath(); c2.arc(cx, cy, r, 0, 7); c2.fill();
        }
      }
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.wrapS = THREE.RepeatWrapping;
    const b = new THREE.CanvasTexture(hc); b.wrapS = THREE.RepeatWrapping;
    return { map: t, bump: b };
  }
  const T = {};
  T.earth = makeTex((u, v) => {
    const h = fbm(u, v, 6, 4, 11), lat = Math.abs(v - .5) * 2, ice = lat + (fbm(u, v, 4, 8, 3) - .5) * .18;
    if (ice > .9) return [238, 244, 250, 255, 200];
    if (h > .5) {
      const e = (h - .5) * 3.2, dry = sstep(.12, .42, lat) * (1 - sstep(.5, .72, lat)) * fbm(u, v, 4, 6, 9);
      let c = ramp([[0, 0x2f6b2f], [.5, 0x4e8a3b], [1, 0x8a7a55]], e + dry * .6);
      c = [c[0] + (210 - c[0]) * dry * .55, c[1] + (180 - c[1]) * dry * .55, c[2] + (120 - c[2]) * dry * .55];
      if (e > .85) c = [200, 200, 205];
      return [c[0], c[1], c[2], 255, 90 + e * 120];
    }
    const d = (.5 - h) * 3.2, c = ramp([[0, 0x2aa6c8], [.12, 0x1a78b8], [.5, 0x0e3f86], [1, 0x071f55]], d);
    return [c[0], c[1], c[2], 255, 60];
  });
  T.clouds = makeTex((u, v) => { const c = fbm(u, v, 6, 5, 77), a = sstep(.52, .78, c) * 235; return [255, 255, 255, a, a]; });
  T.mercury = makeTex((u, v) => { const h = fbm(u, v, 6, 8, 21), c = ramp([[0, 0x4f4a46], [.5, 0x8c847b], [1, 0xc0b8ac]], h); return [c[0], c[1], c[2]]; }, { craters: 5 });
  T.moon = makeTex((u, v) => { const h = fbm(u, v, 6, 6, 55), m = sstep(.45, .6, fbm(u, v, 3, 3, 8)), c = ramp([[0, 0x6a6a6c], [.5, 0xa4a4a4], [1, 0xd2d2d0]], h), k = 1 - m * .35; return [c[0] * k, c[1] * k, c[2] * k]; }, { craters: 9 });
  T.mars = makeTex((u, v) => {
    const h = fbm(u, v, 6, 6, 23), lat = Math.abs(v - .5) * 2; if (lat > .93) return [240, 240, 245];
    const c = ramp([[0, 0x6e2d16], [.45, 0xb5532f], [.75, 0xd88a5a], [1, 0xe8b78a]], h); return [c[0], c[1], c[2]];
  }, { craters: 3 });
  T.venus = makeTex((u, v) => {
    const w = fbm(u, v, 5, 3, 31), h = fbm(u + w * .25, v + w * .3, 6, 4, 32), c = ramp([[0, 0xb98a46], [.5, 0xe0b878], [1, 0xf6e2b0]], h); return [c[0], c[1], c[2]];
  });
  function gas(stops, bands, warp, seed) {
    return (u, v) => {
      const w = fbm(u, v, 5, 4, seed, 3) - .5, vv = v + w * warp;
      const band = .5 + .5 * Math.sin(vv * bands * Math.PI * 2 + fbm(u, vv, 3, 3, seed + 3) * 3);
      const fine = fbm(u, vv * 6, 4, 8, seed + 5, 1) - .5;
      const c = ramp(stops, band * .85 + .15 * fine + .05);
      return [c[0], c[1], c[2]];
    };
  }
  T.jupiter = makeTex((u, v) => {
    const base = gas([[0, 0x8a5a38], [.3, 0xc49a70], [.55, 0xeadcc4], [.8, 0xb27a4f], [1, 0xdcc3a0]], 4.5, .18, 41)(u, v);
    const dx = (u - .66) * 2.2, dy = (v - .63) * 5.5, d = Math.hypot(dx, dy);
    const k = 1 - sstep(.55, 1, d), sw = .5 + .5 * Math.sin(Math.atan2(dy, dx) * 2 + d * 8);
    return [lerp(base[0], 168 + 20 * sw, k * .9), lerp(base[1], 70 + 10 * sw, k * .9), lerp(base[2], 44, k * .9)];
  });
  T.saturn = makeTex(gas([[0, 0xb89e62], [.4, 0xe3cf98], [.7, 0xf2e6bf], [1, 0xcbb27a]], 5, .06, 51));
  T.uranus = makeTex(gas([[0, 0x7ccacf], [.5, 0x9ce0e2], [1, 0xb4eef0]], 3, .03, 61));
  T.neptune = makeTex((u, v) => {
    const b = gas([[0, 0x24409f], [.5, 0x3f6be0], [1, 0x6a95f4]], 4, .06, 71)(u, v);
    const d = Math.hypot((u - .35) * 2.4, (v - .6) * 5), k = 1 - sstep(.4, .9, d);
    return [lerp(b[0], 20, k * .55), lerp(b[1], 36, k * .55), lerp(b[2], 100, k * .55)];
  });
  T.sun = makeTex((u, v) => {
    const g1 = fbm(u, v, 6, 10, 81), g2 = fbm(u + g1 * .08, v, 5, 24, 83), k = g1 * .6 + g2 * .4;
    const c = ramp([[0, 0xd8480a], [.45, 0xff8a14], [.75, 0xffc43d], [1, 0xfff0a8]], k * 1.15 - .08); return [c[0], c[1], c[2]];
  });

  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(.12, 'rgba(255,200,100,.7)'); gr.addColorStop(.35, 'rgba(255,140,40,.22)'); gr.addColorStop(1, 'rgba(255,100,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c);
  })();
  const ringTex = (() => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 8; const g = c.getContext('2d');
    for (let x = 0; x < 1024; x++) {
      const q = x / 1024, n = vnoise(x * .35, 3, 4096, 5) * .6 + vnoise(x * 1.7, 9, 4096, 6) * .4;
      let a = (q < .08 ? 0 : q < .30 ? .25 + .3 * n : q < .66 ? .75 + .25 * n : q < .70 ? .06 : q < .98 ? .6 + .3 * n : 0);
      if (q > .62 && q < .66) a *= .5;
      const col = q < .3 ? [150, 130, 100] : [236, 218, 178];
      g.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${a})`; g.fillRect(x, 0, 1, 8);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const skyTex = (() => {
    const w = 1024, h = 512, nc = document.createElement('canvas'); nc.width = w; nc.height = h; const g = nc.getContext('2d');
    const im = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = x / w, v = y / h, band = Math.exp(-Math.pow((v - .5 - .12 * Math.sin(u * 6.28)) * 5, 2));
      const n = fbm(u, v, 6, 3, 91, 1.4), n2 = fbm(u, v, 5, 6, 93, 1.4);
      const dust = sstep(.45, .8, n) * band, neb = sstep(.55, .85, n2) * .35, i = (y * w + x) * 4;
      im.data[i] = 4 + 40 * dust + 55 * neb * (.6 + .4 * u); im.data[i + 1] = 5 + 28 * dust + 22 * neb; im.data[i + 2] = 12 + 60 * dust + 90 * neb; im.data[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    const c = document.createElement('canvas'); c.width = 4096; c.height = 2048; const g2 = c.getContext('2d');
    g2.imageSmoothingEnabled = true; g2.imageSmoothingQuality = 'high'; g2.drawImage(nc, 0, 0, 4096, 2048);
    const sd = (() => { let s = 4242; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
    for (let i = 0; i < 16000; i++) {
      const x = sd() * 4096, y = sd() * 2048, b = Math.pow(sd(), 4), tint = sd(), sz = .7 + b * 1.5;
      g2.fillStyle = `rgba(${tint > .7 ? 255 : 215 + 40 * tint},${tint > .7 ? 215 : 230},${tint < .25 ? 255 : 232},${.25 + .75 * b})`;
      g2.fillRect(x, y, sz, sz);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  })();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2500, 48, 24), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, toneMapped: false, depthWrite: false }));
  scene.add(sky);

  // ---------- lights ----------
  const amb = new THREE.AmbientLight(0x30406a, 1.0); scene.add(amb);
  const sunLight = new THREE.PointLight(0xfff1d8, 5, 0, 0); scene.add(sunLight);
  const key = new THREE.DirectionalLight(0xfff4e6, 1.6); key.position.set(-30, 40, 50); scene.add(key);

  // ---------- body builders ----------
  const atmoMat = (c, p = 2.4, o = 3.2) => new THREE.ShaderMaterial({
    uniforms: { c: { value: new THREE.Color(c) }, p: { value: p }, o: { value: o } },
    vertexShader: 'varying vec3 vN; void main(){ vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'uniform vec3 c; uniform float p; uniform float o; varying vec3 vN; void main(){ float i=pow(max(0.0,-dot(vN,vec3(0.0,0.0,1.0))),p)*o; gl_FragColor=vec4(c*i,1.0);}',
    side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
  });
  function body(R, tex, atmo, bumpS = .02, seg = 56) {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.SphereGeometry(R, seg, Math.round(seg * .7)), new THREE.MeshStandardMaterial({ map: tex.map, bumpMap: tex.bump, bumpScale: bumpS * R, roughness: .92, metalness: 0 }));
    g.add(m);
    if (atmo) g.add(new THREE.Mesh(new THREE.SphereGeometry(R * (atmo.s || 1.14), 40, 28), atmoMat(atmo.c, atmo.p, atmo.o)));
    return g;
  }
  function earth(R) {
    const g = body(R, T.earth, { c: 0x4aa8ff, s: 1.13, p: 2.4, o: 3.2 }, .03);
    const cl = new THREE.Mesh(new THREE.SphereGeometry(R * 1.012, 56, 40), new THREE.MeshStandardMaterial({ map: T.clouds.map, transparent: true, roughness: 1, depthWrite: false }));
    g.add(cl); g.clouds = cl; return g;
  }

  const sunLight2 = new THREE.PointLight(0xfff1d8, 0, 0, 0); scene.add(sunLight2);

  // ---------- world layout: one continuous flight through all places ----------
  const AX = { solar1: 0, giants: 450, grav: 900, newt: 1350, cannon: 1800, solar2: 2250, warp: 2700 };

  const PLD = [
    { n: 'ดาวพุธ', R: .75, a: 8.5, P: .241, mass: 'พุธ', mk: () => body(.75, T.mercury, null, .05) },
    { n: 'ดาวศุกร์', R: 1.2, a: 11.8, P: .615, mass: 'ศุกร์', mk: () => body(1.2, T.venus, { c: 0xffc873, s: 1.12, p: 2.4, o: 3.2 }, .005) },
    { n: 'โลก', R: 1.25, a: 15.5, P: 1, mass: 'โลก', mk: () => earth(1.25) },
    { n: 'ดาวอังคาร', R: 1.0, a: 19, P: 1.88, mass: 'อังคาร', mk: () => body(1.0, T.mars, { c: 0xff8a5a, s: 1.07, p: 2.4, o: 3.2 }, .05) },
    { n: 'ดาวพฤหัสบดี', R: 3.5, a: 27.5, P: 11.86, mass: 'พฤหัสบดี', mk: () => body(3.5, T.jupiter, { c: 0xe7c9a0, s: 1.05, p: 2.4, o: 3.2 }, .004, 64) },
    { n: 'ดาวเสาร์', R: 3.0, a: 36, P: 29.4, mass: 'เสาร์', ring: true, mk: () => body(3.0, T.saturn, { c: 0xf0dca0, s: 1.05, p: 2.4, o: 3.2 }, .004, 64) },
    { n: 'ดาวยูเรนัส', R: 2.0, a: 43, P: 84, mass: 'ยูเรนัส', mk: () => body(2.0, T.uranus, { c: 0x9ff0f4, s: 1.1, p: 2.4, o: 3.2 }, .003) },
    { n: 'ดาวเนปจูน', R: 1.95, a: 49.5, P: 164.8, mass: 'เนปจูน', mk: () => body(1.95, T.neptune, { c: 0x5a86ff, s: 1.1, p: 2.4, o: 3.2 }, .003) },
  ];
  const TINT = [0xc9bfb2, 0xf2d08f, 0x6fb4ff, 0xff9a70, 0xeccaa0, 0xf0dca0, 0xa2eef2, 0x6c92ff];
  const SUNR = 4.2, TR_N = 56, ANG0 = [0.5, 2.2, 4.0, 5.3, 1.2, 3.3, 0.2, 2.6], EARTH_SEC = 10;
  function ringFor(R) {
    const rg = new THREE.RingGeometry(R * 1.25, R * 2.35, 128, 1), pa = rg.attributes.position, uv = rg.attributes.uv;
    for (let k = 0; k < pa.count; k++) uv.setXY(k, (Math.hypot(pa.getX(k), pa.getY(k)) - R * 1.25) / (R * 1.1), .5);
    const ring = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ map: ringTex, transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 1 }));
    ring.rotation.x = Math.PI / 2 - .42; return ring;
  }
  function makeSolar(ax) {
    const S = { group: new THREE.Group(), PL: [], ax };
    S.group.position.set(ax, 0, 0); scene.add(S.group);
    S.sun = new THREE.Mesh(new THREE.SphereGeometry(SUNR, 64, 44), new THREE.MeshBasicMaterial({ map: T.sun.map, color: new THREE.Color(1.9, 1.7, 1.5) }));
    S.group.add(S.sun);
    [[SUNR * 6, .9], [SUNR * 14, .35]].forEach(([sc, op]) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: op })); sp.scale.setScalar(sc); S.group.add(sp);
    });
    PLD.forEach((d, i) => {
      const p = Object.assign({}, d); p.mesh = d.mk(); S.group.add(p.mesh);
      if (d.ring) p.mesh.add(ringFor(d.R));
      const pts = []; for (let k = 0; k <= 256; k++) { const a = k / 256 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * d.a, 0, Math.sin(a) * d.a)); }
      p.orbit = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x7f9bd6, transparent: true, opacity: .28 })); S.group.add(p.orbit);
      const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TR_N * 3), 3));
      const col = new Float32Array(TR_N * 3), c0 = new THREE.Color(TINT[i]);
      for (let k = 0; k < TR_N; k++) { const f = Math.pow(1 - k / (TR_N - 1), 2.2); col[k * 3] = c0.r * f; col[k * 3 + 1] = c0.g * f; col[k * 3 + 2] = c0.b * f; }
      tg.setAttribute('color', new THREE.BufferAttribute(col, 3));
      p.trail = new THREE.Line(tg, new THREE.LineBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); p.trail.frustumCulled = false; S.group.add(p.trail);
      S.PL.push(p);
    });
    S.place = (t, mask = 1) => {
      S.PL.forEach((p, i) => {
        const w = (2 * Math.PI) / (EARTH_SEC * p.P), ang = ANG0[i] + t * w;
        p.mesh.position.set(Math.cos(ang) * p.a, 0, Math.sin(ang) * p.a);
        p.mesh.rotation.y = t * (i === 4 || i === 5 ? .5 : .3);
        if (p.mesh.clouds) p.mesh.clouds.rotation.y = t * .04;
        const span = clamp(w * 1.3, .05, 1.5), pos = p.trail.geometry.attributes.position.array;
        for (let k = 0; k < TR_N; k++) { const a = ang - span * k / (TR_N - 1); pos[k * 3] = Math.cos(a) * p.a; pos[k * 3 + 1] = 0; pos[k * 3 + 2] = Math.sin(a) * p.a; }
        p.trail.geometry.attributes.position.needsUpdate = true;
        const m = Math.max(.001, mask); p.mesh.scale.setScalar(m); p.mesh.visible = p.orbit.visible = p.trail.visible = mask > .01;
        p.orbit.material.opacity = .28 * mask; p.trail.material.opacity = mask;
      });
      S.sun.rotation.y = t * .05;
    };
    return S;
  }
  const solar1 = makeSolar(AX.solar1), solar2 = makeSolar(AX.solar2);

  // giants
  const gGiants = new THREE.Group(); gGiants.position.set(AX.giants, 0, 0); scene.add(gGiants);
  const gJup = body(3.5, T.jupiter, { c: 0xe7c9a0, s: 1.05, p: 2.4, o: 3.2 }, .004, 64), gSat = body(3.0, T.saturn, { c: 0xf0dca0, s: 1.05, p: 2.4, o: 3.2 }, .004, 64), gEar = earth(1.25);
  gSat.add(ringFor(3.0)); gJup.position.set(-12, 0, 0); gSat.position.set(14, 0, 0); gEar.position.set(-2.2, -3.1, 6); gSat.rotation.z = .1;
  gGiants.add(gJup, gSat, gEar);

  const GOLDC = () => new THREE.Color(2.2, 1.7, .4);
  const gGrav = new THREE.Group(); gGrav.position.set(AX.grav, 0, 0); scene.add(gGrav);
  const gm1 = earth(3), gm2 = body(1.5, T.mars, { c: 0xff8a5a, s: 1.07, p: 2.4, o: 3.2 }, .05);
  const arr1 = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 3, 0xffd34d, 1, .8);
  const arr2 = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(), 3, 0xffd34d, 1, .8);
  [arr1, arr2].forEach((a) => { a.line.material = new THREE.LineBasicMaterial({ color: GOLDC() }); a.cone.material = new THREE.MeshBasicMaterial({ color: GOLDC() }); });
  gGrav.add(gm1, gm2, arr1, arr2);

  const gNewt = new THREE.Group(); gNewt.position.set(AX.newt, 0, 0); scene.add(gNewt);
  const bigEarth = earth(10), moon = body(2.7, T.moon, null, .06);
  const apple = new THREE.Group();
  apple.add(new THREE.Mesh(new THREE.SphereGeometry(.8, 28, 20), new THREE.MeshStandardMaterial({ color: 0xd8262b, roughness: .35 })));
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .45, 6), new THREE.MeshStandardMaterial({ color: 0x5b3a1a })); stem.position.y = .9; apple.add(stem);
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(.28, 12, 8), new THREE.MeshStandardMaterial({ color: 0x3d9a3a })); leaf.scale.set(1.6, .25, .9); leaf.position.set(.3, 1.05, 0); apple.add(leaf);
  const moonArrow = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(), 8, 0xffd34d, 2, 1.2);
  moonArrow.line.material = new THREE.LineBasicMaterial({ color: GOLDC() }); moonArrow.cone.material = new THREE.MeshBasicMaterial({ color: GOLDC() });
  const moonPath = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 200 }, (_, k) => new THREE.Vector3(Math.cos(k / 200 * 6.2832) * 60, Math.sin(k / 200 * 6.2832) * 60, 0))), new THREE.LineBasicMaterial({ color: 0x8fa6d6, transparent: true, opacity: .45 }));
  moonPath.position.set(0, -10, 0); bigEarth.position.set(0, -10, 0);
  gNewt.add(bigEarth, apple, moon, moonArrow, moonPath);

  const gCannon = new THREE.Group(); gCannon.position.set(AX.cannon, 0, 0); scene.add(gCannon);
  const cannonEarth = earth(10); gCannon.add(cannonEarth);
  const MU = 100, R0 = 13, VC = Math.sqrt(MU / R0);
  const SHOTS = [{ f: .45, col: [2.6, .9, .6] }, { f: .8, col: [2.6, 2.0, .5] }, { f: 1.0, col: [.7, 2.6, 1.4] }];
  function simulate(f) {
    const pts = []; let x = 0, y = R0, vx = VC * f, vy = 0; const dt = .01;
    for (let i = 0; i < 4200; i++) {
      pts.push([x, y]);
      let r = Math.hypot(x, y), ax = -MU * x / (r * r * r), ay = -MU * y / (r * r * r);
      vx += ax * dt / 2; vy += ay * dt / 2; x += vx * dt; y += vy * dt;
      r = Math.hypot(x, y); ax = -MU * x / (r * r * r); ay = -MU * y / (r * r * r); vx += ax * dt / 2; vy += ay * dt / 2;
      if (r <= 10.02) { pts.push([x, y]); break; }
    }
    return pts;
  }
  SHOTS.forEach((s) => {
    s.pts = simulate(s.f); const c = new THREE.Color(s.col[0], s.col[1], s.col[2]);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(s.pts.length * 3), 3));
    s.geo = g; s.line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: c, depthTest: false, transparent: true })); s.line.frustumCulled = false; s.line.renderOrder = 5;
    s.ball = new THREE.Mesh(new THREE.SphereGeometry(.38, 20, 14), new THREE.MeshBasicMaterial({ color: c, depthTest: false })); s.ball.renderOrder = 6;
    gCannon.add(s.line, s.ball);
  });
  const cannonBody = new THREE.Mesh(new THREE.BoxGeometry(1.5, .6, .7), new THREE.MeshStandardMaterial({ color: 0x2d2f36, roughness: .5, metalness: .6 })); cannonBody.position.set(-.5, 13.3, 0);
  const peak = new THREE.Mesh(new THREE.ConeGeometry(2.2, 4.4, 5), new THREE.MeshStandardMaterial({ color: 0x75604a, roughness: 1 })); peak.position.set(0, 11.0, 0);
  gCannon.add(cannonBody, peak);

  const gWarp = new THREE.Group(); gWarp.position.set(AX.warp, 0, 0); scene.add(gWarp);
  const warpH = (x, z) => -9 / Math.sqrt(x * x + z * z + 3.2);
  (function () {
    const pts = [], col = [], N = 45, L = 24, c0 = new THREE.Color(.25, .8, 2.2), c1 = new THREE.Color(.1, .25, .9);
    const push = (x, z) => { pts.push(x, warpH(x, z), z); const k = clamp(-warpH(x, z) / 2.8); col.push(lerp(c1.r, c0.r, k), lerp(c1.g, c0.g, k), lerp(c1.b, c0.b, k)); };
    for (let i = 0; i < N; i++) {
      const a = -L + 2 * L * i / (N - 1);
      for (let j = 0; j < 180; j++) { const b0 = -L + 2 * L * j / 180, b1 = -L + 2 * L * (j + 1) / 180; push(a, b0); push(a, b1); push(b0, a); push(b1, a); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
    gWarp.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false })));
  })();
  const warpSun = new THREE.Mesh(new THREE.SphereGeometry(2.6, 48, 32), new THREE.MeshBasicMaterial({ map: T.sun.map, color: new THREE.Color(1.9, 1.7, 1.5) }));
  warpSun.position.y = warpH(0, 0) + 1.2;
  const warpGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .9 }));
  warpGlow.scale.setScalar(16); warpGlow.position.copy(warpSun.position);
  const marble = new THREE.Mesh(new THREE.SphereGeometry(.8, 32, 24), new THREE.MeshStandardMaterial({ color: 0xa6dcff, roughness: .15, metalness: .5, emissive: 0x2a6fa8, emissiveIntensity: .8 }));
  const mtGeo = new THREE.BufferGeometry(); mtGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(90 * 3), 3));
  const mtCol = new Float32Array(90 * 3); for (let k = 0; k < 90; k++) { const f = Math.pow(1 - k / 89, 2); mtCol[k * 3] = 1.2 * f; mtCol[k * 3 + 1] = 3 * f; mtCol[k * 3 + 2] = 4.8 * f; }
  mtGeo.setAttribute('color', new THREE.BufferAttribute(mtCol, 3));
  const mtLine = new THREE.Line(mtGeo, new THREE.LineBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); mtLine.frustumCulled = false;
  gWarp.add(warpSun, warpGlow, marble, mtLine);

  // space dust along the flight path: gives parallax so travelling between places reads as smooth motion
  (function () {
    const n = 9000, pos = new Float32Array(n * 3); let sd = 99; const r = () => ((sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < n; i++) { pos[i * 3] = -300 + r() * 3400; pos[i * 3 + 1] = (r() - .5) * 260; pos[i * 3 + 2] = (r() - .5) * 400; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex, color: 0x9fb8ff, size: 3.2, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false }));
    pts.frustumCulled = false; scene.add(pts);
  })();

  // ---------- overlay helpers (minimal text) ----------
  function txt(s, x, y, size, o = {}) {
    ctx.save();
    ctx.font = `${o.w || 700} ${size}px ${FONT}`; ctx.textAlign = o.al || 'center'; ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha = (o.a === undefined ? 1 : o.a);
    ctx.shadowColor = 'rgba(0,0,0,.75)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 2;
    if (o.ls) ctx.letterSpacing = o.ls + 'px';
    ctx.fillStyle = o.c || '#fff'; ctx.fillText(s, x, y); ctx.restore();
  }
  function project(v) { const p = v.clone().project(cam); return { x: (p.x * .5 + .5) * W, y: (-p.y * .5 + .5) * H }; }
  const wpos = (obj, dy = 0) => { const v = new THREE.Vector3(); obj.getWorldPosition(v); v.y += dy; return v; };
  const tag = (s, x, y, a) => { txt(s, x, y, 34, { a, w: 400 }); ctx.save(); ctx.globalAlpha = a * .6; ctx.fillStyle = '#9fc2ff'; ctx.fillRect(x - 24, y + 12, 48, 2); ctx.restore(); };
  const GOLD = '#ffd36b';

  // camera pose helpers: return [px,py,pz,tx,ty,tz] in world space
  const orb = (ax, d, az, el, tx = 0, ty = 0, tz = 0) => [ax + tx + d * Math.cos(el) * Math.cos(az), ty + d * Math.sin(el), tz + d * Math.cos(el) * Math.sin(az), ax + tx, ty, tz];

  // ---------- scenes: upd() animates objects, pose() gives the camera, overlay() draws text ----------
  const sunSeg = SEG.sun, plSeg = SEG.planets;
  const scenes = {
    intro: {
      upd(t) { }, pose: (t, s, u) => orb(AX.solar1, lerp(210, 86, ease(u)), lerp(.5, 1.45, u), lerp(.55, .36, u)),
      overlay(t, s) {
        const a = fade(t, s.start + 2, s.start + 13, 1.4, 1.6);
        txt('ระบบสุริยะ', W / 2, 400, 170, { a, ls: 6 }); txt('และแรงโน้มถ่วง', W / 2, 500, 70, { a, w: 400, c: '#cfe3ff', ls: 8 });
      },
    },
    sun: {
      upd() { }, pose: (t, s, u) => orb(AX.solar1, lerp(30, 21, ease(u)), .9, .12),
      overlay(t, s) {
        const a = fade(t, when('sun', '99') - .6, s.end + 2, .8, 1.2);
        txt('99.86%', 1450, 480, 150, { a, c: GOLD }); txt('ของมวลทั้งหมด', 1450, 540, 42, { a, w: 400, c: '#e8f0ff' });
        const b = fade(t, when('sun', 'ล้าน') - 1.2, s.end + 2, .8, 1.2);
        txt('1.3 ล้าน×', 1450, 700, 96, { a: b, c: '#8fc7ff' }); txt('เท่าของปริมาตรโลก', 1450, 752, 38, { a: b, w: 400, c: '#e8f0ff' });
      },
    },
    planets: {
      upd() { }, pose: (t, s, u) => orb(AX.solar1, lerp(120, 98, u), lerp(1.25, 1.55, u), .55),
      overlay(t, s) {
        solar1.PL.forEach((p) => {
          const k = ease((t - when('planets', p.mass) + .1) / .6) * fade(t, s.start, s.end + 3, .1, 1.2); if (k <= 0) return;
          const q = project(wpos(p.mesh, p.R + 1.8)); tag(p.n, q.x, q.y, k);
        });
      },
    },
    scale: {
      upd() { }, pose: (t, s, u) => orb(AX.solar1, 125, lerp(1.55, 1.57, u), lerp(1.0, 1.2, ease(u))),
      overlay(t, s) {
        const rad = ease(prog(t, s.start + 1.5, s.end - 1.2)) * 52; if (rad < .2) return;
        const c = project(wpos(solar1.sun)), e = project(wpos(solar1.sun).add(new THREE.Vector3(rad, 0, 0))), rp = Math.hypot(e.x - c.x, e.y - c.y);
        const fa = fade(t, s.start, s.end + 2, .6, 1.2);
        ctx.save(); ctx.globalAlpha = fa; ctx.strokeStyle = 'rgba(255,225,140,.95)'; ctx.lineWidth = 5; ctx.shadowColor = '#ffc860'; ctx.shadowBlur = 30; ctx.beginPath(); ctx.arc(c.x, c.y, rp, 0, 7); ctx.stroke();
        ctx.globalAlpha = .12 * fa; ctx.lineWidth = 60; ctx.stroke(); ctx.restore();
        [[2, '8 นาที 20 วินาที'], [4, '43 นาที'], [5, '1 ชม. 20 น.'], [6, '2 ชม. 40 น.'], [7, '4 ชม. 10 น.']].forEach(([i, lab]) => {
          const p = solar1.PL[i]; if (rad < p.a) return; const w = ease((rad - p.a) / 2.5) * fa;
          const q = project(wpos(p.mesh, p.R + 1.2)); txt(lab, q.x, q.y - 8, 38, { a: w, c: GOLD });
        });
      },
    },
    giants: {
      upd(t, s, u) { gJup.rotation.y = t * .25; gSat.rotation.y = t * .25; gEar.rotation.y = t * .3; gEar.clouds.rotation.y = t * .35; },
      pose: (t, s, u) => [AX.giants + lerp(0, 3, u), 3, lerp(40, 33, ease(u)), AX.giants, 0, 0],
      overlay(t, s) {
        const q = project(wpos(gJup, 5.6)); tag('ดาวพฤหัสบดี', q.x, q.y, fade(t, s.start + .5, s.end, .6, .8));
        const eq = project(wpos(gEar, -1.7)); tag('โลก', eq.x, eq.y, fade(t, s.start + 1.5, s.end, .6, .8));
        const sq = project(wpos(gSat, 6.4)); tag('ดาวเสาร์', sq.x, sq.y, fade(t, s.start + 6, s.end, .6, .8));
        const k = fade(t, when('giants', 'มวล') - .5, s.end + 2, .6, 1);
        txt('318×', W / 2 - 18, 170, 110, { a: k, c: GOLD, al: 'right' }); txt('เท่าของโลก', W / 2 + 18, 170, 44, { a: k, w: 400, al: 'left' });
        const k2 = fade(t, when('giants', 'สองเท่า') - 1, s.end + 2, .6, 1);
        txt('> 2×', W / 2 - 18, 290, 110, { a: k2, c: '#8fc7ff', al: 'right' }); txt('ดาวเคราะห์ที่เหลือรวมกัน', W / 2 + 18, 290, 44, { a: k2, w: 400, al: 'left' });
      },
    },
    gravity: {
      upd(t, s, u) {
        const r = 12 + 6 * Math.sin(u * 6.2832 * 1.5 - 1.2);
        gm1.position.set(-r * .35, 0, 0); gm2.position.set(r * .65, 0, 0); gm1.rotation.y = t * .3; gm2.rotation.y = t * .4;
        const F = 560 / (r * r), hl = Math.min(1.4, F * .4), hw = Math.min(.9, F * .25);
        arr1.position.set(gm1.position.x + 3.3, 0, 0); arr1.setLength(F, hl, hw);
        arr2.position.set(gm2.position.x - 1.8, 0, 0); arr2.setLength(F, hl, hw);
      },
      pose: (t, s, u) => [AX.grav, 6, 34, AX.grav, 0, 0],
      overlay(t, s) { txt('F = G · m₁ · m₂ / r²', W / 2, 190, 92, { a: fade(t, s.start + .5, s.end + 1, .8, 1) }); },
    },
    newton: {
      upd(t, s, u) {
        bigEarth.rotation.y = t * .03;
        const split = .38, fa = prog(u, .04, split);
        apple.position.set(0, lerp(14, 0.4, fa * fa), 4); apple.visible = u < split + .12; apple.rotation.z = fa * 1.2;
        moon.visible = moonPath.visible = moonArrow.visible = u > split;
        const mAng = .25 + (u - split) * 2.4;
        moon.position.set(Math.cos(mAng) * 60, -10 + Math.sin(mAng) * 60, 0); moon.rotation.y = t * .1;
        moonArrow.position.copy(moon.position); moonArrow.setDirection(new THREE.Vector3(0, -10, 0).sub(moon.position).normalize());
        moonArrow.setLength(Math.max(.01, 9 * ease(prog(u, split + .2, split + .3))), 2.4, 1.4);
      },
      pose: (t, s, u) => { const pull = ease(prog(u, .38, .73)); return [AX.newt, lerp(3, 10, pull), lerp(30, 125, pull), AX.newt, lerp(2, -10, pull), 0]; },
      overlay(t, s) { txt('ไอแซก นิวตัน', 400, 140, 66, { a: fade(t, s.start + .3, s.start + 9, .8, 1) }); },
    },
    orbit: {
      upd(t, s) {
        const t0 = s.start + .6, per = (s.end - s.start - 2) / 3;
        SHOTS.forEach((sh, i) => {
          const a = t0 + i * per, run = clamp((t - a) / (per * .95)), n = sh.pts.length, last = Math.floor(run * (n - 1));
          const pos = sh.geo.attributes.position.array;
          for (let k = 0; k < n; k++) { const q = sh.pts[Math.min(k, last)]; pos[k * 3] = q[0]; pos[k * 3 + 1] = q[1]; pos[k * 3 + 2] = 0; }
          sh.geo.attributes.position.needsUpdate = true; sh.geo.setDrawRange(0, last + 1);
          const q = sh.pts[Math.min(last, n - 1)]; sh.ball.position.set(q[0], q[1], 0);
          sh.ball.visible = sh.line.visible = t >= a; sh.line.material.opacity = (i < 2 && t > a + per) ? .4 : 1;
        });
      },
      pose: (t, s, u) => [AX.cannon, 4, 70, AX.cannon, 0, 0],
      overlay(t, s) {
        const kk = ease((t - (s.end - 4.2)) / .8) * fade(t, s.start, s.end + 3, .1, 1.2);
        txt('การโคจร = การตกไม่สิ้นสุด', W / 2, 960, 70, { a: kk, c: '#7dffb4' });
      },
    },
    speed: {
      upd() { }, pose: (t, s, u) => orb(AX.solar2, 115, 1.57 + u * .3, .7),
      overlay(t, s) {
        const data = [['ดาวพุธ', 47.4], ['ดาวศุกร์', 35.0], ['โลก', 29.8], ['ดาวอังคาร', 24.1], ['ดาวพฤหัสบดี', 13.1], ['ดาวเสาร์', 9.7], ['ดาวยูเรนัส', 6.8], ['ดาวเนปจูน', 5.4]];
        const k = fade(t, s.start + .3, s.end + 2, .8, 1.2);
        ctx.save(); ctx.globalAlpha = k * .55; ctx.fillStyle = 'rgba(4,8,22,.9)'; ctx.beginPath(); ctx.roundRect(1000, 150, 830, 720, 28); ctx.fill(); ctx.restore();
        txt('กม./วินาที', 1790, 210, 30, { a: k * .8, al: 'right', w: 400, c: '#9fc2ff' });
        data.forEach(([n, v], j) => {
          const g = ease((t - s.start - 1 - j * .5) / 1.2) * k; if (g <= 0) return;
          const y = 245 + j * 74, wmax = 480, x0 = 1260;
          txt(n, 1040, y + 38, 30, { a: g, al: 'left', w: 400 });
          ctx.save(); ctx.globalAlpha = g; const gr = ctx.createLinearGradient(x0, 0, x0 + wmax, 0); gr.addColorStop(0, '#3a5fe0'); gr.addColorStop(1, '#ffd36b');
          ctx.fillStyle = gr; ctx.shadowColor = '#5b8cff'; ctx.shadowBlur = 16; ctx.beginPath(); ctx.roundRect(x0, y + 8, wmax * v / 47.4 * g, 40, 10); ctx.fill(); ctx.restore();
          txt(v.toFixed(1), x0 + wmax * v / 47.4 * g + 14, y + 40, 30, { a: g, al: 'left', c: GOLD });
        });
      },
    },
    einstein: {
      upd(t, s, u) {
        const pathAt = (tt) => { const uu = clamp((tt - s.start) / (s.end - s.start)), ang = tt * 1.3, rr = lerp(15, 7.5, ease(uu)); return [Math.cos(ang) * rr, Math.sin(ang) * rr]; };
        const [x, z] = pathAt(t); marble.position.set(x, warpH(x, z) + .8, z);
        const pos = mtGeo.attributes.position.array;
        for (let k = 0; k < 90; k++) { const [a, b] = pathAt(t - k * .035); pos[k * 3] = a; pos[k * 3 + 1] = warpH(a, b) + .8; pos[k * 3 + 2] = b; }
        mtGeo.attributes.position.needsUpdate = true;
      },
      pose: (t, s, u) => orb(AX.warp, lerp(46, 38, u), (s.start + u * (s.end - s.start)) * .06 + .5, .5, 0, -4, 0),
      overlay(t, s) { txt('กาลอวกาศ', 430, 150, 70, { a: fade(t, s.start + .4, s.end + 1, .8, 1.2), ls: 4 }); },
    },
    outro: {
      upd() { }, pose: (t, s, u) => orb(AX.solar2, lerp(70, 260, ease(u)), 1.5 + u * .4, lerp(.45, .75, u)),
      overlay(t, s) {
        txt('ทุกสิ่งในจักรวาล', W / 2, 190, 80, { a: fade(t, s.start + .5, s.end - 3.5, 1, 1) });
        txt('ผูกกันด้วยแรงโน้มถ่วง', W / 2, 285, 66, { a: fade(t, s.start + 2, s.end - 3.5, 1, 1), c: GOLD });
        txt('ขอบคุณที่รับชมครับ', W / 2, 250, 110, { a: ease((t - (s.end - 3.5)) / 1.2) * ease((TL.duration - 1 - t) / 1.2) });
      },
    },
  };
  const SC = ORDER.map((k) => ({ k, s: SEG[k], sc: scenes[k] }));
  const uOf = (e, t) => clamp((t - e.s.start) / (e.s.end - e.s.start));
  // transition window between scene i and i+1 (a smooth flight, no cuts)
  const TS = SC.map((e, i) => (i < SC.length - 1 ? e.s.end - 1.4 : 1e9)), TE = SC.map((e, i) => (i < SC.length - 1 ? SC[i + 1].s.start + .8 : 1e9));
  const lerpA = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));

  function frame(t) {
    // animate every object (pure in t)
    SC.forEach((e) => e.sc.upd(t, e.s, uOf(e, t)));
    const maskPl = 1 - fade(t, sunSeg.start - 1.8, plSeg.start - .6, 1.8, 1.6);
    solar1.place(t, maskPl); solar2.place(t, 1);
    // camera: hold the current scene's pose, then fly to the next one
    let j = 0; while (j < SC.length - 1 && t >= TE[j]) j++;
    let P = SC[j].sc.pose(t, SC[j].s, uOf(SC[j], t));
    if (j < SC.length - 1 && t >= TS[j]) {
      const kk = ease((t - TS[j]) / (TE[j] - TS[j])), Q = SC[j + 1].sc.pose(t, SC[j + 1].s, 0);
      P = lerpA(P, Q, kk); P[1] += Math.sin(Math.PI * kk) * 18; // gentle arc
    }
    cam.position.set(P[0], P[1], P[2]); cam.lookAt(P[3], P[4], P[5]);
    sky.position.copy(cam.position);
    // lighting follows where we are
    const near = (ax) => 1 - sstep(160, 330, Math.abs(cam.position.x - ax) + Math.abs(cam.position.y) * .3);
    const w1 = near(AX.solar1), w2 = near(AX.solar2), wS = Math.max(w1, w2);
    sunLight.position.set(AX.solar1, 0, 0); sunLight2.position.set(AX.solar2, 0, 0);
    sunLight.intensity = 5 * w1; sunLight2.intensity = 5 * w2;
    key.intensity = lerp(3.3, 1.6, wS); amb.intensity = lerp(1.45, 1, wS);
    bloom.strength = .7 + .3 * fade(t, sunSeg.start - .5, sunSeg.end + .5, 1.5, 1.5) + .2 * fade(t, SEG.einstein.start - .5, SEG.einstein.end + .5, 1.5, 1.5);
    composer.render();
    ctx.clearRect(0, 0, W, H); ctx.drawImage(glc, 0, 0);
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * .5, W / 2, H / 2, H * .98);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    SC.forEach((e) => { if (t >= e.s.start - 1 && t <= e.s.end + 3.5) e.sc.overlay(t, e.s, uOf(e, t)); });
    let d = 0;
    if (t < 1.2) d = 1 - t / 1.2;
    if (t > TL.duration - 1.5) d = Math.max(d, (t - (TL.duration - 1.5)) / 1.5);
    if (d > 0) { ctx.fillStyle = `rgba(0,0,0,${clamp(d)})`; ctx.fillRect(0, 0, W, H); }
  }

  window.frame = frame;
  window.grabPNG = (t) => { frame(t); return out.toDataURL('image/png').split(',')[1]; };
  Promise.all([document.fonts.load('700 46px NST', 'กขคabc'), document.fonts.load('400 30px NST', 'กขคabc')])
    .then(() => document.fonts.ready).then(() => { frame(0); window.READY = true; });
})();
