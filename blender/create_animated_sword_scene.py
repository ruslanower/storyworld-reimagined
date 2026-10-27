import bpy
import bmesh
import math
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(BASE_DIR, "assets", "items")
FRAMES_DIR = os.path.join(OUT_DIR, "sword_frames")
os.makedirs(FRAMES_DIR, exist_ok=True)


def make_material(
    name,
    base_color,
    metallic=0.0,
    roughness=0.3,
    emission_color=None,
    emission_strength=0.0
):
    mat = bpy.data.materials.new(name=name)
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = base_color
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        if emission_color and "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = emission_color
        if emission_strength > 0 and "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat


def add_bevel_and_smooth(obj, width=0.02, segments=2):
    bevel = obj.modifiers.new(name="Bevel", type='BEVEL')
    bevel.width = width
    bevel.segments = segments
    for poly in obj.data.polygons:
        poly.use_smooth = True


def build_animated_sword_scene():
    # Скидаємо стандартний куб та очищаємо об'єкти, зберігаючи віконний інтерфейс Blender (UI layout)
    bpy.context.preferences.filepaths.file_preview_type = 'NONE'
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)

    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = 48
    scene.render.fps = 24

    # Для рендеру анімації у фоновому режимі використовуємо Cycles
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 16
    scene.render.film_transparent = True
    scene.render.resolution_x = 384
    scene.render.resolution_y = 384
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'

    # Темне студійне оточення
    if not scene.world:
        scene.world = bpy.data.worlds.new("SwordStudioWorld")
    w_nodes = scene.world.node_tree.nodes
    bg = w_nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (0.04, 0.05, 0.09, 1.0)
        bg.inputs["Strength"].default_value = 1.0

    # Матеріали
    mat_steel = make_material(
        "ForgedSteel",
        base_color=(0.82, 0.88, 0.98, 1.0),
        metallic=0.96,
        roughness=0.14
    )
    mat_fuller_glow = make_material(
        "RunicSteelGlow",
        base_color=(0.30, 0.78, 1.0, 1.0),
        metallic=0.4,
        roughness=0.2,
        emission_color=(0.20, 0.70, 1.0, 1.0),
        emission_strength=4.5
    )
    mat_gold = make_material(
        "RoyalGold",
        base_color=(1.0, 0.74, 0.18, 1.0),
        metallic=0.94,
        roughness=0.18
    )
    mat_leather = make_material(
        "DarkLeather",
        base_color=(0.28, 0.12, 0.05, 1.0),
        metallic=0.05,
        roughness=0.60
    )
    mat_ruby = make_material(
        "RubyGem",
        base_color=(0.95, 0.10, 0.22, 1.0),
        metallic=0.15,
        roughness=0.08,
        emission_color=(1.0, 0.16, 0.28, 1.0),
        emission_strength=4.8
    )

    # Батьківський контролер левітації та нахилу меча
    float_rig = bpy.data.objects.new("Sword_Float_Rig", None)
    bpy.context.collection.objects.link(float_rig)
    float_rig.empty_display_type = 'ARROWS'
    float_rig.empty_display_size = 0.6

    # Внутрішній контролер безперервного обертання (Turntable 360°)
    spin_rig = bpy.data.objects.new("Sword_Spin_Turntable", None)
    bpy.context.collection.objects.link(spin_rig)
    spin_rig.empty_display_type = 'CIRCLE'
    spin_rig.empty_display_size = 0.8
    spin_rig.parent = float_rig

    # Лезо меча з ромбовидним перерізом
    mesh = bpy.data.meshes.new("SwordBladeMesh")
    blade_obj = bpy.data.objects.new("Sword_Blade", mesh)
    bpy.context.collection.objects.link(blade_obj)
    blade_obj.parent = spin_rig

    bm = bmesh.new()
    sections = [
        (-0.38, 0.23, 0.068),
        (0.40,  0.20, 0.060),
        (1.15,  0.16, 0.050),
        (1.58,  0.11, 0.038),
    ]
    rings = []
    for z, w, t in sections:
        v_right = bm.verts.new((w, 0.0, z))
        v_front = bm.verts.new((0.0, -t, z))
        v_left = bm.verts.new((-w, 0.0, z))
        v_back = bm.verts.new((0.0, t, z))
        rings.append([v_right, v_front, v_left, v_back])

    v_tip = bm.verts.new((0.0, 0.0, 2.02))

    for i in range(len(rings) - 1):
        r1 = rings[i]
        r2 = rings[i + 1]
        for j in range(4):
            jn = (j + 1) % 4
            bm.faces.new([r1[j], r1[jn], r2[jn], r2[j]])

    last_r = rings[-1]
    for j in range(4):
        jn = (j + 1) % 4
        bm.faces.new([last_r[j], last_r[jn], v_tip])

    bm.faces.new([rings[0][3], rings[0][2], rings[0][1], rings[0][0]])
    bm.normal_update()
    bm.to_mesh(mesh)
    bm.free()
    blade_obj.data.materials.append(mat_steel)

    # Дол меча з обох боків леза (щоб при обертанні на 360° світилися обидві грані)
    for y_side in (-0.054, 0.054):
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.024, depth=1.58, location=(0.0, y_side, 0.45))
        fuller = bpy.context.active_object
        fuller.parent = spin_rig
        fuller.data.materials.append(mat_fuller_glow)

    # Золота хрестовина (Гарда)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, 0.0, -0.42))
    guard = bpy.context.active_object
    guard.name = "Sword_Crossguard"
    guard.scale = (1.16, 0.16, 0.11)
    guard.parent = spin_rig
    add_bevel_and_smooth(guard, width=0.025, segments=3)
    guard.data.materials.append(mat_gold)

    for side in (-1, 1):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.115, location=(side * 0.58, 0.0, -0.41))
        tip_cap = bpy.context.active_object
        tip_cap.scale = (1.15, 0.80, 1.25)
        tip_cap.parent = spin_rig
        tip_cap.data.materials.append(mat_gold)

    # Рубіни з обох сторін хрестовини
    for y_gem in (-0.10, 0.10):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.10, location=(0.0, y_gem, -0.42))
        gem = bpy.context.active_object
        gem.scale = (1.05, 0.65, 1.25)
        gem.parent = spin_rig
        gem.data.materials.append(mat_ruby)

    # Шкіряне руків'я
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.088, depth=0.78, location=(0.0, 0.0, -0.86))
    grip = bpy.context.active_object
    grip.name = "Sword_Grip"
    grip.scale = (1.15, 0.85, 1.0)
    grip.parent = spin_rig
    add_bevel_and_smooth(grip, width=0.01)
    grip.data.materials.append(mat_leather)

    for z_ring in (-0.64, -0.86, -1.08):
        bpy.ops.mesh.primitive_torus_add(
            major_radius=0.095,
            minor_radius=0.016,
            location=(0.0, 0.0, z_ring)
        )
        ring = bpy.context.active_object
        ring.scale = (1.15, 0.85, 1.0)
        ring.parent = spin_rig
        ring.data.materials.append(mat_gold)

    # Навершя (Pommel)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.165, location=(0.0, 0.0, -1.34))
    pommel = bpy.context.active_object
    pommel.name = "Sword_Pommel"
    pommel.scale = (1.15, 0.85, 1.15)
    pommel.parent = spin_rig
    pommel.data.materials.append(mat_gold)

    # Магічне енергетичне кільце, що обертається навколо клинка
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.95,
        minor_radius=0.018,
        major_segments=64,
        minor_segments=12,
        location=(0.0, 0.0, 0.15)
    )
    aura_ring = bpy.context.active_object
    aura_ring.name = "Magic_Aura_Ring"
    aura_ring.parent = float_rig
    aura_ring.data.materials.append(mat_fuller_glow)

    # ========================================================================
    # АНІМАЦІЯ КЛЮЧОВИХ КАДРІВ (KEYFRAMES: Кадри 1..48)
    # ========================================================================
    # 1. Плавна левітація вгору-вниз та благородний нахил меча
    float_rig.rotation_euler = (math.radians(10), math.radians(-34), math.radians(-8))
    float_rig.location = (-0.08, 0.0, -0.26)
    float_rig.keyframe_insert(data_path="location", frame=1)
    float_rig.keyframe_insert(data_path="rotation_euler", frame=1)

    float_rig.location = (-0.08, 0.0, -0.06)
    float_rig.rotation_euler = (math.radians(14), math.radians(-30), math.radians(-4))
    float_rig.keyframe_insert(data_path="location", frame=25)
    float_rig.keyframe_insert(data_path="rotation_euler", frame=25)

    float_rig.location = (-0.08, 0.0, -0.26)
    float_rig.rotation_euler = (math.radians(10), math.radians(-34), math.radians(-8))
    float_rig.keyframe_insert(data_path="location", frame=49)
    float_rig.keyframe_insert(data_path="rotation_euler", frame=49)

    # 2. Повне 360-градусне обертання меча навколо власної осі Z
    spin_rig.rotation_euler = (0.0, 0.0, 0.0)
    spin_rig.keyframe_insert(data_path="rotation_euler", frame=1)
    spin_rig.rotation_euler = (0.0, 0.0, math.radians(360))
    spin_rig.keyframe_insert(data_path="rotation_euler", frame=49)

    # Лінійна інтерполяція для ідеального безшовного циклу обертання
    if spin_rig.animation_data and spin_rig.animation_data.action:
        act = spin_rig.animation_data.action
        if hasattr(act, "fcurves"):
            for fc in act.fcurves:
                for kp in fc.keyframe_points:
                    kp.interpolation = 'LINEAR'

    # 3. Анімація магічного кільця навколо меча
    aura_ring.rotation_euler = (math.radians(65), math.radians(15), 0.0)
    aura_ring.keyframe_insert(data_path="rotation_euler", frame=1)
    aura_ring.rotation_euler = (math.radians(65), math.radians(-15), math.radians(-360))
    aura_ring.keyframe_insert(data_path="rotation_euler", frame=49)

    # Освітлення та Камера
    def add_light(name, ltype, energy, color, loc, rot=(0, 0, 0), size=2.5):
        light_data = bpy.data.lights.new(name=name, type=ltype)
        light_data.energy = energy
        light_data.color = color
        if ltype == 'AREA':
            light_data.size = size
        light_obj = bpy.data.objects.new(name=name, object_data=light_data)
        bpy.context.collection.objects.link(light_obj)
        light_obj.location = loc
        light_obj.rotation_euler = rot

    add_light("KeyLight_Warm", 'AREA', 460.0, (1.0, 0.94, 0.84), (3.2, -3.5, 3.6), (math.radians(48), 0, math.radians(40)), size=3.2)
    add_light("FillLight_Cool", 'AREA', 310.0, (0.48, 0.76, 1.0), (-3.5, -2.8, 1.8), (math.radians(60), 0, math.radians(-48)), size=2.8)
    add_light("BladeSpec_Front", 'AREA', 220.0, (0.88, 0.94, 1.0), (0.6, -4.2, 0.8), (math.radians(82), 0, math.radians(8)), size=2.4)
    add_light("RimLight_Gold", 'POINT', 340.0, (1.0, 0.72, 0.25), (0.0, 2.8, -2.2))

    cam_data = bpy.data.cameras.new(name="ItemCamera")
    cam_data.lens = 62
    cam_obj = bpy.data.objects.new("ItemCamera", cam_data)
    bpy.context.collection.objects.link(cam_obj)
    cam_obj.location = (0.0, -5.5, 0.0)
    cam_obj.rotation_euler = (math.radians(90), 0, 0)
    scene.camera = cam_obj

    # Зберігаємо .blend файл для відкриття у графічному вікні Blender
    blend_path = os.path.join(OUT_DIR, "inventory_sword_animated.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f"SAVED_ANIMATED_BLEND: {blend_path}")

    # Рендеримо 24 кадри повного циклу (крок 2 кадри для швидкого та плавного відео-лупу)
    out_idx = 1
    for f in range(1, 49, 2):
        scene.frame_set(f)
        frame_file = os.path.join(FRAMES_DIR, f"frame_{out_idx:03d}.png")
        scene.render.filepath = frame_file
        bpy.ops.render.render(write_still=True)
        out_idx += 1

    print("FINISHED_RENDERING_ANIMATION_FRAMES")


if __name__ == "__main__":
    build_animated_sword_scene()
