#!/usr/bin/env python3
"""
Генератор 2.5D HD-2D Піксельної Сцени в Blender (Octopath Traveler / Sea of Stars стиль)
Створює файл `assets/chronicles_hd2d_scene.blend` з анімованими 2.5D спрайт-білбордами
усіх 6 героїв, Тарганячого Короля, Білого Коня з Чорною Зіркою та фоном локації.
"""

import math
import os
import bpy

ROOT_DIR = "/Users/ruslanbarbutsa/Desktop/Антігравіті/ГРА"
ASSETS_DIR = os.path.join(ROOT_DIR, "assets")
HERO_DIR = os.path.join(ASSETS_DIR, "heroes")
NPC_DIR = os.path.join(ASSETS_DIR, "npcs")
LOC_DIR = os.path.join(ASSETS_DIR, "locations")

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = 48
scene.render.fps = 24


def create_textured_plane(name, img_path, location, scale, is_transparent=True):
    bpy.ops.mesh.primitive_plane_add(size=2.0, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_euler = (math.radians(90), 0.0, 0.0)
    obj.scale = scale

    mat = bpy.data.materials.new(name=f"Mat_{name}")
    mat.use_nodes = True
    if is_transparent and hasattr(mat, "blend_method"):
        mat.blend_method = "CLIP"

    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    out_node = nodes.new(type="ShaderNodeOutputMaterial")
    bsdf = nodes.new(type="ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = 0.85
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.1

    tex_node = nodes.new(type="ShaderNodeTexImage")
    tex_node.interpolation = "Closest"  # Чіткий піксель-арт без розмиття!
    if os.path.exists(img_path):
        tex_node.image = bpy.data.images.load(img_path)

    links.new(tex_node.outputs["Color"], bsdf.inputs["Base Color"])
    if is_transparent and "Alpha" in bsdf.inputs:
        links.new(tex_node.outputs["Alpha"], bsdf.inputs["Alpha"])
    links.new(bsdf.outputs["BSDF"], out_node.inputs["Surface"])

    obj.data.materials.append(mat)
    return obj


# 1. Фон локації в стилі 2.5D діорами
bg_path = os.path.join(LOC_DIR, "loc_06_cockroach_pit.jpg")
create_textured_plane("HD2D_Location_Backdrop", bg_path, location=(0.0, 4.5, 2.2), scale=(5.2, 2.9, 1.0), is_transparent=False)

# 2. Кам'яна підлога арени
bpy.ops.mesh.primitive_plane_add(size=12.0, location=(0.0, 0.0, 0.0))
floor_obj = bpy.context.active_object
floor_obj.name = "HD2D_Arena_Floor"

# 3. 2.5D Спрайти 6 героїв зліва з плавною анімацією дихання та погойдування
heroes_layout = [
    ("Hero_Illusionist", os.path.join(HERO_DIR, "bard_idle.png"), (-3.4, 0.8, 0.95), 0),
    ("Hero_ShadowElf", os.path.join(HERO_DIR, "rogue_idle.png"), (-2.5, -0.2, 0.95), 4),
    ("Hero_ForestDruid", os.path.join(HERO_DIR, "mystic_idle.png"), (-1.7, 0.9, 0.95), 8),
    ("Hero_AstralWarlock", os.path.join(HERO_DIR, "warlock_action.png"), (-0.9, -0.3, 0.95), 12),
    ("Hero_Kharakternyk", os.path.join(HERO_DIR, "ranger_action.png"), (-0.1, 0.5, 0.95), 16),
    ("Hero_RunicGuardian", os.path.join(HERO_DIR, "guardian_idle.png"), (0.7, -0.5, 1.05), 20),
]

for h_name, h_img, loc, phase in heroes_layout:
    sp = create_textured_plane(h_name, h_img, location=loc, scale=(0.82, 0.95, 1.0), is_transparent=True)
    # Додаємо циклічну 2.5D анімацію
    for f in range(1, 49, 4):
        scene.frame_set(f)
        angle = ((f + phase) / 48.0) * 2.0 * math.pi
        sp.location.z = loc[2] + 0.06 * math.sin(angle)
        sp.scale.y = 0.95 + 0.03 * math.sin(angle)
        sp.keyframe_insert(data_path="location", index=2)
        sp.keyframe_insert(data_path="scale", index=1)

# 4. 2.5D Спрайти Босів та Істот справа
npcs_layout = [
    ("Boss_CockroachKing", os.path.join(NPC_DIR, "cockroach_king_1.png"), (2.6, 0.4, 1.15), (1.1, 1.2, 1.0)),
    ("NPC_WhiteHorseBlackStar", os.path.join(NPC_DIR, "white_horse_2.png"), (3.5, -0.6, 1.0), (0.95, 1.05, 1.0)),
]

for n_name, n_img, loc, sc in npcs_layout:
    np_obj = create_textured_plane(n_name, n_img, location=loc, scale=sc, is_transparent=True)
    for f in range(1, 49, 4):
        scene.frame_set(f)
        angle = (f / 48.0) * 2.0 * math.pi
        np_obj.location.z = loc[2] + 0.07 * math.cos(angle)
        np_obj.keyframe_insert(data_path="location", index=2)

# 5. Освітлення 2.5D діорами та Камера з легким паралаксом
bpy.ops.object.light_add(type="POINT", location=(-1.5, -1.8, 2.4))
light_left = bpy.context.active_object
light_left.data.energy = 180.0
light_left.data.color = (0.4, 0.85, 1.0)

bpy.ops.object.light_add(type="POINT", location=(2.5, -1.5, 2.5))
light_right = bpy.context.active_object
light_right.data.energy = 220.0
light_right.data.color = (0.2, 1.0, 0.65)

bpy.ops.object.camera_add(location=(0.0, -6.2, 1.85), rotation=(math.radians(82), 0.0, 0.0))
cam = bpy.context.active_object
scene.camera = cam
for f in range(1, 49, 6):
    scene.frame_set(f)
    angle = (f / 48.0) * 2.0 * math.pi
    cam.location.x = 0.35 * math.sin(angle)
    cam.keyframe_insert(data_path="location", index=0)

blend_out = os.path.join(ASSETS_DIR, "chronicles_hd2d_scene.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend_out)
print(f"Saved HD-2D animated Blender scene to: {blend_out}")
