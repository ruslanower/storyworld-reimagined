import bpy
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(BASE_DIR, "assets", "items")
FRAMES_DIR = os.path.join(OUT_DIR, "sword_frames")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.file_preview_type = 'NONE'
scene = bpy.context.scene
scene.render.resolution_x = 384
scene.render.resolution_y = 384
scene.render.fps = 12
scene.frame_start = 1
scene.frame_end = 48

seq = scene.sequence_editor_create()
strips = getattr(seq, "strips", None) or getattr(seq, "sequences", None)

bg_strip = strips.new_effect(
    name="DarkBG",
    type='COLOR',
    channel=1,
    frame_start=1,
    length=48
)
bg_strip.color = (0.06, 0.08, 0.13)

first_frame = os.path.join(FRAMES_DIR, "frame_001.png")
for cycle in range(2):
    start_f = 1 + cycle * 24
    img_strip = strips.new_image(
        name=f"SwordTurntable_{cycle}",
        filepath=first_frame,
        channel=2,
        frame_start=start_f
    )
    img_strip.blend_type = 'ALPHA_OVER'
    for i in range(2, 25):
        img_strip.elements.append(f"frame_{i:03d}.png")

scene.render.use_sequencer = True
scene.render.image_settings.file_format = 'FFMPEG'
scene.render.ffmpeg.format = 'MPEG4'
scene.render.ffmpeg.codec = 'H264'
scene.render.ffmpeg.constant_rate_factor = 'HIGH'
mp4_path = os.path.join(OUT_DIR, "item_sword_anim.mp4")
scene.render.filepath = mp4_path

bpy.ops.render.render(animation=True)
print(f"SAVED_MP4: {mp4_path}")
