"""Bake three.js's RoomEnvironment (the films' image-based fill light, pbr.js) as an equirect EXR that a Blender world can
use with its default mapping. Same boxes, same emissive panels, same 900 cd point light, seen from the origin like
PMREMGenerator.fromScene. usage: python3 tools/blender/bake_room.py <out.exr> [--size 1024]
"""
import sys, math
import bpy
from mathutils import Matrix, Euler, Vector
out = sys.argv[1]; size = int(sys.argv[sys.argv.index('--size') + 1]) if '--size' in sys.argv else 1024
bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
C = Matrix.Rotation(math.radians(90), 4, 'X'); Ci = C.inverted()
def mat(name, emit=0.0):
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    N = m.node_tree.nodes
    for x in list(N): N.remove(x)
    o = N.new('ShaderNodeOutputMaterial')
    if emit: e = N.new('ShaderNodeEmission'); e.inputs['Strength'].default_value = emit; m.node_tree.links.new(e.outputs[0], o.inputs[0])
    else: b = N.new('ShaderNodeBsdfPrincipled'); b.inputs['Roughness'].default_value = 1.0; m.node_tree.links.new(b.outputs[0], o.inputs[0])
    return m
def box(pos, scl, rot_y=0.0, m=None):
    me = bpy.data.meshes.new('b'); h = 0.5
    v = [(x, y, z) for x in (-h, h) for y in (-h, h) for z in (-h, h)]
    f = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    me.from_pydata(v, [], f); me.materials.append(m); o = bpy.data.objects.new('b', me); sc.collection.objects.link(o)
    L = Matrix.Translation(pos) @ Euler((0, rot_y, 0)).to_matrix().to_4x4() @ Matrix.Diagonal((*scl, 1))
    o.matrix_world = C @ L @ Ci; return o
white = mat('white')
box((-0.757, 13.219, 0.717), (31.713, 28.305, 28.591), 0, white)
for p, r, s in [((-10.906, 2.009, 1.846), -0.195, (2.328, 7.905, 4.651)), ((-5.607, -0.754, -0.758), 0.994, (1.970, 1.534, 3.955)), ((6.167, 0.857, 7.803), 0.561, (3.927, 6.285, 3.687)),
                ((-2.017, 0.018, 6.124), 0.333, (2.002, 4.566, 2.064)), ((2.291, -0.756, -2.621), -0.286, (1.546, 1.552, 1.496)), ((-2.193, -0.369, -5.547), 0.516, (3.875, 3.487, 2.986))]:
    box(p, s, r, white)
for p, s, k in [((-16.116, 14.37, 8.208), (0.1, 2.428, 2.739), 50), ((-16.109, 18.021, -8.207), (0.1, 2.425, 2.751), 50), ((14.904, 12.198, -1.832), (0.15, 4.265, 6.331), 17),
                ((-0.462, 8.89, 14.520), (4.38, 5.441, 0.088), 43), ((3.235, 11.486, -12.541), (2.5, 2.0, 0.1), 20), ((0.0, 20.0, 0.0), (1.0, 0.1, 1.0), 100)]:
    box(p, s, 0, mat('L', k))
ld = bpy.data.lights.new('main', 'POINT'); ld.energy = 4 * math.pi * 900; ld.shadow_soft_size = 0.05; lo = bpy.data.objects.new('main', ld); lo.location = C @ Vector((0.418, 16.199, 0.300)); sc.collection.objects.link(lo)
cam = bpy.data.cameras.new('c'); cam.type = 'PANO'
try: cam.panorama_type = 'EQUIRECTANGULAR'
except Exception: cam.cycles.panorama_type = 'EQUIRECTANGULAR'
co = bpy.data.objects.new('c', cam); co.rotation_euler = (math.radians(90), 0, math.radians(90)); sc.collection.objects.link(co); sc.camera = co   # centre = −X, like a world texture
w = bpy.data.worlds.new('w'); sc.world = w
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 64; sc.cycles.use_denoising = True; sc.cycles.max_bounces = 0   # three renders the room direct-lit only
sc.render.resolution_x = size; sc.render.resolution_y = size // 2; sc.render.resolution_percentage = 100
sc.view_settings.view_transform = 'Standard'
sc.render.image_settings.file_format = 'OPEN_EXR'; sc.render.image_settings.color_depth = '32'; sc.render.image_settings.color_mode = 'RGB'
sc.render.filepath = out; bpy.ops.render.render(write_still=True); print('baked', out)
