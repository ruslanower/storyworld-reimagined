import bpy
import math
import os

# Очищення сцени
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.file_preview_type = 'NONE'

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 32
scene.render.film_transparent = True
scene.render.resolution_x = 512
scene.render.resolution_y = 512
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'

# Створення 3D Ікосаедра (Кубик D20)
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1.45, location=(0, 0, 0))
d20 = bpy.context.active_object
d20.name = "D20_Core"
d20.rotation_euler = (math.radians(22), math.radians(18), math.radians(35))

# Додавання Bevel (фаски граней) для реалістичного вигляду ігрової кістки
bevel = d20.modifiers.new(name="Bevel", type='BEVEL')
bevel.width = 0.045
bevel.segments = 2

# Матеріал темного обсидіану з золотистим відблиском
mat_core = bpy.data.materials.new(name="ObsidianGold")
nodes = mat_core.node_tree.nodes
bsdf = nodes.get("Principled BSDF")
if bsdf:
    bsdf.inputs["Base Color"].default_value = (0.06, 0.04, 0.11, 1.0)
    bsdf.inputs["Metallic"].default_value = 0.85
    bsdf.inputs["Roughness"].default_value = 0.18
d20.data.materials.append(mat_core)

# Створення світної золотої каркасної сітки (Wireframe ребер D20)
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1.465, location=(0, 0, 0))
wire_obj = bpy.context.active_object
wire_obj.name = "D20_Runes_Wire"
wire_obj.rotation_euler = d20.rotation_euler.copy()
wire_mod = wire_obj.modifiers.new(name="Wireframe", type='WIREFRAME')
wire_mod.thickness = 0.035

mat_glow = bpy.data.materials.new(name="RunicGlow")
glow_nodes = mat_glow.node_tree.nodes
glow_bsdf = glow_nodes.get("Principled BSDF")
if glow_bsdf:
    glow_bsdf.inputs["Base Color"].default_value = (1.0, 0.72, 0.18, 1.0)
    if "Emission Color" in glow_bsdf.inputs:
        glow_bsdf.inputs["Emission Color"].default_value = (1.0, 0.65, 0.12, 1.0)
    if "Emission Strength" in glow_bsdf.inputs:
        glow_bsdf.inputs["Emission Strength"].default_value = 5.5
wire_obj.data.materials.append(mat_glow)

# Магічне кільце навколо D20
bpy.ops.mesh.primitive_torus_add(
    major_radius=1.85,
    minor_radius=0.035,
    major_segments=64,
    minor_segments=16,
    location=(0, 0, 0),
    rotation=(math.radians(62), math.radians(-18), math.radians(15))
)
ring = bpy.context.active_object
ring.name = "Magic_Ring"
ring.data.materials.append(mat_glow)

# Освітлення (3 джерела: тепле золоте, містичне фіолетове, холодне контурне)
def add_light(name, ltype, energy, color, loc, rot=(0, 0, 0)):
    light_data = bpy.data.lights.new(name=name, type=ltype)
    light_data.energy = energy
    light_data.color = color
    light_obj = bpy.data.objects.new(name=name, object_data=light_data)
    bpy.context.collection.objects.link(light_obj)
    light_obj.location = loc
    light_obj.rotation_euler = rot

add_light("KeyLight_Amber", 'AREA', 320.0, (1.0, 0.78, 0.45), (3.2, -3.0, 3.5), (math.radians(45), 0, math.radians(42)))
add_light("FillLight_Violet", 'POINT', 220.0, (0.55, 0.25, 1.0), (-3.5, -2.2, 1.5))
add_light("RimLight_Cyan", 'POINT', 260.0, (0.2, 0.85, 1.0), (0.0, 3.2, -2.5))

# Камера
cam_data = bpy.data.cameras.new(name="Camera")
cam_data.lens = 55
cam_obj = bpy.data.objects.new("Camera", cam_data)
bpy.context.collection.objects.link(cam_obj)
cam_obj.location = (0.0, -5.2, 0.35)
cam_obj.rotation_euler = (math.radians(86), 0, 0)
scene.camera = cam_obj

# Збереження рендеру та .blend файлу
out_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")
os.makedirs(out_dir, exist_ok=True)

blend_path = os.path.join(out_dir, "d20_master_emblem.blend")
render_path = os.path.join(out_dir, "d20_emblem.png")

bpy.ops.wm.save_as_mainfile(filepath=blend_path)
scene.render.filepath = render_path
bpy.ops.render.render(write_still=True)
print(f"SUCCESS: Rendered 3D D20 emblem to {render_path}")
