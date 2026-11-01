"""Blender half of the three.js → Blender bridge: rebuild one exported shot (tools/blender/export_shot.mjs) and path-trace it.

usage: python3 tools/blender/render_shot.py <shotDir> <outDir> [--frames 0,12] [--samples 32] [--scale 100] [--look hall]

The world is rebuilt from world.json + geo/ tex/ inst/ bins (Y-up → Z-up: vertices (x,y,z)→(x,-z,y), local matrices C·L·C⁻¹),
materials are rebuilt from their three.js parameters with the film's units kept (three's lights → Blender: sun = I,
point = 4πI; hemisphere → world gradient I/π; RoomEnvironment → flat ambient). Things three does in its renderer are
reproduced in the shaders: back-face culling (camera rays only), inverted-hull ink outlines (camera-only, back faces),
the aerial haze of the film's CoC pass (camera rays: mix toward the haze colour by view depth), the physical DOF (thin
lens from the film's aperture in pixels). Everything else changes per frame imperatively: moved local matrices,
visibility, camera, character canvases (image swap), sprites (camera-facing cards), lights.
Output: <outDir>/fNNNN.exr — linear, ungraded; tools/blender/composite.py blooms, grades, transitions and captions.
"""
import sys, os, json, math, argparse
import numpy as np
import bpy
from mathutils import Matrix, Vector

ap = argparse.ArgumentParser(); ap.add_argument('shot'); ap.add_argument('out'); ap.add_argument('--frames', default='')
ap.add_argument('--samples', type=int, default=32); ap.add_argument('--scale', type=int, default=100); ap.add_argument('--look', default='auto')
ap.add_argument('--nocull', action='store_true'); ap.add_argument('--blend', default=''); ap.add_argument('--bounces', type=int, default=2); ap.add_argument('--adaptive', type=float, default=0.03); ap.add_argument('--png', action='store_true', help='also write a quick graded PNG next to each EXR')
A = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
D = A.shot; SH = json.load(open(os.path.join(D, 'shot.json'))); WJ = json.load(open(os.path.join(D, 'world.json'))); os.makedirs(A.out, exist_ok=True)
C = Matrix.Rotation(math.radians(90), 4, 'X'); Ci = C.inverted()
def M3(m): return Matrix([[m[0], m[4], m[8], m[12]], [m[1], m[5], m[9], m[13]], [m[2], m[6], m[10], m[14]], [m[3], m[7], m[11], m[15]]])
def LM(m): return C @ M3(m) @ Ci
def P(v): return C @ Vector(v)

# per-world multipliers on top of the physically matched conversion (1 = the three.js film's own light levels)
LOOKS = {
  'three': dict(sun=1.0, point=1.0, hemi=1.0, env=1.0, ao=0.7, tint=(1, 1, 1), dof=1.0),   # the three.js film's own levels
  'hall': dict(sun=0.5, point=2.2, hemi=0.6, env=0.6, ao=1.2, tint=(0.88, 0.82, 1.0), dof=3.0),   # reference: muted lavender stone, firelit subjects, soft background
  'city': dict(sun=1.0, point=1.0, hemi=1.0, env=1.0, ao=1.2, tint=(1, 1, 1), dof=1.0),
}
L = LOOKS.get(A.look, LOOKS['hall'])

# ---------------- ambient (three's env + hemisphere fill, which ignores walls) as an ambient cube ----------------
# three lights its sets with an image (RoomEnvironment, pbr.js) and a hemisphere light, neither of which is occluded by the
# hall's walls and roof — only darkened by its screen-space AO. A Cycles world would be shut out by the architecture, so the
# fill goes into the shaders instead: albedo × ambient cube(normal) × AO node (+ metals: base × cube(reflection)), and the
# world is black for everything but camera rays. Cycles then adds what three cannot: soft shadows, bounce light, contact AO.
ENVP = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cache', 'room_env.exr')
if not os.path.exists(ENVP):
    import subprocess; os.makedirs(os.path.dirname(ENVP), exist_ok=True); subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'bake_room.py'), ENVP], check=True)
def env_cubes():
    import OpenEXR
    with OpenEXR.File(ENVP) as f: ch = f.channels(); E = np.asarray(ch['RGB'].pixels if 'RGB' in ch else np.stack([ch[k].pixels for k in 'RGB'], -1), np.float32)
    E = E[::4, ::4]; H, W = E.shape[:2]; v = 1 - (np.arange(H) + 0.5) / H; u = (np.arange(W) + 0.5) / W
    th = ((v - 0.5) * math.pi)[:, None]; ph = ((u - 0.5) * 2 * math.pi)[None, :]
    dirs = np.stack([-np.cos(ph) * np.cos(th), np.sin(ph) * np.cos(th), np.sin(th) * np.ones_like(ph)], -1); dO = (2 * math.pi / W) * (math.pi / H) * np.cos(th)
    axes = [(1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)]; D, S = [], []
    for a in axes:
        c = np.maximum(0, dirs @ np.array(a, np.float32)); D.append((E * (c * dO)[..., None]).sum((0, 1)) / math.pi)
        w8 = c ** 8 * dO; S.append((E * w8[..., None]).sum((0, 1)) / w8.sum())
    return axes, np.array(D), np.array(S)
AX, ENV_D, ENV_S = env_cubes()
hs = SH['hemi'][0] if SH['hemi'] else {'sky': [0, 0, 0], 'ground': [0, 0, 0], 'i': 0}
EK = SH.get('envIntensity', 0) * L['env']
if A.look == 'auto': A.look = SH.get('look', 'three')
LOOKS.update(json.loads(os.environ.get('LOOKS_JSON', '{}'))); L = {**LOOKS['three'], **LOOKS.get(A.look, {})}   # LOOKS_JSON env: look-dev overrides
EK = SH.get('envIntensity', 0) * L['env']
AMB_D = [np.array(L['tint']) * (ENV_D[i] * EK + np.array([g + (s_ - g) * (a[2] * 0.5 + 0.5) for g, s_ in zip(hs['ground'], hs['sky'])]) * hs['i'] / math.pi * L['hemi']) for i, a in enumerate(AX)]
AMB_S = list(ENV_S)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

# ---------------- shared node groups ----------------
def ng_haze():   # Shader, Alpha → Shader: camera rays only, mix toward the haze colour by view depth (engine.js cocM)
    g = bpy.data.node_groups.new('HAZE', 'ShaderNodeTree')
    g.interface.new_socket('Shader', in_out='INPUT', socket_type='NodeSocketShader'); s = g.interface.new_socket('Alpha', in_out='INPUT', socket_type='NodeSocketFloat'); s.default_value = 1
    g.interface.new_socket('Shader', in_out='OUTPUT', socket_type='NodeSocketShader')
    N = g.nodes; Lk = g.links.new; gi = N.new('NodeGroupInput'); go = N.new('NodeGroupOutput')
    tc = N.new('ShaderNodeTexCoord'); sx = N.new('ShaderNodeSeparateXYZ'); Lk(tc.outputs['Camera'], sx.inputs[0])
    def math_(op, a, b=None, name=None):
        n = N.new('ShaderNodeMath'); n.operation = op
        if name: n.name = name
        for i, v in enumerate((a, b)):
            if v is None: continue
            if isinstance(v, (int, float)): n.inputs[i].default_value = v
            else: Lk(v, n.inputs[i])
        return n.outputs[0]
    def val(name, v):
        n = N.new('ShaderNodeValue'); n.name = name; n.outputs[0].default_value = v; return n.outputs[0]
    z = math_('ABSOLUTE', sx.outputs['Z']); d = math_('MAXIMUM', math_('SUBTRACT', z, val('start', 5)), 0.0)
    e = math_('EXPONENT', math_('MULTIPLY', math_('MULTIPLY', d, val('den', 0)), -1.0)); h = math_('MULTIPLY', math_('SUBTRACT', 1.0, e), val('max', 0))
    lp = N.new('ShaderNodeLightPath'); h = math_('MULTIPLY', math_('MULTIPLY', h, lp.outputs['Is Camera Ray']), gi.outputs['Alpha'])
    em = N.new('ShaderNodeEmission'); rgb = N.new('ShaderNodeRGB'); rgb.name = 'col'; Lk(rgb.outputs[0], em.inputs['Color'])
    mx = N.new('ShaderNodeMixShader'); Lk(h, mx.inputs[0]); Lk(gi.outputs['Shader'], mx.inputs[1]); Lk(em.outputs[0], mx.inputs[2]); Lk(mx.outputs[0], go.inputs[0])
    return g
HAZE = ng_haze()
def ng_amb():   # Color, Metallic, SpecK, Normal → Color: albedo·(1−m)·cubeD(n) + albedo·m·k·cubeS(r), times AO
    g = bpy.data.node_groups.new('AMB', 'ShaderNodeTree'); I = g.interface
    for nm_, t, dv in (('Color', 'NodeSocketColor', (1, 1, 1, 1)), ('Metallic', 'NodeSocketFloat', 0.0), ('SpecK', 'NodeSocketFloat', 1.0), ('Normal', 'NodeSocketVector', None)):
        s_ = I.new_socket(nm_, in_out='INPUT', socket_type=t)
        if dv is not None: s_.default_value = dv
    I.new_socket('Color', in_out='OUTPUT', socket_type='NodeSocketColor')
    N = g.nodes; Lk = g.links.new; gi = N.new('NodeGroupInput'); go = N.new('NodeGroupOutput')
    geo = N.new('ShaderNodeNewGeometry')
    # normal: the group's Normal input if linked (normal maps), else the shading normal
    nrm = geo.outputs['Normal']
    def cube(vec, cols):
        sx = N.new('ShaderNodeSeparateXYZ'); Lk(vec, sx.inputs[0]); acc = None
        for i, k in enumerate('XYZ'):
            c = sx.outputs[k]; w_ = N.new('ShaderNodeMath'); w_.operation = 'MULTIPLY'; Lk(c, w_.inputs[0]); Lk(c, w_.inputs[1])
            gt = N.new('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; Lk(c, gt.inputs[0]); gt.inputs[1].default_value = 0
            mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; Lk(gt.outputs[0], mx.inputs['Factor']); mx.inputs[6].default_value = (*cols[2 * i + 1], 1); mx.inputs[7].default_value = (*cols[2 * i], 1)
            sc_ = N.new('ShaderNodeVectorMath'); sc_.operation = 'SCALE'; Lk(mx.outputs[2], sc_.inputs[0]); Lk(w_.outputs[0], sc_.inputs['Scale'])
            if acc is None: acc = sc_.outputs[0]
            else: ad_ = N.new('ShaderNodeVectorMath'); ad_.operation = 'ADD'; Lk(acc, ad_.inputs[0]); Lk(sc_.outputs[0], ad_.inputs[1]); acc = ad_.outputs[0]
        return acc
    d = cube(nrm, [tuple(map(float, c)) for c in AMB_D])
    # reflection r = 2(n·I)n − I   (I = Incoming, towards the viewer)
    dt = N.new('ShaderNodeVectorMath'); dt.operation = 'DOT_PRODUCT'; Lk(nrm, dt.inputs[0]); Lk(geo.outputs['Incoming'], dt.inputs[1])
    m2 = N.new('ShaderNodeMath'); m2.operation = 'MULTIPLY'; Lk(dt.outputs['Value'], m2.inputs[0]); m2.inputs[1].default_value = 2
    sn = N.new('ShaderNodeVectorMath'); sn.operation = 'SCALE'; Lk(nrm, sn.inputs[0]); Lk(m2.outputs[0], sn.inputs['Scale'])
    rr = N.new('ShaderNodeVectorMath'); rr.operation = 'SUBTRACT'; Lk(sn.outputs[0], rr.inputs[0]); Lk(geo.outputs['Incoming'], rr.inputs[1])
    sp = cube(rr.outputs[0], [tuple(map(float, c)) for c in AMB_S])
    om = N.new('ShaderNodeMath'); om.operation = 'SUBTRACT'; om.inputs[0].default_value = 1; Lk(gi.outputs['Metallic'], om.inputs[1])
    dk = N.new('ShaderNodeVectorMath'); dk.operation = 'SCALE'; Lk(d, dk.inputs[0]); Lk(om.outputs[0], dk.inputs['Scale'])
    mk = N.new('ShaderNodeMath'); mk.operation = 'MULTIPLY'; Lk(gi.outputs['Metallic'], mk.inputs[0]); Lk(gi.outputs['SpecK'], mk.inputs[1])
    sk = N.new('ShaderNodeVectorMath'); sk.operation = 'SCALE'; Lk(sp, sk.inputs[0]); Lk(mk.outputs[0], sk.inputs['Scale'])
    tot = N.new('ShaderNodeVectorMath'); tot.operation = 'ADD'; Lk(dk.outputs[0], tot.inputs[0]); Lk(sk.outputs[0], tot.inputs[1])
    alb = N.new('ShaderNodeVectorMath'); alb.operation = 'MULTIPLY'; Lk(tot.outputs[0], alb.inputs[0]); Lk(gi.outputs['Color'], alb.inputs[1])
    ao = N.new('ShaderNodeAmbientOcclusion'); ao.samples = 2; ao.inputs['Distance'].default_value = L['ao']
    # not on diffuse bounce rays: Cycles' own bounce light would otherwise re-add the fill (three's fill is not bounced either)
    lp = N.new('ShaderNodeLightPath'); mxr = N.new('ShaderNodeMath'); mxr.operation = 'MAXIMUM'; Lk(lp.outputs['Is Camera Ray'], mxr.inputs[0]); Lk(lp.outputs['Is Glossy Ray'], mxr.inputs[1])
    aok = N.new('ShaderNodeMath'); aok.operation = 'MULTIPLY'; Lk(ao.outputs['AO'], aok.inputs[0]); Lk(mxr.outputs[0], aok.inputs[1])
    fin = N.new('ShaderNodeVectorMath'); fin.operation = 'SCALE'; Lk(alb.outputs[0], fin.inputs[0]); Lk(aok.outputs[0], fin.inputs['Scale'])
    Lk(fin.outputs[0], go.inputs[0]); return g
AMB = ng_amb()
def set_haze(hz):
    n = HAZE.nodes; hz = hz or {}
    n['den'].outputs[0].default_value = hz.get('den', 0) or 0; n['start'].outputs[0].default_value = hz.get('start', 2); n['max'].outputs[0].default_value = hz.get('max', 0.6)
    c = hz.get('col') or [1, 0.9, 0.8]; n['col'].outputs[0].default_value = (*c, 1)

# ---------------- images ----------------
IMG = {}
def image(uid):
    if uid in IMG: return IMG[uid]
    p = os.path.join(D, 'tex', f'{uid}.png'); t = WJ['texs'].get(uid, {})
    if not os.path.exists(p) or t.get('bad'): IMG[uid] = None; return None
    im = bpy.data.images.load(p); im.colorspace_settings.name = 'sRGB' if t.get('srgb') else 'Non-Color'; im.alpha_mode = 'STRAIGHT'; IMG[uid] = im; return im

# ---------------- materials ----------------
def new_mat(name):
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    m.cycles.emission_sampling = 'NONE'   # the ambient term is emission on every surface: never treat the set as a light source
    nt = m.node_tree
    for x in list(nt.nodes): nt.nodes.remove(x)
    return m, nt.nodes, nt.links.new
def tex_node(N, Lk, uid, uvn):
    im = image(uid)
    if not im: return None
    t = WJ['texs'][uid]; tx = N.new('ShaderNodeTexImage'); tx.image = im; tx.interpolation = 'Cubic' if 'flat' in im.name else 'Linear'; tx.extension = 'REPEAT' if t.get('wrap') else 'EXTEND'
    if t.get('repeat', [1, 1]) != [1, 1] or t.get('offset', [0, 0]) != [0, 0] or t.get('rot'):
        mp = N.new('ShaderNodeMapping'); mp.inputs['Location'].default_value = (*t['offset'], 0); mp.inputs['Scale'].default_value = (*t['repeat'], 1); mp.inputs['Rotation'].default_value = (0, 0, t.get('rot') or 0)
        Lk(uvn.outputs['UV'], mp.inputs[0]); Lk(mp.outputs[0], tx.inputs[0])
    else: Lk(uvn.outputs['UV'], tx.inputs[0])
    return tx
def mul_col(N, Lk, a, b):   # a, b: sockets or None → product socket
    if a is None: return b
    if b is None: return a
    n = N.new('ShaderNodeMix'); n.data_type = 'RGBA'; n.blend_type = 'MULTIPLY'; n.inputs['Factor'].default_value = 1
    Lk(a, n.inputs[6]); Lk(b, n.inputs[7]); return n.outputs[2]
def mul_f(N, Lk, a, b):
    if a is None: return b
    if b is None: return a
    n = N.new('ShaderNodeMath'); n.operation = 'MULTIPLY'
    for i, v in enumerate((a, b)):
        if isinstance(v, (int, float)): n.inputs[i].default_value = v
        else: Lk(v, n.inputs[i])
    return n.outputs[0]
def const_rgb(N, k):
    n = N.new('ShaderNodeRGB'); n.outputs[0].default_value = (k, k, k, 1); return n.outputs[0]
MATS = {}; INK = set(); MAPNODE = {}
def build_mat(uid, flat=False):
    key = uid + ('#flat' if flat else '')
    if key in MATS: return MATS[key]
    p = WJ['mats'][uid]; m, N, Lk = new_mat(('flat_' if flat else '') + uid[:8]); out = N.new('ShaderNodeOutputMaterial')
    basic = p['type'] in ('MeshBasicMaterial', 'SpriteMaterial')
    if basic and p['side'] == 1 and not p.get('map'):   # inverted-hull ink: only its back faces, only to the camera
        tr = N.new('ShaderNodeBsdfTransparent'); em = N.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (*p['color'], 1)
        geo = N.new('ShaderNodeNewGeometry'); mx = N.new('ShaderNodeMixShader'); Lk(geo.outputs['Backfacing'], mx.inputs[0]); Lk(tr.outputs[0], mx.inputs[1]); Lk(em.outputs[0], mx.inputs[2]); Lk(mx.outputs[0], out.inputs[0])
        MATS[key] = m; INK.add(m.name); return m
    uvn = N.new('ShaderNodeUVMap'); rgb = N.new('ShaderNodeRGB'); rgb.outputs[0].default_value = (*(p['color'] or [1, 1, 1]), 1)
    col = rgb.outputs[0]; alpha = p['opacity'] if p.get('transparent') else None
    if p.get('map'):
        tx = tex_node(N, Lk, p['map'], uvn)
        if tx:
            col = mul_col(N, Lk, col, tx.outputs['Color'])
            if p.get('transparent') or (p.get('alphaTest') or 0) > 0: alpha = mul_f(N, Lk, tx.outputs['Alpha'], p['opacity'] if p.get('transparent') else 1.0)
            if flat: MAPNODE[key] = tx
    if p.get('alphaMap'):
        tx = tex_node(N, Lk, p['alphaMap'], uvn)
        if tx: alpha = mul_f(N, Lk, tx.outputs['Color'], alpha if alpha is not None else p['opacity'])
    if p.get('vc'): ca = N.new('ShaderNodeVertexColor'); ca.layer_name = 'Col'; col = mul_col(N, Lk, col, ca.outputs['Color'])
    if alpha is not None and (p.get('alphaTest') or 0) > 0:
        n = N.new('ShaderNodeMath'); n.operation = 'GREATER_THAN'; n.inputs[1].default_value = p['alphaTest']
        if isinstance(alpha, (int, float)): n.inputs[0].default_value = alpha
        else: Lk(alpha, n.inputs[0])
        alpha = n.outputs[0]
    additive = p.get('blending') == 2
    if basic:
        em = N.new('ShaderNodeEmission'); Lk(col, em.inputs['Color']); sh = em.outputs[0]
    else:
        bs = N.new('ShaderNodeBsdfPrincipled')
        Lk(col, bs.inputs['Base Color']); bs.inputs['Roughness'].default_value = p['rough']; bs.inputs['Metallic'].default_value = p['metal']
        am = N.new('ShaderNodeGroup'); am.node_tree = AMB; Lk(col, am.inputs['Color']); am.inputs['Metallic'].default_value = p['metal']
        am.inputs['SpecK'].default_value = p.get('envI') or EK   # a metal with its own env map (pbr.js) reflects at its own level
        e = am.outputs[0]
        if p.get('emissive') and max(p['emissive']) > 0:
            ec = N.new('ShaderNodeRGB'); ec.outputs[0].default_value = (*[c * p['ei'] for c in p['emissive']], 1); e2 = ec.outputs[0]
            if p.get('emissiveMap'):
                tx = tex_node(N, Lk, p['emissiveMap'], uvn)
                if tx: e2 = mul_col(N, Lk, e2, tx.outputs['Color'])
            ae = N.new('ShaderNodeMix'); ae.data_type = 'RGBA'; ae.blend_type = 'ADD'; ae.inputs['Factor'].default_value = 1; Lk(e, ae.inputs[6]); Lk(e2, ae.inputs[7]); e = ae.outputs[2]
        Lk(e, bs.inputs['Emission Color']); bs.inputs['Emission Strength'].default_value = 1.0
        if p.get('normalMap'):
            tx = tex_node(N, Lk, p['normalMap'], uvn)
            if tx: nm = N.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = p.get('ns', 1); Lk(tx.outputs['Color'], nm.inputs['Color']); Lk(nm.outputs[0], bs.inputs['Normal'])
        sh = bs.outputs[0]
    tr = N.new('ShaderNodeBsdfTransparent')
    if additive:   # additive glow: transparent + emission·α
        em2 = N.new('ShaderNodeEmission'); Lk(col, em2.inputs['Color'])
        if alpha is not None:
            if isinstance(alpha, (int, float)): em2.inputs['Strength'].default_value = alpha
            else: Lk(alpha, em2.inputs['Strength'])
        ad = N.new('ShaderNodeAddShader'); Lk(tr.outputs[0], ad.inputs[0]); Lk(em2.outputs[0], ad.inputs[1]); sh = ad.outputs[0]; alpha = None
    hz = N.new('ShaderNodeGroup'); hz.node_tree = HAZE; Lk(sh, hz.inputs[0])
    if alpha is not None:
        if isinstance(alpha, (int, float)): hz.inputs[1].default_value = alpha
        else: Lk(alpha, hz.inputs[1])
    sh = hz.outputs[0]
    if alpha is not None:
        mx = N.new('ShaderNodeMixShader')
        if isinstance(alpha, (int, float)): mx.inputs[0].default_value = alpha
        else: Lk(alpha, mx.inputs[0])
        Lk(tr.outputs[0], mx.inputs[1]); Lk(sh, mx.inputs[2]); sh = mx.outputs[0]
    if p['side'] == 1 and not flat and not A.nocull:   # BackSide shells (rooms, domes) must vanish from outside; FrontSide back faces are left visible (cheaper, rarely seen)   # three culls one side: emulate for camera rays only (shadows and bounce keep both)
        geo = N.new('ShaderNodeNewGeometry'); lp = N.new('ShaderNodeLightPath'); f = geo.outputs['Backfacing']
        if p['side'] == 1: inv = N.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1; Lk(f, inv.inputs[1]); f = inv.outputs[0]
        f = mul_f(N, Lk, f, lp.outputs['Is Camera Ray']); mx = N.new('ShaderNodeMixShader'); Lk(f, mx.inputs[0]); Lk(sh, mx.inputs[1]); Lk(tr.outputs[0], mx.inputs[2]); sh = mx.outputs[0]
    Lk(sh, out.inputs[0]); MATS[key] = m; return m

# ---------------- geometry ----------------
def read_geo(uid):
    b = open(os.path.join(D, 'geo', f'{uid}.bin'), 'rb').read(); u = np.frombuffer(b, np.uint32); f = np.frombuffer(b, np.float32)
    n, ni, fl = int(u[0]), int(u[1]), int(u[2]); o = 3
    def take(k):
        nonlocal o; a = f[o:o + n * k].reshape(n, k); o += n * k; return a
    pos = take(3); nrm = take(3) if fl & 1 else None; uv = take(2) if fl & 2 else None; col = take(3) if fl & 4 else None
    idx = u[o:o + ni].astype(np.int32) if ni else np.arange(n, dtype=np.int32)
    return pos, nrm, uv, col, idx
def zup(a): return np.stack([a[:, 0], -a[:, 2], a[:, 1]], 1)
MESH = {}
def build_mesh(uid, groups, nslots, push=0.0):
    key = (uid, json.dumps(groups), push)
    if key in MESH: return MESH[key]
    pos, nrm, uv, col, idx = read_geo(uid); n = len(pos)
    if push and nrm is not None: pos = pos + nrm * push   # toon.js ink hull: back faces pushed out along the normal in the vertex shader
    nt = len(idx) // 3; idx = idx[:nt * 3]
    me = bpy.data.meshes.new(uid[:8]); me.vertices.add(n); me.vertices.foreach_set('co', zup(pos).ravel())
    me.loops.add(nt * 3); me.loops.foreach_set('vertex_index', idx)
    me.polygons.add(nt); me.polygons.foreach_set('loop_start', np.arange(0, nt * 3, 3, dtype=np.int32))
    if groups:
        mi = np.zeros(nt, np.int32)
        for s, c, k in groups: mi[s // 3:(s + c) // 3] = k
        me.polygons.foreach_set('material_index', mi)
    if uv is not None: me.uv_layers.new(name='UV').data.foreach_set('uv', uv[idx].ravel())
    if col is not None:
        a = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT'); a.data.foreach_set('color', np.hstack([col, np.ones((n, 1), np.float32)]).ravel())
    me.update(calc_edges=True)
    for _ in range(nslots): me.materials.append(None)
    if nrm is not None:
        me.shade_smooth(); me.normals_split_custom_set_from_vertices(zup(nrm).astype(np.float32))
    MESH[key] = me; return me

# ---------------- node graph ----------------
FLATS = set(SH['flats']); SPRN = {s['name'] for s in SH['sprites']}; LGN = {l['name'] for l in SH['lights']}
OB = {}; BASE = {}
for nd in WJ['nodes']:
    nm = nd['name']
    if nd['type'] in ('sprite', 'light', 'points'): continue
    if nd['type'] in ('mesh', 'inst') and nd.get('geo'):
        push = max([WJ['mats'][u].get('push') or 0 for u in nd['mat'] if u] or [0])
        me = build_mesh(nd['geo'], (nd.get('groups') or []) if len(nd['mat']) > 1 else [], max(1, len(nd['mat'])), push)   # three ignores groups for a single material
        o = bpy.data.objects.new(nm, me)
        for i, mu in enumerate(nd['mat']):
            if mu is None: continue
            mat = build_mat(mu, flat=nm in FLATS)
            if i < len(o.material_slots): o.material_slots[i].link = 'OBJECT'; o.material_slots[i].material = mat
        if any(o.material_slots[i].material and o.material_slots[i].material.name in INK for i in range(len(o.material_slots))):
            for k in ('visible_diffuse', 'visible_glossy', 'visible_transmission', 'visible_volume_scatter', 'visible_shadow'): setattr(o, k, False)
        if nm in FLATS: o.visible_shadow = False
        if not nd.get('shadow', True): o.visible_shadow = False   # three's castShadow
    else: o = bpy.data.objects.new(nm, None)
    sc.collection.objects.link(o); OB[nm] = o
for nd in WJ['nodes']:
    o = OB.get(nd['name'])
    if not o: continue
    if nd['parent'] and nd['parent'] in OB: o.parent = OB[nd['parent']]
    o.matrix_parent_inverse = Matrix.Identity(4); o.matrix_basis = LM(nd['m']); BASE[nd['name']] = o.matrix_basis.copy()
    if nd['type'] == 'inst':   # instanced mesh → points + geometry nodes, per-instance colour as an instancer attribute
        b = np.fromfile(os.path.join(D, 'inst', f"{nd['name']}.bin"), np.float32); k = nd['count']; ms = b[:k * 16].reshape(k, 16)
        pts = bpy.data.meshes.new('pts_' + nd['name']); pts.vertices.add(k); locs = np.zeros((k, 3), np.float32); rots = np.zeros((k, 3), np.float32); scl = np.zeros((k, 3), np.float32)
        for i in range(k):
            t, q, s = LM(list(ms[i])).decompose(); locs[i] = t; rots[i] = q.to_euler(); scl[i] = s
        pts.vertices.foreach_set('co', locs.ravel())
        for nme, arr in (('rot', rots), ('scl', scl)): pts.attributes.new(nme, 'FLOAT_VECTOR', 'POINT').data.foreach_set('vector', arr.ravel())
        if nd.get('icol'): pts.attributes.new('icol', 'FLOAT_COLOR', 'POINT').data.foreach_set('color', np.hstack([b[k * 16:k * 19].reshape(k, 3), np.ones((k, 1), np.float32)]).ravel())
        src = o; src.hide_render = True; po = bpy.data.objects.new('I_' + nd['name'], pts); sc.collection.objects.link(po); po.parent = src.parent; po.matrix_basis = src.matrix_basis.copy()
        g = bpy.data.node_groups.new('inst_' + nd['name'], 'GeometryNodeTree'); g.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry'); g.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
        N = g.nodes; Lk = g.links.new; gi = N.new('NodeGroupInput'); go = N.new('NodeGroupOutput'); io = N.new('GeometryNodeInstanceOnPoints'); oi = N.new('GeometryNodeObjectInfo'); oi.inputs['Object'].default_value = src; oi.inputs['As Instance'].default_value = False
        ra = N.new('GeometryNodeInputNamedAttribute'); ra.data_type = 'FLOAT_VECTOR'; ra.inputs['Name'].default_value = 'rot'; sa = N.new('GeometryNodeInputNamedAttribute'); sa.data_type = 'FLOAT_VECTOR'; sa.inputs['Name'].default_value = 'scl'
        er = N.new('FunctionNodeEulerToRotation'); Lk(ra.outputs['Attribute'], er.inputs[0])
        Lk(gi.outputs[0], io.inputs['Points']); Lk(oi.outputs['Geometry'], io.inputs['Instance']); Lk(er.outputs[0], io.inputs['Rotation']); Lk(sa.outputs['Attribute'], io.inputs['Scale']); Lk(io.outputs[0], go.inputs[0])
        oi.transform_space = 'ORIGINAL'; mod = po.modifiers.new('inst', 'NODES'); mod.node_group = g; OB['I_' + nd['name']] = po
        # the source object's materials read the instance colour (three multiplies instanceColor into diffuse)
        if nd.get('icol'):
            for sl in src.material_slots:
                if not sl.material: continue
                m2 = sl.material.copy(); nt = m2.node_tree; at = nt.nodes.new('ShaderNodeAttribute'); at.attribute_type = 'INSTANCER'; at.attribute_name = 'icol'
                for bs in [x for x in nt.nodes if x.type in ('BSDF_PRINCIPLED', 'EMISSION')]:
                    k_ = 'Base Color' if bs.type == 'BSDF_PRINCIPLED' else 'Color'; s0 = bs.inputs[k_]
                    mm = nt.nodes.new('ShaderNodeMix'); mm.data_type = 'RGBA'; mm.blend_type = 'MULTIPLY'; mm.inputs['Factor'].default_value = 1
                    if s0.is_linked: nt.links.new(s0.links[0].from_socket, mm.inputs[6])
                    else: mm.inputs[6].default_value = s0.default_value
                    nt.links.new(at.outputs['Color'], mm.inputs[7]); nt.links.new(mm.outputs[2], s0)
                sl.link = 'OBJECT'; sl.material = m2

# ---------------- sprites → camera-facing cards ----------------
SPR = {}
for s in SH['sprites']:
    me = bpy.data.meshes.new('spr'); me.from_pydata([(-0.5, -0.5, 0), (0.5, -0.5, 0), (0.5, 0.5, 0), (-0.5, 0.5, 0)], [], [(0, 1, 2, 3)]); me.uv_layers.new().data.foreach_set('uv', [0, 0, 1, 0, 1, 1, 0, 1])
    o = bpy.data.objects.new('spr_' + s['name'], me); sc.collection.objects.link(o)
    for k in ('visible_diffuse', 'visible_glossy', 'visible_transmission', 'visible_shadow'): setattr(o, k, False)
    m, N, Lk = new_mat('spr'); out = N.new('ShaderNodeOutputMaterial'); em = N.new('ShaderNodeEmission'); tr = N.new('ShaderNodeBsdfTransparent'); rgb = N.new('ShaderNodeRGB'); op = N.new('ShaderNodeValue')
    col = rgb.outputs[0]; a = op.outputs[0]; im = image(s['tex']) if s['tex'] else None
    if im: tx = N.new('ShaderNodeTexImage'); tx.image = im; col = mul_col(N, Lk, col, tx.outputs['Color']); a = mul_f(N, Lk, a, tx.outputs['Alpha'])
    Lk(col, em.inputs['Color'])
    if s['add']: Lk(a, em.inputs['Strength']); ad = N.new('ShaderNodeAddShader'); Lk(tr.outputs[0], ad.inputs[0]); Lk(em.outputs[0], ad.inputs[1]); Lk(ad.outputs[0], out.inputs[0])
    else: mx = N.new('ShaderNodeMixShader'); Lk(a, mx.inputs[0]); Lk(tr.outputs[0], mx.inputs[1]); Lk(em.outputs[0], mx.inputs[2]); Lk(mx.outputs[0], out.inputs[0])
    me.materials.append(m); SPR[s['name']] = (o, rgb, op)

# ---------------- lights + world ----------------
LGT = {}
for l in SH['lights']:
    if l['type'] in ('PointLight', 'SpotLight'): ld = bpy.data.lights.new(l['name'], 'POINT'); ld.shadow_soft_size = 0.18
    elif l['type'] == 'DirectionalLight': ld = bpy.data.lights.new(l['name'], 'SUN'); ld.angle = math.radians(2.5)
    else: continue
    o = bpy.data.objects.new('L_' + l['name'], ld); sc.collection.objects.link(o); LGT[l['name']] = o
w = bpy.data.worlds.new('w'); sc.world = w
try: w.use_nodes = True
except Exception: pass
N = w.node_tree.nodes; Lk = w.node_tree.links.new
for x in list(N): N.remove(x)
wo = N.new('ShaderNodeOutputWorld'); bgn = N.new('ShaderNodeBackground'); lp = N.new('ShaderNodeLightPath'); cm = N.new('ShaderNodeMix'); cm.data_type = 'RGBA'; cm.name = 'bg'
cm.inputs[6].default_value = (0, 0, 0, 1); Lk(lp.outputs['Is Camera Ray'], cm.inputs['Factor']); Lk(cm.outputs[2], bgn.inputs['Color']); bgn.inputs['Strength'].default_value = 1; Lk(bgn.outputs[0], wo.inputs[0])
BG = SH['background'] or [0.05, 0.05, 0.06]

# ---------------- camera + render settings ----------------
cam = bpy.data.cameras.new('cam'); co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co; cam.sensor_fit = 'VERTICAL'
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = A.samples; sc.cycles.use_denoising = True
try: sc.cycles.denoiser = 'OPENIMAGEDENOISE'
except Exception: pass
sc.cycles.use_adaptive_sampling = True; sc.cycles.adaptive_threshold = A.adaptive
sc.cycles.max_bounces = A.bounces + 1; sc.cycles.diffuse_bounces = A.bounces; sc.cycles.glossy_bounces = A.bounces; sc.cycles.transparent_max_bounces = 24; sc.cycles.caustics_reflective = False; sc.cycles.caustics_refractive = False
sc.cycles.sample_clamp_indirect = 6
sc.render.resolution_x = 1080; sc.render.resolution_y = 1920; sc.render.resolution_percentage = A.scale; sc.render.film_transparent = False
sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'; sc.view_settings.exposure = 0
sc.render.image_settings.file_format = 'OPEN_EXR'; sc.render.image_settings.color_depth = '16'; sc.render.image_settings.color_mode = 'RGB'; sc.render.image_settings.exr_codec = 'ZIP'
sc.render.use_persistent_data = True

# ---------------- per frame ----------------
frames = SH['frames'] if not A.frames else [int(x) for x in A.frames.split(',')]
hidden0 = set(SH['hiddenAt0']); moved = set()
for f in frames:
    d = json.load(open(os.path.join(D, 'frames', f'f{f:04d}.json')))
    moved |= set(d['nodes'])
    for n in moved:
        o = OB.get(n)
        if o: o.matrix_basis = LM(d['nodes'][n]) if n in d['nodes'] else BASE[n]
    for n, o in OB.items():
        if o.type != 'MESH' or n.startswith('I_'): continue
        v = d['vis'].get(n, n not in hidden0); o.hide_render = not v
        po = OB.get('I_' + n)
        if po: po.hide_render = not v; o.hide_render = True
    for n in FLATS:
        fl = d['flats'].get(n); o = OB.get(n)
        if not fl or not o: continue
        for sl in o.material_slots:
            tx = MAPNODE.get(next((u for u in MATS if MATS[u] == sl.material), ''), None)
            if tx: im = tx.image; im.filepath = os.path.join(D, fl['png']); im.reload()
    cm_ = d['cam']; Mw = C @ M3(cm_['m']); co.matrix_world = Mw; cam.angle_y = math.radians(cm_['fov']); cam.clip_start = max(0.02, cm_['near']); cam.clip_end = cm_['far']
    fo = d.get('focus') or {}; dist = max(0.05, fo.get('dist', 5)); aper = fo.get('aper') or 26 * (fo.get('amt') or 0) * max(0.3, dist) / 5   # film px at 1920 high
    cam.dof.use_dof = aper > 0.01
    if cam.dof.use_dof:
        Ap = L['dof'] * 2 * aper * 2 * math.tan(math.radians(cm_['fov']) / 2) / 1920   # lens diameter (scene units) that gives the film's CoC
        cam.dof.focus_distance = dist; cam.dof.aperture_fstop = (cam.lens * 0.001) / Ap; cam.dof.aperture_blades = 0
    hz = d.get('haze'); set_haze(hz)
    bg = list(BG)
    if hz and hz.get('den'):
        h = hz.get('max', 0.6) * (1 - math.exp(-max(0, cm_['far'] - hz.get('start', 2)) * hz['den'])); bg = [b * (1 - h) + c * h for b, c in zip(bg, hz.get('col', [1, 0.9, 0.8]))]
    N['bg'].inputs[7].default_value = (*bg, 1)
    camq = Mw.to_quaternion()
    for name, (o, rgb, op) in SPR.items():
        s = d['sprites'].get(name)
        if not s or not d['vis'].get(name, True): o.hide_render = True; continue
        o.hide_render = False; o.location = P(s['p']); o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = camq; o.scale = (s['s'][0], s['s'][1], 1)
        rgb.outputs[0].default_value = (*s['c'], 1); op.outputs[0].default_value = s['o']
    for name, o in LGT.items():
        l = d['lights'].get(name)
        if not l: continue
        o.location = P(l['p']); o.data.color = l['c']
        if o.data.type == 'SUN': o.data.energy = l['i'] * L['sun']; o.rotation_euler = (P(l.get('tg') or [0, 0, 0]) - o.location).to_track_quat('-Z', 'Y').to_euler()
        else: o.data.energy = 4 * math.pi * l['i'] * L['point']
    if A.blend: bpy.ops.wm.save_as_mainfile(filepath=A.blend); print('saved', A.blend); break
    sc.render.filepath = os.path.join(A.out, f'f{f:04d}.exr'); bpy.ops.render.render(write_still=True); print('frame', f, flush=True)
    if A.png:
        import subprocess; subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'grade.py'), sc.render.filepath])
