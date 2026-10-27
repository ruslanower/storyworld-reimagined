import bpy
import bmesh
import math
import os

# Базова директорія для збереження 3D-рендерів предметів інвентарю
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(BASE_DIR, "assets", "items")
os.makedirs(OUT_DIR, exist_ok=True)


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.file_preview_type = 'NONE'
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 42
    scene.render.film_transparent = True
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'

    world = bpy.data.worlds.new("ItemStudioWorld")
    scene.world = world
    w_nodes = world.node_tree.nodes
    bg = w_nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (0.04, 0.05, 0.09, 1.0)
        bg.inputs["Strength"].default_value = 0.9
    return scene


def make_material(
    name,
    base_color,
    metallic=0.0,
    roughness=0.3,
    emission_color=None,
    emission_strength=0.0,
    transmission=0.0,
    ior=1.45,
    alpha=1.0
):
    mat = bpy.data.materials.new(name=name)
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = base_color
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        if "Alpha" in bsdf.inputs:
            bsdf.inputs["Alpha"].default_value = alpha
        if "IOR" in bsdf.inputs:
            bsdf.inputs["IOR"].default_value = ior
        if "Transmission Weight" in bsdf.inputs:
            bsdf.inputs["Transmission Weight"].default_value = transmission
        elif "Transmission" in bsdf.inputs:
            bsdf.inputs["Transmission"].default_value = transmission
        if emission_color and "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = emission_color
        if emission_strength > 0 and "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat


def setup_studio_camera_and_lights(scene):
    def add_light(name, ltype, energy, color, loc, rot=(0, 0, 0), size=2.0):
        light_data = bpy.data.lights.new(name=name, type=ltype)
        light_data.energy = energy
        light_data.color = color
        if ltype == 'AREA':
            light_data.size = size
        light_obj = bpy.data.objects.new(name=name, object_data=light_data)
        bpy.context.collection.objects.link(light_obj)
        light_obj.location = loc
        light_obj.rotation_euler = rot
        return light_obj

    add_light("KeyLight_Warm", 'AREA', 450.0, (1.0, 0.94, 0.84), (3.2, -3.5, 3.6), (math.radians(48), 0, math.radians(40)), size=3.2)
    add_light("FillLight_Cool", 'AREA', 300.0, (0.48, 0.76, 1.0), (-3.5, -2.8, 1.8), (math.radians(60), 0, math.radians(-48)), size=2.8)
    add_light("BladeSpec_Front", 'AREA', 210.0, (0.88, 0.94, 1.0), (0.6, -4.2, 0.8), (math.radians(82), 0, math.radians(8)), size=2.4)
    add_light("RimLight_Gold", 'POINT', 340.0, (1.0, 0.72, 0.25), (0.0, 2.8, -2.2))

    cam_data = bpy.data.cameras.new(name="ItemCamera")
    cam_data.lens = 65
    cam_obj = bpy.data.objects.new("ItemCamera", cam_data)
    bpy.context.collection.objects.link(cam_obj)
    cam_obj.location = (0.0, -5.4, 0.0)
    cam_obj.rotation_euler = (math.radians(90), 0, 0)
    scene.camera = cam_obj
    return cam_obj


def add_bevel_and_smooth(obj, width=0.02, segments=2):
    bevel = obj.modifiers.new(name="Bevel", type='BEVEL')
    bevel.width = width
    bevel.segments = segments
    for poly in obj.data.polygons:
        poly.use_smooth = True


# ============================================================================
# 1. СТАЛЕВИЙ МЕЧ (item_sword.png)
# ============================================================================
def build_steel_sword(parent_empty):
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
        emission_strength=4.2
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
        emission_strength=4.5
    )

    # Лезо меча з ромбовидним перерізом та гострим вістрям
    mesh = bpy.data.meshes.new("SwordBladeMesh")
    blade_obj = bpy.data.objects.new("Sword_Blade", mesh)
    bpy.context.collection.objects.link(blade_obj)
    blade_obj.parent = parent_empty

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

    # Дол меча (світна рунічна смуга по центру клинка)
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.024, depth=1.58, location=(0.0, -0.054, 0.45))
    fuller = bpy.context.active_object
    fuller.name = "Sword_Fuller_Rune"
    fuller.parent = parent_empty
    fuller.data.materials.append(mat_fuller_glow)

    # Золота хрестовина (Гарда) — суцільна, ширина 1.16 (від -0.58 до +0.58)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, 0.0, -0.42))
    guard = bpy.context.active_object
    guard.name = "Sword_Crossguard"
    guard.scale = (1.16, 0.16, 0.11)
    guard.parent = parent_empty
    add_bevel_and_smooth(guard, width=0.025, segments=3)
    guard.data.materials.append(mat_gold)

    # Декоративні кінцівки гарди точно на торцях хрестовини (x = ±0.58)
    for side in (-1, 1):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.115, location=(side * 0.58, 0.0, -0.41))
        tip_cap = bpy.context.active_object
        tip_cap.scale = (1.15, 0.80, 1.25)
        tip_cap.parent = parent_empty
        tip_cap.data.materials.append(mat_gold)

    # Центральний рубін у хрестовині
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.10, location=(0.0, -0.10, -0.42))
    gem = bpy.context.active_object
    gem.name = "Sword_Guard_Gem"
    gem.scale = (1.05, 0.65, 1.25)
    gem.parent = parent_empty
    gem.data.materials.append(mat_ruby)

    # Шкіряне руків'я (Grip)
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.088, depth=0.78, location=(0.0, 0.0, -0.86))
    grip = bpy.context.active_object
    grip.name = "Sword_Grip"
    grip.scale = (1.15, 0.85, 1.0)
    grip.parent = parent_empty
    add_bevel_and_smooth(grip, width=0.01)
    grip.data.materials.append(mat_leather)

    # Золоті кільця-обмотки на руків'ї
    for z_ring in (-0.64, -0.86, -1.08):
        bpy.ops.mesh.primitive_torus_add(
            major_radius=0.095,
            minor_radius=0.016,
            location=(0.0, 0.0, z_ring)
        )
        ring = bpy.context.active_object
        ring.scale = (1.15, 0.85, 1.0)
        ring.parent = parent_empty
        ring.data.materials.append(mat_gold)

    # Навершя (Pommel)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.165, location=(0.0, 0.0, -1.34))
    pommel = bpy.context.active_object
    pommel.name = "Sword_Pommel"
    pommel.scale = (1.15, 0.85, 1.15)
    pommel.parent = parent_empty
    pommel.data.materials.append(mat_gold)

    parent_empty.rotation_euler = (math.radians(8), math.radians(-42), math.radians(-12))
    parent_empty.location = (-0.12, 0.0, -0.20)


# ============================================================================
# 2. АЛХІМІЧНІ ЗІЛЛЯ (item_potion_blue.png та item_potion_red.png)
# ============================================================================
def build_potion(parent_empty, liquid_color, glow_color):
    mat_glass = make_material(
        "AlchemicalGlass",
        base_color=(0.88, 0.95, 1.0, 1.0),
        metallic=0.10,
        roughness=0.05,
        alpha=0.26
    )
    mat_liquid = make_material(
        "MagicElixir",
        base_color=liquid_color,
        metallic=0.15,
        roughness=0.12,
        emission_color=glow_color,
        emission_strength=3.6
    )
    mat_liquid_top = make_material(
        "MagicElixirMeniscus",
        base_color=(
            min(1.0, liquid_color[0] + 0.25),
            min(1.0, liquid_color[1] + 0.25),
            min(1.0, liquid_color[2] + 0.25),
            1.0
        ),
        metallic=0.1,
        roughness=0.08,
        emission_color=glow_color,
        emission_strength=5.2
    )
    mat_gold = make_material(
        "FlaskGoldTrim",
        base_color=(1.0, 0.76, 0.20, 1.0),
        metallic=0.94,
        roughness=0.18
    )
    mat_cork = make_material(
        "CorkStopper",
        base_color=(0.58, 0.36, 0.18, 1.0),
        metallic=0.0,
        roughness=0.75
    )

    # Прозора скляна колба
    bpy.ops.mesh.primitive_uv_sphere_add(segments=36, ring_count=24, radius=1.04, location=(0.0, 0.0, -0.32))
    flask = bpy.context.active_object
    flask.scale = (1.0, 1.0, 0.96)
    flask.parent = parent_empty
    for poly in flask.data.polygons:
        poly.use_smooth = True
    flask.data.materials.append(mat_glass)

    # Рідина всередині колби (заповнена на 65% висоти з плоским меніском зверху)
    liq_mesh = bpy.data.meshes.new("LiquidBodyMesh")
    liq_obj = bpy.data.objects.new("Potion_Liquid", liq_mesh)
    bpy.context.collection.objects.link(liq_obj)
    liq_obj.location = (0.0, 0.0, -0.32)
    liq_obj.scale = (0.91, 0.91, 0.88)
    liq_obj.parent = parent_empty

    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=36, v_segments=24, radius=1.0)
    # Відсікаємо верхню частину кулі вище z = 0.18, створюючи чіткий рівень рідини у колбі
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    bmesh.ops.bisect_plane(
        bm,
        geom=geom,
        plane_co=(0.0, 0.0, 0.18),
        plane_no=(0.0, 0.0, 1.0),
        clear_outer=True,
        use_snap_center=False
    )
    # Заповнюємо верхній переріз (меніск рідини)
    boundary_edges = [e for e in bm.edges if e.is_boundary]
    if boundary_edges:
        bmesh.ops.edgeloop_fill(bm, edges=boundary_edges)

    bm.normal_update()
    bm.to_mesh(liq_mesh)
    bm.free()

    liq_obj.data.materials.append(mat_liquid)
    liq_obj.data.materials.append(mat_liquid_top)
    for poly in liq_obj.data.polygons:
        poly.use_smooth = True
        if poly.normal.z > 0.85:
            poly.material_index = 1

    # Шийка колби
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.34, depth=0.68, location=(0.0, 0.0, 0.72))
    neck = bpy.context.active_object
    neck.parent = parent_empty
    for poly in neck.data.polygons:
        poly.use_smooth = True
    neck.data.materials.append(mat_glass)

    # Золотий обідок горловини та нижня оправа
    bpy.ops.mesh.primitive_torus_add(major_radius=0.38, minor_radius=0.068, location=(0.0, 0.0, 0.98))
    rim = bpy.context.active_object
    rim.parent = parent_empty
    rim.data.materials.append(mat_gold)

    bpy.ops.mesh.primitive_torus_add(major_radius=0.36, minor_radius=0.048, location=(0.0, 0.0, 0.48))
    collar = bpy.context.active_object
    collar.parent = parent_empty
    collar.data.materials.append(mat_gold)

    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.60, depth=0.15, location=(0.0, 0.0, -1.26))
    base_ring = bpy.context.active_object
    base_ring.parent = parent_empty
    add_bevel_and_smooth(base_ring, width=0.02)
    base_ring.data.materials.append(mat_gold)

    # Коркова пробка зверху
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.28, radius2=0.35, depth=0.44, location=(0.0, 0.0, 1.18))
    cork = bpy.context.active_object
    cork.parent = parent_empty
    add_bevel_and_smooth(cork, width=0.02)
    cork.data.materials.append(mat_cork)

    parent_empty.rotation_euler = (math.radians(12), math.radians(-14), math.radians(6))
    parent_empty.location = (0.0, 0.0, -0.05)


# ============================================================================
# 3. УЛАМОК ЛЬОДОВОГО КРИСТАЛУ (item_crystal_blue.png)
# ============================================================================
def build_ice_crystal(parent_empty):
    mat_crystal = make_material(
        "ArcaneIceCrystal",
        base_color=(0.08, 0.62, 1.0, 1.0),
        metallic=0.35,
        roughness=0.10,
        emission_color=(0.08, 0.58, 1.0, 1.0),
        emission_strength=3.2
    )
    mat_base_rock = make_material(
        "ObsidianShardBase",
        base_color=(0.10, 0.12, 0.20, 1.0),
        metallic=0.70,
        roughness=0.32
    )

    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.78, location=(0.0, 0.0, -0.95))
    rock = bpy.context.active_object
    rock.scale = (1.35, 1.1, 0.55)
    rock.parent = parent_empty
    rock.data.materials.append(mat_base_rock)

    shards = [
        ((0.0, 0.0, 0.18), (0.54, 0.46, 1.45), (0.08, -0.05, 0.2)),
        ((-0.55, -0.12, -0.18), (0.38, 0.34, 1.04), (0.15, -0.38, -0.3)),
        ((0.58, -0.10, -0.22), (0.40, 0.35, 0.98), (0.12, 0.42, 0.4)),
        ((-0.25, -0.42, -0.45), (0.30, 0.28, 0.70), (0.35, -0.22, 0.1)),
        ((0.30, -0.40, -0.48), (0.28, 0.26, 0.66), (0.32, 0.25, -0.2)),
    ]
    for loc, scl, rot in shards:
        bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=0.62, radius2=0.04, depth=1.8, location=loc)
        shard = bpy.context.active_object
        shard.scale = scl
        shard.rotation_euler = rot
        shard.parent = parent_empty
        bevel = shard.modifiers.new(name="Bevel", type='BEVEL')
        bevel.width = 0.025
        bevel.segments = 1
        shard.data.materials.append(mat_crystal)

    parent_empty.rotation_euler = (math.radians(12), math.radians(-10), math.radians(8))


# ============================================================================
# 4. СТАРОВИННІ ЗОЛОТІ ДУКАТИ (item_coin_gold.png)
# ============================================================================
def build_gold_coins(parent_empty):
    mat_gold = make_material(
        "MintGold",
        base_color=(1.0, 0.75, 0.14, 1.0),
        metallic=0.96,
        roughness=0.16
    )
    mat_gold_glow = make_material(
        "EmblemStarGlow",
        base_color=(1.0, 0.88, 0.36, 1.0),
        metallic=0.88,
        roughness=0.14,
        emission_color=(1.0, 0.75, 0.18, 1.0),
        emission_strength=1.8
    )

    # Головна монета на передньому плані зліва (y = -0.58, щоб не перетинатися зі стопкою позаду)
    coin_loc = (-0.28, -0.58, 0.05)
    coin_rot = (math.radians(76), math.radians(-10), math.radians(16))

    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=1.02, depth=0.18, location=coin_loc, rotation=coin_rot)
    main_coin = bpy.context.active_object
    main_coin.parent = parent_empty
    add_bevel_and_smooth(main_coin, width=0.025, segments=2)
    main_coin.data.materials.append(mat_gold)

    bpy.ops.mesh.primitive_torus_add(major_radius=0.89, minor_radius=0.068, location=(-0.28, -0.66, 0.07), rotation=coin_rot)
    coin_rim = bpy.context.active_object
    coin_rim.parent = parent_empty
    coin_rim.data.materials.append(mat_gold)

    # 8-променева карбована зірка в центрі дуката
    for angle_deg in (0, 45):
        bpy.ops.mesh.primitive_cube_add(size=0.62, location=(-0.28, -0.66, 0.07))
        star_part = bpy.context.active_object
        star_part.scale = (0.72, 0.72, 0.14)
        star_part.rotation_euler = (math.radians(76), math.radians(-10), math.radians(16 + angle_deg))
        star_part.parent = parent_empty
        add_bevel_and_smooth(star_part, width=0.02, segments=2)
        star_part.data.materials.append(mat_gold_glow)

    # Стопка золотих дукатів позаду справа (y = 0.45, x = 0.62)
    for i in range(5):
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=40,
            radius=0.84,
            depth=0.18,
            location=(0.62 + (i % 2) * 0.04, 0.45, -0.72 + i * 0.21),
            rotation=(math.radians(12), math.radians(6), math.radians(i * 15))
        )
        stack_coin = bpy.context.active_object
        stack_coin.parent = parent_empty
        add_bevel_and_smooth(stack_coin, width=0.02, segments=2)
        stack_coin.data.materials.append(mat_gold)


def render_single_item(builder_fn, filename, *args):
    scene = reset_scene()
    setup_studio_camera_and_lights(scene)
    root = bpy.data.objects.new("ItemRoot", None)
    bpy.context.collection.objects.link(root)
    builder_fn(root, *args)

    out_path = os.path.join(OUT_DIR, filename)
    scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print(f"RENDERED_ITEM: {out_path}")
    return scene


if __name__ == "__main__":
    scene = render_single_item(build_steel_sword, "item_sword.png")
    blend_path = os.path.join(OUT_DIR, "inventory_sword_3d.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f"SAVED_BLEND: {blend_path}")

    render_single_item(
        build_potion,
        "item_potion_blue.png",
        (0.02, 0.42, 1.0, 1.0),
        (0.06, 0.58, 1.0, 1.0)
    )

    render_single_item(
        build_potion,
        "item_potion_red.png",
        (0.92, 0.04, 0.14, 1.0),
        (1.0, 0.12, 0.20, 1.0)
    )

    render_single_item(build_ice_crystal, "item_crystal_blue.png")
    render_single_item(build_gold_coins, "item_coin_gold.png")
