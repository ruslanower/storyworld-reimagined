import bpy
import bmesh
import math
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(BASE_DIR, "assets", "items")
os.makedirs(OUT_DIR, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.file_preview_type = 'NONE'
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 36
scene.render.film_transparent = True
scene.render.resolution_x = 512
scene.render.resolution_y = 512
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'

world = bpy.data.worlds.new("ToxinWorld")
scene.world = world
bg = world.node_tree.nodes.get("Background")
if bg:
    bg.inputs["Color"].default_value = (0.02, 0.04, 0.03, 1.0)
    bg.inputs["Strength"].default_value = 0.8


def make_mat(name, color, metallic=0.0, roughness=0.2, emission=None, em_str=0.0, alpha=1.0):
    mat = bpy.data.materials.new(name=name)
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        if "Alpha" in bsdf.inputs:
            bsdf.inputs["Alpha"].default_value = alpha
        if emission and "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = emission
        if em_str > 0 and "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = em_str
    return mat


mat_glass = make_mat("ToxinGlass", (0.75, 1.0, 0.85, 1.0), metallic=0.1, roughness=0.06, alpha=0.28)
mat_gas = make_mat("ToxinVapor", (0.15, 0.95, 0.45, 1.0), roughness=0.1, emission=(0.18, 1.0, 0.42, 1.0), em_str=4.5)
mat_bronze = make_mat("AncientBronze", (0.55, 0.42, 0.18, 1.0), metallic=0.9, roughness=0.28)
mat_wax = make_mat("RoyalSealWax", (0.65, 0.08, 0.18, 1.0), roughness=0.45)

root = bpy.data.objects.new("ToxinJarRoot", None)
bpy.context.collection.objects.link(root)

# Скляна банка-колба Тарганячого Короля
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.88, depth=1.65, location=(0, 0, -0.15))
jar = bpy.context.active_object
jar.parent = root
bevel = jar.modifiers.new(name="Bevel", type='BEVEL')
bevel.width = 0.16
bevel.segments = 4
for p in jar.data.polygons:
    p.use_smooth = True
jar.data.materials.append(mat_glass)

# Світний смарагдово-отруйний туман всередині банки
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.72, location=(0, 0, -0.22))
core = bpy.context.active_object
core.scale = (1.0, 1.0, 1.15)
core.parent = root
for p in core.data.polygons:
    p.use_smooth = True
core.data.materials.append(mat_gas)

# Бронзові обручі-клітка навколо банки
for z_pos in (-0.75, 0.45):
    bpy.ops.mesh.primitive_torus_add(major_radius=0.90, minor_radius=0.055, location=(0, 0, z_pos))
    ring = bpy.context.active_object
    ring.parent = root
    ring.data.materials.append(mat_bronze)

# Кришка з печаткою
bpy.ops.mesh.primitive_cylinder_add(vertices=28, radius=0.62, depth=0.32, location=(0, 0, 0.85))
lid = bpy.context.active_object
lid.parent = root
lid.data.materials.append(mat_bronze)

bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.46, depth=0.22, location=(0, 0, 1.08))
seal = bpy.context.active_object
seal.parent = root
seal.data.materials.append(mat_wax)

root.rotation_euler = (math.radians(14), math.radians(-16), math.radians(8))


def add_light(name, energy, color, loc):
    ld = bpy.data.lights.new(name=name, type='POINT')
    ld.energy = energy
    ld.color = color
    lo = bpy.data.objects.new(name=name, object_data=ld)
    bpy.context.collection.objects.link(lo)
    lo.location = loc


add_light("Key", 380, (1.0, 0.95, 0.85), (3.2, -3.5, 3.5))
add_light("Fill", 260, (0.2, 1.0, 0.55), (-3.2, -2.5, 1.5))
add_light("Rim", 300, (0.8, 0.4, 1.0), (0.0, 2.8, -2.2))

cam_data = bpy.data.cameras.new(name="Cam")
cam_data.lens = 65
cam = bpy.data.objects.new("Cam", cam_data)
bpy.context.collection.objects.link(cam)
cam.location = (0.0, -5.2, 0.0)
cam.rotation_euler = (math.radians(90), 0, 0)
scene.camera = cam

out_path = os.path.join(OUT_DIR, "item_toxin_flask.png")
scene.render.filepath = out_path
bpy.ops.render.render(write_still=True)
print(f"SAVED_TOXIN_FLASK: {out_path}")
