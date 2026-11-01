"""v2 renders: transparent stills with real shadows, one light rig, one lens.

    blender -b --factory-startup -P blender/render_v2.py -- [--preview] [--only keycap,laptop,phone_keyboard]

Reuses the procedural models in build_scene.py (phone, keycap strip, laptop) and the materials in
materials.py. Each still is its own small scene with the SAME rig: a large soft key light from the
upper left, a weak fill, a thin rim, 85 mm lens, objects resting on a shadow-catcher floor.
Film is transparent, so the renders sit on either deck theme.

Writes PNG (RGBA) to blender/_v2/ and WebP with alpha (quality 85) to assets/renders/v2/.
Screen textures come from tools/make_textures_v2.py (deck fonts).
"""
import math
import os
import sys
import time

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import build_scene as B  # noqa: E402
import materials as M  # noqa: E402

OUT_PNG = os.path.join(HERE, '_v2')
OUT_WEBP = os.path.join(ROOT, 'assets', 'renders', 'v2')
os.makedirs(OUT_PNG, exist_ok=True)
os.makedirs(OUT_WEBP, exist_ok=True)
LOG = os.path.join(OUT_PNG, 'render_log.txt')

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
PREVIEW = '--preview' in argv
ONLY = set()
if '--only' in argv:
    ONLY = set(argv[argv.index('--only') + 1].split(','))

LENS = 85.0
KEY_W = 150.0          # key light (W). Fill and rim scale from it.


def log(msg):
    print(msg, flush=True)
    with open(LOG, 'a', encoding='utf-8') as f:
        f.write(msg + '\n')


# ── device: OptiX → CUDA → CPU ───────────────────────────────────────────────
def setup_device(sc):
    used = 'CPU'
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        for dt in ('OPTIX', 'CUDA'):
            try:
                prefs.compute_device_type = dt
            except TypeError:
                continue
            try:
                prefs.refresh_devices()
            except Exception:
                prefs.get_devices()
            devs = [d for d in prefs.devices if d.type == dt]
            if devs:
                for d in prefs.devices:
                    d.use = (d.type == dt)
                used = dt + ' (' + ', '.join(d.name for d in devs) + ')'
                break
    except Exception as e:
        log('device setup failed: %s' % e)
    sc.cycles.device = 'GPU' if used != 'CPU' else 'CPU'
    try:
        sc.cycles.denoising_use_gpu = sc.cycles.device == 'GPU'
    except Exception:
        pass
    return used


# ── scene ────────────────────────────────────────────────────────────────────
def fresh_scene(w, h):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 24 if PREVIEW else 224
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = 0.01
    sc.cycles.use_denoising = True
    try:
        sc.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception:
        pass
    sc.cycles.max_bounces = 8
    sc.cycles.glossy_bounces = 4
    sc.cycles.diffuse_bounces = 3
    sc.cycles.transmission_bounces = 4
    sc.cycles.caustics_reflective = False
    sc.cycles.caustics_refractive = False
    sc.cycles.blur_glossy = 0.5
    sc.render.use_motion_blur = False
    sc.render.film_transparent = True
    s = 0.5 if PREVIEW else 1.0
    sc.render.resolution_x = int(w * s)
    sc.render.resolution_y = int(h * s)
    sc.render.resolution_percentage = 100
    sc.view_settings.view_transform = 'AgX'
    for look in ('AgX - Medium High Contrast', 'Medium High Contrast', 'None'):
        try:
            sc.view_settings.look = look
            break
        except TypeError:
            continue
    sc.view_settings.exposure = 0.0
    sc.render.dither_intensity = 1.0
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.image_settings.color_depth = '8'
    return sc


def rig(sc):
    """The one light rig: soft key upper-left, weak fill right, thin rim behind. Camera looks along +Y."""
    w = bpy.data.worlds.new('world')
    sc.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = M.srgb('#c9c6c0')
    bg.inputs['Strength'].default_value = 0.14
    key = B.area_light('key', (-1.5, -1.1, 2.0), (0, 0, 0), 1.4, 1.4, KEY_W)
    sc['key_light'] = key.name
    fill = B.area_light('fill', (1.8, -1.4, 0.9), (0, 0, 0.0), 1.6, 1.6, KEY_W * 0.12)
    rim = B.area_light('rim', (0.4, 1.6, 0.9), (0, 0, 0.02), 1.4, 0.06, KEY_W * 0.35)
    # only the key light casts shadows, so every render has the same single shadow direction
    for l in (fill, rim):
        try:
            l.data.use_shadow = False
        except Exception:
            pass
        try:
            l.data.cycles.cast_shadow = False
        except Exception:
            pass


def shadow_catcher():
    import bmesh
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=3.0)
    me = bpy.data.meshes.new('floor')
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new('floor', me)
    bpy.context.scene.collection.objects.link(ob)
    mat = bpy.data.materials.new('floor')
    mat.use_nodes = True
    me.materials.append(mat)
    ob.is_shadow_catcher = True
    return ob


def bounds(objs):
    dg = bpy.context.evaluated_depsgraph_get()
    pts = []
    for ob in objs:
        if ob.type != 'MESH' or ob.hide_render:
            continue
        ev = ob.evaluated_get(dg)
        pts += [ev.matrix_world @ Vector(c) for c in ev.bound_box]
    return pts


def camera(sc, objs, elev, az=0.0, fill=0.86, aim_z=None):
    """85 mm camera at elevation/azimuth (degrees, az 0 = from the front, looking along +Y).
    Distance and lens shift are solved so the objects fill `fill` of the frame and sit centred."""
    cd = bpy.data.cameras.new('cam')
    cd.lens = LENS
    cd.sensor_width = 36
    cd.sensor_fit = 'AUTO'
    cd.dof.use_dof = False
    cd.clip_start = 0.005
    cd.clip_end = 50
    cam = bpy.data.objects.new('cam', cd)
    sc.collection.objects.link(cam)
    sc.camera = cam
    bpy.context.view_layer.update()
    pts = bounds(objs)
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    centre = (lo + hi) / 2
    if aim_z is not None:
        centre.z = aim_z
    e, a = math.radians(elev), math.radians(az)
    back = Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
    d = 1.0
    for _ in range(30):
        cam.location = centre + back * d
        cam.rotation_euler = (-back).to_track_quat('-Z', 'Y').to_euler()
        bpy.context.view_layer.update()
        uv = [world_to_camera_view(sc, cam, p) for p in pts]
        xs, ys = [p.x for p in uv], [p.y for p in uv]
        ex, ey = max(xs) - min(xs), max(ys) - min(ys)
        k = max(ex, ey) / fill
        cx, cy = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
        aspect = sc.render.resolution_x / sc.render.resolution_y
        # lens shift is in units of the larger frame side
        if aspect >= 1:
            cd.shift_x += (cx - 0.5)
            cd.shift_y += (cy - 0.5) / aspect
        else:
            cd.shift_x += (cx - 0.5) * aspect
            cd.shift_y += (cy - 0.5)
        if abs(k - 1) < 0.002 and abs(cx - 0.5) < 0.001 and abs(cy - 0.5) < 0.001:
            break
        d *= k
    return cam


def flag_screens(sc):
    key = bpy.data.objects.get(sc.get('key_light', ''))
    screens = [o for o in sc.objects if o.name.endswith('_screen') or o.name == 'lap_screen']
    if not key or not screens:
        return
    coll = bpy.data.collections.new('key_excludes')
    for o in screens:
        coll.objects.link(o)
    try:
        key.light_linking.receiver_collection = coll
        for co in coll.collection_objects:
            co.light_linking.link_state = 'EXCLUDE'
    except Exception as e:
        log('light linking unavailable: %s' % e)


def calm_screens():
    # less glare on the screen glass so the UI text stays crisp
    for m in bpy.data.materials:
        if m.name.startswith('screen_'):
            for n in m.node_tree.nodes:
                if n.type == 'BSDF_PRINCIPLED':
                    n.inputs['Specular IOR Level'].default_value = 0.12
                    n.inputs['Roughness'].default_value = 0.12


def render(name, sc):
    flag_screens(sc)
    calm_screens()
    path = os.path.join(OUT_PNG, name + '.png')
    sc.render.filepath = path
    t0 = time.time()
    bpy.ops.render.render(write_still=True)
    return path, time.time() - t0


def to_webp(png, name):
    try:
        from PIL import Image
    except ImportError:
        log('Pillow missing inside Blender: run tools/encode_v2.py to make the WebP files')
        return None
    out = os.path.join(OUT_WEBP, name + '.webp')
    Image.open(png).save(out, 'WEBP', quality=85, method=6)
    return out


def mats_common():
    m = {
        'alu': M.aluminium_satin(),
        'alu_lap': M.aluminium_blasted(),
        'alu_dark': M.aluminium_dark(),
        'glass': M.black_glass(),
        'plate': M.black_plastic('pad_plate', 0.6, '#1a1b1d'),
        'kbwell': M.black_plastic('kbwell', 0.55, '#141415'),
        'key': M.black_plastic('lap_key', 0.42, '#1a1b1c'),
        'pad': M.aluminium_blasted('trackpad'),
        'webcam': M.black_plastic('webcam', 0.08, '#17181b'),
    }
    for n in m['pad'].node_tree.nodes:
        if n.type == 'BSDF_PRINCIPLED':
            n.inputs['Roughness'].default_value = 0.3
            n.inputs['Base Color'].default_value = M.srgb('#b4b6b9')
    return m


# ── shots: (output size at 1.5× the slide slot) ─────────────────────────────
def shot_keycap():
    sc = fresh_scene(1108, 1140)
    rig(sc)
    shadow_catcher()
    m = mats_common()
    root, parts = B.build_keypad((0, 0, 0), 28.0, m, legend_tex='keycap_legend_v2.png', hero_col='#e6e1d7', blank_col='#3a3b3e')
    cam = camera(sc, parts, elev=38, fill=0.8)
    return sc


def shot_laptop():
    sc = fresh_scene(1628, 1200)
    rig(sc)
    shadow_catcher()
    m = mats_common()
    root, parts = B.build_laptop((0, 0, 0), 24.0, m, screen_tex='laptop_screen_v2.png', screen_strength=1.5)
    camera(sc, parts, elev=20, fill=0.86)
    return sc


def shot_phone():
    sc = fresh_scene(992, 840)
    rig(sc)
    shadow_catcher()
    m = mats_common()
    root, parts = B.build_phone('phone', 'phone_keyboard_v2.png', (0, 0, 0), -24.0, m, screen_strength=1.5)
    camera(sc, parts, elev=58, fill=0.86)
    return sc


SHOTS = [('keycap', shot_keycap), ('laptop', shot_laptop), ('phone_keyboard', shot_phone)]


def main():
    log('=== render_v2 %s preview=%s' % (time.strftime('%Y-%m-%d %H:%M:%S'), PREVIEW))
    t_all = time.time()
    device = None
    for name, fn in SHOTS:
        if ONLY and name not in ONLY:
            continue
        sc = fn()
        device = setup_device(sc)
        png, t = render(name + ('_preview' if PREVIEW else ''), sc)
        webp = None if PREVIEW else to_webp(png, name)
        log('still %-15s %6.1fs  %dx%d  %s' % (name, t, sc.render.resolution_x, sc.render.resolution_y, 'webp ok' if webp else 'png only'))
    log('render device: %s · total %.1fs' % (device, time.time() - t_all))


main()
