/* Solar system & gravity — educational video. frame(t) is a pure function of time t (seconds). */
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
  const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const seg = (k) => SEG[k];
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  // time at which a substring is spoken (by character share)
  function when(key, sub) {
    const s = SEG[key], i = s.text.indexOf(sub);
    if (i < 0) return s.start;
    return s.start + (i / s.text.length) * (s.end - s.start);
  }

  // ---------- renderer ----------
  const glc = document.createElement('canvas'); glc.width = W; glc.height = H;
  const renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H, false); renderer.setPixelRatio(1);
  const out = document.getElementById('c'), ctx = out.getContext('2d');
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(40, W / H, 0.1, 2000);

  // ---------- textures ----------
  function noiseTex(w, h, seed, fn) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'), r = rng(seed); fn(g, w, h, r);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  function bands(cols, seed, speck) {
    return noiseTex(512, 256, seed, (g, w, h, r) => {
      const n = cols.length;
      for (let y = 0; y < h; y++) {
        const k = y / h * n, i = Math.min(n - 1, Math.floor(k));
        g.fillStyle = cols[i]; g.fillRect(0, y, w, 1);
      }
      for (let i = 0; i < 1400; i++) {
        g.fillStyle = `rgba(${r() > .5 ? '255,255,255' : '0,0,0'},${(r() * speck).toFixed(3)})`;
        const y = r() * h; g.fillRect(r() * w, y, 20 + r() * 80, 1 + r() * 4);
      }
    });
  }
  function blotchy(base, dark, light, seed) {
    return noiseTex(512, 256, seed, (g, w, h, r) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) {
        g.fillStyle = r() > .5 ? dark : light; g.globalAlpha = 0.15 + r() * 0.3;
        g.beginPath(); g.ellipse(r() * w, r() * h, 6 + r() * 40, 3 + r() * 20, 0, 0, 7); g.fill();
      }
      g.globalAlpha = 1;
    });
  }
  const earthTex = noiseTex(512, 256, 7, (g, w, h, r) => {
    g.fillStyle = '#1f5fae'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      g.fillStyle = r() > .3 ? '#3f8f4a' : '#b9a46a'; g.beginPath();
      g.ellipse(r() * w, 40 + r() * (h - 80), 10 + r() * 38, 6 + r() * 20, r() * 3, 0, 7); g.fill();
    }
    g.fillStyle = '#f2f6fa'; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 14, w, 14);
    for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(r() * w, r() * h, 20 + r() * 40, 3 + r() * 6, 0, 0, 7); g.fill(); }
  });
  const sunTex = noiseTex(512, 256, 3, (g, w, h, r) => {
    g.fillStyle = '#ffb21f'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1600; i++) {
      g.fillStyle = r() > .5 ? '#ff8a00' : '#ffe27a'; g.globalAlpha = 0.12 + r() * 0.3;
      g.beginPath(); g.arc(r() * w, r() * h, 3 + r() * 14, 0, 7); g.fill();
    }
    g.globalAlpha = 1;
  });
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,230,150,1)'); gr.addColorStop(.25, 'rgba(255,170,50,.55)'); gr.addColorStop(1, 'rgba(255,120,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c);
  })();
  const ringTex = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 4; const g = c.getContext('2d'); const r = rng(11);
    for (let x = 0; x < 512; x++) { const a = (x > 40 && x < 480) ? (0.35 + 0.5 * r()) * (x > 300 && x < 320 ? 0.15 : 1) : 0; g.fillStyle = `rgba(220,200,160,${a})`; g.fillRect(x, 0, 1, 4); }
    return new THREE.CanvasTexture(c);
  })();

  // ---------- starfield & lights ----------
  (function () {
    const r = rng(42), n = 2500, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = r() * 6.2832, ph = Math.acos(2 * r() - 1), d = 900;
      pos[i * 3] = d * Math.sin(ph) * Math.cos(th); pos[i * 3 + 1] = d * Math.cos(ph); pos[i * 3 + 2] = d * Math.sin(ph) * Math.sin(th);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false })));
  })();
  const amb = new THREE.AmbientLight(0x2a3347, 1.0); scene.add(amb);
  const sunLight = new THREE.PointLight(0xfff0d0, 3.2, 0, 0); scene.add(sunLight);
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-30, 40, 50); scene.add(key);

  // ---------- planets data ----------
  // R = display radius, a = display orbit, P = period in years
  const PL = [
    { n: 'ดาวพุธ', R: .7, a: 8, P: .241, tex: blotchy('#8d8680', '#5f5953', '#b9b2aa', 21), mass: 'พุธ' },
    { n: 'ดาวศุกร์', R: 1.1, a: 11, P: .615, tex: blotchy('#d9b878', '#b88f4d', '#f1d9a2', 22), mass: 'ศุกร์' },
    { n: 'โลก', R: 1.15, a: 14.5, P: 1, tex: earthTex, mass: 'โลก' },
    { n: 'ดาวอังคาร', R: .9, a: 18, P: 1.88, tex: blotchy('#b5532f', '#7d3318', '#d98a5e', 23), mass: 'อังคาร' },
    { n: 'ดาวพฤหัสบดี', R: 3.4, a: 27, P: 11.86, tex: bands(['#c9a57f', '#e8d5b7', '#b07a52', '#e9dcc5', '#a8683f', '#dcc3a0', '#c28f63'], 31, .12), mass: 'พฤหัสบดี' },
    { n: 'ดาวเสาร์', R: 2.9, a: 35, P: 29.4, tex: bands(['#d9c28b', '#ecdcae', '#c6ad70', '#e8d8a8', '#d2b97e'], 32, .08), mass: 'เสาร์', ring: true },
    { n: 'ดาวยูเรนัส', R: 1.9, a: 42, P: 84, tex: bands(['#8fd3d6', '#a3e0e2', '#82c6cb'], 33, .04), mass: 'ยูเรนัส' },
    { n: 'ดาวเนปจูน', R: 1.85, a: 48.5, P: 164.8, tex: bands(['#3d63d6', '#4a74ea', '#3454bd', '#5a82f0'], 34, .08), mass: 'เนปจูน' },
  ];
  const SUNR = 4.2;

  const gSolar = new THREE.Group(); scene.add(gSolar);
  const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(SUNR, 48, 32), new THREE.MeshBasicMaterial({ map: sunTex }));
  gSolar.add(sunMesh);
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  sunGlow.scale.setScalar(SUNR * 5); gSolar.add(sunGlow);
  const planetMeshes = PL.map((p, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(p.R, 40, 28), new THREE.MeshStandardMaterial({ map: p.tex, roughness: .9, metalness: 0 }));
    p.mesh = m;
    if (p.ring) {
      const rg = new THREE.RingGeometry(p.R * 1.35, p.R * 2.3, 96, 1);
      const pa = rg.attributes.position, uv = rg.attributes.uv;
      for (let k = 0; k < pa.count; k++) { const rr = Math.hypot(pa.getX(k), pa.getY(k)); uv.setXY(k, (rr - p.R * 1.35) / (p.R * .95), 0.5); }
      const ring = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
      ring.rotation.x = Math.PI / 2 - 0.45; m.add(ring);
    }
    const orb = new THREE.Mesh(new THREE.RingGeometry(p.a - .05, p.a + .05, 200), new THREE.MeshBasicMaterial({ color: 0x6f86b8, transparent: true, opacity: .45, side: THREE.DoubleSide }));
    orb.rotation.x = -Math.PI / 2; p.orbit = orb;
    gSolar.add(m, orb); return m;
  });
  const ANG0 = [0.5, 2.2, 4.0, 5.3, 1.2, 3.3, 0.2, 2.6];
  const EARTH_SEC = 10; // time-lapse: 1 Earth year = 10 s
  function placePlanets(t) {
    PL.forEach((p, i) => {
      const ang = ANG0[i] + (t * 2 * Math.PI) / (EARTH_SEC * p.P);
      p.ang = ang; p.mesh.position.set(Math.cos(ang) * p.a, 0, Math.sin(ang) * p.a);
      p.mesh.rotation.y = t * .6;
    });
    sunMesh.rotation.y = t * .08;
  }

  // ---------- scene-specific objects ----------
  const gGrav = new THREE.Group(); scene.add(gGrav);
  const gm1 = new THREE.Mesh(new THREE.SphereGeometry(3, 40, 28), new THREE.MeshStandardMaterial({ map: earthTex, roughness: .8 }));
  const gm2 = new THREE.Mesh(new THREE.SphereGeometry(1.5, 40, 28), new THREE.MeshStandardMaterial({ map: PL[3].tex, roughness: .9 }));
  const arr1 = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 3, 0xffd34d, 1, .8);
  const arr2 = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(), 3, 0xffd34d, 1, .8);
  gGrav.add(gm1, gm2, arr1, arr2);

  const gNewt = new THREE.Group(); scene.add(gNewt);
  const bigEarth = new THREE.Mesh(new THREE.SphereGeometry(10, 64, 48), new THREE.MeshStandardMaterial({ map: earthTex, roughness: .8 }));
  const apple = new THREE.Group();
  apple.add(new THREE.Mesh(new THREE.SphereGeometry(.8, 24, 16), new THREE.MeshStandardMaterial({ color: 0xd8262b, roughness: .5 })));
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .45, 6), new THREE.MeshStandardMaterial({ color: 0x5b3a1a })); stem.position.y = .9; apple.add(stem);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(2.7, 32, 24), new THREE.MeshStandardMaterial({ map: blotchy('#a8a8a8', '#6f6f6f', '#d6d6d6', 55), roughness: 1 }));
  const moonArrow = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(), 8, 0xffd34d, 2, 1.2);
  const moonPath = new THREE.Mesh(new THREE.RingGeometry(59.7, 60.3, 200), new THREE.MeshBasicMaterial({ color: 0x8fa6d6, transparent: true, opacity: .4, side: THREE.DoubleSide }));
  gNewt.add(bigEarth, apple, moon, moonArrow, moonPath);

  // Newton's cannon: precomputed trajectories (leapfrog), pure data
  const gCannon = new THREE.Group(); scene.add(gCannon);
  const cannonEarth = new THREE.Mesh(new THREE.SphereGeometry(10, 64, 48), new THREE.MeshStandardMaterial({ map: earthTex, roughness: .8 }));
  gCannon.add(cannonEarth);
  const MU = 100 * 1.0, R0 = 13, VC = Math.sqrt(MU / R0);
  const SHOTS = [
    { f: 0.45, col: 0xff7a59, name: 'ช้า — ตกใกล้ตัว' },
    { f: 0.80, col: 0xffd34d, name: 'เร็วขึ้น — ไปตกไกลขึ้น' },
    { f: 1.00, col: 0x6fe3a1, name: 'เร็วพอ — ตกวนรอบโลก' },
  ];
  function simulate(f) {
    const pts = []; let x = 0, y = R0, vx = VC * f, vy = 0; const dt = 0.01;
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
    s.pts = simulate(s.f);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(s.pts.length * 3), 3));
    s.geo = g; s.line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: s.col, depthTest: false })); s.line.frustumCulled = false; s.line.renderOrder = 5;
    s.ball = new THREE.Mesh(new THREE.SphereGeometry(.28, 16, 12), new THREE.MeshBasicMaterial({ color: s.col, depthTest: false }));
    gCannon.add(s.line, s.ball);
  });
  const cannonBody = new THREE.Mesh(new THREE.BoxGeometry(1.4, .55, .6), new THREE.MeshStandardMaterial({ color: 0x33343a, roughness: .6 }));
  cannonBody.position.set(-.5, 13.25, 0); gCannon.add(cannonBody);
  const peak = new THREE.Mesh(new THREE.ConeGeometry(2.2, 4.4, 4), new THREE.MeshStandardMaterial({ color: 0x6b5a48, roughness: 1 }));
  peak.position.set(0, 11.0, 0); gCannon.add(peak);

  // Spacetime grid
  const gWarp = new THREE.Group(); scene.add(gWarp);
  const warpH = (x, z) => -9 / Math.sqrt(x * x + z * z + 3.2);
  (function () {
    const pts = [], N = 41, L = 22;
    for (let i = 0; i < N; i++) {
      const a = -L + (2 * L * i) / (N - 1);
      for (let j = 0; j < 160; j++) {
        const b0 = -L + (2 * L * j) / 160, b1 = -L + (2 * L * (j + 1)) / 160;
        pts.push(a, warpH(a, b0), b0, a, warpH(a, b1), b1);
        pts.push(b0, warpH(b0, a), a, b1, warpH(b1, a), a);
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
    gWarp.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x59b3ff, transparent: true, opacity: .75 })));
  })();
  const warpSun = new THREE.Mesh(new THREE.SphereGeometry(2.6, 40, 28), new THREE.MeshBasicMaterial({ map: sunTex }));
  warpSun.position.y = warpH(0, 0) + 1.2;
  const warpGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  warpGlow.scale.setScalar(13); warpGlow.position.copy(warpSun.position);
  const marble = new THREE.Mesh(new THREE.SphereGeometry(.8, 28, 20), new THREE.MeshStandardMaterial({ color: 0x9ad4ff, roughness: .2, metalness: .3 }));
  gWarp.add(warpSun, warpGlow, marble);

  // ---------- 2D overlay helpers ----------
  function txt(s, x, y, size, o = {}) {
    ctx.save();
    ctx.font = `${o.w || 700} ${size}px ${FONT}`; ctx.textAlign = o.al || 'center'; ctx.textBaseline = o.bl || 'alphabetic';
    ctx.globalAlpha = (o.a === undefined ? 1 : o.a);
    if (o.shadow !== false) { ctx.shadowColor = 'rgba(0,0,0,.85)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 2; }
    ctx.fillStyle = o.c || '#fff'; ctx.fillText(s, x, y); ctx.restore();
  }
  function panel(x, y, w, h, a = 1, col = 'rgba(8,14,32,.72)') {
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col; ctx.strokeStyle = 'rgba(140,180,255,.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 20); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  function project(v) {
    const p = v.clone().project(cam);
    return { x: (p.x * .5 + .5) * W, y: (-p.y * .5 + .5) * H, z: p.z };
  }
  const fade = (t, a, b, fi = .6, fo = .6) => Math.min(ease((t - a) / fi), ease((b - t) / fo));

  // subtitles: word-segment, wrap to lines, timed by char share
  const seg_th = (typeof Intl !== 'undefined' && Intl.Segmenter) ? new Intl.Segmenter('th', { granularity: 'word' }) : null;
  let subs = null;
  function buildSubs() {
    subs = [];
    ctx.font = `700 46px ${FONT}`;
    TL.segments.forEach((s) => {
      const words = seg_th ? [...seg_th.segment(s.text)].map((x) => x.segment) : s.text.split(/(?<= )/);
      const lines = []; let cur = '';
      for (const w of words) {
        const test = cur + w;
        if (ctx.measureText(test.trim()).width > 1500 && cur) { lines.push(cur.trim()); cur = w; } else cur = test;
      }
      if (cur.trim()) lines.push(cur.trim());
      const total = lines.reduce((a, l) => a + l.length, 0); let acc = 0;
      lines.forEach((l) => {
        const a = s.start + (acc / total) * (s.end - s.start); acc += l.length;
        const b = s.start + (acc / total) * (s.end - s.start);
        subs.push({ a, b, l });
      });
    });
  }
  function drawSub(t) {
    const s = subs.find((q) => t >= q.a && t < q.b + .05); if (!s) return;
    ctx.save(); ctx.font = `700 46px ${FONT}`; const w = ctx.measureText(s.l).width + 70;
    const k = Math.min(ease((t - s.a) / .15), 1);
    ctx.globalAlpha = k; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.roundRect(W / 2 - w / 2, H - 140, w, 84, 18); ctx.fill();
    ctx.restore();
    txt(s.l, W / 2, H - 82, 46, { a: k, shadow: false });
  }

  // ---------- per-scene camera & content ----------
  const hide = () => { gSolar.visible = gGrav.visible = gNewt.visible = gCannon.visible = gWarp.visible = false; };
  const look = (px, py, pz, tx, ty, tz) => { cam.position.set(px, py, pz); cam.lookAt(tx, ty, tz); };
  const sphericalCam = (d, az, el, tx = 0, ty = 0, tz = 0) =>
    look(tx + d * Math.cos(el) * Math.cos(az), ty + d * Math.sin(el), tz + d * Math.cos(el) * Math.sin(az), tx, ty, tz);

  const scenes = {
    intro(t, s, u) {
      gSolar.visible = true; placePlanets(t);
      sphericalCam(lerp(190, 82, ease(u)), lerp(.5, 1.5, u), lerp(.5, .38, u));
      sunGlow.scale.setScalar(SUNR * 5); sunLight.intensity = 3.2; amb.intensity = 1;
      return () => {
        const a = fade(t, s.start + 2, s.start + 14, 1.2, 1.5);
        txt('ระบบสุริยะ', W / 2, 380, 150, { a });
        txt('กับแรงที่ยึดทุกสิ่งในจักรวาลไว้ด้วยกัน', W / 2, 470, 58, { a, w: 400, c: '#cfe3ff' });
        const b = fade(t, when('intro', 'ตรงหน้า') - 0.5, when('intro', 'ตรงหน้า') + 5, .6, 1);
        txt('☀ ดวงอาทิตย์', W / 2, 190, 56, { a: b, c: '#ffd36b' });
      };
    },
    sun(t, s, u) {
      gSolar.visible = true; placePlanets(t);
      PL.forEach((p) => { p.mesh.visible = false; p.orbit.visible = false; });
      sphericalCam(lerp(30, 21, ease(u)), .9, .12, 0, 0, 0);
      sunLight.intensity = 0; amb.intensity = 1.2;
      sunGlow.scale.setScalar(SUNR * 4.3);
      return () => {
        txt('ดวงอาทิตย์', 380, 190, 96, { a: fade(t, s.start, s.end, .8, .8) });
        const k1 = fade(t, when('sun', '99') - .3, s.end + 3, .6, 1.2);
        panel(1070, 250, 760, 190, k1);
        txt('99.86%', 1450, 365, 118, { a: k1, c: '#ffd36b' });
        txt('ของมวลทั้งระบบสุริยะ', 1450, 415, 40, { a: k1, w: 400 });
        // mass bar
        const bx = 1110, bw = 680, by = 468;
        ctx.save(); ctx.globalAlpha = k1; ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(bx, by, bw, 18);
        ctx.fillStyle = '#ffb21f'; ctx.fillRect(bx, by, bw * .9986 * ease((t - when('sun', '99')) / 1.5), 18); ctx.restore();
        const t2 = when('sun', 'ล้าน') - 1;
        const k2 = fade(t, t2, s.end + 3, .6, 1.2);
        panel(1070, 530, 760, 300, k2);
        txt('จุโลกได้มากกว่า 1.3 ล้านใบ', 1450, 600, 44, { a: k2 });
        // dot grid: sun circle filled with tiny earths
        const cx = 1450, cy = 700, R = 90, n = Math.floor(2400 * ease((t - t2) / 3)), r = rng(5);
        ctx.save(); ctx.globalAlpha = k2; ctx.strokeStyle = '#ffb21f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, R + 6, 0, 7); ctx.stroke();
        ctx.fillStyle = '#58a6ff';
        for (let i = 0; i < n; i++) { const a = r() * 6.2832, d = Math.sqrt(r()) * R; ctx.fillRect(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 2.5, 2.5); }
        ctx.restore();
        txt('จุดฟ้าแต่ละจุด = โลกหนึ่งใบ (เพื่อให้เห็นภาพ)', 1450, 815, 26, { a: k2 * .8, w: 400, c: '#bcd2f5' });
      };
    },
    planets(t, s, u) {
      gSolar.visible = true; placePlanets(t);
      sphericalCam(lerp(120, 100, u), lerp(1.25, 1.55, u), .55);
      sunLight.intensity = 3.2; amb.intensity = 1.1;
      return () => {
        PL.forEach((p) => {
          const tm = when('planets', p.mass);
          const k = ease((t - tm + .1) / .6); if (k <= 0) return;
          const v = p.mesh.position.clone(); v.y += p.R + 1.4; const q = project(v);
          txt(p.n, q.x, q.y, 36, { a: k * fade(t, s.start, s.end + 3, .1, 1) });
        });
        txt('ดาวเคราะห์ 8 ดวง', W / 2, 110, 70, { a: fade(t, s.start + .5, s.end, .8, .8) });
        txt('ภาพจำลอง — ขนาดและระยะไม่ได้สัดส่วนจริง · 1 ปีของโลก = 10 วินาที', W / 2, 160, 28, { a: .85 * fade(t, s.start + 1, s.end, .8, .8), w: 400, c: '#bcd2f5' });
      };
    },
    scale(t, s, u) {
      gSolar.visible = true; placePlanets(t);
      sphericalCam(125, 1.57, 1.2); // almost top-down
      sunLight.intensity = 3.2; amb.intensity = 1.1;
      const t0 = s.start + 1.5, t1 = s.end - 1.2;
      const pr = ease(prog(t, t0, t1)), maxR = 52, rad = pr * maxR;
      return () => {
        // expanding light ring in screen space (top-down so approximately circular)
        const c = project(new THREE.Vector3(0, 0, 0)), e = project(new THREE.Vector3(rad, 0, 0));
        const rp = Math.hypot(e.x - c.x, e.y - c.y);
        ctx.save(); ctx.strokeStyle = 'rgba(255,230,140,.9)'; ctx.lineWidth = 5; ctx.shadowColor = '#ffd36b'; ctx.shadowBlur = 24;
        ctx.beginPath(); ctx.arc(c.x, c.y, rp, 0, 7); ctx.stroke(); ctx.restore();
        const items = [['โลก', 2, '8 นาที 20 วินาที'], ['ดาวพฤหัสบดี', 4, '≈ 43 นาที'], ['ดาวเสาร์', 5, '≈ 1 ชม. 20 นาที'], ['ดาวยูเรนัส', 6, '≈ 2 ชม. 40 นาที'], ['ดาวเนปจูน', 7, '≈ 4 ชม. 10 นาที']];
        items.forEach(([n, i, lab], k) => {
          const p = PL[i]; if (rad < p.a) return;
          const w = ease((rad - p.a) / 2.5);
          const v = p.mesh.position.clone(); const q = project(v);
          ctx.save(); ctx.globalAlpha = w; ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(q.x, q.y, 22, 0, 7); ctx.stroke(); ctx.restore();
        });
        // legend list at left
        panel(60, 200, 600, 400, fade(t, s.start + 1, s.end + 2, .8, 1.2));
        txt('แสงจากดวงอาทิตย์เดินทางไปถึง…', 360, 255, 32, { a: fade(t, s.start + 1, s.end + 2, .8, 1.2), w: 400, c: '#cfe3ff' });
        items.forEach(([n, i, lab], k) => {
          const p = PL[i], w = ease((rad - p.a) / 2.5);
          txt(n, 90, 320 + k * 58, 36, { a: w, al: 'left' });
          txt(lab, 630, 320 + k * 58, 36, { a: w, al: 'right', c: '#ffd36b' });
        });
        txt('ภาพประกอบ — ระยะทางจริงห่างกันมากกว่านี้', W / 2, 1000 - 110, 26, { a: .8 * fade(t, s.start + 1, s.end, .8, .8), w: 400, c: '#bcd2f5' });
      };
    },
    giants(t, s, u) {
      gSolar.visible = true; PL.forEach((p) => { p.orbit.visible = false; });
      sunMesh.visible = false; sunGlow.visible = false;
      const J = PL[4].mesh, S = PL[5].mesh, E = PL[2].mesh;
      J.position.set(-12, 0, 0); S.position.set(14, 0, 0); E.position.set(-2.2, -3.1, 6);
      J.rotation.y = t * .25; S.rotation.y = t * .25; S.rotation.z = .1;
      PL.forEach((p, i) => { p.mesh.visible = (i === 4 || i === 5 || i === 2); });
      look(lerp(0, 3, u), 3, lerp(40, 33, ease(u)), 0, 0, 0);
      sunLight.intensity = 0; amb.intensity = 1.0; key.intensity = 2.2;
      return () => {
        txt('ดาวพฤหัสบดี', ...(() => { const q = project(new THREE.Vector3(-12, 5.2, 0)); return [q.x, q.y]; })(), 42, { a: fade(t, s.start + .5, s.end, .6, .8) });
        const eq = project(new THREE.Vector3(-2.2, -4.8, 6));
        txt('โลก', eq.x, eq.y, 30, { a: fade(t, s.start + 1.5, s.end, .6, .8) });
        txt('ดาวเสาร์', ...(() => { const q = project(new THREE.Vector3(14, 6.2, 0)); return [q.x, q.y]; })(), 42, { a: fade(t, s.start + 6, s.end, .6, .8) });
        const k = fade(t, when('giants', 'มวล') - .5, s.end + 2, .6, 1);
        panel(90, 120, 700, 210, k);
        txt('มวลดาวพฤหัสบดี ≈ 318 เท่าของโลก', 440, 195, 38, { a: k });
        txt('มากกว่า 2 เท่า', 440, 280, 64, { a: k, c: '#ffd36b' });
        txt('ของดาวเคราะห์ดวงอื่นรวมกันทั้งหมด', 440, 318, 28, { a: k, w: 400, c: '#cfe3ff' });
      };
    },
    gravity(t, s, u) {
      gGrav.visible = true; amb.intensity = 1.2; sunLight.intensity = 0; key.intensity = 2;
      const r = 12 + 6 * Math.sin(u * 6.2832 * 1.5 - 1.2);
      gm1.position.set(-r * .35, 0, 0); gm2.position.set(r * .65, 0, 0);
      gm1.rotation.y = t * .3; gm2.rotation.y = t * .4;
      const F = 140 / (r * r) * 4; // visual length ∝ 1/r²
      arr1.position.set(gm1.position.x + 3, 0, 0); arr1.setLength(F, Math.min(1.4, F * .4), Math.min(.9, F * .25));
      arr2.position.set(gm2.position.x - 1.5, 0, 0); arr2.setLength(F, Math.min(1.4, F * .4), Math.min(.9, F * .25));
      look(0, 6, 34, 0, 0, 0);
      return () => {
        const k = fade(t, s.start + .5, s.end + 1, .8, 1);
        panel(W / 2 - 360, 90, 720, 170, k);
        txt('F = G · m₁ · m₂ / r²', W / 2, 190, 76, { a: k });
        txt('ยิ่งมวลมาก แรงยิ่งมาก · ยิ่งไกล แรงยิ่งลดลงเร็ว', W / 2, 240, 30, { a: k, w: 400, c: '#cfe3ff' });
        const a = project(new THREE.Vector3(gm1.position.x, 5, 0)), b = project(new THREE.Vector3(gm2.position.x, 3.2, 0));
        txt('มวล m₁', a.x, a.y, 34, { a: k }); txt('มวล m₂', b.x, b.y, 34, { a: k });
        const l = project(new THREE.Vector3(0, -4.6, 0));
        txt(`ระยะห่าง r`, l.x, l.y, 32, { a: k, c: '#ffd36b' });
      };
    },
    newton(t, s, u) {
      gNewt.visible = true; amb.intensity = 1.2; sunLight.intensity = 0; key.intensity = 2.2;
      bigEarth.position.set(0, -10, 0); bigEarth.rotation.y = t * .05;
      const split = .38;
      // apple fall
      const fa = prog(u, .04, split);
      apple.position.set(0, lerp(14, 0.4, fa * fa), 4);
      apple.visible = u < split + .12; apple.rotation.z = fa * 1.2;
      const pull = ease(prog(u, split, split + .35));
      // camera pulls out to show the Moon
      const d = lerp(30, 125, pull);
      look(0, lerp(3, 10, pull), d, 0, lerp(2, -10, pull), 0);
      moon.visible = moonPath.visible = moonArrow.visible = u > split;
      const mAng = 0.25 + (u - split) * 2.4;
      moonPath.rotation.x = -Math.PI / 2 + 0; moonPath.position.set(0, -10, 0); moonPath.rotation.set(0, 0, 0);
      moon.position.set(Math.cos(mAng) * 60, -10 + Math.sin(mAng) * 60, 0);
      const dir = new THREE.Vector3(0, -10, 0).sub(moon.position).normalize();
      moonArrow.position.copy(moon.position); moonArrow.setDirection(dir);
      const mk = ease(prog(u, split + .2, split + .3));
      moonArrow.setLength(Math.max(.01, 9 * mk), 2.4, 1.4);
      return () => {
        const k = fade(t, s.start + .3, s.end, .6, .8);
        txt('เซอร์ไอแซก นิวตัน', 430, 140, 62, { a: k });
        txt('เมื่อกว่า 300 ปีที่แล้ว', 430, 190, 34, { a: k, w: 400, c: '#cfe3ff' });
        if (u < split + .1) txt('ทำไมแอปเปิลจึงตกลงสู่พื้น?', W / 2, 300, 54, { a: k * (1 - ease(prog(u, split, split + .1))), c: '#ffe27a' });
        const km = ease(prog(u, split + .3, split + .4)) * fade(t, s.start, s.end + 1.5, .1, 1);
        if (km > 0) {
          panel(W / 2 - 520, 130, 1040, 150, km * .9);
          txt('แรงเดียวกันที่ดึงแอปเปิล ก็ดึงดวงจันทร์ด้วย', W / 2, 225, 52, { a: km });
        }
      };
    },
    orbit(t, s, u) {
      gCannon.visible = true; amb.intensity = 1.3; sunLight.intensity = 0; key.intensity = 2.2;
      cannonEarth.position.set(0, 0, 0);
      look(0, 4, 70, 0, 0, 0);
      const t0 = s.start + .6, per = (s.end - s.start - 2) / 3;
      const info = [];
      SHOTS.forEach((sh, i) => {
        const a = t0 + i * per, run = clamp((t - a) / (per * .95)); // 0..1 over this shot
        const n = sh.pts.length, last = Math.floor(run * (n - 1));
        const pos = sh.geo.attributes.position.array;
        for (let k = 0; k < n; k++) { const q = sh.pts[Math.min(k, last)]; pos[k * 3] = q[0]; pos[k * 3 + 1] = q[1]; pos[k * 3 + 2] = 0; }
        sh.geo.attributes.position.needsUpdate = true; sh.geo.setDrawRange(0, last + 1);
        const q = sh.pts[Math.min(last, n - 1)];
        sh.ball.position.set(q[0], q[1], 0); sh.ball.visible = t >= a;
        sh.line.visible = t >= a;
        // fade older shots slightly once next starts
        sh.line.material.transparent = true; sh.line.material.opacity = (i < 2 && t > a + per) ? .45 : 1;
        info.push(a);
      });
      return () => {
        const k = fade(t, s.start + .3, s.end + 3, .6, 1.2);
        txt('ปืนใหญ่ของนิวตัน', 400, 130, 60, { a: k });
        SHOTS.forEach((sh, i) => {
          const a = info[i]; if (t < a) return;
          const w = fade(t, a, a + per, .4, .4);
          txt(sh.name, W / 2, 800, 44, { a: w, c: '#' + sh.col.toString(16).padStart(6, '0') });
        });
        const kk = ease((t - (s.end - 4.2)) / .8) * fade(t, s.start, s.end + 3, .1, 1.2);
        if (kk > 0) { panel(W / 2 - 560, 680, 1120, 100, kk * .9); txt('การโคจร = การตกไม่สิ้นสุด', W / 2, 752, 62, { a: kk, c: '#6fe3a1' }); }
      };
    },
    speed(t, s, u) {
      gSolar.visible = true; placePlanets(t);
      sphericalCam(115, 1.57 + (t * .02), .7); sunLight.intensity = 3.2; amb.intensity = .8;
      const data = [['ดาวพุธ', 47.4, 0], ['ดาวศุกร์', 35.0, 1], ['โลก', 29.8, 2], ['ดาวอังคาร', 24.1, 3], ['ดาวพฤหัสบดี', 13.1, 4], ['ดาวเสาร์', 9.7, 5], ['ดาวยูเรนัส', 6.8, 6], ['ดาวเนปจูน', 5.4, 7]];
      return () => {
        const k = fade(t, s.start + .3, s.end + 2, .8, 1.2);
        panel(960, 120, 900, 700, k * .95);
        txt('ความเร็วโคจรรอบดวงอาทิตย์ (กม./วินาที)', 1410, 180, 36, { a: k });
        data.forEach(([n, v, i], j) => {
          const g = ease((t - s.start - 1 - j * .5) / 1.2) * k; if (g <= 0) return;
          const y = 225 + j * 74, wmax = 520;
          txt(n, 990, y + 38, 30, { a: g, al: 'left', w: 400 });
          const x0 = 1220;
          ctx.save(); ctx.globalAlpha = g; const gr = ctx.createLinearGradient(x0, 0, x0 + wmax, 0); gr.addColorStop(0, '#4a74ea'); gr.addColorStop(1, '#ffd36b');
          ctx.fillStyle = gr; ctx.beginPath(); ctx.roundRect(x0, y + 8, wmax * v / 47.4 * g, 40, 10); ctx.fill(); ctx.restore();
          txt(v.toFixed(1), x0 + wmax * v / 47.4 * g + 12, y + 40, 30, { a: g, al: 'left', c: '#ffd36b' });
        });
        txt('ยิ่งใกล้ดวงอาทิตย์ แรงดึงยิ่งแรง จึงต้องโคจรเร็วขึ้น', 1410, 860, 28, { a: k, w: 400, c: '#cfe3ff' });
      };
    },
    einstein(t, s, u) {
      gWarp.visible = true; amb.intensity = 1.2; sunLight.intensity = 0;
      const ang = t * 1.3, rr = lerp(15, 7.5, ease(u));
      const x = Math.cos(ang) * rr, z = Math.sin(ang) * rr;
      marble.position.set(x, warpH(x, z) + .8, z);
      sphericalCam(lerp(46, 38, u), t * .06 + .5, .5, 0, -4, 0);
      return () => {
        const k = fade(t, s.start + .4, s.end + 2, .8, 1.2);
        txt('อัลเบิร์ต ไอน์สไตน์', 430, 140, 58, { a: k });
        txt('มวลทำให้ “กาลอวกาศ” โค้งงอ', 430, 192, 36, { a: k, w: 400, c: '#cfe3ff' });
        txt('ภาพเปรียบเทียบ: ผ้ายางที่ถูกลูกโบว์ลิ่งกดให้บุ๋มลง', W / 2, 1010 - 110, 28, { a: .85 * k, w: 400, c: '#bcd2f5' });
      };
    },
    outro(t, s, u) {
      gSolar.visible = true; placePlanets(t);
      sphericalCam(lerp(70, 260, ease(u)), 1.5 + u * .4, lerp(.45, .75, u));
      sunLight.intensity = 3.2; amb.intensity = 1;
      return () => {
        const k = fade(t, s.start + .5, TL.duration, 1, 1);
        txt('ทุกสิ่งในจักรวาล', W / 2, 200, 84, { a: fade(t, s.start + .5, s.end - 3, 1, 1) });
        txt('เกี่ยวพันกันด้วยแรงโน้มถ่วง', W / 2, 295, 70, { a: fade(t, s.start + 2, s.end - 3, 1, 1), c: '#ffd36b' });
        txt('ขอบคุณที่รับชมครับ', W / 2, 250, 110, { a: ease((t - (s.end - 3.5)) / 1.2) * ease((TL.duration - 1 - t) / 1.2) });
      };
    },
  };

  // scene time spans
  const SPAN = ORDER.map((k, i) => ({
    k, a: i === 0 ? 0 : SEG[k].start - .9,
    b: i === ORDER.length - 1 ? TL.duration + 1 : SEG[ORDER[i + 1]].start - .9,
  }));
  const FN = { intro: 'intro', sun: 'sun', planets: 'planets', scale: 'scale', giants: 'giants', gravity: 'gravity', newton: 'newton', orbit: 'orbit', speed: 'speed', einstein: 'einstein', outro: 'outro' };

  function frame(t) {
    if (!subs) buildSubs();
    let sp = SPAN[SPAN.length - 1];
    for (const q of SPAN) if (t >= q.a && t < q.b) { sp = q; break; }
    hide();
    gSolar.children.forEach((c) => (c.visible = true));
    sunMesh.visible = sunGlow.visible = true; key.intensity = 1.6;
    const s = SEG[sp.k], u = clamp((t - s.start) / (s.end - s.start));
    const uu = t < s.start ? 0 : u;
    const overlay = scenes[FN[sp.k]](t, s, uu);
    renderer.render(scene, cam);
    ctx.clearRect(0, 0, W, H); ctx.drawImage(glc, 0, 0);
    // subtle vignette
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, H * .95);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    overlay();
    drawSub(t);
    // dip to black between scenes + opening / ending
    let d = 0;
    if (t < .8) d = Math.max(d, 1 - t / .8);
    const dt = Math.min(Math.abs(t - sp.a), Math.abs(t - sp.b));
    if (sp.a > 0 && t - sp.a < .45) d = Math.max(d, 1 - (t - sp.a) / .45);
    if (sp.b - t < .45 && sp.k !== 'outro') d = Math.max(d, 1 - (sp.b - t) / .45);
    if (t > TL.duration - 1.5) d = Math.max(d, (t - (TL.duration - 1.5)) / 1.5);
    if (d > 0) { ctx.fillStyle = `rgba(0,0,0,${clamp(d)})`; ctx.fillRect(0, 0, W, H); }
  }

  window.frame = frame;
  window.grabPNG = (t) => { frame(t); return out.toDataURL('image/png').split(',')[1]; };
  Promise.all([
    document.fonts.load("700 46px NST", 'กขคabc'), document.fonts.load("400 30px NST", 'กขคabc'),
  ]).then(() => document.fonts.ready).then(() => { frame(0); window.READY = true; });
})();
