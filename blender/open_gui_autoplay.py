import bpy


def start_viewport_animation():
    for window in bpy.context.window_manager.windows:
        for area in window.screen.areas:
            if area.type == 'VIEW_3D':
                for space in area.spaces:
                    if space.type == 'VIEW_3D':
                        space.shading.type = 'MATERIAL'
                        space.region_3d.view_perspective = 'CAMERA'
    try:
        bpy.ops.screen.animation_play()
    except Exception as e:
        print("Autoplay info:", e)
    return None


bpy.app.timers.register(start_viewport_animation, first_interval=0.5)
