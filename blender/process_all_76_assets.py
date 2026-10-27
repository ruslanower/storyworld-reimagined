#!/usr/bin/env python3
"""
Повна автоматична обробка усіх 76+ піксельних асетів із папки «зображення з гугл флоу»:
1. 12 локацій та підлокацій -> assets/locations/*.jpg
2. 6 ігрових класів персонажів (по 4 пози: front, back, idle, action) -> assets/heroes/<class>_<pose>.png (прозорий фон)
3. 10 NPC, босів та істот (по 3 пози: pose_1, pose_2, pose_3) -> assets/npcs/<npc>_<pose>.png (прозорий фон)
4. 48 унікальних предметів інвентарю та сюжетних артефактів -> assets/items/<artKey>.png (прозорий фон)
"""

import os
import shutil
import struct
import zlib
from collections import deque
import bpy
import numpy as np

ROOT_DIR = "/Users/ruslanbarbutsa/Desktop/Антігравіті/ГРА"
SRC_DIR = os.path.join(ROOT_DIR, "зображення з гугл флоу")
ASSETS_DIR = os.path.join(ROOT_DIR, "assets")
LOC_DIR = os.path.join(ASSETS_DIR, "locations")
HERO_DIR = os.path.join(ASSETS_DIR, "heroes")
NPC_DIR = os.path.join(ASSETS_DIR, "npcs")
ITEM_DIR = os.path.join(ASSETS_DIR, "items")

for d in (LOC_DIR, HERO_DIR, NPC_DIR, ITEM_DIR):
    os.makedirs(d, exist_ok=True)


def save_rgba_png(filepath, rgba_uint8):
    """Записує numpy-масив (H, W, 4) uint8 у PNG-файл зі збереженням прозорості."""
    h, w, c = rgba_uint8.shape
    assert c == 4
    raw_data = b"".join(b"\x00" + rgba_uint8[y].tobytes() for y in range(h))

    def make_chunk(chunk_type, data):
        chunk = struct.pack(">I", len(data)) + chunk_type + data
        crc = zlib.crc32(chunk_type + data) & 0xFFFFFFFF
        return chunk + struct.pack(">I", crc)

    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
    compressed = zlib.compress(raw_data, level=6)
    png_bytes = (
        b"\x89PNG\r\n\x1a\n"
        + make_chunk(b"IHDR", ihdr)
        + make_chunk(b"IDAT", compressed)
        + make_chunk(b"IEND", b"")
    )
    with open(filepath, "wb") as f:
        f.write(png_bytes)


def load_image_rgba_uint8(src_filename):
    """Завантажує зображення через Blender у форматі top-to-bottom (H, W, 4) uint8."""
    path = os.path.join(SRC_DIR, src_filename)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Missing source file: {path}")
    im = bpy.data.images.load(path)
    w, h = im.size
    arr = np.array(im.pixels[:], dtype=np.float32).reshape((h, w, 4))
    bpy.data.images.remove(im)
    arr = np.flipud(arr)  # top-to-bottom
    rgba = np.clip(arr * 255.0 + 0.5, 0, 255).astype(np.uint8)
    return rgba


def remove_white_bg_floodfill(rgba, white_thresh=232, sat_thresh=26):
    """
    Видаляє білий та світло-сірий фон методом flood-fill від країв кадру,
    зберігаючи білі елементи всередині самого спрайта (очі, бліки, зуби, білу шерсть коня).
    """
    h, w, _ = rgba.shape
    out = rgba.copy()
    r = out[:, :, 0].astype(np.int16)
    g = out[:, :, 1].astype(np.int16)
    b = out[:, :, 2].astype(np.int16)

    max_rgb = np.maximum(np.maximum(r, g), b)
    min_rgb = np.minimum(np.minimum(r, g), b)
    sat = max_rgb - min_rgb
    lum = (r + g + b) // 3

    # Пікселі, які можуть бути фоном (світлі малонасичені)
    is_bg_candidate = (min_rgb >= white_thresh) | ((lum >= 220) & (sat <= sat_thresh))

    visited = np.zeros((h, w), dtype=bool)
    q = deque()

    # Додаємо всі крайові пікселі
    for x in range(w):
        if is_bg_candidate[0, x]:
            visited[0, x] = True
            q.append((0, x))
        if is_bg_candidate[h - 1, x] and not visited[h - 1, x]:
            visited[h - 1, x] = True
            q.append((h - 1, x))
    for y in range(h):
        if is_bg_candidate[y, 0] and not visited[y, 0]:
            visited[y, 0] = True
            q.append((y, 0))
        if is_bg_candidate[y, w - 1] and not visited[y, w - 1]:
            visited[y, w - 1] = True
            q.append((y, w - 1))

    # 8-зв'язний BFS flood-fill від країв, який проходить крізь діагональні зазори,
    # але не чіпає білу шерсть коня, білі ковпаки кухарів та бліки зброї всередині контуру!
    dirs = ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1))
    while q:
        cy, cx = q.popleft()
        for dy, dx in dirs:
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
                if is_bg_candidate[ny, nx]:
                    visited[ny, nx] = True
                    q.append((ny, nx))

    bg_mask = visited
    out[bg_mask, 3] = 0

    # М'яке згладжування однопіксельної межі навколо контуру, щоб не було білого ореолу
    alpha = out[:, :, 3] > 0
    eroded = alpha.copy()
    eroded[1:, :] &= alpha[:-1, :]
    eroded[:-1, :] &= alpha[1:, :]
    eroded[:, 1:] &= alpha[:, :-1]
    eroded[:, :-1] &= alpha[:, 1:]
    border = alpha & (~eroded) & (lum >= 215) & (sat <= 30)
    out[border, 3] = 90

    return out


def crop_and_pad_sprite(rgba, target_w=240, target_h=280, bottom_align=True, pad_ratio=0.06):
    """
    Обрізає прозорі поля навколо спрайта та розміщує його у фіксованому каandрі
    (для персонажів і NPC — вирівнювання по нижньому краю, щоб усі стояли на одній лінії підлоги).
    """
    alpha = rgba[:, :, 3]
    ys, xs = np.where(alpha > 15)
    if len(xs) == 0 or len(ys) == 0:
        return np.zeros((target_h, target_w, 4), dtype=np.uint8)

    y0, y1 = int(ys.min()), int(ys.max()) + 1
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    cropped = rgba[y0:y1, x0:x1]
    ch, cw, _ = cropped.shape

    avail_w = int(target_w * (1.0 - 2 * pad_ratio))
    avail_h = int(target_h * (1.0 - 2 * pad_ratio))
    scale = min(avail_w / max(cw, 1), avail_h / max(ch, 1))

    new_w = max(1, int(round(cw * scale)))
    new_h = max(1, int(round(ch * scale)))

    # Nearest-neighbor масштабування для чіткого піксель-арту
    y_idx = np.clip((np.arange(new_h) / scale).astype(np.int32), 0, ch - 1)
    x_idx = np.clip((np.arange(new_w) / scale).astype(np.int32), 0, cw - 1)
    resized = cropped[y_idx][:, x_idx]

    canvas = np.zeros((target_h, target_w, 4), dtype=np.uint8)
    ox = (target_w - new_w) // 2
    if bottom_align:
        oy = target_h - new_h - int(target_h * pad_ratio * 0.6)
    else:
        oy = (target_h - new_h) // 2
    oy = max(0, min(target_h - new_h, oy))

    canvas[oy : oy + new_h, ox : ox + new_w] = resized
    return canvas


# ==============================================================================
# 1. КОПІЮВАННЯ ТА ОПТИМІЗАЦІЯ 12 ЛОКАЦІЙ ТА ПІДЛОКАЦІЙ
# ==============================================================================
LOCATIONS_MAP = {
    "loc_01_secret_tavern.jpg": "Underground_tavern_interior_pixe…_20261026235344.jpg",
    "loc_01_secret_tavern_alt.jpg": "Underground_medieval_tavern_inte…_20261026235344.jpg",
    "loc_02_alley_manhole.jpg": "Medieval_alleyway_at_night_durin…_20261026235344.jpg",
    "loc_02_alley_manhole_alt.jpg": "Medieval_cobblestone_alley_at_night_20261026235344.jpg",
    "loc_03_slippery_roof.jpg": "Medieval_rooftop_in_heavy_rain_20261026235344.jpg",
    "loc_03_slippery_roof_alt.jpg": "Pixel_art_medieval_rooftop_at_20261026235344.jpg",
    "loc_04_guard_post_street.jpg": "Medieval_city_street_checkpoint_…_20261026235344.jpg",
    "loc_05_sewer_outpost.jpg": "Pixel_art_sewer_dungeon_background_20261026235344_2.jpg",
    "loc_05_sewer_outpost_alt.jpg": "Pixel_art_sewer_dungeon_background_20261026235344.jpg",
    "loc_06_cockroach_pit.jpg": "Subterranean_cavern_boss_arena_b…_20261026235344.jpg",
    "loc_06_cockroach_pit_alt.jpg": "Underground_cavern_boss_arena_ba…_20261026235344.jpg",
    "loc_07_stablemaster_yard.jpg": "Pixel_art_medieval_stable_yard_20261026235344_2.jpg",
    "loc_07_stablemaster_yard_alt.jpg": "Pixel_art_medieval_stable_yard_20261026235344.jpg",
    "loc_08_castle_gate_bridge.jpg": "Dark_stone_castle_gatehouse_20261026235344.jpg",
    "loc_09_castle_feast.jpg": "Castle_courtyard_decorated_for_f…_20261026235344.jpg",
    "loc_09_castle_feast_alt.jpg": "Pixel_art_castle_courtyard_banquet_20261026235344.jpg",
    "loc_10_royal_stables_backyard.jpg": "Pixel_art_castle_stables_interior_20261026235344.jpg",
    "loc_11_castle_kitchen_hood.jpg": "Medieval_castle_kitchen_pixel_art_20261026235344.jpg",
    "loc_11_castle_kitchen_hood_alt.jpg": "Medieval_castle_kitchen_interior…_20261026235344.jpg",
    "loc_12_castle_plaza_evac.jpg": "Castle_gates_at_sunrise_20261026235344.jpg",
    "loc_12_castle_plaza_evac_alt.jpg": "Pixel_art_castle_gates_plaza_20261026235344.jpg",
}

print("--- 1. Обробка локацій ---")
for dst_name, src_name in LOCATIONS_MAP.items():
    src_path = os.path.join(SRC_DIR, src_name)
    dst_path = os.path.join(LOC_DIR, dst_name)
    shutil.copy2(src_path, dst_path)
    print(f"  [OK] Локація: {dst_name}")


# ==============================================================================
# 2. ОБРОБКА 6 ІГРОВИХ КЛАСІВ ПЕРСОНАЖІВ (ПО 4 ПОЗИ: front, back, idle, action)
# ==============================================================================
HERO_SHEETS_SPEC = {
    "bard": {
        "file": "Pixel_art_character_sprite_sheet_20261026235344_2.jpg",
        "rows": (175, 610),
        "cols": [(95, 325), (375, 685), (735, 940), (980, 1345)],
    },
    "rogue": {
        "file": "Pixel_character_sprite_sheet_20261026235344.jpg",
        "rows": (175, 590),
        "cols": [(75, 330), (360, 660), (690, 930), (970, 1315)],
    },
    "mystic": {
        "file": "Pixel_art_character_sprite_sheet_20261026235344_3.jpg",
        "rows": (180, 608),
        "cols": [(70, 275), (335, 665), (700, 925), (985, 1335)],
    },
    "warlock": {
        "file": "Astral_Ash_Warlock_sprite_sheet_20261026235344.jpg",
        "rows": (185, 622),
        "cols": [(70, 300), (350, 680), (725, 965), (980, 1350)],
    },
    "ranger": {
        "file": "Warrior_character_sprite_sheet_p…_20261026235344.jpg",
        "rows": (155, 612),
        "cols": [(80, 315), (395, 605), (670, 958), (978, 1342)],
    },
    "guardian": {
        "file": "Runic_Giant_Shieldbearer_pixel_s…_20261026235344.jpg",
        "rows": (160, 632),
        "cols": [(75, 355), (385, 695), (698, 932), (938, 1335)],
    },
}

POSE_NAMES = ["front", "back", "idle", "action"]

print("--- 2. Нарізка та видалення фону для 6 класів героїв (24 спрайти) ---")
for class_key, spec in HERO_SHEETS_SPEC.items():
    rgba_full = load_image_rgba_uint8(spec["file"])
    r0, r1 = spec["rows"]
    for pose_idx, (c0, c1) in enumerate(spec["cols"]):
        pose_name = POSE_NAMES[pose_idx]
        sub = rgba_full[r0:r1, c0:c1].copy()
        clean_sub = remove_white_bg_floodfill(sub)
        framed = crop_and_pad_sprite(clean_sub, target_w=240, target_h=280, bottom_align=True)
        out_path = os.path.join(HERO_DIR, f"{class_key}_{pose_name}.png")
        save_rgba_png(out_path, framed)
        print(f"  [OK] Герой {class_key} -> {pose_name}.png")


# ==============================================================================
# 3. ОБРОБКА 10 СЮЖЕТНИХ NPC, БОСІВ ТА ІСТОТ (ПО 3 ПОЗИ)
# ==============================================================================
NPC_SHEETS_SPEC = {
    "iron_knight": {
        "file": "Pixel_knight_sprite_sheet_20261026235344.jpg",
        "rows": (120, 608),
        "cols": [(70, 385), (425, 855), (895, 1330)],
    },
    "crossbow_patrol": {
        "file": "Pixel_enemy_sprite_sheet_20261026235344.jpg",
        "rows": (175, 608),
        "cols": [(35, 490), (510, 912), (915, 1352)],
    },
    "cockroach_guard": {
        "file": "Pixel_art_monster_sprite_sheet_20261026235344.jpg",
        "rows": (128, 655),
        "cols": [(80, 405), (412, 842), (848, 1345)],
    },
    "cockroach_king": {
        "file": "Cockroach_King_boss_sprite_sheet_20261026235344.jpg",
        "rows": (125, 570),
        "cols": [(68, 405), (468, 860), (885, 1335)],
    },
    "stablemaster_rodan": {
        "file": "Stablemaster_sprite_sheet_holdin…_20261026235344.jpg",
        "rows": (82, 685),
        "cols": [(120, 495), (610, 865), (1000, 1240)],
    },
    "white_horse": {
        "file": "White_warhorse_pixel_sprite_sheet_20261026235344.jpg",
        "rows": (82, 654),
        "cols": [(115, 305), (395, 868), (895, 1325)],
    },
    "usurper_king": {
        "file": "Pixel_art_king_boss_sprite_20261026235344.jpg",
        "rows": (182, 655),
        "cols": [(48, 392), (445, 905), (908, 1350)],
    },
    "birthday_prince": {
        "file": "Sprite_sheet_of_pointing_character_20261026235344.jpg",
        "rows": (82, 672),
        "cols": [(72, 425), (475, 850), (900, 1275)],
    },
    "castle_chef": {
        "file": "Pixel_art_NPC_sprite_group_20261026235344.jpg",
        "rows": (80, 700),
        "cols": [(115, 450), (600, 820), (950, 1218)],
    },
    "tavern_mages": {
        "file": "Pixel_art_mages_and_folk_20261026235344.jpg",
        "rows": (225, 542),
        "cols": [(120, 528), (555, 882), (905, 1245)],
    },
}

print("--- 3. Нарізка та видалення фону для 10 NPC і босів (30 спрайтів) ---")
for npc_key, spec in NPC_SHEETS_SPEC.items():
    rgba_full = load_image_rgba_uint8(spec["file"])
    r0, r1 = spec["rows"]
    for idx, (c0, c1) in enumerate(spec["cols"], 1):
        sub = rgba_full[r0:r1, c0:c1].copy()
        clean_sub = remove_white_bg_floodfill(sub)
        framed = crop_and_pad_sprite(clean_sub, target_w=240, target_h=280, bottom_align=True)
        out_path = os.path.join(NPC_DIR, f"{npc_key}_{idx}.png")
        save_rgba_png(out_path, framed)
        print(f"  [OK] NPC {npc_key} -> pose {idx}")

# Додатково зберігаємо високодетальний портрет-спрайт Тарганячого Короля
ck_single = remove_white_bg_floodfill(load_image_rgba_uint8("Cockroach_King_boss_pixel_art_20261026235344.jpg"))
save_rgba_png(
    os.path.join(NPC_DIR, "cockroach_king_boss.png"),
    crop_and_pad_sprite(ck_single, target_w=260, target_h=280, bottom_align=True),
)


# ==============================================================================
# 4. ОБРОБКА УСІХ 48 УНІКАЛЬНИХ ПРЕДМЕТІВ ІНВЕНТАРЮ ТА АРТЕФАКТІВ
# ==============================================================================
ITEMS_SPEC = {
    # Клас 1: Містичний Ілюзіоніст (7 предметів)
    "px_lute": "Enchanted_wooden_lute_icon_20261026235344.jpg",
    "px_cloak_mirage": "Dual-Faced_Mirage_Cloak_Inventor…_20261026235344.jpg",
    "px_ring_mirror": "Golden_ring_inventory_icon_20261026235344.jpg",
    "px_jester_mask": "Court_jester_masks_icon_20261026235344.jpg",
    "px_sleep_dust": "Purple_velvet_pouch_spilling_sle…_20261026235344.jpg",
    "px_tarot_cards": "Mystical_tarot_cards_icon_20261026235344.jpg",
    "px_fairy_potion": "Heart_crystal_vial_icon_20261026235344.jpg",
    # Клас 2: Тіньовий Ельф-Лазутчик (7 предметів)
    "px_twin_daggers": "Twin_Blackened_Elven_Daggers_20261026235344.jpg",
    "px_shadow_armor": "Night_Fox_leather_armor_icon_20261026235344.jpg",
    "px_night_goggles": "Brass_stealth_goggles_icon_20261026235344.jpg",
    "px_grappling_hook": "Grappling_hook_inventory_icon_20261026235344.jpg",
    "px_smoke_bombs": "Dark_obsidian_smoke_pellets_icon_20261026235344.jpg",
    "px_lockpicks": "Lockpick_inventory_icon_pixel_art_20261026235344.jpg",
    "px_shadow_vial": "Vial_of_glowing_violet_balm_20261026235344.jpg",
    # Клас 3: Лісовий Дух-Заклинатель (7 предметів)
    "px_insect_staff": "Druid_staff_inventory_icon_20261026235344.jpg",
    "px_moss_robe": "Emerald_moss_cloak_inventory_icon_20261026235344.jpg",
    "px_amber_heart": "Golden_amber_heart_amulet_icon_20261026235344.jpg",
    "px_honey_resin": "Golden_amber_honey_resin_cakes_20261026235344.jpg",
    "px_thorn_seeds": "Pouch_with_sprouting_briar_seeds_20261026235344.jpg",
    "px_firefly_lantern": "Walnut_shell_lantern_glowing_20261026235344.jpg",
    "px_dew_vial": "Emerald_fern_leaf_holding_dew_20261026235344.jpg",
    # Клас 4: Чаклун Астрального Попелу (7 предметів)
    "px_astral_orb": "Crystal_orb_pixel_art_icon_20261026235344.jpg",
    "px_warlock_robe": "Warlock_robes_inventory_icon_20261026235344.jpg",
    "px_wind_compass": "Brass_and_sapphire_compass_icon_20261026235344.jpg",
    "px_ash_pouch": "Dark_runic_pouch_with_ash_20261026235344.jpg",
    "px_silence_scroll": "Scroll_with_blue_rune_seal_20261026235344.jpg",
    "px_storm_crystal": "Blue_sapphire_crystal_icon_20261026235344.jpg",
    "px_ether_flask": "Pixel_art_alchemy_flask_20261026235344.jpg",
    # Клас 5: Характерник-Слідопит (7 предметів)
    "px_silver_saber": "Silver_saber_icon_on_white_20261026235344.jpg",
    "px_wolf_coat": "Leather_coat_inventory_icon_20261026235344.jpg",
    "px_silver_horseshoe": "Silver_horseshoe_talisman_icon_20261026235344.jpg",
    "px_royal_oats": "Pixel_art_bag_of_oats_20261026235344.jpg",
    "px_wax_seal": "Rolled_royal_decree_icon_20261026235344.jpg",
    "px_mini_crossbow": "Pixel_art_wooden_crossbow_icon_20261026235344.jpg",
    "px_herbal_balm": "Pixel_art_clay_flask_icon_20261026235344.jpg",
    # Клас 6: Рунічний Велет-Щитоносець (7 предметів)
    "px_runic_hammer": "Pixel_art_warhammer_inventory_icon_20261026235344.jpg",
    "px_tower_shield": "Blue_and_gold_tower_shield_20261026235344.jpg",
    "px_giant_belt": "Pixel_art_inventory_belt_icon_20261026235344.jpg",
    "px_iron_wedges": "Iron_door_wedges_and_chain_20261026235344.jpg",
    "px_runic_horn": "War_horn_inventory_icon_20261026235344.jpg",
    "px_oil_jug": "Dark_ceramic_jug_dripping_oil_20261026235344.jpg",
    "px_giant_ale": "Giant_ale_tankard_pixel_art_20261026235344.jpg",
    # 6 Сюжетних Артефактів та Трофеїв Історії
    "toxin_flask": "Toxin_flask_inventory_icon_20261026235344.jpg",
    "px_knight_disguise": "Knight_armor_inventory_icon_pixe…_20261026235344.jpg",
    "px_anti_magic_shackles": "Pixel_art_iron_shackles_icon_20261026235344.jpg",
    "px_cockroach_seal": "Amber_chitin_medallion_inventory…_20261026235344.jpg",
    "px_wife_charm": "Pixel_art_linen_amulet_icon_20261026235344.jpg",
    "px_broken_crown": "Cracked_iron_crown_icon_20261026235344.jpg",
}

print("--- 4. Вирізання фону для 48 унікальних предметів інвентарю ---")
for item_key, fname in ITEMS_SPEC.items():
    rgba_item = load_image_rgba_uint8(fname)
    # Деякі іконки можуть мати тонкий підпис внизу, тому беремо центральну частину без країв 4%
    ih, iw, _ = rgba_item.shape
    clean_item = remove_white_bg_floodfill(rgba_item)
    framed_item = crop_and_pad_sprite(clean_item, target_w=160, target_h=160, bottom_align=False, pad_ratio=0.07)
    out_path = os.path.join(ITEM_DIR, f"{item_key}.png")
    save_rgba_png(out_path, framed_item)
    print(f"  [OK] Предмет: {item_key}.png")

print("=== УСІ 76+ АСЕТІВ УСПІШНО ОБРОБЛЕНО І ЗБЕРЕЖЕНО В assets/ ===")
