"""Blender (bpy) test still: shot S02 (dragon close-up, t = 1.5 s) from the exported three.js hall.
usage: python3 render_s02.py hall_s02.glb cam_s02.json out.png [samples] [scale%]"""
import sys, json, math
import bpy
from mathutils import Matrix, Quaternion, Vector

glb, camf, out = sys.argv[1:4]; SAMPLES = int(sys.argv[4]) if len(sys.argv) > 4 else 96; SCALE = int(sys.argv[5]) if len(sys.argv) > 5 else 100; HIDEINK = len(sys.argv) > 6
C = json.load(open(camf))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb)
sc = bpy.context.scene
T = Matrix.Rotation(math.radians(90), 4, 'X')            # three.js (y-up) world → Blender (z-up) world
def P(v): return T @ Vector(v)

# ---- materials: use the vertex colours where the three.js material relied on them (sculpted skin, tongue) ----
for ob in bpy.data.objects:
    if ob.type != 'MESH' or not ob.data.color_attributes: continue
    for slot in ob.material_slots:
        m = slot.material
        if not m or not m.use_nodes: continue
        nt = m.node_tree; bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if not bsdf or bsdf.inputs['Base Color'].is_linked: continue
        ca = nt.nodes.new('ShaderNodeVertexColor'); ca.layer_name = ob.data.color_attributes[0].name
        mul = nt.nodes.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 1.0
        mul.inputs[6].default_value = bsdf.inputs['Base Color'].default_value
        nt.links.new(ca.outputs['Color'], mul.inputs[7]); nt.links.new(mul.outputs[2], bsdf.inputs['Base Color'])
# ---- inverted-hull ink outlines: three.js drew only their back faces. Cycles: front faces transparent, back faces ink ----
def dark_unlit(m):
    nt = m.node_tree
    if not nt: return False
    for n in nt.nodes:
        for key in ('Base Color', 'Color', 'Emission Color'):
            if key in n.inputs and not n.inputs[key].is_linked:
                c = n.inputs[key].default_value
                if len(c) >= 3 and max(c[0], c[1], c[2]) < 0.035 and n.type in ('BSDF_PRINCIPLED', 'EMISSION', 'BACKGROUND', 'MIX_SHADER', 'GROUP') : return True
    return False
inkm = bpy.data.materials.new('INK'); nt = inkm.node_tree
for n in list(nt.nodes): nt.nodes.remove(n)
o_ = nt.nodes.new('ShaderNodeOutputMaterial'); mx = nt.nodes.new('ShaderNodeMixShader'); tr = nt.nodes.new('ShaderNodeBsdfTransparent'); em = nt.nodes.new('ShaderNodeEmission'); em.inputs[0].default_value = (0.012, 0.007, 0.005, 1); geo = nt.nodes.new('ShaderNodeNewGeometry')
nt.links.new(geo.outputs['Backfacing'], mx.inputs[0]); nt.links.new(em.outputs[0], mx.inputs[1]); nt.links.new(tr.outputs[0], mx.inputs[2]);   # the exporter flips BackSide winding: Blender's back faces are the hull's outer side nt.links.new(mx.outputs[0], o_.inputs[0])
nink = 0
for ob in bpy.data.objects:
    if ob.type != 'MESH' or len(ob.data.vertices) < 200: continue
    for slot in ob.material_slots:
        if slot.material and dark_unlit(slot.material): slot.material = inkm; nink += 1; ob.hide_render = True   # outlines come from Freestyle instead
print('ink hulls', nink)
# gold: a little more metal + clear-coat sheen; bronze balls: polished metal
for m in bpy.data.materials:
    if not m.use_nodes: continue
    b = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not b: continue
    if b.inputs['Metallic'].default_value > 0.9: b.inputs['Roughness'].default_value = 0.16; c = b.inputs['Base Color'].default_value; b.inputs['Base Color'].default_value = (c[0] * 0.75, c[1] * 0.6, c[2] * 0.45, 1)
    if 'Coat Weight' in b.inputs and b.inputs['Metallic'].default_value > 0.05: b.inputs['Coat Weight'].default_value = 0.15

# richer gold on the sculpted skin (vertex colour → saturation/value), darker bronze-grey jar body
for m in bpy.data.materials:
    nt = m.node_tree
    if not nt: continue
    vc = next((n for n in nt.nodes if n.type == 'VERTEX_COLOR'), None)
    b = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if b and not b.inputs['Base Color'].is_linked:
        c = b.inputs['Base Color'].default_value
        if min(c[:3]) > 0.35 and max(c[:3]) - min(c[:3]) < 0.12: b.inputs['Base Color'].default_value = (c[0] * 0.55, c[1] * 0.55, c[2] * 0.58, 1)
# the sculpted gold skin: map its painted vertex colours (grooves dark → plates light) onto the reference's lemon gold
gs = bpy.data.materials.new('GOLDSKIN'); gt = gs.node_tree; gb = gt.nodes['Principled BSDF']
gv = gt.nodes.new('ShaderNodeVertexColor'); gw = gt.nodes.new('ShaderNodeRGBToBW'); gr = gt.nodes.new('ShaderNodeValToRGB'); cr = gr.color_ramp
cr.elements[0].position = 0.1; cr.elements[0].color = (0.2, 0.11, 0.015, 1); cr.elements[1].position = 0.75; cr.elements[1].color = (0.98, 0.74, 0.16, 1); cr.elements.new(0.35).color = (0.62, 0.42, 0.05, 1)
gt.links.new(gv.outputs['Color'], gw.inputs[0]); gt.links.new(gw.outputs[0], gr.inputs[0]); gt.links.new(gr.outputs['Color'], gb.inputs['Base Color'])
gb.inputs['Roughness'].default_value = 0.36; gb.inputs['Metallic'].default_value = 0.3
nskin = 0
for ob in bpy.data.objects:
    if ob.type != 'MESH' or not ob.data.color_attributes: continue
    ca = ob.data.color_attributes[0]; n = min(len(ca.data), 4000); rs = gs_ = bs = 0.0
    for i in range(0, n, 7): c = ca.data[i].color; rs += c[0]; gs_ += c[1]; bs += c[2]
    k = len(range(0, n, 7)) or 1; r, g, b = rs / k, gs_ / k, bs / k
    if g > 0.18 and r > g and b < g * 0.8 and g > 0.45 * r:
        gv.layer_name = ca.name
        for sl in ob.material_slots: sl.material = gs
        nskin += 1
print('gold skins', nskin)
# the jar body + lid: find them by place and size (centred on the jar axis, ~2 m tall) and give them the reference's soft grey bronze
jarc = P([0, 1.0, 2.2]); jm = bpy.data.materials.new('JAR'); jb = jm.node_tree.nodes['Principled BSDF']; jb.inputs['Base Color'].default_value = (0.3, 0.31, 0.39, 1); jb.inputs['Roughness'].default_value = 0.5; jb.inputs['Metallic'].default_value = 0.1
for ob in bpy.data.objects:
    if ob.type != 'MESH' or ob.hide_render: continue
    bb = [ob.matrix_world @ Vector(c) for c in ob.bound_box]; cen = sum(bb, Vector()) / 8; dim = max((max(v[i] for v in bb) - min(v[i] for v in bb)) for i in range(3))
    if (Vector((cen.x, cen.y)) - Vector((jarc.x, jarc.y))).length < 0.15 and 0.15 < dim < 2.8 and len(ob.data.vertices) > 300:
        for sl in ob.material_slots: sl.material = jm
        print('jar part', ob.name, round(dim, 2))
# brazier fires (sprites do not export): glowing flame blobs that turn into warm bokeh behind the head
fire = bpy.data.materials.new('FIRE'); fn = fire.node_tree; fe = fn.nodes.new('ShaderNodeEmission'); fe.inputs[0].default_value = (1.0, 0.52, 0.1, 1); fe.inputs[1].default_value = 5
fn.links.new(fe.outputs[0], fn.nodes['Material Output'].inputs[0])
for x, y, z in [[-2.2, 1.0, 1.2], [2.3, 1.0, 0.6], [-2.6, 1.0, 4.5]]:
    for k in range(5):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.09 + 0.03 * (k % 2), location=P([x + 0.12 * math.cos(k * 1.3), y + 0.1 + 0.06 * k, z + 0.12 * math.sin(k * 1.3)]))
        bpy.context.object.data.materials.append(fire); bpy.context.object.scale.z = 1.8
# ---- camera ----
cam = bpy.data.cameras.new('cam'); co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
q = C['cam']['quat']; M3 = Matrix.Translation(Vector(C['cam']['pos'])) @ Quaternion((q[3], q[0], q[1], q[2])).to_matrix().to_4x4()
co.matrix_world = T @ M3
cam.sensor_fit = 'VERTICAL'; cam.angle_y = math.radians(C['cam']['fov']); cam.clip_start = 0.02; cam.clip_end = 200
# reference framing: the camera sits higher, looking down onto the snout (orbit up about the head), a touch closer
ORBIT = float(__import__('os').environ.get('ORBIT', '0')); PUSH = float(__import__('os').environ.get('PUSH', '1.0'))
hd = P(C['head']); tgt = P(C['mouth']).lerp(hd, 0.35); right = co.matrix_world.to_quaternion() @ Vector((1, 0, 0))
off = (co.matrix_world.translation - tgt); off.rotate(Matrix.Rotation(math.radians(-ORBIT), 3, right)); newp = tgt + off * PUSH
co.matrix_world = Matrix.Translation(newp) @ (tgt - newp).to_track_quat('-Z', 'Y').to_matrix().to_4x4()
mouth = P(C['mouth']); cam.dof.use_dof = True; cam.dof.focus_distance = (mouth - co.matrix_world.translation).length; cam.dof.aperture_fstop = 1.2

cq = co.matrix_world.to_quaternion(); cp = co.matrix_world.translation
FIREP = cp + cq @ Vector((-0.5, -1.25, -6.0))
bowl = bpy.data.materials.new('BOWL'); bowl.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.08, 0.06, 0.05, 1); bowl.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value = 0.8
bpy.ops.mesh.primitive_cylinder_add(radius=0.55, depth=0.2, location=FIREP + Vector((0, 0, -0.2))); bpy.context.object.data.materials.append(bowl)
for k in range(9):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.16 + 0.05 * (k % 3), location=FIREP + Vector((0.5 * math.cos(k * 0.7), 0.35 * math.sin(k * 0.7), 0.15 + 0.12 * (k % 4))))
    bpy.context.object.data.materials.append(fire); bpy.context.object.scale.z = 2.2
FIRE_LIGHT = FIREP + Vector((0, 0, 0.8))
# ---- light: warm interior. Key above/in front of the snout, warm brazier fills, cool sky fill from the windows ----
def light(kind, pos, energy, col, size=0.5, target=None):
    L = bpy.data.lights.new(kind + str(len(bpy.data.lights)), kind); L.energy = energy; L.color = col
    if kind == 'AREA': L.size = size
    elif kind == 'SPOT': L.shadow_soft_size = size; L.spot_size = math.radians(38); L.spot_blend = 0.6
    if kind == 'POINT': L.shadow_soft_size = size
    o = bpy.data.objects.new(L.name, L); sc.collection.objects.link(o); o.location = pos
    if target is not None: o.rotation_euler = (target - pos).to_track_quat('-Z', 'Y').to_euler()
    return o
head = P(C['head'])
light('POINT', FIRE_LIGHT, 120, (1.0, 0.5, 0.15), 0.6)
sunL = bpy.data.lights.new('sun', 'SUN'); sunL.energy = float(__import__('os').environ.get('SUN', '3.2')); sunL.color = (1.0, 0.93, 0.8); sunL.angle = math.radians(2.5)
so = bpy.data.objects.new('sun', sunL); sc.collection.objects.link(so)
sdir = (co.matrix_world.to_quaternion() @ Vector(eval(__import__('os').environ.get('SUNDIR', '(0.55, 0.75, -0.75)')))).normalized()
so.rotation_euler = (-sdir).to_track_quat('-Z', 'Y').to_euler()
light('AREA', head + Vector((-0.6, 0.9, 1.4)), 90, (1.0, 0.9, 0.72), 2.5, head)            # soft key from above-front
light('AREA', head + Vector((1.4, -1.6, 0.5)), 60, (0.75, 0.82, 1.0), 2.0, head)              # cool rim from behind
for x, y, z in [[-2.2, 1.6, 1.2], [2.3, 1.6, 0.6], [-2.6, 1.6, 4.5]]: light('POINT', P([x, y, z]), 180, (1.0, 0.55, 0.22), 0.4)   # braziers
light('POINT', P([0, 3.0, -6.5]), 300, (1.0, 0.65, 0.35), 0.6)
light('AREA', P([0, 7.5, 2]), 140, (1.0, 0.92, 0.84), 8.0, P([0, 0, 2]))                       # big soft ceiling bounce
fill = co.matrix_world.translation + (co.matrix_world.to_quaternion() @ Vector((0.3, 0.6, 0.4)))
light('AREA', fill, 35, (1.0, 0.94, 0.86), 3.0, head)                                          # soft fill from the lens side: open the shadows like the reference
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.62, 0.55, 0.52, 1); bg.inputs[1].default_value = 0.45

# ---- render ----
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
try: sc.cycles.denoiser = 'OPENIMAGEDENOISE'
except Exception: pass
sc.cycles.max_bounces = 6; sc.cycles.caustics_reflective = False; sc.cycles.caustics_refractive = False
sc.render.resolution_x = 1080; sc.render.resolution_y = 1920; sc.render.resolution_percentage = SCALE
sc.view_settings.view_transform = 'Standard'; sc.view_settings.exposure = float(__import__('os').environ.get('EXPO', '-0.8'))
# thin warm-dark ink outline like the reference (silhouettes + borders only)
sc.render.use_freestyle = True; sc.render.line_thickness_mode = 'ABSOLUTE'; sc.render.line_thickness = 1.6 * SCALE / 100
vl = sc.view_layers[0]; fs = vl.freestyle_settings; fs.crease_angle = math.radians(120)
ls = fs.linesets[0] if len(fs.linesets) else fs.linesets.new('ink'); ls.select_by_visibility = True; ls.select_by_edge_types = True
for k in ('select_silhouette', 'select_border', 'select_crease', 'select_external_contour'): setattr(ls, k, k == 'select_external_contour')   # outer outline only (the bumpy scales would hatch the head)
ls.linestyle = ls.linestyle or bpy.data.linestyles.new('ink'); ls.linestyle.color = (0.06, 0.035, 0.025); ls.linestyle.thickness = 2.0 * SCALE / 100
try: sc.view_settings.look = 'None'
except Exception: pass
sc.render.image_settings.file_format = 'PNG'; sc.render.filepath = out
bpy.ops.render.render(write_still=True)
print('rendered', out)
